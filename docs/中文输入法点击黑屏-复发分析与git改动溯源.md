# 中文输入法页面点击任意键黑屏 —— 复发分析与 git 改动溯源

> 日期：2026-10-19
> 范围：`src/pages/chinese-input/chinese-input.ux` + `src/components/InputMethod/InputMethod.ux`
> 仓库：`ev/class-schedule`（class-schedule.git）

---

## 一、现象

进入中文输入法页面，点击键盘上任意一个键，**页面直接黑屏**（或整个快应用重启）。不是偶发，是可复现。

---

## 二、git 改动者溯源

`InputMethod.ux` 最近 25 次提交全部为**同一人**：

| 开发者 | 邮箱 | 占比 |
|--------|------|------|
| **Tom** | `rinuo@qq.com` | 100%（25/25 次） |

无其他开发者改动过输入法页面或组件。**只有 Tom 一个人维护这套输入法代码**。

### 最近 5 次改动（全为 Tom）

| 提交 | 日期 | 说明 |
|------|------|------|
| `0f45018` | 10-02 | feat(class): 课程表多页面交互/样式修订 + 宽度检测新页 + 版本 1.7.6→1.7.9 |
| `e0bb780` | 09-29 | fix(input): 撤销对上游输入法组件的改动，改由宿主容器(div 替代 scroll)解决宽度塌缩 |
| `d64b1f0` | 09-29 | fix(layout): 震动实验室与输入法组件补显式宽度方向，修复 432 宽真机塌缩 |
| `2565d50` | 09-25 | feat(input): 正式启用上游最新版输入法(逐字节零改动) + 清理全部测试代码 |
| `005fffd` | 09-25 | fix(input): 回滚 keyboardHidden 错峰(hide=true 跳过词典初始化导致中文无候选) |

**关键结论**：`InputMethod.ux` 最后一次改动是 **2026-09-25**（`2565d50`，官方原版替换），距今已近一个月。如果目前再次出现黑屏，说明第三方改动（APK 层、CSS 全局规则、框架升级）可能是触发因素。

---

## 三、黑屏复发时间线（18 天内 10+ 次修复）

```
09-25  点进页面即重启 😱😱😱😱😱😱😱😱（一天 8 次提交，极简重写→官方原版A/B→dictlazy→screentype watcher）
       └ 最终收敛：0095fffd 回滚 keyboardHidden 错峰 + 2565d50 启用官方原版
09-29  宽度塌缩
10-02  最后一次 InputMethod.ux 改动（版本号升级）
10-03  @media screen and 导致手环9黑屏重启 → 修复 40 个页面
10-04  $element 滚动/测量导致黑屏重启 → 移除加载期 $element 调用
10-07  overlay 黑屏风险 → 定时器泄漏 + 页面栈堆积
10-09  绝对定位子元素缺 flex 上下文 → 整页黑屏
10-10  返回黑屏 → 改走 replace 到目录
10-12  设置页胶囊屏黑屏 → 四向 inset 填充
10-14  模拟器黑屏排查指南编写
10-18  中文输入黑屏复发已定位（claims 记录 "v0.5.179"）
10-19  ⚠️ 再次复发（本次）
```

**核心问题**：为什么同一个页面修了这么多次，黑屏还在复发？

---

## 四、根因分析：为什么会反复出现

### 4.1 架构层面：1000 行单体组件，六种屏幕形态塞一个文件

[InputMethod.ux](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/components/InputMethod/InputMethod.ux) 共 1000 行，**所有键盘布局塞在同一个 `<template>` 里**：

| 屏幕形态 | 代码区域 | 键盘布局 |
|----------|---------|---------|
| 圆形屏 62 | L38-L89 | full62 + sign62 + t9 |
| T9 矩形键盘 | L91-L163 | t9 + t9-rect |
| 横屏 full keyboard | L165-L252 | full + sign |
| 圆形屏 arc | L257-L330 | arc variant |
| 胶囊屏 pill-shaped | L331+ | pill variant |
| 矩形 rect | 共用 t9-rect | rect variant |

