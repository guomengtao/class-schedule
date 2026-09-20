# 极简/紧凑模板 — 胶囊屏单字可读性分析

## 1. 环境参数

| 参数 | 值 |
|------|---|
| 胶囊屏可用宽度 | 160px（`padding: 44px 0 8px 0`，左右无内边距） |
| 网格滚动方式 | `scroll-x="true"`，水平可滑动 |
| 中文字符视觉宽度 | ≈ 字号 × 1.0（等宽） |

## 2. 极简模板（minimal-char）

| 参数 | 配置值 | 胶囊屏实际值 |
|------|--------|------------|
| cellWidth | 60px | `Math.min(60, 60)` = **60px** |
| rowNumWidth | 0 | **0**（胶囊屏强制关闭） |
| nameFontSize | 28px | **28px** |
| nameFontWeight | `"bold"` | **bold** |
| cellHeight / rowHeight | 56px / 60px | **56px / 60px** |
| cellRadius | 12px | **12px** |

### 2.1 5 列能否一行完整显示？

```
5 × 60px = 300px > 160px（胶囊屏宽度）
```

**不能**。5 天需要 300px，屏幕仅 160px，首次可见约 `⌊160 / 60⌋ = 2.6` 列。

但由于外层是 `<scroll scroll-x="true">`，用户可以**左右滑动**查看所有 5 天，这是设计预期行为，不是 bug。

### 2.2 单字会看不见吗？

**不会。** 理由如下：

- 中文字符在 28px 字号下视觉宽度约 **28px**
- 单个格子宽度 **60px**，两侧各有 `(60 - 28) / 2 ≈ 16px` 留白
- 格子高度 **56px**，字符行高 **34px**，上下各有 `(56 - 34) / 2 = 11px` 留白
- 字号 28px 在手环胶囊屏（约 1.5~2 英寸）上相当于手机约 **18sp** 的感知大小，属于「大字」级别
- 背景色块提供强对比，字符不会融入背景

### 2.3 bold 是否提升识别度？

**是。** 极简模板已配置 `nameFontWeight: "bold"`（行 181）。

bold 加粗使笔画更粗，在 28px 字号下：
- 笔画宽度增加约 20%~30%
- 在小屏幕上显著提升「一眼辨识」的速度
- 对「语」「数」「英」等结构复杂的汉字尤其有效

**结论：bold 是正确的设计选择，无需调整。**

---

## 3. 紧凑模板（compact-grid）

| 参数 | 配置值 | 胶囊屏实际值 |
|------|--------|------------|
| cellWidth | 50px | `Math.min(50, 60)` = **50px** |
| rowNumWidth | 40px | **0**（胶囊屏强制关闭） |
| nameFontSize | 28px | **28px** |
| nameFontWeight | `"normal"` | **normal** |
| cellHeight / rowHeight | 48px / 52px | **48px / 52px** |
| cellRadius | 3px | **3px** |

### 3.1 5 列能否一行完整显示？

```
5 × 50px = 250px > 160px
```

**不能。** 同样依赖水平滑动。

### 3.2 单字会看不见吗？

紧凑模板的格子更窄（50px vs 60px），但：

- 28px 字符放在 50px 格子中，两侧各有 `(50 - 28) / 2 = 11px` 留白
- 仍然有 **22% 的左右余量**（极简是 53%）
- 50px 宽度对于 28px 中文字符来说**足够不拥挤**
- 格子高度 48px，字符 34px，上下各 7px 留白

### 3.3 normal 字体 vs bold 字体

| 属性 | 极简 | 紧凑 |
|------|------|------|
| 字重 | bold | normal |
| 格子宽 | 60px | 50px |
| 格子高 | 56px | 48px |

紧凑模板使用 `nameFontWeight: "normal"`。在 50px × 48px 的小格子里，normal 字重配合 28px 字号仍然清晰可辨，但**视觉冲击力弱于 bold**。

**如果要提升紧凑模板的识别度，建议将 `nameFontWeight` 从 `"normal"` 改为 `"bold"`。**

这一改动在代码层面只需要改一行：

```
// compact-grid 配置中：
nameFontWeight: "normal"  →  nameFontWeight: "bold"
```

---

## 4. 总结

| 问题 | 结论 |
|------|------|
| 5 天一字一行显示完整？ | 不能（需要 300px/250px > 160px），但 `scroll-x` 提供滑动查看，符合设计预期 |
| 用户会看不见文字吗？ | 不会。28px 单字在 50~60px 格子中足够显眼，配合背景色块对比度充足 |
| bold 提升识别度？ | 是。极简已用 bold，紧凑建议改为 bold |
| 需要调整吗？ | 紧凑模板建议 `nameFontWeight: "bold"`，其他无需改动 |

---

## 5. 建议操作

将紧凑模板（compact-grid）的 `nameFontWeight` 从 `"normal"` 改为 `"bold"`，与极简模板保持一致的加粗策略：

```
行 209: nameFontWeight: "normal"  →  nameFontWeight: "bold"
```

这一改动风险极低，仅影响紧凑模板在 `getDisplayName()` 渲染 `nameDisplay: "char"` 时的样式。