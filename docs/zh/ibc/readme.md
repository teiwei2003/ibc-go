＃ 概述

了解 IBC、其组件和 IBC 用例。 {概要}

## 什么是区块链间通信协议（IBC）？

本文档可作为想要编写自己的 Inter-Blockchain 的开发人员的指南
用于自定义用例的通信协议 (IBC) 应用程序。

> IBC 应用程序必须编写为自包含模块。

由于IBC协议的模块化设计，IBC
应用程序开发人员不需要关心客户端的底层细节，
连接和证明验证。

对较低级别的简要说明
堆栈使应用程序开发人员对 IBC 有广泛的了解
协议。通道和端口的抽象层详细信息与应用程序开发人员最相关，并描述了如何定义自定义数据包和“IBCModule”回调。

让您的模块通过 IBC 进行交互的要求是：

- 绑定到一个或多个端口。
- 定义您的数据包数据。
- 使用核心 IBC 提供的默认确认结构或可选地定义自定义确认结构。
- 标准化分组数据的编码。
- 实现“IBCModule”接口。

继续阅读有关如何编写独立 IBC 应用程序模块的详细说明。

## 组件概述

### [客户端](https://github.com/cosmos/ibc-go/blob/main/modules/core/02-client)

IBC 客户端是链上轻客户端。每个轻客户端都由唯一的客户端 ID 标识。
IBC 客户跟踪其他区块链的共识状态，以及必要的证明规范
根据客户的共识状态正确验证证明。一个客户可以与任何号码相关联
与交易对手链的连接。客户端标识符是使用客户端类型自动生成的
以及以以下格式附加的全局客户端计数器：`{client-type}-{N}`。

“ClientState”应包含验证更新所需的链特定和轻客户端特定信息
并升级到 IBC 客户端。 `ClientState` 可能包含诸如链 ID、最新高度、证明规范、
解除绑定期或轻客户端的状态。 `ClientState` 不应包含以下信息
特定于特定高度的给定块，这是“CosnensusState”的功能。每个`ConsensusState`
应该与唯一的块相关联，并且应该使用高度进行引用。 IBC 客户被给予
以客户端标识符为前缀的存储，用于存储其关联的客户端状态和共识状态以及
与共识状态相关的任何元数据。共识状态使用其关联的高度存储。

支持的 IBC 客户端是：

