# Diorama Studio: instructions for Claude

The user speaks Egyptian Arabic and is not technical. Reply in short, simple Egyptian Arabic. Never ask them to run commands.
Read `SCRIPTS_AND_STYLE.md` first (compact summary). Full history and context: `HANDOFF.md`. Style guides: `STYLE_ZD.md` (cine, the current main style) and `STYLE.md` (diorama).

## Setup (fresh container, ~1 min, run once)
```bash
npm install
pip install faster-whisper yt-dlp
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

## Subagent for routine chores
Delegate mechanical work to the **`routine-runner`** subagent (`.claude/agents/routine-runner.md`, model Haiku = cheap). That covers setup installs, running or waiting for a render, git commit/push, making the zip and checking logs.
Keep creative work in the main conversation: scripts, plans and shot choices, visual review.

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

## Extra tools (installed once, already in package.json and the skills folder; do not reinstall)
- **HyperFrames** (`hyperframes`, HeyGen): HTML-to-video. Use it for titles, overlays, transitions and 2D motion graphics. Its skills are in `.claude/skills/hyperframes*`. Run it with `npx hyperframes ...`.
- **Remotion** (`remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler`): React-to-video. Its headless browser is fetched with `npx remotion browser ensure`.
- **yt-dlp**: downloads reference videos and audio. Use `yt-dlp --js-runtimes node URL` (YouTube needs a JS runtime).
- **Whisper**: we use `faster-whisper`, which runs the same OpenAI Whisper models faster. The original `openai/whisper` package was NOT installed on purpose: it would add about 2 GB of PyTorch for the same job.
- **animation-principles** (dylantarre, MIT): Disney's 12 animation principles. 17 skills are active in `.claude/skills/anim-*`: the 12 principle masters, 3d-spatial, video-motion-graphics, timing-calibration, attention-management and excitement-energy. Apply them when building props and motion: anticipation before drops, squash & stretch on landings, follow-through, arcs, slow-in/out. The other 127 skills are reference only, in `tools/animation-principles/skills`. Activate one by copying it into `.claude/skills` only when needed: each active skill costs context in every session.
- Respect the STYLE LOCK in every tool: no on-screen words except the spoken captions.

## Ready-made 3D library (semi-realistic animals, people, trees, crops)
- Run `bash assets/fetch_library.sh` once per fresh container (~46 MB, CC0 Quaternius packs). The models are not stored in git.
- Model names and animation clips are listed in `assets/lib/catalog.json`.
- **animals_pack:** Cow, Bull, Horse, Horse_White, Donkey, Alpaca, Deer, Stag, Fox, Wolf, Husky, ShibaInu. Clips: Idle, Walk, Gallop, Eating, Idle_Headlow, Attack_Kick, Death, and more.
- **modular_men / modular_women:** Farmer, Worker, Casual, Suit and others. These are static; the engine lowers the arms from the T-pose automatically, and `wave:true` adds a gesture.
- **nature_pack (150) / simple_nature_pack:** trees, bushes, rocks, grass.
- **crops_pack (102):** crops by growth stage.
- **fish_pack:** swimming fish, shark, dolphin, whale.
- **medieval_village_pack:** barrels, carts, wells, bags, fences.
- Use it in a diorama plan:
  ```
  { id:'cow', type:'glb', pos:[x,0,z], params:{ model:'animals_pack/Cow', height:1.4, clip:'Eating', path:[[x1,z1],[x2,z2]], pathSpeed:.25 } }
  ```
  Change the clip or path per beat with `modes: { cow: { clip:'Walk', path:[...] } }`.
- Prefer these models over hand-built primitive animals and trees for a more realistic look. `runs/libtest/plan.json` is a working example.
