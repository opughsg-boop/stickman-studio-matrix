#!/usr/bin/env bash
# New project:  bash <skill>/kit/tools/setup_project.sh ~/shorts/<slug>
# Copies the tools + engine into the project, then reports what the machine can/can't do (no network needed).
set -e; KIT="$(cd "$(dirname "$0")/.." && pwd)"; P="${1:?project dir}"
mkdir -p "$P/work" "$P/stills" "$P/out" "$P/web/lib"
cp "$KIT"/tools/*.py "$KIT"/tools/*.sh "$KIT"/tools/*.mjs "$P/" 2>/dev/null || true
cp "$KIT"/engine/*.js "$KIT"/engine/index.html "$P/web/"
[ -f "$KIT/engine/lib/three.module.js" ] && cp "$KIT/engine/lib/three.module.js" "$P/web/lib/" || true
cp "$KIT"/references/story_example.json "$P/story.json"
cp "$KIT"/examples/malqaf/script_with_pause_breaks.txt "$P/script.txt" 2>/dev/null || true
echo "project ready: $P  (tools are in the project root; lessons/memory stay in $KIT/memory)"
bash "$KIT/tools/env_check.sh" | tail -12
