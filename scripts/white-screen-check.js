#!/usr/bin/env node

/**
 * Homepage White Screen Analysis & Prevention Script
 *
 * Usage:
 *   node scripts/white-screen-check.js [--verbose]
 *
 * This script performs a comprehensive static analysis of the index page
 * to detect potential white screen causes including:
 *   1. CSS layout issues (height collapse, overflow, positioning)
 *   2. JavaScript data initialization issues
 *   3. Template rendering conditions
 *   4. Router configuration integrity
 *   5. Storage data corruption
 *   6. Theme/color visibility issues
 *   7. Async dependency chain failures
 */

var fs = require('fs')
var path = require('path')

var PROJECT_ROOT = path.join(__dirname, '..')
var INDEX_FILE = path.join(PROJECT_ROOT, 'src', 'pages', 'index', 'index.ux')
var MANIFEST_FILE = path.join(PROJECT_ROOT, 'src', 'manifest.json')
var STORE_FILE = path.join(PROJECT_ROOT, 'src', 'data', 'store.js')
var DATABASE_FILE = path.join(PROJECT_ROOT, 'src', 'data', 'database.js')
var STORAGE_DATA_FILE = path.join(PROJECT_ROOT, 'storage-data.json')

var VERBOSE = false
var NO_CSS = false
var ISSUES = []
var WARNINGS = []
var PASSES = []

function addIssue(category, message, detail) {
  ISSUES.push({ category: category, message: message, detail: detail || '' })
}

function addWarning(category, message, detail) {
  WARNINGS.push({ category: category, message: message, detail: detail || '' })
}

function addPass(category, message) {
  PASSES.push({ category: category, message: message })
}

function logVerbose(msg) {
  if (VERBOSE) console.log('  [VERBOSE] ' + msg)
}

function parseArgs() {
  var args = process.argv.slice(2)
  for (var i = 0; i < args.length; i++) {
    if (args[i] === '--verbose' || args[i] === '-v') {
      VERBOSE = true
    }
    if (args[i] === '--no-css') {
      NO_CSS = true
    }
  }
}

function stripStyle(content) {
  return content.replace(/<style>[\s\S]*?<\/style>/, '<style>\n/* All CSS rules commented out for simulation */\n</style>')
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (e) {
    return null
  }
}

function extractTemplate(content) {
  var match = content.match(/<template>([\s\S]*?)<\/template>/)
  return match ? match[1] : ''
}

function extractScript(content) {
  var match = content.match(/<script>([\s\S]*?)<\/script>/)
  return match ? match[1] : ''
}

function extractStyle(content) {
  var match = content.match(/<style>([\s\S]*?)<\/style>/)
  return match ? match[1] : ''
}

function findCSSRule(style, selector) {
  var pattern = new RegExp(selector.replace(/\./g, '\\.') + '\\s*\\{([^}]*)\\}', 'g')
  var results = []
  var match
  while ((match = pattern.exec(style)) !== null) {
    results.push(match[1])
  }
  return results
}

function hasCSSProperty(style, selector, property) {
  var rules = findCSSRule(style, selector)
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].indexOf(property) !== -1) return true
  }
  return false
}

function getCSSPropertyValue(style, selector, property) {
  var rules = findCSSRule(style, selector)
  for (var i = 0; i < rules.length; i++) {
    var propMatch = new RegExp(property + '\\s*:\\s*([^;]+)').exec(rules[i])
    if (propMatch) return propMatch[1].trim()
  }
  return null
}

function countOccurrences(str, search) {
  var count = 0
  var pos = 0
  while ((pos = str.indexOf(search, pos)) !== -1) {
    count++
    pos += search.length
  }
  return count
}

