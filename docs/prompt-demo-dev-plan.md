# 弹窗 Demo 演示页面 - 开发方案

## 概述

在设置页增加"弹窗演示"入口，点击进入弹窗 Demo 页面。用户可以体验 Xiaomi Vela JS 系统提供的各种弹窗类型（Toast），了解每种弹窗的样式和参数效果，方便开发调试和功能演示。

---

## 页面结构

```
settings (设置)
├── 新增: "弹窗演示"行 → 跳转至 prompt-demo 页面
│
prompt-demo (弹窗演示) ← 新建页面
├── header: 返回按钮 + 标题 "弹窗演示"
├── section: Toast 提示
│   ├── 演示按钮: "显示默认 Toast" → 默认 1500ms
│   ├── 演示按钮: "显示短 Toast" → 1000ms
│   ├── 演示按钮: "显示长 Toast" → 3000ms
│   └── 演示按钮: "显示超长 Toast" → 5000ms
├── section: 自定义 Toast
│   ├── 文本框: 输入自定义消息内容
│   ├── 时长选择: 1500ms / 2000ms / 3000ms / 5000ms
│   └── 演示按钮: "显示自定义 Toast"
└── section: 快捷演示
    ├── "操作成功"
    ├── "保存成功"
    ├── "删除成功"
    ├── "网络错误"
    ├── "请稍后再试"
    └── "数据已同步"
```

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/prompt-demo/prompt-demo.ux` | **新建** | 弹窗演示页面 |
| `src/pages/settings/settings.ux` | 修改 | 添加"弹窗演示"入口行 |
| `src/manifest.json` | 修改 | 注册 prompt-demo 路由 |

---

## API 参考

### 导入模块

```javascript
import prompt from '@system.prompt'
// 或
const prompt = require('@system.prompt')
```

### prompt.showToast(OBJECT) — 显示 Toast 提示

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| message | String | 是 | 显示的文本信息 |
| duration | Number | 否 | 显示持续时间，单位 ms，默认值 1500，建议区间：1500-10000 |

#### 示例

```javascript
prompt.showToast({
  message: 'Message Info',
  duration: 2000
})
```

#### 注意事项

- `system.prompt` 已在 `manifest.json` 的 `features` 中声明
- Toast 为轻量级提示，自动消失，无需手动关闭
- duration 建议在 1500-10000ms 之间
- Toast 同一时间只显示一个，后调用的会覆盖前面的

---

## 页面设计

### 整体布局

```
┌──────────────────────────────┐
│  ◀ 返回      弹窗演示         │  ← header
├──────────────────────────────┤
│                              │
│  ┌─ Toast 基础演示 ─────────┐ │
│  │  [ 显示默认 Toast ]      │ │  ← 默认 1500ms
│  │  [ 显示短 Toast ]        │ │  ← 1000ms
│  │  [ 显示长 Toast ]        │ │  ← 3000ms
│  │  [ 显示超长 Toast ]      │ │  ← 5000ms
│  └──────────────────────────┘ │
│                              │
│  ┌─ 自定义 Toast ───────────┐ │
│  │  消息内容: [__________]  │ │  ← 输入框
│  │  显示时长:               │ │
│  │  [1500ms] [2000ms]      │ │  ← 时长选择按钮
│  │  [3000ms] [5000ms]      │ │
│  │  [ 显示自定义 Toast ]    │ │  ← 触发按钮
│  └──────────────────────────┘ │
│                              │
│  ┌─ 快捷演示 ───────────────┐ │
│  │  [ 操作成功 ] [ 保存成功 ]│ │
│  │  [ 删除成功 ] [ 网络错误 ]│ │
│  │  [ 请稍后再试 ]          │ │
│  │  [ 数据已同步 ]          │ │
│  └──────────────────────────┘ │
│                              │
└──────────────────────────────┘
```

### 配色方案

遵循设置页面的主题变量系统，使用 `{{ theme.xxx }}` 动态绑定：

| 元素 | 样式变量 |
|------|------|
| 页面背景 | `{{ theme.bg }}` |
| 卡片背景 | `{{ theme.card }}` |
| 主文字 | `{{ theme.text }}` |
| 次要文字 | `{{ theme.textSecondary }}` |
| 弱化文字 | `{{ theme.textMuted }}` |
| 强调色（按钮） | `{{ theme.accent }}` |
| 边框色 | `{{ theme.border }}` |

---

## 数据流

```
用户点击演示按钮
    │
    ▼
