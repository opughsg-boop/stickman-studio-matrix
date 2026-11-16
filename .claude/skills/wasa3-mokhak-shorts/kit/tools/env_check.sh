#!/usr/bin/env bash
# Idempotent environment check. Installs ONLY what is missing, and only with --install and a working network.
#   bash tools/env_check.sh            # report
#   bash tools/env_check.sh --install  # fetch missing pieces
cd "$(dirname "$0")/.."; INSTALL=0; [ "$1" = "--install" ] && INSTALL=1; MISS=()
chk(){ if eval "$2" >/dev/null 2>&1; then echo "OK    $1"; else echo "MISS  $1"; MISS+=("$1"); fi; }
chk network        "curl -sI -m 6 https://github.com"
chk ffmpeg         "ffmpeg -version"
chk ffmpeg-libass  "ffmpeg -filters 2>/dev/null | grep -q ' ass '"
chk node22         "node -e 'process.exit(+process.versions.node.split(\".\")[0]>=22?0:1)'"
chk py-deps        "python3 -c 'import numpy,cv2,scipy,PIL'"
chk playwright     "npm ls -g playwright"
chk chromium       "ls ~/.cache/ms-playwright/chromium-* || [ -x \"\$CHROME\" ]"
chk three.js       "[ -f engine/lib/three.module.js ]"
chk whisper-multi  "python3 -c 'import faster_whisper' || python3 -c 'import sherpa_onnx'"
chk font-lalezar   "fc-list | grep -qi lalezar"
chk font-arabic    "fc-list | grep -qi arab"
[ $INSTALL = 0 ] && { echo "missing: ${MISS[*]:-none}"; exit 0; }
curl -sI -m 6 https://github.com >/dev/null 2>&1 || { echo "NO NETWORK: enable network access for the sandbox, then re-run with --install"; exit 1; }
has(){ [[ " ${MISS[*]} " == *" $1 "* ]]; }
SK="$(pwd)"; if has three.js; then mkdir -p engine/lib; ( cd /tmp && rm -rf _t && mkdir _t && cd _t && npm pack three@0.160.0 >/dev/null 2>&1 && tar xzf three-0.160.0.tgz && cp package/build/three.module.js "$SK/engine/lib/" ); fi
if has three.js && [ ! -f engine/lib/three.module.js ]; then git clone -q --depth 1 --filter=blob:none --sparse --branch r160 https://github.com/mrdoob/three.js /tmp/_t3 && (cd /tmp/_t3 && git sparse-checkout set build) && cp /tmp/_t3/build/three.module.js engine/lib/; fi
if has playwright; then npm i -g playwright; fi
if has chromium; then npx playwright install chromium || npm i -g @sparticuz/chromium@131.0.1; fi          # CPU-only boxes: render with --use-angle=swiftshader
if has whisper-multi; then pip install --break-system-packages faster-whisper || { mkdir -p models && curl -L -C - -o models/whisper-small.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2; pip install --break-system-packages sherpa-onnx; }; fi
if has font-lalezar; then mkdir -p ~/.fonts && curl -L -o ~/.fonts/Lalezar-Regular.ttf https://github.com/google/fonts/raw/main/ofl/lalezar/Lalezar-Regular.ttf && fc-cache -f; fi
bash "$0"
