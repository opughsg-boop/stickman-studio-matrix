// "ليه الكرنب بيطلع أحلى في الجو البارد بالذات؟!" (voice-over 2026-11-28, 8 lines, 33.8 s, one take). Real-sky island of Delta farmland:
// five straw-mulched raised beds (rows along z, 0.9 m tops, 0.15 m high, 0.5 m paths) of green cabbage, a hero cabbage at the front of the
// middle bed, a half-planted bed on the right (seedling tray on the path), a sun-baked cracked patch on the far left with three heat-struck
// cabbages, a slatted field crate on the left path. The cabbage is BIG in frame (lessons from silk_worm 18 and strawberry_flowers 66):
// every close beat frames one 0.22 m head or one 0.6 m plant at 0.4-1.4 m. Every spoken line is shown, never written, and every beat adds
// a new visible action:
//  1 hook: a dewy head in cool morning light, drops glisten, one drop runs down a wrapper leaf and drips (ring on the head)
//  2 the whole plant breathes in mild light (check on it), then the camera tilts up to a glaring sun (cross on the sun)
//  3 the hot cracked patch under the glare (cross on the sun, heat shimmer): the leaves droop, curl and yellow (sick face = bitter),
//    then a head splits open into a loose V showing its layers (point-down on the split)
//  4 the farmer, squatting in the path, lowers a seedling from his palm into the cool damp bed and presses the soil each side (check)
//  5 time-lapse from above: the seedling unfolds into a rosette, the inner leaves curl in and a tight head swells and settles (cycle)
//  6 dawn: rime forms on the leaves, the field and the mulch, ice crystals on the margins; the head stays round and firm (sparkles, check)
//  7 one hand on the head, the other cuts the stalk with a knife, the head is lifted away; the farmer lowers it into the crate (thumbs-up)
//  8 CTA: he lifts a head from the crate and stands holding it between both palms; thumbs-up; slow pull-out arcing round
// Step up vs the last render (strawberry_flowers, score 66):
//  motion   - (1) every leaf is a live sheet: spine elevation + curl + gravity droop, cup and wavy margins re-solved per frame, so wilting,
//             curling-in and the head forming are continuous, never pops; (2) contact by construction: the cut head rides the gard_hand
//             palm then the midpoint of the farmer's palms (probe-tuned cabHold / cabLower poses, palms 0.013 m off the head), the seedling
//             rides his palm into the hole; (3) follow-through: the head settles with a damped bounce, the stub leaves relax after the cut,
//             a dew drop runs down a leaf and falls under gravity, the farmer presses the soil in small body pulses
//  graphics - (1) new procedural cabbage: round blue-green leaves with a thick pale midrib, branching pale veins, bump blistering, a waxy
//             sheen; a head of overlapping leaf ridges with matching edge texture; a layered cross-section inside the split; (2) dew drops
//             (clear-coat spheres on the leaf normals) and frost (rime tint, ice crystals on the margins, rime sheets on the mulch);
//             (3) slatted wooden crate, black plug tray with seedlings, the knife in a detailed hand
//  realism  - (1) real sizes: head 0.22 m, wrapper leaves 0.28-0.37 m, rosette 0.6 m, seedling leaves 6-7 cm on a plug, plant spacing
//             0.55 m, bed 0.9 x 0.15 m, path 0.5 m, crate 0.7 x 0.47 x 0.3 m, farmer 1.75 m; (2) real behaviour: heat makes the leaves droop
//             and the head crack open, a light frost leaves the head firm, the cut is under the head at the stalk; (3) light follows the
//             story: cool pale-blue morning (coldK) for lines 1, 4-6, warm full sun on the hot patch in line 3
//  sound    - this plan only: a field wind bed (.03) plus a light bird bed (.02), no calls, all ducked under the voice
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const add = (a, b) => a.map((v, i) => v + b[i]), nrm = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, sc = (v, k) => v.map(x => x * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  mild2: W(1, 6), hot2: W(1, 8), heat3: W(2, 3), tired3: W(2, 6), bitter3: W(2, 9), head3: W(2, 10), open3: W(2, 11), plant4: W(3, 2), nice4: W(3, 11),
  grow5: W(4, 1), curl5: W(4, 4), ball5: W(4, 10), heavy5: W(4, 12), frost6: W(5, 5), harm6: W(5, 7), sold7: W(6, 4), sweet7: W(6, 6), like8: W(7, 5) };

