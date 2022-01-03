# 中继器

## 先决条件阅读

- [IBC 概览](./overview.md) {prereq}
- [事件](https://github.com/cosmos/cosmos-sdk/blob/master/docs/core/events.md) {prereq}

## 事件

为基础应用程序处理的每个事务发出事件以指示执行
一些客户可能想要了解的逻辑。这在中继 IBC 数据包时非常有用。
任何使用 IBC 的消息都会为执行中定义的相应 TAO 逻辑发出事件
[IBC 事件文档](./events.md)。

在 SDK 中，可以假设对于每条消息，都有一个类型为 `message` 的事件，
属性键`action`，以及表示发送消息类型的属性值
（`channel_open_init` 将是`MsgChannelOpenInit` 的属性值）。如果中继器查询
对于事务事件，它可以使用此事件类型/属性键对拆分消息事件。

带有属性键“module”的事件类型“message”可能会针对单个事件多次发出
由于应用程序回调而产生的消息。可以假设执行的任何 TAO 逻辑都会导致
具有属性值“ibc_<submodulename>”的模块事件发射（02-client 发射“ibc_client”）。

### 订阅 Tendermint

通过 [Tendermint 的 Websocket](https://docs.tendermint.com/master/rpc/) 调用 Tendermint RPC 方法 `Subscribe` 将使用以下方法返回事件
Tendermint 对它们的内部表示。而不是像他们一样接收事件列表
发出后，Tendermint 将返回类型 `map[string][]string`，它映射了
从 `<event_type>.<attribute_key>` 到 `attribute_value`。这会导致事件的提取
订购是非平凡的，但仍然可能。

中继者应该使用 `message.action` 键来提取交易中的消息数量
以及发送的 IBC 交易类型。对于字符串数组中的每个 IBC 交易
`message.action`，应该从其他事件字段中提取必要的信息。如果
`send_packet` 出现在 `message.action` 值的索引 2 处，中继器将需要使用
键“send_packet.packet_sequence”的索引 2 处的值。应该对每个人重复这个过程
中继数据包所需的一条信息。

## 示例实现

- [Golang Relayer](https://github.com/iqlusioninc/relayer)
- [爱马仕](https://github.com/informalsystems/ibc-rs/tree/master/relayer)