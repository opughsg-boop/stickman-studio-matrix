// "لو اشتريت حصان..." horse care (voice-over 2026-11-26, 26 lines, 161.7 s, one take). Real-sky island of Delta farmland with stations:
//  pen (grass, bucket, concrete trough, hay rack, grain bucket, cut-grass heap) in the middle left, an anatomy horse (flank window) in the
//  middle right, an asphalt lane at the front right (hoof macro + farrier), a rainy mud pen at the back right (rot hoof macro), a timber
//  stable with a straw floor at the back left, a teeth station at the left (cheek window + equine dentist), a pasture at the front left
//  (field of view, kick, side approach, standing sleep, x-ray stay apparatus), the herd at the back, and a city lane (line 26) at the back right.
// Every spoken line is shown, never written (no digits, signs or labels):
//  1 horse grazing, bucket of water, ring on the bucket, sparkles   2 bucket empty, horse nudges it, cross
//  3 horse drinks at the big trough (ripples), water drop             4 farmer fills the trough with the hose, point-down
//  5 the grass shrinks in two steps to bare trampled ground, arrow down   6 farmer fills a bucket with grain, cross
//  7 flank window: small stomach vs the huge gut, cross at the mouth (no vomit), eyes   8 gas bubbles in the window, the horse lies down and rolls, cross
//  9 farmer loads hay into the rack, the horse eats slowly, hourglass, check   10 cut grass heap from the cart, horse sniffs, steps back, cross
//  11 horse walks onto asphalt, arrow down on the hoof   12 hoof macro on asphalt: whole hoof -> worn edge with grit, point-down
//  13 farrier fits the shoe (hammer rhythm) and rasps the hoof, check   14 rain on the mud pen, rot patch on the hoof macro, cross
//  15 hoof pick in the stable, dry straw floor, check   16 food drops from the mouth, eyes, arrow down   17 cheek window: sharp teeth, sore cheek
//  18 dentist on a crate rasps the teeth, check   19 top view: vision rays all round, blind spot behind, ring   20 person behind, kick, cross
//  21 person comes from the side talking (sound arcs), horse turns calmly, thumbs up   22 dozing on its feet, sleep face + sparkles
//  23 giant x-ray leg: patella locks, point-down on the knee   24 horse lies down in the straw, check   25 lone horse awake -> herd lying, guard ring
//  26 city lane: electric carriages, one horse cart left in the old centre, thumbs up, slow pull-out arc
// Step up vs the last render (arugula_hot, score 75):
//  motion   - (1) one-shot clips on the walker (onceT): the horse lies down once and stays down, the kick plays once; (2) every horse move is a
//             distance-synced walk with eased stops and a settle (no sliding), mouths reach the bucket, trough, rack, grain and heap (lickRig);
//             (3) rig people walk in, squat, hammer and rasp in rhythm, recoil from the kick, talk with sound arcs from the mouth
//  graphics - (1) anatomy windows in the flank and the cheek with organs and teeth in their real places; (2) a vision-ray fan with a blind
//             wedge; (3) rain over a glossy mud pen, a straw-floored timber stable, a city lane with facades and carriages
//  realism  - (1) real sizes: horse 2.35 m to the poll (about 1.6 m at the withers), trough 0.75 m, bucket 0.3 m, hay bale 0.5 m, shoe 0.12 m,
//             farmer 1.75 m; (2) hands on the hoof, the hose, the grain bucket and the hay rack (0.1-0.3 m by the pose probe);
//             (3) each beat adds a new visible action (no dead beats)
//  sound    - wind bed .03, bird bed .02, rain bed .03 only during line 14, a horse call .05 in lines 1 and 21 (global caps unchanged)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(23);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0, anim = 'none') => ({ id, type, pos, rotY, params, anim, dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, o.y || 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: o.anim || 'none', dust: false });
const cust = (id, pos, parts, anim = 'none', delay = 0) => ({ id, type: 'custom', pos, params: { parts }, anim, delay, dust: false });
const L = (i) => W(i);                                                       // start of spoken line i+1

// ---------- key times ----------
const T = { bucket1: W(0, 10), horse1: W(0, 2), empty2: W(1, 6), thirsty2: W(1, 9), drink3: W(2, 1), hot3: W(2, 11), trough4: W(3, 6), full4: W(3, 10),
  grass5: W(4, 6), days5: W(4, 12), bucket6: W(5, 10), corn6: W(5, 11), stomach7: W(6, 1), vomit7: W(6, 14), grain8: W(7, 2), ferment8: W(7, 7),
  gas8: W(7, 10), colic8: W(7, 12), die8: W(7, 16), hay9: W(8, 3), day9: W(8, 8), grain9: W(8, 16), right9: W(8, 21), cut10: W(9, 6), ferm10: W(9, 10),
  colic10: W(9, 15), asph11: W(10, 9), limp11: W(10, 14), hoof12: W(11, 2), shoe13: W(12, 1), farrier13: W(12, 7), nails13: W(12, 14), use13: W(12, 17),
  rain14: W(13, 2), mud14: W(13, 7), rot14: W(13, 12), pick15: W(14, 5), dry15: W(14, 8), stable15: W(14, 12), falls16: W(15, 7), sharp17: W(16, 7),
  cheek17: W(16, 10), dentist18: W(17, 4), yes18: W(17, 7), eyes19: W(18, 6), all19: W(18, 10), behind19: W(18, 14), blind19: W(18, 19), behind20: W(19, 3),
  kick20: W(19, 9), leg20: W(19, 13), side21: W(20, 3), talk21: W(20, 5), sleep22: W(21, 8), lock23: W(22, 4), lie24: W(23, 7), safe24: W(23, 16),
  alone25: W(24, 5), herd25: W(24, 11), guard25: W(24, 12), lie25: W(24, 16), city26: W(25, 1), elec26: W(25, 9), horses26: W(25, 14) };

// ---------- layout (metres; island x -13..13, z -10..10, the camera works mostly from +z) ----------
const HH = 2.35;                                                             // horse to the poll (about 1.6 m at the withers)
const HORSE = (o = {}) => ({ model: 'animals_pack/Horse', height: HH, ground: 'flat', dust: 0, ...o });
const C0 = { clip: 'Idle', rk: 0, lick: 0, drink: 0, swish: .35, flies: .15, dur: .8 };
const hm = o => ({ ...C0, ...o });

// --- pen (middle left)
const BUCKET = [-1.15, 3.4], TRO = [-3.2, -.3], WAT = [TRO[0] + .35, .62, TRO[1] + .05], RACK = [-4.6, 2.6], GRAIN = [-.1, 3.75], HEAP = [-1.0, 1.15], BALE = [-4.25, 4.15];
const pen = [
  obj('fence', 'pen_fence', [0, 0, 0], { segs: [[-5, -1, -2.2, -1], [-2.2, -1, 1, -1], [-5, -1, -5, 1.8], [-5, 1.8, -5, 5], [1, -1, 1, 3]] }),
  obj('floor', 'pen_floor', [-2, 0, 2.1], { w: 5.6, d: 5.4, seed: 5 }),
  obj('trough', 'trough', [TRO[0], 0, TRO[1]], { len: 1.6, w: .6, h: .75, drinkAt: [WAT[0] - TRO[0], WAT[2] - TRO[1]], drinks: [[T.drink3 + .4, L(4) + .6]] }),
  obj('rack', 'feeder_rack', [RACK[0], 0, RACK[1]], { w: 1.4, y: .85 }, PI / 2),
  glb('bale', 'medieval_village_pack/Hay', BALE[0], BALE[1], .5, { rotY: .3 }),
  obj('tapHose', 'aru_hose', [0, 0, 0], { tap: [-1.6, -1.55], by: 'farmerP', hand: 'R', holdT: [L(3) + 1.6, L(4) - .3], rest: [-1.75, -.75], aim: [WAT[0] + .35, .62, WAT[2]], sweep: .25,
    sprayK: [[T.trough4 - .2, 0], [T.trough4 + .1, 1], [L(4) - .8, 1], [L(4) - .5, 0]], wetK: [[0, 0]] }),
];
// the bucket of water (0.3 m): galvanised shell, dark inside rim, water disk that drains away in line 2
const bucket = cust('bucket', [BUCKET[0], 0, BUCKET[1]], [
  { shape: 'cylinder', size: [.3, .3, .24], pos: [0, .15, 0], color: '#a7aeb2', metal: .55, rough: .4 },
  { shape: 'cylinder', size: [.27, .012, .27], pos: [0, .296, 0], color: '#3c4246', rough: .7 },
  { shape: 'cylinder', size: [.32, .02, .32], pos: [0, .3, 0], color: '#c3c8cb', metal: .6, rough: .35 }]);
