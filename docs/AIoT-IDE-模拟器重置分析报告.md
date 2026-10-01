# AIoT IDE 模拟器无法启动 / 预览图消失——分析报告

> 2026-09-29 17:50 · 基于当日 17:40-17:45 会话日志的取证 + 实测修复验证

## 一、结论（TL;DR）

**模拟器本体没有坏，是「重启方式」把它弄死了。**

- 本次故障的直接触发点：**17:44:03 执行了 `adb shell reboot`**。Vela 模拟器是 qemu 虚拟机，guest 里发 reboot 会让 **qemu 进程直接退出**（日志实锤：`emulator exited with code null`，17:45:23）——它不支持"虚拟机内重启"
- 模拟器死后，IDE 的模拟器面板扩展（vela.aiot-emulator 1.7.22）自身有 bug：`getRunningEmulators` 读到 undefined 就抛 TypeError，面板从此**不自愈**，表现为"启动不了、看不到预览"
- **已实测救活**：SDK 启动器重新拉起 → guest 探活通过 → 快应用拉起 → gRPC 抓图看到「Ev课程表」首页完整 UI。无需重置任何数据

## 二、故障时间线（日志取证）

| 时间 | 事件 | 证据 |
|---|---|---|
| 17:40:58 | 模拟器正常启动（xiaomi_band_pro） | AIoT Core.log：Start CMD emulator -avd xiaomi_band_pro |
| 17:41:18-26 | 调试配置 + 课程表 rpk 推送部署成功 | adb push × 3 + unzip |
| **17:44:03** | **`adb -s emulator-5554 shell reboot`** | AIoT Core.log |
| 17:45:23 | **qemu 退出（code null）**，emulator-5554 从 adb 消失 | 同上 + adb devices |
| 17:45:25 | IDE 面板连续报 `TypeError: Cannot read properties of undefined (reading 'status')`（getRunningEmulators） | exthost.log × 3 |
| 之后 | 面板无模拟器可显示 → "启动不了、看不到预览" | 推断 |

## 三、为什么"启动不了"——四层原因

1. **模拟器进程确实死了**（不是窗口隐藏）：`lsof` 5554/5555 端口无监听、adb devices 无 emulator、AIoT Core.log 明确 `exited with code null`
2. **IDE 面板不自愈**：扩展在枚举运行中模拟器时空引用崩溃（extension.js 105 行），即使手动拉起模拟器，面板也可能要 **Reload Window** 才恢复
3. **命令行拉起有两个坑**（本次都踩了）：
   - `nohup ... &` 从工具/终端会话拉起，**会话结束时进程被连带回收**（拉起 25 秒后消失，日志戛然而止）——必须用不会被回收的方式常驻
   - 裸跑 `qemu-system-armel` 会因 dyld 缺库必挂（既有方案文档铁律 3），必须走 `~/.vela/sdk/emulator/darwin-aarch64/emulator` 启动器
4. **排障脚本受限**：`emu-start.sh status` 依赖的 `/bin/ps` 被系统策略拦（Operation not permitted），status 显示"无实例"不代表真的无实例——用端口/adb 交叉验证

另注意：AVD 目录里有 200MB 的 `coredump.core`（09-11 遗留），不影响启动但占空间。

## 四、重置方法（按代价从低到高，本次 L1 就解决了）

### L1 · 重启模拟器进程（首选，数据无损）✅ 本次实测
```bash
# 1) 拉起（用 SDK 启动器 + 带窗口；放在不会被回收的后台任务里跑）
~/.vela/sdk/emulator/darwin-aarch64/emulator -vela -avd xiaomi_band_pro

# 2) 探活两步法
adb -s emulator-5554 shell echo alive        # 通 = 可部署

# 3) 拉起快应用
adb -s emulator-5554 shell "vapp app/com.application.watch.classschedule &"

# 4) 抓预览图（gRPC = 控制台端口+3000）
node scripts/emulator-eye.js shot 8554 /tmp/emu_preview.png
```
或用现成脚本：`bash scripts/emu-start.sh start xiaomi_band_pro`（注意其 status 依赖 ps，当前系统下被拦）。

### L2 · 恢复 IDE 面板
手动拉起模拟器后，若 IDE 面板仍报 TypeError / 看不到画面：**Cmd+Shift+P → Reload Window**（或重启 AIoT IDE）。扩展的空引用崩溃需要重新加载才能清掉。

### L3 · 清残留锁（模拟器反复异常退出后用）
`bash scripts/emu-start.sh clean`——清卡死的 adb 部署进程、孤儿 crashpad、AVD `*.lock`（无 qemu 在跑时才动，全程 mv 不 rm）。

### L4 · 重置 AVD 数据（= 恢复出厂，最后手段）
删 `~/.vela/vvd/xiaomi_band_pro.vvd/vela_data.bin`（134MB，应用与数据盘）→ 下次启动重建。**会清掉已装的快应用**，system 盘（vela_system.bin）不动。非必须不要做。

## 五、三条禁忌（防止复发）

1. **禁止 `adb shell reboot`**——qemu 会直接退出，这就是本次的凶手。想重启模拟器 = 杀掉进程重新拉起
2. **禁止裸跑 `qemu-system-armel`**——缺 libandroid-emu-tracing.dylib，必挂
3. **禁止多实例并存**——5554/5556/5558 三个 AVD 同跑会把部署打错实例（上次故障主因之一）

## 六、本次实测证据链

```
17:52  SDK 启动器拉起 xiaomi_band_pro（后台任务常驻）
17:53  adb devices → emulator-5554 回归 ✓
17:56  shell echo alive → alive ✓；vapp 拉起课程表 ✓
17:57  gRPC 截图 /tmp/emu_preview.png（14KB）→ 「Ev课程表」首页完整渲染 ✓
```

预览图与 IDE 面板的画面流是同一个 gRPC 通道（8554），截图能出 = IDE 预览必然能恢复（Reload Window 后）。
