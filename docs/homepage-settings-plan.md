# 首页设置页面重构计划

## 一、功能修复

### 1.1 时间显示开关失效

**问题描述**：首页设置中"时间显示"开关状态已正确保存到 `homepage_settings`，但首页 `index.ux` 未读取 `showTime` 字段来控制时钟的显示/隐藏。

**根因**：`index.ux` 中 `onInit` 和 `onShow` 调用 `store.getHomepageSettings()` 时传入空回调函数，未实际读取 `showTime` 值。时钟始终由 `isCapsule` 和 `isNarrowScreen` 控制，与设置开关无关。

**修复方案**：
1. 在 `index.ux` 的 `private` 中新增 `showTime: true` 数据字段
2. 在 `onInit` 的 `store.getHomepageSettings` 回调中读取 `showTime`
3. 在 `onShow` 的 `store.getHomepageSettings` 回调中读取 `showTime`
4. 修改时钟区域模板条件：`if="{{ !isCapsule && !isNarrowScreen && showTime }}"`

**涉及文件**：
- `src/pages/index/index.ux`（模板 + script）

**代码量估算**：约 5 行改动

---

### 1.2 课程提醒开关失效

**问题描述**：首页设置中"课程提醒"开关（实际控制状态栏显示）已正确保存到 `homepage_settings`，但首页 `index.ux` 未读取 `showStatusBar` 字段来控制状态栏的显示/隐藏。

**根因**：同上，`store.getHomepageSettings()` 回调为空。状态栏始终由 `isToday` 控制，与设置开关无关。

**修复方案**：
1. 在 `index.ux` 的 `private` 中新增 `showStatusBar: true` 数据字段
2. 在 `onInit` 和 `onShow` 的 `store.getHomepageSettings` 回调中读取 `showStatusBar`
3. 修改状态栏模板条件：`if="{{ isToday && showStatusBar }}"`

**涉及文件**：
- `src/pages/index/index.ux`（模板 + script）

**代码量估算**：约 5 行改动

---

## 二、界面重构

### 2.1 目标风格

与「震动实验室」(`vibration-lab.ux`) 页面风格保持一致：

| 元素 | 当前风格 | 目标风格 |
|------|---------|---------|
| 背景色 | 硬编码 `#f5f5f5` | 动态 `{{ theme.bg }}` |
| 卡片 | 白底灰字 `#ffffff` | 动态 `{{ theme.card }}` |
| 返回按钮 | 蓝色文字链接 | 主题色按钮 `◀ 返回` |
| 标题 | 硬编码 `#333333` | 动态 `{{ theme.text }}` |
| 开关 | 绿色 `#34c759` | 动态 `{{ theme.accent }}` |
| 分区边框 | 灰色 `#f0f0f0` | 动态 `{{ theme.border }}` |
| 芯片/标签 | 白底绿边 | 主题色背景 |

### 2.2 布局重构

```
┌─────────────────────────────────┐
│  ◀ 返回         首页设置        │  ← header (theme card)
├─────────────────────────────────┤
│  快速添加              [开关]   │
│  内容文字              点击输入  │  ← list-card (theme card)
│  课程提醒              [开关]   │
│  自定义内容            [开关]   │
│  时间显示              [开关]   │
├─────────────────────────────────┤
│  时间格式                       │
│  [年] [月] [日] [时] [分] [秒]  │  ← sub-section (theme card)
│         2026年9月 14:30         │
└─────────────────────────────────┘
```

### 2.3 具体改动清单

| 序号 | 改动项 | 说明 |
|------|--------|------|
| 1 | 引入 `store` theme | 页面使用 `theme` 动态配色 |
| 2 | 页面背景 | `background-color: {{ theme.bg }}` |
| 3 | 返回按钮 | 改为 `input` 按钮，样式参考 `vibration-lab`：`◀ 返回`，`theme.card` 背景 + `theme.accent` 文字 |
| 4 | 标题文字 | 使用 `theme.text` 颜色 |
| 5 | 卡片容器 | `.list-card` 和 `.sub-section` 使用 `theme.card` 背景 |
| 6 | 列表项标签 | 使用 `theme.text` 颜色 |
| 7 | 列表项分割线 | 使用 `theme.border` 颜色 |
| 8 | 开关轨 active | 使用 `theme.accent` 替代硬编码 `#34c759` |
| 9 | 开关轨 inactive | 使用 `theme.border` 替代硬编码 `#d0d0d0` |
| 10 | 芯片激活态 | 使用 `theme.accent` 边框 + `theme.cardLight` 背景 |
| 11 | 芯片文字激活态 | 使用 `theme.accent` 颜色 |
| 12 | 时间预览 | 使用 `theme.accent` 颜色 |
| 13 | 分区标题 | 使用 `theme.textSecondary` 颜色 |
| 14 | 删除所有硬编码颜色 | 全部改为从 `theme` 读取 |

### 2.4 样式映射

| 旧值 | 新值 |
|------|------|
| `background-color: #f5f5f5` | `background-color: {{ theme.bg }}` |
| `background-color: #ffffff` | `background-color: {{ theme.card }}` |
| `color: #333333` | `color: {{ theme.text }}` |
| `color: #888888` | `color: {{ theme.textSecondary }}` |
| `color: #aaaaaa` | `color: {{ theme.textMuted }}` |
| `background-color: #34c759` | `background-color: {{ theme.accent }}` |
| `border-color: #34c759` | `border-color: {{ theme.accent }}` |
| `color: #34c759` | `color: {{ theme.accent }}` |
| `background-color: #d0d0d0` | `background-color: {{ theme.border }}` |
| `border-bottom-color: #f0f0f0` | `border-bottom-color: {{ theme.border }}` |

---

## 三、实施顺序

1. **先修功能**：修复 `showTime` 和 `showStatusBar` 在首页的读取逻辑
2. **再改界面**：重构 `homepage-settings.ux` 样式，与 `vibration-lab` 风格统一
3. **验证**：确保开关切换后首页即时响应，设置页面主题切换正常

---

## 四、注意事项

- 不引入 `@media` 查询（快应用不支持，会导致白屏）
- 不改变现有数据存储结构（`homepage_settings` key 格式不变）
- 保持向后兼容：旧版已保存的设置数据能正常读取
- 开关组件保持 `.switch-track` + `.switch-thumb` 结构，仅改颜色