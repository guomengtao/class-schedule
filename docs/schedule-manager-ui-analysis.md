# 课程表管理 UI 规范分析报告

## 一、现有UI结构

### 1.1 列表项布局

```
┌─────────────────────────────────────────────┐
│  .item (flex-direction: column)             │
│  ┌──────────────────────────────────┬──────┐│
│  │ .item-row (flex-direction: row)   │      ││
│  │ ┌──────────────────────────────┐ │      ││
│  │ │ .item-left (flex:1)           │ │  ▼   ││
│  │ │ [✓]  课程表Ab3  15门         │ │      ││
│  │ │ box  name      course-count   │ │      ││
│  │ └──────────────────────────────┘ │      ││
│  └──────────────────────────────────┴──────┘│
│  .actions (if expanded)                     │
│  ┌──────────────────────────────────────────┐│
│  │  [重命名]     [复制]     [导出]         ││
│  ├──────────────────────────────────────────┤│
│  │  [总览]       [统计]     [删除]         ││
│  └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 1.2 重命名栏布局

```
┌─────────────────────────────────────────────┐
│  .rename-bar (flex-direction: row)          │
│  ┌──────────────────────────┬──────┬──────┐ │
│  │ .rename-display (flex:1)  │ 保存 │ 取消 │ │
│  │ "输入新名称"             │ 56px │ 56px │ │
│  └──────────────────────────┴──────┴──────┘ │
└─────────────────────────────────────────────┘
```

### 1.3 数据内容

| 字段 | 格式示例 | 最大长度 | 字号 |
|------|----------|----------|------|
| name | `课程表Ab3` | 6-10 字符 (maxlen: 10) | 20px |
| courseCount | `15门` | 可变 | 20px |
| action 按钮文字 | `重命名`/`复制`/`导出`/`总览`/`统计`/`删除` | 3字符 | 20px |
| rename-display | `输入新名称` | 可变 | 20px |
| 标题 title | `课程表管理` | 5字符 | 30px |

### 1.4 现有CSS字号

| 元素 | 默认 | circle | capsule | rect |
|------|------|--------|---------|------|
| title | 30px | **20px** ⚠️缩小 | 28px | - |
| name | 20px | 20px | 20px | - |
| course-count | 20px | 20px | 20px | - |
| action-btn-text | 20px | 20px | - | - |
| rename-text | 20px | 20px | - | - |
| back-btn | 28px | **20px** ⚠️缩小 | 24px | - |

---

## 二、宽度计算（方屏 454×454px）

### 2.1 item-row 可用宽度

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 屏幕总宽 | - | **454px** |
| page padding (12+12) | -24px | 430px |
| item padding (14+14) | -28px | 402px |
| expand-arrow (28px) | -28px | **374px** (item-left) |

### 2.2 item-left 内容宽度

| 元素 | 尺寸 | 累计 |
|------|------|------|
| box (radio) | 28px | 28px |
| name margin-left | 10px | 38px |
| name "课程表abc" (6chars, 20px) | ~93px | 131px |
| course-count margin-left | 6px | 137px |
| course-count " 15门" | ~52px | **189px** |

> **189px < 374px** ✅ 完全显示，余量 185px

### 2.3 actions 按钮行（每行3个按钮）

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| item 内部宽度 | - | 402px |
| 按钮间距 (8px × 2) | -16px | 386px |
| 每个按钮 | ÷3 | **128.7px** |

最长按钮文字 "重命名" = 3×20px = 60px < 128.7px ✅

### 2.4 rename-bar

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 内容区 | - | 430px |
| bar padding (12+12) | -24px | 406px |
| 保存按钮 56+8 | -64px | 342px |
| 取消按钮 56+6 | -62px | **280px** |

"输入新名称" = 5×20px = 100px < 280px ✅

> **方屏全部通过** ✅

---

## 三、圆形屏 (454px, shape: circle) 计算

### 3.1 item-row

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 屏幕总宽 | - | **454px** |
| page padding (36+36) | -72px | 382px |
| item padding (10+10, circle) | -20px | 362px |
| expand-arrow | -28px | **334px** (item-left) |

name "课程表Ab3" + course-count "15门" = 189px < 334px ✅

> 圆形屏 item-row 没问题。但 title 字号被缩小到 20px（原30px）。

### 3.2 actions

内部 362px，每按钮 (362-16)/3 = 115px > 60px（"重命名"）✅

### 3.3 问题：title 字号缩小

圆形屏把 title 从 30px 缩小到 20px，违反"字号禁止缩小"原则。

---

## 四、胶囊屏 (198px, shape: capsule) 计算 — 严重问题

### 4.1 item-row

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 屏幕总宽 | - | **198px** |
| page padding (16+16, capsule) | -32px | 166px |
| item padding (14+14, 默认) | -28px | 138px |
| expand-arrow | -28px | **110px** (item-left) |

**item-left 内容**:
- box 28 + margin 10 + name "课程表Ab3" 93 + margin 6 + course-count " 15门" 52
- **= 189px > 110px** → 超出 79px (72%) ❌

被遮挡内容：name 后半段 + course-count 完全不可见。

### 4.2 actions 按钮行

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| item 内部 | - | 138px |
| 按钮间距 (8px × 2) | -16px | 122px |
| 每个按钮 | ÷3 | **40.7px** |

| 按钮文字 | 需宽 (20px字号) | 可用 | 结果 |
|----------|-----------------|------|------|
| 重命名 | 60px | 40.7px | ❌ 溢出 19px |
| 删除 | 40px | 40.7px | ⚠️ 临界 |
| 复制/导出/总览/统计 | 40px | 40.7px | ⚠️ 临界 |

> "重命名" 3字 = 60px > 40.7px → **遮挡约 1 个字**

### 4.3 rename-bar

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 内容区 | - | 166px |
| bar padding (12+12) | -24px | 142px |
| 保存 56+8 | -64px | 78px |
| 取消 56+6 | -62px | **16px** |

> rename-display 可用宽度仅 **16px**！
> "输入新名称" 需 100px > 16px → 完全不可见 ❌

### 4.4 胶囊屏问题汇总

| 区域 | 需宽 | 可用 | 超出 | 状态 |
|------|------|------|------|------|
| item-left (name+courses) | 189px | 110px | +79px | ❌ 严重遮挡 |
| actions 按钮 (重命名) | 60px | 40.7px | +19px | ❌ 文字溢出 |
| rename-display | 100px | 16px | +84px | ❌ 完全不可见 |

---

## 五、问题汇总表

| 屏幕类型 | item-left | actions按钮 | rename-bar | title字号 | 评级 |
|----------|-----------|-------------|------------|-----------|------|
| 方屏 454px | ✅ 189/374 | ✅ 60/128 | ✅ 100/280 | 30px ✅ | 通过 |
| 圆形 454px | ✅ 189/334 | ✅ 60/115 | - | **20px缩水** | 警告 |
| 胶囊 198px | ❌ 189/110 | ❌ 60/40.7 | ❌ 100/16 | 28px | 崩溃 |

---

## 六、根本原因

1. **胶囊屏 item 行严重溢出**：name + course-count 189px 在 110px 空间内
2. **actions 3列布局太窄**：3个按钮在 138px 内均分仅 40px/个，"重命名" 3字装不下
3. **rename-bar 布局崩溃**：两个 56px 按钮 + margin 占 126px，display 只剩 16px
4. **圆形屏 title 字号被缩小**：30px → 20px，违反不缩小原则
5. **胶囊屏 actions 未适配**：`@media capsule` 中没有重写 action-btn 和 rename-bar 样式

---

## 七、新规范界面设计（字号禁止缩小）

### 7.1 核心原则

| 原则 | 说明 |
|------|------|
| **字号不变** | title: 30px(方屏)/28px(胶囊)，name/course/btn: 20px，不缩小 |
| **胶囊屏 actions 改2列** | 3列 → 2列或垂直排列，每按钮宽度大幅提升 |
| **rename-bar 改垂直** | 胶囊屏按钮放下方独立行，display 独占整行 |
| **name + course-count 改上下排列** | 胶囊屏 item-left 内容分行显示 |

### 7.2 新布局方案

#### 默认/方屏/圆形 — 保持不变

```
┌──────────────────────────────────────────┐
│ [✓] 课程表Ab3    15门              ▼    │
│ ┌──────────┬──────────┬──────────┐      │
│ │  重命名  │   复制   │   导出   │      │
│ ├──────────┼──────────┼──────────┤      │
│ │  总览    │   统计   │   删除   │      │
│ └──────────┴──────────┴──────────┘      │
└──────────────────────────────────────────┘
```

#### 胶囊屏 — 全新布局

```
┌──────────────────────────────────────┐
│ [✓]  课程表                         │
│      Ab3         15门          ▼     │
│ ┌────────────────┬─────────────────┐ │
│ │    重命名      │      复制       │ │
│ ├────────────────┼─────────────────┤ │
│ │    导出        │      总览       │ │
│ ├────────────────┼─────────────────┤ │
│ │    统计        │      删除       │ │
│ └────────────────┴─────────────────┘ │
└──────────────────────────────────────┘
```

胶囊屏 actions 改为 2列 × 3行（或3行），每按钮宽度约 60-65px，"重命名" (60px) 刚好装下。

#### 胶囊屏 rename-bar

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │      课程表Ab3                   │ │  ← display 独占整行
│ └──────────────────────────────────┘ │
│ ┌──────────────┬──────────────────┐ │
│ │    保存      │      取消        │ │  ← 按钮单独一行
│ └──────────────┴──────────────────┘ │
└──────────────────────────────────────┘
```

