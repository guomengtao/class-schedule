# 钉首页功能升级方案

## 当前状态

每个页面顶栏右侧有一个彩色 `📌钉首页` 按钮，样式为：

```html
<input class="pin-btn" type="button" value="📌钉首页" onclick="pinToHome"
  style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
```

涉及 11 个页面：
- test-area、schedule-manager、qrcode-generator、activation-lab
- device-info、vibration-lab、accordion-demo、schedule-qrcode
- add-course-demo、check-demo、comp-demo

## 问题分析

| 对比项 | 顶栏彩色按钮（当前） | 底部弱化文字（建议） |
|:---|:---|:---|
| 视觉权重 | 高（彩色、有背景） | 低（纯文字、无背景、灰色） |
| 使用频率 | 一次设置，几乎不用再点 | 符合"低频操作放底部"的设计原则 |
| 对主流程的干扰 | 大（和返回按钮抢位置） | 小（在内容区下方，看完内容才看到） |
| 用户心理 | "这是个重要操作" | "哦，这里还有个辅助功能" |

## 升级方案

### 1. 页面底部弱化文字链接

在每个页面的内容区底部，添加弱化的文字链接：

```html
<div class="footer-actions">
  <text class="pin-link" onclick="pinToHome" style="color: {{ theme.textMuted }}; font-size: 13px;">
    📌 固定到首页
  </text>
</div>
```

**关键设计要点**：
- 颜色用 `theme.textMuted`（灰色），不是 `theme.accent`（亮色）
- 字体大小用 `13px`，比正文略小
- 不加背景、不加圆角、不加边框
- 前面加 📌 图标，让用户知道是"固定"操作
- 居中显示

### 2. 首页固定提示语

在首页已钉页面区域上方，添加固定提示语：

```html
<text class="pinned-hint" style="color: {{ theme.textMuted }}; font-size: 12px;">
  📌 已固定页面，点击可快速访问
</text>
```

### 3. 删除顶栏按钮

从所有页面的 header 中删除 `📌钉首页` 按钮，同时删除对应的 `.pin-btn` CSS 样式。

## 实施步骤

1. 删除 11 个页面 header 中的 `pin-btn` 按钮
2. 删除 11 个页面 CSS 中的 `.pin-btn` 样式
3. 在 11 个页面内容底部添加 `footer-actions` 区域
4. 在首页 pinned-bar 内添加固定提示语
5. 验证所有页面 `pinToHome` 方法仍正常工作

## 设计原则总结

> 功能本身没问题，把它从"显眼位置"移到"不碍眼位置"，臃肿感就消失了。