# 长期记忆

> 只放**长期有效**的执行规则；过程记录留 `YYYY-MM-DD.md`；被推翻的旧结论删除时当日日志留一行；细节长文落 `docs/`。
> 跨项目总入口：`/Users/Banner/Documents/guomengtao/PROJECT-MAP.md`（含愿景、多项目协作状态）。

## 项目与版本
- Ev课程表（Vela 手环快应用）包名 `com.application.watch.classschedule`，仓库 `guomengtao/class-schedule`；**本地唯一副本 `tom/class/class`**（含 `sign/` 密钥）
- 评分体系 `docs/标准版完善度综合评分.md`；守护手册 `docs/标准版100分评分标准.md`；当前 **100/100**，重点防回退
- `manifest.json`：`deviceTypeList` 只能 `["watch"]`；**router 极简**：`_groups` / `pages[*].group` / `name_cn` 已全部移除（2026-09-30，避免加载问题），`pages[*]` 只留 `component`，键名必须与 component 对应
- 版本号：`scripts/bump-version.js`（patch+1、code+1，写 manifest + `data/version.js`），只经 `npm run release|build|bump` 触发（禁 `npx aiot release`/`build:dev`）；判断用户测的是否新包看回传 `r` 参数
- 构建：`npx aiot release --enable-jsc` → `node scripts/rename-rpk.js` → `dist/ev-v{版本}-{渠道}.rpk`（须绕开 safe-delete 垫片）；禁 `npm run release`（会 bump）与 `_build_test.sh`；清目录用 `mv /tmp/trash/`

## 设备参数
- 手环9 pill **192×490**（VVD `xiaomi_band`）；环11 212×520；10 Pro 336×480 rect；REDMI Watch6 432×514 rect（VVD `REDMI-Watch-6`）
- 屏型：跑道屏返回 `pill-shaped`，真机也出现 `capsule` → **两种都要认**；`osVersionCode` 可能为 0，别假设 `getInfo` 字段存在
- `designWidth=device-width` → px 与屏幕 1:1，**不做基准缩放**

## 布局与交互红线（Vela）
- **`<stack>`/`<scroll>` 作容器时子元素必须显式 `width`**（根内容层 `width:100%`）；根容器绑 `background-color` 兜底
- **列表行 onclick 只放整行容器**，行内子元素一律不绑 → 热区=整行
- **模拟器「通过」≠ 真机通过**：模拟器只适合排除法/取证/画面判读，验收靠真机
- **「模拟器正常真机崩」第一怀疑：隐式宽度中间层 + 隐式 flex 默认值** → 修复=补显式 `width:100%`/`flex-direction`（模拟器上 no-op，无回归风险），只能真机往返验收
- **「点了没反应」第一怀疑系统 API 回调不来**（`vibrator.start`/`storage.get` 可能既不 success 也不 fail）→ `typeof` 守卫 + try/catch + **~400ms 看门狗**兜底；`store.showUnlockDialog` **返回值必须处理**（未注册时静默丢弃），失败重试一次再 toast
- **禁为此类问题搭新模拟器镜像**（已 15 轮止损）：镜像与真机厂商 Vela 不同源，不可证伪；正确路径=显式化加法 + 修复包真机往返 + 诊断页
- 验证优先级：**单元测试 ＞（画面类）模拟器截图 ＞＞ 真机往返**
- **胶囊屏弹窗几何**：遮罩对称 padding `40px 16px` + 卡片 `width:100%`；**禁百分比宽与 `max-width`**；不要算居中（`align-items:center` 不可靠）；`.modal-desc` `lines:4`；**同文件不要出现两个 capsule `@media` 块写同一属性**
- **页面根容器 padding 必须移到内层容器**（Vela absolute 按父级**内容盒**算，否则弹窗/抽屉被整体内缩）：已处理 settings / homepage-settings / schedule-manager / backup-restore / reset-data / premium-overlay
- 底部抽屉：overlay `absolute;left/top:0;width/height:100%` 遮罩 + 面板 `absolute;left/bottom:0;width:100%;border-radius:16px 16px 0 0`；内容包 `.xxx-body`，抽屉留根容器下
- 打开浮层处理器必须有越界守卫 `if(idx<0||idx>=list.length)return`
- 胶囊屏硬约束：`week-view` 可视列数 2.5~3.5、关行号列、`cellWidth≤60`、按钮高≥48px、header 标题约 5 字（title 18px）
- 改布局前**先查该页媒体块内是否有同选择器的重复定义**（多组会互相覆盖）
- 「解锁高级版」弹窗统一收敛到 `premium-overlay.ux`，别逐页复制（历史曾复制 6~7 份导致 192×490 破碎）
- 测试前必须固定两个变量：**屏尺寸（手环9=192×490）+ 业务状态（激活/未激活）**

