// "ليه ورق الذرة بيتلف في الحر؟" (voice-over 2026-11-26, 7 lines, 31.6 s, one take). Real-sky island of Delta farmland at midday:
// a field of maize on soil ridges (rows along x, 0.75 m apart), hero plants in the front row, a dry cracked patch in the front furrow.
// The maize is built from the plant itself (renderer maize_field), so its leaves really roll into tubes (the v1/v2 mistake: a library
// crop mesh that could not roll). Every spoken line is shown by objects and actions, never by words:
//  1 hook: camera low at the front row looking up at the plant against the sky; its leaves curl into tubes within the first second
//  2 not a disease: the rolled plant beside a plant with flat leaves; magnifier over the rolled leaves, then a check on it
//  3 heat: a hot sun over the field with heat shimmer; water drop shrinking over the soil; close on one leaf rolling into a tube
//    (the face the sun hits shrinks to a narrow strip); the sun and a down arrow on the tube
//  4 less water lost: the tube with a water drop that stays; pull out to the plants standing upright and green (sparkles, hourglass)
//  5 rolled all day: the sun travels across the sky while the leaves stay rolled; the dry patch cracks open (eyes)
//  6 the farmer walks down the furrow with a pail, looks up at the leaves (point down), tips the pail at the root, the soil darkens,
//    the leaves unroll
//  7 CTA: he sets the pail down and turns to us; thumbs-up; slow pull-out arcing round
// Step up vs the last render (corn_leaf_roll_v2, score 80 automatic, n 13):
//  motion   - leaves roll and unroll per plant with a lag wave along the rows; stalks sway per plant with leaf-tip flutter; the farmer
//             walks with the pail hanging from his palm, looks up, tips it with both hands (bottom on one palm, lip under the other)
//  graphics - procedural maize: strap leaves with midrib and veins, wavy margins, paler underside shown when rolled, node collars,
//             brace roots, tassel, husked ear; soil ridges; a galvanised pail with a ballistic water stream, splash and wet patch
//  lighting - midday sun high (elev 55), exposure 1.0, opening camera looks up against the sky (beats 1 and 5 were too dark)
//  realism  - real sizes: maize 2.1-2.5 m, leaves .45-1 m x 6-10 cm, rows .75 m apart, pail 27 cm, farmer 1.75 m
//  sound    - field wind bed (.03), faint bird bed (.02), a water pour under the voice (.04)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI;
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, o = {}) => ({ id, type, pos, params, anim: 'none', dust: false, delay: o.delay || 0 });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6),
  sick2: W(1, 2), prot2: W(1, 5), water3: W(2, 3), leaf3: W(2, 5), roll3: W(2, 6), less3: W(2, 9), sun3: W(2, 13),
  water4: W(3, 3), lives4: W(3, 5), back4: W(3, 9), day5: W(4, 4), ground5: W(4, 7),
  look6: W(5, 2), leaves6: W(5, 4), if6: W(5, 6), irr6: W(5, 8), like7: W(6, 5) };

// ---------- layout (metres). Island front face at z = 8 (camera side +z); rows along x ----------
const ROWS = [-2.25, -1.5, -.75, 0, .75, 1.5, 2.25, 3, 3.75, 4.5, 5.25];
const ZF = 5.25;                                   // front row
const H1 = [0, ZF], H2 = [.9, ZF], H3 = [1.8, ZF]; // hero plants (H1 rolls first and is watered, H2 is flat in line 2 and rolls in line 3)
const DRY = [2.95, 5.95];                          // dry cracked patch in the front furrow
const FAR = { x: -.16, z: 5.95 };                  // pail mouth .2 m clear of H1's stalk while pouring                   // where the farmer stands to water H1 (facing -z)
const LEAF = 4;                                    // the H2 leaf the close-ups follow (front-right rank, low: few leaves above it)

// roll keys
const rollField = [[0, .1], [5, .2], [7, .35], [10.4, .6], [23, .65], [27.4, .65], [29.4, .08]];   // the field rolls less than the hero plants so it still reads as maize
const rollH1 = [[0, 0], [.25, 0], [2.0, .92], [26.6, .92], [28.2, .04]];
const rollH2 = [[0, 0], [8.5, 0], [10.4, .9], [26.9, .9], [28.6, .06]];
const field = obj('field', 'maize_field', [0, 0, 0], {
  rows: { x0: -5, x1: 5, dx: .5, zs: ROWS, h: 2.25, jit: .08, skip: [[-1.25, 2.3, 5.0, 5.5]] },
  plants: [{ x: H1[0], z: H1[1], h: 2.3, seed: 11, lod: 'hi', az: PI / 4 + PI, rollK: rollH1, reg: 'H1' },
           { x: H2[0], z: H2[1], h: 2.2, seed: 23, lod: 'hi', az: PI / 4, rollK: rollH2, reg: 'H2' },
           { x: H3[0], z: H3[1], h: 2.4, seed: 37, lod: 'hi', az: PI / 4 }],
  ridges: ROWS.map(z => [z, -5.2, 5.2]), ridgeH: .1, rollK: rollField, rollLag: 1.2, lagX0: -5, wind: [1, .3] });
