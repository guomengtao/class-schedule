/**
 * 课程名称管理页（pages/course-manager）单元测试
 *
 * 用法：node test/course-manager.test.js
 *
 * 为什么这么测：
 *   快应用（Vela）没有 JS 测试框架，页面逻辑写在 .ux 的 <script> 里，Node 直接 require 不了。
 *   本脚本把 <script> 抽出来，把快应用专有的 import / require 换成可注入的桩，
 *   用 new Function 求值得到真实的页面对象 —— 测的是**线上那份源码本身**。
 *
 * 覆盖：
 *   A. 按开始时间排序（缺 time 视为 00:00）
 *   B. 改名：成功 / 重名 / 同名三条分支
 *   C. 新增：成功（追加后重排）/ 重名 / 空文本
 *   D. 删除：二次确认 → 真删 → 撤销恢复（按时间重新插入）
 *   E. 清空：二次确认 → 清空
 *   F. onShow 竞态：有 chinese-input 回传结果时不得再 loadCourses（否则旧列表覆盖刚改的名）
 *   G. ev-six 静态自检（字号四档 / 无 toast / 无圆形徽标 / display 绑定 / padding）
 */

"use strict"

var fs = require("fs")
var path = require("path")

var C = {
  reset: "\x1b[0m", bold: "\x1b[1m", green: "\x1b[32m",
  dim: "\x1b[2m", red: "\x1b[31m"
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

var UX_FILE = path.join(__dirname, "../src/pages/course-manager/course-manager.ux")

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
  var fn = new Function("__req", "module", "console", "setTimeout", "clearTimeout", code)
  var module = { exports: {} }
  var quiet = { log: function () {}, error: function () {} }
  // 定时器桩：注册但不自动执行，由用例决定是否 flush（否则 tipVisible 立刻被隐藏）
  var timers = []
  function fakeSetTimeout(fn2, ms) { timers.push({ fn: fn2, ms: ms, dead: false }); return timers.length }
  function fakeClearTimeout(id) { if (timers[id - 1]) timers[id - 1].dead = true }
  fn(req, module, quiet, fakeSetTimeout, fakeClearTimeout)
  module.exports.__timers = timers
  return module.exports
}

// ---------------------------------------------------------------- 依赖桩

function makeEnv() {
  var env = { storage: {}, backs: 0, pushes: [] }

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
        text: "#ffffff", textSecondary: "#888899", textMuted: "#555566",
        deleteBg: "#2a1a3e", deleteText: "#e08080"
      }, "dark")
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
    if (k === "private" || k === "__timers") continue
    if (typeof mod[k] === "function") vm[k] = mod[k].bind(vm)
    else vm[k] = mod[k]
  }
  vm.__timers = mod.__timers
  return vm
}

function courseList(names) {
  var t = ["08:00 - 08:45", "08:55 - 09:40", "10:00 - 10:45", "10:55 - 11:40"]
  return names.map(function (n, i) {
    return { name: n, time: t[i % t.length], teacher: "老师", location: "" }
  })
}

var COURSE_KEY = "course_preset_list"

// ================================================================ A. 排序

section("1. 排序：按开始时间，缺 time 视为 00:00")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req)

  var sorted = vm.sortByTime([
    { name: "晚课", time: "15:00 - 15:45" },
    { name: "早课", time: "08:00 - 08:45" },
    { name: "午课", time: "13:00 - 13:45" }
  ])
  eq("三段按时间升序", sorted.map(function (c) { return c.name }).join(","), "早课,午课,晚课")

  var s2 = vm.sortByTime([{ name: "无时间" }, { name: "有时间", time: "08:00 - 08:45" }])
  eq("缺 time 排最前（当 00:00）", s2[0].name, "无时间")

  ok("空列表原样返回", vm.sortByTime([]).length === 0)
  ok("不改原数组", (function () {
    var origin = [{ name: "B", time: "09:00 - 09:45" }, { name: "A", time: "08:00 - 08:45" }]
    vm.sortByTime(origin)
    return origin[0].name === "B"
  })())
})()

// ================================================================ B. 改名

