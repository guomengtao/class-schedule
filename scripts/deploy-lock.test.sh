#!/bin/bash
# deploy-lock.js 回归测试 —— 纯本地，假 avd 名，不启动模拟器。
#
# 用法：  bash scripts/deploy-lock.test.sh   （全绿退出码 0）
#         NODE=/path/to/node bash scripts/deploy-lock.test.sh
#
# 覆盖：manual 生命周期 / run 退出即释放 / 心跳刷新 / kill -9 后宽限与回收
#       / 双进程并发只一赢 / 进程活但心跳停判卡死 / 参数校验
set -u
NODE="${NODE:-node}"
cd "$(dirname "$0")/.." || exit 1

LOCKDIR="$HOME/.vela/devops"
PASS=0
FAIL=0

L() { "$NODE" scripts/deploy-lock.js "$@"; }
ck() { # ck <期望退出码> <实际退出码> <用例名>
  if [ "$1" = "$2" ]; then PASS=$((PASS + 1)); echo "  PASS  $3"
  else FAIL=$((FAIL + 1)); echo "  FAIL  $3  (期望 $1, 实际 $2)"; fi
}
ckn() { # ckn <0=期望存在 / 1=期望不存在> <实际> <用例名>
  if [ "$1" = "$2" ]; then PASS=$((PASS + 1)); echo "  PASS  $3"
  else FAIL=$((FAIL + 1)); echo "  FAIL  $3  (期望 $1, 实际 $2)"; fi
}
tag_of() { # tag_of <avd>
  "$NODE" scripts/deploy-lock.js status --json | "$NODE" -e '
    let s = ""
    process.stdin.on("data", d => s += d).on("end", () => {
      const r = JSON.parse(s).find(x => x.avd === process.argv[1])
      console.log(r ? r.tag : "none")
    })' "$1"
}
hb_of() { # hb_of <avd>  → 心跳距今秒数，无锁输出 -1
  "$NODE" scripts/deploy-lock.js status --json | "$NODE" -e '
    let s = ""
    process.stdin.on("data", d => s += d).on("end", () => {
      const r = JSON.parse(s).find(x => x.avd === process.argv[1])
      console.log(r && r.hbAgoMs !== null ? Math.round(r.hbAgoMs / 1000) : -1)
    })' "$1"
}

rm -f "$LOCKDIR"/deploy-tlk*.lock 2>/dev/null

echo "=== A. manual 生命周期 ==="
L acquire --avd tlka --owner A >/dev/null 2>&1; ck 0 $? "acquire A 成功"
L acquire --avd tlka --owner B >/dev/null 2>&1; ck 1 $? "同 avd 第二人 acquire 被拒"
L renew --avd tlka --owner A >/dev/null 2>&1; ck 0 $? "持锁者 renew 成功"
L renew --avd tlka --owner B >/dev/null 2>&1; ck 1 $? "非持锁者 renew 被拒"
L release --avd tlka --owner B >/dev/null 2>&1; ck 1 $? "非持锁者 release 被拒"
L release --avd tlka --owner A >/dev/null 2>&1; ck 0 $? "持锁者 release 成功"
[ -f "$LOCKDIR/deploy-tlka.lock" ]; ckn 1 $? "释放后锁文件已删"

echo "=== B. run 命令退出即释放 ==="
L run --avd tlkb --owner R -- sleep 2 >/dev/null 2>&1; ck 0 $? "run 命令成功退出"
[ -f "$LOCKDIR/deploy-tlkb.lock" ]; ckn 1 $? "run 结束后锁自动释放"

echo "=== C. run 心跳在刷（长跑 13s 后看 hbAgo）==="
"$NODE" scripts/deploy-lock.js run --avd tlkc --owner R -- sleep 40 >/dev/null 2>&1 &
RPID=$!
sleep 13
HBAGO=$(hb_of tlkc)
if [ "$HBAGO" -ge 0 ] && [ "$HBAGO" -le 12 ]; then
  PASS=$((PASS + 1)); echo "  PASS  心跳在刷（${HBAGO}s 前，应 <=12s）"
else
  FAIL=$((FAIL + 1)); echo "  FAIL  心跳不新鲜（${HBAGO}s）"
