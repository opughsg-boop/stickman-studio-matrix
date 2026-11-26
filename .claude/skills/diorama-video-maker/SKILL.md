---
name: diorama-video-maker
description: Make a vertical 1080x1920 3D farm explainer video (Egyptian Arabic voice-over) with the locked hyper-realistic look. Every spoken line gets a visible graphic, no on-screen text, real models and sizes, sound beds under the voice. Runs the full pipeline, gives an Arabic title and hashtags, scores the video, checks frames, fixes the mistakes for the next video, and suggests new topics. Use for any voice-over-to-video request in this project, including "فيديو زي الفيديو الأخير".
---

# Diorama video maker (locked style, updated 2026-11-26)

The user speaks Egyptian Arabic and is not technical. Reply in short, simple Egyptian Arabic. Never ask the user to run commands. Keep the chat short; one video per conversation.

## 0. Start here (every new chat)
1. Run the setup once from the repo root (idempotent, safe to repeat):
   ```bash
   bash .claude/skills/diorama-video-maker/scripts/setup.sh
   ```
   It installs npm packages, faster-whisper, yt-dlp, the Playwright link, the Quaternius library, the Renderpeople person and the Poly Haven layer. Chromium, Playwright and ffmpeg are preinstalled: never reinstall them.
2. Read `PROJECT_STATUS.md` if it exists in the bundle. Then read `CLAUDE.md`, `STYLE_GUIDE.md` sections 2 and 2b, `memory/visual_lessons.md`, `memory/lessons.json`, and the last 3 lines of `memory/scores.jsonl`.
3. Check git: `git status -sb`. The working branch is `diorama-studio`. Commit and push only when asked or when the stop hook asks (see section 9).

## 1. Latest state (last video: tomato staking, 2026-11-26)
| n | run | score (automatic review) | main note |
|---|---|---|---|
| 1 | bread-beer | 58 | props were plain boxes |
| 2 | bread-beer2 | 76 | wheat field too flat |
| 4 | salt_cow_v2 | 77 | per-line props, 7 beats too quiet |
| 6 | hens_winter_v3 | 95 | every flagged beat got a sticker |
| 8 | sheep_circle | 88 | first two-joint-leg walker |
| 10 | clover_regrow | 86 | field, bed, heap props; sound beds |
| 11 | tomato_stake | 80 | staking, rot spot, beetle, basket |

- **Last video:** tomato staking, 33.7 s, 1080x1920, -14.3 LUFS, score 80. Beats 1, 5, 7 and 8 added nothing new visually (critic flags). The next video must fix those beats first.
- **Plans to copy from (latest first):** `plans/tomato_stake.mjs`, `plans/clover_regrow.mjs`, `plans/palm_pollen.mjs`, `plans/sheep_circle.mjs`, `plans/salt_cow.mjs`, `plans/hens_winter.mjs`.
- **Renderer additions in `renderer/scene.js` (latest):** date palm (`date_palm`, ladder, sickle, bag, pollen dust), clover field (`clover_field`, `clover_bed`, `clover_heap`), tomato plant, bamboo cane, twine, wicker basket, rot spot, beetle and fly, winter hens pack (coop, lamp, timer, nest boxes), salt pack (salt block, wall, trough, pen fence, hay pile), sheep pack (`sheep`, `grass_bed`, `mud_patch`, `pen_gate`, `pick_prop`).
- **Sound (`pipeline/sfx.py`):** global levels unchanged (bed .03, calls .05 max). Plans can add per-plan beds and calls through `env.sfxBeds`, `env.sfxCalls` and `env.sfxCuts`; every gain is capped at the global value. Donkey call is in `assets/sfx/donkey` (from Mixkit: check the licence before a public post).

