# 首页 8 模块加载分析与加速方案

## 当前加载流程

### 阶段 1：模块解析（页面脚本顶层，同步阻塞）

```javascript
// index-full.ux 脚本顶层，export default 之前
loadModule("clock",       require("./modules/clock.js"))       // 54 行
loadModule("quickAdd",    require("./modules/quick-add.js"))    // 132 行
loadModule("dayNav",      require("./modules/day-nav.js"))      // 119 行
loadModule("statusBar",   require("./modules/status-bar.js"))   // 105 行
loadModule("customContent",require("./modules/custom-content.js"))// 141 行
loadModule("pinnedPages", require("./modules/pinned-pages.js")) // 32 行
loadModule("bottomButtons",require("./modules/bottom-buttons.js"))// 29 行
loadModule("classList",   require("./modules/class-list.js"))   // 170 行
```

**关键问题**：这 8 个 `require()` 在页面脚本解析阶段**同步执行**。无论用户在设置中关闭了多少个模块，这 8 个文件都会被加载、解析、执行。

**总代码量**：约 782 行 JS 代码在页面渲染前全部解析执行。

### 阶段 2：数据加载（onInit 异步）

```
onInit()
  ├─ store.getTheme()                            ← async
  ├─ loadHomepageSettings()                       ← async (storage.get)
  ├─ setTimeout 8000ms 超时兜底
  └─ database.init()                              ← async
      └─ database.getAllCourses()                 ← async
          └─ store.getBaseFontSize()              ← async
              └─ initAllModules()                 ← 初始化全部 8 个模块
```

### 阶段 3：模块初始化（initAllModules，无条件全部执行）

