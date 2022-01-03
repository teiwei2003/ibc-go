＃ 一体化

了解如何将 IBC 集成到您的应用程序并将数据包发送到其他链。 {概要}

本文档概述了集成和配置 [IBC
模块](https://github.com/cosmos/ibc-go/tree/main/modules/core) 到您的 Cosmos SDK 应用程序和
将可替代的代币转移发送到其他链。

## 集成IBC模块

将 IBC 模块集成到您的基于 SDK 的应用程序非常简单。一般的变化可以概括为以下步骤：

- 将所需的模块添加到`module.BasicManager`
- 为`App` 类型的新模块定义额外的`Keeper` 字段
- 添加模块的`StoreKeys`并初始化它们的`Keepers`
- 为 `ibc` 模块设置相应的路由器和路由
- 将模块添加到模块`Manager`
- 将模块添加到`Begin/EndBlockers` 和`InitGenesis`
- 更新模块“SimulationManager”以启用模拟

### 模块`BasicManager` 和`ModuleAccount` 权限

第一步是将以下模块添加到`BasicManager`：`x/capability`、`x/ibc`、
和`x/ibc-transfer`。之后，我们需要授予`Minter`和`Burner`权限
`ibc-transfer``ModuleAccount` 用于铸造和销毁中继代币。

```go
// app.go
var (

  ModuleBasics = module.NewBasicManager(
    // ...
    capability.AppModuleBasic{},
    ibc.AppModuleBasic{},
    transfer.AppModuleBasic{}, // i.e ibc-transfer module
  )

  // module account permissions
  maccPerms = map[string][]string{
    // other module accounts permissions
    // ...
    ibctransfertypes.ModuleName:    {authtypes.Minter, authtypes.Burner},
)
```

### Application fields

然后，我们需要按如下方式注册`Keepers`：

```go
// app.go
type App struct {
  // baseapp, keys and subspaces definitions

  // other keepers
  // ...
  IBCKeeper        *ibckeeper.Keeper // IBC Keeper must be a pointer in the app, so we can SetRouter on it correctly
  TransferKeeper   ibctransferkeeper.Keeper // for cross-chain fungible token transfers

  // make scoped keepers public for test purposes
  ScopedIBCKeeper      capabilitykeeper.ScopedKeeper
  ScopedTransferKeeper capabilitykeeper.ScopedKeeper

  /// ...
  /// module and simulation manager definitions
}
```

### Configure the `Keepers`

在初始化期间，除了初始化 IBC `Keepers`（对于 `x/ibc`，以及
`x/ibc-transfer` 模块），我们需要通过能力模块授予特定的能力
`ScopedKeepers` 以便我们可以验证每个 IBC 的对象能力权限
渠道。

```go
func NewApp(...args) *App {
  // define codecs and baseapp

  // add capability keeper and ScopeToModule for ibc module
  app.CapabilityKeeper = capabilitykeeper.NewKeeper(appCodec, keys[capabilitytypes.StoreKey], memKeys[capabilitytypes.MemStoreKey])

  // grant capabilities for the ibc and ibc-transfer modules
  scopedIBCKeeper := app.CapabilityKeeper.ScopeToModule(ibchost.ModuleName)
  scopedTransferKeeper := app.CapabilityKeeper.ScopeToModule(ibctransfertypes.ModuleName)

  // ... other modules keepers

  // Create IBC Keeper
  app.IBCKeeper = ibckeeper.NewKeeper(
  appCodec, keys[ibchost.StoreKey], app.StakingKeeper, scopedIBCKeeper,
  )

  // Create Transfer Keepers
  app.TransferKeeper = ibctransferkeeper.NewKeeper(
    appCodec, keys[ibctransfertypes.StoreKey],
    app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
    app.AccountKeeper, app.BankKeeper, scopedTransferKeeper,
  )
  transferModule := transfer.NewAppModule(app.TransferKeeper)

  // .. continues
}
```

### 注册`路由器`

IBC 需要知道哪个模块绑定到哪个端口，以便它可以将数据包路由到
适当的模块并调用适当的回调。 端口到模块名称的映射由
IBC 的港口“Keeper”。 但是，模块名称到相关回调的映射已经完成
由港口
[`Router`](https://github.com/cosmos/ibc-go/blob/main/modules/core/05-port/types/router.go) 在
IBC 模块。

添加模块路由允许 IBC 处理程序在处理一个
通道握手或数据包。

目前，`Router` 是静态的，因此必须在应用程序初始化时对其进行初始化和正确设置。
一旦设置了`Router`，就不能添加新的路由。

```go
// app.go
func NewApp(...args) *App {
  // .. continuation from above

  // Create static IBC router, add ibc-tranfer module route, then set and seal it
  ibcRouter := port.NewRouter()
  ibcRouter.AddRoute(ibctransfertypes.ModuleName, transferModule)
  // Setting Router will finalize all routes by sealing router
  // No more routes can be added
  app.IBCKeeper.SetRouter(ibcRouter)

  // .. continues
```

### Module Managers

为了使用 IBC，我们需要将新模块添加到模块 `Manager` 和 `SimulationManager`，以防您的应用程序支持 [simulations](https://github.com/cosmos/cosmos-sdk/blob/ master/docs/building-modules/simulator.md）。

```go
// app.go
func NewApp(...args) *App {
  // .. continuation from above

  app.mm = module.NewManager(
    // other modules
    // ...
    capability.NewAppModule(appCodec, *app.CapabilityKeeper),
    ibc.NewAppModule(app.IBCKeeper),
    transferModule,
  )

  // ...

  app.sm = module.NewSimulationManager(
    // other modules
    // ...
    capability.NewAppModule(appCodec, *app.CapabilityKeeper),
    ibc.NewAppModule(app.IBCKeeper),
    transferModule,
  )

  // .. continues
```

### 应用 ABCI 订购

IBC 的一项新增功能是存储在 staking 模块中的“HistoricalEntries”概念。
每个条目都包含此链的“Header”和“ValidatorSet”的历史信息，这些信息被存储
在“BeginBlock”调用期间的每个高度。 需要历史信息来反省
过去在任何给定高度的历史信息，以便在此期间验证轻客户端“ConsensusState”
连接握手。

IBC 模块还具有
[`BeginBlock`](https://github.com/cosmos/ibc-go/blob/main/modules/core/02-client/abci.go) 逻辑为
好。 这是可选的，因为只有在您的应用程序使用 [localhost
客户端](https://github.com/cosmos/ibc/blob/master/spec/client/ics-009-loopback-client) 连接两个
来自同一链的不同模块。

：：： 小费
如果您的应用程序将使用
本地主机（_aka_ 环回）客户端。
:::

```go
// app.go
func NewApp(...args) *App {
  // .. continuation from above

  // add staking and ibc modules to BeginBlockers
  app.mm.SetOrderBeginBlockers(
    // other modules ...
    stakingtypes.ModuleName, ibchost.ModuleName,
  )

  // ...

  // NOTE: Capability module must occur first so that it can initialize any capabilities
  // so that other modules that want to create or claim capabilities afterwards in InitChain
  // can do so safely.
  app.mm.SetOrderInitGenesis(
    capabilitytypes.ModuleName,
    // other modules ...
    ibchost.ModuleName, ibctransfertypes.ModuleName,
  )

  // .. continues
```

：：： 警告
**重要**：功能模块**必须**在`SetOrderInitGenesis`中首先声明
:::

而已！ 您现在已经连接了 IBC 模块，现在可以发送可替代的代币
不同的链。 如果您想更广泛地了解更改，请查看 SDK 的
[`SimApp`](https://github.com/cosmos/ibc-go/blob/main/testing/simapp/app.go)。

## 下一个{hide}

了解如何为您的应用程序创建 [自定义 IBC 模块](./apps.md) {hide}