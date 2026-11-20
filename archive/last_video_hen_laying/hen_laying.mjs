// "إزاي الفلاح بيعرف الدجاجة بتبيض، من غير ما يشوفها؟!" (voice-over 2026-11-19, 11 lines, 54.7 s). A village yard in morning light: a mud-plaster
// coop with two wooden nest boxes on a lime-washed ledge against its yard wall, a straw-dust yard, palms and the Nile horizon.
// The hero is a Fayoumi hen (the Egyptian village breed: silver-white hackle, black-pencilled body, red single comb and wattles, slate legs).
// Every line is shown by objects and actions, no words: she paces, walks a loop peering into corners, hops into the nest box, turns, sinks and
// fluffs over the nest, calls (beak opening with sound arcs), the farmer walks in, his hand slides under her and draws out the egg, the warm wet
// egg in his palm (faint warm glow and wisps), a macro of the shell as the wet sheen goes matte, her red comb close (one check sticker), a pulp
// tray where eggs drop in as the sun runs whole days (an egg a day, then a day with none), the farmer collecting the nest eggs into a wicker basket.
// 1x improvement over the last video (olive_cutting):
//  - Motion: the hen now HOPS between heights (anticipation crouch, arced flight with wing beats, landing squash), turns round inside the box,
//    settles onto the nest with a decaying side-to-side wiggle and spread wings, and calls with a real cackle rhythm (three short beak opens
//    then a long one, head raised); eggs drop into the tray with a squash-and-bounce; the hand slides flat, then cups, then draws the egg out.
//  - Graphics: hand skin now has a freckle/redness map plus pore and crease bump, clear-coated nails; a lathe egg with a real asymmetric
//    ovoid profile, shell speckle and pore bump, a clear-coat cuticle that dries from glossy to matte; moulded-pulp tray with fibre texture;
//    Poly Haven wicker basket and wooden crate.
//  - Realism: a real Egyptian breed's plumage, comb and slate legs; real sizes (hen 0.45 m, egg 5.6 x 4.2 cm, nest box 36 x 38 x 40 cm on a
//    25 cm ledge, tray 29 cm, basket 38 cm, farmer 1.75 m); a hen lays about one egg a day and skips days; the fresh egg is warm and wet.
// Contact: the egg rides the gard_hand palm (palm-surface anchor, egg centre = palm + normal x 2.3 cm, 0 m gap by construction); before the
// grab the palm is keyed onto the egg's nest spot; the farmer's palms reach the nest eggs and the basket (probe, see report); hen feet on the
// ground / nest straw (track y = surface height). Stickers: 1 (check by the comb).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const s = S[Math.min(i, S.length - 1)], ws = s.words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : s.start + (s.end - s.start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'none', ...more });
const stk = (id, name, pos, size, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const r3 = v => Math.round(v * 1000) / 1000, R3 = a => a.map(r3), PI = Math.PI;
const add = (a, b) => a.map((x, i) => x + b[i]), mul = (a, k) => a.map(x => x * k), norm = a => mul(a, 1 / Math.hypot(...a));
const R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(23);

// ---- times from the voice
const T1 = at(1), Tseek = word(1, /وبتدور/, .7), T2 = at(2), Tenter = word(2, /بتدخل/, .2), Tsit = word(2, /وتقعد/, .35), Tfluff = word(2, /وبتفرد/, .55);
const T3 = at(3), T4 = at(4), Tfarm = word(4, /الفلاح/, .2), Thand = word(4, /ويحط/, .5), Tunder = word(4, /تحتها/, .6), Tpull = word(4, /ويسحب/, .8);
const T5 = at(5), Twarm = word(5, /دافية/, .4), T6 = at(6), Tdry = word(6, /بتجف/, .6), T7 = at(7), Tred = word(7, /ديلها/, .35), T8 = at(8), T9 = at(9), T10 = at(10);

// ---- layout (metres). Coop yard wall (outer face) at z -.30, yard toward +z. Nest boxes on a .25 m ledge; box 0 is the hen's, box 1 holds older eggs.
const NB = .25, NH = .40, NX = -.45, NZ = -.09, BOX0 = NX - .18, BOX1 = NX + .18, FLOOR = NB + .03;   // FLOOR: straw top in the box
const EGG = [BOX0, FLOOR - .005, NZ + .05];                    // the new egg under her (lying in the straw, centre lifted by the egg asset)
const TRAY = [2.8, .35, .9], BASK = [-.12, 0, .4];

// ---- hen track [t, x, z, act, yaw, y]
const HY = FLOOR;
const henTrack = [
  [0, .45, 1.2, 'idle', -PI / 2], [.5, .45, 1.2, 'idle'], [1.9, -.1, 1.0, 'idle'], [2.5, -.1, 1.0, 'idle', PI * .4], [3.7, .35, .8, 'idle'],      // pacing, restless
  [5.0, .7, 1.3, 'idle'], [5.6, .7, 1.3, 'peck'], [6.4, .7, 1.3, 'idle'], [6.9, .3, 1.8, 'idle'], [7.9, -.35, 1.5, 'idle'],                   // the loop
  [9.5, -.63, .62, 'idle'], [10.0, -.63, .62, 'idle', PI], [Tenter - .3, -.63, .62, 'idle'], [Tenter + .35, -.63, .34, 'idle'],                  // peers at the boxes
  [Tenter + .95, BOX0, NZ + .02, 'idle', null, HY], [Tsit, BOX0, NZ + .02, 'idle', null, HY], [Tsit + .55, BOX0, NZ - .01, 'idle', 0, HY],     // hop in, turn round
  [Tsit + .9, BOX0, NZ - .01, 'brood', 0, HY], [T3 + .05, BOX0, NZ - .01, 'brood', 0, HY], [T3 + .3, BOX0, NZ - .01, 'broodcall', 0, HY],   // sinks, fluffs; calls
  [T4 - .2, BOX0, NZ - .01, 'broodcall', 0, HY], [T4 + .2, BOX0, NZ - .01, 'brood', 0, HY],
  [T6 + .4, BOX0, NZ - .01, 'brood', 0, HY], [T6 + 1.2, BOX0, NZ + .02, 'idle', 0, HY], [T6 + 1.9, BOX0, .5, 'idle', null, 0],                  // stands, hops down (off camera)
  [T7 - 1.0, .25, 1.1, 'idle'], [T7 - .4, .25, 1.1, 'idle', .45], [T8 - .2, .25, 1.1, 'idle', .45],                                            // comb close-up spot
  [T8 + 1.5, .1, 1.45, 'peck'], [T9 + .3, .1, 1.45, 'peck'], [T9 + 1.6, .05, 1.0, 'peck'], [D, .05, 1.0, 'peck']];
const FAY = { pal: ['#b9b2a6', '#ece8e0', '#3a3530'], bars: '#5d574f', hackle: '#f1eee7', legC: '#7b8590', eye: '#4a2a14' };
const hen = { id: 'hen', type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .45, seed: 4, link: 'hen', look: FAY, track: henTrack,
  combK: [[0, .35], [Tred - .1, .35], [Tred + 1.4, 1]] } };
