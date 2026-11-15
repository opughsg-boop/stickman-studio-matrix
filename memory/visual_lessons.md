# Visual lessons (read BEFORE planning any video; add to it AFTER every video)

Rule: when a preview or final video shows a mistake, add one entry here (what was wrong, the fix, the source). Next time, check the plan against this list before rendering.

## Sky
- **Mistake (2026-11-14 test scene):** the sky looked like a flat blue gradient with a hard horizon line and no clouds.
  - Checked (iteration 1): the HDRI file is valid and has real clouds, and the render logged no `sky failed` warning. So the fallback is NOT the cause. The renderer now forwards browser warnings to the log, so this check is visible next time. Next suspect: the fog or the camera hides the sky.
  - Earlier guess: the HDRI in `renderer/scene.js` (line ~408) is wrapped in try/catch. If it fails, the scene silently falls back to the flat colour `#3d7fd0` (line ~368). **Verify first** that `sky failed` is not in the render log before blaming the look.
  - Fix: a real sky has a deeper blue at the top, a paler haze at the horizon, soft clouds with flat bases, and a warm glow near the sun.
  - Sun: a small sun gives sharp shadows, a large one gives soft shadows. The sun must be high enough to light the foreground, or the scene looks dim.
  - Source: [Architizer, 6 tips for skies](https://architizer.com/blog/?p=14056), [Lumion real skies guide](https://lumion.com/tips-guides/real-skies-guide-2024), [Poliigon hazy sunset HDRI](https://www.poliigon.com/hu/hdri/hazy-sunset-outdoor-sky-hdri/3531).

- **Fixed (iteration 2, 3D sky `env.sky:'sky3d'`):**
  - The sky was never drawn: an edit put `scene.add(sky)` after a `//` comment on the same line. Lesson: after any sed/regex edit, check the edited line, and test by setting the background to magenta. If magenta shows, the sky is missing.
  - Scene washed out: the Preetham sky gives very bright values. The visible sky AND the sky used for lighting (PMREM) need the same gain (`skyGain` .4), or the scene is lit by a far too bright sky.
  - White sky and dark subject: the sun was in front of the camera. Default sun is now behind the camera and to the right (`sunAz` 35, `sunElev` 45), like a well-lit daytime photo.
  - The sea looked like sky: the sea must be darker than the sky at the horizon (no fog on it, little mirror).
  - Still open: the visible sky near the horizon is pale grey-white; the clouds are not in frame yet.

## Ground and soil
- **Mistake (test scene):** the soil and grass looked uniform, with the same colour everywhere.
  - Fix: mix soil with grass, dead blades, and small debris. Break up the colour with noise. Vary the texture scale slightly so the tiling does not repeat.
  - Keep the cutaway edge of the island with real soil layers.
  - Source: [aitextured PBR ground guide](https://aitextured.com/articles/comprehensive-guide-pbr-ground-surface-textures-realistic-3d-environments.html), [aitextured soil texture article](https://aitextured.com/articles/creating-seamless-pbr-textures-realistic-organic-soil-earth-surfaces.html).

## Animals
- **Mistake:** I described the cow in the test as realistic. It is a low-poly Quaternius model, which is stylised.
  - Fix: say plainly when a model is stylised. Use a real-looking model only when one with a licence we can use exists (Sketchfab CC-BY models need a token, see the notes in the chat history).

- **Fixed (iteration 2):** the low-poly cow showed flat triangles and looked like plastic. In 3D-sky plans the animal meshes are now welded and smooth-shaded, and their material is matte (roughness .92). Real hide is never shiny.

## People
- **Mistake (test scene):** the person was not visible in the first beat, so the camera framing was wrong.
  - Fix: check that every subject is inside the frame in each beat before calling a preview good.
- Scale check that passed: the Renderpeople GLB is in centimetres (height 172 units), so `height:1.75` scales it to a real person.
- Source for the model: [Renderpeople free models](https://renderpeople.com/free-3d-people/). The download is a free GLB sample, and the page says free models may be used commercially.

## Inside / x-ray dives (sample: plans/rumen_dive.mjs, 2026-11-14)
- **Works:** `glb` with `opacity:.2` gives a see-through body, and a camera dive in 2 steps (dist 3.6 then 1.9) reads as "going inside".
- **Mistake 1:** at dist 1.9 the view is only the stomach surface, so the viewer cannot tell where they are. Fix: stop at dist 3.2-3.6 with the body outline visible, and add a short cut-in only for the last step.
- **Mistake 2:** the stomachs are flat pink spheres, which is not medical. Fix: use textured, glossy tissue with folds (rumen papillae), translucent when inside. Still open.
- **Researched (2026-11-14, extension sources):** rumen inside = brown, fuzzy papillae (like shag carpet); reticulum = honeycomb; omasum = stacked leaves/folds; abomasum = folded light brown-pink glandular lining. The stomach is one organ with four chambers. Now used as canvas textures in `custom` parts (`tex`, `wobble`).
- **Fixed:** camera now stops inside the body (dist .55 from the rumen) and the x-ray body is visible (opacity .45).
- **Still open:** papillae read as a dark wood-grain sphere, and the stomachs still poke through the belly on the zoom beat.
- **Mistake 3:** the x-ray body is faint. Fix: opacity .3 and a thin darker outline.

## Process
- Judge a preview with the critic in mind: luma above 60, no dark beats, no flat colours.
- Before saying a scene is realistic, list in one line what is still stylised (animals, sky, grass), so the user knows what is real and what is not.
- Pure stills are not enough for motion. Check at least one beat with a clip or a path.

## Cartoon short: The Empty Chair (2D cartoon, dinner scene)
- **Mistake:** the mother's long hair was drawn over her face and chest, so she looked bearded. **Fix:** draw long hair behind the head and keep it short at the sides. **Source:** our own render check of frames 150 and 600.
- **Mistake:** the voice-over was an upbeat "Confident, Playful" voice, which weakens a sad story. **Fix:** check the voice's style against the story's mood before rendering. **Source:** the ElevenLabs file name the user sent.
- **Mistake:** caption times overlapped, so two lines showed at once. **Fix:** clip each caption's end to the next caption's start. **Source:** frame review of the encoded video.

## Glossy "toy" reference look (sample: plans/sneeze_ref.mjs + renderer/cine_ref.js, 2026-11-14)
- **Mistake:** first pass was pastel and washed out (pale pink organs, pale floor), unlike the saturated reference. **Fix:** exposure .9, key 2.2, fill .5, env .6, grade sat 1.15, and deeper base colours (#e3566f lungs, #1c64c8 box). **Source:** reference frames (deep red heart, dark purple sky) vs our first stills.
- **Mistake:** the sunset sky showed only orange-pink, because the camera looks slightly down at tabletop scale and the purple started too high. **Fix:** squeeze the gradient: orange band at 0-.025, red .08, purple by .18. **Source:** reference contact sheet (horizon at ~45 % of frame, purple above).
- **Mistake:** the lungs were built upside down in shape (narrow at the bottom). Real lungs have a narrow apex at the top and a broad concave base on the diaphragm. **Fix:** lobe width grows toward the base. **Source:** basic anatomy (lung apex vs base).
- **Mistake:** the camera ended level with the throat valve, so the "snaps shut" disc was edge-on and invisible. **Fix:** end the camera above the larynx looking down into it. **Source:** our still at 13.0 s.
- **Mistake:** nose cilia read as long white grass. **Fix:** shorter, thicker, pink cilia, fewer of them, and a higher camera angle on the lining. **Source:** our still at 4.2 s.
- **Mistake:** the air-burst particles (InstancedMesh starting at zero scale) never showed: three.js computed an empty bounding sphere and frustum-culled them for the whole shot. **Fix:** `frustumCulled = false` on instanced particle meshes (burst, spray). **Source:** sneeze_full contact sheet 19.6-21.5 s (2026-11-14).
- **Mistake:** a 1 m effect (air burst) and the person who makes it were framed at ~1 m distance in a 9:16 frame; the frame is only ~0.35 m wide there, so the person fell off the left edge. **Fix:** for wide horizontal actions in vertical video, pull back to ~1.8 m or point the action toward/away from the camera. **Source:** sneeze_full sheet, line 6.
- **Mistake:** extreme close-up (0.37 m) of the glossy toy face turned grotesque (huge nose, open U mouth). **Fix:** frame faces from ~0.6 m; thin, flattened smile arc. **Source:** sneeze_full sheet, line 8.
- **Mistake:** "sneeze into your elbow" arm went straight up beside the head instead of in front of the nose. **Fix:** elbow in front of the chin ([.02,.6,.2]) with the wrist back near the far shoulder ([.12,.66,.05]). **Source:** sneeze_full sheet, line 9.
- **Mistake:** Poly Haven grass tufts (`ph/grass_medium_*`, `ph/grass_bermuda_01`) scattered on the `aerial_grass_rock` soil rendered as black spiky clumps. **Fix:** use Quaternius `nature_pack/Grass`, `Grass_2`, `Grass_Short` and `Flowers` for pasture cover; they render green. **Source:** horse preview sheet vs final frames, 2026-11-14.
- **Mistake:** `crops_pack/Corn_Crop` is only a corn cob (0.23 m); scaled to plant height it became a giant cob. **Fix:** mature maize = `Corn_4` (cobs, ~2 m), young = `Corn_3`, seedling = `Corn_1`. Check a model's bounds before using it. **Source:** corn preview sheet, 2026-11-13.
- **Mistake:** the toy person was an egg torso with tube arms, ball hands and a thin neck, so it never read as a human. **Fix:** lathe-profiled chest and waist with a trapezius slope, 40 cm shoulders with deltoids, a 5 cm neck, tapered upper and lower arms with elbows, hands with jointed fingers and a thumb, hair cap plus back hair, lids, lashes and brows (`person` in `renderer/cine_ref.js`). The Renderpeople scan was not used: it is one static standing pose and cannot lean, blink or raise an elbow. **Source:** sneeze_full frames at 20.5 and 30 s (2026-11-15).
- **Mistake:** a white hotspot sat on the floor at the bottom centre: the sun key reflected in a near-mirror clearcoat. **Fix:** rougher floor (roughness .58, clearcoat .35, coat roughness .38, specular .5). **Source:** sneeze_full frames at 20.5 and 30 s.
- **Mistake:** shadows were razor sharp, because PCFSoftShadowMap ignores `shadow.radius` and the shadow camera was only 0.5 m wide at 2048 px. **Fix:** soften through texel size instead: `shadowSize: 1.6, shadowRes: 512` (new set option). **Source:** three.js PCFSoftShadowMap docs, sneeze_full frames.
- **Mistake:** the line 6 sneeze jet read as a line of separate puffs. **Fix:** one continuous soft cone (noise shader, densest at the nose, fading along its length and at its silhouette edges) with fainter puffs, droplets and dust inside it. **Source:** sneeze_full frame at 20.5 s.
- **Mistake:** a hair "curl" displacement of 2% of the head radius looked like a knitted cap, and a separate fringe stuck out like a ledge. **Fix:** displacement 0.6-0.7% with a fine bump map, and no fringe. **Source:** our preview stills, 2026-11-15.
- **Mistake:** the eyes read as blank white ovals, because the iris and pupil spheres sat inside the eyeball (iris front at 12.2 mm, eyeball radius 13.5 mm). **Fix:** put the iris front flush with the eyeball surface (z .0112, flattened .32), add a dark limbal ring, a pupil just in front and a tiny catchlight, and thicker lashes. **Source:** sneeze_full frame at 26 s (2026-11-15).
- **Mistake:** the face looked grotesque: a big nose on a fully round face. **Fix:** flatten the front of the head (z beyond .5 scaled by .75), shrink the nose by about 20%, and re-seat the eyes, brows and mouth on the flatter surface. Frame faces from 0.7-0.8 m. **Source:** sneeze_full frame at 26 s.
- **Mistake:** the hair was a smooth helmet, and an oversized cap made a ledge on the forehead. **Fix:** a strand texture as colour and bump map, a side-parting groove, volume on the crown and sides, and the cap rim tucked to head size so it hugs the forehead. **Source:** our preview stills, 2026-11-15.
- **Mistake:** the skin was a flat single orange. **Fix:** a skin-tone map with warm and red blotches, lighter patches and fine specks under the pore bump and the warm sheen. **Source:** sneeze_full frames at 20.5 and 30 s.

## Candle video (runs/candle, score 85): the render did not show the story
- Mistake: I mapped each voice-over line to a generic template (sky, twist, dive, orbit, cta). The result had a mannequin standing in the sky, leg close-ups and a robot, and none of it showed tapping resin, bamboo, a pot, heat or pouring. Score 85 hid this.
- Fix: before rendering, every line must show its own literal object or action. Build the scene with real props (Poly Haven fire pit, stumps, barrel, tools, nature_pack trees, bamboo) and never rely on generic templates to carry a process video.
- Source: user review of runs/candle/final.mp4 (contact sheet frames 1-13).

## Candle v2 (runs/candle_v2, score 90): the shots show the process now, but the look is still weak
- Mistake: the pine is a low-poly cone (PineTree_1 from the nature pack), the man is the Xbot mannequin, the pot is a flat black cylinder and the fire is a faint particle cloud. The pour (line 9) is barely visible and line 6 is blurred.
- Fix (next): use a realistic person and a real pine (Poly Haven or a scanned model under the size limit), a real fire pit with a bright flame, and a clear amber stream into the bamboo. Keep the handheld shake low.
- Source: contact sheet of runs/candle_v2/final.mp4 (2026-11-15).

## Bees (preview 2026-11-15, plans/bees_winter.mjs)
- **Mistake:** bee bodies were about 20 cm long (radius .1 m), far too big next to a hive. Fix: `bees` params `scale` (set .16 for ~3 cm bees). Still a bit small: .3 is the next try.
- **Mistake:** the `drips` asset rendered as a yellow ellipse, not drips. Fix: left out. Use the `rain` effect for moisture instead.
- **Open:** the hive is a plain wooden box with comb faces; it needs a stand, an entrance board and a lid edge for realism.

## Salt (preview 2026-11-15, plans/salt.mjs)
- **Mistake:** `ph/Barrel_01` is a red oil drum with a yellow hazard sign, which breaks the no-signs lock and looks industrial. **Fix:** a wooden `crate` (or stump) as a small table.
- **Mistake:** a person standing 1 m from a 0.6 m macro shot showed up as a giant hand beside the glass. **Fix:** keep people at least 3 m from macro targets.
- **Mistake:** earth dykes made with `mudTex` read as wooden planks, and small `vapour` puffs read as floating snowballs. **Fix:** a dotted sandy `dykeTex`; vapour sprites 2-3x larger at opacity ~.1.
- **Mistake:** pink brine (#e08aa3) looked lavender under the blue sky reflection. **Fix:** a stronger rose (#ff6f93) and tint the pond floor pink too.
- **Mistake:** `coast_sand_rocks_02` looks grey-green on a salt farm. **Fix:** `env.soilTint: [1.18, 1.08, .9]` warms it toward pale sand.

## Hens dark corner, v2 → v3 (2026-11-15, user feedback)
- **Mistake:** the sky was split in half: a dark blue sea band under a pale sky, with a hard horizon line. **Fix:** `env.water` pale (#9cb9cc), `env.fog` pale, `haze` .8, `horizon:'hills'` at 260 m, `waves:0`, `foam:false`, `clouds:16`. The sky reads as one even blue with light clouds.
- **Mistake:** the lawn was patchy: bare soil and grey pebble spots showed through. **Fix (partial):** `cover:'high'`, `coverGain:1.5`. Still open: use a denser cover count (a number, e.g. 4000) or a true grass ground texture.
- **Mistake:** the chicken coop roof and walls looked like flat boxes. **Open.**
- **Rule (user, 2026-11-15):** each video gets ONE realism step. When a step is judged best by the user, lock it in STYLE_GUIDE.md and stop changing it.
## Horse sleeps standing (preview 2026-11-15, plans/horse_sleep.mjs)
- **Works:** real horse model (animals_pack/Horse, 1.9 m) on real grass, captions and stickers in sync.
- **Mistake:** the 'lie down to sleep' beat shows the horse still standing, because the library has no lying-down clip (Death is not a sleep). Fix needed: a lying-down pose, or a proper cut to a side view of a lying horse.
- **Mistake:** the stay-apparatus rings are hidden behind the leg and too small. Fix: place them outside the leg, larger (.5) and at the knee and hip height.

- **Fixed (horse video):** no lying-down clip exists, so `glb` now has `lie:1`, which tips the model 90 degrees onto its side and lifts it by half its width. Works for any library animal. Rings: place stickers outside the leg with `onTop:true`.
- **Mistake:** a prop parameter named `spin` (an array of speed keys) collided with the engine's own `spin` (a number: rotate the holder about y). The rotation became NaN and the drum and salad spinner vanished with no error. **Fix:** renamed it `omega`. Never reuse engine prop keys (`spin`, `bob`, `grow`, `appear`, `follow`, `to`, `rotX`) for custom data. **Source:** washer_ref preview, shots 4-7 empty (2026-11-15).
- **Mistake:** an InstancedMesh with 0 droplets (`drops: 0`) still drew one unset identity instance: a 1 m translucent sphere that greyed out the whole overloaded-drum shot. **Fix:** set `im.count = n` so a count of 0 draws nothing. **Source:** washer_ref frame at 26.5 s.
- **Mistake:** the Arabic captions in the glossy look were laid out left to right (Nunito with no Arabic glyphs, words in English order), and an inline comment then swallowed the `let fs` declaration. **Fix:** the font stack adds CapAr2 for Arabic, direction is rtl with no manual word reversal (checked on a frame), and the comment is on its own line. **Source:** washer_ref preview sheet.
- **Mistake:** a 0.5 m drum framed from 1.4-1.6 m in a 9:16 frame was cut at both sides (the frame is only ~0.5 m wide there at fov 36). **Fix:** frame a 0.5 m object from 1.8-2.0 m. **Source:** washer_ref frames at 16.5 and 19.5 s.
- **Mistake:** soap foam read as opaque white balls. **Fix:** iridescent bubbles at opacity .42 with depthWrite off, sizes skewed small (2-14 mm). **Source:** washer_ref preview sheet, shot 2.

## Animal realism pass (2026-11-15)
- **Added:** fur/hide detail for library animals (`furShader` in renderer/scene.js): object-space noise at three scales (hair strands, tufts, patches), no UVs needed. Applies automatically to `animals_pack` models in 3D-sky plans. Flat plastic colour is gone.
- **Still open:** the silhouette is low-poly (thin legs, blocky head). Only a higher-detail model fixes that: Sketchfab 'Anatomy of a Cow' style CC-BY models (needs the user's token) or a decimated scan. Do not claim photorealism for these animals.
- **Shader lesson:** `patch` is a reserved word in GLSL, so name noise variables `blot`, not `patch`.

## Bird designs (searched 2026-11-15, plans/island_birds.mjs)
- House sparrow (field guides): 15 cm, wingspan about 1.5 x body length, grey crown, chestnut nape, black bib, small pale cheeks, streaked brown back, grey belly, short conical dark bill, pink legs. Wings = broad coverts + long primaries, not sticks.
- Kiwi: cone-shaped body tapering to a small head, long slightly down-curved bill with nostrils at the TIP, hair-like shaggy feathers, no tail, hidden wings, short strong legs, 3 toes forward + 1 back, whiskers at the bill base.
- **Mistakes caught:** wing blades too thin looked like sticks; cheeks too big made a white face; shaggy feather cones stuck out like thorns. Keep feather cones small and lying along the body.
