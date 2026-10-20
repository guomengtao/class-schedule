/**
 * 时间表盘（watch-face-pickdate）单元测试 —— node test/watch-face-pickdate.test.js
 *
 * v2：从「官方 picker」改为「自绘三列鼓轮」，因为 picker 收到 selected 变化是瞬间
 * 定位、没有补间动画（实测 14 帧/1.08s 只有 2 种画面），拿不到用户要的上下滚动。
 * 视觉仍沿用 picker 的基础样式（窗高 150 = 3 行、行高 50、选中行高亮、上下 1px 沿）。
 *
 * 测试重点：
 *   1) 结构契约：3 列 × 9 格数字带，中心格（index 4）是唯一高亮格，不再有 picker；
 *   2) 几何单真源：CELL_H / PAD / N_CELL / BASE_TOP 与 CSS 的 .di/.win 高度一致；
 *   3) 数字带取模：0 上下回绕（00 上面是 59/23），不许出现负数或越界；
 *   4) **真滚动**：一次换数必须产生非 50 整数倍的中间 top —— 这条是"有没有滚动"的钉子；
 *   5) 滚动方向：+1 向上（top 递减），-1 向下（top 递增），落定后 top 归位；
 *   6) 走时纪律：脏检查 + 整秒对齐 + onHide/onDestroy 双清 + onShow 复位；
 *   7) 交互边界：页面根节点不得挂 onclick（鼓区一滑会被踢回目录），返回只留顶部热区；
 *   8) 禁用机制回归：不得出现 <scroll / scrolltop / transform / 群组选择器。
 */

"use strict"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "watch-face-pickdate", "watch-face-pickdate.ux")
var SRC = fs.readFileSync(UX, "utf8")
var STYLE = SRC.match(/<style>([\s\S]*?)<\/style>/)[1]

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

/* 抽出 <script> 求值 */
var SCRIPT = SRC.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import[\s\S]*?$/gm, "")
  .replace(/export\s+default/, "return")
var MOD = new Function(SCRIPT)()
var D = MOD.data

/* 假定时器：由测试手动 flush，保证"中间帧"这类断言可复现 */
var Q = []
var REAL_TO = global.setTimeout
global.setTimeout = function (fn) { Q.push(fn); return Q.length }
function flush() { var n = 0; while (Q.length) { Q.shift()(); if (++n > 200) throw new Error("定时器死循环") } }

/* 造一个实例：把 data 与方法摊到同一对象上 */
function inst() {
  var o = {}
  Object.keys(D).forEach(function (k) { o[k] = D[k] })
  Object.keys(MOD).forEach(function (k) { if (typeof MOD[k] === "function") o[k] = MOD[k] })
  o.val = [-1, -1, -1]
  o.anim = [false, false, false]
  o.tok = [0, 0, 0]
  o.timers = []
  o.touchY = 0
  o.manualTs = 0
  o.__tops = []
  o.__setTop = o.setTop
  o.setTop = function (col, v) { o.__tops.push({ col: col, v: v }); o.__setTop(col, v) }
  return o
}

