# PNG 图标十种风格兼容分析

## 一、删除按钮 PNG 双图模式原理

### 1.1 HTML 结构

```html
<div class="header-trash-btn" onclick="deleteCourse"
     style="background-color: {{ deleteConfirm ? theme.deleteText : theme.deleteBg }}">
  <image class="header-trash-icon"
         src="../../common/icons/{{ iconTheme }}/icon_trash.png"></image>
</div>
```

| 层 | 作用 | 示例 |
|----|------|------|
| **外层 div** | 按钮容器：背景色、圆角、点击、居中 | `theme.deleteBg` / `theme.deleteText` |
| **内层 image** | 图标本身：不受 CSS `color` 影响，固定 PNG 颜色 | `icon_trash.png` (24×24) |

### 1.2 CSS 四屏形适配

#### 默认（胶囊基线）

```css
.header-trash-btn {
  width: 40px;           /* 按钮尺寸 */
  height: 40px;
  border-radius: 10px;   /* 圆角 */
  justify-content: center;  /* 水平居中 */
  align-items: center;      /* 垂直居中 */
}

.header-trash-icon {
  width: 24px;   /* 图标尺寸 = 按钮内部 */
  height: 24px;
}
```

#### 圆形屏 (circle)

继承默认值，无需额外覆盖。40×40 在圆形屏上比例合理。

#### 胶囊屏 (capsule / pill-shaped)

```css
/* 胶囊屏横向空间宽裕，但触摸精度要求高 */
.header-trash-btn {
  width: 44px;        /* 加大防止误触 */
  height: 44px;
  flex-shrink: 0;     /* 不压缩 */
}
```

#### 方形屏 (rect)

继承默认值。40×40 在方形屏上比例合理。

### 1.3 JavaScript 主题切换逻辑

```javascript
// 所有使用 PNG 图标的页面均实现此逻辑
data: {
  iconTheme: "dark"   // 默认暗色（防止异步返回前闪烁）
}

onInit() {
  var self = this
  store.getTheme(function(t, themeName) {
    self.theme = t
    self.updateIconSrc(themeName)
  })
}

onShow() {
  var self = this
  store.getTheme(function(t, themeName) {
    self.updateIconSrc(themeName)
  })
}

updateIconSrc: function(themeName) {
  this.iconTheme = (themeName === 'light' || themeName === 'warm') ? 'light' : 'dark'
}
```

| 判断条件 | iconTheme | 图标色 | 适用主题 |
|----------|-----------|--------|----------|
| `light` / `warm` | `"light"` | #333333 深灰 | 晨光白、暖阳米 |
| 其他 8 种 | `"dark"` | #ffffff 纯白 | 深空蓝、翡翠绿、珊瑚红、暗夜黑、深空灰、暗紫魅影、墨绿护眼、琥珀金 |

**设计思想**：因为 PNG 是静态图片无法像文字一样通过 `{{ theme.accent }}` 动态着色，所以只分"暗底白图"和"亮底深图"两档。按钮本身通过 `theme.deleteBg`（暗色底）和 `theme.deleteText`（红色字区域）来提供主题感知的视觉层次——图标是纯信息符号，颜色层次由外层 div 的背景色承担。

---

## 二、十种主题与删除按钮的适配矩阵

### 2.1 配色一览

