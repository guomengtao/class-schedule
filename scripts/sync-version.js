var fs = require("fs")
var path = require("path")

// 唯一真源：src/manifest.json 的 versionName / versionCode
// 派生目标：src/data/version.js、package.json

var root = path.join(__dirname, "..")
var manifestPath = path.join(root, "src", "manifest.json")
var versionPath = path.join(root, "src", "data", "version.js")
var pkgPath = path.join(root, "package.json")

function readManifest() {
  var m = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  if (!m.versionName || !m.versionCode) {
    throw new Error("manifest.json 缺少 versionName / versionCode")
  }
  return m
}

function readChannel() {
  try {
    var match = fs.readFileSync(versionPath, "utf8").match(/channel:\s*"([^"]*)"/)
    return match ? match[1] : "t-9p-d"
  } catch (e) {
    return "t-9p-d"
  }
}

function currentVersionJs() {
  try {
    var match = fs.readFileSync(versionPath, "utf8").match(/versionName:\s*"([^"]*)"/)
    return match ? match[1] : null
  } catch (e) {
    return null
  }
}

function currentPkgVersion() {
  try {
    return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version
  } catch (e) {
    return null
  }
}

// 返回漂移清单：[{ target, current, expected }]
function diff() {
  var manifest = readManifest()
  var drifts = []

  var vjs = currentVersionJs()
  if (vjs !== manifest.versionName) {
    drifts.push({ target: "src/data/version.js", current: vjs, expected: manifest.versionName })
  }

  var pkg = currentPkgVersion()
  if (pkg !== manifest.versionName) {
    drifts.push({ target: "package.json", current: pkg, expected: manifest.versionName })
  }

  return drifts
}

function sync() {
  var manifest = readManifest()
  var channel = readChannel()
  var changed = []

  var vjsContent =
    'module.exports = { versionName: "' +
    manifest.versionName +
    '", versionCode: ' +
    manifest.versionCode +
    ', channel: "' +
    channel +
    '" }\n'
  var oldVjs = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, "utf8") : ""
  if (oldVjs !== vjsContent) {
    fs.writeFileSync(versionPath, vjsContent)
    changed.push("src/data/version.js")
  }

  var rawPkg = fs.readFileSync(pkgPath, "utf8")
  var newPkg = rawPkg.replace(/("version"\s*:\s*)"[^"]*"/, '$1"' + manifest.versionName + '"')
  if (newPkg !== rawPkg) {
    fs.writeFileSync(pkgPath, newPkg)
    changed.push("package.json")
  }

  return { manifest: manifest, changed: changed }
}

module.exports = { readManifest: readManifest, diff: diff, sync: sync }

if (require.main === module) {
  var checkOnly = process.argv.indexOf("--check") !== -1

  if (checkOnly) {
    var drifts = diff()
    if (drifts.length === 0) {
      console.log("OK 版本一致：" + readManifest().versionName)
      process.exit(0)
    }
    console.log("检测到版本漂移（真源 src/manifest.json 为 " + readManifest().versionName + "）：")
    drifts.forEach(function (d) {
      console.log("  - " + d.target + "：" + d.current + "  ≠  " + d.expected)
    })
    console.log("运行 `npm run sync-version` 或 `node scripts/sync-version.js` 修复")
    process.exit(1)
  }

  var result = sync()
  if (result.changed.length === 0) {
    console.log("已是最新，无需同步：" + result.manifest.versionName)
  } else {
    console.log(
      "已同步到 manifest " +
        result.manifest.versionName +
        " (code " +
        result.manifest.versionCode +
        ") → " +
        result.changed.join(", ")
    )
  }
}
