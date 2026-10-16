# 添加课程

> 路由：`pages/add-course` ｜ 源码：`src/pages/add-course/add-course.ux`（约 968 行）

## 1. 页面职责

新建一条课程记录：课程名、地点、星期、起止时间，带冲突检测。时间用步进器（+/-）调，避免手环小屏上输入困难。

## 2. 界面结构

- 课程名输入：courseName
- 地点输入：courseLocation
- 星期选择：day / dayIndex
- 起始时间步进：increase/decreaseStartHour、StartMin
- 结束时间步进：increase/decreaseEndHour、EndMin
- 冲突确认：conflictConfirmed（与已有课程重叠时提示）

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `doInsert` | 校验后写入并落库 |
| `loadCourses` | 读取现有课程用于冲突判断 |
| `adjustEndTime` | 保证结束时间不早于开始时间 |
| `increaseStartHour / increaseStartMin` | 开始时间 + |
| `decreaseStartHour / decreaseStartMin` | 开始时间 - |
| `increaseEndHour / increaseEndMin` | 结束时间 + |
| `decreaseEndHour / decreaseEndMin` | 结束时间 - |
| `onShow` | 回前台刷新数据 |

## 4. 主要数据字段

- `courseName`
- `courseLocation`
- `courseTime`
- `day`
- `dayIndex`
- `startH`
- `startM`
- `endH`
- `endM`
- `conflictConfirmed`
- `courseIndex`

## 5. 注意事项

- 另有 add-course-v2（新版添加页），改动前先确认当前生效的是哪一版
- 时间步进要防负值溢出（00:00 再减）
