var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function parseTime(timeStr) {
  var parts = timeStr.split(":")
  var hours = parseInt(parts[0]) || 0
  var minutes = parseInt(parts[1]) || 0
  return hours * 60 + minutes
}

function getRealTodayIndex() {
  return new Date().getDay()
}

function sortByTime(list) {
  if (!list || list.length === 0) return list
  var sorted = list.slice()
  sorted.sort(function(a, b) {
    var ta = a.time ? a.time.split(' - ')[0] : '00:00'
    var tb = b.time ? b.time.split(' - ')[0] : '00:00'
    var taParts = ta.split(':')
    var tbParts = tb.split(':')
    return (parseInt(taParts[0]) * 60 + parseInt(taParts[1])) - (parseInt(tbParts[0]) * 60 + parseInt(tbParts[1]))
  })
  return sorted
}

function formatTime(minutes) {
  var h = Math.floor(minutes / 60)
  var m = minutes % 60
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m
}

export default {
  dayNames: dayNames,
  parseTime: parseTime,
  getRealTodayIndex: getRealTodayIndex,
  sortByTime: sortByTime,
  formatTime: formatTime
}