# ADR 015:IBCパケットレシーバー

## 変更ログ

-2019年10月22日:初期ドラフト

## 環境
 
[ICS 26-ルーティングモジュール](https://github.com/cosmos/ibc/tree/master/spec/core/ics-026-routing-module)は関数[`handlePacketRecv`](https://github .com/cosmos/ibc/tree/master/spec/core/ics-026-routing-module#packet-relay)。

ICS 26では、ルーティングモジュールは各アプリケーションモジュールの上のレイヤーとして定義されています
これは、メッセージを検証して宛先モジュールにルーティングします。可能です
別のモジュールとして実装しますが、ルーティングする機能はすでにあります
baseappの宛先識別子に関するメッセージ。このADRは
既存の `baseapp.router`を利用してパケットをアプリケーションモジュールにルーティングします。

一般に、ルーティングモジュールのコールバックには2つの別々のステップがあります。
検証と実行。これは `AnteHandler`-`Handler`に対応します
SDK内のモデル。 `AnteHandler`内で検証を行うことができます
ボイラープレートを減らすことによって開発者の人間工学を向上させるために
検証コード。

アトミックマルチメッセージトランザクションの場合、IBC関連を維持したい
アプリケーション側の状態変更でも保持される状態変更
元に戻します。例の1つは、次のメッセージを送信するIBCトークンです。
前のパケットメッセージで受信したトークンを使用するステーク委任。
何らかの理由でトークンの受信に失敗した場合、保持したくない場合があります
トランザクションを実行しますが、トランザクションを中止したくありません
または、シーケンスとコミットメントが元に戻され、チャネルがスタックします。
このADRは、この問題を修正するための新しい `CodeType`、` CodeTxBreak`を提案します。

## 決断

`PortKeeper`には、
ポートにバインドされたチャネル。 `PortKeeper`を保持するエンティティは
のメソッドに対応するメソッドを呼び出すことができます
`ChannelKeeper`と同じ名前ですが、
許可されたポート。 `ChannelKeeper.Port(string、ChannelChecker)`は次のように定義されます
機能に安全な `PortKeeper`を簡単に構築できます。 これはで対処されます
別のADRであり、今のところ安全でない `ChannelKeeper`を使用します。

`baseapp.runMsgs`は、ハンドラーの1つがあれば、メッセージのループを中断します
`！Result.IsOK()`を返します。 ただし、外部ロジックはキャッシュされたものを書き込みます
`Result.IsOK()||の場合に保存 Result.Code.IsBreak() `。 `Result.Code.IsBreak()` if
`Result.Code == CodeTxBreak`。

```go
func (app *BaseApp) runTx(tx Tx) (result Result) {
  msgs := tx.GetMsgs()
  
 //AnteHandler
  if app.anteHandler != nil {
    anteCtx, msCache := app.cacheTxContext(ctx)
    newCtx, err := app.anteHandler(anteCtx, tx)
    if !newCtx.IsZero() {
      ctx = newCtx.WithMultiStore(ms)
    }

    if err != nil {
     //error handling logic
      return res
    }

    msCache.Write()
  }
  
 //Main Handler
  runMsgCtx, msCache := app.cacheTxContext(ctx)
  result = app.runMsgs(runMsgCtx, msgs)
 //BEGIN modification made in this ADR
  if result.IsOK() || result.IsBreak() {
 //END
    msCache.Write()
  }

  return result
}
```

Cosmos SDKは、IBCパケット受信用の `AnteDecorator`を定義します。 ザ
`AnteDecorator`は、トランザクションに含まれるメッセージを繰り返し処理し、次のように入力します
`switch`を使用して、メッセージに着信IBCパケットが含まれているかどうかを確認します。
Merkle証明を確認します。

```go
type ProofVerificationDecorator struct {
  clientKeeper ClientKeeper
  channelKeeper ChannelKeeper
}

func (pvr ProofVerificationDecorator) AnteHandle(ctx Context, tx Tx, simulate bool, next AnteHandler) (Context, error) {
  for _, msg := range tx.GetMsgs() {
    var err error
    switch msg := msg.(type) {
    case client.MsgUpdateClient:
      err = pvr.clientKeeper.UpdateClient(msg.ClientID, msg.Header)
    case channel.MsgPacket:
      err = pvr.channelKeeper.RecvPacket(msg.Packet, msg.Proofs, msg.ProofHeight)
    case chanel.MsgAcknowledgement:
      err = pvr.channelKeeper.AcknowledgementPacket(msg.Acknowledgement, msg.Proof, msg.ProofHeight)
    case channel.MsgTimeoutPacket:
      err = pvr.channelKeeper.TimeoutPacket(msg.Packet, msg.Proof, msg.ProofHeight, msg.NextSequenceRecv)
    case channel.MsgChannelOpenInit;
      err = pvr.channelKeeper.CheckOpen(msg.PortID, msg.ChannelID, msg.Channel)
    default:
      continue
    }

    if err != nil {
      return ctx, err
    }
  }
  
  return next(ctx, tx, simulate)
}
```

ここで、 `MsgUpdateClient`、` MsgPacket`、 `MsgAcknowledgement`、` MsgTimeoutPacket`
`sdk.Msg`タイプは` handleUpdateClient`、 `handleRecvPacket`、
ルーティングモジュールの `handleAcknowledgementPacket`、` handleTimeoutPacket`、
それぞれ。

`RecvPacket`、` VerifyAcknowledgement`の副作用
`VerifyTimeout`は別々の関数に抽出されます。
それぞれ `WriteAcknowledgement`、` DeleteCommitment`、 `DeleteCommitmentTimeout`、
これは、実行後にアプリケーションハンドラーによって呼び出されます。

`WriteAcknowledgement`は、次のような状態に確認応答を書き込みます。
カウンターパーティチェーンによって検証され、シーケンスをインクリメントして防止します
二重実行。 `DeleteCommitment`は、保存されているコミットメントを削除します。
`DeleteCommitmentTimeout`はコミットメントを削除し、万が一の場合にチャネルを閉じます
順序付けられたチャネルの。

```go
func (keeper ChannelKeeper) WriteAcknowledgement(ctx Context, packet Packet, ack []byte) {
  keeper.SetPacketAcknowledgement(ctx, packet.GetDestPort(), packet.GetDestChannel(), packet.GetSequence(), ack)
  keeper.SetNextSequenceRecv(ctx, packet.GetDestPort(), packet.GetDestChannel(), packet.GetSequence())
}

func (keeper ChannelKeeper) DeleteCommitment(ctx Context, packet Packet) {
  keeper.deletePacketCommitment(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetSequence())
}

func (keeper ChannelKeeper) DeleteCommitmentTimeout(ctx Context, packet Packet) {
  k.deletePacketCommitment(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetSequence())
  
  if channel.Ordering == types.ORDERED [
    channel.State = types.CLOSED
    k.SetChannel(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), channel)
  }
}
```

各アプリケーションハンドラーは、 `PortKeeper`でそれぞれのファイナライズメソッドを呼び出す必要があります
シーケンスを増やすため(パケットの場合)またはコミットメントを削除するため
(確認応答とタイムアウトの場合)。
これらの関数を呼び出すことは、アプリケーションロジックが正常に実行されたことを意味します。
ただし、ハンドラーは、これらのメソッドを呼び出した後、 `CodeTxBreak`で` Result`を返すことができます
これは、すでに行われた状態の変更を保持しますが、それ以上は防止します
意味的に無効なパケットの場合に実行されるメッセージ。これにより、シーケンスが保持されます
以前のIBCパケットで増加しました(したがって、二重実行を防止します)
次のメッセージに進みます。
いずれにせよ、アプリケーションモジュールは状態復帰の結果を決して返さないはずです。
これにより、チャネルを続行できなくなります。

`ChannelKeeper.CheckOpen`メソッドが導入されます。これは、定義された `onChanOpen *`を置き換えます
ルーティングモジュール仕様の下で。各チャネルハンドシェイクコールバックを定義する代わりに
関数、アプリケーションモジュールは `AppModule`で` ChannelChecker`関数を提供できます
これは、トップレベルアプリケーションの `ChannelKeeper.Port()`に挿入されます。
`CheckOpen`は、を使用して正しい` ChennelChecker`を見つけます。
`PortID`を呼び出して呼び出します。これは、アプリケーションで受け入れられない場合にエラーを返します。

`ProofVerificationDecorator`がトップレベルのアプリケーションに挿入されます。
各モジュールに証明検証を呼び出す責任を持たせることは安全ではありません
ロジック、アプリケーションは(IBCプロトコルの観点から)誤動作する可能性があります
間違い。

`ProofVerificationDecorator`は、デフォルトのシビル攻撃の直後に発生する必要があります
現在の `auth.NewAnteHandler`からの耐性レイヤー:

```go
//add IBC ProofVerificationDecorator to the Chain of
func NewAnteHandler(
  ak keeper.AccountKeeper, supplyKeeper types.SupplyKeeper, ibcKeeper ibc.Keeper,
  sigGasConsumer SignatureVerificationGasConsumer) sdk.AnteHandler {
  return sdk.ChainAnteDecorators(
    NewSetUpContextDecorator(),//outermost AnteDecorator. SetUpContext must be called first
    ...
    NewIncrementSequenceDecorator(ak),
    ibcante.ProofVerificationDecorator(ibcKeeper.ClientKeeper, ibcKeeper.ChannelKeeper),//innermost AnteDecorator
  )
}
```

このADRの実装により、タイプ `[] byte`の` Packet`の `Data`フィールドも作成されます。これは、受信モジュールによって独自のプライベートタイプに逆シリアル化できます。 IBCキーパーではなく、独自の解釈に従ってこれを行うのは、アプリケーションモジュール次第です。 これは動的IBCにとって非常に重要です。

アプリケーション側の使用例:

```go
type AppModule struct {}

//CheckChannel will be provided to the ChannelKeeper as ChannelKeeper.Port(module.CheckChannel)
func (module AppModule) CheckChannel(portID, channelID string, channel Channel) error {
  if channel.Ordering != UNORDERED {
    return ErrUncompatibleOrdering()
  }
  if channel.CounterpartyPort != "bank" {
    return ErrUncompatiblePort()
  }
  if channel.Version != "" {
    return ErrUncompatibleVersion()
  }
  return nil
}

func NewHandler(k Keeper) Handler {
  return func(ctx Context, msg Msg) Result {
    switch msg := msg.(type) {
    case MsgTransfer:
      return handleMsgTransfer(ctx, k, msg)
    case ibc.MsgPacket:
      var data PacketDataTransfer
      if err := types.ModuleCodec.UnmarshalBinaryBare(msg.GetData(), &data); err != nil {
        return err
      }
      return handlePacketDataTransfer(ctx, k, msg, data)
    case ibc.MsgTimeoutPacket:
      var data PacketDataTransfer
      if err := types.ModuleCodec.UnmarshalBinaryBare(msg.GetData(), &data); err != nil {
        return err
      }
      return handleTimeoutPacketDataTransfer(ctx, k, packet)
   //interface { PortID() string; ChannelID() string; Channel() ibc.Channel }
   //MsgChanInit, MsgChanTry implements ibc.MsgChannelOpen
    case ibc.MsgChannelOpen: 
      return handleMsgChannelOpen(ctx, k, msg)
    }
  }
}

func handleMsgTransfer(ctx Context, k Keeper, msg MsgTransfer) Result {
  err := k.SendTransfer(ctx,msg.PortID, msg.ChannelID, msg.Amount, msg.Sender, msg.Receiver)
  if err != nil {
    return sdk.ResultFromError(err)
  }

  return sdk.Result{}
}

func handlePacketDataTransfer(ctx Context, k Keeper, packet Packet, data PacketDataTransfer) Result {
  err := k.ReceiveTransfer(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetDestinationPort(), packet.GetDestinationChannel(), data)
  if err != nil {
   //TODO: Source chain sent invalid packet, shutdown channel
  }
  k.ChannelKeeper.WriteAcknowledgement([]byte{0x00})//WriteAcknowledgement increases the sequence, preventing double spending
  return sdk.Result{}
}

func handleCustomTimeoutPacket(ctx Context, k Keeper, packet CustomPacket) Result {
  err := k.RecoverTransfer(ctx, packet.GetSourcePort(), packet.GetSourceChannel(), packet.GetDestinationPort(), packet.GetDestinationChannel(), data)
  if err != nil {
   //This chain sent invalid packet or cannot recover the funds
    panic(err)
  }
  k.ChannelKeeper.DeleteCommitmentTimeout(ctx, packet)
 //packet timeout should not fail
  return sdk.Result{}
}

func handleMsgChannelOpen(sdk.Context, k Keeper, msg MsgOpenChannel) Result {
  k.AllocateEscrowAddress(ctx, msg.ChannelID())
  return sdk.Result{}
}
```

## 状態

提案

## 結果

### ポジティブ

-開発者向けの直感的なインターフェイス-IBCハンドラーはIBC認証を気にする必要はありません
-状態変更コミットメントロジックは `baseapp.runTx`ロジックに組み込まれています

### ネガティブ

-動的ポートをサポートできません。ルーティングはbaseappルーターに関連付けられています

### ニュートラル

-新しい `AnteHandler`デコレータを導入します。
-動的ポートは、階層ポート識別子を使用してサポートできます。詳細については、#5290を参照してください。

## 参照

-関連コメント:[cosmos/ics#289](https://github.com/cosmos/ics/issues/289#issuecomment-544533583)
-[ICS26-ルーティングモジュール](https://github.com/cosmos/ibc/tree/master/spec/core/ics-026-routing-module)