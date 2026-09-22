# 页面顶部返回按钮和标题文字大小统计

## 总体概况

项目中共有 **38 个 .ux 页面**，其中 **26 个**有独立的 Header（返回按钮 + 标题），其余页面为首页或无 Header。

## 命名模式

| 命名模式 | 返回按钮 class | 标题 class | 页面数 |
|----------|---------------|-----------|--------|
| 模式 A | `.back-btn` | `.title` | 16 |
| 模式 B | `.back-btn` | `.header-title` | 10 |

## 详细统计

### 默认屏幕（无媒体查询）

| 页面 | 返回按钮 | 标题 | 标题 class | 返回按钮文字 |
|------|---------|------|-----------|-------------|
| chinese-input | **26px** | **32px** | `.title` | `◀ 返回` |
| add-course | 18px | 28px | `.header-title` | `返回` |
| check-demo | 14px | 22px | `.title` | `返回` |
| nickname-edit | 20px | 22px | `.header-title` | `返回` |
| lab-module-test | 18px | 24px | `.title` | `返回` |
| detail | 18px | 28px | `.header-title` | `返回` |
| week-view | 14px | 18px | `.header-title` | `返回` |
| home-module-demo | 14px | 18px | `.title` | `返回` |
| overlay-demo | 14px | 18px | `.header-title` | `返回` |
| debug-demo | 14px | 18px | `.title` | `返回` |
| vibration-lab | 14px | 18px | `.title` | `返回` |
| bottom-nav-demo | 14px | 17px | `.title` | `返回` |
| premium-test | 14px | 18px | `.title` | `返回` |
| premium-test/index | 14px | 18px | `.title` | `返回` |
| backup-restore | 13px | 16px | `.title` | `返回` |
| homepage-settings | 14px | 18px | `.title` | `返回` |
| reset-data | 14px | 18px | `.header-title` | `返回` |
| course-manager | 14px | 18px | `.header-title` | `返回` |
| schedule-manager | 14px | 18px | `.title` | `返回` |
| activation | 13px | 16px | `.header-title` | `返回` |
| statistics | 13px | 16px | `.header-title` | `返回` |
| device-info | 14px | 18px | `.header-title` | `返回` |
| storage-viewer | 14px | 18px | `.title` | `返回` |
| icon-collect | 14px | 18px | `.title` | `返回` |
| lab | 14px | 18px | `.title` | `返回` |
| pinned-pages | 14px | 18px | `.header-title` | `返回` |
| qrcode-generator | 14px | 18px | `.title` | `返回` |
| accordion-demo | 14px | 18px | `.title` | `返回` |
| overlay-test | 14px | 18px | `.title` | `返回` |
| schedule-qrcode | 14px | 18px | `.title` | `返回` |
| scroll-demo | - | 18px | `.title` | 无返回按钮 |
| today-demo | 14px | 18px | `.title` | `返回` |

### 圆形屏幕 (shape: circle)

| 页面 | 返回按钮 | 标题 |
|------|---------|------|
| chinese-input | 13px | 16px |
| add-course | 15px | 22px |
| nickname-edit | 16px | 18px |
| week-view | 12px | 16px |
| home-module-demo | - | - |
| backup-restore | 12px | 14px |
| homepage-settings | 12px | 14px |
| reset-data | 13px | 15px |
| course-manager | 13px | 15px |
| schedule-manager | - | - |
| activation | 13px | 16px |
| statistics | 13px | 16px |
| device-info | 12px | 16px |
| vibration-lab | 13px | 16px |
| detail | 14px | 20px |

### 胶囊屏幕 (shape: capsule)

| 页面 | 返回按钮 | 标题 |
|------|---------|------|
| chinese-input | 24px | 28px |
| add-course | 14px | 20px |
| nickname-edit | 16px | 17px |
| week-view | 12px | 16px |
| home-module-demo | - | - |
| reset-data | 13px | 15px |
| course-manager | 13px | 15px |
| vibration-lab | 12px | 15px |
| detail | 14px | 20px |

### 方形屏幕 (shape: rect)

| 页面 | 返回按钮 | 标题 |
|------|---------|------|
| chinese-input | 22px | 26px |
| add-course | 14px | 20px |
| nickname-edit | 16px | 17px |
| week-view | 12px | 16px |
| home-module-demo | - | - |
| homepage-settings | 12px | 14px |
| reset-data | 12px | 15px |
| course-manager | 13px | 15px |
| vibration-lab | 12px | 15px |
| detail | 14px | 20px |

---

## 问题分析

### 1. chinese-input 页面 Header 字号异常大

| 对比 | chinese-input | 其他页面主流 |
|------|-------------|-------------|
| 返回按钮 | **26px** | **14px** |
| 标题 | **32px** | **18px** |

中文输入法页面的 Header 比其他页面大了约 **2 倍**，是之前"字体加大一倍"的改动导致的。这在手表小屏幕上会占用过多空间，挤压键盘区域。

### 2. 主流标准值

26 个有 Header 的页面中，**绝大多数**使用以下标准：

| 元素 | 主流值 | 页面数 |
|------|-------|--------|
| 返回按钮 | 14px | 22/26 |
| 标题 | 18px | 18/26 |

### 3. 偏离标准的页面

| 页面 | 返回按钮 | 标题 | 偏离程度 |
|------|---------|------|---------|
| **chinese-input** | 26px | 32px | ⚠️ 严重偏大 |
| add-course | 18px | 28px | 偏大 |
| check-demo | 14px | 22px | 标题偏大 |
| nickname-edit | 20px | 22px | 返回按钮偏大 |
| lab-module-test | 18px | 24px | 偏大 |

### 4. 是否使用主题色

| 方式 | 页面数 | 说明 |
|------|-------|------|
| CSS 硬编码颜色 | 8 | 如 `color: #7ec8e3`，不跟随主题切换 |
| 主题变量 | 18 | 如 `style="color: {{ theme.accent }}"`，支持暗色模式 |

### 5. 返回按钮文字内容

| 文字 | 页面数 |
|------|-------|
| `返回` | 25 |
| `◀ 返回` | 1 (chinese-input) |

---

## 建议

| 问题 | 建议 |
|------|------|
| chinese-input Header 过大 | 改回 14px/18px 标准，或至少降到 18px/22px |
| CSS 硬编码颜色 | 改为主题变量 `{{ theme.accent }}` |
| 返回按钮文字不统一 | 统一为 `返回`，去掉 `◀` 符号 |
| 媒体查询不完整 | 部分页面只有 circle 查询，缺少 capsule/rect |