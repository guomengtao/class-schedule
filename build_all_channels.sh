#!/bin/bash
# 批量构建所有渠道包
# 逐个构建，每次清理临时目录

ROOT="/Users/Banner/Documents/guomengtao/tom/class/class"
TEMP="/Users/Banner/Documents/guomengtao/tom/class/.temp_class"
RELEASE="$ROOT/release"

# 所有渠道列表（共 14 个）
# t-9p-d  = 米坛·手环9 Pro·讨论帖
# t-9p-r  = 米坛·手环9 Pro·资源页
# t-9-d   = 米坛·手环9·讨论帖
# t-9-r   = 米坛·手环9·资源页
# t-10-d  = 米坛·手环10·讨论帖
# t-10-r  = 米坛·手环10·资源页
# t-10p-d = 米坛·手环10 Pro·讨论帖
# t-10p-r = 米坛·手环10 Pro·资源页
# t-s4-d  = 米坛·S4·讨论帖
# t-b9-d  = 米坛·Band9·讨论帖
# t-w-d   = 米坛·圆形屏·讨论帖
# t-w-r   = 米坛·圆形屏·资源页
# q       = 轻腕社区
# g       = GitHub
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

echo "=========================================="
echo "  批量构建 ${#CHANNELS[@]} 个渠道包"
echo "=========================================="

# 备份原始 version.js
cd "$ROOT"

# 确保 release 目录存在且为空
rm -rf "$RELEASE"
mkdir -p "$RELEASE"

ORIGINAL=$(cat src/data/version.js)
VERSION=$(node -e "console.log(require('$ROOT/src/data/version.js').versionName)")

for CHANNEL in "${CHANNELS[@]}"; do
  echo ""
  echo "=== Building channel: $CHANNEL (v$VERSION) ==="

  # 清理临时目录 (双重保险)
  rm -rf "$TEMP" 2>/dev/null || true
  sleep 2
  rm -rf "$TEMP" 2>/dev/null || true

  # 注入渠道参数 (sed -i 直接修改文件，避免重定向截断风险)
  sed -i '' "s/channel: \".*\"/channel: \"$CHANNEL\"/" src/data/version.js
  echo "Channel injected: $CHANNEL"

  # 构建
  npx aiot release --enable-jsc

  # 复制到 release 目录（不受下次构建清理影响）
  RPK_SRC="$ROOT/dist/com.application.watch.classschedule.release.$VERSION.rpk"
  if [ -f "$RPK_SRC" ]; then
    RPK_DST="$RELEASE/ev-v${VERSION}-${CHANNEL}.rpk"
    cp "$RPK_SRC" "$RPK_DST"
    echo "Created: $RPK_DST"
    ls -lh "$RPK_DST"
  else
    echo "ERROR: RPK not found: $RPK_SRC"
  fi

  echo "=== Done: $CHANNEL ==="
done

# 恢复原始 version.js
echo "$ORIGINAL" > src/data/version.js

echo ""
echo "=========================================="
echo "  全部构建完成！"
echo "=========================================="
ls -lh "$RELEASE"/ev-*.rpk