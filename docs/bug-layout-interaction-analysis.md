# 首页 & 课程总览页布局混乱 - 深度分析

## 问题描述

1. 首页（schedule-page）和课程总览页（week-view-page）宽度异常
2. 两个页面"互相影响"——每个页面各占一部分宽度，感觉像两个页面同时显示
3. 课程总览页的格子布局（grid）被压缩，无法正常显示

## 根因：外层无 `show` 属性的 `<div>` 始终占用布局空间

### 模板结构问题

当前模板结构（[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) 第 1-135 行）：

```
<template>
  <div>                                    ← 行2: 无 show 属性，始终渲染！
    <div class="schedule-page"             ← 行3: show="{{ !showWeekView }}"
         show="{{ !showWeekView }}">
      ... 首页内容 ...
    </div>                                 ← 行94: 闭合 schedule-page
  </div>                                   ← 行95: 闭合外层包装 div

  <div class="week-view-page"              ← 行97: show="{{ showWeekView }}"
       show="{{ showWeekView }}">
    ... 课程总览内容 ...
  </div>                                   ← 行130: 闭合 week-view-page
</template>
```

### 为什么两个页面"交互"？

`<template>` 根节点下有两个子元素：

| 子元素 | 位置 | show 属性 | 状态 |
|--------|------|-----------|------|
| 外层包装 `<div>` | 行2-95 | 无 | **始终渲染** |
| `week-view-page` | 行97-130 | `show="{{ showWeekView }}"` | 条件渲染 |

**关键问题**：外层包装 `<div>`（行2）没有 `show` 属性，无论 `showWeekView` 是 true 还是 false，它都始终存在于 DOM 中并占用布局空间。

QuickApp 框架中 `<template>` 的直接子元素按默认 `flex-direction: row`（水平排列）布局。当 `showWeekView = true` 时：

```
┌──────────────────────────────────────────────────────┐
│  <template> (flex row)                               │
│  ┌─────────────────┐  ┌───────────────────────────┐  │
│  │ 外层包装 div     │  │ week-view-page (显示)     │  │
│  │ (始终存在)       │  │                           │  │
│  │ schedule-page   │  │ 课程总览 grid             │  │
│  │ (被 show 隐藏)   │  │ 被压缩到剩余宽度           │  │
│  └─────────────────┘  └───────────────────────────┘  │
│       ↑ 占据宽度          ↑ 占据剩余宽度              │
└──────────────────────────────────────────────────────┘
```

### 首页宽度异常的原因

当 `showWeekView = false` 时，`week-view-page` 被隐藏，但外层包装 `<div>` 仍然存在：

```
┌──────────────────────────────────────────────────────┐
│  <template> (flex row)                               │
│  ┌──────────────────────────────────────────────┐     │
│  │ 外层包装 div (始终存在)                       │     │
│  │ schedule-page (显示)                         │     │
│  │ 宽度受父容器影响，父容器是 flex item          │     │
│  └──────────────────────────────────────────────┘     │
│  week-view-page (隐藏)                                │
└──────────────────────────────────────────────────────┘
```

由于外层包装 `<div>` 是 `<template>` 的 flex item，它的宽度由 flex 布局决定，而不是 100%。这导致 `schedule-page` 的 `min-height: 100%` / `height: 100%` 计算基准是外层包装 div 而非页面根节点。

### 课程总览页宽度异常的原因

当 `showWeekView = true` 时：

1. 外层包装 `<div>` 作为 flex item 占据一部分宽度（即使内容被隐藏，容器本身不一定塌缩）
2. `week-view-page` 作为另一个 flex item 占据剩余宽度
3. `week-view-page` 内部的 grid 布局依赖 `flex: 1` 和百分比宽度，在压缩的容器内无法正确展开

## 修复方案

**删除外层包装 `<div>`**，让 `schedule-page` 和 `week-view-page` 成为 `<template>` 的直接子元素，各自独立控制显隐：

```
<template>
  <div class="schedule-page" show="{{ !showWeekView }}"
       style="background-color: {{ theme.bg }}">
    <div class="upper-half">...</div>
    <div class="lower-half">...</div>
  </div>

  <div class="week-view-page" show="{{ showWeekView }}"
       style="background-color: {{ theme.bg }}">
    ... 课程总览内容 ...
  </div>
</template>
```

**修复后效果**：
- `showWeekView = false`：只有 `schedule-page` 渲染，占满整个页面宽度
- `showWeekView = true`：只有 `week-view-page` 渲染，占满整个页面宽度
- 两个页面完全独立，不会互相影响

## 标签配对验证

修复前：
```
<template>          ← 开
  <div>             ← 开 (外层包装，无 show)
    <div>           ← 开 (schedule-page)
      ...           ← 内容
    </div>          ← 合 (schedule-page)
  </div>            ← 合 (外层包装)
  <div>             ← 开 (week-view-page)
    ...             ← 内容
  </div>            ← 合 (week-view-page)
</template>         ← 合
```

修复后：
```
<template>          ← 开
  <div>             ← 开 (schedule-page, show)
    ...             ← 内容
  </div>            ← 合 (schedule-page)
  <div>             ← 开 (week-view-page, show)
    ...             ← 内容
  </div>            ← 合 (week-view-page)
</template>         ← 合
```