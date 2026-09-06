/**
 * Test script for activation QR code URL scheme
 * Usage: node scripts/test-activation-url.js
 */

var BASE_URL = "https://app-auth.gudq.com/a"
var MAX_LEN = 200

var DEVICE_PROFILES = [
  {
    name: "Xiaomi Watch S4 (rect)",
    deviceId: "550e8400-e29b-41d4-a716-446655440000",
    model: "Watch S4",
    product: "vela_ws4",
    osVersionCode: 42,
    platformVersionCode: 10,
    deviceType: "watch",
    screenShape: "rect",
    screenWidth: 466,
    screenHeight: 466,
    APILevel: 12,
    language: "zh-CN"
  },
  {
    name: "Xiaomi Watch S3 (circle)",
    deviceId: "660e8400-e29b-41d4-a716-446655440001",
    model: "Watch S3",
    product: "vela_ws3",
    osVersionCode: 40,
    platformVersionCode: 8,
    deviceType: "watch",
    screenShape: "circle",
    screenWidth: 390,
    screenHeight: 390,
    APILevel: 10,
    language: "zh-CN"
  },
  {
    name: "Xiaomi Band 8 Pro (capsule)",
    deviceId: "770e8400-e29b-41d4-a716-446655440002",
    model: "Smart Band 8 Pro",
    product: "vela_band8pro",
    osVersionCode: 38,
    platformVersionCode: 7,
    deviceType: "band",
    screenShape: "pill-shaped",
    screenWidth: 336,
    screenHeight: 480,
    APILevel: 9,
    language: "en-US"
  },
  {
    name: "Long model name device",
    deviceId: "880e8400-e29b-41d4-a716-446655440003",
    model: "Xiaomi Watch S4 Ultra Pro Max Plus",
    product: "vela_ws4_ultra_pro_max_plus",
    osVersionCode: 99,
    platformVersionCode: 99,
    deviceType: "watch",
    screenShape: "rect",
    screenWidth: 999,
    screenHeight: 999,
    APILevel: 99,
    language: "en-GB-oxendict"
  },
  {
    name: "Minimal device (no optional fields)",
    deviceId: "990e8400-e29b-41d4-a716-446655440004",
    model: "",
    product: "",
    osVersionCode: null,
    platformVersionCode: null,
    deviceType: "",
    screenShape: "",
    screenWidth: null,
    screenHeight: null,
    APILevel: null,
    language: ""
  }
]

function buildUrl(profile, includeLanguage) {
  var params = []
  if (profile.deviceId) params.push("deviceId=" + encodeURIComponent(profile.deviceId))
  if (profile.model) params.push("m=" + encodeURIComponent(profile.model))
  if (profile.product) params.push("p=" + encodeURIComponent(profile.product))
  if (profile.osVersionCode != null) params.push("o=" + profile.osVersionCode)
  if (profile.platformVersionCode != null) params.push("v=" + profile.platformVersionCode)
  if (profile.deviceType) params.push("t=" + encodeURIComponent(profile.deviceType))
  if (profile.screenShape) params.push("s=" + encodeURIComponent(profile.screenShape))
  if (profile.screenWidth != null) params.push("w=" + profile.screenWidth)
  if (profile.screenHeight != null) params.push("h=" + profile.screenHeight)
  if (profile.APILevel != null) params.push("a=" + profile.APILevel)
  if (includeLanguage !== false && profile.language) params.push("l=" + encodeURIComponent(profile.language))
  return BASE_URL + "?" + params.join("&")
}

function buildOldUrl(deviceId) {
  return "https://app-auth.gudq.com/activate.html?deviceId=" + encodeURIComponent(deviceId)
}

