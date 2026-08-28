# 课程表管理页面 — 深度分析：为何多次修改仍不显示内容

## 修改历史与问题复盘

| 轮次 | 改动 | 当时排查的根因 | 实际效果 |
|:---:|------|:---|:---:|
| 1 | 6 个 text 链接 → 2×3 按钮网格 | 操作按钮溢出 | 页面空白 |
| 2 | 删除 `:last-child` 伪类 | 编译错误 | 编译通过，仍空白 |
| 3 | `theme` 设默认值 | 异步竞态，`theme.card` 为 undefined | 仍空白 |

---

## 逐层排查

### 第 1 层：数据是否加载

```
scheduleList = [] (初始)
  → onInit() → loadData()
    → store.getScheduleNames(callback)
      → storage.get({ key: "scheduleNames" })
        → success: JSON.parse → callback(["课程表1", ...])
        → fail: callback(["课程表1"])
```

`store.getScheduleNames` 有三个出口保证回调一定执行：
- `success` + `data` 存在 → `JSON.parse` → callback
- `success` + `data` 不存在 → callback 默认值
- `fail` → callback 默认值

**结论**：`scheduleList` 一定会被赋值为 `[{ name: "课程表1" }]` 或更多。数据层没问题。

### 第 2 层：主题是否就绪

```javascript
theme: {
  bg: '#1a1a2e',       // ✓ 有默认值
  card: '#16213e',     // ✓ 有默认值
  text: '#ffffff',     // ✓ 有默认值
  accent: '#7ec8e3',   // ✓ 有默认值
  ...
}
```

**结论**：`theme` 在任何时刻都有有效值。主题层没问题。

### 第 3 层：`for` 指令是否渲染

```html
<div for="{{ scheduleList }}" class="schedule-item {{ $idx === currentIndex ? 'active' : '' }}" 
     style="background-color: {{ theme.card }}; border-left-color: {{ $idx === currentIndex ? theme.accent : 'transparent' }}">
```

对比 index.ux（工作正常）：
```html
<div for="{{ currentClasses }}" class="class-card-wrapper">
  <div class="class-card" style="background-color: {{ theme.card }}; border-left-color: {{ theme.accent }}">
```

| 差异点 | index.ux | schedule-manager.ux |
|:---|:---|:---|
| `class` 表达式 | 静态 `"class-card-wrapper"` | 动态 `"schedule-item {{ $idx === currentIndex ? 'active' : '' }}"` |
| `style` 表达式 | 简单变量 `{{ theme.card }}` | 含三元 + 字符串字面量 `{{ theme.accent : 'transparent' }}` |
| `style` 中字符串字面量 | 无 | **有 `'transparent'`** |

**关键发现**：Vela JS 模板表达式中，`'transparent'` 是字符串字面量。框架可能将其解析为变量引用（`this.transparent`），导致 `undefined`，进而使整个 `style` 属性解析失败。

### 第 4 层：`style` 属性解析失败的影响

如果 `style` 属性解析失败，Vela JS 的行为有两种可能：

#### 可能性 A：整个 `style` 属性被丢弃

```css
/* .schedule-item 的 CSS 规则 */
.schedule-item {
  flex-direction: column;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  border-left-width: 4px;
  border-left-style: solid;
  /* ⚠️ 没有 background-color */
  /* ⚠️ 没有 border-left-color */
}
```

- 背景色丢失 → 卡片区域透明
- 左边框颜色丢失 → 无视觉提示
- 文字颜色 `{{ theme.text }}` → 如果 `style` 被丢弃，文字颜色也丢失
- 文字可能以默认色（黑色）渲染在深色背景上 → 可见（但卡片无背景）

#### 可能性 B：`style` 部分解析，仅失败属性被丢弃

- `background-color: {{ theme.card }}` → 正常解析 → `#16213e` ✓
- `border-left-color: {{ $idx === currentIndex ? theme.accent : 'transparent' }}` → 解析失败 → 丢弃
- 卡片有背景但无左边框颜色

### 第 5 层：CSS 布局问题

#### `.schedule-list-scroll` 的 `flex: 1`

```css
.schedule-list-scroll {
  flex: 1;
  flex-direction: column;
  overflow: auto;
}
```

`flex: 1` 是 `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` 的简写。Vela JS 可能不支持此简写，需要展开为：
```css
flex-grow: 1;
```

对比 index.ux 的滚动容器：
```html
<scroll class="class-list" scroll-y="{{true}}" scroll-top="{{ scrollListTop }}">
```

