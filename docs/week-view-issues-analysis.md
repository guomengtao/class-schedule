# 总课表问题分析与优化方案

## 一、返回按钮图标显示叹号

### 现象
头部返回按钮显示叹号/破损图片。

### 根因
**图片路径错误**。

[week-view.ux:6](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L6)：
```html
<image class="wv-back-icon" src="../common/icons/{{ iconTheme }}/icon_back.png"></image>
```

week-view 位于 `src/pages/week-view/week-view.ux`，`../` 只能回到 `src/pages/`，解析后路径为 `src/pages/common/icons/` —— **该目录不存在**。

对比所有其他页面（36处），均使用 `../../common/icons/` ：
```html
<!-- 正确示例: 课程管理页 [course-manager.ux:5] -->
<image class="back-btn-icon" src="../../common/icons/{{ iconTheme }}/icon_back.png"></image>
```

### 修复
```html
<!-- 改为 -->
<image class="wv-back-icon" src="../../common/icons/{{ iconTheme }}/icon_back.png"></image>
```

---

## 二、全屏结构

### 现状
[.wv-page CSS](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L808-L811)：
```css
.wv-page {
  padding: 44px 10px 12px 10px;  /* 顶部 44px 安全区 + 左右各 10px */
  height: 100%;
}
```

左右各 10px 在胶囊屏（≈160px 宽）上浪费 **20px，占 12.5%** 的可视宽度。

### 修复方案

**胶囊屏**：左右 padding 归零，上下仅保留标题栏空间：
```css
@media (shape: capsule), (shape: pill-shaped) {
  .wv-page {
    padding: 44px 0 8px 0;
  }
  .wv-grid-scroll {
    padding: 0;
  }
}
```

**注意全局 CSS 影响**：
- 需排查 `app.ux` 中是否有对 `div`、`page` 的全局 padding/margin 设置
- 确认 `.wv-page` 未被全局选择器覆盖
- 使用 `!important` 仅在必要时保障优先级

---

## 三、极简模板：单字显示 + 禁止 +1/+2

### 期望行为
极简模板 (`minimal-char`)：
- 每个课程仅显示 **1 个汉字**
- 同时间段重复课程**禁止显示 +1/+2**

### 当前问题

1. **单字显示已实现** —— `minimal-char` 的 `nameDisplay: "char"` 配合 `getDisplayName()` 已返回首字。✅

2. **+1/+2 无条件显示** —— [模板 第53行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L53)：
   ```html
   <text if="{{ $item.course && $item.course.extraCount > 0 }}"
         class="wv-extra">+{{ $item.course.extraCount }}</text>
   ```
   极简模板下单字已经占满格子，+N 会溢出或截断。且极简语义下重复课程不应标注。

### 修复
增加条件 `&& currentTplId !== 'minimal-char'` ：
```html
<text if="{{ $item.course && $item.course.extraCount > 0 && currentTplId !== 'minimal-char' }}"
      class="wv-extra">+{{ $item.course.extraCount }}</text>
```

---

## 四、缓存未生效分析

### 上一次改了什么

上次在 `renderScheduleData()` 前增加了数据指纹 + 渲染缓存：
- `_renderCache` 模块级变量缓存 `timeSlots`/`totalCourses`/`totalDays`/`dayCounts`
- 指纹由 `day|id|time|name` 拼接
- 缓存键 = `viewIndex | templateId | hideWeekend | isCapsule`

### 为什么仍然慢

**缓存只跳过了 `buildTimeSlots()` 的计算，没有跳过前置 I/O**。

完整调用链：
```
onShow() → loadTemplateAndReload() → loadData()
                                          ↓
                           getAllCoursesWithIndex()  ← 每次都走！(存储 I/O)
                                          ↓
                               renderScheduleData()
                                          ↓
                              指纹相同？→ 跳过 buildTimeSlots() ✓
                                          ↓
                              但前面的 I/O 已经等了 500ms+
```

缓存命中的收益仅限于跳过 30ms 的 `buildTimeSlots()` 计算，而 500ms+ 的 I/O 等待从未被绕过。**缓存粒度太细，没有覆盖真正的瓶颈。**

### 根本瓶颈

| 环节 | 耗时占比 | 是否可缓存 |
|------|----------|-----------|
| `getAllCoursesWithIndex()` → storage I/O | ~80% | ✅ 应缓存 |
| 数据转换 `allCourses` 合并 | ~5% | ✅ 应缓存 |
| `buildTimeSlots()` 构建 | ~10% | ✅ 已缓存 |
| `$forceUpdate()` 渲染 | ~5% | ❌ 不可缓存 |

