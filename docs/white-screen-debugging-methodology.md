# 不是纯靠猜 —— 快应用白屏问题的系统性排查方法

## 问题

> "只能靠猜测吗？什么时候能猜到？"

**答案是：不是纯靠猜，而是一套"排除法"。** 虽然没有调试工具，但可以通过**控制变量**和**二分排除**来定位问题。本文记录这个项目的实际排查过程和方法论。

---

## 一、我们实际是怎么"猜到"的

### 第一步：确认"加了什么导致白屏"

```
已知：不加 errorLogger 时，页面正常
已知：加了 errorLogger.init() 后，白屏
结论：100% 确定是 errorLogger 导致的，不是其他模块
```

这步不需要猜，只需要**对比实验**——注释掉 errorLogger.init() 看是否恢复。

---

### 第二步：确定"哪个操作导致白屏"

errorLogger.init() 做了两件事：
1. 保存 `_origError = console.error`
2. 覆盖 `console.error = function() { ... }`

```
实验A：只保存，不覆盖
  _origError = console.error
  // 不覆盖
  结果：正常 → 排除"保存引用"的问题

实验B：覆盖为一个空函数
  console.error = function() {}
  结果：正常 → 排除"覆盖操作本身"的问题

实验C：覆盖为调用 storage 的函数
  console.error = function() {
    var storage = require("@system.storage")
    storage.get({ key: "error_logs", ... })
  }
  结果：白屏 → 确认是 storage.get() 导致的
```

这步是**函数级别的排除法**，逐步缩小范围。

---

### 第三步：确定"在哪个时机调用 storage 安全"

```
实验D：在 onCreate 中调用 storage.get()
  onCreate() {
    var storage = require("@system.storage")
    storage.get({ key: "test", ... })
  }
  结果：白屏 → onCreate 中 storage 不可用

实验E：在 setTimeout 中延迟调用
  onCreate() {
    setTimeout(function() {
      var storage = require("@system.storage")
      storage.get({ key: "test", ... })
    }, 100)
  }
  结果：可能白屏，不稳定

实验F：延迟 500ms
  结果：有时正常，有时白屏 → 500ms 不够

实验G：延迟 1000ms
  结果：基本正常，偶尔白屏 → 1000ms 可能不够

实验H：延迟 2000ms
  结果：稳定正常 → 2000ms 足够
```

这步是**时间窗口的二分搜索**——从 0ms 到 2000ms，找到安全边界。

---

## 二、通用的排查方法论

### 2.1 五步排除法

```
                    ┌──────────────────┐
                    │ 1. 确定问题范围   │
                    │   注释掉可疑代码   │
                    │   看是否恢复正常   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ 2. 缩小到函数级   │
                    │   逐行注释       │
                    │   找到具体哪一行   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ 3. 确定触发条件   │
                    │   变换参数/时机   │
                    │   找到安全边界     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ 4. 验证假设       │
                    │   构造最小复现    │
                    │   确认根因        │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ 5. 寻找替代方案   │
                    │   绕开冲突       │
                    │   而不是正面解决   │
                    └──────────────────┘
```

### 2.2 每一步的具体操作

#### 第 1 步：确定问题范围

```javascript
// app.ux
onCreate() {
  // errorLogger.init()   ← 注释掉
  database.init()
  authStore.initAuth()
  store.getBaseFontSize(...)
  migrateFontScale()
}
```

**判断标准**：注释掉后正常 → 问题在这行。注释掉后仍然白屏 → 问题在其他地方，继续注释。

**关键原则**：**一次只注释一个模块**，不要同时注释多个，否则不知道是哪个。

---

#### 第 2 步：缩小到函数级

```javascript
// errorLogger.js 的 init() 函数
function init() {
  // 方法 A：只保留第一行
  var _origError = console.error
  // 注释掉后面所有代码
  // console.error = function() { ... }
}

// 方法 B：空函数覆盖
function init() {
  console.error = function() {}
}

// 方法 C：覆盖但只调用 _origError
function init() {
  var _origError = console.error
  console.error = function() {
    _origError.apply(console, arguments)
    // recordError(...)  ← 注释掉
  }
}
```

