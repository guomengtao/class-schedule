var fs = require("fs")
var path = require("path")

var args = process.argv.slice(2)
var filterTable = null
var showCount = 5

for (var i = 0; i < args.length; i++) {
  if (args[i] === "--table" && i + 1 < args.length) {
    filterTable = args[i + 1]
    i++
  } else if (args[i] === "--count" && i + 1 < args.length) {
    showCount = parseInt(args[i + 1]) || 5
    i++
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log("用法: node scripts/check-storage.js [--table <表名>] [--count <条数>]")
    console.log("")
    console.log("  不带参数: 显示所有表，每表显示最新 5 条引用")
    console.log("  --table <表名>  只显示指定表的数据")
    console.log("  --count <条数>   指定每个表显示的引用条数 (默认 5)")
    console.log("  --help, -h      显示帮助")
    process.exit(0)
  }
}

var srcDir = path.join(__dirname, "..", "src")

function scanFiles(dir, ext) {
  var results = []
  try {
    var files = fs.readdirSync(dir)
    for (var i = 0; i < files.length; i++) {
      if (files[i].startsWith(".")) continue
      var full = path.join(dir, files[i])
      var stat = fs.statSync(full)
      if (stat.isDirectory()) {
        results = results.concat(scanFiles(full, ext))
      } else if (files[i].endsWith(ext)) {
        results.push(full)
      }
    }
  } catch (e) {}
  return results
}

var allFiles = scanFiles(srcDir, ".ux").concat(scanFiles(srcDir, ".js"))

var keyVarMap = {}
var tableMap = {}

for (var f = 0; f < allFiles.length; f++) {
  var filePath = allFiles[f]
  var relPath = path.relative(srcDir, filePath)
  var content = fs.readFileSync(filePath, "utf-8")
  var lines = content.split("\n")

  var keyVarRegex = /var\s+(\w*KEY\w*)\s*=\s*"([^"]+)"/g
  var kvMatch
  while ((kvMatch = keyVarRegex.exec(content)) !== null) {
    keyVarMap[kvMatch[1]] = kvMatch[2]
  }

  var keyRegex = /key:\s*("([^"]+)"|(\w+))/g
  var match
  while ((match = keyRegex.exec(content)) !== null) {
    var rawKey = match[1]
    var key = match[2] || keyVarMap[match[3]] || match[3]

    if (!key || key.length === 0) continue

    var ctxBefore = content.substring(Math.max(0, match.index - 120), match.index)
    var isStorageCtx = (
      ctxBefore.indexOf("storage.") !== -1 ||
      ctxBefore.indexOf("KEY") !== -1 ||
      ctxBefore.indexOf("_KEY") !== -1
    )
    if (!isStorageCtx) continue

    if (!tableMap[key]) {
      tableMap[key] = {
        key: key,
        refs: [],
        setCount: 0,
        getCount: 0,
        deleteCount: 0
      }
    }

    var lineIdx = content.substring(0, match.index).split("\n").length
    var lineContent = (lines[lineIdx - 1] || "").trim()

    var ctxStart = Math.max(0, lineIdx - 3)
    var ctxEnd = Math.min(lines.length, lineIdx + 2)
    var context = ""
    for (var l = ctxStart; l < ctxEnd; l++) {
      var prefix = l === lineIdx - 1 ? ">>> " : "    "
      context += prefix + (l + 1) + ": " + lines[l] + "\n"
    }

    var broaderCtx = content.substring(Math.max(0, match.index - 200), match.index)
    var isSet = broaderCtx.indexOf("storage.set") !== -1 || broaderCtx.indexOf(".set({") !== -1
    var isGet = broaderCtx.indexOf("storage.get") !== -1 || broaderCtx.indexOf(".get({") !== -1
    var isDelete = broaderCtx.indexOf("storage.delete") !== -1 || broaderCtx.indexOf(".delete({") !== -1

    var ref = {
      file: relPath,
      line: lineIdx,
      lineContent: lineContent,
      context: context,
      isSet: isSet,
      isGet: isGet,
      isDelete: isDelete
    }

    tableMap[key].refs.push(ref)
    if (isSet) tableMap[key].setCount++
    if (isGet) tableMap[key].getCount++
    if (isDelete) tableMap[key].deleteCount++
  }
}

