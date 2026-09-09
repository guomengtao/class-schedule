# 首页白屏根因分析

## 问题概述

- **现象**：应用启动后首页完全空白，无任何 UI 渲染，或仅显示背景色但无任何内容
- **影响范围**：所有页面不可见，等同于应用崩溃
- **严重程度**：P0（阻断性 Bug）

---

## 一、Error Logger 覆盖 console.error 导致的白屏

### 1.1 触发链路

```
app.ux 脚本加载
  → onCreate() 触发
      → errorLogger.init()  ← 问题入口
          ↓
      ┌─────────────────────────────────────────┐
      │ console.error = function() { ... }      │  ← 覆盖原生函数
      │ _origError = 原始 console.error         │  ← 保存 native binding
      └─────────────────────────────────────────┘
          ↓
      → database.init()
          → loadScheduleIndex()
              → storage.get({ key: "currentScheduleIndex" })
                  → 框架内部调用 console.error 输出调试日志
                      ↓
                  ┌──────────────────────────────────┐
                  │ 触发我们的覆盖函数                  │
                  │   → _origError.apply(console, args) │  ← 对 native 函数调用 apply
                  │   → recordError(...)               │  ← 调用 storage.get
                  │       → require("@system.storage") │  ← storage 可能未就绪
                  │       → 抛异常                      │
                  │   → 框架捕获异常                     │
                  │   → 框架调用 console.error 报告     │
                  │       → 再次触发覆盖函数             │  ← 死循环
                  └──────────────────────────────────┘
```

### 1.2 核心原因

快应用（Quick App）的 `console.error` **不是普通 JavaScript 函数**，而是框架通过 C++ 层暴露的 native binding。

- Native 函数不支持 `apply()` 的正确 `this` 绑定
- Native 函数可能在内部访问框架私有状态
- Native 函数的调用可能触发框架的异常处理链路

### 1.3 时序冲突

`onCreate` 阶段，快应用框架正在初始化内部模块：

```
onCreate 执行时框架状态：
  system.router    → 已就绪
  system.storage   → 刚初始化，不稳定
  system.prompt    → 未就绪
  system.vibrator  → 未就绪
  页面渲染引擎     → 正在初始化
```

此时覆盖 `console.error` 会拦截框架自身的初始化日志。当框架内部调用 `console.error` 时，进入了我们的覆盖函数，而覆盖函数中的 `_origError.apply()` 和 `recordError()` 都可能在此时失败。

### 1.4 三种位置尝试都失败

| 位置 | 结果 | 原因 |
|------|------|------|
| 脚本顶部 `require` 后立即 | 直接崩溃 | storage 模块还未加载 |
| `onCreate` 中 | 白屏 | storage 刚初始化，不稳定 |
| `onCreate` 中 + try-catch | 白屏 | 异常被 catch，但框架渲染流程已中断 |

### 1.5 解决方案：setTimeout 延迟覆盖

```javascript
function init() {
  setTimeout(function() {
    var _origError = console.error
    console.error = function() {
      if (_inErrorHandler) return
      _inErrorHandler = true
      try {
        var msg = Array.prototype.join.call(arguments, " ")
        if (!shouldIgnore(msg)) {
          _origError.apply(console, arguments)
          recordError("console.error", msg, "")
        }
      } catch (e) {}
      _inErrorHandler = false
    }
  }, 2000)
}
```

**原理**：`setTimeout` 注册回调后立即返回，不阻塞 onCreate 流程。2 秒后所有框架模块已就绪，此时安全覆盖 `console.error`。

---

## 二、CSS 布局问题导致的白屏

### 2.1 高度塌陷

```css
.schedule-page {
  height: 100%;
  /* 没有 min-height 安全兜底 */
}
```

**问题**：`height: 100%` 依赖于父容器有明确高度。如果快应用框架在渲染时父容器高度为 0，则 `100% of 0 = 0`，整个页面高度塌陷为 0，表现为白屏。

**文件位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L365-L370)

### 2.2 缺少背景色兜底

```html
<div id="schedule-page" class="schedule-page" style="background-color: {{ theme.bg }}">
```

**问题**：CSS 中硬编码了 `background-color: #1a1a2e`，但模板中的 `style="background-color: {{ theme.bg }}"` 会覆盖 CSS 值。如果 `theme.bg` 为空字符串或 undefined，页面背景变为透明/白色，而文字是白色（`theme.text: '#ffffff'`），导致**白底白字**，完全不可见。

**文件位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L2)

### 2.3 文字颜色与背景色冲突

当前默认主题是暗色主题（`bg: '#1a1a2e'`，`text: '#ffffff'`），所以暗底白字正常显示。但如果用户选择了浅色主题（如 `light` 主题 `bg: '#f0f0f0'`），而某些文字颜色仍然使用白色，则会出现**白底白字**。

