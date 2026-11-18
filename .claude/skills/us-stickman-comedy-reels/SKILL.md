---
name: us-stickman-comedy-reels
description: Make wordless full-body cartoon comedy reels for a US audience, with English labels, prop grips, free-library SFX, a licensed music bed, and a scored review after each video.
---

# US Wordless Comedy Reels

Make 30-60 second wordless comedy reels with full-bodied cartoon people, aimed at American viewers. One black label pill at the top with English text. Hard cuts only. Every video ends with a publish pack and a scored review, and the lessons carry into the next video.

## Workflow

1. **Ask the length first** (30 s, 45 s, or 1 min) unless the user already gave it.
2. **Pitch ideas** if asked, then wait for the user to pick a number.
3. **Plan the shot table**: `# | time | label | framing | action | sound`. The total must match the chosen length within 3 s. Use 14-17 shots for 45 s, 18-22 for 60 s.
4. **Build**: a figure engine (`figure.js`), a scene (`scene.html` from the example), and a renderer (`render.js`). Set DUR to the chosen length.
5. **Stills check**: render stills at each shot's middle and at the punchline. Tile them into one contact sheet and look at it. A "clean" stills report is not enough.
6. **Audio**: write `cues.json` with one entry per sound moment, then run `python3 -I sfx.py cues.json sfx.wav`.
7. **Full render**: `node render.js scene.html frames 30 6`.
8. **Encode**: `ffmpeg -v error -y -framerate 30 -i frames/%05d.jpg -i sfx.wav -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5 -shortest out.mp4`.
9. **Check the output**: duration within 3 s of target, cuts on their sounds, label changes on the cut, loop continuous, no blank frame. Make a contact sheet of the final MP4 and look at it.
10. **Deliver** the MP4 with one line in the user's language, then the publish pack and the review (below).

## Style

- **Characters:** full human figure with a big round head (about 3 heads tall, big-head comedy style). Clothed torso and limbs, thick black outline, soft cel shading, simple shoes. One accessory or outfit colour identifies each character.
- **World:** simple characters, detailed set. Dark outlines, gradient fills, painterly texture and grain. One motivated light per shot with a coloured glow, and one saturated accent.
- **Labels:** English, bold sans-serif (DejaVu Sans Bold if Alexandria is missing), left-to-right, changed at hard cuts. Short, e.g. MONDAY, ONE YEAR LATER.
- **Cutting:** 2-4 s per shot. Each beat goes wide (situation), then a detail close-up (the joke), then a reaction. The last shot matches frame 0 for a seamless loop.
- **Story shape:** a hook in the first 3 s, two or three escalating rounds, a silent beat, then a punchline that reframes the start.
- **Movement:** every shot moves (push-in 8-15%, tilt, or shake on impacts). No static shot longer than 3 s.

## Real-world scale (1x)

Keep every object at real size next to the body.

- Adult about 170 cm; head about 23 cm; shoulders about 40 cm apart.
- Arm about 3.4 hand-lengths (hand about 17-19 cm wrist to fingertip).
- Phone about 15 cm; coffee mug about 9 cm; pitcher about 25 cm; tie about 140 cm; candle about 20 cm; pizza box about 30 cm square.
- Table about 75 cm high; chair and sofa seat about 45 cm.
- Umbrella: about 100 cm open across, held at 110-120 cm so it covers head and shoulders.
- Dog about 50-60 cm at the shoulder.
- Cartoon heads are oversized by design. Only props and furniture follow the real scale.

## Props and grips

- Every hand that holds something sits exactly on the prop's grip point (bar, dumbbell handle, cup, phone, rail, door handle). Set the grip point first, then aim the hand at it.
- Move the body (x, y, lean) before stretching an arm past its length.
- Face the body toward the prop.
- Animate arms with an arc between two keyed poses (blend the angles), not a snap.
- If a hand is meant to miss, make the miss visible and deliberate.
- Small key objects (cards, receipts) may be enlarged as inserts, but say so in the review and keep the scale break short.

