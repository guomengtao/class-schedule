/**
 * 高级版激活页共享上下文
 *
 * 统一收口三件事，避免各子页各写一份：
 *   1. deviceId 获取 + 回落 + 内存缓存（多次进页面不再重复调 getDeviceId）
 *   2. 三条 URL 拼接（值与原单页一字不差）
 *   3. 主题读取（转发 store.getTheme）
 *
 * 只被 v2 新增的 P0 / 购买页 / A1 / B1 使用；
 * 既有 activation-code.ux、activation-info.ux 仍走各自的旧逻辑，不做改动以零回归。
 */

const store = require("../../../data/store.js")
const version = require("../../../data/version.js")

// 三条 URL 常量：与老版单页逐字一致，禁止改直链
const AFDIAN_BASE = "https://app-auth.gudq.com/go/ev-timetable?deviceId="
const REDEEM_BASE = "https://app-auth.gudq.com/activate.html?deviceId="
const APK_BASE = "https://app-auth.gudq.com/apk-download.html?deviceId="

var _deviceId = null
var _infoParams = ''
var _pending = null

function _channel() {
  return version.channel || ''
}

function _emit() {
  var list = _pending || []
  _pending = null
  for (var i = 0; i < list.length; i++) {
    try {
      list[i](_deviceId, _infoParams)
    } catch (e) {
      // 单个回调异常不得影响其余等待者
    }
  }
}

function _readInfo() {
  var device = null
  try {
    device = require("@system.device")
  } catch (e) {
    device = null
  }
  if (!device || typeof device.getInfo !== "function") {
    _infoParams = ''
    _emit()
    return
  }
  try {
    device.getInfo({
      success: function(ret) {
        var p = []
        if (ret.model) p.push('m=' + encodeURIComponent(ret.model))
        if (ret.product) p.push('p=' + encodeURIComponent(ret.product))
        if (ret.osVersionCode != null) p.push('o=' + ret.osVersionCode)
        if (ret.platformVersionCode != null) p.push('v=' + ret.platformVersionCode)
        if (ret.deviceType) p.push('t=' + encodeURIComponent(ret.deviceType))
        if (ret.screenShape) p.push('s=' + encodeURIComponent(ret.screenShape))
        if (ret.screenWidth != null) p.push('w=' + ret.screenWidth)
        if (ret.screenHeight != null) p.push('h=' + ret.screenHeight)
        if (ret.APILevel != null) p.push('a=' + ret.APILevel)
        if (ret.language) p.push('l=' + encodeURIComponent(ret.language))
        _infoParams = p.join('&')
        _emit()
      },
      fail: function() {
        _infoParams = ''
        _emit()
      }
    })
  } catch (e) {
    _infoParams = ''
    _emit()
  }
}

function _fallback() {
  try {
    var uuid = require("../../../utils/device-uuid.js")
    uuid.getLocalDeviceId(function(id) {
      _deviceId = id || ''
      _readInfo()
    })
  } catch (e) {
    _deviceId = ''
    _infoParams = ''
    _emit()
  }
}

function _resolve() {
  var device = null
  try {
    device = require("@system.device")
  } catch (e) {
    device = null
  }
  if (!device || typeof device.getDeviceId !== "function") {
    _fallback()
    return
  }
  try {
    device.getDeviceId({
      success: function(data) {
        var raw = (data && data.deviceId) || ''
        if (!raw || raw === 'NA' || raw === 'unknown' || raw === 'null') {
          _fallback()
          return
        }
        _deviceId = raw
        _readInfo()
      },
      fail: function() {
        _fallback()
      }
    })
  } catch (e) {
    _fallback()
  }
}

/**
 * 取设备身份。命中缓存时同步回调，否则排队等一次。
 * @param {Function} cb function(deviceId, infoParams)
 */
function getIdentity(cb) {
  if (_deviceId !== null) {
    cb(_deviceId, _infoParams)
    return
  }
  if (_pending) {
    _pending.push(cb)
    return
  }
  _pending = [cb]
  _resolve()
}

function _build(base, deviceId, infoParams, extra) {
  var url = base + encodeURIComponent(deviceId || '')
  if (infoParams) url = url + '&' + infoParams
  if (extra) url = url + '&' + extra
  return url
}

/** 购买二维码：带跟踪参数，禁止改直链 */
function afdianUrl(deviceId, infoParams) {
  var ch = _channel()
  return _build(AFDIAN_BASE, deviceId, infoParams, ch ? 'c=' + encodeURIComponent(ch) : '')
}

/** A 路径同步器下载二维码：无渠道时回落 band-premium（服务端漏斗据此区分） */
function apkUrl(deviceId, infoParams) {
  var ch = _channel() || 'band-premium'
  return _build(APK_BASE, deviceId, infoParams, 'c=' + encodeURIComponent(ch))
}

/** B 路径兑换二维码 */
function redeemUrl(deviceId, infoParams) {
  var ch = _channel()
  return _build(REDEEM_BASE, deviceId, infoParams, ch ? 'c=' + encodeURIComponent(ch) : '')
}

function getTheme(callback, forceRefresh) {
  store.getTheme(callback, forceRefresh)
}

module.exports = {
  getIdentity: getIdentity,
  afdianUrl: afdianUrl,
  apkUrl: apkUrl,
  redeemUrl: redeemUrl,
  getTheme: getTheme
}
