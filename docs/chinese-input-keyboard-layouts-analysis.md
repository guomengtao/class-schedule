# 中文输入法键盘布局分析

## 概述

本文档分析项目中中文输入法的源码，列出所有默认携带的输入法界面（键盘布局），并评估增加一个简单按钮实现输入法切换（特别是全键盘）的可行性。

---

## 一、源码文件结构

| 文件 | 说明 |
|------|------|
| [chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux) | **当前主力**：内联精简全键盘页面，纯 `<text>` 实现，零图片依赖 |
| [InputMethod.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux) | **旧版组件**：支持 3 种屏幕类型（circle/rect/pill-shaped），使用 PNG 图片按键，已不再被 `chinese-input.ux` 使用 |
| [dicUtil.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/assets/dicUtil.js) | 拼音引擎 `SimpleInputMethod`，提供拼音→汉字转换、分词、多拼/简拼匹配 |

---

## 二、当前默认携带的键盘布局

### 2.1 全键盘（QWERTY 字母键盘）— 主键盘

**文件位置**：[chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux) 第 24-37 行

**布局**：

```
Q  W  E  R  T  Y  U  I  O  P       ← 第1行，10个键
 A  S  D  F  G  H  J  K  L          ← 第2行，9个键
  Z  X  C  V  B  N  M  [Del]        ← 第3行，7个字母 + 删除键
[123]  [      空格      ]  [中/EN]   ← 底行功能键
```

**代码定义**（第 130-133 行）：
```javascript
keys: {
  full: [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ],
  // ...
}
```

**特点**：
- 标准 QWERTY 布局，适合习惯电脑键盘的用户
- 中文模式：按字母自动累积拼音，调用 `SimpleInputMethod` 查候选词
- 英文模式：默认输出小写字母，按 Shift 切换大写
- 支持振动反馈
- 支持字体大小调节（20/24/28/36/48/60 六档）

---

### 2.2 数字符号键盘

**文件位置**：[chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux) 第 38-46 行

**布局**：

```
1  2  3  4  5  6  7  8  9  0       ← 第1行，10个数字
-  /  :  ;  (  )  $  &  @  "       ← 第2行，10个符号
.  ,  ?  !  '         [Del]        ← 第3行，5个符号 + 删除键
[ABC]  [      空格      ]  [中/EN]  ← 底行功能键
```

**代码定义**（第 134-138 行）：
```javascript
keys: {
  // ...
  sign: [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""],
    [".", ",", "?", "!", "'"]
  ]
}
```

**切换方式**：点击底行 `123` 按钮，调用 `toggleNumMode()`（第 318 行），numFlag 翻转，全键盘和数字键盘互相切换。

---

### 2.3 旧版 InputMethod 组件的键盘（已废弃，保留参考）

**文件位置**：[InputMethod.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux)

该组件支持 3 种屏幕类型，但当前 `chinese-input.ux` 已经不再使用它：

| 屏幕类型 | 说明 | 键盘尺寸 |
|----------|------|----------|
| `circle` (圆屏) | 圆形屏幕手环，如小米手环7/8 | 480×321px，使用 PNG 图片按键，带特殊圆屏布局 |
| `rect` (方屏) | 方形屏幕手环，如小米手环9 Pro | 宽度自适应，高度 255px，可横向滚动 |
| `pill-shaped` (胶囊屏) | 胶囊形屏幕手环 | 宽度自适应，高度 305px，带弧形进度条 |

**每种屏幕类型下的键盘模式**：

| 模式 | 变量控制 | 说明 |
|------|----------|------|
| 全键盘字母 | `!numFlag` | QWERTY 全键盘，10列+9列+7列阶梯布局 |
| 数字符号键盘 | `numFlag` | 数字+符号键盘，与全键盘切换 |
| 日文符号键盘 | `numFlag && numFlag_jp` | 日文专用符号布局 |
| 英文大小写 | `upperFlag` | 英文模式下大写/小写切换 |

