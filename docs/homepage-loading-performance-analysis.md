# 首页加载性能分析

## 现象

打开首页后，显示"加载中..."文字很长时间，其他页面没有这个问题。

## 首页加载流程分析

### 当前完整加载链路

```
onInit() 开始
├── [1] isLoading = true                          ← 显示"加载中..."
├── [2] store.getTheme()                          ← storage.get("appTheme")
├── [3] loadHomepageSettings()                    ← storage.get("homepage_settings")
├── [4] loadFontScale()                           ← storage.get("baseFontSize")
└── [5] database.init()                           ← 串行异步链
    ├── loadScheduleIndex()                       ← storage.get("currentScheduleIndex")
    └── migrateOldData()                          ← storage.get("allCourses") + storage.get("allCourses_0") + storage.set("allCourses_0")（首次）
        └── getAllCourses()                       ← storage.get("allCourses_0") + JSON.parse
            ├── self.schedule = schedule
            ├── self.isLoading = false            ← 隐藏"加载中..."（但此时页面数据还未就绪！）
            └── initAllModules()                  ← 8 个模块初始化
                ├── [6] clock.init()              ← 启动定时器
                ├── [7] quickAdd.init()           ← 无额外 storage 读取
                ├── [8] dayNav.init()             ← storage.get("hideWeekend")（异步）
                ├── [9] statusBar.init()          ← 启动定时器
                ├── [10] customContent.init()     ← storage.get("homepage_settings")（重复！）
                ├── [11] pinnedPages.init()       ← storage.get("pinned_pages")
                ├── [12] bottomButtons.init()     ← 无额外 storage 读取
                └── [13] classList.init()         ← storage.get("currentScheduleIndex") + storage.get("scheduleNames")
                    ├── loadDayClasses()          ← 处理课程数据
                    ├── startProgressTimer()      ← 启动定时器
                    ├── updateStatus()
                    └── startStatusTimer()        ← 启动定时器

onShow() 紧随其后触发（几乎同时）
├── [14] store.getTheme()                         ← 重复 [2]
├── [15] loadHomepageSettings()                   ← 重复 [3]
├── [16] loadFontScale()                          ← 重复 [4]
├── [17] loadPinnedPages()                        ← 重复 [11]
├── [18] quickAdd.loadPreset()                    ← storage.get("course_preset_list")
└── [19] store.getCurrentScheduleIndex() → database.setScheduleIndex() → store.getScheduleNames() → database.getAllCoursesWithIndex() → refreshClasses()
    └── $forceUpdate()                            ← 强制重新渲染
```

### 统计

| 阶段 | storage 读取次数 | 说明 |
|------|:---:|------|
| onInit 数据加载 | 5 次 | theme, homepage_settings, baseFontSize, currentScheduleIndex, allCourses |
| initAllModules | 4 次 | hideWeekend, homepage_settings(重复), pinned_pages, currentScheduleIndex(重复) + scheduleNames |
| onShow 重复加载 | 7 次 | theme, homepage_settings, baseFontSize, pinned_pages, course_preset_list, currentScheduleIndex, allCourses |
| **总计** | **16 次** | 每次都是异步磁盘 I/O |

---

## 根本原因分析

### 原因 1：`isLoading = false` 设置过早 ⭐⭐⭐

```javascript
// index.ux: onInit()
database.init(function() {
  database.getAllCourses(function(schedule) {
    self.schedule = schedule
    self.isLoading = false       // ← 这里就隐藏了"加载中..."
    console.log("[index] data loaded, " + schedule.length + " days")
    self.initAllModules()        // ← 但这里还有 8 个模块要初始化！
  })
})
```

`isLoading` 在 `initAllModules()` 之前就设为 `false`，用户看到"加载中..."消失后，页面还在逐步填充数据（课程列表、状态栏、进度条等），造成"加载完了但内容还在慢慢出现"的体验。

**影响**：用户感知的"加载中"时间被缩短了，但实际等待时间更长——因为 loading 消失后页面还在静默加载。

