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
6. **Hyper-realism (LOCKED):** a real 3D sky, natural light, and every object with its natural shape, material and real size (see 2b). The old blue blueprint room is retired, so use it only if the user asks (`env.sky:false`).
7. **Spoken language:** general Egyptian Arabic by default. Every script opens with a curiosity *question* hook plus a strong *visual* hook in the first second.

## 2b. THE LOCKED LOOK: hyper-realistic natural simulation
Target: the user's three reference reels (Spanish: rabbit hutch build-up, sugar-cane burning, beehive build-up). Everything must look like it lives its real life.

**Built into the engine (`renderer/scene.js`), on automatically:**
- **3D sky (default, LOCKED 2026-11-14 after the user approved the cow test):** a real 3D atmosphere dome (three.js Sky addon, Preetham model) plus scattered 3D cumulus clouds that drift. No photo backdrop.
  - The same sky lights the scene (image-based light with the same `skyGain`), so colours and shadows stay natural. Sun sits behind the camera and to the right (`sunAz` 35, `sunElev` 45).
  - The island floats over a sea that is darker than the sky at the horizon.
  - Tuning: `sunElev`, `sunAz`, `turbidity` (2.5), `rayleigh` (2), `skyGain` (.4), `skyTint`, `clouds` (9), `fog`, `water`.
  - Photo HDRI sky only if asked: `env.sky:'kloofendal_48d_partly_cloudy_puresky'` or `'forest_slope'` (files in `assets/hdri/`). `env.sky:false` = old blueprint room.
- **Animals in the 3D-sky look:** low-poly meshes are welded and smooth-shaded automatically, and their material is matte (roughness .92), so no flat triangles and no plastic shine (`env.smoothAnimals:false` turns it off).
- **Real people:** a scanned human from Renderpeople, `model:'people_rp/rp_posed_00178_29', height:1.75` (static pose; fetched by `assets/fetch_people.sh`, which `fetch_library.sh` runs). Prefer it over the Quaternius people for close shots.
- **Smoke:** soft billowing sprite puffs, dark at the bottom and grey higher up (`type:'smoke'`: `h`, `w`, `scale`, `color`, `top`, `opacity`, `drift`). Always place smoke **behind** the subject, never between it and the camera.
- **Fire:** flickering flame sprites with rising embers and an orange glow light, sweeping across an area (`type:'fire'`: `w`, `d`, `count`, `sweep` seconds, `trail`).
- **Sugar-cane pack:**
  - `cane_field`: textured, curved leaf blades, dry hanging leaves and wind sway. Options: `burnt`, `leaves:false`, `dry:false`.
  - `cane_cut`: a giant cut stalk with juice drips (`burnt:true` blackens the skin).
  - `critters`: rats and snakes (`flee:true` makes them run).
  - `truck`: real size by default, `scale` 1.7. Options: `path`, `travel`, `color`.
- **Critic:** the self-review knows the sky mode, so it does not ask for the blue room.
- **Stickers instead of arrows:** 3D emoji stickers (`type:'sticker'`, `assets/stickers`, 65 names: pointing hands, arrows, circle ring, ✓ ✗, faces, microbe, organs, farm animals). They face the camera and pop in.
- **Anatomy window:** `cutBox`/`cutOpen` opens a window in the flank, organs inside in real places with real textures (rumen with grass, honeycomb reticulum, leafy omasum, folded abomasum, intestines). Reference: `plans/rumen_window.mjs`.
- **Learn from mistakes:** read `memory/visual_lessons.md` before every plan, and add each new mistake after every preview. Improve realism one step at a time and re-check.

**Realism v2 (2026-11-15, `renderer/realism.js`, ON by default for every plan, old plans render unchanged otherwise):**
- **Sharper picture:** the CPU render is now 630x1120 (was 540x960), with FXAA and an unsharp mask in the final shader, then upscaled to 1080x1920. `--w 720 --h 1280` is sharper but slower. `--gpu` renders the full 1080x1920 with 4x MSAA.
- **Post chain:** HDR scene, soft bloom at half resolution (only the sun glint, fire and glowing parts bloom), then OutputPass (ACES tone mapping and sRGB, as in cine.js), then a display-space grade: gentle S-curve, warm highlights, slightly teal shadows, vignette and very light film grain.
  Knobs: `style.post:false` (the old direct render), `bloom` (.22), `bloomThreshold` (1.05), `grade` (0-1), `sharpen` (.35), `vignette` (.2), `grain` (.014), `aa` (MSAA samples, 0 on CPU), `fxaa:false`, `aniso` (8, 0 = off).
