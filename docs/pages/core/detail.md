# 编辑课程

> 路由：`pages/detail` ｜ 源码：`src/pages/detail/detail.ux`（约 1581 行）

## 1. 页面职责

单条课程的详情与编辑：可改名称/地点/教师/备注/时间，支持删除与撤销（防误删）。是 add-course 的编辑态孪生页面。

## 2. 界面结构

- 课程名 / 地点：courseName、courseLocation
- 教师与备注：courseTeacher、courseNotes
- 时间调整：同 add-course 的步进器组
- 删除与撤销：deleteCourse → showUndo / hideUndo → finishDelete
- 缺失课程标记：courseMissing

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `deleteCourse` | 发起删除（先弹确认/撤销条，不直接落库） |
| `finishDelete` | 撤销窗口结束后真正删除 |
| `hideUndo / showUndo` | 撤销条显隐 |
| `enterDayStep` | 进入星期选择步骤 |
| `increaseStartHour / decreaseStartHour 等` | 时间步进 |
| `adjustEndTime` | 结束时间兜底修正 |

## 4. 主要数据字段

- `courseName`
- `courseLocation`
- `courseTeacher`
- `courseNotes`
- `courseTime`
- `day`
- `classId`
- `courseIndex`
- `courseMissing`
- `bottom`
- `courseScrollLeft`

## 5. 注意事项

- 删除必须保留撤销窗口，手环上误触概率远高于手机
- courseMissing 用于标记「课表里有但数据缺失」的异常记录
