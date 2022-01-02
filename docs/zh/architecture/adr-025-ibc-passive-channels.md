# ADR 025:IBC 无源通道

## 变更日志

- 2021-04-23:将状态更改为“已弃用”
- 2020-05-23:提供示例 Go 代码和更多详细信息
- 2020-05-18:初稿

## 地位

*已弃用*

## 语境

当前的“天真的”IBC 中继器策略当前在两个客户端(每个客户端可能属于不同的链)之间的单个连接之上建立单个预定的 IBC 通道。然后，该策略通过观察与该通道匹配的 `send_packet` 和 `recv_packet` 事件来检测要中继的数据包，并发送必要的事务来中继这些数据包。

我们希望将这种“天真”策略扩展为“被动”策略，它检测并中继给定连接上的通道握手消息和数据包，而无需在中继之前了解每个通道。

为了实现这一点，我们建议添加更全面的事件来为从 `x/ibc/core/04-channel/keeper/handshake.go` 和 `x/ibc/core/04-channel 发送的每个事务公开通道元数据/keeper/packet.go` 模块。

以下是 `ChanOpenInit` 中的示例:

```go
const (
  EventTypeChannelMeta = "channel_meta"
  AttributeKeyAction = "action"
  AttributeKeyHops = "hops"
  AttributeKeyOrder = "order"
  AttributeKeySrcPort = "src_port"
  AttributeKeySrcChannel = "src_channel"
  AttributeKeySrcVersion = "src_version"
  AttributeKeyDstPort = "dst_port"
  AttributeKeyDstChannel = "dst_channel"
  AttributeKeyDstVersion = "dst_version"
)
// ...
  // Emit Event with Channel metadata for the relayer to pick up and
  // relay to the other chain
  // This appears immediately before the successful return statement.
  ctx.EventManager().EmitEvents(sdk.Events{
    sdk.NewEvent(
      types.EventTypeChannelMeta,
      sdk.NewAttribute(types.AttributeKeyAction, "open_init"),
      sdk.NewAttribute(types.AttributeKeySrcConnection, connectionHops[0]),
      sdk.NewAttribute(types.AttributeKeyHops, strings.Join(connectionHops, ",")),
      sdk.NewAttribute(types.AttributeKeyOrder, order.String()),
      sdk.NewAttribute(types.AttributeKeySrcPort, portID),
      sdk.NewAttribute(types.AttributeKeySrcChannel, chanenlID),
      sdk.NewAttribute(types.AttributeKeySrcVersion, version),
      sdk.NewAttribute(types.AttributeKeyDstPort, counterparty.GetPortID()),
      sdk.NewAttribute(types.AttributeKeyDstChannel, counterparty.GetChannelID()),
      // The destination version is not yet known, but a value is necessary to pad
      // the event attribute offsets
      sdk.NewAttribute(types.AttributeKeyDstVersion, ""),
    ),
  })
```

这些元数据事件捕获路由 IBC 通道握手事务所需的所有“标头”信息，而无需客户端查询除愿意中继的连接 ID 之外的任何数据。 `channel_meta.src_connection` 是唯一需要索引的事件键，被动中继器才能正常工作。

### 处理通道打开尝试

在被动中继器的情况下，当一个链发送一个 `ChanOpenInit` 时，中继器应该将这个开放尝试通知另一个链，并允许该链决定如何(以及是否)继续握手。一旦两条链都主动批准了通道开放，其余的握手就可以像当前的“天真”中继器一样发生。

为了实现这种行为，我们建议用新的 `cbs.OnAttemptChanOpenTry` 回调替换 `cbs.OnChanOpenTry` 回调，该回调显式处理 `MsgChannelOpenTry`，通常通过调用 `keeper.ChanOpenTry`。 `x/ibc-transfer/module.go` 中的典型实现将与当前的“naive”中继器兼容，如下所示:

```go
func (am AppModule) OnAttemptChanOpenTry(
  ctx sdk.Context,
  chanKeeper channel.Keeper,
  portCap *capability.Capability,
  msg channel.MsgChannelOpenTry,
) (*sdk.Result, error) {
  // Require portID is the portID transfer module is bound to
  boundPort := am.keeper.GetPort(ctx)
  if boundPort != msg.PortID {
    return nil, sdkerrors.Wrapf(porttypes.ErrInvalidPort, "invalid port: %s, expected %s", msg.PortID, boundPort)
  }

  // BEGIN NEW CODE
  // Assert our protocol version, overriding the relayer's suggestion.
  msg.Version = types.Version
  // Continue the ChanOpenTry.
  res, chanCap, err := channel.HandleMsgChannelOpenTry(ctx, chanKeeper, portCap, msg)
  if err != nil {
    return nil, err
  }
  // END OF NEW CODE

  // ... the rest of the callback is similar to the existing OnChanOpenTry
  // but uses msg.* directly.
```

Here is how this callback would be used, in the implementation of `x/ibc/handler.go`:

```go
// ...
    case channel.MsgChannelOpenTry:
      // Lookup module by port capability
      module, portCap, err := k.PortKeeper.LookupModuleByPort(ctx, msg.PortID)
      if err != nil {
        return nil, sdkerrors.Wrap(err, "could not retrieve module from port-id")
      }
      // Retrieve callbacks from router
      cbs, ok := k.Router.GetRoute(module)
      if !ok {
        return nil, sdkerrors.Wrapf(port.ErrInvalidRoute, "route not found to module: %s", module)
      }
      // Delegate to the module's OnAttemptChanOpenTry.
      return cbs.OnAttemptChanOpenTry(ctx, k.ChannelKeeper, portCap, msg)
```

我们在 `x/ibc/handler.go` 和端口的模块之间没有更结构化的交互(以明确协商版本等)的原因是我们不希望限制 app 模块必须完成处理 ` MsgChannelOpenTry` 在此事务或什至此块期间。

## 决定

- 公开事件以允许“被动”连接中继器。
- 通过这种被动中继器启用应用程序启动的通道。
- 允许端口模块控制如何处理 open-try 消息。

## 结果

### 积极的

使通道成为完整的应用程序级抽象。

应用程序可以完全控制启动和接受通道，而不是期望中继器告诉他们何时这样做。

被动中继器不必知道应用程序支持哪种通道(版本字符串、排序约束、防火墙逻辑)。这些是在应用程序之间直接协商的。

### 消极的

增加 IBC 消息的事件大小。

### 中性的

更多的 IBC 事件被曝光。

## 参考

- Agoric VM 的 IBC 处理程序当前 [容纳`attemptChanOpenTry`](https://github.com/Agoric/agoric-sdk/blob/904b3a0423222a1b32893453e44bbde598473960/packages/cosmic-ag-swingsets/ L546)
