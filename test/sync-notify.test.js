/**
 * 「课堂提醒」下行（手机 → 手环，action=notify）单元测试
 *
 * 用法：node test/sync-notify.test.js
 *
 * 背景（2026-10-04）：
 *   手机首页的「上课了 / 下课了」过去直接复用 action=call，而手环端 call 只做一次长震动、
 *   完全忽略 text —— 于是「上课了」和「呼叫手环」效果一模一样，用户感觉「上课了不管用」。
 *   现在手环端新增 action=notify 分支：弹提示条 + 按 type 区分震动 + 回确认。
 *
 * 为什么这么测：
 *   快应用（Vela）没有 JS 测试框架，逻辑写在 app.ux 的 <script> 里，Node 直接 require 不了。
 *   本脚本把 <script> 抽出来，把 require 换成可注入的桩，用 new Function 求值得到真实模块，
 *   再额外导出内部函数供断言 —— 测的是**线上那份源码本身**。
 *   外部依赖（prompt / vibrator / storage / interconnect / 各 data 模块）全部打桩，
 *   所以是**纯单元测试**：不碰真 storage、不震动、不发任何消息。
 */

"use strict"

var fs = require("fs")
var path = require("path")

var C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m"
}
function green(s) { return C.green + s + C.reset }
function red(s) { return C.red + s + C.reset }
function dim(s) { return C.dim + s + C.reset }

var passed = 0
var failed = 0
var failures = []

function ok(name, cond, detail) {
  if (cond) {
    passed++
    console.log("  " + green("✓") + " " + name)
  } else {
    failed++
    failures.push(name + (detail ? " — " + detail : ""))
    console.log("  " + red("✗") + " " + name + (detail ? "\n      " + dim(detail) : ""))
  }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, "期望 " + JSON.stringify(expected) + "，实际 " + JSON.stringify(actual))
}

// ---------------------------------------------------------------- 源码装载

var UX_FILE = path.join(__dirname, "../src/app.ux")

/**
 * 从 app.ux 抽出 <script>，转成可在 Node 求值的 CommonJS 片段，
 * 并在末尾导出内部函数（app.ux 顶层函数默认不对外，测试需要钩子）。
 */
