#!/bin/bash
# convert-to-gif.sh — Merge two side-by-side .webm videos into a single GIF
#
# Usage:
#   bash convert-to-gif.sh <left.webm> <right.webm> <output.gif> [width_per_side] [fps]
#
# Examples:
#   bash convert-to-gif.sh seek-sync-user-a.webm seek-sync-user-b.webm seek-sync.gif
#   bash convert-to-gif.sh seek-sync-user-a.webm seek-sync-user-b.webm seek-sync.gif 480 12

set -euo pipefail

LEFT="$1"
RIGHT="$2"
OUTPUT="$3"
WIDTH="${4:-480}"
FPS="${5:-10}"

if ! command -v ffmpeg &>/dev/null; then
    echo "❌ ffmpeg is not installed. Run: brew install ffmpeg" >&2
    exit 1
fi

if [ ! -f "$LEFT" ] || [ ! -f "$RIGHT" ]; then
    echo "❌ Input video not found: $LEFT or $RIGHT" >&2
    exit 1
fi

echo "🎬 Merging videos side-by-side → $OUTPUT"
echo "   Left:  $LEFT"
echo "   Right: $RIGHT"
echo "   Width per side: ${WIDTH}px, FPS: ${FPS}"

ffmpeg -y -i "$LEFT" -i "$RIGHT" \
    -filter_complex "\
[0:v]scale=${WIDTH}:-1:flags=lanczos[left];\
[1:v]scale=${WIDTH}:-1:flags=lanczos[right];\
[left][right]hstack=inputs=2,\
fps=${FPS},\
split[s0][s1];\
[s0]palettegen=max_colors=128:stats_mode=diff[p];\
[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
    "$OUTPUT"

SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "✅ Done: $OUTPUT ($SIZE)"
