#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var cp = require('child_process')

var DATA_FILE = path.join(__dirname, '..', 'storage-data.json')
var AUTH_STORE = path.join(__dirname, '..', 'src', 'data', 'auth-store.js')

var AUTH_KEY = 'auth_data'
var PREMIUM_KEY = 'premium_unlocked'
var MARKER = 'var FORCE_AUTH_MODE = '

function usage() {
  console.log('Auth Record Manager - Manage activation/authorization records')
  console.log('')
  console.log('Usage:')
  console.log('  node scripts/manage-auth.js standard              Standard version (deactivated)')
  console.log('  node scripts/manage-auth.js permanent             Permanent activation (never expires)')
  console.log('  node scripts/manage-auth.js months:<N>            Premium for N months (e.g. months:3)')
  console.log('  node scripts/manage-auth.js expire                Soft-delete: set activation as expired')
  console.log('  node scripts/manage-auth.js reset                 Reset to normal (read from device storage)')
  console.log('  node scripts/manage-auth.js show                  Show current auth status')
  console.log('')
  console.log('Examples:')
  console.log('  node scripts/manage-auth.js standard              Set to standard/free version')
  console.log('  node scripts/manage-auth.js permanent             Set to permanent premium')
  console.log('  node scripts/manage-auth.js months:6              Set to 6 months premium')
  console.log('  node scripts/manage-auth.js months:1              Set to 1 month premium')
  console.log('  node scripts/manage-auth.js expire                Mark activation as expired')
  console.log('  node scripts/manage-auth.js reset                 Restore normal auth (from device)')
  console.log('  node scripts/manage-auth.js show                  Display current auth state')
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {}
  }
  try {
    var raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('[ERROR] Failed to read data file: ' + e.message)
    return null
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8')
    return true
  } catch (e) {
    console.error('[ERROR] Failed to write data file: ' + e.message)
    return false
  }
}

function getAuthData(data) {
  if (data[AUTH_KEY]) {
    try {
      return JSON.parse(data[AUTH_KEY])
    } catch (e) {
      return null
    }
  }
  return null
}

function formatDate(ts) {
  if (!ts) return 'N/A'
  var d = new Date(ts)
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1)
  if (m.length < 2) m = '0' + m
  var day = String(d.getDate())
  if (day.length < 2) day = '0' + day
  var h = String(d.getHours())
  if (h.length < 2) h = '0' + h
  var min = String(d.getMinutes())
  if (min.length < 2) min = '0' + min
  return y + '-' + m + '-' + day + ' ' + h + ':' + min
}

function getCurrentForceMode() {
  try {
    var content = fs.readFileSync(AUTH_STORE, 'utf-8')
    var lines = content.split('\n')
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(MARKER) === 0 || lines[i].trim().indexOf(MARKER) === 0) {
        var match = lines[i].match(/var FORCE_AUTH_MODE = (.+)/)
        if (match) {
          var val = match[1].trim()
          if (val === 'null') return null
          return val.replace(/['"]/g, '')
        }
      }
    }
  } catch (e) {}
  return null
}

function setForceMode(mode) {
  var value
  if (mode === 'reset' || mode === null) {
    value = 'null'
  } else {
    value = "'" + mode + "'"
  }

  try {
    var content = fs.readFileSync(AUTH_STORE, 'utf-8')
    var regex = new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*')
    var newContent = content.replace(regex, MARKER + value)
    fs.writeFileSync(AUTH_STORE, newContent, 'utf-8')
    return true
  } catch (e) {
    console.error('[ERROR] Failed to modify auth-store.js: ' + e.message)
    return false
  }
}

function showStatus() {
  var mode = getCurrentForceMode()

  console.log('')
  console.log('=== Current Auth Status ===')
  console.log('')

  if (mode === null) {
    console.log('  Mode:          Normal (reading from device storage)')
  } else {
    console.log('  Force Mode:    ' + mode)
  }

  console.log('  Source file:   ' + path.relative(process.cwd(), AUTH_STORE))
  console.log('')

  var data = readData()
  if (data && data[AUTH_KEY]) {
    var auth = getAuthData(data)
    if (auth) {
      console.log('  [storage-data.json record]')
      console.log('  Activated:      ' + (auth.isActivated ? 'Yes' : 'No'))
      console.log('  Permanent:      ' + (auth.isPermanent ? 'Yes' : 'No'))
      if (auth.expireAt) {
        var now = Date.now()
        var remaining = auth.expireAt - now
        var days = Math.ceil(remaining / (24 * 60 * 60 * 1000))
        if (days > 0) {
          console.log('  Remaining:      ' + days + ' days')
        } else {
          console.log('  Expired:        ' + Math.abs(days) + ' days ago')
        }
      }
      console.log('')
    }
  }
}

