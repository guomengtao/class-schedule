function safeParseJSON(str, fallback) {
  if (str === undefined || str === null || str === "") {
    return fallback !== undefined ? fallback : null
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    console.error("[safeParseJSON] parse failed: " + (e.message || e) + ", input: " + String(str).substring(0, 80))
    return fallback !== undefined ? fallback : null
  }
}

module.exports = {
  safeParseJSON: safeParseJSON
}