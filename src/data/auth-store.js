var storage = require("@system.storage")

var AUTH_KEY = "auth_data"
var MASTER_USAGE_KEY = "master_usage"
var USED_CODES_KEY = "used_codes"
var USED_REDEEM_KEY = "used_redeem"
var DEFAULT_TRIAL_DAYS = 7

var MASTER_CODE = {
  enabled: true,
  code: '202656183702',
  duration: 1,
  maxUsesPerDevice: 30
}

function getTodayDate() {
  var now = new Date()
  var y = now.getFullYear()
  var m = String(now.getMonth() + 1)
  if (m.length < 2) m = '0' + m
  var d = String(now.getDate())
  if (d.length < 2) d = '0' + d
  return y + '-' + m + '-' + d
}

function formatDateStr(ts) {
  var d = new Date(ts)
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1)
  if (m.length < 2) m = '0' + m
  var day = String(d.getDate())
  if (day.length < 2) day = '0' + day
  var h = String(d.getHours())
  if (h.length < 2) h = '0' + h
  var min = String(d.getMinutes())
  if (min.length < 2) min = '0' + min
  return y + '-' + m + '-' + day + ' ' + h + ':' + min
}

function getAuthData(callback) {
  storage.get({
    key: AUTH_KEY,
    success: function(data) {
      if (data) {
        try {
          var parsed = JSON.parse(data)
          callback(parsed)
        } catch (e) {
          callback(null)
        }
      } else {
        callback(null)
      }
    },
    fail: function() {
      callback(null)
    }
  })
}

function setAuthData(data, callback) {
  storage.set({
    key: AUTH_KEY,
    value: JSON.stringify(data),
    success: function() { if (callback) callback(true) },
    fail: function() { if (callback) callback(false) }
  })
}

function loadUsedCodes(callback) {
  storage.get({
    key: USED_CODES_KEY,
    success: function(data) {
      if (data) {
        try {
          callback(JSON.parse(data))
        } catch (e) {
          callback([])
        }
      } else {
        callback([])
      }
    },
    fail: function() { callback([]) }
  })
}

function saveUsedCode(code, callback) {
  loadUsedCodes(function(list) {
    if (list.indexOf(code) === -1) {
      list.push(code)
    }
    storage.set({
      key: USED_CODES_KEY,
      value: JSON.stringify(list),
      success: function() { if (callback) callback(true) },
      fail: function() { if (callback) callback(false) }
    })
  })
}

function loadUsedRedeemCodes(callback) {
  storage.get({
    key: USED_REDEEM_KEY,
    success: function(data) {
      if (data) {
        try {
          callback(JSON.parse(data))
        } catch (e) {
          callback([])
        }
      } else {
        callback([])
      }
    },
    fail: function() { callback([]) }
  })
}

function saveUsedRedeemCode(redeemCode, callback) {
  loadUsedRedeemCodes(function(list) {
    if (list.indexOf(redeemCode) === -1) {
      list.push(redeemCode)
    }
    storage.set({
      key: USED_REDEEM_KEY,
      value: JSON.stringify(list),
      success: function() { if (callback) callback(true) },
      fail: function() { if (callback) callback(false) }
    })
  })
}

function initAuth(callback) {
  getAuthData(function(data) {
    if (data && data.installTime) {
      if (!data.lastRemindDate) data.lastRemindDate = ''
      if (!data.history) data.history = []
      if (callback) callback(data)
    } else {
      var now = Date.now()
      var newData = {
        installTime: now,
        isActivated: false,
        isPermanent: false,
        expireAt: null,
        activatedAt: null,
        lastRemindDate: '',
        remindEnabled: true,
        trialDays: DEFAULT_TRIAL_DAYS,
        productId: '0001',
        history: []
      }
      setAuthData(newData, function() {
        if (callback) callback(newData)
      })
    }
  })
}

function checkStatus(callback) {
  getAuthData(function(data) {
    if (!data) {
      initAuth(function(initData) {
        callback(buildStatus(initData))
      })
      return
    }
    callback(buildStatus(data))
  })
}

