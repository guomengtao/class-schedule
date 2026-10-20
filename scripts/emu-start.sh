#!/usr/bin/env bash
# emu-start.sh —— Vela 模拟器单实例稳定启动器（极简防御版 v2）
# 用法：
#   bash scripts/emu-start.sh status
#   bash scripts/emu-start.sh start xiaomi_band
#   bash scripts/emu-start.sh stop  xiaomi_band          # 只停指定一台
#   bash scripts/emu-start.sh stop-all-dangerous         # 全停（需 EMU_CONFIRM_STOP_ALL=1，白名单仍跳过）
#   bash scripts/emu-start.sh clean
# 设计约定见 docs/模拟器启动稳定性方案.md（单实例 / 先探活 / 用启动器 / 带窗口 / 日志落盘）
# v2 变更：去掉 set -u（未绑定变量硬失败）、用纯 ps/adb 文本匹配替代 lsof+awk 端口解析

LAUNCHER="$HOME/.vela/sdk/emulator/darwin-aarch64/emulator"
ADB="$HOME/.vela/sdk/tools/adb/mac/adb"
[ -x "$ADB" ] || ADB="$(cd "$(dirname "$0")/.." && pwd)/node_modules/@aiot-toolkit/emulator/node_modules/@miwt/adb/bin/mac/adb"
[ -x "$ADB" ] || { echo "找不到 adb"; exit 1; }

# ---------- 用户专用实例白名单（AI 的禁区）----------
# 一行一个 AVD 名。命中白名单的实例：
#   · 不计入机型族计数（AI 启动自己的机器不再被它挡住）
#   · 不进出门闩提示语（避免出现「先 stop 用户那台」这类教人自伤的提示）
#   · stop_avd 直接拒绝（AI 无法停下它）
#   · 巡检永不掐杀
# 2026-10-20 用户明令：evc-xiaomi_band-buddy-1 是手工专用机，AI 不得操作。
USER_CONF="${EMU_USER_CONF:-$HOME/.vela/devops/user-instances.conf}"
is_user_instance() {
  [ -f "$USER_CONF" ] || return 1
  grep -qxF "$1" "$USER_CONF" 2>/dev/null
}

# ---------- 端口段：物理归属判据（档2）----------
# 用户侧 / EvEmuBuddy 起的实例跑在 12000+ 端口（实测 buddy-1 = emulator-13000）；
# AI 侧由 emu-start 起的实例落在 555x 段。判据只看进程行里的 -port：
#   拿不到 -port 的一律按 AI 段处理（AI 从不自己指定 -port）。
# 好处：即使白名单文件被删/漏配，用户那台因为「物理在不同端口段」也不会被 AI 碰到。
USER_PORT_MIN="${EMU_USER_PORT_MIN:-12000}"
port_segment() { # 入参：端口号（可空） → user | ai
  local p="${1:-}"
  if [ -n "$p" ] && [ "$p" -ge "$USER_PORT_MIN" ] 2>/dev/null; then echo user; else echo ai; fi
}
port_of_avd() { # 该 AVD 运行实例的 -port；拿不到输出空
  ps aux | grep qemu-system | grep -v grep | grep -- "-avd $1 " \
    | sed -nE 's/.*-port ([0-9]+).*/\1/p' | head -1
}
avd_in_user_segment() { [ "$(port_segment "$(port_of_avd "$1")")" = "user" ]; }

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
serial_for_avd() { # 纯探测：在 adb devices 里反查属于该 AVD 的 serial
  # 2026-10-20 改：不再 kill-server。老逻辑在探测失败时重启 adb server，
  # 会把别人的连接一起掐断 2 秒（用户侧表现为卡死/闪退），且极易自我干扰
  # 造成「实例在跑却认不出」的假故障。救急时可 EMU_ADB_REPAIR=1 手动开。
  local s
  for s in $("$ADB" devices 2>/dev/null | awk '$2=="device"{print $1}' | grep '^emulator-'); do
    # tr -d '\r'：vela 版 adb 的 emu 输出是 CRLF，不去掉 CR 会导致永远匹配不上
    # —— 这就是「实例在跑却 serial=未识别 → 判僵死 → 重启」的真根因（2026-10-20 实测）
    if timeout 5 "$ADB" -s "$s" emu avd name 2>/dev/null | tr -d '\r' | head -1 | grep -q "^$1$"; then
      echo "$s"; return 0
    fi
  done
  if [ "${EMU_ADB_REPAIR:-0}" = "1" ]; then
    "$ADB" kill-server >/dev/null 2>&1; sleep 2; "$ADB" start-server >/dev/null 2>&1; sleep 2
    for s in $("$ADB" devices 2>/dev/null | awk '$2=="device"{print $1}' | grep '^emulator-'); do
      if timeout 5 "$ADB" -s "$s" emu avd name 2>/dev/null | tr -d '\r' | head -1 | grep -q "^$1$"; then
        echo "$s"; return 0
      fi
    done
  fi
  return 1
}

