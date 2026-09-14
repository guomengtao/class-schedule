# 输入法页面分析报告

日期: 2026-09-14

## 核心原则

**整个项目只有一个中文输入页面** (`/pages/chinese-input`)，所有需要中文输入的页面统一跳转到该页面。

## InputMethod 组件直接使用情况

| # | 页面路径 | 文件名 | 使用方式 | 问题 |
|---|---------|--------|---------|------|
| 1 | `/pages/chinese-input` | `chinese-input.ux` | 内嵌 InputMethod 组件 | ✅ 唯一合法的输入页面 |
| 2 | `/pages/nickname-edit` | `nickname-edit.ux` | 内嵌 InputMethod 组件 | ❌ 多余！应改为跳转 chinese-input |

## 通过 router.push 跳转 chinese-input 的页面

| # | 页面 | 文件名 | 输入场景 | 入口函数 |
|---|------|--------|---------|---------|
| 1 | 课程管理 | `course-manager.ux` | 重命名课程 | `startRename` |
| 2 | 课程管理 | `course-manager.ux` | 添加课程 | `startAdd` |
| 3 | 课程详情 | `detail.ux` | 上课地点（步骤3） | `openLocationInput` |
| 4 | 添加课程 | `add-course.ux` | 输入位置 | `openLocationInput` |
| 5 | 课表管理 | `schedule-manager.ux` | 重命名课表 | `startRename` |
| 6 | 自定义内容 | `custom-content-edit.ux` | 编辑自定义内容 | `editContent` |
| 7 | 二维码生成 | `qrcode-generator.ux` | 输入文字 | `openInput` |

## 统计

| 类别 | 数量 |
|------|------|
| 直接使用 InputMethod 的页面 | **2** (chinese-input, nickname-edit) |
| 其中应删除的 | **1** (nickname-edit) |
| 通过跳转使用中文输入的页面 | **6** |
| 中文输入总入口数 | **8** 个（含 nickname-edit 改后 9 个） |
| InputMethod 组件页 | **1** (仅 chinese-input，改后) |

## 结论

- `nickname-edit` 是唯一仍在直接内嵌 InputMethod 组件的多余页面
- 改造后，`InputMethod` 组件仅在 `chinese-input` 一个页面中加载
- 总内存消耗大幅降低

## 改造方案

### nickname-edit 改造

1. 删除 `InputMethod` import 和模板中的 `<input-method>` 组件
2. 删除 `showKeyboard`、`hideKeyboard`、`showCursor`、`screenType` 状态
3. 删除 `device` import 和 `device.getInfo()`
4. 删除 `showKeyboardFn`、`onDisplayClick`、`onInputComplete`、`onInputDelete`、`onKeyDown`
5. 修改 `onDisplayClick` → `openInput`（跳转 chinese-input）
6. 在 `onShow` 中读取 `chinese_input_result` 并设置 `currentName`