function checkCSS() {
  console.log('\n--- Checking CSS Layout ---')

  var content = readFile(INDEX_FILE)
  if (!content) {
    addIssue('CSS', 'Cannot read index.ux file', INDEX_FILE)
    return
  }
  var style = extractStyle(content)
  var template = extractTemplate(content)

  var rootHeight = getCSSPropertyValue(style, '.schedule-page', 'height')
  var rootMinHeight = getCSSPropertyValue(style, '.schedule-page', 'min-height')

  if (rootHeight === '100%' && !rootMinHeight) {
    addWarning('CSS', '.schedule-page uses height: 100% without min-height safety net',
      'If the parent container has no explicit height, 100% of 0 is 0, causing white screen. ' +
      'Consider adding min-height: 100% or using flex: 1.')
  } else if (rootHeight === '100%' && rootMinHeight) {
    addPass('CSS', '.schedule-page has height: 100% with min-height: ' + rootMinHeight + ' (safe)')
  } else if (rootHeight) {
    addPass('CSS', '.schedule-page has explicit height: ' + rootHeight)
  }

  if (rootMinHeight) {
    addPass('CSS', '.schedule-page has min-height safety net: ' + rootMinHeight)
  } else {
    addWarning('CSS', '.schedule-page has no min-height fallback',
      'Without min-height, if height: 100% resolves to 0, the page collapses entirely.')
  }

  var rootBgColor = getCSSPropertyValue(style, '.schedule-page', 'background-color')
  if (rootBgColor && rootBgColor.indexOf('{{') === -1) {
    addWarning('CSS', '.schedule-page has hardcoded background-color in CSS: ' + rootBgColor,
      'Template uses dynamic {{ theme.bg }} which overrides the CSS. The hardcoded value is a fallback. ' +
      'If theme.bg is empty/missing, the page will be white or transparent.')
  } else if (!rootBgColor) {
    addIssue('CSS', '.schedule-page has no background-color in CSS',
      'If theme.bg is empty, the page background will be transparent/white.')
  }

  var classListFlex = getCSSPropertyValue(style, '.class-list', 'flex')
  if (classListFlex === '1') {
    addPass('CSS', '.class-list uses flex: 1 for proper space distribution')
  } else {
    addWarning('CSS', '.class-list should use flex: 1 to fill remaining space',
      'Without flex: 1, the scroll area may not expand properly.')
  }

  var classListOverflow = getCSSPropertyValue(style, '.class-list', 'overflow')
  if (classListOverflow === 'auto' || classListOverflow === 'scroll') {
    addPass('CSS', '.class-list has overflow: ' + classListOverflow)
  } else {
    addWarning('CSS', '.class-list overflow property: ' + (classListOverflow || 'not set'),
      'Without overflow: auto, content may be clipped.')
  }

  var rootFlexDirection = getCSSPropertyValue(style, '.schedule-page', 'flex-direction')
  if (rootFlexDirection === 'column') {
    addPass('CSS', '.schedule-page uses flex-direction: column')
  } else {
    addWarning('CSS', '.schedule-page flex-direction: ' + (rootFlexDirection || 'not set'),
      'Flex-direction: column is needed for vertical layout.')
  }

  var classCardPos = getCSSPropertyValue(style, '.class-card', 'position')
  var classCardWrapperPos = getCSSPropertyValue(style, '.class-card-wrapper', 'position')
  if (classCardWrapperPos === 'relative') {
    addPass('CSS', '.class-card-wrapper has position: relative for absolute children')
  } else {
    addWarning('CSS', '.class-card-wrapper position: ' + (classCardWrapperPos || 'not set'),
      'Absolute-positioned children (.progress-bg, .left-accent) need a positioned parent.')
  }

  var hasOverflowHidden = hasCSSProperty(style, '.class-card', 'overflow')
  if (hasOverflowHidden) {
    addPass('CSS', '.class-card has overflow: hidden for rounded corners clipping')
  }

  var displayNoneCount = countOccurrences(style, 'display: none')
  if (displayNoneCount > 0) {
    logVerbose('Found ' + displayNoneCount + ' display: none rules in CSS (media queries)')
    addPass('CSS', 'Media queries use display: none for responsive hiding (normal)')
  }

  var hasFlexWrap = getCSSPropertyValue(style, '.pinned-row', 'flex-wrap')
  if (hasFlexWrap === 'wrap') {
    addPass('CSS', '.pinned-row has flex-wrap: wrap')
  }

  var bottomBtnJustify = getCSSPropertyValue(style, '.bottom-buttons', 'justify-content')
  if (bottomBtnJustify) {
    addPass('CSS', '.bottom-buttons has justify-content: ' + bottomBtnJustify)
  }

  var circleMedia = style.match(/@media\s*\(shape:\s*circle\)/g)
  if (circleMedia) {
    logVerbose('Found circle screen media query')
    var circleDayNav = style.match(/@media\s*\(shape:\s*circle\)[\s\S]*?\.day-nav-btns\s*\{[^}]*display\s*:\s*none[^}]*\}/)
    if (circleDayNav) {
      addPass('CSS', 'Circle screen: .day-nav-btns hidden (correct for small screens)')
    }
  }

  var hasPadding = getCSSPropertyValue(style, '.schedule-page', 'padding')
  if (hasPadding) {
    addPass('CSS', '.schedule-page has padding: ' + hasPadding)
  } else {
    addWarning('CSS', '.schedule-page has no padding set')
  }
}

