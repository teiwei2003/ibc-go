### IBCクライアントの最新のアップグレード

ジェネシスの再起動を使用して、IBCクライアントを壊すアップグレードが可能です。
ジェネシスの再開ではなく、インプレース移行を使用することを強くお勧めします。
Genesisの再起動は、慎重に、バックアップ計画として使用する必要があります。

Genesisの再起動では、カウンターパーティクライアントを正しくアップグレードするために、IBCアップグレードプロポーザルを使用する必要があります。

#### SDKチェーンの段階的なアップグレードプロセス

IBCに接続されたチェーンが、カウンターパーティクライアントを破壊するアップグレードを実行している場合は、[IBCクライアント破壊アップグレードリスト](https://github.com/cosmos/ibc-go)を使用して、アップグレードが最初にIBCによってサポートされていることを確認する必要があります。/blob/main/docs/ibc/upgrades/quick-guide.md#ibc-client-breaking-upgrades)次に、カウンターパーティクライアントの破損を防ぐために、以下で説明するアップグレードプロセスを実行します。

1. `UpgradePlan`と`UpgradedClientState`フィールドの新しいIBCClientState。 `UpgradePlan`はアップグレードの高さを**のみ**(アップグレード時間なし)指定する必要があり、` ClientState`にはすべての有効なクライアントに共通のフィールドのみを含め、クライアントがカスタマイズ可能なフィールド(TrustingPeriodなど)をゼロにする必要があることに注意してください。 。
2.投票して、 `UpgradeProposal`に合格します
3.アップグレードが成功したら、ノードを停止します。
4.ジェネシスファイルをエクスポートします。
5.新しいバイナリにスワップします。
6.ジェネシスファイルで移行を実行します。
7.ジェネシスファイルから `UpgradeProposal`プランを削除します。これは、移行によって実行される場合があります。
8.必要なチェーン固有のフィールド(チェーンID、非結合期間など)を変更します。これは、移行によって実行される場合があります。
8.ノードのデータをリセットします。
9.チェーンを開始します。

`UpgradeProposal`が渡されると、アップグレードモジュールはキーの下でUpgradedClientをコミットします:` upgrade/UpgradedIBCState/{upgradeHeight}/upgradedClient`。アップグレードの高さの直前のブロックで、アップグレードモジュールは、キーの下にある次のチェーンの初期コンセンサス状態もコミットします: `upgrade/UpgradedIBCState/{upgradeHeight}/upgradedConsState`。

チェーンがアップグレードの高さに達して停止すると、リレーはカウンターパーティクライアントを古いチェーンの最後のブロックにアップグレードできます。次に、この最後のブロックに対して `UpgradedClient`と` UpgradedConsensusState`の証明を提出し、カウンターパーティクライアントをアップグレードできます。

#### 中継者がカウンターパーティクライアントをアップグレードするための段階的なアップグレードプロセス

これらの手順は、通常の[IBCクライアントブレーキングアップグレードプロセス](https://github.com/cosmos/ibc-go/blob/main/docs/ibc/upgrades/quick-guide.md#step-by-step)と同じです。 -upgrade-process-for-relayers-upgrading-counterparty-clients)。

### 非IBCクライアントの最新のアップグレード

ibc-goは、IBCクライアントを壊さないジェネシスの再起動をサポートしますが、リレーはこのアップグレードパスをサポートしません。
これが[Hermes](https://github.com/informalsystems/ibc-rs/issues/1152)の追跡の問題です。
カウンターパーティクライアントを正しく更新するツールがない限り、定期的なジェネシスの再起動を試みないでください。



