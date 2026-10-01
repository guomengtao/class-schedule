#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
emubuddy_core.py —— EvEmuBuddy 核心层（无 GUI 依赖，可单独 `python3 emubuddy_core.py selftest` 自检）

职责：
  · 配置读写         ~/.ev_emubuddy.json
  · 运行日志         ~/.ev_emubuddy.log
  · SDK 环境探测     ~/.vela/sdk/{emulator,tools/adb}
  · 实例探测/停止/清理   与 scripts/emu-start.sh 等价的安全边界（零 rm -rf，绝不动 ~/.vela/vvd/*/data）
  · 启动模拟器       空闲端口分配 + 可选带窗（IDE 一直 -qt-hide-window，这正是本应用存在的理由之一）
  · 装载快应用       选包（dist/ 优先）→ push/mkdir/unzip → `vapp` 冷启动（绝不 reboot）+ 同包跳过
  · 系统通知         osascript display notification

设计依据：docs/Mac菜单栏模拟器保姆-EvEmuBuddy设计方案.md
"""

from __future__ import annotations

import json
import os
import re
import shlex
import socket
import subprocess
import sys
import time
from datetime import datetime

HOME = os.path.expanduser("~")
CONFIG_PATH = os.path.join(HOME, ".ev_emubuddy.json")
LOG_PATH = os.path.join(HOME, ".ev_emubuddy.log")
TRASH_DIR = "/tmp/trash"

PROJECT_DIR_DEFAULT = "/Users/Banner/Documents/guomengtao/tom/class/class"

# --------------------------------------------------------------------------
# 设备别名表（alias -> AVD + 渠道包后缀 + 显示名）
# 依据：2026-09-30 用户确认 + AIoT IDE 日志实锤
# --------------------------------------------------------------------------
DEFAULT_DEVICES = {
    "band9":  {"avd": "xiaomi_band",     "channel": "t-9-r",   "label": "手环 9"},
    "9pro":   {"avd": "xiaomi_band_pro", "channel": "t-9p-r",  "label": "手环 9 Pro"},
    "10":     {"avd": "xiaomi_band_10",  "channel": "t-10-r",  "label": "手环 10"},
    "10pro":  {"avd": "xiaomi_band_10",  "channel": "t-10p-r", "label": "手环 10 Pro"},
    "watch6": {"avd": "REDMI-Watch-6",   "channel": "t-w-r",   "label": "REDMI Watch 6"},
    "s4":     {"avd": "xiaomi_s4",       "channel": "t-s4-d",  "label": "S4"},
}

# 设备别名出现顺序（菜单里按这个排）
DEVICE_ORDER = ["band9", "9pro", "10", "10pro", "watch6", "s4"]

# --------------------------------------------------------------------------
# 快应用（"项目"）注册表 —— 菜单里勾选「启动项目」用，启动后装这个包并拉起
#   projectDir : 工程根（rpk 从这下面的 dist/ 或 release/ 找）
#   package    : guest 里的快应用包名 = /data/quickapp/app/<package>
#   rpkPrefer  : "dist"（默认，与 AIoT IDE 实际推的包一致）| "channel"（release/ 里该机型渠道包优先）
#   rpkDir     : 渠道包目录名，默认 release
# --------------------------------------------------------------------------
DEFAULT_APPS = {
    "tank": {
        "label": "EV坦克大战",
        "projectDir": "/Users/Banner/Documents/guomengtao/tom/Ev坦克大战",
        "package": "com.application.watch.demo",
    },
    "evbox": {
        "label": "EvBox 工具箱",
        "projectDir": "/Users/Banner/Documents/guomengtao/EvBox/evbox",
        "package": "com.application.watch.evbox",
    },
    "class": {
        "label": "EV课程表",
        "projectDir": PROJECT_DIR_DEFAULT,
        "package": "com.application.watch.classschedule",
    },
}

# 项目出现顺序（菜单里按这个排，第一项是默认）
APP_ORDER = ["tank", "evbox", "class"]


def default_config() -> dict:
    return {
        "defaultDevice": "band9",
        "devices": {k: dict(v) for k, v in DEFAULT_DEVICES.items()},
        # 启动哪个项目（勾选，默认坦克大战）
        "defaultApp": "tank",
        "apps": {k: dict(v) for k, v in DEFAULT_APPS.items()},
        # 启动后自动把所选项目装进模拟器并拉起（同包跳过，不会无谓重置应用数据）
        "autoDeployApp": True,
        "projectDir": PROJECT_DIR_DEFAULT,
        "rpkDir": "release",
        "autoInstallRpk": False,
        "cleanBeforeStart": True,
        "launchAtLogin": True,
        "showWindow": True,
        # 空闲调试通道端口从这个起点往后找（IDE 会自增到 10055/10056，不能写死）
        "portBase": 10055,
        # 可选：直接指定 SDK 根，留空则用默认
        "sdkDir": "",
    }


# --------------------------------------------------------------------------
# 配置
# --------------------------------------------------------------------------
def load_config() -> dict:
    """读配置；缺失字段用默认值补齐（前向兼容），并回写。"""
    cfg = default_config()
    data = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f) or {}
        except Exception as e:
            log(f"[cfg] 配置解析失败，改用默认值：{e}")
            data = {}
    for k, v in data.items():
        if k == "devices" and isinstance(v, dict):
            merged = {k2: dict(v2) for k2, v2 in DEFAULT_DEVICES.items()}
            for alias, dev in v.items():
                if isinstance(dev, dict):
                    merged[alias] = dev
            cfg["devices"] = merged
        elif k == "apps" and isinstance(v, dict):
            merged = {k2: dict(v2) for k2, v2 in DEFAULT_APPS.items()}
            for alias, app in v.items():
                if isinstance(app, dict):
                    merged[alias] = app
            cfg["apps"] = merged
        else:
            cfg[k] = v
    # 保证 defaultDevice 有效
    if cfg["defaultDevice"] not in cfg["devices"]:
        cfg["defaultDevice"] = next(iter(cfg["devices"]), "band9")
    # 保证 defaultApp 有效
    if cfg.get("defaultApp") not in (cfg.get("apps") or {}):
        cfg["defaultApp"] = next(iter(cfg.get("apps") or DEFAULT_APPS), "tank")
    if not os.path.exists(CONFIG_PATH):
        save_config(cfg)
    return cfg


def save_config(cfg: dict) -> None:
    try:
        tmp = CONFIG_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        os.replace(tmp, CONFIG_PATH)
    except Exception as e:
        log(f"[cfg] 写入失败：{e}")


def device_of(cfg: dict, alias: str) -> dict:
    """取设备信息；别名不存在时回落到默认设备。"""
    devs = cfg.get("devices") or DEFAULT_DEVICES
    if alias in devs:
        return devs[alias]
    return devs.get(cfg.get("defaultDevice", "band9")) or dict(DEFAULT_DEVICES["band9"])


def ordered_aliases(cfg: dict) -> list:
    devs = cfg.get("devices") or {}
    ordered = [a for a in DEVICE_ORDER if a in devs]
    ordered += [a for a in devs if a not in ordered]
    return ordered


def app_of(cfg: dict, alias: str) -> dict:
    """取项目（快应用）信息；别名不存在时回落到默认项目。"""
    apps = cfg.get("apps") or DEFAULT_APPS
    if alias in apps:
        return apps[alias]
    return apps.get(cfg.get("defaultApp", "tank")) or dict(DEFAULT_APPS["tank"])


def ordered_apps(cfg: dict) -> list:
    apps = cfg.get("apps") or {}
    ordered = [a for a in APP_ORDER if a in apps]
    ordered += [a for a in apps if a not in ordered]
    return ordered


# --------------------------------------------------------------------------
# 日志
# --------------------------------------------------------------------------
def log(msg: str) -> None:
    line = f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
        # 简易滚动：超过 1.5MB 只保留后 1500 行
        if os.path.getsize(LOG_PATH) > 1_500_000:
            with open(LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
                tail = f.readlines()[-1500:]
            with open(LOG_PATH, "w", encoding="utf-8") as f:
                f.writelines(tail)
    except Exception:
        pass
    try:
        print(line, flush=True)
    except Exception:
        pass


# --------------------------------------------------------------------------
# SDK 路径与环境自检
# --------------------------------------------------------------------------
def sdk_paths(cfg: dict) -> tuple:
    """返回 (launcher, adb)。"""
    root = (cfg.get("sdkDir") or "").strip() or os.path.join(HOME, ".vela", "sdk")
    launcher = os.path.join(root, "emulator", "darwin-aarch64", "emulator")
    adb = os.path.join(root, "tools", "adb", "mac", "adb")
    if not os.path.exists(adb):
        # 备用：工程 node_modules 里的 adb
        alt = os.path.join(
            cfg.get("projectDir") or PROJECT_DIR_DEFAULT,
            "node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb",
        )
        if os.path.exists(alt):
            adb = alt
    return launcher, adb


def check_env(cfg: dict) -> tuple:
    """返回 (ok, message)。"""
    launcher, adb = sdk_paths(cfg)
    missing = []
    if not (os.path.exists(launcher) and os.access(launcher, os.X_OK)):
        missing.append(f"模拟器启动器缺失：{launcher}")
    if not (os.path.exists(adb) and os.access(adb, os.X_OK)):
        missing.append(f"adb 缺失：{adb}")
    if missing:
        return False, "AIoT SDK 环境缺失\n" + "\n".join(missing)
    return True, "环境正常"


# --------------------------------------------------------------------------
# 进程/设备探测（全部容忍失败，不用 set -e）
# --------------------------------------------------------------------------
def sh(cmd, timeout=10.0):
    """执行命令 → (rc, stdout, stderr)；超时 rc = -9。"""
    if isinstance(cmd, str):
        cmd = shlex.split(cmd)
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or ""), (p.stderr or "")
    except subprocess.TimeoutExpired:
        return -9, "", f"timeout {timeout}s: {' '.join(cmd)}"
    except Exception as e:  # noqa: BLE001
        return -1, "", str(e)


_qemu_re = re.compile(r"qemu-system")
_avd_re = re.compile(r"-avd\s+([^\s]+)")
_port_re = re.compile(r"hostfwd=tcp:127\.0\.0\.1:(\d+)-")


def _parse_ps_axo(out: str) -> list:
    """解析 `ps -axo pid=,ppid=,stat=,command=`（无表头，字段稳定）。"""
    res = []
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(None, 3)
        if len(parts) < 4 or not parts[0].isdigit():
            continue
        res.append({"pid": parts[0], "ppid": parts[1], "stat": parts[2], "cmd": parts[3]})
    return res


def _parse_ps_aux(out: str) -> list:
    """解析 `ps aux`（列位置固定：STAT=7，COMMAND=10）。"""
    res = []
    for line in out.splitlines():
        if not line.strip() or line.startswith("USER"):
            continue
        parts = line.split(None, 10)
        if len(parts) < 11 or not parts[1].isdigit():
            continue
        res.append({"pid": parts[1], "ppid": "", "stat": parts[7], "cmd": parts[10]})
    return res


def proc_list() -> list:
    """在跑进程 [{pid, ppid, stat, cmd}, ...]。

    双通道（2026-09-30 实测：本机 `ps` 对非 app 进程一律 `operation not permitted`，
    所以只能在 app 进程里跑；两通道互相兜底）：
      ① `ps -ww -axo pid=,ppid=,stat=,command=` —— 字段最全（含 ppid），-ww 防命令行被截断
      ② `ps aux` —— 经典兜底（无 ppid 列，ppid 留空由调用方自行补查）
    都拿不到就返回 []（绝不抛异常）。
    """
    for cmd, parser in (
        (["ps", "-ww", "-axo", "pid=,ppid=,stat=,command="], _parse_ps_axo),
        (["ps", "aux"], _parse_ps_aux),
    ):
        rc, out, _ = sh(cmd, timeout=8)
        if rc != 0:
            continue
        items = parser(out)
        if items:
            return items
    return []


def ps_lines() -> list:
    """兼容旧调用：返回 "pid cmd" 形态的行。"""
    return [f"{p['pid']} {p['cmd']}" for p in proc_list()]


def _is_zombie(p: dict) -> bool:
    """僵尸/已死进程：STAT 以 Z 开头，或命令行含 <defunct>。"""
    return p["stat"].startswith("Z") or "<defunct>" in p["cmd"]


def running_instances() -> list:
    """
    返回**确认存活**的 qemu 实例：[{"avd":..., "pid":..., "port":...}, ...]

    僵尸实例（STAT=Z / <defunct>）一律不计入 —— 这是「只处理真正死掉的」的判据前提：
    僵尸不算在跑 → 它的锁文件会被判为残留、可安全清理。
    """
    found = []
    for p in proc_list():
        if not _qemu_re.search(p["cmd"]) or _is_zombie(p):
            continue
        m = _avd_re.search(p["cmd"])
        if not m:
            continue
        pm = _port_re.search(p["cmd"])
        found.append({"avd": m.group(1), "pid": p["pid"], "port": pm.group(1) if pm else ""})
    return found


def zombie_qemu_pids() -> list:
    """僵尸 qemu：进程表里已经死掉、但还没被父进程回收。"""
    return [p["pid"] for p in proc_list() if _qemu_re.search(p["cmd"]) and _is_zombie(p)]


def all_qemu_pids() -> list:
    return [i["pid"] for i in running_instances()]


def qemu_pids_for_avd(avd: str) -> list:
    return [i["pid"] for i in running_instances() if i["avd"] == avd]


def running_avds() -> list:
    return sorted({i["avd"] for i in running_instances()})


def stuck_deploy_pids() -> list:
    """卡死的部署 adb 客户端：命令行同时含 adb + 'shell unzip' + quickapp。"""
    return [
        p["pid"] for p in proc_list()
        if ("adb" in p["cmd"]) and ("shell unzip" in p["cmd"]) and ("quickapp" in p["cmd"])
    ]


def orphan_crashpad_pids() -> list:
    """孤儿 crashpad_handler：父进程已不是 qemu。"""
    pids = []
    by_pid = {p["pid"]: p for p in proc_list()}
    for p in by_pid.values():
        if "crashpad_handler" not in p["cmd"]:
            continue
        parent = by_pid.get(p["ppid"]) if p.get("ppid") else None
        if parent is not None:
            if "qemu-system" not in parent["cmd"]:
                pids.append(p["pid"])
            continue
        # ppid 拿不到（走了 ps aux 通道）→ 退化为直接查父进程
        _, out, _ = sh(["ps", "-p", p["pid"], "-o", "ppid="], timeout=5)
        ppid = out.strip()
        if not ppid:
            continue
        _, out2, _ = sh(["ps", "-p", ppid, "-o", "command="], timeout=5)
        if "qemu-system" not in out2:
            pids.append(p["pid"])
    return pids


def adb_devices(cfg: dict) -> list:
    """返回 [(serial, state)]，仅 emulator-*。"""
    _, adb = sdk_paths(cfg)
    rc, out, _ = sh([adb, "devices"], timeout=10)
    if rc != 0:
        return []
    res = []
    for line in out.splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2 and parts[0].startswith("emulator-"):
            res.append((parts[0], parts[1]))
    return res


def serial_for_avd(cfg: dict, avd: str):
    """在 adb devices 里找属于该 AVD 的 serial；找不到先重启 adb server 再试一次。"""
    _, adb = sdk_paths(cfg)
    for attempt in (1, 2):
        for serial, state in adb_devices(cfg):
            rc, out, _ = sh([adb, "-s", serial, "emu", "avd", "name"], timeout=6)
            first = out.strip().splitlines()[0] if out.strip() else ""
            if first == avd:
                return serial
        if attempt == 1:
            # 2026-09-29 实测坑：adb server 状态过期会导致「实例在跑但认不出」
            sh([adb, "kill-server"], timeout=8)
            time.sleep(2)
            sh([adb, "start-server"], timeout=10)
            time.sleep(2)
    return None


def guest_alive(cfg: dict, serial: str) -> bool:
    if not serial:
        return False
    _, adb = sdk_paths(cfg)
    rc, out, _ = sh([adb, "-s", serial, "shell", "echo", "alive"], timeout=8)
    return rc == 0 and "alive" in out


# --------------------------------------------------------------------------
# 端口
# --------------------------------------------------------------------------
def used_declared_ports() -> set:
    """在跑的实例已声明的 hostfwd 端口。"""
    return {int(i["port"]) for i in running_instances() if i["port"].isdigit()}


def find_free_port(cfg: dict, span: int = 60) -> int:
    """从 portBase 起找一个既没被监听、也没被已有实例声明的端口。"""
    base = int(cfg.get("portBase", 10055) or 10055)
    declared = used_declared_ports()
    for port in range(base, base + span):
        if port in declared:
            continue
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind(("127.0.0.1", port))
            s.close()
            return port
        except OSError:
            s.close()
            continue
    return base


# --------------------------------------------------------------------------
# 停止 / 清理
# --------------------------------------------------------------------------
def stop_avd(avd: str) -> list:
    """停一个 AVD 的所有 qemu 进程（先 TERM 后 KILL）。返回被处理的 pid 列表。"""
    pids = qemu_pids_for_avd(avd)
    if not pids:
        return []
    for p in pids:
        sh(["kill", p], timeout=5)
    time.sleep(2)
    for p in qemu_pids_for_avd(avd):
        sh(["kill", "-9", p], timeout=5)
    return pids


def stop_all() -> list:
    handled = []
    for avd in running_avds():
        handled += [f"{avd}:{p}" for p in stop_avd(avd)]
    # 收尾孤儿 crashpad
    for p in orphan_crashpad_pids():
        sh(["kill", p], timeout=5)
    return handled


# AVD 数据目录：~/.vela/vvd/<avd>.vvd（锁文件就在这一层，天然按 AVD 分组）
VVD_DIR = os.path.join(HOME, ".vela", "vvd")


def avd_dirs() -> dict:
    """{avd 名: 目录}，来自 ~/.vela/vvd/<avd>.vvd。"""
    res = {}
    try:
        for name in sorted(os.listdir(VVD_DIR)):
            if name.endswith(".vvd"):
                res[name[:-4]] = os.path.join(VVD_DIR, name)
    except Exception:
        pass
    return res


def dead_avds() -> list:
    """磁盘上有 AVD 目录、但当前**没有任何存活实例**的 AVD（其锁文件必为残留）。"""
    live = set(running_avds())
    return [a for a in avd_dirs() if a not in live]


def clean_dead_locks() -> list:
    """把「无存活实例」的 AVD 目录下的残锁文件移入 /tmp/trash（不删，可追回）。

    ⚠️ 安全闸：进程表读不到（`ps` 被系统拒绝，例如从终端而非 .app 里跑）时**一律不动手**。
    否则会把正在跑的实例全判成"已死"、把它们的锁搬走 —— 这正是必须拦住的事故。
    """
    if not proc_list():
        return ["跳过锁文件清理：读不到进程表（ps 被系统拒绝，无法判断哪台已死）"]
    acts = []
    dirs = avd_dirs()
    trash = os.path.join(TRASH_DIR, f"emu-lock-{int(time.time())}")
    for avd in dead_avds():
        base = dirs.get(avd)
        if not base:
            continue
        moved = []
        for root, sub, files in os.walk(base):
            if root[len(base):].count(os.sep) >= 2:   # 只看 AVD 根层与下一层
                sub[:] = []
            for fn in files:
                if not fn.endswith(".lock"):
                    continue
                try:
                    os.makedirs(trash, exist_ok=True)
                    os.replace(os.path.join(root, fn), os.path.join(trash, f"{avd}.{fn}"))
                    moved.append(fn)
                except Exception:
                    pass
        if moved:
            acts.append(f"{avd}: 移出残锁 {', '.join(sorted(set(moved)))}")
    return acts


def clean() -> list:
    """
    只清「确认已经死掉」的残留 —— 存活的实例一律不碰（支持多开）。

      ① 僵尸 qemu（STAT=Z / <defunct>）
      ② 孤儿 crashpad_handler（父进程已不是 qemu）
      ③ 卡死的部署 adb 客户端
      ④ 无存活实例的 AVD 目录里的残锁文件

    红线不变：绝不 rm -rf，绝不动 ~/.vela/vvd/*/data。清理失败不抛异常。
    """
    acts = []
    # ① 僵尸 qemu（先清，好让它的 AVD 立刻被判为"已死"，残锁随后可清）
    for p in zombie_qemu_pids():
        rc, _, _ = sh(["kill", "-9", p], timeout=5)
        acts.append(f"kill 僵尸 qemu pid={p}" if rc == 0 else f"僵尸 qemu pid={p} 待父进程回收")
    # ② 孤儿 crashpad_handler
    for p in orphan_crashpad_pids():
        rc, _, _ = sh(["kill", p], timeout=5)
        if rc == 0:
            acts.append(f"kill 孤儿 crashpad pid={p}")
    # ③ 卡死的部署 adb 客户端
    for p in stuck_deploy_pids():
        rc, _, _ = sh(["kill", p], timeout=5)
        acts.append(f"kill 卡死部署进程 pid={p}" if rc == 0 else f"卡死部署进程 pid={p} 已被回收")
    # ④ 死掉 AVD 的残锁
    acts += clean_dead_locks()
    live = running_avds()
    if live:
        acts.append(f"保留存活实例（不动）：{', '.join(live)}")
    return acts


# --------------------------------------------------------------------------
# 启动
# --------------------------------------------------------------------------
def start_avd(cfg: dict, avd: str, show_window: bool = True,
              wait_s: int = 75, progress=None) -> tuple:
    """
    起一个 AVD 并等到 guest 就绪。返回 (ok, serial_or_None, message)。

    单实例只针对**同一个 AVD**：同 AVD 已跑且健康 → 复用；同 AVD 的僵死实例 → 重启。
    **不同 AVD 完全互不影响，允许同时开多台**（2026-09-30 用户确认：不再限制多开）。
    其余不变：SDK 启动器；带窗；日志落盘；不 reboot。
    """
    def _p(msg):
        log(f"[start] {msg}")
        if progress:
            try:
                progress(msg)
            except Exception:
                pass

    launcher, _adb = sdk_paths(cfg)
    if not (os.path.exists(launcher) and os.access(launcher, os.X_OK)):
        return False, None, f"启动器不存在：{launcher}"

    # 同一个 AVD：已在跑且健康 → 复用；僵死才重启（其它 AVD 一律不动，支持多开）
    pids = qemu_pids_for_avd(avd)
    if pids:
        serial = serial_for_avd(cfg, avd)
        if serial and guest_alive(cfg, serial):
            _p(f"复用已运行实例 {avd} → {serial}")
            return True, serial, f"复用已运行实例（{serial}）"
        _p(f"{avd} 在跑但 guest 无响应 → 重启")
        stop_avd(avd)

    port = find_free_port(cfg)
    logf = f"/tmp/vela_emu_{avd}.log"
    args = [
        launcher, "-vela", "-avd", avd, "-show-kernel",
        "-network-user-mode-options", f"hostfwd=tcp:127.0.0.1:{port}-10.0.2.15:101",
    ]
    if not show_window:
        args.append("-qt-hide-window")
    args += ["-qemu", "-device", "virtio-snd,bus=virtio-mmio-bus.2",
             "-allow-host-audio", "-semihosting", "-smp", "2"]

    _p(f"启动 {avd}（端口 {port}，{'带窗' if show_window else '无头'}）")
    try:
        with open(logf, "w") as fout:
            subprocess.Popen(args, stdout=fout, stderr=subprocess.STDOUT,
                             stdin=subprocess.DEVNULL, start_new_session=True)
    except Exception as e:  # noqa: BLE001
        return False, None, f"启动失败：{e}"

    deadline = time.time() + wait_s
    while time.time() < deadline:
        time.sleep(2)
        serial = serial_for_avd(cfg, avd)
        if serial and guest_alive(cfg, serial):
            _p(f"{avd} 就绪 → {serial}")
            return True, serial, f"已就绪（{serial}）"
        left = int(deadline - time.time())
        if left > 0 and left % 10 < 2:
            _p(f"等待 guest 就绪…剩 {left}s")
    # 超时：附日志尾部
    tail = ""
    try:
        with open(logf, "r", errors="replace") as f:
            tail = "".join(f.readlines()[-8:]).strip()
    except Exception:
        pass
    _p(f"{avd} {wait_s}s 未就绪，日志尾部：\n{tail}")
    return False, None, f"{wait_s}s 未就绪，看 {logf}"


# --------------------------------------------------------------------------
# 开机自启（LaunchAgent）
#
# 机制：把 plist 放进 ~/Library/LaunchAgents/，由 macOS 的「登录后台项」在下次登录时加载。
# ⚠️ 本机实测：`launchctl bootstrap` / `load -w` 一律返回 `5: Input/output error`
#    （连 EvNotifier 自己的 plist 也一样），所以**当场激活不可用**；
#    但 plist 落盘后会被 BTM 登记（`sfltool dumpbtm` 可见 legacy agent / enabled,allowed），
#    登录时由 launchd 自行扫描加载 —— 这条通道有效。故此处对 launchctl 只做 best-effort。
# --------------------------------------------------------------------------
LAUNCH_AGENT_LABEL = "com.ev.emubuddy"
LAUNCH_AGENT_DIR = os.path.join(HOME, "Library", "LaunchAgents")
LAUNCH_AGENT_PATH = os.path.join(LAUNCH_AGENT_DIR, f"{LAUNCH_AGENT_LABEL}.plist")
STDOUT_LOG = os.path.join(HOME, ".ev_emubuddy_stdout.log")
STDERR_LOG = os.path.join(HOME, ".ev_emubuddy_stderr.log")


def runtime_dir() -> str:
    """当前脚本所在目录：装好后是 bundle 的 Contents/Resources/，开发时是源码目录。"""
    return os.path.dirname(os.path.abspath(__file__))


def autostart_installed() -> bool:
    return os.path.exists(LAUNCH_AGENT_PATH)


def autostart_loaded() -> bool:
    """launchd 是否已把服务加载进当前登录会话（本机 launchctl 写不可用，通常为 False）。"""
    try:
        rc, _, _ = sh(["launchctl", "print", f"gui/{os.getuid()}/{LAUNCH_AGENT_LABEL}"], timeout=8)
        return rc == 0
    except Exception:
        return False


def _plist_body() -> str:
    res = runtime_dir()
    venv_py = os.path.join(res, "venv", "bin", "python")
    exe = venv_py if os.access(venv_py, os.X_OK) else sys.executable
    script = os.path.join(res, "emu_buddy.py")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{exe}</string>
    <string>-u</string>
    <string>{script}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>LimitLoadToSessionType</key>
  <string>Aqua</string>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>{STDOUT_LOG}</string>
  <key>StandardErrorPath</key>
  <string>{STDERR_LOG}</string>
</dict>
</plist>
"""


