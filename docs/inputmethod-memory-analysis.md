# 新独立页面集成 InputMethod 组件内存消耗分析

## 问题

新加入一个独立页面，重启旧的官方默认中文输入法（InputMethod 组件），是否会显著增加内存消耗？

## InputMethod 组件构成

### 1. 文件结构

```
src/components/InputMethod/
├── InputMethod.ux          (847 行) — 组件模板 + 脚本 + 样式
└── assets/
    ├── dic.js              (~100KB) — 拼音→汉字映射表，6763 个汉字，400+ 音节
    ├── dicUtil.js           (~5KB)  — 输入法核心逻辑：分词、候选、多拼
    ├── dic_words.js         (~50KB) — 3000+ 整词词库
    ├── dic_words_initials.js(~30KB) — 首字母简拼倒排索引
    ├── pinyin_syllables.js  (~2KB)  — 400 个合法拼音音节
    ├── full/                (26 张 PNG) — 圆屏全键盘按键图片
    ├── arc/                 (13 张 PNG) — 胶囊屏弧形键盘按键图片
    └── horizontal/          (14 张 PNG) — 方屏横排键盘按键图片
```

### 2. 组件内部分层

| 层级 | 内容 | 内存占用估算 |
|------|------|:---:|
| 模板 | 3 套键盘布局（circle/rect/pill-shaped），200+ VDOM 节点 | ~50-100KB |
| 字典数据 | dic.js + dic_words.js + dic_words_initials.js + pinyin_syllables.js | ~180KB |
| 运行时索引 | `forwardIndex`（首2字母 → 词键列表）、`syllableSet`（Set 结构） | ~20-30KB |
| 图片资源 | 53 张键盘按键 PNG 图片 | 视设备渲染而定 |
| 组件数据 | keys、cvalList、waitingList、resultList、resultList2 等 | ~10-20KB |
| **总计** | | **~260-330KB** |

---

## 内存消耗分析

### 结论：不会显著增加内存消耗 ⭐

原因如下：

### 1. 字典数据是模块级单例，多页面共享

```javascript
// dicUtil.js
let SimpleInputMethod = {
  dict: {}  // 模块级对象，不是组件实例级
}
```

```javascript
// dic.js
let _dict = null;
function getDict() {
  if (_dict) return _dict;  // 幂等，只建一次
  _dict = { ... };          // 约 100KB
  return _dict;
}
```

```javascript
// dic_words.js
let _words = null;
function getWords() {
  if (_words) return _words;  // 幂等，只建一次
  _words = { ... };           // 约 50KB
  return _words;
}
```

**关键机制**：QuickJS 运行时会缓存 `import` 的模块。`dicUtil.js`、`dic.js`、`dic_words.js` 等模块无论被多少个页面 `import`，都只加载一次，共享同一份字典数据。

- 如果已有 `chinese-input` 页面导入过 `dicUtil.js`，字典已经在内存中
- 新页面再导入 `dicUtil.js` 时，拿到的就是同一个引用，字典部分**零额外内存**

### 2. 组件实例本身是轻量的

每个页面创建 `InputMethod` 组件实例时，额外分配的内存只有：

| 数据项 | 大小 | 说明 |
|--------|:---:|------|
| `keys` 对象 | ~2KB | 键盘布局数组（3×10 + 3×8 + 3×7 个字符） |
| `cvalList` | ~0.1KB | [0,1,2,3,4] 数组 |
| `waitingList` / `waitingIndex` | ~0.1KB | 多选等待列表 |
| `resultList` / `resultList2` | ~1-2KB | 候选结果列表（动态） |
| `resultRow0` | ~0.5KB | 候选行展示 |
| VDOM 树 | ~30-50KB | 取决于当前显示的键盘布局 |
| 事件回调闭包 | ~5KB | 按键事件、滚动事件等 |
| **组件实例总计** | **~40-60KB** | |

### 3. 图片资源的影响

53 张键盘按键图片，但需要注意：