function buildStatus(data) {
  var now = Date.now()

  if (data.isActivated && data.isPermanent) {
    return {
      priority: 3,
      status: 'permanent',
      displayStatus: '永久授权',
      color: 'green',
      text: '已永久激活',
      remainingDays: -1,
      expireText: '永久有效',
      isExpired: false,
      isExpiring: false,
      isTrial: false,
      isActivated: true,
      isPermanent: true
    }
  }

  if (data.isActivated && data.expireAt) {
    var remainingMs = data.expireAt - now
    var remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000))

    if (remainingDays <= 0) {
      var expiredDays = Math.abs(Math.floor(remainingMs / (24 * 60 * 60 * 1000)))
      return {
        priority: 1,
        status: 'auth_expired',
        displayStatus: '已过期',
        color: 'red',
        text: '授权已过期，请续费',
        remainingDays: 0,
        expiredDays: expiredDays,
        expireText: '已过期 ' + expiredDays + ' 天',
        isExpired: true,
        isExpiring: false,
        isTrial: false,
        isActivated: true,
        isPermanent: false
      }
    }

    if (remainingDays <= 1) {
      return {
        priority: 2,
        status: 'auth_expiring_critical',
        displayStatus: '即将到期',
        color: '#e67e22',
        text: '授权即将到期，剩余 1 天',
        remainingDays: 1,
        expireText: '剩余 1 天',
        isExpired: false,
        isExpiring: true,
        isTrial: false,
        isActivated: true,
        isPermanent: false
      }
    }

    if (remainingDays <= 3) {
      return {
        priority: 2,
        status: 'auth_expiring_soon',
        displayStatus: '即将到期',
        color: '#d4a017',
        text: '授权剩余 ' + remainingDays + ' 天，请及时续费',
        remainingDays: remainingDays,
        expireText: '剩余 ' + remainingDays + ' 天',
        isExpired: false,
        isExpiring: true,
        isTrial: false,
        isActivated: true,
        isPermanent: false
      }
    }

    return {
      priority: 3,
      status: 'active',
      displayStatus: '已激活',
      color: 'green',
      text: '已激活，剩余 ' + remainingDays + ' 天',
      remainingDays: remainingDays,
      expireText: '剩余 ' + remainingDays + ' 天',
      isExpired: false,
      isExpiring: false,
      isTrial: false,
      isActivated: true,
      isPermanent: false
    }
  }

  var elapsedMs = now - data.installTime
  var elapsedDays = elapsedMs / (24 * 60 * 60 * 1000)
  var trialDays = data.trialDays || DEFAULT_TRIAL_DAYS
  var remainingDays = Math.ceil(trialDays - elapsedDays)

  if (remainingDays <= 0) {
    return {
      priority: 1,
      status: 'trial_expired',
      displayStatus: '已过期',
      color: 'red',
      text: '试用已结束，请激活',
      remainingDays: 0,
      expireText: '试用已过期',
      isExpired: true,
      isExpiring: false,
      isTrial: true,
      isActivated: false,
      isPermanent: false
    }
  }

  if (remainingDays <= 1) {
    return {
      priority: 2,
      status: 'trial_expiring',
      displayStatus: '即将到期',
      color: '#e67e22',
      text: '免费试用即将到期',
      remainingDays: remainingDays,
      expireText: '免费试用剩余 ' + remainingDays + ' 天',
      isExpired: false,
      isExpiring: true,
      isTrial: true,
      isActivated: false,
      isPermanent: false
    }
  }

  return {
    priority: 3,
    status: 'trial_active',
    displayStatus: '免费试用中',
    color: 'gray',
    text: '免费试用中，剩余 ' + remainingDays + ' 天',
    remainingDays: remainingDays,
    expireText: '免费试用剩余 ' + remainingDays + ' 天',
    isExpired: false,
    isExpiring: false,
    isTrial: true,
    isActivated: false,
    isPermanent: false
  }
}

function getFullStatus(callback) {
  getAuthData(function(data) {
    if (!data) {
      initAuth(function(initData) {
        callback(buildFullStatus(initData))
      })
      return
    }
    callback(buildFullStatus(data))
  })
}

