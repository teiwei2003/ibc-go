# 将IBC中间件集成到链中

了解如何将 IBC 中间件与基础应用程序集成到您的链中。以下文档仅适用于 Cosmos SDK 链。

如果中间件维护自己的状态和/或处理 SDK 消息，那么它应该在`app.go` 中的模块管理器中创建和注册它的 SDK 模块**一次**。

所有中间件都必须连接到 IBC 路由器并包裹在底层基础 IBC 应用程序上。一个 IBC 应用程序可能被多层中间件包裹，只有顶层中间件应该挂接到 IBC 路由器，所有底层中间件和应用程序都被它包裹起来。

中间件的顺序**很重要**，从 IBC 到应用程序的函数调用从顶层中间件到底层中间件再到应用程序。从应用程序到 IBC 的函数调用经过底部中间件，然后到达顶部中间件，然后到达核心 IBC 处理程序。因此同一组中间件放在不同的顺序可能会产生不同的效果。

### 示例集成

```go
// app.go

// middleware 1 and middleware 3 are stateful middleware, 
// perhaps implementing separate sdk.Msg and Handlers
mw1Keeper := mw1.NewKeeper(storeKey1)
mw3Keeper := mw3.NewKeeper(storeKey3)

// Only create App Module **once** and register in app module
// if the module maintains independent state and/or processes sdk.Msgs
app.moduleManager = module.NewManager(
    ...
    mw1.NewAppModule(mw1Keeper),
    mw3.NewAppModule(mw3Keeper),
    transfer.NewAppModule(transferKeeper),
    custom.NewAppModule(customKeeper)
)

mw1IBCModule := mw1.NewIBCModule(mw1Keeper)
mw2IBCModule := mw2.NewIBCModule() // middleware2 is stateless middleware
mw3IBCModule := mw3.NewIBCModule(mw3Keeper)

scopedKeeperTransfer := capabilityKeeper.NewScopedKeeper("transfer")
scopedKeeperCustom1 := capabilityKeeper.NewScopedKeeper("custom1")
scopedKeeperCustom2 := capabilityKeeper.NewScopedKeeper("custom2")

// NOTE: IBC Modules may be initialized any number of times provided they use a separate
// scopedKeeper and underlying port.

// initialize base IBC applications
// if you want to create two different stacks with the same base application,
// they must be given different scopedKeepers and assigned different ports.
transferIBCModule := transfer.NewIBCModule(transferKeeper, scopedKeeperTransfer)
customIBCModule1 := custom.NewIBCModule(customKeeper, scopedKeeperCustom1, "portCustom1")
customIBCModule2 := custom.NewIBCModule(customKeeper, scopedKeeperCustom2, "portCustom2")

// create IBC stacks by combining middleware with base application
// NOTE: since middleware2 is stateless it does not require a Keeper
// stack 1 contains mw1 -> mw3 -> transfer
stack1 := mw1.NewIBCModule(mw1Keeper, mw3.NewIBCModule(mw3Keeper, transferIBCModule))
// stack 2 contains mw3 -> mw2 -> custom1
stack2 := mw3.NewIBCModule(mw3Keeper, mw3.NewIBCModule(customIBCModule1))
// stack 3 contains mw2 -> mw1 -> custom2
stack3 := mw2.NewIBCModule(mw1.NewIBCModule(mw1Keeper, customIBCModule2))

// associate each stack with the moduleName provided by the underlying scopedKeeper
ibcRouter := porttypes.NewRouter()
ibcRouter.AddRoute("transfer", stack1)
ibcRouter.AddRoute("custom1", stack2)
ibcRouter.AddRoute("custom2", stack3)
app.IBCKeeper.SetRouter(ibcRouter)
```

