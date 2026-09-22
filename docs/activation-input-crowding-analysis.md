# 高级版激活页输入区域挤压与遮挡分析

## 故障现象

激活页（`pages/activation/activation.ux`）的步骤3"输入激活码"区域，18位激活码以每行6个cell展示，配合底部3x4数字键盘输入。在胶囊屏上，cell文字被挤压、遮挡，数字键盘按键偏小，用户难以看清和点击。

## 像素计算（胶囊屏基准宽度 = 384px）

### 当前CSS层叠

```
page padding: 10px × 2       → -20px → 剩余 364px
step-card padding: 14px × 2  → -28px → 剩余 336px
cells-grid padding: 8px × 2  → -16px → 剩余 320px  ← cells-row实际可用宽度
```

### Cell 区域分析

| 属性 | 当前值 | 问题 |
|------|:---:|------|
| cell 宽度 | `flex: 1` → 约 49px（(320-24)/6） | **偏窄**，32px大号数字几乎贴边 |
| cell 高度 | 48px | 32px字号 + 无line-height → 文字顶部被裁切 |
| cell 字宽 | 32px | "8" ≈ 28px宽，"0" ≈ 30px宽，cell 49px → 仅10px余量 |
| cell margin | 2px | 6个cell间距12px，浪费空间  |
| line-height | **未设置** | 胶囊规则要求 >= font-size + 8px = 40px |

**根因**：cell内部 `font-size: 32px` 但高度仅 48px，无 `line-height`，Vela 默认 line-height = font-size，导致32px文字被48px高盒子垂直居中时上下各仅8px空间，**视觉上紧贴边框、遮挡感强**。且cell宽度 ~49px，对宽数字如"8""0"几乎无水平余量。

### 数字键盘分析

| 属性 | 当前值 | 问题 |
|------|:---:|------|
| 按钮宽度 | 56px | 可用宽度312px，3个按钮仅用216px，**浪费96px** |
| 按钮高度 | 42px | 紧贴胶囊规则下限40px，偏小 |
| 字号 | 28px | **低于胶囊规则正文最小24px→正文应≥24px**，数字键盘字号28px基本合格 |
| margin | 8px × 2 | 间距过大，挤占按钮空间 |

**根因**：按钮宽度被硬编码为 56px，未充分利用空间。在 336px 可用宽度的卡片内，keypad padding 24px，按钮总间距 48px，可用给按钮的只有 312 - 48 = **264px**，每个按钮可达 **88px**，目前仅 56px。

## 改进方案

### Cell 网格

1. **减小页面padding**：`10px` → `6px`，两侧多出 8px
2. **减小cells-grid padding**：`8px` → `4px`，两侧多出 8px
3. **减小cell margin**：`2px` → `1px`，6个cell多出 6px
4. **总增益**：约 22px → 每cell从 49px 增至 **53px**
5. **增加line-height**：设置 `line-height: 40px`，垂直居中不裁切
6. **cell高度**：从 48px → **50px**，给文字留足空间

### 数字键盘

1. **按钮宽度**：从 56px → **75px**（或改为百分比/自适应）
2. **按钮高度**：从 42px → **50px**（确保胶囊屏易点击）
3. **减小margin**：`8px` → `5px`，释放更多空间给按钮
4. **字号**：保持 28px（28px ≥ 标题最小26px，合格）

## 对比表

| 区域 | 属性 | 当前 | 建议 | 增益 |
|------|------|:---:|:---:|:---:|
| Cell | 宽度 | ~49px | ~53px | +4px |
| Cell | 高度 | 48px | 50px | +2px |
| Cell | line-height | 无 | 40px | 不裁切 |
| Cell | font-size | 32px | 32px | 不变 |
| Cell | margin | 2px | 1px | 释放6px |
| 键盘按钮 | 宽度 | 56px | 75px | +19px |
| 键盘按钮 | 高度 | 42px | 50px | +8px |
| 键盘按钮 | 字号 | 28px | 28px | 不变 |
| 键盘按钮 | margin | 8px | 5px | 释放6px |

## 风险

- 修改page padding可能影响其他区域（header、status-card等），需逐一验证
- Vela不支持 `box-sizing: border-box`，padding变更会影响内部可用空间