# 首页点击课程无法滚动 - 错误分析

## 问题现象

在首页状态栏点击"正在上课: 政治"或"下一节: 数学"，期望列表滚动到对应课程卡片位置，但点击后没有任何反应。

## 涉及文件

| 文件 | 路径 |
|------|------|
| 首页 | [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) |
| Vela 元素配置 | [ElementConfig.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/node_modules/@aiot-toolkit/parser/lib/ux/config/vela/ElementConfig.js) |
| Android 元素配置 | [ElementConfig.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/node_modules/@aiot-toolkit/parser/lib/ux/config/android/ElementConfig.js) |

---

## 根因分析

### Bug 1（已修复）：属性名写错

代码中使用的属性名：

```html
<scroll class="class-list" scroll-y="{{true}}" scrolltop="{{ scrollListTop }}" ...>
                                            ^^^^^^^^^  ← 错误：没有连字符
```

Vela 平台 `scroll` 组件支持的属性：

```js
scroll: {
  events: ['scrolltop', 'scrollbottom', 'scroll'],
  attributes: {
    'scroll-x': {},        // ← 正确：scroll-x
    'scroll-y': {},        // ← 正确：scroll-y
    'scroll-top': {},      // ← 正确：scroll-top (有连字符)
    ...
  }
}
```

| 名称 | 类型 | 含义 |
|------|------|------|
| `scroll-top` | **属性** (attribute) | 设置/读取滚动位置，可数据绑定 |
| `scrolltop` | **事件** (event) | 滚动到顶部时触发，不能用于设置位置 |

修复：`scrolltop` → `scroll-top`

---

### Bug 2（本次修复）：onclick 事件被父元素拦截

**这是导致"点击完全没反应"的根本原因。**

#### 事件层级结构

```
upper-half  ← ontouchstart="handleUpperTouchStart" + ontouchend
  ├── status-bar
  │   ├── status-current  ← onclick="scrollToCurrentClass"  ❌ 不触发
  │   └── status-next     ← onclick="scrollToNextClass"     ❌ 不触发
  └── scroll              ← ontouchstart="dismissSwipe"
      └── class-card      ← ontouchstart=... + onclick      ✅ 正常工作
```

#### 关键发现

在 QuickApp 框架中，当父元素注册了 `ontouchstart` 后，触摸事件会被框架路由到父元素。**只有自己也注册了 `ontouchstart` 的子元素，才能收到 `onclick` 事件。**

对比两个元素：

| 元素 | ontouchstart | onclick | 结果 |
|------|:---:|:---:|:---:|
| `class-card` | ✅ 有 (`handleCardTouchStart`) | ✅ 有 (`openDetail`) | 点击正常 |
| `status-current` | ❌ 无 | ✅ 有 (`scrollToCurrentClass`) | 点击无效 |
| `status-next` | ❌ 无 | ✅ 有 (`scrollToNextClass`) | 点击无效 |

`status-current` 和 `status-next` 没有注册 `ontouchstart`，所以它们的 `onclick` 永远不会被触发。这就是点击完全没有反应的原因。

#### 修复

给 `status-current` 和 `status-next` 添加 `ontouchstart` 属性（即使是空函数）：

```diff
- <div class="status-current" if="{{ currentClass }}" onclick="scrollToCurrentClass">
+ <div class="status-current" if="{{ currentClass }}" ontouchstart="onStatusBarTouch" onclick="scrollToCurrentClass">

- <div class="status-next" if="{{ nextClass }}" onclick="scrollToNextClass">
+ <div class="status-next" if="{{ nextClass }}" ontouchstart="onStatusBarTouch" onclick="scrollToNextClass">
```

并添加空方法：
```js
onStatusBarTouch() {
  // 仅用于注册触摸事件，使 onclick 可以正常触发
},
```

### 其他改动

- 在 `scrollToCurrentClass` 和 `scrollToNextClass` 中添加了 `playVibration("single_short")`，用于调试确认方法是否被调用到。

---

## 总结

| Bug | 原因 | 修复 |
|-----|------|------|
| Bug 1 | `scrolltop` 是事件名，不是属性名 | 改为 `scroll-top` |
| Bug 2 | 父元素 `upper-half` 有 `ontouchstart`，子元素没注册 `ontouchstart`，导致 `onclick` 被拦截 | 给子元素添加 `ontouchstart` 空处理器 |

**教训**：
1. QuickApp 中属性名和事件名可能同名但含义不同，需要查阅 `ElementConfig.js` 确认
2. 当父元素有 `ontouchstart` 时，子元素的 `onclick` 需要子元素自己也注册 `ontouchstart` 才能触发