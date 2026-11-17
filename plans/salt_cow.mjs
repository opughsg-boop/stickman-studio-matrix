// "ليه البقرة بتلحس حجر مالح كل يوم؟" (voice-over 2026-11-17, 7 lines, 29.4 s). Diorama on the real-sky island: a village cattle pen
// (mud-brick back wall with white salt crust, timber fences, trampled floor), a pasture in front, palms behind.
// Every spoken line is shown by objects and actions, never by words:
//  1 cow A walks up to a pink rock-salt block on a low stand and licks it (tongue on the block), circle ring around the block
//  2 close on the licking + salt crystals sparkling by the stand -> cow B grazing on the pasture with a cross over the grass-only patch
//  3 the farmer walks in carrying a new block between his palms, kneels and sets it on the stand (palms on the block), point-down sticker
//  4 cow B walks in and licks it: macro of the tongue, salt flakes falling with every lick, a hollow wearing into the block
//  5 cow B drinks at the water trough (ripples, water-drop sticker), then eats the hay pile (thumbs-up)
//  6 "the strangest thing?": a curious arc around cow A as its old block wears to a remnant; it turns and licks the salty wall (wet patch, flakes)
//  7 CTA: cow B calm by the hay and its block, thumbs-up, slow orbit pull-out over the whole pen
// Step up vs the last salt_cow render (score 70: too bright, too little motion, cuts too slow):
//  motion   - library cows on the distance-synced walker (no hoof sliding, eased stops with a settle bounce), neck reach to the lick point,
//             a tongue in a steady lick rhythm, flakes on every lick, a farmer on the bone rig (walk, kneel, set down, stand) carrying the block
//  graphics - rock-salt material (crystalline pale pink, veins, clearcoat, glints), mud-brick wall with salt efflorescence, concrete trough
//             with water ripples, planed timber with real grain on fences and stands, trampled pen floor with hoof prints and straw
//  realism  - real sizes (cow 1.4 m, block 0.4 x 0.15 x 0.2 m on a 0.25 m stand, trough 1.6 x 0.5 x 0.5 m, wall 1.8 m, fence 1.3 m),
//             contact checked with a probe (tongue on the block, palms on the block, muzzle on the water), exposure 1.0, 17 beats (~1.7 s)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(11);
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .35, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

// ---------- key times (word starts) ----------
const T = { l1: W(1), // T.lN = start of spoken line N+1
  l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6),
  salt: W(0, 3), sodium: W(1, 5), grass: W(1, 6), salt3: W(2, 5), pen3: W(2, 8), licks4: W(3, 2), flakes4: W(3, 6), water5: W(4, 5), appetite5: W(4, 8),
  cow6: W(5, 2), lick6: W(5, 4), ifgone6: W(5, 7) };

