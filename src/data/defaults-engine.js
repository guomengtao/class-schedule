// ============================================================
// 默认值迁移引擎
// ============================================================
// 职责：
//   1. 区分「全新安装」「老版本升级上来的老用户」「已有状态记录的老用户」
//   2. 按 app-defaults.js 的 policy 逐条应用默认值（幂等，靠版本号保证只跑一次）
//   3. 登记「用户亲手改过哪些设置」（userSet），供 soft 策略判断
//
// 详见 docs/新老用户默认设置集中管理方案.md
//
// 三条铁律：
//   A. app_state 不存在时绝不能默认当成新用户 —— 必须先串行探测业务数据，
//      命中任一即按老用户处理，否则会把老用户设置一次性清空。
//   B. 迁移引擎直接操作 storage，绝不用 store.js 的 setter
//      （store 的 setter 一律视为「用户行为」并自动登记 userSet）。
//   C. 全程串行 —— 手环 RTOS 存储 I/O 不支持高并发。

var storage = require("@system.storage")
var defaults = require("./app-defaults.js")

var STATE_KEY = "app_state"

// 探测「是否已有业务数据」用的 key 列表。
// 串行逐个读，命中即停（不做并发）。
var PROBE_KEYS = [
  "scheduleNames",
  "allCourses_0",
  "homepage_settings",
  "appTheme",
  "baseFontSize",
  "currentScheduleIndex",
  "userNickname"
]

function nowMs() {
  try {
    return (new Date()).getTime()
  } catch (e) {
    return 0
  }
}

function log() {
  try {
    console.log.apply(console, arguments)
  } catch (e) {}
}

function emptyState() {
  return {
    installedAt: nowMs(),
    isFreshInstall: false,
    defaultsVersion: 0,
    lastApplyAt: 0,
    forcedKeys: [],
    userSet: {}
  }
}

function readState(callback) {
  storage.get({
    key: STATE_KEY,
    success: function (raw) {
      if (raw === undefined || raw === null || raw === "") {
        callback(null)
        return
      }
      var obj = null
      try {
        obj = JSON.parse(raw)
      } catch (e) {
        obj = null
      }
      if (!obj || typeof obj !== "object") {
        callback(null)
        return
      }
      // 字段兜底，避免历史结构缺字段导致后续判断异常
      if (obj.defaultsVersion === undefined) obj.defaultsVersion = 0
      if (!obj.userSet) obj.userSet = {}
      if (!obj.forcedKeys) obj.forcedKeys = []
      if (obj.isFreshInstall === undefined) obj.isFreshInstall = false
      callback(obj)
    },
    fail: function () {
      callback(null)
    }
  })
}

function writeState(state, callback) {
  if (state.lastApplyAt === undefined || state.lastApplyAt === null) {
    state.lastApplyAt = nowMs()
  }
  storage.set({
    key: STATE_KEY,
    value: JSON.stringify(state),
    success: function () { if (callback) callback(true) },
    fail: function () { if (callback) callback(false) }
  })
}

// 串行探测是否存在历史业务数据；命中即停
function probeExistingData(callback) {
  var i = 0
  function step() {
    if (i >= PROBE_KEYS.length) {
      callback(false)
      return
    }
    var k = PROBE_KEYS[i]
    i++
    storage.get({
      key: k,
      success: function (data) {
        if (data !== undefined && data !== null && data !== "") {
          callback(true)
          return
        }
        step()
      },
      fail: function () {
        step()
      }
    })
  }
  step()
}

function inUserSet(state, id) {
  return !!(state.userSet && state.userSet[id] === true)
}

// 读出某条目的当前值（对象型取字段，单值型取整体）
function readCurrent(item, callback) {
  storage.get({
    key: item.key,
    success: function (raw) {
      if (item.field === undefined) {
        callback(raw)
        return
      }
      if (raw === undefined || raw === null || raw === "") {
        callback(undefined)
        return
      }
      var obj = null
      try {
        obj = JSON.parse(raw)
      } catch (e) {
        obj = null
      }
      if (!obj || typeof obj !== "object") {
        callback(undefined)
        return
      }
      callback(obj[item.field])
    },
    fail: function () {
      callback(undefined)
    }
  })
}

// 写入某条目（对象型走「读 → 改 → 写」，绝不整对象替换）
function writeItem(item, value, callback) {
  if (item.field === undefined) {
    storage.set({
      key: item.key,
      value: typeof value === "string" ? value : JSON.stringify(value),
      success: function () { callback(true) },
      fail: function () { callback(false) }
    })
    return
  }
  storage.get({
    key: item.key,
    success: function (raw) {
      var obj = {}
      if (raw !== undefined && raw !== null && raw !== "") {
        try {
          var parsed = JSON.parse(raw)
          if (parsed && typeof parsed === "object") obj = parsed
        } catch (e) {}
      }
      obj[item.field] = value
      storage.set({
        key: item.key,
        value: JSON.stringify(obj),
        success: function () { callback(true) },
        fail: function () { callback(false) }
      })
    },
    fail: function () {
      var obj = {}
      obj[item.field] = value
      storage.set({
        key: item.key,
        value: JSON.stringify(obj),
        success: function () { callback(true) },
        fail: function () { callback(false) }
      })
    }
  })
}

