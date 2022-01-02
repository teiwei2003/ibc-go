# ibc-goへの移行

このファイルには、SDK 0.41.xおよび0.42.x行に含まれるIBCモジュールから、0.44SDKバージョンに基づくibc-goリポジトリのIBCモジュールに移行する方法に関する情報が含まれています。

## 変更をインポート

最も明白な変更は、インポート名の変更です。 変更する必要があります:
-アプリケーション->アプリ
--cosmos-sdk/x/ibc-> ibc-go

私のGNU/Linuxベースのマシンでは、次のコマンドを順番に実行して使用しました。

```
grep -RiIl 'cosmos-sdk\/x\/ibc\/applications' | xargs sed -i 's/cosmos-sdk\/x\/ibc\/applications/ibc-go\/modules\/apps/g'
```

```
grep -RiIl 'cosmos-sdk\/x\/ibc' | xargs sed -i 's/cosmos-sdk\/x\/ibc/ibc-go\/modules/g'
```

参照:[上記のコマンドの説明](https://www.internalpointers.com/post/linux-find-and-replace-text-multiple-files)

これらのコマンドを順不同で実行すると、問題が発生します。

インポート名を変更するには、独自の方法を自由に使用してください。

注: `v0.44.0` SDKリリースに更新してから、` go mod tidy`を実行すると、古いIBCインポートパスをサポートするために `v0.42.0`にダウングレードされます。
`go mod tidy`を実行する前に、インポートパスを更新してください。

## チェーンのアップグレード

チェーンは、アップグレード提案またはジェネシスアップグレードを介してアップグレードすることを選択できます。インプレースストア移行とジェネシス移行の両方がサポートされています。

**警告**:チェーンをアップグレードする前に、少なくとも[IBCクライアントのアップグレード](../ibc/upgrades/README.md)のクイックガイドをお読みください。アップグレード中にチェーンIDを変更しないことを強くお勧めします。変更しない場合は、IBCクライアントのアップグレード手順に従う必要があります。

インプレースストア移行とジェネシス移行の両方が次のようになります。
-ソロマシンのクライアント状態をv1からv2のprotobuf定義に移行します
-すべてのソロマシンのコンセンサス状態を整理します
-期限切れのテンダーミントコンセンサス状態をすべて削除します

チェーンは、インプレースストアの移行またはジェネシスの移行中に新しい接続パラメーターを設定する必要があります。新しいパラメータである最大予想ブロック時間は、IBCパケットフローの受信側でパケット処理の遅延を強制するために使用されます。詳細については、[docs](https://github.com/cosmos/ibc-go/blob/release/v1.0.x/docs/ibc/proto-docs.md#params-2)を確認してください。

### インプレースストアの移行

新しいチェーンバイナリは、アップグレードハンドラーで移行を実行する必要があります。 IBCモジュールのfromVM(以前のモジュールバージョン)は1である必要があります。これにより、バージョンを1から2に更新するIBCの移行を実行できます。

Ex:
```go
app.UpgradeKeeper.SetUpgradeHandler("my-upgrade-proposal",
        func(ctx sdk.Context, _ upgradetypes.Plan, _ module.VersionMap) (module.VersionMap, error) {
           //set max expected block time parameter. Replace the default with your expected value
           //https://github.com/cosmos/ibc-go/blob/release/v1.0.x/docs/ibc/proto-docs.md#params-2
            app.IBCKeeper.ConnectionKeeper.SetParams(ctx, ibcconnectiontypes.DefaultParams())

            fromVM := map[string]uint64{
                ...//other modules
                "ibc":          1,
                ... 
            }   
            return app.mm.RunMigrations(ctx, app.configurator, fromVM)
        })      

```

### Genesis Migrations

ジェネシス移行を実行するには、既存の移行コードに次のコードを追加する必要があります。

```go
//add imports as necessary
import (
    ibcv100 "github.com/cosmos/ibc-go/modules/core/legacy/v100"
    ibchost "github.com/cosmos/ibc-go/modules/core/24-host"
)

...

//add in migrate cmd function
//expectedTimePerBlock is a new connection parameter
//https://github.com/cosmos/ibc-go/blob/release/v1.0.x/docs/ibc/proto-docs.md#params-2
newGenState, err = ibcv100.MigrateGenesis(newGenState, clientCtx, *genDoc, expectedTimePerBlock)
if err != nil {
    return err 
}
```

**注:** IBCを移行する前に、ジェネシスチェーンID、時間、および高さを更新する必要があります。更新しないと、テンダーミントのコンセンサス状態が削除されません。


## IBCキーパーの変更

IBCキーパーがアップグレードキーパーを取り込むようになりました。 ステーキングキーパーの後にチェーンのアップグレードキーパーを追加してください。

```diff
       //Create IBC Keeper
        app.IBCKeeper = ibckeeper.NewKeeper(
-               appCodec, keys[ibchost.StoreKey], app.GetSubspace(ibchost.ModuleName), app.StakingKeeper, scopedIBCKeeper,
+               appCodec, keys[ibchost.StoreKey], app.GetSubspace(ibchost.ModuleName), app.StakingKeeper, app.UpgradeKeeper, scopedIBCKeeper,
        )

``` 

## 提案

### UpdateClientProposal

`UpdateClient`は、2つのクライアント識別子と1つの初期の高さを取り込むように変更されました。 詳細については、[ドキュメント](../ibc/proposals.md)を参照してください。

### UpgradeProposal

新しいIBCプロポーザルタイプ `UpgradeProposal`が追加されました。 これは、IBC(破壊)アップグレードを処理します。
アップグレード `プラン`の以前の `UpgradedClientState`フィールドは廃止され、この新しいプロポーザルタイプが採用されました。

### プロポーザルハンドラーの登録

`ClientUpdateProposalHandler`は` ClientProposalHandler`に名前が変更されました。
`UpdateClientProposal`と` UpgradeProposal`の両方を処理します。

このインポートを追加します:

```diff
+       ibcclienttypes "github.com/cosmos/ibc-go/modules/core/02-client/types"
```

ガバナンスモジュールが正しいルートを追加していることを確認してください。

```diff
-               AddRoute(ibchost.RouterKey, ibcclient.NewClientUpdateProposalHandler(app.IBCKeeper.ClientKeeper))
+               AddRoute(ibcclienttypes.RouterKey, ibcclient.NewClientProposalHandler(app.IBCKeeper.ClientKeeper))
```

注:Simappの登録は、0.41.xリリースでは正しくありませんでした。 `UpdateClient`プロポーザルハンドラーは、` ibc-go/core/02-client/types`に属するルーターキーで登録する必要があります
上記のdiffに示されているように。

### 提案CLI登録

次の引数を `gov.NewAppModuleBasic()`に追加して、両方のプロポーザルタイプのCLIコマンドがガバナンスモジュールに登録されていることを確認してください。

次のインポートを追加します。
```diff
+       ibcclientclient "github.com/cosmos/ibc-go/modules/core/02-client/client"
```

Register the cli commands: 

```diff 
       gov.NewAppModuleBasic(
             paramsclient.ProposalHandler, distrclient.ProposalHandler, upgradeclient.ProposalHandler, upgradeclient.CancelProposalHandler,
+            ibcclientclient.UpdateClientProposalHandler, ibcclientclient.UpgradeProposalHandler,
       ),
```

これらの提案では、RESTルートはサポートされていません。

## プロトファイルの変更

gRPCクエリアサービスエンドポイントがわずかに変更されました。以前のファイルは `v1beta1` gRPCルートを使用していましたが、これは` v1`に更新されました。

ソロマシンは、FrozenSequenceuint64フィールドをIsFrozenブールフィールドに置き換えました。パッケージは `v1`から` v2`にバンプされました

## IBCコールバックの変更

### OnRecvPacket

アプリケーション開発者は、 `OnRecvPacket`コールバックロジックを更新する必要があります。

`OnRecvPacket`コールバックは、確認応答のみを返すように変更されました。返される確認応答は、 `Acknowledgement`インターフェースを実装する必要があります。確認応答は、 `Success()`でtrueを返し、それ以外の場合はfalseを返すことで、パケットの処理が成功したかどうかを示す必要があります。 `Success()`の戻り値がfalseの場合、コールバックで発生したすべての状態変化が破棄されます。詳細については、[ドキュメント](https://github.com/cosmos/ibc-go/blob/main/docs/ibc/apps.md#receiveing-packets)をご覧ください。

`OnRecvPacket`、` OnAcknowledgementPacket`、および `OnTimeoutPacket`コールバックは、IBCパケットを中継した中継者の` sdk.AccAddress`に渡されるようになりました。アプリケーションはこの情報を使用または無視する場合があります。

## IBCイベントの変更

イベントでのパケットデータの標準化されたエンコーディング/デコーディングを提供するために、 `packet_data`属性は廃止されて` packet_data_hex`になりました。 `packet_data`イベントはまだ存在しますが、すべての中継者とIBCイベントの利用者は、できるだけ早く` packet_data_hex`の使用に切り替えることを強くお勧めします。

上記と同じ理由で、 `packet_ack`属性も廃止されて` packet_ack_hex`になりました。すべての中継者とIBCイベントの利用者は、できるだけ早く `packet_ack_hex`の使用に切り替えることを強くお勧めします。

`consensus_height`属性は、発行されたMisbehaviorイベントで削除されました。 IBCクライアントの高さは固定されなくなり、誤動作には必ずしも関連する高さがありません。

## 関連するSDKの変更

*(コーデック)[\#9226](https://github.com/cosmos/cosmos-sdk/pull/9226)一般的なGoインターフェースに従うように、コーデックインターフェースとメソッドの名前を変更します。
  * `codec.Marshaler`→` codec.Codec`(これは他のオブジェクトをシリアル化するオブジェクトを定義します)
  * `codec.BinaryMarshaler`→` codec.BinaryCodec`
  * `codec.JSONMarshaler`→` codec.JSONCodec`
  * `BinaryCodec`メソッドから` BinaryBare`サフィックスを削除しました( `MarshalBinaryBare`、` UnmarshalBinaryBare`、...)
  * `BinaryCodec`メソッドから` Binary`インフィックスを削除しました( `MarshalBinaryLengthPrefixed`、` UnmarshalBinaryLengthPrefixed`、...)