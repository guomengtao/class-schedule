# 全页面统一字体缩放方案分析

## 背景

当前项目存在一个字体缩放系统（通过设置页调整 `fontScale`），但各页面对该系统的使用情况**严重不一致**，导致用户调整字体大小后，只有少数页面生效，多数页面无变化。

## 一、现状梳理

### 1.1 字体缩放系统核心

```
store.js
├── setFontScale(scale)   → 存储 scale 值 (如 1.0, 0.75, 1.292...)
└── getFontScale(callback) → 读取 scale 值
```

设置页 (`settings.ux`) 生产 scale：
```javascript
setSize(size) {
  this.scale = size / 48          // 48 为基准参考值
  store.setFontScale(this.scale)  // 写入全局 scale
}
```

### 1.2 各页面字体缩放使用情况

#### ✅ 已接入 scale 的页面（4 个）

| 页面 | 基准值集合 | 缩放方式 |
|------|-----------|---------|
| **index.ux** | 20, 20, 28, 14 | `applyFontScale()` 生成 inline style |
| **index-full.ux** | 20, 20, 28, 14 | 同上 |
| **add-course.ux** | 28, 24, 20, 26, 28, 36 | `applyFontScale(s)` 生成 inline style |
| **detail.ux** | 28, 24, 20, 26, 28, 36 | 同上 |

其中 `index.ux` / `index-full.ux` 的关键字：
```javascript
// src/pages/index/index.ux:389-396
applyFontScale() {
  var s = this.fontScale
  if (!s || s < 0.5) { s = 1.0 }
  this.dayTitleStyle = "font-size: " + Math.round(20 * s) + "px"   // 日期标题
  this.weekTextStyle = "font-size: " + Math.round(20 * s) + "px"   // 课程表名称
  this.nameStyle = "font-size: " + Math.round(28 * s) + "px"       // 课程名称/时间/地点
  this.btnTextStyle = "font-size: " + Math.round(14 * s) + "px"    // 按钮文字
}
```

`add-course.ux` / `detail.ux` 的关键字：
```javascript
// src/pages/add-course/add-course.ux:273-283
applyFontScale(s) {
  if (!s || s < 0.5) { s = 1.0 }
  this.titleStyle = "font-size: " + Math.round(28 * s) + "px"
  this.labelStyle = "font-size: " + Math.round(24 * s) + "px"
  this.hintStyle = "font-size: " + Math.round(20 * s) + "px"
  this.inputStyle = "font-size: " + Math.round(26 * s) + "px"
  this.inputHeight = Math.round(80 * s)
  this.btnStyle = "font-size: " + Math.round(28 * s) + "px"
  this.btnHeight = Math.round(72 * s)
  this.pickerValueStyle = "font-size: " + Math.round(36 * s) + "px"
}
```

#### ❌ 未接入 scale 的页面（16 个）

这些页面全部使用**硬编码 CSS font-size**，调整字体设置后无任何变化：

| 页面 | 路径 | 字号范围 |
|------|------|---------|
| week-view | `src/pages/week-view/week-view.ux` | 8px - 20px |
| course-manager | `src/pages/course-manager/course-manager.ux` | 10px - 18px |
| schedule-manager | `src/pages/schedule-manager/schedule-manager.ux` | 11px - 22px |
| homepage-settings | `src/pages/homepage-settings/homepage-settings.ux` | 11px - 16px |
| statistics | `src/pages/statistics/statistics.ux` | 10px - 24px |
| schedule-qrcode | `src/pages/schedule-qrcode/schedule-qrcode.ux` | 12px - 16px |
| qrcode-generator | `src/pages/qrcode-generator/qrcode-generator.ux` | 硬编码 |
| test-area | `src/pages/test-area/test-area.ux` | 硬编码 |
| device-info | `src/pages/device-info/device-info.ux` | 硬编码 |
| chinese-input | `src/pages/chinese-input/chinese-input.ux` | 硬编码 |
| activation | `src/pages/activation/activation.ux` | 硬编码 |
| vibration-lab | `src/pages/vibration-lab/vibration-lab.ux` | 硬编码 |
| reset-data | `src/pages/reset-data/reset-data.ux` | 硬编码 |
| activation-lab | `src/pages/activation-lab/activation-lab.ux` | 硬编码 |
| nickname-edit | `src/pages/nickname-edit/nickname-edit.ux` | 硬编码 |
| **settings** | `src/pages/settings/settings.ux` | 仅预览文字响应 scale |

### 1.3 设置页本身的特殊情况

设置页虽然管理字体缩放，但**自身大部分 CSS 字号也是硬编码的**，不响应 scale。只有预览区的课程名称 (`preview-card-name`) 使用了 inline style 动态字号：

