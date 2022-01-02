# ibc-gov1からv2への移行

このドキュメントは、CHANGELOGに示されているよりも多くの情報を必要とする可能性のある重要な変更を強調することを目的としています。
ibc-goのユーザーが行う必要のある変更は、ここに文書化する必要があります。

このドキュメントの4つの潜在的なユーザーグループに基づいて、4つのセクションがあります。
-チェーン
-IBCアプリ
-中継器
-IBCライトクライアント

**注:** ibc-goはgolangセマンティックバージョニングをサポートしているため、メジャーリリースでバージョン番号を上げるには、すべてのインポートを更新する必要があります。
```go
github.com/cosmos/ibc-go -> github.com/cosmos/ibc-go/v2
```

## チェーン

-このリリースでは、関連する変更は行われませんでした。

## IBCアプリ

新しい機能がアプリモジュールインターフェースに追加されました:
```go
//NegotiateAppVersion performs application version negotiation given the provided channel ordering, connectionID, portID, counterparty and proposed version.
   //An error is returned if version negotiation cannot be performed. For example, an application module implementing this interface
   //may decide to return an error in the event of the proposed version being incompatible with it's own
    NegotiateAppVersion(
        ctx sdk.Context,
        order channeltypes.Order,
        connectionID string,
        portID string,
        counterparty channeltypes.Counterparty,
        proposedVersion string,
    ) (version string, err error)
}
```

この関数は、アプリケーションバージョンのネゴシエーションを実行し、ネゴシエートされたバージョンを返す必要があります。 バージョンをネゴシエートできない場合は、エラーが返されます。 この関数は、クライアント側でのみ使用されます。

#### sdk.Resultが削除されました

sdk.Resultは、アプリケーションコールバックの戻り値として削除されました。 以前は、コアIBCによって破棄されていたため、使用されていませんでした。

## 中継器

新しいgRPCが05ポートの `AppVersion`に追加されました。 ネゴシエートされたアプリのバージョンを返します。 この関数は、チャネルに設定する必要があるアプリケーションのバージョンを決定するための `ChanOpenTry`チャネルハンドシェイクステップに使用する必要があります。

## IBCライトクライアント

-このリリースでは、関連する変更は行われませんでした。