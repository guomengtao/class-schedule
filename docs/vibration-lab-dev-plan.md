# 震动自定义设置 - 开发方案

## 概述

在设置页增加"震动自定义"入口，点击进入震动实验室页面。用户可以自由调节震动参数（持续时间、间隔、次数），实时预览震动效果，打造属于自己的震动模式，并支持保存/加载自定义方案。

---

## 页面结构

```
settings (设置)
├── 新增: "震动自定义"行 → 跳转至 vibration-lab 页面
│
vibration-lab (震动实验室) ← 新建页面
├── header: 返回按钮 + 标题
├── hero: 当前预设方案名称 + 一键试听按钮
├── section: 参数调节区
│   ├── 震动强度 (duration) — 滑块 50ms ~ 2000ms
│   ├── 间隔时间 (interval) — 滑块 50ms ~ 2000ms
│   └── 震动次数 (count) — 步进 1 ~ 20 次
├── section: 快捷预设
│   ├── 短震 / 长震 / 双短震 / 三连震 / SOS
│   └── 点击即可加载参数 + 试听
├── section: 动作按钮
│   ├── ▶ 试听当前设置
│   ├── ■ 停止震动
│   ├── 💾 保存为方案
│   └── 📋 加载已保存方案
└── section: 已保存方案列表
    └── 点击加载 / 左滑删除
```

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/vibration-lab/vibration-lab.ux` | **新建** | 震动实验室页面 |
| `src/pages/settings/settings.ux` | 修改 | 添加"震动自定义"入口行 |
| `src/manifest.json` | 修改 | 注册 vibration-lab 路由 |
| `src/data/store.js` | 修改 | 新增震动方案存储方法 |

---

## API 参考

### 导入模块

```javascript
import vibrator from '@system.vibrator'
```

### vibrator.vibrate(OBJECT) — 单次振动

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| mode | String | 否 | "long" 长振动 / "short" 短振动，默认 long |

```javascript
vibrator.vibrate({ mode: 'long' })
```

### vibrator.start(OBJECT) — 连续振动序列

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| duration | Number | 是 | 振动持续时间 (ms) |
| interval | Number | 是 | 振动间隔时间 (ms) |
| count | Number | 是 | 振动次数 |
| success | Function | 否 | 成功回调，返回 `{ id: Number }` |
| fail | Function | 否 | 失败回调，错误码 205(任务已存在) / 202(参数错误) |

```javascript
vibrator.start({
  duration: 1000,
  interval: 1000,
  count: 10,
  success: function(data) {
    console.log('start success, id = ' + data.id)
  },
  fail: function(data, code) {
    console.log('start fail, code = ' + code)
  }
})
```

### vibrator.stop(Number) — 停止振动

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| id | Number | 是 | 振动任务 ID |

```javascript
vibrator.stop(1)  // 返回 true/false
```

### vibrator.getSystemDefaultMode() — 获取系统默认模式

**返回值:** `0` 关闭 / `1` 标准 / `2` 加强

### 设备支持明细

| 接口 | 支持设备 |
|------|------|
| `vibrate` | 小米 S1 Pro / 手环 8 Pro / 手环 9/9 Pro / Redmi Watch 4 / Watch H1 / Watch S3 / 手环 10 / Watch S4 / REDMI Watch 5/6 / Watch S5 |
| `start` | **仅 Xiaomi Watch S5** |
| `stop` | **仅 Xiaomi Watch S5** |
| `getSystemDefaultMode` | **仅 Xiaomi Watch S5** |

> **重要**：`start`/`stop` 仅 Watch S5 支持，其他设备只能用 `vibrate`。需要在代码中做兼容处理，设备不支持时降级为 `vibrate` 循环模拟。

---

## 实施步骤

### 步骤 1：注册路由

**文件**: [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json)

在 `router.pages` 中添加：

```json
"pages/vibration-lab": {
  "component": "vibration-lab"
}
```

> `system.vibrator` 已在 `features` 中声明，无需重复添加。

### 步骤 2：在设置页添加入口

**文件**: [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux)

在设备信息行下方添加：

```html
<div class="info-section" onclick="openVibrationLab" style="background-color: {{ theme.card }}">
  <text class="info-label" style="color: {{ theme.text }}">震动自定义</text>
  <div class="info-value-row">
    <text class="info-placeholder" style="color: {{ theme.textMuted }}">自定义震动效果</text>
    <text class="info-arrow" style="color: {{ theme.textMuted }}">›</text>
  </div>
</div>
```

```javascript
openVibrationLab() {
  router.push({ uri: "/pages/vibration-lab" })
}
```

### 步骤 3：扩展 store.js 存储方法

**文件**: [store.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/store.js)

新增震动方案存储：

```javascript
// 保存自定义震动方案
setVibrationPresets: function(presets, callback) {
  storage.set({
    key: "vibration_presets",
    value: JSON.stringify(presets),
    success: callback,
    fail: function() { console.warn("[STORE] save vibration presets fail") }
  })
},

