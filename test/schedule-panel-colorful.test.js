/**
 * 多彩课表（schedule-panel-colorful）单元测试 —— node test/schedule-panel-colorful.test.js
 *
 * 同 test/schedule-panel-subject-color.test.js 手法：抽出 .ux 的 <script> 求值 + 注入桩。
 *
 * 钉死的命门（对应开工清单第⑤栏 P0/P1/P2 + 七条纪律）：
 *   1) 结构：A 星期条 7 格（当前日高亮）/ B 固定 3 列 × 5 行网格（格 52×64，不滚动）/ 合计并入页头；
 *   2) 禁区：无 @swipe 手势、无 <scroll>、无 setInterval、无 transform、无 @keyframes、页根不挂 onclick；
 *   3) 几何：7×5 满格全部落在 192×490 内、互不重叠（列 3×52+2×6=168、总高 5×64=320）；
 *   4) 切天改箭头：prevDay/nextDay 只改 dayCursor，边界 0..6 不越界，**不依赖手势**；
 *   5) 配色走共享固定表 subject-color.js：跨天同色、未匹配回退灰（禁止按插入顺序取色）；
 *   6) 当前时段 2px 主色框：仅一格命中，课间无命中；
 *   7) 分钟级刷新：唯一整分对齐 setTimeout，onHide/onDestroy 双清，onShow 不叠加；
 *   8) 冷启兜底：storage 不回也要首帧出画。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "schedule-panel-colorful", "schedule-panel-colorful.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""

/* ── 桩 ─────────────────────────────────────────────── */