// ---------- layout (metres). Island front face at z = 8; bed tops y = .15, bed front ends z = 7.2 ----------
const BH = .15, BEDS = [-3.2, -1.6, 0, 1.6, 3.2], Z0 = 7.2, LEN = 5.4, R = .11;
const H1 = [0, 6.75], S1 = [1.38, 6.75], S0a = [1.38, 6.2], S0b = [1.38, 5.65];
const HP = [[-5.65, 5.95], [-5.0, 5.55], [-5.55, 5.1]], CR = [-.8, 7.61], TRAY = [.75, 6.15];
const HC = [H1[0], BH + .075 + R * .9, H1[1]];                                         // hero head centre (world): stalk top .075 + ry

// ---------- the hands of the close harvest (line 7): L palm on the head, R knife at the stalk ----------
const HIDE = [0, -3, 0], hk = (t, P, F, U, pose = 'open') => [t, ...P, ...F, ...U, pose];
const CUT = T.sold7 - .32;                                                             // the stalk parts
const gL = nrm([-.5, .8, .33]), fL = nrm(add([1, 0, 0], sc(gL, -dot([1, 0, 0], gL)))), PL = add(HC, sc(gL, R));
const yc = BH + .075 - .025, KF = [-1, 0, 0], KU = [0, 1, 0];                         // knife edge faces -x, back of hand up (hand sits at +z of the edge)
const hTL = [hk(0, HIDE, fL, gL), hk(T.l6 - .05, HIDE, fL, gL), hk(T.l6 - .04, add(PL, sc(gL, .28)), fL, gL, 'open'), hk(T.l6 + .4, add(PL, sc(gL, .012)), fL, gL, 'open'),
  hk(T.l6 + .55, PL, fL, gL, 'cup'), hk(CUT, PL, fL, gL, 'cup'), hk(CUT + .42, add(PL, [0, .38, .05]), fL, gL, 'cup'), hk(CUT + .43, HIDE, fL, gL)];
const hTR = [hk(0, HIDE, KF, KU, 'grip'), hk(T.l6 + .1, HIDE, KF, KU, 'grip'), hk(T.l6 + .11, [.26, yc + .07, H1[1]], KF, KU, 'grip'), hk(T.l6 + .6, [.03, yc, H1[1]], KF, KU, 'grip'),
  hk(CUT - .05, [-.012, yc, H1[1]], KF, KU, 'grip'), hk(CUT + .3, [.2, yc + .06, H1[1] + .02], KF, KU, 'grip'), hk(CUT + .31, HIDE, KF, KU, 'grip')];
const handL = { id: 'handL', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side: 'L', link: 'hl', anchor: 'palm', skin: '#94624a', track: hTL } };
const handR = { id: 'handR', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side: 'R', link: 'hk', skin: '#94624a', knifeK: [[0, 1]], track: hTR } };

// ---------- the farmer: plants the seedling (line 4, squatting in the path facing +x), then at the crate (lines 7-8, facing +z) ----------
const YX = Math.PI / 2, FX = S1[0] - .404, FZ = S1[1] - .048;                          // squatReach R palm = (+.404, .157, +.048) ahead of him
const CX = CR[0], CZ = CR[1] - .36;                                                    // cabLower palms mid = (0, .46, .36) ahead of him
const TP = T.plant4 + .1, IN7 = CUT + .4;
const ftr = [[0, FX, -.55, FZ, YX, 'tieLow'], [TP - .55, FX, -.55, FZ, YX, 'tieLow'], [TP, FX, -.55, FZ, YX, 'squatReach'],
  ...[0, 1, 2, 3, 4, 5].map(k => [TP + .35 + k * .3, FX, k % 2 ? -.55 : -.575, FZ, YX, 'squatReach']), [T.l4 - .2, FX, -.55, FZ, YX, 'squatReach'],
  [T.l4 + .45, FX, 0, FZ, YX, 'stand'], [T.l4 + 1.0, FX, 0, FZ, YX, 'stand'], [T.l4 + 1.1, CX, 0, CZ, 0, 'cabHold'],
  [IN7 + .25, CX, 0, CZ, 0, 'cabHold'], [IN7 + .7, CX, -.55, CZ, 0, 'cabLower'], [T.l7 + .2, CX, -.55, CZ, 0, 'cabLower'], [T.l7 + .95, CX, 0, CZ, 0, 'cabHold'], [D + 1, CX, 0, CZ, 0, 'cabHold']];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 5, track: ftr,
  hideK: [[0, 1], [T.l3 - .45, 1], [T.l3 - .4, 0], [T.l4 + 1.0, 0], [T.l4 + 1.05, 1], [IN7 - .03, 1], [IN7 - .02, 0]] } };
