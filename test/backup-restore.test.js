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
 *       返回导航、升级弹窗文案与重试路径，以及晚课（ev_rotation_*）随备份/恢复的完整性：
 *       备份带走且值不变、清空后能从备份完整还原、老备份补 origin=import、
 *       老备份没有晚课键时不覆盖本地、恢复后清理备份课表数之外的残留槽。
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
    timers: [],
    rotResetCalls: 0
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
    // 页面顶部 require 了 version.js 与 rotation.js，不打桩会让整个用例在装载阶段就抛错。
    if (id.indexOf("version.js") >= 0) return { versionName: "test", versionCode: 0, channel: "test" }
    if (id.indexOf("rotation") >= 0) {
      return { resetCache: function () { env.rotResetCalls++ } }
    }
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

  // 进页预取已完成：premiumChecked=true 且 isPremium=false
  var vm = newInstance(env.__req, { premiumChecked: true, isPremium: false })
  vm.createBackup()

  eq("未写入 backup_list（不产生备份）", env.storage["backup_list"], undefined)
  eq("弹出本页自绘升级引导", vm.showUpgrade, true)
  ok("卖点 4 条", Array.isArray(vm.upgradeBenefits) && vm.upgradeBenefits.length === 4, JSON.stringify(vm.upgradeBenefits))

  var tpl = fs.readFileSync(UX_FILE, "utf8")
  ok("引导文案点明是高级版功能", tpl.indexOf("高级版功能") >= 0)
  ok("提供「继续标准版」退路（不逼迫）", tpl.indexOf("继续标准版") >= 0)
  ok("升级引导不再依赖异步解锁弹窗", tpl.indexOf("showUpgrade = true") >= 0)
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

  var vm = newInstance(env.__req, { premiumChecked: true, isPremium: true })
  vm.createBackup()

  var raw = env.storage["backup_list"]
  ok("已写入 backup_list", !!raw, String(raw))
  var list = JSON.parse(raw || "[]")
  eq("生成 1 条备份", list.length, 1)
  eq("统计课程数 = 3", list[0].courseCount, 3)
  eq("统计课表数 = 1", list[0].scheduleCount, 1)
  ok("备份名含时间戳", String(list[0].name).indexOf("备份 ") === 0, list[0].name)
  eq("高级版不弹升级引导", vm.showUpgrade, false)
  eq("给出成功提示", vm.sheetTitle, "备份成功")
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
  eq("删除弹窗以确认态打开", vm.showSheet, true)
  eq("dialogType=delete", vm.dialogType, "delete")
  vm.sheetAction()

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
  eq("恢复弹窗以确认态打开", vm.showSheet, true)
  eq("dialogType=restore", vm.dialogType, "restore")
  vm.sheetAction()
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
  eq("越界删除静默关闭弹窗", vm2.showSheet, false)
})()

section("5. 进页预取未返回就点击：按标准版弹引导并补一次取数")

;(function () {
  var env = makeEnv()
  env.premium = false

  // premiumChecked=false：模拟 onInit 的 isPremiumUnlocked 还没回调回来
  var vm = newInstance(env.__req, { premiumChecked: false, isPremium: false })
  vm.createBackup()

  eq("仍立即弹出升级引导（不让点击石沉大海）", vm.showUpgrade, true)
  eq("未写入备份", env.storage["backup_list"], undefined)
  // refreshPremium() 的桩回调是同步的，调用后状态应已落定
  eq("补取数后 premiumChecked 已置位", vm.premiumChecked, true)
  eq("非会员判定正确", vm.isPremium, false)
})()

// ---------------------------------------------------------------- 晚课完整性

// 晚课存在 ev_rotation_<课表序号> 里，与 allCourses_* 分离。
// 备份若漏了它，用户换机/回滚后晚课就凭空消失，因此这几组用例盯的是「字节级带走 + 原样还原」。

var ROT0 = JSON.stringify({
  enabled: true,
  time: "17:10 - 18:00",
  calibDate: "2026-08-31",
  origin: "demo",
  grid: [["语", "物", "体", "生", "英", "", ""]]
})

