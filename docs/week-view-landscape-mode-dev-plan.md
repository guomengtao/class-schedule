# 课程总览页面 - 横屏/竖屏切换开发方案

## 文件

[week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux)

---

## 当前布局结构

```
┌──────────────────────────────────┐
│ ◀ 返回        课程总览           │  ← header (固定)
├──────────────────────────────────┤
│          课程表1                  │  ← schedule-name
├──────────────────────────────────┤
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun│  ← week-header
├──────────────────────────────────┤
│ 08:00  语   数   英   物   化   体  │
│ 10:00  数   语   英   语   物   化  │  ← grid-scroll (flex:1, 可滚动)
│ 14:00  英   体   物   数   语   休  │
│ 16:00  体   化   语   英   数   物  │
│  ...                              │
├──────────────────────────────────┤
│        共 28 门课程               │  ← footer (固定)
└──────────────────────────────────┘
```

**问题**：竖屏（portrait）下，7 天列太窄，每列仅 ≈ 50px，课程名首字显示拥挤。

**目标**：横屏（landscape）下，列变宽，7 天列可充分利用屏幕宽度。

---

## 方案：CSS `transform: rotate(90deg)` 旋转网格区域

### 核心思路

保持 header 和 footer 不旋转（便于导航），仅旋转中间的课程网格区域。

```
竖屏模式（默认）                    横屏模式（旋转后）

┌──────────────────┐              ┌──────────────────┐
│ ◀ 返回  课程总览  │              │ ◀ 返回  课程总览  │
│      课程表1      │              │      课程表1      │
│ Mon Tue Wed ...   │              │ ┌────────────────┐│
│ 08:00 语 数 英    │              │ │ 语 语 英 体 语  ││
│ 10:00 数 语 英    │   ──点击──→  │ │ 数 英 体 化 语  ││
│ 14:00 英 体 物    │              │ │ 英 英 物 语 英  ││
│ 16:00 体 化 语    │              │ │ 物 语 数 学 数  ││
│                  │              │ │ 化 物 休 物 休  ││
│  共 28 门课程     │              │ └────────────────┘│
└──────────────────┘              │  共 28 门课程     │
                                  └──────────────────┘
```

### 旋转原理

```css
/* 旋转 90 度，以左上角为原点 */
.rotated-content {
  transform: rotate(90deg);
  transform-origin: top left;
}
```

对于 454×454 的正方形屏幕：

```
旋转前: 原点在左上角 (0,0)
        元素宽度 W，高度 H

旋转后 (rotate(90deg)):
        - 元素绕原点顺时针旋转 90°
        - 原来的"宽度"方向变成向下的"高度"
        - 原来的"高度"方向变成向左的"宽度"
        - 视觉上：元素从左上角出发，向右延伸 H，向下延伸 W

对于正方形 (W=H): 旋转后元素仍在屏幕内，但内容旋转了 90°
```

### 实际效果

| 属性 | 竖屏 | 横屏 |
|------|:----:|:----:|
| 7 天列宽 | ≈ 50px/列 | 更宽，利用旋转后的空间 |
| 时间行高 | 32px | 不变（内容旋转） |
| 文字方向 | 正常 | 旋转 90°（可读但需适应） |
| Header/Footer | 正常 | 正常（不旋转） |

---

## 实施步骤

### 步骤 1：模板改动

在 header 中添加切换按钮，将网格区域包裹在旋转容器中。

```diff
  <div class="header">
    <input class="back-btn" type="button" value="◀ 返回" onclick="goBack" />
    <text class="header-title">课程总览</text>
+   <div class="rotate-toggle" onclick="toggleLandscape">
+     <text class="rotate-toggle-text">{{ isLandscape ? '竖' : '横' }}</text>
+   </div>
  </div>

  <text class="schedule-name">{{ scheduleName }}</text>

+ <div class="grid-wrapper {{ isLandscape ? 'landscape' : '' }}">
    <div class="week-header">
      ...
    </div>
    <scroll class="grid-scroll">
      ...
    </scroll>
+ </div>

  <div class="footer">
    ...
  </div>
```

### 步骤 2：数据属性

```diff
  private: {
    ...
+   isLandscape: false,
    ...
  }
```

### 步骤 3：切换方法

```js
toggleLandscape() {
  this.isLandscape = !this.isLandscape
  var storage = require("@system.storage")
  storage.set({
    key: "weekview_landscape",
    value: String(this.isLandscape),
    success: function() {},
    fail: function() {}
  })
}
```

在 `onInit` 中加载存储的偏好：

```js
onInit() {
  var self = this
  // ... existing code ...
  
  var storage = require("@system.storage")
  storage.get({
    key: "weekview_landscape",
    success: function(data) {
      if (data === "true") {
        self.isLandscape = true
      }
    },
    fail: function() {}
  })
}
```

