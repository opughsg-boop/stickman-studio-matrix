#!/usr/bin/env bash
# First-run smoke test of the 3D engine (needs Chromium + engine/lib/three.module.js). Renders 3 frames and checks they are not blank.
#   bash tools/smoke.sh
set -e; SK="$(cd "$(dirname "$0")/.." && pwd)"; P=$(mktemp -d); mkdir -p $P/web $P/frames
cp $SK/engine/*.js $SK/engine/index.html $P/web/; cp -r $SK/engine/lib $P/web/lib; cp $SK/tools/render.mjs $P/
python3 $SK/tools/storyboard.py $SK/references/story_example.json --duration 24.8 --out $P/web/timeline.json >/dev/null
python3 - <<PY
import json; t=json.load(open("$P/web/timeline.json")); t["persist"]=["hens","coop"]; json.dump(t,open("$P/web/timeline.json","w"))
PY
cd $P && ln -sf "$(npm root -g)/playwright" node_modules 2>/dev/null || (mkdir -p node_modules && ln -sf "$(npm root -g)/playwright" node_modules/playwright)
WEB=$P/web node render.mjs frames "5,60,200" 1 0.9
python3 - <<PY
from PIL import Image; import numpy as np, glob
for f in sorted(glob.glob("$P/frames/*.jpg")):
    a=np.asarray(Image.open(f).convert("L"),dtype=float); print(f.split("/")[-1], "std=%.1f"%a.std(), "OK" if a.std()>15 else "BLANK/FLAT")
PY
echo "stills in $P/frames"
