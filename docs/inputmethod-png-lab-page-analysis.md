# 实验室新增 PNG 图片键盘输入法页面分析

## 概述

InputMethod 组件是项目的**默认/原始**中文输入法实现，使用 **53 张 PNG 图片** 拼接成键盘界面，区别于后来重构的纯文字渲染版本（`chinese-input` / `chinese-input-full`）。

本文档分析在实验室中新增一个使用 InputMethod 组件的独立页面，包括资源占用、白屏防护、开发步骤等。

---

## 一、InputMethod 组件结构

### 1.1 文件清单

```
src/components/InputMethod/
├── InputMethod.ux          (847 行) — 组件模板 + 脚本 + 样式
├── index.ux                (同 InputMethod.ux，别名入口)
└── assets/
    ├── dic.js              (~100KB) — 拼音→汉字映射表，6763 个汉字
    ├── dicUtil.js           (~5KB)  — 输入法核心引擎
    ├── dic_words.js         (~50KB) — 3000+ 整词词库
    ├── dic_words_initials.js(~30KB) — 首字母简拼倒排索引
    ├── pinyin_syllables.js  (~2KB)  — 400 个合法拼音音节
    ├── full/                (26 张 PNG) — 圆屏 (circle) 全键盘
    ├── arc/                 (13 张 PNG) — 胶囊屏 (pill-shaped) 弧形键盘
    └── horizontal/          (13 张 PNG) — 方屏 (rect) 横排键盘
```

### 1.2 三种屏幕适配

| 屏幕类型 | 宽×高 | PNG 数量 | 字母键渲染方式 | 功能键渲染方式 |
|----------|-------|:--------:|----------------|----------------|
| `circle` | 480×321px | 26 张 | 文字 `<text>` | PNG 图片 |
| `rect` | 自适应宽度×255px | 13 张 | 文字 `<text>` | PNG 图片 |
| `pill-shaped` | 自适应宽度×305px | 13 张 | 文字 `<text>` | PNG 图片 |

**关键设计**：只有功能键（删除、空格、切换语言、123、Shift、展开/收起箭头等）使用 PNG 图片，字母按键本身仍然用 `<text>` 渲染。因此圆屏（circle）因功能键更多，需要 26 张 PNG；方屏和胶囊屏各需 13 张。

### 1.3 组件 Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `hide` | Boolean | `true` | 键盘是否隐藏 |
| `maxlength` | Number | `5` | 候选词最大展示数 |
| `vibratemode` | String | `""` | 震动模式 |
| `screentype` | String | `"circle"` | 屏幕类型：`circle` / `rect` / `pill-shaped` |

### 1.4 组件 Events

| Event | 参数 | 说明 |
|-------|------|------|
| `complete` | `{ content: String }` | 用户选择候选词/输入字母 |
| `delete` | `{}` | 用户按删除键且无内容可删 |
| `keyDown` | `{ content: String }` | 字母键按下 |

---

## 二、新增页面开发步骤

### 2.1 创建页面文件

```
src/pages/chinese-input-png/
└── chinese-input-png.ux
```

### 2.2 页面模板示例

```html
<template>
  <div class="page" style="background-color: {{ theme.bg }}">
    <div class="header">
      <input class="back-btn" type="button" value="返回" onclick="onBack"
             style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="title" style="color: {{ theme.text }}">图片键盘输入法</text>
      <input class="confirm-btn" type="button" value="确认" onclick="onConfirm"
             style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
    </div>

    <div class="display-area" onclick="showKeyboard"
         style="background-color: {{ theme.card }}; border-color: {{ theme.accent }}">
      <text class="display-text" style="color: {{ theme.text }}">{{ inputValue || '点击输入' }}</text>
    </div>

    <inputmethod hide="{{ hideKeyboard }}" maxlength="{{ 5 }}"
                 screentype="{{ screentype }}"
                 oncomplete="onInputComplete"
                 ondelete="onInputDelete">
    </inputmethod>

    <text class="footer-text" style="color: {{ theme.textSecondary }}">InputMethod · PNG 图片键盘</text>
  </div>
</template>
```

### 2.3 注册路由

在 `src/manifest.json` 的 `router.pages` 中添加：

```json
"pages/chinese-input-png": {
  "component": "chinese-input-png"
}
```

### 2.4 注册到实验室列表

在 `src/pages/home-module-demo/modules/lab-list.js` 的 `ALL_PAGES` 数组中添加：

```javascript
{ name: "中文输入(图片)", uri: "/pages/chinese-input-png" }
```

---

## 三、资源占用分析

### 3.1 内存占用