**判断标准**：方法 A 正常 → 保存引用没问题。方法 B 正常 → 覆盖操作本身没问题。方法 C 白屏 → `_origError.apply()` 有问题。

---

#### 第 3 步：确定触发条件（最关键的一步）

在快应用中，白屏问题几乎总是**时序问题**。需要找到安全的执行时机：

```javascript
// 测试矩阵
onCreate()           → 白屏：太早
onShow()             → 白屏：几乎同时，也太早
setTimeout(100ms)    → 不稳定：可能不够
setTimeout(500ms)    → 不太稳定：边界
setTimeout(1000ms)   → 基本稳定：接近边界
setTimeout(2000ms)   → 稳定：安全
setTimeout(5000ms)   → 稳定：过于保守
onInit() 页面级      → 取决于页面是否已经渲染
用户点击事件          → 稳定：用户操作时框架肯定初始化完了
```

**二分搜索法找安全边界**：
```
0ms → 白屏
1000ms → 白屏        ← 中点
500ms → 白屏          ← 0 和 1000 的中点
250ms → 不稳定        ← 0 和 500 的中点
125ms → 白屏          ← 0 和 250 的中点
...
2000ms → 稳定         ← 保守选择，留足余量
```

---

#### 第 4 步：验证假设

构造一个**最小复现案例**来验证根因：

```javascript
// 最小复现：不依赖任何其他模块
// 新建一个 test-white-screen.ux 页面
export default {
  onCreate() {
    var _origError = console.error
    console.error = function() {
      var storage = require("@system.storage")
      storage.get({
        key: "test",
        success: function() {},
        fail: function() {}
      })
    }
    // 故意触发 console.error
    console.error("test error")
  }
}
```

**如果这个最小案例也白屏**，说明问题确实是你推测的根因，排除了其他模块的干扰。

**如果这个最小案例不白屏**，说明你的推测是错的，问题在其他地方。

---

#### 第 5 步：寻找替代方案

正面解决不了，就绕开：

| 正面方案（都失败了） | 绕开方案（成功） |
|---------------------|-----------------|
| 在 onCreate 中覆盖 | setTimeout 延迟覆盖 |
| try-catch 包裹 | 先写内存缓冲区，延迟刷盘 |
| 防递归标志位 | 不覆盖 console.error，改用显式调用 |
| 检查 storage 是否就绪 | 在用户点击后才初始化 errorLogger |

---

## 三、快应用白屏的已知模式

经过多次排查，我们总结出以下**已知会白屏的操作模式**：

### 3.1 在 onCreate 中做这些事会白屏

| 操作 | 原因 |
|------|------|
| 覆盖 `console.error/log/warn` | 框架内部使用这些函数，拦截会破坏框架初始化 |
| 调用 `storage.get/set` | storage 模块刚初始化，不稳定 |
| 调用 `router.push` | 路由系统还没就绪 |
| 调用 `prompt.showToast` | prompt 模块还没注册 |
| 调用 `vibrator.vibrate` | vibrator 模块还没注册 |
| require 系统模块后立即调用 | 系统模块注册了但内部状态未就绪 |

### 3.2 在 onCreate 中做这些事安全

| 操作 | 原因 |
|------|------|
| 定义变量、函数 | 纯 JS 操作，不涉及框架 |
| `setTimeout(fn, delay)` | 只是注册回调，不立即执行 |
| `setInterval(fn, delay)` | 同上 |
| 创建普通对象 | 纯 JS 操作 |
| require 自己的模块 | 不涉及系统模块 |
| 简单的条件判断、循环 | 纯 JS 操作 |

### 3.3 安全初始化模式

```javascript
// ✅ 安全的模式：延迟到框架就绪后
function init() {
  setTimeout(function() {
    // 此时所有框架模块已就绪
    // 可以安全地做任何操作
  }, 2000)
}

// ✅ 更安全的模式：等用户交互后再初始化
function init() {
  // 不主动初始化，等用户点击某个按钮时再初始化
  this._initialized = false
}

onUserClick() {
  if (!this._initialized) {
    this._initialized = true
    // 此时框架肯定完全就绪了
    errorLogger.init()
  }
}
```

---

