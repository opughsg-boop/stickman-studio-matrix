---
name: audio-to-3d-short
description: Turn a narration audio file into a vertical (9:16) 3D-animated "explainer short" with fast-cut shots, kinetic camera moves and word-synced bottom captions — the style of the Zack D. Films / Dr. Chaos-type CGI story shorts. Use when the user gives voice-over audio (or a script) and wants the finished video with the audio muxed in.
---

# audio-to-3d-short

Two styles. **Prefer B (diorama)** — it is the one that can be produced end-to-end here with real 3D rendering.
- **A. Fast-cut CGI shorts** (below): needs external shot media (Blender/AI video/stock). Pipeline: `transcribe → plan_shots → assemble`.
- **B. 3D diorama explainer** (reference clip: Spanish chicken-coop video): ONE continuous 3D scene, no cuts.

Input: narration audio (`.mp3/.wav/.m4a/.mp4`). Output: `out/final.mp4`, 1080x1920, 30 fps, original audio.

## The style (measured from 4 reference clips)
- 9:16, ~27–38 s. **A new shot every 1.2–2.6 s**, cut on phrase boundaries; no fades (hard cuts, occasional motion-blur whip).
- Stylised-realistic 3D (Blender/Unreal look): macro close-ups, over-shoulder, low-angle, top-down; one subject per shot; flat sky-blue / teal gradient studio backgrounds alternate with real-looking environments.
- Camera never static: slow push-in, drift, or hand-held shake; 1 in ~5 shots is a fast whip/zoom.
- Infographic inserts: big numbers ("1x → 30x"), icons, labelled gauges, "REC" viewfinder frames, glowing highlight (green/purple) on the thing being explained.
- Captions: **2–3 words at a time**, bottom third (~y 78 %), bold sans-serif white, soft dark outline + drop shadow, no background box, swap exactly on the spoken words. Zero emoji.

## Do NOT reinvent — use these
| Need | Use (already installed or pip) |
|---|---|
| Word timestamps | `faster-whisper` (or `stable-ts`) — `scripts/transcribe.py` wraps it |
| Captions / camera / mux | `ffmpeg` (libass, zoompan, crop) — `scripts/assemble.py` |
| Real 3D shots | Blender headless (`blender -b -P`); the repo's `src/engine/blenderGenerator.ts` already emits bpy scenes for the stickman look; for realistic characters use Mixamo/BlenderKit assets |
| AI image→video shots (optional) | open source: ComfyUI + Wan2.1 / LTX-Video / HunyuanVideo / CogVideoX (GPU). Plug in through `--gen-cmd` |
| Stock/CC0 3D assets | Poly Haven, Sketchfab CC0, Mixamo |

The scripts only glue these together; they contain no model of their own.

## Workflow (follow in order)
1. `python scripts/transcribe.py AUDIO -o work/words.json [--transcript script.txt] [--lang ar|en|..]`
   Without a model download possible, pass `--transcript`; timing is then distributed by syllable weight over the audio duration.
2. `python scripts/plan_shots.py work/words.json -o work/shots.json`
   Produces shots (1.2–2.6 s) + 2–3-word caption chunks.
3. **You (Claude) fill every shot's `prompt`, `camera`, `overlay`** in `shots.json` — one concrete visual per shot following the style above. Camera values: `push_in | pull_out | drift_l | drift_r | tilt_up | tilt_down | shake | whip`. Overlay: `{"text":"30x","pos":"top"}` or null. Vary the camera: never the same value 3 shots in a row.
4. Make the shot media (`shot.asset` = image or video path). Either supply files, or run a generator per shot:
   `python scripts/assemble.py --shots work/shots.json --audio AUDIO --gen-cmd 'blender -b -P my_scene.py -- --prompt {prompt} --out {out} --dur {dur}'`
   Shots with no asset get a gradient placeholder card so the pipeline always completes (review timing first, swap media later and re-run; finished clips are cached in `work/clips/`).
5. Output `out/final.mp4`. Check with `ffprobe`; extract a contact sheet (`ffmpeg -vf fps=0.5,tile=8x2`) and compare with the style list.

## Honest limits
Photoreal 3D footage is **not** produced by the scripts themselves — they need a shot source (Blender scenes, AI video model, or supplied clips). Without one you get a timing-accurate animatic: correct cuts, camera moves, captions and audio, ready to receive media.
Arabic: pass `--lang ar`; captions use right-to-left shaping via libass automatically (font: Noto Sans Arabic/Cairo if installed, set `--font`).


---
# Style B — 3D diorama explainer (rendered for real with three.js)

**Look (measured):** 9:16, 30 fps, one continuous shot. A floating terrain block over a blue grid-floor studio with soft light beams;
miniature animals/structures **pop in with overshoot exactly on the word that names them**; smooth keyframed camera (orbit, rise, push-in);
captions **one word at a time**, UPPERCASE, bold italic condensed (Bebas Neue), white with thick black outline, ~80 % height; no other UI.

**Reuse, don't rewrite:** three.js (rendering), Playwright + Chromium (headless software GL), ffmpeg/libass (captions, mux), faster-whisper (word times), Bebas Neue (OFL, in `assets/fonts`).

**Setup once:** `cd .claude/skills/audio-to-3d-short && npm install && pip install -r requirements.txt` (Chromium: uses `/opt/pw-browsers/chromium` if present, else `CHROMIUM_PATH` or `npx playwright install chromium`).

**Workflow**
1. `python scripts/transcribe.py AUDIO -o work/words.json --model small [--lang xx]`
2. **Write `work/spec.json`** (see `examples/penguin_spec.py`): `duration, fps, fov, block{w,h,d}, snow{from}, camera[{t,pos,look}]`, and `objects[]` with
   `kind` = `penguin | chicken | egg | box | plant | label`, `pos:[x,z]`, `y`, `scale`, `t0` (pop-in time = start of the word that names it), optional `t1`, `tint`,
   `orbit{center,speed,from}`, `path[{t,pos}]`, `idle`, `face`; `box` takes `size, color, opacity` (build structures from boxes); `label` takes `text, w, color`.
   Put every object's `t0` and every camera keyframe on word boundaries from `words.json`; change the camera at each new idea. Add a new `kind` in `diorama/scene.js` (`mkObject`) when the topic needs one.
3. `python scripts/make_diorama.py AUDIO work/spec.json --words work/words.json --out out/final.mp4`
   Renders ~0.3 s/frame at 720x1280 on CPU (a 10 s clip ≈ 3–6 min; run it in the background); set `width/height` in the spec for other sizes.
4. Check a contact sheet (`ffmpeg -vf fps=0.8,scale=200:-1,tile=8x1`) against the look list.

Limits: primitive-built models (ellipsoid animals, box structures), not photoreal; quality scales with the spec you write. Arabic captions: pass an Arabic-capable font to `word_captions.py --font`.
