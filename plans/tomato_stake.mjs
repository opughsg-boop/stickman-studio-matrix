// "ليه الفلاح بيربط الطماطم في عيدان طويلة؟!" (voice-over 2026-11-26, 8 lines, 33.7 s, one take). Real-sky island of Delta farmland in
// morning sun: a moist silt tomato bed with one sprawling plant at the front (camera side +z) and a staked, tied row behind it.
// Every spoken line is shown by objects and actions, never by words:
//  1 hook: the front plant lies flat on the soil (ring round the sprawling stems); behind it the farmer ties a knot on a staked plant
//  2 low along the soil: the stems creep further over the ground; close on a fruit resting on the soil (point-down)
//  3 a fallen ripe fruit on the damp soil: a dark sunken rot spot spreads (cross), grey mould specks, a beetle crawls up onto it, a fly
//    lands, two microbes pop up
//  4 the farmer walks in with a 1.5 m bamboo cane, pushes it 30 cm into the soil beside the crown (both palms on the cane), squats,
//    lifts the main stem and ties it to the cane with soft twine in a figure-eight (check)
//  5 he stands and ties a second knot higher up while the plant straightens up the cane; low camera up the plant into the sun (sun rays),
//    then a gust: leaves flutter, light seed fluff drifts past (arrow along the wind)
//  6 close on the trusses hanging clear of the soil: they ripen from orange to red in the sun (sparkles); tilt down to the gap between
//    the fruit and the damp soil (arrow up)
//  7 he comes back with a wicker basket, picks two red fruits at waist height (point-down on each) and drops them in the basket
//  8 CTA: he turns to us beside the staked row, basket in hand; thumbs-up; slow pull-out arcing round
// Step up vs the last render (clover regrow, score 86):
//  motion   - push in three pressed stages with the cane following the palms (never sliding through them); the stem is lifted on an arc
//             round the crown and tied while the hands work at the knot; pick reach-pull-drop with the fruit riding the palm into a
//             swinging basket; a beetle with walking legs and a fly with beating wings; per-leaf flutter that rises in the gust
//  graphics - new procedural tomato plant (compound leaves of serrated veined leaflets, glossy lobed fruit with star calyx, yellow
//             flowers, pedicels), bamboo cane with nodes and soil crumbs, twine figure-eight with tails, wicker basket, rot spot that
//             sinks with mould specks, seed-fluff breeze, sun rays sprite
//  realism  - real sizes: farmer 1.75 m, cane 1.5 m pushed 0.3 m, plant 1.2 m upright, leaves 20-32 cm, fruit 5.5-7 cm, basket 34 cm,
//             beetle 13 mm, fly 7 mm; poses solved by a palm probe so hands meet the cane, the stem and the fruit (< 0.1 m)
//  sound    - this plan only: a field wind bed (.03) plus a faint bird bed (.02), no calls, all ducked under the voice
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI;
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7), l8: W(8),
  spread2: W(1, 4), touch2: W(1, 12), rot3: W(2, 5), bugs3: W(2, 7), virus3: W(2, 9), push4: W(3, 2), tie4: W(3, 7), soft4: W(3, 12),
  up5: W(4, 2), leaves5: W(4, 4), wind5: W(4, 7), open6: W(5, 1), away6: W(5, 4), pick7: W(6, 1), front7: W(6, 6), like8: W(7, 5) };

// ---------- layout (metres). Island front face at z = 8; the camera works from +z ----------
const P0 = [0, 6.2];                                  // front plant crown
const STK = [-.07, -.07];                             // its cane, local to the crown (behind-left; the plant leans away from it)
const SW = [P0[0] + STK[0], P0[1] + STK[1]];          // cane in the world
const ROW = [[-1.35, 4.85, 51], [-.45, 4.85, 53], [.85, 4.85, 57]];   // staked row behind: [x, z, seed]
const H = 1.2;
// trusses [stem, f along it, fruits, ripeness offset, outward az off]: truss 0 rests on the soil when sprawled; truss 5 sits at waist
// height on the upright plant, facing the farmer's pick side (-x, +z)
const TRUSS = [[0, .3, 4, .05, .35], [0, .5, 3, -.05, -.45], [1, .5, 3, .05, .2], [2, .5, 3, 0, -.3], [0, .68, 3, -.15, .6], [0, .88, 3, .15, -1.15]];

