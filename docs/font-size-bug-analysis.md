# 字体大小同步 Bug 详细分析

## 问题描述

在设置页面调整字体大小后，返回首页，课程列表的字体大小不跟随变化。

---

## 1. 数据流架构

```
settings.ux                           store.js                          index-full.ux
  │                                     │                                   │
  │ setSize(20)                         │                                   │
  │  ├─ this.displaySize = 20           │                                   │
  │  └─ store.setBaseFontSize(20) ────► │ _cache.baseFontSize = 20          │
  │                                     │ storage.set("baseFontSize", 20)    │
  │                                     │                                   │
  │ router.back()                        │                                   │
  │                                     │                                   │
  └─────────────────────────────────────┼────── onShow() / onInit() ────────►
                                        │         loadFontScale()
                                        │          getBaseFontSize(cb)
                                        │  ◄────── cb(20)
                                        │         self.displaySize = 20
                                        │         self.refreshClasses()
                                        │           └─ loadDayClasses()
                                        │               currentClasses = [...]
                                        │               (应该触发 for 循环重渲染)
```

## 2. 已尝试的修复

| 修复 | 文件 | 效果 |
|------|------|------|
| `setBaseFontSize` 立即更新缓存 | `store.js:329` | 避免读回旧值 |
| `loadFontScale` 回调中调用 `refreshClasses()` | `index-full.ux:269-271` | 字号更新后刷新课程列表 |
| `$forceUpdate()` 强制刷新 | `index-full.ux:273` | 强制 VM 重新渲染 |

## 3. 核心问题：QuickApp for 循环的渲染机制

### 3.1 模板代码

```html
<div for="{{ currentClasses }}" class="class-grid-item" ...>
  <text class="grid-item-name" style="font-size: {{ displaySize }}px">{{ $item.name }}</text>
  <text class="grid-item-time" style="font-size: {{ metaFontSize }}px">{{ $item.time }}</text>
  <text class="grid-item-location" style="font-size: {{ metaFontSize }}px">{{ $item.location }}</text>
</div>
```

### 3.2 问题分析

`for` 循环有三个数据绑定：

| 绑定 | 来源 | 类型 |
|------|------|------|
| `{{ $item.name }}` | `currentClasses[i].name` | for 循环内部变量 |
| `{{ displaySize }}px` | 页面的 `private.displaySize` | **父作用域变量** |
| `{{ metaFontSize }}px` | 页面的 `private.metaFontSize` | **父作用域变量** |

**QuickApp 的 `for` 循环渲染优化**：当 `for` 循环的数据源 `currentClasses` 没有变化时（相同引用或相同内容），for 循环不会重新渲染子项。即使父作用域的 `displaySize` 已经改变，for 循环内部绑定到 `displaySize` 的样式也不会重新求值。

这与 Vue.js 的行为不同。Vue 的 `v-for` 会重新求值父作用域绑定，但 QuickApp 的实现可能不会。

### 3.3 为什么 `refreshClasses()` 调用后仍然无效

`refreshClasses()` → `loadDayClasses()` → `self.currentClasses = classes` 创建了一个新数组，这应该触发 for 循环重新渲染。但可能存在以下情况：

1. **QuickApp 的 diff 算法**可能比较数组内容而非引用，如果内容相同则跳过渲染
2. **`$forceUpdate()` 在 QuickApp 中可能不可用**，`try-catch` 静默吞掉了错误
3. **异步竞态**：`loadDayClasses()` 内部读取 `self.currentDay` 来匹配 schedule，如果 `currentDay` 还没设置，可能返回空数组，导致 for 循环没有渲染任何内容

## 4. 异步竞态详细分析

### 4.1 onInit() 流程（首次加载或页面被销毁后重建）

```
onInit()
  ├─ loadFontScale()                          [异步: getBaseFontSize]
  ├─ database.init()                          [异步]
  │    └─ database.getAllCourses()            [异步]
  │         └─ initAllModules()               [定义 refreshClasses]
  │              └─ loadDayClasses()           [设置 currentClasses]
  └─ (结束)
```

**时序问题**：`loadFontScale()` 和 `database.init()` 同时发起。如果 `loadFontScale` 回调先执行：

```
T1: loadFontScale 回调 → displaySize=20, refreshClasses 未定义 → 跳过
T2: initAllModules → refreshClasses 已定义 → loadDayClasses → 渲染
    → 此时 displaySize=20，渲染正确 ✓
```

如果 `initAllModules` 先执行：

```
T1: initAllModules → loadDayClasses → 渲染 → displaySize=48（旧值）
T2: loadFontScale 回调 → displaySize=20, refreshClasses 已定义 → refreshClasses()
    → loadDayClasses → 重新渲染 → displaySize=20 ✓
```

**理论上两种情况都应该正确**，因为 `loadFontScale` 回调中调用了 `refreshClasses()`。

### 4.2 onShow() 流程（从设置页返回）

