# UX Officer 缺陷台账（本角色写 ｜ 作者只读）

> 想看「用户体验官报的问题哪些改了」只看本表。作者回复请写 `../HANDOFF/REPLY.md`（唯一入口），编号用 `UX-x`。
> 首份基线报告：`reports/UX-Report_2026-09-13_1433.md`（main `f8f8920` / v1.4.217）。
> 最新报告：`reports/UX-Report_2026-09-14_1809.md`（main `a9027bb` / **v1.4.253 / code753**，2026-09-14 18:09，**添加课程 V2 成新主链路 + 移除激活页 header + 胶囊字号整改**）。
> 状态图例：🔴 未修 ｜ 🟠 处理中/部分改善 ｜ 🟡 已修待验 ｜ 🟢 已验证修复 ｜ ⏸ 挂起 ｜ ⚪ 已关闭

| 编号 | 级别 | 问题 | 状态 | 与主 QA 的关联 / 剩余差距（含 09-14 18:09 轮量化） |
|---|---|---|---|---|
| UX-1 | P1 | 空 `fail(){}`，存储读写失败静默 | 🔴 | 29→**34 处**（+5：add-course-v2 3 处、lab-edit-course 2 处）；其中 add-course-v2 refreshCourseList 的静默无兜底另立 UX-25；主保存链路已安全，页面级仍待补 showToast |
| UX-2 | P2 | 演示数据硬编码占位「老师/教室」 | 🔴 | 仅剩 `data/database.js _doResetToDemoData` 12 门示例课写死「王老师/301教室」，用户「恢复演示数据」后需逐个改，建议标注「演示数据」或留空 |
| UX-3 | P2 | 添加成功 `router.back()` 后目标页可能不刷新 | 🟡 | 首页已切 add-course-v2，需对 **V2** 重走「保存→router.back→index-full onShow 立即出现」闭环；静态链路成立，待真机；关联主 QA P0-2 |
| UX-4 | P1 | 字号体系偏小、档位混乱 | 🟠 | <22px 276→**288**，**20px 达 201 处成绝对主力（仍低于底线22）**、18px 40；**标题38px 全站仍=0、正文32 仅 51**；正式页 11px 已清零（仅调试页6处，积极）；新页带入更多 18/20，胶囊正文停在 20–28；关联主 QA U-4 |
| UX-5 | P1 | 付费转化页字号偏小 | 🟠 **部分改善** | activation 经整改 **12–17px 已清零**，最小 20px×3、其上 24px×6；"12/13px 看不清"消除，残余 20px 并入 UX-4 统一跟踪，不再单列严重问题 |
| UX-6 | P2 | 顶栏时钟/星期字号偏小 | 🔴 | a9027bb 已隐藏状态栏秒数、day-nav 胶囊只显"总"（方向对）；clock-text/day-nav 仍 18–20px，建议 22~26；关联主 QA U-5 |
| UX-7 | P2（建议降 P3） | 无效媒体值 `(shape: capsule)` 残留 | 🔴 | 36→**39 处/37 文件**，但**单写 capsule 无合法 pill-shaped 兜底的文件=0**（全逗号并列，OR 中合法段独立命中，胶囊适配 100% 生效）；pill-shaped 47；capsule 纯冗余死值、不影响显示，有空删半截即可、不必为此发版；关联主 QA P1-1/P1-11 |
| UX-8 | P2 | 显隐以 `if` 销毁为主，display:none 仅 2 处 | 🔴 | if 129→**138**、display:none 仍 2；V2 时间选择弹层 timePicker 也用 if；黑屏前科，暂隐优先 display:none |
| UX-9 | P1 | 调试/实验页进正式包、断路由但文件残留、旧主页面变死页 | 🔴 | fcb60d6 断 bs-demo1~5/capsule-hide-test 路由但**区间删除文件=0、物理文件全残留**；新增 lab-edit-course（899行，lab-list「编辑胶囊版」进入，<22px×3/空fail×2）；**旧 pages/add-course 仍注册(manifest:60)但全仓 0 跳转=死页**；正式路由仍挂 device-info/vibration-lab/lab/black-screen-check/lab-settings/lab-add-course/lab-edit-course 共 7 个调试实验页；关联主 QA P1-7/U-12/P0-9 |
| UX-10 | P1 | 「删除振动」不彻底 | ⚪ **已关闭（方向变更）** | 作者最终选**保留按键振动**：加回 manifest 声明、onVibrate 加 try/catch，「删不干净」前提不成立 |
| UX-11 | P2 | 包体积余量偏紧 | 🔴 | src≈**1.5M / 140 文件**，距 rpk 解压 2MB 红线余量有限；剔除 UX-9 残留/死页/实验页可直接释放 |
| UX-12 | P3 | console 日志、logLevel=log | 🔴 | **142**（持平），发布建议降 error（末尾简列） |
| UX-13 | P3 | 根目录临时脚本/文件未清理 | 🔴 | fix_capsule_*.py/audit_capsule.py/capsule_audit.txt 等仍在，发布前清理 |
| UX-14 | P3 | minPlatformVersion=1000 偏低 | 🔴 | 未变，建议抬高或 JS 宽高比兜底 |
| UX-15 | P1 | manifest 删振动声明但代码仍调、onVibrate 无保护 | 🟢 **代码已修·待真机** | manifest 加回 system.vibrator、onVibrate try/catch、vibratemode 收敛。**待真机验证按键振动正常不报错**（29e6f1b） |
| UX-16 | P2 | 二级页根块缺 width:100%、冗余 min-height | 🟢 **代码已修** | 正式二级页根块均有 width:100%；min-height:100% 仅剩 6 处且全在调试页，正式页清零（29e6f1b）；关联主 QA P1-14 |
| UX-17 | P0 | 二维码生成器输入最多 5 字、第 6 字起静默无反应 | 🟢 **代码已修·待真机** | qrcode-generator 补 chinese_input_maxlen=100 + 触顶 toast。**待真机验证可超 5 字**（29e6f1b）；交叉主 QA P0-11（建议同步转🟢） |
| UX-18 | P1（胶囊优先） | 输入法回调 this 丢失→screenWidth 恒 336、缺 watch | 🟢 **代码已修·待真机** | self=this + fail 兜底 + $watch("screentype") + pill-shaped 分支齐备。**待米环9/10 真机验证候选栏不偏移**（29e6f1b）；交叉主 QA P1-10（建议转🟢）、缓解 U-1 |
| UX-19 | P2 | 设置页胶囊块隐藏全部栏目说明 | 🔴（作者主动决策待确认） | settings 胶囊块（:817 起，已并列 pill-shaped）:846-847 仍 .row-hint{display:none}，10 项说明胶囊不可见；主 QA P1-15 认为真根因是 flex 挤压；作者连续两轮选择隐藏，**待拍板保持隐藏还是 22px 单行** |
| UX-20 | P1（胶囊优先） | 5 处固定宽度超胶囊物理宽 | 🟢 **代码已修·待真机** | welcome/schedule-qrcode/add-course/detail 胶囊块均收窄 + max-width:100%。**待真机验证不溢出**（29e6f1b）；交叉主 QA P1-12；**新页 V2 重现同类→见 UX-22** |
| UX-21 | P2（胶囊优先） | 胶囊添加页字号档低于「正文 32」基准 | 🔴 | 旧 add-course 胶囊 36/34→30（旧页已无入口见 UX-9）；**新 V2 胶囊 time-val 28、按钮 24、time-label 18、mgmt-btn 20**；作者倾向胶囊更小档，需拍板胶囊正文是回 32 还是正式确认特例档并写入规范；是 UX-4 的具体化 |
| **UX-22** | **P1（胶囊优先，待真机，严重可升 P0）** | 【09-14 18:09 新增】添加课程 V2 主链路胶囊横排固定宽度必然超宽 | 🔴 | add-course-v2：time-row 双 time-box 胶囊各130×2+sep≈304、bottom-bar 取消100+确认200=300，均远超胶囊内容宽≈160；首页「+」已全切 V2，每次添加必遇，可能挤出/点不到「确认添加」。修：胶囊块 time-row/bottom-bar 纵排或 flex:1+max-width:160；对照 welcome 单按钮160纵排。关联主 QA P1-12、UX-20 |
| **UX-23** | **P1（胶囊优先，待真机定级）** | 【09-14 18:09 新增】激活页移除固定 header 后页面内无任何返回入口 | 🔴 | 69c99af 后 activation.ux 无 back-btn/goBack/router.back/onBackPress（其他5个正式二级页都有5~7个返回元素）；付费页仅靠硬件返回/侧滑，与全站不一致、有被困感。修：补紧凑◀或 onBackPress 兜底；若全机型硬件返回稳定可降 P2。待作者拍板 |
| **UX-24** | **P2** | 【09-14 18:09 新增】V2 缺结束时间晚于开始校验，可存倒挂课 | 🔴 | confirmTimePick/updateTimeString/saveCourse 均不比较 start/end，可存「10:00-09:00」致课表排序/时长异常；修：保存前比较分钟数并 toast 拦截 |
| **UX-25** | **P2（待真机）** | 【09-14 18:09 新增】V2 选课列表两套加载逻辑，onShow 的 refreshCourseList 静默无兜底 | 🔴 | loadCourses(:274) catch/fail 都回退 defaultCourses；onShow 调的 refreshCourseList(:249) catch(e){}(:261)+空fail(:264) 无兜底，存储异常时"选择课程"横滑列表为空且无提示；修：复用 loadCourses 兜底或合并 |

