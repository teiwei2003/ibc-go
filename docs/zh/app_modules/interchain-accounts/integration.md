# 将跨链账户集成到链中

了解如何将 Interchain Accounts 主机和控制器功能集成到您的链中。以下文档仅适用于 Cosmos SDK 链。

Interchain Accounts 模块包含两个子模块。每个子模块都有自己的 IBC 应用程序。 Interchain Accounts 模块应该以与所有 SDK 模块在链上注册相同的方式注册为“AppModule”，但每个子模块应根据需要创建自己的“IBCModule”。应该为每个将使用的子模块添加一条路由到 IBC 路由器。

希望支持 ICS27 的链可以选择充当主链、控制器链或两者兼而有之。禁用主机或控制器功能可以通过从“app.go”文件中完全排除主机或控制器模块来静态完成，也可以通过利用启用或禁用主机或控制器子模块的链上参数来动态完成。

Interchain Account 身份验证模块是中间件堆栈的基本应用程序。控制器子模块是此堆栈中的中间件。


### 示例集成

```go
// app.go

// Register the AppModule for the Interchain Accounts module and the authentication module
// Note: No `icaauth` exists, this must be substituted with an actual Interchain Accounts authentication module
ModuleBasics = module.NewBasicManager(
    ...
    ica.AppModuleBasic{},
    icaauth.AppModuleBasic{},
    ...
)

... 

// Add module account permissions for the Interchain Accounts module
// Only necessary for host chain functionality
// Each Interchain Account created on the host chain is derived from the module account created
maccPerms = map[string][]string{
    ...
    icatypes.ModuleName:            nil,
}

...

// Add Interchain Accounts Keepers for each submodule used and the authentication module
// If a submodule is being statically disabled, the associated Keeper does not need to be added. 
type App struct {
    ...

    ICAControllerKeeper icacontrollerkeeper.Keeper
    ICAHostKeeper       icahostkeeper.Keeper
    ICAAuthKeeper       icaauthkeeper.Keeper

    ...
}

...

// Create store keys for each submodule Keeper and the authentication module
keys := sdk.NewKVStoreKeys(
    ...
    icacontrollertypes.StoreKey,
    icahosttypes.StoreKey,
    icaauthtypes.StoreKey,
    ...
)

... 

// Create the scoped keepers for each submodule keeper and authentication keeper
scopedICAControllerKeeper := app.CapabilityKeeper.ScopeToModule(icacontrollertypes.SubModuleName)
scopedICAHostKeeper := app.CapabilityKeeper.ScopeToModule(icahosttypes.SubModuleName)
scopedICAAuthKeeper := app.CapabilityKeeper.ScopeToModule(icaauthtypes.ModuleName)

...

// Create the Keeper for each submodule
app.ICAControllerKeeper = icacontrollerkeeper.NewKeeper(
		appCodec, keys[icacontrollertypes.StoreKey], app.GetSubspace(icacontrollertypes.SubModuleName),
		app.IBCKeeper.ChannelKeeper, // may be replaced with middleware such as ics29 fee
		app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
		app.AccountKeeper, scopedICAControllerKeeper, app.MsgServiceRouter(),
)
app.ICAHostKeeper = icahostkeeper.NewKeeper(
		appCodec, keys[icahosttypes.StoreKey], app.GetSubspace(icahosttypes.SubModuleName),
		app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
		app.AccountKeeper, scopedICAHostKeeper, app.MsgServiceRouter(),
)

// Create Interchain Accounts AppModule
icaModule := ica.NewAppModule(&app.ICAControllerKeeper, &app.ICAHostKeeper)

// Create your Interchain Accounts authentication module
app.ICAAuthKeeper = icaauthkeeper.NewKeeper(appCodec, keys[icaauthtypes.StoreKey], app.ICAControllerKeeper, scopedICAAuthKeeper)

// ICA auth AppModule
icaAuthModule := icaauth.NewAppModule(appCodec, app.ICAAuthKeeper)

// ICA auth IBC Module
ICAAuthIBCModule := icaauth.NewIBCModule(app.ICAAuthKeeper)

// Create host and controller IBC Modules as desired
icaControllerIBCModule := icacontroller.NewIBCModule(app.ICAControllerKeeper, icaAuthIBCModule)
icaHostIBCModule := icahost.NewIBCModule(app.ICAHostKeeper)

// Register host and authentication routes
ibcRouter.AddRoute(icacontrollertypes.SubModuleName, icaControllerIBCModule).
		AddRoute(icahosttypes.SubModuleName, icaHostIBCModule).
		AddRoute(icaauthtypes.ModuleName, icaControllerIBCModule) // Note, the authentication module is routed to the top level of the middleware stack

...

// Register Interchain Accounts and authentication module AppModule's
app.moduleManager = module.NewManager(
    ...
    icaModule,
    icaAuthModule,
)

...

// Add Interchain Accounts module InitGenesis logic
app.mm.SetOrderInitGenesis(
    ...
    icatypes.ModuleName,
    ...
)
```

## Parameters

The Interchain Accounts module contains the following on-chain parameters, logically separated for each distinct submodule:

### Controller Submodule Parameters

| Key                    | Type | Default Value |
|------------------------|------|---------------|
| `ControllerEnabled`    | bool | `true`        |

#### ControllerEnabled

The `ControllerEnabled` parameter controls a chains ability to service ICS-27 controller specific logic. This includes the sending of Interchain Accounts packet data as well as the following ICS-26 callback handlers:
- `OnChanOpenInit`
- `OnChanOpenAck`
- `OnChanCloseConfirm`
- `OnAcknowledgementPacket`
- `OnTimeoutPacket`

### Host Submodule Parameters

| Key                    | Type     | Default Value |
|------------------------|----------|---------------|
| `HostEnabled`          | bool     | `true`        |
| `AllowMessages`        | []string | `[]`          |

#### HostEnabled

`HostEnabled` 参数控制服务 ICS27 主机特定逻辑的链能力。 这包括以下 ICS-26 回调处理程序:
- `OnChanOpenTry`
- `OnChanOpenConfirm`
- `OnChanCloseConfirm`
- `OnRecvPacket`

#### 允许消息

`AllowMessages` 参数为链提供了通过使用 Protobuf 消息 TypeURL 格式定义许可名单来限制它选择促进的消息或交易类型的能力。

例如，一个基于 Cosmos SDK 的链选择为托管的 Interchain Accounts 提供治理投票和 Staking 委托的能力，将定义其参数如下:

```
"params": {
    "host_enabled": true,
    "allow_messages": ["/cosmos.staking.v1beta1.MsgDelegate", "/cosmos.gov.v1beta1.MsgVote"]
}
```