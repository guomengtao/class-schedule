# Vela 模拟器使用指南与「模拟器 vs 单元测试 vs 真机」有效性分析

> 日期：2026-09-27
> 缘起：手环 9「点课程名打不开面板」排查中，我第一次真正用上了 IDE 的模拟器通道（读截图做 A/B），也第一次被**模拟器"通过"误导**（详见 [课程表管理页点击标题打不开编辑弹窗分析.md](课程表管理页点击标题打不开编辑弹窗分析.md)）。本文记录**可复用的技术细节**与**能力边界**，供下次直接使用。

---

## 零、最重要的一条（用户明确指出，务必置顶）

> **模拟器和真机差距很大。模拟器是基础验证。今天的这个问题：模拟器上我早测试过，一直没问题，但装到用户手环上就打不开。**

今天的实证与此完全吻合：

| 时间 | 环境 | 结果 |
|---|---|---|
| 11:55 | 模拟器 `xiaomi_band_10`（**212×520**） | 点击 → **面板正常弹出** ✅ |
| 当天 | 真机 **手环 9（192×490）** | 点击 → **打不开** ❌ |

**由此定下铁律：**

1. **模拟器「通过」不能作为真机通过的证据**（只能是"没那么糟"的弱信号）。
2. **模拟器「失败」信号价值高**（多半真有问题），但仍需真机确认。
3. 一旦出现"模拟器 OK / 真机不 OK"，**不要再拿模拟器去解释真机**——差异点通常在模拟器根本不模拟的那一层：**触摸命中与事件分发、屏型与像素密度、算力与内存、系统版本与厂商定制**。
4. 今天的操作还有个额外教训：我用 **212×520** 的模拟器去否定"一行两个 onclick 会被吞"，可故障现场是 **192×490**。**同族不同尺寸的模拟器也不可互相背书**——只有同分辨率的虚拟设备才勉强算同一场景。

---

## 一、我现在能用模拟器做什么（能力现状）

| 能力 | 状态 | 说明 |
|---|:---:|---|
| 找到正在运行的虚拟设备、端口映射 | ✅ | `ps aux \| grep qemu-system-armel` + `lsof -nP -iTCP -sTCP:LISTEN \| grep qemu` |
| 用 adb 连进模拟器执行 NSH 命令 | ✅ | NuttX NSH：`ls/ps/cat/getprop/ifconfig/vapp/vappcli/am/reboot` 等 |
| **自主截图（不依赖任何人按键）** | ✅ **2026-09-27 打通** | `node scripts/emulator-eye.js shot <grpcPort> out.png` —— 走模拟器内置 **gRPC** `getScreenshot`，见 §2.5 |
| 读 IDE 的历史截图做前后 A/B | ✅ | IDE 截图落在 `/Users/Banner/Downloads/vela_screenshot/`（`~/.vela/sdk/screenshot` 软链），文件名带 `设备-日期-时间` |
| 编译出 release 包（不装机） | ✅ | `env -u NODE_OPTIONS npx aiot release --enable-jsc` |
| 自己启动一个指定规格的虚拟设备 | ⚠️ 未验证但路径明确 | 见 §2.4；本机已有 192×490 的 `xiaomi_band` |
| **向模拟器注入点击/滑动** | ✅ **找到通路（待标定）** | 控制台 `event mouse`（§2.5.1）；gRPC 的输入 RPC 在此构建中是**空实现** |
| 真机触摸命中、性能、系统版本差异 | ❌ 永远不行 | 只能真机 |

---

## 二、关键技术细节（下次直接照抄）

### 2.1 先看有哪些模拟器在跑

```bash
ps aux | grep 'qemu-system-armel' | grep -v grep       # 看 -avd <名字> 与 hostfwd 端口
lsof -nP -iTCP -sTCP:LISTEN | grep qemu                # 看监听端口
npx aiot getConnectedDevices                           # 工具链视角的已连接设备
```

实例与端口对应关系（`adb 端口` / `adb + 3000` / `hostfwd 调试口`）：

| VVD | adb | 调试口 | 说明 |
|---|---|---|---|
| `xiaomi_band_10` | 5554/5555 | 10055 | 2026-09-27 实测 **212×520 pill-shaped** |
| `xiaomi_band_pro` | 5556/5557 | 10056 | 2026-09-27 实测 **336×480 rect** |
| `xiaomi_band` | （未在跑） | 10057 | **192×490 pill-shaped = 手环 9 规格**（见 §2.3） |

