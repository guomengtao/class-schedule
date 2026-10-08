#!/bin/bash
set -e

PROJECT_DIR="/Users/Banner/Documents/guomengtao/ev/class-schedule"
VERSION_FILE="$PROJECT_DIR/src/data/version.js"
RELEASE_DIR="$PROJECT_DIR/release"

# 14 个渠道
CHANNELS=(
  "t-9p-d"
  "t-9p-r"
  "t-9-d"
  "t-9-r"
  "t-10-d"
  "t-10-r"
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

  echo "module.exports = { versionName: \"$VERSION\", versionCode: 1080, channel: \"$ch\" }" > "$VERSION_FILE"

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
echo "module.exports = { versionName: \"$VERSION\", versionCode: 1080, channel: \"t-9p-d\" }" > "$VERSION_FILE"

echo ""
echo "=========================================="
echo "  All ${total} channels built!"
echo "=========================================="
echo ""
ls -lh "$RELEASE_DIR/"
echo ""
echo "Total RPKs: $(ls "$RELEASE_DIR"/*.rpk 2>/dev/null | wc -l)"