const TOP = [CR[0], .30, CR[1]];                                                       // the crate's top-layer slot (nested on the bottom heads)

// ---------- cabbages ----------
const dew = [[0, 1], [T.l1 + .9, .7], [T.l2 - .3, 0], [T.l5 + .2, 0], [T.l5 + .9, .45], [T.l6 + .6, .45], [T.l6 + 1.2, 0]];
const frostK = [[0, 0], [T.l5 + .1, 0], [T.frost6 - .3, 1], [T.l6 + .3, 1], [T.l6 + 1.6, .25], [D, .2]];
const plants = [
  obj('h1', 'cab_plant', [H1[0], BH, H1[1]], { seed: 3, R, clearAz: 0, dewK: dew, frostK, cutT: CUT, roll: { leaf: 12, t0: .5, t1: 2.2, s0: .95, s1: .1 } }),
  obj('hc', 'cab_plant', [0, 0, 0], { seed: 3, R, headOnly: true, dewK: dew, frostK, gripDir: gL,
    carry: [[0, 'hide'], [CUT, 'palm:hl', 0], [IN7 - .02, 'mid:farmer', 0], [IN7 + .72, TOP, .32], [T.l7 + .25, 'mid:farmer', .3]] }),
  obj('s1', 'cab_plant', [S1[0], BH, S1[1]], { seed: 11, R, leafL: .33, holeCol: '#b4a08a', frostK, dewK: [[0, .3], [T.l4, .3], [T.l4 + 1, 0]],
    plantIn: { t0: T.l3 - .4, t1: TP, by: 'farmer', hand: 'R' }, growK: [[0, 0], [T.l4 + .1, 0], [T.curl5 + .1, .75], [T.heavy5 - .2, 1]], headK: [[0, 0], [T.curl5 - .2, 0], [T.heavy5 - .1, 1]], settle: [[T.heavy5, 1]] }),
  obj('s0a', 'cab_plant', [S0a[0], BH, S0a[1]], { seed: 13, R: .1, leafL: .3, holeCol: '#b4a08a', frostK, growK: [[0, .12], [T.l4 + .1, .12], [T.curl5 + .3, .7], [T.heavy5, .9]], headK: [[0, 0], [T.curl5, 0], [T.heavy5 + .2, .8]] }),
  obj('s0b', 'cab_plant', [S0b[0], BH, S0b[1]], { seed: 17, R: .1, leafL: .3, holeCol: '#b4a08a', frostK, growK: [[0, .1], [T.l4 + .1, .1], [T.curl5 + .4, .65], [T.heavy5, .85]], headK: [[0, 0], [T.curl5 + .1, 0], [T.heavy5 + .3, .75]] }),
  // hot patch: droop, curl and yellow; the front one splits into a V facing the camera
  obj('hp1', 'cab_plant', [HP[0][0], 0, HP[0][1]], { seed: 21, R: .105, hole: false, tint: '#a9c592', droopK: [[0, 0], [T.heat3, 0], [T.bitter3, 1]], splitK: [[0, 0], [T.open3, 0], [T.open3 + 1.2, .45]], splitAz: 1.9 }),
  obj('hp2', 'cab_plant', [HP[1][0], 0, HP[1][1]], { seed: 23, R: .11, hole: false, tint: '#a9c592', droopK: [[0, 0], [T.heat3 + .2, 0], [T.bitter3 + .3, .85]], splitK: [[0, 0], [T.open3 - .05, 0], [T.open3 + .85, 1]], splitAz: Math.PI / 2 + .2 }),
  obj('hp3', 'cab_plant', [HP[2][0], 0, HP[2][1]], { seed: 29, R: .1, hole: false, tint: '#a9c592', droopK: [[0, 0], [T.heat3 + .1, 0], [T.bitter3 + .2, .9]], splitK: [[0, 0], [T.open3 + .2, 0], [T.open3 + 1.3, .6]], splitAz: 2.4 }) ];
