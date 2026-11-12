# Reference style analysis — "Blueprint Diorama Build-up"

Source: reference video (720x1280, 30 fps, 49 s, Spanish narration, 1 topic: how to build a chicken coop).

## Visual language
- **World**: a floating rectangular *soil island* (cross-section visible: topsoil + lighter clay strata) sitting
  inside an infinite **blueprint room** — saturated blue (#2f6fb8 → #8fb7e0) floor and two back walls covered by a
  white grid. Soft diagonal **god-rays** from the top-left.
- **Objects** are semi-realistic 3D props: wooden posts and beams, corrugated metal roof, hexagonal chicken wire,
  feeders/waterers, perches, nest boxes, chickens. Medium detail, PBR-ish, soft shadows.
- **Annotation graphics**: thick yellow (#f2c230) arrows/double-arrows with dark outline for measurements
  ("50 cm", "20 cm per hen"). Red/orange heat overlay for "too hot", night tint for "at night".

## Narrative structure (the key to the format)
Problem → fix → new problem → fix … Each sentence = one beat.
- "Pero …" (but) = **problem beat**: show the failure (chickens wander into crops, heat haze, chickens sleep on dirt).
- "Entonces …" (so) = **solution beat**: a new component *assembles* into the scene (drops in / grows), cumulative.
- Final "Ojo" (tip) beat + close-up hero shot.
Ten beats in ~47 s → 3–6 s per beat.

## Camera
- Opens wide/high 3/4 view of the whole island, then pushes in progressively; later beats are close interior
  shots at chicken eye level. Mostly hard cuts or fast eases at each beat, slow dolly drift inside a beat.

## Captions
- ONE word at a time, ALL CAPS, white, heavy condensed italic sans (Barlow Condensed ExtraBold Italic),
  thin dark outline + soft drop shadow, centered at ~75 % of frame height. Word-synced to the voice.

## Audio
- Single fast-paced narrator, no music bed noticeable, no SFX.

## How it is produced (and how this tool reproduces it)
Original was most likely Blender/Unreal with stock assets. This tool reproduces it fully in code:
Three.js (procedural assets) rendered headless in Chromium via Playwright, faster-whisper for word timing,
Claude (optional) or a rule-based planner for the beat → scene mapping, FFmpeg for encode/loudness.

## STYLE LOCK (user decisions, never change without the user asking)
- No words on screen except the spoken captions: no signs, labels, counters, pins or button text. The engines enforce this unless a plan sets `style.allowText: true`. Only wordless icons are allowed (✓ ✗ arrows).
- Transition sound: the soft low "whoom" (`soft_transition` in `pipeline/sfx.py`). The hissy noise whoosh ("تش تش") was rejected.
- Diorama: continuous camera (`camEase` 0.6, no punch cuts), 2-word Arabic captions per spoken line, ✓/✗ icons on fix/problem beats.
