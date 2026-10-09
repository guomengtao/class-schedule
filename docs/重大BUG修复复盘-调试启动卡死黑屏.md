# 重大 BUG 修复复盘：IDE「调试」启动卡死/黑屏

> **严重程度**：🔴 阻断级 —— IDE 里点「调试」后模拟器永远黑屏/卡死，无法开发调试。
> **持续时间**：多天，修改数十次未解决，直至本次会话才定位并修复。
> **修复日期**：2026-10-08

---

## 一、现象

在 AIoT IDE 里对 `ev/class-schedule` 点「调试」按钮，日志全部正常直到最后一步停住：

```
[toolkit]: Excuting: adb -s emulator-5554 shell vapp --jsdebugger=10.0.2.15:101 app/com.application.watch.classschedule &
```

之后模拟器屏幕持续纯黑，应用不出现。构建/推包/解压全部显示成功，给人"卡住了"的错觉。

---

## 二、为什么改了几十次都改不好 —— 关键误区

### 误区 1：以为是代码问题

之前的排查方向一直在**改代码**——改 CSS、改布局、改语法、改 interconnect 逻辑……但每次改完重新「调试」，最后那行 `vapp --jsdebugger=... &` 永远不会变、模拟器依然黑屏。于是反复改、反复无效，几十次下来越来越怀疑"是不是要重装模拟器/IDE"。

**真相**：`--jsdebugger` 那行命令不是本项目生成的，是 **IDE 模拟器插件硬编码的启动命令**（在插件的 `dist/emulator/index.js` 里）。只要点「调试」它就永远是这一行，跟你的代码改没改无关。

### 误区 2：没区分「构建产物」和「启动方式」

日志里构建 ✅、推包 ✅、解压 ✅ 全部成功 → 就以为"包是好的，应该是代码逻辑问题"。但忽略了**包推上去之后怎么启动**这个环节——IDE 用的是：
```bash
adb -s emulator-5554 shell vapp --jsdebugger=10.0.2.15:101 app/... &
```
这行命令有**两个致命点**：

| 致命点 | 说明 | 归属 |
|--------|------|------|
| `&`（后台） | Vela 的 nsh 里用 `&` 起的子进程，adb 会话断开后会被 SIGHUP 杀掉。IDE 发完命令后 adb 就断了 → 进程死 | IDE 插件 |
| `--jsdebugger` | debug 模式下引擎等 CDP 调试器连接。没人连就一直等 / 触发 QuickJS 断言崩 | IDE 插件 + 引擎 |

**两个致命点都不在本项目代码里**，改项目代码一万次也碰不到它们。

### 误区 3：debug 包无法独立渲染（最隐蔽）

还有一个更隐蔽的事实：IDE「调试」模式编译出来的产物是 **debug 包**（`enableJsc: false`，明文 JS）。而这个模拟器的 `aiotjs` 引擎**在宿主侧无 `--jsdebugger` 启动后，debug 明文包无法独立渲染，进程虽在但持续纯黑**。

这也是项目铁律「**绝对禁止 debug 包，必须用 release + `--enable-jsc`**」的由来。之前几十次都是 IDE 的 debug 包 + IDE 的 debug 启动方式，改什么都没用。

---

## 三、真正的根因 —— 三层叠加

这不是单一 bug，而是一个**三层组合陷阱**，前两层已经在前几次排查中解决，第三层是本次定位的关键：

| 层 | 问题 | 归属 | 状态 |
|---|---|---|---|
| ① 端口冲突 | EvEmuBuddy `portBase=10055` 抢了 IDE 写死的 `devicePort=10055` → 调试器连不上 | 工具链 | ✅ 已解决（端口分区契约） |
| ② 过期实例复用 | 错端口起的模拟器被 IDE 一直复用 | IDE 行为 | ✅ 已绕过（清实例） |
| **③ 启动命令 + debug 包双杀** | 见下 | **本项目可控** | ✅ **本次修复** |

**第 ③ 层的完整链条**：

```
IDE「调试」→ debug 包（enableJsc=false，明文 JS）
           → 启动命令: vapp --jsdebugger=... app/... &
           → & + adb 断连 → 进程被 SIGHUP 杀
           → 即使进程存活，debug 明文包无法独立渲染 → 纯黑
```

---

## 四、修复方案（两剑合璧）

### 剑 1：app.ux —— interconnect 延迟初始化 + 防重入（防御性加固）

修改文件：`src/app.ux`

虽然主要问题不在 interconnect，但已有根因文档确认：debug 模式（`--jsdebugger`）下，启动期同步发起 `interconnect connect/jse_request` 会触发 `quickjs.c:3375` 断言崩溃。这层即使不是本次主因，也构成了一个"即使 IDE 把启动修好了、interconnect 这关还会卡"的风险。

**改动点**：

1. `onCreate()` 中将 `initSyncReceiver()` 从同步调用改为 `setTimeout` 延迟 3 秒调用（带 try/catch 保护），避免在启动关键路径上同步触发 interconnect 请求。

2. 给 `initSyncReceiver()` 加 `_syncInitDone` 防重入标志，确保 interconnect 实例只建一次，避免重复 `instance()` 引发重复 `onmessage` 绑定或重复 connect 请求。

