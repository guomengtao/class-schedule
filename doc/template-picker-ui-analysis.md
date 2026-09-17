# 周模板 UI 规范分析报告

## 一、现有UI结构

```
┌──────────────────────────────────────────┐
│  ◀        模板选择                        │  header
├──────────────────────────────────────────┤
│  ○ Minimal Char                          │
│    Single Chinese character per subject  │  card (padding 16×14)
│  ● Standard Block                        │
│    Full name + classroom + time...       │
│  ○ Compact Grid                          │
│    High density layout...                │
└──────────────────────────────────────────┘
```

| 元素 | 默认字号 | 圆形屏字号 | 内容（英文） |
|------|----------|-----------|-------------|
| title | 36px | 36px | 周模板 |
| card-name | 32px | **28px** ⚠️缩小 | Minimal Char (12字) |
| card-desc | 28px | **24px** ⚠️缩小 | Single Chinese... (很长的英文) |
| radio-dot | 24px | 24px | ●/○ |

---

## 二、宽度计算

### 2.1 方屏 454px

| 层级 | 扣除 | 剩余 |
|------|------|------|
| page padding (10+10) | -20 | 434px |
| card padding (14+14) | -28 | 406px |
| radio-dot (28+12) | -40 | 366px |
| card-check (24+10) | -34 | **332px** |

card-name @ 32px: "Standard Block" ≈ 13×0.55×32 = 229px < 332px ✅
card-desc @ 28px (lines:2): 很长的英文，需要 2 行内显示。332px 足够 ✅

> 方屏无问题

### 2.2 圆形屏 454px

page padding: 36+36=72 → 内容区: 382px

| 层级 | 扣除 | 剩余 |
|------|------|------|
| card内部 | - | 382-24(卡padding) = 358px |
| radio-dot+margin | -40 | 318px |
| card-check+margin | -34 | **284px** |

card-name @ **28px（缩小）**: "Standard Block" ≈ 13×0.55×28 = 200px < 284px ✅
card-desc @ **24px（缩小）**: 更小字号，284px 一行约 21 个字母

> **字号被缩小**：card-name 32→28，card-desc 28→24 ⚠️

### 2.3 胶囊屏 198px

**@media capsule 仅定义了 header 样式，card 部分完全缺失！**

使用默认样式：

| 层级 | 扣除 | 剩余 |
|------|------|------|
| page padding (10+10) | -20 | 178px |
| card padding (14+14) | -28 | 150px |
| radio-dot+margin | -40 | 110px |
| card-check+margin | -34 | **76px** |

card-name @ 32px: "Minimal Char" ≈ 211px > 76px ❌
card-desc @ 28px: 一行仅 5 个字母 ❌

> **胶囊屏 card 彻底崩溃**

---

## 三、问题汇总

| 屏幕 | card-name | card-desc | 原因 |
|------|-----------|-----------|------|
| 方屏 454 | ✅ 229/332 | ✅ | 正常 |
| 圆形 454 | ⚠️ 200/284 | ⚠️ | **字号缩小** 32→28, 28→24 |
| 胶囊 198 | ❌ 211/76 | ❌ | @media 缺失 card 样式 |

---

## 四、新规范（字号禁止缩小）

### 4.1 标题改名

`模板选择` → `周模板`

### 4.2 圆形屏恢复字号

```css
@media (shape: circle) {
  .card-name { font-size: 32px; }   /* 从28px恢复 */
  .card-desc { font-size: 28px; }   /* 从24px恢复 */
}
```

验证 @ 32px: "Standard Block" = 229px < 284px ✅
验证 @ 28px: 284px / (28×0.55) ≈ 18 字母/行 ✅

### 4.3 胶囊屏完整适配

```css
@media (shape: capsule), (shape: pill-shaped) {
  .card { padding: 12px 10px; }
  .radio-dot { margin-right: 6px; }
  .card-name {
    font-size: 32px;
    lines: 1;
    text-overflow: ellipsis;
  }
  .card-desc {
    font-size: 28px;
    lines: 1;
    text-overflow: ellipsis;
  }
  .card-check { margin-left: 6px; }
}
```

验证胶囊屏：
- page padding: 10+10 → 改为 8+8 = 16px
- 内容区: 182px
- card padding: 10+10=20
- 内部: 162px
- radio-dot: 28+6=34
- card-check: 24+6=30
- card-info: 162-34-30 = **98px**

card-name "Standard Block" (32px) ≈ 229px → ellipsis "Stand..." ✅
card-desc 一行约 6字母 → ellipsis ✅

---

## 五、总结

| 改动 | 旧 | 新 |
|------|----|----|
| 标题 | 模板选择 | **周模板** |
| 圆形 card-name | 28px | **32px** (恢复) |
| 圆形 card-desc | 24px | **28px** (恢复) |
| 胶囊 @media | 仅header | 完整card适配 |
| 胶囊 card-name | 无保护 | lines:1 + ellipsis |
| **所有字号** | 圆形有缩小 | **全部保持默认** |