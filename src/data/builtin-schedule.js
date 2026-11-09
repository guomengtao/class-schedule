// 内置课表（两套）的统一入口（单一真源）
//
// 数据真源链路：
//   ev/ev-schedule-android/apk/res/raw/default_schedule.json
//   ev/ev-schedule-android/apk/res/raw/default_schedule_901.json
//     → node scripts/gen-default-schedule.js
//     → src/data/schedule.js / schedule-901.js（生成文件，勿手改）
//     → 本文件（只做派生，不复制数据）
//
// 背景（2026-11-09）：此前「重置数据」栏目用的是另一套随机生成的 demo
// （2 张课表 / 12 门带假老师假教室的课），而新装用户首启 seed 已经是
// 八年级二班。两处数据不一致，重置一次反而把用户从真实课表打回占位数据。
// 现在把课表名、课程预设、默认课程标签全部从 schedule 派生，
// 改课程只需改手机端真源后重新生成，手环端各处自动跟着变。
//
// 2026-11-09 追加第二套：九年级一班（真实课表 49 条）。新装用户首启写两套，
// 第 1 套仍为默认激活；老用户不受影响（默认值是 keep 策略，不回填）。
// 第二套**不配晚课**：rotation.seedTemplate(1) 返回 null，见 rotation.js。
//
// 注意：两套课表的课程 id 各自从 "1" 开始编号，不会跨套冲突 ——
// 它们存在不同的 allCourses_<index> 键里，从不合并到同一数组。

var scheduleData = require("./schedule.js")

// 第二套产物缺失时退化为单套，避免整包加载失败（未生成只影响体验，不影响启动）
var scheduleData901 = null
try {
  scheduleData901 = require("./schedule-901.js")
} catch (e) {
  scheduleData901 = null
}

function copyList(src) {
  return JSON.parse(JSON.stringify(src || []))
}

// 顺序即课表槽位顺序：第 1 套在最前，新装首启激活第 1 套
var BUILTINS = [
  { name: "八年级二班", schedule: scheduleData.schedule || [] },
  { name: "九年级一班", schedule: scheduleData901 && scheduleData901.schedule ? scheduleData901.schedule : [] }
]

var BUILTIN_NAMES = []
for (var b = 0; b < BUILTINS.length; b++) BUILTIN_NAMES.push(BUILTINS[b].name)

// 课程预设：按课表中首次出现顺序取去重课程名，时间沿用首次出现的节次。
// 两套合并去重 —— 「道法」（八年级）与「政治」（九年级）都是真实用词，不合并同义项。
// 老师 / 教室留空 —— 与 seed 一致，不填就不显示，避免家长看到占位信息。
function buildCoursePresets() {
  var seen = {}
  var list = []
  for (var s = 0; s < BUILTINS.length; s++) {
    var days = BUILTINS[s].schedule || []
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
  // 第 1 套名字（兼容旧调用方）
  name: BUILTIN_NAMES[0],
  // 全部内置课表名，顺序即槽位顺序
  names: BUILTIN_NAMES,
  count: BUILTINS.length,
  // 第 1 套的课表（兼容旧调用方）
  schedule: BUILTINS[0].schedule,
  presets: COURSE_PRESETS,
  courseNames: COURSE_NAMES,
  courseTags: COURSE_TAGS,

  /** 取第 index 套的名字；越界回落第 1 套 */
  getName: function(index) {
    return BUILTIN_NAMES[index] || BUILTIN_NAMES[0]
  },

  /** 第 index 套课表是否有真实数据（第二套产物缺失时为 false） */
  hasSchedule: function(index) {
    var s = BUILTINS[index]
    return !!(s && s.schedule && s.schedule.length)
  },

  // 写盘前必须深拷贝：模块级数组是共享的，页面改名/删课会污染后续读取。
  copySchedule: function(index) {
    var s = BUILTINS[index || 0] || BUILTINS[0]
    return copyList(s.schedule)
  },
  copyPresets: function() {
    return copyList(COURSE_PRESETS)
  }
}
