/**
 * 晚课（rotation）运行时 —— 手环端
 *
 * 契约与手机端 ev-schedule-android / 同步器 ev-schedule-sync 完全一致：
 *   { enabled, cycle, time, calibDate, calibWeek, cells[week][day] }
 *   week: 0 基（0 = 周期内第 1 周）
 *   day : 0 基（0 = 周一，6 = 周日）
 * 存储 key：ev_rotation_<scheduleIndex>，与导入/导出口径相同（app.ux 里写的也是这个 key）。
 *
 * 设计要点
 * 1. 只在「数据出口」注入一次。所有页面（首页/周视图/全课表/6 个面板/表盘）都走
 *    database.getAllCourses*，在这儿插一条晚课，等于一次改动全覆盖，不必逐页改。
 * 2. 注入必须幂等。database 有内存缓存，同一份数组可能被反复交给调用方，
 *    所以每次先摘掉上一轮插进去的 _rotation 条目，再按当前周次重新插。
 * 3. 晚课不是「第 N 节」，而是「每天最后一节之后的附加课」，因此按 start_time
 *    排序插到正确位置，而不是无脑追加到末尾（时段可能早于最后一节）。
 *
 * ── 动态周期与周次校准（2026-11-09，用户裁定）──────────────────────────
 * 4. cycle 不设死，1..12 任意。每个学校轮换长度不同：2 周两套、6 周六套、
 *    甚至 1 周（等价于不轮换，可直接并进主课表）。cells 行数始终跟随 cycle。
 * 5. 「本周是第几周」不存一个静态数字，而存「本周一 = 第 N 周」这个锚点：
 *      calibDate = 本周一 YYYY-MM-DD，calibWeek = N
 *    weekIndexOf() 是纯函数：按目标日期与锚点相差几个自然周外推，再对 cycle
 *    取模回卷。因此下周一自动 +1、到周期末尾自动回第 1 周，无需定时任务、
 *    无需后台进程，重启后仍对，导出到别的设备也对。
 *    ⚠️ calibDate 必须写「周一」而不是「今天」。周三设置若不归到周一，
 *       下周二还算同一周、下周三才跳周，跨周边界会偏 4 天。
 *    手机端 RotationStore.mondayDateString() 就是干这个的，三端口径一致。
 * 6. 用户明确裁定「不做真实开学周设置」：回忆 + 反算容易错，也增加负担。
 *    seed 里的 calibDate 只是 Demo 默认锚点，不需要用户填真实开学日；
 *    设置页点一次「本周是第几周」即覆盖，之后自然循环。
 *
 * ── 默认 6 周 Demo 数据（2026-11-09，用户裁定）────────────────────────
 * 7. 照片里那 6 周是某学校真实课表，作为**默认 Demo 数据**随包带上，
 *    首页/周视图/晚课页第一次打开就能看到，不是把 6 周写死成唯一周期。
 *    其他学校下载后可自行删格、减周、加周，或整份关掉；一旦用户在页面保存过，
 *    origin 变成 "user"，seed 永不再回填（含用户主动清空全部格子）。
 * 8. seed 必须写回 storage，不能只活在内存 cache 里：否则导出/备份拿不到，
 *    且 storage 里残留的「全空默认壳」会让 normalize() 误判成「已有数据」，
 *    首页首帧和后续刷新都没有晚课 —— 这就是用户说的「数据又丢了」。
 */
var storage = require("@system.storage")

var KEY_PREFIX = "ev_rotation_"
var DAY_NAMES = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
var DAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"]
var DEFAULT_CYCLE = 3
var MAX_CYCLE = 12
var DEFAULT_TIME = "17:10 - 18:00"
var WEEK_MS = 7 * 24 * 60 * 60 * 1000

// index -> 模板（null 表示「确认没有」）。同步注入只能吃这儿的数据。
var cache = {}
// index -> 是否已尝试读过盘（区分「还没读」和「读过了但没有」）
var primed = {}
// index -> 正在等待回调的回调
var waiting = {}

function log(msg) {
  try {
    console.log("[ROT] " + msg)
  } catch (e) {}
}

