console.log("[clock] loading...")

function init(instance) {
  instance.currentTime = ""
  instance._clockTimer = null

  instance.startClockTimer = function() {
    var self = instance
    self.stopClockTimer()
    self._clockTimer = setInterval(function() {
      self.updateClock()
    }, 1000)
    self.updateClock()
  }

  instance.stopClockTimer = function() {
    if (instance._clockTimer) {
      clearInterval(instance._clockTimer)
      instance._clockTimer = null
    }
  }

  instance.updateClock = function() {
    var now = new Date()
    var fmt = instance.timeFormat || { hour: true, minute: true, second: false }
    var parts = []
    if (fmt.year) parts.push(now.getFullYear().toString())
    if (fmt.month) parts.push(_pad(now.getMonth() + 1))
    if (fmt.day) parts.push(_pad(now.getDate()))
    if (fmt.hour !== false) parts.push(_pad(now.getHours()))
    if (fmt.minute !== false) parts.push(_pad(now.getMinutes()))
    if (fmt.second) parts.push(_pad(now.getSeconds()))
    instance.currentTime = parts.join(":")
  }

  function _pad(n) {
    return (n < 10 ? "0" : "") + n
  }

  instance.startClockTimer()
  console.log("[clock] init OK")
}

module.exports = { init: init }
console.log("[clock] loaded")