# 首页顶部时间不居中分析报告

## 问题描述

首页顶部显示的时间（`HH:MM:SS` 格式）偏左，没有在页面水平居中。

## 涉及代码

| 文件 | 行号 | 说明 |
|------|------|------|
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L4-L7) | 模板 L4-L7 | 时钟 DOM 结构 |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L880-L894) | 样式 L880-L894 | 时钟 CSS 样式 |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L643-L648) | 脚本 L643-L648 | `updateClock()` 时间格式化 |

---

## 根因分析

### 模板结构

```html
<div class="clock-row">
  <div class="clock-box">
    <text class="clock-text" style="color: {{ theme.textSecondary }}">{{ currentTime }}</text>
  </div>
</div>
```

### 当前 CSS

```css
.clock-row {
  justify-content: center;
  align-items: center;
  padding: 2px 4px;
  margin-bottom: 2px;
}

.clock-box {
  width: 110px;
}

.clock-text {
  font-size: 18px;
  font-weight: normal;
}
```

### 问题分析

**`.clock-row` 居中了，但 `.clock-box` 内部的文字没有居中。**

具体来说：

1. **`.clock-row`** 有 `justify-content: center`，这让 `.clock-box` 作为整体在行内水平居中。✅ 这步是正确的。

2. **`.clock-box`** 设置了固定宽度 `width: 110px`，但**没有**设置 `justify-content: center` 和 `align-items: center`，也没有设置 `text-align: center`。❌ 这导致内部的 `<text>` 元素默认左对齐。

3. **`.clock-text`** 没有 `text-align: center`。在快应用框架中，`<text>` 元素默认是左对齐的，需要显式设置 `text-align: center` 才能居中。❌

4. **时间字符串长度**：`updateClock()` 生成的时间格式为 `HH:MM:SS`（如 `"14:30:25"`），共 8 个字符。在 `font-size: 18px` 下，实际渲染宽度约 80-90px，小于 `110px` 的容器宽度，所以文字能放下但靠左。

### 视觉效果

```
|    [14:30:25          ]    |   ← 当前：clock-box 在行内居中，但文字在 box 内左对齐
|       [  14:30:25  ]       |   ← 期望：文字在 box 内也居中
```

---

## 修复方案

### 方案一：给 `.clock-box` 和 `.clock-text` 添加居中（推荐）

```css
.clock-box {
  width: 110px;
  justify-content: center;
  align-items: center;
}

.clock-text {
  font-size: 18px;
  font-weight: normal;
  text-align: center;
}
```

### 方案二：去掉固定宽度，让文字自然撑开

```css
.clock-box {
  /* 移除 width: 110px */
  justify-content: center;
  align-items: center;
}

.clock-text {
  font-size: 18px;
  font-weight: normal;
  text-align: center;
}
```

方案二更简洁，因为父级 `.clock-row` 已经有 `justify-content: center`，去掉固定宽度后文字自然居中，且不会因为固定宽度太小导致文字被截断。

---

## 总结

**根本原因**：`.clock-box` 设置了固定宽度 `110px`，但内部文字没有设置居中样式（缺少 `text-align: center` 和 `justify-content: center`），导致文字在容器内默认左对齐，视觉上看起来"偏左"。

**建议修复**：给 `.clock-box` 添加 `justify-content: center; align-items: center`，给 `.clock-text` 添加 `text-align: center`，或者直接去掉 `.clock-box` 的固定宽度。