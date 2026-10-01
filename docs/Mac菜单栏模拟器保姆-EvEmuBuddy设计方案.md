# EvEmuBuddy —— Mac 菜单栏「模拟器保姆」设计方案

> 目标：把「清干净 → 起最新模拟器 → 装最新 rpk 包」这套手动折腾，压缩成**点一下菜单栏图标**。
> 独立于 AIoT IDE 运行，IDE 不开也能用；开机自启（可关）。
> 依据：`docs/模拟器启动稳定性方案.md`（故障复盘与五条铁律）、`scripts/emu-start.sh`（已验证的实例管理逻辑）、`scripts/emulator-eye.js`（gRPC 截图/点击）、`tools/ev-notifier`（EvNotifier 菜单栏应用打包范式）。
> 状态：**设计稿**，未实施。

---

## 一、需求定稿

| # | 需求 | 落地形式 |
|---|---|---|
| 1 | 点击后清理残留（卡顿来源），但**只清"确认已死"的**，在跑的实例一律不碰 | `clean`：僵尸 qemu + 卡死部署进程 + 孤儿 crashpad + **无实例 AVD** 的残锁文件；存活实例原样保留；**零 `rm -rf`，绝不碰应用数据** |
| 2 | 自动起一个新模拟器，默认**手环 9** | 默认 `band9` → AVD `xiaomi_band`；参数/菜单可换其他（`10pro`、`9pro`、`watch6`、`s4`…） |
| 3 | 装载**所选项目**（快应用，**默认开启**，菜单可关） | 菜单「启动项目（勾选）」定装哪个（默认 EV坦克大战）；按项目扫 `dist/` 取最新 mtime（可切成 `release/` 渠道包），三步链装上并 `vapp` 拉起；**同包跳过**不重置数据 |
| 4 | 独立运行，AIoT IDE 不开也能用 | 直接调 SDK 启动器 + adb，不依赖 IDE 扩展任何接口 |
| 5 | 放 Mac 顶部菜单栏（类似 EvNotifier） | `NSStatusBar` 状态项 |
| 6 | **左键 = 立即启动**（一键跑完整流程） | 左键单击直接执行；菜单只在右键弹出 |
| 7 | 右键菜单可选模拟器 | 右键弹菜单，子菜单列全部设备，当前项打勾 |
| 8 | Dock 不显示图标 | `LSUIElement=true` + `NSApplicationActivationPolicyAccessory` |
| 9 | 开机自启，菜单里有开关，**默认打开** | LaunchAgent `RunAtLoad`；菜单项「开机自启」勾选状态实时反映 |

**明确的非目标**（本期不做）：不做 qemu 参数高级调参 UI、不做 rpk 构建（只装卸已有产物）。

**多实例策略（2026-09-30 用户确认，v0.3.0 起生效）**：**允许同时开多台模拟器，不再限制多开**。所谓"单实例"只针对**同一个 AVD**——同 AVD 已在跑且健康 → 复用；同 AVD 僵死 → 只重启它。清理只清"确认已死"的残留，启动流程**不再"停全部"**，正在跑的实例一律不动。

---

## 二、技术选型

**推荐：Python 3 + PyObjC（AppKit）**，与 EvNotifier 完全同栈，直接抄它的打包与自启经验。

| 方案 | 评价 |
|---|---|
| **Python + PyObjC** ✅ | 与 EvNotifier 同栈（`NSApplicationActivationPolicyAccessory` + `NSStatusBar`），能直接复用 LaunchAgent、`venv` 打包、`.app` 结构；脚本调用（`emu-start.sh`/`adb`）天然顺手 |
| Swift/SwiftUI MenuBarExtra | 原生、体积小，但要从零搭一套构建链（还要 codesign），且与现有 Python 工具链割裂 |
| rumps（第三方） | 上手最快，但只是个薄封装，右键/左键区分要 hack，且多一个依赖 |

结论：**Python + PyObjC**。理由不是"简单"，而是**能和 EvNotifier 共享全部运维经验**（自启 plist、日志路径、`.app` 打包、LaunchAgent 的 `load` I/O 报错坑与 `bootstrap` 兜底）。

### 关键实现点（左键/右键分流）

AppKit 里 `NSStatusItem.button` 默认只吃左键。要区分左右键：

