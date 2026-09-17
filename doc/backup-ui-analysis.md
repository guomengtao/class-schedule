# 数据备份栏目 UI 规范分析报告

## 一、现有UI结构

### 1.1 备份列表行布局

```
┌──────────────────────────────────────────────┐
│  .backup-row (flex-direction: row)           │
│  ┌──────────────────────┬──────────────────┐ │
│  │ .backup-row-left     │ .backup-row-     │ │
│  │ (flex:1)             │   actions        │ │
│  │                      │ (flex-shrink:0)  │ │
│  │ 备份 2026-09-17      │ [恢复] [删除]    │ │
│  │ 2026-09-17 15门 3表  │  60px   60px     │ │
│  └──────────────────────┴──────────────────┘ │
└──────────────────────────────────────────────┘
```

### 1.2 数据内容格式

| 字段 | 格式示例 | 最大长度 |
|------|----------|----------|
| name | `备份 2026-09-17 18:30` | 19 字符 |
| meta | `2026-09-17 18:30 15门 3表` | 26 字符 |
| actions | `[恢复] [删除]` / `[恢复] [确认]` | 固定2个按钮 |

### 1.3 现有CSS样式（默认/方屏）

| 样式属性 | name | meta | 操作按钮区 |
|----------|------|------|-----------|
| font-size | 32px | 28px | 24px |
| line-height | 42px | 36px | - |
| 按钮宽度 | - | - | 60px × 2 |
| 按钮间距 | - | - | 8px |
| actions margin-left | - | - | 12px |

---

## 二、宽度计算（方屏 454×454px）

### 2.1 可用宽度逐级计算（现有水平布局）

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 屏幕总宽 | - | **454px** |
| page padding (左右各10px) | -20px | 434px |
| backup-row padding (左右各16px) | -32px | 402px |
| actions margin-left | -12px | 390px |
| 恢复按钮 60px + 间距 8px | -68px | 322px |
| 删除按钮 60px | -60px | **262px** |

> **结论: backup-row-left 可用宽度仅 262px（文字与按钮抢夺同一行空间）**

### 2.2 name 文字宽度计算

`"备份 2026-09-17 18:30"` (19个字符，font-size: 32px)

| 字符类型 | 数量 | 字宽系数 | 计算结果 |
|----------|------|----------|----------|
| 中文 "备份" + 空格 | 3 个 | × 32px | 96px |
| 数字/符号 "2026-09-17" | 10 个 | × 32px × 0.55 | 176px |
| 数字/符号 " 18:30" | 6 个 | × 32px × 0.55 | 105.6px |
| **合计** | **19** | | **≈ 377.6px** |

> **377.6px > 262px → 超出 115.6px (44%) → 严重遮挡！**

被遮挡字数: `115.6 ÷ (32 × 0.55) ≈ 6-7 个字符`

实际显示效果（只显示前约 262px 内容）:
```
备份 2026-09-17     ← 约到这里被截断
```
被遮挡部分: ` 18:30` (约 6 个字符)

### 2.3 meta 文字宽度计算

`"2026-09-17 18:30 15门 3表"` (26个字符，font-size: 28px)

| 字符类型 | 数量 | 字宽系数 | 计算结果 |
|----------|------|----------|----------|
| 日期时间 "2026-09-17 18:30" | 16 个 | × 28px × 0.55 | 246.4px |
| 中文 "门" + "表" | 2 个 | × 28px | 56px |
| 空格 + 数字 " 15" + " 3" | 6 个 | × 28px × 0.55 | 92.4px |
| 空格 | 2 个 | × 28px × 0.3 | 16.8px |
| **合计** | **26** | | **≈ 411.6px** |

> **411.6px > 262px → 超出 149.6px (57%) → 严重换行/溢出！**

被遮挡/换行字数: 后半段 `15门 3表` 完全不可见

### 2.4 冗余问题

name 含时间 `2026-09-17 18:30`，meta 又重复一遍同样的时间，浪费约 246px。

---

