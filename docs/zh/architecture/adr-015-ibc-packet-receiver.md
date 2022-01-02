# ADR 015:IBC 数据包接收器

## 变更日志

- 2019 年 10 月 22 日:初稿

## 语境
 
[ICS 26 - 路由模块](https://github.com/cosmos/ibc/tree/master/spec/core/ics-026-routing-module) 定义了一个函数 [`handlePacketRecv`](https://github .com/cosmos/ibc/tree/master/spec/core/ics-026-routing-module#packet-relay)。

在ICS 26中，路由模块被定义为每个应用模块之上的一层
它验证消息并将其路由到目标模块。有可能
将它作为一个单独的模块来实现，但是，我们已经有了路由功能
baseapp 中的目标标识符上的消息。该 ADR 建议
利用现有的`baseapp.router` 将数据包路由到应用程序模块。

通常，路由模块回调有两个独立的步骤，
验证和执行。这对应于`AnteHandler`-`Handler`
SDK 中的模型。我们可以在 `AnteHandler` 里面做验证
为了通过减少样板文件来提高开发人员的人体工程学
验证码。

对于原子多消息事务，我们希望保持 IBC 相关
即使应用程序端状态更改，状态修改也将保留
回复。示例之一可能是 IBC 令牌发送消息跟随
使用前一个数据包消息接收到的令牌的权益委托。
如果令牌接收由于任何原因失败，我们可能不想保留
执行交易，但我们也不想中止交易
否则序列和承诺将被恢复，频道将被卡住。
此 ADR 建议使用新的 `CodeType`、`CodeTxBreak` 来解决此问题。

## 决定

`PortKeeper` 将拥有只能访问
绑定到端口的通道。 持有“PortKeeper”的实体将是
能够调用其上与方法对应的方法
`ChannelKeeper` 上的名称相同，但只有
允许的端口。 `ChannelKeeper.Port(string, ChannelChecker)` 将被定义为
轻松构建功能安全的“PortKeeper”。 这将在
另一个 ADR，我们现在将使用不安全的 `ChannelKeeper`。

如果处理程序之一，`baseapp.runMsgs` 将中断消息循环
返回`!Result.IsOK()`。 但是，外部逻辑将写入缓存
存储 if `Result.IsOK() || Result.Code.IsBreak()`。 `Result.Code.IsBreak()` 如果
`Result.Code == CodeTxBreak`。

```go
func (app *BaseApp) runTx(tx Tx) (result Result) {
  msgs := tx.GetMsgs()
  
  // AnteHandler
  if app.anteHandler != nil {
    anteCtx, msCache := app.cacheTxContext(ctx)
    newCtx, err := app.anteHandler(anteCtx, tx)
    if !newCtx.IsZero() {
      ctx = newCtx.WithMultiStore(ms)
    }

    if err != nil {
      // error handling logic
      return res
    }

    msCache.Write()
  }
  
  // Main Handler
  runMsgCtx, msCache := app.cacheTxContext(ctx)
  result = app.runMsgs(runMsgCtx, msgs)
  // BEGIN modification made in this ADR
  if result.IsOK() || result.IsBreak() {
  // END
    msCache.Write()
  }

  return result
}
```

Cosmos SDK 将为 IBC 数据包接收定义一个 `AnteDecorator`。 这
`AnteDecorator` 将遍历事务中包含的消息，键入
`switch` 检查消息是否包含传入的 IBC 数据包，如果包含
验证默克尔证明。

```go
type ProofVerificationDecorator struct {
  clientKeeper ClientKeeper
  channelKeeper ChannelKeeper
}

func (pvr ProofVerificationDecorator) AnteHandle(ctx Context, tx Tx, simulate bool, next AnteHandler) (Context, error) {
  for _, msg := range tx.GetMsgs() {
    var err error
    switch msg := msg.(type) {
    case client.MsgUpdateClient:
      err = pvr.clientKeeper.UpdateClient(msg.ClientID, msg.Header)
    case channel.MsgPacket:
      err = pvr.channelKeeper.RecvPacket(msg.Packet, msg.Proofs, msg.ProofHeight)
    case chanel.MsgAcknowledgement:
      err = pvr.channelKeeper.AcknowledgementPacket(msg.Acknowledgement, msg.Proof, msg.ProofHeight)
    case channel.MsgTimeoutPacket:
      err = pvr.channelKeeper.TimeoutPacket(msg.Packet, msg.Proof, msg.ProofHeight, msg.NextSequenceRecv)
    case channel.MsgChannelOpenInit;
      err = pvr.channelKeeper.CheckOpen(msg.PortID, msg.ChannelID, msg.Channel)
    default:
      continue
    }

    if err != nil {
      return ctx, err
    }
  }
  
  return next(ctx, tx, simulate)
}
```

其中`MsgUpdateClient`、`MsgPacket`、`MsgAcknowledgement`、`MsgTimeoutPacket`
是 `sdk.Msg` 类型对应于 `handleUpdateClient`，`handleRecvPacket`，
`handleAcknowledgementPacket`，路由模块的`handleTimeoutPacket`，
分别。

`RecvPacket`、`VerifyAcknowledgement` 的副作用，
`VerifyTimeout` 将被提取到单独的函数中，
分别为`WriteAcknowledgement`、`DeleteCommitment`、`DeleteCommitmentTimeout`，
它将在执行后由应用程序处理程序调用。

`WriteAcknowledgement` 将确认写入状态
由交易对手链验证并递增序列以防止
双重执行。 `DeleteCommitment` 将删除存储的承诺，
`DeleteCommitmentTimeout` 将删除承诺并关闭频道以防万一
的有序通道。

```go
func (keeper ChannelKeeper) WriteAcknowledgement(ctx Context, packet Packet, ack []byte) {
  keeper.SetPacketAcknowledgement(ctx, packet.GetDestPort(), packet.GetDestChannel(), packet.GetSequence(), ack)
  keeper.SetNextSequenceRecv(ctx, packet.GetDestPort(), packet.GetDestChannel(), packet.GetSequence())
}

func (keeper ChannelKeeper) DeleteCommitment(ctx Context, packet Packet) {
  keeper.deletePacketCommitment(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetSequence())
}

func (keeper ChannelKeeper) DeleteCommitmentTimeout(ctx Context, packet Packet) {
  k.deletePacketCommitment(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetSequence())
  
  if channel.Ordering == types.ORDERED [
    channel.State = types.CLOSED
    k.SetChannel(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), channel)
  }
}
```

每个应用程序处理程序都应该在 `PortKeeper` 上调用各自的终结方法
为了增加序列(在数据包的情况下)或删除承诺
(在确认和超时的情况下)。
调用这些函数意味着应用程序逻辑已成功执行。
但是，处理程序可以在调用这些方法后返回带有 `CodeTxBreak` 的 `Result`
这将保留已经完成的状态更改，但会阻止任何进一步的更改
在语义无效数据包的情况下要执行的消息。这将保持顺序
在之前的 IBC 数据包中增加(从而防止双重执行)而没有
继续以下消息。
在任何情况下，应用程序模块都不应返回状态恢复结果，
这将使频道无法继续。

将引入`ChannelKeeper.CheckOpen` 方法。这将替换定义的 `onChanOpen*`
在路由模块规范下。而不是定义每个通道握手回调
功能，应用模块可以通过`AppModule`提供`ChannelChecker`功能
它将被注入到顶层应用程序的`ChannelKeeper.Port()`。
`CheckOpen` 将使用
`PortID` 并调用它，如果应用程序不接受它，它将返回一个错误。

`ProofVerificationDecorator` 将被插入到顶级应用程序中。
让每个模块负责调用证明验证是不安全的
逻辑，而应用程序可以通过以下方式行为不当(就 IBC 协议而言)
错误。

`ProofVerificationDecorator` 应该在默认女巫攻击之后出现
来自当前 `auth.NewAnteHandler` 的抵抗层:

```go
// add IBC ProofVerificationDecorator to the Chain of
func NewAnteHandler(
  ak keeper.AccountKeeper, supplyKeeper types.SupplyKeeper, ibcKeeper ibc.Keeper,
  sigGasConsumer SignatureVerificationGasConsumer) sdk.AnteHandler {
  return sdk.ChainAnteDecorators(
    NewSetUpContextDecorator(), // outermost AnteDecorator. SetUpContext must be called first
    ...
    NewIncrementSequenceDecorator(ak),
    ibcante.ProofVerificationDecorator(ibcKeeper.ClientKeeper, ibcKeeper.ChannelKeeper), // innermost AnteDecorator
  )
}
```

此 ADR 的实现还将创建类型为“[]byte”的“Packet”的“Data”字段，接收模块可以将其反序列化为自己的私有类型。 由应用程序模块根据他们自己的解释来执行此操作，而不是由 IBC 管理员。 这对于动态 IBC 至关重要。

应用端使用示例:

```go
type AppModule struct {}

// CheckChannel will be provided to the ChannelKeeper as ChannelKeeper.Port(module.CheckChannel)
func (module AppModule) CheckChannel(portID, channelID string, channel Channel) error {
  if channel.Ordering != UNORDERED {
    return ErrUncompatibleOrdering()
  }
  if channel.CounterpartyPort != "bank" {
    return ErrUncompatiblePort()
  }
  if channel.Version != "" {
    return ErrUncompatibleVersion()
  }
  return nil
}

func NewHandler(k Keeper) Handler {
  return func(ctx Context, msg Msg) Result {
    switch msg := msg.(type) {
    case MsgTransfer:
      return handleMsgTransfer(ctx, k, msg)
    case ibc.MsgPacket:
      var data PacketDataTransfer
      if err := types.ModuleCodec.UnmarshalBinaryBare(msg.GetData(), &data); err != nil {
        return err
      }
      return handlePacketDataTransfer(ctx, k, msg, data)
    case ibc.MsgTimeoutPacket:
      var data PacketDataTransfer
      if err := types.ModuleCodec.UnmarshalBinaryBare(msg.GetData(), &data); err != nil {
        return err
      }
      return handleTimeoutPacketDataTransfer(ctx, k, packet)
    // interface { PortID() string; ChannelID() string; Channel() ibc.Channel }
    // MsgChanInit, MsgChanTry implements ibc.MsgChannelOpen
    case ibc.MsgChannelOpen: 
      return handleMsgChannelOpen(ctx, k, msg)
    }
  }
}

func handleMsgTransfer(ctx Context, k Keeper, msg MsgTransfer) Result {
  err := k.SendTransfer(ctx,msg.PortID, msg.ChannelID, msg.Amount, msg.Sender, msg.Receiver)
  if err != nil {
    return sdk.ResultFromError(err)
  }

  return sdk.Result{}
}

func handlePacketDataTransfer(ctx Context, k Keeper, packet Packet, data PacketDataTransfer) Result {
  err := k.ReceiveTransfer(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetDestinationPort(), packet.GetDestinationChannel(), data)
  if err != nil {
    // TODO: Source chain sent invalid packet, shutdown channel
  }
  k.ChannelKeeper.WriteAcknowledgement([]byte{0x00}) // WriteAcknowledgement increases the sequence, preventing double spending
  return sdk.Result{}
}

func handleCustomTimeoutPacket(ctx Context, k Keeper, packet CustomPacket) Result {
  err := k.RecoverTransfer(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetDestinationPort(), packet.GetDestinationChannel(), data)
  if err != nil {
    // This chain sent invalid packet or cannot recover the funds
    panic(err)
  }
  k.ChannelKeeper.DeleteCommitmentTimeout(ctx, packet)
  // packet timeout should not fail
  return sdk.Result{}
}

func handleMsgChannelOpen(sdk.Context, k Keeper, msg MsgOpenChannel) Result {
  k.AllocateEscrowAddress(ctx, msg.ChannelID())
  return sdk.Result{}
}
```

## 地位

建议的

## 结果

### 积极的

- 开发人员的直观界面 - IBC 处理程序不需要关心 IBC 身份验证
- 状态更改承诺逻辑嵌入到`baseapp.runTx` 逻辑中

### 消极的

- 不能支持动态端口，路由绑定到 baseapp 路由器

### 中性的

- 引入新的 `AnteHandler` 装饰器。
- 可以使用分层端口标识符来支持动态端口，详情参见#5290

## 参考

- 相关评论:[cosmos/ics#289](https://github.com/cosmos/ics/issues/289#issuecomment-544533583)
- [ICS26 - 路由模块](https://github.com/cosmos/ibc/tree/master/spec/core/ics-026-routing-module)