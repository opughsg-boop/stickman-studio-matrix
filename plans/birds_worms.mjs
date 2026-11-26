// "ليه الطيور بتتجمع في الغيط مباشرة بعد المطر؟!" (voice-over 2026-11-26, 7 lines, 37.9 s, one take). Real-sky island of Delta silt farmland
// just after rain: a freshly hoed field (rows 30 cm apart) with flat puddles in the furrows, earth ridges on three sides, and the island's
// front face (z = 8) as the soil section. Every spoken line is shown, never written:
//  1 hook: rain falls on the field, ripples on the puddles, splashes on the mud; ring on the wet soil where the worms will come up
//  2 the soil section: water fills the pores from the top down (water drop), air bubbles rise and pop at the burrow openings (arrow up),
//    then earthworms come up to the surface one by one and lift their heads (point-down on the first worm)
//  3 the worms lie exposed on the mud (eyes) while the first sparrows land behind; one sparrow swoops down (arrow down), hop-turns,
//    pecks the worm, tugs it out of its burrow and holds it
//  4 the farmer leans on his hoe at the field edge and watches the flock settle on the field and the ridges (no bird touches another
//    or him); over his shoulder: he knows the soil has worms (check)
//  5 back to the section: a worm crawls into its burrow and digs down, pushing loose crumbs out along the tunnel; casts pile on top and
//    the dug soil turns lighter (sparkles)
//  6 two more tunnels are dug (wide), water poured at a tunnel mouth runs down the tunnel deep into the soil (arrow down), the camera follows
//  7 CTA: the farmer at the field with the birds calm on the mud and the ridges; thumbs-up; slow pull-out arcing round
// Step up vs the last render (peanut peg, score 70):
//  motion   - sparrows flap-bound in flight (9 Hz bursts with closed-wing glides), flare with legs forward and tail fanned, touchdown squash,
//             two-footed hops (sparrows hop, never walk), pecks that pivot on the planted feet; the worm moves along its own path like a
//             train with a peristaltic wave, emerges from the burrow, is tugged out in pulls and dangles from the beak with its tail on the mud
//  graphics - new procedural house sparrows (streaked back, male grey crown + chestnut nape + black bib, female pale brow, white wing
//             bar, two-segment open wings), segmented earthworms (annuli bump, clitellum, wet clearcoat), wet mud with glossy films and
//             clods, puddles clipped by the furrows with rain ripple rings, rain streaks with splash crowns, a soil section with pores
//             that fill, rising bubbles, lined tunnels, crumbs and a water column
//  realism  - real sizes: sparrow 15 cm (wingspan 23 cm), worms 12-18 cm and 6 mm thick, burrows 9 mm, furrows 30 cm apart and 2.5 cm
//             deep, ridges 15 cm, farmer 1.75 m with a 1.03 m hoe (palms on the handle top by the tomato-stake probe); rain at 7 m/s;
//             worms surface during and right after rain; tunnels to 40 cm with castings on top
//  sound    - this plan only: a rain bed (.03) that fades out as the rain stops, a sparrow bed (.02) from the flock's arrival, a few chirps
//             (.04) at the landings; all under the global caps
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6),
  after1: W(0, 5), water2: W(1, 2), air2: W(1, 5), worms2: W(1, 10), surf2: W(1, 12), easy3: W(2, 6), make3: W(2, 9), down3: W(2, 11), pick3: W(2, 12),
  know4: W(3, 7), ground4: W(3, 9), also5: W(4, 6), light5: W(4, 9), dig6: W(5, 3), make6: W(5, 5), deep6: W(5, 8), like7: W(6, 5) };

// ---------- deterministic random ----------
let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

