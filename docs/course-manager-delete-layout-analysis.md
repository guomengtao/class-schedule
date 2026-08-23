# 课程管理页面 - 删除确认无效 & 布局混乱 原因分析

## 问题概述

| # | 问题 | 现象 |
|---|------|------|
| 1 | 删除确认无效 | 点击"删除"链接没有反应，不弹出确认对话框 |
| 2 | 界面布局混乱 | 12 个课程挤在一起，rename-bar 弹出时布局更乱 |

---

## 问题 1：点击"删除"无效

### 原因分析

#### 原因 1.1（🔴 主要）：`<scroll>` 组件内 `<text>` 的 `onclick` 不触发

```html
<!-- course-manager.ux:19-29 -->
<scroll class="course-list-scroll" scroll-y="{{true}}">
  <div for="{{ courseList }}" class="course-item" ...>
    <div class="item-left">
      <text class="course-name">语文</text>
    </div>
    <div class="item-right">
      <text class="link" onclick="startRename($idx)">重命名</text>   <!-- ← 不触发 -->
      <text class="link delete-link" onclick="deleteCourse($idx)">删除</text>  <!-- ← 不触发 -->
    </div>
  </div>
</scroll>
```

**与 schedule-manager 的对比**：

| | schedule-manager | course-manager |
|------|:---:|:---:|
| 列表容器 | `<div class="schedule-list-scroll">` | `<scroll class="course-list-scroll">` |
| 点击元素 | `<text class="link" onclick="...">` | `<text class="link" onclick="...">` |
| 是否工作 | 理论上是 | ❌ 不工作 |

**根因**：QuickApp 的 `<scroll>` 组件会拦截子元素的触摸事件。`<scroll>` 原生负责处理滚动手势，它内部的 `touchstart`/`touchend` 事件被组件消耗，导致 `<text>` 的 `onclick` 无法触发。

**验证**：同样的 `<text class="link" onclick="...">` 在 schedule-manager 的 `<div>` 中可能工作，但放在 `<scroll>` 中就不工作。

#### 原因 1.2（🟡 中等）：`<text>` 元素缺少 `ontouchstart`

QuickApp 中，`<text>` 元素的 `onclick` 需要**父元素**或**自身**注册 `ontouchstart` 才能被触发。这是之前首页 `status-bar` 点击无效的同一原因。

当前代码中，`deleteCourse` 的 `<text>` 没有 `ontouchstart`，其父元素 `item-right`、`course-item`、`course-list-scroll` 也没有。

#### 原因 1.3（🟢 轻微）：`inline onclick` 传参 `$idx` 可能解析失败

```html
<text class="link" onclick="deleteCourse($idx)">删除</text>
```

在 `<scroll>` 组件内部的 `for` 循环中，`$idx` 可能无法正确解析。QuickApp 的模板引擎在嵌套组件中使用 `$idx` 时，作用域可能不对。

### 修复方案

#### 方案 A：加 `ontouchstart` + 保留 `onclick`（推荐）

```html
<text class="link" ontouchstart="onLinkTouch" onclick="startRename($idx)" style="color: {{ theme.accent }}">重命名</text>
<text class="link delete-link" ontouchstart="onLinkTouch" onclick="deleteCourse($idx)" style="color: {{ theme.deleteText }}">删除</text>
```

```javascript
onLinkTouch() {}  // 空方法，仅为激活 onclick
```

#### 方案 B：改用 `<input>` 替代 `<text>`（最可靠）

```html
<input class="link" type="button" value="重命名" onclick="startRename($idx)" style="background-color: transparent; color: {{ theme.accent }}" />
<input class="link delete-link" type="button" value="删除" onclick="deleteCourse($idx)" style="background-color: transparent; color: {{ theme.deleteText }}" />
```

`<input>` 的 `onclick` 在 QuickApp 中不依赖 `ontouchstart`，更可靠。

#### 方案 C：用 `<div>` 替代 `<scroll>`（如果不需要滚动）

如果课程列表很少（12 个以内），可以改回 `<div>` 并加 `overflow: auto`，避免 `<scroll>` 拦截事件。