**旧版组件的按键定义**（第 260-275 行）：
```javascript
keys: {
  full: [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ],
  sign: [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["~", "!", "@", "#", "%", "\u201C", "\u201D", "*", "?", "/"],
    ["(", ")", "-", "_", ":", ";", "\uFF0C", "\u3002", "."],
  ],
  sign62: [  // 圆屏符号键盘（部分按键由图片替代）
    ["2", "3", "4", "5", "6", "7", "8", "9"],
    ["!", "@", "#", "%", "\u201C", "\u201D", "*"],
    [")", "-", "_", ":", ";"],
  ],
  full62: [  // 圆屏全键盘（首尾字母由图片替代）
    ["W", "E", "R", "T", "Y", "U", "I", "O"],
    ["S", "D", "F", "G", "H", "J", "K"],
    ["X", "C", "V", "B", "N"],
  ],
}
```

---

## 三、当前输入法切换机制总结

| 切换操作 | 触发方法 | 效果 |
|----------|----------|------|
| 全键盘 ↔ 数字符号 | `toggleNumMode()` | `numFlag` 翻转，键盘布局切换 |
| 中文 ↔ 英文 | `toggleLang()` | `lang` 在 `"cn"` 和 `"en"` 之间切换 |
| 英文大小写 | `toggleShift()` | `shiftFlag` 翻转，仅英文模式生效 |
| 字体大小 | `setInputFontSize(n)` | 6 档字体大小切换 |

**关键发现**：当前源码中**没有 9 键（T9）键盘实现**，也没有全键盘 ↔ 9 键的切换按钮。9 键 T9 输入法仅存在于设计文档 [中文输入界面放大方案.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/中文输入界面放大方案.md) 中，尚未编码实现。

---

## 四、两种全键盘（QWERTY）形式的深度对比

项目中存在**两种全键盘实现**，但当前只有一种在使用。下面详细分析它们的区别和现状。

### 4.1 形式一：内嵌精简全键盘（当前使用）— `chinese-input.ux`

**源码位置**：[chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux) 第 24-50 行

**特点**：

| 维度 | 说明 |
|------|------|
| 实现方式 | 纯 `<text>` 元素，零图片依赖 |
| 键盘宽度 | 屏幕宽度自适应，不需要横向滚动 |
| 按键样式 | 圆角矩形，`flex: 1` 等分宽度 |
| 按键大小 | 宽度约 26-30px，高度约 28-36px（随字体调节） |
| 体积 | 无图片资源，JS 约 533KB |
| 使用方式 | 独立页面，其他页面通过 `router.push` 跳转进入 |
| 使用页面 | add-course, detail, course-manager, schedule-manager, nickname-edit, homepage-settings, qrcode-generator（共 7 个页面） |

**布局**：

```
Q  W  E  R  T  Y  U  I  O  P       ← 10键等宽
 A  S  D  F  G  H  J  K  L          ← 9键等宽
  Z  X  C  V  B  N  M  [Del]        ← 7键 + 删除键
[123]  [      空格      ]  [中/EN]   ← 底行功能键
```

---

### 4.2 形式二：浮动图片全键盘（已废弃）— `InputMethod.ux`

**源码位置**：[InputMethod.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux) 第 96-170 行（rect 方屏部分）

**特点**：

| 维度 | 说明 |
|------|------|
| 实现方式 | `<text>` + `<img>` PNG 图片混合，按键使用图片渲染 |
| 键盘宽度 | **超出屏幕宽度**，需要横向滚动（`scroll-x="true"`） |
| 按键样式 | 圆形按钮（`border-radius: 30px`），60×60px 固定大小 |
| 按键大小 | 每个 60×60px，比内嵌版大约 **2倍** |
| 体积 | 50+ 张 PNG 图片（156KB），编译后 JS 1.3MB |
| 使用方式 | 作为**组件**嵌入各页面底部，浮在页面内容之上 |
| 屏幕适配 | 支持 3 种屏幕：circle（圆屏）/ rect（方屏）/ pill-shaped（胶囊屏） |
| 滚动进度条 | 方屏和胶囊屏有横向滚动进度指示器 |
| 语言支持 | 支持中文、英文、日文三种语言 |

