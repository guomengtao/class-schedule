// 手环端内置示例课表（八年级二班）
//
// ⚠️ 本文件由 scripts/gen-default-schedule.js 生成，请勿手改。
//    真源：ev/ev-schedule-android/apk/res/raw/default_schedule.json
//    改数据：改手机端那份，然后 node scripts/gen-default-schedule.js
//
// 仅在新装首启 / 首次读取该套课表且无数据时作为 seed 写入，之后一律以用户数据为准。
// 教室与老师留空 —— 不填就不显示，避免默认数据里出现家长不认识的占位信息。
module.exports = {
  schedule: [
    {
      day: "星期一",
      classes: [
        { id: "1", name: "早自习", time: "07:00 - 08:00", teacher: "", location: "", notes: "" },
        { id: "2", name: "语文", time: "08:00 - 08:40", teacher: "", location: "", notes: "" },
        { id: "3", name: "英语", time: "08:55 - 09:35", teacher: "", location: "", notes: "" },
        { id: "4", name: "数学", time: "10:15 - 10:55", teacher: "", location: "", notes: "" },
        { id: "5", name: "历史", time: "11:10 - 11:50", teacher: "", location: "", notes: "" },
        { id: "6", name: "物理", time: "13:10 - 13:50", teacher: "", location: "", notes: "" },
        { id: "7", name: "生物", time: "14:05 - 14:55", teacher: "", location: "", notes: "" },
        { id: "8", name: "自习", time: "15:20 - 16:00", teacher: "", location: "", notes: "" },
        { id: "9", name: "自习", time: "16:15 - 16:55", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期二",
      classes: [
        { id: "10", name: "早自习", time: "07:00 - 08:00", teacher: "", location: "", notes: "" },
        { id: "11", name: "英语", time: "08:00 - 08:40", teacher: "", location: "", notes: "" },
        { id: "12", name: "语文", time: "08:55 - 09:35", teacher: "", location: "", notes: "" },
        { id: "13", name: "道法", time: "10:15 - 10:55", teacher: "", location: "", notes: "" },
        { id: "14", name: "体育", time: "11:10 - 11:50", teacher: "", location: "", notes: "" },
        { id: "15", name: "地理", time: "13:10 - 13:50", teacher: "", location: "", notes: "" },
        { id: "16", name: "数学", time: "14:05 - 14:55", teacher: "", location: "", notes: "" },
        { id: "17", name: "音乐", time: "15:20 - 16:00", teacher: "", location: "", notes: "" },
        { id: "18", name: "自习", time: "16:15 - 16:55", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期三",
      classes: [
        { id: "19", name: "早自习", time: "07:00 - 08:00", teacher: "", location: "", notes: "" },
        { id: "20", name: "英语", time: "08:00 - 08:40", teacher: "", location: "", notes: "" },
        { id: "21", name: "生物", time: "08:55 - 09:35", teacher: "", location: "", notes: "" },
        { id: "22", name: "语文", time: "10:15 - 10:55", teacher: "", location: "", notes: "" },
        { id: "23", name: "数学", time: "11:10 - 11:50", teacher: "", location: "", notes: "" },
        { id: "24", name: "物理", time: "13:10 - 13:50", teacher: "", location: "", notes: "" },
        { id: "25", name: "历史", time: "14:05 - 14:55", teacher: "", location: "", notes: "" },
        { id: "26", name: "美术", time: "15:20 - 16:00", teacher: "", location: "", notes: "" },
        { id: "27", name: "自习", time: "16:15 - 16:55", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期四",
      classes: [
        { id: "28", name: "早自习", time: "07:00 - 08:00", teacher: "", location: "", notes: "" },
        { id: "29", name: "数学", time: "08:00 - 08:40", teacher: "", location: "", notes: "" },
        { id: "30", name: "道法", time: "08:55 - 09:35", teacher: "", location: "", notes: "" },
        { id: "31", name: "英语", time: "10:15 - 10:55", teacher: "", location: "", notes: "" },
        { id: "32", name: "语文", time: "11:10 - 11:50", teacher: "", location: "", notes: "" },
        { id: "33", name: "微机", time: "13:10 - 13:50", teacher: "", location: "", notes: "" },
        { id: "34", name: "体育", time: "14:05 - 14:55", teacher: "", location: "", notes: "" },
        { id: "35", name: "劳动", time: "15:20 - 16:00", teacher: "", location: "", notes: "" },
        { id: "36", name: "自习", time: "16:15 - 16:55", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期五",
      classes: [
        { id: "37", name: "早自习", time: "07:00 - 08:00", teacher: "", location: "", notes: "" },
        { id: "38", name: "语文", time: "08:00 - 08:40", teacher: "", location: "", notes: "" },
        { id: "39", name: "地理", time: "08:55 - 09:35", teacher: "", location: "", notes: "" },
        { id: "40", name: "体育", time: "10:15 - 10:55", teacher: "", location: "", notes: "" },
        { id: "41", name: "物理", time: "11:10 - 11:50", teacher: "", location: "", notes: "" },
        { id: "42", name: "英语", time: "13:10 - 13:50", teacher: "", location: "", notes: "" },
        { id: "43", name: "数学", time: "14:05 - 14:55", teacher: "", location: "", notes: "" },
        { id: "44", name: "综合/心理", time: "15:20 - 16:00", teacher: "", location: "", notes: "" },
        { id: "45", name: "自习", time: "16:15 - 16:55", teacher: "", location: "", notes: "" }
      ]
    }
  ]
}