// ---------- layout (metres; pen floor x -3.4..3.8, z -2.8..1.4; pasture z > 1.6; wall face at z -2.8) ----------
const SH = .25, HB = .15, TOP = SH + .025 + HB;                    // stand height, block height, block top
const BA = [.8, -1.2], BC = [-1.8, -.2];                            // block A (old, cow A), block C (new, placed by the farmer)
const SA = [BA[0] + .12, TOP, BA[1]], SC = [BC[0] + .12, TOP, BC[1]]; // lick spots on the +x end of each block top
const WALLX = 1.3, SW = [2.15, .8, -2.8];                           // wall centre x, lick spot on the salt crust
const TRO = [-2.95, .9], WAT = [-2.95, .42, 1.3], HAY = [-2.3, .14, 2.15];
const world = [
  { id: 'floor', type: 'pen_floor', pos: [.2, 0, -.7], params: { w: 7.4, d: 4.4 }, anim: 'none' },
  { id: 'wall', type: 'salt_wall', pos: [WALLX, 0, -2.8], params: { len: 5.0, h: 1.8, t: .3, crustH: 1.12, lick: [SW[0] - WALLX, SW[1]], lickK: [[24.3, 0], [25.6, 1]], licks: [[24.3, D]] }, anim: 'none' },
  { id: 'fence', type: 'pen_fence', pos: [0, 0, 0], params: { segs: [[-3.4, -2.8, -1.2, -2.8], [-3.4, -2.8, -3.4, 1.2]] }, anim: 'none' },
  { id: 'trough', type: 'trough', pos: [TRO[0], 0, TRO[1]], rotY: PI / 2, params: { len: 1.6, w: .5, h: .5, drinkAt: [-(WAT[2] - TRO[1]), 0], drinks: [[19.2, 19.95]] }, anim: 'none' },
  { id: 'hay', type: 'hay_pile', pos: [HAY[0], 0, HAY[2]], params: { r: .42, h: .26, count: 1100 }, anim: 'none' },
  { id: 'blockA', type: 'salt_block', pos: [BA[0], 0, BA[1]], params: { stand: SH, lick: [.12, HB / 2, 0], kick: [1, 0, 0], crystals: 22, heap: [-.15, .42], seed: 3,
    licks: [[2.3, T.l2 + .1], [T.l5 + .05, 22.75]], wearK: [[0, .55], [T.l2, .85], [T.l5, .95], [22.7, 1.88]] }, anim: 'none' },
  { id: 'blockC', type: 'salt_block', pos: [BC[0], 0, BC[1]], params: { stand: SH, lick: [.12, HB / 2, 0], kick: [1, 0, 0], seed: 8, carry: [T.l2, 10.75], carryBy: 'farmer',
    licks: [[12.7, 17.2]], wearK: [[12.6, 0], [17.2, .8]] }, anim: 'none' },
];
// palms and shrubs behind the wall and beside the pen, swaying
[[-4.6, -5.0, 9], [-1.4, -5.7, 10], [2.6, -5.1, 8.5], [5.4, -4.3, 9.5], [-6.0, -1.0, 8]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, x, z, h, { rotY: i * 1.9, params: { sway: .01, ph: i } })));
[[-3.9, -3.3, .9, 'nature_pack/Bush_1'], [4.4, -2.4, 1.0, 'nature_pack/Bush_2'], [4.6, .9, .7, 'ph/shrub_02'], [-4.2, 1.6, .6, 'ph/shrub_01'], [5.6, 3.5, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
// pasture: grass clumps in front of the pen, clear of cow B's path and the camera spots
const path = [[1.5, 3.7], [.9, 3.7], [-.1, .9], [-.68, -.2]], clear = (x, z) => {
  for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(x - ax - u * dx, z - az - u * dz) < 1.6) return false; } return Math.hypot(x - HAY[0], z - HAY[2]) > 1.2 && Math.hypot(x + 3.6, z - 3.2) > .9; };
for (let i = 0, n = 0; i < 400 && n < 46; i++) { const x = -6.2 + R() * 12.4, z = 1.8 + R() * 4.4; if (!clear(x, z)) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], x, z, .3 + R() * .25, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }

// ---------- actors ----------
const COW = { model: 'animals_pack/Cow', height: 1.4, ground: 'flat', dust: 0 };
const cowA = { id: 'cowA', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...COW, link: 'cowA', clip: 'Idle', seed: 4, offset: .7,
  track: [[0, 3.95, -1.05, 0, -PI / 2], [2.2, SA[0] + 1.0, BA[1], 0, -PI / 2], [22.95, SA[0] + 1.0, BA[1], 0, -PI / 2], [24.0, SW[0], -1.5, 0, -PI]] } };