prompt-demo 页面方法
    │
    ├── showDefaultToast()     → prompt.showToast({ message: '这是一条默认 Toast 提示', duration: 1500 })
    ├── showShortToast()       → prompt.showToast({ message: '短 Toast 提示', duration: 1000 })
    ├── showLongToast()        → prompt.showToast({ message: '长 Toast 提示', duration: 3000 })
    ├── showExtraLongToast()   → prompt.showToast({ message: '超长 Toast 提示', duration: 5000 })
    ├── showCustomToast()      → prompt.showToast({ message: 用户输入内容, duration: 选择时长 })
    └── showQuickToast(text)   → prompt.showToast({ message: text, duration: 2000 })
```

---

## 实现步骤

### Step 1: 新建页面文件

创建 `src/pages/prompt-demo/prompt-demo.ux`，包含完整的 template、script、style 三部分。

#### 模板结构

```html
<template>
  <div class="prompt-demo-page" style="background-color: {{ theme.bg }}">
    <!-- 返回头部 -->
    <div class="back-header">
      <input class="back-btn" type="button" value="◀ 返回" onclick="goBack"
        style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="header-title" style="color: {{ theme.text }}">弹窗演示</text>
    </div>

    <!-- Toast 基础演示 -->
    <div class="demo-section" style="background-color: {{ theme.card }}">
      <text class="section-label" style="color: {{ theme.text }}">Toast 基础演示</text>
      <div class="btn-grid">
        <input class="demo-btn" type="button" value="显示默认 Toast" onclick="showDefaultToast"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
        <input class="demo-btn" type="button" value="显示短 Toast" onclick="showShortToast"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
        <input class="demo-btn" type="button" value="显示长 Toast" onclick="showLongToast"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
        <input class="demo-btn" type="button" value="显示超长 Toast" onclick="showExtraLongToast"
          style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
      </div>
    </div>

    <!-- 自定义 Toast -->
    <div class="demo-section" style="background-color: {{ theme.card }}">
      <text class="section-label" style="color: {{ theme.text }}">自定义 Toast</text>
      <div class="custom-row">
        <text class="custom-label" style="color: {{ theme.textSecondary }}">消息内容</text>
        <input class="text-input" type="text" value="{{ customMessage }}" onchange="onMessageChange"
          placeholder="输入自定义消息..."
          style="background-color: {{ theme.bg }}; color: {{ theme.text }}; border-color: {{ theme.border }}" />
      </div>
      <text class="custom-label" style="color: {{ theme.textSecondary }}">显示时长</text>
      <div class="duration-grid">
        <input class="duration-btn {{ selectedDuration === 1500 ? 'active' : '' }}" type="button"
          value="1500ms" onclick="selectDuration(1500)"
          style="background-color: {{ selectedDuration === 1500 ? theme.accent : theme.border }}; color: {{ selectedDuration === 1500 ? theme.bg : theme.textSecondary }}" />
        <input class="duration-btn {{ selectedDuration === 2000 ? 'active' : '' }}" type="button"
          value="2000ms" onclick="selectDuration(2000)"
          style="background-color: {{ selectedDuration === 2000 ? theme.accent : theme.border }}; color: {{ selectedDuration === 2000 ? theme.bg : theme.textSecondary }}" />
        <input class="duration-btn {{ selectedDuration === 3000 ? 'active' : '' }}" type="button"
          value="3000ms" onclick="selectDuration(3000)"
          style="background-color: {{ selectedDuration === 3000 ? theme.accent : theme.border }}; color: {{ selectedDuration === 3000 ? theme.bg : theme.textSecondary }}" />
        <input class="duration-btn {{ selectedDuration === 5000 ? 'active' : '' }}" type="button"
          value="5000ms" onclick="selectDuration(5000)"
          style="background-color: {{ selectedDuration === 5000 ? theme.accent : theme.border }}; color: {{ selectedDuration === 5000 ? theme.bg : theme.textSecondary }}" />
      </div>
      <input class="demo-btn full-width" type="button" value="显示自定义 Toast" onclick="showCustomToast"
        style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
    </div>

    <!-- 快捷演示 -->
    <div class="demo-section" style="background-color: {{ theme.card }}">
      <text class="section-label" style="color: {{ theme.text }}">快捷演示</text>
      <div class="quick-grid">
        <input class="quick-btn" type="button" value="操作成功" onclick="showQuickToast(0)"
          style="background-color: {{ theme.card }}; color: {{ theme.text }}; border-color: {{ theme.border }}" />
        <input class="quick-btn" type="button" value="保存成功" onclick="showQuickToast(1)"
          style="background-color: {{ theme.card }}; color: {{ theme.text }}; border-color: {{ theme.border }}" />
        <input class="quick-btn" type="button" value="删除成功" onclick="showQuickToast(2)"
          style="background-color: {{ theme.card }}; color: {{ theme.text }}; border-color: {{ theme.border }}" />
        <input class="quick-btn" type="button" value="网络错误" onclick="showQuickToast(3)"
          style="background-color: {{ theme.card }}; color: {{ theme.text }}; border-color: {{ theme.border }}" />
        <input class="quick-btn" type="button" value="请稍后再试" onclick="showQuickToast(4)"
          style="background-color: {{ theme.card }}; color: {{ theme.text }}; border-color: {{ theme.border }}" />
        <input class="quick-btn" type="button" value="数据已同步" onclick="showQuickToast(5)"
          style="background-color: {{ theme.card }}; color: {{ theme.text }}; border-color: {{ theme.border }}" />
      </div>
    </div>
  </div>
