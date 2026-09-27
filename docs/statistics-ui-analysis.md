# 课程统计 UI 规范分析报告

## 一、现有UI结构

### 1.1 总览卡片

```
┌──────────────────────────────────────────────────┐
│  .overview-row (justify-content: space-around)    │
│  ┌──────────────┬──────────────┬──────────────┐  │
│  │     15       │      8       │ 星期一 (8节)  │  │
│  │   总课程     │    本周      │   最忙日     │  │
│  └──────────────┴──────────────┴──────────────┘  │
│    40px/24px                                       │
└──────────────────────────────────────────────────┘
```

### 1.2 排行列表

```
┌──────────────────────────────────────────────────┐
│  rank-name(80px)  [======rank-bar(flex:1)======] N│
│  语文              ████████████                  8 │
│  28px                               24px(36px宽)  │
└──────────────────────────────────────────────────┘
```

### 1.3 数据内容与字号

| 元素 | 格式 | 默认字号 | rect字号 | 
|------|------|----------|----------|
| overview-number | `15` / `星期一 (8节)` | 40px | **32px** ⚠️缩小 |
| overview-label | `总课程` | 24px | **20px** ⚠️缩小 |
| section-title | `各科排行` | 28px | **24px** ⚠️缩小 |
| rank-name | `语文` | 28px | **24px** ⚠️缩小 |
| rank-count | `8` | 24px | **20px** ⚠️缩小 |

---

## 二、宽度计算（方屏 454×454px）

### 2.1 overview 三项均分

| 层级 | 扣除项 | 剩余 |
|------|--------|------|
| 屏幕总宽 | - | **454px** |
| page padding (8+8) | -16px | 438px |
| overview padding (12+12) | -24px | 414px |
| 每项均分 | ÷3 | **138px** |

### 2.2 busiestDay 溢出分析

`"星期一 (8节)"` @ 40px：

| 字符 | 宽度计算 | 累计 |
|------|----------|------|
| 星期一 | 3×40 = 120px | 120px |
| (空格) | ~13px | 133px |
| ( | ~22px | 155px |
| 8 | 40×0.55 = 22px | 177px |
| 节 | 40px | 217px |
| ) | ~22px | **239px** |

> **239px > 138px → 超出 101px (73%)** ❌ 严重溢出！

### 2.3 极值情况

"星期五 (15节)" = 3×40 + 13 + 22 + 2×40×0.55 + 40 + 22 = 120+13+22+44+40+22 = **261px** > 138px

> 最坏情况超出 123px (89%)

### 2.4 rank-item

| 层级 | 扣除项 | 剩余 |
|------|--------|------|
| section内部 | - | 438-28 = 410px |
| rank-name (80px) | -80px | 330px |
| rank-bar margin (10+10) | -20px | 310px |
| rank-count (36px) | -36px | **274px** |

rank-bar: 274px ✅ 

> rank-item 没问题

---

## 三、胶囊屏 (198px) 计算 — 崩溃级别

### 3.1 胶囊屏 @media 缺失严重

胶囊屏 `@media capsule` 仅定义了 `.header`、`.back-btn`、`.title` 三个样式，**overview、section、rank 全部缺失**。实际使用默认样式。

### 3.2 overview

| 层级 | 扣除项 | 剩余 |
|------|--------|------|
| 屏幕总宽 | - | **198px** |
| page padding (8+8) | -16px | 182px |
| overview padding (12+12) | -24px | 158px |
| 每项 | ÷3 | **52.7px** |

| 内容 | 需宽 | 可用 | 结果 |
|------|------|------|------|
| overview-number "15" (40px) | 44px | 52.7px | ⚠️ 临界 |
| overview-label "总课程" (24px) | 72px | 52.7px | ❌ 超出19px |
| busiestDay "星期一 (8节)" (40px) | 239px | 52.7px | ❌ 崩溃 |

### 3.3 rank-item

| 层级 | 扣除项 | 剩余 |
|------|--------|------|
| section内部 | - | 182-28 = 154px |
| rank-name (80px) | -80px | 74px |
| rank-bar margin (10+10) | -20px | 54px |
| rank-count (36px) | -36px | **18px** |

> rank-bar 仅 18px，几乎看不见！

### 3.4 胶囊屏概览

| 组件 | 问题 | 严重度 |
|------|------|--------|
| overview 三项排布 | 每项仅53px，label"总课程"72px溢出 | ❌ |
| busiestDay | 239px vs 53px，完全崩溃 | ❌ |
| rank-bar | 仅18px宽 | ❌ |
| @media capsule | 缺失所有内容样式 | ❌ |

