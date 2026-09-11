# class-schedule UI 专项质检报告 · 2026-09-11 21:30

> 这是**第 5 轮 QA 的功能/可用性报告之外的补充专项**，只聚焦你新提出的维度：
> 字号、行高、按钮、图标、颜色、风格搭配、易读性、乱行、空页面、无效按钮。
> 配套的功能链路走查见 [`../class-schedule-QA-20260911-1725.md`](../class-schedule-QA-20260911-1725.md)。

| 项 | 值 |
|---|---|
| HEAD | `26afaf02a4d07128625f5a78f30907a822ffdbde`（与第 5 轮一致，无代码变更） |
| 版本 | versionName 1.4.153 / versionCode 653 |
| 目标机型 | 小米手环 9 Pro、10 Pro（均为**方屏 rect**，约 336–412px 宽、330+ PPI） |
| 审查范围 | 30 个页面 `.ux` + `components/` + `data/store.js`（6.4 万行扫描，工具脚本 `scripts/ui-audit-schedule.py`） |
| 缺陷数 | **P1 ×12、P2 ×3**，其中 6 条只在 9 Pro / 10 Pro 上才暴露 |

---

## 一句话结论

**这一版最大的 UI 问题不是"丑"，而是「两套并行的视觉体系」在打架**：首页正文用可调的动态字号（默认 **48px**），其余 29 个页面写死 **11–24px**，同一 App 内字号跨度 **8–76px**；全仓 678 处 `font-size` 只有 34 处 `line-height`、4 个页面有溢出保护——**课程名一长就必然乱行**。另外输入法键盘是 **78 处绝对定位硬像素**摆出来的，**9 Pro / 10 Pro 分辨率不同必然错位**，这比"箭头函数"更能解释你反馈的"输入法打不开/错位"。

---

## 一、P1 · 界面与显示（手环端按顶格处理）

