# 首页"简/详"切换按钮不显示 - 原因分析

## 问题

首页顶部 `status-bar` 区域的"简"/"详"切换按钮不显示。

## 按钮位置

```html
<!-- index.ux:22-35 -->
<div class="status-current" if="{{ currentClass }}" ...>
  <text class="status-text" style="...">正在上课: 语文 还剩15分钟</text>
  <div class="status-toggle" onclick="toggleStatusMode">
    <text class="status-toggle-text">简</text>
  </div>
</div>
```

## 原因分析

### 原因 1（🔴 主要）：缺少 `flex-shrink: 0`，按钮被挤压到 0 宽度

```css
.status-current {
  flex-direction: row;
  width: 100%;
}

.status-text {
  flex: 1;           /* ← 占据所有剩余空间 */
}

.status-toggle {
  width: 44px;       /* ← 期望 44px，但 flex-shrink 默认为 1 */
  /* 缺少 flex-shrink: 0 */
}
```

**原理**：Flex 布局中，`flex-shrink` 默认值为 `1`。当容器空间不足时，`.status-text`（`flex: 1`）会挤压 `.status-toggle`。`.status-toggle` 的 `width: 44px` 只是一个**建议值**，不是硬性最小宽度。没有 `flex-shrink: 0`，按钮会被压缩到宽度为 0，视觉上完全不可见。

**计算**：
```
status-bar 容器: padding-left 36px + padding-right 36px = 72px
status-current 可用宽度: 454px (屏幕) - 72px = 382px

status-text 内容: "正在上课: 语文 还剩15分钟" ≈ 280px
status-toggle 期望: 44px + margin-left 8px = 52px

总需求: 280px + 52px = 332px < 382px  ← 理论上有空间

但 QuickApp 的 flex 实现可能不同：
- 文字可能被测量为更大
- status-text 的 flex: 1 可能优先扩展
- 最终 status-toggle 被挤压到接近 0
```

### 原因 2（🟡 中等）：QuickApp 可能不支持 `rgba()`

```css
.status-toggle {
  background-color: rgba(126, 200, 227, 0.15);  /* ← 半透明 */
}
```

QuickApp 的 CSS 引擎基于轻量级实现，可能不支持 `rgba()` 语法。如果 `rgba()` 解析失败，`background-color` 会回退为透明，按钮虽然存在（有 `width` 和 `height`），但背景色与父容器相同，视觉上不可见。

**验证方法**：将 `rgba(126, 200, 227, 0.15)` 改为 `#1a3a4a`（不透明颜色），查看按钮是否出现。

### 原因 3（🟢 轻微）：缺少 `flex-direction`，子元素布局异常

```css
.status-toggle {
  width: 44px;
  height: 44px;
  /* 缺少 flex-direction: row 或 column */
  justify-content: center;
  align-items: center;
}
```

QuickApp 中，`justify-content` 和 `align-items` 需要明确的 `flex-direction` 才能生效。没有 `flex-direction`，子元素 `<text>` 可能不会居中，导致"简"字显示在容器外部或被裁剪。

## 修复方案

### 方案 A：最小改动（推荐）

只改 CSS，3 个属性：

```diff
 .status-toggle {
   width: 44px;
   height: 44px;
   border-radius: 10px;
-  background-color: rgba(126, 200, 227, 0.15);
+  background-color: #1a3a4a;
   justify-content: center;
   align-items: center;
   margin-left: 8px;
+  flex-shrink: 0;
+  flex-direction: row;
 }
```

| 改动 | 作用 |
|------|------|
| `flex-shrink: 0` | 防止被 `.status-text` 挤压 |
| `flex-direction: row` | 使 `justify-content`/`align-items` 生效 |
| `rgba()` → `#1a3a4a` | 避免 QuickApp 不支持 rgba |

### 方案 B：改用 inline style（如果方案 A 仍不生效）

将 `background-color` 从 CSS 移到 inline style，使用 `theme` 动态颜色：

```html
<div class="status-toggle" style="background-color: {{ theme.cardLight }}; flex-shrink: 0;">
```

## 验证步骤

1. 先加 `flex-shrink: 0` 和 `flex-direction: row`，观察按钮是否出现
2. 如果仍不出现，将 `rgba()` 改为 `#1a3a4a`
3. 如果仍不出现，改用 inline style 方式

## 涉及文件

| 文件 | 行号 |
|------|------|
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) | CSS: 972-980 (`.status-toggle`) |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) | 模板: 32-34 (`.status-toggle` div) |