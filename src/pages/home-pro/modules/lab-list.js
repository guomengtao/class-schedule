console.log("[lab-list module] loading...")

var labItems = [
  { name: "⭐ 高级版预览", desc: "查看高级版全部功能", uri: "/pages/premium-test" },
  { name: "📌 已钉首页", desc: "查看已固定到首页的页面", uri: "/pages/pinned-pages" },
  { name: "🗄 数据表展示", desc: "查看本地存储数据表", uri: "/pages/storage-viewer" },
  { name: "📱 二维码生成器", desc: "文本转二维码", uri: "/pages/qrcode-generator" },
  { name: "📳 震动实验室", desc: "自定义震动方案", uri: "/pages/vibration-lab" },
  { name: "🔤 中文输入", desc: "中文输入法引擎", uri: "/pages/chinese-input" },
  { name: "🎵 手风琴 Demo", desc: "手风琴展开/折叠组件", uri: "/pages/accordion-demo" },
  { name: "💻 设备信息", desc: "查看设备信息", uri: "/pages/device-info" },
  { name: "🧩 组件化测试", desc: "组件化测试", uri: "/pages/comp-demo" },
  { name: "📦 多模块加载测试", desc: "多模块加载测试", uri: "/pages/lab-module-test" },
  { name: "🖥 命令行 Debug", desc: "测试 console.log/warn/error 输出", uri: "/pages/debug-demo" }
]

function init(instance) {
  console.log("[lab-list module] init called, items count: " + labItems.length)
  instance.labItems = labItems
  instance.status = "ok"
  instance.moduleText = "实验室列表"
  console.log("[lab-list module] init OK")
}

module.exports = {
  init: init,
  getItems: function() {
    return labItems
  }
}

console.log("[lab-list module] loaded successfully")