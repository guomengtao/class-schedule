var storage = require("@system.storage")
var authStore = require("./auth-store")

var DEFAULT_NAMES = ["课程表1"]

var THEMES = {
  blue: {
    name: '深空蓝',
    bg: '#1a1a2e',
    card: '#16213e',
    cardLight: '#0f3460',
    accent: '#7ec8e3',
    text: '#ffffff',
    textSecondary: '#888899',
    textMuted: '#555566',
    border: '#0f3460',
    borderLight: '#2a2a5a',
    keyBg: '#1a1a3e',
    keyBorder: '#2a2a5a',
    btnSecondary: '#333355',
    btnSecondaryText: '#a0a0b0',
    deleteBg: '#2a1a3e',
    deleteText: '#e08080',
    icon: '🔵',
    progressOngoing: 'rgba(126,200,227,0.2)',
    progressDone: 'rgba(74,138,154,0.25)'
  },
  green: {
    name: '翡翠绿',
    bg: '#1a2e1a',
    card: '#1a3a1a',
    cardLight: '#0f4a20',
    accent: '#7ec8a0',
    text: '#ffffff',
    textSecondary: '#889988',
    textMuted: '#556655',
    border: '#0f4a20',
    borderLight: '#2a4a2a',
    keyBg: '#1a2e1a',
    keyBorder: '#2a4a2a',
    btnSecondary: '#334433',
    btnSecondaryText: '#a0b0a0',
    deleteBg: '#2a2e1a',
    deleteText: '#e0c880',
    icon: '🟢',
    progressOngoing: 'rgba(126,200,160,0.2)',
    progressDone: 'rgba(74,138,106,0.25)'
  },
  red: {
    name: '珊瑚红',
    bg: '#2e1a1a',
    card: '#3a1a1a',
    cardLight: '#4a2020',
    accent: '#e37e7e',
    text: '#ffffff',
    textSecondary: '#998888',
    textMuted: '#665555',
    border: '#4a2020',
    borderLight: '#5a2a2a',
    keyBg: '#3a1a1a',
    keyBorder: '#4a2a2a',
    btnSecondary: '#553333',
    btnSecondaryText: '#b0a0a0',
    deleteBg: '#3a1a2a',
    deleteText: '#e38080',
    icon: '🔴',
    progressOngoing: 'rgba(227,126,126,0.2)',
    progressDone: 'rgba(154,74,74,0.25)'
  },
  dark: {
    name: '暗夜黑',
    bg: '#000000',
    card: '#0a0a0a',
    cardLight: '#111111',
    accent: '#666666',
    text: '#cccccc',
    textSecondary: '#666666',
    textMuted: '#444444',
    border: '#1a1a1a',
    borderLight: '#222222',
    keyBg: '#0a0a0a',
    keyBorder: '#1a1a1a',
    btnSecondary: '#222222',
    btnSecondaryText: '#888888',
    deleteBg: '#1a0a0a',
    deleteText: '#aa6666',
    icon: '⚫',
    progressOngoing: 'rgba(102,102,102,0.2)',
    progressDone: 'rgba(68,68,68,0.25)'
  },
  gray: {
    name: '深空灰',
    bg: '#1a1a1a',
    card: '#242424',
    cardLight: '#1a1a1a',
    accent: '#888899',
    text: '#e0e0e0',
    textSecondary: '#888899',
    textMuted: '#555566',
    border: '#2a2a2a',
    borderLight: '#333333',
    keyBg: '#1a1a1a',
    keyBorder: '#2a2a2a',
    btnSecondary: '#333333',
    btnSecondaryText: '#999999',
    deleteBg: '#2a1a1a',
    deleteText: '#cc8888',
    icon: '⬛',
    progressOngoing: 'rgba(136,136,153,0.2)',
    progressDone: 'rgba(85,85,102,0.25)'
  },
  purple: {
    name: '暗紫魅影',
    bg: '#1a0a2e',
    card: '#2a1a3a',
    cardLight: '#3a204a',
    accent: '#b07ec8',
    text: '#e0d0e8',
    textSecondary: '#9988aa',
    textMuted: '#665577',
    border: '#3a204a',
    borderLight: '#4a2a5a',
    keyBg: '#2a1a3a',
    keyBorder: '#3a2a4a',
    btnSecondary: '#443355',
    btnSecondaryText: '#b0a0c0',
    deleteBg: '#3a1a2a',
    deleteText: '#e080c0',
    icon: '🟣',
    progressOngoing: 'rgba(176,126,200,0.2)',
    progressDone: 'rgba(106,74,122,0.25)'
  },
  light: {
    name: '晨光白',
    bg: '#f0f0f0',
    card: '#ffffff',
    cardLight: '#e8e8e8',
    accent: '#4a90d9',
    text: '#222222',
    textSecondary: '#888888',
    textMuted: '#aaaaaa',
    border: '#d0d0d0',
    borderLight: '#e0e0e0',
    keyBg: '#ffffff',
    keyBorder: '#d0d0d0',
    btnSecondary: '#e0e0e0',
    btnSecondaryText: '#666666',
    deleteBg: '#f0e0e0',
    deleteText: '#cc6666',
    icon: '⬜',
    progressOngoing: 'rgba(74,144,217,0.2)',
    progressDone: 'rgba(42,90,138,0.25)'
  },
  warm: {
    name: '暖阳米',
    bg: '#f5f0e8',
    card: '#ffffff',
    cardLight: '#f0ece4',
    accent: '#c4a882',
    text: '#332211',
    textSecondary: '#887766',
    textMuted: '#998877',
    border: '#e0d8cc',
    borderLight: '#e8e0d4',
    keyBg: '#ffffff',
    keyBorder: '#d0c8bc',
    btnSecondary: '#e8e0d4',
    btnSecondaryText: '#887766',
    deleteBg: '#f0e0d8',
    deleteText: '#cc8866',
    icon: '🟡',
    progressOngoing: 'rgba(196,168,130,0.2)',
    progressDone: 'rgba(138,106,74,0.25)'
  },
  forest: {
    name: '墨绿护眼',
    bg: '#1a2a1a',
    card: '#0a1a0a',
    cardLight: '#0a2a0a',
    accent: '#6a9a6a',
    text: '#c0d0c0',
    textSecondary: '#7a8a7a',
    textMuted: '#5a6a5a',
    border: '#0a2a0a',
    borderLight: '#1a3a1a',
    keyBg: '#0a1a0a',
    keyBorder: '#1a2a1a',
    btnSecondary: '#2a3a2a',
    btnSecondaryText: '#8a9a8a',
    deleteBg: '#1a2a1a',
    deleteText: '#aa8866',
    icon: '🌲',
    progressOngoing: 'rgba(106,154,106,0.2)',
    progressDone: 'rgba(58,90,58,0.25)'
  },
  amber: {
    name: '琥珀金',
    bg: '#2a1a0a',
    card: '#3a2a1a',
    cardLight: '#4a3a2a',
    accent: '#d4a060',
    text: '#f0e0c0',
    textSecondary: '#a09070',
    textMuted: '#807060',
    border: '#4a3a2a',
    borderLight: '#5a4a3a',
    keyBg: '#3a2a1a',
    keyBorder: '#4a3a2a',
    btnSecondary: '#554433',
    btnSecondaryText: '#b0a090',
    deleteBg: '#3a2a1a',
    deleteText: '#e0a060',
    icon: '🟠',
    progressOngoing: 'rgba(212,160,96,0.2)',
    progressDone: 'rgba(138,106,58,0.25)'
  }
}