* [Solo Machine 轻客户端](https://github.com/cosmos/ibc-go/blob/main/modules/light-clients/06-solomachine)：手机、浏览器或笔记本电脑等设备。
* [Tendermint 轻客户端](https://github.com/cosmos/ibc-go/blob/main/modules/light-clients/07-tendermint)：基于 Cosmos SDK 的链的默认值。
* [Localhost (loopback) client](https://github.com/cosmos/ibc-go/blob/main/modules/light-clients/09-localhost)：有用
测试、模拟和将数据包中继到同一应用程序上的模块。

### IBC 客户高度

IBC 客户高度由以下结构表示：

```go
type Height struct {
   RevisionNumber uint64
   RevisionHeight uint64
}
```

`RevisionNumber` 表示高度所代表的链的修订版本。
修订通常代表一个连续的、单调增加的块高度范围。
`RevisionHeight` 表示给定修订版中链的高度。

在“RevisionHeight”的任何重置时——例如，当硬分叉 Tendermint 链时——
`RevisionNumber` 将增加。这允许 IBC 客户端区分
链的前一个修订版（在修订版“p”处）的块高度“n”和当前链的块高度“n”
链的修订版（在修订版`e`）。

可以通过简单地比较它们各自的“RevisionHeight”来比较共享相同修订号的“高度”。
不共享相同修订号的 `Height` 将仅使用它们各自的 `RevisionNumber` 进行比较。
因此，修订号为“e+1”的高度“h”将始终大于修订号为“e”的高度“g”，
**不管**修订高度的差异。
Ex:

```go
Height{RevisionNumber: 3, RevisionHeight: 0} > Height{RevisionNumber: 2, RevisionHeight: 100000000000}
```

当 Tendermint 链正在运行特定修订版时，中继者可以简单地提交带有修订号的标题和证明
由链的“chainID”给出，修订高度由 Tendermint 块高度给出。当链使用硬分叉更新时
并重置其区块高度，它负责更新其“chainID”以增加修订号。
IBC Tendermint 客户端然后根据其“chainID”验证修订号，并将“RevisionHeight”视为 Tendermint 块高度。

Tendermint 链希望使用修订来维持持久的 IBC 连接，即使在高度重置升级中也必须格式化其“chainID”
以下列方式：`{chainID}-{revision_number}`。在任何高度重置升级中，`chainID` **必须** 更新为更高的修订号
比之前的值。

前任：

- 升级`chainID`前：`gaiamainnet-3`
- 升级`chainID`后：`gaiamainnet-4`

不需要修订的客户端，例如单机客户端，只要他们简单地将“0”硬编码到修订号中
在实现 IBC 接口时需要返回 IBC 高度，并且只使用 `RevisionHeight`。

其他客户端类型可以实现自己的逻辑来验证中继器在其 `Update`、`Misbehavior` 和
分别为“验证”功能。

IBC 接口需要一个 `ibcexported.Height` 接口，但是所有客户端必须使用提供的具体实现
`02-client/types` 和上面转载。

### [连接](https://github.com/cosmos/ibc-go/blob/main/modules/core/03-connection)

Connections 将两个“ConnectionEnd”对象封装在两个独立的区块链上。每个
`ConnectionEnd` 与另一个区块链（例如，交易对手区块链）的客户端相关联。
连接握手负责验证每个链上的轻客户端是
对各自的交易对手进行修正。连接一旦建立，负责
促进 IBC 状态的所有跨链验证。一个连接可以与任何
通道数。

### [证明](https://github.com/cosmos/ibc-go/blob/main/modules/core/23-commitment) 和 [路径](https://github.com/cosmos/ibc- go/blob/main/modules/core/24-host)
  
在 IBC 中，区块链不会直接通过网络相互传递消息。相反，要
通信，区块链将某些状态提交到专门定义的路径，该路径保留给
特定的消息类型和特定的交易对手。例如，用于存储特定的 connectionEnd 作为一部分
握手或旨在中继到交易对手链上的模块的数据包。中继器
进程监控这些路径的更新并通过提交存储的数据来中继消息
在路径下和交易对手链的证明。

证明以字节的形式从核心 IBC 传递到轻客户端。适当地解释这些字节取决于轻客户端实现。

- 所有 IBC 实现必须用于提交 IBC 消息的路径定义在
[ICS-24 主机状态机要求](https://github.com/cosmos/ics/tree/master/spec/core/ics-024-host-requirements)。
- 所有实现必须能够生成和验证的证明格式在 [ICS-23 Proofs](https://github.com/confio/ics23) 实现中定义。

### [功能](https://github.com/cosmos/cosmos-sdk/blob/master/docs/core/ocap.md)

IBC 旨在在模块不一定信任每个模块的执行环境中工作
其他。因此，IBC 必须验证端口和通道上的模块操作，以便只有具有
适当的权限可以使用它们。

此模块身份验证是使用 [动态
能力存储]（https://github.com/cosmos/cosmos-sdk/blob/master/docs/architecture/adr-003-dynamic-capability-store.md）。绑定到端口或
为模块创建通道，IBC 返回模块必须声明的动态能力
为了使用该端口或通道。动态能力模块阻止其他模块使用该端口或通道，因为
他们没有适当的能力。

虽然这些背景信息很有用，但 IBC 模块根本不需要与
这些较低级别的抽象。 IBC 应用程序开发人员的相关抽象层是
通道和端口。 IBC 应用程序必须编写为独立的**模块**。

一个区块链上的模块可以通过发送与其他区块链上的其他模块进行通信，
通过唯一标识的通道接收和确认数据包
`(channelID, portID)` 元组。

一个有用的类比是将 IBC 模块视为互联网应用程序
一台电脑。然后可以将通道概念化为 IP 连接，其中 IBC 端口 ID 为
类似于 IP 端口，而 IBC 通道 ID 类似于 IP 地址。因此，单
IBC 模块的实例可以在同一端口上与任意数量的其他模块进行通信，并且
IBC 使用 (channelID, portID 元组) 将所有数据包正确路由到相关模块。一个
IBC 模块还可以通过多个端口与另一个 IBC 模块通信，每个端口
`(portID<->portID)` 数据包流在不同的唯一通道上发送。

### [端口](https://github.com/cosmos/ibc-go/blob/main/modules/core/05-port)

IBC 模块可以绑定到任意数量的端口。每个端口必须由唯一的“portID”标识。
由于 IBC 旨在通过在同一分类帐上运行的相互不信任的模块来确保安全，
绑定一个端口返回一个动态对象能力。为了对特定端口采取行动
（例如，具有其端口 ID 的开放通道），模块必须向 IBC 提供动态对象能力
处理程序。此要求可防止恶意模块打开带有它不拥有的端口的通道。因此，
IBC 模块负责声明在`BindPort` 上返回的能力。

### [频道](https://github.com/cosmos/ibc-go/blob/main/modules/core/04-channel)

可以在两个 IBC 端口之间建立 IBC 通道。目前，一个港口是由一个独家拥有的
单模块。 IBC 数据包通过通道发送。就像 IP 数据包包含目标 IP 一样
地址和IP端口，以及源IP地址和源IP端口，IBC包包含
目的端口号和通道号，以及源端口号和通道号。这种数据包结构使 IBC 能够
正确地将数据包路由到目标模块，同时允许模块接收数据包
知道发件人模块。

通道可以是“ORDERED”的，其中来自发送模块的数据包必须由
接收模块按照发送的顺序。或者一个通道可以是`UNORDERED`，其中数据包
来自发送模块的按它们到达的顺序进行处理（可能与发送的顺序不同）。

模块可以选择他们希望通过哪些通道进行通信，因此 IBC 希望模块能够
实现在通道握手期间调用的回调。这些回调可以做自定义
通道初始化逻辑。如果任何回调返回错误，则通道握手失败。因此，由
在回调中返回错误，模块可以以编程方式拒绝和接受通道。

通道握手是一个 4 步握手。简而言之，如果给定的链 A 想要打开一个通道
链 B 使用已经建立的连接：

1. 链 A 发送一个 `ChanOpenInit` 消息来通知链 B 的通道初始化尝试。
2. 链 B 发送 `ChanOpenTry` 消息尝试打开链 A 上的通道。
3.链A发送`ChanOpenAck`消息将其通道结束状态标记为打开。
4. 链B发送`ChanOpenConfirm`消息将其通道结束状态标记为开放。

如果所有握手步骤都成功，则双方都打开通道。在握手的每一步，模块
与`ChannelEnd` 关联执行其回调。所以
在 `ChanOpenInit` 上，链 A 上的模块执行其回调 `OnChanOpenInit`。

通道标识符以以下格式自动导出：`channel-{N}`，其中 N 是要使用的下一个序列。

正如端口具有动态能力一样，通道初始化返回一个动态能力
模块 ** 必须** 声明，以便他们可以传入验证通道操作的功能
比如发送数据包。通道能力被传递到回调的第一部分
握手；初始化链上的“OnChanOpenInit”或另一条链上的“OnChanOpenTry”。

#### 关闭频道

关闭通道发生在 [ICS 04](https://github.com/cosmos/ibc/tree/master/spec/core/ics-004-channel-and-packet-semantics) 中定义的 2 个握手步骤中。

`ChanCloseInit` 关闭执行链上的通道，如果该通道存在，则不存在
已经关闭并且它存在的连接是打开的。通道只能由
调用模块或在 ORDERED 通道上的数据包超时的情况下。

`ChanCloseConfirm` 是对执行 `ChanCloseInit` 的交易对手渠道的响应。这个频道
如果通道存在，则在执行链上关闭，通道尚未关闭，
通道所在的连接已打开并且执行链已成功验证
交易对手渠道已关闭。


### [数据包](https://github.com/cosmos/ibc-go/blob/main/modules/core/04-channel)

模块通过在 IBC 通道上发送数据包来相互通信。全部
IBC 数据包包含目标 `portID` 和 `channelID` 以及源 `portID` 和
`频道ID`。这种数据包结构允许模块知道给定数据包的发送方模块。 IBC包
包含一个序列来可选地强制排序。

IBC 数据包还包含一个“TimeoutHeight”和一个“TimeoutTimestamp”，用于确定接收模块必须处理数据包之前的最后期限。

模块在 IBC 数据包的“Data []byte”字段内相互发送自定义应用程序数据。
因此，分组数据对于 IBC 处理程序是不透明的。发送方模块有责任进行编码
将它们特定于应用程序的数据包信息放入数据包的“数据”字段中。收件人
模块必须将该“数据”解码回原始应用程序数据。

### [收据和超时](https://github.com/cosmos/ibc-go/blob/main/modules/core/04-channel)

由于 IBC 在分布式网络上工作，并依赖于潜在故障的中继器在分类账之间中继消息，
IBC 必须处理数据包没有及时或根本没有发送到目的地的情况。数据包必须
为超时高度 (`TimeoutHeight`) 或超时时间戳 (`TimeoutTimestamp`) 指定一个非零值，在此之后，目标链上将无法再成功接收数据包。

- `timeoutHeight` 表示目标链上的共识高度，在此之后不再处理数据包，而是计为超时。
- `timeoutTimestamp` 表示目标链上的时间戳，在此之后不再处理数据包，而是计为超时。

如果超时未成功接收数据包，则无法再接收数据包
在目标链上收到。发送模块可以使数据包超时并采取适当的措施。

如果达到超时，则可以向原始链提交数据包超时的证明。然后原始链可以执行
应用程序特定的逻辑来超时数据包，可能通过回滚数据包发送更改（退还发件人任何锁定的资金等）。

- 在 ORDERED 通道中，通道中单个数据包的超时会导致通道关闭。

    - 如果数据包序列 `n` 超时，那么在不违反 ORDERED 通道的约定的情况下，无法接收顺序为 `k > n` 的数据包，即按照发送顺序处理数据包。
    - 由于 ORDERED 通道强制执行此不变量，因此在数据包 n 的指定超时之前尚未在目标链上接收到序列 n 的证据足以使数据包 n 超时并关闭通道。

- 在 UNORDERED 通道中，应用该数据包的特定于应用程序的超时逻辑，并且通道未关闭。

    - 可以按任何顺序接收数据包。

    - IBC 为在 UNORDERED 通道中接收的每个序列写入一个数据包接收。此收据不包含信息；它只是一个标记，用于表示 UNORDERED 通道已按指定的顺序接收到一个数据包。

    - 要使 UNORDERED 通道上的数据包超时，需要证明在指定的超时时间内收到数据包序列**不存在**的数据包。

出于这个原因，大多数模块应该使用 UNORDERED 频道，因为它们需要较少的活跃度保证才能为该频道的用户有效运行。

### [致谢](https://github.com/cosmos/ibc-go/blob/main/modules/core/04-channel)

模块还可以选择在处理数据包时写入特定于应用程序的确认。可以进行确认：

- 如果模块在从 IBC 模块接收到数据包后立即处理数据包，则在 `OnRecvPacket` 上同步。
- 如果模块在接收数据包后的某个时间点处理数据包，则异步。

这个确认数据对 IBC 来说是不透明的，就像数据包“Data”一样，被 IBC 视为一个简单的字节串“[]byte”。接收器模块必须对其确认进行编码，以便发送器模块可以正确解码。编码必须在通道握手中的版本协商期间在双方之间协商。

确认可以编码数据包处理是成功还是失败，以及允许发送方模块采取适当行动的附加信息。

在接收链写入确认后，中继器将确认中继回原始发送器模块。

原始发送器模块然后使用确认的内容执行特定于应用程序的确认逻辑。

- 确认失败后，可以回滚数据包发送的更改（例如，在 ICS20 中退还发件人）。

- 在链上的原始发送方成功收到确认后，删除相应的数据包承诺，因为不再需要它。

## 进一步阅读和规格

如果您想了解有关 IBC 的更多信息，请查看以下规格：

* [IBC 规范概述](https://github.com/cosmos/ibc/blob/master/README.md)

## 下一个{hide}

了解如何 [integrate](./integration.md) IBC 到您的应用程序 {hide}