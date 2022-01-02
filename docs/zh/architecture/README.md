# 架构决策记录 (ADR)

这是记录 ibc-go 项目中所有高级架构决策的位置。

您可以在此 [博客文章](https://product.reverb.com/documenting-architecture-decisions-the-reverb-way-a3563bb24bd0#.78xhdix6t) 中阅读有关 ADR 概念的更多信息。

ADR 应提供:

- 相关目标和当前状态的背景
- 为实现目标而提出的变更
- 利弊总结
- 参考
- 变更日志

请注意 ADR 和规范之间的区别。 ADR 提供上下文、直觉、推理和
改变架构的理由，或某物的架构
新的。该规范对所有内容进行了更加压缩和简化的总结，因为
它是或应该是。

如果发现缺少记录的决策，请召集讨论，在此处记录新决策，然后修改代码以匹配。

注意上下文/背景应该用现在时写。

要建议 ADR，请使用提供的 [ADR 模板](./adr-template.md)。

## 目录

| ADR \# |说明 |状态 |
| ------ | ----------- | ------ |
| [001](./adr-001-coin-source-tracing.md) | ICS-20 硬币面额格式 |接受，实施 |
| [015](./adr-015-ibc-packet-receiver.md) | IBC 数据包路由 |接受 |
| [025](./adr-025-ibc-passive-channels.md) | IBC无源通道|已弃用 |
| [026](./adr-026-ibc-client-recovery-mechanisms.md) | IBC 客户端恢复机制 |接受 |
| [027](./adr-027-ibc-wasm.md) |基于 Wasm 的轻客户端 |接受 |