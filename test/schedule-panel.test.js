/**
 * 更多首页（目录页 + 多彩课表 + 简易课表）单元测试
 *
 * 用法：node test/schedule-panel.test.js
 *
 * 为什么这么测：同 test/schedule-manager.test.js —— 快应用没框架，逻辑在 .ux 的 <script> 里，
 * Node 不能直接 require。本脚本抽出真实源码求值 + 注入依赖桩，测的是**线上那份源码本身**。
 *
 * 这一组用例是 2026-10-14 三轮重构的回归防线，重点钉死三个真实事故：
 *   1) 目录页链接点不开（P0）：官方 vela-sample 的 manifest 页 key 无 pages/ 前缀，
 *      本项目有前缀，path 漏写前缀就整页链接全死 —— 用例逐条比对 manifest 实际注册项；
 *   2) 课表不看当前方案：简易课表写死 index 0、多彩课表用会被滑动改变的 viewIndex；
 *   3) 分组折叠被带回：目录页只列表 7 条链接，不折叠（用户 10-14 明确要去掉）。
 */

"use strict"

var fs = require("fs")
var path = require("path")

var C = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m"
}
function green(s) { return C.green + s + C.reset }
function red(s) { return C.red + s + C.reset }
function cyan(s) { return C.cyan + s + C.reset }
function dim(s) { return C.dim + s + C.reset }
function bold(s) { return C.bold + s + C.reset }

var passed = 0
var failed = 0
var failures = []

function ok(name, cond, detail) {
  if (cond) {
    passed++
    console.log("  " + green("✓") + " " + name)
  } else {
    failed++
    failures.push(name + (detail ? " — " + detail : ""))
    console.log("  " + red("✗") + " " + name + (detail ? "\n      " + dim(detail) : ""))
  }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, "期望 " + JSON.stringify(expected) + "，实际 " + JSON.stringify(actual))
}

// ---------------------------------------------------------------- 源码装载

var PAGES = {
  panel: {
    file: "../src/pages/schedule-panel/schedule-panel.ux",
    data: "../src/pages/schedule-panel/data.js"
  },
  colorful: { file: "../src/pages/schedule-panel-colorful/schedule-panel-colorful.ux" },
  simple: { file: "../src/pages/schedule-panel-simple/schedule-panel-simple.ux" }
}

function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, rel), "utf8")
}