// ---------- the farmer ----------
const trk = [], YAW0 = 0, YAWX = PI / 2;
const at = (F, y = 0) => [F[0], y, F[1]];
// line 1: ties a knot on the middle staked plant of the back row, facing us (palms at its cane, .32 m ahead)
const B1c = [ROW[1][0] + STK[0], ROW[1][1] + STK[1]], F1 = [B1c[0], B1c[1] - .32];
trk.push([0, ...at(F1), YAW0, 'tieHigh'], [2.1, ...at(F1), YAW0, 'tieHigh'], [2.4, ...at(F1), YAW0, 'stand']);
// hidden (fetching a cane) while the camera is down at the soil; walks in carrying it
const Fpush = [SW[0], SW[1] - .34], Fin = [-2.7, 5.79];
trk.push([11.3, ...at(Fin), YAWX, 'stakeCarry'], [12.75, ...at(Fpush), null, 'stakeCarry', 'walk'], [12.95, ...at(Fpush), YAW0, 'stakeCarry'],
  [13.25, ...at(Fpush), YAW0, 'stakePushHi'], [13.45, ...at(Fpush), YAW0, 'stakePushHi'], [13.85, ...at(Fpush), YAW0, 'stakePushMid', null, 'in'],
  [14.05, ...at(Fpush), YAW0, 'stakePushMid'], [14.45, ...at(Fpush), YAW0, 'stakePushLo', null, 'in'], [14.6, ...at(Fpush), YAW0, 'stakePushLo']);
// squats, takes the lying main stem near the crown, lifts it to the cane and ties it (twine at .45 m)
const Freach = [P0[0] + .1, P0[1] - .27], Ftie = [SW[0] + .012, SW[1] + .012 - .33];
trk.push([15.05, ...at(Freach, -.55), YAW0, 'squatReach'], [15.2, ...at(Freach, -.55), YAW0, 'squatReach'], [15.7, ...at(Ftie, -.55), YAW0, 'tieLow'],
  [16.85, ...at(Ftie, -.55), YAW0, 'tieLow']);
// line 5: stands, ties a second knot at .95 m while the plant straightens, then walks off to the left
trk.push([17.35, ...at(Ftie), YAW0, 'tieHigh'], [18.45, ...at(Ftie), YAW0, 'tieHigh'], [18.7, ...at(Ftie), YAW0, 'stand'],
  [19.9, -2.6, 0, 5.5, null, 'walk', 'walk']);
// line 7: walks back in with the basket, picks two fruits from truss 5 at waist height (facing +x, right hand on our side)
const Fpick = [-.52, 6.12];                                         // tuned with the fruit probe: right palm (+.40, 1.03, +.11) from him
const Fbask = [-2.2, 6.3];
trk.push([24.6, ...at(Fbask), YAWX, 'basketHold'], [25.85, ...at(Fpick), YAWX, 'basketHold', 'walk'], [26.0, ...at(Fpick), YAWX, 'basketHold'],
  [26.3, ...at(Fpick), YAWX, 'pickReach'], [26.5, ...at(Fpick), YAWX, 'pickReach'], [26.85, ...at(Fpick), YAWX, 'pickPull'], [27.25, ...at(Fpick), YAWX, 'pickDrop'],
  [27.55, ...at(Fpick), YAWX, 'basketHold'], [28.25, ...at(Fpick), YAWX, 'basketHold'], [28.55, ...at(Fpick), YAWX, 'pickReach'], [28.75, ...at(Fpick), YAWX, 'pickReach'],
  [29.1, ...at(Fpick), YAWX, 'pickPull'], [29.5, ...at(Fpick), YAWX, 'pickDrop'], [29.8, ...at(Fpick), YAWX, 'basketHold']);