| 层级 | 内容 | 内存估算 |
|------|------|:--------:|
| 字典数据 | dic.js + dic_words.js + 倒排索引 | ~180KB（全局共享） |
| 运行时索引 | forwardIndex、syllableSet | ~20-30KB（全局共享） |
| 组件实例 VDOM | 200+ 节点（含 3 套布局） | ~50-100KB |
| 图片纹理 | 解码后的 RGBA 像素数据 | ~200-400KB（按需加载） |
| 组件数据 | keys、cvalList、resultList 等 | ~10-20KB |
| **总计** | | **~260-550KB** |

### 3.2 字典共享机制

**核心优势**：字典数据是模块级单例，多个页面共享同一份。

```javascript
// dicUtil.js — 模块级单例，只加载一次
let SimpleInputMethod = {
  dict: {}  // 所有页面共享
}

// dic.js — 幂等加载
let _dict = null;
function getDict() {
  if (_dict) return _dict;  // 第二次调用直接返回缓存
  _dict = { /* 100KB 数据 */ };
  return _dict;
}
```

**结论**：如果项目中已有 `chinese-input` 页面加载过字典，新增页面零额外字典开销。

### 3.3 图片资源影响

| 项目 | 数值 |
|------|------|
| PNG 文件数量 | 52 张（3 套布局） |
| 源文件总大小 | ~208KB（每张 4KB） |
| 单张解码后内存 | 约 60×60×4 = 14.4KB（RGBA） |
| 单屏渲染内存 | 圆屏 26 张×14.4KB ≈ 375KB |
| 磁盘占用（build） | 52 张全部打入 build，约 208KB |

**优化点**：键盘隐藏时（`hide=true`），整个键盘子树通过 `if` 条件完全不进 VDOM，图片也不加载。只有用户首次点击输入区域弹出键盘时，才创建 DOM 节点并加载图片。

### 3.4 与纯文字版对比

| 对比维度 | InputMethod (PNG) | chinese-input (文字) | chinese-input-full (文字) |
|----------|:-----------------:|:--------------------:|:-------------------------:|
| 键盘渲染 | 文字 + PNG 图片 | 纯文字 | 纯文字 |
| PNG 依赖 | 52 张 | 0 张 | 0 张 |
| 屏幕适配 | 3 套自适应布局 | 通用布局 | 通用布局 |
| 模板行数 | 847 行 | 200 行 | 200 行 |
| 字典引擎 | SimpleInputMethod | SimpleInputMethod | SimpleInputMethod |
| 额外内存 | +200-400KB（图片纹理） | 0 | 0 |
| 功能完整度 | 中/英/日/符号 | 中/英/符号 | 中/英/符号 |
| 维护状态 | 原始版本，不再维护 | 活跃维护 | 活跃维护 |

---

## 四、白屏问题分析与防护

### 4.1 白屏的常见原因

在快应用环境中，新页面出现白屏通常由以下原因导致：

#### 原因 1：组件 `import` 失败

```javascript
// ❌ 错误：路径不存在或组件未导出
import InputMethod from "../../components/InputMethod/InputMethod.ux"

// ✅ 正确：确认路径和组件名称
import InputMethod from "../../components/InputMethod/index.ux"
```

**检测方法**：在 `onInit` 中打印 `console.log("component loaded")`，如果控制台无输出，说明 import 失败。

#### 原因 2：字典初始化阻塞主线程

InputMethod 的 `initDict()` 需要构建 3000 词的 `forwardIndex`，如果同步执行会阻塞渲染。

**当前已优化**：`onInit` 中 `hide=true` 时不调用 `initDict`，首次弹出键盘时才异步初始化，且 `forwardIndex` 分片构建（每 200 词一片）。

```javascript
// InputMethod.ux onInit()
if (!this.hide) {
  this.keyboardCreated = true
  this._ensureDictInit()  // 只在键盘初始可见时才初始化
}
```

#### 原因 3：manifest.json 路由未注册

```json
// ❌ 缺少路由注册 → 页面无法跳转，白屏
// ✅ 必须添加：
"pages/chinese-input-png": {
  "component": "chinese-input-png"
}
```

#### 原因 4：图片资源路径错误

InputMethod 使用相对路径引用图片：

```html
<img src="./assets/full/del.png" />
```

如果页面文件不在 `components/InputMethod/` 同级目录，相对路径会解析失败。**解决方案**：页面直接 `import` 组件，组件内部使用相对自身的路径，不受页面位置影响。

#### 原因 5：`screentype` 不匹配

如果传入的 `screentype` 与实际设备不匹配，三个 `if` 分支都不会渲染，导致键盘区域空白。

```javascript
// ✅ 正确：根据设备信息动态设置
import device from '@system.device'

onInit() {
  device.getInfo({
    success: function(data) {
      this.screentype = data.screenShape  // 'circle' | 'rect' | 'pill-shaped'
    }
  })
}
```

### 4.2 白屏防护策略

#### 策略 1：骨架屏 + 渐进式渲染

