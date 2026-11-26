// "ليه الحمامة بتشرب والراس تحت، ومش بترفعه؟" (voice-over 2026-11-26, 7 lines, 33.6 s). A sunny flat Egyptian rooftop at midday
// (concrete slab, low front parapet, stair-head room with a water tank, dishes, laundry, a pine pigeon cage, Cairo skyline). The hero is a
// blue-bar domestic pigeon (33 cm, renderer `pigeon`, built procedurally: there is no pigeon model in assets/) standing on the rolled rim of a
// shallow galvanised drinking tray (70 x 40 x 7.5 cm, renderer `pigeon_basin`). Every spoken line is shown by objects and actions, no words:
//  1 hook: the pigeon drinks with its head down from the first frame; camera low at the tray
//  2 most birds lift the head: a hen walks in, scoops a beakful and tips her head back to swallow (cross); camera pulls out
//  3 the pigeon sucks: close on the beak in the water, rings close in on the beak and a water column runs up into it (check);
//    "like you with a straw": a glass with a striped straw beside the tray, the water climbs the straw
//  4 the beak stays in: seen from above, the water level in the tray drops slowly while the beak never lifts (arrow up, hourglass)
//  5 quick and safe: the pigeon lifts its head and stays put on the rim, looking around (eyes); calm wide shot of the roof
//  6 summer heat: a hot sun and heat shimmer over the slab; three more pigeons walk in, two hop onto the rim and drink (point down on the tray)
//  7 CTA: the hero turns to us and coos; thumbs-up; slow pull-out arcing round
// Step up vs the last render (arugula_hot, n 17; corn_leaf_v3):
//  motion   - pigeon drink pose with the beak tip solved onto the falling water level (no float, no clipping) and a throat pump 2.5x/s;
//             hop onto the rim with crouch, flapping arc and landing squash; hen scoop-and-tip-back sip cycle with a swallow shake
//  graphics - galvanised tray with zinc spangle, rolled rim, limescale ring, damp tide band as the level falls, clear water with a live
//             surface, converging suction rings and a scrolling water column; a glass tumbler with a striped straw
//  lighting - midday sun high (elev 55) behind the camera, exposure .8, slab tinted down (the first preview washed out white), every camera sees the bright slab or sky (earlier videos were dark)
//  realism  - real sizes: pigeon 0.33 m, hen 0.45 m, tray 0.7 x 0.4 x 0.075 m, glass 11 cm, rooftop parapet 1 m; real Egyptian roof dressing
//  sound    - wind bed (.03), faint bird bed (.02), a water sip under the voice (.03)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI;
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, o = {}) => ({ id, type, pos, params, anim: o.anim || 'none', dust: false, delay: o.delay || 0, ...(o.rotY != null ? { rotY: o.rotY } : {}) });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6),
  drink2: W(1, 2), head2: W(1, 6), suck3: W(2, 1), like3: W(2, 5), straw3: W(2, 8), up4: W(3, 5), until4: W(3, 7),
  fast5: W(4, 3), stay5: W(4, 4), heat6: W(5, 4), find6: W(5, 6), fav6: W(5, 13), like7: W(6, 5) };

// ---------- layout (metres). Roof slab = island top (y 0), front parapet at z 4; camera side +z ----------
const B = { x: 0, z: 2.2, L: .7, W: .4, H: .075 };      // the drinking tray
const RIM = B.H + .0065 - .0005;                         // feet on the rolled rim
const ZB = B.z - B.W / 2;                                // back rim (birds there face +z, toward the camera)
const XR = B.x + B.L / 2;                                // right short rim
const levelK = [[0, .054], [T.l3, .054], [T.l4 - .2, .038], [T.l5 + 2, .038], [T.l6, .033]];
const tUp = T.fast5 + .45;                               // the hero lifts its head ("quickly")
const pg = (id, seed, track, o = {}) => ({ id, type: 'pigeon', pos: [0, 0, 0], anim: 'none', dust: false, delay: o.delay || 0, params: { len: .33, seed, link: id, waterYK: levelK, track } });

