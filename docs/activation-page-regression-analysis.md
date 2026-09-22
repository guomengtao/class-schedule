# 高级版（激活页面）布局回归分析

> **分析日期**：2026-09-22
> **涉及文件**：[activation.ux](../src/pages/activation/activation.ux)、[header.css](../src/common/header.css)
> **结论**：问题由两次提交引入，主要责任在 `a6fdbc8`，次要责任在 `6e1fa0b`（v1.6.49）。

---

## 1. 提交时间线

| 提交 | 时间 | Tag | 描述 |
|------|------|-----|------|
| `03b07f5` | 2026-09-19 19:48 | v1.6.21 | ✅ **最后正常版本**：header按钮统一48px + 胶囊屏布局 |
| `a6fdbc8` | 2026-09-21 15:16 | — | ❌ **引入主要问题**：feat: add tools page, update layouts and docs |
| `6e1fa0b` | 2026-09-21 21:36 | v1.6.49 | ⚠️ **试图修复但引入新问题**：fix font size display and settings page layout |

---

## 2. 三个问题详解

### 2.1 太宽 — 页面横向没有边距

#### 根本原因
**提交 `a6fdbc8`** 把页面的横向内边距全部删除了。

**改动前（v1.6.21，正常）**：
```css
.page {
  padding: 44px 10px 12px 10px;  /* 左右各有 10px 内边距 */
}

/* 胶囊屏 */
@media (shape: capsule) {
  .page { padding: 30px 16px 30px 16px; }  /* 左右 16px */
}

/* 圆屏 */
@media (shape: circle) {
  .page { padding: 44px 36px 44px 36px; }  /* 左右 36px */
}
```

**改动后（a6fdbc8）**：
```css
.page {
  padding: 44px 0 12px 0;  /* ⚠️ 左右 0！ */
}
.page-scroll {
  padding: 0;
  align-items: center;      /* ⚠️ 新增居中 */
}

/* 各卡片改为用 margin 控制左右间距 */
.status-card { margin: 0 10px 14px 10px; }
.step-card   { margin: 0 10px 8px 10px; }
/* ... */
```

**为什么这样改有问题**：
- `.page-scroll { align-items: center }` 在 Quick 框架中，子元素会被横向居中，但如果子元素没有明确的 `width`，可能会导致意料之外的宽度行为。
- 卡片用 `margin` 替代 `page` 的 `padding`，在 Flex 布局中表现不一致，尤其当 `.page-scroll` 设置了 `align-items: center` 时。

#### 修复方向
恢复 `page` 或 `page-scroll` 的横向 `padding`，或者确保所有卡片和 section-title 有明确且一致的 `width`/`margin` 设定。建议回退为 v1.6.21 的 padding 方案。

---

### 2.2 标题乱 — "高级版" 标题变得太小

#### 根本原因
**提交 `a6fdbc8`** 同时在两个地方把胶囊屏标题字号从 `34px` 缩小到 `20px`。