const water = cust('bwater', [BUCKET[0], 0, BUCKET[1]], [{ shape: 'cylinder', size: [.265, .01, .265], pos: [0, .303, 0], color: '#6c95a8', metal: .2, rough: .08 }]);
// grain bucket: shell + maize/oat grain that rises as the farmer pours
const gBucket = cust('gbucket', [GRAIN[0], 0, GRAIN[1]], [{ shape: 'cylinder', size: [.3, .3, .24], pos: [0, .15, 0], color: '#3f6f9a', rough: .5 },
  { shape: 'cylinder', size: [.27, .012, .27], pos: [0, .296, 0], color: '#22323f', rough: .8 }]);
const grain = cust('grain', [GRAIN[0], .2, GRAIN[1]], [{ shape: 'cylinder', size: [.27, .11, .27], pos: [0, .055, 0], color: '#e0b43a', rough: .85 },
  ...Array.from({ length: 14 }, (_, i) => ({ shape: 'sphere', size: [.035, .03, .035], pos: [(R() - .5) * .2, .11, (R() - .5) * .2], color: i % 3 ? '#e8bf45' : '#c99a2c', rough: .8 }))], 'rise', T.corn6 - L(5) - .2);
const sack = cust('sack', [GRAIN[0] + .45, 0, GRAIN[1] + .25], [{ shape: 'sphere', size: [.36, .52, .3], pos: [0, .25, 0], color: '#c9b48a', rough: 1 }, { shape: 'cylinder', size: [.12, .1, .1], pos: [0, .53, 0], color: '#b49e73' }]);
// pen grass: tall bed -> short bed -> bare floor (time-lapse feel); Quaternius tufts round the edge
const grassTall = obj('gTall', 'grass_bed', [-2.1, 0, 2.3], { r: 2.3, r1: 1.9, h: .2, count: 2600 });
const grassShort = { ...obj('gShort', 'grass_bed', [-2.1, 0, 2.3], { r: 2.1, r1: 1.5, h: .07, count: 1500 }), anim: 'rise' };
const hayRack = { ...obj('rackHay', 'hay', [RACK[0], .82, RACK[1]], { w: .4, d: 1.2, hgt: .22, count: 90, seed: 7 }), anim: 'rise' };
const heap = obj('heap', 'clover_heap', [HEAP[0], 0, HEAP[1]], { r: .45, h: .3, count: 320 }, 0, 'rise');
const cart = glb('cart', 'medieval_village_pack/Cart', 2.6, .9, 1.25, { rotY: -.6 });

// --- farmers and people (Farmer 1.75 m; palms by the pose probe: squatReach 0.40 m ahead at 0.16 m, pickReach R 0.40 ahead at 1.03 m)
const FP = [-1.95, -.3];                                                     // at the trough end, facing -x: R palm at (-2.35, 1.03, -.4)
const farmerP = { id: 'farmerP', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmerP', seed: 3, track: [
  [0, -.2, 0, 6.2, PI, 'stand'], [L(3) - .2, -.2, 0, 6.2, PI, 'stand'], [L(3) + 1.5, FP[0], 0, FP[1], -PI / 2, 'pickReach', 'walk'], [L(4) - .3, FP[0], 0, FP[1], -PI / 2, 'pickReach'],
  [L(4) + 1.4, .4, 0, 5.4, 0, 'stand', 'walk'], [L(5) + .4, .4, 0, 5.4, PI, 'stand'], [L(5) + 2.0, GRAIN[0], -.55, GRAIN[1] + .4, PI, 'squatReach', 'walk'], [T.corn6 + 1.8, GRAIN[0], -.55, GRAIN[1] + .4, PI, 'squatReach'],
  [T.corn6 + 2.5, GRAIN[0], 0, GRAIN[1] + .4, PI, 'stand'], [L(6) + 1.8, 1.6, 0, 5.6, .3, 'stand', 'walk'], [L(8) + .2, 1.6, 0, 5.6, .3, 'stand'],
  [L(8) + 2.3, BALE[0] + .55, -.55, BALE[1], -PI / 2, 'squatReach', 'walk'], [L(8) + 3.1, BALE[0] + .55, -.55, BALE[1], -PI / 2, 'squatReach'],
  [L(8) + 3.9, RACK[0] + .55, 0, RACK[1] + .65, -PI / 2, 'pickReach', 'walk'], [T.grain9, RACK[0] + .55, 0, RACK[1] + .65, -PI / 2, 'pickReach'],
  [T.grain9 + 2.2, -3.0, 0, 6.1, PI / 2, 'stand', 'walk'], [D + 1, -3.0, 0, 6.1, PI / 2, 'stand']] } };

// --- main horse A (pen lines 1-6, 8-11, 13)
const HA_DRINK = [TRO[0] + .35, TRO[1] + 1.85];
const hA = { id: 'hA', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...HORSE({ link: 'hA', seed: 5, clip: 'Eating' }), track: [
  [0, -2.75, 3.4, 0, PI / 2], [L(2) + .2, -2.75, 3.4, 0, PI / 2], [L(2) + 3.0, HA_DRINK[0], HA_DRINK[1], 0, PI], [L(4) + .5, HA_DRINK[0], HA_DRINK[1], 0, PI],
  [L(4) + 3.2, -2.3, 2.4, 0, PI / 2], [T.corn6 + 2.3, -2.3, 2.4, 0, PI / 2], [T.corn6 + 4.6, GRAIN[0] - 1.32, GRAIN[1], 0, PI / 2],
  [T.gas8 - .4, GRAIN[0] - 1.32, GRAIN[1], 0, PI / 2], [T.colic8 + .3, -2.0, 3.25, 0, PI / 2 + .35],
  [L(8) + 1.4, -2.0, 3.25, 0, PI / 2 + .35], [L(8) + 4.6, RACK[0] + 1.33, RACK[1], 0, -PI / 2], [L(9) + 1.4, RACK[0] + 1.33, RACK[1], 0, -PI / 2],
  [L(9) + 3.4, -2.6, 1.2, 0, PI / 2], [T.colic10 - .9, -2.6, 1.2, 0, PI / 2], [T.colic10 + .5, -3.0, 1.25, 0, PI / 2],
  [L(10) - .5, -3.0, 1.25, 0, PI / 2], [L(10) + 4.3, 2.4, 6.75, 0], [L(10) + 4.7, 2.4, 6.75, 0, PI / 2], [L(12) - .2, 10.0, 6.75, 0, PI / 2], [D + 1, 10.0, 6.75, 0, PI / 2]] } };

// --- anatomy horse X (flank window on the left side, +x): small stomach, huge gut; gas bubbles in line 8
const HX = [5.2, .6], WX = HX[0] + .02;
const hX = glb('hX', 'animals_pack/Horse', HX[0], HX[1], HH, { params: { clip: 'Idle', speed: .35, cutBox: [WX, HX[0] + .8, .98, 1.62, HX[1] - 1.0, HX[1] + .22], cutOpen: [L(6) + .3, L(6) + 1.4] } });
const ORG = (shape, size, pos, color, o = {}) => ({ shape, size, pos: [WX + .1 + (o.dx || 0), pos[0], HX[1] + pos[1] - .78], color, rough: o.rough ?? .45, wobble: o.wobble });
const organs = cust('organs', [0, 0, 0], [
  { shape: 'box', size: [.02, .66, 1.24], pos: [WX + .015, 1.3, HX[1] - .39], color: '#5b2a28', rough: .9 },              // cavity wall
  ORG('sphere', [.3, .24, .36], [1.4, .9], '#d98a86', { wobble: .06 }),                                                   // stomach (small)
  ORG('cylinder', [.06, .5, .06], [1.55, 1.12], '#c7716c'),                                                               // oesophagus to the chest
  ORG('sphere', [.46, .36, .62], [1.13, .25], '#c9a27a', { wobble: .08 }),                                                // caecum (huge)
  ORG('sphere', [.4, .32, .5], [1.2, .62], '#b98f6a', { wobble: .07, dx: -.03 }), ORG('sphere', [.34, .28, .44], [1.42, .3], '#c49b74', { wobble: .07, dx: -.02 }),
  ORG('sphere', [.3, .22, .36], [1.07, .74], '#b5896a', { wobble: .07, dx: -.04 })], 'grow', .9);
