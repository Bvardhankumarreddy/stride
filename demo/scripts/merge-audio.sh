#!/bin/bash

# ─── Merge AI Voiceover with Demo Video ─────────────────────────────────────
# Requires: ffmpeg installed (brew install ffmpeg)

VIDEO_DIR="./demo-output"
AUDIO_DIR="./demo-output/audio"
OUTPUT_DIR="./demo-output/final"

mkdir -p "$OUTPUT_DIR"

# Find the latest recorded demo video
VIDEO_FILE=$(ls -t "$VIDEO_DIR"/*.webm 2>/dev/null | head -1)

if [ -z "$VIDEO_FILE" ]; then
  echo "❌ No .webm video found in $VIDEO_DIR"
  echo "   Run: npm run record"
  exit 1
fi

echo "🎬 Video found: $VIDEO_FILE"
echo "🎙️  Audio clips: $AUDIO_DIR"
echo ""

# ─── Step 1: Concatenate all audio clips into one file ───────────────────────
echo "⏳ Step 1: Merging audio clips..."

# Build ffmpeg input list
AUDIO_LIST="$AUDIO_DIR/audio_list.txt"
rm -f "$AUDIO_LIST"

for scene in \
  "01_welcome" \
  "02_dashboard" \
  "03_issues" \
  "04_create_issue" \
  "05_issue_detail" \
  "06_custom_fields" \
  "07_invite" \
  "08_docs" \
  "09_roadmap" \
  "10_ai_command" \
  "11_closing"
do
  MP3="$AUDIO_DIR/${scene}.mp3"
  if [ -f "$MP3" ]; then
    echo "file '$(realpath "$MP3")'" >> "$AUDIO_LIST"
  else
    echo "⚠️  Missing audio: ${scene}.mp3 — skipping"
  fi
done

# Concatenate audio clips
MERGED_AUDIO="$AUDIO_DIR/merged_voiceover.mp3"
ffmpeg -y -f concat -safe 0 -i "$AUDIO_LIST" -c copy "$MERGED_AUDIO"
echo "✅ Audio merged: $MERGED_AUDIO"

# ─── Step 2: Combine video + merged audio ────────────────────────────────────
echo ""
echo "⏳ Step 2: Combining video + voiceover..."

DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="$OUTPUT_DIR/stride-demo-with-audio-$DATE.mp4"

ffmpeg -y \
  -i "$VIDEO_FILE" \
  -i "$MERGED_AUDIO" \
  -c:v libx264 \
  -crf 23 \
  -preset medium \
  -c:a aac \
  -b:a 128k \
  -shortest \
  "$OUTPUT_FILE"

echo ""
echo "✅ Final video saved: $OUTPUT_FILE"
echo ""

# ─── Step 3: Add background music (optional) ─────────────────────────────────
# Uncomment below if you want to mix in background music at low volume

# MUSIC_FILE="./assets/background-music.mp3"
# OUTPUT_WITH_MUSIC="$OUTPUT_DIR/stride-demo-with-music-$DATE.mp4"
#
# if [ -f "$MUSIC_FILE" ]; then
#   echo "⏳ Step 3: Adding background music..."
#   ffmpeg -y \
#     -i "$OUTPUT_FILE" \
#     -i "$MUSIC_FILE" \
#     -filter_complex "[0:a]volume=1.0[voice];[1:a]volume=0.12[music];[voice][music]amix=inputs=2:duration=shortest[aout]" \
#     -map 0:v \
#     -map "[aout]" \
#     -c:v copy \
#     -c:a aac \
#     -shortest \
#     "$OUTPUT_WITH_MUSIC"
#   echo "✅ Video with music saved: $OUTPUT_WITH_MUSIC"
# fi

echo ""
echo "🎬 Done! Your demo video is ready at:"
echo "   $OUTPUT_FILE"
echo ""
echo "📤 Upload to:"
echo "   1. YouTube (full video)"
echo "   2. LinkedIn (native MP4)"
echo "   3. Product Hunt (demo video)"
echo "   4. Twitter/X (trim to 60s first)"
