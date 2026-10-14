# 官方 demo 复用 · 最小改动法方案

> 版本：v2 · 2026-10-14 · 用户钦定升级
> 适用范围：ev/class-schedule（手环 Vela 快应用）所有 UI 页面/组件的实现与重构
> 状态：生效中（v1「严格复制官方 demo」+ v2 两条新增硬约束：胶囊屏自适应必须遵守、选源仅限 9 手环胶囊屏）

---

## 0. 为什么立这份方案（背景）

### v1（2026-10-13）

「课程面板」多彩/简易两页第一次实现后**整页白屏**，根因：

- 抄官方 `vela-sample/component/container/list` 的 `<list>/<list-item>` 结构时，**漏抄了配套样式常量** `.item { height: 60px }`；
- Vela 的 `<list>` 是虚拟列表，渲染前必须知道每项高度，子项无确定高度 → 一行都渲染不出 → 白屏。

结论：**官方 demo 不是"参考素材"，是"必须抄全的整车"**。抄结构不抄配套样式 = 抄了枪不抄子弹。本方案把复用纪律固化为七条军规，所有后续 UI 改动照此执行。

用户原话（v1 钦定口径）：

> "以后能严格复制官方demo吗，只把我们的内容加入，最小改动法"

### v2（2026-10-14 升级触发）

用户发现两处漏洞，钦定两条新增硬约束：

1. **"我们原来有个基于小的胶囊屏自适应模式，这个要遵守"** —— 项目有一套成熟的「三形适配体系」（手环 9 = pill-shaped 194×368），此前 ev-minimal 只字未提，复用页可能绕过它；
2. **"ev-minimal 限制只能找 9 手环胶囊屏的 ui 功能等，禁止使用其他尺寸的，比如 10pro 圆形屏"** —— 官方库里大量 demo 是圆屏/方屏布局，不能直接拿来上胶囊屏。

---

## 1. 七条军规（操作定义）

### 军规 1 · 整页拷贝，常量照抄

复制官方 demo **整页**（`<template>` / `<script>` / `<style>` 三块全量原样），官方 CSS 常量——**高度、padding、字号、颜色、圆角、行高**——一律照抄原值。

- 反面教材：2026-10-13 白屏事故，漏抄 `height: 60px`；
- 检查方法：diff 我们的页面与官方源，样式块里官方常量的每一行都应在。

### 军规 2 · 只改三个注入点

除以下三类注入点外，官方代码一行不动：

| 注入点 | 改什么 | 示例 |
|--------|--------|------|
| 数据源 | 官方 demo 的示例数组 → 我们的业务数据 | `items: []` → `courseList`（`database.getAllCoursesWithIndex`） |
| 文案 | 标题/按钮/空态文案 | `list / list-item` → `多彩课表` |
| 跳转 | 官方 demo 的目标页 → 我们的页面 | `toDetail` → `/pages/detail?courseId=…` |

### 军规 3 · 微调只能做加法

确需适配我们场景时：

- ✅ 允许：追加 `@media` 断点（项目 §10 触底自适应/军规 6 胶囊适配）、行内 `style` 覆盖；
- ❌ 禁止：修改官方 class 定义本身（改 `.item` 的高度、把 `.header` 的字号改掉，都算违规）。

### 军规 4 · 禁止"等价改写"

以下行为一律禁止（官方咋写就咋留，哪怕看着"不够优雅"）：

| 禁止行为 | 示例 |
|----------|------|
| 标签替换 | `<list-item>` → `<div>`、`<list>` → `<scroll>` |
| class 合并/重命名 | 官方 `item-wrapper` + `content-common` 合成一个 class |
| 删"看起来没用"的事件方法 | 删 `onscrolltop` / 空 `onScroll` 处理器 |
| 属性"简化" | `type="item"` 省掉、`for` 语法换写法 |

