#!/usr/bin/env bash
# emu-start.sh —— Vela 模拟器单实例稳定启动器（极简防御版 v2）
# 用法：
#   bash scripts/emu-start.sh status
#   bash scripts/emu-start.sh start xiaomi_band
#   bash scripts/emu-start.sh stop  xiaomi_band|all
#   bash scripts/emu-start.sh clean
# 设计约定见 docs/模拟器启动稳定性方案.md（单实例 / 先探活 / 用启动器 / 带窗口 / 日志落盘）
# v2 变更：去掉 set -u（未绑定变量硬失败）、用纯 ps/adb 文本匹配替代 lsof+awk 端口解析

LAUNCHER="$HOME/.vela/sdk/emulator/darwin-aarch64/emulator"
ADB="$HOME/.vela/sdk/tools/adb/mac/adb"
[ -x "$ADB" ] || ADB="$(cd "$(dirname "$0")/.." && pwd)/node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb"
[ -x "$ADB" ] || { echo "找不到 adb"; exit 1; }

# ---------- 基础探查（全部容忍失败，不用 set -u/e）----------
qemu_pids_for_avd() { # 同 AVD 的 qemu pid 列表
  ps aux | grep qemu-system | grep -v grep | grep -- "-avd $1 " | awk '{print $2}'
}
all_qemu_pids() {
  ps aux | grep qemu-system | grep -v grep | awk '{print $2}'
}
avd_names_running() {
  ps aux | grep qemu-system | grep -v grep | sed -E 's/.*-avd ([^ ]+).*/\1/'
}
stuck_deploy_pids() { # 卡死的部署 adb 客户端
  ps aux | grep "adb" | grep "shell unzip" | grep "quickapp" | grep -v grep | awk '{print $2}'
}
guest_alive() { # guest adb 是否响应
  timeout 6 "$ADB" -s "$1" shell echo alive 2>/dev/null | grep -q alive
}
serial_for_avd() { # 在 adb devices 里找属于该 AVD 的 serial；找不到先重启 adb server 再试一次
  for s in $("$ADB" devices 2>/dev/null | awk '$2=="device"{print $1}' | grep '^emulator-'); do
    if timeout 5 "$ADB" -s "$s" emu avd name 2>/dev/null | head -1 | grep -q "^$1$"; then
      echo "$s"; return 0
    fi
  done
  # 2026-09-29 实测坑：adb server 状态过期会导致「实例在跑但 devices 认不出」→ 重启 server 再试
  "$ADB" kill-server >/dev/null 2>&1; sleep 2; "$ADB" start-server >/dev/null 2>&1; sleep 2
  for s in $("$ADB" devices 2>/dev/null | awk '$2=="device"{print $1}' | grep '^emulator-'); do
    if timeout 5 "$ADB" -s "$s" emu avd name 2>/dev/null | head -1 | grep -q "^$1$"; then
      echo "$s"; return 0
    fi
  done
  return 1
}

cmd_status() {
  echo "== qemu 实例 =="
  local found=0 avd pid
  for avd in $(avd_names_running); do
    found=1
    for pid in $(qemu_pids_for_avd "$avd"); do
      local s="" g="否"
      s=$(serial_for_avd "$avd" 2>/dev/null)
      [ -n "$s" ] && guest_alive "$s" && g="是"
      echo "  avd=$avd pid=$pid serial=${s:-未识别} guest存活=$g"
    done
  done
  [ "$found" = "0" ] && echo "  （无）"
  echo "== 卡死部署进程 =="
  local sp; sp=$(stuck_deploy_pids)
  if [ -n "$sp" ]; then
    for p in $sp; do echo "  pid=$p"; done
  else
    echo "  （无）"
  fi
}

stop_avd() {
  local avd="$1" pids
  pids=$(qemu_pids_for_avd "$avd")
  if [ -z "$pids" ]; then echo "[无] $avd 未在跑"; return 0; fi
  for p in $pids; do kill "$p" 2>/dev/null && echo "[停] $avd pid=$p"; done
  sleep 2
  # 兜底：还活着就 -9
  pids=$(qemu_pids_for_avd "$avd")
  for p in $pids; do kill -9 "$p" 2>/dev/null && echo "[强杀] pid=$p"; done
}

cmd_stop() {
  case "${1:-}" in
    all) for a in $(avd_names_running); do stop_avd "$a"; done ;;
    "")  echo "用法: $0 stop <avd>|all"; return 1 ;;
    *)   stop_avd "$1" ;;
  esac
  # 收尾孤儿 crashpad（父进程非 qemu 的）
  ps aux | grep crashpad_handler | grep -v grep | awk '{print $2}' | while read -r p; do
    ppid=$(ps -p "$p" -o ppid= 2>/dev/null | tr -d ' ')
    ps -p "$ppid" -o command= 2>/dev/null | grep -q qemu-system || kill "$p" 2>/dev/null
  done
}

cmd_start() {
  local avd="${1:-}"
  [ -z "$avd" ] && { echo "用法: $0 start <avd>"; return 1; }
  # 铁律1：同 AVD 已在跑 → 复用或重启僵死
  local pids; pids=$(qemu_pids_for_avd "$avd")
  if [ -n "$pids" ]; then
    local s; s=$(serial_for_avd "$avd" 2>/dev/null)
    if [ -n "$s" ] && guest_alive "$s"; then
      echo "[复用] $avd 已在跑且 guest 健康：$s"; return 0
    fi
    echo "[僵死] $avd 在跑但 guest adb 无响应 → 重启"
    stop_avd "$avd"
  fi
  # 铁律3/4/5：SDK 启动器、带窗口、日志落盘
  echo "[启动] $avd（带窗口，日志 /tmp/vela_emu_${avd}.log）"
  nohup "$LAUNCHER" -vela -avd "$avd" -show-kernel \
    -network-user-mode-options "hostfwd=tcp:127.0.0.1:10055-10.0.2.15:101" \
    > "/tmp/vela_emu_${avd}.log" 2>&1 &
  echo "[等待] guest adb 探活（最长 60s）…"
  local i s
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
    sleep 2
    s=$(serial_for_avd "$avd" 2>/dev/null)
    if [ -n "$s" ] && guest_alive "$s"; then
      echo "[OK] $avd → $s（guest 健康，可部署）"
      return 0
    fi
  done
  echo "[失败] 60s 未就绪，看日志: tail -30 /tmp/vela_emu_${avd}.log"
  return 1
}

cmd_clean() {
  echo "[1/2] 清卡死部署进程"
  local sp; sp=$(stuck_deploy_pids)
  if [ -n "$sp" ]; then
    for p in $sp; do kill "$p" 2>/dev/null && echo "  killed $p"; done
  else
    echo "  （无）"
  fi
  echo "[2/2] 清 AVD 死锁（仅当无 qemu 在跑）"
  if [ -n "$(all_qemu_pids)" ]; then
    echo "  跳过：仍有 qemu 在跑"
  else
    local trash="/tmp/trash/emu-lock-$(date +%s)"
    mkdir -p "$trash"
    find "$HOME/.vela" -name "*.lock" -maxdepth 5 2>/dev/null | while read -r f; do
      mv "$f" "$trash/" 2>/dev/null && echo "  moved: $f"
    done
    echo "  锁文件移入 $trash（未删除）"
  fi
}

case "${1:-}" in
  status) cmd_status ;;
  start)  shift; cmd_start "$@" ;;
  stop)   shift; cmd_stop "$@" ;;
  clean)  cmd_clean ;;
  *)      sed -n '2,8p' "$0" ;;
esac