#!/usr/bin/env python3
# pre-commit-trae-gate-patch.py —— 方案 B：给全局 pre-commit 门禁加「Trae（evm-）通道」
#
# 作用：就地改造 `tools/hooks/pre-commit` 真源（以及 `~/.githooks/pre-commit` 分发副本），
#       使全局开工登记门禁在 Trae 会话（EV_TRAE_SESSION=1 且带 evm- 单号）下按 Trae 体系放行，
#       而 workbuddy（evtask-）路径不受影响。
#
# 用法（由维护方在真源所在环境执行，本脚本需能写到目标文件）：
#   python3 pre-commit-trae-gate-patch.py apply    # 改真源 + 分发副本
#   python3 pre-commit-trae-gate-patch.py rollback # 用 .bak 还原
#   python3 pre-commit-trae-gate-patch.py show     # 仅打印将应用的 diff，不改文件
#
# 安全：不改动 workbuddy 既有逻辑（evtask- / .claims / QUICK / 黑名单全保留），
#       仅①ID_RE 从只认 evtask- 扩展为同时认 evm-；②新增一条 Trae 独立判定前置分支。
import os, re, sys, shutil, difflib

GITHOOKS_TARGETS = [
    os.path.expanduser("~/Documents/guomengtao/tools/hooks/pre-commit"),  # 真源
    os.path.expanduser("~/.githooks/pre-commit"),                       # 分发副本
]

# 改动 1：ID_RE 从「只认 evtask-」扩展为「evtask- ∪ evm-」
OLD_ID_RE = 'ID_RE = re.compile(r"evtask-[A-Za-z]-")'
NEW_ID_RE = 'ID_RE = re.compile(r"(?:evtask-[A-Za-z]-|evm-[A-Za-z0-9]+-[A-Za-z0-9-]+)")'

# 改动 2 阳台（插入在 json_ok 初始化后、认领 JSON 扫描前）
BLOCK_ANCHOR = 'json_ok, json_noid = set(), set()'

def build_trae_block():
    return (
        "# Trae 独立通道（方案 B）：会话侧注入 EV_TRAE_SESSION=1 且 EV_MCP_TASK_ID 含 evm- 经此短路放行。\n"
        "#   workbuddy 原路径（evtask-/.claims/QUICK/黑名单）不受影响。\n"
        "trae_sid = os.environ.get('EV_MCP_TASK_ID') or ''\n"
        "trae_on  = os.environ.get('EV_TRAE_SESSION') == '1' and bool(re.search(r'evm-', trae_sid))\n"
        "if trae_on:\n"
        "    for p in files:\n"
        "        json_ok.add(p)\n"
        "    print('OK:Trae 通道放行（EV_MCP_TASK_ID=' + trae_sid + '）')\n"
        "    sys.exit(0)\n"
        "\n"
    )

def patch_one(path, dry):
    if not os.path.isfile(path):
        print(f"  [skip] 不存在: {path}")
        return 0
    s = open(path, encoding="utf-8").read()
    orig = s

    # 改动 1
    if OLD_ID_RE in s:
        s = s.replace(OLD_ID_RE, NEW_ID_RE, 1)
    elif NEW_ID_RE not in s:
        print(f"  [warn] {path}: 未找到 ID_RE 精确串，且当前无 evm- 扩展，需人工核对")

    # 改动 2
    if BLOCK_ANCHOR in s and "Trae 独立通道（方案 B）" not in s:
        block = build_trae_block()
        # 插到 anchors 行的下一行（行内 tab 缩进后）
        idx = s.find(BLOCK_ANCHOR) + len(BLOCK_ANCHOR)
        # 移到该行行尾（整行替换，保留原行）——直接在该行后插入
        nl = s.find("\n", idx)
        if nl != -1:
            s = s[: nl + 1] + block + s[nl + 1:]
    else:
        print(f"  [warn] {path}: 未找到插入锚点或已打过补丁，跳过改动 2")

    if s == orig:
        print(f"  [noop] {path}: 无需改动")
        return 0
    if dry:
        diff = "".join(difflib.unified_diff(orig.splitlines(True), s.splitlines(True),
                                            fromfile=path, tofile=path + " (new)"))
        print(diff)
        return 1
    shutil.copy2(path, path + ".trae-gate.bak")
    open(path, "w", encoding="utf-8").write(s)
    print(f"  [patched] {path}  (备份: {path}.trae-gate.bak)")
    return 1

def rollback(path):
    bak = path + ".trae-gate.bak"
    if os.path.isfile(bak):
        shutil.copy2(bak, path)
        print(f"  [rolled] {path}")
    else:
        print(f"  [skip] 无备份: {path}")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "apply"
    if cmd == "show":
        for t in GITHOOKS_TARGETS:
            patch_one(t, dry=True)
    elif cmd == "apply":
        for t in GITHOOKS_TARGETS:
            patch_one(t, dry=False)
        print("完成。可运行 `python3 pre-commit-trae-gate-patch.py show` 复检。")
    elif cmd == "rollback":
        for t in GITHOOKS_TARGETS:
            rollback(t)
    else:
        print("用法: apply | rollback | show")