const hen2 = { id: 'hen2', type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .42, seed: 7, track: [[0, 1.3, 1.6, 'peck', -2], [6, 1.3, 1.6, 'peck'], [8, 1.0, 1.9, 'peck'], [D, 1.0, 1.9, 'peck']] } };
const hen3 = { id: 'hen3', type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .44, seed: 9, look: { ...FAY, pal: ['#aaa397', '#e9e4da', '#33302c'] },
  track: [[0, -1.2, 1.3, 'idle', 1.2], [3, -1.2, 1.3, 'peck'], [6, -1.0, 1.75, 'peck'], [D, -1.0, 1.75, 'peck']] } };

// ---- the farmer's right hand (palm-surface anchor). Track [t, x,y,z, f, u, pose]; egg centre = palm + u_palm_normal * .023
const HR = [], hk = (t, P, f, u, pose) => HR.push([r3(t), ...R3(P), ...R3(norm(f)), ...R3(u), pose]);
const FS = [-.45, -.38, -.81], UP_DOWN = [0, -1, 0];               // slide: fingers in and slightly down under her breast, palm up
const eggC = add(EGG, [0, .021, 0]), palmAt = c => add(c, [0, -.023, 0]);
const P5 = [-.15, .55, .5], F5 = [-.6, 0, -.8];
hk(0, [3, -3, 3], FS, UP_DOWN, 'slide');
hk(Thand - .9, add(palmAt(eggC), mul(norm(FS), -.55)), FS, UP_DOWN, 'slide');       // comes in from front-right, out of the close frame
hk(Thand + .2, add(palmAt(eggC), mul(norm(FS), -.14)), FS, UP_DOWN, 'slide');      // at her breast
hk(Tunder + .4, palmAt(eggC), FS, UP_DOWN, 'slide');                                // slowly under her, palm under the egg
hk(Tpull - .05, palmAt(eggC), FS, UP_DOWN, 'cup');                                  // fingers close round the egg
const Tgrab = Tpull - .05;
hk(Tpull + .9, add(add(palmAt(eggC), mul(norm(FS), -.2)), [0, .08, 0]), FS, UP_DOWN, 'cup');   // draws it out under her breast feathers
hk(T5 + .3, palmAt(add(P5, [0, 0, 0])), F5, UP_DOWN, 'cup');                        // presents the warm egg in the sun
hk(T6 + .1, palmAt(P5), F5, UP_DOWN, 'cup');
const F6 = [-.6 * Math.cos(-.4) - (-.8) * Math.sin(-.4), 0, -.6 * Math.sin(-.4) + -.8 * Math.cos(-.4)];
hk(T7 - .1, palmAt(add(P5, [0, .01, 0])), F6, UP_DOWN, 'cup');                     // slowly turns the egg in the light (macro)
const handR = { id: 'handR', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side: 'R', link: 'handR', anchor: 'palm', skin: '#94624a', track: HR } };
const egg1 = { id: 'egg1', type: 'lay_egg', pos: [0, 0, 0], anim: 'none', params: { show: [T4 - .2, D], path: [[0, EGG], [Tgrab + .05, 'hand:handR']], blend: .25, rotY: .3,
  wetK: [[0, 1], [Tdry - .3, 1], [Tdry + 1.6, 0]], warmK: [[0, 0], [T5 - .4, 0], [Twarm, 1], [T6 + 1, 1], [T6 + 2.2, .25]] } };

