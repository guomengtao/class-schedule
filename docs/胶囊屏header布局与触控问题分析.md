# 胶囊屏 Header 布局与触控问题分析

> **问题编号**：布局与触控 82
> **分析日期**：2026-09-19
> **分析范围**：胶囊屏（192px 物理宽度）所有页面 header 区域
> **核心结论**：header 区元素过多，每项卡在 44px，需减少 header 内元素数量并统一 CSS，多余按钮移至页面下方

---

## 一、物理约束：192px 宽度下的极限计算

### 1.1 胶囊屏物理参数

```
屏幕总宽度:       192px
半圆直径:         192px（= 屏宽）
半圆半径:          96px
顶部半圆遮挡区:    ≈96px 高（两端半圆覆盖）
安全矩形区起点:    y ≥ 96px
可视内容宽度:      160px（192 − 16左padding − 16右padding）
```

> **关键约束**：胶囊屏内容区宽度只有 **160px**，不是方屏的 304px。所有 header 元素必须在 160px 内排布。

### 1.2 触控最小区域约束

快应用/手表平台推荐最小可点击区域：

| 标准 | 最小宽度 | 最小高度 |
|------|----------|----------|
| Apple HIG | 44px | 44px |
| Material Design | 48px | 48px |
| 本项目胶囊屏实际 | **44px** | **44px** |

**44px 是手表端可接受的触控底线**。低于 40px 手指难以准确点中，低于 36px 基本不可用。

### 1.3 Header 一行能放几个 44px 按钮？

```
内容区宽度:         160px
单个按钮宽度:        44px
按钮间 gap:           2px（最小）

公式: N × 44 + (N−1) × 2 ≤ 160
     N × 44 + 2N − 2 ≤ 160
     46N ≤ 162
     N ≤ 3.52

结论：一行最多放 3 个 44px 按钮（或 2 个 44px 按钮 + 1 个标题文字）
```

| 按钮数量 | 按钮总宽 | 剩余给标题 | 标题能放几个 26px 汉字 |
|----------|----------|------------|------------------------|
| 2 个 | 88px | **72px** | ≈ 2.7 字 |
| 3 个 | 132px | **28px** | ≈ 1 字 |
| 4 个 | 176px | **−16px** | ❌ 溢出 |
| 5 个 | 220px | **−60px** | ❌ 严重溢出 |

### 1.4 当前首页 Header 实际布局

```
┌────── 160px 内容区 ──────┐
│                            │
│ ◀左  标题文字  [总] 右▶   │
│ 44    flex:1   44   44    │
│                            │
└────────────────────────────┘

按钮占用: 44(左) + 44(总) + 44(右) = 132px
标题可用: 160 − 132 − 4(gap×2) = 24px
标题字号: 26px（胶囊屏）
标题可显示: 24/26 ≈ 0.9 字  ← 连一个字都放不下！
```

**当前标题实际显示被严重压缩**，用户几乎看不到星期标题文字。

---

## 二、问题定级：哪些页面 Header 触碰了 192px 硬约束

### 2.1 首页 (index.ux) — 🔴 最严重

Header 区实际可交互元素（胶囊模式下）：

| # | 元素 | 宽度 | 位置 | 功能 |
|---|------|------|------|------|
| 1 | `nav-btn-img` (左箭头) | 44px | header 左侧 | prevDay |
| 2 | `day-title` (星期标题) | flex:1 | header 中央 | 显示文本 |
| 3 | `day-nav-circle` (总) | 44px | header 右侧 | goToWeekView |
| 4 | `nav-btn-img` (右箭头) | 44px | header 最右 | nextDay |

**4 个元素挤在 160px 内**，标题被压到 24px，不到一个汉字宽度。

加上 header 上方的 `clock-row` 和下方的 `custom-content-bar`、`status-bar`、`pinned-bar`，**整个页面顶部区域堆叠了 7 层 bar**，每层高度 44~48px，总占用约 350px 垂直空间。胶囊屏安全可视高度仅 298px（y=96 到 y=394），**这些 bar 已经把整个可视区占满了，课程列表被挤出屏幕**。

### 2.2 课程管理 (course-manager.ux) — 🟠 中等