```python
btn = status_item.button()
btn.sendActionOn_(NSEventMaskLeftMouseUp | NSEventMaskRightMouseUp)

@objc.python_method
def on_click(self, sender):
    ev = NSApp.currentEvent()
    if ev.type() == NSEventTypeRightMouseUp:
        status_item.menu().popUpMenuPositioningItem_atLocation_inView_(None, (0, 0), btn)
    else:
        self.start_flow()          # 左键：立即启动
```

### 打包与自启（照抄 EvNotifier）

`.app/Contents/Info.plist` 至少这几项：

```xml
<key>CFBundleIdentifier</key>   <string>com.ev.emubuddy</string>
<key>CFBundleExecutable</key>   <string>EvEmuBuddy</string>
<key>LSUIElement</key>          <true/>   <!-- Dock 不显示 -->
<key>NSUIElement</key>          <true/>   <!-- 旧系统兼容 -->
<key>LSMinimumSystemVersion</key> <string>11.0</string>
```

开机自启 = `~/Library/LaunchAgents/com.ev.emubuddy.plist`：

```xml
<key>Label</key>        <string>com.ev.emubuddy</string>
<key>RunAtLoad</key>    <true/>
<key>KeepAlive</key>    <true/>            <!-- 挂了自动拉起 -->
<key>ProgramArguments</key>
<array>
  <string>/Applications/EvEmuBuddy.app/Contents/Resources/venv/bin/python</string>
  <string>/Applications/EvEmuBuddy.app/Contents/Resources/emu_buddy.py</string>
</array>
<key>StandardOutPath</key>  <string>/Users/Banner/.ev_emubuddy_stdout.log</string>
<key>StandardErrorPath</key><string>/Users/Banner/.ev_emubuddy_stderr.log</string>
```

> ⚠️ 已知坑（EvNotifier 踩过）：本机 `launchctl load` 会报 I/O 错误，统一用
> `launchctl bootstrap gui/$(id -u) <plist>` 启用、`launchctl bootout gui/$(id -u)/com.ev.emubuddy` 关闭；
> 失败回退 `open -a /Applications/EvEmuBuddy.app`。**菜单开关就是写/删这个 plist + bootstrap/bootout。**

---

## 三、可复用的家底（已存在，不用重写）

| 资产 | 位置 | 复用方式 |
|---|---|---|
| 实例管理器 | `class/scripts/emu-start.sh`（152 行，v2） | **直接 shell 调用**：`status` / `start <avd>` / `stop <avd>\|all` / `clean` |
| 启动器 | `~/.vela/sdk/emulator/darwin-aarch64/emulator` | **必须走它**（裸跑 `qemu-system-armel` 必因 dyld 缺库挂掉） |
| ADB | `~/.vela/sdk/tools/adb/mac/adb` | 装包、探活、`emu avd name` 认实例 |
| 截图/点击 | `class/scripts/emulator-eye.js` | 可选：菜单里显示"眼睛"预览图（gRPC 端口 = 控制台端口 + 3000，如 5554 → 8554） |
| 桌面应用范式 | `app-auth/tools/ev-notifier`（v2.3.44） | Info.plist `LSUIElement`、LaunchAgent、`.app`+`venv` 打包、日志路径约定 |

**启动参数**（IDE 日志实锤的真实命令）：

```
<launcher> -vela -avd <avd> -show-kernel \
  -network-user-mode-options "hostfwd=tcp:127.0.0.1:<PORT>-10.0.2.15:101" \
  -qt-hide-window          # ⚠️ IDE 默认带这个 = 无头模式（所以你看不到预览图）
  -qemu -device virtio-snd,bus=virtio-mmio-bus.2 -allow-host-audio -semihosting -smp 2
```

三个从日志里挖出来的关键点：

1. **IDE 一直是「无头」启动的**（`-qt-hide-window`）——这就是你要在 IDE 里截图/看预览费劲的原因。本应用**默认不带**这个参数（带窗可视），把它放在设置里作为可选（`showWindow: true`）。
2. **`<PORT>` 是每实例自增的**：日志里 `xiaomi_band_10` 用 10055、`xiaomi_band_pro` 用 10056，是给 `vapp --jsdebugger=10.0.2.15:101` 用的调试通道。本应用启动前要**探测空闲端口**再分配，不能写死 10055。
3. **qemu 尾部参数照抄**（`-qemu -device virtio-snd... -allow-host-audio -semihosting -smp 2`），少一个都可能出音频/半主机异常——这段直接复用 IDE 的写法，别自己删。

