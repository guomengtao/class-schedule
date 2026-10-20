/**
 * 翻页表盘（watch-face-flip）单元测试 —— node test/watch-face-flip.test.js
 *
 * 同 test/schedule-panel.test.js：快应用没框架，逻辑在 .ux 的 <script> 里，Node 不能 require。
 * 这里抽出**真实源码**求值 + 注入桩（假时钟/假定时器），测的就是线上那份。
 *
 * 钉死的命门：
 *   1) 滚动是真的 —— 换字必须产生「中间帧」（top 不是 64 的整数倍），否则就是瞬移；
 *   2) 9→0 向前滚过副本到 -10 格再归零，不能倒着穿 8 个数字；
 *   3) 脏检查（同秒零写入、下一秒只动秒个位）+ 秒对齐 + 生命周期；
 *   4) 手势路由：上滑 landscape / 下滑 animated / 29px 不跳 / 单击回目录；
 *   5) 禁用机制回归：不得再出现 <scroll（domUpdate 报错那条路，v1/v2 都死在这）；
 *   6) 排版硬约束：窗口 26×64 + overflow:hidden，字号 ≤34。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "watch-face-flip", "watch-face-flip.ux")
var SRC = fs.readFileSync(UX, "utf8")

var C = { green: "\x1b[32m", red: "\x1b[31m", dim: "\x1b[2m", reset: "\x1b[0m" }
var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

function makeClock(ms) {
  var c = { ms: ms }
  function FakeDate(v) { this._d = new Date(v === undefined ? c.ms : v) }
  ;["getHours", "getMinutes", "getSeconds", "getDate", "getMonth", "getDay"].forEach(function(k) {
    FakeDate.prototype[k] = function() { return this._d[k]() }
  })
  FakeDate.now = function() { return c.ms }
  c.Date = FakeDate
  return c
}

function makeTimers() {
  var seq = 0, q = [], dead = {}
  var t = {
    now: 0, calls: [],
    setTimeout: function(fn, ms) { var id = ++seq; t.calls.push(ms || 0); q.push({ id: id, at: t.now + (ms || 0), fn: fn }); return id },
    setInterval: function(fn, ms) { var id = ++seq; t.calls.push(ms || 0); q.push({ id: id, at: t.now + (ms || 0), fn: fn, every: ms || 1 }); return id },
    clearTimeout: function(id) { dead[id] = 1 },
    clearInterval: function(id) { dead[id] = 1 },
    flush: function(max) {
      var n = 0, lim = max || 800
      while (q.length && n < lim) {
        q.sort(function(a, b) { return a.at - b.at })
        var job = q.shift()
        if (dead[job.id]) continue
        t.now = job.at
        if (job.every) q.push({ id: job.id, at: job.at + job.every, fn: job.fn, every: job.every })
        job.fn(); n++
      }
      return n
    }
  }
  return t
}

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

  inst.__writes = []
  ;["p0", "p1", "p2", "p3", "p4", "p5"].forEach(function(key) {
    var v = inst[key]
    Object.defineProperty(inst, key, {
      get: function() { return v },
      set: function(nv) { inst.__writes.push({ k: key, v: nv }); v = nv },
      enumerable: true, configurable: true
    })
  })
  inst.__timers = timers; inst.__clock = clock; inst.__router = router
  return inst
}

function writesOf(inst, key) {
  return inst.__writes.filter(function(w) { return w.k === key }).map(function(w) { return w.v })
}

var H = Number((/const\s+ITEM_H\s*=\s*(\d+)/.exec(SRC) || [])[1])
var STEPS = Number((/const\s+STEPS\s*=\s*(\d+)/.exec(SRC) || [])[1])
var T1 = new Date("2026-10-20T12:34:56+08:00").getTime()

console.log("\n\x1b[1m翻页表盘 · 单元测试\x1b[0m\n\x1b[2m  " + UX + "\x1b[0m")

/* 1. 常量与数字带 */
console.log("\n[1] 结构与常量")
var a = makeInst(T1)
eq("ITEM_H = 64", H, 64)
eq("STEPS = 5", STEPS, 5)
eq("数字带 11 项（0-9 + 副本 0）", a.items.length, 11)
eq("末项是副本 0", a.items[10], 0)

/* 2. 滚动是真滚动 */
console.log("\n[2] 滚动是真滚动")
a.onInit()
eq("初次同步滚 6 位（各推第 1 帧）", a.__writes.length, 6)
a.__timers.flush()
eq("六条带落位（12:34:56）", [a.p0, a.p1, a.p2, a.p3, a.p4, a.p5].join(","), "-64,-128,-192,-256,-320,-384")
var mids = writesOf(a, "p5").filter(function(v) { return v % H !== 0 })
truthy("秒个位有 " + mids.length + " 个中间帧（非 64 整数倍）→ 是滚动不是瞬移", mids.length >= 3)
eq("落定位置 = -6×64", a.p5, -6 * H)

/* 3. 9→0 向前滚 */
console.log("\n[3] 9→0 向前滚过副本")
var b = makeInst(T1)
b.onInit(); b.__timers.flush()
b.writeP(0, -9 * H); b.shown[0] = 9; b.__writes = []
b.stepTo(0, 0); b.__timers.flush()
var traj = writesOf(b, "p0")
truthy("轨迹经过 -10×64（副本）", traj.indexOf(-10 * H) >= 0)
eq("终点归零", traj[traj.length - 1], 0)
truthy("全程不为正（没倒着穿）", traj.every(function(v) { return v <= 0 }))
b.writeP(0, -3 * H); b.__writes = []
b.stepTo(0, 4); b.__timers.flush()
eq("普通进位终点 = -4×64", b.p0, -4 * H)
eq("普通进位不经过 -10 格", writesOf(b, "p0").indexOf(-10 * H), -1)

