/**
 * 留言板「回复」功能单元测试（src/pages/message-inbox/message-inbox.ux）
 *
 * 用法：node test/message-inbox.test.js
 *
 * 背景（2026-10-04）：
 *   手环留言板过去只能看、不能回（收到手机留言后无法在手腕上回话）。
 *   本次新增：① 快捷短语一键回复 ②「自己写」跳中文输入页，回来后自动发出。
 *
 * 为什么这么测：
 *   快应用（Vela）没有 JS 测试框架，页面逻辑写在 .ux 的 <script> 里，Node 直接 require 不了。
 *   本脚本把 <script> 抽出来，把 import/require 换成可注入的桩，用 new Function 求值，
 *   拿到的就是**线上那份源码本身**（含真实的 reply-phrases 模块，不打桩）。
 *   外部依赖（store / message-store / chat-bridge / router / prompt / storage）全部打桩 ——
 *   是**纯单元测试**：不碰真 storage、不发任何消息。
 *
 *   重点覆盖「自己写」那条路最容易出错的竞态：onShow 首次进入也会触发，
 *   若不带「等待输入页返回」标记，就会把上次的旧草稿重复发出去。
 */

"use strict"

var fs = require("fs")
var path = require("path")

var C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
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
function deepEq(name, actual, expected) {
  var a = JSON.stringify(actual)
  var b = JSON.stringify(expected)
  ok(name, a === b, "期望 " + b + "，实际 " + a)
}

// ---------------------------------------------------------------- 源码装载

var UX_FILE = path.join(__dirname, "../src/pages/message-inbox/message-inbox.ux")

/**
 * 从 .ux 抽出 <script>，转成可在 Node 求值的 CommonJS 片段。
 * 与 app.ux 不同，页面用的是 `import X from "…"`，所以多一步 import → __req 转换。
 */
