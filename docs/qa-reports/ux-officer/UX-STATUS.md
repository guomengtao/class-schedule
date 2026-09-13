# UX Officer 缺陷台账（本角色写 ｜ 作者只读）

> 想看「用户体验官报的问题哪些改了」只看本表。作者回复请写 `../HANDOFF/REPLY.md`（唯一入口），编号用 `UX-x`。
> 首份基线报告：`reports/UX-Report_2026-09-13_1433.md`（main `f8f8920` / v1.4.217）。
> 最新报告：`reports/UX-Report_2026-09-14_0617.md`（main 业务代码 `033e12c` / v1.4.231 / code731，2026-09-14 06:17）。
> 状态图例：🔴 未修 ｜ 🟠 处理中/部分改善 ｜ 🟡 已修待验 ｜ 🟢 已验证修复 ｜ ⏸ 挂起 ｜ ⚪ 已关闭

| 编号 | 级别 | 问题 | 状态 | 与主 QA 的关联 / 剩余差距（含 09-14 06:17 轮量化） |
|---|---|---|---|---|
| UX-1 | P1 | 空 `fail(){}`，存储读写失败静默 | 🔴 | 31→32→**32 处**（两轮持平）；集中 custom-content-edit(9)、chinese-input(-full)(5+5)、add-course(3)、schedule-manager/homepage-settings/course-manager(各2)、app.ux(2)、index-full/detail(各1)。主保存链路已安全，页面级仍待补 showToast |
| UX-2 | P2 | 快速添加/预设课硬编码占位「老师」与固定时间 | 🔴 | course-manager.ux:36-45 仍在，主 QA 未覆盖，维持 |
| UX-3 | P2 | 添加成功 `router.back()` 后目标页可能不刷新 | 🟡 | 代码层已具备刷新链（index-full onShow refreshClasses、week-view onShow loadData），待真机走「添加→保存→返回」闭环；关联主 QA P0-2 |
| UX-4 | P1 | 字号体系失控、整体偏小 | 🟠 | <22px 347→299→**299**（两轮持平），仍 24 档、**标题38px=0、正文32仅45**，主力仍 28(253)/24(248)/20(101)，未向 38/32/26/22 收敛；关联主 QA U-4 |
| UX-5 | P1 | 付费转化弹层字号偏小 | 🟠 | unlock-dialog 已达标；**pro-card 最小仍 12px×3、premium-overlay 仍 12/13px**（06:17 复核未变），剩两组件待拉到底线 22 以上 |
| UX-6 | P2 | 顶栏 clock(18)/day-nav(20) 字号偏小 | 🔴 | 未变，建议 22~26；关联主 QA U-5 |
| UX-7 | P2 | 无效媒体值 `(shape: capsule)` 残留 | 🔴 | 33→37→**37 处/35 文件**（两轮持平），并列 pill-shaped(44 处) 侥幸命中，建议只留 pill-shaped；关联主 QA P1-1/P1-11 |
| UX-8 | P2 | 显隐以 `if` 销毁为主，display:none 仅 2 处 | 🔴 | if 123→125→**125**、display:none 仍 2，黑屏前科，建议暂隐用 display + 宽高比兜底 |
| UX-9 | P1 | 调试/实验页注册进正式路由 | 🔴 | **chinese-input-full/device-info/vibration-lab/lab/lab-settings/black-screen-check/bs-demo1~5/capsule-hide-test 全部仍在**（06:17 复核 manifest:81-145 一个未剔除）；关联主 QA P1-7/U-12/P0-9 |
| UX-10 | P1 | 「删除振动」不彻底 | 🔴 | manifest 已 0 声明，但仍 3 文件 import vibrator、4 文件出现 vibratemode；与 **UX-15 联动收口**；关联主 QA P0-9 |
| UX-11 | P2 | 包体积余量偏紧 | 🔴 | src≈1.5M，距 2MB 红线余量有限；剔除 UX-9 调试页、按形态裁剪键盘可释放 |
| UX-12 | P3 | console 日志、logLevel=log | 🔴 | 140→142→**142**（两轮持平），发布建议降 error（末尾简列） |
| UX-13 | P3 | 根目录临时脚本/文件未清理 | 🔴 | fix_capsule_*.py/audit_capsule.py/capsule_audit.txt 等仍在，发布前清理 |
| UX-14 | P3 | minPlatformVersion=1000 偏低 | 🔴 | 未变，建议抬高或 JS 宽高比兜底 |
| UX-15 | P1（真机或升 P0） | manifest 已删 system.vibrator 声明但代码仍调用；onVibrate 无 try/catch，落在每次按键主路径 | 🔴 | 06:17 复核：InputMethod.ux:341 import、onVibrate:789-791 无保护，被 :481/515/729/744/801 **5 处按键主路径**调用；chinese-input.ux、nickname-edit.ux 仍传 vibratemode=short；activation.doVibrate 已 try/catch 安全。建议拍板前先补 try/catch 止血；是 UX-10 升级形态 |
| UX-16 | P2 | 12 个正式二级页根块有 height:100% 但缺 width:100%、冗余 min-height | 🔴 | 06:17 逐页实测 12 页 width:100% 命中数**全为 0**、均仍带 min-height（activation/backup-restore/chinese-input(-full)/device-info/donate/homepage-settings/nickname-edit/pinned-pages/reset-data/template-picker/vibration-lab）；范本 index-full/welcome；关联主 QA P1-14（全仓 min-height:100% 18 处） |
| **UX-17** | **P0** | **【09-14 06:17 新增·本轮唯一 P0】二维码生成器输入文本最多 5 字，第 6 字起按键静默无反应、无提示** | 🔴 | qrcode-generator.ux:121-124 openInput 只设 chinese_input_return_key、**漏设 chinese_input_maxlen**，chinese-input 默认 maxlen=5 触顶静默 return。修法：补 set maxlen(如100)+触顶 toast。**交叉主 QA P0-11（同根因，1.4.231 复核仍未修）**；与 UX-1 同源 |
| **UX-18** | **P1（胶囊优先，真机或升 P0）** | **【09-14 06:17 新增】输入法 adjustScreenWidth 普通 function 回调 this 丢失→screenWidth 恒 336；且缺 `$watch("screentype")`，胶囊屏键盘候选栏偏移/右侧出屏** | 🔴 | InputMethod.ux:808-817（回调内 this 不指向组件，须 var self=this，禁用箭头函数）、:469-471（只 watch hide/maxlength/keyboardtype）、默认 336 在 :407；偏移公式 (screenWidth-192)/2 见 :265/266/303/323，米环9(192) 被多偏 72px。**交叉主 QA P1-10（同根因，1.4.231 复核仍未修）** |
| **UX-19** | **P2** | **【09-14 06:17 新增】设置页胶囊块 .row-hint{display:none} 整体隐藏栏目说明** | 🔴 | settings.ux:803 已并列合法值 pill-shaped（块能命中），:832-834 隐藏 row-hint。主 QA **P1-15 原「label 挤掉右侧、overflow 裁切」错乱已规避**，转为胶囊屏丢失全部栏目解释（栏目时间/云端备份/实验性功能/胶囊屏适配等不可见）。建议关键说明并入 label 或用底线 22px 单行精简 |
| **UX-20** | **P1（胶囊优先）** | **【09-14 06:17 新增】5 处基础层固定宽度 > 胶囊屏物理宽(192/212)，首屏主按钮/二维码横向溢出** | 🔴 | welcome.ux:211=**220px**(主按钮)、welcome.ux:272=200、schedule-qrcode.ux:29=200×200、add-course.ux:613=200、detail.ux:710=200。建议改 width:100%+max-width 或 pill-shaped 块收到 ≤160px。**交叉主 QA P1-12（同 5 处，1.4.231 复核仍未修）** |

