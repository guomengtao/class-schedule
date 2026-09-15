# 测试区 胶囊屏 UI 开发规范

> 适用范围：测试区（test-area）及类似菜单列表页面  
> 优先级：胶囊屏尺寸为第一优先级，其次方屏、圆屏  
> 版本：v1.5.22

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
| 位置 | 左侧固定，`flex-shrink: 0` | 不随标题压缩 |

### 2.3 页面标题

```css
.title {
  font-size: 28px;
  line-height: 44px;
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

## 五、空状态提示

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
| 卡片圆角 | `10px` | |
| 文字字号 | `18px` | 比正常内容稍小 |
| 文字对齐 | `center` | 居中 |
| 颜色 | `theme.textMuted` | `#555566` |

---

## 六、胶囊屏隐藏区域规范

### 6.1 `.capsule-hide` 类

胶囊屏空间有限，需隐藏非关键信息。在 `@media (shape: capsule), (shape: pill-shaped)` 中使用：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .capsule-hide {
    display: none;
  }
}
```

### 6.2 测试区应隐藏的内容

| 隐藏内容 | 原因 |
|---------|------|
| 描述文字的副标题/备注 | 胶囊屏竖向空间有限 |
| 不必要的分隔线 | 减少视觉干扰 |
| 辅助图标 | 用文字替代 |
| `section-label` 的 padding-top | 压缩上方空白 |

### 6.3 隐藏原则

1. **保留核心功能**：名称必须有，描述可精简
2. **一行原则**：每个信息项尽量一行展示
3. **不隐藏导航**：返回按钮、标题必须保留

---

## 七、字号规范总表

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

---

## 八、间距规范总表

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

---

## 九、CSS 完整示例（测试区胶囊屏）

```css
/* ===== 默认样式（同时作为胶囊屏基础） ===== */
.page-root {
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 30px 12px 30px 12px;
}

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

.section-label {
  font-size: 20px;
  line-height: 28px;
  margin-bottom: 10px;
  margin-left: 4px;
  padding: 6px 4px;
}

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

## 十、开发检查清单

开发测试区新页面时，按以下清单逐项检查：

- [ ] 页面默认使用**胶囊屏 CSS 标准**为基准（`padding: 30px 12px`、header 48px、字号 20px/16px）
- [ ] 默认 CSS 写在 `@media` 外，作为基础样式
- [ ] header 使用 `.header` 容器 + `.back-btn` + `.title` 三段式布局
- [ ] 返回按钮宽 `48px` × 高 `40px`，圆角 `20px`，字号 `24px`
- [ ] 标题字号 `28px`，行高 `44px`，`flex: 1`，`lines: 1`
- [ ] 卡片圆角统一 `12px`，padding `14px 12px`
- [ ] 卡片名称 `20px`，描述 `16px`
- [ ] 非核心信息在 `@media (shape: capsule)` 中用 `.capsule-hide` 隐藏
- [ ] 方屏和圆屏适配写在对应的 `@media` 块中，不覆盖胶囊屏
- [ ] 卡片间用 `margin-bottom: 8px` 分隔
- [ ] 空状态提示用 `empty-box` + `empty-text`
- [ ] 所有颜色用 `theme.xxx` 变量，不硬编码颜色值

---

## 十一、常见错误

| 错误 | 正确做法 |
|------|---------|
| 默认样式按方屏写，胶囊屏用 @media 覆盖 | **默认样式按胶囊屏写**，方屏用 @media 覆盖 |
| 字号过大（> 24px 用于正文） | 胶囊屏正文控制在 16-20px |
| header 不设固定高度 | header 必须设 `height: 48px` |
| 返回按钮用 `width/height` 不统一 | 统一 `48px × 40px`，圆角 `20px` |
| 圆角使用不同值 | 统一 `12px`（卡片）、`20px`（按钮）、`10px`（空状态框） |
| 卡片内文字换行 | 用 `lines: 1` + `text-overflow: ellipsis` 限制 |