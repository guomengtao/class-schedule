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
    var h = now.getHours()
    var m = now.getMinutes()
    var s = now.getSeconds()
    instance.currentTime = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
  }

  instance.startClockTimer()
  console.log("[clock] init OK")
}

module.exports = { init: init }
console.log("[clock] loaded")