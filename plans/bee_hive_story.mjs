// "لو اشتريت خلية نحل، يبقى عندك خلية على الورق." (voice-over 2026-11-27, 11 lines, 61.8 s, one take). A quiet garden corner on a real-sky
// island: a white Langstroth hive on a cinder-block stand (entrance +z), a clay water pot with river stones, a reed fence behind, a heavy
// evergreen shade tree on the left, a leafy tree on the right that stands bare in the winter lines, a wheat field to +x, a busy road far back.
// Every spoken line is shown, never written (no digits, signs or labels):
//  1 hook: bees pour out of the entrance into the morning sun (first frame); ring on the hive
//  2 wide: the hive in its corner, the road with traffic far behind; close: calm bees (check); over the hive to the road (cross)
//  3 morning sun on the hive front (point-down); the dark heavy shade under the big tree (cross)
//  4 the clay pot beside the hive (water drop); bees land on the wet stones and drink (ripples); bees fan at the entrance
//  5 the pot is gone, a dry cracked spot (cross); bees stream far away over the field (arrow); they come back slow (hourglass)
//  6 winter (cool blue light, the right tree bare): the farmer walks in with the reducer, kneels and fits it in the entrance (palms on it);
//    check; the cold draft curls away from the small notch; a wasp darts at the entrance and is kept out (check)
//  7 he pulls the reducer out: the cold draft pours into the wide slot (cross); a cutaway window shows the bees clustered and shivering,
//    a warm glow as they burn energy
//  8 spring again: he bumps the hive, the top box shifts, bees boil out; he lifts the cover and holds it up; slams it back; bees pour
//    out of the box and fly away over the fence (arrow, cross)
//  9 he pushes the box straight, then stands back watching from a distance with the hive tool (hourglass, eyes); bees calm
// 10 the cutaway window: frames of capped honey, bees busy on the comb (sparkles on the honey)
// 11 CTA: the farmer by the hive waves; thumbs-up; slow pull-out arcing round
// Step up vs the last render (goldfish_care, score 10):
//  motion   - (1) real flight paths: each bee loops out of the slot and back to a landing spot, walks in on the board, drinks on a stone,
//             fans, clusters (shiver jitter) or walks the comb; modes blend over 1.5-3 s, never teleport; (2) the reducer and the cover ride the
//             farmer's palm mid point (contact by construction) with eased hand-offs and a small lift arc; (3) a knocked top box, a slammed
//             cover and a wasp that darts at the entrance and backs off (anticipation, follow-through)
//  graphics - (1) a new bee model: banded tapered abdomen, fuzzy thorax, legs, antennae, folded veined wings when landed and a flickering
//             stroke blur in flight; (2) a white-painted Langstroth hive with hand holds, seams, frame top bars, a galvanised cover, cinder
//             blocks with cores, and a hex comb texture (capped honey, open nectar, brood, pollen); (3) cold-air streaks, a warm cluster glow,
//             a cool winter grade (env.coldK) that keeps the exposure up
//  realism  - (1) real sizes: hive boxes 41.3 x 50.8 x 24.4 cm, entrance 36.7 x 2.2 cm, reducer notch 7 cm, stand 38 cm, pot 54 cm across,
//             farmer 1.75 m, bees 1.4 cm drawn 1.5x so they read on a phone, wasp 2 cm; (2) real kit: the reducer cleat, a hive tool, river
//             stones for safe drinking, a reed fence; (3) the hive, the pot and the farmer never overlap (pot 0.5 m clear, farmer paths 0.15 m clear)
//  sound    - existing bee bed (.035), wind bed .02-.025, bird bed .015 outside the winter lines (global caps unchanged)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => { const s = S[Math.min(i, S.length - 1)]; return i === 0 && k === 0 ? 0 : s.words[Math.min(k, s.words.length - 1)].start; };
const PI = Math.PI;
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const fol = (key, field, off) => ({ follow: [key, field, off] });