### 原因 2：`onShow()` 与 `onInit()` 重复加载 ⭐⭐⭐

`onShow()` 在页面显示时触发，几乎紧跟在 `onInit()` 之后。它做了和 `onInit()` 几乎完全相同的操作：

```javascript
// onShow() 中的重复操作
store.getTheme()              // 与 onInit 重复
loadHomepageSettings()        // 与 onInit 重复
loadFontScale()               // 与 onInit 重复
loadPinnedPages()             // 与 initAllModules 中的 pinnedPages.init() 重复
quickAdd.loadPreset()         // 额外读取
store.getCurrentScheduleIndex() → database.getAllCoursesWithIndex() → refreshClasses()  // 重新加载全部课程！
$forceUpdate()                // 强制重新渲染
```

**onShow 中重新加载全部课程数据**是最严重的性能问题——`database.getAllCoursesWithIndex()` 会重新从 storage 读取并 JSON.parse 整个课程表数据，然后调用 `refreshClasses()` 重新处理课程列表。

**影响**：首页实际上被加载了两次！第一次在 `onInit`，第二次在 `onShow`。

### 原因 3：存储读取重复 ⭐⭐

| 数据 | 读取次数 | 读取位置 |
|------|:---:|------|
| `homepage_settings` | 2 次 | `loadHomepageSettings()` + `customContent.init()` |
| `currentScheduleIndex` | 2 次 | `database.init()` → `loadScheduleIndex()` + `classList.init()` → `store.getCurrentScheduleIndex()` |
| `appTheme` | 2 次 | `onInit()` + `onShow()` |
| `baseFontSize` | 2 次 | `onInit()` + `onShow()` |
| `allCourses` | 2 次 | `onInit()` + `onShow()` |

### 原因 4：`database.init()` 串行异步链 ⭐

```javascript
// database.js
function initStorage(callback) {
  loadScheduleIndex(function() {        // 第1步：读索引
    migrateOldData(function() {          // 第2步：迁移旧数据（首次需 3 次 storage 操作）
      ready = true
      flushCallbacks()
      if (callback) callback()
    })
  })
}
```

`migrateOldData()` 在首次运行时需要：
1. `storage.get("allCourses")` — 读旧 key
2. `storage.get("allCourses_0")` — 检查新 key 是否存在
3. `storage.set("allCourses_0", val)` — 写入新 key（如果不存在）

每个操作都是异步的，串行执行。首次启动时数据库初始化需要 3-4 轮异步 I/O。

### 原因 5：8 个模块全部在初始化时加载 ⭐

`initAllModules()` 加载了 8 个模块，每个模块的 `init()` 都会立即执行。其中 4 个模块会触发额外的异步 storage 读取：

| 模块 | storage 读取 | 是否必要 |
|------|:---:|:---:|
| clock | 无 | 轻量 |
| quickAdd | 无 | 轻量 |
| dayNav | `hideWeekend` | 可延迟 |
| statusBar | 无 | 轻量 |
| **customContent** | `homepage_settings`（重复！） | 重复 |
| **pinnedPages** | `pinned_pages` | 可延迟 |
| bottomButtons | 无 | 轻量 |
| **classList** | `currentScheduleIndex` + `scheduleNames` | 核心 |

---

## 优化建议

### 优先级 1：消除 `onShow()` 重复加载（改动量：小，收益：高）

`onInit()` 和 `onShow()` 在首次进入时是连续执行的。可以用一个 flag 跳过 `onShow` 中的重载：

```javascript
onInit() {
  this._initialized = false
  // ... 现有加载逻辑 ...
  database.init(function() {
    database.getAllCourses(function(schedule) {
      self.schedule = schedule
      self.initAllModules()
      self._initialized = true   // 标记初始化完成
      self.isLoading = false     // 移到这里，在模块加载完成后才隐藏
    })
  })
},

onShow() {
  if (!this._initialized) return  // 首次进入时跳过，因为 onInit 已经做了
  // ... 仅做必要的刷新 ...
}
```

