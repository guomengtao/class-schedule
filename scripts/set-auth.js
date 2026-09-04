#!/usr/bin/env node

var fs = require("fs")
var path = require("path")

var AUTH_KEY = "auth_data"
var PREMIUM_KEY = "premium_unlocked"
var USED_CODES_KEY = "used_codes"
var USED_REDEEM_KEY = "used_redeem"
var MASTER_USAGE_KEY = "master_usage"

function now() {
  return Date.now()
}

function formatDate(date) {
  var d = date || new Date()
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1)
  if (m.length < 2) m = "0" + m
  var day = String(d.getDate())
  if (day.length < 2) day = "0" + day
  var h = String(d.getHours())
  if (h.length < 2) h = "0" + h
  var min = String(d.getMinutes())
  if (min.length < 2) min = "0" + min
  return y + "-" + m + "-" + day + " " + h + ":" + min
}

function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000
}

function addHistoryEntry(data, type, duration, codeType, status, activationCode) {
  if (!data.history) data.history = []
  data.history.unshift({
    id: String(now()),
    timestamp: now(),
    date: formatDate(),
    type: type,
    duration: duration,
    codeType: codeType,
    status: status,
    activationCode: activationCode || "",
    redeemCode: ""
  })
  if (data.history.length > 50) {
    data.history = data.history.slice(0, 50)
  }
}

function showHelp() {
  console.log("")
  console.log("usage: node scripts/set-auth.js <mode> [options]")
  console.log("")
  console.log("modes:")
  console.log("  standard           set to standard (no premium)")
  console.log("  permanent          set to permanent activation")
  console.log("  months <N>          set to N months premium (e.g. months 3)")
  console.log("  days <N>            set to N days premium (e.g. days 30)")
  console.log("  expired            set to expired premium")
  console.log("  trial              reset to trial (7 days, not activated)")
  console.log("  clear-codes        clear all used activation codes")
  console.log("  clear-redeem       clear all used redeem codes")
  console.log("  clear-all          clear all auth data (fresh start)")
  console.log("  show               show current auth data")
  console.log("")
  console.log("options:")
  console.log("  --device-id <id>   set device id (default: Aa09)")
  console.log("  --product-id <id>  set product id (default: 0001)")
  console.log("  --output <file>    write JSON to file instead of stdout")
  console.log("")
  console.log("examples:")
  console.log("  node scripts/set-auth.js permanent")
  console.log("  node scripts/set-auth.js months 6")
  console.log("  node scripts/set-auth.js standard")
  console.log("  node scripts/set-auth.js days 30 --device-id Bb19")
  console.log("")
}

function buildStandardData(deviceId, productId) {
  return {
    installTime: now(),
    isActivated: false,
    isPermanent: false,
    expireAt: null,
    activatedAt: null,
    lastRemindDate: "",
    remindEnabled: true,
    trialDays: 7,
    productId: productId,
    deviceId: deviceId,
    history: []
  }
}

function buildPermanentData(deviceId, productId) {
  var data = {
    installTime: now() - daysToMs(30),
    isActivated: true,
    isPermanent: true,
    expireAt: null,
    activatedAt: now(),
    lastRemindDate: "",
    remindEnabled: true,
    trialDays: 7,
    productId: productId,
    deviceId: deviceId,
    history: []
  }
  addHistoryEntry(data, "activate", "permanent", "permanent", "success", "SCRIPT-PERMANENT")
  return data
}

function buildMonthsData(months, deviceId, productId) {
  var days = months * 30
  var expireAt = now() + daysToMs(days)
  var data = {
    installTime: now() - daysToMs(30),
    isActivated: true,
    isPermanent: false,
    expireAt: expireAt,
    activatedAt: now(),
    lastRemindDate: "",
    remindEnabled: true,
    trialDays: 7,
    productId: productId,
    deviceId: deviceId,
    history: []
  }
  addHistoryEntry(data, "activate", days + "d", "standard", "success", "SCRIPT-" + months + "MONTHS")
  return data
}

function buildDaysData(days, deviceId, productId) {
  var expireAt = now() + daysToMs(days)
  var data = {
    installTime: now() - daysToMs(30),
    isActivated: true,
    isPermanent: false,
    expireAt: expireAt,
    activatedAt: now(),
    lastRemindDate: "",
    remindEnabled: true,
    trialDays: 7,
    productId: productId,
    deviceId: deviceId,
    history: []
  }
  addHistoryEntry(data, "activate", days + "d", "standard", "success", "SCRIPT-" + days + "DAYS")
  return data
}

function buildExpiredData(deviceId, productId) {
  var expiredDays = 3
  var expireAt = now() - daysToMs(expiredDays)
  var data = {
    installTime: now() - daysToMs(60),
    isActivated: true,
    isPermanent: false,
    expireAt: expireAt,
    activatedAt: now() - daysToMs(33),
    lastRemindDate: "",
    remindEnabled: true,
    trialDays: 7,
    productId: productId,
    deviceId: deviceId,
    history: []
  }
  addHistoryEntry(data, "activate", "30d", "standard", "success", "SCRIPT-EXPIRED")
  return data
}

