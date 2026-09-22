# Xiaomi Vela JS 手环 border 单边分割线 Bug 分析

## 问题描述

在手环（Xiaomi Vela JS 框架）项目中，开发者使用 `border-top` 相关属性试图画一条顶部分割线，但实际渲染出来的是**上下左右四根线**，而非仅顶部一根线。

## 问题复现

以下代码期望只在元素顶部画一条 1px 的灰色分割线：

```css
.panel {
  border-top-width: 1px;
  border-top-style: solid;
  border-top-color: rgba(128, 128, 128, 0.15);
}
```

**实际效果**：元素的上下左右四个方向都出现了边框线。

## 项目中受影响的文件

项目中多处使用了 `border-top-*`、`border-bottom-*`、`border-left-*` 等单边属性，均存在此问题：

| 文件 | 使用的属性 |
|------|-----------|
| `src/pages/accordion-demo/accordion-demo.ux` | `border-top-width`, `border-top-style`, `border-top-color` |
| `src/pages/schedule-manager/schedule-manager.ux` | `border-top-width`, `border-top-style`, `border-top-color` |
| `src/pages/homepage-settings/homepage-settings.ux` | `border-bottom-width`, `border-bottom-style`, `border-bottom-color` |
| `src/pages/index/index.ux` | `border-left-width`, `border-left-style`, `border-left-color` |
| `src/pages/activation/activation.ux` | `border-bottom-width`, `border-bottom-color` |
| `src/pages/reset-data/reset-data.ux` | `border-left`, `border-right`, `border-bottom` |

## 根因分析

### Xiaomi Vela JS 框架的 border 样式支持范围

根据官方文档，Vela JS 框架的**通用样式**中，border 相关属性仅支持以下全局属性：

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `border` | - | 0 | 简写属性，在一个声明中设置**所有的边框属性**，可以按顺序设置 width style color |
| `border-style` | solid | solid | 暂时仅支持 1 个值，为元素的**所有边框**设置样式 |
| `border-width` | `<length>` | 0 | 设置元素的**所有边框**宽度 |
| `border-color` | `<color>` | black | 设置元素的**所有边框**颜色 |

### 关键发现

官方文档中**没有**以下 CSS 标准属性：

- ❌ `border-top` / `border-top-width` / `border-top-style` / `border-top-color`
- ❌ `border-bottom` / `border-bottom-width` / `border-bottom-style` / `border-bottom-color`
- ❌ `border-left` / `border-left-width` / `border-left-style` / `border-left-color`
- ❌ `border-right` / `border-right-width` / `border-right-style` / `border-right-color`

### Bug 原因

当开发者在 Vela JS 框架中写入：

```css
border-top-width: 1px;
border-top-style: solid;
border-top-color: rgba(128, 128, 128, 0.15);
```

Vela JS 框架的 CSS 解析器**不识别单边属性**（如 `border-top-width`），其行为可能是：

1. **忽略后缀，当作全局属性处理**：将 `border-top-width` 解析为 `border-width`，将 `border-top-style` 解析为 `border-style`，将 `border-top-color` 解析为 `border-color`。
2. 由于 `border-width`、`border-style`、`border-color` 都是设置**所有四个方向**的边框，所以四个边都出现了边框线。

## 官方正确写法

根据官方文档，如需画分割线，有以下几种替代方案：

### 方案一：使用独立 div 元素作为分割线（推荐）

用一个独立的 `<div>` 元素，设置背景色和高度来模拟分割线：

```html
<template>
  <div class="container">
    <div class="content">内容区域</div>
    <!-- 分割线 -->
    <div class="divider"></div>
    <div class="content">下方内容</div>
  </div>
</template>

<style>
  .divider {
    height: 1px;
    background-color: rgba(128, 128, 128, 0.15);
    margin: 8px 0;
  }
</style>
```

### 方案二：使用 box-shadow 模拟单边线

利用 `box-shadow` 属性在指定方向画出阴影线：

```css
.panel {
  /* 顶部 1px 分割线，使用 inset 内阴影模拟 */
  box-shadow: 0px -1px 0px 0px rgba(128, 128, 128, 0.15) inset;
}
```

> **注意**：`box-shadow` 在 Vela JS 中需要 3+ 个参数（x偏移、y偏移、颜色），官方文档中 `inset` 关键字支持情况需实测确认。

### 方案三：使用 border 并接受四边边框

如果设计上允许，直接使用 `border` 全局属性：

```css
.panel {
  border: 1px solid rgba(128, 128, 128, 0.15);
}
```

### 方案四：使用 padding + background-color 分隔

通过在父容器和子元素之间利用背景色差异产生视觉分割：

```css
.container {
  background-color: rgba(128, 128, 128, 0.15); /* 分割线颜色 */
  padding-top: 1px; /* 分割线高度 */
}
.content {
  background-color: #ffffff; /* 内容背景色，覆盖分割线 */
}
```

## 总结

| 项目 | 内容 |
|------|------|
| **Bug 根因** | Vela JS 框架不支持 `border-top`/`border-bottom`/`border-left`/`border-right` 等单边属性，所有 border 属性均为四边全局生效 |
| **推荐修复方案** | 使用独立 `<div>` 元素 + `background-color` 模拟分割线 |
| **官方文档依据** | Vela JS 通用样式仅列出 `border`、`border-width`、`border-style`、`border-color` 四个全局属性，无一支持单边设置 |