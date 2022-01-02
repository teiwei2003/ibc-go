# 构建ICA认证模块

控制器模块用于账户注册和数据包发送。
它只执行跨链账户所有控制器所需的逻辑。
用于管理跨链帐户的身份验证类型仍未指定。
可能存在许多不同类型的身份验证，它们适用于不同的用例。
因此，身份验证模块的目的是使用自定义身份验证逻辑包装控制器模块。

在 ibc-go 中，身份验证模块通过中间件堆栈连接到控制器链。
控制器模块实现为[中间件](https://github.com/cosmos/ibc/tree/master/spec/app/ics-030-middleware)，身份验证模块连接到控制器模块作为基础应用程序中间件堆栈。
要实现身份验证模块，必须满足“IBCModule”接口。
通过将控制器模块实现为中间件，可以创建任意数量的身份验证模块并将其连接到控制器模块，而无需编写冗余代码。

身份验证模块必须:
- 验证跨链账户所有者
- 跟踪所有者的关联链间账户地址
- 在 `OnChanOpenInit` 中声明通道能力
- 代表所有者发送数据包(经过身份验证)

### IBCModule 实现

必须使用适当的自定义逻辑实现以下 `IBCModule` 回调:

```go
// OnChanOpenInit implements the IBCModule interface
func (im IBCModule) OnChanOpenInit(
    ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID string,
    channelID string,
    chanCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    version string,
) error {
    // the authentication module *must* claim the channel capability on OnChanOpenInit
    if err := im.keeper.ClaimCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
        return err
    }

    // perform custom logic

    return nil
}

// OnChanOpenAck implements the IBCModule interface
func (im IBCModule) OnChanOpenAck(
    ctx sdk.Context,
    portID,
    channelID string,
    counterpartyVersion string,
) error {
    // perform custom logic

    return nil
}

// OnChanCloseConfirm implements the IBCModule interface
func (im IBCModule) OnChanCloseConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    // perform custom logic

    return nil
}

// OnAcknowledgementPacket implements the IBCModule interface
func (im IBCModule) OnAcknowledgementPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    acknowledgement []byte,
    relayer sdk.AccAddress,
) error {
    // perform custom logic

    return nil
}

// OnTimeoutPacket implements the IBCModule interface.
func (im IBCModule) OnTimeoutPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    relayer sdk.AccAddress,
) error {
    // perform custom logic

    return nil
}
```

**注意**:通道能力必须由`OnChanOpenInit`中的身份验证模块声明，否则身份验证模块将无法在为关联的跨链帐户创建的通道上发送数据包。

必须定义以下函数来实现 `IBCModule` 接口，但它们永远不会被控制器模块调用，因此它们可能会出错或崩溃。

```go
// OnChanOpenTry implements the IBCModule interface
func (im IBCModule) OnChanOpenTry(
    ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID,
    channelID string,
    chanCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    version,
    counterpartyVersion string,
) error {
    panic("UNIMPLEMENTED")
}

// OnChanOpenConfirm implements the IBCModule interface
func (im IBCModule) OnChanOpenConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    panic("UNIMPLEMENTED")
}

// OnChanCloseInit implements the IBCModule interface
func (im IBCModule) OnChanCloseInit(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    panic("UNIMPLEMENTED")
}

// OnRecvPacket implements the IBCModule interface. A successful acknowledgement
// is returned if the packet data is succesfully decoded and the receive application
// logic returns without error.
func (im IBCModule) OnRecvPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    relayer sdk.AccAddress,
) ibcexported.Acknowledgement {
    panic("UNIMPLEMENTED")
}

// NegotiateAppVersion implements the IBCModule interface
func (im IBCModule) NegotiateAppVersion(
    ctx sdk.Context,
    order channeltypes.Order,
    connectionID string,
    portID string,
    counterparty channeltypes.Counterparty,
    proposedVersion string,
) (string, error) {
    panic("UNIMPLEMENTED")
}
```

## `InitInterchainAccount`

认证模块可以通过调用 `InitInterchainAccount` 开始注册跨链账户:

```go
if err := keeper.icaControllerKeeper.InitInterchainAccount(ctx, connectionID, counterpartyConnectionID, owner.String()); err != nil {
    return err
}

return nil
```

## `TrySendTx`

身份验证模块可以通过调用“TrySendTx”尝试发送数据包:
```go

// Authenticate owner
// perform custom logic
    
// Lookup portID based on interchain account owner address
portID, err := icatypes.GeneratePortID(owner.String(), connectionID, counterpartyConnectionID)
if err != nil {
    return err
}

channelID, found := keeper.icaControllerKeeper.GetActiveChannelID(ctx, portID)
if !found {
    return sdkerrors.Wrapf(icatypes.ErrActiveChannelNotFound, "failed to retrieve active channel for port %s", portId)
}
    
// Obtain the channel capability. 
// The channel capability should have been claimed by the authentication module in OnChanOpenInit
chanCap, found := keeper.scopedKeeper.GetCapability(ctx, host.ChannelCapabilityPath(portID, channelID))
if !found {
    return sdkerrors.Wrap(channeltypes.ErrChannelCapabilityNotFound, "module does not own channel capability")
}
    
// Obtain data to be sent to the host chain. 
// In this example, the owner of the interchain account would like to send a bank MsgSend to the host chain. 
// The appropriate serialization function should be called. The host chain must be able to deserialize the transaction. 
// If the host chain is using the ibc-go host module, `SerializeCosmosTx` should be used. 
msg := &banktypes.MsgSend{FromAddress: fromAddr, ToAddress: toAddr, Amount: amt}
data, err := icatypes.SerializeCosmosTx(keeper.cdc, []sdk.Msg{msg})
if err != nil {
    return err
}

// Construct packet data
packetData := icatypes.InterchainAccountPacketData{
    Type: icatypes.EXECUTE_TX,
    Data: data,
}

_, err = keeper.icaControllerKeeper.TrySendTx(ctx, chanCap, p, packetData)
```

`InterchainAccountPacketData` 中的数据必须使用主机链支持的格式进行序列化。
如果主链使用 ibc-go 主链子模块，则应使用 `SerializeCosmosTx`。 如果 InterchainAccountPacketData.Data 使用主机链不支持的格式进行序列化，将无法成功接收数据包。

### 集成到`app.go` 文件中

要将身份验证模块集成到您的链中，请按照上述 [app.go 集成](./integration.md#example-integration) 中概述的步骤进行操作。
