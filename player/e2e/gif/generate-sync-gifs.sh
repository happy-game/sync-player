#!/bin/bash
# generate-sync-gifs.sh — One-click script to generate sync demo GIFs
#
# Prerequisites:
#   - ffmpeg installed (brew install ffmpeg)
#   - Backend server running (go run cmd/server/main.go)
#   - Frontend dev server running (npm run dev)
#
# Usage:
#   cd player && bash e2e/gif/generate-sync-gifs.sh
#   # or simply:
#   npm run generate:gif

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)/docs/gifs"

# ── Pre-flight checks ────────────────────────────────────────────────────────
echo "🔍 Pre-flight checks..."

if ! command -v ffmpeg &>/dev/null; then
    echo "❌ ffmpeg is not installed. Run: brew install ffmpeg" >&2
    exit 1
fi
echo "  ✅ ffmpeg found"

if ! curl -s http://localhost:3000/ >/dev/null 2>&1; then
    echo "❌ Backend server not running at http://localhost:3000" >&2
    echo "   Start it with: cd server && go run cmd/server/main.go" >&2
    exit 1
fi
echo "  ✅ Backend server reachable"

if ! curl -s http://localhost:5173/ >/dev/null 2>&1; then
    echo "❌ Frontend server not running at http://localhost:5173" >&2
    echo "   Start it with: cd player && npm run dev" >&2
    exit 1
fi
echo "  ✅ Frontend server reachable"

# ── Step 1: Record videos with Playwright ─────────────────────────────────────
echo ""
echo "🎬 Step 1: Recording sync demo videos with Playwright..."

cd "$PROJECT_DIR"
npx playwright test gif/generate-gif --project=chromium --reporter=list

echo "  ✅ Videos recorded"

# ── Step 2: Convert to GIFs ───────────────────────────────────────────────────
echo ""
echo "🖼️  Step 2: Converting videos to GIFs..."

SCENARIOS=("seek-sync" "pause-resume-sync" "playlist-sync")

for scenario in "${SCENARIOS[@]}"; do
    LEFT="$OUTPUT_DIR/${scenario}-user-a.webm"
    RIGHT="$OUTPUT_DIR/${scenario}-user-b.webm"
    GIF="$OUTPUT_DIR/${scenario}.gif"

    if [ ! -f "$LEFT" ] || [ ! -f "$RIGHT" ]; then
        echo "  ⚠️  Skipping $scenario: video files not found"
        continue
    fi

    bash "$SCRIPT_DIR/convert-to-gif.sh" "$LEFT" "$RIGHT" "$GIF"
done

# ── Step 3: Cleanup temp videos (optional) ────────────────────────────────────
echo ""
echo "🧹 Cleaning up temporary video files..."

for scenario in "${SCENARIOS[@]}"; do
    rm -f "$OUTPUT_DIR/${scenario}-user-a.webm" "$OUTPUT_DIR/${scenario}-user-b.webm"
done

# Clean up temp directories
rm -rf "$OUTPUT_DIR"/_tmp_*

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "🎉 All done! Generated GIFs:"
echo ""

for scenario in "${SCENARIOS[@]}"; do
    GIF="$OUTPUT_DIR/${scenario}.gif"
    if [ -f "$GIF" ]; then
        SIZE=$(du -h "$GIF" | cut -f1)
        echo "  📄 $GIF ($SIZE)"
    fi
done

echo ""
echo "You can use these in README.md like:"
echo '  ![Seek Sync Demo](docs/gifs/seek-sync.gif)'