const bubbles = Array.from({ length: 9 }, (_, i) => cust('bub' + i, [WX + .2, 0, HX[1]], [{ shape: 'sphere', size: (d => [d, d, d])(.05 + R() * .05),
  pos: [(R() - .5) * .04, 1.16 + R() * .34, -.62 + R() * .82], color: '#f1ead0', rough: .2 }], 'grow', .25 + i * .45));
const MOUTHX = [HX[0], 1.72, HX[1] + 1.36];

// --- asphalt lane (front right): road z 5.6..8.0
const ROADZ = 5.0;
const lane = obj('lane', 'street_set', [7.6, 0, ROADZ], { w: 10.4, z0: 0, z1: 3.4, walk: [0, .6], road: [.6, 3.0], walk2: 3.2 });
// hoof macro (lower foreleg, life size): whole hoof -> worn hoof with grit; the leg runs up out of the close frame
const HM = [5.2, 7.65], HOOFC = '#3a302a';
const legParts = (worn) => [
  { shape: 'cylinder', size: [.085, .5, .08], pos: [0, .62, 0], color: '#5b3b26', rough: .8 },                        // cannon
  { shape: 'sphere', size: [.12, .11, .12], pos: [.0, .36, 0], color: '#563723', rough: .8 },                         // fetlock
  { shape: 'cylinder', size: [.075, .2, .085], pos: [.035, .25, 0], rot: [0, 0, -.35], color: '#4f3322', rough: .8 }, // pastern
  { shape: 'sphere', size: [.1, .05, .1], pos: [.06, .155, 0], color: '#2f2722', rough: .8 },                         // coronet hair
  { shape: 'cylinder', size: [.105, worn ? .075 : .115, .14], pos: [.075, worn ? .04 : .06, 0], color: HOOFC, rough: .55 }];
const hoofWhole = cust('hoofW', [HM[0], .02, HM[1]], legParts(false));
const hoofWorn = cust('hoofX', [HM[0], .02, HM[1]], [...legParts(true),
  { shape: 'cylinder', size: [.145, .012, .145], pos: [.075, .006, 0], color: '#9a948c', rough: .9 },                 // ground-off pale rim
  ...Array.from({ length: 12 }, () => ({ shape: 'sphere', size: [.012, .008, .012], pos: [.075 + (R() - .5) * .3, .004, (R() - .5) * .3], color: '#8d8780' }))], 'grow');

// --- farrier at horse A's right fore hoof on the lane (horse at (10, 6.75) facing +x: right fore hoof at (10.42, 6.95))
const HOOF_A = [10.42, 6.96];
const FR = [HOOF_A[0], HOOF_A[1] + .4];
const hits = []; for (let k = 0; k < 4; k++) { const t0 = T.shoe13 + 1.0 + k * .42; hits.push([t0, FR[0], -.55, FR[1], PI, 'tieLow'], [t0 + .21, FR[0], -.55, FR[1], PI, 'squatReach']); }
const rasps = []; for (let t0 = T.farrier13 + .6; t0 < L(13) - .9; t0 += .5) { rasps.push([t0, FR[0] + .06, -.55, FR[1], PI, 'squatReach'], [t0 + .25, FR[0] - .06, -.55, FR[1], PI, 'squatReach']); }
const farrier = { id: 'farrier', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Worker', height: 1.75, link: 'farrier', seed: 7, track: [
  [0, 12.0, 0, 8.9, PI, 'stand'], [L(12) - .4, 12.0, 0, 8.9, -PI / 2 - .5, 'stand'], [T.shoe13 + .6, FR[0], 0, FR[1] + .05, PI, 'stand', 'walk'], [T.shoe13 + .95, FR[0], -.55, FR[1], PI, 'squatReach'],
  ...hits, ...rasps, [L(13) - .3, FR[0], -.55, FR[1], PI, 'squatReach'], [L(13) + .6, FR[0], 0, FR[1] + .1, PI, 'stand'], [D + 1, FR[0], 0, FR[1] + .1, PI, 'stand']] } };
const rasp = obj('rasp', 'pick_prop', [FR[0] + .4, 0, FR[1] + .3], { kind: 'stick', len: .32, r: .012, carryBy: 'farrier', hand: 'R', pick: [T.shoe13 + .8, 1e4, 1e4] });
// horseshoe (dark steel U, 0.12 m) round the base of the hoof, toe to +x
const shoe = cust('shoe', [HOOF_A[0], .0, HOOF_A[1]], [
  { shape: 'box', size: [.025, .014, .12], pos: [.065, .007, 0], color: '#3a3c3f', metal: .7, rough: .35 },
  { shape: 'box', size: [.11, .014, .022], pos: [.0, .007, .058], color: '#3a3c3f', metal: .7, rough: .35 },
  { shape: 'box', size: [.11, .014, .022], pos: [.0, .007, -.058], color: '#3a3c3f', metal: .7, rough: .35 }], 'grow', T.shoe13 + .9 - L(12));

// --- mud pen in the rain (back right) + rot hoof macro
const MUD = [8.4, -3.5];
const mud = [obj('mud', 'mud_patch', [MUD[0], 0, MUD[1]], { w: 3.6, d: 2.6, seed: 41, puddles: [[-.3, .1, .45, .3], [.5, -.25, .35, .22], [.1, .45, .3, .18], [-.7, -.4, .28, .2]] }),
  obj('fenceM', 'pen_fence', [0, 0, 0], { segs: [[6.4, -5.0, 10.4, -5.0], [10.4, -5.0, 10.4, -2.0]] }),
  obj('rainM', 'rain_fall', [MUD[0] - 1.2, 0, MUD[1] + 1], { w: 7, d: 6, h: 4.5, count: 1600, rainK: [[0, 0], [L(13) - .4, 0], [L(13) + .4, 1], [L(14) - .6, 1], [L(14) + .2, 0]] })];
const hM = { id: 'hM', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...HORSE({ model: 'animals_pack/Horse_White', link: 'hM', seed: 9, clip: 'Idle_Headlow' }), track: [[0, MUD[0], MUD[1], -.03, PI / 2 + .2]] } };
const RM = [6.0, -2.4];
const hoofRot = cust('hoofR', [RM[0], .0, RM[1]], [...legParts(false).map(p => ({ ...p, color: p.color === HOOFC ? '#2f2823' : p.color })),
  { shape: 'sphere', size: [.08, .04, .05], pos: [.03, .05, .05], color: '#1d2416', rough: .3 }, { shape: 'sphere', size: [.05, .03, .04], pos: [.07, .035, .06], color: '#2c3a1d', rough: .3 },
  { shape: 'cylinder', size: [.5, .02, .4], pos: [.05, .005, 0], color: '#3d2c1e', rough: .25 }]);

// --- stable (back left): timber shelter, straw floor, horse S, farmer with the hoof pick
const ST = [-8.6, -4.6];
const stable = [obj('stable', 'shelter', [ST[0], 0, ST[1]], { w: 4.2, d: 3.0, h: 2.95 }), obj('straw', 'hay_pile', [ST[0], 0, ST[1] + .1], { r: 1.75, h: .07, count: 3200 })];
const hS = { id: 'hS', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...HORSE({ link: 'hS', seed: 11, clip: 'Idle' }), track: [[0, ST[0] - .3, ST[1] + .1, .02, PI / 2]] } };
const HOOF_S = [ST[0] - .3 + .42, ST[1] + .1 + .2];
const farmerS = { id: 'farmerS', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmerS', seed: 5, track: [
  [0, -6.0, 0, -1.6, PI, 'stand'], [L(14) + .1, -6.0, 0, -1.6, PI, 'stand'], [T.pick15 - .5, HOOF_S[0], 0, HOOF_S[1] + .45, PI, 'stand', 'walk'], [T.pick15, HOOF_S[0], -.55, HOOF_S[1] + .4, PI, 'squatReach'],
  [T.pick15 + .5, HOOF_S[0] + .05, -.55, HOOF_S[1] + .4, PI, 'squatReach'], [T.pick15 + 1.0, HOOF_S[0] - .05, -.55, HOOF_S[1] + .4, PI, 'squatReach'], [T.dry15 - .2, HOOF_S[0], -.55, HOOF_S[1] + .4, PI, 'squatReach'],
  [T.dry15 + .6, HOOF_S[0], 0, HOOF_S[1] + .5, PI, 'stand'], [L(15) - .3, -6.0, 0, -2.0, 0, 'stand', 'walk'], [D + 1, -6.0, 0, -2.0, 0, 'stand']] } };
