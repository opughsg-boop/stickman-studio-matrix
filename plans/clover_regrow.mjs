// "ليه البرسيم بيطلع تاني بعد ما الفلاح يقصّه؟!" (voice-over 2026-11-26, 9 lines, 38.6 s, one take). Real-sky island of Delta farmland
// in winter sun: a berseem (Egyptian clover) basin along the island's front edge (so its roots show on the soil face), a small test
// patch and a weak patch to its right, a felled tree's stump and trunk on the left, and a cow and a donkey in the yard behind.
// Every spoken line is shown by objects and actions, never by words:
//  1 hook: the farmer squats in the tall clover and cuts it with his sickle; tops topple; ring round the fresh stubble
//  2 the stump of a cut tree beside the stubble: a live green crown bud on the clover stub (green dot, check), the dead stump (cross)
//  3 he cuts on; leaves and stems go: he lifts the cut heap in his arms and carries it off; down on the soil face the living
//    root and crown (nodules glow) under the stub, point-down on the crown
//  4 a few days later (hourglass): small green shoots rise from the same stubs (sparkles)
//  5 time-lapse on a small patch: grown, cut, grown, cut, grown, cut; a ring pops on each cut (three rings in a row)
//  6 a patch cut too early: thin, short, pale plants next to a full patch (eyes, point-down), a thin weak root on the soil face,
//    and only a tiny heap (arrow down)
//  7 he waits by the full, flowering strip (hourglass), then squats and cuts it again (check)
//  8 the cow and the donkey eat from the heap (their own Eating clips); he walks in with a fresh armful; thumbs-up
//  9 CTA: he tosses it on the heap, turns to us beside the cow; thumbs-up; slow pull-out arcing round
// Step up vs the last render (palm pollination, score 47 automatic):
//  motion   - squat sickle cycle (reach, pull-cut, toss, shuffle) with each cut toppling exactly the plants the sweep passes, a squat-lift
//             and carry with the heap riding his palms, a toss with an ease-in fall and a squash settle; plants sway per plant
//  graphics - new procedural berseem: instanced plants with 3-6 stems, trifoliate leaves with veined leaflets, cut stubs with pale cut
//             faces, crown buds, cream flower heads at the right time; a moist silt basin with earth ridges; cut-clover heaps
//  realism  - real sizes: 45-60 cm plants cut to 6-11 cm stubs, 3.5-5 cm leaflets, farmer 1.75 m, cow 1.45 m, donkey 1.3 m, stump .5 m;
//             regrowth from the crown as on a real berseem cut cycle; taproot with nodules (a legume) vs a thin pale weak root
//  sound    - this plan only: a field wind bed (.03) plus a faint bird bed (.02), a synthetic low sickle-cut per cut, cow moos and a
//             trimmed donkey bray in voice gaps (.05), all ducked under the voice
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI;
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params) => ({ id, type, pos, params, anim: 'none', dust: false });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7), l8: W(8),
  notDie: W(1, 3), dies: W(1, 4), tree: W(1, 9), leaves: W(2, 2), but3: W(2, 7), crown: W(2, 9), buds4: W(3, 5),
  early6: W(5, 4), root6: W(5, 10), crop6: W(5, 12), wait7: W(6, 2), cut7: W(6, 5), again7: W(6, 7), best8: W(7, 5), like9: W(8, 5) };

// ---------- layout (metres). Island front face at z = 8 (camera side +z); fields touch it so their roots show on the face ----------
const A = { x: -1.45, z: 6.3, w: 4.7, d: 3.4 };     // main basin x -3.8..0.9, z 4.6..8.0
const B = { x: 2.35, z: 7.47, w: .9, d: .95 };       // time-lapse patch x 1.9..2.8
const C = { x: 5.3, z: 7.02, w: 1.9, d: 1.95 };      // cut-too-early patch x 4.35..6.25
const loc = (F, x) => +(x - F.x).toFixed(3);
const BAND = { z0: 6.55 - A.z, z1: 7.98 - A.z };    // the strip he cuts (local z)
const rootXA = [-3.45, -3.05, -2.62, -2.2], rootXC = [4.8, 5.2, 5.6, 6.0];
const YARD = { heap: [-5.3, 3.45], cow: [-6.75, 3.45], donkey: [-3.95, 3.3] };
const YAW = PI / 2;                                    // facing +x; his right hand (sickle) is on the camera side