**rect 方屏布局**（最接近当前使用场景）：

```
键盘区域宽度超出屏幕，需要左右滑动才能看到全部按键：

     Q  W  E  R  T  Y  U  I  O  P          ← 10键，60×60px圆形
      A  S  D  F  G  H  J  K  L             ← 9键
       Z  X  C  V  B  N  M  [空格]          ← 7键 + 空格键

底行功能栏（固定不滚动）：
[中] [候选词滚动区+v] [123] [EN/bigA/a] [Del]
```

**圆屏 circle 布局**（480×321px 固定尺寸）：

```
首尾字母用图片替代，中间用 text：
[语言] [Q] W E R T Y U I O [P] [Del]       ← 首尾Q/P是图片
       [A] S D F G H J K [L]                ← 首尾A/L是图片
        [Z] X C V B N [M]                   ← 首尾Z/M是图片
[123]  [空格]  [数字/符号键]
```

**胶囊屏 pill-shaped 布局**：类似 rect 方屏，但带弧形进度条装饰。

---

### 4.3 为什么旧版被废弃？

根据重构文档 [chinese-input-refactor-plan.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/chinese-input-refactor-plan.md)，废弃原因：

| 问题 | 说明 |
|------|------|
| **体积爆炸** | 词库 110KB 被 6 个页面各打包一次，每个页面 JS 膨胀到 1MB+ |
| **内存崩溃** | 手环设备内存不足，加载时系统崩溃重启 |
| **组件冗余** | 每个页面独立嵌入一个 `InputMethod` 组件，6 个页面 = 6 份键盘代码 |
| **图片资源重** | 50+ 张 PNG 图片，编译后 RPK 体积大 |

**重构方案**：改为统一页面模式 —— 所有输入场景跳转到同一个 `chinese-input.ux` 页面，词库只打包一次，体积从 1.3MB 降到 533KB（**减少 60%**）。

---

### 4.4 旧版组件现状

| 项目 | 状态 |
|------|------|
| 源码文件 | ✅ 仍然存在：`src/components/InputMethod/InputMethod.ux`（847 行） |
| PNG 图片资源 | ✅ 仍然存在：`arc/`(12张)、`full/`(26张)、`horizontal/`(13张)，共 51 张 |
| 拼音引擎 | ✅ 仍在使用：`dicUtil.js`、`dic.js`、`dic_words.js` 等被 `chinese-input.ux` 引用 |
| 被任何页面引用 | ❌ **零引用**，没有任何页面 `import` 或 `<input-method>` 使用它 |
| 是否有设置开关 | ❌ **没有**，不存在任何设置项可以切换回旧版键盘 |
| 能否调出来 | ❌ **不能**，除非修改代码重新引入 |

### 4.5 两种键盘的直观对比

| 对比维度 | 内嵌精简全键盘（当前） | 浮动图片全键盘（旧版） |
|----------|:-------------------:|:-------------------:|
| 按键大小 | 26-30px 宽 | **60×60px**（2倍大） |
| 需要横滚 | ❌ 不需要 | ✅ **需要左右滑动** |
| 一屏可见键数 | 全部可见 | 约 5-6 个键可见 |
| 图片依赖 | 零图片 | 51 张 PNG |
| 编译体积 | 533KB | **1.3MB** |
| 内存占用 | 低 | 高（易崩溃） |
| 按键手感 | 紧凑，可能误触 | 大，好按但需滑动 |
| 使用方式 | 独立页面跳转 | 嵌入页面底部浮动 |
| 打字效率 | 所有键可见，直接按 | 需要滑动找键，效率低 |
| 当前状态 | ✅ 活跃使用 | ❌ 死代码，未删除 |

---

## 五、增加全键盘切换按钮的分析

### 5.1 当前已有的切换能力

当前 `chinese-input.ux` 已经内置了全键盘和数字符号键盘的切换，但没有 9 键键盘。用户可能期望的"切换"有两种理解：