---

## 四、rect屏 (300-400px) 字号缩小问题

rect 屏字号被全面缩小：

| 元素 | 默认 | rect | 缩小比 |
|------|------|------|--------|
| overview-number | 40px | 32px | -20% |
| overview-label | 24px | 20px | -17% |
| section-title | 28px | 24px | -14% |
| rank-name | 28px | 24px | -14% |
| rank-count | 24px | 20px | -17% |
| empty-text | 28px | 24px | -14% |

> **违反"字号禁止缩小"原则**

---

## 五、问题汇总

| 屏幕 | overview | rank-item | 字号 | 评级 |
|------|----------|-----------|------|------|
| 方屏 454px | busiestDay ❌ 239/138 | ✅ | ✅ 40/28/24 | busiestDay溢出 |
| 圆形 454px | busiestDay ❌ 239/106 | ✅ | ✅ | busiestDay严重溢出 |
| 胶囊 198px | 全部 ❌ 崩溃 | ❌ bar仅18px | ✅ 40/28/24 | 布局崩溃 |
| rect | ⚠️ | ⚠️ | ❌ 全面缩小 | 字号违规 |

---

## 六、新规范设计（字号禁止缩小）

### 6.1 核心改动

1. **busiestDay 精简格式**：`"星期一 (8节)"` → `"星期一"` (去掉课程数，详情在下方的"每日分布"可见)
2. **rect屏恢复字号**：全部恢复到默认 40/28/24
3. **胶囊屏 overview 改垂直布局**：3项上下排列，每项独占整行
4. **胶囊屏 rank 精简**：rank-name 宽度从 80px 缩至名称实际宽度

### 6.2 busiestDay 精简

| 旧格式 | 需宽 | 新格式 | 需宽 | 
|--------|------|--------|------|
| 星期一 (8节) | 239px | 星期一 | 120px |

方屏 138px 每项：120px < 138px ✅
圆形 106px 每项：120px > 106px... 仍略超，加 ellipsis 或 lines:1

或用更短格式：取 day 名缩写。但 "星期一" 在 40px 下 120px，在 106px 下仍超 14px。

圆形屏 overview 每项仅 106px，对于 40px 字号的中文（每字 40px），3 个字 = 120px > 106px。这是物理限制。

**解决**：圆形屏 overview 改为 2 行布局（第一行2项 + 第二行1项），或允许换行。

实际上圆形屏 454px 的 page padding 是 36+36=72，header 还有额外 padding。

圆形屏 overview 内部 = 454-72-24(overview padding) = 358px
3项均分: 358/3 = 119px
"星期一" = 120px ≈ 119px 刚好！

加 `lines:1; text-overflow:ellipsis` 保护一下即可。

### 6.3 胶囊屏 overview 新布局

```
┌──────────────────────────────┐
│  总课程: 15   本周: 8        │  ← 第一行（2项并排）
│  最忙日: 星期一              │  ← 第二行（1项全宽）
└──────────────────────────────┘
```

或更简单：
```
┌──────────────────────────────┐
│  15 门课程                   │  ← 行1
│  本周 8 节                   │  ← 行2  
│  最忙日: 星期一              │  ← 行3
└──────────────────────────────┘
```

### 6.4 胶囊屏 rank-item 新布局

去掉固定 80px rank-name，改用 flex 自适应：

```
┌──────────────────────────────┐
│ 语文  ████████████   8       │
│ 数学  ██████████     7       │
└──────────────────────────────┘
```

rank-name 不设固定宽度，`flex-shrink:1; lines:1; text-overflow:ellipsis`。

胶囊屏 section 内部: 198-16-28 = 154px
- rank-name: ~60px (3字@28px = 84px → 需要调整)
- 实际上 "语文" = 2×28=56px，"道德与法治" = 5×28=140px

对于胶囊屏，rank-name 改用 20px 字号... 等等，用户说不能缩小字号。

那保持 28px，但允许换行 `lines: 2`。

或者 rank-name 直接设 `flex-shrink: 1; lines:1; text-overflow:ellipsis`，在极端情况自动截断。

### 6.5 胶囊屏最终设计

