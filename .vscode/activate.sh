#!/bin/bash
# ============================================================
# class-schedule 项目专属终端环境激活脚本
# 由 .vscode/settings.json 中的 terminal.integrated.profiles 调用
# 每次打开新终端时自动执行
# ============================================================

# 1. 重置 PATH，从零构建隔离环境
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# 2. 加载 nvm 并切换到项目指定 Node.js 版本
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  \. "$NVM_DIR/nvm.sh"
  if [ -f ".nvmrc" ]; then
    nvm use 2>/dev/null || nvm install
  fi
fi

# 3. 确保 aiot-toolkit 全局可用（本项目核心构建工具链）
#    如果 nvm 路径下没有，从 node_modules/.bin 补入 PATH
if command -v aiot &>/dev/null; then
  :
else
  export PATH="$PWD/node_modules/.bin:$PATH"
fi

# 4. 项目专属环境变量
export NODE_ENV="development"
export PROJECT_ID="class-schedule"