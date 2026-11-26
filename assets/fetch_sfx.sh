#!/usr/bin/env bash
# Fetch background sound libraries (Mixkit free sound effects, Mixkit License: free for commercial video, no attribution).
# Animal calls, sea/water and environment beds. Run once per fresh container. Files go to assets/sfx/<category>/ (not in git).
set -e
cd "$(dirname "$0")/.."
UA="Mozilla/5.0"
fetch_cat() { # category, max files
  local cat=$1 max=$2; local dir="assets/sfx/$cat"; mkdir -p "$dir"
  curl -s -m 30 -A "$UA" "https://mixkit.co/free-sound-effects/$cat/" \
    | grep -o 'sfx/[0-9]*/[0-9]*-preview\.mp3' | sort -u | head -n "$max" \
    | while read -r p; do id=$(basename "$p" -preview.mp3); f="$dir/$id.mp3"
        [ -s "$f" ] || curl -s -m 60 -A "$UA" -o "$f" "https://assets.mixkit.co/active_storage/$p" || rm -f "$f"; done
  echo "$cat: $(ls "$dir" | wc -l) files"
}
fetch_cat cow 12
fetch_cat chicken 4
fetch_cat horse 8
fetch_cat dog 6
fetch_cat sea 10
fetch_cat waves 8
fetch_cat water 10
fetch_cat ambience 10
fetch_cat wind 8
fetch_cat forest 8
fetch_cat bird 8
fetch_cat rain 8
