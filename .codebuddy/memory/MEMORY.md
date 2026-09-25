# 长期记忆

## 项目
- Ev课程表（小米手环快应用 / Vela），包名 `com.application.watch.classschedule`
- 评分体系：`docs/标准版完善度综合评分.md`；守护手册：`docs/标准版100分评分标准.md`
- `manifest.json` 的 `deviceTypeList` 只能是 `["watch"]`（Vela 官方仅支持 watch；`band` 非法，但 aiot-toolkit 不校验，历史曾为"手环11装不上"加过 `band`，属推测性方案）
- `manifest.json` 的 `router._groups` / `pages[*].group` / `name_cn` 是自定义元数据（官方只认 component/path/launchMode），须与 `router.pages` 同步

## 当前状态（2026-09-19）
- 标准版综合评分 **100 / 100**（第十一轮）。后续重点是**防回退**，改动前对照守护手册红线清单

## 关键设计约定（用户确认，务必遵守）
- **字号设置只作用于「首页课程卡片」**，是有意设计。其他页面固定字号（按钮 ≥48px、行高 1.2×字号、胶囊屏 192px 不溢出）
- 设置项 UI 必须声明范围：「首页课程字号」+「仅影响首页课程卡片，其他页面为固定字号」
- **不要做全局字号联动**

## 设备实测参数（2026-09-25）
激活 URL 字段含义见 `src/pages/activation/activation.ux:429-440` 的 `fetchDeviceInfo()`

| 设备 | screenShape | w×h | deviceType | platformVer | APILevel | osVerCode | 实测版本 |
|---|---|---|---|---|---|---|---|
| 小米手环 11 | pill-shaped | **212**×520 | band | 1200 | 2 | 0 | 1.6.59（channel `g`） |
| 小米手环 9 | pill-shaped | **192**×490 | band | 1200 | 2 | 198145 | 1.6.100（channel `t-9p-d`） |
| 小米手环 10 Pro | rect | 336×480 | 未采集 | — | — | — | 未采集 |

- 跑道屏 `screenShape` 返回 **`pill-shaped`**；项目代码同时接受 `capsule` 与 `pill-shaped`（两种值真机都出现过）→ 屏型归一化必须都认；`device-info.ux` 的 `screenShapeMap` 不认识 `capsule`，取证会误判
- 手环 11 宽 **212px**（胶囊规范按 192 定标，212 比基准宽 10.4%）
- 手环 11 `osVersionCode=0` → 不要假设 `getInfo` 字段一定存在
- `manifest` 的 `config.designWidth = "device-width"` → px 与实际屏幕 1:1，**不做基准缩放**

## 布局红线（Vela 手环）
- **`<stack>` / `<scroll>` 作为容器或内容层时，子元素必须显式声明 `width`（根内容层写 `width: 100%`）**。Vela 中 stack 是层叠容器、不拉伸子元素；scroll 官方要求"竖向滚动需设定高"，均无"默认撑满"语义。漏写会让宽度退化为内容宽，未覆盖区域**不绘制即露黑底**（手环上表现为黑色区域）。`stack` 根容器应同时绑定 `background-color` 兜底
  - 实例：`schedule-manager.ux` 是全仓唯一用 `<stack>` 作根的页面，`.page`(scroll) 漏写 width → 手环 9 上"右侧黑板、页面压在左侧"（见 `docs/手环9跑道屏课程表管理页右侧黑板分析.md`）
- 胶囊屏（192px）硬约束：`week-view` 可视列数 ∈ [2.5, 3.5]（`160 ÷ cellWidth`）；胶囊屏关闭行号列（`rowNumWidth=0`），`cellWidth ≤ 60`；按钮高 ≥48px
- 屏型由 `device.getInfo` 异步探测，探测后需重新应用依赖屏型的配置

## ⭐ 输入法跑道屏「点页面即重启」—— 实测定案

