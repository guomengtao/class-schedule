/**
 * 智能切换（schedule-panel-dual-mode）单元测试 —— node test/schedule-panel-dual-mode.test.js
 *
 * 同 test/schedule-panel-countdown.test.js：快应用无框架，逻辑在 .ux 的 <script> 里，Node 不能直接 require。
 * 这里抽出真实源码求值 + 注入桩（假时钟 / 假定时器 / 假数据层），测的就是线上那份。
 *
 * 钉死的命门：
 *   1) 三态判定：上课中（进度% / 已过 / 还剩）/ 课间（距下节时分）/ 结束（有课上完 vs 今天没课）；
 *   2) ev-six 硬指标：字号只准 44/28/30/24 四档、无 12~23px、无 `if=`、无分隔符、无 ellipsis、左右 12px；
 *   3) 课名按字数 44/30/24 分档，且任意文案宽度 ≤168px（192 屏内宽）；
 *   4) 首帧兜底：database.init 永不回调也要用内置课表出画面（旧版卡「加载中」的根因）；
 *   5) 分钟对齐刷新：全页只有一个 setTimeout（禁 setInterval / 禁秒级轮询）；
 *   6) 高度栈 ≤440（胶囊圆角 y>440 起右缘 x<180，超了必被切）。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "schedule-panel-dual-mode", "schedule-panel-dual-mode.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }
function le(n, v, lim) { if (typeof v === "number" && v <= lim) ok(n + "（" + v + " ≤ " + lim + "）"); else bad(n, "期望 ≤" + lim + "，实际 " + v) }

var STYLE = (SRC.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || ""
var TPL = (SRC.match(/<template>([\s\S]*?)<\/template>/) || [])[1] || ""
// 注释里会提到禁用的 API / 分隔符 / 箭头，查禁区要剔掉注释只看真代码
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

// 固定用 2026-10-20（星期二）做基准日，fixture 的 day 跟着时钟自动对齐
var TODAY = "星期二"

var FIXTURE = [
  { day: TODAY, classes: [
    { name: "语文", time: "08:00 - 08:45", location: "东楼 201" },
    { name: "数学", time: "10:00 - 10:45", location: "东楼 201" },
    { name: "计算机", time: "14:00 - 14:45", location: "机房1" }
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
  // store.getTheme 回态：opts.noTheme=true 时不回调（模拟 storage 挂掉）
  var fakeStore = {
    getTheme: function(cb) {
      if (opts.noTheme) return
      cb({ bg: "#1a1a2e", card: "#16213e", border: "#0f3460", accent: "#7ec8e3", text: "#fff", textSecondary: "#888899", textMuted: "#555566" }, "blue")
    }
  }
  var fakeUtils = { exitApp: function() { return true } }
  var fakeBuiltin = { schedule: FIXTURE }
  function fakeRequire(p) {
    if (/database\.js$/.test(p)) return fakeDb
    if (/store\.js$/.test(p)) return fakeStore
    if (/utils\.js$/.test(p)) return fakeUtils
    if (/schedule\.js$/.test(p)) return fakeBuiltin
    throw new Error("未预期的 require: " + p)
  }
  var router = { last: null, uri: null, back: function() { this.last = "back" }, push: function(o) { this.last = "push"; this.uri = o.uri } }

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

function T(hhmm, day) {
  var d = day || 20
  return new Date("2026-10-" + d + "T" + hhmm + ":00+08:00").getTime()
}

// 字宽口径：全角 1.33em、空格 0.3em、半角按真机实测 0.63em（手册 §4.0 的 0.5 偏乐观：
// 24px 下「17:00 - 18:30」实测 164px 并折行，0.5 口径只算出 156px 会漏判）
function estW(s, px) {
  s = s || ""
  var w = 0
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i)
    w += (c === 32) ? 0.3 : (c > 127 ? 1.33 : 0.63)
  }
  return Math.round(w * px * 10) / 10
}

// 页面固定高度栈（不含 flex:1 的 spacer）
function cssNum(sel, prop) {
  var re = new RegExp("\\." + sel + "\\s*\\{([^}]*)\\}")
  var m = re.exec(STYLE)
  if (!m) return 0
  var p = new RegExp("(?:^|;|\\s)" + prop + "\\s*:\\s*(-?\\d+)px")
  var mm = p.exec(m[1])
  return mm ? Number(mm[1]) : 0
}

console.log("\n\x1b[1m智能切换栏目 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 结构 / 禁区（ev-six 硬指标） */
console.log("\n[1] 结构 / 禁区")
truthy("模板含状态标签 .mode-tag", /class="mode-tag"/.test(TPL))
truthy("模板含上课中卡片 .c-name", /class="c-name"/.test(TPL))
truthy("模板含课间大数字 .c-big", /class="c-big"/.test(TPL))
truthy("模板含结束大字 .c-done", /class="c-done"/.test(TPL))
truthy("三态各一张卡（card 出现 3 次）", (TPL.match(/class="card"/g) || []).length === 3)
truthy("无 if= 条件属性（事故案例 11）", !/\sif="/.test(TPL))
// 返回按钮 + 占位 + 三张卡 = 5 处 display 绑定，取代全部 if=
eq("display 绑定五处（返回键/占位/三态卡片）", (TPL.match(/display: \{\{/g) || []).length, 5)
truthy("无 text-overflow: ellipsis（红线 8）", !/text-overflow/.test(STYLE))
truthy("无分隔符 ·（红线 4）", CODE.indexOf("·") < 0)
truthy("无装饰箭头 › →（红线 4）", !/[›→]/.test(CODE))
truthy("无 <scroll>", !/<scroll/.test(TPL))
truthy("全页无 setInterval（分钟级，禁秒级轮询）", !/setInterval/.test(CODE))
truthy("样式里无 {{ }} 数据绑定", !/\{\{/.test(STYLE))

var sizes = (STYLE.match(/font-size:\s*(\d+)px/g) || []).map(function(s) { return Number(/(\d+)/.exec(s)[1]) })
var ALLOWED = [44, 28, 30, 24]
var offTier = sizes.filter(function(v) { return ALLOWED.indexOf(v) < 0 })
eq("字号只出现 44/28/30/24 四档", JSON.stringify(offTier), "[]")
eq("无 12~23px 小字（红线：肉眼不可读）", sizes.filter(function(v) { return v >= 12 && v <= 23 }).length, 0)
truthy("页面左右 padding 12px", /\.page \{[^}]*padding:\s*44px 12px/.test(STYLE))
eq("页头标题 28px", cssNum("header-title", "font-size"), 28)
// text 不吃 align-self，居中只能靠 width:100% + text-align（真机首版左对齐）
truthy("状态标签居中（text-align + 满宽）", /\.mode-tag \{[^}]*width:\s*100%[^}]*text-align:\s*center/.test(STYLE))

/* 2. 上课中 */
console.log("\n[2] 上课中")
var a = makeInst(T("08:30"))
a.onInit()
eq("状态标签 = 上课中", a.modeLabel, "上课中")
eq("三态开关：isClass", a.isClass, true)
eq("三态开关：isBreak/isDone", [a.isBreak, a.isDone].join(), "false,false")
eq("课名 = 当前课", a.currentName, "语文")
eq("课名 2 字 → 44px", a.nameFont, 44)
eq("时间行 = 到 08:45（只放一头）", a.timeText, "到 08:45")
eq("进度 = 30/45 = 67%", a.progressPercent, 67)
eq("已过文案（带空格、不带分隔符）", a.elapsedText, "已过 30 分")
eq("还剩文案", a.remainText, "还剩 15 分")

var a2 = makeInst(T("08:00"))
a2.onInit()
eq("刚上课 0 分钟 → 进度 0%", a2.progressPercent, 0)
eq("刚上课 0 分钟 → 已过 0 分", a2.elapsedText, "已过 0 分")

var a3 = makeInst(T("14:20"))
a3.onInit()
eq("3 字课名（计算机）降档 30px", a3.nameFont, 30)
eq("3 字课名 30px 宽 ≤168", estW("计算机", 30) <= 168, true)

/* 3. 课间 */
console.log("\n[3] 课间")
var b = makeInst(T("09:00"))
b.onInit()
eq("状态标签 = 课间", b.modeLabel, "课间")
eq("三态开关：isBreak", b.isBreak, true)
eq("下一节 = 数学", b.nextName, "数学")
eq("倒计时 = 60 分钟 → 01:00", b.displayTime, "01:00")
eq("时间行 = 10:00 开始", b.timeText, "10:00 开始")
eq("课间态不留上一节的课名", b.currentName, "")

var b2 = makeInst(T("09:05"))
b2.onInit()
eq("09:05 → 距下节 00:55", b2.displayTime, "00:55")

var b3 = makeInst(T("12:00"))
b3.onInit()
eq("午休跨越两节课 → 抓最近的一节（计算机）", b3.nextName, "计算机")

/* 4. 结束态 */
console.log("\n[4] 结束态")
var c = makeInst(T("18:00"))
c.onInit()
eq("有课但上完 → 状态标签 结束", c.modeLabel, "结束")
eq("有课但上完 → 大字 下课", c.doneWord, "下课")
eq("有课但上完 → 收尾 明天见", c.doneText, "明天见")
eq("三态开关：isDone", c.isDone, true)

var d = makeInst(T("08:30"), { schedule: [{ day: TODAY, classes: [] }] })
d.onInit()
eq("今天没课 → 大字 无课", d.doneWord, "无课")
eq("今天没课 → 收尾 今天没有课", d.doneText, "今天没有课")
eq("今天没课 → 不误标上课中", d.isClass, false)

var d2 = makeInst(T("08:30"), { schedule: [] })
d2.onInit()
eq("课表整个为空 → 无课", d2.doneWord, "无课")

/* 5. 首帧兜底（旧版卡「加载中」的根因） */
console.log("\n[5] 首帧兜底")
var e = makeInst(T("08:30"), { dbInit: false })
e.onInit()
eq("database.init 永不回调 → 仍不卡加载中", e.isLoading, false)
eq("database.init 永不回调 → 用内置课表算出上课中", e.modeLabel, "上课中")
eq("database.init 被调过一次", e.__dbCalls.init, 1)

var e2 = makeInst(T("08:30"), { noTheme: true })
e2.onInit()
eq("storage 完全不回调 → 首帧就有内容", e2.modeLabel, "上课中")
eq("storage 完全不回调 → 不卡加载中", e2.isLoading, false)

// 旧版写法回归哨兵：database.init 不许直接躺在 onInit 里（必须在 storage 回调之后）
var onInitBody = (/onInit\(\)\s*\{([\s\S]*?)\n  \},/.exec(CODE) || [])[1] || ""
truthy("onInit 里不直接调 database.init（实测回调不触发）", onInitBody.indexOf("database.init") < 0)
truthy("onInit 先铺内置课表", /self\.apply\(/.test(onInitBody))

/* 6. 宽度预算（192 屏内宽 168px） */
console.log("\n[6] 宽度预算（内宽 168px）")
le("进度标签「已过 45 分」", estW("已过 45 分", 24), 168)
le("进度标签「还剩 45 分」", estW("还剩 45 分", 24), 168)
le("大数字 11:59", estW("11:59", 44), 168)
le("时间行「到 18:30」", estW("到 18:30", 24), 168)
le("时间行「18:30 开始」", estW("18:30 开始", 24), 168)
truthy("回归哨兵：整段「08:00 - 08:45」超宽（所以只放一头）", estW("08:00 - 08:45", 24) > 168)
le("状态标签 上课中", estW("上课中", 24), 168)
le("结束大字 下课", estW("下课", 44), 168)
le("结束收尾 今天没有课", estW("今天没有课", 24), 168)
le("课名 2 字 @44", estW("数学", 44), 168)
le("课名 4 字 @30", estW("物理化学", 30), 168)
le("课名 5 字 @24（一行上限）", estW("体育与健康", 24), 168)
truthy("课名 6 字 @24 必须折行（不靠缩字号硬塞）", estW("体育与健康教育", 24) > 168)

/* 7. 高度栈（内容底 ≤440） */
console.log("\n[7] 高度栈（内容底 ≤440）")
var headerH = cssNum("header-title", "line-height") || 36
var headerMb = cssNum("back-header", "margin-bottom")
var tagH = cssNum("mode-tag", "line-height")
var tagMb = cssNum("mode-tag", "margin-bottom")
var cardPad = cssNum("card", "padding")
var nameH = cssNum("c-name", "line-height")
var timeH = cssNum("c-time", "line-height")
var rowH = cssNum("c-row", "line-height")
var bigH = cssNum("c-big", "line-height")
var barH = cssNum("bar-bg", "height")
var barMt = cssNum("bar-bg", "margin-top")
var barMb = cssNum("bar-bg", "margin-bottom")

var hInClass = 44 + headerH + headerMb + tagH + tagMb + cardPad * 2 + nameH + timeH + barMt + barH + barMb + rowH + rowH
var hBreak = 44 + headerH + headerMb + tagH + tagMb + cardPad * 2 + cssNum("c-label", "line-height") + bigH + nameH + timeH
var hDone = 44 + headerH + headerMb + tagH + tagMb + cardPad * 2 + cssNum("c-done", "line-height") + timeH
le("上课中态最坏高度", hInClass, 440)
le("课名折两行时上课中态高度", hInClass + nameH, 440)
le("课间态最坏高度", hBreak, 440)
le("结束态最坏高度", hDone, 440)
truthy("两种态都不写死容器高（靠 spacer 居中）", /\.spacer \{[^}]*flex:\s*1/.test(STYLE))

/* 8. 分钟级刷新 */
console.log("\n[8] 分钟级刷新")
var f = makeInst(new Date("2026-10-20T12:34:56+08:00").getTime())
f.onInit()
eq("整分对齐：12:34:56 → 只等 4s", f.__timers.calls[0], 4000)
eq("只挂一个定时器（不强留旧 timer）", f.__timers.pending(), 1)
f.onHide()
eq("onHide 清定时器", f.__timers.pending(), 0)
f.onShow()
eq("onShow 回前台重算并续排", f.__timers.pending(), 1)
f.onDestroy()
eq("onDestroy 双清", f.__timers.pending(), 0)

var g = makeInst(T("08:30"))
g.onInit()
g.__clock.set(T("09:20"))
g.__timers.flush(1)
eq("跨节次自动切换（08:30 语文 → 09:20 课间）", g.modeLabel, "课间")
eq("切态后下一节 = 数学", g.nextName, "数学")

/* 9. 返回键 */
console.log("\n[9] 返回键")
var h1 = makeInst(T("08:30"))
h1.onInit()
eq("冷启动（root）→ 不显示返回按钮", h1.isRoot, true)
h1.goBack()
eq("root 态 goBack 回「更多首页」", h1.__router.uri, "/pages/schedule-panel")
eq("root 态硬件返回 → 退出", h1.onBackPress(), true)

var h2 = makeInst(T("08:30"))
h2.fromPanel = "1"
h2.onInit()
eq("push 态 → 显示返回按钮", h2.isRoot, false)
h2.goBack()
eq("push 态 goBack = router.back", h2.__router.last, "back")
eq("push 态硬件返回 → 交还系统", h2.onBackPress(), false)

/* ── 汇总 ── */
console.log("\n" + "─".repeat(46))
console.log(fail === 0
  ? "\x1b[32m全部通过\x1b[0m：" + pass + " 项"
  : "\x1b[31m失败 " + fail + " 项\x1b[0m / 通过 " + pass + " 项")
process.exit(fail === 0 ? 0 : 1)
