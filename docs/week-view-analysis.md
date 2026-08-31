# 课程总览页面问题分析

## 问题描述

1. **课程总览页面内容不显示**：进入课程总览页面后，课程网格不显示，`timeSlots` 数据为空
2. **横屏切换按钮无反应**：点击右上角"横/竖"切换按钮，页面无任何响应

---

## 问题一：内容不显示的根本原因

### 原因 1（主要）：`<scroll>` 组件缺少 `scroll-y` 属性

**位置**：[week-view.ux 第22行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L22)

```html
<scroll class="grid-scroll">
```

QuickApp 框架中，`<scroll>` 是原生组件。与 Web 的 `<div>` 不同，原生 `<scroll>` 组件**必须显式设置 `scroll-y="{{true}}"` 才能启用垂直滚动并正确渲染内部子元素**。

对比项目中其他正确使用 `<scroll>` 的地方（如 schedule-manager 修改前）：
```html
<scroll class="schedule-list-scroll" scroll-y="{{true}}">
```

缺少 `scroll-y` 属性会导致：
- `<scroll>` 组件可能以非滚动模式渲染，高度计算异常
- 内部 `grid-container` 及其子元素（`time-row`、`course-cell`）不可见

### 原因 2（次要）：`<scroll>` 原生组件与 `flex: 1` 不兼容

**位置**：[week-view.ux 第357-360行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L357-L360)

```css
.grid-scroll {
  flex: 1;
  flex-direction: column;
}
```

这与之前 schedule-manager.ux 的问题完全一致。QuickApp 的原生 `<scroll>` 组件在 flex 布局中可能无法正确计算高度。`flex: 1` 依赖父容器有明确高度，但原生组件的布局计算方式与 CSS flex 模型不完全兼容，导致 `grid-scroll` 高度为 0，内容不可见。

**修复方案**：将 `<scroll>` 替换为 `<div>` + `overflow: auto`，与 schedule-manager 的修复方式一致。

### 原因 3（次要）：`database.getAllCoursesWithIndex` 不检查 `useSqlite` 标志

**位置**：[database.js 第607-617行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L607-L617)

```javascript
getAllCoursesWithIndex: function(index, callback) {
    log("getAllCoursesWithIndex: " + index)
    ensureReady(function() {
      var oldIndex = currentScheduleIndex
      currentScheduleIndex = index
      getAllCoursesStorage(function(data) {  // BUG: 直接调用 storage，不检查 useSqlite
        currentScheduleIndex = oldIndex
        callback(data)
      })
    })
  },
```

对比 `getAllCourses` 函数（第512-522行）的正确实现：
```javascript
getAllCourses: function(callback) {
    ensureReady(function() {
      loadScheduleIndex(function() {
        if (useSqlite) {
          getAllCoursesSqlite(callback)    // 正确：检查 useSqlite
        } else {
          getAllCoursesStorage(callback)
        }
      })
    })
  },
```

`getAllCoursesWithIndex` 直接调用 `getAllCoursesStorage`，完全跳过了 `useSqlite` 检查。如果数据库使用 sqlite 模式，该函数会从 storage 读取数据，而 storage 中可能没有数据（因为数据存储在 sqlite 中），导致返回空数组 `[]`，进而 `timeSlots` 为空，页面无内容。

---

## 问题二：横屏切换无反应的根本原因

### 原因 1：`grid-wrapper.landscape` 的 `position: absolute` 导致布局破坏

**位置**：[week-view.ux 第345-352行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L345-L352)

```css
.grid-wrapper.landscape {
  transform: rotate(90deg);
  transform-origin: 0 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 454px;
  height: 454px;
}
```

当 `isLandscape` 为 `true` 时，`grid-wrapper` 从 flex 子元素变为 `position: absolute`，脱离正常文档流。这会导致：

1. **布局塌陷**：`grid-wrapper` 从 flex 布局中移除后，`week-view-page` 的 flex 布局中只剩下 `header`、`schedule-name` 和 `footer`，页面布局异常
2. **固定尺寸不匹配**：`width: 454px; height: 454px` 是硬编码的，不匹配实际屏幕尺寸（不同设备屏幕尺寸不同）
3. **旋转原点问题**：`transform-origin: 0 0` 配合 `top: 0; left: 0` 在 `position: absolute` 下，旋转后的元素可能超出可视区域

### 原因 2：`rotate-toggle` div 可能被其他元素遮挡

**位置**：[week-view.ux 第8-10行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L8-L10)

```html
<div class="rotate-toggle" onclick="toggleLandscape" ...>
```

当 `grid-wrapper.landscape` 使用 `position: absolute` 且 `top: 0; left: 0` 时，旋转后的 `grid-wrapper` 可能覆盖在 header 区域之上，导致 `rotate-toggle` 按钮的点击事件被 `grid-wrapper` 拦截。

### 原因 3：页面初始化失败影响事件绑定

如果问题一导致页面内容加载失败（`timeSlots` 为空），QuickApp 框架可能处于不稳定的状态，事件处理机制也可能受影响，导致 `toggleLandscape` 方法虽然被调用但 UI 不更新。

---

## 修复方案

### 修复 1：将 `<scroll>` 替换为 `<div>` + `overflow: auto`

```html
<!-- 修改前 -->
<scroll class="grid-scroll">
  <div class="grid-container">
    ...
  </div>
</scroll>

<!-- 修改后 -->
<div class="grid-scroll">
  <div class="grid-container">
    ...
  </div>
</div>
```

```css
/* 修改前 */
.grid-scroll {
  flex: 1;
  flex-direction: column;
}

/* 修改后 */
.grid-scroll {
  flex: 1;
  flex-direction: column;
  overflow: auto;
}
```

### 修复 2：修复 `database.getAllCoursesWithIndex` 的 sqlite 检查

```javascript
getAllCoursesWithIndex: function(index, callback) {
    log("getAllCoursesWithIndex: " + index)
    ensureReady(function() {
      var oldIndex = currentScheduleIndex
      currentScheduleIndex = index
      // 修复：根据 useSqlite 选择正确的读取方式
      if (useSqlite) {
        getAllCoursesSqlite(function(data) {
          currentScheduleIndex = oldIndex
          callback(data)
        })
      } else {
        getAllCoursesStorage(function(data) {
          currentScheduleIndex = oldIndex
          callback(data)
        })
      }
    })
  },
```

### 修复 3：修复横屏模式的 CSS

```css
/* 修改前 */
.grid-wrapper.landscape {
  transform: rotate(90deg);
  transform-origin: 0 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 454px;
  height: 454px;
}

/* 修改后 */
.grid-wrapper.landscape {
  transform: rotate(90deg);
  transform-origin: center center;
  /* 保持 flex 布局中，不脱离文档流 */
  /* 移除 position: absolute */
}
```

---

## 总结

| 问题 | 根因 | 严重程度 |
|------|------|----------|
| 内容不显示 | `<scroll>` 缺少 `scroll-y` 属性 + flex 不兼容 | 🔴 严重 |
| 内容不显示 | `getAllCoursesWithIndex` 不检查 `useSqlite` | 🟡 中等 |
| 横屏无反应 | `position: absolute` 破坏布局 + 遮挡事件 | 🔴 严重 |
| 横屏无反应 | 固定尺寸不匹配屏幕 | 🟡 中等 |