function buildFullStatus(data) {
  var status = buildStatus(data)
  status.expireAt = data.expireAt
  status.installTime = data.installTime
  status.activatedAt = data.activatedAt
  status.deviceId = data.deviceId || ''
  status.productId = data.productId || '0001'
  return status
}

function markActivated(days, activationCode, redeemCode, callback) {
  markActivatedV2(days, '0001', activationCode, redeemCode, callback)
}

function markActivatedV2(days, productId, activationCode, redeemCode, callback) {
  var pid = productId || '0001'
  getAuthData(function(data) {
    if (!data) {
      data = {
        installTime: Date.now(),
        trialDays: DEFAULT_TRIAL_DAYS,
        history: [],
        lastRemindDate: '',
        remindEnabled: true
      }
    }
    var now = Date.now()
    if (!data.activatedAt) {
      data.activatedAt = now
    }
    data.isActivated = true
    data.productId = pid

    var durationText
    var codeType
    if (days === -1 || days === 9999) {
      data.isPermanent = true
      data.expireAt = null
      durationText = '永久'
      codeType = 'permanent'
    } else {
      data.isPermanent = false
      var extraMs = days * 24 * 60 * 60 * 1000
      if (data.expireAt && data.expireAt > now) {
        data.expireAt = data.expireAt + extraMs
      } else {
        data.expireAt = now + extraMs
      }
      durationText = days + '天'
      codeType = (days === 7) ? 'trial' : 'standard'
    }

    addHistoryEntry(data, '激活', durationText, codeType, '成功', activationCode, redeemCode)

    setAuthData(data, callback)
  })
}

function addHistoryEntry(data, type, duration, codeType, status, activationCode, redeemCode) {
  if (!data.history) data.history = []
  var entry = {
    id: String(Date.now()),
    timestamp: Date.now(),
    date: formatDateStr(Date.now()),
    type: type,
    duration: duration,
    codeType: codeType,
    status: status,
    activationCode: activationCode || '',
    redeemCode: redeemCode || ''
  }
  data.history.unshift(entry)
  if (data.history.length > 50) {
    data.history = data.history.slice(0, 50)
  }
}

function getHistory(callback) {
  getAuthData(function(data) {
    if (!data || !data.history) {
      callback([])
      return
    }
    callback(data.history)
  })
}

function needsDailyRemind(callback) {
  getAuthData(function(data) {
    if (!data) {
      initAuth(function(initData) {
        callback(shouldRemindToday(initData))
      })
      return
    }
    callback(shouldRemindToday(data))
  })
}

function shouldRemindToday(data) {
  var status = buildStatus(data)
  if (status.status === 'active' || status.status === 'permanent' || status.isActivated) {
    return { shouldRemind: false, status: status }
  }
  var today = getTodayDate()
  if (data.lastRemindDate === today) {
    return { shouldRemind: false, status: status }
  }
  return { shouldRemind: true, status: status }
}

function markRemindedToday(callback) {
  getAuthData(function(data) {
    if (!data) return
    data.lastRemindDate = getTodayDate()
    setAuthData(data, callback)
  })
}

function getRemindDialogContent(status) {
  if (status.isTrial && status.isExpired) {
    return {
      title: '试用已结束',
      icon: '⏰',
      message: '您的7天免费试用已结束，请激活后继续使用全部功能',
      buttonText: '我知道了',
      actionText: '去激活'
    }
  }
  if (status.isTrial && status.isExpiring) {
    return {
      title: '免费试用即将到期',
      icon: '⚠️',
      message: '您的7天免费试用还剩' + status.remainingDays + '天，请及时激活以免影响使用',
      buttonText: '我知道了',
      actionText: '去激活'
    }
  }
  if (status.isTrial) {
    return {
      title: '免费试用中',
      icon: '🎁',
      message: '您正在使用免费试用版，剩余' + status.remainingDays + '天。激活后可解锁全部功能',
      buttonText: '我知道了',
      actionText: '去激活'
    }
  }
  if (status.isExpired) {
    return {
      title: '授权已过期',
      icon: '🔒',
      message: '您的授权已过期' + (status.expiredDays || 0) + '天，请续费后继续使用',
      buttonText: '我知道了',
      actionText: '去续费'
    }
  }
  if (status.isExpiring) {
    return {
      title: '授权即将到期',
      icon: '⏳',
      message: '您的授权还剩' + status.remainingDays + '天，到期后将无法使用，请及时续费',
      buttonText: '我知道了',
      actionText: '去续费'
    }
  }
  return {
    title: '软件授权',
    icon: '📱',
    message: '请激活软件授权以继续使用',
    buttonText: '我知道了',
    actionText: '去激活'
  }
}

