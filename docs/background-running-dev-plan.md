# 后台运行测试页面 - 开发方案

## 概述

在设置页增加"后台运行"入口，点击进入后台运行测试页面。用户可以开启/关闭后台运行功能，开启后提供多个 Demo 倒计时（5秒、15秒、1分钟、5分钟等），倒计时结束后通过震动提醒上课，方便用户快速验证后台运行是否正常工作。

参考 Xiaomi Vela JS 应用后台运行官方文档实现。

---

## 后台运行原理

Xiaomi Vela 应用中，应用切换到后台后通常会被系统停止以节省资源。但通过声明后台运行接口并在后台持续执行，可以让应用在后台继续运行。

### 工作条件

1. `manifest.json` 中声明了后台运行接口（`config.background.features`）
2. 当前至少有一个已声明的后台运行接口正在运行

### 支持的后台运行接口

| 接口 | 说明 |
|------|------|
| `system.audio` | 音频播放，适合音乐类应用 |
| `system.request` | 上传下载，适合网络请求类应用 |
| `system.geolocation` | 地理位置，适合运动轨迹类应用 |

### 实践建议

- 后台运行消耗较多系统资源，需审慎使用
- 后台运行接口的导入和后台执行的工作放到 `app.ux` 中，而非页面中，避免页面切换和销毁的影响
- 上线审核时会审核后台运行需求是否合理

---

## 页面结构

```
settings (设置)
├── 新增: "后台运行"行 → 跳转至 background-running 页面
│
background-running (后台运行) ← 新建页面
├── header: 返回按钮 + 标题 "后台运行"
├── section: 开关控制区
│   ├── 后台运行开关 (ON/OFF toggle)
│   └── 状态提示文字（当前是否已开启后台运行）
├── section: Demo 倒计时区（仅开关开启后显示）
│   ├── 5秒后提醒
│   ├── 15秒后提醒
│   ├── 30秒后提醒
│   ├── 1分钟后提醒
│   └── 5分钟后提醒
├── section: 倒计时进度显示
│   └── 当前正在运行的倒计时及剩余时间
└── section: 使用说明
    ├── 开启后台运行后，点击任一 Demo 按钮
    ├── 按返回键退到后台
    ├── 等待倒计时结束
    └── 手环/手表将震动提醒上课
```

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/background-running/background-running.ux` | **新建** | 后台运行测试页面 |
| `src/pages/settings/settings.ux` | 修改 | 添加"后台运行"入口行 |
| `src/manifest.json` | 修改 | 注册路由 + 声明后台运行接口 |
| `src/app.ux` | 修改 | 添加后台运行核心逻辑 |
| `src/data/store.js` | 修改 | 新增后台运行开关状态存储 |

---

## 配置方法

### manifest.json 变更

```json
{
  "config": {
    "logLevel": "log",
    "designWidth": "device-width",
    "background": {
      "features": [
        "system.request"
      ]
    }
  }
}
```

> 选择 `system.request` 作为后台运行接口，因为课程表应用不需要播放在线音频（system.audio）或持续定位（system.geolocation）。通过周期性网络心跳请求来维持后台运行最为合适。

### 路由注册

```json
"pages/background-running": {
  "component": "background-running"
}
```

---

## 页面设计

### 整体布局

```
┌──────────────────────────────┐
│  ◀ 返回      后台运行         │  ← header
├──────────────────────────────┤
│                              │
│  ┌─ 后台运行控制 ────────────┐ │
│  │  后台运行        [ON]    │ │  ← toggle 开关
│  │  状态: 已开启             │ │  ← 状态文字
│  └──────────────────────────┘ │
│                              │
│  ┌─ Demo 倒计时 ────────────┐ │  ← 开关开启后可见
│  │  [▶ 5秒后提醒]           │ │
│  │  [▶ 15秒后提醒]          │ │
│  │  [▶ 30秒后提醒]          │ │
│  │  [▶ 1分钟后提醒]          │ │
│  │  [▶ 5分钟后提醒]          │ │
│  └──────────────────────────┘ │
│                              │
│  ┌─ 当前倒计时 ──────────────┐ │  ← 有倒计时时显示
│  │  将在 23 秒后震动提醒     │ │
│  │  [■ 取消倒计时]          │ │
│  └──────────────────────────┘ │
│                              │
│  ┌─ 使用说明 ───────────────┐ │
│  │  1. 开启后台运行开关      │ │
│  │  2. 点击 Demo 倒计时按钮  │ │
│  │  3. 按返回键退到后台      │ │
│  │  4. 等待倒计时结束        │ │
│  │  5. 手环将震动提醒上课    │ │
│  └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
```

### 配色方案

遵循项目主题变量系统，使用 `{{ theme.xxx }}` 动态绑定：

| 元素 | 样式变量 |
|------|------|
| 页面背景 | `{{ theme.bg }}` |
| 卡片背景 | `{{ theme.card }}` |
| 主文字 | `{{ theme.text }}` |
| 次要文字 | `{{ theme.textSecondary }}` |
| 弱化文字 | `{{ theme.textMuted }}` |
| 强调色（按钮/开关ON） | `{{ theme.accent }}` |
| 边框色（开关OFF） | `{{ theme.border }}` |
| 删除按钮背景 | `{{ theme.deleteBg }}` |
| 删除按钮文字 | `{{ theme.deleteText }}` |

---

## 数据流

```
用户操作流程:
                                    
  进入页面 → 读取后台运行开关状态
      │
      ├── 开关 OFF → 显示关闭状态，隐藏 Demo 区域
      │
      └── 开关 ON  → 显示开启状态，展示 Demo 按钮
            │
            用户点击 Demo 按钮 (如 "5秒后提醒")
            │
            ▼
        设置定时器 + 存储倒计时信息到 storage
            │
            ├── 用户停留在页面 → 页面内倒计时，到时间震动
            │
            └── 用户退到后台 → app.ux 中的后台逻辑接管
                  │
                  ▼
               system.request 心跳维持后台运行
                  │
                  ▼
               定时器触发 → 震动提醒 → 清除倒计时
