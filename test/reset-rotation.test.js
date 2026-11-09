/**
 * 重置数据 × 晚课（rotation）回归测试
 *
 * 用法：node test/reset-rotation.test.js
 *
 * 背景：晚课是课程表的一部分（存储键 ev_rotation_<idx> 与 allCourses_<idx>
 * 一一对应）。2026-11-09 之前「重置数据」只动主课表，晚课会留下用户旧配置，
 * 形成「主表回默认、晚课没跟上」的半套状态。本测试锁死同进同退的口径。
 *
 * 与仓库其它测试一样，快应用模块在 Node 里 require 不了 @system.storage，
 * 这里用 vm 加载**线上真实源码**，注入一份共享的模拟 storage，
 * 让 database.js 拿到的 rotation 就是同一个实例（含同一份内存缓存）。
 *
 * 覆盖：
 *   A. 全部重置：写回 6 周 Demo、清 1..9 槽、sid 归 0、缓存失效、可注入晚课
 *   B. 重置为空：停用 + origin=user、清 1..9 槽、Demo 不回填、不注入晚课
 *   C. 恢复默认：只改 course_preset_list，晚课一个字节都不动
 *   D. 新装首启：无 ev_rotation_0 时 prime() 自动 seed 6 周 Demo 并落盘
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

/** 一份可控的模拟存储；set/get/delete 都同步回调，避免异步竞态干扰断言 */
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

/** 用 vm 加载真实 rotation.js，返回其 module.exports */
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

/** 用 vm 加载真实 database.js，并把 ./rotation 指向上面那个真实实例 */
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

/** 用户自己配置过的晚课（与 Demo 不同，用来证明重置确实发生了覆盖） */
var USER_ROTATION = JSON.stringify({
  enabled: true, cycle: 2, time: "19:00 - 19:50",
  calibDate: "2026-09-01", calibWeek: 1, origin: "user",
  cells: [["自定晚课", "", "", "", "", "", ""], ["", "", "", "", "", "", ""]]
})

function makeEnv() {
  var box = {
    "ev_rotation_0": USER_ROTATION,
    "ev_rotation_1": USER_ROTATION,
    "allCourses_0": JSON.stringify([{ day: "星期一", classes: [{ id: "1", name: "旧课" }] }]),
    "allCourses_1": JSON.stringify([{ day: "星期二", classes: [{ id: "2", name: "旧课2" }] }]),
    "scheduleNames": JSON.stringify(["课程表1", "课程表2"]),
    "currentScheduleIndex": "1",
    "course_preset_list": JSON.stringify([{ name: "旧预设" }]),
    "night_course_sid": "1"
  }
  var storage = makeStorage(box)
  var rotation = loadRotation(storage)
  var db = loadDatabase(storage, rotation)
  return { box: box, rotation: rotation, db: db }
}

function parseRot(box) {
  if (!box["ev_rotation_0"]) return null
  try { return JSON.parse(box["ev_rotation_0"]) } catch (e) { return null }
}

function assertSlotsCleared(label, box) {
  var left = []
  for (var i = 1; i < 10; i++) {
    if (box["ev_rotation_" + i] !== undefined) left.push(i)
  }
  ok(label + "：ev_rotation_1..9 全部删除", left.length === 0, "残留 " + left.join(","))
  ok(label + "：night_course_sid 归 0", box["night_course_sid"] === "0",
    "实际 " + box["night_course_sid"])
}

/** 注入后统计 _rotation 虚拟条目数（固定日期 = calibDate，命中第 1 周） */
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

function primeAsync(rotation, index) {
  return new Promise(function (resolve) { rotation.prime(index, function () { resolve() }) })
}
function callAsync(fn, db) {
  return new Promise(function (resolve) { fn.call(db, function () { resolve() }) })
}

