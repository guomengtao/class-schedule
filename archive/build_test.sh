#!/bin/bash
cd /Users/Banner/Documents/guomengtao/tom/class/class
rm -rf build dist
node scripts/build.js > /tmp/build_output.txt 2>&1
echo "EXITCODE=$?" >> /tmp/build_output.txt