def install_autostart() -> tuple:
    """写 plist 并尽量当场激活。返回 (ok, message)。"""
    try:
        os.makedirs(LAUNCH_AGENT_DIR, exist_ok=True)
        with open(LAUNCH_AGENT_PATH, "w", encoding="utf-8") as f:
            f.write(_plist_body())
    except Exception as e:  # noqa: BLE001
        return False, f"写入失败：{e}"

    sh(["launchctl", "bootout", f"gui/{os.getuid()}/{LAUNCH_AGENT_LABEL}"], timeout=8)
    rc, _, err = sh(["launchctl", "bootstrap", f"gui/{os.getuid()}", LAUNCH_AGENT_PATH], timeout=10)
    if rc == 0:
        return True, "已开启（本次登录内已生效）"
    rc2, _, err2 = sh(["launchctl", "load", "-w", LAUNCH_AGENT_PATH], timeout=10)
    if rc2 == 0:
        return True, "已开启（本次登录内已生效）"
    detail = (err or "").strip().splitlines()[:1] or (err2 or "").strip().splitlines()[:1]
    log(f"[autostart] 即时注册被拒（不影响下次登录生效）：{' '.join(detail)}")
    return True, "已开启，重启/重新登录后生效"


def remove_autostart() -> tuple:
    """注销并删除 plist。返回 (ok, message)。"""
    sh(["launchctl", "bootout", f"gui/{os.getuid()}/{LAUNCH_AGENT_LABEL}"], timeout=8)
    sh(["launchctl", "unload", "-w", LAUNCH_AGENT_PATH], timeout=8)
    try:
        if os.path.exists(LAUNCH_AGENT_PATH):
            os.remove(LAUNCH_AGENT_PATH)
    except Exception as e:  # noqa: BLE001
        return False, f"删除失败：{e}"
    return True, "已关闭开机自启"


