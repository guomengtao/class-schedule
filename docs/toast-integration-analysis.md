# 项目 Toast 弹窗集成分析报告

## 概述

`prompt.showToast()` 是 Vela JS 框架的原生轻量反馈组件，适合在用户操作后提供即时、非阻塞的反馈提示。本文档分析项目中所有适合增加 Toast 弹窗的环节，确保用户每次操作都有明确的反馈。

## API 参考

```javascript
prompt.showToast({
  message: "提示文字",
  duration: 1500   // 默认 1500ms，可选
})
```

---

## 已集成的 Toast（无需修改）

| 页面 | 操作 | 触发条件 | 提示文字 |
|------|------|:--------:|----------|
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L160) | 重命名课程 | 名称已存在 | "名称已存在" |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L166) | 重命名课程 | 成功 | "已更新" |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L182) | 添加课程 | 名称已存在 | "名称已存在" |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L196) | 添加课程 | 成功 | "已添加" |

---

## 需要新增 Toast 的环节

### 优先级 P0：核心数据操作（必须反馈）

| 序号 | 文件 | 函数 | 触发场景 | 建议 Toast | 说明 |
|:--:|------|------|----------|----------|------|
| 1 | [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L101) | `handleResetPresets` | 恢复默认课程**成功** | "默认课程已恢复" | ✅ 已添加 |
| 2 | [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L101) | `handleResetPresets` | 恢复默认课程**失败** | "恢复失败，请重试" | ✅ 已添加 |
| 3 | [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L129) | `handleResetAll` | 一键重置**成功** | "全部数据已重置" | ✅ 已添加 |
| 4 | [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L129) | `handleResetAll` | 一键重置**失败** | "重置失败，请重试" | ✅ 已添加 |
| 5 | [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L527) | `deleteCourse` | 删除课程 | "课程已删除" | ✅ 已添加 |
| 6 | [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L519) | `updateCourse` | 更新课程 | "课程已更新" | ✅ 已添加 |
| 7 | [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L437) | `saveCourse` | 添加课程 | "课程已添加" | ✅ 已添加 |
| 8 | [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L520) | `makeCourse` | 快速添加课程 | "已添加 {课程名}" | ✅ 已添加 |

### 优先级 P1：课程表管理操作

| 序号 | 文件 | 函数 | 触发场景 | 建议 Toast | 说明 |
|:--:|------|------|----------|----------|------|
| 9 | [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L258) | `addSchedule` | 新增课程表 | "课程表已添加" | ✅ 已添加 |
| 10 | [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L322) | `copySchedule` | 复制课程表 | "课程表已复制" | ✅ 已添加 |
| 11 | [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L348) | `deleteSchedule` | 删除课程表 | "课程表已删除" | ✅ 已添加 |
| 12 | [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L218) | `finishEdit` | 重命名课程表 | "已重命名" | ✅ 已添加 |

### 优先级 P2：课程管理操作

| 序号 | 文件 | 函数 | 触发场景 | 建议 Toast | 说明 |
|:--:|------|------|----------|----------|------|
| 13 | [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L201) | `deleteCourse` | 删除课程 | "课程已删除" | ✅ 已添加 |
| 14 | [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L168) | `doRenameCourse` | 名称未改变 | 无需 Toast | 当前无提示，可保持 |

### 优先级 P3：设置与偏好操作

| 序号 | 文件 | 函数 | 触发场景 | 建议 Toast | 说明 |
|:--:|------|------|----------|----------|------|
| 15 | [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux#L387) | `saveSettings` | 保存设置 | "设置已保存" | ✅ 已添加 |
| 16 | [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux#L78) | `saveNickname` | 保存昵称 | "昵称已保存" | ✅ 已添加 |
| 17 | [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux#L296) | `savePreset` | 保存震动方案 | "方案已保存" | ✅ 已添加 |
| 18 | [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux#L312) | `deletePreset` | 删除震动方案 | "方案已删除" | ✅ 已添加 |

---

## 实现示例

### 模式 A：成功操作 feedback（最常用）

```javascript
saveCourse() {
  if (!this.courseName || !this.courseTime) {
    return
  }
  var newCourse = { /* ... */ }
  database.insertCourse(newCourse, function() {
    prompt.showToast({ message: "课程已添加" })
    router.back()
  })
}
```

### 模式 B：成功/失败双反馈

```javascript
handleResetPresets() {
  // ... 确认逻辑 ...
  database.resetCoursePresets(function(success) {
    if (success) {
      prompt.showToast({ message: "默认课程已恢复" })
    } else {
      prompt.showToast({ message: "恢复失败，请重试" })
    }
  })
}
```

### 模式 C：操作前校验拦截

```javascript
doAddCourse(newName) {
  newName = (newName || "").trim()
  if (!newName) {
    this.isAdding = false
    return
  }
  for (var i = 0; i < this.courseList.length; i++) {
    if (this.courseList[i].name === newName) {
      prompt.showToast({ message: "名称已存在" })
      this.isAdding = false
      return
    }
  }
  // ... 添加逻辑 ...
  prompt.showToast({ message: "已添加" })
}
```

---

## 汇总统计

| 优先级 | 数量 | 状态 |
|:------:|:----:|------|
| P0 核心数据操作 | 8 处 | ✅ 全部完成 |
| P1 课程表管理 | 4 处 | ✅ 全部完成 |
| P2 课程管理 | 1 处 | ✅ 全部完成 |
| P3 设置与偏好 | 4 处 | ✅ 全部完成 |
| **总计** | **17 处** | **✅ 全部完成** |

---

## 实施建议

1. **优先实施 P0**：删除课程、更新课程、添加课程、快速添加，这些是用户最频繁的操作
2. **P1 批量实施**：课程表管理 4 个操作一起改，代码结构相似
3. **P3 低优先级**：设置类操作频率低，可以最后处理
4. **统一 Toast 时长**：建议成功提示用默认 1500ms，失败提示用 2000ms 让用户看清
5. **搜索替换**：`router.back()` 前加 `prompt.showToast(...)` 即可覆盖大部分场景