```javascript
// store.js 中的 light 主题
light: {
  bg: '#f0f0f0',    // 浅灰背景
  text: '#222222',  // 深色文字 —— 正常
}
```

当前所有主题的 `text` 和 `bg` 都有足够对比度，但如果用户自定义主题或 localStorage 数据损坏，theme 对象为空，则：

```javascript
// theme 为 {} 时的渲染结果
style="background-color: undefined"  → 浏览器默认白色
style="color: undefined"             → 浏览器默认黑色
```

虽然浏览器默认是白底黑字，但**所有 UI 结构都依赖 theme 数据**，如果 theme 加载失败，虽然不会完全白屏，但所有颜色都会异常。

---

## 三、异步数据加载链断裂

### 3.1 核心加载链路

```
onInit() 开始
├── [1] isLoading = true                          ← 显示"加载中..."
├── [2] store.getTheme(callback)                  ← 异步，不阻塞
├── [3] loadHomepageSettings()                    ← 异步，不阻塞
├── [4] loadFontScale()                           ← 异步，不阻塞
└── [5] database.init(callback)                   ← 串行异步链
    ├── loadScheduleIndex(callback)               ← storage.get("currentScheduleIndex")
    └── migrateOldData(callback)                  ← storage.get("allCourses") + storage.get("allCourses_0")
        └── getAllCourses(callback)               ← storage.get("allCourses_0") + JSON.parse
            ├── self.schedule = schedule
            ├── self.isLoading = false            ← 隐藏"加载中..."
            └── initAllModules()                  ← 8 个模块初始化
```

**文件位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L216-L235)

### 3.2 断裂点分析

| 断裂点 | 后果 | 原因 |
|--------|------|------|
| `database.init()` 回调未触发 | 永远显示"加载中..." | storage 模块未就绪，get/set 回调不触发 |
| `loadScheduleIndex()` 失败 | 使用默认 index=0，可能加载错误课程表 | fallback 逻辑存在，不会白屏但数据错误 |
| `migrateOldData()` 失败 | 继续执行，不会白屏 | 有 fail 回调兜底 |
| `getAllCourses()` 回调未触发 | `isLoading` 永远为 true，**永远显示"加载中..."** | storage.get 回调不触发 |
| `JSON.parse(val)` 抛出异常 | `schedule = []`，**所有课程数据丢失** | catch 返回空数组 |
| `initAllModules()` 中某模块 init 失败 | 该模块功能缺失，但不影响页面渲染 | try-catch 包裹 |

### 3.3 isLoading 时机过早

```javascript
database.getAllCourses(function(schedule) {
  self.schedule = schedule
  self.isLoading = false       // ← 此时 initAllModules 还没执行完
  self.initAllModules()        // ← 8 个模块异步初始化
})
```

**问题**：`isLoading` 在 `initAllModules()` 之前就设为 false，导致：
- 用户看到课程列表渲染出来了，但状态栏、快速添加等模块还在初始化
- 如果 `initAllModules()` 中某个模块初始化时间过长，用户会看到**部分内容空白**

**文件位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L229-L234)

---

## 四、Storage 数据损坏导致的白屏

### 4.1 数据损坏场景

```javascript
// database.js 中的 getAllCoursesStorageWithIndex
storage.get({
  key: key,
  success: function(val) {
    if (val) {
      try {
        var data = JSON.parse(val)   // ← 如果 val 不是合法 JSON
        callback(data)
      } catch (e) {
        callback([])                 // ← 返回空数组，课程列表为空
      }
    }
  }
})
```

**文件位置**：[database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L101-L117)

**损坏原因**：
1. 用户强制关闭应用时 storage 正在写入，导致数据不完整
2. 存储空间不足，写入被截断
3. 快应用框架版本升级，storage 格式不兼容
4. 用户手动修改 storage-data.json 引入错误

**结果**：`schedule = []`，`currentClasses = []`，页面显示"今天没有课"，虽然不是完全白屏，但用户看到空页面。

### 4.2 所有 storage 读取的损坏风险点

| storage key | 读取位置 | 损坏后果 |
|-------------|----------|----------|
| `allCourses_0` | `database.init()` → `getAllCourses()` | 课程数据全部丢失 |
| `currentScheduleIndex` | `database.init()` → `loadScheduleIndex()` | 回退到 index=0 |
| `scheduleNames` | `store.getScheduleNames()` | 回退到默认名称 |
| `appTheme` | `store.getTheme()` | 回退到 blue 主题 |
| `baseFontSize` | `store.getBaseFontSize()` | 回退到 48 |
| `homepage_settings` | `store.getHomepageSettings()` | 回退到默认设置 |
| `pinned_pages` | `pinnedPages.init()` | 置顶列表为空 |
| `hideWeekend` | `dayNav.init()` | 回退到不隐藏周末 |

