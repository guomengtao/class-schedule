# Xiaomi Vela 快应用遮罩透明度深度分析

## 背景

在 [xiaomi-quickapp-overlay-bug-analysis.md](./xiaomi-quickapp-overlay-bug-analysis.md) 和 [xiaomi-quickapp-overlay-solution.md](./xiaomi-quickapp-overlay-solution.md) 中，我们分析了遮罩层在 Vela 快应用中的兼容性问题。本文深入分析**透明度**维度，澄清之前的部分错误结论。

---

## 之前的错误结论及纠正

### 错误 1：8位 ARGB 格式无效

**原结论**：`#26000000`（AARRGGBB）作为遮罩背景色无效。

**纠正**：**格式本身就写错了。** 快应用联盟标准（doc.quickapp.cn/widgets/color.html）明确规定 8 位十六进制是 **`#RRGGBBAA`（透明度在最后两位）**，不是 Android 的 `#AARRGGBB`。

| 写法 | 格式 | 实际解析结果 |
|------|------|------|
| `#26000000`（❌ 错误） | AARRGGBB | R=26, G=00, B=00, **A=00** → 完全透明 |
| `#00000026`（✅ 正确） | RRGGBBAA | R=00, G=00, B=00, **A=26** → 黑色 15% 透明 |

`26`（hex）= 38（decimal），38/255 ≈ 15%。所以 `#00000026` ≈ `rgba(0,0,0,0.15)`。

### 错误 2："div 背景丢弃 alpha 通道"

**原结论**：Vela 的 div 元素在渲染 `background-color` 时会丢弃 alpha 通道。

**纠正**：**缺乏确凿证据。** 重新核查 Vela 官方文档：

- Vela 的 `@keyframes` 属性列表**明确包含 `background-color: <color>`**，而 color 类型包含 rgba
- Vela 的 `transition-property` 支持列表中，`background-color` 标记为 √（支持）
- 没有任何官方文档说 div 背景特殊处理丢弃 alpha 通道

**rgba 不生效的最可能原因**：alpha 值太小，在深色背景上视觉不明显。

页面 bg 是 `#1a1a2e`（很深的蓝黑色），在这个底色上叠加 15% 的黑色遮罩（`rgba(0,0,0,0.15)`），人眼几乎分辨不出来。结果的计算过程：

```
最终色 = 遮罩色 × alpha + 底色 × (1 - alpha)
       = (0,0,0) × 0.15 + (26,26,46) × 0.85
       ≈ (22,22,39)
```

即 `#161627`，与底色 `#1a1a2e` 的差异肉眼几乎不可见。

---

## 快应用支持的透明颜色格式

根据快应用联盟颜色规范，以下格式均支持：

| 格式 | 示例 | 说明 |
|------|------|------|
| `rgba()` | `rgba(0,0,0,0.5)` | 红绿蓝 + alpha，最常用的格式 |
| `#RRGGBBAA` | `#00000080` | 8 位十六进制，透明度在最后两位 |
| `#RGBA` | `#0008` | 4 位简写，R、G、B、A 各一位 |
| `transparent` | `transparent` | 关键字，等同于 `rgba(0,0,0,0)` |

### 透明度对照表

| alpha 值 | 十六进制（AA） | 视觉效果 |
|:--:|:--:|------|
| 0.05 | `0D` | 几乎不可见 |
| 0.10 | `1A` | 极淡 |
| 0.15 | `26` | 很淡 |
| 0.20 | `33` | 淡 |
| 0.35 | `59` | 中等 |
| 0.50 | `80` | 半透明 |
| 0.80 | `CC` | 很深 |
| 1.00 | `FF` | 不透明 |

---

## 验证方法

### 方法一：大 alpha 值测试

将遮罩从 `rgba(0,0,0,0.15)` 改成 `rgba(255,0,0,0.5)`（半透明红色）：

```
/* 测试用 */
background-color: rgba(255, 0, 0, 0.5);
```

