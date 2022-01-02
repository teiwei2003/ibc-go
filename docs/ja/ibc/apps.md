# IBCアプリケーション

IBCを使用し、データパケットを他のチェーンに送信するようにアプリケーションを構成する方法を学びます。 {synopsis}

このドキュメントは、独自のブロック間チェーンを作成したい開発者向けのガイドとして役立ちます
カスタムユースケース用の通信プロトコル(IBC)アプリケーション。

IBCプロトコルのモジュラー設計により、IBC
アプリケーション開発者は、クライアントの低レベルの詳細に気を配る必要はありません。
接続、および証明の検証。それにもかかわらず、より低いレベルの簡単な説明
スタックは、アプリケーション開発者がIBCを高レベルで理解できるようにするために提供されています。
プロトコル。次に、ドキュメントは、アプリケーションに最も関連する抽象化レイヤーで詳細に説明されます
開発者(チャネルとポート)、および独自のカスタムパケットを定義する方法について説明します。
`IBCModule`コールバック。

モジュールがIBCを介して相互作用するようにするには、次のことを行う必要があります。ポートにバインドし、独自のパケットデータとacknolwedgement構造体、およびそれらをエンコード/デコードする方法を定義し、
`IBCModule`インターフェース。以下は、IBCアプリケーションの作成方法の詳細な説明です。
モジュールを正しく。

## 前提条件の測定値

-[IBCの概要](。/overlay.md)){前提条件}
-[IBCのデフォルトの統合](./integration.md){前提条件}

##カスタムIBCアプリケーションモジュールを作成する

### `IBCModule`インターフェースとコールバックを実装する

