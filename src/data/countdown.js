// ===== 倒数日统一数据层（版本化迁移 + 共享读写） =====
// 历史问题：旧实现直接读写裸数组 JSON（key="countdownDays"），无版本、无 id、无迁移；
// 且首页/管理页各写一套解析逻辑。现收敛为单一模块：新增/编辑/删除/开关/排序/清空
// 全部经本模块读写 v2 版本化对象 { version:2, items:[{id,title,date,enabled}] }。
// 只允许走 v2 键；读到旧 v1 键时自动迁移并归档，保证旧数据平滑升级。

var storage = require("@system.storage")

var V2_KEY = "countdownDays.v2"
var OLD_KEY = "countdownDays"

var seq = 0

// ===== 颜色：倒数日色块的唯一来源 =====
// 为什么固定 6 个而不是自由取色：手环只有一列卡片、屏宽 192，色相一多就互相吃掉
// 区分度；6 个足够表达分类（生日/节日/考试/出行/缴费/纪念），且每个都在深色与
// 浅色主题下经过 adaptColor() 校正，保证当天数文字级别仍然清晰。
// hex 取中间调：偏浅在浅色主题糊、偏深在深色主题糊，两头都留了可调空间。
var COLORS = [
  { id: "blue", name: "海蓝", hex: "#4aa3d8" },
  { id: "mint", name: "薄荷", hex: "#3aa87a" },
  { id: "amber", name: "暖橙", hex: "#e0894a" },
  { id: "rose", name: "玫瑰", hex: "#dd6a94" },
  { id: "violet", name: "紫罗", hex: "#9179d6" },
  { id: "gold", name: "金黄", hex: "#c9a13c" }
]

// 未选色时回落主题强调色（与改动前视觉一致，旧数据不会突然变色）
var DEFAULT_COLOR = "#7ec8e3"

function dlog() {
  // 发布态关闭日志，避免手环上字符串拼接开销
}

// ---- 颜色工具 ----
// 自写两位 hex 解析，不用 parseInt(radix)：与 lunar.js 同口径，精简引擎上更保险
function hex2(s, i) {
  var hi = s.charCodeAt(i)
  var lo = s.charCodeAt(i + 1)
  hi = hi < 58 ? hi - 48 : hi - 87
  lo = lo < 58 ? lo - 48 : lo - 87
  return hi * 16 + lo
}

function rgbOf(hex) {
  var s = String(hex || "").replace("#", "")
  if (s.length !== 6) return null
  return { r: hex2(s, 0), g: hex2(s, 2), b: hex2(s, 4) }
}

// 只接受调色板内的值：手输/旧数据/被改过的存储一律回落默认色
function normalizeColor(hex) {
  var s = String(hex || "").toLowerCase()
  for (var i = 0; i < COLORS.length; i++) {
    if (COLORS[i].hex.toLowerCase() === s) return COLORS[i].hex
  }
  return ""
}

function colorOf(item) {
  return normalizeColor(item && item.color) || DEFAULT_COLOR
}

// 色块底色（低透明度）：叠在页面底色上，深浅主题都只留一层薄色
function tintColor(hex, alpha) {
  var c = rgbOf(hex) || rgbOf(DEFAULT_COLOR)
  return "rgba(" + c.r + "," + c.g + "," + c.b + "," + alpha + ")"
}

// 文字/进度条用色：深色主题往白提亮、浅色主题往黑压暗，
// 让「金黄」「海蓝」这类中间调在两种主题下都能当正文色用
function adaptColor(hex, isLight) {
  var c = rgbOf(hex) || rgbOf(DEFAULT_COLOR)
  var t = 0.32
  var target = isLight ? 0 : 255
  var r = Math.round(c.r + (target - c.r) * t)
  var g = Math.round(c.g + (target - c.g) * t)
  var b = Math.round(c.b + (target - c.b) * t)
  return "rgb(" + r + "," + g + "," + b + ")"
}

function newId() {
  seq = seq + 1
  return "cd-" + Date.now() + "-" + Math.floor(Math.random() * 10000) + "-" + seq
}

function emptyObject() {
  return { version: 2, items: [] }
}

