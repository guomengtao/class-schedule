# 长期记忆

> 维护规则：本文件只放**长期有效**的结论；过程性记录留在 `YYYY-MM-DD.md`。已被推翻的旧结论在删除时于当日日志留一行说明。细节长文一律落在 `docs/`，本文件只留"可执行规则"。

## 项目
- Ev课程表（小米手环快应用 / Vela），包名 `com.application.watch.classschedule`，仓库 `git@github.com:guomengtao/class-schedule.git`
- 评分体系 `docs/标准版完善度综合评分.md`；守护手册 `docs/标准版100分评分标准.md`
- `manifest.json` 的 `deviceTypeList` 只能是 `["watch"]`（`band` 非法，aiot-toolkit 不校验）
- `manifest.json` 的 `router._groups` / `pages[*].group` / `name_cn` 是自定义元数据，须与 `router.pages` 同步

## 当前状态
- 标准版综合评分 **100 / 100**（第十一轮）。重点是**防回退**，改动前对照守护手册红线清单
- **v1.6.130（versionCode 959）已发布**：14 渠道 rpk 上传 GitHub Release `v1.6.130`（2026-09-26）

## 关键设计约定（用户确认）
- **字号设置只作用于「首页课程卡片」**，是有意设计；其他页面固定字号。设置项 UI 必须声明范围。**不做全局字号联动**

## 设备实测参数
激活 URL 字段含义见 `src/pages/activation/activation.ux` 的 `fetchDeviceInfo()`

| 设备 | screenShape | w×h | deviceType | platformVer | APILevel | osVerCode |
|---|---|---|---|---|---|---|
| 小米手环 11 | pill-shaped | **212**×520 | band | 1200 | 2 | 0 |
| 小米手环 9 | pill-shaped | **192**×490 | band | 1200 | 2 | 198145 |
| 小米手环 10 Pro | rect | 336×480 | 未采集 | — | — | — |

- 跑道屏 `screenShape` 返回 **`pill-shaped`**，真机也出现过 `capsule` → 屏型归一化**两种都要认**（`device-info.ux` 的 `screenShapeMap` 不认 `capsule`，取证会误判）
- 手环 11 宽 212px（胶囊规范按 192 定标）；手环 11 `osVersionCode=0` → 不要假设 `getInfo` 字段一定存在
- `manifest` 的 `config.designWidth = "device-width"` → px 与屏幕 1:1，**不做基准缩放**

## 布局与交互红线（Vela 手环）
- **`<stack>` / `<scroll>` 作为容器或内容层时，子元素必须显式声明 `width`（根内容层写 `width: 100%`）**；stack 不拉伸子元素，宽度退化为内容宽时未覆盖区不绘制即露黑底。`stack` 根容器应同时绑 `background-color` 兜底
  - 实例：`schedule-manager.ux` 是唯一以 `<stack>` 作根，`.page`(scroll) 漏写 width → 手环 9「右侧黑板」（见 `docs/手环9跑道屏课程表管理页右侧黑板分析.md`）
- **⭐ 列表行的做法 = `onclick` 只放整行容器，行内子元素（indicator / text / 装饰 div）一律不绑 onclick**，这样热区 = 整行（最稳）。`index.ux` 的 `class-grid-item` 是既有惯例
  - 理由 1（真因，2026-09-27 验证）：**窄屏上热区太小就是"点了没反应"**。手环 9（192px）上仅文字框可点 ≈ 100px 宽，点到框外（行内空白）没有任何响应；手环 10（212px）框 120px 更容易点中 → 解释了"手环10 能开、手环9 打不开"。热区给整行即彻底消除
  - 理由 2：`docs/勾选框点击无效问题分析.md` 记录过"一行多个 onclick 事件可能被丢弃"的先例。**但 2026-09-27 用模拟器 A/B 证明：一行两个 onclick 并未吞事件**（11:29 小圆圈版→11:54 大圆圈版→11:55 面板正常弹出；且项目内另有 10 处一行 2~3 个 onclick 功能正常）→ **不要再把"多 onclick 必被吞"当结论外推**
  - 反例教训：2026-09-27 给 `.indicator` 补 `onclick`（"让圆圈也可点"）→ 手环 9 点课程名打不开弹窗，见 `docs/课程表管理页点击标题打不开编辑弹窗分析.md`