// ---------- the farmer: squat sickle cycles (track y -.55 = deep squat) ----------
const trk = [], sweepA0 = [[-6, -3.75]], sweepA1 = [], cutTimes = [];
// one cycle a second: reach into the stems (key c, shuffling .13 m forward from the last toss), pull-cut (c + .4: the sweep passes
// c + .08..c + .3, .32 m ahead of his feet), toss the bunch back over his left side (c + .7)
const cycles = (x0, z, c0, n, sweep, step = .13, sx0 = null) => { let x = x0;
  for (let i = 0; i < n; i++) { const c = c0 + i; if (i) x += step;
    trk.push([c, x, -.55, z, YAW, 'sickleReach', i ? 'shuffle' : null], [c + .4, x, -.55, z, YAW, 'sickleCut'], [c + .7, x, -.55, z, YAW, 'sickleToss']);
    sweep.push([c + .08, +(i === 0 && sx0 != null ? sx0 : x - step + .32).toFixed(3)], [c + .3, +(x + .32).toFixed(3)]); cutTimes.push(c + .18); }
  return x; };
// line 1-3: he starts in the stubble he has already cut (pre-cut before t = 0) and works along the strip
const zF = 7.27, xF0 = -3.05;
sweepA0.push([-2, +(xF0 - .13 + .32).toFixed(3)]);
const xF1 = cycles(xF0, zF, 0, 9, sweepA0);
// stand, walk back to his heap, squat-lift it, carry it round the basin to the yard and toss it by the animals
const heapA = [-3.5, 6.78], yardStand = [-5.3, 4.1];
trk.push([9.25, xF1, 0, zF, -YAW, 'stand'], [10.2, heapA[0] + .5, 0, heapA[1], null, 'walk', 'walk'], [10.4, heapA[0] + .5, 0, heapA[1], -YAW, 'stand'],
  [10.8, heapA[0] + .5, -.55, heapA[1], -YAW, 'squatHold'], [11.0, heapA[0] + .5, -.55, heapA[1], -YAW, 'squatHold'], [11.5, heapA[0] + .5, 0, heapA[1], -YAW, 'carry'],
  [12.6, -4.2, 0, 6.85, null, 'carry', 'walk'], [14.85, -4.2, 0, 4.45, null, 'carry', 'walk'], [15.95, ...[yardStand[0], 0, yardStand[1]], null, 'carry', 'walk'],
  [16.25, yardStand[0], 0, yardStand[1], PI, 'carry'], [16.6, yardStand[0], 0, yardStand[1], PI, 'tossFwd'], [17.1, yardStand[0], 0, yardStand[1], PI, 'stand']);
