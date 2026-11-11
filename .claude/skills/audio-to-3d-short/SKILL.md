---
name: audio-to-3d-short
description: Turn a narration audio file into a vertical (9:16) 3D-animated "explainer short" with fast-cut shots, kinetic camera moves and word-synced bottom captions — the style of the Zack D. Films / Dr. Chaos-type CGI story shorts. Use when the user gives voice-over audio (or a script) and wants the finished video with the audio muxed in.
---

# audio-to-3d-short

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