## 2. The style lock (never change without the user asking)
- **No words on screen** except the spoken captions: no signs, labels, counters, pins or button text. Only wordless stickers and icons (✓ ✗ arrows).
- **Every spoken thing has a visible graphic** (2026-11-24). A line about salt shows salt, a line about water shows water, a line about a farmer shows the farmer. Visual means objects and actions, never text.
- **No dead beats.** Each beat adds a new visible action or object. The critic flags `dead_beat`; fix every flagged beat.
- **No overlap.** No animal or object passes into another. Stakes do not go through plants, people do not go through fences. Check in the preview.
- **Pointers are 3D emoji stickers** (`type:'sticker'`, names in `assets/stickers/catalog.json`): point_down, point_right, circle_ring, check, cross, arrows, thumbs_up, sparkles, eyes, water_drop, face_thinking, face_sleep and others. Never stickers with letters or digits.
- **3D sky** by default (no `env.sky` set). Photo HDRI only if asked. Blueprint room only with `env.sky:false`.
- **Real models at real sizes** in metres: person 1.75, cow 1.4-1.45, donkey 1.3, sheep 0.9, hen 0.4, date palm 8-8.6, tomato plant 1.2, cane 1.5, basket 0.34.
- **Animals always play their own natural clip** (Eating, Walk, Idle) or walk a path with feet matched to the ground. Plants sway. Nothing frozen.
- **Camera:** continuous (`camEase` 0.6), no punch cuts, zoom in and out alternating, handheld micro-motion on.
- **Captions:** 2 words at a time, white bold Arabic, aligned to the exact script.
- **Format:** 1080x1920, 30 fps, H.264 + AAC, about -14 LUFS (the pipeline reports the value).
- **Contact:** hands and feet touch what they hold or stand on; tolerance 0.2-0.4 m at most. Measure with a probe, not by eye.
- **Exposure:** every beat's mean luma above 60, and under 5% of pixels above 205 (except a sun look-up shot).

## 3. The user's script rules
- Save the voice exactly as given to `runs/<name>/voice.wav` (convert `.ogg` or `.mp3` to 24 kHz mono WAV with ffmpeg: `ffmpeg -y -i in.ogg -ac 1 -ar 24000 voice.wav`).
- Save the script exactly as given, one spoken sentence per line, to `runs/<name>/script.txt`. Do not correct the user's dialect or words; flag facts instead.
- Check the duration with ffprobe. A 70-second video needs about 150-170 words; the usual video is 35-60 seconds.
- Hook: a curiosity question in the first line plus a strong visual in the first second. Formula: question → "ده بسبب إن…" → "بس…" (problem) → "فـ…" (fix) → twist → follow CTA ("لو عرفت حاجة جديدة، اعمل لايك وتابع الصفحة عشان تعرف أكتر!").
- Before scripting, flag any number or fact that needs a source (for example hours of light, days, sodium needs).

## 4. Build the plan (per-line, copied from the latest plan)
1. Copy the closest plan to `plans/<name>.mjs` and set one beat per script line. The plan reads `runs/<name>/transcript.json` for timing, so run the transcription first (the preview step does it).
2. Use library models: `animals_pack/Cow`, `animals_pack/Donkey`, `modular_men` (Farmer), `people_rp/...`, nature and crops packs, Poly Haven (`ph/<id>`). Real soil with `env.soil`.
3. Preview once, look at `runs/<name>/sheet_preview.jpg` once, fix what is clearly wrong, and do not look again.
4. Check contacts and luma with a probe for each beat that has a hold or a grab.

## 5. Render (the long step)
- A full render takes 25-40 minutes on the cloud CPU. The job has a 30-minute default limit: **run it with a timeout of 7200000 ms (2 hours)**, otherwise the job is killed mid-render (this happened on the sheep and palm videos).
  ```bash
  node run.mjs --audio runs/<name>/voice.wav --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name> > runs/<name>/log.txt 2>&1; echo "EXIT $?" >> runs/<name>/log.txt
  ```
- Preview only (faster):
  ```bash
  node run.mjs --audio runs/<name>/voice.wav --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name> --preview-only
  ```
- Wait with one long check. Read only `tail` and `grep` of the log (`score=`, `dead_beat`, `blown`, `dark`, `error`, `Traceback`, `EXIT`). Do not read big files.
- **Never change renderer or plan files while a render is running.** A merge that adds conflict markers during a render breaks it (`Unexpected token '<<'`).
- If the voice file has two takes (the transcript runs twice), cut the take you want into a new WAV and say so to the user. Never render a file with two takes.

