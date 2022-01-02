# Genesis 重启升级

了解如何使用创世重启来升级您的链和交易对手客户端。 {概要}

**注意**:中继器目前不支持常规的创世重启！

### IBC 客户端中断升级

IBC 客户端中断升级可以使用 genesis 重新启动。
强烈建议使用就地迁移而不是创世重启。
应谨慎使用 Genesis 重启并作为备份计划。

Genesis 重新启动仍然需要使用 IBC 升级提案，以便正确升级交易对手客户端。

#### SDK 链的逐步升级过程

如果 IBC 连接链正在进行会破坏交易对手客户端的升级，则必须确保 IBC 首先使用 [IBC 客户端破坏升级列表](https://github.com/cosmos/ibc-go /blob/main/docs/ibc/upgrades/quick-guide.md#ibc-client-break-upgrades)，然后执行下面描述的升级过程，以防止交易对手客户端崩溃。

1. 创建一个 02-client [`UpgradeProposal`](https://github.com/cosmos/ibc-go/blob/main/docs/ibc/proto-docs.md#upgradeproposal) 和一个 `UpgradePlan` `UpgradedClientState` 字段中的新 IBC ClientState。请注意，`UpgradePlan` 必须指定升级高度 **only**(无升级时间)，并且 `ClientState` 应仅包含所有有效客户端共有的字段，并将任何客户端可自定义的字段清零(例如 TrustingPeriod) .
2. 投票通过`UpgradeProposal`
3. 升级成功后停止节点。
4. 导出创世文件。
5. 切换到新的二进制文件。
6. 在 genesis 文件上运行迁移。
7. 从 genesis 文件中删除 `UpgradeProposal` 计划。这可以通过迁移来完成。
8. 更改所需的链特定字段(链 ID、解绑期等)。这可以通过迁移来完成。
8. 重置节点数据。
9. 启动链条。

在“UpgradeProposal”通过后，升级模块将提交key下的UpgradedClient:“upgrade/UpgradedIBCState/{upgradeHeight}/upgradedClient”。在升级高度之前的区块上，升级模块还将为下一条链提交初始共识状态，密钥为:`upgrade/UpgradedIBCState/{upgradeHeight}/upgradedConsState`。

一旦链达到升级高度并停止，中继器可以将交易对手客户端升级到旧链的最后一个区块。然后，他们可以针对最后一个区块提交“UpgradedClient”和“UpgradedConsensusState”的证明并升级交易对手客户端。

#### 中继器升级交易对手的分步升级过程

这些步骤与常规的 [IBC 客户端中断升级过程](https://github.com/cosmos/ibc-go/blob/main/docs/ibc/upgrades/quick-guide.md#step-by-step -upgrade-process-for-relayers-upgrading-counterparty-clients)。

### 非 IBC 客户端中断升级

虽然 ibc-go 支持不会破坏 IBC 客户端的创世重启，但中继器不支持这种升级路径。
这是 [Hermes](https://github.com/informalsystems/ibc-rs/issues/1152) 上的跟踪问题。
请不要尝试定期重新启动，除非您有一个工具可以正确更新交易对手客户端。