| # | 主题Key | 主题名 | 类型 | bg | card | accent | deleteBg | deleteText |
|---|---------|--------|------|-----|------|--------|----------|------------|
| 1 | blue | 深空蓝 | 暗色 | #1a1a2e | #16213e | #7ec8e3 | #2a1a3e | #e08080 |
| 2 | green | 翡翠绿 | 暗色 | #1a2e1a | #1a3a1a | #7ec8a0 | #2a2e1a | #e0c880 |
| 3 | red | 珊瑚红 | 暗色 | #2e1a1a | #3a1a1a | #e37e7e | #3a1a2a | #e38080 |
| 4 | dark | 暗夜黑 | 暗色 | #000000 | #0a0a0a | #666666 | #1a0a0a | #aa6666 |
| 5 | gray | 深空灰 | 暗色 | #1a1a1a | #242424 | #888899 | #2a1a1a | #cc8888 |
| 6 | purple | 暗紫魅影 | 暗色 | #1a0a2e | #2a1a3a | #b07ec8 | #3a1a2a | #e080c0 |
| 7 | light | 晨光白 | **亮色** | #f0f0f0 | #ffffff | #4a90d9 | #f0e0e0 | #cc6666 |
| 8 | warm | 暖阳米 | **亮色** | #f5f0e8 | #ffffff | #c4a882 | #f0e0d8 | #cc8866 |
| 9 | forest | 墨绿护眼 | 暗色 | #1a2a1a | #0a1a0a | #6a9a6a | #1a2a1a | #aa8866 |
| 10 | amber | 琥珀金 | 暗色 | #2a1a0a | #3a2a1a | #d4a060 | #3a2a1a | #e0a060 |

### 2.2 删除按钮在各主题下的视觉效果

| 主题 | iconTheme | 图标色 | 正常背景 deleteBg | 确认背景 deleteText | 图标可见性 |
|------|-----------|--------|-------------------|---------------------|-----------|
| 深空蓝 | dark | #ffffff | #2a1a3e (暗紫) | #e08080 (亮红) | ✅ 白图在暗紫/亮红上均清晰 |
| 翡翠绿 | dark | #ffffff | #2a2e1a (暗黄绿) | #e0c880 (亮金) | ✅ 白图对比度足够 |
| 珊瑚红 | dark | #ffffff | #3a1a2a (暗红紫) | #e38080 (亮红) | ✅ 白图在两种色上都清晰 |
| 暗夜黑 | dark | #ffffff | #1a0a0a (极暗红) | #aa6666 (暗红) | ⚠️ 确认态暗红+白图勉强可见 |
| 深空灰 | dark | #ffffff | #2a1a1a (暗红灰) | #cc8888 (中红) | ✅ 白图清晰 |
| 暗紫魅影 | dark | #ffffff | #3a1a2a (暗紫红) | #e080c0 (粉紫) | ✅ 白图清晰 |
| **晨光白** | **light** | **#333333** | #f0e0e0 (浅粉) | #cc6666 (中红) | ✅ 深灰图在浅底上清晰 |
| **暖阳米** | **light** | **#333333** | #f0e0d8 (浅暖粉) | #cc8866 (暖红) | ✅ 深灰图在浅底上清晰 |
| 墨绿护眼 | dark | #ffffff | #1a2a1a (暗绿) | #aa8866 (暗棕) | ⚠️ 确认态暗棕+白图勉强可见 |
| 琥珀金 | dark | #ffffff | #3a2a1a (暗棕) | #e0a060 (亮橙) | ✅ 白图清晰 |

### 2.3 兼容性总结

| 维度 | 结论 |
|------|------|
| **暗色主题 (8/10)** | 全部使用白图标，8 个主题删除按钮正常态背景足够暗，白图始终清晰 |
| **亮色主题 (2/10)** | 切换深灰图标，`deleteBg` 为浅色系，深灰图始终清晰 |
| **确认态** | 4 号暗夜黑和 9 号墨绿护眼的确认态 deleteText 偏暗，与白图对比度偏低，但仍有差异可见 |
| **四屏形** | 胶囊屏按钮放大到 44×44 防误触，其余继承 40×40；图标统一 24×24 不变 |

---

## 三、返回按钮 PNG 模式——与删除按钮的对比

### 3.1 模板对比

| 元素 | 删除按钮 (detail) | 返回按钮 (settings) |
|------|------------------|---------------------|
| 外层标签 | `<div class="header-trash-btn">` | `<div class="back-btn-wrapper">` |
| 背景色 | `deleteConfirm ? deleteText : deleteBg` | `theme.card` (单色，无状态切换) |
| 内层标签 | `<image class="header-trash-icon">` | `<image class="back-btn-icon">` |
| 图标源 | `icon_trash.png` | `icon_back.png` |
| 点击事件 | `deleteCourse` | `goBack` |

