# 手环 9（胶囊屏）「无法切换课程表」Bug 分析

> 分析日期：2026-10-03
> 目标设备：**小米手环 9 = 胶囊屏（`pill-shaped`），192×490，圆角 96**（已多次实测确认，见 `docs/手环9胶囊屏设备ID为NA分析.md`、`docs/胶囊屏页面显示问题体检（模拟器截图）.md`）
> 现象（用户反馈）：在小米手环 9 上**点不动 / 切不了课程表**，即「课程表切换」功能在胶囊屏上不可用
> 关键词：课程表切换 · 栏目9 · 胶囊屏
> 状态：**分析稿**（未复现真机，给出根因假设 + 复测清单 + 修复方向）

---

## 0. TL;DR（先给结论）

| 项 | 内容 |
|---|---|
| 设备 | 手环 9 = `pill-shaped` 胶囊屏，**192×490**（比手环10的 212×520 还窄 20px、矮 30px） |
| 切换链路 | 首页底部「⇄ 课程表名」→ `schedule-manager` 页 → 点列表项弹底部 sheet → 点「切换到该课程表」→ 写 `currentScheduleIndex` → 回首页刷新 |
| 最可能的根因 | **胶囊屏的「纵向空间过挤 + 圆角安全区 + Vela flex 退化 + 真机/模拟器 tap 差异」四类已文档化通病叠加**，导致「课表切换入口不可见/不可点」或「sheet 切换按钮被裁/点不到」 |
| 不是什么 | 不是数据持久化问题（回首页的 `resumeRefresh` 对各屏型一致，只要切成功就一定刷新）；不是 `openScheduleManager` 缺失（入口方法在 `week-indicator.js:16` 已正确定义） |
| 下一步 | 用 `vela` 起 **192×490 的 `xiaomi_band`**（不是 `xiaomi_band_10`）真复一次；按第四节坐标标定 + 真机复测 |

> 关于「栏目9」的两种解读：
> - **若指「手环 9」**：本文全文即针对胶囊屏。
> - **若指「第 9 张课程表」**（多课表场景）：对应 H2 —— 课程表列表在胶囊屏滚不到第 9 项，导致那张课表切不到。两种解读的排查路径在第四节合一。

---

## 1. 切换功能的完整数据流（带代码定位）

### 1.1 首页入口：`week-indicator`（课程表切换）

`src/pages/index/index.ux:158-162`：

```html
<div class="week-indicator" onclick="openScheduleManager">
  <image class="week-swap-icon" src="/common/icons/{{ iconTheme }}/icon_swap.png"></image>
  <text class="week-text" style="color: {{ theme.accent }}">{{ currentScheduleName }}</text>
</div>
```

`onclick="openScheduleManager"` 的处理函数在模块里定义（`src/pages/index/modules/week-indicator.js:16-19`）：

```js
instance.openScheduleManager = function() {
  var router = require("@system.router")
  router.push({ uri: "/pages/schedule-manager" })
}
```

> 结论：入口方法**存在且正确**，所有屏型共用同一条跳转。所以「进不去管理页」不会是方法缺失，而更可能是**布局把这块挤出了可视区**（见 H1）。

### 1.2 管理页：列表项 → 底部 sheet → 切换

`src/pages/schedule-manager/schedule-manager.ux`：

- 列表项点击弹 sheet（`:23`）：
  ```html
  <div for="{{ list }}" class="item" onclick="openSheet($idx)" ...>
  ```
- 底部 sheet 与「切换到该课程表」按钮（`:40-52`）：
  ```html
  <div class="overlay-sheet" if="{{ sheetIndex >= 0 }}" onclick="closeSheet">
    <div class="sheet-card" onclick="stopBubble">
      ...
      <div class="sheet-switch-btn" if="{{ sheetIndex !== currentIndex }}" onclick="sheetSwitch">
        <text>切换到该课程表</text>
      </div>
  ```
