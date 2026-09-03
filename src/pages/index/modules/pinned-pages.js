function init(instance, deps) {
  instance.pinnedPages = []
  instance.hasPinned = false

  instance.loadPinnedPages = function() {
    var self = instance
    deps.pinHelper.getList(function(list) {
      self.pinnedPages = list
      self.hasPinned = list.length > 0
    })
  }

  instance.openPinnedPage = function(uri) {
    deps.router.push({ uri: uri })
  }

  instance.loadPinnedPages()

  instance.openAddCoursePage = function() {
    var self = instance
    deps.storage.set({
      key: "add_course_day",
      value: self.currentDay,
      success: function() {
        deps.router.push({ uri: "/pages/add-course" })
      },
      fail: function() {
        deps.router.push({ uri: "/pages/add-course" })
      }
    })
  }

  instance.openSettings = function() {
    deps.router.push({ uri: "/pages/settings" })
  }
}

module.exports = { init: init }