Header 元素：
| # | 元素 | 宽度 |
|---|------|------|
| 1 | `back-btn-wrapper` | 48px |
| 2 | `header-title` (课程管理) | flex:1 |
| 3 | `add-btn` (+ 添加) | ~70px |

```
48 + flex + 70 = 118 + flex
标题可用: 160 − 118 = 42px
标题字号: 28px → 约 1.5 个汉字
```

4 字标题「课程管理」需要 28×4 = 112px，实际只有 42px，**严重溢出**。

### 2.3 设置页面 (settings.ux) — 🟡 较轻

Header 元素少（仅返回按钮 + 标题），但 `back-btn` 在胶囊 @media 中字号 11px，远低于 18px 底线。

### 2.4 汇总：所有页面的 Header 拥挤程度

| 页面 | header 可交互元素数 | 按钮总宽 | 标题可用宽度 | 评级 |
|------|:---:|------|------|:---:|
| index (首页) | 4 | 132px | 24px | 🔴 |
| course-manager | 3 | 118px | 42px | 🟠 |
| schedule-manager | 3 | ~124px | 36px | 🟠 |
| week-view | 3 | ~120px | 40px | 🟠 |
| add-course | 3 | ~120px | 40px | 🟠 |
| nick-name-edit | 3 | ~120px | 40px | 🟠 |
| settings | 2 | 48px | 112px | 🟢 |
| detail | 2 | 48px | 112px | 🟢 |
| reset-data | 2 | 48px | 112px | 🟢 |
| 其他简单页面 | 2 | 48px | 112px | 🟢 |

> **规律**：只要 header 超过 2 个 44px 级按钮 + 1 个标题，就会在 192px 胶囊屏上溢出。**3 个以上按钮的 header 必须重构**。

---

## 三、根因分析

### 3.1 设计层面：方屏思维照搬到胶囊屏

方屏 336px 宽 → 内容区 304px 宽 → 可以轻松放 4 个 44px 按钮 + 标题：

```
方屏: 44×4 + 标题(304−176=128px) = 放 4 个 28px 汉字 ✅
胶囊: 44×4 + 标题(160−176=−16px) = 溢出 ❌
```

所有页面在设计时默认以方屏为基准，胶囊屏适配只是做了**字号缩小**，没有做**元素数量减少**。

### 3.2 代码层面：每个页面独立写 @media，没有统一规范

```
src/pages/index/index.ux      → 独立 @media (shape: capsule)
src/pages/course-manager/...  → 独立 @media (shape: capsule)
src/pages/schedule-manager/...→ 独立 @media (shape: capsule)
...
```

31 个页面各自写胶囊屏适配，**没有统一的 header 布局约束**。按钮尺寸从 34px 到 54px 不等，gap 从 2px 到 8px 不等。

### 3.3 垂直空间浪费

首页多个 bar 堆叠：
```
clock-row         ≈ 36px
header            ≈ 52px
custom-content-bar ≈ 44px (可选)
status-bar        ≈ 44px (可选)
pinned-bar        ≈ 44px (可选)
───────────────────────
顶部总计 ≈ 220px (最坏)
```

胶囊屏安全可视高度仅 **298px**。220px 的 bar 堆叠后，课程列表只剩 78px 可见区域——**大约只够显示 1 个课程卡片**。

---

## 四、解决方案

### 4.1 核心原则

1. **Header 最多 3 个元素**：返回按钮 + 标题 + 最多 1 个操作按钮
2. **所有超出 3 个的元素全部移到页面下方**
3. **统一 CSS**：创建一个公共 header 组件样式，所有页面引用同一套规则
4. **垂直空间合并**：将多个独立 bar 合并为 1-2 个复合区域

### 4.2 统一 Header CSS 方案

在 `src/common/` 下创建统一的胶囊屏 header 样式：