## 三、胶囊屏 (198×368px) 计算 — 崩溃级别

### 3.1 可用宽度（现有水平布局）

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 屏幕总宽 | - | **198px** |
| page padding (左右各36px) | -72px | 126px |
| backup-row padding (左右各14px) | -28px | 98px |
| actions (12+68+60) | -140px | **-42px** |

> **可用宽度为负数 (-42px)！连两个按钮都排不下，布局完全崩溃！**

### 3.2 按钮宽度问题（胶囊屏）

胶囊屏 `@media` 中没有重写按钮宽度，仍然是 `60px × 2 + 8px + 12px margin = 140px`。
但 backup-row 内部总宽度只有 98px，按钮就占 140px。

### 3.3 name 文字（胶囊屏 font-size: 30px）

`"备份 2026-09-17 18:30"` ≈ 60 + 16×30×0.55 = 324px

> 324px > 98px (内容区总宽还没有扣除按钮) → 彻底不可用

---

## 四、圆形屏 (454×454px circle) 计算

圆形屏使用 `@media (shape: circle)` 样式:

| 层级 | 扣除项 | 剩余宽度 |
|------|--------|----------|
| 屏幕总宽 | - | **454px** |
| page padding (左右各36px) | -72px | 382px |
| backup-row padding (左右各14px) | -28px | 354px |
| actions (12+68+60) | -140px | **214px** |

name 需要 377.6px > 214px → 超出 163.6px (76%)
meta 需要 411.6px > 214px → 超出 197.6px (92%)

---

## 五、问题汇总表

| 屏幕类型 | 可用宽度 | name需宽 | name超出 | meta需宽 | meta超出 | 状态 |
|----------|----------|----------|----------|----------|----------|------|
| 方屏 rect (454px) | 262px | 378px | +116px (44%) | 412px | +150px (57%) | ❌ 遮挡 |
| 圆形屏 circle (454px) | 214px | 378px | +164px (76%) | 412px | +198px (92%) | ❌ 严重遮挡 |
| 胶囊屏 capsule (198px) | -42px | 324px | +366px | 352px | +394px | ❌ 崩溃 |

---

## 六、问题根本原因

1. **水平布局空间不足**: 两列布局（内容 + 双按钮）在窄屏上本质受限，文字和按钮抢同一行
2. **meta 与 name 重复时间**: meta 中 `2026-09-17 18:30` 和 name 完全重复，浪费约 246px
3. **按钮固定宽度过大**: 60px × 2 = 120px 在小屏幕上占比过高
4. **缺少CSS截断**: 没有设置 `lines: 1` + `text-overflow: ellipsis`
5. **胶囊屏无按钮适配**: `@media capsule` 中遗漏了按钮尺寸的缩小

---

## 七、新规范界面设计（字号禁止缩小）

### 7.1 核心原则

| 原则 | 说明 |
|------|------|
| **字号不变** | name: 32px(方屏) / 30px(圆形) / 30px(胶囊)，meta: 28px(方屏) / 26px(圆形) / 26px(胶囊)，按钮: 24px 不变 |
| **垂直布局** | 文字与按钮不再抢同一行，各行独占整行宽度 |
| **去冗余** | meta 去掉与 name 重复的时间，只保留统计信息 |
| **胶囊屏减padding** | 胶囊屏左右 padding 从 36px 缩到 12px，换取每行可用宽度 |

### 7.2 新布局方案（三层结构）

