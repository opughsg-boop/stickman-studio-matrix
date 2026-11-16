---
name: wasa3-mokhak-shorts
description: Make a vertical 3D educational short for the Arabic page "وسّع مخك". Offers 10 fact-checked ideas, writes a curiosity-hook Egyptian-Arabic script that ends with the like-and-follow call, then turns the user's recorded voiceover into a finished 1080x1920 30 fps MP4 with a continuously moving camera, zoom in/out, word-synced captions, SFX, music and a branded end card. Audits every video afterwards and stores lessons so the next one is better. Use for any video, topic-suggestion or voiceover-script request for this page.
---

# وسّع مخك shorts: idea → script → voiceover → finished MP4 → publish pack

The look: a 3D "blueprint diorama" world: blue studio gradient with a soft light shaft, white blueprint grid floor, textured soil/sand diorama blocks with a cross-section edge, cutaway buildings, flat-shaded props with dark outlines, billboard actors, glowing annotations (double arrows, pulse rings, shockwaves, sparks, airflow trails). One continuous world, a camera that never stands still, fast pacing (a new visual idea every 1.5-3 s). The output is 1080x1920, 30 fps, exactly as long as the voiceover. The user's voice is unchanged. Captions are burned in. Music and SFX are synthesized and sit well under the voice. Every video ends with the same call to action and a branded end card. Proven on "الملقف" (31.6 s, 11 shots).

Answer the user in the language they write (usually Egyptian Arabic). Scripts for recording are written in Egyptian dialect.

## Rules
- Topics, scripts and shots are always original. Never recreate another creator's video shot for shot. Offer an original take on the same idea instead.
- Every fact presented as true is verified with a web search first. Say plainly whether a story is documented, disputed or legend. No real living people as characters or as the butt of a joke, nothing graphic, nothing political, no copyrighted music or characters.
- **The first spoken sentence is a curiosity hook** (paradox, question or surprise, no setup).
- **The last spoken line is fixed:** "لو استفدت، اعمل لايك وتابع صفحة «وسّع مخك»... عشان مخك يوسع!" The last shot is the end card (`fx: ["outro"]`: expanding rings + pulsing heart) with the big gold brand text "وسّع مخك" (`captions.py --brand`). The storyboard validator rejects a story without it.
- Never fake narration (no espeak, no sine tones) and never edit or re-time the voice. The picture is timed to it, and every visual beat lands 0-3 frames before its word.
- Captions are ON, burned after the render (never inside the 3D engine): 1-3 words at a time, bold white with a thick black outline, text bottom at 80 % of the height, no punctuation. Arabic font: Lalezar, else Noto Sans Arabic Bold (DejaVu is only a stopgap). Correct ASR errors from the user's script.
- **Audio levels:** music at −14 dB and SFX at about −7 dB relative to the voice's gated RMS, then one loudnorm to −14 LUFS with a −1.5 dBTP true-peak ceiling. Always mix with `mix.py`, never by hand, and use no ducking.
- No hard cuts. The camera blends from each shot's end pose into the next shot over 18 frames (smoothstep), and a short fade through black (0.3 s) marks the pivot line.
- Keep the user informed with a task list. Send a stills contact sheet before the long render. Be honest about what was and wasn't verified (see Status).

## Status (read first)
Verified end-to-end in a sandbox with only ffmpeg + OpenCV + numpy (no network, no browser): timing, storyboard, `soft3d` CPU renderer (3 finished videos: الملقف, طوفان العسل, الطبق), SFX/music synthesis, mix, captions (+callouts +brand), finish, postmortem, lessons. Not verified (needs Chromium + three.js + network): the WebGL `engine/`, `render_chunks.sh`. Run `bash <skill>/kit/tools/env_check.sh`; if `network` is MISS, tell the user to enable network access, never claim an install happened. Known limits: captions use DejaVu unless Lalezar is installed; graphics are flat-shaded (no real textures/characters); the user wants MORE EXPRESSIVE graphics, so improve scene packs every time.
**Tool limits that bit us:** one tool call is limited to 300 s and background jobs die with the call. Render in the foreground in parts (`build.sh render P 1 2`, `build.sh render P 2 2`), roughly 0.13 s/frame, and run finish in a separate call.

