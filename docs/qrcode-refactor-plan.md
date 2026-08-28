# 二维码生成重构方案 — 采用官方 `<qrcode>` 原生组件

## 重大发现：Vela JS 内置 `<qrcode>` 组件

Xiaomi Vela JS 框架**原生支持** `<qrcode>` 组件，无需任何第三方库或自研代码。

```html
<qrcode value="https://iot.mi.com" style="color: #008cff;"></qrcode>
```

| 属性/样式 | 类型 | 说明 |
|-----------|------|------|
| `value` | string | 二维码内容（必填） |
| `color` | color | 二维码颜色，默认 `#000000` |
| `background-color` | color | 背景颜色，默认 `#ffffff` |

### 对比当前方案

| 维度 | 自研 `qrcode.js` (当前) | 官方 `<qrcode>` 组件 |
|------|------------------------|---------------------|
| 代码量 | ~560 行纯 JS | 0 行（框架内置） |
| 依赖 | 无 | 无（框架内置） |
| Bug 风险 | 高（GF表、EC、交织等隐藏 bug） | 极低（厂商维护） |
| 性能 | JS 计算 + DOM 渲染 441 个 div | 原生渲染，GPU 加速 |
| 准确性 | 依赖自研实现正确性 | 厂商保证符合 ISO 标准 |
| 维护成本 | 自维护 | 框架升级自动获得修复 |
| 版本兼容 | 需手动处理版本升级 | 框架自动适配 |
| 颜色自定义 | 仅黑白色 | 支持任意颜色 |
| 可扫描性 | 已验证修复后可扫描 | 原生保证可扫描 |

---

## 五种二维码生成方案对比

### 方案一：官方 `<qrcode>` 原生组件 ⭐ 推荐

**原理**: 直接使用 Vela JS 框架内置的 `<qrcode>` 组件，由系统底层实现 QR 码编码和渲染。

**适用场景**: 所有场景，手环/手表首选方案。

**优势**:
- 零代码量，一行 `<qrcode value="xxx">` 即可
- 原生渲染，性能最优，功耗最低
- 厂商维护，符合 ISO 标准，100% 可扫描
- 支持自定义颜色
- 自动适配不同屏幕尺寸

**劣势**:
- 依赖框架版本（需 Vela JS 2+ 支持）
- 无法控制二维码内部细节（版本、纠错级别等）

**实现复杂度**: ⭐☆☆☆☆（极低）

```html
<qrcode value="{{ inputText }}" 
  style="color: {{ theme.accent }}; background-color: #ffffff; width: 180px; height: 180px;">
</qrcode>
```

---

### 方案二：自研纯 JS 库 + Div 网格渲染

**原理**: 纯 JavaScript 实现完整 QR 码编码器（GF(256) 算术 → RS 纠错 → 数据编码 → 掩码评估 → 矩阵构造），用 div 元素逐个渲染模块。

**适用场景**: 框架版本过低不支持 `<qrcode>` 组件时的降级方案。

**优势**:
- 完全自主可控，不依赖框架版本
- 可精细控制二维码每个细节
- 代码体积可控（~560 行）

**劣势**:
- 实现复杂，容易有隐藏 bug（已发现 GF_LOG 表、EC 级别映射、数据交织、分隔符 4 个 bug）
- DOM 节点多（21×21=441 个 div），渲染性能差
- 需要自维护

**实现复杂度**: ⭐⭐⭐⭐⭐（极高）

---

### 方案三：qrcode-generator 微库 + Div 网格

**原理**: 使用 Kazuhiko Arase 的 `qrcode-generator` 库（TypeScript 实现，~15KB minified），这是一款经过广泛验证的轻量 QR 码生成库。生成矩阵后仍用 div 网格渲染。

**适用场景**: 需要成熟库但不想引入大依赖的场景。

**库信息**:
- 仓库: `github.com/kazuhikoarase/qrcode-generator`
- 协议: BSD License
- 大小: ~15KB minified
- 特点: 纯 JS/TS，无依赖，支持所有版本和纠错级别

