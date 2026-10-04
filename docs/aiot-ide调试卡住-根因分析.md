# aiot IDE「调试」卡死：根因分析（2026-10-04）

> 现象：在 aiot IDE 里对 `ev/class-schedule` 点「调试」，构建 ✅、推包 ✅、最后一步
> `adb -s emulator-5554 shell vapp --jsdebugger=10.0.2.15:101 app/com.application.watch.classschedule &`
> 之后卡住 / 没有下文，手环模拟器上应用不出现。

## 一、结论先说

这个问题其实是**三层叠加**，前两层已经解决，**第三层在应用/quickjs 运行时侧，不在我们这边能改的范围**：

| 层 | 问题 | 归属 | 状态 |
|---|---|---|---|
| ① 端口冲突 | EvEmuBuddy `portBase=10055` 抢占 IDE 调试器写死的 `devicePort=10055` | 我们（工具链） | ✅ 已解决 |
| ② 过期实例复用 | 起错的模拟器（hostfwd=10056）被 IDE 复用、不再重新分配端口 | IDE 行为 | ✅ 已绕过（清实例+运行记录） |
| ③ 应用调试启动即崩溃 | `--jsdebugger` 下应用启动时 `jse_request` 触发 QuickJS 断言 | **应用侧 / quickjs-debugger** | ❌ 未解决（见 §四） |

一句话：**端口的事已经排干净了；现在卡住是因为应用在调试模式下启动即崩溃（QuickJS 断言），这不是端口/模拟器冲突，得从应用侧或工具链侧修。**

---

## 二、三层证据（日志原文）

### ① 端口冲突（已解决）

IDE 日志（`~/Library/Application Support/AIoT IDE/logs/<会话>/`）：
```
devicePort:  10055
Error: connect ECONNREFUSED 127.0.0.1:10055
[AIOT-DEVTOOLS] [launch] failed:  Error: connect ECONNREFUSED 127.0.0.1:10055
```
`vela.aiot-devtools` 的 `devicePort` 是写死的 **10055**。而 EvEmuBuddy 当时的 `portBase=10055` 先占了它 → IDE 的模拟器退到 10056 → 调试器连 10055 被拒。

**处置**：buddy `portBase` 改 12000、控制台段改 13000；端口分区契约定稿（见 `ev/ev-emu-cli/README.md`）：
`IDE 10055 · vela 11000-11099 · buddy 13000+/12000`。之后新起模拟器稳定拿到 10055，日志再无 `ECONNREFUSED 10055`。

### ② 过期实例复用（已绕过）

即便端口空出来，**已经起错的那台实例不会被重新分配端口**——IDE 会复用运行中的实例（`findInstance` 读 cmdline 里的 hostfwd）。所以必须：
1. 杀掉旧实例；
2. 移走 `~/.vela/vvd/<avd>.vvd/` 下的 `emu-launch-params.txt`、`multiinstance.lock`（否则 IDE 仍按旧参数复用）。

### ③ 应用调试启动即崩溃（未解决，核心）

14:49 那次，端口已正确（`Start CMD: … -avd xiaomi_band_pro … hostfwd=10055`），调试配置也推了
（`quickapp_debug_cfg_xiaomi_band_pro.json → /tmp/quickapp_debug_cfg.json`），构建/推包全成功，
但应用仍起不来。IDE 捕获的模拟器内核输出里有决定性一行：

```
[AIOTJS] [runtime_bootstrap_internal:323] Bootstaping finished
[AIOTJS] [run:563] Launching App - hap://app/com.application.watch.classschedule ...
[AIOTJS] [__loadApplication:110] load app.jsc.
[AIOTJS] [__create_dir:793] jse_file mkdir failed, path:/data/quickapp/cache/com.application.watch.classschedule/,17
[AIOTJS] [__miwear_create:101] [interconnect] create
[AIOTJS] [__miwear_connect:200] [interconnect] call connect
[AIOTJS] [__request_init:488] [jse_request]
[ap] _assert: Assertion failed : at file: quickjs/quickjs.c:3375 task: com.application.watch.classsche process: vapp
```