// ---------- layout (metres). Island front face at z = 8; the camera works from +z ----------
const FC = [.4, 6.0], FW = 5.2, FD = 4.0;                          // field centre / size (x -2.2..3.0, z 4..8); ridges left, right, back
const field = obj('field', 'wet_field', [0, 0, 0], { pos: [FC[0], 0, FC[1]], w: FW, d: FD, ridges: 'lrb', furrow: .025, per: .3, ridgeH: .15, ridgeW: .4, level: .016,
  puddles: [[.25, 7.3, .085, .32], [.85, 7.15, .08, .4], [-.35, 6.85, .07, .5], [1.45, 6.55, .08, .45], [-.95, 6.25, .06, .4], [2.05, 5.8, .08, .5], [.55, 6.15, .07, .45], [-1.25, 5.4, .06, .5], [1.15, 5.15, .07, .4], [-.05, 5.0, .07, .45]],
  rainK: [[0, 1], [3.3, 1], [5.0, .35], [6.5, 0]], bubK: [[5.4, 0], [5.8, 1], [8.6, 1], [9.6, .2], [10.5, 0]], castK: [[T.light5 - .2, 0], [T.light5 + 1.2, 1]], casts: [[.645, 7.968], [.6, 7.95]] });

// worms (hole, yaw); W0 is the hero the sparrow takes
const WORMS = [
  { id: 'w0', hole: [.30, 7.92], yaw: Math.PI / 2, len: .15, t0: T.worms2 + .05, e: .62, seed: 1 },
  { id: 'w1', hole: [.12, 7.84], yaw: 1.2, len: .13, t0: T.worms2 + .55, e: .55, seed: 2 },
  { id: 'w2', hole: [.03, 7.95], yaw: -2.6, len: .12, t0: T.worms2 + 1.0, e: .5, seed: 3 },
  { id: 'w3', hole: [.22, 7.70], yaw: .4, len: .16, t0: T.worms2 + 1.4, e: .5, seed: 4 },
  { id: 'w4', hole: [-.12, 7.80], yaw: -1.4, len: .14, t0: T.worms2 + 1.75, e: .55, seed: 5 }];
const FIELD_WORMS = [[-.6, 7.3], [1.3, 7.35], [.9, 6.6], [-1.1, 6.6], [1.9, 6.9], [-.2, 6.3], [2.2, 6.1], [.2, 5.5]];
const worms = [...WORMS.map(w => obj(w.id, 'earthworm', [0, 0, 0], { hole: w.hole, yaw: w.yaw, len: w.len, r: .003, seed: w.seed,
    emergeK: [[w.t0, 0], [w.t0 + 1.5, w.e]], crawlK: w.id === 'w0' ? [[0, 0]] : [[w.t0 + 1.5, 0], [D, .05]],
    ...(w.id === 'w0' ? { grab: { by: 'sp0', t: T.pick3 + .03, out: T.pick3 + .95 } } : {}) })),
  ...FIELD_WORMS.map(([x, z], i) => obj('fw' + i, 'earthworm', [0, 0, 0], { hole: [x, z], yaw: i * 1.9, len: .12 + (i % 3) * .02, r: .0028, seed: 10 + i, emergeK: [[T.worms2 + i * .2, 0], [T.worms2 + 1.5 + i * .2, .6]], crawlK: [[0, 0], [D, .06]] }))];
field.params.holes = [...WORMS.map(w => w.hole), ...FIELD_WORMS, [.45, 7.86], [.5, 7.95], [-.05, 7.66], [.7, 7.8], [.36, 7.75]];

