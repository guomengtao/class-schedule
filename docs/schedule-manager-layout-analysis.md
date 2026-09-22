# 课程表管理页面 - 界面布局分析

## 页面文件

[schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux)

## 页面结构

```
┌─────────────────────────────┐
│ ◀  课程表管理               │  ← back-header
├─────────────────────────────┤
│ [输入新名称] [保存] [取消]   │  ← rename-bar (editingIndex >= 0 时显示)
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 课程表1         使用中   │ │  ← item-left (padding-bottom: 24px)
│ │ ─────────────────────── │ │  ← border-bottom
│ │ 重命名 复制 总览 删除    │ │  ← item-right (padding-top: 24px)
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 课程表2                  │ │
│ │ ─────────────────────── │ │
│ │ 重命名 复制 总览 删除    │ │
│ └─────────────────────────┘ │
│ ...                         │
├─────────────────────────────┤
│ [+ 新增课程表]              │  ← add-section
└─────────────────────────────┘
```

---

## 问题分析

### 问题 1：列表不可滚动（核心问题）

**现状**：

```html
<div class="schedule-list">
  <div for="{{ scheduleList }}" class="schedule-item">...</div>
</div>
```

```css
.schedule-list {
  flex: 1;
  flex-direction: column;
}
```

**问题**：`schedule-list` 是一个普通 `<div>`，不是 `<scroll>` 组件。当课程表数量超过 3 个时，列表内容会溢出屏幕底部，超出的部分**无法滚动查看**。

此外，`add-section`（新增按钮）在 `schedule-list` 后面，当列表溢出时，"新增课程表"按钮也会被挤出屏幕，用户可能找不到它。

**影响**：课程表数量 ≥ 3 时，最后一项和新增按钮不可见。

---

### 问题 2：每个卡片占用空间过大

**现状**：

```css
.schedule-item {
  padding: 40px 30px;     /* 上下各 40px */
  margin-bottom: 20px;    /* 间距 20px */
}

.item-left {
  padding-bottom: 24px;   /* 名称区域底部内边距 */
}

.item-right {
  padding-top: 24px;      /* 操作区域顶部内边距 */
}
```

**计算单个卡片高度**：
- `padding-top`: 40px
- 名称行高（schedule-name 28px + badge 16px 对齐）: ≈ 36px
- `item-left padding-bottom`: 24px
- border-bottom: 1px
- `item-right padding-top`: 24px
- 链接行高（link 22px）: ≈ 30px
- `padding-bottom`: 40px
- `margin-bottom`: 20px
- **合计 ≈ 215px**

在一个 454px 高的手表屏幕上，扣除 header（≈60px）和 add-section（≈60px），剩余可用空间约 334px。**只能显示 1.5 个卡片**，第 2 个就会被截断。

**影响**：空间利用率极低，大量空白浪费在 padding 上。

---

### 问题 3：rename-bar 出现时挤压列表

当用户点击"重命名"时，`rename-bar` 出现在列表上方：

```css
.rename-bar {
  margin-bottom: 12px;
  padding: 8px 12px;
}
```

这个重命名栏占用了约 60px 的额外高度，进一步压缩了列表的可用空间。原本就显示不全的列表，加上 rename-bar 后更加拥挤。

**影响**：重命名时，列表几乎完全被遮挡，用户看不到正在编辑的课程表。

---

### 问题 4：操作链接字号过大

```css
.link {
  font-size: 22px;
  margin-right: 30px;
}
```

4 个操作链接（重命名、复制、总览、删除）总宽度约 22px × 4字 × 4个 + 30px × 3间距 ≈ 400px。在手表屏幕宽度（约 454px）下，刚好能放下，但没有任何余量。如果课程表名较长，或者 watch 屏幕更窄，链接会换行，导致布局混乱。

**影响**：操作链接可能换行，视觉上显得拥挤。

---

### 问题 5：页面容器使用 min-height 而非 height

