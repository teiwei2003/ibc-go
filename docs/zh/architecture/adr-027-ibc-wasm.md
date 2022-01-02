# ADR 27:添加对基于 Wasm 的轻客户端的支持

## 变更日志

- 26/11/2020:初稿

## 地位

*草稿*

## 抽象的

在 Cosmos SDK 中，轻客户端当前在 Go 中进行了硬编码。这使得升级现有的 IBC 轻客户端或添加
支持新的轻客户端一个涉及链上治理的多步骤过程，这是耗时的。

为了解决这个问题，我们提出了一个 WASM VM 来托管轻客户端字节码，这样可以更轻松地升级
现有 IBC 轻客户端以及添加对新 IBC 轻客户端的支持，而无需发布代码和相应的
硬分叉事件。

## 语境
目前在 SDK 中，轻客户端被定义为代码库的一部分，并作为子模块实现
`ibc-go/core/modules/light-clients/`。

在安全事件中添加对新轻客户端的支持或更新现有的轻客户端
问题或共识更新是一个多步骤的过程，既耗时又容易出错:

1. 添加对新轻客户端的支持或更新现有轻客户端
   如果出现安全问题或共识更新，我们需要修改代码库并将其集成到许多地方。

2. 治理投票:添加新的轻客户端实现需要治理支持且成本高昂:这是
   不理想，因为链治理是添加新轻客户端实现的守门人。如果一个小社区
   想要支持轻客户端 X，他们可能无法说服治理支持它。

3.验证人升级:治理投票成功后，验证人需要升级自己的节点才能启用新的
   IBC 轻客户端实现。

上述过程产生的另一个问题是，如果一条链想要升级自己的共识，它需要说服每个链
或连接到它的集线器以升级其轻客户端以保持连接。由于需要耗时的过程
升级轻客户端，连接很多的链需要在升级后断开一段时间
它的共识，这在时间和精力方面可能非常昂贵。

我们提议通过集成 WASM 轻客户端模块来简化此工作流程，该模块增加了对
一个新的轻客户端一个简单的交易。用 Wasm 可编译的 Rust 编写的轻客户端字节码在 WASM 中运行
虚拟机。 Wasm 轻客户端子模块公开了一个代理轻客户端接口，该接口将传入消息路由到
适当的处理函数，在 Wasm VM 内部执行。

使用 WASM 轻客户端模块，任何人都可以以 WASM 字节码的形式添加新的 IBC 轻客户端(前提是他们能够支付交易所需的 gas 费用)
以及使用任何创建的客户端类型实例化客户端。这允许任何链在其他链中更新自己的轻客户端
无需执行上述步骤。


## 决定

我们决定使用 WASM 轻客户端模块作为轻客户端代理，它将与实际的轻客户端交互
上传为 WASM 字节码。这将需要更改客户端选择方法以允许任何客户端，如果客户端类型
有 `wasm/` 前缀。

```go
// IsAllowedClient checks if the given client type is registered on the allowlist.
func (p Params) IsAllowedClient(clientType string) bool {
	if p.AreWASMClientsAllowed && isWASMClient(clientType) {
		return true
	}
	
	for _, allowedClient := range p.AllowedClients {
		if allowedClient == clientType {
			return true
		}
	}

	return false
}
```

要上传新的轻客户端，用户需要使用 Wasm 字节码创建一个交易，该交易将被
由 IBC Wasm 模块处理。

```go
func (k Keeper) UploadLightClient (wasmCode: []byte, description: String) {
    wasmRegistry = getWASMRegistry()
    id := hex.EncodeToString(sha256.Sum256(wasmCode))
    assert(!wasmRegistry.Exists(id))
    assert(wasmRegistry.ValidateAndStoreCode(id, description, wasmCode, false))
}
```

顾名思义，Wasm 注册表是一个注册表，它存储一组由其哈希索引的 Wasm 客户端代码，并允许
客户端代码以检索最新上传的代码。

`ValidateAndStoreCode` 检查上传的 wasm 字节码是否有效并确认到 VM 接口。

### 轻客户端代理如何工作？

幕后的轻客户端代理将调用 cosmwasm 智能合约实例，传入参数为 json
具有适当环境信息的序列化格式。 智能合约返回的数据被反序列化并
返回给调用者。

考虑`ClientState`接口的`CheckProposedHeaderAndUpdateState`函数的例子。 传入的参数是
打包在一个有效负载中，该有效负载是 json 序列化并传递给调用 vm.Execute 并返回
智能合约返回的字节数组。 此数据被反序列化并作为返回参数传递。

```go
func (c *ClientState) CheckProposedHeaderAndUpdateState(context sdk.Context, marshaler codec.BinaryMarshaler, store sdk.KVStore, header exported.Header) (exported.ClientState, exported.ConsensusState, error) {
	// get consensus state corresponding to client state to check if the client is expired
	consensusState, err := GetConsensusState(store, marshaler, c.LatestHeight)
	if err != nil {
		return nil, nil, sdkerrors.Wrapf(
			err, "could not get consensus state from clientstore at height: %d", c.LatestHeight,
		)
	}
	
	payload := make(map[string]map[string]interface{})
	payload[CheckProposedHeaderAndUpdateState] = make(map[string]interface{})
	inner := payload[CheckProposedHeaderAndUpdateState]
	inner["me"] = c
	inner["header"] = header
	inner["consensus_state"] = consensusState

	encodedData, err := json.Marshal(payload)
	if err != nil {
		return nil, nil, sdkerrors.Wrapf(ErrUnableToMarshalPayload, fmt.Sprintf("underlying error: %s", err.Error()))
	}
	out, err := callContract(c.CodeId, context, store, encodedData)
	if err != nil {
		return nil, nil, sdkerrors.Wrapf(ErrUnableToCall, fmt.Sprintf("underlying error: %s", err.Error()))
	}
	output := clientStateCallResponse{}
	if err := json.Unmarshal(out.Data, &output); err != nil {
		return nil, nil, sdkerrors.Wrapf(ErrUnableToUnmarshalPayload, fmt.Sprintf("underlying error: %s", err.Error()))
	}
	if !output.Result.IsValid {
		return nil, nil, fmt.Errorf("%s error ocurred while updating client state", output.Result.ErrorMsg)
	}
	output.resetImmutables(c)
	return output.NewClientState, output.NewConsensusState, nil
}
```

## Consequences

### Positive
- Adding support for new light client or upgrading existing light client is way easier than before and only requires single transaction.
- Improves maintainability of Cosmos SDK, since no change in codebase is required to support new client or upgrade it.

### Negative
- Light clients need to be written in subset of rust which could compile in Wasm.
- Introspecting light client code is difficult as only compiled bytecode exists in the blockchain.
