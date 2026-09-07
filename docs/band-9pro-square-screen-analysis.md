# 小米手环 9 Pro 方屏首页显示问题分析报告

## 问题概述

**反馈来源**：用户反馈 + ksskk 反馈（9 Pro 方屏首页内容偏左上角）

**现象**：小米手环 9 Pro（方形屏幕）上，主界面（首页）内容整体偏左上角，未居中显示。

**影响版本**：v1.4.34 及之前所有版本

**严重程度**：高 - 影响所有 9 Pro 用户的首屏体验

---

## 根因分析

### 1. 屏幕形状差异

| 设备 | 屏幕形状 | CSS shape 值 | 分辨率 |
|------|---------|-------------|--------|
| 小米手环 8/8 Pro | 椭圆/胶囊 | `circle` / `capsule` | 192×490 等 |
| 小米手环 9 Pro | **方形** | `rect` | 336×336 或类似 |

Vela 快应用框架通过 `@media (shape: rect)` 媒体查询区分方形屏幕设备。

### 2. 主首页缺少媒体查询适配

**核心问题**：`src/pages/index/index.ux` 是应用的入口页面，但**完全没有**任何 `@media (shape: ...)` 媒体查询。

```css
/* index.ux - 当前唯一的 padding 定义，无 shape 适配 */
.schedule-page {
  flex-direction: column;
  background-color: #1a1a2e;
  padding: 44px 8px 8px 8px;  /* 固定值，仅适配圆屏/胶囊屏 */
  min-height: 100%;
}
```

在方形屏幕上，`padding: 44px 8px 8px 8px` 的左右 8px 内边距不够宽，导致内容区域过宽，整体偏左上方。

### 3. 其他页面已正确适配

项目中有 **28 个文件** 已包含 `@media (shape: rect)` 适配，统一使用：

```css
@media (shape: rect) {
  .page {
    padding: 44px 6px 6px 6px;  /* 方形屏幕专用内边距 */
  }
}
```

**已适配的页面**（部分列举）：
- `home-pro/index.ux` - 首页专业版
- `home-module-demo/index.ux` - 首页模块演示
- `today-demo/index.ux` - 今日演示
- `week-view/week-view.ux` - 周视图
- `add-course/add-course.ux` - 添加课程
- `settings/settings.ux` - 设置
- `detail/detail.ux` - 课程详情
- 等 28 个文件

### 4. 对比分析

| 页面 | 有 shape: rect 适配？ | 方屏表现 |
|------|---------------------|---------|
| `index` (主首页) | ❌ 无 | **偏左上角** |
| `home-pro` | ✅ 有 | 正常 |
| `home-module-demo` | ✅ 有 | 正常 |
| `week-view` | ✅ 有 | 正常 |
| `add-course` | ✅ 有 | 正常 |

### 5. 修复方案

在 `index.ux` 的 style 末尾添加屏幕形状媒体查询：

```css
@media (shape: circle) {
  .schedule-page {
    padding: 44px 36px 44px 36px;
  }
  .header {
    justify-content: center;
    padding: 8px 0;
  }
  .nav-btn {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    font-size: 18px;
  }
  .day-title {
    font-size: 18px;
    margin: 0 8px;
  }
  .day-nav-btns {
    display: none;
  }
  .bottom-buttons {
    justify-content: center;
  }
  .add-btn {
    margin-right: 8px;
  }
}

@media (shape: capsule) {
  .schedule-page {
    padding: 44px 8px 8px 8px;
  }
}

@media (shape: rect) {
  .schedule-page {
    padding: 44px 6px 6px 6px;
  }
}
```

### 6. 遗漏页面清单

以下页面也未包含 `@media (shape: rect)` 适配，但影响较小（非主要入口页面）：

| 页面 | 路径 | 影响 |
|------|------|------|
| 课程管理 | `schedule-manager` | 低 |
| 检查演示 | `check-demo` | 低（调试用） |
| 组件演示 | `comp-demo` | 低（调试用） |
| 折叠面板 | `accordion-demo` | 低（调试用） |
| 实验室模块测试 | `lab-module-test` | 低（调试用） |
| 底部导航演示 | `bottom-nav-demo` | 低（调试用） |
| Icon 收集 | `icon-collection` | 低 |
| 404 页面 | `not-found` | 低 |

---

## 总结

- **根本原因**：`index.ux` 主首页缺少 `@media (shape: rect)` 媒体查询，未针对方形屏幕（9 Pro）做适配
- **修复难度**：低 - 添加 3 个媒体查询块即可
- **修复范围**：`src/pages/index/index.ux` 一个文件
- **验证方法**：在 9 Pro 设备或 Vela 模拟器（rect 模式）上测试