## 第 6 轮主链路结论（09-14 18:09，1.4.253/a9027bb）
- **添加课程 V2（add-course-v2，822行）保存链路静态走查无 P0**：isSaving 防重复、课程名/时间前置校验 toast、setDefaultDay 兜底、nextId 持久化、insertCourse 成功 toast「课程已添加」+router.back、失败 toast「保存失败请重试」并复位 isSaving；中文输入回填 onShow 读 chinese_input_result 后 delete、位置 maxlen=10；时间步进5分钟、星期默认当天。首页 bottom-buttons openAddCoursePage 已全切 /pages/add-course-v2（success/fail 都跳）。
- **新增问题集中在胶囊布局（UX-22）与激活页返回（UX-23）**，另两条 P2 为数据校验/加载兜底。
- **积极信号**：正式页 11px 清零；line-height 声明增至 591；activation 12–17px 清零；首页 a9027bb 用运行时 isCapsule 精简（day-nav 只显总、隐藏秒数、课程名时间同行 shortenTime）且主「+」入口始终保留、标准版添加入口无阻断。
- **清理名不副实**：fcb60d6 声称删 bs-demo/capsule-hide-test，但区间 0 删除文件，物理文件残留；旧 add-course 切换 V2 后成注册死页（见 UX-9）。

