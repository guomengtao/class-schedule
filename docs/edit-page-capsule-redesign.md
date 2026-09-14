# 编辑课程页面 · 胶囊屏新设计规划

> **页面**：`src/pages/detail/detail.ux`（编辑课程页面）
> **基于规范**：[docs/胶囊屏UI规范.md](./胶囊屏UI规范.md) v1.1
> **制定日期**：2026-09-14
> **状态**：规划中

---

## 一、页面概述

编辑课程页面是一个 **4 步向导式表单**，用于编辑/修改已有课程信息：

| 步骤 | 名称 | 内容 |
|------|------|------|
| Step 1 | 选择课程 | 课程卡片 + 左右滑动箭头，选择课程名称 |
| Step 2 | 设置时间 | 开始/结束时间 stepper（小时/分钟分别调节） |
| Step 3 | 填写位置 | 文本输入框，输入教室位置（选填） |
| Step 4 | 确认保存 | 展示汇总信息，更新/删除按钮 |

**当前问题**：胶囊屏 `@media` 块仅适配了 header、back-btn、title、course-card 四个元素，其他大量元素（step-indicator、form-section、stepper、按钮等）**完全未适配**，在 192px 宽的胶囊屏上会严重溢出或不可用。

---

## 二、当前胶囊屏适配状态

### 2.1 已适配的元素（仅 4 个）

```css
@media (shape: capsule), (shape: pill-shaped) {
  .header { height: 48px; margin-bottom: 8px; }
  .back-btn { width: 48px; height: 40px; border-radius: 20px; font-size: 24px; }
  .title { font-size: 28px; }
  .course-card { width: 160px; max-width: 100%; }
}
```

### 2.2 缺失适配的元素（共 17 个）

| 元素 | 默认值（方屏） | 胶囊屏 160px 内容区能否容纳 | 风险 |
|------|---------------|---------------------------|------|
| `.edit-course-page` padding | `44px 10px 12px 10px` | 未在 capsule 块中覆盖 | 顶部被半圆遮挡 |
| `.step-indicator`（4 个点+3 条线） | dot:20px, line:40px | 4x20 + 3x40 + 6x4(margin) = **224px > 160px** | 溢出 |
| `.step-title` | `font-size: 34px` | 5 字= 170px > 160px | 可能换行 |
| `.step-hint` | `font-size: 28px` | 最多 5 字，勉强 | 边界 |
| `.swipe-arrow` | `50x50px` + 按钮 | 两个箭头+卡片+间距远超 160px | 溢出 |
| `.course-card` | `200px` 宽 | 160px OK（已适配） | 通过 |
| `.card-course-name` | `font-size: 36px` | 2字=72px OK | 通过(但字号偏大) |
| `.picker-label` | `font-size: 32px` | 2字=64px OK | 通过 |
| `.stepper-row`（标签+按钮+值+按钮） | 60+48+60+48+间距 ~ 240px | **远超 160px** | 溢出 |
| `.stepper-label` | `font-size: 28px`, `width: 60px` | — | 需调整 |
| `.stepper-btn` | `48x40px` | — | 需调整 |
| `.stepper-val` | `font-size: 40px`, `width: 60px` | 特大数字 | 需调整 |
| `.location-display` | `height: 56px` | — | 边界 |
| `.location-text` | `font-size: 32px` | 最多 5 字=160px 边界 | 需调整 |
| `.confirm-label` / `.confirm-value` | `font-size: 32px/34px` | — | 需调整 |
| `.prev-btn` / `.next-btn` / `.save-btn` | `width: 120px` | 2x120 + 间距 > 160px | 溢出 |
| `.manage-btn` | `width: 100px` | 与 next-btn 并排 100+120+间距 > 160px | 溢出 |
| `.delete-btn` | `width: 100%` | OK（全宽） | 通过 |
| `.header-trash-btn` | `40x40px` | OK | 通过 |

---

## 三、胶囊屏新设计方案

### 3.1 页面容器和顶部避让

```css
@media (shape: capsule), (shape: pill-shaped) {
  .edit-course-page {
    padding: 30px 6px 30px 6px;  /* 规范 v1.1：顶部 30px 避让半圆 */
    width: 100%;
    box-sizing: border-box;
  }
}
```

**说明**：
- `padding-top: 30px` 将内容推到 y=30 以下，避免顶部半圆遮挡
- `padding-left/right: 6px` 最大化利用 192px 宽度
- 内容区实际可用宽度 = 192 - 6 - 6 = **180px**（比规范默认的 160px 多 20px）

### 3.2 Header 区域（返回按钮 + 标题 + 删除按钮）