| 编号 | 维度 | 标题 | 复现步骤（用户视角） | 期望 | 实际 | 机型 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|---|
| U-1 | 布局/适配 | **输入法键盘是 78 处绝对定位硬像素摆出来的，无分辨率折算** | 9 Pro 上手环任意输入框 → 唤起键盘 | 键位贴合屏幕 | `position:absolute` + 写死 `top/left`（left 最大 **406px**，已超过 9 Pro 的约 336px 屏宽）→ 键位整体偏移、右侧被裁、点不准/点不到 | **9 Pro / 10 Pro（两者分辨率还不一样）** | `components/InputMethod/InputMethod.ux`（78 处 `position:absolute`） | 改为 flex/grid 相对布局，或按屏宽比例计算坐标；**这条很可能就是"输入法打不开/错位"的真身**，比箭头函数的猜测更值得先查 |
| U-2 | Icon 显示 | **T9 键盘缺 `jp.png`，切日文时语言键图标裂图/空白** | 输入法 → 切到日文 | 显示日文语言键图标 | `./assets/t9/{{lang}}.png` 展开到 `jp` 时文件不存在（`assets/t9/` 只有 cn/en/123/a/bigA/del/en/space/back2） | 9 Pro / 10 Pro | `components/InputMethod/InputMethod.ux:102` | 补一张 `assets/t9/jp.png`，或对 jp 走单独的静态引用（`:29` 的 full 分支就是这么处理的） |
| U-3 | 字号/风格 | **「字体大小」设置只在首页生效，其余 26 个页面写死 px** | 设置 → 拖动字号滑杆 → 进任意二级页 | 全 App 跟着变 | 只有 index-full(4 处)、chinese-input(13)、week-view(3)、settings(1 预览) 有动态绑定；**add-course / detail / vibration-lab / reset-data 等 26 个页面动态绑定 = 0** | 9 Pro / 10 Pro | 对比 `index-full.ux:60-61`（`$item.metaFontSize`）vs `vibration-lab`（动态 0 / 写死 77）、`reset-data`（0/48）、`detail`（0/45）、`add-course`（0/43） | 抽一层字号变量（`store.getFontSizes` 已有现成实现，`detail.ux:230`、`add-course.ux:219` 已在用），把其余页面的 `.ux` 从写死 px 换成变量 |
| U-4 | 字号/易读性 | **8–11px 微小字号共 76 处，在手环上不足 1mm** | 进 vibration-lab / week-view / course-manager / statistics / donate | 看得清 | 336–412px 宽、330+ PPI 的屏上，11px ≈ 0.8mm，**8–9px 基本不可读** | 9 Pro / 10 Pro | `week-view`（最小 **8px**）、`vibration-lab`(9px)、`course-manager`(10px×4)、`statistics`(10px×4)、`donate`(10px×2)、`chinese-input`(9px)、`week-grid-demo`(8px) 等共 13 个页面 | 设下限：正文 ≥16px、次要 ≥13px；低于此值的一律提到 13px 以上 |
| U-5 | 行高/乱行 | **全仓 678 处 `font-size`，只有 34 处 `line-height`（覆盖率 5%）** | 任意有多行文本/列表的页面 | 行距舒适 | 行距完全交给引擎默认值；中文字形盒子高，多行文本极易**行间挤压、叠字**——这正是用户说的"乱行" | 9 Pro / 10 Pro | `detail`(51 字号/0 行高)、`add-course`(49/0)、`vibration-lab`(77/1)、`settings`(25/1)、`reset-data`(48/7) | 凡是可能 ≥2 行的 `<text>`，补 `line-height: 1.3~1.5em`（配合动态字号更好） |
| U-6 | 溢出/乱行 | **长文本几乎无截断保护（仅 4 个页面用 `text-overflow`，`lines` 属性 1 处）** | 新增课程时输入很长的课程名/老师/地点 → 回首页 | 超长自动省略或整齐换行 | 文本撑破容器、挤压相邻元素、把整行顶出去 | 9 Pro / 10 Pro | 全仓；`index-full`(2)、`week-view`(2)、`chinese-input`(2)、`custom-content-edit`(1) 是仅有的例外 | 列表类文本统一加 `text-overflow: ellipsis` + `lines: 1`（或按行高设 `lines: 2`） |
| U-7 | 按钮/易点击 | **方屏下按钮热区过小：统计页返回键在 rect 下只有 28×24px、字号 11px** | 9 Pro 上进「统计」→ 点左上角返回 | 一次点中 | `@media (shape:rect)`（＝9 Pro/10 Pro）下 `.back-btn{height:24px;width:28px;font-size:11px}` → 比圆屏(28×44)还小一圈，极难命中 | **9 Pro / 10 Pro 专属** | `pages/statistics/statistics.ux`（`@media (shape:rect)` 与 `capsule` 分支）；全仓 <40px 高的按钮类共 **154 个** | 方屏/胶囊屏分支的热区至少做到 44×44px；全仓统一一遍最小热区（40px 起步） |
| U-8 | 风格搭配 | **返回/取消按钮 7 种文案并存，含 4 处英文 `back`** | 逐个页面看左上角返回键 | 全站一致 | `'◀ 返回'`×16、`'◀'`×6、`'◀ 上一步'`×6、**`'back'`×4**、`'返回'`×2、`'◀ 取消'`×1、`'取消'`×1 → 中英混排、同一个动作 7 种说法 | 9 Pro / 10 Pro | `week-grid-demo.ux:4`、`week-grid-simple.ux`、`week-overview-demo.ux`、`countdown-demo.ux` 为英文 `back` | 统一为「◀ 返回」；编辑类页用「取消」要保持"取消＝丢弃修改"的语义一致（`detail.ux:4` 当前是「◀ 取消」但执行的是 goBack） |
| U-9 | Icon 显示 | **22 个图形符号 104 处当图标用，其中 10 个主题的 icon 全是彩色 emoji** | 设置 → 主题选择；或进实验室/统计/二维码等页 | 显示正常图标 | 手环系统字体基本**不含彩色 emoji** → 🔵🟢🔴⚫⬛🟣⬜🟡🌲🟠 大概率渲染成**豆腐块/空白**；此外 📌📱💡🧪📳💾 也是同一风险 | 9 Pro / 10 Pro | `data/store.js:47/68/89/110/131/...`（主题 icon 字段）；模板侧 `device-info`、`vibration-lab`、`donate:35`（❤ 后跟孤立的变体选择符 U+FE0F）、`schedule-manager`、`pinned-pages` 等 | 主题 icon 改成纯色/几何符号（● ◆ ▲ ■）或直接删掉，用色块预览；模板里的彩色 emoji 一律替换成矢量图或基本符号 |
| U-10 | 空页面/空状态 | **9 个页面加载态 / 空状态 / 错误态三种全无** | 清空课程库后进「课程管理」；或首次进「首页设置」 | 有「暂无数据」提示 | 纯空白页，用户不知道是"没数据"还是"坏了" | 9 Pro / 10 Pro | `course-manager`、`custom-content-edit`、`homepage-settings`、`nickname-edit`、`template-picker`、`settings`、`donate`、`welcome`、`chinese-input` 三种状态关键词**全为 0** | 至少给列表类（course-manager / template-picker / homepage-settings）加 `if="{{ list.length === 0 }}"` 的空态 |
| U-11 | 颜色/主题 | **双轨配色：`<style>` 里写死深色值 vs 模板内联 `{{theme.*}}` 并存** | 切换到「晨光白」/「暖阳米」浅色主题 → 进「编辑课程」「添加课程」 | 全站统一换色 | 两套体系并行，`.location-cursor` 这类**没有内联覆盖**的元素会永远保持蓝色 `#7ec8e3`；浅色主题下局部仍是深色系的写法随时会冒出来 | 9 Pro / 10 Pro | `detail.ux` `<style>` 18 处 bg + 18 处 color 写死；`add-course.ux` 16+17 处；`week-view` 8 处；确认漏出点：`detail.ux` 的 `.location-cursor` | 把 `<style>` 里的颜色清空，全部收进 `theme.*`；或反过来删掉模板里的内联绑定，二选一，别两头都留 |
| U-12 | 空页面/入口 | **实验室里「输入键盘」和「中文输入」是几乎同一个功能，且路由名与页面标题不符** | 实验室 → 点「输入键盘」 | 打开倒计时 demo | 打开的是个键盘页，页面自身标题写死「输入键盘」，路由却叫 `countdown-demo`（标题应是「倒计时」）；且它与另一个入口「中文输入」内容高度重复 | 9 Pro / 10 Pro | `data/lab-list.js`（`countdown-demo` → 标题「输入键盘」）；`pages/countdown-demo/countdown-demo.ux:6`、`:32` | 二选一：要么把 `countdown-demo` 补成真正的倒计时页，要么删掉这个实验室入口（推荐删，或改名为 keyboard-demo） |

