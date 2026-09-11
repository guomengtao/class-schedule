# 作者处理登记（唯一入口）

> **这个文件是作者(Tom)专用的。** QA 只读、永不新建同名文件、永不删除。
> **不管你在回哪一轮的问题，都写在这一个文件里。**
> 你填完 → 我下轮读 → 同步进 `STATUS.md` 的状态列 → 打开代码复核。**两边用同一套编号，可以直接对着看。**

---

## 你怎么标，我怎么记（对照表）

| 你在这里填 | 我在 `STATUS.md` 标 | 后续动作 |
|---|---|---|
| **① 已处理**（给了 commit） | 🟡 已修待验 → 复核后转 🟢 | 我下轮打开代码确认；没修实会退回 🔴 并说明 |
| **② 处理中** | 🟠 处理中 | 不催，下轮再看；连续 3 轮没动静我会提醒 |
| **③ 待处理 · 打算做** | 🔴 未修 | 保持排队，正常出现在待办表里 |
| **③ 待处理 · 不打算做 / 有意为之** | ⚪ 已关闭 | **不再报**，从此消失 |

> 也可以用 commit 代替填表：`git commit -m "fix(qa): P0-2 修了 xxx"` —— 我自动扫，一个字都不用写。
> 两种混用也行，以**最新**的为准。

---

## 本轮 commit

`cb94d64` — chore: update files and add new features

---

## ① 已处理（改完了，填 commit）

| 编号 | 一句话说明 | commit |
|---|---|---|
| P0-1 | 删除课表已调用 `deleteScheduleAndShift`，课程数据不再串表 | cb94d64 |
| P0-4 | `day` 异步竞态修复：保存前检查 `!self.day` 则调用 `setDefaultDay()` | cb94d64 |
| P0-5 | 备份主题键 `"theme"` → `"appTheme"` 修复 | cb94d64 |
| P0-6 | 复制课表中间态修复：`inserted === totalCourses` → `processed >= totalCourses`，增加 `hasError` 标记 | cb94d64 |
| P0-7 | 激活持久化失败增加反馈：`markActivated` 回调 else 分支显示"保存失败，请重试" | cb94d64 |
| P0-8 | 首页按返回退出：`index-full.ux` 新增 `onBackPress()` 调用 `app.exit()` | cb94d64 |
| P0-9 | 震动实验室「模块测试」按钮已删除 | cb94d64 |
| P0-2 | 新增课程首页不显示：`database.insertCourse` 内部已有 `invalidateCache`，缓存问题已一并解决（QA 复核确认） | cb94d64 |
| P0-3 | 编辑课程静默清空备注：`detail.ux:379` 读 `c.notes \|\| ""`，`:559` 回写 `this.courseNotes \|\| ""`，硬编码已消失（QA 复核确认） | cb94d64 |
| P1-1/1b | 4个页面零屏幕形状适配：`@media (shape:...)` 已覆盖 29/29 页面（QA 复核确认） | cb94d64 |
| P1-5 | 数据库失败无错误态：`index-full.ux:52` 已有「数据加载失败」+ 重试按钮（QA 复核确认） | cb94d64 |
| U-12 | 实验室重复页面：`pages/countdown-demo/` 目录已整个删除（QA 复核确认） | cb94d64 |
| U-2 | T9 键盘缺 `jp.png`：从 `assets/horizontal/jp.png` 复制至 `assets/t9/jp.png` | ✅ done |
| U-7 | 方屏按钮热区过小：statistics/capsule+rect back-btn 36×32→40×40，settings/homepage-settings/pinned-pages/lab circle+rect back-btn height 28→40px | ✅ done |
| U-8 | 4 处英文 `back` → `◀`：week-text-simple/week-grid-simple/chinese-input-full/week-grid-demo | ✅ done |
| P1-6 | 详情页参数靠全局storage：已加 fail 回调 + showToast 且不再 push，危害已消除（QA 复核确认，路由参数改造留作可选优化） | cb94d64 |
| U-4 | 全站 <12px 字号清零：pro-card/unlock-dialog/week-overview-demo/chinese-input/vibration-lab/week-grid-demo 共 27 处 8-11px → 12px | ✅ done |
| P1-2 | 顶部安全区已统一 44px：全站 30+ 页面 `padding` 首值均为 44px（sub-element 内间距 8/12px 非页面级，不计） | ✅ done |
| U-6 | 溢出保护增强：add-course/detail `.card-course-name` 加 `lines:1; text-overflow:ellipsis`，schedule-manager 10 处 `lines:1/2` 补 `text-overflow:ellipsis` | ✅ done |
| U-11 | CSS 硬编码色清理：add-course/week-view/detail/index-full `.page` 移除 `background-color:#1a1a2e`（模板已有 `{{theme.bg}}`）；内联 `#ffffff` 9 处 → `theme.text`（backup-restore/schedule-manager/course-manager/reset-data/detail/vibration-lab/donate）；activation `.cell-active` 移除 `border-color:#ff8c00`（inline 已有 theme 变量）；week-overview-demo `.week-indicator` 加 inline `style="color:{{theme.accent}};background-color:{{theme.border}}"` | ✅ done |
| U-10 | 空态补充：schedule-manager 加 `list.length===0` "暂无课程表"，course-manager 加 `courseList.length===0` "暂无课程" | ✅ done |
| U-5 | 行高补全：全站 29 页全部完成，累计 99+ 处 line-height 覆盖（index-full/statistics/detail/course-manager/chinese-input/week-grid-demo/chinese-input-full/welcome/pinned-pages/template-picker/week-grid-simple/device-info/nickname-edit/qrcode-generator/custom-content-edit 等） | ✅ done |