---

## 五、onShow 重复加载引起的竞态条件

### 5.1 问题描述

```javascript
// onInit() 中
database.init(function() {
  database.getAllCourses(function(schedule) {
    self.schedule = schedule
    self.initAllModules()
    self.isLoading = false
  })
})

// onShow() 中（几乎同时触发）
onShow() {
  store.getCurrentScheduleIndex(function(idx) {
    database.getAllCoursesWithIndex(idx, function(schedule) {
      self.schedule = schedule           // ← 覆盖 onInit 中的 schedule
      self.refreshClasses()              // ← 可能覆盖 onInit 中的 currentClasses
    })
  })
  try { this.$forceUpdate() } catch (e) {}
}
```

**文件位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L241-L271)

### 5.2 竞态场景

```
时间线：
T0: onInit() 开始
T1: onInit() → database.init() 异步执行中...
T2: onShow() 触发 ← 快应用框架在 onInit 完成前就触发了 onShow
T3: onShow() → getAllCoursesWithIndex() 开始
T4: onInit() → getAllCourses() 回调返回，设置 schedule、initAllModules()
T5: onShow() → getAllCoursesWithIndex() 回调返回，覆盖 schedule、refreshClasses()
T6: 如果 T4 和 T5 的 schedule 数据不一致，页面闪烁或数据错误
```

**结果**：
- `schedule` 被覆盖两次，可能导致数据不一致
- `refreshClasses()` 在 `initAllModules()` 之前或之后执行，顺序不确定
- `$forceUpdate()` 强制重新渲染，可能导致渲染闪烁

---

## 六、模块初始化失败导致部分白屏

### 6.1 8 个模块的初始化

```javascript
initAllModules() {
  for (var i = 0; i < moduleNames.length; i++) {
    var mod = modules[m.key]
    if (mod && mod.init) {
      try {
        mod.init(self)   // ← 每个模块的 init() 都可能抛出异常
      } catch (e) {
        console.error("[index] " + m.key + " FAIL: " + (e.message || e))
      }
    }
  }
}
```

**文件位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L280-L296)

### 6.2 各模块初始化风险

| 模块 | 初始化操作 | 失败风险 |
|------|-----------|---------|
| `clock` | 启动 `setInterval` 定时器 | **低**：纯 JS 定时器 |
| `quickAdd` | 无额外 storage 读取 | **低**：轻量初始化 |
| `dayNav` | `storage.get("hideWeekend")` | **中**：storage 异步读取 |
| `statusBar` | 启动 `setInterval` 定时器 | **低**：纯 JS 定时器 |
| `customContent` | `storage.get("homepage_settings")` | **中**：重复读取 storage |
| `pinnedPages` | `storage.get("pinned_pages")` | **中**：storage 异步读取 |
| `bottomButtons` | 无额外 storage 读取 | **低**：轻量初始化 |
| `classList` | `storage.get("currentScheduleIndex")` + `storage.get("scheduleNames")` | **高**：两次 storage 读取 + 课程数据处理 |

### 6.3 classList 模块初始化失败的影响

`classList.init()` 是最关键的模块，它负责：
- 加载课程数据到 `currentClasses`
- 启动进度条定时器
- 更新状态栏

如果 `classList.init()` 失败，`currentClasses` 保持为空数组 `[]`，页面显示"今天没有课"。

**文件位置**：[class-list.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/modules/class-list.js)

---

## 七、路由配置问题

### 7.1 入口路由未注册

```json
// manifest.json
{
  "router": {
    "entry": "pages/index",
    "pages": {
      "pages/index": {
        "component": "index"
      }
    }
  }
}
```

**文件位置**：[manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json#L55-L59)

**风险**：如果 `pages/index` 路由被删除或 `component` 名称不匹配，快应用框架无法找到首页组件，直接白屏。

### 7.2 子页面路由未注册

从首页可以跳转到以下页面，如果这些页面路由未注册，跳转后白屏：

| 跳转目标 | 触发方式 |
|----------|---------|
| `/pages/add-course` | 点击"+ 添加课程"按钮 |
| `/pages/settings` | 或点击"设置"按钮 |
| `/pages/week-view` | 点击"总"按钮 |
| `/pages/schedule-manager` | 点击课表名称 |
| `/pages/detail` | 点击课程卡片 |
| `/pages/storage-viewer` | 从设置页进入 |
| `/pages/chinese-input` | 从设置页进入 |

---

## 八、$forceUpdate() 滥用

### 8.1 问题代码

```javascript
onShow() {
  // ... 大量异步 storage 读取 ...
  try { this.$forceUpdate() } catch (e) {}
}
```

**文件位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L270)

