#!/bin/bash
exec 1>/Users/Banner/Documents/guomengtao/tom/class/class/.bb_out.txt 2>&1
cd /Users/Banner/Documents/guomengtao/tom/class/class
rm -rf build dist
node scripts/build.js
echo "DONE_EXIT=$?"