const SKIP = [[H1[0], H1[1], .5], [1.6, 6.3, .95]];
const rows = BEDS.flatMap(x => [[x - .22, 2.2, 7.0, .55], [x + .22, 2.2, 6.725, .55]]);
const field = obj('field', 'cab_field', [0, 0, 0], { rows, y: BH, skip: SKIP, seed: 7, leafL: .3, frostK });
const beds = obj('beds', 'sb_bed', [0, 0, 0], { xs: BEDS, z0: Z0, len: LEN, w: .9, wb: 1.1, h: BH, straws: 380 });
const rime = obj('rime', 'cab_frost', [0, 0, 0], { frostK, rects: [...BEDS.map(x => [x, Z0 - LEN / 2, .9, LEN, BH]), [0, 7.6, 7.6, .75, 0]] });
const crate = obj('crate', 'cab_crate', [CR[0], 0, CR[1]], { n: 6 });
const tray = obj('tray', 'cab_tray', [TRAY[0], 0, TRAY[1]], { n: 20 });
// hot patch: cracked crust, heat shimmer, the glaring sun (line 3); the glare over the mild bed (line 2b only)
const crust = obj('crust', 'dry_crust', [-5.3, 0, 5.55], { w: 2.4, d: 1.9, seed: 19 });
const haze = obj('haze', 'heat_haze', [-5.3, 0, 5.55], { w: 1.6, d: 1.2, count: 10, opacity: .14 });
const SUN2 = [-.25, 1.05, 5.0], SUN3 = [-5.6, .98, 4.4];
const sun2 = obj('sun2', 'sun_glow', SUN2, { size: 1.0, showK: [[0, 0], [T.hot2 - .55, 0], [T.hot2 - .15, 1], [T.l2 + .1, 1], [T.l2 + .4, 0]] });
const sun3 = obj('sun3', 'sun_glow', SUN3, { size: 1.0, showK: [[0, 0], [T.l2 + .1, 0], [T.l2 + .5, 1], [T.l3 - .5, 1], [T.l3, 0]] });

// ---------- farm world ----------
const world = [];
[[-9.0, -6.5, 8.5, 1], [7.4, -7.2, 9, 3]].forEach(([x, z, h, k], i) => world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.4, 7.2, .8, 'ph/shrub_02'], [5.0, 6.2, .8, 'ph/shrub_01'], [4.2, 3.0, .35, 'ph/rock_07'], [-7.2, 3.4, .5, 'ph/shrub_03']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

