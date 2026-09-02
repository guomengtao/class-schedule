# 添加课程页面“保存”按钮点击无效原因分析

## 功能概述

添加课程页面 (`add-course.ux`) 是一个 4 步向导页面：
1. **第1步**：滑动选择预设课程
2. **第2步**：调整上课时间
3. **第3步**：输入位置（可选）
4. **第4步**：确认信息并点击“保存”按钮

点击保存后调用 `saveCourse()` → `database.insertCourse()` 将课程写入存储。

## 完整调用链

```
用户点击"保存"按钮
  → saveCourse()                                    [add-course.ux:443]
    → 检查 this.courseName 和 this.courseTime 是否为空
    → 构造 newCourse 对象
    → database.insertCourse(newCourse, callback)     [database.js:724]
      → ensureReady(callback)
      → insertCourseStorage / insertCourseSqlite
    → callback: showToast + router.back()
```

---

## 已发现的问题

### 问题 1：`saveCourse` 静默返回，无任何反馈（严重）

**位置：** [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L443-L463)

```javascript
saveCourse() {
    if (!this.courseName || !this.courseTime) {
      return    // ← 静默返回，无任何提示！
    }
    // ... 保存逻辑 ...
}
```

当 `this.courseName` 或 `this.courseTime` 为空字符串时，函数直接 `return`，**没有任何 toast 提示、没有任何视觉反馈**。用户点击保存按钮后，页面毫无反应，这就是“点击无效”的直接原因。

**触发场景：**

`courseName` 和 `courseTime` 在 `selectCourse()` 中设置，而 `selectCourse()` 在 `loadCourses()` 的回调中调用。`loadCourses()` 内部调用 `storage.get()`，是异步操作：

```javascript
loadCourses() {
    var self = this
    var storage = require("@system.storage")
    storage.get({
        key: COURSE_LIST_KEY,      // "course_preset_list"
        success: function(data) {
            // ... 设置 presetCourses ...
            self.selectCourse(self.courseIndex)  // ← 异步回调中设置
        },
        fail: function() {
            // ... 回退到默认课程 ...
            self.selectCourse(self.courseIndex)
        }
    })
}
```

初始值：
```javascript
private: {
    courseName: "",    // ← 空字符串
    courseTime: "",    // ← 空字符串
}
```

如果用户在 `storage.get` 完成之前快速点击到第4步并点击保存，此时 `courseName` 和 `courseTime` 仍为空字符串，`saveCourse` 静默返回。

**后果：** 用户点击保存按钮，页面无任何反应，仿佛按钮失效。

---

### 问题 2：`nextId` 未递增，重复添加时 ID 冲突（严重）

**位置：** [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L443-L463)

```javascript
saveCourse() {
    // ...
    var newCourse = {
      id: String(this.nextId),   // ← 使用 nextId，但从未递增
      // ...
    }
    database.insertCourse(newCourse, function(success) {
      if (success) {
        prompt.showToast({ message: "课程已添加" })
        router.back()
      } else {
        prompt.showToast({ message: "添加失败，请重试" })
      }
    })
    // ← 缺少 this.nextId++
}
```

`saveCourse` 使用了 `this.nextId` 作为课程 ID，但**从未递增**。对比 `index.ux` 中的 `makeCourse` 函数，它在调用 `insertCourse` 前会执行 `this.nextId++`。

数据库使用 `INSERT OR REPLACE`，主键为 `(id, day, schedule_index)`。如果用户连续添加两门课程（不退出页面），两门课程使用相同的 ID（初始值 `100`），后添加的课程会**覆盖先添加的课程**。

**场景复现：**
1. 用户添加课程 A，ID 为 `"100"`
2. 用户不退出页面，再次添加课程 B，ID 仍为 `"100"`
3. 如果课程 A 和 B 在同一天，课程 B 会替换课程 A
4. 用户只看到课程 B，课程 A 丢失

**对比 index.ux 的正确做法：**

```javascript
// index.ux makeCourse - 正确递增
this.nextId++
storage.set({ key: "index_nextId", value: String(this.nextId) })
database.insertCourse(newCourse, function(success) { ... })
```

---

### 问题 3：`add_course_day` 存储竞态条件（中等）

**位置：** [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L525-L530) 和 [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L225-L233)

**index.ux 写入：**
```javascript
openAddCoursePage() {
    var storage = require("@system.storage")
    storage.set({ key: "add_course_day", value: this.currentDay })   // 异步
    storage.set({ key: "add_course_nextId", value: String(this.nextId) })  // 异步
    router.push({ uri: "/pages/add-course" })   // 立即跳转
}
```

**add-course.ux 读取：**
```javascript
onInit() {
    // ...
    storage.get({
        key: "add_course_day",
        success: function(val) {
            self.day = val || ""
            if (!self.day) { self.setDefaultDay() }
        },
        fail: function() {
            self.day = ""
            self.setDefaultDay()
        }
    })
}
```

`storage.set` 是异步操作，`router.push` 是同步操作。当 `add-course` 页面的 `onInit` 执行 `storage.get` 时，`index.ux` 的 `storage.set` 可能还未完成。虽然 Vela JS 框架会将存储操作排队，但在极端情况下，`add_course_day` 可能读到旧值或空值。

**后果：** 课程可能被保存到错误的日期（`setDefaultDay` 使用当前系统日期），而不是用户在首页选择的日期。

---

### 问题 4：`onShow` 覆盖用户已输入的数据（中等）

**位置：** [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L243-L258)

```javascript
onShow() {
    var self = this
    store.getTheme(function(t) {
        self.theme = t
    })
    this.loadCourses()    // ← 每次页面显示时重新加载课程列表
    // ...
}
```

