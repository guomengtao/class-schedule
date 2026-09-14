# UX Officer 缺陷台账（本角色写 ｜ 作者只读）

> 想看「用户体验官报的问题哪些改了」只看本表。作者回复请写 `../HANDOFF/REPLY.md`（唯一入口），编号用 `UX-x`。
> 首份基线报告：`reports/UX-Report_2026-09-13_1433.md`（main `f8f8920` / v1.4.217）。
> 最新报告：`reports/UX-Report_2026-09-14_1209.md`（main `6cabb90` / v1.4.242 / code742，2026-09-14 12:09，**大变更轮：输入法集中化重构 + 集中修复**）。
> 状态图例：🔴 未修 ｜ 🟠 处理中/部分改善 ｜ 🟡 已修待验 ｜ 🟢 已验证修复 ｜ ⏸ 挂起 ｜ ⚪ 已关闭

| 编号 | 级别 | 问题 | 状态 | 与主 QA 的关联 / 剩余差距（含 09-14 12:09 轮量化） |
|---|---|---|---|---|
| UX-1 | P1 | 空 `fail(){}`，存储读写失败静默 | 🔴 | 31→32→**29 处**（-3；删 chinese-input-full -5、nickname-edit 收敛，新增 lab-add-course +3 在 :274/278/297）；集中 custom-content-edit、chinese-input、add-course、lab-add-course、course-manager。主保存链路已安全，页面级仍待补 showToast |
| UX-2 | P2 | 演示数据硬编码占位「老师/教室」 | 🔴 | **定位修正**：course-manager 快速添加占位已随重构消失；现仅剩 `data/database.js:624-635 _doResetToDemoData` 12 门示例课写死「王老师/301教室」，用户「恢复演示数据」后需逐个改，建议标注「演示数据」或留空 |
| UX-3 | P2 | 添加成功 `router.back()` 后目标页可能不刷新 | 🟡 | 代码层具备刷新链（index-full onShow refreshClasses、week-view onShow loadData），待真机走「添加→保存→返回」闭环；关联主 QA P0-2 |
| UX-4 | P1 | 字号体系偏小、档位混乱 | 🟠 | <22px 347→299→**276（-23）**，仍多档、**标题38px 全站=0、正文32 仅 48**，主力 20px(103)/18px(48)；本轮胶囊页又引入 24/28 档（见 UX-21）；关联主 QA U-4 |
| UX-5 | P1 | 付费转化弹层字号偏小 | 🟠 | unlock-dialog 已达标(20/22)；**pro-card 最小仍 12px×3、premium-overlay 仍 12/13px**（12:09 复核未变），剩两组件待拉到底线 22 以上 |
| UX-6 | P2 | 顶栏时钟/星期字号偏小 | 🔴 | components/clock clock-text 仍 **18px**、index-full clock-text 20px、day-nav-text **18px**，建议 22~26；关联主 QA U-5 |
| UX-7 | P2 | 无效媒体值 `(shape: capsule)` 残留 | 🔴 | 33→37→**36 处/34 文件**（-1），合法 pill-shaped 44 处；3aed24c 已在 JS 层把 capsule 映射为 pill-shaped，建议 CSS 只留 pill-shaped；关联主 QA P1-1/P1-11 |
| UX-8 | P2 | 显隐以 `if` 销毁为主，display:none 仅 2 处 | 🔴 | if 123→125→**129（+4）**、display:none 仍 2，黑屏前科，建议暂隐用 display + 宽高比兜底 |
| UX-9 | P1 | 调试/实验页注册进正式路由（本轮扩大） | 🔴 | device-info/vibration-lab/lab/lab-settings/black-screen-check/bs-demo1~5/capsule-hide-test 全在，且**本轮新增 lab-add-course（manifest:147，720 行，从 lab-list「添加课程(胶囊)」进入）**；新页质量好但属实验功能；关联主 QA P1-7/U-12/P0-9 |
| UX-10 | P1 | 「删除振动」不彻底 | ⚪ **已关闭（方向变更）** | 作者最终选**保留按键振动**：feae8e2 加回 manifest 声明、onVibrate 加 try/catch、vibratemode 收敛，「删不干净」前提不成立 |
| UX-11 | P2 | 包体积余量偏紧 | 🔴 | src≈1.5M/138 文件（删中文页 -371、增实验页 +720，净持平），距 2MB 红线余量有限；剔除 UX-9 调试页可释放 |
| UX-12 | P3 | console 日志、logLevel=log | 🔴 | 140→142→**142**（持平），backup-restore 30 最多，发布建议降 error（末尾简列） |
| UX-13 | P3 | 根目录临时脚本/文件未清理 | 🔴 | fix_capsule_*.py/audit_capsule.py/capsule_audit.txt 等仍在，发布前清理 |
| UX-14 | P3 | minPlatformVersion=1000 偏低 | 🔴 | 未变，建议抬高或 JS 宽高比兜底 |
| UX-15 | P1 | manifest 删振动声明但代码仍调、onVibrate 无保护 | 🟢 **代码已修·待真机** | manifest:26 加回 system.vibrator（feae8e2），声明与调用一致；InputMethod.ux:790-796 onVibrate 已 try/catch；vibratemode 收敛到 chinese-input+InputMethod 两文件。**待真机验证按键振动正常不报错**（29e6f1b） |
| UX-16 | P2 | 二级页根块缺 width:100%、冗余 min-height | 🟢 **代码已修** | 11 个正式二级页根块均已有 width:100%；全仓 min-height:100% 18→**6，剩余全在 bs-demo1/bs-demo3/black-screen-check 调试页（故意保留），正式页清零**（29e6f1b）；关联主 QA P1-14 |
| **UX-17** | **P0** | 二维码生成器输入最多 5 字、第 6 字起静默无反应 | 🟢 **代码已修·待真机** | qrcode-generator.ux:144 补 chinese_input_maxlen=100，触顶 showToast；onShow 回填链路完整。**待真机验证可超 5 字**（29e6f1b）；交叉主 QA P0-11（建议同步转🟢） |
| **UX-18** | **P1（胶囊优先）** | 输入法回调 this 丢失→screenWidth 恒 336、缺 watch，胶囊键盘偏移 | 🟢 **代码已修·待真机** | InputMethod.ux:811-818 已 var self=this+fail 兜底 336、:472 补 $watch("screentype")、:263 加 pill-shaped 分支，配合 3aed24c 映射。**待米环9/10 真机验证候选栏不偏移、连续输入正常**（29e6f1b）；交叉主 QA P1-10（建议转🟢）、缓解 U-1 |
| **UX-19** | **P2** | 设置页胶囊块隐藏全部栏目说明 | 🔴 | settings 胶囊块（:803 已并列合法 pill-shaped）:832-833 仍 .row-hint{display:none}，11 条说明（栏目时间/云端备份/实验性功能/胶囊屏适配/解锁/支持/诊断/重置等）胶囊不可见；主 QA P1-15 的 flex 挤压已不存在，现状为**作者主动隐藏**，待拍板保持隐藏还是 22px 单行精简 |
| **UX-20** | **P1（胶囊优先）** | 5 处固定宽度超胶囊物理宽，首屏按钮/二维码溢出 | 🟢 **代码已修·待真机** | welcome 胶囊块收 160px+max-width:100%、schedule-qrcode 收窄、add-course .course-card 胶囊收 **140px**(:912)、detail 收 **160px**(:980)；基础 200/220 仅作用方屏。**待真机验证不溢出**（29e6f1b）；交叉主 QA P1-12（建议转🟢） |
| **UX-21** | **P2（胶囊优先）** | 【09-14 12:09 新增】胶囊添加课程页新引入 24/28px 字号档，低于「正文 32」统一基准 | 🔴 | add-course 胶囊块(:858 起) font-size=24px×4/28px×11/30px×2/32px×1，主力 28、最小 24；虽≥底线22但低于正文32，designWidth=device-width 等比缩小后高频页偏小。需拍板胶囊正文是回到32还是正式确认28/24为胶囊特例并写入规范；是 UX-4 的本轮具体化 |

