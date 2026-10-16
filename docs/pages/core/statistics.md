# 课程统计

> 路由：`pages/statistics` ｜ 源码：`src/pages/statistics/statistics.ux`（约 583 行）

## 1. 页面职责

对课程数据做聚合可视化：星期分布、时段分布、科目排行、最忙的一天。部分维度属高级版。

## 2. 界面结构

- 星期分布：dayDistribution
- 时段分布：timeDistribution
- 科目排行：subjectRank
- 最忙一天：busiestDay
- Pro 门禁：isPro / checkProStatus

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `loadStatistics` | 载入统计数据 |
| `processData` | 聚合计算（分布/排行/最忙日） |
| `checkProStatus` | 高级版校验 |
| `onShow` | 回前台刷新 |

## 4. 主要数据字段

- `dayDistribution`
- `timeDistribution`
- `subjectRank`
- `busiestDay`
- `isPro`
- `lines`

## 5. 注意事项

- 统计基于当前课表；空课表要有空态文案，不能渲染空白页
- 聚合逻辑放在 processData，新增维度优先在这里扩展