如果能看到红色遮罩覆盖在页面上 → rgba 完全支持，之前只是颜色太暗看不见。

### 方法二：RRGGBBAA 格式测试

用正确的 8 位 hex 格式：

```
/* 黑色 50% 透明 */
background-color: #00000080;
```

### 方法三：对比测试

在 demo 页面中加入了李白《静夜思》作为对比文本。打开弹窗后，透过遮罩看诗词的清晰度，可以直观对比三种方案的透明度差异。

---

## 深色背景下透明度的特殊问题

你的页面底色是 `#1a1a2e`（深蓝黑），这是一个**深色主题**。在深色背景下：

- 黑色遮罩（`rgba(0,0,0,...)`）的视觉变化非常小
- 需要用**更大的 alpha 值**才能达到与浅色背景相同的视觉对比度
- 建议深色背景下遮罩 alpha 至少 **0.25~0.35** 才能有明显感知

| 底色 | 0.15 遮罩效果 | 0.35 遮罩效果 |
|------|------|------|
| 白色 `#ffffff` | 明显可见 | 非常明显 |
| 深色 `#1a1a2e` | 几乎不可见 | 可感知 |

---

## 移动弹窗的动画支持

### 支持的能力

| 能力 | 支持情况 | 写法 |
|------|:--:|------|
| 静态 `transform` | ✅ | `transform: translateX(100px)` |
| `@keyframes` 动画 | ✅ | `animation-name: slideUp; animation-duration: 300ms` |
| `animation-fill-mode: forwards` | ✅ | 动画结束后保持最终状态 |
| `position: absolute` + `left/top` | ✅ | 静态定位 |

### 不支持的能力

| 能力 | 支持情况 | 替代方案 |
|------|:--:|------|
| `transition: transform` | ❌ | 用 `@keyframes` 替代 |
| `transition: left/top` | ❌ | 用 `@keyframes` + `transform` 替代 |
| JS 动态 `transform` 字符串 | ❌ | 必须用 `JSON.stringify({translateX:"100px"})` 格式 |

### 动态 transform 的正确写法

```javascript
// ❌ 错误：CSS 字符串在动态绑定中不生效
this.dialogStyle = {
  transform: 'translateX(100px)'
}

// ✅ 正确：必须用 JSON.stringify 的对象格式
this.dialogStyle = {
  transform: JSON.stringify({
    translateX: '100px',
    translateY: '0px'
  })
}
```

### 弹窗出现动画的正确写法

```css
/* 弹窗从底部滑入 */
.slide-up {
  animation-name: slideUp;
  animation-duration: 300ms;
  animation-fill-mode: forwards;
}

@keyframes slideUp {
  0% {
    transform: translateY(200px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

## 排查清单

如果遮罩透明度不生效，按以下顺序排查：

1. **用大 alpha 值验证**：`rgba(255,0,0,0.5)` 红色半透明，确认 rgba 是否真的被支持
2. **检查 8 位 hex 格式**：是 `#RRGGBBAA` 不是 `#AARRGGBB`
3. **确认遮罩在 stack 中的位置**：遮罩层必须写在页面内容层**之后**（后写的层级更高）
4. **确认遮罩尺寸**：`position: absolute; left: 0; top: 0; width: 100%; height: 100%;`
5. **深色背景加大 alpha**：深底上黑色遮罩需要更大的 alpha 值（建议 0.25+）
6. **真机测试**：模拟器渲染可能与真机不一致

---

## 结论

1. **rgba() 透明度在 Vela 快应用中明确支持**，之前"不生效"的结论大概率是因为 alpha 值太小 + 深色背景导致视觉上不可见
2. **8 位 hex 必须用 `#RRGGBBAA` 格式**，不是 Android 的 `#AARRGGBB`
3. **移动弹窗支持 `@keyframes` + `transform`**，但不支持 `transition`
4. **JS 动态设置 transform 必须用 `JSON.stringify()` 对象格式**
5. **真机测试是最终的验证手段**，模拟器行为不可完全信赖