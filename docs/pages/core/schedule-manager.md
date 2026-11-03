# 课程表管理

> 路由：`pages/schedule-manager` ｜ 源码：`src/pages/schedule-manager/schedule-manager.ux`（约 1149 行）

## 1. 页面职责

多课表（多张课程表）的管理中心：新建、复制、重命名、删除课表，切换当前课表；部分能力属高级版（Pro）。

## 2. 界面结构

- 课表列表：list，当前项 currentIndex
- 新建：addSchedule / doAddSchedule
- 复制：copySchedule
- 重命名：editName / finishEdit / cancelEdit
- 删除：deleteSchedule（deleteConfirmIndex 二次确认）
- 高级版门禁：checkProAccess → goToPremium
- 假期提醒开关：holidayReminderOn

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `loadData` | 载入课表列表 |
| `addSchedule / doAddSchedule` | 新建课表 |
| `copySchedule` | 复制整张课表（快速做新学期） |
| `editName / finishEdit / cancelEdit` | 重命名流程 |
| `deleteSchedule` | 删除课表 |
| `checkProAccess` | 高级版权限校验 |
| `goToPremium` | 引导去激活页 |
| `closeSheet / dismissDialog` | 弹层关闭 |

## 4. 主要数据字段

- `list`
- `currentIndex`
- `editName`
- `editingIndex`
- `sheetIndex`
- `sheetCount`
- `holidayReminderOn`
- `deleteConfirmIndex`

## 5. 注意事项

- 删除课表会连带其下所有课程，确认文案要写清后果
- Pro 门禁要前后端一致：checkProAccess 判定与 activation 页状态同步

## 6. 头部胶囊 + 列表行课程数（2026-11-03 定稿 · v1.9.111）

### 6.1 头部

原来是自己写的一套三段式（方块返回键 + 居中标题 + 占位），与设置页、总课表不一致。
现改用公共 `<import src="../../common/header.css" />` 的 `.hdr` 胶囊：`‹ 课表` 一颗整体胶囊，
整块可点返回，外观/高度与其他子页逐像素一致。新增子页一律走这套，不要再手写返回键。

### 6.2 为什么课程数放进左侧圆环，而不是另起一列

页面内距 14×2 后行内可用 140px；圆环 32 + 间距 12 = 44，名称只剩 **96px**，
24px 字号按 `(96−24)/24` 只能放 **3 个汉字**。所以：

- 「名称后面再加课程总数」要再吃 40px+ → 名称掉到 1–2 字，不可接受；
- 「去掉圆环、后面加总数」同理，且丢掉「当前课表」的唯一视觉标记；
- **圆内显数字是唯一不额外占宽度的做法**：复用了圆环本来占的 44px。

| 状态 | 圆形态 | 数字色 |
|---|---|---|
| 当前课表 | 实心 accent，数字反白 `theme.bg` | 高对比 |
| 非当前、有课 | 空心，`textMuted` 描边 | `textSecondary` |
| 空课表（0 门） | 同上 | `textMuted`（最弱） |

0 用最弱色是刻意设计：一眼扫出「哪个课表是空的」，这正是管理页的主要用途。
宽度：圆 32 − 边框 4 = 内径 28，20px 字号两位数字约 25.2px 放得下；三位（≥100 门）会溢出，
单课表不可能有那么多课，未为其缩字号。圆形表盘分支圆收 28（内径 24），数字降到 18px。

### 6.3 两条硬约束（都实测踩过，别再踩）

1. **`self.list[idx].xxx = v` 不会刷新视图**，Vela 不监听数组元素的深层赋值。
2. **「就地改对象 + `self.list = draft.slice()`」同样不会刷新**：slice 是浅拷贝，新旧数组
   共用同一批对象引用，Vela 做值对比时两边读到的是同一个已被改过的对象，判定「无变化」。
   **必须每次重建全新的行对象**再整体赋值（`{name, courseCount, holidayOn}` 逐字段拷进新对象）。
   实测症状：圆徽章一直显示 0，而首页同一课表能正常列出课程。
