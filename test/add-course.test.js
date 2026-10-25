/**
 * 添加课程页（pages/add-course）单元测试
 *
 * 用法：node test/add-course.test.js
 *
 * 为什么这么测：
 *   快应用（Vela）没有 JS 测试框架，页面逻辑写在 .ux 的 <script> 里，Node 直接 require 不了。
 *   本脚本把 <script> 抽出来，把快应用专有的 import / require 换成可注入的桩，
 *   用 new Function 求值得到真实的页面对象 —— 测的是**线上那份源码本身**。
 *
 * 覆盖：
 *   A. 时间步进（时 ±1 环绕、分 ±5 进位退位、结束不得早于开始）
 *   B. ev-six 第 13 条：校验/冲突/失败走页内状态条，不再用 prompt.showToast
 *   C. 冲突二次确认（第一次提示 + 按钮切「确认」，第二次才写库）
 *   D. 保存成功/失败分支、nextId 自增、返回导航
 *   E. ev-six 静态自检（字号四档 / 无禁用符号 / 无省略号 / 页面 padding / display 绑定）
 */

"use strict"

var fs = require("fs")
var path = require("path")

var C = {
  reset: "\x1b[0m", bold: "\x1b[1m", green: "\x1b[32m",
  yellow: "\x1b[33m", red: "\x1b[31m", dim: "\x1b[2m"
}
function green(s) { return C.green + s + C.reset }
function red(s) { return C.red + s + C.reset }
function dim(s) { return C.dim + s + C.reset }

var passed = 0
var failed = 0
var failures = []

function ok(name, cond, detail) {
  if (cond) { passed++; console.log("  " + green("✓") + " " + name) }
  else {
    failed++
    failures.push(name + (detail ? " — " + detail : ""))
    console.log("  " + red("✗") + " " + name + (detail ? "\n      " + dim(detail) : ""))
  }
}

function eq(name, actual, expected) {
  ok(name, actual === expected, "期望 " + JSON.stringify(expected) + "，实际 " + JSON.stringify(actual))
}

function section(t) { console.log("\n" + C.bold + t + C.reset) }

// ---------------------------------------------------------------- 源码装载

var UX_FILE = path.join(__dirname, "../src/pages/add-course/add-course.ux")

function readSource() {
  return fs.readFileSync(UX_FILE, "utf8")
}

