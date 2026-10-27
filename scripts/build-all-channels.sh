#!/bin/bash
set -e

PROJECT_DIR="/Users/Banner/Documents/guomengtao/ev/class-schedule"
VERSION_FILE="$PROJECT_DIR/src/data/version.js"
RELEASE_DIR="$PROJECT_DIR/release"

# 15 个渠道（2026-10-27 补 t-b11-r：Band 11 胶囊版资源 8046 一直在手工维护，
# 构建清单里漏了它，导致 8046 只能挂旧包 v1.5.49 而无法随 release 更新）
CHANNELS=(
  "t-9p-d"
  "t-9p-r"
  "t-9-d"
  "t-9-r"
  "t-10-d"
  "t-10-r"
  "t-b11-r"
  "t-10p-d"
  "t-10p-r"
  "t-s4-d"
  "t-b9-d"
  "t-w-d"
  "t-w-r"
  "q"
  "g"
)

cd "$PROJECT_DIR"

# ---- 版本号自动 +1（铁律 §3.2，2026-10-14 版本纠察员🚨 补；原全靠人工手改到 1.8.318）----
# 必须放在"读取当前版本号"之前：脚本末尾"恢复默认渠道"会把 VERSION_FILE 重写为
# $VERSION + 常量，若在读取后 bump，恢复逻辑会把你刚 +1 的版本号打回旧值（evbox 同款陷阱）。
# 顺带修掉原脚本两处硬编码 versionCode: 1080（一跑就被打回常量，与 versionName 脱节）。
# --no-bump 跳过
if [ "${1:-}" != "--no-bump" ]; then
  node -e "
const fs = require('fs');
const p = process.argv[1];
let s = fs.readFileSync(p, 'utf8');
const m = s.match(/versionName: \"(\d+)\.(\d+)\.(\d+)\"/);
if (m) {
  const nv = m[1] + '.' + m[2] + '.' + (parseInt(m[3]) + 1);
  const c = (s.match(/versionCode: (\d+)/) || [0, 0])[1];
  s = s.replace(/versionName: \"[^\"]+\"/, 'versionName: \"' + nv + '\"');
  s = s.replace(/versionCode: \d+/, 'versionCode: ' + (parseInt(c) + 1));
  fs.writeFileSync(p, s);
  console.log('  version → ' + nv + ' (versionCode ' + (parseInt(c) + 1) + ')');
}
" "$VERSION_FILE"
fi
VCODE_NOW=$(node -e "var v=require('$VERSION_FILE'); console.log(v.versionCode)")

# 读取当前版本号
VERSION=$(node -e "var v=require('$VERSION_FILE'); console.log(v.versionName)")

# 确保 release 目录存在
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

total=${#CHANNELS[@]}
count=0

for ch in "${CHANNELS[@]}"; do
  count=$((count + 1))
  echo ""
  echo "=========================================="
  echo "[$count/$total] Building channel: $ch (v$VERSION)"
  echo "=========================================="

  echo "module.exports = { versionName: \"$VERSION\", versionCode: $VCODE_NOW, channel: \"$ch\" }" > "$VERSION_FILE"

  NODE_OPTIONS= npx aiot release --enable-jsc

  # 重命名 RPK
  node scripts/rename-rpk.js

  # 复制到 release 目录
  cp dist/ev-v${VERSION}-${ch}.rpk "$RELEASE_DIR/"
  ls -lh "$RELEASE_DIR/ev-v${VERSION}-${ch}.rpk"

  # 清理临时目录
  mv build /tmp/ev_build_trash_$(date +%s) 2>/dev/null || true
  mv .temp_class-schedule /tmp/ev_temp_trash_$(date +%s) 2>/dev/null || true
  rm -rf dist

  echo "[$count/$total] Channel $ch done"
done

# 恢复默认渠道
echo "module.exports = { versionName: \"$VERSION\", versionCode: $VCODE_NOW, channel: \"t-9p-d\" }" > "$VERSION_FILE"

echo ""
echo "=========================================="
echo "  All ${total} channels built!"
echo "=========================================="
echo ""
ls -lh "$RELEASE_DIR/"
echo ""
echo "Total RPKs: $(ls "$RELEASE_DIR"/*.rpk 2>/dev/null | wc -l)"