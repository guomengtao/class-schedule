#!/bin/zsh
# ---------------------------------------------------------------------------
# ev-session-beat.sh — Trae 会话「活动心跳 + 轨迹日志」兜底钩子
#
# 背景：Trae 不挂 PreToolUse 编辑钩（CodeBuddy/Claude/WorkBuddy 有，Trae 没有），
#       无法在「编辑当下」强制触发脚本。本命令改由 AI/人在每次动手前后主动跑一次，
#       把「本轮我动了什么」落成可 grep 的轨迹，并刷新会话心跳，供
#       unbound 雷达 / 晨割 / 审计观测——补齐 Trae 的无钩观测断点。
#
# 用法：
#   scripts/ev-session-beat.sh [活动描述]   # 记录一次活动（心跳 + 轨迹 + 裸奔预警）
#
# 行为（全部 log 模式，不阻塞干活）：
#   ① 刷新当前会话黑板心跳（data/active/*.json 按 cwd 匹配，hit 即刷 heartbeat_at）
#   ② append 一行活动轨迹到 ~/.workbuddy/activity-trail.log
#   ③ 若工作区有脏改动 + .claims 无任何 in_progress 认领 → append 一行裸奔预警
#     到 ~/.workbuddy/activity-violations.log（供雷达/晨割收）
# 退出码：0 正常；2 环境/缺依赖。
# ---------------------------------------------------------------------------
set -u

ROOT="${EV_GMT_ROOT:-$HOME/Documents/guomengtao}"
DATA_DIRS="${EV_SESSION_DATA_DIRS:-$ROOT/ev/ev-ops-android/data/active:$ROOT/ev/ev-android/data/active}"
CLAIMS_DIR="$ROOT/.claims"
TRAIL="$HOME/.workbuddy/activity-trail.log"
VIOL="$HOME/.workbuddy/activity-violations.log"
SID="${EV_SESSION_ID:-$(date +%Y%m%d-%H%M%S)-$$}"
TOOL="${EV_SESSION_TOOL:-trae}"
NOTE="${1:-beat}"

PY="/usr/bin/python3"
if [[ ! -x "$PY" ]]; then PY="$(command -v python3 || true)" || true; fi
if [[ -z "$PY" ]]; then echo "[ev-session-beat] 缺 python3" >&2; exit 2; fi

mkdir -p "$HOME/.workbuddy" "$CLAIMS_DIR"

REPO="$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "")"
DIRTY=0
if [[ -n "$REPO" ]] && [[ -n "$(git -C "$REPO" status --porcelain 2>/dev/null)" ]]; then
  DIRTY=1
fi

"$PY" - "$PWD" "$SID" "$TOOL" "$REPO" "$DIRTY" "$NOTE" "$TRAIL" "$VIOL" "$CLAIMS_DIR" "$DATA_DIRS" <<'PYEOF'
import glob, json, os, sys, time
cwd, sid, tool, repo, dirty, note = sys.argv[1:7]
trail, viol, claims_dir, data_dirs = sys.argv[7:11]

ts = time.strftime("%Y-%m-%dT%H:%M:%S%z")

# ① 刷新会话心跳：对每个 active 目录按 cwd 匹配刷 heartbeat_at
for dd in data_dirs.split(":"):
    if not dd or not os.path.isdir(dd):
        continue
    try:
        names = sorted(n for n in os.listdir(dd) if n.endswith(".json"))
    except OSError:
        continue
    for n in names:
        p = os.path.join(dd, n)
        try:
            rec = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(rec, dict):
            continue
        d = rec.get("cwd") or ""
        if d and os.path.abspath(d) == os.path.abspath(cwd):
            rec["heartbeat_at"] = ts
            tmp = p + ".tmp"
            try:
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(rec, f, ensure_ascii=False, indent=2)
                    f.write("\n")
                os.replace(tmp, p)
            except Exception:
                pass
            break

# 认领判定（宽松）：只要存在 in_progress 认领即视为「有认领在跑」，否则裸奔
import re
claimed = 0
task_id = ""
def take(d):
    global claimed, task_id
    if d.get("status") != "in_progress":
        return False
    claimed = 1
    m = re.search(r"evtask-[A-Za-z][A-Za-z0-9-]+", str(d.get("topic", "")))
    if m:
        task_id = m.group(0)
    return True
try:
    own = os.path.join(claims_dir, sid + ".json")
    matched = False
    if os.path.isfile(own):
        try:
            matched = take(json.load(open(own, encoding="utf-8")))
        except Exception:
            matched = False
    if not matched:
        for f in glob.glob(os.path.join(claims_dir, "*.json")):
            if os.path.normcase(f).endswith(os.sep + sid + ".json"):
                continue
            try:
                d = json.load(open(f, encoding="utf-8"))
            except Exception:
                continue
            if take(d):
                break
except Exception:
    pass

# ② 轨迹日志
try:
    with open(trail, "a", encoding="utf-8") as f:
        f.write(f"{ts} | {sid} | {tool} | {cwd} | {repo or '-'} | dirty={dirty} | task={task_id or '-'} | {note}\n")
except Exception:
    pass

# ③ 裸奔预警（脏改动 + 无认领）
if dirty and not claimed:
    try:
        with open(viol, "a", encoding="utf-8") as f:
            f.write(f"{ts} | {sid} | {tool} | {repo or cwd} | 有改动但无in_progress认领（Trae裸奔）\n")
        print("[ev-session-beat] ⚠️ 工作区有改动但无认领单，已记 violation：改完请 ev-claim.sh claim")
    except Exception:
        pass
PYEOF

exit 0