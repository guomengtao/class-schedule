#!/bin/bash
cd /Users/Banner/Documents/guomengtao/ev/class-schedule
unset TRAE_USER_CLOUDIDE_TOKEN_BLOB
lsof -ti:8900 | xargs kill -9 2>/dev/null
sleep 1
echo "=== CLEANING OLD BUILD ==="
rm -rf site/
echo "=== BUILDING ==="
mkdocs build --strict 2>&1 | tail -5
echo "=== EXIT CODE: $? ==="
echo "=== VERIFYING NEW PAGES ==="
ls -d site/page-doc-system-analysis 2>/dev/null && echo "OK: page-doc-system-analysis exists"
ls -d site/pages/core 2>/dev/null && echo "OK: pages/core exists"
echo "=== DONE ==="