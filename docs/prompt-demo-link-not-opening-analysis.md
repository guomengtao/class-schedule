# 弹窗演示链接打不开 - 问题分析

## 概述

在设置页面点击"弹窗演示"入口后，页面无法正常打开，表现为无响应或黑屏。经过逐层排查，定位到根因是 **prompt-demo 页面使用了 Vela JS 框架不支持的 `input type="text"` 组件**，导致整个页面渲染失败。

---

## 排查过程

### 第一步：检查导航入口

检查 [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux) 中的入口代码：

```html
<div class="info-section" onclick="openPromptDemo" style="background-color: {{ theme.card }}">
  <text class="info-label" style="color: {{ theme.text }}">弹窗演示</text>
  <div class="info-value-row">
    <text class="info-placeholder" style="color: {{ theme.textMuted }}">Toast 弹窗效果体验</text>
    <text class="info-arrow" style="color: {{ theme.textMuted }}">›</text>
  </div>
</div>
```

- `onclick` 事件绑定正确
- 结构与其他可用入口（设备信息、震动自定义、文字转二维码）完全一致
- CSS 类 `.info-section` 样式正常

**结论：入口代码没有问题。**

### 第二步：检查导航方法

```javascript
openPromptDemo() {
  router.push({ uri: "/pages/prompt-demo" })
}
```

- `router.push` 调用正确
- 路径 `/pages/prompt-demo` 格式正确
- 与其他入口方法（`openDeviceInfo`、`openVibrationLab`、`openQrcodeGenerator`）完全一致

**结论：导航方法没有问题。**

### 第三步：检查路由注册

检查 [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json)：

```json
"router": {
  "pages": {
    "pages/prompt-demo": {
      "component": "prompt-demo"
    }
  }
}
```

- 页面路由已正确注册
- `system.prompt` 功能已声明在 `features` 中
- 编译产物 `build/pages/prompt-demo/prompt-demo.js` 正常生成
- RPK 包中包含 `pages/prompt-demo/prompt-demo.js` 文件

**结论：路由配置没有问题。**

### 第四步：检查页面代码

检查 [prompt-demo.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/prompt-demo/prompt-demo.ux) 的完整代码，发现关键问题：

```html
<!-- 问题代码 -->
<input class="text-input" type="text" value="{{ customMessage }}"
       onchange="onMessageChange" placeholder="输入自定义消息..." />
```

**这是整个项目中唯一使用 `input type="text"` 的地方。**

---

## 根因分析

### 问题：Vela JS 不支持 `input type="text"`

#### 证据

在整个项目的所有页面中搜索 `input` 元素使用情况：

| 页面 | 使用的 input 类型 |
|------|------------------|
| settings.ux | `type="button"` |
| index.ux | `type="button"` |
| detail.ux | `type="button"` |
| add-course.ux | `type="button"` |
| vibration-lab.ux | `type="button"` |
| qrcode-generator.ux | `type="button"` |
| device-info.ux | `type="button"` |
| chinese-input.ux | 无（使用自定义键盘组件） |
| nickname-edit.ux | 无（使用自定义键盘组件） |
| **prompt-demo.ux** | **`type="text"` ❌** |

Vela JS 框架的组件体系中，`input` 组件只支持 `type="button"`。文本输入功能需要通过框架提供的 `InputMethod` 自定义组件实现，而非直接使用 HTML 标准的 `input type="text"`。

#### 影响范围

```
用户点击"弹窗演示"
  → router.push("/pages/prompt-demo")  ✅ 导航成功
  → 框架开始渲染 prompt-demo 页面
  → 解析到 <input type="text" ... />  ❌ 不支持的组件类型
  → 页面渲染失败，显示黑屏/白屏
```

对于用户来说，点击链接后看到的是空白页面，表现就是"链接打不开"。

#### 为什么编译没报错

AIoT 构建工具（`aiot build`）在编译阶段不会对 `input` 的 `type` 属性值做校验，因为 `type` 在 HTML 标准中是合法的属性。框架在运行时才会尝试渲染组件，此时发现 `type="text"` 不受支持，导致渲染失败。

---

## 修复方案

### 核心思路

将所有 `input type="text"` 替换为框架支持的 `input type="button"`，用预设按钮列表替代文本输入框。

### 修复前 vs 修复后

**修复前：**
```html
<!-- 文本输入框 → 运行时崩溃 -->
<input class="text-input" type="text" value="{{ customMessage }}"
       onchange="onMessageChange" placeholder="输入自定义消息..." />

<!-- 自定义 Toast 按钮 -->
<input type="button" value="显示自定义 Toast" onclick="showCustomToast" />
```

```javascript
// 依赖文本输入框的值
showCustomToast() {
  var msg = this.customMessage || "未输入消息"
  prompt.showToast({ message: msg, duration: this.selectedDuration })
}
```

**修复后：**
```html
<!-- 改为预设消息按钮列表 -->
<div class="quick-grid">
  <input type="button" value="操作成功" onclick="showCustomToast(0)" />
  <input type="button" value="保存成功" onclick="showCustomToast(1)" />
  <input type="button" value="删除失败" onclick="showCustomToast(2)" />
  <input type="button" value="网络错误" onclick="showCustomToast(3)" />
  <input type="button" value="请稍后再试" onclick="showCustomToast(4)" />
  <input type="button" value="数据已同步" onclick="showCustomToast(5)" />
</div>
```

```javascript
// 从预设消息数组中取值
var CUSTOM_MESSAGES = [
  "操作成功", "保存成功", "删除失败",
  "网络错误，请检查网络连接", "请稍后再试", "数据已同步"
]

showCustomToast(index) {
  var msg = CUSTOM_MESSAGES[index] || "未知消息"
  prompt.showToast({ message: msg, duration: this.selectedDuration })
}
```

### 修复内容清单

1. **移除** `input type="text"` 文本输入框
2. **移除** `onMessageChange` 方法和 `customMessage` 数据属性
3. **重构** `showCustomToast` 方法，改为接收索引参数
4. **新增** `CUSTOM_MESSAGES` 预设消息数组
5. **新增** "更多场景演示" 区域，包含 `MORE_MESSAGES` 和 `showMoreToast` 方法
6. **清理** 不再使用的 CSS 类（`.text-input`、`.custom-row`、`.full-width`）

---

## 经验教训

### 框架兼容性检查清单

在 Vela JS 项目中添加新页面时，应遵守以下规则：

| 检查项 | 说明 |
|--------|------|
| `input` 组件 | 只能使用 `type="button"` |
| 文本输入 | 必须使用 `InputMethod` 自定义组件 |
| `slider` 组件 | 不支持，使用按钮式调节替代 |
| CSS 伪类 | 不支持 `:last-child`、`:nth-child` 等 |
| 事件绑定 | 使用 `onclick` 而非 `@click` |
| 模块导入 | `import` 优于 `require`，注意回调中 `this` 绑定 |

### 调试建议

1. 遇到页面打不开时，先检查页面源码中是否使用了不支持的组件
2. 对比项目中其他可用页面的写法，保持一致性
3. 新增页面时，先从最简单的结构开始，逐步添加功能，便于定位问题

---

## 总结

| 项目 | 内容 |
|------|------|
| 问题现象 | 设置页面"弹窗演示"链接点击后页面无法打开 |
| 根因 | `input type="text"` 在 Vela JS 框架中不受支持 |
| 严重级别 | 🔴 P0（页面完全不可用） |
| 影响范围 | prompt-demo 页面 |
| 修复方式 | 移除 `input type="text"`，改用预设按钮列表 |
| 修复版本 | 1.2.49 |