resolve_serial() { # 探活：先反查，反查失败再兜底（修「实例其实活着却判未就绪」）
  local s n nm
  s=$(serial_for_avd "$1" 2>/dev/null)
  [ -n "$s" ] && { echo "$s"; return 0; }
  # 兜底：全机只有 1 台在线设备、guest 有回应、且【反查不到 AVD 名】
  # 2026-10-20：必须要求"反查不到名字"。若反查得到名字却不是目标，说明这台是别人的实例
  # （典型：用户手工机在 13000 段），此时绝不能认领——否则 AI 会把包推到用户机器上。
  n=$("$ADB" devices 2>/dev/null | awk '$2=="device"{print $1}' | grep -c '^emulator-')
  if [ "$n" = "1" ]; then
    s=$("$ADB" devices 2>/dev/null | awk '$2=="device"{print $1}' | grep '^emulator-' | head -1)
    nm=$(timeout 5 "$ADB" -s "$s" emu avd name 2>/dev/null | tr -d '\r' | head -1)
    if [ -z "$nm" ] && guest_alive "$s"; then echo "$s"; return 0; fi
  fi
  return 1
}

cmd_status() {
  echo "== qemu 实例 =="
  local found=0 avd pid
  for avd in $(avd_names_running); do
    found=1
    for pid in $(qemu_pids_for_avd "$avd"); do
      local s="" g="否"
      s=$(resolve_serial "$avd" 2>/dev/null)
      [ -n "$s" ] && guest_alive "$s" && g="是"
      echo "  avd=$avd pid=$pid serial=${s:-未识别} guest存活=$g 段=$(port_segment "$(port_of_avd "$avd")")"
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

# 机型族判定（对应 vela.py 的 AVD_MODEL，防 AI 克隆体多开同类）
#   先剥 evc- 前缀，再按前缀匹配归并（长的写在前面，否则 xiaomi_band_pro 会被 xiaomi_band* 吃掉）。
#   2026-10-20 修：原先对克隆体只取第一个 - 前的段，含连字符的族名会被截断
#   （evc-band-9-pro-1 → band，而母体 band-9-pro → band-9-pro，两者不同族 → 门闩漏）。
avd_family() {
  local avd="$1" base
  base="${avd#evc-}"
  case "$base" in
    xiaomi_band_pro*) echo xiaomi_band_pro; return ;;
    xiaomi_band_10*)  echo xiaomi_band_10;  return ;;
    xiaomi_band*)     echo xiaomi_band;     return ;;
    band-9-pro*)      echo band-9-pro;      return ;;
  esac
  echo "${base%%-*}"
}

