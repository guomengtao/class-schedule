# 长期记忆

## 项目
- Ev课程表（小米手环快应用，快应用/Vela），包名 `com.application.watch.classschedule`
- 评分体系文档：`docs/标准版完善度综合评分.md`；守护手册：`docs/标准版100分评分标准.md`
- 姊妹文档：胶囊屏专项走查报告、标准版对高级版控制方式、项目完善度分析、Ev课程表_手环字号规范_v1
- `manifest.json` 的 `deviceTypeList` 只能是 `["watch"]`（Vela 官方《项目配置》：可选 watch/tv/car/phone，现仅支持 watch；`band` 非法）
  - 注：aiot-toolkit 不校验取值，写 `band` 也能构建并额外生成 `manifest-band.json`；仓库历史里为"手环11装不上"曾加过 `band`，属推测性方案，非官方取值。若手环11再次出现"装完找不到图标"，可临时加回 `band` 做 A/B 验证
  - **实测（2026-09-25）**：手环 11 与手环 9 的 `device.getInfo().deviceType` 均返回 **`band`**。注意区分两个概念：`deviceTypeList` 是 manifest 的*声明*，`deviceType` 是设备*自报*；两者不一致实测**不阻断安装与运行**（应用已装上并跑通激活页），但运行时是否触发能力限制（组件/API 白名单）暂无证据
- `manifest.json` 的 `router._groups` / `pages[*].group` / `pages[*].name_cn` 是**自定义元数据**（官方只认 component/path/launchMode），当前被忽略但必须与 `router.pages` 保持同步：分组里列了未注册页、或注册页未进分组，都会误导维护者。改动路由后务必同步

## 当前状态（2026-09-19）
- 标准版综合评分 **100 / 100**，八个维度全部满分（第十一轮）
- 后续重点是**防回退**，不是冲分；改动前对照守护手册的红线清单

## 关键设计约定（用户确认，务必遵守）
- **字号设置只作用于「首页课程卡片」**，这是有意设计，不是缺陷。其他页面使用固定字号（保证按钮 ≥48px、行高 1.2×字号、胶囊屏 192px 不溢出）
- 设置项 UI 必须声明范围：标题「首页课程字号」+ 说明「仅影响首页课程卡片，其他页面为固定字号」
- **不要做全局字号联动**——会同时拖累字号控制合规性、胶囊屏文字可读性、布局与触控三个维度

## 跑道屏设备实测参数（2026-09-25）
两台跑道屏设备的 `device.getInfo()` 实测值（取自激活 URL，字段含义见 `src/pages/activation/activation.ux:429-440` 的 `fetchDeviceInfo()`）：

| 设备 | screenShape | screenWidth | screenHeight | deviceType | platformVersionCode | APILevel | osVersionCode | 实测版本 |
|---|---|---|---|---|---|---|---|---|
| 小米手环 11 | pill-shaped | **212** | **520** | band | 1200 | 2 | 0 | 1.6.59（channel `g`） |
| 小米手环 9 | pill-shaped | **192** | **490** | band | 1200 | 2 | 198145 | 1.6.100（channel `t-9p-d`） |
| 小米手环 10 Pro | rect（既有设计基准 336×480） | 336 | 480 | 未采集 | — | — | — | 未采集 |

关键事实：
- 跑道屏设备的 `screenShape` 返回 **`pill-shaped`**；而项目多个页面又同时接受 `capsule`（`index.ux` / `week-view.ux` / `course-manager.ux` 都写 `capsule || pill-shaped`），说明**两种值在真机上都出现过** → 任何屏型归一化都必须同时认这两个；而 `device-info.ux` 的 `screenShapeMap` 目前**不认识 `capsule`**，取证时会误判
- **手环 11 宽 212px**，是项目首次出现的胶囊宽度。所有胶囊规范（字号阶梯、`week-view` 列宽 `160 ÷ cellWidth`、192px 居中算法）都按 **192** 定标；212 比基准宽 **10.4%**，需要单独评估
- 手环 11 的 `osVersionCode = 0`（未返回），说明新机型 ROM 字段完整度不同 → 不要假设 `getInfo` 字段一定存在

