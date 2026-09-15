#!/bin/bash
cd /Users/Banner/Documents/guomengtao/tom/class/class
npx aiot release --enable-jsc > /tmp/build_log.txt 2>&1
echo "BUILD_EXIT=$?" >> /tmp/build_log.txt
echo "=== DIST FILES ===" >> /tmp/build_log.txt
ls -la dist/*.rpk 2>/dev/null >> /tmp/build_log.txt
echo "=== DIST SIZES ===" >> /tmp/build_log.txt
for f in dist/*.rpk; do
  echo "$f: $(stat -f%z "$f") bytes" >> /tmp/build_log.txt
done
echo "ALLDONE" >> /tmp/build_log.txt