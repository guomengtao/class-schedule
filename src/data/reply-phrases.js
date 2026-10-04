/**
 * 留言回复：快捷短语表 + 文本规范化（手环侧）
 *
 * 用途：手环收到手机留言后，在「留言板」页一键把常用短语回给手机。
 *
 * 背景（2026-10-04）：
 *   此前手环端只有「被动回执」（syncReply 回 ok）与底层的 chatBridge.send 主动发送能力，
 *   但留言板页面只能看、不能回 —— 收到留言后没法在手腕上回话。
 *   本模块把「回什么」这件事从页面里抽出来，单独可测，避免文案散落在 <template>/<script> 里。
 *
 * 为什么不做成页面内联数组：
 *   快应用没有测试框架，逻辑写在 .ux 里 Node 抽不出来。抽成纯 .js 数据模块后，
 *   test/reply-phrases.test.js 可以 node 直接 require 断言，页面只负责渲染与发送。
 */

/** 单条回复的最大长度（字符）。手环提示条窄，过长会被截断/换行难读。 */
var MAX_LEN = 40

/**
 * 快捷短语：手环小屏（192×490）2×2 按钮，每条 ≤3 字最容易点准。
 * 顺序即展示顺序 —— 最常用的「收到」放第一位。
 */
var PHRASES = [
  "收到",
  "在上课",
  "稍后回",
  "好的"
]

/** 返回短语列表的副本（防止调用方 push/splice 改到模块内的常量） */
function getPhrases() {
  return PHRASES.slice(0)
}

/**
 * 把用户输入/预设短语规范化成可发送的回复文本。
 * - 去掉首尾空白
 * - 换行/制表符等压成单个空格（手环提示条是单行，换行会显示成怪符号）
 * - 超长按 MAX_LEN 截断
 * - 非法入参（null / undefined / 数字 / 对象）一律当空串处理，绝不抛异常
 *
 * @return {string} 可直接交给 chatBridge.send 的文本；空串 = 没有可发的内容
 */
function buildReply(text) {
  if (text === null || text === undefined) {
    return ""
  }
  var s = String(text)
  // 各类空白字符（含全角空格 \u3000）统一压成半角空格
  s = s.replace(/[\s\u3000]+/g, " ").trim()
  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN)
  }
  return s
}

/** 短语是否可用（非空且规范化后仍有内容）—— 页面在发之前用它兜底 */
function isSendable(text) {
  return buildReply(text).length > 0
}

module.exports = {
  MAX_LEN: MAX_LEN,
  PHRASES: PHRASES,
  getPhrases: getPhrases,
  buildReply: buildReply,
  isSendable: isSendable
}