// hidden off-frame while the camera is on the regrowing stubs; back squatting by the time-lapse patch for line 5
const xFB = 1.4, zFB = 7.45;
trk.push([17.4, yardStand[0], 0, yardStand[1], PI, 'stand'], [18.6, xFB, -.55, zFB, YAW, 'sickleReach'], [19.2, xFB, -.55, zFB, YAW, 'sickleReach']);
const cB = [19.45, 21.05, 22.5];
cB.forEach(c => { trk.push([c + .15, xFB, -.55, zFB, YAW, 'sickleCut'], [c + .5, xFB, -.55, zFB, YAW, 'sickleToss'], [c + 1.1, xFB, -.55, zFB, YAW, 'sickleReach']); cutTimes.push(c + .12); });
trk.pop();
trk.push([23.55, xFB, 0, zFB, YAW, 'stand'], [24.0, xFB, 0, zFB, PI, 'stand'], [25.6, xFB, 0, 5.4, null, 'walk', 'walk'], [25.8, xFB, 0, 5.4, PI, 'stand']);
// line 7: waits at the left end of the regrown strip (hands on hips), then squats and cuts it again
const xW = -4.0;
trk.push([27.4, xW, 0, zF, YAW, 'handsHips'], [29.7, xW, 0, zF, YAW, 'handsHips']);
const xW1 = cycles(xW, zF, 30.1, 2, sweepA1, .16, -3.8);
// gathers the fresh armful (heap B behind his left), carries it to the yard and tosses it on the heap; turns to us
const heapB = [-4.5, 6.8], pickB = [heapB[0] + .24, heapB[1] + .24], yawB = Math.atan2(heapB[0] - pickB[0], heapB[1] - pickB[1]);
const drop2 = [-4.95, 4.2], yaw2 = Math.atan2(YARD.heap[0] - drop2[0], YARD.heap[1] - drop2[1]);
trk.push([32.2, xW1, 0, zF, YAW, 'stand'], [32.55, ...[pickB[0], 0, pickB[1]], yawB, 'stand'], [32.95, pickB[0], -.55, pickB[1], yawB, 'squatHold'], [33.15, pickB[0], -.55, pickB[1], yawB, 'squatHold'],
  [33.6, pickB[0], 0, pickB[1], yawB, 'carry'], [35.5, -4.2, 0, 4.6, null, 'carry', 'walk'], [36.15, drop2[0], 0, drop2[1], null, 'carry', 'walk'], [36.35, drop2[0], 0, drop2[1], yaw2, 'carry'],
  [36.7, drop2[0], 0, drop2[1], yaw2, 'tossFwd'], [37.3, drop2[0], 0, drop2[1], .3, 'presentR'], [D + 1, drop2[0], 0, drop2[1], .3, 'presentR']);
trk.sort((a, b) => a[0] - b[0]);
const HIDE = [[0, 0], [17.3, 0], [17.35, 1], [18.55, 1], [18.6, 0], [25.85, 0], [25.9, 1], [27.38, 1], [27.42, 0]];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 6, track: trk, hideK: HIDE } };
const sickleOn = [[0, 1], [9.2, 1], [9.25, 0], [18.6, 0], [18.65, 1], [23.5, 1], [23.55, 0], [29.8, 0], [29.85, 1], [32.15, 1], [32.2, 0]];
const sickle = { id: 'sickle', type: 'palm_tool', pos: [0, 0, 0], anim: 'none', params: { kind: 'sickle', carryBy: 'farmer', hand: 'R', showK: sickleOn, rx: PI / 2, ry: 0, rz: 0 } };

// ---------- the clover ----------
const flowerK = [[0, 0], [28.3, 0], [29.4, 1]];
const fieldA = obj('fieldA', 'clover_field', [A.x, 0, A.z], { w: A.w, d: A.d, dens: 26, seed: 611, front: rootXA.map(x => loc(A, x)), flowerK,
  cuts: [{ k: sweepA0.map(([t, x]) => [t, loc(A, x)]), ...BAND, fall: [-1, -.3], g: [[14.45, 0], [18.3, .33], [27.6, 1]] },
         { k: sweepA1.map(([t, x]) => [t, loc(A, x)]), ...BAND, fall: [-1, -.3], g: [[33, 0], [40, .05]] }] });
const bedA = obj('bedA', 'clover_bed', [A.x, 0, A.z], { w: A.w, d: A.d, ridges: 'lrb' });
const cutB = (c, g) => ({ k: [[c, -.47], [c + .35, .47]], z0: -.6, z1: .6, fall: [-1, 0], g });
const fieldB = obj('fieldB', 'clover_field', [B.x, 0, B.z], { w: B.w, d: B.d, dens: 30, seed: 617,
  cuts: [cutB(19.45, [[20.25, 0], [20.95, 1]]), cutB(21.05, [[21.75, 0], [22.4, 1]]), cutB(22.5, [[23.25, 0], [24.3, 1]])] });
