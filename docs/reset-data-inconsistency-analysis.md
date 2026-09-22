# 一键重置后数据不一致分析报告

## 问题描述

点击"一键重置全部"后出现两个 bug：

1. **课程列表出现多余课程**：重置后的课程表中出现了"计算机"，但默认12门课程里不应该有"计算机"（应该有"体育"）
2. **首页快速添加不显示课程**：重置后首页的"快速添加"区域展开后没有显示任何课程名称

---

## 涉及文件

| 文件 | 说明 |
|------|------|
| [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L700-L714) | `_doResetToDemoData` 的 `coursePool`（引用了"计算机"） |
| [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L843-L878) | `resetCoursePresets` 的默认课程列表（正确版本） |
| [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L69-L72) | 重置页面显示的默认课程列表 |
| [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L127-L131) | `handleResetAll` 一键重置逻辑 |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L30-L42) | 课程管理页的默认课程列表 |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L550-L587) | 首页快速添加读取 `course_preset_list` |

---

## 根因分析

### Bug 1：`_doResetToDemoData` 的 `coursePool` 与其他地方不一致

代码中存在 **4 处** 定义 12 门默认课程的位置，但其中 1 处与其他 3 处不一致：

| 位置 | 第10门课 | 一致性 |
|------|----------|:--:|
| `reset-data.ux` 页面显示 | **体育** | ✅ |
| `course-manager.ux` `defaultCourses` | **体育** | ✅ |
| `database.js` `resetCoursePresets` | **体育** | ✅ |
| `database.js` `_doResetToDemoData` `coursePool` | **计算机** | ❌ |

[**database.js:L700-L714**](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L700-L714) 的 `coursePool`：

```javascript
var coursePool = [
  { name: "数学", teacher: "王老师", location: "301教室" },
  { name: "语文", teacher: "周老师", location: "205教室" },
  { name: "英语", teacher: "李老师", location: "205教室" },
  { name: "物理", teacher: "吴老师", location: "实验室B" },
  { name: "化学", teacher: "郑老师", location: "实验室A" },
  { name: "生物", teacher: "黄老师", location: "实验室C" },
  { name: "历史", teacher: "刘老师", location: "102教室" },
  { name: "地理", teacher: "张老师", location: "103教室" },
  { name: "政治", teacher: "杨老师", location: "104教室" },
  { name: "计算机", teacher: "赵老师", location: "机房1" },   // ❌ 应该是"体育"
  { name: "音乐", teacher: "孙老师", location: "音乐室" },
  { name: "美术", teacher: "陈老师", location: "美术室" }
]
```

**影响**：`handleResetAll` 调用 `database.resetToDemoData()` → `_doResetToDemoData()`，使用这个 `coursePool` 生成课程表，所以课程表中出现了"计算机"而不是"体育"。

---

### Bug 2：`handleResetAll` 没有重置 `course_preset_list`

**调用链分析**：

```
用户点击"一键重置全部" 
  → reset-data.ux handleResetAll()
    → database.resetToDemoData()
      → _doResetToDemoData()
        → 重置 SQLite/Storage 中的课程数据 ✅
        → 重置 scheduleNames ✅
        → 重置 currentScheduleIndex ✅
        → 重置 course_preset_list ❌ 没有调用！
```

`handleResetAll` 只调用了 `database.resetToDemoData()`，但**没有调用** `database.resetCoursePresets()`。

而首页快速添加的数据来源是 `course_preset_list` 这个 storage key：

[**index.ux:L550-L587**](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L550-L587)：

```javascript
loadPresetCourses() {
  var COURSE_KEY = "course_preset_list"
  storage.get({
    key: COURSE_KEY,
    success: function(data) {
      if (data) {
        var list = JSON.parse(data)
        // ... 提取课程名到 quickCourseNames
      } else {
        self.presetCourses = []       // 数据为空 → 快速添加列表为空
        self.quickCourseNames = []
      }
    }
  })
}
```

**影响**：`resetToDemoData` 不清除/重置 `course_preset_list`，如果该 key 之前被清空或不存在，重置后首页快速添加就读不到任何课程名，显示"暂无已添加课程"。

---

## 修复方案

### 修复 1：统一 `coursePool`，将"计算机"改为"体育"

**文件**: [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L710)

```javascript
// 将
{ name: "计算机", teacher: "赵老师", location: "机房1" },
// 改为
{ name: "体育", teacher: "赵老师", location: "操场" },
```

### 修复 2：`handleResetAll` 中同时调用 `resetCoursePresets`

**文件**: [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L127-L131)

```javascript
// 当前代码
database.resetToDemoData(function(success) {
  self.fullConfirm = false
  self.fullDone = true
})

// 改为：先重置课程表，再重置预设课程列表
database.resetToDemoData(function(success) {
  database.resetCoursePresets(function(presetSuccess) {
    self.fullConfirm = false
    self.fullDone = true
  })
})
```

---

## 数据流图

```
┌─────────────────────────────────────────────────────────┐
│                  一键重置全部 handleResetAll              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  resetToDemoData()                                      │
│  ├── coursePool (12门课) ──→ 生成课程表 → SQLite/Storage │
│  │   ❌ 第10门是"计算机"，应该是"体育"                    │
│  ├── scheduleNames → ["课程表1", "课程表2"]               │
│  └── currentScheduleIndex → "0"                         │
│                                                         │
│  resetCoursePresets()  ← 缺失！                          │
│  └── course_preset_list → 首页快速添加的数据源            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 总结

| Bug | 根因 | 修复 |
|-----|------|------|
| 课程表出现"计算机" | `_doResetToDemoData` 的 `coursePool` 中"体育"被误写为"计算机" | 改 `coursePool` 第10项为"体育" |
| 快速添加不显示课程 | `handleResetAll` 没有调用 `resetCoursePresets`，`course_preset_list` 未被重置 | 在 `handleResetAll` 中串行调用 `resetCoursePresets` |