### 7.3 胶囊屏 (198px) 验证

**page padding 16+16** → 内容区 166px
**item padding 8+8** → 内部 150px

**item-left 改为垂直布局**：
- 第一行: box(28) + name第一段 + arrow(28)
  可用: 150 - 28 - 28 = 94px
  "课程表" = 3×20 = 60px < 94px ✅
  
- 第二行: name续行 + course-count
  "Ab3  15门" = 33 + 10 + 52 = 95px < 150px ✅

或者更简洁，name 和 course-count 保持同行但 name 用 lines:2：
- "课程表Ab3" = 93px < 94px → 刚好放下！
- 如果 name 是 10 字符则 "课表名称最大十字" = 200px → lines:2 自动拆行

**actions 2列 × 3行**：
- 内部 150px
- 每按钮: (150 - 8) / 2 = 71px
- "重命名" = 60px < 71px ✅
- "删除" = 40px < 71px ✅

**rename-bar 垂直布局**：
- display 独占: 150 - 16(padding) = 134px
- "课程表Ab3" = 93px < 134px ✅
- 按钮行: 保存 + 取消, 每按钮 (150-16-8)/2 = 63px > 56px ✅

### 7.4 圆形屏 (454px) title 恢复

圆形屏 title 从 20px 恢复到 30px，和其他屏幕一致。

