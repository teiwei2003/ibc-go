# IBC 应用程序

了解如何配置您的应用程序以使用 IBC 并将数据包发送到其他链。 {概要}

本文档可作为想要编写自己的 Inter-blockchain 的开发人员的指南
用于自定义用例的通信协议 (IBC) 应用程序。

由于IBC协议的模块化设计，IBC
应用程序开发人员不需要关心客户端的底层细节，
连接和证明验证。然而，对较低级别的简要说明
给出堆栈以便应用程序开发人员可以对 IBC 有一个高级别的理解
协议。然后文档详细介绍了与应用程序最相关的抽象层
开发人员（通道和端口），并描述如何定义自己的自定义数据包，以及
`IBCModule` 回调。

要让您的模块通过 IBC 进行交互，您必须：绑定到端口，定义您自己的数据包数据和确认结构以及如何对它们进行编码/解码，并实现
`IBCModule` 接口。以下是如何编写 IBC 应用程序的更详细说明
模块正确。

## 先决条件阅读

- [IBC 概览](./overview.md)) {prereq}
- [IBC 默认集成](./integration.md) {prereq}

##创建自定义IBC应用程序模块

### 实现`IBCModule` 接口和回调

Cosmos SDK 期望所有 IBC 模块都实现 [`IBCModule`
接口]（https://github.com/cosmos/ibc-go/tree/main/modules/core/05-port/types/module.go）。 这
接口包含 IBC 期望模块实现的所有回调。 本节将介绍
在通道握手执行期间调用的回调。

以下是模块预期实现的通道握手回调：

```go
// Called by IBC Handler on MsgOpenInit
func (k Keeper) OnChanOpenInit(ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID string,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    version string,
) error {
    // OpenInit must claim the channelCapability that IBC passes into the callback
    if err := k.ClaimCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
			return err
	}

    // ... do custom initialization logic

    // Use above arguments to determine if we want to abort handshake
    // Examples: Abort if order == UNORDERED,
    // Abort if version is unsupported
    err := checkArguments(args)
    return err
}

// Called by IBC Handler on MsgOpenTry
OnChanOpenTry(
    ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    counterpartyVersion string,
) (string, error) {
    // Module may have already claimed capability in OnChanOpenInit in the case of crossing hellos
    // (ie chainA and chainB both call ChanOpenInit before one of them calls ChanOpenTry)
    // If the module can already authenticate the capability then the module already owns it so we don't need to claim
    // Otherwise, module does not have channel capability and we must claim it from IBC
    if !k.AuthenticateCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)) {
        // Only claim channel capability passed back by IBC module if we do not already own it
        if err := k.scopedKeeper.ClaimCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
            return err
        }
    }
    
    // ... do custom initialization logic

    // Use above arguments to determine if we want to abort handshake
    if err := checkArguments(args); err != nil {
        return err
    }

    // Construct application version 
    // IBC applications must return the appropriate application version
    // This can be a simple string or it can be a complex version constructed
    // from the counterpartyVersion and other arguments. 
    // The version returned will be the channel version used for both channel ends. 
    appVersion := negotiateAppVersion(counterpartyVersion, args)
    
    return appVersion, nil
}

// Called by IBC Handler on MsgOpenAck
OnChanOpenAck(
    ctx sdk.Context,
    portID,
    channelID string,
    counterpartyVersion string,
) error {
    // ... do custom initialization logic

    // Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}

// Called by IBC Handler on MsgOpenConfirm
OnChanOpenConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    // ... do custom initialization logic

    // Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}
```

通道关闭握手还将调用模块回调，这些回调可以返回错误以中止
结束握手。 关闭通道是两步握手，发起链调用
`ChanCloseInit` 和终结链调用 `ChanCloseConfirm`。

```go
// Called by IBC Handler on MsgCloseInit
OnChanCloseInit(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    // ... do custom finalization logic

    // Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}

// Called by IBC Handler on MsgCloseConfirm
OnChanCloseConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    // ... do custom finalization logic

    // Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}
```

