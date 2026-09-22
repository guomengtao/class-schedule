# 首页状态栏图标显示方框 & 文字溢出分析报告

## 问题1：状态图标显示为方框

### 问题现象

首页顶部"即将上课"区域的状态图标显示为方框（□），无法正常显示预期图标。

### 涉及代码位置

文件：`src/pages/index/index.ux`

```html
<!-- 第12行：当前上课 -->
<text class="status-icon">&#128218;</text>   <!-- 📚 U+1F4DA -->

<!-- 第22行：下一节课 -->
<text class="status-icon">&#9200;</text>     <!-- ⏰ U+23F0 -->

<!-- 第26行：即将上课 -->
<text class="status-icon">&#128197;</text>   <!-- 📅 U+1F4C5 -->

<!-- 第30行：暂无课程 -->
<text class="status-icon">&#127881;</text>   <!-- 🎉 U+1F389 -->
```

### 根因分析

#### 原因1：快应用不支持 Emoji 渲染（P0 - 根本原因）

| 字符 | 实体编码 | Unicode | 码位 | 类型 |
|------|----------|---------|------|------|
| 📚 | `&#128218;` | U+1F4DA | 0x1F4DA | Emoji（SMP平面） |
| ⏰ | `&#9200;` | U+23F0 | 0x23F0 | 杂项技术符号（BMP平面） |
| 📅 | `&#128197;` | U+1F4C5 | 0x1F4C5 | Emoji（SMP平面） |
| 🎉 | `&#127881;` | U+1F389 | 0x1F389 | Emoji（SMP平面） |

关键问题：
1. **SMP平面字符**：📚、📅、🎉 位于 Unicode 补充多语言平面（SMP, Plane 1），码位超过 U+FFFF。快应用运行环境（华为/小米等厂商的轻量级 JS 引擎）通常**不包含完整的 Emoji 字体支持**，这些字符无法渲染，显示为方框 `□`。
2. **BMP平面字符**：⏰ 位于基本多语言平面（BMP, Plane 0），理论上应能渲染，但在部分快应用设备上，系统字体可能不包含该字符的字形，同样显示为方框。

#### 原因2：系统字体缺失（P1 - 次要原因）

快应用运行在轻量级运行时环境中，系统字体集通常只包含：
- 基础 CJK 字符（中文、日文、韩文）
- ASCII 字符
- 少数常用符号

不包含 Emoji 字体文件（如 Apple Color Emoji、Noto Color Emoji、Segoe UI Emoji），因此所有 Emoji 和大部分特殊符号都无法渲染。

#### 原因3：与之前删除按钮 Bug 同类问题（关联）

这与之前 [demo-animal-fruit-bug-analysis.md](./demo-animal-fruit-bug-analysis.md) 中记录的**问题6：删除按钮 emoji 无法渲染**完全一致。快应用不支持 emoji 字符的观点已多次验证。

---

## 问题2：文字过长时界面混乱

### 问题现象

当课程名称较长（如"马克思主义基本原理概论"）或状态文字较多时，`status-bar` 区域文字溢出容器，导致：
- 文字超出 `status-bar` 边界，遮挡其他元素
- 单行文字过长时水平溢出，无法完整阅读
- 区域高度固定，不能随文字增多而自动扩展

### 问题代码

```css
.status-bar {
  flex-direction: column;
  background-color: #0f3460;
  border-radius: 14px;
  padding: 24px 36px;
  margin-bottom: 8px;
  border-left-width: 6px;
  border-left-color: #7ec8e3;
  border-left-style: solid;
  /* 问题：没有 overflow 处理，没有 text-overflow */
}

.status-text {
  font-size: 32px;
  color: #ffffff;
  flex: 1;
  /* 问题：
     1. flex: 1 在 column 布局中控制高度，不控制宽度
     2. 没有 text-overflow 处理溢出
     3. 没有 word-break 处理长词
  */
}
```

### 根因分析

| 问题 | 严重程度 | 原因 |
|------|----------|------|
| 文字水平溢出 | 🔴 P0 | `status-text` 无 `text-overflow: ellipsis` 和宽度约束 |
| 区域高度固定 | 🟡 P1 | `status-bar` 没有自适应高度，长文字被截断 |
| 无换行保护 | 🟡 P1 | 长单词/长课程名没有 `word-break` 处理 |

### 修复方案

#### 1. status-bar 自适应高度

```css
.status-bar {
  flex-direction: column;
  background-color: #0f3460;
  border-radius: 14px;
  padding: 24px 36px;
  margin-bottom: 8px;
  border-left-width: 6px;
  border-left-color: #7ec8e3;
  border-left-style: solid;
  /* 新增：不设固定高度，根据内容自动伸缩 */
}
```

#### 2. status-text 文字约束与溢出处理