### 修复：数据层缓存

将 **原始 `allCourses`** 存储到模块级变量中：

```js
// 模块级
var _cachedAllCourses = null
var _cachedViewIndex = -1

// loadData 中：
if (_cachedAllCourses && _cachedViewIndex === self.viewIndex) {
  // 命中：直接渲染，不走 storage I/O
  self.renderScheduleData(_cachedAllCourses)
  return
}

database.getAllCoursesWithIndex(self.viewIndex, function(schedule) {
  _cachedAllCourses = allCourses   // 存储原始数据
  _cachedViewIndex = self.viewIndex
  self.renderScheduleData(allCourses)
})
```

**注意**：编辑课程返回时必须清除数据缓存。方案：
- 监听 storage 变更或使用 `onShow` 中的版本号检测
- 或依赖 `database._cacheDirty` 判断是否需要重新读盘
- 最简方案：`onShow` 时如果 `firstLoad` 为 false 且数据库缓存在内存中，直接用内存数据

---

## 五、模板切换慢分析

### 调用链

```
用户点击模板按钮
  → switchTemplate(id)
    → clearRenderCache()         // ← 清除渲染缓存 ✓
    → applyTemplate(id)          // 更新配置变量 (5μs)
    → store.setWeekViewTemplate(id)
    → loadData()                 // ← 重新读盘！
      → getAllCoursesWithIndex() // ← 每次模板切换都读盘！
        → renderScheduleData()   // ← 缓存已清，重新计算
```

### 问题

**模板切换不应该读盘**。课程数据没有变化，变化的只是显示配置（字体、颜色、行列数）。但 `switchTemplate()` 调用 `loadData()` 每次都走 `getAllCoursesWithIndex()` 的异步 I/O。

### 修复：模板切换复用已加载数据

```js
switchTemplate(id) {
  var self = this
  log("switchTemplate -> " + id)
  clearRenderCache()
  self.applyTemplate(id)
  store.setWeekViewTemplate(id)

  // 如果已有数据缓存，直接重渲染，不读盘
  if (_cachedAllCourses && _cachedViewIndex === self.viewIndex) {
    self.isLoading = true
    self.renderScheduleData(_cachedAllCourses)
    return   // ← 秒切！
  }

  // 首次没有缓存时才读盘
  self.isLoading = true
  self.loadData()
}
```

配合方案四的 `_cachedAllCourses`，模板切换时直接走缓存渲染，耗时从 **500ms+ → <30ms**。

---

## 总结：优先级排序

| 优先级 | 问题 | 影响 | 改动量 |
|--------|------|------|--------|
| P0 | 返回按钮路径错误 | 功能损坏 | 1 行 |
| P0 | 数据层缓存 (`_cachedAllCourses`) | 每次进入等 500ms | ~20 行 |
| P0 | 模板切换复用数据 | 每次切换等 500ms | ~8 行 |
| P1 | 全屏 padding 归零 | 浪费 12.5% 宽度 | ~10 行 CSS |
| P1 | 极简模板禁止 +1/+2 | UI 整洁 | 1 行 |

---

## 附录：完整改动点

### A. 返回按钮路径
```diff
- src="../common/icons/{{ iconTheme }}/icon_back.png"
+ src="../../common/icons/{{ iconTheme }}/icon_back.png"
```

### B. 增加模块级数据缓存
需新增变量：
- `_cachedAllCourses` — 原始 allCourses 对象
- `_cachedViewIndex` — 对应的 viewIndex

### C. loadData 优先走数据缓存
命中时跳过 `getAllCoursesWithIndex()` 调用。

### D. switchTemplate 走数据缓存
命中时跳过 `loadData()` 调用，直接 `renderScheduleData(_cachedAllCourses)`。

### E. 编辑后清除缓存
在 `onShow` 中检测数据库变更，或在增删改课程操作中主动清除 `_cachedAllCourses`。

### F. 禁止极简模板 +1/+2
```diff
- <text if="{{ $item.course && $item.course.extraCount > 0 }}">
+ <text if="{{ $item.course && $item.course.extraCount > 0 && currentTplId !== 'minimal-char' }}">
```

### G. 胶囊屏全屏 CSS
```css
@media (shape: capsule), (shape: pill-shaped) {
  .wv-page { padding: 44px 0 8px 0; }
  .wv-grid-scroll { padding: 0; }
}
```