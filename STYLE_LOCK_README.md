# Diorama Studio: the locked style (for a NEW conversation)

Read this first, then STYLE_GUIDE.md and CLAUDE.md, then memory/visual_lessons.md.

## Setup in a fresh container (about 3 minutes, do it silently)
    npm install
    pip install faster-whisper yt-dlp
    ln -sfn "$(npm root -g)/playwright" node_modules/playwright
    bash assets/fetch_library.sh      # Quaternius animals/people/trees + Renderpeople person
    python3 assets/fetch_polyhaven.py # Poly Haven grass, rocks, props, soil (CC0)
Chromium, Playwright and ffmpeg are already installed. Do not reinstall them.

## The look (LOCKED, approved 2026-11-14)
- 3D sky by default (`env.sky:'sky3d'`): atmosphere dome + drifting 3D clouds, image-based light from the same sky, sun behind the camera and to the right.
- Natural colours, real models at real sizes (`height` in metres), Renderpeople scanned person, smooth matte animals.
- Continuous camera (camEase .6, no punch), one slow fly move for dives (`camera.fly`).
- Pointers are 3D emoji stickers (`type:'sticker'`, names in assets/stickers/catalog.json), never plain arrows, and never stickers with letters or digits.
- Anatomy window: `cutBox` + `cutOpen` opens a window in the animal's flank, organs inside in real places with real textures; the camera stays outside (plans/rumen_window.mjs).
- Captions: 2 words, white bold, Arabic. No other words on screen (glossy-toy exception only where the user approved it).
- Audio: -14 LUFS target. 1080x1920, 30 fps, H.264 + AAC.

## Workflow
1. Save the script to runs/<name>/script.txt (one spoken line per line).
2. Copy the closest plan (plans/rumen_window.mjs for anatomy, plans/cane.mjs for landscapes) to plans/<name>.mjs and change the content.
3. Check the plan against memory/visual_lessons.md before rendering.
4. Preview with `--preview-only`, look at ONE sheet, then full render (about 1 hour on CPU):
       node run.mjs --audio <file> --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name>
5. Send runs/<name>/final.mp4, summarise the score in 3-4 lines.
6. Commit plan + memory changes and push to diorama-studio.

## Known open items
- Stomach and omasum surfaces are procedural (honeycomb/leaves/folds textures): realistic enough but not photoreal.
- Sticker version of the cow video is not rendered yet.
- Sketchfab CC-BY anatomy models need a user-provided API token (see memory/anatomy_sources.md).