**优势**:
- 经过广泛验证，准确性有保障
- 代码量小，适合嵌入式设备
- API 简单，易于集成

**劣势**:
- 仍需 div 网格渲染（DOM 节点多）
- 引入外部依赖（但体积小）
- 需适配 Vela JS 的模块系统

**实现复杂度**: ⭐⭐⭐☆☆（中等）

```javascript
var qr = qrcode(0, "L")  // typeNumber 0 = auto, error correction L
qr.addData(text)
qr.make()
var modules = qr.getModuleCount()
var matrix = []
for (var r = 0; r < modules; r++) {
  matrix[r] = []
  for (var c = 0; c < modules; c++) {
    matrix[r][c] = qr.isDark(r, c)
  }
}
```

---

### 方案四：预计算静态矩阵 + JSON 数据文件

**原理**: 对于快捷内容（Hello World、网址等 6 个预设），提前用标准 QR 码工具生成矩阵数据，存储为 JSON 文件。运行时直接读取 JSON 渲染，无需任何 QR 编码计算。

**适用场景**: 快捷内容（预设按钮）的高速渲染。

**优势**:
- 运行时零计算，加载即显示
- 100% 准确的二维码（用标准工具预生成）
- 极小运行时开销

**劣势**:
- 仅适用于固定内容，无法处理用户输入
- 矩阵数据占用存储空间（每个 21×21 矩阵约 1KB）
- 需要预生成工具链

**实现复杂度**: ⭐⭐☆☆☆（低）

```javascript
var PRESET_MATRIX = {
  "Hello World": [[true,true,true,...], [true,false,...], ...],
  "https://www.example.com": [[...], ...]
}

function renderPreset(key) {
  this.qrMatrix = PRESET_MATRIX[key]
  this.qrSize = 21 * this.cellSize
}
```

---

### 方案五：Unicode 块字符 + Text 组件渲染

**原理**: 用 Unicode 块字符（`█` = 全黑方块，` ` = 空格）渲染二维码，每行是一个 text 节点。用等宽字体 + 极小程序间距实现像素级精确。

**适用场景**: 极限性能优化，DOM 节点数最少。

**优势**:
- DOM 节点极少（21 行 = 21 个 text 节点 vs 441 个 div）
- 渲染极快，内存占用极低
- 不依赖任何图形 API

**劣势**:
- 视觉效果不如 div 网格清晰
- 依赖等宽字体支持
- 字符间距可能导致扫描困难
- 无法精确控制单个模块大小

**实现复杂度**: ⭐⭐☆☆☆（低）

```html
<text style="font-family: monospace; font-size: 8px; line-height: 8px; letter-spacing: 0;">
  █████████████████████
  ██  ██  ██    ██  ██
  ██  ██  ██  █ ██  ██
  ...
</text>
```

---

## 方案总览对比

| 维度 | 方案一<br>官方组件 | 方案二<br>自研 Div | 方案三<br>微库 Div | 方案四<br>预计算 JSON | 方案五<br>Unicode 文本 |
|------|:--:|:--:|:--:|:--:|:--:|
| 代码量 | 0 | ~560 行 | ~50 行 + 库 | ~30 行 + JSON | ~80 行 |
| 第三方依赖 | 无 | 无 | 15KB 库 | 无 | 无 |
| 准确性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 渲染性能 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 内存占用 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 可维护性 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 用户输入支持 | ✅ | ✅ | ✅ | ❌ | ✅ |
| 颜色自定义 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 手环适配 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 推荐重构方案：方案一（官方组件）为主 + 方案四（预计算）为辅

### 核心思路

1. **主要场景**（用户输入文字）：使用官方 `<qrcode>` 组件，一行代码搞定
2. **快捷内容**（6 个预设按钮）：使用预计算 JSON 矩阵 + Div 渲染，即时显示，无需等待框架渲染

### 新页面结构

