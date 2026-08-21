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

function getStorageKey() {
  return STORAGE_KEY + "_" + currentScheduleIndex
}

function migrateOldData(callback) {
  storage.get({
    key: STORAGE_KEY,
    success: function(val) {
      if (val) {
        storage.get({
          key: getStorageKey(),
          success: function(existing) {
            if (!existing) {
              storage.set({
                key: getStorageKey(),
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
              key: getStorageKey(),
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
        sql: "CREATE TABLE IF NOT EXISTS courses (id TEXT, day TEXT, name TEXT, time TEXT, teacher TEXT, location TEXT, notes TEXT, PRIMARY KEY (id, day))",
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
    sql: "INSERT OR REPLACE INTO courses (id, day, name, time, teacher, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
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

function saveToStorage(schedule) {
  storage.set({
    key: getStorageKey(),
    value: JSON.stringify(schedule)
  })
}

function getAllCoursesSqlite(callback) {
  log("getAllCoursesSqlite")
  sqlite.executeSql({
    name: DB_NAME,
    sql: "SELECT * FROM courses ORDER BY day, id",
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

function getAllCoursesStorage(callback) {
  log("getAllCoursesStorage, key=" + getStorageKey())
  storage.get({
    key: getStorageKey(),
    success: function(val) {
      log("getAllCoursesStorage: got data, len=" + (val ? val.length : 0))
      if (val) {
        try {
          var data = JSON.parse(val)
          for (var d = 0; d < data.length; d++) {
            log("getAllCoursesStorage: day[" + d + "]=" + data[d].day + " classes=" + data[d].classes.length)
          }
          callback(data)
        } catch (e) {
          logErr("getAllCoursesStorage parse failed: " + e)
          callback([])
        }
      } else {
        if (currentScheduleIndex === 0) {
          var seed = JSON.parse(JSON.stringify(scheduleData.schedule))
          saveToStorage(seed)
          callback(seed)
        } else {
          callback([])
        }
      }
    },
    fail: function(e) {
      logErr("getAllCoursesStorage get failed: " + JSON.stringify(e))
      if (currentScheduleIndex === 0) {
        var seed = JSON.parse(JSON.stringify(scheduleData.schedule))
        saveToStorage(seed)
        callback(seed)
      } else {
        callback([])
      }
    }
  })
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
  log("insertCourseSqlite: " + course.id + " " + course.name)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "INSERT OR REPLACE INTO courses (id, day, name, time, teacher, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [course.id, course.day, course.name, course.time, course.teacher, course.location, course.notes || ""],
    success: function() {
      log("insertCourseSqlite success")
      callback(true)
    },
    fail: function(e) {
      logErr("insertCourseSqlite failed: " + JSON.stringify(e))
      callback(false)
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
        try { schedule = JSON.parse(val) } catch (e) { schedule = [] }
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
      saveToStorage(schedule)
      log("insertCourseStorage success")
      callback(true)
    },
    fail: function(e) {
      logErr("insertCourseStorage get failed: " + JSON.stringify(e))
      callback(false)
    }
  })
}

function updateCourseSqlite(course, callback) {
  log("updateCourseSqlite: " + course.id)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "UPDATE courses SET name = ?, time = ?, teacher = ?, location = ?, notes = ? WHERE id = ? AND day = ?",
    args: [course.name, course.time, course.teacher, course.location, course.notes || "", course.id, course.day],
    success: function() {
      log("updateCourseSqlite success")
      callback(true)
    },
    fail: function(e) {
      logErr("updateCourseSqlite failed: " + JSON.stringify(e))
      callback(false)
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
        try { schedule = JSON.parse(val) } catch (e) { schedule = [] }
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
      saveToStorage(schedule)
      log("updateCourseStorage success")
      callback(true)
    },
    fail: function(e) {
      logErr("updateCourseStorage get failed: " + JSON.stringify(e))
      callback(false)
    }
  })
}

function deleteCourseSqlite(id, day, callback) {
  log("deleteCourseSqlite: " + id + " " + day)
  sqlite.executeSql({
    name: DB_NAME,
    sql: "DELETE FROM courses WHERE id = ? AND day = ?",
    args: [id, day],
    success: function() {
      log("deleteCourseSqlite success")
      callback(true)
    },
    fail: function(e) {
      logErr("deleteCourseSqlite failed: " + JSON.stringify(e))
      callback(false)
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
        try { schedule = JSON.parse(val) } catch (e) { schedule = [] }
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
      saveToStorage(schedule)
      log("deleteCourseStorage success")
      callback(true)
    },
    fail: function(e) {
      logErr("deleteCourseStorage get failed: " + JSON.stringify(e))
      callback(false)
    }
  })
}

module.exports = {
  init: function(callback) {
    ensureReady(callback || function() {})
  },

  getAllCourses: function(callback) {
    log("getAllCourses called, useSqlite=" + useSqlite)
    ensureReady(function() {
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
  }
}