---
name: us-stickman-comedy-reels
description: Make wordless full-body cartoon comedy reels for a US audience, with English labels, prop grips, free-library SFX, a licensed music bed, and a scored review after each video.
---
# US Wordless Comedy Reels

Make 18–60 second wordless comedy reels (9:16 `1080x1920` @ 30 fps) with full-bodied cartoon characters, aimed at American viewers. Hard cuts only. Every video ends with a US-English publish pack and a scored review (out of 100), and verified lessons carry into the next build.

## Language & Audience Split

- **Chat & Explanations:** Match the user's language (e.g., Arabic for Arabic prompts).
- **On-Screen Captions, In-Scene Labels & Publish Pack:** Always **American English** (`Inter Display` / `DejaVu Sans Bold` + `Noto Color Emoji`), original cast/brands only.

## Workflow

1. **Confirm Length & Concept:** Use 18 s for tight punchy loops (e.g., bathroom crises) or 30–60 s for multi-beat stories. Pitch 10 numbered ideas when asked, then build the chosen number.
2. **Plan the Shot Table:** `# | time | label | framing | action | sound`. Leave a 0.3–1.6 s silent anticipation beat before the punchline.
3. **Build (`scene.html` + `render.js`):**
   - Expose `window.canvas = canvas;` and `window.DUR = <seconds>;` inside `scene.html`.
   - Use offline CDP bundling in `render.js` (`--no-proxy-server`, inline scripts) and keep paper grain static (`ox = 0, oy = 0`) for clean H.264 compression and seamless loops.
4. **Audio (`sfx.py`):**
   - Write 48 kHz true-stereo 16-bit PCM WAV using Python's built-in `wave` module (do not depend on `soundfile`).
   - Synthesize satisfying ASMR-style foley (sub-bass drops on cuts, stretchy strain creaks, crisp pops, slurps, ice clinks, liquid rushes, chimes) + quiet room tone (`-30` to `-36 dB`) + original/licensed music bed (`-20` to `-22 dB`, paused during the silent anticipation beat).
5. **Render & Mux:**
   - `node render.js scene.html frames 30 6`
   - `ffmpeg -v error -y -framerate 30 -i frames/%05d.jpg -i sfx.wav -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -af loudnorm=I=-14:TP=-1.5 -movflags +faststart -shortest out.mp4`
   - Verify `Loop Seam RMSE = 0.000/255` (last frame matches frame 0).
6. **Mandatory Visual & Audio Audit:**
   - Tile key frames (shot middles + punchline + frame 0/last) into a 3×3 contact sheet JPG.
   - Inspect **both** the contact sheet AND the final MP4 with `view_file` before delivering.
7. **Deliver:** Present the MP4, the US-English Publish Pack, and the Scored Review (out of 100).

## Approved Visual Styles

### 1. Red-Cap Close-Portrait Style (Bathroom & Viral Loop Default)
- **Massive 1x Portrait Framing:** Character fills ~75–85% of the `1080x1920` frame (knees to cap). Pure white cartoon body with thick `#14151A` (`~7px`) outlines, rounded shoulders/torso/thighs seated on toilet (never thin stick legs on a toilet), and a backwards red baseball cap.
- **Expressive Strain & Relief:** `><` squeeze eyes, bloodshot veins + radial red cheek blush on peak strain, tremble/vibration lines, glossy blue sweat drops, `O_O` shock, and `^_^` happy tears.
- **Tight Bathroom Staging:** Large porcelain toilet tank & seat behind torso (~65–70% width), dark slate-teal tiled wall with subtle grout, and elbow-height blue towel/TP holder on the right edge.
- **Inside-Gut Cutaway:** Warm terracotta-brown concentric-ring tunnel with a dark 5-pointed star exit in the background; thick-outlined brown 3-tier swirl Turd character with stick limbs planted on the tunnel floor.
- **Trending Caption:** Floating bold white `Inter Display` (`800 50px`) + `Noto Color Emoji` at `y = 215 / 282` with thick `#14151A` `strokeText` outline (no heavy box).

### 2. Full-Body Narrative Style (30–60s Multi-Location Stories)
- **Characters:** Full human figure (~3 heads tall, big-head comedy style), clothed torso/limbs, thick black outline, soft cel shading, simple shoes, one identifying colour/accessory.
- **Full 9:16 Bleed:** Extend sky/ceiling upward and floor/asphalt downward across the full camera span at minimum zoom so no letterbox bands appear.
- **Captions:** One high-contrast top label (`#14151A` outline or black pill) changing at hard cuts.

## Technical & Rigging Rules (Do Not Repeat Past Bugs)

1. **Isolate Outer Silhouettes with `Path2D`:** Store outer head/torso/limb capsules in `new Path2D()` before `ctx.save()/clip()/restore()` cel-shading so `ctx.stroke(path)` never outlines inner details. Set `anticlockwise = true` on outward limb endcaps.
2. **Seamless Two-Segment Limb Joints:** In `twoSegLimb()`, stroke both limb capsule `Path2D`s at `2 * outlineW` first, then fill both capsules inside to eliminate elbow/knee seam circles.
3. **Real-World Scale (1x) & Prop Grips:** Keep props at real size next to the body (phone 15 cm, mug/iced coffee cup 9–12 cm, table 75 cm, chair/toilet seat 45 cm). Anchor hands directly on prop grip points (cup side, straw, handle) and keep props/text away from eyes.
4. **Vehicle Rotation Sign:** Since canvas `+Y` points down, verify rotation signs against screen Y before rendering.

## Final Review & Publish Pack (Every Video)

1. **US-English Publish Pack:**
   - Short SEO title (under 60 characters) + 2–3 emojis
   - 1–2 line description + original/licensed audio attribution line
   - 6–8 hashtags + comma-separated tags list
2. **Score Out of 100 (5 × 20 pts):**
   - **Hook (20):** Strongest/funniest visual + caption in the first 3 s.
   - **Motion (20):** Every shot moves; no static shot > 3 s; shake on impacts.
   - **Effects & Sound (20):** Every visible action has crisp foley; `-30` to `-36 dB` room tone; `-20 dB` music bed; `-14 LUFS` master.
   - **Realism at 1x (20):** Real-scale props and exact hand grips.
   - **Clarity & Story (20):** Phone-readable text, clear escalation, `0.000` seamless loop.
3. **Fix Log:** Note any visual/audio fixes caught during the contact-sheet and MP4 audit.
