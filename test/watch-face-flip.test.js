/**
 * 翻页表盘（watch-face-flip）单元测试
 *
 * 用法：node test/watch-face-flip.test.js
 *
 * 为什么这么测：同 test/schedule-panel.test.js —— 快应用没有测试框架，逻辑写在 .ux 的
 * <script> 里，Node 不能直接 require。本脚本抽出**真实源码**求值 + 注入桩，测的就是线上那份。
 *
 * 这一组用例钉死 2026-10-20 重构的命门：
 *   1) 脏检查：同一秒内第二次 tick 不能产生任何写入（v1 每秒无条件写 6 个数）；
 *   2) 秒对齐：先 setTimeout(1000 - now%1000) 再起 interval（v1 相位随机，最多慢 1s）；
 *   3) 手势：上滑 landscape / 下滑 animated / 29px 不跳；单击回目录，滑动后吞点击；
 *   4) 禁用机制回归：页面不得再出现 `<scroll`（domUpdate 报错那条路，v1 就死在这）；
 *   5) 黑屏雷扫描：无群组选择器、无 transform 数据绑定、top 全在安全区 [40,450]；
 *   6) 排版硬约束：.di 26×64 且字号 ≤34 —— 46px 曾把数字溢出卡片、右侧被屏幕切掉。
 */

"use strict"

process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")

var UX = path.join(__dirname, "..", "src", "pages", "watch-face-flip", "watch-face-flip.ux")
var SRC = fs.readFileSync(UX, "utf8")

var C = { green: "\x1b[32m", red: "\x1b[31m", dim: "\x1b[2m", reset: "\x1b[0m", bold: "\x1b[1m" }
function green(s) { return C.green + s + C.reset }
function red(s) { return C.red + s + C.reset }

var pass = 0
var fail = 0
function ok(name) { pass++; console.log("  " + green("✓") + " " + name) }
function bad(name, detail) { fail++; console.log("  " + red("✗") + " " + name + (detail ? "\n      " + C.dim + detail + C.reset : "")) }
function eq(name, actual, expected) {
  if (actual === expected) ok(name)
  else bad(name, "期望 " + JSON.stringify(expected) + "，实际 " + JSON.stringify(actual))
}
function truthy(name, v) { if (v) ok(name); else bad(name, "期望真值，实际 " + JSON.stringify(v)) }

/* ── 桩：假时钟 ───────────────────────────────────────────── */

function makeClock(ms) {
  var c = { ms: ms }
  function FakeDate(v) {
    this._d = new Date(v === undefined ? c.ms : v)
  }
  FakeDate.prototype.getHours = function() { return this._d.getHours() }
  FakeDate.prototype.getMinutes = function() { return this._d.getMinutes() }
  FakeDate.prototype.getSeconds = function() { return this._d.getSeconds() }
  FakeDate.prototype.getDate = function() { return this._d.getDate() }
  FakeDate.prototype.getMonth = function() { return this._d.getMonth() }
  FakeDate.prototype.getDay = function() { return this._d.getDay() }
  FakeDate.now = function() { return c.ms }
  c.Date = FakeDate
  return c
}

/* ── 桩：假定时器（可手动 flush，按时间顺序执行）──────────── */

function makeTimers() {
  var seq = 0
  var q = []
  var dead = {}
  var t = {
    now: 0,
    calls: [],
    setTimeout: function(fn, ms) {
      var id = ++seq
      t.calls.push(ms || 0)
      q.push({ id: id, at: t.now + (ms || 0), fn: fn, every: 0 })
      return id
    },
    setInterval: function(fn, ms) {
      var id = ++seq
      t.calls.push(ms || 0)
      q.push({ id: id, at: t.now + (ms || 0), fn: fn, every: ms || 1 })
      return id
    },
    clearTimeout: function(id) { dead[id] = 1 },
    clearInterval: function(id) { dead[id] = 1 },
    flush: function(max) {
      var n = 0
      var lim = max || 500
      while (q.length && n < lim) {
        q.sort(function(a, b) { return a.at - b.at })
        var job = q.shift()
        if (dead[job.id]) continue
        t.now = job.at
        if (job.every) q.push({ id: job.id, at: job.at + job.every, fn: job.fn, every: job.every })
        job.fn()
        n++
      }
      return n
    }
  }
  return t
}