section("2. 改名：成功 / 重名 / 同名")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { courseList: courseList(["语文", "数学"]) })

  vm.editingIndex = 0
  vm.doRenameCourse("阅读")
  eq("改名成功写入", vm.courseList[0].name, "阅读")
  eq("改名成功提示", vm.tipText, "已改名")
  ok("改名成功提示可见", vm.tipVisible === true)
  ok("改名成功不带撤销按钮", vm.canUndo === false)
  var saved = JSON.parse(env.storage[COURSE_KEY])
  eq("改名已持久化", saved[0].name, "阅读")
  eq("改名后 editingIndex 复位", vm.editingIndex, -1)

  vm.editingIndex = 0
  vm.doRenameCourse("数学")
  eq("重名被拒（名字不变）", vm.courseList[0].name, "阅读")
  eq("重名提示", vm.tipText, "名称已存在")

  vm.courseList = courseList(["语文", "数学"])
  vm.tipText = ""
  vm.editingIndex = 0
  vm.doRenameCourse("语文")
  eq("同名不改不提示", vm.tipText, "")

  vm.editingIndex = 99
  vm.doRenameCourse("越界")
  ok("越界索引安全返回", vm.courseList.length === 2)
})()

// ================================================================ C. 新增

section("3. 新增：成功（追加后重排）/ 重名 / 空文本")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { courseList: courseList(["语文", "数学"]) })

  vm.isAdding = true
  vm.doAddCourse("历史")
  eq("新增追加成功", vm.courseList.length, 3)
  ok("新增项存在", vm.courseList.some(function (c) { return c.name === "历史" }))
  eq("新增提示", vm.tipText, "已添加")
  eq("新增后 isAdding 复位", vm.isAdding, false)
  var added = vm.courseList.filter(function (c) { return c.name === "历史" })[0]
  eq("新增默认时间", added.time, "08:00 - 08:45")
  eq("新增默认老师", added.teacher, "老师")

  vm.isAdding = true
  vm.doAddCourse("语文")
  eq("重名不追加", vm.courseList.length, 3)
  eq("重名提示", vm.tipText, "名称已存在")
  eq("重名后 isAdding 复位", vm.isAdding, false)

  vm.isAdding = true
  vm.doAddCourse("   ")
  eq("空白文本不追加", vm.courseList.length, 3)
  eq("空白文本后 isAdding 复位", vm.isAdding, false)
})()

// ================================================================ D. 删除与撤销

section("4. 删除：二次确认 → 真删 → 撤销恢复")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { courseList: courseList(["语文", "数学", "英语"]) })

  vm.deleteCourse(1)
  eq("首次点击只进确认态", vm.courseList.length, 3)
  eq("确认态索引就位", vm.deleteConfirmIndex, 1)
  eq("首次点击提示", vm.tipText, "再点一次删除")

  vm.deleteCourse(1)
  eq("二次点击真删", vm.courseList.length, 2)
  eq("删掉的是数学", vm.courseList.map(function (c) { return c.name }).join(","), "语文,英语")
  eq("删除提示（3 字，配撤销按钮时不裁）", vm.tipText, "已删除")
  ok("删除提示带撤销按钮", vm.canUndo === true)
  eq("确认态复位", vm.deleteConfirmIndex, -1)
  eq("删除已持久化", JSON.parse(env.storage[COURSE_KEY]).length, 2)

  vm.undoDelete()
  eq("撤销恢复数量", vm.courseList.length, 3)
  ok("撤销恢复内容", vm.courseList.some(function (c) { return c.name === "数学" }))
  eq("撤销后按时间重排", vm.courseList[0].time, "08:00 - 08:45")
  eq("撤销提示", vm.tipText, "已恢复")
  eq("撤销后备份清空", vm.undoBackup, null)
  eq("撤销后已持久化", JSON.parse(env.storage[COURSE_KEY]).length, 3)

  vm.deleteCourse(10)
  ok("越界删除安全返回", vm.courseList.length === 3)
})()

// ================================================================ E. 清空