**改动1 — [header.css](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/common/header.css#L113-L116)**（新增胶囊屏样式块）：
```css
/* a6fdbc8 新增 */
@media (shape: capsule), (shape: pill-shaped) {
  .header-title {
    font-size: 20px;        /* ⚠️ 从 26px（默认）暴降到 20px */
    line-height: 28px;
  }
  /* ... back-btn 40px 等 */
}
```

**改动2 — [activation.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation/activation.ux#L1056-L1059)**（胶囊屏 mq 内）：
```css
/* v1.6.21（正常） */
@media (shape: capsule) {
  .header-title { font-size: 34px; }   /* ✅ 34px 大标题 */
}

/* a6fdbc8 改后 */
@media (shape: capsule) {
  .header-title {
    font-size: 20px;        /* ❌ 从 34px → 20px，缩小 41% */
    line-height: 28px;
  }
}
```

**CSS 优先级分析**：
- `header.css` 的 mq `(shape: capsule)` 和 `activation.ux` 的 mq `(shape: capsule)` 选择器优先级相同。
- `activation.ux` 的样式在 `@import` 之后加载，理论上后者覆盖前者。但两边都写了 `20px`，无论谁覆盖谁，最终都是 `20px`。
- 结果是：胶囊屏上"高级版"三个字只有 `20px`，对比默认屏的 `32px` 和圆屏的 `30px`，严重偏小。

#### 修复方向
要么把 `header.css` 和 `activation.ux` 中胶囊屏的 `.header-title` 字号改回 `34px` 或至少 `28px`，要么删除 `activation.ux` 中胶囊屏对 `.header-title` 的覆盖（让它继承 header.css 默认的 `26px`）。

---

### 2.3 激活按钮丢失 — "验证" 按钮可能不可见或样式异常

这个问题在两个提交中逐步恶化：

#### a6fdbc8 的间接影响
- 模板重构：二维码从 `step-card` 内部移出，变成独立的 `qr-section-full`。这一步本身没问题，但改变了 `step-card` 的内容高度，可能影响内部按钮的布局。

#### v1.6.49 的直接损坏

**改动1 — 胶囊屏，keypad 按钮布局改为 flex 弹性**（[激活页面](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation/activation.ux#L1072-L1081)）：
```css
/* v1.6.21 / a6fdbc8（正常） */
.keypad-btn {
  width: 64px;           /* 固定宽度 */
  margin-left: 4px;
  margin-right: 4px;
}

/* v1.6.49 改后 */
.keypad-row {
  width: 100%;
  padding: 0 4px;        /* ⚠️ 新增 */
}
.keypad-btn {
  width: auto;           /* ⚠️ 改为自适应 */
  flex: 1;               /* ⚠️ 弹性伸缩 */
  min-width: 0;          /* ⚠️ 允许压缩到 0 */
  margin-left: 3px;
  margin-right: 3px;
}
```

问题：当 keypad 按钮变为 `flex: 1; min-width: 0` 后，在较窄的胶囊屏（内容宽约 160px）上，9 个按键（3行 × 3列）的总宽度可能超出 `step-card` 的宽度，导致整个 keypad 区域溢出，把下面的"验证"按钮推到可视区域之外。

**改动2 — 胶囊屏，"验证"按钮字号被移除**：
```css
/* a6fdbc8（正常） */
.verify-btn {
  height: 52px;
  font-size: 32px;       /* ✅ 保留大字号 */
}

/* v1.6.49 改后 */
.verify-btn {
  height: 52px;
  /* font-size: 32px; ❌ 被删除了！回退到默认 28px */
}
.verify-btn-text {        /* 新增但未使用的类 */
  font-size: 32px;
  line-height: 40px;
}
```

问题：`font-size: 32px` 被移除。新增的 `.verify-btn-text` 类声明了但没有在模板中的 `<input>` 元素上使用（模板里写的是 `class="verify-btn"`，不是 `verify-btn-text`）。所以这个样式是无效代码。

**改动3 — 方屏，添加 `max-width` 限制**（[激活页面](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation/activation.ux#L1092-L1123)）：
```css
.page-scroll { padding: 0 16px; }
.status-card, .step-card, .device-card, .history-list {
  max-width: 480px; width: 100%; align-self: center;
  margin-left: 0; margin-right: 0;
}
.qr-section-full {
  max-width: 360px; width: 100%; align-self: center;
}
```

此改动本身合理，但 `margin-left: 0; margin-right: 0` 覆盖了基础样式中的 `margin: 0 8px 14px 8px`，可能导致方屏上验证按钮周围间距异常。

#### 修复方向
1. 胶囊屏 keypad 按钮恢复为固定宽度（`width: 64px`），不依赖 flex 弹性。如果胶囊屏宽度不足以放下 3 个 64px 按钮 + 间距，应适当减小按钮尺寸。
2. 恢复胶囊屏 `.verify-btn { font-size: 32px; }`。
3. 删除未使用的 `.verify-btn-text` 样式。
4. 检查方屏 max-width 布局中 `step-card` 的 `margin` 是否正确。

---

## 3. 修复建议（按优先级）

| 优先级 | 问题 | 建议方案 |
|--------|------|----------|
| 🔴 P0 | 标题太小（20px） | 胶囊屏 `.header-title` 改回 `28px` 或 `34px` |
| 🔴 P0 | 激活按钮可能不可见 | 胶囊屏 keypad 按钮改回 `width: 64px` 固定宽度；恢复 `.verify-btn { font-size: 32px }` |
| 🟡 P1 | 页面太宽 | 检查 `page-scroll` 的 `align-items: center` 是否真正生效；考虑恢复 page 级别的横向 padding |
| 🟢 P2 | 死代码 | 删除 `.verify-btn-text`（未在模板中使用） |
| 🟢 P2 | 方屏 margin 覆盖 | 确认 `margin-left: 0; margin-right: 0` 的意图，确保方屏各卡片间距正确 |

---

## 4. 建议回退策略

最干净的修复方式：**以 v1.6.21（`03b07f5`）的 CSS 布局为基准**，然后仅合入 `a6fdbc8` 和 `6e1fa0b` 中有价值的非布局改动：

- ✅ 保留：`iconTheme` 动态图标切换逻辑（JavaScript 部分）
- ✅ 保留：绝对路径 `/common/icons/...`（如果确认工作正常）
- ✅ 保留：二维码独立 `qr-section-full` 结构（模板部分）
- ❌ 回退：所有 CSS 布局改动（padding → margin 方案、header-title 字号、keypad flex 布局）
- ❌ 回退：`header.css` 中新增的胶囊屏 `.header-title { font-size: 20px }`

---

## 5. 附录：关键 diff 摘要

### 5.1 a6fdbc8 — CSS 布局重构（破坏性）
```
.page padding:       44px 10px → 44px 0 (去掉了左右 padding)
.page-scroll:        +padding: 0; +align-items: center
.status-card:        padding: 22px → 14px; +margin: 0 10px 14px 10px; -align-items: center
header.css capsule:  +.header-title { font-size: 20px; line-height: 28px }
activation.ux capsule: .header-title 34px → 20px
```

### 5.2 v1.6.49 — CSS 继续调整（部分破坏性）
```
所有 mq .page:       padding 改为 0 横向（统一用 margin）
capsule keypad-btn:  width: 64px → width: auto; flex: 1; min-width: 0
capsule verify-btn:  font-size: 32px → 删除
capsule:             +.verify-btn-text（未使用）
rect:                +max-width: 480px; +.page-scroll padding
```