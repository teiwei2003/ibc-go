# ロードマップibc-go

_最新の更新:2021年12月22日_

このドキュメントは、InterchainGmbHのチームによるibc-gobytでの作業の計画と優先順位について、より広いIBCコミュニティに通知するように努めています。これは、IBC、リレー、チェーン、ウォレットアプリケーションの開発者やオペレーターを含む、ibc-goのすべてのユーザーに広く通知することを目的としています。

このロードマップは、スケジュールや成果物への取り組みではなく、高レベルのガイドとして読む必要があります。特異性の程度は、タイムラインに反比例します。このドキュメントは、ステータスと計画を反映するために定期的に更新されます。

リリースタグとタイムラインは、このドキュメントを更新した時点で手元にある情報に基づいた知識に基づいた推測です。最終的なバージョン番号(特にマイナー番号とパッチ番号)を予測するのは難しい場合があるため(予期しないセキュリティ脆弱性パッチまたは緊急のバグ修正をリリースする必要がある場合があるため)、プレースホルダーとしてアルファベットを使用しています。リリース日に近づくと、プレースホルダーは正しい番号に置き換えられます。明確化の例...

計画されているリリーススケジュールが次のようになっていると仮定します。
-時間 `t0`:
  -リリースタグ `v2.0.a`が付いた` v2.0.x`リリースシリーズの最初のパッチリリース。これは最初のパッチリリースであるため、プレースホルダーは「a」です。
  -リリースタグ `v2.a.0`が付いた` v2.x`リリースシリーズの最初のマイナーリリース。これは最初のマイナーリリースであるため、プレースホルダーは `a`です。
-時間 `t0 + delta`:
  -リリースタグ `v2.0.b`が付いた` v2.0.x`リリースシリーズの2番目のパッチリリース。これは `v2.0.a`に続くこのリリースシリーズの次のパッチリリースであるため、プレースホーダーは` b`です。
  -リリースタグ `v2.a.a`が付いた新しい` v2.a.x`リリースシリーズの最初のパッチリリース。これはシリーズの最初のパッチリリースであるため、パッチバージョンのプレースホルダーは `a`です。

## Q4 - 2021

### チェーン間アカウント

-内部監査中に提起された問題を確定します。
-2つの外部監査用のコードベースと仕様を準備します。
-開発者向けドキュメントを作成します。
-エルメスリレーとの統合およびエンド2エンドテスト。
-アルファリリースを作成します。

### リレイヤーのインセンティブ

-実装を完了します。
-仕様を更新し、ドキュメントを作成します。
-内部監査を行い、発生する可能性のある問題を記述します。

### 実装をICS02に合わせる

