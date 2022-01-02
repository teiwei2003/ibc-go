# ADR 001:硬币来源追踪

## 变更日志

- 2020-07-09:初稿
- 2020-08-11:实施变更

## 地位

接受，实施

## 语境

IBC 跨链可互换代币转移规范
([ICS20](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer))，需要
请注意任何代币面额的来源，以便中继包含发件人的“数据包”
和收件人在
[`FungibleTokenPacketData`](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures)。

数据包中继发送工作基于 2 种情况(每
[规范](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#packet-relay) 和 [Colin Axnér](https://github. com/colin-axner)的描述):

1. 发送者链作为源区。硬币被转移
到发件人链上的托管地址(即锁定)，然后转移
通过IBC TAO逻辑到接收链。预计该
接收链会将代金券铸造到接收地址。

2. 发送链充当接收区。硬币(凭证)被烧毁
在发送链上，然后通过 IBC 转移到接收链
陶逻辑。预计之前的接收链
发送原始面额，将取消托管可替代令牌并发送
到收货地址。

另一种思考源区和汇区的方式是通过令牌的
时间线。每个发送到任何一个链而不是它以前的链
从代币的时间线中接收到一个向前的移动。这导致
跟踪要添加到令牌的历史记录和目标端口以及
目标通道以面额为前缀。在这些情况下
发送者链充当源区。当令牌被发回时
对于它之前接收的链，前缀被删除。这是
代币时间线和发送者链中的向后移动
充当汇区。

### 例子

假设存在以下通道连接并且所有通道都使用端口 ID `transfer`:

- 链“A”具有带链“B”和链“C”的通道，ID分别为“channelToB”和“channelToC”
- 链“B”具有带有链“A”和链“C”的通道，ID分别为“channelToA”和“channelToC”
- 链“C”具有带有链“A”和链“B”的通道，ID分别为“channelToA”和“channelToB”

这些链之间转移的步骤按以下顺序发生:`A -> B -> C -> A -> C`。特别是:

1. `A -> B`:发送者链为源区。 `A` 发送带有 `denom` 的数据包(托管在 `A` 上)，`B` 接收 `denom` 和薄荷糖并将凭证 `transfer/channelToA/denom` 发送给接收者。
2. `B -> C`:发送者链为源区。 `B` 发送带有 `transfer/channelToA/denom` 的数据包(托管在 `B` 上)，`C` 接收 `transfer/channelToA/denom` 和 mints，并将凭证 `transfer/channelToB/transfer/channelToA/denom` 发送给接收者.
3. `C -> A`:发送者链为源区。 `C` 发送带有 `transfer/channelToB/transfer/channelToA/denom` 的数据包(托管在 `C` 上)，`A` 接收 `transfer/channelToB/transfer/channelToA/denom` 并铸币并发送凭证 `transfer/channelToC/ transfer/channelToB/transfer/channelToA/denom` 到收件人。
4. `A -> C`:发送者链为汇区。 `A` 发送带有 `transfer/channelToC/transfer/channelToB/transfer/channelToA/denom` 的数据包(烧在 `A` 上)，`C` 接收 `transfer/channelToC/transfer/channelToB/transfer/channelToA/denom`，并且取消托管并将“transfer/channelToB/transfer/channelToA/denom”发送给收件人。

代币在 `transfer/channelToB/transfer/channelToA/denom` 的链 `C` 上有一个最终面额，其中 `transfer/channelToB/transfer/channelToA` 是跟踪信息。

在这种情况下，在收到跨链可替代代币传输时，如果发送者链是代币的来源，则协议以以下格式使用端口和通道标识符作为面额前缀:

```typescript
prefix + denom = {destPortN}/{destChannelN}/.../{destPort0}/{destChannel0}/denom
```

示例:将 `100 uatom` 从端口 `HubPort` 和 Hub 上的通道 `HubChannel` 传输到
Ethermint 的端口 `EthermintPort` 和通道 `EthermintChannel` 结果为 `100
EthermintPort/EthermintChannel/uatom`，其中`EthermintPort/EthermintChannel/uatom` 是新的
接收链上的面额。

如果这些代币被转移回 Hub(即 **source** 链)，则前缀为
修剪和令牌面额更新为原始面额。

### 问题

向硬币面额添加附加信息的问题有两个:

1. 如果令牌被转移到源以外的区域，则长度不断增加:

如果一个代币通过 IBC 被转移 n 次到一个接收链，代币分值将包含 n 对
前缀，如上面的格式示例所示。这带来了一个问题，因为虽然端口和
每个通道标识符的最大长度为 64，SDK `Coin` 类型仅接受最多达
64 个字符。因此，一个单一的跨链代币，再次由端口和通道组成
标识符加上基本面额，可以超过 SDK `Coins` 的长度验证。

这可能会导致不良行为，例如无法将代币转移到多个
如果面额超过长度或由于面额出现意外的“恐慌”，则下沉链
接收链上的验证失败。

2、面额上是否存在特殊字符和大写字母:

在 SDK 中每次通过构造函数 NewCoin 初始化一个 Coin 时，一个验证
硬币面额的计算是根据
[正则表达式](https://github.com/cosmos/cosmos-sdk/blob/a940214a4923a3bf9a9161cd14bd3072299cd0c9/types/coin.go#L583)，
其中只接受小写字母数字字符。虽然这对本地面额来说是可取的
为了保持干净的用户体验，它给 IBC 带来了挑战，因为端口和通道可能是随机的
根据 [ICS 024 - Host
要求](https://github.com/cosmos/ibc/tree/master/spec/core/ics-024-host-requirements#paths-identifiers-separators)
规格。

## 决定

上述问题仅适用于基于 SDK 的链，因此建议的解决方案
不需要会导致修改其他实现的规范更改
ICS20 规范。

建议的解决方案不是直接在硬币面额上添加标识符，而是散列
面额前缀，以便为所有跨链可替代代币获得一致的长度。

这将仅用于内部存储，当通过 IBC 转移到不同的链时，
在打包数据上指定的面额将是所需标识符的完整前缀路径
按照 ICS20 的规定，将代币追溯到原始链。

新提议的格式如下:

```golang
ibcDenom = "ibc/" + hash(trace path + "/" + base denom)
```

散列函数将是“DenomTrace”字段的 SHA256 散列:

```protobuf
// DenomTrace contains the base denomination for ICS20 fungible tokens and the source tracing
// information
message DenomTrace {
  // chain of port/channel identifiers used for tracing the source of the fungible token
  string path = 1;
  // base denomination of the relayed fungible token
  string base_denom = 2;
}
```

`IBCDenom` 函数构建了在创建 ICS20 可替代令牌数据包数据时使用的 `Coin` 面额:

```golang
// Hash returns the hex bytes of the SHA256 hash of the DenomTrace fields using the following formula:
//
// hash = sha256(tracePath + "/" + baseDenom)
func (dt DenomTrace) Hash() tmbytes.HexBytes {
  return tmhash.Sum(dt.Path + "/" + dt.BaseDenom)
}

// IBCDenom a coin denomination for an ICS20 fungible token in the format 'ibc/{hash(tracePath + baseDenom)}'. 
// If the trace is empty, it will return the base denomination.
func (dt DenomTrace) IBCDenom() string {
  if dt.Path != "" {
    return fmt.Sprintf("ibc/%s", dt.Hash())
  }
  return dt.BaseDenom
}
```

### `x/ibc-transfer` 变化

为了从 IBC 面额中检索跟踪信息，需要一个查找表
添加到“ibc-transfer”模块。 这些值也需要在升级之间保持不变，这意味着
需要将新的 `[]DenomTrace` `GenesisState` 字段状态添加到模块中:

```golang
// GetDenomTrace retrieves the full identifiers trace and base denomination from the store.
func (k Keeper) GetDenomTrace(ctx Context, denomTraceHash []byte) (DenomTrace, bool) {
  store := ctx.KVStore(k.storeKey)
  bz := store.Get(types.KeyDenomTrace(traceHash))
  if bz == nil {
    return &DenomTrace, false
  }

  var denomTrace DenomTrace
  k.cdc.MustUnmarshalBinaryBare(bz, &denomTrace)
  return denomTrace, true
}

// HasDenomTrace checks if a the key with the given trace hash exists on the store.
func (k Keeper) HasDenomTrace(ctx Context, denomTraceHash []byte)  bool {
  store := ctx.KVStore(k.storeKey)
  return store.Has(types.KeyTrace(denomTraceHash))
}

// SetDenomTrace sets a new {trace hash -> trace} pair to the store.
func (k Keeper) SetDenomTrace(ctx Context, denomTrace DenomTrace) {
  store := ctx.KVStore(k.storeKey)
  bz := k.cdc.MustMarshalBinaryBare(&denomTrace)
  store.Set(types.KeyTrace(denomTrace.Hash()), bz)
}
```

`MsgTransfer` 将验证来自 `Token` 字段的 `Coin` 面额是否包含有效的
hash，如果提供了跟踪信息，或者基本面额匹配:

```golang
func (msg MsgTransfer) ValidateBasic() error {
  // ...
  return ValidateIBCDenom(msg.Token.Denom)
}
```

```golang
// ValidateIBCDenom validates that the given denomination is either:
//
//  - A valid base denomination (eg: 'uatom')
//  - A valid fungible token representation (i.e 'ibc/{hash}') per ADR 001 https://github.com/cosmos/ibc-go/blob/main/docs/architecture/adr-001-coin-source-tracing.md
func ValidateIBCDenom(denom string) error {
  denomSplit := strings.SplitN(denom, "/", 2)

  switch {
  case strings.TrimSpace(denom) == "",
    len(denomSplit) == 1 && denomSplit[0] == "ibc",
    len(denomSplit) == 2 && (denomSplit[0] != "ibc" || strings.TrimSpace(denomSplit[1]) == ""):
    return sdkerrors.Wrapf(ErrInvalidDenomForTransfer, "denomination should be prefixed with the format 'ibc/{hash(trace + \"/\" + %s)}'", denom)

  case denomSplit[0] == denom && strings.TrimSpace(denom) != "":
    return sdk.ValidateDenom(denom)
  }

  if _, err := ParseHexHash(denomSplit[1]); err != nil {
    return Wrapf(err, "invalid denom trace hash %s", denomSplit[1])
  }

  return nil
}
```

面额跟踪信息只需要在收到令牌时更新:

- 接收者是 **source** 链:接收者创建了令牌并且必须已经存储了跟踪查找(如有必要，_ie_ 本地令牌情况不需要查找)。
- 接收者是**非来源**链:存储收到的信息。 例如，在步骤 1 中，当链“B”收到“transfer/channelToA/denom”时。

```golang
// SendTransfer
// ...

  fullDenomPath := token.Denom

// deconstruct the token denomination into the denomination trace info
// to determine if the sender is the source chain
if strings.HasPrefix(token.Denom, "ibc/") {
  fullDenomPath, err = k.DenomPathFromHash(ctx, token.Denom)
  if err != nil {
    return err
  }
}

if types.SenderChainIsSource(sourcePort, sourceChannel, fullDenomPath) {
//...
```

```golang
// DenomPathFromHash returns the full denomination path prefix from an ibc denom with a hash
// component.
func (k Keeper) DenomPathFromHash(ctx sdk.Context, denom string) (string, error) {
  hexHash := denom[4:]
  hash, err := ParseHexHash(hexHash)
  if err != nil {
    return "", Wrap(ErrInvalidDenomForTransfer, err.Error())
  }

  denomTrace, found := k.GetDenomTrace(ctx, hash)
  if !found {
    return "", Wrap(ErrTraceNotFound, hexHash)
  }

  fullDenomPath := denomTrace.GetFullDenomPath()
  return fullDenomPath, nil
}
```


```golang
// OnRecvPacket
// ...

// This is the prefix that would have been prefixed to the denomination
// on sender chain IF and only if the token originally came from the
// receiving chain.
//
// NOTE: We use SourcePort and SourceChannel here, because the counterparty
// chain would have prefixed with DestPort and DestChannel when originally
// receiving this coin as seen in the "sender chain is the source" condition.
if ReceiverChainIsSource(packet.GetSourcePort(), packet.GetSourceChannel(), data.Denom) {
  // sender chain is not the source, unescrow tokens

  // remove prefix added by sender chain
  voucherPrefix := types.GetDenomPrefix(packet.GetSourcePort(), packet.GetSourceChannel())
  unprefixedDenom := data.Denom[len(voucherPrefix):]
  token := sdk.NewCoin(unprefixedDenom, sdk.NewIntFromUint64(data.Amount))

  // unescrow tokens
  escrowAddress := types.GetEscrowAddress(packet.GetDestPort(), packet.GetDestChannel())
  return k.bankKeeper.SendCoins(ctx, escrowAddress, receiver, sdk.NewCoins(token))
}

// sender chain is the source, mint vouchers

// since SendPacket did not prefix the denomination, we must prefix denomination here
sourcePrefix := types.GetDenomPrefix(packet.GetDestPort(), packet.GetDestChannel())
// NOTE: sourcePrefix contains the trailing "/"
prefixedDenom := sourcePrefix + data.Denom

// construct the denomination trace from the full raw denomination
denomTrace := types.ParseDenomTrace(prefixedDenom)

// set the value to the lookup table if not stored already
traceHash := denomTrace.Hash()
if !k.HasDenomTrace(ctx, traceHash) {
  k.SetDenomTrace(ctx, traceHash, denomTrace)
}

voucherDenom := denomTrace.IBCDenom()
voucher := sdk.NewCoin(voucherDenom, sdk.NewIntFromUint64(data.Amount))

// mint new tokens if the source of the transfer is the same chain
if err := k.bankKeeper.MintCoins(
  ctx, types.ModuleName, sdk.NewCoins(voucher),
); err != nil {
  return err
}

// send to receiver
return k.bankKeeper.SendCoinsFromModuleToAccount(
  ctx, types.ModuleName, receiver, sdk.NewCoins(voucher),
)
```

```golang
func NewDenomTraceFromRawDenom(denom string) DenomTrace{
  denomSplit := strings.Split(denom, "/")
  trace := ""
  if len(denomSplit) > 1 {
    trace = strings.Join(denomSplit[:len(denomSplit)-1], "/")
  }
  return DenomTrace{
    BaseDenom: denomSplit[len(denomSplit)-1],
    Trace:     trace,
  }
}
```

最后一点是，`FungibleTokenPacketData` 将保持不变，即带有前缀的完整面额，因为接收链可能不是基于 SDK 的链。

### 硬币变化

硬币面额验证将需要更新以反映这些变化。特别是，面额验证
函数现在将:

- 接受斜线分隔符 (`"/"`) 和大写字符(由于 `HexBytes` 格式)
- 将最大字符长度提高到 128，作为 Tendermint 使用的十六进制表示
  `HexBytes` 类型包含 64 个字符。

额外的验证逻辑，比如验证hash的长度，如果[自定义基面额验证](https://github.com/cosmos/cosmos-sdk/pull/6755)，以后可能会添加到bank模块中) 已集成到 SDK 中。

### 积极的

- 更清晰地将代币(传输前缀)的溯源行为与原始分离
  `硬币`面额
- 一致验证`Coin`字段(即没有特殊字符，固定最大长度)
- 更清洁的“硬币”和 IBC 的标准面额
- SDK `Coin` 没有额外的字段

### 消极的

- 将每组跟踪面额标识符存储在“ibc-transfer”模块存储中
- 客户每次通过 IBC 收到新的中继可替代代币时，都必须获取基本面额。这可以使用映射/缓存来缓解客户端已经看到的哈希值。其他形式的缓解，将打开一个 websocket 连接订阅传入事件。

### 中性的

- 与 ICS20 规格略有不同
- ibc-transfer 模块上 IBC 硬币的附加验证逻辑
- 额外的创世领域
- 由于进入商店，跨链转移的gas使用量略有增加。这应该
  如果传输频繁，则进行块间缓存。

## 参考

- [ICS 20 - Fungible token transfer](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer)
- [自定义硬币面额验证](https://github.com/cosmos/cosmos-sdk/pull/6755)
