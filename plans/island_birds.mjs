// Flightless island birds (voice-over 2026-11-15): flying costs energy, no ground predators, wings shrink and legs grow, predators arrive.
// Locked look: 3D sky, island over the sea, real soil, Poly Haven plants, a real fox, bird models built from parts, stickers.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, parts, delay = 0) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim: 'grow', delay, dust: false });
// a small flying bird (sparrow-like, wings spread), faces +z
const flyer = (id, [x, y, z], delay = 0) => obj(id, [
  { shape: 'sphere', size: [.2, .16, .3], pos: [x, y, z], color: '#8a6a48', rough: .7 }, { shape: 'sphere', size: [.17, .15, .19], pos: [x, y - .02, z - .02], color: '#d8c7a6', rough: .8 },
  { shape: 'sphere', size: [.13, .12, .13], pos: [x, y + .08, z + .14], color: '#8a6a48', rough: .6 }, { shape: 'cone', size: [.04, .08, .04], pos: [x, y + .08, z + .23], rot: [Math.PI / 2, 0, 0], color: '#3a2a1a' },
  { shape: 'sphere', size: [.5, .03, .2], pos: [x - .3, y + .07, z], rot: [0, 0, .5], color: '#5a4330', rough: .8 }, { shape: 'sphere', size: [.5, .03, .2], pos: [x + .3, y + .07, z], rot: [0, 0, -.5], color: '#5a4330', rough: .8 },
  { shape: 'sphere', size: [.09, .025, .2], pos: [x, y - .01, z - .27], color: '#5a4330' }], delay);
// a kiwi-like flightless bird: round body, tiny wing stubs, strong legs, long beak, faces +z (about 0.4 m)
const kiwi = (id, [x, y, z], delay = 0) => obj(id, [
  { shape: 'sphere', size: [.42, .4, .5], pos: [x, y + .26, z], color: '#7a5b3a', tex: 'papillae', rough: .95 },
  { shape: 'sphere', size: [.16, .15, .17], pos: [x, y + .4, z + .27], color: '#8a6a48', rough: .8 },
  { shape: 'cone', size: [.035, .3, .035], pos: [x, y + .35, z + .46], rot: [Math.PI / 2 + .25, 0, 0], color: '#d7c7a0', rough: .5 },
  { shape: 'sphere', size: [.03, .03, .03], pos: [x + .06, y + .44, z + .31], color: '#0d0a08' }, { shape: 'sphere', size: [.03, .03, .03], pos: [x - .06, y + .44, z + .31], color: '#0d0a08' },
  { shape: 'sphere', size: [.06, .03, .1], pos: [x - .21, y + .28, z - .02], color: '#5a4330' }, { shape: 'sphere', size: [.06, .03, .1], pos: [x + .21, y + .28, z - .02], color: '#5a4330' },
  { shape: 'cylinder', size: [.05, .2, .05], pos: [x - .1, y + .1, z + .02], color: '#6a4a2a', rough: .8 }, { shape: 'cylinder', size: [.05, .2, .05], pos: [x + .1, y + .1, z + .02], color: '#6a4a2a', rough: .8 }], delay);
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
