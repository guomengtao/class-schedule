# Xiaomi Quick App 遮罩/弹出层支持问题分析报告

## 问题概述

在 Xiaomi Quick App（快应用/Vela JS 框架）中，遮罩层（overlay）和弹出层（popup/dialog）存在两个核心问题：

1. **弹出层没有弹起来，跑到页面下面去了** — 遮罩和弹窗内容没有覆盖在页面之上，而是出现在页面内容的下方
2. **没有看到透明效果** — 遮罩背景色不透明或完全不可见

---

## 问题一：弹出层跑到页面下面

### 现象

遮罩层（`.sheet-overlay`）使用了 `position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000`，期望覆盖整个屏幕并浮动在页面内容上方。但实际渲染结果是：遮罩层和弹窗内容出现在页面正常文档流的底部，即页面内容下方，没有"浮起来"覆盖在页面上。

### 根因分析

#### 原因 1（🔴 P0）：`position: fixed` 不被快应用支持

快应用/Vela JS 框架的 CSS 子集远小于标准 Web CSS。根据项目中已有的分析报告（[color-list-layout-analysis.md](./color-list-layout-analysis.md)），快应用对定位属性的支持非常有限：

| 属性 | 标准 CSS | Quick App |
|------|:--:|:--:|
| `position: absolute` + `height: 100%` | ✅ | ❌ 高度计算为 0 |
| `position: fixed` | ✅ | ❓ 未验证，大概率不支持 |

**关键证据**：在 [color-list-layout-analysis.md](./color-list-layout-analysis.md) 中已验证，`position: absolute` + `height: 100%` 在快应用中**高度计算为 0**，元素塌陷不可见。这说明快应用对 `position` 属性的支持不完整。

`position: fixed` 比 `position: absolute` 更复杂——它需要脱离文档流并相对于视口定位。如果快应用引擎不支持 `position: fixed`，该属性会被忽略，元素回退到 `position: static`，表现为**正常文档流中的元素**，因此出现在页面底部。

#### 原因 2（🔴 P0）：`z-index` 可能不被快应用支持

`z-index` 控制元素的堆叠顺序。在快应用的轻量级渲染引擎中，`z-index` 可能不被支持。即使 `position: fixed` 生效，如果没有 `z-index` 支持，遮罩层可能无法浮动到页面内容上方。

**关联证据**：在 [week-view-landscape-mode-dev-plan.md](./week-view-landscape-mode-dev-plan.md) 的问题 5 中，关于 header/footer 被旋转容器遮挡的问题，解决方案中提到：

> 调整 header 和 footer 的 `z-index`（如果 QuickApp 支持）

这个"如果"说明 `z-index` 在快应用中的支持情况是不确定的。

#### 原因 3（🟡 P1）：组件作为 flex 子元素被布局到文档流中

查看 `unlock-dialog.ux` 的使用方式：

```html
<!-- 在 settings.ux 中 -->
<template>
  <div class="settings-page" style="background-color: {{ theme.bg }}">
    <!-- 页面内容... -->
    <unlock-dialog id="unlockDialog"></unlock-dialog>
  </div>
</template>
```

`<unlock-dialog>` 组件被放置在页面根 `<div>` 内部，作为页面文档流的一部分。当 `position: fixed` 不生效时，`.sheet-overlay` 就变成了一个普通的 flex 子元素，出现在页面底部。

#### 原因 4（🟡 P1）：`show` 指令与定位的交互问题

`unlock-dialog.ux` 使用 `show="{{ visible }}"` 控制显示/隐藏：

```html
<div class="sheet-overlay" show="{{ visible }}" style="background-color: rgba(0,0,0,0.35)">
```

`show` 指令在快应用中通过 `display: none` / `display: flex` 切换。当 `show` 切换时，元素的定位可能被重置，导致 `position: fixed` 失效。

### 受影响的文件

| 文件 | 使用的定位方式 | 问题 |
|------|-------------|------|
| `src/components/unlock-dialog.ux` | `position: fixed` + `z-index: 1000` | 遮罩和弹窗跑到页面底部 |
| `src/pages/check-demo/check-demo.ux` | `position: fixed` + `z-index: 100` | 同上，`.premium-overlay` 未浮起 |

---

## 问题二：没有透明效果

### 现象

遮罩层设置了 `background-color: rgba(0,0,0,0.35)`，期望显示半透明黑色遮罩。但实际渲染结果是：遮罩完全透明（看不到遮罩层）或完全不透明（纯黑色遮挡一切）。

### 根因分析

#### 原因 1（🔴 P0）：`rgba()` 在快应用内联样式中不被支持

这是**已有文档验证过的已知问题**。在 [course-progress-background-analysis.md](./course-progress-background-analysis.md) 中有明确记录：