## Vela 模拟器取证
- 截图落 `~/Downloads/vela_screenshot/`（软链 `~/.vela/sdk/screenshot`）；`adb` 在 `node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb`（NuttX NSH，无 wm/input/screencap）；gRPC 控制台端口=adb 端口+3000（端口每次**先探测**）
- **重启单个模拟器实例**：必须走启动器 `~/.vela/sdk/emulator/darwin-aarch64/emulator -vela -avd <名> …`（裸跑 qemu-system-armel 会 dyld 缺 libandroid-emu-tracing）；判活两步 = `emu avd name`（宿主侧）+ `shell echo alive`（guest），后者不通=guest adb 僵死只能重启实例；「起不来」先查卡死的 `adb shell unzip` 部署进程
- **点击注入不可靠**（gRPC 输入空实现；`event mouse` 坐标=皮肤窗口坐标需标定；首帧极易失准）→ 可靠做法=带重试探针（点→截图→按 PNG 字节数判页：首页>18KB、欢迎页≈13KB、纯黑=1373B）
- **运行时优先 `.jsc`**：`.js` 与 `.jsc` 同存时只用 `.jsc`，推 `.js` 被静默忽略（需 `aiot release --enable-jsc` 产出）
- 部署：运行时只认解包目录 `/data/quickapp/app/<pkg>/`；改单页只推 `pages/<页>/<页>.jsc`；5.0 上 `pm install /data/<包名>.rpk` 才是安装通道
- **禁跑 `vapp help`**（挂住 stdin→全黑，需 reboot）；反复 `vapp app/<pkg> &` 会累积进程
- **最快逐页取证**：把巡航定时器放 `app.ux`（跨 `router.replace` 存活）+ 一次构建一次启动连拍（27 页 ≈ 2–3 分钟）；采完必须还原源码与 jsc
- 工具集：`scripts/emulator-eye.js`（`shot <端口> <out.png>` 位置参数）、`scripts/png-measure.js`、`scripts/audit-capsule-width.py`

## 数据层 / 单元测试 / 默认设置
- 跨星期更新必须原子写盘（`updateCourseAcrossDays`），禁「先删后插」；`JSON.parse` 必须 try/catch；删除二次确认 + 5s 撤销
- 弹窗/面板内点击必须 `stopBubble(e)` 且真正 `e.stopPropagation()`
- 单测：正则提取 `<script>` + `/tmp` 跑 node；依赖 storage 时劫持 `Module.prototype.require` 注入 fake；页面方法用 `new Function`
- 默认设置集中 `src/data/app-defaults.js`（字段 entry+policy+since）+ 引擎 `defaults-engine.js`；红线：`app_state` 不存在**绝不能当新用户**；迁移后 `store.clearCache()`；对象/数组返回副本

## 输入法（已结案）
- `src/components/InputMethod/` = 上游 `NEORUAA/Vela_input_method`，**保持逐字节零改动**（官方组件不自己改，出问题先在宿主侧解决）；动手前 `gh api` 查上游 commits + raw diff
- 宿主适配 3 处：import + 传 dictionarypath + `manifest.features` 含 `system.file`；宿主容器用 `<div>` 而非 `<scroll>`（scroll 不拉伸子元素会让组件内 absolute 层退化）
- 词典外置 `assets/dictionary/*.txt`；`hide=false`（true 会跳过词典导致中文无候选）

