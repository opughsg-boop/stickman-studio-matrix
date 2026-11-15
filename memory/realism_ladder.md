# Realism ladder (user rule, 2026-11-15)
Each new video gets ONE realism step (1x). When the user says a step is the best so far, lock it here and stop changing it.

| Step | Video | What changed | Status |
|---|---|---|---|
| 0 | chicken tractor v2 | realistic hen model, cage bounds, grass/shrub scenery | done |
| 1 | hens dark corner v3 | one pale sky with light clouds (no sea/sky split), high lawn cover | in review (lawn still patchy) |
| 2 | horse stable | real grass ground texture (`soil:'aerial_grass_rock'`, repeat 3) + `cover:'high'` at `coverGain:1.0`, no flat lawn box; photo sky `kloofendal_48d_partly_cloudy_puresky` with `fog:'#b4d0e8'`, `haze:.3`, pale water, `waves:0` | in review: PROPOSED LOCK (user asked to lock natural ground and sky) |

## Natural preset (use as the env block of every new plan until the user changes it)
`env: { sky:'kloofendal_48d_partly_cloudy_puresky', soil:'aerial_grass_rock', soilRepeat:3, cover:'high', coverGain:1.0, water:'#7f9fb3', fog:'#b4d0e8', haze:.3, horizon:'hills', horizonDist:260, waves:0, foam:false, birds:3, motes:1 }`
Never add a flat-coloured ground box (it looked like neon green). The v3 sky3d settings looked artificial to the user.
