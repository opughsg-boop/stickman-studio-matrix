# Diorama Studio: complete style guide (the approved style after the last update)

> **To Claude in a new conversation:** this file is everything decided with the user so far. Follow it exactly.
> The user speaks Egyptian Arabic and is not technical. Reply in short, simple Egyptian Arabic, never ask them to run commands, and keep the conversation short to save their daily usage (one video per conversation).
> Code: GitHub `opughsg-boop/stickman-studio-matrix`, branch **`diorama-studio`**. Run `git checkout diorama-studio` if needed.

---

## 1. Setup (fresh container, about 3 minutes, do it silently)
```bash
npm install
pip install faster-whisper yt-dlp
ln -sfn "$(npm root -g)/playwright" node_modules/playwright
bash assets/fetch_library.sh        # semi-realistic animals, people, trees, crops (~46 MB, CC0 Quaternius)
python3 assets/fetch_polyhaven.py   # realistic grass, shrubs, rocks, props and soil textures (~130 MB, CC0 Poly Haven)
```
- Chromium, Playwright and ffmpeg are preinstalled. Never reinstall them.
- Delegate setup, waiting for renders and git chores to the cheap `routine-runner` subagent (Haiku).

## 2. STYLE LOCK (the user's decisions, never change without being asked)
1. **No words on screen** except the spoken captions: no signs, labels, counters, pins or button text. Only wordless icons are allowed: ✓, ✗, arrows, the clock.
2. **Transition sound:** the soft low "whoom" (`soft_transition`). The hissy "تش تش" whoosh was rejected.
3. **Camera:** continuous and never still, with no hard cuts (`camEase` 0.6, `punch:false`). Zoom in and zoom out alternate between beats.
4. **Captions:** 2 words at a time, never mixing two spoken lines. White bold Arabic, at 78 % of the frame height, aligned to the user's exact script.
5. **Format:** 1080x1920, 30 fps, H.264 + AAC, -14 LUFS.

## 2b. NEXT TARGET: hyper-realism (user request, after the sugar-cane video)
The user loved the cane video but wants future videos as hyper-realistic as their three reference reels (Spanish: rabbit hutch build-up, sugar-cane burning, beehive build-up). What those references do and ours still lacks:
- **Real sky and surroundings:** a daylight HDRI sky with clouds, distant trees and a horizon, or a real backdrop (a plastered house wall with a window). The island still floats over water, with a real soil cross-section. Not the blue grid room.
- **Dense, detailed vegetation:** hundreds of real-looking stalks and leaves with natural colour variation, plus walk-through shots *inside* the crop between the stalks.
- **Real materials everywhere:** wood grain, wire mesh, corrugated metal, PBR textures. Never plain-coloured primitives (no cone flames, sphere animals or box trucks) when a real model or texture exists.
- **Volumetric-looking effects:** soft billowing smoke sprites, real fire sprites and embers, not solid spheres or cones.
- **Living animals:** real animated models (rabbits, bees, snakes, rats, birds) doing natural things: walking, sniffing, eating, fleeing.
- **Natural sunlight:** soft shadows, bright exposure, warm daylight grade.
**Done so far (realism upgrade v1, in `renderer/scene.js`):**
- `env.sky:'<hdri>'` gives a real HDRI sky with image-based lighting, a warm sun and the island floating over open water, with no blue grid room. HDRIs live in `assets/hdri/` (`bash assets/fetch_assets.sh`): `kloofendal_48d_partly_cloudy_puresky` (default daylight) and `forest_slope`. Options: `skyBlur`, `envLight`, `fog`, `water`.
- **Use `env.sky` in every new plan from now on.**
- Smoke and fire are soft sprites: billowing puffs that go from dark to grey, flickering flame sprites, embers and a fire glow light.
- The cane field has textured, curved leaf blades and dry hanging leaves.
- **Still to do:** realistic vehicles (the truck is still boxy), real rat, snake and rabbit models, a backdrop option (a house wall), and denser instanced fields.

## 3. The approved look: realistic blueprint diorama
**World:**
- A floating island with a cross-section soil edge, inside a blue blueprint grid room with soft light rays.
- The island top uses a **real soil texture** (`env.soil`).

**Story = scene build-up:**
- Each spoken line is one beat. Every beat adds or changes something on the island:
  - **Problem beat ("بس…"):** red ✗, a red edge flash, and the problem shown literally (heat haze, rain and night, mess, an animal in trouble).
  - **Fix beat ("فـ…"):** green ✓, a white flash, and the fix drops or grows into place with dust and a landing impact.
- **Cutaway rule:** walls, fences or mesh facing the camera are removed or lowered, so the subject is always visible.
- The last beat is a wide orbit that pulls out.

**Assets, in order of preference:**
1. **Semi-realistic animated animals and people** (`type:'glb'`, from `assets/lib`; names and clips in `assets/lib/catalog.json`):
   - Animals: Cow, Bull, Horse, Horse_White, Donkey, Alpaca, Deer, Stag, Fox, Wolf, Husky, ShibaInu.
   - Animal clips: Idle, Idle_2, Idle_Headlow, Walk, Gallop, Eating, Attack_Kick, Attack_Headbutt, Death, Jump.
   - People (static, the arms are dropped automatically, `wave:true` adds a gesture): Farmer, Worker, Casual, Suit, Adventurer (men and women).
   - Nature: 150 trees, bushes and rocks (`nature_pack`, `simple_nature_pack`). Crops by growth stage (`crops_pack`, 102). Fish, shark, dolphin, whale. Village props: barrels, carts, wells, bags.
