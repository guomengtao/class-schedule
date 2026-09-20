var storage = require("@system.storage")
var scheduleData = require("./schedule.js")

var STORAGE_KEY = "allCourses"
var ready = false
var pendingCallbacks = []
var currentScheduleIndex = 0

var _cache = {}
var _cacheDirty = {}
var _migrationDone = false

// 调试日志开关。这些日志在首屏读取路径上会大量拼接字符串，默认关闭。
var DEBUG = false

function log(msg) {
  if (DEBUG) console.log("[DB] " + msg)
}

var _storeRef = null
function getStore() {
  if (!_storeRef) {
    try { _storeRef = require("./store.js") } catch (e) { _storeRef = null }
  }
  return _storeRef
}

function clearStoreCache() {
  var s = getStore()
  if (s && s.clearCache) {
    try { s.clearCache() } catch (e) {}
  }
}

function logErr(msg) {
  console.error("[DB] " + msg)
}

function formatError(operation, detail) {
  return "[DB] " + operation + ": " + (detail || "unknown error")
}

function migrateOldData(callback) {
  if (_migrationDone) {
    callback()
    return
  }
  storage.get({
    key: "migration_v2_done",
    success: function(done) {
      if (done === "1") {
        _migrationDone = true
        callback()
        return
      }
      _doMigrate(callback)
    },
    fail: function() {
      _doMigrate(callback)
    }
  })
}

function _doMigrate(callback) {
  var targetKey = STORAGE_KEY + "_0"
  storage.get({
    key: STORAGE_KEY,
    success: function(val) {
      if (val) {
        storage.get({
          key: targetKey,
          success: function(existing) {
            if (!existing) {
              storage.set({
                key: targetKey,
                value: val,
                success: function() { _markMigrationDone(callback) },
                fail: function() { _markMigrationDone(callback) }
              })
            } else {
              _markMigrationDone(callback)
            }
          },
          fail: function() {
            storage.set({
              key: targetKey,
              value: val,
              success: function() { _markMigrationDone(callback) },
              fail: function() { _markMigrationDone(callback) }
            })
          }
        })
      } else {
        _markMigrationDone(callback)
      }
    },
    fail: function() { _markMigrationDone(callback) }
  })
}

function _markMigrationDone(callback) {
  _migrationDone = true
  storage.set({
    key: "migration_v2_done",
    value: "1",
    success: function() { callback() },
    fail: function() { callback() }
  })
}

function loadScheduleIndex(callback) {
  storage.get({
    key: "currentScheduleIndex",
    success: function(data) {
      var idx = parseInt(data)
      if (isNaN(idx) || idx < 0) { idx = 0 }
      currentScheduleIndex = idx
      log("loadScheduleIndex: " + currentScheduleIndex)
      if (callback) callback()
    },
    fail: function() {
      currentScheduleIndex = 0
      if (callback) callback()
    }
  })
}

function flushCallbacks() {
  var cbs = pendingCallbacks
  pendingCallbacks = []
  for (var i = 0; i < cbs.length; i++) {
    cbs[i]()
  }
}

function initStorage(callback) {
  log("initStorage: starting")
  loadScheduleIndex(function() {
    log("initStorage: loadScheduleIndex done, calling migrateOldData")
    migrateOldData(function() {
      ready = true
      log("initStorage: migrateOldData done, database ready, flushing " + pendingCallbacks.length + " pending callbacks")
      flushCallbacks()
      if (callback) callback()
    })
  })
}

function ensureReady(callback) {
  if (ready) {
    callback()
    return
  }
  pendingCallbacks.push(callback)
  if (pendingCallbacks.length > 1) return
  initStorage()
}

function invalidateCache(index) {
  if (index !== undefined) {
    delete _cache[index]
    _cacheDirty[index] = true
  } else {
    _cache = {}
    _cacheDirty = {}
  }
}

