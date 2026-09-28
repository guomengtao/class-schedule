#!/bin/bash
NAME=$1; PORT=${2:-8554}
[ -z "$NAME" ] && echo "Usage: ./scripts/ui-diff.sh <name> [port]" && exit 1
echo "--- Step 1: before ---"
node scripts/emulator-eye.js shot "$PORT" "before-$NAME"
open screenshots/before-"$NAME".png
read -p "Press Enter to start editing..." _
echo "--- Step 3: after ---"
node scripts/emulator-eye.js shot "$PORT" "after-$NAME"
open screenshots/after-"$NAME".png
echo "Check: symmetry|font|safearea|tap|geometry|scroll|data"