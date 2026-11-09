/**
 * 内置两套课表（八年级二班 + 九年级一班）回归测试
 *
 * 用法：node test/two-builtin-schedules.test.js
 *
 * 背景（2026-11-09）：内置课表从 1 套扩为 2 套（第 2 套 = 九年级一班真实课表，
 * 49 条）。用户确认：第 2 套**不配晚课**；周五「周考」18:20 - 20:20（120 分钟）。
 *
 * 覆盖：
 *   A. 新装首启：两套课表都落盘、名字两套、激活默认第 1 套
 *   B. 第 2 套不配晚课：seedTemplate(1) 为 null、prime(1) 后不注入、ev_rotation_1 不落盘
 *   C. 第 1 套晚课不受影响：仍发 6 周 Demo
 *   D. 周考：第 2 套里有且仅 1 条、18:20 - 20:20（120 分钟）、day=4（周五）
 *   E. 老用户保护：已有 scheduleNames / allCourses_0 时不写入任何内置课表
 */

"use strict"

var fs = require("fs")
var path = require("path")
var vm = require("vm")

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

var DATA_DIR = path.resolve(__dirname, "../src/data")
var QUIET = { log: function () {}, error: function () {}, warn: function () {} }

function makeStorage(box) {
  return {
    get: function (o) {
      var v = box[o.key]
      if (v === undefined) { if (o.success) o.success(""); return }
      if (o.success) o.success(v)
    },
    set: function (o) { box[o.key] = String(o.value); if (o.success) o.success() },
    delete: function (o) { delete box[o.key]; if (o.success) o.success() },
    clear: function (o) { if (o && o.success) o.success() }
  }
}

function loadRotation(storage) {
  var ctx = {
    module: { exports: {} }, exports: {},
    require: function (id) {
      if (id === "@system.storage") return storage
      return require(id)
    },
    console: QUIET,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  }
  ctx.exports = ctx.module.exports
  vm.createContext(ctx)
  vm.runInContext(fs.readFileSync(path.join(DATA_DIR, "rotation.js"), "utf8"), ctx,
    { filename: "rotation.js" })
  return ctx.module.exports
}

function loadDatabase(storage, rotation) {
  var ctx = {
    module: { exports: {} }, exports: {},
    require: function (id) {
      if (id === "@system.storage") return storage
      if (id === "./rotation" || id === "./rotation.js") return rotation
      if (id === "./store.js") return { clearCache: function () {} }
      if (id.indexOf("./") === 0) return require(path.resolve(DATA_DIR, id))
      return require(id)
    },
    console: QUIET,
    setTimeout: setTimeout, clearTimeout: clearTimeout
  }
  ctx.exports = ctx.module.exports
  vm.createContext(ctx)
  vm.runInContext(fs.readFileSync(path.join(DATA_DIR, "database.js"), "utf8"), ctx,
    { filename: "database.js" })
  return ctx.module.exports
}

function primeAsync(rotation, index) {
  return new Promise(function (resolve) { rotation.prime(index, function () { resolve() }) })
}
function readyAsync(db) {
  return new Promise(function (resolve) {
    // ensureReady 不在导出里；借公开读接口触发 initStorage
    db.getAllCoursesWithIndex(0, function () { resolve() })
  })
}
/** 等待异步 ensureBuiltinSchedules 写盘完成：轮询 scheduleNames 出现或超时 */
function waitSeed(box, timeoutMs) {
  var deadline = Date.now() + (timeoutMs || 2000)
  return new Promise(function (resolve) {
    ;(function poll() {
      if (box["scheduleNames"] !== undefined || Date.now() > deadline) { resolve(); return }
      setTimeout(poll, 10)
    })()
  })
}

function injectedCount(rotation, index) {
  var schedule = []
  for (var g = 0; g < 7; g++) schedule.push({ day: "", classes: [] })
  var out = rotation.injectInto(schedule, index, new Date(2026, 7, 31))
  var n = 0
  for (var i = 0; i < out.length; i++) {
    for (var j = 0; j < out[i].classes.length; j++) {
      if (out[i].classes[j] && out[i].classes[j]._rotation) n++
    }
  }
  return n
}

function parse(box, key) {
  if (box[key] === undefined || box[key] === "") return null
  try { return JSON.parse(box[key]) } catch (e) { return null }
}