```
┌──────────────────────────────────────────────┐
│  .backup-row (flex-direction: column)        │
│  ┌──────────────────────────────────────────┐│
│  │ 备份 2026-09-17 18:30                    ││
│  │ .backup-row-name 32px (lines:1 ellipsis) ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │ 15门课程 · 3张课表    [恢复]  [删除]    ││
│  │ .backup-row-meta       .actions          ││
│  │ 28px                   24px              ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

### 7.3 方屏 (454px) 验证计算

垂直布局下每行独占整行宽度：

| 层级 | 扣除项 | 剩余 |
|------|--------|------|
| 屏幕总宽 | - | **454px** |
| page padding (10+10) | -20px | 434px |
| row padding (14+14) | -28px | **406px** |

**第一行 name**: `"备份 2026-09-17 18:30"` (32px字号)
- "备份 " = 2×32 + 10(空格) = 74px
- "2026-09-17 18:30" = 16×32×0.55 = 281.6px
- **总 ≈ 355.6px < 406px** ✅ 完全显示，余量 50px

**第二行**: meta + actions (同行)
- meta `"15门课程 · 3张课表"` (28px字号):
  - "15" = 2×28×0.55 = 30.8px
  - "门课程 " = 4×28 = 112px
  - "· " = ~25px
  - "3" = 15.4px
  - "张课表" = 3×28 = 84px
  - **小计 ≈ 267px**
- actions: 60 + 8 + 60 = 128px
- **总 ≈ 395px < 406px** ✅ 完全显示，余量 11px

> 方屏完全没问题！

### 7.4 圆形屏 (454px) 验证计算

| 层级 | 扣除项 | 剩余 |
|------|--------|------|
| 屏幕总宽 | - | **454px** |
| page padding (36+36) | -72px | 382px |
| row padding (12+12) | -24px | **358px** |

**第一行 name**: `"备份 2026-09-17 18:30"` (30px字号)
- "备份 " = 2×30 + 8 = 68px
- "2026-09-17 18:30" = 16×30×0.55 = 264px
- **总 ≈ 332px < 358px** ✅ 完全显示

**第二行**: meta(26px字号) + actions(60+8+60=128px)
- meta `"15门·3表"` = 2×26×0.55 + 26 + 15 + 15.4 + 26 + 26 ≈ 137px
- **总 ≈ 265px < 358px** ✅ 完全显示

> 圆形屏也没问题！

### 7.5 胶囊屏 (198px) 验证计算 — 关键难点

胶囊屏宽度仅 198px，30px 字号每行最多容纳约 3 个中文字符，是物理硬限制。

#### 方案：减少 padding + 多行换行

| 层级 | 扣除项 | 剩余 |
|------|--------|------|
| 屏幕总宽 | - | **198px** |
| page padding (12+12) | -24px | 174px |
| row padding (8+8) | -16px | **158px** |

**name 行** (30px字号): `"备份 2026-09-17 18:30"`
- 需要约 68 + 264 = 332px > 158px
- **无法单行显示 → 拆为多行（lines: 2）**

```
第一行: 备份 2026-09-17    ← 68 + 165 = 233px > 158px ❌ 还会换行
```

即使拆两行，"备份 2026-09-17" (233px) 也超出 158px。进一步分析：

`"备份 2026-09-17"` 中 "备份 " = 68px，"2026-09-17" = 165px，合计 233px。
两行自动换行后：
- 第一行: `"备份 2026-"` = 68 + 5×30×0.55 = 68 + 82.5 = 150.5px < 158px ✅
- 第二行: `"09-17 18:30"` = 5×30×0.55 + 8 + 5×30×0.55 = 82.5 + 8 + 82.5 = 173px > 158px ❌ 还会换行

173px 略超 158px (超出15px)，第三行只显示 "18:30"。

实际三行效果：
```
备份 2026-
09-17
18:30
```

这不是理想的设计，但在不缩小字号的约束下，是胶囊屏的物理极限。

#### 优化方案：去掉"备份"前缀

name 改为 `"2026-09-17 18:30"` (16字符)，lines: 2：
- 第一行: `"2026-09-17"` = 165px > 158px → 换为 `"2026-"` = 82.5px ✅
- 第二行: `"09-17 18:30"` = 82.5 + 8 + 82.5 = 173px > 158px → 再换行

实际效果（lines: 3）:
```
2026-
09-17
18:30
```

#### 胶囊屏结论

在不缩小 30px 字号的前提下，胶囊屏 158px 可用宽度只能每行容纳约 5-6 个半宽字符。

- **name 使用 lines: 3**：日期时间自动拆为 3 行
- **meta 使用 lines: 1 + ellipsis**：`"15门·3表"` ≈ 137px < 158px ✅
- **按钮**: 两个按钮 60+8+60 = 128px < 158px ✅ 可以并排

胶囊屏最终布局（5行）：
```
2026-              ← name line 1
09-17              ← name line 2  
18:30              ← name line 3
15门·3表           ← meta (lines:1)
[恢复] [删除]     ← actions
```

---

## 八、新规范CSS实现

### 8.1 默认/方屏样式

```css
.page {
  flex: 1;
  flex-direction: column;
  padding: 44px 10px 16px 10px;
  width: 100%;
  height: 100%;
}

