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

function formatTime(minutes) {
  var h = Math.floor(minutes / 60)
  var m = minutes % 60
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m
}

export default {
  dayNames: dayNames,
  parseTime: parseTime,
  getRealTodayIndex: getRealTodayIndex,
  formatTime: formatTime
}