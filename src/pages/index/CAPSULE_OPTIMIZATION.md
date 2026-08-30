# 胶囊屏极限优化方案

## 背景

胶囊屏（如小米手环 10，**212×520px**）的典型特征是宽度极窄但高度充足。在这种屏幕上，横向空间是极度稀缺的资源，所有元素都必须为宽度让路。

## 核心原则

> **所有尺寸（padding、font-size、width、height）都要比圆形屏再缩小 30%-40%，才能保证内容完整显示。**

## 问题诊断

| 问题 | 原因 | 影响 |
|------|------|------|
| 页面横向 padding 太大 | `padding: 8px` 左右，可用宽度仅 196px | 内容区域严重受限 |
| 导航按钮过大 | `.nav-btn` 40px，两个按钮 + 标题在 196px 内拥挤 | 标题被挤压 |
| 三个快捷圆按钮过大 | `.day-nav-circle` 28px × 3 + 间距 | 占大量横向空间 |
| 状态栏文字未极限压缩 | 字号 11-14px，min-width 偏大 | 文字溢出或被裁剪 |
| 课程卡片字号过大 | `.class-name` 20px，一行放不下"课程名 + 时间" | 课程名显示不全 |
| 底部按钮过大 | `.add-btn` 80px 宽 | 两个按钮并排不下 |

## 各元素调整对照

| 元素 | 原先 | 调整后 | 缩小比例 |
|------|------|--------|---------|
| `.schedule-page` padding | 8px 左右 | 4px 左右 | 50% |
| `.nav-btn` | 40×36px | 30×26px | 25-28% |
| `.day-title` | 16px | 13px | 19% |
| `.day-nav-circle` | 28×28px | 20×20px | 29% |
| `.day-nav-text` | 16px | 11px | 31% |
| `.status-bar` 高度 | 36px | 28px | 22% |
| `.status-tag` | 11px | 9px | 18% |
| `.status-middle` | 14px | 11px | 21% |
| `.status-right` | 13px | 10px | 23% |
| `.class-name` | 20px | 14px | 30% |
| `.class-time-text` | 20px | 12px | 40% |
| `.class-location` | 20px | 11px | 45% |
| `.class-progress` | 18px | 11px | 39% |
| `.add-btn` | 80px | 55px | 31% |
| `.quick-add-name` | 18px | 12px | 33% |

## 完整 CSS 代码

```css
@media (shape: capsule) {
  /* 根容器 */
  .schedule-page {
    padding: 44px 4px 12px 4px;
  }

  /* 时钟 */
  .clock-box {
    width: 60px;
  }
  .clock-text {
    font-size: 12px;
  }

  /* 顶部导航 */
  .header {
    padding: 2px 2px;
    margin-bottom: 2px;
    justify-content: center;
    flex-wrap: nowrap;
  }
  .nav-btn {
    width: 30px;
    height: 26px;
    border-radius: 13px;
    font-size: 13px;
  }
  .day-title {
    font-size: 13px;
    margin: 0 2px;
  }
  .day-nav-circle {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    margin-left: 2px;
  }
  .day-nav-text {
    font-size: 11px;
  }

  /* 状态栏 */
  .status-bar {
    padding: 2px 6px;
    height: 28px;
    margin-bottom: 4px;
    border-left-width: 4px;
    border-radius: 10px;
  }
  .status-tag {
    font-size: 9px;
    padding: 1px 5px;
    margin-right: 4px;
    border-radius: 6px;
  }
  .status-middle {
    font-size: 11px;
    min-width: 16px;
  }
  .status-right {
    font-size: 10px;
    min-width: 26px;
    margin-left: 3px;
  }

  /* 课程列表 */
  .class-card-wrapper {
    margin-bottom: 2px;
  }
  .class-content {
    padding: 3px 5px;
  }
  .class-time {
    margin-bottom: 1px;
  }
  .class-name {
    font-size: 14px;
    flex: 1;
    max-width: 65px;
    text-overflow: ellipsis;
    max-lines: 1;
  }
  .class-time-text {
    font-size: 12px;
    max-width: 50px;
    text-overflow: ellipsis;
    max-lines: 1;
  }
  .class-location {
    font-size: 11px;
    max-width: 45px;
    text-overflow: ellipsis;
    max-lines: 1;
  }
  .class-progress {
    font-size: 11px;
  }
  .empty-text {
    font-size: 16px;
  }

  /* 快速添加 */
  .quick-add {
    padding: 3px 4px;
    margin-bottom: 3px;
  }
  .quick-add-title {
    font-size: 10px;
    margin-bottom: 2px;
  }
  .quick-add-item {
    padding: 2px 6px;
    margin-right: 2px;
  }
  .quick-add-name {
    font-size: 12px;
  }

  /* 底部按钮 */
  .bottom-buttons {
    justify-content: space-around;
  }
  .add-btn, .style-btn {
    width: 55px;
    height: 26px;
    font-size: 10px;
    border-radius: 6px;
  }
  .week-indicator {
    padding: 3px 0;
  }
  .week-text {
    font-size: 13px;
  }
}
```

## 超窄屏兜底方案

针对宽度 < 240px 的极端情况，使用 `@media (max-width: 240px)` 做额外兜底：

```css
@media (max-width: 240px) {
  .schedule-page {
    padding: 44px 2px 10px 2px;
  }
  .nav-btn {
    width: 28px !important;
    height: 24px !important;
    font-size: 12px !important;
  }
  .class-name {
    font-size: 13px !important;
    max-width: 50px !important;
  }
  .class-time-text {
    font-size: 11px !important;
    max-width: 40px !important;
  }
  .class-location {
    font-size: 10px !important;
    max-width: 40px !important;
  }
  .add-btn, .style-btn {
    width: 50px !important;
    height: 24px !important;
    font-size: 10px !important;
  }
}
```

## 激进取向：隐藏非核心元素

如果空间仍不够，可以考虑隐藏部分元素：

```css
@media (shape: capsule) and (max-width: 240px) {
  .day-nav-btns {
    display: none;
  }
  .clock-row {
    display: none;
  }
  .quick-add {
    display: none;
  }
}
```

## 总结

胶囊屏适配的核心思路是**极限压缩**：
1. **padding 减半**：从 8px → 4px，每 1px 都很珍贵
2. **字号缩小 30-40%**：所有文字等比缩小
3. **按钮缩小 25-30%**：宽度和高度同步缩小
4. **课程卡片加 max-width**：防止横向溢出，超长截断
5. **状态栏降到 28px 高**：极致利用垂直空间