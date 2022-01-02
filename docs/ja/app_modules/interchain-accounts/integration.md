# チェーン間アカウントをチェーンに統合する

チェーン間アカウントのホストとコントローラーの機能をチェーンに統合する方法を学びます。次のドキュメントは、CosmosSDKチェーンにのみ適用されます。

Interchain Accountsモジュールには、2つのサブモジュールが含まれています。各サブモジュールには、独自のIBCアプリケーションがあります。チェーン間アカウントモジュールは、すべてのSDKモジュールがチェーンに登録されるのと同じ方法で「AppModule」として登録する必要がありますが、各サブモジュールは必要に応じて独自の「IBCModule」を作成する必要があります。使用するサブモジュールごとに、ルートをIBCルーターに追加する必要があります。

ICS27をサポートしたいチェーンは、ホストチェーン、コントローラーチェーン、またはその両方として機能することを選択できます。ホストまたはコントローラーの機能の無効化は、ホストまたはコントローラーモジュールを `app.go`ファイルから完全に除外することで静的に行うことも、ホストまたはコントローラーのサブモジュールを有効または無効にするオンチェーンパラメーターを利用して動的に行うこともできます。

チェーン間アカウント認証モジュールは、ミドルウェアスタックの基本アプリケーションです。コントローラサブモジュールは、このスタックのミドルウェアです。


### 統合の例

```go
//app.go

//Register the AppModule for the Interchain Accounts module and the authentication module
//Note: No `icaauth` exists, this must be substituted with an actual Interchain Accounts authentication module
ModuleBasics = module.NewBasicManager(
    ...
    ica.AppModuleBasic{},
    icaauth.AppModuleBasic{},
    ...
)

... 

//Add module account permissions for the Interchain Accounts module
//Only necessary for host chain functionality
//Each Interchain Account created on the host chain is derived from the module account created
maccPerms = map[string][]string{
    ...
    icatypes.ModuleName:            nil,
}

...

//Add Interchain Accounts Keepers for each submodule used and the authentication module
//If a submodule is being statically disabled, the associated Keeper does not need to be added. 
type App struct {
    ...

    ICAControllerKeeper icacontrollerkeeper.Keeper
    ICAHostKeeper       icahostkeeper.Keeper
    ICAAuthKeeper       icaauthkeeper.Keeper

    ...
}

...

//Create store keys for each submodule Keeper and the authentication module
keys := sdk.NewKVStoreKeys(
    ...
    icacontrollertypes.StoreKey,
    icahosttypes.StoreKey,
    icaauthtypes.StoreKey,
    ...
)

... 

//Create the scoped keepers for each submodule keeper and authentication keeper
scopedICAControllerKeeper := app.CapabilityKeeper.ScopeToModule(icacontrollertypes.SubModuleName)
scopedICAHostKeeper := app.CapabilityKeeper.ScopeToModule(icahosttypes.SubModuleName)
scopedICAAuthKeeper := app.CapabilityKeeper.ScopeToModule(icaauthtypes.ModuleName)

...

//Create the Keeper for each submodule
app.ICAControllerKeeper = icacontrollerkeeper.NewKeeper(
		appCodec, keys[icacontrollertypes.StoreKey], app.GetSubspace(icacontrollertypes.SubModuleName),
		app.IBCKeeper.ChannelKeeper,//may be replaced with middleware such as ics29 fee
		app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
		app.AccountKeeper, scopedICAControllerKeeper, app.MsgServiceRouter(),
)
app.ICAHostKeeper = icahostkeeper.NewKeeper(
		appCodec, keys[icahosttypes.StoreKey], app.GetSubspace(icahosttypes.SubModuleName),
		app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
		app.AccountKeeper, scopedICAHostKeeper, app.MsgServiceRouter(),
)

//Create Interchain Accounts AppModule
icaModule := ica.NewAppModule(&app.ICAControllerKeeper, &app.ICAHostKeeper)

//Create your Interchain Accounts authentication module
app.ICAAuthKeeper = icaauthkeeper.NewKeeper(appCodec, keys[icaauthtypes.StoreKey], app.ICAControllerKeeper, scopedICAAuthKeeper)

//ICA auth AppModule
icaAuthModule := icaauth.NewAppModule(appCodec, app.ICAAuthKeeper)

//ICA auth IBC Module
ICAAuthIBCModule := icaauth.NewIBCModule(app.ICAAuthKeeper)

//Create host and controller IBC Modules as desired
icaControllerIBCModule := icacontroller.NewIBCModule(app.ICAControllerKeeper, icaAuthIBCModule)
icaHostIBCModule := icahost.NewIBCModule(app.ICAHostKeeper)

//Register host and authentication routes
ibcRouter.AddRoute(icacontrollertypes.SubModuleName, icaControllerIBCModule).
		AddRoute(icahosttypes.SubModuleName, icaHostIBCModule).
		AddRoute(icaauthtypes.ModuleName, icaControllerIBCModule)//Note, the authentication module is routed to the top level of the middleware stack

...

//Register Interchain Accounts and authentication module AppModule's
app.moduleManager = module.NewManager(
    ...
    icaModule,
    icaAuthModule,
)

...

//Add Interchain Accounts module InitGenesis logic
app.mm.SetOrderInitGenesis(
    ...
    icatypes.ModuleName,
    ...
)
```

## パラメーター

Interchain Accountsモジュールには、個別のサブモジュールごとに論理的に分離された次のオンチェーンパラメータが含まれています。

###コントローラーサブモジュールパラメーター

| Key                    | Type | Default Value |
|------------------------|------|---------------|
| `ControllerEnabled`    | bool | `true`        |

#### ControllerEnabled

`ControllerEnabled`パラメータは、ICS-27コントローラ固有のロジックにサービスを提供するチェーン機能を制御します。 これには、チェーン間アカウントのパケットデータの送信と、次のICS-26コールバックハンドラーが含まれます。
-`OnChanOpenInit`
-`OnChanOpenAck`
-`OnChanCloseConfirm`
-`OnAcknowledgementPacket`
-`OnTimeoutPacket`

### ホストサブモジュールパラメータ

| Key                    | Type     | Default Value |
|------------------------|----------|---------------|
| `HostEnabled`          | bool     | `true`        |
| `AllowMessages`        | []string | `[]`          |

#### HostEnabled

`HostEnabled`パラメータは、ICS27ホスト固有のロジックにサービスを提供するチェーン機能を制御します。 これには、次のICS-26コールバックハンドラーが含まれます。
-`OnChanOpenTry`
-`OnChanOpenConfirm`
-`OnChanCloseConfirm`
-`OnRecvPacket`

#### AllowMessages

`AllowMessages`パラメータは、ProtobufメッセージTypeURL形式を使用して許可リストを定義することにより、チェーンが促進することを選択したメッセージまたはトランザクションのタイプを制限する機能を提供します。

たとえば、ホストされたチェーン間アカウントにガバナンスの投票とステーキングの委任の機能を提供することを選択したCosmos SDKベースのチェーンは、そのパラメーターを次のように定義します。

```
"params": {
    "host_enabled": true,
    "allow_messages": ["/cosmos.staking.v1beta1.MsgDelegate", "/cosmos.gov.v1beta1.MsgVote"]
}
```