# position: fixed 在手环/手表上导致黑屏问题的技术分析

## 问题现象

在多个品牌手环/手表型号上，当页面中包含 `position: fixed` 的覆盖层（overlay/dialog）时，屏幕仅显示**左上角一小块内容**，其余区域全部**黑屏**。

受影响的页面：高级版解锁对话框（`unlock-dialog` 组件）所在的所有页面。

## 涉及的代码位置

- `src/components/unlock-dialog.ux` — `.sheet-overlay { position: fixed; ... }`
- `src/components/premium-overlay.ux` — `.overlay-modal { position: fixed; ... }`

使用 `unlock-dialog` 的页面（共5个）：
- `src/pages/settings/settings.ux`
- `src/pages/qrcode-generator/qrcode-generator.ux`
- `src/pages/schedule-manager/schedule-manager.ux`
- `src/pages/vibration-lab/vibration-lab.ux`
- `src/pages/schedule-qrcode/schedule-qrcode.ux`

## 根本原因分析

### 1. 手环/手表的 Web 渲染引擎差异

快应用在手环/手表上使用的渲染内核与手机上**完全不同**：

| 平台 | 渲染引擎 | 特性支持 |
|---|---|---|
| 手机快应用 | 系统 WebView（Chromium） | 完整 CSS 3 支持 |
| 手环/手表 | **轻量级渲染引擎**（非标准 WebView） | 仅支持 CSS 子集 |

手环/手表的轻量渲染引擎通常基于**自研排版引擎**，对 CSS 的核心特性支持有限。

### 2. `position: fixed` 的渲染机制

`position: fixed` 在标准浏览器中需要：

1. **创建独立的层叠上下文（Stacking Context）**
2. 将元素**脱离文档流**
3. 将元素固定定位在**视口（viewport）**上
4. 在每帧渲染时**独立计算位置**

手环/手表轻量引擎对步骤 1 和 4 的处理存在问题：

- **步骤 1 失败**：引擎尝试为 `fixed` 元素创建独立渲染层，但可能分配了错误的内存区域或错误的坐标原点。
- **步骤 4 失败**：引擎无法正确跟踪 viewport 变化（或不理解 viewport 概念），导致定位计算错误。

### 3. 为什么表现是"仅显示左上角一点"

这是关键线索，揭示了具体的渲染 BUG：

```
元素设置了：
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
```

在标准浏览器中，这创建一个**全屏覆盖层**（0,0 到 viewport 右下角）。

但在手环轻量引擎中：

1. 引擎能正确识别 `top: 0; left: 0;` → 元素从(0,0)开始
2. 但 `right: 0; bottom: 0;` **被忽略或解释错误**
3. 引擎使用**元素的默认尺寸**（或 0×0）作为初始尺寸
4. 如果元素的**子元素有具体尺寸**（如 title text 的字体大小），引擎使用子元素撑开的尺寸
5. 结果：覆盖层只有**左上角一小块**内容区域可见
6. 覆盖层的 `background-color: rgba(0,0,0,0.35)` 只在这个小块上生效
7. 其余屏幕区域因为没有渲染内容 → 显示为**黑屏**

### 4. 为什么 `position: absolute` 能工作

`position: absolute` 相对的是**最近的 `position: relative` 祖先元素**，而非 viewport：

- 手环引擎对"祖先元素定位"的处理更简单、更成熟
- 不需要维护独立的 viewport 参考系
- 元素尺寸计算更直接：基于包含块（containing block）而非 viewport

### 5. 受影响的手环型号范围

| 屏幕形状 | 典型型号 | 受影响程度 |
|---|---|---|
| 圆形（circle） | 华为 Watch GT 系列、荣耀手环系列 | 🔴 严重 |
| 胶囊形（capsule） | 小米手环 6/7/8、OPPO 手环 | 🔴 严重 |
| 方形（rect） | 华为 Watch Fit 系列 | 🟡 中等 |

圆形和胶囊形屏幕由于宽高比特殊（非标准矩形），引擎在处理 `right: 0; bottom: 0` 时更容易出错。

## 修复方案

### 修改内容

1. **`unlock-dialog.ux`**：`.sheet-overlay` 的 `position: fixed` → `position: absolute`
2. **`premium-overlay.ux`**：`.overlay-modal` 的 `position: fixed` → `position: absolute`
3. **5个引用页面**的根元素 CSS 添加 `position: relative`，确保 `absolute` 定位有正确的包含块

### 为什么 `position: absolute` + 父元素 `position: relative` 是安全的

```
position: absolute 在手环引擎中：
  ✅ 不需要 viewport 参考系（不会触发引擎 BUG）
  ✅ 基于祖先元素定位（引擎原生支持）
  ✅ 子元素尺寸计算正常
  ✅ 不需要创建独立渲染层
```

### 修改的文件清单

| 文件 | 改动 |
|---|---|
| `src/components/unlock-dialog.ux` | `position: fixed` → `position: absolute` |
| `src/components/premium-overlay.ux` | `position: fixed` → `position: absolute` |
| `src/pages/settings/settings.ux` | `.settings-page` 添加 `position: relative` |
| `src/pages/qrcode-generator/qrcode-generator.ux` | `.page` 添加 `position: relative` |
| `src/pages/schedule-manager/schedule-manager.ux` | `.page-root` 添加 `position: relative` |
| `src/pages/vibration-lab/vibration-lab.ux` | `.page` 添加 `position: relative` |
| `src/pages/schedule-qrcode/schedule-qrcode.ux` | `.page` 添加 `position: relative` |

## 验证方法

1. 在手机快应用上验证：overlay 对话框正常显示，全屏覆盖
2. 在手环/手表上验证：overlay 对话框正常显示，**不再黑屏**
3. 验证各种屏幕形状（圆形/胶囊/方形）均正常

## 技术总结

这是一个典型的**跨端兼容性问题**。`position: fixed` 在标准浏览器/手机上表现完美，但在手环/手表的轻量渲染引擎中是一个已知的不稳定特性。最佳实践是在快应用开发中避免使用 `position: fixed`，改用 `position: absolute` + 父元素 `position: relative` 的组合。