# アーキテクチャ決定記録(ADR)

これは、ibc-goプロジェクトのすべての高レベルのアーキテクチャ決定を記録する場所です。

ADRの概念について詳しくは、この[ブログ投稿](https://product.reverb.com/documenting-architecture-decisions-the-reverb-way-a3563bb24bd0#.78xhdix6t)を参照してください。

ADRは以下を提供する必要があります。

-関連する目標と現在の状態に関するコンテキスト
-目標を達成するために提案された変更
-賛否両論のまとめ
-参考文献
-変更ログ

ADRと仕様の違いに注意してください。 ADRは、コンテキスト、直感、推論、および
アーキテクチャの変更、または何かのアーキテクチャの正当化
新着。仕様は、すべての要約がはるかに圧縮され、合理化されています。
それはそうであるか、そうであるべきです。

記録された決定が不足していることが判明した場合は、ディスカッションを招集し、ここに新しい決定を記録してから、一致するようにコードを変更します。

文脈/背景は現在形で書かれるべきであることに注意してください。

ADRを提案するには、提供されている[ADRテンプレート](./adr-template.md)を利用してください。

## 目次

| ADR \# | Description | Status |
| ------ | ----------- | ------ |
| [001](./adr-001-coin-source-tracing.md) | ICS-20 coin denomination format | Accepted, Implemented |
| [015](./adr-015-ibc-packet-receiver.md) | IBC Packet Routing | Accepted |
| [025](./adr-025-ibc-passive-channels.md) | IBC passive channels | Deprecated |
| [026](./adr-026-ibc-client-recovery-mechanisms.md) | IBC client recovery mechansisms | Accepted |
| [027](./adr-027-ibc-wasm.md) | Wasm based light clients | Accepted |


