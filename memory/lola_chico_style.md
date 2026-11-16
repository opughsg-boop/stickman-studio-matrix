# Lola & Chico style (locked 2026-11-16, user request)

Applies to every new video for the page "Lola & Chico" (US English audience). Topics: farming, building, raising animals (poultry, bees, farm animals), facts about animals and plants.

## Rules
- **Voice:** US English, the user's own voice-over or ElevenLabs file, at natural speed. Never time-stretch the voice.
- **Captions:** English only, uppercase bold, 2 words per caption, taken from the exact script. No Arabic captions.
- **Rhythm:** beat starts snap to the nearest spoken word start, so every scene change lands on a word (`bees_roof_ar.mjs` pattern: build the transcript on the beat grid, `runs/bees_ar_visual_en2/build_tr.mjs`).
- **Visuals:** hyper-realistic 3D diorama, real sky, real sizes, nothing frozen. Problem/fix pairs with wordless icons (✓ ✗ stickers, never on a body).
- **Length:** 35-45 s, 1080x1920, 30 fps, -14 LUFS.
- **Improve each video** by one step (realism, motion, sync). Name the step in the final message.
- **Logging:** after each render, add one entry to `memory/visual_lessons.md` (mistake, fix, source).

## Pipeline (current)
1. Save the script exactly as given in `runs/<name>/script.txt`.
2. Make the transcript from the natural voice (transcribe + align), then build the beat grid and snap beat starts to words.
3. `node run.mjs --audio <voice> --plan plans/<story>.mjs --lang en --out runs/<name>` with `transcript.json` prepared in the run folder.
