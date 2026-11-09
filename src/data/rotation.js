/**
 * 晚课（rotation）运行时 —— 手环端
 *
 * 契约与手机端 ev-schedule-android / 同步器 ev-schedule-sync 完全一致：
 *   { enabled, cycle, time, calibDate, calibWeek, cells[week][day] }
 *   week: 0 基（0 = 周期内第 1 周）
 *   day : 0 基（0 = 周一，6 = 周日）
 * 存储 key：ev_rotation_<scheduleIndex>，与导入/导出口径相同（app.ux 里写的也是这个 key）。
 *
 * 设计要点
 * 1. 只在「数据出口」注入一次。所有页面（首页/周视图/全课表/6 个面板/表盘）都走
 *    database.getAllCourses*，在这儿插一条晚课，等于一次改动全覆盖，不必逐页改。
 * 2. 注入必须幂等。database 有内存缓存，同一份数组可能被反复交给调用方，
 *    所以每次先摘掉上一轮插进去的 _rotation 条目，再按当前周次重新插。
 * 3. 晚课不是「第 N 节」，而是「每天最后一节之后的附加课」，因此按 start_time
 *    排序插到正确位置，而不是无脑追加到末尾（时段可能早于最后一节）。
 */
var storage = require("@system.storage")

var KEY_PREFIX = "ev_rotation_"
var DAY_NAMES = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
var DAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"]
var DEFAULT_CYCLE = 3
var DEFAULT_TIME = "17:10 - 18:00"

// index -> 模板（null 表示「确认没有」）。同步注入只能吃这儿的数据。
var cache = {}
// index -> 是否已尝试读过盘（区分「还没读」和「读过了但没有」）
var primed = {}
// index -> 正在等待回调的回调
var waiting = {}

function log(msg) {
  try {
    console.log("[ROT] " + msg)
  } catch (e) {}
}

function toArrayBuffer(raw) {
  return raw
}

/** 接受 JSON 字符串 / 对象，统一成模板；无法识别返回 null */
function normalize(raw) {
  var obj = raw
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw)
    } catch (e) {
      return null
    }
  }
  if (!obj || typeof obj !== "object") {
    return null
  }
  var cycle = parseInt(obj.cycle, 10)
  if (!cycle || cycle < 1) {
    cycle = DEFAULT_CYCLE
  }
  if (cycle > 12) {
    cycle = 12
  }
  var tpl = {
    enabled: obj.enabled === true || obj.enabled === "true",
    cycle: cycle,
    time: obj.time ? String(obj.time) : DEFAULT_TIME,
    calibDate: obj.calibDate ? String(obj.calibDate) : "",
    calibWeek: Math.max(1, parseInt(obj.calibWeek, 10) || 1),
    cells: []
  }
  // cells 两种形态都认：数组 [["语", ...], ...]，对象 {"1":{"0":"语"}}
  var src = obj.cells
  for (var w = 0; w < cycle; w++) {
    var row = []
    for (var d = 0; d < 7; d++) {
      row.push("")
    }
    tpl.cells.push(row)
  }
  if (src && src.length !== undefined) {
    for (var i = 0; i < cycle && i < src.length; i++) {
      var line = src[i]
      if (!line) {
        continue
      }
      for (var d2 = 0; d2 < 7 && d2 < line.length; d2++) {
        tpl.cells[i][d2] = line[d2] == null ? "" : String(line[d2]).trim()
      }
    }
  } else if (src && typeof src === "object") {
    for (var w2 = 1; w2 <= cycle; w2++) {
      var lineObj = src[String(w2)]
      if (!lineObj) {
        continue
      }
      for (var d3 = 0; d3 < 7; d3++) {
        var v = lineObj[String(d3)]
        if (v != null && String(v).length > 0) {
          tpl.cells[w2 - 1][d3] = String(v).trim()
        }
      }
    }
  }
  return tpl
}

function isEmpty(tpl) {
  if (!tpl || !tpl.cells) {
    return true
  }
  for (var w = 0; w < tpl.cells.length; w++) {
    for (var d = 0; d < tpl.cells[w].length; d++) {
      if (tpl.cells[w][d]) {
        return false
      }
    }
  }
  return true
}

/** 已填格数（UI 摘要用） */
function filledCount(tpl) {
  var n = 0
  if (!tpl || !tpl.cells) {
    return 0
  }
  for (var w = 0; w < tpl.cells.length; w++) {
    for (var d = 0; d < tpl.cells[w].length; d++) {
      if (tpl.cells[w][d]) {
        n++
      }
    }
  }
  return n
}