// ---- the farmer walks in for line 4 (wide), squats at the box; walks away while the camera is close on the egg
const F1 = [-.12, 0, .95], yawN = Math.atan2(BOX0 - F1[0], NZ - F1[2]);
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, seed: 6, link: 'farmer', track: [
  [T4 - .3, 2.9, 0, 1.9, null, 'walk'], [Thand - .4, F1[0], 0, F1[2], null, 'walk', 'walk'], [Thand - .2, F1[0], 0, F1[2], yawN, 'stand'],
  [Thand + .3, F1[0], -.5, F1[2], yawN, 'squatHold'], [Tpull + 1.0, F1[0], -.5, F1[2], yawN, 'squatHold'], [Tpull + 1.6, F1[0], 0, F1[2], yawN, 'stand'],
  [Tpull + 3.6, 3.4, 0, 2.4, null, 'walk', 'walk'], [D, 3.4, 0, 2.4, null, 'stand']] } };

// ---- line 9: a second entrance (new id) to collect the eggs from box 1 into the basket; pick spots from the nest_row egg spots
const F2 = [BOX1 - .2, 0, .32], SQ1 = -.44, SQ2 = -.62, YN = PI, YB = PI - 1.2;
const PICK = [[BOX1 + .04, NB + .045, NZ - .02], [BOX1 - .03, NB + .045, NZ + .02]];   // nest_row hides its eggs from the last index down
const tp = [T9 + 1.4, T9 + 3.05], hp = i => { const a = i * 2.4, rr = Math.sqrt(i / 14) * .07; return [r3(BASK[0] + Math.cos(a) * rr), .012, r3(BASK[2] + Math.sin(a) * rr)]; }, BIN = [hp(1), hp(2)];
const farmer2 = { id: 'farmer2', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, seed: 8, link: 'farmer2', track: [
  [T9 - 2.2, -2.8, 0, 2.2, null, 'walk'], [T9 + .8, F2[0], 0, F2[2], null, 'walk', 'walk'], [T9 + .9, F2[0], 0, F2[2], YN, 'stand'],
  ...tp.flatMap(t0 => [[t0 - .5, F2[0], SQ1, F2[2], YN, 'squatHold'], [t0 - .05, F2[0], SQ1, F2[2], YN, 'squatPickR'], [t0 + .25, F2[0], SQ1, F2[2], YN, 'squatPickR'],
    [t0 + .85, F2[0], SQ2, F2[2], YB, 'squatPickR'], [t0 + 1.1, F2[0], SQ2, F2[2], YB, 'squatPickR']]),
  [T10 + .6, F2[0], 0, F2[2], YN, 'stand'], [D, F2[0], 0, F2[2], YN, 'stand']] } };
