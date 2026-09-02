var sqlite = null
var storage = require("@system.storage")
var scheduleData = require("./schedule.js")

try {
  sqlite = require("@system.sqlite")
} catch (e) {
  console.error("[DB] sqlite module not available: " + e)
}

var DB_NAME = "schedule.db"
var STORAGE_KEY = "allCourses"
var ready = false
var pendingCallbacks = []
var useSqlite = false
var initTimer = null
var currentScheduleIndex = 0

function log(msg) {
  console.log("[DB] " + msg)
}

function logErr(msg) {
  console.error("[DB] " + msg)
}

function formatError(operation, detail) {
  return "[DB] " + operation + ": " + (detail || "未知错误")
}

function getStorageKey() {
  return STORAGE_KEY + "_" + currentScheduleIndex
}

function migrateOldData(callback) {
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
                success: function() { callback() },
                fail: function() { callback() }
              })
            } else {
              callback()
            }
          },
          fail: function() {
            storage.set({
              key: targetKey,
              value: val,
              success: function() { callback() },
              fail: function() { callback() }
            })
          }
        })
      } else {
        callback()
      }
    },
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

function initSqlite(callback) {
  if (!sqlite) {
    log("sqlite module not available, skip to storage")
    fallbackToStorage(callback)
    return
  }
  log("trying sqlite.openDatabase: " + DB_NAME)
  var finished = false

  initTimer = setTimeout(function() {
    if (finished) return
    finished = true
    logErr("sqlite.openDatabase TIMEOUT after 2s")
    fallbackToStorage(callback)
  }, 2000)

  sqlite.openDatabase({
    name: DB_NAME,
    success: function() {
      if (finished) return
      finished = true
      clearTimeout(initTimer)
      log("sqlite.openDatabase success")
      sqlite.executeSql({
        name: DB_NAME,
        sql: "CREATE TABLE IF NOT EXISTS courses (id TEXT, day TEXT, name TEXT, time TEXT, teacher TEXT, location TEXT, notes TEXT, schedule_index TEXT DEFAULT '0', PRIMARY KEY (id, day, schedule_index))",
        success: function() {
          log("CREATE TABLE success")
          ready = true
          loadScheduleIndex(function() {
            seedFromSqlite(function() {
              flushCallbacks()
              if (callback) callback()
            })
          })
        },
        fail: function(e) {
          logErr("CREATE TABLE failed: " + JSON.stringify(e))
          ready = true
          loadScheduleIndex(function() {
            flushCallbacks()
            if (callback) callback()
          })
        }
      })
    },
    fail: function(e) {
      if (finished) return
      finished = true
      clearTimeout(initTimer)
      logErr("sqlite.openDatabase failed: " + JSON.stringify(e))
      fallbackToStorage(callback)
    }
  })
}

