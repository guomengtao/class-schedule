#!/bin/sh
# 每次对话结束的提醒：mac 系统通知 + 语音播报（Edge TTS 晓晓，失败自动回退 say -v Tingting）
#
# 用法:
#   scripts/notify.sh "标题" "通知正文" ["语音文本（可选，默认用正文）"]
#
# 说明:
#   - Edge TTS 需要网络（走微软朗读服务），已装 edge-tts（/opt/homebrew/bin/edge-tts）
#   - 生成 mp3 后用 afplay 播放；任一环节失败即回退到本地 say -v Tingting
#   - 用 `;` 而非 `&&` 串联，保证通知与语音互不阻塞

TITLE="${1:-Ev课程表}"
BODY="${2:-已完成}"
SPEECH="${3:-$BODY}"

# 1) 系统通知（失败也不影响语音）
osascript -e "display notification \"$BODY\" with title \"$TITLE\"" >/dev/null 2>&1

# 2) 语音：优先 Edge TTS（晓晓）
VOICE="${EDGE_TTS_VOICE:-zh-CN-XiaoxiaoNeural}"
if command -v edge-tts >/dev/null 2>&1 && command -v afplay >/dev/null 2>&1; then
  TMP="$(mktemp -t ev_notify_tts).mp3"
  if edge-tts --voice "$VOICE" --text "$SPEECH" --write-media "$TMP" >/dev/null 2>&1; then
    if afplay "$TMP" >/dev/null 2>&1; then
      rm -f "$TMP"
      exit 0
    fi
  fi
  rm -f "$TMP"
fi

# 3) 回退：本地语音
say -v Tingting "$SPEECH"