/** 从 .ux 抽出 <script> 并转成可在 Node 里求值的片段（沿用既有 harness 写法）。 */
function readScript(rel) {
  var src = readFile(rel)
  var m = src.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("找不到 <script> 块：" + rel)
  return m[1]
    .replace(/^[ \t]*import\s+(\w+)\s+from\s+(["'])([^"']+)\2\s*;?[ \t]*$/gm, 'var $1 = __req($2$3$2)')
    .replace(/^[ \t]*import\s*\{\s*(\w+)\s*\}\s*from\s+(["'])([^"']+)\2\s*;?[ \t]*$/gm, 'var $1 = __req($2$3$2)')
    .replace(/require\((["'])([^"']+)\1\)/g, "__req($1$2$1)")
    .replace(/export\s+default\s*/, "module.exports = ")
}

/** data.js 是 ESM export const，转成 CommonJS 求值拿到 tabsData。 */
function loadTabsData(rel) {
  var code = readFile(rel).replace(/export\s+const\s+(\w+)/g, "var $1")
  var fn = new Function(code + "; return " + code.match(/var\s+(\w+)/)[1] + ";")
  return fn()
}

/** 求值源码 → 页面对象（private 展平为实例属性，方法 bind 到实例，等价框架行为）。 */
function newInstance(pageKey, req) {
  var code = readScript(PAGES[pageKey].file)
  var fn = new Function("__req", "module", "console", code)
  var module = { exports: {} }
  fn(req, module, { log: function () {}, error: function () {} })
  var mod = module.exports
  var inst = {}
  Object.keys(mod.private || {}).forEach(function (k) { inst[k] = mod.private[k] })
  Object.keys(mod).forEach(function (k) {
    if (k === "private") return
    inst[k] = function () { return mod[k].apply(inst, arguments) }
  })
  return inst
}

// ---------------------------------------------------------------- 依赖桩

function makeEnv(opts) {
  opts = opts || {}
  var env = {
    pushes: [],
    backs: 0,
    courses: opts.courses || [],
    calls: [] // 记录 database 被调了哪些方法，用于断言"走当前方案"
  }
  var req = function (id) {
    if (id === "@system.router") {
      return {
        push: function (o) { env.pushes.push(o.uri) },
        back: function () { env.backs++ }
      }
    }
    if (id === "@system.app") return { terminate: function () {} }
    if (id === "@system.device") {
      return {
        getInfo: function (o) {
          o.success && o.success({ screenShape: opts.pill ? "pill-shaped" : "rect" })
        }
      }
    }
    // 2026-10-20：多彩课表改吃共享固定配色表 src/data/subject-color.js，
    // 旧桩把 *.js 一律返回 null → render 调 getSubjectColor 直接炸。此处给真模块。
    if (id.indexOf("subject-color.js") >= 0) return require("../src/data/subject-color.js")
    if (id.indexOf("data.js") >= 0) return null
    // store 桩：简易课表 onInit 调 store.getTheme(cb)（真实签名见 src/data/store.js:287，
    // 回调 (theme, themeName)，此处镜像 THEMES.blue 真实色值）。
    // 2026-10-19 修存量坏账：目录页 183 行崩溃修好后暴露出此桩缺失——修复前整组套件
    // 从未跑完过（必崩于第 3 节简易课表 onInit）。
    if (id.indexOf("store.js") >= 0) {
      return {
        getTheme: function (cb) {
          cb({
            bg: "#1a1a2e", card: "#16213e", cardLight: "#0f3460", accent: "#7ec8e3",
            text: "#ffffff", textSecondary: "#888899", textMuted: "#555566",
            border: "#0f3460", borderLight: "#2a2a5a"
          }, "blue")
        }
      }
    }
    // database 桩：init（开库）+ 两个读接口的访问记录 + 当前方案返回。
    // init 2026-10-19 补：简易课表 loadData 先 database.init(cb) 再 getAllCourses(cb)，
    // 与 store.getTheme 同属第三处存量坏账（套件修复前从未跑完过第 3 节）。
    return {
      init: function (cb) { cb && cb() },
      getAllCourses: function (cb) {
        env.calls.push("getAllCourses")
        cb(env.courses)
      },
      getAllCoursesWithIndex: function (i, cb) {
        env.calls.push("getAllCoursesWithIndex:" + i)
        cb(env.courses)
      }
    }
  }
  return { env: env, req: req }
}

/** mock 课程数据（结构与 database.getAllCoursesWithIndex 返回一致） */
var MOCK_SCHEDULE = [
  { day: "星期一", classes: [{ name: "数学", time: "08:00", id: 1 }, { name: "语文课", time: "10:00", id: 2 }] },
  { day: "星期三", classes: [{ name: "英语", time: "14:00", id: 3 }] },
  { day: "星期六", classes: [{ name: "体育", time: "16:00", id: 4 }] }
]

// ================================================================ 1. 目录页

console.log("")
console.log(bold("1. 目录页 schedule-panel —— 路由可达性（P0 防线）"))

var manifest = JSON.parse(readFile("../src/manifest.json"))
var manifestPages = Object.keys((manifest.router && manifest.router.pages) || manifest.pages || {})
var tabsData = loadTabsData(PAGES.panel.data)
var entries = tabsData[0].groupList[0].caseList

ok("data.js 载入成功且只有一章一组", tabsData.length === 1 && tabsData[0].groupList.length === 1)
eq("8 个栏目入口", entries.length, 8)

var badPrefix = entries.filter(function (e) { return e.path.indexOf("/pages/") !== 0 })
ok("所有 path 都带 /pages/ 前缀（官方 demo 页 key 无此前缀，漏写则链接全死）",
  badPrefix.length === 0,
  badPrefix.length ? "缺前缀：" + badPrefix.map(function (e) { return e.path }).join(", ") : "")

var notInManifest = entries.filter(function (e) {
  var key = e.path.replace(/^\//, "")
  return manifestPages.indexOf(key) < 0
})
ok("所有 path 都在 manifest.json 注册（逐条比对实际注册项）",
  notInManifest.length === 0,
  notInManifest.length ? "未注册：" + notInManifest.map(function (e) { return e.path }).join(", ") : "")

var panelEnv = makeEnv()
var panel = newInstance("panel", function (id) {
  if (id === "@system.router") return panelEnv.req("@system.router")
  if (id.indexOf("data.js") >= 0) return tabsData
  return {}
})
eq("目录页名称为「更多首页」", tabsData[0].name, "更多首页")

var firstUri = entries[0].path
panel.route(firstUri)
eq("route() 原样 push 传入 uri（官方实现未改）", panelEnv.env.pushes[0], firstUri)

entries.forEach(function (e, i) {
  panel.route(e.path)
  if (panelEnv.env.pushes[i + 1] !== e.path) {
    ok("栏目「" + e.name + "」路由可达", false, e.path)
  } else {
    ok("栏目「" + e.name + "」→ " + dim(e.path), true)
  }
})

panel.goBack()
eq("顶部返回按钮调 router.back()", panelEnv.env.backs, 1)

var panelSrc = readFile(PAGES.panel.file)
ok("已无折叠状态 expandedGroups（接口列表 = 直接链接，不再要点一下展开）",
  panelSrc.indexOf("expandedGroups") < 0)
ok("已无折叠开关 toggleGroup", panelSrc.indexOf("toggleGroup") < 0)
// 2026-10-19：原断言钉 @media (shape: pill-shaped)，但 2026-10-17 UI 整理
// （evtask-D-evclass-sche-261017-3gkyrk）已将其换成 @media (width >= 360/480) 宽屏断点，
// 旧断言随实现更新（不改源码——那是别人的有意重构）。
ok("宽屏断点适配保留（@media width >= 360 / 480）",
  panelSrc.indexOf("@media (width >= 360)") >= 0 && panelSrc.indexOf("@media (width >= 480)") >= 0)
ok("header 标题渲染为「更多首页」", panelSrc.indexOf(">更多首页</text>") >= 0)
ok("header 下方有定位说明文案（含「默认首页不受影响」）", panelSrc.indexOf("默认首页不受影响") >= 0)

// ================================================================ 2. 多彩课表（7天×5节固定网格）

console.log("")
console.log(bold("2. 多彩课表 schedule-panel-colorful —— 固定网格 + 箭头切天（P0/P1/P2）"))

var colorEnv = makeEnv({ courses: MOCK_SCHEDULE, pill: false })
var colorful = newInstance("colorful", colorEnv.req)
colorful.onInit()

ok("数据源走 getAllCourses（当前方案），不用可被滑动改变的 viewIndex",
  colorEnv.env.calls.indexOf("getAllCourses") >= 0 &&
  colorEnv.env.calls.filter(function (c) { return c.indexOf("getAllCoursesWithIndex") === 0 }).length === 0,
  "实际调用：" + JSON.stringify(colorEnv.env.calls))

// ── P0：固定 3 列 × 5 行网格（不再滚动、不再单日卡片）──
colorful.dayCursor = 1
colorful.render()
ok("切到星期一后 hasCourses=true", colorful.hasCourses === true)
eq("星期条 7 格", colorful.weekCells.length, 7)
eq("网格 5 行 × 3 列", colorful.gridCells.length, 5)
eq("星期一 2 门课 → 2 个非空格", colorful.gridCells.reduce(function (n, r) { return n + r.filter(Boolean).length }, 0), 2)
eq("格子课名不压缩", colorful.gridCells[0][0].name, "数学")
ok("每格带 color（共享固定表 subject-color.js）", colorful.gridCells[0][0].color === "#3498db", colorful.gridCells[0][0].color)
eq("格子带 startMin/endMin（当前时段判定用）", typeof colorful.gridCells[0][0].startMin, "number")

// ── P1：切天改箭头，touch 手势必须移除（drag 会被本引擎误判成点击 → 跳页）──
for (var i = 0; i < 10; i++) colorful.nextDay()
eq("nextDay 到 6 不越界", colorful.dayCursor, 6)
for (var j = 0; j < 10; j++) colorful.prevDay()
eq("prevDay 到 0 不越界", colorful.dayCursor, 0)
eq("当前日高亮唯一", colorful.weekCells.filter(function (w) { return w.current }).length, 1)

// ── 空态：不写死索引（机器日期正好是那天时会走「今天」分支，本用例踩过）──
var TODAY_IDX = new Date().getDay()
var WEEK_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var EMPTY_IDX = [0, 2, 4, 5].filter(function (d) { return d !== TODAY_IDX })[0]
colorful.dayCursor = EMPTY_IDX
colorful.render()
ok("切到无课天 hasCourses=false（触发空态）", colorful.hasCourses === false)
var SHORT_NAMES = ["日", "一", "二", "三", "四", "五", "六"]
ok("空态文案含短星期名", colorful.emptyHint.indexOf("周" + SHORT_NAMES[EMPTY_IDX]) >= 0, colorful.emptyHint)

// ── P2 溢出计数 ──
var colorEnv4 = makeEnv({ courses: [{ day: "星期一", classes: (function () {
  var a = []
  for (var k = 0; k < 16; k++) a.push({ name: "科" + k, time: "08:00", id: k })
  return a
})() }] })
var colorful4 = newInstance("colorful", colorEnv4.req)
colorful4.onInit()
colorful4.dayCursor = 1; colorful4.render()
eq("16 节只显示 15 格（3×5）", colorful4.gridCells.reduce(function (n, r) { return n + r.filter(Boolean).length }, 0), 15)
eq("totalCount 记真实节数", colorful4.totalCount, 16)

// 剥掉 HTML 注释后再做「标签/指令级」判定：注释里出现「<scroll>」「@swipe」字样是说明文字，不算实现
var colorSrc = readFile(PAGES.colorful.file).replace(/<!--[\s\S]*?-->/g, "")
ok("**已无 @swipe 指令**（P1：touch 手势移除，改箭头切天）", !/@swipe\s*=/.test(colorSrc))
ok("**已无 <scroll> 标签**（固定网格不滚动）", !/<scroll[\s>]/.test(colorSrc))
ok("箭头切天入口在位（prevDay/nextDay + .arrow-btn）",
  colorSrc.indexOf("prevDay") > 0 && colorSrc.indexOf("nextDay") > 0 && colorSrc.indexOf("arrow-btn") > 0)
ok("配色走共享固定表（require subject-color.js + 调 getSubjectColor）",
  colorSrc.indexOf("subject-color.js") > 0 && colorSrc.indexOf("getSubjectColor(") > 0)

// ================================================================ 3. 简易课表

console.log("")
console.log(bold("3. 简易课表 schedule-panel-simple —— 今日 5 行极简视图"))

var simpleEnv = makeEnv({ courses: MOCK_SCHEDULE })
var simple = newInstance("simple", simpleEnv.req)
simple.onInit()

ok("数据源走当前方案，不再写死 index 0",
  simpleEnv.env.calls.indexOf("getAllCourses") >= 0 &&
  simpleEnv.env.calls.filter(function (c) { return c.indexOf("getAllCoursesWithIndex") === 0 }).length === 0,
  "实际调用：" + JSON.stringify(simpleEnv.env.calls))

// 2026-10-20：简易课表已从「7 天分组 daySections + scroll」重构为
// 「今日 5 行固定视图 + 三色状态点」。结构/字号/状态点/分钟定时器/边界态的逐条断言
// 都在专项单测 test/schedule-panel-simple.test.js（含假时钟，确定性）。
// 本聚合套件只保留不依赖真实时钟的源码契约，避免每周换天就红（纪律 #4）。
var simpleSrc = readFile(PAGES.simple.file)
var simpleCode = simpleSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
ok("已移除 7 天分组模型（无 daySections）", simpleSrc.indexOf("daySections") < 0)
ok("今日 5 行固定布局：无 <scroll>", simpleSrc.indexOf("<scroll") < 0)
ok("含今日标题与三色状态点", simpleSrc.indexOf("today-title") > 0 && simpleSrc.indexOf('class="dot"') > 0)
ok("分钟级刷新：无 setInterval，有 scheduleNextMinute",
  simpleCode.indexOf("setInterval") < 0 && simpleCode.indexOf("scheduleNextMinute") > 0)
ok("今日课程模型：todayClasses（不再按天分组）", simpleSrc.indexOf("todayClasses") > 0)

// ================================================================ 结果

console.log("")
console.log(bold("结果：") + green(passed + " 通过") + (failed ? "，" + red(failed + " 失败") : ""))
if (failed) {
  console.log("")
  console.log(red("失败用例："))
  failures.forEach(function (f) { console.log("  · " + f) })
  console.log("")
  process.exit(1)
}
console.log("")
process.exit(0)
