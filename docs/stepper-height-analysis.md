# 步进式时间选择器布局混乱 — 根因分析

## 现象

改为 demo-reminder 方式2 后，时间选择区域布局混乱。

## 根因：内容溢出 + 无滚动容器

### 高度计算

```
屏幕可用高度 ≈ 640px（典型手机）
- 返回栏:       78px (50 + 16 margin + 12 padding)
- 步骤指示器:    40px (20 + 20 margin)
- 页面 padding:  32px (16 + 16)
─────────────────────────
.form-section 可用: 490px
```

step 2 内容高度：
```
- step-title:        32px (24 + 8 margin)
- step-hint:         36px (20 + 16 margin)
- picker-label 开始: 46px (24 + 14 + 8)
- stepper-time:     122px (16 + 40 + 10 + 40 + 16)
- picker-label 结束: 46px
- stepper-time:     122px
- margin-bottom:     14px
- step-nav:          60px (按钮)
─────────────────────────
总计:               478px
```

478px 接近 490px 上限，**无任何余量**。一旦字号或间距稍有变化即溢出。

### 旧方案为什么没乱

旧的箭头选择器每列 3 行（▲/数字/▼），Quick App 对其高度计算有明确依据（每个子元素都有显式 height）。步进式每行只有 1 行横向排列，Quick App 对 flex row 高度计算可能不准确，导致实际渲染高度与预期不同，进而溢出。

### 为什么调 padding 越调越乱

每次增加 padding，内容总高度超出屏幕更多，Quick App 的 flex 布局在溢出时行为不可预测，导致元素重叠/错位，用户看到"乱"。

## 修复

**不是调 CSS 值，而是加滚动容器**：

```
修复前:
.form-section (flex:1, 无滚动)
  ├── step-title
  ├── step-hint
  ├── picker-label
  ├── stepper-time
  ├── picker-label
  ├── stepper-time      ← 内容可能溢出，布局崩溃
  └── step-nav

修复后:
.form-section (flex:1, column)
  ├── step-title        ← 固定顶部
  ├── step-hint         ← 固定顶部
  ├── step2-scroll (flex:1, scroll-y)  ← 可滚动区域
  │   ├── picker-label
  │   ├── stepper-time
  │   ├── picker-label
  │   └── stepper-time
  └── step-nav          ← 固定底部
```

### 改动清单

| 改动 | 说明 |
|------|------|
| 模板 | 时间选择器内容包在 `<scroll scroll-y="true">` 中 |
| CSS | `.stepper-time` padding 恢复为 16px（demo-reminder 原值） |
| CSS | 新增 `.step2-scroll { flex:1; flex-direction:column }` |

### 效果

- 标题和提示固定在顶部
- 上一步/下一步按钮固定在底部
- 时间选择器在中间区域，内容超出时可滚动
- 所有元素尺寸与 demo-reminder 方式2 完全一致