- 切换动作（`:298-320`）：
  ```js
  sheetSwitch() { var idx = this.sheetIndex; if (idx === this.currentIndex) return; this.toggle(idx); this.closeSheet() },
  toggle(idx) {
    ...
    store.setCurrentScheduleIndex(idx, function() {
      database.setScheduleIndex(idx, function() {
        prompt.showToast({ message: "已切换到 " + self.list[idx].name })
      })
    })
  }
  ```

### 1.3 回首页刷新（各屏型一致）

`src/pages/index/index.ux` 的 `onShow → resumeRefresh`（`:432-470`）：

```js
store.getCurrentScheduleIndex(function(idx) {
  var doLoad = function() {
    if (database.getScheduleIndex() === idx) {
      self.loadScheduleData(idx, true)
    } else {
      database.setScheduleIndex(idx, function() { self.loadScheduleData(idx, true) })
    }
  }
  ...
})
```

> 关键点：`toggle()` 已同时把 `store` 与 `database` 的当前索引都设为新值，回首页时二者相等 → 直接 `loadScheduleData` 刷新。**只要切换动作真的触发，刷新对全部屏型都生效**。因此本 bug 的矛头指向**「触发/到达切换」这一步在胶囊屏失效**，而不是刷新/持久化。

---

## 2. 设备与屏型定位（为什么单拎「手环 9」）

| 设备 | 形状 | 分辨率 | 备注 |
|---|---|---|---|
| 小米手环 9 | `pill-shaped`（胶囊屏） | **192×490** | 圆角 96，纵向最紧 |
| 小米手环 10 | `pill-shaped`（胶囊屏） | 212×520 | 仅近似，比 9 宽 20/高 30 |
| 小米手环 8/9 Pro、REDMI Watch 5 | `rect`（方屏） | 336×480 / 432×514 | 横向充足 |
| 圆表 | `circle` | 466×466 | 横向足、纵向圆 |

胶囊屏有三条已实证的项目级铁律（见 `docs/band9-edit-course-invisible-text-analysis.md`、`docs/胶囊屏页面显示问题体检（模拟器截图）.md`）：

1. **纵向空间极挤**：首页一屏只能看到约 1.5 张课程卡，顶部 4~5 层 bar 吃掉大量纵向空间。
2. **Vela `flex:1` / `width:100%` 在窄屏测量阶段退化**：依赖父容器剩余空间的声明会塌缩，元素被 `text-overflow: ellipsis` 截断或宽度归零。
3. **真机 ≠ 模拟器**：文档原话——「**模拟器的『没问题』不能推出真机的『没问题』（今天已被实证：模拟器点击正常 → 真机手环 9 打不开）**」。

这三条直接构成下面四类根因假设的土壤。

---

## 3. 根因假设（按可能性排序）

### H1 — 首页「课程表切换」入口在 192×490 被纵向挤出可视区 / 不可点 ⭐最可能

首页 `schedule-page` 是 `flex-direction: column; height: 100%`，**只有中间的 `.class-list` 是 `scroll-y` 可滚动**，其余所有 bar 都是 `flex-shrink:0` 的固定高度块，页面**没有外层滚动**。

在 192×490（`padding: 30px 16px 30px 16px` → 可用高仅约 430px）下，从上到下要塞：

```
date-row → header(48) → nav-toolbar(仅胶囊有,总/今/明) →
custom-content-bar → status-bar(胶囊双行) → workday-tip-bar(条件) →
pinned-bar(条件) → [class-list: flex:1 吸收剩余] →
quick-add(collapsed ~40) → bottom-buttons(48) → week-indicator(课表切换 ~40)
```

若顶部 bar 较多（状态栏 + 置顶栏 + 调休条同时出现），固定块累计高度即可逼近甚至超过 430px，此时 **`bottom-buttons` 与最底部的 `week-indicator`（课程表切换入口）会被挤出屏幕底部**——用户根本看不到也点不到「⇄ 课程表名」，自然「无法切换」。