**理解 A**：在全键盘和数字键盘之间加一个更明显的切换按钮
- 当前已有 `toggleNumMode()`，底行 `123`/`ABC` 按钮已实现此功能
- 只需将此按钮做得更醒目即可，无需额外开发

**理解 B**：增加 9 键 T9 键盘模式，并在全键盘和 9 键之间切换
- 这是设计文档中规划但尚未实现的功能
- 需要完整的 9 键键盘开发

### 5.2 方案一：增强现有全键盘↔数字键盘切换（零开发量）

当前底行已有切换按钮，无需额外改动：

```
[123]  [      空格      ]  [中/EN]   ← 中文模式
[Shift]  [    空格       ]  [中/EN]   ← 英文模式
```

点击 `123` 切换到数字键盘，数字键盘下点击 `ABC` 切回全键盘。

### 5.3 方案二：增加 9 键 T9 键盘 + 全键盘切换按钮（推荐）

根据设计文档 [中文输入界面放大方案.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/中文输入界面放大方案.md) 的方案四，这是手环设备上更优的中文输入方案。

#### 5.3.1 9 键键盘布局

```
┌───────┬───────┬───────┬─────────┐
│  ABC  │  DEF  │  GHI  │   Del   │
│   2   │   3   │   4   │         │
├───────┼───────┼───────┼─────────┤
│  JKL  │  MNO  │ PQRS  │   EN    │
│   5   │   6   │   7   │         │
├───────┼───────┼───────┼─────────┤
│  TUV  │ WXYZ  │       │  空格   │
│   8   │   9   │   0   │         │
└───────┴───────┴───────┴─────────┘
```

#### 5.3.2 9 键字母映射表

```javascript
var t9Keys = {
  '2': ['a', 'b', 'c'],
  '3': ['d', 'e', 'f'],
  '4': ['g', 'h', 'i'],
  '5': ['j', 'k', 'l'],
  '6': ['m', 'n', 'o'],
  '7': ['p', 'q', 'r', 's'],
  '8': ['t', 'u', 'v'],
  '9': ['w', 'x', 'y', 'z'],
  '0': [' ']
}
```

#### 5.3.3 切换按钮设计

在键盘底部增加一行切换栏：

```
┌──────────────────────────────────┐
│  [ A- ]  [ 字体: 大 ]  [ A+ ]   │  ← 字体调节栏（已有）
├──────────────────────────────────┤
│  键盘切换:  [ 9键 ◉ 全键盘 ]     │  ← 新增切换按钮
└──────────────────────────────────┘
```

#### 5.3.4 切换逻辑

```javascript
// 新增状态
keyboardMode: 'full',  // 'full' | 't9'

toggleKeyboardMode() {
  if (this.keyboardMode === 't9') {
    this.keyboardMode = 'full'
  } else {
    this.keyboardMode = 't9'
  }
  // 切换时清空当前拼音序列和候选词
  this.digitSequence = ''
  this.candidateList = []
  this.cval = ''
  this.resultRow0 = []
}
```

#### 5.3.5 代码量估算

| 模块 | 代码量 | 说明 |
|------|:------|------|
| `t9Keys` 映射表 | 10 行 | 数字→字母映射 |
| `onT9Key()` 中文输入 | 25 行 | 按键处理，数字序列累积，候选词匹配 |
| `onT9KeyEnglish()` 英文输入 | 20 行 | T9 英文连按，800ms 超时确认 |
| `toggleKeyboardMode()` | 10 行 | 全键盘 ↔ 9键 切换 |
| 9键键盘模板 | 55 行 | 3×4 键位 + 功能键 |
| 底部切换栏 | 10 行 | 键盘切换按钮 |
| 9键键盘样式 | 70 行 | 大按键、圆角、双层标签 |
| **总计** | **~200 行** | 在现有 `chinese-input.ux` 内共存 |

### 5.4 方案三：直接默认全键盘（最简单）

