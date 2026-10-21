// ===== 倒数日统一数据层（版本化迁移 + 共享读写） =====
// 历史问题：旧实现直接读写裸数组 JSON（key="countdownDays"），无版本、无 id、无迁移；
// 且首页/管理页各写一套解析逻辑。现收敛为单一模块：新增/编辑/删除/开关/排序/清空
// 全部经本模块读写 v2 版本化对象 { version:2, items:[{id,title,date,enabled}] }。
// 只允许走 v2 键；读到旧 v1 键时自动迁移并归档，保证旧数据平滑升级。

var storage = require("@system.storage")

var V2_KEY = "countdownDays.v2"
var OLD_KEY = "countdownDays"

var seq = 0

function dlog() {
  // 发布态关闭日志，避免手环上字符串拼接开销
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