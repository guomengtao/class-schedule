#!/bin/bash
ROOT="/Users/Banner/Documents/guomengtao/tom/class/class"
TEMP="$ROOT/.temp_class"
RELEASE="$ROOT/release"

CHANNELS=(
  "t-9p-d"  "t-9p-r"  "t-9-d"   "t-9-r"
  "t-10-d"  "t-10-r"  "t-10p-d" "t-10p-r"
  "t-s4-d"  "t-b9-d"  "t-w-d"   "t-w-r"
  "q"       "g"
)

VERSION=$(node -e "console.log(require('$ROOT/src/data/version.js').versionName)")
ORIGINAL=$(cat "$ROOT/src/data/version.js")
mkdir -p "$RELEASE"

echo "=========================================="
echo "  Building ${#CHANNELS[@]} channels (v$VERSION)"
echo "=========================================="

BUILT=0
FAILED=0

for CHANNEL in "${CHANNELS[@]}"; do
  echo ""
  echo "=== [$((BUILT+FAILED+1))/${#CHANNELS[@]}] $CHANNEL ==="

  # Clean temp
  rm -rf "$TEMP" 2>/dev/null
  rm -rf "$ROOT/build" "$ROOT/dist" 2>/dev/null

  # Inject channel
  echo "$ORIGINAL" | sed "s/channel: \".*\"/channel: \"$CHANNEL\"/" > "$ROOT/src/data/version.js"

  # Build
  if npx aiot release --enable-jsc > /dev/null 2>&1; then
    RPK_SRC="$ROOT/dist/com.application.watch.classschedule.release.$VERSION.rpk"
    if [ -f "$RPK_SRC" ]; then
      RPK_DST="$RELEASE/ev-v${VERSION}-${CHANNEL}.rpk"
      cp "$RPK_SRC" "$RPK_DST"
      echo "  OK: $RPK_DST ($(stat -f%z "$RPK_DST" 2>/dev/null) bytes)"
      BUILT=$((BUILT+1))
    else
      echo "  FAIL: RPK not found"
      FAILED=$((FAILED+1))
    fi
  else
    echo "  FAIL: build error"
    FAILED=$((FAILED+1))
  fi
done

# Restore original
echo "$ORIGINAL" > "$ROOT/src/data/version.js"
rm -rf "$TEMP" "$ROOT/build" "$ROOT/dist" 2>/dev/null

echo ""
echo "=========================================="
echo "  Done: $BUILT built, $FAILED failed"
echo "=========================================="
ls -lhS "$RELEASE"/ev-*.rpk 2>/dev/null