---

## 二、P2 · 交互与一致性

| 编号 | 维度 | 标题 | 机型 | 定位 | 修复建议 |
|---|---|---|---|---|---|
| U-13 | 按钮 | **35 处用 `<text onclick>` 当按钮**，没有按压态、没有可点击的视觉暗示 | 9 Pro / 10 Pro | `settings.ux:159`、`chinese-input-full.ux:27-32`、`vibration-lab.ux:138`、`device-info.ux:27`、`lab.ux:46`、`chinese-input.ux:20` 等 | 换成 `<input type="button">` 或至少加 `:active` 态 + 圆角背景 |
| U-14 | 乱行 | **254 个 ≤120px 的窄容器**，叠加 U-6 的零溢出保护 → 文本最容易在这里炸开 | 9 Pro / 10 Pro | `vibration-lab`(30)、`detail`(27)、`add-course`(25)、`chinese-input`(25)、`course-manager`(21) | 与 U-6 一起修：窄容器内的文本统一加 `lines` + `text-overflow` |
| U-15 | 死配置 | `store.js` 的 `fontScale` 是**死代码**（`setFontScale`/`getFontScale` 全仓无调用，真正生效的是 `baseFontSize`） | — | `data/store.js:309-327` | 删掉，避免将来有人接上去写一个"改了没反应"的设置项 |

---

## 三、9 Pro vs 10 Pro 机型对比（UI 专项）

两机型**共用同一份代码、无任何机型分支**，代码里只有 `shape`（circle / rect / capsule）三个分支。所以：

