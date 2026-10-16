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
