// Wooden farm fence (voice-over 2026-11-16). Posts on stone bases, horizontal rails between them, a diagonal brace at each corner, treated timber.
// Built from box parts with the timber texture (same builder as the buffalo shed). Locked look: 3D sky, real soil, grass, stickers.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, parts, delay = 0, anim = 'grow') => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim, delay, dust: false });
const box = (size, pos, color, o = {}) => ({ shape: 'box', size, pos, color, tex: o.tex ?? 'wood', rough: o.rough ?? .9, rot: o.rot });
const stone = (size, pos) => ({ shape: 'box', size, pos, color: '#9b9a94', rough: 1 });
const TIM = '#b89a78', TIM2 = '#a98c6c';
const XS = [-2.4, -1.2, 0, 1.2, 2.4]; // post positions along x
const H = 1.4; // fence height
// posts on stone bases, rails between them, corner braces (diagonal struts) at both ends
const fenceParts = (show) => {
  const p = [];
  XS.forEach((x, i) => { p.push(stone([.42, .16, .42], [x, .08, 0])); p.push(box([.2, H, .2], [x, .16 + H / 2, 0], i % 2 ? TIM : TIM2)); });
  [.35, .8, 1.25].forEach((y) => p.push(box([2 * 2.4 + .3, .09, .09], [0, y, 0], TIM2)));  // three horizontal rails
  // corner braces: a diagonal from the top of each end post down to the ground rail (length and angle from the two points)
  [[XS[0], 1], [XS[XS.length - 1], -1]].forEach(([x0, sd]) => { const x1 = x0 + sd * .95, y0 = 1.15, y1 = .3, L = Math.hypot(x1 - x0, y0 - y1), ang = Math.atan2(y1 - y0, x1 - x0);
    p.push(box([L, .11, .11], [(x0 + x1) / 2, (y0 + y1) / 2, 0], TIM2, { rot: [0, 0, ang] })); });
  return p;
};
const fence = obj('fence', fenceParts(), .2);
const ground = obj('pad', [box([6.2, .04, 1.2], [0, .02, 0], '#7a5a36', { tex: null, rough: 1 })], 0);
const scenery = [{ id: 'g1', type: 'glb', pos: [-3.4, 0, 1.6], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [3.3, 0, 1.4], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' }, { id: 'tr', type: 'glb', pos: [5, 0, -2.6], params: { model: 'ph/island_tree_01', height: 4.5 }, anim: 'grow' }];
const beats = [
  // hook: a fence that falls in the first wind
  { t: 0, kind: 'intro', add: [{ id: 'wind', type: 'stake', pos: [0, 1, 0], params: {}, anim: 'none' }, stk('q', 'question', [-3, 2.4, 0], .34, { delay: .5 }), ...scenery, ground], camera: { preset: 'hero', target: [0, .8, 0], dist: 11, elev: .25, az: .3, zoom: 'in' } },
  // a post that is only buried in the soil moves over time
  { t: at(1), kind: 'problem', remove: ['q', 'wind'], add: [obj('bad', [box([.2, H, .2], [0, .16 + H / 2, 0], TIM)], .1), stk('w', 'warning', [1.2, 1.8, 0], .3, { pulse: true, delay: .3 })], camera: { preset: 'close', target: [0, .7, 0], dist: 4.6, elev: .2, az: .3, zoom: 'in' } },
  // fix: posts on stone bases, then the horizontal rails
  { t: at(2), kind: 'solution', remove: ['bad', 'w'], add: [fence, stk('ok', 'check', [0, 2.0, 0], .32, { delay: .6 })], camera: { preset: 'close', target: [0, .7, 0], dist: 7.5, elev: .2, az: .3, zoom: 'out' } },
  // rails between posts are already in the fence; point at them
  { t: at(3), kind: 'info', remove: ['ok'], add: [stk('rail', 'point_down', [-1.2, 1.7, .25], .3, { delay: .2 })], camera: { preset: 'close', target: [0, .9, 0], dist: 6.2, elev: .15, az: .6, zoom: 'in' } },
  // corner braces at the ends take the pull and the push
  { t: at(4), kind: 'solution', remove: ['rail'], add: [stk('brace', 'circle_ring', [-2.4, .9, .4], .38, { delay: .3, bob: 0, onTop: true }), stk('brace2', 'circle_ring', [2.4, .9, .4], .38, { delay: .5, bob: 0, onTop: true })], camera: { preset: 'close', target: [-1.2, .8, 0], dist: 6, elev: .2, az: .5, zoom: 'in' } },
  // tip: treated timber lasts longer
  { t: at(5), kind: 'info', remove: ['brace', 'brace2'], add: [stk('idea', 'idea', [0, 2.2, 0], .34, { delay: .2 })], camera: { preset: 'hero', target: [0, .8, 0], dist: 11, elev: .25, az: .3, zoom: 'out' } },
  // CTA: wide orbit with a like
  { t: at(6), kind: 'info', remove: ['idea'], add: [stk('like', 'thumbs_up', [-2.8, 2.6, .2], .5, { delay: .3 })], camera: { preset: 'orbit', target: [0, .8, 0], dist: 13, elev: .3, az: .3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'سور خشب للمزرعة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
