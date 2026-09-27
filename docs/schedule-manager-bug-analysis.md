# 课程表管理 - Bug 分析与修复方案

## Bug 1：底部操作面板点击关闭冲突

### 问题描述

点击课程表行右侧的「三个小点」按钮（`.more-hit`），会从底部弹出操作面板（`.overlay-sheet`）。当前行为是：**点击面板内部任意区域也会关闭面板**，这与用户的操作意图冲突——用户点击面板内的按钮（如「重命名」「复制」等）时，面板意外关闭。

### 根因分析

模板结构如下（[schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L43-L84)）：

```html
<div class="overlay-sheet" if="{{ sheetIndex >= 0 }}" onclick="closeSheet">
  <div class="sheet-card" onclick="stopBubble">
    <!-- 面板内容：标题、按钮网格、取消按钮 -->
  </div>
</div>
```

- `.overlay-sheet`（遮罩层）绑定了 `onclick="closeSheet"`，点击遮罩关闭面板 ✅
- `.sheet-card`（面板卡片）绑定了 `onclick="stopBubble"`，意在阻止事件冒泡 ❌

问题出在 `stopBubble()` 函数的实现（[schedule-manager.ux:L567](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L567)）：

```js
stopBubble() {
  // 空函数！没有阻止事件传播
},
```

这是一个**空函数**，没有调用任何事件阻止机制（如 `event.stopPropagation()`）。因此，点击面板卡片内部时，点击事件冒泡到父元素 `.overlay-sheet`，触发了 `closeSheet()`，导致面板关闭。

类似模式也出现在整个项目中（[premium-overlay.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/premium-overlay.ux#L83-L85)、[unlock-dialog.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/unlock-dialog.ux#L97-L99)、[reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L264-L266)），均使用空函数 `stopBubble() {}`。

### 影响范围

用户尝试点击面板内的操作按钮时，可能误触关闭面板。尤其在手环小屏幕上，按钮密集，误触率更高。例如点击「重命名」按钮区域边缘时，面板先关闭，操作未执行。

### 修复方案

#### 方案 A：利用框架事件对象（推荐）

在 Quick App 框架中，函数可以接收事件对象参数。改造 `stopBubble`：

```js
stopBubble(e) {
  // 阻止事件继续传播到父级遮罩层
  if (e && e.stopPropagation) {
    e.stopPropagation()
  }
}
```

然后在模板中保持现有结构不变：

```html
<div class="overlay-sheet" if="{{ sheetIndex >= 0 }}" onclick="closeSheet">
  <div class="sheet-card" onclick="stopBubble">
    <!-- ... -->
  </div>
</div>
```

> **注意**：如果所用框架不支持 `event.stopPropagation()`，请改用方案 B。

#### 方案 B：移除遮罩层的 onclick，改为独立关闭按钮

将关闭逻辑从遮罩层移除，用户只能通过「取消」按钮关闭面板。这样彻底规避事件冒泡问题。

```html
<div class="overlay-sheet" if="{{ sheetIndex >= 0 }}">
  <div class="sheet-card" style="background-color: {{ theme.card }}">
    <!-- ... 面板内容 ... -->
    <input class="sheet-close" type="button" value="取消" onclick="closeSheet" ... />
  </div>
</div>
```

缺点：用户无法通过点击面板外部（遮罩区域）关闭面板，交互不够灵活。

#### 方案 C：分离遮罩层和卡片容器

将遮罩层改为背景+前景分离结构，用 `stack` 或绝对定位分别控制：

```html
<stack class="overlay-sheet" if="{{ sheetIndex >= 0 }}">
  <div class="sheet-backdrop" onclick="closeSheet"></div>
  <div class="sheet-card-wrapper">
    <div class="sheet-card" style="background-color: {{ theme.card }}">
      <!-- ... 面板内容 ... -->
    </div>
  </div>
</stack>
```

遮罩点击 (`sheet-backdrop`) → 关闭面板；卡片区域无 `onclick` → 不关闭。

> **2026-09-27 更新**：最终决策改为「点课程名打开面板，面板内切换课表」，详见 [schedule-manager-split-tap-analysis.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/schedule-manager-split-tap-analysis.md)。本文件中的 Bug 2 修复方案已过时。

### 问题描述

在**胶囊屏**（198px 宽）上，每个课程表行右侧有三个小点按钮（`.more-hit`），占用了宝贵的水平空间，导致课程名称只能显示约 **3 个中文字**（超过的部分被 `text-overflow: ellipsis` 截断）。

### 根因分析

胶囊屏的列表项布局（[schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux))）：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .item {
    height: 64px;
    padding: 0 2px 0 14px;   /* 左右内边距 2+14 = 16px */
    margin-bottom: 10px;
  }
  .more-hit {
    width: 60px;              /* 三个小点按钮固定 60px */
    height: 64px;
  }
}
```

**空间计算**（胶囊屏 198px 宽，页面 padding 10px 左右）：

| 项目 | 宽度 | 说明 |
|------|------|------|
| 页面总宽 | 198px | — |
| 页面 padding（左右各 10px） | -20px | `padding: 44px 10px 20px 10px` |
| item padding-left | -14px | `padding: 0 2px 0 14px` |
| item padding-right | -2px | 同上 |
| indicator 圆点（+ margin-right） | -28px | width 16px + margin-right 12px |
| `.more-hit` 三个小点按钮 | -60px | 固定宽度 |
| **课程名剩余宽度** | **= 74px** | 约 **3 个中文字**（24px 字号） |

当课程名称为「高等数学」（4 字）时，实际显示为「高等数…」，用户无法区分不同课程表。

### 修复方案

**核心思路**：在胶囊屏上隐藏三个小点按钮（`.more-hit`），为课程名腾出 60px 空间。课程名区域和小点按钮的点击行为统一为**切换课程表**（`toggle`），不再弹出底部操作面板。

#### 改动 1：胶囊屏隐藏 `.more-hit`

```css
@media (shape: capsule), (shape: pill-shaped) {
  .more-hit {
    display: none;
    /* width / height 保留以备将来启用 */
  }
}
```

#### 改动 2：统一点击行为为切换课程表

课程名区域（`.item-main`）和三个小点按钮（`.more-hit`）均绑定 `toggle($idx)`：

```html
<div class="item-main" onclick="toggle($idx)">
  ...