**预期效果**：减少 7 次 storage 读取，首页加载时间减半。

### 优先级 2：`isLoading` 延迟到模块加载完成后（改动量：小，收益：中）

将 `isLoading = false` 移到 `initAllModules()` 之后：

```javascript
database.getAllCourses(function(schedule) {
  self.schedule = schedule
  self.initAllModules()
  // 添加一个短暂延迟确保模块的回调完成
  setTimeout(function() {
    self.isLoading = false
  }, 100)
})
```

这样用户看到"加载中..."始终覆盖到数据真正就绪，体验更一致。

### 优先级 3：缓存重复读取的 storage 数据（改动量：中，收益：中）

在 `store.js` 中添加内存缓存：

```javascript
var _cache = {}

function cachedGet(key, defaultVal, callback) {
  if (_cache[key] !== undefined) {
    callback(_cache[key])
    return
  }
  storage.get({
    key: key,
    success: function(data) {
      _cache[key] = data || defaultVal
      callback(_cache[key])
    },
    fail: function() {
      _cache[key] = defaultVal
      callback(defaultVal)
    }
  })
}
```

消除 `homepage_settings` 和 `currentScheduleIndex` 的重复读取。

### 优先级 4：延迟非关键模块加载（改动量：中，收益：中）

将非关键模块的初始化延迟到页面渲染完成后：

```javascript
initAllModules() {
  // 关键模块：立即加载
  this._initModule('classList')
  this._initModule('dayNav')
  this._initModule('statusBar')
  this._initModule('clock')

  // 非关键模块：延迟加载
  var self = this
  setTimeout(function() {
    self._initModule('pinnedPages')
    self._initModule('customContent')
    self._initModule('quickAdd')
    self._initModule('bottomButtons')
  }, 50)
}
```

### 优先级 5：并行化 storage 读取（改动量：大，收益：低）

将多个独立的 storage 读取改为并行：

```javascript
// 当前：串行
store.getTheme(function(t) { ... })
self.loadHomepageSettings()
self.loadFontScale()

// 优化：并行
var pending = 3
function checkDone() {
  pending--
  if (pending === 0) {
    // 全部完成，继续下一步
  }
}
store.getTheme(function(t) { self.theme = t; checkDone() })
self.loadHomepageSettings(checkDone)
self.loadFontScale(checkDone)
```

---

## 对比：其他页面为什么不慢

| 页面 | onInit 操作 | storage 读取次数 | 说明 |
|------|------------|:---:|------|
| **首页 (index)** | 数据库初始化 + 8 模块 + 课程数据处理 | 16 次 | ⚠️ 最重 |
| 添加课程 (add-course) | 无数据库初始化 | 0-1 次 | 轻量 |
| 设置 (settings) | 读取主题 | 1 次 | 轻量 |
| 输入法 (chinese-input) | 读取字体大小 | 1-2 次 | 轻量 |
| 昵称编辑 (nickname-edit) | 读取主题 + 昵称 | 2 次 | 轻量 |

首页是唯一一个需要：
1. 初始化数据库（`database.init()`）
2. 加载全部课程数据
3. 初始化 8 个功能模块
4. 启动 4 个定时器（clock, status, progress, 另一个 status）

的页面，数据量和初始化复杂度远超其他页面。

---

## 总结

| 问题 | 严重程度 | 修复难度 | 预期收益 |
|------|:---:|:---:|:---:|
| `onShow()` 重复加载所有数据 | ⭐⭐⭐ | 低 | 加载时间减半 |
| `isLoading` 设置过早 | ⭐⭐ | 低 | 体验一致性 |
| 重复 storage 读取 | ⭐⭐ | 中 | 减少 2-4 次 I/O |
| 数据库初始化串行链 | ⭐ | 中 | 首次启动加速 |
| 8 模块全部加载 | ⭐ | 中 | 页面可交互更快 |

**推荐优先实施前两项**，改动最小、收益最大。