// ---------- key times (word starts) ----------
const L = i => W(i);                                    // start of spoken line i+1
const T = { paper1: W(0, 4), quiet2: W(1, 7), calm2: W(1, 10), far2: W(1, 11), crowd2: W(1, 12), sun3: W(2, 6), shade3: W(2, 8), heavy3: W(2, 11),
  water4: W(3, 4), drink4: W(3, 8), cool4: W(3, 10), water5: W(4, 2), go5: W(4, 4), tired5: W(4, 9), reduce6: W(5, 3), small6: W(5, 7), air6: W(5, 9),
  insect6: W(5, 14), enter6: W(5, 18), big7: W(6, 1), cold7: W(6, 5), energy7: W(6, 8), flip8: W(7, 2), open8: W(7, 4), close8: W(7, 7), leave8: W(7, 11),
  quit8: W(7, 14), days9: W(7 + 1, 4), see9: W(8, 7), state9: W(8, 8), make10: W(9, 7), honey10: W(9, 8), like11: W(10, 5) };

// ---------- the hive (apiary_hive at the origin; entrance +z) ----------
const ENT = [0, .413, .262], BOARD_Y = .402;            // slot centre and landing-board top (stand .38 + board .022)
const POT = [1.0, 0, .35], STONES = [[.08, .02, .03], [-.06, .07, .028], [.02, -.09, .032], [-.1, -.04, .025], [.12, -.07, .026], [-.02, .13, .03]];
const PTS = STONES.map(([x, z, s]) => [POT[0] + x, .125 + .35 * s, POT[2] + z]);
const FK = [-1.1, 1.0], SIDE = [-.52, 0], BACK = [-1.2, .9], WATCH = [-1.7, 1.6], CTA = [-.75, .62];
const tk = (t, P, y, yaw, pose, gait) => [t, P[0], y, P[1], yaw, pose, gait];
const trk = [tk(0, [-3.4, 1.9], 0, 1.84, 'carry'), tk(L(5) - 1.1, [-3.4, 1.9], 0, 1.84, 'carry'),
  tk(26.2, [0, .98], 0, PI, 'carry', 'walk'), tk(26.75, [0, .67], -.31, PI, 'placeKneel'), tk(33.85, [0, .67], -.31, PI, 'placeKneel'),
  tk(34.9, [0, .82], 0, PI, 'carry'), tk(36.2, FK, 0, 0, 'carry', 'walk'), tk(36.75, FK, -.55, 0, 'squatReach'), tk(37.35, FK, -.55, 0, 'squatReach'),
  tk(38.0, FK, 0, 2.3, 'stand'), tk(39.3, FK, 0, 2.3, 'stand'), tk(40.2, SIDE, 0, PI / 2, 'stand', 'walk'), tk(40.9, SIDE, 0, PI / 2, 'holdUp'),
  tk(41.35, SIDE, 0, PI / 2, 'holdUp'), tk(41.9, SIDE, 0, PI / 2, 'sackUp'), tk(42.85, SIDE, 0, PI / 2, 'sackUp'), tk(43.15, SIDE, 0, PI / 2, 'holdUp'),
  tk(43.4, SIDE, 0, PI / 2, 'holdUp'), tk(44.6, BACK, 0, 2.4, 'stand', 'walk'), tk(46.6, BACK, 0, 2.4, 'stand'), tk(47.3, SIDE, 0, PI / 2, 'stand', 'walk'),
  tk(47.45, SIDE, 0, PI / 2, 'holdShake'), tk(48.15, SIDE, 0, PI / 2, 'holdShake'), tk(48.4, SIDE, 0, PI / 2, 'stand'), tk(49.6, WATCH, 0, 2.33, 'stand', 'walk'),
  tk(L(10), WATCH, 0, 2.33, 'stand'), tk(L(10) + 1.15, CTA, 0, 0, 'stand', 'walk'), tk(L(10) + 1.3, CTA, 0, 0, 'ctaWave'), tk(D + 1, CTA, 0, 0, 'ctaWave')];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 5, track: trk,
  hideK: [[0, 1], [L(5) - 1.2, 1], [L(5) - 1.19, 0]] } };
