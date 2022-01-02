# 从 ibc-go v2 迁移到 v3

本文档旨在强调可能需要比 CHANGELOG 中提供的更多信息的重大更改。
任何必须由 ibc-go 用户完成的更改都应在此处记录。

基于本文档的四个潜在用户组，有四个部分:
- 链条
- IBC 应用程序
- 中继器
- IBC 轻客户端

**注意:** ibc-go 支持 golang 语义版本控制，因此必须更新所有导入以提高主要版本的版本号。
```go
github.com/cosmos/ibc-go/v2 -> github.com/cosmos/ibc-go/v3
```

从 ibc-go 的 v1 或 v2 升级时，不需要创世或就地迁移。

## 链

ICS27 Interchain Accounts 已添加为 ibc-go 的受支持 IBC 应用程序。
请参阅 [ICS27 文档](../app_modules/interchain-accounts/overview.md) 了解更多信息。

## IBC 应用程序


### `OnChanOpenTry` 必须返回协商的应用程序版本

`OnChanOpenTry` 应用程序回调已被修改。
返回签名现在包括应用程序版本。
IBC 应用程序必须使用交易对手版本在“OnChanOpenTry”中执行应用程序版本协商。
然后，协商的应用程序版本必须在“OnChanOpenTry”中返回给核心 IBC。
Core IBC 将在 TRYOPEN 通道中设置此版本。

### `NegotiateAppVersion` 从`IBCModule` 接口中删除

以前，此逻辑由“NegotiateAppVersion”函数处理。
中继器会在调用 `ChanOpenTry` 之前查询这个函数。
然后应用程序需要验证传入的版本是否正确。
现在应用程序将在通道握手期间执行此版本协商，从而消除对“NegotiateAppVersion”的需要。

### 在应用程序回调之前不会设置频道状态

通道握手逻辑已在核心 IBC 中重新组织。
执行应用回调后不会在状态中设置通道状态。
应用程序必须仅依赖传入的通道参数，而不是向通道管理器查询通道状态。

### IBC 应用程序回调从`AppModule` 移动到`IBCModule`

以前，IBC 模块回调是 AppModule 类型的一部分。
推荐的方法是创建一个 `IBCModule` 类型，并将 IBC 模块回调从 `AppModule` 移动到单独文件 `ibc_module.go` 中的 `IBCModule`。

通过应用上述格式，此版本中的模拟模块 go API 已被破坏。
IBC 模块回调已从模拟模块“AppModule”移至新类型“IBCModule”。

作为此版本的一部分，模拟模块现在支持中间件测试。请参阅 [README](../../testing/README.md#middleware-testing) 了解更多信息。

请查看 [mock](../../testing/mock/ibc_module.go) 和 [transfer](../../modules/apps/transfer/ibc_module.go) 模块作为示例。此外，[simapp](../../testing/simapp/app.go) 提供了一个示例，说明现在应如何将“IBCModule”类型添加到 IBC 路由器以支持“AppModule”。

##中继器

`AppVersion` gRPC 已被删除。
`MsgChanOpenTry` 中的 `version` 字符串已被弃用，核心 IBC 将忽略该字符串。
中继器不再需要确定在 `ChanOpenTry` 步骤中使用的版本。
IBC 应用程序将使用交易对手版本确定正确的版本。

## IBC 轻客户端

`GetProofSpecs` 函数已从 `ClientState` 界面中删除。此功能以前未被核心 IBC 使用。不使用此功能的轻客户端可能会将其删除。