# EvEmuBuddy —— Mac 菜单栏「模拟器保姆」

把「清干净 → 起最新模拟器 → 装所选项目（快应用）并拉起」压缩成**点一下菜单栏图标**。
独立于 AIoT IDE 运行，IDE 不开也能用。

设计方案：`docs/Mac菜单栏模拟器保姆-EvEmuBuddy设计方案.md`

## 用法

- **左键单击** = 立即启动（清已死残留 → 起默认模拟器 → 装「所选项目」并拉起）
- **右键单击** = 弹菜单（选项目、切设备、装载、停止、清理、开关、日志、配置、退出）

图标右侧小圆点表示状态：灰/无 = 空闲，黄 = 执行中，绿 = 已就绪，红 = 失败。
鼠标悬停可看当前状态文字。

## 启动项目（v0.4.0）

菜单里 **「启动项目（勾选）▸」** 单选，勾谁下次就启动谁（**默认 EV坦克大战**）：

| 项目 | 包名 | 包从哪来 |
|---|---|---|
| EV坦克大战 | `com.application.watch.demo` | `tom/Ev坦克大战/dist/` |
| EvBox 工具箱 | `com.application.watch.evbox` | `EvBox/evbox/dist/` |
| EV课程表 | `com.application.watch.classschedule` | `tom/class/class/dist/`（可切成 `release/` 渠道包） |

- 勾选**只改默认**，不会立刻装；要立刻生效用菜单里的
  **「装载「XX」到默认设备实例」**（单次、强制覆盖，不改默认）
- 每个项目在 `~/.ev_emubuddy.json` 的 `apps.<别名>` 里配 `label / projectDir / package`；
  想让它优先用 `release/` 里该机型渠道包，加 `"rpkPrefer": "channel"`（默认 `dist` 优先，
  与 AIoT IDE 实际推给模拟器的包一致）
- 总开关 **「启动后自动装载所选项目」默认开**；关掉就只起模拟器、不碰应用

### 装载流程（照抄 IDE 实测链，**绝不 reboot**）

```
① adb -s <serial> push <rpk> /data/quickapp/app/<pkg>.rpk
② adb -s <serial> shell mkdir -p /data/quickapp/app/<pkg>
③ adb -s <serial> shell unzip -o <rpk> -d /data/quickapp/app/<pkg>
④ adb -s <serial> shell "vapp app/<pkg> &"        ← 冷启动，不 reboot
```

**同包跳过**：同一个实例上如果「还是同一个包文件」（路径 + mtime + size 三者一致）且包已解压过，
就**跳过 push/unzip，只重新拉起** —— 装包会重置该应用在本机的数据（激活码 / 课程表），
这道跳过就是防止每次点一下都白重置一次。

**换项目**：装完新包会先 `am stop <旧包名>` 再拉起新的（guest 里 `kill` 无效，`am stop` 才管用；
不停旧的，后起的 vapp 会跑在后台看不见）。

> ⚠️ 这台的 guest 是 **NuttX nsh**：`[ -d ... ]` 会报 `nsh: [: syntax error`，`which` 也不存在，
> `ls -la` 也无效。探活只能用裸 `ls`，别改成 shell 测试表达式。

## 多实例（v0.3.0）

**允许同时开多台模拟器。** 菜单里：

- **启动设备（可多开）▸** —— 只起你点的那一台，正在跑的其它实例**完全不受影响**（名字后带 `● 在跑` 表示它已经活着）
- **选择默认设备 ▸** —— 只改「下次左键用谁」，不会立刻启动
- **停止指定设备 ▸** —— 只停选中那一台；没有实例时置灰
- **停止所有模拟器** —— 全收掉（显式操作，不会自动发生）

「单实例」只针对**同一个 AVD**：同 AVD 已在跑且健康 → 复用；同 AVD 僵死 → 只重启它。

## 清理策略：只清「确认已死」的

菜单「清理已死残留（不碰在跑的）」与启动流程步 1 共用同一套逻辑，只处理四类：

| 目标 | 判定 |
|---|---|
| 僵尸 qemu | 进程 `STAT` 以 `Z` 开头，或命令行含 `<defunct>` |
| 卡死的部署 adb 客户端 | 命令行含 `adb` + `shell unzip` + `quickapp` |
| 孤儿 crashpad_handler | 父进程已不是 qemu |
| AVD 残锁文件 | 该 AVD **没有任何存活实例**（僵尸不算存活） |

锁文件按 AVD 分目录（`~/.vela/vvd/<avd>.vvd/multiinstance.lock`），所以"哪台死了"天然可判定 ——
不再需要"只要有一台在跑就跳过全部"的保守策略，也不会为了"清干净"去杀存活的 qemu。

⚠️ **安全闸**：读不到进程表（`ps` 被系统拒绝，例如从终端而非 `.app` 里跑脚本）时**一律不动手**，
只记一行"跳过锁文件清理"——否则会把正在跑的实例全判成"已死"。

## 文件