- **Horizon:** a fogged landscape ring 190-340 m away with hills (vertex-colour variation), a tree line, palms and a small village. Use `env.horizon:'hills'` (default), `'nile'` (green plain, palm line, mud-brick village, pale desert ridge), `'desert'` or `false`. Also `env.haze` (.55) and `env.horizonDist` (190). The camera far plane is now 1000.
- **Ground cover:** thousands of instanced grass tufts swaying in the wind, plus pebbles and tiny flowers on the island top. Flat props such as water, boards and cracked mud are left clear. Instances cast no shadows. Use `env.cover:'low'|'medium'|'high'|<tufts per m2>|false`, `env.coverTint:'dry'` (straw-coloured, no flowers), `env.coverGain` (1.3) and `env.coverShadow:false`.
- **Water:** two scrolling wave normal layers and a soft breathing foam band under the island edge. Use `env.waves` (1, 0 = flat) and `env.foam:false`.
- **Life in the air:** sunlit dust and pollen motes drift near the camera (`env.motes`, 1, 0 = off). Flying birds (white storks by default) make slow loops 35-70 m away with flapping wings. Use `env.birds` (3) and `env.birdModel:'Stork'|'Flamingo'|'Parrot'` or a list. Any `assets/models/<name>.glb` can also be placed as `model:'models/<name>'`.
- **Camera:** handheld micro-motion of about 1 cm on top of the continuous camera, never a jump (`style.handheld`, 1, 0 = off).
- **Shadows:** 2048 px, with the frustum fitted to the island, so they are about 2.6x sharper (`style.shadowRes`, `style.shadowFit:false`).
- **Timing (4-core cloud CPU, 8 s test clip of `beans`):** old 540 px took 136 s. v2 at 630 px takes 199 s (1.46x), and v2 at 720 px takes 230 s (1.69x; 2 workers instead of 3 gives the same time). A 45 s video takes about 25-30 min on the CPU. 4x MSAA in software GL would add about 60%, so on the CPU it stays off. `node pipeline/bench.mjs PLAN.json --w 630 --h 1120 --style '{...}' --env '{...}'` measures the cost per frame.
- **Critic:** freeze detection works on a downscaled copy, so the film grain cannot hide a frozen picture. The luma of the beans preview moved by only about -3, so the thresholds are unchanged.

**Rules for every new plan:**
1. **Real models first:** Renderpeople scanned people, Quaternius animals (`type:'glb'`), Poly Haven ground cover, rocks and props (`ph/<id>`), real soil. Hand-built primitives only when nothing real exists, and then give them textures or natural colour variation, never flat single colours.
2. **Real sizes, in metres:** person 1.75, cow 1.4, horse 1.9, donkey 1.3, fox 0.6, dog 0.7, sheep or goat 0.9, chicken 0.4, rat 0.25 long, sugar cane 3-3.5, maize 2.2, wheat or rice 1, palm 8-12, small tree 4-6, barrel 0.9-1.3, cart 1.4, cane truck 2.5. Magnify on purpose only for an "x-ray" explainer prop (like the giant cut stalk), and show it beside the real thing.
3. **Alive:** animals always play a clip (Eating, Walk, Idle_2…) or walk a `path`. Plants sway. Smoke, fire, water and clocks move. Nothing is frozen.
4. **Dense and natural:** fields of 120-200 stalks with varied heights. Scatter grass, shrubs and stones over the bare soil.
5. **Bright daylight:** keep exposure up and avoid dark beats (the critic flags luma < 60). Burnt or night beats get a closer and brighter camera.
6. **Story styles that match the references:**
   - **Build-up:** "تحط كذا… بس مشكلة… فـ الحل… اسمه كذا". Each line adds a real part, as in the rabbit hutch and the beehive.
   - **Inside-the-process story:** a strange event, then the camera dives inside to explain it, as in the sugar cane.

**Still missing (next upgrades):** cloud shadows, SSAO/depth of field (too slow in software GL), detailed vehicle models (the truck is still built from boxes), real rat, snake and rabbit models, a backdrop option (a plastered house wall with a window), and instanced fields for even denser crops.

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
**Diacritics (user rule):** add tashkeel ONLY to words an AI voice could misread or that Egyptians pronounce differently, e.g. مَيّة (water), الفحّام, بيرُصّ, على القَدّ, بيستوِي, تبرَد, حوالَي, رُبعه, أُمّال. The user found sparse tashkeel too little, so be generous on every word an AI voice might read in fuṣḥā. That means every Egyptian present verb with بيـ/بتـ/يـ (بيِزرَع، بتِتعَب، يِعرَفش، بيِفضَل), pronoun endings (بعدُه، أغلَبُه، ياخدُه), doubled letters (الشّاطِر، شَغّالة، الزَّرع), and words with an Egyptian vowel (الهَوا، صُغيّرة، حُبَيبات، وَرْدي). Common unambiguous words (في، من، اللي، ده، الأرض) stay bare. Never add tashkeel to every letter of the script. Strip it from `runs/<name>/script.txt` only if alignment fails (the aligner normally ignores it).
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