function toArrayBuffer(raw) {
  return raw
}

function clampWeek(w, cycle) {
  var c = cycle > 0 ? cycle : 1
  var n = parseInt(w, 10) || 1
  return Math.max(1, Math.min(c, n))
}

/** 接受 JSON 字符串 / 对象，统一成模板；无法识别返回 null */
function normalize(raw) {
  var obj = raw
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw)
    } catch (e) {
      return null
    }
  }
  if (!obj || typeof obj !== "object") {
    return null
  }
  var cycle = parseInt(obj.cycle, 10)
  if (!cycle || cycle < 1) {
    cycle = DEFAULT_CYCLE
  }
  if (cycle > MAX_CYCLE) {
    cycle = MAX_CYCLE
  }
  var tpl = {
    enabled: obj.enabled === true || obj.enabled === "true",
    cycle: cycle,
    time: obj.time ? String(obj.time) : DEFAULT_TIME,
    calibDate: obj.calibDate ? String(obj.calibDate) : "",
    // 缩周期后老数据可能留着 calibWeek > cycle，夹回合法范围
    calibWeek: clampWeek(obj.calibWeek, cycle),
    // 内部标记，不进跨端契约（syncNormalizeRotation 只挑 6 个字段）：
    //   "demo"   = seed 灌入，可在用户配置前修正
    //   "user"   = 用户在页面保存过（含主动清空），seed 不得回填
    //   "import" = 同步器 / 备份恢复写入，seed 不得回填
    //   缺失     = 历史遗留空壳，视为「从未配置」
    origin: obj.origin ? String(obj.origin) : "",
    cells: []
  }
  // cells 两种形态都认：数组 [["语", ...], ...]，对象 {"1":{"0":"语"}}
  var src = obj.cells
  for (var w = 0; w < cycle; w++) {
    var row = []
    for (var d = 0; d < 7; d++) {
      row.push("")
    }
    tpl.cells.push(row)
  }
  if (src && src.length !== undefined) {
    for (var i = 0; i < cycle && i < src.length; i++) {
      var line = src[i]
      if (!line) {
        continue
      }
      for (var d2 = 0; d2 < 7 && d2 < line.length; d2++) {
        tpl.cells[i][d2] = line[d2] == null ? "" : String(line[d2]).trim()
      }
    }
  } else if (src && typeof src === "object") {
    for (var w2 = 1; w2 <= cycle; w2++) {
      var lineObj = src[String(w2)]
      if (!lineObj) {
        continue
      }
      for (var d3 = 0; d3 < 7; d3++) {
        var v = lineObj[String(d3)]
        if (v != null && String(v).length > 0) {
          tpl.cells[w2 - 1][d3] = String(v).trim()
        }
      }
    }
  }
  return tpl
}

function isEmpty(tpl) {
  if (!tpl || !tpl.cells) {
    return true
  }
  for (var w = 0; w < tpl.cells.length; w++) {
    for (var d = 0; d < tpl.cells[w].length; d++) {
      if (tpl.cells[w][d]) {
        return false
      }
    }
  }
  return true
}

/** 已填格数（UI 摘要用） */
function filledCount(tpl) {
  var n = 0
  if (!tpl || !tpl.cells) {
    return 0
  }
  for (var w = 0; w < tpl.cells.length; w++) {
    for (var d = 0; d < tpl.cells[w].length; d++) {
      if (tpl.cells[w][d]) {
        n++
      }
    }
  }
  return n
}

/** 某一周已填格数（缩周期前的二次确认判据） */
function weekFilled(tpl, week) {
  if (!tpl || !tpl.cells || !tpl.cells[week]) {
    return 0
  }
  var n = 0
  for (var d = 0; d < tpl.cells[week].length; d++) {
    if (tpl.cells[week][d]) {
      n++
    }
  }
  return n
}