// ---------- the sparrows ----------
const DIR = (() => { const v = [.75, .85, -.5], l = Math.hypot(...v); return v.map(c => c / l); })();   // the flock comes in from the back right, 43 deg down
const YAW_IN = Math.atan2(-DIR[0], -DIR[2]), FLY = 5, SPD = 6.5;
const F = [-2.75, 6.4], FYAW = 1.15;                                  // farmer (leans on the hoe, faces the field)
// hero sparrow: lands beside W0's head, hop-turns to face it, pecks, tugs it out in pulls, holds it, then flies off with it
const HB = [.47, 7.917];
const hero = { link: 'sp0', male: true, hideAfter: T.l3 + 1.8, keys: [
  [T.make3 + .1, HB[0] + DIR[0] * FLY, DIR[1] * FLY, HB[1] + DIR[2] * FLY, 'idle'], [T.down3, HB[0], null, HB[1], 'look', YAW_IN],
  [T.down3 + .35, HB[0], null, HB[1], 'look', -Math.PI / 2], [T.pick3 - .25, HB[0], null, HB[1], 'peck', -Math.PI / 2], [T.pick3 + .03, HB[0], null, HB[1], 'tug', -Math.PI / 2],
  [T.pick3 + .98, HB[0], null, HB[1], 'hold', -Math.PI / 2], [T.l3 + .5, HB[0], null, HB[1], 'hold', -Math.PI / 2],
  [T.l3 + 1.8, HB[0] + DIR[0] * 7, DIR[1] * 7, HB[1] + DIR[2] * 7, 'hold']] };
// landing spots: Poisson-disc 0.34 m apart on the field, the ridge tops for the calm ones; none near the farmer, the hero spot or the section edge
const spots = [], far = (x, z, r) => spots.every(s => Math.hypot(s[0] - x, s[1] - z) >= r);
const near = [[.95, 7.62]];                                           // one pecks at the top of the section shots (line 5)
near.forEach(s => spots.push([...s, 'field']));
for (let x = -1.0; x <= 2.45; x += .4) spots.push([x, FC[1] - FD / 2 + .2, 'ridge']);         // back ridge
for (let z = 4.9; z <= 7.3; z += .4) spots.push([FC[0] + FW / 2 - .2, z, 'ridge']);            // right ridge
for (let k = 0; k < 4000 && spots.length < 66; k++) { const x = -1.65 + rnd() * 4.05, z = 4.65 + rnd() * 2.9;
  if (Math.hypot(x - .42, z - 7.85) < .55 || Math.hypot(x - F[0], z - F[1]) < 1.1) continue; if (far(x, z, .34)) spots.push([x, z, 'field']); }
// wave 1 (line 3): the 14 field spots nearest the worms; wave 2 (line 4): the rest
const order = spots.map((s, i) => ({ s, i, d: Math.hypot(s[0] - .4, s[1] - 7.4) })).filter(o => o.s[2] === 'field' && o.i > 0).sort((a, b) => a.d - b.d);
const wave1 = new Set(order.slice(0, 14).map(o => o.i));
const CALM = T.l6 - .3;
const sched = (s, tL, calm) => { const [x, z] = s, keys = [[tL - FLY / SPD, x + DIR[0] * FLY, DIR[1] * FLY, z + DIR[2] * FLY, 'idle'], [tL, x, null, z, 'look', YAW_IN]];
  let t = tL + .35 + rnd() * .5, yaw = YAW_IN, away = false;
  while (t < D + 1) { const c = rnd(), isCalm = calm || t > CALM;
    if (!isCalm && c < .5) { keys.push([t, ...(away ? [x + .035 * Math.sin(yaw), null, z + .035 * Math.cos(yaw)] : [x, null, z]), 'peck', yaw]); t += 1.4 + rnd() * 1.8; }
    else if (c < .68) { const ny = yaw + (rnd() - .5) * 1.6; keys.push([t, ...(away ? [x + .035 * Math.sin(yaw), null, z + .035 * Math.cos(yaw)] : [x, null, z]), 'look', ny]); yaw = ny; t += .8 + rnd(); }
    else if (c < .86 && !isCalm) { const hy = away ? Math.atan2(-Math.sin(yaw), -Math.cos(yaw)) : yaw; const hx = away ? x : x + .035 * Math.sin(yaw), hz = away ? z : z + .035 * Math.cos(yaw);
      keys.push([t, hx, null, hz, 'idle', hy]); away = !away; yaw = hy; t += .5 + rnd() * .6; }
    else { keys.push([t, ...(away ? [x + .035 * Math.sin(yaw), null, z + .035 * Math.cos(yaw)] : [x, null, z]), isCalm ? 'preen' : 'look', yaw]); t += 1.5 + rnd() * 1.5; } }
  return keys; };