</template>
```

#### 脚本逻辑

```javascript
<script>
import router from "@system.router"
import prompt from "@system.prompt"
const store = require("../../data/store.js")

var QUICK_MESSAGES = [
  "操作成功",
  "保存成功",
  "删除成功",
  "网络错误，请检查网络连接",
  "请稍后再试",
  "数据已同步"
]

export default {
  private: {
    theme: {},
    customMessage: "这是一条自定义消息",
    selectedDuration: 2000
  },

  onInit() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })
  },

  goBack() {
    router.back()
  },

  onMessageChange(evt) {
    if (evt && evt.value !== undefined) {
      this.customMessage = evt.value
    }
  },

  selectDuration(duration) {
    this.selectedDuration = duration
  },

  showDefaultToast() {
    prompt.showToast({
      message: "这是一条默认 Toast 提示（1500ms）",
      duration: 1500
    })
  },

  showShortToast() {
    prompt.showToast({
      message: "短 Toast 提示（1000ms）",
      duration: 1000
    })
  },

  showLongToast() {
    prompt.showToast({
      message: "长 Toast 提示（3000ms）",
      duration: 3000
    })
  },

  showExtraLongToast() {
    prompt.showToast({
      message: "超长 Toast 提示（5000ms）",
      duration: 5000
    })
  },

  showCustomToast() {
    var msg = this.customMessage || "未输入消息"
    prompt.showToast({
      message: msg,
      duration: this.selectedDuration
    })
  },

  showQuickToast(index) {
    var msg = QUICK_MESSAGES[index] || "未知消息"
    prompt.showToast({
      message: msg,
      duration: 2000
    })
  }
}
</script>
```

#### 样式

```css
<style>
.prompt-demo-page {
  flex-direction: column;
  padding: 8px;
  min-height: 100%;
}