### 2.2 adb 在哪、能干什么

```bash
ADB=node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb
# 等价：~/.vela/sdk/tools/adb/mac/adb
$ADB devices -l
$ADB -s emulator-5554 shell help      # NuttX NSH 内置命令 + Builtin Apps
```

- **有**：`ls cat ps kill reboot cp mv df free date getprop setprop ifconfig ping wget`、`vapp`、`vappcli`、`am`、`sh`、`qjs`
- **没有**（Android 那套在这里不存在，别浪费时间）：`wm`、`input`、`screencap`、`pm`、`dumpsys`
  - 实测报错：`nsh: wm: command not found`
- `adb shell ps` 里可以直接看到 App 是否在跑：`vapp --jsdebugger=10.0.2.15:101 app/com.application.watch.classschedule`

### 2.3 ⭐ 核心突破：模拟器画面的读取通道

**IDE 的截图目录（AI 可直接读图判读）**：

```
/Users/Banner/Downloads/vela_screenshot/          ← 真正的位置
~/.vela/sdk/screenshot -> /Users/Banner/Downloads/vela_screenshot   （软链，别被迷惑）
```

- 文件名格式：`<avd名>-YYYY-MM-DD-HH-MM-SS.png`，直接给出**是哪个设备、什么时候**拍的
- 分辨率 = 该虚拟设备的屏幕分辨率（可用 `sips -g pixelWidth -g pixelHeight xxx.png` 复核）
- 历史备份在 `~/.vela/sdk/screenshot_bak/`
- **用法**：让用户/IDE 拍两张（改动前、改动后），或者直接按时间挑现场图 → AI 读图 → 做 A/B 判读
- 局限：截图是"某个瞬间的静态画面"，**拍不到"点下去发生了什么"**；连续动作要多张截图或录屏

**另有**：`~/.vela/sdk/qa/`（QA 工具目录，本机 `app/` 为空）、`aiot start --enable-e2e`（注入测试套件，**未验证**，可能提供官方 UI 自动化，值得下次先查）

### 2.4 自己拉一个指定规格的虚拟设备（未验证，但参数已查到）

各设备的硬件配置就在 VVD 目录里，**分辨率、屏型一目了然**：

```bash
cat ~/.vela/vvd/xiaomi_band.vvd/hardware-qemu.ini | grep -E 'hw.lcd.(width|height|shape|density)'
# hw.lcd.width = 192 / height = 490 / shape = pill-shaped  ← 手环 9 规格
# hw.lcd.width = 212 / height = 520 / shape = pill-shaped  ← 手环 10
# hw.lcd.width = 336 / height = 480 / shape = rect         ← 手环 10 Pro / 手环 9 Pro
```

**各 VVD 与屏幕规格（2026-09-27 实测/读取）**：

| VVD 名 | 分辨率 | 屏型 | 对应 |
|---|---|---|---|
| `xiaomi_band` | **192×490** | pill-shaped | **手环 9** |
| `xiaomi_band_10` | 212×520 | pill-shaped | 手环 10 / 11 同规格 |
| `xiaomi_band_pro`、`band-9-pro` | 336×480 | rect | 手环 9 Pro / 10 Pro |
| 其他 | 见各自 `hardware-qemu.ini` | — | 红米手表、S4、Watch、Sound Mini |

**精确启动参数就在**：`~/.vela/vvd/<avd>.vvd/emu-launch-params.txt`（逐行一条参数），例如：

```bash
~/.vela/sdk/emulator/darwin-aarch64/emulator -vela -avd xiaomi_band \
  -show-kernel -network-user-mode-options hostfwd=tcp:127.0.0.1:10057-10.0.2.15:101 \
  -qt-hide-window -qemu -device virtio-snd,bus=virtio-mmio-bus.2 -allow-host-audio -semihosting -smp 2
```

⚠️ 注意：`-qt-hide-window` 意味着没有可见窗口；同时启动可能与 IDE 的设备管理抢端口（5554/5555/5556/5557 已被占用）。**最稳的做法是让用户在 IDE 里启动**，我从 §2.3 读截图判读。

### 2.5 ⭐ 模拟器控制通道 = gRPC（截图已打通、点击待打通）

