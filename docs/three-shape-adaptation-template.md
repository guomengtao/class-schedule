# 课程管理页面 — 三形屏幕适配参考模版

## 1. 页面结构总览

```
┌─ .manager-page ──────────────────────────────────────────┐
│  .back-header                                              │
│  ┌──────┬──────────────────┬──────────┬──────────┐       │
│  │ ◀ 返回 │   课程管理 (flex:1)  │  8门      │ + 添加  │       │
│  └──────┴──────────────────┴──────────┴──────────┘       │
│                                                            │
│  .course-list-scroll (flex:1, scroll-y)                    │
│  ┌─ .course-item ──────────────────────────────────────┐  │
│  │  (1) │ 语文          │ 编辑 │ 删除 │                 │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─ .course-item ──────────────────────────────────────┐  │
│  │  (2) │ 数学          │ 编辑 │ 删除 │                 │  │
│  └─────────────────────────────────────────────────────┘  │
│  ...                                                       │
└────────────────────────────────────────────────────────────┘
```

| 组件 | CSS 类名 | 默认尺寸 | 作用 |
|:---|:---|:---|:---|
| 根容器 | `.manager-page` | `padding: 10px` | 页面整体布局 |
| 顶栏 | `.back-header` | `margin-bottom: 10px` | 返回按钮 + 标题 + 添加按钮 |
| 返回按钮 | `.back-btn` | `40×34px` | 返回上一页 |
| 标题 | `.header-title` | `font-size: 18px` | 页面标题 "课程管理" |
| 课程计数 | `.header-count` | `font-size: 13px` | 显示 "N门" |
| 添加按钮 | `.add-btn` | `68×34px` | 添加新课程 |
| 列表容器 | `.course-list-scroll` | `flex: 1` | 可滚动列表 |
| 课程项 | `.course-item` | `padding: 10px` | 单行课程卡片 |
| 序号圆圈 | `.item-index` | `30×30px` | 圆形序号标记 |
| 课程名 | `.course-name` | `font-size: 16px` | 课程名称 |
| 编辑按钮 | `.edit-btn` | `46×32px` | 编辑课程 |
| 删除按钮 | `.delete-btn` | `46×32px` | 删除课程 |

---

## 2. 三种屏幕形状对比

```
圆形 (circle)             方形 (rect)              胶囊形 (pill-shaped)
╭──────────────╮        ┌──────────┐        ╭──────────────────╮
│              │        │          │        │                  │
│   内容区域    │        │ 内容区域  │        │    内容区域       │
│              │        │          │        │                  │
╰──────────────╯        └──────────┘        ╰──────────────────╯
四角裁切严重             宽度极窄              左右圆角裁切
466×466 ≈ 194px可用     194×368               194×368（类似方形）
```

| 属性 | 圆形 (circle) | 方形 (rect) | 胶囊形 (pill-shaped) |
|:---|:---|:---|:---|
| 典型尺寸 | 466×466 | 194×368 | 194×368 |
| 有效水平宽度 | 466px（中间） | 194px | 194px |
| 失效水平宽度 | 四角 ~96px | 无 | 左右圆角 ~20px |
| 垂直空间 | 充足 | 充足 | 充足 |
| 核心问题 | 四角裁切 | 宽度太窄 | 宽度窄 + 圆角裁切 |
| 策略 | 大量内边距 | 压缩所有元素 | 参考方形 + 两侧微留边距 |

---

## 3. 默认样式（基准）

```css
.manager-page {
  flex-direction: column;
  padding: 10px;
  height: 100%;
}

.back-header {
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.back-btn {
  width: 40px;
  height: 34px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  flex-shrink: 0;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  margin-left: 8px;
  flex: 1;
}

.header-count {
  font-size: 13px;
  margin-right: 8px;
}

.add-btn {
  width: 68px;
  height: 34px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: bold;
  text-align: center;
  flex-shrink: 0;
}

.course-list-scroll {
  flex: 1;
  height: 100%;
  flex-direction: column;
}

.course-item {
  flex-direction: row;
  align-items: center;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 6px;
}

.item-index {
  width: 30px;
  height: 30px;
  border-radius: 15px;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  margin-right: 10px;
}

.index-text {
  font-size: 13px;
  font-weight: bold;
  text-align: center;
}

.course-name {
  flex: 1;
  font-size: 16px;
  font-weight: bold;
  max-lines: 1;
  text-overflow: ellipsis;
}

.edit-btn {
  width: 46px;
  height: 32px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  flex-shrink: 0;
  margin-left: 6px;
}

.delete-btn {
  width: 46px;
  height: 32px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  flex-shrink: 0;
  margin-left: 4px;
}
```

---

## 4. 圆形屏适配 (`@media (shape: circle)`)

