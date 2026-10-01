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


def default_config() -> dict:
    return {
        "defaultDevice": "band9",
        "devices": {k: dict(v) for k, v in DEFAULT_DEVICES.items()},
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
        else:
            cfg[k] = v
    # 保证 defaultDevice 有效
    if cfg["defaultDevice"] not in cfg["devices"]:
        cfg["defaultDevice"] = next(iter(cfg["devices"]), "band9")
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


def ps_lines() -> list:
    rc, out, _ = sh(["ps", "aux"], timeout=8)
    return out.splitlines() if rc == 0 else []


def running_instances() -> list:
    """
    返回在跑的 qemu 实例：[{"avd":..., "pid":..., "port":...}, ...]
    """
    found = []
    for line in ps_lines():
        if not _qemu_re.search(line):
            continue
        m = _avd_re.search(line)
        if not m:
            continue
        parts = line.split(None, 10)
        pid = parts[1] if len(parts) > 1 else "?"
        pm = _port_re.search(line)
        found.append({"avd": m.group(1), "pid": pid, "port": pm.group(1) if pm else ""})
    return found


def all_qemu_pids() -> list:
    return [i["pid"] for i in running_instances()]


def qemu_pids_for_avd(avd: str) -> list:
    return [i["pid"] for i in running_instances() if i["avd"] == avd]


def running_avds() -> list:
    return sorted({i["avd"] for i in running_instances()})


def stuck_deploy_pids() -> list:
    """卡死的部署 adb 客户端：命令行同时含 adb + 'shell unzip' + quickapp。"""
    pids = []
    for line in ps_lines():
        if ("adb" in line) and ("shell unzip" in line) and ("quickapp" in line):
            parts = line.split(None, 10)
            if len(parts) > 1 and parts[1].isdigit():
                pids.append(parts[1])
    return pids


def orphan_crashpad_pids() -> list:
    """孤儿 crashpad_handler：父进程已不是 qemu。"""
    pids = []
    for line in ps_lines():
        if "crashpad_handler" not in line:
            continue
        parts = line.split(None, 10)
        if len(parts) < 2 or not parts[1].isdigit():
            continue
        pid = parts[1]
        rc, out, _ = sh(["ps", "-p", pid, "-o", "ppid="], timeout=5)
        ppid = out.strip()
        if not ppid:
            continue
        rc2, out2, _ = sh(["ps", "-p", ppid, "-o", "command="], timeout=5)
        if "qemu-system" not in out2:
            pids.append(pid)
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


def clean() -> list:
    """
    四类、可判定、零危险动作（红线：绝不 rm -rf，绝不动 ~/.vela/vvd/*/data）。
    返回人类可读的动作记录列表。清理失败不抛异常。
    """
    acts = []
    # 1) 卡死的部署 adb 客户端
    for p in stuck_deploy_pids():
        rc, _, _ = sh(["kill", p], timeout=5)
        acts.append(f"kill 卡死部署进程 pid={p}" if rc == 0 else f"卡死部署进程 pid={p} 已被回收")
    # 2) 孤儿 crashpad_handler
    for p in orphan_crashpad_pids():
        rc, _, _ = sh(["kill", p], timeout=5)
        if rc == 0:
            acts.append(f"kill 孤儿 crashpad pid={p}")
    # 3) AVD 死锁文件（仅当确认无 qemu 在跑）
    if all_qemu_pids():
        acts.append("跳过锁文件清理（仍有 qemu 在跑）")
    else:
        trash = os.path.join(TRASH_DIR, f"emu-lock-{int(time.time())}")
        moved = 0
        for root, _dirs, files in os.walk(os.path.join(HOME, ".vela")):
            if root.count(os.sep) - os.path.join(HOME, ".vela").count(os.sep) > 4:
                continue
            for fn in files:
                if fn.endswith(".lock"):
                    src = os.path.join(root, fn)
                    try:
                        os.makedirs(trash, exist_ok=True)
                        os.replace(src, os.path.join(trash, fn))
                        moved += 1
                    except Exception:
                        pass
        if moved:
            acts.append(f"移出 {moved} 个锁文件 → {trash}")
    return acts


# --------------------------------------------------------------------------
# 启动
# --------------------------------------------------------------------------
def start_avd(cfg: dict, avd: str, show_window: bool = True,
              wait_s: int = 75, progress=None) -> tuple:
    """
    起一个 AVD 并等到 guest 就绪。返回 (ok, serial_or_None, message)。

    铁律：单实例（同 AVD 已在跑且健康就复用）；SDK 启动器；带窗；日志落盘；不 reboot。
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

    # 铁律 1：同 AVD 已在跑 → 复用 or 重启僵死
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
    print(f"空闲端口: {find_free_port(cfg)}")
    print(f"在跑实例: {running_instances() or '（无）'}")
    print(f"卡死部署: {stuck_deploy_pids() or '（无）'}")
    print(f"孤儿crashpad: {orphan_crashpad_pids() or '（无）'}")
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
    print(__doc__)