// hero pigeon P1: on the back rim from frame 0, head down drinking; lifts its head on "quickly", stays, turns to us and coos for the CTA
const P1x = -.13;
const p1 = pg('p1', 1, [[0, P1x, ZB, 'drink', 0, RIM], [tUp, P1x, ZB, 'idle', 0, RIM], [T.l6, P1x, ZB, 'idle', 0, RIM], [T.l6 + .7, P1x, ZB, 'coo', -.25, RIM], [D + 1, P1x, ZB, 'coo', -.25, RIM]]);
// line 6: three pigeons come in across the slab; P2 hops onto the back rim, P3 onto the right rim, P4 waits pecking on the slab
const t6 = T.l5 - .3;
const p2 = pg('p2', 4, [[t6, 1.5, .9, 'idle', -.9, 0], [t6 + .4, 1.5, .9, 'idle', -.9, 0], [T.find6 - .2, .22, ZB - .17, 'idle', 0, 0], [T.find6 + .35, .22, ZB, 'idle', 0, RIM], [T.find6 + .8, .22, ZB, 'drink', 0, RIM], [D + 1, .22, ZB, 'drink', 0, RIM]], { delay: 0 });
const p3 = pg('p3', 7, [[t6, 1.9, 3.1, 'idle', -2.3, 0], [t6 + .9, 1.9, 3.1, 'idle', -2.3, 0], [T.find6 + .5, XR + .17, B.z + .1, 'idle', -PI / 2, 0], [T.find6 + 1.05, XR, B.z + .1, 'idle', -PI / 2, RIM], [T.find6 + 1.5, XR, B.z + .1, 'drink', -PI / 2, RIM], [D + 1, XR, B.z + .1, 'drink', -PI / 2, RIM]]);
const p4 = pg('p4', 9, [[t6, -1.7, 3.2, 'idle', 2.2, 0], [t6 + .6, -1.7, 3.2, 'idle', 2.2, 0], [T.fav6 - .5, -.75, 2.75, 'peck', 1.9, 0], [T.l6 + 1, -.75, 2.75, 'peck', 1.9, 0], [T.l6 + 2.2, -.7, 2.85, 'idle', .4, 0], [D + 1, -.7, 2.85, 'idle', .4, 0]]);
// the hen (line 2): walks in from the left, scoops from the left end of the tray and tips her head back; then wanders off and pecks
const HX = B.x - B.L / 2 - .2, HZ = B.z + .02;
const hen = { id: 'hen', type: 'hen', pos: [0, 0, 0], anim: 'none', dust: false, params: { height: .45, seed: 5, link: 'hen',
  track: [[T.l1 - .4, -1.45, 2.75, 'idle', PI / 2], [T.l1 - .2, -1.45, 2.75, 'idle', PI / 2], [T.drink2 - .1, HX, HZ, 'sip', PI / 2], [T.l2 + .9, HX, HZ, 'idle', PI / 2],
    [T.l2 + 3.4, -1.75, 1.2, 'peck', -2.4], [D + 1, -1.75, 1.2, 'peck', -2.4]] } };
// tray last in the list so it reads this frame's beak positions
const basin = obj('basin', 'pigeon_basin', [B.x, 0, B.z], { len: B.L, w: B.W, h: B.H, levelK, link: 'basin',
  sucks: [{ link: 'p1', onK: [[T.l2 - .3, 0], [T.l2, 1], [T.l4 - .1, 1], [T.l4 + .2, 0]] }],
  sips: [{ link: 'hen', onK: [[T.l1, 1], [T.l2 + 1, 1], [T.l2 + 1.1, 0]] }] });
const glass = obj('glass', 'straw_glass', [.2, 0, B.z + B.W / 2 + .16], { suckK: [[T.straw3 - .1, 0], [T.straw3 + .9, 1]], drainK: [[T.straw3 + .4, 0], [T.l3, 1]] }, { delay: .1, anim: 'grow' });

// ---------- the roof world ----------
const world = [
  obj('roof', 'rooftop', [0, 0, 0], { w: 10, d: 8, depth: 3.8, facade: '#d8c3a0', slabTint: '#b3aa9c', stair: { x: 3.2, z: -2.4, w: 2.4, d: 2.6, h: 2.5 }, dishes: [[-.9, -3.45, .2, .8], [1.3, -3.5, -.2, .7]], laundry: [[-4.3, -3.1, 2.8, 0, 3]] }),
  obj('nroof', 'rooftop', [10.3, .3, -1], { w: 8, d: 10, depth: 4.1, front: 'full', facade: 'brick', stair: { x: 2, z: -3.2, w: 2.2, d: 2.4, h: 2.4, color: '#e2cf9e', door: '#7a5a3a', tank: false }, tanks: [[-1.4, 0, -2.7, '#2c2c2c']], dishes: [[-.5, -4.4, 0, .8]] }),
  obj('city', 'city', [0, 0, 0], { ground: -3.8, count: 40, r0: 15, r1: 75, avoid: [[-7, 7, -6, 6], [5, 16, -8, 6], [12, 32, -9, 7]] }),
  obj('cage', 'pigeon_cage', [-2.9, 0, -1.6], { full: true }, { rotY: .35 }),
];
const sun = obj('sun', 'sun_glow', [0, 0, 0], { size: 1.4, showK: [[T.l5 - .1, 0], [T.l5 + .6, 1], [T.find6, 1], [T.find6 + .4, 0]], posK: [[0, .4, 1.55, -.8]] });
const haze = obj('haze', 'heat_haze', [0, 0, 1.9], { w: 3.2, d: 2, count: 12, opacity: .16 });

