#!/usr/bin/env bash
# emu-watchdog.sh —— 机型族「进程级」巡检：同族 qemu 超过 1 台时，掐掉后到的那台。
#
# 为什么需要它：
#   emu-start.sh 的门闩只在入口拦（start 子命令）。直连 emulator 二进制、从 IDE 启动、
#   或 EMU_ONE_PER_FAMILY=0，都能绕过去。8G 机器上多开一次就整机僵死、画面对不上，
#   所以再加一道「不看入口、只看进程」的兜底。
#
# 策略：
#   按机型族分组，同族保留「启动最早」的那台（谁先来谁占），其余依次 TERM → 2s → KILL。
#   跨族完全不动手。族名归并与 emu-start.sh 的 avd_family 保持一致（改动请两边同步）。
#
# 用法：
#   bash scripts/emu-watchdog.sh once     # 扫一次并执行（真掐）
#   bash scripts/emu-watchdog.sh check    # 扫一次只看不动手（干跑）
#   bash scripts/emu-watchdog.sh start    # 常驻巡检（默认 15s 一轮）
#   bash scripts/emu-watchdog.sh status   # 看巡检是否在跑 + 当前实例分布
#   bash scripts/emu-watchdog.sh stop     # 停掉常驻
#
# 环境变量：
#   EMU_WATCHDOG_INTERVAL  常驻间隔秒数，默认 15
#   EMU_DRY_RUN=1          只报告不杀
#   EMU_PS_FIXTURE=文件     用假进程表替代 ps（自测用，每行一条 ps aux 格式）
#   EMU_WATCHDOG_LOG       日志路径，默认 /tmp/vela_emu_watchdog.log
set -uo pipefail

LOG="${EMU_WATCHDOG_LOG:-/tmp/vela_emu_watchdog.log}"
INTERVAL="${EMU_WATCHDOG_INTERVAL:-15}"
PIDFILE="${EMU_WATCHDOG_PIDFILE:-/tmp/vela_emu_watchdog.pid}"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >>"$LOG" 2>/dev/null; }
say() { printf '%s\n' "$*"; }

# 机型族判定 —— 必须与 emu-start.sh 的 avd_family 保持一致
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

# 取 qemu 进程行（fixture 模式读假表，便于不启模拟器就验证决策）
qemu_rows() {
  if [ -n "${EMU_PS_FIXTURE:-}" ]; then
    [ -f "$EMU_PS_FIXTURE" ] && cat "$EMU_PS_FIXTURE"
    return 0
  fi
  ps aux | grep '[q]emu-system'
}

# 进程启动时刻（epoch 秒）；取不到返回 999999999，此时退化为按 pid 升序比较
start_epoch() {
  local pid="$1" l ts
  l=$(ps -p "$pid" -o lstart= 2>/dev/null | sed 's/^ *//;s/ *$//')
  if [ -n "$l" ]; then
    ts=$(date -j -f "%a %b %d %T %Y" "$l" +%s 2>/dev/null)
    if [ -n "$ts" ]; then printf '%s' "$ts"; return 0; fi
  fi
  printf '999999999'
}

# 输出：avd \t pid \t start_epoch
scan() {
  local line avd pid se
  qemu_rows | while IFS= read -r line; do
    case "$line" in *"-avd "*) ;; *) continue ;; esac
    avd=$(printf '%s\n' "$line" | sed -E 's/.*-avd ([^ ]+).*/\1/')
    [ -z "$avd" ] && continue
    pid=$(printf '%s\n' "$line" | awk '{print $2}')
    case "$pid" in '' | *[!0-9]*) continue ;; esac
    se=$(start_epoch "$pid")
    printf '%s\t%s\t%s\n' "$avd" "$pid" "$se"
  done
}

