# 首页“快速发布”课程点击发布失败原因分析

## 功能概述

首页 (`index.ux`) 底部的“快速添加”功能允许用户快速将预设课程添加到当前日期的课表中。点击 **快速添加** 展开面板，再点击课程名称即可发布。

## 完整调用链

```
用户点击课程名称
  → quickAddCourse(name)                          [index.ux:628]
    → 从 presetCourses 中查找教师和地点
    → makeCourse(name, quickAddTime, teacher, location)  [index.ux:607]
      → 构造 newCourse 对象 (id, day, name, time, teacher, location, notes)
      → this.nextId++
      → database.insertCourse(newCourse, callback)       [database.js:724]
        → ensureReady(callback)                          [database.js:161]
          → 如果 ready=true，直接调用 callback
          → 如果 ready=false，加入 pendingCallbacks 队列
        → insertCourseStorage(course, callback)          [database.js:408]  (非 SQLite 模式)
          或 insertCourseSqlite(course, callback)        [database.js:392]  (SQLite 模式)
```

## 已发现的问题

### 问题 1：`saveToStorage` 无错误处理（严重）

**位置：** [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L248-L253)

```javascript
function saveToStorage(schedule) {
  storage.set({
    key: getStorageKey(),
    value: JSON.stringify(schedule)
  })
}
```

`storage.set()` 是异步操作，但此处**未设置 `success` 和 `fail` 回调**。如果存储操作失败（存储空间不足、权限被拒绝、数据过大等），错误会被**静默丢弃**，没有任何日志或用户提示。

**后果：** 课程数据写入失败，但用户完全不知道，以为发布成功。

---

### 问题 2：回调在 `storage.set` 完成前就触发（严重）

**位置：** [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L408-L449)

```javascript
function insertCourseStorage(course, callback) {
  storage.get({
    key: getStorageKey(),
    success: function(val) {
      // ... 读取并修改 schedule ...
      saveToStorage(schedule)   // ← 异步 storage.set
      log("insertCourseStorage success")
      callback(true)            // ← 同步立即调用 callback
    },
    fail: function(e) {
      callback(false)
    }
  })
}
```

调用顺序是：
1. `storage.get` 成功 → 在 success 回调中修改数据
2. 调用 `saveToStorage(schedule)` → 发起异步 `storage.set`
3. **立即**调用 `callback(true)` → 触发 `makeCourse` 的回调

在 `makeCourse` 的回调中：

```javascript
database.insertCourse(newCourse, function() {
  prompt.showToast({ message: "已添加 " + name })
  database.getAllCourses(function(schedule) {   // ← 发起 storage.get
    self.schedule = schedule
    self.loadDayClasses()
  })
})
```

虽然 Vela JS 框架内 `storage.set` 和 `storage.get` 操作会排队执行，但 `callback(true)` 是同步调用的，在 `storage.set` 真正完成之前就已触发。如果 `storage.set` 写入耗时较长，`getAllCourses` 中的 `storage.get` 可能读到**旧数据**，导致新添加的课程在 UI 上不显示。

**后果：** 用户看到"已添加"提示，但课表列表中看不到新课程，或刷新后才出现。

---

### 问题 3：`nextId` 未持久化导致 ID 冲突（严重）

**位置：** [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L117)

```javascript
private: {
  nextId: 50,
  // ...
}
```

`nextId` 初始化为 `50`，仅存在于页面内存中。每次页面被销毁重建（例如从其他页面返回首页，或手环应用被系统回收后重新打开），`nextId` 都会**重置为 `50`**。

数据库主键为 `(id, day, schedule_index)`，使用 `INSERT OR REPLACE` 语句：

