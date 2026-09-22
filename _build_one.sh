#!/bin/bash
CH="$1"
VERSION="1.6.57"
ROOT="/Users/Banner/Documents/guomengtao/tom/class/class"
cd "$ROOT"
rm -rf .temp_class 2>/dev/null
sleep 2
sed -i '' "s/channel: \".*\"/channel: \"$CH\"/" src/data/version.js
npx aiot release --enable-jsc > /dev/null 2>&1
RPK_SRC="dist/com.application.watch.classschedule.release.$VERSION.rpk"
if [ -f "$RPK_SRC" ]; then
  cp "$RPK_SRC" "release/ev-v${VERSION}-${CH}.rpk"
  echo "OK $CH $(ls -lh release/ev-v${VERSION}-${CH}.rpk | awk '{print $5}')"
else
  echo "FAIL $CH"
fi