### 设备别名 ↔ AVD ↔ 渠道包（实测分辨率）

| 菜单显示 | 别名 | AVD | 屏幕 | 默认装包渠道后缀 |
|---|---|---|---|---|
| 手环 9（默认）✅ | `band9` | `xiaomi_band` | 192×490 跑道 | `t-9-r` |
| 手环 9 Pro | `9pro` | `xiaomi_band_pro`（IDE 实测在用；备选 `band-9-pro`，同为 336×480） | 336×480 胶囊 | `t-9p-r` |
| 手环 10 | `10` | `xiaomi_band_10` | 212×520 | `t-10-r` |
| 手环 10 Pro ✅有包 | `10pro` | `xiaomi_band_10`（同一 AVD，改装 `t-10p-r` 包） | 212×520 | `t-10p-r` |
| REDMI Watch 6 | `watch6` | `REDMI-Watch-6` | 432×514 方屏 | `t-w-r` |
| S4 | `s4` | `xiaomi_s4` | 466×466 圆屏 | `t-s4-d` |
| （兼容） | `9pro-alt` | `band-9-pro` | 336×480 | `t-9p-r` |
| （兼容） | `sound` | `xiaomi_sound_mini` | 800×480 | — |

> 结论（2026-09-30 用户确认 + IDE 日志实锤）：
> - 手环 9 = `xiaomi_band`；
> - **手环 10 / 10 Pro 共用 AVD `xiaomi_band_10`**（IDE 21:34 与 09:19 两次实测都用的它），区别只在装 `t-10-r` 还是 `t-10p-r` 包；
> - 手环 9 Pro 用 `xiaomi_band_pro`（IDE 09:35 实测启动的就是它，jsdebugger 端口 10056）。
> 别名表写进配置文件，用户可自行加行。

---

## 四、主流程（左键单击 → 状态机）

左键单击 = 依次跑完下面 7 步，全程在**后台线程**执行，绝不阻塞菜单栏 UI。

| 步 | 动作 | 命令 | 超时 | 失败处理 |
|---|---|---|---|---|
| 0 | 前置自检 | 检查 launcher / adb 是否可执行 | 1s | 弹通知"环境缺失"，终止 |
| 1 | **清理（只清已死）** | 内建 `clean`：僵尸 qemu + 卡死部署进程 + 孤儿 crashpad + **无存活实例的 AVD** 的残锁文件。**不再 `stop all`** —— 其它正在跑的实例完全不动 | 20s | 记录日志继续（清理失败不阻塞启动） |
| 2 | 选设备 | 默认 `band9`，或上次选中的设备 | — | — |
| 3 | **启动** | `emu-start.sh start <avd>`（内含"已跑则复用"逻辑；带窗启动 + 空闲端口分配） | 75s | 超时 → 读 `/tmp/vela_emu_<avd>.log` 尾部，通知报错 |
| 4 | 等待 guest 就绪 | `adb -s <serial> shell echo alive` | 含在步 3 | — |
| 5 | **选包**（仅当「启动后自动装载所选项目」=on，默认 on） | 按所选项目扫 `<projectDir>/dist/` 取最新 mtime（默认），可配 `rpkPrefer: channel` 改成 `release/` 该机型渠道包优先 | 1s | 开关 off → 整段跳过；无包 → 跳过并提示 |
| 6 | **装包**（仅当开关=on） | IDE 实测三步链（见第八节），**绝不 `reboot`**；同包（路径+mtime+size 一致且已解压）→ 跳过重装只重新拉起 | 120s | push/unzip 失败 → 通知失败详情 |
| 7 | 启动应用 | `adb shell "vapp app/<pkg> &"`；换项目时先 `am stop <旧包名>`（guest 里 `kill` 无效） | 20s | 失败不致命，给提示 |

**过程可见**：菜单栏图标随状态变色（灰=空闲 / 黄=忙 / 绿=就绪 / 红=失败），并在图标旁或 tooltip 显示当前步骤文字（如"清理中…""等待 guest 60s…"）。完成后发一条 macOS 系统通知：「手环 9 已就绪 · 已装载 ev-v1.7.0-t-9-r.rpk」。

**幂等与防连点**：流程进行中左键再点 = 忽略（或询问"取消当前并重来"）；同一 AVD 已在跑且 guest 健康 → 复用实例，不重启。

**多开（v0.3.0）**：启动只影响目标 AVD，其它实例照常跑；完成后通知会附「另有 N 台在跑：…」。清理同理，只动"确认已死"的东西。