function resolveSystemTheme(callback) {
  try {
    var configuration = require("@system.configuration")
    configuration.getColorMode({
      success: function(data) {
        if (data.colorMode === "dark" || data.colorModeNumber === 1) {
          callback(THEMES.dark, 'auto')
        } else {
          callback(THEMES.light, 'auto')
        }
      },
      fail: function() {
        callback(THEMES.dark, 'auto')
      }
    })
  } catch (e) {
    callback(THEMES.dark, 'auto')
  }
}

module.exports = {
  THEMES: THEMES,

  getTheme: function(callback) {
    storage.get({
      key: "appTheme",
      success: function(data) {
        var name = data || 'blue'
        if (name === 'auto') {
          resolveSystemTheme(callback)
        } else {
          callback(THEMES[name] || THEMES.blue, name)
        }
      },
      fail: function() {
        callback(THEMES.blue, 'blue')
      }
    })
  },

  getThemeName: function(callback) {
    storage.get({
      key: "appTheme",
      success: function(data) {
        callback(data || 'blue')
      },
      fail: function() {
        callback('blue')
      }
    })
  },

  setTheme: function(name, callback) {
    storage.set({
      key: "appTheme",
      value: name || 'blue',
      success: function() { if (callback) callback(true) },
      fail: function() { if (callback) callback(false) }
    })
  },

  getAvailableThemes: function() {
    var keys = Object.keys(THEMES)
    var list = keys.map(function(key) {
      return {
        key: key,
        name: THEMES[key].name,
        icon: THEMES[key].icon,
        accent: THEMES[key].accent,
        bg: THEMES[key].bg,
        card: THEMES[key].card
      }
    })
    list.unshift({
      key: 'auto',
      name: '跟随系统',
      icon: '🔄',
      accent: '#888888',
      bg: '#1a1a2e',
      card: '#16213e'
    })
    return list
  },
  setFontScale: function(scale, callback) {
    storage.set({
      key: "fontScale",
      value: String(scale),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },
  getFontScale: function(callback) {
    storage.get({
      key: "fontScale",
      success: function(data) {
        var scale = parseFloat(data)
        if (!scale || scale < 0.5) { scale = 1.0 }
        callback(scale)
      },
      fail: function() { callback(1.0) }
    })
  },

  getScaleSafe: function(callback) {
    this.getFontScale(function(scale) {
      if (!scale || scale < 0.5) { scale = 1.0 }
      callback(scale)
    })
  },

  buildFontStyles: function(scale, bases) {
    var styles = {}
    for (var key in bases) {
      if (bases.hasOwnProperty(key)) {
        styles[key] = "font-size: " + Math.round(bases[key] * scale) + "px"
      }
    }
    return styles
  },

  getScheduleNames: function(callback) {
    storage.get({
      key: "scheduleNames",
      success: function(data) {
        if (data) {
          try {
            var names = JSON.parse(data)
            callback(names)
          } catch (e) {
            callback(DEFAULT_NAMES.slice())
          }
        } else {
          callback(DEFAULT_NAMES.slice())
        }
      },
      fail: function() {
        callback(DEFAULT_NAMES.slice())
      }
    })
  },

  setScheduleNames: function(names, callback) {
    storage.set({
      key: "scheduleNames",
      value: JSON.stringify(names),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  getCurrentScheduleIndex: function(callback) {
    storage.get({
      key: "currentScheduleIndex",
      success: function(data) {
        var idx = parseInt(data)
        if (isNaN(idx) || idx < 0) { idx = 0 }
        callback(idx)
      },
      fail: function() { callback(0) }
    })
  },

  setCurrentScheduleIndex: function(index, callback) {
    storage.set({
      key: "currentScheduleIndex",
      value: String(index),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  setRemindSettings: function(settings, callback) {
    storage.set({
      key: "remindSettings",
      value: JSON.stringify(settings),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  getRemindSettings: function(callback) {
    storage.get({
      key: "remindSettings",
      success: function(data) {
        if (data) {
          try {
            var settings = JSON.parse(data)
            if (settings.enabled === undefined) settings.enabled = true
            if (settings.minutes === undefined) settings.minutes = 5
            callback(settings)
          } catch (e) {
            callback({ enabled: true, minutes: 5 })
          }
        } else {
          callback({ enabled: true, minutes: 5 })
        }
      },
      fail: function() {
        callback({ enabled: true, minutes: 5 })
      }
    })
  },

  setNickname: function(name, callback) {
    storage.set({
      key: "userNickname",
      value: name || "",
      success: function() { if (callback) callback(true) },
      fail: function() { if (callback) callback(false) }
    })
  },

  getNickname: function(callback) {
    storage.get({
      key: "userNickname",
      success: function(data) {
        callback(data || "")
      },
      fail: function() {
        callback("")
      }
    })
  },

  getVibrationStyles: function() {
    return [
      { key: "short", label: "短震", desc: "轻点一下", duration: 100, interval: 200, count: 1 },
      { key: "long", label: "长震", desc: "持续震动", duration: 800, interval: 200, count: 1 },
      { key: "doubleShort", label: "双短震", desc: "轻点两下", duration: 100, interval: 200, count: 2 },
      { key: "tripleShort", label: "三连震", desc: "连续三下", duration: 100, interval: 200, count: 3 },
      { key: "sos", label: "SOS", desc: "三短求救", duration: 200, interval: 200, count: 3 },
      { key: "heartbeat", label: "心跳", desc: "心跳节奏", duration: 80, interval: 100, count: 8 }
    ]
  },

  setVibrationStyle: function(style, callback) {
    storage.set({
      key: "vibrationStyle",
      value: style || "short",
      success: function() { if (callback) callback(true) },
      fail: function() { if (callback) callback(false) }
    })
  },

  getVibrationStyle: function(callback) {
    storage.get({
      key: "vibrationStyle",
      success: function(data) {
        callback(data || "short")
      },
      fail: function() {
        callback("short")
      }
    })
  },

  getVibrationPresets: function(callback) {
    storage.get({
      key: "vibration_presets",
      success: function(data) {
        if (data) {
          try {
            var presets = JSON.parse(data)
            callback(presets)
          } catch (e) {
            callback([])
          }
        } else {
          callback([])
        }
      },
      fail: function() {
        callback([])
      }
    })
  },

  setVibrationPresets: function(presets, callback) {
    storage.set({
      key: "vibration_presets",
      value: JSON.stringify(presets),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  setQrcodeText: function(text, callback) {
    storage.set({
      key: "qrcode_text",
      value: text || "",
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  getQrcodeText: function(callback) {
    storage.get({
      key: "qrcode_text",
      success: function(data) { callback(data || "") },
      fail: function() { callback("") }
    })
  },

  setBackgroundRunningConfig: function(config, callback) {
    storage.set({
      key: "background_running_config",
      value: JSON.stringify(config),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  getBackgroundRunningConfig: function(callback) {
    storage.get({
      key: "background_running_config",
      success: function(data) {
        if (data) {
          try {
            callback(JSON.parse(data))
          } catch (e) {
            callback({ enabled: false })
          }
        } else {
          callback({ enabled: false })
        }
      },
      fail: function() {
        callback({ enabled: false })
      }
    })
  },

  getBackgroundRunningLogs: function(callback) {
    storage.get({
      key: "background_running_logs",
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
      fail: function() {
        callback([])
      }
    })
  },

  setBackgroundRunningLogs: function(logs, callback) {
    storage.set({
      key: "background_running_logs",
      value: JSON.stringify(logs),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  getHomepageSettings: function(callback) {
    storage.get({
      key: "homepage_settings",
      success: function(data) {
        if (data) {
          try {
            callback(JSON.parse(data))
          } catch (e) {
            callback({ showQuickAdd: true, showCustomContent: false, customContent: "", showTime: true, showStatusBar: true, showPinnedBar: true, showDayNavZong: true, showDayNavJin: true, showDayNavMing: true, showLabSection: true, timeFormat: { year: false, month: false, day: false, hour: true, minute: true, second: false } })
          }
        } else {
          callback({ showQuickAdd: true, showCustomContent: false, customContent: "", showTime: true, showStatusBar: true, showPinnedBar: true, showDayNavZong: true, showDayNavJin: true, showDayNavMing: true, showLabSection: true, timeFormat: { year: false, month: false, day: false, hour: true, minute: true, second: false } })
        }
      },
      fail: function() {
        callback({ showQuickAdd: true, showCustomContent: false, customContent: "", showTime: true, showStatusBar: true, showPinnedBar: true, showDayNavZong: true, showDayNavJin: true, showDayNavMing: true, showLabSection: true, timeFormat: { year: false, month: false, day: false, hour: true, minute: true, second: false } })
      }
    })
  },

  setHomepageSettings: function(settings, callback) {
    storage.set({
      key: "homepage_settings",
      value: JSON.stringify(settings),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  DEFAULT_THEME: {
    name: '深空蓝',
    bg: '#1a1a2e',
    card: '#16213e',
    cardLight: '#0f3460',
    accent: '#7ec8e3',
    text: '#ffffff',
    textSecondary: '#888899',
    textMuted: '#555566',
    border: '#0f3460',
    borderLight: '#2a2a5a',
    keyBg: '#1a1a3e',
    keyBorder: '#2a2a5a',
    btnSecondary: '#333355',
    btnSecondaryText: '#a0a0b0',
    deleteBg: '#2a1a3e',
    deleteText: '#e08080',
    icon: '🔵',
    progressOngoing: 'rgba(126,200,227,0.2)',
    progressDone: 'rgba(74,138,154,0.25)'
  },

  FREE_THEMES: ["blue", "auto"],

  isFreeTheme: function(themeKey) {
    var free = this.FREE_THEMES
    for (var i = 0; i < free.length; i++) {
      if (free[i] === themeKey) return true
    }
    return false
  },

  isPremiumUnlocked: function(callback) {
    storage.get({
      key: "premium_unlocked",
      success: function(data) {
        if (data === "true") {
          callback(true)
          return
        }
        authStore.getAuthData(function(authData) {
          if (authData && (authData.isActivated || authData.isPermanent)) {
            callback(true)
          } else {
            callback(false)
          }
        })
      },
      fail: function() {
        authStore.getAuthData(function(authData) {
          if (authData && (authData.isActivated || authData.isPermanent)) {
            callback(true)
          } else {
            callback(false)
          }
        })
      }
    })
  },

  setPremiumUnlocked: function(callback) {
    storage.set({
      key: "premium_unlocked",
      value: "true",
      success: function() { if (callback) callback(true) },
      fail: function() { if (callback) callback(false) }
    })
  },

  _unlockDialogRef: null,

  showUnlockDialog: function(options) {
    if (this._unlockDialogRef) {
      this._unlockDialogRef.show(options)
    }
  },

  hideUnlockDialog: function() {
    if (this._unlockDialogRef) {
      this._unlockDialogRef.hide()
    }
  },

  getHideWeekend: function(callback) {
    storage.get({
      key: "hideWeekend",
      success: function(data) {
        callback(data === "true")
      },
      fail: function() {
        callback(false)
      }
    })
  },

  setHideWeekend: function(hide, callback) {
    storage.set({
      key: "hideWeekend",
      value: hide ? "true" : "false",
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  }
}