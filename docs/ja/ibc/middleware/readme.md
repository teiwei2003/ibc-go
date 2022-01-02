# IBCミドルウェア

独自のカスタムミドルウェアを作成してIBCアプリケーションをラップする方法を学び、さまざまなミドルウェアをIBCベースアプリケーションにフックしてさまざまなIBCアプリケーションスタックを形成する方法を理解します{synopsis}。

このドキュメントは、独自のミドルウェアを作成したいミドルウェア開発者、およびチェーンでIBCミドルウェアを使用したいチェーン開発者向けのガイドとして役立ちます。

IBCアプリケーションは、コアIBCハンドラーとの一連のインターフェイスを介して独自のアプリケーション固有のロジックを実装する自己完結型のモジュールとして設計されています。これらのコアIBCハンドラーは、すべてのアプリケーション固有の処理をIBCアプリケーションモジュールに委任しながら、IBCの正確性プロパティ(トランスポート、認証、順序付け)を適用するように設計されています。ただし、一部の機能が多くのアプリケーションで必要とされる場合がありますが、コアIBCに配置するのは適切ではありません。

ミドルウェアを使用すると、開発者は拡張機能を、ベースアプリケーションをラップできる個別のモジュールとして定義できます。したがって、このミドルウェアは独自のカスタムロジックを実行し、データをアプリケーションに渡して、ミドルウェアの存在を認識せずにロジックを実行できるようにします。これにより、アプリケーションとミドルウェアの両方が、単一のパケットフローの一部として実行できる一方で、独自の分離されたロジックを実装できます。

## 前提条件の測定値

-[IBCの概要](../overview.md){前提条件}
-[IBC統合](../integration.md){前提条件}
-[IBCアプリケーション開発者ガイド](../apps.md){前提条件}

## 定義

`ミドルウェア`:パケット実行中にコアIBCと基盤となるIBCアプリケーションの間に位置する自己完結型モジュール。コアIBCと基盤となるアプリケーション間のすべてのメッセージは、独自のカスタムロジックを実行する可能性のあるミドルウェアを経由する必要があります。

「基盤となるアプリケーション」:基盤となるアプリケーションは、問題のミドルウェアに直接接続されているアプリケーションです。この基盤となるアプリケーション自体が、ベースアプリケーションにチェーンされたミドルウェアである可能性があります。

`ベースアプリケーション`:ベースアプリケーションは、ミドルウェアを含まないIBCアプリケーションです。アプリケーションスタックを形成するために、0または複数のミドルウェアによってネストされる場合があります。

`アプリケーションスタック(またはスタック)`:スタックは、コアIBCに接続されるアプリケーションロジック(ミドルウェア+ベースアプリケーション)の完全なセットです。スタックは、単なるベースアプリケーションの場合もあれば、ベースアプリケーションをネストする一連のミドルウェアの場合もあります。

## カスタムIBCミドルウェアを作成する

IBCミドルウェアは、基盤となるIBCアプリケーションをラップオーバーし、コアIBCとアプリケーションの間に位置します。 IBCからアプリケーションに送信されるメッセージ、およびアプリケーションからコアIBCに送信されるメッセージを完全に制御できます。したがって、ミドルウェアは、それらを統合したいチェーン開発者によって完全に信頼されている必要がありますが、これにより、ラップするアプリケーションを変更する際の完全な柔軟性が得られます。

#### インターフェース

```go
//Middleware implements the ICS26 Module interface
type Middleware interface {
    porttypes.IBCModule//middleware has acccess to an underlying application which may be wrapped by more middleware
    ics4Wrapper: ICS4Wrapper//middleware has access to ICS4Wrapper which may be core IBC Channel Handler or a higher-level middleware that wraps this middleware.
}
```

```typescript
//This is implemented by ICS4 and all middleware that are wrapping base application.
//The base application will call `sendPacket` or `writeAcknowledgement` of the middleware directly above them
//which will call the next middleware until it reaches the core IBC handler.
type ICS4Wrapper interface {
    SendPacket(ctx sdk.Context, chanCap *capabilitytypes.Capability, packet exported.Packet) error
    WriteAcknowledgement(ctx sdk.Context, chanCap *capabilitytypes.Capability, packet exported.Packet, ack []byte) error
}
```

### `IBCModule`インターフェースとコールバックを実装する

IBCModuleは、ICS26Interface( `porttypes.IBCModule`)を実装する構造体です。これらのコールバックを別のファイル `ibc_module.go`に分割することをお勧めします。 [integration doc](./integration.md)で説明するように、この構造体は、ミドルウェアが独自の内部状態を維持し、個別のSDKメッセージを処理する場合に備えて、 `AppModule`を実装する構造体とは異なる必要があります。

ミドルウェアは、基盤となるアプリケーションにアクセスできる必要があり、すべてのICS-26コールバック中に前に呼び出される必要があります。これらのコールバック中にカスタムロジックを実行してから、基盤となるアプリケーションのコールバックを呼び出す場合があります。ミドルウェアは、基盤となるアプリケーションのコールバックをまったく呼び出さないことを選択する場合があります。ただし、これらは通常、エラーの場合に限定する必要があります。

IBCミドルウェアがカウンターパーティチェーン上の互換性のあるIBCミドルウェアと通信することを期待している場合。基盤となるアプリケーションのバージョンネゴシエーションに干渉することなく、チャネルハンドシェイクを使用してミドルウェアバージョンをネゴシエートする必要があります。