function backupEntry(data, extra) {
  var entry = { id: 1, name: "备份 A", time: "11-09 22:00", courseCount: 1, scheduleCount: 1, data: data }
  for (var k in (extra || {})) entry[k] = extra[k]
  return entry
}

section("6. 备份：晚课随课表一起带走，并记下晚课套数")

;(function () {
  var env = makeEnv()
  env.premium = true
  env.storage["allCourses_0"] = JSON.stringify([{ classes: [{ name: "数学" }] }])
  env.storage["scheduleNames"] = JSON.stringify(["八年级二班"])
  env.storage["ev_rotation_0"] = ROT0
  env.storage["ev_rotation_1"] = JSON.stringify({ enabled: true, origin: "user", grid: [] })

  var vm = newInstance(env.__req, { premiumChecked: true, isPremium: true })
  vm.createBackup()

  var list = JSON.parse(env.storage["backup_list"] || "[]")
  eq("生成 1 条备份", list.length, 1)
  eq("条目记录晚课 2 套", list[0].rotationCount, 2)
  eq("ev_rotation_0 原样进备份", list[0].data["ev_rotation_0"], ROT0)
  ok("ev_rotation_1 也在备份里", !!list[0].data["ev_rotation_1"], String(list[0].data["ev_rotation_1"]))

  // 损坏的晚课值不算一套（否则界面会显示一个空壳套数）
  var env2 = makeEnv()
  env2.premium = true
  env2.storage["allCourses_0"] = JSON.stringify([{ classes: [{ name: "数学" }] }])
  env2.storage["scheduleNames"] = JSON.stringify(["默认"])
  env2.storage["ev_rotation_0"] = "{坏数据"
  var vm2 = newInstance(env2.__req, { premiumChecked: true, isPremium: true })
  vm2.createBackup()
  var list2 = JSON.parse(env2.storage["backup_list"] || "[]")
  eq("解析失败的晚课不计入套数", list2[0].rotationCount, 0)
  ok("但有值就照样进备份（不丢数据）", list2[0].data["ev_rotation_0"] === "{坏数据", String(list2[0].data["ev_rotation_0"]))

  // 列表模板必须有「含晚课」一行，否则数据带了用户也看不见
  var tpl = fs.readFileSync(UX_FILE, "utf8")
  ok("卡片按 rotationCount>0 显示晚课行", tpl.indexOf("rotationCount > 0") >= 0 && tpl.indexOf("含晚课") >= 0)
})()

section("7. 恢复：清空后能从备份完整还原，并清掉多余的晚课槽")

;(function () {
  var env = makeEnv()
  env.premium = false
  var entry = backupEntry({
    "allCourses_0": JSON.stringify([{ classes: [{ name: "数学" }] }]),
    "scheduleNames": JSON.stringify(["八年级二班"]),
    "ev_rotation_0": ROT0
  }, { rotationCount: 1 })
  env.storage["backup_list"] = JSON.stringify([entry])

  // 恢复前本地是「4 张课表 + 各自晚课」，恢复后只应剩 1 张表对应的 1 套晚课
  env.storage["ev_rotation_0"] = JSON.stringify({ enabled: false, origin: "user", grid: [] })
  env.storage["ev_rotation_1"] = JSON.stringify({ enabled: true, origin: "user", grid: [] })
  env.storage["ev_rotation_3"] = JSON.stringify({ enabled: true, origin: "user", grid: [] })

  var vm = newInstance(env.__req, { backupList: [entry] })
  vm.confirmRestoreBackup(0)
  vm.sheetAction()

  eq("ev_rotation_0 还原成备份里的值", env.storage["ev_rotation_0"], ROT0)
  eq("ev_rotation_1 残留槽被清掉", env.storage["ev_rotation_1"], undefined)
  eq("ev_rotation_3 残留槽被清掉", env.storage["ev_rotation_3"], undefined)
  eq("晚课缓存被清 1 次", env.rotResetCalls, 1)
  eq("结果弹层报恢复成功", vm.sheetTitle, "恢复成功")
  ok("恢复成功态未被降级为失败", vm.sheetOk !== false, String(vm.sheetOk))
})()

