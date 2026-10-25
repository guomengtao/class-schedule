# watch-face-functional · 表盘·功能

> 源码：`src/pages/watch-face-functional/watch-face-functional.ux`（约 380 行）
> 入口：表盘列表第 12 行「功能表盘」　**不可直挂 manifest entry**（见 §4.1）
> 2026-10-26 完成 336×480（手环10Pro）双屏适配

## 1. 定位

不是"看时间的表盘"，是一块**设备状态面板**：时间 + 日期 + 空间使用 / 剩余空间 / 电量三组条形指标。骨架走经典表盘的 flex 纵向居中，**零 absolute 子元素**（规避 Vela 黑屏的既有约定）。

## 2. 数据来源

| 指标 | API | 降级 |
|---|---|---|
| 总容量 | `device.getTotalStorage({success})` | 失败 → `--` |
| 可用容量 | `device.getAvailableStorage({success})` | 失败 → `--`（已用/百分比一并留空） |
| 电量 | `@system.battery` 的 `getStatus` | 模块或方法缺失 → `batteryText` 保持空 → **整项 `if` 隐藏** |

三处 `success` 回调都是异步的，页面初帧一定先显示 `--`。

## 3. 布局（192×490 基线）

| 元素 | 值 | 说明 |
|---|---|---|
| `.page` | 100%×100% · bg `#101820` · column 居中 | `onclick="onTap"` 整页回列表 |
| `.clock` | 48 bold · ls 2 | — |
| `.date` | 22 · mt 4 | `10月26日 周一` |
| `.item` ×3 | w 158 · mt 16 | 空间 / 剩余 / 电量 |
| `.head` | w 158 · row space-between | 标签左、数值右 |
| `.k` / `.v` | 22 / 22 | — |
| `.bar` | `<progress>` w 158 · stroke 12 | 官方组件，`percent` 只控填充比例 |
| `.batt-shell` | 34×16 · 边框 2（净宽 30） | 壳 + 芯 + 正极帽三段手绘 |
| **`battW`** | `Math.round(level × battInner)` | `battInner` 默认 **30**（= 壳净宽），宽屏 52 |
| `.back` | 22 · mt 24 | — |

## 4. 宽屏（336×480）适配

**路线：11 个单类 `.w-*` + `fitScreen()` 异步探针**（与前四块同范式）。192 屏 `w < 300` 直接 return，11 个类全空、`battInner` 保持 30 → 模板解析结果与改前逐字节相同。

| 元素 | 192 | 336 |
|---|---|---|
| `.w-clock` | 48 / ls2 | **84 / ls3** |
| `.w-date` | 22 / mt4 | **28 / mt6** |
| `.w-item` `.w-head` `.w-bar` | 158 | **276** |
| `.w-kv`（k+v 共用） | 22 | **28** |
| `.w-bar` stroke | 12 | **18** |
| `.w-shell` `level` `nub` | 34×16 / h8 / 3×8 | **56×26 / h13 / 5×13** |
| `battInner` | 30 | **52** |
| `.w-back` | 22 / mt24 | **28 / mt20** |

`clock` 定 84 而不是 96：三项全显示时纵向预算 465/480，取 96 会溢到 505 直接裁字。

### 4.1 两条硬约束（本次踩出来，代价很大）

1. **必须从 `onInit` 调 `fitScreen`，不能只放 `onReady`** —— 本页的 `onReady` **实测不触发**（分层探针停在 `onInit` 之后再不前进，时间却因 `onShow → refresh()` 正常走，极易误判成"探针没生效"）。
2. **必须用页内 `require("@system.device")`，不能用顶部 `import device`** —— 本页 `loadStorage` 里本来就有 `require` 同一个模块，两者并存时顶部 import 出的绑定取不到，`getInfo` 调用**静默抛错**（被 `catch` 吞掉），表现是宽屏类全空、"页面完全没适配"，而 bundle 里类名和 px 值都在。

### 4.2 `battW` 二次重算

`loadBattery` 在 `onInit` 里先按 `battInner=30` 算过一次 `battW`，而探针要等 `getInfo` 回调才把 `battInner` 改成 52。**必须在回调里用存下的 `battLevel` 重算一次**，否则宽屏 100% 电量只画 30/52 格，看着像半格电。

## 5. 已知问题（**均非本次引入**）

1. **192 屏标题行截字**：`.head` 158 宽装不下 `空间使用` + `-- / 126MB`（约 182px），`空间使用` 被截成 `空间使`、数值只剩 `-- /`。宽屏 276 已不截。要修得缩文案格式或加宽 `.head`，会动 192 像素，故本轮不动。
2. **`onReady` 是死代码**：本页定义了 `onReady(){ this.refresh() }` 但从不触发，计时靠 `onShow` 兜住。
3. `@system.battery` 不支持时机型上整项隐藏，属设计内降级。
4. 电量值前的短横是**正极帽 `.batt-nub`**，不是负号。
5. 进度条在实际电量为 100% 时仍显示为整条浅色轨道，"填充色"观感弱——`<progress>` 组件的既有渲染，两屏一致。

## 6. 验收（2026-10-26 实测）

| 项 | 192×490 | 336×480 |
|---|---|---|
| 时钟 ink 高/宽 | 40 / 121 | **69 / 208** |
| 日期 | 20 | 25 |
| 标题行宽 | 102（截字） | **273**（满栏） |
| 进度条宽 | 158 | **276** |
| 返回 | 41 | 52 |
| 纵向占用 | 87–408 | 39–454（余 26） |

截图：`screenshots/功能表盘-9-20261026.png`、`screenshots/功能表盘-10pro-20261026.png`

## 7. 变更历史

| 日期 | 提交 | 内容 |
|---|---|---|
| 2026-10-26 | `9cd412c` → 见后续提交 | 336×480 双屏适配：11 个宽屏单类 + `fitScreen` 从 `onInit` 调起（页内 require）；`battInner` 30→52 与 `battLevel` 重算 |