function getAllCoursesStorageWithIndex(index, callback) {
  if (!_cacheDirty[index] && _cache[index] !== undefined) {
    log("getAllCoursesStorageWithIndex: cache hit, index=" + index)
    callback(_cache[index])
    return
  }
  var key = STORAGE_KEY + "_" + index
  log("getAllCoursesStorageWithIndex, key=" + key)
  storage.get({
    key: key,
    success: function(val) {
      log("getAllCoursesStorageWithIndex: got data, len=" + (val ? val.length : 0))
      if (val) {
        try {
          var data = JSON.parse(val)
          _cache[index] = data
          _cacheDirty[index] = false
          callback(data)
        } catch (e) {
          logErr("getAllCoursesStorageWithIndex parse failed: " + e)
          _cache[index] = []
          _cacheDirty[index] = false
          callback([])
        }
      } else {
        if (index === 0) {
          var seed = JSON.parse(JSON.stringify(scheduleData.schedule))
          saveToStorageWithIndex(0, seed)
          _cache[index] = seed
          _cacheDirty[index] = false
          callback(seed)
        } else {
          _cache[index] = []
          _cacheDirty[index] = false
          callback([])
        }
      }
    },
    fail: function(e) {
      logErr("getAllCoursesStorageWithIndex get failed: " + JSON.stringify(e))
      if (index === 0) {
        var seed = JSON.parse(JSON.stringify(scheduleData.schedule))
        saveToStorageWithIndex(0, seed)
        _cache[index] = seed
        _cacheDirty[index] = false
        callback(seed)
      } else {
        _cache[index] = []
        _cacheDirty[index] = false
        callback([])
      }
    }
  })
}

// 每次写盘成功后累加版本号。首页（index）返回前台时比对这个值，
// 只要不一致就强制重新读盘 —— 解决"从编辑页删除后回首页，列表还留着已删课程"的问题。
function markDataDirty() {
  try {
    storage.set({
      key: STORAGE_KEY + "_dirty",
      value: String(Date.now()),
      success: function() {},
      fail: function() {}
    })
  } catch (e) {}
}

function saveToStorageWithIndex(index, schedule, callback) {
  storage.set({
    key: STORAGE_KEY + "_" + index,
    value: JSON.stringify(schedule),
    success: function() {
      markDataDirty()
      if (callback) callback(null)
    },
    fail: function(e) {
      logErr("saveToStorageWithIndex failed: " + JSON.stringify(e))
      if (callback) callback(formatError("saveToStorageWithIndex", (e && e.message) || JSON.stringify(e)))
    }
  })
}

function getAllCoursesStorage(callback) {
  getAllCoursesStorageWithIndex(currentScheduleIndex, callback)
}

function insertCourseStorage(course, callback) {
  log("insertCourseStorage: " + course.id + " " + course.name)
  storage.get({
    key: STORAGE_KEY + "_" + currentScheduleIndex,
    success: function(val) {
      var schedule = []
      if (val) {
        try { schedule = JSON.parse(val) } catch (e) {
          logErr("insertCourseStorage JSON parse failed: " + e)
          callback(formatError("insertCourseStorage", "JSON parse failed: " + e))
          return
        }
      }
      var dayData = null
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].day === course.day) {
          dayData = schedule[i]
          break
        }
      }
      if (dayData) {
        dayData.classes.push({
          id: course.id,
          name: course.name,
          time: course.time,
          teacher: course.teacher,
          location: course.location,
          notes: course.notes || ""
        })
      } else {
        schedule.push({
          day: course.day,
          classes: [{
            id: course.id,
            name: course.name,
            time: course.time,
            teacher: course.teacher,
            location: course.location,
            notes: course.notes || ""
          }]
        })
      }
      saveToStorageWithIndex(currentScheduleIndex, schedule, function(err) {
        log("insertCourseStorage " + (err ? "failed" : "success"))
        callback(err)
      })
    },
    fail: function(e) {
      logErr("insertCourseStorage get failed: " + JSON.stringify(e))
      callback(formatError("insertCourseStorage", (e && e.message) || JSON.stringify(e)))
    }
  })
}

