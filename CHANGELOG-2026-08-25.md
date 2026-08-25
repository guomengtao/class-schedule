# 2026-08-25 更新记录

## 版本 v1.2.33

---

## 1. 移除首页右滑删除功能

**文件**: `src/pages/index/index.ux`

- 移除了课程卡片上的左滑删除按钮（垃圾桶图标）
- 移除了 `class-card-swiped` 滑动状态类
- 移除了 `ontouchstart` / `ontouchend` 滑动手势处理
- 移除了 `handleCardTouchStart`、`handleCardTouchEnd`、`dismissSwipe`、`deleteCourse` 方法
- 移除了相关 CSS 样式（`.delete-btn`、`.delete-btn-icon`、`.class-card-swiped`）

---

## 2. 添加课程第二步时间设置界面优化

**文件**: `src/pages/add-course/add-course.ux`

- 添加 `<scroll class="step2-scroll">` 滚动包裹层，与编辑页面布局一致
- 移除了开始时间和结束时间之间的 `time-divider` 分隔线
- 移除了 `stepper-time-end` 的边框样式和 `end-label` 特殊样式
- 统一了 `stepper-time`、`picker-label`、`stepper-row` 的 padding/margin 与编辑页面一致
- 时间设置按钮略小于编辑页面：`44px × 36px`（编辑页面为 `48px × 40px`），字体 `20px`（编辑页面为 `22px`）

---

## 3. 新增恢复默认数据功能

### 3.1 新建页面 `pages/reset-data`

**文件**: `src/pages/reset-data/reset-data.ux`

- 警告提示区域：明确说明操作将丢失所有自定义数据，不可撤销
- 数据说明区域：展示默认数据包含 2 张课程表，12 门课程
- 二次确认机制：首次点击进入确认状态，5 秒内再次点击才执行重置
- 按钮脉冲动画提醒用户注意

### 3.2 数据库重置函数

**文件**: `src/data/database.js`

新增 `resetToDemoData()` 函数：

- **12 门课程**：数学、语文、英语、物理、化学、生物、历史、地理、政治、计算机、音乐、美术
- **课程表 1**：周一至周五，每天 8 节课（上午 4 节 08:00-11:40 + 下午 4 节 14:00-17:40），课程随机分配
- **课程表 2**：同样结构，独立随机分配
- 重置课程表名称为"课程表1"和"课程表2"
- 当前索引归零
- 同时支持 SQLite 和 Storage 两种存储后端

### 3.3 设置页入口

**文件**: `src/pages/settings/settings.ux`

- 在"保存设置"按钮下方新增"恢复默认数据"入口
- 红色文字标识危险操作
- 点击跳转到重置页面

### 3.4 路由注册

**文件**: `src/manifest.json`

- 注册 `pages/reset-data` 路由

---

## 4. Logo 图标更新

**文件**: `scripts/generate-logo.py`、`src/common/logo.png`、`src/logo.png`

- 使用 Python + Pillow 生成 128×128 圆形 Logo
- 设计：深蓝圆形背景 + 浅蓝边框，中央为课程表卡片样式
- 卡片包含浅蓝色表头 + 5 行课程时间段（圆点 + 双色块）
- 配色与项目主题色一致（`#1a1a2e` / `#7ec8e3`）
- 卡片尺寸放大至圆圈的 80%，确保在手表上清晰可见

---

## 涉及文件清单

| 文件 | 变更类型 |
|------|---------|
| `src/pages/index/index.ux` | 修改 - 移除滑动删除 |
| `src/pages/add-course/add-course.ux` | 修改 - 时间设置界面优化 |
| `src/pages/reset-data/reset-data.ux` | 新增 - 恢复默认数据页面 |
| `src/pages/settings/settings.ux` | 修改 - 添加重置入口 |
| `src/data/database.js` | 修改 - 新增 resetToDemoData 函数 |
| `src/manifest.json` | 修改 - 注册新路由 |
| `scripts/generate-logo.py` | 新增 - Logo 生成脚本 |
| `src/common/logo.png` | 修改 - 新 Logo |
| `src/logo.png` | 修改 - 新 Logo |
| `src/data/version.js` | 修改 - 版本号更新 |