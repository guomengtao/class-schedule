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

module.exports = {
  updateClock: updateClock
}