```

### 核心数据存储

```
storage key: "background_running_config"
value: {
  enabled: true/false,       // 后台运行开关
  activeCountdown: {         // 当前活跃的倒计时
    demoName: "5秒后提醒",
    targetTime: 1693200000000,  // 目标时间戳
    duration: 5000
  }
}
```

---

## 详细设计

### 步骤 1: 修改 manifest.json

**文件**: [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json)

1. 在 `config` 中添加 `background.features` 配置
2. 在 `router.pages` 中注册 `pages/background-running` 路由

### 步骤 2: 修改 app.ux — 后台运行核心逻辑

**文件**: [app.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/app.ux)

按照 Xiaomi Vela 官方建议，后台运行的核心逻辑放在 `app.ux` 中，避免页面切换和销毁的影响。

```javascript
import request from '@system.request'
import vibrator from '@system.vibrator'
const storage = require('./data/store.js')

var heartbeatTimer = null
var countdownCheckTimer = null

export default {
  onCreate() {
    // ... existing init code ...
    this.initBackgroundRunning()
  },

  initBackgroundRunning() {
    var self = this
    storage.getBackgroundRunningConfig(function(config) {
      if (config && config.enabled) {
        self.startBackgroundHeartbeat()
        self.checkActiveCountdown(config)
      }
    })
  },

  startBackgroundHeartbeat() {
    var self = this
    // 周期性网络请求保持后台运行
    heartbeatTimer = setInterval(function() {
      request.download({
        url: 'https://www.example.com/heartbeat',
        success: function() {
          console.log('[BACKGROUND] heartbeat ok')
        },
        fail: function() {
          console.log('[BACKGROUND] heartbeat fail (expected)')
        }
      })
    }, 30000) // 每30秒一次心跳
  },

  stopBackgroundHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  },

  checkActiveCountdown(config) {
    // ... check if there's an active countdown and trigger vibration ...
  },

  onDestroy() {
    this.stopBackgroundHeartbeat()
  }
}
```

> **注意**: 心跳 URL 应替换为实际可用的健康检查端点。如果网络不可达，`request` 失败不影响后台运行维持（只要 `system.request` 接口被调用即可）。

### 步骤 3: 扩展 store.js 存储方法

**文件**: [store.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/store.js)

新增后台运行相关存储方法：

```javascript
// 保存后台运行配置
setBackgroundRunningConfig: function(config, callback) {
  storage.set({
    key: 'background_running_config',
    value: JSON.stringify(config),
    success: callback,
    fail: function() {
      console.warn('[STORE] save background config fail')
    }
  })
},