;(async function () {
  console.log("\n[A] 全部重置 → 八年级二班 + 6 周晚课 Demo")
  {
    var a = makeEnv()
    await callAsync(a.db.resetToDemoData, a.db)
    var t = parseRot(a.box)
    ok("ev_rotation_0 写回 6 周 Demo", !!(t && t.cycle === 6 && t.cells.length === 6),
      t ? "cycle=" + t.cycle : "null")
    ok("Demo 已启用 / 时间 17:10 - 18:00", !!(t && t.enabled === true && t.time === "17:10 - 18:00"))
    ok("origin=demo（用户旧配置已被覆盖）", !!(t && t.origin === "demo"), t && t.origin)
    ok("主套是 8.20（第 1 周周一 = 语）", !!(t && t.cells[0][0] === "语"))
    ok("用户旧课名已消失", a.box["ev_rotation_0"].indexOf("自定晚课") === -1)
    assertSlotsCleared("全部重置", a.box)
    ok("晚课内存缓存已失效", a.rotation.peek(0) === undefined)
    ok("主课表回到 1 张「八年级二班」", (function () {
      try { return JSON.parse(a.box["scheduleNames"])[0] === "八年级二班" } catch (e) { return false }
    })())
    await primeAsync(a.rotation, 0)
    ok("重新预热读到的是 Demo", a.rotation.peek(0) && a.rotation.peek(0).cycle === 6)
    ok("首页可注入晚课条目", injectedCount(a.rotation, 0) > 0)
  }

  console.log("\n[B] 重置为空 → 晚课停用且不被 lazy seed 回填")
  {
    var b = makeEnv()
    await callAsync(b.db.resetToEmpty, b.db)
    var t2 = parseRot(b.box)
    ok("ev_rotation_0 写为停用模板", !!(t2 && t2.enabled === false))
    ok("origin=user（阻止 Demo 回填）", !!(t2 && t2.origin === "user"), t2 && t2.origin)
    ok("6 周格子全空", !!(t2 && t2.cells.length === 6 && t2.cells.every(function (row) {
      return row.every(function (c) { return c === "" })
    })))
    assertSlotsCleared("重置为空", b.box)
    ok("晚课内存缓存已失效", b.rotation.peek(0) === undefined)
    await primeAsync(b.rotation, 0)
    var peeked = b.rotation.peek(0)
    ok("预热后仍是 user/停用，Demo 未回填", !!(peeked && peeked.origin === "user" && peeked.enabled === false))
    ok("首页不再注入晚课", injectedCount(b.rotation, 0) === 0)
  }

  console.log("\n[C] 恢复默认 → 只改课程名，晚课不动")
  {
    var c = makeEnv()
    var before = c.box["ev_rotation_0"]
    await callAsync(c.db.resetCoursePresets, c.db)
    ok("ev_rotation_0 逐字节未变", c.box["ev_rotation_0"] === before)
    ok("course_preset_list 已换成内置预设", (function () {
      try { return JSON.parse(c.box["course_preset_list"]).length > 0 } catch (e) { return false }
    })())
  }

  console.log("\n[D] 新装首启 → prime() 自动 seed 6 周 Demo 并落盘")
  {
    var box4 = {}
    var storage4 = makeStorage(box4)
    var r4 = loadRotation(storage4)
    await primeAsync(r4, 0)
    var t4 = parseRot(box4)
    ok("ev_rotation_0 已落盘（不是只在内存）", !!t4)
    ok("落盘内容是 6 周 Demo", !!(t4 && t4.cycle === 6 && t4.origin === "demo" && t4.enabled === true))
    ok("首页可注入晚课条目", injectedCount(r4, 0) > 0)
  }

  console.log("\n" + (failed === 0 ? green("结果：" + passed + " 通过 / 0 失败") : red("结果：" + passed + " 通过 / " + failed + " 失败")))
  if (failures.length) {
    console.log("\n失败用例：")
    failures.forEach(function (f) { console.log("  - " + f) })
  }
  process.exit(failed ? 1 : 0)
})().catch(function (e) {
  console.error(red("测试脚本异常："), e && e.stack || e)
  process.exit(1)
})