[initAllModules](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/index-full.ux#L353-L386) 遍历所有 8 个模块，**无条件**调用 `mod.init(self)`：

```javascript
for (var i = 0; i < moduleNames.length; i++) {
  var mod = modules[moduleNames[i].key]
  if (mod && mod.init) {
    try { mod.init(self) } catch (e) { ... }
  }
}
```

### 阶段 4：模板渲染（受 settings 控制）

模板中的 `if="{{ showTime }}"`、`if="{{ showQuickAdd }}"` 等**只控制 UI 显示/隐藏**，不影响模块加载和初始化。

---

## 核心问题：关闭设置 ≠ 加速

| 模块 | settings 开关 | 关闭后模板不渲染 | 但模块仍被 require | 但模块仍被 init |
|------|:---:|:---:|:---:|:---:|
| clock | `showTime` | ✅ 不渲染 | ✅ 仍加载 | ✅ 仍初始化（创建 timer） |
| quickAdd | `showQuickAdd` | ✅ 不渲染 | ✅ 仍加载 | ✅ 仍初始化（挂载方法） |
| dayNav | `showDayNavZong/Jin/Ming` | ⚠️ 部分隐藏按钮 | ✅ 仍加载 | ✅ 仍初始化（设置 day/index） |
| statusBar | `showStatusBar` | ✅ 不渲染 | ✅ 仍加载 | ✅ 仍初始化（创建 timer） |
| customContent | `showCustomContent` | ✅ 不渲染 | ✅ 仍加载 | ⚠️ 仍加载并轮播 |
| pinnedPages | `showPinnedBar` | ✅ 不渲染 | ✅ 仍加载 | ✅ 仍初始化（加载列表） |
| bottomButtons | 无开关 | N/A | ✅ 仍加载 | ✅ 仍初始化 |
| classList | 无开关 | N/A | ✅ 仍加载 | ✅ 仍初始化（加载课表名） |

**结论：用户关闭 6 个模块，对于首页打开速度没有帮助。** 8 个模块的 JS 文件全部被同步加载和异步初始化，时间消耗不变。

---

## 8 个模块的 init() 工作量分析

| 模块 | init 做的事 | 耗时估计 | 关闭后是否可跳过 |
|------|------------|:---:|:---:|
| **clock** | 挂载 `startClockTimer`/`updateClock`/`stopClockTimer`；启动 1 秒间隔 timer | ⚡轻 | ✅ 可跳过 |
| **quickAdd** | 挂载完整的快速添加对象（toggle/loadPreset/addCourse/calcNext） | ⚡轻 | ✅ 可跳过 |
| **dayNav** | 设置 `currentDay`/`currentDayIndex`；挂载 prevDay/nextDay/goToToday；调用 `device.getInfo()` | ⚡轻 | ❌ 不可跳过（核心导航） |
| **statusBar** | 挂载 `updateStatus`/`startStatusTimer`；启动 60 秒间隔 timer | ⚡轻 | ✅ 可跳过 |
| **customContent** | 调用 `storage.get` 读取自定义内容列表；启动轮播 timer | 🔶中 | ✅ 可跳过 |
| **pinnedPages** | 调用 `loadPinnedPages()`（异步 storage 读取） | 🔶中 | ✅ 可跳过 |
| **bottomButtons** | 挂载 `openAddCoursePage`/`openSettings` 两个方法 | ⚡轻 | ❌ 不可跳过（核心功能） |
| **classList** | 挂载 `loadDayClasses`/`refreshClasses`/`updateClassProgress`/`startProgressTimer`；异步获取课表名称 | 🔴重 | ❌ 不可跳过（核心功能） |

---

## 加速方案

### 方案 1：按 settings 跳过模块 init（推荐，低风险）

**改动点**：[initAllModules](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/index-full.ux#L353-L386)

为每个模块增加 settings 检查，关闭的模块不调用 `init()`：

```javascript
initAllModules() {
  var self = this
  var skipMap = {
    clock: !self.showTime,
    quickAdd: !self.showQuickAdd,
    statusBar: !self.statusBarSetting,
    customContent: !self.showCustomContent,
    pinnedPages: !self.showPinnedBar
  }

  for (var i = 0; i < moduleNames.length; i++) {
    var m = moduleNames[i]
    if (skipMap[m.key]) {
      console.log("[index] skip " + m.key)
      continue
    }
    var mod = modules[m.key]
    if (mod && mod.init) {
      try { mod.init(self) } catch (e) { ... }
    }
  }
  // ... 后续逻辑也要相应调整
}
```

**收益**：用户关闭 6 个模块时，跳过 6 个 `init()` 调用 + 跳过 `storage.get` 读取（customContent、pinnedPages）+ 跳过 timer 创建（clock、statusBar）

**预估节省**：减少 3-4 次 `storage.get` 异步调用，减少 2-3 个 `setInterval` timer

---

### 方案 2：延迟 require（懒加载，中风险）

**改动点**：[index-full.ux 脚本顶层](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/index-full.ux#L155-L161)

当前所有 `require()` 在页面脚本解析阶段同步执行。改为在 `onInit` 中按需加载：

```javascript
// 顶层：只声明，不 require
var moduleLoaders = {
  clock: function() { return require("./modules/clock.js") },
  quickAdd: function() { return require("./modules/quick-add.js") },
  // ...
}

// onInit 中按需加载
onInit() {
  var self = this
  // 核心模块立即加载
  loadModule("dayNav", moduleLoaders.dayNav())
  loadModule("classList", moduleLoaders.classList())
  loadModule("bottomButtons", moduleLoaders.bottomButtons())
  
  // 非核心模块：等 settings 加载后再决定
  self.loadHomepageSettings()  // 需要改为同步或回调模式
  
  if (self.showTime) loadModule("clock", moduleLoaders.clock())
  if (self.showQuickAdd) loadModule("quickAdd", moduleLoaders.quickAdd())
  // ...
}
```

**收益**：页面脚本解析时间大幅缩短（不需要同步解析 782 行模块代码）

**风险**：
- 需要改造 `loadHomepageSettings` 确保 settings 在模块加载前就绪
- `onShow` 中也需要对应调整

---

### 方案 3：合并 settings 读取，减少 storage.get 次数

**当前问题**：`loadHomepageSettings()`、各模块 init 中的 `storage.get`、`store.getTheme()`、`store.getBaseFontSize()` 产生大量独立异步调用。

**优化**：将 `homepage_settings` 缓存到内存，各模块从 `self` 读取而不是重新 storage.get。

```javascript
// store.js 中缓存
var _homepageSettingsCache = null

getHomepageSettings: function(callback, forceRefresh) {
  if (!forceRefresh && _homepageSettingsCache) {
    callback(_homepageSettingsCache)
    return
  }
  storage.get({ key: "homepage_settings", ... })
}
```

**收益**：减少 `storage.get` 调用次数，每次节省约 10-50ms。

---

### 方案 4：减少 console.log（推荐，零风险）

**当前问题**：每个模块文件顶部和底部都有 `console.log("[xxx] loading...")` 和 `console.log("[xxx] loaded")`，init 函数内还有 `console.log("[xxx] init OK")`。

8 个模块 × 3 条 log = **24 条 console.log** 在页面启动时执行。

**优化**：删除所有加载/初始化日志，或使用条件编译：

```javascript
// 上线时删除所有 console.log
// console.log("[clock] loading...")  ← 删除
```

**收益**：减少 console.log 开销（特别是手表上 I/O 输出较慢），约节省 50-100ms。

---

### 方案 5：classList 模块的 storage 读取前移

[classList.js init](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/modules/class-list.js#L43-L49) 中立即发起 `store.getCurrentScheduleIndex` → `store.getScheduleNames` 异步链。这些数据在 `onShow` 中也会重新读取。

优化：首次加载时复用 onInit 中已读取的数据，减少重复 storage.get。

---

### 方案 6：device.getInfo() 合并

当前 `day-nav.js` 和 `class-list.js` 各自独立调用 `device.getInfo()`，产生 2 次相同的系统调用。

优化：在 `index-full.ux` 顶层调用一次，结果通过 `isCapsuleScreen` 变量传递给各模块（已有部分实现，但 class-list.js 自己又调用了一次）。

---

### 方案 7：timer 延迟启动

clock 模块 init 时立即启动 1 秒间隔 timer。如果 `showTime = false`，这个 timer 一直在空转。

优化：在 `initAllModules` 后检查 `showTime`，如果为 false 则不启动 timer。当前 clock.init 总是启动 timer。

---

## 加速效果预估

| 方案 | 难度 | 风险 | 关闭 6 模块时预估节省 | 全部开启时预估节省 |
|------|:---:|:---:|:---:|:---:|
| 方案 1：按 settings 跳过 init | ⭐ | 低 | **150-300ms** | 无 |
| 方案 2：延迟 require | ⭐⭐⭐ | 中 | **200-400ms** | **100-200ms** |
| 方案 3：合并 settings 读取 | ⭐⭐ | 低 | **50-100ms** | **50-100ms** |
| 方案 4：减少 console.log | ⭐ | 零 | **50-100ms** | **50-100ms** |
| 方案 5：复用 storage 数据 | ⭐ | 低 | **20-50ms** | **20-50ms** |
| 方案 6：合并 device.getInfo | ⭐ | 低 | **10-20ms** | **10-20ms** |
| 方案 7：timer 延迟启动 | ⭐ | 低 | **10-20ms** | 无 |

---

## 推荐实施顺序

```
第 1 步：方案 4（删除 console.log）          ← 立刻做，零风险
第 2 步：方案 1（按 settings 跳过 init）     ← 核心收益，低风险
第 3 步：方案 3（合并 settings 读取缓存）    ← 锦上添花
第 4 步：方案 6（合并 device.getInfo）       ← 小优化
第 5 步：方案 7（timer 延迟启动）            ← 小优化
第 6 步：方案 2（延迟 require）              ← 最大收益但需测试
```

---

## 总结

| 问题 | 答案 |
|------|------|
| 用户关闭 6 个模块，能否加速？ | **不能**。当前实现：modules 全部同步 require + 全部无条件 init，settings 只控制 UI 显示 |
| 最有效的加速方式 | **方案 1**：按 settings 跳过不必要模块的 init() |
| 最安全的加速方式 | **方案 4**：删除 console.log |
| 最大收益方式 | **方案 2**：延迟 require，但风险较高需充分测试 |