const pick = obj('hpick', 'pick_prop', [HOOF_S[0] + .3, 0, HOOF_S[1] + .7], { kind: 'stick', len: .2, r: .01, carryBy: 'farmerS', hand: 'R', pick: [T.pick15 - .1, 1e4, 1e4] });

// --- teeth station (left): horse T with a cheek window, a hay rack, dropped food, the dentist on a crate
const HT = [-9.6, 2.0];
const hT = glb('hT', 'animals_pack/Horse', HT[0], HT[1], HH, { params: { clip: 'Idle', speed: .25, cutBox: [HT[0] + .02, HT[0] + .4, 1.74, 2.02, HT[1] + .82, HT[1] + 1.18], cutOpen: [L(16) + .4, L(16) + 1.4] } });
const rackT = obj('rackT', 'feeder_rack', [HT[0], 0, HT[1] + 2.15], { w: 1.2, y: .9 });
const hayT = obj('hayT', 'hay', [HT[0], .87, HT[1] + 2.15], { w: 1.0, d: .35, hgt: .2, count: 70, seed: 9 });
const dropped = Array.from({ length: 6 }, (_, i) => obj('drop' + i, 'hay', [HT[0] + (R() - .5) * .3, 0, HT[1] + 1.55 + (R() - .5) * .25], { w: .18, d: .14, hgt: .03, count: 7, seed: 20 + i }, 0, 'grow'));
dropped.forEach((d, i) => { d.delay = .4 + i * .55; });
const TX = HT[0] + .1;                                                       // teeth plane inside the cheek window
const teeth = cust('teeth', [0, 0, 0], [
  { shape: 'box', size: [.012, .3, .4], pos: [HT[0] + .045, 1.86, HT[1] + 1.0], color: '#9c3f45', rough: .6 },
  ...[0, 1, 2, 3, 4].flatMap(i => { const z = HT[1] + .86 + i * .07; return [
    { shape: 'box', size: [.03, .04, .055], pos: [TX, 1.91, z], color: '#ece3c8', rough: .35 }, { shape: 'box', size: [.03, .04, .055], pos: [TX, 1.82, z], color: '#e6dcbf', rough: .35 },
    { shape: 'cone', size: [.022, .03, .022], pos: [TX + .025, 1.9, z], rot: [0, 0, -PI / 2], color: '#f4ecd6', rough: .3 }]; }),
  { shape: 'sphere', size: [.06, .045, .05], pos: [HT[0] + .135, 1.88, HT[1] + .98], color: '#b3242c', rough: .4 }], 'grow', .9);
const CRATE = [HT[0] + .62, HT[1] + 1.0];
const crate = glb('crate', 'medieval_village_pack/Crate', CRATE[0], CRATE[1], .3, { rotY: .2 });
const dentist = { id: 'dentist', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Suit', height: 1.75, link: 'dentist', seed: 8, track: [
  [0, -7.3, 0, 4.2, PI, 'stand'], [L(17) + .2, -7.3, 0, 4.2, -PI / 2, 'stand'], [T.dentist18 - .6, CRATE[0] + .1, 0, CRATE[1], -PI / 2, 'stand', 'walk'],
  [T.dentist18 - .1, CRATE[0], .3, CRATE[1], -PI / 2, 'stakePushHi'],
  ...Array.from({ length: Math.floor((L(18) - 1.0 - T.dentist18 - .2) / .5) }, (_, k) => { const t0 = T.dentist18 + .2 + k * .5; return [[t0, CRATE[0], .3, CRATE[1] - .04, -PI / 2, 'stakePushHi'], [t0 + .25, CRATE[0], .3, CRATE[1] + .04, -PI / 2, 'stakePushHi']]; }).flat(),
  [L(18) - .4, CRATE[0], .3, CRATE[1], -PI / 2, 'stand'], [L(18) + .6, -7.3, 0, 4.4, 0, 'stand', 'walk'], [D + 1, -7.3, 0, 4.4, 0, 'stand']] } };
const floatTool = obj('float', 'pick_prop', [CRATE[0] + .3, 0, CRATE[1] + .4], { kind: 'stick', len: .5, r: .012, carryBy: 'dentist', hand: 'R', pick: [T.dentist18 - .3, 1e4, 1e4] });

// --- pasture front left: horse K (vision, kick, side approach, standing sleep, the lone horse), person, giant x-ray leg
const HK = [-5.4, 7.2];
const hK = { id: 'hK', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...HORSE({ link: 'hK', seed: 13, clip: 'Idle' }), track: [
  [0, HK[0], HK[1], 0, PI / 2], [T.talk21, HK[0], HK[1], 0, PI / 2], [T.talk21 + 2.0, HK[0], HK[1], 0, PI / 2 + .45], [L(21), HK[0], HK[1], 0, PI / 2 + .2], [D + 1, HK[0], HK[1], 0, PI / 2 + .2]] } };
const person = { id: 'person', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Casual', height: 1.75, link: 'person', seed: 2, track: [
  [0, -11.2, 0, 7.2, PI / 2, 'stand'], [L(19) + .2, -11.2, 0, 7.2, PI / 2, 'stand'], [T.kick20 - .4, -7.95, 0, 7.2, PI / 2, 'stand', 'walk'], [T.kick20 + .5, -8.35, 0, 7.25, PI / 2, 'recoil'],
  [T.leg20 + .6, -8.35, 0, 7.25, PI / 2, 'recoil'], [L(20) + .2, -8.3, 0, 8.9, .6, 'stand', 'walk'], [T.side21 + .6, -5.0, 0, 8.35, PI, 'stand', 'walk'], [L(21) - .2, -5.0, 0, 8.35, PI, 'stand'],
  [L(21) + 2.2, -3.0, 0, 9.3, PI / 2, 'stand', 'walk'], [D + 1, -3.0, 0, 9.3, PI / 2, 'stand']] } };
const talk = obj('talk', 'call_arcs', [0, 0, 0], { link: 'person', onK: [[0, 0], [T.talk21 - .1, 0], [T.talk21 + .2, 1], [L(21) - .4, 1], [L(21), 0]] });
// field of view: green rays all round the horse at ground level, a wedge behind it left empty (blind spot)
const rays = []; for (let a = -168; a <= 168; a += 8) { const r = a * PI / 180, Lr = 2.6; rays.push({ shape: 'box', size: [.05, .012, Lr], pos: [Math.sin(r) * (Lr / 2 + .3), .03, Math.cos(r) * (Lr / 2 + .3)], rot: [0, r, 0], color: '#7fe07a', rough: .4 }); }
const fov = { ...cust('fov', [HK[0] + .55, 0, HK[1]], rays, 'grow'), rotY: PI / 2 };
const blind = [HK[0] - 1.9, .1, HK[1]];
// giant x-ray hind leg (magnified on purpose, from plans/horse.mjs) standing beside the horse
const X0 = -2.5, Z0 = 8.0, BONE = '#efe6d2', TEND = '#c94a3a';
const seg = (a, b, r, color) => { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); return { shape: 'cylinder', size: [r, len, r], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2] ?? 0], rot: [0, 0, -Math.atan2(dx, dy)], color }; };
const ball = (d, p, color) => ({ shape: 'sphere', size: [d, d, d], pos: p, color });
const J = { hip: [-.25, 2.75], stifle: [.12, 1.9], hock: [-.2, 1.02], fet: [-.12, .34], hoof: [-.02, .1] };
const legX = cust('legX', [X0, 0, Z0], [seg(J.hip, J.stifle, .3, BONE), seg(J.stifle, J.hock, .24, BONE), seg(J.hock, J.fet, .17, BONE), seg(J.fet, J.hoof, .15, BONE),
  ball(.42, [...J.stifle, 0], BONE), ball(.2, [J.stifle[0] + .2, J.stifle[1] + .16, 0], '#d6c7a6'), ball(.32, [...J.hock, 0], BONE), ball(.22, [...J.fet, 0], BONE),
  { shape: 'cone', size: [.36, .22, .36], pos: [J.hoof[0], .11, 0], color: '#3a3430' }, { shape: 'cylinder', size: [.9, .06, .9], pos: [-.05, .03, 0], color: '#8a8580' },
  seg([-.34, 1.05, .05], [-.26, .38, .05], .06, TEND), seg([-.02, 1.75, .05], [-.3, 1.12, .05], .06, TEND)], 'grow');