sweep() {
  local rows fams fam group n keep keep_avd a p s killed
  rows=$(scan)
  if [ -z "$rows" ]; then
    say "[巡检] 没有 qemu 实例在跑"
    return 0
  fi
  fams=$(printf '%s\n' "$rows" | while IFS=$'\t' read -r a p s; do avd_family "$a"; done | sort -u)
  killed=0
  for fam in $fams; do
    group=$(printf '%s\n' "$rows" | while IFS=$'\t' read -r a p s; do
      if [ "$(avd_family "$a")" = "$fam" ]; then printf '%s\t%s\t%s\n' "$a" "$p" "$s"; fi
    done | sort -k3,3n -k2,2n)
    n=$(printf '%s\n' "$group" | grep -c .)
    [ "$n" -le 1 ] && continue
    keep=$(printf '%s\n' "$group" | head -1)
    keep_avd=$(printf '%s' "$keep" | cut -f1)
    say "[巡检] 族 $fam 有 $n 台 → 保留先到的 $keep_avd"
    log "family=$fam count=$n keep=$keep_avd"
    while IFS=$'\t' read -r a p s; do
      [ -z "$a" ] && continue
      if [ "${EMU_DRY_RUN:-0}" = "1" ]; then
        say "  [干跑] 会掐 $a pid=$p"
      else
        if kill "$p" 2>/dev/null; then
          say "  [掐] $a pid=$p"
          log "killed avd=$a pid=$p family=$fam kept=$keep_avd"
        else
          say "  [失败] $a pid=$p 无法终止（可能已退出）"
        fi
        sleep 2
        if kill -0 "$p" 2>/dev/null; then
          kill -9 "$p" 2>/dev/null && say "  [强掐] $a pid=$p"
          log "killed-9 avd=$a pid=$p family=$fam"
        fi
      fi
      killed=$((killed + 1))
    done <<<"$(printf '%s\n' "$group" | tail -n +2)"
  done
  [ "$killed" = "0" ] && say "[巡检] 每族至多 1 台，无需处理"
  return 0
}

pid_of() { [ -f "$PIDFILE" ] && awk '{print $1}' "$PIDFILE" 2>/dev/null; }
iv_of() { [ -f "$PIDFILE" ] && awk '{print $2}' "$PIDFILE" 2>/dev/null; }

cmd_start() {
  local old="" newpid=""
  old=$(pid_of)
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
    say "[巡检] 已在运行 pid=$old（间隔 $(iv_of)s）"
    return 0
  fi
  rm -f "$PIDFILE"
  nohup "$SELF" loop >>"$LOG" 2>&1 &
  newpid=$!
  sleep 1
  if ! kill -0 "$newpid" 2>/dev/null; then
    say "[巡检] ❌ 启动失败（进程立即退出，常见原因：脚本无可执行权限），看日志: $LOG"
    rm -f "$PIDFILE"
    return 1
  fi
  echo "$newpid $INTERVAL" >"$PIDFILE"
  say "[巡检] 已启动 pid=$newpid，每 ${INTERVAL}s 扫一次，日志 $LOG"
}

cmd_stop() {
  local p=""
  p=$(pid_of)
  if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then
    kill "$p" 2>/dev/null && say "[巡检] 已停止 pid=$p"
  else
    say "[巡检] 未在运行（已清理 pid 文件）"
  fi
  rm -f "$PIDFILE"
}

cmd_status() {
  local p="" rows iv=""
  p=$(pid_of)
  iv=$(iv_of)
  if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then
    say "[巡检] 运行中 pid=$p 间隔 ${iv:-$INTERVAL}s"
  else
    say "[巡检] 未运行"
  fi
  rows=$(scan)
  if [ -z "$rows" ]; then
    say "  当前无 qemu 实例"
    return 0
  fi
  say "  当前实例："
  printf '%s\n' "$rows" | while IFS=$'\t' read -r a pid s; do
    [ -z "$a" ] && continue
    say "    $(avd_family "$a")  ←  $a (pid=$pid)"
  done
}

cmd_loop() {
  log "watchdog loop start interval=${INTERVAL}s"
  trap 'log "watchdog loop stop"; exit 0' INT TERM
  while :; do
    sweep >>"$LOG" 2>&1
    sleep "$INTERVAL"
  done
}

CMD=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) export EMU_DRY_RUN=1 ;;
    --interval=*) export EMU_WATCHDOG_INTERVAL="${arg#--interval=}" ;;
    *) [ -z "$CMD" ] && CMD="$arg" ;;
  esac
done
INTERVAL="${EMU_WATCHDOG_INTERVAL:-15}"

case "${CMD:-once}" in
  once) sweep ;;
  check) EMU_DRY_RUN=1 sweep ;;
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  loop) cmd_loop ;;
  *) sed -n '2,20p' "$0" ;;
esac
