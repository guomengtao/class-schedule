var tables = [
  {
    key: "allCourses",
    desc: "所有课程数据（多课程表存储）",
    columns: ["scheduleName", "courses", "createdAt", "updatedAt"],
    type: "array"
  },
  {
    key: "currentScheduleIndex",
    desc: "当前选中的课程表索引",
    columns: ["value"],
    type: "value"
  },
  {
    key: "scheduleNames",
    desc: "所有课程表名称列表",
    columns: ["value"],
    type: "array"
  },
  {
    key: "course_preset_list",
    desc: "课程预设列表（快速添加用）",
    columns: ["name", "teacher", "location", "color"],
    type: "array"
  },
  {
    key: "appTheme",
    desc: "应用主题设置",
    columns: ["value"],
    type: "value"
  },
  {
    key: "fontScale",
    desc: "字体缩放比例",
    columns: ["value"],
    type: "value"
  },
  {
    key: "remindSettings",
    desc: "提醒设置",
    columns: ["enabled", "advanceMinutes", "vibrationEnabled", "soundEnabled"],
    type: "object"
  },
  {
    key: "userNickname",
    desc: "用户昵称",
    columns: ["value"],
    type: "value"
  },
  {
    key: "vibrationStyle",
    desc: "震动样式设置",
    columns: ["value"],
    type: "value"
  },
  {
    key: "vibration_presets",
    desc: "自定义震动方案",
    columns: ["name", "pattern", "repeat"],
    type: "array"
  },
  {
    key: "qrcode_text",
    desc: "二维码生成文本",
    columns: ["value"],
    type: "value"
  },
  {
    key: "background_running_config",
    desc: "后台运行配置",
    columns: ["enabled", "interval", "lastRun"],
    type: "object"
  },
  {
    key: "background_running_logs",
    desc: "后台运行日志",
    columns: ["time", "action", "result"],
    type: "array"
  },
  {
    key: "homepage_settings",
    desc: "首页设置",
    columns: ["showQuickAdd", "showCustomContent", "customContent", "showTime", "showStatusBar", "showPinnedBar", "showDayNavZong", "showDayNavJin", "showDayNavMing", "showLabSection", "timeFormat"],
    type: "object"
  },
  {
    key: "premium_unlocked",
    desc: "高级功能解锁状态",
    columns: ["value"],
    type: "value"
  },
  {
    key: "pinned_pages",
    desc: "钉在首页的页面列表",
    columns: ["name", "uri"],
    type: "array"
  },
  {
    key: "auth_data",
    desc: "激活认证数据",
    columns: ["activated", "activationDate", "expiryDate", "deviceId", "isTrial"],
    type: "object"
  },
  {
    key: "master_usage",
    desc: "主激活码使用记录",
    columns: ["code", "usedCount", "lastUsed"],
    type: "object"
  },
  {
    key: "used_codes",
    desc: "已使用的激活码列表",
    columns: ["value"],
    type: "array"
  },
  {
    key: "used_redeem",
    desc: "已使用的兑换码",
    columns: ["value"],
    type: "array"
  },
  {
    key: "data_backup",
    desc: "数据备份",
    columns: ["schedules", "settings", "backupTime"],
    type: "object"
  },
  {
    key: "last_backup_time",
    desc: "上次备份时间",
    columns: ["value"],
    type: "value"
  },
  {
    key: "multi_file_demo_counter",
    desc: "多文件 Demo 计数器",
    columns: ["value"],
    type: "value"
  },
  {
    key: "multi_file_demo_list",
    desc: "多文件 Demo 列表",
    columns: ["id", "name", "time"],
    type: "array"
  }
]

module.exports = tables