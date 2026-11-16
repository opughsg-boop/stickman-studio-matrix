#!/usr/bin/env bash
# Final assembly: silent video + captions (ass) + pivot fade + mixed audio -> 1080x1920 30fps mp4, then postmortem.
#   bash tools/finish.sh <video_silent.mkv> <mix.wav> <captions.ass> <out.mp4> <slug> [fade_at_s] [fade_dur_s]
set -e; V="$1"; A="$2"; ASS="$3"; O="$4"; S="${5:-video}"; FA="${6:-}"; FD="${7:-0.35}"; HERE="$(cd "$(dirname "$0")" && pwd)"
VF="scale=1080:1920:flags=lanczos,fps=30"
[ -n "$FA" ] && VF="$VF,eq=brightness='-min(1,max(0,1-abs(t-$FA)/$FD))':eval=frame"   # dips to black at the pivot, comes back
VF="$VF,ass=$ASS"
ffmpeg -v error -y -i "$V" -i "$A" -vf "$VF" -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest -movflags +faststart "$O"
python3 "$HERE/postmortem.py" "$O" --slug "$S" ${FA:+--fade-at $FA} || true
