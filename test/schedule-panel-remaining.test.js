/**
 * 剩余课程（schedule-panel-remaining）单元测试 —— node test/schedule-panel-remaining.test.js
 *
 * 与 test/schedule-panel-simple.test.js 同法：快应用逻辑在 .ux 的 <script> 里，
 * Node 不能直接 require，这里抽出真实源码求值 + 注入桩（假时钟 / 假定时器 / 假数据层）。
 *
 * 钉死的命门：
 *   1) 结构：A 主数字 72px / B 单位行 20px / C 分隔 168×1 / D 四行 44 / E 溢出 16px，
 *      无 <scroll>，无 setInterval；
 *   2) 剩余判定：只保留「未结束」的课，正在上的只算剩余段；已结束/脏时间剔除；
 *   3) 总时长：按每节剩余段求和（不吃课间、不吃午休）；舍入到 5 分钟且不许舍成 0；
 *   4) 四态：0 节（全上完）/ 0 节（今天没课）/ 1 节 / 4 节（正好填满，无溢出）/ 7 节（溢出 3）；
 *   5) 分钟级刷新：只有一个对齐整分的 setTimeout，onHide/onDestroy 双清；
 *   6) 冷启兜底：storage 不回也要首帧用内置课表出画。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "schedule-panel-remaining", "schedule-panel-remaining.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""
// 注释里会提到禁用的 API 名，查禁区要剔掉注释只看真代码
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

var DAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
// 2026-10-20 是星期二（固定时钟 → 可复现）
function T(hhmmss, day) { return new Date("2026-10-" + (day || 20) + "T" + hhmmss + "+08:00").getTime() }

// 粗略字宽估算（校准依据：实测「节 · 今日课程已全」8 字被 168px 截断，
// 即全角 ≈ 1.0em、半角 ≈ 0.55em、空格 ≈ 0.3em）。用来在单测里拦住「文案变长撑爆一行」。
function estW(s, fs) {
  var w = 0
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i)
    w += (c === 32) ? 0.3 * fs : (c > 127 ? 1.0 * fs : 0.55 * fs)
  }
  return w
}

var DOW = new Date(T("08:00:00")).getDay()
var TODAY = DAY_NAMES[DOW]
var OTHER = DAY_NAMES[(DOW + 1) % 7]

var THEME = {
  bg: "#1a1a2e", card: "#16213e", border: "#0f3460", accent: "#7ec8e3",
  text: "#ffffff", textSecondary: "#888899", textMuted: "#555566"
}

// 7 节（含午休 11:45→13:00 的空档）：测溢出与「不串算」
var FIX7 = [
  { day: TODAY, classes: [
    { id: "1", name: "语文", time: "08:00 - 08:45" },
    { id: "2", name: "数学", time: "09:00 - 09:45" },
    { id: "3", name: "英语", time: "10:00 - 10:45" },
    { id: "4", name: "物理", time: "11:00 - 11:45" },
    { id: "5", name: "化学", time: "13:00 - 13:45" },
    { id: "6", name: "生物", time: "14:00 - 14:45" },
    { id: "7", name: "历史", time: "15:00 - 15:45" }
  ]},
  { day: OTHER, classes: [{ id: "9", name: "体育", time: "08:00 - 08:45" }] }
]

// 正好 4 节（11:00 起，中间跨午休）
var FIX4 = [
  { day: TODAY, classes: [
    { id: "a", name: "语文", time: "11:00 - 11:45" },
    { id: "b", name: "数学", time: "13:00 - 13:45" },
    { id: "c", name: "英语", time: "14:00 - 14:45" },
    { id: "d", name: "物理", time: "15:00 - 15:45" }
  ]}
]

// 只有 1 节，且带一条脏时间（不应计入）
var FIX1 = [
  { day: TODAY, classes: [
    { id: "x", name: "历史", time: "15:00 - 15:45" },
    { id: "y", name: "坏数据", time: "乱码" }
  ]}
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
    getAllCourses: function(cb) { dbCalls.getAll++; if (opts.dbGet !== false) cb(opts.schedule === undefined ? FIX7 : opts.schedule) }
  }
  var fakeStore = { getTheme: function(cb) { cb(THEME, "blue") } }
  var fakeUtils = { exitApp: function() { return true } }
  var fakeBuiltin = { schedule: opts.builtin === undefined ? FIX7 : opts.builtin }

  function fakeRequire(p) {
    if (/database\.js$/.test(p)) return fakeDb
    if (/store\.js$/.test(p)) return fakeStore
    if (/utils\.js$/.test(p)) return fakeUtils
    if (/schedule\.js$/.test(p)) return fakeBuiltin
    if (/^@system\.storage$/.test(p)) return { set: function() {} }
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
  return inst
}

console.log("\n\x1b[1m剩余课程栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构与禁区 */
console.log("\n[1] 结构 / 禁区")
truthy("模板含 A 主数字 .big-count", /class="big-count"/.test(TPL))
truthy("模板含 B 单位行 .unit-line", /class="unit-line"/.test(TPL))
truthy("模板含 C 分隔 .divider", /class="divider"/.test(TPL))
truthy("模板含 D 列表 for=shownClasses", /for="\{\{ shownClasses \}\}"/.test(TPL))
truthy("模板含 E 溢出提示", /class="overflow-tip"/.test(TPL))
truthy("A→B→C→D→E 顺序正确",
  TPL.indexOf("big-count") < TPL.indexOf("unit-line") &&
  TPL.indexOf("unit-line") < TPL.indexOf("divider") &&
  TPL.indexOf("divider") < TPL.indexOf("shownClasses") &&
  TPL.indexOf("shownClasses") < TPL.indexOf("overflow-tip"))
