# 官方 demo 复用 · 最小改动法方案

> 版本：v1 · 2026-10-13 · 用户钦定
> 适用范围：ev/class-schedule（手环 Vela 快应用）所有 UI 页面/组件的实现与重构
> 状态：生效中（替代此前"参考官方、自由发挥"的松散口径）

---

## 0. 为什么立这份方案（背景）

2026-10-13，「课程面板」多彩/简易两页第一次实现后**整页白屏**，根因：

- 抄官方 `vela-sample/component/container/list` 的 `<list>/<list-item>` 结构时，**漏抄了配套样式常量** `.item { height: 60px }`；
- Vela 的 `<list>` 是虚拟列表，渲染前必须知道每项高度，子项无确定高度 → 一行都渲染不出 → 白屏。

结论：**官方 demo 不是"参考素材"，是"必须抄全的整车"**。抄结构不抄配套样式 = 抄了枪不抄子弹。本方案把复用纪律固化为五条军规，所有后续 UI 改动照此执行。

用户原话（钦定口径）：

> "以后能严格复制官方demo吗，只把我们的内容加入，最小改动法"

---

## 1. 五条军规（操作定义）

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

- ✅ 允许：追加 `@media` 断点（项目 §10 触底自适应）、行内 `style` 覆盖；
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

---

## 2. 官方库在哪（唯一参考源）

| 副本 | 路径 | 说明 |
|------|------|------|
| **完整副本（钦定）** | `~/WorkBuddy/2026-10-11-21-15-20/open-vela-learning/` | 含 `packages_apps/wearable/vela-sample`（组件手册）+ `vela-sample-87文件明细.md` + 182 篇官方文档 |
| 部分子仓 | `~/Documents/open-vela-learning/` | 只有部分示例工程（multi_screen_todolist / calendar / settings 等），**无 vela-sample**，别在这找组件手册 |

**索引速查**：`vela-sample-87文件明细.md` 标注了每个组件的适用场景（如 `container/list` = "课表/设置列表基础"）。找不到合适 demo 时先查这份明细，再翻官方文档目录。

---

## 3. 已批准复用的官方实现清单

| 用途 | 官方来源 | 复用时注意 |
|------|----------|-----------|
| 列表容器/滚动 | `vela-sample/src/component/container/list`（或 `container/scroll`） | `<list>` 子项**必须补确定高度**（官方给了 `height: 60px`）；用 todolist 的 `scroll + div for` 时同理要给项显式高度 |
| 双行列表项 + 进详情 | `multi_screen_todolist/src/pages/task` | `item-wrapper` / `content-common` / `date-text-box` 三件套照抄，跳转改我们的详情页 |
| 文本属性 | `vela-sample/src/component/basic/text` | font-size / weight / line-height / text-align 官方写法；`lines:` / `ellipsis` 项目禁用（军规 4 豁免） |
| 颜色写法 | `vela-sample/src/component/general/color` | hex + `rgb()` / `rgba()` 官方验证写法，业务色值可取自官方示例色板 |
| 数据层 | （无官方） | 课程业务属例外：官方无此领域，用项目 `data/database.js` + `data/store.js`，需在注释注明例外 |

---

## 4. 冲突仲裁（项目铁律 vs 官方做法）

优先级：**项目铁律 > 官方做法 > 个人审美**。

1. 官方写法撞项目铁律（如 `lines:/ellipsis`）→ 按军规 4 豁免处理，最小化 + 注释；
2. 官方写法撞真机适配（胶囊屏/小屏）→ 追加 `@media` 断点增量（军规 3），不改官方 class；
3. 官方无此场景（课程数据、主题色板）→ 项目自有层顶上，注释注明"官方无此领域"。

---

## 5. 正反例档案

### 反例：课程面板白屏（2026-10-13，commit 5709e6e 修复）

- 抄了 `<list>/<list-item>` 标签，漏抄 `.item { height: 60px }` → 虚拟列表塌缩；
- 自创 `COLOR_PALETTE` 高饱和色板替换官方 `SUBJECT_COLORS` 半透明体系；
- 违反军规：1（常量没抄全）、4（结构被"等价改写"成自创布局）。

### 正例：多彩/简易课表现状（commit 5709e6e 之后）

- 布局骨架 = 官方 todolist task 页（scroll + div for + 三件套结构）；
- 色值 = 官方 `general/color` 示例色（`#ff6b6b` / `#51cf66` / `rgb(51,154,240)` 等）；
- 列表项显式 `min-height`（多彩 64px / 简易 56px）——对应官方 list demo 的高度常量思路；
- 每页注释标注官方来源路径（军规 5）。

---

## 6. 验收 checklist（每次复用后逐项打勾）

- [ ] 与官方源 diff，样式常量无遗漏（军规 1）
- [ ] 改动仅限数据源 / 文案 / 跳转三注入点（军规 2）
- [ ] 适配改动均为追加式，未动官方 class 定义（军规 3）
- [ ] 无标签替换 / class 合并 / 删事件行为；铁律豁免已注释（军规 4）
- [ ] 页面注释含官方来源文件路径（军规 5）
- [ ] `node scripts/build.js` 构建通过，本功能相关零警告

---

## 7. 变更记录

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-10-13 | v1 | 首版。由课程面板白屏事故复盘 + 用户钦定口径固化 |