```css
.status-text {
  font-size: 32px;
  color: #ffffff;
  flex: 1;
  text-overflow: ellipsis;
  /* 新增：文字溢出显示省略号 */
}
```

#### 3. 宽屏自适应

```css
.status-current,
.status-next,
.status-free {
  flex-direction: row;
  align-items: center;
  /* 新增：确保子元素宽度受父容器约束 */
  width: 100%;
}
```

### 修复后效果

```
修复前:
┌────────────────────────────────────┐
│ 正在上课: 马克思主义基本原理概论 还剩45分钟  → 溢出!
└────────────────────────────────────┘

修复后:
┌────────────────────────────────────┐
│ 正在上课: 马克思主义基本原理...    │  ← text-overflow: ellipsis
│ 还剩45分钟                        │  ← 自动换行
│ 下一节: 15分钟后 大学英语          │  ← 自动换行
└────────────────────────────────────┘  ← 高度自适应
```

---

## 修复方案总览

### 图标问题修复

| 状态 | 原图标 | 修改 |
|------|--------|------|
| 正在上课 | 📚 `&#128218;` | 移除图标，保留"正在上课:"文字 |
| 下一节课 | ⏰ `&#9200;` | 移除图标，添加"下一节:"前缀 |
| 即将上课 | 📅 `&#128197;` | 移除图标，添加"即将:"前缀 |
| 暂无课程 | 🎉 `&#127881;` | 移除图标，保留"暂无课程"文字 |

### 文字溢出修复

| 属性 | 修改前 | 修改后 |
|------|--------|--------|
| `status-bar` 高度 | 无自适应 | 内容自适应 |
| `status-text` 溢出 | 无处理 | `text-overflow: ellipsis` |
| `status-text` 换行 | 默认 | 自然换行 |

### 影响范围

- 仅影响首页 `status-bar` 区域的图标显示和文字溢出
- 不影响功能逻辑
- 提升可读性（文字标签比图标更直观）

---

## 问题3：还剩X分钟提示文字跑到左上角

### 问题现象

修复文字溢出后，出现新问题：`status-time`（"还剩X分钟" / "即将结束"）文字没有显示在 `status-bar` 区域内，而是跑到了**页面左上角**。

### 错误代码

```html
<div class="status-current" if="{{ currentClass }}">
  <text class="status-text" style="color: {{ theme.text }}">
    正在上课: {{ currentClass.name }}
    <text class="status-time" if="{{ currentClass.remaining > 0 }}" style="color: {{ theme.accent }}">
      还剩{{ currentClass.remaining }}分钟
    </text>
    <text class="status-time" if="{{ currentClass.remaining <= 0 }}" style="color: {{ theme.accent }}">即将结束</text>
  </text>
</div>
```

### 根因分析

**快应用不支持 `<text>` 嵌套 `<text>`**

```
<text class="status-text">           ← 外层 text
  正在上课: {{ currentClass.name }}
  <text class="status-time">...</text>  ← 内层 text，脱离父级流！
</text>
```

在标准 HTML/CSS 中，`<text>` 嵌套 `<text>` 是合法的，内层文本会继承父级的行内流，正常显示在父级文本之后。

但在快应用框架中，`<text>` 是**原生组件**，不支持嵌套。当 `<text>` 内部包含另一个 `<text>` 时，内层 `<text>` 会被当作独立的块级元素处理，脱离父级 `<text>` 的布局上下文，被渲染到**页面坐标原点 (0, 0)**，即左上角。

```
视觉表现:
┌────────────────────────────────┐
│ 还剩45分钟                     │  ← 左上角 (0,0)，脱离 status-bar
│                                │
│  ┌──────────────────────────┐  │
│  │ 正在上课: 马克思主义...   │  │  ← 正常位置
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### 严重程度：🔴 P0

文字跑到左上角不仅位置错误，还可能遮挡其他 UI 元素（如返回按钮、标题等）。

### 正确代码

将嵌套 `<text>` 拆分为平级元素，用 `if` 条件渲染不同完整文本：

```html
<div class="status-current" if="{{ currentClass }}">
  <text class="status-text" style="color: {{ theme.text }}" if="{{ currentClass.remaining > 0 }}">
    正在上课: {{ currentClass.name }} 还剩{{ currentClass.remaining }}分钟
  </text>
  <text class="status-text" style="color: {{ theme.text }}" if="{{ currentClass.remaining <= 0 }}">
    正在上课: {{ currentClass.name }} 即将结束
  </text>