truthy("无 <scroll>（D 区固定 4 行）", !/<scroll/.test(TPL))
truthy("全页无 setInterval（分钟级）", !/setInterval/.test(CODE))
truthy("无 @keyframes（本页不做动画）", !/@keyframes/.test(STYLE))
truthy("style 无数据绑定 {{ }}", !/\{\{[^}]*\}\}/.test(STYLE))
eq("A 主数字 72px", (/\.big-count \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "72")
eq("B 单位行 18px（20px 实测溢出）", (/\.unit-line \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "18")
eq("C 分隔宽 168", (/\.divider \{[\s\S]*?width: (\d+)px/.exec(STYLE) || [])[1], "168")
eq("C 分隔高 1", (/\.divider \{[\s\S]*?height: (\d+)px/.exec(STYLE) || [])[1], "1")
eq("D 行高 44", (/\.row \{[\s\S]*?height: (\d+)px/.exec(STYLE) || [])[1], "44")
eq("D 容器高 176（4×44）", (/\.list \{[\s\S]*?height: (\d+)px/.exec(STYLE) || [])[1], "176")
eq("D 课名 22px", (/\.row-name \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "22")
eq("E 溢出提示 16px", (/\.overflow-tip \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "16")
truthy("课名单行省略不换行", /lines:\s*1/.test(STYLE) && /text-overflow:\s*ellipsis/.test(STYLE))
truthy("B 单位行只许一行（折行会顶飞 D 区）", /\.unit-line \{[\s\S]*?lines:\s*1/.test(STYLE))
truthy("B 行最坏串「节 · 10 小时 55 分」18px 估算 ≤168 不截断", estW("节 · 10 小时 55 分", 18) <= 168)
truthy("B 行空态「节」不超宽", estW("节", 18) <= 168)
truthy("D 空态「今日已上完」18px 估算 ≤168 不折行", estW("今日已上完", 18) <= 168)

/* 2. 7 节：填满 4 行 + 溢出 3 */
console.log("\n[2] 7 节（早 07:00）")
var a = makeInst(T("07:00:00"))
a.onInit()
eq("剩余 7 节", a.remainCount, 7)
eq("列表只渲染 4 行", a.shownClasses.length, 4)
eq("溢出 3 节", a.overflowCount, 3)
eq("列表首行 08:00", a.shownClasses[0].timeShort, "08:00")
eq("列表末行 11:00（不是第 7 节 15:00）", a.shownClasses[3].timeShort, "11:00")
eq("非今日（明天体育）不混入", a.shownClasses.filter(function(c) { return c.name === "体育" }).length, 0)
eq("总时长 7×45=315 → 5 小时 15 分", a.unitText, "节 · 5 小时 15 分")

/* 3. 正在上的课只算剩余段（不吃课间/午休） */
console.log("\n[3] 剩余时长口径（正在上 / 跨午休）")
var b = makeInst(T("10:30:00"))
b.onInit()
eq("10:30 剩余 5 节（英语仍在上）", b.remainCount, 5)
eq("英语只算剩余 15 分：15+45×4=195 → 3 小时 15 分", b.unitText, "节 · 3 小时 15 分")
eq("正在上的英语标记 isCurrent", b.shownClasses[0].isCurrent, true)
eq("已上完的语文不再出现", b.shownClasses.filter(function(c) { return c.name === "语文" }).length, 0)

var c4 = makeInst(T("10:00:00"), { schedule: FIX4 })
c4.onInit()
eq("4 节正好填满 D 区", c4.shownClasses.length, 4)
eq("4 节无溢出", c4.overflowCount, 0)
// 若按「末节结束 − 现在」串算 = 15:45-10:00 = 345 分（5 小时 45 分），会把午休算进去
eq("跨午休不串算：4×45=180 → 3 小时", c4.unitText, "节 · 3 小时")

/* 4. 0 节 / 1 节 */
console.log("\n[4] 0 节 / 1 节")
var d = makeInst(T("20:00:00"))
d.onInit()
eq("20:00 剩余 0 节", d.remainCount, 0)
eq("列表 0 行", d.shownClasses.length, 0)
eq("全上完的单位行只留「节」（说明交给 D 区，不重复）", d.unitText, "节")
eq("全上完的空态文案", d.emptyMessage, "今日已上完")

var e = makeInst(T("09:00:00"), { schedule: [{ day: OTHER, classes: [{ id: "9", name: "体育", time: "08:00 - 08:45" }] }] })
e.onInit()
eq("今天没课 → 0 节", e.remainCount, 0)
eq("今天没课的单位行只留「节」", e.unitText, "节")
eq("今天没课的空态文案", e.emptyMessage, "今天没课")

var f = makeInst(T("14:00:00"), { schedule: FIX1 })
f.onInit()
eq("1 节（脏时间已剔除）", f.remainCount, 1)
eq("只有 1 行", f.shownClasses.length, 1)
eq("1 节无溢出", f.overflowCount, 0)
eq("45 分 → 还有 45 分", f.unitText, "节 · 45 分")

/* 5. P2 舍入到 5 分钟 */
console.log("\n[5] 舍入到 5 分钟")
var g = makeInst(T("10:33:00"))
g.onInit()
// 英语剩 12 分 + 45×4 = 192 → 舍到 190 → 3 小时 10 分
eq("192 分舍入到 190 → 3 小时 10 分", g.unitText, "节 · 3 小时 10 分")

var h = makeInst(T("10:44:00"))
h.onInit()
// 英语剩 1 分 + 45×4 = 181 → 对「总时长」取整 → 180 → 3 小时（舍入只发生一次，不逐节取整）
eq("181 分舍入到 180 → 3 小时", h.unitText, "节 · 3 小时")

// 真正的 0 值兜底：全场只剩 1 分钟时，不许显示「0 分」
var h2 = makeInst(T("10:44:00"), { schedule: [{ day: TODAY, classes: [{ id: "t", name: "英语", time: "10:00 - 10:45" }] }] })
h2.onInit()
eq("总剩余 1 分 → 兜底 5 分（不显示 0）", h2.unitText, "节 · 5 分")

/* 6. 分钟级刷新 / 定时器唯一 */
console.log("\n[6] 分钟级刷新")
var i1 = makeInst(T("08:30:00"))
i1.onInit()
eq("onInit 后只挂 1 个定时器", i1.__timers.pending(), 1)
eq("整分对齐（08:30:00 → 60000ms）", i1.__timers.calls[0], 60000)

var i2 = makeInst(T("08:30:20"))
i2.onInit()
eq("08:30:20 → 40000ms（对齐下一个整分）", i2.__timers.calls[0], 40000)

i2.__timers.flush(3)
eq("连跑 3 次仍只挂 1 个定时器（不叠加）", i2.__timers.pending(), 1)

i2.onHide()
eq("onHide 清定时器", i2.__timers.pending(), 0)

var i3 = makeInst(T("08:30:00"))
i3.onInit()
i3.onShow()
eq("onShow 重算后仍只挂 1 个（不叠加）", i3.__timers.pending(), 1)
i3.onDestroy()
eq("onDestroy 清定时器", i3.__timers.pending(), 0)

/* 7. 冷启兜底 */
console.log("\n[7] 冷启兜底（storage 不回也要出画）")
var j = makeInst(T("07:00:00"), { dbInit: false })
j.onInit()
eq("storage 不回调也不是「加载中」", j.isLoading, false)
eq("首帧用内置课表算出 7 节", j.remainCount, 7)
eq("首帧就挂好分钟级定时器", j.__timers.pending(), 1)

var k = makeInst(T("07:00:00"), { dbGet: false, builtin: [] })
k.onInit()
eq("内置课表也空时退化为 0 节而非卡住", k.remainCount, 0)
eq("空数据时单位行只留「节」且不卡住", k.unitText, "节")

console.log("\n" + (fail === 0
  ? "\x1b[32m✔ 全部 " + pass + " 项通过\x1b[0m"
  : "\x1b[31m✘ " + fail + " 项失败 / 共 " + (pass + fail) + " 项\x1b[0m") + "\n")
process.exit(fail === 0 ? 0 : 1)
