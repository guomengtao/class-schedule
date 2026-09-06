# 字体大小重构方案：删除 scale 乘法，使用直接字体大小

## 一、现状分析

当前全站使用 `scale` 乘法模式来缩放字体：

```
scale = 用户选择的字号 / 48
实际字号 = 基础字号 × scale
```

| 用户选择 | scale | 48px 基础 → 实际 | 28px 基础 → 实际 |
|----------|-------|-------------------|-------------------|
| 28px | 0.583 | 28px | 16px |
| 36px | 0.75 | 36px | 21px |
| 48px | 1.0 | 48px | 28px |
| 62px | 1.292 | 62px | 36px |
| 76px | 1.583 | 76px | 44px |

### 涉及文件（7 个）

| 文件 | 使用方式 |
|------|----------|
| `src/data/store.js` | 定义 `setFontScale`、`getFontScale`、`buildFontStyles` |
| `src/data/storage-tables.js` | 定义 `fontScale` 存储 key |
| `src/app.ux` | 初始化默认 scale |
| `src/pages/settings/settings.ux` | 用户选择字号，写入 scale |
| `src/pages/index/index.ux` | 读取 scale，计算课程名/时间/日期字号 |
| `src/pages/add-course/add-course.ux` | 读取 scale，计算 8 个样式值 |
| `src/pages/detail/detail.ux` | 读取 scale，计算 8 个样式值 |
| `src/pages/chinese-input/chinese-input.ux` | 读取 scale，计算 4 个样式值 |
| `src/pages/backup-restore/backup-restore.ux` | 备份/恢复 `fontScale` key |

### 当前各页面基础字号一览

```
index.ux:         课程名 28  | 时间 24  | 日期标题 36
add-course.ux:    标题 28  | 标签 24  | 提示 20  | 输入 26  | 输入高 80
                  | 按钮 28  | 按钮高 72  | 选择器 36
detail.ux:        (同 add-course.ux)
chinese-input.ux: 显示 17  | 候选 16  | 拼音 14  | 按键 15
settings.ux:      预览 28
```

---

## 二、目标方案

**删除 `scale` 乘法，存储用户选择的字号值（如 36），各页面直接使用像素值，不做乘法运算。**

### 核心改动

```
存储:  scale (0.75)  →  baseFontSize (36)
读取:  28 × scale     →  Math.round(28 × baseFontSize / 48)
```

### 新增公共方法

在 `store.js` 中新增一个通用方法，各页面调用它获取具体字号：

```javascript
// store.js 新增
// 输入用户选择的字号 (28/36/48/62/76)，返回字号表
getFontSizes: function(baseFontSize, callback) {
  var ratio = baseFontSize / 48
  // 防止异常值
  if (ratio < 0.5) { ratio = 0.583 }
  if (ratio > 2.0) { ratio = 1.583 }
  
  callback({
    ratio: ratio,
    // 首页
    courseName:   Math.round(28 * ratio),
    courseTime:   Math.round(24 * ratio),
    dayTitle:     Math.round(36 * ratio),
    // 添加/详情页
    title:        Math.round(28 * ratio),
    label:        Math.round(24 * ratio),
    hint:         Math.round(20 * ratio),
    input:        Math.round(26 * ratio),
    inputHeight:  Math.round(80 * ratio),
    btn:          Math.round(28 * ratio),
    btnHeight:    Math.round(72 * ratio),
    pickerValue:  Math.round(36 * ratio),
    // 中文输入键盘
    display:      Math.round(17 * ratio),
    candidate:    Math.round(16 * ratio),
    pinyin:       Math.round(14 * ratio),
    key:          Math.round(15 * ratio),
    // 设置预览
    preview:      Math.round(28 * ratio)
  })
}
```

---

## 三、逐文件改动清单

### 3.1 `src/data/storage-tables.js`

```diff
- key: "fontScale",
+ key: "baseFontSize",
```

### 3.2 `src/data/store.js`

改动 3 处：

