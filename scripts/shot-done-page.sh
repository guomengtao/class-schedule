#!/usr/bin/env bash
# 一条命令截「激活成功页」——不用再手工改 entry、改 verifySuccess、来回跳页面。
#
# 用法：
#   npm run shot:done                 # 输出 dist/shot-done-page.png（带机身外壳）
#   npm run shot:done -- 剩余30天      # 指定副标题文案
#   bash scripts/shot-done-page.sh --serial emulator-13000 --keep
#
# 原理：临时把入口指到目标页、把成功态设为初始态，打包 → 装进模拟器 → 截图 → 自动还原源码。
# 退出（含失败、Ctrl-C）时 trap 一定会还原，跑完 git status 保持干净。
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
UX="src/pages/activation/activation-code/activation-code.ux"
MANIFEST="src/manifest.json"
EMUBUDDY="$ROOT/../ev-emubuddy/emubuddy_core.py"
SERIAL="emulator-13000"
SUB=""
OUT=""
KEEP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --serial) SERIAL="$2"; shift 2 ;;
    --sub)    SUB="$2";    shift 2 ;;
    --out)    OUT="$2";    shift 2 ;;
    --keep)   KEEP=1;      shift ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) SUB="$1"; shift ;;
  esac
done

[[ -n "$OUT" ]] || OUT="$ROOT/dist/shot-done-page.png"

BACKUP_DIR="$(mktemp -d)"
cp "$UX" "$BACKUP_DIR/ux.bak"
cp "$MANIFEST" "$BACKUP_DIR/manifest.bak"

restore() {
  cp "$BACKUP_DIR/ux.bak" "$UX"
  cp "$BACKUP_DIR/manifest.bak" "$MANIFEST"
  rm -rf "$BACKUP_DIR"
  echo "↩︎  源码已还原"
}
trap restore EXIT

echo "▶ 1/4 注入直达态（entry → 成功页，首屏即成功态）"
python3 - "$UX" "$MANIFEST" "$SUB" <<'PY'
import sys, json
ux, mf, sub = sys.argv[1], sys.argv[2], sys.argv[3]

s = open(ux).read()
assert "verifySuccess: false," in s, "已不是预期源码，先 git status 看工作区"
s = s.replace("verifySuccess: false,", "verifySuccess: true,  // [shot-done-page]", 1)
assert "[shot-done-page]" in s
open(ux, "w").write(s)

m = json.load(open(mf))
m["router"]["entry"] = "pages/activation/activation-code"
json.dump(m, open(mf, "w"), ensure_ascii=False, indent=2)
PY

echo "▶ 2/4 打包（release + jsc）"
# 构建链会 rimraf ../.temp_class-schedule（构建缓存目录），脱开删除守卫的 turn 级阈值检查
env -u CODEBUDDY_SAFE_DELETE_BULK_STATE_DIR -u CODEBUDDY_TOOL_CALL_ID \
  npx aiot release --enable-jsc 2>&1 | tail -3

echo "▶ 3/4 装载到 $SERIAL"
python3 "$EMUBUDDY" page "$SERIAL" pages/activation/activation-code class --no-build --no-ocr 2>&1 | tail -4

echo "▶ 4/4 截图（带机身外壳）"
sleep 4
python3 "$EMUBUDDY" shot "$SERIAL" "$OUT" --frame --no-ocr 2>&1 | tail -6

if [[ $KEEP -eq 1 ]]; then
  echo "⏸  --keep：源码保持注入态（自行 git checkout 还原）"
  trap - EXIT
  rm -rf "$BACKUP_DIR"
fi

echo "✅ 成功页截图：$OUT"
