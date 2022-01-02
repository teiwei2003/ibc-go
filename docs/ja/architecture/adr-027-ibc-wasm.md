# ADR 27:Wasmベースのライトクライアントのサポートを追加

## 変更ログ

-2020年11月26日:初期ドラフト

## 状態

*下書き*

## 概要

Cosmos SDKでは、ライトクライアントは現在Goでハードコードされています。これにより、既存のIBCライトクライアントをアップグレードまたは追加できます
新しいライトクライアントのサポートには、時間のかかるオンチェーンガバナンスを含むマルチステッププロセスが含まれます。

これを改善するために、ライトクライアントのバイトコードをホストするWASM VMを提案しています。これにより、アップグレードが容易になります。
既存のIBCライトクライアント、およびコードリリースや対応する必要のない新しいIBCライトクライアントのサポートの追加
ハードフォークイベント。

## 環境
現在SDKでは、ライトクライアントはコードベースの一部として定義されており、以下のサブモジュールとして実装されています。
`ibc-go/core/modules/light-clients/`。

新しいライトクライアントのサポートを追加するか、セキュリティが発生した場合に既存のライトクライアントを更新します
問題またはコンセンサスの更新は多段階のプロセスであり、時間がかかり、エラーが発生しやすくなります。

1.新しいライトクライアントのサポートを追加するか、既存のライトクライアントを更新するには
   セキュリティの問題やコンセンサスの更新が発生した場合は、コードベースを変更して、さまざまな場所に統合する必要があります。

2.ガバナンスの投票:新しいライトクライアントの実装を追加するには、ガバナンスのサポートが必要であり、費用がかかります。これは
   チェーンガバナンスは、新しいライトクライアントの実装が追加されるためのゲートキーパーであるため、理想的ではありません。小さなコミュニティの場合
   ライトクライアントXのサポートが必要な場合、ガバナンスにそれをサポートするよう説得できない可能性があります。

3.バリデーターのアップグレード:ガバナンスの投票が成功した後、バリデーターは新しいものを有効にするためにノードをアップグレードする必要があります
   IBCライトクライアントの実装。

上記のプロセスに起因する別の問題は、チェーンが独自のコンセンサスをアップグレードしたい場合、すべてのチェーンを説得する必要があるということです。
またはハブを接続して、接続を維持するためにライトクライアントをアップグレードします。時間のかかるプロセスが必要なため
ライトクライアントをアップグレードするには、多くの接続があるチェーンをアップグレードした後、かなりの時間切断する必要があります
そのコンセンサスは、時間と労力の点で非常に高くつく可能性があります。

WASMライトクライアントモジュールを統合することでこのワークフローを簡素化することを提案しています。
新しいライトクライアントは単純なトランザクションです。 Wasmでコンパイル可能なRustで記述されたライトクライアントのバイトコードは、WASM内で実行されます
VM。 Wasm lightクライアントサブモジュールは、着信メッセージをにルーティングするプロキシライトクライアントインターフェイスを公開します。
実行用のWasmVM内の適切なハンドラー関数。

WASMライトクライアントモジュールを使用すると、誰でもWASMバイトコードの形式で新しいIBCライトクライアントを追加できます(トランザクションに必要なガス料金を支払うことができる場合)
また、作成されたクライアントタイプを使用してクライアントをインスタンス化します。これにより、任意のチェーンが他のチェーン内の独自のライトクライアントを更新できるようになります
上記の手順を実行せずに。


## 決断

WASMライトクライアントモジュールを、実際のライトクライアントとインターフェイスするライトクライアントプロキシとして使用することにしました。
WASMバイトコードとしてアップロードされます。これには、クライアントタイプがあれば、すべてのクライアントを許可するようにクライアント選択方法を変更する必要があります
接頭辞は `wasm/`です。

```go
//IsAllowedClient checks if the given client type is registered on the allowlist.
func (p Params) IsAllowedClient(clientType string) bool {
	if p.AreWASMClientsAllowed && isWASMClient(clientType) {
		return true
	}
	
	for _, allowedClient := range p.AllowedClients {
		if allowedClient == clientType {
			return true
		}
	}

	return false
}
```