/* ── 载入真实源码 ─────────────────────────────────────────── */

function loadDef(timers, clock) {
  var m = SRC.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("watch-face-flip.ux 里找不到 <script> 块")
  var code = m[1]
    .replace(/^\s*import[^\n]*$/gm, "")
    .replace(/export\s+default/, "module.exports =")
  var factory = new Function(
    "router", "module", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date",
    code + "\nreturn module.exports"
  )
  var mod = {}
  var router = { last: null, replace: function(o) { this.last = o && o.uri } }
  var def = factory(router, mod, timers.setTimeout, timers.clearTimeout,
                    timers.setInterval, timers.clearInterval, clock.Date)
  return { def: def, router: router }
}

var KEYS = ["d0", "d1", "d2", "d3", "d4", "d5"]

function makeInst(atMs) {
  var timers = makeTimers()
  var clock = makeClock(atMs)
  var r = loadDef(timers, clock)
  var inst = {}
  Object.keys(r.def).forEach(function(k) {
    if (k !== "data") inst[k] = r.def[k]
  })
  var data = JSON.parse(JSON.stringify(r.def.data))
  Object.keys(data).forEach(function(k) { inst[k] = data[k] })

  /* 给 d0..d5 装计数器，用来数 setData 次数 */
  inst.__writes = []
  KEYS.forEach(function(key) {
    var v = inst[key]
    Object.defineProperty(inst, key, {
      get: function() { return v },
      set: function(nv) { inst.__writes.push(key); v = nv },
      enumerable: true,
      configurable: true
    })
  })
  inst.__timers = timers
  inst.__clock = clock
  inst.__router = r.router
  return inst
}

/* 基准时刻：六位数字无重复，便于断言 */
var T1 = new Date("2026-10-20T12:34:56+08:00").getTime()

/* ══════════════════════════════════════════════════════════ */
console.log(C.bold + "\n翻页表盘 · 单元测试" + C.reset)
console.log(C.dim + "  " + UX + C.reset)

/* ── 1. 导入与脏检查 ─────────────────────────────────────── */
console.log("\n[1] 脏检查")

var a = makeInst(T1)
a.onInit()
eq("首次同步写满 6 位", a.__writes.length, 6)
eq("六位取到当前时间", [a.d0, a.d1, a.d2, a.d3, a.d4, a.d5].join(""), "123456")

var w0 = a.__writes.length
a.tick()
eq("同一秒再 tick → 0 次写入", a.__writes.length - w0, 0)

a.__clock.ms = new Date("2026-10-20T12:34:57+08:00").getTime()
a.tick()
eq("下一秒只写秒个位", a.__writes.slice(-1).join(","), "d5")

a.__clock.ms = new Date("2026-10-20T12:35:00+08:00").getTime()
a.tick()
eq("跨分写 3 位（分个/秒十/秒个）", a.__writes.slice(-3).join(","), "d3,d4,d5")

/* ── 2. 日期行 ──────────────────────────────────────────── */
console.log("\n[2] 日期行")
eq("dateText = 10-20 周二", a.dateText, "10-20 周二")
var d0 = a.__writes.length
a.tick()
eq("日期不变时不重复写", a.__writes.length - d0, 0)

/* ── 3. 秒对齐 ──────────────────────────────────────────── */
console.log("\n[3] 秒对齐")

var odd = T1 + 433
var b = makeInst(odd)
b.onInit()
b.stopAll()
b.__timers.calls.length = 0
b.scheduleNext()
eq("首个 setTimeout 延迟 = 1000 - now%1000", b.__timers.calls[0], 1000 - (odd % 1000))

/* ── 4. 生命周期 ────────────────────────────────────────── */
console.log("\n[4] 生命周期")

