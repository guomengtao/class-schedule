# 总课表 · 极简版 设计分析

## 一、现有模板参数对比

| 参数 | minimal-char（当前极简） | minimal-en | standard-block | compact-grid | color-pastel |
|------|--------------------------|------------|----------------|--------------|--------------|
| cellWidth | 42px | 60px | 70px | 40px | 70px |
| cellHeight | 52px | 50px | 64px | 48px | 64px |
| rowHeight | 58px | 54px | 72px | 54px | 72px |
| nameFontSize | 36px | 28px | 28px | 32px | 28px |
| nameLineHeight | 42px | 34px | 34px | 38px | 34px |
| nameFontWeight | bold | bold | normal | bold | normal |
| rowNumWidth | 0 | 0 | 50px | 40px | 50px |
| cellRadius | 6px | 8px | 6px | 4px | 10px |
| cellMargin | 0 | — | — | 0 | — |
| nameDisplay | char | en-abbr | full | char | full |

---

## 二、当前 minimal-char 留白分析

以 `cellWidth = 42px`，单汉字 `nameFontSize = 36px bold` 计算：

### 2.1 水平留白

```
cellWidth = 42px
汉字实际渲染宽度 ≈ nameFontSize ≈ 36px

水平留白 = (42 - 36) / 2 = 3px（每侧）
留白占比 = 6 / 42 = 14.3%
```

> 结论：文字几乎撑满单元格，仅两侧各 3px 留白，视觉效果拥挤。

### 2.2 垂直留白

```
cellHeight = 52px
nameLineHeight = 42px

垂直留白 = (52 - 42) / 2 = 5px（上下各）
留白占比 = 10 / 52 = 19.2%
```

### 2.3 行间距

```
rowHeight = 58px, cellHeight = 52px
行间空隙 = 58 - 52 = 6px
```

---

## 三、新极简版设计方案

### 3.1 设计目标

| 目标 | 说明 |
|------|------|
| 文字缩小 | nameFontSize 从 36px 降至 24px（缩小 33%） |
| 不加粗 | nameFontWeight 从 bold 改为 normal |
| 增加留白 | 水平/垂直留白均显著增大 |
| 宽度不变 | cellWidth 保持 42px |
| 行间距增加 | rowHeight 适度增大，行与行之间更透气 |

### 3.2 新参数

| 参数 | 旧值 | 新值 | 变化 |
|------|------|------|------|
| cellWidth | 42px | **42px** | 不变 |
| cellHeight | 52px | **58px** | +6px |
| rowHeight | 58px | **66px** | +8px |
| nameFontSize | 36px | **24px** | -12px (−33%) |
| nameLineHeight | 42px | **30px** | -12px |
| nameFontWeight | bold | **normal** | 去粗 |
| rowNumWidth | 0 | **0** | 不变 |
| cellRadius | 6px | **10px** | 更圆润 |
| cellMargin | 0 | **2px** | +2px 格间透气 |
| nameDisplay | char | **char** | 不变 |

---

## 四、新方案留白详细计算

### 4.1 水平留白

```
cellWidth = 42px
nameFontSize = 24px（normal 不加粗，实际渲染宽度 ≈ 24px）

水平留白 = (42 - 24) / 2 = 9px（每侧）
留白占比 = 18 / 42 = 42.9%
```

| 指标 | 旧方案 | 新方案 | 倍数 |
|------|--------|--------|------|
| 单侧留白 | 3px | 9px | **×3.0** |
| 留白占比 | 14.3% | 42.9% | **×3.0** |

> 文字在格子内显著缩小，两侧各有 9px 呼吸空间，视觉上更轻盈。

### 4.2 垂直留白

```
cellHeight = 58px
nameLineHeight = 30px

垂直留白 = (58 - 30) / 2 = 14px（上下各）
留白占比 = 28 / 58 = 48.3%
```