---

## 五、菜单结构（右键）

```
┌──────────────────────────────────────┐
│ 状态：已就绪 · xiaomi_band · xiaomi_band_10 在跑（2 台）│  ← 只读
│ ──────────────────────────────────── │
│ ▶ 立即启动（手环 9 · EV坦克大战）     │
│ 停止所有模拟器                        │
│ 重启默认设备                          │
│ ──────────────────────────────────── │
│ ● 启动设备（可多开） ▸                │   ← 只起这一台，在跑的其它实例不动
│      手环 9        (xiaomi_band)   ● 在跑│
│      手环 9 Pro    (xiaomi_band_pro)  │
│      手环 10       (xiaomi_band_10)   │
│      手环 10 Pro   (xiaomi_band_10)   │
│      REDMI Watch 6 (REDMI-Watch-6)    │
│      S4            (xiaomi_s4)        │
│ ● 选择默认设备 ▸    ✓ 手环 9          │   ← 下次左键 /「立即启动」用它
│ ● 启动项目（勾选）▸ ✓ EV坦克大战      │   ← v0.4.0：装哪个快应用并拉起（默认坦克大战）
│      EvBox 工具箱  (com.application.watch.evbox)
│      EV课程表      (com.application.watch.classschedule)
│ 装载「EV坦克大战」到默认设备实例       │   ← 单次强制覆盖，不改默认
│ ● 停止指定设备 ▸    手环 9  (xiaomi_band)│   ← 只停这一台（无实例时置灰）
│ ──────────────────────────────────── │
│ ✓ 启动后自动装载所选项目（同包跳过）   │   ← v0.4.0，默认开
│ ✓ 启动前清理已死残留（默认开）         │
│ ✓ 显示模拟器窗口（默认开）             │
│ ──────────────────────────────────── │
│ ✓ 开机自动启动（默认开）               │
│ 打开日志                              │
│ 打开配置文件                          │
│ ──────────────────────────────────── │
│ 退出                                  │
└──────────────────────────────────────┘
```

要点：
- **左键不进菜单**，直接执行"立即启动"——这是「一键」体验的关键；
- **「启动设备（可多开）」是 v0.3.0 新增的多开入口**：点一次起一台，已有实例（含 IDE 起的）不受任何影响；名字后面带 `● 在跑` 表示它已经活着（再点 = 复用，不会起第二台同 AVD）；
- 「选择默认设备」打勾 = 写入配置 `defaultDevice`，下次左键就用它；**它只改默认，不会立刻启动**；
- **「启动项目（勾选）」是 v0.4.0 新增**：单选，写配置 `defaultApp`，**默认 EV坦克大战**；勾选只改默认，不立刻装包 —— 要立刻生效用「装载「XX」到默认设备实例」；
- 「启动后自动装载所选项目」**默认开**：打开后每次启动会把所选项目的 rpk 装进模拟器并 `vapp` 拉起；**同包跳过**保证不重复重置数据；关掉就只起模拟器、完全不碰应用；
- 「停止指定设备」只停选中的那一台；没有实例时整项置灰；
- 「开机自启」勾选 = 写/删 LaunchAgent，**默认打开**（首次运行即安装 plist）；
- 「启动前清理已死残留」= 只清僵尸 qemu / 孤儿 crashpad / 卡死部署进程 / 无实例 AVD 的残锁；**绝不碰正在跑的实例**，所以留着开是安全的。

---

## 六、配置模型

`~/.ev_emubuddy.json`（首次运行生成默认值）：

```json
{
  "defaultDevice": "band9",
  "devices": {
    "band9":  { "avd": "xiaomi_band",     "channel": "t-9-r",  "label": "手环 9" },
    "9pro":   { "avd": "xiaomi_band_pro", "channel": "t-9p-r", "label": "手环 9 Pro" },
    "10":     { "avd": "xiaomi_band_10",  "channel": "t-10-r", "label": "手环 10" },
    "10pro":  { "avd": "xiaomi_band_10",  "channel": "t-10p-r","label": "手环 10 Pro" },
    "watch6": { "avd": "REDMI-Watch-6",   "channel": "t-w-r",  "label": "REDMI Watch 6" },
    "s4":     { "avd": "xiaomi_s4",       "channel": "t-s4-d", "label": "S4" }
  },
  "defaultApp": "tank",
  "apps": {
    "tank":  { "label": "EV坦克大战",   "projectDir": ".../tom/Ev坦克大战",  "package": "com.application.watch.demo" },
    "evbox": { "label": "EvBox 工具箱", "projectDir": ".../EvBox/evbox",     "package": "com.application.watch.evbox" },
    "class": { "label": "EV课程表",     "projectDir": ".../tom/class/class", "package": "com.application.watch.classschedule" }
  },
  "autoDeployApp": true,
  "projectDir": "/Users/Banner/Documents/guomengtao/tom/class/class",
  "rpkDir": "release",
  "cleanBeforeStart": true,
  "launchAtLogin": true,
  "showWindow": true
}
```

