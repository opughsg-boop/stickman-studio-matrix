// "لو اشتريت دجاج تسمين، كده بقى عندك مشروع دجاج على الورق..." (voice-over 2026-11-28, 8 lines, 44.71 s, one take).
// A small Egyptian village broiler house in bright late-morning sun: the hens_winter mud-brick coop (lime-washed inside, palm-trunk roof,
// open front as the cutaway) made 2.8 x 4 m, wood-shavings litter inside, a crowded pen at the front and a spacious pen at the back.
// New renderer pack (renderer/scene.js "Broiler pack"): `br_flock` (white Ross/Cobb-type broilers, 0.40-0.47 m, packed by a two-circle
// relaxation, stride-synced stroll, peck / tired poses, growth), `br_pen` (timber + chicken-wire partition, swinging gate), `br_litter`
// (shavings, caked wet dirt, fresh layer), `br_trough` (galvanised feed / water trough, fill level), `br_sack` (25 kg woven feed sack,
// no print), `br_heap` (feed heaps: pellets, soy meal, maize, premix; dirty heap), `br_scoop` (galvanised scoop in a UAL palm, pellet
// stream), `br_vent` (plank shutter on the window, fresh-air wisps), `br_haze` (stale haze, stink lines). The UAL Farmer pours, sweeps,
// refills water and talks; pg_broom and pg_jug from the pigeon pack. No words on screen; every line shows its object or action:
//  1 hook: close on the crowded pen, broilers packed body to body, camera moving in; the whole house ("a project"); the feed sack and
//    trough (point down); the spacious pen (ring); back to the crowd (warning), one bird sinks down sick (fever face)
//  2 both pens in one frame: cross on the crowded one; its birds sit down tired (sleep face); the spacious pen, birds strolling (check)
//  3 the window shutter swings shut and the fresh-air wisps stop (cross); stale haze and stink lines over the crowd (sick face);
//    microbes pop up from bird to bird while the litter cakes dark and wet
//  4 the Farmer holds a full scoop by the open feed sack (point down); soy meal, maize and premix heaps (herb, wheat, pill);
//    he crouches and pours pellets into the trough, it fills (check); the birds come and eat (yum)
//  5 wrong: a second Farmer dumps a whole scoop on the bare floor, a heap mixed with dirt and droppings (cross); two chicks peck at it
//    (question, hourglass for the stages)
//  6 right: the crowded pen's gate swings open and the birds spread out (arrow, check); he sweeps the dirty heap away and fresh shavings
//    cover the floor (cycle arrows); he crouches and refills the water trough from a jug (drop, eyes, check)
//  7 the whole house, healthy birds strolling and growing (hourglass); close on the spread flock walking (thumbs up, sparkles)
//  8 CTA: the Farmer turns to us and talks; thumbs up; slow pull-out
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(23);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, o = {}) => ({ id, type, pos, params, anim: o.anim || 'none', dust: false, delay: o.delay || 0, ...(o.rotY != null ? { rotY: o.rotY } : {}) });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  proj1: W(0, 7), paper1: W(0, 10), feed1: W(0, 14), wide1: W(0, 16), if1: W(0, 18), dens1: W(0, 20), sick1: W(0, 21),
  narrow2: W(1, 5), tired2: W(1, 6), bec2: W(1, 10), space2: W(1, 14), move2: W(1, 15),
  air3: W(2, 3), heavy3: W(2, 4), smell3: W(2, 5), mic3: W(2, 7),
  bal4: W(3, 1), prot4: W(3, 5), energy4: W(3, 6), vit4: W(3, 7), right4: W(3, 8), notr4: W(3, 10),
  wrong5: W(4, 0), put5: W(4, 2), know5: W(4, 8), stage5: W(4, 13),
  right6: W(5, 0), split6: W(5, 2), space6: W(5, 5), litter6: W(5, 7), period6: W(5, 9), watch6: W(5, 11), water6: W(5, 12), food6: W(5, 13), day6: W(5, 15),
  grow7: W(6, 4), loss7: W(6, 6), profit7: W(6, 8), like8: W(7, 5) };

