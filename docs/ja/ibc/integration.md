# 統合

IBCをアプリケーションに統合し、データパケットを他のチェーンに送信する方法を学びます。 {synopsis}

このドキュメントでは、[IBCを統合および構成するために必要な手順の概要を説明します。
モジュール](https://github.com/cosmos/ibc-go/tree/main/modules/core)をCosmosSDKアプリケーションに追加します
代替可能なトークン転送を他のチェーンに送信します。

## IBCモジュールの統合

IBCモジュールをSDKベースのアプリケーションに統合するのは簡単です。一般的な変更は、次の手順で要約できます。

-必要なモジュールを `module.BasicManager`に追加します
-`App`タイプの新しいモジュール用に追加の `Keeper`フィールドを定義します
-モジュールの `StoreKeys`を追加し、` Keepers`を初期化します
-`ibc`モジュールに対応するルーターとルートを設定します
-モジュールをモジュール `Manager`に追加します
-モジュールを `Begin/EndBlockers`と` InitGenesis`に追加します
-モジュール `SimulationManager`を更新して、シミュレーションを有効にします

###モジュール `BasicManager`および` ModuleAccount`権限

最初のステップは、次のモジュールを `BasicManager`に追加することです。`x/capability`、` x/ibc`、
および `x/ibc-transfer`。その後、 `Minter`と` Burner`の権限を付与する必要があります
中継されたトークンを作成して書き込むための `ibc-transfer``ModuleAccount`。

```go
//app.go
var (

  ModuleBasics = module.NewBasicManager(
   //...
    capability.AppModuleBasic{},
    ibc.AppModuleBasic{},
    transfer.AppModuleBasic{},//i.e ibc-transfer module
  )

 //module account permissions
  maccPerms = map[string][]string{
   //other module accounts permissions
   //...
    ibctransfertypes.ModuleName:    {authtypes.Minter, authtypes.Burner},
)
```

### Application fields

次に、次のように「キーパー」を登録する必要があります。

```go
//app.go
type App struct {
 //baseapp, keys and subspaces definitions

 //other keepers
 //...
  IBCKeeper        *ibckeeper.Keeper//IBC Keeper must be a pointer in the app, so we can SetRouter on it correctly
  TransferKeeper   ibctransferkeeper.Keeper//for cross-chain fungible token transfers

 //make scoped keepers public for test purposes
  ScopedIBCKeeper      capabilitykeeper.ScopedKeeper
  ScopedTransferKeeper capabilitykeeper.ScopedKeeper

 ///...
 ///module and simulation manager definitions
}
```

### `キーパー`を設定します

初期化中、IBC `Keepers`(` x/ibc`の場合、および
`x/ibc-transfer`モジュール)、機能モジュールを介して特定の機能を付与する必要があります
各IBCのオブジェクト機能権限を認証できるようにするための `ScopedKeepers`
チャネル。

```go
func NewApp(...args) *App {
 //define codecs and baseapp

 //add capability keeper and ScopeToModule for ibc module
  app.CapabilityKeeper = capabilitykeeper.NewKeeper(appCodec, keys[capabilitytypes.StoreKey], memKeys[capabilitytypes.MemStoreKey])

 //grant capabilities for the ibc and ibc-transfer modules
  scopedIBCKeeper := app.CapabilityKeeper.ScopeToModule(ibchost.ModuleName)
  scopedTransferKeeper := app.CapabilityKeeper.ScopeToModule(ibctransfertypes.ModuleName)

 //... other modules keepers

 //Create IBC Keeper
  app.IBCKeeper = ibckeeper.NewKeeper(
  appCodec, keys[ibchost.StoreKey], app.StakingKeeper, scopedIBCKeeper,
  )

 //Create Transfer Keepers
  app.TransferKeeper = ibctransferkeeper.NewKeeper(
    appCodec, keys[ibctransfertypes.StoreKey],
    app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
    app.AccountKeeper, app.BankKeeper, scopedTransferKeeper,
  )
  transferModule := transfer.NewAppModule(app.TransferKeeper)

 //.. continues
}
```

### `キーパー`を設定します

初期化中、IBC `Keepers`(` x/ibc`の場合、および
`x/ibc-transfer`モジュール)、機能モジュールを介して特定の機能を付与する必要があります
各IBCのオブジェクト機能権限を認証できるようにするための `ScopedKeepers`
チャネル。

```go
//app.go
func NewApp(...args) *App {
 //.. continuation from above

 //Create static IBC router, add ibc-tranfer module route, then set and seal it
  ibcRouter := port.NewRouter()
  ibcRouter.AddRoute(ibctransfertypes.ModuleName, transferModule)
 //Setting Router will finalize all routes by sealing router
 //No more routes can be added
  app.IBCKeeper.SetRouter(ibcRouter)

 //.. continues
```

### モジュールマネージャー

IBCを使用するには、アプリケーションが[simulations](https://github.com/cosmos/cosmos-sdk/blob/)をサポートしている場合に備えて、モジュール `Manager`と` SimulationManager`に新しいモジュールを追加する必要があります。 master/docs/building-modules/Simulator.md)。

```go
//app.go
func NewApp(...args) *App {
 //.. continuation from above

  app.mm = module.NewManager(
   //other modules
   //...
    capability.NewAppModule(appCodec, *app.CapabilityKeeper),
    ibc.NewAppModule(app.IBCKeeper),
    transferModule,
  )

 //...

  app.sm = module.NewSimulationManager(
   //other modules
   //...
    capability.NewAppModule(appCodec, *app.CapabilityKeeper),
    ibc.NewAppModule(app.IBCKeeper),
    transferModule,
  )

 //.. continues
```

### アプリケーションABCIの注文

IBCからの1つの追加は、ステーキングモジュールに保存される `HistoricalEntries`の概念です。
各エントリには、保存されているこのチェーンの `Header`と` ValidatorSet`の履歴情報が含まれています
`BeginBlock`呼び出し中の各高さで。 履歴情報は、内省するために必要です
ライトクライアント `ConsensusState`を検証するために、任意の高さでの過去の履歴情報
接続ハンドヘイク。

IBCモジュールには
[`BeginBlock`](https://github.com/cosmos/ibc-go/blob/main/modules/core/02-client/abci.go)ロジックとして
良い。 アプリケーションが[localhostを使用する場合にのみ必要になるため、これはオプションです。
クライアント](https://github.com/cosmos/ibc/blob/master/spec/client/ics-009-loopback-client)2つを接続します
同じチェーンからの異なるモジュール。

::: ヒント
アプリケーションで使用する場合にのみ、ibcモジュールを `SetOrderBeginBlockers`に登録してください。
localhost(_aka_ loopback)クライアント。
:::

```go
//app.go
func NewApp(...args) *App {
 //.. continuation from above

 //add staking and ibc modules to BeginBlockers
  app.mm.SetOrderBeginBlockers(
   //other modules ...
    stakingtypes.ModuleName, ibchost.ModuleName,
  )

 //...

 //NOTE: Capability module must occur first so that it can initialize any capabilities
 //so that other modules that want to create or claim capabilities afterwards in InitChain
 //can do so safely.
  app.mm.SetOrderInitGenesis(
    capabilitytypes.ModuleName,
   //other modules ...
    ibchost.ModuleName, ibctransfertypes.ModuleName,
  )

 //.. continues
```

::: 警告
**重要**:機能モジュールは、 `SetOrderInitGenesis`で最初に宣言する必要があります**
:::

それでおしまい！ これで、IBCモジュールが配線され、代替可能なトークンを送信できるようになりました。
異なるチェーン。 変更の全体像を知りたい場合は、SDKを調べてください。
[`SimApp`](https://github.com/cosmos/ibc-go/blob/main/testing/simapp/app.go)。

## 次へ{hide}

アプリケーション用の[カスタムIBCモジュール](./apps.md)を作成する方法について学習します{hide}