**唯一豁免**：撞项目铁律时（如全局禁 `lines: 1; text-overflow: ellipsis`、禁某历史属性），做最小化处理并在注释注明：`// 项目铁律 §X 禁 ellipsis，官方原写法 lines:1 移除`。

### 军规 5 · 标注官方出处

每个复用页面的 `<style>` 或 `<script>` 顶部注释必须写明官方来源文件路径，便于审计对质：

```
<!-- UI/实现来源：open-vela-learning/packages_apps/wearable/vela-sample/src/component/container/list/index.ux（最小改动法，2026-10-13） -->
```

### 军规 6 · 胶囊屏自适应是硬约束（v2 新增，2026-10-14）

项目既有「三形适配体系」是所有页面的地基，复用官方 demo **不得绕开、不得重建**：

- **目标设备**：手环 9 胶囊屏 `pill-shaped`，194×368，可用水平宽约 **182px**，左右圆角裁切约 **20px**（数值与策略以 `docs/three-shape-adaptation-template.md` 为准）；
- **适配手法**：追加式 `@media`（军规 3 延续），基准值优先取三形模版速查表——根容器 `padding: 16px 8px`、顶栏 `justify-content: center`、按钮缩 15-21%、列表项 padding 缩 30%、标题字号缩 15-18%；
- **媒体查询语法（手环 9 实测）**：只准用单一 shape 写法——`@media (shape: pill-shaped)` 或 `@media screen and (shape: pill-shaped)`；**严禁逗号分隔多 shape**（`@media (shape: capsule), (shape: pill-shaped)` 整条被忽略、样式静默失效，见 `docs/media-query逗号不兼容手环9.md`）；
- **页面级规范**：有返回栏的页面遵守项目统一头部（`src/common/header.css`）与 `docs/胶囊屏UI规范.md`；JS 侧形状判断沿用项目既有写法（`shape === "capsule" || shape === "pill-shaped"`，见 `src/pages/week-view/week-view.ux`）。

### 军规 7 · 选源只认 9 手环胶囊屏（v2 新增，2026-10-14）

- ✅ **可复用**（满足其一）：
  1. 原生带 `@media (shape: pill-shaped)` 且 194px 宽下布局成立；
  2. 无原生 pill 适配但结构宽度自适应（如竖排列表），**须追加项目胶囊适配层后**才可上机。
- ❌ **禁止**：
  1. 圆形屏（466×466，如 10pro 圆形屏）/ 方屏专用布局直接复用；
  2. 固定宽度 > 194px 且无 pill 收窄适配的 demo 直接上机（如 calendar 的 350px 矩阵，必须先追加收窄）；
  3. 未过 §7 筛查表的 demo 一律视为禁用，不得以"看起来差不多"提名。
- 每个候选 demo 先过 **§7 筛查表**，通过后写入 **§3 批准清单**，两个清单之外的官方代码不得进项目。

---

## 2. 官方库在哪（唯一参考源）

| 副本 | 路径 | 说明 |
|------|------|------|
| **完整副本（钦定）** | `~/WorkBuddy/2026-10-11-21-15-20/open-vela-learning/` | 含 `packages_apps/wearable/vela-sample`（组件手册）+ 13 个 wearable 应用 demo + 182 篇官方文档 |
| 部分子仓 | `~/Documents/open-vela-learning/` | 只有部分示例工程（multi_screen_todolist / calendar / settings 等），**无 vela-sample**，别在这找组件手册 |

**索引速查**：`vela-sample-87文件明细.md` 标注了每个组件的适用场景（如 `container/list` = "课表/设置列表基础"）。找不到合适 demo 时先查这份明细，再翻官方文档目录。

**v2 选源顺序**：先按 §7 筛查表过滤出「胶囊屏可用」子集，再在子集里按场景挑 demo。不要反过来先挑布局再补适配。

---

## 3. 已批准复用的官方实现清单（v2：附胶囊屏兼容列）

