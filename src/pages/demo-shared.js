var sysPrompt = require("@system.prompt")
var sysStorage = require("@system.storage")
var sysRouter = require("@system.router")
var store = require("../data/store.js")

module.exports = function(options) {
  var storageKey = options.storageKey
  var defaultData = options.defaultData

  return {
    private: {
      theme: {},
      listData: [],
      newName: "",
      hideKeyboard: true,
      swipedIdx: -1,
      touchStartX: 0
    },

    onInit: function() {
      var self = this
      store.getTheme(function(t) {
        self.theme = t
      })
      this.loadData()
    },

    onShow: function() {
      var self = this
      store.getTheme(function(t) {
        self.theme = t
      })
      this.loadData()
    },

    loadData: function() {
      var self = this
      sysStorage.get({
        key: storageKey,
        success: function(data) {
          if (data) {
            try {
              var list = JSON.parse(data)
              if (list && list.length > 0) {
                self.listData = list
              } else {
                self.listData = defaultData.slice()
              }
            } catch (e) {
              self.listData = defaultData.slice()
            }
          } else {
            self.listData = defaultData.slice()
          }
          self.swipedIdx = -1
        },
        fail: function() {
          self.listData = defaultData.slice()
          self.swipedIdx = -1
        }
      })
    },

    saveData: function() {
      sysStorage.set({
        key: storageKey,
        value: JSON.stringify(this.listData)
      })
    },

    showKeyboard: function() {
      this.hideKeyboard = false
    },

    onVisibilityChange: function(evt) {
      if (evt.detail && evt.detail.visible === false) {
        this.hideKeyboard = true
      }
    },

    onDelete: function() {
      this.newName = this.newName.slice(0, -1)
    },

    onComplete: function(evt) {
      this.newName += evt.detail.content
    },

    addItem: function() {
      var name = this.newName.trim()
      if (!name) {
        sysPrompt.showToast({ message: "请输入名称", duration: 300 })
        return
      }
      for (var i = 0; i < this.listData.length; i++) {
        if (this.listData[i] === name) {
          sysPrompt.showToast({ message: "已存在", duration: 300 })
          return
        }
      }
      this.listData.push(name)
      this.saveData()
      this.newName = ""
      this.hideKeyboard = true
      sysPrompt.showToast({ message: "已添加", duration: 300 })
    },

    onTouchStart: function(e, idx) {
      if (!e || !e.touches || e.touches.length === 0) return
      this.touchStartX = e.touches[0].clientX
    },

    onTouchEnd: function(e, idx) {
      if (!e || !e.changedTouches || e.changedTouches.length === 0) return
      var dx = e.changedTouches[0].clientX - this.touchStartX
      var absDx = dx < 0 ? -dx : dx
      if (absDx > 30) {
        if (dx < 0) {
          this.swipedIdx = idx
        } else {
          if (this.swipedIdx === idx) {
            this.swipedIdx = -1
          }
        }
      }
    },

    onItemClick: function(idx) {
      if (this.swipedIdx !== -1) {
        this.swipedIdx = -1
        return
      }
      this.showMenu(idx)
    },

    showMenu: function(idx) {
      var self = this
      var item = this.listData[idx]
      if (!item) return
      sysPrompt.showDialog({
        title: item,
        message: "选择操作",
        buttons: [
          { text: "编辑", color: "#7ec8e3", onclick: function() { self.startEdit(idx) } },
          { text: "复制", color: "#7ec8e3", onclick: function() { self.copyItem(idx) } },
          { text: "取消", color: "#888899" }
        ]
      })
    },

    startEdit: function(idx) {
      var self = this
      var item = this.listData[idx]
      sysPrompt.showDialog({
        title: "编辑",
        message: "输入新名称",
        edittype: "text",
        value: item,
        buttons: [
          { text: "取消", color: "#888899" },
          {
            text: "保存",
            color: "#7ec8e3",
            onclick: function(_err, data) {
              if (data && data.value) {
                var newName = data.value.trim()
                if (newName && newName !== item) {
                  for (var i = 0; i < self.listData.length; i++) {
                    if (i !== idx && self.listData[i] === newName) {
                      sysPrompt.showToast({ message: "名称已存在", duration: 300 })
                      return
                    }
                  }
                  self.listData[idx] = newName
                  self.saveData()
                  sysPrompt.showToast({ message: "已更新", duration: 300 })
                }
              }
            }
          }
        ]
      })
    },

    copyItem: function(idx) {
      var item = this.listData[idx]
      var newName = item + " (副本)"
      var exists = false
      for (var i = 0; i < this.listData.length; i++) {
        if (this.listData[i] === newName) { exists = true; break }
      }
      if (exists) {
        var count = 1
        while (true) {
          var testName = item + " (副本" + count + ")"
          var found = false
          for (var i = 0; i < this.listData.length; i++) {
            if (this.listData[i] === testName) { found = true; break }
          }
          if (!found) { newName = testName; break }
          count++
        }
      }
      this.listData.push(newName)
      this.saveData()
      sysPrompt.showToast({ message: "已复制", duration: 300 })
    },

    confirmDelete: function(idx) {
      var self = this
      var item = this.listData[idx]
      sysPrompt.showDialog({
        title: "删除",
        message: '删除 "' + item + '" ?',
        buttons: [
          { text: "取消", color: "#888899" },
          {
            text: "确定",
            color: "#e74c3c",
            onclick: function() {
              self.listData.splice(idx, 1)
              self.swipedIdx = -1
              self.saveData()
              sysPrompt.showToast({ message: "已删除", duration: 300 })
            }
          }
        ]
      })
    },

    goBack: function() {
      if (!this.hideKeyboard) {
        this.hideKeyboard = true
        return
      }
      sysRouter.back()
    }
  }
}