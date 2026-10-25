/**
 * 备份恢复页（pages/backup-restore）单元测试
 *
 * 用法：node test/backup-restore.test.js
 *
 * 为什么这么测：
 *   快应用（Vela）没有 JS 测试框架，页面逻辑写在 .ux 的 <script> 里，Node 直接 require 不了。
 *   本脚本把 <script> 抽出来，把快应用专有的 import / require 换成可注入的桩，
 *   用 new Function 求值得到真实的页面对象 —— 测的是**线上那份源码本身**，不是复制一份逻辑来测。
 *
 * 覆盖：标准版备份门禁（不写数据 + 弹升级引导）、高级版正常备份、已有备份的删除/恢复不受限、
 *       返回导航、升级弹窗文案与重试路径。
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

var UX_FILE = path.join(__dirname, "../src/pages/backup-restore/backup-restore.ux")

function readScript() {
  var src = fs.readFileSync(UX_FILE, "utf8")
  var m = src.match(/<script>([\s\S]*?)<\/script>/)
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
    pushes: [],
    backs: 0,
    premium: false,
    unlockCalls: [],
    unlockReturn: true,
    timers: []
  }

  var storageStub = {
    get: function (o) {
      var v = env.storage[o.key]
      if (v === undefined) { o.fail && o.fail(); return }
      o.success && o.success(v)
    },
    set: function (o) { env.storage[o.key] = String(o.value); o.success && o.success() },
    delete: function (o) { delete env.storage[o.key]; o.success && o.success() }
  }

  var storeStub = {
    DEFAULT_THEME: { bg: "#000", card: "#111", text: "#fff", textSecondary: "#999", textMuted: "#666", accent: "#7ec8e3", cardLight: "#222", deleteText: "#f66" },
    getTheme: function (cb) { cb(storeStub.DEFAULT_THEME, "dark") },
    isPremiumUnlocked: function (cb) { cb(env.premium) },
    showUnlockDialog: function (opts) {
      env.unlockCalls.push(opts)
      return env.unlockReturn
    }
  }

  var dbStub = { init: function (cb) { cb && cb() }, resetCache: function () {} }

  env.__req = function (id) {
    if (id === "@system.router") {
      return {
        back: function () { env.backs++ },
        push: function (o) { env.pushes.push(o && o.uri) }
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
    vm[k] = mod[k].bind(vm)
  }
  return vm
}

// ---------------------------------------------------------------- 用例

section("1. 标准版：添加新备份被拦下并弹升级引导")

;(function () {
  var env = makeEnv()
  env.premium = false
  // 预置一门课程，确认「被拦下后未写入任何备份」
  env.storage["allCourses_0"] = JSON.stringify([
    { classes: [{ name: "数学" }, { name: "语文" }] },
    { classes: [{ name: "英语" }] }
  ])
  env.storage["scheduleNames"] = JSON.stringify(["默认课表"])

  var vm = newInstance(env.__req, {})
  vm.createBackup()

  eq("未写入 backup_list（不产生备份）", env.storage["backup_list"], undefined)
  eq("弹出升级弹窗 1 次", env.unlockCalls.length, 1)

  var opts = env.unlockCalls[0] || {}
  eq("弹窗标题（4 字，192px 不裁切）", opts.title, "解锁备份")
  ok("弹窗描述点明是高级版功能", String(opts.description).indexOf("高级版") >= 0, String(opts.description))
  ok("benefits 含 4 条卖点", Array.isArray(opts.benefits) && opts.benefits.length === 4, JSON.stringify(opts.benefits))
  eq("取消按钮文案（不逼迫）", opts.cancelText, "继续使用标准版")
})()

section("2. 高级版：添加新备份正常写入")

;(function () {
  var env = makeEnv()
  env.premium = true
  env.storage["allCourses_0"] = JSON.stringify([
    { classes: [{ name: "数学" }, { name: "语文" }] },
    { classes: [{ name: "英语" }] }
  ])
  env.storage["scheduleNames"] = JSON.stringify(["默认课表"])

  var vm = newInstance(env.__req, {})
  vm.createBackup()

  var raw = env.storage["backup_list"]
  ok("已写入 backup_list", !!raw, String(raw))
  var list = JSON.parse(raw || "[]")
  eq("生成 1 条备份", list.length, 1)
  eq("统计课程数 = 3", list[0].courseCount, 3)
  eq("统计课表数 = 1", list[0].scheduleCount, 1)
  ok("备份名含时间戳", String(list[0].name).indexOf("备份 ") === 0, list[0].name)
  eq("高级版不弹升级弹窗", env.unlockCalls.length, 0)
  ok("给出成功提示", String(vm.resultMessage).indexOf("备份成功") >= 0, vm.resultMessage)
})()

section("3. 标准版：已有备份的删除 / 恢复不受限")

;(function () {
  var env = makeEnv()
  env.premium = false
  var list = [
    { id: 1, name: "备份 A", courseCount: 2, scheduleCount: 1, data: { allCourses_0: JSON.stringify([{ classes: [{ name: "数学" }] }]) } }
  ]
  env.storage["backup_list"] = JSON.stringify(list)

  var vm = newInstance(env.__req, { backupList: list.slice() })
  vm.confirmDeleteBackup(0)
  eq("删除弹窗以确认态打开", vm.showDialog, true)
  eq("dialogType=delete", vm.dialogType, "delete")
  vm.dialogAction()

  var after = JSON.parse(env.storage["backup_list"] || "[]")
  eq("删除生效（标准版不被拦）", after.length, 0)
  eq("删除过程未弹升级引导", env.unlockCalls.length, 0)
})()

;(function () {
  var env = makeEnv()
  env.premium = false
  var list = [
    { id: 1, name: "备份 A", courseCount: 1, scheduleCount: 1, data: { "allCourses_0": "[]" } }
  ]
  env.storage["backup_list"] = JSON.stringify(list)

  var vm = newInstance(env.__req, { backupList: list.slice() })
  vm.confirmRestoreBackup(0)
  eq("恢复弹窗以确认态打开", vm.showDialog, true)
  eq("dialogType=restore", vm.dialogType, "restore")
  vm.dialogAction()
  ok("恢复写入 storage（标准版不被拦）", env.storage["allCourses_0"] === "[]", String(env.storage["allCourses_0"]))
  eq("恢复过程未弹升级引导", env.unlockCalls.length, 0)
})()

section("4. 返回按钮与边界守卫")

;(function () {
  var env = makeEnv()
  var vm = newInstance(env.__req, {})
  vm.goBack()
  eq("goBack 调用 router.back", env.backs, 1)

  // 越界删除：索引非法时应静默关闭弹窗，不抛错、不写数据
  var vm2 = newInstance(env.__req, { backupList: [], deleteIndex: -1 })
  env.storage["backup_list"] = "[]"
  vm2.deleteBackup()
  eq("越界删除静默关闭弹窗", vm2.showDialog, false)
})()

section("5. 弹窗组件未就绪时的重试路径")

;(function () {
  var env = makeEnv()
  env.premium = false
  env.unlockReturn = false   // 模拟 _unlockDialogRef 尚未注册

  var vm = newInstance(env.__req, {})
  vm.createBackup()

  // setTimeout 桩为「立即执行」，重试 5 次后会停止，不无限递归
  eq("组件未就绪时重试到上限（1 次首调 + 5 次重试）", env.unlockCalls.length, 6)
  eq("重试期间仍未写入备份", env.storage["backup_list"], undefined)
})()

// ---------------------------------------------------------------- 汇总

console.log()
if (failed === 0) {
  console.log(green("✅ 全部通过") + "  (" + passed + " 项)")
  process.exit(0)
} else {
  console.log(red("❌ " + failed + " 项失败") + " / 共 " + (passed + failed) + " 项")
  failures.forEach(function (f) { console.log(red("  - ") + f) })
  process.exit(1)
}