## Sound

- **No voice.** Synthesized SFX come from `sfx.py`. Free-library SFX are welcome: the user downloads them (the sandbox may have no internet), puts wav files in `sfx/`, and cues them as `file:sfx/name.wav`. Sources: Freesound (CC0, or CC-BY with a caption credit), Pixabay Sound Effects, Mixkit.
- **Music bed (licensed only).** Use a track the user supplies with its license, or a free library (Pixabay Music, YouTube Audio Library, Mixkit, ENDE.APP with CC BY 4.0). Do not use trending commercial songs; the sound libraries inside TikTok or Reels are not licensed for export. Check the file's metadata for a license tag and tell the user what attribution it needs. Add to `cues.json`: `"music": {"file": "music/bed.wav", "gain_db": -20}` after converting with `ffmpeg -i in.mp3 -ac 1 -ar 48000 -t <dur> music/bed.wav`.
- **Levels.** Room tone at `"bed_db": -30` to `-36`. Cues sit about +4 dB above the bed. Music sits 20-22 dB under the cues.
- **Mix rules.** Every visible action gets its own sound (phone buzz, tap, tick, clink, scratch, thud, whoosh). The big sound lands on its cut. Leave 0.3-0.6 s of silence before the punchline. The first sound of the loop matches the last.
- **Cue names in sfx.py:** pop, tap, tick, whoosh, thud, clink, ding, alarm, buzz, snore, gasp, boing, riser, heartbeat, scratch, sting, plus `file:` for library files.

## Final review (every video, before delivery)

1. **Publish pack:** title (US English, under 60 characters), 2-3 emoji, 1-2 line description, 6-8 hashtags, tags list. Add any required music attribution line to the description.
2. **Score out of 100**, five parts of 20 each:
   - Hook: the strangest or funniest image in the first 3 s.
   - Motion: every shot moves; no static shot longer than 3 s; shake on impacts.
   - Effects and sound: each object has its own sound; mix levels per above.
   - Realism at 1x: props at real size; hands exactly on their grips.
   - Clarity and story: key text readable at phone size; escalation clear; loop matches.
3. **Fix log:** every mistake in this video, how it was fixed, and the rule that prevents it next time.
4. **Save the lessons** to the user's notes and apply them to the next build before rendering.

## Lessons so far (do not repeat)

1. Check the contact sheet before delivering. A stills report that says "clean" is not enough.
2. Set scale rules before rendering. Do not rebuild props after the first render.
3. Key messages on a phone go in close-ups. Wide shots must not depend on reading small text.
4. Do not add story beats the user did not ask for. If a beat seems needed, ask first.
5. Labels and on-screen text are English from the start.
6. Keep the room tone quiet (-30 to -36 dB under the cues).
7. Every shot needs movement, even a small one.
8. Music must be licensed and attributed before publish.
9. An umbrella at real size covers the head and shoulders. Keep its tilt under 25 degrees.
10. Put the music in before the final render, not after.
11. Shot order must match the story. A table that sets a seated scene before a standing one reads as a montage; reorder or label it clearly.
12. Check that every character has the full outfit (sleeves, shoes, accessories) in every shot.

## Titles and captions

Give one US-English title, a short description, 2-3 emoji, 6-8 hashtags, and a tags list. Keep the cast original. Do not use real brands, real people, copyrighted characters, or lyrics.

Example: "Gym Membership Week 💪🛋️" with #shorts #comedy #gymhumor #relatable #cartoon #reelsviral.

## Files in this bundle

- `figure.js`: full-body cartoon rig. Use `stick(o)` with the same options as the stick-figure engine. Includes poses (P), faces, accessories, and `stick.last` for grip points.
- `render.js`: renders frames or stills from a scene's `render(t)` function.
- `sfx.py`: synthesizes SFX, mixes the music bed, and writes the WAV track.
- `scene.html` and `example_scene_gym.html`: an example scene with SETS, SHOTS, a label, and the render loop. Copy it, then replace the sets and shots.