fi
TAG=$(tag_of tlkc)
[ "$TAG" = "run-live" ] && { PASS=$((PASS + 1)); echo "  PASS  13s 后仍 run-live（说明不靠短租期判活）"; } || { FAIL=$((FAIL + 1)); echo "  FAIL  状态=$TAG"; }
kill -TERM $RPID 2>/dev/null; wait $RPID 2>/dev/null
sleep 1
[ -f "$LOCKDIR/deploy-tlkc.lock" ]; ckn 1 $? "SIGTERM 后锁已释放"

echo "=== D. 被 kill -9 后：宽限 -> 判死 -> 自动回收 ==="
"$NODE" scripts/deploy-lock.js run --avd tlkd --owner R -- sleep 60 >/dev/null 2>&1 &
DPID=$!
sleep 11
kill -9 $DPID 2>/dev/null; wait $DPID 2>/dev/null
TAG1=$(tag_of tlkd)
[ "$TAG1" = "run-grace" ] && { PASS=$((PASS + 1)); echo "  PASS  刚被 kill = run-grace（宽限）"; } || { FAIL=$((FAIL + 1)); echo "  FAIL  刚被 kill = $TAG1"; }
sleep 16
TAG2=$(tag_of tlkd)
[ "$TAG2" = "run-dead" ] && { PASS=$((PASS + 1)); echo "  PASS  16s 后 = run-dead（可回收）"; } || { FAIL=$((FAIL + 1)); echo "  FAIL  16s 后 = $TAG2"; }
L acquire --avd tlkd --owner B >/dev/null 2>&1; ck 0 $? "后来者 acquire 自动回收成功"
L release --avd tlkd --owner B >/dev/null 2>&1
[ -f "$LOCKDIR/deploy-tlkd.lock" ]; ckn 1 $? "清理干净"

echo "=== E. 并发抢同一台：只能有一个赢 ==="
( "$NODE" scripts/deploy-lock.js run --avd tlke --owner X -- sleep 3 >/dev/null 2>&1 ) &
P1=$!
( "$NODE" scripts/deploy-lock.js run --avd tlke --owner Y -- sleep 3 >/dev/null 2>&1 ) &
P2=$!
wait $P1; RX=$?
wait $P2; RY=$?
WIN=0
[ "$RX" = "0" ] && WIN=$((WIN + 1))
[ "$RY" = "0" ] && WIN=$((WIN + 1))
[ "$WIN" = "1" ] && { PASS=$((PASS + 1)); echo "  PASS  并发 2 抢 1（X=$RX, Y=$RY）"; } || { FAIL=$((FAIL + 1)); echo "  FAIL  并发结果 X=$RX Y=$RY"; }
[ -f "$LOCKDIR/deploy-tlke.lock" ]; ckn 1 $? "结束后无残留锁"

echo "=== F. 进程活着但心跳停（卡死）判据 ==="
NOW=$("$NODE" -e 'console.log(Date.now())')
sleep 25 &
LID=$!
mkdir -p "$LOCKDIR"
"$NODE" -e '
const fs = require("fs"), os = require("os"), path = require("path")
const [avd, pid, now] = process.argv.slice(1)
const f = path.join(os.homedir(), ".vela", "devops", `deploy-${avd}.lock`)
fs.writeFileSync(f, JSON.stringify({
  avd, owner: "HUNG", mode: "run", pid: Number(pid),
  at: "2026-10-20 00:00:00", ts: Number(now) - 600000,
  hbPid: Number(pid), hb: Number(now) - 60000, ttl: 1800000,
}, null, 2))
' tlkf "$LID" "$NOW"
TAGF=$(tag_of tlkf)
[ "$TAGF" = "run-hung" ] && { PASS=$((PASS + 1)); echo "  PASS  心跳停 60s 且进程活 = run-hung"; } || { FAIL=$((FAIL + 1)); echo "  FAIL  状态=$TAGF"; }
L acquire --avd tlkf --owner B >/dev/null 2>&1; ck 0 $? "卡死锁可被回收接管"
L release --avd tlkf --owner B >/dev/null 2>&1
kill $LID 2>/dev/null

echo "=== G. 参数校验 ==="
L acquire >/dev/null 2>&1; ck 2 $? "acquire 缺 --avd 返回 2"
L run --avd tlkg --owner R >/dev/null 2>&1; ck 2 $? "run 缺命令返回 2"
L renew --avd tlk_none >/dev/null 2>&1; ck 1 $? "renew 无锁返回 1"

rm -f "$LOCKDIR"/deploy-tlk*.lock
echo ""
echo "结果: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ] || exit 1
