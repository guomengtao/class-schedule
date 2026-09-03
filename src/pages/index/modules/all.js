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

function updateClock(instance) {
  var now = new Date()
  var tf = instance.timeFormat || { year: false, month: false, day: false, hour: true, minute: true, second: false }
  var dateParts = []
  var timeParts = []
  if (tf.year) dateParts.push(now.getFullYear() + "年")
  if (tf.month) dateParts.push((now.getMonth() + 1) + "月")
  if (tf.day) dateParts.push(now.getDate() + "日")
  if (tf.hour) timeParts.push((now.getHours() < 10 ? "0" : "") + now.getHours())
  if (tf.minute) timeParts.push((now.getMinutes() < 10 ? "0" : "") + now.getMinutes())
  if (tf.second) timeParts.push((now.getSeconds() < 10 ? "0" : "") + now.getSeconds())
  var dateStr = dateParts.join(" ")
  var timeStr = timeParts.join(":")
  if (dateStr && timeStr) {
    instance.currentTime = dateStr + " " + timeStr
  } else {
    instance.currentTime = dateStr || timeStr || "00:00"
  }
}

export default {
  dayNames: dayNames,
  parseTime: parseTime,
  getRealTodayIndex: getRealTodayIndex,
  formatTime: formatTime,
  updateClock: updateClock
}