function updateCourseStorage(course, callback) {
  log("updateCourseStorage: " + course.id)
  storage.get({
    key: STORAGE_KEY + "_" + currentScheduleIndex,
    success: function(val) {
      var schedule = []
      if (val) {
        try { schedule = JSON.parse(val) } catch (e) {
          logErr("updateCourseStorage JSON parse failed: " + e)
          callback(formatError("updateCourseStorage", "JSON parse failed: " + e))
          return
        }
      }
      var hit = false
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].day === course.day) {
          var classes = schedule[i].classes
          for (var j = 0; j < classes.length; j++) {
            if (classes[j].id === course.id) {
              hit = true
              classes[j].name = course.name
              classes[j].time = course.time
              classes[j].teacher = course.teacher
              classes[j].location = course.location
              classes[j].notes = course.notes || ""
              break
            }
          }
          break
        }
      }
      if (!hit) {
        logErr("updateCourseStorage course not found: " + course.id)
        callback(formatError("updateCourseStorage", "课程不存在"))
        return
      }
      saveToStorageWithIndex(currentScheduleIndex, schedule, function(err) {
        log("updateCourseStorage " + (err ? "failed" : "success"))
        callback(err)
      })
    },
    fail: function(e) {
      logErr("updateCourseStorage get failed: " + JSON.stringify(e))
      callback(formatError("updateCourseStorage", (e && e.message) || JSON.stringify(e)))
    }
  })
}

function deleteCourseStorage(id, day, callback) {
  log("deleteCourseStorage: " + id + " " + day)
  storage.get({
    key: STORAGE_KEY + "_" + currentScheduleIndex,
    success: function(val) {
      var schedule = []
      if (val) {
        try { schedule = JSON.parse(val) } catch (e) {
          logErr("deleteCourseStorage JSON parse failed: " + e)
          callback(formatError("deleteCourseStorage", "JSON parse failed: " + e))
          return
        }
      }
      var hit = false
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].day === day) {
          var classes = schedule[i].classes
          var filtered = []
          for (var j = 0; j < classes.length; j++) {
            if (classes[j].id !== id) {
              filtered.push(classes[j])
            }
          }
          if (filtered.length < classes.length) {
            hit = true
          }
          schedule[i].classes = filtered
          break
        }
      }
      if (!hit) {
        logErr("deleteCourseStorage course not found: " + id + " day " + day)
        callback(formatError("deleteCourseStorage", "课程不存在"))
        return
      }
      saveToStorageWithIndex(currentScheduleIndex, schedule, function(err) {
        log("deleteCourseStorage " + (err ? "failed" : "success"))
        callback(err)
      })
    },
    fail: function(e) {
      logErr("deleteCourseStorage get failed: " + JSON.stringify(e))
      callback(formatError("deleteCourseStorage", (e && e.message) || JSON.stringify(e)))
    }
  })
}

