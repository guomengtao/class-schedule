# 课程表管理页面：点击行为与三点小点显示问题分析

> **相关文件**：[schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux)

---

## 一、问题描述

### 问题 1：圆圈和课程名点击都打开弹窗

在「课程表管理」页面，每条课程表行前面有一个圆圈（`indicator`），点击课程名称会弹出一个操作弹窗（sheet）。用户观察到**点击圆圈也会打开同样的弹窗**，行为和点击名称一致。

### 问题 2：九跑道屏幕上三点小点意外显示

本页面每条课程表行右侧有一个「三个小点」的菜单按钮（`more-hit`），用于打开同样的操作弹窗。在九跑道（胶囊屏，192px 宽）上，这个三点按钮**依然显示**，占用了本已紧张的屏幕空间。

---

## 二、代码分析

### 2.1 模板结构

当前模板中每条课程表行的 DOM 结构如下（[schedule-manager.ux:L20-L30](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L20-L30)）：

```html
<div for="{{ list }}" class="item" style="background-color: {{ theme.card }}">
  <!-- ① 圆圈指示器：无 onclick -->
  <div class="indicator"
       style="background-color: {{ $idx === currentIndex ? theme.accent : 'transparent' }};
              border-color: {{ $idx === currentIndex ? theme.accent : theme.textMuted }}"></div>
  <!-- ② 课程名文字：有 onclick="openSheet($idx)" -->
  <text class="name" onclick="openSheet($idx)"
        style="color: {{ $idx === currentIndex ? theme.accent : theme.text }};
               font-weight: {{ $idx === currentIndex ? 'bold' : 'normal' }}">{{ $item.name }}</text>
  <!-- ③ 三个小点：有 onclick="openSheet($idx)" -->
  <div class="more-hit" onclick="openSheet($idx)">
    <div class="more-dot" style="background-color: {{ theme.textMuted }}"></div>
    <div class="more-dot" style="background-color: {{ theme.textMuted }}"></div>
    <div class="more-dot" style="background-color: {{ theme.textMuted }}"></div>
  </div>
</div>
```

| 元素 | CSS 类 | 是否有 `onclick` |
|------|--------|:----------------:|
| 圆圈 | `.indicator` | **无** |
| 文字 | `.name` | `openSheet($idx)` |
| 三点 | `.more-hit` | `openSheet($idx)` |

### 2.2 各部分样式

**默认样式**（[schedule-manager.ux:L763-L799](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L763-L799)）：

```css
.indicator {
  width: 16px; height: 16px;
  border-radius: 8px;
  border-width: 2px;
  margin-right: 12px;
}

.name {
  flex: 1;
  font-size: 24px;
  lines: 1;
  text-overflow: ellipsis;
}

.more-hit {
  width: 56px; height: 60px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.more-dot {
  width: 6px; height: 6px;
  border-radius: 3px;
  margin: 3px 0;
}
```

### 2.3 胶囊屏（九跑道）媒体查询