// line 8: steps back beside the row and turns to us
const Fcta = [-.85, 6.0];
trk.push([30.7, ...at(Fcta), .35, 'ctaHold'], [D + 1, ...at(Fcta), .35, 'ctaHold']);
trk.sort((a, b) => a[0] - b[0]);
const HIDE = [[0, 0], [2.5, 0], [2.55, 1], [11.25, 1], [11.3, 0], [19.95, 0], [20.0, 1], [24.55, 1], [24.6, 0]];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 4, track: trk, hideK: HIDE } };

// ---------- props ----------
const pick1 = [26.5, 27.2], pick2 = [28.75, 29.45];
const plant0 = obj('plant0', 'tomato_plant', [P0[0], 0, P0[1]], { reg: 'p0', seed: 71, h: H, stake: STK, sprawlAz: .6, trusses: TRUSS, wind: [1, .2],
  upK: [[0, 0], [15.2, 0], [15.7, .8], [17.4, .8], [18.4, 1]], growK: [[0, 1], [17.4, 1], [18.6, 1.05]], spreadK: [[0, .9], [T.spread2 - .1, .9], [T.spread2 + .9, 1]],
  ripeK: [[0, .62], [T.open6 - .3, .62], [T.away6 + .4, .98]], gustK: [[0, 0], [T.wind5 - .1, 0], [T.wind5 + .5, 1], [T.l6 - .2, .8], [T.l6 + .8, .1]],
  ties: [{ y: .45, k: [[15.75, 0], [16.75, 1]] }, { y: .95, k: [[17.45, 0], [18.35, 1]] }],
  picks: [{ tr: 5, k: 0, t0: pick1[0], t1: pick1[1] }, { tr: 5, k: 1, t0: pick2[0], t1: pick2[1] }] });
const stake0 = obj('stake0', 'tomato_stake', [SW[0], 0, SW[1]], { carry: [11.3, 13.25], push: [13.25, 14.6], grip: 1.32, gripC: .75 });
const row = ROW.flatMap(([x, z, sd], i) => [
  obj('rowP' + i, 'tomato_plant', [x, 0, z], { seed: sd, h: 1.05 + i * .05, stake: STK, upK: [[0, 1]], ripeK: [[0, .6 + i * .08]], wind: [1, .2], gustK: plant0.params.gustK,
    ties: [{ y: .42, k: [[0, 1]] }, { y: .85, k: i === 1 ? [[0, 0], [.35, 0], [2.0, 1]] : [[0, 1]] }] }),
  obj('rowS' + i, 'tomato_stake', [x + STK[0], 0, z + STK[1]], {})]);
// the fallen fruit that rots on the damp soil, by truss 0 of the sprawled plant (in front of it, camera side)
const ROT = [-.2, 6.52], rR = .033;
const rotFruit = obj('rotFruit', 'tomato_fruit', [ROT[0], 0, ROT[1]], { r: rR, ripe: .95, tilt: .45, spot: [.15, .6, .8], rotK: [[0, .05], [T.rot3 - .1, .05], [T.rot3 + .8, .4], [T.virus3 + .3, .75]] });
const RC = [ROT[0], rR * .78, ROT[1]];
const beetle = obj('beetle', 'tomato_bug', [0, 0, 0], { kind: 'beetle', on: [...RC, rR], path: [[T.bugs3 - .4, ROT[0] + .16, 0, ROT[1] + .05], [T.bugs3 + .5, ROT[0] + .05, .01, ROT[1] + .02], [T.bugs3 + 1.4, ROT[0] + .01, .05, ROT[1] + .02], [T.l4 - .2, ROT[0] - .005, .06, ROT[1] + .012]], hideAt: T.l4 + 3 });
const fly = obj('fly', 'tomato_bug', [0, 0, 0], { kind: 'fly', on: [...RC, rR], path: [[T.bugs3 + .3, ROT[0] - .35, .3, ROT[1] + .1], [T.bugs3 + .7, ROT[0] - .1, .18, ROT[1] + .15], [T.bugs3 + 1.0, ROT[0] + .12, .12, ROT[1] - .05], [T.bugs3 + 1.3, ROT[0] + .02, .09, ROT[1] + .04]], hideAt: T.l4 + 3 });
const basket = obj('basket', 'tomato_basket', [Fbask[0] + .18, 0, Fbask[1] - .22], { carry: [24.6], n0: 5, fillK: [[0, 5], [pick1[1], 6], [pick2[1], 7]] });
const breeze = obj('breeze', 'breeze', [P0[0] - .2, .15, P0[1] + .1], { gustK: plant0.params.gustK, wind: [1, .2], box: [2.6, 1.4, 1.2], n: 70 });
const sun = obj('sun', 'sun_glow', [-.35, 2.0, 4.2], { size: 1.1, showK: [[0, 0], [T.leaves5 - .2, 0], [T.leaves5 + .4, 1], [T.l6 - .1, 1], [T.l6 + .4, 0]] });
const bed = obj('bed', 'clover_bed', [-.25, 0, 5.65], { w: 4.2, d: 2.9, ridges: 'lrb' });

