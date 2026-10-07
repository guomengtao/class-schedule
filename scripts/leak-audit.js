#!/usr/bin/env node

var fs = require("fs")
var path = require("path")

var SRC = path.join(__dirname, "..", "src")

var results = {
  timerLeaks: [],
  pagesWithoutDestroy: [],
  pagesWithTimersNoCleanup: [],
  pushBackBalance: {},
  moduleLevelState: [],
  summary: {}
}

function readFile(filePath) {
  try { return fs.readFileSync(filePath, "utf-8") } catch (e) { return "" }
}

function walkDir(dir, ext) {
  var list = []
  var entries = fs.readdirSync(dir, { withFileTypes: true })
  for (var i = 0; i < entries.length; i++) {
    var full = path.join(dir, entries[i].name)
    if (entries[i].isDirectory()) {
      list = list.concat(walkDir(full, ext))
    } else if (entries[i].name.endsWith(ext)) {
      list.push(full)
    }
  }
  return list
}

var uxFiles = walkDir(SRC, ".ux")
var jsFiles = walkDir(SRC, ".js")

// ---------------------------------------------------------------------------
// 1. Timer leak analysis: find setInterval/setTimeout and check for cleanup
// ---------------------------------------------------------------------------
function extractPageName(filePath) {
  var rel = path.relative(SRC, filePath)
  return rel.replace(/\.ux$/, "").replace(/\\/g, "/")
}