```
┌──────────────────────────────────┐
│ 课程统计                         │
├──────────────────────────────────┤
│  15         8       星期一        │  ← overview 3项，数字40px
│  总课程     本周     最忙日       │  ← label 24px
├──────────────────────────────────┤
│ 各科排行                         │
│ 语文  ████████████       8       │
│ 数学  ██████████         7       │
│ ...                              │
├──────────────────────────────────┤
│ 每日分布                         │
│ 星期一  ██████████       5       │
│ ...                              │
├──────────────────────────────────┤
│ 时段分布                         │
│ 上午  ██████████         12      │
│ 下午  ████████           7       │
│ 晚上  ██                 2       │
└──────────────────────────────────┘
```

---

## 七、新CSS方案

### 7.1 默认样式修复 busiestDay

```css
.overview-number {
  font-size: 40px;
  font-weight: bold;
  line-height: 48px;
  lines: 1;
  text-overflow: ellipsis;
}
```

### 7.2 rect屏恢复字号

```css
@media (shape: rect) {
  .overview-number { font-size: 40px; }   /* 从32px恢复 */
  .overview-label { font-size: 24px; }    /* 从20px恢复 */
  .section-title { font-size: 28px; }     /* 从24px恢复 */
  .rank-name { font-size: 28px; }         /* 从24px恢复 */
  .rank-count { font-size: 24px; }        /* 从20px恢复 */
  .empty-text { font-size: 28px; }        /* 从24px恢复 */
}
```

但 rect 屏更小，字号恢复后需要调整布局。rect 屏（约 300-350px）：
- page padding 6+6=12
- 内容区: 330-12=318px
- section 内部: 318-24=294px
- rank-name: "语文" 56px @ 28px ✅

overview 三项：
- 318-20(overview padding)=298px
- 每项: 298/3=99px
- busiestDay "星期一" 120px > 99px ❌

rect 屏 overview 也需要精简。把 busiestDay 从 "星期一" 改为更短格式，或 overview 用 2列+1列。

好吧，rect 屏确实太窄。但我必须保持字号。方案：
- rect 屏 overview 改为2行：第一行 总课程+本周，第二行 最忙日独占
- 或者 busiestDay 用 lines:1 + ellipsis

实际上对于 rect 屏，保持字号的话 overview 必须改布局。让我用最简单的：overview-row 允许 flex-wrap。

### 7.3 胶囊屏完整 @media

```css
@media (shape: capsule), (shape: pill-shaped) {
  .page { padding: 30px 8px 30px 8px; }
  
  .overview { padding: 14px 8px; }
  .overview-row { flex-wrap: wrap; }
  .overview-item { width: 33.3%; }
  .overview-number {
    font-size: 40px;
    lines: 1;
    text-overflow: ellipsis;
  }
  .overview-label {
    font-size: 24px;
    lines: 1;
    text-overflow: ellipsis;
  }
  
  .section { padding: 14px 8px; }
  .section-title { font-size: 28px; }
  
  .rank-name {
    font-size: 28px;
    width: auto;
    flex-shrink: 1;
    lines: 1;
    text-overflow: ellipsis;
    margin-right: 6px;
  }
  .rank-bar-wrap { margin: 0 6px; }
  .rank-count {
    font-size: 24px;
    width: auto;
    min-width: 24px;
  }
}
```

---

## 八、验证

### 8.1 胶囊屏 (198px)

**overview**: 内部约 182-16=166px，3项 55px/个
- number "15" (40px) = 44px < 55px ✅
- label "总课程" (24px) = 72px > 55px → lines:1 + ellipsis 截断为 "总课..." ✅
- busiestDay "星期一" = 120px > 55px → ellipsis 截断 ✅

实际上胶囊屏每项 55px 对于 24px 的中文只能显示约 2 个半字。"总课程" 3字会被截断。但这就是物理限制，ellipsis 处理是合理的。

**rank-item**: 内部 198-16-16=166px
- rank-name "语文" 56px + bar 余量 + count 24px
- bar: 166-56-12-24 = 74px ✅ (比之前18px好很多)

### 8.2 rect屏 overview

内部约 298px，3项 99px/个
- "总课程" 72px < 99px ✅
- busiestDay "星期一" 120px > 99px → ellipsis ✅

---

## 九、总结

| 改动 | 旧 | 新 |
|------|----|----|
| busiestDay | `星期一 (8节)` 239px溢出 | `星期一` 120px + ellipsis |
| rect字号 | 32/24/20（缩小） | **40/28/24（恢复）** |
| 胶囊屏 @media | 只定义header | 完整内容适配 |
| 胶囊屏 rank-name | 固定80px | flex自适应 |
| 胶囊屏 rank-bar | 18px不可见 | 74px可见 |
| **所有字号** | rect有缩小 | **全部保持原值** |