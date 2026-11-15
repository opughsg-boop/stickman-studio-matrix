// Flightless island birds (voice-over 2026-11-15): flying costs energy, no ground predators, wings shrink and legs grow, predators arrive.
// Locked look: 3D sky, island over the sea, real soil, Poly Haven plants, a real fox, bird models built from parts, stickers.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, parts, delay = 0) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim: 'grow', delay, dust: false });
// feathered parts get the fur/feather noise (fur:true); wings are layered feather blades with darker tips
const P = (shape, size, pos, color, o = {}) => ({ shape, size, pos, color, rough: o.rough ?? .85, fur: o.fur, rot: o.rot, tex: o.tex });
const wingBlades = (x, y, z, side, base) => [0, 1, 2, 3].map(k => P('sphere', [.3 - k * .03, .03, .17], [x + side * (.12 + k * .075), y + .075 - k * .012, z - .02 - k * .035], k > 1 ? '#3b2c1f' : base, { fur: true, rot: [0, side * .18 * k, side * (.45 - k * .08)] }));
// a small flying bird (sparrow-like, wings spread, feather blades), faces +z
const flyer = (id, [x, y, z], delay = 0) => obj(id, [
  P('sphere', [.2, .16, .3], [x, y, z], '#8a6a48', { fur: true }), P('sphere', [.17, .13, .2], [x, y - .035, z - .02], '#e2d3b4', { fur: true }),
  P('sphere', [.13, .12, .13], [x, y + .08, z + .14], '#8a6a48', { fur: true }), P('cone', [.04, .08, .04], [x, y + .08, z + .23], '#3a2a1a', { rot: [Math.PI / 2, 0, 0] }),
  P('sphere', [.03, .03, .03], [x + .05, y + .11, z + .17], '#0d0a08', { rough: .3 }), P('sphere', [.03, .03, .03], [x - .05, y + .11, z + .17], '#0d0a08', { rough: .3 }),
  ...wingBlades(x, y, z, -1, '#6a5038'), ...wingBlades(x, y, z, 1, '#6a5038'),
  P('sphere', [.1, .02, .22], [x, y - .01, z - .28], '#4a3828', { fur: true }), P('sphere', [.07, .02, .2], [x + .03, y - .015, z - .3], '#3b2c1f', { fur: true })], delay);
// a kiwi: shaggy feather coat (layered body shells), tiny wing stubs, long slightly curved beak with nostril tip, thick legs with toes
const toes = (x, y, z) => [-.05, 0, .05].map(a => P('cylinder', [.014, .09, .014], [x + a * .9, y, z + .045], '#6a4a2a', { rot: [Math.PI / 2 - .15, 0, a * 3] }));
const kiwi = (id, [x, y, z], delay = 0) => obj(id, [
  P('sphere', [.44, .42, .52], [x, y + .26, z], '#6b5238', { fur: true, rough: .95 }), P('sphere', [.4, .3, .46], [x, y + .2, z + .03], '#7d6040', { fur: true, rough: .95 }),
  P('sphere', [.34, .2, .4], [x, y + .38, z - .04], '#54402b', { fur: true, rough: .95 }), P('sphere', [.28, .15, .3], [x, y + .43, z - .1], '#6b5238', { fur: true, rough: .95 }),
  P('sphere', [.16, .15, .17], [x, y + .4, z + .27], '#7d6040', { fur: true }),
  P('cone', [.032, .32, .032], [x, y + .36, z + .46], '#d9c9a2', { rot: [Math.PI / 2 + .3, 0, 0], rough: .45 }), P('sphere', [.02, .02, .02], [x, y + .27, z + .66], '#b8a67f', { rough: .4 }),
  P('sphere', [.028, .028, .028], [x + .065, y + .445, z + .31], '#0d0a08', { rough: .25 }), P('sphere', [.028, .028, .028], [x - .065, y + .445, z + .31], '#0d0a08', { rough: .25 }),
  P('sphere', [.06, .03, .1], [x - .21, y + .28, z - .02], '#4a3828', { fur: true }), P('sphere', [.06, .03, .1], [x + .21, y + .28, z - .02], '#4a3828', { fur: true }),
  P('cylinder', [.055, .22, .055], [x - .1, y + .1, z + .02], '#6a4a2a', { rough: .75 }), P('cylinder', [.055, .22, .055], [x + .1, y + .1, z + .02], '#6a4a2a', { rough: .75 }),
  ...toes(x - .1, y + .015, z + .02), ...toes(x + .1, y + .015, z + .02)], delay);