function parseUrl(url) {
  var qIndex = url.indexOf("?")
  if (qIndex === -1) return { base: url, params: {} }
  var base = url.substring(0, qIndex)
  var qs = url.substring(qIndex + 1)
  var result = { base: base, params: {} }
  var pairs = qs.split("&")
  for (var i = 0; i < pairs.length; i++) {
    var eq = pairs[i].indexOf("=")
    if (eq === -1) continue
    var key = pairs[i].substring(0, eq)
    var val = decodeURIComponent(pairs[i].substring(eq + 1))
    result.params[key] = val
  }
  return result
}

var COLOR_GREEN = "\x1b[32m"
var COLOR_RED = "\x1b[31m"
var COLOR_YELLOW = "\x1b[33m"
var COLOR_CYAN = "\x1b[36m"
var COLOR_RESET = "\x1b[0m"
var COLOR_BOLD = "\x1b[1m"

var passed = 0
var failed = 0

function check(condition, label) {
  if (condition) {
    console.log("  " + COLOR_GREEN + "✓" + COLOR_RESET + " " + label)
    passed++
  } else {
    console.log("  " + COLOR_RED + "✗" + COLOR_RESET + " " + label)
    failed++
  }
}

function section(title) {
  console.log("")
  console.log(COLOR_BOLD + COLOR_CYAN + "━━━ " + title + " ━━━" + COLOR_RESET)
}

function info(label, value) {
  console.log("  " + COLOR_YELLOW + label + ":" + COLOR_RESET + " " + value)
}

// ============================================================
// TEST SUITE
// ============================================================

console.log(COLOR_BOLD + "\n╔══════════════════════════════════════╗")
console.log("║  Activation URL Scheme Test Suite   ║")
console.log("╚══════════════════════════════════════╝" + COLOR_RESET)

// --- Test 1: URL generation ---
section("Test 1: URL generation with original parameter names")

for (var i = 0; i < DEVICE_PROFILES.length; i++) {
  var p = DEVICE_PROFILES[i]
  var url = buildUrl(p)
  var len = url.length
  console.log("")
  console.log("  " + COLOR_CYAN + p.name + COLOR_RESET)
  info("URL", url)
  info("Length", len + " chars")
  check(url.indexOf("deviceId=") !== -1, "deviceId param present")
  check(url.indexOf("m=") !== -1 || p.model === "", "model param handled")
  info("", "")
}

// --- Test 2: Old format only ---
section("Test 2: Old format (deviceId only)")

var oldUrl = buildOldUrl(DEVICE_PROFILES[0].deviceId)
info("Old URL", oldUrl)
info("Length", oldUrl.length)
check(oldUrl.indexOf("deviceId=") !== -1, "old format uses deviceId param")
check(oldUrl.indexOf("activate.html") !== -1, "old format uses activate.html path")

// --- Test 3: Without language ---
section("Test 3: Without language (omit zh-CN)")

var noLangUrl = buildUrl(DEVICE_PROFILES[0], false)
var withLangUrl = buildUrl(DEVICE_PROFILES[0], true)
info("With language", withLangUrl.length + " chars")
info("Without language", noLangUrl.length + " chars")
check(noLangUrl.length < withLangUrl.length, "URL is shorter without language")
check(noLangUrl.indexOf("l=") === -1, "no language param in URL")

// --- Test 4: Encoding ---
section("Test 4: Special character encoding")

var parsed = parseUrl(buildUrl(DEVICE_PROFILES[0]))
check(parsed.params.m === "Watch S4", "model 'Watch S4' decoded correctly (space preserved)")
check(parsed.params.s === "rect", "screenShape decoded correctly")
check(parsed.params.l === "zh-CN", "language decoded correctly (hyphen preserved)")

var enParsed = parseUrl(buildUrl(DEVICE_PROFILES[2]))
check(enParsed.params.l === "en-US", "language 'en-US' decoded correctly")

var longParsed = parseUrl(buildUrl(DEVICE_PROFILES[3]))
check(longParsed.params.m === "Xiaomi Watch S4 Ultra Pro Max Plus", "long model name encoded/decoded correctly")
check(longParsed.params.l === "en-GB-oxendict", "complex language tag decoded correctly")