section("8. 恢复：老备份没有 origin 时补 import，已有的 origin 不被改写")

;(function () {
  var env = makeEnv()
  var legacy = JSON.stringify({ enabled: true, time: "17:10 - 18:00", grid: [["语"]] })
  var entry = backupEntry({
    // 两张表 → 0/1 号晚课槽都在保留范围内，才能验证「已有 origin 不被改写」
    "scheduleNames": JSON.stringify(["默认", "第二张"]),
    "ev_rotation_0": legacy,
    "ev_rotation_1": JSON.stringify({ enabled: true, origin: "user", grid: [] })
  })
  env.storage["backup_list"] = JSON.stringify([entry])
  // 本地是「清空态」，恢复后不能被 seed 逻辑误判成「从未配置」
  env.storage["ev_rotation_0"] = JSON.stringify({ enabled: false, origin: "user", grid: [] })

  var vm = newInstance(env.__req, { backupList: [entry] })
  vm.confirmRestoreBackup(0)
  vm.sheetAction()

  var r0 = JSON.parse(env.storage["ev_rotation_0"])
  eq("无 origin → 补 import", r0.origin, "import")
  eq("原有数据字段不丢（enabled）", r0.enabled, true)
  ok("原有 grid 保留", JSON.stringify(r0.grid) === JSON.stringify([["语"]]), JSON.stringify(r0.grid))

  var r1 = JSON.parse(env.storage["ev_rotation_1"])
  eq("已有 origin=user 不被改写", r1.origin, "user")
})()

section("9. 恢复：老备份没有晚课键时不覆盖本地，也不误删")

;(function () {
  var env = makeEnv()
  var localRot = JSON.stringify({ enabled: true, origin: "user", grid: [["数"]] })
  var entry = backupEntry({ "allCourses_0": "[]" })
  env.storage["backup_list"] = JSON.stringify([entry])
  env.storage["ev_rotation_0"] = localRot
  env.storage["ev_rotation_2"] = JSON.stringify({ enabled: true, origin: "user", grid: [] })

  var vm = newInstance(env.__req, { backupList: [entry] })
  vm.confirmRestoreBackup(0)
  vm.sheetAction()

  eq("本地 ev_rotation_0 未被覆盖", env.storage["ev_rotation_0"], localRot)
  ok("备份无课表清单 → 不猜边界、不删槽", env.storage["ev_rotation_2"] !== undefined, String(env.storage["ev_rotation_2"]))
  eq("仍清了晚课缓存", env.rotResetCalls, 1)
})()

section("10. 恢复：残留槽清理的边界（10 张表 / 清单损坏）")

;(function () {
  // 备份本身就是 10 张课表：没有「多余槽」可清，不能把 0..9 全删了
  var names10 = []
  for (var i = 0; i < 10; i++) names10.push("表" + i)
  var env = makeEnv()
  var entry = backupEntry({ "scheduleNames": JSON.stringify(names10) })
  env.storage["backup_list"] = JSON.stringify([entry])
  env.storage["ev_rotation_9"] = JSON.stringify({ enabled: true, origin: "user", grid: [] })

  var vm = newInstance(env.__req, { backupList: [entry] })
  vm.confirmRestoreBackup(0)
  vm.sheetAction()
  ok("10 张表时不进入清理（不误删 9 号槽）", env.storage["ev_rotation_9"] !== undefined, String(env.storage["ev_rotation_9"]))

  // 清单损坏：解析失败 → keep=0 → 不删任何槽
  var env2 = makeEnv()
  var bad = backupEntry({ "scheduleNames": "{坏清单", "allCourses_0": "[]" })
  env2.storage["backup_list"] = JSON.stringify([bad])
  env2.storage["ev_rotation_5"] = JSON.stringify({ enabled: true, origin: "user", grid: [] })

  var vm2 = newInstance(env2.__req, { backupList: [bad] })
  vm2.confirmRestoreBackup(0)
  vm2.sheetAction()
  ok("清单损坏时不删槽", env2.storage["ev_rotation_5"] !== undefined, String(env2.storage["ev_rotation_5"]))
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