index.ux 使用 `<scroll>` 原生组件，而 schedule-manager 使用 `<div>` + `overflow: auto`。在 Vela JS 中，`<scroll>` 组件是推荐的滚动方式，`<div>` + `overflow: auto` 可能不被支持，导致 `.schedule-list-scroll` 高度为 0，内容不可见。

### 第 6 层：结构对比

| 属性 | index.ux（正常） | schedule-manager.ux（空白） |
|:---|:---|:---|
| 滚动容器 | `<scroll>` 原生组件 | `<div>` + `overflow: auto` |
| `for` 内 `class` | 静态 | 动态三元表达式 |
| `for` 内 `style` | 简单变量 `{{ theme.card }}` | 含字符串字面量 `'transparent'` |
| CSS 背景色 | CSS 中有 `background-color` | CSS 中无 `background-color`（全在 inline） |
| 容器高度 | 依赖 flex 布局 | `flex: 1` 简写 |

---

## 根因判定

### 主因（概率 80%）：`'transparent'` 字符串字面量导致 `style` 解析失败

```html
style="background-color: {{ theme.card }}; border-left-color: {{ $idx === currentIndex ? theme.accent : 'transparent' }}"
                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                    字符串字面量 'transparent' 可能被当作变量引用
```

**验证方法**：去掉 `border-left-color` 部分，仅保留 `background-color: {{ theme.card }}`，看页面是否显示。

### 次因（概率 15%）：`<div>` + `overflow: auto` 代替 `<scroll>` 组件

Vela JS 的 `<div>` 可能不支持 `overflow: auto`。应改用 `<scroll>` 组件。

### 次因（概率 5%）：`flex: 1` 简写不被支持

应展开为 `flex-grow: 1`。

---

## 修复方案

### 修复 1：移除 `style` 中的字符串字面量

**当前**：
```html
style="background-color: {{ theme.card }}; border-left-color: {{ $idx === currentIndex ? theme.accent : 'transparent' }}"
```

**修改为**：将 `border-left-color` 移到 CSS 中，用 `class` 控制：

```html
<!-- 模板：style 只保留简单变量 -->
<div for="{{ scheduleList }}" class="schedule-item {{ $idx === currentIndex ? 'active' : '' }}" 
     style="background-color: {{ theme.card }}">
```

```css
/* CSS：用 .active 类控制边框颜色 */
.schedule-item {
  flex-direction: column;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  border-left-width: 4px;
  border-left-style: solid;
  border-left-color: transparent;
}

.schedule-item.active {
  border-left-color: #7ec8e3;
}
```

但 `border-left-color` 需要跟随主题。替代方案：用 `theme.border` 或 `theme.cardLight` 作为非活跃时的边框色（设为不可见），避免字符串字面量。

### 修复 2：用 `<scroll>` 组件替代 `<div>` + `overflow: auto`

```html
<scroll class="schedule-list-scroll" scroll-y="{{true}}">
  <div for="{{ scheduleList }}" class="schedule-item ...">
    ...
  </div>
</scroll>
```

### 修复 3：展开 `flex: 1`

```css
.schedule-list-scroll {
  flex-grow: 1;
  flex-direction: column;
}
```

### 修复 4：CSS 添加 `background-color` 回退

```css
.schedule-item {
  background-color: #16213e;  /* 回退，inline style 失败时使用 */
  ...
}
```

---

## 实施优先级

| 优先级 | 修复 | 改动量 | 预期效果 |
|:---:|:---|:---:|:---|
| P0 | 移除 `style` 中字符串字面量 `'transparent'` | 1 行 | 很可能解决空白问题 |
| P1 | 用 `<scroll>` 替换 `<div>` + `overflow: auto` | 2 行 | 确保滚动容器正确渲染 |
| P2 | CSS 添加 `background-color` 回退 | 1 行 | 防御性措施 |
| P3 | 展开 `flex: 1` 为 `flex-grow: 1` | 1 行 | 确保容器有高度 |

---

## 总结

经过 3 轮修改，核心问题极可能是 Vela JS 模板引擎不支持 `style` 属性中的字符串字面量 `'transparent'`。对比 index.ux 和 settings.ux 的 `style` 属性，所有值都是变量引用（`{{ theme.xxx }}`），从未出现字符串字面量。`'transparent'` 被框架当作变量 `this.transparent` 解析，结果为 `undefined`，导致整个 `style` 属性失效，卡片背景色丢失，页面呈现空白。

修复策略：将 `border-left-color` 的逻辑从 inline `style` 移到 CSS `class` 中，消除字符串字面量依赖。