function makeClock(ms) {
  var c = { ms: ms }
  function FakeDate(v) { this._d = new Date(v === undefined ? c.ms : v) }
  ;["getHours", "getMinutes", "getSeconds", "getMilliseconds", "getDate", "getMonth", "getDay"].forEach(function(k) {
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
function T(hhmmss, day) { return new Date("2026-10-" + (day || 20) + "T" + hhmmss + "+08:00").getTime() }
var DOW = new Date(T("08:00:00")).getDay()
var TODAY = DAY_NAMES[DOW]
var OTHER = DAY_NAMES[(DOW + 1) % 7]

var THEME = {
  bg: "#1a1a2e", card: "#16213e", border: "#0f3460", accent: "#7ec8e3",
  text: "#ffffff", textSecondary: "#888899", textMuted: "#555566"
}

// 15 节满格（3 列 × 5 行）+ 16 节溢出用
var NAMES = ["数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理",
             "政治", "体育", "音乐", "美术", "信息", "通用", "哲学"]
var SLOTS = []
;(function() {
  var startH = 8
  for (var i = 0; i < NAMES.length; i++) {
    var h = startH + Math.floor(i / 2)
    var m = (i % 2 === 0) ? 0 : 50
    var eh = (m === 0) ? h : h + 1
    var em = (m === 0) ? 45 : 35
    function p(n) { return (n < 10 ? "0" : "") + n }
    SLOTS.push(p(h) + ":" + p(m) + " - " + p(eh) + ":" + p(em))
  }
})()

function build(day, count) {
  var cls = []
  for (var i = 0; i < count; i++) {
    cls.push({ id: "c" + i, name: NAMES[i], time: SLOTS[i] })
  }
  return [{ day: day, classes: cls }]
}

var FIX15 = build(TODAY, 15)
var FIX16 = build(TODAY, 16)
var FIX1 = build(TODAY, 1)
var FIX0 = build(TODAY, 0)
// 共享固定表：直接用真模块（避免测试再抄一份 → 又漂移）
var realSubjectColor = require("../src/data/subject-color.js")

function makeInst(atMs, opts) {
  opts = opts || {}
  var m = SRC.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("找不到 <script> 块")
  var code = m[1].replace(/^\s*import[^\n]*$/gm, "").replace(/export\s+default/, "module.exports =")
  var timers = makeTimers(), clock = makeClock(atMs), mod = {}

  var fakeDb = {
    init: function(cb) { if (opts.dbInit !== false) cb() },
    getAllCourses: function(cb) { if (opts.dbGet !== false) cb(opts.schedule === undefined ? FIX15 : opts.schedule) }
  }
  var fakeStore = { getTheme: function(cb) { cb(THEME, "blue") } }
  var fakeUtils = { exitApp: function() { return true } }
  var fakeBuiltin = { schedule: opts.builtin === undefined ? FIX15 : opts.builtin }

  function fakeRequire(p) {
    if (/database\.js$/.test(p)) return fakeDb
    if (/store\.js$/.test(p)) return fakeStore
    if (/utils\.js$/.test(p)) return fakeUtils
    if (/subject-color\.js$/.test(p)) return realSubjectColor
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
  return inst
}

// 字宽估算护栏（全角 1.0em / 半角 0.55em / 空格 0.3em，按实拍校准）——防再把副标题撑爆
function estW(text, px) {
  var w = 0
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i)
    w += (/[\u4e00-\u9fa5\u3000\uff00-\uffef]/.test(ch)) ? px : (/\s/.test(ch) ? px * 0.3 : px * 0.55)
  }
  return Math.round(w * 10) / 10
}

function flat(inst) {
  var out = []
  ;(inst.gridCells || []).forEach(function(r) { r.forEach(function(c) { if (c) out.push(c) }) })
  return out
}

console.log("\n\x1b[1m多彩课表栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构 / 禁区 */
console.log("\n[1] 结构 / 禁区")
truthy("模板含 A 星期条 .week-strip", /class="week-strip"/.test(TPL))
truthy("模板含 B 网格 .grid + .grid-row", /class="grid"/.test(TPL) && /class="grid-row"/.test(TPL))
truthy("模板含切天箭头 .arrow-btn", /class="arrow-btn"/.test(TPL))
truthy("**箭头在星期条内**（放页头会把 header-center 挤到 ~60px，标题折行+副标题被裁——实拍踩过）",
  /week-strip[\s\S]*?arrow-btn[\s\S]*?week-cell[\s\S]*?arrow-btn/.test(TPL))
var arrowW = Number((/\.arrow-btn \{[^}]*width:\s*(\d+)px/.exec(STYLE) || [])[1])
eq("箭头 20×20（7×16+2×20=152 ≤168，再大挤爆星期条）", arrowW, 20)
truthy("星期条 + 箭头总宽 ≤ 内容宽 168", arrowW * 2 + 7 * 16 <= 168, (arrowW * 2 + 7 * 16) + "px")
truthy("无独立 grid-note 行（C 区按开工卡「不设」，B 已顶到 476）", !/grid-note/.test(SRC))
truthy("**无 @swipe 指令**（P1：touch 是老坑，drag 会被判点击 → 跳页；注释里出现字样不算）", !/@swipe\s*=/.test(TPL))
truthy("**无 <scroll>**", !/<scroll/.test(TPL))
truthy("**无 setInterval**（只许整分 setTimeout）", !/setInterval/.test(SRC))
truthy("**无 transform**（带字 transform 必白屏）", !/transform/.test(STYLE))
truthy("**无 @keyframes**", !/@keyframes/.test(STYLE))
truthy("页根节点不挂 onclick（防 drag 被当点击）", /<div class="page" style="background-color: \{\{ theme\.bg \}\}">/.test(TPL))

/* 2. 网格几何（开工卡 §6 验收 1） */
console.log("\n[2] 网格几何：7×5 满格全落 192×490 且不重叠")
var a = makeInst(T("08:00:00"), { schedule: FIX15 })
a.onInit()
eq("网格 5 行", a.gridCells.length, 5)
eq("每行 3 列", a.gridCells.filter(function(r) { return r.length === 3 }).length, 5)
eq("15 节满格 → 15 个非空格", flat(a).length, 15)
var cellW = Number((/\.grid-cell \{[^}]*width:\s*(\d+)px/.exec(STYLE) || [])[1])
var cellH = Number((/\.grid-cell \{[^}]*height:\s*(\d+)px/.exec(STYLE) || [])[1])
eq("格宽 52（3×52+2×6=168 = 内容宽）", cellW, 52)
eq("格高 56（5×56=280）", cellH, 56)
truthy("列总宽不超内容宽 168", cellW * 3 + 2 * 6 <= 168)
// 总高预算必须把页头(44+120+8)和星期条(28)算进去：只查 5×64=320 ≤ 490 会假绿（终点其实 520）
var HEAD = 44 + 120 + 8, STRIP = 28
truthy("页头+星期条+网格 ≤ 490", HEAD + STRIP + cellH * 5 <= 490,
  HEAD + STRIP + cellH * 5 + "px")
truthy("课名 lines:2 + ellipsis（超长省略不炸格）", /\.cell-name \{[\s\S]*?lines:\s*2[\s\S]*?ellipsis/.test(STYLE))
truthy("格子 border-box（52 含 2px 高亮框，不会把行挤宽）", /box-sizing:\s*border-box/.test(STYLE))

/* 3. 溢出计数 */
console.log("\n[3] 16 节溢出：只显示 15 格，其余计数")
var b = makeInst(T("08:00:00"), { schedule: FIX16 })
b.onInit()
eq("16 节仍只 15 格", flat(b).length, 15)
eq("todayCount 记真实节数", b.todayCount, 16)
eq("totalCount 记真实节数", b.totalCount, 16)
// 溢出口径走页头副标题 countLabel（原 grid-note 行实测溢出画布：网格到 476，+24 必爆 490）
eq("16 节副标题说清「前15/共16节」", b.dayLabel, "前15/共16节")
eq("15 节副标题正常（今天 · 15 节）", a.dayLabel, "今天 · 15 节")
truthy("副标题最坏串估算 ≤120 不裁（实拍：150px 会被切掉「节」）", estW(a.dayLabel, 15) <= 120, estW(a.dayLabel, 15) + "px")
truthy("副标题 15px + lines:1（单行不折）", /\.header-day \{[\s\S]*?font-size:\s*15px[\s\S]*?lines:\s*1/.test(STYLE))

/* 4. 切天：箭头而非手势 */
console.log("\n[4] 切天：箭头、边界不越界、星期标签按当天推导")
var c = makeInst(T("08:00:00"), { schedule: FIX15 })
c.onInit()
eq("初始 dayCursor = 今天（按 getDay 推导）", c.dayCursor, DOW)
eq("星期条第 0 格是「日」", c.weekCells[0].label, "日")
eq("星期条 7 格", c.weekCells.length, 7)
eq("当前日高亮唯一", c.weekCells.filter(function(w) { return w.current }).length, 1)
var before = c.dayCursor
c.prevDay()
eq("prevDay 减一天", c.dayCursor, Math.max(0, before - 1))
c.nextDay()
eq("nextDay 加一天", c.dayCursor, Math.min(6, before))
for (var i = 0; i < 10; i++) c.nextDay()
eq("nextDay 到 6 不再越界", c.dayCursor, 6)
for (var j = 0; j < 10; j++) c.prevDay()
eq("prevDay 到 0 不再越界", c.dayCursor, 0)
eq("切到周日仍渲染 7 格", c.weekCells.length, 7)
var d0 = makeInst(T("08:00:00"), { schedule: FIX15 })
d0.onInit(); d0.dayCursor = 0; d0.render()
eq("切到周日 → 第 0 格高亮", d0.weekCells[0].current, true)
eq("切到周日 → 其余不高亮", d0.weekCells.filter(function(w) { return w.current }).length, 1)

/* 5. 配色：共享固定表 */
console.log("\n[5] 配色：固定表跨天稳定 / 未匹配回退灰")
var e1 = makeInst(T("08:00:00"), { schedule: FIX1 })
e1.onInit()
eq("数学 = 固定表里的 #3498db", flat(e1)[0].color, realSubjectColor.getSubjectColor("数学"))
eq("固定表数学色即 #3498db", realSubjectColor.getSubjectColor("数学"), "#3498db")
eq("未匹配科目回退灰（不是按插入顺序取色）", realSubjectColor.getSubjectColor("哲学"), "#7f8c8d")
eq("空名回退灰", realSubjectColor.getSubjectColor(""), "#7f8c8d")
eq("子串命中（体育课 → 体育）", realSubjectColor.getSubjectColor("体育课"), realSubjectColor.getSubjectColor("体育"))
// 跨天稳定：同一科在「明天」也必须有同一个色。页面只看 dayCursor=今天，故把时钟拨到明天再验
var e2 = makeInst(T("08:00:00", 21), { schedule: build(OTHER, 1) })
e2.onInit()
eq("时钟拨到明天 → 默认看那天", e2.dayCursor, (DOW + 1) % 7)
eq("同科换一天仍同色（跨天稳定）", flat(e2)[0].color, flat(e1)[0].color)
var e3 = makeInst(T("08:00:00"), { schedule: FIX15 })
e3.onInit()
eq("15 节满格每格都有色（无 undefined）", flat(e3).every(function(x) { return /^#|^rgb/.test(x.color || "") }), true)

/* 6. 当前时段高亮（P2） */
console.log("\n[6] 当前时段：只有一格 2px 主色框")
var f1 = makeInst(T("08:20:00"), { schedule: FIX15 })
f1.onInit()
eq("08:20 在第 1 节内 → 恰一格命中", flat(f1).filter(function(x) { return x.now }).length, 1)
eq("命中格是数学", flat(f1).filter(function(x) { return x.now })[0].name, "数学")
// 注：本 fixture 的 SLOTS 从 08:00 连续排到 15:45 无空隙，故边界取「早于第一节课」
var f2 = makeInst(T("07:00:00"), { schedule: FIX15 })
f2.onInit()
eq("早于第一节课无命中", flat(f2).filter(function(x) { return x.now }).length, 0)
var f3 = makeInst(T("22:00:00"), { schedule: FIX15 })
f3.onInit()
eq("放学后无命中", flat(f3).filter(function(x) { return x.now }).length, 0)
truthy("高亮用 border 2px 主色（不是 transform）", /\.grid-cell\.is-now \{[^}]*border-width:\s*2px/.test(STYLE))

/* 7. 分钟级刷新 */
console.log("\n[7] 分钟级刷新：唯一整分对齐 setTimeout + 双清")
var g = makeInst(T("08:20:00"), { schedule: FIX15 })
g.onInit()
eq("onInit 只挂 1 个定时器", g.__timers.calls.length, 1)
truthy("对齐整分（0 < ms ≤ 60000）", g.__timers.calls[0] > 0 && g.__timers.calls[0] <= 60000, "实际 " + g.__timers.calls[0])
g.onShow()
eq("onShow 不叠加（pending 仍 1）", g.__timers.pending(), 1)
g.__timers.flush(1)
eq("到点后自动续排（仍 1 个）", g.__timers.pending(), 1)
g.onHide()
eq("onHide 清定时器", g.__timers.pending(), 0)
g.onShow()
g.onDestroy()
eq("onDestroy 清定时器", g.__timers.pending(), 0)

/* 8. 冷启兜底 */
console.log("\n[8] 冷启兜底：storage 不回也首帧出画")
var h = makeInst(T("08:20:00"), { schedule: FIX15, dbGet: false })
h.onInit()
eq("db 不回调也有课程", h.hasCourses, true)
eq("首帧即渲染网格", flat(h).length, 15)
var h2 = makeInst(T("08:20:00"), { schedule: FIX0, builtin: FIX0, dbGet: false })
h2.onInit()
eq("空数据走空态", h2.hasCourses, false)
eq("空态文案按当天推导", /暂无课程/.test(h2.emptyHint), true)

/* 9. 首帧与异步一致性 */
console.log("\n[9] 异步 storage 覆盖后重算")
var i1 = makeInst(T("08:20:00"), { schedule: FIX16, builtin: FIX1, dbGet: false })
i1.onInit()
eq("storage 不回时首帧用内置课表", i1.todayCount, 1)
var i2 = makeInst(T("08:20:00"), { schedule: FIX16, builtin: FIX1 })
i2.onInit()
eq("storage 回来后覆盖为真实数据", i2.todayCount, 16)

console.log("\n\x1b[1m结果: " + pass + " 通过 / " + fail + " 失败\x1b[0m")
process.exit(fail === 0 ? 0 : 1)