const dry = obj('dry', 'maize_dry', [DRY[0], 0, DRY[1]], { w: 1.3, d: .78, crackK: [[0, .25], [T.day5, .25], [T.ground5 + .4, 1]] });

// ---------- the farmer (line 6-7): walks in along the front furrow with the pail, looks up, tips it at H1's root ----------
const tWalk0 = T.l5 - .9, tArrive = T.look6 + .15;
const trk = [[tWalk0, -2.9, 0, 6.35, PI / 2, 'bucketWalk'], [tArrive - .55, FAR.x - .1, 0, 6.3, null, 'bucketWalk', 'walk'], [tArrive, FAR.x, 0, FAR.z, PI, 'bucketWalk', 'walk'],
  [T.leaves6 + .1, FAR.x, 0, FAR.z, PI, 'leafLook'], [T.irr6 - .6, FAR.x, 0, FAR.z, PI, 'leafLook'],
  [T.irr6 - .15, FAR.x, 0, FAR.z, PI, 'pourTip'], [T.irr6 + .85, FAR.x, 0, FAR.z, PI, 'pourTip'],
  [T.l6 + .6, FAR.x, -.3, FAR.z, PI, 'setDown', null, 'sync'], [T.l6 + .95, FAR.x, -.3, FAR.z, PI, 'setDown'],
  [T.l6 + 1.6, FAR.x + .05, 0, FAR.z + .1, .25, 'stand', null, 'sync'], [T.like7 - .2, FAR.x + .05, 0, FAR.z + .1, .25, 'ctaWave'], [D + 1, FAR.x + .05, 0, FAR.z + .1, .25, 'ctaWave']];
const tSpawn = T.ground5 - .2;
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', delay: tWalk0 - .1 - tSpawn, params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 6, track: trk } };
const pour = [T.irr6 - .6, T.irr6 - .15, T.irr6 + .85, T.irr6 + 1.2];
const bucket = obj('pail', 'water_bucket', [0, 0, 0], { by: 'farmer', carry: [tWalk0 - .1, T.l6 + .95], pour, flowK: [[pour[1], 1], [pour[2] - .1, 1], [pour[2] + .1, 0]],
  wet: [FAR.x - .02, ZF + .06], wetK: [[pour[1] + .15, 0], [pour[2], 1]], down: [T.l6 + .85, FAR.x + .32, FAR.z - .15], reg: 'pail' }, { delay: tWalk0 - .1 - tSpawn });

