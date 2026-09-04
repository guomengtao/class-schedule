var store = require("./store.js")

var _overlayRef = null

function _register(componentRef) {
  _overlayRef = componentRef
}

function _unregister(componentRef) {
  if (_overlayRef === componentRef) {
    _overlayRef = null
  }
}

function checkAndShow() {
  store.isPremiumUnlocked(function(unlocked) {
    if (!unlocked && _overlayRef) {
      _overlayRef.show()
    }
  })
}

function show() {
  if (_overlayRef) {
    _overlayRef.show()
  }
}

function hide() {
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