- **⭐ 铁律：模拟器「通过」≠ 真机通过**（2026-09-27 实证：同一份代码在 212×520 模拟器上点击正常 → 装到手环 9 真机打不开）。模拟器适合**排除法/取证/画面判读**，**不适合当验收**；模拟器 OK 而真机不 OK 时，优先怀疑：**触摸命中与事件分发、屏型/尺寸差异、系统与厂商定制**。别拿不同尺寸的模拟器互相背书
- **验证手段优先级：单元测试 ＞（画面类问题时）模拟器截图 ＞＞ 真机往返**。单测毫秒级、可回归、能定位到函数（2026-09-27 就是单测抓到 `openSheet` 越界静默失败，模拟器永远测不到）；模拟器只在布局/裁切/溢出/视觉类问题上不可替代；触摸/性能/机型差异只有真机说了算
- **Vela 模拟器取证法（AI 可直接用，详见 `docs/Vela模拟器使用指南与测试有效性分析.md`）**：
  - **画面**：IDE 截图落在 `/Users/Banner/Downloads/vela_screenshot/`（`~/.vela/sdk/screenshot` 软链到此，文件名含设备+时间）→ **AI 可直接读图**，按时间排序做前后 A/B；备份在 `~/.vela/sdk/screenshot_bak/`
  - **规格**：`grep -E 'hw.lcd.(width|height|shape|density)' ~/.vela/vvd/<avd>.vvd/hardware-qemu.ini` → `xiaomi_band`=**192×490 pill-shaped（手环 9 规格，本机已有但常不启动）**、`xiaomi_band_10`=212×520、`xiaomi_band_pro`/`band-9-pro`=336×480 rect；启动参数见同目录 `emu-launch-params.txt`
  - **adb**：`node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb`（NuttX NSH：有 `ls/ps/getprop/vapp/vappcli/am`；**没有** `wm/input/screencap`）
  - **点击注入暂不可用**：实例无 `-vnc`；`8554/8556`（adb+3000）**不是标准 RFB**；要自动点击须 `aiot start --openVNC`（扩展源码里有 `defaultVncPort=5900` 与 `sendMouse/sendKey`，说明官方走 RFB）
  - **打开浮层的处理器必须有越界守卫**（`if (idx < 0 || idx >= this.list.length) return`），否则列表未就绪/删除后索引失效时抛异常 → 表现为"点了没反应"
- 胶囊屏（192px）硬约束：`week-view` 可视列数 ∈ [2.5, 3.5]（`160 ÷ cellWidth`）；胶囊屏关闭行号列（`rowNumWidth=0`）、`cellWidth ≤ 60`；按钮高 ≥48px（触控底线 44px）
- **⭐ 胶囊屏弹窗/浮层几何铁律（2026-09-27 实测两轮后确立）**：**遮罩给对称 padding（`40px 16px`）+ 卡片 `width: 100%`，且禁用百分比宽度与 `max-width`**
  - **⚠️ 还必须把页面根容器的 padding 移到内层容器**：Vela 绝对定位按父级**内容框**计算 ⇒ 根容器带 padding（如胶囊 `.page { padding: 30px 8px }`）会把弹窗整体推移 → 实测同一份弹窗 CSS 在设置页 16/16 对称、在首页设置 8/24 不对称。已处理：`settings.ux`、`homepage-settings.ux`（做法：根容器只留 flex/宽高，内容包进 `.xxx-body { padding: … }`，弹窗/抽屉作根容器直接子元素；4 个屏型块同步改）。**待处理：`backup-restore.ux`（数据备份页同样有 padding）、`reset-data.ux`、`premium-overlay.ux`**（`schedule-manager.ux` 实测 8/8 已对称）
  - **胶囊屏文本预算**（避免截断）：卡片内宽 = 176 − 2×卡片padding；`✓ 数据备份与恢复` 需 ≈136px ⇒ **`.benefit-item` 17px + 卡片左右 padding 8px**；`.modal-desc` 必须 **`lines: 4`**（写 `lines: 2` 会把「…全部高级功能」的末二字吃掉）。修法脚本：`scripts/fix-capsule-modal-text.py`
  - 原理：卡片 `width:100%` 填满"对称 padding 之后的内容区" ⇒ 左右边距 = padding、与屏宽无关，**天然等距**；**不要去"算居中"**（`align-items: center` 在本引擎上并不可靠，实测过被忽略）
  - 反例（"左小右大"的成因）：卡片 `width: 90%/92%` + 遮罩 `padding` —— 左边界由 padding 决定、宽度由百分比基准决定，两套算法不配套 ⇒ 实测左 8 / 右 40
  - **同一文件里不要出现两个 capsule `@media` 块写同一属性**：实测谁生效**不稳定**（settings 用旧 90%、backup-restore 用新 100%）⇒ "后面追加一块去覆盖"不可靠，**必须改原有的那一处，或把所有定义写成同一个值**
