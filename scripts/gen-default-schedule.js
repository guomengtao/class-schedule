#!/usr/bin/env node
/**
 * 从手机端默认课表生成手环端 seed（单一真源，防两端漂移）
 *
 *   真源：ev/ev-schedule-android/apk/res/raw/default_schedule.json
 *   产物：src/data/schedule.js（手环端 seed，day 用中文全名）
 *
 * 背景（2026-11-09）：两端各存一份「八年级二班」，一直是手工抄的。
 * 手机端加一节课、改个时间，手环端不会跟；反过来也一样，最后表现为
 * 「手机和手环上的课程不一样」。改成脚本生成后，改数据只改手机端那份。
 *
 * 用法：
 *   node scripts/gen-default-schedule.js          # 生成
 *   node scripts/gen-default-schedule.js --check  # 只校验是否已同步（CI/提交前用）
 */
var fs = require("fs")
var path = require("path")

var ROOT = path.resolve(__dirname, "..")
var SRC = path.resolve(ROOT, "../ev-schedule-android/apk/res/raw/default_schedule.json")
var OUT = path.resolve(ROOT, "src/data/schedule.js")

var DAY_NAMES = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]

function fail(msg) {
  console.error("[gen-default-schedule] " + msg)
  process.exit(1)
}

if (!fs.existsSync(SRC)) fail("找不到手机端真源：" + SRC)

var raw = JSON.parse(fs.readFileSync(SRC, "utf8"))
var courses = raw.courses || []
if (!courses.length) fail("真源里 courses 为空")

// day 支持三种写法：数字（0=周一）、中文全名、短名
function dayIndex(v) {
  if (v === undefined || v === null) return -1
  if (typeof v === "number") return v >= 0 && v <= 6 ? v : -1
  var s = String(v).replace(/\s/g, "")
  if (!s) return -1
  var m = s.match(/^(星期|周|礼拜)([日天一二三四五六七])$/)
  if (m) {
    if (m[2] === "日" || m[2] === "天" || m[2] === "七") return 0
    return "一二三四五六".indexOf(m[2]) + 1
  }
  var en = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
  if (en[s.toLowerCase()] !== undefined) return en[s.toLowerCase()]
  return -1
}

var buckets = {}
var order = []
for (var i = 0; i < courses.length; i++) {
  var c = courses[i]
  var di = dayIndex(c.day)
  if (di < 0) fail("第 " + (i + 1) + " 条课程 day 无法识别：" + JSON.stringify(c.day))
  if (!buckets[di]) { buckets[di] = []; order.push(di) }
  var time = String(c.time || "").replace(/\s*[-~–—至到]\s*/, " - ").trim()
  buckets[di].push({
    name: c.name || "",
    time: time,
    teacher: c.teacher || "",
    location: c.location || "",
    notes: c.notes || ""
  })
}
order.sort(function (a, b) { return a - b })

var lines = []
lines.push("// 手环端内置示例课表（八年级二班）")
lines.push("//")
lines.push("// ⚠️ 本文件由 scripts/gen-default-schedule.js 生成，请勿手改。")
lines.push("//    真源：ev/ev-schedule-android/apk/res/raw/default_schedule.json")
lines.push("//    改数据：改手机端那份，然后 node scripts/gen-default-schedule.js")
lines.push("//")
lines.push("// 仅在新装 / 首次读取第 1 套课表且无数据时作为 seed 写入，之后一律以用户数据为准。")
lines.push("// 教室与老师留空 —— 不填就不显示，避免默认数据里出现家长不认识的占位信息。")
lines.push("module.exports = {")
lines.push("  schedule: [")
var seq = 0
for (var k = 0; k < order.length; k++) {
  var di2 = order[k]
  lines.push("    {")
  lines.push('      day: "' + DAY_NAMES[di2] + '",')
  lines.push("      classes: [")
  var list = buckets[di2]
  for (var j = 0; j < list.length; j++) {
    var it = list[j]
    seq++
    lines.push('        { id: "' + seq + '", name: ' + JSON.stringify(it.name) +
      ', time: ' + JSON.stringify(it.time) +
      ', teacher: ' + JSON.stringify(it.teacher) +
      ', location: ' + JSON.stringify(it.location) +
      ', notes: ' + JSON.stringify(it.notes) + " }" + (j === list.length - 1 ? "" : ","))
  }
  lines.push("      ]")
  lines.push("    }" + (k === order.length - 1 ? "" : ","))
}
lines.push("  ]")
lines.push("}")
var out = lines.join("\n") + "\n"

if (process.argv.indexOf("--check") >= 0) {
  var cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : ""
  if (cur !== out) {
    fail("手环端 seed 与手机端真源不一致，请执行 node scripts/gen-default-schedule.js 后重新提交")
  }
  console.log("[gen-default-schedule] ✓ 已同步（" + seq + " 条课程）")
  process.exit(0)
}

fs.writeFileSync(OUT, out)
console.log("[gen-default-schedule] ✓ 已生成 " + OUT + "（" + seq + " 条课程 / " + order.length + " 天）")