def set_autostart(want: bool) -> tuple:
    return install_autostart() if want else remove_autostart()


def sync_autostart(cfg: dict) -> tuple:
    """让「配置里的开关」和「磁盘上的 plist」保持一致（只在不一致时动手）。"""
    want = bool(cfg.get("launchAtLogin", True))
    if want and not autostart_installed():
        return install_autostart()
    if not want and autostart_installed():
        return remove_autostart()
    return True, ("开机自启已开启" if want else "开机自启已关闭") + "（无需改动）"


# --------------------------------------------------------------------------
# 快应用装载（M3）：选包 → IDE 同款三步链 → vapp 冷启动
#
# 红线：**绝不 `adb shell reboot`**。IDE 每次装完包都 reboot，而 guest 内重启会让 qemu 直接退出
#      （日志实锤 `emulator exited with code null`），实例"神秘消失"多源于此。
# --------------------------------------------------------------------------
DEPLOYED_PATH = os.path.join(HOME, ".ev_emubuddy_deployed.json")
REMOTE_APP_BASE = "/data/quickapp/app"


def _newest_rpk(dirpath: str, channel: str = ""):
    """目录下最新 mtime 的 .rpk（跳过 `.diff.rpk` 这类隐藏增量包与子目录）。"""
    best = None
    try:
        names = os.listdir(dirpath)
    except Exception:
        return None
    for fn in names:
        if not fn.endswith(".rpk") or fn.startswith("."):
            continue
        if channel and channel not in fn:
            continue
        p = os.path.join(dirpath, fn)
        try:
            st = os.stat(p)
        except Exception:
            continue
        if best is None or st.st_mtime > best[1]:
            best = (p, st.st_mtime)
    return best[0] if best else None


