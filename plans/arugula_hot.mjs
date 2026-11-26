// "ليه الجرجير طعمه حار كأنك بتاكل شطة أو فلفل الحار؟!" (voice-over 2026-11-26, 8 lines, 39.9 s, one take). Real-sky island of Delta
// farmland: a sown rocket bed in the middle, a hero plant with a red chilli at the front, a cutting board beside it, a sun-baked cracked
// patch at the back, a shade-net bed on the right with the farmer and a garden tap, and the rocket / radish / mustard trio at the front right.
// Every spoken line is shown, never written:
//  1 hook: a rocket leaf is bitten in three chomps (crumbs fly), ring on the bite; the camera slides to the red chilli beside it (fire)
//  2 a beetle walks up to the bitten leaf, touches its edge, turns and walks off (cross on the beetle), the leaf stays (check)
//  3 on the board: the two stored compounds glow inside a leaf (amber and teal beads), a hand slices it with a knife (point-down on the
//    cut), the beads rush to the cut edge, meet, glow and sparkle (sparkles)
//  4 the sun glares over the cracked dry patch (heat shimmer), the rocket there wilts and curls; arrow-up on the leaves (stronger taste)
//  5 under the shade net the farmer sets a seedling into the soil, stands, takes the hose and waters the bed evenly (water drop), the soil
//    darkens; check
//  6 he picks a small young leaf with his fingers and shows it; the big old bolted plant beside it gets the cross
//  7 rocket, radish and mustard side by side, each puffs sparks (sparkles on each), ring around all three
//  8 CTA: he walks out of the shade net holding a bunch of rocket; thumbs-up; slow pull-out arcing round
// Step up vs the last render (birds_worms, score 66):
//  motion   - (1) bites happen live in three chomps with crumbs on ballistic arcs; (2) the beetle's walk has a real approach-touch-U-turn
//             path with its legs cycling (no flip, no sliding off the soil); (3) the knife cut is a keyed hand track (hover, press, draw,
//             lift) and the plants wilt progressively (droop, curl, dull colour), the hose sweeps an even fan of ballistic drops
//  graphics - (1) new procedural rocket / radish / mustard leaves from real silhouettes (pinnatifid lobes, midrib + lobe veins, hairy
//             radish), 4-petal cream flowers with purple veins, yellow mustard flowers and pods; (2) a voronoi sun-baked crust with bump
//             relief and curled lighter plate edges; (3) the compounds as two-colour glowing beads that gather and spark at the cut edge
//  realism  - (1) real sizes: rocket 0.15-0.25 m (leaves 6-20 cm), old bolted rocket 0.5 m, mustard 0.5 m, radish 0.22 m with a red
//             shoulder, chilli 7 cm, beetle 13 mm, board 36 x 24 cm, shade net 2 m high, farmer 1.75 m; (2) the farmer's hands touch the
//             seedling, the hose nozzle and the picked leaf (probe); (3) every beat dead-beat free: each one adds a new visible action
//  sound    - this plan only: a soft wind bed (.03), a light bird bed (.02), a water bed (.02) only while the hose runs; no calls
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  like1: W(0, 4), hot1: W(0, 8), insect2: W(1, 6), notby2: W(1, 8), mat3: W(2, 3), cut3: W(2, 7), bite3: W(2, 9), out3: W(2, 11),
  hot4: W(3, 4), more4: W(3, 8), plant5: W(4, 7), water5: W(4, 10), even5: W(4, 11), small6: W(4 + 1, 1), big6: W(5, 4),
  aru7: W(6, 2), rad7: W(6, 6), mus7: W(6, 7), all7: W(6, 8), hot7: W(6, 10), like8: W(7, 4) };

// ---------- layout (metres). Island front face at z = 8; everything sits 1.5 m back from it; the camera works from +z ----------
const HERO = [0, 5.75], BOARD = [-.55, 5.95], DRY = [0, 1.9], NET = [2.9, 4.5], TRIO = [[.9, 5.95], [1.28, 5.95], [1.66, 5.95]];
const BED = { pos: [0, 4.7], w: 2.4, d: 1.3 };