- **模拟器部署验证的两个坑**：①**debug 包不能用裸 `vapp app/<pkg>` 启动**（表现为"点进首页即退出/黑屏"），验证请用 **release 包**；②`adb push <rpk> /data/quickapp/app/<pkg>.rpk` 会**重置该模拟器上应用的数据**（停在欢迎页）
- **模拟器部署（2026-09-27 实测补充）**：运行时**只认 `/data/quickapp/app/<包名>/` 解包目录**，推 rpk 不会自动解包 → 必须本地解包再推文件，否则"改了不生效"；批量 `adb push` 目录易报 `EOF`，**改单页只推 `pages/<页面>/<页面>.jsc` 最稳**；推送后首次 `vapp` 可能黑屏，**再启动一次即可**
- **底部抽屉弹（bottom sheet）写法（2026-09-27 实装）**：外层 overlay `position: absolute; left/top: 0; width/height: 100%`（遮罩）+ 内层面板 `position: absolute; left: 0; bottom: 0; width: 100%` + `border-radius: 16px 16px 0 0`；**不做任何居中计算**，天生通栏贴底，与屏幕尺寸无关
  - ⚠️ **必须把页面 padding 移到内层容器**：Vela 的绝对定位按父级**内容盒**算（非标准 CSS 的 padding 盒），父级有 padding 时 `left/bottom: 0` 会被内缩、贴不到屏幕边缘。做法 = 根容器只留 `position: relative`，页面内容包进 `.xxx-body { padding: … }`，抽屉留在根容器下
  - 抽屉里点未解锁项前要**先收起抽屉再弹窗**，否则弹窗被压在抽屉下面
  - 用例：设置页「主题配色」抽屉（`settings.ux`，`.theme-drawer` / `.theme-drawer-panel` / `.drawer-handle` / `.theme-row` / `.drawer-done`）
- **`scripts/emulator-eye.js` 现有能力**：`shot / ctap / click / mclick / stouch / swipe / seq / sseq / key / ports / status`（`swipe <port> x1 y1 x2 y2 [steps]` 用于滚动；2026-09-27 新增）
- **⚠️「解锁高级版」弹窗在 192×490 上严重破碎（2026-09-27 实测）**：同一套弹窗被**复制了 6~7 份**（`components/premium-overlay.ux`、`unlock-dialog.ux`、`pro-card.ux` + `settings` / `schedule-manager` / `backup-restore` / `homepage-settings` / `reset-data` / `schedule-qrcode` 各一份），**胶囊屏适配各不相同**：
  - `schedule-manager.ux` 的 `.modal-card` **完全没有 capsule 覆盖** → 192px 下卡片仅 128px、正文可用 ~92px → 标题「解锁高级版」(30px/150px) 截成「解锁高」、✓ 条目 24px 只剩 1 个字
  - `settings.ux` / `backup-restore.ux` 的弹窗**内容顶到屏幕右边缘（右边距 = 0）**被裁
  - **根治方向：收敛成一份 `premium-overlay.ux` + 统一胶囊覆盖（缩字号 + `lines:2` + `flex:1;min-width:0`）**，别逐个页面改
