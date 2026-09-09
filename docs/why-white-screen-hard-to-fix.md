# 为什么首页白屏修了多次还是白屏？—— 深度根因分析

## 问题现象

- **多次修改 error-logger 的初始化位置，全都白屏**
- **尝试了 3 个不同位置，3 种不同策略，全部失败**
- **最终只能用 `setTimeout(fn, 2000)` 这种 hack 方式才解决**
- **但即使这样，`setTimeout` 的方案也很脆弱，没有从根本上解决问题**

本文从**架构层面**分析为什么这个问题如此难以解决。

---

## 一、先看三次尝试，全部失败

### 尝试 1：脚本顶部直接覆盖

```javascript
// error-logger.js 顶部
var _origError = console.error
console.error = function() {
  // ... 调用 storage.get() 记录错误 ...
}
```

**结果：应用直接崩溃，连 onCreate 都没进去。**

**为什么失败**：`require("@system.storage")` 在脚本加载阶段还不可用。快应用框架的模块加载顺序是：先加载用户脚本，再初始化系统模块。脚本顶部时 `@system.storage` 还没注册。

---

### 尝试 2：在 onCreate 中覆盖

```javascript
// app.ux
onCreate() {
  errorLogger.init()   // 覆盖 console.error
  database.init()      // 这个会触发 storage.get，内部可能调用 console.error
  // ...
}
```

**结果：白屏，整个 UI 不渲染。**

**为什么失败**：onCreate 阶段框架正在初始化渲染引擎。此时 `database.init()` → `storage.get()` 触发框架内部调用 `console.error` 输出调试日志 → 进入我们的覆盖函数 → 覆盖函数里又调用 `storage.get()` 记录错误 → storage 还没完全就绪 → 抛出异常 → 框架渲染管线中断 → 白屏。

---

### 尝试 3：onCreate 中 + try-catch 包裹

```javascript
onCreate() {
  try {
    errorLogger.init()
  } catch (e) {
    // 静默失败
  }
  database.init()
}
```

**结果：仍然白屏。**

**为什么失败**：try-catch 确实捕获了 JS 层面的异常，但问题在于：

1. **异常发生在 Native 层**：`_origError.apply(console, arguments)` 调用原生函数时，原生函数内部抛出的异常**不经过 JS 的 try-catch**
2. **渲染管线已经中断**：即使 catch 住了 JS 异常，框架的渲染管线在第一次异常时就已经被破坏了，无法恢复
3. **框架不会重试渲染**：快应用框架的渲染是一次性的，中断了就中断了，没有"重新渲染"的机制

---

## 二、核心矛盾：一个死锁

```
errorLogger 需要 storage → storage 需要框架初始化完成 → 框架初始化调用 console.error → console.error 被 errorLogger 覆盖 → errorLogger 调用 storage → storage 还没就绪 → 死锁！
```

这是一个**循环依赖死锁**：

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   errorLogger.init()                                     │
│      ↓                                                   │
│   覆盖 console.error                                     │
│      ↓                                                   │
│   框架初始化代码调用 console.error("debug log")           │
│      ↓                                                   │
│   我们的覆盖函数执行                                      │
│      ↓                                                   │
│   recordError() → require("@system.storage")             │
│      ↓                                                   │
│   storage.get() → 框架还没初始化完 → 失败                 │
│      ↓                                                   │
│   框架捕获错误 → 调用 console.error 报告错误              │
│      ↓                                                   │
│   ┌─── 回到我们的覆盖函数 ──────────────┐                 │
│   │                                      │                │
│   │  如果 _inErrorHandler 拦住了          │                │
│   │  → 死循环被阻止                      │                │
│   │  → 但渲染管线已经坏了                 │                │
│   │  → 白屏                              │                │
│   │                                      │                │
│   │  如果 _inErrorHandler 没拦住          │                │
│   │  → 无限递归                          │                │
│   │  → 栈溢出 → 崩溃                     │                │
│   └──────────────────────────────────────┘                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**这个死锁的本质是：我们想在框架初始化期间使用框架的能力，但框架的能力本身就依赖初始化完成。**