// 读取后台运行配置
getBackgroundRunningConfig: function(callback) {
  storage.get({
    key: 'background_running_config',
    success: function(data) {
      if (data) {
        callback(JSON.parse(data))
      } else {
        callback({ enabled: false, activeCountdown: null })
      }
    },
    fail: function() {
      callback({ enabled: false, activeCountdown: null })
    }
  })
}
```

### 步骤 4: 创建后台运行测试页面

**文件**: `src/pages/background-running/background-running.ux`（新建）

#### 4.1 模板结构

```html
<template>
  <div class="page" style="background-color: {{ theme.bg }}">
    <!-- 返回头部 -->
    <div class="back-header">
      <input class="back-btn" type="button" value="◀ 返回" onclick="goBack"
        style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="header-title" style="color: {{ theme.text }}">后台运行</text>
    </div>

    <!-- 开关控制区 -->
    <div class="section" style="background-color: {{ theme.card }}">
      <text class="section-title" style="color: {{ theme.text }}">后台运行控制</text>
      <div class="toggle-row">
        <text class="toggle-label" style="color: {{ theme.text }}">后台运行</text>
        <input class="toggle-btn" type="button"
          value="{{ backgroundEnabled ? 'ON' : 'OFF' }}"
          onclick="toggleBackground"
          style="background-color: {{ backgroundEnabled ? theme.accent : theme.border }};
                 color: {{ backgroundEnabled ? theme.bg : theme.textSecondary }}" />
      </div>
      <text class="status-text" style="color: {{ backgroundEnabled ? theme.accent : theme.textMuted }}">
        {{ backgroundEnabled ? '状态: 已开启' : '状态: 已关闭' }}
      </text>
      <text class="hint-text" style="color: {{ theme.textMuted }}">
        {{ backgroundEnabled ? '应用退到后台后将继续运行' : '开启后应用可在后台保持运行' }}
      </text>
    </div>

    <!-- Demo 倒计时区 (开关开启后显示) -->
    <div class="section" if="{{ backgroundEnabled }}" style="background-color: {{ theme.card }}">
      <text class="section-title" style="color: {{ theme.text }}">Demo 倒计时</text>
      <text class="hint-text" style="color: {{ theme.textMuted }}">点击按钮后返回桌面，到时间会自动震动提醒</text>
      <div class="demo-grid">
        <input class="demo-btn" type="button" value="▶ 5秒后提醒"
          onclick="startDemo(5, '5秒后提醒')"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
        <input class="demo-btn" type="button" value="▶ 15秒后提醒"
          onclick="startDemo(15, '15秒后提醒')"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
        <input class="demo-btn" type="button" value="▶ 30秒后提醒"
          onclick="startDemo(30, '30秒后提醒')"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
        <input class="demo-btn" type="button" value="▶ 1分钟后提醒"
          onclick="startDemo(60, '1分钟后提醒')"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
        <input class="demo-btn" type="button" value="▶ 5分钟后提醒"
          onclick="startDemo(300, '5分钟后提醒')"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
      </div>
    </div>

    <!-- 当前倒计时状态 -->
    <div class="section" if="{{ activeCountdown }}" style="background-color: {{ theme.card }}">
      <text class="section-title" style="color: {{ theme.text }}">当前倒计时</text>
      <text class="countdown-text" style="color: {{ theme.accent }}">
        {{ activeCountdown.name }} - 将在 {{ remainingSeconds }} 秒后震动提醒
      </text>
      <input class="cancel-btn" type="button" value="■ 取消倒计时"
        onclick="cancelCountdown"
        style="background-color: {{ theme.deleteBg }}; color: {{ theme.deleteText }}" />
    </div>

    <!-- 使用说明 -->
    <div class="section" style="background-color: {{ theme.card }}">
      <text class="section-title" style="color: {{ theme.text }}">使用说明</text>
      <div class="instruction-list">
        <text class="instruction-item" style="color: {{ theme.textSecondary }}">1. 开启"后台运行"开关</text>
        <text class="instruction-item" style="color: {{ theme.textSecondary }}">2. 点击任一 Demo 倒计时按钮</text>
        <text class="instruction-item" style="color: {{ theme.textSecondary }}">3. 按返回键退到桌面/后台</text>
        <text class="instruction-item" style="color: {{ theme.textSecondary }}">4. 等待倒计时结束</text>
        <text class="instruction-item" style="color: {{ theme.textSecondary }}">5. 手环/手表将震动提醒上课</text>
      </div>
    </div>

    <!-- 注意事项 -->
    <div class="section" style="background-color: {{ theme.card }}">
      <text class="section-title" style="color: {{ theme.text }}">注意事项</text>
      <div class="instruction-list">
        <text class="instruction-item" style="color: {{ theme.textMuted }}">• 后台运行会消耗更多电量</text>
        <text class="instruction-item" style="color: {{ theme.textMuted }}">• 此功能用于测试后台运行是否正常</text>
        <text class="instruction-item" style="color: {{ theme.textMuted }}">• 正式上课提醒请在设置中配置</text>
        <text class="instruction-item" style="color: {{ theme.textMuted }}">• 部分设备可能不支持后台运行</text>
      </div>
    </div>
  </div>
