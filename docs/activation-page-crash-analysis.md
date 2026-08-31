# 软件授权页面崩溃原因分析

## 概述

`src/pages/activation/activation.ux`（软件授权页面）在 QuickApp 运行环境中无法打开，页面加载时崩溃，导致 `router.push` 静默失败。用户点击"去激活"按钮无任何反应。

## 关键问题

### 问题 1：默认 theme 缺少 `border` 和 `borderLight` 属性（已修复）

**严重程度：致命**

**位置：** `private.theme` 对象（第 261-269 行）

**错误代码：**

```javascript
theme: {
    bg: '#1a1a2e',
    card: '#16213e',
    cardLight: '#0f3460',
    accent: '#7ec8e3',
    text: '#ffffff',
    textSecondary: '#888899',
    textMuted: '#555566'
    // 缺少 border 和 borderLight！
}
```

**问题分析：**

模板中有 30 处引用 `{{ theme.border }}`（包括 18 个 cell 格子、12 个 keypad 按钮），但默认 theme 中没有定义 `border` 属性。

页面渲染流程：
1. 页面开始加载，使用默认 theme 进行初始渲染
2. 模板中 `border-color: {{ theme.border }}` → `theme.border` 为 `undefined`
3. 渲染引擎将其解析为 `border-color: ;`（空值）
4. QuickApp 严格模式将空 CSS 属性值视为错误，导致渲染中断
5. 页面崩溃，用户看到空白或闪退
6. `store.getTheme()` 异步回调还没执行，theme 没有机会被更新

**对比正常工作的 `activation-lab` 页面：**

```javascript
// activation-lab 有完整的默认 theme
var DEFAULT_THEME = {
    bg: '#1a1a2e',
    card: '#16213e',
    cardLight: '#0f3460',
    accent: '#7ec8e3',
    text: '#ffffff',
    textSecondary: '#888899',
    textMuted: '#555566',
    border: '#0f3460',      // ← 有！
    borderLight: '#2a2a5a'  // ← 有！
}
```

**修复代码：**

```javascript
theme: {
    bg: '#1a1a2e',
    card: '#16213e',
    cardLight: '#0f3460',
    accent: '#7ec8e3',
    text: '#ffffff',
    textSecondary: '#888899',
    textMuted: '#555566',
    border: '#0f3460',      // 新增
    borderLight: '#2a2a5a'  // 新增
}
```

---

### 问题 2：`<div>` 直接包含文本内容（已修复）

**严重程度：致命**

**位置：** 原第 41 行和第 69 行

**错误代码：**

```html
<!-- 第 41 行 -->
<div class="step-arrow" style="color: {{ theme.textMuted }}">▼</div>

<!-- 第 69 行 -->
<div class="step-arrow" style="color: {{ theme.textMuted }}">▼</div>
```

**问题分析：**

QuickApp 框架对 `div` 元素有严格的子元素限制：**`div` 不能直接包含文本内容**。所有文本内容必须使用 `<text>` 标签包裹。这是 QuickApp 不同于标准 HTML 的核心规则之一。

当 QuickApp 渲染引擎遇到 `<div>` 中包含裸文本时，会触发运行时错误，导致整个页面渲染失败。页面崩溃后，`router.push` 导航操作静默失败，用户看不到任何错误提示。

**修复代码：**

```html
<div class="step-arrow" style="color: {{ theme.textMuted }}"><text>▼</text></div>
```

**开发工具诊断：**

VS Code 的 QuickApp 插件会给出警告：

```
div unsupport text as child, replace as <text>▼</text>
```

但这是警告而非错误，不会阻止构建，容易在开发中被忽略。然而在运行时，QuickApp 会将其视为严重错误并终止页面渲染。

---

### 问题 2：`<qrcode>` 组件在手表/手环设备上的兼容性

**严重程度：潜在风险**

**位置：** 第 34 行和第 57 行

**代码：**

