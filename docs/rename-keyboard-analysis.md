# 课程表管理重命名编辑区点击无反应问题分析

## 问题现象

在 `schedule-manager.ux` 页面中，点击"重命名"后，弹出的编辑区（InputMethod 键盘）点击按键无任何反应，无法输入文字。

## 根本原因分析

经过对比项目中所有使用 `InputMethod` 组件的页面，发现 **schedule-manager.ux 是唯一一个同时使用 `<scroll>` 原生组件和 `<input-method>` 自定义键盘组件的页面**。

### 详细对比

| 页面 | 使用 InputMethod | 使用 `<scroll>` 组件 | 是否正常 |
|------|:---:|:---:|:---:|
| course-manager.ux | ✅ | ❌ (用 `<div>` + `overflow: auto`) | ✅ 正常 |
| nickname-edit.ux | ✅ | ❌ | ✅ 正常 |
| detail.ux | ✅ | ❌ | ✅ 正常 |
| add-course.ux | ✅ | ❌ | ✅ 正常 |
| chinese-input.ux | ✅ | ❌ | ✅ 正常 |
| **schedule-manager.ux** | ✅ | ✅ (`<scroll scroll-y="{{true}}">`) | ❌ 异常 |

### 原因 1：`<scroll>` 原生组件拦截触摸事件（最可能的原因）

在 QuickApp 框架中，`<scroll>` 是一个**原生组件**（Native Component），它在原生层（Native Layer）创建了一个独立的滚动视图。而 `InputMethod` 组件也是基于原生视图渲染的（键盘图片、按钮等）。

**关键冲突点**：

1. schedule-manager.ux 的页面布局中，`<scroll>` 组件设置了 `flex: 1`，这意味着它会**占据所有剩余空间**，覆盖整个屏幕中部到底部区域。

2. 在 QuickApp 框架中，原生组件（如 `<scroll>`）的触摸事件处理优先级**高于**普通组件。即使 `InputMethod` 组件在 DOM 树中位于 `<scroll>` 之后（理论上应该渲染在更上层），原生 `<scroll>` 组件仍然会**优先拦截触摸事件**。

3. 当键盘弹出时，键盘区域恰好与 `<scroll>` 组件的可视区域重叠。用户点击键盘按键时，触摸事件被 `<scroll>` 组件拦截，导致 `InputMethod` 组件无法接收到 `@complete`、`@delete` 等事件。

4. 相比之下，`course-manager.ux` 使用的是普通 `<div>` + `overflow: auto` 实现滚动，这是**非原生组件**，不会拦截触摸事件，因此键盘可以正常工作。

### 原因 2：`if` 指令导致 DOM 重建，可能影响键盘状态

`schedule-manager.ux` 中的重命名栏使用了 `if` 指令：

```html
<div class="rename-bar" if="{{ editingIndex >= 0 }}">
```

而 `course-manager.ux` 中使用的是 `show` 指令：

```html
<div class="add-row" show="{{ renameIdx === -1 }}">
<div class="rename-row" show="{{ renameIdx !== -1 }}">
```

**`if` vs `show` 的区别**：

| 指令 | 行为 | 影响 |
|------|------|------|
| `show` | 仅切换可见性（`display: none`），元素始终在 DOM 中 | 不触发 DOM 重建，状态保持 |
| `if` | 条件为 false 时**完全移除元素**，为 true 时**重新创建** | 触发 DOM 增删，可能影响同级组件 |

当 `editingIndex` 从 `-1` 变为具体索引时，`if` 指令会触发 `rename-bar` 的**创建**。在同一渲染周期中，`showKeyboard()` 方法同时将 `hideKeyboard` 设为 `false`，触发 `InputMethod` 组件的键盘显示。这两个 DOM 操作（创建 rename-bar + 显示键盘）在同一帧中发生，可能导致 QuickApp 的渲染引擎无法正确处理键盘的触摸事件绑定。

### 原因 3：`min-height: 100%` vs `height: 100%` 影响绝对定位

`schedule-manager.ux` 的根容器使用 `min-height: 100%`：

```css
.manager-page {
  flex-direction: column;
  min-height: 100%;   /* ⚠️ 使用 min-height */
}
```

而 `course-manager.ux`（正常工作的页面）使用 `height: 100%`：

```css
.page {
  flex-direction: column;
  height: 100%;       /* ✅ 使用 height */
}
```

`InputMethod` 组件的键盘容器使用绝对定位：

```css
.page {
  width: 100%;
  position: absolute;
  left: 0;
  bottom: 0
}
```

`position: absolute; bottom: 0` 需要一个有明确高度的包含块才能正确定位。当父容器使用 `min-height: 100%` 时，容器高度由内容决定，可能不是精确的屏幕高度。这可能导致键盘组件定位不准确，与 `<scroll>` 组件产生重叠区域，进一步加剧触摸事件拦截问题。

## 解决方案

### 推荐方案：将 `<scroll>` 替换为 `<div>` + `overflow: auto`

参考 `course-manager.ux` 的做法，将原生 `<scroll>` 组件替换为普通 `<div>` + CSS `overflow: auto`：

```html
<!-- 修改前 -->
<scroll class="schedule-list-scroll" scroll-y="{{true}}">
  ...
</scroll>

<!-- 修改后 -->
<div class="schedule-list-scroll">
  ...
</div>
```

```css
.schedule-list-scroll {
  flex: 1;
  flex-direction: column;
  overflow: auto;   /* 添加 overflow: auto */
}
```

这样滚动列表就是普通的 DOM 元素，不会拦截 `InputMethod` 键盘的触摸事件。

### 辅助修改

1. **将 `rename-bar` 的 `if` 改为 `show`**，避免 DOM 重建带来的副作用：

```html
<div class="rename-bar" show="{{ editingIndex >= 0 }}">
```

2. **将 `min-height: 100%` 改为 `height: 100%`**，确保绝对定位正确：

```css
.manager-page {
  flex-direction: column;
  height: 100%;           /* 改为 height */
  background-color: #1a1a2e;
  padding: 12px;
}
```

## 总结

核心问题是 QuickApp 框架中**原生 `<scroll>` 组件与 `InputMethod` 自定义键盘组件的触摸事件冲突**。`<scroll>` 原生组件会优先拦截触摸事件，导致键盘按键无法响应。解决方法是使用普通 `<div>` + `overflow: auto` 替代 `<scroll>` 组件，同时配合 `show` 指令和 `height: 100%` 确保布局正确。