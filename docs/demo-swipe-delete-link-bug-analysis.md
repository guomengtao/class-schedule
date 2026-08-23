# 昵称页"滑动删除Demo"链接点击无效 - 错误分析

## 问题现象

在 `nickname-edit.ux` 页面底部新增了"滑动删除Demo"链接，点击后无法跳转到恐龙列表页。

## 涉及文件

| 文件 | 路径 |
|------|------|
| 昵称编辑页 | [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux) |
| 设置页（参考） | [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux) |
| InputMethod 组件 | [InputMethod.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux) |

---

## 根因分析

### 1. 页面布局结构

```html
<div class="edit-page">          <!-- height: 100% -->
  <div class="back-header">...</div>    <!-- 自然高度 ~50px -->
  <div class="edit-content">            <!-- flex-shrink: 0 -->
    <text class="input-label">...</text>
    <div class="nickname-display">...</div>
    <div class="button-row">...</div>
    <div class="demo-link">...</div>    <!-- 新增的链接，在最底部 -->
  </div>
  <input-method ...></input-method>     <!-- hide=true 时 height: 0px -->
</div>
```

### 2. CSS 关键属性冲突

```css
.edit-page {
  flex-direction: column;
  height: 100%;        /* ← 固定为屏幕高度，手表约 390~454px */
}

.edit-content {
  flex-shrink: 0;       /* ← 不允许收缩，保持自然高度 */
}
```

### 3. 高度计算

| 元素 | 高度估算 |
|------|----------|
| `.edit-page` padding-top | 16px |
| `.edit-page` padding-bottom | 10px |
| `.back-header` (40px + margin 10px) | ~50px |
| `.edit-content` padding | 6px |
| `.input-label` (14px + margin 6px) | ~20px |
| `.nickname-display` | 48px |
| `.button-row` (44px + margin-top 16px) | ~60px |
| `.demo-link` (padding 28px + margin-top 16px + text) | ~50px |
| **合计** | **~260px** |

260px 理论上在手表 390px 屏幕内应该能放下，但实际上：

- `edit-content` 设置了 `flex-shrink: 0`
- `edit-page` 设置了 `height: 100%`
- 但 `edit-page` 内部没有 `flex: 1` 的子元素来消耗剩余空间
- QuickApp 的 flex 布局引擎在 `height: 100%` + `flex-shrink: 0` 组合下，可能产生非预期的布局行为

### 4. 真正的根因

**`edit-page` 使用 `height: 100%` 而非 `min-height: 100%`**。

对比设置页：

```css
/* settings.ux - 正常工作 */
.settings-page {
  flex-direction: column;
  padding: 8px;
  min-height: 100%;    /* ← 最小高度，允许内容超出后自然撑开 */
}

/* nickname-edit.ux - 有问题 */
.edit-page {
  flex-direction: column;
  padding: 10px;
  padding-top: 16px;
  height: 100%;        /* ← 固定高度，内容超出会被裁剪 */
}
```

**`height: 100%`** 将容器高度锁定为屏幕高度。当 `edit-content` 设置了 `flex-shrink: 0` 时，flex 容器无法压缩它，导致内容溢出屏幕底部。**demo-link 虽然在 DOM 中渲染了，但被裁剪在屏幕可视区域之外，所以点击无效。**

---

## 尝试的修复方案及问题

### 方案一：添加 scroll 包裹（错误方案）

```html
<scroll class="edit-scroll" scroll-y="{{true}}">
  <div class="edit-content">...</div>
</scroll>
```

```css
.edit-scroll {
  flex: 1;
  flex-direction: column;
}
```

**问题**：`edit-scroll` 使用 `flex: 1` 后，它占据 `edit-page` 的剩余空间。但 `edit-page` 的 `height: 100%` 仍然限制了总高度。`scroll` 组件在 flex 布局中拿到的高度只是 `edit-page` 减去 `back-header` 和 `input-method` 后的剩余空间，**导致整个可视区域变得更加狭小**（用户反馈"整体屏幕缩小了"）。虽然内容可以滚动，但用户体验很差，在小屏幕上几乎不可用。

---

## 正确的修复方案

### 方案：将 `height: 100%` 改为 `min-height: 100%`（与设置页一致）

```css
.edit-page {
  flex-direction: column;
  padding: 10px;
  padding-top: 16px;
  min-height: 100%;    /* 改为 min-height，允许内容超出 */
}
```

同时移除 `edit-content` 的 `flex-shrink: 0`：

```css
.edit-content {
  flex-direction: column;
  align-items: center;
  padding: 6px;
  /* 删除 flex-shrink: 0 */
}
```

这样页面内容可以自然撑开，demo-link 始终在可视区域内，无需滚动即可点击。

---

## 总结

| 错误原因 | `edit-page` 使用 `height: 100%` 固定高度，`edit-content` 使用 `flex-shrink: 0` 禁止收缩，导致新增的 demo-link 被裁剪在屏幕底部之外 |
|----------|------|
| 为什么 scroll 方案不对 | scroll 容器的 `flex: 1` 在固定高度父容器中只拿到很小的空间，造成可视区域缩小 |
| 正确方案 | 将 `height: 100%` 改为 `min-height: 100%`，移除 `flex-shrink: 0`，与设置页保持一致 |