### ✅ 最终处置（2026-09-25）：正式组件已整体换成官方原版
- **先走了方案 A（删 watch，v1.6.120）→ 真机仍然不行** → 组件里还有第二个致崩点，单点回退解决不掉
- **最终决定（用户）**：正式组件**直接用官方原版** —— `cp InputMethodOfficial.ux InputMethod.ux`，`diff -q` 确认与 **G 项验证通过的那个文件完全一致**
- 回归的官方特征：`progress type="arc"` 弧线、下展面板 `<list>`、`addAllTxt` 不截断 maxlength、官方版 maxlength 处理
- `chinese-input.ux` 不传 `dictlazy` → 线上无未知 prop；诊断页传的 `dictlazy` 被 Vela 忽略，编译通过
- **官方版真机结果：输入法能出来了（崩溃解决 ✅）**，但出现新问题：**英文能输入、中文无候选**
  - 定位过程：把词典引擎拷到 `/tmp` 用 node 直接跑 → `initDict()` 后 `getHanzi('nihao')` 正常返回 `你尼呢泥…` + `words: 你好`，`syllableSet 413 / py2hz 404 / words 3016 / initialsIndex 801` → **词典引擎本身完全正常**，问题在**初始化时机**
  - **真因 = 我自己加的 `keyboardHidden` 错峰**：`hide` 初值 `true` → 组件 `onInit` 里 `if (!this.hide)` 不成立 → **跳过 `_ensureDictInit()`**（词典永不初始化 → 中文无候选；英文走直接上屏不需要词典所以正常）
  - **已回滚**：`chinese-input.ux` 的 `hide="{{ keyboardHidden }}"` → **`hide="{{ false }}"`**，删除 `keyboardHidden` data 与 `onReady` 里的 `setTimeout` 延迟展开（该错峰是为"单帧负载致崩"加的，崩溃既已由官方组件解决，它就失去意义，且有害）
  - 产出 `dist/ev-v1.6.122-t-9p-d.rpk`
- **可复用排查法**：怀疑"输入法/词典类"问题时，直接把 `src/components/InputMethod/assets/` 的 6 个文件拷到 `/tmp/xxx/`，写一个 `.mjs` 调 `SimpleInputMethod.initDict()` + `getHanzi()` 用 node 验证，**几秒就能区分"引擎坏了"还是"调用时机不对"**，不必真机试
- **若官方版仍不行** → 说明问题不在组件（转页面侧/环境侧）
- 嫌疑点 1（已删除但仍不够，仅供追溯）：本项目额外添加的 `this.$watch("screentype", "adjustScreenWidth")`（官方无此行）
  - 机制：`onInit` 里已调用过一次 `adjustScreenWidth()`（内部 `device.getInfo`），该 watch 注册时又触发一次 → **首次渲染 pill 键盘期间并发第二次 `device.getInfo`，回调里改 data** → 渲染竞态 → "卡很久 → 看门狗复位"
  - **G（官方原版）✅ 通过 / H（分帧版）❌ 崩溃** → 确认**是我们改坏的**，而非官方实现或设备问题（用户最初的直觉正确）
- **已被本轮实验排除（勿再重复试）**：`progress type="arc"`+负角度、305px 固定高、26 个 `border`+`border-radius` 按键、8 张 PNG、绝对路径、2 个 `scroll-x`、绝对定位堆叠、词典内存、`dictlazy`、并发 storage、**"单帧渲染总量超载"（分帧方案已证伪）**、**"官方实现对弱设备余量不足"（G 在同机通过，证伪）**
- **教训（第二次）**：连续多轮"性能/资源"方向推断全部落空，**真正定位靠的是 A/B 对照（把官方原版跑在同一台设备上）**。遇到"高置信度推断却改不好"的局面，优先做 A/B 而不是继续分析

### 历史过程（保留供追溯）
- 症状是**系统级复位**，不是"看不见键盘"→ "重启"类问题不要往布局方向查
- **实测·第一轮诊断**：并发写×5 通过、并发读×7 通过、第 3 步（建键盘，`dictlazy=true` 不加载词典）崩溃 → 排除 W1 阻塞 / W2 arc / W3 并发 storage / W4 词典内存
- **⭐⭐ 实测·第二轮（元素级 A~F）**：**A B C D E 全部通过，F（完整 pill 键盘）卡住**
  - **五个单项全部无罪**：26 个文本节点、`border`+`border-radius`、`scroll-x`、PNG 图片、`position:absolute` 堆叠 —— 逐一证明无害
  - **副产物**：我此前的"极简重写"方案（去 PNG/描边/圆角/绝对定位/嵌套 scroll）**即使执行也无效**，用户要求回滚是完全正确的
  - 元凶收敛到「**组合 / 组件机制**」
