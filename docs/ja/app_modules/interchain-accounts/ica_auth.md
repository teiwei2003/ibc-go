# ICA認証モジュールの構築

コントローラモジュールは、アカウント登録とパケット送信に使用されます。
チェーン間アカウントのすべてのコントローラーに必要なロジックのみを実行します。
チェーン間アカウントの管理に使用される認証のタイプは指定されていません。
さまざまなユースケースに望ましいさまざまなタイプの認証が存在する可能性があります。
したがって、認証モジュールの目的は、コントローラーモジュールをカスタム認証ロジックでラップすることです。

ibc-goでは、認証モジュールはミドルウェアスタックを介してコントローラーチェーンに接続されます。
コントローラモジュールは[ミドルウェア](https://github.com/cosmos/ibc/tree/master/spec/app/ics-030-middleware)として実装され、認証モジュールはベースアプリケーションとしてコントローラモジュールに接続されますミドルウェアスタックの。
認証モジュールを実装するには、 `IBCModule`インターフェースが満たされている必要があります。
コントローラモジュールをミドルウェアとして実装することにより、冗長なコードを記述せずに、任意の数の認証モジュールを作成してコントローラモジュールに接続できます。

認証モジュールは次のことを行う必要があります。
-チェーン間アカウントの所有者を認証します
-所有者の関連付けられたチェーン間アカウントアドレスを追跡します
-`OnChanOpenInit`でチャネル機能を要求します
-所有者に代わってパケットを送信します(認証後)

### IBCModuleの実装

```go
//OnChanOpenInit implements the IBCModule interface
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
   //the authentication module *must* claim the channel capability on OnChanOpenInit
    if err := im.keeper.ClaimCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
        return err
    }

   //perform custom logic

    return nil
}

//OnChanOpenAck implements the IBCModule interface
func (im IBCModule) OnChanOpenAck(
    ctx sdk.Context,
    portID,
    channelID string,
    counterpartyVersion string,
) error {
   //perform custom logic

    return nil
}

//OnChanCloseConfirm implements the IBCModule interface
func (im IBCModule) OnChanCloseConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
   //perform custom logic

    return nil
}

//OnAcknowledgementPacket implements the IBCModule interface
func (im IBCModule) OnAcknowledgementPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    acknowledgement []byte,
    relayer sdk.AccAddress,
) error {
   //perform custom logic

    return nil
}

//OnTimeoutPacket implements the IBCModule interface.
func (im IBCModule) OnTimeoutPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    relayer sdk.AccAddress,
) error {
   //perform custom logic

    return nil
}
```

**注**:チャネル機能は、 `OnChanOpenInit`の認証モジュールによって要求される必要があります。そうしないと、認証モジュールは、関連付けられたチェーン間アカウント用に作成されたチャネルでパケットを送信できません。

次の関数は、 `IBCModule`インターフェースを満たすために定義する必要がありますが、コントローラーモジュールによって呼び出されることはないため、エラーやパニックが発生する可能性があります。

```go
//OnChanOpenTry implements the IBCModule interface
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

//OnChanOpenConfirm implements the IBCModule interface
func (im IBCModule) OnChanOpenConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    panic("UNIMPLEMENTED")
}

//OnChanCloseInit implements the IBCModule interface
func (im IBCModule) OnChanCloseInit(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    panic("UNIMPLEMENTED")
}

//OnRecvPacket implements the IBCModule interface. A successful acknowledgement
//is returned if the packet data is succesfully decoded and the receive application
//logic returns without error.
func (im IBCModule) OnRecvPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    relayer sdk.AccAddress,
) ibcexported.Acknowledgement {
    panic("UNIMPLEMENTED")
}

//NegotiateAppVersion implements the IBCModule interface
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

認証モジュールは、 `InitInterchainAccount`を呼び出すことにより、チェーン間アカウントの登録を開始できます。

```go
if err := keeper.icaControllerKeeper.InitInterchainAccount(ctx, connectionID, counterpartyConnectionID, owner.String()); err != nil {
    return err
}

return nil
```

## `TrySendTx`

認証モジュールは、 `TrySendTx`を呼び出すことによってパケットの送信を試みることができます。
```go

//Authenticate owner
//perform custom logic
    
//Lookup portID based on interchain account owner address
portID, err := icatypes.GeneratePortID(owner.String(), connectionID, counterpartyConnectionID)
if err != nil {
    return err
}

channelID, found := keeper.icaControllerKeeper.GetActiveChannelID(ctx, portID)
if !found {
    return sdkerrors.Wrapf(icatypes.ErrActiveChannelNotFound, "failed to retrieve active channel for port %s", portId)
}
    
//Obtain the channel capability. 
//The channel capability should have been claimed by the authentication module in OnChanOpenInit
chanCap, found := keeper.scopedKeeper.GetCapability(ctx, host.ChannelCapabilityPath(portID, channelID))
if !found {
    return sdkerrors.Wrap(channeltypes.ErrChannelCapabilityNotFound, "module does not own channel capability")
}
    
//Obtain data to be sent to the host chain. 
//In this example, the owner of the interchain account would like to send a bank MsgSend to the host chain. 
//The appropriate serialization function should be called. The host chain must be able to deserialize the transaction. 
//If the host chain is using the ibc-go host module, `SerializeCosmosTx` should be used. 
msg := &banktypes.MsgSend{FromAddress: fromAddr, ToAddress: toAddr, Amount: amt}
data, err := icatypes.SerializeCosmosTx(keeper.cdc, []sdk.Msg{msg})
if err != nil {
    return err
}

//Construct packet data
packetData := icatypes.InterchainAccountPacketData{
    Type: icatypes.EXECUTE_TX,
    Data: data,
}

_, err = keeper.icaControllerKeeper.TrySendTx(ctx, chanCap, p, packetData)
```

`InterchainAccountPacketData`内のデータは、ホストチェーンでサポートされている形式を使用してシリアル化する必要があります。
ホストチェーンがibc-goホストチェーンサブモジュールを使用している場合は、 `SerializeCosmosTx`を使用する必要があります。 `InterchainAccountPacketData.Data`がホストチェーンでサポートされていない形式を使用してシリアル化されている場合、パケットは正常に受信されません。

### `app.go`ファイルへの統合

認証モジュールをチェーンに統合するには、上記の[app.gointegration](./integration.md#example-integration)で概説されている手順に従ってください。