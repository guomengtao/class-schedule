// ===== 农历 ⇄ 公历换算（输入侧糖，不参与落盘）=====
// 定位：只把「用户选的农历日期」翻译成公历，让倒数日继续用单一公历口径存数据。
// 所以本模块不提供节气 / 干支 / 宜忌 / 完整万年历 —— 那些是日历 App 的事，
// 在一个只回答「还有几天」的手环页面上没有位置。
//
// 依赖方向：只有 countdown-edit.ux 引用它。
// 首页与列表页只读 { id, title, date, enabled } 的公历 date，因此它们的 jsc
// 不会被下面这 200 项数据表拖大（实测增量见 docs）。

var BASE_YEAR = 1900
var BASE_MONTH = 1
var BASE_DAY = 31       // 农历 1900 年正月初一 = 公历 1900-01-31
var MS_PER_DAY = 86400000

// 1900-2099 年 17-bit 编码（Fung F. Lee / Ricky Yeung lunar 项目经典表，
// 与香港天文台 sa 数据一致）。每年一个整数：
//   bit 0-3   闰月月份 L（0 = 该年无闰月）
//   bit 4-15  12 个月大小，bit(16-m) = 1 表示第 m 月大（30 天），0 为小（29 天）
//   bit 16    闰月天数，1 = 30 天，0 = 29 天
// 用长字符串而不是数字数组：jsc 里一个字符串常量比 200 个数字常量省，
// 且解析推迟到第一次真正用到农历时（table() 惰性 + 缓存）。
var TABLE_SRC =
  "4bd8 4ae0 a570 54d5 d260 d950 16554 56a0 9ad0 55d2 " +
  "4ae0 a5b6 a4d0 d250 1d255 b540 d6a0 ada2 95b0 14977 " +
  "4970 a4b0 b4b5 6a50 6d40 1ab54 2b60 9570 52f2 4970 " +
  "6566 d4a0 ea50 6e95 5ad0 2b60 186e3 92e0 1c8d7 c950 " +
  "d4a0 1d8a6 b550 56a0 1a5b4 25d0 92d0 d2b2 a950 b557 " +
  "6ca0 b550 15355 4da0 a5d0 14573 52b0 a9a8 e950 6aa0 " +
  "aea6 ab50 4b60 aae4 a570 5260 f263 d950 5b57 56a0 " +
  "96d0 4dd5 4ad0 a4d0 d4d4 d250 d558 b540 b5a0 195a6 " +
  "95b0 49b0 a974 a4b0 b27a 6a50 6d40 af46 ab60 9570 " +
  "4af5 4970 64b0 74a3 ea50 6b58 5ac0 ab60 96d5 92e0 " +
  "c960 d954 d4a0 da50 7552 56a0 abb7 25d0 92d0 cab5 " +
  "a950 b4a0 baa4 ad50 55d9 4ba0 a5b0 15176 52b0 a930 " +
  "7954 6aa0 ad50 5b52 4b60 a6e6 a4e0 d260 ea65 d530 " +
  "5aa0 76a3 96d0 4afb 4ad0 a4d0 1d0b6 d250 d520 dd45 " +
  "b5a0 56d0 55b2 49b0 a577 a4b0 aa50 1b255 6d20 ada0 " +
  "14b63 9370 49f8 4970 64b0 168a6 ea50 6aa0 1a6c4 aae0 " +
  "92e0 d2e3 c960 d557 d4a0 da50 5d55 56a0 a6d0 55d4 " +
  "52d0 a9b8 a950 b4a0 b6a6 ad50 55a0 aba4 a5b0 52b0 " +
  "b273 6930 7337 6aa0 ad50 14b55 4b60 a570 54e4 d160 " +
  "e968 d520 daa0 16aa6 56d0 4ae0 a9d4 a2d0 d150 f252 "

var cache = null

// 自己解 16 进制：不依赖 parseInt 的 radix 参数，精简 JS 引擎上更保险
function hexToInt(s) {
  var v = 0
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i)
    v = v * 16 + (c < 58 ? c - 48 : c - 87)   // '0'-'9' → 0-9，'a'-'f' → 10-15
  }
  return v
}

function table() {
  if (cache) return cache
  var parts = TABLE_SRC.split(" ")
  var arr = []
  for (var i = 0; i < parts.length; i++) {
    if (parts[i]) arr.push(hexToInt(parts[i]))   // 空串来自换行拼接，跳过
  }
  cache = arr
  return arr
}

function yearCount() {
  return table().length
}

function inRange(ly) {
  return ly >= BASE_YEAR && ly < BASE_YEAR + yearCount()
}

// 闰月月份，0 表示无闰月
function leapMonth(yi) {
  return table()[yi] & 0xf
}

function leapDays(yi) {
  var v = table()[yi]
  if (!(v & 0xf)) return 0
  return ((v >> 16) & 1) ? 30 : 29
}

// 第 m 月天数（1..12，指正常月，不含闰月）
function monthDays(yi, m) {
  return ((table()[yi] >> (16 - m)) & 1) ? 30 : 29
}

