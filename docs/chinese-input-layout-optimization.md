# 输入法页面布局优化方案

## 问题清单

### 问题 1：拼音行（pinyin-row）高度太小，文字被裁切

**现象**：输入拼音字母后，上方显示的拼音字符串被纵向裁切，只看到上半部分。

**原因**：

| 样式 | 当前值 | 问题 |
|------|--------|------|
| `.pinyin-row` height | 22px（手表）/ 20px（胶囊）/ 18px（方形） | 固定高度太小 |
| `.pinyin-text` font-size | 动态 `inputFontSize`（28px+） | 文字比容器高 |
| `.pinyin-text` lines | 1 | 限制了单行，但高度不够仍然裁切 |

**修复**：将 `height` 改为 `min-height`，让容器自适应文字高度，同时保留 `lines: 1` 防止多行溢出。

```css
.pinyin-row {
  min-height: 22px;    /* 从 height 改为 min-height */
  padding: 2px 0;      /* 新增，给文字上下留空间 */
  margin-bottom: 2px;
  padding-left: 8px;
}

.pinyin-text {
  font-weight: bold;
  lines: 1;
  text-overflow: ellipsis;
  /* 移除 font-size: 28px，由 inline style 控制 */
}
```

---

### 问题 2：底部切换按钮文字换行

**现象**：`123`/`ABC`、`Shift`、`EN`/`中` 按钮文字出现换行，显示不全。

**原因**：

- `.key-func` 有 `flex: 1` 和 `max-width: 60px`，但没有 `lines: 1` 限制
- 底部行只有 2-3 个按钮，flex 拉伸后高度可能不够
- 缺少 `text-overflow: ellipsis` 防止溢出

**修复**：

```css
.key-func {
  flex: 1;
  max-width: 60px;
  min-height: 28px;
  font-weight: bold;
  text-align: center;
  border-radius: 6px;
  margin-left: 2px;
  margin-right: 2px;
  lines: 1;                    /* 新增：禁止换行 */
  text-overflow: ellipsis;     /* 新增：溢出省略 */
  /* 移除 font-size: 28px，由 inline style 控制 */
}
```

---

### 问题 3：字体设置栏太靠下

**现象**：底部字体大小按钮紧贴屏幕边缘，操作不便。

**原因**：

- `.font-bar` 的 `margin-top: 4px` 和 `padding: 4px 0` 太紧凑
- `.input-page` 底部 `padding: 8px` 不够

**修复**：

```css
.font-bar {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 8px 0 12px 0;    /* 从 4px 增加到 8px/12px */
  margin-top: 8px;           /* 从 4px 增加到 8px */
}

.input-page {
  padding: 44px 8px 12px 8px;  /* 底部 padding 从 8px 增加到 12px */
}
```

---

### 问题 4：字体大小选项不合理

**现象**：最小 28px 对某些场景仍然太大，缺少更小的选项；76px 过大。

**当前**：28, 36, 48, 62, 76

**建议**：20, 24, 28, 36, 48, 60

```html
<!-- 字体栏 -->
<div class="font-bar" show="{{ !hideKeyboard }}">
  <text class="font-label" style="color: {{ theme.textSecondary }}">字体:</text>
  <text class="font-btn" onclick="setInputFontSize(20)" style="background-color: {{ baseFontSize === 20 ? theme.accent : theme.card }}; color: {{ baseFontSize === 20 ? theme.bg : theme.text }}">20</text>
  <text class="font-btn" onclick="setInputFontSize(24)" style="background-color: {{ baseFontSize === 24 ? theme.accent : theme.card }}; color: {{ baseFontSize === 24 ? theme.bg : theme.text }}">24</text>
  <text class="font-btn" onclick="setInputFontSize(28)" style="background-color: {{ baseFontSize === 28 ? theme.accent : theme.card }}; color: {{ baseFontSize === 28 ? theme.bg : theme.text }}">28</text>
  <text class="font-btn" onclick="setInputFontSize(36)" style="background-color: {{ baseFontSize === 36 ? theme.accent : theme.card }}; color: {{ baseFontSize === 36 ? theme.bg : theme.text }}">36</text>
  <text class="font-btn" onclick="setInputFontSize(48)" style="background-color: {{ baseFontSize === 48 ? theme.accent : theme.card }}; color: {{ baseFontSize === 48 ? theme.bg : theme.text }}">48</text>
  <text class="font-btn" onclick="setInputFontSize(60)" style="background-color: {{ baseFontSize === 60 ? theme.accent : theme.card }}; color: {{ baseFontSize === 60 ? theme.bg : theme.text }}">60</text>
</div>
```

默认值改为 36（中等大小）。

---

### 问题 5：CSS 硬编码 font-size 与 inline style 冲突

**现象**：CSS 中多处写了 `font-size: 28px`，但 inline style 用动态 `inputFontSize`/`keyFontSize`。CSS 值不生效但容易造成混淆。

**修复**：移除以下 CSS 中的 `font-size` 声明，统一由 inline style 控制：

