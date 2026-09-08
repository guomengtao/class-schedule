# 手环9Pro 首页打不开 — 极简测试版本方案

## 目的

手环9Pro真机进入首页只显示左上角/黑屏，模拟器正常。通过逐级增加复杂度，定位是哪个环节导致渲染失败。

**策略**：从零开始，每版只加一个功能，发包给9Pro用户测试，找到首次出问题的版本。

---

## 版本规划总览

| 版本 | 内容 | 目的 |
|:--:|------|------|
| V1 | 纯 Hello World | 验证基础渲染是否正常 |
| V2 | 加强屏幕适配 | 验证 width/height:100% 是否生效 |
| V3 | 加设置入口 | 验证 router 跳转是否正常 |
| V4 | Debug 信息面板 | 显示设备信息，排查差异 |
| V5 | 逐步加回模块 | 定位哪个模块导致黑屏 |
| V6 | 完整首页 + Debug 浮层 | 最终版本，保留调试能力 |

---

## V1 — 纯 Hello World

**目标**：确认9Pro能渲染最简单的快应用页面，排除框架/打包问题。

```html
<template>
  <div style="width:100%; height:100%; flex-direction:column; justify-content:center; align-items:center; background-color:#1a1a2e;">
    <text style="font-size:48px; color:#ffffff; text-align:center;">Hello World</text>
  </div>
</template>

<script>
export default {
  onInit() {
    console.log("[test-v1] onInit")
  },
  onShow() {
    console.log("[test-v1] onShow")
  }
}
</script>

<style>
</style>
```

**验证点**：页面是否全屏显示白色 "Hello World" 文字居中，背景深蓝色。

---

## V2 — 加强屏幕适配 + "9 Pro"

**目标**：验证显式 width/height:100% + 方形屏适配是否正常。

```html
<template>
  <div id="root" class="root">
    <text class="title">9 Pro</text>
    <text class="subtitle">screen test</text>
  </div>
</template>

<script>
export default {
  onShow() {
    this.$forceUpdate()
  }
}
</script>

<style>
.root {
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #1a1a2e;
}

.title {
  font-size: 56px;
  color: #7ec8e3;
  text-align: center;
  font-weight: bold;
}

.subtitle {
  font-size: 20px;
  color: #888899;
  text-align: center;
  margin-top: 8px;
}

@media (shape: rect) {
  .title {
    font-size: 64px;
  }
  .subtitle {
    font-size: 24px;
  }
}
</style>
```

**验证点**：
- 页面是否全屏 "9 Pro" 大字居中
- 方形屏 (rect) 字体是否比圆形屏更大
- `$forceUpdate()` 是否正常执行

---

## V3 — 首页 + 设置入口

**目标**：验证 router 跳转在9Pro上是否正常。

```html
<template>
  <div id="root" class="root">
    <text class="title">9 Pro</text>
    <text class="subtitle">router test</text>
    <input class="btn" type="button" value="打开设置" onclick="openSettings" />
  </div>
</template>

<script>
import router from "@system.router"

export default {
  onShow() {
    this.$forceUpdate()
  },
  openSettings() {
    router.push({ uri: "/pages/settings" })
  }
}
</script>

<style>
.root {
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #1a1a2e;
}

.title {
  font-size: 48px;
  color: #7ec8e3;
  text-align: center;
  font-weight: bold;
}

.subtitle {
  font-size: 18px;
  color: #888899;
  text-align: center;
  margin-bottom: 20px;
}

.btn {
  width: 200px;
  height: 50px;
  font-size: 22px;
  text-align: center;
  border-radius: 12px;
  background-color: #7ec8e3;
  color: #1a1a2e;
}
</style>
```

**验证点**：
- 点击按钮能否跳转到设置页
- 设置页是否正常显示
- 从设置页返回首页是否正常

---

## V4 — Debug 信息面板

**目标**：显示设备信息，排查9Pro与其他设备的差异。如果页面崩溃，至少能看到错误信息。