```
┌────────────────── 180px ──────────────────┐
│  [back]    编辑课程(4字)    [delete]       │
│  48px       28px x 4 = 112px    40px      │
│  48 + gap + 112 + gap + 40 ~ 180px        │
└────────────────────────────────────────────┘
```

```css
@media (shape: capsule), (shape: pill-shaped) {
  .header {
    height: 48px;
    margin-bottom: 6px;
    flex-direction: row;
    align-items: center;
  }
  .back-btn {
    width: 48px;
    height: 40px;
    border-radius: 20px;
    font-size: 24px;
    text-align: center;
    line-height: 40px;
    flex-shrink: 0;
  }
  .title {
    font-size: 28px;         /* 规范：列表主文字档 */
    line-height: 44px;
    text-align: center;
    flex: 1;
    lines: 1;
    margin: 0 4px;
  }
  .header-trash-btn {
    width: 40px;
    height: 40px;
    border-radius: 20px;      /* 全圆角，与胶囊屏呼应 */
    flex-shrink: 0;
  }
  .header-trash-icon {
    width: 22px;
    height: 22px;
  }
}
```

### 3.3 Step Indicator（4 步进度条）— 关键问题

方屏设计：4 个圆点(20px) + 3 条线(40px) + 间距 = 224px，胶囊屏只有 180px。

**方案**：缩小圆点和线

```
●──●──●──●
12+24+12+24+12+24+12 = 120px  通过，余量充足
```

```css
@media (shape: capsule), (shape: pill-shaped) {
  .step-indicator {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
  }
  .step-dot {
    width: 12px;
    height: 12px;
    border-radius: 6px;
  }
  .step-line {
    width: 24px;
    height: 3px;
    margin: 0 2px;
  }
}
```

计算验证：4x12 + 3x24 + 6x2(margin) = 48 + 72 + 12 = **132px**  在 180px 内通过

### 3.4 Step 1：课程选择卡片

方屏布局是 「back-arrow 卡片 next-arrow」三列并排，总宽 = 50 + 12 + 200 + 12 + 50 = **324px**，远超胶囊屏。

**方案**：缩小箭头和卡片

```
┌──────────── 180px ────────────┐
│  [arrow]  ┌──────────┐  [arrow]  │
│  36       │   语文    │   36      │
│           │  (100px)  │           │
│           └──────────┘            │
│       36 + 4 + 100 + 4 + 36       │
│       = 180px  通过              │
└───────────────────────────────────┘
```

```css
@media (shape: capsule), (shape: pill-shaped) {
  .swipe-arrow {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    font-size: 22px;
    font-weight: bold;
    text-align: center;
  }
  .course-card {
    width: 100px;              /* 从 200px 缩小 */
    height: 70px;              /* 从 120px 缩小 */
    padding: 10px;
    margin: 0 4px;
    border-radius: 12px;
    border-width: 2px;
  }
  .card-course-name {
    font-size: 28px;           /* 规范：列表主文字档，从 36px 缩小 */
  }
  .course-index-hint {
    font-size: 20px;           /* 规范：脚注档 */
    margin-bottom: 8px;
  }
}
```

**注意**：最长课程名如「道德与法治」4 字符，28px x 4 = 112px > 100px 卡片宽度。需要确保卡片内文字 `lines: 1; text-overflow: ellipsis;`。

### 3.5 Step 2：时间 Stepper — 关键问题

方屏 stepper-row 布局：label(60) + btn(48) + val(60) + btn(48) + 间距 ~ 240px

**方案**：将所有元素等比例缩小

```css
@media (shape: capsule), (shape: pill-shaped) {
  .step-title {
    font-size: 28px;           /* 规范：列表主文字档，从 34px 缩小 */
    margin-bottom: 6px;
    line-height: 36px;
    text-align: center;
  }
  .step-hint {
    font-size: 22px;           /* 规范：弹窗辅助档 */
    margin-bottom: 10px;
    text-align: center;
    line-height: 28px;
  }
  .step2-scroll {
    flex: 1;
    flex-direction: column;
  }
  .picker-label {
    font-size: 24px;           /* 规范：辅助说明档，从 32px 缩小 */
    margin-top: 8px;
    margin-bottom: 6px;
    text-align: center;
  }
  .stepper-row {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
  }
  .stepper-label {
    font-size: 22px;           /* 从 28px 缩小 */
    width: 42px;               /* 从 60px 缩小 */
    text-align: center;
  }
  .stepper-btn {
    width: 36px;               /* 从 48px 缩小 */
    height: 32px;              /* 从 40px 缩小 */
    border-radius: 16px;       /* 全圆角 */
    font-size: 22px;
    font-weight: bold;
    text-align: center;
  }
  .stepper-val {
    font-size: 30px;           /* 规范：页面标题档，从 40px 缩小 */
    font-weight: bold;
    width: 44px;               /* 从 60px 缩小 */
    text-align: center;
  }

  /* 开始/结束时间整体卡片减小 padding */
  .stepper-time {
    padding: 8px;
    margin-bottom: 6px;
    border-radius: 12px;
  }
}
```