const PAT_DOWN = [J.stifle[0] + .3, J.stifle[1] - .08, 0], PAT_UP = [J.stifle[0] + .33, J.stifle[1] + .22, 0];
const patella = (id, p, delay = 0) => cust(id, [X0, 0, Z0], [{ shape: 'sphere', size: [.2, .28, .18], pos: p, color: BONE },
  seg([p[0], p[1] - .1, .06], [J.stifle[0] + .06, J.stifle[1] - .55, .06], .07, TEND), seg([p[0] - .04, p[1] - .1, -.06], [J.stifle[0] + .02, J.stifle[1] - .55, -.06], .07, TEND)], 'none', delay);
const lockGlow = cust('lockG', [X0, 0, Z0], [ball(.36, [PAT_UP[0] - .04, PAT_UP[1] - .02, 0], '#45e07a')], 'grow', .15);

// --- herd (back): three lying flat (Death held on its last frame), horse G standing guard
const lying = (id, model, x, z, rotY) => ({ ...glb(id, `animals_pack/${model}`, x, z, HH, { rotY, params: { clip: 'Death', speed: .0001, offset: 9500 } }), anim: 'grow' });
const herd = [lying('l1', 'Horse_White', .7, -6.3, PI / 2 - .4), lying('l2', 'Horse', -2.6, -7.3, PI / 2 + 2.6), lying('l3', 'Horse', 2.6, -8.1, PI / 2 + .3)];
herd.forEach((h, i) => { h.delay = .2 + i * .35; });
const GUARD = [-.6, -5.4];
const hG = { id: 'hG', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...HORSE({ model: 'animals_pack/Horse_White', link: 'hG', seed: 17, clip: 'Idle_2' }), track: [[0, GUARD[0], GUARD[1], 0, .5]] } };

// --- city lane (line 26, back right): built up as the line starts. Electric carriages (white bodies, black canopies), one horse cart
const CZ = -8.6;
const city = [{ ...obj('city', 'street_set', [8.6, 0, CZ], { w: 8.0, z0: 0, z1: 3.6, walk: [0, .8], road: [.8, 3.2], walk2: 3.4, lamps: [[5.6 - 8.6, .5], [11.4 - 8.6, .5]],
  blocks: [[-4.0, -1.4, 6.2, 'a', 1.3], [-1.2, 1.4, 7.0, 'b', 1.3], [1.6, 4.0, 6.0, 'a', 1.3]] }), anim: 'rise' }];
const eCar = (id, x, z, rotY, delay) => ({ ...cust(id, [x, 0, z], [
  { shape: 'box', size: [1.7, .7, 1.0], pos: [0, .75, 0], color: '#eef0ee', rough: .35 }, { shape: 'box', size: [.6, .5, .96], pos: [-.35, 1.34, 0], color: '#e4e7e4', rough: .35 },
  { shape: 'box', size: [1.85, .05, 1.08], pos: [-.1, 2.0, 0], color: '#26292b', rough: .5 }, ...[[-.7, .45], [-.7, -.45], [.55, .45], [.55, -.45]].map(([wx, wz]) => ({ shape: 'cylinder', size: [.06, 1.1, .06], pos: [wx > 0 ? .75 : -.85, 1.45, wz], color: '#2a2c2e' })),
  ...[[-.55, .53], [-.55, -.53], [.55, .53], [.55, -.53]].map(([wx, wz]) => ({ shape: 'cylinder', size: [.62, .08, .62], pos: [wx, .31, wz], rot: [PI / 2, 0, 0], color: '#1c1d1f', rough: .6 })),
  { shape: 'box', size: [.04, .16, .5], pos: [.86, .8, 0], color: '#9fd3ff', rough: .2 }], 'grow', delay), rotY });
const cityCars = [eCar('ec1', 5.6, CZ + 2.6, 0, .6), eCar('ec2', 7.3, CZ + 1.4, PI, 1.0)];
const cityCart = glb('cCart', 'medieval_village_pack/Cart', 9.3, CZ + 2.4, 1.2, { rotY: PI / 2, anim: 'grow' }); cityCart.delay = 1.3;
const hC = { id: 'hC', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...HORSE({ model: 'animals_pack/Horse_White', link: 'hC', seed: 19, clip: 'Idle' }), track: [[0, 11.45, CZ + 2.4, 0, PI / 2]] } };
const walker = { id: 'walker', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_women/Casual', height: 1.65, link: 'walker', seed: 6, track: [
  [0, 4.6, 0, CZ + .4, PI / 2, 'stand'], [L(25) + .5, 4.6, 0, CZ + .4, PI / 2, 'stand'], [D, 9.6, 0, CZ + .4, PI / 2, 'stand', 'walk']] } };

// ---------- farm world round the stations ----------
const world = [];
[[-11.5, -8.6, 8.5, 1], [-4.6, -9.2, 9.5, 2], [5.0, -9.4, 8, 3], [12.2, -1.0, 9, 1], [-12.2, 4.6, 8.5, 2]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-11.6, -1.4, .9, 'ph/shrub_02'], [11.8, 3.2, .8, 'ph/shrub_01'], [3.6, -3.9, .35, 'ph/rock_07'], [-1.2, 8.8, .5, 'ph/shrub_03'], [12.0, 9.0, .3, 'ph/weed_plant_02'], [-12.2, 9.0, .6, 'ph/shrub_01']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