### 4.1 设计原理

```
圆形屏 466×466 可视区域分析:

         ╱ ─ ─ 96px 裁切区 ─ ─ ╲
        │                        │
        │    ┌─ 安全区域 ─┐      │
        │    │            │      │
        │    │  内容区域   │      │
        │    │            │      │
        │    └────────────┘      │
        │                        │
         ╲ ─ ─ 96px 裁切区 ─ ─ ╱

关键数值:
- 圆形直径: 466px
- 内接正方形边长: 466/√2 ≈ 330px
- 四角裁切区: (466-330)/2 ≈ 68px
- 推荐 padding-top/bottom: 44px (留安全余量)
- 推荐 padding-left/right: 36px (从 20px 增加到 36px，确保返回按钮可见)
```

### 4.2 完整 CSS

```css
@media (shape: circle) {
  /* ===== 第一层：根容器安全边距 ===== */
  .manager-page {
    padding: 44px 36px 44px 36px;
  }

  /* ===== 第二层：顶栏居中 ===== */
  .back-header {
    margin-bottom: 8px;
    padding: 0 20px;
    justify-content: center;       /* 关键：返回按钮从左上角移到中间 */
  }

  /* ===== 第三层：组件尺寸微调 ===== */
  .back-btn {
    width: 36px;
    height: 30px;
    font-size: 13px;
  }

  .header-title {
    font-size: 16px;
    margin-left: 6px;
  }

  .header-count {
    font-size: 12px;
  }

  .add-btn {
    width: 56px;
    height: 30px;
    font-size: 12px;
  }

  /* ===== 第四层：列表项紧凑化 ===== */
  .course-item {
    padding: 8px;
    margin-bottom: 4px;
  }

  .item-index {
    width: 26px;
    height: 26px;
    border-radius: 13px;
    margin-right: 8px;
  }

  .index-text {
    font-size: 12px;
  }

  .course-name {
    font-size: 14px;
  }

  .edit-btn {
    width: 40px;
    height: 28px;
    font-size: 11px;
  }

  .delete-btn {
    width: 40px;
    height: 28px;
    font-size: 11px;
  }
}
```

### 4.3 尺寸对比表

| 组件 | 默认 | 圆形 | 变化 |
|:---|:---|:---|:---|
| 根 padding | `10px` | `44px 36px` | +340% |
| 返回按钮 | `40×34px` | `36×30px` | -10% / -12% |
| 标题字号 | `18px` | `16px` | -11% |
| 添加按钮 | `68×34px` | `56×30px` | -18% / -12% |
| 课程项 padding | `10px` | `8px` | -20% |
| 序号圆圈 | `30×30px` | `26×26px` | -13% |
| 编辑/删除按钮 | `46×32px` | `40×28px` | -13% |

---

## 5. 方形屏适配 (`@media (shape: rect)`)

### 5.1 设计原理

```
方形屏 194×368 宽度分析:

┌──────────────────────┐
│ 6px                  │
│ ┌──────────────────┐ │
│ │                  │ │
│ │  ◀ 课程管理 N门 + │ │  ← 194-2×6=182px 可用宽度
│ │                  │ │
│ │  (1) 语文 编辑 删除│ │
│ │  ...             │ │
│ │                  │ │
│ └──────────────────┘ │
│ 6px                  │
└──────────────────────┘

关键数值:
- 屏幕宽度: 194px
- padding: 6px → 可用宽度 182px
- 返回按钮: 32px + 标题: flex:1 + 计数: 24px + 添加: 52px ≈ 182px ✓
- 课程项: 序号(24px) + 间距(6px) + 名称(flex:1) + 编辑(36px) + 删除(36px) ≈ 182px ✓
```

### 5.2 完整 CSS

```css
@media (shape: rect) {
  /* ===== 第一层：根容器最小边距 ===== */
  .manager-page {
    padding: 6px;
  }

  /* ===== 第二层：顶栏紧凑化 ===== */
  .back-header {
    margin-bottom: 6px;
  }

  /* ===== 第三层：组件尺寸大幅缩小 ===== */
  .back-btn {
    width: 32px;
    height: 28px;
    font-size: 12px;
  }

  .header-title {
    font-size: 15px;
    margin-left: 6px;
  }

  .header-count {
    font-size: 11px;
    margin-right: 4px;
  }

  .add-btn {
    width: 52px;
    height: 28px;
    font-size: 11px;
  }

  /* ===== 第四层：列表项紧凑化 ===== */
  .course-item {
    padding: 6px;
    margin-bottom: 4px;
  }

  .item-index {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    margin-right: 6px;
  }

  .index-text {
    font-size: 11px;
  }

  .course-name {
    font-size: 13px;
  }

  .edit-btn {
    width: 36px;
    height: 26px;
    font-size: 10px;
  }

  .delete-btn {
    width: 36px;
    height: 26px;
    font-size: 10px;
  }
}
```