```html
<!-- 响应 scale 的元素 -->
<text class="preview-card-name" style="font-size: {{ previewClassSize }}px; ...">
  数学 08:00 - 08:45 301教室
</text>

<!-- 不响应 scale 的 CSS 元素 -->
.header-title    { font-size: 18px }   /* 硬编码 */
.section-label   { font-size: 16px }   /* 硬编码 */
.nickname-label  { font-size: 16px }   /* 硬编码 */
/* ... 所有其他元素都是硬编码 CSS */
```

## 二、关键问题

### 2.1 问题一：16 个页面完全不响应字体缩放

用户调整字体大小后，访问这些页面时字体大小不变，体验割裂。

### 2.2 问题二：各页面基准值不一致

即使已接入的 4 个页面，基准值也不统一：

| 页面 | 课程名称基准 | 标题基准 | 标签基准 | 按钮基准 |
|------|------------|---------|---------|---------|
| index | 28px | 20px | — | 14px |
| add-course | 28px | 28px | 24px | 28px |
| detail | 28px | 28px | 24px | 28px |

虽然课程名称都是 28px 基准（一致），但标题和按钮基准不同。

### 2.3 问题三：实现方式不统一

已接入的页面各自在 `private` 中定义 style 变量，各自实现 `applyFontScale()`，代码重复。

## 三、统一方案

### 3.1 核心思路

将字体缩放逻辑提取到 `store.js` 中作为公共方法，所有页面统一调用，避免重复代码。

### 3.2 store.js 新增公共方法

```javascript
// src/data/store.js 新增

/**
 * 获取字体缩放比例
 * @returns {number} scale，保证 >= 0.5
 */
getScaleSafe: function(callback) {
  this.getFontScale(function(scale) {
    if (!scale || scale < 0.5) { scale = 1.0 }
    callback(scale)
  })
},

/**
 * 根据基准值数组生成缩放后的 style 对象
 * @param {number} scale - 缩放比例
 * @param {Object} bases - 基准值定义 { styleName: basePx }
 * @returns {Object} { styleName: "font-size: XXpx" }
 */
buildFontStyles: function(scale, bases) {
  var styles = {}
  for (var key in bases) {
    if (bases.hasOwnProperty(key)) {
      styles[key] = "font-size: " + Math.round(bases[key] * scale) + "px"
    }
  }
  return styles
}
```

### 3.3 各页面改造方式

#### 已有 `applyFontScale` 的页面（index, add-course, detail）

简化为调用 store 公共方法：

```javascript
// 改造前
onInit() {
  store.getFontScale(function(scale) {
    self.fontScale = scale
    self.applyFontScale()
  })
},
applyFontScale() {
  var s = this.fontScale
  this.nameStyle = "font-size: " + Math.round(28 * s) + "px"
  // ...
}

// 改造后
onInit() {
  store.getScaleSafe(function(scale) {
    self.fontScale = scale
    self.fontStyles = store.buildFontStyles(scale, {
      nameStyle: 28,
      titleStyle: 20,
      btnStyle: 14
    })
  })
}
// 模板中使用: style="{{ fontStyles.nameStyle }}"
```

#### 未接入 scale 的页面

以 `week-view.ux` 为例，需要：

1. 在 `onInit` 中读取 scale
2. 将 CSS 中需要缩放的 `font-size` 改为 inline style
3. 保留 `@media (shape: ...)` 中的响应式字号作为**基准值定义**

改造前（CSS 硬编码）：
```css
.week-day {
  font-size: 14px;
}
@media (shape: rect) {
  .week-day { font-size: 10px; }
}
```

改造后（JS 动态计算 + inline style）：
```javascript
// script
onInit() {
  store.getScaleSafe(function(scale) {
    self.fontScale = scale
    self.weekDayBase = 14   // 默认基准
    self.weekDayStyle = "font-size: " + Math.round(14 * scale) + "px"
  })
}
```

```html
<!-- template -->
<text class="week-day" style="{{ weekDayStyle }}; color: ...">周一</text>
```

### 3.4 各页面基准值建议

基于现有 CSS 字号，建议统一基准值体系：

| 语义级别 | 基准值 | 适用范围 |
|---------|--------|---------|
| 大标题 | 28px | 页面标题、课程名称 |
| 中标题 | 24px | 区块标题、picker 值 |
| 正文 | 20px | 日期、标签、列表项 |
| 小正文 | 16px | 描述文字、输入框 |
| 辅助文字 | 14px | 按钮、提示 |
| 微小文字 | 12px | 次要信息 |

### 3.5 各页面需要改造的元素清单

#### index.ux / index-full.ux（已接入，需重构）
| 元素 | 当前基准 | 建议基准 | 优先级 |
|------|---------|---------|--------|
| 日期标题 | 20px | 20px | 保持不变 |
| 课程表名称 | 20px | 20px | 保持不变 |
| 课程名称/时间/地点 | 28px | 28px | 保持不变 |
| 按钮文字 | 14px | 14px | 保持不变 |