#### 通道握手版本协商

应用程序模块应验证在通道握手过程中使用的版本控制。

* `ChanOpenInit` 回调应该验证 `MsgChanOpenInit.Version` 是否有效
* `ChanOpenTry` 回调应该构造用于通道两端的应用程序版本。如果无法构建应用程序版本，则必须返回错误。
* `ChanOpenAck` 回调应该验证 `MsgChanOpenAck.CounterpartyVersion` 是否有效并受支持。

IBC 期望应用程序模块在“OnChanOpenTry”中执行应用程序版本协商。协商版本
必须返回到核心 IBC。如果无法协商版本，则应返回错误。

版本必须是字符串，但可以实现任何版本控制结构。如果您的应用程序计划
有线性版本，然后推荐语义版本控制。如果您的应用程序计划发布
主要版本之间的各种功能，然后建议使用相同的版本控制方案
作为IBC。此版本控制方案指定了版本标识符和兼容的功能集
那个标识符。有效的版本选择包括选择兼容的版本标识符
您的应用程序对该版本支持的功能子集。该结构用于此
方案可以在“03-connection/types”中找到。

由于版本类型是字符串，应用程序可以做简单的版本验证
通过字符串匹配，或者他们可以使用已经实现的版本控制系统并通过原型
根据需要将编码版本编码到每个握手调用中。

ICS20 目前使用单个支持的版本实现基本字符串匹配。

### 绑定端口

目前，端口必须在应用程序初始化时绑定。模块可以绑定到 `InitGenesis` 中的端口
像这样：

```go
func InitGenesis(ctx sdk.Context, keeper keeper.Keeper, state types.GenesisState) {
    // ... other initialization logic

    // Only try to bind to port if it is not already bound, since we may already own
    // port capability from capability InitGenesis
    if !isBound(ctx, state.PortID) {
        // module binds to desired ports on InitChain
        // and claims returned capabilities
        cap1 := keeper.IBCPortKeeper.BindPort(ctx, port1)
        cap2 := keeper.IBCPortKeeper.BindPort(ctx, port2)
        cap3 := keeper.IBCPortKeeper.BindPort(ctx, port3)

        // NOTE: The module's scoped capability keeper must be private
        keeper.scopedKeeper.ClaimCapability(cap1)
        keeper.scopedKeeper.ClaimCapability(cap2)
        keeper.scopedKeeper.ClaimCapability(cap3)
    }

    // ... more initialization logic
}
```

### 自定义数据包