> 佐证：`docs/胶囊屏页面显示问题体检（模拟器截图）.md` §3.3 已记录首页「纵向空间过挤，可视卡片仅约 1.5 张」，顶部多层 bar 挤压是已知问题；但当时采集用的是 212×520（手环10），**192×490 只会更紧**，且那一版并没专门盯底部 `week-indicator` 是否还露得出。

**验证**：`vela` 起 `xiaomi_band`（192×490）→ 首页截图 → 看画面最底部是否还有「⇄ 课程表名」一行；用 `vela tap` 标定其坐标点击，是否跳 `schedule-manager`。

**修复方向**：
- 把 `week-indicator` 从「页面最底部固定块」改到 `header` 区域或与 `nav-toolbar` 合并，避免被纵向挤掉；
- 或给 `schedule-page` 加外层 `scroll`，保证底部入口永不离屏；
- 胶囊屏下把 `week-indicator` 的 `padding` 收更紧（当前 `:1628` 已是 `padding: 8px 6px`，可再评估行高）。

### H2 — 课程表列表在胶囊屏滚不到第 9 项（对应「栏目9 = 第 9 张课表」）

`schedule-manager.ux` 列表外层是 `scroll id="pageScroll" class="page" scroll-y="{{true}}"`（`:3`）。若该 `scroll` 在胶囊屏上因高度计算/圆角安全区/父容器 `flex` 退化而**实际不可滚或被底部 sheet 挡住**，则用户有多张课表时，**排在第 9 个之后的课表根本点不到**——表现为「那张课表切不了」。

**验证**：造 9+ 张课程表 → 进 `schedule-manager` → 尝试滚动到底 → 看第 9 项是否在屏内、能否 `openSheet` 弹出。

**修复方向**：确认 `pageScroll` 在胶囊屏的真实滚动范围；必要时把列表底部留白加大、或列表项高度在胶囊上收敛（当前 `:1040` `.item { height: 64px }`）。

### H3 — 底部 sheet 的「切换到该课程表」在 192 被圆角/贴底裁切或点不到

`schedule-manager.ux` 的 `.overlay-sheet` 是 `position:absolute; justify-content:flex-end`（`:780-791`），`.sheet-card` 贴在屏幕底部（`:793`）。文档 §3.4 曾把「课程表管理面板」评为 212×520 上的「健康样本」，但**那是在手环10上**；在 192×490 上：

- 胶囊屏上下是圆弧，`sheet-card` 贴底极易**进入底部圆角黑区**，末行按钮（「切换到该课程表」）被视觉遮挡且靠边难点；
- 若 sheet 内容（标题 + 课程数 + 切换按钮 + 假期提醒开关 + 网格按钮）在 192 上总高超过可用区，切换按钮会被推到屏幕外。

> 旁证：`docs/胶囊屏页面显示问题体检` §3.2 已记录输入法候选面板「下边缘压到胶囊屏底部圆弧区」的同款贴边遮挡风险。

**验证**：进任意非当前课表的 sheet → 截图看「切换到该课程表」按钮是否完整可见、是否落在圆角黑区；`vela tap` 其坐标看能否触发 `toggle`。

**修复方向**：`sheet-card` 在胶囊屏加底部安全内边距（避开圆角），并限制 sheet 最大高度 + 内部滚动，保证切换按钮永不离屏。

### H4 — 真机 vs 模拟器 tap 差异（「模拟器能切，真机手环9切不动」）

文档已实证：模拟器点击正常，**真机手环 9 上同样的坐标/手势可能「打不开」**。这意味着即便 H1~H3 在模拟器上全绿，**真机仍可能 tap 无响应**（Vela 事件层 / 触摸命中区域在窄屏的偏差）。

**验证**：必须在**手环 9 真机**上复测一遍：进管理页 → 点列表项 → 点切换按钮，观察是否真的切换（看首页 `currentScheduleName` 是否变、toast 是否弹）。

### H5 — Vela flex 退化导致切换按钮「看不见/点不到」