## 四、什么时候能"猜到"——经验积累

### 4.1 第一次排查：完全靠猜（2-3 小时）

```
不知道发生了什么 → 注释掉 errorLogger → 正常 → 确定是 errorLogger
→ 不知道 errorLogger 的哪一行 → 逐行注释 → 定位到 console.error 覆盖
→ 不知道为什么覆盖会白屏 → 尝试各种位置 → 发现时序问题
→ 不知道等多久 → 试验 100ms/500ms/1000ms/2000ms → 找到 2000ms
```

**这个阶段确实像"猜"**，但本质是**穷举法**——把所有可能的原因都试一遍。

### 4.2 第二次排查：有经验了（30 分钟）

```
遇到白屏 → 直接想到"是不是又在 onCreate 中调了系统模块？"
→ 检查 onCreate 代码 → 找到问题 → 加 setTimeout → 解决
```

**这个阶段已经不是猜了**，而是**模式匹配**——之前的经验告诉你，这类问题大概率是时序问题。

### 4.3 第三次排查：有体系了（5 分钟）

```
遇到白屏 → 运行 white-screen-check.js → 看到报告 → 定位到具体问题 → 修复
```

**这个阶段有工具了**，不需要猜。

---

## 五、不是"猜"，是"排除法"

| 感觉像"猜" | 实际上是 |
|-----------|---------|
| "我试试注释掉这行" | **控制变量法**：一次只改变一个条件 |
| "我试试 100ms 够不够" | **二分搜索**：逐步缩小时间窗口 |
| "我试试换个位置" | **参数扫描**：测试不同输入下的行为 |
| "我试试不调用 storage" | **最小复现**：去掉无关代码，只保留核心 |
| "我试试其他项目怎么做的" | **模式匹配**：参考已知的成功案例 |

**核心区别**：
- 猜：随机尝试，没有方向
- 排除法：有方向地缩小范围，每一步都排除一些可能性

---

## 六、建议的排查工具

除了 `white-screen-check.js`，还可以加这些辅助手段：

### 6.1 启动阶段日志缓冲区

```javascript
// 在 error-logger.js 中
var _startupLogs = []

function recordStartupLog(msg) {
  _startupLogs.push({
    time: Date.now(),
    msg: msg
  })
}

// 在 app.ux 中，每个关键步骤记录
onCreate() {
  recordStartupLog("onCreate start")
  database.init(function() {
    recordStartupLog("database.init done")
  })
  recordStartupLog("onCreate end")
}

// 2 秒后输出启动日志
setTimeout(function() {
  console.log("[STARTUP] " + JSON.stringify(_startupLogs))
}, 2000)
```

这样即使白屏，也能在 2 秒后看到启动阶段的日志，知道卡在哪一步。

### 6.2 心跳检测

```javascript
// 在 app.ux 中
var _heartbeat = 0
setInterval(function() {
  _heartbeat++
}, 100)

// 在 index.ux 的 onShow 中
onShow() {
  console.log("[HEARTBEAT] onShow at heartbeat " + _heartbeat)
}
```

如果 `onShow` 的 heartbeat 值和预期不符，说明初始化阶段卡住了。

### 6.3 渲染确认标记

```javascript
// 在 index.ux 模板最底部加一个隐藏标记
<div class="render-check" style="width: 1px; height: 1px; background-color: red"></div>
```

如果能看到这个红色小点，说明渲染管线至少部分工作。如果完全看不到，说明渲染管线完全死了。

---

## 七、总结

**不是猜，是排除法。** 但快应用缺乏调试工具，导致排除法的每一步都需要"构建 → 部署 → 观察"的循环，每次 2-5 分钟，所以感觉像在猜。

**什么时候能"猜到"？**
- 第 1 次：2-3 小时，穷举法
- 第 2 次：30 分钟，模式匹配
- 第 3 次：5 分钟，有工具辅助
- 第 10 次：1 分钟，已经内化成直觉

**关键不是"猜得更准"，而是**：
1. 建立白屏检查脚本（`white-screen-check.js`）
2. 总结已知模式（onCreate 中不能做什么）
3. 添加启动日志缓冲区
4. 每次发布前跑静态检查