## 主 QA 台账交叉复核结论（09-14 06:17，在 1.4.231/033e12c 上）
- **主 QA P0-10（编辑/删除假成功）→ 建议 🟢**：data/database.js updateCourseStorage(:291-311) 与 deleteCourseStorage(:339-358) 均已有 `var hit=false / hit=true / if(!hit) callback(formatError(...,"课程不存在"))`，当前代码已落地（主 QA 第 11 轮台账基于更旧 d9b9bf6 标未修，已滞后）。
- **主 QA P1-7（实验室课程详情入口）→ 建议 🟢**：lab-list.js grep「课程详情 / /pages/detail」均为空，入口已删。
- 主 QA P0-11 / P1-10 / P1-12 / P1-15 在当前代码的状态分别见 UX-17 / UX-18 / UX-20 / UX-19。
- 主链路（添加/编辑/删除）复核健壮：add-course:482/486/511/515、detail:545/559/563/566/571-590 前置校验+二次确认+成败 toast 齐全。

## 待作者拍板（决定后更新本表）
1. **振动方向（同时决定 UX-15/UX-10，最高优先）**：保留按键震动→加回 `system.vibrator` 声明；彻底删除→删 vibratemode 传参 + 3 处 import/调用 + vibration-lab 页。拍板前建议先给 InputMethod.onVibrate 补 try/catch 防按键报错。
2. bs-demo*/capsule-hide-test/black-screen-check/vibration-lab 等纯调试页，正式构建是否直接剔除？（决定 UX-9/UX-11，并消解主 QA P1-13）
3. 字号一次性全局收敛到 38/32/26/22，还是先改「付费弹层(pro-card/premium-overlay) + 胶囊高频页」？（决定 UX-4/UX-5 节奏）

## 趋势速记（每轮量化对比）
| 指标 | 09-13 基线(f8f8920) | 09-14 00:17(033e12c) | 09-14 06:17(033e12c) | 变化 |
|---|---|---|---|---|
| 业务代码 HEAD | 1.4.217 | 1.4.231 | 1.4.231 | 本轮零业务变更 |
| 空 fail 回调 | 31 | 32 | 32 | 持平 |
| <22px 字号处数 | 347 | 299 | 299 | 持平 |
| 标题38px / 正文32px | 0 / 47 | 0 / 45 | 0 / 45 | 标题档仍缺位 |
| 无效 shape:capsule | 33 | 37 | 37（35 文件） | 持平 |
| if="{{" / display:none | 123 / 2 | 125 / 2 | 125 / 2 | 持平 |
| console.* | 140 | 142 | 142 | 持平 |
| min-height:100% | — | 12（根块） | 18（全仓） | 口径一致下持平 |
| import vibrator / vibratemode 文件 | — | 3 / 4 | 3 / 4 | 持平 |
| 调试页在正式路由 | 全部在 | 全部在 | 全部在 | 未剔除 |
| UX 编号累计 | UX-1~14 | UX-1~16 | **UX-1~20** | 本轮 +4（17/18/19/20） |
