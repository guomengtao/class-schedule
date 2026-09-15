# Vela JS 框架不支持属性/方法/API 开发参考

> 本文档整理收集 Vela JS 框架（小米手环/手表快应用）**不支持或部分支持**的 CSS 属性、HTML 组件、JS API 等，作为开发参考，明确禁止使用，避免引入白屏/黑屏/布局异常 Bug。

---

## 目录

1. [CSS 属性 — 完全禁用](#1-css-属性--完全禁用)
2. [CSS 属性 — 部分支持/有条件使用](#2-css-属性--部分支持有条件使用)
3. [HTML 组件 — 不支持](#3-html-组件--不支持)
4. [JS API — 不支持](#4-js-api--不支持)
5. [CSS 伪类/选择器 — 不支持](#5-css-伪类选择器--不支持)
6. [事件绑定规范](#6-事件绑定规范)
7. [`@media` 媒体查询注意事项](#7-media-媒体查询注意事项)
8. [模块导入规范](#8-模块导入规范)
9. [已知陷阱与最佳实践](#9-已知陷阱与最佳实践)

---

## 1. CSS 属性 — 完全禁用

以下 CSS 属性在 Vela JS 框架中**完全不支持**，使用后可能导致：
- CSS 解析器直接失败 → **整个页面白屏/黑屏**
- 属性被静默忽略 → 布局异常
- 渲染行为不可预测

### 1.1 box-sizing ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🔴 P0 — 导致白屏/黑屏 |
| 现象 | CSS 解析器遇到 `box-sizing` 直接失败，整个页面渲染异常 |
| 影响范围 | 整页白屏/黑屏 |
| 修复方式 | 删除该属性 |
| 参考 commit | `071a37b`, `b7819e7`, `7fcba0a` |
| 涉及文件历史 | `index-full.ux`, `test-area.ux` |

```css
/* ❌ 禁止 */
.schedule-page {
  box-sizing: border-box;
}

/* ✅ 替代：Vela 默认行为类似 border-box，无需显式声明 */
.schedule-page {
  /* 直接删除 box-sizing 即可 */
}
```

### 1.2 height: auto ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🔴 P0 — 导致白屏 |
| 现象 | `height: auto` 在 Vela 中不被识别，导致元素高度塌陷为 0 |
| 修复方式 | 使用具体数值或百分比 |
| 参考 commit | `b7819e7` |
| 涉及文件 | `activation.ux:854` |

```css
/* ❌ 禁止 */
.container {
  height: auto;
}

/* ✅ 替代：使用具体高度 */
.container {
  height: 100%;
  /* 或具体像素值，如 height: 200px; */
}
```

### 1.3 position: fixed ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🔴 P0 — 可能导致黑屏 |
| 现象 | Vela 不支持 `position: fixed`，元素回退为 `position: static`，出现在正常文档流底部 |
| 修复方式 | 使用 `position: absolute` + `<stack>` 容器 |
| 参考文档 | `docs/xiaomi-quickapp-overlay-solution.md` |
| 参考 commit | `c490e47` |

```css
/* ❌ 禁止 */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

```html
<!-- ✅ 替代方案：使用 <stack> + position: absolute -->
<stack>
  <!-- 主内容 -->
  <div class="page-content">...</div>
  
  <!-- 遮罩层（后写的在上面） -->
  <div class="overlay" show="{{ showOverlay }}" style="background-color: rgba(0,0,0,0.5)">
    <!-- 弹窗内容 -->
  </div>
</stack>
```

```css
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
}
```

### 1.4 z-index ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🟡 P1 — 静默忽略 |
| 现象 | `z-index` 被忽略，无法控制层叠顺序 |
| 修复方式 | 用 `<stack>` 子元素书写顺序控制层级（后写的在上面） |
| 参考文档 | `docs/xiaomi-quickapp-overlay-solution.md` |

```css
/* ❌ 禁止 */
.overlay {
  z-index: 1000;
}

/* ✅ 替代：使用 <stack> 容器 + 子元素书写顺序 */
```

### 1.5 border 单边属性 ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🟡 P1 — 渲染为四边边框 |
| 现象 | 只想要单边分割线，实际渲染出上下左右四根线 |
| 修复方式 | 只用 `border` 简写、`border-width`、`border-style`、`border-color` 全局属性 |
| 参考文档 | `docs/border-single-side-bug-analysis.md` |

以下属性在 Vela 中**不存在**，全部禁止：

```css
/* ❌ 全部禁止 */
border-top
border-top-width
border-top-style
border-top-color
border-bottom
border-bottom-width
border-bottom-style
border-bottom-color
border-left
border-left-width
border-left-style
border-left-color
border-right
border-right-width
border-right-style
border-right-color
border-radius-top-left      /* 单角圆角也不支持 */
border-radius-top-right
border-radius-bottom-left
border-radius-bottom-right
```

```css
/* ✅ 替代方案一：用 border 画四边（效果相同则直接用） */
.panel {
  border: 1px solid rgba(128, 128, 128, 0.15);
}

/* ✅ 替代方案二：用 div 画单边（只需要一条分割线时） */
<div class="divider" style="background-color: rgba(128,128,128,0.15)"></div>
.divider {
  height: 1px;
  width: 100%;
}
```

### 1.6 transform: translateX() (部分场景) ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🟡 P1 — flex 布局中不生效 |
| 现象 | 在 `flex` 布局子元素上 `translateX()` 可能不生效 |
| 修复方式 | 用 `if` 指令条件渲染 + `@keyframes` 动画替代 |
| 参考文档 | `docs/color-list-layout-analysis.md` |

```css
/* ❌ 在 flex 布局中不可靠 */
.swiped {
  transform: translateX(-60px);
}

/* ✅ 替代：用 @keyframes 动画 */
.slide-in {
  animation-name: slideIn;
  animation-duration: 300ms;
  animation-fill-mode: forwards;
}

@keyframes slideIn {
  0% { transform: translateX(-60px); }
  100% { transform: translateX(0); }
}
```

### 1.7 transition ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🟡 P1 — 不支持 |
| 修复方式 | 用 `@keyframes` + `animation` 替代 |
| 参考文档 | `docs/xiaomi-quickapp-overlay-transparency-analysis.md` |

```css
/* ❌ 禁止 */
.element {
  transition: all 0.3s ease;
}

/* ✅ 替代 */
.element {
  animation-name: fadeIn;
  animation-duration: 300ms;
  animation-fill-mode: forwards;
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

### 1.8 position: absolute + height: 100% 组合 ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🟡 P1 — 高度计算为 0 |
| 现象 | 绝对定位元素的 `height: 100%` 计算为 0，元素塌陷不可见 |
| 修复方式 | 使用固定高度或 `<stack>` 方案 |
| 参考文档 | `docs/color-list-layout-analysis.md` |

```css
/* ❌ 高度塌陷为 0 */
.abs-element {
  position: absolute;
  height: 100%;
}

/* ✅ 替代 */
.abs-element {
  position: absolute;
  top: 0;
  bottom: 0;  /* 用 top+bottom 撑开 */
}
```

### 1.9 flex-direction: row + overflow: hidden 组合 ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🟡 P1 — 裁剪行为异常 |
| 现象 | flex row 下 overflow hidden 裁剪行为不可预测 |
| 修复方式 | 用 `if` 指令条件渲染替代 overflow hidden |
| 参考文档 | `docs/color-list-layout-analysis.md` |

### 1.10 min-height: 100% ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🟡 P1 — 不能撑满屏幕 |
| 现象 | 手环上 `min-height: 100%` 不能撑满屏幕，内容只显示在左上角 |
| 修复方式 | 必须显式指定 `width: 100%; height: 100%` |
| 参考文档 | `docs/band9pro-black-screen-fix-plan.md` |
| 参考 commit | `1f0a13f` |

```css
/* ❌ 禁止 */
.page {
  min-height: 100%;
}

/* ✅ 替代 */
.page {
  width: 100%;
  height: 100%;
}
```

---

## 2. CSS 属性 — 部分支持/有条件使用

### 2.1 opacity

| 项目 | 内容 |
|------|------|
| 使用条件 | ✅ CSS 类中支持，❌ 内联 `style=""` 中不支持 |
| 正确写法 | 必须在 `<style>` 块中定义 |

```html
<!-- ❌ 内联 opacity 不生效 -->
<div style="opacity: 0.5">...</div>

<!-- ✅ CSS 类中定义 -->
<style>
.faded { opacity: 0.5; }
</style>
<div class="faded">...</div>
```

### 2.2 rgba() 颜色

| 项目 | 内容 |
|------|------|
| 使用条件 | ✅ CSS 类中支持，⚠️ 内联 `style=""` 中大概率不生效 |
| 正确写法 | 在 `<style>` 块中定义背景色 |
| 参考文档 | `docs/xiaomi-quickapp-overlay-solution.md` |

```html
<!-- ❌ 内联 rgba 可能不生效 -->
<div style="background-color: rgba(0,0,0,0.5)"></div>

<!-- ✅ CSS 类中定义 -->
<style>
.overlay-bg { background-color: rgba(0, 0, 0, 0.5); }
</style>
<div class="overlay-bg"></div>
```

### 2.3 position: absolute

| 项目 | 内容 |
|------|------|
| 使用条件 | ✅ 支持，但注意 `height: 100%` 在其内部失效（见 1.8） |
| 层级控制 | 必须在 `<stack>` 容器内使用，靠书写顺序控制层级 |

### 2.4 @keyframes / animation

| 项目 | 内容 |
|------|------|
| 使用条件 | ✅ 支持（`animation-name`, `animation-duration`, `animation-fill-mode: forwards`） |
| 限制 | `animation-fill-mode` 仅 `forwards` 可用 |
| 注意 | Vela 的 `@keyframes` 属性明确包含 `background-color: <color>`，确认 rgba 可用 |

### 2.5 left / top / right / bottom

| 项目 | 内容 |
|------|------|
| 使用条件 | ✅ 支持，但**仅支持 px 单位**，不支持百分比 |
| 居中替代 | 使用 `justify-content: center` + `align-items: center` |

```css
/* ❌ 百分比不支持 */
.centered {
  left: 50%;
  top: 50%;
}

/* ✅ 使用 flex 居中 */
.centered {
  justify-content: center;
  align-items: center;
}
```

### 2.6 transform (JS 动态设置)

| 项目 | 内容 |
|------|------|
| 使用条件 | ✅ CSS 中静态 transform 支持 |
| JS 动态设置 | ❌ 字符串格式不生效，**必须用 `JSON.stringify()` 对象格式** |

```js
// ❌ 字符串格式不生效
element.transform = 'translateX(100px)'

// ✅ 对象格式（必须 JSON.stringify）
element.transform = JSON.stringify({ translateX: "100px" })
```

---

## 3. HTML 组件 — 不支持

### 3.1 input type="text" ❌

| 项目 | 内容 |
|------|------|
| 严重级别 | 🔴 P0 — 页面打不开 |
| 修复方式 | 使用项目内置的 `InputMethod` 自定义组件 |
| 参考文档 | `docs/prompt-demo-link-not-opening-analysis.md` |

```html
<!-- ❌ 禁止 -->
<input type="text" value="{{ name }}" onchange="onNameChange" />

<!-- ✅ 使用 InputMethod 组件 -->
<import name="InputMethod" src="../../components/InputMethod/InputMethod.ux" />
<InputMethod value="{{ name }}" onchange="onNameChange" />
```

### 3.2 slider 组件 ❌

| 项目 | 内容 |
|------|------|
| 修复方式 | 使用按钮式 "+" "-" 调节替代 |
| 参考文档 | `docs/prompt-demo-link-not-opening-analysis.md` |

### 3.3 input 组件仅支持 type="button"

| 项目 | 内容 |
|------|------|
| 允许 | `<input type="button">` |
| 禁止 | `<input type="text">`, `<input type="number">`, `<input type="checkbox">` 等 |

---

## 4. JS API — 不支持

### 4.1 prompt.showDialog() ❌

| 项目 | 内容 |
|------|------|
| 说明 | Vela 无系统弹窗 API |
| 修复方式 | 自行用 `<stack>` + `position: absolute` 实现自定义弹窗 |

### 4.2 window.backgroundColor (config.json) ❌

| 项目 | 内容 |
|------|------|
| 说明 | `config.json` 中配置 `window.backgroundColor` **完全无效** |
| 修复方式 | 必须用最外层 div 的背景色铺满屏幕 |
| 参考文档 | `docs/band9pro-black-screen-fix-plan.md` |

### 4.3 事件绑定规范

| 项目 | 内容 |
|------|------|
| 允许 | `onclick="handler"` |
| 禁止 | `@click="handler"` (Vue 风格，Vela 不识别) |

---

## 5. CSS 伪类/选择器 — 不支持

Vela JS 框架不支持 CSS 伪类选择器：

```css
/* ❌ 全部禁止 */
:last-child
:nth-child()
:first-child
:nth-of-type()
:not()
:hover
:focus
:active
:visited
::before
::after
```

替代方案：使用 `if` / `for` 指令 + JavaScript 数据控制渲染。

---

## 6. 事件绑定规范

| 正确写法 | 错误写法 |
|----------|----------|
| `onclick="handler"` | `@click="handler"` |
| `onchange="handler"` | `@change="handler"` |
| `onlongpress="handler"` | — |

---

## 7. `@media` 媒体查询注意事项

### 7.1 shape 媒体查询的正确写法

Vela 框架中 `@media (shape: capsule)` **不生效**（commit `1197642` 验证：27 处 `@media(shape:capsule)` 均为无效，465 条 CSS 声明从未应用）。

正确的 shape 值取决于设备和 Vela 版本：
- 部分设备：`shape: round` / `shape: rect`
- 手环 9Pro：`shape: rect`（方形）

**推荐做法**：对于胶囊屏/圆屏等形状判断，不依赖 `@media (shape: xxx)`，而是用**运行时屏幕宽高比**：

```js
// ✅ 运行时判断胶囊屏
var device = require("@system.device")
device.getInfo({
  success: function(info) {
    var isCapsule = info.screenWidth / info.screenHeight < 0.55
  }
})
```

### 7.2 可用的 @media 查询

当前项目中确认可用的 @media 查询：
- `@media (shape: circle)` — 圆形手表
- `@media (shape: rect)` — 方形手环（手环 9Pro）

---

## 8. 模块导入规范

| 规范 | 说明 |
|------|------|
| 推荐 | `import` 优于 `require` |
| 注意 | `require` 回调中 `this` 绑定可能丢失 |
| 系统模块 | 使用 `@system.xxx` 路径：`@system.router`, `@system.prompt`, `@system.device`, `@system.storage` 等 |

---

## 9. 已知陷阱与最佳实践

### 9.1 `$forceUpdate()` 解决条件渲染黑屏

在 `onShow()` 末尾调用 `this.$forceUpdate()` 可以解决 Vela 部分固件初次条件渲染 `if` 嵌套导致的不重绘黑屏问题。

```js
onShow() {
  // ... 所有逻辑 ...
  this.$forceUpdate()  // 强制重绘
}
```

### 9.2 根容器必须显式指定宽高

Vela 渲染引擎不支持 `min-height: 100%` 撑满屏幕，必须显式指定：

```css
.page {
  width: 100%;
  height: 100%;
  flex-direction: column;
}
```

### 9.3 背景色必须由 div 提供

`config.json` 的 `window.backgroundColor` 完全无效，必须用最外层 div 的背景色：

```html
<div class="page" style="background-color: {{ theme.bg }}">
```

### 9.4 条件渲染：`if` vs `show`

| 场景 | 推荐指令 | 原因 |
|------|----------|------|
| 弹窗/遮罩等一次性展示 | `if="{{ ... }}"` | 释放内存 |
| 频繁切换显隐 | 内联 `display: {{ cond ? 'flex' : 'none' }}` | 避免重复挂载开销 |

注意：大量 `if` 指令曾触发 Vela 局部黑屏，需要权衡使用。

### 9.5 不允许的 CSS 组合速查

| 组合 | 效果 |
|------|------|
| `position: absolute` + `height: 100%` | 高度塌陷为 0 |
| `flex-direction: row` + `overflow: hidden` | 裁剪行为异常 |
| `transform: translateX()` + flex 布局 | 可能不生效 |
| `left/top` + 百分比单位 | 不生效（仅 px 支持） |
| `opacity` / `rgba()` + 内联 style | 可能不生效 |

### 9.6 页面加载顺序初始化保护

`database.init()` 在同一 tick 内被多次调用时，只有第一次会触发 `initStorage()`，后续调用只注册回调。确保入口页（如 `welcome`）先完成初始化，再跳转到重页面。

### 9.7 参考文档索引

| 文档 | 内容 |
|------|------|
| `docs/xiaomi-quickapp-overlay-solution.md` | 弹窗/遮罩层实现方案（已确认的能力与不支持能力） |
| `docs/xiaomi-quickapp-overlay-bug-analysis.md` | CSS 子集限制完整列表 |
| `docs/xiaomi-quickapp-overlay-transparency-analysis.md` | transform/@keyframes/transition 支持情况 |
| `docs/border-single-side-bug-analysis.md` | border 单边属性不支持分析 |
| `docs/color-list-layout-analysis.md` | absolute+100%/overflow+flex/transform 组合问题 |
| `docs/band9pro-black-screen-fix-plan.md` | 手环 9Pro 黑屏修复（min-height/显式宽高） |
| `docs/prompt-demo-link-not-opening-analysis.md` | 框架兼容性检查清单 |
| `docs/index-band9pro-black-screen-analysis.md` | 屏幕形状适配缺失导致黑屏 |
| `docs/position-fixed-black-screen-verification.md` | position:fixed 黑屏根因裁定 |

---

## 附录：快速检查清单

开发新页面或修改 CSS 时，逐项检查：

- [ ] 无 `box-sizing`
- [ ] 无 `height: auto`
- [ ] 无 `position: fixed`（用 `<stack>` + `absolute` 替代）
- [ ] 无 `z-index`（用 `<stack>` 书写顺序替代）
- [ ] 无 `border-top` / `border-bottom` / `border-left` / `border-right` 单边属性
- [ ] 无 `transition`（用 `@keyframes` 替代）
- [ ] 无 CSS 伪类（`:last-child`, `:nth-child` 等）
- [ ] 根容器有显式 `width: 100%; height: 100%`
- [ ] 无 `position: absolute` + `height: 100%` 组合
- [ ] 无 `input type="text"`（用 `InputMethod` 组件）
- [ ] 事件绑定用 `onclick=` 而非 `@click=`
- [ ] 内联 style 中无 `opacity` / `rgba()`（移到 CSS 类中）
- [ ] `left`/`top`/`right`/`bottom` 只用 `px` 单位
- [ ] `onShow()` 末尾有 `this.$forceUpdate()`
- [ ] JS 动态设置 `transform` 用 `JSON.stringify()` 对象格式
- [ ] 不依赖 `@media (shape: capsule)`（用运行时宽高比判断）