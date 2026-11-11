# Handoff: continue the "Diorama Studio" video tool in a new conversation

> **To the new Claude session:** the user (Arabic, Egyptian dialect, reply in Arabic) uploaded this file together with
> `diorama-studio-project.zip`. Treat this as a continuation of a previous conversation. Everything below is the
> state of that conversation. Restore the project first (section 1), then continue with the user's request.

## 0. Where the code lives
GitHub: `opughsg-boop/stickman-studio-matrix`, branch **`diorama-studio`** (separate history; `main` is an unrelated app).
`git clone -b diorama-studio https://github.com/opughsg-boop/stickman-studio-matrix diorama-studio` replaces unzipping.
The repo is PUBLIC — the user may later move it to a private `diorama-studio` repo.

## 1. Restore the project (do this first)
```bash
mkdir -p /home/user && cd /home/user && unzip -oq <path-to>/diorama-studio-project.zip && cd diorama-studio
npm install                       # three, express, multer, @anthropic-ai/sdk, fonts (no node_modules in the zip)
pip install faster-whisper        # Arabic/multilingual transcription (model "small" downloads from Hugging Face)
ln -sfn "$(npm root -g)/playwright" node_modules/playwright   # use the preinstalled Playwright/Chromium; do NOT reinstall
```
- **Requirements:** ffmpeg and python3 with numpy and Pillow.
- **Chromium:** rendering uses headless Chromium (SwiftShader), so no GPU is needed.
- **Assets:** `assets/` (glTF models and HDRIs) is included in the zip. Do not re-download them.

## 2. What the user wants (goals)
- **What the tool does:** it takes any voice-over (mostly Egyptian Arabic) plus the exact script and produces a vertical 1080x1920, 30 fps video.
- **Style:** fast, smooth rhythm with sound effects, visual effects, camera movement, zoom in and zoom out, and Arabic captions.
- **Self-improvement:** the tool analyses every finished video and stores lessons so it does not repeat mistakes (`pipeline/critic.py` and `memory/`).
- **Web studio:** a stable page for producing videos (`node server.mjs`, Arabic UI, port 8787).
- **Rules the user set:**
  - Never reinstall things that are already installed.
  - Show stills before long renders when asked.
  - Be honest about limits.
  - The user said to show every command before running it and to ask before changing files outside the project. That was for the Claude-usage-tools task; that task was paused and is not resumed.

## 3. Two styles / engines
### A) Blueprint diorama (`renderer/scene.js`, style guide `STYLE.md`)
- **Scene:** a floating soil island in a blue blueprint grid room.
- **Story:** each narration beat assembles a new component (problem → fix), with ✗/✓ icons, flashes, dust puffs, shake and punch-zoom.
- **Captions:** Lalezar/Barlow.
- **Finished videos:**
  - chicken coop (Spanish reference audio)
  - **"إزاي تعمل بيت للنحل"**, the user's own Arabic voice: 38 s, 17 beats, self-review score 78. Plan: `plans/bees.mjs`.
- **Asset packs:**
  - farm: chickens, posts, roof, mesh, perch, nest
  - bee-keeping: hive_box, frames with animated spacing, bees swarm/stream, queen, excluder, lid with vent, stand, sun, drips, eggs

### B) Cinematic explainer reels (`renderer/cine.js`, style guide `STYLE_ZD.md`)
- **Learned from:** 5 reference reels the user uploaded (a popular fast 3D explainer page).
- **Measured targets (`memory/ref_profile_zd.json`):**
  - cuts every 1–2 s
  - luma about 105
  - saturation about 0.38
  - constant camera motion
  - shallow depth of field
- **Script formula:** a 2nd-person hook, then "ده بسبب إن…", then "بس…", then "فـ…", ending on an ironic punchline. About 180 wpm, 80–110 words.
- **Features:**
  - sets: studio cyclorama, HDRI ground or background
  - glTF actors with animation clips and morph expressions
  - x-ray and glow highlight
  - props, including particles and a cup
  - UI: viewfinder, counter "3x", pin, label, arrow, meter
  - camera: handheld, orbit, depth of field, bloom
  - transitions: whip and flash
- **Models (`assets/models`):** Xbot, Michelle, Soldier, RobotExpressive (14 clips, Angry/Surprised/Sad morphs), Fox, Horse, Parrot, Flamingo, Stork, LeePerrySmith head, ferrari, facecap.
- **HDRIs:** studio_small_09, kloofendal sky, potsdamer_platz, brown_photostudio_02, forest_slope.
- **Test clip:** `runs/cine_test` (9 s). Honest limit: the free models are simpler than the reference's realistic characters.

## 4. Pipeline
```bash
node run.mjs --audio voice.wav --script script.txt --lang ar --out runs/NAME [--plan plans/NAME.mjs] [--preview-only]
```
Steps, in order:
1. **Transcribe:** `pipeline/transcribe.py` runs faster-whisper with word timings.
   - Best practice: replace the ASR words with the user's script, segment by segment, keeping ASR timings. This is what was done for the bees video.
2. **Plan:** one of two planners.
   - `pipeline/plan.mjs` is the rule planner for the diorama, with Claude used when `ANTHROPIC_API_KEY` exists. No key was available, so the rule planner was used.
   - **For good results, hand-direct a plan in `plans/<topic>.mjs`** with one beat or shot per phrase.
3. **Sound effects:** `pipeline/sfx.py` synthesizes SFX and ducks them under the voice:
   - whoosh on cuts
   - wood or metal impacts
   - ding on fixes, buzz on problems
   - sizzle, and a bee bed
4. **Render:** `pipeline/render.mjs` renders 12 s chunks to mkv with 2 workers and retries, resumes after interruptions, encodes at 30 fps, and applies two-pass loudnorm to -14 LUFS.
   - Run it with `--preview` for one still per beat.
5. **Review:** `pipeline/critic.py` scores the video, writes lessons, and auto-tunes `memory/style.json`:
   - for both engines: black frames, freeze, dark or bright, repetitive beats, captions, loudness
   - cine only: comparison with the reference profile

**Speed:**

| Engine | Wall time per second of video |
|---|---|
| diorama | ~8 s |
| cine | ~15 s |

## 5. Current memory (also inside the zip)
- **`memory/style.json`:** exposure 1.16, minBeat 1.8, maxBeat 5.5, cine.bright 1.0.
- **`memory/lessons.json`:**
  - keep night/dark scenes readable
  - merge too-short beats
  - hold captions
  - normalize loudness
  - match reference exposure

## 6. Open items / next steps
- **Video waiting to be made:** the user was offered 3 Arabic scripts for the cine style and should pick one, record it, and send the audio plus the script:
  - why flamingos stand on one leg
  - how foxes hunt under snow
  - why horses sleep standing
- **Earlier diorama topic ideas still unused:**
  - rooftop garden
  - fish pond
  - goat pen
- **Known issues to improve:**
  - in the bees video, the queen is too small, the propolis glue is hidden, and the sunrise is off-frame in the tip shot
  - the cine engine needs more realistic human assets
- **Paused task:** installing Claude-usage tools (ccusage was run once; installing rtk was blocked by the GitHub proxy and needs the `rtk-ai/rtk` repo added).
- **Back-up:** done. The project is pushed to the `diorama-studio` branch (see section 0).