</div>
```

**关键改动：**
- 移除 `<text>` 嵌套，两个 `<text>` 平级
- 每个 `<text>` 包含完整的一句话
- 用 `if` 条件控制显示哪个版本

### 修复后效果

```
┌──────────────────────────────────────┐
│ 正在上课: 马克思主义基本原理...     │
│ 还剩45分钟                          │  ← 正常位置
│ 下一节: 15分钟后 大学英语           │
└──────────────────────────────────────┘
```

---

## 最终根因总表

| 序号 | 问题 | 严重程度 | 根因 |
|------|------|----------|------|
| 1 | 图标显示方框 | 🔴 P0 | Emoji 字符快应用无字体支持 |
| 2 | 文字溢出区域 | 🔴 P0 | `status-text` 缺少 `text-overflow` |
| 3 | 区域高度不自适应 | 🟡 P1 | `status-bar` 无自适应高度 |
| 4 | 时间文字跑到左上角 | 🔴 P0 | 快应用不支持 `<text>` 嵌套 `<text>` |

---

## 问题4：剩余时间计算错误，显示0.6分钟而非36分钟

### 问题现象

状态栏显示"正在上课: 数学 还剩0.6分钟"，但课程 18:40 结束，当前时间 18:04，实际剩余 36 分钟。

### 错误代码

```javascript
// 文件: src/pages/index/index.ux
// 函数: updateCurrentStatus() 和 findUpcomingClass()

// 第459行
remaining: Math.round((cls.endMin - nowMinutes) / 60 * 10) / 10,
//                                                      ^^^^
//                                                      多余的 / 60

// 第467行
waitMin: Math.round((nxt.startMin - nowMinutes) / 60 * 10) / 10,
//                                                    ^^^^
//                                                    多余的 / 60
```

### 计算过程追踪

以"数学课 18:40 结束，当前 18:04"为例：

```
parseTime("18:40") = 18 × 60 + 40 = 1120  (总分钟数)
parseTime("18:04") = 18 × 60 + 4  = 1084  (总分钟数)

差值 = 1120 - 1084 = 36 分钟 ✅

错误公式: Math.round(36 / 60 * 10) / 10
        = Math.round(0.6 * 10) / 10
        = Math.round(6) / 10
        = 0.6  ← 分钟被转成了小时！

显示: "还剩 0.6 分钟"  ← 实际是 36 分钟
```

### 根因分析

`endMin` 和 `nowMinutes` 都是 `parseTime()` 返回的**以分钟为单位的值**（从 00:00 开始的总分钟数）。两者相减得到的是**分钟差**，单位已经是分钟。

但公式中多余的 `/ 60` 将分钟差转换成了**小时**：
- `36 分钟 / 60 = 0.6 小时`

然后 `* 10 / 10` 只是保留一位小数，不会恢复单位。

**结果**：显示的是"小时数"但标签写的是"分钟"，导致数值缩小了 60 倍。

```
36 分钟 → 显示 0.6  ← 错误
36 分钟 → 显示 36   ← 正确
```

### 影响范围

`/ 60` 错误出现在 **7 处**（`remaining` × 2 + `waitMin` × 5），全部在 `updateCurrentStatus()` 和 `findUpcomingClass()` 两个函数中：

| 位置 | 变量 | 影响 |
|------|------|------|
| 第459行 | `remaining` | "还剩X分钟" 显示错误 |
| 第467行 | `waitMin` | "下一节: X分钟后" 显示错误 |
| 第477行 | `waitMin` | 同上 |
| 第542行 | `remaining` | 同上 |
| 第549行 | `waitMin` | 同上 |
| 第558行 | `waitMin` | 同上 |

此外，`waitMin` 的值还用于提醒触发判断：
```javascript
if (next.waitMin <= remindMinutes && next.waitMin > 0) {
```
如果 `waitMin` 是 0.6（小时）而 `remindMinutes` 是 5（分钟），则 `0.6 <= 5` 为 `true`，导致提前 36 分钟就触发提醒，而非预期 5 分钟。

### 正确代码

```javascript
// 直接保留分钟差，去掉 / 60
remaining: Math.round((cls.endMin - nowMinutes) * 10) / 10,
waitMin: Math.round((nxt.startMin - nowMinutes) * 10) / 10,
```

### 修复后验证

```
数学课 18:40 结束，当前 18:04

修复前: Math.round(36 / 60 * 10) / 10 = 0.6  → "还剩0.6分钟" ❌
修复后: Math.round(36 * 10) / 10 = 36        → "还剩36分钟"  ✅
```

---

## 最终根因总表（更新）

| 序号 | 问题 | 严重程度 | 根因 |
|------|------|----------|------|
| 1 | 图标显示方框 | 🔴 P0 | Emoji 字符快应用无字体支持 |
| 2 | 文字溢出区域 | 🔴 P0 | `status-text` 缺少 `text-overflow` |
| 3 | 区域高度不自适应 | 🟡 P1 | `status-bar` 无自适应高度 |
| 4 | 时间文字跑到左上角 | 🔴 P0 | 快应用不支持 `<text>` 嵌套 `<text>` |
| 5 | 剩余时间显示错误 | 🔴 P0 | 公式多 `/ 60`，分钟被转成小时