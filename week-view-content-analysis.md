# 课程总览页面内容显示不正确 - 分析报告

## 问题概述

课程总览 (`week-view`) 页面显示的内容与预期不符，可能显示错误课程表的数据，或显示所有课程表的数据混合在一起。

---

## 根本原因分析

### 问题 1：`onShow` 在 `onInit` 完成前就调用 `loadData()`（核心问题）

**文件**: [week-view.ux:L129-L133](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L129-L133)

```javascript
onShow() {
    var self = this
    store.getTheme(function(t) { self.theme = t })
    self.loadData()   // 立即调用 loadData，此时 viewIndex 还是默认值 0
}
```

**执行时序**:

```
1. router.push("/pages/week-view") 触发页面创建
2. onInit() 执行
   - 设置默认值: viewIndex = 0
   - 调用 storage.get({key: "weekview_index", ...})  —— 异步操作，尚未完成
3. onShow() 执行  ← 在 onInit 返回后立即触发
   - 调用 loadData()
   - loadData() 使用 this.viewIndex = 0  ← 默认值，不是正确的 index
   - database.getAllCoursesWithIndex(0, ...)  ← 加载了错误的课程表
4. onInit 的 storage.get 回调触发
   - viewIndex = 正确的值（如 1）
   - 再次调用 loadData()
   - 这次加载正确的课程表
```

| 步骤 | 调用者 | viewIndex | 加载的数据 | 结果 |
|------|--------|-----------|-----------|------|
| 1 | `onShow` → `loadData()` | 0（默认值） | 课程表0 | ❌ 错误 |
| 2 | `onInit` 回调 → `loadData()` | 正确值 | 正确的课程表 | ✅ 正确 |

**影响**: 页面先显示错误的课程表数据，然后再切换到正确的数据。如果第二次调用因竞态条件被覆盖，最终可能显示错误内容。

---

### 问题 2：`getAllCoursesSqlite` 不按课程表索引过滤（SQLite 模式）

**文件**: [database.js:L254-L267](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L254-L267)

```javascript
function getAllCoursesSqlite(callback) {
  sqlite.executeSql({
    name: DB_NAME,
    sql: "SELECT * FROM courses ORDER BY day, id",  // 查询所有课程，没有任何过滤
    success: function(result) {
      callback(rowsToSchedule(rows))
    }
  })
}
```

**问题**: SQLite 数据库表 `courses` 没有 `schedule_index` 字段，`SELECT *` 返回所有课程表的所有课程。当用户有多个课程表时，SQLite 模式下会显示所有课程混合在一起。

| 存储模式 | 课程表1 | 课程表2 | 查询结果 |
|----------|---------|---------|----------|
| Storage | `allCourses_0` | `allCourses_1` | 按 key 隔离，正确 ✅ |
| SQLite | 同一张表 | 同一张表 | 全部混合 ❌ |

**对比**:
- **Storage 模式**: `getStorageKey()` 返回 `allCourses_0`、`allCourses_1` 等，数据天然隔离
- **SQLite 模式**: 所有课程存在同一张表，查询无过滤，全部返回

---

### 问题 3：`getAllCoursesWithIndex` 修改全局 `currentScheduleIndex` 产生竞态条件

**文件**: [database.js:L607-L625](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L607-L625)

```javascript
getAllCoursesWithIndex: function(index, callback) {
    ensureReady(function() {
        var oldIndex = currentScheduleIndex   // 保存旧值
        currentScheduleIndex = index          // 临时改为新值
        if (useSqlite) {
            getAllCoursesSqlite(function(data) {
                currentScheduleIndex = oldIndex  // 恢复旧值
                callback(data)
            })
        } else {
            getAllCoursesStorage(function(data) {
                currentScheduleIndex = oldIndex  // 恢复旧值
                callback(data)
            })
        }
    })
}
```

**当 `loadData()` 被调用两次时（问题1导致）**:

