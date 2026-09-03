console.log("[class-list module] loading...")

function parseTime(timeStr) {
  var parts = timeStr.split(":")
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function init(instance) {
  console.log("[class-list module] init called")
  instance.currentClasses = []

  instance.loadDayClasses = function() {
    var self = instance
    var dayData = null
    for (var i = 0; i < self.schedule.length; i++) {
      if (self.schedule[i].day === self.currentDay) {
        dayData = self.schedule[i]
        break
      }
    }
    var rawClasses = dayData ? dayData.classes : []
    var classes = []
    for (var j = 0; j < rawClasses.length; j++) {
      var src = rawClasses[j]
      classes.push({
        id: src.id,
        name: src.name,
        time: src.time,
        location: src.location || "",
        progress: 0,
        progressColor: "transparent"
      })
    }
    classes.sort(function(a, b) {
      var ta = a.time ? a.time.split(" - ")[0] : "00:00"
      var tb = b.time ? b.time.split(" - ")[0] : "00:00"
      var taParts = ta.split(":")
      var tbParts = tb.split(":")
      return (parseInt(taParts[0]) * 60 + parseInt(taParts[1])) - (parseInt(tbParts[0]) * 60 + parseInt(tbParts[1]))
    })
    self.currentClasses = classes
    self.updateClassProgress()
  }

  instance.updateClassProgress = function() {
    var self = instance
    var classes = self.currentClasses
    var now = new Date()
    var nowMinutes = now.getHours() * 60 + now.getMinutes()
    var ongoing = "rgba(126,200,227,0.2)"
    var done = "rgba(74,138,154,0.25)"
    for (var i = 0; i < classes.length; i++) {
      var course = classes[i]
      var parts = course.time.split("-")
      if (parts.length < 2) {
        course.progress = 0
        course.progressColor = "transparent"
        continue
      }
      var startMin = parseTime(parts[0].trim())
      var endMin = parseTime(parts[1].trim())
      if (nowMinutes < startMin) {
        course.progress = 0
        course.progressColor = "transparent"
      } else if (nowMinutes >= endMin) {
        course.progress = 100
        course.progressColor = done
      } else {
        var total = endMin - startMin
        var elapsed = nowMinutes - startMin
        course.progress = Math.round((elapsed / total) * 100)
        course.progressColor = ongoing
      }
    }
  }

  console.log("[class-list module] init OK")
}

module.exports = {
  init: init
}

console.log("[class-list module] loaded successfully")