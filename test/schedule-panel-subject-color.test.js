/**
 * 科目色卡（schedule-panel-subject-color）单元测试 —— node test/schedule-panel-subject-color.test.js
 *
 * 同 test/schedule-panel-simple.test.js 手法：抽出 .ux 的 <script> 求值 + 注入桩。
 *
 * 钉死的命门：
 *   1) 结构：A 当前科目（40px 课名 + 12×44 色块）/ B 网格 2×3（格 80×72，行宽 168 space-between）/ C 图例 16px；
 *      无 <scroll>、无 setInterval、无 @keyframes；
 *   2) 配色表：子串匹配（体育课→体育）、跨天同色、未匹配回退灰、空名回退灰；
 *   3) A 区四态：上课中（课名 + nowActive）/ 课间（后面还有课）/ 已下课（今天上完）/ 没课（今天无安排）；
 *   4) B 区：按当天首次出现去重，最多 6 格 = 3×2；1 科 / 6 科 / 8 科三态；
 *   5) 分钟级刷新：唯一整分对齐 setTimeout，onHide/onDestroy 双清，onShow 不叠加；
 *   6) 冷启兜底：storage 不回也要首帧出画。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "schedule-panel-subject-color", "schedule-panel-subject-color.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""
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
function T(hhmmss, day) { return new Date("2026-10-" + (day || 20) + "T" + hhmmss + "+08:00").getTime() }
var DOW = new Date(T("08:00:00")).getDay()
var TODAY = DAY_NAMES[DOW]
var OTHER = DAY_NAMES[(DOW + 1) % 7]

var THEME = {
  bg: "#1a1a2e", card: "#16213e", border: "#0f3460", accent: "#7ec8e3",
  text: "#ffffff", textSecondary: "#888899", textMuted: "#555566"
}
var GREY = "#7f8c8d"

// 8 个不同科目（覆盖「超 6 格」）
var NAMES8 = ["数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理"]
var SLOTS8 = ["08:00 - 08:45", "09:00 - 09:45", "10:00 - 10:45", "11:00 - 11:45",
              "13:00 - 13:45", "14:00 - 14:45", "15:00 - 15:45", "16:00 - 16:45"]

function build(day, names) {
  var cls = []
  for (var i = 0; i < names.length; i++) {
    cls.push({ id: "c" + i, name: names[i], time: SLOTS8[i] })
  }
  return [{ day: day, classes: cls }]
}

var FIX8 = build(TODAY, NAMES8)
var FIX6 = build(TODAY, NAMES8.slice(0, 6))
var FIX1 = build(TODAY, ["数学"])

function makeInst(atMs, opts) {
  opts = opts || {}
  var m = SRC.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("找不到 <script> 块")
  var code = m[1].replace(/^\s*import[^\n]*$/gm, "").replace(/export\s+default/, "module.exports =")
  var timers = makeTimers(), clock = makeClock(atMs), mod = {}

  var fakeDb = {
    init: function(cb) { if (opts.dbInit !== false) cb() },
    getAllCourses: function(cb) { if (opts.dbGet !== false) cb(opts.schedule === undefined ? FIX8 : opts.schedule) }
  }
  var fakeStore = { getTheme: function(cb) { cb(THEME, "blue") } }
  var fakeUtils = { exitApp: function() { return true } }
  var fakeBuiltin = { schedule: opts.builtin === undefined ? FIX8 : opts.builtin }

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
  return inst
}

function flatCells(inst) {
  var out = []
  ;(inst.gridRows || []).forEach(function(r) { r.cells.forEach(function(c) { out.push(c) }) })
  return out
}

console.log("\n\x1b[1m科目色卡栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构 / 禁区 */
console.log("\n[1] 结构 / 禁区")
truthy("模板含 A 当前科目色块 .now-stripe", /class="now-stripe"/.test(TPL))
truthy("模板含 A 课名 .now-name", /class="now-name"/.test(TPL))
truthy("模板含 B 网格 for=gridRows", /for="\{\{ gridRows \}\}"/.test(TPL))
truthy("模板含 B 格子内层 for=$item.cells", /for="\{\{ \$item\.cells \}\}"/.test(TPL))
truthy("模板含 C 图例 .legend", /class="legend"/.test(TPL))
truthy("A→B→C 顺序正确",
  TPL.indexOf("now-row") < TPL.indexOf("gridRows") && TPL.indexOf("gridRows") < TPL.indexOf("legend"))