function shouldApply(item, state) {
  if (item.dynamic || item.lazy || item.dynamicKey) return false  // 不参与迁移写盘
  if (item.policy === "keep") return false                        // keep 永不改动
  if (item.policy === "force") return true                        // force 无条件覆盖
  return !inUserSet(state, item.id)                               // soft：用户没改过才动
}

// 串行应用待处理条目。单条失败跳过并继续（失败安全），不影响启动。
function applySerial(items, state, result, callback) {
  var i = 0
  function step() {
    if (i >= items.length) {
      callback()
      return
    }
    var item = items[i]
    i++
    if (!shouldApply(item, state)) {
      step()
      return
    }
    readCurrent(item, function (cur) {
      if (cur !== undefined && cur !== null) {
        // 已有值的 soft 项：保留用户/历史值，不覆盖
        step()
        return
      }
      writeItem(item, item.value, function (ok) {
        if (ok) {
          result.applied++
          if (item.policy === "force") {
            state.forcedKeys.push(item.id)
          }
          log("[defaults] applied " + item.id + " = " + JSON.stringify(item.value))
        }
        step()
      })
    })
  }
  step()
}

// 全新安装：只落状态标记。
// 业务默认值一律「懒读兜底」，不必在首次启动时批量写盘 ——
// 手环 RTOS 存储 I/O 敏感，首启少写一次就少一分风险。
function applyFresh(result, callback) {
  var state = emptyState()
  state.isFreshInstall = true
  state.defaultsVersion = defaults.CURRENT_VERSION
  result.kind = "fresh"
  writeState(state, function () {
    callback(result)
  })
}

function applyUpgrade(state, result, kind, callback) {
  result.kind = kind
  var oldVer = parseInt(state.defaultsVersion)
  if (isNaN(oldVer)) oldVer = 0

  if (oldVer >= defaults.CURRENT_VERSION) {
    // 版本一致：只读一次状态即返回，零写入
    callback(result)
    return
  }

  var todo = []
  for (var i = 0; i < defaults.ITEMS.length; i++) {
    var it = defaults.ITEMS[i]
    var since = it.since === undefined ? 1 : it.since
    if (since > oldVer) todo.push(it)
  }

  applySerial(todo, state, result, function () {
    state.defaultsVersion = defaults.CURRENT_VERSION
    state.lastApplyAt = nowMs()
    writeState(state, function () {
      callback(result)
    })
  })
}

/**
 * 入口。callback(result)，result = { kind, applied, forced }
 * kind: "fresh"（全新安装）| "legacy"（老版本升级，无状态记录）| "existing"（已有状态记录）
 */
function run(callback) {
  callback = callback || function () {}
  var result = { kind: "none", applied: 0 }

  try {
    readState(function (state) {
      if (state) {
        applyUpgrade(state, result, "existing", callback)
        return
      }
      // 无状态记录：必须区分「全新安装」与「老版本升级上来的老用户」
      probeExistingData(function (hasData) {
        if (hasData) {
          var legacy = emptyState()
          legacy.isFreshInstall = false
          legacy.defaultsVersion = 0
          log("[defaults] legacy install detected (no app_state but business data exists)")
          applyUpgrade(legacy, result, "legacy", callback)
        } else {
          applyFresh(result, callback)
        }
      })
    })
  } catch (e) {
    log("[defaults] run failed: " + e)
    callback(result)
  }
}

// ===== userSet：登记「用户亲手改过哪些设置」 =====
// store.js 的所有 setter 调用 markUserSet()；迁移引擎不登记。
// 内存累积 + 合并写盘，避免每次点开关都写一次 storage（RTOS 不支持高并发）。

var _pendingUserSet = {}
var _flushTimer = null
var FLUSH_DELAY = 2000

function flushUserSet(callback) {
  _flushTimer = null
  var keys = []
  for (var k in _pendingUserSet) {
    if (_pendingUserSet.hasOwnProperty(k) && _pendingUserSet[k]) keys.push(k)
  }
  _pendingUserSet = {}
  if (keys.length === 0) {
    if (callback) callback(false)
    return
  }
  readState(function (state) {
    if (!state) state = emptyState()
    if (!state.userSet) state.userSet = {}
    for (var i = 0; i < keys.length; i++) {
      state.userSet[keys[i]] = true
    }
    writeState(state, function (ok) {
      if (callback) callback(ok)
    })
  })
}

function markUserSet(id) {
  if (!id) return
  _pendingUserSet[id] = true
  if (_flushTimer) return
  try {
    _flushTimer = setTimeout(flushUserSet, FLUSH_DELAY)
  } catch (e) {
    // 定时器不可用时立刻落盘，保证不丢
    flushUserSet()
  }
}

// 立即落盘（页面 onHide / onDestroy 时调用，避免内存中的登记丢失）
function flush(callback) {
  if (_flushTimer) {
    try { clearTimeout(_flushTimer) } catch (e) {}
    _flushTimer = null
  }
  flushUserSet(callback)
}

module.exports = {
  STATE_KEY: STATE_KEY,
  run: run,
  readState: readState,
  markUserSet: markUserSet,
  flush: flush
}
