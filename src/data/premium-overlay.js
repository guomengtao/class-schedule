// 日志开关：发布态关闭，避免手环上字符串拼接与 IPC 开销
var DEBUG = false
function dlog() {
  if (DEBUG) console.log.apply(console, arguments)
}

var store = require("./store.js")

var _overlayRef = null

function _register(componentRef) {
  dlog("[PREMIUM] _register: component ref set, ref=" + (componentRef ? "OK" : "NULL"))
  _overlayRef = componentRef
}

function _unregister(componentRef) {
  dlog("[PREMIUM] _unregister: component destroyed, matched=" + (_overlayRef === componentRef))
  if (_overlayRef === componentRef) {
    _overlayRef = null
  }
}

function checkAndShow() {
  dlog("[PREMIUM] checkAndShow: start checking premium status...")
  store.isPremiumUnlocked(function(unlocked) {
    dlog("[PREMIUM] checkAndShow: premiumUnlocked=" + unlocked + ", hasRef=" + (_overlayRef ? "YES" : "NO"))
    if (!unlocked && _overlayRef) {
      dlog("[PREMIUM] checkAndShow: NOT premium, showing overlay!")
      _overlayRef.show()
    } else if (unlocked) {
      dlog("[PREMIUM] checkAndShow: user IS premium, skip overlay")
    } else {
      dlog("[PREMIUM] checkAndShow: overlay ref not ready, skip")
    }
  })
}

function show() {
  dlog("[PREMIUM] show: manually triggered, hasRef=" + (_overlayRef ? "YES" : "NO"))
  if (_overlayRef) {
    _overlayRef.show()
  }
}

function hide() {
  dlog("[PREMIUM] hide: called, hasRef=" + (_overlayRef ? "YES" : "NO"))
  if (_overlayRef) {
    _overlayRef.hide()
  }
}

module.exports = {
  _register: _register,
  _unregister: _unregister,
  checkAndShow: checkAndShow,
  show: show,
  hide: hide
}