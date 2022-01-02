# 更新文档

如果您想更新文档，请在 ibc-go 上打开一个 pr。

## 翻译

- 文档翻译位于 `docs/country-code/` 文件夹中，其中 `country-code` 代表所使用语言的国家代码(`cn` 代表中文，`kr` 代表韩国，`fr` 代表法国， ……)。
- 始终翻译“main”上的内容。
- 在翻译文件夹的自述文件中指定翻译的版本/标签。每次更新翻译时更新版本/标签。

## 文档构建工作流

IBC-Go 的文档托管在 https://ibc.cosmos.network。

从此(`/docs`)目录中的文件构建
[主要](https://github.com/cosmos/ibc-go/tree/main/docs)。

### 怎么运行的

有一个 CircleCI 作业监听 `/docs` 目录中的变化，在
`main` 分支。此目录中文件的任何更新
在该分支上将自动触发网站部署。在引擎盖下，
私有网站存储库有一个由该存储库中的 CircleCI 作业使用的 `make build-docs` 目标。

## 自述文件

[README.md](./README.md) 也是文档的登陆页面
在网站上。在 Jenkins 构建期间，当前提交被添加到底部
的自述文件。

## Config.js

[config.js](./.vuepress/config.js) 生成侧边栏和目录
在网站文档上。注意相对链接的使用和省略
文件扩展名。附加功能可用于改善外观
的侧边栏。

## 链接

**注意:** 强烈考虑现有链接 - 都在此目录中
和网站文档 - 移动或删除文件时。

相对链接应该在几乎所有地方使用，发现并权衡了以下内容:

### 相对的

相对于当前文件，另一个文件在哪里？

- 适用于 GitHub 和 VuePress 构建
- 令人困惑/烦人的事情是:`../../../../myfile.md`
- 重新混洗文件时需要更多更新

### 绝对

鉴于回购的根目录，另一个文件在哪里？

- 适用于 GitHub，不适用于 VuePress 构建
- 这更好:`/docs/hereitis/myfile.md`
- 如果你移动那个文件，里面的链接会被保留(当然不是它的链接)

### 满的

文件或目录的完整 GitHub URL。在有意义的时候偶尔使用
将用户发送到 GitHub。

## 本地构建

确保您在 `docs` 目录中并运行以下命令:

```sh
rm -rf node_modules
```

此命令将删除旧版本的视觉主题和所需的包。 此步骤是可选的。

```sh
npm install
```

Install the theme and all dependencies.

```sh
npm run serve
```

## 搜索

TODO:更新或删除

我们正在使用 [Algolia](https://www.algolia.com) 来支持全文搜索。这使用了`config.js` 中的公共 API 仅搜索密钥以及 [cosmos_network.json](https://github.com/algolia/docsearch-configs/blob/master/configs/cosmos_network.json)我们可以用 PR 更新的配置文件。

## 一致性

因为构建过程是相同的(正如这里包含的信息)，这个文件应该保持同步，因为
尽可能使用它的 [Cosmos SDK 存储库中的对应物](https://github.com/cosmos/cosmos-sdk/tree/master/docs/DOCS_README.md)。

### 更新和构建 RPC 文档

1、在根目录执行以下命令安装swagger-ui生成工具。
   ```bash
   make tools
   ```
2. 编辑 API 文档
    1.直接手动编辑API文档:`client/lcd/swagger-ui/swagger.yaml`。
    2. 在 [Swagger Editor](https://editor.swagger.io/) 中编辑 API 文档。 请参阅此 [文档](https://swagger.io/docs/specification/2-0/basic-structure/) 以了解 `.yaml` 中的正确结构。
3.下载`swagger.yaml`并替换折叠`client/lcd/swagger-ui`下的旧`swagger.yaml`。
4. 编译simd
   ```bash
   make install
   ```