## 主 QA 台账交叉复核结论（09-14 18:09；主 QA STATUS 仍停第 11 轮 d9b9bf6/1.4.209，已滞后两轮）
- 主 QA P0-11↔UX-17、P1-10↔UX-18、P1-12↔UX-20、P1-14↔UX-16：均已被 29e6f1b 处理，**维持建议主 QA 转🟢**；注意 P1-12 在新页 V2 重现为 UX-22。
- 主 QA P1-11（capsule 是无效死值、465 条声明从未生效）：**现状已变化**——当前 39 处 capsule 全部逗号并列了合法 pill-shaped、0 处单写，胶囊样式实际已生效；剩余仅"capsule 冗余值未删"，严重度从 P1 降为整洁项（本角色 UX-7 建议降 P3）。
- P0-10/P1-7 已建议转🟢（5dc8fba）；P1-8 崩溃留痕长期挂账（本地环形日志+二维码扫码上报，手环全系不支持 fetch）；P1-4 designWidth=device-width 作者倾向不算缺陷；U-1 输入法真机 A/B/C 仍待回填。REPLY.md 最新到第 9 轮（29e6f1b），**无新增对 UX-x 的回复、无"不打算做"**。

## 待作者拍板（决定后更新本表）
1. ~~振动方向~~ → 已落地「保留」，UX-10/15 关闭。
2. **胶囊正文字号档位（UX-4/UX-21）**：坚持正文 32，还是正式认可胶囊特例档（如正文28、底线22不动）？标题 38 全站何时补？
3. **UX-23 激活页返回**：接受"仅硬件返回"还是补紧凑◀返回钮？
4. **UX-19 胶囊设置项说明**：保持全部隐藏，还是 22px 单行保留关键项？
5. **UX-9/UX-11 清理范围**：bs-demo1~5/capsule-hide-test 残留物理文件、已无入口的旧 add-course、lab-add-course/lab-edit-course 实验页，哪些发正式 rpk 前连文件删除？
6. **UX-24 是否加时间倒挂校验**（建议加，改动小）。

## 趋势速记（每轮量化对比）
| 指标 | 09-13 基线 | 09-14 00:17 | 09-14 06:17 | 09-14 12:09(6cabb90) | **09-14 18:09(a9027bb)** |
|---|---|---|---|---|---|
| 业务代码 HEAD / 版本 | f8f8920/1.4.217 | 1.4.231 | 033e12c/1.4.231 | 6cabb90/1.4.242/code742 | **a9027bb/1.4.253/code753** |
| 空 fail 回调 | 31 | 32 | 32 | 29 | **34** |
| <22px 字号处数 | 347 | 299 | 299 | 276 | **288（20px=201 主力）** |
| 正式页 11px | — | — | — | 有 | **0（仅调试页6处）** |
| 标题38px / 正文32px | 0 / 47 | 0 / 45 | 0 / 45 | 0 / 48 | **0 / 51** |
| 无效 shape:capsule（单写无pill） | 33 | 37 | 37 | 36（34文件） | **39（37文件）/ 单写=0** |
| if="{{" / display:none | 123 / 2 | 125 / 2 | 125 / 2 | 129 / 2 | **138 / 2** |
| console.* | 140 | 142 | 142 | 142 | **142** |
| line-height 声明 | — | — | — | — | **591（持续补，积极）** |
| min-height:100%（正式页/全仓） | — | 12/— | 12/18 | 0/6（调试页） | **0/6（未变）** |
| 调试/实验页在正式路由 | 全在 | 全在 | 全在 | +lab-add-course | **7 个；旧add-course成死页、bs-demo物理残留** |
| src 体积 / 文件数 | ≈1.5M | ≈1.5M | ≈1.5M | ≈1.5M/138 | **≈1.5M/140** |
| UX 编号累计 | UX-1~14 | UX-1~16 | UX-1~20 | UX-1~21 | **UX-1~25（UX-10 关闭）** |
