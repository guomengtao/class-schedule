/**
 * 简易课表（schedule-panel-simple）单元测试 —— node test/schedule-panel-simple.test.js
 *
 * 与 test/schedule-panel-countdown.test.js 同法：快应用逻辑在 .ux 的 <script> 里，
 * Node 不能直接 require，这里抽出真实源码求值 + 注入桩（假时钟 / 假定时器 / 假数据层）。
 *
 * 钉死的命门：
 *   1) 结构：今日 5 行固定布局，无 <scroll>，无 setInterval；
 *   2) 数据：只取「今天」，按开始时间升序，最多 5 行；标题按当天星期推导（禁写死）；
 *   3) 三色状态点：已过灰 / 当前主色 / 未到白；
 *   4) 分钟级刷新：只有一个对齐整分的 setTimeout，全页无 setInterval；
 *   5) 冷启兜底：storage 不回也要在首帧用内置课表出画面（不许永远「加载中」）；
 *   6) 生命周期：onHide 清定时器，onDestroy 双清。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "schedule-panel-simple", "schedule-panel-simple.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""
// 注释里会提到禁用的 API 名（如「禁用 setInterval」），查禁区要剔掉注释只看真代码
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

// 今天按「注入时钟」推导，禁写死星期（纪律 #4）
var DAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var DAY_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
// 2026-10-20 是星期二（固定时钟 → 可复现）
function T(hhmm, day) { var d = day || 20; return new Date("2026-10-" + d + "T" + hhmm + ":00+08:00").getTime() }
var DOW = new Date(T("08:00")).getDay()
var TODAY = DAY_NAMES[DOW]
var OTHER = DAY_NAMES[(DOW + 1) % 7]
var TITLE = "今天 · " + DAY_SHORT[DOW]

// 故意打乱顺序，验证升序排序
var FIXTURE = [
  { day: TODAY, classes: [
    { id: "5", name: "化学", time: "14:00 - 14:45" },
    { id: "1", name: "语文", time: "08:00 - 08:45", location: "东楼 201" },
    { id: "3", name: "英语", time: "10:00 - 10:45" },
    { id: "2", name: "数学", time: "09:00 - 09:45" },
    { id: "4", name: "物理", time: "11:00 - 11:45" }
  ]},
  { day: OTHER, classes: [{ id: "9", name: "体育", time: "08:00 - 08:45" }] }
]

var THEME = {
  bg: "#1a1a2e", card: "#16213e", border: "#0f3460", accent: "#7ec8e3",
  text: "#ffffff", textSecondary: "#888899", textMuted: "#555566"
}

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
  var fakeStore = { getTheme: function(cb) { cb(THEME, "blue") } }
  var fakeUtils = { exitApp: function() { return true } }
  var fakeBuiltin = { schedule: opts.builtin === undefined ? FIXTURE : opts.builtin }
  var fakeStorage = { last: {}, set: function(o) { fakeStorage.last[o.key] = o.value; if (o.success) o.success() } }

  function fakeRequire(p) {
    if (/database\.js$/.test(p)) return fakeDb
    if (/store\.js$/.test(p)) return fakeStore
    if (/utils\.js$/.test(p)) return fakeUtils
    if (/schedule\.js$/.test(p)) return fakeBuiltin
    if (/^@system\.storage$/.test(p)) return fakeStorage
    throw new Error("未预期的 require: " + p)
  }
  var router = { last: null, back: function() { this.last = "back" }, push: function(o) { this.last = "push:" + o.uri } }

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
  inst.__storage = fakeStorage
  return inst
}

console.log("\n\x1b[1m简易课表栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构与禁区 */
console.log("\n[1] 结构 / 禁区")
truthy("模板含 A 今日标题", /class="today-title"/.test(TPL))
truthy("模板含 B 课程行 for 循环", /for="\{\{ todayClasses \}\}"/.test(TPL))
truthy("模板含状态点", /class="dot"/.test(TPL))
truthy("A 在 B 之前（标题在上、列表在下）", TPL.indexOf("today-title") < TPL.indexOf("todayClasses"))
truthy("无 <scroll>（固定 5 行不滚动）", !/<scroll/.test(TPL))
truthy("全页无 setInterval（分钟级）", !/setInterval/.test(CODE))
truthy("无 @keyframes（本页不做动画）", !/@keyframes/.test(STYLE))
truthy("style 无数据绑定 {{ }}", !/\{\{[^}]*\}\}/.test(STYLE))
eq("行高 52px", (/\.row \{[\s\S]*?height: (\d+)px/.exec(STYLE) || [])[1], "52")
eq("今日标题 22px", (/\.today-title \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "22")
truthy("课名单行省略", /text-overflow:\s*ellipsis/.test(STYLE))

/* 2. 数据 / 标题 */
console.log("\n[2] 数据 / 标题")
var a = makeInst(T("08:30"))
a.onInit()
eq("标题按当天星期推导", a.todayTitle, TITLE)
eq("今日课程 5 行（正好填满 B 区）", a.todayClasses.length, 5)
eq("按开始时间升序：首行语文", a.todayClasses[0].name, "语文")
eq("按开始时间升序：末行化学", a.todayClasses[4].name, "化学")
eq("timeShort 只取开始时间", a.todayClasses[0].timeShort, "08:00")
eq("非今日（明天）的课不混入", a.todayClasses.filter(function(c) { return c.name === "体育" }).length, 0)

/* 3. 三色状态点 */
console.log("\n[3] 三色状态点（已过灰 / 当前主色 / 未到白）")
var b = makeInst(T("10:30"))
b.onInit()
eq("已过课（语文）灰", b.todayClasses[0].dotColor, THEME.textMuted)
eq("已过课（数学）灰", b.todayClasses[1].dotColor, THEME.textMuted)
eq("当前课（英语 10:00-10:45）主色", b.todayClasses[2].dotColor, THEME.accent)
eq("当前课标记 isCurrent", b.todayClasses[2].isCurrent, true)
eq("未到课（物理）白", b.todayClasses[3].dotColor, THEME.text)
eq("未到课（化学）白", b.todayClasses[4].dotColor, THEME.text)

var c0 = makeInst(T("08:30"))
c0.onInit()
eq("上课中：首行即当前课", c0.todayClasses[0].isCurrent, true)
eq("上课中：首行主色", c0.todayClasses[0].dotColor, THEME.accent)

var c1 = makeInst(T("16:00"))
c1.onInit()
eq("全部下课后：末行也变灰", c1.todayClasses[4].dotColor, THEME.textMuted)

/* 4. 边界态 */
console.log("\n[4] 边界态")
var d0 = makeInst(T("08:30"), { schedule: [] })
d0.onInit()
eq("0 课：列表为空（走 C 空态）", d0.todayClasses.length, 0)
eq("0 课：标题仍在", d0.todayTitle, TITLE)

var seven = [{ day: TODAY, classes: [] }]
for (var i = 0; i < 7; i++) seven[0].classes.push({ id: "x" + i, name: "课" + i, time: ("0" + (8 + i)) + ":00 - 0" + (8 + i) + ":45" })
var d1 = makeInst(T("07:00"), { schedule: seven })
d1.onInit()
eq("7 课：最多显示 5 行", d1.todayClasses.length, 5)

var dirty = [{ day: TODAY, classes: [
  { id: "1", name: "有效", time: "08:00 - 08:45" },
  { id: "2", name: "脏数据", time: "请假" },
  { id: "3", name: "有效2", time: "09:00 - 09:45" }
]}]
var d2 = makeInst(T("07:00"), { schedule: dirty })
d2.onInit()
eq("脏时间格式被跳过：只剩 2 行", d2.todayClasses.length, 2)

/* 5. 分钟级刷新 */
console.log("\n[5] 分钟级刷新")
var e = makeInst(new Date("2026-10-20T12:34:56+08:00").getTime())
e.onInit()
eq("onInit 后只挂 1 个定时器", e.__timers.pending(), 1)
var delays = e.__timers.calls
eq("对齐整分：56 秒 → 等 4s", delays[delays.length - 1], 4000)

var e2 = makeInst(new Date("2026-10-20T12:34:00+08:00").getTime())
e2.onInit()
var del2 = e2.__timers.calls
eq("整分整秒 → 等 60s", del2[del2.length - 1], 60000)

var e3 = makeInst(T("12:34"))
e3.onInit()
e3.__timers.flush(1)
var after = e3.__timers.calls
eq("到点重算后再排一个分钟定时器", after[after.length - 1], 60000)

/* 6. 首帧必出内容（回归：不许永远「加载中」） */
console.log("\n[6] 首帧必出内容（回归：不许永远「加载中」）")
var f = makeInst(T("08:30"), { dbInit: false })
f.onInit()
eq("database.init 不回：onInit 返回即非加载态", f.isLoading, false)
eq("用内置课表直接出 5 行", f.todayClasses.length, 5)
eq("内置课表内容正确", f.todayClasses[0].name, "语文")

var g = makeInst(T("08:30"), { dbGet: false })
g.onInit()
eq("init 回了、getAll 不回：照样有画面", g.isLoading, false)
eq("画面内容不受影响", g.todayClasses.length, 5)

var h = makeInst(T("08:30"), { builtin: [] })
h.onInit()
eq("内置课表为空：首帧不空转（isLoading=false）", h.isLoading, false)
eq("内置为空但 storage 回来后覆盖", h.todayClasses.length, 5)

/* 7. 生命周期清理 */
console.log("\n[7] 生命周期清理")
var j = makeInst(T("08:30"))
j.onInit()
j.onHide()
eq("onHide 清掉分钟定时器", j.__timers.pending(), 0)
var k = makeInst(T("08:30"), { dbInit: false })
k.onInit()
k.onDestroy()
eq("onDestroy 清掉分钟定时器", k.__timers.pending(), 0)

/* 8. 双模返回 / 跳转 */
console.log("\n[8] 双模返回 / 跳转")
var n1 = makeInst(T("08:30"))
n1.onInit()
eq("无 fromPanel → root 态", n1.isRoot, true)
eq("root 态返回键 → 退出应用", n1.onBackPress(), true)

n1.goToDetail(n1.todayClasses[0])
eq("跳详情：写入 detail_classId", n1.__storage.last.detail_classId, "1")
eq("跳详情：router.push /pages/detail", n1.__router.last, "push:/pages/detail")

console.log("\n" + (fail === 0 ? "\x1b[32m全部通过\x1b[0m" : "\x1b[31m有失败\x1b[0m") +
            "  \x1b[1m" + pass + "\x1b[0m 通过 / " + fail + " 失败\n")
process.exit(fail === 0 ? 0 : 1)
