/**
 * 动画表盘（watch-face-animated）单元测试 —— node test/watch-face-animated.test.js
 *
 * 同 test/watch-face-flip.test.js：快应用无框架，逻辑在 .ux 的 <script> 里，Node 不能 require。
 * 这里抽出真实源码求值 + 注入桩（假时钟/假定时器），测的就是线上那份。
 *
 * 钉死的命门：
 *   1) 秒环几何：60 格、5 的倍数 12 格、全部落在 192×490 内、圆心 (96,96) 半径 66；
 *   2) 禁机制回归：不得出现 transform 数据绑定 / scrolltop / transition；
 *      全页只有一条 @keyframes 且只改 opacity（纯色无文字节点）；
 *   3) 走时脏检查：秒每拍写；同一分钟内 HH/MM 零写入；跨分钟只写 MM，跨小时才写 HH；
 *   4) 游标位置 = 秒数 × 6° 的极坐标；秒对齐 + 生命周期双清。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "watch-face-animated", "watch-face-animated.ux")
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
  ;["getHours", "getMinutes", "getSeconds", "getDate", "getMonth", "getDay"].forEach(function(k) {
    FakeDate.prototype[k] = function() { return this._d[k]() }
  })
  FakeDate.prototype.getTime = function() { return this._d.getTime() }
  FakeDate.now = function() { return c.ms }
  c.Date = FakeDate
  return c
}

function makeTimers() {
  var seq = 0, q = [], dead = {}
  var t = {
    now: 0,
    setTimeout: function(fn, ms) { var id = ++seq; q.push({ id: id, at: t.now + (ms || 0), fn: fn }); return id },
    setInterval: function(fn, ms) { var id = ++seq; q.push({ id: id, at: t.now + (ms || 0), fn: fn, every: ms || 1 }); return id },
    clearTimeout: function(id) { dead[id] = 1 },
    clearInterval: function(id) { dead[id] = 1 },
    pending: function() { return q.filter(function(j) { return !dead[j.id] }).length }
  }
  return t
}

var WATCH = ["timeH", "timeM", "secText", "curL", "curT", "dateText"]

function makeInst(atMs) {
  var m = SRC.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("找不到 <script> 块")
  var code = m[1].replace(/^\s*import[^\n]*$/gm, "").replace(/export\s+default/, "module.exports =")
  var timers = makeTimers(), clock = makeClock(atMs), mod = {}
  var router = { last: null, replace: function(o) { this.last = o && o.uri } }
  var factory = new Function("router", "module", "setTimeout", "clearTimeout", "setInterval",
                            "clearInterval", "Date", code + "\nreturn module.exports")
  var def = factory(router, mod, timers.setTimeout, timers.clearTimeout,
                    timers.setInterval, timers.clearInterval, clock.Date)

  var inst = {}
  Object.keys(def).forEach(function(k) { if (k !== "data") inst[k] = def[k] })
  var data = JSON.parse(JSON.stringify(def.data))
  Object.keys(data).forEach(function(k) { inst[k] = data[k] })

  WATCH.forEach(function(key) {
    var v = inst[key]
    Object.defineProperty(inst, key, {
      get: function() { return v },
      set: function(nv) { (inst.__writes = inst.__writes || []).push({ k: key, v: nv }); v = nv },
      enumerable: true, configurable: true
    })
  })
  inst.__timers = timers; inst.__clock = clock; inst.__router = router
  return inst
}

function at(h, m, s) {
  return new Date(2026, 9, 20, h, m, s || 0).getTime()
}
function writesOf(inst, from) { return (inst.__writes || []).slice(from || 0) }

/* ── 结构契约 ───────────────────────────────────────── */

console.log("\n\x1b[1m结构契约\x1b[0m")
{
  truthy("整屏可点（单击返回）", /class="page" onclick="onTap"/.test(TPL))
  truthy("秒环用 for 渲染 dots", /for="\{\{ dots \}\}"/.test(TPL))
  truthy("有秒游标节点", /class="cur"/.test(TPL))
  truthy("有环心秒数", /class="sec"/.test(TPL))
  eq("两行时间大字", (TPL.match(/class="dg"/g) || []).length, 2)
  truthy("有日期行", /class="date"/.test(TPL))
  truthy("有返回提示", /轻触返回/.test(TPL))
}

/* ── 禁机制回归 ─────────────────────────────────────── */