## 表盘与手机侧同步
- 手机侧唯一可行路径 = AstroBox 插件（app-auth `tools/ev-schedule-sync`）
- **守门人模型（app.ux `SYNC_ACCESS`）**：数据开放边界 100% 由手环侧控制；四种策略 = read(always/explicit/never) × write(true/false)；改一处即可切换

## macOS 侧 EvNotifier（app-auth `tools/ev-notifier`）
- **操作手册：`tools/ev-notifier/EvNotifier桌面App与日常迭代手册.md`（改之前先读）**
- LaunchAgent `com.evnotifier.agent`（plist 由脚本生成，别手工拷）；`KeepAlive=True` 保崩溃自愈；**`launchctl kickstart -k` 是重启手段**（所以别改 `KeepAlive={"SuccessfulExit": False}`）
- **菜单「退出」先 `launchctl bootout` 再退出**（`stop_launchd_job()`），plist 保留 → 退出不复活、下次登录仍自启；手工复活 `launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.evnotifier.agent.plist`
- **正规桌面 App**：`./build_app.sh` / `--install` 到 `/Applications/EvNotifier.app` = bundle + 自带 venv（~66MB，禁 rm -rf，用 mv /tmp/trash；venv 缓存 /tmp/evnotifier-venv-cache）。bundle 里是**拷贝**，改完代码要重新 build+install
- **启动路径自动移交** `handover_to_launchd()`：双击 App/手动跑脚本时改写 plist 指向自身 → 延迟 2s bootstrap → 自己退场，保证最终只有一个受托管实例
  - 🔴 `os.getppid()==1` **不是**"被 launchd 拉起"的判据（Finder/LS 双击也是 1）→ 用 `launchctl list <label>` 取 job PID 比对 `os.getpid()`
  - 🔴 进程还活着时**绝不能 bootstrap**：launchd 会立刻再拉一个实例，抢不到 PID 锁就退，KeepAlive 补位 → 秒退秒起死循环（`ensure_auto_start()` 已只写 plist）
- 客户端版本在 `tools/ev-notifier/version.json`，改客户端要 bump 并 `launchctl kickstart -k` 重启
- **日常迭代**：改代码 → `./build_app.sh --sync`（~2s：拷源码 + kickstart -k）；`--link` 可把 bundle 脚本软链到仓库（更快但依赖仓库存在）；只有依赖/图标/版本变才 `--install`
- **可分发**：`--dmg` 出 `dist/EvNotifier-v{版本}-macos-arm64.dmg`（自持 python-build-standalone 3.12，~92MB）。⛔ 不能用 Homebrew Python 做可移植运行时（_ssl 等依赖外部 dylib）；运行时放 `Contents/Resources/python/`（放 Frameworks/ 会被 codesign 当嵌套代码签名报错）；uv 运行时删 `EXTERNALLY-MANAGED` 才能装依赖；`/Volumes/` 上跑不写 plist
- 🔴 **`launchctl list <label>` 打印 plist 字典没有 PID**；要 PID 必须用**无参数** `launchctl list`（`PID\tStatus\tLabel`），shell 里用默认 FS 的 awk 匹配第 3 列

## 用户协作偏好（硬要求）
- **每次改动编译/校验通过后自动 `git add -A && git commit`（Conventional Commits，type 符合 `commitlint.config.js`）→ `git push origin main`**；**禁 force push**，被拒先 `git fetch` 核对并报告
- 禁 `git clean -fd/-fdx`、`git reset --hard`、`rm -rf`；恢复用 `git checkout HEAD~1 -- <路径>`
- 不接受为修 bug 一次性大改界面影响所有用户；宁多一轮定位把改动面缩到最小
- 对话结束提醒：`scripts/notify.sh "标题" "正文" "语音文本"`（mac 通知 + **Edge TTS 晓晓 zh-CN-XiaoxiaoNeural**，失败回退 `say -v Tingting`；edge-tts 在 `/opt/homebrew/bin/edge-tts`）
- 所有 md 用中文；项目根目录保持干净（散落文档入 `docs/`、临时脚本归 `archive/`、`sign/` 含证书禁移动）
- app-auth 有用户并行未提交改动时：**只 add 自己改的文件**；推送被拒 → `git pull --rebase --autostash` → push（已用成功，用户脏工作区保留）