### ⚠️ 输入法在跑道屏上「点页面即重启」的根因结论（2026-09-25）
- 症状是**系统级复位**（手环 9 实测：点进输入法页直接重启，不是"看不见键盘"）→ 凡"重启"类问题不要往布局方向查
- **首因 W1：进页面即同步全量初始化**。`dicUtil.js:490-491` 注释承诺"由 InputMethod.ux 在 onInit 中 setTimeout 延迟调用"，**实现是同步直调**（`InputMethod.ux:417-421` → `_ensureDictInit()` → `initDict()` 无 setTimeout）；而 `chinese-input.ux:35` 传 `hide="{{ false }}"` 使 `if (!this.hide)` 成立 → 进页面瞬间同步构建 `py2hz`(6763) + `romaji2kanji` + `syllableSet`+`py2hz2` + `words`(3000) + `initialsIndex`(815行)，**只有 `_buildForwardIndex` 分片**；叠加同帧模板首建 200+ 节点/60+ PNG → 阻塞（看门狗）或 OOM
- **次因 W2：`InputMethod.ux:231` 胶囊分支独有的 `progress type="arc"` + 负 `total-angle:-48deg`**（方屏是线性 progress、圆屏无 progress）→ 严格只影响跑道屏
- 教训：**注释声称的"懒加载/延迟初始化"必须回代码复核**，本仓已出现注释与实现漂移
- **✅ 已落地修复（2026-09-25）**：①`dicUtil.js` 的 `initDict()` 改为分步流水线（`_initBaseTables` → `_buildPy2hz2` 每片 800 键 → `_buildWordTables`，每步 `setTimeout(…,0)`，语义仍是整本词典只是摊到约 10 个 tick）②`chinese-input.ux` 的 `hide` 改绑 `keyboardHidden`（初值 true，`onReady` 里延时展开）让"模板首建"与"词典初始化"分帧 ③移除 `InputMethod.ux` 胶囊分支独有的 `progress type="arc" total-angle:-48deg` 并清掉 `percent66`
- 副作用：胶囊屏键盘下方弧形进度指示消失（原参数留在模板注释里便于 A/B 恢复）；词典就绪前输入短暂无候选（有守卫安全降级）
- ⚠️ **该修复尚未经真机验证**：用户复测仍重启，且真机 `r=1.6.100`（仓库已 1.6.103）→ 极可能**没装新包**；且本修复只覆盖"单帧阻塞"，覆盖不到下面两条新候选
- **新候选 W3 并发 storage I/O（首推）**：`settings.ux:351-360` 点昵称先发 **5 个并发 `storage.set`**，进页面 `chinese-input.ux:97-117` 又 **5 个并发 get** + `getTheme`/`getThemeName` = **7 次并发读**；与 `docs/settings-xiaomi-band9pro-analysis.md`"RTOS 存储 I/O 不支持高并发"同源。修复预案：5 个 key 合并成一个 JSON（并发 4→1）+ 串行化
- **新候选 W4 内存总量 OOM**：分片只摊时间不减总量（6763 单字 + 3000 词 + 倒排 ×2 + 61 PNG + 200 节点照旧驻留）。判据："先看到键盘再重启"即 OOM。修复预案：裁剪词典 / 延后到首次按键 / 移除 `getDictJp` / 改纯文字键盘
- **排查重启问题的三条线**：阻塞（看门狗）／内存总量（OOM）／存储并发 I/O —— 不要只针对一条修
- 每次复测前**先确认真机装机版本号与仓库一致**（`r` 参数即包内 versionName；也可在页面显示 versionName）
- **待真机回归**：手环 9 / 11 进输入法页不再重启、10 Pro 仍正常；若 9 仍重启则 W1/W2 均非元凶，需抓 `adb logcat`
- 诊断手段备查：把 `hide` 临时改 `true` / 屏蔽 arc progress / 抓 logcat
- **一次性诊断页（2026-09-25 新建）**：`src/pages/input-crash-diag/input-crash-diag.ux`（工具 → 输入法崩溃诊断）。设计初衷 = 测试机在用户手上、机会极少，必须"一次装机榨干信息"。机制：storage `input_diag_step` 执行前写入/完成后清空 → **重启后打开页面顶部直接显示"上次崩在第 N 步"**；`input_diag_passed` 记录已通过步骤。有「★ 一键跑全部」自动串行 1→5（间隔 800ms）+ 单步按钮 + 清空记录。5 项：并发写×5 / 并发读×7 / 建键盘不加载词典 / 加载词典 / 跳转真实输入页
- 配套：`InputMethod.ux` 新增诊断 prop **`dictlazy`**（默认 false，为 true 时 `_ensureDictInit` 直接 return），用于分离"UI/PNG 崩溃"与"词典内存崩溃"
- 该模式可复用：凡"可能崩溃 + 真机机会少"的排查，都按 `device-id-diagnosis.ux` 的"落盘进度→延时→执行→清空"套路做诊断页，不要靠反复改代码出包

