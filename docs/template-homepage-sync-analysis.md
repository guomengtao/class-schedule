# Template-首页同步问题分析

## 问题描述

在设置页的「周课表→模版选择」中修改模板后，返回首页，首页的课程列表样式没有同步更新。

## 架构澄清

首先需要明确两个独立的模板系统：

### 周课表模板（已存在）
- **文件**：`template-picker.ux` + `week-view.ux`
- **模板数**：5 套
- **用途**：控制周网格视图的渲染样式（格子大小、名称缩写、教室显示等）
- **存储 key**：`weekview_template`
- **适用场景**：小网格空间有限，需要缩写、隐藏信息来适配

### 首页模板（规划中，尚未实现）
- **模板数**：10 套（用户规划）
- **用途**：控制首页纵向课程列表的展示样式（卡片布局、颜色、信息密度等）
- **存储 key**：暂无（应使用独立 key，如 `homepage_template`）
- **适用场景**：纵向列表空间充足，可展示完整信息

> **这两个系统是完全独立的，不应共用存储 key 或模板配置。**

## 已做的修复——存在设计错误

### 做了什么

在 `class-list.js` 中：
1. 定义了 `TEMPLATE_CONFIGS`（5 条，镜像周课表）
2. 在 `init()` 中读取 `weekview_template` 来设置 `_templateShowRoom`
3. 新增 `reloadTemplate()` 方法，在 `onShow` 中重新读取 `weekview_template`
4. 在 `loadDayClasses()` 中根据 `_templateShowRoom` 控制地点显示

在 `index.ux` 的 `onShow()` 中：
1. 调用 `self.reloadTemplate()`

### 错误所在

**首页课程列表不应读取 `weekview_template`**。这是一个架构耦合错误：

```
weekview_template（周课表设置）
    ↓
class-list.js（首页模块）← 错误！不应读取周课表的设置
```

## 冲突分析

### 冲突 1：存储 key 冲突

当前代码用 `weekview_template` 控制首页显示。未来实现首页 10 套模板时，必然要用独立的存储 key（如 `homepage_template`）。届时两个 key 同时存在：

| 设置 | 存储 key | 作用范围 |
|------|----------|---------|
| 周课表模板 | `weekview_template` | 周视图网格 |
| 首页模板 | `homepage_template`（未来） | 首页纵向列表 |

如果现在不修正，未来会出现：
- 用户改了周课表模板 → 首页也变了（错误耦合）
- 用户想单独设首页模板 → 发现没有独立入口
- 两个 key 同时存在时，首页不知道自己该读哪个

### 冲突 2：模板数量不匹配

| 系统 | 模板数量 | 用途 |
|------|---------|------|
| 周课表 | 5 | 网格缩写适配 |
| 首页 | 10（规划） | 卡片布局样式 |

当前 `TEMPLATE_CONFIGS` 只定义了 5 条，远不够 10 套。即使扩展到 10 条，也不应该和周课表模板共用同一个配置值。

### 冲突 3：配置语义不匹配

周课表的 `nameDisplay` 字段设计用于网格缩写：
- `char`：只取第一个汉字（适合窄格）
- `en-abbr`：取前 3 个字符

首页是纵向列表，有充足宽度显示完整课名。用 `char` 反而丢失信息。首页模板应该控制的是：

```
首页模板 → 应该控制的维度（示例）：
  - cardStyle: "rounded" | "flat" | "outline"
  - colorMode: "subject" | "uniform" | "pastel"
  - showTime: true/false
  - showLocation: true/false
  - showTeacher: true/false
  - compactMode: true/false
  - borderStyle: "full" | "bottom" | "none"
  ...

周课表模板 → 应该控制的维度：
  - showRoom: true/false
  - showTeacher: true/false
  - subjectDisplay: "full" | "char" | "en-abbr"
  - blockStyle: "rounded" | "square" | "pill"
  - colorScheme: "subject" | "pastel" | "gradient"
  - dayLabel: "en" | "cn-num"
  ...
```

两者虽然有几项看起来相似（如 `showRoom`），但语义和适用场景完全不同。

### 冲突 4：异步竞态仍然存在

即使不考虑设计错误，当前实现本身也有 bug：

`onShow` 中 `reloadTemplate()` 和 `loadScheduleData()` 都是异步操作，执行顺序不可控：

```
时序 A：reloadTemplate 先回调
  reloadTemplate 回调 → _templateShowRoom 更新 → loadDayClasses（schedule 可能未就绪 → 空列表）
  loadScheduleData 回调 → schedule 更新 → loadDayClasses（模板值正确 ✅）

时序 B：loadScheduleData 先回调
  loadScheduleData 回调 → schedule 更新 → loadDayClasses（模板值旧 ❌）
  reloadTemplate 回调 → _templateShowRoom 更新 → loadDayClasses（模板值正确 ✅）
```

时序 B 中用户会先看到旧样式再闪一下变新样式，且回调中缺少 `$forceUpdate`。

## 当前 `class-list.js` 中 TEMPLATE_CONFIGS 的误导

```js
var TEMPLATE_CONFIGS = {
  "minimal-char":   { showRoom: false, showTeacher: false, nameDisplay: "full" },
  "minimal-en":     { showRoom: false, showTeacher: false, nameDisplay: "en-abbr" },
  "standard-block": { showRoom: true,  showTeacher: false, nameDisplay: "full" },
  "compact-grid":   { showRoom: false, showTeacher: false, nameDisplay: "full" },
  "color-pastel":   { showRoom: true,  showTeacher: false, nameDisplay: "full" }
}
```

这段代码做了两件错事：
1. 与周课表共用 `TEMPLATE_CONFIGS` 概念，但首页和周课表不应共享配置
2. `nameDisplay: "en-abbr"` 在纵向列表中没有意义——列表完全放得下完整英文名

## 正确方案

### 短期（立即修正）

1. **删除** `class-list.js` 中的 `TEMPLATE_CONFIGS`、`reloadTemplate()`、以及 `init()` 中读取 `weekview_template` 的逻辑
2. **删除** `index.ux` 的 `onShow()` 中调用 `self.reloadTemplate()` 的代码
3. 首页课程列表恢复为始终显示完整信息（名称+时间+地点+教师），不依赖任何模板设置

### 中期（实现首页模板）

1. 在 `store.js` 中新增 `homepage_template` 的读写方法
2. 创建独立的首页模板选择页（类似 `template-picker.ux`），提供 10 套模板
3. 在设置页「首页设置」中增加「课程卡片样式」入口
4. `class-list.js` 读取 `homepage_template`，而非 `weekview_template`

## 总结

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| 错误耦合 weekview_template | 🔴 高 | 首页不应读取周课表的模板设置 |
| 模板数量不匹配 | 🔴 高 | 首页需要 10 套，当前只有 5 套 |
| 语义不匹配 | 🟡 中 | nameDisplay 缩写不适用于纵向列表 |
| 异步竞态未解决 | 🟡 中 | 两个异步操作的时序不可控 |
| 缺少 $forceUpdate | 🟢 低 | 回调中未强制刷新 UI |

**结论：当前实现存在设计上的耦合错误，不应继续修，应回退后按正确架构重新设计。**