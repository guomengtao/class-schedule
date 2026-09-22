# 主题配色区域布局问题分析

## 问题现象

设置页主题配色展开后，每个颜色独立占一行（上下堆叠），而非并排显示。

## 根因分析

### 三个 `if` 包裹层全部用了 `flex-direction: column`

| 区域 | 代码 | 正确吗 |
|------|------|:---:|
| 主题配色 | `<div if="{{ showTheme }}" style="flex-direction: column">` | ❌ |
| 周课表 | `<div if="{{ showSchedule }}" style="flex-direction: column">` | ✅ |
| 工具 | `<div if="{{ showTools }}" style="flex-direction: column">` | ✅ |

### 为什么周课表用 `column` 是对的？

`showSchedule` 里面是多个 `<div class="row">`，每个 `row` 是全宽的设置项（如 "显示第1节"、"显示第2节"），**本就应该独占一行**。之前没有 `flex-direction: column` 时，Vela 默认 `flex-direction: row`，导致多个 row 挤在一行，所以才用 `column` 修复。

### 为什么主题配色用 `column` 是错的？

`showTheme` 里面是 `<div class="theme-item">`，每个 `.theme-item` 有 `width: 20%`，**设计意图是 5 个并排一行**。

```
.theme-item {
  flex-direction: column;   ← 内部是 dot + name 上下排列
  width: 20%;                 ← 要 5 个一行！
  ...
}
```

但 `if` 包裹层用了 `style="flex-direction: column"` 后，父级是竖排，`width: 20%` 在 column 布局下失效，每个 `theme-item` 撑满整行宽度，所以就变成了一行一个。

### 冲突在哪里

之前修复周课表拥挤问题时，给所有 `if` 包裹层都加了 `flex-direction: column`。这个规则对周课表/工具是对的（它们内部是 `row` 全宽元素），但对主题配色是错的（它内部是 `width: 20%` 的小方块）。

**一药治百病 → 误伤了主题配色区域。**

### Vela 限制

- `flex-wrap: wrap` 不支持，无法自动换行
- 所以 theme-item 要么全在一行（`row`），要么全在一列（`column`）
- `width: 20%` 配合 `flex-direction: row` 可让 5 个在一行

## 修复建议

将主题配色的 `if` 包裹层的 `flex-direction` 从 `column` 改为 `row`：

```
<!-- 修改前 -->
<div if="{{ showTheme }}" style="flex-direction: column">

<!-- 修改后 -->
<div if="{{ showTheme }}" class="theme-grid">
```

这样 `.theme-item` 的 `width: 20%` 生效，5 个颜色并排显示。