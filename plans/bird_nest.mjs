// Weaver-bird nest (voice-over 2026-11-15): bird gathers strips, weaves layer by layer over 3 days, makes two doors, finishes the nest.
// Locked look: 3D sky, real soil, Poly Haven plants, stickers for pointers, no words on screen.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const NX = 0, NY = 1.7, NZ = 0; // nest centre, hanging from a branch
const BALL = .31; // woven ball radius
// a small sparrow-like bird built from parts (body, head, wings, tail, beak, legs, eyes), facing +z
const sparrow = (id, c, delay = 0) => { const [x, y, z] = c; const B = '#8a6a48', W = '#5a4330', BELLY = '#d8c7a6';
  return { id, type: 'custom', pos: [0, 0, 0], params: { parts: [
    { shape: 'sphere', size: [.2, .16, .3], pos: [x, y, z], color: B, rough: .7 },
    { shape: 'sphere', size: [.17, .15, .19], pos: [x, y + .03, z - .02], color: BELLY, rough: .8 },
    { shape: 'sphere', size: [.13, .12, .13], pos: [x, y + .1, z + .14], color: B, rough: .6 },
    { shape: 'cone', size: [.04, .08, .04], pos: [x, y + .1, z + .23], rot: [Math.PI / 2, 0, 0], color: '#3a2a1a', rough: .5 },
    { shape: 'sphere', size: [.14, .035, .22], pos: [x - .1, y + .03, z - .01], color: W, rough: .8 },
    { shape: 'sphere', size: [.14, .035, .22], pos: [x + .1, y + .03, z - .01], color: W, rough: .8 },
    { shape: 'sphere', size: [.09, .025, .2], pos: [x, y - .01, z - .27], color: W, rough: .8 },
    { shape: 'cylinder', size: [.012, .08, .012], pos: [x - .03, y - .1, z], color: '#5a4a3a', rough: .9 },
    { shape: 'cylinder', size: [.012, .08, .012], pos: [x + .03, y - .1, z], color: '#5a4a3a', rough: .9 },
    { shape: 'sphere', size: [.03, .03, .03], pos: [x + .05, y + .13, z + .12], color: '#0d0a08', rough: .3 },
    { shape: 'sphere', size: [.03, .03, .03], pos: [x - .05, y + .13, z + .12], color: '#0d0a08', rough: .3 }] }, anim: 'grow', delay, dust: false }; };
// woven nest built in stages: a pad, then a bowl, then the full ball with a hanging entrance tube on each side
const layer = (id, d, y, tex, delay) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'sphere', size: [d, d * .4, d], pos: [NX, y, NZ], color: '#d6b97a', tex, rough: .95, wobble: .05 }] }, anim: 'grow', delay, dust: false });
const tube = (id, c, d, delay) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [
  { shape: 'cylinder', size: [.12, .34, .12], pos: [c[0], c[1], c[2]], color: '#d6b97a', tex: 'leaves', rough: .95 },
  { shape: 'sphere', size: [.13, .07, .13], pos: [c[0], c[1] - .17, c[2]], color: '#20160c', rough: 1 }] }, anim: 'grow', delay, dust: false });
const door = (id, pos, delay) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'sphere', size: [.13, .07, .13], pos, color: '#20160c', rough: 1 }] }, anim: 'grow', delay, dust: false });
const branch = { id: 'branch', type: 'glb', pos: [-1.5, 0, -1.2], params: { model: 'ph/dead_tree_trunk_02', height: 1.8 }, anim: 'grow' };
const scenery = [branch, { id: 'g1', type: 'glb', pos: [-1.2, 0, 1.6], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [1.5, 0, 1.4], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' }];
const beats = [
  { t: 0, kind: 'intro', add: [{ ...sparrow('bird', [NX + .14, NY + .48, .05], .1) }, ...scenery], camera: { preset: 'hero', target: [0, 1.8, 0], dist: 6.5, elev: .2, az: .5, zoom: 'in' } },
  { t: at(2), kind: 'info', add: [stk('s1', 'arrows_cycle', [NX, 1.2, .9], .3, { delay: .3 }), { id: 'twigs', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.04, .9, .04], pos: [.5, .15, 1.0], color: '#9a7340', rot: [0, 0, 1.2], rough: .9 }, { shape: 'cylinder', size: [.04, .8, .04], pos: [.1, .12, 1.1], color: '#8a6434', rot: [0, 0, -1], rough: .9 }] }, anim: 'grow', delay: .2, dust: false }],
    camera: { preset: 'close', target: [NX, 1.2, 0], dist: 5, elev: .25, az: .6, zoom: 'in' } },
  { t: at(3), kind: 'solution', remove: ['s1'], add: [layer('l1', .5, NY + .3, 'leaves', 0), layer('l2', .58, NY + .2, 'leaves', .7), ],
    camera: { preset: 'close', target: [NX, 1.5, 0], dist: 4.6, elev: .3, az: .4, zoom: 'in' } },
  { t: at(4, 0), kind: 'solution', add: [{ id: 'ball', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'sphere', size: [BALL * 2, BALL * 2, BALL * 2], pos: [NX, NY, NZ], color: '#d6b97a', tex: 'leaves', rough: .95, wobble: .06 }] }, anim: 'grow', delay: 0, dust: false }, stk('ok', 'check', [NX, NY + .75, 0], .3, { delay: .8 })], remove: ['l1', 'l2', 'bird'],
    camera: { preset: 'close', target: [NX, 1.5, 0], dist: 5, elev: .15, az: -.4, zoom: 'out' } },
  { t: at(4, 4), kind: 'info', add: [tube('t1', [NX + .18, NY - .36, .18], .12, 0), tube('t2', [NX - .2, NY - .36, -.2], .12, .4), stk('p1', 'point_down', [NX + .62, NY - .05, .2], .28, { delay: .6 }), stk('p2', 'point_down', [NX - .5, NY + .1, -.45], .28, { delay: .9 })],
    camera: { preset: 'close', target: [NX, 1.5, 0], dist: 4.2, elev: .3, az: .9, zoom: 'in' } },
  { t: at(5), kind: 'info', remove: ['p1', 'p2', 'ok'], camera: { preset: 'orbit', target: [0, 1.6, 0], dist: 9, elev: .3, az: .3, zoom: 'out' }, add: [stk('like', 'thumbs_up', [-1.5, 2.6, .2], .5, { delay: .3 })] },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'بناء عش العصفورة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