def rpk_candidates(cfg: dict, app_alias: str, device_alias: str = None) -> list:
    """候选包 [(path, 来源说明), ...]，按优先级排序。

    默认 **dist/ 优先**（与 AIoT IDE 实际推给模拟器的包一致，实测可用）；
    把 `apps.<alias>.rpkPrefer` 设为 `"channel"` 则改成 release/ 里该机型渠道包优先。
    """
    app = app_of(cfg, app_alias)
    pdir = app.get("projectDir") or cfg.get("projectDir") or PROJECT_DIR_DEFAULT
    rpk_dir = app.get("rpkDir") or cfg.get("rpkDir") or "release"
    chan = ""
    if device_alias:
        chan = device_of(cfg, device_alias).get("channel") or ""
    dist = _newest_rpk(os.path.join(pdir, "dist"))
    chan_pkg = _newest_rpk(os.path.join(pdir, rpk_dir), chan) if chan else None
    any_pkg = _newest_rpk(os.path.join(pdir, rpk_dir))
    if (app.get("rpkPrefer") or "dist") == "channel":
        raw = [(chan_pkg, f"渠道包 {chan}"), (any_pkg, f"{rpk_dir}/ 最新"), (dist, "dist/ 最新")]
    else:
        raw = [(dist, "dist/ 最新"), (chan_pkg, f"渠道包 {chan}"), (any_pkg, f"{rpk_dir}/ 最新")]
    out, seen = [], set()
    for path, why in raw:
        if path and path not in seen:
            seen.add(path)
            out.append((path, why))
    return out


