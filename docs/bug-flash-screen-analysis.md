# 页面闪屏 Bug 分析

## 问题描述

进入任何页面（首页、设置、课程详情等）时，页面会短暂闪烁一下，先显示白色/透明背景，然后突然变成正确的主题颜色。

## 根因分析

### 核心原因：`theme` 初始值为空对象 `{}`，但主题加载是异步的

所有 11 个页面的 `theme` 初始值都是空对象 `{}`：

```
src/pages/index/index.ux:181:            theme: {},
src/pages/add-course/add-course.ux:178:  theme: {},
src/pages/week-view/week-view.ux:56:     theme: {},
src/pages/schedule-manager/schedule-manager.ux:50:  theme: {},
src/pages/nickname-edit/nickname-edit.ux:29:  theme: {},
src/pages/reset-data/reset-data.ux:49:   theme: {},
src/pages/detail/detail.ux:188:          theme: {},
src/pages/chinese-input/chinese-input.ux:75:  theme: {},
src/pages/settings/settings.ux:140:      theme: {},
src/pages/statistics/statistics.ux:73:   theme: {},
src/pages/course-manager/course-manager.ux:47:  theme: {},
```

而主题是通过异步 `storage.get()` 获取的，在 `store.getTheme()` 中：

```javascript
// src/data/store.js:221
getTheme: function(callback) {
    storage.get({
      key: "appTheme",
      success: function(data) {
        var name = data || 'blue'
        callback(THEMES[name] || THEMES.blue, name)
      },
      fail: function() {
        callback(THEMES.blue, 'blue')
      }
    })
}
```

### 闪屏发生的时序

1. **页面初始化** → `onInit()` 被调用
2. **模板立即渲染** → `theme` 为 `{}`，所有 `{{ theme.bg }}`、`{{ theme.text }}` 等值为 `undefined`
3. **页面显示为白色/透明背景**，文字颜色也为默认值（不可见或不正确）
4. **异步回调完成** → `self.theme = t` 设置正确的主题对象
5. **页面重新渲染** → 背景色、文字颜色等突然变为正确的主题颜色 → **闪屏！**

### 具体流程示例（首页 index.ux）

```
1. app.ux onCreate → database.init() 开始
2. Router 加载 pages/loader → 显示 #1a1a2e 深色背景
3. loader.ux onInit → router.replace("/pages/index")
4. index.ux 加载:
   - theme = {} (空对象，所有颜色值 undefined)
   - 模板渲染: style="background-color: undefined" → 白色/透明
   - 模板渲染: style="color: undefined" → 文字不可见
5. store.getTheme() 异步回调返回 → theme = THEMES.blue
   - 模板重新渲染: style="background-color: #1a1a2e" → 深色背景
   - 文字变为白色 → 闪屏！
```

## 影响范围

所有 11 个页面都受影响，因为所有页面都使用相同的模式：
- `theme: {}` 初始值
- `store.getTheme()` 异步加载
- 模板中使用 `{{ theme.xxx }}` 作为样式值

## 修复方案

### 方案一：设置默认主题初始值（推荐，最小改动）

将每个页面的 `theme: {}` 改为默认主题（如 `THEMES.blue`），这样页面首次渲染时就有正确的颜色，异步加载完成后如果用户保存了其他主题再更新。

```javascript
// 修改前
private: {
    theme: {},
    ...
}

// 修改后
private: {
    theme: {
        bg: '#1a1a2e',
        card: '#16213e',
        cardLight: '#0f3460',
        accent: '#7ec8e3',
        text: '#ffffff',
        textSecondary: '#888899',
        textMuted: '#555566',
        border: '#0f3460',
        borderLight: '#2a2a5a',
        keyBg: '#1a1a3e',
        keyBorder: '#2a2a5a',
        btnSecondary: '#333355',
        btnSecondaryText: '#a0a0b0',
        deleteBg: '#2a1a3e',
        deleteText: '#e08080',
        progressOngoing: 'rgba(126,200,227,0.2)',
        progressDone: 'rgba(74,138,154,0.25)'
    },
    ...
}
```

**优点**：改动最小，只需修改初始值
**缺点**：需要在每个页面硬编码默认主题，如果 `store.js` 中默认主题改了，需要同步修改

### 方案二：在 store.js 中导出默认主题常量

在 `store.js` 中导出 `DEFAULT_THEME`，各页面引用：

```javascript
// store.js
var DEFAULT_THEME = THEMES.blue
module.exports = {
    DEFAULT_THEME: DEFAULT_THEME,
    ...
}

// 各页面
var store = require("../../data/store.js")
private: {
    theme: store.DEFAULT_THEME,
    ...
}
```

**优点**：默认主题只在一处定义，修改方便
**缺点**：需要修改所有 11 个页面

### 方案三：使用 v-if 控制渲染（备选）

在模板最外层加 `if="{{ theme.bg }}"` 条件判断，等主题加载完成后再渲染：

```html
<div if="{{ theme.bg }}" class="schedule-page" style="background-color: {{ theme.bg }}">
```

**优点**：不会显示错误的颜色
**缺点**：页面会短暂不显示任何内容（白屏），体验也不好

## 推荐方案

**方案二**是最佳选择，理由是：
1. 默认主题集中管理，后续修改方便
2. 页面首次渲染就有正确的颜色，无闪屏
3. 异步加载完成后无缝切换（同色系切换几乎无感知）

## 其他潜在问题

### database.init() 重复调用

`app.ux` 的 `onCreate` 中调用了 `database.init()`，`index.ux` 的 `onInit` 中也调用了 `database.init()`。虽然 `database.init()` 内部可能有防重复机制，但这是冗余调用，建议只在 `app.ux` 中初始化一次。

### loader.ux 页面硬编码颜色

`loader.ux` 的背景色 `#1a1a2e` 是硬编码的，与默认蓝色主题一致。如果用户使用浅色主题，首次进入会看到深色背景再切换到浅色，造成闪屏。建议 loader 页面也使用主题系统或使用系统默认背景。