// 跨星期更新：把"从原星期删除该 id" + "插入到新星期"合并为一次读 + 一次写盘。
// 避免 updateCourse 先 deleteCourse 再 insertCourse 两段写盘之间插入失败导致课程永久丢失。
function updateCourseAcrossDaysStorage(course, originalDay, callback) {
  log("updateCourseAcrossDaysStorage: " + course.id + " " + originalDay + " -> " + course.day)
  storage.get({
    key: STORAGE_KEY + "_" + currentScheduleIndex,
    success: function(val) {
      var schedule = []
      if (val) {
        try {
          schedule = JSON.parse(val)
        } catch (e) {
          logErr("updateCourseAcrossDaysStorage JSON parse failed: " + e)
          callback(formatError("updateCourseAcrossDaysStorage", "JSON parse failed: " + e))
          return
        }
      }
      // 1) 从原星期删除该 id（移动后旧位置必须清掉）
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].day === originalDay) {
          var classes = schedule[i].classes
          var filtered = []
          for (var j = 0; j < classes.length; j++) {
            if (classes[j].id !== course.id) {
              filtered.push(classes[j])
            }
          }
          schedule[i].classes = filtered
          break
        }
      }
      // 2) 插入到目标星期（若同天，上面已删除，这里重新插入；同一次写盘，原子）
      var dayData = null
      for (var k = 0; k < schedule.length; k++) {
        if (schedule[k].day === course.day) {
          dayData = schedule[k]
          break
        }
      }
      if (dayData) {
        dayData.classes.push({
          id: course.id,
          name: course.name,
          time: course.time,
          teacher: course.teacher,
          location: course.location,
          notes: course.notes || ""
        })
      } else {
        schedule.push({
          day: course.day,
          classes: [{
            id: course.id,
            name: course.name,
            time: course.time,
            teacher: course.teacher,
            location: course.location,
            notes: course.notes || ""
          }]
        })
      }
      saveToStorageWithIndex(currentScheduleIndex, schedule, function(err) {
        log("updateCourseAcrossDaysStorage " + (err ? "failed" : "success"))
        callback(err)
      })
    },
    fail: function(e) {
      logErr("updateCourseAcrossDaysStorage get failed: " + JSON.stringify(e))
      callback(formatError("updateCourseAcrossDaysStorage", (e && e.message) || JSON.stringify(e)))
    }
  })
}

// 把 "HH:MM - HH:MM" 解析为 {s, e} 分钟数；单时刻按点处理；格式异常返回 null
function parseTimeToMinutes(t) {
  if (!t) return null
  var parts = t.split(":")
  if (parts.length < 2) return null
  var h = parseInt(parts[0], 10)
  var m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

function parseTimeRange(timeStr) {
  if (!timeStr) return null
  var segs = timeStr.split(" - ")
  if (segs.length >= 2) {
    var s = parseTimeToMinutes(segs[0])
    var e = parseTimeToMinutes(segs[1])
    if (s === null || e === null) return null
    return { s: s, e: e }
  }
  var p = parseTimeToMinutes(timeStr)
  return p === null ? null : { s: p, e: p }
}

function rangesOverlap(a, b) {
  return a.s < b.e && b.s < a.e
}

// 检测某天是否已有与 newCourse 时间重叠的课程（排除 excludeId）。
// 返回冲突课程对象（含 name/time）或 null。存储解析失败/无数据/无重叠均返回 null（放行）。
function checkDayConflictStorage(day, newCourse, excludeId, callback) {
  storage.get({
    key: STORAGE_KEY + "_" + currentScheduleIndex,
    success: function(val) {
      var schedule = []
      if (val) {
        try {
          schedule = JSON.parse(val)
        } catch (e) {
          logErr("checkDayConflictStorage JSON parse failed: " + e)
          callback(null)
          return
        }
      }
      var nr = parseTimeRange(newCourse.time)
      if (!nr) { callback(null); return }
      var dayData = null
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].day === day) { dayData = schedule[i]; break }
      }
      if (!dayData || !dayData.classes.length) { callback(null); return }
      for (var j = 0; j < dayData.classes.length; j++) {
        var c = dayData.classes[j]
        if (excludeId && c.id === excludeId) continue
        var cr = parseTimeRange(c.time)
        if (!cr) continue
        if (rangesOverlap(nr, cr)) { callback(c); return }
      }
      callback(null)
    },
    fail: function(e) {
      logErr("checkDayConflictStorage get failed: " + JSON.stringify(e))
      callback(null)
    }
  })
}

