# Scripts and style (compact summary)
Read this first for any new video. It is a compact summary of everything decided so far.

## 1. Script formula (Egyptian Arabic, 30-40 s, 70-100 words)
1. **Hook (line 1):** a shocking or strange image or claim. Examples: "عشة الفراخ الغلط بتتعب فراخك من أول يوم!", "الطائر ده رجع… وفي رقبته رمح".
2. **Problem → fix pairs:** "بس …" = the problem (✗ on screen), "فـ …" = the fix (✓). Use 3-4 pairs, so the scene builds up step by step.
   - For facts or stories instead: "ده بسبب إن…" → "بس…" → "فـ…" → a surprise.
3. **Tip line:** "وخلي بالك: …" with one surprising detail.
4. **CTA (last line), tied to the page:**
   - "لو استفدت، اعمل لايك وتابع صفحة وسّع مخك... عشان مخك يوسع!"
   - or "لو عجبك الفيديو، تابعنا وشوف أسرار تانية."
- Write one spoken sentence per line, with no on-screen numbers or labels (they are spoken only).
- The user records with ElevenLabs (voice "Felix") or Google AI Studio TTS. For AI Studio, put a style line on top: "اقرأ باللهجة المصرية، راوي متحمس وسريع، وقفة قصيرة قبل «بس»".

## 2. Main style: blueprint diorama (the user's favourite, best scores 90-93)
- **World:** a soil island with a cross-section edge, inside a blue grid room with god-rays. Topic props drop or grow onto the island and the scene builds up beat by beat.
- **Camera:** continuous and never still, with no hard cuts (`camEase` 0.6, `punch:false`). Zoom in and zoom out alternate. Close-ups go inside the build. The last beat is a wide orbit.
- **Icons:** ✗ red with a red edge flash on problems. ✓ green with a white flash on fixes. Arrows and the clock are allowed because they are wordless.
- **Cutaway rule:** remove or lower the walls, fences or mesh facing the camera, so the animals are always visible.
- **Captions:** 2 words, never mixing two spoken lines, white bold, at 78 % of the frame height.
- **Sound:** a soft low "whoom" on transitions, wood or metal impacts on landings, a ding on fixes and a buzz on problems. Everything is ducked under the voice, at -14 LUFS.
- **STYLE LOCK:** no words on screen except the spoken captions.

## 3. Finished topics (copy the closest plan)
| Topic | Plan | Score |
|---|---|---|
| Ant colony / sleep | `plans/ants.mjs` (ant farm, 24h clock, film camera) | 93 |
| Chicken coop | `plans/coop.mjs` | 90 |
| Bee hive | `plans/bees.mjs` | 78 |
| Goat pen | `plans/goats.mjs` | 73 |
| Spear-bird (cine style) | `stories/spear.json` | 83 |
| Pyramids, pole barn, drip irrigation | made in other sessions, see `stories/` and `plans/` | - |

**Lessons learned:**
- Dark wood fills the frame: keep exposure up, cut the walls away, show fewer dark close-ups.
- Close shots need a camera distance of at least about 5.
- Wide shots of small props (6 units wide) need a distance of at most about 14.

## 4. Titles / posting
- **Title:** a hook question or shocking line, plus an emoji. Example: "المعزة دي نطت من فوق السور! 😳".
- **Description:** 2 lines, then "تابعني لفيديوهات أكتر 👆".
- **Hashtags:** 4-5 topical ones, plus #وسع_مخك.
