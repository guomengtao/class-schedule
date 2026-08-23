# 课程排序不生效 — 完整根因分析

## 现象

用户添加"美术"课程（时间 08:00 - 08:45），在主页课程卡片列表中，美术始终排在末尾，不按上课时间排序。

## 两次修复尝试，均未触及真正的问题

### 第一次修复：原地 sort → slice 副本

修改了 `sortByTime` 用 `list.slice()` 创建新数组，确保 Quick App 响应式触发。

**无效原因**：虽然 `sortByTime` 本身修复了，但主页课程卡片**根本没有调用 `sortByTime`**。

### 第二次修复：在 course-manager / add-course / index preset 加排序

在 `course-manager.ux`、`add-course.ux`、`index.ux` 的 `presetCourses` 加载处加了排序。

**无效原因**：主页课程卡片的数据来源是 `this.schedule`（数据库），不是 `presetCourses`（预设课程列表）。

---

## 真正的根因

### 数据流

```
添加课程 → 数据库 (database) → schedule (全局数据) → loadDayClasses() → currentClasses → 页面渲染
                                                                              ↑
                                                                        这里没有排序！
```

### 两个数据结构，用了不同的排序

| 数据结构 | 用途 | 排序？ |
|------|------|:--:|
| `presetCourses` | 快速添加区域、课程管理页 | ✅ 已加（但这不影响主页卡片） |
| `currentClasses` | **主页课程卡片列表** ← 用户看到的 | ❌ **没有排序！** |

### 代码证据

```javascript
// index.ux - loadDayClasses() (line 237)
// 此函数负责构建主页显示的课程卡片列表

loadDayClasses() {
    var rawClasses = dayData ? dayData.classes : []
    var classes = []
    for (var j = 0; j < rawClasses.length; j++) {
      var src = rawClasses[j]
      classes.push({ id: src.id, name: src.name, time: src.time, ... })
    }
    this.currentClasses = classes        // ← 直接赋值，没有排序！
    // ...
}
```

```javascript
// index.ux - updateStatus() (line 720)
// 此函数只用于状态栏（正在上课/即将上课），不涉及卡片渲染

parsed.sort(function(a, b) { return a.startMin - b.startMin })  // ← 这里有排序，但只用于状态栏
```

**结论**：`updateStatus()` 用于顶部状态栏的文字提示，`loadDayClasses()` 用于下面的课程卡片列表。两个函数独立，排序只在状态栏做了，卡片列表没做。

### 用户看到的页面

```
┌──────────────────────────────────────┐
│ 星期一  [今] [明]                     │
│ 📚 正在上课：语文 剩余15分钟           │  ← updateStatus() 排序 ✅
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ 语文  08:00-08:45  301教室       │ │  ← loadDayClasses() 没排序 ❌
│ ├──────────────────────────────────┤ │
│ │ 数学  08:55-09:40  301教室       │ │
│ ├──────────────────────────────────┤ │
│ │ 英语  10:00-10:45  205教室       │ │
│ ├──────────────────────────────────┤ │
│ │ 美术  08:00-08:45  美术室  ← 末尾│ │  ← 应该是第二条！
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 修复

在 `loadDayClasses()` 中，`this.currentClasses` 赋值前加 `sortByTime`：

```javascript
// 修复前
this.currentClasses = classes

// 修复后
this.currentClasses = this.sortByTime(classes)
```

### 修复后效果

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ 语文  08:00-08:45  301教室       │ │  ← 08:00
│ ├──────────────────────────────────┤ │
│ │ 美术  08:00-08:45  美术室       │ │  ← 08:00（同时间按原序）
│ ├──────────────────────────────────┤ │
│ │ 数学  08:55-09:40  301教室       │ │  ← 08:55
│ ├──────────────────────────────────┤ │
│ │ 英语  10:00-10:45  205教室       │ │  ← 10:00
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 修改文件

| 文件 | 修改内容 |
|------|------|
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) | `loadDayClasses()` 中 `this.currentClasses = this.sortByTime(classes)` |

---

## 教训

| 误区 | 实际情况 |
|------|------|
| 以为 `sortByTime` 没生效 | `sortByTime` 本身没问题，但主页卡片没调用它 |
| 以为排序了 presetCourses 就够了 | `presetCourses` ≠ 主页卡片数据，两个独立数据源 |
| 以为 `updateStatus` 的排序会影响卡片 | `updateStatus` 只用于顶部状态栏，不影响卡片渲染 |

**核心原则**：排查排序不生效时，先确认数据流 — 页面渲染用的是哪个数据源，那个数据源有没有排序。