- 当前页面只显示一种屏幕类型（circle/rect/pill-shaped 三者之一）
- 同一屏幕类型的图片：圆屏 26 张、方屏 14 张、胶囊屏 13 张
- 单张图片约 1-3KB（是小尺寸按键图标）
- 图片渲染内存 = 解码后的 RGBA 像素数据，约 `宽×高×4 字节`
- 以 60×60px 按键为例：60×60×4 = 14.4KB/张，26 张 = ~375KB

**但**：图片是延迟加载的（`hide` 为 true 时整个键盘子树不进 DOM），只有用户弹出键盘时才加载和渲染。

### 4. 内存对比

| 场景 | 字典 | 组件实例 | 图片 | 总计 |
|------|:---:|:---:|:---:|:---:|
| 无输入法页面 | 0 | 0 | 0 | 0 |
| 只有 chinese-input 页面 | ~180KB | ~50KB | ~200KB | ~430KB |
| 新增第二个页面（共用字典） | 0（共享） | ~50KB | ~200KB | ~250KB |

**新增一个独立页面，额外内存约 250KB。**

---

## 什么情况下会显著增加内存

### 场景 A：字典为每个页面独立打包 ⚠️

如果使用 `import` 方式引入 `InputMethod.ux` 组件（而非只 import `dicUtil.js`），且打包工具（如 webpack）将字典代码内联到每个页面 bundle 中，则每个页面会有一份独立的字典。

**当前状态**：`chinese-input.ux` 只 import 了 `dicUtil.js`，没有 import 整个 `InputMethod.ux` 组件。新页面也应采用同样方式。

### 场景 B：大量并发页面同时保持活跃 ⚠️

如果用户同时打开多个使用 InputMethod 的页面且不销毁，每个页面保留自己的组件实例 + VDOM 树 + 图片。

- 2 个页面：~250KB × 2 + 180KB(共享) = ~680KB
- 5 个页面：~250KB × 5 + 180KB(共享) = ~1.4MB

对于智能手表（通常 256MB-512MB RAM），1.4MB 仍然相对可控，但建议做好页面销毁。

### 场景 C：`forwardIndex` 分片构建期间的临时内存

`_buildForwardIndex()` 在 `initDict` 后异步分片构建（每 200 个词一片），构建期间 `forwardIndex` 对象逐步增长：

- 最终大小：~3000 个词，每个词平均 6 字符，加上索引键 → 约 20-30KB
- 分片构建，每片 200 词，不影响渲染帧

---

## 优化建议

### 1. 只 import dicUtil，不 import 整个 InputMethod 组件（已做到 ✅）

```javascript
// 推荐：只导入字典逻辑
import { SimpleInputMethod } from "../../components/InputMethod/assets/dicUtil.js"

// 不推荐：导入整个组件（会导致模板/样式/图片也打包）
import InputMethod from "../../components/InputMethod/InputMethod.ux"
```

### 2. 延迟 initDict 到键盘弹出时

**当前已实现**：`InputMethod.ux` 的 `onInit` 中，`hide=true` 时不调用 `initDict`，等首次弹出键盘时才初始化字典。

```javascript
// InputMethod.ux onInit()
if (!this.hide) {
  this.keyboardCreated = true
  this._ensureDictInit()
}
```

### 3. 页面销毁时清理

```javascript
onDestroy() {
  // 释放组件实例引用，帮助 GC
  this.resultList = null
  this.resultList2 = null
  this.resultRow0 = null
}
```

### 4. 图片资源按需加载

当前 InputMethod 组件有 3 套键盘图片，但设备只使用其中一套。如果打包工具支持，可以按设备类型条件打包，减少约 100KB 的图片资源。

---

## 总结

| 问题 | 答案 |
|------|------|
| 是否显著增加内存？ | **否**，额外约 250KB |
| 字典会重复加载吗？ | **否**，模块级单例，多页面共享 |
| 最大风险是什么？ | 打包工具将字典内联到每个页面 bundle |
| 建议 | 只 import `dicUtil.js`，不 import 整个 `InputMethod.ux` 组件 |

**实际影响**：对于 256MB+ RAM 的智能手表，新增一个独立页面使用 InputMethod，额外 250KB 内存消耗是**微不足道的**。真正的内存大户是图片纹理（每张解码后 10-15KB），而非字典数据或组件逻辑。