// ---------- farm world ----------
const world = [];
[[-8.0, -6.5, 8.5, 1], [-5.6, -7.4, 9.5, 2], [6.2, -7.2, 9, 3], [8.4, -6.0, 8, 1]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.6, 6.4, .9, 'ph/shrub_02'], [4.2, 5.6, .8, 'ph/shrub_01'], [3.3, 3.2, .35, 'ph/rock_07'], [-3.4, 2.6, .5, 'ph/shrub_03']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

// sticker spots (world); fruit spots come from the fruit probe of the sprawled / upright plant
const FR0 = [.11, .03, 6.52];          // truss 0 fruit resting on the soil (sprawled)
const FRP1 = [-.046, 1.02, 6.22], FRP2 = [-.083, .99, 6.22];   // truss 5 fruits 0 and 1 on the upright plant
const beats = [
  // 1 hook: the plant lies flat; ring round the sprawling stems; the farmer ties a knot on the staked row behind
  { t: 0, kind: 'info', add: [bed, plant0, ...row, stake0, rotFruit, beetle, fly, basket, breeze, sun, farmer, ...world,
      stk('ring1', 'circle_ring', [.35, .12, 6.55], .62, { delay: .25 })],
    camera: { target: [0, .6, 5.75], dist: 3.7, elev: .3, az: .2, zoom: 'in' } },
  // 2 it spreads over the ground with nothing to hold it: low along the creeping stems ...
  { t: T.l1, kind: 'info', remove: ['ring1'],
    camera: { target: [.35, .08, 6.4], dist: 1.7, elev: .2, az: .75, zoom: 'out' } },
  //   ... and the fruit touches the soil (point-down)
  { t: T.touch2 - .2, kind: 'info', add: [stk('pt2', 'point_down', [FR0[0], FR0[1] + .12, FR0[2]], .11, { delay: .4 })],
    camera: { target: [FR0[0], .05, FR0[2]], dist: .75, elev: .3, az: .3, zoom: 'in' } },
  // 3 when it touches the soil it rots fast (cross) ...
  { t: T.l2, kind: 'info', remove: ['pt2'], add: [stk('x3', 'cross', [ROT[0] + .02, .14, ROT[1]], .07, { delay: T.rot3 - T.l2 + .5, pulse: true })],
    camera: { target: [ROT[0], .04, ROT[1]], dist: .55, elev: .34, az: -.35, zoom: 'in' } },
  //   ... and brings insects and viruses: the beetle climbs on, a fly lands, microbes pop up
  { t: T.bugs3 - .5, kind: 'info', remove: ['x3'], add: [stk('mic1', 'microbe', [ROT[0] - .07, .1, ROT[1] + .02], .045, { delay: T.virus3 - T.bugs3 + .5 }),
      stk('mic2', 'microbe', [ROT[0] + .08, .13, ROT[1]], .04, { delay: T.virus3 - T.bugs3 + .75 })],
    camera: { target: [ROT[0], .045, ROT[1]], dist: .4, elev: .28, az: -.6, zoom: 'in' } },
  // 4 the farmer walks in with a cane and pushes it into the soil beside the plant ...
  { t: T.l3, kind: 'info', remove: ['mic1', 'mic2'],
    camera: { target: [SW[0] - .1, .7, SW[1]], dist: 3.4, elev: .2, az: .35, zoom: 'out' } },
  //   ... then lifts the stem and ties it with soft twine (check)
  { t: T.tie4 - .2, kind: 'info', add: [stk('ok4', 'check', [SW[0] + .1, .78, SW[1] + .1], .12, { delay: T.soft4 - T.tie4 + .4 })],
    camera: { target: [SW[0] + .02, .42, SW[1] + .05], dist: 1.5, elev: .2, az: .45, zoom: 'in' } },
  // 5 the plant goes up the cane (second knot) ...
  { t: T.l4, kind: 'info', remove: ['ok4'],
    camera: { target: [SW[0] + .05, .7, SW[1] + .05], dist: 2.4, elev: .16, az: .3, zoom: 'out' } },
  //   ... the leaves take the sun (rays) ...
  { t: T.leaves5 - .15, kind: 'info',
    camera: { target: [P0[0] - .05, 1.05, P0[1]], dist: 1.6, elev: -.12, az: .15, zoom: 'in' } },
  //   ... and the breeze from every side (gust, fluff, arrow along the wind)
  { t: T.wind5 - .1, kind: 'info', add: [stk('wind5', 'arrow_right', [P0[0] - .25, 1.2, P0[1] + .2], .13, { delay: .25 })],
    camera: { target: [P0[0] + .05, .8, P0[1]], dist: 2.0, elev: .08, az: -.2, zoom: 'out' } },
  // 6 the fruit ripens in the sun (sparkles) ...
  { t: T.l5, kind: 'info', remove: ['wind5'], add: [stk('spk6', 'sparkles', [P0[0] + .05, .78, P0[1] + .2], .1, { delay: T.open6 - T.l5 })],
    camera: { target: [P0[0] + .02, .62, P0[1] + .08], dist: 1.0, elev: .1, az: .35, zoom: 'in' } },
  //   ... and hangs away from the damp soil (arrow up in the gap)
  { t: T.away6 - .15, kind: 'info', remove: ['spk6'], add: [stk('up6', 'arrow_up', [P0[0] + .12, .2, P0[1] + .15], .1, { delay: .35 })],
    camera: { target: [P0[0] + .06, .3, P0[1] + .08], dist: 1.25, elev: .12, az: .5, zoom: 'out' } },
  // 7 picking is easier: he picks at waist height (point-down on the fruit) ...
  { t: T.l6, kind: 'info', remove: ['up6'], add: [stk('pt7a', 'point_down', [FRP1[0], FRP1[1] + .13, FRP1[2]], .1, { delay: T.pick7 - T.l6 })],
    camera: { target: [Fpick[0] + .35, .9, Fpick[1] + .05], dist: 3.0, elev: .12, az: .3, zoom: 'in' } },
  //   ... the fruit is right in front of you on the stem (point-down on the next one)
  { t: T.front7 - .1, kind: 'info', remove: ['pt7a'], add: [stk('pt7b', 'point_down', [FRP2[0], FRP2[1] + .13, FRP2[2]], .1, { delay: .2 })],
    camera: { target: [Fpick[0] + .42, .95, Fpick[1] + .1], dist: 1.9, elev: .1, az: .55, zoom: 'in' } },
  // 8 CTA: beside the staked row with his basket; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', remove: ['pt7b'], add: [stk('thumb8', 'thumbs_up', [Fcta[0] + .4, 1.9, Fcta[1] + .15], .3, { delay: T.like8 - T.l7 - .2 })],
    camera: { target: [Fcta[0] + .45, .9, Fcta[1] - .2], dist: 4.2, elev: .16, az: .3, spin: .45, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفلاح بيربط الطماطم في عيدان طويلة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 8, soilTint: [1.0, .97, .9], horizon: 'nile', cover: 'high',
    haze: .4, sunElev: 42, sunAz: 25, turbidity: 2.4, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .4, clouds: 12,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBed: 'wind', sfxBeds: [{ cat: 'forest', idx: 5, gain: .02 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
