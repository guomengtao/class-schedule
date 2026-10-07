var perf = {
  // page stack tracking
  _stackDepth: 1,
  _maxStackDepth: 1,
  _pushCount: 0,
  _backCount: 0,

  // timer tracking
  _activeTimers: 0,
  _peakTimers: 0,
  _timerLog: [],

  // frame rate tracking
  _frameSamples: [],
  _frameCheckActive: false,
  _lastFrameTime: 0,
  _droppedFrames: 0,
  _totalFrames: 0,

  // health flags
  _warningsIssued: [],
  _highWaterMemoryWarned: false
}

function dlog() {
  // reuse app.ux DEBUG flag pattern
  if (perf._debug) console.log.apply(console, arguments)
}

var PerfMonitor = {
  enableDebug: function() {
    perf._debug = true
  },

  // =========================================================================
  // Page stack tracking
  // =========================================================================
  onPush: function(uri) {
    perf._stackDepth++
    perf._pushCount++
    if (perf._stackDepth > perf._maxStackDepth) {
      perf._maxStackDepth = perf._stackDepth
    }
    dlog("[PERF] stack push -> depth=" + perf._stackDepth + " max=" + perf._maxStackDepth + " uri=" + uri)

    if (perf._stackDepth >= 6) {
      this._warn("STACK_DEEP", "Page stack depth=" + perf._stackDepth + " (6+ pages, approaching memory limit)")
    }
  },

  onBack: function() {
    if (perf._stackDepth > 1) {
      perf._stackDepth--
      perf._backCount++
    }
    dlog("[PERF] stack back -> depth=" + perf._stackDepth)
  },

  onReplace: function(uri) {
    perf._pushCount++
    dlog("[PERF] stack replace -> depth=" + perf._stackDepth + " (unchanged) uri=" + uri)
  },

  // =========================================================================
  // Timer tracking
  // =========================================================================
  registerTimer: function(name, intervalMs) {
    perf._activeTimers++
    if (perf._activeTimers > perf._peakTimers) {
      perf._peakTimers = perf._activeTimers
    }
    perf._timerLog.push({
      name: name,
      interval: intervalMs,
      startedAt: Date.now(),
      stackDepthAtStart: perf._stackDepth
    })
    if (perf._timerLog.length > 200) {
      perf._timerLog = perf._timerLog.slice(-100)
    }
    dlog("[PERF] timer +1 '" + name + "' interval=" + intervalMs + "ms total=" + perf._activeTimers)

    if (perf._activeTimers >= 6) {
      this._warn("TIMER_BLOAT", perf._activeTimers + " active timers (interval-based UI may lag)")
    }
  },

  unregisterTimer: function(name) {
    if (perf._activeTimers > 0) {
      perf._activeTimers--
    }
    dlog("[PERF] timer -1 '" + name + "' total=" + perf._activeTimers)
  },

  // =========================================================================
  // Frame rate monitoring
  // =========================================================================
  startFrameCheck: function() {
    if (perf._frameCheckActive) return
    perf._frameCheckActive = true
    perf._lastFrameTime = Date.now()
    perf._droppedFrames = 0
    perf._totalFrames = 0
    perf._frameSamples = []
    this._tickFrame()
  },

  stopFrameCheck: function() {
    perf._frameCheckActive = false
  },

  _tickFrame: function() {
    if (!perf._frameCheckActive) return
    var now = Date.now()
    var elapsed = now - perf._lastFrameTime
    perf._lastFrameTime = now
    perf._totalFrames++

    perf._frameSamples.push(elapsed)
    if (perf._frameSamples.length > 60) {
      perf._frameSamples.shift()
    }

    if (elapsed > 50) {
      perf._droppedFrames++
      dlog("[PERF] frame drop: " + elapsed + "ms (dropped=" + perf._droppedFrames + "/" + perf._totalFrames + ")")
    }
    if (elapsed > 200) {
      this._warn("FRAME_DROP", "Frame took " + elapsed + "ms (target <16ms for 60fps), UI likely stuttering")
    }

    var self = this
    setTimeout(function() { self._tickFrame() }, 16)
  },

  // =========================================================================
  // Health query
  // =========================================================================
  getReport: function() {
    var avgFrame = 0
    if (perf._frameSamples.length > 0) {
      var sum = 0
      for (var i = 0; i < perf._frameSamples.length; i++) {
        sum += perf._frameSamples[i]
      }
      avgFrame = Math.round(sum / perf._frameSamples.length)
    }

    var dropRate = perf._totalFrames > 0
      ? ((perf._droppedFrames / perf._totalFrames) * 100).toFixed(1)
      : "0.0"

    return {
      stackDepth: perf._stackDepth,
      maxStackDepth: perf._maxStackDepth,
      pushCount: perf._pushCount,
      backCount: perf._backCount,
      pushBackBalance: perf._pushCount - perf._backCount,
      activeTimers: perf._activeTimers,
      peakTimers: perf._peakTimers,
      avgFrameMs: avgFrame,
      droppedFrames: perf._droppedFrames,
      totalFrames: perf._totalFrames,
      dropRatePct: dropRate,
      warnings: perf._warningsIssued.slice(),
      health: this._computeHealth()
    }
  },

  _computeHealth: function() {
    var score = 100
    if (perf._stackDepth >= 6) score -= 30
    else if (perf._stackDepth >= 4) score -= 10
    if (perf._activeTimers >= 6) score -= 25
    else if (perf._activeTimers >= 4) score -= 10
    if (perf._droppedFrames > 10) score -= 20
    else if (perf._droppedFrames > 3) score -= 5

    if (score >= 80) return "GREEN"
    if (score >= 50) return "YELLOW"
    return "RED"
  },

  printReport: function() {
    var r = this.getReport()
    dlog("========== PERF REPORT ==========")
    dlog("  Stack:    depth=" + r.stackDepth + " max=" + r.maxStackDepth + " pushes=" + r.pushCount + " backs=" + r.backCount + " balance=" + r.pushBackBalance)
    dlog("  Timers:   active=" + r.activeTimers + " peak=" + r.peakTimers)
    dlog("  Frames:   avg=" + r.avgFrameMs + "ms dropped=" + r.droppedFrames + "/" + r.totalFrames + " (" + r.dropRatePct + "%)")
    dlog("  Health:   " + r.health)
    dlog("  Warnings: " + JSON.stringify(r.warnings))
    dlog("==================================")
    return r
  },

  reset: function() {
    perf._maxStackDepth = perf._stackDepth
    perf._pushCount = 0
    perf._backCount = 0
    perf._peakTimers = perf._activeTimers
    perf._droppedFrames = 0
    perf._totalFrames = 0
    perf._frameSamples = []
    perf._warningsIssued = []
    perf._highWaterMemoryWarned = false
    dlog("[PERF] monitor reset, stack=" + perf._stackDepth + " timers=" + perf._activeTimers)
  },

  _warn: function(code, msg) {
    for (var i = 0; i < perf._warningsIssued.length; i++) {
      if (perf._warningsIssued[i].code === code) return
    }
    perf._warningsIssued.push({ code: code, msg: msg, time: Date.now() })
    dlog("[PERF] WARNING [" + code + "] " + msg)
  }
}

module.exports = PerfMonitor