> **问题1：快应用不支持 `opacity` 内联样式**
> 进度条 `div` 设置了 `opacity: 0.2`，但快应用内联样式不支持 `opacity` 属性。
> **修复**：将 `opacity` 合并到 `background-color`，使用 `rgba` 格式

在 [index-status-toggle-not-showing-analysis.md](./index-status-toggle-not-showing-analysis.md) 中也有记录：

> **原因 2（🟡 中等）：QuickApp 可能不支持 `rgba()`**
> QuickApp 的 CSS 引擎基于轻量级实现，可能不支持 `rgba()` 语法。如果 `rgba()` 解析失败，`background-color` 会回退为透明，按钮虽然存在（有 `width` 和 `height`），但背景色与父容器相同，视觉上不可见。

**关键结论**：快应用对外层 CSS 类中的 `rgba()` 支持程度不确定，但**内联 `style` 属性中**的 `rgba()` 大概率不支持。

#### 原因 2（🔴 P0）：`opacity` 属性不被快应用支持

`opacity` 属性在快应用中不被支持，这已在 [course-progress-background-analysis.md](./course-progress-background-analysis.md) 中验证。因此无法通过 `opacity: 0.35` 来实现半透明遮罩效果。

#### 原因 3（🟡 P1）：内联 `style` 中的 `rgba()` 解析失败时回退为透明

当快应用 CSS 解析器遇到无法识别的 `rgba()` 语法时，可能的行为：

1. **忽略整个属性**：`background-color` 被视为未设置，默认为 `transparent`
2. **尝试解析但失败**：可能解析为 `rgb(0,0,0)` 但丢失 alpha 通道，变成纯黑色
3. **部分解析**：可能只解析出颜色值但 alpha 被忽略，变成不透明

#### 原因 4（🟢 P2）：`unlock-dialog.ux` 将 `rgba()` 放在内联 `style` 中

```html
<div class="sheet-overlay" show="{{ visible }}" style="background-color: rgba(0,0,0,0.35)">
```

这个 `background-color` 是内联样式，而非 CSS 类中的样式。快应用对内联 `style` 的解析能力通常比 CSS 类更弱。如果内联样式不支持 `rgba()`，遮罩背景色就完全失效。

### 受影响的文件

| 文件 | 使用的透明方式 | 问题 |
|------|-------------|------|
| `src/components/unlock-dialog.ux` | `style="background-color: rgba(0,0,0,0.35)"` 内联 | 透明效果可能不生效 |
| `src/pages/check-demo/check-demo.ux` | `style="background-color: rgba(0,0,0,0.6)"` 内联 | 同上 |
| `src/pages/index/index.ux` (进度条) | `rgba()` 在数据中 | 已通过主题色定义解决 |

---

## 综合根因：快应用 CSS 子集限制

快应用/Vela JS 框架的 CSS 支持是**标准 CSS 的一个子集**，以下属性在快应用中存在已知问题：

| CSS 属性 | 标准 Web | 快应用支持情况 | 证据来源 |
|---------|:--:|:--:|------|
| `position: fixed` | ✅ | ❓ 大概率不支持 | 本文分析 |
| `position: absolute` + `height: 100%` | ✅ | ❌ 高度计算为 0 | [color-list-layout-analysis.md](./color-list-layout-analysis.md) |
| `z-index` | ✅ | ❓ 不确定 | [week-view-landscape-mode-dev-plan.md](./week-view-landscape-mode-dev-plan.md) |
| `opacity` (内联样式) | ✅ | ❌ 不支持 | [course-progress-background-analysis.md](./course-progress-background-analysis.md) |
| `rgba()` (内联样式) | ✅ | ❓ 大概率不支持 | [index-status-toggle-not-showing-analysis.md](./index-status-toggle-not-showing-analysis.md) |
| `transform` | ✅ | ❌ 部分场景不生效 | [color-list-layout-analysis.md](./color-list-layout-analysis.md) |
| `overflow: hidden` + `flex row` | ✅ | ❌ 裁剪行为异常 | [color-list-layout-analysis.md](./color-list-layout-analysis.md) |
| `border-top-width` 等单边属性 | ✅ | ❌ 不识别，变为四边 | [border-single-side-bug-analysis.md](./border-single-side-bug-analysis.md) |
| `<text>` 嵌套 `<text>` | ✅ | ❌ 内层脱离父级流 | [index-status-icon-analysis.md](./index-status-icon-analysis.md) |

---

## 建议修复方案

### 方案一：使用 `if` 替代 `show` + 内联遮罩（推荐）

不用 `position: fixed`，改用 `if` 指令直接替换页面内容：

```html
<template>
  <div class="page">
    <!-- 正常页面内容 -->
    <div class="page-content" if="{{ !showDialog }}">
      <!-- 原有的页面内容 -->
    </div>

    <!-- 弹窗内容：直接替换整个页面 -->
    <div class="fullscreen-dialog" if="{{ showDialog }}" style="background-color: {{ theme.bg }}">
      <div class="dialog-card" style="background-color: {{ theme.card }}">
        <!-- 弹窗内容 -->
      </div>
    </div>
  </div>
</template>
```

