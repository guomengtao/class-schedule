#!/bin/bash
cd /Users/Banner/Documents/guomengtao/tom/class/class
export -n $(env | grep -E '^(SU_|BLOB)' | sed 's/=.*//' | head -20) 2>/dev/null || true
npx aiot release --enable-jsc > /tmp/release_output.txt 2>&1
echo "EXIT_CODE=$?" >> /tmp/release_output.txt
ls -la dist/ >> /tmp/release_output.txt 2>&1
echo "DONE"