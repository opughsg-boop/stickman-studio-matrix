// Buried water tank that stays cool (voice-over 2026-11-16). Ground keeps a steady temperature below a depth, so a buried tank stays cooler than an open one above ground.
// Shot: a cutaway of the soil block shows the tank buried, insulation layer around it, soil on top, shade and a sealed lid. Locked look: 3D sky, real soil, stickers.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, parts, delay = 0, anim = 'grow') => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim, delay, dust: false });
const box = (size, pos, color, o = {}) => ({ shape: 'box', size, pos, color, rough: o.rough ?? .9, tex: o.tex });
// soil block (cutaway): top soil, the buried band, and the tank inside insulation
const SOIL = [box([3.4, .5, 2.2], [0, -.25, 0], '#6b4c2f', { tex: 'wood' })];
const soil = obj('soil', [box([3.6, .9, 2.4], [0, -.45, 0], '#7a5a36', { rough: 1 }), box([3.6, .08, 2.4], [0, .02, 0], '#4f7a2e', { rough: 1 })], 0);
// tank, insulation shell and buried depth
const tank = obj('tank', [box([1.6, .8, 1.2], [0, -.5, 0], '#3f8fc4', { rough: .15 }), box([1.8, .06, 1.4], [0, .02, 0], '#d6d2c8', { rough: .6 })], .3);
const insul = obj('insul', [box([1.9, .08, 1.5], [0, -.1, 0], '#e3c86b', { rough: 1 }), box([1.9, .08, 1.5], [0, -.94, 0], '#e3c86b', { rough: 1 }), box([.08, .9, 1.5], [.95, -.5, 0], '#e3c86b', { rough: 1 }), box([.08, .9, 1.5], [-.95, -.5, 0], '#e3c86b', { rough: 1 })], .6);
const lid = obj('lid', [box([1.9, .06, 1.5], [0, .3, 0], '#5a5a5a', { rough: .7 })], 1.6, 'drop');
const shade = obj('shade', [box([2.6, .06, 1.9], [0, 1.1, 0], '#8a7a5c', { rough: .9 }), box([.08, 1.1, .08], [-1.2, .55, -.8], '#8a6a44'), box([.08, 1.1, .08], [1.2, .55, -.8], '#8a6a44')], 1.2);
const scenery = [{ id: 'g1', type: 'glb', pos: [-2.6, 0, 1.5], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [2.7, 0, 1.4], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' }];
const beats = [
  // hook: the question over a normal water tank above the ground
  { t: 0, kind: 'intro', add: [obj('above', [box([1.6, .8, 1.2], [0, .4, 0], '#3f8fc4', { rough: .15 })], .1), stk('q', 'question', [1.1, 1.9, 0], .34, { delay: .5 }), ...scenery, soil], camera: { preset: 'hero', target: [0, .3, 0], dist: 9, elev: .25, az: .5, zoom: 'in' } },
  // a tank above ground heats up in the sun
  { t: at(1), kind: 'problem', remove: ['q'], add: [stk('sun', 'fire', [0, 2.2, 0], .4, { delay: .2, pulse: true }), stk('w', 'warning', [1.2, 1.2, 0], .3, { delay: .4, pulse: true })], camera: { preset: 'close', target: [0, .4, 0], dist: 6, elev: .25, az: .3, zoom: 'in' } },
  // fix: dig the tank into the ground (cutaway), the soil keeps a steady cool temperature
  { t: at(2), kind: 'solution', remove: ['above', 'sun', 'w'], add: [tank, stk('ok', 'check', [0, 1.1, 0], .32, { delay: .6 })], camera: { preset: 'close', target: [0, -.3, 0], dist: 6.2, elev: .35, az: .4, zoom: 'in' } },
  // insulation layer around the tank and soil on top
  { t: at(3), kind: 'solution', remove: ['ok'], add: [insul, stk('ins', 'circle_ring', [1.3, -.3, .6], .4, { delay: .3, bob: 0, onTop: true })], camera: { preset: 'close', target: [0, -.4, 0], dist: 5.6, elev: .3, az: .8, zoom: 'in' } },
  // shade over the tank, away from direct sun
  { t: at(4), kind: 'solution', add: [shade, stk('sh', 'point_down', [0, 1.6, 0], .3, { delay: .4 })], camera: { preset: 'hero', target: [0, .2, 0], dist: 9, elev: .3, az: .3, zoom: 'out' } },
  // tip: a sealed lid stops hot air from getting in
  { t: at(5), kind: 'info', remove: ['sh'], add: [lid, stk('lk', 'check', [0, 1.2, .9], .32, { delay: 1.8 })], camera: { preset: 'close', target: [0, .3, 0], dist: 6, elev: .25, az: -.4, zoom: 'in' } },
  // CTA: wide orbit with a like
  { t: at(6), kind: 'info', remove: ['lk'], add: [stk('like', 'thumbs_up', [-1.6, 2.2, .2], .5, { delay: .3 })], camera: { preset: 'orbit', target: [0, .3, 0], dist: 11, elev: .3, az: .3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'خزان ميه في الأرض بارد',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