const cowB = { id: 'cowB', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...COW, height: 1.35, link: 'cowB', clip: 'Eating', seed: 9, offset: 2.1,
  track: [[0, 1.5, 3.7, 0, -PI / 2], [5.0, .9, 3.7, 0], [8.0, .9, 3.7, 0], [11.0, -.1, .9, 0], [12.4, SC[0] + 1.0, BC[1], 0, -PI / 2],
    [17.35, SC[0] + 1.0, BC[1], 0, -PI / 2], [18.85, -2.1, .85, 0], [19.95, -2.1, .85, 0], [20.6, -2.05, 1.1, 0, -.2]] } };
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 3,
  track: [[T.l2, -2.9, 0, 2.8, null, 'carry'], [9.9, BC[0], 0, .5, null, 'carry', 'walk'], [10.5, BC[0], -.31, BC[1] + .4, PI, 'placeKneel'], [11.3, BC[0], -.31, BC[1] + .4, PI, 'placeKneel'],
    [11.85, -1.95, 0, .6, null, 'stand'], [14.2, -3.6, 0, 3.2, null, 'walk', 'walk'], [14.9, -3.6, 0, 3.2, 2.5, 'stand']] } };
// full walker state on every mode change (modes do not inherit): base clip, reach weight, lick/drink, target, tail swish, a few flies
const C0 = { clip: 'Idle', rk: 0, lick: 0, drink: 0, swish: .35, flies: .2, dur: .6 };
const cm = o => ({ ...C0, ...o });

