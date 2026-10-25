/**
 * 多彩课表（schedule-panel-colorful）单元测试 —— node test/schedule-panel-colorful.test.js
 *
 * 快应用无框架，逻辑在 .ux 的 <script> 里，Node 不能直接 require。
 * 这里抽出真实源码求值 + 注入桩（假时钟 / 假定时器 / 假屏参 / 假数据层），测的就是线上那份。
 *
 * 2026-10-25 ev-six 重排（evtask-D-evclass-sche-261025-v473pg）后重写：
 *   旧断言（7 格星期条 / 3 列 × 5 行 / 18px 字）已随设计作废，本文件按新设计立界。
 *
 * 钉死的命门：
 *   1) ev-six 硬指标：字号只准 44/28/30/24 四档、无 12~23px、无 `if=`、无 ellipsis、
 *      无 `· › → …`、左右 padding 12；
 *   2) 2 列 × 4 行彩色瓷砖：8 格上限、超出报「+N」、行内不留 null 占位；
 *   3) 课名两档 28/24 + 行高配对（28→34、24→28），3 字课名靠 lines:2 折行；
 *   4) 高度栈 44+36+8+44+8+4×68+3×6 = 430 ≤ 440（胶囊圆角 y>440 起右缘 x<180）；
 *   5) 首帧兜底：database.init 永不回调也要用内置课表出画（pit-20261025-24）；
 *   6) 屏宽适配：192 屏一个像素不动，336 屏按比例放大且字号仍在四档内；
 *   7) 分钟级刷新：唯一整分对齐 setTimeout，onHide/onDestroy 双清。
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
function le(n, v, lim) { if (typeof v === "number" && v <= lim) ok(n + "（" + v + " ≤ " + lim + "）"); else bad(n, "期望 ≤" + lim + "，实际 " + v) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""
// 注释里会提到禁用的 API / 分隔符，查禁区要剔掉注释只看真代码
var CODE = SRC.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

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

var THEME = {
  bg: "#1a1a2e", card: "#16213e", border: "#0f3460", accent: "#7ec8e3",
  text: "#ffffff", textSecondary: "#888899", textMuted: "#555566"
}

// 每节 45 分钟，从 08:00 起排；8 格够用，另备 12 节验溢出
var NAMES = ["数学", "语文", "计算机", "物理", "化学", "生物", "历史", "地理",
             "政治", "体育", "音乐", "美术"]
var SLOTS = []
;(function() {
  for (var i = 0; i < NAMES.length; i++) {
    var h = 8 + i
    function p(n) { return (n < 10 ? "0" : "") + n }
    SLOTS.push(p(h) + ":00 - " + p(h) + ":45")
  }
})()

function build(day, count) {
  var cls = []
  for (var i = 0; i < count; i++) {
    cls.push({ id: "c" + i, name: NAMES[i], time: SLOTS[i] })
  }
  return [{ day: day, classes: cls }]
}

var FIX8 = build(TODAY, 8)
var FIX12 = build(TODAY, 12)
var FIX2 = build(TODAY, 2)
var FIX0 = build(TODAY, 0)
// 共享固定表：直接用真模块（避免测试再抄一份 → 又漂移）
var realSubjectColor = require("../src/data/subject-color.js")

function makeInst(atMs, opts) {
  opts = opts || {}
  var m = SRC.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("找不到 <script> 块")
  var code = m[1].replace(/^\s*import[^\n]*$/gm, "").replace(/export\s+default/, "module.exports =")
  var timers = makeTimers(), clock = makeClock(atMs), mod = {}

  var dbCalls = { init: 0, getAll: 0 }
  var fakeDb = {
    init: function(cb) { dbCalls.init++; if (opts.dbInit !== false) cb() },
    getAllCourses: function(cb) { dbCalls.getAll++; if (opts.dbGet !== false) cb(opts.schedule === undefined ? FIX8 : opts.schedule) }
  }
  var fakeStore = { getTheme: function(cb) { if (opts.noTheme) return; cb(THEME, "blue") } }
  var fakeUtils = { exitApp: function() { return true } }
  var fakeBuiltin = { schedule: opts.builtin === undefined ? FIX8 : opts.builtin }
  var fakeFit = {
    BASE_W: 192, BASE_H: 490,
    scaleFor: function(w, h) { return { sw: w, sh: h, k: w / 192, kv: h / 490, wide: w >= 300, font: 1 } },
    px: function(n) { return Math.round(n) + "px" }
  }

  function fakeRequire(p) {
    if (/database\.js$/.test(p)) return fakeDb
    if (/store\.js$/.test(p)) return fakeStore
    if (/utils\.js$/.test(p)) return fakeUtils
    if (/subject-color\.js$/.test(p)) return realSubjectColor
    if (/schedule\.js$/.test(p)) return fakeBuiltin
    if (/screen-fit\.js$/.test(p)) return fakeFit
    if (/^@system\.storage$/.test(p)) return { set: function() {} }
    throw new Error("未预期的 require: " + p)
  }
  var device = {
    getInfo: function(o) {
      if (opts.noDevice) { if (o.fail) o.fail(); return }
      if (o.success) o.success({ screenWidth: opts.w || 192, screenHeight: opts.h || 490 })
    }
  }
  var router = { last: null, uri: null, back: function() { this.last = "back" }, push: function(o) { this.last = "push"; this.uri = o.uri } }

  var factory = new Function("router", "device", "module", "require", "setTimeout", "clearTimeout", "Date",
                            code + "\nreturn module.exports")
  var def = factory(router, device, mod, fakeRequire, timers.setTimeout, timers.clearTimeout, clock.Date)

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

// 字宽口径：全角 1.33em、空格 0.3em、半角按真机实测 0.63em（0.5 口径偏乐观，会漏判折行）
function estW(s, px) {
  s = s || ""
  var w = 0
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i)
    w += (c === 32) ? 0.3 : (c > 127 ? 1.33 : 0.63)
  }
  return Math.round(w * px * 10) / 10
}

function cssNum(sel, prop) {
  var re = new RegExp("\\." + sel + "\\s*\\{([^}]*)\\}")
  var m = re.exec(STYLE)
  if (!m) return 0
  var p = new RegExp("(?:^|;|\\s)" + prop + "\\s*:\\s*(-?\\d+)px")
  var mm = p.exec(m[1])
  return mm ? Number(mm[1]) : 0
}

console.log("\n\x1b[1m多彩课表栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构 / 禁区（ev-six 硬指标） */
console.log("\n[1] 结构 / 禁区")
truthy("模板含日切换行", /class="day-row"/.test(TPL))
eq("左右切天各一个 .nav-btn", (TPL.match(/class="nav-btn"/g) || []).length, 2)
truthy("模板含彩色瓷砖 .tile", /class="tile /.test(TPL))
truthy("模板含空态 .empty-hint", /class="empty-hint"/.test(TPL))
truthy("无 if= 条件属性（事故案例 11）", !/\sif="/.test(TPL))
// 返回键 + 占位 + 瓷砖区 + 空态 = 4 处
eq("display 绑定四处", (TPL.match(/display: \{\{/g) || []).length, 4)
truthy("无 text-overflow: ellipsis（红线 8）", !/text-overflow/.test(STYLE))
truthy("无中点分隔符 ·（红线 4）", CODE.indexOf("·") < 0)
truthy("无箭头字形 › →（改用图标，红线 4）", !/[›→]/.test(CODE))
truthy("无省略号 …（红线 4）", CODE.indexOf("…") < 0)
truthy("无 <scroll>", !/<scroll/.test(TPL))
truthy("无 @keyframes（本页不做动画）", !/@keyframes/.test(STYLE))
truthy("无 transform 绑定", !/transform/.test(STYLE))
truthy("无 touch/swipe 手势（drag 会被本引擎判点击）", !/touchstart|touchmove|@swipe/.test(CODE))
truthy("页根不挂 onclick", !/<div class="page"[^>]*onclick/.test(TPL))
truthy("全页无 setInterval（分钟级，禁秒级轮询）", !/setInterval/.test(CODE))
truthy("样式里无 {{ }} 数据绑定", !/\{\{/.test(STYLE))

var sizes = (STYLE.match(/font-size:\s*(\d+)px/g) || []).map(function(s) { return Number(/(\d+)/.exec(s)[1]) })
var ALLOWED = [44, 28, 30, 24]
eq("CSS 字号只出现 44/28/30/24 四档", JSON.stringify(sizes.filter(function(v) { return ALLOWED.indexOf(v) < 0 })), "[]")
eq("无 12~23px 小字（红线：肉眼不可读）", sizes.filter(function(v) { return v >= 12 && v <= 23 }).length, 0)
truthy("页面左右 padding 12px", /\.page \{[^}]*padding:\s*44px 12px/.test(STYLE))
eq("页头标题 28px", cssNum("header-title", "font-size"), 28)
eq("日名 24px", cssNum("day-text", "font-size"), 24)
// 全页只有「当前节」一处描边：状态标记，不是装饰分隔线（事故案例 14 禁的是分隔线）
eq("描边只有 1 处（is-now 状态环）", (STYLE.match(/border-width:\s*2px/g) || []).length, 1)
truthy("描边挂在 .tile.is-now 上且为纯白环", /\.tile\.is-now \{[^}]*border-color:\s*#ffffff/.test(STYLE))

/* 2. 网格与课名分档 */
console.log("\n[2] 网格与课名分档")
var a = makeInst(T("09:00:00"))
a.onInit()
eq("今天是 " + TODAY + " → 日名「今天」", a.dayLabel, "今天")
eq("8 节 → 4 行（每行 2 格）", a.rows.length, 4)
eq("每行 2 格", a.rows[0].cells.length, 2)
eq("瓷砖顺序按上课时间（第一节 数学）", a.rows[0].cells[0].name, "数学")
eq("瓷砖底色取共享科目色表（数学）", a.rows[0].cells[0].color, realSubjectColor.getSubjectColor("数学"))
eq("2 字课名走 t2 档（28px）", a.rows[0].cells[0].sizeCls, "t2")
eq("t2 档行高 34 写在 CSS 里", /.t2 \{ font-size: 28px; line-height: 34px \}/.test(STYLE), true)
eq("3 字课名走 tn 档（24px）", a.rows[1].cells[0].sizeCls, "tn")
eq("tn 档行高 28 写在 CSS 里", /.tn \{ font-size: 24px; line-height: 28px \}/.test(STYLE), true)
eq("行内不留 null 占位", JSON.stringify(a.rows).indexOf("null"), -1)

var b = makeInst(T("09:00:00"))
b.onInit()
b.dayCursor = (DOW + 1) % 7
b.render()
eq("次日 0 节 → 空态（不渲染瓷砖行）", b.rows.length, 0)
eq("次日 0 节 → hasCourses=false", b.hasCourses, false)
eq("次日 0 节 → 空态文案带日名", b.emptyHint, "周" + ["日", "一", "二", "三", "四", "五", "六"][(DOW + 1) % 7] + "无课")

var c = makeInst(T("09:00:00"), { schedule: FIX12 })
c.onInit()
eq("12 节 → 只排 4 行 × 2 = 8 格", c.rows.length, 4)
eq("12 节 → 日名报「+4」", c.dayLabel, "今天 +4")
eq("12 节 → 总课数记全", c.totalCount, 12)
eq("第 8 格是地理（前 8 节）", c.rows[3].cells[1].name, "地理")

/* 3. 切天边界 */
console.log("\n[3] 切天边界")
var d = makeInst(T("09:00:00"))
d.onInit()
d.dayCursor = 0
d.prevDay()
eq("周日再往前 → 停在 0", d.dayCursor, 0)
d.dayCursor = 6
d.nextDay()
eq("周六再往后 → 停在 6", d.dayCursor, 6)
d.dayCursor = 0
d.nextDay()
eq("周日往后 → 周一", d.dayCursor, 1)

/* 4. 当前节高亮 */
console.log("\n[4] 当前节高亮")
function nowNames(inst) {
  var out = []
  inst.rows.forEach(function(row) { row.cells.forEach(function(t) { if (t.now) out.push(t.name) }) })
  return out
}
var e = makeInst(T("10:20:00"))   // 第 3 节 10:00-10:45
e.onInit()
var eNow = nowNames(e)
eq("10:20 落在第 3 节 → 只有 1 格高亮", eNow.length, 1)
eq("高亮的是计算机", eNow[0], "计算机")

var f = makeInst(T("10:50:00"))   // 第 3 节已下课、第 4 节未上
f.onInit()
eq("课间 → 无高亮", nowNames(f).length, 0)

var g = makeInst(T("23:00:00"))
g.onInit()
eq("深夜 → 无高亮（不误判）", nowNames(g).length, 0)

/* 5. 首帧兜底（pit-20261025-24） */
console.log("\n[5] 首帧兜底")
var h1 = makeInst(T("09:00:00"), { dbInit: false })
h1.onInit()
eq("database.init 永不回调 → 仍用内置课表出画", h1.rows.length, 4)
eq("database.init 被调过一次", h1.__dbCalls.init, 1)
var h2 = makeInst(T("09:00:00"), { noTheme: true })
h2.onInit()
eq("storage 完全不回调 → 首帧就有画面", h2.hasCourses, true)
var onInitBody = (/onInit\(\)\s*\{([\s\S]*?)\n  \},/.exec(CODE) || [])[1] || ""
truthy("onInit 里不直接调 database.init（pit-20261025-24）", onInitBody.indexOf("database.init") < 0)
truthy("onInit 先铺内置课表", /self\.applySchedule\(/.test(onInitBody))

/* 6. 屏宽适配 */
console.log("\n[6] 屏宽适配")
var i1 = makeInst(T("09:00:00"), { w: 192, h: 490 })
i1.onInit()
eq("192 屏：不进宽屏分支", i1._wide, false)
eq("192 屏：格宽保持 82px", i1.sz.cellW, "82px")
eq("192 屏：格高保持 68px", i1.sz.cellH, "68px")
eq("192 屏：2 字课名走 t2", i1.rows[0].cells[0].sizeCls, "t2")

var i2 = makeInst(T("09:00:00"), { w: 336, h: 480 })
i2.onInit()
eq("336 屏：进宽屏分支", i2._wide, true)
eq("336 屏：格宽 (336−28−8)/2 = 150px", i2.sz.cellW, "150px")
eq("336 屏：2 字课名走 t2w（30px）", i2.rows[0].cells[0].sizeCls, "t2w")
eq("336 屏：3 字课名走 tnw（28px）", i2.rows[1].cells[0].sizeCls, "tnw")

var i3 = makeInst(T("09:00:00"), { noDevice: true })
i3.onInit()
eq("读不到屏参 → 退回 192 基准且照常出画", [i3.hasCourses, i3.sz.cellW].join("|"), "true|82px")

/* 7. 宽度预算（192 屏内宽 168px） */
console.log("\n[7] 宽度预算（内宽 168px）")
var innerTile = 82 - 4   // 格宽 − 左右 padding 2
le("瓷砖内宽够放 2 个 28px 汉字", estW("数学", 28), innerTile)
le("瓷砖内宽够放 2 个 24px 汉字（3 字课名折行后每行 2 字）", estW("计算", 24), innerTile)
truthy("3 字课名 @24 必然折行（lines:2 收口，不用 ellipsis）", estW("计算机", 24) > innerTile)
le("日名「周三 +3」≤ 中间可用 108px", estW("周" + ["日", "一", "二", "三", "四", "五", "六"][0] + " +3", 24), 108)
le("日名「今天」", estW("今天", 24), 108)
le("空态「周五无课」", estW("周五无课", 24), 168)
le("页头「多彩」≤ 头中可用 108px", estW("多彩", 28), 108)

/* 8. 高度栈（内容底 ≤440） */
console.log("\n[8] 高度栈（内容底 ≤440）")
var headerH = cssNum("back-header", "height") || 36
var headerMb = cssNum("back-header", "margin-bottom")
var dayH = cssNum("day-row", "height")
var dayMb = cssNum("day-row", "margin-bottom")
var cellH = cssNum("grid-row", "height")
var gapH = cssNum("grid-row", "margin-bottom")
var stack = 44 + headerH + headerMb + dayH + dayMb + 4 * cellH + 3 * gapH
le("四行瓷砖最坏高度（含 44px 状态栏）", stack, 440)
eq("两列 + 缝正好顶满内宽 168", 82 * 2 + 4, 168)

/* 9. 分钟级刷新 */
console.log("\n[9] 分钟级刷新")
var j = makeInst(new Date("2026-10-20T12:34:56+08:00").getTime())
j.onInit()
eq("整分对齐：12:34:56 → 只等 4s", j.__timers.calls[0], 4000)
eq("只挂一个定时器", j.__timers.pending(), 1)
j.onHide()
eq("onHide 清定时器", j.__timers.pending(), 0)
j.onShow()
eq("onShow 回前台续排", j.__timers.pending(), 1)
j.onDestroy()
eq("onDestroy 双清", j.__timers.pending(), 0)

/* 10. 返回键 */
console.log("\n[10] 返回键")
var k1 = makeInst(T("09:00:00"))
k1.onInit()
eq("冷启动（root）→ 不显示返回按钮", k1.isRoot, true)
k1.backClick()
eq("root 态 backClick 回「更多首页」", k1.__router.uri, "/pages/schedule-panel")
eq("root 态硬件返回 → 退出", k1.onBackPress(), true)

var k2 = makeInst(T("09:00:00"))
k2.fromPanel = "1"
k2.onInit()
eq("push 态 → 显示返回按钮", k2.isRoot, false)
k2.backClick()
eq("push 态 backClick = router.back", k2.__router.last, "back")
eq("push 态硬件返回 → 交还系统", k2.onBackPress(), false)

/* ── 汇总 ── */
console.log("\n" + "─".repeat(46))
console.log(fail === 0
  ? "\x1b[32m全部通过\x1b[0m：" + pass + " 项"
  : "\x1b[31m失败 " + fail + " 项\x1b[0m / 通过 " + pass + " 项")
process.exit(fail === 0 ? 0 : 1)
