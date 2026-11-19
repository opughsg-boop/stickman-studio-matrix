#!/usr/bin/env bash
# One-time setup for a fresh container. Safe to re-run: every step checks first.
# Usage: bash .claude/skills/diorama-video-maker/scripts/setup.sh   (from the repo root)
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
step() { echo "== $1"; }
step "npm packages"; [ -d node_modules/three ] || npm install --no-audit --no-fund
step "python packages (whisper + downloader)"
python3 -c "import faster_whisper" 2>/dev/null || pip install -q faster-whisper yt-dlp
step "playwright link (browser is preinstalled, do NOT install it again)"
[ -e node_modules/playwright ] || ln -sfn "$(npm root -g)/playwright" node_modules/playwright
step "ready-made 3D library (Quaternius animals, people, trees, crops)"
[ -d assets/lib/animals_pack ] || bash assets/fetch_library.sh
step "Renderpeople scanned person"
[ -d assets/lib/people_rp ] || bash assets/fetch_people.sh
step "Poly Haven ground, rocks, props and soil"
[ -d assets/ph ] || python3 assets/fetch_polyhaven.py
step "checks"
python3 -c "import faster_whisper; print('whisper ok')"
command -v ffmpeg >/dev/null && echo "ffmpeg ok" || echo "ffmpeg MISSING"
[ -d assets/lib/animals_pack ] && echo "library ok" || echo "library MISSING"
[ -d assets/ph ] && echo "poly haven ok" || echo "poly haven MISSING"
echo "setup done"
