# Open-source stack: what exists, what to install (idempotent: tools/env_check.sh --install)
Already in the sandbox (do NOT reinstall): ffmpeg (+libass, loudnorm, ass), Node 22, Python numpy/cv2/scipy/PIL/skimage/matplotlib, npm global playwright (library only, no browser).
Missing here and BLOCKED (no network): Chromium, three.js, Whisper, Lalezar/Arabic fonts.
| project | license | role | how |
|---|---|---|---|
| mrdoob/three.js r160 | MIT | 3D engine (engine/main.js) | npm pack three@0.160.0, else git sparse-checkout of tag r160 |
| microsoft/playwright (+Chromium) | Apache-2.0 | headless render of frames; CPU WebGL with --use-angle=swiftshader | npx playwright install chromium; fallback @sparticuz/chromium@131.0.1 |
| k2-fsa/sherpa-onnx (Whisper small multilingual) | Apache-2.0 | Arabic/Spanish word timestamps when Hugging Face is blocked | GitHub release asr-models; verify the exact asset name; curl -C - to resume |
| SYSTRAN/faster-whisper | MIT | alternative ASR if pip + HF reachable | pip install faster-whisper |
| google/fonts: Lalezar (OFL) | OFL | Arabic caption font of the zach look | download TTF into ~/.fonts, fc-cache |
| mromidev/claude-animated-shorts | MIT | optional 2D toon character cards (only for character-card shorts, not this style) | used by cartoon-short-kit setup.sh |
Candidates to study later (not installed): Remotion-style compositors, three-mesh-bvh, postprocessing (pmndrs) for DOF/outline. Add only when a lesson demands it.
