// Buffalo shed with a high roof (voice-over 2026-11-16): heat stress, low roof traps hot air, high roof lets it rise and leave, ammonia leaves too, shade and water nearby.
// Locked look: 3D sky, real soil, Poly Haven plants, real bull model with fur, stickers. The shed is built in metres from custom parts.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, parts, delay = 0, anim = 'grow') => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim, delay, dust: false });
const B = (size, pos, color, o = {}) => ({ shape: 'box', size, pos, color, rough: o.rough ?? .8, rot: o.rot });
const WOOD = '#8a6a44', TIN = '#9a4a38';
const W = 5.6, Dp = 4; // shed footprint
// shed frame: 6 posts, low back wall, left and right side rails (open front for the camera)
const posts = (h) => [[-W / 2, -Dp / 2], [0, -Dp / 2], [W / 2, -Dp / 2], [-W / 2, Dp / 2], [0, Dp / 2], [W / 2, Dp / 2]].map(([x, z]) => B([.24, h, .24], [x, h / 2, z], WOOD));
// gabled roof: two tin sheets tilted, with a ridge gap for ventilation (gap = .35)
const roof = (h, pitch = .34) => [B([W + .5, .16, 2.45], [0, h + .35, -1.3 + .15], TIN, { rot: [pitch, 0, 0], rough: .45 }), B([W + .5, .16, 2.45], [0, h + .35, 1.3 - .15], TIN, { rot: [-pitch, 0, 0], rough: .45 })];
const backWall = obj('wallB', [B([W, 1.4, .12], [0, .7, -Dp / 2], '#c7b79a')], .2);
const shedHigh = (delay = 0, k = '') => [obj('postsH' + k, posts(3.4), delay), obj('roofH' + k, roof(3.4), delay + .3, 'grow')]; // new ids when the high shed is built a second time
const shedLow = (delay = 0) => [obj('postsL', posts(2.0), delay), obj('roofL', roof(2.0, .12), delay + .3, 'grow')];
const BUFFALO = (clip) => ({ id: 'buf', type: 'glb', pos: [0, 0, .3], params: { model: 'animals_pack/Bull', height: 1.5, clip }, anim: 'grow' });
const scenery = [
  { id: 'g1', type: 'glb', pos: [-3.4, 0, 2.3], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [3.6, 0, 2.1], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' },
  { id: 'tr', type: 'glb', pos: [5.2, 0, -2.8], params: { model: 'ph/island_tree_01', height: 5 }, anim: 'grow' }, { id: 'sh', type: 'glb', pos: [-4.6, 0, -2.2], params: { model: 'ph/shrub_02', height: .9 }, anim: 'grow' }];
const beats = [
  // hook: the high-roofed shed with a buffalo inside
  { t: 0, kind: 'intro', add: [...shedHigh(.1), backWall, { ...BUFFALO('Idle'), delay: .3 }, ...scenery], camera: { preset: 'hero', target: [0, 1.4, 0], dist: 13, elev: .2, az: .35, zoom: 'in' } },
  // buffalo suffers in the heat
  { t: at(1), kind: 'info', effects: ['heat'], add: [stk('hot', 'face_fever', [.5, 2.5, .6], .4, { delay: .3 }), stk('sun', 'fire', [-.7, 2.6, .6], .36, { delay: .6, pulse: true })], modes: { buf: { clip: 'Idle_Headlow' } }, camera: { preset: 'close', target: [0, 1.0, .3], dist: 6.5, elev: .15, az: .5, zoom: 'in' } },
  // problem: a low roof traps the hot air and the damp
  { t: at(2), kind: 'problem', remove: ['postsH', 'roofH', 'hot', 'sun'], effects: ['heat'], add: [...shedLow(0), stk('w1', 'warning', [0, 2.8, 1.0], .36, { pulse: true, delay: .4 })], camera: { preset: 'hero', target: [0, 1.4, 0], dist: 15, elev: .12, az: .45, zoom: 'in' } },
  // fix: a high roof, hot air rises and leaves through the ridge gap
  { t: at(3), kind: 'solution', remove: ['postsL', 'roofL', 'w1'], add: [...shedHigh(0, '2'), stk('u1', 'arrow_up', [-1.4, 2.5, .9], .34, { delay: .6 }), stk('u2', 'arrow_up', [0, 2.8, .9], .38, { delay: .9 }), stk('u3', 'arrow_up', [1.4, 2.5, .9], .34, { delay: 1.2 }), stk('ok', 'check', [2.6, 3.0, .9], .34, { delay: 1.5 })], modes: { buf: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 1.8, 0], dist: 15, elev: .1, az: .3, zoom: 'out' } },
  // the smell and the ammonia leave with it
  { t: at(4), kind: 'info', remove: ['u1', 'u2', 'u3'], add: [stk('a1', 'arrow_up_right', [1.0, 3.7, .6], .4, { delay: .3 }), stk('a2', 'arrow_up_right', [-1.0, 3.7, .6], .4, { delay: .7 }), stk('sick', 'face_sick', [0, 2.2, .9], .32, { delay: .5 })], camera: { preset: 'close', target: [0, 2.6, 0], dist: 8, elev: .12, az: -.3, zoom: 'in' } },
  // tip: shade and water close by
  { t: at(5), kind: 'solution', remove: ['a1', 'a2', 'sick', 'ok'], add: [obj('trough', [B([1.5, .5, .55], [3.3, .25, 1.9], '#8d8a84'), B([1.36, .08, .42], [3.3, .46, 1.9], '#3f7fb0', { rough: .1 })], 0), stk('chk2', 'check', [3.3, 1.2, 1.9], .32, { delay: .5 })], modes: { buf: { clip: 'Eating' } }, camera: { preset: 'close', target: [1.7, .7, 1.1], dist: 7, elev: .2, az: .5, zoom: 'in' } },
  // CTA: wide orbit with a like
  { t: at(6), kind: 'info', remove: ['chk2'], add: [stk('like', 'thumbs_up', [-3.2, 4.0, .4], .6, { delay: .3 })], modes: { buf: { clip: 'Idle' } }, camera: { preset: 'orbit', target: [0, 1.6, 0], dist: 16, elev: .3, az: .3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'حظيرة الجاموس عالية السقف',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
