// 手环端内置示例课表（九年级一班）
//
// ⚠️ 本文件由 scripts/gen-default-schedule.js 生成，请勿手改。
//    真源：ev/ev-schedule-android/apk/res/raw/default_schedule_901.json
//    改数据：改手机端那份，然后 node scripts/gen-default-schedule.js
//
// 仅在新装首启 / 首次读取该套课表且无数据时作为 seed 写入，之后一律以用户数据为准。
// 教室与老师留空 —— 不填就不显示，避免默认数据里出现家长不认识的占位信息。
module.exports = {
  schedule: [
    {
      day: "星期一",
      classes: [
        { id: "1", name: "政治", time: "08:00 - 08:45", teacher: "", location: "", notes: "" },
        { id: "2", name: "数学", time: "09:10 - 09:55", teacher: "", location: "", notes: "" },
        { id: "3", name: "语文", time: "10:05 - 10:50", teacher: "", location: "", notes: "" },
        { id: "4", name: "体育", time: "11:00 - 11:45", teacher: "", location: "", notes: "" },
        { id: "5", name: "历史", time: "14:00 - 14:45", teacher: "", location: "", notes: "" },
        { id: "6", name: "英语", time: "15:10 - 15:55", teacher: "", location: "", notes: "" },
        { id: "7", name: "物理", time: "16:05 - 16:50", teacher: "", location: "", notes: "" },
        { id: "8", name: "化学", time: "17:00 - 17:45", teacher: "", location: "", notes: "" },
        { id: "9", name: "语文", time: "18:30 - 19:15", teacher: "", location: "", notes: "" },
        { id: "10", name: "历史", time: "19:30 - 20:15", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期二",
      classes: [
        { id: "11", name: "英语", time: "08:00 - 08:45", teacher: "", location: "", notes: "" },
        { id: "12", name: "物理", time: "09:10 - 09:55", teacher: "", location: "", notes: "" },
        { id: "13", name: "数学", time: "10:05 - 10:50", teacher: "", location: "", notes: "" },
        { id: "14", name: "语文", time: "11:00 - 11:45", teacher: "", location: "", notes: "" },
        { id: "15", name: "语文", time: "14:00 - 14:45", teacher: "", location: "", notes: "" },
        { id: "16", name: "体育", time: "15:10 - 15:55", teacher: "", location: "", notes: "" },
        { id: "17", name: "化学", time: "16:05 - 16:50", teacher: "", location: "", notes: "" },
        { id: "18", name: "政治", time: "17:00 - 17:45", teacher: "", location: "", notes: "" },
        { id: "19", name: "数学", time: "18:30 - 19:15", teacher: "", location: "", notes: "" },
        { id: "20", name: "化学", time: "19:30 - 20:15", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期三",
      classes: [
        { id: "21", name: "英语", time: "08:00 - 08:45", teacher: "", location: "", notes: "" },
        { id: "22", name: "语文", time: "09:10 - 09:55", teacher: "", location: "", notes: "" },
        { id: "23", name: "物理", time: "10:05 - 10:50", teacher: "", location: "", notes: "" },
        { id: "24", name: "化学", time: "11:00 - 11:45", teacher: "", location: "", notes: "" },
        { id: "25", name: "数学", time: "14:00 - 14:45", teacher: "", location: "", notes: "" },
        { id: "26", name: "数学", time: "15:10 - 15:55", teacher: "", location: "", notes: "" },
        { id: "27", name: "历史", time: "16:05 - 16:50", teacher: "", location: "", notes: "" },
        { id: "28", name: "物理", time: "17:00 - 17:45", teacher: "", location: "", notes: "" },
        { id: "29", name: "英语", time: "18:30 - 19:15", teacher: "", location: "", notes: "" },
        { id: "30", name: "政治", time: "19:30 - 20:15", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期四",
      classes: [
        { id: "31", name: "英语", time: "08:00 - 08:45", teacher: "", location: "", notes: "" },
        { id: "32", name: "政治", time: "09:10 - 09:55", teacher: "", location: "", notes: "" },
        { id: "33", name: "数学", time: "10:05 - 10:50", teacher: "", location: "", notes: "" },
        { id: "34", name: "体育", time: "11:00 - 11:45", teacher: "", location: "", notes: "" },
        { id: "35", name: "语文", time: "14:00 - 14:45", teacher: "", location: "", notes: "" },
        { id: "36", name: "语文", time: "15:10 - 15:55", teacher: "", location: "", notes: "" },
        { id: "37", name: "化学", time: "16:05 - 16:50", teacher: "", location: "", notes: "" },
        { id: "38", name: "历史", time: "17:00 - 17:45", teacher: "", location: "", notes: "" },
        { id: "39", name: "数学", time: "18:30 - 19:15", teacher: "", location: "", notes: "" },
        { id: "40", name: "物理", time: "19:30 - 20:15", teacher: "", location: "", notes: "" }
      ]
    },
    {
      day: "星期五",
      classes: [
        { id: "41", name: "化学", time: "08:00 - 08:45", teacher: "", location: "", notes: "" },
        { id: "42", name: "数学", time: "09:10 - 09:55", teacher: "", location: "", notes: "" },
        { id: "43", name: "物理", time: "10:05 - 10:50", teacher: "", location: "", notes: "" },
        { id: "44", name: "英语", time: "11:00 - 11:45", teacher: "", location: "", notes: "" },
        { id: "45", name: "历史", time: "14:00 - 14:45", teacher: "", location: "", notes: "" },
        { id: "46", name: "政治", time: "15:10 - 15:55", teacher: "", location: "", notes: "" },
        { id: "47", name: "英语", time: "16:05 - 16:50", teacher: "", location: "", notes: "" },
        { id: "48", name: "班会", time: "17:00 - 17:45", teacher: "", location: "", notes: "" },
        { id: "49", name: "周考", time: "18:20 - 20:20", teacher: "", location: "", notes: "" }
      ]
    }
  ]
}