// 1-2 hero plant + bitten leaf + chilli + beetle
const LAZ = .35, LEL = .34, LLEN = .15;
const heroPlant = obj('heroP', 'arugula_plant', [HERO[0], 0, HERO[1]], { kind: 'aru', h: .2, seed: 5, skipAz: [LAZ, .5], flowers: 6 });
const heroLeaf = obj('heroL', 'aru_leaf', [HERO[0], .012, HERO[1]], { len: LLEN, az: LAZ, el: LEL, curve: .35, fold: .16, bites: [.2, .5, .8], sway: .025 });
const chilli = obj('chilli', 'aru_chilli', [-.105, 0, HERO[1] + .13], { len: .07 }, .4);
const BUG = [[T.l1 + .25, .34, 0, HERO[1] + .41], [T.insect2 - .2, .097, 0, HERO[1] + .168], [T.insect2 + .25, .095, 0, HERO[1] + .166],
  [T.insect2 + .55, .108, 0, HERO[1] + .158], [T.insect2 + .85, .127, 0, HERO[1] + .18], [T.l2 - .1, .3, 0, HERO[1] + .45]];
const beetle = obj('beetle', 'tomato_bug', [0, 0, 0], { kind: 'beetle', size: .013, path: BUG, hideAt: T.l2 + .6 });
const BUGHIT = [BUG[2][1], .03, BUG[2][3]];

// 3 board, leaf, knife hand
const CUT = [BOARD[0] - .08 + LLEN * .5, .0185, BOARD[1]];                       // leaf base at x -.08 from the board centre, cut at s .5
const board = obj('board', 'aru_board', [BOARD[0], 0, BOARD[1]], {});
const cutLeaf = obj('cutL', 'aru_leaf', [BOARD[0] - .08, .0195, BOARD[1]], { len: LLEN, az: Math.PI / 2, el: 0, curve: 0, fold: .05, sway: 0, cutAt: .5, cutT: T.cut3 + .02,
  sep: .07, cellsK: [[T.mat3 - .3, 0], [T.mat3 + .5, 1]], gatherK: [[T.cut3 + .25, 0], [T.bite3 + .2, 1]], sparkK: [[T.bite3 + .1, 0], [T.out3 - .2, 1]] });
const HIDE = [0, -3, 0], KF = [.45, -.89, 0], KU = [.89, .45, 0];
const hk = (t, P, pose = 'fist') => [t, ...P, ...KF, ...KU, pose];
const add = (a, b) => a.map((v, i) => v + b[i]);
const handTrack = [hk(0, HIDE), hk(T.mat3 + .6, HIDE), hk(T.mat3 + .6001, add(CUT, [-.16, .26, .12])), hk(T.cut3 - .45, add(CUT, [0, .04, .012])),
  hk(T.cut3 - .02, add(CUT, [0, .0012, .012])), hk(T.cut3 + .25, add(CUT, [0, 0, -.012])), hk(T.cut3 + .6, add(CUT, [-.012, .05, -.01])),
  hk(T.bite3 + .3, add(CUT, [-.22, .28, .06])), hk(T.bite3 + .3001, HIDE)];
const hand = { id: 'hand', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side: 'R', link: 'hand', track: handTrack, knifeK: [[0, 1]] } };

// 4 the dry patch: crust, wilting bed, heat shimmer, sun glare
const crust = obj('crust', 'dry_crust', [DRY[0], 0, DRY[1]], { w: 2.6, d: 1.9, seed: 19 });
const dryBed = obj('dryBed', 'aru_bed', [DRY[0], 0, DRY[1]], { w: 1.5, d: .8, row: .22, sp: .16, seed: 21, soil: false, size: .9, wiltK: [[T.l3 + .2, .05], [T.more4 + .3, 1]] });
const haze = obj('haze', 'heat_haze', [DRY[0], 0, DRY[1]], { w: 1.6, d: .8, count: 10, opacity: .14 });
const sun = obj('sun', 'sun_glow', [.35, 1.35, -.6], { size: 1.3, showK: [[0, 0], [T.l3 - .3, 0], [T.l3 + .6, 1], [T.l4 + .2, 1], [T.l4 + .8, 0]] });

// main sown bed (between the hero and the dry patch)
const mainBed = obj('bed', 'aru_bed', [BED.pos[0], 0, BED.pos[1]], { w: BED.w, d: BED.d, row: .2, sp: .13, seed: 11, flowers: .08 });

