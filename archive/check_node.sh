#!/bin/bash
echo "=== Node version ===" > /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt
node -v >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt 2>&1
echo "=== Node path ===" >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt
which node >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt 2>&1
echo "=== NPM version ===" >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt
npm -v >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt 2>&1
echo "=== Brew ===" >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt
brew --version >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt 2>&1
echo "=== Done ===" >> /Users/Banner/Documents/guomengtao/tom/class/class/node_result.txt