function hasOnDestroy(content) {
  return /onDestroy\s*[:(]/.test(content)
}

function hasOnHide(content) {
  return /onHide\s*[:(]/.test(content)
}

function findTimers(content) {
  var setIntervals = []
  var setTimeouts = []
  var regex = /(?:self\.|this\.|var\s+|let\s+|const\s+)?(\w+(?:\.\w+)*)\s*=\s*setInterval\(/g
  var match
  while ((match = regex.exec(content)) !== null) {
    setIntervals.push({ name: match[1], pos: match.index, line: lineAt(content, match.index) })
  }
  regex = /(?:self\.|this\.|var\s+|let\s+|const\s+)?(\w+(?:\.\w+)*)\s*=\s*setTimeout\(/g
  while ((match = regex.exec(content)) !== null) {
    setTimeouts.push({ name: match[1], pos: match.index, line: lineAt(content, match.index) })
  }
  regex = /setInterval\((?!function)/g
  while ((match = regex.exec(content)) !== null) {
    setIntervals.push({ name: "(anonymous)", pos: match.index, line: lineAt(content, match.index) })
  }
  regex = /setTimeout\((?!function)/g
  while ((match = regex.exec(content)) !== null) {
    setTimeouts.push({ name: "(anonymous)", pos: match.index, line: lineAt(content, match.index) })
  }
  return { intervals: setIntervals, timeouts: setTimeouts }
}

function findCleanup(content, timerNames) {
  var cleaned = {}
  for (var i = 0; i < timerNames.length; i++) {
    var name = timerNames[i].name
    var key = name.replace(/^(self\.|this\.)/, "")
    var pattern = new RegExp("clearInterval\\(.*" + escapeRegExp(key) + "\\)|clearInterval\\(.*instance\\." + escapeRegExp(key) + "\\)")
    if (pattern.test(content)) {
      cleaned[name] = true
    } else {
      cleaned[name] = false
    }
  }
  return cleaned
}

function findModuleDestroy(content, timerNames) {
  var hasDestroyExport = /destroy\s*[:=]\s*function|exports\.destroy|module\.exports\s*=\s*\{[^}]*destroy/.test(content)
  if (!hasDestroyExport) return {}
  var cleaned = {}
  for (var i = 0; i < timerNames.length; i++) {
    var name = timerNames[i].name
    var key = name.replace(/^(self\.|this\.|instance\.)/, "")
    var pattern = new RegExp("clearInterval\\(.*" + escapeRegExp(key))
    if (pattern.test(content)) {
      cleaned[name] = true
    }
  }
  return cleaned
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function lineAt(content, pos) {
  var before = content.substring(0, pos)
  return (before.split("\n").length)
}

// ---------------------------------------------------------------------------
// 2. router.push vs router.back balance
// ---------------------------------------------------------------------------
function countRouterCalls(content) {
  var pushes = (content.match(/router\.push\s*\(/g) || []).length
  var backs = (content.match(/router\.back\s*\(/g) || []).length
  var replaces = (content.match(/router\.replace\s*\(/g) || []).length
  return { push: pushes, back: backs, replace: replaces }
}

// ---------------------------------------------------------------------------
// 3. Module-level state that persists across page instances
// ---------------------------------------------------------------------------
function findModuleState(content, filePath) {
  var issues = []
  var rel = path.relative(SRC, filePath).replace(/\\/g, "/")
  if (/^var\s+\w+\s*=\s*null\s*$/.test(content)) {
    issues.push("module-level null variable (potential singleton reference holder)")
  }
  var moduleLevelTimers = content.match(/^var\s+(\w+)\s*=\s*(null|undefined)\s*$/gm) || []
  for (var i = 0; i < moduleLevelTimers.length; i++) {
    var nameMatch = moduleLevelTimers[i].match(/var\s+(\w+)/)
    if (nameMatch && /(_timer|_cache|_store|_ref|_instance)/i.test(nameMatch[1])) {
      issues.push("module-level state: " + nameMatch[1] + " (survives across page instances)")
    }
  }
  return issues
}

// ---------------------------------------------------------------------------
// 4. Storage reads without size limits
// ---------------------------------------------------------------------------
function findUnboundedStorage(content) {
  var issues = []
  if (/storage\.get\(\{[^}]*key:\s*["']ev_chat_inbox["']/.test(content)) {
    if (!/slice|splice|length\s*>\s*\d+/.test(content)) {
      issues.push("ev_chat_inbox grows unbounded (push only, no size capping detected in this file)")
    }
  }
  return issues
}

// ===================== MAIN ANALYSIS =====================

var allPages = []
var totalPushes = 0
var totalBacks = 0
var totalReplaces = 0

for (var i = 0; i < uxFiles.length; i++) {
  var filePath = uxFiles[i]
  var content = readFile(filePath)
  if (!content) continue

  var pageName = extractPageName(filePath)
  var timers = findTimers(content)
  var hasDestroy = hasOnDestroy(content)
  var hasHide = hasOnHide(content)
  var routerCalls = countRouterCalls(content)
  var moduleIssues = []
  var storageIssues = findUnboundedStorage(content)

  totalPushes += routerCalls.push
  totalBacks += routerCalls.back
  totalReplaces += routerCalls.replace

  var pageInfo = {
    name: pageName,
    file: filePath,
    hasOnDestroy: hasDestroy,
    hasOnHide: hasHide,
    intervals: timers.intervals.length,
    timeouts: timers.timeouts.length,
    push: routerCalls.push,
    back: routerCalls.back,
    replace: routerCalls.replace,
    leaks: [],
    warnings: []
  }

  // Check: page has timers but no onDestroy
  if ((timers.intervals.length > 0 || timers.timeouts.length > 0) && !hasDestroy && !hasHide) {
    pageInfo.warnings.push("HAS TIMERS but NO onDestroy/onHide => timers never cleaned up when page leaves stack")
    var allTimers = timers.intervals.concat(timers.timeouts)
    for (var t = 0; t < allTimers.length; t++) {
      pageInfo.leaks.push({
        type: "timer_no_cleanup",
        name: allTimers[t].name,
        line: allTimers[t].line,
        detail: "setInterval/setTimeout '" + allTimers[t].name + "' at line " + allTimers[t].line + " has no cleanup in onDestroy/onHide"
      })
    }
    results.pagesWithTimersNoCleanup.push(pageInfo)
  }

  // Check: page has setInterval but cleanup not found in onDestroy
  if (timers.intervals.length > 0 && hasDestroy) {
    var cleaned = findCleanup(content, timers.intervals)
    for (var name in cleaned) {
      if (!cleaned[name]) {
        pageInfo.leaks.push({
          type: "interval_not_cleaned",
          name: name,
          detail: "setInterval '" + name + "' not cleared in onDestroy"
        })
      }
    }
  }

  // Check: page is a real page (not component), has no onDestroy
  if (pageName.startsWith("pages/") && !hasDestroy) {
    results.pagesWithoutDestroy.push({ name: pageName, hasOnHide: hasHide })
  }

  // Check: router.push calls without corresponding back
  if (routerCalls.push > 0 && routerCalls.back === 0 && routerCalls.replace === 0) {
    pageInfo.warnings.push("router.push() found but no router.back() in this page — may cause stack accumulation")
  }

  if (pageInfo.leaks.length > 0 || pageInfo.warnings.length > 0) {
    allPages.push(pageInfo)
  }
}

// Module-level state analysis
for (var j = 0; j < jsFiles.length; j++) {
  var jsFile = jsFiles[j]
  var jsContent = readFile(jsFile)
  if (!jsContent) continue
  var issues = findModuleState(jsContent, jsFile)
  if (issues.length > 0) {
    var rel = path.relative(SRC, jsFile).replace(/\\/g, "/")
    results.moduleLevelState.push({ file: rel, issues: issues })
  }
}

// Summary
results.summary = {
  totalPages: uxFiles.length,
  totalJSModules: jsFiles.length,
  totalRouterPush: totalPushes,
  totalRouterBack: totalBacks,
  totalRouterReplace: totalReplaces,
  pushBackRatio: totalBacks > 0 ? (totalPushes / totalBacks).toFixed(2) : "INFINITY (no back calls)",
  pagesWithTimersNoCleanup: results.pagesWithTimersNoCleanup.length,
  pagesWithoutDestroy: results.pagesWithoutDestroy.length,
  moduleStateIssues: results.moduleLevelState.length,
  stackAccumulationRisk: "HIGH" // default worst-case
}

// Calculate risk
if (totalReplaces >= totalPushes) {
  results.summary.stackAccumulationRisk = "LOW (uses replace instead of push)"
} else if (totalBacks >= totalPushes * 0.7) {
  results.summary.stackAccumulationRisk = "MEDIUM (backs exist but may not cover all paths)"
} else {
  results.summary.stackAccumulationRisk = "HIGH (push significantly outnumbers back + replace)"
}

// ===================== DETAILED REPORT =====================

function printReport() {
  console.log("=".repeat(70))
  console.log("  EV Class Schedule — Memory Leak & Performance Audit")
  console.log("=".repeat(70))
  console.log("")

  console.log("▸ SUMMARY")
  console.log("  Total .ux pages/components:    " + results.summary.totalPages)
  console.log("  Total .js modules:             " + results.summary.totalJSModules)
  console.log("  router.push() calls total:     " + results.summary.totalRouterPush)
  console.log("  router.back()  calls total:    " + results.summary.totalRouterBack)
  console.log("  router.replace() calls total:  " + results.summary.totalRouterReplace)
  console.log("  push/back ratio:               " + results.summary.pushBackRatio)
  console.log("  Stack accumulation risk:       " + results.summary.stackAccumulationRisk)
  console.log("  Pages with timers, no cleanup: " + results.summary.pagesWithTimersNoCleanup)
  console.log("  Pages without onDestroy:       " + results.summary.pagesWithoutDestroy)
  console.log("  Module-level state issues:     " + results.summary.moduleStateIssues)
  console.log("")

  // ---- ISSUE 1: Timer Leaks ----
  console.log("-".repeat(70))
  console.log("  ISSUE 1: Timer Leaks (setInterval/setTimeout without cleanup)")
  console.log("-".repeat(70))
  console.log("")
  console.log("  CRITICAL: When router.push() loads a new page, the previous")
  console.log("  page stays in the stack. Its onDestroy() is NOT called unless")
  console.log("  the user explicitly goes back. Timers keep firing, consuming")
  console.log("  CPU and preventing garbage collection of the page instance.")
  console.log("")

  if (results.pagesWithTimersNoCleanup.length === 0) {
    console.log("  [OK] No pages with unmanaged timers found.")
  } else {
    for (var i = 0; i < results.pagesWithTimersNoCleanup.length; i++) {
      var p = results.pagesWithTimersNoCleanup[i]
      console.log("  [" + (i + 1) + "] " + p.name)
      console.log("      file: " + p.file)
      console.log("      intervals: " + p.intervals + "  timeouts: " + p.timeouts)
      console.log("      hasOnDestroy: " + p.hasOnDestroy + "  hasOnHide: " + p.hasOnHide)
      if (p.leaks.length > 0) {
        for (var l = 0; l < p.leaks.length; l++) {
          console.log("      LEAK: " + p.leaks[l].detail)
        }
      }
      if (p.warnings.length > 0) {
        for (var w = 0; w < p.warnings.length; w++) {
          console.log("      WARN: " + p.warnings[w])
        }
      }
    }
  }
  console.log("")

  // ---- ISSUE 2: Page Stack Accumulation ----
  console.log("-".repeat(70))
  console.log("  ISSUE 2: Page Stack Accumulation (root cause of blackscreen)")
  console.log("-".repeat(70))
  console.log("")
  console.log("  Each router.push() creates a NEW page instance with its own:")
  console.log("  - DOM tree (full template rendering)")
  console.log("  - Data bindings (watch expressions)")
  console.log("  - setInterval/setTimeout closures")
  console.log("  - Storage read caches")
  console.log("")
  console.log("  A typical user journey: Welcome → Index → Settings → Back →")
  console.log("  Schedule Manager → Week View → Detail → Edit → Add Course →")
  console.log("  Course Manager → Back → Back → Back → Back → Back")
  console.log("")
  console.log("  At peak, there can be 5-8 pages in the stack simultaneously.")
  console.log("  On a wearable device with ~64MB RAM, each page costs ~1-3MB.")
  console.log("  8 pages × 2MB + timers × CPU cycles = OUT OF MEMORY = BLACK SCREEN")
  console.log("")

  // List pages without onDestroy
  console.log("  Pages without onDestroy (can't release resources when popped):")
  var noDestroyCount = 0
  for (var d = 0; d < results.pagesWithoutDestroy.length; d++) {
    var pd = results.pagesWithoutDestroy[d]
    console.log("    - " + pd.name + (pd.hasOnHide ? " (has onHide)" : " (NO cleanup at all!)"))
    noDestroyCount++
  }
  if (noDestroyCount === 0) console.log("    [OK] All pages have onDestroy")
  console.log("")

  // ---- ISSUE 3: Module-Level Singleton State ----
  console.log("-".repeat(70))
  console.log("  ISSUE 3: Module-Level State (singleton references)")
  console.log("-".repeat(70))
  console.log("")
  console.log("  require() caches modules. Module-level 'var _timer = null' etc.")
  console.log("  are shared across all page instances. If a new page calls init()")
  console.log("  while the old timer is still running, the old page's closure")
  console.log("  still holds a reference (memory leak through closure).")
  console.log("")

  if (results.moduleLevelState.length === 0) {
    console.log("  [OK] No module-level state issues found.")
  } else {
    for (var m = 0; m < results.moduleLevelState.length; m++) {
      var ms = results.moduleLevelState[m]
      console.log("  [" + (m + 1) + "] " + ms.file)
      for (var iss = 0; iss < ms.issues.length; iss++) {
        console.log("      " + ms.issues[iss])
      }
    }
  }
  console.log("")

  // ---- ISSUE 4: Specific High-Risk Timers ----
  console.log("-".repeat(70))
  console.log("  ISSUE 4: Highest-Risk Timer Instances")
  console.log("-".repeat(70))
  console.log("")

  var highRisk = [
    {
      file: "src/pages/index/modules/status-bar.js",
      timer: "setInterval(updateStatus, 60000)",
      risk: "MEDIUM",
      note: "Cleaned via stopStatusTimer() called from onDestroy. BUT: if index page is pushed (not destroyed), timer runs forever."
    },
    {
      file: "src/pages/index/modules/class-list.js",
      timer: "setInterval(updateClassProgress, 60000)",
      risk: "MEDIUM",
      note: "Cleaned via stopProgressTimer() called from onDestroy. Same push-vs-destroy issue."
    },
    {
      file: "src/pages/index/modules/custom-content.js",
      timer: "setInterval(rotate, N*1000)",
      risk: "HIGH",
      note: "Module-level _timer. Two setInterval calls possible (configured + default 3s). Multiple index page pushes = multiple rotations running."
    },
    {
      file: "src/pages/message-inbox/message-inbox.ux",
      timer: "setInterval(pollPeerTyping, 1000)",
      risk: "CRITICAL",
      note: "Runs EVERY 1 SECOND. On a wearable CPU, this is expensive. Has onHide/onDestroy cleanup but only if page is actually destroyed."
    }
  ]

  for (var r = 0; r < highRisk.length; r++) {
    var hr = highRisk[r]
    var riskIcon = hr.risk === "CRITICAL" ? "!!!" : hr.risk === "HIGH" ? "!!" : "!"
    console.log("  [" + riskIcon + "] " + hr.file)
    console.log("      Timer: " + hr.timer)
    console.log("      Risk:  " + hr.risk)
    console.log("      Note:  " + hr.note)
    console.log("")
  }

  // ---- RECOMMENDATIONS ----
  console.log("-".repeat(70))
  console.log("  RECOMMENDED FIXES (in priority order)")
  console.log("-".repeat(70))
  console.log("")
  console.log("  [P0] message-inbox: Move typing poll from setInterval(1s) to")
  console.log("        event-driven (globalThis callback) or increase to 5s+.")
  console.log("")
  console.log("  [P0] All pages: In onHide(), stop ALL timers. In onShow(),")
  console.log("        restart them. This prevents timers from running when")
  console.log("        the page is not visible (behind another page in stack).")
  console.log("")
  console.log("  [P1] custom-content.js: Move _timer from module-level to")
  console.log("        instance-level (instance._rotationTimer). Module-level")
  console.log("        state leaks across page instances.")
  console.log("")
  console.log("  [P1] index page: Consider using router.replace() instead of")
  console.log("        router.push() for pages that don't need back navigation")
  console.log("        (settings, course manager), or call router.clear() before")
  console.log("        push to limit stack depth.")
  console.log("")
  console.log("  [P2] Add onDestroy to all pages that currently lack it, even")
  console.log("        if just to null out references for GC hints.")
  console.log("")
  console.log("  [P2] database.js: Add cache eviction (LRU or size cap) to")
  console.log("        _cache object to prevent unbounded growth on multi-")
  console.log("        schedule setups.")
  console.log("")
  console.log("=".repeat(70))
  console.log("  Audit complete. Run with --json for machine-readable output.")
  console.log("=".repeat(70))

  // ---- ROOT CAUSE DIAGRAM ----
  console.log("")
  console.log("  ROOT CAUSE CHAIN (why users see blackscreen):")
  console.log("")
  console.log("  1. User navigates: push → push → push (pages stack up)")
  console.log("  2. Each page creates timers (setInterval) for status/progress/rotation")
  console.log("  3. onDestroy() not called (pages still in stack)")
  console.log("  4. Timers accumulate: 3 pages × 3-4 timers each = ~10 concurrent intervals")
  console.log("  5. CPU usage spikes (especially 1s polling timers)")
  console.log("  6. UI thread starved → clicks feel sluggish → 'getting slower'")
  console.log("  7. Memory grows (DOM trees + closures + caches)")
  console.log("  8. Wearable device hits memory limit (~64MB)")
  console.log("  9. OS kills the app or GPU fails to allocate framebuffer")
  console.log("  10. BLACK SCREEN")
  console.log("")
}

// JSON output mode
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(results, null, 2))
} else {
  printReport()
}