const beats = [
  // 1 hook: cow A walks in from the open side, face toward the camera, and reaches the pink salt block on its stand
  //   (the farmer is listed before block C so his palms are published before the carried block reads them each frame)
  { t: 0, kind: 'intro', add: [{ ...farmer, delay: T.l2 }, ...world, cowA, cowB], modes: { cowA: cm({}), cowB: cm({ clip: 'Eating', swish: .45, flies: .3 }) },
    camera: { target: [2.4, .75, -1.1], dist: 5.0, elev: .14, az: -.75, zoom: 'in' } },
  //   tongue on the block, circle ring around it
  { t: T.salt, kind: 'info', add: [stk('ringA', 'circle_ring', [BA[0], TOP - .05, BA[1]], .8)], modes: { cowA: cm({ clip: 'Idle_Headlow', lickAt: SA, rk: 1, lick: 1, dur: .7 }) },
    camera: { target: [1.3, .55, -1.2], dist: 3.0, elev: .1, az: .05, fov: 36, zoom: 'out' } },
  // 2 the body needs sodium: low front angle on the licking face, salt crystals sparkling around the stand
  { t: T.l1, kind: 'info', remove: ['ringA'], add: [stk('spark', 'sparkles', [BA[0] - .45, .3, BA[1] + .55], .3, { delay: .5 })],
    camera: { target: [.85, .38, -1.0], dist: 2.9, elev: .22, az: -.45, fov: 38, zoom: 'in' } },
  //   grass alone is not enough: cow B grazing the pasture, cross over the grass-only patch
  { t: T.grass, kind: 'problem', remove: ['spark'], add: [stk('crossG', 'cross', [-.05, .75, 3.95], .36, { delay: .25, pulse: true })],
    camera: { target: [.4, .55, 3.8], dist: 4.2, elev: .2, az: .15, zoom: 'out', fg: { side: 'b', k: .7 } } },
  // 3 but the farmer who knows this walks in with a new block held between his palms
  { t: T.l2, kind: 'solution', remove: ['crossG'], modes: { cowA: cm({ clip: 'Idle_2', lickAt: SA, dur: 1 }), cowB: cm({ clip: 'Idle' }) },
    camera: { target: [-2.3, .95, 1.6], dist: 4.4, elev: .12, az: .55, zoom: 'in' } },
  //   kneels and sets it on the stand in the pen (palms on the block), point-down sticker over the spot
  { t: T.salt3, kind: 'solution', add: [stk('ptC', 'point_down', [BC[0], 1.05, BC[1]], .34, { delay: .35 })],
    camera: { target: [-1.8, .5, 0], dist: 2.9, elev: .2, az: .5, zoom: 'out' } },
  // 4 so the cow licks it: cow B walks up to the new block
  { t: T.l3, kind: 'info', remove: ['ptC'], camera: { target: [-1.45, .62, -.15], dist: 3.8, elev: .16, az: .3, zoom: 'in' } },
  //   licks as much as it needs (profile: tongue on the block)
  { t: T.licks4, kind: 'info', modes: { cowB: cm({ clip: 'Idle_Headlow', lickAt: SC, rk: 1, lick: 1, dur: .6 }) },
    camera: { target: [-1.45, .55, -.2], dist: 2.8, elev: .12, az: .1, zoom: 'out' } },
  //   salt flakes come off with every lick: macro of tongue, flakes and the hollow wearing in
  { t: T.flakes4, kind: 'solution', camera: { target: [-1.72, .43, -.2], dist: 1.7, elev: .3, az: -.5, fov: 34, push: .12 } },
  // 5 sodium helps the water balance: cow B turns to the trough
  { t: T.l4, kind: 'info', modes: { cowB: cm({ clip: 'Idle', lickAt: SC, dur: .35 }) },
    camera: { target: [-1.9, .7, .5], dist: 4.2, elev: .2, az: -.25, zoom: 'out' } },
  //   drinks (muzzle on the water, ripples), water-drop sticker
  { t: T.water5, kind: 'solution', add: [stk('dropW', 'water_drop', [WAT[0], 1.05, WAT[2] + .1], .32, { delay: .05 })], modes: { cowB: cm({ clip: 'Idle_Headlow', lickAt: WAT, rk: 1, drink: 1, dur: .5 }) },
    camera: { target: [-2.75, .55, 1.25], dist: 2.4, elev: .25, az: -.5, zoom: 'in' } },
  //   and her appetite: eats the hay, thumbs-up
  { t: T.appetite5, kind: 'solution', remove: ['dropW'], add: [stk('thumbH', 'thumbs_up', [HAY[0] + .2, 1.0, HAY[2] + .1], .32, { delay: .5 })],
    modes: { cowB: cm({ clip: 'Eating', lickAt: HAY, rk: 1, drink: 1, dur: .8 }) },
    camera: { target: [-2.25, .45, 1.95], dist: 2.6, elev: .3, az: .35, zoom: 'out' } },
  // 6 the strangest thing? a curious arc around cow A while its old block wears down to a remnant
  { t: T.l5, kind: 'twist', remove: ['thumbH'], modes: { cowA: cm({ clip: 'Idle_Headlow', lickAt: [BA[0] + .02, SH + .05, BA[1]], rk: 1, lick: 1, dur: 1.1 }) },
    camera: { target: [.95, .45, -1.2], dist: 2.5, elev: .08, az: -.65, spin: .9, push: .2, fov: 38 } },
  //   the cow turns from the empty stand to the wall
  { t: T.cow6, kind: 'info', modes: { cowA: cm({ clip: 'Idle', lickAt: [BA[0] + .02, SH + .05, BA[1]], dur: .5 }) },
    camera: { target: [1.9, .75, -1.9], dist: 3.8, elev: .15, az: .75, zoom: 'out' } },
  //   licks the salty wall (white crust, a wet patch spreads, flakes)
  { t: T.lick6, kind: 'info', modes: { cowA: cm({ clip: 'Idle', lickAt: SW, rk: 1, lick: 1, dur: .6 }) },
    camera: { target: [2.15, .8, -2.55], dist: 2.4, elev: .1, az: -1.25, zoom: 'in' } },
  //   if the block is finished: the worn remnant in front, the cow at the wall behind
  { t: T.ifgone6, kind: 'info', camera: { target: [1.3, .5, -1.8], dist: 3.3, elev: .3, az: -.95, spin: .1, push: 0 } },
  // 7 CTA: cow B calm by the hay and its block, thumbs-up, slow orbit pull-out over the whole pen
  { t: T.l6, kind: 'info', add: [stk('thumbEnd', 'thumbs_up', [-1.8, 2.05, 1.0], .45, { delay: 1.3 })],
    modes: { cowB: cm({ clip: 'Idle', lickAt: HAY, dur: 1 }) },
    camera: { target: [-2.0, .8, 1.0], dist: 5.0, elev: .36, az: .12, spin: .35, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه البقرة بتلحس حجر مالح كل يوم',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 14, d: 13, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [1.0, .94, .86], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 52, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .6, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: true },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