/* 4. 脏检查 */
console.log("\n[4] 脏检查")
var c = makeInst(T1)
c.onInit(); c.__timers.flush()
var w0 = c.__writes.length
c.tick()
eq("同一秒再 tick → 0 次写入", c.__writes.length - w0, 0)
c.__clock.ms = new Date("2026-10-20T12:34:57+08:00").getTime()
c.tick()
eq("下一秒只动秒个位", c.__writes[c.__writes.length - 1].k, "p5")
c.__clock.ms = new Date("2026-10-20T12:35:00+08:00").getTime()
var before = c.__writes.length
c.tick()
var touched = {}
c.__writes.slice(before).forEach(function(w) { touched[w.k] = 1 })
eq("跨分动 3 位", Object.keys(touched).sort().join(","), "p3,p4,p5")

/* 5. 日期与秒对齐 */
console.log("\n[5] 日期与秒对齐")
eq("dateText = 10-20 周二", c.dateText, "10-20 周二")
var odd = T1 + 433
var d = makeInst(odd)
d.onInit(); d.stopAll(); d.__timers.calls.length = 0
d.scheduleNext()
/* scheduleNext 内部先 tick（会排 45ms 的滚动帧），对齐定时器是最后一个排的 */
eq("对齐定时器延迟 = 1000 - now%1000", d.__timers.calls[d.__timers.calls.length - 1], 1000 - (odd % 1000))

/* 6. 生命周期 */
console.log("\n[6] 生命周期")
var e = makeInst(T1)
e.onInit(); e.onShow(); e.__timers.flush()
truthy("onShow 后 interval 已建", !!e.timer)
e.onHide()
eq("onHide 后 interval 已清", e.timer, undefined)
eq("onHide 后 shown 全部失效", e.shown.join(","), "-1,-1,-1,-1,-1,-1")
e.tick()
eq("再显示后 shown 重新同步（数字带本来就在位，不产生多余写入）",
   e.shown.join(","), "1,2,3,4,5,6")

/* 7. 手势 */
console.log("\n[7] 手势路由")
var f = makeInst(T1)
f.onInit()
f.touchStartY = 300; f.onTouchEnd({ clientY: 260 })
eq("上滑 40px → 风景表盘", f.__router.last, "/pages/watch-face-landscape")
eq("上滑后吞掉点击", f.suppressTap, true)
f.suppressTap = false; f.__router.last = null
f.touchStartY = 300; f.onTouchEnd({ clientY: 340 })
eq("下滑 40px → 动效表盘", f.__router.last, "/pages/watch-face-animated")
f.suppressTap = false; f.__router.last = null
f.touchStartY = 300; f.onTouchEnd({ clientY: 271 })
eq("滑 29px → 不跳转", f.__router.last, null)
f.__router.last = null; f.touchStartY = 0; f.onTap()
eq("单击 → 回目录", f.__router.last, "/pages/watch-face-list")
f.suppressTap = true; f.__router.last = null; f.onTap()
eq("suppressTap 时点击被吞", f.__router.last, null)
eq("吞完复位", f.suppressTap, false)

/* 8. 静态约束 */
console.log("\n[8] 静态约束")
var CODE = SRC.replace(/<!--[\s\S]*?-->/g, "")
var styleBlock = (/<style>([\s\S]*?)<\/style>/.exec(SRC) || [])[1] || ""
var winBlock = (/\.win\s*\{([^}]*)\}/.exec(SRC) || [])[1] || ""
var diBlock = (/\.di\s*\{([^}]*)\}/.exec(SRC) || [])[1] || ""
truthy("不再出现 <scroll（domUpdate 报错那条路）", CODE.indexOf("<scroll") < 0)
truthy("无 scrolltop 绑定", !/scrolltop/.test(CODE))
truthy("无群组选择器", !/^\s*\.[\w-]+\s*,\s*\.[\w-]+\s*\{/m.test(styleBlock))
truthy("无 transform 数据绑定", !/transform\s*:[^;]*\{\{/.test(SRC))
truthy(".win 有 overflow:hidden", /overflow:\s*hidden/.test(winBlock))
truthy(".strip 用 top 数据绑定", /class="strip"\s+style="top:\s*\{\{\s*p\d\s*\}\}px"/.test(SRC))
eq("模板绑满 6 条带", (SRC.match(/\{\{ p[0-5] \}\}/g) || []).length, 6)
eq(".win 高 64px", Number((/height:\s*(\d+)px/.exec(winBlock) || [])[1]), 64)
eq(".di 高 == ITEM_H", Number((/height:\s*(\d+)px/.exec(diBlock) || [])[1]), H)
var diFont = Number((/font-size:\s*(\d+)px/.exec(diBlock) || [])[1])
truthy(".di 字号 ≤34（防溢出卡片）", diFont > 0 && diFont <= 34)
var tops = [], re = /top:\s*(\d+)px/g, mm
while ((mm = re.exec(styleBlock)) !== null) tops.push(Number(mm[1]))
eq("静态 top 全在安全区 [40,450]（" + tops.length + " 处）",
   tops.filter(function(v) { return v < 40 || v > 450 }).join(","), "")

console.log("\n" + "─".repeat(52))
if (fail === 0) { console.log("\x1b[32m全部通过\x1b[0m：" + pass + " 项"); process.exit(0) }
console.log("\x1b[31m失败 " + fail + " 项\x1b[0m，通过 " + pass + " 项"); process.exit(1)