</div>
<div class="more-hit" onclick="toggle($idx)">
  ...
</div>
```

不再需要 `handleItemTap()` 条件分支、`isCapsule` 状态和 `device.getInfo` 探测，代码更简洁。

#### 改造后空间对比

| 项目 | 改造前 | 改造后 |
|------|--------|--------|
| indicator | 28px | 28px |
| 课程名 | **74px**（≈3字） | **134px**（≈5-6字） |
| 三个小点按钮 | 60px（占位但可点击） | 0px（隐藏） |
| 总空间 | 162px | 162px |

**效果**：课程名从显示 3 个字提升到 5-6 个字，常见课程名「高等数学」「英语四级」「大学物理」等均可完整显示。

---

## Bug 3（需求变更）：移除列表项到底部面板的入口

### 变更内容

用户确认后，三个小点按钮不再打开底部操作面板，改为切换课程表。这意味着从列表项进入底部面板的入口被移除。

### 影响分析

| 功能 | 入口状态 | 替代入口 |
|------|---------|---------|
| 切换课程表 | ✅ 课程名 / 小点按钮均可 | — |
| 底部面板（重命名 / 复制 / 导出 / 总览 / 统计 / 删除） | ❌ 从列表项移除 | 需从其他页面或新增入口进入 |

> 底部面板的模板和逻辑代码保留不变，未来可通过其他入口（如长按、设置页等）重新启用。

---

## 修改涉及文件

| 文件 | 改动 |
|------|------|
| [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux) | `stopBubble(e)` 接收事件参数并阻止传播；胶囊屏 CSS 增加 `display: none`；`.item-main` 和 `.more-hit` 均绑定 `toggle($idx)`；移除 `handleItemTap`、`isCapsule`、`device` 导入及相关代码 |