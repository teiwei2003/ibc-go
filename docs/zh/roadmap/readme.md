# 路线图 ibc-go

_最新更新:2021 年 12 月 22 日_

本文件旨在向更广泛的 IBC 社区通报 Interchain GmbH 团队在 ibc-go 上的工作计划和优先事项。它旨在广泛告知所有 ibc-go 用户，包括 IBC、中继器、链和钱包应用程序的开发人员和运营商。

该路线图应被视为高级指南，而不是对时间表和可交付成果的承诺。特异性的程度与时间线成反比。我们将定期更新此文档以反映状态和计划。

发布标签和时间表是根据更新本文档时手头的信息进行的有根据的猜测。由于预测最终版本号(特别是次要和补丁号)可能具有挑战性(因为我们可能需要发布不可预见的安全漏洞补丁或紧急错误修复)，我们使用字母作为占位符。一旦我们接近发布日期，占位符将被替换为正确的数字。举例说明...

让我们假设计划的发布时间表如下所示:
- 在时间`t0`:
  - 带有发布标签“v2.0.a”的“v2.0.x”版本系列的第一个补丁版本。占位符是 `a`，因为这是第一个补丁版本。
  - 带有发布标签“v2.a.0”的“v2.x”发布系列的第一个小版本。占位符是 `a`，因为这是第一个次要版本。
- 在时间`t0 + delta`:
  - `v2.0.x` 发布系列的第二个补丁发布，带有发布标签 `v2.0.b`。占位符是`b`，因为这是`v2.0.a` 之后这个版本系列的下一个补丁版本。
  - 带有发布标签“v2.a.a”的新“v2.a.x”版本系列的第一个补丁版本。补丁版本占位符是“a”，因为这是该系列的第一个补丁版本。

## Q4 - 2021

### 跨链账户

- 完成内部审计中提出的问题。
- 为两次外部审计准备代码库和规范。
- 编写开发人员文档。
- 与 Hermes 中继器和端 2 端测试集成。
- 创建 alpha 版本。

### 中继激励

- 完成实施。
- 更新规范并编写文档。
- 进行内部审计并写出可能出现的问题。

### 将实现与 ICS02 对齐

