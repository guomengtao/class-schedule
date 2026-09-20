# 极简模板右侧多余空间计算（精准版）

## 1. 设备屏幕参数（来自 device.getInfo() 实测）

```
screenWidth:  212px
screenHeight: 520px
screenShape:  "pill-shaped"
deviceType:   "band"
```

来源：[fix-capsule-shape-media-query.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/fix-capsule-shape-media-query.md)

## 2. 当前 gridContentWidth

```js
gridContentWidth = rowNumWidth + weekDays.length × (cellWidth + 2×cellMargin + (cellBordered ? 2 : 0))
```

| 场景 | 公式 | 结果 |
|------|------|------|
| 隐藏周末 5 天 | 0 + 5×(32+0+0) | **160px** |
| 显示周末 7 天 | 0 + 7×(32+0+0) | **224px** |

## 3. 多余空间计算

```
屏幕宽度 W = 212px
当前 gridContentWidth = 160px

多余空间 = W - gridContentWidth = 212 - 160 = 52px
列浪费   = 52 / 32 = 1.625 列
利用率   = 160 / 212 = 75.5%
```

**右侧白白浪费了 52px，相当于 1.6 列完整格子宽度！**

## 4. 最大化 cellWidth 计算

### 4.1 极简模板（minimal-char，无边框，margin=0）

```
cellWidth_max = floor(W / 5) = floor(212 / 5) = floor(42.4) = 42px

验证：5 × 42 = 210px ≤ 212px ✅
剩余：212 - 210 = 2px（微不足道）
```

### 4.2 紧凑模板（compact-grid，1px 边框，margin=0）

```
每格总宽 = cellWidth + 2×border
cellWidth_max + 2 ≤ W / 5
cellWidth_max ≤ 42.4 - 2 = 40.4
cellWidth_max = 40px

验证：5 × (40 + 2) = 210px ≤ 212px ✅
```

## 5. 推荐最终值

### 极简模板（minimal-char）

| 属性 | 当前值 | 推荐值 | 变化 |
|------|--------|--------|------|
| cellWidth | 32px | **42px** | +31% |
| nameFontSize | 28px | **36px** | +29% |
| nameLineHeight | 34px | **42px** | +24% |
| cellHeight | 42px | **52px** | +24% |
| rowHeight | 48px | **58px** | +21% |
| 5 列总宽 | 160px | **210px** | — |
| 占比 | 75.5% | **99.1%** | — |

36px 中文字符在 42px 格子内：左右各 (42-36)/2 = 3px 呼吸空间。✅

### 紧凑模板（compact-grid）

| 属性 | 当前值 | 推荐值 | 变化 |
|------|--------|--------|------|
| cellWidth | 30px | **40px** | +33% |
| nameFontSize | 24px | **32px** | +33% |
| nameLineHeight | 30px | **38px** | +27% |
| cellHeight | 40px | **48px** | +20% |
| rowHeight | 46px | **54px** | +17% |
| 5 列总宽 | 160px | **210px** | — |
| border 占 | — | 2px × 5 = 10px | — |
| 总宽含边框 | 150px(漏算) | **210px** | — |
| 占比 | 75.5% | **99.1%** | — |

32px 中文字符在 40px 格子内，边框吃掉 2px 后内部 38px：左右各 (38-32)/2 = 3px。✅

## 6. 总评

```
之前（160px 假设）：
┌─────────────────────────────┬──────────┐
│ ██ ██ ██ ██ ██             │ 52px空置 │
│ 32  32  32  32  32          │          │
└─────────────────────────────┴──────────┘
  利用率 75.5%               浪费 24.5%

之后（212px 真实）：
┌───────────────────────────────────────┬──┐
│ ████ ████ ████ ████ ████             │ 2│
│  42   42   42   42   42               │  │
└───────────────────────────────────────┴──┘
  利用率 99.1%                       仅剩 2px
```

字号从 28px/24px 可直接拉到 **36px/32px**，提升约 **30%**。