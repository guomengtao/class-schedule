var THEMES = [
  {
    key: "blue",
    name: "深空蓝",
    bg: "#1a1a2e",
    card: "#16213e",
    accent: "#7ec8e3"
  },
  {
    key: "green",
    name: "翡翠绿",
    bg: "#1a2e1a",
    card: "#1a3a1a",
    accent: "#7ec8a0"
  },
  {
    key: "red",
    name: "珊瑚红",
    bg: "#2e1a1a",
    card: "#3a1a1a",
    accent: "#e08080"
  }
]

function init(instance) {
  instance.themeList = THEMES
  instance.currentTheme = THEMES[0]
  instance.themeBg = THEMES[0].bg
  instance.themeCard = THEMES[0].card
  instance.themeAccent = THEMES[0].accent
}

function switchTheme(instance, key) {
  for (var i = 0; i < THEMES.length; i++) {
    if (THEMES[i].key === key) {
      instance.currentTheme = THEMES[i]
      instance.themeBg = THEMES[i].bg
      instance.themeCard = THEMES[i].card
      instance.themeAccent = THEMES[i].accent
      return
    }
  }
}

export default {
  init: init,
  switchTheme: switchTheme
}