let w2n = 0; const W2T = [T.l3 + .6, T.know4 + .5];
const flock = spots.map((s, i) => { const w1 = wave1.has(i), tL = s[0] === .95 ? T.l3 + .9 : w1 ? T.l2 + .9 + (order.findIndex(o => o.i === i) / 14) * 2.6 + rnd() * .2 : lerp(W2T[0], W2T[1], (w2n++) / 52) + rnd() * .15;
  return { male: i % 3 !== 0, keys: sched(s, tL, s[2] === 'ridge') }; });
function lerp(a, b, k) { return a + (b - a) * k; }
const birds = obj('birds', 'sparrows', [0, 0, 0], { birds: [hero, ...flock] });

// ---------- the soil section on the island face and the tunnel worm ----------
const ZS = 8.002, TUN0 = [[.62, 0], [.61, -.035], [.57, -.08], [.6, -.14], [.67, -.19], [.66, -.26], [.6, -.32], [.62, -.4]];
const tlen = TUN0.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - TUN0[i][0], p[1] - TUN0[i][1]), 0);
const PRE = [[.36, .007, 7.986], [.5, .007, 7.986], [.6, .006, 7.99], [.62, -.004, ZS + .007]];
const preLen = PRE.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - PRE[i][0], p[1] - PRE[i][1], p[2] - PRE[i][2]), 0);
const DIG = [T.l4 + .1, T.light5 + .9];
const section = obj('section', 'soil_section', [0, 0, 0], { x0: -.5, x1: 1.1, depth: .5, z: ZS, seed: 61,
  wetK: [[T.water2 - .2, 0], [T.air2 + .9, 1]], bubK: [[T.air2 - .1, 0], [T.air2 + .3, 1], [T.worms2 + 1.2, 1], [T.l2 - .2, .2], [T.l2 + .5, 0]],
  tunnels: [{ pts: TUN0, k: [[DIG[0], 0], [DIG[1], .985]] },
    { pts: [[.1, 0], [.13, -.05], [.08, -.11], [.12, -.19], [.2, -.24], [.25, -.31]], k: [[T.dig6 - .5, 0], [T.dig6 + 1.0, 1]] },
    { pts: [[.92, 0], [.9, -.06], [.97, -.12], [.92, -.2], [.84, -.26], [.86, -.33]], k: [[T.dig6 - .1, 0], [T.dig6 + 1.3, 1]] }],
  crumbK: [[T.also5, 0], [T.light5 + .9, 1]], lightK: [[T.light5, 0], [T.light5 + 1.0, 1]],
  pourT: 0, streamK: [[T.make6 - .15, 0], [T.make6 + .1, 1], [T.deep6 + .4, 1], [T.deep6 + .7, 0]], pourK: [[T.make6 + .15, 0], [T.deep6 + .6, 1]] });
const tworm = obj('tworm', 'earthworm', [0, 0, 0], { len: .15, r: .003, seed: 7, path: [...PRE, ...TUN0.slice(1).map(([x, y]) => [x, y, ZS + .007])],
  progK: [[T.l4, preLen - .005], [DIG[0], preLen], [DIG[1], preLen + tlen * .985]], showK: [[0, 0], [T.l4 - .05, 0], [T.l4, 1]] });

// ---------- rain ----------
const RAINK = [[0, 1], [3.3, 1], [5.0, .35], [6.5, 0]];
const rainWide = obj('rainW', 'rain_fall', [0, 0, 0], { pos: [.4, 0, 6.2], w: 6, d: 4.4, h: 4, count: 2600, r: .0018, len: .26, rainK: RAINK, seed: 5 });
const rainNear = obj('rainN', 'rain_fall', [0, 0, 0], { pos: [.3, 0, 7.6], w: 1.4, d: .9, h: 1.4, count: 650, r: .0011, len: .14, opacity: .5, rainK: RAINK, seed: 9 });