const tool = obj('tool', 'hive_tool', [0, 0, 0], { by: 'farmer', hand: 'L', showK: [[0, 0], [49.0, 0], [49.01, 1]] });
const hive = obj('hive', 'apiary_hive', [0, 0, 0], { link: 'hive', seed: 3,
  plugShow: [[0, 0], [L(5) - 1.2, 0], [L(5) - 1.19, 1]], plugK: [[0, 'H:farmer', 0], [26.85, 'IN', .65], [33.85, 'H:farmer', .35], [36.85, [FK[0], .001, FK[1] + .4, 0], .4]],
  lidK: [[0, 'ON', 0], [41.35, 'H:farmer', .3], [43.12, 'ON', .15]], shiftK: [[40.3, 0], [40.75, 1], [47.5, 1], [48.1, 0]],
  winK: [[36.0, 0], [37.0, 1], [39.1, 1], [39.9, 0], [52.6, 0], [53.5, 1], [57.2, 1], [58.0, 0]], honeyK: [[0, .35], [52.0, .35], [52.05, 1]],
  glowK: [[37.5, 0], [38.2, 1], [39.0, 1], [39.6, 0]], draftK: [[28.5, 0], [29.1, 1], [38.9, 1], [39.5, 0]], draftOpen: [[0, 0], [34.1, 0], [34.6, 1]] });
const bees = { id: 'bees', type: 'bees', pos: [0, 0, 0], anim: 'none', dust: false, params: { real: true, count: 36, seed: 21 } };
const HV = (o = {}) => ({ m: 'hive', E: ENT, by: BOARD_Y, R: .9, H: .35, land: .25, ...o });

// ---------- the garden ----------
const world = [glb('treeH', 'nature_pack/CommonTree_3', -3.6, -2.4, 6.5, { rotY: .4, params: { sway: .005 } }), obj('shade', 'shade_spot', [-3.1, 0, -1.2], { w: 4.4, d: 3.2 }),
  glb('treeS', 'nature_pack/CommonTree_2', 2.6, -2.6, 4.6, { rotY: 1.1, params: { sway: .007, ph: 1 } }),
  obj('fence', 'reed_fence', [0, 0, -3.8], { len: 10, h: 1.3 }), obj('road', 'far_road', [0, 0, -13], { len: 34, w: 7 })];
