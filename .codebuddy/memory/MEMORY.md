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
- 症状是**系统级复位**，不是"看不见键盘"→ "重启"类问题不要往布局方向查
- **实测·第一轮诊断**：并发写×5 通过、并发读×7 通过、第 3 步（建键盘，`dictlazy=true` 不加载词典）崩溃 → 排除 W1 阻塞 / W2 arc / W3 并发 storage / W4 词典内存
- **⭐⭐ 实测·第二轮（元素级 A~F）**：**A B C D E 全部通过，F（完整 pill 键盘）卡住**
  - **五个单项全部无罪**：26 个文本节点、`border`+`border-radius`、`scroll-x`、PNG 图片、`position:absolute` 堆叠 —— 逐一证明无害
  - **副产物**：我此前的"极简重写"方案（去 PNG/描边/圆角/绝对定位/嵌套 scroll）**即使执行也无效**，用户要求回滚是完全正确的
  - 元凶收敛到「**组合 / 组件机制**」
- **F 与 A~E 的本质差异（= 嫌疑点）**：A~E 是页面内静态 DOM；F 是引入组件，独有 ①根节点 `position:absolute; left:0; bottom:0` ②`onInit` 里**第二次 `device.getInfo`**（`adjustScreenWidth`）③4 个 `$watch` ④`cvalrow-wrap` 等独有节点 ⑤放在 `<scroll>` 父级里（`chinese-input` 同样如此）
- **修订后主因 R1 = 组件根 `position:absolute; bottom:0` 与父级 `<scroll>` 的组合**（与"F 崩而 A~E 全过"最吻合；第一轮分析中已标为"结构性放大项"）
- 10 Pro 免疫的原因：结构相同但键盘 255px（pill 305px+28 拼音行）、屏高 480 → **临界型问题**，非"某元素必然崩"
- **✅ 已应用修复（改法 B，2026-09-25，只影响跑道屏）**：`InputMethod.ux` 根节点改为 `position: {{screentype === 'pill-shaped' ? 'relative' : 'absolute'}}` —— pill 走普通流式，摆脱"绝对定位根 + 父级 `<scroll>`"组合；rect/circle 保持 absolute，**10 Pro / 圆屏零影响**。两个诊断页的 `.ime-host` 同步 `height:305px → min-height:305px`。**待用户跑第二轮验证 F 项是否通过**
  - 回滚：`git checkout HEAD~1 -- src/components/InputMethod/InputMethod.ux`（一行定位表达式，成本极低）
  - 若改法 B 无效 → 走 F1~F5 细分，锁定 R2（组合负载）或 R3（二次 `device.getInfo`）
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