---

## 三、为什么 setTimeout 2000ms 能"解决"但不是真正解决

### 3.1 为什么能工作

```
时间线：
0ms    onCreate 触发
       → errorLogger.init() 只是注册 setTimeout，不执行任何覆盖
       → 框架正常初始化，不受任何干扰
       → database.init() 正常执行
       → 页面正常渲染

2000ms  setTimeout 回调触发
       → 此时框架已完全初始化
       → storage、router、渲染引擎全部就绪
       → 安全覆盖 console.error
```

**本质**：我们不是"解决了死锁"，而是**绕过了死锁**——等框架初始化完了再覆盖，就不存在循环依赖了。

### 3.2 为什么这不是真正的解决方案

| 问题 | 说明 |
|------|------|
| **2 秒是拍脑袋定的** | 如果框架初始化需要 3 秒（低端设备），2 秒后覆盖仍然白屏 |
| **前 2 秒的错误丢失** | 如果框架初始化过程中有真正的业务错误，我们捕获不到 |
| **setTimeout 本身也不可靠** | 在快应用中，setTimeout 也是 native binding，2000ms 后可能因为各种原因不触发 |
| **没有解决根本问题** | 根本问题是：**在 hybrid 框架中，你没有安全的方式在框架初始化阶段拦截框架自己的行为** |

---

## 四、根本原因：快应用 Hybrid 架构的不可调试性

### 4.1 架构模型

```
┌─────────────────────────────────────────────────┐
│                   JavaScript 层                   │
│  (app.ux, error-logger.js, store.js, ...)        │
│                                                   │
│  你的代码运行在这里                                │
│  你可以：console.log, require, setTimeout, ...    │
│  你看到的 console.error 是框架暴露的接口           │
│                                                   │
│  ═══════════════ JS-Native Bridge ═══════════════ │
│  (不可见，不可调试，行为不可预测)                   │
│                                                   │
│                   Native 层 (C++)                  │
│  (渲染引擎, storage 实现, router 实现, ...)       │
│                                                   │
│  框架的真正实现在这里                              │
│  你完全看不到内部发生了什么                        │
│  你的 console.error 覆盖会影响这里的调用           │
│  Native 层的异常不经过 JS 的 try-catch             │
└─────────────────────────────────────────────────┘
```

### 4.2 为什么无法调试

| 调试手段 | 在快应用中是否可用 | 说明 |
|----------|:---:|------|
| `console.log` 调试 | ⚠️ 部分 | 白屏后 log 可能不输出，因为渲染管线已死 |
| Chrome DevTools | ❌ 不可用 | 快应用不是 WebView，是原生渲染 |
| 断点调试 | ❌ 不可用 | 无 JS 调试器接入 |
| 堆栈追踪 | ❌ 不可用 | Native 层异常无堆栈 |
| 错误信息 | ❌ 不可用 | 白屏时看不到任何错误提示 |
| `try-catch` | ❌ 不可靠 | 只能捕获 JS 层异常，Native 层异常穿透 |
| 日志文件 | ⚠️ 部分 | 可以用，但白屏时 storage 可能也写不进去 |

**核心问题：白屏是一个"沉默"的失败。没有错误信息，没有堆栈，没有日志，只能靠猜。**

### 4.3 为什么每次修改后无法验证

```
修改代码 → 构建 rpk → 安装到手机 → 打开应用 → 白屏 → 不知道哪里错了 → 回到代码继续猜
```

这个循环每次需要 2-5 分钟，而且**没有任何反馈信息告诉你到底哪里错了**。你只能通过"二分法"注释代码来定位问题，这是一个非常低效的过程。

---

## 五、五次修复尝试的完整时间线

### 第 1 次：直接覆盖（失败）

**想法**：在 error-logger.js 加载时就直接覆盖 console.error，简单粗暴。

