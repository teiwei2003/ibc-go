# IBCミドルウェアをチェーンに統合する

IBCミドルウェアをベースアプリケーションとチェーンに統合する方法を学びます。次のドキュメントは、CosmosSDKチェーンにのみ適用されます。

ミドルウェアが独自の状態を維持している場合やSDKメッセージを処理している場合は、ミドルウェアを作成して、 `app.go`のモジュールマネージャーに** 1回だけ**登録する必要があります。

すべてのミドルウェアはIBCルーターに接続し、基盤となるベースIBCアプリケーションをラップオーバーする必要があります。 IBCアプリケーションは、ミドルウェアの多くの層によってラップされる可能性があります。最上位層のミドルウェアのみをIBCルーターにフックし、基盤となるすべてのミドルウェアとアプリケーションをIBCルーターにラップする必要があります。

ミドルウェア**の問題**、IBCからアプリケーションへの関数呼び出しの順序は、最上位のミドルウェアから最下位のミドルウェア、そしてアプリケーションに移動します。アプリケーションからIBCへの関数呼び出しは、最下位のミドルウェアを経由して最上位のミドルウェアに到達し、次にコアIBCハンドラーに到達します。したがって、同じミドルウェアのセットを異なる順序で配置すると、異なる効果が生じる可能性があります。

### 統合の例

```go
//app.go

//middleware 1 and middleware 3 are stateful middleware, 
//perhaps implementing separate sdk.Msg and Handlers
mw1Keeper := mw1.NewKeeper(storeKey1)
mw3Keeper := mw3.NewKeeper(storeKey3)

//Only create App Module **once** and register in app module
//if the module maintains independent state and/or processes sdk.Msgs
app.moduleManager = module.NewManager(
    ...
    mw1.NewAppModule(mw1Keeper),
    mw3.NewAppModule(mw3Keeper),
    transfer.NewAppModule(transferKeeper),
    custom.NewAppModule(customKeeper)
)

mw1IBCModule := mw1.NewIBCModule(mw1Keeper)
mw2IBCModule := mw2.NewIBCModule()//middleware2 is stateless middleware
mw3IBCModule := mw3.NewIBCModule(mw3Keeper)

scopedKeeperTransfer := capabilityKeeper.NewScopedKeeper("transfer")
scopedKeeperCustom1 := capabilityKeeper.NewScopedKeeper("custom1")
scopedKeeperCustom2 := capabilityKeeper.NewScopedKeeper("custom2")

//NOTE: IBC Modules may be initialized any number of times provided they use a separate
//scopedKeeper and underlying port.

//initialize base IBC applications
//if you want to create two different stacks with the same base application,
//they must be given different scopedKeepers and assigned different ports.
transferIBCModule := transfer.NewIBCModule(transferKeeper, scopedKeeperTransfer)
customIBCModule1 := custom.NewIBCModule(customKeeper, scopedKeeperCustom1, "portCustom1")
customIBCModule2 := custom.NewIBCModule(customKeeper, scopedKeeperCustom2, "portCustom2")

//create IBC stacks by combining middleware with base application
//NOTE: since middleware2 is stateless it does not require a Keeper
//stack 1 contains mw1 -> mw3 -> transfer
stack1 := mw1.NewIBCModule(mw1Keeper, mw3.NewIBCModule(mw3Keeper, transferIBCModule))
//stack 2 contains mw3 -> mw2 -> custom1
stack2 := mw3.NewIBCModule(mw3Keeper, mw3.NewIBCModule(customIBCModule1))
//stack 3 contains mw2 -> mw1 -> custom2
stack3 := mw2.NewIBCModule(mw1.NewIBCModule(mw1Keeper, customIBCModule2))

//associate each stack with the moduleName provided by the underlying scopedKeeper
ibcRouter := porttypes.NewRouter()
ibcRouter.AddRoute("transfer", stack1)
ibcRouter.AddRoute("custom1", stack2)
ibcRouter.AddRoute("custom2", stack3)
app.IBCKeeper.SetRouter(ibcRouter)
```

