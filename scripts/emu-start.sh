#!/usr/bin/env bash
# emu-start.sh —— Vela 模拟器单实例稳定启动器
# 用法：
#   bash scripts/emu-start.sh status
#   bash scripts/emu-start.sh start <avd>    # 例: xiaomi_band
#   bash scripts/emu-start.sh stop  <avd>|all
#   bash scripts/emu-start.sh clean
# 设计约定见 docs/模拟器启动稳定性方案.md（单实例 / 先探活 / 用启动器 / 带窗口 / 日志落盘）
set -u

SDK_EMU="$HOME/.vela/sdk/emulator/darwin-aarch64/emulator"
ADB="$HOME/.vela/sdk/tools/adb/mac/adb"
[ -x "$ADB" ] || ADB="$(dirname "$0")/../node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb"

qemu_list() { ps aux | grep qemu-system-armel | grep -v grep || true; }
avd_of() { ps aux | grep qemu-system-armel | grep -v grep | grep -- "-avd $1 " | awk '{print $2}' | head -1; }
serial_of_pid() { # 从 qemu 命令行抓 5554 类端口 → serial
  lsof -nP -iTCP -sTCP:LISTEN -p "$1" 2>/dev/null \
    | awk '{for(i=9;i<=NF;i++) if ($i ~ /127\.0\.0\.1:(55[0-9]{2})/) {split($i,a,":"); print a[2]}}' \
    | head -1
}
alive_guest() { timeout 8 "$ADB" -s "$1" shell echo alive 2>/dev/null | grep -q alive; }
alive_host() { timeout 8 "$ADB" -s "$1" emu avd name 2>/dev/null | grep -q .; }

cmd_status() {
  echo "== qemu 实例 =="
  local pids; pids=$(qemu_list | awk '{print $2}')
  if [ -z "$pids" ]; then echo "  （无）"; else
    for pid in $pids; do
      local avd serial g h
      avd=$(ps -p "$pid" -o command= | sed -E 's/.*-avd ([^ ]+).*/\1/')
      serial=$(serial_of_pid "$pid"); serial="emulator-${serial:-?}"
      g=否; h=否
      [ "$serial" != "emulator-?" ] && { alive_guest "$serial" && g=是; alive_host "$serial" && h=是; }
      echo "  pid=$pid avd=$avd serial=$serial 宿主=$h guest=$g"
    done
  fi
  echo "== 卡死部署进程（adb shell unzip）=="
  ps aux | grep -E "adb.*shell unzip -o /data/quickapp" | grep -v grep | awk '{print "  pid="$2" "$11" "$12" "$13}' || echo "  （无）"
  ps aux | grep -E "adb.*shell unzip -o /data/quickapp" | grep -v grep | grep -q . || echo "  （无）"
}

cmd_start() {
  local avd="${1:-}"; [ -z "$avd" ] && { echo "用法: $0 start <avd>"; exit 1; }
  # 铁律1：同 AVD 已在跑 → 复用
  local pid; pid=$(avd_of "$avd")
  if [ -n "$pid" ]; then
    local serial; serial="emulator-$(serial_of_pid "$pid")"
    if alive_guest "$serial"; then
      echo "[复用] $avd 已在跑且 guest 健康：$serial（不启第二个实例）"; exit 0
    fi
    echo "[僵死] $avd 在跑但 guest adb 无响应 → 先停再启"
    cmd_stop "$avd"; sleep 2
  fi
  # 铁律3/4/5：启动器、带窗口、日志落盘
  echo "[启动] $avd（带窗口）"
  nohup "$SDK_EMU" -avd "$avd" -show-kernel \
    -network-user-mode-options "hostfwd=tcp:127.0.0.1:10055-10.0.2.15:101" \
    > "/tmp/vela_emu_${avd}.log" 2>&1 &
  echo "[等待] guest adb 探活（最长 40s）…"
  local i serial
  for i in $(seq 1 20); do
    sleep 2
    serial=$("$ADB" devices | awk '$2=="device"{print $1}' | while read -r s; do
      timeout 5 "$ADB" -s "$s" emu avd name 2>/dev/null | head -1 | grep -q "^$avd$" && echo "$s" && break
    done)
    if [ -n "${serial:-}" ] && alive_guest "$serial"; then
      echo "[OK] $avd → $serial（guest 健康，可部署）"; exit 0
    fi
  done
  echo "[失败] 40s 内 guest 未就绪，日志: /tmp/vela_emu_${avd}.log"; exit 1
}

cmd_stop() {
  local target="${1:-}"
  case "$target" in
    all) qemu_list | awk '{print $2}' | while read -r p; do kill "$p" 2>/dev/null; done ;;
    "")  echo "用法: $0 stop <avd>|all"; exit 1 ;;
    *)   local p; p=$(avd_of "$target"); [ -n "$p" ] && kill "$p" 2>/dev/null && echo "[停] $target(pid=$p)" || echo "[无] $target 未在跑" ;;
  esac
  sleep 2
  # 收尾：父 qemu 已死的 crashpad 孤儿
  ps aux | grep crashpad_handler | grep -v grep | awk '{print $2}' | while read -r p; do
    ppid=$(ps -p "$p" -o ppid= | tr -d ' ')
    ps -p "$ppid" -o command= 2>/dev/null | grep -q qemu-system || kill "$p" 2>/dev/null
  done
}

cmd_clean() {
  echo "[1/2] 清卡死部署进程（adb … unzip -o /data/quickapp）"
  ps aux | grep -E "adb.*shell unzip -o /data/quickapp" | grep -v grep | awk '{print $2}' \
    | while read -r p; do kill "$p" 2>/dev/null && echo "  killed $p"; done
  echo "[2/2] 清 AVD 死锁（仅当无 qemu 在跑）"
  if qemu_list | grep -q qemu-system; then
    echo "  跳过：仍有 qemu 在跑，不动锁文件"
  else
    local ts trash="/tmp/trash/emu-lock-$(date +%s)"; mkdir -p "$trash"
    find "$HOME/.vela" "$HOME/.android" -maxdepth 4 -name "*.lock" 2>/dev/null \
      | while read -r f; do mv "$f" "$trash/" && echo "  moved: $f"; done
    echo "  锁文件已移入 $trash（未删除，可随时检视）"
  fi
}

case "${1:-}" in
  status) cmd_status ;;
  start)  shift; cmd_start "$@" ;;
  stop)   shift; cmd_stop "$@" ;;
  clean)  cmd_clean ;;
  *)      grep '^#' "$0" | head -8; echo "命令: status | start <avd> | stop <avd>|all | clean" ;;
esac