**一行宽度计算**：42(label) + 36(btn) + 44(val) + 36(btn) + 间距(约 12px) = **170px** < 180px  通过

### 3.6 Step 3：位置输入

```css
@media (shape: capsule), (shape: pill-shaped) {
  .location-display {
    height: 48px;              /* 从 56px 缩小 */
    border-radius: 24px;       /* 全圆角 */
    padding: 0 12px;
    margin-bottom: 6px;
  }
  .location-text {
    font-size: 28px;           /* 规范：列表主文字档，从 32px 缩小 */
  }
  .location-cursor {
    font-size: 28px;
  }
  .optional-hint {
    font-size: 20px;           /* 规范：脚注档，从 24px 缩小 */
    margin-bottom: 10px;
  }
}
```

### 3.7 底部导航按钮（Step 1-4 共用）

方屏按钮「back 120px + next 120px」= 240px + 间距，远超胶囊屏。

```css
@media (shape: capsule), (shape: pill-shaped) {
  .step-nav {
    flex-direction: row;
    justify-content: space-between;
    margin-top: 12px;
  }
  .prev-btn {
    width: 72px;               /* 从 120px 缩小 */
    height: 48px;              /* 接近规范 52px */
    border-radius: 24px;       /* 全圆角 */
    font-size: 24px;           /* 规范：辅助说明档 */
    font-weight: bold;
    text-align: center;
  }
  .next-btn {
    width: 72px;
    height: 48px;
    border-radius: 24px;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  }
  .save-btn {
    width: 72px;
    height: 48px;
    border-radius: 24px;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  }
  .manage-btn {
    width: 72px;               /* 与 prev-btn 统一 */
    height: 48px;
    border-radius: 24px;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  }
}
```

**Step 1 按钮布局计算**：「管理(72) + 间距 + 下一步(72)」~ 160px < 180px  通过

### 3.8 Step 4：确认卡片

```css
@media (shape: capsule), (shape: pill-shaped) {
  .confirm-card {
    padding: 10px;
    margin-bottom: 14px;
    border-radius: 12px;
  }
  .confirm-label {
    font-size: 24px;           /* 规范：辅助说明档，从 32px 缩小 */
    font-weight: bold;
    margin-top: 6px;
    margin-bottom: 2px;
  }
  .confirm-value {
    font-size: 28px;           /* 规范：列表主文字档，从 34px 缩小 */
  }
  .delete-section {
    align-items: center;
    margin-top: 14px;
  }
  .delete-btn {
    width: 100%;
    height: 48px;
    border-radius: 24px;       /* 全圆角 */
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  }
}
```

---

## 四、字号对齐规范总览

| 元素 | 当前方屏 | 当前胶囊 | **新胶囊屏** | 规范档位 |
|------|----------|----------|-------------|----------|
| `.title`（页面标题） | 36px | 28px | **28px**  已对齐 | 列表主文字 |
| `.step-title` | 34px | 未设 | **28px** | 列表主文字 |
| `.step-hint` | 28px | 未设 | **22px** | 弹窗辅助 |
| `.card-course-name` | 36px | 未设 | **28px** | 列表主文字 |
| `.course-index-hint` | 24px | 未设 | **20px** | 脚注 |
| `.picker-label` | 32px | 未设 | **24px** | 辅助说明 |
| `.stepper-label` | 28px | 未设 | **22px** | 弹窗辅助 |
| `.stepper-btn` 字号 | 28px | 未设 | **22px** | 弹窗辅助 |
| `.stepper-val` | 40px | 未设 | **30px** | 页面标题 |
| `.location-text` | 32px | 未设 | **28px** | 列表主文字 |
| `.optional-hint` | 24px | 未设 | **20px** | 脚注 |
| `.confirm-label` | 32px | 未设 | **24px** | 辅助说明 |
| `.confirm-value` | 34px | 未设 | **28px** | 列表主文字 |
| 按钮文字 (.prev/.next/.save/.manage/.delete) | 28px | 未设 | **24px** | 辅助说明 |
| 键盘按钮 (.keyboard-done-btn) | 24px | 未设 | **22px** | 弹窗辅助 |

---

## 五、尺寸约束验证

### 5.1 最窄内容宽度检查（Step 2 stepper-row）

```
stepper-row: 42(label) + 4(gap) + 36(btn) + 4(gap) + 44(val) + 4(gap) + 36(btn)
= 42 + 36 + 44 + 36 + 12(gaps) = 170px
可用宽度: 180px
余量: 10px  通过
```