`onShow` 在每次页面变为可见时触发，包括从 `course-manager` 页面返回时。`loadCourses` 的异步回调中会调用 `selectCourse(self.courseIndex)`，这会**覆盖用户在步骤 2、3 中修改的时间和位置**：

```javascript
selectCourse(index) {
    this.courseIndex = index
    var c = this.presetCourses[index]
    this.courseName = c.name
    this.courseTeacher = c.teacher
    this.courseLocation = c.location    // ← 覆盖用户输入的位置
    // ... 时间也被覆盖 ...
    this.courseTime = c.time             // ← 覆盖用户调整的时间
}
```

**场景复现：**
1. 用户在步骤 1 选择课程"数学"
2. 用户在步骤 2 将时间从 `08:55-09:40` 调整为 `10:00-10:45`
3. 用户进入步骤 3，输入位置"301教室"
4. 用户跳转到 `course-manager` 管理课程后返回
5. `onShow` 触发 → `loadCourses` → `selectCourse` 被调用
6. 用户的时间和位置被重置为预设课程的默认值
7. 用户点击保存，时间和位置不是自己设置的

---

### 问题 5：`courseIndex` 越界风险（低）

**位置：** [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L322-L333)

```javascript
selectCourse(index) {
    this.courseIndex = index
    var c = this.presetCourses[index]    // ← 如果 index 越界，c 为 undefined
    this.courseName = c.name             // ← TypeError: Cannot read property 'name' of undefined
}
```

如果用户在 `course-manager` 中删除了课程，返回 `add-course` 时 `onShow` 触发 `loadCourses`，调用 `selectCourse(self.courseIndex)`。如果 `courseIndex` 指向的课程已被删除（例如之前选了第 5 门课，但列表现在只有 3 门），`presetCourses[5]` 为 `undefined`，访问 `.name` 会抛出异常，导致页面崩溃。

---

## 问题影响汇总

| 序号 | 问题 | 严重程度 | 用户可见症状 |
|------|------|----------|-------------|
| 1 | `saveCourse` 静默返回 | **高** | 点击保存按钮无任何反应 |
| 2 | `nextId` 未递增 | **高** | 连续添加课程时旧课程被覆盖 |
| 3 | `add_course_day` 竞态 | 中 | 课程保存到错误的日期 |
| 4 | `onShow` 覆盖用户数据 | 中 | 用户设置的时间和位置被重置 |
| 5 | `courseIndex` 越界 | 低 | 页面崩溃 |

---

## 修复建议

### 修复 1：`saveCourse` 静默返回时给出提示

```javascript
saveCourse() {
    if (!this.courseName) {
      prompt.showToast({ message: "请先选择课程" })
      return
    }
    if (!this.courseTime) {
      prompt.showToast({ message: "请先设置时间" })
      return
    }
    // ... 保存逻辑 ...
}
```

### 修复 2：`saveCourse` 中递增 `nextId`

```javascript
saveCourse() {
    // ...
    var newCourse = {
      id: String(this.nextId),
      // ...
    }
    this.nextId++    // ← 递增
    database.insertCourse(newCourse, function(success) {
      // ...
    })
}
```

### 修复 3：使用 `router.push` 的 `params` 传递参数，替代 `storage.set`

```javascript
// index.ux
openAddCoursePage() {
    router.push({
        uri: "/pages/add-course",
        params: { day: this.currentDay, nextId: String(this.nextId) }
    })
}

// add-course.ux onInit
onInit() {
    // 直接从路由参数读取，无需 storage.get
    // Vela JS 的 router 可能支持 query 参数
}
```

如果 Vela JS 不支持路由参数传递，则确保 `storage.set` 在跳转前完成：

```javascript
openAddCoursePage() {
    var storage = require("@system.storage")
    var self = this
    storage.set({
        key: "add_course_day",
        value: this.currentDay,
        success: function() {
            storage.set({
                key: "add_course_nextId",
                value: String(self.nextId),
                success: function() {
                    router.push({ uri: "/pages/add-course" })
                }
            })
        }
    })
}
```

### 修复 4：`onShow` 中避免覆盖用户数据

```javascript
onShow() {
    var self = this
    store.getTheme(function(t) {
        self.theme = t
    })
    // 只在首次加载时调用 loadCourses，不在 onShow 中重复调用
    // 或者：检查数据是否已被用户修改，避免覆盖
    
    // 仅刷新课程列表，不重新选择课程
    this.refreshCourseList()   // 新方法：只更新 presetCourses，不调 selectCourse
}
```

或者更简单的方式——在 `onShow` 中只刷新 `presetCourses` 列表，不调用 `selectCourse`：

```javascript
refreshCourseList() {
    var self = this
    var storage = require("@system.storage")
    storage.get({
        key: COURSE_LIST_KEY,
        success: function(data) {
            if (data) {
                try {
                    var list = JSON.parse(data)
                    if (list && list.length > 0) {
                        self.presetCourses = self.sortByTime(list)
                    }
                } catch (e) {
                    // 保持现有列表
                }
            }
        }
    })
}
```

### 修复 5：`selectCourse` 添加越界检查

```javascript
selectCourse(index) {
    if (index < 0 || index >= this.presetCourses.length) {
        index = 0
    }
    if (this.presetCourses.length === 0) {
        return
    }
    this.courseIndex = index
    var c = this.presetCourses[index]
    this.courseName = c.name
    // ...
}
```

---

## 建议修复优先级

1. **立即修复**：问题 1（静默返回提示）+ 问题 2（`nextId` 递增），这是导致“保存按钮无效”和“课程丢失”的直接原因。
2. **尽快修复**：问题 4（`onShow` 覆盖数据），影响用户体验。
3. **后续优化**：问题 3（竞态条件）+ 问题 5（越界检查），增强鲁棒性。