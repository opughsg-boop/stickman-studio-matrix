# Diorama Studio: instructions for Claude

The user speaks Egyptian Arabic and is not technical. Reply in short, simple Egyptian Arabic. Never ask them to run commands.
Full history and context: `HANDOFF.md`. Style guides: `STYLE_ZD.md` (cine, the current main style) and `STYLE.md` (diorama).

## Setup (fresh container, ~1 min, run once)
```bash
npm install
pip install faster-whisper
ln -sfn "$(npm root -g)/playwright" node_modules/playwright
```
Chromium, Playwright and ffmpeg are preinstalled in the cloud container. Do not reinstall them.

## Standard job: the user sends a voice-over (WAV/MP3) and its script
1. Save the script exactly as given, one line per spoken sentence, to `runs/<name>/script.txt`.
2. Write `stories/<name>.json`: the `hero` plus one entry per script line, choosing templates from `plans/lib.mjs`.
   - Available shots: sky, close, orbit, react, people, walk, found, object, route, vanish, dive, transform, twist, far, science, flock, museum, cta.
   - Use `split` to put several shots inside one long line. `stories/spear.json` is the reference example.
   - If a story needs a new kind of shot, add a template to `plans/lib.mjs` rather than writing a one-off plan.
3. Run one command (the audio may be in the uploads folder):
   ```bash
   node run.mjs --audio <file> --script runs/<name>/script.txt --story stories/<name>.json --lang ar --out runs/<name>
   ```
   It transcribes, aligns the script automatically (`pipeline/align.py`), plans, previews, adds SFX, renders 1080x1920 at 30 fps, runs the self-review, and updates `memory/`.
   It takes ~12 min for 45 s on the cloud CPU. Run it in the background and wait with a single long check.
4. Send `runs/<name>/final.mp4` with SendUserFile. Summarise the score in 3 or 4 lines.
5. Commit the story and the memory changes, then push to branch `diorama-studio` of `opughsg-boop/stickman-studio-matrix`.

## Saving the user's daily usage (important)
- Look at at most ONE preview sheet per video (`sheet_preview.jpg`, 180 px tiles), and only when changing templates or assets. A story built only from existing templates can go straight to the full render.
- Do not Read big files or images you do not need. Use `tail`/`grep` on logs. Avoid long tool outputs.
- One video per conversation. When the conversation gets long, tell the user to start a new one; this file and `HANDOFF.md` carry the context.
- Script writing for the user: follow the formula in `STYLE_ZD.md` (hook → "ده بسبب" → "بس" → "فـ" → twist ending → follow CTA). About 40 s, at most 110 words. Write it ready to paste into Google AI Studio TTS, with a style line on top.

## Faster rendering
`--gpu` renders at full 1080x1920 on a machine with a graphics card (the user's PC, via Remote Control). Workers default to CPU cores minus 1.

## STYLE LOCK (user decisions, never change without the user asking)
- No words on screen except the spoken captions: no signs, labels, counters, pins or button text. The engines enforce this unless a plan sets `style.allowText: true`. Only wordless icons are allowed (✓ ✗ arrows).
- Transition sound: the soft low "whoom" (`soft_transition` in `pipeline/sfx.py`). The hissy noise whoosh ("تش تش") was rejected.
- Diorama: continuous camera (`camEase` 0.6, no punch cuts), 2-word Arabic captions per spoken line, ✓/✗ icons on fix/problem beats.