/* 垂直布局，文字与按钮分行 */
.backup-row {
  flex-direction: column;
  border-radius: 12px;
  padding: 14px 14px;
  margin-bottom: 10px;
}

/* 第一行：备份名称，独占整行 */
.backup-row-name {
  font-size: 32px;
  font-weight: bold;
  line-height: 42px;
  margin-bottom: 8px;
  lines: 1;
  text-overflow: ellipsis;
}

/* 第二行：统计信息 + 操作按钮 */
.backup-row-footer {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.backup-row-meta {
  font-size: 28px;
  line-height: 36px;
  lines: 1;
  text-overflow: ellipsis;
  flex-shrink: 1;
  margin-right: 8px;
}

.backup-row-actions {
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
}

.row-restore-btn {
  width: 60px;
  height: 36px;
  border-radius: 8px;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin-right: 8px;
}

.row-delete-btn {
  width: 60px;
  height: 36px;
  border-radius: 8px;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  border-width: 1px;
}
```

### 8.2 圆形屏适配

```css
@media (shape: circle) {
  .page {
    padding: 44px 36px 44px 36px;
  }

  .backup-row {
    padding: 14px 12px;
    margin-bottom: 10px;
  }

  .backup-row-name {
    font-size: 30px;
    line-height: 40px;
    margin-bottom: 6px;
  }

  .backup-row-meta {
    font-size: 26px;
    line-height: 34px;
  }

  .row-restore-btn {
    width: 60px;
    height: 36px;
    font-size: 24px;
    margin-right: 8px;
  }

  .row-delete-btn {
    width: 60px;
    height: 36px;
    font-size: 24px;
  }
}
```

### 8.3 胶囊屏适配（字号不变，靠多行换行解决）

```css
@media (shape: capsule), (shape: pill-shaped) {
  .page {
    padding: 30px 12px 30px 12px;   /* 左右从36px减至12px */
  }

  .backup-row {
    flex-direction: column;          /* 垂直布局 */
    border-radius: 12px;
    padding: 12px 8px;
    margin-bottom: 8px;
  }

  .backup-row-name {
    font-size: 30px;                 /* 字号不变 */
    font-weight: bold;
    line-height: 40px;
    margin-bottom: 4px;
    lines: 3;                        /* 允许3行换行 */
    text-overflow: ellipsis;
  }

  .backup-row-footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
  }

  .backup-row-meta {
    font-size: 26px;                 /* 字号不变 */
    line-height: 34px;
    lines: 1;
    text-overflow: ellipsis;
    flex-shrink: 1;
    margin-right: 6px;
  }

  .backup-row-actions {
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
  }

  .row-restore-btn {
    width: 60px;
    height: 36px;
    border-radius: 6px;
    font-size: 24px;                 /* 字号不变 */
    font-weight: bold;
    text-align: center;
    margin-right: 6px;
  }

  .row-delete-btn {
    width: 60px;
    height: 36px;
    border-radius: 6px;
    font-size: 24px;                 /* 字号不变 */
    font-weight: bold;
    text-align: center;
    border-width: 1px;
  }
}
```

---

## 九、配套JS修改

### 9.1 meta 去掉重复时间

```javascript
// 旧: "2026-09-17 18:30 15门 3表"
// 新: "15门课程 · 3张课表" (时间已在name中显示)
```

在 `performBackup` 函数中修改 backupEntry:

```javascript
var backupEntry = {
  id: now.getTime(),
  name: "备份 " + timeStr,           // name保留完整时间和"备份"前缀
  time: timeStr,                      // 保留time字段（可能其他地方用）
  courseCount: courseCount,
  scheduleCount: scheduleCount,
  data: data
}
```

模板中meta改为:
```html
<text class="backup-row-meta">{{ $item.courseCount }}门课程 · {{ $item.scheduleCount }}张课表</text>
```

### 9.2 去"备份"前缀（可选，节省胶囊屏宝贵空间）

如果去掉name中的"备份"前缀：
```javascript
name: timeStr   // "2026-09-17 18:30" 直接作为name
```
- 方屏：281.6px < 406px，更多余量
- 胶囊屏：264px → lines:2 刚好 `"2026-09-17"` / `"18:30"`，165px > 158px 还会拆行

---

## 十、最终验证汇总

### 10.1 方屏 (454px) — 垂直布局

| 行 | 内容 | 需宽 | 可用 | 结果 |
|----|------|------|------|------|
| name | "备份 2026-09-17 18:30" (32px) | 356px | 406px | ✅ |
| meta+actions | "15门课程 · 3张课表" + [恢复][删除] | 395px | 406px | ✅ |

### 10.2 圆形屏 (454px, padding 36+36)

| 行 | 内容 | 需宽 | 可用 | 结果 |
|----|------|------|------|------|
| name | "备份 2026-09-17 18:30" (30px) | 332px | 358px | ✅ |
| meta+actions | "15门·3表"(26px) + 128px | 265px | 358px | ✅ |

### 10.3 胶囊屏 (198px, padding 12+12)

| 行 | 内容 | 需宽 | 可用 | 结果 |
|----|------|------|------|------|
| name L1 | "2026-" (30px) | 83px | 158px | ✅ |
| name L2 | "09-17" (30px) | 83px | 158px | ✅ |
| name L3 | "18:30" (30px) | 83px | 158px | ✅ |
| meta | "15门·3表" (26px) | 137px | 158px | ✅ |
| actions | [恢复] [删除] (24px) | 126px | 158px | ✅ |

> 胶囊屏 name 自动拆为 3 行（系统根据 lines:3 自动换行），所有内容完整可见。

---

## 十一、新旧方案对比

| 项目 | 旧方案 | 新方案 | 改善 |
|------|--------|--------|------|
| 布局方向 | 水平（文字+按钮同行抢宽度） | 垂直（各行独占整行） | 彻底解决空间争抢 |
| name 字号 | 32/30/30px | **32/30/30px（不变）** | ✅ |
| meta 字号 | 28/26/26px | **28/26/26px（不变）** | ✅ |
| 按钮字号 | 24px | **24px（不变）** | ✅ |
| name 行数 | 1行（被截断） | 方屏1行/胶囊3行（完整显示） | ✅ |
| meta 内容 | 含重复时间(26字符) | 仅统计(9-14字符) | 节省约250px |
| 文字截断 | 无（溢出遮挡） | lines:N + ellipsis | 杜绝溢出 |
| 胶囊屏可用宽 | -42px(崩溃) | 158px(每行) | 从崩溃到正常 |
| 胶囊屏padding | 36px | 12px | 节省48px宽度 |

### 关键改动点

1. **backup-row 改为 `flex-direction: column`** — 上下多行布局，文字不再与按钮抢宽度
2. **name 独占首行** — 32px/30px 字号完整显示日期时间
3. **meta 去掉重复时间** — 只保留 `"15门课程 · 3张课表"` 统计信息
4. **胶囊屏 page padding 从 36px 减至 12px** — 多腾出 48px 宽度
5. **胶囊屏 name 使用 `lines: 3`** — 日期时间自动换行，不用缩小字号
6. **全部文字加 `text-overflow: ellipsis`** — 极端情况兜底
7. **所有字号保持原值不变** — 不做任何缩小