const eggsPicked = tp.map((t0, i) => ({ id: 'egp' + i, type: 'lay_egg', pos: [0, 0, 0], anim: 'none', params: { show: [t0 + .05, t0 + 1.12], rigDy: -.02, blend: .2,
  path: [[0, PICK[i]], [t0 + .05, 'rig:farmer2:R'], [t0 + .9, BIN[i]]] } }));
const heap = { id: 'heap', type: 'egg_tray', pos: [BASK[0], .012, BASK[2]], anim: 'none', params: { heap: { r: .07 }, eggsK: [[0, 1], [tp[0] + 1.12, 2], [tp[1] + 1.12, 3]] } };

// ---- scenery
const world = [
  { id: 'yard', type: 'coop_floor', pos: [.4, 0, 1.15], params: { w: 5.2, d: 2.9, yard: true }, anim: 'none' },
  { id: 'coop', type: 'hen_coop', pos: [0, 0, -3.0], rotY: PI, params: { w: 3.5, t: .25, h: 2.1, zb: -2.7, zf: -.3 }, anim: 'none' },
  { id: 'nests', type: 'nest_row', pos: [NX, 0, NZ], params: { n: 2, bench: NB, h: NH, eggBox: 1, eggsK: [[0, 2], [tp[0] + .05, 1], [tp[1] + .05, 0]] }, anim: 'none' },
  { id: 'hayY', type: 'hay_pile', pos: [1.05, 0, -.05], params: { r: .3, h: .18, count: 450 }, anim: 'none' },
  glb('crate', 'ph/wooden_crate_01', [TRAY[0], 0, TRAY[2]], .35, {}, { rotY: .05 }),
  glb('basket', 'ph/wicker_basket_01', BASK, .12, {}, { rotY: .3 }),
];
[[-4.6, -3.6, 9], [-5.8, -.6, 10.5], [-4.9, 2.6, 8], [7.6, -6.5, 9.5], [-3.2, -5.5, 8.5]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, [x, 0, z], h, { sway: .01, ph: i }, { rotY: i * 1.9 })));
[[-2.4, -.1, .9, 'nature_pack/Bush_1'], [2.4, -.2, .8, 'ph/shrub_02'], [-2.7, 1.9, .7, 'ph/shrub_01'], [4.2, 1.6, .6, 'ph/shrub_01'], [-2.2, 3.1, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, [x, 0, z], h, { sway: .015, ph: i * 2 }, { rotY: i * 1.3 })));
for (let i = 0, n = 0; i < 600 && n < 36; i++) { const x = -6 + R() * 12, z = -2 + R() * 8;
  if (x > -2.2 && x < 3.4 && z > -.6 && z < 2.9) continue; if (Math.abs(x) < 2.2 && z < -.2) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], [r3(x), 0, r3(z)], r3(.3 + R() * .25), { sway: .03, ph: n }, { rotY: R() * 6 })); n++; }

// ---- line 8: pulp tray, the sun runs whole days behind it; an egg drops in on day 1, 2 and 4 (day 3 none)
const dayK = [[T8, .12], [T8 + 5.6, 4.1]], dayT = d => T8 + (d - .12) / (3.98 / 5.6);
const sun = { id: 'sun', type: 'sky_sun', pos: [TRAY[0], 0, 0], anim: 'none', params: { dayK, seasonK: [[0, 0]], sumK: [[0, 0]], sumOp: [[0, 0]], winK: [[0, 0]], winOp: [[0, 0]],
  z: -40, y0: 2.4, spanS: 5.5, peakS: 6.2, r: .9 } };
