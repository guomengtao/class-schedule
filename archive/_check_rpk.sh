#!/bin/bash
RPK="/Users/Banner/Documents/guomengtao/tom/class/class/dist/com.application.watch.classschedule.release.1.5.33.rpk"
echo "=== RPK ==="
ls -lh "$RPK"
SIZE=$(stat -f%z "$RPK")
echo "Bytes: $SIZE"
MAX=1048576
if [ "$SIZE" -gt "$MAX" ]; then
  echo "EXCEEDS 1MB!"
else
  echo "Under 1MB OK"
fi
echo ""
echo "=== Extract Check ==="
rm -rf /tmp/rpk_check
mkdir -p /tmp/rpk_check
unzip -o "$RPK" -d /tmp/rpk_check > /dev/null 2>&1
EXTRACTED=$(du -sk /tmp/rpk_check | cut -f1)
echo "Extracted KB: $EXTRACTED"
MAX_EXT=2048
if [ "$EXTRACTED" -gt "$MAX_EXT" ]; then
  echo "EXCEEDS 2MB!"
else
  echo "Under 2MB OK"
fi