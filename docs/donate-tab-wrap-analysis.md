# 打赏页面 Tab 文字换行问题分析与解决方案

## 问题描述

打赏页面（`src/pages/donate/donate.ux`）顶部有三个 Tab："微信"、"支付宝"、"爱发电"。在胶囊屏上，这三个 Tab 文字放不下导致换行。

## 根因分析

### 尺寸计算

| 项目 | 数值 |
|------|------|
| 胶囊屏宽度 | ~200px |
| 默认 `.page` 左右 padding | 各 10px → 占用 20px |
| tab-bar 可用宽度 | 200 - 20 = **180px** |
| 默认 `.tab-item` margin | `0 3px` → 3个间隔 = 12px |
| 每个 tab 宽度 | (180 - 12) / 3 = **56px** |
| 文字 "支付宝" 28px 字体 | 3个汉字 × 28 = **84px** |
| **结论** | 56px < 84px → **文字必然换行** |

### 对比其他屏幕

| 屏幕 | tab-text font-size | 结果 |
|------|-------------------|------|
| 默认（circle） | 28px | 屏幕宽 ~390px，足够 |
| circle @media | 24px | 再次缩小，宽裕 |
| rect @media | 24px | 宽裕 |
| **capsule** | **28px（未覆盖）** | **放不下，换行** |

胶囊屏的 `@media (shape: capsule)` 块里**没有** `.tab-item`、`.tab-text`、`.tab-bar` 的样式覆盖，导致沿用默认的 28px 大字体，在 200px 窄屏上必然换行。

## 解决方案（不缩小文字，保持 28px）

### 方案一：tab-bar 横向滚动（推荐）

胶囊屏上将 tab-bar 改为可横向滚动的容器，每个 tab 自适应宽度，不换行。

```css
@media (shape: capsule), (shape: pill-shaped) {
  /* ...existing capsule styles... */

  .tab-bar {
    overflow-x: scroll;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  .tab-item {
    flex-shrink: 0;
    flex: none;
    width: auto;
    padding: 0 14px;
    margin: 0 2px;
  }
  .tab-text {
    font-size: 28px;
    lines: 1;
  }
}
```

**优点**：文字完全不缩放，体验最好；滚动交互自然。

**缺点**：用户需要滑动才能看到所有 tab（但当前选中 tab 在视口内）。

---

### 方案二：去除间距 + 降低页面 padding

通过压缩 `page` 左右 padding 和 tab 之间的 margin，挤出更多空间。

```
可用宽度 = 200 - 2×5(page-padding) - 2×0(tab-margin) = 190px
每个 tab = 190 / 3 = 63px
文字需要 84px → 仍然不够
```

```css
@media (shape: capsule), (shape: pill-shaped) {
  .page {
    padding: 44px 4px 12px 4px;
  }
  .tab-bar {
    border-radius: 8px;
  }
  .tab-item {
    margin: 0 0px;
    border-radius: 8px;
  }
}
```

**优点**：简单，不改交互。

**缺点**：**仍然不够**，63px < 84px。单独使用无法解决。

---

### 方案三：方案二 + 方案一组合（最推荐）

在胶囊屏上压缩 padding 和 margin，同时启用横向滚动。

```css
@media (shape: capsule), (shape: pill-shaped) {
  .page {
    padding: 44px 4px 12px 4px;
  }
  .tab-bar {
    overflow-x: scroll;
    flex-wrap: nowrap;
    border-radius: 10px;
  }
  .tab-item {
    flex-shrink: 0;
    flex: none;
    width: auto;
    padding: 0 12px;
    margin: 0 1px;
    border-radius: 10px;
  }
  .tab-text {
    font-size: 28px;
    lines: 1;
  }
}
```

**优点**：文字 28px 不缩小，margin 最小化，滚动区域最大。

---

### 方案四：使用 Select / Picker 代替 Tab

在胶囊屏上用下拉选择器代替 Tab 组件。

**优点**：彻底解决宽度问题。

**缺点**：交互变化大，用户需要点两下；与 tab 切换设计不一致；开发成本高。

---

## 推荐方案

**方案三**（组合方案），即：

1. 胶囊屏 `.page` 左右 padding 从 10px 缩小到 4px
2. tab-bar 启用 `overflow-x: scroll` 横向滚动
3. tab-item 去掉 `flex: 1`，改为 `flex-shrink: 0; width: auto; padding: 0 12px`
4. 添加 `lines: 1` 防止折行

文字保持 28px 不缩小，通过滚动完整展示所有 Tab。