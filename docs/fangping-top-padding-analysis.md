# 方形屏幕顶部空行溢出分析

> **日期**：2026-09-22
> **问题**：方形屏幕 (rect, 336×480) 上，多数页面顶部存在约 44px 的空白行，浪费了宝贵的纵向空间。

---

## 1. 根因分析

### 1.1 CSS 源头

所有受影响页面都在 `@media (shape: rect)` 媒体查询中为根容器（`.page` / `.page-root` / `.schedule-page` / `.settings-page` 等）设置了 `padding-top: 44px`。

```css
/* 典型反例 */
@media (shape: rect) {
  .page {
    padding: 44px 6px 6px 6px;  /* ← 44px 顶部空白 */
  }
}
```

### 1.2 为什么是 44px

这个 44px 来源于 `src/common/header.css` 中 `.header` 的默认高度：

```css
.header {
  height: 44px;  /* 标题栏高度 */
}
```

最初的设计意图可能是：页面顶部用 `padding-top: 44px` 模拟一个标题栏高度的安全区，让内容从标题栏下方开始。但这个逻辑在本项目中是**错误**的，原因如下：

1. **页面标题栏是独立的 DOM 元素**（使用 `import common/header.css` 的 `.header` 组件），不是通过 padding 模拟的。
2. **所有页面内部的 `.header` 元素已经占用了 44-48px 高度**，页面的 `padding-top` 再额外加 44px 相当于双重留白。
3. 系统顶部状态栏由手表 OS 自行管理，**不需要应用层额外留空**。

**本质**：`padding-top: 44px` 是一段历史遗留码，和后继的 `.header` 组件形成了重复叠加。

### 1.3 视觉影响

在 336×480 的方屏上：

| 项目 | 数值 |
|------|------|
| 屏幕总高度 | 480px |
| 顶部空白（44px） | 9.2% |
| .header 组件占高 | 48px (rect) |
| padding + header 合计 | 92px |
| 实际可用内容区 | 480 - 92 = 388px (80.8%) |

顶部 44px 空白肉眼清晰可见，尤其在深色背景上表现为一条纯黑/纯白空行。

---

## 2. 影响范围

搜索全部 `src/pages/**/*.ux`，共发现 **19 个页面** 在 `@media (shape: rect)` 中使用了 `padding-top: 44px`：

| # | 页面 | 文件 | 选择器 | rect padding | 严重度 |
|---|------|------|--------|-------------|--------|
| 1 | 首页 | `index/index.ux` | `.schedule-page` | `44px 6px 6px 6px` | 🔴 核心页面 |
| 2 | 设置 | `settings/settings.ux` | `.settings-page` | `44px 6px 6px 6px` | 🔴 核心页面 |
| 3 | 统计 | `statistics/statistics.ux` | `.page` | `44px 6px 6px 6px` | 🔴 核心页面 |
| 4 | 周视图 | `week-view/week-view.ux` | `.wv-page` | `44px 10px 12px 10px` | 🔴 核心页面 |
| 5 | 课表管理 | `schedule-manager/schedule-manager.ux` | `.page` | `44px 8px 8px 8px` | 🔴 核心页面 |
| 6 | 编辑课程 | `detail/detail.ux` | `.edit-course-page` | `44px 10px 50px 10px` | 🔴 核心页面 |
| 7 | 高级版激活 | `activation/activation.ux` | `.page` | `44px 8px 8px 8px` | 🟡 常用 |
| 8 | 首页设置 | `homepage-settings/homepage-settings.ux` | `.page` | `44px 8px 8px 8px` | 🟡 常用 |
| 9 | 打赏支持 | `donate/donate.ux` | `.page-root` | `40px 12px 20px 12px` | 🟡 常用(40px) |
| 10 | 课程管理v2 | `course-manager-v2/course-manager-v2.ux` | `.page` | `44px 10px 12px 10px` | 🟡 |
| 11 | 自定义内容 | `custom-content-edit/custom-content-edit.ux` | `.page` | `44px 10px 12px 10px` | 🟢 |
| 12 | 模板选择 | `template-picker/template-picker.ux` | `.page` | `44px 16px 12px 16px` | 🟢 |
| 13 | 钉首页 | `pinned-pages/pinned-pages.ux` | `.pinned-pages-page` | `44px 12px 16px 12px` | 🟢 |
| 14 | 实验编辑 | `lab-edit-course/lab-edit-course.ux` | `.page-root` | `44px 10px 12px 10px` | 🟢 |
| 15 | 备份恢复 | `backup-restore/backup-restore.ux` | `.page` | `44px 8px 10px 8px` | 🟢 |
| 16 | 课表二维码 | `schedule-qrcode/schedule-qrcode.ux` | `.page` | `44px 6px 6px 6px` | 🟢 |
| 17 | 欢迎页 | `welcome/welcome.ux` | `.page` | `44px 8px 20px 8px` | 🟢 |
| 18 | bs-demo1 | `bs-demo1/bs-demo1.ux` | `.page` | `44px 6px 6px 6px` | 测试页 |
| 19 | bs-demo5 | `bs-demo5/bs-demo5.ux` | `.page` | `44px 6px 6px 6px` | 测试页 |
| 20 | header-demo2 | `header-demo2/header-demo2.ux` | `.page-root` | `44px 12px 16px 12px` | 测试页 |
| 21 | test-area | `test-area/test-area.ux` | `.page-root` | `44px 12px 16px 12px` | 测试页 |