[[-2.2, -3.2, 1.0, 'ph/shrub_01'], [2.2, -3.3, .9, 'ph/shrub_02'], [3.6, .9, .7, 'ph/shrub_03'], [-2.6, .4, .5, 'ph/shrub_03']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
[[1.9, 1.3], [1.5, 1.9], [2.3, .2], [-.9, -1.4], [.8, -1.6], [-2.4, 2.6], [.4, 2.6]].forEach(([x, z], i) =>
  world.push(glb('fl' + i, i % 2 ? 'ph/flower_gazania' : 'ph/dandelion_01', x, z, i % 2 ? .25 : .2, { rotY: i, params: { sway: .03, ph: i } })));
[[-1.6, -.6], [1.6, -.9], [-.6, 1.9], [2.8, 2.2], [-3.2, 3.0], [3.4, -1.4], [-1.0, 3.4], [1.2, 3.2]].forEach(([x, z], i) =>
  world.push(glb('gr' + i, i % 2 ? 'ph/grass_medium_01' : 'ph/grass_medium_02', x, z, .35, { rotY: i * .9, params: { sway: .03, ph: i } })));
for (let ix = 0; ix < 7; ix++) for (let iz = 0; iz < 6; iz++) world.push(glb(`wh${ix}_${iz}`, 'crops_pack/Wheat_Crop', 5.2 + ix * .95, -4.2 + iz * .95, .8, { rotY: (ix * 7 + iz) % 6, params: { sway: .02, ph: ix + iz } }));
const pot = id => obj(id, 'clay_pot', POT, { stones: STONES, seed: 43 });

// ---------- beats (continuous camera; one move each) ----------
const beats = [
  // 1 hook: bees pour out of the slot into the morning sun
  { t: 0, add: [farmer, tool, hive, bees, ...world], modes: { bees: HV() }, camera: { target: [0, .5, .25], dist: 2.2, elev: .14, az: .4, zoom: 'in' } },
  //   ... ring on the hive
  { t: T.paper1, add: [stk('ring1', 'circle_ring', [0, .66, .05], .85, { delay: .15 })], camera: { target: [0, .62, .1], dist: 2.9, elev: .16, az: .6, zoom: 'out' } },
  // 2 wide: the hive in its corner, traffic far behind
  { t: L(1), remove: ['ring1'], camera: { target: [0, 1.0, -5], dist: 10.5, elev: .16, az: .12 } },
  //   ... a quiet place: calm bees (check)
  { t: T.quiet2, add: [stk('ok2', 'check', [0, 1.2, 0], .2, { delay: T.calm2 - T.quiet2 })], modes: { bees: HV({ R: .6, H: .25, land: .35, sp: .8, dur: 2 }) },
    camera: { target: [0, .55, .1], dist: 2.4, elev: .2, az: -.4, zoom: 'in' } },
  //   ... far from the crowd and the noise: over the hive to the road (cross)
  { t: T.far2, remove: ['ok2'], add: [stk('x2', 'cross', [-1, 1.6, -13], 1.3, { delay: T.crowd2 - T.far2, pulse: true })], camera: { target: [-.6, 1.0, -9], dist: 12.5, elev: .05, az: .08 } },
  // 3 morning sun on the hive front (point-down on the sunny spot)
  { t: L(2), remove: ['x2'], add: [stk('pd3', 'point_down', [0, 1.25, .05], .22, { delay: T.sun3 - L(2) })], camera: { target: [0, .6, .2], dist: 2.3, elev: .24, az: .75, zoom: 'in' } },
  //   ... not in heavy shade all day (cross on the dark shade)
  { t: T.shade3, remove: ['pd3'], add: [stk('x3', 'cross', [-3.0, .5, -1.0], .45, { delay: T.heavy3 - T.shade3, pulse: true })], camera: { target: [-2.7, 1.3, -1.3], dist: 6.8, elev: .2, az: .3, zoom: 'out' } },
  // 4 water close by: the clay pot (water drop)
  { t: L(3), remove: ['x3'], add: [pot('pot'), stk('wd4', 'water_drop', [POT[0], .62, POT[2]], .16, { delay: T.water4 - L(3) })],
    modes: { bees: { m: 'drink', E: ENT, pts: PTS, dur: 2 } }, camera: { target: [.5, .35, .35], dist: 2.6, elev: .3, az: .5 } },
  //   ... bees land on the wet stones and drink
  { t: T.drink4, remove: ['wd4'], camera: { target: [1.0, .14, .35], dist: .8, elev: .5, az: .35, zoom: 'in' } },
  //   ... and cool the hive in the heat: fanners on the board
  { t: T.cool4, add: [stk('wd4b', 'water_drop', [.13, .6, .32], .08, { delay: .4 })], modes: { bees: { m: 'fan', E: ENT, by: BOARD_Y, pts: PTS, frac: .35, dur: 1.2 } },
    camera: { target: [0, .45, .3], dist: 1.0, elev: .16, az: .55 } },
  // 5 without water close by: a dry cracked spot (cross)
  { t: L(4), remove: ['wd4b', 'pot'], add: [obj('dry', 'dry_patch', POT, { r: .34 }), stk('x5', 'cross', [POT[0], .4, POT[2]], .22, { delay: T.water5 - L(4) })],
    modes: { bees: HV({ R: .5, land: .4, dur: 1.5 }) }, camera: { target: [.55, .4, .3], dist: 2.5, elev: .3, az: .45, zoom: 'out' } },
  //   ... the bees fly far away over the field (arrow)
  { t: T.go5, remove: ['x5'], add: [stk('ar5', 'arrow_right', [6, 2.2, -3.5], .9, { delay: .9 })], modes: { bees: { m: 'away', E: ENT, F: [15, 3, -7], dur: 1.5 } },
    camera: { target: [4, 1.0, -2], dist: 9.5, elev: .14, az: -.95 } },
  //   ... and come back slow and tired (hourglass)
  { t: T.tired5 - .1, remove: ['ar5'], add: [stk('hg5', 'hourglass', [.3, .82, .3], .13, { delay: .4 })], modes: { bees: HV({ R: .4, land: .55, sp: .55, dur: 2 }) },
    camera: { target: [.15, .5, .3], dist: 1.5, elev: .2, az: .6 } },
  // 6 winter: cool light, the right tree bare; the farmer walks in with the reducer
  { t: L(5), remove: ['hg5', 'dry', 'treeS'], add: [glb('treeW', 'nature_pack/CommonTree_Dead_2', 2.6, -2.6, 4.4, { rotY: 1.1, params: { sway: .004 } })],
    modes: { bees: HV({ R: .25, H: .12, land: .7, sp: .5, board: [.03, .04], dur: 2 }) }, camera: { target: [-.3, .6, .6], dist: 3.4, elev: .2, az: -.6, zoom: 'out' } },
  //   ... kneels and fits it: a small notch only (check)
  { t: T.reduce6, add: [stk('ok6', 'check', [0, 0, 0], .08, { delay: T.small6 - T.reduce6, ...fol('hive', 'plug', [0, .1, .04]) })], camera: { target: [0, .45, .3], dist: 2.2, elev: .14, az: 1.57, zoom: 'in' } },
  //   ... the cold air curls away from the small notch
  { t: T.air6, remove: ['ok6'], camera: { target: [0, .5, .5], dist: 2.9, elev: .18, az: 1.5, zoom: 'out' } },
  //   ... a wasp darts at the entrance and is kept out (check)
  { t: T.insect6, add: [{ id: 'wasp', type: 'bees', pos: [0, 0, 0], anim: 'none', dust: false, params: { real: true, kind: 'wasp', count: 1, seed: 5 } },
    stk('ok6b', 'check', [.1, .6, .45], .07, { delay: T.enter6 - T.insect6 })], modes: { wasp: { m: 'hover', E: ENT, from: [.9, .9, 1.2], blocked: true } },
    camera: { target: [.05, .47, .32], dist: 1.7, elev: .12, az: 1.52, zoom: 'in' } },
  // 7 the wide entrance in winter: he pulls the reducer out, the cold pours in (cross)
  { t: L(6), remove: ['wasp', 'ok6b'], add: [stk('x7', 'cross', [0, 0, 0], .09, { delay: T.big7 - L(6), pulse: true, ...fol('hive', 'ent', [0, .07, .04]) })],
    camera: { target: [0, .45, .3], dist: 2.0, elev: .16, az: 1.5, zoom: 'out' } },
  //   ... the hive cools: the cutaway shows the bees clustered and shivering; a warm glow as they burn energy
  { t: T.cold7 - .4, remove: ['x7'], add: [{ id: 'cl', type: 'bees', pos: [0, 0, 0], anim: 'none', dust: false, params: { real: true, count: 70, seed: 33 } }],
    modes: { cl: { m: 'cluster', C: [.1705, .556, -.02], r: .075, depth: .022 } }, camera: { target: [.2, .6, 0], dist: 1.25, elev: .1, az: 1.45, zoom: 'in' } },
  // 8 spring: he bumps the hive (the top box shifts)
  { t: L(7), remove: ['cl', 'treeW'], add: [pot('pot2'), glb('treeS2', 'nature_pack/CommonTree_2', 2.6, -2.6, 4.6, { rotY: 1.1, params: { sway: .007, ph: 1 } })],
    modes: { bees: HV({ R: .5, land: .3, dur: 1.5 }) }, camera: { target: [-.1, .7, .1], dist: 3.0, elev: .2, az: .45 } },
  //   ... bees boil out
  { t: T.flip8, modes: { bees: { m: 'agit', E: ENT, by: BOARD_Y, R: .7, H: .3, land: .1, sp: 1.8, dur: .8 } }, camera: { target: [-.1, .75, .05], dist: 2.5, elev: .22, az: .55, zoom: 'in' } },
  //   ... he lifts the cover and holds it up
  { t: T.open8, modes: { bees: { m: 'agit', E: [0, .93, 0], R: .6, H: .3, land: 0, sp: 1.6, dur: 1 } }, camera: { target: [-.15, .95, 0], dist: 2.3, elev: .28, az: .75 } },
  //   ... and slams it back at the wrong time
  { t: T.close8, camera: { target: [-.1, .85, 0], dist: 2.6, elev: .2, az: .35, zoom: 'out' } },
  //   ... the bees pour out and fly away over the fence (arrow, cross)
  { t: T.leave8, add: [stk('ar8', 'arrow_up_left', [-1.8, 2.6, -5], .8, { delay: .5 }), stk('x8', 'cross', [0, 1.3, 0], .3, { delay: T.quit8 - T.leave8, pulse: true })],
    modes: { bees: { m: 'pour', E: [0, .95, 0], F: [-3, 4.5, -15], dur: 1.2 } }, camera: { target: [-1.2, 1.6, -4], dist: 8, elev: .16, az: .3 } },
  // 9 he pushes the box straight; calm bees come back; every few days (hourglass)
  { t: L(8), remove: ['ar8', 'x8'], add: [stk('hg9', 'hourglass', [0, 1.3, 0], .2, { delay: T.days9 - L(8) })], modes: { bees: HV({ R: .6, land: .35, dur: 3 }) },
    camera: { target: [-.3, .75, .15], dist: 3.4, elev: .2, az: .4 } },
  //   ... he watches quietly from a distance with the hive tool (eyes)
  { t: T.see9, remove: ['hg9'], add: [stk('eye9', 'eyes', [0, 0, 0], .2, { delay: T.state9 - T.see9, ...fol('farmer', 'beak', [0, .34, 0]) })],
    camera: { target: [-.85, .8, .8], dist: 6.5, elev: .15, az: .755 } },
  // 10 the cutaway: frames of capped honey, bees busy on the comb
  { t: L(9), remove: ['eye9'], add: [{ id: 'cb', type: 'bees', pos: [0, 0, 0], anim: 'none', dust: false, params: { real: true, count: 40, seed: 44 } }],
    modes: { cb: { m: 'comb', C: [.1705, .784, 0], w: .36, h: .17 }, bees: HV({ R: 1.0, H: .4, land: .25, sp: 1.15, dur: 1.5 }) },
    camera: { target: [.2, .66, 0], dist: 1.35, elev: .1, az: 1.4, zoom: 'in' } },
  //   ... lots of honey (sparkles)
  { t: T.make10, add: [stk('sp10', 'sparkles', [.26, .88, 0], .1, { delay: T.honey10 - T.make10 })], camera: { target: [.21, .79, 0], dist: .8, elev: .05, az: 1.5, zoom: 'in' } },
  // 11 CTA: the farmer by the hive waves; thumbs-up; slow pull-out arcing round
  { t: L(10), remove: ['sp10', 'cb'], add: [stk('th11', 'thumbs_up', [-.25, 1.75, .55], .3, { delay: T.like11 - L(10) })],
    camera: { target: [-.35, .9, .35], dist: 3.0, elev: .14, az: .2, spin: .5, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'لو اشتريت خلية نحل',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 36, d: 30, depth: 3.2 }, flatTop: true, soil: 'forrest_ground_01', soilRepeat: 10, soilTint: [1.0, .97, .9], horizon: 'nile', cover: false,
    haze: .4, sunElev: 30, sunAz: 25, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 2, motes: .3, clouds: 16,
    coldK: [[L(5) - .2, 0], [L(5) + 1.0, 1], [L(7) - .2, 1], [L(7) + 1.0, 0]],
    // sound library (this plan only, at or under the global bed .03); the bee bed comes from the existing pipeline (.035)
    sfxBeds: [{ cat: 'wind', idx: 0, gain: .02, fade: 1.5 }, { cat: 'wind', idx: 1, gain: .025, start: L(5), end: L(7), fade: 1.2 },
      { cat: 'bird', idx: 0, gain: .015, end: L(5), fade: 1.5 }, { cat: 'bird', idx: 0, gain: .015, start: L(7) + .5, fade: 1.5 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, kind: 'info', text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