---

## 问题 2：界面布局混乱

### 原因分析

#### 原因 2.1（🔴 主要）：`<scroll>` 没有明确高度，或高度计算错误

```css
.course-list-scroll {
  flex: 1;
  flex-direction: column;
}
```

`flex: 1` 在 QuickApp 的 `<scroll>` 组件中可能不生效。`<scroll>` 需要明确的 `height` 值才能正确计算滚动区域。

**结果**：`<scroll>` 高度为 0 或很小，12 个课程超出了可视区域，但无法滚动，导致布局看起来"撑爆了"。

#### 原因 2.2（🟡 中等）：`rename-bar` 弹出时抢占空间

```css
.rename-bar {
  flex-shrink: 0;
  padding: 8px;
  margin-bottom: 8px;
}
```

当 `editingIndex >= 0` 时，`rename-bar` 显示（约 52px 高），压缩了 `course-list-scroll` 的空间。加上 `add-section`（约 48px）和 `back-header`（约 46px），实际可用滚动区域只有：

```
454px (屏幕) - 12px*2 (padding) - 46px (header) - 52px (rename-bar) - 48px (add-section) = 284px
```

12 个课程 × 约 35px/个 = 420px > 284px，超出近 50%。

#### 原因 2.3（🟡 中等）：课程项间距过大

```css
.course-item {
  padding: 10px 14px;
  margin-bottom: 6px;
  border-left-width: 3px;
}
```

单个课程项占用：`10px + 15px(font) + 10px + 6px(margin) = 41px`

12 个课程 = 492px，远超屏幕高度。

对比 schedule-manager 的紧凑设计：
```css
.schedule-item {
  padding: 16px 20px;
  margin-bottom: 10px;
}
```

虽然 schedule-manager 的 padding 更大，但它只有 2-3 个课程表，不会溢出。

#### 原因 2.4（🟢 轻微）：`add-btn` 高度过大

```css
.add-btn {
  width: 100%;
  height: 40px;
}
```

40px 的按钮在 454px 屏幕中占比约 9%，可以压缩到 34-36px。

### 修复方案

#### 方案 A：压缩间距 + 确保 scroll 高度（推荐）

```css
.course-item {
  padding: 8px 12px;        /* 从 10px 14px 压缩 */
  margin-bottom: 4px;       /* 从 6px 压缩 */
}

.add-btn {
  height: 34px;             /* 从 40px 压缩 */
}

.course-list-scroll {
  flex: 1;
  flex-direction: column;
  height: 100%;             /* 新增：明确高度 */
}
```

单课程项高度：`8px + 15px + 8px + 4px = 35px`
12 个课程 = 420px，可用区域约 330px，可通过滚动查看。

#### 方案 B：给 `<scroll>` 设置计算高度

```html
<scroll class="course-list-scroll" scroll-y="{{true}}" style="height: {{ scrollHeight }}px">
```

```javascript
// onInit 中计算
var headerH = 46
var addH = 48
var renameH = this.editingIndex >= 0 ? 52 : 0
var padding = 24
this.scrollHeight = 454 - headerH - addH - renameH - padding
```

---

## 涉及文件

| 文件 | 行号 |
|------|------|
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux) | 模板: 25-26 (`.link` onclick) |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux) | 模板: 19 (`<scroll>`) |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux) | CSS: 341-393 (`.course-list-scroll`, `.course-item`, `.add-btn`) |

---

## 总结

| 问题 | 根因 | 推荐修复 |
|------|------|------|
| 删除无效 | `<scroll>` 拦截 + `<text>` 无 `ontouchstart` | `<text>` 加 `ontouchstart`，或改用 `<input>` |
| $idx 传参 | `<scroll>` 内 `for` 可能解析失败 | 改用 `$item` + 在方法中查找 index |
| 布局混乱 | `<scroll>` 无明确高度 + 间距过大 | 压缩 padding/margin + 设置 `height: 100%` |
| rename-bar 挤压 | 弹出时占用 52px | 正常，但需确保 scroll 区域正确计算 |