参照 `docs/band9-edit-course-invisible-text-analysis.md` 的同款机理：胶囊屏上 `flex:1` 退化会让按钮宽度塌缩到接近 0，元素虽在 DOM 但**视觉上消失、命中区归零**。若 `sheet-switch-btn`（`:819`，`width:100%`）或 `week-indicator` 在胶囊屏嵌套在退化的 flex 容器里，就会「看起来没这功能、点了也没反应」。

**修复方向**：胶囊屏块内把关键按钮改**固定宽度 + `flex-shrink:0`**（不用 `width:100%`），与编辑课程页的修法一致。

---

## 4. 复测清单（手环 9，192×490）

> 严禁用 `xiaomi_band_10`（212×520）顶替——文档已强调 192 更紧，问题只在 9 上暴露。

**第一步**：`vela up` 起 **`xiaomi_band`**（VVD 即 192×490/ `pill-shaped`/`corner_radius 96`），装最新 rpk。

**第二步**：按下面顺序截图 + 标定坐标点击（用 `vela tap <id> <lcdX> <lcdY>`，坐标走裸 LCD，注意 skin 偏移）：

| # | 操作 | 看什么 | 对应假设 |
|---|---|---|---|
| 1 | 首页（当日课表，尽量让状态栏/置顶栏/调休条都出现） | 画面最底部是否还有「⇄ 课程表名」一行 | H1 |
| 2 | `vela tap` 该入口坐标 | 是否跳到 `schedule-manager` | H1 / H4 |
| 3 | 造 9+ 张课表进 `schedule-manager` | 列表能否滚到第 9 项、第 9 项能否 `openSheet` | H2 |
| 4 | 进某非当前课表的 sheet | 「切换到该课程表」是否完整、是否落在底部圆角黑区 | H3 |
| 5 | `vela tap` 切换按钮坐标 | 是否弹「已切换到 X」toast、首页名称是否变 | H3 / H4 / H5 |
| 6 | **手环 9 真机**重复 1~5 | 模拟器全绿后，真机是否仍切不动 | H4 |

**第三步**：把复测结果回填本表，即可锁定是 H1~H5 中的哪一个（或多个叠加），再落最小改动。

---

## 5. 修复方向总览（按假设）

| 假设 | 修复要点 | 风险 |
|---|---|---|
| H1 | 课程表切换入口上移到 header / 合并进 nav-toolbar，或首页加外层 scroll；胶囊屏收紧 `week-indicator` 行高 | 低，纯布局 |
| H2 | 确认 `pageScroll` 胶囊屏滚动范围；列表项高度收敛；列表底部留白 | 低 |
| H3 | `sheet-card` 胶囊屏加底部安全内边距避开圆角；限制 sheet 最大高度 + 内部滚动 | 低 |
| H4 | 仅靠模拟器无法消除，必须真机复测；必要时放大触摸命中区（按钮加 `padding`/`min-height`） | 中（依赖真机） |
| H5 | 胶囊屏关键按钮改固定宽度 + `flex-shrink:0`，不用 `width:100%` | 低 |

> 无论最终锁定哪个，都建议**同步在 212×520（手环10）与 336×480（Pro）回归**，避免胶囊适配改动影响方屏/大屏。

---

## 6. 相关文档（交叉印证）

- `docs/课程表切换模块功能需求.md` —— 切换功能的交互/边界定义
- `docs/schedule-manager-bug-analysis.md` —— 管理页底部 sheet 的点击冲突与胶囊屏适配历史
- `docs/胶囊屏页面显示问题体检（模拟器截图）.md` —— 胶囊屏纵向拥挤、贴边/圆角、真机≠模拟器 的实证
- `docs/band9-edit-course-invisible-text-analysis.md` —— Vela `flex:1` 退化导致元素塌缩的机理与修法（H5 同款）
- `docs/add-schedule-no-switch.md` —— 新增课表不自动切换的逻辑说明
- `docs/手环9胶囊屏设备ID为NA分析.md` —— 手环 9 设备规格与胶囊屏识别

---

*说明：本文件为分析稿，尚未在手环 9 真机复现。请在第四节用 `xiaomi_band`（192×490）复测后回填结论，再决定落地哪个修复。*