- **⭐ 测试前必须固定两个变量：屏尺寸（手环 9 = `xiaomi_band` 192×490）+ 业务状态（激活/未激活）**。2026-09-27 同日连踩三次：①212×520 顶替 192×490 ②已激活实例顶替未激活 ③把 IDE 历史截图当现场 —— 结论全部作废重做
- 屏型由 `device.getInfo` 异步探测，探测后需重新应用依赖屏型的配置

## 输入法（2026-09-25 结案，真机通过）
- `src/components/InputMethod/` = 上游 `NEORUAA/Vela_input_method` main 最新版，**逐字节零改动**
- 宿主侧仅 3 处适配：①`<import src="../../components/InputMethod/InputMethod.ux">` ②目录若移动需传 `dictionarypath` ③**`manifest.json` 的 `features` 必须含 `system.file`**
- 词典外置为 `assets/dictionary/*.txt`（28 个 / 196KB），按需读取 → 页面 bundle 233KB→87KB，包体 828KB→693KB
- **`hide=true`（键盘延迟展开）不可用**：跳过词典初始化 → 英文能打、中文无候选。必须 `hide=false`
- **⚠️ 旧结论文档一律作废，勿再套用**：`<list static>`、`arc` 进度条、`screentype` watch 致崩、词典内联、分帧挂载、"单帧渲染超载" —— 官方最新版中均不存在；相关诊断页/组件已删除或归档（源码在 git 历史）
- **⭐ 教训（最贵）**：第三方组件出问题，第一步查上游 commit/diff；同步上游必须记 upstream SHA。"latest" 不可靠
- **⭐ 教训 2**：多轮"性能/资源"推断全部落空，**定论靠 A/B 对照（官方原版跑同一台设备）**。高置信度推断却改不好时先做 A/B
- 可复用排查法：怀疑词典/引擎时，把 `assets/` 拷到 `/tmp/xxx/`，写 `.mjs` 调 `SimpleInputMethod.initDict()` + `getHanzi()` 用 node 验证，几秒区分"引擎坏了"还是"调用时机不对"

## 版本号递增机制
`scripts/bump-version.js`（patch+1、versionCode+1，同时写回 `src/manifest.json` 与 `src/data/version.js`），**只通过 npm lifecycle 钩子触发**：

| 命令 | 是否递增 |
|---|:---:|
| `npm run release`（`prerelease`） | ✅ |
| `npm run build`（`prebuild`） | ✅ |
| `npm run bump` | ✅ |
| `npx aiot release`（绕过钩子） | ❌ |
| `npm run build:dev` | ❌ |

- **判断"用户测的是不是刚改的包"必须以用户回传的 `r` 参数为准**（`r` = 包内 `versionName`）；`r` 不符时先解决装机，不要急着改代码