// 5-6, 8 shade-net bed, farmer, hose, seedling, young + old plants
const NB = [NET[0], 4.45];
const F = [2.9, 5.32], F2 = [2.55, 5.32], FC = [2.75, 5.98], YAWN = Math.PI;
const SEED = [2.9, F[1] - .40], YOUNG = [2.6, F2[1] - .40], OLD = [2.22, F2[1] - .42];
const net = obj('net', 'shade_net', [NET[0], 0, NET[1]], { w: 2.2, d: 1.8, h: 2.0 });
const netBed = obj('netBed', 'aru_bed', [NB[0], 0, NB[1]], { w: 1.8, d: 1.1, row: .2, sp: .13, seed: 31, wet: true, size: 1.05,
  excl: [[SEED[0] - NB[0], SEED[1] - NB[1], .12], [YOUNG[0] - NB[0], YOUNG[1] - NB[1], .15], [OLD[0] - NB[0], OLD[1] - NB[1], .3]] });
const TPLANT = T.plant5 + .05, THOLD = [TPLANT + .5, T.l5 - .2], TPICK = T.small6 + .02;
const seedling = obj('seedling', 'arugula_plant', [SEED[0], 0, SEED[1]], { kind: 'aru', young: true, h: .09, seed: 8, plantIn: { t0: T.l4 - .6, t1: TPLANT, by: 'farmer', hand: 'L' } });
const young = obj('young', 'arugula_plant', [YOUNG[0], 0, YOUNG[1]], { kind: 'aru', young: true, h: .1, seed: 9, picks: [{ az: 0, t0: TPICK, by: 'farmer', hand: 'R', hideAt: T.l6 + .7 }] });
const oldP = obj('old', 'arugula_plant', [OLD[0], 0, OLD[1]], { kind: 'aru', old: true, h: .2, seed: 12, flowers: 10 });
const at = (P, y = 0) => [P[0], y, P[1]];
const trk = [[0, ...at(F, -.55), YAWN, 'squatReach'], [T.l4 - .2, ...at(F, -.55), YAWN, 'squatReach'], [T.l4 + .3, ...at(F, -.55), YAWN, 'tieLow'], [TPLANT - .5, ...at(F, -.55), YAWN, 'tieLow'],
  [TPLANT, ...at(F, -.55), YAWN, 'squatReach'], [THOLD[0] - .05, ...at(F, -.55), YAWN, 'squatReach'], [THOLD[0] + .5, ...at(F), YAWN, 'pickReach'], [THOLD[1], ...at(F), YAWN, 'pickReach'],
  [THOLD[1] + .45, ...at(F2), YAWN, 'stand', 'walk'], [TPICK - .05, ...at(F2, -.55), YAWN, 'squatReach'], [TPICK + .1, ...at(F2, -.55), YAWN, 'squatReach'], [TPICK + .55, ...at(F2, -.55), YAWN, 'pullTug'],
  [TPICK + 1.2, ...at(F2), YAWN, 'holdUp'], [T.l6 - .1, ...at(F2), YAWN, 'holdUp'], [T.l6 + .5, ...at(F2, -.55), YAWN, 'squatReach'], [T.l7 - .4, ...at(F2, -.55), YAWN, 'squatReach'],
  [T.l7 + .1, ...at(F2), YAWN, 'ctaHold'], [T.l7 + 1.1, ...at(FC), 0, 'ctaHold', 'walk'], [D + 1, ...at(FC), 0, 'ctaHold']];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 4, track: trk } };
const REST = [F[0] + .06, F[1] - .39];
const hose = obj('hose', 'aru_hose', [0, 0, 0], { tap: [4.3, 5.75], by: 'farmer', hand: 'R', holdT: THOLD, rest: REST, aim: [NB[0], 0, NB[1] - .1], sweep: .45,
  sprayK: [[T.water5 - .1, 0], [T.water5 + .15, 1], [THOLD[1] - .25, 1], [THOLD[1] - .05, 0]], wetK: [[T.water5, 0], [THOLD[1], 1]] });
const bunch = obj('bunch', 'aru_bunch', [0, 0, 0], { by: 'farmer', hand: 'R', showK: [[0, 0], [T.l7 - .3, 0], [T.l7 - .29, 1]] });