- `defaultApp` = 「启动项目（勾选）」写进去的项目；**默认 `tank`（EV坦克大战）**；
- `apps.<别名>` 可增删改（指向任意快应用工程）：`label` 显示名、`projectDir` 工程根、`package` guest 里的包名（= `/data/quickapp/app/<package>`）；可选 `rpkPrefer`（`dist` 默认 / `channel`）与 `rpkDir`（默认 `release`）；
- `autoDeployApp` **默认 true**：启动后自动装所选项目并拉起；同一实例上同一个包文件（路径+mtime+size 一致）且已解压 → **跳过重装**，所以不会无谓重置应用数据；
- `cleanBeforeStart` **默认 true** —— 现在它只清"已死残留"，不会误伤在跑实例，所以默认开着是安全的；
- `projectDir` / `rpkDir` 是**旧字段**，只在某个 `apps.<别名>` 没写 `projectDir` 时兜底；
- `showWindow: false` 时加 `-qt-hide-window`（仅巡航取证用；**IDE 就是一直这么跑的**，所以它看不见窗口）；
- 配置改动后菜单即时生效，无需重启。

---

## 七、清理策略（步 1 展开）

**核心原则（v0.3.0）**：只清「确认已经死掉」的残留，**正在跑的实例一律不碰**。

| 目标 | 判定条件 | 动作 |
|---|---|---|
| 僵尸 qemu | 进程 `STAT` 以 `Z` 开头，或命令行含 `<defunct>` | `kill -9 <pid>`；同时**明确不计入"存活实例"**，它的 AVD 因此可被判为已死 |
| 卡死的部署 adb 客户端 | 命令行含 `adb` + `shell unzip` + `quickapp` | `kill <pid>`（杀客户端，不动 guest） |
| 孤儿 crashpad_handler | 父进程已不是 qemu | `kill <pid>` |
| AVD 残锁文件 | 该 AVD **没有任何存活实例**（僵尸不算存活） | `mv` 到 `/tmp/trash/emu-lock-<ts>/`（可追回） |
| guest 僵死实例 | 同 AVD：`emu avd name` 通则 + `shell echo alive` 不通 | 只在**启动这个 AVD 时**才停它并重启；不影响别的 AVD |

锁文件是**按 AVD 分目录**的（`~/.vela/vvd/<avd>.vvd/multiinstance.lock`、`hardware-qemu.ini.lock`），所以"哪台死了"天然可判定 —— 不再需要"只要有一台在跑就全部跳过"的保守策略。

红线（写进代码注释与文档）：
- **绝不** `rm -rf`、绝不动 `~/.vela/vvd/*/data`（应用数据在磁盘镜像里，进程级停止不损伤）；
- **绝不**为了"清干净"去 kill 存活的 qemu —— 那是早期版本的 `stop all` 行为，已废除；
- 清理失败**不阻塞**启动，只记日志；
- 不做"删 AVD 重建"这类破坏性重置——那是 `docs/AIoT-IDE-模拟器重置分析报告.md` 里的 L4 手段，只在人工干预时用。

---

## 八、rpk 装载策略（步 5-6 展开）

### 选包规则（优先级从高到低）

> **v0.4.0 实现顺序（默认 dist 优先）**：① 菜单钩定的项目 → ② `<projectDir>/dist/` 最新 `.rpk`
> （跳过 `.diff.rpk` 这类隐藏增量包，与 AIoT IDE 实际推给模拟器的包一致，实测可用）→
> ③ `<projectDir>/release/` 下文件名含该设备渠道后缀的最新包 → ④ `release/` 任意最新。
> 想改成"渠道包优先"（例如要验收发版包），在 `apps.<别名>` 里加 `"rpkPrefer": "channel"`。