function readScript() {
  var m = readSource().match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("在 " + UX_FILE + " 里找不到 <script> 块")
  return m[1]
    .replace(/^[ \t]*import\s+(\w+)\s+from\s+(["'])([^"']+)\2\s*;?[ \t]*$/gm, 'var $1 = __req($2$3$2)')
    .replace(/require\((["'])([^"']+)\1\)/g, '__req($1$2$1)')
    .replace(/export\s+default\s*/, "module.exports = ")
}

function compile(req) {
  var code = readScript()
  var fn = new Function("__req", "module", "console", "setTimeout", code)
  var module = { exports: {} }
  var quiet = { log: function () {}, error: function () {} }
  fn(req, module, quiet, function (f) { f() })
  return module.exports
}

// ---------------------------------------------------------------- 依赖桩

function makeEnv() {
  var env = {
    storage: {},
    backs: 0,
    pushes: [],
    conflict: null,
    insertErr: null,
    inserted: []
  }

  var storageStub = {
    get: function (o) {
      var v = env.storage[o.key]
      if (v === undefined || v === null || v === "") { o.fail && o.fail(); return }
      o.success && o.success(v)
    },
    set: function (o) { env.storage[o.key] = String(o.value); o.success && o.success() },
    delete: function (o) { delete env.storage[o.key]; o.success && o.success() }
  }

  var storeStub = {
    getTheme: function (cb) {
      cb({
        bg: "#1a1a2e", card: "#16213e", cardLight: "#0f3460", accent: "#7ec8e3",
        text: "#ffffff", textSecondary: "#888899", textMuted: "#555566"
      }, "dark")
    }
  }

  var dbStub = {
    checkDayConflict: function (day, course, exclude, cb) { cb(env.conflict) },
    insertCourse: function (course, cb) {
      env.inserted.push(course)
      cb(env.insertErr)
    }
  }

  env.__req = function (id) {
    if (id === "@system.router") {
      return {
        back: function () { env.backs++ },
        push: function (o) { env.pushes.push(o && o.uri) },
        replace: function (o) { env.pushes.push(o && o.uri) }
      }
    }
    if (id === "@system.storage") return storageStub
    if (id.indexOf("store.js") >= 0) return storeStub
    if (id.indexOf("database.js") >= 0) return dbStub
    throw new Error("未打桩的依赖: " + id)
  }

  return env
}

function newInstance(req, state) {
  var mod = compile(req)
  var vm = {}
  var k
  for (k in mod.private) vm[k] = mod.private[k]
  for (k in (state || {})) vm[k] = state[k]
  for (k in mod) {
    if (k === "private") continue
    if (typeof mod[k] === "function") vm[k] = mod[k].bind(vm)
    else vm[k] = mod[k]
  }
  return vm
}

// ================================================================ A. 时间步进

section("1. 时间步进：小时环绕 + 分钟 ±5 进位/退位")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { startHour: 8, startMin: 0, endHour: 8, endMin: 45 })

  vm.increaseStartHour()
  eq("开始小时 8 → 9", vm.startHour, 9)

  vm.decreaseStartHour()
  eq("开始小时 9 → 8", vm.startHour, 8)

  vm.endHour = 8
  vm.endMin = 45
  vm.increaseStartMin()
  eq("开始分钟 00 +5 → 05", vm.startMin, 5)
  eq("courseTime 同步回写", vm.courseTime, "08:05 - 08:45")

  vm.startMin = 55
  vm.increaseStartMin()
  eq("开始分钟 55 +5 → 进位为 00", vm.startMin, 0)
  eq("进位同时小时 +1", vm.startHour, 9)

  vm.startMin = 2
  vm.decreaseStartMin()
  eq("开始分钟 02 −5 退位为 57", vm.startMin, 57)
  eq("退位同时小时 −1", vm.startHour, 8)

  vm.startHour = 0
  vm.startMin = 1
  vm.decreaseStartMin()
  eq("00:01 −5 → 跨零点到 23:56", pad(vm.startHour) + ":" + pad(vm.startMin), "23:56")

  vm.startHour = 23
  vm.startMin = 58
  vm.increaseStartMin()
  eq("23:58 +5 → 跨零点到 00:03", pad(vm.startHour) + ":" + pad(vm.startMin), "00:03")

  function pad(n) { return n < 10 ? "0" + n : String(n) }
})()

section("2. 结束时间边界：不得早于开始")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { startHour: 8, startMin: 0, endHour: 8, endMin: 45 })

  vm.startHour = 10
  vm.adjustEndTime()
  eq("开始推到 10:00 后结束自动补 45 分钟", vm.courseTime, "10:00 - 10:45")

  var vm2 = newInstance(env.__req, { startHour: 8, startMin: 0, endHour: 9, endMin: 0 })
  vm2.decreaseEndHour()
  eq("结束从 09:00 减到 08:00（等于开始）→ 只补最小 5 分钟", vm2.courseTime, "08:00 - 08:05")

  var vm3 = newInstance(env.__req, { startHour: 8, startMin: 0, endHour: 8, endMin: 10 })
  vm3.decreaseEndMin()
  eq("结束 08:10 −5 → 08:05 合法，不跳变", vm3.courseTime, "08:00 - 08:05")
})()

// ================================================================ B. 页内状态条

section("3. 校验走页内状态条（ev-six 第 13 条：禁 toast）")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { courseName: "", courseTime: "" })

  eq("初始状态条隐藏（tipText 为空）", vm.tipText, "")

  vm.saveCourse()
  eq("未选课程 → 状态条「请选课程」（4 字 @24 = 128px ≤ 168）", vm.tipText, "请选课程")
  eq("未选课程时未写库", env.inserted.length, 0)

  vm.courseName = "数学"
  vm.saveCourse()
  eq("无时间 → 状态条「请设时间」", vm.tipText, "请设时间")
  eq("无时间时未写库", env.inserted.length, 0)

  ok("源码无 prompt.showToast 调用", !/prompt\.showToast\s*\(/.test(readScript()))
})()

// ================================================================ C. 冲突二次确认

section("4. 时间冲突：第一次提示，第二次确认后写库")