const scenery = [
  { id: 'g1', type: 'glb', pos: [-1.6, 0, 1.3], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [1.7, 0, 1.4], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' },
  { id: 'sh', type: 'glb', pos: [-3, 0, -1.5], params: { model: 'ph/shrub_02', height: .9 }, anim: 'grow' }, { id: 'palm', type: 'glb', pos: [3.2, 0, -2.2], params: { model: 'nature_pack/PalmTree_1', height: 7 }, anim: 'grow' },
  { id: 'rk', type: 'glb', pos: [-2.4, 0, 1.8], params: { model: 'ph/boulder_01', height: .6 }, anim: 'grow' }];
const beats = [
  // hook: a small bird flies over the island
  { t: 0, kind: 'intro', add: [flyer('fly', [0, 2.2, 0], .1), stk('q', 'question', [.9, 2.7, 0], .34, { delay: .6 }), ...scenery], camera: { preset: 'hero', target: [0, 1.4, 0], dist: 9, elev: .2, az: .5, zoom: 'in' } },
  // flying costs a lot of energy
  { t: at(1), kind: 'info', remove: ['q'], add: [stk('fire', 'fire', [.8, 2.6, 0], .36, { delay: .3, pulse: true })], camera: { preset: 'close', target: [0, 2.0, 0], dist: 5.5, elev: .1, az: .4, zoom: 'in' } },
  // no ground predators on the island
  { t: at(2), kind: 'problem', remove: ['fire', 'fly'], add: [kiwi('kiwi', [-.2, 0, .6], .1), stk('ok', 'check', [.7, 1.1, .6], .32, { delay: .5 })], camera: { preset: 'close', target: [-.2, .35, .6], dist: 4.2, elev: .2, az: .5, zoom: 'in' } },
  // over thousands of years the birds stopped flying and saved energy
  { t: at(3), kind: 'solution', add: [stk('zz', 'face_sleep', [-.2, 1.0, .6], .3, { delay: .4 })], camera: { preset: 'close', target: [-.2, .35, .6], dist: 5, elev: .15, az: -.3, zoom: 'out' } },
  // smaller wings, stronger legs: rings on the wing stubs and on the legs
  { t: at(4), kind: 'solution', remove: ['ok', 'zz'], add: [stk('r1', 'circle_ring', [.04, .52, .59], .3, { delay: .2, bob: 0, onTop: true }), stk('r2', 'circle_ring', [-.1, .13, .62], .26, { delay: .7, bob: 0, onTop: true })], camera: { preset: 'detail', target: [-.2, .3, .6], dist: 2.8, elev: .15, az: .7, zoom: 'in' } },
  // tip: when rats and cats (here a fox) arrived, the birds could not escape
  { t: at(5), kind: 'problem', remove: ['r1', 'r2'], add: [{ id: 'fox', type: 'glb', pos: [2.4, 0, 1.2], params: { model: 'animals_pack/Fox', height: .6, clip: 'Walk', path: [[2.4, 1.2], [.6, .9]], pathSpeed: .3 }, anim: 'grow' }, stk('w', 'warning', [1.3, 1.1, 1.1], .32, { pulse: true, delay: .4 })], camera: { preset: 'close', target: [.8, .4, .8], dist: 5.5, elev: .2, az: .3, zoom: 'out' } },
  // CTA: wide pull-out with a like
  { t: at(6), kind: 'info', remove: ['w'], add: [stk('like', 'thumbs_up', [-1.6, 2.4, .2], .5, { delay: .3 })], camera: { preset: 'orbit', target: [0, 1, 0], dist: 10, elev: .3, az: .3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'طيور الجزر مش بتطير',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