### ⭐ 输入法重启实测定案（2026-09-25，推翻前面所有假设）
- 实测：**第 1 步（并发写×5）通过、第 2 步（并发读×7）通过、第 3 步（建键盘，dictlazy=true 不加载词典）崩溃**
- **真凶 = pill 分支「键盘 UI 渲染本身」**；以下**全部排除**：W3 并发 storage I/O（1、2 全过）、W4 词典内存 OOM（第 3 步没加载词典）、W1 单帧阻塞、W2 arc 进度条（移除后仍崩）
- pill 分支构成：26 个 `.calbtn66`（60×60 + border 3px + radius 30px）、7~8 张 arc PNG、2 个 `scroll-x`、3 层 `position:absolute`、固定 height 305px。嫌疑序：圆角描边 text > PNG > 嵌套 scroll-x > 绝对定位
- 第二轮已在诊断页实现 **A~F 元素级细分**（纯文本/圆角描边/横滚/PNG/绝对定位/完整键盘对照）+ 精简版二维码回传（`dg`=崩在第几步.已通过）
- **教训**：前面连续三轮假设（布局→阻塞→存储并发→词典内存）全错，问题在"渲染键盘 UI"这一层。**先做可隔离的实测二分，不要凭代码推断连续猜方向**

## 胶囊屏（192px 宽）硬约束
- `week-view` 可视列数须 ∈ [2.5, 3.5]（`160 ÷ cellWidth`）；胶囊屏关闭行号列（`rowNumWidth = 0`），`cellWidth ≤ 60`
- 按钮高度 ≥48px。遇到"放不下"先检查元素是否真在同一排（如 `index` 总/今/明 已下移到 `nav-toolbar`），不要直接接受 44px
- 屏型由 `device.getInfo` 异步探测，探测后需重新应用依赖屏型的配置

## 数据层约定
- 跨星期更新必须单次原子写盘（`updateCourseAcrossDays`），禁止"先删后插"
- `JSON.parse` 必须 `try/catch` + 兜底（全项目 41 处已全量保护）
- 删除必须二次确认 + 5 秒撤销（撤销要写回存储，定时器在 `onDestroy` 清理）

## 用户协作偏好
- 冲分要求**真实代码改进**并同步文档，不接受只改数字虚报
- 要求同步维护守护手册，便于日后查阅"如何保持满分"

## 单元测试约定（2026-09-23）
- 手环/快应用场景三种套路：①**纯函数** → 从 `.ux` 正则提取 `<script>` 再截片段 + `/tmp` 跑 `node`（零依赖）；②**依赖 storage** → 劫持 `Module.prototype.require` 注入**内存 fake `@system.storage`**（一个 `{}` 对象实现 get/set/delete），再 require 真实 `database.js` 跑 CRUD；③**页面方法** → `new Function("require", script+";return page;")(require)` 注入 mock（`new Function` 无 require，必须显式传）
- **不会留冗余数据**：fake 全内存、脚本放 `/tmp`、不进工作区与 git；仅真机测试才落盘（需 cleanup）
- 已验证：课程 **增 / 改 / 删** 均可单测（fake storage 下全部 PASS）

## 工具约定（2026-09-20）
- 每次对话完成用 mac 弹窗 + 语音通知：`osascript -e 'display notification "正文" with title "标题"' ; say -v Tingting "正文"`（用 `;` 不用 `&&`，保证弹窗失败也发声）
- 实现说明文档：`docs/Mac语音通知实现说明.md`
- 本机中文语音注册名：普通话 `Tingting`（非 `Ting-Ting`）、粤语 `Sinji`、台湾腔 `Meijia`；以 `say -v '?'` 实测为准