## 输入法集中化重构回归结论（09-14 12:09，1.4.242/6cabb90）
- chinese-input-full 删除干净（manifest 路由 + 全仓引用 grep 全空，-371 行，无死路由）。
- 8 个输入入口（add-course/detail/course-manager/nickname-edit/schedule-manager/custom-content-edit/qrcode-generator/lab-add-course）统一「set return_key=chinese_input_result → onShow 读回填 → delete」，配对一致，**未发现输入丢失/串字段 P0**（add-course/lab-add-course 课程名走预设点选，仅地点一个自由文本字段）。
- add-course saveCourse(:477-515) 与新页 lab-add-course saveCourse(:408-433) 前置校验 + 成败 toast 齐全，主保存链路未被重构改坏。

## 主 QA 台账交叉复核结论（09-14 12:09，在 1.4.242/6cabb90 上；主 QA STATUS 仍停第 11 轮 d9b9bf6/1.4.209，已滞后）
- **主 QA P0-11（二维码 maxlen）→ 建议 🟢**：同 UX-17，29e6f1b 已补 maxlen=100 + 触顶 toast。
- **主 QA P1-10（输入法 screenWidth/this/watch）→ 建议 🟢待真机**：同 UX-18，self + $watch 两点都已做。
- **主 QA P1-12（5 处超宽）→ 建议 🟢待真机**：同 UX-20，胶囊块均已收窄。
- **主 QA P1-14（min-height:100%）→ 建议 🟢**：同 UX-16，正式页清零，余者全在调试页。
- 主 QA P0-10/P1-7 上轮已建议转🟢（5dc8fba），本轮复核仍成立；P1-8 崩溃留痕长期挂账（推荐本地环形日志+二维码扫码上报，手环全系不支持 fetch）；P1-4 designWidth=device-width 作者倾向不算缺陷；U-1 输入法真机 A/B/C 仍待回填。

