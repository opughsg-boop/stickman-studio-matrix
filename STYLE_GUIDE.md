# Diorama Studio: complete style guide (LOCKED: hyper-realistic look, after the sugar-cane upgrade)

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
6. **Hyper-realism (LOCKED):** a real sky, natural light, and every object with its natural shape, material and real size (see 2b). The old blue blueprint room is retired, so use it only if the user asks (`env.sky:false`).
7. **Spoken language:** general Egyptian Arabic by default. Every script opens with a curiosity *question* hook plus a strong *visual* hook in the first second.

## 2b. THE LOCKED LOOK: hyper-realistic natural simulation
Target: the user's three reference reels (Spanish: rabbit hutch build-up, sugar-cane burning, beehive build-up). Everything must look like it lives its real life.

**Built into the engine (`renderer/scene.js`), on automatically:**
- **Real sky (default):** an HDRI daylight sky with clouds (`kloofendal_48d_partly_cloudy_puresky`) gives image-based lighting and a warm sun. The island floats over open water and keeps its real soil cross-section.
  - Other skies: `env.sky:'forest_slope'`. Tuning: `skyBlur`, `envLight`, `fog`, `water`.
  - `env.sky:false` brings back the old blueprint room (only if asked).
  - HDRIs are committed in `assets/hdri/`.
- **Smoke:** soft billowing sprite puffs, dark at the bottom and grey higher up (`type:'smoke'`: `h`, `w`, `scale`, `color`, `top`, `opacity`, `drift`). Always place smoke **behind** the subject, never between it and the camera.
- **Fire:** flickering flame sprites with rising embers and an orange glow light, sweeping across an area (`type:'fire'`: `w`, `d`, `count`, `sweep` seconds, `trail`).
- **Sugar-cane pack:**
  - `cane_field`: textured, curved leaf blades, dry hanging leaves and wind sway. Options: `burnt`, `leaves:false`, `dry:false`.
  - `cane_cut`: a giant cut stalk with juice drips (`burnt:true` blackens the skin).
  - `critters`: rats and snakes (`flee:true` makes them run).
  - `truck`: real size by default, `scale` 1.7. Options: `path`, `travel`, `color`.
- **Critic:** the self-review knows the sky mode, so it does not ask for the blue room.

**Rules for every new plan:**
1. **Real models first:** Quaternius animals and people (`type:'glb'`), Poly Haven ground cover, rocks and props (`ph/<id>`), real soil. Hand-built primitives only when nothing real exists, and then give them textures or natural colour variation, never flat single colours.
2. **Real sizes, in metres:** person 1.75, cow 1.4, horse 1.9, donkey 1.3, fox 0.6, dog 0.7, sheep or goat 0.9, chicken 0.4, rat 0.25 long, sugar cane 3-3.5, maize 2.2, wheat or rice 1, palm 8-12, small tree 4-6, barrel 0.9-1.3, cart 1.4, cane truck 2.5. Magnify on purpose only for an "x-ray" explainer prop (like the giant cut stalk), and show it beside the real thing.
3. **Alive:** animals always play a clip (Eating, Walk, Idle_2…) or walk a `path`. Plants sway. Smoke, fire, water and clocks move. Nothing is frozen.
4. **Dense and natural:** fields of 120-200 stalks with varied heights. Scatter grass, shrubs and stones over the bare soil.
5. **Bright daylight:** keep exposure up and avoid dark beats (the critic flags luma < 60). Burnt or night beats get a closer and brighter camera.
6. **Story styles that match the references:**
   - **Build-up:** "تحط كذا… بس مشكلة… فـ الحل… اسمه كذا". Each line adds a real part, as in the rabbit hutch and the beehive.
   - **Inside-the-process story:** a strange event, then the camera dives inside to explain it, as in the sugar cane.

**Still missing (next upgrades):** detailed vehicle models (the truck is still built from boxes), real rat, snake and rabbit models, a backdrop option (a plastered house wall with a window), and instanced fields for even denser crops.

## 3. Diorama building blocks (the world is now the real-sky island of 2b)
**World:**
- A floating island with a cross-section soil edge, under a real sky over open water (the blue blueprint room is retired).
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
1. **Hook (line 1):** a curiosity **question** with a strange twist, paired with a strong visual in the first second. Example: "ليه الفلاح في الصعيد بيولّع النار في غيط القصب بإيده… والقصب نفسه ما بيتحرقش؟!" (visual: a green field with a huge black smoke column). Older claim-style hooks also work: "الحصان ده ممكن يكسر الإسطبل برفسة واحدة!".
2. **3-4 problem/fix pairs:** "بس …" (problem) → "فـ …" (fix). For facts or stories use "ده بسبب إن…" → "بس…" → "فـ…" → a surprise instead.
3. **Tip:** "وخلي بالك: …" with one surprising detail.
4. **CTA (no page name unless the user asks):** "لو عرفت حاجة جديدة، اعمل لايك وتابع عشان تعرف أكتر!" In English: "If you learned something new, like and follow. Your brain will thank you."

**Voice = a natural Egyptian telling a friend:** conversational fillers ("بُص", "أُمّال", "يعني"), short sentences, not a news-reader tone.
**Diacritics (user rule):** add tashkeel ONLY to words an AI voice could misread or that Egyptians pronounce differently, e.g. مَيّة (water), الفحّام, بيرُصّ, على القَدّ, بيستوِي, تبرَد, حوالَي, رُبعه, أُمّال. Never add tashkeel to the whole script. Strip it from `runs/<name>/script.txt` only if alignment fails (the aligner normally ignores it).
TTS style line for this voice: "اقرأ كأنك واحد مصري عادي بيحكي حكاية لصاحبه، بالعامية المصرية، صوت دافي وطبيعي ومش مستعجل، فيه فضول في أول سؤال، وقفة صغيرة قبل «بس» و«وخلي بالك»، وآخر جملة بابتسامة".
Story in progress: **charcoal (الفحم)**, a build-up of the wood pile, straw and mud cover, small air vents, the smoke colour turning from white to thin blue, sealing and cooling. Use smoke (white `color:'#d9d6d0'`, then bluish), a fire glow inside the mound, and a real-size Worker.

Write one spoken sentence per line. When giving a script to record, add a TTS style line on top: "اقرأ باللهجة المصرية، راوي متحمس وسريع، وقفة قصيرة قبل «بس» و«وخلي بالك»، آخر جملة بنبرة ودودة". The user records with ElevenLabs (Hazem for Egyptian Arabic, Felix for English) or Google AI Studio. Scripts can also be in American English (`--lang en`); the captions then switch to English automatically.

## 5. One video = one command
1. Save the script to `runs/<name>/script.txt`, one spoken line per line.
2. Write `plans/<name>.mjs`, copying the closest proven plan:
   - `plans/cane.mjs`: sugar cane, the hyper-realistic look (sky, smoke, fire, field, trucks). **Best template now.**
   - `plans/stable.mjs`: horse stable, uses the realistic library.
   - `plans/cow.mjs`: cow with an x-ray stomach prop.
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
| Sugar cane, hyper-realistic (sky, sprite smoke and fire) | **98** |
| Sugar cane, first version | 95 |
| Cow, four stomachs (English) | 100 |
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