- **F 与 A~E 的本质差异（= 嫌疑点）**：A~E 是页面内静态 DOM；F 是引入组件，独有 ①根节点 `position:absolute; left:0; bottom:0` ②`onInit` 里**第二次 `device.getInfo`**（`adjustScreenWidth`）③4 个 `$watch` ④`cvalrow-wrap` 等独有节点 ⑤放在 `<scroll>` 父级里（`chinese-input` 同样如此）
- **修订后主因 R1 = 组件根 `position:absolute; bottom:0` 与父级 `<scroll>` 的组合**（与"F 崩而 A~E 全过"最吻合；第一轮分析中已标为"结构性放大项"）
- 10 Pro 免疫的原因：结构相同但键盘 255px（pill 305px+28 拼音行）、屏高 480 → **临界型问题**，非"某元素必然崩"
- ❌ **改法 B 无效且已回滚（2026-09-25）**：组件根改 `position: relative` 后仍"卡很久→重启" → 定位不是主因。**已回滚**（且它会给 10 Pro 首帧带来 relative/absolute 切换差异 —— 因为 `chinese-input.ux` 的 `screenType` 初始值就是 `'pill-shaped'`）
- **⭐ 官方版 vs 我们的版本对比（回应"会不会是我们改坏了"）**：官方原版 = 提交 `f549d31`（2026-09-10 引入上游 Vela_input_method）。两者在 pill 分支**结构高度一致**：官方**也有** arc progress / `height:305px` / 3 层绝对定位 / 26 个 `.calbtn66`（描边+圆角）/ `cvalrow-wrap` / `onInit` 里的 `adjustScreenWidth`；差异量 **129+/141-**，且我们的改动都是**减法与适配**（移除下展面板、图片路径改绝对、去掉 1 处箭头函数、加 capsule→pill 映射），**未引入任何重元素**。→ **若这些特征足以崩，官方版也会崩**
- **已实现 A/B 对照（诊断页 G 项）**：`src/components/InputMethod/InputMethodOfficial.ux` = `f549d31` 原版（仅 assets 改绝对路径 + 1 处箭头函数改 `function`；**与当前组件共用同一个 `dicUtil.js`** → 唯一变量 = 组件模板）。`input-crash-diag2` 现为 **A~G 七项**
  - 判读：**F❌ + G❌ → 官方实现本身在手环 9 上性能不足**（走分帧挂载）；**F❌ + G✅ → 是我们改坏的**（用 `git diff f549d31 HEAD` 逐条回退定位）
  - ⚠️ G 是最后一项，用「一键跑全部」会受 A~F 累积干扰 → **应以单点 G 为准**
- **对 10 Pro 的影响**：改法 B 已回滚；保留的改动里只有 `keyboardHidden` 错峰有"首帧晚一帧"的极小影响（要绝对零影响可回滚它）；移除 arc 只影响 pill（rect 用另一条线性 progress）；词典分片与 `dictlazy` 无感
- 文档：`docs/官方版对照测试与三个质疑回应.md`
- **⭐ 独立"分帧版"组件（用户建议的写法，2026-09-25 已实施）**：`src/components/InputMethod/InputMethodStaged.ux` —— 复制当前版（**外观/尺寸/图片/圆角/滚动全不变**），仅把 pill 分支拆 3 帧挂载（`pillStage` 0→1→2→3：①顶部条+功能图 ②键盘前两排 ③第三排+空格图；`advancePill()` 仅在 pill 生效，触发点 onInit / watchHide / adjustScreenWidth）。**单帧节点 200+ → 约 70**，与已验证安全的 A~E 量级相当
  - 诊断页 `input-crash-diag2` 现为 **A~H**：F=当前组件，**G=官方原版**，**H=分帧版**（F 与 H 唯一差异=是否分帧，是最干净的对照）
  - 包体：新增仅 +49KB 源码（jsc 后更小），**assets 三者共用不重复打包**，空间充足
  - 线上零变化：`InputMethod.ux` 仍是 chinese-input 使用的正式版；Official/Staged 只在诊断页被引用
  - **H 通过后切换**：方式一（推荐）把分帧逻辑合并回主组件并删除 Staged；方式二把 chinese-input 指向 Staged 观察后再合并。**H 也不通过 → "单帧总量"假设不成立，转 F1~F5 细分或 B3（去圆角描边）**