```
onShow()
  ├─ loadFontScale()                          [异步: getBaseFontSize]
  │    └─ 回调: displaySize=20, refreshClasses()
  ├─ getCurrentScheduleIndex()                [异步]
  │    └─ getAllCoursesWithIndex()            [异步]
  │         └─ refreshClasses()               [也会触发渲染]
  └─ this.$forceUpdate()                      [同步，无效果]
```

**时序问题**：两个异步链都调用 `refreshClasses()`。如果 `getAllCoursesWithIndex` 的回调先执行：

```
T1: getAllCoursesWithIndex 回调 → refreshClasses() → 渲染 → displaySize=48（旧）
T2: loadFontScale 回调 → displaySize=20 → refreshClasses() → 重新渲染 → displaySize=20 ✓
```

如果 `loadFontScale` 回调先执行：

```
T1: loadFontScale 回调 → displaySize=20 → refreshClasses() → 渲染 → displaySize=20 ✓
T2: getAllCoursesWithIndex 回调 → refreshClasses() → 重新渲染 → displaySize=20 ✓
```

**理论上两种情况都应该正确**。

## 5. 可能的真正原因

既然异步竞态理论上都覆盖了，但实际仍然不生效，最可能的原因是：

### 5.1 QuickApp 的 for 循环不响应父作用域变量变化

这是最可能的原因。QuickApp 的 `for` 循环在重新渲染时，可能只更新 `$item` 相关的绑定，而不会重新求值父作用域的 `displaySize` 绑定。也就是说：

```
for="{{ currentClasses }}" 中：
  {{ $item.name }}     ← 会更新（因为 $item 变了）
  {{ displaySize }}px  ← 不会更新（因为 displaySize 是父作用域，不在 $item 上）
```

**证据**：设置页面的预览文本 `font-size: {{ displaySize }}px` 不在 for 循环内，可以正常响应变化。

### 5.2 $forceUpdate() 在 QuickApp 中不可用

`$forceUpdate()` 是 Vue.js 的方法，QuickApp 可能不支持。`try-catch` 静默吞掉了错误，开发者看不到报错。

可以通过在 catch 中打印 `console.error` 来验证（已添加）。

---

## 6. 建议的修复方案

### 方案 A：将字号下沉到每个课程项（推荐）

在 `class-list.js` 的 `loadDayClasses()` 中，将当前字号写入每个课程项：

```javascript
// class-list.js loadDayClasses()
var currentFontSize = self.displaySize
var currentMetaFontSize = self.metaFontSize

classes.push({
    id: src.id,
    name: src.name,
    time: src.time,
    location: src.location || "",
    progress: 0,
    progressColor: "transparent",
    fontSize: currentFontSize,      // 新增
    metaFontSize: currentMetaFontSize // 新增
})
```

模板改为：

```html
<text class="grid-item-name" style="font-size: {{ $item.fontSize }}px">{{ $item.name }}</text>
<text class="grid-item-time" style="font-size: {{ $item.metaFontSize }}px">{{ $item.time }}</text>
<text class="grid-item-location" style="font-size: {{ $item.metaFontSize }}px">{{ $item.location }}</text>
```

**优点**：字号成为 `$item` 的一部分，for 循环重渲染时一定会更新。
**缺点**：需要修改 `class-list.js` 和模板。

### 方案 B：使用 trackBy 强制重渲染

在 for 循环中增加 `trackBy` 属性，使用字号版本号作为 key 的一部分：

```html
<div for="{{ currentClasses }}" trackBy="id">
```

并确保 `refreshClasses()` 创建新的对象引用。

**缺点**：QuickApp 的 `trackBy` 行为不确定，可能无效。

### 方案 C：使用 CSS 类动态切换

定义多个 CSS 类对应不同字号，然后用 `displaySize` 动态切换类名：

```css
.font-20 { font-size: 20px; }
.font-28 { font-size: 28px; }
...
```

```html
<text class="grid-item-name font-{{ displaySize }}">{{ $item.name }}</text>
```

**缺点**：需要预定义所有字号对应的 CSS 类。

---

## 7. 建议执行顺序

1. **首先**：确认 `$forceUpdate()` 是否报错（查看控制台 `[index-full] $forceUpdate error:` 日志）
2. **其次**：确认 `[store]` 和 `[index-full]` 调试日志是否正常输出，验证数据流是否正确
3. **最后**：如果数据流正确但 UI 不更新，采用**方案 A**（字号下沉到课程项）

---

## 8. 涉及文件

| 文件 | 角色 |
|------|------|
| `src/pages/settings/settings.ux` | 设置字号，调用 `setBaseFontSize()` |
| `src/data/store.js` | 缓存和持久化字号 |
| `src/pages/index-full/index-full.ux` | 首页，读取字号并渲染 |
| `src/pages/index-full/modules/class-list.js` | 课程列表数据加载 |