// Weaver-bird nest (voice-over 2026-11-15): bird gathers strips, weaves layer by layer over 3 days, makes two doors, finishes the nest.
// Locked look: 3D sky, real soil, Poly Haven plants, stickers for pointers, no words on screen.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const NX = 0, NY = 1.6, NZ = 0; // nest centre, hanging from a branch
const layer = (id, d, y, tex, delay) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'sphere', size: [d, d * .45, d], pos: [NX, y, NZ], color: '#c9a46a', tex, rough: .95, wobble: .08 }] }, anim: 'grow', delay, dust: false });
const bird = (id, pos, delay = 0) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [
  { shape: 'sphere', size: [.38, .34, .55], pos, color: '#c79a4a', rough: .6 },
  { shape: 'sphere', size: [.24, .24, .24], pos: [pos[0], pos[1] + .24, pos[2] + .17], color: '#c79a4a', rough: .6 },
  { shape: 'cone', size: [.05, .08, .05], pos: [pos[0], pos[1] + .13, pos[2] + .2], rot: [Math.PI / 2, 0, 0], color: '#e0b04a', rough: .5 }] }, anim: 'grow', delay, dust: false });
const door = (id, pos, delay) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'sphere', size: [.2, .2, .08], pos, color: '#2a1d12', rough: 1 }] }, anim: 'grow', delay, dust: false });
const branch = { id: 'branch', type: 'glb', pos: [-1.5, 0, -1.2], params: { model: 'ph/dead_tree_trunk_02', height: 1.8 }, anim: 'grow' };
const scenery = [branch, { id: 'g1', type: 'glb', pos: [-1.2, 0, 1.6], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [1.5, 0, 1.4], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' }];
const beats = [
  { t: 0, kind: 'intro', add: [{ ...bird('bird', [NX + .1, 2.5, .15]), delay: .1 }, ...scenery], camera: { preset: 'hero', target: [0, 1.8, 0], dist: 6.5, elev: .2, az: .5, zoom: 'in' } },
  { t: at(2), kind: 'info', add: [stk('s1', 'arrows_cycle', [NX, 1.2, .9], .3, { delay: .3 }), { id: 'twigs', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.04, .9, .04], pos: [.5, .15, 1.0], color: '#9a7340', rot: [0, 0, 1.2], rough: .9 }, { shape: 'cylinder', size: [.04, .8, .04], pos: [.1, .12, 1.1], color: '#8a6434', rot: [0, 0, -1], rough: .9 }] }, anim: 'grow', delay: .2, dust: false }],
    camera: { preset: 'close', target: [NX, 1.2, 0], dist: 5, elev: .25, az: .6, zoom: 'in' } },
  { t: at(3), kind: 'solution', remove: ['s1'], add: [layer('l1', .55, NY - .1, 'leaves', 0), layer('l2', .46, NY + .02, 'leaves', .7), layer('l3', .36, NY + .14, 'leaves', 1.4)],
    camera: { preset: 'close', target: [NX, 1.5, 0], dist: 4.6, elev: .3, az: .4, zoom: 'in' } },
  { t: at(4), kind: 'solution', add: [layer('l4', .5, NY + .3, 'leaves', 0), layer('l5', .28, NY + .36, 'leaves', .6), stk('ok', 'check', [NX, 2.3, 0], .3, { delay: .8 })], remove: [],
    camera: { preset: 'close', target: [NX, 1.5, 0], dist: 5, elev: .15, az: -.4, zoom: 'out' } },
  { t: at(5), kind: 'info', add: [door('d1', [NX + .3, NY - .05, .26], 0), door('d2', [NX - .3, NY - .05, -.26], .4), stk('p1', 'point_down', [NX + .45, NY + .45, .34], .28, { delay: .6 }), stk('p2', 'point_down', [NX - .45, NY + .45, -.34], .28, { delay: .9 })],
    camera: { preset: 'close', target: [NX, 1.5, 0], dist: 4.2, elev: .3, az: .9, zoom: 'in' } },
  { t: at(6), kind: 'info', remove: ['p1', 'p2', 'ok'], camera: { preset: 'orbit', target: [0, 1.6, 0], dist: 9, elev: .3, az: .3, zoom: 'out' }, add: [stk('like', 'thumbs_up', [-1.5, 2.6, .2], .5, { delay: .3 })] },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'بناء عش العصفورة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