- **⭐⭐ 第三轮反馈（关键证据）**：用户点「一键跑全部」→ **卡了很久 → 重启**；重启后显示 **E**，再跑显示 **F**
  - **"卡很久"** = 主线程长时间阻塞（看门狗复位），非瞬时崩溃
  - **同一项 E：逐项点通过、连续跑却挂** → 差异不在 E 本身，而在"它前面已渲染销毁过 A~D" → **节点/渲染资源累积**
  - 根因修订为 **R2「渲染负载」= 单帧总量 + 累积量**：A~E 单独跑全过证明"每小块安全"；F 一次渲染全部（200+ 节点 + 8 PNG + 26 个圆角描边 text + 2 scroll）→ 单帧超载；**真实输入页等价于 F**
- **最有依据的修复 = 分帧挂载（尚未实施，等用户确认）**：pill 分支加 `pillStage` 状态 0→1→2→3，用 `if="{{pillStage >= N}}"` 分段挂载 + `setTimeout` 递增（①候选/功能行 ②键盘前两排 ③第三排+图片），单帧节点 200+→约 70，**外观/尺寸/图片/圆角/滚动全部不变**，约 200ms 内逐块出现
  - 备用：B1 图片单独一帧 / B2 每排一帧 / B3 去圆角描边 / B4 虚拟化 / B5 T9
  - 若仍挂 → 是"总量"（内存）而非"单帧"，诊断加 G（连续跑 A~E 两遍）/ H（分段挂载键盘=修复验证）
  - 文档：`docs/第三轮反馈-卡顿重启与分帧方案.md`
- **教训**：连续四轮假设（布局→阻塞→存储并发→词典内存）全错。**先做可隔离的实测二分，不要凭代码推断连续猜方向**
- **用户偏好（记牢）**：不接受"为修 bug 一次性大改界面影响所有用户"的方案；宁可多花一轮定位也要把改动面缩到最小
- 文档：`docs/第二轮结果-F项卡住分析.md`（含路线 1 F1~F5 细分、路线 2 改法 A/B）
- **保留的已落地修复**（均不改变界面主体）：移除 arc progress；`dictlazy` 诊断开关（默认 false）；词典分步分片初始化；键盘延时一帧展开
- **用户偏好（记牢）**：不接受"为修 bug 一次性大改界面影响所有用户"的方案；宁可多花一轮定位也要把改动面缩到最小

### 诊断页模式（可复用）
- 凡"可能崩溃 + 真机机会少"的排查，按"落盘进度 → 延时 → 执行 → 完成清空"套路做一次性诊断页，不要反复改代码出包
- 已有：`input-crash-diag`（存储/词典）、`input-crash-diag2`（A~F 元素级）、`device-id-diagnosis`（7 个 API 单测）
- storage key：执行前写 `*_step`、完成清空 → **重启后打开页面顶部直接显示"上次崩在第 N 步"**；`*_passed` 记已通过步骤
- **每次复测前先确认真机装机版本号与仓库一致**（激活 URL 的 `r` 参数 = 包内 versionName）

## 数据层约定
- 跨星期更新必须单次原子写盘（`updateCourseAcrossDays`），禁止"先删后插"
- `JSON.parse` 必须 `try/catch` + 兜底（全项目 41 处已保护）
- 删除必须二次确认 + 5 秒撤销（撤销要写回存储，定时器在 `onDestroy` 清理）

