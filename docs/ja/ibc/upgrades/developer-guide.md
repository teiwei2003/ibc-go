# アップグレードに関するIBCクライアント開発者ガイド

カスタムIBCクライアントにアップグレード機能を実装する方法を学びます。 {synopsis}

[README](./README.md)で説明されているように、価値の高いIBCクライアントは、IBCエコシステムの中断を回避するために、基盤となるチェーンとともにアップグレードできることが重要です。 したがって、IBCクライアント開発者は、アップグレード機能を実装して、クライアントがチェーンのアップグレードを超えても接続とチャネルを維持できるようにする必要があります。

IBCプロトコルを使用すると、クライアント実装は、アップグレードされたクライアント状態、アップグレードされたコンセンサス状態、およびそれぞれのプルーフを指定して、クライアントをアップグレードするためのパスを提供できます。

```go
//Upgrade functions
//NOTE: proof heights are not included as upgrade to a new revision is expected to pass only on the last
//height committed by the current revision. Clients are responsible for ensuring that the planned last
//height of the current revision is somehow encoded in the proof verification process.
//This is to ensure that no premature upgrades occur, since upgrade plans committed to by the counterparty
//may be cancelled or modified before the last planned height.
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

クライアントは、アップグレードされたクライアントとアップグレードされたコンセンサス状態が使用するマークルパスについて事前に知っている必要があることに注意してください。アップグレードが発生した高さもプルーフにエンコードする必要があります。 Tendermintクライアントの実装は、ClientState自体に `UpgradePath`を含めることでこれを実現します。これは、アップグレードの高さとともに使用され、クライアント状態とコンセンサス状態がコミットされるマークルパスを構築します。

開発者は、古いチェーンの最後の高さがコミットされるまで `UpgradeClientMsg`が渡されないようにする必要があります。チェーンのアップグレード後、` UpgradeClientMsg`はすべてのカウンターパーティクライアントで1回だけ渡される必要があります。

開発者は、個々のクライアントによってカスタマイズ可能なクライアントパラメーター(クライアントが選択したパラメーター)を維持しながら、新しいクライアントがチェーンのすべての有効なライトクライアント全体で均一でなければならないすべての新しいクライアントパラメーター(チェーンが選択したパラメーター)を採用することを確認する必要があります)以前のバージョンのクライアントから。

アップグレードは、IBCセキュリティモデルに準拠する必要があります。 IBCは、正直な中継者の仮定に依存していません。したがって、ユーザーはクライアントの正確性とセキュリティを維持するために中継器に依存する必要はありません(ただし、中継器の活性を維持するには正直な中継器が存在する必要があります)。中継者は新しい `ClientState`を作成するときにクライアントパラメータの任意のセットを選択できますが、ユーザーはセキュリティと正確性のニーズに合った中継者が作成したクライアントをいつでも選択できるため、これはセキュリティモデルでも当てはまります。そのようなクライアントは存在しません。

ただし、既存のクライアントをアップグレードする場合は、このクライアントの特定のパラメーターに依存するユーザーがすでに多数存在することに注意する必要があります。これらのパラメータがすでに選択されている場合、アップグレードするリレーにこれらのパラメータを自由に選択させることはできません。クライアントに依存するユーザーは、同じレベルのセキュリティを維持するためにアップグレードするリレーに依存する必要があるため、これはセキュリティモデルに違反します。したがって、開発者は、チェーンのアップグレードによってチェーン指定のパラメーターが変更されるたびに、クライアントがチェーン指定のパラメーターをアップグレードできるようにする必要があります(Tendermintクライアントの例には、 `UnbondingPeriod`、` ChainID`、 `UpgradePath`などが含まれます)。 `UpgradeClientMsg`を送信するリレーが、ユーザーが依存しているクライアントが選択したパラメーターを変更できないようにします(Tendermintクライアントの例には、` TrustingPeriod`、 `TrustLevel`、` MaxClockDrift`などがあります)。

```go
//Utility function that zeroes out any client customizable fields in client state
//Ledger enforced fields are maintained while all custom fields are zero values
//Used to verify upgrades
ZeroCustomFields() ClientState
```

カウンターパーティクライアントは、チェーンコミットされた `UpgradedClient`からチェーンで選択されたすべてのパラメータを使用し、古いクライアントで選択されたパラメータをすべて保持することで、安全にアップグレードできます。 これにより、チェーンは正直なリレーに依存せずに安全にアップグレードできますが、新しいチェーンで選択されたパラメーターが古いクライアントで選択されたパラメーターと衝突すると、場合によっては無効な最終的な `ClientState`につながる可能性があります。 これは、アップグレードチェーンが `UnbondingPeriod`(チェーン選択)をカウンターパーティクライアントの` TrustingPeriod`(クライアント選択)よりも短い期間に下げる場合に、Tendermintクライアントの場合に発生する可能性があります。 このようなケースは開発者が明確に文書化する必要があります。これにより、チェーンはこの問題を防ぐためにどのアップグレードを避けるべきかを知ることができます。 最終的にアップグレードされたクライアントは、クライアントが無効な `ClientState`にアップグレードされないことを確認するために、戻る前に` VerifyUpgradeAndUpdateState`で検証する必要があります。