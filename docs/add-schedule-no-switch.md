# 新增课程表不自动切换 — 分析与改动

## 需求

新增课程表时，仅创建空课表并加入列表，**不切换当前课表**。用户仍保持在原来正在使用的课表上。

## 现状问题

当前 `doAddSchedule()` 在创建新课表后会调用 `database.setScheduleIndex(newIndex)`，该函数：

1. 将新索引写入存储 `key="currentScheduleIndex"`
2. 调用 `clearStoreCache()` 清空 store 内存缓存

随后 `loadData()` 读取 `store.getCurrentScheduleIndex()` 时，因缓存已空，从存储读到的就是新索引，于是界面自动切到新课表。

## 改动

### `doAddSchedule()` 改动

| 行 | 现状 | 改为 |
|----|------|------|
| `database.setScheduleIndex(newIndex, …)` | 写入数据库并清缓存，导致自动切换 | **删除该行**，不写入任何索引变更 |
| 余下逻辑 | 保存 names、创建空 `allCourses` 数据 | 保持不变 |

### 涉及文件

- `src/pages/schedule-manager/schedule-manager.ux` — 仅删一行

### 不改动

- `loadData()` 不受影响，它读 `store.getCurrentScheduleIndex()` 存的是旧索引
- 用户手动切换课表仍正常走 `toggle()` → `store.setCurrentScheduleIndex()` + `database.setScheduleIndex()`
- 其他页面（首页、周视图）读到的 currentIndex 不变

## 风险

- 无风险。`database.setScheduleIndex` 在这里的作用就是"自动切过去"，去掉后只影响新增场景。