# 课程面板目录页 vs 工具栏目 · 列表实现对比差异

> 2026-10-14 · 阴阳怪气猫🐱 · 单号 evtask-X-evclass-sche-261014-mbt75a
>
> **背景**：课程面板目录页（`src/pages/schedule-panel/schedule-panel.ux`）于 09:0x 轮改为官方
> `multi_screen_todolist/src/pages/task` 基底。用户裁定「错误」，指定**工具栏目
> （`src/pages/tools/tools.ux`）即项目标准列表范本**。本文档逐维对比两套实现、定位差异根因，
> 并给出收敛整改清单与 ev-minimal 军规补丁建议。

---

## 0. 结论先行

工具栏目不是"某个页面"，它是**项目标准列表模式（Standard List Pattern）的落地范本**——
设置页（`settings.ux`）用的同一套。目录页当前实现（todolist 基底）在 12 个对比维度中
**11 项偏离标准模式**，且偏离不是风格问题，是**场景错配**：官方 todolist task 页是
「任务管理」专用列表，分页/勾选框/日期行都是任务语义；栏目目录要的是「全量滚动 + 单行 +
箭头」。官方 wearable 库里没有"栏目目录"场景 demo，选 todolist 等于把任务列表语义带进目录页。

---

## 1. 逐维对比

| # | 维度 | 工具栏目 tools.ux（标准） | 目录页当前（todolist 基底） | 判定 |
|---|------|--------------------------|------------------------------|------|
| 1 | 选源 | 项目自研标准列表（settings.ux 同款） | 官方 `multi_screen_todolist/src/pages/task` | ❌ 场景错配 |
| 2 | 容器 | `scroll` + `scroll-y` **全量滚动**，7 项一屏看全 | `div.list` **无滚动**，官方分页 3 条/页（7 项 = 3 页） | ❌ 交互断裂 |
| 3 | 页头 | `back-header` 三件套：返回键图标 + 居中标题 + 右侧占位 | `today-text`：标题兼「上一页」按钮，无返回键图标 | ❌ 缺件 |
| 4 | 列表项 | `item-row`：单行 label + `›` 箭头（text 字符） | `item-wrapper`：checkbox 图 + **双行**（title + dateString） | ❌ 结构错 |
| 5 | 分组 | `section` 卡片：圆角 12px、`theme.card` 底色 | 无卡片、无分组，官方黑底平铺 | ❌ 缺件 |
| 6 | 分隔 | `row-divider` 1px 分隔线 | 无分隔线 | ❌ 缺件 |
| 7 | 数据 | 静态写死：每行一个 `onclick="openXxx"` 方法 | `ENTRIES` 数组 `for` 循环 + `pageTasks` 分页 `slice(3)` | ⚠️ 可接受但引入分页复杂度 |
| 8 | 跳转 | `openXxx()` → `router.push({uri:"/pages/..."})` | `toDetail(task)` → `router.push({uri:"/pages/"+task.page})` | ✅ 等价 |
| 9 | 返回 | 返回键 → `router.back()` | **无返回键**；右滑 swipe → `router.back()` | ❌ 入口缺失 |
| 10 | 主题 | `store.getTheme` 全套（bg/card/accent/text/textMuted/border）+ iconTheme 亮暗 | **无主题**：官方固定黑底白字、标题官方橙 `#ff6a24` | ❌ 主题断裂 |
| 11 | 适配 | `@media (width >= 360/480)` 渐进 padding | 官方三档 aspect-ratio css import + 追加 pill 收窄块 | ❌ 双轨制 |
| 12 | 图标 | 返回键 `/common/icons/{{iconTheme}}/icon_back.png`（亮暗双主题） | `checkbox.png` 官方**任务勾选框** | ❌ 语义错误 |

---

## 2. 差异根因

### 2.1 场景错配（核心）

官方 todolist task 页的每个"特性"都是任务管理语义，搬到目录页全部变成负资产：

| 官方特性 | 任务场景语义 | 目录页后果 |
|----------|--------------|------------|
| 分页 3 条/页 + 「下一页」 | 任务多，一页放不下 | 7 个栏目被切成 3 页，翻页才能看全 |
| checkbox.png 勾选框 | 任务可勾选完成 | 栏目不可勾选，纯噪声 |
| 双行 title + dateString | 任务名 + 日期 | 被迫编造副文案（"今日上课情况"等） |
| today-text 兼「上一页」 | 官方 demo 是根页无返回键 | 目录页非根页，用户找不到返回入口 |
| 黑底白字 + 官方橙 | 官方 demo 无主题体系 | 与全项目 theme store 割裂 |

### 2.2 项目标准列表三件套缺失

工具/设置页的列表辨识度来自三件套，目录页**全部没有**：

