# 手环 9 Pro 首页仅显示左上角、其余黑屏 — 原因分析

## 问题描述

在小米手环 9 Pro 上，进入首页后，**仅左上角一小部分区域显示内容，其余位置全部黑屏**。

---

## 涉及文件

| 文件 | 说明 |
|------|------|
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) | 首页主文件 |
| [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json) | 应用清单配置 |

---

## 设备信息

| 参数 | 手环 9 Pro | 手表（原设计目标） |
|------|:----------:|:----------:|
| 屏幕形状 | 方形 (rect) | 圆形 (circle) |
| 分辨率 | 336 × 480 | 454 × 454 / 466 × 466 |
| 可用水平宽度 | 336px | ~466px（中间区域） |
| 屏幕圆角 | 四角小圆角 | 四角裁切严重 |

---

## 根因分析

### 🔴 核心原因：index.ux 完全没有屏幕形状适配

**所有其他页面**（共 18 个）都包含三种屏幕形状的 `@media` 查询：

```css
@media (shape: circle) { ... }    /* 圆形手表 */
@media (shape: capsule) { ... }   /* 胶囊形手环 */
@media (shape: rect) { ... }      /* 方形手环 */
```

但 **index.ux 一个都没有**。

对比其他页面（如 home-pro/index.ux）的适配：

```css
/* home-pro/index.ux — 有适配 */
@media (shape: capsule) {
  .schedule-page {
    padding: 44px 8px 12px 8px;
  }
}

@media (shape: rect) {
  .schedule-page {
    padding: 44px 6px 6px 6px;
  }
}

/* index.ux — 无任何适配 ❌ */
/* 整个 CSS 文件以 </style> 结尾，没有任何 @media 查询 */
```

手环 9 Pro 屏幕是**方形 (rect)**，而 index.ux 的默认 CSS 是为 **454×454 圆形手表**设计的。当在方形屏幕上渲染时，框架无法正确计算布局，导致页面只渲染了左上角。

---

### 原因二：根容器缺少显式宽高

```css
/* index.ux 当前 */
.schedule-page {
  flex-direction: column;
  background-color: #1a1a2e;
  padding: 44px 8px 8px 8px;
  min-height: 100%;   /* ⚠️ 100% 依赖父容器高度 */
}
```

问题：
- `min-height: 100%` 需要父容器有明确高度才能生效
- 在方形屏幕上，快应用框架可能不会给页面容器分配明确高度
- 没有 `width: 100%` 或 `flex: 1` 来确保容器填满水平空间
- 结果：容器只包裹内容，左上角显示内容，其余区域显示默认黑色背景

**对比其他页面的正确做法**：

```css
/* 其他页面通常使用 */
.schedule-page {
  width: 100%;
  height: 100%;
  flex-direction: column;
}
```

---

### 原因三：`designWidth: "device-width"` 在方形屏上可能失效

```json
// manifest.json
"config": {
  "designWidth": "device-width"
}
```

- `device-width` 让框架自动适配，但在方形屏幕上，框架可能无法正确识别"可用宽度"
- 方形屏的实际宽度 336px，但框架可能按圆形手表 454px 计算
- 导致元素尺寸计算错误，部分内容溢出或被裁剪

---

### 原因四：顶部 padding 44px 可能在 Band 9 Pro 上不适用

```css
.schedule-page {
  padding: 44px 8px 8px 8px;
}
```

- 44px 顶部 padding 是为手表状态栏预留的
- 手环 9 Pro 的状态栏高度可能不同
- 如果手环的页面坐标系统不一致，44px 可能导致内容偏移到屏幕外

---

## 技术原理详解

### 快应用的屏幕形状适配机制

快应用框架支持三种屏幕形状，通过 CSS `@media` 查询匹配：

```
圆形 (circle)             方形 (rect)              胶囊形 (capsule)
╭──────────────╮        ┌──────────┐        ╭──────────────────╮
│              │        │          │        │                  │
│   内容区域    │        │ 内容区域  │        │    内容区域       │
│              │        │          │        │                  │
╰──────────────╯        └──────────┘        ╰──────────────────╯
466×466 ≈ 194px可用     194×368               336×480 ≈ 194px可用
```

