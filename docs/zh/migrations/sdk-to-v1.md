# 迁移到 ibc-go

此文件包含有关如何根据 0.44 SDK 版本从包含在 SDK 0.41.x 和 0.42.x 行中的 IBC 模块迁移到 ibc-go 存储库中的 IBC 模块的信息。

## 导入更改

最明显的变化是导入名称的变化。 我们需要改变:
- 应用程序 -> 应用程序
- cosmos-sdk/x/ibc -> ibc-go

在我的基于 GNU/Linux 的机器上，我使用了以下命令，按顺序执行:
```
grep -RiIl 'cosmos-sdk\/x\/ibc\/applications' | xargs sed -i 's/cosmos-sdk\/x\/ibc\/applications/ibc-go\/modules\/apps/g'
```

```
grep -RiIl 'cosmos-sdk\/x\/ibc' | xargs sed -i 's/cosmos-sdk\/x\/ibc/ibc-go\/modules/g'
```

ref: [以上命令说明](https://www.internalpointers.com/post/linux-find-and-replace-text-multiple-files)

乱序执行这些命令会导致问题。

随意使用您自己的方法来修改导入名称。

注意:更新到 `v0.44.0` SDK 版本然后运行 ​​`go mod tidy` 将导致降级到 `v0.42.0` 以支持旧的 IBC 导入路径。
在运行 `go mod tidy` 之前更新导入路径。

## 链升级

链可以选择通过升级提议或创世升级来升级。支持就地存储迁移和创世迁移。

**警告**:在升级您的链之前，请至少阅读 [IBC 客户端升级](../ibc/upgrades/README.md) 的快速指南。强烈建议您不要在升级过程中更改链 ID，否则您必须遵循 IBC 客户端升级说明。

就地存储迁移和创世迁移都将:
- 将单机客户端状态从 v1 迁移到 v2 protobuf 定义
- 修剪所有单机共识状态
- 修剪所有过期的tendermint共识状态

链必须在就地存储迁移或创世迁移期间设置新的连接参数。新参数最大预期阻塞时间用于在 IBC 数据包流的接收端强制执行数据包处理延迟。查看 [docs](https://github.com/cosmos/ibc-go/blob/release/v1.0.x/docs/ibc/proto-docs.md#params-2) 了解更多信息。

### 就地存储迁移

新的链二进制文件需要在升级处理程序中运行迁移。 IBC 模块的 fromVM(以前的模块版本)应为 1。这将允许为 IBC 将版本从 1 更新到 2 运行迁移。
Ex:
```go
app.UpgradeKeeper.SetUpgradeHandler("my-upgrade-proposal",
        func(ctx sdk.Context, _ upgradetypes.Plan, _ module.VersionMap) (module.VersionMap, error) {
            // set max expected block time parameter. Replace the default with your expected value
            // https://github.com/cosmos/ibc-go/blob/release/v1.0.x/docs/ibc/proto-docs.md#params-2
            app.IBCKeeper.ConnectionKeeper.SetParams(ctx, ibcconnectiontypes.DefaultParams())

            fromVM := map[string]uint64{
                ... // other modules
                "ibc":          1,
                ... 
            }   
            return app.mm.RunMigrations(ctx, app.configurator, fromVM)
        })      

```

### Genesis 迁移

要执行创世迁移，必须将以下代码添加到您现有的迁移代码中。

```go
// add imports as necessary
import (
    ibcv100 "github.com/cosmos/ibc-go/modules/core/legacy/v100"
    ibchost "github.com/cosmos/ibc-go/modules/core/24-host"
)

...

// add in migrate cmd function
// expectedTimePerBlock is a new connection parameter
// https://github.com/cosmos/ibc-go/blob/release/v1.0.x/docs/ibc/proto-docs.md#params-2
newGenState, err = ibcv100.MigrateGenesis(newGenState, clientCtx, *genDoc, expectedTimePerBlock)
if err != nil {
    return err 
}
```

**注意:** 必须在迁移 IBC 之前更新创世链 id、时间和高度，否则将不会修剪 Tendermint 共识状态。


## IBC 守门员变更

IBC Keeper 现在接受升级 Keeper。 请在 Staking Keeper 之后添加链的升级 Keeper:

```diff
        // Create IBC Keeper
        app.IBCKeeper = ibckeeper.NewKeeper(
-               appCodec, keys[ibchost.StoreKey], app.GetSubspace(ibchost.ModuleName), app.StakingKeeper, scopedIBCKeeper,
+               appCodec, keys[ibchost.StoreKey], app.GetSubspace(ibchost.ModuleName), app.StakingKeeper, app.UpgradeKeeper, scopedIBCKeeper,
        )

``` 

## 提案

### 更新客户端提案

`UpdateClient` 已被修改为接受两个客户端标识符和一个初始高度。 请参阅 [文档](../ibc/proposals.md) 了解更多信息。

### 升级提案

添加了一个新的 IBC 提案类型，`UpgradeProposal`。 这将处理 IBC(破坏性)升级。
升级“计划”中先前的“UpgradedClientState”字段已被弃用，取而代之的是这种新的提案类型。

### 提案处理程序注册

`ClientUpdateProposalHandler` 已重命名为 `ClientProposalHandler`。
它同时处理“UpdateClientProposal”和“UpgradeProposal”。

添加此导入:

```diff
+       ibcclienttypes "github.com/cosmos/ibc-go/modules/core/02-client/types"
```

请确保治理模块添加了正确的路由:

```diff
-               AddRoute(ibchost.RouterKey, ibcclient.NewClientUpdateProposalHandler(app.IBCKeeper.ClientKeeper))
+               AddRoute(ibcclienttypes.RouterKey, ibcclient.NewClientProposalHandler(app.IBCKeeper.ClientKeeper))
```

注意:Simapp 注册在 0.41.x 版本中不正确。 `UpdateClient` 提议处理程序应该使用属于 `ibc-go/core/02-client/types` 的路由器密钥注册
如上面的差异所示。

### 提案 CLI 注册

请通过将以下参数添加到 `gov.NewAppModuleBasic()` 来确保在治理模块上注册了两个提案类型的 CLI 命令:

添加以下导入:
```diff
+       ibcclientclient "github.com/cosmos/ibc-go/modules/core/02-client/client"
```

Register the cli commands: 

```diff 
       gov.NewAppModuleBasic(
             paramsclient.ProposalHandler, distrclient.ProposalHandler, upgradeclient.ProposalHandler, upgradeclient.CancelProposalHandler,
+            ibcclientclient.UpdateClientProposalHandler, ibcclientclient.UpgradeProposalHandler,
       ),
```

这些提议不支持 REST 路由。

## 原型文件更改

gRPC 查询器服务端点略有变化。之前的文件使用了 `v1beta1` gRPC 路由，现在已经更新为 `v1`。

单机已将 FrozenSequence uint64 字段替换为 IsFrozen 布尔字段。软件包已从 `v1` 提升到 `v2`

## IBC 回调更改

### OnRecvPacket

应用程序开发人员需要更新他们的 `OnRecvPacket` 回调逻辑。

`OnRecvPacket` 回调已被修改为仅返回确认。返回的确认必须实现“Acknowledgement”接口。确认应通过在“Success()”上返回 true 和在所有其他情况下返回 false 来指示它是否表示对数据包的成功处理。 `Success()` 的返回值 false 将导致回调中发生的所有状态更改都被丢弃。更多信息可以在[文档](https://github.com/cosmos/ibc-go/blob/main/docs/ibc/apps.md#receiving-packets)中找到。

`OnRecvPacket`、`OnAcknowledgementPacket` 和 `OnTimeoutPacket` 回调现在传递给中继 IBC 数据包的中继器的 `sdk.AccAddress`。应用程序可能会使用或忽略此信息。

## IBC 事件更改

`packet_data` 属性已被弃用，取而代之的是 `packet_data_hex`，以提供事件中数据包数据的标准化编码/解码。虽然 `packet_data` 事件仍然存在，强烈建议所有中继器和 IBC 事件消费者尽快切换到使用 `packet_data_hex`。

出于上述相同的原因，`packet_ack` 属性也已被弃用，取而代之的是`packet_ack_hex`。强烈建议所有中继器和 IBC 事件消费者尽快切换到使用 `packet_ack_hex`。

`consensus_height` 属性已在发出的 Misbehavior 事件中删除。 IBC 客户不再有固定的身高，不当行为也不一定有相关的身高。

## 相关 SDK 更改

* (codec) [\#9226](https://github.com/cosmos/cosmos-sdk/pull/9226) 重命名编解码器接口和方法，以遵循通用的 Go 接口:
  * `codec.Marshaler` → `codec.Codec`(这定义了序列化其他对象的对象)
  * `codec.BinaryMarshaler` → `codec.BinaryCodec`
  * `codec.JSONMarshaler` → `codec.JSONCodec`
  * 从`BinaryCodec` 方法中删除了`BinaryBare` 后缀(`MarshalBinaryBare`、`UnmarshalBinaryBare`、...)
  * 从`BinaryCodec` 方法中删除了`Binary` 中缀(`MarshalBinaryLengthPrefixed`、`UnmarshalBinaryLengthPrefixed`、...)