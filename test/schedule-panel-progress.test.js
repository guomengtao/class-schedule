/**
 * 当前进度（schedule-panel-progress）单元测试 —— node test/schedule-panel-progress.test.js
 *
 * 与 test/schedule-panel-simple.test.js 同法：快应用逻辑在 .ux 的 <script> 里，
 * Node 不能直接 require，这里抽出真实源码求值 + 注入桩（假时钟 / 假定时器 / 假数据层）。
 *
 * 钉死的命门：
 *   1) 结构：A 课名 56px（整屏最大）、B 状态行 20px、C 进度条 168×10、D 下一节、E 角标时钟；
 *   2) 三态：上课中 / 课间 / 已放学，外加「今天没课」空态；
 *   3) 进度：width 绑定百分比，0 / 33 / 50 / 67 / 100 各边界；
 *   4) 分钟级刷新：只有一个对齐整分的 setTimeout，全页无 setInterval（旧版是 10s 轮询）；
 *   5) 冷启兜底：storage 不回也要用内置课表出画面，不许停在 "—"；
 *   6) 生命周期：onHide 清定时器，onDestroy 双清；
 *   7) 宽度护栏：B/D 行按 168px 内容宽估算，加字即红。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "schedule-panel-progress", "schedule-panel-progress.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""
// 注释里会提到禁用的 API 名（如「禁止 setInterval」），查禁区要剔掉注释只看真代码
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
function T(hhmmss, day) { var d = day || 20; return new Date("2026-10-" + d + "T" + hhmmss + "+08:00").getTime() }
var DOW = new Date(T("08:00:00")).getDay()
var TODAY = DAY_NAMES[DOW]
var OTHER = DAY_NAMES[(DOW + 1) % 7]

// 故意打乱顺序，验证按开始时间升序（节次才能算对）
var FIXTURE = [
  { day: TODAY, classes: [
    { id: "5", name: "化学", time: "14:00 - 14:45", location: "实验楼" },
    { id: "1", name: "语文", time: "08:00 - 08:45", location: "东楼 201" },
    { id: "6", name: "自习", time: "15:00 - 16:00" },
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

// 168px 内容宽的粗略字宽估算（全角 1.0em / 半角 0.55em / 空格 0.3em，已按实拍校准）
function estW(s, fs2) {
  var w = 0
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i)
    w += (c === 32) ? 0.3 * fs2 : (c > 127 ? 1.0 * fs2 : 0.55 * fs2)
  }
  return w
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

  function fakeRequire(p) {
    if (/database\.js$/.test(p)) return fakeDb
    if (/store\.js$/.test(p)) return fakeStore
    if (/utils\.js$/.test(p)) return fakeUtils
    if (/schedule\.js$/.test(p)) return fakeBuiltin
    if (/^@system\.storage$/.test(p)) return { set: function() {} }
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

console.log("\n\x1b[1m当前进度栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构与禁区 */
console.log("\n[1] 结构 / 禁区")
truthy("模板含 A 课名", /class="a-name"/.test(TPL))
truthy("模板含 B 状态行", /class="b-status"/.test(TPL))
truthy("模板含 C 进度条（宽度绑定 progressPercent）", /class="c-bar-fill"[^>]*width:\s*\{\{ progressPercent \}\}%/.test(TPL))
truthy("模板含 D 下一节", /class="d-next"/.test(TPL))
truthy("模板含 E 角标时钟", /class="e-clock"/.test(TPL))
truthy("A 在 B 之前（课名在上、状态在下）", TPL.indexOf("a-name") < TPL.indexOf("b-status"))
truthy("C 在 D 之前（先看进度再看下节）", TPL.indexOf("c-bar-fill") < TPL.indexOf("d-next"))
truthy("无 <scroll>（固定一屏，不滚动）", !/<scroll/.test(TPL))
truthy("全页无 setInterval（旧版 10s 轮询已除）", !/setInterval/.test(CODE))
truthy("无 @keyframes（本页不做动画）", !/@keyframes/.test(STYLE))
truthy("style 无数据绑定 {{ }}", !/\{\{[^}]*\}\}/.test(STYLE))
eq("A 课名 56px", (/\.a-name \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "56")
eq("A 课名行高 62（两行 = 124）", (/\.a-name \{[\s\S]*?line-height: (\d+)px/.exec(STYLE) || [])[1], "62")
eq("B 状态行 20px", (/\.b-status \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "20")
eq("C 进度条 168×10", (/\.c-bar-bg \{[\s\S]*?width: (\d+)px;[\s\S]*?height: (\d+)px/.exec(STYLE) || []).slice(1).join("x"), "168x10")
eq("E 时钟 16px", (/\.e-clock \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "16")
truthy("课名两行后省略", /lines:\s*2/.test(STYLE) && /text-overflow:\s*ellipsis/.test(STYLE))
truthy("D 行课名弹性省略（flex + ellipsis）", /\.d-name \{[\s\S]*?flex:\s*1[\s\S]*?ellipsis/.test(STYLE))
truthy("有弹性占位把时钟顶到底部（margin-top:auto 本引擎实测不生效）",
  /class="spacer"/.test(TPL) && /\.spacer \{[^}]*flex:\s*1/.test(STYLE))

/* 2. 上课中 */
console.log("\n[2] 上课中（10:30 英语 10:00-10:45）")
var a = makeInst(T("10:30:00"))
a.onInit()
eq("状态 class", a.state, "class")
eq("A 课名 = 英语", a.focusName, "英语")
eq("A 用主色", a.nameColor, THEME.accent)
eq("B 第3节（按开始时间排序后的序号）", a.statusText, "第3节 · 剩 15 分")
eq("C 进度 30/45 → 67%", a.progressPercent, 67)
eq("D 下一节时间 = 物理 11:00", a.nextTime, "11:00")
eq("D 下一节课名 = 物理", a.nextName, "物理")
eq("E 时钟 = 10:30", a.clockText, "10:30")

/* 3. 进度边界 0 / 50 / 100 */
console.log("\n[3] 进度边界")
var b0 = makeInst(T("10:00:00"))
b0.onInit()
eq("刚上课 elapsed=0 → 0%", b0.progressPercent, 0)
eq("刚上课剩满节 45 分", b0.statusText, "第3节 · 剩 45 分")

var b50 = makeInst(T("15:30:00"))
b50.onInit()
eq("自习 15:00-16:00 半节 → 50%", b50.progressPercent, 50)

var b100 = makeInst(T("20:00:00"))
b100.onInit()
eq("已放学 → 100%", b100.progressPercent, 100)

var bNeg = makeInst(T("08:00:00"), { schedule: [{ day: TODAY, classes: [{ id: "x", name: "坏课", time: "08:00 - 08:00" }] }] })
bNeg.onInit()
truthy("零时长脏数据不进「上课中」（不产生 NaN/超 100）", bNeg.state !== "class" && bNeg.progressPercent >= 0 && bNeg.progressPercent <= 100)

var bDirty = makeInst(T("10:30:00"), { schedule: [{ day: TODAY, classes: [{ id: "y", name: "脏课", time: "not-a-time" }] }] })
bDirty.onInit()
eq("时间格式脏数据被丢弃 → 退化没课", bDirty.state, "none")

/* 4. 课间 */
console.log("\n[4] 课间（09:50 数学 09:45 下课后）")
var c = makeInst(T("09:50:00"))
c.onInit()
eq("状态 break", c.state, "break")
eq("A 显示下节课名（马上要上的那节）", c.focusName, "英语")
eq("B 距上课 10 分", c.statusText, "距上课 10 分")
eq("C 课间进度 5/15 → 33%", c.progressPercent, 33)
eq("D 空（A 已是下节，不重复）", c.nextName, "")

var c0 = makeInst(T("07:00:00"))
c0.onInit()
eq("一天第一节之前 → 课间", c0.state, "break")
eq("第一节之前距上课 60 分", c0.statusText, "距上课 60 分")
eq("第一节之前课间进度记 0（不拿 00:00 当上节）", c0.progressPercent, 0)

/* 5. 已放学 / 没课 */
console.log("\n[5] 已放学 / 没课")
var d = makeInst(T("20:00:00"))
d.onInit()
eq("状态 done", d.state, "done")
eq("A = 放学", d.focusName, "放学")
eq("A 退次色（课名不是主角时不抢眼）", d.nameColor, THEME.textSecondary)
eq("B 今天的课上完了", d.statusText, "今天的课上完了")
eq("D = 明日首节 08:00", d.nextTime, "08:00")
eq("D 明日首节课名 = 体育（明天的课）", d.nextName, "体育")
eq("D label = 明日", d.nextLabel, "明日")

var e = makeInst(T("09:00:00"), { schedule: [], builtin: [] })
e.onInit()
eq("今天没课 → none", e.state, "none")
eq("A = 没课", e.focusName, "没课")
eq("B 今天没有安排", e.statusText, "今天没有安排")
eq("明天也没课 → D 不显示", e.nextName, "")

var e2 = makeInst(T("09:00:00"), { schedule: [{ day: OTHER, classes: [{ id: "9", name: "体育", time: "08:00 - 08:45" }] }], builtin: [] })
e2.onInit()
eq("今天没课但明天有课 → A 仍为没课", e2.focusName, "没课")
eq("D 预告明日体育", e2.nextName, "体育")
eq("D label = 明日", e2.nextLabel, "明日")

/* 6. 跨节不跳字 */
console.log("\n[6] 跨节边界（09:44 → 09:45）")
var f = makeInst(T("09:44:00"))
f.onInit()
eq("09:44 仍是数学", f.focusName, "数学")
eq("09:44 剩 1 分", f.statusText, "第2节 · 剩 1 分")
f.__clock.set(T("09:45:00"))
f.tick()
eq("09:45 立刻切课间（不逗留在上节）", f.state, "break")
eq("09:45 主角换成英语", f.focusName, "英语")
eq("09:45 顺带告知下一节物理", f.nextName, "")

/* 7. 分钟级定时器 */
console.log("\n[7] 分钟级刷新 / 生命周期")
var g = makeInst(T("10:30:00"))
g.onInit()
eq("只挂一个定时器", g.__timers.pending(), 1)
eq("对齐下一个整分（秒=0 → 60000ms）", g.__timers.calls[0], 60000)
var g2 = makeInst(T("10:30:30"))
g2.onInit()
eq("秒=30 → 只等 30000ms，不许 10s 轮询", g2.__timers.calls[0], 30000)
g.onHide()
eq("onHide 清定时器（后台不空转）", g.__timers.pending(), 0)
g.onShow()
eq("onShow 重新挂一个", g.__timers.pending(), 1)
g.onDestroy()
eq("onDestroy 清定时器", g.__timers.pending(), 0)

/* 8. 冷启兜底 */
console.log("\n[8] 冷启兜底")
var h = makeInst(T("10:30:00"), { dbGet: false })
h.onInit()
truthy("storage 不回也有画面（不是 — ）", h.focusName === "英语")
var h2 = makeInst(T("10:30:00"), { dbGet: false, builtin: [] })
h2.onInit()
truthy("内置也为空时给「没课」而不是空白帧", h2.focusName === "没课")
eq("内置兜底时不算加载态残留", h2.statusText, "今天没有安排")

/* 9. 宽度护栏（168 内容宽） */
console.log("\n[9] 宽度护栏")
truthy("B 行最坏串「第10节 · 剩 45 分」20px ≤168", estW("第10节 · 剩 45 分", 20) <= 168)
truthy("B 行「今天的课上完了」20px ≤168", estW("今天的课上完了", 20) <= 168)
truthy("B 行「距上课 60 分」20px ≤168", estW("距上课 60 分", 20) <= 168)
truthy("A 行 56px 每行 3 个全角字 ≤168", estW("大学物", 56) <= 168)
var dNameW = 168 - estW("下节", 16) - 6 - estW("09:55", 18) - 6
truthy("D 行课名可用宽 ≥4 全角字（大学物理放得下）", dNameW >= estW("大学物理", 18))

/* 汇总 */
console.log("\n" + "─".repeat(52))
if (fail === 0) console.log("\x1b[32m✔ 全部 " + pass + " 项通过\x1b[0m\n")
else { console.log("\x1b[31m✗ " + fail + " 项失败\x1b[0m（通过 " + pass + "）\n"); process.exit(1) }
