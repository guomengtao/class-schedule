#!/bin/bash
set -e

# 从钥匙串获取 GitHub token
GITHUB_TOKEN=$(security find-internet-password -s github.com -w 2>/dev/null)
if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: 无法获取 GitHub token"
  exit 1
fi

REPO="guomengtao/class-schedule"
TAG="v1.8.0"

# 获取 v1.8.0 对应 commit 的简短日志作为 release body
COMMIT_SHA=$(git rev-parse HEAD)
BODY=$(git log --oneline -10 --no-merges)

echo "=== 创建 Git Tag ${TAG} ==="
git tag -a "${TAG}" -m "Release ${TAG}"
git push origin "${TAG}"

echo "=== 创建 GitHub Release ==="
RESP=$(curl -s -X POST \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/${REPO}/releases" \
  -d @- <<EOF
{
  "tag_name": "${TAG}",
  "name": "${TAG}",
  "body": "## 更新内容\n\n\`\`\`\n${BODY}\n\`\`\`",
  "draft": false,
  "prerelease": false
}
EOF
)

echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Release URL:', d.get('html_url','ERROR: '+d.get('message','unknown')))"