/** 异步读盘并进缓存；同一 index 并发调用会合并成一次读 */
function prime(index, callback) {
  var idx = index == null ? 0 : index
  if (primed[idx]) {
    if (callback) {
      callback(cache[idx] || null)
    }
    return
  }
  if (waiting[idx]) {
    if (callback) {
      waiting[idx].push(callback)
    }
    return
  }
  waiting[idx] = callback ? [callback] : []
  try {
    storage.get({
      key: KEY_PREFIX + idx,
      success: function (raw) {
        cache[idx] = normalize(raw)
        finish(idx)
      },
      fail: function () {
        cache[idx] = null
        finish(idx)
      }
    })
  } catch (e) {
    cache[idx] = null
    finish(idx)
  }
}

function finish(idx) {
  primed[idx] = true
  var cbs = waiting[idx] || []
  delete waiting[idx]
  var tpl = cache[idx] || null
  for (var i = 0; i < cbs.length; i++) {
    try {
      cbs[i](tpl)
    } catch (e) {}
  }
}

/** 同步取缓存（没预热过就是 undefined，调用方需区分「未知」与「没有」） */
function peek(index) {
  var idx = index == null ? 0 : index
  return primed[idx] ? (cache[idx] || null) : undefined
}

function setCache(index, tpl) {
  var idx = index == null ? 0 : index
  cache[idx] = tpl || null
  primed[idx] = true
}

function save(index, tpl, callback) {
  var idx = index == null ? 0 : index
  cache[idx] = tpl || null
  primed[idx] = true
  if (!tpl) {
    try {
      storage.delete({
        key: KEY_PREFIX + idx,
        success: function () {
          if (callback) callback(null)
        },
        fail: function () {
          if (callback) callback(null)
        }
      })
      return
    } catch (e) {
      if (callback) callback(null)
      return
    }
  }
  try {
    storage.set({
      key: KEY_PREFIX + idx,
      value: JSON.stringify(tpl),
      success: function () {
        if (callback) callback(null)
      },
      fail: function (e) {
        if (callback) callback(e)
      }
    })
  } catch (e2) {
    if (callback) callback(e2)
  }
}

function clear(index, callback) {
  save(index, null, callback)
}

/** "2026-09-01" / "2026/9/1" → Date（本地 0 点）；非法返回 null */
function parseDate(str) {
  if (!str) {
    return null
  }
  var m = String(str).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!m) {
    return null
  }
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
}

function weekIndexOf(tpl, date) {
  if (!tpl) {
    return 0
  }
  var cycle = tpl.cycle || 1
  var cal = parseDate(tpl.calibDate)
  if (!cal) {
    // 没校准就固定按第 1 周算，绝不猜
    return 0
  }
  var d = date ? new Date(date.getTime()) : new Date()
  d.setHours(0, 0, 0, 0)
  var diffDays = Math.floor((d.getTime() - cal.getTime()) / 86400000)
  var weeks = Math.floor(diffDays / 7)
  var idx = (tpl.calibWeek - 1) + weeks
  return ((idx % cycle) + cycle) % cycle
}

/** 周一=0 … 周日=6 */
function dayIndexOf(date) {
  var d = date || new Date()
  return (d.getDay() + 6) % 7
}

function cellOf(tpl, week, day) {
  if (!tpl || !tpl.cells || !tpl.cells[week]) {
    return ""
  }
  var v = tpl.cells[week][day]
  return v ? String(v).trim() : ""
}

/** 今天该上哪节晚课；没配置返回空串 */
function todayCell(tpl, date) {
  if (!tpl || !tpl.enabled) {
    return ""
  }
  return cellOf(tpl, weekIndexOf(tpl, date), dayIndexOf(date))
}

