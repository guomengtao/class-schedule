# 全页面 Unicode 图标分析

> 项目已标准化使用 PNG 图标（`src/common/icons/`），替代 Unicode 字符以确保跨设备渲染一致性。
> 本文件逐一排查所有页面中仍在使用 Unicode 字符作为图标的地方。

---

## 可用 PNG 图标清单

| PNG 文件 | 用途 |
|----------|------|
| `icon_back.png` | 返回按钮 |
| `icon_arrow_left.png` | 左箭头 |
| `icon_arrow_right.png` | 右箭头 |
| `icon_chevron_down.png` | 下箭头/展开 |
| `icon_chevron_up.png` | 上箭头/折叠 |
| `icon_chevron_right.png` | 右箭头/列表跳转 |
| `icon_home.png` | 首页 |
| `icon_plus.png` | 添加/新增 |
| `icon_swap.png` | 交换/切换 |
| `icon_trash.png` | 删除 |

---

## 严重等级说明

- **🔴 需要修复**：导航/返回按钮使用 Unicode，有对应 PNG 可用
- **🟡 建议修复**：功能性图标使用 Unicode，有对应 PNG 可用
- **🟢 无需修复**：纯内容文字、选中标记、测试页互动文字

---

## 1. 输入法/激活页面 (`activation.ux`)

