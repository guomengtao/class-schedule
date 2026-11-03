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

// ── 取参结果标记（2026-11-03 新增，只加不改）─────────────────────────────
// 目的：让「手环端取参数失败」在 URL 里留下痕迹，服务端才能把
//       「用户从别处点进来」和「手环取参失败」分开。
// 背景：此前 fail / catch 一律把 _infoParams 置空，deviceId 失败也置空，
//       最终 URL 只剩 ?deviceId=&c=xxx → 数据里只剩一个 c，与网页点击无法区分。
//
// ⚠️ 向下兼容硬约束（已发安装包无法升级，老用户参数写死在旧包里，必须守住）：
//   ① 只追加新参数，绝不改动 AFDIAN_BASE 及任何既有参数的名、顺序、含义；
//   ② 三态语义：无 i = 老包或尚未取完（服务端**不得**判为失败）；
//               i=1 = 明确取到；i=f = 明确失败；
//   ③ deviceId 缺失时仍然留空，**绝不**写入 none/unknown 之类假 ID
//      —— 服务端会把任何非空值当真实 device_full 入库，那是污染；改用一个独立标记 dn=1；
//   ④ 老包跑旧代码、不发这些参数，其行为与改造前完全相同。
var INFO_FAIL = 'i=f'
var INFO_OK = 'i=1'
var DID_MISSING = 'dn=1'

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
    _infoParams = INFO_FAIL
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
        // 取参成功标记：追加在末尾，不影响前面任何参数的位置与含义
        p.push(INFO_OK)
        _infoParams = p.join('&')
        _emit()
      },
      fail: function() {
        _infoParams = INFO_FAIL
        _emit()
      }
    })
  } catch (e) {
    _infoParams = INFO_FAIL
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
    _infoParams = INFO_FAIL
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
  // deviceId 缺失：只追加标记，**不**把 deviceId 填成假值
  // （老服务端会把任何非空 deviceId 当真实 device_full 写库，那是不可逆的污染）
  if (!deviceId) url = url + '&' + DID_MISSING
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