| 用途 | 官方来源 | 胶囊屏（194px）兼容性 | 复用时注意 |
|------|----------|----------------------|-----------|
| 菜单/设置列表 | `settings/src/pages/home` | ⚠️ 无原生 pill，结构宽度自适应 | 须追加军规 6 胶囊适配层；36px 文本+58px 图标槽在 182px 内临界，真机复核 |
| 周历矩阵 | `calendar/src/pages/index` | ⚠️ 有 pill `@media` 但矩阵 350px 固定宽 | **必须先追加 pill 收窄适配**（多彩课表待办，见 §8） |
| 日历详情 | `calendar/src/pages/detail` | ⚠️ 有 pill `@media`，宽度待核 | 同上，先筛查后提名 |
| 双行列表项 + 进详情 | `multi_screen_todolist/src/pages/task` | ❌ 无原生 pill | 竖排结构预计可自适应，须追加胶囊适配层 + 真机复核后才可批准 |
| 列表容器/滚动 | `vela-sample/src/component/container/list`（或 `container/scroll`） | ✅ vela-sample 家族带 pill | `<list>` 子项**必须补确定高度**（官方给了 `height: 60px`）；用 todolist 的 `scroll + div for` 时同理要给项显式高度 |
| 文本属性 | `vela-sample/src/component/basic/text` | ✅ 组件级 | font-size / weight / line-height / text-align 官方写法；`lines:` / `ellipsis` 项目禁用（军规 4 豁免） |
| 颜色写法 | `vela-sample/src/component/general/color` | ✅ 组件级 | hex + `rgb()` / `rgba()` 官方验证写法，业务色值可取自官方示例色板 |
| 数据层 | （无官方） | — | 课程业务属例外：官方无此领域，用项目 `data/database.js` + `data/store.js`，需在注释注明例外 |

---

## 4. 冲突仲裁（项目铁律 vs 官方做法）

优先级：**项目铁律（含胶囊屏体系）> 官方做法 > 个人审美**。

1. 官方写法撞项目铁律（如 `lines:/ellipsis`）→ 按军规 4 豁免处理，最小化 + 注释；
2. 官方布局撞胶囊屏 194px 宽（固定宽度、多列横排、圆形屏安全区假设）→ 按军规 3 **追加** `@media (shape: pill-shaped)` 收窄/重排，**不许改官方 class 定义**；
3. 官方无此场景（课程数据、主题色板）→ 项目自有层顶上，注释注明"官方无此领域"。

---

## 5. 正反例档案

### 反例：课程面板白屏（2026-10-13，commit 5709e6e 修复）

- 抄了 `<list>/<list-item>` 标签，漏抄 `.item { height: 60px }` → 虚拟列表塌缩；
- 自创 `COLOR_PALETTE` 高饱和色板替换官方 `SUBJECT_COLORS` 半透明体系；
- 违反军规：1（常量没抄全）、4（结构被"等价改写"成自创布局）。

### 正例：多彩/简易课表 + 课程面板目录页（2026-10-14，commits 81ba802 / 970ce62）

- 布局骨架 = 官方 settings home（目录页/简易课表）+ 官方 calendar index（多彩课表）；
- 色值 = 官方 `general/color` 示例色（多彩课表有课格按科目循环 `#ff6b6b` / `#51cf66` / `rgb(51,154,240)` 等）；
- 列表项显式高度/两字截断 + 22px 字号，对应官方 list demo 的高度常量思路；
- 每页注释标注官方来源路径（军规 5）；
- 数据层、图标、跳转全部收敛在三个注入点（军规 2）。

### 疑似反例（待真机确认后转正）：calendar 350px 矩阵上 194px 胶囊屏

- 多彩课表整页套官方 calendar index，官方 pill `@media` 只改 `align-items`，矩阵/表头仍 350px 固定宽；
- 按军规 7 属"固定宽度 > 194px 且无 pill 收窄适配"，**当前形态不允许上胶囊屏**；
- 整改动作已列入 §8 复核清单（追加 pill 收窄适配），真机确认后本条转正反例。

