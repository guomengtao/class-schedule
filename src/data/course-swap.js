// 临时调课数据层 —— 按日期覆盖，结构与 holiday_data 同构
// 设计要点：
// 1. 基础周课表只读。覆盖表以 dateStr 为一级键、courseId 为二级键，
//    日期一过自然失效，「以后课表不变」无需额外清理逻辑。
// 2. 一次交换写两条记录、共享 group，整表一次 storage.set 完成，等价于一个事务。
// 3. time / id / 节次属于「格位」，不进覆盖表，避免跨节次交换时时间串位。

var storage = require("@system.storage")

var DATA_KEY = "course_swap_data"

function pad2(n) {
  return n < 10 ? "0" + n : String(n)
}

function dateStrOf(d) {
  var date = d || new Date()
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate())
}

function plusDays(d, n) {
  var date = new Date(d.getTime())
  date.setDate(date.getDate() + n)
  return date
}

function readAll(callback) {
  storage.get({
    key: DATA_KEY,
    success: function(raw) {
      if (!raw) {
        callback({})
        return
      }
      try {
        callback(JSON.parse(raw) || {})
      } catch (e) {
        callback({})
      }
    },
    fail: function() {
      callback({})
    }
  })
}

function writeAll(data, callback) {
  storage.set({
    key: DATA_KEY,
    value: JSON.stringify(data),
    success: function() {
      if (callback) callback(true)
    },
    fail: function() {
      if (callback) callback(false)
    }
  })
}

// 取某天的覆盖映射：{ courseId -> { name, teacher, location, from, fromId, group } }
function getOverridesForDate(dateStr, callback) {
  readAll(function(data) {
    callback(data[dateStr] || {})
  })
}

// 一次交换 = 两条覆盖记录，内容互换，格位（日期 + courseId + 时间）不动
function applySwap(pair, callback) {
  readAll(function(data) {
    var group = pair.group || ("g" + Date.now())
    var a = pair.a
    var b = pair.b
    if (!a || !b || !a.date || !b.date || !a.courseId || !b.courseId) {
      if (callback) callback(false)
      return
    }
    if (!data[a.date]) data[a.date] = {}
    if (!data[b.date]) data[b.date] = {}
    data[a.date][a.courseId] = {
      name: b.name || "",
      teacher: b.teacher || "",
      location: b.location || "",
      from: b.date,
      fromId: b.courseId,
      group: group
    }
    data[b.date][b.courseId] = {
      name: a.name || "",
      teacher: a.teacher || "",
      location: a.location || "",
      from: a.date,
      fromId: a.courseId,
      group: group
    }
    writeAll(data, callback)
  })
}

// 清掉若干日期的全部覆盖。撤销入口用今天 + 明天，避免跨天交换只清一半。
function clearDates(dates, callback) {
  readAll(function(data) {
    for (var i = 0; i < dates.length; i++) {
      delete data[dates[i]]
    }
    writeAll(data, callback)
  })
}

function clearDate(dateStr, callback) {
  clearDates([dateStr], callback)
}

// 按组撤销：把同一次交换的两条记录（可能跨两天）一起摘掉
function clearGroup(group, callback) {
  if (!group) {
    if (callback) callback(true)
    return
  }
  readAll(function(data) {
    var dates = Object.keys(data)
    for (var i = 0; i < dates.length; i++) {
      var day = data[dates[i]]
      var ids = Object.keys(day)
      for (var j = 0; j < ids.length; j++) {
        if (day[ids[j]] && day[ids[j]].group === group) delete day[ids[j]]
      }
      if (Object.keys(day).length === 0) delete data[dates[i]]
    }
    writeAll(data, callback)
  })
}

module.exports = {
  DATA_KEY: DATA_KEY,
  dateStrOf: dateStrOf,
  plusDays: plusDays,
  readAll: readAll,
  getOverridesForDate: getOverridesForDate,
  applySwap: applySwap,
  clearDates: clearDates,
  clearDate: clearDate,
  clearGroup: clearGroup
}
