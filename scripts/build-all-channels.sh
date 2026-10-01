#!/bin/bash
set -e

PROJECT_DIR="/Users/Banner/Documents/guomengtao/tom/class/class"
VERSION_FILE="$PROJECT_DIR/src/data/version.js"
RELEASE_DIR="$PROJECT_DIR/release"

CHANNELS=("t-9p-d" "t-9p-r" "t-9-d" "t-9-r" "t-10-d" "t-10-r" "t-10p-d" "t-10p-r" "t-s4-d" "t-b9-d" "t-w-d" "t-w-r" "q" "g")

cd "$PROJECT_DIR"

total=${#CHANNELS[@]}
count=0

for ch in "${CHANNELS[@]}"; do
  count=$((count + 1))
  echo ""
  echo "=========================================="
  echo "[$count/$total] Building channel: $ch"
  echo "=========================================="

  echo "module.exports = { versionName: \"1.7.0\", versionCode: 1002, channel: \"$ch\" }" > "$VERSION_FILE"

  NODE_OPTIONS= npx aiot release --enable-jsc

  node scripts/rename-rpk.js

  cp dist/ev-v1.7.0-${ch}.rpk "$RELEASE_DIR/"
  echo "Copied ev-v1.7.0-${ch}.rpk to release/"

  mv build /tmp/ev_build_trash_$(date +%s) 2>/dev/null || true
  mv .temp_class /tmp/ev_temp_trash_$(date +%s) 2>/dev/null || true
  rm -rf dist

  echo "[$count/$total] Channel $ch done"
done

echo "module.exports = { versionName: \"1.7.0\", versionCode: 1002, channel: \"t-9p-d\" }" > "$VERSION_FILE"
echo ""
echo "All 14 channels built successfully!"
ls -lh "$RELEASE_DIR/"