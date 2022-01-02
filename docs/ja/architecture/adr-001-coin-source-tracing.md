# ADR 001:コインソーストレーシング

## 変更ログ

-2020-07-09:初期ドラフト
-2020-08-11:実装の変更

## 状態

受け入れられ、実装されました

## 環境

IBCクロスチェーン代替可能トークン転送の仕様
([ICS20](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer))、
送信者を含む「パケット」を中継するために、トークンの種類の出所に注意してください
および受信者は
[`FungibleTokenPacketData`](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures)。

パケットリレー送信は2つのケースに基づいて機能します(
[仕様](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#packet-relay)および[ColinAxnér](https://github。 com/colin-axner)の説明):

1.送信者チェーンがソースゾーンとして機能しています。コインが転送されます
送信者チェーンのエスクローアドレス(つまりロックされている)に転送され、転送されます
IBCTAOロジックを介して受信チェーンに接続します。が期待されます
受信チェーンは、受信アドレスにバウチャーを作成します。

2.センダーチェーンがシンクゾーンとして機能しています。コイン(バウチャー)は燃やされます
送信側チェーンで送信され、IBCを介して受信側チェーンに転送されます
TAOロジック。以前に持っていた受信チェーンが期待されます
元の金種を送信し、代替可能なトークンのエスカレーションを解除して送信します
受信アドレスに送信します。

ソースゾーンとシンクゾーンの別の考え方は、トークンの
タイムライン。それぞれが以前のチェーン以外のチェーンに送信します
から受け取ったのは、トークンのタイムラインでの前進です。これは〜をひき起こす
トークンの履歴と宛先ポートに追加されるトレースと
金種の前に付けられる宛先チャネル。これらの例では
送信側チェーンは送信元ゾーンとして機能しています。トークンが返送されたとき
以前に受信したチェーンに対して、プレフィックスが削除されます。これは
トークンのタイムラインと送信者チェーンの後方への移動
シンクゾーンとして機能しています。

### 例

次のチャネル接続が存在し、すべてのチャネルがポートID`transfer`を使用するとします。

-チェーン `A`には、チェーン` B`とチェーン `C`のIDがそれぞれ` channelToB`と `channelToC`のチャネルがあります。
-チェーン `B`には、チェーン` A`とチェーン `C`のIDがそれぞれ` channelToA`と `channelToC`のチャネルがあります。
-チェーン `C`には、チェーン` A`とチェーン `B`のIDがそれぞれ` channelToA`と `channelToB`のチャネルがあります。

チェーン間の転送のこれらのステップは、次の順序で発生します: `A-> B-> C-> A-> C`。特に:

1. `A-> B`:送信者チェーンは送信元ゾーンです。 `A`は` denom`( `A`にエスクローされた)でパケットを送信し、` B`は `denom`とミントを受信し、バウチャー` transfer/channelToA/denom`を受信者に送信します。
2. `B-> C`:送信者チェーンは送信元ゾーンです。 `B`は` transfer/channelToA/denom`( `B`でエスクローされます)でパケットを送信し、` C`は `transfer/channelToA/denom`を受信し、ミントしてバウチャー` transfer/channelToB/transfer/channelToA/denom`を受信者に送信します。
3. `C-> A`:送信者チェーンは送信元ゾーンです。 `C`は` transfer/channelToB/transfer/channelToA/denom`( `C`でエスクローされます)でパケットを送信し、` A`は `transfer/channelToB/transfer/channelToA/denom`を受信し、ミントしてバウチャー` transfer/channelToC/を送信します受信者への転送/channelToB/transfer/channelToA/denom`。
4. `A-> C`:センダーチェーンはシンクゾーンです。 `A`は` transfer/channelToC/transfer/channelToB/transfer/channelToA/denom`( `A`で書き込まれる)でパケットを送信し、` C`は `transfer/channelToC/transfer/channelToB/transfer/channelToA/denom`を受信し、エスクローを解除し、 `transfer/channelToB/transfer/channelToA/denom`を受信者に送信します。

トークンには、 `transfer/channelToB/transfer/channelToA/denom`のチェーン` C`に最終的な金額があります。ここで、 `transfer/channelToB/transfer/channelToA`はトレース情報です。

このコンテキストでは、クロスチェーンの代替可能なトークン転送を受信すると、送信者チェーンがトークンのソースである場合、プロトコルは次の形式でポートとチャネルの識別子を金種の前に付けます。

```typescript
prefix + denom = {destPortN}/{destChannelN}/.../{destPort0}/{destChannel0}/denom
```

例:ハブのポート `HubPort`とチャンネル` HubChannel`から `100uatom`を転送します
Ethermintのポート `EthermintPort`とチャネル` EthermintChannel`は `100になります
EthermintPort/EthermintChannel/uatom`、ここで `EthermintPort/EthermintChannel/uatom`は新しい
受信チェーンの金種。

これらのトークンがハブ(つまり、**ソース**チェーン)に転送される場合、プレフィックスは次のようになります。
トリミングされ、トークンの金額が元の金額に更新されます。

### 問題

コインの種類に追加情報を追加する際の問題は2つあります。

1.トークンがソース以外のゾーンに転送される場合、長さは増え続けます。

トークンがIBCを介してシンクチェーンに `n`回転送される場合、トークンdenomには` n`ペアが含まれます
上記のフォーマット例に示されているように、プレフィックスの数。これは問題を引き起こします。
チャネル識別子の最大長はそれぞれ64で、SDKの `Coin`タイプは最大64のデノムのみを受け入れます。
64文字。したがって、単一のクロスチェーントークンは、ポートとチャネルで構成されます。
識別子と基本単位は、SDK`Coins`の長さの検証を超える可能性があります。

これにより、トークンを複数に転送できないなどの望ましくない動作が発生する可能性があります
金種が長さを超える場合、または金種が原因で予期しない「パニック」が発生した場合は、チェーンをシンクします
受信チェーンで検証が失敗します。

2.金種に特殊文字と大文字が存在する:

SDKでは、コンストラクター関数 `NewCoin`を介して` Coin`が初期化されるたびに、検証が行われます。
コインのデノムの
[正規表現](https://github.com/cosmos/cosmos-sdk/blob/a940214a4923a3bf9a9161cd14bd3072299cd0c9/types/coin.go#L583)、
小文字の英数字のみが受け入れられます。これはネイティブの宗派にとって望ましいことですが
クリーンなUXを維持するには、ポートとチャネルがランダムに存在する可能性があるため、IBCにとって課題となります。
[ICS024-ホストに従って特殊文字と大文字で生成されます
要件](https://github.com/cosmos/ibc/tree/master/spec/core/ics-024-host-requirements#paths-identifiers-separators)
仕様。

## 決断

上記で概説した問題は、SDKベースのチェーンにのみ適用されるため、提案されたソリューション
他の実装に変更をもたらす仕様の変更は必要ありません
ICS20仕様の。

コインの種類に識別子を直接追加する代わりに、提案されたソリューションはハッシュします
すべてのクロスチェーン代替可能トークンの一貫した長さを取得するための金種プレフィックス。

これは内部ストレージにのみ使用され、IBCを介して別のチェーンに転送されると、
パックされたデータで指定された金種は、必要な識別子の完全なプレフィックスパスになります。
ICS20で指定されているように、トークンを元のチェーンまでさかのぼってトレースします。

新しく提案される形式は次のとおりです。

```golang
ibcDenom = "ibc/" + hash(trace path + "/" + base denom)
```

ハッシュ関数は、 `DenomTrace`のフィールドのSHA256ハッシュになります。

```protobuf
//DenomTrace contains the base denomination for ICS20 fungible tokens and the source tracing
//information
message DenomTrace {
 //chain of port/channel identifiers used for tracing the source of the fungible token
  string path = 1;
 //base denomination of the relayed fungible token
  string base_denom = 2;
}
```

`IBCDenom`関数は、ICS20代替可能トークンパケットデータを作成するときに使用される` Coin`単位を構築します。

```golang
//Hash returns the hex bytes of the SHA256 hash of the DenomTrace fields using the following formula:
//
//hash = sha256(tracePath + "/" + baseDenom)
func (dt DenomTrace) Hash() tmbytes.HexBytes {
  return tmhash.Sum(dt.Path + "/" + dt.BaseDenom)
}

//IBCDenom a coin denomination for an ICS20 fungible token in the format 'ibc/{hash(tracePath + baseDenom)}'. 
//If the trace is empty, it will return the base denomination.
func (dt DenomTrace) IBCDenom() string {
  if dt.Path != "" {
    return fmt.Sprintf("ibc/%s", dt.Hash())
  }
  return dt.BaseDenom
}
```

### `x/ibc-transfer`の変更

IBCの金種からトレース情報を取得するには、ルックアップテーブルが次のようになっている必要があります。
`ibc-transfer`モジュールに追加されました。 これらの値は、アップグレード間でも保持する必要があります。つまり、
新しい `[] DenomTrace``GenesisState`フィールド状態をモジュールに追加する必要があること。

```golang
//GetDenomTrace retrieves the full identifiers trace and base denomination from the store.
func (k Keeper) GetDenomTrace(ctx Context, denomTraceHash []byte) (DenomTrace, bool) {
  store := ctx.KVStore(k.storeKey)
  bz := store.Get(types.KeyDenomTrace(traceHash))
  if bz == nil {
    return &DenomTrace, false
  }

  var denomTrace DenomTrace
  k.cdc.MustUnmarshalBinaryBare(bz, &denomTrace)
  return denomTrace, true
}

//HasDenomTrace checks if a the key with the given trace hash exists on the store.
func (k Keeper) HasDenomTrace(ctx Context, denomTraceHash []byte)  bool {
  store := ctx.KVStore(k.storeKey)
  return store.Has(types.KeyTrace(denomTraceHash))
}

//SetDenomTrace sets a new {trace hash -> trace} pair to the store.
func (k Keeper) SetDenomTrace(ctx Context, denomTrace DenomTrace) {
  store := ctx.KVStore(k.storeKey)
  bz := k.cdc.MustMarshalBinaryBare(&denomTrace)
  store.Set(types.KeyTrace(denomTrace.Hash()), bz)
}
```

`MsgTransfer`は、` Token`フィールドからの `Coin`の種類に有効なものが含まれていることを検証します
トレース情報が提供されている場合、または基本金種が一致している場合は、ハッシュ:

```golang
func (msg MsgTransfer) ValidateBasic() error {
 //...
  return ValidateIBCDenom(msg.Token.Denom)
}
```

```golang
//ValidateIBCDenom validates that the given denomination is either:
//
// - A valid base denomination (eg: 'uatom')
// - A valid fungible token representation (i.e 'ibc/{hash}') per ADR 001 https://github.com/cosmos/ibc-go/blob/main/docs/architecture/adr-001-coin-source-tracing.md
func ValidateIBCDenom(denom string) error {
  denomSplit := strings.SplitN(denom, "/", 2)

  switch {
  case strings.TrimSpace(denom) == "",
    len(denomSplit) == 1 && denomSplit[0] == "ibc",
    len(denomSplit) == 2 && (denomSplit[0] != "ibc" || strings.TrimSpace(denomSplit[1]) == ""):
    return sdkerrors.Wrapf(ErrInvalidDenomForTransfer, "denomination should be prefixed with the format 'ibc/{hash(trace + \"/\" + %s)}'", denom)

  case denomSplit[0] == denom && strings.TrimSpace(denom) != "":
    return sdk.ValidateDenom(denom)
  }

  if _, err := ParseHexHash(denomSplit[1]); err != nil {
    return Wrapf(err, "invalid denom trace hash %s", denomSplit[1])
  }

  return nil
}
```

金種のトレース情報は、トークンを受け取ったときにのみ更新する必要があります。

-レシーバーは**ソース**チェーンです:レシーバーはトークンを作成し、トレースルックアップがすでに保存されている必要があります(必要に応じて、ネイティブトークンの場合はルックアップは必要ありません)。
-受信者は**ソース**チェーンではありません:受信した情報を保存します。 たとえば、ステップ1で、チェーン `B`が` transfer/channelToA/denom`を受信したとき。

```golang
//SendTransfer
//...

  fullDenomPath := token.Denom

//deconstruct the token denomination into the denomination trace info
//to determine if the sender is the source chain
if strings.HasPrefix(token.Denom, "ibc/") {
  fullDenomPath, err = k.DenomPathFromHash(ctx, token.Denom)
  if err != nil {
    return err
  }
}

if types.SenderChainIsSource(sourcePort, sourceChannel, fullDenomPath) {
//...
```

```golang
//DenomPathFromHash returns the full denomination path prefix from an ibc denom with a hash
//component.
func (k Keeper) DenomPathFromHash(ctx sdk.Context, denom string) (string, error) {
  hexHash := denom[4:]
  hash, err := ParseHexHash(hexHash)
  if err != nil {
    return "", Wrap(ErrInvalidDenomForTransfer, err.Error())
  }

  denomTrace, found := k.GetDenomTrace(ctx, hash)
  if !found {
    return "", Wrap(ErrTraceNotFound, hexHash)
  }

  fullDenomPath := denomTrace.GetFullDenomPath()
  return fullDenomPath, nil
}
```


```golang
//OnRecvPacket
//...

//This is the prefix that would have been prefixed to the denomination
//on sender chain IF and only if the token originally came from the
//receiving chain.
//
//NOTE: We use SourcePort and SourceChannel here, because the counterparty
//chain would have prefixed with DestPort and DestChannel when originally
//receiving this coin as seen in the "sender chain is the source" condition.
if ReceiverChainIsSource(packet.GetSourcePort(), packet.GetSourceChannel(), data.Denom) {
 //sender chain is not the source, unescrow tokens

 //remove prefix added by sender chain
  voucherPrefix := types.GetDenomPrefix(packet.GetSourcePort(), packet.GetSourceChannel())
  unprefixedDenom := data.Denom[len(voucherPrefix):]
  token := sdk.NewCoin(unprefixedDenom, sdk.NewIntFromUint64(data.Amount))

 //unescrow tokens
  escrowAddress := types.GetEscrowAddress(packet.GetDestPort(), packet.GetDestChannel())
  return k.bankKeeper.SendCoins(ctx, escrowAddress, receiver, sdk.NewCoins(token))
}

//sender chain is the source, mint vouchers

//since SendPacket did not prefix the denomination, we must prefix denomination here
sourcePrefix := types.GetDenomPrefix(packet.GetDestPort(), packet.GetDestChannel())
//NOTE: sourcePrefix contains the trailing "/"
prefixedDenom := sourcePrefix + data.Denom

//construct the denomination trace from the full raw denomination
denomTrace := types.ParseDenomTrace(prefixedDenom)

//set the value to the lookup table if not stored already
traceHash := denomTrace.Hash()
if !k.HasDenomTrace(ctx, traceHash) {
  k.SetDenomTrace(ctx, traceHash, denomTrace)
}

voucherDenom := denomTrace.IBCDenom()
voucher := sdk.NewCoin(voucherDenom, sdk.NewIntFromUint64(data.Amount))

//mint new tokens if the source of the transfer is the same chain
if err := k.bankKeeper.MintCoins(
  ctx, types.ModuleName, sdk.NewCoins(voucher),
); err != nil {
  return err
}

//send to receiver
return k.bankKeeper.SendCoinsFromModuleToAccount(
  ctx, types.ModuleName, receiver, sdk.NewCoins(voucher),
)
```

```golang
func NewDenomTraceFromRawDenom(denom string) DenomTrace{
  denomSplit := strings.Split(denom, "/")
  trace := ""
  if len(denomSplit) > 1 {
    trace = strings.Join(denomSplit[:len(denomSplit)-1], "/")
  }
  return DenomTrace{
    BaseDenom: denomSplit[len(denomSplit)-1],
    Trace:     trace,
  }
}
```

最後の注意点の1つは、受信チェーンがSDKベースのチェーンではない可能性があるため、 `FungibleTokenPacketData`は同じままである、つまり、接頭辞が完全な額面であるということです。

### コインの変更

これらの変更を反映するには、コインの金種の検証を更新する必要があります。特に、金種の検証
関数は次のようになります。

-スラッシュ区切り文字( `"/"`)と大文字( `HexBytes`形式による)を受け入れる
-Tendermintの16進表現で使用されるように、最大​​文字長を128にバンプします。
  `HexBytes`タイプには64文字が含まれます。

ハッシュの長さの検証などの追加の検証ロジックは、[カスタムベースの金種の検証](https://github.com/cosmos/cosmos-sdk/pull/6755)の場合、将来的に銀行モジュールに追加される可能性があります)はSDKに統合されています。

### ポジティブ

-トークン(転送プレフィックス)のソーストレース動作を元のファイルからより明確に分離
  「コイン」の種類
-`Coin`フィールドの一貫した検証(つまり、特殊文字なし、固定最大長)
-よりクリーンな `コイン`とIBCの標準的な金種
-SDK`Coin`に追加のフィールドはありません

### ネガティブ

-トレース金額識別子の各セットを `ibc-transfer`モジュールストアに保存します
-クライアントは、IBCを介して新しい中継可能な代替可能トークンを受け取るたびに、基本額を取得する必要があります。これは、クライアント側ですでに見られるハッシュのマップ/キャッシュを使用して軽減できます。他の形式の緩和策は、着信イベントをサブスクライブするWebSocket接続を開くことです。

### ニュートラル

-ICS20仕様とのわずかな違い
-`ibc-transfer`モジュールのIBCコインの追加の検証ロジック
-追加のジェネシスフィールド
-店舗へのアクセスにより、クロスチェーン転送でのガス使用量がわずかに増加します。これは
  転送が頻繁に行われる場合は、ブロック間でキャッシュされます。

## 参照

-[ICS 20-代替可能トークン転送](https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer)
-[カスタムコイン額面検証](https://github.com/cosmos/cosmos-sdk/pull/6755)