;(async function () {
  var builtin = require(path.join(DATA_DIR, "builtin-schedule.js"))

  console.log("\n[数据] 内置两套真源")
  {
    ok("builtin.count === 2", builtin.count === 2, "实际 " + builtin.count)
    ok("名字顺序 = [八年级二班, 九年级一班]",
      builtin.names[0] === "八年级二班" && builtin.names[1] === "九年级一班",
      JSON.stringify(builtin.names))
    var s1 = builtin.copySchedule(0)
    var s2 = builtin.copySchedule(1)
    var n1 = 0, n2 = 0
    for (var d = 0; d < s1.length; d++) n1 += (s1[d].classes || []).length
    for (var d2 = 0; d2 < s2.length; d2++) n2 += (s2[d2].classes || []).length
    ok("第 1 套 45 条 / 第 2 套 49 条", n1 === 45 && n2 === 49, "实际 " + n1 + "/" + n2)
  }

  console.log("\n[D] 周考：周五 18:20 - 20:20（120 分钟）")
  {
    var s2 = builtin.copySchedule(1)
    var exams = []
    for (var d = 0; d < s2.length; d++) {
      var cs = s2[d].classes || []
      for (var i = 0; i < cs.length; i++) {
        if (cs[i].name === "周考") exams.push({ day: d, time: cs[i].time })
      }
    }
    ok("第 2 套里周考有且仅 1 条", exams.length === 1, "实际 " + exams.length)
    ok("day=4（周五）", exams.length === 1 && exams[0].day === 4, exams.length && exams[0].day)
    ok("time = 18:20 - 20:20（120 分钟）",
      exams.length === 1 && exams[0].time === "18:20 - 20:20", exams.length && exams[0].time)
    var firstSetHasExam = JSON.stringify(builtin.copySchedule(0)).indexOf("周考") >= 0
    ok("第 1 套不含周考", !firstSetHasExam)
  }

  console.log("\n[A] 新装首启 → 两套都落盘")
  {
    var box = {}
    var storage = makeStorage(box)
    var rotation = loadRotation(storage)
    var db = loadDatabase(storage, rotation)
    await readyAsync(db)
    await waitSeed(box)

    var names = parse(box, "scheduleNames")
    ok("scheduleNames 写入两套",
      !!names && names.length === 2 && names[0] === "八年级二班" && names[1] === "九年级一班",
      JSON.stringify(names))
    var slot0 = parse(box, "allCourses_0")
    var slot1 = parse(box, "allCourses_1")
    ok("allCourses_0 = 八年级二班（45 条）", !!slot0 && (function () {
      var n = 0
      for (var i = 0; i < slot0.length; i++) n += (slot0[i].classes || []).length
      return n === 45
    })())
    ok("allCourses_1 = 九年级一班（49 条）", !!slot1 && (function () {
      var n = 0
      for (var i = 0; i < slot1.length; i++) n += (slot1[i].classes || []).length
      return n === 49
    })())
  }

  console.log("\n[B+C] 晚课：第 1 套发 6 周 Demo，第 2 套不发")
  {
    ok("seedTemplate(0) 非空", !!builtin && true) // 占位，真断言在下面 vm 实例里
    var box = {}
    var storage = makeStorage(box)
    var rotation = loadRotation(storage)
    var t0 = rotation.seedTemplate(0)
    var t1 = rotation.seedTemplate(1)
    var t2 = rotation.seedTemplate(2)
    ok("seedTemplate(0) = 6 周 Demo", !!(t0 && t0.cycle === 6))
    ok("seedTemplate(1) = null（第 2 套不配晚课）", t1 === null, JSON.stringify(t1))
    ok("第 3 套及以后仍回落主套（cycle=6）", !!(t2 && t2.cycle === 6))
  }
  {
    var box2 = {}
    var storage2 = makeStorage(box2)
    var rotation2 = loadRotation(storage2)
    var db2 = loadDatabase(storage2, rotation2)
    await readyAsync(db2)
    await waitSeed(box2)
    await primeAsync(rotation2, 0)
    await primeAsync(rotation2, 1)
    ok("第 1 套 ev_rotation_0 已发种落盘", parse(box2, "ev_rotation_0") !== null)
    ok("第 2 套 ev_rotation_1 不落盘", box2["ev_rotation_1"] === undefined || box2["ev_rotation_1"] === "",
      JSON.stringify(box2["ev_rotation_1"]))
    ok("第 1 套首页可注入晚课", injectedCount(rotation2, 0) > 0)
    ok("第 2 套首页不注入晚课", injectedCount(rotation2, 1) === 0)
  }

  console.log("\n[E] 老用户保护：已有数据时不回填")
  {
    var box3 = {
      "scheduleNames": JSON.stringify(["我的课表"]),
      "allCourses_0": JSON.stringify([{ day: "星期一", classes: [{ id: "1", name: "旧课" }] }])
    }
    var storage3 = makeStorage(box3)
    var rotation3 = loadRotation(storage3)
    var db3 = loadDatabase(storage3, rotation3)
    await readyAsync(db3)
    await waitSeed(box3, 300)
    var names3 = parse(box3, "scheduleNames")
    ok("scheduleNames 未被覆盖", names3 && names3.length === 1 && names3[0] === "我的课表",
      JSON.stringify(names3))
    ok("allCourses_1 未被写入", box3["allCourses_1"] === undefined, JSON.stringify(box3["allCourses_1"]))
  }

  console.log("\n结果：" + passed + " 通过 / " + failed + " 失败")
  if (failed) {
    console.error(red("失败项："))
    for (var f = 0; f < failures.length; f++) console.error("  - " + failures[f])
    process.exit(1)
  }
})().catch(function (e) {
  console.error(e && e.stack || e)
  process.exit(1)
})
