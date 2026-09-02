# 新增课程表自动带课程 Bug 分析

## 问题描述

新增课程表时，新课程表应保持空白，但有时会显示已有课程表的课程数据。

## 涉及文件

- [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L255-L268) - 课程表管理页面，`addSchedule()` 方法
- [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) - 数据库层，`getAllCourses()`、`getAllCoursesStorage()`、`getAllCoursesSqlite()`

## 根因分析

### 当前流程

```
用户点击"新增课程表"
  → addSchedule()
    → 只往 scheduleNames 追加新名字
    → 没有创建空课程数据
  → loadData() 刷新列表
用户点击新课程表
  → selectSchedule(index)
    → setScheduleIndex(index) 设置 currentScheduleIndex
    → router.back() 回到首页
首页 onShow()
  → getAllCourses()
    → loadScheduleIndex() 读取 currentScheduleIndex
    → getAllCoursesSqlite() 或 getAllCoursesStorage()
```

### 两个潜在问题

**问题 1：SQLite 路径 - `schedule_index` 列不存在（旧库兼容）**

[database.js 第 255-270 行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L255-L270)

```javascript
function getAllCoursesSqlite(callback) {
  sqlite.executeSql({
    name: DB_NAME,
    sql: "SELECT * FROM courses WHERE schedule_index = ? ORDER BY day, id",
    args: [String(currentScheduleIndex)],
    ...
  })
}
```

如果数据库是旧版本创建的，`courses` 表可能没有 `schedule_index` 列，SQL 会报错，fallback 到 `callback([])`，但实际行为不确定。

**问题 2：存储路径 - `getAllCoursesStorage` 使用模块级变量（竞态风险）**

[database.js 第 366-368 行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L366-L368)

```javascript
function getAllCoursesStorage(callback) {
  getAllCoursesStorageWithIndex(currentScheduleIndex, callback)
}
```

`currentScheduleIndex` 是模块级变量（第 17 行），在异步回调中可能被其他调用修改，导致读取到错误的 schedule_index。

**问题 3：`addSchedule()` 没有初始化空课程数据**

[schedule-manager.ux 第 255-268 行](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L255-L268)

```javascript
addSchedule() {
    // 只添加名字，不创建空数据
    names.push(newName)
    store.setScheduleNames(names, function() {
      self.loadData()
    })
}
```

新增课程表只添加了名字，没有显式初始化空课程数据，依赖数据库查询返回空结果。

## 推荐修复方案

### 方案 1：`addSchedule()` 中显式初始化空课程数据（推荐）

在 `addSchedule()` 中，新增名字后，对于存储模式显式保存空数组，对于 SQLite 模式确保不写入任何课程。

```javascript
addSchedule() {
    var self = this
    var names = []
    for (var i = 0; i < this.scheduleList.length; i++) {
      names.push(this.scheduleList[i].name)
    }
    var newName = "课程表" + (names.length + 1)
    var counter = 1
    while (names.indexOf(newName) !== -1) {
      newName = "课程表" + (names.length + 1) + "(" + counter + ")"
      counter++
    }
    var newIndex = names.length
    names.push(newName)
    store.setScheduleNames(names, function() {
      // 显式初始化空课程数据
      database.saveEmptySchedule(newIndex, function() {
        prompt.showToast({ message: "课程表已添加" })
        self.loadData()
      })
    })
}
```

同时在 `database.js` 新增：

```javascript
saveEmptySchedule: function(index, callback) {
    if (useSqlite) {
      // SQLite 模式：不需要额外操作，新 schedule_index 自然没有数据
      if (callback) callback()
    } else {
      // 存储模式：显式保存空数组
      storage.set({
        key: STORAGE_KEY + "_" + index,
        value: JSON.stringify([]),
        success: function() { if (callback) callback() },
        fail: function() { if (callback) callback() }
      })
    }
}
```

### 方案 2：`getAllCoursesStorage` 改为传参而非读模块变量

```javascript
// 修改前
function getAllCoursesStorage(callback) {
  getAllCoursesStorageWithIndex(currentScheduleIndex, callback)
}

// 修改后
getAllCourses: function(callback) {
    ensureReady(function() {
      loadScheduleIndex(function() {
        if (useSqlite) {
          getAllCoursesSqlite(callback)
        } else {
          getAllCoursesStorageWithIndex(currentScheduleIndex, callback)
        }
      })
    })
  },
```

### 方案 3：SQLite 建表时确保 `schedule_index` 列存在

在 `ensureTable()` 或初始化时检查 `schedule_index` 列，不存在则 ALTER TABLE 添加。

## 建议

优先采用 **方案 1 + 方案 2** 组合，既治标（显式初始化空数据）又治本（消除竞态风险）。