### 3.2 CSS 对比

| 属性 | 删除按钮 | 返回按钮 | 说明 |
|------|---------|---------|------|
| 按钮宽 | 40px | 48px | 返回按钮更宽，符合导航习惯 |
| 按钮高 | 40px | 40px | 一致 |
| 圆角 | 10px | 8px | 风格略有差异 |
| 图标宽高 | 24×24 | 24×24 | **统一** |
| 居中方式 | justify-content + align-items | justify-content + align-items | **统一** |
| iconTheme | ✓ | ✓ | **统一** |
| updateIconSrc | ✓ | ✓ | **统一** |

---

## 四、全项目 icon 使用现状扫描

### 4.1 已使用 PNG 图标的页面

| 页面 | 文件 | PNG 图标 | 返回按钮 | 状态 |
|------|------|----------|---------|------|
| 详情页 | [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux) | `icon_trash.png` | ◀ 文字 | ⚠️ 返回按钮待转 |
| 设置页 | [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux) | `icon_back.png` | ✅ PNG | ✅ 已完成 |
| 实验编辑 | [lab-edit-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/lab-edit-course/lab-edit-course.ux) | `icon_trash.png` | ◀ 文字 | ⚠️ 返回按钮待转 |
| 二维码生成 | [qrcode-generator.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/qrcode-generator/qrcode-generator.ux) | 无 | ◀ 文字 | ❌ 有 iconTheme 代码但无 PNG 使用 |

### 4.2 待转换的页面——返回按钮 (◀ → icon_back.png)

| # | 页面文件 | 当前标签 | 当前类型 | 有 iconTheme? |
|---|---------|---------|---------|--------------|
| 1 | `add-course/add-course.ux` | `<input value="◀">` | input button | ❌ |
| 2 | `capsule-hide-test/capsule-hide-test.ux` | `<text>...<</text>` | text | ❌ |
| 3 | `test-area/test-area.ux` | `<text>...◀</text>` | text | ❌ |
| 4 | `schedule-manager/schedule-manager.ux` | `<text>...◀</text>` | text | ❌ |
| 5 | `lab-edit-course/lab-edit-course.ux` | `<input value="◀">` | input button | ✅ (缺 back png) |
| 6 | `custom-content-edit/custom-content-edit.ux` | `<text>...◀</text>` | text | ❌ |
| 7 | `week-view/week-view.ux` | `<input value="◀">` | input button | ❌ |
| 8 | `pinned-pages/pinned-pages.ux` | `<text>...◀</text>` | text | ❌ |
| 9 | `device-info/device-info.ux` | `<text>...◀</text>` | text | ❌ |
| 10 | `template-picker/template-picker.ux` | `<text>...◀</text>` | text | ❌ |
| 11 | `donate/donate.ux` | `<text>...◀</text>` | text | ❌ |
| 12 | `reset-data/reset-data.ux` | `<text>...◀</text>` | text | ❌ |
| 13 | `detail/detail.ux` | `<text>...◀</text>` | text | ✅ (仅有 trash png) |
| 14 | `qrcode-generator/qrcode-generator.ux` | `<text>...◀</text>` | text | ✅ (无 png 使用) |
| 15 | `header-demo1/header-demo1.ux` | `<input value="◀">` | input button | ❌ |
| 16 | `header-demo2/header-demo2.ux` | `<input value="◀">` | input button | ❌ |

**合计：16 个页面返回按钮待转为 PNG。**

### 4.3 其他文本箭头图标

| 页面 | 箭头 | 用途 | 建议 |
|------|------|------|------|
| `detail/detail.ux` | ◀ / ▶ | 左右滑动课程 | 可考虑转为 icon_arrow_left/right.png |
| `lab-edit-course/lab-edit-course.ux` | ◀ / ▶ | 左右滑动课程 | 同上 |
| `test-area/test-area.ux` | › | 列表右箭头 | 可考虑转为 icon_chevron_right.png |
| `settings/settings.ux` | › / v | 展开/折叠箭头 | 可考虑转为 icon_chevron_down.png |
| `schedule-manager/schedule-manager.ux` | › | 列表右箭头 | 同上 |