如果用户只是想要全键盘，当前 `chinese-input.ux` **本身就是默认全键盘**。问题可能是某些用户不知道如何从数字键盘切回全键盘。

**解决方案**：在数字符号键盘模式下，将底行的 `ABC` 按钮做得更醒目（加大、加色、加文字提示），让用户一眼就能看到切回全键盘的方式。

---

## 六、全键盘 vs 9键 对比

| 维度 | 全键盘 QWERTY | 9键 T9 |
|------|:----------:|:----:|
| 单键宽度 | 26-30px | 56-64px |
| 单键触摸面积 | ~780px² | ~3360px²（**4.3倍**） |
| 误触概率 | 高（手指覆盖 2-3 键） | 低（一键一目了然） |
| 中文输入方式 | 逐字母输入拼音 | 数字序列，按键次数更少 |
| 英文输入方式 | 直接按字母 | 需 T9 连按（同键多次） |
| 符号输入 | 方便 | 需切换到符号键盘 |
| 用户习惯 | 电脑用户 | 手机用户（大多数中国人） |
| 界面空间占用 | 10 列 | 仅需 4 列 |

**结论**：手环设备上，9 键为主、全键盘为备选是最佳方案，两者通过一键切换共存。

---

## 七、推荐实施步骤

1. **Phase 1（立即）**：在数字键盘底行增强 `ABC` 按钮的视觉提示，让用户知道如何切回全键盘
2. **Phase 2（短期）**：在 `chinese-input.ux` 中实现 9 键 T9 键盘，与全键盘共存
3. **Phase 3（中期）**：增加底部 `[ 9键 ◉ 全键盘 ]` 切换按钮，让用户一键切换

---

## 八、总结

| 项目 | 当前状态 |
|------|----------|
| 全键盘（QWERTY） | ✅ 已实现，是默认键盘 |
| 数字符号键盘 | ✅ 已实现，通过 `123`/`ABC` 按钮切换 |
| 英文大小写切换 | ✅ 已实现，通过 Shift 按钮 |
| 中文/英文切换 | ✅ 已实现，通过 `中`/`EN` 按钮 |
| 9键 T9 键盘 | ❌ 仅设计文档，未实现 |
| 全键盘 ↔ 9键切换按钮 | ❌ 未实现，依赖 9键键盘完成 |
| 字体大小调节 | ✅ 已实现，6 档可调 |

**核心结论**：全键盘已经存在且是默认布局。如果要增加"切换按钮"，最实际的是实现 9 键 T9 键盘并增加全键盘↔9键的切换按钮，这样既满足习惯全键盘的用户（默认保留），也满足想要大按键的用户（一键切到 9 键）。

---

## 九、重新启用旧版 InputMethod 浮动键盘的可行性分析

### 9.1 背景

旧版 `InputMethod.ux` 浮动图片键盘（60×60px 大按键，带横向滚动）在很多其他手环项目中是默认标配，不少用户已经形成了使用习惯。当前 release 包解压后约 1.5MB，是否有空间重新启用？

### 9.2 旧版被废弃的真正原因

旧版被废弃**不是因为包体积大**，而是因为**内存架构问题**：

| 旧架构（已废弃） | 新架构（当前） |
|:--|:--|
| 6 个页面各自 `<import>` 并嵌入 `InputMethod` 组件 | 所有页面统一跳转到 `chinese-input.ux` |
| 词库（dic.js + dic_words.js 等 110KB）被**重复打包 6 次** | 词库**只打包一次** |
| 每个页面 JS 膨胀到 **1MB+** | 单页面 JS 约 **533KB** |
| 手环加载时**内存不足，系统崩溃重启** | 内存正常，稳定运行 |

**核心洞察**：问题的根源是"重复打包"，而不是组件本身。现在统一页面的架构已经解决了这个根本问题。

### 9.3 当前状态：旧版组件是否真的"删了"？