> 现有 `release/` 有 14 条渠道（`t-9p-d/r`、`t-9-d/r`、`t-10-d/r`、`t-10p-d/r`、`t-s4-d`、`t-b9-d`、`t-w-d/r`、`q`、`g`）。`-d` = debug、`-r` = release，默认取 `-r`。

### 安装流程（IDE 日志实锤的原始序列，照抄）

```
① adb -s <serial> push <rpk> /data/quickapp/app/<pkg>.rpk
② adb -s <serial> shell mkdir -p /data/quickapp/app/<pkg>
③ adb -s <serial> shell unzip -o /data/quickapp/app/<pkg>.rpk -d /data/quickapp/app/<pkg>
④ adb -s <serial> shell "vapp app/<pkg> &"        # 冷启动；换项目时先 am stop <旧包名>
```

`<pkg>` 从 `apps.<别名>.package` 读（已配好三个项目；不从文件名猜 —— 课程表的 release 包名是 `ev-v1.7.0-t-9-r.rpk`，猜不出来）。

从日志里学到的两条硬规矩：

- **绝不 `adb shell reboot`**：IDE 每次更新包后都会 reboot，而日志尾部写着
  `09:19:01 xiaomi_band_10 emulator exited with code null` —— **guest 内重启会让 qemu 直接退出**（与 `AIoT-IDE-模拟器重置分析报告.md` 的结论一致）。本应用装完包只用 `vapp` 冷启动应用，**不 reboot**。
- **增量更新走 `.diff.rpk`**：IDE 第二次起改成 `push dist/.diff.rpk` → unzip 到同一目录，字节数只有整包 1/20，快得多。本应用本版**不主动用增量**（选包时跳过隐藏包），靠"同包跳过"达到同样的省事效果，避免踩到"diff 基线不匹配"的坑。

### 本机 guest 的坑（NuttX nsh，实测）

这台的 guest shell 是 **NuttX nsh**，不是 busybox：

| 想干什么 | 别用 | 用 |
|---|---|---|
| 判断包是否已解压 | `[ -d /data/quickapp/app/<pkg> ]` → `nsh: [: syntax error` | `ls /data/quickapp/app/<pkg>`（rc=0 且有输出即存在） |
| 找命令 | `which unzip` → `command not found` | 已知 `unzip` / `vapp` / `am` 可用 |
| 列目录 | `ls -la`（无效） | 裸 `ls` |
| 结束应用 | `kill`（无效） | `am stop <pkg>` |

### 默认开启 + 同包跳过兜底

**v0.4.0 起默认开**（`autoDeployApp: true`）：这是用户要的"点一下就启动某个项目"。安全性由**同包跳过**兜底 ——
重装 rpk 会重置该模拟器上的应用数据（激活码、课程表等），所以若该实例上"还是同一个包文件"
（路径 + mtime + size 一致）且包已解压，就**跳过 push/unzip 只重新拉起**；包真的换了才重装。
已装记录落在 `~/.ev_emubuddy_deployed.json`（按 serial 记）。

---

## 九、与 AIoT IDE 的关系

- **独立性**：全部通过 SDK 启动器 + adb 直连，**不调用 IDE 扩展的任何 API**。AIoT IDE 关着 → 照常工作；IDE 开着 → 照常工作。
- **与 IDE 并存**：IDE 点运行时它自己会起实例。本应用启动前先探测，**同一个 AVD 已在跑就复用**，不会再拉第二个同 AVD 实例；**不同的 AVD 则各跑各的（支持多开）**。如果 IDE 起的实例 guest 僵死，本应用会把它列为"僵死"并只重启它这一台。
- **它顺手解决了 IDE 的老毛病**：IDE 扩展面板崩溃后不自愈（`getRunningEmulators` TypeError）——本应用不依赖那个面板，面板挂了也不影响你起模拟器。
- **反向提示**：本应用启动完成后，IDE 里点运行会直接部署到已就绪的实例，不必再由 IDE 拉模拟器。
- **IDE 部署管线的两个"原罪"**（也正是本应用存在的理由）：① **一直无头启动**（`-qt-hide-window`），所以你在 IDE 里看不到画面；② **每次装包后 `adb shell reboot`**，而 guest 内重启会让 qemu 直接退出（日志实锤 `emulator exited with code null`）——实例"神秘消失"多源于此。本应用两条都不做：**带窗 + 不 reboot**。

---

## 十、图标与视觉

