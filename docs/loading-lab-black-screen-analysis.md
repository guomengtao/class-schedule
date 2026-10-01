# 加载动画实验室黑屏问题分析

> 所属模块：`src/pages/loading-lab/loading-lab.ux`
> 结论：**该页存在两个全仓唯一的高危写法，是黑屏的根源**；已改为纯 CSS `@keyframes` 动画修复。

---

## 一、现象

进入「加载动画」实验页后整页黑屏 / 卡死，无法看到内容。

## 二、根因

对比整个代码仓库后发现，本页恰好把**两个其它页面都不用的高风险写法**凑在了一起：

### 1. JS `setInterval` + 逐帧重建数据的重渲染风暴

本页用 `setInterval(..., 40)`（25fps）在 JS 里逐帧重建 9 个动画数组
（`dots / bars / ripples / ticks / typing / dnaF / dnaB / clock / grid`），
每次 set 新数组都会触发对应 `for` 列表的**整树重渲染**，同时还要驱动 12 个演示。

- 手环 UI 线程资源有限，25 帧/秒 × 9 组列表的全量 DOM/样式刷新必然把 UI 线程**饿死**。
- 表现就是整页渲染失败、黑屏、无响应。

### 2. `transform: translateX(...) translateY(...)` 内联逐帧绑定

`Grep` 全仓 `*.ux` 后确认：**只有本页**把 `transform` 当作数据用 `{{ }}` 逐帧绑定到
inline style（其余页面要么不用 transform，要么用静态 CSS）。这是不被本项目运行时验证过的
高风险 / 不可靠用法，很可能在原生侧解析绑定样式时失败。

## 三、一个被推翻的误区

本页底部脚注写「**快应用无 CSS keyframes，本页由定时器驱动 transform/opacity 模拟**」——**这是错的**。

仓库里已经上线、且正在正常使用的页面，一直就用 CSS `@keyframes`：

| 页面 | 用法 |
|------|------|
| `src/pages/reset-data/reset-data.ux` | `.action-btn.danger { animation-name: pulse; ... }` + `@keyframes pulse` |
| `src/pages/chinese-input/chinese-input.ux` | `.cursor { animation-name: blink; ... }` + `@keyframes blink` |

也就是说项目**本来就有被验证过的 `@keyframes` 动画机制**，本页却弃之不用、自创 JS 逐帧轰炸，
属于「绕开安全机制，引入高危写法」。

## 四、修复方案

将全部 12 种动画改为**纯 CSS `@keyframes` 动画**：

- 动画交给原生渲染器驱动，**不再有 JS 逐帧重渲染**，彻底消除 UI 线程饿死导致的黑屏。
- 只使用 `transform`（`rotate / scale / translate`）与 `opacity` 两类属性；
  即使个别 `transform` 动画不被旧运行时识别，最多退化为静态图形，**也不会再出现整页黑屏**。
- 删除 `start / stop / togglePlay / tick / buildStatics` 及全部动画私有状态，
  只保留主题加载与返回逻辑。

## 五、验证清单

- [ ] 进入「加载动画」不再黑屏，12 个演示均有内容
- [ ] 4 种形状（capsule/circle/rect/pill）均正常
- [ ] 主题切换后 accent / text / borderLight 颜色仍在动画中生效