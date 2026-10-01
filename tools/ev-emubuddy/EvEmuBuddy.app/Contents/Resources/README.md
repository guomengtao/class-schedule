# EvEmuBuddy —— Mac 菜单栏「模拟器保姆」

把「清干净 → 起最新模拟器 → （可选）装最新 rpk 包」压缩成**点一下菜单栏图标**。
独立于 AIoT IDE 运行，IDE 不开也能用。

设计方案：`docs/Mac菜单栏模拟器保姆-EvEmuBuddy设计方案.md`

## 用法

- **左键单击** = 立即启动（清残留 → 起默认模拟器 → 等 guest 就绪）
- **右键单击** = 弹菜单（切设备、开关、停止/重启、日志、配置、退出）

图标右侧小圆点表示状态：灰/无 = 空闲，黄 = 执行中，绿 = 已就绪，红 = 失败。
鼠标悬停可看当前状态文字。

## 文件

| 文件 | 说明 |
|---|---|
| `emu_buddy.py` | 菜单栏主程序（PyObjC / AppKit） |
| `emubuddy_core.py` | 核心层：配置、SDK 探测、实例管理、清理、启动、通知。可单独跑 `python3 emubuddy_core.py selftest` |
| `build_app.sh` | 打包脚本（`--install` 安装到 /Applications，`--sync` 改完代码秒同步） |
| `version.json` / `requirements.txt` | 版本与依赖 |

运行时配置：`~/.ev_emubuddy.json`（首次运行自动生成）
运行日志：`~/.ev_emubuddy.log`
模拟器引擎日志：`/tmp/vela_emu_<avd>.log`

## 安全边界（写进代码的红线）

- **绝不 `rm -rf`**，绝不动 `~/.vela/vvd/*/data`（应用数据在磁盘镜像里，进程级停止不损伤）
- **绝不 `adb shell reboot`**（guest 内重启会让 qemu 直接退出 —— 这是 IDE 实例"神秘消失"的根因）
- 清理失败不阻塞启动，只记日志
- 所有外部命令都带超时，绝不出现"命令挂住导致菜单栏卡死"

## 构建

```bash
./build_app.sh --install      # 首次或依赖变动
./build_app.sh --sync         # 日常改代码（秒级）
```

## 里程碑

- **M1 骨架** ✅ 菜单栏图标 + 左右键分流 + 配置读写 + 触发启动
- **M2 清理+就绪态** ✅ 内建 clean + 就绪轮询 + 状态变色 + 系统通知
- **M3 装包** ⬜ 选包规则 + IDE 同款三步安装链 + 同包跳过（开关默认 off）
- **M4 开机自启+打包** ⬜ LaunchAgent 写/删 + 菜单开关
- **M5（可选）** ⬜ 菜单内嵌 gRPC 预览缩略图