```html
<template>
  <div id="root" class="root">
    <text class="title">Debug Panel</text>
    <div class="info-list">
      <div class="info-row">
        <text class="label">设备:</text>
        <text class="value">{{ deviceInfo.brand }} {{ deviceInfo.model }}</text>
      </div>
      <div class="info-row">
        <text class="label">屏幕:</text>
        <text class="value">{{ screenWidth }} × {{ screenHeight }}</text>
      </div>
      <div class="info-row">
        <text class="label">形状:</text>
        <text class="value">{{ screenShape }}</text>
      </div>
      <div class="info-row">
        <text class="label">DPR:</text>
        <text class="value">{{ devicePixelRatio }}</text>
      </div>
      <div class="info-row">
        <text class="label">平台:</text>
        <text class="value">{{ platformVersion }}</text>
      </div>
      <div class="info-row">
        <text class="label">状态:</text>
        <text class="value" style="color: {{ errorMsg ? '#ff4444' : '#44ff44' }}">{{ errorMsg || 'OK' }}</text>
      </div>
    </div>
    <input class="btn" type="button" value="打开设置" onclick="openSettings" />
    <text class="hint">如果页面只显示左上角，请截图反馈</text>
  </div>
</template>

<script>
import router from "@system.router"
import device from "@system.device"

export default {
  private: {
    deviceInfo: { brand: "?", model: "?" },
    screenWidth: "?",
    screenHeight: "?",
    screenShape: "?",
    devicePixelRatio: "?",
    platformVersion: "?",
    errorMsg: ""
  },

  onInit() {
    var self = this
    try {
      device.getInfo({
        success: function(info) {
          self.deviceInfo = { brand: info.brand || "?", model: info.model || "?" }
          self.screenWidth = info.screenWidth || "?"
          self.screenHeight = info.screenHeight || "?"
          self.screenShape = info.screenShape || "?"
          self.devicePixelRatio = info.devicePixelRatio || "?"
          self.platformVersion = info.platformVersion || "?"
          console.log("[debug] device: " + JSON.stringify(info))
        },
        fail: function(err) {
          self.errorMsg = "device.getInfo failed: " + (err || "unknown")
          console.error("[debug] " + self.errorMsg)
        }
      })
    } catch (e) {
      self.errorMsg = "device.getInfo exception: " + (e.message || e)
      console.error("[debug] " + self.errorMsg)
    }
  },

  onShow() {
    this.$forceUpdate()
  },

  openSettings() {
    router.push({ uri: "/pages/settings" })
  }
}
</script>

<style>
.root {
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  background-color: #1a1a2e;
  padding: 20px 12px;
}

.title {
  font-size: 32px;
  color: #7ec8e3;
  font-weight: bold;
  margin-bottom: 16px;
  text-align: center;
}

.info-list {
  width: 100%;
  margin-bottom: 16px;
}

.info-row {
  flex-direction: row;
  padding: 6px 0;
}

.label {
  font-size: 18px;
  color: #888899;
  width: 80px;
}

.value {
  font-size: 18px;
  color: #ffffff;
  flex: 1;
}

.btn {
  width: 180px;
  height: 44px;
  font-size: 20px;
  text-align: center;
  border-radius: 10px;
  background-color: #7ec8e3;
  color: #1a1a2e;
  margin-bottom: 12px;
}

.hint {
  font-size: 14px;
  color: #ffaa00;
  text-align: center;
}
</style>
```

**验证点**：
- 能否看到设备信息（品牌、型号、分辨率、屏幕形状、平台版本）
- 如果 `device.getInfo` 失败，能看到红色错误信息
- 底部黄色提示文字是否可见

---

## V5 — 逐步加回真实模块

**目标**：在 V4 基础上，逐个加回 index 页面的真实模块，找到哪个模块导致渲染异常。

每加一个模块，发一个测试包：

| 子版本 | 加入模块 | 关键代码 |
|:--:|------|------|
| V5.1 | 主题 + 背景色 | `store.getTheme()` + `style="background-color: {{ theme.bg }}"` |
| V5.2 | 课程列表 | `class-list.js` 模块，显示当天课程 |
| V5.3 | 快速添加 | `quick-add.js` 模块 |
| V5.4 | 状态栏 | `status-bar.js` 模块 |
| V5.5 | 自定义内容 | `custom-content.js` 模块 |
| V5.6 | 置顶页面 | `pinned-pages.js` 模块 |
| V5.7 | 时钟 | `clock.js` 模块 |
| V5.8 | 底部按钮 | `bottom-buttons.js` 模块 |

**方法**：每个子版本在 V4 debug 面板基础上，加入一个模块，其余注释掉。如果某个版本开始黑屏，就是那个模块的问题。

---

## V6 — 完整首页 + Debug 浮层

**目标**：完整首页，顶部保留一个小型 debug 信息条，后续可随时排查。

```html
<template>
  <div id="schedule-page" class="schedule-page" style="background-color: {{ theme.bg }}">
    <!-- debug 信息条（发布前可隐藏） -->
    <div class="debug-bar" if="{{ showDebug }}">
      <text class="debug-text">{{ screenShape }} {{ screenWidth }}x{{ screenHeight }} {{ errorMsg || 'OK' }}</text>
    </div>
    <!-- 原有全部页面内容 -->
    <div class="clock-row" if="{{ showTime }}">
      ...
    </div>
    <!-- ... 其余内容 -->
  </div>
</template>
```

```css
.debug-bar {
  width: 100%;
  padding: 2px 6px;
  background-color: #333333;
}
.debug-text {
  font-size: 12px;
  color: #00ff00;
  lines: 1;
}
```

**验证点**：完整首页功能正常，顶部 debug 条显示设备信息。

---

## 测试流程

1. 每个版本单独打包，发到米坛给9Pro用户
2. 用户反馈截图 + 现象描述
3. 找到第一个正常 → 异常的版本，确认问题模块
4. 针对问题模块深入排查

## 发布计划

| 版本 | 文件名 | 说明 |
|------|------|------|
| V1 | `test-v1-hello.rpk` | 纯 Hello World |
| V2 | `test-v2-9pro.rpk` | 屏幕适配 |
| V3 | `test-v3-router.rpk` | 路由跳转 |
| V4 | `test-v4-debug.rpk` | Debug 信息面板 |
| V5.x | `test-v5.x.rpk` | 模块逐步加回 |
| V6 | `test-v6-full.rpk` | 完整版 + Debug 浮层 |