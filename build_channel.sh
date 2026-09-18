#!/bin/bash
# 渠道构建脚本
# 用法: bash build_channel.sh <渠道码>-<型号短码>[-<类型>]
# 示例: bash build_channel.sh t-9p-d

set -e

ROOT="/Users/Banner/Documents/guomengtao/tom/class/class"

if [ -z "$1" ]; then
  CHANNEL="t-9p-d"
  echo "No channel specified, using default: $CHANNEL"
else
  CHANNEL="$1"
fi
VERSION=$(node -e "console.log(require('$ROOT/src/data/version.js').versionName)")

echo "=== Building channel: $CHANNEL (v$VERSION) ==="

cd "$ROOT"

ORIGINAL=$(cat src/data/version.js)

echo "$ORIGINAL" | sed "s/channel: \".*\"/channel: \"$CHANNEL\"/" > src/data/version.js

echo "Channel injected: $CHANNEL"

npx aiot release --enable-jsc

echo "$ORIGINAL" > src/data/version.js

RPK_SRC=$(ls -t dist/*.rpk 2>/dev/null | head -1)
if [ -z "$RPK_SRC" ]; then
  echo "ERROR: RPK not found"
  exit 1
fi

RPK_DST="dist/ev-v${VERSION}-${CHANNEL}.rpk"
cp "$RPK_SRC" "$RPK_DST"

echo "=== Done: $RPK_DST ==="
ls -lh "$RPK_DST"