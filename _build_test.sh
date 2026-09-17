#!/bin/bash
cd /Users/Banner/Documents/guomengtao/tom/class/class

# Clean old build
rm -rf build dist .temp_class 2>/dev/null

# Check JSC binary
echo "=== Checking JSC binary ==="
file node_modules/@aiot-toolkit/jsc/lib/jsc/darwin_aiotjsc

# Test JSC works
echo "=== Testing JSC ==="
arch -x86_64 node_modules/@aiot-toolkit/jsc/lib/jsc/darwin_aiotjsc --help 2>&1 | head -5

# Run release build
echo "=== Running npm run release ==="
npm run release 2>&1

echo "=== Build complete ==="
echo "=== Checking dist ==="
ls -la dist/ 2>/dev/null || echo "dist/ not found"
echo "=== Checking for RPK ==="
find . -name "*.rpk" -type f 2>/dev/null