**这是 2026-09-27 最大的一次突破，推翻了此前的错误认知。**

- 模拟器内置 **gRPC 服务** `android.emulation.control.EmulatorController`，端口 = **控制台端口 + 3000**（`emulator-5554` → **8554**，`emulator-5556` → 8556）
- ⚠️ 此前把这端口判成"自定义二进制协议、连不上 VNC"——**那是误判**：服务端先发的那 46 字节其实是 **HTTP/2 的 SETTINGS 帧**（`00 00 18 04 00 ...`）
- 可用 RPC（proto 就在 `node_modules/@aiot-toolkit/emulator/lib/static/proto/emulator_controller.proto`）：
  `getScreenshot`、`streamScreenshot`、`sendMouse`、`sendTouch`、`sendKey`、`getStatus`
- **已入库驱动**：`scripts/emulator-eye.js`（零额外依赖，复用工具链自带的 `@grpc/grpc-js` + proto）

```bash
node scripts/emulator-eye.js ports                       # 看在跑的模拟器
node scripts/emulator-eye.js status 8554                 # 状态（含 avd.id/booted）
node scripts/emulator-eye.js shot   8554 /tmp/x.png      # ✅ 自主截图
node scripts/emulator-eye.js click  8554 40 90           # 触摸点击（⏳ 目前无效果）
node scripts/emulator-eye.js mclick 8554 40 90           # 鼠标点击（⏳ 目前无效果）
```

**配套：把 App 拉起来**（否则截到的是黑屏）

```bash
ADB=node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb
$ADB -s emulator-5554 shell am start app/com.application.watch.classschedule     # am <start|stop> <pkg>
# 等价：$ADB -s emulator-5554 shell vapp app/com.application.watch.classschedule
```

**当前状态（2026-09-27 二次更新）**：

| 能力 | 状态 | 结论 |
|---|:---:|---|
| 自主截图 | ✅ **完全可用** | `getScreenshot` 正常（已独立截到首页、编辑昵称页） |
| gRPC 输入 RPC | ❌ **是空实现** | `streamInputEvent` 明确返回 **`12 UNIMPLEMENTED`**；`sendMouse`/`sendTouch` 返回成功但**画面无任何变化**（用"切换日期"做判据，md5 完全一致）→ **不是坐标问题**（皮肤偏移已试遍），而是**该 Vela 构建没实现** |
| token 鉴权 | — | 读类 RPC 无需 token；`eConf['grpc.token']` 在 toolkit 中查无来源，**输入失败也不是 token 导致** |
| **控制台注入输入** | ✅ **找到可用通路** | 见下 |

> 旁证：`grep utouch /dev/input0` 在 toolkit 与 IDE 扩展里**都没有引用** → 说明官方也没走 adb 注入；IDE 的点击走 `sendMouse`（webview 里按缩放换算坐标后 `ee("sendMouse", …)` 发给扩展），在这台模拟器上大概率同样无效（**IDE 面板的点击很可能是"看着能点、其实没送达"**）。

#### ⭐ 2.5.1 可用的输入注入：模拟器控制台 `event mouse`

模拟器**控制台端口 = gRPC 端口 − 3000**（`emulator-5554` → 5554），需先认证：

```bash
TOKEN=$(cat ~/.emulator_console_auth_token)   # 控制台 auth token（文件权限 600）
( printf "auth $TOKEN\nhelp\nevent mouse\nquit\n"; sleep 3 ) | nc 127.0.0.1 5554
```

- 命令集（认证后）：`event`、`power`、`sensor`、`rotate`、`screenrecord`、`grpc`、`automation`、`finger` ……
- **注入语法**：`event mouse <x> <y> <device> <buttonstate>`（**4 个整数**，`1`=按下 / `0`=抬起）
- **坐标 = LCD 坐标（不需要偏移）**：2026-09-27 标定确认；曾误按皮肤 `part2` 加偏移（+30/+22）导致点击整体偏右下、返回键点不中。需要偏移的机种用 `EYE_SKIN_OFFSET=1`
- **已入库**：`node scripts/emulator-eye.js ctap <grpcPort> <lcdX> <lcdY>`（自动读 token、自动按 LCD 尺寸匹配皮肤偏移）、`cseq <grpcPort> <outPrefix> <x,y> [...]`
- ✅ 实测有效：连续点击后画面逐步变化（候选词区变成「到 道 导」= 真的在向 App 输入）
- ⏳ **仍需标定**：实测落点与"LCD+皮肤偏移"的换算**不完全吻合**（疑为该 console 的 `event mouse` 是**相对位移鼠标**，或还有一层缩放）→ 标定方法：在已知页面点若干已知坐标，读回画面反推映射