## 6. Score, frames and the Nx rule
1. Run the frame checker on the final video:
   ```bash
   python3 .claude/skills/diorama-video-maker/scripts/review_frames.py runs/<name>/final.mp4 runs/<name>/review
   ```
   It writes `report.json` (brightness and motion per frame, flags for dark, blown, frozen, flash or cut) and `sheet_NN.jpg` contact sheets. Look at the sheets and the flagged frames for odd objects, wrong sizes, floating props, sliding hooves, hands that miss, clipping, frozen animals, dark frames and any text on screen.
2. Score out of 100: motion, camera, graphics, lighting, realism, captions, audio. Say honestly which points were lost. The automatic score is not the final judgement: say it, and let the user judge with their eyes.
3. Append one line to `memory/scores.jsonl` (`run`, `n`, `score`, `breakdown`, `mistakes`, `fixes`). Add each visual mistake to `memory/visual_lessons.md` (mistake, fix, source).
4. **Nx rule:** video #N needs N concrete improvements, each in motion, camera, graphics, lighting and realism. Name them in the final message.

## 7. Send to the user
- Send `runs/<name>/final.mp4`. If it is above the chat limit (about 40 MB), make a copy at CRF 28 with `-maxrate 6M -bufsize 12M -c:a aac -b:a 160k` into the scratchpad and send that copy. Say in Arabic that it is a compressed copy.
- Reply in 3-4 lines: the score, what improved, what still fails (the flagged beats), and the next step.

## 8. Title, description and hashtags (on request)
- **Title:** the hook question plus one emoji (for example "ليه البرسيم بيطلع تاني بعد ما يتقص؟ 🌿"). Trend-friendly if asked, but say that live trends cannot be checked from here.
- **Description:** 2 lines, then "تابعني لفيديوهات أكتر 👆".
- **Hashtags:** 5 short ones (one or two words), relevant to Egypt and the Arab world and to the topic (for example #زراعة #فلاحة #الطماطم #مصر).
- **Facebook post:** hook, two explanation lines, a question for the comments.

## 9. Git (commit and push)
1. Commit the plan, renderer, pipeline, memory and skill changes. **Never commit `runs/`** (git-ignored) or large binaries.
2. Push to `diorama-studio`. If the push is rejected because the remote moved:
   ```bash
   git fetch origin diorama-studio && git merge --no-edit origin/diorama-studio
   ```
   Resolve conflicts by keeping both sides' code (renderer: both hand-tool sets and both appended packs; memory: keep both lines; `lessons.json` counts: take the newer side). Check syntax with `node --experimental-default-type=module --check renderer/scene.js`, then run a preview of one old plan before pushing. Never force-push. If the merge is too hard, abort (`git merge --abort`), keep the local commit, and ask the user.
3. Do not create a pull request unless asked.

## 10. Suggest the next videos
- Give 5 or 10 new topics, each with a question hook (the first spoken line) and a visual hook (the first second).
- Check the topics against `memory/story_ideas.md` and the plans list, so no topic repeats. Already done: cow salt lick, hens in winter, sheep circling, date palm pollination, clover regrowth, tomato staking, olive cutting, three sisters (beans, maize, squash).
- Verify every number or fact before the script is written.

## 11. Subagents (routine versus creative work)
- **routine-runner** (Haiku): setup, waiting for renders, log checks, git commit and push. No judgement.
- **graphics-builder** (creative): writing the plan, props, poses, camera and sound choices, the single preview and the visual fixes. Give it the script path, the plan path, the rules above and the list of flagged beats.
- The main chat does the script, the title, the score and the decisions.

## 12. Files in this skill
- `scripts/setup.sh`: one-time setup, idempotent.
- `scripts/review_frames.py`: per-frame numbers, flags and contact sheets for a finished video.
- Project files this skill relies on: `CLAUDE.md`, `STYLE_GUIDE.md`, `memory/`, `plans/`, `renderer/`, `pipeline/`, `run.mjs`, `assets/fetch_*.sh|py`.