### 5.3 尺寸对比表

| 组件 | 默认 | 方形 | 变化 |
|:---|:---|:---|:---|
| 根 padding | `10px` | `6px` | -40% |
| 返回按钮 | `40×34px` | `32×28px` | -20% / -18% |
| 标题字号 | `18px` | `15px` | -17% |
| 添加按钮 | `68×34px` | `52×28px` | -24% / -18% |
| 课程项 padding | `10px` | `6px` | -40% |
| 序号圆圈 | `30×30px` | `24×24px` | -20% |
| 编辑/删除按钮 | `46×32px` | `36×26px` | -22% / -19% |

---

## 6. 胶囊形屏适配 (`@media (shape: capsule)`)

### 6.1 设计原理

```
胶囊形屏 194×368 圆角分析:

╭──────────────────────╮
│ 6px                  │  ← 圆角裁切约 20px
│ ┌──────────────────┐ │
│ │                  │ │
│ │  ◀ 课程管理  +   │ │  ← 可用宽度 ≈ 182px（同方形）
│ │                  │ │
│ │  (1) 语文 编辑 删除│ │
│ │  ...             │ │
│ │                  │ │
│ └──────────────────┘ │
│ 6px                  │
╰──────────────────────╯

关键差异 vs 方形:
- 水平宽度相同 (194px)
- 但四角有圆角，左右边缘约 20px 被裁切
- 策略：与方形屏基本一致，但水平 padding 稍大 (8px vs 6px)
- 顶部/底部空间充足，不需要像圆形那样的大量 padding
```

### 6.2 完整 CSS

```css
@media (shape: capsule) {
  /* ===== 第一层：根容器边距 ===== */
  .manager-page {
    padding: 16px 8px 16px 8px;
  }

  /* ===== 第二层：顶栏适配 ===== */
  .back-header {
    margin-bottom: 8px;
    padding: 0 4px;
    justify-content: center;
  }

  /* ===== 第三层：组件尺寸微调 ===== */
  .back-btn {
    width: 34px;
    height: 28px;
    font-size: 12px;
  }

  .header-title {
    font-size: 15px;
    margin-left: 6px;
  }

  .header-count {
    font-size: 11px;
    margin-right: 4px;
  }

  .add-btn {
    width: 54px;
    height: 28px;
    font-size: 11px;
  }

  /* ===== 第四层：列表项紧凑化 ===== */
  .course-item {
    padding: 7px;
    margin-bottom: 4px;
  }

  .item-index {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    margin-right: 6px;
  }

  .index-text {
    font-size: 11px;
  }

  .course-name {
    font-size: 14px;
  }

  .edit-btn {
    width: 38px;
    height: 26px;
    font-size: 10px;
  }

  .delete-btn {
    width: 38px;
    height: 26px;
    font-size: 10px;
  }
}
```

### 6.3 尺寸对比表

| 组件 | 默认 | 胶囊形 | 变化 |
|:---|:---|:---|:---|
| 根 padding | `10px` | `16px 8px` | 上下+60%，左右-20% |
| 返回按钮 | `40×34px` | `34×28px` | -15% / -18% |
| 标题字号 | `18px` | `15px` | -17% |
| 添加按钮 | `68×34px` | `54×28px` | -21% / -18% |
| 课程项 padding | `10px` | `7px` | -30% |
| 序号圆圈 | `30×30px` | `24×24px` | -20% |
| 编辑/删除按钮 | `46×32px` | `38×26px` | -17% / -19% |

---

## 7. 三形适配策略总结

```
决策树: 如何为新页面选择适配策略?

┌─ 页面有导航栏/返回按钮? ─┐
│                          │
▼ YES                      ▼ NO
┌─ back-header 必须 ─┐   跳过顶栏适配
│ 圆形: justify-content│
│       : center       │
│ 方形: 不做特殊处理    │
│ 胶囊: justify-content│
│       : center       │
└──────────────────────┘
         │
         ▼
┌─ 页面有列表/卡片? ────┐
│                       │
▼ YES                   ▼ NO
┌─ 列表项紧凑化 ────┐  跳过列表适配
│ 圆形: padding 减少  │
│ 方形: padding 大幅减│
│ 胶囊: 介于两者之间  │
└────────────────────┘
         │
         ▼
┌─ 页面有操作按钮? ────┐
│ (添加/编辑/删除等)    │
│                       │
▼ YES                   ▼ NO
┌─ 按钮缩小 ────────┐  跳过按钮适配
│ 圆形: -10%~-18%    │
│ 方形: -18%~-24%    │
│ 胶囊: -15%~-21%    │
└────────────────────┘
```

