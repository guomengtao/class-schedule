# 胶囊屏倒数日栏目美化与优化方案

> **目标**：对 `countdown-manage.ux` 进行胶囊屏全面优化，涵盖输入方式升级、字号规范化、布局梳理、交互细节打磨。

---

## 一、现状分析

### 1.1 页面结构

当前 `countdown-manage.ux`（[源文件](../src/pages/countdown-manage/countdown-manage.ux)）采用标准三层结构：

```
page
├── header（返回按钮 + 标题"倒数日" + "+ 添加"按钮）
├── add-toolbar（胶囊屏专用：header 放不下时，添加按钮移到此处）
├── toolbar（X个倒数日 + 排序切换 + 清空）
├── scroll
│   └── countdown-row × N
│       ├── row-left
│       │   ├── row-index（天数圆标）
│       │   └── row-info
│       │       ├── row-title-line（名称 + ON/OFF 开关）
│       │       └── row-sub-line（日期 + 剩余天数）
│       └── row-actions（编辑 + 删除按钮）
└── empty-text（空状态）
```

### 1.2 现有问题汇总

| 编号 | 类别 | 问题描述 | 严重度 |
|------|------|----------|:---:|
| P1 | 输入方式 | 添加/编辑使用 `prompt.showDialog()` 弹窗输入，无法输入中文 | 🔴 高 |
| P2 | 字号 | 胶囊屏多处使用 20px 字号（`.row-date`、`.row-days-text`、`.toolbar-*`、`.action-btn`、`.add-btn`） | 🟡 中 |
| P3 | 行高 | `.row-date` / `.row-days-text` 胶囊屏 20px/26px 行高 < 28px 最低要求（20+8=28） | 🟡 中 |
| P4 | 按钮 | `.action-btn` 胶囊屏高度 44px ✓，但 `.toolbar-clear` 高度 40px 处于临界值 | 🟢 低 |
| P5 | 截断 | `.row-name` 使用 `text-overflow: ellipsis`，违反"禁止文字显示不全"规则 | 🟡 中 |
| P6 | 布局 | 胶囊屏每行 `flex-direction: column`，编辑/删除按钮在名称下方，占用额外垂直空间 | 🟢 低 |
| P7 | 字号不一致 | 胶囊屏幕媒体查询中 title 24px vs 日期 20px 跨度 20%，对比度过大 | 🟢 低 |

---

## 二、输入方式改造（核心）

### 2.1 现有流程 vs 目标流程

```
【现有】
startAdd() → prompt.showDialog("请输入名称") → 纯文本，无中文输入法
startEdit() → prompt.showDialog("编辑名称")   → 纯文本，无中文输入法

【目标】
startAdd() → storage 设置参数 → router.push("/pages/chinese-input") → 返回后 checkResult()
startEdit() → storage 设置参数 → router.push("/pages/chinese-input") → 返回后 checkResult()
```

### 2.2 参考实现