**已优化（低 padding）：**

| # | 页面 | 文件 | rect padding |
|---|------|------|-------------|
| 1 | 课程管理 | `course-manager/course-manager.ux` | `38px 12px 16px 12px` |
| 2 | 重置数据 | `reset-data/reset-data.ux` | `38px 12px 16px 12px` |
| 3 | 二维码生成 | `qrcode-generator/qrcode-generator.ux` | `12px` (全部) |

**多少页真的有问题**：除去 4 个 demo/test 页，**核心业务页面有 17 个** 受顶部空行影响。

---

## 3. 修复方案

### 3.1 推荐方案：纯 CSS 批量替换（高效 + 稳定）

**原理**：将所有 `@media (shape: rect)` 媒体查询中的 `padding: 44px X Y Z` 改为 `padding: 6px X Y Z`。

**为什么是 6px 而不是 0**：
- 0px 会让内容紧贴屏幕物理边缘，视觉上不够舒适
- 6px 与当前方屏的水平 padding（6-8px）保持一致，形成均匀的视觉边框
- 完全消除 44px 大空块，释放约 38px 纵向空间（占屏幕 7.9%）

**可行性**：
- 纯 CSS 改动，不涉及 JS 逻辑
- 每个页面修改 1 行
- 不影响胶囊屏和圆屏的已有布局
- 不影响 `.header` 组件的高度

### 3.2 修改步骤

对每个受影响的文件，在 `@media (shape: rect)` 块内找到 `.page` / `.page-root` / `.schedule-page` 等选择器的 `padding` 属性，将第一个值从 `44px`（或 `38px` / `40px`）改为 `6px`：

```css
/* 修改前 */
@media (shape: rect) {
  .schedule-page {
    padding: 44px 6px 6px 6px;
  }
}

/* 修改后 */
@media (shape: rect) {
  .schedule-page {
    padding: 6px 6px 6px 6px;
  }
}
```

### 3.3 不推荐方案及原因

| 方案 | 问题 |
|------|------|
| 统一到 `common.css` | 各页面选择器名称不一致（`.page` / `.page-root` / `.schedule-page` / `.settings-page`…），无法用一个公共选择器覆盖 |
| 删掉 `.header` 改用 padding 自建标题 | 大量 JS 改动，引入回归风险 |
| 用 JS 动态计算 | 性能开销，不必要的复杂度 |

### 3.4 需注意的边界情况

- **打赏支持** (`donate/donate.ux`) 在 rect 下是 40px（不是 44px），同样需要降到 6px
- **课程管理** (`course-manager/course-manager.ux`) 是 38px，降到 6px
- **重置数据** (`reset-data/reset-data.ux`) 是 38px，降到 6px

---

## 4. 总结

| 维度 | 数据 |
|------|------|
| 根因 | `padding-top: 44px` 与 `.header` 组件高度重复叠加 |
| 受影响页面 | **17 个核心业务页** + 4 个 demo 页 |
| 修复方式 | 每个页面改 1 行 CSS：`44px` → `6px` |
| 释放空间 | 每页约 38px 纵向空间（占屏幕 7.9%） |
| 风险 | 零风险，纯 CSS，不影响其他屏幕形状 |
| 预计耗时 | 批量正则替换，约 2 分钟 |