```html
<qrcode value="{{ afdianUrl }}" style="color: #000000; background-color: #ffffff; width: 140px; height: 140px;"></qrcode>

<qrcode value="{{ qrText }}" style="color: #000000; background-color: #ffffff; width: 140px; height: 140px;"></qrcode>
```

**问题分析：**

1. `<qrcode>` 是 QuickApp 的 canvas 组件，用于生成二维码
2. 本项目 `manifest.json` 的 `deviceTypeList` 为 `["watch", "band"]`，即手表和手环设备
3. `<qrcode>` 组件在低端手环设备上可能不被支持或渲染异常
4. 即使 `<qrcode>` 组件可用，140px × 140px 的二维码在手环 200px 左右的屏幕上占用空间过大
5. 页面中有两个二维码（爱发电链接 + 激活页面链接），进一步增加了渲染负担

**建议修复：**

- 在手环设备上隐藏二维码，仅显示文字链接
- 或使用 `if` 条件判断设备类型，手表显示二维码，手环仅显示文字

---

### 问题 3：`require("@system.device")` 动态加载

**严重程度：低风险**

**位置：** 第 358 行

**代码：**

```javascript
fetchDeviceId() {
    var self = this
    try {
      var device = require("@system.device")
      device.getDeviceId({
        success: function(data) {
          self.deviceId = data.deviceId || '未知'
          self.qrText = ACTIVATION_URL + self.deviceId
        },
        fail: function(data, code) {
          self.deviceId = '获取失败(' + code + ')'
          self.qrText = ACTIVATION_URL + 'unknown'
        }
      })
    } catch (e) {
      self.deviceId = '不可用'
      self.qrText = ACTIVATION_URL + 'demo'
    }
  }
```

**问题分析：**

1. `require("@system.device")` 在函数体内动态调用，而非模块顶层
2. QuickApp 使用 webpack 构建，webpack 将 `require` 视为同步模块加载
3. `@system.device` 已在 `manifest.json` 的 `features` 中声明，理论上可以正常加载
4. 已使用 try/catch 包裹，即使加载失败也不会导致页面崩溃
5. 但某些 QuickApp 版本中，函数体内的 `require` 可能导致构建警告或运行时延迟

**状态：** 当前有 try/catch 保护，影响较小，但建议将其移到模块顶层声明。

---

## 崩溃链路分析

```
用户点击"去激活"按钮
       ↓
router.push({ uri: "/pages/activation" })
       ↓
QuickApp 框架开始加载 activation.ux 页面
       ↓
解析模板，渲染 DOM 树
       ↓
遇到 <div>▼</div>  ← 文本内容未用 <text> 包裹
       ↓
QuickApp 渲染引擎抛出运行时错误
       ↓
页面渲染终止，页面崩溃
       ↓
router.push 静默失败，无任何错误提示
       ↓
用户看到：按钮点击无反应
```

## 为什么其他页面正常

| 页面 | 是否包含 `<div>` 裸文本 | 是否正常 |
|------|------------------------|---------|
| index（首页） | 否 | ✅ |
| settings（设置） | 否 | ✅ |
| activation（授权） | 是（2处） | ❌ |

## 修复总结

| 问题 | 严重程度 | 状态 |
|------|---------|------|
| 默认 theme 缺少 `border` 和 `borderLight` | 致命 | 已修复 |
| `<div>` 直接包含文本 `▼` | 致命 | 已修复 |
| `<qrcode>` 组件在手表/手环的兼容性 | 潜在风险 | 已替换为文字占位 |
| `require` 函数体内动态加载 | 低风险 | 已有 try/catch |

## 教训

1. **QuickApp 与标准 HTML 的差异**：`<div>` 不能包含裸文本，必须用 `<text>` 包裹
2. **重视 IDE 诊断警告**：`div unsupport text as child` 警告必须修复，不能忽略
3. **页面崩溃无提示**：QuickApp 中页面崩溃时不会向用户显示错误，开人员需要主动排查
4. **按钮无反应不等于按钮问题**：目标页面崩溃也会导致导航静默失败