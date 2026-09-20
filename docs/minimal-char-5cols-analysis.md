# 极简模板改进方案：胶囊屏一行显示 5 天课程

## 1. 约束条件

| 参数 | 值 |
|------|---|
| 胶囊屏宽度 | **160px** |
| 左右内边距 | **0**（`padding: 44px 0 8px 0`） |
| `.wv-cell` margin | `1px`（左右各 1px，两格之间共 2px） |
| 目标列数 | **5 列**（周一至周五） |
| 显示内容 | **单个中文字符**（`nameDisplay: "char"`） |
| 文字可读性要求 | 不能太小，用户必须看清 |
| 视觉区分要求 | 格子之间有区分（边框/背景色） |

## 2. 核心数学：5 列能否放入 160px？

```
每格总宽度 = cellWidth + 2×border + 2×margin
5×格总宽度 ≤ 160px
```

当前极简模板：`cellWidth = 60px` → `5 × (60 + 2) = 310px >> 160px` ❌ 必须水平滑动。

## 3. 三种方案对比

### 方案 A：边框 + 背景色（网格线区分）

```
cellWidth = 28px
border = 1px solid (左右各 1px)
margin = 1px (左右各 1px)
─────────────────────────────────
每格总宽度 = 28 + 2 + 2 = 32px
5 格总计   = 5 × 32 = 160px     ✅ 恰好填满
─────────────────────────────────
内部文本可视区 = 28 - 2 = 26px（border 占据左右 1px）
推荐字号   = 20px bold （20 < 26，左右各 3px 呼吸空间）
```

| 属性 | 推荐值 |
|------|--------|
| cellWidth | 28px |
| cellHeight | 36px |
| rowHeight | 40px |
| cellRadius | 4px |
| nameFontSize | 20px |
| nameLineHeight | 26px |
| nameFontWeight | bold |
| border | `1px solid`（颜色用 `theme.borderLight`） |

**优点**：格子轮廓清晰，视觉边界明确，像真正的课表格。  
**缺点**：border 吃掉 2px 内部空间，字号上限 20px。

### 方案 B：纯背景色（极简无边框）

```
cellWidth = 30px
border = 无
margin = 1px
─────────────────────────────────
每格总宽度 = 30 + 2 = 32px
5 格总计   = 5 × 32 = 160px     ✅ 恰好填满
─────────────────────────────────
内部文本可视区 = 30px（完整可用）
推荐字号   = 22px bold （22 < 30，左右各 4px 空间）
```

| 属性 | 推荐值 |
|------|--------|
| cellWidth | 30px |
| cellHeight | 38px |
| rowHeight | 42px |
| cellRadius | 6px |
| nameFontSize | 22px |
| nameLineHeight | 28px |
| nameFontWeight | bold |

**优点**：字号更大（22px vs 20px），识别更轻松。  
**缺点**：无网格线，相邻格子颜色接近时边界模糊。

### 方案 C：极细线（折中）

```
cellWidth = 29px
border = 1px solid (borderLight, opacity 0.5)
margin = 1px
─────────────────────────────────
每格总宽度 = 29 + 2 + 2 = 33px
5 格总计   = 5 × 33 = 165px     ❌ 溢出 5px！
```

此方案不可行，160px 无法容纳 border 的额外 2px 宽度。

## 4. 推荐：方案 A（边框版）

选择理由：

1. **视觉区分明确** — 1px 实线边框加上 `useColorScheme` 背景色，格子边界清晰，不会混淆相邻课程
2. **字号可接受** — 20px bold 单中文字符在手环上相当于手机约 14~15sp 的感知，且只有一个字，一眼辨认无压力
3. **gridContentWidth = 160px ≡ 屏幕宽** — 无需水平滚动，5 天完整平铺
4. **border 颜色** — 用 `theme.borderLight`，深浅主题自适应

备选：如果实测 20px 偏小，可升级为方案 B（无边框、22px），依靠背景色区分。

## 5. 需修改的代码

### 5.1 TEMPLATE_CONFIGS 中 `minimal-char` 配置

```
当前:
  cellWidth: 60
  rowHeight: 60
  cellHeight: 56
  nameFontSize: 28
  nameLineHeight: 34
  nameFontWeight: "bold"
  cellRadius: "12px"

改为:
  cellWidth: 28
  rowHeight: 40
  cellHeight: 36
  nameFontSize: 20
  nameLineHeight: 26
  nameFontWeight: "bold"
  cellRadius: "4px"
```

### 5.2 新增 border 样式

`.wv-cell` 增加 `border: 1px solid`：

```css
/* 极简模板专用：网格线 */
.wv-cell-bordered {
  border: 1px solid;
}
```

和 margin 当前值 `1px` 吻合，无须调整 margin。

### 5.3 applyTemplate 中确保胶囊屏 cellWidth 不超限

当前代码：
```js
this.cellWidth = (this.isCapsule === true) ? Math.min(w, 60) : w
```

改为：
```js
this.cellWidth = (this.isCapsule === true) ? Math.min(w, 30) : w
```

`Math.min(28, 30) = 28` → 正确。但需要确保 `cfg.cellWidth` 本身已设为 28。

### 5.4 `dayLabels` 改为周一到周五

当前极简模板 `dayLabels: ["一", "二", "三", "四", "五", "六", "日"]`，7 天。胶囊屏 5 列模式下合理只显示 5 天（周一到周五），`weekDays` 在 `buildTimeSlots` 中动态生成时由 `maxDisplayDays` 控制。如果 `weekDays.length = 5`，则 gridContentWidth = 5 × 32 = 160px。

---

## 6. 布局尺寸验证总表

```
胶囊屏 160px 宽度分配（方案 A）：

┌──┬──┬──┬──┬──┐
│28│28│28│28│28│  ← cellWidth × 5 = 140px
├──┼──┼──┼──┼──┤
│ 1│ 2│ 1│ 2│ 1│  ← margin 共 10px (2px × 5格)
├──┼──┼──┼──┼──┤
│b2│b2│b2│b2│b2│  ← border 共 10px (2px × 5格)
└──┴──┴──┴──┴──┘
总计：140 + 10 + 10 = 160px ✅

每格可视文本区：28 - 2(border) = 26px
20px中文字符在26px内居中：左右各3px余量 ✅
```

## 7. 风险与验证

| 风险 | 缓解 |
|------|------|
| 20px 偏小看不清 | 备选方案 B（22px 无边框）；或调整到 21px/30px 配置 |
| 边框颜色太淡（亮色主题） | 用 `theme.borderLight`，在亮/暗主题下都有足够对比 |
| 同一时段多门课 `+N` 提示 | 已通过 `currentTplId !== 'minimal-char'` 禁用 |
| cellRadius 4px 圆角过小 | 保持了触摸反馈友好，4px 在小格子里看起来不廉价 |
| gridContentWidth 刚好 160px，scroll 无用 | 设置 `scroll-x="false"` 或保持 `scroll-x="true"` 均可，无副作用 |