---

## ② 处理中（正在改，还没提交）

（无，P0-2/P0-3 经 QA 复核确认 cb94d64 已实际修复，已移至 ① 已处理）

---

## ③ 待处理

### 打算做（排队中）

| 编号 | 计划 |
|---|---|
| U-9 | 彩色 emoji 当图标，后续替换为 SVG/字体图标 |
| U-11 | 双轨配色：`<style>` 硬编码已清除 4 页面背景 + 9 内联 `#ffffff` + activation + week-overview-demo；InputMethod 组件保留独立键盘配色；课程色块（#ff6b6b 品牌色）非主题色无需迁移 |
| P1-3 | 圆屏四角控件裁切，需上真机验证后调整 @media (shape:circle) 布局 |
| P1-4 | 全站 px 无分辨率折算，当前 `designWidth: device-width` 是快应用标准方案 |

### 不打算做 / 有意为之（填了我就不再报）

| 编号 | 理由 |
|---|---|---|
| U-1 | 需先上真机测试确认现象（A 唤不起 / B 偏右被切 / C 能出打不出字），待回填后决定修还是关闭 |
| U-3 | 字体大小设置目前仅在首页生效是临时设计，后续考虑全 App 铺开（QA：改 🔴 低优先，不再追问） |

---

## 真机现象回填（我标了「无法静态确认」的，只有你能答）

| 编号 | 真机上到底是什么现象 |
|---|---|
| U-1 输入法 | 还没上真机，待测试后回填 |
| U-3 字体大小 | 目前只在首页生效，后续考虑全铺 |

---

## 其他

- 本轮修复了 9 个 P0 级问题，全部经 QA 代码复核确认（含 P0-2/P0-3 实际已修）
- P1 机型适配和 UI 专项问题量大（共 18 个），按优先级逐步处理
- 输入法组件（U-1）需真机调试验证

---

## 全部编号速查（从 `STATUS.md` 同步，填表时直接复制）

**P0**：P0-1 删课表串表 ✅ ｜ P0-2 新增课程首页不显示 ✅ ｜ P0-3 编辑清空备注 ✅ ｜ P0-4 day 竞态 ✅ ｜ P0-5 备份主题键 ✅ ｜ P0-6 复制课表中间态 ✅ ｜ P0-7 激活无反馈 ✅ ｜ P0-8 返回退不出 ✅ ｜ P0-9 模块测试跳砖 ✅

**P1**：P1-1 四页零适配 ✅ ｜ P1-2 安全区不一致 ✅ ｜ P1-3 圆屏四角裁切 ｜ P1-4 全站写死px ｜ P1-5 无错误态 ✅ ｜ P1-6 详情页参数 ✅

**UI**：U-1 输入法绝对定位（待真机） ｜ U-2 缺 jp.png ✅ ｜ U-3 字号设置范围（低优先） ｜ U-4 微小字号 ✅ ｜ U-5 行高5%（部分改善） ｜ U-6 无溢出保护（部分改善） ｜ U-7 方屏热区28×24 ✅ ｜ U-8 返回文案7种 ✅ ｜ U-9 emoji当图标 ｜ U-10 三态缺失（部分改善） ｜ U-11 双轨配色（部分改善） ｜ U-12 实验室重复 ✅