// ---------- layout (metres). House: interior x +-1.15, back wall inner face z -3.95, open front at z -.2; camera side +z ----------
const HW = 2.8, HT = .25, ZB = -4.2, ZF = -.2, XI = HW / 2 - HT;
const P1 = [-1.05, -.15, -1.9, -1.0];                          // crowded pen 0.9 x 0.9 m: 12 birds = 0.068 m2 each (packed body to body)
const P2 = [-1.05, 1.05, -3.85, -2.75];                        // spacious pen 2.1 x 1.1 m: 18 birds = 0.128 m2 each (Egyptian guide ~0.1)
const SPREAD = [-1.05, 1.0, -1.85, -1.08];                     // line 6: the crowded birds spread over 2 m2 (0.17 m2 each)
const TR1 = [.45, -2.88], TR1L = .9;                           // feed trough inside the spacious pen, along its open front
const TR2 = [-.45, -.75], TR2L = .6;                           // water trough at the front, filled from the jug in line 6
const SACK = [-.2, -2.28], F1 = [.6, -2.28];                  // farmer 1 between the pens, facing -x (profile to the camera), sack in front of him
const F2 = [-.6, -.25];                                         // farmer 2 at the front edge, facing +x (profile), lines 5-8
const HEAP = [.25, -.42];                                         // the wrong-way heap on the floor in front of farmer 2
const VENT = [-XI, 1.375, -1.475];                             // centre of the left-wall window (vent) over the crowded pen
const H0 = .4, heightK = [[0, H0], [T.grow7 - .1, H0], [T.grow7 + 1.3, .47]];   // ~5-6 week birds grow to market size (time-lapse)

// the renderer's packing (renderer/scene.js brLayout), repeated here to put stickers on real birds
const rng = seed => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function layout(n, A, seed, o = {}) { const r = rng(seed), m = o.margin ?? .17, x0 = A[0] + m, x1 = A[1] - m, z0 = A[2] + m, z1 = A[3] - m, Rr = o.r ?? .1, HL = .07, av = o.avoid || [];
  const P = Array.from({ length: n }, () => ({ x: lerp(x0, x1, r()), z: lerp(z0, z1, r()), y: (o.yaw ?? 0) + (r() - .5) * (o.spread ?? 3) }));
  const circ = q => [[q.x + Math.sin(q.y) * HL, q.z + Math.cos(q.y) * HL], [q.x - Math.sin(q.y) * HL, q.z - Math.cos(q.y) * HL]];
  for (let it = 0; it < 320; it++) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = P[i], b = P[j]; for (const ca of circ(a)) for (const cb of circ(b)) {
      const dx = cb[0] - ca[0], dz = cb[1] - ca[1], d = Math.hypot(dx, dz) || 1e-4; if (d < 2 * Rr) { const k = (2 * Rr - d) / d * .25; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; } } }
    for (const q of P) { for (const [ax0, ax1, az0, az1] of av) { const m2 = .17; if (q.x > ax0 - m2 && q.x < ax1 + m2 && q.z > az0 - m2 && q.z < az1 + m2) {
        const d = [q.x - (ax0 - m2), ax1 + m2 - q.x, q.z - (az0 - m2), az1 + m2 - q.z], k = d.indexOf(Math.min(...d)); if (k === 0) q.x = ax0 - m2; else if (k === 1) q.x = ax1 + m2; else if (k === 2) q.z = az0 - m2; else q.z = az1 + m2; } }
      q.x = clamp(q.x, x0, x1); q.z = clamp(q.z, z0, z1); } }
  return P; }
const TR1R = [TR1[0] - TR1L / 2, TR1[0] + TR1L / 2, TR1[1] - .06, TR1[1] + .06];
const L1 = layout(12, P1, 911, { r: .095, margin: .2 }), L2 = layout(18, P2, 913, { avoid: [TR1R] });
const SICK = 4, sb = L1[SICK];                                  // the bird that sinks down sick in line 1 (front-middle of the crowd)
const bAt = (L, i, y) => [L[i].x, y, L[i].z];