</template>
```

#### 4.2 脚本逻辑

```javascript
import router from '@system.router'
import vibrator from '@system.vibrator'
const store = require('../../data/store.js')

var countdownTimer = null
var tickTimer = null

export default {
  private: {
    theme: {},
    backgroundEnabled: false,
    activeCountdown: null,
    remainingSeconds: 0
  },

  onInit() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })
    this.loadConfig()
  },

  onDestroy() {
    this.clearAllTimers()
  },

  loadConfig() {
    var self = this
    store.getBackgroundRunningConfig(function(config) {
      self.backgroundEnabled = config.enabled
      if (config.activeCountdown) {
        var now = Date.now()
        var remaining = Math.max(0, Math.ceil((config.activeCountdown.targetTime - now) / 1000))
        if (remaining > 0) {
          self.activeCountdown = config.activeCountdown
          self.remainingSeconds = remaining
          self.startTickTimer()
          self.startCountdownTimer(remaining)
        } else {
          // 倒计时已过期，清除
          self.saveConfig(false, null)
        }
      }
    })
  },

  toggleBackground() {
    this.backgroundEnabled = !this.backgroundEnabled
    if (!this.backgroundEnabled) {
      this.cancelCountdown()
    }
    this.saveConfig(this.backgroundEnabled, this.activeCountdown)
  },

  startDemo(seconds, name) {
    var self = this
    // 如果已有倒计时，先取消
    if (this.activeCountdown) {
      this.cancelCountdownSilent()
    }

    var targetTime = Date.now() + seconds * 1000
    var countdown = {
      name: name,
      targetTime: targetTime,
      duration: seconds * 1000
    }

    this.activeCountdown = countdown
    this.remainingSeconds = seconds
    this.saveConfig(this.backgroundEnabled, countdown)

    // 启动倒计时
    this.startTickTimer()
    this.startCountdownTimer(seconds)
  },

  startCountdownTimer(seconds) {
    var self = this
    countdownTimer = setTimeout(function() {
      self.triggerVibration()
      self.clearCountdown()
    }, seconds * 1000)
  },

  startTickTimer() {
    var self = this
    tickTimer = setInterval(function() {
      if (self.remainingSeconds > 0) {
        self.remainingSeconds = self.remainingSeconds - 1
      }
      if (self.remainingSeconds <= 0) {
        clearInterval(tickTimer)
        tickTimer = null
      }
    }, 1000)
  },

  triggerVibration() {
    // 震动提醒上课
    if (vibrator) {
      try {
        vibrator.vibrate({ mode: 'long' })
        // 延迟再震一次，增强提醒效果
        setTimeout(function() {
          vibrator.vibrate({ mode: 'long' })
        }, 500)
      } catch (e) {
        console.warn('[BACKGROUND] vibrate fail: ' + e)
      }
    }
  },

  cancelCountdown() {
    this.clearCountdown()
    this.saveConfig(this.backgroundEnabled, null)
  },

  cancelCountdownSilent() {
    this.clearCountdown()
  },

  clearCountdown() {
    this.activeCountdown = null
    this.remainingSeconds = 0
    this.clearAllTimers()
  },

  clearAllTimers() {
    if (countdownTimer) {
      clearTimeout(countdownTimer)
      countdownTimer = null
    }
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  },

  saveConfig(enabled, countdown) {
    store.setBackgroundRunningConfig({
      enabled: enabled,
      activeCountdown: countdown
    })
  },

  goBack() {
    router.back()
  }
}
```

#### 4.3 样式

```css
.page {
  flex-direction: column;
  padding: 16px;
  min-height: 100%;
}