/**
 * 《2026——2027学年度第一学期（八年级）晚课课表》照片转写（2026-11-09）。
 *
 * 这是随包发布的默认 Demo 数据（某校真实课表），不是写死的唯一周期：
 * 用户可在晚课页减周 / 加周 / 删格 / 关掉，保存后 origin="user"，seed 不再介入。
 * 其他学校下载后按自己的轮换长度改即可。
 *
 * 两行班级 = 两套课表，SEED_GRIDS[0] = 8.19、[1] = 8.20；其余课表序号
 * 统一 fallback 到 [0]，保证任何新建课表的首页都有默认晚课可看。
 * 每周 7 列，前 5 列来自照片，后 2 列留空（页面默认只显示周一~周五）。
 * cycle 由网格长度推导，不再写死 6：以后换成 2 周制照片也不用改代码。
 * calibDate 只是 Demo 默认锚点（恰好是周一）；用户不需要回忆真实开学周，
 * 在设置页指定「本周是第几周」即写入本周一锚点并自动循环。
 */
var SEED_GRIDS = [
  [ // 8.19
    ["语", "数", "体", "英", "物", "", ""],
    ["英", "历", "语", "生", "数", "", ""],
    ["道", "数", "英", "地", "历", "", ""],
    ["语", "数", "体", "英", "物", "", ""],
    ["道", "数", "地", "语", "体", "", ""],
    ["语", "生", "物", "英", "社团", "", ""]
  ],
  [ // 8.20
    ["语", "物", "体", "生", "英", "", ""],
    ["语", "历", "数", "英", "道", "", ""],
    ["语", "物", "生", "英", "数", "", ""],
    ["数", "语", "体", "物", "地", "", ""],
    ["英", "数", "道", "历", "体", "", ""],
    ["语", "英", "地", "数", "社团", "", ""]
  ]
]
var SEED_CALIB_DATE = "2026-08-31"

/** 默认 Demo 模板；任意 index 都有，idx>=2 回落到第一套 */
function seedTemplate(index) {
  var idx = index == null ? 0 : index
  var grid = SEED_GRIDS[idx] || SEED_GRIDS[0]
  if (!grid) {
    return null
  }
  return normalize({
    enabled: true,
    cycle: grid.length,
    time: DEFAULT_TIME,
    calibDate: SEED_CALIB_DATE,
    calibWeek: 1,
    cells: grid,
    origin: "demo"
  })
}

/**
 * 是否需要用 Demo 覆盖当前读到的内容。
 * 只覆盖「从没配置过」：没有模板，或历史遗留的全空默认壳。
 * 用户保存过（含主动清空）、同步器导入过、Demo 已灌过的，一律不动。
 */
function needsSeed(tpl) {
  if (!tpl) {
    return true
  }
  if (!isEmpty(tpl)) {
    return false
  }
  return tpl.origin !== "user" && tpl.origin !== "import" && tpl.origin !== "demo"
}

/** 异步读盘并进缓存；同一 index 并发调用会合并成一次读 */
function prime(index, callback) {
  var idx = index == null ? 0 : index
  if (primed[idx]) {
    if (callback) {
      callback(cache[idx] || null)
    }
    return
  }
  if (waiting[idx]) {
    if (callback) {
      waiting[idx].push(callback)
    }
    return
  }
  waiting[idx] = callback ? [callback] : []
  try {
    storage.get({
      key: KEY_PREFIX + idx,
      success: function (raw) {
        cache[idx] = normalize(raw)
        if (needsSeed(cache[idx])) {
          var seeded = seedTemplate(idx)
          if (seeded) {
            cache[idx] = seeded
            // 写回盘：seed 必须持久化，首页 / 周视图 / 导出 / 备份才拿得到，
            // 也避免下次冷启动又读到全空壳而误判「已有数据」。
            try {
              storage.set({
                key: KEY_PREFIX + idx,
                value: JSON.stringify(seeded),
                success: function () { finish(idx) },
                fail: function () { finish(idx) }
              })
              return
            } catch (e) {
              finish(idx)
              return
            }
          }
        }
        finish(idx)
      },
      fail: function () {
        cache[idx] = null
        finish(idx)
      }
    })
  } catch (e) {
    cache[idx] = null
    finish(idx)
  }
}