function startMinutes(time) {
  var m = String(time || "").match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (!m) {
    return 9999
  }
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

function dayKeyOf(groupDay, i) {
  if (typeof groupDay === "number") {
    // 老数据可能用 1-7 表示周一到周日
    return groupDay >= 1 && groupDay <= 7 ? groupDay - 1 : i
  }
  var s = String(groupDay || "")
  var ci = DAY_NAMES.indexOf(s)
  if (ci >= 0) {
    return ci
  }
  var short = DAY_SHORT.indexOf(s.replace(/^周/, ""))
  return short >= 0 ? short : i
}

/**
 * 把晚课注入 schedule（原地修改并返回）。
 * schedule 形态：[{ day: "星期一", classes: [{id,name,time,...}] }, ...]
 * 幂等：每次先摘掉旧的 _rotation 条目再重插。
 */
function injectInto(schedule, index, date) {
  if (!schedule || !schedule.length) {
    return schedule
  }
  var tpl = peek(index)
  if (tpl === undefined) {
    // 还没预热：这一帧先不显示，同时触发预热 + 通知调用方重绘一次。
    prime(index, null)
    return schedule
  }
  var week = tpl ? weekIndexOf(tpl, date) : 0
  for (var i = 0; i < schedule.length; i++) {
    var group = schedule[i]
    if (!group || !group.classes) {
      continue
    }
    var classes = group.classes
    // 幂等：剔掉上一轮的注入结果
    for (var k = classes.length - 1; k >= 0; k--) {
      if (classes[k] && classes[k]._rotation) {
        classes.splice(k, 1)
      }
    }
    if (!tpl || !tpl.enabled) {
      continue
    }
    var di = dayKeyOf(group.day, i)
    var name = cellOf(tpl, week, di)
    if (!name) {
      continue
    }
    var entry = {
      id: "_rot_" + week + "_" + di,
      name: name,
      time: tpl.time,
      teacher: "",
      location: "",
      notes: "",
      _rotation: true
    }
    // 按开始时间插到正确位置（晚课通常在最后，但不假设）
    var pos = classes.length
    var start = startMinutes(tpl.time)
    for (var j = 0; j < classes.length; j++) {
      if (startMinutes(classes[j] && classes[j].time) > start) {
        pos = j
        break
      }
    }
    classes.splice(pos, 0, entry)
  }
  return schedule
}

/**
 * 长列表视图用的数据：按周分组的扁平条目。
 * 设备端编辑页不做二维格子，用这个直接铺列表。
 *   返回 [{ week: 1, weekLabel: "第1周", items: [{day: 0, dayLabel: "周一", name, time}] }]
 */
function listView(tpl) {
  var out = []
  if (!tpl || !tpl.cells) {
    return out
  }
  var curWeek = weekIndexOf(tpl)
  for (var w = 0; w < tpl.cycle; w++) {
    var items = []
    for (var d = 0; d < 7; d++) {
      var name = cellOf(tpl, w, d)
      items.push({
        day: d,
        dayLabel: "周" + DAY_SHORT[d],
        name: name,
        time: tpl.time,
        isToday: w === curWeek && d === dayIndexOf()
      })
    }
    out.push({
      week: w,
      weekLabel: "第" + (w + 1) + "周",
      isCurrent: w === curWeek,
      items: items
    })
  }
  return out
}

/** 单格写入（设备端列表编辑用），返回新的模板 */
function setCell(tpl, week, day, name) {
  if (!tpl) {
    tpl = normalize({})
  }
  if (!tpl.cells[week]) {
    return tpl
  }
  tpl.cells[week][day] = name == null ? "" : String(name).trim()
  return tpl
}

/** 全部清空（保留周期/时段设置） */
function clearCells(tpl) {
  if (!tpl || !tpl.cells) {
    return tpl
  }
  for (var w = 0; w < tpl.cells.length; w++) {
    for (var d = 0; d < tpl.cells[w].length; d++) {
      tpl.cells[w][d] = ""
    }
  }
  return tpl
}

/** 周期变更时补齐/裁剪行，已填内容尽量保留 */
function setCycle(tpl, cycle) {
  if (!tpl) {
    tpl = normalize({})
  }
  var c = Math.max(1, Math.min(12, parseInt(cycle, 10) || 1))
  while (tpl.cells.length < c) {
    var row = []
    for (var d = 0; d < 7; d++) {
      row.push("")
    }
    tpl.cells.push(row)
  }
  tpl.cells = tpl.cells.slice(0, c)
  tpl.cycle = c
  return tpl
}

/** 摘要文案：「6 周轮转 · 17:10-18:00 · 已填 12 格」/「未启用」 */
function summary(tpl) {
  if (!tpl) {
    return "未设置"
  }
  var head = tpl.cycle + " 周轮转 · " + tpl.time + " · 已填 " + filledCount(tpl) + " 格"
  return tpl.enabled ? head : ("已关闭（" + head + "）")
}

/**
 * 导入 / 备份恢复直接写了 ev_rotation_* 之后必须调用。
 * cache / primed / waiting 是模块级对象，不重置的话 peek() 会一直返回旧模板，
 * 页面看起来像「导入没生效 / 晚课丢了」，直到进程重启才恢复。
 * 用 delete 逐键清，不重新赋值，兼容 const 声明。
 */
function resetCache() {
  for (var k in cache) { if (cache.hasOwnProperty(k)) delete cache[k] }
  for (var p in primed) { if (primed.hasOwnProperty(p)) delete primed[p] }
  for (var w in waiting) { if (waiting.hasOwnProperty(w)) delete waiting[w] }
}

module.exports = {
  KEY_PREFIX: KEY_PREFIX,
  DAY_NAMES: DAY_NAMES,
  DAY_SHORT: DAY_SHORT,
  DEFAULT_CYCLE: DEFAULT_CYCLE,
  DEFAULT_TIME: DEFAULT_TIME,
  normalize: normalize,
  isEmpty: isEmpty,
  filledCount: filledCount,
  prime: prime,
  peek: peek,
  setCache: setCache,
  resetCache: resetCache,
  save: save,
  clear: clear,
  parseDate: parseDate,
  weekIndexOf: weekIndexOf,
  dayIndexOf: dayIndexOf,
  cellOf: cellOf,
  todayCell: todayCell,
  injectInto: injectInto,
  listView: listView,
  setCell: setCell,
  clearCells: clearCells,
  setCycle: setCycle,
  summary: summary
}
