#!/bin/bash
# Check emulator status
echo "=== ADB Devices ==="
adb devices 2>&1

echo ""
echo "=== VAPP Process ==="
adb -s emulator-5554 shell "ps | grep -E 'vapp|classschedule'" 2>&1

echo ""
echo "=== Port 10055 ==="
lsof -iTCP:10055 2>&1 | head -5

echo ""
echo "=== App Directory ==="
adb -s emulator-5554 shell "ls -la /data/quickapp/app/com.application.watch.classschedule/ 2>&1" | head -10

echo ""
echo "=== Done ==="