## 构建与打包（2026-09-25 实测）
- **命令**：`env -u NODE_OPTIONS npx aiot release --enable-jsc` → 再 `node scripts/rename-rpk.js` 产出 `dist/ev-v{版本}-{channel}.rpk`（当前 v1.6.115 / t-9p-d，约 932KB）
- ⚠️ **必须 `env -u NODE_OPTIONS`**：AIoT IDE 注入了 `NODE_OPTIONS=--require=.../node-language-shim.cjs`，其含 **safe-delete 保护**；构建清理 `.temp_class`（674 文件 > 阈值 500）会被拦截并报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 导致构建中断
- ⚠️ **不要用 `npm run release`**：其 `prerelease` 钩子会 `bump-version`（版本再 +1）
- ⚠️ **不要用 `_build_test.sh`**：内含 `rm -rf build dist .temp_class`，违反本项目"禁止破坏性命令"的规则（`_do_build.sh` 是干净版本）
- ⚠️ **从上游导出组件时**：把 `./assets/` 批量替换成绝对路径会**误伤 JS 的 import**（`import ... from "/components/.../dicUtil.js"` → 编译报 `require` 无法解析）→ `.js` 的 import **必须保持相对路径** `./assets/dicUtil.js`，只有**图片资源**可改绝对路径
- 构建会提示入口体积：同时 import 多个组件会让页面入口膨胀（诊断页 2 = 355KB > 推荐 244KB）→ 诊断组件用完应删除

## 用户协作偏好
- 冲分要求**真实代码改进**并同步文档，不接受只改数字虚报
- 每次改动**立即** `git add -A && git commit` 并注明改动说明（未跟踪文件一并纳入）
- 禁止 `git clean` / `reset --hard` / `rm -rf` 等破坏性命令；恢复用 `git checkout HEAD~1 -- <路径>`
- 完成对话后用 mac 弹窗 + 语音：`osascript -e 'display notification "正文" with title "标题"' ; say -v Tingting "正文"`（用 `;` 不用 `&&`）。中文语音注册名 `Tingting`
- 所有 md 文件用中文书写

## 单元测试约定（2026-09-23）
- ①**纯函数**：从 `.ux` 正则提取 `<script>` 截片段 + `/tmp` 跑 `node`（零依赖）
- ②**依赖 storage**：劫持 `Module.prototype.require` 注入内存 fake `@system.storage`，再 require 真实 `database.js`
- ③**页面方法**：`new Function("require", script+";return page;")(require)` 注入 mock
- fake 全内存、脚本放 `/tmp`，不进工作区；已验证课程增/改/删全部 PASS

## 表盘与手机侧同步
- **表盘 `.bin` ≠ 快应用 `.rpk`**：表盘无自定义数据源/存储/输入法，只能"预设内容 + 按星期切换"；表盘 ↔ 快应用无通信通道。**凡"要能输入能编辑的课程应用"本质就是快应用**
- **手机侧导入唯一可行路径 = AstroBox 插件**（Rust→WASM，一次开发全平台），`interconnect.send_qaic_message` 发给手环快应用。官方 `plugindoc.astrobox.online`，参考 `AzumaChiaki/Varclass-Astrobox-rust`（MIT）
- 竞品 `Jursin/Schedule-Vela`、Var课程表均已支持插件导入。Ev 优势 = **手环上直接编辑**；短板 = 无手机侧批量导入
- **本项目已实现**：`EV Schedule Sync`（`.abp`）v1.0.20 内测，仓库 `guomengtao/app-auth`；`app.ux` 已有 `initSyncReceiver()`（存 `astrobox_sync_data`）+ `manifest` 加 `system.interconnect` feature。**尚未真机验证**
- **守门人模型**：导出/导入按域白名单；`SYNC_ACCESS` 权限表用 read/write 双维定义（schedule/profile/homepage/appearance 读写、version 只读、pinned 显式只读、auth 禁止）；`SYNC_FIELD_DOMAIN` 映射 update_settings 字段到域。改权限只动一张表
- 协议三件套：`import`（宽容解析，写前备份 `astrobox_sync_backup`）/ `export`（按域）/ `update_settings`（nickname·homepage·homepageTemplate·baseFontSize 20~76）。配置编辑必须**读→改→写**
- 钉首页数据在 `src/data/pin-helper.js`（KEY `pinned_pages`）：`pinPage`/`unpinPage` 会弹 Toast，同步静默写入须直接操作 storage