function getMasterUsage(deviceId, callback) {
  storage.get({
    key: MASTER_USAGE_KEY,
    success: function(data) {
      if (data) {
        try {
          var all = JSON.parse(data)
          callback(all[deviceId] || 0)
        } catch (e) {
          callback(0)
        }
      } else {
        callback(0)
      }
    },
    fail: function() {
      callback(0)
    }
  })
}

function setMasterUsage(deviceId, count, callback) {
  storage.get({
    key: MASTER_USAGE_KEY,
    success: function(data) {
      var all = {}
      if (data) {
        try {
          all = JSON.parse(data)
        } catch (e) {
          all = {}
        }
      }
      all[deviceId] = count
      storage.set({
        key: MASTER_USAGE_KEY,
        value: JSON.stringify(all),
        success: function() { if (callback) callback(true) },
        fail: function() { if (callback) callback(false) }
      })
    },
    fail: function() {
      var all = {}
      all[deviceId] = count
      storage.set({
        key: MASTER_USAGE_KEY,
        value: JSON.stringify(all),
        success: function() { if (callback) callback(true) },
        fail: function() { if (callback) callback(false) }
      })
    }
  })
}

function verifyMasterCode(code, deviceId, callback) {
  if (code !== MASTER_CODE.code) {
    callback({ success: false, reason: '无效的激活码' })
    return
  }
  if (!MASTER_CODE.enabled) {
    callback({ success: false, reason: '万能码已禁用' })
    return
  }

  getAuthData(function(data) {
    var status = buildStatus(data)

    if (!status.isExpired) {
      callback({
        success: false,
        reason: '万能码仅限已过期用户使用',
        blockReason: 'not_expired'
      })
      return
    }

    getMasterUsage(deviceId, function(usage) {
      var maxUses = MASTER_CODE.maxUsesPerDevice
      if (usage >= maxUses) {
        callback({
          success: false,
          reason: '使用次数已达上限（' + maxUses + '次）',
          blockReason: 'limit_reached'
        })
        return
      }

      var newUsage = usage + 1
      setMasterUsage(deviceId, newUsage, function(saved) {
        var expireAt = Date.now() + MASTER_CODE.duration * 24 * 60 * 60 * 1000
        callback({
          success: true,
          isMasterCode: true,
          duration: MASTER_CODE.duration,
          expireAt: expireAt,
          remainingUses: maxUses - newUsage,
          message: '万能码激活成功，剩余可用 ' + (maxUses - newUsage) + ' 次'
        })
      })
    })
  })
}

module.exports = {
  getAuthData: getAuthData,
  setAuthData: setAuthData,
  initAuth: initAuth,
  checkStatus: checkStatus,
  getFullStatus: getFullStatus,
  markActivated: markActivated,
  markActivatedV2: markActivatedV2,
  getHistory: getHistory,
  needsDailyRemind: needsDailyRemind,
  markRemindedToday: markRemindedToday,
  getRemindDialogContent: getRemindDialogContent,
  getTodayDate: getTodayDate,
  verifyMasterCode: verifyMasterCode,
  loadUsedCodes: loadUsedCodes,
  saveUsedCode: saveUsedCode,
  loadUsedRedeemCodes: loadUsedRedeemCodes,
  saveUsedRedeemCode: saveUsedRedeemCode
}