.back-header {
  flex-direction: row;
  align-items: center;
  margin-bottom: 16px;
}

.back-btn {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 20px;
  margin-right: 12px;
}

.header-title {
  font-size: 28px;
  font-weight: bold;
}

.section {
  flex-direction: column;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 12px;
}

.toggle-row {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.toggle-label {
  font-size: 24px;
}

.toggle-btn {
  padding: 8px 24px;
  border-radius: 16px;
  font-size: 20px;
  font-weight: bold;
}

.status-text {
  font-size: 18px;
  margin-bottom: 4px;
}

.hint-text {
  font-size: 16px;
  line-height: 1.4;
}

.demo-grid {
  flex-direction: column;
  margin-top: 8px;
}

.demo-btn {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 20px;
  margin-bottom: 8px;
  text-align: center;
}

.countdown-text {
  font-size: 20px;
  margin-bottom: 12px;
  text-align: center;
}

.cancel-btn {
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 18px;
  text-align: center;
}

.instruction-list {
  flex-direction: column;
}

.instruction-item {
  font-size: 17px;
  line-height: 1.8;
}
```

### 步骤 5: 在设置页添加入口

**文件**: [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux)

在设置页面的设备信息等入口行附近，添加后台运行入口：

```html
<div class="info-section" onclick="openBackgroundRunning" style="background-color: {{ theme.card }}">
  <text class="info-label" style="color: {{ theme.text }}">后台运行</text>
  <div class="info-value-row">
    <text class="info-placeholder" style="color: {{ theme.textMuted }}">测试后台运行功能</text>
    <text class="info-arrow" style="color: {{ theme.textMuted }}">›</text>
  </div>
</div>
```

```javascript
openBackgroundRunning() {
  router.push({ uri: '/pages/background-running' })
}
```

---

## 实现步骤

| 步骤 | 文件 | 操作 | 说明 |
|:---:|------|:---:|------|
| 1 | `src/manifest.json` | 修改 | 添加 `config.background.features` 和路由注册 |
| 2 | `src/app.ux` | 修改 | 添加后台心跳和倒计时检查逻辑 |
| 3 | `src/data/store.js` | 修改 | 新增后台运行配置存取方法 |
| 4 | `src/pages/background-running/background-running.ux` | **新建** | 后台运行测试页面 |
| 5 | `src/pages/settings/settings.ux` | 修改 | 添加"后台运行"入口行 |

---

## 测试验证

### 测试场景

| 场景 | 操作 | 预期结果 |
|------|------|------|
| 开启后台运行 | 点击开关 ON | 显示 Demo 按钮区域，状态显示"已开启" |
| 关闭后台运行 | 点击开关 OFF | 隐藏 Demo 按钮区域，取消当前倒计时 |
| 5秒 Demo | 点击"5秒后提醒"，返回桌面 | 5秒后手环震动提醒 |
| 15秒 Demo | 点击"15秒后提醒"，留在页面 | 15秒后震动，页面倒计时归零 |
| 1分钟 Demo | 点击"1分钟后提醒"，返回桌面 | 1分钟后震动提醒 |
| 取消倒计时 | 点击"取消倒计时" | 倒计时取消，不会震动 |
| 页面返回 | 倒计时中按返回 | 倒计时继续在后台运行 |
| 开关持久化 | 关闭页面重新进入 | 开关状态和倒计时状态保持 |

### 兼容性说明

- `system.request` 后台运行接口需要设备支持 Xiaomi Vela 后台运行机制
- 部分设备可能不支持后台运行，需在测试中验证
- `vibrator.vibrate` 在大部分小米穿戴设备上可用（S1 Pro / 手环 8 Pro / 手环 9/9 Pro 等）
- 如果 `vibrator.start/stop` 可用（仅 Watch S5），可使用更丰富的震动模式