## 表盘与手机侧同步探索结论（2026-09-22）
- **表盘 `.bin` ≠ 快应用 `.rpk`**，是两套隔离的运行时。表盘：**无自定义数据源 / 无存储 / 无输入法**，只能"预设内容 + 按星期等系统数据源自动切换显示哪一组"；改内容必须重新打包安装。**凡"要能输入能编辑的课程应用"，本质就是快应用**
- 表盘 ↔ 快应用**无通信通道**；表盘也**无法被外部写入数据**（无数据槽）。米坛"课程表小程序"产物实为 `.rpk`
- **手机侧导入课表的可行路径 = AstroBox 插件**：Rust → WASM（wasm32-wasip2），**一次开发全平台**（Windows/macOS/iOS/Android/Linux/浏览器；iOS 为 Pulley64 **解释模式**，性能较低）；通过 `interconnect.send_qaic_message` 把课表发给**手环上的快应用**；宿主负责蓝牙 + Protobuf。官方插件文档 `plugindoc.astrobox.online`，参考实现 `AzumaChiaki/Varclass-Astrobox-rust`（MIT）
- **竞品**：`Jursin/Schedule-Vela`（腕上课程表，GPL-3.0 开源快应用）、Var课程表（爱发电付费）**均已支持 AstroBox 插件/同步器导入课表**（可导入拾光/WakeUp/星链/CSES 配置）。Ev课程表优势 = **手环上直接编辑**；短板 = **无手机侧批量导入**
- 本轮表盘相关分析文档（docs/）：`表盘开发可行性分析（讨论稿）.md`、`表盘联动性与仓库结构深度分析.md`、`独立课程表盘能力边界分析.md`、`表盘数据固化机制解析.md`、`AstroBox插件与课表同步路径分析.md`
- **本项目已迈出该步**：EV 同步器插件（`EV Schedule Sync`，`.abp`）已发布 **v1.0.20** 内测，仓库 `guomengtao/app-auth`（`releases/tag/ev-schedule-sync-v1.0.20`）；具备设备菜单 / 守卫检查 / Demo JSON 导入校验。⚠️ **包名只是"寻址"，不等于"接收"**：必须改代码 —— `manifest.json` 补 `system.interconnect` feature（目前缺失）+ `connect.onmessage` → 解析 → 写 `allCourses_N` → 刷新；解析/存储沿用格式 A 与 `try/catch` 约定；官方示例的**箭头函数要改成 `function`**（本仓禁 ES6+ 风险语法）。✅ 2026-09-22 已落地接收骨架：`manifest.json` 加 feature + `app.ux` 增量 `initSyncReceiver()`（存 `astrobox_sync_data`）+ 键表登记；**尚未真机验证，也未 commit**
- **守门人原则（2026-09-23）**：同步数据开放边界 **100% 由手环侧决定** —— 导出按域白名单 `SYNC_ALLOWED_SCOPES`（schedule / profile / homepage / appearance / pinned），不在白名单的域（授权等）插件**永远拿不到也改不掉**；`pinned`（钉首页）在白名单但**非默认**，需显式 `scopes` 才返回；`update_settings` 只认白名单字段
- 钉首页数据在 `src/data/pin-helper.js`（KEY `pinned_pages`，结构 `[{name, uri}]`）：`getList` / `isPinned` 可静默调用；**`pinPage` / `unpinPage` 会弹 Toast**，同步场景若要静默写入须直接用 storage 写 `pinned_pages`
- **权限表模型（2026-09-23 已落地 `src/app.ux`）**：`SYNC_ACCESS` 用 read/write 双维定义每个域——`schedule`/`profile`/`homepage`/`appearance` 读写、`version` 只读(always/false)、`pinned` 显式只读(explicit/false)、`auth` 禁止(never)；`SYNC_FIELD_DOMAIN` 映射 update_settings 字段到域；`syncCanRead`/`syncCanWrite` 守卫；version 由 `require("./data/version.js")` 读取且写被忽略。改权限只动 `SYNC_ACCESS` 一张表
- 同步协议三件套：`import`（宽容解析，写前备份 `astrobox_sync_backup`）/ `export`（按域）/ `update_settings`（nickname·homepage·homepageTemplate·baseFontSize 20~76）；配置编辑必须 **读→改→写** 否则丢字段
- **提交约定（2026-09-23 用户新规则）**：每次改动**立即**执行 `git add -A && git commit` 并注明改动说明，不再只提醒不提交；未跟踪的临时脚本/文档也一并纳入（遵守 `add -A`）。既有禁止性规则不变：禁止 `git clean`/`reset --hard`/`rm -rf` 等破坏性命令，恢复一律用 `git checkout HEAD~1 -- <路径>`