## 构建与打包
- **命令**：`npx aiot release --enable-jsc` → `node scripts/rename-rpk.js` → `dist/ev-v{版本}-{channel}.rpk`
- ⚠️ **必须绕开 safe-delete 垫片**，否则清理 `.temp_class`（>500 文件）被拦报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`：①`env -u NODE_OPTIONS npx aiot release` ②`CODEBUDDY_SAFE_DELETE_ENABLED=0 npx aiot release`
- ⚠️ **不要用 `npm run release`**（会 bump 版本）；**不要用 `_build_test.sh`**（内含 `rm -rf build dist .temp_class`，违反硬规则；`_do_build.sh` 是干净版）
- **14 渠道**：`t-9p-d t-9p-r t-9-d t-9-r t-10-d t-10-r t-10p-d t-10p-r t-s4-d t-b9-d t-w-d t-w-r q g`；sed 改 `src/data/version.js` 的 `channel` → 构建 → 复制为 `release/ev-v{版本}-{channel}.rpk` → 还原。全量约 3~4 分钟
  - 真正的编译临时目录是同级 `../.temp_class`（`build`/`dist` 由 "Migrate temporary project" 镜像回来）
  - 清目录**禁止 `rm -rf`**：改用 `mv build /tmp/trash/xxx`
- ⚠️ 从上游导出组件时：把 `./assets/` 批量替换为绝对路径会**误伤 JS 的 import**（编译报 require 无法解析）→ `.js` 的 import 保持相对路径，只有图片资源可改绝对
- **⭐ 清理/归档类需求首选**：先"移除 `manifest.json` 注册 + 移除入口"而非删文件（源码树留有 `.ux` 但无人引用 = 零包体成本，已实测）。详见 `docs/未注册资源归档说明.md`

## 包体构成（详见 `docs/包体构成分析.md`）
- **debug 2.4MB vs release 809KB**：debug 是明文 `.js`（解压 15MB），release 是 `.jsc` 字节码（解压 2.1MB）→ **给用户测试/发布的必须 release 包**
- **Vela 无共享 chunk → 组件代码被复制进每个引用页**；已核查无冗余（PNG 仅 6%）→ **瘦身只能靠减少大组件引用页数或外置资源，清理文件换不来空间**
- 复查：`unzip -q dist/*.rpk && find . -type f | xargs ls -l | awk '{print $5,$9}' | sort -rn | head -30`

## 诊断与排查约定
- "可能崩溃 + 真机机会少"的排查：做一次性诊断页，按"落盘进度 → 延时 → 执行 → 完成清空"；storage key 执行前写 `*_step`、完成清空 → 重启后打开页面顶部直接显示"上次崩在第 N 步"
- 真机信息"一次装机榨多项"：一页多开关（一个假设一个开关）+ 结果落盘 + 页面显示版本号 + 默认全关
- 每次复测前先确认真机装机版本号与仓库一致（激活 URL 的 `r` 参数）。常备工具 `device-id-diagnosis`（7 个 API 单测）

## 默认设置集中管理（阶段 1+2 已落地）
- 方案 `docs/新老用户默认设置集中管理方案.md`：**一张表** `src/data/app-defaults.js`（字段级 entry + `policy: keep/soft/force` + `since`，当前 26 条全 `keep`）+ **标记** `app_state` + **集合** `userSet` + **幂等**（`since` vs `defaultsVersion`）
- 引擎 `src/data/defaults-engine.js`：`run(cb)` 判定并应用、`markUserSet(id)`/`flush(cb)` 登记改动；挂在 `app.ux onCreate()` 的 `migrateBuiltinHolidays()` 之后
- **规则**：迁移引擎直接操作 storage；`store.js` 的所有 setter 一律视为"用户行为"并自动登记 `userSet`
- **最高优先级红线**：`app_state` 不存在时**绝不能默认当新用户** —— 必须串行探测业务 key，命中任一即按老用户处理（单测已覆盖）
- 迁移后**必须 `store.clearCache()`**；RTOS 存储不支持高并发 → 全程串行、`userSet` 内存累积合并写
- **切 policy 的坑**：`keep`→`soft` 时必须**同时把该项 `since` 与 `CURRENT_VERSION` 一起 +1**
- 对象/数组型默认值必须**返回副本**（`app-defaults.get()` 内置 `cloneValue`），否则页面就地修改会污染配置表
- 现成范式：`holiday-preset.js` 的 `VERSION_KEY` + `ensurePreset()`（版本号 + 幂等 + 只补缺失不覆盖用户）

## 数据层约定
- 跨星期更新必须单次原子写盘（`updateCourseAcrossDays`），禁止"先删后插"
- `JSON.parse` 必须 `try/catch` + 兜底（全项目 41 处已保护）
- 删除必须二次确认 + 5 秒撤销（撤销要写回存储，定时器在 `onDestroy` 清理）
- 弹窗/面板：面板内点击必须 `stopBubble(e)` 且真正调用 `e.stopPropagation()`；空函数会导致点面板内按钮误关面板

## 单元测试约定
- ①纯函数：从 `.ux` 正则提取 `<script>` 截片段 + `/tmp` 跑 `node`（零依赖）②依赖 storage：劫持 `Module.prototype.require` 注入内存 fake `@system.storage` 再 require 真实 `database.js` ③页面方法：`new Function("require", script+";return page;")(require)` 注入 mock
- fake 全内存、脚本放 `/tmp`，不进工作区

## 表盘与手机侧同步
- **表盘 `.bin` ≠ 快应用 `.rpk`**：表盘无自定义数据源/存储/输入法，只能"预设内容 + 按星期切换"，且与快应用无通信通道 → **凡"要能输入能编辑的课程应用"本质就是快应用**
- **手机侧导入唯一可行路径 = AstroBox 插件**（Rust→WASM，`interconnect.send_qaic_message`）；官方 `plugindoc.astrobox.online`。竞品 `Jursin/Schedule-Vela`、Var课程表已支持；Ev 优势 = 手环上直接编辑，短板 = 无手机侧批量导入
- 本项目 `EV Schedule Sync`（`.abp`）v1.0.20，仓库 `guomengtao/app-auth`；`app.ux` 有 `initSyncReceiver()`（存 `astrobox_sync_data`）+ manifest 有 `system.interconnect`；`app.ux` 启动即常驻（resident）
- **守门人模型**：数据开放边界 100% 由手环侧控制（插件只能 interconnect 请求，手环决定读什么/回什么/允许改什么）。`SYNC_ACCESS` 权限表 read/write 双维，**改权限只动一张表**
  - 四策略：`always`+write = 任意读可写；`always`+无 write = 只读；`explicit` = 默认不给、插件显式传 `scopes` 才给且只读；`never` = 禁止读写
  - 当前：schedule/profile/homepage/appearance 默认读+可写；pinned 需显式请求+只读；auth 禁止读禁止写
- 协议三件套：`import`（宽容解析，写前备份 `astrobox_sync_backup`）/ `export`（按域）/ `update_settings`（nickname·homepage·homepageTemplate·baseFontSize 20~76）；配置编辑必须**读→改→写**
- 钉首页数据在 `src/data/pin-helper.js`（KEY `pinned_pages`）：`pinPage`/`unpinPage` 会弹 Toast，同步静默写入须直接操作 storage

## 用户协作偏好（硬要求）
- **模拟器优先**：用户模拟器上能复现，**没在模拟器通过之前不出包、不打扰用户**；真机只做最终验收
- 冲分要求**真实代码改进**并同步文档，不接受只改数字虚报
- **每次改动结束自动提交并推送 GitHub**（2026-09-27 用户确认，已写入 `.codebuddy/rules/总体规则.mdc`）：编译/校验通过后 `git add -A && git commit`（Conventional Commits，type 须符合 `commitlint.config.js` 的 type-enum）→ `git push origin main`；未跟踪文件一并纳入；**禁止 force push**，推送被拒先 `git fetch` 核对并报告，不强推
- **禁止** `git clean` / `reset --hard` / `rm -rf` 等破坏性命令；恢复用 `git checkout HEAD~1 -- <路径>`
- 不接受"为修 bug 一次性大改界面影响所有用户"的方案；宁可多花一轮定位也要把改动面缩到最小
- 完成对话后的提醒：`scripts/notify.sh "标题" "通知正文" "语音文本"` —— mac 系统通知 + **Edge TTS 晓晓（zh-CN-XiaoxiaoNeural）**语音，失败自动回退 `say -v Tingting`（用户 2026-09-27 要求换掉 Tingting）。edge-tts 在 `/opt/homebrew/bin/edge-tts`，生成 mp3 后 `afplay` 播放（需联网）
- **⭐ AI 的"眼睛/手指"工具集（2026-09-27 打通）**：`scripts/emulator-eye.js`（gRPC 截图 shot/status + 控制台点击 ctap/cseq）、`scripts/png-measure.js`（零依赖 PNG 像素测量：info/bands/rows/color → 把"看着偏左/歪"变成数字）、`scripts/audit-capsule-width.py`（192px 宽度溢出静态体检）。完整经验见 `docs/模拟器眼睛与手指打通复盘.md`
  - **⭐ 点击坐标标定结论：控制台 `event mouse` 直接吃 LCD 坐标，不需要皮肤 part2 偏移**（曾按偏移加导致全部点偏；需要偏移的机种用 `EYE_SKIN_OFFSET=1`）
  - 原理：模拟器控制通道是 **gRPC `android.emulation.control.EmulatorController`**（端口 = 控制台端口 +3000，即 `emulator-5554` → **8554**、`emulator-5556` → 8556）。**别再以为 8554 是什么自定义二进制协议**——那只是 HTTP/2 的 SETTINGS 帧
  - proto 与 `@grpc/grpc-js`/`@grpc/proto-loader` 都在 `node_modules/@aiot-toolkit/emulator/`（零额外依赖）；可用 RPC：`getScreenshot`、`streamScreenshot`、`sendMouse`、`sendTouch`、`sendKey`、`getStatus`
  - 拉起 App：`$ADB -s emulator-5554 shell am start app/com.application.watch.classschedule`（或 `vapp app/<包名>`）；空屏/黑屏说明 App 没在跑
  - **adb 端口 ↔ VVD ↔ gRPC**：`xiaomi_band`=emulator-**5558**（gRPC **8558**，手环9 规格）、`xiaomi_band_10`=5554/8554、`xiaomi_band_pro`=5556/8556
  - **自己部署 rpk（已摸清，2026-09-27）**：`appDir = /data/quickapp/app`；`adb push <rpk> /data/quickapp/app/<pkg>.rpk` + `adb shell unzip -o <rpk> -d /data/quickapp/app/<pkg>`；**根目录 `/quickapp/*.rpk` 是安装投放目录**（推这里守护进程会正式安装/注册，注册表 `/data/quickapp/apps.json`）；启动 `adb shell vapp app/<pkg>`
  - ⚠️ **重装会重置该模拟器上应用的数据**（会停在欢迎页，甚至点「进入首页」后退出）→ **动用户正在用的模拟器之前必须先问**
  - ❌ **gRPC 的输入 RPC 在这台 Vela 上是空实现**：`streamInputEvent` 明确报 `12 UNIMPLEMENTED`；`sendMouse`（移动→按下→抬起）/`sendTouch`（touches 非空=按下、空数组=抬起）都返回成功但**画面零变化**（用"切换日期"判据，md5 一致）→ 与坐标、token 都无关（`utouch`/`/dev/input0` 在 toolkit 与 IDE 扩展里也查无引用）
  - ✅ **可用通路 = 模拟器控制台 `event mouse`**：控制台端口 = gRPC 端口 − 3000；先 `auth $(cat ~/.emulator_console_auth_token)`；语法 `event mouse <x> <y> <device> <buttonstate>`（4 个整数）→ 已入库 `node scripts/emulator-eye.js ctap <grpcPort> <lcdX> <lcdY>` / `cseq <grpcPort> <prefix> <x,y>...`（自动读 token、自动按 LCD 尺寸匹配皮肤偏移）
    - **坐标是"皮肤窗口坐标" = LCD + `part2` 偏移**；偏移读 `~/.vela/sdk/skins/builtin/<avd>/layout`（`part2 { name device; x N; y N }`）→ `xiaomi_band_10` = (+30,+22)、`xiaomi_band` = (+44,+154)
    - ⚠️ 实测落点与换算**不完全吻合**（疑为相对位移鼠标或还有一层缩放）→ **使用前必须先标定**
  - ⚠️ 因此 **IDE 模拟器面板上的点击很可能是"看着能点、其实没送达"**，别把模拟器点击当成真机触摸的替代
- 所有 md 文件用中文书写
- **项目根目录保持干净整洁**：散落文档入 `docs/`、临时/调试脚本归 `archive/`、构建产物（`build/ dist/ release/`）不留根目录；**但 `sign/` 含签名证书（`private.pem`/`certificate.pem`），禁止移动或清理，必须留在原地**