- 菜单栏图标用**模板图（template image）**，随系统深浅色自动反色；建议 16×16/32×32 两套 PNG（手表轮廓），命名 `menubar_iconTemplate.png`；
- 状态用颜色区分：空闲（默认模板色）、执行中（黄）、就绪（绿）、失败（红）——实现上叠加一个小圆点或用状态色版本图；
- tooltip 文本：`EvEmuBuddy · 手环 9 已就绪（emulator-5554）`；
- 完成提示用系统通知（与 EvNotifier 同款 `osascript`/`UNUserNotificationCenter` 均可，注意**不要**用横幅做需要用户确认的事，专注模式会吞掉）。

---

## 十一、错误处理与日志

- 日志：`~/.ev_emubuddy.log`（主日志，滚动保留 7 天）+ 复用 `/tmp/vela_emu_<avd>.log`（引擎日志）；
- 常见失败与提示文案：
  - 找不到 launcher/adb → 「AIoT SDK 环境缺失（检查 `~/.vela/sdk`）」；
  - 60s 未就绪 → 「模拟器未就绪，已取日志尾部 20 行」+ 通知里附关键行；
  - 装包失败 → 三级链全败时给出最后一条 stderr；
  - 端口漂移（实例变成 5556/5558）→ 通过 `emu avd name` 认实例，**不硬编码 5554**（历史踩坑：打错实例干等超时）。
- 所有外部命令一律 `timeout` 包裹，绝不出现"命令挂住导致菜单栏卡死"。

---

## 十二、实施里程碑

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| **M1 骨架** | 菜单栏图标 + 左键/右键分流 + 配置读写 + 左键调 `emu-start.sh start <默认 avd>` | 左键能起手环 9，Dock 无图标，菜单能切设备 |
| **M2 清理+就绪态** | 内建 `clean`（只清已死残留）+ 就绪轮询 + 状态变色 + 系统通知 | 有死残留时左键一次清干净；**正在跑的实例不受影响** |
| **M2.5 多开（v0.3.0）** | 启动流程去掉 `stop all`；菜单加「启动设备（可多开）/ 停止指定设备」；僵尸 qemu 不计存活；残锁按 AVD 粒度清理 | 同时开 2 台以上互不影响；清理后存活实例的锁文件仍在 |
| **M3 装包（v0.4.0）** ✅ | 菜单「启动项目（勾选）」+ 选包规则 + IDE 同款三步安装链 + `vapp` 冷启动 + 同包跳过 + 换项目停旧的 + 开关（默认 **on**） | 勾「EV坦克大战」→ 左键 → 模拟器上直接是坦克大战；换勾「EvBox」再左键 → 换成 EvBox；包没变的重复启动不会重置数据 |
| **M4 开机自启+打包** ✅ | LaunchAgent 写/删、菜单开关、`.app` + `venv` 打包、icon | 重启 Mac 后图标自动出现，开关可关且状态持久 |
| M5（可选） | 菜单内嵌 gRPC 预览缩略图（`emulator-eye.js shot`）、多设备预设 | 菜单里能看一眼模拟器画面 |

**M1 验证清单**（每条都要实机跑）：
1. `/Applications/EvEmuBuddy.app` 双击后**Dock 里没有图标**，菜单栏出现手表图标；
2. 左键 → 手环 9 起来（`adb devices` 见 `emulator-5554`，`shell echo alive` 通）；
3. 右键 → 选「手环 10」→ 左键 → 起的是 `xiaomi_band_10`；
4. 制造残留（跑一个 `adb shell unzip -o /data/quickapp/...` 挂住）→ 左键 → 残留被清、新实例正常；
5. 手动起两个实例 → 左键 → **两个都还在**（多开），只有目标 AVD 被复用/新建；
6. **清理验证**：两台在跑时执行清理 → 只清死残留，两台实例与它们的锁文件都保留；
7. 关掉开机自启开关 → `~/Library/LaunchAgents/com.ev.emubuddy.plist` 消失；重启开关 → 恢复；
8. 关掉 AIoT IDE → 左键全流程仍然通。

**M3 验证清单**（v0.4.0，2026-09-30 实测通过）：
9. `emulator-5554` 在跑时 `deploy emulator-5554 tank --force` → 坦克大战被解压并拉起 ✅；
10. 紧接着再跑一次不加 `--force` → 输出「包未变且已在机上，跳过重装 → 只拉起」✅；
11. `deploy emulator-5554 evbox --force` → 先 `am stop com.application.watch.demo` 再拉起 EvBox ✅；
12. 再 `deploy ... tank --force` 切回坦克大战 ✅（三条路径合计 7s 级，1.7MB 的 EvBox 含推包约 7s）。

