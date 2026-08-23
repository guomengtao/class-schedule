# 颜色列表布局混乱 — 根因分析

## 现象

加入左滑删除后，颜色列表布局错乱，无论使用 absolute 还是 flex row 方案均不生效。

## 已尝试的失败方案

### 方案一：absolute 定位

```
.color-item-wrapper (position: relative, overflow: hidden)
├── .delete-btn (position: absolute, right: 0, height: 100%)
└── .swatch-card
```

**失败原因**：Quick App 中 `position: absolute` + `height: 100%` 不可靠。绝对定位元素脱离文档流后，父元素高度由 swatch-card 撑开，但 `height: 100%` 在 Quick App 引擎中计算为 0，垃圾桶塌陷不可见。

### 方案二：flex row 两列

```
.color-item-wrapper (flex-direction: row, overflow: hidden)
├── .swatch-card (flex-shrink: 0, width: 100%)
└── .delete-btn (flex-shrink: 0, width: 60px)
```

**失败原因**：Quick App 中 `flex-direction: row` 与 `overflow: hidden` 的组合行为不可预测。`width: 100%` 在 flex row 子元素中的计算方式与标准 CSS 不同，导致 swatch-card 宽度塌陷或 delete-btn 始终可见。

### 方案三：transform translateX

```css
.color-card-swiped {
  transform: translateX(-60px);
}
```

**失败原因**：Quick App 对 `transform` 的支持不完整。在 flex 布局中，`translateX` 可能不生效，或导致元素位置偏移但布局不跟随。

## 根因总结

| 属性 | 标准 CSS | Quick App |
|------|:--:|:--:|
| `position: absolute` + `height: 100%` | ✅ | ❌ 高度计算为 0 |
| `flex-direction: row` + `overflow: hidden` | ✅ | ❌ 裁剪行为异常 |
| `transform: translateX()` | ✅ | ❌ 部分场景不生效 |

**核心结论**：Quick App 的 CSS 子集不支持 `position: absolute` + `overflow: hidden` + `transform` 的组合实现侧滑删除。需要换一种不依赖这些属性的方案。

---

## 最终方案：`if` 条件渲染（✅ 已实施）

### 核心思路

**放弃所有 CSS 技巧**（absolute、overflow hidden、transform），用 `if` 指令直接控制删除按钮的显示/隐藏。

### 布局结构

```
.color-item-section (flex column, 纯容器)
├── .swatch-card (始终可见)
└── .swipe-delete-bar (if: swipedIdx === $idx 时显示)
```

### 交互效果

```
正常状态：
┌──────────────────────────────────────┐
│ 红色                          #1    │
└──────────────────────────────────────┘

左滑后（删除栏出现在卡片下方）：
┌──────────────────────────────────────┐
│ 红色                          #1    │
├──────────────────────────────────────┤
│           🗑 删除                     │
└──────────────────────────────────────┘
```

### 关键 CSS

```css
.color-item-section {
  flex-direction: column;      /* 默认 column，Quick App 原生支持 */
  width: 100%;
  margin-bottom: 16px;
}

.swipe-delete-bar {
  height: 44px;                /* 固定高度，无百分比依赖 */
  border-radius: 10px;
  justify-content: center;
  align-items: center;
}
```

### 模板

```html
<div for="{{ listData }}" class="color-item-section">
  <div class="swatch-card" ontouchstart="..." ontouchend="..." onclick="...">
    <text>红色</text>
    <text>#1</text>
  </div>
  <!-- 仅左滑时显示 -->
  <div class="swipe-delete-bar" if="{{ swipedIdx === $idx }}" onclick="confirmDelete($idx)">
    <text>🗑 删除</text>
  </div>
</div>
```

### 优势

| 特性 | 说明 |
|------|------|
| 无 absolute | 删除栏是正常文档流元素，高度由内容决定 |
| 无 overflow hidden | 不需要裁剪任何元素 |
| 无 transform | 不需要平移动画 |
| 无 flex row | 仅使用默认 column 布局 |
| 无百分比高度 | 删除栏固定 44px |
| Quick App 兼容 | 所有用到的 CSS 属性均在 Quick App 支持范围内 |

### 与其他方案的对比

| | 方案一 | 方案二 | 方案三 | 最终方案 |
|------|:--:|:--:|:--:|:--:|
| absolute | ✅ | ❌ | ❌ | ❌ |
| flex row | ❌ | ✅ | ❌ | ❌ |
| overflow hidden | ✅ | ✅ | ❌ | ❌ |
| transform | ❌ | ❌ | ✅ | ❌ |
| `if` 指令 | ❌ | ❌ | ❌ | ✅ |
| 实际可用 | ❌ | ❌ | ❌ | ✅ |

### 教训

在 Quick App 中开发 UI 交互时，应优先使用框架指令（`if`、`show`、`for`）而非 CSS 技巧。CSS 子集远小于标准 Web，`position: absolute`、`overflow: hidden`、`transform` 等属性组合在 Quick App 中不可靠。