# 升级 IBC 链概述

该目录包含有关如何在不中断交易对手客户端和连接的情况下升级 IBC 链的信息。

IBC 连接的链必须能够在不中断与其他链的连接的情况下升级。否则，升级和破坏高价值 IBC 连接将受到巨大阻碍，从而阻止 IBC 生态系统中的链发展和改进。许多链升级可能与 IBC 无关，但如果处理不当，某些升级可能会破坏交易对手客户。因此，任何希望执行 IBC 客户端中断升级的 IBC 链都必须执行 IBC 升级，以允许交易对手客户端安全地升级到新的轻客户端。

1. [quick-guide](./quick-guide.md) 描述了 IBC 连接的链如何执行客户端中断升级以及中继器如何使用 SDK 安全地升级交易对手客户端。
2. [developer-guide](./developer-guide.md) 是为打算开发具有升级功能的 IBC 客户端实现的开发人员提供的指南。