通过 `if="{{screentype==='xxx'}}"` 分支切换。看似干净，实际：

- **改一个屏的布局可能破坏另一个屏**的 layout context
- CSS `position:absolute` 在缺少 flex 父级时，子元素可能完全不渲染（「黑屏」= 只剩背景色）
- 每个分支的根节点定位方式不同（absolute / relative / 无），布局上下文依赖链复杂

### 4.2 黑屏三类根因（反复出现）

#### 类型 A：词典初始化太重，单帧渲染阻塞 → 看门狗杀进程

```
用户点击进入页面
  → onInit() 创建 dictionaryLoader
  → 组件首次挂载，字典文件同步读取
  → 超过单帧预算 → Vela 引擎看门狗复位 → 黑屏重启
```

**证据**：9-25 的 `975f2b0` 修复 "点进输入法页即重启"，方案是 `词典初始化分步分片 + 页面错峰展开`。但这是**治标**——分片只是降低概率，没有消除根因（同步 I/O 在主线程）。

#### 类型 B：CSS 布局上下文缺失 → 键盘渲染为 0 尺寸 → 页面只剩底色

```
<div class="ime-host">  ← 宿主容器缺少 flex-direction/height 或绝对定位上下文
  <input-method>
    position:absolute; bottom:0; width:100%;
    依赖宿主提供定位参考！
```

**证据**：
- 09-29: `e0bb780` "撤销对上游输入法组件的改动，改由宿主容器(div 替代 scroll)解决宽度塌缩"
- 10-09: `5668785` "根容器补 flex:1 + flex-direction:column"
- 10-12: `191820c` "设置页根容器绝对定位四向 inset 填充，修复胶囊屏内容压缩左上角黑屏"

**这都是同一种问题**：容器没有正确的定位上下文或 flex 布局 → 子元素（键盘）不显示 → 用户看到的「黑屏」其实是空 div 的黑色背景。

#### 类型 C：`@media screen and` CSS 规则触发 Vela 引擎 bug

**证据**：10-03 的 `cc181d0` "修复 40 个页面 `@media screen and` 导致手环 9 黑屏重启"。

这是 Vela 框架本身的 bug——某些 CSS 特性在手环低版本上会触发崩溃。但输入法组件因历史包袱，可能还残留了这类规则。

### 4.3 为什么修了又坏

```
修 A 屏黑屏 → 改了 container CSS
       ↓ 别的屏间接依赖了旧 container 行为
    B 屏黑屏 → 再改 container CSS
       ↓ 破坏了 A 屏刚修好的布局
    A 屏又黑了
```

**恶性循环**：1000 行单文件 + 6 种屏幕形态 + 无测试 → **任何改动都可能引入新 bug**。

---

## 五、改动者 git 详情

### InputMethod.ux 完整改动史（25 次提交，含 diff 规模估算）

