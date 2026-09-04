#!/bin/bash

TARGET="src/pages/check-demo/check-demo.ux"
MARKER="var TEST_FORCE_PREMIUM = "

usage() {
  echo "用法:"
  echo "  ./scripts/switch-auth.sh standard         标准版（显示遮罩）"
  echo "  ./scripts/switch-auth.sh premium          高级版（隐藏遮罩，模拟已激活）"
  echo "  ./scripts/switch-auth.sh reset            恢复正常（根据实际激活状态）"
  echo ""
  echo "当前状态:"
  grep "$MARKER" "$TARGET" | head -1
}

case "${1:-}" in
  standard)
    sed -i '' "s/${MARKER}.*/${MARKER}false/" "$TARGET"
    echo "已切换为: 标准版（isPremiumUnlocked = false，遮罩显示）"
    ;;

  premium)
    sed -i '' "s/${MARKER}.*/${MARKER}true/" "$TARGET"
    echo "已切换为: 高级版（isPremiumUnlocked = true，遮罩隐藏）"
    ;;

  reset)
    sed -i '' "s/${MARKER}.*/${MARKER}null/" "$TARGET"
    echo "已重置: 恢复正常（根据实际激活状态）"
    ;;

  *)
    usage
    exit 1
    ;;
esac

echo ""
echo "修改后:"
grep "$MARKER" "$TARGET" | head -1