## Stage 1: Intake (always first)
Read the memory first: `python3 <skill>/kit/tools/lessons.py brief` and obey it.
If an audio file is already attached, skip to Stage 4. If a script was also given, use it for the timing. If there is audio but no script, ask for the script text (Claude cannot hear audio, and ASR of dialect is unreliable).
Otherwise ask one question: **"Where are you starting from?"**
- **Voiceover ready**: ask them to upload it plus the script text. Go to Stage 4 when it arrives.
- **I have a script, need the voiceover**: tighten the script per Stage 3, give it back with recording tips, ask for the upload, then go to Stage 4.
- **Need video ideas and a script**: go to Stage 2.
Also ask the target length if they haven't said. The default is 30 s (25-35 s) including the closing call to action.

## Stage 2: 10 video ideas
Give exactly 10 ideas in one reply, numbered, and ask the user to reply with a number (or "more"). Each idea gets:
- **Title** (curiosity-driven, e.g. "الملقف: تكييف المصريين القدماء").
- **Hook line**: the first spoken sentence, a curiosity gap stated as a fact ("راجل باع برج إيفل... مرتين!").
- **The twist** in one line (the surprising payoff before the closing line).
- **Why it animates well**: the 2-3 big visual moments (a cutaway, heat-vs-cool colour flow, a shockwave, a close-up on the mechanism).
- **True or legend**: documented, disputed or folklore, with the source found by web search.

What makes an idea "perfect" for this page:
- One surprising story or mechanism with a physical cause and effect you can show.
- A setting built from simple 3D shapes (houses, ships, ground cutaways, labs, deserts, rivers).
- Mix the 10 across eras and themes: ancient, medieval, 1800s, modern, science, animals, inventions, disasters, Egyptian and Arab heritage, lucky accidents.
- Don't present a viral legend as fact. If the user wants it anyway, frame it as "الرواية بتقول".
- Hedge claims the sources hedge (say "من أقدم", not "أقدم", when origin is disputed).

## Stage 3: Script (after they pick)
Write the narration only, about 2.5 Arabic words per second: 25 s ≈ 62 words, 30 s ≈ 75, 35 s ≈ 88 (all including the closing line). Formula:
1. **Hook** (sentence 1, no setup): the curiosity gap.
2. **Setting** in 1-2 lines: when, where, who, a concrete detail.
3. **Escalation**, 2-3 beats, each bigger. Use one exaggeration or surprise.
4. **Pivot**: "بس السؤال هنا..." introduces the real mechanism, often with an everyday analogy.
5. **Payoff**: short, surprising, ends the story.
6. **Closing line (fixed)**: "لو استفدت، اعمل لايك وتابع صفحة «وسّع مخك»... عشان مخك يوسع!"
Use plain Egyptian dialect, sentences of 6-12 words, numbers written as words, and never describe what the viewer already sees.