```html
<template>
  <div class="page">
    <!-- 骨架屏：数据加载前显示 -->
    <div class="skeleton" show="{{ !ready }}">
      <text class="loading-text">加载中...</text>
    </div>

    <!-- 真实内容：ready 后才渲染 -->
    <div class="content" show="{{ ready }}">
      <inputmethod hide="{{ hideKeyboard }}" screentype="{{ screentype }}"
                   oncomplete="onInputComplete">
      </inputmethod>
    </div>
  </div>
</template>

<script>
export default {
  data: {
    ready: false
  },
  onInit() {
    var self = this
    // 延迟渲染，确保组件初始化完成
    setTimeout(function() {
      self.ready = true
    }, 100)
  }
}
</script>
```

#### 策略 2：try-catch 包裹关键初始化

```javascript
onInit() {
  try {
    this._ensureDictInit()
    this.keyboardCreated = true
  } catch (e) {
    console.error("InputMethod init failed:", e)
    this.initError = true
  }
}
```

#### 策略 3：使用 `$watch` 监听 hide 变化

```javascript
onInit() {
  this.$watch("hide", "watchHidePropsChange")
}

watchHidePropsChange(newVal) {
  if (!newVal && !this.keyboardCreated) {
    // 首次弹出键盘，创建键盘子树
    this.keyboardCreated = true
    this._ensureDictInit()
  }
}
```

#### 策略 4：分片构建 forwardIndex（已实现）

```javascript
// dicUtil.js — 每 200 词一个 setTimeout(0) 分片
function _buildForwardIndex() {
  var words = getWords()
  var keys = Object.keys(words)
  var batchSize = 200
  function buildBatch(start) {
    for (var i = start; i < Math.min(start + batchSize, keys.length); i++) {
      // 构建索引
    }
    if (start + batchSize < keys.length) {
      setTimeout(function() { buildBatch(start + batchSize) }, 0)
    }
  }
  setTimeout(function() { buildBatch(0) }, 0)
}
```

#### 策略 5：图片加载失败兜底

```html
<!-- InputMethod 中字母键用文字兜底，功能键无兜底 -->
<!-- 如果 PNG 加载失败，功能键区域会留空 -->
<!-- 建议：监控图片加载，失败时显示文字替代 -->
```

### 4.3 调试检查清单

| 检查项 | 方法 |
|--------|------|
| 路由是否注册 | 检查 `manifest.json` 中是否有对应路由 |
| 组件是否成功 import | `console.log` 确认组件加载 |
| screentype 是否正确 | 打印 `device.getInfo().screenShape` |
| 字典是否初始化 | 检查 `SimpleInputMethod.dict` 是否非空 |
| 图片路径是否正确 | 检查 build 产物中 assets 目录是否存在 |
| 控制台是否有报错 | 使用 `console.error` 捕获所有异常 |

---

## 五、性能优化建议

### 5.1 图片资源优化

| 优化项 | 当前状态 | 建议 |
|--------|----------|------|
| 按需加载 | ❌ 3 套全部打包 | ✅ 按 screentype 条件打包 |
| 雪碧图合并 | ❌ 52 张独立 PNG | ✅ 合并为 3 张雪碧图 |
| 图片压缩 | ✅ 每张 4KB（已很小） | 已是最优 |
| 延迟加载 | ✅ hide 时不进 DOM | 保持现状 |

### 5.2 字典数据优化

| 优化项 | 当前状态 | 建议 |
|--------|----------|------|
| 模块级单例 | ✅ 已实现 | 保持 |
| 分片构建 | ✅ 每 200 词一片 | 保持 |
| 懒初始化 | ✅ hide 时不初始化 | 保持 |
| 词库精简 | 3000 词 | 对手表场景已足够 |

### 5.3 页面生命周期优化

```javascript
onDestroy() {
  // 释放大对象引用，帮助 GC
  this.resultList = null
  this.resultList2 = null
  this.resultRow0 = null
  this.resultWordList = null
}
```

---

## 六、总结

| 问题 | 答案 |
|------|------|
| 新增页面额外内存？ | 约 250-550KB（含图片纹理） |
| 字典会重复加载吗？ | 否，模块级单例共享 |
| 主要风险是什么？ | 路由未注册、screentype 不匹配、图片加载失败 |
| 白屏如何防护？ | 骨架屏 + 延迟渲染 + try-catch + 分片初始化 |
| 与文字版输入法对比？ | PNG 版多 200-400KB 图片纹理，功能相同 |
| 推荐使用哪个？ | 推荐使用文字版（chinese-input），PNG 版为历史遗留 |

**实际影响评估**：对于 256MB+ RAM 的智能手表，新增一个 PNG 键盘输入法页面额外消耗约 **300KB** 内存（考虑字典共享），占手表总内存约 **0.1%**，影响微乎其微。但 52 张 PNG 图片在 build 产物中占用约 208KB 磁盘空间，且当前未被任何页面引用（图片资源属于死资源），建议优先使用纯文字版输入法。