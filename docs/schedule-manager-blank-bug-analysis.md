# 课程表管理页面 — 内容空白 Bug 分析报告

## 现象

页面编译通过，但课程表卡片区域完全空白，不显示任何课程表名称和操作按钮。

---

## 数据流追踪

### 页面生命周期

```
页面创建 → onInit() → onShow()
```

### `onInit()` 执行流程

```
onInit()
  ├─ store.getTheme(callback)        // 异步，设置 theme
  └─ this.loadData()                  // 同步调用
       └─ store.getScheduleNames(cb)  // 异步，设置 scheduleList
       └─ store.getCurrentScheduleIndex(cb) // 异步，设置 currentIndex
```

### 模板渲染依赖

```
<div for="{{ scheduleList }}" ...>
  style="background-color: {{ theme.card }}; ..."
  <text style="color: {{ theme.text }}">{{ $item.name }}</text>
```

**关键依赖**：模板需要两个数据源同时就绪：
- `scheduleList`：控制 `for` 循环是否渲染
- `theme`：控制文字和背景颜色

---

## 根因分析

### 原因：异步竞态导致 `theme` 未就绪时 `for` 循环已渲染

```
时间线：
  T0: onInit() 触发
  T1: store.getTheme() 发起异步请求
  T2: loadData() → store.getScheduleNames() 发起异步请求
  T3: getScheduleNames 回调先返回 → scheduleList = ["课程表1"]
      → for 循环渲染，但此时 theme = {}
      → theme.card = undefined
      → theme.text = undefined
      → 背景色 undefined，文字色 undefined
      → 文字不可见/卡片不可见（取决于框架对 undefined 的处理）
  T4: getTheme 回调返回 → theme = THEMES.blue
      → 框架可能不重新渲染 for 循环内部
```

| 时间点 | `scheduleList` | `theme` | 渲染结果 |
|:---:|:---:|:---:|:---|
| T0 | `[]` | `{}` | 无内容 |
| T3 | `["课程表1"]` | `{}` | **卡片渲染但颜色全部为 undefined** |
| T4 | `["课程表1"]` | `THEMES.blue` | 预期正常，但可能未触发重渲染 |

### 对比：主页面 `index.ux` 为何正常

| 对比项 | index.ux | schedule-manager.ux |
|:---|:---|:---|
| `theme` 初始值 | `{}` | `{}` |
| `for` 数据源 | `currentClasses`（来自数据库） | `scheduleList`（来自 store） |
| 数据加载 | `database.getAllCourses()` | `store.getScheduleNames()` |
| 异步数量 | 2 个并行 | 2 个并行 |

index.ux 能正常工作，说明 **Vela JS 的 `for` 指令在 `theme` 更新后会重新渲染**。但 schedule-manager 仍然空白，说明另有原因。

### 进一步排查：硬编码颜色 vs 主题变量

重构前（能正常工作）：
```css
/* 所有颜色硬编码在 CSS 中 */
.schedule-item {
  background-color: #16213e;  /* 不依赖 theme */
}
```

重构后（空白）：
```html
<div style="background-color: {{ theme.card }}; ...">
```

**关键差异**：重构前，CSS 颜色硬编码，不依赖 `theme` 对象。重构后，所有颜色都依赖 `theme` 对象。如果 `theme` 在 `for` 循环渲染时仍为 `{}`，则：
- `theme.card` → `undefined`
- `theme.text` → `undefined`
- `theme.accent` → `undefined`
- `theme.cardLight` → `undefined`
- `theme.bg` → `undefined`

Vela JS 对 `undefined` 颜色值的处理可能是不渲染该元素，或渲染为完全透明，导致整个卡片不可见。

### 验证：`onInit` 中 `theme` 确实可能未就绪

```javascript
onInit() {
    var self = this
    store.getTheme(function(t) {    // 异步
      self.theme = t
    })
    this.loadData()                  // 同步调用，但内部也是异步
}
```

`store.getTheme()` 和 `store.getScheduleNames()` 都是异步的。两个回调的执行顺序取决于 `@system.storage` 的实现，不可控。

---

## 影响范围

| 元素 | 依赖 `theme` 属性 | 未就绪时效果 |
|:---|:---|:---|
| `.manager-page` 背景 | `theme.bg` | 透明/白色 |
| `.schedule-item` 背景 | `theme.card` | 透明 |
| `.schedule-name` 文字 | `theme.text` | 不可见 |
| `.badge` 徽章 | `theme.accent` + `theme.bg` | 不可见 |
| `.action-btn` 按钮 | `theme.cardLight` + `theme.text` | 不可见 |
| `.back-btn` / `.stats-btn` | `theme.card` + `theme.accent` | 不可见 |
| `.add-btn` | `theme.accent` + `theme.bg` | 不可见 |
| 所有 header 文字 | `theme.text` | 不可见 |

**结论**：整个页面几乎所有元素都依赖 `theme`，如果 `theme` 为空对象，整个页面看起来就是空白的。

---

## 修复方案

### 方案一：theme 初始值设默认主题（推荐 ⭐）

最简单、最安全的方案。在 `private` 中给 `theme` 一个默认值，确保任何时候都有可用颜色。

```javascript
private: {
    scheduleList: [],
    currentIndex: 0,
    editingIndex: -1,
    editName: "",
    theme: {
      bg: '#1a1a2e',
      card: '#16213e',
      cardLight: '#0f3460',
      accent: '#7ec8e3',
      text: '#ffffff',
      textSecondary: '#888899',
      textMuted: '#555566',
      btnSecondary: '#333355',
      btnSecondaryText: '#a0a0b0',
      deleteBg: '#2a1a3e',
      deleteText: '#e08080'
    },
    showQrPopup: false,
    qrText: "",
    qrScheduleName: ""
}
```

**优点**：
- 一行不改模板和样式
- 首次渲染就有正确颜色
- 异步回调到达后自动更新为持久化主题
- 无竞态风险

**缺点**：
- 模板文件变大（约 20 行默认主题定义）

### 方案二：在 CSS 中保留回退颜色

```css
.schedule-item {
  background-color: #16213e;  /* 回退颜色 */
  ...
}
```

内联 `style` 会覆盖 CSS 颜色，所以当 `theme.card` 为 `undefined` 时，CSS 颜色生效。

**缺点**：Vela JS 内联 style 优先级高于 CSS，且 `undefined` 可能被当作空字符串处理，不确定是否回退到 CSS。

### 方案三：确保 loadData 在 getTheme 之后执行

```javascript
onInit() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
      self.loadData()    // 移到回调内部
    })
}
```

**缺点**：`loadData` 延迟执行，用户会看到短暂的空白。且 `onShow` 中也有 `loadData`，需同步修改。

---

## 推荐实施

采用 **方案一**：给 `theme` 设置默认值。

修改文件：`src/pages/schedule-manager/schedule-manager.ux`
修改位置：`private.theme` 初始化
修改量：1 处，约 15 行

---

## 总结

| 项目 | 内容 |
|:---|:---|
| Bug 类型 | 异步竞态 + 缺少默认值 |
| 直接原因 | `theme = {}` 时 for 循环渲染，所有颜色为 undefined |
| 根本原因 | 重构前 CSS 硬编码颜色不依赖 `theme`，重构后全部依赖 `theme` 但未设默认值 |
| 影响 | 整个页面空白，header、卡片、按钮全部不可见 |
| 修复量 | 1 处修改，约 15 行 |
| 风险 | 极低 |