**路径**: [activation.ux](../src/pages/activation/activation.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 38 | `▼` | 步骤1→步骤2的箭头装饰 | 步骤流程指示器，纯装饰 | 🟢 无需修复 |
| 63 | `▼` | 步骤2→步骤3的箭头装饰 | 同上 | 🟢 无需修复 |
| 179 | `←` | 键盘退格键 | 手机式数字键盘布局，目前无对应PNG | 🟢 无需修复 |

> **说明**：激活页面的 `←` 退格键是手机键盘布局的一部分，目前没有对应的 PNG 资源。如果要替换需要新增退格键 PNG。

---

## 2. 添加课程-胶囊版 (`lab-add-course.ux`)

**路径**: [lab-add-course.ux](../src/pages/lab-add-course/lab-add-course.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 4 | `◀` | Header 返回按钮 | `<input class="back-btn" value="◀">` | 🔴 需修复 → `icon_back.png` |
| 24 | `◀` | 课程选择左切换 | `<input class="arrow-btn" value="◀">` | 🔴 需修复 → `icon_arrow_left.png` |
| 29 | `▶` | 课程选择右切换 | `<input class="arrow-btn" value="▶">` | 🔴 需修复 → `icon_arrow_right.png` |

> **共 3 处需要修复**，参照 `detail.ux` 的修复方式。

---

## 3. 震动自定义 V2 (`vibration-lab-v2.ux`)

**路径**: [vibration-lab-v2.ux](../src/pages/vibration-lab/vibration-lab-v2.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 5 | `◀` | Header 返回按钮 | `<text class="back-btn">◀</text>` | 🔴 需修复 → `icon_back.png` |

> **共 1 处需要修复**。

---

## 4. 测试区 (`test-area-v2.ux`)

**路径**: [test-area-v2.ux](../src/pages/test-area-v2/test-area-v2.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 5 | `‹` | Header 返回按钮 | `<text class="back-btn-text">‹</text>` | 🔴 需修复 → `icon_back.png` |
| 16 | `›` | 列表项右箭头 | `<text class="item-arrow">›</text>` | 🟡 建议修复 → `icon_chevron_right.png` |

---

## 5. 设置页面 (`settings.ux`)

**路径**: [settings.ux](../src/pages/settings/settings.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 17,85,96,113,121,129,137,145,153,161,169,177,185,196,204,212,220,230 | `›` | 列表行右箭头 | 设置项跳转指示器 | 🟡 建议统一替换为 `icon_chevron_right.png` |
| 26,50,72,105 | `v` / `›` | 分组展开/折叠 | 主题、字号、课表、工具 | 🟡 建议统一替换为 `icon_chevron_down.png` / `icon_chevron_right.png` |

> **共 22 处**，但都是统一模式。如果替换，建议在 CSS 中做统一处理。

---

## 6. 首页设置 (`homepage-settings.ux`)

**路径**: [homepage-settings.ux](../src/pages/homepage-settings/homepage-settings.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 75 | `›` | 主页设置输入箭头 | 与设置页同类 | 🟡 建议修复 → `icon_chevron_right.png` |

---

## 7. 二维码生成 (`qrcode-generator.ux`)

**路径**: [qrcode-generator.ux](../src/pages/qrcode-generator/qrcode-generator.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 16 | `＋` | 添加按钮 | `<text class="add-btn-text">＋ 添加二维码</text>` | 🟡 建议修复 → `icon_plus.png` |
| 23 | `▲` / `▼` | 展开/折叠箭头 | 手风琴组件 | 🟡 建议修复 → `icon_chevron_up.png` / `icon_chevron_down.png` |

---

## 8. 黑屏检测 (`black-screen-check.ux`)

**路径**: [black-screen-check.ux](../src/pages/black-screen-check/black-screen-check.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 19,28,37,46,55 | `✓` / `›` | 检测项状态 | 已测显示 ✓，未测显示 › | 🟢 测试页，无需修复 |

---

## 9. 震动自定义 V1 (`vibration-lab.ux`)

**路径**: [vibration-lab.ux](../src/pages/vibration-lab/vibration-lab.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 37 | `✓` | 选中状态标记 | 震动方案选择 | 🟢 选中标记，无需修复 |
| 51 | `▶` | 播放按钮 | `▶ 试听` | 🟢 按钮文字，无对应PNG |
| 122 | `✕` | 删除按钮 | 删除预设 | 🟡 建议修复 → `icon_trash.png` |

---

## 10. 重置数据 (`reset-data.ux`)

**路径**: [reset-data.ux](../src/pages/reset-data/reset-data.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 12 | `▲` | 警告图标 | 重要提示前的三角 | 🟢 纯内容装饰，无需修复 |

---

## 11. 打赏支持 (`donate.ux`)

**路径**: [donate.ux](../src/pages/donate/donate.ux)

| 行号 | 字符 | 位置 | 说明 | 等级 |
|------|------|------|------|------|
| 24 | `♥` | 感谢图标 | 感谢您的支持 | 🟢 纯内容，无需修复 |

---

## 12. Demo/测试页面 (bs-demo1~5, header-demo1~2)

这些是开发测试页面，非用户实际功能页面。

| 页面 | 行号 | 字符 | 说明 | 等级 |
|------|------|------|------|------|
| `header-demo1.ux` | 47 | `›` | 跳转 Demo2 按钮 | 🟢 测试页，无需修复 |
| `header-demo2.ux` | 60 | `‹` | 返回 Demo1 按钮 | 🟢 测试页，无需修复 |
| `bs-demo1.ux` | 33 | `›` | 导航按钮 | 🟢 测试页，无需修复 |
| `bs-demo2.ux` | 26,29 | `‹` / `›` | 导航按钮 | 🟢 测试页，无需修复 |
| `bs-demo3.ux` | 31,43 | `▼` | 步骤箭头 | 🟢 测试页，无需修复 |
| `bs-demo3.ux` | 59,62 | `‹` / `›` | 导航按钮 | 🟢 测试页，无需修复 |
| `bs-demo4.ux` | 46,49 | `‹` / `›` | 导航按钮 | 🟢 测试页，无需修复 |
| `bs-demo5.ux` | 51 | `‹` | 导航按钮 | 🟢 测试页，无需修复 |

---

## 13. 利益列表 `✓`（多处页面）

以下页面的利益列表（解锁高级版弹窗）使用 `✓` 作为列表符号，属于纯文本内容：

- `homepage-settings.ux` lines 122-125
- `backup-restore.ux` lines 56-65
- `reset-data.ux` lines 78-81
- `schedule-manager.ux` lines 80-83

> 🟢 无需修复，属于文本内容。

---

## 14. CSS 注释中的 Unicode（非实际渲染）

以下仅为 CSS 注释中的 Unicode 字符，不影响实际渲染：

- `add-course.ux` lines 767, 796 —— `◀` `▶` 在注释中
- `index.ux` lines 1033, 1083, 1085 —— `◀` `▶` 在注释中
- `day-nav.js` line 7 —— `◀` `▶` 在注释中

> 🟢 无需修复。

---

## 汇总

### 需要修复（🔴 4 处）

| 页面 | 元素 | Unicode | 替换为 |
|------|------|---------|--------|
| `lab-add-course.ux:4` | 返回按钮 | `◀` | `icon_back.png` |
| `lab-add-course.ux:24` | 左切换箭头 | `◀` | `icon_arrow_left.png` |
| `lab-add-course.ux:29` | 右切换箭头 | `▶` | `icon_arrow_right.png` |
| `vibration-lab-v2.ux:5` | 返回按钮 | `◀` | `icon_back.png` |
| `test-area-v2.ux:5` | 返回按钮 | `‹` | `icon_back.png` |

### 建议修复（🟡 若干）

- `settings.ux` —— 22 处列表箭头 `›`，可统一替换为 PNG
- `qrcode-generator.ux` —— `＋` 可替换为 `icon_plus.png`，`▲`/`▼` 替换为 `icon_chevron_{up/down}.png`
- `vibration-lab.ux:122` —— `✕` 可替换为 `icon_trash.png`
- `homepage-settings.ux:75` —— `›` 建议替换
- `test-area-v2.ux:16` —— `›` 建议替换
- `activation.ux:179` —— `←` 退格键，如需替换需要新增 backspace PNG

---

*分析完成日期: 2026-09-20*