# Fast cinematic 3D explainer style ("cine" engine), learned from 5 reference reels

Measured with `pipeline/ref_profile.py`; the numbers are in `memory/ref_profile_zd.json`.

## Script formula (all 5 references)
- 26 to 38 s, 80 to 110 words, about 180 words per minute, in second person ("If you…", "you'll only see…").
- The structure has four steps:
  1. Hook: open on a strange consequence, already in progress.
  2. Explanation: "Now this is because…" or "You see,…".
  3. Twist: "But…".
  4. Resolution: "So…", ending on an ironic or punchy last line.
- Every clause gets its own literal visual. One phrase is one shot.

## Picture
| Metric | Reference avg | Meaning |
|---|---|---|
| Shot length | ~1.1 s detected, median 0.5 s | Detected value is inflated by whip pans. Real cuts are every 1 to 2 s. |
| Luma | 105 / 255 | Medium-bright, never washed out |
| Saturation | 0.38 | Natural, slightly muted colours |
| Motion energy | 22 | The camera never stops moving |
| Centre/edge sharpness | 2.05 | Shallow depth of field: sharp subject, soft background |

- **Sets:**
  - Seamless studio cyclorama in a strong colour (teal `#2fb8cc`, royal blue `#2a6fd6`, sky).
  - Realistic places such as a street, a room or the outdoors.
- **Subjects:** expressive 3D people and animals, and macro close-ups of objects.
- **Graphic devices:**
  - X-ray or cutaway inside a body, with glowing nerves or organs.
  - A purple or green glow highlight on the part being discussed.
  - UI callouts: camera viewfinder, a big red counter such as "3x", map pin with "+ 4 Hours", meters and bars, a dashed ghost outline, a glowing ring on the ground.
- **Camera:**
  - Handheld drift, fast push-ins, orbits, low and high extremes, wide lens.
  - Whip-pan transitions with motion smear. Occasional white flash.

## Captions
White, 2 to 3 words at a time, semi-bold geometric sans (Montserrat 700; Cairo 800 for Arabic), soft black shadow, no outline, centred at 78 % of frame height.

## Audio
Fast single narrator. Whoosh on whips, subtle impacts, and light SFX ducked under the voice.

## Engine mapping (`renderer/cine.js`)
- **`set`:**
  - `studio{color}`: gradient cyclorama with HDRI reflections.
  - `ground{hdri}`: HDRI projected onto the ground (outdoors or a room).
  - `hdri`: HDRI as background.
- **`actors`:** glTF models in `assets/models` with a named animation clip.
  - Placement and motion: `pos`/`to` path, `height`.
  - Look: `morph` facial expressions (RobotExpressive: Angry/Surprised/Sad), `xray`, `holo` glow colour.
- **`props`:**
  - Shapes: box, sphere, cylinder, cone, ring, disc.
  - Specials: cup (glass and water), particles (bacteria and sparks), and any glb via `model`.
- **`camera`:**
  - Movement: `pos`/`target` (or an actor id), `to`, `orbit`, `fov`, `handheld`.
  - Focus: `dof{aperture,maxblur}`.
- **`ui`:** viewfinder, counter, pin, label (world-anchored), arrow, meter.
- **Shot fields:** `transition` (whip or cut), `whipDir`, `flash`, `fx.bloom`, `fx.grade`.

The self-review compares every cine video with the reference profile. It auto-tunes `memory/style.json → cine` (brightness, saturation, handheld).

## STYLE LOCK (user decisions, never change without the user asking)
- No words on screen except the spoken captions: no signs, labels, counters, pins or button text. The engines enforce this unless a plan sets `style.allowText: true`. Only wordless icons are allowed (✓ ✗ arrows).
- Transition sound: the soft low "whoom" (`soft_transition` in `pipeline/sfx.py`). The hissy noise whoosh ("تش تش") was rejected.
- Diorama: continuous camera (`camEase` 0.6, no punch cuts), 2-word Arabic captions per spoken line, ✓/✗ icons on fix/problem beats.
