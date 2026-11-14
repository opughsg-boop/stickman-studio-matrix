# Cartoon short style (LOCKED by the user: "اعتمد هذا الأسلوب")

Vertical 1080x1920, 30 fps, about 7 s per scene. A 3D office set with flat-coloured 2D cartoon characters, inked outlines and sound effects only. No words on screen and no voice in the scene (the user's rule for this style).

## Look
- **Characters:** white rounded body, thick clean black outline, big round eyes, puffed cheeks when needed. Hero: white body, red flat-brim cap (sideways oval brim). Coworker: yellow beanie with pom-pom. Source: the user's model sheet and hero reference. Drawn in `engine/heroes.js` (`drawToon`), body parts from `RIG`/`ARM`.
- **Set:** 3D office corner (`engine/office_world.js`): floor, walls, window with blinds, working clock, plant that sways, standing desks with monitors, a coffee mug on the desk edge.
- **Camera:** continuous, never still (handheld breathing), push in on the startle and pull out at the end. Cuts are not used. Focus follows the action.
- **Light:** bright daylight, no dark beats.

## Story rules (from the review of video 1 and video 2, see `LESSONS.md`)
1. Every prop sits on the right body part (headphones on the ears, phone in the hand).
2. Every event has a visible cause before it happens (the mug hops on the slaps, then falls).
3. Reactions land 3-5 frames after the cause, not on the same frame.
4. Faces stay in frame when the camera follows an object.
5. Typing hands stay on the keyboard behind the desk.
6. Standing characters get no chairs.

## Sound (LOCKED: real recorded effects only, no synthesized test tones)
- Source: `sfx/` (Mixkit free SFX, see `CREDITS.md`). Event map is in `sfx/mix_office.py`.
- Soft low "whoom" for camera moves (kept from the house style). Keyboard taps stay synthesized until a better sample is found.
- Loudness: add gain with a limiter before the loudness pass; a quiet scene measures about -21 LUFS even at -1 dBFS peak. Target -14 LUFS, true peak -1 dBTP.

## How to make a scene
1. `bash` the kit setup (`vendor/toon.ts` is MIT, see `CREDITS.md`) and put three.js r160 in `web/lib/`.
2. Put the engine files in `web/` and copy `story.js` for the new scene (rewrite its beats, cameras and cast).
3. `node render.mjs frames "0-209"` from the project folder (renders 210 JPEG frames).
4. Write the sound cue table in a copy of `sfx/mix_office.py` for the new beats, then `python3 mix_office.py` to make `mix_raw.wav`.
5. Encode with the kit's `tools/finish.sh` (frames + mix to mp4 with QA).
6. Watch one 16-frame sheet, write the lessons in `LESSONS.md`, then send the mp4.