**原理**：不用遮罩 + 浮层，而是用 `if` 指令直接在页面内切换显示内容。弹窗出现时，整个页面变成弹窗界面，背景色用 `theme.bg` 模拟遮罩效果。

**优势**：
- 不依赖 `position: fixed`
- 不依赖 `z-index`
- 不依赖 `rgba()` 透明度
- 使用快应用原生支持的 `if` 指令

**劣势**：弹窗出现时，原来的页面内容完全消失，无法"透过遮罩看到背后内容"。

### 方案二：底部半屏抽屉（Bottom Sheet）

参考 [pro-prompt-upgrade.md](./pro-prompt-upgrade.md) 中的方案，将弹窗改为底部滑出的半屏抽屉：

```html
<template>
  <div class="page">
    <!-- 页面内容正常显示 -->
    <div class="page-content">
      <!-- ... -->
    </div>

    <!-- 底部抽屉：在文档流末尾，从底部滑出 -->
    <div class="bottom-sheet" show="{{ showSheet }}" style="background-color: {{ theme.card }}">
      <div class="sheet-handle" style="background-color: {{ theme.textMuted }}"></div>
      <!-- 弹窗内容 -->
    </div>
  </div>
</template>

<style>
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 16px 16px 0 0;
  flex-direction: column;
}
</style>
```

**原理**：弹窗是页面文档流的一部分，不依赖 `position: fixed`。使用 `position: absolute; bottom: 0` 定位在底部，这在快应用中比 `position: fixed` 更可靠。

**优势**：
- 不依赖 `position: fixed`
- 不依赖 `z-index`
- 符合穿戴设备手势操作习惯
- 用户下滑即可关闭

### 方案三：用 `#ARGB` 格式替代 `rgba()`

如果快应用支持 CSS 类中的 `background-color`，可以尝试使用 8 位十六进制颜色格式（`#AARRGGBB`）：

```css
.sheet-overlay {
  background-color: #59000000;  /* rgba(0,0,0,0.35) 的 #AARRGGBB 格式 */
}
```

**注意**：快应用是否支持 8 位 hex 颜色需要验证。如果不支持，可以用纯色代替：

```css
.sheet-overlay {
  background-color: #1a1a2e;  /* 用深色主题背景色代替半透明遮罩 */
}
```

### 方案四：使用快应用原生 `prompt` API

如果快应用提供了原生的弹窗/对话框 API（如 `prompt.showDialog`），优先使用原生 API：

```javascript
import prompt from '@system.prompt'

prompt.showDialog({
  title: '解锁高级功能',
  message: '一次性解锁，永久使用全部高级功能',
  buttons: [
    { text: '暂不需要', color: '#888899' },
    { text: '立即解锁', color: '#7ec8e3' }
  ],
  success: function(data) {
    if (data.index === 1) {
      router.push({ uri: '/pages/activation' })
    }
  }
})
```

**优势**：原生实现，兼容性最好，不需要自己处理遮罩和定位。

**劣势**：样式定制能力有限，可能无法完全匹配设计稿。

---

## 推荐实施路径

| 优先级 | 方案 | 适用场景 | 改动量 |
|--------|------|---------|--------|
| 🔴 P0 | 方案一：`if` 全屏替换 | 解锁弹窗等需要强提示的场景 | 中 |
| 🟡 P1 | 方案二：底部半屏抽屉 | 功能触发时的轻提示 | 小（仅改 CSS） |
| 🟢 P2 | 方案四：原生 `prompt` API | 简单确认对话框 | 最小 |

**建议**：对于 `unlock-dialog.ux`，优先采用**方案一 + 方案二**的组合——将当前基于 `position: fixed` + `rgba()` 遮罩的实现，改为不使用遮罩的底部半屏抽屉模式。

---

## 相关文档

- [color-list-layout-analysis.md](./color-list-layout-analysis.md) — `position: absolute` + `height: 100%` 在快应用中高度计算为 0
- [course-progress-background-analysis.md](./course-progress-background-analysis.md) — `opacity` 内联样式不被快应用支持
- [index-status-toggle-not-showing-analysis.md](./index-status-toggle-not-showing-analysis.md) — `rgba()` 在快应用中可能不被支持
- [border-single-side-bug-analysis.md](./border-single-side-bug-analysis.md) — 快应用 CSS 子集限制汇总
- [pro-prompt-upgrade.md](./pro-prompt-upgrade.md) — 底部半屏抽屉替代居中弹窗的方案
- [week-view-landscape-mode-dev-plan.md](./week-view-landscape-mode-dev-plan.md) — `z-index` 支持情况不确定
- [index-status-icon-analysis.md](./index-status-icon-analysis.md) — `<text>` 嵌套 `<text>` 在快应用中内层脱离父级流