我们将努力使 ibc-go 实现符合 [ICS02](https://github.com/cosmos/ibc/tree/master/spec/core/ics-002-client-semantics):[#284] (https://github.com/cosmos/ibc-go/issues/284), [#285](https://github.com/cosmos/ibc-go/issues/285), [#286](https ://github.com/cosmos/ibc-go/issues/286), [#594](https://github.com/cosmos/ibc-go/issues/594) 和 [#599](https:/ /github.com/cosmos/ibc-go/issues/599)。 对基于 Wasm 的轻客户端的支持也依赖于这些问题。

### 发布时间表

|Release|Milestone|Date|
|-------|---------|----|
|[`v1.1.0`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.1)||Oct 04, 2021|
|[`v1.2.1`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.1)||Oct 04, 2021|
|[`v2.0.0-rc0`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.0-rc0)|[Link](https://github.com/cosmos/ibc-go/milestone/3)|Oct 05, 2021|
|[`v1.1.2`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.2)||Oct 15, 2021|
|[`v1.2.2`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.2)||Oct 15, 2021|
|[`v1.1.3`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.3)||Nov 09, 2021|
|[`v1.2.3`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.3)||Nov 09, 2021|
|[`v2.0.0`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.0)|[Link](https://github.com/cosmos/ibc-go/milestone/3)|Nov 09, 2021|
|[`v1.1.4`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.5)||Dec 06, 2021|
|[`v1.2.4`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.4)||Dec 06, 2021|
|[`v2.0.1`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.1)|[Link](https://github.com/cosmos/ibc-go/milestone/11)|Dec 06, 2021|
|[`v1.1.5`](https://github.com/cosmos/ibc-go/releases/tag/v1.1.5)||Dec 15, 2021|
|[`v1.2.5`](https://github.com/cosmos/ibc-go/releases/tag/v1.2.5)||Dec 15, 2021|
|[`v2.0.2`](https://github.com/cosmos/ibc-go/releases/tag/v2.0.2)|[Link](https://github.com/cosmos/ibc-go/milestone/20)|Dec 15, 2021|
|[`v3.0.0-alpha1`](https://github.com/cosmos/ibc-go/releases/tag/v3.0.0-alpha1)|[Link](https://github.com/cosmos/ibc-go/milestone/12)|Dec 21, 2021|

## Q1 - 2022

### 跨链账户

- 处理两次外部审计中可能出现的任何问题。
- 创建测试版、候选版本和最终版本。

### 中继激励

- 处理内部审计可能出现的问题。
- 外部审计(可能会出现我们需要在发布前处理的问题)。
- 创建 alpha、beta、发布候选和最终版本。

### 支持基于 Wasm 的轻客户端

有一个开放的[PR](https://github.com/cosmos/ibc-go/pull/208)实现了对基于Wasm的轻客户端的支持，但需要在[ICS28]定稿后更新(https://github.com/cosmos/ibc/tree/master/spec/client/ics-008-wasm-client)规范。 PR 还需要 ibc-go 核心团队成员的最终审查。
 
### 将实现与 ICS02 对齐

- 完成以下工作:[#284](https://github.com/cosmos/ibc-go/issues/284)，[#285](https://github.com/cosmos/ibc-go/issues/ 285), [#286](https://github.com/cosmos/ibc-go/issues/286), [#594](https://github.com/cosmos/ibc-go/issues/594)和 [#599](https://github.com/cosmos/ibc-go/issues/599)。

### 链间安全

- [V1] 的测试网测试(https://github.com/cosmos/gaia/blob/main/docs/interchain-security.md#v1---full-validator-set)。

### 积压问题

- [#545](https://github.com/cosmos/ibc-go/issues/545): 删除`GetTransferAccount` 函数，因为我们从不使用ICS20 转账模块账户(每个托管地址都是作为常规创建的)帐户)。
- [#559](https://github.com/cosmos/ibc-go/issues/559):支持迁移到 SMT 存储所需的更改。这基本上是添加一个新的证明规范，该规范将在与已迁移到 SMT 的链的连接握手期间使用，以验证交易对手链的轻客户端使用正确的证明规范来验证该链的证明。
- 稍后会添加更多内容！

### 发布时间表

#### H1 一月

- [`v3.0.0-beta`](https://github.com/cosmos/ibc-go/milestone/12):`v3.0.0` 的 Beta 版本，包括 Interchain Accounts，Golang 从 `v1. 15` 到 `v1.17`，以及一些核心改进。由于 [#472](https://github.com/cosmos/ibc-go/issues/472)，这是 Go-API 的重大更改。

#### H2 一月

- [`v2.0.a`](https://github.com/cosmos/ibc-go/milestone/14)
- [`v3.0.0-rc0`](https://github.com/cosmos/ibc-go/milestone/12):发布`v3.0.0`的候选0，包括Interchain Accounts，Golang从`v1的更新.15` 到 `v1.17`，以及一些核心改进。由于 [#472](https://github.com/cosmos/ibc-go/issues/472)，这是 Go-API 的重大更改。
- [`v4.0.0-alpha`](https://github.com/cosmos/ibc-go/milestone/16):`v4.0.0` Alpha 版本，包括 Relayer Incentivisation 和带来 ibc-go 实现的问题符合 ICS02(这是 Go-API 的重大更改)。此版本将修复内部审计期间出现的问题。

#### H1 二月

- [`v3.0.0`](https://github.com/cosmos/ibc-go/milestone/12):`v3.0.0` 的最终版本，包括 Interchain Accounts，Golang 从 `v1.15` 的更新到`v1.17`，以及一些核心改进。由于 [#472](https://github.com/cosmos/ibc-go/issues/472)，这是 Go-API 的重大更改。

#### H2 二月

- [`v4.0.0-beta`](https://github.com/cosmos/ibc-go/milestone/16):`v4.0.0` 的 Beta 版本，包括 Relayer Incentivisation 和带来 ibc-go 实现的问题符合 ICS02(这是 Go-API 的重大更改)。此版本将修复外部审计期间出现的问题。

#### H1 三月

- [`v4.0.0-rc0`](https://github.com/cosmos/ibc-go/milestone/16):发布`v4.0.0`的候选0，包括中继激励和ibc-go带来的问题实现符合 ICS02(这是 Go-API 的重大更改)。

#### H2 三月

- [`v4.0.0`](https://github.com/cosmos/ibc-go/milestone/16):`v4.0.0` 的最终版本，包括 Relayer Incentivisation 和使 ibc-go 实现一致的问题使用 ICS02(这是 Go-API 的重大更改)。
- [`v1.a.0`](https://github.com/cosmos/ibc-go/milestone/17):`v1.x` 系列中的次要版本，包括将 Cosmos SDK 更新到 [`v0. 45`](https://github.com/cosmos/cosmos-sdk/milestone/46) 和 Tendermint 到 [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0 .35.0)。
- [`v2.a.0`](https://github.com/cosmos/ibc-go/milestone/18):`v2.x` 系列的次要版本，包括将 Cosmos SDK 更新到 [`v0. 45`](https://github.com/cosmos/cosmos-sdk/milestone/46) 和 Tendermint 到 [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0 .35.0)。
- [`v3.a.0`](https://github.com/cosmos/ibc-go/milestone/19):`v3.x` 系列的次要版本，包括将 Cosmos SDK 更新到 [v0.45 ](https://github.com/cosmos/cosmos-sdk/milestone/46) 和 Tendermint 到 [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0.35.0 )。
- [`v4.a.0`](https://github.com/cosmos/ibc-go/milestone/22):`v4.x` 系列的次要版本，包括将 Cosmos SDK 更新到 [`v0. 45`](https://github.com/cosmos/cosmos-sdk/milestone/46) 和 Tendermint 到 [`v0.35`](https://github.com/tendermint/tendermint/releases/tag/v0 .35.0)。

## Q2 - 2022

范围仍待定。

### 发布时间表

#### H1 四月

- [`v5.0.0-rc0`](https://github.com/cosmos/ibc-go/milestone/21):包含 Cosmos SDK 从 `v0.45` 更新到 [`v1. 0`](https://github.com/cosmos/cosmos-sdk/milestone/52)，这将支持迁移到 SMT 存储。

#### H2 四月

- [`v5.0.0`](https://github.com/cosmos/ibc-go/milestone/21):最终版本，包括将 Cosmos SDK 从 `v0.45` 更新到 [v1.0]( https://github.com/cosmos/cosmos-sdk/milestone/52)，这将支持迁移到 SMT 存储。