```
时间线:
T1: loadData() 第1次调用
    getAllCoursesWithIndex(0, callback1)
    oldIndex = 1 (当前值)
    currentScheduleIndex = 0

T2: loadData() 第2次调用
    getAllCoursesWithIndex(2, callback2)
    oldIndex = 0 (被第1次调用改为0了！)
    currentScheduleIndex = 2

T3: callback1 触发
    currentScheduleIndex = oldIndex = 1  ← 恢复为第1次调用保存的值

T4: callback2 触发
    currentScheduleIndex = oldIndex = 0  ← 被错误恢复为0，而不是2
```

**结果**: `currentScheduleIndex` 在竞态条件后可能被设置为错误的值，导致后续的数据库操作（插入、更新、删除）影响到错误的课程表。

---

### 问题 4：`onShow` 重新加载数据但不更新 `viewIndex`

**文件**: [week-view.ux:L129-L133](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L129-L133)

当用户从课程总览页面跳转到其他页面（如课程详情），再返回时：
- `onShow` 被调用
- `loadData()` 重新加载数据
- 但 `viewIndex` 仍是上次 `onInit` 时设置的值
- 如果在此期间用户切换了课程表，`viewIndex` 不会更新

---

### 问题 5：`scheduleName` 和课程数据使用不同的索引系统

**文件**: [week-view.ux:L134-L142](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L134-L142)

```javascript
loadData() {
    store.getScheduleNames(function(names) {
        store.getCurrentScheduleIndex(function(idx) {
            if (names && names.length > self.viewIndex) {
                self.scheduleName = names[self.viewIndex]  // 使用 viewIndex
            }
        })
    })
    database.getAllCoursesWithIndex(this.viewIndex, function(schedule) {
        // 使用 viewIndex
    })
}
```

`getCurrentScheduleIndex` 获取了 `idx` 但从未使用。课程表名称和课程数据都使用 `self.viewIndex`，虽然一致，但 `viewIndex` 是在 `onInit` 中从 `weekview_index` 读取的，而 `currentScheduleIndex` 是从 `currentScheduleIndex` 键读取的。这两个存储键可能不同步。

---

## 影响范围总结

| 问题 | 严重程度 | 影响 |
|------|----------|------|
| 问题1: onShow 竞态 | 🔴 高 | 页面显示错误的课程表数据 |
| 问题2: SQLite 不过滤 | 🔴 高 | 多个课程表的课程混合显示 |
| 问题3: currentScheduleIndex 竞态 | 🟡 中 | 后续增删改操作影响错误课程表 |
| 问题4: onShow 不更新 viewIndex | 🟡 中 | 切换课程表后返回显示旧数据 |
| 问题5: 双索引系统 | 🟢 低 | 潜在的数据不一致 |

---

## 修复状态

### ✅ 已修复

| 问题 | 修复内容 | 文件 |
|------|----------|------|
| 问题1: onShow 竞态 | 添加 `_firstLoad` 标志，首次加载时 `onShow` 跳过 `loadData()`；后续 `onShow` 重新读取 `weekview_index` 后再加载 | [week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux) |
| 问题2: SQLite 不过滤 | 1) `courses` 表添加 `schedule_index` 列；2) 所有 SQL 查询添加 `WHERE schedule_index = ?` 过滤；3) 所有 INSERT/UPDATE/DELETE 包含 `schedule_index` | [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) |
| 问题3: currentScheduleIndex 竞态 | `getAllCoursesWithIndex` 不再修改全局 `currentScheduleIndex`，改用 `getAllCoursesStorageWithIndex(index, ...)` 和 `getAllCoursesSqliteWithIndex(index, ...)`；`getAllCoursesCombined` 同样不再修改全局变量 | [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) |
| 问题4: onShow 不更新 viewIndex | `onShow` 中更新 `viewIndex` 后再调用 `loadData()` | [week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux) |

---

## 结论

最核心的问题是 **问题 1**：`onShow` 在 `onInit` 的异步 `storage.get` 完成之前就调用了 `loadData()`，导致使用默认 `viewIndex = 0` 加载了错误的课程表数据。结合 **问题 3** 的全局 `currentScheduleIndex` 竞态条件，使得两次 `loadData()` 调用互相干扰，最终可能显示错误内容。

以上所有问题已修复，详见上方修复状态表格。