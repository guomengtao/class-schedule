#!/usr/bin/env bash
# trae-commit.sh —— Trae 独立提交包装（方案 A 落地）
#
# 目的：解决「Trae 提交被拖进 workbuddy 任务流程」。
#   workbuddy 体系：evtask- 单号、.claims/ 认领、ev-commit.sh 签名；
#   Trae 独立体系：evm- 单号、ev-mcp 认领、本包装签名。
#   关键机制：复用车 `~/.workbuddy/scripts/ev-commit.sh`，但经内建 `_forced` 分支
#   （ev-session-author.sh 2026-10-19 治本）注入 Trae 的 evm- 身份，
#   使 workbuddy 署名解析器原样输出 Trae 花名/会话 id，而非误认 workbuddy 会话。
#   本包装不产生任何 workbuddy 任务/认领副作用。
#
# 用法：
#   cd <repo> && git add <文件> && \
#     EV_SESSION_NAME="📅课表酱" EV_SESSION_SID="evm-xxx" EV_TASK_ID="evm-..." \
#     bash scripts/trae-commit.sh -F _commit_msg.txt; echo "RC=$?"
#
# 单号：消息文件含 `Ev-Task: evm-...` 行（见 docs/Trae独立提交流程-改造方案.md）。

set -euo pipefail

# ---- 必填身份：Trae 花名 + evm- 会话 id ----
: "${EV_SESSION_NAME:?需传 Trae 花名，如 EV_SESSION_NAME=\"📅课表酱\"}"
: "${EV_SESSION_SID:?需传 evm- 会话 id，如 EV_SESSION_SID=\"evm-trae-...\"}"

# 若给了 EV_TASK_ID，自动往提交里追加 Ev-Task trailer（与 ev-hooks 命名一致）
if [[ -n "${EV_TASK_ID:-}" ]]; then
  export EV_TASK_ID
fi

# ---- 走 workbuddy 透明签名包装，仅注入 Trae 身份 ----
# 注：ev-commit.sh 底层 exec git commit "$@" 透传 -F 等参数；
#     身份注入走 env，通过 ev-session-author.sh 的 _forced 分支短路输出 Trae 身份。
exec env \
  EV_SESSION_NAME="$EV_SESSION_NAME" \
  EV_SESSION_SID="$EV_SESSION_SID" \
  ~/.workbuddy/scripts/ev-commit.sh "$@"