# hostfwd 端口分配（2026-10-20 加）
#   原实现把所有实例都绑 127.0.0.1:10055，第一台占住后第二台直接死：
#     qemu-system-armel: Could not set up host forwarding rule 'tcp:127.0.0.1:10055-...'
#   这跟机型无关，任意两台并存都会撞。改为按 AVD 名派生稳定端口：
#   同名永远得同一个号（便于脚本记忆），不同名几乎不会撞；真被占就顺延。
#   主实例 xiaomi_band 保留 10055，兼容历史习惯与已有脚本。
hfwd_port() {
  local avd="$1" want h n
  case "$avd" in
    xiaomi_band) want=10055 ;;
    *)           want=$(( 10056 + $(printf '%s' "$avd" | cksum | awk '{print $1}') % 700 )) ;;
  esac
  n=0
  while [ "$n" -lt 40 ]; do
    if ! lsof -nP -iTCP:"$want" >/dev/null 2>&1; then
      echo "$want"; return 0
    fi
    want=$(( want + 1 )); n=$(( n + 1 ))
  done
  echo ""; return 1
}

stop_avd() {
  local avd="$1" pids
  # 档2 硬锁：跑在用户端口段的实例，物理上就不归 AI 管（白名单漏配也拦得住）
  if avd_in_user_segment "$avd"; then
    echo "[拒绝] $avd 在用户端口段（port=$(port_of_avd "$avd") ≥ ${USER_PORT_MIN}），AI 不得停止"
    return 1
  fi
  # 白名单硬锁：AI 不得停止用户专用实例（2026-10-20 用户明令）
  if is_user_instance "$avd" && [ "${EMU_ALLOW_USER_INSTANCE:-0}" != "1" ]; then
    echo "[拒绝] $avd 是用户专用实例（$USER_CONF 白名单），AI 不得停止"
    return 1
  fi
  pids=$(qemu_pids_for_avd "$avd")
  if [ -z "$pids" ]; then echo "[无] $avd 未在跑"; return 0; fi
  for p in $pids; do kill "$p" 2>/dev/null && echo "[停] $avd pid=$p"; done
  sleep 2
  # 兜底：还活着就 -9
  pids=$(qemu_pids_for_avd "$avd")
  for p in $pids; do kill -9 "$p" 2>/dev/null && echo "[强杀] pid=$p"; done
}

cmd_stop() {
  local rc=0
  case "${1:-}" in
    all)
      # 2026-10-20：stop all 会一刀切掉所有实例（含用户手工机），默认禁用
      echo "[拒绝] stop all 已停用：它会停掉本机所有实例（含用户专用实例）"
      echo "[拒绝] 要只停一台请用 stop <avd>；确实要全停：stop-all-dangerous + EMU_CONFIRM_STOP_ALL=1"
      return 1
      ;;
    stop-all-dangerous)
      if [ "${EMU_CONFIRM_STOP_ALL:-0}" != "1" ]; then
        echo "[拒绝] stop-all-dangerous 需二次确认：EMU_CONFIRM_STOP_ALL=1"
        echo "[提示] 白名单内的用户实例仍会被跳过，不会被停"
        return 1
      fi
      for a in $(avd_names_running); do stop_avd "$a" || true; done
      ;;
    "")  echo "用法: $0 stop <avd>|stop-all-dangerous"; return 1 ;;
    *)   stop_avd "$1"; rc=$? ;;
  esac
  # 收尾孤儿 crashpad（父进程非 qemu 的）
  ps aux | grep crashpad_handler | grep -v grep | awk '{print $2}' | while read -r p; do
    ppid=$(ps -p "$p" -o ppid= 2>/dev/null | tr -d ' ')
    ps -p "$ppid" -o command= 2>/dev/null | grep -q qemu-system || kill "$p" 2>/dev/null
  done
  return $rc
}