// ---------- beats ----------
const NOSE_A = [BUCKET[0] - .05, .32, BUCKET[1]];
const beats = [
  // 1 hook: the horse grazing on green grass beside a bucket of water; sparkles as it shows, ring on the bucket
  { t: 0, kind: 'info', add: [...pen, bucket, water, gBucket, sack, grassTall, farmerP, hA, hX, lane, farrier, rasp, ...mud, hM, ...stable, hS, farmerS, pick,
      hT, rackT, hayT, crate, dentist, floatTool, hK, person, talk, hG, ...world,
      stk('spk1', 'sparkles', [-2.3, 2.5, 3.4], .45, { delay: .15 })],
    modes: { hA: hm({ clip: 'Eating', swish: .45 }), hM: hm({ clip: 'Idle_Headlow', flies: .4 }), hS: hm({ clip: 'Idle' }), hK: hm({ clip: 'Idle' }), hG: hm({ clip: 'Idle_2' }) },
    camera: { target: [-2.0, .95, 3.3], dist: 7.0, elev: .2, az: .25, zoom: 'in' } },
  { t: T.bucket1 - .3, kind: 'info', remove: ['spk1'], add: [stk('ring1', 'circle_ring', [BUCKET[0], .18, BUCKET[1]], .5, { delay: .2 })],
    camera: { target: [-1.6, .55, 3.4], dist: 3.6, elev: .26, az: .55, zoom: 'in' } },
  // 2 end of the day: the bucket is empty, the horse nudges it with its nose; cross over the bucket
  { t: L(1), kind: 'info', remove: ['ring1', 'bwater'], modes: { hA: hm({ clip: 'Idle_Headlow', lickAt: NOSE_A, rk: 1, lick: 0, drink: 1, dur: 1.2 }) },
    camera: { target: [-1.45, .5, 3.4], dist: 2.6, elev: .5, az: .35, zoom: 'in' } },
  { t: T.empty2 - .2, kind: 'info', add: [stk('x2', 'cross', [BUCKET[0], .62, BUCKET[1]], .26, { delay: .2, pulse: true })],
    camera: { target: [-1.7, .7, 3.4], dist: 3.6, elev: .3, az: .7, zoom: 'out' } },
  // 3 the horse walks to the big trough and drinks (ripples), water drop
  { t: L(2), kind: 'info', remove: ['x2', 'bucket'], modes: { hA: hm({ clip: 'Idle', dur: .8 }) },
    camera: { target: [-3.0, .9, 1.4], dist: 6.2, elev: .22, az: .5, zoom: 'out' } },
  { t: T.drink3 + 2.6, kind: 'info', add: [stk('drop3', 'water_drop', [WAT[0] - .3, 1.15, WAT[2] + .2], .28, { delay: .2 })],
    modes: { hA: hm({ clip: 'Idle_Headlow', lickAt: WAT, rk: 1, drink: 1, dur: .9 }) },
    camera: { target: [-3.0, .75, .4], dist: 3.6, elev: .3, az: .95, zoom: 'in' } },
  //   ... in the heat it drinks more: the sun on the trough, a second, longer drink
  { t: T.hot3, kind: 'info', add: [stk('fire3', 'fire', [-3.9, 1.5, .1], .26, { delay: .1 })],
    camera: { target: [-3.1, .7, .2], dist: 2.8, elev: .2, az: 1.25, zoom: 'in' } },
  // 4 the farmer fills the big trough from the hose; the horse drinks steadily; point-down on the trough
  { t: L(3), kind: 'info', remove: ['drop3', 'fire3'],
    camera: { target: [-2.6, .9, .2], dist: 5.6, elev: .24, az: .7, zoom: 'out' } },
  { t: T.trough4 - .3, kind: 'info', add: [stk('pt4', 'point_down', [TRO[0] - .4, 1.15, TRO[1]], .28, { delay: .2 })],
    camera: { target: [-2.8, .75, -.1], dist: 3.2, elev: .32, az: .45, zoom: 'in' } },
  { t: T.full4, kind: 'info', remove: ['pt4'], add: [stk('ok4', 'check', [TRO[0], 1.45, TRO[1]], .3, { delay: .3 })],
    camera: { target: [-2.9, .9, .3], dist: 4.4, elev: .3, az: .2, zoom: 'out' } },
  // 5 the horse goes back to the grass; it is eaten down in two steps to bare trampled ground; arrow down on the bare patch
  { t: L(4), kind: 'info', remove: ['ok4'], modes: { hA: hm({ clip: 'Eating', dur: 1.2 }) },
    camera: { target: [-2.1, .6, 2.4], dist: 6.4, elev: .42, az: .2, zoom: 'in' } },
  { t: T.grass5, kind: 'info', remove: ['gTall'], add: [grassShort],
    camera: { target: [-2.1, .4, 2.4], dist: 5.6, elev: .55, az: -.1, zoom: 'in' } },
  { t: T.days5 - .3, kind: 'info', remove: ['gShort'], add: [stk('dn5', 'arrow_down', [-1.2, .55, 2.0], .3, { delay: .3 })],
    camera: { target: [-1.9, .35, 2.3], dist: 4.8, elev: .6, az: .3, zoom: 'out' } },
  // 6 the worst mistake: the farmer pours maize/oats into a bucket for the horse; cross over the grain bucket
  { t: L(5), kind: 'info', remove: ['dn5'], modes: { hA: hm({ clip: 'Idle', dur: 1 }) },
    camera: { target: [-.6, .8, 4.2], dist: 5.4, elev: .2, az: .35, zoom: 'in' } },
  { t: T.bucket6 - .4, kind: 'problem', add: [grain, stk('x6', 'cross', [GRAIN[0], .75, GRAIN[1]], .26, { delay: T.corn6 - T.bucket6 + .9, pulse: true })],
    camera: { target: [-.15, .45, 3.85], dist: 3.0, elev: .4, az: 1.45, zoom: 'in' } },
  // 7 flank window: a small stomach for the huge body, a huge gut behind it; eyes; cross at the mouth (it cannot vomit)
  { t: L(6), kind: 'info', remove: ['x6'], add: [organs], modes: { hA: hm({ clip: 'Idle_Headlow', lickAt: [GRAIN[0] - .03, .3, GRAIN[1]], rk: 1, drink: 1, dur: 3 }) },
    camera: { target: [HX[0] + .3, 1.3, HX[1] - .1], dist: 5.6, elev: .1, az: 1.35, zoom: 'in' } },
  { t: T.stomach7 + .3, kind: 'info', add: [stk('ring7', 'circle_ring', [WX + .14, 1.4, HX[1] + .12], .42, { delay: .2 })],
    camera: { target: [WX + .1, 1.3, HX[1] - .1], dist: 2.6, elev: .08, az: 1.45, zoom: 'in' } },
  { t: W(6, 7), kind: 'info', remove: ['ring7'], add: [stk('eyes7', 'eyes', [HX[0] + .2, 2.4, HX[1] + 1.15], .3, { delay: .1 })],
    camera: { target: [HX[0] + .1, 1.6, HX[1] + .5], dist: 4.6, elev: .1, az: 1.15, zoom: 'out' } },
  { t: T.vomit7 - .2, kind: 'info', remove: ['eyes7'], add: [stk('x7', 'cross', [MOUTHX[0] + .25, MOUTHX[1] + .1, MOUTHX[2] + .1], .26, { delay: .1, pulse: true })],
    camera: { target: [HX[0] + .1, 1.75, HX[1] + 1.1], dist: 3.0, elev: .08, az: .95, zoom: 'in' } },
  // 8 too much grain: it ferments, the gut fills with gas (bubbles rise in the window) ...
  { t: L(7), kind: 'info', remove: ['x7'], add: [...bubbles],
    camera: { target: [WX + .1, 1.3, HX[1] - .2], dist: 2.4, elev: .1, az: 1.4, zoom: 'in' } },
  //   ... colic: the horse in the pen lowers its head, lies down and rolls; cross on the horse
  { t: T.colic8 - .3, kind: 'problem', remove: bubbles.map(b => b.id).concat(['organs']), modes: { hA: hm({ clip: 'Idle_Headlow', flies: .5, swish: .9, dur: .8 }) },
    camera: { target: [-1.6, .8, 3.3], dist: 5.0, elev: .3, az: .35, zoom: 'in' } },
  { t: T.colic8 + 1.1, kind: 'problem', add: [stk('x8', 'cross', [-1.8, 1.5, 3.4], .32, { delay: .6, pulse: true })], modes: { hA: hm({ clip: 'Death', onceT: T.colic8 + 1.1, onceSpeed: .8, swish: .9, dur: .6 }) },
    camera: { target: [-1.9, .6, 3.3], dist: 4.6, elev: .36, az: .15, zoom: 'out' } },
  { t: T.die8, kind: 'problem', modes: { hA: hm({ clip: 'Death', onceT: T.colic8 + 1.1, onceSpeed: .8, roll: 1, swish: .9, dur: 1.2 }) },
    camera: { target: [-1.9, .5, 3.3], dist: 3.8, elev: .5, az: .4, zoom: 'in' } },
  // 9 the fix: hay through the day: the farmer loads the rack from the bale, the horse eats slowly; hourglass; small grain; check
  { t: L(8), kind: 'solution', remove: ['x8'], add: [{ ...hayRack, delay: 3.6 }], modes: { hA: hm({ clip: 'Idle', dur: 1.4 }) },
    camera: { target: [-3.9, .9, 3.3], dist: 5.4, elev: .22, az: .55, zoom: 'in' } },
  { t: T.day9, kind: 'solution', add: [stk('hg9', 'hourglass', [RACK[0] + .2, 1.9, RACK[1] + .3], .3, { delay: .2 })],
    camera: { target: [-3.8, 1.0, 2.8], dist: 5.6, elev: .26, az: .55, spin: .25, zoom: 'out' } },
  { t: L(8) + 4.8, kind: 'solution', modes: { hA: hm({ clip: 'Eating', lickAt: [RACK[0] + .05, .95, RACK[1]], rk: .8, drink: 1, dur: 1.2 }) },
    camera: { target: [-3.9, 1.0, 2.6], dist: 4.4, elev: .2, az: .9, zoom: 'in' } },
  { t: T.right9 - .3, kind: 'solution', remove: ['hg9'], add: [stk('ok9', 'check', [RACK[0] + .4, 1.95, RACK[1]], .32, { delay: .2 })],
    camera: { target: [-3.6, 1.0, 2.6], dist: 4.6, elev: .2, az: 1.05, zoom: 'in' } },
  // 10 fresh-cut grass from the cart is dumped in the pen; point-down; the horse sniffs it and steps back; cross on the pile
  { t: L(9), kind: 'info', remove: ['ok9', 'gbucket', 'grain', 'sack'], add: [cart, heap, stk('pt10', 'point_down', [HEAP[0], .85, HEAP[1]], .28, { delay: T.cut10 - L(9) })],
    camera: { target: [-.4, .7, 1.2], dist: 5.6, elev: .26, az: .35, zoom: 'out' } },
  { t: T.ferm10 - .4, kind: 'problem', modes: { hA: hm({ clip: 'Idle_Headlow', lickAt: [HEAP[0] - .2, .28, HEAP[1]], rk: .7, drink: 1, dur: .9 }) },
    camera: { target: [-1.6, .6, 1.3], dist: 3.6, elev: .24, az: .45, zoom: 'in' } },
  { t: T.colic10 - .8, kind: 'problem', remove: ['pt10'], add: [stk('x10', 'cross', [HEAP[0], .8, HEAP[1]], .28, { delay: .4, pulse: true })], modes: { hA: hm({ clip: 'Idle_2', dur: .7 }) },
    camera: { target: [-1.7, .8, 1.3], dist: 4.6, elev: .22, az: .2, zoom: 'out' } },
  // 11 it eats well; now he rides it out on the asphalt: the horse leaves the pen and walks onto the lane; arrow down on the hoof (limp)
  { t: L(10), kind: 'info', remove: ['x10'], modes: { hA: hm({ clip: 'Idle', dur: .8 }) },
    camera: { target: [0, 1.0, 4.3], dist: 7.5, elev: .24, az: .55, zoom: 'out' } },
  { t: T.asph11 - .3, kind: 'info', camera: { target: [3.6, .9, 6.6], dist: 6.8, elev: .2, az: .25, zoom: 'in' } },
  { t: T.limp11 - .6, kind: 'problem', add: [stk('dn11', 'arrow_down', [7.6, .55, 7.2], .26, { delay: .3 })],
    camera: { target: [7.0, .7, 6.8], dist: 5.4, elev: .18, az: .3, zoom: 'in' } },
  // 12 hoof macro on the asphalt: whole hoof -> the edge wears down (pale ground-off rim, grit); point-down on the worn edge
  { t: L(11), kind: 'problem', remove: ['dn11'], add: [hoofWhole],
    camera: { target: [HM[0] + .07, .2, HM[1]], dist: 1.25, elev: .2, az: .35, zoom: 'in' } },
  { t: T.hoof12 + .4, kind: 'problem', remove: ['hoofW'], add: [hoofWorn, stk('pt12', 'point_down', [HM[0] + .14, .2, HM[1] + .1], .1, { delay: .7 })],
    camera: { target: [HM[0] + .07, .12, HM[1]], dist: .95, elev: .22, az: .6, zoom: 'in' } },
  // 13 the shoe: the farrier squats at the fore hoof, the steel shoe goes on (hammer rhythm), then he rasps the hoof level; check
  { t: L(12), kind: 'solution', remove: ['pt12', 'hoofX'], add: [shoe],
    camera: { target: [10.3, .8, 7.0], dist: 4.6, elev: .2, az: .35, zoom: 'in' } },
  { t: T.shoe13 + 1.0, kind: 'solution', add: [stk('ring13', 'circle_ring', [HOOF_A[0], .1, HOOF_A[1]], .3, { delay: .3 })],
    camera: { target: [HOOF_A[0], .35, HOOF_A[1] + .15], dist: 2.4, elev: .32, az: 1.5, zoom: 'in' } },
  { t: T.farrier13 - .2, kind: 'solution', remove: ['ring13'],
    camera: { target: [HOOF_A[0] + .05, .4, HOOF_A[1] + .2], dist: 2.2, elev: .26, az: 1.75, zoom: 'in' } },
  { t: T.nails13 - .4, kind: 'solution', add: [stk('nails13', 'point_down', [HOOF_A[0] + .12, .3, HOOF_A[1] - .05], .12, { delay: .2 })],
    camera: { target: [HOOF_A[0], .3, HOOF_A[1] + .1], dist: 1.9, elev: .42, az: 1.35, zoom: 'in' } },
  { t: T.use13 - .2, kind: 'solution', remove: ['nails13'], add: [stk('ok13', 'check', [10.2, 2.5, 6.9], .34, { delay: .2 })],
    camera: { target: [10.1, 1.0, 6.9], dist: 5.0, elev: .2, az: .55, zoom: 'out' } },
  // 14 rain on the mud pen, the horse standing in the mud; the hoof macro with a rot patch in the soft heel; cross on the hoof
  { t: L(13), kind: 'info', remove: ['ok13'],
    camera: { target: [MUD[0] - .4, 1.0, MUD[1] + .3], dist: 6.6, elev: .2, az: .25, zoom: 'in' } },
  { t: T.mud14 - .3, kind: 'info', camera: { target: [MUD[0] + .2, .6, MUD[1] + .3], dist: 3.8, elev: .2, az: -.2, zoom: 'in' } },
  { t: T.rot14 - 1.1, kind: 'problem', add: [hoofRot, stk('x14', 'cross', [RM[0] + .12, .32, RM[1] + .1], .12, { delay: 1.0, pulse: true })],
    camera: { target: [RM[0] + .06, .12, RM[1]], dist: 1.0, elev: .22, az: .5, zoom: 'in' } },
  { t: W(13, 13), kind: 'problem', add: [stk('sick14', 'face_sick', [RM[0] - .1, .38, RM[1] + .1], .12, { delay: .2 })],
    camera: { target: [RM[0] + .06, .14, RM[1]], dist: 1.25, elev: .3, az: .2, zoom: 'out' } },
  // 15 the farmer cleans the hoof with a hoof pick in the stable, dry straw under the horse; check
  { t: L(14), kind: 'solution', remove: ['x14', 'sick14', 'hoofR', 'hM', 'mud', 'fenceM'],
    camera: { target: [ST[0] + .2, 1.0, ST[1] + .9], dist: 6.4, elev: .2, az: .2, zoom: 'in' } },
  { t: T.pick15 - .2, kind: 'solution', add: [stk('ring15', 'circle_ring', [HOOF_S[0], .12, HOOF_S[1]], .3, { delay: .4 })],
    camera: { target: [HOOF_S[0], .4, HOOF_S[1] + .2], dist: 2.4, elev: .32, az: 1.5, zoom: 'in' } },
  { t: T.dry15 - .1, kind: 'solution', remove: ['ring15'], add: [stk('ok15', 'check', [ST[0], 2.55, ST[1] + .8], .34, { delay: T.stable15 - T.dry15 })],
    camera: { target: [ST[0], 1.1, ST[1] + .6], dist: 6.8, elev: .2, az: .3, zoom: 'out' } },
  // 16 one day food falls from its mouth while it chews at the rack; eyes; arrow down on the dropped food
  { t: L(15), kind: 'info', remove: ['ok15'], add: [...dropped],
    camera: { target: [HT[0], 1.2, HT[1] + 1.1], dist: 5.4, elev: .2, az: .75, zoom: 'in' } },
  { t: T.falls16 - .4, kind: 'problem', add: [stk('eyes16', 'eyes', [HT[0] + .35, 2.4, HT[1] + 1.3], .26, { delay: .1 }), stk('dn16', 'arrow_down', [HT[0] + .1, .55, HT[1] + 1.55], .2, { delay: .5 })],
    camera: { target: [HT[0] + .05, .9, HT[1] + 1.4], dist: 2.8, elev: .2, az: 1.0, zoom: 'in' } },
  // 17 the teeth keep growing: cheek window, sharp edges on the molars, a sore on the cheek; point-down on the sharp tooth
  { t: L(16), kind: 'problem', remove: ['eyes16', 'dn16'], add: [teeth],
    camera: { target: [HT[0] + .1, 1.86, HT[1] + 1.0], dist: 2.0, elev: .08, az: 1.3, zoom: 'in' } },
  { t: T.sharp17 - .3, kind: 'problem', add: [stk('pt17', 'point_down', [TX + .05, 2.04, HT[1] + 1.0], .1, { delay: .2 }), stk('tooth17', 'tooth', [HT[0] + .3, 2.15, HT[1] + 1.05], .14, { delay: .7 })],
    camera: { target: [TX, 1.87, HT[1] + 1.0], dist: 1.1, elev: .1, az: 1.45, zoom: 'in' } },
  // 18 once a year an equine dentist on a crate rasps the teeth level; check
  { t: L(17), kind: 'solution', remove: ['pt17', 'tooth17'],
    camera: { target: [HT[0] + .4, 1.4, HT[1] + 1.2], dist: 4.6, elev: .16, az: .9, zoom: 'out' } },
  { t: T.dentist18 + .4, kind: 'solution', camera: { target: [HT[0] + .3, 1.65, HT[1] + 1.25], dist: 2.6, elev: .12, az: .55, zoom: 'in' } },
  { t: T.yes18, kind: 'solution', remove: ['teeth'], add: [stk('ok18', 'check', [HT[0] + .5, 2.55, HT[1] + 1.2], .3, { delay: .2 }), stk('tooth18', 'tooth', [HT[0] + .1, 2.55, HT[1] + 1.2], .22, { delay: .5 })],
    camera: { target: [HT[0] + .3, 1.5, HT[1] + 1.0], dist: 3.8, elev: .18, az: .7, zoom: 'out' } },
  // 19 eyes on the sides: top view, green vision rays all round, an empty wedge right behind it; ring on the blind spot
  { t: L(18), kind: 'info', remove: ['ok18', 'tooth18'], camera: { target: [HK[0], 1.0, HK[1]], dist: 6.4, elev: .22, az: .3, zoom: 'in' } },
  { t: T.eyes19 - .2, kind: 'info', add: [fov, stk('eyes19', 'eyes', [HK[0] + 1.3, 2.6, HK[1]], .3, { delay: .1 })],
    camera: { target: [HK[0] - .1, .3, HK[1] - .1], dist: 6.6, elev: 1.15, az: .25, zoom: 'out' } },
  { t: T.behind19 - .2, kind: 'info', remove: ['eyes19'], add: [stk('ring19', 'circle_ring', blind, .9, { delay: .2, pulse: true })],
    camera: { target: [HK[0] - .6, .2, HK[1]], dist: 6.0, elev: 1.25, az: -.2, zoom: 'in' } },
  // 20 a person walks up behind it without a word; the horse kicks; cross on the person's leg
  { t: L(19), kind: 'problem', remove: ['ring19', 'fov'], camera: { target: [-7.4, 1.0, 7.3], dist: 6.4, elev: .16, az: .2, zoom: 'out' } },
  { t: T.kick20 - .5, kind: 'problem', add: [stk('x20', 'cross', [-8.35, .55, 7.5], .26, { delay: 1.2, pulse: true })],
    modes: { hK: hm({ clip: 'Attack_Kick', onceT: T.kick20 - .2, dur: .3 }) },
    camera: { target: [-7.3, .9, 7.3], dist: 4.6, elev: .14, az: .35, zoom: 'in' } },
  { t: T.leg20, kind: 'problem', modes: { hK: hm({ clip: 'Idle', dur: 1.2 }) }, camera: { target: [-7.6, .8, 7.3], dist: 3.8, elev: .14, az: .1, zoom: 'in' } },
  // 21 always come from the side and talk as you go in: sound arcs from his mouth, the horse turns its head calmly; thumbs up
  { t: L(20), kind: 'solution', remove: ['x20'], camera: { target: [-5.6, 1.1, 7.9], dist: 6.0, elev: .18, az: .55, zoom: 'out' } },
  { t: T.talk21 - .2, kind: 'solution', add: [stk('ok21', 'thumbs_up', [-4.6, 2.3, 8.3], .32, { delay: 1.4 })], modes: { hK: hm({ clip: 'Idle_2', dur: 1.2 }) },
    camera: { target: [-5.1, 1.35, 7.8], dist: 3.6, elev: .12, az: .85, zoom: 'in' } },
  // 22 it sleeps standing up: head low, eyes heavy; sleep face + sparkles
  { t: L(21), kind: 'info', remove: ['ok21'], add: [stk('zz22', 'face_sleep', [HK[0] + 1.25, 2.3, HK[1] + .3], .3, { delay: T.sleep22 - L(21) })], modes: { hK: hm({ clip: 'Idle_Headlow', swish: .15, flies: 0, dur: 2.2 }) },
    camera: { target: [HK[0] + .2, 1.1, HK[1]], dist: 5.8, elev: .16, az: .3, zoom: 'in' } },
  { t: T.sleep22 + .8, kind: 'info', add: [stk('spk22', 'sparkles', [HK[0] - .4, 2.0, HK[1] + .4], .3, { delay: .1 })],
    camera: { target: [HK[0] + .5, 1.2, HK[1]], dist: 4.2, elev: .12, az: .55, zoom: 'in' } },
  // 23 a lock in the legs: the giant x-ray hind leg beside the horse, the kneecap slides up and hooks; point-down on the knee
  { t: L(22), kind: 'info', remove: ['zz22', 'spk22'], add: [legX, patella('patD', PAT_DOWN, .3)],
    camera: { target: [X0 - .5, 1.5, Z0 - .3], dist: 6.4, elev: .14, az: .2, zoom: 'out' } },
  { t: T.lock23, kind: 'info', remove: ['patD'], add: [patella('patU', PAT_UP), lockGlow, stk('pt23', 'point_down', [X0 + PAT_UP[0], PAT_UP[1] + .45, Z0], .28, { delay: .3 })],
    camera: { target: [X0 + .2, 1.8, Z0], dist: 3.6, elev: .1, az: .3, zoom: 'in' } },
  // 24 for deep sleep it lies down in the dry straw, only when it feels safe; check
  { t: L(23), kind: 'solution', remove: ['legX', 'patU', 'lockG', 'pt23'],
    camera: { target: [ST[0], 1.0, ST[1] + .8], dist: 6.6, elev: .22, az: .25, zoom: 'in' } },
  { t: T.lie24 - .4, kind: 'solution', modes: { hS: hm({ clip: 'Death', onceT: T.lie24 - .3, onceSpeed: .55, swish: .1, dur: .6 }) },
    camera: { target: [ST[0] - .2, .7, ST[1] + .4], dist: 4.8, elev: .3, az: .1, zoom: 'in' } },
  { t: T.safe24 - .4, kind: 'solution', add: [stk('ok24', 'check', [ST[0] - .2, 1.9, ST[1] + .5], .32, { delay: .2 })],
    camera: { target: [ST[0] - .2, .6, ST[1] + .3], dist: 4.0, elev: .4, az: .35, zoom: 'out' } },
  // 25 a horse alone stays awake (eyes); in a herd one stands guard while the others lie down to sleep; ring on the guard
  { t: L(24), kind: 'info', remove: ['ok24'], add: [stk('eyes25', 'eyes', [HK[0] + 1.2, 2.5, HK[1] + .2], .28, { delay: T.alone25 - L(24) })], modes: { hK: hm({ clip: 'Idle_2', dur: 1 }) },
    camera: { target: [HK[0] + .2, 1.1, HK[1]], dist: 6.4, elev: .2, az: .1, zoom: 'out' } },
  { t: T.herd25 - .4, kind: 'info', remove: ['eyes25'], add: [...herd, stk('ring25', 'circle_ring', [GUARD[0], 1.25, GUARD[1]], 1.6, { delay: T.guard25 - T.herd25 + .5 })],
    camera: { target: [.4, .9, -6.4], dist: 11.0, elev: .32, az: .15, zoom: 'in' } },
  { t: T.lie25 - .3, kind: 'info', remove: ['ring25'], add: [stk('zz25', 'face_sleep', [1.6, 1.4, -6.6], .4, { delay: .1 })],
    camera: { target: [.6, .6, -6.8], dist: 9.0, elev: .4, az: -.2, zoom: 'in' } },
  // 26 the city: a lane rises with electric carriages; a single horse cart left in the old centre; thumbs up; slow pull-out arcing round
  { t: L(25), kind: 'info', remove: ['zz25'], add: [...city, ...cityCars, cityCart, hC, walker],
    camera: { target: [8.4, 1.2, CZ + 2.0], dist: 11.0, elev: .38, az: .2, zoom: 'in' } },
  { t: T.elec26 - .3, kind: 'solution', add: [stk('pt26', 'point_down', [5.6, 2.6, CZ + 2.6], .4, { delay: .1 })],
    camera: { target: [6.8, 1.0, CZ + 2.0], dist: 7.5, elev: .3, az: .35, zoom: 'in' } },
  { t: T.horses26 - .6, kind: 'solution', remove: ['pt26'], add: [stk('ok26', 'thumbs_up', [11.4, 3.0, CZ + 2.4], .5, { delay: .2 })],
    camera: { target: [9.0, 1.2, CZ + 2.0], dist: 12.5, elev: .4, az: -.25, spin: .4, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'لو اشتريت حصان',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 26, d: 20, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 9, soilTint: [1.0, .95, .88], horizon: 'nile', cover: 'high',
    haze: .45, sunElev: 46, sunAz: 30, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, motes: .3, clouds: 14,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBeds: [{ cat: 'wind', idx: 0, gain: .03, fade: 1.5 }, { cat: 'bird', idx: 0, gain: .02, fade: 1.5 }, { cat: 'rain', idx: 0, gain: .03, start: L(13), end: L(14), fade: .8 }],
    sfxCalls: [{ cat: 'horse', idx: 0, gain: .05, dur: 2.0, times: [T.horse1 + 1.0, T.talk21 + 1.6] }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, kind: 'info', camera: { punch: false, ...b.camera, dist: b.camera.dist >= 2.5 && b.camera.dist < 9 ? +(b.camera.dist * 1.25).toFixed(2) : b.camera.dist } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
for (let i = 1; i < plan.beats.length; i++) if (plan.beats[i].start <= plan.beats[i - 1].start) console.warn('beat order', i, plan.beats[i].start);
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