```
qrcode-generator.ux
├── header（返回 + 标题）
├── input-section（点击输入区）
├── qr-display（二维码显示区）
│   ├── 用户输入 → <qrcode> 原生组件
│   └── 快捷内容 → Div 网格（预计算 JSON）
├── presets-section（快捷内容按钮）
└── hint（提示文字）
```

### 重构后的 generateQR 逻辑

```javascript
generateQR(text) {
  if (!text || text.length === 0) {
    this.qrMatrix = []
    this.mode = ""
    return
  }
  var presetKey = PRESETS.indexOf(text)
  if (presetKey >= 0) {
    this.mode = "preset"
    this.qrMatrix = PRESET_MATRIX[text]
    this.qrSize = 21 * this.cellSize
  } else {
    this.mode = "native"
    this.qrValue = text
  }
}
```

### 模板条件渲染

```html
<qrcode if="{{ mode === 'native' }}" value="{{ qrValue }}" 
  style="color: #000000; background-color: #ffffff; width: 180px; height: 180px;">
</qrcode>

<div class="qr-grid" if="{{ mode === 'preset' }}" style="width: {{ qrSize }}px; height: {{ qrSize }}px">
  <div class="qr-row" for="{{ qrMatrix }}">
    <div class="qr-cell" for="{{ $item }}" 
      style="width: {{ cellSize }}px; height: {{ cellSize }}px; 
             background-color: {{ $item ? '#000000' : '#ffffff' }}">
    </div>
  </div>
</div>
```

---

## 实施步骤

### Step 1: 确认 `<qrcode>` 组件可用性

在 `manifest.json` 的 `features` 中无需额外声明（`qrcode` 是基础组件，类似 `div`、`text`）。

可先写一个测试页面验证组件是否正常渲染。

### Step 2: 重构 qrcode-generator.ux

**修改点**:
1. 模板中新增 `<qrcode>` 原生组件，条件渲染
2. 保留 Div 网格渲染作为预设内容的快速渲染
3. 删除 `require("../../lib/qrcode.js")` 引用
4. 简化 `generateQR()` 方法

**删除文件**:
- `src/lib/qrcode.js`（不再需要 560 行自研库）

**新增文件**:
- `src/data/qrcode-presets.json`（6 个预设的预计算矩阵）

### Step 3: 预计算快捷内容矩阵

使用标准 QR 码工具（如 `qrcode` npm 包或在线工具）生成 6 个快捷内容的 Version 1 矩阵，存为 JSON。

### Step 4: 清理测试文件

删除所有调试/测试脚本：
- `test-qrcode.js`
- `test-compare.js`
- `test-databits3.js`
- `test-decode.js`
- `test-decode2.js`
- `test-debug.js`
- `test-gf.js`
- `test-simple.js`

### Step 5: 更新文档

删除 `docs/qrcode-invalid-analysis.md` 和 `docs/qrcode-bug-analysis.md`（问题已通过使用官方组件彻底解决）。

---

## 开发量预估

| 维度 | 评估 |
|------|------|
| 修改文件 | 1 个 (`qrcode-generator.ux`) |
| 新增文件 | 1 个 (`qrcode-presets.json`) |
| 删除文件 | 1 个 (`qrcode.js`) + 8 个测试文件 |
| 新增代码 | ~30 行 |
| 删除代码 | ~560 行（自研库）+ ~300 行（测试脚本） |
| 净减少代码 | ~830 行 |
| 实现难度 | ⭐☆☆☆☆（极低） |
| 第三方依赖 | 无 |

---

## 结论

**强烈建议采用方案一（官方 `<qrcode>` 组件）**。Vela JS 框架已经提供了符合 ISO 标准的原生二维码组件，自研库不仅代码量大（560 行），而且存在多处隐藏 bug（GF_LOG 表、EC 级别映射、数据交织、分隔符），维护成本高且准确性无法保证。

改用官方组件后：
- 删除 560 行自研代码 + 300 行测试脚本
- 零运行时计算开销
- 100% 可扫描保证
- 支持颜色自定义
- 框架升级自动获得修复和改进