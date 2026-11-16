# Poultry spiral-auger feeding — frozen graphics

Plan: `plans/poultry-feed.mjs` reads the actual six-segment transcript and writes `runs/poultry-feed/plan.json`. Duration 30.1191875 seconds; camera beats begin 0, 4.78, 9.533, 14.02, 19.48, 25.32. Spoken captions only; narration/audio/pipeline were not modified.

Production changes: added `renderer/poultry-feed.js`, imported/registered isolated ASSETS.poultry_feed in `renderer/scene.js`, and added the optional metal PBR texture ID to the realistic material preload. All legacy asset types remain intact. Added `assets/ph_tex/metal_plate/` with CC0 source attribution. Poly Haven concrete PBR is used on the building floor; metal roughness/normal maps contribute subtle surface detail, but dark tread-plate albedo is deliberately not used on galvanized-looking equipment. Equipment has silver standard-PBR albedo, physically lit, with low-strength texture normals.

## Mechanism and model boundaries

External cylindrical storage silo with conical hopper on four legs connects to an inclined auger tube, then an interior receiving hopper and gravity downpipe. The horizontal feeder begins at that downpipe and ends at a motor housing. Five regularly spaced pan feeders have clear junction collars/downpipes, central cones, grill spokes, rim, and changing feed level. Ten smooth procedural hens peck independently around them. The open front and removed front roof half expose the naturally shaded farm-building interior. The suspended feeder is y=1.05 while roof framing is above y=3.2: projected overlap is not a feeder above the roof.

The working element is a shaftless wound spiral wire/flight, not a conveyor belt. Its rotation is around the horizontal tube X axis. Grain advances axially and drops at each pan. The tube's opaque rear shell has two-sided material; during inspection its front section becomes a light translucent cover, keeping the auger visibly enclosed. This is an instructional longitudinal section, not an assertion that operational metal tubes are transparent.

Last-pan sensor is a simplified diaphragm/switch housing with a control cable and a wordless colored ring. Running is pale green; stopped/full is amber. No numeric reading or fabricated capacity/flow rate is shown. Rotation and grain transport stop together at 20.4s. Consumption lowers feed level during the stop, then transport restarts continuously at 23.7s. The same integrated running-time function drives rotation and pellet movement, so stop/restart does not rewind the auger. Birds keep pecking while the motor is stopped.

## Interfaces

`{type:'poultry_feed',params:{level:.35,drive:[[0,20.4],[23.7,duration]]}}`.

Modes: `{level,cutaway,control,duration}`. `level` smoothly interpolates pan fill. `cutaway` exposes the translucent inspection window and grains. `control` uses the timed fill/stop/consume/restart sequence within the narrated sensor beat. `drive` is an array of running intervals, used identically by auger and moving grains.

Coordinates and scales are illustrative. A real installation may use different suspended heights, pan spacing, transfer routing or sensor design. The hens are purpose-built semi-realistic procedural meshes with feather texture and articulated necks, not scanned animals; no appropriate licensed hen scan was found in the existing local library. The five pans stand for a longer repeating line, chosen to keep CPU geometry and draw calls manageable. This is a mechanism illustration, not an installation drawing or engineering specification.

## Style and evidence

Realistic HDRI sky/IBL, a continuous full-width soil block with exactly seven equal-depth, high-contrast strata, no sky below ground, PBR materials, 512 shadows updated at .3-second intervals. Poultry-house framing uses timber-colored walls and roof with low cutaway walls so close shots retain sky and the mechanism. No earth-layer numbering or geological claim. Continuous six-beat camera; wide framing includes silo and building. Arabic spoken captions are the only visible words.

Reviewed updated stills: `preview_00.jpg` through `preview_05.jpg`. The mechanism, distribution, full/low sensor states, continuous ground strata, and timber poultry house were visually checked. No page/shader exceptions; the usual initial non-blocking browser 404 remains.

Root produced the final render after the graphics freeze. Current approved deliverable: `final.mp4` in this folder.
