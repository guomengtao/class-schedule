#!/bin/bash
# ============================================================
# Git Release Script for Class Schedule Watch App
# 版本发布脚本 - 提交代码并发布到 GitHub
# ============================================================

set -e

cd "$(dirname "$0")"

VERSION="v1.2.41"
REMOTE="origin"
BRANCH="main"

echo "============================================"
echo "  课程表 - Release $VERSION"
echo "============================================"
echo ""

# 1. 显示当前 git 状态
echo "[1/5] 检查 git 状态..."
git status
echo ""

# 2. 显示变更摘要
echo "[2/5] 变更文件列表:"
git diff --stat HEAD
echo ""

# 3. 确认操作
echo "============================================"
read -p "确认提交并推送? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "已取消。"
    exit 0
fi
echo ""

# 4. 暂存所有变更并提交
echo "[3/5] 暂存并提交..."
git add -A
git commit -m "Release $VERSION: 课程编辑中文输入、课程管理、课程表管理、恢复默认数据

新增功能:
- 课程编辑页面中文输入法集成
- 课程预设管理(添加/编辑/删除)
- 多课程表管理(切换/删除/复制)
- 恢复默认数据(12门课程+2张课程表)

优化改进:
- 首页时钟居中防抖
- 走马灯状态提醒
- 课程总览今日标记(圆形今字)
- 添加课程时间界面优化
- 删除按钮PNG图标替换
- 警告图标CSS三角形

Bug修复:
- 修复布局和闪屏问题
- 移除首页滑动删除
- 课程总览内容显示修复

技术改进:
- SQLite + Storage 双存储后端
- 版本号自动递增
- Logo更新"

echo ""

# 5. 创建标签并推送
echo "[4/5] 创建标签 $VERSION..."
git tag -a "$VERSION" -m "Release $VERSION: 课程表手表应用"
echo ""

echo "[5/5] 推送到 GitHub..."
git push "$REMOTE" "$BRANCH"
git push "$REMOTE" "$VERSION"
echo ""

echo "============================================"
echo "  Release $VERSION completed!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Go to GitHub Releases page"
echo "  2. Create a new release from tag $VERSION"
echo "  3. Or run: gh release create $VERSION --title '$VERSION' --notes-file RELEASE_NOTES.md"
echo ""