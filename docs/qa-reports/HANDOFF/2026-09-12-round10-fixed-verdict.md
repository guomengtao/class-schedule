# QA 第 10 轮增补 · position:fixed 黑屏方案根因裁定

- 日期：2026-09-12 21:35
- HEAD：`1197642`（v1.4.203 / code 703）
- 报告：[../../class-schedule-QA-20260912-2135-fixed-根因裁定.md](../../class-schedule-QA-20260912-2135-fixed-根因裁定.md)
- 类型：**根因裁定**（不是新一轮全量质检）

## 一句话

`position: fixed` 黑屏方案**不成立**：代码里已无 `fixed`（c490e47 已改 absolute），且浮层进页时 `visible:false` 根本不渲染；「absolute 在 1000 下失效」被本仓库自己证伪（键盘近 200 处 absolute 正常、4 个同写法页面不黑屏）；引用的是华为/联盟文档，而目标设备是 Vela。

## 本轮待办

| 编号 | 标题 | 优先级 | 状态 | 定位 | 建议 |
|---|---|---|---|---|---|
| P1-13 | `.sheet-overlay` 四边定位（全仓唯一）改为 `width:100%;height:100%` | P1 | 待修 | `unlock-dialog.ux:97-106` | 与 `.overlay-modal` / `.overlay-bottom-sheet` 统一写法 |
| P1-14 | 8 处 `min-height:100%` 改为显式 `height:100%`（Vela 不支持 min-height） | P1 | 待确认 | donate:135 / week-grid-demo:124 / chinese-input-full:196 / backup-restore:408 / homepage-settings:335 / vibration-lab:535 / device-info:185 / activation:604 | 其中 activation 据称正常，需真机确认是否真为风险 |
| P1-11 | `@media (shape: capsule)` → `pill-shaped`（27 处，465 条声明从未生效） | P1 | 待修 | 全仓 | 见 round10-pill 交接本 |
| P2-13 | `onShow` 末尾加 `$forceUpdate()` 规避 Vela 条件渲染不重绘 | P2 | 待确认 | 各黑屏页 | 见 `docs/band9pro-black-screen-fix-plan.md` |

## ⚠️ 需要作者先做一个 10 分钟实验再决定方向

| 步骤 | 操作 | 判读 |
|---|---|---|
| A | 打开 **settings** 页，**不点任何东西** | 黑 → 浮层理论当场死亡（此刻浮层未渲染） |
| B | 在 settings 点一个付费功能弹出解锁框 | 这时才黑 → 就是 `.sheet-overlay` 四边定位问题，改 width/height 即可 |
| C | 把 `<unlock-dialog>` 整行删掉再进 settings | 还黑 → 与浮层完全无关，去查根容器 |

**先做 A。A 一旦为「黑」，整个 fixed 方案就不用讨论了。**

## 想问作者的两个问题

1. **黑屏是「进页面就黑」还是「点了付费功能弹出解锁框之后才黑」？** 这决定了是完全无关还是 P1-13。
2. **仓库里现在有 4 份互相矛盾的黑屏根因文档**（index-band9pro-black-screen-analysis / band9pro-black-screen-fix-plan / position-fixed-手环渲染问题分析 / 本次被核实的 stack 方案）。能否指定一份为准、其余标注废弃？否则下一轮还会重复争论。

## 作者回复区

（请在此填写，QA 下一轮会据此复核代码）
