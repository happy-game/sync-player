#!/bin/bash
# Generate local test videos for E2E testing using ffmpeg.
# Videos are placed in player/public/test-videos/ so Vite serves them
# at /test-videos/ during development and testing.
#
# Usage:
#   cd player && bash e2e/generate-test-videos.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLAYER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PLAYER_DIR/public/test-videos"

mkdir -p "$OUTPUT_DIR"

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg is not installed. Please install it first."
    echo "   Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "   macOS:         brew install ffmpeg"
    exit 1
fi

# Skip generation if videos already exist and are valid
if [ -f "$OUTPUT_DIR/test-video-1.mp4" ] && \
   [ -f "$OUTPUT_DIR/test-video-2.mp4" ] && \
   [ -f "$OUTPUT_DIR/test-video-3.mp4" ] && \
   [ -f "$OUTPUT_DIR/short-video-1.mp4" ] && \
   [ -f "$OUTPUT_DIR/short-video-2.mp4" ]; then
    echo "✅ Test videos already exist in $OUTPUT_DIR, skipping generation."
    exit 0
fi

echo "🎬 Generating test videos in $OUTPUT_DIR ..."

# test-video-1.mp4: 30 seconds, blue background with timer overlay
ffmpeg -y -f lavfi \
  -i "color=c=0x2563eb:s=640x360:d=30,format=yuv420p,drawtext=text='Test Video 1 — %{pts\:hms}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -f lavfi -i "sine=frequency=440:duration=30" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  -movflags +faststart \
  "$OUTPUT_DIR/test-video-1.mp4" 2>/dev/null

echo "  ✅ test-video-1.mp4 (30s, blue)"

# test-video-2.mp4: 30 seconds, green background with timer overlay
ffmpeg -y -f lavfi \
  -i "color=c=0x16a34a:s=640x360:d=30,format=yuv420p,drawtext=text='Test Video 2 — %{pts\:hms}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -f lavfi -i "sine=frequency=523:duration=30" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  -movflags +faststart \
  "$OUTPUT_DIR/test-video-2.mp4" 2>/dev/null

echo "  ✅ test-video-2.mp4 (30s, green)"

# test-video-3.mp4: 30 seconds, purple background with timer overlay
ffmpeg -y -f lavfi \
  -i "color=c=0x9333ea:s=640x360:d=30,format=yuv420p,drawtext=text='Test Video 3 — %{pts\:hms}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -f lavfi -i "sine=frequency=659:duration=30" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  -movflags +faststart \
  "$OUTPUT_DIR/test-video-3.mp4" 2>/dev/null

echo "  ✅ test-video-3.mp4 (30s, purple)"

# short-video-1.mp4: 10 seconds, orange background (for auto-switch testing)
ffmpeg -y -f lavfi \
  -i "color=c=0xea580c:s=640x360:d=10,format=yuv420p,drawtext=text='Short Video 1 — %{pts\:hms}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -f lavfi -i "sine=frequency=784:duration=10" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  -movflags +faststart \
  "$OUTPUT_DIR/short-video-1.mp4" 2>/dev/null

echo "  ✅ short-video-1.mp4 (10s, orange)"

# short-video-2.mp4: 10 seconds, red background (for auto-switch testing)
ffmpeg -y -f lavfi \
  -i "color=c=0xdc2626:s=640x360:d=10,format=yuv420p,drawtext=text='Short Video 2 — %{pts\:hms}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -f lavfi -i "sine=frequency=880:duration=10" \
  -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k \
  -movflags +faststart \
  "$OUTPUT_DIR/short-video-2.mp4" 2>/dev/null

echo "  ✅ short-video-2.mp4 (10s, red)"

echo ""
echo "🎉 All test videos generated in $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"/*.mp4