### 5.2 Step 1 箭头+卡片

```
36(arrow) + 4(margin) + 100(card) + 4(margin) + 36(arrow) = 180px  通过
```

### 5.3 高度估算

```
Step 2 典型场景:
Header:           48px
Step-indicator:   12px + 10(mb) = 22px
Step-title:       28px + 6(mb) = 34px
Step-hint:        22px + 10(mb) = 32px
Stepper rows:     2组 x (36+6) = 84px
Step-nav:         48px + 12(mt) = 60px
-----------------------------------------
合计 (Step 2):    ~ 280px
避让后内容区:     490 - 30 - 30 = 430px
余量:             430 - 280 = 150px  通过
```

### 5.4 Step 4 确认卡片

```
Header:           48px + 6(mb) = 54px
Step-indicator:   22px
Step-title:       34px
Confirm-card:     4组 label/value:
  每组: 24(+2mb) + 28(+4mb) = 58px, 4组 ~ 232px
  + card padding: 10x2 = 20px -> card ~ 252px
Step-nav:         60px
Delete-section:   48px + 14(mt) = 62px
-----------------------------------------
合计:             ~ 484px
  
超出 430px 可用区约 54px！

建议：Step 4 确认区域包裹在 scroll 中，或进一步收紧间距：
- 每组间距从 4+2=6px 压缩到 2+1=3px -> 每组 55px, 4组=220px
- card padding 从 10px 压缩到 6px -> card=232px
- 总高度: 54+22+34+232+60+62 = 464px，仍超出但接近
- 最终方案：确认卡片内容使用 scroll-y
```

---

## 六、弹窗/键盘适配

Step 3 有输入法键盘，需要检查：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .keyboard-area {
    flex-direction: column;
    margin-top: 8px;
  }
  .keyboard-close-row {
    flex-direction: row;
    justify-content: flex-end;
    margin-bottom: 3px;
  }
  .keyboard-done-btn {
    width: 48px;
    height: 30px;
    border-radius: 15px;       /* 全圆角 */
    font-size: 22px;
    font-weight: bold;
    text-align: center;
  }
}
```

---

## 七、实施优先级

### P0 — 布局溢出（必须立即修复）

| 序号 | 问题 | 影响 |
|------|------|------|
| 1 | `.step-indicator` 点+线超出 180px | 进度条显示异常，可能挤压其他元素 |
| 2 | `.swipe-arrow` + `.course-card` 超出 | Step 1 完全不可用 |
| 3 | `.stepper-row` 超出 180px | Step 2 时间选择不可用 |
| 4 | `.step-nav` 按钮超出 | 所有步骤的导航按钮显示异常 |

### P1 — 字号对齐规范

| 序号 | 元素 | 调整 |
|------|------|------|
| 5 | `.step-title` | 34 to 28px |
| 6 | `.step-hint` | 28 to 22px |
| 7 | `.card-course-name` | 36 to 28px |
| 8 | `.picker-label` | 32 to 24px |
| 9 | `.stepper-label` / `.stepper-btn` / `.stepper-val` | 调整 |
| 10 | `.location-text` | 32 to 28px |
| 11 | `.confirm-label` / `.confirm-value` | 32/34 to 24/28px |
| 12 | 所有按钮文字 | 28 to 24px |

### P2 — 视觉优化

| 序号 | 调整项 |
|------|--------|
| 13 | 所有按钮圆角改为全圆角（`border-radius: 50%` 或 `height/2`） |
| 14 | `.edit-course-page` 添加 `padding-top: 30px` 顶部避让 |
| 15 | 键盘按钮适配 |

---

## 八、注意事项

1. **课程名长度检查**：最长课程名「道德与法治」为 5 个汉字，在 28px 字号下占 28x5 = 140px，放在 100px 卡片内会溢出。需要确保卡片内文字 `lines: 1; text-overflow: ellipsis;`。

2. **Step 4 确认卡片高度**：4 组 label+value 在胶囊屏上总高度约 232px，加上 Header 等可能超出可用区。建议确认区域包裹在 scroll 中。

3. **键盘弹出后的布局**：Step 3 有输入法键盘，弹出后内容区高度大幅缩减，需要确保 `.location-display` 和导航按钮不被键盘遮挡。

4. **真实设备验证**：所有数值基于规范计算，最终效果需要真机（小米手环 9 胶囊屏）验证。

5. **按钮高度**：规范建议 52px，这里用 48px 作为折中（手环屏幕小，52px 两行按钮=104px 太占空间）。如果真机触摸体验不佳，可上调至 52px。

6. **删除操作交互**：删除按钮需要二次确认。当前 deleteConfirm 逻辑通过改变背景色提示，在胶囊屏小空间下可能需要额外弹窗确认。