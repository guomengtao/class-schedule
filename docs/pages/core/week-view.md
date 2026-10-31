# 周课表（总课表）

> 路由：`pages/week-view` ｜ 源码：`src/pages/week-view/week-view.ux`（约 1219 行）
>
> **同页文档（分析前必读）**
> - [需求文档](./week-view/需求文档.md) — 需求与设计决策台账（D/B/Q 编号）。本文 §5 的列宽与清理策略均以该文档为准；凡该文档 §3 记录在案者一律视为**有意设计**，不得当作缺陷上报。

## 1. 页面职责

整周课表的网格视图：横轴星期、纵轴时间槽，渲染全部课程格子，高亮当前节课，支持模板切换与周末过滤。

## 2. 界面结构

- 星期表头：dayLabels / allDayNames / displayDayNames
- 时间槽网格：buildTimeSlots 生成单元格
- 课程格：getCellBg / getCellTextColor 决定配色
- 当前课程高亮：detectCurrentCourse、currentCourseDay/Time
- 模板与过滤：applyTemplate、applyWeekendFilter

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `buildTimeSlots` | 按配置生成时间槽行 |
| `detectCurrentCourse` | 定位「现在在上哪节课」 |
| `getCellBg / getCellTextColor` | 格子配色（按课程/模板） |
| `getDisplayName / getFirstChar` | 课程名显示裁剪（小屏只放得下首字） |
| `applyTemplate` | 套用周课表模板 |
| `applyWeekendFilter` | 是否显示周末 |
| `loadData / loadTemplateAndReload` | 数据与模板载入 |

## 4. 主要数据字段

- `allWeekDays`
- `allDayNames`
- `displayDayNames`
- `dayCounts`
- `dayLabels`
- `cellWidth`
- `cellHeight`
- `cellRadius`
- `cellBordered`
- `currentCourseDay`
- `currentCourseTime`
- `currentTplId`

## 5. 注意事项

- 格子尺寸是硬约束：cellWidth/cellHeight 由屏宽推导，方屏与胶囊屏要分别验证
- onDestroy 里注意清理定时器，避免后台常驻耗电
