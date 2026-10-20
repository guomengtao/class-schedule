/**
 * 时间表盘（watch-face-pickdate）单元测试 —— node test/watch-face-pickdate.test.js
 *
 * 本页是「用官方 picker 当时间表盘」，没有自绘滚动、没有手势代码，
 * 所以测试重点从"动画"转到"结构契约 + 交互边界"：
 *
 *   1) 三列必须是 type="text" 的 picker，range 长度 24/60/60，值是两位字符串；
 *   2) 脏检查：程序每秒只写变化的列（常态只写秒列），不许无条件全写；
 *   3) 走时纪律：整秒对齐 + onHide/onDestroy 双清 + onShow 补对齐；
 *   4) **交互边界（本次踩过的坑）**：页面根节点不得挂 onclick ——
 *      否则鼓区一滑就被当成"返回目录"踢走；返回只留顶部热区；
 *   5) 回流安全：手滑判定用"值没变就忽略"，不残留布尔标记，避免吞掉下一次真手滑；
 *   6) 禁用机制回归：不得出现 <scroll / scrolltop / transform 绑定 / 群组选择器；
 *   7) 排版硬约束：三列 52 + 冒号 12×2 = 180，picker 高 150 才能露出上下邻居。
 */

"use strict"

var fs = require("fs")
var path = require("path")
var UX = path.join(__dirname, "..", "src", "pages", "watch-face-pickdate", "watch-face-pickdate.ux")
var SRC = fs.readFileSync(UX, "utf8")

var pass = 0, fail = 0
function ok(n) { pass++; console.log("  \x1b[32m✓\x1b[0m " + n) }
function bad(n, d) { fail++; console.log("  \x1b[31m✗\x1b[0m " + n + (d ? "\n      \x1b[2m" + d + "\x1b[0m" : "")) }
function eq(n, a, b) { if (a === b) ok(n); else bad(n, "期望 " + JSON.stringify(b) + "，实际 " + JSON.stringify(a)) }
function truthy(n, v) { if (v) ok(n); else bad(n, "期望真值，实际 " + JSON.stringify(v)) }

/* 抽出 <script> 求值，拿到真实的 data 定义 */
var SCRIPT = SRC.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import[\s\S]*?$/gm, "")
  .replace(/export\s+default/, "return")
var MOD = new Function(SCRIPT)()
var D = MOD.data

/* ── 1. 三列 picker 的结构契约 ───────────────────────── */
console.log("\n[1] 三列 picker")
eq("picker 数量 = 3", (SRC.match(/<picker/g) || []).length, 3)
eq("全部是 type=\"text\"", (SRC.match(/type="text"/g) || []).length, 3)
truthy("时列绑 hours", /range="\{\{ hours \}\}"\s+selected="\{\{ hIdx \}\}"/.test(SRC))
truthy("分列绑 mins", /range="\{\{ mins \}\}"\s+selected="\{\{ mIdx \}\}"/.test(SRC))
truthy("秒列绑 secs", /range="\{\{ secs \}\}"\s+selected="\{\{ sIdx \}\}"/.test(SRC))
truthy("三列各有 onchange", (SRC.match(/onchange="on[ HMS]"/g) || []).length === 3)

/* ── 2. range 数据 ──────────────────────────────────── */
console.log("\n[2] range 数据")
eq("hours 24 项", D.hours.length, 24)
eq("mins 60 项", D.mins.length, 60)
eq("secs 60 项", D.secs.length, 60)
eq("hours 首项两位", D.hours[0], "00")
eq("hours 个位补零", D.hours[9], "09")
eq("hours 末项", D.hours[23], "23")
eq("secs 末项", D.secs[59], "59")
eq("初始三列都指向 0", [D.hIdx, D.mIdx, D.sIdx].join(","), "0,0,0")

/* ── 3. 脏检查：只写变化的列 ────────────────────────── */
console.log("\n[3] 脏检查")
truthy("有 shown 脏值基准", /this\.shown\s*=\s*\[-1,\s*-1,\s*-1\]/.test(SRC))
truthy("时列先比后写", /H\s*!==\s*this\.shown\[0\][\s\S]{0,80}this\.hIdx\s*=\s*H/.test(SRC))
truthy("分列先比后写", /M\s*!==\s*this\.shown\[1\][\s\S]{0,80}this\.mIdx\s*=\s*M/.test(SRC))
truthy("秒列先比后写", /S\s*!==\s*this\.shown\[2\][\s\S]{0,80}this\.sIdx\s*=\s*S/.test(SRC))