---

## 八、新规范CSS

### 8.1 胶囊屏适配

```css
@media (shape: capsule), (shape: pill-shaped) {
  .page {
    padding: 30px 12px 30px 12px;
  }

  /* 标题字号保持 */
  .title {
    font-size: 28px;
    line-height: 44px;
  }

  /* 列表项缩小 padding */
  .item {
    padding: 10px 8px;
    margin-bottom: 8px;
  }

  /* item-right保持同行但允许name换行 */
  .item-row {
    min-height: 44px;
  }

  .item-left {
    flex: 1;
    min-width: 0;
  }

  .name {
    font-size: 20px;
    lines: 2;
    text-overflow: ellipsis;
    margin-left: 8px;
  }

  .course-count {
    font-size: 20px;
    margin-left: 4px;
    flex-shrink: 0;
  }

  .expand-arrow {
    font-size: 20px;
    padding: 4px;
    flex-shrink: 0;
  }

  /* actions 改为 2列 × 3行 */
  .action-row {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .action-btn {
    width: 48%;
    flex: none;
    height: 36px;
    margin-right: 4%;
    margin-bottom: 6px;
  }

  .action-btn:nth-child(even) {
    margin-right: 0;
  }

  .action-btn-text {
    font-size: 20px;
  }

  /* rename-bar 改为垂直布局 */
  .rename-bar {
    flex-direction: column;
    padding: 10px 8px;
  }

  .rename-display {
    width: 100%;
    flex: none;
    height: 40px;
    margin-bottom: 8px;
    font-size: 20px;
  }

  .rename-buttons {
    flex-direction: row;
    justify-content: space-between;
  }

  .rename-ok-btn {
    width: 48%;
    height: 36px;
    font-size: 20px;
    margin-left: 0;
  }

  .rename-cancel-btn {
    width: 48%;
    height: 36px;
    font-size: 20px;
    margin-left: 0;
  }
}
```

### 8.2 圆形屏 title 恢复

```css
@media (shape: circle) {
  .title {
    font-size: 30px;   /* 从20px恢复 */
    line-height: 40px;
  }
}
```

---

## 九、验证对比

### 9.1 胶囊屏 before/after

| 组件 | 旧方案 | 新方案 |
|------|--------|--------|
| item-left (name+courses) | ❌ 189px > 110px | ✅ name lines:2, 均<94px |
| actions 按钮 | ❌ 60px > 40.7px | ✅ 60px < 71px (2列) |
| rename-display | ❌ 100px > 16px | ✅ 93px < 134px (独占行) |
| title 字号 | 28px ✅ | 28px ✅ |
| name 字号 | 20px ✅ | 20px ✅ |
| 按钮字号 | 20px ✅ | 20px ✅ |

### 9.2 圆形屏 before/after

| 组件 | 旧方案 | 新方案 |
|------|--------|--------|
| title 字号 | ⚠️ 20px (被缩小) | ✅ 30px (恢复) |

---

## 十、总结

| 项目 | 旧方案问题 | 新方案解决 |
|------|-----------|-----------|
| 胶囊屏 item-left | 189px > 110px 严重溢出 | name 换行 (lines:2)，或拆分两行 |
| 胶囊屏 actions | 3列按钮仅40px/个 | 改为 2列，每按钮 71px |
| 胶囊屏 rename-bar | display 仅 16px | 垂直布局，display 独占 134px |
| 圆形屏 title | 20px 被缩小 | 恢复到 30px |
| **所有字号** | 有缩小情况 | **全部保持原值** |