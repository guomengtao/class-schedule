#!/bin/bash
VERSION="1.6.57"
ROOT="/Users/Banner/Documents/guomengtao/tom/class/class"
cd "$ROOT"

rm -rf .release_tmp
mkdir -p release

CHANNELS=("t-10p-d" "t-10p-r" "t-s4-d" "t-b9-d" "t-w-d" "t-w-r" "q")
TOTAL=${#CHANNELS[@]}
OK=0
FAIL=0
LOG="/tmp/batch_build.log"

echo "=== Build $TOTAL channels v$VERSION ===" > "$LOG"

for CH in "${CHANNELS[@]}"; do
  N=$((OK+FAIL+1))
  echo "[$N/$TOTAL] $CH ..." | tee -a "$LOG"
  
  rm -rf "$ROOT/.temp_class" 2>/dev/null
  sleep 2
  
  sed -i '' "s/channel: \".*\"/channel: \"$CH\"/" "$ROOT/src/data/version.js"
  npx aiot release --enable-jsc >> "$LOG" 2>&1
  
  RPK="$ROOT/dist/com.application.watch.classschedule.release.$VERSION.rpk"
  if [ -f "$RPK" ]; then
    cp "$RPK" "release/ev-v${VERSION}-${CH}.rpk"
    SZ=$(ls -lh "release/ev-v${VERSION}-${CH}.rpk" | awk '{print $5}')
    echo "  OK $CH $SZ" | tee -a "$LOG"
    OK=$((OK+1))
  else
    echo "  FAIL $CH (no rpk)" | tee -a "$LOG"
    FAIL=$((FAIL+1))
  fi
done

echo "Done: $OK ok, $FAIL fail" | tee -a "$LOG"
ls -lh release/