// 归一化单条：保证 id/title/date/enabled 字段齐全且类型安全
function normalizeItem(it) {
  var o = {}
  o.id = (it && it.id) ? String(it.id) : newId()
  o.title = (it && it.title) ? String(it.title) : ""
  o.date = (it && it.date && /^\d{4}-\d{2}-\d{2}$/.test(String(it.date))) ? String(it.date) : "2030-01-01"
  o.enabled = (it && it.enabled !== undefined && it.enabled !== null) ? !!it.enabled : true
  // 进度口径：createdAt 存在则保留，否则按「目标日 − 90 天」回填（兼容 v1 迁移/旧数据）
  o.createdAt = (it && it.createdAt && isFinite(Number(it.createdAt))) ? Number(it.createdAt) : backfillCreatedAt(o.date)
  // 输入时用的日历：只影响卡片上要不要多显示一行农历，落盘 date 永远是公历
  o.cal = (it && it.cal === "lunar") ? "lunar" : "solar"
  // 农历文案是保存那一刻的快照（如「八月十五」）。不在展示页现算，
  // 是为了让倒数日列表页不必背 5.5KB 的农历表 —— 日期只会在编辑页改，
  // 那里本来就有 lunar.js，改完顺手刷新快照，不会漂移。
  o.lunarText = (o.cal === "lunar" && it && it.lunarText) ? String(it.lunarText) : ""
  o.color = normalizeColor(it && it.color)
  return o
}

// 无 createdAt 的旧数据回填起点：目标日前 90 天。目标过近/非法则用当前时间
function backfillCreatedAt(dateStr) {
  var target = parseDate(dateStr)
  if (!target) return Date.now()
  target.setHours(0, 0, 0, 0)
  var ms = target.getTime() - 90 * 86400000
  return ms > 0 ? ms : Date.now()
}

// 状态派生：today(0) / active(>0 进行中) / done(<0 已结束)
function statusOf(it) {
  var d = it.daysLeft
  if (d === undefined || d === null) d = computeItem(it.date)
  if (d < 0) return "done"
  if (d === 0) return "today"
  return "active"
}

// 进度 0..1：从 createdAt 走到目标日的完成比例（done 自然趋近 1）
function progressOf(it) {
  var target = parseDate(it.date)
  if (!target) return 0
  target.setHours(0, 0, 0, 0)
  var start = (it.createdAt && isFinite(it.createdAt)) ? it.createdAt : backfillCreatedAt(it.date)
  var total = target.getTime() - start
  if (total <= 0) return 1
  var elapsed = todayStartMs() - start
  if (elapsed <= 0) return 0
  var p = elapsed / total
  return p > 1 ? 1 : p
}

// 分组排序：进行中(含今天)在前，已结束在后；组内按 mode（recent/name）
function sortForDisplay(list, mode) {
  list.sort(function(a, b) {
    var gA = a.daysLeft >= 0 ? 0 : 1
    var gB = b.daysLeft >= 0 ? 0 : 1
    if (gA !== gB) return gA - gB
    if (mode !== "name") {
      var rA = a.daysLeft >= 0 ? a.daysLeft : -a.daysLeft
      var rB = b.daysLeft >= 0 ? b.daysLeft : -b.daysLeft
      if (rA !== rB) return rA - rB
      return 0
    }
    var c = (a.title || "").localeCompare(b.title || "")
    if (c !== 0) return c
    return 0
  })
}

function todayStartMs() {
  var t = new Date()
  t.setHours(0, 0, 0, 0)
  return t.getTime()
}

// 手动 split 解析日期，避免 new Date(string) 在部分环境的解析漂移问题
function parseDate(dateStr) {
  var p = String(dateStr || "").split("-")
  if (p.length < 3) return null
  var y = parseInt(p[0], 10)
  var m = parseInt(p[1], 10)
  var d = parseInt(p[2], 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d)
}

// 计算单条剩余天数（今天 = 0 天）
function computeItem(dateStr) {
  var target = parseDate(dateStr)
  if (!target) return 0
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - todayStartMs()) / 86400000)
}

