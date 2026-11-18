---
name: diorama-video-maker
description: Make a vertical 1080x1920 3D farm/Egypt explainer video from the user's voice-over (or a script). Locked hyper-realistic look, one sentence per shot, every spoken word visible in the scene, no on-screen text. Runs the full pipeline, gives a title, scores the video, checks every frame for mistakes, fixes them for the next video, and suggests new video ideas. Use for any "فيديو زي الفيديو الأخير" or voice-over-to-video request in this project.
---

# Diorama video maker (locked style)

The user speaks Egyptian Arabic and is not technical. Reply in short, simple Egyptian Arabic. Never ask them to run commands. Keep the chat short; one video per conversation.

## 0. Setup (once per container, silent)
Run from the repo root:
```bash
bash .claude/skills/diorama-video-maker/scripts/setup.sh
```
It installs npm packages, faster-whisper, yt-dlp, the Playwright link, the Quaternius library, the Renderpeople person and the Poly Haven layer. Chromium, Playwright and ffmpeg are preinstalled: never reinstall them. Every step checks first, so re-running is safe.

## 1. Read before planning (required)
- `CLAUDE.md`, `STYLE_GUIDE.md` sections 2 and 2b (the locked look), `STYLE_LOCK_README.md`.
- `memory/visual_lessons.md` and `memory/lessons.json`: never repeat a logged mistake.
- The last 3 lines of `memory/scores.jsonl`: this video's improvement count is N = number of score lines + 1.
- The closest proven plan: `plans/salt_cow.mjs` (cows, props, farmer, per-line beats) is the reference for farm videos now.

## 2. The style lock (never change without the user asking)
- **No words on screen** except the spoken captions. No labels, signs, counters or button text. Wordless icons only: ✓ ✗ arrows, the clock.
- **Every spoken word has a visible thing in the scene.** A line about salt shows salt; a line about water shows water; a line about the farmer shows the farmer. Visual means objects and actions, not text.
- **Pointers are 3D emoji stickers** (`type:'sticker'`, names in `assets/stickers/catalog.json`), never plain arrows, and never stickers with letters or digits.
- **3D sky** by default (`env.sky` unset). Photo HDRI sky only if asked. Blueprint room only with `env.sky:false`.
- **Real models at real sizes** in metres (person 1.75, cow 1.4, sheep 0.9, chicken 0.4). Animals always play a clip or walk a path; nothing is frozen.
- **Camera:** continuous (`camEase` 0.6), no punch cuts, zoom in and out alternating, handheld micro-motion on.
- **Captions:** 2 words at a time, white bold Arabic, aligned to the exact script.
- **Format:** 1080x1920, 30 fps, H.264 + AAC, -14 LUFS target (the pipeline reports the measured value).
- **Background SFX stay quiet** under the voice (`pipeline/sfx.py`: mix weight 0.5, bee ambience .035/.07). Never raise them.
- **Contact:** hands, feet and bodies touch what they hold, lean on or climb. Tolerance 0.2-0.4 m at most.

## 3. Script
1. Save the user's script exactly as given, one spoken sentence per line, to `runs/<name>/script.txt`.
2. Save the voice-over to `runs/<name>/voice.wav` (it may be in the uploads folder).
3. If the script's hook is weak, propose one stronger question hook and ask once; otherwise keep the user's script word for word.

## 4. Build the plan
- Copy `plans/salt_cow.mjs` to `plans/<name>.mjs` and change the beats. Give each spoken line one clear visual.
- Use the library: `animals_pack/Cow`, `modular_men`, `ph/<id>` (Poly Haven), `people_rp/...`. Real soil with `env.soil`.
- Look at a single preview sheet once if the template or assets changed:
  ```bash
  node run.mjs --audio runs/<name>/voice.wav --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name> --preview-only
  ```
  Then view `runs/<name>/sheet_preview.jpg` once. Fix, and do not look again.

## 5. Full render (run in the background; it takes about 25-30 min on the cloud CPU)
```bash
node run.mjs --audio runs/<name>/voice.wav --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name> > runs/<name>/log.txt 2>&1 &
```
Wait with one long check. Read only `tail` and `grep` of the log (`score=`, `error`, `Traceback`). Do not read big files.

## 6. Title
Give one Arabic title: the hook line plus one emoji, then 2 description lines, then 4-5 hashtags (one is `#وسع_مخك` only for that channel). Put it in the final message, not in the video.

## 7. Score and frame-by-frame review (required)
1. Run the frame checker on the final video:
   ```bash
   python3 .claude/skills/diorama-video-maker/scripts/review_frames.py runs/<name>/final.mp4 runs/<name>/review
   ```
   It writes `report.json` (every frame's brightness and motion, plus flags: dark, blown out, frozen, flash or cut) and `sheet_NN.jpg` contact sheets (every 15th frame).
2. Look at the contact sheets and the flagged frames. Check for: odd objects that appear from nowhere, wrong sizes (a cow smaller than a person, a cup bigger than a block), floating props, sliding hooves, hands that miss the object, a face or body clipping through a wall, frozen animals, dark or blown frames, text on screen (forbidden), and an unrealistic look.
3. Score out of 100 with this breakdown: motion, camera, graphics, lighting, realism, captions, audio. Say honestly which points were lost and why.
4. Append one line to `memory/scores.jsonl` (`run`, `n`, `score`, `breakdown`, `mistakes`, `fixes`). Add each visual mistake as one entry in `memory/visual_lessons.md` (mistake, fix, source).

## 8. Self-improvement and the Nx rule
- **Multiplier:** video #N needs N concrete improvements, each in motion, camera, graphics, lighting and realism. Name them in the final message.
- **Realism:** raise realism 1x each video toward the target. Real sizes, real textures, real light, real contact.
- Before the next video, apply every fix from `memory/visual_lessons.md` to the plan. Never repeat a logged mistake.
- If a flagged frame is a real problem (for example a floating prop), fix the plan and re-render that video once to verify. Do not re-render just for cosmetics.

## 9. Commit and send
1. Commit the plan, the story if any, `memory/` changes and the score line. Do not commit `runs/` (it is git-ignored).
2. Push to branch `diorama-studio`. Do not create a PR unless asked.
3. Send `runs/<name>/final.mp4` to the user with the file tool, and in Arabic say: the title, the score in 3-4 lines, what was fixed, and what the next video will improve.

## 10. Suggest the next videos
Give 5 new ideas in the same style, each with a question hook (a spoken line) and a visual hook (the first second). Pick topics that match the locked look: farm animals, buildings, tools, traditions. Check `memory/story_ideas.md` so no idea repeats. Verify any number or fact before scripting it.

## Files in this skill
- `scripts/setup.sh`: one-time setup, idempotent.
- `scripts/review_frames.py`: per-frame numbers, flags and contact sheets for a finished video.