```css
.manager-page {
  min-height: 100%;
}
```

`min-height: 100%` 意味着页面至少和屏幕一样高，但内容少时不会撑满。这本身不是主要问题，但结合 `schedule-list` 的 `flex: 1`，会导致列表区域在内容少时也占满剩余空间，视觉上不协调。

---

## 修复方案

### 方案 A：添加 scroll 包裹 + 压缩间距（推荐）

**核心思路**：让列表可滚动，同时压缩卡片内部间距，提高空间利用率。

#### 模板改动

```diff
- <div class="schedule-list">
+ <scroll class="schedule-list-scroll" scroll-y="{{true}}">
    <div for="{{ scheduleList }}" class="schedule-item ...">
      ...
    </div>
- </div>
+ </scroll>
```

#### CSS 改动

```css
/* 新增：scroll 包裹层 */
.schedule-list-scroll {
  flex: 1;
  flex-direction: column;
}

/* 压缩卡片内边距 */
.schedule-item {
  padding: 16px 20px;       /* 40px → 16px, 30px → 20px */
  margin-bottom: 10px;      /* 20px → 10px */
}

/* 压缩名称区域 */
.item-left {
  padding-bottom: 12px;     /* 24px → 12px */
}

/* 压缩操作区域 */
.item-right {
  padding-top: 12px;        /* 24px → 12px */
}

/* 缩小操作链接字号 */
.link {
  font-size: 18px;          /* 22px → 18px */
  margin-right: 18px;       /* 30px → 18px */
}
```

#### 效果预估

单个卡片高度从 ~215px 降到 ~120px，在 454px 屏幕上可显示 **3-4 个卡片**，超出部分可滚动。

---

### 方案 B：rename-bar 改为浮动覆盖层

**核心思路**：rename-bar 不占用列表空间，改为浮动覆盖在列表上方。

```css
.rename-bar {
  position: absolute;
  top: 56px;                /* 覆盖在 header 下方 */
  left: 12px;
  right: 12px;
  z-index: 10;
  ...
}
```

这样重命名时不会挤压列表，用户仍能看到并操作下方的课程表列表。

**注意**：QuickApp 中 `position: absolute` 支持情况需要验证。

---

### 方案 C：去掉 item-left 与 item-right 的分隔线

**核心思路**：将名称和操作链接放在同一个区域，去掉 border-bottom 分隔。

```html
<div class="schedule-item">
  <div class="item-row">
    <text class="schedule-name">课程表1</text>
    <text class="badge">使用中</text>
  </div>
  <div class="item-row">
    <text class="link">重命名</text>
    <text class="link">复制</text>
    <text class="link">总览</text>
    <text class="link">删除</text>
  </div>
</div>
```

去掉 `item-left` 和 `item-right` 的 padding，统一用 `schedule-item` 的 padding 控制间距。这样更紧凑，也减少了嵌套层级。

---

## 推荐实施顺序

| 优先级 | 方案 | 改动量 | 效果 |
|--------|------|--------|------|
| 1 | 方案 A：添加 scroll + 压缩间距 | 模板 1 处 + CSS 6 处 | 解决核心滚动问题，空间利用率提升 40% |
| 2 | 方案 C：去掉分隔区域 | 模板重组 + CSS 简化 | 结构更简洁，进一步节省空间 |
| 3 | 方案 B：rename-bar 浮动 | CSS 3 处 | 重命名时不遮挡列表 |

**建议优先实施方案 A**，改动最小，效果最直接。方案 C 和 B 可根据实际效果选择性实施。

---

## 修改涉及文件

| 文件 | 改动内容 |
|------|---------|
| [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux) | 模板 + CSS |

## 不改动

| 部分 | 原因 |
|------|------|
| 脚本逻辑 | 无布局问题，功能正常 |
| back-header | 布局正常 |
| add-section | 布局正常，新增按钮在 scroll 外固定显示 |