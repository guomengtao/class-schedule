/**
 * 倒计时（schedule-panel-countdown）单元测试 —— node test/schedule-panel-countdown.test.js
 *
 * 同 test/watch-face-flip.test.js：快应用无框架，逻辑在 .ux 的 <script> 里，Node 不能直接 require。
 * 这里抽出真实源码求值 + 注入桩（假时钟 / 假定时器 / 假数据层），测的就是线上那份。
 *
 * 钉死的命门：
 *   1) 四态判定：上课中 / 今天下一节 / 今日结束→明日首节 / 无课；
 *   2) 大数字只在 1–3 字符内（≥100 压 99+），不越 168px 可用宽；
 *   3) 分钟级刷新：只有一个对齐整分的 setTimeout，全页无 setInterval；
 *   4) 冷启兜底：storage 不回也要在 600ms 内用内置课表出画面（不许永远「加载中」）；
 *   5) 生命周期：onHide 清分钟定时器，onDestroy 双清。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "schedule-panel-countdown", "schedule-panel-countdown.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""
// 注释里会提到禁用的 API 名（如「不用 setInterval」），查禁区要剔掉注释只看真代码
var CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

/* ── 桩 ─────────────────────────────────────────────── */

function makeClock(ms) {
  var c = { ms: ms }
  function FakeDate(v) { this._d = new Date(v === undefined ? c.ms : v) }
  ;["getHours", "getMinutes", "getSeconds", "getDate", "getMonth", "getDay"].forEach(function(k) {
    FakeDate.prototype[k] = function() { return this._d[k]() }
  })
  FakeDate.prototype.getTime = function() { return this._d.getTime() }
  FakeDate.now = function() { return c.ms }
  c.Date = FakeDate
  c.set = function(v) { c.ms = v }
  return c
}

function makeTimers() {
  var seq = 0, q = [], dead = {}
  var t = {
    now: 0, calls: [],
    setTimeout: function(fn, ms) { var id = ++seq; t.calls.push(ms || 0); q.push({ id: id, at: t.now + (ms || 0), fn: fn }); return id },
    clearTimeout: function(id) { dead[id] = 1 },
    pending: function() { return q.filter(function(j) { return !dead[j.id] }).length },
    flush: function(max) {
      var n = 0, lim = max || 50
      while (q.length && n < lim) {
        q.sort(function(a, b) { return a.at - b.at })
        var job = q.shift()
        if (dead[job.id]) continue
        t.now = job.at
        job.fn(); n++
      }
      return n
    }
  }
  return t
}

var FIXTURE = [
  { day: "星期二", classes: [
    { name: "语文", time: "08:00 - 08:45", location: "东楼 201" },
    { name: "数学", time: "10:00 - 10:45", location: "东楼 201" }
  ]},
  { day: "星期三", classes: [{ name: "英语", time: "09:00 - 09:45" }] }
]

function makeInst(atMs, opts) {
  opts = opts || {}
  var m = SRC.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("找不到 <script> 块")
  var code = m[1].replace(/^\s*import[^\n]*$/gm, "").replace(/export\s+default/, "module.exports =")
  var timers = makeTimers(), clock = makeClock(atMs), mod = {}

  var dbCalls = { init: 0, getAll: 0 }
  var fakeDb = {
    init: function(cb) { dbCalls.init++; if (opts.dbInit !== false) cb() },
    getAllCourses: function(cb) { dbCalls.getAll++; if (opts.dbGet !== false) cb(opts.schedule === undefined ? FIXTURE : opts.schedule) }
  }
  var fakeStore = { getTheme: function(cb) { cb({ bg: "#1a1a2e", card: "#16213e", border: "#0f3460", accent: "#7ec8e3", text: "#fff", textSecondary: "#888899", textMuted: "#555566" }, "blue") } }
  var fakeUtils = { exitApp: function() { return true } }
  var fakeBuiltin = { schedule: FIXTURE }
  function fakeRequire(p) {
    if (/database\.js$/.test(p)) return fakeDb
    if (/store\.js$/.test(p)) return fakeStore
    if (/utils\.js$/.test(p)) return fakeUtils
    if (/schedule\.js$/.test(p)) return fakeBuiltin
    throw new Error("未预期的 require: " + p)
  }
  var router = { last: null, back: function() { this.last = "back" } }

  var factory = new Function("router", "module", "require", "setTimeout", "clearTimeout", "Date",
                            code + "\nreturn module.exports")
  var def = factory(router, mod, fakeRequire, timers.setTimeout, timers.clearTimeout, clock.Date)

  var inst = {}
  Object.keys(def).forEach(function(k) { if (k !== "private") inst[k] = def[k] })
  var data = JSON.parse(JSON.stringify(def.private))
  Object.keys(data).forEach(function(k) { inst[k] = data[k] })
  inst.__timers = timers
  inst.__clock = clock
  inst.__router = router
  inst.__dbCalls = dbCalls
  return inst
}

// 2026-10-20 是星期二
function T(hhmm, day) {
  var d = day || 20
  return new Date("2026-10-" + d + "T" + hhmm + ":00+08:00").getTime()
}