**应用启动到一半（`Launching App` → `load app.jsc` → `interconnect call connect` → `jse_request`）就崩在
`quickjs/quickjs.c:3375` 的断言上。** 这个崩溃跟端口、adb、gRPC 全都无关，是应用进程自身的 QuickJS 运行时崩溃。

---

## 三、为什么「解决不了」——确切定位

1. **崩在 `jse_request`（interconnect 请求）之后**。`class-schedule/src/app.ux` 里有整套启动期
   interconnect 逻辑（构建告警里的 `_syncConnect` / `syncSendToPhone` / `stopResident` 都是这套）。
   应用启动时就会主动 `interconnect create → connect → jse_request`（去连手机端同步器）。
2. 在 **普通 `vapp`（不带 `--jsdebugger`）下应用能正常跑**（手环模拟器上日常截图一直是这么跑的）；
   只在 **`--jsdebugger`** 下，这条 interconnect 请求路径触发 QuickJS 断言 → 崩。
3. 因此这是「**应用启动期 interconnect 调用 + quickjs 调试器集成**」二者叠加的 bug——**不在我们的模拟器/端口/看门狗能力范围内**，改端口、重启、清缓存都治不了它。

> 附带一个次要信号：`jse_file mkdir failed, path:/data/quickapp/cache/…,17`（errno 17 = EEXIST，目录已存在）。
> 大概率是运行时的无害告警，但也不能完全排除是断言的前置诱因，排查时可一并留意。

---

## 四、到底能不能解决？（能，但要找对人）

**能解决，但改的地方不在我们这一侧。** 按优先级：

1. **应用侧（最可能、最快）**：`ev/class-schedule/src/app.ux` 的启动期 interconnect 调用。
   - 把 `interconnect create/connect/jse_request` 从**启动同步路径**挪走：延迟到 `onShow` / 加延时 / 或判断
     「对端（手机同步器）不可达时跳过」，避免 `onInit` 阶段就发请求；
   - 或者：调试模式下（`--jsdebugger`）先跳过 interconnect 初始化，连上调试器后再补。
   - 这能绕开启动即 `jse_request` 触发 assert 的场景。
2. **工具链侧**：向 aiot 工具链（toolkit 2.0.5 / emulator 1.7.22 / quickjs）核对 `quickjs.c:3375` 这个断言
   对应什么、是否有已知 issue 或升级。若它对所有带 interconnect 的 App 都触发，那是 emulator/quickjs 的锅。
3. **临时绕过**（马上能用）：
   - 用**不带调试器**的方式：`vapp app/com.application.watch.classschedule`（普通跑）+ 日志打点 / 截图看状态；
   - 或真机侧载调试。

---

## 五、顺带修掉的：EvEmuBuddy「点退出立即重启」

这是**我们上一轮引入的** bug，已修：
- 看门狗在 buddy 退出后会 `open -a EvEmuBuddy` 自动拉回 → 用户手动退出被立刻顶回来。
- **修复**：去掉自动拉回（`ev/ev-emu-cli/tools/evemubuddy_watchdog.sh`）。现在 buddy 退出 = 真退出
  （同时看门狗按归属销毁 vela/buddy 的模拟器），下次登录时其 LaunchAgent(`RunAtLoad`) 才会再起。
- 副作用提醒：**点退出会触发「销毁所有模拟器」**——这是最初就定下的规则；常驻池 4 台因自身 90m TTL
  到期已于 14:50 前后自动销毁，需要时 `ev/ev-emu-cli/tools/pool.sh ensure` 重建。

---

## 六、端口分区契约（已固化，见 `ev/ev-emu-cli/README.md`）

| 管理器 | 控制台/adb | hostfwd | 说明 |
|---|---|---|---|
| aiot IDE 调试 | 5554（硬编码 `-s emulator-5554`） | **10055（写死）** | 调试器只连 10055 |
| vela CLI | 11000-11099 | 11010+ | 常驻池 / 截图 |
| EvEmuBuddy | 13000-13099 | 12000-12099 | 与 IDE、vela 错开 |

- IDE 侧错误原文：`devicePort: 10055` + `connect ECONNREFUSED 127.0.0.1:10055`
- 排查口诀：`lsof -nP -iTCP:10055 -sTCP:LISTEN` 应是「只有 IDE 的模拟器在听」；若被别的占了，调试必挂。