```css
/* ====== src/common/capsule-header.css ====== */
/* 胶囊屏统一 Header 样式，所有页面引用 */
/* 用法: @import '../../common/capsule-header.css'; */

/* 页面根容器 */
.capsule-page {
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 30px 16px 30px 16px;
  box-sizing: border-box;
}

/* Header: 仅容纳 返回按钮 + 标题 + 最多1个操作按钮 */
.capsule-header {
  flex-direction: row;
  align-items: center;
  height: 44px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

/* 返回按钮 */
.capsule-back {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  font-size: 24px;
  line-height: 44px;
  text-align: center;
  flex-shrink: 0;
}

/* 标题 */
.capsule-title {
  flex: 1;
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  line-height: 44px;
  lines: 1;
  text-overflow: ellipsis;
  margin: 0 4px;
}

/* 右侧操作按钮（最多1个） */
.capsule-action {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  font-size: 20px;
  line-height: 44px;
  text-align: center;
  flex-shrink: 0;
}

/* 右侧占位（当无操作按钮时保持标题居中） */
.capsule-placeholder {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

/* 下方工具栏：放多余的按钮 */
.capsule-toolbar {
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  height: 48px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

/* 工具栏按钮 */
.capsule-tool-btn {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  justify-content: center;
  align-items: center;
}

.capsule-tool-btn-text {
  font-size: 20px;
  line-height: 28px;
  font-weight: bold;
  text-align: center;
}
```

### 4.3 首页 Header 重构方案

#### 改造前（4 个 44px 元素挤在 header）

```
┌──────────────── 160px ────────────────┐
│  [◀44]  标题(0.9字)  [总44]  [▶44]   │
└───────────────────────────────────────┘
标题几乎不可见
```

#### 改造后（header 只保留 3 个元素，多余按钮移到 toolbar）

```
┌──────────────── 160px ────────────────┐
│  [◀44]      星期一(4字)      [▶44]    │  ← Header: 3元素
└───────────────────────────────────────┘
                                         
┌──────────────── 160px ────────────────┐
│     [总课表]    [回今天]    [明天]     │  ← Toolbar: 导航按钮
└───────────────────────────────────────┘
                                         
┌──────────────── 160px ────────────────┐
│  [状态]  第1节 08:00  还剩 12分钟     │  ← Status: 合并状态栏
└───────────────────────────────────────┘
                                         
┌──────────────── 160px ────────────────┐
│  课程1  课程2  课程3  ...              │  ← Class list: 终于可见了
```

**布局代码示例**：

```html
<!-- Header: 只需3个元素 -->
<div class="capsule-header">
  <image class="capsule-back" src="icon_left.png" onclick="prevDay"></image>
  <text class="capsule-title">{{ dayDisplayText }}</text>
  <image class="capsule-back" src="icon_right.png" onclick="nextDay"></image>
</div>

<!-- Toolbar: 原 header 的 [总][今][明] 移到这里 -->
<div class="capsule-toolbar">
  <div class="capsule-tool-btn" onclick="goToWeekView">
    <text class="capsule-tool-btn-text">总</text>
  </div>
  <div class="capsule-tool-btn" onclick="goToToday">
    <text class="capsule-tool-btn-text">今</text>
  </div>
  <div class="capsule-tool-btn" onclick="goToTomorrow">
    <text class="capsule-tool-btn-text">明</text>
  </div>
</div>

<!-- 状态栏可合并到 toolbar 下方或作为独立行 -->
<div class="capsule-status-bar" if="{{ showStatusBar }}">
  <text class="status-text">{{ statusTag }}: {{ statusMainText }}</text>
  <text class="status-time">{{ statusTimeText }}</text>
</div>
```

### 4.4 课程管理 Header 重构方案

#### 改造前

```
┌──────────────── 160px ────────────────┐
│ [back48]  课程(1.5字)  [+ 添加~70]    │
└───────────────────────────────────────┘
标题"课程管理"只显示 1.5 字
```

#### 改造后

```
┌──────────────── 160px ────────────────┐
│ [back44]   课程管理(4字)   [placeholder]│  ← Header: 标题完整显示
└───────────────────────────────────────┘
                                         
┌──────────────── 160px ────────────────┐
│  [清除全部]          [+ 添加课程]      │  ← Toolbar: 操作按钮
└───────────────────────────────────────┘
```

---

## 五、各页面改造清单

### 5.1 需要减少 Header 元素的页面

