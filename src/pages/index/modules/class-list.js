var store = require("../../../data/store.js")
var courseSwap = require("../../../data/course-swap.js")
var prompt = require("@system.prompt")

// 首屏读取路径日志开关：默认关闭（真机上日志要过 IPC，量大即主线程阻塞）。
// 这几行原来是无条件 console.log，且 refreshClasses 会整条链走多次 —— 排查时再打开。
var DEBUG = false
function dlog() {
  if (DEBUG) console.log.apply(console, arguments)
}

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

// 屏型由 index.ux 统一探测后通过 instance.isCapsule 传入，这里不再重复调用
// device.getInfo（它是异步 IPC，重复调用会拖慢首屏）。
// 胶囊屏只展示开始时间，避免时间文本过长把地点挤掉。
function shortenTime(timeStr, capsule) {
  if (!capsule) return timeStr
  return timeStr.replace(/ - /g, "-")
}

function getRealTodayName() {
  return fullDayNames[new Date().getDay()]
}

function parseTime(timeStr) {
  var parts = timeStr.split(":")
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

// 星期名归一：数据里 day 可能是「星期一 / 周一 / 礼拜一 / Monday / 数字」。
// 早期只做 === 全名比较，两边写法一旦不同就整天匹配不上 —— 现象正是
// 「状态条说有课、列表说今天没有课」。统一折算成 0-6 星期索引。
var EN_DAY_INDEX = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
}
var CN_DAY_CHARS = "一二三四五六"

function dayIndexOf(raw) {
  if (raw === undefined || raw === null) return -1
  var s = String(raw).replace(/\s|　/g, "")
  if (!s) return -1
  var m = s.match(/^(星期|周|礼拜)([日天一二三四五六七])$/)
  if (m) {
    var ch = m[2]
    // 日/天/七 均为周日；数字 7 也按周日处理（0 基口径下 6 无法消歧）
    if (ch === "日" || ch === "天" || ch === "七") return 0
    return CN_DAY_CHARS.indexOf(ch) + 1
  }
  var low = s.toLowerCase()
  if (EN_DAY_INDEX[low] !== undefined) return EN_DAY_INDEX[low]
  if (/^[0-6]$/.test(s)) return parseInt(s)
  if (s === "7") return 0
  return -1
}