;(function () {
  var env = makeEnv()
  env.conflict = { name: "数学", time: "08:00 - 08:45" }
  env.storage["add_course_nextId"] = "105"

  var vm = newInstance(env.__req, {
    courseName: "语文", courseTime: "08:00 - 08:45", day: "星期一", dayIndex: 1, nextId: 105
  })

  vm.saveCourse()
  eq("首次冲突 → 状态条「时间重叠」", vm.tipText, "时间重叠")
  eq("主按钮切为「确认」", vm.saveLabel, "确认")
  eq("首次冲突不写库", env.inserted.length, 0)

  vm.saveCourse()
  eq("第二次点击写库 1 条", env.inserted.length, 1)
  eq("按钮复位为「添加」", vm.saveLabel, "添加")
  eq("nextId 自增 105 → 106", vm.nextId, 106)

  var c = env.inserted[0] || {}
  eq("写入 day", c.day, "星期一")
  eq("写入 name", c.name, "语文")
  eq("写入 time", c.time, "08:00 - 08:45")
  eq("id 取自 nextId", c.id, "105")
  eq("成功后返回上一页", env.backs, 1)
})()

section("5. 保存失败：留在页内并提示，可重试")

;(function () {
  var env = makeEnv()
  env.insertErr = { code: 1 }
  var vm = newInstance(env.__req, {
    courseName: "数学", courseTime: "08:00 - 08:45", day: "星期一", dayIndex: 1, nextId: 100
  })

  vm.saveCourse()
  eq("失败 → 状态条「保存失败」", vm.tipText, "保存失败")
  eq("失败 → isSaving 复位", vm.isSaving, false)
  eq("失败不返回", env.backs, 0)

  env.insertErr = null
  vm.saveCourse()
  eq("重试成功 → 返回", env.backs, 1)
})()

// ================================================================ D. 提示清理

section("6. 有效改动会清掉旧提示与「确认」态")

;(function () {
  var env = makeEnv()
  env.conflict = { name: "数学", time: "08:00 - 08:45" }
  var vm = newInstance(env.__req, {
    courseName: "语文", courseTime: "08:00 - 08:45", day: "星期一", dayIndex: 1
  })

  vm.saveCourse()
  eq("前置：处于冲突提示态", vm.tipText, "时间重叠")

  vm.selectDay(3)
  eq("改星期 → 状态条清空", vm.tipText, "")
  eq("改星期 → 按钮复位", vm.saveLabel, "添加")
  eq("改星期 → 冲突确认标记复位", vm.conflictConfirmed, false)

  vm.tipText = "请选课程"
  vm.increaseStartHour()
  eq("调时间 → 状态条清空", vm.tipText, "")
})()

// ================================================================ E. ev-six 静态自检

section("7. ev-six 静态自检（14 条中的机器可判部分）")

;(function () {
  var src = readSource()
  var css = src.slice(src.indexOf("<style>"))

  var sizes = (css.match(/font-size:\s*(\d+)px/g) || []).map(function (s) {
    return parseInt(s.replace(/\D/g, ""), 10)
  })
  var illegal = sizes.filter(function (n) { return n < 24 || (n > 30 && n !== 44) })
  eq("A. 无 12~23px / 非常规字号（只 24/28/30/44）", illegal.length, 0)

  var legal = sizes.every(function (n) { return n === 24 || n === 28 || n === 30 || n === 44 })
  ok("B. 字号全部落在四档内", legal, JSON.stringify(Array.from(new Set(sizes))))

  // 注释里写「24→34」不算违规，只检查模板与文本节点
  var naked = src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
  eq("C. 无行内导航箭头 › / →", /[›→]/.test(naked), false)
  eq("D. 无省略号 …", src.indexOf("…") >= 0, false)
  eq("E. 无 text-overflow（禁「…」）", src.indexOf("text-overflow") >= 0, false)
  eq("F. 无 if=\"{{ }}\" 条件渲染（会整页白屏）", /\sif="\{\{/.test(src), false)
  ok("G. 状态条用 display 绑定控制显隐", src.indexOf("display: {{ tipText") >= 0)

  var padMatch = css.match(/\.page \{[\s\S]*?padding:\s*([^;]+);/)
  eq("H. 页面左右 padding = 12px（内容宽 168px）", padMatch ? padMatch[1].trim() : "", "32px 12px 16px 12px")

  eq("I. 已删除冗余「管理」按钮", src.indexOf("mgmt-btn") >= 0, false)
  eq("J. header 占位归零会致标题偏心，已恢复", /header-placeholder[^}]*width:\s*0/.test(css), false)
})()

// ---------------------------------------------------------------- 汇总

console.log("\n" + C.bold + "─────────────────────────────────────" + C.reset)
if (failed === 0) {
  console.log(green("全部通过：") + passed + " 项断言")
  process.exit(0)
} else {
  console.log(red("失败 " + failed + " 项") + " / 通过 " + passed + " 项")
  failures.forEach(function (f) { console.log("  " + red("·") + " " + f) })
  process.exit(1)
}
