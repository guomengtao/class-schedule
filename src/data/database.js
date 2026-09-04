var storage = require("@system.storage")
var scheduleData = require("./schedule.js")

var STORAGE_KEY = "allCourses"
var ready = false
var pendingCallbacks = []
var currentScheduleIndex = 0

function log(msg) {
  console.log("[DB] " + msg)
}

function logErr(msg) {
  console.error("[DB] " + msg)
}

function formatError(operation, detail) {
  return "[DB] " + operation + ": " + (detail || "unknown error")
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

function initStorage(callback) {
  log("initStorage: starting")
  loadScheduleIndex(function() {
    migrateOldData(function() {
      ready = true
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
      insertCourseStorage(course, callback)
    })
  },

  updateCourse: function(course, callback) {
    log("updateCourse called: " + JSON.stringify(course))
    ensureReady(function() {
      updateCourseStorage(course, callback)
    })
  },

  deleteCourse: function(id, day, callback) {
    log("deleteCourse called: " + id + " " + day)
    ensureReady(function() {
      deleteCourseStorage(id, day, callback)
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
      clearScheduleByIndexStorage(index, callback)
    })
  },

  deleteScheduleAndShift: function(index, totalBeforeDelete, callback) {
    log("deleteScheduleAndShift: " + index + " total=" + totalBeforeDelete)
    ensureReady(function() {
      deleteScheduleAndShiftStorage(index, totalBeforeDelete, callback)
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