### 三形适配速查表

| 调整项 | 圆形 (circle) | 方形 (rect) | 胶囊形 (capsule) |
|:---|:---|:---|:---|
| 根容器 padding | `44px 36px` | `6px` | `16px 8px` |
| 顶栏 justify-content | `center` | 默认（不设置） | `center` |
| 顶栏 padding | `0 20px` | 默认（不设置） | `0 4px` |
| 返回按钮 | 缩小 10-15% | 缩小 18-22% | 缩小 15-18% |
| 标题字号 | 缩小 10-15% | 缩小 15-20% | 缩小 15-18% |
| 操作按钮 | 缩小 12-18% | 缩小 18-24% | 缩小 15-21% |
| 列表项 padding | 缩小 20% | 缩小 40% | 缩小 30% |
| 卡片圆角 | 保持或略增 | 保持 | 保持 |

### 关键原则

1. **圆形屏**：最大的问题是四角裁切。用 `padding: 44px 36px` 把内容推到安全区域，`justify-content: center` 让返回按钮居中。
2. **方形屏**：最大的问题是宽度只有 194px。必须大幅压缩所有元素尺寸，padding 减到最小。
3. **胶囊形屏**：水平空间同方形（194px），但有圆角裁切。策略介于圆形和方形之间——水平 padding 稍大于方形，垂直 padding 适中。

---

## 8. 完整 CSS 代码（直接复制使用）

```css
/* ============================================================
   课程管理页面 — 三形屏幕适配完整 CSS
   将此文件内容追加到对应 .ux 文件的 <style> 标签末尾
   ============================================================ */

/* ===== 圆形屏 (466×466) ===== */
@media (shape: circle) {
  .manager-page {
    padding: 44px 36px 44px 36px;
  }
  .back-header {
    margin-bottom: 8px;
    padding: 0 20px;
    justify-content: center;
  }
  .back-btn {
    width: 36px;
    height: 30px;
    font-size: 13px;
  }
  .header-title {
    font-size: 16px;
    margin-left: 6px;
  }
  .header-count {
    font-size: 12px;
  }
  .add-btn {
    width: 56px;
    height: 30px;
    font-size: 12px;
  }
  .course-item {
    padding: 8px;
    margin-bottom: 4px;
  }
  .item-index {
    width: 26px;
    height: 26px;
    border-radius: 13px;
    margin-right: 8px;
  }
  .index-text {
    font-size: 12px;
  }
  .course-name {
    font-size: 14px;
  }
  .edit-btn {
    width: 40px;
    height: 28px;
    font-size: 11px;
  }
  .delete-btn {
    width: 40px;
    height: 28px;
    font-size: 11px;
  }
}

/* ===== 方形屏 (194×368) ===== */
@media (shape: rect) {
  .manager-page {
    padding: 6px;
  }
  .back-header {
    margin-bottom: 6px;
  }
  .back-btn {
    width: 32px;
    height: 28px;
    font-size: 12px;
  }
  .header-title {
    font-size: 15px;
    margin-left: 6px;
  }
  .header-count {
    font-size: 11px;
    margin-right: 4px;
  }
  .add-btn {
    width: 52px;
    height: 28px;
    font-size: 11px;
  }
  .course-item {
    padding: 6px;
    margin-bottom: 4px;
  }
  .item-index {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    margin-right: 6px;
  }
  .index-text {
    font-size: 11px;
  }
  .course-name {
    font-size: 13px;
  }
  .edit-btn {
    width: 36px;
    height: 26px;
    font-size: 10px;
  }
  .delete-btn {
    width: 36px;
    height: 26px;
    font-size: 10px;
  }
}

/* ===== 胶囊形屏 (194×368, 圆角) ===== */
@media (shape: capsule) {
  .manager-page {
    padding: 16px 8px 16px 8px;
  }
  .back-header {
    margin-bottom: 8px;
    padding: 0 4px;
    justify-content: center;
  }
  .back-btn {
    width: 34px;
    height: 28px;
    font-size: 12px;
  }
  .header-title {
    font-size: 15px;
    margin-left: 6px;
  }
  .header-count {
    font-size: 11px;
    margin-right: 4px;
  }
  .add-btn {
    width: 54px;
    height: 28px;
    font-size: 11px;
  }
  .course-item {
    padding: 7px;
    margin-bottom: 4px;
  }
  .item-index {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    margin-right: 6px;
  }
  .index-text {
    font-size: 11px;
  }
  .course-name {
    font-size: 14px;
  }
  .edit-btn {
    width: 38px;
    height: 26px;
    font-size: 10px;
  }
  .delete-btn {
    width: 38px;
    height: 26px;
    font-size: 10px;
  }
}
```