2. **Realistic ground layer** (`model:'ph/<id>'`, Poly Haven): grass, shrubs, flowers, ferns, moss, rocks, boulders, stumps, fruit and vegetables, a barrel, a sprinkler, tools, a ladder, a chain-link fence, a wooden pier, a fire pit.
   - Real soil: `brown_mud_leaves_01` (default), `forrest_ground_01`, `aerial_grass_rock`, `coast_sand_rocks_02`.
3. **Hand-built packs** in `renderer/scene.js`, used only when the library has nothing fitting: farm (posts, corrugated roof, wire mesh, perches, nest boxes), bees (hive, frames, bees, queen), goats (herd, fences, shelter, hay feeder, rain), ants (ant farm, 24h clock, film camera), and generic walls, arrows, water, heat haze (`color` param), hay (`color` param).

**Plan snippet:**
```js
{ id:'cow', type:'glb', pos:[0,0,0], params:{ model:'animals_pack/Cow', height:1.4, clip:'Eating', path:[[x1,z1],[x2,z2]], pathSpeed:.25 } }
// change the action per beat:
modes: { cow: { clip:'Walk', path:[[0,0],[2,-2]] } }
```

**Proven numbers:**
- Close shots: camera distance of at least about 5.
- Whole-island wide shots: distance 12-14.
- Keep exposure up: dark wood and night scenes were the main critic complaint.
- Horse size: `height` 1.9.

## 4. Script formula (Egyptian Arabic, 30-45 s, 70-100 words)
1. **Hook (line 1):** a shocking or strange claim. Examples: "الحصان ده ممكن يكسر الإسطبل برفسة واحدة!", "عشة الفراخ الغلط بتتعب فراخك من أول يوم!".
2. **3-4 problem/fix pairs:** "بس …" (problem) → "فـ …" (fix). For facts or stories use "ده بسبب إن…" → "بس…" → "فـ…" → a surprise instead.
3. **Tip:** "وخلي بالك: …" with one surprising detail.
4. **CTA:** "لو استفدت، اعمل لايك وتابع صفحة وسّع مخك... عشان مخك يوسع!"

Write one spoken sentence per line. When giving a script to record, add a TTS style line on top: "اقرأ باللهجة المصرية، راوي متحمس وسريع، وقفة قصيرة قبل «بس» و«وخلي بالك»، آخر جملة بنبرة ودودة". The user records with ElevenLabs (Felix) or Google AI Studio.

## 5. One video = one command
1. Save the script to `runs/<name>/script.txt`, one spoken line per line.
2. Write `plans/<name>.mjs`, copying the closest proven plan:
   - `plans/stable.mjs`: horse stable, uses the realistic library. **Best template.**
   - `plans/coop.mjs`: chickens.
   - `plans/goats.mjs`: goats.
   - `plans/ants.mjs`: ants.
   - `plans/bees.mjs`: bees.
3. Optional: one preview check with `node pipeline/render.mjs runs/<name>/plan.json x runs/<name> --preview`, then look at `sheet_preview.jpg` once.
4. Full run in the background (about 10 min for 40 s):
   ```bash
   node run.mjs --audio <voice> --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name>
   ```
   It transcribes (faster-whisper), aligns the exact script (`pipeline/align.py`), previews, adds SFX, renders, runs the self-review and updates `memory/`.
5. Send `runs/<name>/final.mp4`. Reply in 3-4 lines with the score, plus a title and hashtags.
6. Commit the plan and `memory/`, then push to `diorama-studio`. If the push is rejected, rebase and keep both sides of the `memory` files.

## 6. Results so far (self-review scores)
| Video | Score |
|---|---|
| Horse stable (realistic library) | **93** |
| Ant colony | **93** |
| Chicken coop | 90 |
| Spear-bird (cine style) | 83 |
| Bee hive | 78 |
| Goat pen | 73 |

Other sessions also made pyramids, a pole barn and drip irrigation (see `plans/` and `stories/`).

## 7. Posting
- **Title:** the hook line plus an emoji.
- **Description:** 2 lines, then "تابعني لفيديوهات أكتر 👆".
- **Hashtags:** 4-5 topical ones, plus #وسع_مخك.

## 8. Installed tools (do not reinstall)
- **HyperFrames** (HTML to video, with skills) and **Remotion** (React to video).
- **yt-dlp:** use `--js-runtimes node`.
- **faster-whisper:** replaces openai/whisper on purpose.
- **animation-principles:** 17 active skills (Disney's 12 principles). Apply them to motion: anticipation, squash and stretch on landings, arcs, slow in/out.
- **Second engine, "cine"** (fast-cut 3D reels with glTF actors and HDRIs): `STYLE_ZD.md`, `stories/spear.json`. Its models and HDRIs come from `bash assets/fetch_assets.sh`. It is not the main style now.
- **Not usable:** OpenCode, because the session's security blocked installing another AI agent, and it would not save usage anyway.