```sql
INSERT OR REPLACE INTO courses (id, day, name, time, teacher, location, notes, schedule_index)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

**场景复现：**
1. 用户快速添加了 3 门课程，ID 分别为 `50`、`51`、`52`
2. 用户切换到其他页面再返回首页，`nextId` 重置为 `50`
3. 用户再次快速添加课程，新课程 ID 为 `50`，与第 1 步添加的课程 ID 冲突
4. `INSERT OR REPLACE` 将**已有课程替换为新课程**，旧数据丢失
5. 如果新课程和旧课程日期不同，则不会冲突（因为主键包含 `day`）

**后果：** 同一天添加的课程可能被覆盖，用户发现之前添加的课程消失了，但没有任何错误提示。

---

### 问题 4：`makeCourse` 回调忽略失败结果（中等）

**位置：** [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L607-L619)

```javascript
makeCourse(name, time, teacher, location) {
  var self = this
  // ...
  database.insertCourse(newCourse, function() {   // ← 参数未接收 result
    prompt.showToast({ message: "已添加 " + name })  // ← 无论成功失败都显示
    database.getAllCourses(function(schedule) {
      self.schedule = schedule
      self.loadDayClasses()
    })
  })
}
```

回调定义为 `function()` 而非 `function(result)`，**完全忽略了 `insertCourse` 返回的成败状态**。当 `insertCourseStorage` 的 `storage.get` 失败时，会调用 `callback(false)`，但 `makeCourse` 的回调仍然会显示"已添加"的 toast。

**后果：** 即使用户看到"已添加"提示，课程实际上可能没有保存成功。

---

### 问题 5：`insertCourseStorage` JSON 解析失败导致数据丢失（中等）

**位置：** [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L411-L420)

```javascript
success: function(val) {
  var schedule = []
  if (val) {
    try { schedule = JSON.parse(val) } catch (e) { schedule = [] }
  }
  // ... 只有新课程被 push 到 schedule ...
  saveToStorage(schedule)   // ← 保存的 schedule 只有新课程，旧数据丢失
}
```

如果存储中的 JSON 数据损坏（例如写入中断、存储介质错误），`JSON.parse` 会抛出异常，`schedule` 被重置为空数组 `[]`。然后 `saveToStorage` 会**覆盖原有数据**，只保存新添加的这一门课程，之前所有的课程数据全部丢失。

**后果：** 极端情况下，用户可能丢失全部课表数据。

---

## 问题影响汇总

| 序号 | 问题 | 严重程度 | 用户可见症状 |
|------|------|----------|-------------|
| 1 | `saveToStorage` 无错误处理 | 高 | 无声失败，课程未保存 |
| 2 | 回调在 `storage.set` 完成前触发 | 高 | 显示"已添加"但看不到课程 |
| 3 | `nextId` 未持久化 | 高 | 旧课程被覆盖消失 |
| 4 | 回调忽略失败结果 | 中 | 失败时仍显示成功提示 |
| 5 | JSON 解析失败导致数据丢失 | 中 | 全部课表丢失 |

## 修复建议

### 修复 1：为 `saveToStorage` 添加错误处理

```javascript
function saveToStorage(schedule, callback) {
  storage.set({
    key: getStorageKey(),
    value: JSON.stringify(schedule),
    success: function() {
      if (callback) callback(true)
    },
    fail: function(e) {
      logErr("saveToStorage failed: " + JSON.stringify(e))
      if (callback) callback(false)
    }
  })
}
```

### 修复 2：等待 `storage.set` 完成后再调用回调

在 `insertCourseStorage` 中，将 `callback(true)` 移到 `saveToStorage` 的 `success` 回调中：

```javascript
function insertCourseStorage(course, callback) {
  storage.get({
    key: getStorageKey(),
    success: function(val) {
      // ... 修改 schedule ...
      saveToStorage(schedule, function(success) {
        callback(success)
      })
    },
    fail: function(e) {
      callback(false)
    }
  })
}
```

### 修复 3：持久化 `nextId`

在 `onInit` 中从 storage 读取 `nextId`，在每次递增后保存：

```javascript
// 读取
storage.get({
  key: "index_nextId",
  success: function(val) {
    self.nextId = parseInt(val) || 50
  }
})

// 每次递增后保存
this.nextId++
storage.set({
  key: "index_nextId",
  value: String(this.nextId)
})
```

### 修复 4：`makeCourse` 回调检查结果

```javascript
database.insertCourse(newCourse, function(success) {
  if (success) {
    prompt.showToast({ message: "已添加 " + name })
    database.getAllCourses(function(schedule) {
      self.schedule = schedule
      self.loadDayClasses()
    })
  } else {
    prompt.showToast({ message: "添加失败，请重试" })
  }
})
```

### 修复 5：JSON 解析失败时保留原始数据

```javascript
var schedule = []
if (val) {
  try {
    schedule = JSON.parse(val)
  } catch (e) {
    logErr("JSON parse failed, data may be corrupted")
    callback(false)  // 不保存，避免覆盖
    return
  }
}
```

---

## 建议修复优先级

1. **立即修复**：问题 1 + 问题 2（`saveToStorage` 错误处理 + 回调时序），这两个问题是导致“发布失败”的最直接原因。
2. **尽快修复**：问题 3（`nextId` 持久化），防止课程被覆盖丢失。
3. **后续优化**：问题 4（回调检查结果）+ 问题 5（JSON 解析保护），增强鲁棒性。