def find_rpk(cfg: dict, app_alias: str, device_alias: str = None):
    """返回 (rpk 路径 or None, 来源说明)。"""
    cands = rpk_candidates(cfg, app_alias, device_alias)
    if not cands:
        app = app_of(cfg, app_alias)
        pdir = app.get("projectDir") or cfg.get("projectDir") or PROJECT_DIR_DEFAULT
        return None, f"没找到 rpk（已扫 {pdir}/dist 与 {pdir}/{app.get('rpkDir') or cfg.get('rpkDir') or 'release'}）"
    path, why = cands[0]
    return path, f"{os.path.basename(path)}（{why}）"


def _load_deployed() -> dict:
    try:
        with open(DEPLOYED_PATH, "r", encoding="utf-8") as f:
            return json.load(f) or {}
    except Exception:
        return {}


def _save_deployed(d: dict) -> None:
    try:
        tmp = DEPLOYED_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DEPLOYED_PATH)
    except Exception as e:  # noqa: BLE001
        log(f"[deploy] 状态写入失败：{e}")


def app_present(cfg: dict, serial: str, pkg: str) -> bool:
    """guest 里是否已解压过这个包。

    ⚠️ 这台的 guest 是 **NuttX nsh**：`[ -d ... ]` 会报 `nsh: [: syntax error`，
    `which` 也没有。只有 `ls` 靠谱（`ls -la` 反而无效，用裸 `ls`）。
    """
    if not serial:
        return False
    _, adb = sdk_paths(cfg)
    rc, out, _ = sh([adb, "-s", serial, "shell", "ls", f"{REMOTE_APP_BASE}/{pkg}"], timeout=12)
    return rc == 0 and bool((out or "").strip())