| 文件 | 是否还在 | 是否被引用 |
|------|:--:|:--:|
| `src/components/InputMethod/InputMethod.ux`（847 行） | ✅ 存在 | ❌ 零引用 |
| `build/components/InputMethod/assets/` 51 张 PNG | ✅ 仍在 build 产物中 | ❌ 无 JS 引用 |
| `build/pages/chinese-input/chinese-input.js` | ✅ 使用中 | 仅引用 `dicUtil.js` 等引擎文件 |

**关键发现**：51 张 PNG 图片（arc/ 12张 + full/ 26张 + horizontal/ 13张）**仍然被复制到了 build 产物中**，但没有任何 JS 代码引用它们。这说明构建工具（rspack）没有做 tree-shaking 来移除未使用的静态资源，这 51 张 PNG 是**白占空间的死资源**。

### 9.4 重新启用的增量成本

如果只在 `chinese-input.ux` 中重新引入 `InputMethod` 组件（单一实例，不会重复打包）：

| 成本项 | 增量 | 说明 |
|--------|:---:|------|
| PNG 图片 | 0（已存在） | 51 张 PNG 已经在 build 中，只是没被引用 |
| InputMethod.ux 组件 JS | ~20KB | 编译后的组件逻辑 |
| 字典文件 | 0（已存在） | dicUtil.js 等已被 chinese-input.ux 引用 |
| 总增量 | **~20KB** | 因为图片已经在包里了 |

**结论：增量成本极低，几乎不影响包体积。**

### 9.5 两种启用方案

#### 方案 A：完全替换

删除 `chinese-input.ux` 中的内联键盘，改用 `InputMethod` 组件。

- 优点：改动最小，按键大（60×60px），用户熟悉
- 缺点：需要横向滑动找键，打字效率降低；失去内联键盘的零依赖优势

#### 方案 B：双键盘共存 + 切换按钮（推荐）⭐

在 `chinese-input.ux` 中同时保留内联精简键盘和 `InputMethod` 浮动键盘，通过底部按钮切换。

- 优点：用户自由选择；两种键盘共享同一套拼音引擎；内联键盘代码完全不动
- 缺点：需要处理 InputMethod 组件的事件桥接；两种键盘的状态管理需要同步

### 9.6 建议

| 方案 | 推荐度 | 适用场景 |
|------|:--:|------|
| 方案 A：完全替换 | ⭐⭐ | 只想快速恢复大按键体验 |
| 方案 B：双键盘共存 | ⭐⭐⭐⭐⭐ | 兼顾两类用户，体验最佳 |

---

## 十、方案 B 详细实施计划：双键盘共存

### 10.1 目标

在 `chinese-input.ux` 中同时集成两种键盘风格，用户可通过底部按钮一键切换：

| 键盘风格 | 说明 | 按键大小 | 是否需要横滚 |
|----------|------|:--:|:--:|
| `compact`（精简内联） | 当前使用的纯 text 键盘 | 26-30px | ❌ |
| `full`（浮动大按键） | 旧版 InputMethod 组件 | 60×60px | ✅ |

### 10.2 整体布局设计

```
┌──────────────────────────────────────┐
│                                     │
│          输入内容显示区               │  ← 用户已输入的文字
│          (inputValue)                │
│                                     │
├──────────────────────────────────────┤
│  拼音: n  i     h  a  o             │  ← cval 分词显示
├──────────────────────────────────────┤
│  你好  你  尼  拟  逆  泥  倪  ...  │  ← resultRow0 候选词
├──────────────────────────────────────┤
│                                      │
│    [精简键盘] 或 [InputMethod键盘]   │  ← 根据 keyboardStyle 切换
│                                      │
├──────────────────────────────────────┤
│  [ A- ]  [ 字体: 28 ]  [ A+ ]      │  ← 字体大小调节（已有）
├──────────────────────────────────────┤
│  键盘风格:  [ 精简 ◉ 大按键 ]       │  ← 新增切换按钮
└──────────────────────────────────────┘
```

### 10.3 改动文件清单

| 文件 | 改动类型 | 改动量 |
|------|:--:|:--:|
| [chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux) | 修改 | +80 行 |
| [InputMethod.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux) | 不改动 | 0 |

