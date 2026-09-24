var UUID_KEY = 'device_uuid_v1'

function generateUUID32() {
  var s = ''
  var chars = '0123456789abcdef'
  for (var i = 0; i < 32; i++) {
    s += chars.charAt(Math.floor(Math.random() * 16))
  }
  return s
}

function getLocalDeviceId(cb) {
  var storage = require('@system.storage')
  storage.get({
    key: UUID_KEY,
    success: function(data) {
      if (data) {
        cb(String(data))
      } else {
        var id = 'uuid-' + generateUUID32()
        storage.set({ key: UUID_KEY, value: id }, function() {
          cb(id)
        })
      }
    },
    fail: function() {
      cb('uuid-' + generateUUID32())
    }
  })
}

function isLocalUUID(deviceId) {
  return typeof deviceId === 'string' && /^uuid-[0-9a-f]{32}$/.test(deviceId)
}

module.exports = {
  getLocalDeviceId: getLocalDeviceId,
  isLocalUUID: isLocalUUID,
  generateUUID32: generateUUID32
}