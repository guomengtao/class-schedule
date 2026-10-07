#!/usr/bin/env bash
ADB="$HOME/.vela/sdk/tools/adb/mac/adb"
OUT="/Users/Banner/Documents/guomengtao/ev/class-schedule/scripts/_tmp_out.txt"
echo "== devices ==" > "$OUT"
"$ADB" devices >> "$OUT" 2>&1
echo "== qemu avd ==" >> "$OUT"
ps aux | grep qemu-system | grep -v grep >> "$OUT"
echo "== viewHost grpc/console ports ==" >> "$OUT"
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(8554|5554|5555|8555|8558|8559|1005)' >> "$OUT"
echo "== emulator avd names ==" >> "$OUT"
"$ADB" devices 2>/dev/null | awk '$2=="device"{print $1}' | grep '^emulator-' | while read s; do
  echo -n "$s -> " >> "$OUT"
  "$ADB" -s "$s" emu avd name 2>/dev/null | head -1 >> "$OUT"
done
echo "GENERATED_OK"