1. **back-header**（返回键 + 居中标题 + 占位）——目录页只剩一个兼按钮的标题文本；
2. **section/group 卡片**（圆角 + theme.card 底）——目录页官方黑底平铺，无卡片层次；
3. **row-divider** 分隔线——目录页行间无分隔。

### 2.3 双轨制（交互/主题/适配各一套）

- **交互双轨**：工具/设置 = 滚动一屏看全 + 返回键；目录页 = 分页翻 + 右滑返回；
- **主题双轨**：全项目 `store.getTheme` 驱动，目录页官方黑底独立——用户切主题色目录页不跟随；
- **适配双轨**：工具 = width 渐进查询；目录页 = aspect-ratio 三档 + pill 追加块。

---

## 3. 收敛整改清单（按工具栏目标准重建目录页）

> 优先级 P0；全部改动在 `src/pages/schedule-panel/schedule-panel.ux`。

| # | 动作 | 明细 |
|---|------|------|
| 1 | 容器换 scroll | `div.list` → `scroll scroll-y`，删官方分页逻辑（updatePageTask/toPrev/toNext/showPrev/showNext） |
| 2 | 补 back-header | 照抄 tools.ux：返回键（iconTheme 亮暗）+ 居中「课程面板」+ header-placeholder；`goBack()` → `router.back()` |
| 3 | 列表项换 item-row | `item-wrapper` 双行 → `item-row` 单行：label + `›` 箭头（text 字符，非图片）；删 checkbox.png 及引用 |
| 4 | 补 section + divider | 圆角卡片（theme.card 底）+ row-divider，照抄 tools.ux 常量 |
| 5 | 数据注入 | 7 个栏目静态写死 onclick（跟随 tools 风格）或收敛为数组 + for（二选一，全页统一） |
| 6 | 接 theme store | onInit/onShow `store.getTheme` + `updateIconSrc(themeName)`，theme 常量照抄 tools.ux |
| 7 | 适配补 pill | tools 的 `@media (width >= 360/480)` 不覆盖胶囊屏，追加 `@media screen and (shape: pill-shaped)`（三形模版基准：根 padding `16px 8px`、列表项缩 30%、单一 shape 无逗号） |
| 8 | 删官方残留 | 删三档 aspect-ratio css import 与文件、`complete-text`/`more-text`/`date-text` 等官方样式、页面来源注释改标项目标准模式出处 |

**验收**：目录页与工具/设置页并排，视觉与交互无差异感；切主题色目录页跟随；胶囊屏 194px 不溢宽；7 项一屏可见可滚。

---

## 4. ev-minimal 军规补丁建议（v3）

本轮暴露一个方向性问题：**ev-minimal 被用在了项目已有标准模式的领域**。官方 demo 复用的
前提是"项目没有对应标准"；列表/页头/主题这些项目自有范本的领域，官方 demo 覆写即制造双轨制。

建议 ev-minimal v2 增加**军规 8 · 项目既有标准模式优先**：

> 官方 demo 仅在**项目无对应标准实现**时启用。凡项目已有标准模式（列表 = tools/settings 范本、
> 页头 = back-header、主题 = store.getTheme、适配 = 三形模版 pill-shaped）的领域，一律复用项目
> 模式，禁用官方 demo 覆写；官方 demo 只允许填补项目空白（如无先例的矩阵/日历类视图）。

同时 §3 批准清单对 `multi_screen_todolist` 标注：**任务场景专用，禁用于栏目目录/设置类页面**。

---

## 5. 附：项目标准列表模式画像（tools.ux 范本要点）

```
page (column, 100%)
└─ scroll.scroll-y (flex:1)
   └─ page-body (padding: 44px 10px 12px 10px)
      ├─ back-header (row, center)
      │  ├─ back-btn-wrapper (48x40, radius 8, theme.card) → icon_back.png (24x24, iconTheme)
      │  ├─ header-title (28px bold, center, flex:1)
      │  └─ header-placeholder (48x48, flex-shrink:0)
      └─ section (radius 12, padding 18px 14px, theme.card)
         ├─ item-row (row, space-between, padding 12px 0) → onclick
         │  ├─ item-label (28px, theme.text)
         │  └─ arrow "›" (28px, theme.textMuted)
         ├─ row-divider (1px, theme.border, margin 6px 0)
         └─ ... (item-row / divider 交替)
```

关键常量（照抄级）：标题 28px/行高 38px；行 padding 12px 0；卡片圆角 12px、padding 18px 14px；
返回键 48×40/图标 24×24；theme 常量以 tools.ux private.theme 为准（深蓝主题一套，亮/暖主题
由 store.getTheme 返回）。

---

*本文档为对比分析，整改动作（第 3 节）待用户确认后另领任务单落地。*
