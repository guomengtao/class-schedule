#!/bin/bash
cd /Users/Banner/Documents/guomengtao/tom/class/class
python3 scripts/batch_convert_v2.py > /tmp/conv_output.txt 2>&1
cat /tmp/conv_output.txt