**合计：5 组功能性文本箭头可考虑转为 PNG。**

### 4.4 全部需要转换汇总

| 类别 | 数量 | 优先级 |
|------|------|--------|
| 返回按钮 ◀ | **16 页** | 高（直接可见，影响所有主题） |
| 滑动箭头 ◀▶ | 2 页 × 2 方向 | 中（辅助导航） |
| 展开箭头 ›/v | 3 页 | 低（非核心操作） |
| **总计** | **约 23 处** | |

### 4.5 当前 PNG 图标库存

```
src/common/icons/
├── dark/
│   ├── icon_back.png    (231B)   ← 白箭头 #ffffff
│   ├── icon_home.png    (780B)   ← 待确认色
│   └── icon_trash.png   (600B)   ← 待确认色
└── light/
    ├── icon_back.png    (404B)   ← 深灰箭头 #333333
    ├── icon_home.png    (800B)   ← 待确认色
    └── icon_trash.png   (627B)   ← 待确认色
```

**待补充的图标**：`icon_arrow_right.png`、`icon_chevron_right.png`、`icon_chevron_down.png`

---

## 五、转换实施建议

### 5.1 每个页面需要改动的 3 个位置

对任意一个待转换页面，需要：

1. **模板**：将 `<text>◀</text>` 或 `<input value="◀">` 替换为
   ```html
   <div class="back-btn-wrapper" onclick="goBack" style="background-color: {{ theme.card }}">
     <image class="back-btn-icon" src="../../common/icons/{{ iconTheme }}/icon_back.png"></image>
   </div>
   ```

2. **script**：添加
   ```javascript
   data: { iconTheme: "dark" }

   onInit() { store.getTheme(function(t, name) { self.updateIconSrc(name) }) }
   onShow() { store.getTheme(function(t, name) { self.updateIconSrc(name) }) }
   updateIconSrc: function(name) { this.iconTheme = (name === 'light' || name === 'warm') ? 'light' : 'dark' }
   ```

3. **CSS**：将 `.back-btn { ... }` 拆分为
   ```css
   .back-btn-wrapper {
     width: 48px; height: 40px; border-radius: 8px;
     justify-content: center; align-items: center;
   }
   .back-btn-icon { width: 24px; height: 24px; }
   ```

### 5.2 CSS 需删除的属性（text → image 对比）

| 删除 | 原因 |
|------|------|
| `font-size` | 图片无字体概念 |
| `line-height` | 图片无行高概念 |
| `text-align` | 由 flex 居中接管 |
| `color` | 图片颜色由 PNG 文件决定 |

### 5.3 按四屏形适配的注意事项

| 屏形 | back-btn-wrapper | 说明 |
|------|-----------------|------|
| 默认 (capsule) | 48px × 40px, radius 8px | 基线 |
| circle | 52px × 40px | 圆形屏中文字更大，按钮稍宽 |
| capsule | 50px × 40px | 胶囊屏横向宽裕 |
| rect | 48px × 40px, radius 20px | 方形屏用更圆角 |

---

## 六、核心结论

1. **双 PNG 模式本质**：外层 `<div>` 负责"主题感知的背景色"，内层 `<image>` 负责"类型感知的固定色图标"，分工明确。

2. **十色兼容由两层合作完成**：
   - 图标层只分 dark（白）和 light（深灰）两档，凭借 `iconTheme` 切换
   - 按钮背景层使用 `theme.card` / `theme.deleteBg` / `theme.deleteText` 实时响应主题

3. **当前项目有 16 个页面的返回按钮仍是文本箭头**，需要逐个按上述模式转换为 PNG。每个页面改造量约 15-25 行。

4. **统一转换后收益**：所有页面的返回按钮在全部 10 种主题下都能凭借白色/深灰 PNG + 主题背景色清晰可见，不再依赖 Unicode 字体的渲染效果。

---

*文档版本：v1.0*  
*最后更新：2026-09-18*