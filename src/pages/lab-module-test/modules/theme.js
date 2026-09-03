var themes = [
  {
    key: "dark",
    name: "暗夜",
    bg: "#1a1a2e",
    card: "#16213e",
    accent: "#7ec8e3",
    text: "#ffffff",
    textSecondary: "#888899",
    textMuted: "#555566"
  },
  {
    key: "ocean",
    name: "海洋",
    bg: "#0a1628",
    card: "#0d2137",
    accent: "#00d4ff",
    text: "#e0f0ff",
    textSecondary: "#6a9ab5",
    textMuted: "#3a5a75"
  },
  {
    key: "sunset",
    name: "日落",
    bg: "#1e1520",
    card: "#2a1a2a",
    accent: "#ff6b6b",
    text: "#ffe0e0",
    textSecondary: "#996666",
    textMuted: "#664444"
  },
  {
    key: "forest",
    name: "森林",
    bg: "#0d1a0d",
    card: "#152a15",
    accent: "#4ecb71",
    text: "#e0ffe0",
    textSecondary: "#558855",
    textMuted: "#335533"
  },
  {
    key: "purple",
    name: "紫霞",
    bg: "#1a1530",
    card: "#221d40",
    accent: "#b388ff",
    text: "#f0e0ff",
    textSecondary: "#8877aa",
    textMuted: "#554466"
  }
]

function init(instance) {
  var saved = getSavedTheme()
  var current = themes.find(function(t) {
    return t.key === saved
  }) || themes[0]

  instance.themeList = themes
  instance.currentTheme = current
  instance.themeBg = current.bg
  instance.themeCard = current.card
  instance.themeAccent = current.accent
  instance.themeText = current.text
  instance.themeTextSecondary = current.textSecondary
  instance.themeTextMuted = current.textMuted
}

function getSavedTheme() {
  var storage = require("@system.storage")
  return storage.getSync("lab_theme") || "dark"
}

function switchTheme(instance, key) {
  var theme = themes.find(function(t) {
    return t.key === key
  })
  if (!theme) return

  instance.currentTheme = theme
  instance.themeBg = theme.bg
  instance.themeCard = theme.card
  instance.themeAccent = theme.accent
  instance.themeText = theme.text
  instance.themeTextSecondary = theme.textSecondary
  instance.themeTextMuted = theme.textMuted

  var storage = require("@system.storage")
  storage.setSync("lab_theme", key)
}

export default {
  init: init,
  switchTheme: switchTheme
}