| 指标 | 旧方案 | 新方案 | 倍数 |
|------|--------|--------|------|
| 上下留白 | 5px | 14px | **×2.8** |
| 留白占比 | 19.2% | 48.3% | **×2.5** |

### 4.3 行间距

```
rowHeight = 66px, cellHeight = 58px
行间空隙 = 66 - 58 = 8px
```

| 指标 | 旧方案 | 新方案 | 增量 |
|------|--------|--------|------|
| 行间空隙 | 6px | 8px | **+33%** |

### 4.4 列间距

```
cellMargin = 2px（格与格之间各加 2px 间距）
每个 cell 实际占用宽度 = cellWidth + 2 × cellMargin = 42 + 4 = 46px

5 天总宽度（无行号列）：
gridContentWidth = 0 + 5 × 46 = 230px
```

| 指标 | 旧方案 | 新方案 |
|------|--------|--------|
| 单元格间距 | 0px | 4px（两边各2px） |
| 5天总宽 | 210px | 230px |

### 4.5 汇总对照表

```
┌──────────────────┬────────────┬────────────┬──────────────┐
│      指标         │  旧极简     │  新极简     │   变化        │
├──────────────────┼────────────┼────────────┼──────────────┤
│ 单元格宽度        │  42px      │  42px      │  不变         │
│ 单元格高度        │  52px      │  58px      │  +11.5%       │
│ 行高              │  58px      │  66px      │  +13.8%       │
│ 字号              │  36px bold │  24px normal│ -33% +去粗   │
│ 行高(文字)        │  42px      │  30px      │  -28.6%       │
│ 水平留白(每侧)    │  3px       │  9px       │  ×3.0         │
│ 垂直留白(每侧)    │  5px       │  14px      │  ×2.8         │
│ 行间空隙          │  6px       │  8px       │  +33%         │
│ 格间空隙          │  0px       │  4px       │  新增         │
│ 圆角              │  6px       │  10px      │  +67%         │
│ 每格文字占比(面积)│  69.2%     │  29.6%     │  减半         │
└──────────────────┴────────────┴────────────┴──────────────┘
```

> 文字面积占比 = (nameFontSize × nameLineHeight) / (cellWidth × cellHeight)
> 旧：36×42 / 42×52 = 1512/2184 = 69.2%
> 新：24×30 / 42×58 = 720/2436 = 29.6%

---

## 五、代码实现

在 `TEMPLATE_CONFIGS` 中新增一条配置：

```javascript
"minimal-clean": {
  showRowNum: false,
  showRoom: false,
  showTeacher: false,
  showTime: false,
  showDayCount: false,
  showTotal: false,
  nameDisplay: "char",
  dayLabels: ["\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d", "\u65e5"],
  cellRadius: "10px",
  rowHeight: 66,
  cellHeight: 58,
  rowNumWidth: 0,
  nameFontSize: 24,
  nameLineHeight: 30,
  nameFontWeight: "normal",
  infoFontSize: 0,
  useColorScheme: true,
  denseMode: false,
  cellWidth: 42,
  cellMargin: 2
}
```

并在 `templateList` 中添加按钮：

```javascript
{ id: "minimal-clean", label: "清爽", activeColor: "#27ae60" }
```

---

## 六、视觉预期

```
旧极简 (36px bold, 无间距):
┌────┬────┬────┬────┬────┐
│ 语  │ 数  │ 英  │ 物  │ 化  │   ← 大字撑满，压迫感强
└────┴────┴────┴────┴────┘

新极简 (24px normal, 2px margin, 10px 圆角):
┌──────┐  ┌──────┐  ┌──────┐
│      │  │      │  │      │
│  语  │  │  数  │  │  英  │   ← 字小透气，圆角柔和
│      │  │      │  │      │
└──────┘  └──────┘  └──────┘
```

核心变化：**文字缩小 1/3 + 去粗体 + 留白翻 3 倍 + 格间透气 + 圆角柔和**，列宽不变，整体更干净、更现代。