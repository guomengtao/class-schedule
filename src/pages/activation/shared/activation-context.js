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

// ── 购买二维码直连开关（2026-11-03 临时措施）────────────────────────────
// 背景：按「先保订单、后补技术」的决策，购买二维码临时改为爱发电直连，
//       绕开短链跳转层，避免跳转环节抖动/故障挡住下单。
// 收益：二维码由约 163 字符降到 56 字符（QR Version 10 → 4），
//       手环小屏扫描速度与识别成功率都明显改善。
// 代价：deviceId / 机型 / 渠道码归因全部丢失，订单无法回连具体设备。
//       爱发电侧不向我们回传落地参数，带参只增加长度、不产生归因，故不带。
// 回滚：把 AFDIAN_DIRECT 置为空字符串即可完整恢复「短链 + 全参数」逻辑；
//       下方 AFDIAN_BASE 与 afdianUrl() 的参数拼接分支均原样保留、未删。
const AFDIAN_DIRECT = "https://ifdian.net/item/54100fe4a1e011f1a3f452540025c377"
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
//   ② 标记语义：**只有失败才标记** i=f（唯一新增参数）；
//               无 i = 取参成功，或老包 / 尚未取完（服务端**不得**判为失败）；
//       —— 成功场景刻意不追加任何字节，使长码（实测约 190 字符）长度零增长。
//          二维码密度已到极限，多 4 个字符虽不跨 QR 版本，但没有收益就不占位。
//          代价：新包的"成功样本量"无法直接计数，失败率分母须用
//          「带 deviceId 且无 i=f」近似；发布新包时改 c 渠道后缀可精确切分。
//   ③ deviceId 缺失时仍然留空，**绝不**写入 none/unknown 之类假 ID
//      —— 服务端会把任何非空值当真实 device_full 入库，那是不可逆的污染。
//      URL 里的空值本身已表达"无设备号"，故不再追加冗余标记。
//   ④ 老包跑旧代码、不发这些参数，其行为与改造前完全相同。
var INFO_FAIL = 'i=f'

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
  // deviceId 缺失时不再追加标记：URL 中的空值本身即表达该状态，
  // 且**绝不**把 deviceId 填成假值（老服务端会把任何非空值当真实 device_full 写库）
  return url
}

/** 购买二维码：直连开关开启时不带任何参数；关闭时回到短链 + 全参数追踪 */
function afdianUrl(deviceId, infoParams) {
  if (AFDIAN_DIRECT) {
    return AFDIAN_DIRECT
  }
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