// 7 the trio: rocket, radish, mustard
const trio = [obj('t_aru', 'arugula_plant', [TRIO[0][0], 0, TRIO[0][1]], { kind: 'aru', h: .2, seed: 14, flowers: 6, burstT: [T.aru7 + .05, T.hot7] }),
  obj('t_rad', 'arugula_plant', [TRIO[1][0], 0, TRIO[1][1]], { kind: 'rad', h: .22, seed: 15, burstT: [T.rad7 + .05, T.hot7 + .08] }),
  obj('t_mus', 'arugula_plant', [TRIO[2][0], 0, TRIO[2][1]], { kind: 'mus', h: .2, seed: 16, flowers: 14, burstT: [T.mus7 + .05, T.hot7 + .16] })];

// ---------- farm world ----------
const world = [];
[[-8.0, -5.5, 8.5, 1], [-5.6, -6.6, 9.5, 2], [6.2, -6.4, 9, 3], [8.4, -5.0, 8, 1]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.4, 4.8, .9, 'ph/shrub_02'], [5.6, 3.4, .8, 'ph/shrub_01'], [-3.6, .8, .35, 'ph/rock_07'], [4.8, .4, .5, 'ph/shrub_03'], [-2.6, 6.2, .3, 'ph/weed_plant_02']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

