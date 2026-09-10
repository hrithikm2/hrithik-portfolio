#!/usr/bin/env bash
set -euo pipefail
# Usage: FFMPEG=/path/to/ffmpeg bash scripts/encode-media.sh /path/to/original.mp4
# Independently decodable frames make forward/backward scroll seeks bounded work.
encoder=${FFMPEG:-ffmpeg}
source_video=${1:?Pass the original transition MP4}
for variant in mobile desktop; do
  if [ "$variant" = mobile ]; then width=768; quality=27; else width=1280; quality=28; fi
  "$encoder" -hide_banner -loglevel error -y -i "$source_video" -an \
    -vf "fps=24,scale=${width}:-2:flags=lanczos" -c:v libx264 -preset slow \
    -profile:v main -pix_fmt yuv420p -crf "$quality" -g 1 -bf 0 \
    -tune fastdecode -movflags +faststart -map_metadata -1 \
    "assets/transition-${variant}-v2.mp4"
done