## 待作者拍板（决定后更新本表）
1. ~~振动方向~~ → **已落地「保留振动」（加回声明 + try/catch），UX-10/15 关闭，无需再决策**。
2. **调试/实验页正式构建是否统一剔除？**（本轮又多 1 个 720 行 lab-add-course；决定 UX-9/UX-11/UX-13，并消解主 QA P1-13）
3. **胶囊正文字号档位**：是否允许 24/28px 替代正文 32（UX-21）？全站标题 38px 何时补（UX-4）？付费弹层 pro-card/premium-overlay 是否先拉到 ≥22（UX-5）？
4. **胶囊设置页说明文字**（UX-19）：保持隐藏，还是精简为 22px 单行显示关键项？

## 趋势速记（每轮量化对比）
| 指标 | 09-13 基线(f8f8920) | 09-14 00:17 | 09-14 06:17(033e12c) | 09-14 12:09(6cabb90) | 本轮变化 |
|---|---|---|---|---|---|
| 业务代码 HEAD / 版本 | 1.4.217 | 1.4.231 | 1.4.231 | **1.4.242 / code742** | 大变更（19 提交） |
| 空 fail 回调 | 31 | 32 | 32 | **29** | -3 |
| <22px 字号处数 | 347 | 299 | 299 | **276** | -23 |
| 标题38px / 正文32px | 0 / 47 | 0 / 45 | 0 / 45 | **0 / 48** | 标题档仍缺位 |
| 无效 shape:capsule | 33 | 37 | 37（35 文件） | **36（34 文件）** | -1 |
| if="{{" / display:none | 123 / 2 | 125 / 2 | 125 / 2 | **129 / 2** | if +4 |
| console.* | 140 | 142 | 142 | **142** | 持平 |
| min-height:100%（正式页/全仓） | — | 12 / — | 12 / 18 | **0 / 6（余者全在调试页）** | 正式页清零 |
| import vibrator / vibratemode 文件 | — | 3 / 4 | 3 / 4 | **3 / 2** | 收敛 |
| 调试页在正式路由 | 全部在 | 全部在 | 全部在 | **全部在且 +lab-add-course** | 未剔除反增 |
| src 体积 | ≈1.5M | ≈1.5M | ≈1.5M | **≈1.5M / 138 文件** | 持平 |
| UX 编号累计 | UX-1~14 | UX-1~16 | UX-1~20 | **UX-1~21（UX-10 关闭）** | 本轮 +1（UX-21） |