function clearScheduleByIndexStorage(index, callback) {
  log("clearScheduleByIndexStorage: " + index)
  var key = STORAGE_KEY + "_" + index
  storage.set({
    key: key,
    value: JSON.stringify([]),
    success: function() {
      log("clearScheduleByIndexStorage success")
      if (callback) callback()
    },
    fail: function(e) {
      logErr("clearScheduleByIndexStorage failed: " + JSON.stringify(e))
      if (callback) callback()
    }
  })
}

function deleteScheduleAndShiftStorage(index, totalBeforeDelete, callback) {
  log("deleteScheduleAndShiftStorage: " + index + " total=" + totalBeforeDelete)
  var deletedKey = STORAGE_KEY + "_" + index
  var shiftCount = totalBeforeDelete - index - 1
  storage.delete({
    key: deletedKey,
    success: function() {
      log("deleteScheduleAndShiftStorage: deleted key " + deletedKey)
      if (shiftCount <= 0) {
        if (callback) callback()
        return
      }
      shiftStorageKeysFrom(index + 1, shiftCount, callback)
    },
    fail: function() {
      log("deleteScheduleAndShiftStorage: delete failed, continuing")
      if (shiftCount <= 0) {
        if (callback) callback()
        return
      }
      shiftStorageKeysFrom(index + 1, shiftCount, callback)
    }
  })
}

function shiftStorageKeysFrom(startIndex, count, callback) {
  var done = 0
  for (var i = startIndex; i < startIndex + count; i++) {
    (function(idx) {
      var oldKey = STORAGE_KEY + "_" + idx
      var newKey = STORAGE_KEY + "_" + (idx - 1)
      storage.get({
        key: oldKey,
        success: function(data) {
          var value = data || "[]"
          storage.set({
            key: newKey,
            value: value,
            success: function() {
              storage.delete({
                key: oldKey,
                success: function() {
                  done++
                  if (done >= count && callback) callback()
                },
                fail: function() {
                  done++
                  if (done >= count && callback) callback()
                }
              })
            },
            fail: function() {
              done++
              if (done >= count && callback) callback()
            }
          })
        },
        fail: function() {
          done++
          if (done >= count && callback) callback()
        }
      })
    })(i)
  }
}

function combineAllSchedules(allSchedules) {
  var dayMap = {}
  for (var s = 0; s < allSchedules.length; s++) {
    var days = allSchedules[s]
    for (var d = 0; d < days.length; d++) {
      var dayData = days[d]
      var day = dayData.day
      if (!dayMap[day]) {
        dayMap[day] = []
      }
      var classes = dayData.classes || []
      for (var c = 0; c < classes.length; c++) {
        dayMap[day].push(classes[c])
      }
    }
  }
  var result = []
  var dayOrder = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
  for (var i = 0; i < dayOrder.length; i++) {
    var d = dayOrder[i]
    if (dayMap[d]) {
      result.push({ day: d, classes: dayMap[d] })
    }
  }
  return result
}

