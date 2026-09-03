function updateStatus(instance) {
  instance.currentClass = null
  instance.nextClass = null
  instance.upcomingClass = null
  instance.upcomingClassDay = ""
  var now = new Date()
  var nowMinutes = now.getHours() * 60 + now.getMinutes()
  var realTodayIdx = new Date().getDay()
  if (instance.currentDayIndex === realTodayIdx) {
    computeTodayStatus(instance, nowMinutes)
  }
  if (!instance.currentClass && !instance.nextClass) {
    findUpcomingClass(instance, realTodayIdx)
  }
  updateStatusLine(instance)
}

function updateStatusLine(instance) {
  if (instance.currentClass) {
    instance.statusTag = "上课中"
    instance.statusMainText = instance.currentClass.name
    var remaining = instance.currentClass.remaining > 0
      ? Math.ceil(instance.currentClass.remaining) + "min"
      : "即将结束"
    instance.statusTimeText = remaining
  } else if (instance.nextClass) {
    instance.statusTag = "即将上课"
    instance.statusMainText = instance.nextClass.name
    instance.statusTimeText = Math.ceil(instance.nextClass.waitMin) + "min后"
  } else if (instance.upcomingClass) {
    instance.statusTag = "有课"
    instance.statusMainText = instance.upcomingClass.name + " " + instance.upcomingClass.day
    instance.statusTimeText = instance.upcomingClass.time
  } else {
    instance.statusTag = "暂无"
    instance.statusMainText = "今日无课程安排"
    instance.statusTimeText = ""
  }
}

function computeTodayStatus(instance, nowMinutes) {
  var todayClasses = instance.currentClasses
  if (!todayClasses || todayClasses.length === 0) return
  var parsed = []
  for (var i = 0; i < todayClasses.length; i++) {
    var cls = todayClasses[i]
    var timeParts = cls.time.split("-")
    if (timeParts.length < 2) continue
    var startMin = parseTime(timeParts[0].trim())
    var endMin = parseTime(timeParts[1].trim())
    parsed.push({
      id: cls.id,
      name: cls.name,
      startMin: startMin,
      endMin: endMin,
      startTime: timeParts[0].trim()
    })
  }
  parsed.sort(function(a, b) { return a.startMin - b.startMin })
  var current = null
  var next = null
  for (var i = 0; i < parsed.length; i++) {
    var cls = parsed[i]
    if (nowMinutes >= cls.startMin && nowMinutes <= cls.endMin) {
      current = {
        name: cls.name,
        remaining: Math.round((cls.endMin - nowMinutes) * 10) / 10,
        id: cls.id
      }
      if (i + 1 < parsed.length) {
        var nxt = parsed[i + 1]
        next = {
          name: nxt.name,
          startTime: nxt.startTime,
          waitMin: Math.round((nxt.startMin - nowMinutes) * 10) / 10,
          id: nxt.id
        }
      }
      break
    }
    if (nowMinutes < cls.startMin && (!next || cls.startMin < next.startMin)) {
      next = {
        name: cls.name,
        startTime: cls.startTime,
        waitMin: Math.round((cls.startMin - nowMinutes) * 10) / 10,
        id: cls.id
      }
    }
  }
  instance.currentClass = current
  instance.nextClass = next
}

function findUpcomingClass(instance, realTodayIdx) {
  var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
  if (!instance.schedule || instance.schedule.length === 0) return
  var now = new Date()
  var nowMinutes = now.getHours() * 60 + now.getMinutes()
  for (var offset = 0; offset < 7; offset++) {
    var checkIdx = (realTodayIdx + offset) % 7
    var checkDay = dayNames[checkIdx]
    var dayData = null
    for (var d = 0; d < instance.schedule.length; d++) {
      if (instance.schedule[d].day === checkDay) { dayData = instance.schedule[d]; break }
    }
    if (!dayData || !dayData.classes || dayData.classes.length === 0) continue
    var parsed = []
    for (var i = 0; i < dayData.classes.length; i++) {
      var cls = dayData.classes[i]
      var timeParts = cls.time.split("-")
      if (timeParts.length < 2) continue
      var startTimeStr = timeParts[0].trim()
      var endTimeStr = timeParts[1].trim()
      parsed.push({
        name: cls.name,
        time: cls.time,
        startTime: startTimeStr,
        endTime: endTimeStr,
        startMin: parseTime(startTimeStr),
        endMin: parseTime(endTimeStr),
        id: cls.id
      })
    }
    parsed.sort(function(a, b) { return a.startMin - b.startMin })
    if (offset === 0) {
      for (var j = 0; j < parsed.length; j++) {
        if (parsed[j].endMin > nowMinutes) {
          if (nowMinutes >= parsed[j].startMin) {
            instance.currentClass = {
              name: parsed[j].name,
              remaining: Math.round((parsed[j].endMin - nowMinutes) * 10) / 10,
              id: parsed[j].id
            }
            if (j + 1 < parsed.length) {
              instance.nextClass = {
                name: parsed[j + 1].name,
                startTime: parsed[j + 1].startTime,
                waitMin: Math.round((parsed[j + 1].startMin - nowMinutes) * 10) / 10,
                id: parsed[j + 1].id
              }
            }
            return
          }
          instance.nextClass = {
            name: parsed[j].name,
            startTime: parsed[j].startTime,
            waitMin: Math.round((parsed[j].startMin - nowMinutes) * 10) / 10,
            id: parsed[j].id
          }
          return
        }
      }
      continue
    }
    if (parsed.length > 0) {
      instance.upcomingClass = {
        day: checkDay,
        name: parsed[0].name,
        time: parsed[0].time,
        startTime: parsed[0].startTime
      }
      instance.upcomingClassDay = checkDay
      return
    }
  }
}

function parseTime(timeStr) {
  var parts = timeStr.split(":")
  var hours = parseInt(parts[0]) || 0
  var minutes = parseInt(parts[1]) || 0
  return hours * 60 + minutes
}

function startStatusTimer(instance) {
  stopStatusTimer(instance)
  instance.statusTimer = setInterval(function() {
    updateStatus(instance)
  }, 60000)
  instance.progressTimer = setInterval(function() {
    instance.updateClassProgress()
  }, 30000)
}

function stopStatusTimer(instance) {
  if (instance.statusTimer) {
    clearInterval(instance.statusTimer)
    instance.statusTimer = null
  }
  if (instance.progressTimer) {
    clearInterval(instance.progressTimer)
    instance.progressTimer = null
  }
}

export default {
  updateStatus: updateStatus,
  updateStatusLine: updateStatusLine,
  computeTodayStatus: computeTodayStatus,
  findUpcomingClass: findUpcomingClass,
  startStatusTimer: startStatusTimer,
  stopStatusTimer: stopStatusTimer
}