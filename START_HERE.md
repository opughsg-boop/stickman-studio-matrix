# START HERE (for a new Claude conversation)

**To Claude:** this zip is "Diorama Studio", the user's video tool. The user speaks Egyptian Arabic and is not technical: reply in short, simple Egyptian Arabic and never ask them to run commands.

## 1. Setup (about 1 minute)
```bash
unzip -oq diorama-studio.zip -d /home/user && cd /home/user/diorama-studio
npm install
pip install faster-whisper yt-dlp
ln -sfn "$(npm root -g)/playwright" node_modules/playwright
```
- Only for the "cine" style (3D animals and people), also run `bash assets/fetch_assets.sh`. The diorama style does not need it.
- Chromium, Playwright and ffmpeg are preinstalled in Claude's cloud container. Do not reinstall them.

## 2. Read next
1. `CLAUDE.md`: the rules, the one-command workflow and the STYLE LOCK.
2. `STYLE.md` (diorama, the current main style) and `STYLE_ZD.md` (cine).
3. `HANDOFF.md` only if you need the full history.

## 3. Current main style: blueprint diorama (the user's favourite)
- **World:** a soil island in a blue grid room. The story goes problem (✗) → fix (✓), building the scene up step by step.
- **Camera:** always moving, with no hard cuts.
- **Captions:** 2-word Arabic captions synced to the voice.
- **Sound:** soft low "whoom" transitions.
- **No words on screen except the spoken captions.**
- **Reference plans** (copy one for a new topic): `plans/coop.mjs` (chickens), `plans/goats.mjs`, `plans/ants.mjs`, `plans/bees.mjs`.
- **Asset packs:** in `renderer/scene.js` (farm, bees, goats, ants). Add new props there for new topics.

## 4. One video
1. Save the user's script, one spoken line per line, to `runs/<name>/script.txt`.
2. Write `plans/<name>.mjs`, copying the closest reference plan.
3. Run:
   ```bash
   node run.mjs --audio <voice> --script runs/<name>/script.txt --plan plans/<name>.mjs --lang ar --out runs/<name>
   ```
   It transcribes, aligns, previews, adds SFX, renders 1080x1920 at 30 fps, runs the self-review and updates `memory/`. It takes about 9 minutes per 35 s of video.
4. Send `runs/<name>/final.mp4`. Report the score in 3 lines. Keep the conversation short, to save the user's daily usage.