function readScript() {
  var src = fs.readFileSync(UX_FILE, "utf8")
  var m = src.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("在 " + UX_FILE + " 里找不到 <script> 块")
  var js = m[1]
    .replace(/require\((["'])([^"']+)\1\)/g, "__req($1$2$1)")
    .replace(/export\s+default\s*/, "module.exports = ")
  // 测试钩子：把内部函数挂到 module.exports 上（不影响运行期行为）
  js += "\n;module.exports.__test = { syncHandleNotify: syncHandleNotify, vibrateNotify: vibrateNotify, initSyncReceiver: initSyncReceiver };\n"
  return js
}

// ---------------------------------------------------------------- 依赖桩

/** 每次 compile 都重建一份干净环境，用例之间互不污染。 */
function makeEnv() {
  var env = {
    toasts: [],
    vibrateCalls: [],
    asyncTasks: [],
    storage: {},
    replies: [],
    vibratorMode: "ok", // ok | fail
    toastThrows: false
  }

  var promptStub = {
    showToast: function (o) {
      if (env.toastThrows) throw new Error("toast boom")
      env.toasts.push(o && o.message)
    }
  }

  var vibratorStub = {
    start: function (o) {
      env.vibrateCalls.push(o)
      if (env.vibratorMode === "fail") {
        o.fail && o.fail({}, 400)
      } else {
        o.success && o.success()
      }
    },
    vibrate: function (o) { env.vibrateCalls.push(o) },
    stop: function () {}
  }

  var storageStub = {
    get: function (o) { o.success && o.success(env.storage[o.key]) },
    set: function (o) { env.storage[o.key] = String(o.value); o.success && o.success() },
    delete: function (o) { delete env.storage[o.key]; o.success && o.success() }
  }

  // interconnect：instance() 返回一个 connect 桩，onmessage 由 initSyncReceiver 赋值
  var connectStub = {
    onmessage: null,
    onopen: null,
    onerror: null,
    onclose: null,
    send: function (o) { env.replies.push(o && o.data) },
    getReadyState: function (o) { o.fail && o.fail({}, 1) }
  }
  var interconnectStub = { instance: function () { return connectStub } }

  env.connect = connectStub

  env.__req = function (id) {
    if (id === "@system.prompt") return promptStub
    if (id === "@system.vibrator") return vibratorStub
    if (id === "@system.storage") return storageStub
    if (id === "@system.interconnect") return interconnectStub
    if (id === "@system.resident") return { start: function () {} }
    if (id === "@system.device") return {}
    if (id === "chat-bridge.js" || id.indexOf("chat-bridge.js") >= 0) {
      return { register: function () {}, send: function () {}, sendCmd: function () {}, ready: function () { return true } }
    }
    // 其余项目内 data/*.js 模块：顶层只做赋值，返回空对象桩即可
    if (id.indexOf(".js") >= 0) return {}
    throw new Error("未打桩的依赖: " + id)
  }

  return env
}

function compile(env) {
  var code = readScript()
  var fn = new Function("__req", "module", "console", code)
  var module = { exports: {} }
  fn(env.__req, module, { log: function () {}, error: function () {}, warn: function () {} })
  return module.exports
}

// ---------------------------------------------------------------- 用例

console.log("\n" + C.bold + "「课堂提醒」下行 action=notify 单元测试" + C.reset + "\n")

// 1) class_start：提示条文案 + 3 次急促震动 + 回 ok + 落档
;(function () {
  console.log(C.bold + "① 上课提醒（class_start）" + C.reset)
  var env = makeEnv()
  var mod = compile(env)
  eq("app.ux 导出了测试钩子", typeof mod.__test, "object")

  mod.__test.syncHandleNotify(env.connect, { action: "notify", type: "class_start", text: "上课了！" })

  eq("手环弹出提示条，文案=text", env.toasts[0], "上课了！")
  ok("震动了", env.vibrateCalls.length >= 1, "实际调用 " + env.vibrateCalls.length + " 次")
  eq("上课 = 震动 3 次（急促）", env.vibrateCalls[0].count, 3)
  eq("回包 ok=true", env.replies[0] && env.replies[0].ok, true)
  eq("回包 action=notify", env.replies[0] && env.replies[0].action, "notify")
  eq("回包回显 type=class_start", env.replies[0] && env.replies[0].type, "class_start")
  ok("落了 ev_last_notify 档", !!env.storage["ev_last_notify"], "storage keys=" + JSON.stringify(Object.keys(env.storage)))
  ok("落档内容含 class_start", String(env.storage["ev_last_notify"] || "").indexOf("class_start") >= 0)
})()

// 2) class_end：1 次舒缓震动
;(function () {
  console.log("\n" + C.bold + "② 下课提醒（class_end）" + C.reset)
  var env = makeEnv()
  var mod = compile(env)
  mod.__test.syncHandleNotify(env.connect, { action: "notify", type: "class_end", text: "下课了！" })

  eq("提示条文案=下课了！", env.toasts[0], "下课了！")
  eq("下课 = 震动 1 次（舒缓）", env.vibrateCalls[0].count, 1)
  eq("回包 type=class_end", env.replies[0] && env.replies[0].type, "class_end")
})()

// 3) 缺 text：按 type 兜默认文案
;(function () {
  console.log("\n" + C.bold + "③ 缺 text 时按 type 兜默认文案" + C.reset)
  var envA = makeEnv()
  compile(envA).__test.syncHandleNotify(envA.connect, { action: "notify", type: "class_start" })
  eq("class_start 无 text → 「上课了！」", envA.toasts[0], "上课了！")

  var envB = makeEnv()
  compile(envB).__test.syncHandleNotify(envB.connect, { action: "notify", type: "class_end" })
  eq("class_end 无 text → 「下课了！」", envB.toasts[0], "下课了！")

  var envC = makeEnv()
  compile(envC).__test.syncHandleNotify(envC.connect, {})
  eq("type 也没有 → 默认「上课了！」", envC.toasts[0], "上课了！")
})()

// 4) 健壮性：提示条抛异常也必须回包 ok（否则手机端会误判成失败）
;(function () {
  console.log("\n" + C.bold + "④ 提示条异常时仍回包（不误伤送达判定）" + C.reset)
  var env = makeEnv()
  env.toastThrows = true
  var mod = compile(env)
  mod.__test.syncHandleNotify(env.connect, { action: "notify", type: "class_start", text: "上课了！" })

  eq("没有 toast 记到", env.toasts.length, 0)
  eq("仍然回了 ok=true", env.replies[0] && env.replies[0].ok, true)
  ok("仍然震动了", env.vibrateCalls.length >= 1)
})()

// 5) 震动回落：vibrator.start 失败 → vibrate({mode})
;(function () {
  console.log("\n" + C.bold + "⑤ 震动 start 失败时回落 vibrate({mode})" + C.reset)
  var env = makeEnv()
  env.vibratorMode = "fail"
  var mod = compile(env)
  mod.__test.syncHandleNotify(env.connect, { action: "notify", type: "class_start", text: "上课了！" })

  var modes = env.vibrateCalls.filter(function (c) { return c && c.mode }).map(function (c) { return c.mode })
  eq("回落调用带 mode 参数", modes.length >= 1, true)
  ok("class_start 回落 mode=short", modes.indexOf("short") >= 0, "实际 modes=" + JSON.stringify(modes))
})()

// 6) 分发路由：onmessage 收到 notify 必须进 notify 处理（而不是掉进 import 兜底）
;(function () {
  console.log("\n" + C.bold + "⑥ onmessage 路由：action=notify 走 notify 分支" + C.reset)
  var env = makeEnv()
  var mod = compile(env)
  mod.__test.initSyncReceiver()
  ok("onmessage 已被 app 注册", typeof env.connect.onmessage === "function")

  env.connect.onmessage({ data: { action: "notify", type: "class_start", text: "上课了！" } })

  eq("路由后弹了提示条", env.toasts[0], "上课了！")
  eq("路由后回了 action=notify", env.replies[0] && env.replies[0].action, "notify")
  eq("回包 ok=true（不是 import 兜底的 no courses）", env.replies[0] && env.replies[0].ok, true)
  ok("原始报文留档 astrobox_sync_data", !!env.storage["astrobox_sync_data"])
})()

// ---------------------------------------------------------------- 汇总
console.log("\n" + C.bold + "──────────────────────────────" + C.reset)
if (failed === 0) {
  console.log(green(C.bold + "全部通过：" + passed + " 项" + C.reset))
} else {
  console.log(red(C.bold + "失败 " + failed + " 项 / 共 " + (passed + failed) + " 项" + C.reset))
  failures.forEach(function (f) { console.log("  " + red("•") + " " + f) })
}
console.log("")
process.exit(failed === 0 ? 0 : 1)