function init(instance) {
  instance.currentClasses = []
  instance.currentScheduleName = "课程表1"
  instance.progressTimer = null
  store.getCurrentScheduleIndex(function(idx) {
    store.getScheduleNames(function(names) {
      if (names && idx < names.length) {
        instance.currentScheduleName = names[idx]
      } else {
        instance.currentScheduleName = "课程表" + (idx + 1)
      }
    })
  })

  instance.loadDayClasses = function(overrideWeekDay) {
    if (overrideWeekDay === undefined) overrideWeekDay = -1
    var self = instance
    var dayData = null
    var queryDay = (overrideWeekDay >= 0) ? fullDayNames[overrideWeekDay] : self.currentDay
    var queryIndex = dayIndexOf(queryDay)
    // 首屏竞态兜底：dayNav 尚未回填 currentDay 时（或值异常），不能直接判成「今天没有课」，
    // 回落到真实今天。这是「列表空、状态条有课」最直接的来源之一。
    if (queryIndex < 0) {
      queryIndex = new Date().getDay()
      queryDay = fullDayNames[queryIndex]
    }
    for (var i = 0; i < self.schedule.length; i++) {
      if (dayIndexOf(self.schedule[i].day) === queryIndex) {
        dayData = self.schedule[i]
        break
      }
    }
    self.classesDayKey = queryDay
    var rawClasses = dayData ? dayData.classes : []
    var classes = []
    var capsule = self.isCapsule === true
    var currentFontSize = self.displaySize
    var currentMetaFontSize = self.metaFontSize
    // 行高固定为字号的 1.2 倍，避免行高小于字号导致文字上下被裁切/重叠
    var currentLineHeight = Math.round(currentFontSize * 1.2)
    var currentMetaLineHeight = Math.round(currentMetaFontSize * 1.2)
    for (var j = 0; j < rawClasses.length; j++) {
      var src = rawClasses[j]
      // Capsule: always wrap location to a separate line for consistent layout
      var needsWrap = capsule && !!src.location
      classes.push({
        id: src.id,
        name: src.name,
        time: src.time,
        timeDisplay: shortenTime(src.time, capsule),
        teacher: src.teacher || "",
        location: src.location || "",
        locationWrap: needsWrap,
        // 晚课是 rotation.injectInto 注入的虚拟条目，这个标记必须一路带到视图对象：
        // 首页前缀「晚」、点击拦截（goToClassDetail）都靠它。漏掉会让晚课混进普通课。
        _rotation: !!src._rotation,
        // classState: upcoming / ongoing / ended，由 updateClassProgress 每 60s 刷新。
        // 视图层靠它做竖条明灭、序号徽标实心与否，课名字色一律不动。
        classState: "upcoming",
        progress: 0,
        progressColor: "transparent",
        fontSize: currentFontSize,
        metaFontSize: currentMetaFontSize,
        lineHeight: currentLineHeight,
        metaLineHeight: currentMetaLineHeight
      })
    }
    classes.sort(function(a, b) {
      var ta = a.time ? a.time.split(" - ")[0] : "00:00"
      var tb = b.time ? b.time.split(" - ")[0] : "00:00"
      var taParts = ta.split(":")
      var tbParts = tb.split(":")
      return (parseInt(taParts[0]) * 60 + parseInt(taParts[1])) - (parseInt(tbParts[0]) * 60 + parseInt(tbParts[1]))
    })
    // 节次与日期属于「格位」，在这里一次性算好，编辑页与调课页共用
    var viewDate = self.currentDate || new Date()
    var viewDateStr = courseSwap.dateStrOf(viewDate)
    for (var k = 0; k < classes.length; k++) {
      classes[k].period = "第" + (k + 1) + "节"
      classes[k].dateStr = viewDateStr
      classes[k]._swapped = false
      // 课程序号：课名前挂 28px 徽标（不新增行、不改卡片高度）。
      // 晚课不占数字序号，用「晚」占位，靠字义与白天课程区分。
      classes[k].indexLabel = classes[k]._rotation ? "晚" : String(k + 1)
    }
    self.currentClasses = classes
    self.isToday = (self.currentDay === getRealTodayName())
    self.updateClassProgress()

    // 临时调课覆盖：按日期合并，基础课表不写入。
    // storage 是异步的，先渲染基础列表避免白屏，读到覆盖后再补刷一次。
    courseSwap.getOverridesForDate(viewDateStr, function(overrides) {
      var ids = Object.keys(overrides || {})
      if (ids.length === 0) return
      // 回调期间用户可能已翻到别的日期，丢弃这次迟到的结果
      if (courseSwap.dateStrOf(self.currentDate || new Date()) !== viewDateStr) return
      var list = self.currentClasses
      for (var m = 0; m < list.length; m++) {
        var ov = overrides[list[m].id]
        if (!ov) continue
        list[m].name = ov.name
        list[m].teacher = ov.teacher || ""
        list[m].location = ov.location || ""
        list[m]._swapped = true
      }
      self.updateClassProgress()
      try { self.$forceUpdate && self.$forceUpdate() } catch (e) {}
    })
  }

  instance.refreshClasses = function() {
    var self = instance
    dlog("[refreshClasses] entering, has reloadHolidayState=" + (!!self.reloadHolidayState) + " holidayReminderOn=" + self.holidayReminderOn + " isHoliday=" + self.isHoliday)
    if (self.reloadHolidayState && typeof self.reloadHolidayState === 'function') {
      // currentDate 缺失时不能抛异常中断整条刷新链（否则列表停在上一帧、状态条又被单独刷新 → 同屏矛盾）
      var d = self.currentDate || new Date()
      dlog("[refreshClasses] currentDate=" + (d ? d.toDateString() : "null"))
      var m = (d.getMonth() + 1)
      var day = d.getDate()
      var dateStr = d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day)
      dlog("[refreshClasses] dateStr=" + dateStr + ", calling reloadHolidayState")
      self.reloadHolidayState(dateStr, function(overrideWeekDay) {
        dlog("[refreshClasses] reloadHolidayState callback, overrideWeekDay=" + overrideWeekDay)
        if (overrideWeekDay === -2) {
          self.currentClasses = []
        } else {
          self.loadDayClasses(overrideWeekDay >= 0 ? overrideWeekDay : -1)
        }
        dlog("[refreshClasses] after callback, isHoliday=" + self.isHoliday + " isWorkday=" + self.isWorkday + " holidayReminderOn=" + self.holidayReminderOn)
        if (self.updateStatus && typeof self.updateStatus === 'function') {
          self.updateStatus()
        }
        // 走首页的渲染合并器（宿主未提供时退回直接重渲染）
        // 见 docs/首页黑屏并重启-深度分析.md §6-R1
        if (typeof self.scheduleRender === 'function') self.scheduleRender()
        else { try { self.$forceUpdate && self.$forceUpdate() } catch (e) {} }
      })
    } else {
      dlog("[refreshClasses] ⚠ FALLBACK: reloadHolidayState not available, using loadDayClasses directly")
      self.loadDayClasses()
      if (self.updateStatus && typeof self.updateStatus === 'function') {
        self.updateStatus()
      }
    }
  }

  // 课程三态（2026-11-09）：数据层本来就每 60s 算好 progress 与颜色，
  // 但硬编码 rgba + .progress-bg 的 opacity:0.12 让有效 alpha 只剩 0.03，
  // 三态在真机上完全看不出来。这里补齐 classState 与主题 token，供模板做
  // 「竖条明灭 / 徽标实心与否 / 进度条比例」三层编码；课名字色一律不动。
  // 仅 isToday 启用三态：翻到过去日期会全屏皆灰、未来日期全屏常态，都失去对比意义。
  instance.updateClassProgress = function() {
    var self = instance
    var classes = self.currentClasses || []
    var today = self.isToday === true
    var theme = self.theme || {}
    var doneColor = theme.progressDone || "transparent"
    var ongoingColor = theme.progressOngoing || "transparent"
    var now = new Date()
    var nowMinutes = now.getHours() * 60 + now.getMinutes()
    for (var i = 0; i < classes.length; i++) {
      var course = classes[i]
      // 非今天：一律常态，避免整屏皆灰 / 整屏常态，保留「今天才有对比」的语义
      if (!today) {
        course.classState = "upcoming"
        course.progress = 0
        course.progressColor = "transparent"
        continue
      }
      var parts = String(course.time || "").split("-")
      if (parts.length < 2) {
        course.classState = "upcoming"
        course.progress = 0
        course.progressColor = "transparent"
        continue
      }
      var startMin = parseTime(parts[0].trim())
      var endMin = parseTime(parts[1].trim())
      // 跨零点课程（如 23:00-01:00）：endMin 小于 startMin，旧逻辑会直接判「已结束」。
      // 把结束时刻与凌晨的 now 一起折算到次日再比。
      var overnight = endMin <= startMin
      if (overnight) endMin += 1440
      var checkMin = nowMinutes
      if (overnight && checkMin < startMin) checkMin += 1440
      if (checkMin < startMin) {
        course.classState = "upcoming"
        course.progress = 0
        course.progressColor = "transparent"
      } else if (checkMin >= endMin) {
        course.classState = "ended"
        course.progress = 100
        course.progressColor = doneColor
      } else {
        course.classState = "ongoing"
        var total = endMin - startMin
        var elapsed = checkMin - startMin
        course.progress = Math.round((elapsed / total) * 100)
        course.progressColor = ongoingColor
      }
    }
  }

  instance.startProgressTimer = function() {
    if (instance.progressTimer) clearInterval(instance.progressTimer)
    instance.progressTimer = setInterval(function() {
      instance.updateClassProgress()
    }, 60000)
  }

  instance.stopProgressTimer = function() {
    if (instance.progressTimer) {
      clearInterval(instance.progressTimer)
      instance.progressTimer = null
    }
  }

  instance.openScheduleManager = function() {
    var router = require("@system.router")
    router.push({ uri: "/pages/schedule-manager" })
  }

  instance.goToClassDetail = function(course) {
    // 晚课是注入出来的虚拟条目，存储里没有这条课 —— 放进去会按 id 找不到而进空详情页，
    // 甚至误改相邻课程。统一拦在这里，指向晚课设置。
    if (course && course._rotation) {
      prompt.showToast({ message: "晚课请在「晚课设置」里修改" })
      return
    }
    var router = require("@system.router")
    var storage = require("@system.storage")
    storage.set({
      key: "detail_classId",
      value: String(course.id),
      success: function() {
        storage.set({
          key: "detail_day",
          value: instance.currentDay,
          success: function() {
            storage.set({
              key: "detail_dateStr",
              value: course.dateStr || courseSwap.dateStrOf(instance.currentDate || new Date()),
              success: function() {
                storage.set({
                  key: "detail_period",
                  value: course.period || "",
                  success: function() { router.push({ uri: "/pages/detail" }) },
                  fail: function() { prompt.showToast({ message: "请重试" }) }
                })
              },
              fail: function() { prompt.showToast({ message: "请重试" }) }
            })
          },
          fail: function() { prompt.showToast({ message: "请重试" }) }
        })
      },
      fail: function() {
        prompt.showToast({ message: "请重试" })
      }
    })
  }
}

module.exports = { init: init }