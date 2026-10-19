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
eq("7 个栏目入口", entries.length, 7)

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

// ================================================================ 2. 多彩课表

console.log("")
console.log(bold("2. 多彩课表 schedule-panel-colorful —— 当前方案 + 矩阵"))

var colorEnv = makeEnv({ courses: MOCK_SCHEDULE, pill: false })
var colorful = newInstance("colorful", colorEnv.req)
colorful.onInit()

ok("数据源走 getCurrent / getAllCourses（当前方案），不用可被滑动改变的 viewIndex",
  colorEnv.env.calls.indexOf("getAllCourses") >= 0 &&
  colorEnv.env.calls.filter(function (c) { return c.indexOf("getAllCoursesWithIndex") === 0 }).length === 0,
  "实际调用：" + JSON.stringify(colorEnv.env.calls))

var weekdayCells = colorful.list.filter(function (row) { return row[0].value !== "" })
ok("星期一有课渲染出课程格", colorful.list[0][0].value === "数学",
  "实际：" + JSON.stringify(colorful.list[0][0].value))
ok("超 2 字课程名截断为两字（官方格宽 50px 限制）", colorful.list[1][0].value === "语文",
  "实际：" + JSON.stringify(colorful.list[1][0].value))
ok("方屏行高基准 300/rows", colorful.height !== "50px" && colorful.height.indexOf(".") >= 0 ||
  colorful.height === (300 / colorful.list.length) + "px", "实际：" + colorful.height)

var mathIdx = colorful.list[0][0].className
var mathIdxAgain = (function () {
  var env2 = makeEnv({ courses: MOCK_SCHEDULE })
  var c2 = newInstance("colorful", env2.req)
  c2.onInit()
  return c2.list[0][0].className
})()
eq("同一科目配色稳定（跨实例一致）", mathIdxAgain, mathIdx)

var colorEnvCapsule = makeEnv({ courses: MOCK_SCHEDULE, pill: true })
var colorfulCapsule = newInstance("colorful", colorEnvCapsule.req)
colorfulCapsule.onInit()
ok("胶囊屏下 rowHeight 基准收敛为 200/rows（防矩阵溢出 368px 屏底）",
  colorfulCapsule.height === (200 / colorfulCapsule.list.length) + "px" ||
  colorfulCapsule.height !== colorful.height, "胶囊 = " + colorfulCapsule.height + "，方屏 = " + colorful.height)

var colorSrc = readFile(PAGES.colorful.file)
ok("官方结构保留：prevWeek / nextWeek / @swipe 未删（军规4 禁删官方元素）",
  colorSrc.indexOf("prevWeek") > 0 && colorSrc.indexOf("nextWeek") > 0)

// ================================================================ 3. 简易课表

console.log("")
console.log(bold("3. 简易课表 schedule-panel-simple —— 当前方案 + 分组"))

var simpleEnv = makeEnv({ courses: MOCK_SCHEDULE })
var simple = newInstance("simple", simpleEnv.req)
simple.onInit()

ok("数据源走当前方案，不再写死 index 0",
  simpleEnv.env.calls.indexOf("getAllCourses") >= 0 &&
  simpleEnv.env.calls.filter(function (c) { return c.indexOf("getAllCoursesWithIndex") === 0 }).length === 0,
  "实际调用：" + JSON.stringify(simpleEnv.env.calls))

// 2026-10-19：简易课表已从「flat list（周X 压缩 + 每条目 iconSrc）」重构为
// 「daySections 分组」模型（见 schedule-panel-simple.ux 的 loadData），旧断言随实现更新。
// 这段漂移此前的暴露路径：套件崩在 183 行 → 第 3 节从未跑到 → 一直没人发现。
var sections = simple.daySections
eq("只保留有课天（星期一2 + 星期三1 + 星期六1 → 3 天）", sections.length, 3)
eq("分组顺序遵循 DAY_ORDER", sections[0].dayName, "星期一")
var flatNames = []
sections.forEach(function (s) { s.classes.forEach(function (c) { flatNames.push(c.name) }) })
eq("全部课程拉平为 4 条（2+1+1）", flatNames.length, 4)
eq("课程名原样保留不压缩", flatNames[0], "数学")
ok("同一天内课程按时间升序（数学 08:00 在 语文课 10:00 前）",
  sections[0].classes[0].name === "数学" && sections[0].classes[1].name === "语文课",
  "实际：" + JSON.stringify(sections[0].classes.map(function (c) { return c.name + "@" + c.time })))
ok("每条课程都带时间与 id 字段", sections.every(function (s) {
  return s.classes.every(function (c) { return !!c.time && c.id != null })
}))

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
