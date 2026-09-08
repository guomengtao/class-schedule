# 设置页面胶囊屏布局问题分析

## 问题描述

在小米手环9（胶囊/方形屏幕）上，设置页面内容仅显示在**左上角**，而非占满整个屏幕。模拟器中显示正常。

## 问题复现

- **设备**: 小米手环9（胶囊屏，shape: capsule）
- **页面**: `/pages/settings`
- **现象**: 页面内容被压缩在左上角，不占满全屏
- **模拟器**: 正常显示

## 类似问题

之前小米手环9 Pro 首页也出现过完全相同的问题，已修复。

## 根因分析

### 核心问题：settings.ux 缺少 `width: 100%` 和 `box-sizing: border-box`

对比 **首页**（已修复）和 **设置页面**（当前有 bug）：

| 属性 | 首页 (index.ux) ✅ | 设置页面 (settings.ux) ❌ |
|------|-------------------|--------------------------|
| `width` | `width: 100%` | **缺失** |
| `height` | `height: 100%` | `min-height: 100%` |
| `box-sizing` | `box-sizing: border-box` | **缺失** |
| top padding | `8px` | `24px` |

在快速应用框架中，flexbox 容器如果不显式设置 `width: 100%`，在胶囊屏上可能不会自动撑满父容器宽度，导致内容被压缩在左侧。

### 问题 2：缺少屏幕形状适配（@media 查询）

其他大部分页面都已经添加了 `@media (shape: capsule)` 和 `@media (shape: circle)` 适配：

```css
/* 参考: homepage-settings.ux */
@media (shape: circle) {
  .page { padding: 44px 36px 44px 36px; }
}
@media (shape: capsule) {
  .page { padding: 44px 8px 12px 8px; }
}
@media (shape: rect) {
  .page { padding: 44px 6px 6px 6px; }
}
```

**settings.ux 完全没有任何 `@media` 查询**，所有屏幕形状使用同一套样式。

### 问题 3：顶部 padding 不一致

- 设置页面: `padding: 24px 8px 8px 8px`（24px 顶部）
- 其他页面: `padding: 44px 8px 12px 8px`（44px 顶部，预留状态栏空间）

## 修复方案

在 `settings.ux` 的 `<style>` 中做以下修改：

### 1. 修复根容器样式

```css
.settings-page {
  flex-direction: column;
  width: 100%;           /* 新增：确保占满宽度 */
  height: 100%;          /* 修改：从 min-height 改为 height */
  box-sizing: border-box;/* 新增：盒模型 */
  padding: 44px 8px 8px 8px;  /* 修改：top padding 从 24px 改为 44px */
}
```

### 2. 添加屏幕形状适配

```css
@media (shape: circle) {
  .settings-page {
    padding: 44px 36px 44px 36px;
  }
  .back-header {
    padding: 0 20px;
    justify-content: center;
  }
}

@media (shape: capsule) {
  .settings-page {
    padding: 44px 8px 12px 8px;
  }
}

@media (shape: rect) {
  .settings-page {
    padding: 44px 6px 6px 6px;
  }
}
```

## 修改文件

- `src/pages/settings/settings.ux` — 修复 `.settings-page` CSS 和添加 `@media` 查询

## 验证方法

1. 修改后重新构建: `npm run build`
2. 在小米手环9胶囊屏上安装测试
3. 确认设置页面内容占满整个屏幕