当页面没有对应形状的 `@media` 查询时，框架使用默认样式。默认样式按圆形手表设计，其布局参数（padding、font-size、元素尺寸）在方形屏上不匹配。

### 为什么显示"左上角一小块"

```
手环 9 Pro 屏幕 (336×480, 方形)
┌──────────────────────────────┐
│ ████████ 内容可见 ██████████ │ ← 左上角，约 150×100px
│ ████████         ██████████ │
│                              │
│                              │
│         全黑区域              │
│                              │
│                              │
│                              │
│                              │
└──────────────────────────────┘
```

根容器 `.schedule-page` 因为：
1. 没有 `width: 100%` 和 `height: 100%`
2. `min-height: 100%` 在父容器无高度时失效
3. 容器尺寸 = 内容实际尺寸（约 150×100px）
4. 容器外的区域显示默认黑色背景

### 为什么方形屏特别容易触发此问题

圆形手表（454×454）的页面容器默认会被框架撑满（因为圆形屏的宽高相等，框架处理更成熟）。但方形屏（336×480）的宽高比不同（约 7:10），框架在计算页面容器尺寸时可能出现偏差，导致容器不自动撑满。

---

## 修复方案

### 方案一：添加三形屏幕适配（推荐，最彻底）

在 index.ux 的 `</style>` 之前添加：

```css
/* ===== 方形屏幕 (手环 9 Pro 等) ===== */
@media (shape: rect) {
  .schedule-page {
    width: 100%;
    height: 100%;
    padding: 20px 8px 12px 8px;
  }

  .clock-text {
    font-size: 16px;
  }

  .nav-btn {
    width: 38px;
    height: 38px;
    border-radius: 19px;
    font-size: 18px;
  }

  .day-nav-circle {
    width: 38px;
    height: 38px;
    border-radius: 19px;
  }

  .day-nav-text {
    font-size: 15px;
  }

  .day-title {
    font-size: 18px;
  }

  .header {
    padding: 4px 2px;
  }

  .status-bar,
  .custom-content-bar,
  .pinned-bar {
    padding: 6px;
  }

  .status-tag {
    font-size: 13px;
  }

  .status-middle {
    font-size: 15px;
  }

  .class-grid-item {
    min-height: 52px;
    border-radius: 10px;
    margin-bottom: 8px;
  }

  .class-card-body {
    padding: 10px 12px 10px 10px;
  }

  .grid-item-name {
    font-size: 17px;
  }

  .grid-item-time,
  .grid-item-location {
    font-size: 13px;
  }

  .add-btn,
  .style-btn {
    height: 40px;
    font-size: 16px;
  }

  .week-text {
    font-size: 14px;
  }

  .quick-add-title {
    font-size: 14px;
  }

  .quick-add-tag-text {
    font-size: 13px;
  }
}

/* ===== 胶囊形屏幕 ===== */
@media (shape: capsule) {
  .schedule-page {
    width: 100%;
    height: 100%;
    padding: 20px 16px 12px 16px;
  }
}
```

### 方案二：快速修复（最小改动）

只需在默认 `.schedule-page` 样式中添加 `width` 和 `height`：

```css
.schedule-page {
  flex-direction: column;
  background-color: #1a1a2e;
  padding: 44px 8px 8px 8px;
  width: 100%;       /* 新增 */
  height: 100%;      /* 新增 */
}
```

> ⚠️ 但方案二只是让容器填满屏幕，元素尺寸和间距仍然是手表尺寸，在窄屏手环上可能拥挤。

---

## 总结

| 原因 | 严重度 | 说明 |
|------|:------:|------|
| index.ux 无 `@media (shape: rect)` 查询 | 🔴🔴🔴 | 根本原因，所有其他页面都有方形适配 |
| 根容器缺少 `width/height: 100%` | 🔴🔴 | 导致容器不填满屏幕 |
| `designWidth: "device-width"` | 🟡 | 在方形屏上可能失效，宽高比不同 |
| 顶部 padding 44px 不适用 | 🟡 | 手表状态栏设计，手环可能不同 |

**建议优先实施方案一**，参照其他已有三形适配的页面（如 home-pro、settings、detail 等），为 index.ux 添加完整的 `@media (shape: rect)` 和 `@media (shape: capsule)` 查询。