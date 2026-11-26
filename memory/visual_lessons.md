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
- **Mistake:** ✓/✗ placed as world-space labels sat on the caption at the top, then off the frame edge once moved aside (the camera's side offset shifts them). **Fix:** for a single verdict icon, use screen-space `counter` at [.5, .3], just under the caption band. **Source:** washer_ref frames at 28.6 and 29 s.

## Buffalo shed (2026-11-16, plans/buffalo_shed.mjs)
- **Mistake:** a plan object removed in one beat and re-added later with the SAME id does not reappear. Fix: give the rebuilt object a new id (`postsH2`, `roofH2`).
- **Mistake:** thin pale roof slabs disappeared against the sky. Fix: red-brown tin colour, .16 m thick, camera 15 m back so both roof heights read side by side.
- **Note:** the library has no buffalo; the dark `Bull` model stands in for it.
## Egyptian rooftop (researched 2026-11-15 for plans/bees_roof.mjs)
- **Real look:** flat concrete slab with stains and hairline cracks; parapet about 1 m, often bare red brick with grey mortar; concrete column stubs with rusty rebar sticking up at the corners (owners plan another floor); a stair-head room with a painted metal door; plastic water tanks (beige or black) on iron stands; several satellite dishes; laundry on a line; neighbouring blocks of red brick in a grey concrete frame or beige plaster; a minaret in the skyline.
- **Build rule:** the island top is the roof. Use `env.flatTop:true` (no soil bumps through the slab), `cover:false`, and the `rooftop` asset (slab + facade down the island sides + parapets, front parapet low for the cutaway). Ground plane far below = `env.water` dusty beige with `waves:0, foam:false`. Keep the `city` skyline out of camera corridors (`avoid` rects), and keep blocks in front of the camera (z > 3) below the roof.
- Source: [Reason, Cairo the unfinished city](https://reason.com/2025/09/28/cairo-the-unfinished-city/), [Scoop Empire, Cairo's red brick jungle](https://scoopempire.com/colors-of-cairo-%ef%bb%bfinside-the-citys-red-brick-jungle/), [Arab News, terrace society](https://arabnews.com/news/515751).

## Timber structures (2026-11-16, buffalo shed)
- **Mistake:** the first shed used flat red slabs floating above thin posts, with a pale slab wall. Looked fake and inconsistent.
- **Fix (now the template):** `shedParts(h, pitch)` in plans/buffalo_shed.mjs: stone bases, square posts, top beams, corner braces, plank gable roof that rests on the beams with a ridge gap, plank back wall, side rails, and a canvas `wood` texture (`tex:'wood'`) with weathered grey-brown tints. Reuse it for barns, coops and sheds; only change h and pitch.

## Delta buffalo (preview 2026-11-16, plans/buffalo.mjs)
- **Mistake:** canal water read as white snow: grazing PBR reflection of the pale noon sky plus a pale far colour and a white overlay plane. **Fix:** murky olive (#35402a near, #6d7c5e far), `envMapIntensity` .35, roughness .16, no overlay. Real Delta canals look olive-brown, only the far stretch mirrors the sky. **Source:** preview sheet, beats 1, 4, 9.
- **Mistake:** a wet hide at roughness .2 turned the dark buffalo silver-white; a mud coat with high `mudDry` read as a plaster wall. **Fix:** wet = 50% darker at roughness .4 and hide `envMapIntensity` .55; mud wet #3c3024-ish, dry only up to ~.17 linear, `mudDry` <= .3, and never frame a mud close-up wall-to-wall (keep the head and the egret in frame). **Source:** preview beats 6-8.
- **Mistake:** foreground grass blades 0.3-0.6 m long at 0.6 m from the lens crossed the whole frame, and tall reeds between the camera and the buffalo hid it (beat 4 was all reeds). **Fix:** blades 0.13-0.25 m tucked in the corners at k .8 on two beats only; camera over the water (az near 0 looking along the canal) instead of over the reed bank. **Source:** preview sheet.
- **Mistake:** a farmer 2 m beside the buffalo did not fit a vertical frame (hose shot). **Fix:** camera behind the farmer's shoulder looking along the spray toward the buffalo (memory rule: point wide actions toward the camera). Check framing with projected NDC of head/back/rump/farmer (`window.__cam`, `window.__link`) instead of extra preview images.
- **Works:** walk clip synced to ground distance (measured stance speed of the Bull Walk clip = 0.88 m/s at 1.65 m), eased stops with a settle bounce, sinking the body below y 0 so the island top hides the legs in water or mud.

## Rooftop bees (US version, 2026-11-16)
- **Mistake (preview):** the white tiny flowers in the roof cover read as snow patches. **Open:** lower the flower density for rooftop plans (`env.cover` with no flowers, or `coverTint:'dry'`) and re-check.
- **Mistake (preview):** a hand-placed warning sticker sat on the beekeeper's veil. **Fix:** place stickers 0.3 m off the body.
- **Fixed (2026-11-16, user):** the roof floor must be plain ceramic tile, not grass. `rooftop` now takes `tiles:true` (glazed square tiles with grout), and the plan sets `cover:false` so grass does not spread over the roof. Potted plants (shrubs, ferns, flowers) stand in terracotta pots on the roof.
- **Mistake (re-render, 2026-11-16):** a sticker moved in the plan still showed in the old spot because `pipeline/render.mjs` resumed stale chunks from the previous plan. **Fix:** render.mjs now stamps `chunks/plan.sha` and clears chunks when the plan changes. Also, in a close shot (dist ~4.6) 0.5 m of x is about 0.7 of the screen width: sticker x 0.6-1.5 was off-frame. Project sticker positions with the camera (`window.__cam()`) or check one preview frame before the full render. Final warning sticker: `[0.15, 1.5, 0]`, right of the keeper's chest. Source: rooftop_bees_us renders.
## Buried tank (preview 2026-11-16, plans/water_tank.mjs)
- **Mistake:** a solid soil slab covered the whole view, so the buried tank was invisible. Fix needed: a cutaway soil block (open front face, so tank and insulation show inside) like the anatomy window.
- **Mistake:** the 'above ground' tank was a solid blue box with no cylinder or lid detail, which reads as a box, not a water tank.
- **Rule:** in any cutaway, check the first beat where the inside should show. If it is hidden, the plan is wrong, not the render.
- **Second attempt (2026-11-16):** the soil cutaway had an open front, but the island ground (env soil + Poly Haven grass at y=0) covers everything below y=0, so the tank and insulation stay hidden. Fix needed: lift the cutaway block above the ground plane (raise it, or put the ground layer under it as a plate and let the cut show the tank), or add `env:{ground:false}` to the plan.
- **Third attempt (2026-11-16):** lifting the cutaway by 1.2 m made the tank visible, and the yellow insulation sleeve shows. Still wrong: the tank runs below the soil block's floor into the grass, and the soil walls are too thin to read. Fix: put the tank's bottom at the block's floor, and make the soil walls thicker and brown.
- **Fourth attempt (2026-11-16):** thick brown soil walls and a lidded tank inside now read as buried. Still wrong: the yellow insulation sleeve covers the whole tank in the 'insulation' beat (hides the tank). Fix: make the sleeve a thin band (ring, not a full cylinder), or show it only in a cutaway wedge. Tank base still ends a little below the soil floor.
- **Fifth attempt (2026-11-16):** the insulation is now a ribbed band of foam strips around the tank, so the blue tank shows between strips. The tank sits on the soil floor and the lid is visible. Remaining: the foam strips stick out past the tank and the soil walls are cut off at the frame edge in this shot. Fix next: keep strips inside radius .6 and move the camera back.

## Wooden farm fence (2026-11-16, plans/wood_fence.mjs)
- Works: posts on stone bases, three rails, timber texture, sticker pointers, clean framing. This is the reliable build style for simple wood structures.
- Mistake to watch: a corner brace was drawn at the wrong angle (it looks like a stray plank). Check that braces run from the top of the end post down to the ground rail.
- **Fixed (fence):** the corner brace now runs as a true diagonal from the top of the end post down to the ground rail, with length and angle computed from the two points. Use this helper for any diagonal member.
## Rescue facade (2026-11-16, runs/rescue, score 29)
- **Mistake:** 17 beats for 39 s, and the critic flagged 15 `dead_beat` ("adds nothing new visually"). The same facade, same figures and near-identical camera repeat across beats, so the story reads as one still scene. **Fix:** cap beats at about one per 3 s with a new camera angle or a new subject in each; merge beats that show the same pose.
- **Mistake:** the opening hook was too wide: the hanging woman was a speck in the first beat. **Fix:** frame the hook on the subject (about 4 m from a 1.75 m figure) and hold it.
- **Mistake:** a hanging figure upside down is hard to read in a 9:16 frame. **Fix:** show the hang from a side angle with the rack bending in the same frame.
- **Mistake:** the full render died at 90% during the final mux, leaving an invalid final.mp4 (same as the compost run). **Fix:** rerun the same command; cached chunks in runs/<name>/chunks are reused.

























## Lola & Chico: Why Chickens Lay Eggs in the Dark Corner (2026-11-16)
- **Mistake:** stickers (?, !, ✗, ✓) sat right above the hens and at the frame edges; some were cut off. **Fix:** size .6, placed at y ~3.0 and x within +-2.6 m, away from the hens. **Source:** contact sheet of v2.
- **Mistake:** the nest box was a plain white block. **Fix:** wood-brown box (#7a5a36). Still needs straw and a real opening; not fully fixed.
- **Mistake:** hens too small on a flat green lawn. **Fix:** flock scale .5. The lawn is still flat; add Poly Haven grass clumps and varied soil next.
- **Open:** a check icon still clips the right edge in one beat, and two check icons stack in the same spot (ck4 and ok6). Move one of them.

## Wood bed / carpentry (preview 2026-11-16, plans/wood_bed.mjs)
- **Mistake:** the `carpenter` default model `modular_men/Worker` wears a hard hat and a hi-vis vest, so he reads as a construction worker, not a village carpenter. **Fix next:** `params.model:'modular_men/Farmer'` or `Casual` (re-probe palms: the poses were tuned on Worker, hands hang at .93 m).
- **Works:** palm contact tuned with a probe (`window.__rigPoses` + `carpenter.userData.palm`), hammer rides the palm and lands on the nail head (< 1 cm); sectioned mortise and tenon reads clearly in close-up.
- Source: runs/wood_bed/sheet_preview.jpg.

## 2026-11-17 bread-beer2 (score 76)
- Mistake: the realistic library works for props (table, barrels, bags, cauldron, palm), but flat round loaves made of spheres and terracotta cylinders read as plain shapes. Fix: use a textured bread or a jug model when one exists; otherwise add a clear colour and crust detail.
- Mistake: a 10 s hold on the "question" beat with no new idea. Fix: split holds over 4.5 s with a camera change (already in the critic's rule).
- Source for the look: Nile-side countryside uses `env.horizon:'nile'` (CLAUDE.md rule).

## 2026-11-19 three-sisters (score 55)
- Mistake: crops at real height in a wide shot read as sticks; corn and squash must fill the frame in the hero beat.
- Mistake: a grey-brown slab for soil looks like a floating block. Fix: continuous ground with the same soil texture as the rest of the scene.
- Mistake: root nodules as pink balls on a stick. Fix: a branching root system with nodules along the roots, shown in a cut-away.
## salt_cow (2026-11-17)
- Mistake: hero model "animals_pack/Cow" was loaded from assets/models and returned 404. Fix: renderer/cine.js loadModel routes names with a slash to assets/lib.
- Source: the render log (404 on /assets/models/animals_pack/Cow.glb).

## salt_cow v2 (preview 2026-11-17, plans/salt_cow.mjs)
- **Mistake:** the hook framed the cow from behind: it walked away from the camera. **Fix:** pick the walk direction first, then put the camera on the side the animal faces (camera az close to its heading). Profile shots (cow facing ±x, camera from +z) show the tongue on the block best.
- **Mistake:** the carried block was missing or in the wrong place: it read the farmer's palms from LINK before the farmer had ticked that frame (objects tick in plan order). **Fix:** list the carrier before the carried prop (add the farmer in beat 0 with `delay`).
- **Mistake:** the salt efflorescence on the wall read as cotton balls (big opaque white dots). **Fix:** a thin powdery haze, densest along a wavy tide line, with a damp darker band under it. Real crust is faint, not a white coat.
- **Mistake:** a 1.6 m trough between the camera and the farmer hid the kneel beat, and a fence on the camera side cut through two shots. **Fix:** keep the camera side of a pen open; check the line from the camera to the target for props with the NDC probe.
- **Works:** contact by probe: tongue tip within 1-5 cm of the lick spot, mouth 7-14 cm off the surface, palms on the block top (< 3 cm), muzzle on the water (4 cm), hooves at y 0.
- Source: runs/salt_cow/sheet_preview.jpg (first pass) plus the NDC/contact probe.

## Hens winter (preview 2026-11-18, plans/hens_winter.mjs)
- **Mistake:** the voice file held two takes (lines 1-5 from 0 to 20 s, then all 7 lines from 20.1 s); the aligner spread line 2 over 2-27 s. **Fix:** check ASR segments for a repeated hook before planning; the plan uses `runs/hens_winter/voice_take2.wav` (cut at 20.10 s). The render must use that file too.
- **Mistake:** a lime-washed coop interior was as bright as the yard (luma 169), so "the coop gets dim" did not read: the renderer has no ambient occlusion, so sky light reaches under the roof. **Fix:** an interior shade factor (`shadeK` on coop, floor, nests, and on the hen by position) of .5, lifted to .66 when the lamp comes on. Interior beats now 103-135 vs lit 153-179.
- **Mistake:** extra check/cross stickers doubled the engine's corner ✓/✗ badges (drawn for every `kind:'solution'|'problem'` beat), and an info beat marked `solution` got a ✓. **Fix:** use `kind` for the verdict badge; add a check/cross sticker only on `info` beats.
- **Mistake:** a sky arc behind a coop was hidden by the roof from a low yard camera. **Fix:** sky cameras over the roof line (y 2.8-3.5, 6 m out, looking slightly down), arc sized to the 9:16 width (span <= 9 m at 44 m), palms kept out of the sky corridor.
- Contact by probe: lamp grip 0.055 m from the left palm at mounting, timer grip 0.02 m from the right palm (plug-in and dial turn). A 1.75 m Farmer rig tops out at about 1.73 m palm height, so wall fittings go at 1.5-1.7 m.
- Source: runs/hens_winter/sheet_preview.jpg (first pass) plus the NDC/contact probe.

## Hens winter v2 (preview 2026-11-18, hen head fix)
- **Mistake:** the hen's head floated off her neck while preening (12 cm gap) and pecking (15 cm): head and neck were siblings, the neck a cylinder rotated about its middle by a guessed formula, and the head used XYZ Euler order, so a 120-degree turn plus a nod rolled the head sideways. **Fix:** `henWalker` solves the neck every frame as a stretchy link from a fixed shoulder base to an attach point at the back of the skull (length clamped 0.3-0.62 units), head rotation in 'YXZ' order (turn, then nod). Probe: head-to-neck-top 0.016 m in every act; rest/preen max step 3.2 cm per frame.
- Source: numeric probe (head world position vs neck top, 30 fps, whole track).

## Sheep circle (preview 2026-11-19, plans/sheep_circle.mjs)
- **Mistake:** camera distances copied from the hen plan (1.2-2.9 m) framed a 0.9 m sheep far too tight in 9:16 (40 deg fov is only ~23 deg wide): sheep cut at the frame edge, rings clipped, the hook sheep half out of frame. **Fix:** about 1.6-1.8x the distance for a sheep-sized subject (whole sheep: 3.5-4.6 m; flock: 5.5-7 m; farmer walking in: 8.5 m).
- **Mistake:** a bright white fleece in direct evening sun blew out (up to 44 % of a close-up above 205) and three overlapping lumpy ellipsoids read as cotton balls; white lower legs read as stilts. **Fix:** cream-tan wool (#c9bda6 range), finer lumps (high-frequency noise, small low-frequency share), weaker sheen, brown haired lower legs (Ossimi type), exposure 1.05. Probe stills: every beat 120-156 mean luma.
- **Mistake:** cameras outside the pen looked through fence posts and an open gate leaf; a grazing sheep stood between the camera and the mud patch. **Fix:** shoot from inside the open (+z) side, raise elev to ~.85 over foreground animals.
- **Mistake:** rig_track poses: a key's pose is reached right after the PREVIOUS key, so a pose must be repeated on the next key to hold it (the squat-pick palm sat at .57 m instead of .2 m). Squat (track y -.55) reaches .19-.20 m, a 1.55 kneel only .33 m.
- Contact by probe: stance hooves y 0.000-0.002, sniff nose .045-.055 m above ground, lean palms 1.243 m on a 1.195 m rail top, pick palms .14-.15 m above the litter, press palms .06 m above the straw mound.
- Source: runs/sheep_circle/sheet_preview.jpg plus probe stills and LINK probe.
## Olive cutting (preview 2026-11-19, plans/olive_cutting.mjs)
- **Mistake:** the procedural olive crown read as bare sticks (64 leaves per spray, 5-7 cm, narrow). **Fix:** 5 sprays per secondary branch, 115 leaves each, wider leaves (6-8.5 cm, width .22); an olive is evergreen, so late winter still means a full grey-green crown.
- **Mistake:** a gardener standing at the trunk from t=0 showed in the hook and the next close-up. **Fix:** walk him in from off-frame at the wide beat and out again right after it.
- **Mistake:** a disembodied hand's sleeve (0.7 m along -fingers) filled half the frame when the camera looked along the forearm. **Fix:** put the camera at about 90 degrees to the forearm (bury cam az 1.15) and park a waiting hand well outside the close frame.
- Works: grabs keyed in the cutting's own frame (pinch never slips), index pad as the contact anchor, palm-to-bark 0.007 m by probe, the front-half cutaway pot for root stages.
- Source: runs/olive_cutting/sheet_preview.jpg (first pass) plus the NDC/contact probe.

## Palm pollen (preview 2026-11-19, plans/palm_pollen.mjs)
- **Mistake:** close-ups of the flower clusters (cameras 1-4 m from the crown) looked through the drooping lower fronds: 8-22 of 25 central rays hit a frond before the subject. **Fix:** prune the older fronds (`clear: [[azMin, azMax, minAge]]` on `date_palm`) on the work side, as farmers do round the bunches before pollination; 0/25 blocked after. Check with a raycast grid from the beat camera, not by eye.
- **Mistake:** leaflets 7.5 cm wide read as broad banana-like blades in a close-up. **Fix:** 4.2 cm (real date palm pinnae are 2-4 cm wide, 20-45 cm long).
- **Mistake:** a cut prop moved in its tick kept its moved transform when frames were rendered out of order (probe, chunk workers). **Fix:** reset every animated part to its home transform at the top of each tick.
- Exposure 1.05 clipped 5-10 % of the non-sky pixels in a sunny palm grove; .95 keeps every beat at mean luma 100-154 with under 5 % above 205.
- Contact by probe: ladder hands .05-.15 m from the rails, sickle palm .09 m from the male spathe stalk at the cut, the spathe tip .1 m above the bag palm when it vanishes into the bag, sprinkling palm .15 m from the second female cluster.
- Source: runs/palm_pollen/sheet_preview.jpg (first pass) plus the raycast/NDC/contact probe.
## Hen laying (preview 2026-11-19, plans/hen_laying.mjs)
- **Mistake:** Fayoumi pencilling drawn as dark `bars` (#16130f) on a white base read as horizontal stripes (a knitted ball). **Fix:** grey-buff base #b9b2a6 with soft bars #5d574f. Real Fayoumi: silver-white hackle, black-and-white pencilled body, red single comb, slate legs, small cream eggs.
- **Mistake:** `ph/wooden_bucket_01` rendered as a big green dome beside a 0.6 m close-up. **Fix:** removed; keep props out of close-up corridors.
- **Mistake:** a sun arc sized for a 20 m sky camera (peak 8.5 m at 40 m) left the frame from a 1 m tray camera. **Fix:** peak 6.2, span 5.5; LINK.sun is in the sun group's LOCAL frame (add the group pos before projecting).
- Works: hen hop with crouch and wing beats; a nest box needs h .40 for a 0.45 m hen (her head hit the .32 roof); eggs ride the gard_hand palm (`anchor:'palm'`), contact 2 mm by probe.
- Source: runs/hen_laying/sheet_preview.jpg plus the NDC/contact probe.

## Hen laying (final 2026-11-19, score 58)
- **Mistake (repeated from olive cutting):** the hand looked like a plastic toy: smooth fingers, no knuckle or nail detail, a flat palm that did not curve around the egg. **Fix for next videos:** build the hand with visible knuckles, nails and skin folds, and check the egg-in-palm contact by probe before any render. Do not call the hand "realistic" until it is checked on a close frame.
- **Mistake:** 8 dead beats in a 14-beat plan. **Fix:** a new camera or a new subject state in each beat; merge the rest.
- **Mistake:** the review step crashed on a broken `memory/lessons.json` left by a merge (duplicate keys). **Fix:** after any merge, run `python3 -m json.tool` on every memory JSON file before rendering.

## Clover regrow (preview 2026-11-26, plans/clover_regrow.mjs)
- **Mistake:** procedural berseem read as grass or bamboo: 6-8 small leaves per stem, leaflets mostly flat (seen edge-on from a low camera), stems lighter than the leaves. **Fix:** 8-11 trifoliates per stem, 5.2 cm leaflets, droop spread +-.55 rad so faces show, stems darker (#6f9a3f) than the leaves. Real berseem: a leafy closed canopy, oblong leaflets, hollow stems hidden under the leaves.
- **Mistake:** root nodules drawn at 2-4 cm read as pink balls; real clover nodules are 2-5 mm. **Fix:** `nodS: .28` on `roots`.
- **Mistake:** cameras at elev .1-.2 in front of the island edge filled the lower half of the frame with the soil face. **Fix:** elev .3-.48 for field shots; keep the low face camera only for root beats.
- Source: runs/clover_regrow/sheet_preview.jpg (first pass). Fixes applied after the one preview, not yet re-checked.

## Tomato stake (preview 2026-11-26, plans/tomato_stake.mjs)
- **Mistake:** procedural tomato foliage read as sparse spiky stars (13 leaves on the main stem, leaflets 9-14 % of the leaf length wide); fruit in orange (#e3862c) with a strong clearcoat read as pale peach. **Fix:** 18 + 8 leaves per stem, 7 branches, leaflets 13-19 % wide, darker saturated ripeness ramp (#5c8a26 -> #d4601a -> #a9160b), clearcoat .35. Real tomato: dense compound leaves, leaflets 3-8 cm long and 2-4 cm wide.
- **Mistake:** the fallen rotting fruit sat inside the sprawl (0.1 m from the stems), so the line-3 close-ups showed only plant fruit. **Fix:** put it 0.3 m clear of every stem (checked with the stem-distance probe) on the camera side.
- **Mistake:** five side palms showed as bare leaning trunks across the sky in low shots. **Fix:** four palms only, 6-8 m back and 5-8 m to the sides.
- Works: auto-tuned rig poses (coordinate search on palm targets) put both palms on the cane within 0.03 m, on the stem at 0.1 m, on the fruit at 0.05-0.07 m.
- Source: runs/tomato_stake/sheet_preview.jpg (first pass). Fixes applied after the one preview, not re-checked by eye.
