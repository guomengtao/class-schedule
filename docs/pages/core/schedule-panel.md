# 面板·总览（组级文档）

- route: pages/schedule-panel（及 `pages/schedule-panel-*` 共 8 个变体）
- 截图: schedule-panel.png（组级占位；各变体可补 `schedule-panel-<variant>.png`）

> 本篇为组级文档，覆盖 `schedule-panel` 及全部 7 个 `schedule-panel-*` 变体。EvEmuPreview 角标显示的「面板·总览（组级）」即来源于此，不代表每个变体都有独立文档。

## 功能说明

面板（Schedule Panel）是课程表在锁屏、负一屏或主页卡片区域的紧凑展示组件。相比完整"表盘"，面板更强调**一屏多看**与**快速信息密度**，通常作为手环多表盘体系里的"信息聚合"入口。所有面板共享课表数据源，差异在**信息密度、进度表达与配色策略**。

## 变体清单

| 末段 | 名称 | 差异点（概览） |
|---|---|---|
| `schedule-panel` | 面板·基础 | 默认：当日节次网格 |
| `schedule-panel-simple` | 面板·简约 | 极简，仅当前/下一节 |
| `schedule-panel-progress` | 面板·进度 | 显示当日课程完成进度条 |
| `schedule-panel-remaining` | 面板·剩余 | 强调"距下一节课还剩多久" |
| `schedule-panel-subject-color` | 面板·科目色 | 按科目色块分区 |
| `schedule-panel-countdown` | 面板·倒数日 | 叠加倒数日模块 |
| `schedule-panel-dual-mode` | 面板·双周 | 单双周课表切换展示 |
| `schedule-panel-colorful` | 面板·多彩 | 高饱和配色主题 |

## 实现要点

- **复用表盘渲染层**：面板与表盘共享底层课表切片与配色方案，仅在布局模板上分叉。
- **双周模式**：`schedule-panel-dual-mode` 需要读取"单双周"标记并做高亮，数据源需支持周类型字段。
- **进度/剩余语义**：`progress`/`remaining` 依赖当前时间相对节次的时间窗计算，需处理"无课日""已结束"边界态。
- **胶囊屏安全区**：同表盘，所有面板须避让圆角。

## 已知问题

- `schedule-panel-dual-mode` 在"本周类型未知"时默认展示单周，需提示用户先配置。
- `schedule-panel-countdown` 与表盘倒数日模块存在数据重复计算，建议抽取公共 selector。
- `schedule-panel-remaining` 在无下一节课（如晚间/周末）时显示空白，需兜底文案。