**(a) setFontScale → setBaseFontSize**

```diff
- setFontScale: function(scale, callback) {
-   storage.set({ key: "fontScale", value: String(scale), ... })
- },
+ setBaseFontSize: function(size, callback) {
+   storage.set({ key: "baseFontSize", value: String(size), ... })
+ },
```

**(b) getFontScale → getBaseFontSize**

```diff
- getFontScale: function(callback) {
-   storage.get({ key: "fontScale", success: function(data) {
-     var scale = parseFloat(data)
-     if (!scale || scale < 0.5) { scale = 1.0 }
-     callback(scale)
-   }, fail: function() { callback(1.0) } })
- },
+ getBaseFontSize: function(callback) {
+   storage.get({ key: "baseFontSize", success: function(data) {
+     var size = parseInt(data) || 48
+     if (size < 28) size = 28
+     if (size > 76) size = 76
+     callback(size)
+   }, fail: function() { callback(48) } })
+ },
```

**(c) 新增 getFontSizes（见上文第二节）**

**(d) 删除 `getScaleSafe` 和 `buildFontStyles`**

### 3.3 `src/app.ux`

```diff
- store.getFontScale(function(scale) {
-   if (!scale || scale < 0.5) {
-     store.setFontScale(28 / 48)
-   }
- })
+ store.getBaseFontSize(function(size) {
+   if (!size) {
+     store.setBaseFontSize(48)
+   }
+ })
```

### 3.4 `src/pages/settings/settings.ux`

改动 3 处：

**(a) onInit — 读取字号**

```diff
- store.getFontScale(function(scale) {
-   if (!scale || scale < 0.5) { scale = 1.0 }
-   self.scale = scale
-   self.displaySize = Math.round(48 * scale)
-   self.updatePreviews()
- })
+ store.getBaseFontSize(function(size) {
+   self.displaySize = size
+   self.updatePreviews()
+ })
```

**(b) setSize — 写入字号**

```diff
  setSize(size) {
    this.displaySize = size
-   this.scale = size / 48
-   store.setFontScale(this.scale)
+   store.setBaseFontSize(size)
    this.updatePreviews()
  },
```

**(c) updatePreviews — 使用字号直接计算**

```diff
  updatePreviews() {
-   this.previewClassSize = Math.round(28 * this.scale)
+   var ratio = this.displaySize / 48
+   this.previewClassSize = Math.round(28 * ratio)
  },
```

**(d) 删除 `scale` 数据字段**

```diff
  private: {
-   scale: 1.0,
    displaySize: 48,
    ...
  }
```

### 3.5 `src/pages/index/index.ux`

改动 2 处：

**(a) loadFontScale — 直接用字号**

```diff
  loadFontScale() {
    var self = this
-   store.getFontScale(function(scale) {
-     if (!scale || scale < 0.5) { scale = 1.0 }
-     self.fontScale = scale
-     self.displaySize = Math.round(28 * scale)
-     self.metaFontSize = Math.round(24 * scale)
-     self.dayTitleSize = Math.round(36 * scale)
-   })
+   store.getBaseFontSize(function(size) {
+     var ratio = size / 48
+     self.displaySize = Math.round(28 * ratio)
+     self.metaFontSize = Math.round(24 * ratio)
+     self.dayTitleSize = Math.round(36 * ratio)
+   })
  },
```

**(b) 删除 `fontScale` 数据字段**

```diff
  private: {
-   fontScale: 1.0,
    displaySize: 28,
    ...
  }
```

### 3.6 `src/pages/add-course/add-course.ux`