**备选"翻页不靠点击"**：`--start-page` 是**编译期**注入（`@aiot-toolkit/parser` 的 `startPage` 插件），可构建出直接启动到指定页面的包（每页一次构建 ≈13s）

### 2.6 其它小坑

- 模拟器 adb 与 Android adb 不通用；`which adb` 找不到，必须用工具链自带路径
- 不要用 `-s emulator-5554` 之外的猜测端口；实例号会变，先 `$ADB devices -l`
- 构建产物清理：`mv build dist /tmp/trash/...`（**禁止 `rm -rf`**）；`sign/` 必须留在原地

---

## 三、今天的实战复盘：模拟器到底帮了我什么、害了我什么

### 3.1 帮了

1. **提供了"画面"这个我原本完全没有的观测面**：11:29（小圆圈＝改动前）、11:54（大圆圈＝改动后）、11:55（面板打开）三张图，让我第一次拿到**改动前后同环境的画面证据**。
2. **否证了一个错误方向**：证明"一行两个 onclick"在 212×520 上并不会吞掉点击（还有全项目 10 处一行多 onclick 长期正常的旁证）。
3. 顺带确认了另一件事：**面板在 212×520 上不溢出**（几乎占满 520px 高）——为"手环 9 屏高只有 490px"的高度风险提供了量级参考。

### 3.2 害了（差点）

**我差点用模拟器"通过"去否定用户报的真机现象。** 如果我没有坚持去查差异点（屏宽 192 vs 212、真机触摸栈），就会得出"用户那边没问题、是用户点错了"的错误结论。这个错误方向在本次排查里出现过两次（第一次是把"多 onclick 吞事件"写成结论）。

### 3.3 结论

模拟器的"通过"是**关于模拟器的结论**，不是**关于手环的结论**。它最可靠的用法是**排除法与取证**，不是**验收**。

---

## 四、有效性对比：模拟器 vs 单元测试 vs 真机

| 维度 | 单元测试（node + fake） | 模拟器（截图/NSH） | 真机手环 |
|---|:---:|:---:|:---:|
| 单次耗时 | **毫秒~秒** | 分钟（要构建、部署、截图） | **最贵**（要用户配合、装机） |
| 可否无人值守 | ✅ 完全自动 | ⚠️ 半自动（点击需手指 / VNC） | ❌ 需要人 |
| 可回归、可复现 | ✅ 确定性 | ⚠️ 受环境与时机影响 | ❌ 不可复现 |
| 定位精度 | ✅ 精确到函数与分支 | ⚠️ 只能看到画面 | ⚠️ 只能看到现象 |
| 逻辑/边界/异常路径 | ✅ **最强** | ❌ 测不到（不会主动构造边界） | ❌ 测不到 |
| 布局/裁切/滚动/尺寸计算 | ❌ 完全测不到 | ✅ **强** | ✅ 强 |
| 视觉呈现（间距、配色、层级） | ❌ | ✅ 强 | ✅ 强 |
| **触摸命中与事件分发** | ❌ | ⚠️ **近似**（今天的真凶就在这一层） | ✅ **唯一权威** |
| 性能/内存/卡顿/耗电 | ❌ | ⚠️ 完全不同量级（别信） | ✅ **唯一权威** |
| 系统/机型差异（osVerCode、屏型上报、密度、输入法） | ❌ | ❌ 不模拟 | ✅ **唯一权威** |
| 包体、装机、升级链路 | ❌ | ⚠️ 部分 | ✅ **唯一权威** |

### 4.1 今天的成绩单（用事实投票）

| 手段 | 今天的战绩 |
|---|---|
| **单元测试** | **抓到一个真缺陷**：`openSheet` 索引越界时抛异常 → 静默失败（"点了完全没反应"）。这条**模拟器永远测不出来**（它不会去构造空列表/越界点击）。7 项断言全过、耗时不到 1 秒。 |
| 模拟器截图 | 否掉一个错误方向（多 onclick），提供量级参考；**但对真凶（192px 触摸命中）零覆盖**，还差点制造"假通过"。 |
| 真机 | 唯一报告现象、也唯一能最终确认的那一环。 |