---

## 十三、风险与取舍

| 风险 | 说明 | 对策 |
|---|---|---|
| 装包会重置应用数据 | 模拟器上已激活/已配课程数据被清 | **同包跳过**：同一实例上同一个包文件（路径+mtime+size 一致）且已解压 → 只重新拉起不重装；关掉「启动后自动装载所选项目」则完全不碰应用 |
| `adb shell reboot` 会杀实例 | guest 内重启 → qemu `exited with code null`（09-29 17:44 与 09-30 09:19 两次实锤） | 本应用装包后**不 reboot**，只用 `vapp` 冷启动应用 |
| 冷启动天然慢（40-60s） | qemu 起 guest 到 adb 活就是这个量级 | 进度可视化 + 完成通知；不承诺"秒开"，只承诺"不用管" |
| IDE 与本应用抢实例 | 同一 AVD 双起导致部署打错实例 | 启动前探测，同 AVD 复用；**不同 AVD 允许并存（多开是特性，不是冲突）** |
| 清理误伤在跑的实例 | 早期版本"停全部"会连带收掉其它实例 | v0.3.0 起只清僵尸/孤儿/卡死进程 + 无实例 AVD 的残锁；**僵尸 qemu 明确不计入存活**，活实例的锁永不触碰 |
| `pm install` 路径行为随运行时版本变化 | 历史上有 `/data/quickapp/app` 手推失效的记录 | 三级回退链 + 每级成功判据（`pm list packages`），不做猜测 |
| LaunchAgent 在本机 `load` 报 I/O 错 | 已知环境问题 | 用 `bootstrap`/`bootout`，回退 `open -a` |
| 菜单栏 App 被沙箱/TCC 拦 | 读写 `~/Library/LaunchAgents`、拉起进程 | `.app` 首次运行给"完全磁盘访问"或至少允许自动化；必要时改用 `SMAppService`（macOS 13+ 官方自启 API，无需 plist 手写） |

**取舍备注**：`SMAppService`（macOS 13+）比手写 LaunchAgent 更"官方"、免 TCC 折腾，但需要 Swift/Objetive-C 调用或 `pyobjc` 的 `ServiceManagement` 绑定，M4 阶段可先手写 plist 跑通，再视情况切换。

---

## 附录 A：命令速查（实施时直接抄）

```bash
# 实例管理（已存在）
bash scripts/emu-start.sh status
bash scripts/emu-start.sh start xiaomi_band
bash scripts/emu-start.sh stop  all
bash scripts/emu-start.sh clean

# 手工启动（等价于脚本内部）
~/.vela/sdk/emulator/darwin-aarch64/emulator -vela -avd xiaomi_band -show-kernel \
  -network-user-mode-options "hostfwd=tcp:127.0.0.1:10055-10.0.2.15:101"

# 探活 / 认实例（不要硬编码 5554）
~/.vela/sdk/tools/adb/mac/adb devices
~/.vela/sdk/tools/adb/mac/adb -s emulator-5554 emu avd name
~/.vela/sdk/tools/adb/mac/adb -s emulator-5554 shell echo alive

# 装包 / 拉起
~/.vela/sdk/tools/adb/mac/adb -s emulator-5554 push <rpk> /data/quickapp/app/<pkg>.rpk
~/.vela/sdk/tools/adb/mac/adb -s emulator-5554 shell "vapp app/<pkg> &"

# 截图（可选预览）
node scripts/emulator-eye.js ports
node scripts/emulator-eye.js shot 8554 /tmp/emu_preview.png
```

## 附录 B：已确认事项（2026-09-30 用户拍板）

1. **默认设备**：✅「手环 9」= AVD `xiaomi_band`（192×490 跑道屏）——已确认；
2. **手环 10 Pro**：✅ **有包（渠道 `t-10p-r`），且共用 AVD `xiaomi_band_10`**（IDE 日志两次实锤都用它启动），**不需要新建 AVD**；菜单里 `10` 与 `10pro` 是同一台模拟器、装不同的包；
3. **装包默认值**：✅ **默认关闭**，配置里加开关可改（`autoInstallRpk`），菜单同步提供勾选项与「手动装包」单次入口。