const beak1 = [P1x, .06, ZB + .19];   // where the hero's beak meets the water (probe-checked after the preview)
const beats = [
  // 1 hook: low at the tray; the pigeon drinks head down from the first frame
  { t: 0, kind: 'info', add: [...world, p1, basin], camera: { target: [P1x + .02, .13, ZB + .1], dist: .95, elev: .1, az: .35, zoom: 'in' } },
  // 2 most birds lift the head: the hen walks in, scoops and tips back (cross on her); camera pulls out
  { t: T.l1, kind: 'info', add: [hen, stk('x2', 'cross', [HX + .02, .56, HZ + .05], .1, { delay: T.head2 - T.l1 })],
    camera: { target: [-.35, .2, B.z], dist: 1.9, elev: .2, az: .5, zoom: 'out' } },
  // 3 the pigeon sucks: close on the beak in the water (check)
  { t: T.l2, kind: 'info', remove: ['x2'], add: [stk('ok3', 'check', [P1x + .07, .2, ZB + .2], .05, { delay: T.suck3 - T.l2 })],
    camera: { target: beak1, dist: .5, elev: .14, az: 1.25, zoom: 'in' } },
  //   ... like you with a straw: the glass with a straw beside the tray, water climbs the straw
  { t: T.like3 - .25, kind: 'info', remove: ['ok3'], add: [glass], camera: { target: [.02, .08, B.z + .17], dist: .9, elev: .2, az: .25, zoom: 'out' } },
  // 4 the beak stays in while the level drops: from above (arrow up at the column, hourglass)
  { t: T.l3, kind: 'info', remove: ['glass'], add: [stk('up4', 'arrow_up', [P1x + .07, .12, ZB + .22], .05, { delay: T.up4 - T.l3, pulse: true }), stk('hg4', 'hourglass', [B.x + .2, .2, B.z + .05], .07, { delay: T.until4 - T.l3 })],
    camera: { target: [P1x + .05, .06, B.z], dist: .62, elev: .62, az: -.45, zoom: 'in' } },
  // 5 quick and safe: the head comes up, the bird stays on the rim looking round (eyes); calm wide shot of the roof
  { t: T.l4, kind: 'info', remove: ['up4', 'hg4'], add: [stk('eyes5', 'eyes', [P1x, .5, ZB], .12, { delay: T.stay5 - T.l4 })],
    camera: { target: [-.15, .22, B.z - .1], dist: 1.8, elev: .2, az: -.35, zoom: 'out' } },
  // 6 summer heat: hot sun and shimmer over the slab; more pigeons walk in, hop up and drink
  { t: T.l5, kind: 'info', remove: ['eyes5'], add: [sun, haze, p2, p3, p4], camera: { target: [.1, .4, 1.95], dist: 2.6, elev: .14, az: .15, zoom: 'out' } },
  //   ... a clean tray on the roof (point down on it)
  { t: T.find6 - .2, kind: 'info', add: [stk('pt6', 'point_down', [B.x + .05, .42, B.z + .05], .14, { delay: .25 })], camera: { target: [.08, .18, B.z], dist: 1.8, elev: .3, az: .25, zoom: 'in' } },
  // 7 CTA: the hero turns to us and coos; thumbs-up; slow pull-out arcing round
  { t: T.l6, kind: 'info', remove: ['pt6', 'haze'], add: [stk('thumb7', 'thumbs_up', [P1x - .25, .48, ZB + .1], .12, { delay: T.like7 - T.l6 - .2 })],
    camera: { target: [P1x + .05, .25, ZB + .15], dist: 1.25, elev: .15, az: -.3, spin: -.35, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الحمامة بتشرب والراس تحت',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 10, d: 8, depth: 3.2 }, flatTop: true, cover: false, horizon: 'nile', water: '#a99f8c', waves: 0, foam: false, birds: 2, motes: .3, haze: .5,
    sunElev: 55, sunAz: 25, turbidity: 2.2, clouds: 8,
    sfxBed: 'wind', sfxBeds: [{ cat: 'bird', idx: 0, gain: .02 }], sfxCalls: [{ cat: 'water', idx: 0, times: [T.l2 + .2], dur: 1.4, gain: .03 }] },
  style: { camEase: .6, captionY: .78, exposure: .8, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