// ---------- the house world ----------
const world = [
  obj('yard', 'coop_floor', [0, 0, 1.4], { w: 4.6, d: 3.0, yard: true }),
  obj('house', 'hen_coop', [0, 0, 0], { w: HW, t: HT, h: 2.2, zb: ZB, zf: ZF, win: [-1.75, -1.2, 1.15, 1.6], door: [-2.65, -1.95, 0, 1.9], dish: [-1.95, .5] }),
  obj('litBase', 'br_litter', [0, 0, (ZB + HT + ZF) / 2], { w: 2 * XI, d: ZF - ZB - HT, seed: 883 }),
  obj('litP1', 'br_litter', [(P1[0] + P1[1]) / 2, 0, (P1[2] + P1[3]) / 2], { w: .9, d: .9, base: false, seed: 885, dirtK: [[0, .2], [T.mic3 - .1, .2], [T.mic3 + 1.2, 1], [T.litter6 + .5, 1], [T.litter6 + 1.5, 0]] }),
  obj('litFront', 'br_litter', [0, 0, -.6], { w: 2 * XI, d: .8, base: false, seed: 889, dirtK: [[0, 0], [T.put5, 0], [T.put5 + 1.0, .85]], freshK: [[0, 0], [T.litter6 + .2, 0], [T.litter6 + 1.6, 1]] }),
  obj('vent', 'br_vent', VENT, { w: .55, h: .45, shutK: [[0, 0], [T.air3 - .05, 0], [T.heavy3 + .2, 1], [T.right6, 1], [T.right6 + .8, 0]], airK: [[0, 1]] }),
  obj('pen1', 'br_pen', [0, 0, 0], { area: P1, sides: 'nswe', gate: 'e', gateK: [[0, 0], [T.split6 - .1, 0], [T.split6 + .6, 1]] }),
  obj('pen2n', 'br_pen', [0, 0, 0], { area: [P2[0] + .13, P2[1] - .13, P2[2], P2[3]], sides: 'n' }), obj('pen2w', 'br_pen', [0, 0, 0], { area: P2, sides: 'w' }), obj('pen2e', 'br_pen', [0, 0, 0], { area: [P2[0], P2[1] + .05, P2[2], P2[3]], sides: 'e' }),
  obj('tr1', 'br_trough', [TR1[0], 0, TR1[1]], { len: TR1L, link: 'tr1', fillK: [[0, .2], [T.right4 + .75, .2], [T.right4 + 1.7, 1]] }),
  obj('tr2', 'br_trough', [TR2[0], 0, TR2[1]], { len: TR2L, water: true, link: 'tr2', aim: [.1, 0], fillK: [[0, .15], [T.water6 + .2, .15], [T.water6 + .8, .9]] }),
  obj('sack', 'br_sack', [SACK[0], 0, SACK[1]], { w: .42 }),
  obj('soy', 'br_heap', [-1.03, 0, -2.35], { kind: 'soy', r: .07, h: .04, n: 320, seed: 921 }),
  obj('maize', 'br_heap', [-.81, 0, -2.35], { kind: 'maize', r: .07, h: .045, n: 300, seed: 923 }),
  obj('premix', 'br_heap', [-.6, 0, -2.35], { kind: 'premix', r: .06, h: .03, n: 360, seed: 925 }),
  obj('haze', 'br_haze', [0, 0, 0], { area: [P1[0] + .05, P1[1] - .05, P1[2] + .05, P1[3] - .05], y0: .3, y1: .95, n: 12,
    smellK: [[0, 0], [T.smell3 - .2, 0], [T.smell3 + .6, 1], [T.split6, 1], [T.space6 + .3, 0]] }),
];
// two palms far out to the sides (lesson: near palms read as bare trunks), shrubs beside the house, grass clumps in the yard (clear of the front corridor)
[[-7.5, -6.0, 9.5, 1], [7.8, -5.2, 9, 2]].forEach(([x, z, h, k], i) => world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.9, params: { sway: .01, ph: i } })));
[[-2.3, -3.2, .9, 'nature_pack/Bush_1'], [2.4, -3.6, 1.0, 'nature_pack/Bush_2'], [-2.4, .2, .6, 'ph/shrub_02'], [2.6, -.6, .55, 'ph/shrub_01'], [-3.4, 2.6, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
for (let i = 0, n = 0; i < 500 && n < 34; i++) { const x = -6.2 + R() * 12.4, z = -5.5 + R() * 11.5;
  if (x > -2.0 && x < 2.0 && z > -4.6 && z < .6) continue; if (Math.abs(x) < 2.6 && z > .4) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], x, z, .3 + R() * .25, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }

// ---------- the birds ----------
const flock1 = obj('flock1', 'br_flock', [0, 0, 0], { n: 12, area: P1, seed: 911, r: .095, margin: .2, area2: SPREAD, gateX: P1[1], link: 'flock1', heightK,
  spreadK: [[0, 0], [T.split6 + .3, 0], [T.space6 + 1.0, 1]], wanderK: [[0, .015], [T.split6, .015], [T.space6 + 1.2, .1], [T.l6, .14]],
  modeK: [[0, 'idle'], [T.tired2, 'tired'], [T.split6 - .2, 'idle'], [T.watch6, 'peck'], [T.l6 + .4, 'idle']], sick: [SICK], sickK: [[0, 0], [T.sick1 - .1, 1], [T.tired2 + .5, 1], [T.tired2 + .55, 0]] });   // then the whole crowd is tired
const flock2 = obj('flock2', 'br_flock', [0, 0, 0], { n: 18, area: P2, seed: 913, margin: .17, avoid: [TR1R], eatAt: TR1, link: 'flock2', heightK,
  wanderK: [[0, .08], [T.bec2, .14], [T.right4 + .4, .03], [T.l5, .12]], modeK: [[0, 'idle'], [T.right4 + 1.0, 'peck'], [T.l5 + .3, 'idle']] });
const chick1 = { id: 'chick1', type: 'chick', pos: [0, 0, 0], anim: 'none', dust: false, params: { height: .12, track: [[T.know5 - .1, .85, -.3, 'idle'], [T.know5 + .7, .6, -.32, 'peck'], [T.l5, .6, -.32, 'peck']] } };
const chick2 = { id: 'chick2', type: 'chick', pos: [0, 0, 0], anim: 'none', dust: false, params: { height: .11, track: [[T.know5, .86, -.7, 'idle'], [T.know5 + .8, .56, -.6, 'peck'], [T.l5, .56, -.6, 'peck']] } };

// ---------- the Farmers (UAL clips on the modular Farmer; palms published for the scoop, broom and jug) ----------
const farmer1 = obj('farmer1', 'glb', [F1[0], 0, F1[1]], { model: 'modular_men/Farmer', height: 1.75, link: 'farmer1', handoff: true, ual: ['Idle_Loop', 'Crouch_Idle_Loop'] }, { rotY: -PI / 2 });
const scoop1 = obj('scoop1', 'br_scoop', [0, 0, 0], { carryBy: 'farmer1', hand: 'R', show: [T.l3, T.l4], aim: [TR1[0], .1, TR1[1]],
  pourK: [[T.right4 + .5, 0], [T.right4 + .9, 1], [T.right4 + 1.5, 1], [T.right4 + 1.85, 0]], fullK: [[0, 1], [T.right4 + .7, 1], [T.right4 + 1.6, .05]] });
// R wrist over the trough's front edge, in the Farmer's own frame (he faces -x: his right is world -z = local -x)
const REACH4 = { hand: 'R', at: [-.37, .45, .25], t: [.2, .6, 1.8, 2.05], lean: .3, drop: 0, lift: .04 };
const farmer2 = obj('farmer2', 'glb', [F2[0], 0, F2[1]], { model: 'modular_men/Farmer', height: 1.75, link: 'farmer2', handoff: true, ual: ['Idle_Loop', 'Idle_Talking_Loop', 'Push_Loop', 'Crouch_Idle_Loop'] }, { rotY: PI / 2 });
const scoop2 = obj('scoop2', 'br_scoop', [0, 0, 0], { carryBy: 'farmer2', hand: 'R', show: [T.l4, T.know5 + .1], aim: [HEAP[0], .06, HEAP[1]], tilt: 2.2,
  pourK: [[T.put5 - .4, 0], [T.put5, 1], [T.put5 + .65, 1], [T.put5 + .95, 0]], fullK: [[0, 1], [T.put5 - .2, 1], [T.put5 + .65, 0]] });
// he faces +x: his right is world +z = local -x; the scoop held out at chest height over the heap spot
const REACH5 = { hand: 'R', at: [.17, .95, .6], t: [.1, .5, 2.1, 2.3], lean: .15, drop: 0, lift: .03 };
const heap = obj('heap', 'br_heap', [HEAP[0], 0, HEAP[1]], { kind: 'pellet', r: .15, h: .07, n: 560, dirt: true, seed: 927, growK: [[0, 0], [T.put5 + .1, 0], [T.put5 + 1.0, 1]], sizeK: [[0, 1], [T.litter6 + .2, 1], [T.litter6 + 1.1, 0]] });
const broom = obj('broom', 'pg_broom', [0, 0, 0], { carryBy: 'farmer2', show: [T.litter6 - .05, T.watch6], fwd: .8, stroke: .15, period: 1.15, sweepK: [[T.litter6, 0], [T.litter6 + .4, 1]] });
const jug = obj('jug', 'pg_jug', [0, 0, 0], { carryBy: 'farmer2', hand: 'L', target: 'tr2', show: [T.watch6, T.l6], pourK: [[T.water6 + .05, 0], [T.water6 + .3, 1], [T.water6 + .75, 1], [T.water6 + .95, 0]] });
// L wrist over the water trough (he faces +x: his left is world -z = local +x)
const REACH6 = { hand: 'L', at: [.3, .5, .2], t: [.2, .6, 1.4, 1.75], lean: .3, drop: 0, lift: .04 };

const beats = [
  // 1 hook: close on the crowded pen from the first frame, broilers packed body to body; the camera moves in
  { t: 0, add: [...world, flock1, flock2], camera: { target: [-.6, .18, -1.45], dist: 1.4, elev: .5, az: .25, zoom: 'in' } },
  //   ... "a chicken project": the whole house, wide (thinking face over the roof: "on paper")
  { t: T.proj1 - .1, add: [stk('th1', 'face_thinking', [.85, 2.75, -.3], .3, { delay: T.paper1 - T.proj1 + .2 })], camera: { target: [0, 1.0, -2.0], dist: 7.5, elev: .22, az: .2, zoom: 'out' } },
  //   ... balanced feed: the open feed sack and the trough (point down)
  { t: T.feed1 - .1, remove: ['th1'], add: [stk('pt1', 'point_down', [SACK[0], 1.0, SACK[1]], .12, { delay: .35 })], camera: { target: [.35, .35, -2.6], dist: 1.6, elev: .32, az: .3, zoom: 'in' } },
  //   ... and a wide place: the spacious pen (ring)
  { t: T.wide1 - .1, remove: ['pt1'], add: [stk('rg1', 'circle_ring', [0, .3, -3.3], .95, { delay: .3 })], camera: { target: [0, .25, -3.3], dist: 2.8, elev: .55, az: -.1, zoom: 'out' } },
  //   ... if the density rises it falls sick fast: back to the crowd (warning), one bird sinks down (fever face)
  { t: T.if1 - .1, remove: ['rg1'], add: [stk('wn1', 'warning', [-.6, .7, -1.45], .1, { delay: T.dens1 - T.if1 + .2 }), stk('fv1', 'face_fever', bAt(L1, SICK, .5), .07, { delay: T.sick1 - T.if1 + .3 })],
    camera: { target: [-.6, .2, -1.45], dist: 1.7, elev: .4, az: -.3, zoom: 'in' } },
  // 2 a narrow place: both pens in one frame, cross on the crowded one
  { t: T.l1, remove: ['wn1', 'fv1'], add: [stk('x2', 'cross', [-.6, .8, -1.45], .14, { delay: T.narrow2 - T.l1 })], camera: { target: [0, .25, -2.4], dist: 5.6, elev: .38, az: 0, zoom: 'out' } },
  //   ... they tire before they grow: the crowded birds sit down (sleep face)
  { t: T.tired2 - .05, remove: ['x2'], add: [stk('zz2', 'face_sleep', [-.75, .55, -1.4], .08, { delay: .3 })], camera: { target: [-.6, .15, -1.45], dist: 1.25, elev: .75, az: .35, zoom: 'in' } },
  //   ... every bird needs room to move: the spacious pen, birds strolling (check)
  { t: T.bec2 - .1, remove: ['zz2'], add: [stk('ok2', 'check', [.3, .72, -3.2], .13, { delay: T.space2 - T.bec2 + .1 })], camera: { target: [0, .2, -3.2], dist: 1.9, elev: .4, az: -.5, zoom: 'out' } },
  // 3 the air gets heavy: the window shutter swings shut, the wisps stop (cross)
  { t: T.l2, remove: ['ok2'], add: [stk('x3', 'cross', [-1.0, 1.78, -1.45], .12, { delay: T.heavy3 - T.l2 + .5 })], camera: { target: [-1.0, 1.1, -1.45], dist: 2.2, elev: .1, az: .75, zoom: 'in' } },
  //   ... the smell stays: stale haze and stink lines over the crowd (sick face)
  { t: T.smell3 - .1, remove: ['x3'], add: [stk('sk3', 'face_sick', bAt(L1, 1, .55), .07, { delay: .7 })], camera: { target: [-.6, .35, -1.45], dist: 1.8, elev: .3, az: -.2, zoom: 'out' } },
  //   ... microbes spread fast between the birds, the litter cakes dark and wet
  { t: T.mic3 - .1, remove: ['sk3'], add: [0, 3, 6, 9, 11].map((i, k) => stk('mc3' + k, 'microbe', bAt(L1, i, .4), .05, { delay: .25 + k * .32 })),
    camera: { target: [-.6, .2, -1.45], dist: 1.2, elev: .62, az: .1, zoom: 'in' } },
  // 4 balanced feed: the Farmer with a full scoop by the open sack (point down)
  { t: T.l3, remove: ['mc30', 'mc31', 'mc32', 'mc33', 'mc34'], add: [farmer1, scoop1, stk('pt4', 'point_down', [SACK[0], 1.0, SACK[1]], .1, { delay: T.bal4 - T.l3 + .2 })],
    modes: { farmer1: { ual: 'Idle_Loop', face: 0 } }, camera: { target: [.5, .6, -2.4], dist: 2.6, elev: .18, az: .1, zoom: 'out' } },
  //   ... protein, energy and vitamins: soy meal (herb), maize (wheat) and premix (pill)
  { t: T.prot4 - .1, remove: ['pt4'], modes: { farmer1: { ual: 'Idle_Loop', face: 0 } }, add: [stk('pr4', 'herb', [-1.03, .2, -2.35], .07, { delay: .2 }), stk('en4', 'wheat', [-.81, .21, -2.35], .07, { delay: T.energy4 - T.prot4 + .1 }),
    stk('vt4', 'pill', [-.6, .19, -2.35], .07, { delay: T.vit4 - T.prot4 + .1 })], camera: { target: [-.81, .06, -2.35], dist: 1.0, elev: .55, az: 1.0, zoom: 'in' } },
  //   ... in the right amount: he crouches and pours the pellets into the trough, it fills (check)
  { t: T.right4, remove: ['pr4', 'en4', 'vt4'], modes: { farmer1: { ual: 'Crouch_Idle_Loop', reach: REACH4, face: 0 } }, add: [stk('ok4', 'check', [TR1[0] + .2, .6, TR1[1]], .1, { delay: .9 })],
    camera: { target: [.4, .4, -2.75], dist: 2.2, elev: .3, az: .3, zoom: 'out' } },
  //   ... not random food: the birds come and eat from the trough (yum)
  { t: T.notr4, remove: ['ok4'], add: [stk('ym4', 'face_yum', [TR1[0], .45, TR1[1] - .2], .07, { delay: .45 })], camera: { target: [.45, .14, -2.95], dist: .95, elev: .7, az: 2.8, zoom: 'in' } },
  // 5 wrong: a heap dumped on the bare floor, mixed with dirt (cross)
  { t: T.l4, remove: ['ym4', 'farmer1', 'scoop1'], add: [farmer2, scoop2, heap, stk('x5', 'cross', [HEAP[0], .42, HEAP[1]], .1, { delay: T.put5 - T.l4 + 1.0 })],
    modes: { farmer2: { ual: 'Idle_Loop', reach: REACH5, face: 0 } }, camera: { target: [-.1, .55, -.45], dist: 2.4, elev: .22, az: .15, zoom: 'out' } },
  //   ... without knowing what they need at each stage: chicks peck at the dirty heap (question, hourglass)
  { t: T.know5 - .1, remove: ['x5'], modes: { farmer2: { ual: 'Idle_Loop', face: 0 } }, add: [chick1, chick2, stk('q5', 'question', [HEAP[0], .32, HEAP[1]], .07, { delay: .5 }), stk('hg5', 'hourglass', [.6, .28, -.45], .06, { delay: T.stage5 - T.know5 + .1 })],
    camera: { target: [.4, .06, -.45], dist: 1.0, elev: .38, az: .3, zoom: 'in' } },
  // 6 right: the crowded pen's gate swings open and the birds spread over enough space (arrow, check)
  { t: T.l5, remove: ['q5', 'hg5', 'chick1', 'chick2', 'scoop2'], modes: { farmer2: { ual: 'Idle_Talking_Loop', face: 0 } },
    add: [stk('ar6', 'arrow_right', [P1[1] + .1, .75, -1.45], .1, { delay: T.split6 - T.l5 + .3 }), stk('ok6a', 'check', [.45, .75, -1.45], .12, { delay: T.space6 - T.l5 + .2 })],
    camera: { target: [0, .25, -1.45], dist: 4.2, elev: .5, az: .05, zoom: 'out' } },
  //   ... change the litter every while: he sweeps the dirty heap away, fresh shavings cover the floor (cycle arrows)
  { t: T.litter6 - .1, remove: ['ar6', 'ok6a'], modes: { farmer2: { ual: 'Push_Loop', face: 0 } }, add: [broom, stk('cy6', 'arrows_cycle', [.25, .55, -.45], .1, { delay: T.period6 - T.litter6 + .1 })],
    camera: { target: [.1, .35, -.45], dist: 2.4, elev: .4, az: .35, zoom: 'in' } },
  //   ... watch the water and the food every day: he crouches and refills the water trough from the jug (drop, eyes, check)
  { t: T.watch6, remove: ['cy6', 'broom'], modes: { farmer2: { ual: 'Crouch_Idle_Loop', reach: REACH6, face: 0 } }, add: [jug, stk('dr6', 'water_drop', [TR2[0], .35, TR2[1]], .06, { delay: T.water6 - T.watch6 + .1 }),
    stk('ey6', 'eyes', [.1, .62, -1.35], .08, { delay: T.food6 - T.watch6 }), stk('ok6b', 'check', [-.05, .85, -1.15], .1, { delay: T.day6 - T.watch6 })],
    camera: { target: [-.4, .3, -.85], dist: 1.7, elev: .3, az: .45, zoom: 'out' } },
  // 7 treated right they grow fast: the whole house, healthy birds strolling and growing (hourglass)
  { t: T.l6, remove: ['dr6', 'ey6', 'ok6b', 'jug'], modes: { farmer2: { ual: 'Idle_Loop', face: 0 } }, add: [stk('hg7', 'hourglass', [.65, 1.0, -1.6], .14, { delay: T.grow7 - T.l6 + .1 })],
    camera: { target: [0, .3, -2.3], dist: 5.6, elev: .36, az: -.08, zoom: 'in' } },
  //   ... losses drop and the project pays: close on the spread flock walking (thumbs up, sparkles)
  { t: T.loss7 - .1, remove: ['hg7'], add: [stk('tu7', 'thumbs_up', [.5, .62, -1.45], .1, { delay: T.profit7 - T.loss7 }), stk('sp7', 'sparkles', [.15, .5, -1.5], .09, { delay: T.profit7 - T.loss7 + .7 })],
    camera: { target: [.4, .2, -1.45], dist: 1.6, elev: .3, az: -.2, zoom: 'out' } },
  // 8 CTA: the Farmer turns to us and talks; thumbs up; slow pull-out
  { t: T.l7, remove: ['tu7', 'sp7'], modes: { farmer2: { ual: 'Idle_Talking_Loop', face: -PI / 2, faceT: .9 } }, add: [stk('tu8', 'thumbs_up', [F2[0] + .38, 1.62, F2[1] + .05], .13, { delay: T.like8 - T.l7 })],
    camera: { target: [F2[0], 1.2, F2[1]], dist: 2.4, elev: .1, az: .1, spin: .25, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'مشروع دجاج التسمين',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 14, d: 13, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [1.0, .94, .86], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 52, sunAz: 30, turbidity: 2.4, water: '#7f9a8f', waves: 0, foam: false, birds: 2, birdModel: 'Stork', motes: .5, clouds: 10,
    sfxBed: 'chicken', sfxBeds: [{ cat: 'wind', idx: 0, gain: .015 }], sfxCalls: [{ cat: 'water', idx: 0, times: [T.water6 + .3], dur: 1.0, gain: .03 }] },
  // private frames (renderer/clearance.js): a flock is one object (many birds), its frame is the box round all of them, so it is "held" by the
  // pen and trough it lives in (the flock builder keeps every bird inside its area). Tools are held by their Farmer; the scoop rests on the
  // sack before the pick-up and pours into the trough / onto the heap; the broom sweeps the heap; the jug pours into the water trough.
  // World pieces (house, yard, litter, plants) and sprite effects are not solid frames.
  checks: { clearance: { margin: .03, samples: 5, skip: ['yard', 'house', 'litBase', 'litP1', 'litFront', 'haze', 'vent', ...world.filter(o => /^(palm|bush|gr)\d/.test(o.id)).map(o => o.id)],
    pairs: [{ a: 'flock1', b: 'pen1', kind: 'held' }, { a: 'flock2', b: 'pen2n', kind: 'held' }, { a: 'flock2', b: 'pen2w', kind: 'held' }, { a: 'flock2', b: 'pen2e', kind: 'held' }, { a: 'flock2', b: 'tr1', kind: 'held' },
      { a: 'scoop1', b: 'farmer1', kind: 'held' }, { a: 'farmer1', b: 'flock2', kind: 'held', beats: [13, 14] }, { a: 'scoop1', b: 'flock2', kind: 'held', beats: [13, 14] }, { a: 'farmer1', b: 'tr1', kind: 'held', beats: [13, 14] }, { a: 'scoop1', b: 'sack', kind: 'held' }, { a: 'scoop1', b: 'tr1', kind: 'held' }, { a: 'scoop2', b: 'farmer2', kind: 'held' }, { a: 'scoop2', b: 'heap', kind: 'held' },
      { a: 'broom', b: 'farmer2', kind: 'held' }, { a: 'broom', b: 'heap', kind: 'held' }, { a: 'jug', b: 'farmer2', kind: 'held' }, { a: 'jug', b: 'tr2', kind: 'held' }] } },
  style: { camEase: .6, captionY: .78, exposure: .72, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', kind: 'info', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
