/**
 * 留言快捷回复短语（src/data/reply-phrases.js）单元测试
 *
 * 用法：node test/reply-phrases.test.js
 *
 * 背景（2026-10-04）：
 *   手环留言板过去只能看不能回。新增「快捷短语回复 + 中文输入回复」后，
 *   短语表与文本规范化被抽成纯数据模块，便于 node 直接测 —— 不需要快应用运行时。
 *
 * 为什么这么测：
 *   reply-phrases.js 是纯 JS（不 require 任何 @system.*），可被 Node 直接加载，
 *   因此这里**不需要**做 <script> 抽取 + 打桩那一套，直接 require 真实模块断言即可。
 *   测的是**线上那份源码本身**。
 */

"use strict"

var path = require("path")

var C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  dim: "\x1b[2m"
}
function green(s) { return C.green + s + C.reset }
function red(s) { return C.red + s + C.reset }
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

// ---------------------------------------------------------------- 装载源码

var R = require(path.join(__dirname, "../src/data/reply-phrases.js"))

console.log("\n" + C.dim + "留言快捷回复短语 · 单元测试" + C.reset + "\n")

// ---------------------------------------------------------------- 1. 短语表

console.log("短语表")

ok("PHRASES 是数组", Array.isArray(R.PHRASES))
ok("至少有 3 条短语（够铺一排按钮）", R.PHRASES.length >= 3, "实际 " + R.PHRASES.length + " 条")

var allNonEmpty = true
var allTrimmed = true
var allShort = true
var tooLong = null
for (var i = 0; i < R.PHRASES.length; i++) {
  var p = R.PHRASES[i]
  if (typeof p !== "string" || p.trim().length === 0) { allNonEmpty = false }
  if (typeof p === "string" && p !== p.trim()) { allTrimmed = false }
  if (typeof p === "string" && p.length > R.MAX_LEN) { allShort = false; tooLong = p }
}
ok("每条短语都是非空字符串", allNonEmpty)
ok("每条短语首尾无空白（手环按钮上不该有隐形空格）", allTrimmed)
ok("每条短语不超 MAX_LEN", allShort, tooLong ? "超长项：" + tooLong : "")

var seen = {}
var dup = null
for (var j = 0; j < R.PHRASES.length; j++) {
  if (seen[R.PHRASES[j]]) { dup = R.PHRASES[j] }
  seen[R.PHRASES[j]] = true
}
ok("短语无重复", dup === null, dup ? "重复项：" + dup : "")

ok("MAX_LEN 是正整数", typeof R.MAX_LEN === "number" && R.MAX_LEN > 0)

// ---------------------------------------------------------------- 2. getPhrases

console.log("\ngetPhrases 返回副本")

var copy1 = R.getPhrases()
eq("返回条数与 PHRASES 一致", copy1.length, R.PHRASES.length)
ok("返回值与原数组内容相同", JSON.stringify(copy1) === JSON.stringify(R.PHRASES))

copy1.push("被塞进来的脏数据")
eq("改副本不影响模块内 PHRASES", R.PHRASES.length, copy1.length - 1)
ok("再次 getPhrases 不含脏数据", R.getPhrases().indexOf("被塞进来的脏数据") === -1)

// ---------------------------------------------------------------- 3. buildReply

console.log("\nbuildReply 规范化")

eq("去首尾空白", R.buildReply("  收到  "), "收到")
eq("去掉行尾换行", R.buildReply("在上课\n"), "在上课")
eq("中间换行压成单空格", R.buildReply("稍后\n回你"), "稍后 回你")
eq("制表符压成单空格", R.buildReply("a\tb"), "a b")
eq("连续空白压成一个", R.buildReply("好   的"), "好 的")
eq("全角空格也算空白", R.buildReply("\u3000好的\u3000"), "好的")
eq("空串返回空串", R.buildReply(""), "")
eq("纯空白返回空串", R.buildReply("   \n\t "), "")
eq("null 兜底为空串", R.buildReply(null), "")
eq("undefined 兜底为空串", R.buildReply(undefined), "")
eq("数字入参转字符串", R.buildReply(123), "123")

var longText = "一".repeat(R.MAX_LEN + 20)
eq("超长截断到 MAX_LEN", R.buildReply(longText).length, R.MAX_LEN)

var threw = false
var objResult = null
try { objResult = R.buildReply({ a: 1 }) } catch (e) { threw = true }
ok("对象入参不抛异常", !threw)
ok("对象入参返回字符串", typeof objResult === "string")

// ---------------------------------------------------------------- 4. isSendable

console.log("\nisSendable 发送前兜底")

eq("正常短语可发", R.isSendable("收到"), true)
eq("带空白的短语可发", R.isSendable("  收到  "), true)
eq("空串不可发", R.isSendable(""), false)
eq("纯空白不可发", R.isSendable("   "), false)
eq("null 不可发", R.isSendable(null), false)
eq("undefined 不可发", R.isSendable(undefined), false)

// ---------------------------------------------------------------- 汇总

console.log("\n" + C.dim + "──────────────────────────────" + C.reset)
if (failed === 0) {
  console.log(green("全部通过") + "  " + passed + " 项")
} else {
  console.log(red("失败") + "  " + failed + " / " + (passed + failed) + " 项")
  console.log(C.dim + "失败清单：" + C.reset)
  for (var k = 0; k < failures.length; k++) {
    console.log("  - " + failures[k])
  }
}
console.log("")
process.exit(failed === 0 ? 0 : 1)