### 步骤 4：CSS 改动

```css
/* 新增：旋转切换按钮 */
.rotate-toggle {
  width: 40px;
  height: 32px;
  border-radius: 8px;
  background-color: #16213e;
  justify-content: center;
  align-items: center;
  margin-right: 4px;
}

.rotate-toggle-text {
  font-size: 14px;
  font-weight: bold;
  color: #7ec8e3;
}

/* 新增：网格包裹层 */
.grid-wrapper {
  flex: 1;
  flex-direction: column;
}

/* 横屏模式：旋转整个网格包裹层 */
.grid-wrapper.landscape {
  transform: rotate(90deg);
  transform-origin: top left;
  position: absolute;
  top: 0;
  left: 0;
  width: 454px;   /* 屏幕高度 */
  height: 454px;  /* 屏幕宽度 */
}

/* 横屏模式下，隐藏 header 和 footer 的 padding 调整 */
/* 如果 header/footer 被旋转遮挡，需要调整它们的位置 */
```

**注意**：`transform` 和 `transform-origin` 在 QuickApp 中的支持情况需要实测验证。如果 QuickApp 不支持 `transform-origin`，可以尝试使用 `position` 配合 `top`/`left` 来调整位置。

---

## 潜在问题与应对

### 问题 1：QuickApp 不支持 `transform`

**症状**：旋转不生效，页面无变化。

**应对方案 A**：使用 inline style 动态设置 `transform`：
```html
<div class="grid-wrapper" style="transform: {{ isLandscape ? 'rotate(90deg)' : 'none' }}; transform-origin: top left;">
```

**应对方案 B**：如果完全不支持 `transform`，降级为交换行列（代码层面重新构建 grid，将行变列、列变行）。

### 问题 2：旋转后内容超出屏幕

**症状**：旋转后的网格部分被截断。

**原因**：`transform-origin` 设置不当，或容器尺寸不匹配。

**解决**：
- 确保 `transform-origin: top left` 或 `0 0`
- 调整网格容器的 `width` 和 `height` 为屏幕尺寸
- 对于非正方形屏幕，旋转后需要平移容器：
  ```css
  .grid-wrapper.landscape {
    transform: rotate(90deg) translateY(-100%);
    transform-origin: top left;
  }
  ```

### 问题 3：旋转后文字方向可读性

**症状**：旋转 90° 后文字变为纵向排列，阅读困难。

**分析**：`rotate(90deg)` 会让文字顺时针旋转 90°，即文字方向从水平变为垂直。对于中文单个字来说影响不大，但时间标签如 "08:00" 会变成纵向排列。

**解决**：
- 时间标签 `08:00` 可改为 `08` 或 `8:` 缩短显示
- 星期标签 `Mon` 可改为 `M` 单字母
- 整体可读性需用户实际体验后判断

### 问题 4：旋转后触摸事件坐标偏移

**症状**：点击课程格子位置不准确，点不到或点错。

**原因**：`transform: rotate()` 会改变元素的视觉位置，但 QuickApp 的触摸事件坐标系可能不跟随旋转。

**解决**：
- 如果触摸坐标不跟随旋转，横屏模式下禁用格子点击
- 或在横屏模式下仅作为查看模式，不响应点击事件

### 问题 5：旋转后 header/footer 被遮挡

**症状**：旋转后的网格覆盖了 header 和 footer。

**原因**：`position: absolute` 的旋转容器覆盖了其他元素。

**解决**：
- 调整 header 和 footer 的 `z-index`（如果 QuickApp 支持）
- 或缩小旋转容器的尺寸，留出 header 和 footer 的空间
- 或横屏模式下隐藏 footer，只保留 header 的返回按钮

---

## 推荐实施顺序

| 优先级 | 步骤 | 验证方式 |
|:---:|------|---------|
| 1 | 先测试 `transform: rotate(90deg)` 是否在 QuickApp 中生效 | 添加一个简单测试元素，旋转 90° 查看效果 |
| 2 | 添加切换按钮和 `isLandscape` 状态 | 点击按钮确认状态切换 |
| 3 | 包裹网格区域，应用旋转 CSS | 确认旋转后视觉效果 |
| 4 | 调整尺寸和位置，确保不超出屏幕 | 确认所有内容可见 |
| 5 | 存储偏好，持久化横屏状态 | 重启后确认状态保持 |
| 6 | 处理触摸事件偏移问题 | 确认点击格子正常 |

---

## 涉及改动文件

| 文件 | 改动内容 |
|------|---------|
| [week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux) | 模板 + CSS + 脚本 |

## 不改动

| 部分 | 原因 |
|------|------|
| 数据加载逻辑 | 与旋转无关，保持不变 |
| 课程详情跳转 | 逻辑不变，仅横屏时可能禁点击 |
| 其他页面 | 仅总览页面需要此功能 |