function finish(idx) {
  primed[idx] = true
  var cbs = waiting[idx] || []
  delete waiting[idx]
  var tpl = cache[idx] || null
  for (var i = 0; i < cbs.length; i++) {
    try {
      cbs[i](tpl)
    } catch (e) {}
  }
}

/** 同步取缓存（没预热过就是 undefined，调用方需区分「未知」与「没有」） */
function peek(index) {
  var idx = index == null ? 0 : index
  return primed[idx] ? (cache[idx] || null) : undefined
}

function setCache(index, tpl) {
  var idx = index == null ? 0 : index
  cache[idx] = tpl || null
  primed[idx] = true
}

function save(index, tpl, callback) {
  var idx = index == null ? 0 : index
  if (tpl) {
    // 用户一旦保存（哪怕把格子全清空），这份数据就是他自己的，Demo 不再回填。
    tpl.origin = "user"
  }
  cache[idx] = tpl || null
  primed[idx] = true
  if (!tpl) {
    try {
      storage.delete({
        key: KEY_PREFIX + idx,
        success: function () {
          if (callback) callback(null)
        },
        fail: function () {
          if (callback) callback(null)
        }
      })
      return
    } catch (e) {
      if (callback) callback(null)
      return
    }
  }
  try {
    storage.set({
      key: KEY_PREFIX + idx,
      value: JSON.stringify(tpl),
      success: function () {
        if (callback) callback(null)
      },
      fail: function (e) {
        if (callback) callback(e)
      }
    })
  } catch (e2) {
    if (callback) callback(e2)
  }
}

function clear(index, callback) {
  save(index, null, callback)
}

/** "2026-09-01" / "2026/9/1" → Date（本地 0 点）；非法返回 null */
function parseDate(str) {
  if (!str) {
    return null
  }
  var m = String(str).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!m) {
    return null
  }
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
}

/** 归一化到所在自然周的周一 00:00（周一=0 … 周日=6 反推） */
function mondayOf(date) {
  var d = date ? new Date(date.getTime()) : new Date()
  d.setHours(0, 0, 0, 0)
  var back = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - back)
  return d
}

/** Date → "YYYY-MM-DD" */
function formatDate(d) {
  function pad(n) {
    return n < 10 ? "0" + n : String(n)
  }
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
}

function weekIndexOf(tpl, date) {
  if (!tpl) {
    return 0
  }
  var cycle = tpl.cycle || 1
  var cal = parseDate(tpl.calibDate)
  if (!cal) {
    // 没校准就固定按第 1 周算，绝不猜
    return 0
  }
  var d = date ? new Date(date.getTime()) : new Date()
  // 两边都归到自然周周一再算差值：calibDate 由设置页写成周一时与
  // 手机端 RotationStore.weekOf() 完全一致；老数据若不是周一也能容错。
  var calMon = mondayOf(cal)
  var curMon = mondayOf(d)
  var weeks = Math.round((curMon.getTime() - calMon.getTime()) / WEEK_MS)
  var idx = (clampWeek(tpl.calibWeek, cycle) - 1) + weeks
  return ((idx % cycle) + cycle) % cycle
}

/** 当前是第几周（1-based），与手机端 currentWeek() 对齐 */
function currentWeek(tpl, date) {
  return weekIndexOf(tpl, date) + 1
}

/** 下周是第几周（1-based）；到周期末尾自动回卷 */
function nextWeek(tpl, date) {
  if (!tpl) {
    return 1
  }
  var d = date ? new Date(date.getTime()) : new Date()
  d.setDate(d.getDate() + 7)
  return weekIndexOf(tpl, d) + 1
}

/**
 * 指定「这周是第 N 周」，写入锚点。
 * 这是「本周第几周」设置的唯一入口；之后不再需要任何更新动作，
 * weekIndexOf() 每次按设备日期现算，跨周自动推进、按 cycle 回卷。
 */
function setCurrentWeek(tpl, week, date) {
  if (!tpl) {
    tpl = normalize({})
  }
  tpl.calibDate = formatDate(mondayOf(date))
  tpl.calibWeek = clampWeek(week, tpl.cycle)
  return tpl
}

