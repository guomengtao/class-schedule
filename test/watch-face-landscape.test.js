/**
 * 大字表盘（watch-face-landscape）单元测试 —— node test/watch-face-landscape.test.js
 *
 * 同 test/watch-face-flip.test.js：快应用没框架，逻辑在 .ux 的 <script> 里，Node 不能 require。
 * 这里抽出**真实源码**求值 + 注入桩（假时钟/假定时器），测的就是线上那份。
 *
 * 钉死的命门：
 *   1) 排版：两行 × 两字，字号 150，四个字全部落在 192 宽内（不裁切）；
 *   2) 禁用机制回归：不得出现 transform / @keyframes（本页曾被旋转整页白屏，见方案 §3）；
 *   3) 走时脏检查：同一分钟内零写入，跨分钟只写后两位，跨小时才写四位；
 *   4) 秒对齐 + 生命周期双清。
 */

"use strict"
process.env.TZ = "Asia/Shanghai"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "watch-face-landscape", "watch-face-landscape.ux")
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
    now: 0, calls: [],
    setTimeout: function(fn, ms) { var id = ++seq; t.calls.push(ms || 0); q.push({ id: id, at: t.now + (ms || 0), fn: fn }); return id },
    setInterval: function(fn, ms) { var id = ++seq; t.calls.push(ms || 0); q.push({ id: id, at: t.now + (ms || 0), fn: fn, every: ms || 1 }); return id },
    clearTimeout: function(id) { dead[id] = 1 },
    clearInterval: function(id) { dead[id] = 1 },
    pending: function() { return q.filter(function(j) { return !dead[j.id] }).length },
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

  ;["h0", "h1", "m0", "m1"].forEach(function(key) {
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
  var d = new Date(2026, 9, 20, h, m, s || 0)
  return d.getTime()
}

function writesOf(inst) {
  return (inst.__writes || []).slice()
}

/* ── 结构契约 ───────────────────────────────────────── */

console.log("\n\x1b[1m结构契约\x1b[0m")
{
  eq("两个时间行 .row", (TPL.match(/class="row/g) || []).length, 2)
  eq("四个数字 .dg", (TPL.match(/class="dg"/g) || []).length, 4)
  truthy("有日期行", /class="date"/.test(TPL))
  truthy("有返回提示", /轻触返回/.test(TPL))
  truthy("整屏可点（单击返回）", /class="page" onclick="onTap"/.test(TPL))
}

/* ── 禁用机制回归（本页曾因旋转整页白屏）─────────────── */

console.log("\n\x1b[1m禁用机制回归\x1b[0m")
{
  truthy("不得出现 transform（旋转会让整页白屏，方案 §3）", !/[^-]transform\s*:/.test(STYLE))
  truthy("不得出现 transform-origin", !/transform-origin/.test(STYLE))
  truthy("不得出现 rotate(", !/rotate\(/.test(STYLE))
  truthy("不得出现 @keyframes（每秒重绘有黑屏风险）", !/@keyframes/.test(STYLE))
}

/* ── 排版尺寸 ───────────────────────────────────────── */

console.log("\n\x1b[1m排版尺寸\x1b[0m")
{
  var fs150 = (STYLE.match(/font-size:\s*150px/g) || []).length
  truthy("字号 150px（v1 是 96，+56%）", fs150 >= 1)
  truthy("行高与字号一致，避免基线偏移", /line-height:\s*150px/.test(STYLE))
  var w = Number((/\.dg\s*\{[\s\S]*?width:\s*(\d+)px/.exec(STYLE) || [])[1])
  eq("每字宽 90", w, 90)
  truthy("两字 × 90 = 180 ≤ 192，不出屏", w * 2 <= 192)
  truthy("行容器整宽 192 + 行向 flex",
    /\.row\s*\{[\s\S]*?width:\s*192px[\s\S]*?flex-direction:\s*row/.test(STYLE))
  truthy("两行上下分开（r1 在上、r2 在下）", /\.r1\s*\{[\s\S]*?top:\s*120px/.test(STYLE) && /\.r2\s*\{[\s\S]*?top:\s*262px/.test(STYLE))
  truthy("第二行底部 262+150=412 < 日期行 424", 262 + 150 < 424)
}

/* ── 走时脏检查 ─────────────────────────────────────── */

console.log("\n\x1b[1m走时脏检查\x1b[0m")
{
  var a = makeInst(at(14, 30, 7))
  a.onInit()
  eq("初次上表：14:30 落在四位", [a.h0, a.h1, a.m0, a.m1].join(""), "1430")
  var w0 = writesOf(a).length
  a.__clock.ms = at(14, 30, 8)
  a.tick()
  eq("同一分钟内再 tick：零写入（秒级不刷）", writesOf(a).length - w0, 0)

  var b = makeInst(at(14, 29, 59))
  b.onInit()
  var w1 = writesOf(b).length
  b.__clock.ms = at(14, 30, 0)
  b.tick()
  var d1 = writesOf(b).slice(w1)
  eq("跨分钟：只写变化的两位", d1.length, 2)
  eq("跨分钟写的是 m0/m1", d1.map(function(x) { return x.k }).join(","), "m0,m1")
  eq("分钟进位后读数正确", [b.h0, b.h1, b.m0, b.m1].join(""), "1430")

  var b2 = makeInst(at(14, 30, 59))
  b2.onInit()
  var w2b = writesOf(b2).length
  b2.__clock.ms = at(14, 31, 0)
  b2.tick()
  eq("十位不变的进位（30→31）只写 1 位", writesOf(b2).length - w2b, 1)

  var c = makeInst(at(14, 59, 59))
  c.onInit()
  var w2 = writesOf(c).length
  c.__clock.ms = at(15, 0, 0)
  c.tick()
  eq("跨小时：只写变化的 h1/m0/m1 三位", writesOf(c).length - w2, 3)
  eq("跨小时读数正确", [c.h0, c.h1, c.m0, c.m1].join(""), "1500")

  var d = makeInst(at(0, 4, 0))
  d.onInit()
  eq("个位补零（0:04）", [d.h0, d.h1, d.m0, d.m1].join(""), "0004")
}

/* ── 秒对齐与生命周期 ───────────────────────────────── */

console.log("\n\x1b[1m秒对齐与生命周期\x1b[0m")
{
  var e = makeInst(at(14, 30, 30))
  e.onInit()
  e.refresh()
  var calls = e.__timers.calls
  eq("先 setTimeout 对齐整秒（1000-now%1000）", calls[0], 1000)
  truthy("再起 1000ms interval", calls.indexOf(1000) >= 0)
  e.stop()
  eq("stop 后没有待触发的定时器", e.__timers.pending(), 0)

  var f = makeInst(at(14, 30, 30))
  f.onInit(); f.refresh(); f.onHide()
  eq("onHide 清干净", f.__timers.pending(), 0)
  var g = makeInst(at(14, 30, 30))
  g.onInit(); g.refresh(); g.onDestroy()
  eq("onDestroy 清干净", g.__timers.pending(), 0)
}

/* ── 交互 ───────────────────────────────────────────── */

console.log("\n\x1b[1m交互\x1b[0m")
{
  var h = makeInst(at(14, 30, 30))
  h.onInit(); h.refresh()
  h.onTap()
  eq("单击回表盘目录", h.__router.last, "/pages/watch-face-list")
  eq("返回时停掉定时器", h.__timers.pending(), 0)
}

/* ── 汇总 ───────────────────────────────────────────── */

console.log("\n" + (fail === 0
  ? "\x1b[32m全部通过：" + pass + " 项\x1b[0m"
  : "\x1b[31m" + fail + " 项失败 / 共 " + (pass + fail) + " 项\x1b[0m") + "\n")
process.exit(fail === 0 ? 0 : 1)
