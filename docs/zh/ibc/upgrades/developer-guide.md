# IBC 客户端开发人员升级指南

了解如何为您的自定义 IBC 客户端实施升级功能。 {概要}

正如 [README](./README.md) 中提到的，高价值 IBC 客户可以与其底层链一起升级以避免对 IBC 生态系统的破坏至关重要。 因此，IBC 客户端开发人员将希望实现升级功能，使客户端即使在链升级中也能保持连接和通道。

IBC 协议允许客户端实现提供升级客户端的路径，给定升级的客户端状态、升级的共识状态和每个证明。

```go
// Upgrade functions
// NOTE: proof heights are not included as upgrade to a new revision is expected to pass only on the last
// height committed by the current revision. Clients are responsible for ensuring that the planned last
// height of the current revision is somehow encoded in the proof verification process.
// This is to ensure that no premature upgrades occur, since upgrade plans committed to by the counterparty
// may be cancelled or modified before the last planned height.
VerifyUpgradeAndUpdateState(
    ctx sdk.Context,
    cdc codec.BinaryCodec,
    store sdk.KVStore,
    newClient ClientState,
    newConsState ConsensusState,
    proofUpgradeClient,
    proofUpgradeConsState []byte,
) (upgradedClient ClientState, upgradedConsensus ConsensusState, err error)
```

请注意，客户端应该事先了解升级的客户端和升级的共识状态将使用的默克尔路径。发生升级的高度也应在证明中编码。 Tendermint 客户端实现通过在 ClientState 本身中包含一个 `UpgradePath` 来实现这一点，它与升级高度一起用于构建提交客户端状态和共识状态的默克尔路径。

开发者必须确保`UpgradeClientMsg`在旧链的最后一个高度提交之前不会通过，并且在链升级后，`UpgradeClientMsg`应该在所有交易对手客户端上只通过一次。

开发人员必须确保新客户端采用所有新客户端参数，这些参数必须在链的每个有效轻客户端上统一(链选择参数)，同时维护可由每个单独客户端自定义的客户端参数(客户端选择参数) ) 来自先前版本的客户端。

升级必须遵守 IBC 安全模型。 IBC 不依赖于诚实中继者的正确性假设。因此，用户不应该依赖中继器来维护客户端的正确性和安全性(尽管必须存在诚实的中继器才能保持中继器的活跃度)。虽然中继器可以在创建新的“ClientState”时选择任何一组客户端参数，但这仍然适用于安全模型，因为用户始终可以选择适合其安全性和正确性需求的中继器创建的客户端，或者在以下情况下创建具有所需参数的客户端不存在这样的客户。

但是，在升级现有客户端时，必须记住已经有许多用户依赖于该客户端的特定参数。一旦这些参数已经被选择，我们就不能让升级中继器自由选择这些参数。这将违反安全模型，因为依赖客户端的用户将不得不依赖升级中继器来维持相同级别的安全性。因此，开发人员必须确保他们的升级机制允许客户端在链升级更改这些参数时升级链指定的参数(Tendermint 客户端中的示例包括 `UnbondingPeriod`、`ChainID`、`UpgradePath` 等)，而确保提交 `UpgradeClientMsg` 的中继器不能更改用户所依赖的客户端选择的参数(Tendermint 客户端中的示例包括 `TrustingPeriod`、`TrustLevel`、`MaxClockDrift` 等)。

开发人员应区分链的每个有效轻客户端统一的客户端参数(链选择参数)和每个单独客户端可自定义的客户端参数(客户端选择参数)；因为这种区别对于在 `ClientState` 接口中实现 `ZeroCustomFields` 方法是必要的:

```go
// Utility function that zeroes out any client customizable fields in client state
// Ledger enforced fields are maintained while all custom fields are zero values
// Used to verify upgrades
ZeroCustomFields() ClientState
```

交易对手客户端可以通过使用链提交的“UpgradedClient”中的所有链选择参数并保留所有旧的客户端选择参数来安全地升级。 这使链能够在不依赖诚实中继器的情况下安全地升级，但是在某些情况下，如果新的链选择参数与旧的客户端选择参数发生冲突，它可能会导致无效的最终“ClientState”。 如果升级链将“UnbondingPeriod”(链选择)降低到低于交易对手客户“TrustingPeriod”(客户端选择)的持续时间，则在 Tendermint 客户端情况下可能会发生这种情况。 此类情况应由开发人员明确记录，以便链知道应避免进行哪些升级以防止出现此问题。 最终升级的客户端还应在返回之前在“VerifyUpgradeAndUpdateState”中进行验证，以确保客户端不会升级到无效的“ClientState”。