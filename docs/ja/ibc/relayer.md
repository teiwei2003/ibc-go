# リレイヤー

## 前提条件の測定値

-[IBCの概要](。/overlay.md){前提条件}
-[イベント](https://github.com/cosmos/cosmos-sdk/blob/master/docs/core/events.md){前提条件}

## イベント

実行を示すために、ベースアプリケーションによって処理されるすべてのトランザクションに対してイベントが発行されます
一部のロジッククライアントの一部は、認識したい場合があります。これは、IBCパケットを中継するときに非常に役立ちます。
IBCを使用するメッセージは、で定義されているように実行された対応するTAOロジックのイベントを発行します。
[IBCイベントドキュメント](./events.md)。

SDKでは、すべてのメッセージに対して、タイプ `message`で発行されたイベントがあると想定できます。
属性キー `action`、および送信されたメッセージのタイプを表す属性値
( `channel_open_init`は` MsgChannelOpenInit`の属性値になります)。中継者が問い合わせた場合
トランザクションイベントの場合、このイベントタイプ/属性キーのペアを使用してメッセージイベントを分割できます。

属性キー `module`を持つイベントタイプ` message`は、単一のイベントに対して複数回発行される場合があります
アプリケーションのコールバックによるメッセージ。実行されたTAOロジックは、次の結果になると想定できます。
属性値が `ibc_ <submodulename>`のモジュールイベントの放出(02-clientは `ibc_client`を放出します)。

### テンダーミントで購読する 

[TendermintのWebsocket](https://docs.tendermint.com/master/rpc/)を介してTendermintRPCメソッド `Subscribe`を呼び出すと、次を使用してイベントが返されます。
それらのテンダーミントの内部表現。イベントのリストを受け取る代わりに
放出された場合、Tendermintはタイプ `map [string] [] string`を返します。これは文字列をマップします。
`<event_type>。<attribute_key>`を `attribute_value`に形成します。これにより、イベントが抽出されます
自明ではないが、それでも可能であるように命令する。

中継者は `message.action`キーを使用して、トランザクション内のメッセージの数を抽出する必要があります
送信されたIBCトランザクションのタイプ。文字列配列内のすべてのIBCトランザクションについて
`message.action`、必要な情報は他のイベントフィールドから抽出する必要があります。もしも
`send_packet`は` message.action`の値のインデックス2に表示されます。中継者は
キー `send_packet.packet_sequence`のインデックス2の値。このプロセスは、それぞれに対して繰り返す必要があります
パケットを中継するために必要な情報。

## 実装例

-[Golang Relayer](https://github.com/iqlusioninc/relayer)
-[エルメス](https://github.com/informalsystems/ibc-rs/tree/master/relayer)