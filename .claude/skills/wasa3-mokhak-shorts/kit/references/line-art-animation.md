# External add-on: JDhruv14/line-art-animation (MIT)
Source: https://github.com/JDhruv14/line-art-animation  (a Claude skill + 4 dependency-free TypeScript modules for animated line-art SVG: walking figures, scenes with a day/night cycle, deterministic video capture). Licence: MIT (keep its LICENSE if you copy files).
STATUS: NOT cloned yet (the build sandbox has no network). Install with `bash kit/tools/install_lineart.sh` when network is on. Needs Node >= 22.18, ffmpeg, and Chrome/Chromium only for the video-capture script.

## What it gives us
- `lib/gait.ts` gait({kind:'walk'|'shuffle'|'run'}) -> {speed, period, pose(phase)}: SOLVES legs (planted foot slides back at exactly the travel speed, min-jerk swing, heel peel). Use for any walking person/animal in our scenes (no sine-bobbing, no foot sliding).
- `lib/motion.ts` spring, pendulum, pointerWind, sequence, ease, minJerk: secondary motion (sleeves, scarves, hanging laundry, lanterns, antenna). 
- `lib/daynight.ts` palette(tau): sky/paper/ink/lamp colours for any time of day: use for time-lapse and mood shots.
- `lib/ink.ts` pen, limb (two open strokes around a curve), shoe, place, inkDefs, run: hand-inked line-art drawing primitives.
- `scripts/capture.ts` deterministic headless-Chrome frame capture (advances exactly one frame per screenshot); `scripts/clip.ts` and `scripts/frames.sh` measure a reference clip (loop length, dark blobs, grid-overlaid frames).
- `SKILL.md` + `references/{style,motion,scenes,verify,matching,video}.md`: workflow and rules.

## Its rules worth copying (all apply to our 3D style too)
1. Show ONE figure/corner first and get a yes before building the rest (a full set built at once looks generic).
2. Never animate a figure with free sines: planted feet, move exactly gait.speed * scale per second; compress arrivals, not gaits.
3. Clothes are drawn around the skeleton and swing on springs; interactions are the world reacting (hat tip, cat wakes, lantern swings), not UI.
4. Verify frame by frame: stepped frames, zoomed strips of every moving thing, deterministic stepping, 60 fps check.
5. "Like this but new" = keep medium/proportions/timing feel, invent characters, activities and props.

## How we use it (plan)
- Style A (our 3D diorama, default): port gait + spring ideas into scene packs for walking people (the user wants MORE EXPRESSIVE graphics/actors). Do NOT copy code blindly: re-implement in Python inside tools/scenes/ or load the TS libs only in the WebGL engine path.
- Style B (new option): pure line-art SVG explainer shorts. Needs Chromium + Node >= 22.18 + the repo; render with its capture.ts, then use OUR tools for timing, captions, SFX, mix, finish, postmortem (all work on any silent video + story.json).