---

## 6. 验收 checklist（每次复用后逐项打勾）

- [ ] 与官方源 diff，样式常量无遗漏（军规 1）
- [ ] 改动仅限数据源 / 文案 / 跳转三注入点（军规 2）
- [ ] 适配改动均为追加式，未动官方 class 定义（军规 3）
- [ ] 无标签替换 / class 合并 / 删事件行为；铁律豁免已注释（军规 4）
- [ ] 页面注释含官方来源文件路径（军规 5）
- [ ] 页面在 pill-shaped 194px 宽下布局成立，基准值取自三形模版（军规 6）
- [ ] 追加的 `@media` 为单一 shape 写法、无逗号（军规 6）
- [ ] 选源已过 §7 筛查表且在 §3 批准清单内（军规 7）
- [ ] `node scripts/build.js` 构建通过，本功能相关零警告

---

## 7. 官方 demo 胶囊屏兼容性筛查表（v2 新增）

> 筛查方法：`grep -rl "pill-shaped" <官方库>/packages_apps/wearable/*/src` + 人工核对 194px 宽布局。未出现在本表的 demo 一律禁用。

| 官方 demo | 原生 pill 适配 | 194px 布局成立？ | 处置 |
|-----------|:---:|:---:|------|
| `calendar/src/pages/index` + `detail` | ✅ | ❌ 矩阵/表头 350px 固定宽 | 复用须追加 pill 收窄（多彩课表待办） |
| `settings/src/pages/home` | ❌ | ✅ 竖排列表宽度自适应 | 可复用 + 追加胶囊适配层 |
| `fistPower`（index/result/record/loading/fail + app.ux） | ✅ | 待核 | 待逐页筛查 |
| `multi-screen-calculator/src/pages/index` | ✅ | 待核 | 待逐页筛查 |
| `vela-sample/src/home` + `style/comm.css` + `framework/media-query` | ✅ | ✅ | 组件/样式基准，可放心用 |
| `multi_screen_todolist/src/pages/task` | ❌ | 待核（竖排预计可自适应） | 须追加胶囊适配层 + 真机复核 |
| 其余 wearable apps（24count / dice / player / woodenFish / eventBus / launcher / parentChildComp / interconnect_image_demo / chart） | 未命中 | — | **默认禁用**，逐个筛查后才可提名 |

---

## 8. 既有落页复核清单（v2 新增，按新军规回头审已上线页）

| 页面 | 当前基底 | pill 风险 | 动作 |
|------|----------|----------|------|
| `schedule-panel-colorful`（多彩课表） | calendar index | **350px 矩阵超 194px 屏宽** | 🔴 优先：追加 `@media (shape: pill-shaped)` 收窄适配，真机验证 |
| `schedule-panel`（课程面板目录页） | settings home | 无原生 pill；pl-60+58px 图标+36px 文本在 182px 临界 | 🟡 追加胶囊适配层后真机复核 |
| `schedule-panel-simple`（简易课表） | settings home | 同上 | 🟡 同上 |
| `schedule-panel-progress` / `-remaining` / `-subject-color` / `-countdown` / `-dual-mode` | 项目自研 | 按三形模版复核 pill 分支是否在位 | 🟢 逐页核查，缺项的按三形模版补齐 |

---

## 9. 变更记录

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-10-13 | v1 | 首版。由课程面板白屏事故复盘 + 用户钦定口径固化 |
| 2026-10-14 | v2 | 新增军规 6（胶囊屏自适应硬约束：三形体系/单一 shape 媒体查询/模版基准值）与军规 7（选源仅限 9 手环胶囊屏，禁圆屏方屏专用布局）；§3 清单加胶囊屏兼容列；新增 §7 官方 demo 筛查表、§8 既有落页复核清单；checklist 增补 3 项 |
