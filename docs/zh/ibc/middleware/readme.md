# IBC 中间件

了解如何编写您自己的自定义中间件来包装 IBC 应用程序，并了解如何将不同的中间件挂接到 IBC 基础应用程序以形成不同的 IBC 应用程序堆栈{概要}。

本文档可作为希望编写自己的中间件的中间件开发人员以及希望在其链上使用 IBC 中间件的链开发人员的指南。

IBC 应用程序被设计为自包含模块，它们通过一组与核心 IBC 处理程序的接口来实现它们自己的特定于应用程序的逻辑。反过来，这些核心 IBC 处理程序旨在强制执行 IBC 的正确性属性(传输、身份验证、排序)，同时将所有特定于应用程序的处理委托给 IBC 应用程序模块。但是，在某些情况下，许多应用程序可能需要某些功能，但不适合放置在核心 IBC 中。

中间件允许开发人员将扩展定义为可以包装基本应用程序的单独模块。因此，该中间件可以执行其自己的自定义逻辑，并将数据传递给应用程序，以便它可以在不知道中间件存在的情况下运行其逻辑。这允许应用程序和中间件实现自己的隔离逻辑，同时仍然能够作为单个数据包流的一部分运行。

## 先决条件阅读

- [IBC 概览](../overview.md) {prereq}
- [IBC 集成](../integration.md) {prereq}
- [IBC 应用程序开发者指南](../apps.md) {prereq}

## 定义

`中间件`:一个独立的模块，在数据包执行期间位于核心 IBC 和底层 IBC 应用程序之间。核心 IBC 和底层应用程序之间的所有消息都必须流经中间件，中间件可以执行自己的自定义逻辑。

`底层应用程序`:底层应用程序是直接连接到相关中间件的应用程序。该底层应用程序本身可能是链接到基础应用程序的中间件。

`基本应用程序`:基本应用程序是不包含任何中间件的 IBC 应用程序。可以由0个或多个中间件嵌套组成一个应用栈。

`应用程序堆栈(或堆栈)`:堆栈是连接到核心 IBC 的完整应用程序逻辑集(中间件 + 基础应用程序)。堆栈可能只是一个基础应用程序，也可能是一系列嵌套基础应用程序的中间件。

## 创建自定义 IBC 中间件

IBC 中间件将包裹底层 IBC 应用程序并位于核心 IBC 和应用程序之间。它可以完全控制修改从 IBC 到应用程序的任何消息，以及从应用程序到核心 IBC 的任何消息。因此，希望集成中间件的链开发人员必须完全信任中间件，但这使他们在修改他们包装的应用程序时具有完全的灵活性。

#### 界面

```go
// Middleware implements the ICS26 Module interface
type Middleware interface {
    porttypes.IBCModule // middleware has acccess to an underlying application which may be wrapped by more middleware
    ics4Wrapper: ICS4Wrapper // middleware has access to ICS4Wrapper which may be core IBC Channel Handler or a higher-level middleware that wraps this middleware.
}
```

```typescript
// This is implemented by ICS4 and all middleware that are wrapping base application.
// The base application will call `sendPacket` or `writeAcknowledgement` of the middleware directly above them
// which will call the next middleware until it reaches the core IBC handler.
type ICS4Wrapper interface {
    SendPacket(ctx sdk.Context, chanCap *capabilitytypes.Capability, packet exported.Packet) error
    WriteAcknowledgement(ctx sdk.Context, chanCap *capabilitytypes.Capability, packet exported.Packet, ack []byte) error
}
```

### 实现`IBCModule` 接口和回调

IBCModule 是实现 ICS26Interface(`porttypes.IBCModule`)的结构。建议将这些回调分离到一个单独的文件“ibc_module.go”中。正如将在 [integration doc](./integration.md) 中提到的，这个结构应该不同于实现 `AppModule` 的结构，以防中间件维护自己的内部状态并处理单独的 SDK 消息。

中间件必须能够访问底层应用程序，并在所有 ICS-26 回调期间被调用。它可以在这些回调期间执行自定义逻辑，然后调用底层应用程序的回调。中间件 ** 可能** 选择根本不调用底层应用程序的回调。虽然这些通常应该仅限于错误情况。

如果 IBC 中间件希望与交易对手链上的兼容 IBC 中间件通话；他们必须使用通道握手来协商中间件版本，而不干扰底层应用程序的版本协商。

中间件通过将版本格式化为以下格式来实现这一点:`{mw-version}:{app-version}`。

在握手回调期间，中间件可以将版本拆分为:`mw-version`、`app-version`。它可以在`mw-version`上进行协商逻辑，并将`app-version`传递给底层应用程序。