**问题**：
1. `$forceUpdate()` 在 onShow 末尾立即执行，但此时所有异步 storage 回调还没返回
2. 强制渲染可能触发快应用框架的渲染异常
3. 虽然被 try-catch 包裹，但框架内部的异常可能不经过 JS 层

---

## 九、后台运行模块 (resident) 异常

```javascript
try {
  resident = require("@system.resident")
} catch (e) {
  console.warn("[BACKGROUND] resident not available: " + e)
}
```

**文件位置**：[app.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/app.ux#L8-L12)

**风险**：
- `@system.resident` 在某些快应用引擎版本中不存在
- 虽然被 try-catch 包裹，但 `require` 失败后后续的 `startResident()` 调用可能产生未捕获的错误
- `resident.start()` 在 `onCreate` 中通过 `initBackgroundRunning()` 调用，如果此时框架未就绪，可能导致异常

---

## 十、综合风险矩阵

| 风险类别 | 严重程度 | 发生概率 | 影响范围 | 修复难度 |
|----------|:---:|:---:|:---:|:---:|
| Error Logger 覆盖 console.error | **P0** | 高（首次启动必现） | 完全白屏 | 低（已修复） |
| CSS 高度塌陷 | **P1** | 低（取决于快应用引擎） | 完全白屏 | 低 |
| 主题颜色异常 | **P2** | 低（数据损坏时） | 界面不可读 | 低 |
| 异步链断裂 | **P0** | 中（storage 未就绪时） | 永远显示"加载中..." | 中 |
| Storage 数据损坏 | **P1** | 低（异常关闭时） | 课程数据丢失 | 中 |
| onShow 竞态条件 | **P2** | 中（每次 onShow） | 数据闪烁 | 中 |
| 模块初始化失败 | **P2** | 低（storage 异常时） | 部分功能缺失 | 中 |
| 路由配置错误 | **P0** | 极低（发布前检查） | 完全白屏 | 低 |
| $forceUpdate 滥用 | **P2** | 低 | 渲染异常 | 低 |
| resident 模块异常 | **P3** | 低（某些引擎版本） | 后台功能不可用 | 低 |

---

## 十一、预防措施

### 11.1 开发阶段

1. **运行白屏检查脚本**：
   ```bash
   node scripts/white-screen-check.js --verbose
   ```
   每次发布前运行，检查 CSS、路由、模板、异步链等潜在问题。

2. **CSS 安全兜底**：
   ```css
   .schedule-page {
     min-height: 100vh;  /* 安全兜底 */
     height: 100%;
     background-color: #1a1a2e;  /* 硬编码兜底色 */
   }
   ```

3. **异步链超时保护**：
   ```javascript
   var timeout = setTimeout(function() {
     self.isLoading = false
     self.currentClasses = []
   }, 5000)  // 5 秒超时兜底
   ```

4. **Storage 数据校验**：
   ```javascript
   function safeJSONParse(str, fallback) {
     try {
       var data = JSON.parse(str)
       if (!Array.isArray(data)) return fallback
       return data
     } catch (e) {
       return fallback
     }
   }
   ```

### 11.2 发布阶段

1. **rpk 包大小检查**：rpk 禁止大于 1MB，解压后禁止大于 2MB
2. **使用 release + --enable-jsc 构建**，禁止用 debug 包
3. **解压 rpk 检查**：确保所有页面文件存在，路由注册正确

### 11.3 运行时防护

1. **全局错误捕获**：error-logger 延迟 2 秒后覆盖 console.error
2. **isLoading 超时**：5 秒后强制显示错误状态
3. **数据降级**：storage 读取失败时使用默认数据

---

## 十二、相关文件

| 文件 | 作用 |
|------|------|
| [src/pages/index/index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) | 首页主文件，包含模板、样式、初始化逻辑 |
| [src/app.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/app.ux) | 应用入口，onCreate 中初始化各模块 |
| [src/data/error-logger.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/error-logger.js) | 错误日志模块，覆盖 console.error |
| [src/data/store.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/store.js) | 数据存储模块，主题、字体、设置等 |
| [src/data/database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) | 数据库模块，课程数据 CRUD |
| [src/pages/index/modules/class-list.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/modules/class-list.js) | 课程列表模块，核心渲染逻辑 |
| [src/manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json) | 应用配置，路由注册 |
| [scripts/white-screen-check.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/white-screen-check.js) | 白屏静态分析脚本 |
| [docs/error-logger-white-screen-analysis.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/error-logger-white-screen-analysis.md) | Error Logger 专项白屏分析 |
| [docs/homepage-loading-performance-analysis.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/homepage-loading-performance-analysis.md) | 首页加载性能分析 |