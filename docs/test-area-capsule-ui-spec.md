# 测试区 · 胶囊屏 UI 开发规范

> 适用范围：测试区（test-area）及所有子页面  
> 优先级：**胶囊屏尺寸为第一优先级**，其次方屏、圆屏  
> 版本：v2.0.0

---

## 目录

- [一、页面整体布局](#一页面整体布局)
- [二、顶部导航栏（Header）](#二顶部导航栏header)
- [三、分区标签（Section Label）](#三分区标签section-label)
- [四、卡片列表（Card List）](#四卡片列表card-list)
- [五、按钮规范（Button）](#五按钮规范button)
- [六、开关组件（Toggle Switch）](#六开关组件toggle-switch)
- [七、输入框（Input Field）](#七输入框input-field)
- [八、步进器（Stepper）](#八步进器stepper)
- [九、模态弹窗（Modal Dialog）](#九模态弹窗modal-dialog)
- [十、分隔线（Divider）](#十分隔线divider)
- [十一、滚动容器（Scroll）](#十一滚动容器scroll)
- [十二、空状态提示（Empty State）](#十二空状态提示empty-state)
- [十三、胶囊屏隐藏区域规范](#十三胶囊屏隐藏区域规范)
- [十四、颜色主题变量规范](#十四颜色主题变量规范)
- [十五、字号规范总表](#十五字号规范总表)
- [十六、间距规范总表](#十六间距规范总表)
- [十七、CSS 完整示例](#十七css-完整示例测试区胶囊屏)
- [十八、开发检查清单](#十八开发检查清单)
- [十九、常见错误](#十九常见错误)

---

## 一、页面整体布局

### 1.1 容器根节点

```css
/* 基础默认（胶囊屏优先） */
.page-root {
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 30px 12px 30px 12px;    /* 上 右 下 左 */
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| `flex-direction` | `column` | 纵向排列 |
| `width` | `100%` | 撑满宽度 |
| `height` | `100%` | 撑满高度 |
| `padding-top` | `30px` | 顶部留白（含状态栏区域） |
| `padding-bottom` | `30px` | 底部留白 |
| `padding-left/right` | `12px` | 左右留白（胶囊屏左右空间紧张） |

### 1.2 特殊页面 padding 变体

根据不同页面内容密度，允许以下变体：

| 变体 | padding 值 | 适用场景 |
|------|-----------|---------|
| 紧凑型 | `8px 6px 2px 6px` | 键盘输入页（chinese-input） |
| 标准型 | `30px 12px 30px 12px` | 列表页、设置页、测试区 |
| 宽松型 | `30px 16px 30px 16px` | 纯展示页 |

> **原则**：测试区使用**标准型**，`padding: 30px 12px 30px 12px`。

---

## 二、顶部导航栏（Header）

### 2.1 Header 容器

```css
.header {
  height: 48px;                   /* 固定高度 */
  margin-bottom: 8px;             /* 与下方内容间距 */
  flex-direction: row;            /* 水平排列 */
  align-items: center;            /* 垂直居中 */
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 高度 | `48px` | 固定，不可变 |
| 下边距 | `8px` | 与内容区域分隔 |
| 排列方向 | `row` | 水平排列 |
| 垂直对齐 | `center` | 内部元素垂直居中 |

### 2.2 返回按钮

```css
.back-btn {
  width: 48px;
  height: 40px;
  border-radius: 20px;            /* 胶囊形圆角 = height/2 */
  font-size: 24px;
  text-align: center;
  line-height: 40px;
  flex-shrink: 0;                 /* 不压缩 */
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 宽 | `48px` | 点击热区足够 |
| 高 | `40px` | 与标题视觉协调 |
| 圆角 | `20px` | 胶囊形，= height/2 |
| 字号 | `24px` | 在胶囊屏上清晰可辨 |
| 行高 | `40px` | 文字垂直居中 |
| 文字对齐 | `center` | 水平居中 |
| 位置 | 左侧固定，`flex-shrink: 0` | 不随标题压缩 |

### 2.3 页面标题

```css
.title {
  font-size: 28px;
  line-height: 44px;
  font-weight: bold;
  text-align: center;
  flex: 1;                        /* 占据剩余空间 */
  lines: 1;                       /* 单行，超出隐藏 */
  margin: 0 4px;                  /* 左右与按钮保持间距 */
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 字号 | `28px` | 胶囊屏标题标准字号 |
| 行高 | `44px` | 垂直居中在 48px header 内 |
| 字重 | `bold` | 加粗突出 |
| 对齐 | `center` | 居中显示 |
| `lines` | `1` | 单行截断 |
| `flex` | `1` | 自动填充中间空间 |
| `margin` | `0 4px` | 左右各留 4px 间距 |

---

## 三、分区标签（Section Label）

用于卡片区域上方的文字说明。

```css
.section-label {
  font-size: 20px;
  line-height: 28px;
  margin-bottom: 10px;
  margin-left: 4px;
  padding: 6px 4px;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 字号 | `20px` | 比标题小，起辅助说明作用 |
| 行高 | `28px` | 保持可读性 |
| 下边距 | `10px` | 与卡片区域分隔 |
| 左边距 | `4px` | 与卡片对齐 |
| 颜色 | `theme.textSecondary` | 次要用色 `#888899` |

---

## 四、卡片列表（Card List）

### 4.1 卡片容器

```css
.list {
  flex-direction: column;
  /* 不使用 flex: 1，不撑满剩余空间 */
}
```

### 4.2 单个卡片

```css
.card {
  flex-direction: row;
  align-items: center;
  border-radius: 12px;            /* 胶囊屏统一圆角 */
  padding: 14px 12px;             /* 上下14px，左右12px */
  margin-bottom: 8px;             /* 卡片间距 */
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 方向 | `row` | 水平排列 |
| 圆角 | `12px` | 项目统一圆角规范 |
| padding 上下 | `14px` | 足够的触摸区域 |
| padding 左右 | `12px` | 与页面左右边距一致 |
| 下边距 | `8px` | 卡片间距 |
| 背景 | `theme.card` | `#16213e` |
| 最小触摸高度 | `56px`（14+28+14） | 满足触控热区要求 |

### 4.3 卡片内文字

```css
.card-name {
  font-size: 20px;
  line-height: 28px;
  flex-shrink: 0;                 /* 名称不压缩 */
  margin-right: 8px;              /* 与描述的间距 */
}

.card-desc {
  font-size: 16px;
  line-height: 24px;
  flex: 1;                        /* 描述文字占据剩余空间 */
  text-overflow: ellipsis;        /* 超出省略 */
  lines: 1;
}

.card-arrow {
  font-size: 20px;
  line-height: 28px;
  flex-shrink: 0;
  margin-left: 8px;
}
```

| 元素 | 字号 | 行高 | 说明 |
|------|------|------|------|
| 卡片名称 | `20px` | `28px` | 主要内容，加粗可选 |
| 卡片描述 | `16px` | `24px` | 次要信息，单行 |
| 箭头符号 | `20px` | `28px` | 右侧指示符 |

---

## 五、按钮规范（Button）

### 5.1 主操作按钮（Primary）

```css
.btn-primary {
  width: 100%;
  height: 44px;
  border-radius: 22px;            /* 完全圆角 = height/2 */
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  line-height: 44px;
  border-width: 0;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 高 | `44px` | 足够触摸 |
| 圆角 | `22px` | 胶囊形全圆角 |
| 字号 | `20px` | 清晰可读 |
| 字重 | `bold` | 突出主操作 |
| 宽度 | `100%` 或固定值 | 全宽或固定 |

### 5.2 次要按钮（Secondary）

```css
.btn-secondary {
  width: 100%;
  height: 40px;
  border-radius: 20px;
  font-size: 18px;
  text-align: center;
  line-height: 40px;
  border-width: 0;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 高 | `40px` | 比主按钮稍小 |
| 圆角 | `20px` | 胶囊形 |
| 字号 | `18px` | 比主按钮小一级 |

### 5.3 危险按钮（Danger）

```css
.btn-danger {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  font-size: 18px;
  text-align: center;
  line-height: 36px;
  border-width: 0;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 高 | `36px` | 较小 |
| 圆角 | `10px` | 小圆角 |
| 字号 | `18px` | — |

### 5.4 小型操作按钮

用于卡片内或行内操作。

```css
.btn-sm {
  height: 30px;
  border-radius: 6px;
  font-size: 18px;
  text-align: center;
  line-height: 30px;
  padding: 0 12px;
}
```

### 5.5 按钮层级总结

| 类型 | 高度 | 圆角 | 字号 | 用途 |
|------|------|------|------|------|
| 主按钮 `.btn-primary` | `44px` | `22px` | `20px` | 主要操作 |
| 次要按钮 `.btn-secondary` | `40px` | `20px` | `18px` | 辅助操作 |
| 危险按钮 `.btn-danger` | `36px` | `10px` | `18px` | 重置/删除 |
| 小按钮 `.btn-sm` | `30px` | `6px` | `18px` | 行内操作 |

---

## 六、开关组件（Toggle Switch）

### 6.1 轨道（Track）

```css
.switch-track {
  width: 44px;
  height: 24px;
  border-radius: 12px;            /* height/2，全圆角 */
  position: relative;
  flex-shrink: 0;
}
```

### 6.2 滑块（Thumb）

```css
.switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 10px;            /* 圆形 */
  position: absolute;
  top: 2px;                       /* (track.height - thumb.height) / 2 */
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 轨道宽 | `44px` | — |
| 轨道高 | `24px` | — |
| 轨道圆角 | `12px` | 全圆角 |
| 滑块尺寸 | `20px × 20px` | 圆形 |
| 滑块偏移 | `top: 2px` | 居中于轨道 |

---

## 七、输入框（Input Field）

```css
.input-text {
  font-size: 16px;
  line-height: 24px;
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 字号 | `16px` | — |
| 行高 | `24px` | — |
| 内边距 | `8px 12px` | — |
| 圆角 | `8px` | 小圆角 |

> **注意**：胶囊屏上输入框尽量使用小字号（16px），避免键盘弹出后遮挡内容。

---

## 八、步进器（Stepper）

用于数值增减控制，如时间设置中的小时、分钟选择。

```css
.stepper-row {
  flex-direction: row;
  align-items: center;
  padding: 8px 0;
}

.stepper-label {
  font-size: 18px;
  line-height: 26px;
  margin-right: 12px;
}

.stepper-btn {
  width: 36px;
  height: 36px;
  border-radius: 18px;            /* 圆形按钮 */
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  line-height: 36px;
}

.stepper-val {
  font-size: 22px;
  font-weight: bold;
  width: 48px;
  text-align: center;
  line-height: 36px;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 标签字号 | `18px` | — |
| 按钮尺寸 | `36px × 36px` | 圆形 |
| 按钮圆角 | `18px` | 全圆角 |
| 按钮字号 | `20px` | + / - 符号 |
| 数值字号 | `22px` | 粗体居中 |
| 数值宽度 | `48px` | 固定，防止数字变化时抖动 |

---

## 九、模态弹窗（Modal Dialog）

### 9.1 遮罩层

```css
.modal-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);  /* 半透明遮罩 */
  align-items: center;
  justify-content: center;
}
```

### 9.2 弹窗卡片

```css
.modal-card {
  width: 85%;
  max-width: 320px;
  border-radius: 14px;
  padding: 20px 16px;
  flex-direction: column;
}

.modal-title {
  font-size: 24px;
  line-height: 32px;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}

.modal-desc {
  font-size: 20px;
  line-height: 28px;
  margin-bottom: 16px;
  text-align: center;
}

.modal-btn-row {
  flex-direction: row;
  justify-content: space-between;
}

.modal-btn-primary {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  line-height: 44px;
  margin: 0 4px;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 弹窗宽度 | `85%` / `max-width: 320px` | 自适应，有上限 |
| 弹窗圆角 | `14px` | 比卡片略大 |
| 弹窗 padding | `20px 16px` | — |
| 标题字号 | `24px` | — |
| 标题行高 | `32px` | — |
| 描述字号 | `20px` | — |
| 描述行高 | `28px` | — |
| 按钮高度 | `44px` | 与主按钮一致 |
| 按钮圆角 | `22px` | 胶囊形 |

---

## 十、分隔线（Divider）

```css
.divider {
  height: 1px;
  margin: 0 16px;                   /* 与卡片内容对齐 */
}

.row-divider {
  height: 1px;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 高度 | `1px` | 细线 |
| 颜色 | `theme.border` | `#0f3460` |
| 外边距 | `0 16px` | 缩进分隔，与卡片文字对齐 |

> **胶囊屏原则**：优先隐藏不必要的分隔线（用 `.capsule-hide`），仅在确实需要视觉分组时保留。

---

## 十一、滚动容器（Scroll）

```css
.scroll-container {
  flex: 1;
  flex-direction: column;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| `flex` | `1` | 占据剩余空间 |
| `flex-direction` | `column` | 纵向滚动 |

> **原则**：胶囊屏纵向空间有限，卡片列表超过一屏时必须放在 scroll 容器内。滚动条在胶囊屏下尽量隐藏以节省横向空间。

---

## 十二、空状态提示（Empty State）

无内容时展示的空状态卡片。

```css
.empty-box {
  border-radius: 10px;
  padding: 20px;
  align-items: center;            /* 居中 */
}

.empty-text {
  font-size: 18px;
  line-height: 26px;
  text-align: center;
}
```

| 属性 | 标准值 | 说明 |
|------|--------|------|
| 卡片圆角 | `10px` | — |
| 文字字号 | `18px` | 比正常内容稍小 |
| 文字对齐 | `center` | 居中 |
| 颜色 | `theme.textMuted` | `#555566` |

---

## 十三、胶囊屏隐藏区域规范

### 13.1 `.capsule-hide` 类

胶囊屏空间有限，需隐藏非关键信息。在 `@media (shape: capsule), (shape: pill-shaped)` 中使用：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .capsule-hide {
    display: none;
  }
}
```

### 13.2 测试区应隐藏的内容

| 隐藏内容 | 原因 |
|---------|------|
| 描述文字的副标题/备注 | 胶囊屏竖向空间有限 |
| 不必要的分隔线 | 减少视觉干扰 |
| 辅助图标 | 用文字替代 |
| `section-label` 的 padding-top | 压缩上方空白 |
| 卡片内第三行文字 | 保持卡片一行高度 |
| 预览/装饰元素 | 非核心功能 |

### 13.3 隐藏原则

1. **保留核心功能**：名称必须有，描述可精简
2. **一行原则**：每个信息项尽量一行展示
3. **不隐藏导航**：返回按钮、标题必须保留
4. **隐藏装饰优先**：先隐藏装饰性元素，再隐藏次要信息

### 13.4 隐藏层级（从低到高）

| 优先级 | 内容 | 隐藏策略 |
|--------|------|---------|
| P0 不可隐藏 | 返回按钮、标题、核心名称 | 始终显示 |
| P1 可压缩 | 描述文字、提示文字 | 胶囊屏下压缩字号或行数 |
| P2 可隐藏 | 副标题、备注、分隔线 | `.capsule-hide` |
| P3 完全隐藏 | 装饰图标、banner、预览 | `.capsule-hide` |

---

## 十四、颜色主题变量规范

所有颜色必须使用 `theme.xxx` 变量，**禁止硬编码颜色值**。

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `theme.bg` | `#1a1a2e` | 页面背景 |
| `theme.card` | `#16213e` | 卡片/容器背景 |
| `theme.cardLight` | `#0f3460` | 卡片浅色变体 / 次要按钮 |
| `theme.accent` | `#7ec8e3` | 强调色 / 主按钮 / 返回按钮 |
| `theme.text` | `#ffffff` | 主要文字 |
| `theme.textSecondary` | `#888899` | 次要文字 / 分区标签 |
| `theme.textMuted` | `#555566` | 弱化文字 / 描述 / 箭头 |
| `theme.border` | `#0f3460` | 分隔线 / 边框 |

### 使用示例

```html
<!-- 正确 -->
<div style="background-color: {{ theme.bg }}">
  <text style="color: {{ theme.text }}">标题</text>
  <text style="color: {{ theme.textSecondary }}">副标题</text>
</div>

<!-- 错误 - 禁止 -->
<div style="background-color: #1a1a2e">
  <text style="color: #ffffff">标题</text>
</div>
```

---

## 十五、字号规范总表

| 用途 | 默认字号 | 行高 | 胶囊屏字号 | 胶囊屏行高 | 说明 |
|------|---------|------|-----------|-----------|------|
| 页面标题 | `28px` | `38px` | `28px` | `44px` | header 内居中对齐 |
| 返回按钮 | `18px` | `36px` | `24px` | `40px` | 箭头/文字按钮 |
| 分区标签 | `22px` | `30px` | `20px` | `28px` | 卡片区域标题 |
| 卡片名称 | `24px` | `32px` | `20px` | `28px` | 主要文字 |
| 卡片描述 | `18px` | `28px` | `16px` | `24px` | 次要信息 |
| 空状态文字 | `22px` | `30px` | `18px` | `26px` | 无内容提示 |
| 箭头符号 | `24px` | — | `20px` | `28px` | 右侧箭头 |
| 模态标题 | `36px` | — | `24px` | `32px` | 弹窗标题 |
| 模态描述 | `28px` | `38px` | `20px` | `28px` | 弹窗内容 |
| 主按钮文字 | `22px` | — | `20px` | `44px` | 按钮文字 |
| 次要按钮文字 | `20px` | — | `18px` | `40px` | 辅助按钮 |
| 输入框文字 | `18px` | — | `16px` | `24px` | 输入内容 |
| 步进器数值 | `24px` | — | `22px` | `36px` | 数字显示 |
| 步进器标签 | `20px` | — | `18px` | `26px` | 如"小时""分钟" |
| 开关旁文字 | `24px` | — | `18px` | `26px` | 开关标签 |

---

## 十六、间距规范总表

| 元素 | 用途 | 胶囊屏值 | 默认值 |
|------|------|---------|--------|
| `.page-root` | 页面 padding | `30px 12px 30px 12px` | `44px 8px 10px 8px` |
| `.header` | 下边距 | `8px` | `10px` |
| `.header` | 高度 | `48px` | 自适应 |
| `.back-btn` | 宽 × 高 | `48px × 40px` | `48px × 36px` |
| `.back-btn` | 圆角 | `20px` | `8px` |
| `.title` | 左右 margin | `0 4px` | `margin-left: 10px` |
| `.section-label` | 下边距 | `10px` | `10px` |
| `.section-label` | padding | `6px 4px` | 无 |
| `.card` | padding | `14px 12px` | `14px 12px` |
| `.card` | 圆角 | `12px` | `10px` |
| `.card` | 下边距 | `8px` | `8px` |
| `.card-name` | 右 margin | `8px` | `8px` |
| `.card-arrow` | 左 margin | `8px` | `8px` |
| `.btn-primary` | 高度 | `44px` | `48px` |
| `.btn-primary` | 圆角 | `22px` | `10px` |
| `.btn-secondary` | 高度 | `40px` | `44px` |
| `.btn-secondary` | 圆角 | `20px` | `8px` |
| `.switch-track` | 尺寸 | `44px × 24px` | `44px × 24px` |
| `.switch-thumb` | 尺寸 | `20px × 20px` | `20px × 20px` |
| `.modal-card` | 圆角 | `14px` | `12px` |
| `.modal-card` | padding | `20px 16px` | `22px 18px` |
| `.divider` | 高度 | `1px` | `1px` |
| `.divider` | 左右 margin | `0 16px` | `0` |
| `.stepper-btn` | 尺寸 | `36px × 36px` | `40px × 40px` |
| `.stepper-btn` | 圆角 | `18px` | `20px` |
| `.input-text` | padding | `8px 12px` | `10px 14px` |
| `.input-text` | 圆角 | `8px` | `8px` |
| `.empty-box` | padding | `20px` | `24px` |

---

## 十七、CSS 完整示例（测试区胶囊屏）

```css
/* ===== 默认样式（同时作为胶囊屏基础） ===== */
.page-root {
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 30px 12px 30px 12px;
}

/* ---- Header ---- */
.header {
  height: 48px;
  margin-bottom: 8px;
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
  font-size: 28px;
  line-height: 44px;
  text-align: center;
  flex: 1;
  lines: 1;
  margin: 0 4px;
}

/* ---- Section Label ---- */
.section-label {
  font-size: 20px;
  line-height: 28px;
  margin-bottom: 10px;
  margin-left: 4px;
  padding: 6px 4px;
}

/* ---- Card List ---- */
.list {
  flex-direction: column;
}

.card {
  flex-direction: row;
  align-items: center;
  border-radius: 12px;
  padding: 14px 12px;
  margin-bottom: 8px;
}

.card-name {
  font-size: 20px;
  line-height: 28px;
  flex-shrink: 0;
  margin-right: 8px;
}

.card-desc {
  font-size: 16px;
  line-height: 24px;
  flex: 1;
  text-overflow: ellipsis;
  lines: 1;
}

.card-arrow {
  font-size: 20px;
  line-height: 28px;
  flex-shrink: 0;
  margin-left: 8px;
}

/* ---- Buttons ---- */
.btn-primary {
  width: 100%;
  height: 44px;
  border-radius: 22px;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  line-height: 44px;
}

.btn-secondary {
  width: 100%;
  height: 40px;
  border-radius: 20px;
  font-size: 18px;
  text-align: center;
  line-height: 40px;
}

.btn-danger {
  width: 100%;
  height: 36px;
  border-radius: 10px;
  font-size: 18px;
  text-align: center;
  line-height: 36px;
}

/* ---- Toggle Switch ---- */
.switch-track {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  position: relative;
  flex-shrink: 0;
}

.switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  position: absolute;
  top: 2px;
}

/* ---- Input ---- */
.input-text {
  font-size: 16px;
  line-height: 24px;
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
}

/* ---- Stepper ---- */
.stepper-row {
  flex-direction: row;
  align-items: center;
  padding: 8px 0;
}

.stepper-label {
  font-size: 18px;
  line-height: 26px;
  margin-right: 12px;
}

.stepper-btn {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  line-height: 36px;
}

.stepper-val {
  font-size: 22px;
  font-weight: bold;
  width: 48px;
  text-align: center;
  line-height: 36px;
}

/* ---- Modal ---- */
.modal-overlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.modal-card {
  width: 85%;
  border-radius: 14px;
  padding: 20px 16px;
  flex-direction: column;
}

.modal-title {
  font-size: 24px;
  line-height: 32px;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}

.modal-desc {
  font-size: 20px;
  line-height: 28px;
  margin-bottom: 16px;
  text-align: center;
}

/* ---- Divider ---- */
.divider {
  height: 1px;
  margin: 0 16px;
}

/* ---- Empty State ---- */
.empty-box {
  border-radius: 10px;
  padding: 20px;
  align-items: center;
}

.empty-text {
  font-size: 18px;
  line-height: 26px;
  text-align: center;
}

/* ---- Scroll ---- */
.scroll-container {
  flex: 1;
  flex-direction: column;
}

/* ===== 胶囊屏隐藏规则 ===== */
@media (shape: capsule), (shape: pill-shaped) {
  .capsule-hide {
    display: none;
  }
}

/* ===== 方屏幕适配 ===== */
@media (shape: rect) {
  .page-root {
    padding: 44px 10px 12px 10px;
  }
  .header {
    height: auto;
    margin-bottom: 14px;
  }
  .back-btn {
    width: 56px;
    height: 40px;
    border-radius: 8px;
    font-size: 22px;
    line-height: 40px;
  }
  .title {
    font-size: 34px;
    line-height: 44px;
    margin-left: 10px;
    margin-right: 0;
  }
  .section-label {
    font-size: 22px;
    line-height: 30px;
  }
  .card {
    padding: 18px 16px;
    margin-bottom: 12px;
    border-radius: 10px;
  }
  .card-name {
    font-size: 28px;
    line-height: 32px;
  }
  .card-desc {
    font-size: 22px;
    line-height: 28px;
  }
  .card-arrow {
    font-size: 24px;
  }
  .empty-text {
    font-size: 22px;
  }
  .btn-primary {
    height: 48px;
    font-size: 22px;
  }
  .modal-title {
    font-size: 28px;
  }
  .modal-desc {
    font-size: 22px;
  }
  .switch-track {
    width: 52px;
    height: 28px;
    border-radius: 14px;
  }
  .switch-thumb {
    width: 24px;
    height: 24px;
    border-radius: 12px;
  }
}

/* ===== 圆形屏幕适配 ===== */
@media (shape: circle) {
  .page-root {
    padding: 44px 36px 44px 36px;
  }
  .header {
    margin-bottom: 14px;
  }
  .back-btn {
    width: 64px;
    height: 40px;
    font-size: 24px;
  }
  .title {
    font-size: 30px;
    margin-left: 12px;
  }
  .section-label {
    font-size: 24px;
  }
  .card {
    padding: 16px 14px;
    margin-bottom: 10px;
  }
  .card-name {
    font-size: 28px;
  }
  .card-desc {
    font-size: 22px;
  }
}
```

---

## 十八、开发检查清单

开发测试区新页面时，按以下清单逐项检查：

### 布局
- [ ] 页面默认使用**胶囊屏 CSS 标准**为基准（`padding: 30px 12px`、header 48px、字号 20px/16px）
- [ ] 默认 CSS 写在 `@media` 外，作为基础样式
- [ ] header 使用 `.header` 容器 + `.back-btn` + `.title` 三段式布局

### 导航
- [ ] 返回按钮宽 `48px` × 高 `40px`，圆角 `20px`，字号 `24px`
- [ ] 标题字号 `28px`，行高 `44px`，`flex: 1`，`lines: 1`

### 卡片
- [ ] 卡片圆角统一 `12px`，padding `14px 12px`
- [ ] 卡片名称 `20px`，描述 `16px`
- [ ] 卡片间用 `margin-bottom: 8px` 分隔

### 按钮
- [ ] 主按钮高 `44px`，圆角 `22px`，字号 `20px`
- [ ] 次要按钮高 `40px`，圆角 `20px`，字号 `18px`

### 组件
- [ ] 开关轨道 `44px × 24px`，滑块 `20px × 20px`
- [ ] 步进器按钮 `36px × 36px`，圆角 `18px`
- [ ] 输入框字号 `16px`，padding `8px 12px`

### 弹窗
- [ ] 弹窗宽 `85%`，圆角 `14px`
- [ ] 弹窗标题 `24px`，描述 `20px`

### 隐藏
- [ ] 非核心信息在 `@media (shape: capsule)` 中用 `.capsule-hide` 隐藏
- [ ] 多余分隔线加 `.capsule-hide`

### 适配
- [ ] 方屏和圆屏适配写在对应的 `@media` 块中，不覆盖胶囊屏
- [ ] 所有颜色用 `theme.xxx` 变量，不硬编码颜色值

### 其他
- [ ] 空状态提示用 `empty-box` + `empty-text`
- [ ] 长列表放在 scroll 容器内

---

## 十九、常见错误

| 错误 | 正确做法 |
|------|---------|
| 默认样式按方屏写，胶囊屏用 @media 覆盖 | **默认样式按胶囊屏写**，方屏用 @media 覆盖 |
| 字号过大（> 24px 用于正文） | 胶囊屏正文控制在 16-20px |
| header 不设固定高度 | header 必须设 `height: 48px` |
| 返回按钮用 `width/height` 不统一 | 统一 `48px × 40px`，圆角 `20px` |
| 圆角使用不同值 | 统一 `12px`（卡片）、`22px`（主按钮）、`20px`（次要按钮）、`10px`（空状态框） |
| 卡片内文字换行 | 用 `lines: 1` + `text-overflow: ellipsis` 限制 |
| 颜色硬编码 | 必须用 `{{ theme.xxx }}` 变量 |
| 忘记添加 `.capsule-hide` | 非核心信息一律加，胶囊屏下自动隐藏 |
| 方屏样式覆盖胶囊屏 | 方屏样式放 `@media (shape: rect)` 内 |
| 弹窗宽度写死 | 用百分比 `85%` + `max-width` 限制 |
| 分隔线未缩进 | 用 `margin: 0 16px` 与卡片文字对齐 |
| 步进器数值不设固定宽度 | 设 `width: 48px` 防止数字变化时抖动 |