// --- Test 5: Minimal device ---
section("Test 5: Minimal device (deviceId only scenario)")

var minUrl = buildUrl(DEVICE_PROFILES[4])
var minParsed = parseUrl(minUrl)
info("URL", minUrl)
info("Length", minUrl.length)
check(minParsed.params.deviceId === DEVICE_PROFILES[4].deviceId, "deviceId present")
check(minParsed.params.m === undefined, "model absent (empty string)")
check(minParsed.params.p === undefined, "product absent (empty string)")
check(minParsed.params.o === undefined, "osVersionCode absent (null)")
check(minParsed.params.l === undefined, "language absent (empty string)")

// --- Test 6: Capsule shape encoding ---
section("Test 6: Capsule (pill-shaped) screen shape encoding")

var capsuleUrl = buildUrl(DEVICE_PROFILES[2])
var capsuleParsed = parseUrl(capsuleUrl)
info("Shape param", capsuleParsed.params.s)
check(capsuleParsed.params.s === "pill-shaped", "pill-shaped preserved correctly")

// --- Test 7: All 11 params present ---
section("Test 7: All 11 params present in full URL")

var fullParsed = parseUrl(buildUrl(DEVICE_PROFILES[0]))
var expectedKeys = ["deviceId", "m", "p", "o", "v", "t", "s", "w", "h", "a", "l"]
for (var k = 0; k < expectedKeys.length; k++) {
  var key = expectedKeys[k]
  check(fullParsed.params[key] !== undefined, "param '" + key + "' present")
}

// --- Test 8: Numeric params are numbers ---
section("Test 8: Numeric param values")

check(fullParsed.params.o === "42", "osVersionCode = 42")
check(fullParsed.params.v === "10", "platformVersionCode = 10")
check(fullParsed.params.w === "466", "screenWidth = 466")
check(fullParsed.params.h === "466", "screenHeight = 466")
check(fullParsed.params.a === "12", "APILevel = 12")

// --- Test 9: URL length comparison ---
section("Test 9: Old vs new format length comparison")

info("Old format", oldUrl.length + " chars")
info("New format (full)", withLangUrl.length + " chars")
info("New format (no lang)", noLangUrl.length + " chars")
info("New format (minimal)", minUrl.length + " chars")
check(oldUrl.length < withLangUrl.length, "new format is longer than old (expected)")
check(withLangUrl.length <= 200, "new format ≤ 200 chars (single-letter params)")

// --- Test 10: URL with extremely long deviceId ---
section("Test 10: URL with extremely long deviceId")

var longId = "550e8400-e29b-41d4-a716-446655440000-extremely-long-device-id-that-exceeds-limit"
var longProfile = JSON.parse(JSON.stringify(DEVICE_PROFILES[0]))
longProfile.deviceId = longId
var longUrl = buildUrl(longProfile)
info("URL length with long deviceId", longUrl.length)
check(longUrl.length > 180, "URL grows with long deviceId (expected)")
check(longUrl.indexOf(encodeURIComponent(longId)) !== -1, "long deviceId properly encoded in URL")

// ============================================================
// SUMMARY
// ============================================================

section("RESULTS")

console.log("")
console.log("  " + COLOR_GREEN + "Passed: " + passed + COLOR_RESET)
if (failed > 0) {
  console.log("  " + COLOR_RED + "Failed: " + failed + COLOR_RESET)
} else {
  console.log("  " + COLOR_GREEN + "Failed: 0" + COLOR_RESET)
}
console.log("")

if (failed > 0) {
  console.log(COLOR_RED + "  ⚠  SOME TESTS FAILED" + COLOR_RESET)
  process.exit(1)
} else {
  console.log(COLOR_GREEN + "  ✅  ALL TESTS PASSED" + COLOR_RESET)
  process.exit(0)
}