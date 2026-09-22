# 方屏「总课表」清爽模板宽度优化分析

## 1. 问题描述

在方形屏幕（336px 宽）下，进入「总课表」页面，选择「清爽」模板（minimal-clean）后，课程格子只占用了页面约 66%（隐藏周末时）~93%（显示周末时），右侧有大量空白区域被浪费。

## 2. 根因分析

### 2.1 页面结构

`week-view.ux` 是「总课表」页面，支持 6 种模板：

| 模板 ID | 标签 | cellWidth |
|---------|------|-----------|
| minimal-char | 极简 | 按字号计算 |
| **minimal-clean** | **清爽** | **42px** |
| standard-block | 标准 | 70px |
| compact-grid | 紧凑 | 40px |
| minimal-en | 英文 | 70px |
| color-pastel | 跟随系统 | 70px |

### 2.2 布局计算

`gridContentWidth` 的计算公式（[week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L471-L471)）：

```
gridContentWidth = rowNumWidth + weekDays.length × (cellWidth + 2 × cellMargin + border)
```

清爽模板配置（[week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L213-L221)）：
- `rowNumWidth: 0`（无行号列）
- `cellWidth: 42`
- `cellMargin: 0`
- `cellBordered: false`

**计算结果**：
- 隐藏周末（5 天）：`gridContentWidth = 0 + 5 × 42 = 210px`
- 显示周末（7 天）：`gridContentWidth = 0 + 7 × 42 = 294px`

### 2.3 可用空间 vs 实际占用

方屏宽度 336px，页面 padding 左右各 10px，可用内容宽度 = **316px**。

| 场景 | 占用宽度 | 可用宽度 | 利用率 |
|------|----------|----------|--------|
| 隐藏周末（5 天） | 210px | 316px | **66.5%** |
| 显示周末（7 天） | 294px | 316px | 93.0% |

**隐藏周末时利用率仅 66.5%，浪费约 106px。**

对比其他模板：「标准」和「英文」模板的 cellWidth 是 70px，5 天占 350px 超出屏幕需要滚动；「紧凑」模板 cellWidth=40px 同样有浪费。

### 2.4 与胶囊屏的对比

胶囊屏使用 `Math.min(w, 60)` 收敛列宽（[week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L460)），因为胶囊屏宽度仅 160px。方屏有 336px，无需收敛，反而应该扩展。

## 3. 修复方案

### 3.1 推荐方案：动态计算 cellWidth（只改 JavaScript，不影响 CSS）

在 `applyTemplate()` 中，当模板为 `minimal-clean` 且屏幕为方屏时，动态计算 cellWidth 填满可用宽度。

#### 修改位置

`src/pages/week-view/week-view.ux`，`applyTemplate()` 方法，约第 460 行。

#### 修改逻辑

```js
// 原有逻辑（胶囊屏收敛）
this.cellWidth = (this.isCapsule === true) ? Math.min(w, 60) : w

// 新增：方屏下清爽模板撑满宽度
if (currentTplId === "minimal-clean" && this.isCapsule !== true) {
  var totalPadding = 20;        // 左右 padding 各 10px（见 CSS @media shape:rect）
  var available = 336 - totalPadding;  // 方屏宽度 - padding = 316px
  var days = this.weekDays.length;
  this.cellWidth = Math.floor(available / days);
  // 示例：5 天 → 63px，7 天 → 45px
}
```

#### 注意事项

- 需要放在 `applyWeekendFilter()` 之后调用，确保 `weekDays.length` 已确定。
- 仅影响「清爽」模板，其他模板保持不变。
- 胶囊屏不受影响（`!== true` 条件排除胶囊屏）。
- 不修改 CSS，不引入新类名，改动最小。

### 3.2 备选方案：CSS 媒体查询（不推荐）

在 `@media (shape: rect)` 中覆盖 `.wv-cell` 的宽度为百分比，但这会影响到**所有模板**，需要额外的 CSS 类来限定只对清爽模板生效，复杂度高，维护性差。

## 4. 影响范围

- **仅影响**：方形屏幕下「总课表」页面选用「清爽」模板时
- **不影响**：胶囊屏、圆形屏、其他 5 种模板（极简/标准/紧凑/英文/跟随系统）
- **不破坏现有功能**：纯粹是 cellWidth 数值的调整，不改布局结构

## 5. 效果预估

| 场景 | 修复前 cellWidth | 修复后 cellWidth | 利用率变化 |
|------|-----------------|-----------------|-----------|
| 隐藏周末（5 天） | 42px（共 210px） | 63px（共 315px） | 66.5% → **99.7%** |
| 显示周末（7 天） | 42px（共 294px） | 45px（共 315px） | 93.0% → **99.7%** |

每个格子增大约 3~21px，课程名显示更从容，不再拥挤，右侧空白几乎消除。