const trayDays = { id: 'tray', type: 'egg_tray', pos: TRAY, anim: 'none', params: { fill: [12, 13, 7], eggsK: [[0, 0], [dayT(.42), 1], [dayT(1.42), 2], [dayT(3.42), 3]] } };
const arcs = { id: 'arcs', type: 'call_arcs', pos: [0, 0, 0], anim: 'none', params: { link: 'hen', onK: [[T3 + .2, 0], [T3 + .5, 1], [T4 - .5, 1], [T4 - .1, 0]] } };

// ---- beats (one new angle or state each, ~4 s)
const b = [];
// 0 hook: the hen pacing the yard in morning light, 2 m, slow push-in
b.push({ t: 0, kind: 'intro', add: [...world, trayDays, hen, hen2, hen3, handR, egg1, arcs], camera: { target: [.15, .24, 1.1], dist: 2.0, elev: .2, az: .2, push: .12 } });
// 1 she walks a loop round the yard (higher, wider)
b.push({ t: T1, kind: 'info', camera: { target: [.22, .15, 1.3], dist: 4.2, elev: .42, az: -.12 } });
// 1b looking for a quiet corner: low, behind her, the nest boxes ahead
b.push({ t: Tseek, kind: 'info', camera: { target: [-.5, .3, .55], dist: 2.5, elev: .16, az: .5 } });
// 2 she hops into the box (front-left, nest opening in frame)
b.push({ t: T2, kind: 'info', camera: { target: [-.6, .36, .12], dist: 1.45, elev: .2, az: -.42 } });
// 2b settles: sinks, fluffs and spreads her wings over the nest
b.push({ t: Tfluff, kind: 'info', camera: { target: [BOX0, .45, -.02], dist: .95, elev: .1, az: .28, push: .08 } });
// 3 calls: close on the head, beak opening, sound arcs
b.push({ t: T3, kind: 'info', camera: { target: [BOX0, .6, .06], dist: .62, elev: .06, az: .35 } });
// 4 the farmer comes in and squats at the box (wide)
b.push({ t: T4, kind: 'info', add: [farmer], camera: { target: [-.2, .6, .45], dist: 3.4, elev: .18, az: .32 } });
// 4b his hand slides under her and draws out the egg (front-left, ~80 deg to the forearm)
b.push({ t: Thand, kind: 'info', camera: { target: [-.62, .33, .0], dist: .82, elev: .38, az: -.75 } });
// 5 the warm egg in his palm in the sun (faint warm glow and wisps)
b.push({ t: T5, kind: 'info', camera: { target: P5, dist: .44, elev: .2, az: -.5, push: .06 } });
// 6 macro on the shell: the wet sheen dries matte
b.push({ t: T6, kind: 'info', camera: { target: add(P5, [0, .02, 0]), dist: .21, elev: .45, az: -1.05, fov: 36 } });
// 7 her red comb and wattles, a check by her head
b.push({ t: T7, kind: 'info', remove: ['handR', 'egg1', 'farmer'], add: [stk('ok7', 'check', [.37, .49, 1.21], .05, { delay: Tred - T7 + .9 })],
  camera: { target: [.32, .42, 1.25], dist: .6, elev: .08, az: .9 } });
// 8 the pulp tray, the sun runs whole days: an egg a day, then a day with none
b.push({ t: T8, kind: 'info', remove: ['ok7'], add: [sun], camera: { target: [TRAY[0], .58, TRAY[2] - .1], dist: 1.0, elev: .12, az: .05 } });
// 9 the farmer collects the nest eggs into the basket every day, hens around
b.push({ t: T9, kind: 'solution', remove: ['sun'], add: [farmer2, ...eggsPicked, heap], camera: { target: [-.3, .45, .45], dist: 2.7, elev: .22, az: -.35 } });
// 10 CTA: slow orbit round the coop yard
b.push({ t: T10, kind: 'info', camera: { preset: 'orbit', target: [.2, .5, .7], dist: 4.6, elev: .3, az: .4 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي الفلاح بيعرف الدجاجة بتبيض من غير ما يشوفها',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 14, d: 13, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [1.0, .94, .86], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 38, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .5, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: false, handheld: .6 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