| 页面 | 当前 header 元素数 | 改造后 | 移到 toolbar 的元素 |
|------|:---:|:---:|------|
| **index** | 4 | 3 | [总][今][明] → toolbar |
| **course-manager** | 3 | 2 | [+ 添加] → toolbar |
| **schedule-manager** | 3 | 2 | 操作按钮 → toolbar |
| **week-view** | 3 | 2 | 模板按钮 → toolbar |
| **add-course** | 3 | 2 | 保存按钮 → toolbar |
| **nickname-edit** | 3 | 2 | 保存按钮 → toolbar |

### 5.2 需要统一 CSS 引用的页面（全部 31 个胶囊屏适配页面）

所有页面统一引用 `capsule-header.css`，删除各自的独立 @media header 样式：

```css
/* 改造前：每个页面独立写 */
@media (shape: capsule), (shape: pill-shaped) {
  .header { height: 48px; margin-bottom: 8px; }
  .back-btn { width: 48px; height: 40px; ... }
  .title { font-size: 28px; ... }
}

/* 改造后：统一引用 */
@import '../../common/capsule-header.css';
```

### 5.3 垂直空间合并方案

将多个独立 bar 合并为 1-2 个复合行：

```
改造前（index.ux 胶囊模式，最多 7 层 bar）:
┌──────────────────┐
│ clock-row      36px│
│ header         52px│
│ custom-content 44px│
│ status-bar     44px│
│ pinned-bar     44px│
│ quick-add      48px│
├──────────────────┤
│ class-list   ~78px│  ← 仅剩 78px！
└──────────────────┘

改造后（合并为 3 层）:
┌──────────────────┐
│ header         44px│  ← 返回 + 标题 + 箭头
│ toolbar        48px│  ← 导航 [总][今][明]
│ combined-bar   44px│  ← 状态+置顶 合并行
├──────────────────┤
│ quick-add      48px│
│ class-list  ~114px│  ← 多出 46% 空间
└──────────────────┘
```

---

## 六、实施步骤

### 第一步：创建统一 CSS 文件

1. 创建 `src/common/capsule-header.css`
2. 定义 `.capsule-page`、`.capsule-header`、`.capsule-back`、`.capsule-title`、`.capsule-action`、`.capsule-placeholder`、`.capsule-toolbar`、`.capsule-tool-btn` 等统一类

### 第二步：改造首页 (index.ux)

1. Header 仅保留左箭头 + 标题 + 右箭头（3 个元素）
2. [总][今][明] 三个按钮移到 header 下方的 toolbar
3. 合并 custom-content-bar、status-bar、pinned-bar 为 1-2 行
4. 应用统一 CSS 类名

### 第三步：逐个改造其他页面

按优先级：course-manager → schedule-manager → week-view → add-course → 其他

### 第四步：验证

1. 真机胶囊屏验证 header 布局
2. 确保所有按钮可点击（44px 触控区）
3. 确保标题文字完整显示（不少于 4 个汉字）
4. 确保课程列表有足够垂直空间

---

## 七、数值总结

| 约束项 | 当前值 | 改造目标 |
|--------|--------|----------|
| Header 交互元素上限 | 4 个（溢出） | **≤ 3 个** |
| 每个按钮最小宽度 | 34~54px（不统一） | **统一 44px** |
| Header 总高 | 44~56px | **44px** |
| 标题最小显示字数 | 0.9 字（首页） | **≥ 4 字** |
| 顶部 bar 层数 | 最多 7 层 | **≤ 4 层** |
| 课程列表可视高度 | ≈78px | **≥ 120px** |
| 按钮最小高度 | 28~48px（不统一） | **44px** |
| CSS 管理方式 | 31 个页面独立写 | **1 个公共文件** |

---

## 八、注意事项

1. **禁止用更小按钮挤进 header**：36px 甚至 30px 的按钮在手表上无法准确点击，44px 是底线
2. **禁止用更小字号塞更多字**：18px 以下在胶囊屏上完全无法阅读
3. **禁止用 margin/padding 负值压缩间距**：会导致触控区域重叠，误触率飙升
4. **Toolbar 按钮保持 44px**：虽然移到下方，但仍是手指操作，不能缩小
5. **Header 标题用 lines:1 + text-overflow:ellipsis**：超长标题截断而非换行，换行会导致 header 变高
6. **所有按钮加 flex-shrink:0**：防止标题把按钮压扁