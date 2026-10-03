/**
 * 课程表管理页（pages/schedule-manager）单元测试
 *
 * 用法：node test/schedule-manager.test.js
 *
 * 为什么这么测：
 *   快应用（Vela）没有 JS 测试框架，页面逻辑写在 .ux 的 <script> 里，Node 直接 require 不了。
 *   本脚本把 <script> 抽出来，把快应用专有的 import / require 换成可注入的桩，
 *   用 new Function 求值得到真实的页面对象 —— 测的是**线上那份源码本身**，不是复制一份逻辑来测。
 *   外部依赖（router / prompt / storage / store / database）全部打桩，所以这是**纯单元测试**：
 *   不碰 storage、不发网络请求、不改任何业务数据。
 *
 * 覆盖：付费门禁、新增课表、删除（二次确认 + 索引修正）、重命名校验、复制课表、越界守卫。
 */

"use strict"

var fs = require("fs")
var path = require("path")

var C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  dim: "\x1b[2m"
}
function green(s) { return C.green + s + C.reset }
function red(s) { return C.red + s + C.reset }
function bold(s) { return C.bold + s + C.reset }
function dim(s) { return C.dim + s + C.reset }

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

var UX_FILE = path.join(__dirname, "../src/pages/schedule-manager/schedule-manager.ux")