| 文件 | 说明 |
|---|---|
| `emu_buddy.py` | 菜单栏主程序（PyObjC / AppKit） |
| `emubuddy_core.py` | 核心层：配置、SDK 探测、实例管理、清理、启动、**快应用装载**、通知。可单独跑 `python3 emubuddy_core.py selftest` |
| `build_app.sh` | 打包脚本（`--install` 安装到 /Applications，`--sync` 改完代码秒同步） |
| `version.json` / `requirements.txt` | 版本与依赖 |

运行时配置：`~/.ev_emubuddy.json`（首次运行自动生成）
已装包记录：`~/.ev_emubuddy_deployed.json`（每台实例记「装的是哪个包文件」，同包跳过靠它）
运行日志：`~/.ev_emubuddy.log`
模拟器引擎日志：`/tmp/vela_emu_<avd>.log`

## 安全边界（写进代码的红线）

- **绝不 `rm -rf`**，绝不动 `~/.vela/vvd/*/data`（应用数据在磁盘镜像里，进程级停止不损伤）
- **绝不 `adb shell reboot`**（guest 内重启会让 qemu 直接退出 —— 这是 IDE 实例"神秘消失"的根因）
- 清理失败不阻塞启动，只记日志
- 所有外部命令都带超时，绝不出现"命令挂住导致菜单栏卡死"

## 故障排查

**菜单栏看不到图标？** 先看 `~/.ev_emubuddy.log` 里启动时那行 `[ui] … winFrame=…`：

- `size=(w, 30)` → 正常（30 就是菜单栏高度）
- `size=(w, 0)`、位置 `(0,0)` → 状态项**没拿到菜单栏槽位**，十有八九是 `.app` 启动器被改回了 `exec`。
  正确写法是 `unset __CFBundleIdentifier` + `nohup … & exit 0`（原因详见 `build_app.sh` 里的注释，别改）。

⚠️ **别用 `NSWorkspace.runningApplications()` 或 `ps` 判断进程死活**：
前者**查不到 `LSUIElement` 的 app**（假阴性，会让你误以为进程死了），后者在本机沙箱里被拒。
看日志里的 `[hb]` 心跳行才靠得住。

图标挂在**哪块屏幕**由系统决定（通常是有菜单栏的那块显示器）；多显示器时留意另一块屏。

## 开机自启

默认**开启**。开关在右键菜单里：「开机自动启动」。

实现方式是标准 LaunchAgent：`~/Library/LaunchAgents/com.ev.emubuddy.plist`，
`RunAtLoad=true` + `LimitLoadToSessionType=Aqua`，登录时由 launchd 直接拉起
（`ProgramArguments` 指 venv python + `emu_buddy.py`，**不经过 .app 启动器**）。

- 菜单里勾选状态以**磁盘上是否真有 plist** 为准，不是只看配置字段
- 每次启动会自动对齐一次「配置开关 ↔ plist 是否存在」，不一致才动手
- 注册后会**当场尝试** `launchctl bootstrap`，成功即本次登录内立即生效；
  失败也不影响下次登录生效（只记一行日志）
- 关闭开关 = 注销 + 删除 plist
- 单实例锁兜底：即便 launchd 拉起时已有一个实例在跑，也不会出现第二个图标

验证：

```bash
launchctl print gui/$(id -u)/com.ev.emubuddy     # 看得见 type=LaunchAgent 就是已加载
sfltool dumpbtm | grep -A6 com.ev.emubuddy       # BTM 里 Disposition 应含 enabled/allowed
```

## 构建

```bash
./build_app.sh --install      # 首次、依赖变动、或**启动器有改动**时用
./build_app.sh --sync         # 日常只改 .py 时用它（秒级）
```

## 里程碑

- **M1 骨架** ✅ 菜单栏图标 + 左右键分流 + 配置读写 + 触发启动
- **M2 清理+就绪态** ✅ 内建 clean（只清已死残留）+ 就绪轮询 + 状态变色 + 系统通知
- **M2.5 多开** ✅（v0.3.0）启动不再"停全部"；菜单加「启动设备（可多开）/ 停止指定设备」；僵尸实例不计存活；残锁按 AVD 粒度清理
- **M3 装包** ✅（v0.4.0）菜单「启动项目（勾选）」+ 三步安装链 + `vapp` 冷启动 + 同包跳过 + 换项目停旧的；默认开
- **M4 开机自启** ✅ LaunchAgent 写/删 + 菜单开关（默认开）
- **M5（可选）** ⬜ 菜单内嵌 gRPC 预览缩略图

## 自检与单测

```bash
python3 emubuddy_core.py selftest                      # 环境 / 实例 / 僵尸 / 各项目选包 / 自启状态
python3 emubuddy_core.py deploy <serial> [项目别名] [--force]   # 单独跑一次装载（排障用）
```

`ps` 在非 `.app` 进程里被系统拒绝，所以实例探测**只能在 app 内验证** —— 每次 app 启动都会写一行
`[env] proc_list=N 行 · 在跑 AVD=… · 死掉 AVD=…`；`proc_list=0 行` 就说明进程表读不到（清理会自动跳过）。