// 为列表逐条附上 daysLeft / dateDisplay（仅计算，不落盘）
function recompute(list) {
  var today = todayStartMs()
  for (var i = 0; i < list.length; i++) {
    var it = list[i]
    var target = parseDate(it.date)
    var d = target ? Math.round((target.getTime() - today) / 86400000) : 0
    it.daysLeft = d
    it.dateDisplay = it.date || ""
  }
}

// 排序：按与今天的天数差绝对值升序（同日按日期升序）
function sortByAbsDays(list) {
  list.sort(function(a, b) {
    var da = Math.abs(a.daysLeft)
    var db = Math.abs(b.daysLeft)
    if (da !== db) return da - db
    return (a.date || "").localeCompare(b.date || "")
  })
}

// 排序：按标题拼音序
function sortByTitle(list) {
  list.sort(function(a, b) {
    return (a.title || "").localeCompare(b.title || "")
  })
}

// 读取：优先 v2；无 v2 或 v2 无有效数据时，回落读旧 v1 键并迁移归档
function load(cb) {
  // 读旧 v1 并迁移到 v2（归档删除旧键）
  function migrateOld() {
    storage.get({
      key: OLD_KEY,
      success: function(oldData) {
        var items = []
        if (oldData) {
          try {
            var arr = JSON.parse(oldData)
            items = (Array.isArray(arr) ? arr : []).map(normalizeItem)
          } catch (e2) {
            items = []
          }
        }
        var obj = emptyObject()
        obj.items = items
        storage.set({
          key: V2_KEY,
          value: JSON.stringify(obj),
          success: function() {
            storage.delete({
              key: OLD_KEY,
              success: function() {
                cb({ version: 2, items: items, source: "v1migrated" })
              },
              fail: function() {
                cb({ version: 2, items: items, source: "v1migrated" })
              }
            })
          },
          fail: function() {
            cb({ version: 2, items: items, source: "v1migrated" })
          }
        })
      },
      fail: function() {
        cb(emptyObject())
      }
    })
  }
  storage.get({
    key: V2_KEY,
    success: function(data) {
      if (data) {
        try {
          var obj = JSON.parse(data)
          var items = Array.isArray(obj.items) ? obj.items.map(normalizeItem) : []
          cb({ version: 2, items: items, source: "v2" })
          return
        } catch (e) {
          dlog(e)
        }
      }
      migrateOld()
    },
    fail: function() {
      migrateOld()
    }
  })
}

// 写入（落 v2 键；done 里统一回调，成功/失败都放行以免卡界面）
function save(items, cb) {
  var obj = emptyObject()
  obj.items = items
  storage.set({
    key: V2_KEY,
    value: JSON.stringify(obj),
    success: function() {
      if (cb) cb()
    },
    fail: function() {
      if (cb) cb()
    }
  })
}

// 按 id 定位条目下标；找不到返回 -1。
// 存在理由：列表落盘后会按剩余天数重排，任何基于数组下标的延迟操作
// （二次确认删除、3 秒窗口内的编辑）都会指向错误条目。
function findIndexById(items, id) {
  if (!items || !items.length) return -1
  var target = String(id)
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].id) === target) return i
  }
  return -1
}

// 按 id 存在则更新、不存在则追加，返回新数组（不原地改）
function upsert(items, item) {
  var list = (items || []).slice()
  var idx = findIndexById(list, item && item.id)
  if (idx >= 0) {
    list[idx] = item
  } else {
    list.push(item)
  }
  return list
}

module.exports = {
  V2_KEY: V2_KEY,
  OLD_KEY: OLD_KEY,
  COLORS: COLORS,
  DEFAULT_COLOR: DEFAULT_COLOR,
  normalizeColor: normalizeColor,
  colorOf: colorOf,
  tintColor: tintColor,
  adaptColor: adaptColor,
  findIndexById: findIndexById,
  upsert: upsert,
  newId: newId,
  load: load,
  save: save,
  recompute: recompute,
  sortByAbsDays: sortByAbsDays,
  sortByTitle: sortByTitle,
  sortForDisplay: sortForDisplay,
  statusOf: statusOf,
  progressOf: progressOf,
  computeItem: computeItem
}