/** 设置页摘要：周期 / 当前 / 下周 / 锚点 / 是否已校准 */
function weekInfo(tpl, date) {
  if (!tpl) {
    return null
  }
  return {
    cycle: tpl.cycle || 1,
    current: currentWeek(tpl, date),
    next: nextWeek(tpl, date),
    calibDate: tpl.calibDate || "",
    calibWeek: clampWeek(tpl.calibWeek, tpl.cycle),
    anchored: !!parseDate(tpl.calibDate)
  }
}

/** 周一=0 … 周日=6 */
function dayIndexOf(date) {
  var d = date || new Date()
  return (d.getDay() + 6) % 7
}

function cellOf(tpl, week, day) {
  if (!tpl || !tpl.cells || !tpl.cells[week]) {
    return ""
  }
  var v = tpl.cells[week][day]
  return v ? String(v).trim() : ""
}

/** 今天该上哪节晚课；没配置返回空串 */
function todayCell(tpl, date) {
  if (!tpl || !tpl.enabled) {
    return ""
  }
  return cellOf(tpl, weekIndexOf(tpl, date), dayIndexOf(date))
}

function startMinutes(time) {
  var m = String(time || "").match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (!m) {
    return 9999
  }
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

function dayKeyOf(groupDay, i) {
  if (typeof groupDay === "number") {
    // 老数据可能用 1-7 表示周一到周日
    return groupDay >= 1 && groupDay <= 7 ? groupDay - 1 : i
  }
  var s = String(groupDay || "")
  var ci = DAY_NAMES.indexOf(s)
  if (ci >= 0) {
    return ci
  }
  var short = DAY_SHORT.indexOf(s.replace(/^周/, ""))
  return short >= 0 ? short : i
}

/**
 * 把晚课注入 schedule（原地修改并返回）。
 * schedule 形态：[{ day: "星期一", classes: [{id,name,time,...}] }, ...]
 * 幂等：每次先摘掉旧的 _rotation 条目再重插。
 */
function injectInto(schedule, index, date) {
  if (!schedule || !schedule.length) {
    return schedule
  }
  var tpl = peek(index)
  if (tpl === undefined) {
    // 还没预热：这一帧先不显示，同时触发预热 + 通知调用方重绘一次。
    prime(index, null)
    return schedule
  }
  var week = tpl ? weekIndexOf(tpl, date) : 0
  for (var i = 0; i < schedule.length; i++) {
    var group = schedule[i]
    if (!group || !group.classes) {
      continue
    }
    var classes = group.classes
    // 幂等：剔掉上一轮的注入结果
    for (var k = classes.length - 1; k >= 0; k--) {
      if (classes[k] && classes[k]._rotation) {
        classes.splice(k, 1)
      }
    }
    if (!tpl || !tpl.enabled) {
      continue
    }
    var di = dayKeyOf(group.day, i)
    var name = cellOf(tpl, week, di)
    if (!name) {
      continue
    }
    var entry = {
      id: "_rot_" + week + "_" + di,
      name: name,
      time: tpl.time,
      teacher: "",
      location: "",
      notes: "",
      _rotation: true
    }
    // 按开始时间插到正确位置（晚课通常在最后，但不假设）
    var pos = classes.length
    var start = startMinutes(tpl.time)
    for (var j = 0; j < classes.length; j++) {
      if (startMinutes(classes[j] && classes[j].time) > start) {
        pos = j
        break
      }
    }
    classes.splice(pos, 0, entry)
  }
  return schedule
}

/**
 * 长列表视图用的数据：按周分组的扁平条目。
 * 设备端编辑页不做二维格子，用这个直接铺列表。
 *   返回 [{ week: 1, weekLabel: "第1周", items: [{day: 0, dayLabel: "周一", name, time}] }]
 */
function listView(tpl) {
  var out = []
  if (!tpl || !tpl.cells) {
    return out
  }
  var curWeek = weekIndexOf(tpl)
  for (var w = 0; w < tpl.cycle; w++) {
    var items = []
    for (var d = 0; d < 7; d++) {
      var name = cellOf(tpl, w, d)
      items.push({
        day: d,
        dayLabel: "周" + DAY_SHORT[d],
        name: name,
        time: tpl.time,
        isToday: w === curWeek && d === dayIndexOf()
      })
    }
    out.push({
      week: w,
      weekLabel: "第" + (w + 1) + "周",
      isCurrent: w === curWeek,
      items: items
    })
  }
  return out
}

/** 单格写入（设备端列表编辑用），返回新的模板 */
function setCell(tpl, week, day, name) {
  if (!tpl) {
    tpl = normalize({})
  }
  if (!tpl.cells[week]) {
    return tpl
  }
  tpl.cells[week][day] = name == null ? "" : String(name).trim()
  return tpl
}

/** 全部清空（保留周期/时段设置） */
function clearCells(tpl) {
  if (!tpl || !tpl.cells) {
    return tpl
  }
  for (var w = 0; w < tpl.cells.length; w++) {
    for (var d = 0; d < tpl.cells[w].length; d++) {
      tpl.cells[w][d] = ""
    }
  }
  return tpl
}

/** 周期变更时补齐/裁剪行，已填内容尽量保留；校准周夹回 1..cycle */
function setCycle(tpl, cycle) {
  if (!tpl) {
    tpl = normalize({})
  }
  var c = Math.max(1, Math.min(MAX_CYCLE, parseInt(cycle, 10) || 1))
  while (tpl.cells.length < c) {
    var row = []
    for (var d = 0; d < 7; d++) {
      row.push("")
    }
    tpl.cells.push(row)
  }
  tpl.cells = tpl.cells.slice(0, c)
  tpl.cycle = c
  tpl.calibWeek = clampWeek(tpl.calibWeek, c)
  return tpl
}

/** 摘要文案：「6 周轮转 · 17:10-18:00 · 已填 12 格」/「未启用」 */
function summary(tpl) {
  if (!tpl) {
    return "未设置"
  }
  var head = tpl.cycle + " 周轮转 · " + tpl.time + " · 已填 " + filledCount(tpl) + " 格"
  return tpl.enabled ? head : ("已关闭（" + head + "）")
}

/**
 * 导入 / 备份恢复直接写了 ev_rotation_* 之后必须调用。
 * cache / primed / waiting 是模块级对象，不重置的话 peek() 会一直返回旧模板，
 * 页面看起来像「导入没生效 / 晚课丢了」，直到进程重启才恢复。
 * 用 delete 逐键清，不重新赋值，兼容 const 声明。
 */
function resetCache() {
  for (var k in cache) { if (cache.hasOwnProperty(k)) delete cache[k] }
  for (var p in primed) { if (primed.hasOwnProperty(p)) delete primed[p] }
  for (var w in waiting) { if (waiting.hasOwnProperty(w)) delete waiting[w] }
}

module.exports = {
  KEY_PREFIX: KEY_PREFIX,
  DAY_NAMES: DAY_NAMES,
  DAY_SHORT: DAY_SHORT,
  DEFAULT_CYCLE: DEFAULT_CYCLE,
  MAX_CYCLE: MAX_CYCLE,
  DEFAULT_TIME: DEFAULT_TIME,
  normalize: normalize,
  isEmpty: isEmpty,
  filledCount: filledCount,
  weekFilled: weekFilled,
  seedTemplate: seedTemplate,
  needsSeed: needsSeed,
  prime: prime,
  peek: peek,
  setCache: setCache,
  resetCache: resetCache,
  save: save,
  clear: clear,
  parseDate: parseDate,
  mondayOf: mondayOf,
  formatDate: formatDate,
  weekIndexOf: weekIndexOf,
  currentWeek: currentWeek,
  nextWeek: nextWeek,
  setCurrentWeek: setCurrentWeek,
  weekInfo: weekInfo,
  dayIndexOf: dayIndexOf,
  cellOf: cellOf,
  todayCell: todayCell,
  injectInto: injectInto,
  listView: listView,
  setCell: setCell,
  clearCells: clearCells,
  setCycle: setCycle,
  summary: summary
}
