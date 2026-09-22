#!/bin/bash
VERSION="1.6.57"
ROOT="/Users/Banner/Documents/guomengtao/tom/class/class"
cd "$ROOT"

rm -rf release "$ROOT/.temp_class"
mkdir -p release

CHANNELS=("t-9p-d" "t-9p-r" "t-9-d" "t-9-r" "t-10-d")
TOTAL=${#CHANNELS[@]}
OK=0
FAIL=0

echo "Building $TOTAL channels (v$VERSION) batch1..."
echo ""

for CH in "${CHANNELS[@]}"; do
  echo "[$((OK+FAIL+1))/$TOTAL] $CH ..."
  rm -rf "$ROOT/.temp_class" 2>/dev/null
  sleep 2
  
  sed -i '' "s/channel: \".*\"/channel: \"$CH\"/" "$ROOT/src/data/version.js"
  npx aiot release --enable-jsc > /tmp/build_$CH.log 2>&1
  
  RPK="$ROOT/dist/com.application.watch.classschedule.release.$VERSION.rpk"
  if [ -f "$RPK" ]; then
    cp "$RPK" "release/ev-v${VERSION}-${CH}.rpk"
    SZ=$(ls -lh "release/ev-v${VERSION}-${CH}.rpk" | awk '{print $5}')
    echo "  OK $CH $SZ"
    OK=$((OK+1))
  else
    echo "  FAIL $CH"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "Batch1 done: $OK ok, $FAIL fail"
ls -lh release/