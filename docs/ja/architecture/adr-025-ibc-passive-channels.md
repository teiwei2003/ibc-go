# ADR 025:IBCパッシブチャネル

## 変更ログ

--2021-04-23:ステータスを「非推奨」に変更
-2020-05-23:サンプルのGoコードと詳細を提供します
-2020-05-18:初期ドラフト

## 状態

*非推奨*

## 環境

現在の「ナイーブな」IBCRelayer戦略は、現在、2つのクライアント(それぞれが異なるチェーンの可能性がある)間の単一の接続の上に単一の事前定義されたIBCチャネルを確立します。次に、この戦略は、そのチャネルに一致する `send_packet`および` recv_packet`イベントを監視することによって中継されるパケットを検出し、それらのパケットを中継するために必要なトランザクションを送信します。

この「ナイーブ」戦略を、リレーする前に各チャネルを知る必要なしに、特定の接続でチャネルハンドシェイクメッセージとパケットの両方を検出してリレーする「パッシブ」戦略に拡張したいと考えています。

これを実現するために、 `x/ibc/core/04-channel/keeper/handshake.go`および` x/ibc/core/04-channelから送信された各トランザクションのチャネルメタデータを公開するために、より包括的なイベントを追加することを提案します。/keeper/packet.go`モジュール。

`ChanOpenInit`に含まれるものの例を次に示します。
```go
const (
  EventTypeChannelMeta = "channel_meta"
  AttributeKeyAction = "action"
  AttributeKeyHops = "hops"
  AttributeKeyOrder = "order"
  AttributeKeySrcPort = "src_port"
  AttributeKeySrcChannel = "src_channel"
  AttributeKeySrcVersion = "src_version"
  AttributeKeyDstPort = "dst_port"
  AttributeKeyDstChannel = "dst_channel"
  AttributeKeyDstVersion = "dst_version"
)
//...
 //Emit Event with Channel metadata for the relayer to pick up and
 //relay to the other chain
 //This appears immediately before the successful return statement.
  ctx.EventManager().EmitEvents(sdk.Events{
    sdk.NewEvent(
      types.EventTypeChannelMeta,
      sdk.NewAttribute(types.AttributeKeyAction, "open_init"),
      sdk.NewAttribute(types.AttributeKeySrcConnection, connectionHops[0]),
      sdk.NewAttribute(types.AttributeKeyHops, strings.Join(connectionHops, ",")),
      sdk.NewAttribute(types.AttributeKeyOrder, order.String()),
      sdk.NewAttribute(types.AttributeKeySrcPort, portID),
      sdk.NewAttribute(types.AttributeKeySrcChannel, chanenlID),
      sdk.NewAttribute(types.AttributeKeySrcVersion, version),
      sdk.NewAttribute(types.AttributeKeyDstPort, counterparty.GetPortID()),
      sdk.NewAttribute(types.AttributeKeyDstChannel, counterparty.GetChannelID()),
     //The destination version is not yet known, but a value is necessary to pad
     //the event attribute offsets
      sdk.NewAttribute(types.AttributeKeyDstVersion, ""),
    ),
  })
```

これらのメタデータイベントは、IBCチャネルハンドシェイクトランザクションをルーティングするために必要なすべての「ヘッダー」情報をキャプチャします。クライアントは、リレーする接続ID以外のデータをクエリする必要はありません。パッシブリレーが機能するためにインデックスを作成する必要がある唯一のイベントキーは、 `channel_meta.src_connection`であることが意図されています。

### チャネルのオープン試行の処理

パッシブリレーの場合、一方のチェーンが `ChanOpenInit`を送信すると、リレーはもう一方のチェーンにこのオープンの試みを通知し、そのチェーンがハンドシェイクを続行する方法(および継続するかどうか)を決定できるようにする必要があります。両方のチェーンがチャネルの開始をアクティブに承認すると、現在の「ナイーブ」リレーの場合と同様に、残りのハンドシェイクが発生する可能性があります。

この動作を実装するには、 `cbs.OnChanOpenTry`コールバックを新しい` cbs.OnAttemptChanOpenTry`コールバックに置き換えることを提案します。このコールバックは、通常は `keeper.ChanOpenTry`を呼び出すことにより、` MsgChannelOpenTry`を明示的に処理します。 `x/ibc-transfer/module.go`の一般的な実装は、次のように現在の「ナイーブ」リレーと互換性があります。

```go
func (am AppModule) OnAttemptChanOpenTry(
  ctx sdk.Context,
  chanKeeper channel.Keeper,
  portCap *capability.Capability,
  msg channel.MsgChannelOpenTry,
) (*sdk.Result, error) {
 //Require portID is the portID transfer module is bound to
  boundPort := am.keeper.GetPort(ctx)
  if boundPort != msg.PortID {
    return nil, sdkerrors.Wrapf(porttypes.ErrInvalidPort, "invalid port: %s, expected %s", msg.PortID, boundPort)
  }

 //BEGIN NEW CODE
 //Assert our protocol version, overriding the relayer's suggestion.
  msg.Version = types.Version
 //Continue the ChanOpenTry.
  res, chanCap, err := channel.HandleMsgChannelOpenTry(ctx, chanKeeper, portCap, msg)
  if err != nil {
    return nil, err
  }
 //END OF NEW CODE

 //... the rest of the callback is similar to the existing OnChanOpenTry
 //but uses msg.* directly.
```

`x/ibc/handler.go`の実装で、このコールバックがどのように使用されるかを次に示します。

```go
//...
    case channel.MsgChannelOpenTry:
     //Lookup module by port capability
      module, portCap, err := k.PortKeeper.LookupModuleByPort(ctx, msg.PortID)
      if err != nil {
        return nil, sdkerrors.Wrap(err, "could not retrieve module from port-id")
      }
     //Retrieve callbacks from router
      cbs, ok := k.Router.GetRoute(module)
      if !ok {
        return nil, sdkerrors.Wrapf(port.ErrInvalidRoute, "route not found to module: %s", module)
      }
     //Delegate to the module's OnAttemptChanOpenTry.
      return cbs.OnAttemptChanOpenTry(ctx, k.ChannelKeeper, portCap, msg)
```

`x/ibc/handler.go`とポートのモジュール(バージョンを明示的にネゴシエートするなど)の間に、より構造化された相互作用がない理由は、アプリモジュールが`の処理を終了する必要があることを制約したくないためです。このトランザクション中またはこのブロック中のMsgChannelOpenTry`。

## 決断

-イベントを公開して、「パッシブ」接続リレーを許可します。
-このようなパッシブリレーを介してアプリケーションが開始するチャネルを有効にします。
-ポートモジュールがオープントライメッセージの処理方法を制御できるようにします。

## 結果

### ポジティブ

チャネルを完全なアプリケーションレベルの抽象化にします。

アプリケーションは、中継者がいつそうするかを指示することを期待するのではなく、チャネルの開始と受け入れを完全に制御できます。

パッシブリレーは、アプリケーションがサポートするチャネルの種類(バージョン文字列、順序の制約、ファイアウォールロジック)を知る必要はありません。これらは、アプリケーション間で直接ネゴシエートされます。

### ネガティブ

IBCメッセージのイベントサイズが増加しました。

### ニュートラル

より多くのIBCイベントが公開されます。

## 参照

-Agoric VMのIBCハンドラーは現在[`attemptChanOpenTry`に対応](https://github.com/Agoric/agoric-sdk/blob/904b3a0423222a1b32893453e44bbde598473960/packages/cosmic-swingset/lib/ag-solo/vats/ibc.js# L546)