const bedB = obj('bedB', 'clover_bed', [B.x, 0, B.z], { w: B.w, d: B.d, ridges: 'lrb' });
const fieldC = obj('fieldC', 'clover_field', [C.x, 0, C.z], { w: C.w, d: C.d, dens: 26, seed: 619, weak: 1, stubAlways: true, wind: .8, front: rootXC.map(x => loc(C, x)) });
const bedC = obj('bedC', 'clover_bed', [C.x, 0, C.z], { w: C.w, d: C.d, ridges: 'lrb' });
const rootsA = obj('rootsA', 'roots', [0, 0, 8], { xs: rootXA, depth: .62, nodules: true, nodS: .28, color: '#e6d7b4', rad: .009, growTime: .1 });
const rootsC = obj('rootsC', 'roots', [0, 0, 8], { xs: rootXC, depth: .26, color: '#a8936c', rad: .0045, lat: 1, seed: 41, growTime: .1 });
// heaps: A (lines 1-3, carried to the yard, the animals eat it), B (line 7 armful, tossed on top), C (the tiny early-cut crop)
const heapAo = obj('heapA', 'clover_heap', [heapA[0], 0, heapA[1]], { r: .26, h: .2, count: 240, by: 'farmer', growK: [[0, .35], [8.8, 1]], carry: [11.0, 16.45],
  from: [yardStand[0], .95, yardStand[1] - .3], to: [YARD.heap[0], 0, YARD.heap[1]], eatK: [[19, 0], [38.6, .35]] });
const heapBo = obj('heapB', 'clover_heap', [heapB[0], 0, heapB[1]], { r: .17, h: .12, count: 110, by: 'farmer', growK: [[0, 0], [30.7, 0], [30.8, .5], [31.7, .5], [31.8, 1]], carry: [33.15, 36.55],
  from: [drop2[0] - .1, .95, drop2[1] - .3], to: [YARD.heap[0] + .05, .12, YARD.heap[1] + .05], toYaw: .6 });
const heapCo = obj('heapC', 'clover_heap', [3.5, 0, 7.6], { r: .13, h: .07, count: 45, growK: [[0, 0], [26.9, 0], [27.6, 1]] });

// ---------- farm world ----------
const world = [
  glb('stump', 'ph/tree_stump_01', -5.25, 7.0, .5, { rotY: .6 }),
  glb('trunk', 'ph/dead_tree_trunk_02', -6.3, 5.6, .45, { rotY: .5 }),
  glb('cow', 'animals_pack/Cow', YARD.cow[0], YARD.cow[1], 1.45, { rotY: PI / 2, params: { clip: 'Idle_Headlow', offset: .7 } }),
  glb('donkey', 'animals_pack/Donkey', YARD.donkey[0], YARD.donkey[1], 1.3, { rotY: -PI / 2, params: { clip: 'Idle', offset: 1.9 } }),
];
[[-7.5, -5.5, 8.5, 1], [-3.2, -6.8, 9.5, 2], [2.4, -6.2, 9, 3], [7.4, -5.0, 8, 1], [-8.8, 0.5, 7.5, 2], [8.9, 0.2, 8.5, 3]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-7.8, 6.2, .9, 'ph/shrub_02'], [8.2, 5.6, .8, 'ph/shrub_01'], [6.0, 2.6, .35, 'ph/rock_07'], [-2.2, 2.4, .5, 'ph/shrub_03']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