/* ── 4. 走时纪律 ────────────────────────────────────── */
console.log("\n[4] 走时纪律")
truthy("整秒对齐", /1000\s*-\s*\(new Date\(\)\.getTime\(\)\s*%\s*1000\)/.test(SRC))
truthy("onShow 补对齐", /onShow\(\)\s*\{\s*this\.align\(\)/.test(SRC))
truthy("onHide 清定时器", /onHide\(\)\s*\{\s*this\.stopAll\(\)/.test(SRC))
truthy("onDestroy 清定时器", /onDestroy\(\)\s*\{\s*this\.stopAll\(\)/.test(SRC))
truthy("stopAll 清 interval", /clearInterval\(this\.timer\)/.test(SRC))
truthy("stopAll 清对齐定时器", /clearTimeout\(this\.alignTimer\)/.test(SRC))
truthy("有 3 秒回现在", /3\s*-\s*Math\.floor\(\(now\.getTime\(\)\s*-\s*this\.manualTs\)/.test(SRC))
truthy("空闲提示引导到顶部", /HINT_IDLE\s*=\s*"[^"]*点顶部/.test(SRC))

/* ── 5. 交互边界（本次踩过的坑，必须钉死）─────────────── */
console.log("\n[5] 交互边界")
truthy("页面根节点不挂 onclick（否则滑动被当返回）", SRC.indexOf('<div class="page" onclick') < 0)
truthy("有独立返回热区", /<div class="back" onclick="onTap"><\/div>/.test(SRC))
truthy("返回热区与鼓区分离（高 120，鼓从 150 起）", /\.back\s*\{[\s\S]*?height:\s*120px/.test(SRC))
truthy("鼓区吞点击 stopBubble", /onclick="stopBubble"/.test(SRC))
truthy("onManual 用值比较，不用布尔 suppress",
  /v\s*===\s*this\.shown\[i\]\)\s*return/.test(SRC) && !/this\.suppress\s*=\s*(true|false)/.test(SRC))

/* ── 6. 禁用机制回归 ────────────────────────────────── */
console.log("\n[6] 禁用机制回归")
truthy("不得出现 <scroll", SRC.indexOf("<scroll") < 0)
truthy("不得出现 scrolltop", !/scrolltop/i.test(SRC))
/* 只看用法：注释里写着"禁 transform 数据绑定"，不该被判失败 */
truthy("不得出现 transform 用法", !/transform\s*[:=]/.test(SRC))
truthy("样式里无群组选择器", !/\n\s*\.[a-zA-Z][\w-]*\s*,\s*\.[a-zA-Z]/.test(SRC))
truthy("不得在 picker 上叠 animation", !/\.pick\s*\{[^}]*animation/.test(SRC))

/* ── 7. 排版尺寸 ────────────────────────────────────── */
console.log("\n[7] 排版")
var pickBlock = SRC.match(/\.pick\s*\{([\s\S]*?)\}/)[1]
truthy("列宽 52", /width:\s*52px/.test(pickBlock))
truthy("列高 150（露上下邻居）", /height:\s*150px/.test(pickBlock))
truthy("未选中行压暗", /color:\s*#5a6470/.test(pickBlock))
truthy("选中行高亮", /selected-color:\s*#7ec8e3/.test(pickBlock))
truthy("选中行底色", /selected-background-color:\s*#0f3460/.test(pickBlock))
truthy("三列 + 两冒号 = 180，不超 192",
  52 * 3 + 12 * 2 === 180 && /width:\s*180px/.test(SRC.match(/\.drum\s*\{([\s\S]*?)\}/)[1]))
truthy("鼓窗上下沿存在", /\.edge-t[\s\S]*?\.edge-b/.test(SRC))

/* ── 汇总 ───────────────────────────────────────────── */
console.log("\n" + (fail === 0
  ? "\x1b[32m全部通过：" + pass + " 项\x1b[0m"
  : "\x1b[31m失败 " + fail + " 项\x1b[0m，通过 " + pass + " 项"))
process.exit(fail === 0 ? 0 : 1)
