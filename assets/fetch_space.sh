#!/usr/bin/env bash
# Space textures (Solar System Scope, CC BY 4.0). Files are small, kept in git. Re-run if missing.
set -e; cd "$(dirname "$0")/.."; mkdir -p assets/space
for f in 2k_jupiter 2k_neptune 2k_sun; do [ -s assets/space/$f.jpg ] || curl -s -m 60 -A "Mozilla/5.0" -o assets/space/$f.jpg https://www.solarsystemscope.com/textures/download/$f.jpg; done
ls -la assets/space | tail -n +2
