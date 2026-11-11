---
name: diorama-explainer
description: Make vertical (1080x1920) 3D explainer videos in two styles - (a) blueprint diorama build-up, (b) fast cinematic explainer reels (studio cyclorama / HDRI sets, animated 3D characters, x-ray and glow highlights, UI callouts, whip cuts, 2-3 word captions). Also: make vertical (1080x1920) 3D "blueprint diorama" explainer videos from any voice-over or prompt - a floating soil island in a blue grid room where each narration beat assembles a new component (problem -> fix -> problem -> fix), with one-word bold captions synced to the voice. Use when the user uploads narration audio and wants this style of video, wants a preview, or wants the tool to review and improve itself.
---
# Diorama Explainer

Project root: the `diorama-studio/` folder. Style reference: `STYLE.md`.

## Pipeline (one command)
```bash
node run.mjs --audio VOICE --prompt "topic" [--script script.txt] [--lang ar|es|en|auto] [--out runs/NAME] [--preview-only]
```
1. `pipeline/transcribe.py`: faster-whisper (`small`, multilingual) with word timestamps. If `--script` is given, the exact script words replace the ASR words, so captions are spelled correctly.
2. `pipeline/plan.mjs`: splits the narration into beats (min/max length come from `memory/style.json`) and maps each beat to scene actions.
   - Uses Claude (`claude-opus-5-5`) when `ANTHROPIC_API_KEY` is set. Claude can invent new props from primitives (`custom` + `name`), and those props are saved to `memory/learned_assets.json` for reuse.
   - Without a key it falls back to multilingual keyword rules (ES/EN/AR).
3. `pipeline/render.mjs`: Three.js scene (`renderer/scene.js`, all procedural and deterministic per frame) rendered by headless Chromium (Playwright, SwiftShader). It renders 12 s chunks to `.mkv` with 2 parallel workers and 3 retries, and resumes chunks that already exist. Then it concatenates the chunks, upscales to 1080x1920 at 30 fps, and applies loudnorm -14 LUFS.
3b. `pipeline/sfx.py`: synthesizes SFX synced to the plan and mixes them under the voice with side-chain ducking: whoosh on every cut, wood or metal impact when a dropped object lands, ding on solution beats, buzz on problem beats, sizzle during heat, and a bee or ambience bed. Turn it off with `--no-sfx`.
4. `pipeline/critic.py`: self-review. It checks black frames, frozen picture, darkness or overexposure, a lost subject, missing room context, repetitive or dead beats, caption timing and loudness. With a key it also runs a Claude vision review of `sheet_final.jpg`. It writes `report.json`, adds lessons to `memory/lessons.json` (sent to the planner next time), auto-tunes `memory/style.json` (exposure, camScale, drift, beat lengths), and appends a score to `memory/history.jsonl`.

Always show the user `sheet_preview.jpg` (one still per beat) before a long render when they ask for a check.

## Visual grammar (engine v2)
- Fast cuts: `camEase` .32. Every cut has a punch-in. A beat can set `camera.zoom` to `in` or `out`.
- Camera shake and a dust puff play when a dropped object lands.
- A white flash and a green ✓ mark solution beats. A red edge flash and a red ✗ mark problem beats. A vignette is always on.
- Default output is 30 rendered fps. It used to be 15 fps with each frame duplicated.
- Hand-directed plans live in `plans/*.mjs`, for example `plans/bees.mjs`. Run them with `node run.mjs --audio X --plan plans/bees.mjs`. Objects tagged `hive` follow `plan.lifts` (raise animations).
- Bee-keeping pack: `hive_box`, `frames` (mode `{spacing}` animates), `wax_mess`, `glue`, `bees` (modes `swarm`, `messy`, `stream`), `queen`, `excluder`, `lid{vent}`, `stand`, `sun{rise}`, `drips`, `eggs`.

## Web studio
`node server.mjs` serves http://localhost:8787 (Arabic UI). It handles upload, queue, progress, video player, review report and the memory view.

## Extending
- New prop: add a builder to `ASSETS` in `renderer/scene.js`, add its keywords to `C` in `pipeline/plan.mjs`, and add it to `CATALOG`.
- Captions: Latin text uses Barlow Condensed 800 italic in uppercase. Arabic text uses Lalezar, auto-detected, with 2 words per caption.
- Speed: about 7.5 s of wall time per second of video at 540x960/15 fps on 4 CPU cores. `--fps 30` doubles the time.

## Cinematic explainer style ("cine" engine)
- Style guide and measured targets: `STYLE_ZD.md` and `memory/ref_profile_zd.json`.
- To learn from more reference reels, re-run:
  ```bash
  python3 pipeline/ref_profile.py memory/ref_profile_zd.json ref1.mp4 ref2.mp4 ...
  ```
- Plans use `"engine":"cine"` with `shots[]`. Direct them by hand in `plans/<topic>.mjs` with one shot per phrase (1 to 2 s), then run:
  ```bash
  node run.mjs --audio X --plan plans/<topic>.mjs
  ```
- Assets live in `assets/` (see `assets/LICENSES.md`). Characters: Xbot, Michelle, Soldier, RobotExpressive (14 clips and facial expressions). Animals: Fox, Horse, Parrot, Flamingo, Stork. Also LeePerrySmith (scanned head) and ferrari. HDRIs: studio, sky, city, photo studio, forest.
- Speed: about 15 s of wall time per second of video at 30 fps.
- Prerequisite in a fresh container:
  ```bash
  ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright
  ```