**只改一个文件**，InputMethod.ux 零改动。

### 10.4 详细改动步骤

#### Step 1：新增状态变量

在 `chinese-input.ux` 的 `<script>` 中 `data()` 或 `private` 区域新增：

```javascript
keyboardStyle: 'compact',  // 'compact' | 'full'
```

#### Step 2：新增切换方法

```javascript
toggleKeyboardStyle() {
  if (this.keyboardStyle === 'compact') {
    this.keyboardStyle = 'full'
  } else {
    this.keyboardStyle = 'compact'
  }
  // 切换键盘时清空当前拼音状态
  this.cval = ''
  this.resultRow0 = []
  // 如果 InputMethod 有独立的候选词状态，也需清空
  this.$refs.inputMethod && this.$refs.inputMethod.clearCval()
}
```

#### Step 3：模板中条件渲染两种键盘

```html
<!-- ========== 精简内联键盘（当前版本，默认） ========== -->
<div class="keyboard-wrapper" show="{{ !hideKeyboard && keyboardStyle === 'compact' }}">
  <!-- 已有的字母键盘和数字键盘代码，完全不动 -->
  <div class="keyboard" show="{{ !numFlag }}">
    <!-- QWERTY 字母键盘 -->
  </div>
  <div class="keyboard" show="{{ numFlag }}">
    <!-- 数字符号键盘 -->
  </div>
</div>

<!-- ========== InputMethod 浮动大键盘（旧版） ========== -->
<input-method
  id="inputMethod"
  show="{{ !hideKeyboard && keyboardStyle === 'full' }}"
  hide="{{ false }}"
  maxlength="{{ maxlen }}"
  vibratemode="short"
  screentype="rect"
  @key-down="onInputMethodKeyDown"
  @delete="onInputMethodDelete"
  @complete="onInputMethodComplete"
></input-method>
```

#### Step 4：桥接 InputMethod 事件

```javascript
// InputMethod 每按一个键触发
onInputMethodKeyDown(evt) {
  var content = evt.detail.content
  if (content) {
    this.inputValue += content
  }
  // 触发振动反馈（InputMethod 内部已有，但这里确保一致）
  if (this.vibrateEnabled) {
    vibrator.vibrate({ mode: 'short' })
  }
},

// InputMethod 删除键触发
onInputMethodDelete() {
  if (this.inputValue.length > 0) {
    this.inputValue = this.inputValue.slice(0, -1)
  }
},

// InputMethod 完成一次输入（如选了候选词后确认）
onInputMethodComplete(evt) {
  var content = evt.detail.content
  if (content) {
    this.inputValue += content
  }
}
```

#### Step 5：底部新增切换按钮

在字体调节栏下方新增一行：

```html
<!-- 键盘风格切换栏 -->
<div class="font-size-bar" style="margin-top: 4px;">
  <text class="font-size-label">键盘风格</text>
  <div class="font-size-options">
    <div class="font-size-option {{ keyboardStyle === 'compact' ? 'font-size-active' : '' }}"
         @click="switchToCompact">
      <text>精简</text>
    </div>
    <div class="font-size-option {{ keyboardStyle === 'full' ? 'font-size-active' : '' }}"
         @click="switchToFull">
      <text>大按键</text>
    </div>
  </div>
</div>
```

```javascript
switchToCompact() {
  this.keyboardStyle = 'compact'
  this.cval = ''
  this.resultRow0 = []
},

switchToFull() {
  this.keyboardStyle = 'full'
  this.cval = ''
  this.resultRow0 = []
}
```

#### Step 6：import InputMethod 组件

在 `<script>` 顶部新增 import：

```javascript
import InputMethod from '../../components/InputMethod/InputMethod.ux'
```

并在 `export default` 中注册：

```javascript
export default {
  components: { InputMethod },
  // ... 其他代码
}
```

### 10.5 InputMethod 组件 API 参考

