# 圆形手环全局样式适配方案书（优化版）

## 1. 问题定义：四个角丢失信息

### 1.1 核心痛点

圆形屏设备上，页面内容**四个角被裁切**，导致顶部导航按钮、底部操作按钮、卡片的左右两侧部分丢失。

```
圆形屏四角裁切示意图:

         裁切区            裁切区
         ╱─────╲──────────╱─────╲
        │                                           │
        │          [◀ 返回] [标题] [▶ 下一页]        │  ← 两侧按钮被裁切
        │                                           │
        │                                           │
        │               内容区域                     │
        │                                           │
        │                                           │
        │       [底部按钮]  [底部文字]                │  ← 两侧被裁切
        │                                           │
         ╲─────╱──────────╲─────╱
         裁切区            裁切区
```

### 1.2 项目背景

| 参数 | 值 |
|------|-----|
| 设备类型 | `watch`, `band`（[manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json#L12-L14)） |
| 屏幕形状 | 方形 (rect)、圆形 (circle)、胶囊形 (pill-shaped) |
| 典型圆形屏尺寸 | 466×466 / 480×480 |
| 页面总数 | 23 个（10 手动 + 13 auto-gen） |
| 现有圆形屏适配 | 仅 [InputMethod.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux#L840) 有 `@media (shape: circle)` |

---

## 2. 两种丢失类型分析

### 2.1 布局性丢失 vs 内容性丢失

圆形屏四角丢失分为两种本质不同的类型，需要不同的处理策略：

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   布局性丢失（✅ @media (shape: circle) 能解决）              │
│   ────────────────────────────────────                       │
│   元素在错误的位置导致被裁 → 通过 padding 把元素移到安全区域   │
│                                                              │
│   示例：按钮在左上角 (0,0) → 被圆形裁切 → 加 padding 移到中心  │
│         → ✅ 按钮完整显示                                     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   内容性丢失（⚠️ @media (shape: circle) 无法解决）            │
│   ────────────────────────────────────                       │
│   元素本身太大/太多，超出圆形可视区域 → 需要缩小字号/截断文本  │
│                                                              │
│   示例：课程名 "高等数学A-01班" → 太长超出圆形边缘            │
│         → 需要 text-overflow: ellipsis 截断                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 能防止什么（✅ 本方案能解决）

| 能防止的丢失 | 解决方案 |
| :--- | :--- |
| **顶部导航按钮**（◄ 标题 ►） | 根容器 `padding-top: 44px`，把按钮从裁切区移到中心 |
| **底部操作按钮**（添加、设置） | 根容器 `padding-bottom: 44px`，把按钮从底部裁切区上移 |
| **状态栏文字**（上课中/即将上课） | 整体内边距让文字不贴边显示 |
| **课程卡片左右两侧** | 根容器 `padding-left/right: 20px`，卡片内容向内缩 |
| **列表项的首尾元素** | 列表在 `flex:1` 容器内，自动居中 |

**效果对比：**

```
修改前（顶部按钮被裁切）:              修改后（按钮完整显示）:

    ╭──────────────────╮                  ╭──────────────────╮
   ╱  ◄ 标题             │                ╱                    ╲
  │   ► 按钮              │               │   ◄ 标题 ►          │
  │                      │               │                      │
  │    内容区域           │               │    内容区域          │
  │                      │               │                      │
  │  [底部按钮]           │               │  [底部按钮]          │
   ╲                    ╱                 ╲                    ╱
    ╰──────────────────╯                  ╰──────────────────╯
   ◄ 只剩一半、► 完全消失               两个按钮都在圆形内，完整显示
```

### 2.3 不能防止什么（⚠️ 需要额外补充 CSS）

| 不能防止的丢失 | 原因 | 需要补充的策略 |
| :--- | :--- | :--- |
| **超长文本**（如 "高等数学A-01班"） | 即使加了 padding，文字太长还是会超出圆形边缘 | `text-overflow: ellipsis` + `max-lines: 1` |
| **过多列表项** | 圆形屏可视面积小，列表项太多时底部自然会被裁 | 只能靠滚动查看，无法完全展示所有项 |
| **横向滚动标签**（快速添加课程） | 最左和最右的标签可能被圆形边缘裁切 | 调小 `font-size` + 减少 `padding` + `margin` |
| **自定义弹窗/Toast** | 如果弹窗出现在屏幕边缘（如 `bottom: 0`），会被裁 | 确保弹窗居中显示 |

### 2.4 总结：能解决 80%+ 的问题

| 问题 | 答案 |
| :--- | :--- |
| 能防止四个角丢失吗？ | ✅ **能**，解决了 80%+ 的丢失问题（导航按钮、底部操作按钮、卡片边缘） |
| 能 100% 防止所有丢失吗？ | ❌ **不能**，超长文本和过多列表项仍可能被裁，需要额外补充 CSS |
| 当前方案够用吗？ | ✅ **够用**，核心功能（切换日期、添加课程、查看列表）在圆形屏上完全可用 |

---

## 3. 方案设计：三层渐进式适配

### 3.1 总览

```
┌──────────────────────────────────────────────────────┐
│  第一层：全局安全边距（解决 80% 的四个角丢失）         │
│  → 所有页面根容器统一在圆形屏增加 padding              │
│  → 一行 @media 搞定，方形屏零影响                      │
├──────────────────────────────────────────────────────┤
│  第二层：关键组件尺寸微调（解决按钮/文字溢出）          │
│  → 按钮缩小、文字缩小、圆角增大                        │
│  → 让 UI 更贴合圆形屏的视觉风格                        │
├──────────────────────────────────────────────────────┤
│  第三层：内容溢出防护（解决长文本/多列表项溢出）        │
│  → 文本截断 ellipsis、轮播标签缩小、列表项紧凑          │
│  → 兜底保护，防止极端内容超出圆形边缘                   │
└──────────────────────────────────────────────────────┘
```

### 3.2 第一层：全局安全边距（核心）

#### 原理

```
方形屏 (padding: 8px):              圆形屏 (padding: 44px 20px):

┌──────────────────┐                ╭──────────────────╮
│ 8px              │                │   44px top       │
│ ┌──────────────┐ │                │ ┌──────────────┐ │
│ │              │ │                │ │              │ │
│ │   内容区域    │ │                │ │  内容区域    │ │
│ │              │ │                │ │              │ │
│ └──────────────┘ │                │ └──────────────┘ │
│ 8px              │                │   44px bottom    │
└──────────────────┘                ╰──────────────────╯
  内容贴边，四角被裁切                 内容内缩，完全在安全区域内
```

#### 安全边距取值依据

| 屏幕直径 | 内接正方形边长 | 理论最大边距 | **推荐边距** | 说明 |
|:------:|:----------:|:--------:|:--------:|------|
| 466px | 466/√2 ≈ 330px | 68px | **44px 上下, 20px 左右** | 顶部/底部居中区域宽度=直径，只有四角被裁 |
| 480px | 480/√2 ≈ 339px | 71px | **44px 上下, 20px 左右** | 推荐值足够安全，且不浪费空间 |

> 为什么推荐值小于理论值？顶部 header 和底部 footer 在屏幕中间，圆形屏的宽度等于直径，不会被裁切。只有**四个角**的内容会被裁，所以只需给上下左右适度的 padding，不需要用完整的理论值。

#### 代码实现

**A. 手动页面（10 个）** — 在每个页面根容器 CSS 末尾追加：

```css
/* ========== 圆形屏专用适配 ========== */
@media (shape: circle) {
  .schedule-page {
    padding: 44px 20px 44px 20px;
  }
}
```

**B. 自动生成页面（13 个）** — 修改 [gen-pages.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/gen-pages.js#L23-L32) 的 `baseStyle()`：

```javascript
function baseStyle() {
  return '  .demo-page{flex-direction:column;padding:16px;height:100%}\n' +
    // ... 基础样式不变 ...
    '  @media (shape: circle) {\n' +
    '    .demo-page{padding:44px 20px 44px 20px}\n' +
    '  }\n';
}
```

#### 各页面根容器 CSS 类名

| 文件 | 根容器类 | 方形屏 padding | 圆形屏 padding |
|------|---------|:----------:|:----------:|
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L873) | `.schedule-page` | `8px` | `44px 20px` |
| [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux#L539) | `.detail-page` | `16px` | `44px 20px` |
| [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux#L449) | `.add-course-page` | `16px` | `44px 20px` |
| [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux#L403) | `.settings-page` | `8px` | `44px 20px` |
| [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L390) | `.schedule-manager-page` | `12px` | `44px 20px` |
| [week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux#L323) | `.week-view-page` | `8px` | `44px 20px` |
| [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux#L94) | `.nickname-edit-page` | `10px` | `44px 20px` |
| [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux#L215) | `.course-manager-page` | `10px` | `44px 20px` |
| [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux#L162) | `.reset-data-page` | `8px` | `44px 20px` |
| [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux#L326) | `.vibration-lab-page` | `8px` | `44px 20px` |
| 13 个 auto-gen 页面 | `.demo-page` | `16px` | `44px 20px` |

### 3.3 第二层：关键组件尺寸微调

安全边距解决位置问题后，圆形屏上的按钮和文字需要适当缩小，因为可用空间更小。

| 元素类型 | 方形屏尺寸 | 圆形屏尺寸 | 调整幅度 |
|----------|:--------:|:--------:|:------:|
| 返回按钮 | 56×44px | 44×36px | -20% |
| 标题文字 | 28px | 24px | -14% |
| 操作按钮 | 48px 高 | 40px 高 | -17% |
| 卡片 border-radius | 14px | 20px | 更圆，视觉更贴合 |
| 通用文字 | 20-28px | 16-24px | -15% |

```css
@media (shape: circle) {
  .back-btn {
    width: 44px;
    height: 36px;
    font-size: 16px;
  }
  .title {
    font-size: 24px;
  }
  .add-btn {
    height: 40px;
    border-radius: 14px;
    font-size: 18px;
  }
  .card, .list-item {
    border-radius: 20px;
  }
}
```

### 3.4 第三层：内容溢出防护（兜底）

针对内容性丢失（长文本、多列表项、横向滚动标签），在 `@media (shape: circle)` 中补充以下样式：

```css
@media (shape: circle) {
  /* ===== 第一层：安全边距 ===== */
  .schedule-page {
    padding: 44px 20px 44px 20px;
  }

  /* ===== 第二层：组件微调 ===== */
  .back-btn {
    width: 44px;
    height: 36px;
    font-size: 16px;
  }
  .title {
    font-size: 24px;
  }

  /* ===== 第三层：溢出防护 ===== */

  /* 防长文本溢出：课程名、班级名统一截断 */
  .class-name,
  .course-name,
  .status-current,
  .status-next {
    max-width: 120px;
    text-overflow: ellipsis;
    max-lines: 1;
  }

  /* 列表项高度减小，让更多内容可见 */
  .class-card-wrapper {
    margin-bottom: 4px;
  }
  .class-content {
    padding: 8px 12px;
  }

  /* 横向滚动标签缩小 */
  .quick-add-item {
    padding: 4px 10px;
    margin-right: 4px;
  }
  .quick-add-name {
    font-size: 18px;
  }

  /* 弹窗/Toast 确保居中，不贴边 */
  .popup, .toast, .dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
```

---

## 4. 实施步骤

### 步骤 1：修改 `gen-pages.js`（影响 13 个 auto-gen 页面）

在 [gen-pages.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/scripts/gen-pages.js#L23-L32) 的 `baseStyle()` 中追加圆形屏适配块，运行 `node scripts/gen-pages.js` 重新生成。

### 步骤 2：修改 10 个手动页面

在每个手动页面的 `<style>` 末尾，为根容器追加 `@media (shape: circle)` 块。

### 步骤 3：IDE 模拟器验证

在 IDE 多屏模拟器中选择圆形屏（466×466），逐一验证：

| 验证项 | 检查点 |
|--------|--------|
| 顶部 header | 返回按钮、标题文字、日期切换按钮完整可见 |
| 底部 footer | 添加课程、设置按钮完整可见 |
| 课程卡片 | 左右两侧的卡片名称和状态图标不被裁切 |
| 快速添加标签 | 左右两侧的标签不被裁切，文字可读 |
| 滚动区域 | 列表可完整滚动，底部项不空白 |
| 弹窗/Toast | 对话框和提示在圆形屏内居中显示 |

### 步骤 4：真机测试 + 边缘情况补充

根据真机测试反馈，对超长课程名、多列表项等边缘情况按第三层防护策略补充 CSS。

---

## 5. 完整代码示例：首页 index.ux

```css
/* ========== 默认样式（方形屏）========== */
.schedule-page {
  flex-direction: column;
  background-color: #1a1a2e;
  padding: 8px;
  height: 100%;
}

.header {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  margin-bottom: 6px;
}

.nav-btn {
  width: 56px;
  height: 44px;
  border-radius: 10px;
  font-size: 18px;
  text-align: center;
}

/* ========== 圆形屏适配 ========== */
@media (shape: circle) {
  /* 第一层：安全边距 */
  .schedule-page {
    padding: 44px 20px 44px 20px;
  }

  /* 第二层：组件微调 */
  .nav-btn {
    width: 44px;
    height: 36px;
    border-radius: 18px;
    font-size: 16px;
    margin: 0 6px;
  }
  .clock-text {
    font-size: 14px;
  }
  .course-name {
    font-size: 16px;
  }

  /* 第三层：溢出防护 */
  .status-current,
  .status-next {
    max-width: 120px;
    text-overflow: ellipsis;
    max-lines: 1;
  }
  .class-card-wrapper {
    margin-bottom: 4px;
  }
  .quick-add-item {
    padding: 4px 10px;
    margin-right: 4px;
  }
  .quick-add-name {
    font-size: 18px;
  }
}
```

---

## 6. 兼容性说明

| 问题 | 答案 |
|------|------|
| 方形屏会受影响吗？ | ❌ 不会。`@media (shape: circle)` 在方形/胶囊屏上被完全忽略 |
| 项目有先例吗？ | ✅ 有。[InputMethod.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/components/InputMethod/InputMethod.ux#L840) 已使用 `@media (shape: circle)` |
| 后续新页面需要适配吗？ | 如果遵循相同的根容器 padding 规范，只需在 `<style>` 末尾追加 `@media (shape: circle)` 块即可 |

---

## 7. 附录

### 7.1 圆形屏安全区域速查表

| 屏幕尺寸 | 直径 | 内接正方形 | 推荐上下 padding | 推荐左右 padding |
|:------:|:---:|:-------:|:----------:|:----------:|
| 390×390 | 390px | 276×276 | 38px | 18px |
| 454×454 | 454px | 321×321 | 44px | 20px |
| 466×466 | 466px | 330×330 | 44px | 20px |
| 480×480 | 480px | 339×339 | 44px | 20px |

### 7.2 涉及页面完整清单

| # | 页面 | 类型 | 根容器类 |
|--:|------|:--:|---------|
| 1 | [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) | 手动 | `.schedule-page` |
| 2 | [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux) | 手动 | `.detail-page` |
| 3 | [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux) | 手动 | `.add-course-page` |
| 4 | [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux) | 手动 | `.settings-page` |
| 5 | [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux) | 手动 | `.schedule-manager-page` |
| 6 | [week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux) | 手动 | `.week-view-page` |
| 7 | [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux) | 手动 | `.nickname-edit-page` |
| 8 | [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux) | 手动 | `.course-manager-page` |
| 9 | [reset-data.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/reset-data/reset-data.ux) | 手动 | `.reset-data-page` |
| 10 | [vibration-lab.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/vibration-lab/vibration-lab.ux) | 手动 | `.vibration-lab-page` |
| 11-23 | 13 个 demo-* 页面 | auto-gen | `.demo-page` |

### 7.3 `@media (shape: circle)` 语法参考

```css
/* 仅圆形屏 */
@media (shape: circle) {
  /* 圆形屏样式 */
}

/* 圆形屏 + 特定尺寸范围 */
@media (min-width: 460) and (max-width: 490) and (shape: circle) {
  /* 466-480px 圆形屏样式 */
}

/* 非圆形屏（方形/胶囊） */
@media not (shape: circle) {
  /* 方形屏和胶囊屏样式 */
}
```