// ---------- farm world ----------
const world = [];
[[-8.5, -5.5, 8.5, 1], [-3.2, -6.8, 9.5, 2], [2.4, -6.4, 9, 3], [7.8, -5.0, 8, 1], [-9.2, 1.5, 7.5, 2], [9.3, 1.2, 8.5, 3]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-7.6, 6.6, .8, 'ph/shrub_02'], [7.9, 6.4, .7, 'ph/shrub_01'], [6.4, 7.1, .3, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
const sun = obj('sun', 'sun_glow', [0, 0, 0], { size: 1.3, showK: [[T.l2, 0], [T.l2 + .6, 1], [T.leaf3 - .2, 1], [T.leaf3 + .2, 0], [T.l4 - .1, 0], [T.l4 + .4, 1], [T.ground5, 1], [T.ground5 + .4, 0]],
  posK: [[0, .7, 3.05, 2.6], [T.l4 + .4, -1.6, 3.2, 2.6], [T.day5 + .1, -1.6, 3.2, 2.6], [T.ground5 - .1, 3.4, 2.45, 2.6]] });
const haze = obj('haze', 'heat_haze', [.4, 0, 4.9], { w: 6, d: 1.6, count: 14, opacity: .16 });

const leafAt = (dx = 0, dy = 0, dz = 0) => [1.22 + dx, 1.02 + dy, 5.51 + dz];   // H2 leaf LEAF mid by probe: (1.26, .95, 5.55) flat .. (1.18, 1.10, 5.48) rolled
const beats = [
  // 1 hook: low at the front row, looking up at H1 against the sky; its leaves curl into tubes in the first second
  { t: 0, kind: 'info', add: [field, dry, ...world], camera: { target: [.05, 1.15, ZF], dist: 2.3, elev: -.08, az: .3, zoom: 'in' } },
  // 2 not a disease: the rolled plant beside the flat one; magnifier over the rolled leaves, then a check
  { t: T.l1, kind: 'info', add: [stk('mag', 'magnifier', [-.05, 1.35, ZF + .35], .2, { delay: T.sick2 - T.l1 - .1, nudge: true }), stk('ok2', 'check', [0, 2.0, ZF + .1], .22, { delay: T.prot2 - T.l1 })],
    camera: { target: [.45, 1.05, ZF], dist: 3.3, elev: .1, az: .08, zoom: 'out' } },
  // 3 heat: the hot sun over the field, heat shimmer, the water drop over the soil shrinks
  { t: T.l2, kind: 'info', remove: ['mag', 'ok2'], add: [sun, haze, stk('drop3', 'water_drop', [.5, .45, ZF + .55], .16, { delay: T.water3 - T.l2, scaleK: [[T.water3 + .3, 1], [T.leaf3 - .3, .4]] })],
    camera: { target: [.5, 1.6, ZF - .2], dist: 4.4, elev: .03, az: -.12, zoom: 'out' } },
  //   ... the leaf rolls up like a pipe: close on one H2 leaf from above
  { t: T.leaf3 - .2, kind: 'info', remove: ['drop3'], camera: { target: leafAt(), dist: .8, elev: .7, az: -.3, zoom: 'in' } },
  //   ... so the face the sun hits gets smaller: the sun and a down arrow over the tube
  { t: T.less3 - .1, kind: 'info', add: [obj('sun2', 'sun_glow', leafAt(-.05, .5, -.1), { size: .32 }, { delay: T.sun3 - T.less3 - .2 }),
      stk('ar3', 'arrow_down', leafAt(0, .2, 0), .1, { delay: T.sun3 - T.less3, pulse: true })],
    camera: { target: leafAt(0, .12, 0), dist: 1.05, elev: .55, az: -.15, zoom: 'out' } },
  // 4 it loses less water: the tube with a drop that stays
  { t: T.l3, kind: 'info', remove: ['sun2', 'ar3'], add: [stk('drop4', 'water_drop', leafAt(0, .12, 0), .09, { delay: T.water4 - T.l3 - .1 })],
    camera: { target: leafAt(), dist: .7, elev: .4, az: -.45, zoom: 'in' } },
  //   ... and the plant lives on: pull out to the plants standing green (sparkles), until the water comes back (hourglass)
  { t: T.lives4 - .1, kind: 'info', remove: ['drop4'], add: [stk('spk4', 'sparkles', [.45, 1.95, ZF + .2], .22, { delay: .7 }), stk('hg4', 'hourglass', [.45, .45, ZF + .6], .14, { delay: T.back4 - T.lives4 - .2 })],
    camera: { target: [.45, 1.15, ZF], dist: 3.4, elev: .08, az: -.22, zoom: 'out' } },
  // 5 rolled all day: the sun travels across the sky, the leaves stay rolled
  { t: T.l4, kind: 'info', remove: ['spk4', 'hg4'], camera: { target: [.6, 1.7, ZF - .3], dist: 5.6, elev: .02, az: .25, zoom: 'out' } },
  //   ... the soil needs water: the dry patch cracks open (eyes)
  { t: tSpawn, kind: 'info', add: [farmer, bucket, stk('eyes5', 'eyes', [DRY[0], .6, DRY[1]], .17, { delay: .4 })],
    camera: { target: [DRY[0] - .2, .35, DRY[1] - .1], dist: 2.3, elev: .45, az: .2, zoom: 'in' } },
  // 6 the farmer walks down the furrow with the pail, looks at the leaves (point down) ...
  { t: T.l5, kind: 'info', remove: ['eyes5', 'haze'], camera: { target: [-.9, .95, 6.0], dist: 3.6, elev: .1, az: .5, zoom: 'out' } },
  { t: T.leaves6 - .15, kind: 'info', add: [stk('pt6', 'point_down', [.15, 1.95, ZF + .25], .16, { delay: .1 })], camera: { target: [-.1, 1.25, 5.65], dist: 2.7, elev: .08, az: .7, zoom: 'in' } },
  //   ... and if they are rolled he waters: the pail tips at the root, the soil darkens, the leaves open
  { t: T.irr6 - .6, kind: 'info', remove: ['pt6'], camera: { target: [-.15, .7, 5.6], dist: 2.3, elev: .15, az: 1.0, zoom: 'out' } },
  // 7 CTA: he sets the pail down and turns to us; thumbs-up; slow pull-out arcing round
  { t: T.l6, kind: 'info', add: [stk('thumb7', 'thumbs_up', [FAR.x + .5, 1.95, FAR.z + .2], .26, { delay: T.like7 - T.l6 - .2 })],
    camera: { target: [-.05, 1.1, 5.7], dist: 4.6, elev: .1, az: .3, spin: .4, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه ورق الذرة بيتلف في الحر',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 8, soilTint: [1.0, .96, .88], horizon: 'nile', cover: 'low', coverTint: 'dry',
    haze: .35, sunElev: 55, sunAz: 25, turbidity: 2.2, water: '#7f9a8f', waves: 0, foam: false, birds: 2, birdModel: 'Stork', motes: .3, clouds: 10,
    sfxBed: 'wind', sfxBeds: [{ cat: 'forest', idx: 5, gain: .02 }], sfxCalls: [{ cat: 'water', idx: 0, times: [pour[1]], dur: 1.6, gain: .04 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