function fallbackToStorage(callback) {
  log("falling back to @system.storage")
  useSqlite = false
  ready = true
  loadScheduleIndex(function() {
    migrateOldData(function() {
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
  initSqlite()
}

function seedFromSqlite(callback) {
  log("seedFromSqlite: checking count")
  sqlite.executeSql({
    name: DB_NAME,
    sql: "SELECT COUNT(*) AS cnt FROM courses",
    success: function(result) {
      var count = 0
      if (result && result.data && result.data.length > 0) {
        count = result.data[0].cnt || 0
      }
      log("seedFromSqlite: count=" + count)
      if (count > 0) {
        callback()
        return
      }
      insertDefaultCoursesSqlite(0, callback)
    },
    fail: function(e) {
      logErr("seedFromSqlite SELECT failed: " + JSON.stringify(e))
      insertDefaultCoursesSqlite(0, callback)
    }
  })
}

function insertDefaultCoursesSqlite(index, callback) {
  var days = scheduleData.schedule
  if (index >= days.length) {
    log("seedFromSqlite: all " + days.length + " days seeded")
    callback()
    return
  }
  var dayEntry = days[index]
  var day = dayEntry.day
  var classes = dayEntry.classes
  insertDayCoursesSqlite(day, classes, 0, function() {
    insertDefaultCoursesSqlite(index + 1, callback)
  })
}

function insertDayCoursesSqlite(day, classes, index, callback) {
  if (index >= classes.length) {
    callback()
    return
  }
  var c = classes[index]
  sqlite.executeSql({
    name: DB_NAME,
    sql: "INSERT OR REPLACE INTO courses (id, day, name, time, teacher, location, notes, schedule_index) VALUES (?, ?, ?, ?, ?, ?, ?, '0')",
    args: [c.id, day, c.name, c.time, c.teacher, c.location, c.notes || ""],
    success: function() {
      insertDayCoursesSqlite(day, classes, index + 1, callback)
    },
    fail: function(e) {
      logErr("seed insert failed: " + JSON.stringify(e))
      insertDayCoursesSqlite(day, classes, index + 1, callback)
    }
  })
}

function loadFromStorage() {
  var data = null
  storage.get({
    key: STORAGE_KEY,
    success: function(val) {
      try {
        data = JSON.parse(val)
      } catch (e) {
        data = null
      }
    },
    fail: function() {
      data = null
    }
  })
  return data
}

function saveToStorage(schedule, callback) {
  storage.set({
    key: getStorageKey(),
    value: JSON.stringify(schedule),
    success: function() {
      if (callback) callback(null)
    },
    fail: function(e) {
      logErr("saveToStorage failed: " + JSON.stringify(e))
      if (callback) callback(formatError("saveToStorage", (e && e.message) || JSON.stringify(e)))
    }
  })
}

function getAllCoursesSqlite(callback) {
  log("getAllCoursesSqlite, scheduleIndex=" + currentScheduleIndex)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "SELECT * FROM courses WHERE schedule_index = ? ORDER BY day, id",
    args: [String(currentScheduleIndex)],
    success: function(result) {
      var rows = (result && result.data) ? result.data : []
      log("getAllCoursesSqlite: " + rows.length + " rows")
      callback(rowsToSchedule(rows))
    },
    fail: function(e) {
      logErr("getAllCoursesSqlite failed: " + JSON.stringify(e))
      callback([])
    }
  })
}

function getAllCoursesSqliteWithIndex(index, callback) {
  log("getAllCoursesSqliteWithIndex: " + index)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "SELECT * FROM courses WHERE schedule_index = ? ORDER BY day, id",
    args: [String(index)],
    success: function(result) {
      var rows = (result && result.data) ? result.data : []
      log("getAllCoursesSqliteWithIndex: " + rows.length + " rows")
      callback(rowsToSchedule(rows))
    },
    fail: function(e) {
      logErr("getAllCoursesSqliteWithIndex failed: " + JSON.stringify(e))
      callback([])
    }
  })
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

function getAllCoursesStorageWithIndex(index, callback) {
  var key = STORAGE_KEY + "_" + index
  log("getAllCoursesStorageWithIndex, key=" + key)
  storage.get({
    key: key,
    success: function(val) {
      log("getAllCoursesStorageWithIndex: got data, len=" + (val ? val.length : 0))
      if (val) {
        try {
          var data = JSON.parse(val)
          for (var d = 0; d < data.length; d++) {
            log("getAllCoursesStorageWithIndex: day[" + d + "]=" + data[d].day + " classes=" + data[d].classes.length)
          }
          callback(data)
        } catch (e) {
          logErr("getAllCoursesStorageWithIndex parse failed: " + e)
          callback([])
        }
      } else {
        if (index === 0) {
          var seed = JSON.parse(JSON.stringify(scheduleData.schedule))
          saveToStorageWithIndex(0, seed)
          callback(seed)
        } else {
          callback([])
        }
      }
    },
    fail: function(e) {
      logErr("getAllCoursesStorageWithIndex get failed: " + JSON.stringify(e))
      if (index === 0) {
        var seed = JSON.parse(JSON.stringify(scheduleData.schedule))
        saveToStorageWithIndex(0, seed)
        callback(seed)
      } else {
        callback([])
      }
    }
  })
}

function saveToStorageWithIndex(index, schedule, callback) {
  storage.set({
    key: STORAGE_KEY + "_" + index,
    value: JSON.stringify(schedule),
    success: function() {
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

function rowsToSchedule(rows) {
  var schedule = []
  var dayMap = {}
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i]
    if (!dayMap[row.day]) {
      dayMap[row.day] = { day: row.day, classes: [] }
      schedule.push(dayMap[row.day])
    }
    dayMap[row.day].classes.push({
      id: row.id,
      name: row.name,
      time: row.time,
      teacher: row.teacher,
      location: row.location,
      notes: row.notes || ""
    })
  }
  return schedule
}

function insertCourseSqlite(course, callback) {
  log("insertCourseSqlite: " + course.id + " " + course.name + " scheduleIndex=" + currentScheduleIndex)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "INSERT OR REPLACE INTO courses (id, day, name, time, teacher, location, notes, schedule_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [course.id, course.day, course.name, course.time, course.teacher, course.location, course.notes || "", String(currentScheduleIndex)],
    success: function() {
      log("insertCourseSqlite success")
      callback(null)
    },
    fail: function(e) {
      logErr("insertCourseSqlite failed: " + JSON.stringify(e))
      callback(formatError("insertCourseSqlite", (e && e.message) || JSON.stringify(e)))
    }
  })
}

function insertCourseStorage(course, callback) {
  log("insertCourseStorage: " + course.id + " " + course.name)
  storage.get({
    key: getStorageKey(),
    success: function(val) {
      var schedule = []
      if (val) {
        try { schedule = JSON.parse(val) } catch (e) {
          logErr("insertCourseStorage JSON parse failed: " + e)
          callback(formatError("insertCourseStorage", "JSON解析失败: " + e))
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
      saveToStorage(schedule, function(err) {
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

function updateCourseSqlite(course, callback) {
  log("updateCourseSqlite: " + course.id)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "UPDATE courses SET name = ?, time = ?, teacher = ?, location = ?, notes = ? WHERE id = ? AND day = ? AND schedule_index = ?",
    args: [course.name, course.time, course.teacher, course.location, course.notes || "", course.id, course.day, String(currentScheduleIndex)],
    success: function() {
      log("updateCourseSqlite success")
      callback(null)
    },
    fail: function(e) {
      logErr("updateCourseSqlite failed: " + JSON.stringify(e))
      callback(formatError("updateCourseSqlite", (e && e.message) || JSON.stringify(e)))
    }
  })
}

function updateCourseStorage(course, callback) {
  log("updateCourseStorage: " + course.id)
  storage.get({
    key: getStorageKey(),
    success: function(val) {
      var schedule = []
      if (val) {
        try { schedule = JSON.parse(val) } catch (e) {
          logErr("updateCourseStorage JSON parse failed: " + e)
          callback(formatError("updateCourseStorage", "JSON解析失败: " + e))
          return
        }
      }
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].day === course.day) {
          var classes = schedule[i].classes
          for (var j = 0; j < classes.length; j++) {
            if (classes[j].id === course.id) {
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
      saveToStorage(schedule, function(err) {
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

function deleteCourseSqlite(id, day, callback) {
  log("deleteCourseSqlite: " + id + " " + day)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "DELETE FROM courses WHERE id = ? AND day = ? AND schedule_index = ?",
    args: [id, day, String(currentScheduleIndex)],
    success: function() {
      log("deleteCourseSqlite success")
      callback(null)
    },
    fail: function(e) {
      logErr("deleteCourseSqlite failed: " + JSON.stringify(e))
      callback(formatError("deleteCourseSqlite", (e && e.message) || JSON.stringify(e)))
    }
  })
}

function deleteCourseStorage(id, day, callback) {
  log("deleteCourseStorage: " + id + " " + day)
  storage.get({
    key: getStorageKey(),
    success: function(val) {
      var schedule = []
      if (val) {
        try { schedule = JSON.parse(val) } catch (e) {
          logErr("deleteCourseStorage JSON parse failed: " + e)
          callback(formatError("deleteCourseStorage", "JSON解析失败: " + e))
          return
        }
      }
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].day === day) {
          var classes = schedule[i].classes
          var filtered = []
          for (var j = 0; j < classes.length; j++) {
            if (classes[j].id !== id) {
              filtered.push(classes[j])
            }
          }
          schedule[i].classes = filtered
          break
        }
      }
      saveToStorage(schedule, function(err) {
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

function clearScheduleByIndexSqlite(index, callback) {
  log("clearScheduleByIndexSqlite: " + index)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "DELETE FROM courses WHERE schedule_index = ?",
    args: [String(index)],
    success: function() {
      log("clearScheduleByIndexSqlite success")
      if (callback) callback()
    },
    fail: function(e) {
      logErr("clearScheduleByIndexSqlite failed: " + JSON.stringify(e))
      if (callback) callback()
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

function deleteScheduleAndShiftSqlite(index, totalBeforeDelete, callback) {
  log("deleteScheduleAndShiftSqlite: " + index + " total=" + totalBeforeDelete)
  var allDone = function() {
    if (callback) callback()
  }
  var doneCount = 0
  var totalOps = 1 + (totalBeforeDelete - index - 1)
  if (totalOps <= 0) {
    allDone()
    return
  }
  var checkDone = function() {
    doneCount++
    if (doneCount >= totalOps) {
      allDone()
    }
  }
  sqlite.executeSql({
    name: DB_NAME,
    sql: "DELETE FROM courses WHERE schedule_index = ?",
    args: [String(index)],
    success: function() {
      log("deleteScheduleAndShiftSqlite: deleted index " + index)
      checkDone()
    },
    fail: function(e) {
      logErr("deleteScheduleAndShiftSqlite delete failed: " + JSON.stringify(e))
      checkDone()
    }
  })
  for (var i = index + 1; i < totalBeforeDelete; i++) {
    (function(idx) {
      sqlite.executeSql({
        name: DB_NAME,
        sql: "UPDATE courses SET schedule_index = ? WHERE schedule_index = ?",
        args: [String(idx - 1), String(idx)],
        success: function() {
          checkDone()
        },
        fail: function(e) {
          logErr("deleteScheduleAndShiftSqlite update failed: " + JSON.stringify(e))
          checkDone()
        }
      })
    })(i)
  }
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

module.exports = {
  init: function(callback) {
    ensureReady(callback || function() {})
  },

  getAllCourses: function(callback) {
    log("getAllCourses called, useSqlite=" + useSqlite + ", currentIndex=" + currentScheduleIndex)
    ensureReady(function() {
      log("getAllCourses ready, currentIndex=" + currentScheduleIndex)
      if (useSqlite) {
        getAllCoursesSqlite(callback)
      } else {
        getAllCoursesStorage(callback)
      }
    })
  },

  insertCourse: function(course, callback) {
    log("insertCourse called: " + JSON.stringify(course))
    ensureReady(function() {
      if (useSqlite) {
        insertCourseSqlite(course, callback)
      } else {
        insertCourseStorage(course, callback)
      }
    })
  },

  updateCourse: function(course, callback) {
    log("updateCourse called: " + JSON.stringify(course))
    ensureReady(function() {
      if (useSqlite) {
        updateCourseSqlite(course, callback)
      } else {
        updateCourseStorage(course, callback)
      }
    })
  },

  deleteCourse: function(id, day, callback) {
    log("deleteCourse called: " + id + " " + day)
    ensureReady(function() {
      if (useSqlite) {
        deleteCourseSqlite(id, day, callback)
      } else {
        deleteCourseStorage(id, day, callback)
      }
    })
  },

  setScheduleIndex: function(index, callback) {
    log("setScheduleIndex: " + index)
    currentScheduleIndex = index
    storage.set({
      key: "currentScheduleIndex",
      value: String(index),
      success: function() {
        log("setScheduleIndex saved")
        if (callback) callback()
      },
      fail: function() {
        if (callback) callback()
      }
    })
  },

  getScheduleIndex: function() {
    return currentScheduleIndex
  },

  getAllCoursesWithIndex: function(index, callback) {
    log("getAllCoursesWithIndex: " + index)
    ensureReady(function() {
      if (useSqlite) {
        getAllCoursesSqliteWithIndex(index, function(data) {
          callback(data)
        })
      } else {
        getAllCoursesStorageWithIndex(index, function(data) {
          callback(data)
        })
      }
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
          var loaded = 0
          function loadOne(index) {
            if (index >= names.length) {
              var combined = combineAllSchedules(allSchedules)
              log("getAllCoursesCombined: combined " + combined.length + " days")
              callback(combined)
              return
            }
            getAllCoursesStorageWithIndex(index, function(data) {
              allSchedules.push(data || [])
              loaded++
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
      if (useSqlite) {
        clearScheduleByIndexSqlite(index, callback)
      } else {
        clearScheduleByIndexStorage(index, callback)
      }
    })
  },

  deleteScheduleAndShift: function(index, totalBeforeDelete, callback) {
    log("deleteScheduleAndShift: " + index + " total=" + totalBeforeDelete)
    ensureReady(function() {
      if (useSqlite) {
        deleteScheduleAndShiftSqlite(index, totalBeforeDelete, callback)
      } else {
        deleteScheduleAndShiftStorage(index, totalBeforeDelete, callback)
      }
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
      if (useSqlite) {
        sqlite.executeSql({
          name: DB_NAME,
          sql: "DELETE FROM courses",
          success: function() {
            insertScheduleToSqlite(0, schedule1, function(s1Err) {
              insertScheduleToSqlite(1, schedule2, function(s2Err) {
                finalizeReset(s1Err || s2Err)
              })
            })
          },
          fail: function(e) {
            logErr("resetToDemoData: DELETE FROM courses failed: " + JSON.stringify(e))
            if (callback) callback(formatError("resetToDemoData", "DELETE courses失败: " + ((e && e.message) || JSON.stringify(e))))
          }
        })
      } else {
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
    }

    function insertScheduleToSqlite(scheduleIndex, schedule, cb) {
      var allCourses = []
      for (var d = 0; d < schedule.length; d++) {
        var day = schedule[d].day
        var classes = schedule[d].classes
        for (var c = 0; c < classes.length; c++) {
          var course = classes[c]
          allCourses.push({
            id: course.id,
            day: day,
            name: course.name,
            time: course.time,
            teacher: course.teacher,
            location: course.location,
            notes: course.notes || "",
            scheduleIndex: String(scheduleIndex)
          })
        }
      }
      insertBatchSqlite(allCourses, 0, cb)
    }

    function insertBatchSqlite(courses, index, cb, errorCount) {
      if (errorCount === undefined) errorCount = 0
      if (index >= courses.length) {
        if (errorCount > 0) {
          logErr("resetToDemoData: " + errorCount + " of " + courses.length + " inserts failed")
          cb(formatError("resetToDemoData", errorCount + " of " + courses.length + " 条插入失败"))
        } else {
          cb(null)
        }
        return
      }
      var c = courses[index]
      sqlite.executeSql({
        name: DB_NAME,
        sql: "INSERT OR REPLACE INTO courses (id, day, name, time, teacher, location, notes, schedule_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [c.id, c.day, c.name, c.time, c.teacher, c.location, c.notes, c.scheduleIndex],
        success: function() {
          insertBatchSqlite(courses, index + 1, cb, errorCount)
        },
        fail: function(e) {
          logErr("reset insert failed: " + JSON.stringify(e))
          insertBatchSqlite(courses, index + 1, cb, errorCount + 1)
        }
      })
    }

    function finalizeReset(hadError) {
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
              if (callback) callback(formatError("resetToDemoData", "设置currentScheduleIndex失败: " + ((e && e.message) || JSON.stringify(e))))
            }
          })
        },
        fail: function(e) {
          logErr("resetToDemoData: failed to set scheduleNames: " + JSON.stringify(e))
          if (callback) callback(formatError("resetToDemoData", "设置scheduleNames失败: " + ((e && e.message) || JSON.stringify(e))))
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
    ensureReady(function() {
      if (useSqlite) {
        sqlite.executeSql({
          name: DB_NAME,
          sql: "DELETE FROM courses",
          success: function() {
            finalizeEmpty(callback)
          },
          fail: function(e) {
            logErr("resetToEmpty: DELETE FROM courses failed: " + JSON.stringify(e))
            if (callback) callback(formatError("resetToEmpty", "DELETE courses失败: " + ((e && e.message) || JSON.stringify(e))))
          }
        })
      } else {
        var totalKeys = 10
        var completedDeletes = 0
        var deleteError = null
        function onDeleteComplete() {
          completedDeletes++
          if (completedDeletes >= totalKeys) {
            finalizeEmpty(callback)
          }
        }
        for (var i = 0; i < totalKeys; i++) {
          storage.delete({
            key: STORAGE_KEY + "_" + i,
            success: onDeleteComplete,
            fail: function(e) {
              logErr("resetToEmpty: delete key failed: " + JSON.stringify(e))
              deleteError = formatError("resetToEmpty", "删除存储key失败: " + ((e && e.message) || JSON.stringify(e)))
              onDeleteComplete()
            }
          })
        }
      }
    })

    function finalizeEmpty(cb) {
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
                  log("resetToEmpty: complete")
                  if (cb) cb(null)
                },
                fail: function(e) {
                  logErr("resetToEmpty: failed to set course_preset_list: " + JSON.stringify(e))
                  if (cb) cb(formatError("resetToEmpty", "设置course_preset_list失败: " + ((e && e.message) || JSON.stringify(e))))
                }
              })
            },
            fail: function(e) {
              logErr("resetToEmpty: failed to set currentScheduleIndex: " + JSON.stringify(e))
              if (cb) cb(formatError("resetToEmpty", "设置currentScheduleIndex失败: " + ((e && e.message) || JSON.stringify(e))))
            }
          })
        },
        fail: function(e) {
          logErr("resetToEmpty: failed to set scheduleNames: " + JSON.stringify(e))
          if (cb) cb(formatError("resetToEmpty", "设置scheduleNames失败: " + ((e && e.message) || JSON.stringify(e))))
        }
      })
    }
  }
}