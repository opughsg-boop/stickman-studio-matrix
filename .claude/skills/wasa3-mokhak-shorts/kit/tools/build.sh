#!/usr/bin/env bash
# One-command steps for a project folder P that contains: voice.mp3 (or .wav/.m4a), script.txt (with | at every pause),
# story.json, callouts.json (optional). Every call stays under the 300 s tool limit.
#   bash build.sh check  P            # timing + storyboard validation + env report
#   bash build.sh stills P            # 12-ish mid-shot stills + contact sheet  (LOOK at P/sheet.jpg)
#   bash build.sh render P k n        # render part k of n (e.g. 1 2, then 2 2); ~0.13 s/frame
#   bash build.sh finish P [pivot_s]  # concat parts, sound, captions, brand, final mp4 + postmortem
set -e; K="$(cd "$(dirname "$0")" && pwd)"; M="$1"; P="$2"; cd "$P"; mkdir -p work out
V=$(ls voice.* 2>/dev/null | head -1); D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
case "$M" in
check) python3 "$K/timing_ar.py" "$V" script.txt --out work | head -3
       python3 "$K/storyboard.py" story.json --duration "$D" --out work/timeline.json; bash "$K/env_check.sh" | tail -12;;
stills) F=$(python3 -c "import json;t=json.load(open('work/timeline.json'));print(','.join(str((s['f0']+s['f1'])//2) for s in t['shots']))")
        rm -rf stills; python3 "$K/soft3d.py" work/timeline.json --stills "$F" --out stills; python3 "$K/sheet.py" stills sheet.jpg 5;;
render) N=$(python3 -c "import json;print(json.load(open('work/timeline.json'))['frames'])"); k=$3; n=$4; a=$(( (k-1)*N/n )); b=$(( k*N/n - 1 ))
        python3 "$K/soft3d.py" work/timeline.json --video work/part_$k.mkv --range $a-$b; echo "$n" > work/parts;;
finish) FA="${3:-}"; n=$(cat work/parts 2>/dev/null || echo 0)
        if [ "$n" -gt 0 ]; then rm -f work/parts.txt; for ((i=1;i<=n;i++)); do echo "file part_$i.mkv" >> work/parts.txt; done; ffmpeg -v error -y -f concat -safe 0 -i work/parts.txt -c copy work/video_silent.mkv; fi
        python3 "$K/sfx_synth.py" story.json --duration "$D" --out work >/dev/null 2>&1 || true
        python3 "$K/mix.py" "$V" work/music.wav work/sfx.wav work/mix.wav
        BR=$(python3 -c "import json;s=json.load(open('story.json'))['shots'];print(s[-1]['t0'])"); CO=""; [ -f callouts.json ] && CO="--callouts callouts.json"
        python3 "$K/captions.py" work/words.json work/cap.ass --lang ar $CO --brand "وسّع مخك" --brand-from "$BR" --brand-to "$D"
        bash "$K/finish.sh" work/video_silent.mkv work/mix.wav work/cap.ass out/video.mp4 video $FA;;
*) echo "usage: build.sh check|stills|render|finish P ..."; exit 1;;
esac