var c = makeInst(T1)
c.onInit()
c.onShow()
c.__timers.flush()
truthy("onShow 后 interval 已建", !!c.timer)
c.onHide()
eq("onHide 后 interval 已清", c.timer, undefined)
eq("onHide 后 shown 全部失效", c.shown.join(","), "-1,-1,-1,-1,-1,-1")
var w1 = c.__writes.length
c.tick()
eq("再显示时补齐 6 位", c.__writes.length - w1, 6)

/* ── 5. 手势 ────────────────────────────────────────────── */
console.log("\n[5] 手势路由")

var d = makeInst(T1)
d.onInit()

d.__router.last = null
d.touchStartY = 300
d.onTouchEnd({ clientY: 260 })
eq("上滑 40px → 风景表盘", d.__router.last, "/pages/watch-face-landscape")
eq("上滑后吞掉点击", d.suppressTap, true)

d.suppressTap = false
d.__router.last = null
d.touchStartY = 300
d.onTouchEnd({ clientY: 340 })
eq("下滑 40px → 动效表盘", d.__router.last, "/pages/watch-face-animated")

d.suppressTap = false
d.__router.last = null
d.touchStartY = 300
d.onTouchEnd({ clientY: 271 })
eq("滑 29px → 不跳转", d.__router.last, null)
eq("滑 29px → 不吞点击", d.suppressTap, false)

d.__router.last = null
d.touchStartY = 0
d.onTap()
eq("单击 → 回目录", d.__router.last, "/pages/watch-face-list")

d.suppressTap = true
d.__router.last = null
d.onTap()
eq("suppressTap 时点击被吞", d.__router.last, null)
eq("吞完之后复位", d.suppressTap, false)

/* ── 6. 禁用机制与排版硬约束（静态） ────────────────────── */
console.log("\n[6] 静态约束")

var styleBlock = (/<style>([\s\S]*?)<\/style>/.exec(SRC) || [])[1] || ""
var diBlock = (/\.di\s*\{([^}]*)\}/.exec(SRC) || [])[1] || ""

/* 去掉注释再判：头部注释会提到 v1 时代用过的 scroll/scrolltop（历史说明，不是代码） */
var CODE = SRC.replace(/<!--[\s\S]*?-->/g, "")

truthy("不再出现 <scroll（domUpdate 报错的那条路）", CODE.indexOf("<scroll") < 0)
truthy("无 scrolltop 绑定", !/scrolltop/.test(CODE))
truthy("无群组选择器", !/^\s*\.[\w-]+\s*,\s*\.[\w-]+\s*\{/m.test(styleBlock))
truthy("无 transform 数据绑定", !/transform\s*:[^;]*\{\{/.test(SRC))
truthy(".page 未用 justify-content", !/\.page\s*\{[^}]*justify-content/.test(SRC))
truthy(".page 未用 align-items", !/\.page\s*\{[^}]*align-items/.test(SRC))

eq(".di 宽 26px", Number((/width:\s*(\d+)px/.exec(diBlock) || [])[1]), 26)
eq(".di 高 64px", Number((/height:\s*(\d+)px/.exec(diBlock) || [])[1]), 64)
var diFont = Number((/font-size:\s*(\d+)px/.exec(diBlock) || [])[1])
truthy(".di 字号 ≤34（防溢出卡片）", diFont > 0 && diFont <= 34)

var tops = []
var re = /top:\s*(\d+)px/g
var mm
while ((mm = re.exec(styleBlock)) !== null) tops.push(Number(mm[1]))
eq("所有 top 在安全区 [40,450]（共 " + tops.length + " 处）", tops.filter(function(v) { return v < 40 || v > 450 }).join(","), "")

eq("模板绑满 6 位", (SRC.match(/\{\{ d[0-5] \}\}/g) || []).length, 6)
truthy("日期行已绑定", /\{\{ dateText \}\}/.test(SRC))

/* ── 汇总 ───────────────────────────────────────────────── */
console.log("\n" + "─".repeat(52))
if (fail === 0) {
  console.log(green("全部通过") + "：" + pass + " 项")
  process.exit(0)
} else {
  console.log(red("失败 " + fail + " 项") + "，通过 " + pass + " 项")
  process.exit(1)
}