.back-header {
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
  padding: 6px 0;
}

.back-btn {
  width: 70px;
  height: 36px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  margin-left: 8px;
}

.demo-section {
  flex-direction: column;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}

.section-label {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
}

.btn-grid {
  flex-direction: column;
}

.demo-btn {
  height: 40px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  margin-bottom: 8px;
}

.full-width {
  width: 100%;
}

.custom-row {
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
}

.custom-label {
  font-size: 13px;
  width: 70px;
}

.text-input {
  flex: 1;
  height: 36px;
  border-radius: 6px;
  border-width: 1px;
  padding: 0 8px;
  font-size: 13px;
}

.duration-grid {
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 10px;
  margin-top: 6px;
}

.duration-btn {
  width: 70px;
  height: 32px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  margin-right: 6px;
  margin-bottom: 6px;
}

.quick-grid {
  flex-direction: row;
  flex-wrap: wrap;
}

.quick-btn {
  height: 36px;
  border-radius: 8px;
  border-width: 1px;
  font-size: 13px;
  text-align: center;
  padding: 0 12px;
  margin-right: 6px;
  margin-bottom: 6px;
}
</style>
```

### Step 2: 注册路由

在 `src/manifest.json` 的 `router.pages` 中添加：

```json
"pages/prompt-demo": {
  "component": "prompt-demo"
}
```

### Step 3: 在设置页添加入口

在 `src/pages/settings/settings.ux` 中，于 `openQrcodeGenerator` 方法附近添加：

**模板部分**（在二维码入口行之后添加）：

```html
<div class="info-section" onclick="openPromptDemo" style="background-color: {{ theme.card }}">
  <text class="info-label" style="color: {{ theme.text }}">弹窗演示</text>
  <div class="info-value-row">
    <text class="info-placeholder" style="color: {{ theme.textMuted }}">Toast 弹窗效果体验</text>
    <text class="info-arrow" style="color: {{ theme.textMuted }}">›</text>
  </div>
</div>
```

**脚本部分**（添加导航方法）：

```javascript
openPromptDemo() {
  router.push({ uri: "/pages/prompt-demo" })
},
```

---

## 功能清单

| 功能 | 说明 | 触发方式 |
|------|------|------|
| 默认 Toast | 显示 1500ms 默认 Toast | 点击按钮 |
| 短 Toast | 显示 1000ms 短 Toast | 点击按钮 |
| 长 Toast | 显示 3000ms 长 Toast | 点击按钮 |
| 超长 Toast | 显示 5000ms 超长 Toast | 点击按钮 |
| 自定义 Toast | 用户输入内容 + 选择时长 | 输入文字 → 选择时长 → 点击按钮 |
| 快捷演示 | 6 种常用场景消息一键演示 | 点击快捷按钮 |

---

## 依赖检查

| 依赖 | 状态 | 说明 |
|------|:---:|------|
| `system.prompt` | ✅ 已声明 | `manifest.json` features 中已包含 |
| `system.router` | ✅ 已声明 | 页面跳转 |
| `data/store.js` | ✅ 已有 | 读取主题配置 |

---

## 注意事项

1. **Toast 互斥**：同一时间只能显示一个 Toast，后调用的会覆盖前面的
2. **duration 范围**：建议在 1500-10000ms 之间，超出范围可能被系统截断
3. **无需手动关闭**：Toast 自动消失，不需要调用任何关闭方法
4. **主题适配**：页面使用 `store.getTheme()` 获取当前主题，保持与设置页一致的配色风格
5. **输入框样式**：使用 Vela JS 支持的 `input type="text"` 组件，绑定 `onchange` 事件获取输入值
6. **CSS 兼容性**：避免使用伪类选择器（如 `:last-child`），Vela JS 编译时不支持