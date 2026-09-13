# UX Officer 缺陷台账（本角色写 ｜ 作者只读）

> 想看「用户体验官报的问题哪些改了」只看本表。作者回复请写 `../HANDOFF/REPLY.md`（唯一入口），编号用 `UX-x`。
> 首份基线报告：`reports/UX-Report_2026-09-13_1433.md`（main `f8f8920` / v1.4.217）。
> 最新报告：`reports/UX-Report_2026-09-14_0017.md`（main `033e12c` / v1.4.231 / code731，2026-09-14 00:17）。
> 状态图例：🔴 未修 ｜ 🟠 处理中/部分改善 ｜ 🟡 已修待验 ｜ 🟢 已验证修复 ｜ ⏸ 挂起 ｜ ⚪ 已关闭

| 编号 | 级别 | 问题 | 状态 | 与主 QA 的关联 / 剩余差距（含 09-14 轮量化） |
|---|---|---|---|---|
| UX-1 | P1 | 空 `fail(){}`，存储读写失败静默 | 🔴 | 31→**32 处**，基本未清；集中 custom-content-edit(9，saveAll 的 success/fail 全空)、chinese-input(-full)(5+5)、add-course(3)。主 QA 已修关键路径，页面级仍待补 showToast |
| UX-2 | P2 | 快速添加/预设课硬编码占位「老师」与固定时间 | 🔴 | 主 QA 未覆盖，维持 |
| UX-3 | P2 | 添加成功 `router.back()` 后目标页可能不刷新 | 🟡 | index-full onShow 有 refreshClasses 刷新链、week-view onShow 除首次外都 loadData，**代码层已具备刷新**，待真机走「添加→保存→返回」闭环；关联主 QA P0-2 |
| UX-4 | P1 | 字号体系失控、整体偏小 | 🟠 | <22px 347→**299**（清掉一批极小字），但仍 24 档、**标题38px=0 处、正文32仅45**，主力仍 24/28/20，未向 38/32/26/22 收敛；关联主 QA U-4 |
| UX-5 | P1 | 付费转化弹层字号偏小 | 🟠 | **unlock-dialog 最小 12→20 已达标**；但 pro-card 仍 12px×4+13、premium-overlay 仍 12/13/14，剩两个组件待拉到底线以上 |
| UX-6 | P2 | 顶栏 clock(18)/day-nav(20) 字号偏小 | 🔴 | 未变，建议 22~26；关联主 QA U-5 |
| UX-7 | P2 | 无效媒体值 `(shape: capsule)` 残留 | 🔴 | 33→**37 处**（本轮新改动又带入），靠并列 pill-shaped 侥幸命中，建议只留 pill-shaped；关联主 QA P1-1 |
| UX-8 | P2 | 显隐以 `if` 销毁为主，display:none 仅 2 处 | 🔴 | if 123→**125**、display:none 仍 2，黑屏前科，建议暂隐用 display + 宽高比兜底 |
| UX-9 | P1 | 调试/实验页注册进正式路由 | 🔴 | **bs-demo1~5/black-screen-check/capsule-hide-test/vibration-lab/lab/lab-settings/device-info/chinese-input-full 全部仍在**，一个未剔除；关联主 QA P1-7/U-12/P0-9 |
| UX-10 | P1 | 「删除振动」不彻底 | 🔴 | manifest 已删 vibrator/alarm 声明，但 vibration-lab 页仍在、3 文件仍 import vibrator、2 输入页仍传 vibratemode；与 **UX-15 联动收口**；关联主 QA P0-9 |
| UX-11 | P2 | 包体积余量偏紧（输入法词典/组件约 180K+） | 🔴 | src 1.5M，距 2MB 红线余量有限；剔除 UX-9 调试页、按形态裁剪键盘可释放 |
| UX-12 | P3 | console 日志、logLevel=log | 🔴 | 140→**142** 处，发布建议降 error（末尾简列） |
| UX-13 | P3 | 根目录临时脚本/文件未清理 | 🔴 | **不减反增**：新增 fix_capsule_*.py/audit_capsule.py/capsule_audit.txt 等，且根 `doc/` 被重建（与 doc→docs 合并反复） |
| UX-14 | P3 | minPlatformVersion=1000 偏低 | 🔴 | 未变，建议抬高或 JS 宽高比兜底 |
| **UX-15** | **P1（真机或升 P0）** | **【09-14 新增·本轮头号】manifest 已删 system.vibrator 声明但代码仍调用；中文输入/昵称编辑传 vibratemode=short、onVibrate 无 try/catch，落在每次按键主路径** | 🔴 | InputMethod.ux:341/789-792（5 处按键调用、无保护）；chinese-input.ux:20、nickname-edit.ux:22 传 short；activation.doVibrate 已 try/catch 安全。真机连续按键一验即知，复现即 P0；是 UX-10 升级形态 |
| **UX-16** | P2 | **【09-14 新增】12 个正式二级页根块有 height:100% 但缺 width:100%、冗余 min-height，横向塌缩残余** | 🔴 | activation/backup-restore/chinese-input(-full)/device-info/donate/homepage-settings/nickname-edit/pinned-pages/reset-data/template-picker/vibration-lab；index-full/welcome 为正确范本，纯样式补 width 即可 |

## 待作者拍板（决定后更新本表）
1. **振动方向（同时决定 UX-15/UX-10，最高优先）**：保留按键震动→加回 `system.vibrator` 声明；彻底删除→删 vibratemode 传参 + 3 处 import/调用 + vibration-lab 页。拍板前建议先给 InputMethod.onVibrate 补 try/catch 防按键报错。
2. bs-demo*/capsule-hide-test/black-screen-check/vibration-lab 等纯调试页，正式构建是否直接剔除？（决定 UX-9/UX-11）
3. 字号一次性全局收敛到 38/32/26/22，还是先改「付费弹层(pro-card/premium-overlay) + 胶囊高频页」？（决定 UX-4/UX-5 节奏）

## 趋势速记（每轮量化对比）
| 指标 | 09-13 基线(f8f8920) | 09-14(033e12c) | 变化 |
|---|---|---|---|
| 空 fail 回调 | 31 | 32 | +1（未清） |
| <22px 字号处数 | 347 | 299 | -48（略改善） |
| 标题38px / 正文32px | 0 / 47 | 0 / 45 | 标题档仍缺位 |
| 无效 shape:capsule | 33 | 37 | +4（反弹） |
| if="{{" / display:none | 123 / 2 | 125 / 2 | 基本持平 |
| console.* | 140 | 142 | +2 |
| 调试页在正式路由 | 全部在 | 全部在 | 未剔除 |