Cosmos SDKは、すべてのIBCモジュールが[`IBCModule`を実装することを想定しています。
インターフェイス](https://github.com/cosmos/ibc-go/tree/main/modules/core/05-port/types/module.go)。この
インターフェイスには、IBCがモジュールに実装することを期待するすべてのコールバックが含まれています。このセクションでは、
チャネルハンドシェイクの実行中に呼び出されるコールバック。

モジュールが実装することが期待されるチャネルハンドシェイクコールバックは次のとおりです。

```go
//Called by IBC Handler on MsgOpenInit
func (k Keeper) OnChanOpenInit(ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID string,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    version string,
) error {
   //OpenInit must claim the channelCapability that IBC passes into the callback
    if err := k.ClaimCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
			return err
	}

   //... do custom initialization logic

   //Use above arguments to determine if we want to abort handshake
   //Examples: Abort if order == UNORDERED,
   //Abort if version is unsupported
    err := checkArguments(args)
    return err
}

//Called by IBC Handler on MsgOpenTry
OnChanOpenTry(
    ctx sdk.Context,
    order channeltypes.Order,
    connectionHops []string,
    portID,
    channelID string,
    channelCap *capabilitytypes.Capability,
    counterparty channeltypes.Counterparty,
    counterpartyVersion string,
) (string, error) {
   //Module may have already claimed capability in OnChanOpenInit in the case of crossing hellos
   //(ie chainA and chainB both call ChanOpenInit before one of them calls ChanOpenTry)
   //If the module can already authenticate the capability then the module already owns it so we don't need to claim
   //Otherwise, module does not have channel capability and we must claim it from IBC
    if !k.AuthenticateCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)) {
       //Only claim channel capability passed back by IBC module if we do not already own it
        if err := k.scopedKeeper.ClaimCapability(ctx, chanCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
            return err
        }
    }
    
   //... do custom initialization logic

   //Use above arguments to determine if we want to abort handshake
    if err := checkArguments(args); err != nil {
        return err
    }

   //Construct application version 
   //IBC applications must return the appropriate application version
   //This can be a simple string or it can be a complex version constructed
   //from the counterpartyVersion and other arguments. 
   //The version returned will be the channel version used for both channel ends. 
    appVersion := negotiateAppVersion(counterpartyVersion, args)
    
    return appVersion, nil
}

//Called by IBC Handler on MsgOpenAck
OnChanOpenAck(
    ctx sdk.Context,
    portID,
    channelID string,
    counterpartyVersion string,
) error {
   //... do custom initialization logic

   //Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}

//Called by IBC Handler on MsgOpenConfirm
OnChanOpenConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
   //... do custom initialization logic

   //Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}
```

チャネルを閉じるハンドシェイクは、エラーを返してエラーを返す可能性のあるモジュールコールバックも呼び出します。
ハンドシェイクを閉じます。 チャネルを閉じることは2ステップのハンドシェイクであり、チェーンコールを開始します
`ChanCloseInit`とファイナライズチェーンは` ChanCloseConfirm`を呼び出します。

```go
//Called by IBC Handler on MsgCloseInit
OnChanCloseInit(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
   //... do custom finalization logic

   //Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}

//Called by IBC Handler on MsgCloseConfirm
OnChanCloseConfirm(
    ctx sdk.Context,
    portID,
    channelID string,
) error {
   //... do custom finalization logic

   //Use above arguments to determine if we want to abort handshake
    err := checkArguments(args)
    return err
}
```

#### チャネルハンドシェイクバージョンネゴシエーション

アプリケーションモジュールは、チャネルハンドシェイク手順中に使用されたバージョン管理を検証することが期待されています。

* `ChanOpenInit`コールバックは、` MsgChanOpenInit.Version`が有効であることを確認する必要があります
* `ChanOpenTry`コールバックは、両方のチャネルエンドに使用されるアプリケーションバージョンを構築する必要があります。アプリケーションバージョンを作成できない場合は、エラーを返す必要があります。
* `ChanOpenAck`コールバックは、` MsgChanOpenAck.CounterpartyVersion`が有効でサポートされていることを確認する必要があります。

IBCは、アプリケーションモジュールが `OnChanOpenTry`でアプリケーションバージョンネゴシエーションを実行することを期待しています。交渉されたバージョン
コアIBCに戻す必要があります。バージョンをネゴシエートできない場合は、エラーが返されます。

バージョンは文字列である必要がありますが、任意のバージョン管理構造を実装できます。アプリケーションが
線形リリースがある場合は、セマンティックバージョン管理をお勧めします。アプリケーションがリリースする予定の場合
メジャーリリース間のさまざまな機能の場合は、同じバージョン管理スキームを使用することをお勧めします
IBCとして。このバージョン管理スキームは、バージョン識別子と互換性のある機能セットを指定します。
その識別子。有効なバージョンの選択には、互換性のあるバージョン識別子の選択が含まれます
そのバージョンのアプリケーションでサポートされている機能のサブセット。構造体はこれに使用されます
スキームは `03-connection/types`にあります。

バージョンタイプは文字列であるため、アプリケーションは簡単なバージョン検証を行うことができます
文字列照合を介して、またはすでに実装されているバージョン管理システムを使用してプロトを渡すことができます
必要に応じて、各ハンドシェイク呼び出しにエンコードされたバージョン。

ICS20は現在、サポートされている単一のバージョンとの基本的な文字列照合を実装しています。

### バインドポート

現在、ポートはアプリの初期化時にバインドする必要があります。モジュールは `InitGenesis`のポートにバインドできます
そのようです:

```go
func InitGenesis(ctx sdk.Context, keeper keeper.Keeper, state types.GenesisState) {
   //... other initialization logic

   //Only try to bind to port if it is not already bound, since we may already own
   //port capability from capability InitGenesis
    if !isBound(ctx, state.PortID) {
       //module binds to desired ports on InitChain
       //and claims returned capabilities
        cap1 := keeper.IBCPortKeeper.BindPort(ctx, port1)
        cap2 := keeper.IBCPortKeeper.BindPort(ctx, port2)
        cap3 := keeper.IBCPortKeeper.BindPort(ctx, port3)

       //NOTE: The module's scoped capability keeper must be private
        keeper.scopedKeeper.ClaimCapability(cap1)
        keeper.scopedKeeper.ClaimCapability(cap2)
        keeper.scopedKeeper.ClaimCapability(cap3)
    }

   //... more initialization logic
}
```

### カスタムパケット

チャネルによって接続されたモジュールは、送信するアプリケーションデータについて合意する必要があります。
チャネル、およびそれらがどのようにそれをエンコード/デコードするか。 このプロセスは稼働中であるため、IBCによって指定されていません
この契約を実装する方法を決定するために、各アプリケーションモジュールに。 ただし、ほとんどの場合
アプリケーションこれは、チャネルハンドシェイク中のバージョンネゴシエーションとして発生します。 もっと
複雑なバージョンネゴシエーションは、チャネルオープニングハンドシェイク内で実装することが可能です。
単純なバージョンのネゴシエーションは、[ibc-transferモジュール](https://github.com/cosmos/ibc-go/tree/main/modules/apps/transfer/module.go)に実装されています。

したがって、モジュールは、そのカスタムパケットデータ構造を、明確に定義された方法とともに定義する必要があります。
`[] byte`との間でエンコードおよびデコードします。

```go
//Custom packet data defined in application module
type CustomPacketData struct {
   //Custom fields ...
}

EncodePacketData(packetData CustomPacketData) []byte {
   //encode packetData to bytes
}

DecodePacketData(encoded []byte) (CustomPacketData) {
   //decode from bytes to packet data
}
```

次に、モジュールはIBCを介して送信する前にパケットデータをエンコードする必要があります。

```go
//Sending custom application packet data
data := EncodePacketData(customPacketData)
packet.Data = data
IBCChannelKeeper.SendPacket(ctx, packet)
```

パケットを受信するモジュールは、「PacketData」を期待する構造にデコードして、次のことができるようにする必要があります。
それに基づいて行動します。

```go
//Receiving custom application packet data (in OnRecvPacket)
packetData := DecodePacketData(packet.Data)
//handle received custom packet data
```

#### パケットフロー処理

IBCがモジュールがチャネルハンドシェイクのコールバックを実装することを期待したように、IBCもモジュールを期待します
チャネルを介したパケットフローを処理するためのコールバックを実装します。

モジュールAとモジュールBが相互に接続されると、中継器はパケットの中継を開始でき、
チャネル上で前後に確認応答。

！[IBCパケットフロー図](https://media.githubusercontent.com/media/cosmos/ibc/old/spec/ics-004-channel-and-packet-semantics/channel-state-machine.png)

簡単に言うと、成功したパケットフローは次のように機能します。

1.モジュールAはIBCモジュールを介してパケットを送信します
2.パケットはモジュールBによって受信されます
3.モジュールBがパケットの確認応答を書き込む場合、モジュールAは
   了承
4.タイムアウト前にパケットが正常に受信されなかった場合、モジュールAは
   パケットのタイムアウト。

##### パケットの送信

モジュールは送信アクションを開始するため、モジュールはコールバックを介してパケットを送信しません
メッセージがIBCに送信されるパケットフローの他の部分とは対照的に、IBCモジュールへのパケット
モジュールは、コールバックを使用して、ポートにバインドされたモジュールで実行をトリガーする必要があります。したがって、送信するには
モジュールが `IBCChannelKeeper`の` SendPacket`を呼び出す必要があるパケット。

```go
//retrieve the dynamic capability for this channel
channelCap := scopedKeeper.GetCapability(ctx, channelCapName)
//Sending custom application packet data
data := EncodePacketData(customPacketData)
packet.Data = data
//Send packet to IBC, authenticating with channelCap
IBCChannelKeeper.SendPacket(ctx, channelCap, packet)
```

::: 警告
モジュールが所有していないチャネルでパケットを送信するのを防ぐために、IBCは
パケットの送信元チャネルの正しいチャネル機能を渡すためのモジュール。
:::

##### パケットの受信

受信パケットを処理するには、モジュールは `OnRecvPacket`コールバックを実装する必要があります。これは
パケットが有効であり、IBCによって正しく処理されたことが証明された後、IBCモジュールによって呼び出されます
キーパー。したがって、 `OnRecvPacket`コールバックは、適切な状態を作成することだけを心配する必要があります
パケットが有効かどうかを気にせずに、パケットデータを指定して変更します。

モジュールは、確認応答インターフェースを実装する確認応答をIBCハンドラーに返す場合があります。
次に、IBCハンドラーはパケットのこの確認応答をコミットして、リレーラーがパケットをリレーできるようにします。
送信者モジュールへの確認応答。

このコールバック中に発生した状態の変化は、次の場合にのみ書き込まれます。
-確認応答の `Success()`関数で示されるように、確認応答は成功しました
-返された確認応答がnilの場合、非同期プロセスが発生していることを示します

注:非同期確認応答を処理するアプリケーションは、状態変更の復帰を処理する必要があります
必要に応じて。 `OnRecvPacket`コールバック中に発生した状態の変化はすべて書き込まれます
非同期確認応答の場合。 

```go
OnRecvPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) ibcexported.Acknowledgement {
   //Decode the packet data
    packetData := DecodePacketData(packet.Data)

   //do application state changes based on packet data and return the acknowledgement
   //NOTE: The acknowledgement will indicate to the IBC handler if the application 
   //state changes should be written via the `Success()` function. Application state
   //changes are only written if the acknowledgement is successful or the acknowledgement
   //returned is nil indicating that an asynchronous acknowledgement will occur.
    ack := processPacket(ctx, packet, packetData)

    return ack
}
```

The Acknowledgement interface:
```go
//Acknowledgement defines the interface used to return
//acknowledgements in the OnRecvPacket callback.
type Acknowledgement interface {
	Success() bool
	Acknowledgement() []byte
}
```

### 謝辞

同期パケット処理の場合、モジュールはパケットの受信と処理時に確認応答をコミットする場合があります。
パケットが受信された後のある時点でパケットが処理される場合(非同期実行)、確認応答
パケットがアプリケーションによって処理されると書き込まれます。これは、パケットの受信後の可能性があります。

注:ほとんどのブロックチェーンモジュールは、モジュールが確認応答を処理して書き込む同期実行モデルを使用する必要があります
IBCモジュールからパケットを受信するとすぐにパケットの場合。

その後、この確認応答を元の送信者チェーンに中継して戻すことができます。元の送信者チェーンはアクションを実行できます
謝辞の内容によって異なります。

パケットデータがIBCに対して不透明であったように、確認応答も同様に不透明です。モジュールは合格する必要があり、
IBCモジュールで確認応答をバイト文字列として受信します。

したがって、モジュールは確認応答をエンコード/デコードする方法について合意する必要があります。を作成するプロセス
確認応答構造体とそのエンコードおよびデコードは、パケットデータと非常によく似ています。
上記の例。 [ICS 04](https://github.com/cosmos/ibc/blob/master/spec/core/ics-004-channel-and-packet-semantics#acknowledgement-envelope)
確認応答の推奨形式を指定します。この確認応答タイプは、からインポートできます。
[チャネルタイプ](https://github.com/cosmos/ibc-go/tree/main/modules/core/04-channel/types)。

モジュールは任意の確認応答構造体を選択できますが、デフォルトの確認応答タイプはIBC [ここ](https://github.com/cosmos/ibc-go/blob/main/proto/ibc/core/channel/v1/channel)によって提供されます。プロト):

```proto
//Acknowledgement is the recommended acknowledgement format to be used by
//app-specific protocols.
//NOTE: The field numbers 21 and 22 were explicitly chosen to avoid accidental
//conflicts with other protobuf message formats used for acknowledgements.
//The first byte of any message with this format will be the non-ASCII values
//`0xaa` (result) or `0xb2` (error). Implemented as defined by ICS:
//https://github.com/cosmos/ibc/tree/master/spec/core/ics-004-channel-and-packet-semantics#acknowledgement-envelope
message Acknowledgement {
 //response contains either a result or an error and must be non-empty
  oneof response {
    bytes  result = 21;
    string error  = 22;
  }
}
```

#### パケットの確認

モジュールが確認応答を書き込んだ後、中継器は確認応答を送信側モジュールに中継して戻すことができます。 送信側モジュールは
次に、 `OnAcknowledgementPacket`コールバックを使用して確認応答を処理します。 の内容
確認応答は、(パケットデータと同様に)チャネル上のモジュールに完全に依存します。 しかし、それは
多くの場合、パケットが正常に処理されたかどうかに関する情報が含まれている可能性があります
パケット処理が失敗した場合の修復に役立つ可能性のあるいくつかの追加データが含まれています。

モジュールは、パケットデータのエンコード/デコード標準について合意する責任があるため、
確認応答の場合、IBCは確認応答を `[] byte`としてこのコールバックに渡します。 コールバック
確認応答のデコードと処理を担当します。

```go
OnAcknowledgementPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
    acknowledgement []byte,
) (*sdk.Result, error) {
   //Decode acknowledgement
    ack := DecodeAcknowledgement(acknowledgement)

   //process ack
    res, err := processAck(ack)
    return res, err
}
```

#### タイムアウトパケット

パケットが正常に受信される前にパケットのタイムアウトに達した場合、または
パケットが正常に受信される前に相手チャネルの端が閉じられ、次に受信
チェーンはそれを処理できなくなります。 したがって、送信チェーンはを使用してタイムアウトを処理する必要があります
この状況を処理するための `OnTimeoutPacket`。 この場合も、IBCモジュールはタイムアウトが
確かに有効なので、私たちのモジュールは、一度行うことのためにステートマシンロジックを実装するだけで済みます。
タイムアウトになり、パケットを受信できなくなります。

```go
OnTimeoutPacket(
    ctx sdk.Context,
    packet channeltypes.Packet,
) (*sdk.Result, error) {
   //do custom timeout logic
}
```

### ルーティング

上記のように、モジュールはIBCモジュールインターフェイス(両方のチャネルを含む)を実装する必要があります
ハンドシェイクコールバックとパケット処理コールバック)。 このインターフェースの具体的な実装
IBC`Router`にルートとしてモジュール名で登録する必要があります。

```go
//app.go
func NewApp(...args) *App {
//...

//Create static IBC router, add module routes, then set and seal it
ibcRouter := port.NewRouter()

ibcRouter.AddRoute(ibctransfertypes.ModuleName, transferModule)
//Note: moduleCallbacks must implement IBCModule interface
ibcRouter.AddRoute(moduleName, moduleCallbacks)

//Setting Router will finalize all routes by sealing router
//No more routes can be added
app.IBCKeeper.SetRouter(ibcRouter)
```

## 実例

IBCアプリケーションの実際の動作例については、 `ibc-transfer`モジュールを確認できます。
これは、上記で説明したすべてを実装します。

モジュールの便利な部分は次のとおりです。

[転送へのバインド
ポート](https://github.com/cosmos/ibc-go/blob/main/modules/apps/transfer/types/genesis.go)

【送金転送
パケット](https://github.com/cosmos/ibc-go/blob/main/modules/apps/transfer/keeper/relay.go)

[IBCの実装
コールバック](https://github.com/cosmos/ibc-go/blob/main/modules/apps/transfer/module.go)

## 次へ{hide}

[モジュールの構築]について学ぶ(https://github.com/cosmos/cosmos-sdk/blob/master/docs/building-modules/intro.md){hide}