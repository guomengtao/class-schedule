# 胶囊屏文字遮挡分析报告

分析日期: 2026-09-16

## 分析范围
全局扫描 `src/pages/` 下所有 .ux 文件，检查胶囊屏 `@media (shape: capsule), (shape: pill-shaped)` 中的文字显示问题。

## 检查维度
1. **行高裁剪**: `line-height` < `font-size + 8px` → 文字顶部/底部被切
2. **宽度溢出**: 容器宽度 < 文字宽度 + padding → 左右被裁
3. **缺少行高**: 有 `font-size` 无 `line-height` → Vela 默认行高可能不足
4. **字号过小**: 胶囊屏字号 < 20px → 用户看不清
5. **按钮/输入框过小**: 高度 < 40px → 点击困难 + 文字被挤
6. **缺少胶囊适配**: 页面无 `@media (shape: capsule)` 区域

---

## 问题统计

| 级别 | 数量 | 页面 |
|------|------|------|
| 严重 (line-height 裁剪文字) | 3 | chinese-input, course-manager-v2, device-info |
| 中等 (缺少 line-height) | 4 | index, countdown-manage, statistics, chinese-input |
| 中等 (字号过小) | 4 | chinese-input, course-manager, welcome, week-view |
| 中等 (缺少胶囊适配) | 4 | chinese-input, donate, device-info, countdown-manage |
| **合计有问题的页面** | **10** | |

---

## 逐页详细分析

### 1. chinese-input.ux (中文输入) ⚠️⚠️⚠️

| 问题 | 选择器 | font-size | line-height | 差距 | 结果 |
|------|--------|-----------|-------------|------|------|
| 行高裁剪 | `.done-btn` | 20px | 24px | **-4px** | 文字上下被切 |
| 缺少行高 | `.input-text` | 24px | 无 | — | 默认行高可能不足 |
| 字号过小 | `.back-btn` | 18px | — | — | 胶囊屏看不清 |
| 字号过小 | `.done-btn` | 20px | — | — | 刚及格但不安全 |
| 无胶囊适配 | 整个页面 | — | — | — | 没有 `@media (shape: capsule)` |

**根因**: 该页面仅做了 `shape: circle` 适配，完全未考虑胶囊屏，所有默认字号偏小。

---

### 2. course-manager-v2.ux (课程管理v2) ⚠️

| 问题 | 选择器 | font-size | line-height | 差距 | 结果 |
|------|--------|-----------|-------------|------|------|
| 行高裁剪 | `.row-loc` (胶囊) | 20px | 26px | **-2px** | 位置文字底部被切 |

**根因**: 胶囊 `@media` 中 `.row-loc` 的 `line-height: 26px`，按规则应 ≥28px。

---

### 3. device-info.ux (设备信息) ⚠️

| 问题 | 选择器 | font-size | line-height | 差距 | 结果 |
|------|--------|-----------|-------------|------|------|
| 行高裁剪 | `.retry-btn` | 22px | 28px | **-2px** | 重试按钮文字被切 |
| 无胶囊适配 | 整个页面 | — | — | — | 没有 `@media (shape: capsule)` |

---

### 4. index.ux (首页) ⚠

| 问题 | 选择器 | 说明 |
|------|--------|------|
| 缺少行高 | `.grid-item-name` | 字号由 JS 动态设置，CSS 未设 `line-height` |
| 缺少行高 | `.grid-item-time` | 同上 |

**根因**: 课程格子名称和时间字号是 JS 动态计算 (`$item.fontSize`)，CSS 没有配套设置 `line-height`，Vela 可能使用默认值导致拥挤。

---

### 5. countdown-manage.ux (倒计时管理) ⚠

| 问题 | 选择器 | font-size | 说明 |
|------|--------|-----------|------|
| 缺少行高 | `.row-name` | 28px | 无 `line-height` |
| 缺少行高 | `.row-date` | 22px | 无 `line-height` |
| 无胶囊适配 | 整个页面 | — | 只有 `shape: rect/rectangle` |

---

### 6. statistics.ux (统计) ⚠

| 问题 | 选择器 | font-size | 说明 |
|------|--------|-----------|------|
| 缺少行高 | `.rank-count` | 24px | 无 `line-height` |
| 胶囊适配不足 | — | — | 胶囊 `@media` 只调了 header |

---

### 7. course-manager.ux (课程管理) ⚠

| 问题 | 选择器 | font-size | line-height | 说明 |
|------|--------|-----------|-------------|------|
| 字号过小 | `.edit-btn` | 18px | 22px | 编辑按钮看不清 |
| 字号过小 | `.delete-btn` | 18px | 22px | 删除按钮看不清 |
| 无胶囊适配 | 整个页面 | — | — | 只有 `shape: circle/rect` |

---

### 8. week-view.ux (周视图) ⚠

| 问题 | 选择器 | 说明 |
|------|--------|------|
| 格子太小 | `.wv-cell` | 高度 32px，文字 20px → 格子高度 ≈ 行高，无余量 |
| 胶囊适配不足 | — | 胶囊 `@media` 只调了 header 和模板按钮 |

**根因**: 表格单元格 `height: 32px`，`line-height: 28px`，仅剩 4px 的上下间距，border/margin 会进一步挤占。

---

### 9. welcome.ux (欢迎页) ⚠

| 问题 | 选择器 | 字号 | 说明 |
|------|--------|------|------|
| 字号过小 | `.settings-btn` (胶囊) | 14px | 设置按钮文字极小 |

---

### 10. donate.ux (捐赠) ⚠

| 问题 | 说明 |
|------|------|
| 无胶囊适配 | 只有 `shape: circle/rect` 的 `@media` |

---

## 总结

### 行高裁剪 (3个页面)
`chinese-input.ux`、`course-manager-v2.ux`、`device-info.ux` 存在 `line-height` 比规则最少值（`font-size + 8px`）小的情况，文字顶部或底部会被切掉 1-4px。

### 缺少行高 (4个页面)
`index.ux`、`countdown-manage.ux`、`statistics.ux`、`chinese-input.ux` 有元素设置了 `font-size` 但未设 `line-height`，依赖 Vela 默认行高，可能不足。

### 缺少胶囊适配 (4个页面)
`chinese-input.ux`、`device-info.ux`、`countdown-manage.ux`、`donate.ux` 这4个页面完全没有胶囊屏 `@media` 区域，使用方屏幕/圆屏的默认值，字号和尺寸对胶囊屏偏小。

### 字号/尺寸过小 (4个页面)
`chinese-input.ux` (18px)、`course-manager.ux` (18px)、`welcome.ux` (14px)、`week-view.ux` (格子 32px) 存在胶囊屏看不清或点不到的元素。

### 共计 10 个页面有不同程度的问题