/** 从 .ux 抽出 <script> 并转成可在 Node 里求值的 CommonJS 片段。 */
function readScript() {
  var src = fs.readFileSync(UX_FILE, "utf8")
  var m = src.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error("在 " + UX_FILE + " 里找不到 <script> 块")
  return m[1]
    .replace(/^[ \t]*import\s+(\w+)\s+from\s+(["'])([^"']+)\2\s*;?[ \t]*$/gm, 'var $1 = __req($2$3$2)')
    .replace(/require\((["'])([^"']+)\1\)/g, '__req($1$2$1)')
    .replace(/export\s+default\s*/, "module.exports = ")
}

/**
 * 求值一次源码，返回页面模块对象。
 * 每次都重新编译：__req 是按环境注入的桩，不能跨用例复用同一个闭包。
 */
function compile(req) {
  var code = readScript()
  var fn = new Function("__req", "module", "console", code)
  var module = { exports: {} }
  fn(req, module, { log: function () {}, error: function () {} })
  return module.exports
}

// ---------------------------------------------------------------- 依赖桩

/** 每次 newInstance 都会重建一份，用例之间互不污染。 */
function makeEnv() {
  var env = {
    pushes: [],
    toasts: [],
    pins: [],
    storage: {},
    names: ["默认课表"],
    currentIndex: 0,
    premium: false,
    courses: []
  }

  var storageStub = {
    get: function (o) { o.success(env.storage[o.key]) },
    set: function (o) { env.storage[o.key] = String(o.value); o.success && o.success() },
    delete: function (o) { delete env.storage[o.key]; o.success && o.success() }
  }

  var storeStub = {
    getTheme: function (cb) { cb({ bg: "#000", card: "#111", text: "#fff" }, "dark") },
    getScheduleNames: function (cb) { cb(env.names.slice()) },
    setScheduleNames: function (n, cb) { env.names = n.slice(); cb && cb() },
    getCurrentScheduleIndex: function (cb) { cb(env.currentIndex) },
    setCurrentScheduleIndex: function (i, cb) { env.currentIndex = i; cb && cb() },
    isPremiumUnlocked: function (cb) { cb(env.premium) },
    getHolidayReminderEnabled: function (idx, cb) { cb(false) },
    setHolidayReminderEnabled: function () {}
  }

  var dbStub = {
    getAllCoursesWithIndex: function (idx, cb) { cb(env.courses) },
    setScheduleIndex: function (idx, cb) { cb && cb() },
    deleteScheduleAndShift: function (idx, total, cb) { cb && cb() },
    insertCourse: function (c, cb) { cb(null) }
  }

  env.__req = function (id) {
    if (id === "@system.router") return { push: function (o) { env.pushes.push(o && o.uri) } }
    if (id === "@system.prompt") return { showToast: function (o) { env.toasts.push(o && o.message) } }
    if (id === "@system.storage") return storageStub
    if (id.indexOf("store.js") >= 0) return storeStub
    if (id.indexOf("database.js") >= 0) return dbStub
    if (id.indexOf("pin-helper.js") >= 0) return { pinPage: function (n, u) { env.pins.push(n) } }
    throw new Error("未打桩的依赖: " + id)
  }

  return env
}

/**
 * 造一个页面实例：private 数据 + 所有方法（绑定到实例自身）。
 * state 里的键会覆盖 private 默认值（用来布置前置数据）。
 */
function newInstance(req, state) {
  var mod = compile(req)
  var vm = {}
  var k
  for (k in mod.private) vm[k] = mod.private[k]
  for (k in mod) {
    if (k === "private") continue
    vm[k] = mod[k]
  }
  for (k in (state || {})) vm[k] = state[k]
  for (k in mod) {
    if (k === "private") continue
    vm[k] = mod[k].bind(vm)
  }
  return vm
}

/** 跑完用例后清掉可能悬挂的 5s 二次确认定时器，免得进程空等。 */
function cleanup(vm) {
  if (vm && vm.deleteTimer) { clearTimeout(vm.deleteTimer); vm.deleteTimer = null }
}

// ================================================================ 1. 付费门禁

console.log("")
console.log(bold("1. 付费门禁（checkProAccess / addSchedule / 进页弹窗）"))

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { list: [{ name: "默认课表", courseCount: 3, holidayOn: false }], currentIndex: 0 })

  // 源码里 checkProAccess() 是 `return true` —— 这是已知的付费墙失效。
  // 该断言的目的不是"验证它正确"，而是**把这个事实钉死**：哪天有人改了它，测试会立刻响。
  ok("checkProAccess() 恒为 true（现存行为，付费墙实际失效）", vm.checkProAccess() === true)

  env.premium = false
  vm.addSchedule()
  ok("未解锁时点「新增课程表」→ 弹解锁弹窗", vm.showDialog === true)
  eq("未解锁时不会真的新增（列表长度不变）", vm.list.length, 1)
  eq("未解锁时不会写课表名", env.names.length, 1)

  vm.showDialog = false
  env.premium = true
  vm.addSchedule()
  ok("已解锁时点「新增课程表」→ 不弹窗", vm.showDialog === false)
  eq("已解锁时确实新增了一条", vm.list.length, 2)

  // 进页不再自动弹窗（2026-10-03 移除 onReady/onShow 里的 checkAndShowOverlay）：
  // 弹窗只允许由「点新增」触发（addSchedule），浏览列表不被弹窗糊脸。
  var vm2 = newInstance(env.__req, { list: [], currentIndex: 0 })
  env.premium = false
  ok("checkAndShowOverlay 已删除（不再存在进页弹窗入口）", vm2.checkAndShowOverlay === undefined)
  ok("未解锁用户新建实例后不弹窗（onShow 只刷主题/数据）", vm2.showDialog === false)
})()

// ================================================================ 2. 新增课表

console.log("")
console.log(bold("2. 新增课表（doAddSchedule 命名与初始化）"))

;(function () {
  var env = makeEnv()
  var origRandom = Math.random

  // 把随机数钉死成 0 → 三位后缀恒为 "AAA"，让命名可预测
  Math.random = function () { return 0 }
  try {
    var vm = newInstance(env.__req, { list: [], currentIndex: 0 })
    vm.doAddSchedule()
    eq("新列表长度", vm.list.length, 1)
    var n1 = vm.list[0].name
    ok("新名格式 = 课程表 + 3 位字母数字（实得 " + n1 + "）", /^课程表[A-Za-z0-9]{3}$/.test(n1))
    eq("新名等于固定随机下的预期值", n1, "课程表AAA")
    eq("新课表初始化为空数组", env.storage["allCourses_0"], "[]")
    ok("新增后有 toast 反馈", env.toasts.length > 0)

    // 已有同名 → 100 次尝试全撞 → 走时间戳兜底
    var vm2 = newInstance(env.__req, { list: [{ name: "课程表AAA", courseCount: 0, holidayOn: false }], currentIndex: 0 })
    vm2.doAddSchedule()
    eq("碰撞后仍会新增（列表长度）", vm2.list.length, 2)
    var n2 = vm2.list[1].name
    ok("重名时走时间戳兜底，不会产出同名（实得 " + n2 + "）", n2 !== "课程表AAA" && /^课程表/.test(n2))
    eq("第二条也初始化为空数组", env.storage["allCourses_1"], "[]")
  } finally {
    Math.random = origRandom
  }
})()

// ================================================================ 3. 越界守卫

console.log("")
console.log(bold("3. 越界守卫（列表未就绪 / 索引失效时不崩）"))

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, { list: [{ name: "A", courseCount: 1, holidayOn: false }], currentIndex: 0 })

  vm.openSheet(-1)
  eq("openSheet(-1) 不打开面板", vm.sheetIndex, -1)
  vm.openSheet(1)
  eq("openSheet(越界上标) 不打开面板", vm.sheetIndex, -1)
  vm.openSheet(0)
  eq("openSheet(0) 打开面板", vm.sheetIndex, 0)
  eq("面板标题取列表名", vm.sheetName, "A")
  eq("面板课程数取列表计数", vm.sheetCount, 1)

  vm.sheetIndex = -1
  vm.toggleHolidayReminder()
  ok("sheetIndex 为 -1 时切换假期提醒不崩", vm.sheetIndex === -1)

  vm.sheetIndex = 0
  vm.toggleHolidayReminder()
  eq("正常切换假期提醒", vm.list[0].holidayOn, true)
})()

// ================================================================ 4. 删除课表

console.log("")
console.log(bold("4. 删除课表（二次确认 + 当前索引修正）"))

function delCase(label, list, currentIndex, delIdx, expectNames, expectCurrent) {
  var env = makeEnv()
  env.names = list.slice()
  env.currentIndex = currentIndex
  var vm = newInstance(env.__req, {
    list: list.map(function (n) { return { name: n, courseCount: 0, holidayOn: false } }),
    currentIndex: currentIndex
  })
  vm.deleteSchedule(delIdx)
  var afterFirst = vm.list.length
  vm.deleteSchedule(delIdx) // 第二次点击 = 真删（deleteConfirmIndex 已等于 delIdx）
  cleanup(vm)
  ok(label + "：首次点击不删（进入二次确认）", afterFirst === list.length,
    "首次点击后长度 " + afterFirst + "，原长度 " + list.length)
  eq(label + "：二次点击后剩余列表", vm.list.map(function (x) { return x.name }).join(","), expectNames.join(","))
  eq(label + "：删除后当前索引", vm.currentIndex, expectCurrent)
  cleanup(vm)
}

;(function () {
  var env = makeEnv()

  // 只剩一个时不许删
  var vm = newInstance(env.__req, { list: [{ name: "A", courseCount: 0, holidayOn: false }], currentIndex: 0 })
  vm.deleteSchedule(0)
  cleanup(vm)
  eq("只剩 1 个课表时拒绝删除", vm.list.length, 1)

  // 二次确认状态机
  var vm2 = newInstance(env.__req, {
    list: [{ name: "A", courseCount: 0, holidayOn: false }, { name: "B", courseCount: 0, holidayOn: false }],
    currentIndex: 0
  })
  vm2.deleteSchedule(1)
  eq("首次点击置为待确认", vm2.deleteConfirmIndex, 1)
  eq("首次点击不删除", vm2.list.length, 2)
  vm2.deleteSchedule(1)
  eq("二次点击真删", vm2.list.length, 1)
  eq("删除后待确认位复位", vm2.deleteConfirmIndex, -1)
  cleanup(vm2)

  delCase("删当前", ["A", "B", "C"], 1, 1, ["A", "C"], 0)
  delCase("删当前之前", ["A", "B", "C"], 1, 0, ["B", "C"], 0)
  delCase("删当前之后", ["A", "B", "C"], 1, 2, ["A", "B"], 1)
})()

// ================================================================ 5. 重命名校验

console.log("")
console.log(bold("5. 重命名（finishEdit 的三种拦截）"))

;(function () {
  var env = makeEnv()

  var vm = newInstance(env.__req, {
    list: [{ name: "A", courseCount: 0, holidayOn: false }, { name: "B", courseCount: 0, holidayOn: false }],
    currentIndex: 0,
    editingIndex: 0,
    editName: "   "
  })
  vm.finishEdit()
  eq("空名（纯空格）拒绝改名", vm.list[0].name, "A")

  vm.editName = "B"
  vm.finishEdit()
  eq("与其他课表重名拒绝改名", vm.list[0].name, "A")

  vm.editName = "  新课表  "
  vm.finishEdit()
  eq("合法改名生效（并 trim）", vm.list[0].name, "新课表")
  ok("改名写入了课表名列表", env.names.indexOf("新课表") >= 0)
})()

// ================================================================ 6. 复制课表

console.log("")
console.log(bold("6. 复制课表（副本命名与空数据拦截）"))

;(function () {
  var env = makeEnv()

  // 源课表没数据 → 应拦下
  env.courses = []
  var vm0 = newInstance(env.__req, { list: [{ name: "A", courseCount: 0, holidayOn: false }], currentIndex: 0 })
  vm0.copySchedule(0)
  ok("源课表无数据时提示且拦下", env.toasts.some(function (t) { return /无法复制/.test(t) }))
  eq("无数据时不新增课表", env.names.length, 1)

  // 正常复制
  env.courses = [{ classes: [{ id: "c1", day: 1, name: "语文", time: "08:00", teacher: "", location: "", notes: "" }] }]
  var vm = newInstance(env.__req, { list: [{ name: "A", courseCount: 1, holidayOn: false }], currentIndex: 0 })
  vm.copySchedule(0)
  eq("副本命名 = 原名 + (副本)", env.names[env.names.length - 1], "A (副本)")

  // 已存在同名副本 → 带序号
  var vm2 = newInstance(env.__req, {
    list: [
      { name: "A", courseCount: 1, holidayOn: false },
      { name: "A (副本)", courseCount: 1, holidayOn: false }
    ],
    currentIndex: 0
  })
  vm2.copySchedule(0)
  eq("副本重名时带序号", env.names[env.names.length - 1], "A (副本2)")
})()

// ================================================================ 汇总

console.log("")
console.log(bold("—".repeat(0)) + "结果：" + green(passed + " 通过") + (failed ? "，" + red(failed + " 失败") : ""))
if (failed) {
  console.log("")
  console.log(red("失败用例："))
  failures.forEach(function (f) { console.log("  · " + f) })
  console.log("")
  process.exit(1)
}
console.log("")
process.exit(0)
