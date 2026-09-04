var store = require("./store.js")

var _overlayRef = null

function _register(componentRef) {
  console.log("[PREMIUM] _register: component ref set, ref=" + (componentRef ? "OK" : "NULL"))
  _overlayRef = componentRef
}

function _unregister(componentRef) {
  console.log("[PREMIUM] _unregister: component destroyed, matched=" + (_overlayRef === componentRef))
  if (_overlayRef === componentRef) {
    _overlayRef = null
  }
}

function checkAndShow() {
  console.log("[PREMIUM] checkAndShow: start checking premium status...")
  store.isPremiumUnlocked(function(unlocked) {
    console.log("[PREMIUM] checkAndShow: premiumUnlocked=" + unlocked + ", hasRef=" + (_overlayRef ? "YES" : "NO"))
    if (!unlocked && _overlayRef) {
      console.log("[PREMIUM] checkAndShow: NOT premium, showing overlay!")
      _overlayRef.show()
    } else if (unlocked) {
      console.log("[PREMIUM] checkAndShow: user IS premium, skip overlay")
    } else {
      console.log("[PREMIUM] checkAndShow: overlay ref not ready, skip")
    }
  })
}

function show() {
  console.log("[PREMIUM] show: manually triggered, hasRef=" + (_overlayRef ? "YES" : "NO"))
  if (_overlayRef) {
    _overlayRef.show()
  }
}

function hide() {
  console.log("[PREMIUM] hide: called, hasRef=" + (_overlayRef ? "YES" : "NO"))
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