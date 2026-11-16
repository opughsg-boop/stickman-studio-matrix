# Diorama Studio integration

Installed at `/workspace/diorama-studio` from the uploaded archive. The original supplied guide is preserved in `references/diorama-studio-uploaded-style-guide.md`. This is a local engine, with no remote repository writes or paid planner calls enabled by default.

## New-video workflow

1. Prepare an exact spoken script, one sentence per line; select/adapt the nearest plan in `plans/` with story-specific geometry and correct science. Prefer cane.mjs for natural lighting/material conventions, not its sugar-cane content.
2. Run `/workspace/bin/diorama-studio --audio /absolute/voice.mp3 --script /absolute/script.txt --plan plans/NAME.mjs --lang ar --out runs/NAME`. Wrapper selects the existing Python environment and shares the production lock with video-factory. It does not require a paid API.
3. Inspect alignment, contact sheet and motion; automated scores do not establish caption or visual correctness. The built-in preview is a contact sheet, not a motion review. Review ambiguous caption times before delivery.
4. Final is 1080x1920, 30fps H.264/AAC, -14 LUFS target; one render worker on this CPU. CPU mode renders the scene at 720x1280 and upscales the delivery file to 1080x1920; hardware GPU mode renders natively at 1080x1920. This balances the user’s preference for faster, cheaper production. Do not describe CPU output as native 1080p. Preserve original narration speed, never truncate to fit. Audio must be under 60s.
5. Deliver to the already authorized Google Drive destination, then read metadata back. Do not publish or change sharing. Include a title and relevant hashtags when making a new video.

## Adopted look

Natural daylight HDRI, continuous full-frame earth mass with a real textured seven-layer cross-section, library models at real scale, animated actors/plants, continuous moving camera (camEase .6, no punch cuts), purposeful wordless highlights and synchronized SFX. Soft low soft_transition, no default music. The library mixes stylized Quaternius models with scanned Poly Haven models; availability alone does not guarantee photorealism. Select and review assets for each story. Keep smoke behind the subject.

Only spoken Arabic captions, one or two words at a time, separated by spoken lines, bold white with dark outline and brief pop. Default height 78%; scene renderer supports per-cue x/y to avoid covering action. House-style pass enforces no ordinary scene labels and disables allowText. Keep brand «فسّح مخك» and the supplied narration/CTA; imported example names and CTAs do not override them. Unsupported measurements remain qualitative.

## Runtime

Production npm dependencies installed with lifecycle scripts disabled. Reuses installed Chromium, ffmpeg, Playwright Core and `/workspace/work/shorts-runtime` Python. Optional Remotion/HyperFrames development packages are not needed for this engine. Quaternius packs, small Poly Haven props and four soil texture sets downloaded, with licensing files retained in assets. Huge scanned trees are excluded as described in the supplied guide.

Validation artifacts: `/workspace/diorama-studio/runs/setup-check/`. This is a synthetic setup test, not a user video. Existing videos are unchanged.

Delivery encode is capped at 6.5 Mbps video to keep 45-second MP4s below roughly 40 MB for reliable connector delivery. Preserve higher-bitrate local masters when available; compress/mux only for delivery rather than re-rendering unchanged 3D.

## Latest composition: sky above, seven earth layers below

For new jobs set env.groundLayers=7 and env.groundBackdrop=true (house-style default and the reference realistic plan both include them). Strata use shared world height, so the cutaway rear bank and front shelf do not repeat the layers. Exactly seven visual bands span the full soil depth across the frame; default soil block is at least 20×12×10 world units, and the matching earth backdrop does not leave an unrelated plain-brown patch. Keep realistic sky and light clouds above the surface. No layer labels or numbered geological claims. Poultry houses use timber-colored boards or red brick unless specified otherwise.

Reviewed preview references are in `/workspace/diorama-studio/runs/seven-layer-style/`: opening, mechanism close view and ending. This preference update does not replace the already delivered video on Drive.