cmd_start() {
  local avd="${1:-}"
  [ -z "$avd" ] && { echo "用法: $0 start <avd>"; return 1; }
  # 档2 硬锁：用户端口段的实例，AI 不得启动/重启
  if avd_in_user_segment "$avd"; then
    echo "[拒绝] $avd 在用户端口段（port=$(port_of_avd "$avd") ≥ ${USER_PORT_MIN}），AI 不得启动/重启"
    return 1
  fi
  # 白名单硬锁：AI 不得启动用户专用实例
  if is_user_instance "$avd" && [ "${EMU_ALLOW_USER_INSTANCE:-0}" != "1" ]; then
    echo "[拒绝] $avd 是用户专用实例（$USER_CONF 白名单），AI 不得启动/重启"
    return 1
  fi
  # 铁律B：机型族单台门闩（默认开，EMU_ONE_PER_FAMILY=0 豁免）
  #   目的：禁止「AI 自己同机型多开」——同一机型族（如手环9）整机只许 1 台。
  #   判据只用 qemu PID 存活（可靠、不误杀）；同族已有任一在跑实例（只要是活的 qemu）→ 拒绝新开。
  #   2026-10-20：白名单实例不计入同族、也不进提示语——否则 AI 会照着提示去停用户的机器。
  if [ "${EMU_ONE_PER_FAMILY:-1}" = "1" ]; then
    local fam other skipped=0
    fam=$(avd_family "$avd")
    for other in $(avd_names_running); do
      [ "$other" = "$avd" ] && continue
      [ -n "$(qemu_pids_for_avd "$other")" ] || continue
      # 档2：用户侧实例（端口段 或 白名单）完全不在 AI 视野——不看族、不计数、绝不提示 stop
      if avd_in_user_segment "$other" || is_user_instance "$other"; then
        skipped=$((skipped + 1)); continue
      fi
      [ "$(avd_family "$other")" = "$fam" ] || continue
      echo "[门闩] 同机型族($fam)已有 AI 实例在跑：$other（pid=$(qemu_pids_for_avd "$other" | head -1)）"
      echo "[门闩] 每族只许 1 台 AI 实例。先 stop $other 再启 $avd；或 EMU_ONE_PER_FAMILY=0 豁免。"
      [ "$skipped" -gt 0 ] && echo "[门闩] 注：另有 $skipped 台用户侧实例在跑（端口段≥${USER_PORT_MIN} 或白名单），不在 AI 管辖范围，不要动它。"
      return 1
    done
  fi
  # 铁律1：同 AVD 已在跑 → 复用或重启僵死
  local pids; pids=$(qemu_pids_for_avd "$avd")
  if [ -n "$pids" ]; then
    local s; s=$(resolve_serial "$avd" 2>/dev/null)
    if [ -n "$s" ] && guest_alive "$s"; then
      echo "[复用] $avd 已在跑且 guest 健康：$s"; return 0
    fi
    echo "[僵死] $avd 在跑但 guest adb 无响应 → 重启"
    stop_avd "$avd"
  fi
  # 铁律3/4/5：SDK 启动器、带窗口、日志落盘
  local hp
  hp=$(hfwd_port "$avd")
  if [ -z "$hp" ]; then
    echo "[失败] $avd 没有可用 hostfwd 端口（10055-10795 全占）"
    return 1
  fi
  echo "[启动] $avd（带窗口，hostfwd=$hp，日志 /tmp/vela_emu_${avd}.log）"
  nohup "$LAUNCHER" -vela -avd "$avd" -show-kernel \
    -network-user-mode-options "hostfwd=tcp:127.0.0.1:${hp}-10.0.2.15:101" \
    > "/tmp/vela_emu_${avd}.log" 2>&1 &
  echo "[等待] guest adb 探活（最长 60s）…"
  local i s
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
    sleep 2
    s=$(resolve_serial "$avd" 2>/dev/null)
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
  stop-all-dangerous) cmd_stop stop-all-dangerous ;;
  clean)  cmd_clean ;;
  *)      sed -n '2,8p' "$0" ;;
esac