```diff
  onInit() {
    ...
-   store.getFontScale(function(scale) {
-     self.applyFontScale(scale)
-   })
-   this.applyFontScale(28 / 48)
+   store.getBaseFontSize(function(size) {
+     self.applyFontSize(size)
+   })
+   this.applyFontSize(48)
    ...
  },

- applyFontScale(s) {
-   if (!s || s < 0.5) { s = 1.0 }
+ applyFontSize(size) {
+   var r = size / 48
-   this.titleStyle = "font-size: " + Math.round(28 * s) + "px"
+   this.titleStyle = "font-size: " + Math.round(28 * r) + "px"
-   this.labelStyle = "font-size: " + Math.round(24 * s) + "px"
+   this.labelStyle = "font-size: " + Math.round(24 * r) + "px"
-   this.hintStyle = "font-size: " + Math.round(20 * s) + "px"
+   this.hintStyle = "font-size: " + Math.round(20 * r) + "px"
-   this.inputStyle = "font-size: " + Math.round(26 * s) + "px"
+   this.inputStyle = "font-size: " + Math.round(26 * r) + "px"
-   this.inputHeight = Math.round(80 * s)
+   this.inputHeight = Math.round(80 * r)
-   this.btnStyle = "font-size: " + Math.round(28 * s) + "px"
+   this.btnStyle = "font-size: " + Math.round(28 * r) + "px"
-   this.btnHeight = Math.round(72 * s)
+   this.btnHeight = Math.round(72 * r)
-   this.pickerValueStyle = "font-size: " + Math.round(36 * s) + "px"
+   this.pickerValueStyle = "font-size: " + Math.round(36 * r) + "px"
  },
```

### 3.7 `src/pages/detail/detail.ux`

（与 add-course.ux 完全相同的改动）

### 3.8 `src/pages/chinese-input/chinese-input.ux`

```diff
  onInit() {
    ...
-   store.getFontScale(function(scale) {
-     self.fontScale = scale
-     self.applyFontScale()
-   })
-   this.applyFontScale()
+   store.getBaseFontSize(function(size) {
+     self.baseFontSize = size
+     self.applyFontSize()
+   })
+   this.applyFontSize()
    ...
  },

  onShow() {
-   store.getFontScale(function(scale) {
-     self.fontScale = scale
-     self.applyFontScale()
-   })
+   store.getBaseFontSize(function(size) {
+     self.baseFontSize = size
+     self.applyFontSize()
+   })
  },

- applyFontScale() {
-   var s = this.fontScale
-   if (!s || s < 0.5) { s = 1.0 }
-   var styles = store.buildFontStyles(s, {
-     displayStyle: 17,
-     candidateStyle: 16,
-     pinyinStyle: 14,
-     keyStyle: 15
-   })
-   this.displayStyle = styles.displayStyle
-   this.candidateStyle = styles.candidateStyle
-   this.pinyinStyle = styles.pinyinStyle
-   this.keyStyle = styles.keyStyle
+ applyFontSize() {
+   var r = this.baseFontSize / 48
+   this.displayStyle = "font-size: " + Math.round(17 * r) + "px"
+   this.candidateStyle = "font-size: " + Math.round(16 * r) + "px"
+   this.pinyinStyle = "font-size: " + Math.round(14 * r) + "px"
+   this.keyStyle = "font-size: " + Math.round(15 * r) + "px"
  },
```

**(b) 删除 `fontScale` 数据字段，改为 `baseFontSize`**

```diff
  private: {
-   fontScale: 1.0,
+   baseFontSize: 48,
    ...
  }
```

### 3.9 `src/pages/backup-restore/backup-restore.ux`

```diff
- "fontScale",
+ "baseFontSize",
```

### 3.10 `src/data/store.js` — 删除废弃方法

```diff
- getScaleSafe: function(callback) { ... },
- buildFontStyles: function(scale, bases) { ... },
```

### 3.11 `scripts/data-keys.json`

```diff
- "fontScale": "number",
+ "baseFontSize": "number (28|36|48|62|76)",
```

---

## 四、对比总结

| 维度 | 旧方案 (scale) | 新方案 (baseFontSize) |
|------|---------------|----------------------|
| 存储值 | `0.75`（无意义小数） | `36`（有意义的像素值） |
| 各页面计算 | `28 × 0.75` | `28 × 36/48` |
| 可读性 | 差，不知道 0.75 代表什么 | 好，36 就是用户选择的字号 |
| 调试 | 需要心算乘法 | 直接看到像素值 |
| 存储 key | `fontScale` | `baseFontSize` |
| 边界检查 | `scale < 0.5` | `size < 28 \|\| size > 76` |

