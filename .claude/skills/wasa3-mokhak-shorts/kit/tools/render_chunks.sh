#!/usr/bin/env bash
# Render the 3D engine in ~12 s chunks with retry, then concat to work/video_silent.mkv (RESUME-safe).
#   bash tools/render_chunks.sh <project_dir> <total_frames>
set -e; P="$1"; N="$2"; cd "$P"; mkdir -p frames work/chunks; C=360; k=0
for ((a=0; a<N; a+=C)); do b=$((a+C-1)); ((b>=N)) && b=$((N-1)); out="work/chunks/c$(printf %03d $k).mkv"
  if [ ! -s "$out" ]; then
    for try in 1 2 3; do RESUME=1 WEB="$P/web" node render.mjs frames "$a-$b" && break || { echo "retry $try for $a-$b"; sleep 2; }; done
    ffmpeg -v error -y -framerate 30 -start_number $a -i frames/f%04d.jpg -frames:v $((b-a+1)) -c:v libx264 -crf 16 -pix_fmt yuv420p "$out"
  fi; k=$((k+1)); done
ls work/chunks/*.mkv | sed "s|^|file '$P/|;s|$|'|" > work/chunks.txt
ffmpeg -v error -y -f concat -safe 0 -i work/chunks.txt -c copy work/video_silent.mkv && echo "ok work/video_silent.mkv"