**代码**：
```javascript
// error-logger.js 顶部
var _origError = console.error
console.error = function() { ... }
```

**结果**：应用崩溃，连 onCreate 都没进。

**为什么没想到会失败**：在普通 Web 开发中，覆盖 console.error 是安全的。但在快应用中，脚本加载阶段 `@system.storage` 还没注册。

**教训**：**快应用不是浏览器，模块加载顺序和 Web 完全不同。**

---

### 第 2 次：移到 onCreate（失败）

**想法**：既然脚本顶部太早，那就在 onCreate 中覆盖，此时 storage 应该已经可用了。

**代码**：
```javascript
onCreate() {
  errorLogger.init()   // ← 移到这里
  database.init()
}
```

**结果**：白屏。

**为什么没想到会失败**：以为 onCreate 时 storage 已经就绪。但实际上 storage 是"刚初始化，不稳定"状态。

**教训**：**onCreate 不是"框架初始化完成后"的回调，而是"框架开始初始化"的信号。**

---

### 第 3 次：加 try-catch（失败）

**想法**：既然有异常，那就用 try-catch 兜底。

**代码**：
```javascript
// errorLogger.init() 内部加了 try-catch
console.error = function() {
  try {
    _origError.apply(console, arguments)
    recordError(...)
  } catch (e) {
    // 静默吞掉
  }
}
```

**结果**：仍然白屏。

**为什么没想到会失败**：以为异常在 JS 层，可以 catch。但实际上异常在 Native 层，try-catch 无效。

**教训**：**Hybrid 框架中，Native 层的异常不经过 JS 的 try-catch。这是最反直觉的一点。**

---

### 第 4 次：加 _inErrorHandler 防递归（失败）

**想法**：问题可能是死循环递归，加个标志位防止。

**代码**：
```javascript
var _inErrorHandler = false
console.error = function() {
  if (_inErrorHandler) return  // ← 防递归
  _inErrorHandler = true
  try { ... } catch (e) {}
  _inErrorHandler = false
}
```

**结果**：仍然白屏。

**为什么没想到会失败**：递归确实被防止了，但根本问题不是递归，而是**渲染管线被中断后无法恢复**。

**教训**：**防止递归只是防止了"雪上加霜"，但"第一刀"已经致命了。**

---

### 第 5 次：setTimeout 2000ms（成功，但脆弱）

**想法**：既然问题是"太早了"，那就"等足够久"。

**代码**：
```javascript
function init() {
  setTimeout(function() {
    // 2 秒后才覆盖 console.error
  }, 2000)
}
```

**结果**：成功！页面正常渲染。

**为什么成功**：完全绕过了初始化阶段的冲突窗口。

**为什么脆弱**：
- 2 秒是经验值，没有理论依据
- 低端设备可能需要更长时间
- 如果用户快速操作，2 秒内发生的错误全部丢失
- setTimeout 本身在快应用中也是 native binding，可能不触发

---

## 六、为什么这不是一个"能彻底解决"的问题

### 6.1 问题的本质

这不是一个 bug，而是一个**架构约束**：

```
在 Hybrid 框架中，你无法在框架初始化期间安全地拦截框架自己的行为。
```

这就像你想在操作系统启动过程中拦截操作系统的内核日志——你需要操作系统的能力来记录日志，但操作系统还没启动完，所以你的日志记录能力还不可用。

### 6.2 为什么其他方案都不可行

| 方案 | 为什么不可行 |
|------|-------------|
| 用 `Promise` 包装 | 快应用的 Promise 也是 native binding，同样不可靠 |
| 用 `try-catch` 包裹整个 onCreate | Native 异常穿透 |
| 先检查 storage 是否就绪再覆盖 | 没有 API 可以检查 storage 是否就绪 |
| 在 onShow 中覆盖 | onShow 在 onCreate 之后立即触发，同样太早 |
| 在页面 onInit 中覆盖 | 页面 onInit 在 onCreate 之后，但此时渲染已经开始 |
| 不用 storage，用内存数组 | 可以，但错误日志无法持久化，应用重启就丢失 |
| 不用 console.error，用自定义函数 | 业务代码可以用，但框架内部的错误仍然走 console.error |
| 等框架提供"初始化完成"回调 | 快应用没有这个回调 |