| 维度 | 9 Pro（rect） | 10 Pro（rect） | 差异 |
|---|---|---|---|
| 走到的 CSS 分支 | `@media (shape: rect)` | `@media (shape: rect)` | **相同** |
| 返回键热区（以 statistics 为例） | **28×24px / 11px 字** | 同左（写死 px，不随分辨率放大） | 相同，**但 10 Pro 屏更大时相对更小** |
| 输入法键盘错位 | 会（78 处绝对定位按固定像素摆） | 会，**偏移方向与幅度不同**（分辨率不同） | **程度不同**：9 Pro 约 336px 宽 vs 坐标最大 406px → 直接超出；10 Pro 屏更宽可能改为留白偏移 |
| 写死 px 的整体观感 | 元素偏小 | 元素偏小、四周空白更多 | 10 Pro 的"字小 + 留白多"更明显 |
| emoji / 彩色图标缺失 | 同 | 同 | 相同，取决于系统字体不带 emoji |
| **结论** | **所有 UI 缺陷都是"双方屏同时命中"**，但 **9 Pro 因屏更窄，溢出/错位会更严重。真机回归必须两台都走。** |

---

## 四、数据速览（指标化，便于下轮对比）

| 指标 | 当前值 | 目标值 |
|---|---|---|
| `font-size` 声明总数 | **678 处 / 21 种不同字号**（跨度 8–56px，加动态后 8–76px） | ≤8 种，收敛到一个字号阶梯 |
| 小于 13px 的字号 | **76 处（8–11px）** | 0 |
| `line-height` 覆盖率 | **34 / 678 = 5%** | ≥80%（多行文本） |
| 有溢出保护的页面 | **4 / 30** | 列表类 100% |
| 动态字号绑定的页面 | **4 / 30**（仅首页 Chinese-input 等） | 全部服务用户内容的页面 |
| 按钮热区 < 40px | **154 个**（方屏下最严重 24px 高） | 0 |
| 返回/取消文案种类 | **7 种**（含 4 处英文） | 1–2 种 |
| emoji / 图形符号当图标 | **104 处 / 22 个符号**（主题 icon 10 个全是彩色 emoji） | 0 个彩色 emoji |
| 加载/空/错误三态齐全的页面 | **8 / 30**（9 个页面三态全无） | 列表类 100% |
| `<style>` 内写死颜色 | detail 36 / add-course 33 / week-view 8 处 | 0 |
| 无法参数的布局（输入法绝对定位） | **78 处** | 0 |

---

## 五、优先修复顺序（按投入产出）

1. **U-1 输入法布局**（影响面最大 —— 所有要打字的场景；也最可能是历史遗留"输入法"问题的真相）
2. **U-7 方屏按钮热区**（9 Pro / 10 Pro 每日必点，改动小：media query 里几个数字）
3. **U-5 + U-6 行高与溢出**（直接消除"乱行"，改法机械、可批量）
4. **U-4 微小字号**（批量提值，几行正则）
5. **U-9 emoji 图标**（换字即可，主题 icon 最急）
6. **U-3 字号体系统一**（工作量最大的一条，建议 3/4/5 之后再做，前 5 条都是 1 小时内可完成的）
7. U-8 / U-10 / U-11 / U-12 / U-13

---

## 六、UI 回归 checklist（真机，9 Pro 与 10 Pro 各走一遍）

1. 唤起输入法 → **键位完整、不出屏、点得准**（U-1）；切中/英/日三语 → 语言键图标都有（U-2）
2. 进「统计」→ 点左上角返回 → 一次点中，不用戳第二下（U-7）；再走一遍 settings / donate / week-grid 的返回键
3. 新增一门**课程名 20 个字**的课 → 回首页看有没有折行乱掉/顶破卡片（U-5、U-6、U-14）
4. 课程备注里写 3 行 → 详情页看行距是否挤在一起（U-5）
5. 设置里把字号从最小拖到最大 → **首页内容跟着变**；再进 add-course / detail / vibration-lab 看是否也跟着变（U-3）
6. 看书最小字号的页面（vibration-lab / week-view / course-manager）→ 能否看清（U-4）
7. 设置 → 主题 → 逐个切 10 个主题 → 主题列表图标是否正常（U-9）；切到「晨光白」→ 进编辑课程看有没有"半深半浅"（U-11）
8. 清空课程库 → 进「课程管理」→ 是否有"暂无数据"（U-10）
9. 逐个点二三级页 → 返回键文案是否统一（U-8）
10. 实验室 → 「输入键盘」→ 确认是否要和「中文输入」合并（U-12）

---

*生成：2026-09-11 21:30 · UI 专项第 1 期 · 基于 HEAD `26afaf0`*
*扫描脚本：`scripts/ui-audit-schedule.py`（可复跑，用于下轮指标回归对比）*
