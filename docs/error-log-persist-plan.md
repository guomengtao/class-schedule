# 错误日志持久化方案

## 背景

当前所有错误日志通过 `console.error` / `console.log` 输出到命令行，在真机调试时：

- 命令行日志滚动快，容易错过
- 退出调试后日志丢失，无法回溯
- 用户反馈问题但无法复现时，没有历史错误记录

**目标**：将运行时错误自动写入本地 storage，随时可查看历史错误，方便排查 bug。

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/data/error-logger.js` | 新增 | 错误日志捕获与持久化模块 |
| `src/app.ux` | 修改 | `onCreate` 中初始化错误日志模块 |
| `src/pages/storage-viewer/storage-viewer.ux` | 修改 | 增加错误日志表展示 |
| `src/pages/index/index.ux` | 修改 | 可选：底部增加错误日志快捷入口 |

---

## 一、错误日志模块 `error-logger.js`

### 1.1 存储结构

```javascript
// storage key: "error_logs"
// 最多保留 50 条，每条最大 500 字符，总计约 25KB
{
  "logs": [
    {
      "time": "2026-09-09 14:30:00",
      "source": "onShow",           // 错误来源：生命周期钩子名
      "message": "storage.delete: Error: no such file or directory",
      "stack": "c @ @aiot/framework:1\n..."  // 截断到 300 字符
    }
  ]
}
```

### 1.2 核心函数

```javascript
var MAX_LOGS = 50
var MAX_MSG_LEN = 500
var STORAGE_KEY = "error_logs"

function formatTime() {
  var d = new Date()
  return d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + " " +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes()) + ":" +
    pad(d.getSeconds())
}

function pad(n) {
  return (n < 10 ? "0" : "") + n
}

function recordError(source, message, stack) {
  var entry = {
    time: formatTime(),
    source: source || "unknown",
    message: String(message || "").substring(0, MAX_MSG_LEN),
    stack: String(stack || "").substring(0, 300)
  }

  var storage = require("@system.storage")
  storage.get({
    key: STORAGE_KEY,
    success: function(data) {
      var logs = []
      if (data) {
        try { logs = JSON.parse(data) } catch (e) {}
      }
      logs.push(entry)
      if (logs.length > MAX_LOGS) {
        logs = logs.slice(logs.length - MAX_LOGS)
      }
      storage.set({
        key: STORAGE_KEY,
        value: JSON.stringify(logs),
        success: function() {},
        fail: function() {}
      })
    },
    fail: function() {
      var logs = [entry]
      storage.set({
        key: STORAGE_KEY,
        value: JSON.stringify(logs),
        success: function() {},
        fail: function() {}
      })
    }
  })
}

function getLogs(callback) {
  var storage = require("@system.storage")
  storage.get({
    key: STORAGE_KEY,
    success: function(data) {
      var logs = []
      if (data) {
        try { logs = JSON.parse(data) } catch (e) {}
      }
      callback(logs)
    },
    fail: function() { callback([]) }
  })
}

function clearLogs(callback) {
  var storage = require("@system.storage")
  storage.delete({
    key: STORAGE_KEY,
    success: function() { if (callback) callback() },
    fail: function() { if (callback) callback() }
  })
}

module.exports = {
  recordError: recordError,
  getLogs: getLogs,
  clearLogs: clearLogs
}
```

### 1.3 拦截 console.error

```javascript
function init() {
  var _origError = console.error

  console.error = function() {
    var args = []
    for (var i = 0; i < arguments.length; i++) {
      args.push(String(arguments[i]))
    }
    var msg = args.join(" ")
    _origError.apply(console, arguments)
    recordError("console.error", msg, "")
  }
}
```

---

## 二、`app.ux` 集成

在 `onCreate` 中初始化：

```javascript
// app.ux
var errorLogger = require("./data/error-logger.js")

export default {
  onCreate() {
    errorLogger.init()
    // ... 现有代码 ...
  }
}
```

---

## 三、查看日志

### 方案 A：在 storage-viewer 中增加错误日志表（推荐）

在 `storage-viewer.ux` 的 `tableList` 中新增一条：

```javascript
{ key: "error_logs", desc: "运行时错误日志", columns: ["时间", "来源", "错误信息"] }
```

`loadRecords` 中针对 `error_logs` 特殊处理，解析 JSON 数组展示。

### 方案 B：新增独立错误日志页面

路由 `/pages/error-log`，展示错误列表，支持清空。

---

## 四、实施步骤

| 步骤 | 内容 | 预估 |
|------|------|------|
| 1 | 创建 `src/data/error-logger.js` 模块 | 10 分钟 |
| 2 | `app.ux` 的 `onCreate` 中调用 `errorLogger.init()` | 1 分钟 |
| 3 | `storage-viewer.ux` 增加错误日志表展示 | 10 分钟 |
| 4 | 测试：触发一个已知错误，验证日志写入 | 5 分钟 |

---

## 五、注意事项

- 日志写入 storage 是异步的，短时间内大量错误可能丢失部分（可接受，保留最近 50 条）
- 每条日志截断到 500 字符，防止 storage 单个 key 过大
- 不拦截 `console.log`，只拦截 `console.error`，避免性能影响
- `recordError` 内部调用 storage 时已加 `fail` 回调，不会产生新的错误