const LB = [.01, .03, HERO[1] + .118];                                  // the bite on the hero leaf (probe)
const CH = [-.07, .045, HERO[1] + .12];
const beats = [
  // 1 hook: the leaf is bitten in three chomps; ring on the bite
  { t: 0, kind: 'info', add: [heroPlant, heroLeaf, chilli, beetle, board, cutLeaf, hand, crust, dryBed, haze, sun, mainBed, net, netBed, seedling, young, oldP, farmer, hose, bunch, ...trio, ...world,
    stk('ring1', 'circle_ring', LB, .055, { delay: .3 })],
    camera: { target: [.03, .03, HERO[1] + .1], dist: .36, elev: .34, az: .15, zoom: 'in' } },
  //   ... like eating chilli: the camera slides to the red chilli beside it (fire)
  { t: T.like1 - .15, kind: 'info', remove: ['ring1'], add: [stk('fire1', 'fire', CH, .04, { delay: T.hot1 - T.like1 - .3, pulse: true })],
    camera: { target: [-.035, .025, HERO[1] + .12], dist: .42, elev: .3, az: -.25, zoom: 'out' } },
  // 2 the beetle walks up to the leaf ...
  { t: T.l1, kind: 'info', remove: ['fire1'],
    camera: { target: [.17, .02, HERO[1] + .27], dist: .55, elev: .42, az: .55, zoom: 'in' } },
  //   ... touches it and turns away (cross on the beetle), the leaf stays whole (check)
  { t: T.insect2 - .2, kind: 'info', add: [stk('x2', 'cross', BUGHIT, .025, { delay: .5 }), stk('ok2', 'check', [.04, .07, HERO[1] + .1], .035, { delay: T.notby2 - T.insect2 + .2 })],
    camera: { target: [.1, .02, HERO[1] + .17], dist: .32, elev: .36, az: .85, zoom: 'in' } },
  // 3 on the board: the stored compounds glow inside a leaf ...
  { t: T.l2, kind: 'info', remove: ['x2', 'ok2'],
    camera: { target: [CUT[0], .03, CUT[2]], dist: .42, elev: .62, az: .9, zoom: 'in' } },
  //   ... the knife cuts it (point-down on the cut) ...
  { t: T.cut3 - .5, kind: 'info', add: [stk('pt3', 'point_down', [CUT[0] + .02, .07, CUT[2] + .03], .035, { delay: .55 })],
    camera: { target: [CUT[0], .03, CUT[2]], dist: .34, elev: .55, az: .75, zoom: 'in' } },
  //   ... the beads meet at the cut edge and sparkle (sparkles)
  { t: T.bite3 + .1, kind: 'info', remove: ['pt3'], add: [stk('spk3', 'sparkles', [CUT[0] + .03, .05, CUT[2] - .03], .035, { delay: T.out3 - T.bite3 - .3 })],
    camera: { target: [CUT[0] + .004, .022, CUT[2]], dist: .2, elev: .5, az: .45, zoom: 'in' } },
  // 4 the sun glares over the dry cracked patch, the rocket wilts and curls ...
  { t: T.l3, kind: 'info', remove: ['spk3'],
    camera: { target: [DRY[0], .15, DRY[1] + .1], dist: 1.7, elev: .24, az: .12, zoom: 'in' } },
  //   ... and the taste grows (arrow up on the leaves)
  { t: T.more4 - .3, kind: 'info', add: [stk('up4', 'arrow_up', [DRY[0] + .08, .26, DRY[1] + .3], .07, { delay: .35 })],
    camera: { target: [DRY[0] + .05, .1, DRY[1] + .28], dist: .75, elev: .3, az: -.2, zoom: 'in' } },
  // 5 under the shade net the farmer sets a seedling into the soil ...
  { t: T.l4, kind: 'info', remove: ['up4'],
    camera: { target: [F[0] - .05, .45, F[1] - .35], dist: 2.5, elev: .2, az: 1.45, zoom: 'in' } },
  //   ... stands and waters the bed evenly with the hose (water drop), then check
  { t: T.water5 - .25, kind: 'info', add: [stk('drop5', 'water_drop', [NB[0] + .15, .45, NB[1] + .1], .09, { delay: .35 }), stk('ok5', 'check', [F[0] - .55, 1.55, F[1] - .2], .14, { delay: T.even5 - T.water5 + .3 })],
    camera: { target: [NB[0], .5, NB[1] + .3], dist: 2.9, elev: .24, az: 1.2, zoom: 'out' } },
  // 6 he picks a small young leaf with his fingers ...
  { t: T.l5, kind: 'info', remove: ['drop5', 'ok5'],
    camera: { target: [YOUNG[0] - .15, .25, YOUNG[1] + .12], dist: 1.5, elev: .3, az: 1.3, zoom: 'in' } },
  //   ... shows it, while the big old leaves beside it get the cross
  { t: T.big6 - .3, kind: 'info', add: [stk('x6', 'cross', [OLD[0], .34, OLD[1]], .07, { delay: .3 })],
    camera: { target: [F2[0] - .2, .5, F2[1] - .3], dist: 1.9, elev: .2, az: 1.15, zoom: 'out' } },
  // 7 rocket, radish and mustard side by side, sparks on each ...
  { t: T.l6, kind: 'info', remove: ['x6'], add: [stk('s7a', 'sparkles', [TRIO[0][0], .3, TRIO[0][1]], .05, { delay: T.aru7 - T.l6 }),
    stk('s7b', 'sparkles', [TRIO[1][0], .32, TRIO[1][1]], .05, { delay: T.rad7 - T.l6 }), stk('s7c', 'sparkles', [TRIO[2][0], .62, TRIO[2][1]], .05, { delay: T.mus7 - T.l6 })],
    camera: { target: [TRIO[1][0], .2, TRIO[1][1]], dist: 2.0, elev: .22, az: -.1, zoom: 'in' } },
  //   ... ring around all three, they spark again together
  { t: T.all7 - .1, kind: 'info', remove: ['s7a', 's7b', 's7c'], add: [stk('ring7', 'circle_ring', [TRIO[1][0], .22, TRIO[1][1]], .95, { delay: .2 })],
    camera: { target: [TRIO[1][0], .22, TRIO[1][1]], dist: 2.3, elev: .22, az: .2, zoom: 'out' } },
  // 8 CTA: he walks out of the net holding a bunch of rocket; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', remove: ['ring7'], add: [stk('thumb8', 'thumbs_up', [FC[0] + .4, 1.65, FC[1] + .1], .22, { delay: T.like8 - T.l7 - .1 })],
    camera: { target: [FC[0] - .1, 1.05, FC[1] - .2], dist: 2.6, elev: .14, az: .3, spin: .5, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الجرجير طعمه حار',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 8, soilTint: [1.0, .95, .88], horizon: 'nile', cover: false,
    haze: .4, sunElev: 42, sunAz: 25, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 2, motes: .3, clouds: 16,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBeds: [{ cat: 'wind', idx: 0, gain: .03, fade: 1.5 }, { cat: 'bird', idx: 0, gain: .02, fade: 1.5 }, { cat: 'water', idx: 0, gain: .02, start: T.water5, end: THOLD[1] + .3, fade: .4 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
