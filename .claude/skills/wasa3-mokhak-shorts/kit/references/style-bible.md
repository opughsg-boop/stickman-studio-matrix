# Style bible (measured from the reference video, 720x1280, 49.0 s, Spanish chicken-coop explainer)
Measured with tools/analyze_video.py -> profile_chicken_coop.json
- 30 fps, H.264+AAC. Loudness -14.2 LUFS (LRA 4.1), true peak -0.3 dBFS (slightly hot: we target -1.5).
- ZERO hard cuts: one continuous 3D world; camera motion energy mean 10.4 (0-255 scale at 10 fps), static share 1.2%.
- Pauses in the voice every ~3-5 s (14 pauses/49 s): each sentence = one camera phase.
- Captions: 92% of frames, white fill + black outline, band y = 0.75-0.79 of height, ~3.2 caption changes/s (1-3 words).
- Palette: soil browns (#3e2f27, #715946), studio blues (#2e70af, #628fc0, #1d416b), white grid lines.
## Visual DNA
Blue gradient studio void with a soft light shaft; white blueprint grid floor; textured soil diorama block WITH cross-section edge; 3D props from simple shapes with real textures (corrugated metal roof, wire mesh, wood posts); billboard photo cutouts as living actors (hens), idle motion; yellow double-arrow dimension annotations ("centimetros"); close-ups into the detail, then pull back out to context; day-to-night grade for "inside" shots.
## Camera vocabulary
push_in, pull_out (>=40% of shots), orbit, dolly, crane_up/down, whip_pan, tilt_down, rack_focus, drift. Each shot starts from the previous shot's end pose (10-frame ease-out blend). Always creep.
## Pacing
New visual idea every 1.5-3 s (avg 1.8-3.2, never >4.5). SFX on every shot start; fx (shockwave ring, sparks, arrow, pulse, flash) on >=50% of shots. Fade through black (0.2-0.4 s) at the pivot line.
## Differences vs the older zach-d-films notes
Old notes: Arabic shields, 15 shots/47 s, 9 stock shots (repetition problem), Lalezar captions, mkv chunks. Reference video: Spanish coop, no cuts, grid void world. Keep both: grid void + continuous camera + shock rings; add NEW props per topic instead of the 9 stock shots.
