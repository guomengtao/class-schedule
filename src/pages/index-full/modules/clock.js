console.log("[clock] loading...")

function init(instance) {
  instance.currentTime = ""
  instance.clockTimer = null

  instance.startClockTimer = function() {
    var self = instance
    self.stopClockTimer()
    self.clockTimer = setInterval(function() {
      self.updateClock()
    }, 1000)
    self.updateClock()
  }

  instance.stopClockTimer = function() {
    if (instance.clockTimer) {
      clearInterval(instance.clockTimer)
      instance.clockTimer = null
    }
  }

  instance.updateClock = function() {
    var now = new Date()
    var fmt = instance.timeFormat || { hour: true, minute: true, second: false }
    var dateParts = []
    var timeParts = []
    if (fmt.year) dateParts.push(now.getFullYear().toString())
    if (fmt.month) dateParts.push(_pad(now.getMonth() + 1))
    if (fmt.day) dateParts.push(_pad(now.getDate()))
    if (fmt.hour !== false) timeParts.push(_pad(now.getHours()))
    if (fmt.minute !== false) timeParts.push(_pad(now.getMinutes()))
    if (fmt.second) timeParts.push(_pad(now.getSeconds()))
    var text = ""
    if (dateParts.length > 0) {
      text += dateParts.join("-")
    }
    if (timeParts.length > 0) {
      if (text) text += " "
      text += timeParts.join(":")
    }
    instance.currentTime = text
  }

  function _pad(n) {
    return (n < 10 ? "0" : "") + n
  }

  instance.startClockTimer()
  console.log("[clock] init OK")
}

module.exports = { init: init }
console.log("[clock] loaded")