// 读取自定义震动方案
getVibrationPresets: function(callback) {
  storage.get({
    key: "vibration_presets",
    success: function(data) {
      if (data) {
        callback(JSON.parse(data))
      } else {
        callback([])
      }
    },
    fail: function() { callback([]) }
  })
}
```

### 步骤 4：创建震动实验室页面

**文件**: [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux)（新建）

#### 4.1 页面结构

```
┌──────────────────────────────┐
│  ◀ 返回      震动实验室       │
├──────────────────────────────┤
│      ┌──────────────────┐    │
│      │     📳            │    │
│      │   标准震动         │    │
│      │   [▶ 试听]        │    │
│      └──────────────────┘    │
│                              │
│  震动强度 (ms)               │
│  ───●───────────────── 500   │
│  50                     2000 │
│                              │
│  间隔时间 (ms)               │
│  ────────●───────────── 800  │
│  50                     2000 │
│                              │
│  震动次数                    │
│   [−]     5     [+]          │
│                              │
│  快捷方案                    │
│  ┌──────┐┌──────┐┌──────┐   │
│  │ 短震 ││ 长震 ││双短震│   │
│  └──────┘└──────┘└──────┘   │
│  ┌──────┐┌──────┐           │
│  │三连震││ SOS  │           │
│  └──────┘└──────┘           │
│                              │
│  [▶ 试听当前]  [■ 停止]      │
│  [💾 保存方案] [📋 我的方案]  │
└──────────────────────────────┘
```

#### 4.2 快捷预设参数

| 预设 | duration | interval | count | 效果描述 |
|------|:--------:|:--------:|:-----:|------|
| 短震 | 100 | 0 | 1 | 轻点一下 |
| 长震 | 800 | 0 | 1 | 持续震动 |
| 双短震 | 100 | 200 | 2 | 轻点两下 |
| 三连震 | 100 | 200 | 3 | 连续三下 |
| SOS | 200 | 200 | 3 | 三短 (SOS风格) |

#### 4.3 核心逻辑

```javascript
<script>
import router from "@system.router"
import vibrator from "@system.vibrator"
const store = require("../../data/store.js")

var presetMap = {
  short:       { label: "短震",   duration: 100,  interval: 200, count: 1 },
  long:        { label: "长震",   duration: 800,  interval: 200, count: 1 },
  doubleShort: { label: "双短震", duration: 100,  interval: 200, count: 2 },
  tripleShort: { label: "三连震", duration: 100,  interval: 200, count: 3 },
  sos:         { label: "SOS",    duration: 200,  interval: 200, count: 3 }
}

var currentTaskId = 0

export default {
  private: {
    theme: {},
    duration: 500,
    interval: 800,
    count: 5,
    currentPreset: "标准震动",
    savedPresets: [],
    isPlaying: false
  },

  onInit() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })
    this.loadPresets()
  },

  loadPresets() {
    var self = this
    store.getVibrationPresets(function(presets) {
      self.savedPresets = presets
    })
  },

  applyPreset(key) {
    var p = presetMap[key]
    if (!p) return
    this.duration = p.duration
    this.interval = p.interval
    this.count = p.count
    this.currentPreset = p.label
    this.preview()
  },

  preview() {
    this.stopVibration()
    var self = this
    vibrator.start({
      duration: self.duration,
      interval: self.interval,
      count: self.count,
      success: function(data) {
        currentTaskId = data.id
        self.isPlaying = true
      },
      fail: function(data, code) {
        console.warn("vibrator.start fail, code=" + code)
        self.fallbackVibrate()
      }
    })
  },

  fallbackVibrate() {
    // start/stop not supported, use vibrate loop
    var self = this
    var i = 0
    function loop() {
      if (i >= self.count) return
      vibrator.vibrate({ mode: self.duration > 300 ? "long" : "short" })
      i++
      if (i < self.count) {
        setTimeout(loop, self.interval + self.duration)
      }
    }
    loop()
  },

  stopVibration() {
    if (currentTaskId) {
      vibrator.stop(currentTaskId)
      currentTaskId = 0
    }
    this.isPlaying = false
  },

  savePreset() {
    var name = "方案" + (this.savedPresets.length + 1)
    var preset = {
      name: name,
      duration: this.duration,
      interval: this.interval,
      count: this.count
    }
    this.savedPresets.push(preset)
    store.setVibrationPresets(this.savedPresets)
  },

  loadPreset(idx) {
    var p = this.savedPresets[idx]
    if (!p) return
    this.duration = p.duration
    this.interval = p.interval
    this.count = p.count
    this.currentPreset = p.name
    this.preview()
  },

  goBack() {
    this.stopVibration()
    router.back()
  }
}
</script>
```

---

## 兼容策略

由于 `start`/`stop` 仅 Xiaomi Watch S5 支持，需要做降级处理：

```
调用 preview()
  │
  ├── vibrator.start() 成功
  │   └── 使用 start/stop 控制（S5）
  │
  └── vibrator.start() 失败 (code=202)
      └── fallbackVibrate()
          └── 使用 vibrate() + setTimeout 循环模拟
              （适用于所有设备）
```

---

## 数据流

```
settings.ux                    vibration-lab.ux
    │                                │
    ├─ 点击"震动自定义" ──────────────►│
    │                                │
    │                          onInit() → store.getTheme()
    │                          loadPresets() → store.getVibrationPresets()
    │                                │
    │                     ┌──────────┼──────────┐
    │                     │          │          │
    │               调节参数    快捷预设    保存/加载方案
    │                     │          │          │
    │                     └──────────┼──────────┘
    │                                │
    │                          preview()
    │                                │
    │                     ┌──────────┴──────────┐
    │                     │                     │
    │              start() 成功           start() 失败
    │              (Watch S5)            (其他设备)
    │                     │                     │
    │              stop() 停止          fallbackVibrate()
    │                                  vibrate() 循环
    │
    │                     savePreset()
    │                          │
    │                     store.setVibrationPresets()
    │                          │
    │                     storage.set("vibration_presets")
```

---

## 开发量预估

| 维度 | 评估 |
|------|------|
| 新建文件 | 1 个 (`vibration-lab.ux`) |
| 修改文件 | 3 个 (`settings.ux`, `manifest.json`, `store.js`) |
| 代码量 | 约 280 行 |
| 实现难度 | ⭐⭐⭐☆☆ |
| 第三方依赖 | 无（仅 Xiaomi Vela 系统 API） |
| 兼容性 | 需处理 `start`/`stop` 降级逻辑 |