ミドルウェアは、バージョンを次の形式でフォーマットすることによってこれを実現します: `{mw-version}:{app-version}`。

ハンドシェイクコールバック中に、ミドルウェアはバージョンを `mw-version`、` app-version`に分割できます。 `mw-version`でネゴシエーションロジックを実行し、基盤となるアプリケーションに` app-version`を渡すことができます。

ミドルウェアは、ベースアプリケーションによって要求されるように、コールバック引数の機能を基盤となるアプリケーションに渡すだけで済みます。次に、ベースアプリケーションは、送信パケット/確認応答を認証するために、機能をスタックに渡します。

ミドルウェアが基盤となるアプリケーションの関与なしにパケットまたは確認応答を送信したい場合は、ミドルウェアがそれ自体で機能を取得できるように、ベースアプリケーションと同じ `scopedKeeper`へのアクセスを許可する必要があります。

### ハンドシェイクコールバック

```go
func (im IBCModule) OnChanOpenInit(ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID string,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    version string,
) error {
   //core/04-channel/types contains a helper function to split middleware and underlying app version
    middlewareVersion, appVersion = channeltypes.SplitChannelVersion(version)
    doCustomLogic()
    im.app.OnChanOpenInit(
        ctx,
        order,
        connectionHops,
        portID,
        channelID,
        channelCap,
        counterparty,
        appVersion,//note we only pass app version here
    )
}

func OnChanOpenTry(
    ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    counterpartyVersion string,
) (string, error) {
    doCustomLogic()

   //core/04-channel/types contains a helper function to split middleware and underlying app version
    cpMiddlewareVersion, cpAppVersion = channeltypes.SplitChannelVersion(counterpartyVersion)

   //call the underlying applications OnChanOpenTry callback
    appVersion, err := app.OnChanOpenTry(
        ctx,
        order,
        connectionHops,
        portID,
        channelID,
        channelCap,
        counterparty,
        cpAppVersion,//note we only pass counterparty app version here
    )
    if err != nil {
        return err
    }
    
    middlewareVersion := negotiateMiddlewareVersion(cpMiddlewareVersion)
    version := constructVersion(middlewareVersion, appVersion)

    return version
}

func OnChanOpenAck(
    ctx sdk.Context,
    portID,
    channelID string,
    counterpartyVersion string,
) error {
   //core/04-channel/types contains a helper function to split middleware and underlying app version
    middlewareVersion, appVersion = channeltypes.SplitChannelVersion(version)
    if !isCompatible(middlewareVersion) {
        return error
    }
    doCustomLogic()
      
   //call the underlying applications OnChanOpenTry callback
    app.OnChanOpenAck(ctx, portID, channelID, appVersion)
}

func OnChanOpenConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    doCustomLogic()

    app.OnChanOpenConfirm(ctx, portID, channelID)
}

OnChanCloseInit(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    doCustomLogic()

    app.OnChanCloseInit(ctx, portID, channelID)
}

OnChanCloseConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
    doCustomLogic()

    app.OnChanCloseConfirm(ctx, portID, channelID)
}
```

注:リモートスタック上のカウンターパーティミドルウェアとネゴシエートする必要のないミドルウェアは、バージョン分割とネゴシエーションを実装せず、カウンターパーティが同様に動作することに依存せずに、コールバックに対して独自のカスタムロジックを実行するだけです。

### パケットコールバック

ハンドシェイクコールバックと同じように、パケットコールバックはアプリケーションのパケットコールバックをラップします。 パケットコールバックは、ミドルウェアがカスタムロジックのほとんどを実行する場所です。 ミドルウェアは、パケットフローデータを読み取って追加のパケット処理を実行したり、基になるアプリケーションに到達する前に着信データを変更したりする場合があります。 これにより、トークン転送などの単純なベースアプリケーションをカスタムミドルウェアと組み合わせることでさまざまなユースケースに変換できるため、幅広いユースケースが可能になります。

```go
OnRecvPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) ibcexported.Acknowledgement {
    doCustomLogic(packet)

    ack := app.OnRecvPacket(ctx, packet)

    doCustomLogic(ack)//middleware may modify outgoing ack
    return ack
}

OnAcknowledgementPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    acknowledgement []byte,
) (*sdk.Result, error) {
    doCustomLogic(packet, ack)

    app.OnAcknowledgementPacket(ctx, packet, ack)
}

OnTimeoutPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) (*sdk.Result, error) {
    doCustomLogic(packet)

    app.OnTimeoutPacket(ctx, packet)
}
```

### ICS-4ラッパー

ミドルウェアは、アプリケーションからchannelKeeperへの通信が最初にミドルウェアを通過するように、ICS-4もラップする必要があります。 パケットコールバックと同様に、ミドルウェアは送信確認応答とパケットを任意の方法で変更できます。

```go
//only called for async acks
func WriteAcknowledgement(
  packet channeltypes.Packet,
  acknowledgement []bytes) {
   //middleware may modify acknowledgement
    ack_bytes = doCustomLogic(acknowledgement)

    return ics4Keeper.WriteAcknowledgement(packet, ack_bytes)
}

func SendPacket(appPacket channeltypes.Packet) {
   //middleware may modify packet
    packet = doCustomLogic(app_packet)

    return ics4Keeper.SendPacket(packet)
}
```
