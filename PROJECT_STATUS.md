# Diorama Studio: project status (for a new chat)

Read first: CLAUDE.md, STYLE_GUIDE.md (section 2 and 2b), STYLE_LOCK_README.md, memory/visual_lessons.md, memory/lessons.json, memory/scores.jsonl. Skill: .claude/skills/diorama-video-maker (SKILL.md if present, scripts/setup.sh, scripts/review_frames.py).

## Setup (fresh container, run once)
```bash
bash .claude/skills/diorama-video-maker/scripts/setup.sh
```
Assets are not in git: Quaternius library (assets/fetch_library.sh), Renderpeople person (assets/fetch_people.sh), Poly Haven (assets/fetch_polyhaven.py), sound library (assets/fetch_sfx.sh). Chromium, Playwright and ffmpeg are preinstalled; never reinstall them.

## Latest videos and scores (from memory/scores.jsonl, 11 lines)

| run | score | note |
|---|---|---|
| bread-beer | 58 | props are plain boxes: oven, loaves and jug are not recognisable; no people or animals, so the story has no character to follow; captions us |
| bread-beer2 | 76 | the wheat field is almost invisible in the hook beat; people are barely on screen; no character acts with the bread or beer; beat 6 (the que |
| three-sisters | 55 | corn and squash are too small in frame: the crops read as sticks; squash is only a green square mat; the pumpkin model is not visible; bean  |
| salt_cow | 70 | library model path (animals_pack/Cow) was not resolved by the hero loader: 404 until renderer/cine.js loadModel was fixed; critic: brighter  |
| salt_cow_v2 | 77 | beat 15 adds nothing new visually; critic: too many issues (7) |
| hens_winter | 60 | beat 11 adds nothing new visually; critic: 8 issues; voice file had two takes; rendered take 2 only |
| hens_winter_v3 | 95 | automatic self-review only; the picture was not checked by eye at full size; beat 11 was over-bright before the exposure fix |
| us_dead_phone | 52 | loop seam RMSE 62.5/255 (target 0): last shot and first shot differ; no licensed music bed supplied; figure is a basic rig, limbs pop at som |
| sheep_circle | 88 | beats 3 and 9 add nothing new visually; first render hit the 30 min job limit; re-run needed a longer limit; automatic review only; not chec |
| clover_regrow | 86 | beats 3 and 4 add nothing new visually; automatic review only; not checked by eye |
| tomato_stake | 80 | beats 1, 5, 7 and 8 add nothing new visually; automatic review only; not checked by eye |

## Standard job
1. Save the user's voice as runs/<name>/voice.wav and the script as runs/<name>/script.txt (one spoken line per line).
2. Copy the closest plan (plans/salt_cow.mjs, plans/palm_pollen.mjs, plans/clover_regrow.mjs, plans/tomato_stake.mjs are the latest per-line plans) to plans/<name>.mjs and change the beats.
3. Preview once: node run.mjs --audio runs/<name>/voice.wav --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name> --preview-only
4. Full render in the background (about 25-30 min; set a long timeout): same command without --preview-only.
5. Score with the frame checker: python3 .claude/skills/diorama-video-maker/scripts/review_frames.py runs/<name>/final.mp4 runs/<name>/review
6. Log the score line in memory/scores.jsonl, mistakes in memory/visual_lessons.md, commit and push to diorama-studio.

## Rules that must not change
- No words on screen (only spoken captions). Wordless stickers from assets/stickers/catalog.json.
- Every spoken thing has a visible graphic; no dead beats; no overlaps; contact within 0.2-0.4 m.
- 3D sky default, real sizes, continuous camera (camEase 0.6), bright exposure (luma above 60).
- Sounds: bed .03, calls .05 max (global levels unchanged unless the user asks).
- Reply to the user in short Egyptian Arabic; never ask them to run commands.
- The Nx improvement rule: video #N needs N improvements in motion, camera, graphics, lighting, realism.
- Do not commit runs/ (git-ignored); commit plans, renderer, pipeline, memory.