ibc-goの実装を[ICS02](https://github.com/cosmos/ibc/tree/master/spec/core/ics-002-client-semantics)と一致させるように取り組みます:[#284] (https://github.com/cosmos/ibc-go/issues/284)、[#285](https://github.com/cosmos/ibc-go/issues/285)、[#286](https ://github.com/cosmos/ibc-go/issues/286)、[#594](https://github.com/cosmos/ibc-go/issues/594)および[#599](https://github.com/cosmos/ibc-go/issues/599)。 Wasmベースのライトクライアントのサポートもこれらの問題に依存しています。

### リリーススケジュール

|Release|Milestone|Date|
|-------|---------|----|
|[`v1.1.0`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.1)||Oct 04, 2021|
|[`v1.2.1`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.1)||Oct 04, 2021|
|[`v2.0.0-rc0`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.0-rc0)|[Link](https://github.com/cosmos/ibc-go/milestone/3)|Oct 05, 2021|
|[`v1.1.2`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.2)||Oct 15, 2021|
|[`v1.2.2`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.2)||Oct 15, 2021|
|[`v1.1.3`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.3)||Nov 09, 2021|
|[`v1.2.3`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.3)||Nov 09, 2021|
|[`v2.0.0`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.0)|[Link](https://github.com/cosmos/ibc-go/milestone/3)|Nov 09, 2021|
|[`v1.1.4`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.5)||Dec 06, 2021|
|[`v1.2.4`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.4)||Dec 06, 2021|
|[`v2.0.1`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.1)|[Link](https://github.com/cosmos/ibc-go/milestone/11)|Dec 06, 2021|
|[`v1.1.5`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.5)||Dec 15, 2021|
|[`v1.2.5`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.5)||Dec 15, 2021|
|[`v2.0.2`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.2)|[Link](https://github.com/cosmos/ibc-go/milestone/20)|Dec 15, 2021|
|[`v3.0.0-alpha1`](https://github.com/cosmos/ibc-go/releases/tag/v3.0.0-alpha1)|[Link](https://github.com/cosmos/ibc-go/milestone/12)|Dec 21, 2021|

## 第1四半期-2022年

### チェーン間アカウント

-2つの外部監査から生じる可能性のある問題に取り組みます。
-ベータ版を作成し、候補と最終リリースをリリースします。

### リレイヤーのインセンティブ

-内部監査から生じる可能性のある問題に取り組みます。
-外部監査(リリース前に取り組む必要のある問題が発生する可能性があります)。
-アルファ、ベータ、リリース候補、および最終リリースを作成します。

### Wasmベースのライトクライアントのサポート

Wasmベースのライトクライアントのサポートを実装するオープンな[PR](https://github.com/cosmos/ibc-go/pull/208)がありますが、[ICS28]の完成後に更新する必要があります。 (https://github.com/cosmos/ibc/tree/master/spec/client/ics-008-wasm-client)仕様。 PRには、ibc-goコアチームメンバーによる最終レビューも必要です。
 
### 実装をICS02に合わせる

-作業の完了:[#284](https://github.com/cosmos/ibc-go/issues/284)、[#285](https://github.com/cosmos/ibc-go/issues/285)、[#286](https://github.com/cosmos/ibc-go/issues/286)、[#594](https://github.com/cosmos/ibc-go/issues/594)および[#599](https://github.com/cosmos/ibc-go/issues/599)。

### チェーン間セキュリティ

-[V1]のテストネットテスト(https://github.com/cosmos/gaia/blob/main/docs/interchain-security.md#v1---full-validator-set)。

### バックログの問題

-[#545](https://github.com/cosmos/ibc-go/issues/545):ICS20転送モジュールアカウントを使用しないため、 `GetTransferAccount`関数を削除します(すべてのエスクローアドレスは通常のアドレスとして作成されます)アカウント)。
-[#559](https://github.com/cosmos/ibc-go/issues/559):SMTストレージへの移行をサポートするために必要な変更。これは基本的に、SMTに移行したチェーンとの接続ハンドシェイク中に使用される新しいプルーフ仕様を追加して、カウンターパーティチェーンのライトクライアントが正しいプルーフ仕様を使用してそのチェーンのプルーフを検証できることを確認します。
-そして、後で追加される予定です！

### リリーススケジュール

#### H1 January

- [`v3.0.0-beta`](https://github.com/cosmos/ibc-go/milestone/12): Beta release of `v3.0.0` including Interchain Accounts, an update of Golang from `v1.15` to `v1.17`, and some core improvements. This is a Go-API breaking change because of [#472](https://github.com/cosmos/ibc-go/issues/472).

#### H2 January

- [`v2.0.a`](https://github.com/cosmos/ibc-go/milestone/14)
- [`v3.0.0-rc0`](https://github.com/cosmos/ibc-go/milestone/12): Release candidate 0 of `v3.0.0` including Interchain Accounts, an update of Golang from `v1.15` to `v1.17`, and some core improvements. This is a Go-API breaking change because of [#472](https://github.com/cosmos/ibc-go/issues/472).
- [`v4.0.0-alpha`](https://github.com/cosmos/ibc-go/milestone/16): Alpha release of `v4.0.0` including Relayer Incentivisation and the issues to bring ibc-go implementation in line with ICS02 (which are Go-API breaking changes). This release will include fixes to issues that surfaced during internal audit.

#### H1 February

- [`v3.0.0`](https://github.com/cosmos/ibc-go/milestone/12): Final release of `v3.0.0` including Interchain Accounts, an update of Golang from `v1.15` to `v1.17`, and some core improvements. This is a Go-API breaking change because of [#472](https://github.com/cosmos/ibc-go/issues/472).

#### H2 February

- [`v4.0.0-beta`](https://github.com/cosmos/ibc-go/milestone/16): Beta release of `v4.0.0` including Relayer Incentivisation and the issues to bring ibc-go implementation in line with ICS02 (which are Go-API breaking changes). This release will include fixes to issues that surfaced during external audit.

#### H1 March

- [`v4.0.0-rc0`](https://github.com/cosmos/ibc-go/milestone/16): Release candidate 0 of `v4.0.0` including Relayer Incentivisation and the issues to bring ibc-go implementation in line with ICS02 (which are Go-API breaking changes).

#### H2 March

- [`v4.0.0`](https://github.com/cosmos/ibc-go/milestone/16): Final release of `v4.0.0` including Relayer Incentivisation and the issues to bring ibc-go implementation in line with ICS02 (which are Go-API breaking changes).
- [`v1.a.0`](https://github.com/cosmos/ibc-go/milestone/17): Minor release in `v1.x` seires including the update of Cosmos SDK to [`v0.45`](https://github.com/cosmos/cosmos-sdk/milestone/46) and Tendermint to [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0.35.0).
- [`v2.a.0`](https://github.com/cosmos/ibc-go/milestone/18): Minor release in `v2.x` series including the update of Cosmos SDK to [`v0.45`](https://github.com/cosmos/cosmos-sdk/milestone/46) and Tendermint to [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0.35.0).
- [`v3.a.0`](https://github.com/cosmos/ibc-go/milestone/19): Minor release in `v3.x` series including the update of Cosmos SDK to [v0.45](https://github.com/cosmos/cosmos-sdk/milestone/46) and Tendermint to [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0.35.0).
- [`v4.a.0`](https://github.com/cosmos/ibc-go/milestone/22): Minor release in `v4.x` series including the update of Cosmos SDK to [`v0.45`](https://github.com/cosmos/cosmos-sdk/milestone/46) and Tendermint to [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0.35.0).

## Q2 - 2022

Scope is still TBD.

### Release schedule

#### H1 April

- [`v5.0.0-rc0`](https://github.com/cosmos/ibc-go/milestone/21): Release candidate that includes the update of Cosmos SDK from `v0.45` to [`v1.0`](https://github.com/cosmos/cosmos-sdk/milestone/52) and that will support the migration to SMT storage.

#### H2 April

- [`v5.0.0`](https://github.com/cosmos/ibc-go/milestone/21): Final release that includes the update of Cosmos SDK from `v0.45` to [v1.0](https://github.com/cosmos/cosmos-sdk/milestone/52) and that will support the migration to SMT storage.