function buildAuthData(mode) {
  var now = Date.now()

  var auth = {
    installTime: now,
    isActivated: false,
    isPermanent: false,
    expireAt: null,
    activatedAt: null,
    lastRemindDate: '',
    remindEnabled: true,
    trialDays: 7,
    productId: '0001',
    history: []
  }

  switch (mode) {
    case 'standard':
      break

    case 'permanent':
      auth.isActivated = true
      auth.isPermanent = true
      auth.activatedAt = now
      auth.expireAt = null
      auth.history.push({
        action: 'permanent_activation',
        time: now,
        note: 'Set to permanent via manage-auth script'
      })
      break

    case 'expire':
      auth.isActivated = true
      auth.isPermanent = false
      auth.activatedAt = now - 365 * 24 * 60 * 60 * 1000
      auth.expireAt = now - 30 * 24 * 60 * 60 * 1000
      auth.history.push({
        action: 'expired',
        time: now,
        note: 'Soft-deleted / set to expired via manage-auth script'
      })
      break

    default:
      if (mode.indexOf('months:') === 0) {
        var months = parseInt(mode.split(':')[1], 10)
        if (isNaN(months) || months <= 0) {
          console.error('[ERROR] Invalid months value: ' + mode.split(':')[1])
          return null
        }
        auth.isActivated = true
        auth.isPermanent = false
        auth.activatedAt = now
        auth.expireAt = now + months * 30 * 24 * 60 * 60 * 1000
        auth.history.push({
          action: 'months_activation',
          time: now,
          months: months,
          note: 'Set to ' + months + ' months premium via manage-auth script'
        })
      } else {
        console.error('[ERROR] Unknown mode: ' + mode)
        return null
      }
      break
  }

  return auth
}

function applyMode(mode) {
  var data = readData()
  if (data === null) {
    console.error('[ERROR] Could not read data file: ' + DATA_FILE)
    process.exit(1)
  }

  var auth = buildAuthData(mode)
  if (!auth) {
    process.exit(1)
  }

  data[AUTH_KEY] = JSON.stringify(auth)

  if (auth.isActivated && (auth.isPermanent || (auth.expireAt && auth.expireAt > Date.now()))) {
    data[PREMIUM_KEY] = 'true'
  } else {
    delete data[PREMIUM_KEY]
  }

  if (!writeData(data)) {
    process.exit(1)
  }

  if (!setForceMode(mode)) {
    process.exit(1)
  }

  console.log('')
  console.log('=== Auth Data Updated ===')
  console.log('')

  switch (mode) {
    case 'standard':
      console.log('  Mode: Standard Version (Free)')
      console.log('  Effect: All premium features locked')
      console.log('  Source: ' + path.relative(process.cwd(), AUTH_STORE))
      break
    case 'permanent':
      console.log('  Mode: Permanent Activation')
      console.log('  Effect: Premium features unlocked forever')
      console.log('  Source: ' + path.relative(process.cwd(), AUTH_STORE))
      break
    case 'expire':
      console.log('  Mode: Expired (Soft-delete)')
      console.log('  Effect: Activation record exists but is expired')
      console.log('  Source: ' + path.relative(process.cwd(), AUTH_STORE))
      break
    default:
      if (mode.indexOf('months:') === 0) {
        var months = parseInt(mode.split(':')[1], 10)
        var expireDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
        console.log('  Mode: ' + months + ' Months Premium')
        console.log('  Expires: ' + formatDate(expireDate.getTime()))
        console.log('  Effect: Premium features unlocked for ' + months + ' months')
        console.log('  Source: ' + path.relative(process.cwd(), AUTH_STORE))
      }
      break
  }

  console.log('')
  showStatus()
}

function main() {
  var args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    usage()
    process.exit(0)
  }

  var mode = args[0]

  if (mode === 'show') {
    showStatus()
    return
  }

  if (mode === 'reset') {
    if (!setForceMode('reset')) {
      process.exit(1)
    }
    console.log('')
    console.log('=== Auth Reset ===')
    console.log('')
    console.log('  Mode: Normal (reading from device storage)')
    console.log('  Effect: FORCE_AUTH_MODE set to null, real auth data restored')
    console.log('  Source: ' + path.relative(process.cwd(), AUTH_STORE))
    console.log('')
    showStatus()
    return
  }

  var validModes = ['standard', 'permanent', 'expire']
  var isMonthsMode = mode.indexOf('months:') === 0

  if (validModes.indexOf(mode) === -1 && !isMonthsMode) {
    console.error('[ERROR] Unknown mode: ' + mode)
    console.error('Valid modes: standard, permanent, expire, reset, months:<N>')
    console.error('Run with --help for usage information.')
    process.exit(1)
  }

  applyMode(mode)
}

main()