def stop_app(cfg: dict, serial: str, pkg: str) -> None:
    """让旧应用退出前台（best-effort；guest 里 `kill` 无效，`am stop` 才管用）。"""
    if not (serial and pkg):
        return
    _, adb = sdk_paths(cfg)
    sh([adb, "-s", serial, "shell", "am", "stop", pkg], timeout=10)


def launch_app(cfg: dict, serial: str, pkg: str) -> tuple:
    """冷启动快应用：`vapp app/<pkg> &`（不 reboot）。"""
    _, adb = sdk_paths(cfg)
    rc, out, err = sh([adb, "-s", serial, "shell", f"vapp app/{pkg} &"], timeout=20)
    if rc == 0:
        return True, "已拉起"
    detail = (err or out or "").strip().splitlines()
    return False, (detail[0] if detail else f"rc={rc}")


def deploy_app(cfg: dict, serial: str, app_alias: str, device_alias: str = None,
               force: bool = False, progress=None) -> tuple:
    """
    把所选项目装进指定实例并拉起。返回 (ok, message)。

    幂等：同一实例上「还是同一个包文件」（路径 + mtime + size 三者一致）且包已解压 → **跳过重装**，
    只重新拉起。装包会重置该应用在本机的数据（激活码/课程表），所以这道跳过很关键。
    """
    def _p(m):
        log(f"[deploy] {m}")
        if progress:
            try:
                progress(m)
            except Exception:
                pass

    app = app_of(cfg, app_alias)
    label = app.get("label", app_alias)
    pkg = app.get("package") or ""
    if not pkg:
        return False, f"{label} 未配置包名（apps.{app_alias}.package）"

    rpk, why = find_rpk(cfg, app_alias, device_alias)
    if not rpk:
        return False, f"{label}：{why}"

    try:
        st = os.stat(rpk)
    except Exception as e:  # noqa: BLE001
        return False, f"{label}：读包失败 {e}"
    sig = {"app": app_alias, "package": pkg, "path": rpk,
           "mtime": int(st.st_mtime), "size": st.st_size}

    state = _load_deployed()
    prev = state.get(serial) or {}
    same = all(prev.get(k) == sig[k] for k in ("app", "package", "path", "mtime", "size"))

    if (not force) and same and app_present(cfg, serial, pkg):
        _p(f"{label}：包未变且已在机上，跳过重装 → 只拉起")
        if prev.get("package") and prev.get("package") != pkg:
            stop_app(cfg, serial, prev["package"])
        ok, m = launch_app(cfg, serial, pkg)
        state[serial] = sig
        _save_deployed(state)
        return ok, f"{label} 已是当前包（跳过重装）· {m}"

    _, adb = sdk_paths(cfg)
    remote_rpk = f"{REMOTE_APP_BASE}/{pkg}.rpk"
    remote_dir = f"{REMOTE_APP_BASE}/{pkg}"

    _p(f"{label}：推送 {os.path.basename(rpk)}（{why}）")
    rc, _, err = sh([adb, "-s", serial, "push", rpk, remote_rpk], timeout=120)
    if rc != 0:
        return False, f"{label}：push 失败 {(err or '').strip().splitlines()[:1]}"

    _p(f"{label}：解压到 {remote_dir}")
    sh([adb, "-s", serial, "shell", "mkdir", "-p", remote_dir], timeout=20)
    rc, _, err = sh([adb, "-s", serial, "shell", "unzip", "-o", remote_rpk, "-d", remote_dir], timeout=120)
    if rc != 0:
        return False, f"{label}：unzip 失败 {(err or '').strip().splitlines()[:1]}"

    # 换项目时先把上一个应用停掉（同 AVD 上后起的 vapp 会进后台，不停旧的看不见新应用）
    if prev.get("package") and prev.get("package") != pkg:
        _p(f"{label}：停掉上一个应用 {prev['package']}")
        stop_app(cfg, serial, prev["package"])

    _p(f"{label}：拉起应用")
    ok, m = launch_app(cfg, serial, pkg)
    state[serial] = sig
    _save_deployed(state)
    return ok, f"{label} 已装载并拉起 · {m}" if ok else f"{label} 已装载，但拉起失败（{m}）"


