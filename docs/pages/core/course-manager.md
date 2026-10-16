# 课程管理

> 路由：`pages/course-manager` ｜ 源码：`src/pages/course-manager/course-manager.ux`（约 782 行）

## 1. 页面职责

当前课表下所有课程的列表管理：新增、重命名、删除（带撤销）、清空全部。偏「批量维护」而非单条编辑。

## 2. 界面结构

- 课程列表：courseList
- 新增：startAdd → doAddCourse
- 重命名：doRenameCourse
- 删除：deleteCourse + showUndo/hideUndo
- 清空：clearAllCourses（二次确认 clearAllConfirm）

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `loadCourses` | 载入课程列表 |
| `saveCourses` | 保存变更 |
| `startAdd` | 进入新增态（isAdding） |
| `doAddCourse` | 提交新增 |
| `doRenameCourse` | 提交重命名 |
| `deleteCourse` | 删除指定项 |
| `clearAllCourses` | 清空全部（危险操作） |
| `showUndo / hideUndo` | 撤销条 |
| `processInputResult` | 处理输入法回调结果 |

## 4. 主要数据字段

- `courseList`
- `isAdding`
- `editingIndex`
- `deleteConfirmIndex`
- `clearAllConfirm`
- `iconTheme`
- `isCapsule`

## 5. 注意事项

- 清空全部是不可逆操作，必须二次确认
- 输入依赖系统输入法回调（processInputResult），回调丢失会导致输入卡住
