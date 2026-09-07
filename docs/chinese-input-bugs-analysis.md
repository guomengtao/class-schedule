# 中文输入法 Bug 分析

## Bug 1: 返回按钮需要点击 2 次

### 现象
点击"返回"按钮后，第一次点击只是隐藏键盘，第二次点击才能真正返回上一页。用户期望点击一次就返回。

### 根源代码

[chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L372-L379) 中的 `onCancel()` 函数：

```js
onCancel() {
  if (!this.hideKeyboard) {
    this.hideKeyboard = true
    this.showCursor = false
  } else {
    this.returnResult(null)
  }
}
```

### 分析

这是一个**二态切换逻辑**：

| 状态 | 点击返回按钮行为 |
|------|-----------------|
| 键盘显示中 (`hideKeyboard = false`) | 隐藏键盘 |
| 键盘已隐藏 (`hideKeyboard = true`) | 调用 `router.back()` 返回 |

设计意图是：用户可能想先收起键盘看看输入的内容，再决定是否返回。但实际上这个设计造成了困惑，用户期望点击返回就直接返回。

### 影响范围

- `goBack()` 函数（[chinese-input.ux:L397-L399](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L397-L399)）也调用 `onCancel()`，同样受影响
- 第 1 行模板中 `onclick="onCancel"` 绑定到返回按钮

### 修复方案

**方案 A（推荐）：直接返回**

```js
onCancel() {
  this.returnResult(null)
}
```

最简单直接，用户体验最好。

**方案 B：保留键盘隐藏动画后返回**

```js
onCancel() {
  if (!this.hideKeyboard) {
    this.hideKeyboard = true
    this.showCursor = false
    setTimeout(() => {
      this.returnResult(null)
    }, 200)
  } else {
    this.returnResult(null)
  }
}
```

先隐藏键盘给用户一个视觉反馈，延迟 200ms 后返回。但增加了复杂度。

---

## Bug 2: 进入页面时字体先大后小，风格突变

### 现象

进入中文输入法页面时：
1. 字体先显示一个较大的初始值（36px），然后突然变小
2. 页面风格（颜色主题）也会短暂闪烁变化

### 根源代码

`onInit()` 函数（[chinese-input.ux:L166-L204](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L166-L204)）：

```js
onInit() {
  var self = this
  store.getTheme(function(t) {
    self.theme = t
  })
  getInputFontSize(function(size) {
    self.baseFontSize = size
    self.applyFontSize(size)
  })
  // ... 其他 storage.get 异步加载 ...

  setTimeout(function() {
    self.showKeyboard()
  }, 300)
}
```

### 问题拆解

| 问题 | 原因 | 代码位置 |
|------|------|---------|
| 字体先大后小 | 初始值 `inputFontSize: 36`，然后 `getInputFontSize` 异步回调设置存储的值（可能更小如 20/24/28） | [L132](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L132), [L173-L176](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L173-L176) |
| 风格突变 | 初始 `theme` 是硬编码的暗色主题，然后 `store.getTheme` 异步回调设置用户选择的主题（可能是浅色） | [L110-L125](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L110-L125), [L169-L171](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L169-L171) |
| 键盘延迟出现 | 300ms 的 `setTimeout` 让键盘在页面加载后才出现，产生"二次加载"的视觉感受 | [L202-L204](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L202-L204) |

### 时序图

```
页面渲染 → 显示初始字体 36px + 暗色主题 → 键盘隐藏
   ↓ (异步)
getInputFontSize 回调 → 字体变为存储值 (如 24px) → 视觉跳变
   ↓ (异步)
store.getTheme 回调 → 主题切换 → 颜色闪烁
   ↓ (300ms)
showKeyboard() → 键盘 + 字体栏出现 → 布局变化
```

### 修复方案

**方案 A（推荐）：移除延迟，键盘立即显示**

```js
onInit() {
  var self = this
  store.getTheme(function(t) {
    self.theme = t
  })
  getInputFontSize(function(size) {
    self.baseFontSize = size
    self.applyFontSize(size)
  })
  // ... 其他 storage.get ...

  // 直接显示键盘，不延迟
  self.showKeyboard()
}
```

**方案 B：初始值设为存储的默认值，消除跳变**

在 `private` 中将 `inputFontSize` 初始值改为 `INPUT_FONT_DEFAULT`（即 36 → 36，保持一致），确保如果存储中的值也是 36 就不会跳变。但这不是根本解决方案。

**方案 C：加载完成前不渲染页面**

在 `onInit` 中先用 flag 控制，等所有异步数据加载完成后再显示。但会增加首次渲染等待时间。

### 推荐修复

结合方案 A，同时解决两个问题：

1. **Bug 1**：`onCancel()` 直接 `returnResult(null)`，一次点击返回
2. **Bug 2**：去掉 `setTimeout` 延迟，`showKeyboard()` 立即调用；主题和字体加载是异步的，但去掉延迟至少消除"键盘延迟出现"这一层闪烁

```js
// Bug 1 修复
onCancel() {
  this.returnResult(null)
}

// Bug 2 修复 - 在 onInit 末尾
// 删除 setTimeout，直接调用
self.showKeyboard()
```

---

## 总结

| Bug | 严重程度 | 修复难度 | 推荐方案 |
|-----|---------|---------|---------|
| 返回需点 2 次 | 高（用户困惑） | 低（删除 if 判断） | 直接返回 |
| 字体先大后小 | 中（视觉闪烁） | 低（删除 setTimeout） | 去掉延迟 |
| 风格突变 | 低（异步加载不可避免） | 中（需预加载） | 先修上述两项 |