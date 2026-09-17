#!/bin/bash
file /Users/Banner/Documents/guomengtao/tom/class/class/node_modules/@aiot-toolkit/jsc/lib/jsc/darwin_aiotjsc
ls /Users/Banner/Documents/guomengtao/tom/class/class/node_modules/@aiot-toolkit/jsc/lib/jsc/
echo "---ARCH---"
uname -m
echo "---ROSETTA---"
arch -x86_64 /usr/bin/true 2>&1 && echo "Rosetta OK" || echo "NO Rosetta"