module.exports = {
  init: function(callback) {
    ensureReady(callback || function() {})
  },

  getAllCourses: function(callback) {
    log("getAllCourses called, currentIndex=" + currentScheduleIndex)
    ensureReady(function() {
      log("getAllCourses ready, currentIndex=" + currentScheduleIndex)
      getAllCoursesStorage(callback)
    })
  },

  insertCourse: function(course, callback) {
    log("insertCourse called: " + JSON.stringify(course))
    ensureReady(function() {
      insertCourseStorage(course, function(err) {
        if (!err) invalidateCache(currentScheduleIndex)
        if (callback) callback(err)
      })
    })
  },

  updateCourse: function(course, callback) {
    log("updateCourse called: " + JSON.stringify(course))
    ensureReady(function() {
      updateCourseStorage(course, function(err) {
        if (!err) invalidateCache(currentScheduleIndex)
        if (callback) callback(err)
      })
    })
  },

  // 跨星期更新：旧位置删除 + 新位置插入合并为一次原子写盘，杜绝"删成功插失败"丢课
  updateCourseAcrossDays: function(course, originalDay, callback) {
    log("updateCourseAcrossDays called: " + course.id + " " + originalDay + " -> " + course.day)
    ensureReady(function() {
      updateCourseAcrossDaysStorage(course, originalDay, function(err) {
        if (!err) invalidateCache(currentScheduleIndex)
        if (callback) callback(err)
      })
    })
  },

  // 检测某天时间冲突（排除 excludeId）。返回冲突课程对象或 null
  checkDayConflict: function(day, newCourse, excludeId, callback) {
    log("checkDayConflict: " + day + " vs " + (newCourse && newCourse.id))
    ensureReady(function() {
      checkDayConflictStorage(day, newCourse, excludeId, function(c) { callback(c) })
    })
  },

  deleteCourse: function(id, day, callback) {
    log("deleteCourse called: " + id + " " + day)
    ensureReady(function() {
      deleteCourseStorage(id, day, function(err) {
        if (!err) invalidateCache(currentScheduleIndex)
        if (callback) callback(err)
      })
    })
  },

  // 切换课表。写盘后同步清掉 store 的课表序号缓存，避免读到过期值。
  setScheduleIndex: function(index, callback) {
    log("setScheduleIndex: " + index)
    currentScheduleIndex = index
    storage.set({
      key: "currentScheduleIndex",
      value: String(index),
      success: function() {
        clearStoreCache()
        if (callback) callback()
      },
      fail: function() {
        clearStoreCache()
        if (callback) callback()
      }
    })
  },

  // 重置全部内存状态：备份恢复后调用，强制重新从存储加载
  resetCache: function() {
    _cache = {}
    _cacheDirty = {}
    _migrationDone = false
    ready = false
    pendingCallbacks = []
    currentScheduleIndex = 0
    clearStoreCache()
  },

  getScheduleIndex: function() {
    return currentScheduleIndex
  },

  getAllCoursesWithIndex: function(index, callback, forceRefresh) {
    log("getAllCoursesWithIndex: " + index + (forceRefresh ? " (force)" : ""))
    ensureReady(function() {
      if (forceRefresh) invalidateCache(index)
      getAllCoursesStorageWithIndex(index, function(data) {
        callback(data)
      })
    })
  },

  getAllCoursesCombined: function(callback) {
    log("getAllCoursesCombined")
    ensureReady(function() {
      var storage = require("@system.storage")
      storage.get({
        key: "scheduleNames",
        success: function(raw) {
          var names = []
          try { names = JSON.parse(raw || "[]") } catch (e) { names = [] }
          log("getAllCoursesCombined: found " + names.length + " schedules")
          if (names.length === 0) {
            callback([])
            return
          }
          var allSchedules = []
          function loadOne(index) {
            if (index >= names.length) {
              var combined = combineAllSchedules(allSchedules)
              log("getAllCoursesCombined: combined " + combined.length + " days")
              callback(combined)
              return
            }
            getAllCoursesStorageWithIndex(index, function(data) {
              allSchedules.push(data || [])
              loadOne(index + 1)
            })
          }
          loadOne(0)
        },
        fail: function() {
          callback([])
        }
      })
    })
  },

  clearScheduleByIndex: function(index, callback) {
    log("clearScheduleByIndex: " + index)
    ensureReady(function() {
      clearScheduleByIndexStorage(index, function(err) {
        if (!err) invalidateCache(index)
        if (callback) callback(err)
      })
    })
  },

  deleteScheduleAndShift: function(index, totalBeforeDelete, callback) {
    log("deleteScheduleAndShift: " + index + " total=" + totalBeforeDelete)
    ensureReady(function() {
      deleteScheduleAndShiftStorage(index, totalBeforeDelete, function(err) {
        if (!err) {
          invalidateCache(index)
          invalidateCache(index - 1)
        }
        if (callback) callback(err)
      })
    })
  },

  resetToDemoData: function(callback) {
    log("resetToDemoData: starting full reset")
    var self = this
    ensureReady(function() {
      self._doResetToDemoData(callback)
    })
  },

  _doResetToDemoData: function(callback) {
    var coursePool = [
      { name: "数学", teacher: "王老师", location: "301教室" },
      { name: "语文", teacher: "周老师", location: "205教室" },
      { name: "英语", teacher: "李老师", location: "205教室" },
      { name: "物理", teacher: "吴老师", location: "实验室B" },
      { name: "化学", teacher: "郑老师", location: "实验室A" },
      { name: "生物", teacher: "黄老师", location: "实验室C" },
      { name: "历史", teacher: "刘老师", location: "102教室" },
      { name: "地理", teacher: "张老师", location: "103教室" },
      { name: "政治", teacher: "杨老师", location: "104教室" },
      { name: "体育", teacher: "赵老师", location: "操场" },
      { name: "音乐", teacher: "孙老师", location: "音乐室" },
      { name: "美术", teacher: "陈老师", location: "美术室" }
    ]

    var morningTimes = ["08:00 - 08:45", "08:55 - 09:40", "10:00 - 10:45", "10:55 - 11:40"]
    var afternoonTimes = ["14:00 - 14:45", "14:55 - 15:40", "16:00 - 16:45", "16:55 - 17:40"]
    var allTimes = morningTimes.concat(afternoonTimes)
    var days = ["星期一", "星期二", "星期三", "星期四", "星期五"]

    function shuffle(arr) {
      var a = arr.slice()
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1))
        var tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
      }
      return a
    }

    function generateSchedule() {
      var schedule = []
      var idCounter = 1
      for (var d = 0; d < days.length; d++) {
        var dayCourses = []
        var shuffled = shuffle(coursePool)
        for (var t = 0; t < allTimes.length; t++) {
          var course = shuffled[t % shuffled.length]
          dayCourses.push({
            id: String(idCounter),
            name: course.name,
            time: allTimes[t],
            teacher: course.teacher,
            location: course.location,
            notes: ""
          })
          idCounter++
        }
        schedule.push({ day: days[d], classes: dayCourses })
      }
      return schedule
    }

    var schedule1 = generateSchedule()
    var schedule2 = generateSchedule()

    var names = ["课程表1", "课程表2"]

    function saveAll() {
      saveToStorageWithIndex(0, schedule1, function(err1) {
        if (err1) {
          logErr("resetToDemoData: save schedule1 to storage failed: " + err1)
          if (callback) callback(err1)
          return
        }
        saveToStorageWithIndex(1, schedule2, function(err2) {
          if (err2) {
            logErr("resetToDemoData: save schedule2 to storage failed: " + err2)
            if (callback) callback(err2)
            return
          }
          finalizeReset(null)
        })
      })
    }

    function finalizeReset(hadError) {
      invalidateCache()
      clearStoreCache()
      storage.set({
        key: "scheduleNames",
        value: JSON.stringify(names),
        success: function() {
          currentScheduleIndex = 0
          storage.set({
            key: "currentScheduleIndex",
            value: "0",
            success: function() {
              log("resetToDemoData: complete" + (hadError ? " (with errors)" : ""))
              if (callback) callback(hadError || null)
            },
            fail: function(e) {
              logErr("resetToDemoData: failed to set currentScheduleIndex: " + JSON.stringify(e))
              if (callback) callback(formatError("resetToDemoData", "set currentScheduleIndex failed: " + ((e && e.message) || JSON.stringify(e))))
            }
          })
        },
        fail: function(e) {
          logErr("resetToDemoData: failed to set scheduleNames: " + JSON.stringify(e))
          if (callback) callback(formatError("resetToDemoData", "set scheduleNames failed: " + ((e && e.message) || JSON.stringify(e))))
        }
      })
    }

    saveAll()
  },

  resetCoursePresets: function(callback) {
    log("resetCoursePresets: starting")
    var defaultCoursePreset = [
      { name: "语文", time: "08:00 - 08:45", teacher: "老师", location: "" },
      { name: "数学", time: "08:55 - 09:40", teacher: "老师", location: "" },
      { name: "英语", time: "10:00 - 10:45", teacher: "老师", location: "" },
      { name: "物理", time: "10:55 - 11:40", teacher: "老师", location: "" },
      { name: "化学", time: "13:00 - 13:45", teacher: "老师", location: "" },
      { name: "政治", time: "13:55 - 14:40", teacher: "老师", location: "" },
      { name: "音乐", time: "15:00 - 15:45", teacher: "老师", location: "" },
      { name: "体育", time: "15:55 - 16:40", teacher: "老师", location: "" },
      { name: "美术", time: "08:00 - 08:45", teacher: "老师", location: "" },
      { name: "历史", time: "08:55 - 09:40", teacher: "老师", location: "" },
      { name: "地理", time: "10:00 - 10:45", teacher: "老师", location: "" },
      { name: "生物", time: "10:55 - 11:40", teacher: "老师", location: "" }
    ]
    storage.set({
      key: "course_preset_list",
      value: JSON.stringify(defaultCoursePreset),
      success: function() {
        log("resetCoursePresets: complete")
        if (callback) callback(null)
      },
      fail: function(e) {
        logErr("resetCoursePresets: failed: " + JSON.stringify(e))
        if (callback) callback(formatError("resetCoursePresets", (e && e.message) || JSON.stringify(e)))
      }
    })
  },

  resetToEmpty: function(callback) {
    log("resetToEmpty: starting")
    var emptyData = JSON.stringify([])
    var totalKeys = 10
    var completed = 0
    function onComplete() {
      completed++
      if (completed >= totalKeys) {
        finalizeEmpty(callback)
      }
    }
    for (var i = 0; i < totalKeys; i++) {
      storage.set({
        key: STORAGE_KEY + "_" + i,
        value: emptyData,
        success: onComplete,
        fail: function(e) {
          logErr("resetToEmpty: set empty key failed: " + JSON.stringify(e))
          onComplete()
        }
      })
    }

    function finalizeEmpty(cb) {
      invalidateCache()
      clearStoreCache()
      var names = ["课程表1"]
      storage.set({
        key: "scheduleNames",
        value: JSON.stringify(names),
        success: function() {
          storage.set({
            key: "currentScheduleIndex",
            value: "0",
            success: function() {
              log("resetToEmpty: schedule names reset")
              var emptyPreset = []
              storage.set({
                key: "course_preset_list",
                value: JSON.stringify(emptyPreset),
                success: function() {
                  storage.set({
                    key: "remindSettings",
                    value: JSON.stringify({}),
                    success: function() {
                      storage.set({
                        key: "homepage_settings",
                        value: JSON.stringify({}),
                        success: function() {
                          log("resetToEmpty: complete")
                          if (cb) cb(null)
                        },
                        fail: function(e) {
                          logErr("resetToEmpty: homepage_settings failed: " + JSON.stringify(e))
                          if (cb) cb(null)
                        }
                      })
                    },
                    fail: function(e) {
                      logErr("resetToEmpty: remindSettings failed: " + JSON.stringify(e))
                      if (cb) cb(null)
                    }
                  })
                },
                fail: function(e) {
                  logErr("resetToEmpty: course_preset_list failed: " + JSON.stringify(e))
                  if (cb) cb(null)
                }
              })
            },
            fail: function(e) {
              logErr("resetToEmpty: currentScheduleIndex failed: " + JSON.stringify(e))
              if (cb) cb(null)
            }
          })
        },
        fail: function(e) {
          logErr("resetToEmpty: scheduleNames failed: " + JSON.stringify(e))
          if (cb) cb(null)
        }
      })
    }
  }
}