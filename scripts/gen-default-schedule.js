#!/usr/bin/env node
/**
 * 从手机端默认课表生成手环端 seed（单一真源，防两端漂移）
 *
 *   真源：ev/ev-schedule-android/apk/res/raw/default_schedule.json     → src/data/schedule.js
 *         ev/ev-schedule-android/apk/res/raw/default_schedule_901.json → src/data/schedule-901.js
 *   产物：手环端 seed（day 用中文全名），一套一个产物文件
 *
 * 背景（2026-11-09）：两端各存一份「八年级二班」，一直是手工抄的。
 * 手机端加一节课、改个时间，手环端不会跟；反过来也一样，最后表现为
 * 「手机和手环上的课程不一样」。改成脚本生成后，改数据只改手机端那份。
 *
 * 2026-11-09 追加第二套：九年级一班（真实课表，49 条）。新装用户首启两套都写入，
 * 第一套仍为默认激活。真源多一份即多一个产物，脚本按下面的 TARGETS 遍历。
 *
 * 用法：
 *   node scripts/gen-default-schedule.js          # 生成全部
 *   node scripts/gen-default-schedule.js --check  # 只校验是否已同步（CI/提交前用）
 */
var fs = require("fs")
var path = require("path")

var ROOT = path.resolve(__dirname, "..")

// 一套 = 一个手机端真源 + 一个手环端产物。顺序即课表槽位顺序（第 1 套在最前）。
var TARGETS = [
  {
    title: "八年级二班",
    src: path.resolve(ROOT, "../ev-schedule-android/apk/res/raw/default_schedule.json"),
    out: path.resolve(ROOT, "src/data/schedule.js"),
    optional: false
  },
  {
    title: "九年级一班",
    src: path.resolve(ROOT, "../ev-schedule-android/apk/res/raw/default_schedule_901.json"),
    out: path.resolve(ROOT, "src/data/schedule-901.js"),
    optional: true
  }
]

var DAY_NAMES = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]

function fail(msg) {
  console.error("[gen-default-schedule] " + msg)
  process.exit(1)
}

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

/** 读一套真源并渲染成手环端 seed 源码；真源缺失且允许跳过时返回 null */
function renderTarget(t) {
  if (!fs.existsSync(t.src)) {
    if (t.optional) {
      console.warn("[gen-default-schedule] ⚠ 跳过（真源不存在）：" + t.src)
      return null
    }
    fail("找不到手机端真源：" + t.src)
  }
  var raw = JSON.parse(fs.readFileSync(t.src, "utf8"))
  var courses = raw.courses || []
  if (!courses.length) fail("真源里 courses 为空：" + t.src)

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

  var rel = path.relative(path.resolve(ROOT, ".."), t.src)
  var lines = []
  lines.push("// 手环端内置示例课表（" + t.title + "）")
  lines.push("//")
  lines.push("// ⚠️ 本文件由 scripts/gen-default-schedule.js 生成，请勿手改。")
  lines.push("//    真源：ev/" + rel)
  lines.push("//    改数据：改手机端那份，然后 node scripts/gen-default-schedule.js")
  lines.push("//")
  lines.push("// 仅在新装首启 / 首次读取该套课表且无数据时作为 seed 写入，之后一律以用户数据为准。")
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
  return { text: lines.join("\n") + "\n", seq: seq, days: order.length, title: t.title }
}

var CHECK = process.argv.indexOf("--check") >= 0
var results = []

for (var t = 0; t < TARGETS.length; t++) {
  var target = TARGETS[t]
  var r = renderTarget(target)
  if (!r) continue
  if (CHECK) {
    var cur = fs.existsSync(target.out) ? fs.readFileSync(target.out, "utf8") : ""
    if (cur !== r.text) {
      fail("「" + r.title + "」手环端 seed 与手机端真源不一致，请执行 node scripts/gen-default-schedule.js 后重新提交")
    }
    results.push(r)
    continue
  }
  fs.writeFileSync(target.out, r.text)
  results.push(r)
  console.log("[gen-default-schedule] ✓ 已生成 " + target.out + "（" + r.seq + " 条课程 / " + r.days + " 天）")
}

if (CHECK) {
  var parts = []
  for (var q = 0; q < results.length; q++) {
    parts.push(results[q].title + " " + results[q].seq + " 条")
  }
  console.log("[gen-default-schedule] ✓ 已同步（" + parts.join("、") + "）")
}