### 4.2 直接回答「比单元测试帮助大吗」

**不。至少在本项目当前的成熟度下，单元测试的性价比更高。**

- 单元测试**快、免费、可回归、能定位到代码行**，而且今天真的抓到 bug；本项目还有成熟套路（见 `MEMORY.md` 单元测试约定）与 42 项既有用例
- 模拟器**只在"问题跟画面/布局/尺寸有关"时不可替代**（裁切、溢出、滚动、视觉层级、间距），而且它的"通过"还必须打折看待
- 两者**覆盖的层基本不重叠**，正确关系是"**先用单测把逻辑钉死，再用模拟器看画面**"，而不是二选一

**唯一能取代"来回试"的收益排序：单元测试 >（画面类问题时）模拟器截图 >> 真机往返**。真机留给"模拟器测不到的那一层"。

---

## 五、使用准则（决策树）

```
问题是"逻辑/边界/数据/异常路径"？
   → 单元测试（毫秒级、可回归）✅ 首选

问题是"显示不出来/裁切/溢出/滚动/间距/层级"？
   → 模拟器截图判读（读 /Users/Banner/Downloads/vela_screenshot/）+ 必要时 A/B

问题是"点了没反应 / 触摸命中 / 事件不触发"？
   → ⚠️ 模拟器只能给"近似"，不可当结论
   → 先做代码层取证（onclick 数量、热区宽度、越界守卫）
   → 必须真机确认；若模拟器 OK 而真机不 OK，优先怀疑：热区太小、屏型/尺寸差异、事件分发

问题是"卡顿/耗电/内存/输入法/签名装机/系统差异"？
   → 只能真机

任何时候要给真机问题下结论前：
   ① 先确认装机包的 r 参数（激活 URL）
   ② 能同分辨率就同分辨率（手环 9 用 xiaomi_band 192×490，不要用 212×520 顶替）
   ③ 模拟器"通过"不得写成"已验证"
```

---

## 六、命令速查

```bash
# 看设备与端口
ps aux | grep qemu-system-armel | grep -v grep
lsof -nP -iTCP -sTCP:LISTEN | grep qemu
npx aiot getConnectedDevices

# adb（NuttX NSH）
ADB=node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb
$ADB devices -l && $ADB -s emulator-5554 shell help
$ADB -s emulator-5554 shell ps | grep vapp

# 画面
ls -lt /Users/Banner/Downloads/vela_screenshot/ | head
sips -g pixelWidth -g pixelHeight <某张截图>.png

# 规格（哪个设备是什么屏）
grep -E 'hw.lcd.(width|height|shape|density)' ~/.vela/vvd/<avd>.vvd/hardware-qemu.ini
cat ~/.vela/vvd/<avd>.vvd/emu-launch-params.txt

# 构建（不装机、不 bump 版本）
env -u NODE_OPTIONS npx aiot release --enable-jsc
# 运行/部署（另可加 --openVNC 打开标准 VNC，未验证）
npx aiot start --enable-jsc
```

---

## 七、下次优先验证的三件事

1. `aiot start --openVNC` 能否真的开出标准 VNC（端口、是否需要密码）→ 若能，把 `/tmp/sched/vnc.py` 整理进 `scripts/`，实现"截图 + 注入点击"的无人值守循环
2. 在 **192×490 的 `xiaomi_band`** 上复现今天的场景（同一份代码，点在名字/圆圈/空白三处），看模拟器在**正确尺寸**下能否复现真机现象——这会直接检验"窄屏热区"假设
3. `aiot start --enable-e2e` 到底是什么（官方 UI 自动化？会不会提供按元素点击）——若可用，比 VNC 更正统

---

## 八、一句话总结

**模拟器给了我"眼睛"（截图判读），单元测试给了我"手术刀"（定位到函数）；而触摸、性能、机型差异这三层，只有手环本身说了算——模拟器说"没问题"，永远不等于手环没问题。**

*本文提到的现场截图与分析见 [课程表管理页点击标题打不开编辑弹窗分析.md](课程表管理页点击标题打不开编辑弹窗分析.md)。*