| 类名 | 移除项 |
|------|--------|
| `.display-text` | `font-size: 28px` |
| `.cursor` | `font-size: 28px` |
| `.pinyin-text` | `font-size: 28px` |
| `.candidate-item` | `font-size: 28px` |
| `.key-btn` | `font-size: 28px` |
| `.key-del` | `font-size: 28px` |
| `.key-func` | `font-size: 28px` |

---

### 问题 6：候选词行（candidate-row）高度不足

**现象**：候选词显示区域可能被裁切。

**原因**：`.candidate-row` 固定 `height: 36px`（手表），候选词大小随 `inputFontSize` 变化。

**修复**：改为 `min-height`。

```css
.candidate-row {
  min-height: 36px;     /* 从 height 改为 min-height */
  margin-bottom: 4px;
  padding: 4px 4px;     /* 新增，给文字上下留空间 */
}
```

---

### 问题 7：⚠️ 输入法字体与系统字体会互相干扰（重要）

**现象**：在输入法页面调整字体大小后，系统设置中课程表的字体也跟着变了；反之亦然。

**原因**：输入法页面和系统设置共用同一个 storage key `"baseFontSize"`。

```
系统设置字体 → storage key "baseFontSize" ← 输入法页面字体
                        ↑
                   同一个 key，互相覆盖
```

当前代码：

```javascript
// chinese-input.ux — 读写系统字体
store.getBaseFontSize(function(size) { ... })
store.setBaseFontSize(size, function() { ... })

// store.js — 同一个 key
getBaseFontSize: function(callback) {
  storage.get({ key: "baseFontSize", ... })  // 系统字体
}
```

**修复**：输入法页面使用独立的 storage key `"inputFontSize"`，与系统 `"baseFontSize"` 完全隔离。

```javascript
// chinese-input.ux — 改为独立 key
var INPUT_FONT_KEY = "inputFontSize"
var INPUT_FONT_DEFAULT = 36

function getInputFontSize(callback) {
  storage.get({
    key: INPUT_FONT_KEY,
    success: function(data) {
      var size = parseInt(data) || INPUT_FONT_DEFAULT
      if (size < 20) size = 20
      if (size > 60) size = 60
      callback(size)
    },
    fail: function() { callback(INPUT_FONT_DEFAULT) }
  })
}

function setInputFontSize(size, callback) {
  storage.set({
    key: INPUT_FONT_KEY,
    value: String(size),
    success: function() { if (callback) callback() },
    fail: function() { if (callback) callback() }
  })
}
```

| 对比 | 旧（共享 key） | 新（独立 key） |
|------|----------------|-----------------|
| 输入法字体 | 读写 `"baseFontSize"` | 读写 `"inputFontSize"` |
| 系统字体 | 读写 `"baseFontSize"` | 读写 `"baseFontSize"`（不变） |
| 互相影响 | ❌ 会互相覆盖 | ✅ 完全隔离 |
| 默认值 | 28 | 36 |
| 范围 | 28-76 | 20-60 |

---

## 完整修复汇总

### 模板变更

| 位置 | 变更 |
|------|------|
| 字体栏按钮 | 28/36/48/62/76 → 20/24/28/36/48/60 |
| 默认值 | `baseFontSize: 28` → `baseFontSize: 36` |
| 存储 key | `store.getBaseFontSize` / `store.setBaseFontSize` → 独立 `getInputFontSize` / `setInputFontSize`（key: `"inputFontSize"`） |

### 逻辑变更

| 函数 | 变更 |
|------|------|
| `onInit()` | `store.getBaseFontSize` → `getInputFontSize`（独立 key） |
| `onShow()` | `store.getBaseFontSize` → `getInputFontSize`（独立 key） |
| `setInputFontSize()` | `store.setBaseFontSize` → `setInputFontSize`（独立 key），移除 `store.getFontSizes` 调用 |

### 样式变更

| 类名 | 属性 | 旧值 | 新值 |
|------|------|------|------|
| `.input-page` | padding | `44px 8px 8px 8px` | `44px 8px 12px 8px` |
| `.pinyin-row` | height | `22px` | `min-height: 22px` |
| `.pinyin-row` | padding | 无 | `2px 0` |
| `.pinyin-text` | font-size | `28px` | 移除 |
| `.candidate-row` | height | `36px` | `min-height: 36px` |
| `.candidate-row` | padding | `4px 4px` | `4px 4px` |
| `.candidate-item` | font-size | `28px` | 移除 |
| `.key-btn` | font-size | `28px` | 移除 |
| `.key-del` | font-size | `28px` | 移除 |
| `.key-func` | font-size | `28px` | 移除 |
| `.key-func` | lines | 无 | `1` |
| `.key-func` | text-overflow | 无 | `ellipsis` |
| `.key-func` | min-height | 无 | `28px` |
| `.font-bar` | padding | `4px 0` | `8px 0 12px 0` |
| `.font-bar` | margin-top | `4px` | `8px` |
| `.display-text` | font-size | `28px` | 移除 |
| `.cursor` | font-size | `28px` | 移除 |

### 影响范围

仅修改 `chinese-input.ux` 一个文件，不影响其他页面。