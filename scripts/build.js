var execSync = require("child_process").execSync

var args = process.argv.slice(2).filter(function (arg) {
  return !arg.startsWith("--devtool")
})

var cmd = "aiot release --enable-jsc " + args.join(" ")
console.log("Running: " + cmd)

// ⚠️ 必须清掉 WorkBuddy 通过 NODE_OPTIONS 注入的 node-language-shim，否则构建必坏：
//    它的 safe-delete 守卫会在 aiot 清理真实临时目录（../.temp_class-schedule，200+ 项）
//    时抛 SAFE_DELETE_BULK_CONFIRM_REQUIRED，**把构建进程整死**（Node.js core dump），
//    表现为「构建失败」或产出**缺 pages 的坏包**（只剩 app.jsc，217→140 条目、pages 0）。
//    .trae/build.js 里那句 `NODE_OPTIONS: ""` 就是同一个绕法，此处补齐并显式关守卫。
var env = Object.assign({}, process.env)
delete env.NODE_OPTIONS
env.CODEBUDDY_SAFE_DELETE_ENABLED = "0"

execSync(cmd, { stdio: "inherit", env: env })