# --------------------------------------------------------------------------
# 通知
# --------------------------------------------------------------------------
def notify(title: str, body: str, subtitle: str = "", sound: str = "") -> None:
    """系统通知（横幅）。仅用于纯告知；需要用户确认的事一律用模态弹窗。"""
    def esc(s):
        return (s or "").replace("\\", "\\\\").replace('"', '\\"')

    extra = f' subtitle "{esc(subtitle)}"' if subtitle else ""
    snd = f' sound name "{esc(sound)}"' if sound else ""
    script = f'display notification "{esc(body)}" with title "{esc(title)}"{extra}{snd}'
    sh(["osascript", "-e", script], timeout=8)


# --------------------------------------------------------------------------
# 自检
# --------------------------------------------------------------------------
def selftest() -> int:
    cfg = load_config()
    print("== EvEmuBuddy 自检 ==")
    print(f"配置: {CONFIG_PATH}")
    ok, msg = check_env(cfg)
    print(("环境: OK" if ok else "环境: 缺失\n" + msg))
    launcher, adb = sdk_paths(cfg)
    print(f"  launcher: {launcher}")
    print(f"  adb     : {adb}")
    print(f"默认设备: {cfg['defaultDevice']} → {device_of(cfg, cfg['defaultDevice'])}")
    print(f"设备表  : {ordered_aliases(cfg)}")
    print(f"默认项目: {cfg['defaultApp']} → {app_of(cfg, cfg['defaultApp']).get('label')}"
          f"（启动后自动装载={cfg.get('autoDeployApp', True)}）")
    for alias in ordered_apps(cfg):
        a = cfg["apps"][alias]
        p, why = find_rpk(cfg, alias, cfg["defaultDevice"])
        mark = "●" if alias == cfg.get("defaultApp") else " "
        print(f"  {mark} {a.get('label', alias):<12} {a.get('package', '?'):<38} {why if p else '（无包）'}")
    print(f"空闲端口: {find_free_port(cfg)}")
    print(f"在跑实例: {running_instances() or '（无）'}")
    print(f"僵尸 qemu: {zombie_qemu_pids() or '（无）'}")
    print(f"死掉 AVD: {dead_avds() or '（无）'}")
    print(f"卡死部署: {stuck_deploy_pids() or '（无）'}")
    print(f"孤儿crashpad: {orphan_crashpad_pids() or '（无）'}")
    inst = autostart_installed()
    print(f"开机自启: {'已装' if inst else '未装'}"
          f"（plist={LAUNCH_AGENT_PATH}，本次登录已加载={autostart_loaded()}）")
    return 0 if ok else 1


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "selftest":
        sys.exit(selftest())
    if len(sys.argv) > 2 and sys.argv[1] == "start":
        cfg = load_config()
        o, s, m = start_avd(cfg, sys.argv[2], show_window=cfg.get("showWindow", True))
        print("OK" if o else "FAIL", s, m)
        sys.exit(0 if o else 1)
    if len(sys.argv) > 1 and sys.argv[1] == "clean":
        print(clean())
        sys.exit(0)
    if len(sys.argv) > 2 and sys.argv[1] == "deploy":
        # python3 emubuddy_core.py deploy <serial> [项目别名] [--force]
        _cfg = load_config()
        _serial = sys.argv[2]
        _app = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("-") else _cfg["defaultApp"]
        _ok, _msg = deploy_app(_cfg, _serial, _app, _cfg.get("defaultDevice"),
                               force="--force" in sys.argv, progress=lambda m: print("  ..", m))
        print("OK" if _ok else "FAIL", _msg)
        sys.exit(0 if _ok else 1)
    print(__doc__)