// ---------- the farmer ----------
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 4,
  track: [[0, F[0], 0, F[1], FYAW, 'stakePushLo'], [D + 1, F[0], 0, F[1], FYAW, 'stakePushLo']] } };
const hoe = obj('hoe', 'peanut_hoe', [F[0] + .48 * Math.sin(FYAW), 0, F[1] + .48 * Math.cos(FYAW)], { back: .14, len: 1.03, fallAz: FYAW });

// ---------- farm world ----------
const world = [];
[[-8.0, -6.5, 8.5, 1], [-5.6, -7.4, 9.5, 2], [6.2, -7.2, 9, 3], [8.4, -6.0, 8, 1]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.6, 6.4, .9, 'ph/shrub_02'], [4.4, 5.6, .8, 'ph/shrub_01'], [3.8, 3.0, .35, 'ph/rock_07'], [-4.0, 2.6, .5, 'ph/shrub_03']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

const W0H = [.395, .055, 7.917];                                      // above W0's head when it is out
const beats = [
  // 1 hook: rain on the field; ring on the wet soil where the worms will come up
  { t: 0, kind: 'info', add: [field, section, birds, ...worms, tworm, rainWide, rainNear, farmer, hoe, ...world, stk('ring1', 'circle_ring', [.3, .02, 7.88], .22, { delay: .2 })],
    camera: { target: [.3, .12, 7.15], dist: 2.3, elev: .3, az: .25, zoom: 'in' } },
  //   ... right after the rain: close on the puddles and the mud, ripples and splashes
  { t: T.after1 - .1, kind: 'info', remove: ['ring1'], add: [stk('ring1b', 'circle_ring', [.3, .01, 7.9], .1, { delay: .3 })],
    camera: { target: [.32, .02, 7.68], dist: .95, elev: .34, az: .4, zoom: 'in' } },
  // 2 the section: water fills the pores from the top down (water drop) ...
  { t: T.l1, kind: 'info', remove: ['ring1b'], add: [stk('drop2', 'water_drop', [.5, .07, 8.03], .05, { delay: T.water2 - T.l1 })],
    camera: { target: [.3, -.1, 8.0], dist: .78, elev: .06, az: .15, zoom: 'in' } },
  //   ... the air in the soil bubbles out (arrow up) ...
  { t: T.air2 - .1, kind: 'info', remove: ['drop2'], add: [stk('up2', 'arrow_up', [.12, -.06, 8.04], .05, { delay: .3 })],
    camera: { target: [.3, -.09, 8.0], dist: .56, elev: .03, az: -.12, zoom: 'in' } },
  //   ... and the worms come up to the surface one by one (point-down on the first)
  { t: T.worms2 - .1, kind: 'info', remove: ['up2'], add: [stk('pt2', 'point_down', [W0H[0] - .03, W0H[1] + .03, W0H[2]], .04, { delay: .7 })],
    camera: { target: [.2, .01, 7.86], dist: .5, elev: .42, az: .28, zoom: 'in' } },
  // 3 the worms lie exposed on the mud (eyes) while the first sparrows land behind them
  { t: T.l2, kind: 'info', remove: ['pt2'], add: [stk('eye3', 'eyes', [.2, .12, 7.86], .06, { delay: T.easy3 - T.l2 })],
    camera: { target: [.45, .06, 7.35], dist: 1.75, elev: .28, az: .35, zoom: 'out' } },
  //   ... one swoops down (arrow down) ...
  { t: T.make3 - .1, kind: 'info', remove: ['eye3'], add: [stk('dn3', 'arrow_down', [HB[0], .2, HB[1]], .05, { delay: .25 })],
    camera: { target: [.43, .04, 7.88], dist: .62, elev: .2, az: .45, zoom: 'in' } },
  //   ... pecks the worm and tugs it out of its burrow
  { t: T.pick3 - .2, kind: 'info', remove: ['dn3'],
    camera: { target: [.42, .03, 7.9], dist: .4, elev: .12, az: .62, zoom: 'in' } },
  // 4 the farmer at the field edge watches the flock settle on the field
  { t: T.l3, kind: 'info',
    camera: { target: [-.7, .5, 6.3], dist: 4.6, elev: .26, az: .38, zoom: 'out' } },
  //   ... over his shoulder: he knows the soil has worms (check)
  { t: T.know4 - .1, kind: 'info', add: [stk('ok4', 'check', [-1.6, 1.0, 6.9], .16, { delay: T.ground4 - T.know4 + .1 })],
    camera: { target: [-.7, .4, 6.6], dist: 4.2, elev: .22, az: -1.6, zoom: 'in' } },
  // 5 back to the section: a sparrow pecks above while a worm crawls into its burrow ...
  { t: T.l4, kind: 'info', remove: ['ok4'],
    camera: { target: [.58, -.08, 8.0], dist: .85, elev: .1, az: .1, zoom: 'in' } },
  //   ... it digs down, pushing loose crumbs out along the tunnel ...
  { t: T.also5 - .1, kind: 'info',
    camera: { target: [.64, -.16, 8.0], dist: .38, elev: .02, az: .15, zoom: 'in' } },
  //   ... casts pile on top and the dug soil turns lighter (sparkles)
  { t: T.light5 - .1, kind: 'info', add: [stk('spk5', 'sparkles', [.6, .03, 8.03], .05, { delay: .6 })],
    camera: { target: [.6, -.12, 8.0], dist: .72, elev: .14, az: .25, zoom: 'out' } },
  // 6 the strangest thing: more tunnels are dug (wide section) ...
  { t: T.l5, kind: 'info', remove: ['spk5'],
    camera: { target: [.45, -.18, 8.0], dist: 1.0, elev: .05, az: -.05, zoom: 'out' } },
  //   ... water poured at a tunnel mouth runs down the tunnel (arrow down) ...
  { t: T.make6 - .2, kind: 'info', add: [stk('dn6', 'arrow_down', [.7, -.14, 8.03], .045, { delay: .75 })],
    camera: { target: [.62, -.11, 8.0], dist: .62, elev: .12, az: .2, zoom: 'in' } },
  //   ... deep into the soil; the camera follows it down
  { t: T.deep6 - .1, kind: 'info',
    camera: { target: [.62, -.29, 8.0], dist: .62, elev: .04, az: .1, zoom: 'in' } },
  // 7 CTA: the farmer at the field, the birds calm on the mud and the ridges; thumbs-up; slow pull-out arcing round
  { t: T.l6, kind: 'info', remove: ['dn6'], add: [stk('thumb7', 'thumbs_up', [F[0] + .45, 2.0, F[1] + .3], .26, { delay: T.like7 - T.l6 - .2 })],
    camera: { target: [-1.5, .8, 6.5], dist: 3.3, elev: .18, az: .75, spin: .45, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الطيور بتتجمع في الغيط بعد المطر',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 8, soilTint: [.92, .88, .82], horizon: 'nile', cover: false,
    haze: .45, sunElev: 40, sunAz: 25, turbidity: 2.8, water: '#7f9a8f', waves: 0, foam: false, birds: 0, motes: .3, clouds: 18,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBeds: [{ cat: 'rain', idx: 3, gain: .03, end: 7.0, fade: 1.5 }, { cat: 'bird', idx: 0, gain: .02, start: T.l2 + .5, fade: 1.5 }],
    sfxCalls: [{ cat: 'bird', idx: 2, gain: .04, times: [T.l2 + 1.4, T.down3 - .1, T.l3 + 1.2, T.know4] }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats, ' + (flock.length + 1) + ' sparrows');