// 该农历年总天数 = 348（12 个月各按 29 计）+ 大月补 1 + 闰月天数
function yearDays(yi) {
  var v = table()[yi]
  var s = 348
  for (var m = 1; m <= 12; m++) {
    if ((v >> (16 - m)) & 1) s++
  }
  return s + leapDays(yi)
}

function offsetToDate(off) {
  var d = new Date(BASE_YEAR, BASE_MONTH - 1, BASE_DAY)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + off)    // 走 setDate 而非加毫秒，跨夏令时也不会差一天
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
}

function dateToOffset(y, m, d) {
  var base = new Date(BASE_YEAR, BASE_MONTH - 1, BASE_DAY)
  base.setHours(0, 0, 0, 0)
  var t = new Date(y, m - 1, d)
  t.setHours(0, 0, 0, 0)
  return Math.round((t.getTime() - base.getTime()) / MS_PER_DAY)
}

// 农历 → 公历。isLeap 只在该年确有闰月且等于 lm 时生效。
// 闰月排在对应正常月之后，所以选闰月要先走完正常 lm 月。
function toSolar(ly, lm, ld, isLeap) {
  if (!inRange(ly)) return null
  var yi = ly - BASE_YEAR
  var off = 0
  var i

  for (i = 0; i < yi; i++) off += yearDays(i)

  var leap = leapMonth(yi)
  for (var m = 1; m < lm; m++) {
    off += monthDays(yi, m)
    if (leap && m === leap) off += leapDays(yi)
  }
  if (isLeap && leap === lm) off += monthDays(yi, lm)
  off += ld - 1
  return offsetToDate(off)
}

// 公历 → 农历。超出表范围（<1900 或 >2099）返回 null
function fromSolar(y, m, d) {
  var off = dateToOffset(y, m, d)
  if (off < 0) return null

  var n = yearCount()
  var yi = 0
  while (yi < n && off >= yearDays(yi)) {
    off -= yearDays(yi)
    yi++
  }
  if (yi >= n) return null

  var leap = leapMonth(yi)
  var isLeap = false
  var lm = 1
  for (lm = 1; lm <= 12; lm++) {
    var dim = monthDays(yi, lm)
    if (off < dim) break
    off -= dim
    if (leap && lm === leap) {
      var ldim = leapDays(yi)
      if (off < ldim) {
        isLeap = true
        break
      }
      off -= ldim
    }
  }
  return { y: BASE_YEAR + yi, m: lm, d: off + 1, isLeap: isLeap }
}

// ---- 显示名：一律两字，picker 列宽 52px 才不会被撑破 ----
// 正月 二月 … 十月 冬月 腊月；闰月显示「闰正」「闰六」（省略「月」字）
var MONTH_CHARS = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"]
var DIGITS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]

function monthName(m, isLeap) {
  var c = MONTH_CHARS[m - 1]
  return isLeap ? ("闰" + c) : (c + "月")
}

// 初一 … 初十 / 十一 … 十九 / 二十 / 廿一 … 廿九 / 三十
function dayName(d) {
  if (d === 10) return "初十"
  if (d === 20) return "二十"
  if (d === 30) return "三十"
  if (d < 10) return "初" + DIGITS[d - 1]
  if (d < 20) return "十" + DIGITS[d - 11]
  return "廿" + DIGITS[d - 21]
}

// 「九月初五」「闰六月初一」
function fullText(y, m, d, isLeap) {
  return (isLeap ? "闰" : "") + MONTH_CHARS[m - 1] + "月" + dayName(d)
}

function pad2(n) {
  return n < 10 ? "0" + n : "" + n
}

function toSolarStr(ly, lm, ld, isLeap) {
  var s = toSolar(ly, lm, ld, isLeap)
  if (!s) return ""
  return s.y + "-" + pad2(s.m) + "-" + pad2(s.d)
}

// 农历某年某月的天数（isLeap 为真且该年确有该闰月时取闰月长度）
function daysInMonth(ly, lm, isLeap) {
  if (!inRange(ly)) return 30
  var yi = ly - BASE_YEAR
  if (isLeap && leapMonth(yi) === lm) return leapDays(yi)
  return monthDays(yi, lm)
}

function isLeapMonth(ly, lm) {
  return inRange(ly) && leapMonth(ly - BASE_YEAR) === lm
}

// 该农历年的月序列（闰月插在对应正常月之后），供 picker 月列直接渲染
function monthList(ly) {
  var out = []
  var leap = inRange(ly) ? leapMonth(ly - BASE_YEAR) : 0
  for (var m = 1; m <= 12; m++) {
    out.push({ m: m, leap: false, name: monthName(m, false) })
    if (leap && leap === m) out.push({ m: m, leap: true, name: monthName(m, true) })
  }
  return out
}

module.exports = {
  BASE_YEAR: BASE_YEAR,
  maxYear: function() {
    return BASE_YEAR + yearCount() - 1
  },
  toSolar: toSolar,
  toSolarStr: toSolarStr,
  fromSolar: fromSolar,
  daysInMonth: daysInMonth,
  isLeapMonth: isLeapMonth,
  monthList: monthList,
  monthName: monthName,
  dayName: dayName,
  fullText: fullText
}
