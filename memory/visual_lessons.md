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