var KEYS = {}
try {
  KEYS = require("./data-keys.json")
} catch (e) {}

var allKeys = Object.keys(tableMap).sort()
var tables = []
var transientKeys = []

for (var k = 0; k < allKeys.length; k++) {
  var key = allKeys[k]
  var info = tableMap[key]
  var isTransient = (
    key.indexOf("chinese_input") === 0 ||
    key.indexOf("add_course_") === 0 ||
    key.indexOf("weekview_") === 0 ||
    key.indexOf("detail_") === 0 ||
    key.indexOf("schedule_qrcode_") === 0 ||
    key.indexOf("statistics_") === 0 ||
    key.indexOf("activation_lab_") === 0 ||
    key === "returnKey" ||
    key === "storageKey" ||
    key === "targetKey" ||
    key === "allCourses_" ||
    key.indexOf("allCourses_") === 0
  )
  if (isTransient) {
    transientKeys.push(info)
  } else {
    tables.push(info)
  }
}

function printDivider() {
  console.log("=".repeat(70))
}

function printTable(table, maxRefs) {
  printDivider()
  console.log("  表: " + table.key)
  printDivider()

  var desc = KEYS[table.key]
  if (desc) {
    console.log("  描述: " + desc.desc)
    if (desc.type) console.log("  类型: " + desc.type)
    if (desc.structure) {
      console.log("  结构:")
      var struct = desc.structure
      if (typeof struct === "object" && !Array.isArray(struct)) {
        var structKeys = Object.keys(struct)
        for (var si = 0; si < structKeys.length; si++) {
          console.log("    " + structKeys[si] + ": " + struct[structKeys[si]])
        }
      } else {
        console.log("    " + JSON.stringify(struct))
      }
    }
    console.log("")
  }

  console.log("  引用总数: " + table.refs.length + "  (set: " + table.setCount + ", get: " + table.getCount + ", delete: " + table.deleteCount + ")")
  console.log("")

  var latestRefs = table.refs.slice(-maxRefs)
  console.log("  最新 " + Math.min(maxRefs, table.refs.length) + " 条引用 (共 " + table.refs.length + " 条):")
  console.log("")

  for (var r = 0; r < latestRefs.length; r++) {
    var ref = latestRefs[r]
    var op = ref.isSet ? "SET " : (ref.isDelete ? "DEL " : "GET ")
    var opIcon = ref.isSet ? "📝" : (ref.isDelete ? "🗑 " : "👁 ")
    console.log("  [" + (r + 1) + "] " + opIcon + " " + op)
    console.log("      文件: " + ref.file + ":" + ref.line)
    console.log("      代码: " + ref.lineContent)
    console.log("")
  }
}

if (filterTable) {
  if (tableMap[filterTable]) {
    printTable(tableMap[filterTable], showCount)
  } else {
    console.log("❌ 表 '" + filterTable + "' 未找到")
    console.log("")
    console.log("可用表名:")
    for (var t = 0; t < tables.length; t++) {
      console.log("  " + tables[t].key + "  (" + tables[t].refs.length + " 条引用)")
    }
  }
} else {
  console.log("")
  console.log("  存储表总览")
  console.log("  (持久表: " + tables.length + " 个, 临时键: " + transientKeys.length + " 个)")
  console.log("")

  for (var t = 0; t < tables.length; t++) {
    printTable(tables[t], showCount)
  }

  console.log("")
  printDivider()
  console.log("  临时键 (chinese_input_*, add_course_*, weekview_*, 等)")
  console.log("  共 " + transientKeys.length + " 个，不展开显示")
  console.log("  如需查看临时键详情，请使用 --table <键名>")
  printDivider()
  console.log("")
  console.log("  用法: node scripts/check-storage.js [--table <表名>] [--count <条数>]")
  console.log("  示例: node scripts/check-storage.js --table appTheme --count 10")
  console.log("")
}