#### add-course.ux / detail.ux（已接入，需重构）
| 元素 | 当前基准 | 建议基准 | 优先级 |
|------|---------|---------|--------|
| 标题 | 28px | 28px | 保持不变 |
| 标签 | 24px | 24px | 保持不变 |
| 提示 | 20px | 20px | 保持不变 |
| 输入框 | 26px | 26px | 保持不变 |
| 按钮 | 28px | 28px | 保持不变 |
| picker 值 | 36px | 36px | 保持不变 |

#### week-view.ux（未接入）
| 元素 | 当前默认字号 | 建议基准 | 优先级 |
|------|------------|---------|--------|
| 星期标题 | 14px | 16px | 高 |
| 课程名首字 | 18px | 20px | 高 |
| 表头 | 13px | 14px | 中 |
| 时间标签 | 12px | 14px | 中 |
| 底部统计 | 14px | 14px | 中 |

#### course-manager.ux（未接入）
| 元素 | 当前默认字号 | 建议基准 | 优先级 |
|------|------------|---------|--------|
| 页面标题 | 18px | 20px | 高 |
| 课程名称 | 16px | 16px | 高 |
| 操作按钮 | 12px | 14px | 中 |

#### schedule-manager.ux（未接入）
| 元素 | 当前默认字号 | 建议基准 | 优先级 |
|------|------------|---------|--------|
| 页面标题 | 20px | 20px | 高 |
| 课程表名称 | 22px | 24px | 高 |
| 操作链接 | 18px | 20px | 中 |
| 描述文字 | 14px | 16px | 中 |

#### settings.ux（部分接入）
| 元素 | 当前状态 | 建议基准 | 优先级 |
|------|---------|---------|--------|
| 预览文字 | ✅ 已接入 | 28px | — |
| 页面标题 | ❌ 硬编码 18px | 20px | 高 |
| 区块标签 | ❌ 硬编码 16px | 16px | 高 |
| 昵称值 | ❌ 硬编码 15px | 16px | 中 |
| 描述文字 | ❌ 硬编码 14px | 14px | 中 |
| 按钮 | ❌ 硬编码 | 14px | 中 |

#### 其他页面（homepage-settings, statistics, schedule-qrcode 等）
| 页面 | 默认字号范围 | 建议基准 | 优先级 |
|------|------------|---------|--------|
| homepage-settings | 11-16px | 14-20px | 中 |
| statistics | 10-24px | 12-24px | 中 |
| schedule-qrcode | 12-16px | 14-20px | 低 |
| 其他辅助页面 | 不等 | 14-20px | 低 |

## 四、实施步骤

### 阶段一：基础设施（1 个文件）
1. `store.js` 新增 `getScaleSafe()` 和 `buildFontStyles()` 方法

### 阶段二：已接入页面重构（3 个文件）
2. `index.ux` — 用 store 公共方法替换 `applyFontScale()`
3. `index-full.ux` — 同上
4. `add-course.ux` — 同上
5. `detail.ux` — 同上

### 阶段三：核心页面接入（3 个文件）
6. `settings.ux` — 为所有元素接入 scale（当前仅预览区接入）
7. `week-view.ux` — 首次接入
8. `course-manager.ux` — 首次接入
9. `schedule-manager.ux` — 首次接入

### 阶段四：辅助页面接入（7 个文件）
10. `homepage-settings.ux`
11. `statistics.ux`
12. `schedule-qrcode.ux`
13. `chinese-input.ux`
14. `nickname-edit.ux`
15. `activation.ux`
16. 其他低频页面

## 五、注意事项

### 5.1 形状适配媒体查询

当前大量页面使用 `@media (shape: circle/capsule/rect)` 设置了不同字号。接入 fontScale 后：
- 媒体查询中的字号需要改为**基准值**（scale=1.0 时的值）
- 实际渲染时通过 `基准值 × scale` 动态计算
- 需要在 `detectScreen()` 中确定当前形状，选择对应基准值

### 5.2 按钮高度缩放

`add-course.ux` 和 `detail.ux` 还对 `inputHeight` 和 `btnHeight` 做了缩放：
```javascript
this.inputHeight = Math.round(80 * s)
this.btnHeight = Math.round(72 * s)
```
这属于尺寸缩放（非字号缩放），其他页面如有类似需求可一并处理。

### 5.3 兼容性

- 首次加载无存储值时，`getFontScale` 返回 `1.0`，确保默认表现不变
- `getScaleSafe` 保证 scale >= 0.5，防止文字过小不可读

### 5.4 性能

- 每个页面 `onInit` 时计算一次 style 对象，渲染时直接使用，无额外开销
- 字体大小变化后需重新进入页面才生效（当前行为），如需实时生效需增加事件通知机制

## 六、影响范围总结

| 类别 | 文件数 | 改造量 |
|------|--------|--------|
| 基础设施 | 1 | 新增 2 个方法 |
| 已接入页面重构 | 4 | 简化代码 |
| 核心页面首次接入 | 4 | CSS → inline style |
| 辅助页面首次接入 | 7 | CSS → inline style |
| **合计** | **16** | — |