# 设置页字体预览大小与首页显示大小差异分析

## 问题描述

在设置页面中调整"课程名称字体"大小后，预览区显示的文字大小明显比首页课程卡片中实际显示的文字大很多，导致预览效果不准确。

## 根因分析

### 核心原因：基准字号不一致

设置页预览和首页课程名称使用了**不同的基准字号**来计算最终显示大小。

### 设置页 — 预览逻辑

文件：`src/pages/settings/settings.ux`

```javascript
// 设置页的 scale 计算方式
setSize(size) {
  this.displaySize = size
  this.scale = size / 48          // 以 48px 为基准
  store.setFontScale(this.scale)
  this.updatePreviews()
}

updatePreviews() {
  this.previewClassSize = Math.round(48 * this.scale)  // 预览字体 = 48 * scale
}
```

```html
<!-- 预览文字直接使用 previewClassSize 作为 font-size -->
<text class="preview-card-name" style="font-size: {{ previewClassSize }}px; color: {{ theme.text }}">
  数学 08:00 - 08:45 301教室
</text>
```

### 首页 — 课程名称逻辑

文件：`src/pages/index/index.ux`

```javascript
applyFontScale() {
  var s = this.fontScale       // 与设置页的 scale 相同
  if (!s || s < 0.5) { s = 1.0 }
  this.dayTitleStyle = "font-size: " + Math.round(20 * s) + "px"
  this.weekTextStyle = "font-size: " + Math.round(20 * s) + "px"
  this.nameStyle = "font-size: " + Math.round(28 * s) + "px"   // 课程名称基准是 28px
  this.btnTextStyle = "font-size: " + Math.round(14 * s) + "px"
}
```

```html
<!-- 首页课程名称使用 nameStyle -->
<text class="class-name" style="{{ nameStyle }}; color: {{ theme.text }}">{{ $item.name }}</text>

<!-- 首页课程时间也使用 nameStyle -->
<text class="class-time-text" style="{{ nameStyle }}; color: {{ theme.textSecondary }}">{{ $item.time }}</text>
```

### 数值对比

| 设置页选择 | scale 值 | 预览显示 | 首页课程名称 | 差异倍数 |
|-----------|---------|---------|------------|---------|
| 28px      | 0.583   | 28px    | 16px       | 1.75x  |
| 36px      | 0.75    | 36px    | 21px       | 1.71x  |
| 48px      | 1.0     | 48px    | 28px       | 1.71x  |
| 62px      | 1.292   | 62px    | 36px       | 1.72x  |
| 76px      | 1.583   | 76px    | 44px       | 1.73x  |

### 问题本质

设置页使用 `48px` 作为基准字号，预览时直接用 `48 × scale` 作为显示字号。但首页课程名称的基准字号是 `28px`，实际显示为 `28 × scale`。

因此预览始终比首页实际显示大 **48/28 ≈ 1.71 倍**。

## 设计意图分析

### 48 的来源

48 在设置页中可能原本代表的是"课程卡片中最大的字号参考值"。在 CSS 中，首页课程卡片有三个元素使用了 `nameStyle`（28px 基准）：

- `.class-name`（课程名称）
- `.class-time-text`（时间）
- `.class-location`（地点）

但这些元素在 CSS 中定义的默认值就是 `28px`，并非 `48px`。

### 为什么选择 48 作为基准

48 可能是一个"设计参考值"，但实际并未对应到首页任何元素的字号。这导致预览与真实效果脱节。

## 首页各元素字号对照

以默认 scale=1.0 为例：

| 元素 | 基准值 | 实际字号 | 对应 style |
|------|--------|---------|-----------|
| 日期标题 (dayTitleStyle) | 20px | 20px | `{{ dayTitleStyle }}` |
| 课程表名称 (weekTextStyle) | 20px | 20px | `{{ weekTextStyle }}` |
| 课程名称 (nameStyle) | 28px | 28px | `{{ nameStyle }}` |
| 课程时间 (nameStyle) | 28px | 28px | `{{ nameStyle }}` |
| 课程地点 (nameStyle) | 28px | 28px | `{{ nameStyle }}` |
| 底部按钮 (btnTextStyle) | 14px | 14px | CSS 固定 |
| 空状态文字 (nameStyle) | 28px | 28px | `{{ nameStyle }}` |

## 修复建议

### 方案 A：将预览基准改为 28px（推荐）

让设置页预览使用与首页相同的基准字号，预览与真实效果一致。

```javascript
// settings.ux 中修改
updatePreviews() {
  this.previewClassSize = Math.round(28 * this.scale)  // 改为 28，与首页 nameStyle 一致
  this.previewClassStyle = "font-size: " + this.previewClassSize + "px"
}
```

同时需要调整 `displaySize` 的显示逻辑，它仍然可以显示为 48 作为参考值，但预览用 28 计算。

或者更彻底的方案：将设置页的 `displaySize` 也改为 28 基准，但这样会改变现有 5 档预设值（28/36/48/62/76），需要重新设计档位。

### 方案 B：保持 48 基准，但首页也改为 48 基准

将首页 `applyFontScale` 中的课程名称基准从 28 改为 48：

```javascript
// index.ux 中修改
this.nameStyle = "font-size: " + Math.round(48 * s) + "px"
```

**注意**：这会使首页默认字号从 28px 变为 48px，可能超出屏幕宽度，需要评估手环屏幕的实际容纳能力。

### 方案 C：添加说明文字

在预览区添加说明，告知用户预览字号与首页实际显示的关系：

```html
<text class="preview-label" style="color: {{ theme.textSecondary }}">
  文字预览（{{ previewClassSize }}px）— 首页实际为 {{ Math.round(28 * scale) }}px
</text>
```

### 推荐方案

**方案 A** 是最佳选择，因为：
- 预览与实际效果一致，用户体验最佳
- 不改变首页现有字号，避免布局问题
- 改动最小，只需修改设置页一处逻辑

## 相关文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 设置页 | `src/pages/settings/settings.ux` | 预览逻辑，基准 48px |
| 首页 | `src/pages/index/index.ux` | 课程名称，基准 28px |
| 存储 | `src/data/store.js` | getFontScale/setFontScale |