function buildTrialData(deviceId, productId) {
  return {
    installTime: now(),
    isActivated: false,
    isPermanent: false,
    expireAt: null,
    activatedAt: null,
    lastRemindDate: "",
    remindEnabled: true,
    trialDays: 7,
    productId: productId,
    deviceId: deviceId,
    history: []
  }
}

function generateOutput(authData, premiumData) {
  var output = {
    _description: "Auth data for Quick App @system.storage",
    _instructions: "Apply these keys manually using the Auth Setter page or storage-viewer",
    _generatedAt: formatDate(),
    keys: {}
  }

  if (authData) {
    output.keys[AUTH_KEY] = JSON.stringify(authData)
  }
  if (premiumData !== undefined) {
    output.keys[PREMIUM_KEY] = premiumData
  }
  output.keys[USED_CODES_KEY] = "[]"
  output.keys[USED_REDEEM_KEY] = "[]"
  output.keys[MASTER_USAGE_KEY] = "[]"

  return output
}

function printSummary(authData) {
  console.log("")
  console.log("auth data  summary:")
  console.log("  isActivated: " + authData.isActivated)
  console.log("  isPermanent: " + authData.isPermanent)
  if (authData.isPermanent) {
    console.log("  expireAt:    permanent")
  } else if (authData.expireAt) {
    var remaining = Math.ceil((authData.expireAt - now()) / daysToMs(1))
    console.log("  expireAt:    " + formatDate(new Date(authData.expireAt)) + " (" + remaining + "d remaining)")
  } else {
    console.log("  expireAt:    none")
  }
  console.log("  deviceId:    " + (authData.deviceId || "none"))
  console.log("  productId:   " + (authData.productId || "0001"))
  console.log("  history:     " + (authData.history ? authData.history.length + " entries" : "0 entries"))
  console.log("")
}

function main() {
  var args = process.argv.slice(2)
  var mode = args[0]

  var deviceId = "Aa09"
  var productId = "0001"
  var outputFile = null

  for (var i = 0; i < args.length; i++) {
    if (args[i] === "--device-id" && args[i + 1]) {
      deviceId = args[i + 1]
    }
    if (args[i] === "--product-id" && args[i + 1]) {
      productId = args[i + 1]
    }
    if (args[i] === "--output" && args[i + 1]) {
      outputFile = args[i + 1]
    }
  }

  if (!mode || mode === "help" || mode === "--help" || mode === "-h") {
    showHelp()
    return
  }

  var authData = null
  var premiumData = undefined

  switch (mode) {
    case "standard":
      authData = buildStandardData(deviceId, productId)
      premiumData = "false"
      console.log("set to: standard")
      break

    case "permanent":
      authData = buildPermanentData(deviceId, productId)
      premiumData = "true"
      console.log("set to: permanent")
      break

    case "months":
      var months = parseInt(args[1], 10)
      if (!months || months < 1 || months > 9998) {
        console.error("error: months must be 1-9998")
        process.exit(1)
      }
      authData = buildMonthsData(months, deviceId, productId)
      premiumData = "true"
      console.log("set to: " + months + " months premium")
      break

    case "days":
      var days = parseInt(args[1], 10)
      if (!days || days < 1 || days > 9998) {
        console.error("error: days must be 1-9998")
        process.exit(1)
      }
      authData = buildDaysData(days, deviceId, productId)
      premiumData = "true"
      console.log("set to: " + days + " days premium")
      break

    case "expired":
      authData = buildExpiredData(deviceId, productId)
      premiumData = "false"
      console.log("set to: expired")
      break

    case "trial":
      authData = buildTrialData(deviceId, productId)
      premiumData = "false"
      console.log("set to: trial (7 days, not activated)")
      break

    case "clear-codes":
      authData = null
      console.log("cleared: used activation codes")
      break

    case "clear-redeem":
      authData = null
      console.log("cleared: used redeem codes")
      break

    case "clear-all":
      authData = null
      premiumData = "false"
      console.log("cleared: all auth data")
      break

    case "show":
      console.log("")
      console.log("cannot show data from script - use storage-viewer page in the app")
      console.log("")
      return

    default:
      console.error("unknown mode: " + mode)
      showHelp()
      process.exit(1)
  }

  var output = generateOutput(authData, premiumData)

  if (authData) {
    printSummary(authData)
  }

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), "utf-8")
    console.log("output written to: " + outputFile)
  } else {
    console.log("")
    console.log("=== JSON output ===")
    console.log(JSON.stringify(output, null, 2))
  }

  console.log("")
  console.log("to apply: use the Auth Setter page in the app to paste this JSON")
  console.log("")
}

main()