truthy("无 <scroll>（固定网格，不滚动）", !/<scroll/.test(TPL))
truthy("全页无 setInterval（分钟级）", !/setInterval/.test(CODE))
truthy("无 @keyframes", !/@keyframes/.test(STYLE))
truthy("style 无数据绑定 {{ }}", !/\{\{[^}]*\}\}/.test(STYLE))
eq("A 课名兜底字号 44（四档最大）", (/\.now-name \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "44")
eq("A 色条宽 10（从 12 收回 2px 给课名）", (/\.now-stripe \{[\s\S]*?width: (\d+)px/.exec(STYLE) || [])[1], "10")
eq("A 色条高 40", (/\.now-stripe \{[\s\S]*?height: (\d+)px/.exec(STYLE) || [])[1], "40")
eq("B 格宽 80（2×80+8 间距=168）", (/\.cell \{[\s\S]*?width: (\d+)px/.exec(STYLE) || [])[1], "80")
eq("B 格高 72", (/\.cell \{[\s\S]*?height: (\d+)px/.exec(STYLE) || [])[1], "72")
eq("B 行宽 168", (/\.grid-row \{[\s\S]*?width: (\d+)px/.exec(STYLE) || [])[1], "168")
truthy("B 行两端对齐（撑出 8px 列间距）", /\.grid-row \{[\s\S]*?justify-content:\s*space-between/.test(STYLE))
eq("B 课名 24px（18px 在 12~23 禁区）", (/\.cell-name \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "24")
eq("C 图例 24px（16px 在 12~23 禁区）", (/\.legend \{[\s\S]*?font-size: (\d+)px/.exec(STYLE) || [])[1], "24")
truthy("A 课名单行（不折行把 B 区顶下去）", /\.now-name \{[\s\S]*?lines:\s*1/.test(STYLE))
truthy("B 课名允许折 2 行（3 字科目不丢字）", /\.cell-name \{[\s\S]*?lines:\s*2/.test(STYLE))
truthy("全页无 text-overflow（红线 8 禁省略号）", !/text-overflow/.test(STYLE))

/* 2. 固定配色表 */
console.log("\n[2] 固定配色表（子串匹配 / 跨天同色 / 灰兜底）")
var a = makeInst(T("08:30:00"))
a.onInit()
eq("数学 → #3498db", flatCells(a)[0].color, "#3498db")
// 跨天稳定：同一科在「明天」也必须有同一个色。页面只看今天，故把时钟拨到明天再验
var crossFix = build(TODAY, ["数学"]).concat(build(OTHER, ["数学"]))
var a2 = makeInst(T("08:30:00", 21), { schedule: crossFix, builtin: crossFix })
a2.onInit()
eq("时钟拨到明天 → 当前科目仍是数学", a2.nowName, "数学")
eq("同一科换一天仍同色（跨天稳定）", a2.nowColor, "#3498db")

var b = makeInst(T("08:30:00"), { schedule: build(TODAY, ["体育课", "自习", ""]) })
b.onInit()
var bc = flatCells(b)
eq("子串匹配：体育课 → 体育色", bc[0].color, "#8bc34a")
eq("未匹配科目回退灰", bc[1].color, GREY)
eq("空科目名回退灰（不出现空块）", bc[2].color, GREY)

var b2 = makeInst(T("08:30:00"), { schedule: build(TODAY, ["信息技术"]) })
b2.onInit()
eq("信息技术 → #2980b9", flatCells(b2)[0].color, "#2980b9")

/* 3. A 当前科目三态 */
console.log("\n[3] A 当前科目（上课中 / 课间 / 没课）")
var c = makeInst(T("10:30:00"))
c.onInit()
eq("10:30 当前科目=英语", c.nowName, "英语")
eq("当前科目标记 nowActive", c.nowActive, true)
eq("当前科目色块取科目色", c.nowColor, "#e67e22")

var d = makeInst(T("12:00:00"))
d.onInit()
eq("12:00 课间（11:45–13:00 空档）", d.nowName, "课间")
eq("课间不算当前科目", d.nowActive, false)
eq("课间色块回退灰", d.nowColor, GREY)

var dn = makeInst(T("20:00:00"))
dn.onInit()
eq("20:00 全天课上完 → 已下课（不是「课间」）", dn.nowName, "已下课")
eq("已下课不算当前科目", dn.nowActive, false)
eq("已下课不影响色卡网格", flatCells(dn).length, 6)

var e = makeInst(T("09:00:00"), { schedule: [{ day: OTHER, classes: [{ id: "x", name: "体育", time: "08:00 - 08:45" }] }] })
e.onInit()
eq("今天没课 → 没课", e.nowName, "没课")
eq("没课不算当前科目", e.nowActive, false)

/* 4. B 网格三态 */
console.log("\n[4] B 网格（1 科 / 6 科 / 8 科超格 / 去重）")
eq("8 科 → 3 行", a.gridRows.length, 3)
eq("8 科 → 只渲染 6 格", flatCells(a).length, 6)
eq("网格每行最多 2 格", a.gridRows[0].cells.length, 2)
eq("8 科图例：总数 + 只列 6，不用点号", a.legendText, "8 科 只列 6")
eq("首格为当天第一科（数学）", flatCells(a)[0].name, "数学")

var f6 = makeInst(T("08:30:00"), { schedule: FIX6 })
f6.onInit()
eq("6 科 → 3 行", f6.gridRows.length, 3)
eq("6 科 → 6 格（正好填满 2×3）", flatCells(f6).length, 6)
eq("6 科图例", f6.legendText, "今天 6 科")

var f1 = makeInst(T("08:30:00"), { schedule: FIX1 })
f1.onInit()
eq("1 科 → 1 行", f1.gridRows.length, 1)
eq("1 科 → 1 格", flatCells(f1).length, 1)
eq("1 科图例", f1.legendText, "今天 1 科")

var f0 = makeInst(T("09:00:00"), { schedule: [] })
f0.onInit()
eq("0 科 → 无格", f0.gridRows.length, 0)
eq("0 科图例 = 今天没课（不报 0 科）", f0.legendText, "今天没课")

// 同名同科两节 → 只占 1 格
var dup = makeInst(T("08:30:00"), { schedule: build(TODAY, ["数学", "数学", "语文"]) })
dup.onInit()
eq("同科去重：数学×2 + 语文 → 2 格", flatCells(dup).length, 2)
eq("去重后图例只算 2 科", dup.legendText, "今天 2 科")

/* 5. 分钟级刷新 */
console.log("\n[5] 分钟级刷新")
var g = makeInst(T("08:30:00"))
g.onInit()
eq("onInit 后只挂 1 个定时器", g.__timers.pending(), 1)
eq("整分对齐（08:30:00 → 60000ms）", g.__timers.calls[0], 60000)
var g2 = makeInst(T("08:30:20"))
g2.onInit()
eq("08:30:20 → 40000ms", g2.__timers.calls[0], 40000)
g2.__timers.flush(3)
eq("连跑 3 次仍只 1 个（不叠加）", g2.__timers.pending(), 1)
g2.onHide()
eq("onHide 清定时器", g2.__timers.pending(), 0)
var g3 = makeInst(T("08:30:00"))
g3.onInit()
g3.onShow()
eq("onShow 重算后仍只 1 个", g3.__timers.pending(), 1)
g3.onDestroy()
eq("onDestroy 清定时器", g3.__timers.pending(), 0)

/* 6. 冷启兜底 */
console.log("\n[6] 冷启兜底（storage 不回也要出画）")
var h = makeInst(T("10:30:00"), { dbInit: false })
h.onInit()
eq("storage 不回调也不是「加载中」", h.isLoading, false)
eq("首帧用内置课表算出当前科目", h.nowName, "英语")
eq("首帧就挂好分钟级定时器", h.__timers.pending(), 1)

var i = makeInst(T("10:30:00"), { dbGet: false, builtin: [] })
i.onInit()
eq("内置课表也空时退化为没课而非卡住", i.nowName, "没课")

/* 7. ev-six 硬指标 */
console.log("\n[7] ev-six 硬指标（字号四档 / 禁字符 / display 绑定 / 高度预算）")
var sizes = (STYLE.match(/font-size:\s*(\d+)px/g) || []).map(function(v) { return parseInt(v.replace(/\D/g, ""), 10) })
var TIERS = { 44: 1, 28: 1, 24: 1 }
truthy("font-size 只出现三档 44/28/24（实见 " + sizes.join(",") + "）", sizes.every(function(v) { return TIERS[v] }))
truthy("无 12~23px 字号", sizes.every(function(v) { return v < 12 || v > 23 }))
truthy("模板与脚本均无点号分隔符（红线 4）", !/·/.test(TPL) && !/·/.test(CODE))
truthy("模板无 if= 条件渲染（事故案例 11）", !/\bif=/.test(TPL))
truthy("返回键改 display 绑定", /display: \{\{ isRoot \? 'none' : 'flex' \}\}/.test(TPL))
truthy("占位块也用同一 display 绑定", (TPL.match(/display: \{\{ isRoot \? 'none' : 'flex' \}\}/g) || []).length === 2)
truthy("A 课名字号走 inline 绑定（不在样式里写死视觉结果）", /font-size: \{\{ nowFont \}\}px/.test(TPL))

var padDecl = (/\.page \{[\s\S]*?padding: ([^;]+);/.exec(STYLE) || [])[1] || ""
var pv = padDecl.split(/\s+/).map(function(x) { return parseInt(x, 10) })
eq("页面左右 padding 均为 12", [pv[1], pv[3]].join(","), "12,12")

// 字宽口径：全角 1.33em（手册 §4.0 实测）、半角 0.5em、空格 0.3em
function estW(str, fs) {
  var w = 0
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i)
    w += (c === 32) ? 0.3 * fs : (c > 127 ? 1.33 * fs : 0.5 * fs)
  }
  return w
}
// A 区可用宽 = 168 − 色条 10 − 间距 8
truthy("A 区 2 字 @44 = " + Math.round(estW("语文", 44)) + " ≤150", estW("语文", 44) <= 150)
truthy("A 区 3 字 @44 = " + Math.round(estW("自习课", 44)) + " >150 → 必须降档到 28", estW("自习课", 44) > 150)
truthy("A 区 4 字 @28 = " + Math.round(estW("信息技术", 28)) + " ≤150", estW("信息技术", 28) <= 150)
// B 区格内可用宽 = 80 − 4×2
truthy("格子 2 字 @24 = " + Math.round(estW("语文", 24)) + " ≤72", estW("语文", 24) <= 72)
truthy("格子 3 字 @24 会超 72 → 靠 lines:2 折行兜底", estW("自习课", 24) > 72)
// C 图例最坏串
truthy("图例「今天 10 科」24px = " + Math.round(estW("今天 10 科", 24)) + " ≤168", estW("今天 10 科", 24) <= 168)
truthy("图例「12 科 只列 6」24px = " + Math.round(estW("12 科 只列 6", 24)) + " ≤168", estW("12 科 只列 6", 24) <= 168)

function cssNum(sel, prop) {
  var re = new RegExp("\\." + sel + " \\{[\\s\\S]*?" + prop + ": (\\d+)px")
  var m = re.exec(STYLE)
  return m ? parseInt(m[1], 10) : NaN
}
var stack = pv[0] + cssNum("back-header", "height")
  + cssNum("now-row", "margin-top") + cssNum("now-row", "height")
  + cssNum("grid", "margin-top") + 3 * cssNum("grid-row", "height") + 2 * cssNum("grid-row", "margin-bottom")
  + cssNum("legend", "margin-top") + cssNum("legend", "line-height")
truthy("最坏栈高 " + stack + "px ≤440（3 行满格仍不进胶囊圆弧）", stack <= 440)

// 动态字号：2 字用 44、3 字以上用 28
var twoChar = makeInst(T("08:30:00"), { schedule: build(TODAY, ["数学", "语文"]) })
twoChar.onInit()
eq("2 字课名 → 44px", twoChar.nowFont, 44)
var threeChar = makeInst(T("08:30:00"), { schedule: build(TODAY, ["自习课"]) })
threeChar.onInit()
eq("3 字课名 → 降档 28px", threeChar.nowFont, 28)
eq("自习课未进色表 → 灰兜底，不返回空", threeChar.nowColor, "#7f8c8d")

console.log("\n" + (fail === 0
  ? "\x1b[32m✔ 全部 " + pass + " 项通过\x1b[0m"
  : "\x1b[31m✘ " + fail + " 项失败 / 共 " + (pass + fail) + " 项\x1b[0m") + "\n")
process.exit(fail === 0 ? 0 : 1)