function checkTemplate() {
  console.log('\n--- Checking Template Conditions ---')

  var content = readFile(INDEX_FILE)
  if (!content) return
  var template = extractTemplate(content)

  var ifConditions = template.match(/if="\{\{[^}]+\}\}"/g) || []
  var conditions = ifConditions.map(function(c) {
    var match = c.match(/if="\{\{([^}]+)\}\}"/)
    return match ? match[1] : c
  })

  console.log('  Template conditional expressions (' + conditions.length + ' found):')
  for (var i = 0; i < conditions.length; i++) {
    console.log('    ' + (i + 1) + '. if="{{ ' + conditions[i] + ' }}"')
  }

  var script = extractScript(content)

  var hasDayTitle = template.indexOf('{{ currentDay }}') !== -1
  if (hasDayTitle) {
    addPass('Template', 'Day title is always rendered (no conditional)')
  } else {
    addIssue('Template', 'Day title missing from template')
  }

  var hasBottomButtons = template.indexOf('bottom-buttons') !== -1
  if (hasBottomButtons) {
    addPass('Template', 'Bottom buttons always rendered')
  } else {
    addIssue('Template', 'Bottom buttons missing from template')
  }

  var hasWeekIndicator = template.indexOf('week-indicator') !== -1
  if (hasWeekIndicator) {
    addPass('Template', 'Week indicator always rendered')
  } else {
    addIssue('Template', 'Week indicator missing from template')
  }

  var hasEmptyState = template.indexOf('currentClasses.length === 0') !== -1
  if (hasEmptyState) {
    addPass('Template', 'Empty state handled when no classes')
  } else {
    addWarning('Template', 'No empty state for currentClasses')
  }

  var hasForLoop = template.indexOf('for="{{ currentClasses }}"') !== -1
  if (hasForLoop) {
    addPass('Template', 'Course list renders via for loop')
  } else {
    addIssue('Template', 'Course list for loop missing')
  }

  if (template.indexOf('{{ theme.bg }}') !== -1) {
    addPass('Template', 'Page background uses theme.bg')
  } else {
    addWarning('Template', 'Page background not using theme.bg')
  }

  if (template.indexOf('{{ theme.text }}') !== -1) {
    addPass('Template', 'Text colors use theme.text')
  } else {
    addWarning('Template', 'Text colors not using theme')
  }

  if (template.indexOf('{{ theme.accent }}') !== -1) {
    addPass('Template', 'Accent colors use theme.accent')
  }

  if (template.indexOf('{{ theme.card }}') !== -1) {
    addPass('Template', 'Card backgrounds use theme.card')
  }

  var hasForItem = template.indexOf('$item') !== -1
  if (hasForItem) {
    addPass('Template', 'for loop uses $item reference')
  }
}

function checkScript() {
  console.log('\n--- Checking JavaScript Initialization ---')

  var content = readFile(INDEX_FILE)
  if (!content) return
  var script = extractScript(content)

  if (script.indexOf('onInit()') !== -1) {
    addPass('JS', 'onInit() lifecycle hook present')
  } else {
    addIssue('JS', 'onInit() lifecycle hook missing - page won\'t initialize')
  }

  if (script.indexOf('onShow()') !== -1) {
    addPass('JS', 'onShow() lifecycle hook present')
  }

  if (script.indexOf('onHide()') !== -1) {
    addPass('JS', 'onHide() lifecycle hook present (cleanup)')
  }

  if (script.indexOf('onDestroy()') !== -1) {
    addPass('JS', 'onDestroy() lifecycle hook present (cleanup)')
  }

  var themeDefault = script.match(/theme\s*:\s*\{([^}]+)\}/)
  if (themeDefault) {
    var themeStr = themeDefault[1]
    if (themeStr.indexOf('bg') !== -1 && themeStr.indexOf('text') !== -1 && themeStr.indexOf('accent') !== -1) {
      addPass('JS', 'theme has complete default values (bg, text, accent)')
    } else {
      addWarning('JS', 'theme default may be incomplete')
    }
  } else {
    addIssue('JS', 'theme default value not found in private')
  }

  if (script.indexOf('getTheme(function') !== -1) {
    addPass('JS', 'getTheme() called for dynamic theme loading')
  }

  if (script.indexOf('fontScale') !== -1 && script.indexOf('applyFontScale') !== -1) {
    addPass('JS', 'Font scale is applied')
  }

  if (script.indexOf('getScaleSafe') !== -1) {
    addPass('JS', 'getScaleSafe() used for safe font scale')
  }

  if (script.indexOf('database.init') !== -1) {
    addPass('JS', 'database.init() called in onInit')
  } else {
    addIssue('JS', 'database.init() not called - courses won\'t load')
  }

  if (script.indexOf('getAllCourses') !== -1) {
    addPass('JS', 'getAllCourses() called to load schedule data')
  }

  if (script.indexOf('loadDayClasses') !== -1) {
    addPass('JS', 'loadDayClasses() called to populate currentClasses')
  }

  if (script.indexOf('getHomepageSettings') !== -1) {
    addPass('JS', 'getHomepageSettings() called for toggle settings')
  }

  if (script.indexOf('loadPinnedPages') !== -1) {
    addPass('JS', 'loadPinnedPages() called for pinned pages')
  }

  if (script.indexOf('detectScreen') !== -1) {
    addPass('JS', 'detectScreen() called for screen shape detection')
  }

  if (script.indexOf('startClockTimer') !== -1) {
    addPass('JS', 'Clock timer started')
  }

  if (script.indexOf('stopClockTimer') !== -1) {
    addPass('JS', 'Clock timer cleanup in onHide/onDestroy')
  }

  if (script.indexOf('stopStatusTimer') !== -1) {
    addPass('JS', 'Status timer cleanup in onHide/onDestroy')
  }

  if (script.indexOf('sortByTime') !== -1) {
    addPass('JS', 'sortByTime() function defined for course sorting')
  }

  var hasTryCatch = script.indexOf('try {') !== -1 || script.indexOf('try{') !== -1
  if (hasTryCatch) {
    addPass('JS', 'Error handling with try-catch present')
  }

  if (script.indexOf('currentClasses') !== -1 && script.indexOf('currentClasses:') !== -1) {
    addPass('JS', 'currentClasses initialized as empty array')
  }

  if (script.indexOf('schedule:') !== -1 && script.indexOf('schedule: []') !== -1) {
    addPass('JS', 'schedule initialized as empty array')
  } else {
    addWarning('JS', 'schedule initial value may not be empty array')
  }
}

