# `@media screen and` 在手环9胶囊屏导致黑屏重启 · 根因分析

> **触发提交**：`0f45018 feat(class): 课程表多页面交互/样式修订 + 版本 1.7.6→1.7.9`（2026-10-02）  
> **修复提交**：回退到 `9b6eb15`（2026-09-28）  
> **现象**：在手环 9 胶囊屏上，首页先黑屏，然后手环自动重启（看门狗复位）  
> **关联文档**：[首页黑屏并重启-深度分析](./首页黑屏并重启-深度分析.md)

---

## 0. TL;DR

**根因**：将 CSS 媒体查询从 Quick App 专用语法改为 W3C 标准语法后，手环 9 的 CSS 引擎无法识别 `screen and` 媒体类型前缀，导致三个形状媒体查询块全部失配（**没有一条 CSS 布局规则生效**）。页面渲染引擎在无布局约束下崩溃，触发看门狗重启。

---

## 1. 改了什么

`0f45018` 对 `src/pages/index/index.ux` 中的三个媒体查询做了如下修改：

```diff
-@media (shape: circle) {
+@media screen and (shape: circle) {

-@media (shape: capsule), (shape: pill-shaped) {
+@media screen and (shape: pill-shaped) {

-@media (shape: rect) {
+@media screen and (shape: rect) {
```

改动看起来只是加了 `screen and` 前缀（W3C 标准媒体查询语法），同时把胶囊屏的 `(shape: capsule), (shape: pill-shaped)` 合并为单个 `(shape: pill-shaped)`。

**看似无害，实则致命。**

---

## 2. 为什么导致黑屏

### 2.1 手环 9 的 CSS 引擎不支持 `screen and`

华为手环 9 运行的是 **LiteOS + Quick App 运行时**，其 CSS 解析器是一个极度精简的嵌入式引擎，只实现了 Quick App 框架规范中定义的子集。

| 语法 | W3C 标准？ | 手环9支持？ |
|------|:---:|:---:|
| `@media (shape: circle)` | ❌ 非标准 | ✅ Quick App 专用 |
| `@media screen and (shape: circle)` | ✅ 标准 | ❌ **不支持** |

手环 9 的 CSS 引擎对媒体查询的解析逻辑大致是：

```
解析 @media 规则
  ├─ 读取媒体类型（如 screen, print, all）
  │   └─ 不认识/未实现 → 整条规则被标记为 "not matching"
  └─ 读取媒体特性（如 shape: circle, width: 200px）
      └─ 只有匹配时才应用内部样式
```

当解析器遇到 `screen and` 时：
- `screen` 是 W3C 定义的媒体类型，但 Quick App 引擎**未实现此媒体类型的分发逻辑**
- 引擎将整个媒体查询块标记为 **"不匹配"（not matching）**
- 三个形状媒体查询（circle / capsule / rect）**全部不匹配**
- 所有屏幕形状的布局规则**全部被丢弃**

### 2.2 丢失了哪些关键布局？

三个媒体查询块定义了首页的**全部核心布局**：

```
@media (shape: circle) {
  .schedule-page { padding: 44px 36px 44px 36px; }
  .nav-btn-circle { width: 48px; height: 48px; border-radius: 24px; }
  .nav-btn-img { width: 22px; height: 22px; }
  .day-nav-circle { width: 36px; height: 36px; ... }
  .add-btn-wrapper, .style-btn { height: 40px; border-radius: 20px; }
  .add-btn-icon { width: 22px; height: 22px; }
  .add-btn-label { font-size: 18px; }
  .bottom-buttons { margin-bottom: 8px; }
}

@media (shape: capsule), (shape: pill-shaped) {
  .schedule-page { padding: 30px 16px 30px 16px; }
  .header { padding: 2px 0; margin-bottom: 4px; }
  .day-title { font-size: 26px; font-weight: bold; ... }
  .day-nav-circle { width: 48px; height: 48px; ... }
  .day-nav-text { font-size: 20px; line-height: 28px; }
  /* ... 胶囊屏专用的大量样式 */
}

@media (shape: rect) {
  .schedule-page { padding: 6px 6px 6px 6px; }
  .header { padding: 3px 0; margin-bottom: 3px; }
  /* ... 方屏专用样式 */
}
```

这三个块之外，**没有默认布局**。首页的所有尺寸、间距、字号都定义在这些媒体查询中。

### 2.3 后果链

```
@media screen and 无法识别
  → 三个形状块全部失配
  → .schedule-page 无 padding → 内容紧贴边缘/尺寸为0
  → .header 无 padding/margin → header 高度为0
  → 所有子元素无宽高 → 渲染树异常
  → 渲染引擎崩溃
  → RTOS 看门狗超时
  → 手环重启
```

---

## 3. 为什么不是白屏而是黑屏+重启

| 结果 | 原因 |
|------|------|
| **白屏** | CSS 不生效但 HTML 结构还在，浏览器显示空白背景 |
| **黑屏** | 渲染引擎崩溃，framebuffer 未刷新/保持出厂默认黑色 |
| **重启** | RTOS 看门狗检测到渲染线程长时间无响应，触发硬件复位 |

手环 9 的黑屏不是"没内容显示"，而是**渲染管线彻底崩溃**——framebuffer 停留在上一帧（或默认值），同时主线程被渲染错误阻塞，看门狗超时后强制重启。

---

## 4. 为什么在开发/模拟器上看不出问题

| 环境 | CSS 引擎 | `@media screen and` | 结果 |
|------|----------|---------------------|------|
| 华为 IDE 模拟器 | Chrome/WebView | ✅ 完整 W3C 支持 | 正常 |
| 真机（手环9） | Quick App 嵌入式引擎 | ❌ 不支持 | 崩溃 |

这是典型的**模拟器与真机 CSS 能力不一致**问题。IDE 预览基于 Chromium，支持完整 W3C 标准；而真机上的 Quick App 运行时只实现了框架规范的最小可用子集。

---

## 5. 教训与规则

### 5.1 禁止使用 W3C 标准媒体查询语法

在手环 Quick App 开发中，**只能使用 Quick App 框架定义的专用语法**：

```css
/* ✅ 正确：Quick App 专用语法 */
@media (shape: circle) { }
@media (shape: capsule), (shape: pill-shaped) { }
@media (shape: rect) { }

/* ❌ 错误：W3C 标准语法（会导致真机崩溃） */
@media screen and (shape: circle) { }
@media all and (shape: capsule) { }
```

### 5.2 必须为关键布局提供默认值

所有形状媒体查询块之外，必须有 fallback 默认样式：

```css
/* 默认布局（无媒体查询包裹） */
.schedule-page {
  padding: 30px 16px 30px 16px;  /* 最常用尺寸作为兜底 */
}
.header {
  padding: 2px 0;
}
```

这样即使媒体查询全部失配，布局也不会完全崩溃。

### 5.3 媒体查询改动必须真机验证

任何 CSS `@media` 规则的修改，**不能依赖模拟器预览**，必须安装到手环 9 真机上验证。

---

## 6. 修复方案

回退 `0f45018` 的三个媒体查询改动，恢复为 Quick App 专用语法：

```diff
-@media screen and (shape: circle) {
+@media (shape: circle) {

-@media screen and (shape: pill-shaped) {
+@media (shape: capsule), (shape: pill-shaped) {

-@media screen and (shape: rect) {
+@media (shape: rect) {
```

此修复已通过 `git checkout 9b6eb15 -- src/pages/index/index.ux` 完成。