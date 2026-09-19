# 页面头部统一分析

## 背景

项目中 header-demo1 和 header-demo2 两个页面展示了通过 `@import '../../common/header.css'` 共享头部样式的方案。本文分析所有带返回按钮的页面，评估统一迁移到该方案的可行性与收益。

---

## 一、现状统计

项目中共有 **37 个页面** 带有返回按钮（`onclick="goBack"`）。

### 1.1 头部实现方式分布

| 方式 | 数量 | 页面 |
|------|------|------|
| **标准 PNG 模式** (`back-btn-wrapper` + `back-btn-icon` + `title`) | 27 | 占绝大多数 |
| **标准 PNG + 右侧按钮** | 5 | course-manager、course-manager-v2、countdown-manage、detail、lab-edit-course |
| **自定义类名** (`wv-*`) | 1 | week-view |
| **文本按钮** (`<` 或 `◀`) | 3 | capsule-hide-test、detail、lab-add-course |
| **共享 header.css** (`@import`) | 2 | header-demo1、header-demo2 |

### 1.2 各类头部模板代码对比

#### 标准 PNG 模式（最常用，27 个页面）

```html
<div class="header">
  <div class="back-btn-wrapper" onclick="goBack" style="background-color: {{ theme.card }}">
    <image class="back-btn-icon" src="../../common/icons/{{ iconTheme }}/icon_back.png"></image>
  </div>
  <text class="title" style="color: {{ theme.text }}">页面标题</text>
</div>
```

每页重复 ~90 行 CSS（`.header`、`.back-btn-wrapper`、`.back-btn-icon`、`.title` 及 `@media` 适配）。

#### 标准 PNG + 右侧按钮（5 个页面）

```html
<div class="header">
  <div class="back-btn-wrapper" onclick="goBack">...</div>
  <text class="title">页面标题</text>
  <input class="add-btn" type="button" value="+ 添加" ... />  <!-- 或垃圾桶按钮 -->
</div>
```

#### 共享 header.css 模式（仅 2 个 demo 页面）

```html
<div class="header">
  <div class="back-btn-wrapper" onclick="goBack">...</div>
  <text class="header-title">Header Demo 1</text>
  <div class="header-placeholder"></div>
</div>
```

通过 `@import '../../common/header.css'` 引入，头部 CSS 零重复。

---

## 二、共享 header.css 方案的优势

| 优势 | 说明 |
|------|------|
| **统一管理** | `common/header.css` 一处修改，所有页面生效 |
| **屏型适配集中** | `@media (shape: capsule/circle/rect)` 只需写一次 |
| **减少重复代码** | 27 个标准页面各有 ~90 行重复 CSS，合计 ~2430 行 |
| **新增页面零成本** | 新页面只需 `@import` + 3 行模板即可获得完整头部 |
| **维护性** | 修改返回按钮大小/间距/字号，不必逐个文件改 |

---

## 三、迁移建议

### 3.1 可直接迁移的页面（27 个标准 PNG 模式）

以下页面头部结构与 header-demo 完全一致，迁移成本最低：

add-course、activation、backup-restore、black-screen-check、bs-demo1~5、chinese-input、custom-content-edit、device-info、donate、homepage-settings、pinned-pages、qrcode-generator、reset-data、schedule-manager、schedule-qrcode、statistics、template-picker、test-area、test-area-v2、vibration-lab、vibration-lab-v2、settings

### 3.2 需要调整的页面（5 个带右侧按钮）

| 页面 | 右侧按钮 | 建议 |
|------|----------|------|
| **course-manager** | `+ 添加` | 移到页面内容区顶部或底部浮动按钮 |
| **course-manager-v2** | `+ 添加` | 移到页面内容区顶部 |
| **countdown-manage** | `+ 添加` | 移到列表上方或底部 |
| **detail** (编辑课程) | 垃圾桶删除 | 移到表单底部 |
| **lab-edit-course** | 垃圾桶删除 | 移到页面底部 |

#### 为什么右侧按钮应该下移？

胶囊屏幕宽度仅约 **200-250px**，头部一行放「返回按钮 + 标题 + 操作按钮」三项非常拥挤。标题文字会被挤压甚至截断。

```
胶囊屏（~220px 宽）：
┌──────────────────────┐
│ ◀  编辑课程(胶囊)  🗑 │  ← 标题只剩 ~100px 宽度
│                      │
│   表单内容...         │
└──────────────────────┘

建议改法：
┌──────────────────────┐
│ ◀   编辑课程(胶囊)    │  ← 标题有 ~160px 宽度
│                      │
│   表单内容...         │
│         [🗑 删除]     │  ← 按钮移到页面底部
└──────────────────────┘
```

### 3.3 无需迁移的页面

| 页面 | 原因 |
|------|------|
| **week-view** | 自定义类名 `wv-*`，总课表有独立复杂布局 |
| **capsule-hide-test** | 测试页面，故意不用标准头部 |

---

## 四、统一后的 common/header.css 扩展建议

当前 `common/header.css` 只定义了 `.header`、`.header-title`、`.header-placeholder`。为了覆盖 27 个标准页面，建议扩展为：

```css
/* 已有 */
.header { flex-direction: row; align-items: center; height: 40px; margin-bottom: 10px; }
.header-title { flex: 1; font-size: 26px; font-weight: bold; text-align: center; ... }
.header-placeholder { width: 40px; height: 30px; flex-shrink: 0; }

/* 新增：返回按钮 */
.back-btn-wrapper { width: 48px; height: 40px; border-radius: 8px; justify-content: center; align-items: center; }
.back-btn-icon { width: 24px; height: 24px; }

/* @media (shape: capsule) { ... } */
/* @media (shape: circle) { ... } */
/* @media (shape: rect) { ... } */
```

---

## 五、迁移步骤建议

1. **扩展 `common/header.css`**：加入 `back-btn-wrapper`、`back-btn-icon` 及三档 `@media` 适配
2. **迁移一个页面验证**：先迁移一个简单页面（如 device-info），确认编译通过
3. **批量迁移 27 个标准页面**：模板改为共享结构，删除重复 CSS
4. **处理 5 个带右侧按钮的页面**：将按钮移到页面内容区，头部统一
5. **week-view 长期可考虑统一**，但优先级低于上面

---

## 六、收益预估

| 指标 | 当前 | 统一后 |
|------|------|--------|
| 头部相关 CSS 分散文件数 | 29 个文件 | 1 个公共文件 |
| 每页头部 CSS 行数 | ~90 行 | 1 行 `@import` |
| 重复 CSS 总行数 | ~2430 行 | 0 |
| 新增页面头部开发成本 | 复制粘贴 + 调样式 | `@import` + 3 行模板 |
| 屏型适配一致性 | 各页独立维护，易遗漏 | 公共文件一次覆盖 |