// ---------- beats ----------
const S1H = [S1[0], BH + .075 + R * .9, S1[1]], HP2H = [HP[1][0], .075 + R * .9, HP[1][1]];
const beats = [
  // 1 hook: the dewy head in cool light, a drop runs down and drips (ring on the head)
  { t: 0, kind: 'info', add: [handL, handR, farmer, beds, rime, ...plants, field, crate, tray, crust, haze, sun2, sun3, ...world, stk('ring1', 'circle_ring', HC, .27, { delay: .25 })],
    camera: { target: [HC[0], HC[1] - .03, HC[2]], dist: .72, elev: .33, az: .3, zoom: 'in' } },
  // 2 the plant in mild light breathes (check on it) ...
  { t: T.l1, kind: 'info', remove: ['ring1'], add: [stk('ok2', 'check', [H1[0] + .3, BH + .5, H1[1] + .1], .12, { delay: T.mild2 - T.l1 })],
    camera: { target: [H1[0], BH + .12, H1[1]], dist: 1.35, elev: .45, az: -.25, zoom: 'out' } },
  //   ... the camera tilts up to a glaring sun (cross on the sun)
  { t: T.hot2 - .45, kind: 'info', remove: ['ok2'], add: [stk('x2', 'cross', add(SUN2, [0, 0, .3]), .3, { delay: .45, pulse: true })],
    camera: { target: [H1[0], BH + .3, H1[1] - .1], dist: 1.6, elev: .12, az: .2, zoom: 'in' } },
  // 3 the hot cracked patch under the glare (cross on the sun, shimmer) ...
  { t: T.l2, kind: 'info', remove: ['x2'], add: [stk('x3', 'cross', add(SUN3, [0, 0, .3]), .3, { delay: T.heat3 - T.l2, pulse: true })],
    camera: { target: [-5.3, .35, 5.55], dist: 2.4, elev: .15, az: .2, zoom: 'in' } },
  //   ... the leaves droop, curl and yellow (sick face: bitter) ...
  { t: T.tired3 + .25, kind: 'info', remove: ['x3'], add: [stk('sick3', 'face_sick', [HP[0][0] + .22, .5, HP[0][1] + .12], .12, { delay: T.bitter3 - T.tired3 - .25 })],
    camera: { target: [HP[0][0], .2, HP[0][1]], dist: 1.0, elev: .35, az: .5, zoom: 'out' } },
  //   ... the head splits open and goes loose (point-down on the split)
  { t: T.head3 + .1, kind: 'info', remove: ['sick3'], add: [stk('pt3', 'point_down', add(HP2H, [0, .2, 0]), .1, { delay: T.open3 - T.head3 })],
    camera: { target: [HP2H[0], HP2H[1] + .01, HP2H[2]], dist: .62, elev: .42, az: .2, zoom: 'in' } },
  // 4 the farmer lowers a seedling into the cool damp bed ...
  { t: T.l3, kind: 'info', remove: ['pt3'], camera: { target: [S1[0] - .2, .35, S1[1]], dist: 2.2, elev: .3, az: .55, zoom: 'in' } },
  //   ... and presses the soil each side (check)
  { t: TP + .4, kind: 'info', add: [stk('ok4', 'check', [S1[0] + .15, BH + .3, S1[1] + .12], .1, { delay: T.nice4 - TP - .4 })],
    camera: { target: [S1[0], BH + .06, S1[1]], dist: .85, elev: .45, az: .9, zoom: 'out' } },
  // 5 time-lapse from above: the seedling unfolds into a rosette ...
  { t: T.l4, kind: 'info', remove: ['ok4'], camera: { target: [S1[0], BH + .05, S1[1]], dist: .85, elev: 1.05, az: .4, zoom: 'out' } },
  //   ... the inner leaves curl in and a tight head swells and settles (cycle arrows on the curling leaves)
  { t: T.curl5 - .1, kind: 'info', add: [stk('cyc5', 'arrows_cycle', [S1H[0] + .16, S1H[1] + .14, S1H[2] + .1], .12, { delay: .1 })],
    camera: { target: [S1H[0], S1H[1] - .04, S1H[2]], dist: 1.35, elev: .5, az: .1, spin: .4, zoom: 'in' } },
  // 6 dawn: rime forms on the leaves, the field and the mulch ...
  { t: T.l5, kind: 'info', remove: ['cyc5'], camera: { target: [H1[0], BH + .12, H1[1]], dist: 1.5, elev: .55, az: -.35, zoom: 'in' } },
  //   ... close: ice crystals, the head round and firm (sparkles, check)
  { t: T.frost6 - .05, kind: 'info', add: [stk('spk6', 'sparkles', [HC[0] + .09, HC[1] + .12, HC[2] + .06], .1, { delay: .1 }), stk('ok6', 'check', [HC[0] - .14, HC[1] + .14, HC[2] + .05], .09, { delay: T.harm6 - T.frost6 + .3 })],
    camera: { target: [HC[0], HC[1] - .02, HC[2]], dist: .62, elev: .5, az: .45, zoom: 'in' } },
  // 7 a hand on the head, the knife cuts the stalk, the head is lifted away ...
  { t: T.l6, kind: 'info', remove: ['spk6', 'ok6'], camera: { target: [HC[0] + .03, HC[1] - .06, HC[2]], dist: .88, elev: .34, az: .4 } },
  //   ... the farmer lowers it into the crate (thumbs-up on the crate)
  { t: IN7, kind: 'info', add: [stk('tu7', 'thumbs_up', [CR[0] + .2, .62, CR[1] + .1], .14, { delay: T.sweet7 - IN7 })],
    camera: { target: [CR[0] + .25, .5, CR[1] - .2], dist: 2.4, elev: .22, az: .45, zoom: 'out' } },
  // 8 CTA: he lifts a head and stands holding it; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', remove: ['tu7'], add: [stk('thumb8', 'thumbs_up', [CX + .4, 1.5, CZ + .2], .2, { delay: T.like8 - T.l7 })],
    camera: { target: [CX + .1, .85, CZ + .1], dist: 2.5, elev: .12, az: .25, spin: .5, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الكرنب بيطلع أحلى في الجو البارد',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 8, soilTint: [.92, .86, .78], horizon: 'nile', cover: 'high',
    haze: .4, sunElev: 42, sunAz: 25, turbidity: 2.4, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .3, clouds: 12,
    // cool morning look for the dew, planting and frost lines; full warm sun for the hot patch (line 3)
    coldK: [[0, 1], [T.l1 + .3, 1], [T.l1 + 1.4, .55], [T.l2, .5], [T.l2 + .8, 0], [T.l3 - .2, 0], [T.l3 + .6, .7], [T.l5 - .1, .7], [T.l5 + .6, 1], [T.l6 - .2, 1], [T.l6 + 1.0, .4], [D, .4]],
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBed: 'wind', sfxBeds: [{ cat: 'forest', idx: 5, gain: .02 }] },
  style: { camEase: .6, captionY: .78, exposure: .95, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
