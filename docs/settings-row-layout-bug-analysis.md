# 设置页"周课表""工具"区域拥挤在一行的根因分析

## 故障现象

设置页的"周课表"和"工具"手风琴展开后，里面的多个栏目（如隐藏周末 + 模版选择；设备信息 + 震动自定义 + 震动自定义V2）全部拥挤在同一行，无法垂直排列，文字被挤压看不清。

## 根因：`if` 指令包裹的 `<div>` 默认 `flex-direction: row`

Vela 框架中所有 `<div>` 都是 flex 容器，默认值 `flex-direction: row`（水平排列）。

```html
<!-- 当前代码：if 的 wrapper div 没有设置 flex-direction -->
<div class="group" style="background-color: {{ theme.card }}">  <!-- flex-direction: column ✅ -->
  <div class="group-title-row" onclick="toggleSchedule">周课表</div>
  <div if="{{ showSchedule }}">                                    <!-- flex-direction: row ❌ 默认值！ -->
    <div class="row">隐藏周末</div>                                <!-- 子元素2 -->
    <div class="divider"></div>                                   <!-- 子元素3 -->
    <div class="row">模版选择</div>                                <!-- 子元素4 -->
  </div>
</div>
```

**关键机制**：

1. 外层 `.group` 设置了 `flex-direction: column`，所以它的子元素（标题行 + `if` 包装 div）是**垂直**排列 ✅
2. 但 `if` 包装的 `<div>` **没有设置** `flex-direction: column`，在 Vela 中默认 `flex-direction: row`
3. 所以 `if` 内部的 `.row` `.divider` `.row` 全部**水平排列**在一行 ❌

## 为什么"改了几次还是不能多行显示"

| 尝试过的方案 | 为什么无效 |
|-------------|-----------|
| 给 `.row` 加 `width: 100%` | `.row` 已经是 100% 宽度，问题不在它身上 |
| 给 `.group` 加 `flex-wrap: wrap` | Vela **不支持** `flex-wrap`，CSS 解析直接失败 |
| 调整 `.row-label` 的 `flex-shrink` | 只能改善单行内溢出，不能解决**多行排列** |
| 在 `@media` 里覆写 `.row` | `.row` 自身的 `flex-direction` 是对的，问题在上层 wrapper |
| 隐藏 `.row-hint`（`display: none`） | 治标不治本，减少内容宽度但不能改变排列方向 |

**真正的解决方法只有一个**：给 `if` 包装 div 加上 `flex-direction: column`。

## 工具区域一模一样的 bug

```html
<div if="{{ showTools }}">  <!-- 同样是默认 flex-direction: row ❌ -->
  <div class="row">设备信息</div>
  <div class="divider"></div>
  <div class="row">震动自定义</div>
  <div class="divider"></div>
  <div class="row">震动自定义 V2</div>
</div>
```

## 修复方案

给所有 `if` 包装 div 加内联样式：

```html
<div if="{{ showSchedule }}" style="flex-direction: column">
```

## Vela 框架通用规则

**任何用作垂直容器的 `<div>` 都必须显式设置 `flex-direction: column`**，不能依赖 Vela 的默认值。默认值是 `row`，这是 Vela 的核心假设。