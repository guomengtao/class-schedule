# 表盘·总览（组级文档）

- route: pages/watch-face（及 `pages/watch-face-*` 共 17 个变体）
- 截图: watch-face.png（组级占位；各变体可补 `watch-face-<variant>.png`）

> 本篇为组级文档，覆盖 `watch-face` 及全部 16 个 `watch-face-*` 变体。EvEmuPreview 角标显示的「表盘·总览（组级）」即来源于此，不代表每个变体都有独立文档。
>
> **已有专属主文档的变体**（角标精确命中，不走组级回退）：`watch-face-gradient`、`watch-face-colorful`、`watch-face-background`、`watch-face-vibrate`、`watch-face-font`（2026-10-25 起）、`watch-face-functional`、`watch-face-evpointer`、`watch-face-metal`（2026-10-26 起），见同名 `.md`。
> 其余变体仍走本组级文档。

## 功能说明

表盘（Watch Face）是课程表应用在手环主屏的展示样式集合。所有表盘共享同一份课程数据源（当日课表、节次、科目配色），差异集中在**布局、配色、动效与交互**四个维度。设计目标是让用户在不打开 App 的情况下，抬腕即看到当日课程关键信息。

## 变体清单

| 末段 | 名称 | 差异点（概览） |
|---|---|---|
| `watch-face` | 表盘·基础 | 默认布局，时间 + 下一节课 |
| `watch-face-class` | 表盘·课程 | 突出当前/最近一节课程卡片 |
| `watch-face-list` | 表盘·列表 | 当日全天课程纵向列表 |
| `watch-face-colorful` | 表盘·彩色 | 色块构成：四段色标 + 数字下同色 chip + 秒 5 段方格（专属文档）；不涉及科目数据 |
| `watch-face-gold` | 表盘·金色 | 金色质感主题 |
| `watch-face-metal` | 表盘·金属 | 仿古黄铜四层同心表壳 + 罗马数字时标 + 4 铆钉 + 120 档三针（专属文档） |
| `watch-face-gradient` | 表盘·渐变 | 逐字符色带 + 48 条背景色带纵向渐变 + 秒进度条（4 套色带） |
| `watch-face-flip` | 表盘·翻页 | 翻页时钟动效 |
| `watch-face-animated` | 表盘·动效 | 持续轻动效（注意低端设备掉帧） |
| `watch-face-vibrate` | 表盘·方形机械 | 方形仿真机械表（四边不等亮 / 45° 错位倒角 / 铁路分钟轨 / 表冠表耳 / 三针 + 日期窗）；震动提醒默认开、每 30s 一次，开关收在长按面板 |
| `watch-face-random` | 表盘·随机 | 每次亮屏随机样式 |
| `watch-face-evpointer` | 表盘·指针 | 仿古青铜指针 + 十二地支刻度 |
| `watch-face-font` | 表盘·字体 | 九种纯排版风格可切换（巨型加粗 / 等宽数码 / 逐字渐变 / 错落双行 / 细边描签 / 等宽秒带 / 翻页滚动 / 横铺跑道 / 分色跳动），`wf_font_style` 持久化；**唯一按字号分档适配宽屏的一块**（详见同名文档） |
| `watch-face-background` | 表盘·背景 | 场景氛围：天空 17 段色带 + 7px 地平线 + 平涂地面 + 天体圆盘，8 套场景可切换，**不支持自定义图片** |
| `watch-face-functional` | 表盘·功能 | 空间/剩余/电量三组条形指标 |
| `watch-face-landscape` | 表盘·横屏 | 横屏布局（适配特定表型） |
| `watch-face-pickdate` | 表盘·日期 | 强调日期/星期 |

## 实现要点

- **配置驱动**：变体通过 `manifest` / 运行时 config 的 `faceType` 字段区分，渲染管线共用，避免 17 份重复代码。
- **安全区适配**：手环屏为胶囊形（R≈半宽），所有变体必须做圆角/安全区避让，否则边缘内容被裁切。
- **数据源统一**：取 `store` 中的当日课表切片，变体只负责"怎么画"，不负责"取什么"。
- **性能**：动效类变体（`animated`/`flip`）在低端设备（如 8GB 机型模拟环境）需降帧，避免掉电与卡顿。

## 已知问题

- `watch-face-animated` 在低端设备持续动效掉帧，建议加开关。
- `watch-face-landscape` 仅适配特定横屏表型，竖屏表型下布局错位。
- `watch-face-random` 每次亮屏重排，若配合"课前震动"可能产生不可预期的亮屏。