section("5. 清空：二次确认 → 清空")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { courseList: courseList(["语文", "数学"]) })

  vm.clearAllCourses()
  eq("首次点击不清空", vm.courseList.length, 2)
  eq("首次点击进确认态", vm.clearAllConfirm, true)
  eq("首次点击提示", vm.tipText, "再点清空全部")

  vm.clearAllCourses()
  eq("二次点击清空", vm.courseList.length, 0)
  eq("清空提示", vm.tipText, "已清空")
  eq("清空后确认态复位", vm.clearAllConfirm, false)
  eq("清空已持久化", env.storage[COURSE_KEY], "[]")
})()

// ================================================================ F. onShow 竞态

section("6. onShow 竞态：回传结果时不得再 loadCourses")

;(function () {
  // 有回传结果：应处理改名，且 loadCourses 调用次数为 0
  var env = makeEnv()
  var vm = newInstance(env.__req, { courseList: courseList(["语文"]), editingIndex: 0 })
  env.storage["chinese_input_result"] = "阅读"
  var loadCalls = 0
  vm.loadCourses = function () { loadCalls++ }

  vm.onShow()
  eq("回传结果被处理", vm.courseList[0].name, "阅读")
  eq("loadCourses 未被调用（否则旧列表覆盖）", loadCalls, 0)
  ok("回传键已删除，不会重复生效", env.storage["chinese_input_result"] === undefined)

  // 无回传结果：应正常 loadCourses
  var env2 = makeEnv()
  var vm2 = newInstance(env2.__req, { courseList: [] })
  var loadCalls2 = 0
  vm2.loadCourses = function () { loadCalls2++ }
  vm2.onShow()
  eq("无回传结果时 loadCourses 被调用", loadCalls2, 1)

  // 回传空字符串：视为无结果，仍 loadCourses
  var env3 = makeEnv()
  var vm3 = newInstance(env3.__req, { courseList: [] })
  env3.storage["chinese_input_result"] = ""
  var loadCalls3 = 0
  vm3.loadCourses = function () { loadCalls3++ }
  vm3.onShow()
  eq("空回传仍 loadCourses", loadCalls3, 1)
})()

// ================================================================ G. ev-six 自检

section("7. ev-six 静态自检（14 条中的可自动化部分）")

;(function () {
  var src = readSource()
  var css = src.slice(src.indexOf("<style>"))
  var naked = src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")

  var sizes = (css.match(/font-size:\s*(\d+)px/g) || []).map(function (s) {
    return parseInt(s.replace(/[^\d]/g, ""), 10)
  })
  var bad = sizes.filter(function (v) { return v >= 12 && v <= 23 })
  eq("A. font-size 无 12~23px 禁档", bad.length, 0)
  var allowed = sizes.filter(function (v) { return [24, 28, 30, 44].indexOf(v) < 0 })
  eq("B. font-size 只出现四档值", allowed.length, 0)

  eq("C. 无行内导航箭头 › / →", /[›→]/.test(naked), false)
  eq("D. 无圆形序号徽标 item-index", /item-index/.test(src), false)
  eq("E. 无省略号 / ...", /…|\.\.\./.test(naked), false)
  ok("F. 无 prompt.showToast 调用", !/prompt\.showToast\s*\(/.test(readScript()))

  var ifCount = (src.match(/\sif="\{\{/g) || []).length
  eq("G. 无 if 条件渲染（第 14 条）", ifCount, 0)
  ok("H. 条件显隐改用 display 绑定", (src.match(/display: \{\{/g) || []).length >= 4)

  var pagePad = (css.match(/\.page \{[\s\S]*?padding:\s*([^;]+);/) || [])[1] || ""
  ok("I. 页面左右 padding = 12px", /\s12px\s+60px\s+12px/.test(pagePad), pagePad)

  var itemPad = (css.match(/\.course-item \{[\s\S]*?padding:\s*([^;]+);/) || [])[1] || ""
  ok("J. 卡片左右 padding ≤ 8px", parseInt(itemPad, 10) <= 8, itemPad)

  ok("K. 无分隔点 ·", naked.indexOf("·") < 0)
})()

// ================================================================ 汇总

console.log("\n" + C.bold + "──────────────────────────────" + C.reset)
if (failed === 0) {
  console.log(green("全部通过：") + passed + " 项")
} else {
  console.log(red("失败 " + failed + " 项") + " / 通过 " + passed + " 项")
  failures.forEach(function (f) { console.log("  " + red("·") + " " + f) })
  process.exitCode = 1
}