console.log("\n\x1b[1m倒计时栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构与禁区 */
console.log("\n[1] 结构 / 禁区")
truthy("模板含 A 课名", /class="c-name"/.test(TPL))
truthy("模板含 B 大数字", /class="c-num"/.test(TPL))
truthy("模板含 C 单位文案", /class="c-unit"/.test(TPL))
truthy("模板含 D 时间区间", /class="c-time"/.test(TPL))
truthy("A 在 B 之前（课名在上、数字在中）", TPL.indexOf("c-name") < TPL.indexOf("c-num"))
truthy("无 transform 数据绑定", !/\{\{[^}]*\}\}/.test(STYLE))
truthy("无 @keyframes（本页不做动画）", !/@keyframes/.test(STYLE))
truthy("无 <scroll>", !/<scroll/.test(TPL))
truthy("全页无 setInterval（分钟级，禁秒级轮询）", !/setInterval/.test(CODE))
eq("大数字基础字号 96px", (/\.c-num \{ font-size: (\d+)px/.exec(STYLE) || [])[1], "96")

/* 2. 四态判定 */
console.log("\n[2] 四态判定")
var a = makeInst(T("08:30"))
a.onInit()
eq("上课中：课名 = 当前课", a.nextClass.name, "语文")
eq("上课中：大数字 = 距下课 15", a.displayTime, "15")
eq("上课中：单位 = 分钟后下课", a.countdownLabel, "分钟后下课")

var b = makeInst(T("09:00"))
b.onInit()
eq("今天下一节：课名 = 数学", b.nextClass.name, "数学")
eq("今天下一节：大数字 = 60", b.displayTime, "60")
eq("今天下一节：单位 = 分钟后上课", b.countdownLabel, "分钟后上课")

var c = makeInst(T("05:00"))
c.onInit()
eq("距上课 180 分钟 → 压成 99+", c.displayTime, "99+")
eq("99+ 只有 3 字符（不越 168px）", c.displayTime.length, 3)

var d = makeInst(T("18:34"))
d.onInit()
eq("今日结束：切到明日首节（英语）", d.nextClass.name, "英语")
eq("明日首节：大数字 = 14 小时（18:34→次日 09:00）", d.displayTime, "14")
eq("明日首节：单位只 4 字（不折行）", d.countdownLabel, "小时后上课")
eq("明日首节：「明天」单独一行，不带空格", d.dayPrefix, "明天")

var e = makeInst(T("22:10", 21))
e.onInit()
eq("周三 22:10 → 最近有课的是下周二（不是更近的周三）", e.nextClass.name, "语文")
eq("跨多天：日期行用星期名", e.dayPrefix, "星期二")

var f = makeInst(T("08:30"), { schedule: [] })
f.onInit()
eq("空课表：无卡片", f.nextClass, null)
eq("空课表：文案", f.emptyMessage, "暂无课程")

/* 3. 分钟级刷新 */
console.log("\n[3] 分钟级刷新")
var g = makeInst(new Date("2026-10-20T12:34:56+08:00").getTime())
g.onInit()
var delays = g.__timers.calls
eq("onInit 后只挂 1 个定时器（600ms 兜底已被真实数据清掉）", g.__timers.pending(), 1)
eq("对齐整分：56 秒 → 等 4s", delays[delays.length - 1], 4000)

var g2 = makeInst(T("12:34"))
g2.onInit()
g2.__timers.flush(1)          // 走到 12:35:00
var after = g2.__timers.calls
eq("到点重算后再排一个分钟定时器", after[after.length - 1], 60000)

/* 4. 首帧必出内容（回归：不许永远「加载中」） */
console.log("\n[4] 首帧必出内容（回归：不许永远「加载中」）")
var h = makeInst(T("08:30"), { dbInit: false })
h.onInit()
eq("database.init 不回：onInit 返回即非加载态", h.isLoading, false)
eq("用内置课表直接算上课中", h.displayTime, "15")
eq("课名取内置课表", h.nextClass.name, "语文")

var i = makeInst(T("08:30"), { dbGet: false })
i.onInit()
eq("init 回了、getAll 不回：照样有画面", i.isLoading, false)
eq("画面内容不受影响", i.displayTime, "15")

var i2 = makeInst(T("08:30"), { schedule: [{ day: "星期二", classes: [{ name: "化学", time: "08:00 - 08:45" }] }] })
i2.onInit()
eq("storage 回来后真实数据覆盖内置课表", i2.nextClass.name, "化学")

/* 5. 生命周期 */
console.log("\n[5] 生命周期清理")
var j = makeInst(T("08:30"))
j.onInit()
j.onHide()
eq("onHide 清掉分钟定时器", j.__timers.pending(), 0)
var k = makeInst(T("08:30"), { dbInit: false })
k.onInit()
k.onDestroy()
eq("onDestroy 清掉分钟定时器", k.__timers.pending(), 0)

/* 6. 双模返回 */
console.log("\n[6] 双模返回")
var n1 = makeInst(T("08:30"))
n1.onInit()
eq("无 fromPanel → root 态", n1.isRoot, true)
eq("root 态返回键 → 退出应用", n1.onBackPress(), true)

console.log("\n" + (fail === 0 ? "\x1b[32m全部通过\x1b[0m" : "\x1b[31m有失败\x1b[0m") +
            "  \x1b[1m" + pass + "\x1b[0m 通过 / " + fail + " 失败\n")
process.exit(fail === 0 ? 0 : 1)