Then reply with:
- The script in a copyable block, with the word count and estimated length.
- A one-paragraph visual plan (the shots you'll build).
- Recording tips: one steady, warm narrator voice (ElevenLabs works well), natural pauses at the end of every phrase, no music, mp3 or wav.
- The ask: **"ارفع التسجيل مع النص وأنا أبني الفيديو."**
Keep the final script text. It drives the timing in Stage 4. If they recorded a changed version, ask for the final text.

## Stage 4: Build the video (after the voiceover is uploaded)
Do everything from here without stopping. Ask only if the timing cannot be resolved.

### 4.0 Get the kit
The code kit ships **inside this skill folder** at `kit/` (tools, WebGL engine, worked example "الملقف", references, lessons memory). Locate the folder with `find / -name SKILL.md -path "*wasa3-mokhak-shorts*" 2>/dev/null` and treat its `kit/` as read-only, except `kit/memory/` and `kit/reports/`, which the postmortem writes.

Then run `bash <skill>/kit/tools/setup_project.sh ~/shorts/<slug>`. It copies the tools and engine into the project and prints what the machine can do.
- Requirements: ffmpeg with libass, Python 3 with numpy + OpenCV + scipy + Pillow. For the WebGL engine also Node 22+, Playwright with Chromium and three.js r160 (`bash tools/env_check.sh --install` fetches only what is missing, and only if the network works).
- If the network is blocked, say so once and continue with `soft3d.py`. Never disable TLS or route around a proxy.

### 4.1 Timing
Put `|` in the script at every real pause of the narrator, then run `python3 timing_ar.py voice.mp3 script.txt --out work`.
- With `|` breaks and as many phrases as speech segments, it prints `EXACT segment match` and anchors every phrase to its real segment (best accuracy).
- Without `|`, it splits at Arabic and Latin punctuation and snaps phrase ends to the nearest real pause. Check `work/phrases.json`: pauses must fall between phrases.
- With faster-whisper or sherpa-onnx installed, use word timestamps only to locate words. The text always comes from the script.
- Total frames = round(duration × 30).

### 4.2 Shot plan (`story.json`, then `work/timeline.json`)
One shot per speech segment (merge tiny segments). Fields per shot: `id, t0, t1, world, focus, camera{move,dist,az,el,fov}, fx[], props[], sfx[]`. See `references/story_example.json` and `examples/malqaf/story_with_cta.json`.
- Shot length 1.2-4.5 s, average 1.8-3.2 s. Never hold a shot longer than 4.5 s.
- Camera moves: `push_in, pull_out, orbit, dolly, crane_up, crane_down, whip_pan, tilt_down, rack_focus, drift`. At least 40 % push_in/pull_out, never the same move twice in a row.
- FX: `pulse, arrow, sparks, shockwave, flash, impact, outro`. FX on at least 50 % of the shots.
- Every shot has its own world/focus/move combination. Never loop a shot; if the library lacks a prop for the sentence, build one.
- The pivot line gets a fade through black (`fade: {at, dur}`), the payoff gets the biggest effect, the last shot carries `outro`.
- Validate with `python3 storyboard.py story.json --duration D --out work/timeline.json`. It enforces all of the above.

### 4.3 World and props
Keep the look contract: the studio gradient, the grid floor, the diorama block, flat shading with dark outlines. Per topic, add new props in `PROPS`/`FOCUS`/`WIND`-style path tables in `soft3d.py` (or `engine/props.js` for WebGL).
- Make the graphics expressive (user feedback): textures (brick, soil, wood), living actors with idle motion, a heat/cool colour language (warm orange vs cyan flow), close-up inserts on the mechanism, labelled callouts, dramatic light, slow motion on the payoff.
- Invisible things (air, heat, electricity, sound) become particle trails along a path.
- Cutaway buildings: omit the front wall; use box walls with outward normals so back-face culling works.

- Topic props live in scene packs: `kit/tools/scenes/<topic>.py` (`register(PROPS, FOCUS, helpers, HOOKS)`), loaded via the story's `"scene"` key; start from `scenes/molasses.py` (brick street, car, tank, animated wave, gauge, blueprint board, smell particles) or `scenes/dish.py` (Egyptian rooftop with dozens of dishes, crows, a space view with Earth, equator, geostationary ring, satellites). Shots can set `"bg": "space"` (stars follow the camera); worlds dissolve over 24 frames when `bg` changes. Per-shot `grade` sets mood; `gauge` fx draws a speed dial; show key numbers with `captions.py --callouts callouts.json`.

### 4.4 Actors
Billboard cutouts (people, animals) face the camera on yaw only and always have idle motion (bob, sway, blink). Characters never freeze. Add an `actors` list to a shot when the story needs a person or animal.

### 4.5 Motion: smooth and alive
- Use smootherstep for glides and easeOut for whips. Every hold creeps (about 3 % push) so nothing is static for 4+ frames.
- Blend each shot's start pose from the previous shot's end pose over 18 frames (smoothstep). A fast easeOut blend over 10 frames looks like a hard cut and fails the postmortem.
- Impacts get a short camera shake. Time jumps get a 6-frame white flash.
- Something always moves: particles, rotating sun rays, drifting arrows.

### 4.6 Look check (before the full render)
Render stills at the middle of every shot plus the transitions: `python3 soft3d.py work/timeline.json --stills 20,100,... --out stills`, then `python3 sheet.py stills sheet.jpg 5`, and LOOK at the sheet. Fix these traps:
- **Narrow vertical frame**: 9:16 has a narrow horizontal FOV, so camera distance must be at least 1.4× the object width or the subject is cropped.
- Particles that pass within 1.5 m of the camera become huge and pop: skip them and cap their radius.
- Mirrored text, wrong colours, an empty frame, a prop hidden behind a wall, a camera inside a building.
- Faces popping through each other (painter sort): split large faces or reorder props.
Send the sheet to the user with a one-line shot summary, then start the full render.

### 4.7 Sound (`sfx_synth.py` → stems → `mix.py`)
- `python3 sfx_synth.py story.json --duration D --out work` writes `music.wav` and `sfx.wav`. Every shot start gets a whoosh matched to its camera move (up for push-in, down for pull-out), every fx adds its own hit (impact, shockwave, sparkle, pop, ting), and `outro` adds a sparkle and a ting.
- `python3 mix.py voice.mp3 work/music.wav work/sfx.wav work/mix.wav` sets music at −14 dB and SFX at about −7 dB under the voice, caps SFX peaks below the voice peak, and normalizes to −14 LUFS. Confirm the printed levels.
- Lock the picture timing before the sound. Any timing change means re-running `sfx_synth.py` and `mix.py`.

### 4.8 Captions, render and finish
- Captions: `python3 captions.py work/words.json work/cap.ass --lang ar --brand "وسّع مخك" --brand-from <start of closing line> --brand-to <duration>` (add `--fix fixes.json` for corrections).
- Render: `python3 soft3d.py work/timeline.json --video work/video_silent.mkv` (about a minute for 30 s). WebGL path: `bash render_chunks.sh <proj> <frames>` (12 s chunks, retry, mkv).
- Finish: `bash finish.sh work/video_silent.mkv work/mix.wav work/cap.ass out/<slug>.mp4 <slug> <pivot_s>`. It scales to 1080x1920, applies the pivot fade, burns the captions, encodes H.264 CRF 17 + AAC, then runs `postmortem.py`.
- Postmortem checks: fps, size, A/V drift, loudness, black or frozen spans, a dead camera, stagnant windows, repeated shots, hard cuts, captions present. Every finding is filed into `memory/lessons.jsonl`.
- Look at the contact sheet in `reports/<slug>_sheet.jpg` (the tool can't judge beauty), fix, and re-render if needed.
- Deliver the MP4 with a few lines on what each shot shows, then the Stage 5 publish pack.

## Stage 5: Publish pack (with every MP4)
3-4 title options (question or surprise, no overclaims), a two-line description, hashtags, and two or three variants of the closing line. State honestly what is legend or disputed.

## Runbook (copy-paste, in order)
`K=<skill>/kit/tools; P=~/shorts/<slug>; mkdir -p $P` then put `voice.mp3`, `script.txt` (with `|` at every pause), `story.json`, `callouts.json` in `$P`.
1. `bash $K/build.sh check $P` (timing must say EXACT segment match; storyboard must have no ERROR)
2. `bash $K/build.sh stills $P` then LOOK at `$P/sheet.jpg` and fix the story/scene
3. `bash $K/build.sh render $P 1 2` then `bash $K/build.sh render $P 2 2`
4. `bash $K/build.sh finish $P <pivot_seconds>` -> `$P/out/video.mp4` + postmortem
5. Look at 8-9 frames of the final video (captions, callouts, end card), file lessons, deliver with the Stage 5 pack.
Examples to copy from: `kit/examples/{malqaf,molasses,dish}/` (story.json, callouts.json, script.txt) and `kit/examples/previews/` (360p previews of the look).

## Optional add-on: line-art-animation
The user asked to adopt https://github.com/JDhruv14/line-art-animation (MIT; SVG line-art figures with a gait solver, springs, day/night palette, deterministic capture). It could not be cloned in the build sandbox (no network). Read `kit/references/line-art-animation.md`; when network works run `bash <skill>/kit/tools/install_lineart.sh`. Use its ideas to make our actors move properly (planted feet, spring secondary motion, day/night mood), or offer a separate line-art style.

## Self-improvement loop (mandatory)
1. Before a build: `lessons.py brief`.
2. After a build: read the postmortem, look at the sheet, add human-judged lessons: `lessons.py add vis:<key> "what went wrong + the fix" --area visual --sev 2`.
3. File every user comment as a lesson (`--source user`). Repeats raise the count and rise to the top of the brief. When a lesson is fixed for good: `lessons.py resolve KEY "how"`.
4. Compare with the reference style: `python3 analyze_video.py out.mp4` against `references/profile_chicken_coop.json`.
5. Log every shipped upgrade in `references/changelog.md` (textures, actors, new props, better lighting, WebGL engine).

## Engine gotchas (kept in the kit; keep them if rebuilding)
- Clip polygons against the near plane before projecting (Sutherland–Hodgman) or a face behind the camera smears across the frame.
- Painter's sort by mean depth, far to near; cull back faces only on closed boxes with stored outward normals.
- Floor grid lines: clip to the near plane, fade to the floor colour with distance, and thin the lines with distance.
- Camera pose is a pure function of the frame: focus point + spherical offset (distance, azimuth, elevation) + move; add the 3 % creep and the 18-frame blend.
- Fades and captions are applied after the render (`finish.sh`, ASS), so they can change without re-rendering.
- ASS captions: strip trailing punctuation (a colon flips to the wrong side in right-to-left text), keep `PlayRes` equal to the video size.
- `timing_ar.py` weights words by letter count; a pause-aligned script is far more accurate than punctuation guessing.

## Architecture (reference for editing the kit)
- `kit/tools/soft3d.py`: CPU renderer. Reads `timeline.json`, builds the world from `PROPS`, projects faces with a pinhole camera, draws floor, faces, particles and 2D overlays (sun, arrow, pulse, sparks, shockwave, flash, outro), applies vignette, pipes raw frames to ffmpeg. Exposes `--stills` and `--video`.
- `kit/engine/`: the WebGL version of the same contract (`main.js`, `props.js`, `motion.js`, `index.html`) with `window.renderFrame(f)` and `window.ready`; `tools/render.mjs` captures frames through Playwright. Untested until `tools/smoke.sh` passes.
- `kit/tools/`: `build.sh` (check/stills/render/finish), `env_check.sh`, `setup_project.sh`, `lessons.py`, `analyze_video.py`, `postmortem.py`, `timing_ar.py`, `storyboard.py`, `sfx_synth.py`, `mix.py`, `captions.py`, `render_chunks.sh`, `finish.sh`, `sheet.py`, `smoke.sh`.
- `kit/references/`: `style-lock.md` (the locked style), `style-bible.md` (measured from the reference video), `open-source-stack.md`, `story_example.json`, `profile_chicken_coop.json`, `changelog.md`.
- `kit/examples/malqaf/`: the worked example (story, words, timeline, script with pause breaks).
- `kit/memory/lessons.jsonl`: the self-improvement memory.
