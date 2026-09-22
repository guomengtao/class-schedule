// 内置节假日数据接入层
// 数据源：src/data/holidays-2026.js（国务院办公厅 国办发明电〔2025〕7号）
// 职责：把内置数据写进 @system.storage 的 holiday_data 键，供首页 / 节假日页读取

var preset = require("./holidays-2026.js")

// 内建数据版本号：更换或修正官方数据后，把这里 +1，即可触发一次自动补齐
var VERSION = "builtin-" + preset.year + "-1"
var VERSION_KEY = "holiday_preset_version"
var DATA_KEY = "holiday_data"

var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

// 内置假期默认祝福语（用户可在「节假日与调休」页修改）
var defaultGreetings = {
  "元旦假期": "元旦快乐，新的一年顺顺利利！",
  "春节假期": "新春快乐，阖家幸福！",
  "清明假期": "清明安康，注意出行安全",
  "劳动节假期": "劳动节快乐，好好休息",
  "端午假期": "端午安康，记得吃粽子",
  "中秋假期": "中秋快乐，月圆人团圆",
  "国庆假期": "国庆快乐，祝祖国繁荣昌盛"
}

function greetingFor(name) {
  var g = defaultGreetings[name]
  return g ? g : "节日快乐！"
}

// 把内置数据转成 storage 里的 holiday_data 结构
// holiday: { type:"holiday", name, greeting }
// workday: { type:"workday", dayName, weekDay }
function buildEntries() {
  var map = {}
  var holidays = preset.holidays || []
  var i
  for (i = 0; i < holidays.length; i++) {
    var h = holidays[i]
    if (!h || !h.date) continue
    map[h.date] = {
      type: "holiday",
      name: h.holidayName || "假期",
      greeting: greetingFor(h.holidayName || "假期"),
      builtin: true
    }
  }
  var workdays = preset.workdays || []
  for (i = 0; i < workdays.length; i++) {
    var w = workdays[i]
    if (!w || !w.date) continue
    var weekDay = w.targetWeekDay >= 0 && w.targetWeekDay <= 6 ? w.targetWeekDay : 1
    map[w.date] = {
      type: "workday",
      dayName: dayNames[weekDay],
      weekDay: weekDay,
      builtin: true
    }
  }
  return map
}

function getDataKey(callback) {
  callback(DATA_KEY)
}

function writeMap(map, callback) {
  var storage = require("@system.storage")
  storage.set({
    key: DATA_KEY,
    value: JSON.stringify(map),
    success: function() {
      if (callback) callback(true)
    },
    fail: function() {
      if (callback) callback(false)
    }
  })
}

function writeVersion(callback) {
  var storage = require("@system.storage")
  storage.set({
    key: VERSION_KEY,
    value: VERSION,
    success: function() {
      if (callback) callback()
    },
    fail: function() {
      if (callback) callback()
    }
  })
}

function builtinCount() {
  var map = buildEntries()
  return Object.keys(map).length
}

// 启动补齐：只补「缺失」的日期，不覆盖用户自己改过的记录；已补过则跳过
function ensurePreset(callback) {
  var storage = require("@system.storage")
  storage.get({
    key: VERSION_KEY,
    success: function(v) {
      if (v === VERSION) {
        if (callback) callback(0)
        return
      }
      mergeMissing(callback)
    },
    fail: function() {
      mergeMissing(callback)
    }
  })
}

function mergeMissing(callback) {
  var storage = require("@system.storage")
  storage.get({
    key: DATA_KEY,
    success: function(data) {
      var current = {}
      if (data) {
        try { current = JSON.parse(data) } catch (e) { current = {} }
      }
      var builtin = buildEntries()
      var keys = Object.keys(builtin)
      var added = 0
      for (var i = 0; i < keys.length; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = builtin[keys[i]]
          added++
        }
      }
      if (added === 0) {
        writeVersion(function() {
          if (callback) callback(0)
        })
        return
      }
      writeMap(current, function(ok) {
        writeVersion(function() {
          if (callback) callback(ok ? added : 0)
        })
      })
    },
    fail: function() {
      var builtin = buildEntries()
      writeMap(builtin, function(ok) {
        writeVersion(function() {
          if (callback) callback(ok ? builtinCount() : 0)
        })
      })
    }
  })
}

// 手动恢复：用内置数据覆盖内置日期，用户自定义的日期原样保留
function restoreDefault(callback) {
  var storage = require("@system.storage")
  storage.get({
    key: DATA_KEY,
    success: function(data) {
      var current = {}
      if (data) {
        try { current = JSON.parse(data) } catch (e) { current = {} }
      }
      var builtin = buildEntries()
      var keys = Object.keys(builtin)
      for (var i = 0; i < keys.length; i++) {
        current[keys[i]] = builtin[keys[i]]
      }
      writeMap(current, function(ok) {
        writeVersion(function() {
          if (callback) callback(ok, keys.length)
        })
      })
    },
    fail: function() {
      var builtin = buildEntries()
      writeMap(builtin, function(ok) {
        writeVersion(function() {
          if (callback) callback(ok, builtinCount())
        })
      })
    }
  })
}

module.exports = {
  year: preset.year,
  source: preset.source,
  version: VERSION,
  buildEntries: buildEntries,
  ensurePreset: ensurePreset,
  restoreDefault: restoreDefault,
  getDataKey: getDataKey
}