| 属性/事件 | 类型 | 说明 |
|-----------|------|------|
| `hide` | Boolean | 是否隐藏键盘 |
| `maxlength` | Number | 最大输入长度 |
| `vibratemode` | String | 振动模式：`'short'` / `'long'` / `''` |
| `screentype` | String | 屏幕类型：`'circle'` / `'rect'` / `'pill-shaped'` |
| `@key-down` | Event | 按键按下，`evt.detail.content` 为按键内容 |
| `@delete` | Event | 删除键按下 |
| `@complete` | Event | 输入完成（选候选词后） |
| `@visibility-change` | Event | 键盘显示/隐藏状态变化 |

**注意**：InputMethod 组件内部有完整的拼音输入引擎（`cval`, `resultRow0`, `dicUtil` 等），与 `chinese-input.ux` 的拼音引擎是**独立的两个实例**。在 compact 模式下使用 chinese-input.ux 自己的引擎，在 full 模式下使用 InputMethod 内部的引擎，两者互不干扰。切换时清空状态即可。

### 10.6 用户交互流程

```
用户进入输入页面
       │
       ▼
  ┌──────────────┐
  │ 默认 compact │  ← 精简内联键盘，全键可见，无需横滚
  │  键盘风格    │
  └──────┬───────┘
         │
         │ 用户点击底部 [大按键] 按钮
         ▼
  ┌──────────────┐
  │  full 大按键  │  ← 浮动图片键盘，60×60px 大按键，需横滚
  │  键盘风格    │
  └──────┬───────┘
         │
         │ 用户点击底部 [精简] 按钮
         ▼
  ┌──────────────┐
  │ 回到 compact │
  └──────────────┘
```

### 10.7 状态持久化

用户偏好可以保存到本地存储，下次打开记住选择：

```javascript
// 初始化时读取偏好
onInit() {
  var saved = storage.getSync('keyboard_style', 'compact')
  this.keyboardStyle = saved
}

// 切换时保存偏好
switchToCompact() {
  this.keyboardStyle = 'compact'
  storage.setSync('keyboard_style', 'compact')
  this.cval = ''
  this.resultRow0 = []
}
```

### 10.8 体积影响

| 项目 | 当前 | 实施后 | 增量 |
|------|:---:|:---:|:--:|
| chinese-input.js | ~533KB | ~553KB | +20KB |
| PNG 图片 | 51 张（死资源） | 51 张（活资源） | 0 |
| RPK 总大小 | ~1.5MB | ~1.52MB | +20KB |
| 内存占用 | 低 | 略高（一个组件实例） | 可忽略 |

### 10.9 实施步骤汇总

| 步骤 | 内容 | 改动量 |
|:--:|------|:--:|
| 1 | 新增 `keyboardStyle` 状态变量 | +1 行 |
| 2 | 新增 `toggleKeyboardStyle()` / `switchToCompact()` / `switchToFull()` 方法 | +15 行 |
| 3 | 模板中 compact 键盘加 `show` 条件 | +2 行（修改现有） |
| 4 | 模板中新增 `<input-method>` 标签 | +8 行 |
| 5 | 新增 `onInputMethodKeyDown/Delete/Complete` 事件处理 | +20 行 |
| 6 | 新增底部切换按钮 UI | +15 行 |
| 7 | import 并注册 InputMethod 组件 | +2 行 |
| 8 | 状态持久化（可选） | +10 行 |
| **总计** | | **~73 行** |

### 10.10 风险与注意事项

| 风险 | 级别 | 应对 |
|------|:--:|------|
| InputMethod 内部拼音引擎与 chinese-input.ux 的引擎是两个独立实例，切换时拼音状态残留 | 低 | 切换时清空两边状态 |
| InputMethod 在某些屏幕尺寸下横向滚动体验不佳 | 低 | 仅 rect 屏使用，该屏幕已适配过 |
| 51 张 PNG 从死资源变活资源，构建时间略增 | 极低 | 影响可忽略 |
| compact 和 full 键盘的字体大小调节可能不同步 | 低 | 需确认 InputMethod 支持字体调节，或仅 compact 模式支持 |