`custom-content-edit.ux` 已有成熟的中文输入跳转模式（[参考代码](../src/pages/custom-content-edit/custom-content-edit.ux#L180-L190)）：

```javascript
editContent() {
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "自定义内容" })
  storage.set({ key: "chinese_input_placeholder", value: "输入自定义内容..." })
  storage.set({ key: "chinese_input_value", value: "" })
  storage.set({ key: "chinese_input_maxlen", value: "20" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  router.push({ uri: "/pages/chinese-input" })
}
```

`onShow()` 中检查返回结果：
```javascript
storage.get({ key: "chinese_input_result", success: function(data) {
  if (data !== undefined && data !== null && data !== "") {
    self.addCustomContent(data)
    storage.delete({ key: "chinese_input_result" })
  }
}})
```

### 2.3 倒数日适配方案

**添加流程（`startAdd` 改造）**：

```javascript
startAdd() {
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "添加倒数日" })
  storage.set({ key: "chinese_input_placeholder", value: "输入倒数日名称..." })
  storage.set({ key: "chinese_input_value", value: "" })
  storage.set({ key: "chinese_input_maxlen", value: "10" })  // 名称限长10字（胶囊屏一行最多7-8字）
  storage.set({ key: "chinese_input_return_key", value: "countdown_add_title" })
  storage.set({ key: "countdown_add_pending", value: "true" })
  router.push({ uri: "/pages/chinese-input" })
}
```

**编辑流程（`startEdit` 改造）**：

```javascript
startEdit(idx) {
  var item = this.countdownList[idx]
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "编辑名称" })
  storage.set({ key: "chinese_input_placeholder", value: "输入新名称..." })
  storage.set({ key: "chinese_input_value", value: item.title })  // 预填当前名称
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "countdown_edit_title" })
  storage.set({ key: "countdown_edit_index", value: String(idx) })
  router.push({ uri: "/pages/chinese-input" })
}
```

**日期选择**：名称输入完毕后，仍用 `prompt.showDialog` 输入日期（日期为纯数字，无需中文），格式验证保持不变。

**`onShow` 中检查返回**：

```javascript
onShow() {
  var self = this
  var storage = require("@system.storage")
  // 检查添加返回
  storage.get({ key: "countdown_add_title", success: function(data) {
    if (data !== undefined && data !== null && data !== "") {
      storage.delete({ key: "countdown_add_title" })
      storage.delete({ key: "countdown_add_pending" })
      self.askDate(data)
    }
  }})
  // 检查编辑返回
  storage.get({ key: "countdown_edit_title", success: function(data) {
    if (data !== undefined && data !== null && data !== "") {
      var idx = parseInt(self.countdownEditIndex) || -1
      storage.delete({ key: "countdown_edit_title" })
      storage.delete({ key: "countdown_edit_index" })
      if (idx >= 0 && idx < self.countdownList.length) {
        self.askEditDate(idx, data)
      }
    }
  }})
}
```

> **注意**：需要新增 `private.countdownEditIndex: -1` 变量来暂存编辑索引。

---

## 三、字号规范梳理

### 3.1 胶囊屏字号标准（依据 `capsule-font-rules.md`）

| 层级 | 字号 | 行高 | 用途 |
|------|:---:|:---:|------|
| 页面标题 | 28px | 36px+ | `header-title` |
| 正文/名称 | 24px | 32px+ | `row-name` |
| 辅助文字 | 22px | 30px+ | `row-date`, `row-days-text` |
| 按钮文字 | 22px | — | `.action-btn`, `.toolbar-clear` |
| 数字 | 28px | — | `.index-num` (天数数字) |
| 小标签 | 20px | 28px+ | `.switch-btn` (.toolbar-count) |

### 3.2 修改对照表

| CSS 选择器 | 当前胶囊值 | 建议值 | 原因 |
|------------|:---:|:---:|------|
| `.add-btn` | 20px/30px | 22px/32px | 按钮文字不低于 22px |
| `.add-btn-tb` | 22px/48px | 22px/48px | ✅ 无需修改 |
| `.toolbar-count` | 20px/28px | 20px/28px | ⚠️ 20px 为最小可接受值，保持不变（辅助信息） |
| `.toolbar-sort` | 20px/28px | 20px/28px | ⚠️ 同上 |
| `.toolbar-clear` | 20px/36px | 未设置 | ⚠️ 36px行高勉强（20+8=28→OK），但字号应提至22px |
| `.index-num` | 20px/22px | 动态 22-28px | 数字醒目度提升 |
| `.row-name` | 24px/32px | 24px/32px | ✅ 符合标准 |
| `.switch-btn` | 20px/36px | 20px/30px | 微调行高与视觉对齐 |
| `.row-date` | 20px/26px ❌ | **22px/30px** | 行高不足，20→22满足最低 |
| `.row-days-text` | 20px/26px ❌ | **22px/30px** | 同上 |
| `.action-btn` | 20px/40px | **22px/40px** | 按钮字号不低于 22px |

### 3.3 圆形屏（非胶囊）也一并整理

| CSS 选择器 | 当前值 | 建议值 | 原因 |
|------------|:---:|:---:|------|
| `.row-name` | 28px/36px | 28px/36px | ✅ |
| `.row-date` | 22px/30px | 22px/30px | ✅ |
| `.row-days-text` | 22px/30px | 22px/30px | ✅ |
| `.action-btn` | 22px/32px | 22px/32px | ✅ |
| `.add-btn` | 28px/52px | 28px/52px | ✅ |
| `.toolbar-clear` | 22px/36px | 22px/36px | ✅ |

---

## 四、布局优化

### 4.1 胶囊屏每行布局

**现有**：
```
┌──────────────────────────────┐
│ [42] 高考           [ON/OFF] │  ← row-left (row-index + row-info)
│      2027-06-07   剩 276 天   │  ← row-sub-line
│              [编辑]  [删除]   │  ← row-actions (flex-direction: column → row)
└──────────────────────────────┘
```
每行高度 ≈ 42 + 26 + 44 = ~112px

**优化后**（按钮挤到名称行右侧，节省一行）：
```
┌──────────────────────────────┐
│ [42] 高考     [编辑] [删除]  │  ← row-index + row-name + row-actions
│      ON/OFF  2027-06-07     │  ← row-sub-line
│      剩 276 天               │  ← 天数单独一行更大字号
└──────────────────────────────┘
```

**CSS 变化**：
- 胶囊屏不再 `flex-direction: column`，保持 `flex-direction: row`
- `.row-actions` 放到 `.row-left` 内部 `.row-info` 右侧
- `.row-name` 缩短，给按钮腾空间
- `.switch-btn` 下移到第二行日期旁边

### 4.2 天数圆标优化

```
现有：42×42px 圆，数字 20/22px
优化：48×48px 圆，数字动态 22-28px（根据位数）
      - ≤99天: 28px
      - ≥100天: 24px
      - "已过": 22px
```

### 4.3 空状态优化

```
现有：纯文字"暂无倒数日，点击右上角添加"
优化：添加图标 + 大号文字 + 添加按钮直接可见
```

---

## 五、文本截断问题

### 5.1 现有 `.row-name` 的 `text-overflow: ellipsis`

> 项目规则（`project_rules.md` 第 5 条）：**禁止任何导致文字显示不全的做法**。

**问题**：倒数日名称（如"距离高考还有"）在胶囊屏一行最多放 7-8 个 24px 汉字，容易超出。

**方案**：
1. 输入时限制名称长度为 **6 个汉字**（胶囊屏 `row-name` 可用宽度约 100px，24px×6=144px 在减去按钮后足够）
2. 在 `chinese_input_maxlen` 中设为 `"6"`（从现有 10 改为 6）
3. 移除 `text-overflow: ellipsis`，改用 `lines: 1` + 确保宽度足够
4. 如果名称过长需要截断，用颜色变化提示用户（如名称文字变红表示过长）

### 5.2 替代截断方案

| 方案 | 描述 | 适用 |
|------|------|------|
| A. 输入限制 | maxlen=6，从源头杜绝超长 | ✅ 推荐 |
| B. 自动缩小 | 超出时动态缩小字号到 20px | 备选 |
| C. 两行显示 | 名称允许折行，row 高度增加 | 仅方屏 |

---

## 六、视觉美化

### 6.1 颜色语义化

| 状态 | 圆标颜色 | 天数文字 | 含义 |
|------|:---:|:---:|------|
| >30天 | `theme.accent` | `theme.accent` | 还很远，安心 |
| 7-30天 | `theme.accent` (加亮) | `theme.accent` | 临近，注意 |
| 1-6天 | 橙/黄色 (`#f0a040`) | `#f0a040` | 紧迫 |
| 0天(今天) | 绿色 (`#40c080`) | `#40c080` | 就是今天！ |
| 已过 | `theme.textMuted` | `theme.deleteText` | 已过期 |

### 6.2 添加按钮美化

```
现有：纯文字按钮 "+ 添加"（80×52px 圆角矩形）
优化：图标 + 文字组合，胶囊屏缩小为 40×40px 圆形加号图标
```

### 6.3 工具栏精简

```
现有：左侧"X个倒数日" + 中间"📅 最近/🔤 名称序" + 右侧"清空"
问题：胶囊屏 198px 宽，三个元素并排拥挤（emoji 占额外宽度）

优化方案 A：去掉 emoji，纯文字"最近"/"名称"
优化方案 B：排序改为图标按钮，点击切换
推荐方案 A：胶囊屏 toolbar 导航改为图标按钮，去掉 emoji
```

---

## 七、完整修改清单

### 7.1 countdown-manage.ux 模板改动

| 位置 | 改动 | 说明 |
|------|------|------|
| header `.add-btn` | 移除 `if="{{ !isCapsule }}"`，统一显示 | 改为通用小按钮 |
| `add-toolbar` 区块 | 移除整个区块 | 统一到 header 内按钮 |
| toolbar `.toolbar-sort` | emoji 替换为纯文字或图标 | 省宽度 |
| `.countdown-row` | 重新布局：圆标+名称+按钮同行 | 参见 §4.1 |
| `.row-name` | 移除 `text-overflow: ellipsis` | 参见 §5.1 |
| `.switch-btn` | 移到第二行 | 参见 §4.1 |
| 空状态 | 改进空状态 UI | 参见 §4.3 |

### 7.2 countdown-manage.ux 脚本改动

| 函数 | 改动 | 说明 |
|------|------|------|
| `startAdd()` | 重写为 chinese-input 跳转 | 参见 §2.3 |
| `startEdit(idx)` | 重写为 chinese-input 跳转 | 参见 §2.3 |
| 新增 `onShow()` | 检查 countdown_add_title / countdown_edit_title | 参见 §2.3 |
| `askDate()` | 保持不变（prompt 输入日期） | — |
| `askEditDate()` | 保持不变 | — |
| `deleteItem()` | 逻辑不变 | — |
| 新增 `private.countdownEditIndex` | `-1` | 暂存编辑索引 |

### 7.3 countdown-manage.ux 样式改动

| 位置 | 改动 |
|------|------|
| 胶囊屏 @media 中 `.row-date` | 20px/26px → 22px/30px |
| 胶囊屏 @media 中 `.row-days-text` | 20px/26px → 22px/30px |
| 胶囊屏 @media 中 `.action-btn` | 20px → 22px |
| 胶囊屏 @media 中 `.toolbar-clear` | 20px → 22px |
| 胶囊屏 @media 中 `.add-btn` | 20px → 22px |
| 胶囊屏 @media 中 `.row-index` | 42×42 → 48×48 |
| 胶囊屏 @media 中 `.index-num` | 动态字号 22-28px |
| `.row-name` | 移除 `text-overflow: ellipsis` |
| 行布局重构 | 参见 §4.1 |

### 7.4 无其他文件改动

本次改造不涉及 `InputMethod` 组件、`chinese-input` 页面、`index` 页面等，仅修改 `countdown-manage.ux`。

---

## 八、实施步骤

| 步骤 | 内容 | 预估时间 |
|:---:|------|:---:|
| 1 | 修改前截图（`before-countdown-redesign`） | 2 min |
| 2 | 重写 `startAdd()` / `startEdit()` 为 chinese-input 跳转 | 10 min |
| 3 | 新增 `onShow()` 回调检查 + `countdownEditIndex` 变量 | 5 min |
| 4 | 调整模板布局（行结构、按钮位置、移除 toolbar emoji） | 10 min |
| 5 | 调整胶囊屏字号和行高 | 5 min |
| 6 | 移除 `text-overflow: ellipsis` + 设置 maxlen=6 | 2 min |
| 7 | 调整空状态 UI | 3 min |
| 8 | 天数圆标颜色语义化（可选，进阶） | 5 min |
| 9 | 修改后截图（`after-countdown-redesign`） | 2 min |
| 10 | 核对清单检查 + 构建验证 | 5 min |

---

## 九、截图核对清单

| 检查项 | 标准 |
|--------|------|
| ☐ 标题"倒数日" 28px 居中显示 | 不被返回按钮遮挡 |
| ☐ 添加按钮可见可点击 | 22px 字号清晰 |
| ☐ 每行名称完整显示 | 无 `...` 省略号 |
| ☐ 日期和天数 22px 清晰 | 行高充足不裁剪 |
| ☐ 编辑/删除按钮 22px | 热区 44px 足够 |
| ☐ 天数圆标数字清晰 | 不超出圆边界 |
| ☐ 排序切换正常 | "最近"/"名称" 文字完整 |
| ☐ 清空二次确认正常 | "清空"→"确认" 同级文字 |
| ☐ 空状态友好 | 引导文字 + 图标 |
| ☐ 滚动流畅 | scroll 区域占满剩余空间 |