**数学上等价，但存储和可读性大幅改善。**

---

## 五、可选简化方案

如果觉得每个页面都算 `ratio = size / 48` 还是麻烦，可以在 `store.js` 中直接提供像素值表：

```javascript
getFontSizes: function(callback) {
  this.getBaseFontSize(function(size) {
    var r = size / 48
    callback({
      courseName:  Math.round(28 * r),
      courseTime:  Math.round(24 * r),
      dayTitle:    Math.round(36 * r),
      title:       Math.round(28 * r),
      label:       Math.round(24 * r),
      hint:        Math.round(20 * r),
      input:       Math.round(26 * r),
      inputHeight: Math.round(80 * r),
      btn:         Math.round(28 * r),
      btnHeight:   Math.round(72 * r),
      pickerValue: Math.round(36 * r),
      display:     Math.round(17 * r),
      candidate:   Math.round(16 * r),
      pinyin:      Math.round(14 * r),
      key:         Math.round(15 * r),
      preview:     Math.round(28 * r)
    })
  })
}
```

各页面只需：

```javascript
store.getFontSizes(function(sizes) {
  self.displaySize = sizes.courseName
  self.metaFontSize = sizes.courseTime
  self.dayTitleSize = sizes.dayTitle
})
```

---

## 六、优点分析

### 6.1 可读性大幅提升

```javascript
// 旧方案：scale = 0.583，这是什么意思？
store.getFontScale(function(scale) {
  self.displaySize = Math.round(28 * scale)  // 28 × 0.583 = ?
})

// 新方案：baseFontSize = 28，一目了然
store.getBaseFontSize(function(size) {
  self.displaySize = Math.round(28 * size / 48)  // 28 × 28/48 = 16
})
```

存储的值从 `0.583` 变成 `28`，调试时无需心算就能知道用户选了什么字号。

### 6.2 调试友好

- 旧方案：在 storage 中看到 `"fontScale": "0.75"`，需要回忆 `48 × 0.75 = 36` 才知道用户选了 36px
- 新方案：在 storage 中看到 `"baseFontSize": "36"`，直接就是用户的选择

### 6.3 边界检查更直观

```javascript
// 旧：scale 边界检查，0.5 和 2.0 意义不明
if (!scale || scale < 0.5) { scale = 1.0 }

// 新：直接用像素值，28 和 76 就是字号档位
if (size < 28) size = 28
if (size > 76) size = 76
```

### 6.4 减少中间变量

每个页面不再需要维护 `fontScale` 这个中间变量，只保留最终需要的像素值。例如 `index.ux`：

```diff
- fontScale: 1.0,    // 删掉
  displaySize: 28,    // 保留
  metaFontSize: 24,   // 保留
  dayTitleSize: 36,   // 保留
```

### 6.5 统一计算入口

通过 `store.getFontSizes()` 集中管理所有字号计算，各页面不再各自实现 `applyFontScale` 方法。新增页面或调整字号时，只需修改一处。

### 6.6 存储语义清晰

`"baseFontSize": "36"` 比 `"fontScale": "0.75"` 更符合"存什么就是什么"的原则，减少理解成本。

---

## 七、缺点分析

### 7.1 改动范围较大

涉及 **9 个文件**，每个文件都需要修改。虽然单文件改动量不大，但需要逐个测试验证。

### 7.2 存储 key 变更，存在兼容性风险

```diff
- key: "fontScale"
+ key: "baseFontSize"
```

**风险场景**：已有用户设备上存储了 `fontScale`，升级后读取不到 `baseFontSize`，会使用默认值 48，用户之前调整的字号会丢失。

**缓解措施**：在 `app.ux` 或 `store.js` 中加入迁移逻辑：