### 6.3 唯一可行的方向

**方向 1：放弃在框架初始化阶段拦截**

当前方案（setTimeout 2000ms）就是这个方向。接受前 2 秒的错误丢失。

**方向 2：不覆盖 console.error，改用其他方式收集错误**

```javascript
// 不用覆盖 console.error
// 而是在业务代码中显式调用 errorLogger.recordError()
function doSomething() {
  try {
    // 业务逻辑
  } catch (e) {
    errorLogger.recordError("doSomething", e.message, e.stack)
  }
}
```

**代价**：只能捕获业务代码中的错误，框架内部的错误仍然捕获不到。

**方向 3：用内存缓冲区 + 延迟写入**

```javascript
var _buffer = []

function recordError(source, message, stack) {
  _buffer.push({ time: formatTime(), source: source, message: message, stack: stack })
  if (_buffer.length > 50) _buffer.shift()
}

// 延迟 2 秒后，将缓冲区写入 storage
setTimeout(function() {
  flushBufferToStorage()
}, 2000)
```

**优点**：覆盖 console.error 时不调用 storage，只写内存，避免循环依赖。
**缺点**：如果应用在 2 秒内崩溃，缓冲区数据丢失。

---

## 七、总结

### 为什么多次修改都是白屏

| 根本原因 | 说明 |
|----------|------|
| **Hybrid 框架的黑盒性** | 看不到初始化顺序，不知道什么模块什么时候就绪 |
| **Native 异常不可捕获** | try-catch 只能捕获 JS 层异常，Native 层异常穿透 |
| **渲染管线不可恢复** | 一旦中断，没有重启机制 |
| **循环依赖死锁** | errorLogger 需要 storage，storage 初始化触发 errorLogger |
| **零调试反馈** | 白屏时没有任何错误信息，只能靠猜 |
| **反直觉的行为** | 在 Web 开发中安全的操作（覆盖 console、try-catch）在快应用中都是危险的 |

### setTimeout 方案的脆弱性

| 风险 | 说明 |
|------|------|
| **时间窗口是猜测的** | 2 秒没有理论依据 |
| **低端设备可能不够** | 初始化可能需要更长时间 |
| **setTimeout 不可靠** | 在快应用中也是 native binding |
| **前 2 秒错误丢失** | 无法接受的可维护性代价 |
| **未来可能再次白屏** | 框架升级后初始化时间可能变长 |

### 真正需要的

快应用框架需要提供：
1. **`onFrameworkReady` 回调**：明确告知"框架初始化完成，可以安全使用所有 API"
2. **错误隔离机制**：用户代码覆盖 console 不应该影响框架内部的错误处理
3. **调试工具**：至少提供一个日志输出渠道，在白屏时也能看到错误信息

在这些基础设施缺失的情况下，**白屏问题没有"优雅"的解决方案，只有不同程度的 hack**。当前 setTimeout 方案是众多 hack 中代价最小的一个。

---

## 八、相关文件

| 文件 | 作用 |
|------|------|
| [src/app.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/app.ux) | 应用入口，`onCreate` 中调用 `errorLogger.init()` |
| [src/data/error-logger.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/error-logger.js) | 错误日志模块，setTimeout 延迟覆盖方案 |
| [docs/error-logger-white-screen-analysis.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/error-logger-white-screen-analysis.md) | 第一次白屏分析（触发链路、核心原因） |
| [docs/homepage-white-screen-analysis.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/homepage-white-screen-analysis.md) | 首页白屏全面分析（10 大类原因） |
| [scripts/white-screen-check.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/white-screen-check.js) | 白屏静态分析脚本 |