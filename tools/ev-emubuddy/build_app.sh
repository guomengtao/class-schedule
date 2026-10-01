#!/bin/bash
# 构建「自包含 venv」版 EvEmuBuddy.app（macOS bundle，照抄 EvNotifier 打包范式）
#
# 用法：
#   ./build_app.sh              → 构建到 tools/ev-emubuddy/EvEmuBuddy.app
#   ./build_app.sh --install    → 构建后安装到 /Applications/EvEmuBuddy.app
#   ./build_app.sh --sync       → 日常最快路径：只把源码推进已装 bundle 并重启客户端（秒级）
#
# ⚠️ 禁止 rm -rf：清旧产物一律 mv 到 /tmp/trash/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="EvEmuBuddy"
APP_DIR="$SCRIPT_DIR/$APP_NAME.app"
CONTENTS="$APP_DIR/Contents"
MACOS="$CONTENTS/MacOS"
RES="$CONTENTS/Resources"
VENV="$RES/venv"
DEST="/Applications/$APP_NAME.app"
SOURCE_FILES=(emu_buddy.py emubuddy_core.py version.json)

# ---- 快路径：日常改代码用 ----
if [ "$1" = "--sync" ]; then
  if [ ! -d "$DEST" ]; then
    echo "❌ 还没安装：$DEST（先跑 ./build_app.sh --install）" >&2
    exit 1
  fi
  DRES="$DEST/Contents/Resources"
  for f in "${SOURCE_FILES[@]}"; do cp "$SCRIPT_DIR/$f" "$DRES/$f"; done
  echo "  源码已同步进 bundle"
  # 版本号同步进 Info.plist（否则 --sync 后 About/Finder 里还是旧版本），并重签
  VER_NOW=$(/usr/bin/python3 -c "import json;print(json.load(open('$SCRIPT_DIR/version.json'))['version'])")
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VER_NOW" \
                           -c "Set :CFBundleShortVersionString $VER_NOW" \
                           "$DEST/Contents/Info.plist" 2>/dev/null \
    && echo "  Info.plist 版本 → $VER_NOW"
  codesign --force --deep --sign - "$DEST" 2>/dev/null || true
  pkill -f "EvEmuBuddy.app/Contents/Resources/emu_buddy.py" 2>/dev/null || true
  sleep 1
  open -a "$DEST" && echo "  ✅ 已重启 $DEST"
  exit 0
fi

# 基础解释器：优先 Homebrew Python 3.14（与 EvNotifier 同版本），缺失则退回
BASE_PY=""
for cand in /opt/homebrew/opt/python@3.14/bin/python3.14 /opt/homebrew/bin/python3 /usr/bin/python3; do
  [ -x "$cand" ] && BASE_PY="$cand" && break
done
[ -z "$BASE_PY" ] && { echo "❌ 找不到可用的 python3" >&2; exit 1; }

VER=$("$BASE_PY" -c "import json;print(json.load(open('$SCRIPT_DIR/version.json'))['version'])")
echo "▶ EvEmuBuddy $VER（base python: $BASE_PY）"

# ---- 1. bundle 骨架（旧 venv 先暂存复用，避免每次重装依赖）----
mkdir -p /tmp/trash 2>/dev/null || true
VENV_CACHE=/tmp/evemubuddy-venv-cache
if [ -d "$APP_DIR" ]; then
  if [ -x "$APP_DIR/Contents/Resources/venv/bin/python" ]; then
    [ -d "$VENV_CACHE" ] && mv "$VENV_CACHE" "/tmp/trash/evemubuddy-venv-cache.$(date +%s)"
    mv "$APP_DIR/Contents/Resources/venv" "$VENV_CACHE"
  fi
  mv "$APP_DIR" "/tmp/trash/EvEmuBuddy.app.$(date +%s)"
fi
mkdir -p "$MACOS" "$RES"
if [ -d "$VENV_CACHE" ] && [ ! -d "$VENV" ]; then mv "$VENV_CACHE" "$VENV"; fi

# ---- 2. bundle 自带 venv ----
if [ ! -x "$VENV/bin/python" ]; then
  echo "▶ 创建 venv ..."
  "$BASE_PY" -m venv "$VENV"
fi
PY="$VENV/bin/python"
"$PY" -m pip install -q -U pip wheel
echo "▶ 安装依赖 ..."
"$PY" -m pip install -q -r "$SCRIPT_DIR/requirements.txt"

# ---- 3. 源码与资源 ----
for f in "${SOURCE_FILES[@]}"; do cp "$SCRIPT_DIR/$f" "$RES/$f"; done
[ -f "$SCRIPT_DIR/README.md" ] && cp "$SCRIPT_DIR/README.md" "$RES/README.md"

# ---- 4. 启动器 ----
# ⚠️⚠️ 两条血泪教训，改动前务必读完：
#  1) **不能 exec**。exec 会让 python 继承 LaunchServices 的 app 上下文，
#     NSStatusItem 会退化成 winFrame=(0,0,w,0) —— 菜单栏上什么都看不到（实测 open -a / 双击 / rumps 全部中招）。
#     必须 nohup 到后台再 exit，让 python 被 launchd 直接收养。
#  2) **必须 unset __CFBundleIdentifier**。LaunchServices 会把它设成 com.ev.emubuddy，
#     而进程真正的 NSBundle 是 Python.app，身份错位同样导致状态项挂不上。
cat > "$MACOS/$APP_NAME" << 'EOF'
#!/bin/sh
# EvEmuBuddy 启动器：fork 到后台后立即退出（切勿改成 exec，原因见 build_app.sh 注释）
unset __CFBundleIdentifier
DIR="$(cd "$(dirname "$0")/.." && pwd)"
RES="$DIR/Resources"
nohup "$RES/venv/bin/python" -u "$RES/emu_buddy.py" >> "$HOME/.ev_emubuddy_launcher.log" 2>&1 &
exit 0
EOF
chmod +x "$MACOS/$APP_NAME"

# ---- 5. Info.plist ----
cat > "$CONTENTS/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundleDisplayName</key>
  <string>Ev 模拟器保姆</string>
  <key>CFBundleIdentifier</key>
  <string>com.ev.emubuddy</string>
  <key>CFBundleVersion</key>
  <string>$VER</string>
  <key>CFBundleShortVersionString</key>
  <string>$VER</string>
  <key>CFBundleExecutable</key>
  <string>$APP_NAME</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSUIElement</key>
  <true/>
</dict>
</plist>
PLIST

# ---- 6. ad-hoc 签名 ----
codesign --force --deep --sign - "$APP_DIR" 2>/dev/null || echo "  ⚠️ 签名失败（不影响本机运行）"

echo "✅ 构建完成: $APP_DIR （$(du -sh "$APP_DIR" | awk '{print $1}')）"

# ---- 7. 可选安装 ----
if [ "$1" = "--install" ]; then
  [ -d "$DEST" ] && mv "$DEST" "/tmp/trash/EvEmuBuddy.app.install.$(date +%s)"
  cp -R "$APP_DIR" "$DEST"
  xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true
  codesign --force --deep --sign - "$DEST" 2>/dev/null || true
  touch "$DEST"
  echo "✅ 已安装: $DEST"
fi