中间件应该简单地将回调参数中的功能传递给底层应用程序，以便基础应用程序可以声明它。然后，基础应用程序会将功能向上传递到堆栈，以验证传出的数据包/确认。

如果中间件希望在没有底层应用程序参与的情况下发送数据包或确认，它应该被授予对与基础应用程序相同的“scopedKeeper”的访问权限，以便它可以自己检索功能。

### 握手回调

```go
func (im IBCModule) OnChanOpenInit(ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID string,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    version string,
) error {
    // core/04-channel/types contains a helper function to split middleware and underlying app version
    middlewareVersion, appVersion = channeltypes.SplitChannelVersion(version)
    doCustomLogic()
    im.app.OnChanOpenInit(
        ctx,
        order,
        connectionHops,
        portID,
        channelID,
        channelCap,
        counterparty,
        appVersion, // note we only pass app version here
    )
}

func OnChanOpenTry(
    ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    counterpartyVersion string,
) (string, error) {
    doCustomLogic()

    // core/04-channel/types contains a helper function to split middleware and underlying app version
    cpMiddlewareVersion, cpAppVersion = channeltypes.SplitChannelVersion(counterpartyVersion)

    // call the underlying applications OnChanOpenTry callback
    appVersion, err := app.OnChanOpenTry(
        ctx,
        order,
        connectionHops,
        portID,
        channelID,
        channelCap,
        counterparty,
        cpAppVersion, // note we only pass counterparty app version here
    )
    if err != nil {
        return err
    }
    
    middlewareVersion := negotiateMiddlewareVersion(cpMiddlewareVersion)
    version := constructVersion(middlewareVersion, appVersion)

    return version
}

func OnChanOpenAck(
    ctx sdk.Context,
    portID,
    channelID string,
    counterpartyVersion string,
) error {
    // core/04-channel/types contains a helper function to split middleware and underlying app version
    middlewareVersion, appVersion = channeltypes.SplitChannelVersion(version)
    if !isCompatible(middlewareVersion) {
        return error
    }
    doCustomLogic()
      
    // call the underlying applications OnChanOpenTry callback
    app.OnChanOpenAck(ctx, portID, channelID, appVersion)
}

func OnChanOpenConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    doCustomLogic()

    app.OnChanOpenConfirm(ctx, portID, channelID)
}

OnChanCloseInit(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    doCustomLogic()

    app.OnChanCloseInit(ctx, portID, channelID)
}

OnChanCloseConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    doCustomLogic()

    app.OnChanCloseConfirm(ctx, portID, channelID)
}
```

注意:不需要与远程堆栈上的交易对手中间件协商的中间件不会实现版本拆分和协商，并且只会在回调上执行自己的自定义逻辑，而不依赖于交易对手的类似行为。

### 数据包回调

数据包回调就像握手回调一样包装了应用程序的数据包回调。 数据包回调是中间件执行其大部分自定义逻辑的地方。 中间件可能会读取数据包流数据并执行一些额外的数据包处理，或者它可能会在传入数据到达底层应用程序之前对其进行修改。 这实现了广泛的用例，因为像令牌传输这样的简单基础应用程序可以通过将其与自定义中间件相结合来转换为各种用例。

```go
OnRecvPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) ibcexported.Acknowledgement {
    doCustomLogic(packet)

    ack := app.OnRecvPacket(ctx, packet)

    doCustomLogic(ack) // middleware may modify outgoing ack
    return ack
}

OnAcknowledgementPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    acknowledgement []byte,
) (*sdk.Result, error) {
    doCustomLogic(packet, ack)

    app.OnAcknowledgementPacket(ctx, packet, ack)
}

OnTimeoutPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) (*sdk.Result, error) {
    doCustomLogic(packet)

    app.OnTimeoutPacket(ctx, packet)
}
```

### ICS-4 包装器

中间件还必须包装 ICS-4，以便从应用程序到 channelKeeper 的任何通信首先通过中间件。 与数据包回调类似，中间件可以以任何它希望的方式修改传出的确认和数据包。

```go
// only called for async acks
func WriteAcknowledgement(
  packet channeltypes.Packet,
  acknowledgement []bytes) {
    // middleware may modify acknowledgement
    ack_bytes = doCustomLogic(acknowledgement)

    return ics4Keeper.WriteAcknowledgement(packet, ack_bytes)
}

func SendPacket(appPacket channeltypes.Packet) {
    // middleware may modify packet
    packet = doCustomLogic(app_packet)

    return ics4Keeper.SendPacket(packet)
}
```
