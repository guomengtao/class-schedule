#!/bin/bash
cd /Users/Banner/Documents/guomengtao/tom/class/class
RPK="dist/com.application.watch.classschedule.release.1.5.33.rpk"

echo "=== RPK ===" > /tmp/rpk_result.txt
ls -lh "$RPK" >> /tmp/rpk_result.txt
SIZE=$(stat -f%z "$RPK")
echo "Bytes: $SIZE" >> /tmp/rpk_result.txt
MAX=1048576
if [ "$SIZE" -gt "$MAX" ]; then
  echo "EXCEEDS 1MB ($MAX limit)" >> /tmp/rpk_result.txt
else
  echo "OK: Under 1MB" >> /tmp/rpk_result.txt
fi

echo "" >> /tmp/rpk_result.txt
echo "=== Extract Check ===" >> /tmp/rpk_result.txt
rm -rf /tmp/rpk_check
mkdir -p /tmp/rpk_check
unzip -o "$RPK" -d /tmp/rpk_check > /dev/null 2>&1
EXTRACTED=$(du -sk /tmp/rpk_check | cut -f1)
echo "Extracted KB: $EXTRACTED" >> /tmp/rpk_result.txt
MAX_EXT=2048
if [ "$EXTRACTED" -gt "$MAX_EXT" ]; then
  echo "EXCEEDS 2MB ($MAX_EXT KB limit)" >> /tmp/rpk_result.txt
else
  echo "OK: Under 2MB" >> /tmp/rpk_result.txt
fi

echo "DONE" >> /tmp/rpk_result.txt