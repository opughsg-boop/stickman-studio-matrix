// Buried water tank that stays cool (voice-over 2026-11-16). Ground keeps a steady temperature below a depth, so a buried tank stays cooler than an open one above ground.
// Shot: a cutaway of the soil block shows the tank buried, insulation layer around it, soil on top, shade and a sealed lid. Locked look: 3D sky, real soil, stickers.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, parts, delay = 0, anim = 'grow', lift = 0) => ({ id, type: 'custom', pos: [0, lift, 0], params: { parts }, anim, delay, dust: false });
const LIFT = 1.2; // the cutaway floats above the island ground so the tank and insulation are not hidden by the grass plane
const box = (size, pos, color, o = {}) => ({ shape: 'box', size, pos, color, rough: o.rough ?? .9, tex: o.tex });
// Soil cutaway: a block of ground 3.6 m wide, 1.6 m deep, whose FRONT face is open so the tank inside shows (like a cut-away model).
// Walls: back, left, right, bottom, and a grass top. Nothing blocks the front.
const SOIL_C = '#6e5034', GRASS = '#4f7a2e';
const cutSoil = obj('cutSoil', [
  box([3.6, .14, 1.8], [0, .07, 0], GRASS, { rough: 1 }),                 // grass top skin
  box([3.6, 1.5, .35], [0, -.75, -.9 + .17], SOIL_C, { rough: 1 }),       // back wall (thick)
  box([.35, 1.5, 1.8], [-1.8 + .17, -.75, 0], SOIL_C, { rough: 1 }),      // left wall (thick)
  box([.35, 1.5, 1.8], [1.8 - .17, -.75, 0], SOIL_C, { rough: 1 }),       // right wall (thick)
  box([3.6, .3, 1.8], [0, -1.65, 0], SOIL_C, { rough: 1 })], 0, 'grow', LIFT);          // floor (thick, flush with the tank bottom)
// the buried tank: a real cylinder (1.1 m across, 1.4 m tall), with a cover ring on top
const tankCyl = (d, h, y, color, o = {}) => ({ shape: 'cylinder', size: [d, h, d], pos: [0, y, 0], color, rough: o.rough ?? .3, tex: o.tex });
const tank = obj('tank', [tankCyl(1.1, 1.2, -.9, '#3f8fc4'), tankCyl(1.2, .06, -.27, '#6e6e6e', { rough: .6 })], .3, 'grow', LIFT);
// insulation: a warm yellow sleeve around the tank (slightly wider), and a band across the bottom
const insul = obj('insul', [tankCyl(1.32, 1.5, -.8, '#e3c86b', { rough: 1 }), box([1.9, .1, 1.9], [0, -1.45, 0], '#e3c86b', { rough: 1 })], .6, 'grow', LIFT);
// sealed lid: a grey disc with a rim, dropped onto the top
const lid = obj('lid', [{ shape: 'cylinder', size: [1.2, .08, 1.2], pos: [0, .06, 0], color: '#5a5a5a', rough: .7 }], 1.6, 'drop', LIFT);
// shade: a canopy on posts, above and in front of the tank
const shade = obj('shade', [box([2.6, .06, 1.9], [0, 1.1, 0], '#8a7a5c', { rough: .9 }), box([.08, 1.1, .08], [-1.2, .55, -.8], '#8a6a44'), box([.08, 1.1, .08], [1.2, .55, -.8], '#8a6a44')], 1.2, 'grow', LIFT);
const scenery = [{ id: 'g1', type: 'glb', pos: [-2.6, 0, 1.5], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [2.7, 0, 1.4], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' }];
const beats = [
  // hook: the question over a normal water tank above the ground
  { t: 0, kind: 'intro', add: [obj('above', [tankCyl(1.1, 1.4, .7, '#3f8fc4')], .1), stk('q', 'question', [1.1, 1.9, 0], .34, { delay: .5 }), ...scenery, cutSoil], camera: { preset: 'hero', target: [0, .3, 0], dist: 9, elev: .25, az: .5, zoom: 'in' } },
  // a tank above ground heats up in the sun
  { t: at(1), kind: 'problem', remove: ['q'], add: [stk('sun', 'fire', [0, 2.2, 0], .4, { delay: .2, pulse: true }), stk('w', 'warning', [1.2, 1.2, 0], .3, { delay: .4, pulse: true })], camera: { preset: 'close', target: [0, .4, 0], dist: 6, elev: .25, az: .3, zoom: 'in' } },
  // fix: dig the tank into the ground (cutaway), the soil keeps a steady cool temperature
  { t: at(2), kind: 'solution', remove: ['above', 'sun', 'w'], effects: [], add: [cutSoil, tank, stk('ok', 'check', [0, LIFT + .5, 1.1], .32, { delay: .6 })], camera: { preset: 'close', target: [0, LIFT - .6, 0], dist: 6.4, elev: .3, az: .1, zoom: 'in' } },
  // insulation layer around the tank and soil on top
  { t: at(3), kind: 'solution', remove: ['ok'], add: [insul, stk('ins', 'circle_ring', [1.2, LIFT - .6, .9], .4, { delay: .3, bob: 0, onTop: true })], camera: { preset: 'close', target: [0, LIFT - .6, 0], dist: 6, elev: .25, az: .25, zoom: 'in' } },
  // shade over the tank, away from direct sun
  { t: at(4), kind: 'solution', add: [shade, stk('sh', 'point_down', [0, LIFT + 1.6, .6], .3, { delay: .4 })], camera: { preset: 'hero', target: [0, LIFT, 0], dist: 9, elev: .3, az: .3, zoom: 'out' } },
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
