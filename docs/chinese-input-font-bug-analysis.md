# 中文输入法页面字体大小问题分析

## 问题描述

打开中文输入法页面后，字体开始很大（约 28px），过一会儿（约 300ms）就变小了（约 17px），导致键盘和显示文字过小，难以使用。

## 根本原因

**初始默认值与 store 异步计算值不一致。**

### 时间线分析

```
时间轴     事件                          字体大小
─────────────────────────────────────────────────────────
T0         页面渲染 (private 默认值)     inputFontSize = 28px
                                         keyFontSize = 28px
                                         
T0+async   onInit → getTheme (异步)     无变化
T0+async   onInit → getFontSizes()      输入: 17px, 键盘: 15px
           ↓ getBaseFontSize → 48
           ↓ r = 48/48 = 1
           ↓ display = 17*1 = 17px
           ↓ key = 15*1 = 15px
                                         
T0+async   onShow → getFontSizes()      再次覆盖为 17px / 15px
           (与 onInit 重复调用)

T0+300ms   setTimeout(showKeyboard)     用户看到键盘，字体已是 17px
```

### 具体代码链路

**1. 初始默认值** ([chinese-input.ux:L119-L120](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L119-L120))

```javascript
private: {
    inputFontSize: 28,   // 初始渲染用 28px
    keyFontSize: 28,     // 初始渲染用 28px
    baseFontSize: 28,    // 初始渲染用 28px
}
```

**2. onInit/onShow 异步覆盖** ([chinese-input.ux:L145-L158](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L145-L158))

```javascript
onInit() {
    store.getBaseFontSize(function(size) {
        self.baseFontSize = size || 28  // 默认 48
        store.getFontSizes(function(sizes) {
            self.inputFontSize = sizes.display || 28  // 17px
            self.keyFontSize = sizes.key || 28        // 15px
        })
    })
}
```

**3. getFontSizes 计算逻辑** ([store.js:L340-L358](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/store.js#L340-L358))

```javascript
getFontSizes: function(callback) {
    this.getBaseFontSize(function(size) {      // size = 48
        var r = size / 48                       // r = 1
        callback({
            display:  Math.round(17 * r),       // 17px
            key:      Math.round(15 * r),       // 15px
        })
    })
}
```

### 问题本质

`getFontSizes()` 是为**课程表主页面**设计的字体缩放系统，其中 `display = 17px` 和 `key = 15px` 是课程表场景下的基准值。但中文输入法页面直接复用了这个函数，导致：

- 初始渲染时用 `private` 默认值 28px，看起来正常
- 异步回调后，被 `getFontSizes` 覆盖为 17px/15px，字体突然变小
- 300ms 后 `showKeyboard()` 触发，用户看到的是缩小后的键盘

### 次要问题

**CSS 硬编码** ([chinese-input.ux:L400-L460](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux#L400-L460))

```css
.display-text { font-size: 28px; }    /* 与 inline style 冲突 */
.cursor       { font-size: 28px; }
.pinyin-text  { font-size: 28px; }
.candidate-item { font-size: 28px; }
.key-btn      { font-size: 28px; }
.key-del      { font-size: 28px; }
.key-func     { font-size: 28px; }
```

CSS 中硬编码了 `font-size: 28px`，但 inline style 的 `font-size: {{ inputFontSize }}px` 优先级更高，所以 CSS 的 28px 不生效。但一旦 `inputFontSize` 被覆盖为 17px，CSS 也无法兜底。

## 修复方案

### 方案 A：页面使用独立字体计算（推荐）

输入法页面不依赖 `store.getFontSizes()`，而是用自己的字体缩放逻辑，直接使用 `baseFontSize` 作为基准。

```javascript
// 在 chinese-input.ux 中
onInit() {
    var self = this
    store.getTheme(function(t) { self.theme = t })
    store.getBaseFontSize(function(size) {
        self.baseFontSize = size || 48
        self.inputFontSize = self.baseFontSize     // 直接用 baseFontSize
        self.keyFontSize = Math.round(self.baseFontSize * 0.6)  // 键盘稍小
    })
}

setInputFontSize(size) {
    var self = this
    self.baseFontSize = size
    store.setBaseFontSize(size, function() {
        self.inputFontSize = size
        self.keyFontSize = Math.round(size * 0.6)
    })
}
```

### 方案 B：修复 getFontSizes 中 display/key 的基准值

在 `store.js` 中调整 `display` 和 `key` 的计算基准，使其与 CSS 的 28px 对齐：

```javascript
display:  Math.round(28 * r),   // 原来是 17
key:      Math.round(28 * r),   // 原来是 15
```

但此方案会影响所有使用 `getFontSizes` 的页面（课程表等），可能造成其他页面字体过大，不推荐。

### 方案 C：删除 CSS 硬编码，统一使用 inline style

移除 CSS 中的 `font-size: 28px`，只保留 inline style 的 `font-size: {{ inputFontSize }}px`，避免混淆。同时确保 `inputFontSize` 的计算逻辑正确。

## 推荐

**方案 A**，因为：
1. 输入法页面有独立的字体调整需求（显示区大、键盘适中）
2. 不影响课程表等其他页面的字体计算
3. 改动范围小，仅修改 `chinese-input.ux`
4. 用户通过字体栏调整时，直观看到效果（选 48 就是 48px，而不是 17px）

## 影响范围

| 文件 | 改动 |
|------|------|
| [chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux) | `onInit`、`onShow`、`setInputFontSize` 中的字体计算逻辑 |
| [store.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/store.js) | 无需改动 |