console.log("\n\x1b[1m禁机制回归\x1b[0m")
{
  truthy("不得出现 transform（数据绑定 rotate 会整页黑屏）", !/transform\s*:/.test(STYLE + TPL))
  var code = SRC.replace(/<!--[\s\S]*?-->/g, "")   // 去掉注释再扫，避免「头注释里提到 scrolltop」误判
  truthy("不得出现 scrolltop", !/scrolltop/i.test(code))
  truthy("不得出现 transition", !/transition/i.test(STYLE))
  eq("全页只有 1 条 @keyframes", (STYLE.match(/@keyframes/g) || []).length, 1)
  truthy("动画名是 kf-breathe", /animation-name:\s*kf-breathe/.test(STYLE))
  var kf = (/@keyframes\s+kf-breathe\s*\{([\s\S]*?)\}\s*$/.exec(STYLE) || [])[1] || ""
  truthy("keyframes 内不含数据绑定", !/\{\{/.test(kf))
  truthy("keyframes 内只动 opacity", /opacity/.test(kf) && !/transform|left|top/.test(kf))
  truthy("halo 是纯色无文字的 div", /<div class="halo"><\/div>/.test(TPL))
}

/* ── 秒环几何 ───────────────────────────────────────── */

console.log("\n\x1b[1m秒环几何\x1b[0m")
{
  var a = makeInst(at(14, 30, 7))
  a.onInit()
  eq("60 格刻度", a.dots.length, 60)
  var major = a.dots.filter(function(d) { return d.c === "dotM" }).length
  eq("5 的倍数 12 格加亮", major, 12)
  var inside = a.dots.every(function(d) {
    return d.l >= 0 && d.l + 7 <= 192 && d.t >= 0 && d.t + 7 <= 490
  })
  truthy("全部落在 192×490 内（含最大 7px 格）", inside)

  var bad1 = a.dots.filter(function(d) {
    var s = d.c === "dotM" ? 7 : 5
    var cx = d.l + s / 2, cy = d.t + s / 2
    var r = Math.sqrt(Math.pow(cx - 96, 2) + Math.pow(cy - 96, 2))
    return Math.abs(r - 66) > 0.6
  })
  eq("每格中心到圆心 (96,96) 的距离 = 66（±0.6）", bad1.length, 0)

  var rounded = a.dots.every(function(d) { return Math.round(d.l * 10) === d.l * 10 })
  truthy("坐标保留 1 位小数（避免亚像素抖动）", rounded)
}

/* ── 走时与游标 ─────────────────────────────────────── */

console.log("\n\x1b[1m走时与游标\x1b[0m")
{
  var a = makeInst(at(14, 30, 7))
  a.onInit()
  eq("初次上表 14:30", a.timeH + ":" + a.timeM, "14:30")
  eq("秒数补零", a.secText, "07")
  var expL = Math.round((96 + 66 * Math.sin(7 * 6 * Math.PI / 180) - 7) * 10) / 10
  var expT = Math.round((96 - 66 * Math.cos(7 * 6 * Math.PI / 180) - 7) * 10) / 10
  eq("游标 x = 圆心 + R·sin(42°) - r", a.curL, expL)
  eq("游标 y = 圆心 - R·cos(42°) - r", a.curT, expT)
  eq("日期格式", a.dateText, "10-20 周二")

  var w0 = writesOf(a).length
  a.__clock.ms = at(14, 30, 8)
  a.tick()
  var d0 = writesOf(a, w0)
  eq("秒变 1 拍：只写秒数与游标两点", d0.length, 3)
  eq("写入字段是 secText/curL/curT", d0.map(function(x) { return x.k }).join(","), "secText,curL,curT")

  var b = makeInst(at(14, 29, 59))
  b.onInit()
  var w1 = writesOf(b).length
  b.__clock.ms = at(14, 30, 0)
  b.tick()
  var d1 = writesOf(b, w1).map(function(x) { return x.k })
  truthy("跨分钟写 timeM", d1.indexOf("timeM") >= 0)
  truthy("跨分钟不写 timeH（14→14）", d1.indexOf("timeH") < 0)
  eq("跨分钟后读数 14:30", b.timeH + ":" + b.timeM, "14:30")

  var c = makeInst(at(14, 59, 59))
  c.onInit()
  var w2 = writesOf(c).length
  c.__clock.ms = at(15, 0, 0)
  c.tick()
  var d2 = writesOf(c, w2).map(function(x) { return x.k })
  truthy("跨小时写 timeH", d2.indexOf("timeH") >= 0)
  eq("跨小时后读数 15:00", c.timeH + ":" + c.timeM, "15:00")

  var e = makeInst(at(9, 5, 0))
  e.onInit()
  eq("补零：09:05", e.timeH + ":" + e.timeM, "09:05")
}

/* ── 定时器纪律 ─────────────────────────────────────── */

console.log("\n\x1b[1m定时器纪律\x1b[0m")
{
  var a = makeInst(at(14, 30, 7))
  a.onInit()
  a.onShow()
  truthy("起来后有定时器（对齐 + 心跳）", a.__timers.pending() >= 1)
  a.onHide()
  eq("onHide 后零待跑定时器", a.__timers.pending(), 0)
  a.onShow()
  a.onDestroy()
  eq("onDestroy 后零待跑定时器", a.__timers.pending(), 0)
  eq("重复 start 不叠加（只留 1 个对齐器）", (function() {
    var b = makeInst(at(14, 30, 7))
    b.onInit(); b.onShow(); b.onShow(); b.onShow()
    return b.__timers.pending()
  })(), 1)
}

/* ── 交互 ───────────────────────────────────────────── */

console.log("\n\x1b[1m交互\x1b[0m")
{
  var a = makeInst(at(14, 30, 7))
  a.onInit()
  a.onTap()
  eq("轻触返回目录", a.__router.last, "/pages/watch-face-list")
}

console.log("\n" + (fail === 0 ? "\x1b[32m" : "\x1b[31m") + pass + " 通过 / " + fail + " 失败\x1b[0m\n")
process.exit(fail === 0 ? 0 : 1)
