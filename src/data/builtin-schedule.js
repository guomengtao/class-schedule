// 内置课表「八年级二班」的统一入口（单一真源）
//
// 数据真源链路：
//   ev/ev-schedule-android/apk/res/raw/default_schedule.json
//     → node scripts/gen-default-schedule.js
//     → src/data/schedule.js（生成文件，勿手改）
//     → 本文件（只做派生，不复制数据）
//
// 背景（2026-11-09）：此前「重置数据」栏目用的是另一套随机生成的 demo
// （2 张课表 / 12 门带假老师假教室的课），而新装用户首启 seed 已经是
// 八年级二班。两处数据不一致，重置一次反而把用户从真实课表打回占位数据。
// 现在把课表名、课程预设、默认课程标签全部从 schedule.js 派生，
// 改课程只需改手机端真源后重新生成，手环端各处自动跟着变。

var scheduleData = require("./schedule.js")

var BUILTIN_NAME = "八年级二班"

// 课程预设：按课表中首次出现顺序取去重课程名，时间沿用首次出现的节次。
// 老师 / 教室留空 —— 与 seed 一致，不填就不显示，避免家长看到占位信息。
function buildCoursePresets() {
  var seen = {}
  var list = []
  var days = scheduleData.schedule || []
  for (var d = 0; d < days.length; d++) {
    var classes = days[d].classes || []
    for (var i = 0; i < classes.length; i++) {
      var c = classes[i]
      var name = c.name || ""
      if (!name || seen[name]) continue
      seen[name] = true
      list.push({
        name: name,
        time: c.time || "",
        teacher: c.teacher || "",
        location: c.location || ""
      })
    }
  }
  return list
}

function buildCourseNames() {
  var presets = buildCoursePresets()
  var names = []
  for (var i = 0; i < presets.length; i++) names.push(presets[i].name)
  return names
}

// 重置数据页的「默认课程」标签：宽度按字数估算，交给模板 inline style。
// 基准 26px 字号（方屏放大档），中文按 26px、ASCII 按 13px，左右各留 6px。
// 胶囊屏 24px 字号下会略宽一点，但不会挤出 152px 的可用宽。
function tagWidth(name) {
  var w = 0
  for (var i = 0; i < name.length; i++) {
    w += name.charCodeAt(i) > 127 ? 26 : 13
  }
  w += 12
  if (w < 48) w = 48
  if (w > 152) w = 152
  return w
}

function buildCourseTags() {
  var names = buildCourseNames()
  var tags = []
  for (var i = 0; i < names.length; i++) {
    tags.push({ name: names[i], width: tagWidth(names[i]) })
  }
  return tags
}

var COURSE_PRESETS = buildCoursePresets()
var COURSE_NAMES = buildCourseNames()
var COURSE_TAGS = buildCourseTags()

module.exports = {
  name: BUILTIN_NAME,
  schedule: scheduleData.schedule,
  presets: COURSE_PRESETS,
  courseNames: COURSE_NAMES,
  courseTags: COURSE_TAGS,

  // 写盘前必须深拷贝：模块级数组是共享的，页面改名/删课会污染后续读取。
  copySchedule: function() {
    return JSON.parse(JSON.stringify(scheduleData.schedule))
  },
  copyPresets: function() {
    return JSON.parse(JSON.stringify(COURSE_PRESETS))
  }
}
