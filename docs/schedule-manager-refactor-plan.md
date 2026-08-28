# 课程表管理页面 — 布局重构方案

## 当前问题分析

### 问题一：操作按钮溢出（6 个链接一行放不下）

```
┌──────────────────────────────────────────┐
│ 课程表1                    使用中         │
│ 重命名 复制 二维码 总览 统计 删除        │  ← 6个链接，手环320px宽度溢出
└──────────────────────────────────────────┘
```

当前 `item-right` 有 6 个 `<text>` 链接平铺一行：
- 重命名(54px) + 复制(36px) + 二维码(54px) + 总览(36px) + 统计(36px) + 删除(36px) + 间距(18px×5) = **342px**
- 卡片 padding 20px×2 = 40px 剩余宽度 = 280px
- 实际需要 342px，**溢出 62px**，导致换行或截断

### 问题二：课程表名称字体过大

```css
.schedule-name {
  font-size: 28px;       /* 手环屏幕约 1.5cm 宽，28px 过大 */
  font-weight: bold;
}
```

### 问题三：CSS 硬编码颜色

```css
.manager-page { background-color: #1a1a2e; }  /* 不跟随主题 */
.schedule-item { background-color: #16213e; }  /* 不跟随主题 */
```

大部分样式已用 `{{ theme.xxx }}`，但 CSS 文件中仍有多处硬编码颜色，切换主题时出现不一致。

### 问题四：名称可能被覆盖

`onShow` 中先调用 `loadData()` 再处理 `chinese_input_result`，如果 `chinese_input_result` 有残留值且 `fetch` 到 `self.editName` 后，`editName` 不参与渲染名称（它是用于 rename-bar 的），但逻辑上容易混淆。实际上 `scheduleList` 数据来自 `store.getScheduleNames`，不会被覆盖，但 `onShow` 中的异步回调可能因用户快速操作导致 `scheduleList` 未及时更新。

---

## 重构目标

| 目标 | 说明 |
|------|------|
| 紧凑布局 | 操作按钮改为 2 行网格，适应手环宽度 |
| 清晰视觉 | 卡片式设计，明确的信息层级 |
| 主题统一 | 所有颜色使用 `{{ theme.xxx }}` 变量 |
| 数据可靠 | 简化 `onShow` 逻辑，确保名称正确显示 |

---

## 新布局设计

### 整体结构

```
┌──────────────────────────────┐
│ ◀ 课程表管理          统计   │  ← header
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 课程表1          使用中  │ │  ← 名称 + 徽章（点击可切换）
│ │ ┌──────┬──────┬──────┐  │ │
│ │ │ 重命名│ 复制  │ 二维码│  │ │  ← 操作按钮网格 2行×3列
│ │ ├──────┼──────┼──────┤  │ │
│ │ │ 总览  │ 统计  │ 删除  │  │ │
│ │ └──────┴──────┴──────┘  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 课程表2                  │ │
│ │ ┌──────┬──────┬──────┐  │ │
│ │ │ 重命名│ 复制  │ 二维码│  │ │
│ │ ├──────┼──────┼──────┤  │ │
│ │ │ 总览  │ 统计  │ 删除  │  │ │
│ │ └──────┴──────┴──────┘  │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│      + 新增课程表             │  ← 底部按钮
└──────────────────────────────┘
```

### 卡片内部结构

不再使用 `<text>` 链接，改用 `<input type="button">` 按钮网格：

```html
<div class="actions-grid">
  <div class="action-row">
    <input type="button" value="重命名" onclick="startRename($idx)" />
    <input type="button" value="复制" onclick="copySchedule($idx)" />
    <input type="button" value="二维码" onclick="openQrPopup($idx)" />
  </div>
  <div class="action-row">
    <input type="button" value="总览" onclick="openWeekView($idx)" />
    <input type="button" value="统计" onclick="openScheduleStats($idx)" />
    <input type="button" value="删除" onclick="deleteSchedule($idx)" />
  </div>
</div>
```

每个按钮 `flex: 1`，3 个一行，正好 320px - 40px padding = 280px，每个约 93px。
按钮高度 32px，适合手指点击。

---

## 代码变更清单

### 1. 模板变更

| 区域 | 旧 | 新 |
|------|----|----|
| 操作区 | 6 个 `<text class="link">` 平铺一行 | 2 行 × 3 列 `<input>` 按钮网格 |
| 名称区 | `<text class="schedule-name">` 28px | 改为 22px |
| 卡片结构 | `item-left` + `item-right` 分两区 | 合并为 `item-header` + `actions-grid` 更清晰 |

### 2. 样式变更

| 类名 | 操作 | 说明 |
|------|:---:|------|
| `.schedule-name` | 修改 | 28px → 22px |
| `.link` | 删除 | 不再使用 text 链接 |
| `.item-right` | 删除 | 改为 `.actions-grid` |
| `.actions-grid` | 新增 | 操作按钮网格容器 |
| `.action-row` | 新增 | 每行 3 个按钮 |
| `.action-btn` | 新增 | 单个操作按钮 |
| `.action-btn.delete` | 新增 | 删除按钮样式 |
| 硬编码颜色 | 删除 | 全部改为 `{{ theme.xxx }}` |

### 3. 脚本变更

| 函数 | 操作 | 说明 |
|------|:---:|------|
| `onShow` | 修改 | 先处理 `chinese_input_result`，再 `loadData`，避免覆盖 |
| `loadData` | 不改 | 逻辑正确 |

---

## 实施步骤

### Step 1: 重构模板

将 `item-right` 的 6 个 text 链接改为 2 行 × 3 列按钮网格。

### Step 2: 重构样式

- 删除 `.link`、`.link.delete-link`、`.item-right` 样式
- 新增 `.actions-grid`、`.action-row`、`.action-btn` 样式
- 所有 CSS 硬编码颜色改为 `style="{{ theme.xxx }}"` 内联
- 缩小 `.schedule-name` 字号

### Step 3: 修复 onShow 逻辑

```javascript
onShow() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })

    // 先处理 chinese_input_result，避免残留数据干扰
    var storage = require("@system.storage")
    storage.get({
      key: "chinese_input_result",
      success: function(data) {
        if (data !== undefined && data !== null && data !== "") {
          self.editName = data
          storage.delete({ key: "chinese_input_result" })
        }
      }
    })

    // 再加载数据，确保当前数据是最新的
    this.loadData()
  },
```

---

## 开发量预估

| 任务 | 行数 | 难度 |
|------|:---:|:---:|
| 模板重构 | ~20 行 | 简单 |
| 样式重构 | ~30 行 | 简单 |
| onShow 调整 | ~5 行 | 简单 |
| **总计** | **~55 行** | **简单** |

---

## 重构后效果对比

| 维度 | 重构前 | 重构后 |
|------|--------|--------|
| 操作按钮 | 6 个 text 链接溢出 | 2×3 按钮网格，紧凑不溢出 |
| 名称字号 | 28px | 22px，更协调 |
| 点击区域 | text 链接，点击区域小 | button 按钮，36px 高，易点击 |
| 主题适配 | 部分硬编码 | 全 theme 变量 |
| 视觉层次 | 平铺无层次 | 卡片式，清晰分区 |
| 删除按钮 | 红色 text 链接 | 红色背景按钮，更醒目 |