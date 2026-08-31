# 项目缺失功能分析报告

## 已有功能概览

| 页面 | 增 | 删 | 改 | 查 | 其他 |
|------|:--:|:--:|:--:|:--:|------|
| 首页 (index) | ✅ 快速添加、添加课程 | ✅ 左滑删除 | ❌ 无直接编辑入口 | ✅ 按天查看 | 状态栏、今日/明天跳转 |
| 课程总览 (week-view) | ❌ 无添加入口 | ❌ 无删除 | ❌ 无编辑 | ✅ 周视图浏览 | 点击进入详情 |
| 编辑课程 (detail) | — | ✅ 第4步删除 | ✅ 4步编辑 | — | 垃圾桶图标 |
| 添加课程 (add-course) | ✅ 4步添加 | — | — | — | |
| 课程管理 (course-manager) | ✅ 添加预设 | ✅ 删除预设 | ✅ 重命名 | ✅ 列表浏览 | 中文输入法 |
| 课程表管理 (schedule-manager) | ✅ 新增课程表 | ✅ 删除课程表 | ✅ 重命名 | ✅ 列表浏览 | 复制、统计入口 |
| 统计 (statistics) | — | — | — | ✅ 多维度统计 | 科目排行、时间分布 |
| 设置 (settings) | — | — | ✅ 各种设置 | — | 主题、字体、提醒、版本号 |

---

## 缺失功能详细分析

### 1. 首页缺少"编辑"入口 ⚠️ 重要

**当前位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux)

左滑课程卡片只显示一个红色的"删除"按钮，没有"编辑"按钮。用户需要点击卡片进入详情页，走完4步才能编辑。

```html
<!-- 当前只有删除按钮 -->
<div class="delete-btn" onclick="deleteCourse($item.id)">
    <text class="delete-btn-icon">&#128465;</text>
</div>
```

**建议**：在删除按钮旁边增加一个蓝色"编辑"按钮，左滑时同时显示两个操作按钮。

---

### 2. 首页缺少"复制课程"功能 ⚠️ 重要

**当前位置**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux)

无法快速复制某节课。例如用户想把"数学 08:00-08:45"复制到另一天，只能手动重新添加。

**建议**：左滑时增加"复制"按钮，或长按弹出菜单（复制到当天 / 复制到其他天）。

---

### 3. 课程总览缺少"删除"功能 ⚠️ 重要

**当前位置**：[week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux)

课程总览页面只能查看，点击课程格进入详情页后才能删除。路径：`总览 → 点击课程 → 第4步 → 删除按钮`，共需要4步操作。

**建议**：在周视图课程格上增加长按弹出删除确认，或点击后弹出操作菜单（查看/编辑/删除）。

---

### 4. 课程总览缺少"添加课程"按钮

**当前位置**：[week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux)

课程总览页面底部只有"共 X 门课程"的统计文字，没有添加课程入口。用户想添加课程必须先返回首页。

**建议**：底部增加"+ 添加课程"按钮，或点击空格直接跳转到添加页面。

---

### 5. 课程总览缺少"编辑"入口

同删除问题，周视图没有直接编辑课程的能力，必须进入详情页。

---

### 6. 缺少"课程备注"功能 ⚠️ 中等

数据库 [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) 的课程结构中有 `notes` 字段：

```javascript
var newCourse = {
    id: String(this.nextId),
    day: this.currentDay,
    name: name,
    time: time,
    teacher: teacher,
    location: location,
    notes: ""       // ← 从未使用
}
```

但添加流程（add-course.ux）和编辑流程（detail.ux）都没有备注输入步骤。用户无法为课程添加"带实验器材"、"期中考试"等备注信息。

**建议**：在添加/编辑流程中增加第3.5步或第5步，输入课程备注。

---

### 7. 缺少"教师"设置功能 ⚠️ 中等

数据库有 `teacher` 字段，添加课程时默认为空字符串 `"老师"`，但添加/编辑流程中没有修改教师的步骤。

**建议**：在编辑流程中增加"教师"步骤，或在位置步骤中一并设置。

---

### 8. 缺少"课程单独提醒"功能

**当前位置**：[settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux)

目前所有课程使用统一的提醒设置（启用/禁用、提前分钟数、震动样式）。无法为某节重要课程单独设置提醒（如提前15分钟提醒数学考试）。

**建议**：在编辑课程页面增加"提醒设置"开关，允许覆盖全局设置。

---

### 9. 缺少"数据导出/导入"功能

**当前位置**：无

用户无法备份课程数据到文件或从文件恢复。换手表或重置后数据全部丢失。

**建议**：在设置页面增加"导出数据"和"导入数据"按钮，导出为JSON文件。

---

### 10. 缺少"重置数据"功能

**当前位置**：[settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux)

设置页面有"保存设置"按钮，但没有"恢复默认设置"或"清除所有数据"的选项。

**建议**：在设置页面底部增加"恢复默认设置"和"清除所有课程数据"按钮，操作前弹出确认对话框。

---

### 11. 缺少"关于"页面

没有应用说明页面，用户无法查看：
- 应用功能介绍
- 使用帮助
- 版本更新日志
- 开发者信息

**建议**：新建 `about.ux` 页面，设置页面增加"关于"入口。

---

### 12. 课程管理缺少搜索/过滤功能

**当前位置**：[course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux)

默认有12门预设课程，如果用户添加更多，列表会很长，没有搜索功能难以快速定位。

**建议**：在列表顶部增加搜索框或字母索引。

---

### 13. 统计页面缺少"导出统计"功能

**当前位置**：[statistics.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/statistics/statistics.ux)

统计页面数据丰富（总课程、本周、最忙日、科目排行、时间分布），但没有导出或分享功能。

---

## 优先级建议

| 优先级 | 功能 | 影响范围 |
|--------|------|----------|
| 🔴 **高** | 首页左滑增加编辑按钮 | 日常使用频率最高 |
| 🔴 **高** | 课程总览增加删除功能 | 减少操作步骤 |
| 🔴 **高** | 课程总览增加添加入口 | 减少页面跳转 |
| 🟡 **中** | 首页增加复制课程功能 | 提升效率 |
| 🟡 **中** | 课程备注功能 | 完善数据模型 |
| 🟡 **中** | 教师设置功能 | 完善数据模型 |
| 🟢 **低** | 数据导出/导入 | 数据安全 |
| 🟢 **低** | 重置数据 | 设置完善 |
| 🟢 **低** | 关于页面 | 应用完整性 |
| 🟢 **低** | 课程搜索过滤 | 大量课程时有用 |
| 🟢 **低** | 课程单独提醒 | 精细化需求 |
| 🟢 **低** | 统计导出 | 分享需求 |