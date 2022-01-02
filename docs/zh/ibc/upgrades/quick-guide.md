# 如何升级 IBC 链及其客户端

了解如何升级您的链和交易对手客户。 {概要}

本文档中有关升级链的信息与 SDK 链相关。但是，针对交易对手客户的指南与任何支持升级的 Tendermint 客户端相关。

### IBC 客户端中断升级

如果 IBC 连接链的升级会破坏交易对手 IBC 客户端，则它们必须执行 IBC 升级。当前的 IBC 协议支持针对 IBC 客户端破坏升级的特定子集升级 Tendermint 链。以下是 IBC 客户端破坏性升级的详尽列表以及 IBC 协议当前是否支持此类升级。

IBC 目前确实**不**支持计划外升级。以下所有升级都必须由升级链提前计划和承诺，以便交易对手客户安全地保持其连接。

注意:由于升级仅针对 Tendermint 客户端实施，本文档仅讨论会破坏交易对手 IBC Tendermint 客户端的 Tendermint 链上的升级。
3,702 / 5,000
翻訳結果
1.更改链ID:**支持**
2. 更改 UnbondingPeriod:**部分支持**，链可能会增加解绑时间，没有问题。然而，缩短解绑期可能会不可逆转地破坏一些交易对手客户。因此，**不建议**链条缩短解绑期。
3. 更改高度(重置为 0):**支持**，只要链记住在其链 ID 中增加修订号。
4. 更改 ProofSpecs:**支持**，如果在升级过程中验证 IBC 证明所需的证明结构发生变化，则应更改此项。例如:从 IAVL 存储切换到 SimpleTree 存储
5.更改升级路径:**支持**，这可能涉及更改升级存储中存储升级客户端和共识状态的密钥，甚至迁移升级存储本身。
6. 迁移 IBC 存储:**不支持**，因为 IBC 存储位置由连接协商。
7. 升级到向后兼容的 IBC 版本:支持
8. 升级到非向后兼容的 IBC 版本:**不支持**，因为 IBC 版本是在连接握手时协商的。
9. 更改 Tendermint LightClient 算法:**部分支持**。可能支持不改变 ClientState 或 ConsensusState 结构的轻客户端算法更改，前提是交易对手也升级为支持新的轻客户端算法。通过提供将旧的 ClientState 结构转换为新的 ClientState 结构的路径，理论上可以进行需要更新 ClientState 和 ConsensusState 结构本身的更改；但是，目前尚未实施。

### SDK 链的逐步升级过程

如果连接 IBC 的链正在进行会破坏交易对手客户端的升级，则必须确保 IBC 首先使用上面的列表支持升级，然后执行下面描述的升级过程，以防止交易对手客户端被破坏。

1. 创建一个 02-client [`UpgradeProposal`](https://github.com/cosmos/ibc-go/blob/main/docs/ibc/proto-docs.md#upgradeproposal) 和一个 `UpgradePlan` `UpgradedClientState` 字段中的新 IBC ClientState。请注意，`UpgradePlan` 必须指定升级高度 **only**(无升级时间)，并且 `ClientState` 应仅包含所有有效客户端共有的字段，并将任何客户端可自定义的字段清零(例如 TrustingPeriod) .
2. 投票通过`UpgradeProposal`

在“UpgradeProposal”通过后，升级模块将提交key下的UpgradedClient:“upgrade/UpgradedIBCState/{upgradeHeight}/upgradedClient”。在升级高度之前的区块上，升级模块还将为下一条链提交初始共识状态，密钥为:`upgrade/UpgradedIBCState/{upgradeHeight}/upgradedConsState`。

一旦链达到升级高度并停止，中继器可以将交易对手客户端升级到旧链的最后一个区块。然后，他们可以针对最后一个区块提交“UpgradedClient”和“UpgradedConsensusState”的证明并升级交易对手客户端。

### 中继器升级交易对手的分步升级过程

一旦升级链承诺升级，中继者必须等到链停止在升级高度后才能升级对手客户端。这是因为连锁店可能会在升级计划发生之前重新安排或取消升级计划。因此，中继者必须等到链达到升级高度并停止，然后才能确定升级会发生。

因此，中继器尝试升级交易对手客户端的升级过程如下: 

1.等待升级链到达升级高度并停止
2.查询旧链最后一个高度的`UpgradedClient`和`UpgradedConsensusState`的证明的全节点。
3. 使用 `UpdateClient` msg 将交易对手客户端更新到旧链的最后一个高度。
4. 向交易对手链提交“UpgradeClient”消息，其中包含“UpgradedClient”、“UpgradedConsensusState”及其各自的证明。
5. 向交易对手链提交一个 `UpdateClient` 消息，其中包含来自新升级链的标头。

交易对手链上的 Tendermint 客户端会在升级高度验证升级链确实提交给升级的客户端和升级的共识状态(因为升级高度包含在密钥中)。如果根据升级高度验证证明，则客户端将升级到新客户端，同时保留其所有客户端自定义字段。因此，它将保留其旧的 TrustingPeriod、TrustLevel、MaxClockDrift 等；同时采用新的链指定字段，例如 UnbondingPeriod、ChainId、UpgradePath 等。请注意，这可能会导致客户端无效，因为在给定新的链选择字段的情况下，旧的客户端选择字段可能不再有效。升级链应该通过不改变可能破坏旧客户端的参数来尝试避免这些情况。有关示例，请参阅支持的升级部分中的 UnbondingPeriod 示例。

升级后的共识状态将纯粹作为未来“UpdateClientMsgs”的信任基础，并且不包含用于执行证明验证的共识根。因此，中继者必须提交一个带有来自新链的标头的“UpdateClientMsg”，以便连接可以再次用于证明验证。