```
2026-10-02 0f45018  feat(class): 多页面交互/样式修订（版本号升级，非核心改动）
2026-09-29 e0bb780  fix(input): 撤销改动，div 替代 scroll 解决宽度塌缩
2026-09-29 d64b1f0  fix(layout): 补显式宽度方向，修复 432 宽真机塌缩
────────────────── 正式上线官方原版 ──────────────────
2026-09-25 2565d50  feat(input): 正式启用上游最新版输入法(逐字节零改动)
2026-09-25 b3fa7ce  feat(input): 正式组件替换为官方原版
2026-09-25 9f8c968  fix(input): 删除本项目额外添加的 screentype watch(致崩点)
2026-09-25 a2ba5ff  feat(diag): 新增 G 项官方原版 A/B 对照组件
2026-09-25 aaa067d  fix(input): 胶囊屏根改普通流式定位(relative)
2026-09-25 d5e677e  revert: 退回胶囊屏键盘极简重写(影响面过大)
2026-09-25 582d8c6  fix(input): 胶囊屏键盘极简重写-去 PNG/描边圆角/绝对定位/嵌套 scroll
2026-09-25 faaff14  feat(diag): 新增输入法崩溃诊断页 dictlazy 隔离 UI 与词典
2026-09-25 975f2b0  fix(input): 修复跑道屏点进即重启-词典初始化分步分片
────────────────── 以上 1 天 8 次改动 ──────────────────
2026-09-22 698bbe1  revert: 移除展开更多箭头与下展面板
2026-09-22 253a7d9  refactor: 候选下展统一为 InputDownList
2026-09-22 ec7a749  docs: 中文输入法候选展开更多失效分析
2026-09-21 a6fdbc8  feat: add tools page
2026-09-20 d48b08f  Release v1.6.27
2026-09-14 69c99af  移除高级版页面顶部固定 header 栏
2026-09-14 29e6f1b  fix(ux): UX-15/18 InputMethod 修复
2026-09-12 793c6dc  fix(qa): 移除 3 个箭头函数
2026-09-11 cb94d64  chore: update files
2026-09-10 f549d31  feat: upgrade Vela input method to latest
2026-09-09 322e10a  release: v1.4.85
2026-09-04 9a1de10  修复 5 个编译错误
2026-09-01 5527b05  v1.3.121: 输入震动反馈
```

### chinese-input.ux 改动史

```
2026-09-30 799b052  空输入时光标置于占位提示词之前
2026-09-29 e0bb780  撤销改动，div 替代 scroll
2026-09-25 005fffd  回滚 keyboardHidden 错峰
2026-09-25 975f2b0  修复点进即重启
2026-09-22 698bbe1  移除展开更多箭头
2026-09-22 253a7d9  候选下展统一
2026-09-21 a6fdbc8  add tools page
```

---

## 六、建议

| 优先级 | 建议 | 理由 |
|--------|------|------|
| 🔴 P0 | 给输入法页补**冒烟测试**（进入页面→点击一个键→验证光标移动/候选出现/不黑屏） | 目前零测试，修完只能靠真机手点 |
| 🟡 P1 | 拆分 InputMethod.ux 为屏幕类型独立的组件（`InputMethodCircle`、`InputMethodPill`、`InputMethodRect`...） | 1000 行单文件 + 6 个 screenType 分支 = 改一处伤全身 |
| 🟡 P1 | 词典读取改为**真异步**（worker / 分块 read + requestIdleCallback / setTimeout 分帧） | 同步字典 I/O 是「点进页面即重启」的终极根因，分片只是降概率 |
| 🟢 P2 | 给所有 keyboard handler（`onSelect`、`onRsSelect`、`onBtnClick`）加 try-catch + 页面级 error boundary | 即使崩溃也不至于整页黑屏，至少留一个回退按钮 |
| 🟢 P2 | 禁掉 `@media screen and` 在输入法相关 CSS 中的使用 | 手环 9 已知 bug，10-03 修了 40 个页面但输入法组件可能漏了 |
| 📝 文档 | 写一份「输入法组件改动 checklist」：改完在 circle / pill / rect 三种真机上各测一遍 | 防止单屏修好、多屏全坏 |

---

## 七、关联文档

- [chinese-input-bugs-analysis.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/chinese-input-bugs-analysis.md) — Bug 1/2 分析（返回需点 2 次 + 字体闪烁）
- [首页黑屏并重启-深度分析.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/首页黑屏并重启-深度分析.md) — 看门狗复位方向 + 阶段标记取证
- [media-screen-and导致黑屏重启分析.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/media-screen-and导致黑屏重启分析.md)
- [手环9黑屏根因定位-pill-shaped分支已验证-编辑页修复.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/手环9黑屏根因定位-pill-shaped分支已验证-编辑页修复.md)
- [模拟器黑屏排查指南.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/模拟器黑屏排查指南.md)