通过通道连接的模块必须就它们通过通道发送的应用程序数据达成一致。
通道，以及他们将如何编码/解码它。 IBC 未指定此过程，因为它已启动
到每个应用模块来决定如何执行这个协议。 然而，对于大多数
应用程序这将在通道握手期间作为版本协商发生。 虽然更多
可以在通道开启握手内部实现复杂的版本协商，一个非常
[ibc-transfer 模块](https://github.com/cosmos/ibc-go/tree/main/modules/apps/transfer/module.go) 中实现了简单的版本协商。

因此，模块必须定义它的自定义数据包数据结构，以及定义良好的方法
将其编码和解码为`[]byte`。

```go
// Custom packet data defined in application module
type CustomPacketData struct {
    // Custom fields ...
}

EncodePacketData(packetData CustomPacketData) []byte {
    // encode packetData to bytes
}

DecodePacketData(encoded []byte) (CustomPacketData) {
    // decode from bytes to packet data
}
```

Then a module must encode its packet data before sending it through IBC.

```go
// Sending custom application packet data
data := EncodePacketData(customPacketData)
packet.Data = data
IBCChannelKeeper.SendPacket(ctx, packet)
```

A module receiving a packet must decode the `PacketData` into a structure it expects so that it can
act on it.

```go
// Receiving custom application packet data (in OnRecvPacket)
packetData := DecodePacketData(packet.Data)
// handle received custom packet data
```

#### 数据包流处理

正如 IBC 期望模块实现通道握手回调一样，IBC 也期望模块
实现回调以处理通过通道的数据包流。

一旦模块 A 和模块 B 相互连接，中继器就可以开始中继数据包和
在频道上来回确认。

![IBC数据包流程图](https://media.githubusercontent.com/media/cosmos/ibc/old/spec/ics-004-channel-and-packet-semantics/channel-state-machine.png)

简而言之，一个成功的数据包流的工作原理如下：

1.模块A通过IBC模块发送数据包
2.数据包被模块B接收
3. 如果模块 B 写入数据包的确认，则模块 A 将处理
   确认
4.如果在超时前没有成功接收到数据包，则模块A处理
   数据包超时。

##### 发送数据包

模块不通过回调发送数据包，因为模块发起发送的动作
数据包发送到 IBC 模块，而不是将消息发送到 IBC 的数据包流的其他部分
模块必须通过使用回调触发端口绑定模块的执行。因此，要发送一个
一个模块只需要在“IBCChannelKeeper”上调用“SendPacket”。

```go
// retrieve the dynamic capability for this channel
channelCap := scopedKeeper.GetCapability(ctx, channelCapName)
// Sending custom application packet data
data := EncodePacketData(customPacketData)
packet.Data = data
// Send packet to IBC, authenticating with channelCap
IBCChannelKeeper.SendPacket(ctx, channelCap, packet)
```

：：： 警告
为了防止模块在它们不拥有的通道上发送数据包，IBC 期望
模块为数据包的源通道传递正确的通道能力。
:::

##### 接收数据包

为了处理接收数据包，模块必须实现`OnRecvPacket` 回调。这得到
在 IBC 证明数据包有效并正确处理后，由 IBC 模块调用
守门员。因此，`OnRecvPacket` 回调只需要关心使适当的状态
更改给定的数据包数据而不必担心数据包是否有效。

模块可以向 IBC 处理程序返回一个实现确认接口的确认。
IBC 处理程序然后将提交该数据包的确认，以便中继器可以中继
确认返回发送器模块。

仅在以下情况下才会写入此回调期间发生的状态更改：
- 确认成功，如确认的 `Success()` 函数所示
- 如果返回的确认为 nil 表示正在发生异步进程

注意：处理异步确认的应用程序必须处理恢复状态更改
在适当的时候。在“OnRecvPacket”回调期间发生的任何状态更改都将被写入
用于异步确认。

```go
OnRecvPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) ibcexported.Acknowledgement {
    // Decode the packet data
    packetData := DecodePacketData(packet.Data)

    // do application state changes based on packet data and return the acknowledgement
    // NOTE: The acknowledgement will indicate to the IBC handler if the application 
    // state changes should be written via the `Success()` function. Application state
    // changes are only written if the acknowledgement is successful or the acknowledgement
    // returned is nil indicating that an asynchronous acknowledgement will occur.
    ack := processPacket(ctx, packet, packetData)

    return ack
}
```

The Acknowledgement interface:
```go
// Acknowledgement defines the interface used to return
// acknowledgements in the OnRecvPacket callback.
type Acknowledgement interface {
	Success() bool
	Acknowledgement() []byte
}
```

### 致谢

在同步数据包处理的情况下，模块可以在接收和处理数据包时提交确认。
如果在接收到数据包后的某个时间点处理数据包（异步执行），则确认
将在应用程序处理数据包后写入，这可能是在数据包接收之后。

注意：大多数区块链模块都希望使用同步执行模型，在该模型中模块处理和写入确认
对于从 IBC 模块接收到的数据包。

然后可以将此确认转发回原始发送者链，后者可以采取行动
取决于确认的内容。

正如分组数据对 IBC 是不透明的，确认同样是不透明的。模块必须通过和
接收带有 IBC 模块的确认作为字节字符串。

因此，模块必须就如何编码/解码确认达成一致。创建一个的过程
确认结构连同它的编码和解码，非常类似于分组数据
上面的例子。 [ICS 04](https://github.com/cosmos/ibc/blob/master/spec/core/ics-004-channel-and-packet-semantics#acknowledgement-envelope)
指定推荐的确认格式。此确认类型可以从
[频道类型]（https://github.com/cosmos/ibc-go/tree/main/modules/core/04-channel/types）。

虽然模块可以选择任意确认结构，但 IBC [此处](https://github.com/cosmos/ibc-go/blob/main/proto/ibc/core/channel/v1/channel.原型）：

```proto
// Acknowledgement is the recommended acknowledgement format to be used by
// app-specific protocols.
// NOTE: The field numbers 21 and 22 were explicitly chosen to avoid accidental
// conflicts with other protobuf message formats used for acknowledgements.
// The first byte of any message with this format will be the non-ASCII values
// `0xaa` (result) or `0xb2` (error). Implemented as defined by ICS:
// https://github.com/cosmos/ibc/tree/master/spec/core/ics-004-channel-and-packet-semantics#acknowledgement-envelope
message Acknowledgement {
  // response contains either a result or an error and must be non-empty
  oneof response {
    bytes  result = 21;
    string error  = 22;
  }
}
```

#### 确认数据包

在模块写入确认后，中继器可以将确认中继回发送器模块。 发送模块可以
然后使用`OnAcknowledgementPacket`回调处理确认。 的内容
确认完全取决于通道上的模块（就像分组数据一样）； 然而，它
可能经常包含有关数据包是否被成功处理的信息
如果数据包处理失败，一些额外的数据可能对补救有用。

由于模块负责就分组数据的编码/解码标准达成一致，并且
确认，IBC 会将确认作为 `[]byte` 传递给这个回调。 回调
负责解码确认并处理它。

```go
OnAcknowledgementPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    acknowledgement []byte,
) (*sdk.Result, error) {
    // Decode acknowledgement
    ack := DecodeAcknowledgement(acknowledgement)

    // process ack
    res, err := processAck(ack)
    return res, err
}
```

#### 超时数据包

如果在成功接收数据包之前达到数据包的超时时间或
对方通道端在数据包被成功接收之前关闭，然后接收
链无法再处理它。 因此，发送链必须使用
`OnTimeoutPacket` 来处理这种情况。 IBC 模块将再次验证超时是否为
确实有效，所以我们的模块只需要实现一次做什么的状态机逻辑
超时时间已到，无法再接收数据包。

```go
OnTimeoutPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) (*sdk.Result, error) {
    // do custom timeout logic
}
```

### 路由

如上所述，模块必须实现 IBC 模块接口（其中包含通道
握手回调和数据包处理回调）。 这个接口的具体实现
必须使用模块名称注册为 IBC `Router` 上的路由。

```go
// app.go
func NewApp(...args) *App {
// ...

// Create static IBC router, add module routes, then set and seal it
ibcRouter := port.NewRouter()

ibcRouter.AddRoute(ibctransfertypes.ModuleName, transferModule)
// Note: moduleCallbacks must implement IBCModule interface
ibcRouter.AddRoute(moduleName, moduleCallbacks)

// Setting Router will finalize all routes by sealing router
// No more routes can be added
app.IBCKeeper.SetRouter(ibcRouter)
```

## 工作示例

有关 IBC 应用程序的实际工作示例，您可以查看“ibc-transfer”模块
它实现了上面讨论的所有内容。

以下是要查看的模块的有用部分：

[绑定转移
端口]（https://github.com/cosmos/ibc-go/blob/main/modules/apps/transfer/types/genesis.go）

[发送转账
数据包]（https://github.com/cosmos/ibc-go/blob/main/modules/apps/transfer/keeper/relay.go）

[实施IBC
回调]（https://github.com/cosmos/ibc-go/blob/main/modules/apps/transfer/module.go）

## 下一个{hide}

了解 [构建模块](https://github.com/cosmos/cosmos-sdk/blob/master/docs/building-modules/intro.md) {hide}