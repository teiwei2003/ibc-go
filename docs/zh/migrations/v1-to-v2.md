# 从 ibc-go v1 迁移到 v2

本文档旨在强调可能需要比 CHANGELOG 中提供的更多信息的重大更改。
任何必须由 ibc-go 用户完成的更改都应在此处记录。

基于本文档的四个潜在用户组，有四个部分:
- 链条
- IBC 应用程序
- 中继器
- IBC 轻客户端

**注意:** ibc-go 支持 golang 语义版本控制，因此必须更新所有导入以提高主要版本的版本号。
```go
github.com/cosmos/ibc-go -> github.com/cosmos/ibc-go/v2
```

## 链

- 此版本中未进行相关更改。

## IBC 应用程序

应用模块界面新增功能:
```go
// NegotiateAppVersion performs application version negotiation given the provided channel ordering, connectionID, portID, counterparty and proposed version.
    // An error is returned if version negotiation cannot be performed. For example, an application module implementing this interface
    // may decide to return an error in the event of the proposed version being incompatible with it's own
    NegotiateAppVersion(
        ctx sdk.Context,
        order channeltypes.Order,
        connectionID string,
        portID string,
        counterparty channeltypes.Counterparty,
        proposedVersion string,
    ) (version string, err error)
}
```

该函数应执行应用程序版本协商并返回协商的版本。 如果无法协商版本，则应返回错误。 此功能仅用于客户端。

#### sdk.Result 已删除

sdk.Result 已作为应用程序回调中的返回值删除。 以前它被核心 IBC 丢弃，因此未被使用。

## 中继器

新的 gRPC 已添加到 05-port，`AppVersion`。 它返回协商的应用程序版本。 这个函数应该用于 `ChanOpenTry` 通道握手步骤来决定应该在通道中设置的应用程序版本。

## IBC 轻客户端

- 此版本中未进行相关更改。