/* ── 1. 结构契约 ─────────────────────────────────────── */
console.log("\n[1] 结构契约：3 列 × 9 格")
eq("不再有 <picker", (SRC.match(/<picker/g) || []).length, 0)
eq("三个裁切窗口 .win", (SRC.match(/class="win"/g) || []).length, 3)
eq("三条数字带 .strip", (SRC.match(/class="strip"/g) || []).length, 3)
eq("九格静态字 = 8 个 .di + 1 个 .di-c，共 3 列 → 24 个 .di", (SRC.match(/class="di"/g) || []).length, 24)
eq("每列唯一高亮格 .di-c", (SRC.match(/class="di di-c"/g) || []).length, 3)
eq("三个触摸列 .col", (SRC.match(/class="col"/g) || []).length, 3)
eq("top 数据绑定 3 条", (SRC.match(/style="top: \{\{ t\d \}\}px"/g) || []).length, 3)
eq("每个 .win 里恰好 9 个 text", (SRC.match(/<text class="di[^>]*>/g) || []).length, 27)
truthy("高亮格在 index 4：a4/b4/s4 都是 di-c",
  /class="di di-c">\{\{ a4 \}\}/.test(SRC) &&
  /class="di di-c">\{\{ b4 \}\}/.test(SRC) &&
  /class="di di-c">\{\{ s4 \}\}/.test(SRC))

/* ── 2. 几何单真源 ───────────────────────────────────── */
console.log("\n[2] 几何单真源")
truthy("有 CELL_H 常量", /const CELL_H\s*=\s*50/.test(SRC))
truthy("有 PAD 常量 = 4", /const PAD\s*=\s*4/.test(SRC))
truthy("有 N_CELL 常量 = 9", /const N_CELL\s*=\s*9/.test(SRC))
truthy("BASE_TOP 由几何推导，不手写魔数", /const BASE_TOP\s*=\s*50 - CELL_H \* PAD/.test(SRC))
eq("初始 t0/t1/t2 = BASE_TOP", [D.t0, D.t1, D.t2].join(","), "-150,-150,-150")
truthy("CSS .di 高 50 与 CELL_H 一致", /\.di\s*\{[^}]*height:\s*50px/.test(STYLE))
truthy("CSS .win 高 150 = 3 格", /\.win\s*\{[^}]*height:\s*150px/.test(STYLE))
truthy("CSS .strip 初始 top -150 = BASE_TOP", /\.strip\s*\{[^}]*top:\s*-150px/.test(STYLE))
truthy("窗口裁切 overflow: hidden", /\.win\s*\{[^}]*overflow:\s*hidden/.test(STYLE))
truthy("数字带是绝对定位，靠 top 推", /\.strip\s*\{[^}]*position:\s*absolute/.test(STYLE))
truthy("窗口是 relative（给数字带定位上下文）", /\.win\s*\{[^}]*position:\s*relative/.test(STYLE))
truthy(".di 不得自身 absolute（翻页表盘踩过的叠堆坑）", !/\.di\s*\{[^}]*position:\s*absolute/.test(STYLE))
truthy("选中行底衬 .band 落在第 2 格（top 50）", /\.band\s*\{[^}]*top:\s*50px/.test(STYLE))

/* ── 3. 数字带取模 ───────────────────────────────────── */
console.log("\n[3] 数字带取模（0 上下回绕）")
var a = inst()
a.writeCells(2, 7)
eq("秒=07 时带内容 03..11", [a.s0, a.s1, a.s2, a.s3, a.s4, a.s5, a.s6, a.s7, a.s8].join(","), "03,04,05,06,07,08,09,10,11")
a.writeCells(2, 0)
eq("秒=00 时上方回绕到 56..59", [a.s0, a.s1, a.s2, a.s3].join(","), "56,57,58,59")
eq("秒=00 中心格 = 00", a.s4, "00")
a.writeCells(2, 59)
eq("秒=59 时下方回绕到 00..03", [a.s5, a.s6, a.s7, a.s8].join(","), "00,01,02,03")
a.writeCells(1, 0)
eq("分列模 60", a.b0, "56")
a.writeCells(0, 0)
eq("时列模 24", a.a0, "20")
eq("时列中心 = 00", a.a4, "00")
a.writeCells(0, 23)
eq("时=23 时下方回绕到 00", a.a5, "00")
truthy("全部两位补零（无单位数）", !/[^0-9"](5|7)"(,|$)/.test([a.a0, a.a4, a.b0, a.s4].join(",")))

/* ── 4. 真滚动（核心钉子） ───────────────────────────── */
console.log("\n[4] 真滚动：必须有非整格的中间帧")
var b = inst()
b.jumpTo(2, 41)
b.__tops = []
Q = []
b.roll(2, 1)
eq("滚动期间 anim 标记为真", b.anim[2], true)
flush()
eq("落定后 anim 复位", b.anim[2], false)
eq("落定后 top 归位 BASE_TOP", b.t2, -150)
eq("落定后中心格 = 目标值", b.s4, "42")
eq("落定后 val 已推进", b.val[2], 42)
var mids = b.__tops.map(function (x) { return x.v }).filter(function (v) { return v % 50 !== 0 })
truthy("存在非 50 整数倍的中间 top（" + JSON.stringify(b.__tops.map(function (x) { return x.v })) + "）", mids.length > 0)
eq("一次滚动推 5 帧 + 落定归位 1 次", b.__tops.length, 6)
eq("最后一帧是归位 BASE_TOP", b.__tops[5].v, -150)
truthy("+1 是向上滚（top 递减）", b.__tops[0].v < -150)

/* ── 5. 方向与回绕 ───────────────────────────────────── */
console.log("\n[5] 方向与回绕")
var c = inst()
c.jumpTo(2, 59)
c.__tops = []
c.roll(2, 1)
flush()
eq("59 → 00 正向跨零", c.s4, "00")
eq("59 → 00 后带内是 56..59,00..04", [c.s0, c.s8].join(","), "56,04")
var d = inst()
d.jumpTo(2, 0)
d.__tops = []
d.roll(2, -1)
flush()
eq("00 → 59 反向下滚", d.s4, "59")
truthy("-1 是向下滚（top 递增）", d.__tops[0].v > -150)
var e = inst()
e.jumpTo(0, 0)
e.roll(0, -1)
flush()
eq("时列 00 → 23（模 24）", e.a4, "23")

/* ── 6. 动画互斥与令牌 ───────────────────────────────── */
console.log("\n[6] 动画互斥")
var f = inst()
f.jumpTo(2, 10)
Q = []
f.roll(2, 1)
var tokBefore = f.tok[2]
f.roll(2, 1)                       // 动画没落定，第二次应被拒
eq("滚动进行中不接受新滚动（val 只前进 1 格）", f.val[2], 11)
eq("被判拒时令牌不变", f.tok[2], tokBefore)
flush()
eq("落定后 val 仍是 11", f.val[2], 11)
eq("落定后 s4 = 11", f.s4, "11")

/* ── 7. 走时纪律 ─────────────────────────────────────── */
console.log("\n[7] 走时纪律")
truthy("脏检查：值没变就跳过本列", /if \(v\[i\] === this\.val\[i\]\) continue/.test(SRC))
truthy("动画中的列本秒跳过", /if \(this\.anim\[i\]\) continue/.test(SRC))
truthy("跳太多格直接落位不滚", /d > 3\) this\.jumpTo/.test(SRC))
truthy("一次最多滚 3 格（PAD=4 留 1 格余量）", /const PAD\s*=\s*4/.test(SRC))
truthy("整秒对齐再起 interval", /1000 - \(new Date\(\)\.getTime\(\) % 1000\)/.test(SRC))
truthy("onShow 先 realign 再 align", /onShow\(\)[\s\S]{0,80}this\.realign\(\)[\s\S]{0,40}this\.align\(\)/.test(SRC))
truthy("onHide 清理", /onHide\(\)[\s\S]{0,40}this\.stopAll\(\)/.test(SRC))
truthy("onDestroy 清理", /onDestroy\(\)[\s\S]{0,40}this\.stopAll\(\)/.test(SRC))
truthy("stopAll 复位 anim 标志", /this\.anim = \[false, false, false\]/.test(SRC))
truthy("stopAll 作废旧令牌", /this\.tok = \[this\.tok\[0\] \+ 1/.test(SRC))
truthy("3 秒无操作回现在", /3 - Math\.floor/.test(SRC))

/* ── 8. 交互边界 ─────────────────────────────────────── */
console.log("\n[8] 交互边界")
truthy("页面根节点不挂 onclick（本次踩过的钉）", /<div class="page">/.test(SRC) && !/<div class="page"[^>]*onclick/.test(SRC))
truthy("返回走顶部热区", /<div class="back" onclick="onTap"><\/div>/.test(SRC))
truthy("热区高度 120", /\.back\s*\{[^}]*height:\s*120px/.test(STYLE))
truthy("鼓区 top 150 与热区 120 不重叠", /\.drum\s*\{[^}]*top:\s*150px/.test(STYLE))
eq("三列各有 touchstart", (SRC.match(/ontouchstart="tS\d"/g) || []).length, 3)
eq("三列各有 touchend", (SRC.match(/ontouchend="tE\d"/g) || []).length, 3)
truthy("按位移分 1/2/3 格步进", /a >= 70\) n = 3[\s\S]{0,60}a >= 40\) n = 2[\s\S]{0,60}a >= 18\) n = 1/.test(SRC))
truthy("上滑（d>0）是加值", /d > 0 \? n : -n/.test(SRC))
truthy("位移过小当点击不处理", /if \(n === 0\) return/.test(SRC))
var g = inst()
g.jumpTo(2, 20)
g.onDown({ clientY: 100 })
g.onUp(2, { clientY: 100 - 45 })     // 上滑 45px → 2 格
eq("上滑 45px = +2 格", g.val[2], 22)
eq("手滑后进入 browse 态", g.manualTs > 0, true)
var h = inst()
h.jumpTo(2, 20)
h.onDown({ clientY: 100 })
h.onUp(2, { clientY: 100 - 10 })     // 只有 10px，当点击
eq("小位移不改值", h.val[2], 20)
eq("小位移不进 browse 态", h.manualTs, 0)

/* ── 9. 禁用机制回归 ─────────────────────────────────── */
console.log("\n[9] 禁用机制回归")
truthy("不得出现 <scroll（domUpdate 报错的那条路）", SRC.indexOf("<scroll") < 0)
truthy("不得出现 scrolltop", !/scrolltop/.test(SRC))
truthy("不得用 transform 样式（注释里提到不算）", !/[^-]transform\s*:/.test(STYLE))
truthy("禁群组选择器 .a, .b", !/^\s*\.[\w-]+,\s*\./m.test(STYLE))
truthy("禁 <picker（会瞬间定位，没有滚动）", SRC.indexOf("<picker") < 0)

/* ── 10. 排版 ────────────────────────────────────────── */
console.log("\n[10] 排版")
truthy("三列宽 52", /\.col\s*\{[^}]*width:\s*52px/.test(STYLE))
truthy("鼓容器宽 180", /\.drum\s*\{[^}]*width:\s*180px/.test(STYLE))
truthy("鼓容器左起 6，右留 6（6+180=186 ≤ 192）", /\.drum\s*\{[^}]*left:\s*6px/.test(STYLE))
truthy("冒号宽 12", /\.c\s*\{[^}]*width:\s*12px/.test(STYLE))
truthy("字带列向排列", /\.strip\s*\{[^}]*flex-direction:\s*column/.test(STYLE))
truthy("选中格字号大于相邻格（picker 的 selected-font-size 观感）",
  /\.di-c\s*\{[^}]*font-size:\s*28px/.test(STYLE) && /\.di\s*\{[^}]*font-size:\s*24px/.test(STYLE))
truthy("选中格颜色独立", /\.di-c\s*\{[^}]*color:\s*#7ec8e3/.test(STYLE))

global.setTimeout = REAL_TO
console.log("\n" + (fail === 0
  ? "\x1b[32m全部通过：" + pass + " 项\x1b[0m"
  : "\x1b[31m" + fail + " 项失败 / 共 " + (pass + fail) + " 项\x1b[0m"))
process.exit(fail === 0 ? 0 : 1)