const up = (p, dy, dx = 0, dz = 0) => [p[0] + dx, p[1] + dy, p[2] + dz];
const beats = [
  // 1 hook: squatting in the tall clover, the sickle cuts; ring round the fresh stubble behind him
  { t: 0, kind: 'info', add: [bedA, bedB, bedC, fieldA, fieldB, fieldC, rootsA, rootsC, heapAo, heapBo, heapCo, farmer, sickle, ...world,
      stk('ring0', 'circle_ring', [-3.42, .1, 7.62], .42, { delay: 1.3 })],
    camera: { target: [-2.95, .35, 7.3], dist: 2.6, elev: .32, az: .38, zoom: 'in' } },
  // 2 it does not die when cut: the live green crown on a stub (green dot, check) ...
  { t: T.l1, kind: 'info', remove: ['ring0'], add: [stk('dotG', 'dot_green', [-3.45, .15, 7.97], .06, { delay: T.notDie - T.l1 - .3 }),
      stk('okStub', 'check', [-3.45, .44, 7.9], .17, { delay: T.dies - T.l1 })],
    camera: { target: [-4.3, .25, 7.2], dist: 3.5, elev: .36, az: .1, zoom: 'out' } },
  //   ... like a tree dies when cut from its root: the dead stump (cross)
  { t: T.tree - .15, kind: 'info', add: [stk('xStump', 'cross', [-5.25, .9, 7.05], .2, { delay: .3, pulse: true })],
    camera: { target: [-4.85, .3, 7.05], dist: 2.8, elev: .32, az: -.15, zoom: 'in' } },
  // 3 the farmer cuts: close on the sickle pull, tops toppling
  { t: T.l2, kind: 'info', remove: ['dotG', 'okStub', 'xStump'],
    camera: { target: [-1.75, .3, 7.3], dist: 2.3, elev: .3, az: .9, zoom: 'in' } },
  //   ... leaves and stems are taken away: he lifts the heap and carries it off
  { t: T.leaves - .1, kind: 'info',
    camera: { target: [-3.3, .55, 6.95], dist: 3.7, elev: .15, az: .2, zoom: 'out' } },
  //   ... but the root and crown under the ground stay alive: the soil face under the stubs, nodules glowing; point at the crown
  { t: T.but3, kind: 'info', modes: { rootsA: { glow: .55 } }, add: [stk('ptCrown', 'point_down', [-2.62, .24, 8.04], .12, { delay: T.crown - T.but3 })],
    camera: { target: [-2.85, -.22, 8.0], dist: 1.75, elev: .03, az: .05, zoom: 'in' } },
  // 4 a few days later (hourglass): new shoots from the same stubs
  { t: T.l3, kind: 'info', remove: ['ptCrown'], modes: { rootsA: { glow: 0 } }, add: [stk('hg1', 'hourglass', [-3.0, .4, 7.66], .1, { delay: .2 })],
    camera: { target: [-3.25, .1, 7.55], dist: 1.1, elev: .48, az: .2, zoom: 'in' } },
  //   ... small green buds come out (sparkles)
  { t: T.buds4 - .1, kind: 'info', remove: ['hg1'], add: [stk('spk', 'sparkles', [-3.3, .2, 7.72], .09, { delay: .25 })],
    camera: { target: [-3.3, .08, 7.65], dist: .85, elev: .42, az: -.1, zoom: 'out' } },
  // 5 cut again and again: the small patch grown, cut, grown, cut ... a ring per cut
  { t: T.l4, kind: 'info', remove: ['spk'], modes: { cow: { clip: 'Eating' }, donkey: { clip: 'Eating' } },
    add: cB.map((c, i) => stk('ringB' + i, 'circle_ring', [2.0 + i * .32, .3, 7.55], .3, { delay: c + .3 - T.l4 })),
    camera: { target: [2.1, .3, 7.35], dist: 2.5, elev: .3, az: .3, zoom: 'out' } },
  // 6 careful: the patch cut too early (eyes)
  { t: T.l5, kind: 'info', remove: cB.map((c, i) => 'ringB' + i), add: [stk('eyes', 'eyes', [5.25, .55, 7.25], .15, { delay: .3 })],
    camera: { target: [5.25, .22, 7.2], dist: 2.7, elev: .36, az: .1, zoom: 'in' } },
  //   ... before it has grown: thin short plants next to the full patch (point down on them)
  { t: T.early6 - .15, kind: 'info', remove: ['eyes'], add: [stk('ptC', 'point_down', [5.0, .45, 7.6], .14, { delay: .3 })],
    camera: { target: [3.9, .3, 7.3], dist: 3.5, elev: .3, az: 0, zoom: 'out' } },
  //   ... the root weakens: the thin pale root on the soil face
  { t: T.root6 - .1, kind: 'info', remove: ['ptC'], add: [stk('ptR', 'point_down', [5.2, .14, 8.05], .12, { delay: .2, pulse: true })],
    camera: { target: [5.2, -.16, 8.0], dist: 1.7, elev: .03, az: .05, zoom: 'in' } },
  //   ... and the crop drops: only a tiny heap (arrow down)
  { t: T.crop6 - .1, kind: 'info', remove: ['ptR'], add: [stk('arD', 'arrow_down', [3.5, .38, 7.62], .13, { delay: .5, pulse: true })],
    camera: { target: [3.75, .15, 7.55], dist: 1.5, elev: .3, az: .15, zoom: 'out' } },
  // 7 he waits for the right time by the full, flowering strip (hourglass) ...
  { t: T.l6, kind: 'info', remove: ['arD'], add: [stk('hg2', 'hourglass', [-4.2, 2.05, 7.27], .15, { delay: T.wait7 - T.l6 })],
    camera: { target: [-3.6, .95, 7.2], dist: 3.8, elev: .14, az: .4, zoom: 'in' } },
  //   ... then cuts it again (check)
  { t: T.cut7 - .1, kind: 'info', remove: ['hg2'], add: [stk('okCut', 'check', [-3.65, .5, 7.62], .16, { delay: T.again7 - T.cut7 + .25 })],
    camera: { target: [-3.6, .25, 7.4], dist: 2.0, elev: .12, az: .5, zoom: 'out' } },
  // 8 the best feed for the animals: cow and donkey eating at the heap; he walks in with a fresh armful; thumbs-up
  { t: T.l7, kind: 'info', remove: ['okCut'], add: [stk('thumb8', 'thumbs_up', [-5.3, 1.3, 3.5], .2, { delay: T.best8 - T.l7 })],
    camera: { target: [-5.3, .55, 3.6], dist: 4.2, elev: .16, az: 1.05, zoom: 'in' } },
  // 9 CTA: he tosses it on the heap and turns to us by the cow; thumbs-up; slow pull-out arcing round
  { t: T.l8, kind: 'info', remove: ['thumb8'], add: [stk('thumb9', 'thumbs_up', [-4.55, 2.1, 4.35], .28, { delay: T.like9 - T.l8 - .2 })],
    camera: { target: [-5.1, .85, 3.9], dist: 5.4, elev: .12, az: .75, spin: .5, zoom: 'out' } },
];

const cows = [T.l3 - .6, T.l7 + 2.75].filter(t => t > 0);
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه البرسيم بيطلع تاني بعد ما الفلاح يقصه',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 8, soilTint: [1.0, .97, .9], horizon: 'nile', cover: 'high',
    haze: .4, sunElev: 40, sunAz: 25, turbidity: 2.4, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .4, clouds: 12,
    // sound library (this plan only, levels at or under the global bed .03 / calls .05)
    sfxBed: 'wind', sfxBeds: [{ cat: 'forest', idx: 5, gain: .02 }],
    sfxCalls: [{ cat: 'cow', idx: 3, times: cows, gain: .05 }, { cat: 'donkey', idx: 0, times: [T.l5 - .55], dur: 1.8, gain: .04 }],
    sfxCuts: { times: cutTimes.filter(t => t >= 0), gain: .05 } },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