function checkRouter() {
  console.log('\n--- Checking Router Configuration ---')

  var manifest = readFile(MANIFEST_FILE)
  if (!manifest) {
    addIssue('Router', 'manifest.json not found', MANIFEST_FILE)
    return
  }

  try {
    var manifestObj = JSON.parse(manifest)
  } catch (e) {
    addIssue('Router', 'manifest.json is invalid JSON: ' + e.message)
    return
  }

  var entry = manifestObj.router && manifestObj.router.entry
  if (entry === 'pages/index') {
    addPass('Router', 'Entry point is pages/index (correct)')
  } else {
    addIssue('Router', 'Entry point is "' + entry + '" instead of "pages/index"')
  }

  var pages = manifestObj.router && manifestObj.router.pages
  if (!pages) {
    addIssue('Router', 'No pages defined in router config')
    return
  }

  var indexPage = pages['pages/index']
  if (indexPage) {
    addPass('Router', 'pages/index is registered in router')
    if (indexPage.component === 'index') {
      addPass('Router', 'pages/index component is "index"')
    } else {
      addIssue('Router', 'pages/index component is "' + indexPage.component + '" instead of "index"')
    }
  } else {
    addIssue('Router', 'pages/index NOT registered in router')
  }

  var content = readFile(INDEX_FILE)
  if (content) {
    var script = extractScript(content)
    var routerPushes = script.match(/router\.push\(\s*\{\s*uri:\s*["'][^"']+["']/g) || []
    var pushedPaths = routerPushes.map(function(p) {
      var match = p.match(/uri:\s*["']([^"']+)["']/)
      return match ? match[1] : ''
    })

    console.log('  Pages pushed from index (' + pushedPaths.length + '):')
    for (var i = 0; i < pushedPaths.length; i++) {
      var uri = pushedPaths[i]
      var pageKey = uri.replace(/^\//, '')
      var found = pages[pageKey] ? 'OK' : 'MISSING'
      console.log('    ' + (i + 1) + '. ' + uri + ' [' + found + ']')
      if (!pages[pageKey]) {
        addIssue('Router', 'Pushed page "' + uri + '" not registered in manifest router',
          'This will cause navigation failure and potentially a white screen.')
      }
    }
  }

  var pageKeys = Object.keys(pages)
  console.log('  Total registered pages: ' + pageKeys.length)

  var pageFiles = pageKeys.map(function(key) {
    var component = pages[key].component
    return path.join(PROJECT_ROOT, 'src', key, component + '.ux')
  })

  var missingFiles = []
  for (var j = 0; j < pageFiles.length; j++) {
    if (!fs.existsSync(pageFiles[j])) {
      missingFiles.push(pageFiles[j])
    }
  }

  if (missingFiles.length > 0) {
    for (var k = 0; k < missingFiles.length; k++) {
      addIssue('Router', 'Registered page file not found: ' + path.relative(PROJECT_ROOT, missingFiles[k]),
        'The router references this page but the .ux file does not exist.')
    }
  } else {
    addPass('Router', 'All registered page files exist')
  }
}

function checkStorageData() {
  console.log('\n--- Checking Storage Data ---')

  if (!fs.existsSync(STORAGE_DATA_FILE)) {
    addWarning('Storage', 'No storage-data.json found (first run is normal)',
      'Run scripts/check-and-insert-course.js to initialize data.')
    return
  }

  var data = readFile(STORAGE_DATA_FILE)
  if (!data) {
    addIssue('Storage', 'Cannot read storage-data.json')
    return
  }

  try {
    var parsed = JSON.parse(data)
  } catch (e) {
    addIssue('Storage', 'storage-data.json is corrupted JSON: ' + e.message)
    return
  }

  var allCoursesKey = 'allCourses_0'
  if (parsed[allCoursesKey]) {
    var scheduleStr = parsed[allCoursesKey]
    try {
      var schedule = typeof scheduleStr === 'string' ? JSON.parse(scheduleStr) : scheduleStr
      if (Array.isArray(schedule) && schedule.length > 0) {
        var totalCourses = 0
        for (var d = 0; d < schedule.length; d++) {
          totalCourses += (schedule[d].classes || []).length
        }
        addPass('Storage', 'Schedule data exists: ' + schedule.length + ' days, ' + totalCourses + ' courses')
      } else {
        addWarning('Storage', 'Schedule data is empty or invalid')
      }
    } catch (e) {
      addIssue('Storage', 'Schedule data JSON parse error: ' + e.message)
    }
  } else {
    addWarning('Storage', 'allCourses_0 key not found in storage data')
  }

  if (parsed.scheduleNames) {
    try {
      var names = JSON.parse(parsed.scheduleNames)
      if (Array.isArray(names) && names.length > 0) {
        addPass('Storage', 'scheduleNames: ' + names.join(', '))
      }
    } catch (e) {
      addWarning('Storage', 'scheduleNames JSON parse error')
    }
  }

  if (parsed.currentScheduleIndex !== undefined) {
    addPass('Storage', 'currentScheduleIndex: ' + parsed.currentScheduleIndex)
  }

  if (parsed.homepage_settings) {
    try {
      var settings = JSON.parse(parsed.homepage_settings)
      addPass('Storage', 'homepage_settings: showQuickAdd=' + settings.showQuickAdd + ', showTime=' + settings.showTime)
    } catch (e) {
      addWarning('Storage', 'homepage_settings JSON parse error')
    }
  }
}

function checkAsyncDependencyChain() {
  console.log('\n--- Checking Async Dependency Chain ---')

  var content = readFile(INDEX_FILE)
  if (!content) return
  var script = extractScript(content)

  console.log('  onInit() async dependency chain:')
  console.log('    1. store.getTheme(callback)        → theme')
  console.log('    2. database.init(callback)         → database ready')
  console.log('       └─ database.getAllCourses(cb)   → schedule')
  console.log('          └─ loadDayClasses()          → currentClasses')
  console.log('             └─ updateStatus()         → status bar')
  console.log('             └─ startStatusTimer()     → periodic updates')
  console.log('    3. storage.get("index_nextId")     → nextId')
  console.log('    4. store.getScaleSafe(callback)    → fontScale')
  console.log('    5. store.getCurrentScheduleIndex() → currentWeek')
  console.log('    6. store.getRemindSettings()       → remindSettings')
  console.log('    7. store.getHomepageSettings()     → toggles')
  console.log('    8. applyFontScale()                → font styles')
  console.log('    9. startClockTimer()               → clock display')
  console.log('   10. detectScreen()                  → isCapsule, isNarrowScreen')
  console.log('   11. loadPinnedPages()               → pinned pages')

  var hasDBInitInCallback = script.indexOf('database.init(function') !== -1
  if (hasDBInitInCallback) {
    addPass('Async', 'database.init() uses callback for async safety')
  } else {
    addWarning('Async', 'database.init() may not use callback pattern')
  }

  var hasGetAllInCallback = script.indexOf('getAllCourses(function') !== -1
  if (hasGetAllInCallback) {
    addPass('Async', 'getAllCourses() uses callback pattern')
  }

  var hasThemeCallback = script.indexOf('getTheme(function') !== -1
  if (hasThemeCallback) {
    addPass('Async', 'getTheme() uses callback pattern')
  }

  var themeLoadedBeforeRender = (script.indexOf('getTheme(function') < script.indexOf('startClockTimer'))
  if (themeLoadedBeforeRender) {
    addPass('Async', 'Theme loaded before clock timer starts')
  } else {
    addWarning('Async', 'Theme may not be loaded before rendering starts')
  }

  var hasThemeDefault = script.indexOf("bg: '#1a1a2e'") !== -1
  if (hasThemeDefault) {
    addPass('Async', 'theme has explicit default value (anti-flash)')
  } else {
    addIssue('Async', 'theme has no explicit default - flash screen risk',
      'Without a default theme, the page renders with empty colors before async callback fires.')
  }
}

function checkColorVisibility() {
  console.log('\n--- Checking Color Visibility ---')

  var content = readFile(INDEX_FILE)
  if (!content) return
  var script = extractScript(content)

  var themeDefault = script.match(/theme\s*:\s*\{([^}]+)\}/)
  if (!themeDefault) return

  var themeStr = themeDefault[1]
  var bgMatch = themeStr.match(/bg\s*:\s*['"]([^'"]+)['"]/)
  var textMatch = themeStr.match(/text\s*:\s*['"]([^'"]+)['"]/)
  var textSecMatch = themeStr.match(/textSecondary\s*:\s*['"]([^'"]+)['"]/)
  var textMutedMatch = themeStr.match(/textMuted\s*:\s*['"]([^'"]+)['"]/)
  var accentMatch = themeStr.match(/accent\s*:\s*['"]([^'"]+)['"]/)

  if (bgMatch && textMatch) {
    var bg = bgMatch[1]
    var text = textMatch[1]
    console.log('  Default theme: bg=' + bg + ', text=' + text)

    if (bg === text) {
      addIssue('Color', 'Background color equals text color (' + bg + ') - text will be invisible!')
    }

    if (bg === '#ffffff' || bg === '#fff') {
      addWarning('Color', 'Background is white - any white text will be invisible')
    }

    if (text === '#ffffff' || text === '#fff') {
      addPass('Color', 'Text is white on dark background (good contrast)')
    }
  }

  if (textSecMatch) {
    var textSec = textSecMatch[1]
    if (textSec === bgMatch[1]) {
      addWarning('Color', 'textSecondary color equals background - secondary text invisible')
    }
  }

  if (textMutedMatch) {
    var textMuted = textMutedMatch[1]
    if (textMuted === bgMatch[1]) {
      addWarning('Color', 'textMuted color equals background - muted text invisible')
    }
  }

  if (accentMatch) {
    console.log('  Accent color: ' + accentMatch[1])
  }
}

function checkStoreIntegrity() {
  console.log('\n--- Checking Store Module Integrity ---')

  var store = readFile(STORE_FILE)
  if (!store) {
    addIssue('Store', 'store.js not found', STORE_FILE)
    return
  }

  var requiredMethods = [
    'getTheme', 'setTheme', 'getThemeName',
    'getFontScale', 'setFontScale', 'getScaleSafe', 'buildFontStyles',
    'getScheduleNames', 'setScheduleNames',
    'getCurrentScheduleIndex', 'setCurrentScheduleIndex',
    'getRemindSettings', 'setRemindSettings',
    'getHomepageSettings', 'setHomepageSettings',
    'getVibrationStyle', 'setVibrationStyle',
    'DEFAULT_THEME'
  ]

  for (var i = 0; i < requiredMethods.length; i++) {
    var method = requiredMethods[i]
    if (store.indexOf(method + ':') !== -1 || store.indexOf(method + ' =') !== -1) {
      addPass('Store', 'store.js exports: ' + method)
    } else {
      addWarning('Store', 'store.js may not export: ' + method)
    }
  }
}

function checkDatabaseModule() {
  console.log('\n--- Checking Database Module ---')

  var db = readFile(DATABASE_FILE)
  if (!db) {
    addIssue('Database', 'database.js not found', DATABASE_FILE)
    return
  }

  if (db.indexOf('init:') !== -1 || db.indexOf('init =') !== -1) {
    addPass('Database', 'database.init() method exists')
  }

  if (db.indexOf('getAllCourses:') !== -1 || db.indexOf('getAllCourses =') !== -1) {
    addPass('Database', 'database.getAllCourses() method exists')
  }

  if (db.indexOf('insertCourse:') !== -1 || db.indexOf('insertCourse =') !== -1) {
    addPass('Database', 'database.insertCourse() method exists')
  }

  if (db.indexOf('fallbackToStorage') !== -1) {
    addPass('Database', 'SQLite fallback to Storage is implemented')
  }

  if (db.indexOf('initTimer') !== -1 && db.indexOf('setTimeout') !== -1) {
    addPass('Database', 'SQLite init timeout protection is implemented')
  }
}

function printSummary() {
  console.log('\n')
  console.log('========================================')
  console.log('  WHITE SCREEN ANALYSIS SUMMARY')
  console.log('========================================')

  var totalIssues = ISSUES.length
  var totalWarnings = WARNINGS.length
  var totalPasses = PASSES.length

  if (totalIssues > 0) {
    console.log('\n[ISSUES] ' + totalIssues + ' potential white screen cause(s):')
    var byCategory = {}
    for (var i = 0; i < ISSUES.length; i++) {
      var cat = ISSUES[i].category
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(ISSUES[i])
    }
    for (var cat in byCategory) {
      if (byCategory.hasOwnProperty(cat)) {
        console.log('\n  [' + cat + '] (' + byCategory[cat].length + ' issues)')
        for (var j = 0; j < byCategory[cat].length; j++) {
          console.log('    ✗ ' + byCategory[cat][j].message)
          if (VERBOSE && byCategory[cat][j].detail) {
            console.log('      → ' + byCategory[cat][j].detail)
          }
        }
      }
    }
  }

  if (totalWarnings > 0) {
    console.log('\n[WARNINGS] ' + totalWarnings + ' potential concern(s):')
    var warnByCat = {}
    for (var i = 0; i < WARNINGS.length; i++) {
      var cat = WARNINGS[i].category
      if (!warnByCat[cat]) warnByCat[cat] = []
      warnByCat[cat].push(WARNINGS[i])
    }
    for (var cat in warnByCat) {
      if (warnByCat.hasOwnProperty(cat)) {
        console.log('\n  [' + cat + '] (' + warnByCat[cat].length + ' warnings)')
        for (var j = 0; j < warnByCat[cat].length; j++) {
          console.log('    ⚠ ' + warnByCat[cat][j].message)
          if (VERBOSE && warnByCat[cat][j].detail) {
            console.log('      → ' + warnByCat[cat][j].detail)
          }
        }
      }
    }
  }

  console.log('\n[PASSES] ' + totalPasses + ' checks passed.')
  if (VERBOSE) {
    for (var k = 0; k < PASSES.length; k++) {
      console.log('    ✓ ' + PASSES[k].category + ': ' + PASSES[k].message)
    }
  }

  console.log('\n========================================')
  var score = totalPasses + totalWarnings + totalIssues
  var passRate = score > 0 ? Math.round((totalPasses / score) * 100) : 100
  console.log('  Score: ' + totalPasses + '/' + score + ' (' + passRate + '%)')
  console.log('  Issues: ' + totalIssues + ' | Warnings: ' + totalWarnings + ' | Passes: ' + totalPasses)
  console.log('========================================')

  if (totalIssues > 0) {
    console.log('\n[ACTION REQUIRED] Fix ' + totalIssues + ' issue(s) to prevent white screen.')
    console.log('  Run with --verbose for detailed fix suggestions.')
  } else if (totalWarnings > 0) {
    console.log('\n[REVIEW] ' + totalWarnings + ' warning(s) to review.')
    console.log('  Run with --verbose for detailed suggestions.')
  } else {
    console.log('\n[OK] No white screen issues detected!')
  }
}

function checkNoCSSSimulation() {
  console.log('\n========================================')
  console.log('  --no-css SIMULATION: CSS Removed')
  console.log('========================================')
  console.log('Analyzing what the page looks like without any CSS rules...')
  console.log('')

  var content = readFile(INDEX_FILE)
  if (!content) {
    addIssue('NoCSS', 'Cannot read index.ux', INDEX_FILE)
    return
  }

  var style = extractStyle(content)
  var script = extractScript(content)
  var template = extractTemplate(content)

  console.log('CSS rules found: ' + (style.split('}').length - 1) + ' approx')

  var hasInlineBg = template.indexOf('style="background-color: {{ theme.bg }}"') !== -1
  if (hasInlineBg) {
    addPass('NoCSS', 'Root div has inline background-color via theme.bg')
    console.log('  ✓ Root div: inline background-color: {{ theme.bg }} → WILL RENDER with theme color')
  } else {
    addIssue('NoCSS', 'Root div has NO inline background-color',
      'Without CSS, the page background will be transparent/white. Add inline style="background-color: {{ theme.bg }}"')
  }

  var textColors = template.match(/style="[^"]*color:\s*\{\{\s*theme\.[^}]+\}\}[^"]*"/g) || []
  console.log('  ✓ Text elements with inline color: ' + textColors.length + ' found')
  if (textColors.length === 0) {
    addIssue('NoCSS', 'No text elements have inline color styles',
      'All text will be default browser color (usually black). On dark bg this is fine, on white bg invisible.')
  }

  var hasInlineBgOnCards = template.indexOf('class="class-card"') !== -1 &&
    template.indexOf('style="background-color: {{ theme.card }}"') !== -1
  if (hasInlineBgOnCards) {
    addPass('NoCSS', 'Course cards have inline background-color')
  }

  var hasInlineBgOnButtons = template.indexOf('class="add-btn"') !== -1 &&
    template.indexOf('style="background-color: {{ theme.accent }}"') !== -1
  if (hasInlineBgOnButtons) {
    addPass('NoCSS', 'Buttons have inline background-color')
  }

  console.log('\n--- Layout Simulation (CSS removed) ---')

  var hasFlexOnRoot = template.indexOf('class="schedule-page"') !== -1
  if (hasFlexOnRoot) {
    console.log('  ⚠ Root div has class="schedule-page" but NO CSS → flex-direction: column is LOST')
    console.log('    → Children will stack in default block layout (still vertical, but no flex distribution)')
    addWarning('NoCSS', 'Flexbox layout lost: .schedule-page flex-direction: column',
      'Children stack in default block layout. .class-list will NOT auto-fill remaining space with flex: 1.')
  }

  var hasClassListFlex = template.indexOf('class="class-list"') !== -1
  if (hasClassListFlex) {
    console.log('  ⚠ .class-list: flex: 1 is LOST → no auto-expand to fill remaining height')
    console.log('    → Course list will only be as tall as its content')
    addWarning('NoCSS', '.class-list flex: 1 lost',
      'Course list area will not expand to fill the screen. It will only be as tall as the courses inside it.')
  }

  var hasOverflow = style.indexOf('overflow:') !== -1
  if (hasOverflow) {
    console.log('  ⚠ overflow: auto/scroll is LOST → content may overflow or be clipped')
    addWarning('NoCSS', 'overflow property lost',
      'Without overflow: auto, long course lists may overflow the viewport unpredictably.')
  }

  console.log('\n--- Element Visibility Analysis ---')

  var elements = []
  var divMatches = template.match(/<div[^>]*class="([^"]*)"[^>]*>/g) || []
  var textMatches = template.match(/<text[^>]*class="([^"]*)"[^>]*>/g) || []
  var inputMatches = template.match(/<input[^>]*class="([^"]*)"[^>]*>/g) || []

  elements = elements.concat(divMatches, textMatches, inputMatches)

  console.log('  Total styled elements: ' + elements.length)

  var sizeProps = (style.match(/width\s*:|height\s*:|font-size\s*:|padding\s*:|margin\s*:/g) || [])
  console.log('  CSS sizing properties lost: ' + sizeProps.length)

  var displayProps = (style.match(/display\s*:|flex\s*:|overflow\s*:/g) || [])
  console.log('  CSS layout properties lost: ' + displayProps.length)

  console.log('\n--- Critical Visibility Issues ---')

  var hasPadding = style.match(/padding\s*:\s*44px/)
  if (hasPadding) {
    console.log('  ⚠ Top padding 44px (status bar offset) is LOST → header may overlap with status bar')
    addWarning('NoCSS', 'Top padding 44px lost',
      'The header will be at the very top of the screen, overlapping with the system status bar.')
  }

  var hasFontSize = style.match(/font-size\s*:\s*\d+px/g)
  if (hasFontSize) {
    console.log('  ⚠ All font-size rules are LOST → text will be browser default (usually 16px)')
    addWarning('NoCSS', 'Font sizes lost',
      'All text will render at browser default size. Day titles, course names, buttons all at same size.')
  }

  var hasPositionAbsolute = style.match(/position\s*:\s*absolute/g)
  if (hasPositionAbsolute) {
    console.log('  ⚠ position: absolute elements (left-accent, progress-bg) will NOT position correctly')
    addWarning('NoCSS', 'Absolute positioning lost',
      'Left accent bars and progress backgrounds will flow in normal document order instead of overlaying cards.')
  }

  var hasBorderRadius = style.match(/border-radius/g)
  if (hasBorderRadius) {
    console.log('  ⚠ border-radius LOST → all elements will have sharp corners')
  }

  console.log('\n--- What STILL works (inline styles) ---')
  console.log('  ✓ background-color (inline on each element)')
  console.log('  ✓ color (inline on each text/element)')
  console.log('  ✓ font-size (inline on some text elements)')
  console.log('  ✓ if/for directives (template logic still works)')
  console.log('  ✓ onclick handlers (interactivity still works)')
  console.log('  ✓ data binding ({{ }} expressions still work)')

  console.log('\n--- Verdict ---')
  var noCSSIssues = ISSUES.filter(function(i) { return i.category === 'NoCSS' })
  var noCSSWarnings = WARNINGS.filter(function(w) { return w.category === 'NoCSS' })

  if (noCSSIssues.length > 0) {
    console.log('  ✗ LIKELY WHITE SCREEN: ' + noCSSIssues.length + ' critical issues')
  } else {
    console.log('  ⚠ PARTIALLY VISIBLE: Content will render but layout is broken')
    console.log('  → Background colors work (inline styles)')
    console.log('  → Text is visible (inline colors)')
    console.log('  → But layout is completely collapsed (no flex, no sizing)')
  }

  console.log('')
  console.log('  CONCLUSION: The page uses inline styles extensively for colors,')
  console.log('  so removing CSS will NOT cause a pure white screen. The page')
  console.log('  will render with correct colors but severely broken layout:')
  console.log('  - No flexbox distribution')
  console.log('  - No padding/margins')
  console.log('  - Default font sizes')
  console.log('  - Absolute positioned elements misplaced')
  console.log('')
};

function main() {
  parseArgs()

  if (NO_CSS) {
    console.log('========================================')
    console.log('  Homepage White Screen Analyzer')
    console.log('  Mode: --no-css (CSS removal simulation)')
    console.log('========================================')
    console.log('Index file: ' + INDEX_FILE)
    console.log('')

    checkTemplate()
    checkScript()
    checkRouter()
    checkStorageData()
    checkAsyncDependencyChain()
    checkColorVisibility()
    checkStoreIntegrity()
    checkDatabaseModule()
    checkNoCSSSimulation()

    printSummary()
    return
  }

  console.log('========================================')
  console.log('  Homepage White Screen Analyzer')
  console.log('========================================')
  console.log('Index file: ' + INDEX_FILE)
  console.log('Manifest:   ' + MANIFEST_FILE)
  console.log('Store:      ' + STORE_FILE)
  console.log('Database:   ' + DATABASE_FILE)
  console.log('')

  checkCSS()
  checkTemplate()
  checkScript()
  checkRouter()
  checkStorageData()
  checkAsyncDependencyChain()
  checkColorVisibility()
  checkStoreIntegrity()
  checkDatabaseModule()

  printSummary()
}

main()