新しいライトクライアントをアップロードするには、ユーザーはWasmバイトコードを使用してトランザクションを作成する必要があります。
IBCWasmモジュールによって処理されます。

```go
func (k Keeper) UploadLightClient (wasmCode: []byte, description: String) {
    wasmRegistry = getWASMRegistry()
    id := hex.EncodeToString(sha256.Sum256(wasmCode))
    assert(!wasmRegistry.Exists(id))
    assert(wasmRegistry.ValidateAndStoreCode(id, description, wasmCode, false))
}
```

名前が示すように、Wasmレジストリは、ハッシュによってインデックス付けされたWasmクライアントコードのセットを格納し、
アップロードされた最新のコードを取得するためのクライアントコード。

`ValidateAndStoreCode`は、アップロードされたwasmバイトコードが有効かどうかをチェックし、VMインターフェースに確認します。

### 軽量クライアントプロキシはどのように機能しますか？

舞台裏のライトクライアントプロキシは、jsonの着信引数を使用してcosmwasmスマートコントラクトインスタンスを呼び出します
適切な環境情報を含むシリアル化された形式。 スマートコントラクトによって返されたデータは逆シリアル化され、
発信者に返されました。

`ClientState`インターフェースの` CheckProposedHeaderAndUpdateState`関数の例を考えてみましょう。 入ってくる引数は
jsonでシリアル化され、 `vm.Execute`を呼び出して` callContract`に渡されるペイロード内にパッケージ化されます。
スマートコントラクトによって返されるバイトの配列。 このデータは逆シリアル化され、戻り引数として渡されます。

```go
func (c *ClientState) CheckProposedHeaderAndUpdateState(context sdk.Context, marshaler codec.BinaryMarshaler, store sdk.KVStore, header exported.Header) (exported.ClientState, exported.ConsensusState, error) {
	//get consensus state corresponding to client state to check if the client is expired
	consensusState, err := GetConsensusState(store, marshaler, c.LatestHeight)
	if err != nil {
		return nil, nil, sdkerrors.Wrapf(
			err, "could not get consensus state from clientstore at height: %d", c.LatestHeight,
		)
	}
	
	payload := make(map[string]map[string]interface{})
	payload[CheckProposedHeaderAndUpdateState] = make(map[string]interface{})
	inner := payload[CheckProposedHeaderAndUpdateState]
	inner["me"] = c
	inner["header"] = header
	inner["consensus_state"] = consensusState

	encodedData, err := json.Marshal(payload)
	if err != nil {
		return nil, nil, sdkerrors.Wrapf(ErrUnableToMarshalPayload, fmt.Sprintf("underlying error: %s", err.Error()))
	}
	out, err := callContract(c.CodeId, context, store, encodedData)
	if err != nil {
		return nil, nil, sdkerrors.Wrapf(ErrUnableToCall, fmt.Sprintf("underlying error: %s", err.Error()))
	}
	output := clientStateCallResponse{}
	if err := json.Unmarshal(out.Data, &output); err != nil {
		return nil, nil, sdkerrors.Wrapf(ErrUnableToUnmarshalPayload, fmt.Sprintf("underlying error: %s", err.Error()))
	}
	if !output.Result.IsValid {
		return nil, nil, fmt.Errorf("%s error ocurred while updating client state", output.Result.ErrorMsg)
	}
	output.resetImmutables(c)
	return output.NewClientState, output.NewConsensusState, nil
}
```

## 結果

### ポジティブ
-新しいライトクライアントのサポートの追加または既存のライトクライアントのアップグレードは、以前よりもはるかに簡単で、単一のトランザクションのみが必要です。
-新しいクライアントをサポートしたりアップグレードしたりするためにコードベースを変更する必要がないため、CosmosSDKの保守性が向上します。

### ネガティブ
-Lightクライアントは、Wasmでコンパイルできるrustのサブセットで作成する必要があります。
-コンパイルされたバイトコードのみがブロックチェーンに存在するため、ライトクライアントコードのイントロスペクトは困難です。