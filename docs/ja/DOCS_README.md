# ドキュメントを更新する

ドキュメントを更新したい場合は、ibc-goでprを開いてください。

## 翻訳

-ドキュメントの翻訳は `docs/country-code/`フォルダーにあります。ここで、 `country-code`は使用される言語の国コードを表します(中国語の場合は` cn`、韓国の場合は `kr`、フランスの場合は` fr`、 ...)。
-常に `main`にあるコンテンツを翻訳します。
-翻訳フォルダのREADMEで翻訳のリリース/タグを指定します。翻訳を更新するたびにリリース/タグを更新してください。

##ドキュメントビルドワークフロー

IBC-Goのドキュメントは、https://ibc.cosmos.networkでホストされています。

この( `/docs`)ディレクトリ内のファイルから構築された
[メイン](https://github.com/cosmos/ibc-go/tree/main/docs)。

### 使い方

`/docs`ディレクトリの変更をリッスンするCircleCIジョブがあります。
`main`ブランチ。このディレクトリ内のファイルの更新
そのブランチでは、Webサイトの展開が自動的にトリガーされます。フードの下、
プライベートWebサイトリポジトリには、そのリポジトリのCircleCIジョブによって消費される `makebuild-docs`ターゲットがあります。

## README

[README.md](./README.md)は、ドキュメントのランディングページでもあります
ウェブサイトで。 Jenkinsのビルド中に、現在のコミットが下部に追加されます
READMEの。

## Config.js

[config.js](./。vuepress/config.js)は、サイドバーと目次を生成します
ウェブサイトのドキュメントで。相対リンクの使用との省略に注意してください
ファイル拡張子。外観を改善するための追加機能を利用できます
サイドバーの。

##リンク

**注:**既存のリンクを強く検討してください-両方ともこのディレクトリ内にあります
およびWebサイトのドキュメントへ-ファイルを移動または削除する場合。

相対リンクは、次のことを発見して評価した上で、ほぼすべての場所で使用する必要があります。

### 相対的

現在のファイルと比較して、他のファイルはどこにありますか？

-GitHubとVuePressビルドの両方で機能します
-混乱する/煩わしい: `../../../../myfile.md`
-ファイルが再シャッフルされるときに、より多くの更新が必要です

### 絶対

リポジトリのルートを指定すると、他のファイルはどこにありますか？

-GitHubで動作し、VuePressビルドでは動作しません
-これははるかに優れています: `/docs/hereitis/myfile.md`
-そのファイルを移動すると、その中のリンクは保持されます(もちろん、ファイルへのリンクは保持されません)。

### 満杯

ファイルまたはディレクトリへの完全なGitHubURL。意味があるときに時々使用されます
ユーザーをGitHubに送信します。

## ローカルで構築する

`docs`ディレクトリにいることを確認し、次のコマンドを実行します。

```sh
rm -rf node_modules
```

このコマンドは、古いバージョンのビジュアルテーマと必要なパッケージを削除します。 このステップはオプションです。

```sh
npm install
```

テーマとすべての依存関係をインストールします。

```sh
npm run serve
```

`pre`フックと` post`フックを実行し、ホットリロードWebサーバーを起動します。 URLについては、このコマンドの出力を参照してください(多くの場合、https://localhost:8080です)。

ドキュメントを静的Webサイトとしてビルドするには、 `npm runbuild`を実行します。 Webサイトは `.vuepress/dist`ディレクトリにあります。

## 検索

TODO:更新または削除

全文検索を強化するために[Algolia](https://www.algolia.com)を使用しています。これは、 `config.js`のパブリックAPI検索専用キーと[cosmos_network.json](https://github.com/algolia/docsearch-configs/blob/master/configs/cosmos_network.json)を使用しますPRで更新できる構成ファイル。

## 一貫性

ビルドプロセスは(ここに含まれる情報と同様に)同一であるため、このファイルは次のように同期を維持する必要があります。
[Cosmos SDKリポジトリのカウンターパート](https://github.com/cosmos/cosmos-sdk/tree/master/docs/DOCS_README.md)で可能な限り。

### RPCドキュメントを更新してビルドする

1.ルートディレクトリで次のコマンドを実行して、swagger-ui生成ツールをインストールします。
   ```bash
   make tools
   ```
2.APIドキュメントを編集します
    1. APIドキュメントを手動で直接編集します: `client/lcd/swagger-ui/swagger.yaml`。
    2. [Swagger Editor](https://editor.swagger.io/)内でAPIドキュメントを編集します。 `.yaml`の正しい構造については、この[ドキュメント](https://swagger.io/docs/specification/2-0/basic-structure/)を参照してください。
3. `swagger.yaml`をダウンロードし、fold` client/lcd/swagger-ui`の下にある古い` swagger.yaml`を置き換えます。
4.simdをコンパイルします
   ```bash
   make install
   ```