function readScript() {
  var src = fs.readFileSync(UX_FILE, "utf8")
  var m = src.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) { throw new Error("在 " + UX_FILE + " 里找不到 <script> 块") }
  var js = m[1]
    .replace(/import\s+(\w+)\s+from\s+(["'])([^"']+)\2/g, "var $1 = __req($2$3$2)")
    .replace(/require\((["'])([^"']+)\1\)/g, "__req($1$2$1)")
    .replace(/export\s+default\s*/, "module.exports = ")
  return js
}

// ---------------------------------------------------------------- 依赖桩

function makeEnv() {
  var env = {
    toasts: [],
    sent: [],
    navigations: [],
    storage: {},
    inbox: [],
    sendOk: true
  }

  var promptStub = {
    showToast: function (o) { env.toasts.push(o && o.message) }
  }

  var routerStub = {
    push: function (o) { env.navigations.push(o && o.uri) },
    back: function () { env.navigations.push("(back)") }
  }

  var storageStub = {
    get: function (o) {
      var v = env.storage[o.key]
      if (v === undefined) { o.fail && o.fail() } else { o.success && o.success(v) }
    },
    set: function (o) {
      env.storage[o.key] = String(o.value === undefined || o.value === null ? "" : o.value)
      o.success && o.success()
    },
    delete: function (o) { delete env.storage[o.key]; o.success && o.success() }
  }

  var chatBridgeStub = {
    register: function () {},
    ready: function () { return true },
    send: function (text) {
      if (!env.sendOk) { return false }
      env.sent.push(text)
      return true
    },
    sendCmd: function () { return true }
  }

  var msgStoreStub = {
    getInbox: function (cb) { cb(env.inbox.slice(0)) },
    toggleRead: function (id, cb) {
      for (var i = 0; i < env.inbox.length; i++) {
        if (env.inbox[i].id === id) { env.inbox[i].read = !env.inbox[i].read }
      }
      if (cb) { cb() }
    },
    clearAll: function (cb) { env.inbox = []; if (cb) { cb() } },
    unreadCount: function (list) {
      var n = 0
      for (var i = 0; i < list.length; i++) { if (!list[i].read) { n++ } }
      return n
    },
    formatTime: function () { return "10-04 11:30" }
  }

  var storeStub = {
    getTheme: function (cb) {
      cb({ bg: "#000", card: "#111", cardLight: "#222", accent: "#7ec8e3", text: "#fff", textMuted: "#666", textSecondary: "#888", deleteBg: "#333", deleteText: "#e08080" }, "dark")
    }
  }

  var realReplyPhrases = require(path.join(__dirname, "../src/data/reply-phrases.js"))

  env.__req = function (id) {
    if (id === "@system.router") { return routerStub }
    if (id === "@system.prompt") { return promptStub }
    if (id === "@system.storage") { return storageStub }
    if (id.indexOf("chat-bridge.js") >= 0) { return chatBridgeStub }
    if (id.indexOf("message-store.js") >= 0) { return msgStoreStub }
    if (id.indexOf("store.js") >= 0) { return storeStub }
    if (id.indexOf("reply-phrases.js") >= 0) { return realReplyPhrases }
    throw new Error("未打桩的依赖: " + id)
  }

  return env
}

/** 求值源码，构造一个「页面实例」（private 数据 + 方法都在 this 上） */
function makePage(env) {
  var mod = { exports: {} }
  var fn = new Function("__req", "module", "exports", "console", readScript())
  fn(env.__req, mod, mod.exports, { log: function () {}, warn: function () {}, error: function () {} })
  var Page = mod.exports
  var inst = {}
  for (var k in Page) { inst[k] = Page[k] }
  var priv = Page.private || {}
  for (var p in priv) { inst[p] = JSON.parse(JSON.stringify(priv[p])) }
  return inst
}

// ---------------------------------------------------------------- 1. 初始化

console.log("\n" + dim("留言板回复 · 单元测试") + "\n")
console.log("初始化")

var env1 = makeEnv()
var page1 = makePage(env1)
page1.onInit()

ok("phrases 已由 onInit 填充", Array.isArray(page1.phrases) && page1.phrases.length > 0)
eq("短语数量与数据模块一致", page1.phrases.length, 4)
ok("短语含「收到」", page1.phrases.indexOf("收到") >= 0)

// ---------------------------------------------------------------- 2. 快捷短语回复

console.log("\n快捷短语回复")

var env2 = makeEnv()
var page2 = makePage(env2)
page2.onInit()

page2.sendPhrase("收到")
deepEq("点快捷短语 → 已发出该短语", env2.sent, ["收到"])
ok("提示条显示已回复", String(env2.toasts[env2.toasts.length - 1]).indexOf("已回复") >= 0)
ok("本地留档写入 ev_chat_inbox", !!env2.storage.ev_chat_inbox)

var boxed = JSON.parse(env2.storage.ev_chat_inbox)
eq("留档 1 条", boxed.length, 1)
eq("留档标记为手环发出", boxed[0].from, "watch")
eq("留档文本正确", boxed[0].text, "收到")

// 每条回复都要有唯一 id（手机端按 id 去重，撞 id 会漏提醒）
page2.sendPhrase("好的")
var boxed2 = JSON.parse(env2.storage.ev_chat_inbox)
ok("两条回复 id 不重复", boxed2[0].id !== boxed2[1].id, "id1=" + boxed2[0].id + " id2=" + boxed2[1].id)

// ---------------------------------------------------------------- 3. 文本规范化与空值兜底

console.log("\n文本规范化 / 空值兜底")

var env3 = makeEnv()
var page3 = makePage(env3)
page3.onInit()

page3.doSend("   在上课   ")
deepEq("首尾空白被规范化", env3.sent, ["在上课"])

var before = env3.sent.length
page3.doSend("")
eq("空文本不发", env3.sent.length, before)
ok("空文本给出提示", String(env3.toasts[env3.toasts.length - 1]).indexOf("没有可回复") >= 0)

page3.doSend("   \n  ")
eq("纯空白不发", env3.sent.length, before)

// ---------------------------------------------------------------- 4. 未连接时不假装成功

console.log("\n设备未连接")

var env4 = makeEnv()
env4.sendOk = false
var page4 = makePage(env4)
page4.onInit()

page4.sendPhrase("收到")
eq("未连接时不发送", env4.sent.length, 0)
ok("给出未连接提示", String(env4.toasts[env4.toasts.length - 1]).indexOf("未连接") >= 0)
ok("未连接时不写本地留档", !env4.storage.ev_chat_inbox)

// ---------------------------------------------------------------- 5. 「自己写」跳转与参数写入

console.log("\n「自己写」跳转")

var env5 = makeEnv()
var page5 = makePage(env5)
page5.onInit()

page5.writeReply()

deepEq("跳转到中文输入页", env5.navigations, ["/pages/chinese-input"])
eq("标题已写入", env5.storage.chinese_input_title, "回复留言")
eq("占位符已写入", env5.storage.chinese_input_placeholder, "输入回复内容")
eq("输入框已清空", env5.storage.chinese_input_value, "")
eq("最大长度已写入", env5.storage.chinese_input_maxlen, "20")
eq("返回 key 指向草稿位", env5.storage.chinese_input_return_key, "ev_reply_draft")
eq("草稿位被清空（防旧值）", env5.storage.ev_reply_draft, "")
eq("等待标记已置位", env5.storage.ev_reply_awaiting, "1")

// ---------------------------------------------------------------- 6. 返回后自动发送草稿（含防重复）

console.log("\n返回后自动发送草稿")

var env6 = makeEnv()
var page6 = makePage(env6)
page6.onInit()

// ① 首次 onShow（没有任何等待标记）→ 不该发
page6.onShow()
eq("首次进入不发送（无标记）", env6.sent.length, 0)

// ② 走一遍「自己写」
page6.writeReply()
eq("跳转后仍在等待", env6.storage.ev_reply_awaiting, "1")

// ③ 用户在输入页写了内容并确认
env6.storage.ev_reply_draft = "稍后回"
page6.onShow()

deepEq("返回后把草稿发出", env6.sent, ["稍后回"])
eq("等待标记被清除", env6.storage.ev_reply_awaiting, "")
eq("草稿位被清除", env6.storage.ev_reply_draft, "")

// ④ 再 onShow 一次 —— 绝不能重复发送（这是本功能最容易翻车的竞态）
page6.onShow()
eq("再次进入不重复发送", env6.sent.length, 1)

// ⑤ 用户进了输入页但直接返回（没写内容）
page6.writeReply()
page6.onShow()
eq("空草稿不发", env6.sent.length, 1)
eq("空草稿也清掉等待标记", env6.storage.ev_reply_awaiting, "")

// ---------------------------------------------------------------- 7. 列表渲染数据

console.log("\n列表数据")

var env7 = makeEnv()
env7.inbox = [
  { id: "a", from: "phone", text: "第一条", ts: 1000, read: false },
  { id: "b", from: "phone", text: "第二条", ts: 2000, read: true }
]
var page7 = makePage(env7)
page7.onInit()

eq("messages 条数正确", page7.messages.length, 2)
eq("倒序显示（最新在前）", page7.messages[0].text, "第二条")
eq("未读计数正确", page7.unread, 1)
ok("每条都有格式化时间", !!page7.messages[0].timeStr)

// ---------------------------------------------------------------- 汇总

console.log("\n" + dim("──────────────────────────────"))
if (failed === 0) {
  console.log(green("全部通过") + "  " + passed + " 项")
} else {
  console.log(red("失败") + "  " + failed + " / " + (passed + failed) + " 项")
  console.log(dim("失败清单："))
  for (var k = 0; k < failures.length; k++) {
    console.log("  - " + failures[k])
  }
}
console.log("")
process.exit(failed === 0 ? 0 : 1)