**关键发现**：胶囊屏的媒体查询**没有隐藏三点小点**，只是调整了尺寸（[schedule-manager.ux:L1068-L1086](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux#L1068-L1086)）：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .more-hit {
    /* 注意：没有 display: none ！ */
    width: 60px;
    height: 64px;
  }

  .more-dot {
    width: 6px;
    height: 6px;
    border-radius: 3px;
    margin: 3.5px 0;
  }
}
```

---

## 三、根因分析

### 问题 1 根因：圆圈为何也打开弹窗

从代码层面看，`.indicator` **没有** `onclick` 处理函数，理论上点击圆圈不应该打开弹窗。但实际观察到点击圆圈也打开了弹窗，可能原因：

1. **触摸事件冒泡**：Quick App 框架中，触摸事件可能向上冒泡到父级（`.item`）或其他元素，但 `.item` 也没有 `onclick`，所以此可能性较低。
2. **点击区域重叠**：圆圈（16px）和课程名文字紧邻，在窄屏幕上手指点击圆圈时，触摸区域可能同时命中了旁边的文字区域，导致触发了文字的 `openSheet`。
3. **框架默认行为**：部分快应用框架中，如果子元素无点击处理，点击事件可能被同级可点击元素捕获。

**结论**：圆圈**没有**被设计为可点击元素，它只是一个视觉状态指示器（当前课程表高亮）。如果希望圆圈也可点击打开弹窗，需要显式添加 `onclick="openSheet($idx)"`。

### 问题 2 根因：三点小点为何在胶囊屏显示

三点小点在所有屏幕形状上都**默认显示**。胶囊屏的媒体查询中：

- 圆圈屏（`circle`）调整了尺寸（52px → 适合圆屏）
- 胶囊屏（`capsule`/`pill-shaped`）也调整了尺寸（60px → 给窄屏留更多点击区域）
- **没有在任何屏幕形状下隐藏三点小点**

设计意图上，三点小点是**辅助点击区域**——在课程名文字较长时，用户也可以点击右侧的三点来打开操作弹窗。但在九跑道（192px 宽）这种极窄屏幕上，三点占用了 60px 宽度，挤压了课程名文字的空间：

```
[192px 屏幕宽度]
├── padding-left: ~14px
├── indicator: 16px
├── margin: 12px
├── name: flex(1) → 剩余约 90px
├── more-hit: 60px
└── padding-right: ~2px
```

课程名只有约 **90px** 可用，对于 24px 字号来说大约只能容纳 3-4 个汉字。

---

## 四、可能的修复方案

### 方案 A：胶囊屏隐藏三点小点

在胶囊屏媒体查询中添加 `display: none`：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .more-hit {
    display: none;
  }
}
```

**优点**：释放 60px 宽度给课程名文字。  
**缺点**：用户少了一个点击入口（只能点文字），且文字较长时可能被截断（`text-overflow: ellipsis`）。

### 方案 B：保持三点显示，缩小尺寸

将胶囊屏下的三点尺寸减小：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .more-hit {
    width: 36px;  /* 原来是 60px */
    height: 64px;
  }
  .more-dot {
    width: 4px;
    height: 4px;
    margin: 2px 0;
  }
}
```

**优点**：保留点击入口，减少空间占用。  
**缺点**：36px 三点区域仍然占用空间，且小点可能难以点击。

### 方案 C：让圆圈也可点击

在模板中给 `.indicator` 添加点击事件：

```html
<div class="indicator" onclick="openSheet($idx)"
     style="..."></div>
```

**优点**：增加点击目标区域，让圆圈不再只是视觉装饰。  
**缺点**：圆圈 16px 较小，仍可能难以精确点击；且改变了当前设计语义（指示器 vs 按钮）。

> ⛔ **2026-09-27 追记：方案 C 已否决，勿再采用。**
> 给 `.indicator` 补 `onclick` 后，行内出现两个 `onclick`（`.indicator` + `.name`），Vela 会**吞掉点击** → 手环 9 真机点课程名打不开弹窗。
> 且「问题 1（点圆圈也能开弹窗）」的根因判断本身是错的：那一版圆圈**没有** `onclick`，是**行级命中**把点击算给了行内唯一的处理器。
> 正确做法见：[课程表管理页点击标题打不开编辑弹窗分析.md](课程表管理页点击标题打不开编辑弹窗分析.md)（onclick 只放整行容器 `.item`）。

---

## 五、总结

| 问题 | 现状 | 推荐处理 |
|------|------|----------|
| 圆圈点击打开弹窗 | 圆圈无 `onclick`，但实际可能因触摸区域重叠而触发文字点击 | 如需此功能，显式添加 `onclick` |
| 胶囊屏三点显示 | 三点在所有屏幕上都显示，胶囊屏只调整尺寸未隐藏 | **方案 A**：添加 `display: none` 隐藏三点 |

建议优先采用**方案 A**（胶囊屏隐藏三点），因为：
1. 课程名文字已经可点击打开弹窗，三点功能重复
2. 释放的 60px 给课程名文字，避免文字被截断
3. 符合「文本显示规则」中"禁止文字显示不全"的要求