```javascript
// 迁移：尝试读取旧 key，迁移到新 key
storage.get({ key: "fontScale", success: function(data) {
  var oldScale = parseFloat(data)
  if (oldScale && oldScale >= 0.5) {
    var newSize = Math.round(48 * oldScale)
    storage.set({ key: "baseFontSize", value: String(newSize) })
    storage.delete({ key: "fontScale" })  // 清理旧 key
  }
}})
```

### 7.3 数学本质未变

`28 × 36/48` 和 `28 × 0.75` 没有任何区别，只是换了表达方式。此次重构不会改变任何视觉效果，纯粹是代码层面的优化。

### 7.4 页面仍需计算 ratio

即使改为 `baseFontSize`，各页面仍然需要 `ratio = size / 48` 这一步。除非使用第五节的可选简化方案（`getFontSizes` 统一返回像素值），否则改动只是"换了个名字"。

### 7.5 单元测试缺失

当前项目没有字体大小相关的自动化测试，改动后只能靠手动在各页面目视检查，回归测试成本较高。

---

## 八、全站禁用 scale 的落实难度评估

### 8.1 改动规模

| 维度 | 数据 |
|------|------|
| 涉及文件数 | 9 个 |
| 涉及页面数 | 5 个（settings、index、add-course、detail、chinese-input） |
| 需修改的代码行数 | 约 80 行 |
| 需删除的代码行数 | 约 50 行 |
| 新增代码行数 | 约 40 行（getFontSizes 方法） |

### 8.2 难度评级：⭐⭐（容易）

**容易落实**，原因如下：

1. **影响范围可控**：所有 `fontScale` 引用都集中在 9 个文件中，没有散落到各处
2. **改动模式固定**：每个文件的改动都是"读 scale → 算 ratio → 乘基础字号"，替换为"读 size → 算 ratio → 乘基础字号"，逻辑完全一致
3. **无架构变更**：不涉及路由、组件树、数据流的改变，只是存储 key 和计算方式的替换
4. **可渐进式迁移**：可以先保留 `getFontScale` + 新增 `getBaseFontSize`，两套 API 共存，各页面逐个迁移，最后删除旧 API

### 8.3 推荐实施步骤

```
第 1 步: store.js 新增 getBaseFontSize / setBaseFontSize / getFontSizes
         保留旧 getFontScale / setFontScale（兼容期）

第 2 步: app.ux 加入迁移逻辑（fontScale → baseFontSize）

第 3 步: settings.ux 迁移（写入新 key）

第 4 步: index.ux 迁移（读取新 key）

第 5 步: add-course.ux 迁移

第 6 步: detail.ux 迁移

第 7 步: chinese-input.ux 迁移

第 8 步: backup-restore.ux 更新 key 名

第 9 步: storage-tables.js 更新 key 名

第 10 步: data-keys.json 更新

第 11 步: 删除旧 getFontScale / setFontScale / buildFontStyles / getScaleSafe

第 12 步: 全量回归测试，确认所有页面字号正常
```

### 8.4 风险点与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 用户字号丢失 | 中 | 高（用户感知） | 加入迁移逻辑，自动读取旧 key |
| 某个页面漏改 | 低 | 中（字号不一致） | 全局搜索 `fontScale`，确保零残留 |
| 默认值不匹配 | 低 | 低 | 默认 48，与旧默认 scale=1.0 等价 |
| 备份恢复数据不一致 | 低 | 中 | 备份恢复的 key 列表同步更新 |

### 8.5 结论

**全站禁用 scale 容易落实。** 改动范围小（9 个文件）、模式固定、可渐进迁移。唯一需要注意的是做好旧 key 的兼容迁移，避免用户字号丢失。建议采用第五节的可选简化方案（`getFontSizes` 统一返回像素值），可以进一步减少各页面的重复计算代码。整体工作量预估 **1-2 小时**，包括迁移、测试和回归验证。

**推荐使用此简化方案，改动最小，各页面零计算。**