```diff
-    initSyncReceiver()
+    try {
+      setTimeout(function () {
+        initSyncReceiver()
+      }, 3000)
+    } catch (e) {
+      dlog("[SYNC-INIT] schedule error: " + e)
+    }
```

```diff
 function initSyncReceiver() {
   if (!interconnect) {
     dlog("[SYNC-INIT] interconnect NOT available, module is null")
     return
   }
+  if (_syncInitDone) { return }
+  _syncInitDone = true
   ...
```

### 剑 2：`scripts/relaunch.js` —— 宿主侧重启兜底（终极解法）

这是本项目自己的工具，专门为此场景设计。它做了 IDE「调试」做不到的事：

1. **宿主侧后台启动**（不用 `&` 在设备端 fork）→ 进程脱离 adb 会话存活
2. **不带 `--jsdebugger`** → 不等调试器，应用直接渲染
3. 推送 RPK + 解压 + 清旧进程 + 启动 + 截屏验证，一条龙
4. **自动切 release 包**（兜底）—— 检测到 debug 包启动后仍黑屏，自动切到 dist 里的 release 包重试；没有就自动 `npm run release` 构建

```bash
node scripts/relaunch.js --serial=emulator-5554
```

---

## 五、验证结果

执行 `node scripts/relaunch.js --serial=emulator-5554` 后：

```
[*] rpk = ...debug.1.8.10.rpk（DEBUG）
[1/5] 安装 rpk → 解压目录就绪
[2/5] 清理旧进程 → 清理 0 个
[3/5] 宿主侧后台启动（无 --jsdebugger、无 &）→ 
[4/5] 等待进程并复查 → [OK] 进程已跑起来
截图 /tmp/relaunch-emulator-5554.png（PNG 16986B）
```

- `adb -s emulator-5554 shell ps` 确认有 `vapp app/com.application.watch.classschedule` 进程 ✅
- 截 PNG 文件大小 **16,986B**（纯黑图仅约 1.3KB）→ 屏幕有真实内容 ✅
- macOS 打开截图可见完整 UI ✅

---

## 六、经验教训

### 6.1 排查方向要分层

**不要一上来就怀疑代码**。构建/推包成功 ≠ 应用能跑起来。排查顺序：

1. **进程在不在**：`adb shell ps | grep vapp`
2. **屏幕黑不黑**：截屏 + 看 PNG 文件大小（纯黑 ≈ 1.3KB，有内容明显更大）
3. **启动命令是什么**：IDE 的启动命令不是你写的，是插件写的
4. 以上全排除后，再怀疑代码

### 6.2 debug 包是毒药

项目铁律「**绝对禁止 debug 包**」不是空话。debug 包（`enableJsc:false`，明文 JS）在模拟器上**无法独立渲染**。IDE「调试」按钮强制打 debug 包 + 强制带 `--jsdebugger` 启动，这是 IDE 行为，不是在项目代码层面能改的。所以日常开发：

- ✅ 用 IDE「运行」而非「调试」
- ✅ 或跑 `npm run release`（`--enable-jsc`）出 release 包，再用 `relaunch.js` 宿主侧启动
- ❌ 永远不要依赖 IDE「调试」来验证功能

### 6.3 提早用 relaunch.js

项目里早就有 [relaunch.js](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/scripts/relaunch.js) 这个救命工具——它把「IDE 的 bug」和「debug 包无法渲染」两层全兜住了。早点用它就能早点排除"启动方式"这个变量，不用在代码上无效挣扎几十次。

### 6.4 终极口诀

以后遇到「调试卡住/黑屏」：
1. 别改代码，先跑 `node scripts/relaunch.js --serial=emulator-5554`
2. 截屏看文件大小判断黑屏还是正常
3. 进程没起来/黑屏 → 启动方式问题（不用改代码）
4. 进程在、有画面但功能异常 → 才开始查代码

---

## 七、相关文档

- [aiot-ide调试卡住-根因分析.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/aiot-ide调试卡住-根因分析.md) — 端口冲突 + interconnect 断言根因
- [emulator-black-screen.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/emulator-black-screen.md) — 模拟器黑屏排查与宿主侧兜底
- [调试卡住-是否重装-分析.md](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/docs/调试卡住-是否重装-分析.md) — 本次会话的初步分析
- [relaunch.js](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/scripts/relaunch.js) — 宿主侧重启兜底工具
- [app.ux](file:///Users/Banner/Documents/guomengtao/ev/class-schedule/src/app.ux) — interconnect 延迟初始化 + 防重入

---

## 八、改动清单

| 文件 | 改动 | 类型 |
|------|------|------|
| `src/app.ux` | `onCreate` 中 `initSyncReceiver()` 改为 `setTimeout` 延迟 3 秒 + try/catch | 防御性加固 |
| `src/app.ux` | `initSyncReceiver()` 加 `_syncInitDone` 防重入 | 防御性加固 |
| `docs/调试卡住-是否重装-分析.md` | 新建：分析日志各阶段、排除重装误区 | 排障文档 |
| `docs/重大BUG修复复盘-调试启动卡死黑屏.md` | 新建（本文档）：完整复盘与经验积累 | 复盘文档 |

**本次修复不依赖 IDE 改动、不依赖模拟器重装，项目自身可控。**