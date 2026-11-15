// "Chicken tractor" (English, foreign page) - realistic 3D-sky look, no on-screen words except captions. Real size: tractor 2.4 x 1.3 x 1.0 m.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const st = (id, name, pos, size = .7, extra = {}, more = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...extra }, anim: 'grow', dust: false, ...more });
const patch = (id, x, w, color, h = .03, more = {}) => ({ id, type: 'custom', pos: [x, 0, 0], params: { parts: [{ shape: 'box', size: [w, h, 3.2], pos: [0, h / 2 + .01, 0], color, rough: 1 }] }, anim: 'fade', dust: false, ...more });
const blades = (id, x, w, count, h, more = {}) => ({ id, type: 'hay', pos: [x, .02, 0], params: { w, d: 3, count, hgt: h, color: '#5d9433' }, anim: 'grow', dust: false, ...more });
const R = (n => () => (n = (n * 9301 + 49297) % 233280) / 233280)(11);
const scenery = [];
for (let i = 0; i < 26; i++) { const x = -7 + R() * 14, z = (R() < .5 ? -1 : 1) * (1.5 + R() * 2.4); scenery.push(glb('gt' + i, `ph/grass_medium_0${1 + i % 2}`, [x, 0, z], .28 + R() * .22, {}, { anim: 'fade', dust: false })); }
for (let i = 0; i < 5; i++) scenery.push(glb('sb' + i, `ph/shrub_0${1 + i % 3}`, [-6 + i * 3 + R(), 0, -4 - R()], .9 + R() * .4, {}, { anim: 'fade', dust: false }));
for (let i = 0; i < 4; i++) scenery.push(glb('rk' + i, i % 2 ? 'ph/stone_01' : 'ph/rock_07', [-5 + i * 3.2, 0, -3.2 - R()], .22 + R() * .15, {}, { anim: 'fade', dust: false }));
// light chicken tractor: wooden frame, wire mesh on the sides, tilted roof, NO floor, two wheels and a handle
function tractor(id, x, more = {}) {
  const L = 2.4, W = 1.3, H = 1.0, wood = '#b98a55', mesh = '#9aa3aa', parts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push({ shape: 'box', size: [.07, H, .07], pos: [sx * L / 2, H / 2, sz * W / 2], color: wood });
  for (const sz of [-1, 1]) { parts.push({ shape: 'box', size: [L, .06, .06], pos: [0, .05, sz * W / 2], color: wood }); parts.push({ shape: 'box', size: [L, .06, .06], pos: [0, H, sz * W / 2], color: wood }); }
  for (const sx of [-1, 1]) { parts.push({ shape: 'box', size: [.06, .06, W], pos: [sx * L / 2, .05, 0], color: wood }); parts.push({ shape: 'box', size: [.06, .06, W], pos: [sx * L / 2, H, 0], color: wood }); }
  for (const sz of [-1, 1]) for (let i = -5; i <= 5; i++) parts.push({ shape: 'box', size: [.012, H - .1, .012], pos: [i * L / 11, H / 2, sz * W / 2], color: mesh, metal: .6, rough: .4 });
  for (const sz of [-1, 1]) for (const y of [.3, .55, .8]) parts.push({ shape: 'box', size: [L, .012, .012], pos: [0, y, sz * W / 2], color: mesh, metal: .6, rough: .4 });
  for (const sz of [-1, 1]) parts.push({ shape: 'box', size: [L + .1, .035, W / 2 + .12], pos: [0, H + .17, sz * W / 4], rot: [sz * -.32, 0, 0], color: '#2f6fb3', rough: .6 });
  for (const sz of [-1, 1]) parts.push({ shape: 'cylinder', size: [.34, .05], pos: [L / 2 + .02, .17, sz * (W / 2 + .06)], rot: [0, 0, Math.PI / 2], color: '#222', rough: .9 });
  parts.push({ shape: 'cylinder', size: [.03, W + .24], pos: [L / 2 + .02, .17, 0], rot: [Math.PI / 2, 0, 0], color: '#555', metal: .5 });
  parts.push({ shape: 'cylinder', size: [.035, 1.0], pos: [-L / 2 - .35, .62, 0], rot: [0, 0, 1.1], color: wood }); // handle
  return { id, type: 'custom', pos: [x, 0, 0], params: { parts }, anim: 'rise', ...more };
}
// heavy normal coop: solid floor + big walls + roof
function heavy(id, x, more = {}) {
  const parts = [{ shape: 'box', size: [3.4, .3, 2.6], pos: [0, .15, 0], color: '#7a5a38' }, { shape: 'box', size: [3.4, 1.7, .12], pos: [0, 1.15, -1.25], color: '#9d7648' },
    { shape: 'box', size: [.12, 1.7, 2.6], pos: [-1.65, 1.15, 0], color: '#9d7648' }, { shape: 'box', size: [.12, 1.7, 2.6], pos: [1.65, 1.15, 0], color: '#9d7648' },
    { shape: 'box', size: [3.7, .12, 2.9], pos: [0, 2.05, 0], color: '#6b4a2b' }];
  return { id, type: 'custom', pos: [x, 0, 0], params: { parts }, anim: 'rise', ...more };
}
const flock = (id, x, more = {}) => ({ id, type: 'flock', pos: [x, 0, 0], params: { count: 5, area: [1.4, .6], bounds: [.85, .4], scale: .36 }, anim: 'grow', dust: false, ...more });

const beats = [
  // 1 hook: tractor on a green lawn, hens inside
  { t: 0, kind: 'intro', add: [patch('lawn', -1, 11, '#6b9a45', .05), blades('g1', -1, 10, 900, .16), tractor('tr', -2, { anim: 'rise' }), flock('hens', -2, { delay: .3 }), ...scenery],
    modes: { hens: 'wander' }, camera: { preset: 'hero', target: [-2, .7, 0], dist: 9, elev: .3, az: .4, zoom: 'in' } },
  // 2 no floor: hens eat the fresh grass directly
  { t: at(1), kind: 'info', add: [st('s2', 'point_down', [-2, 1.9, 0], .7, { bob: .08, pulse: true })],
    modes: { hens: 'scratch' }, camera: { preset: 'low', target: [-2, .4, 0], dist: 5.2, elev: .12, az: .35, zoom: 'in' } },
  // 3 problem: a normal coop is too heavy to drag
  { t: at(2), kind: 'problem', remove: ['tr', 'hens', 's2'], add: [heavy('hv', -2), glb('fm', 'modular_men/Farmer', [-4.3, 0, 1.4], 1.75, {}, { delay: .3 })],
    modes: {}, camera: { preset: 'hero', target: [-3, 1.1, .5], dist: 8, elev: .2, az: .25, zoom: 'out' } },
  // 4 fix: light frame + wheels + wire mesh
  { t: at(3), kind: 'solution', remove: ['hv', 's3', 'fm'], add: [tractor('tr2', -2, { anim: 'rise' }), flock('hens2', -2, { delay: .3 })],
    modes: { hens2: 'wander' }, camera: { preset: 'close', target: [-2, .6, 0], dist: 6, elev: .22, az: .45, zoom: 'in' } },
  // 5 roll forward: new fresh patch ahead, eaten patch behind
  { t: at(4), kind: 'solution', remove: ['tr2', 'hens2', 's4', 'g1'], add: [patch('eaten', -3.2, 3.2, '#8a7a55', .03, { anim: 'fade' }), blades('g2', 2, 6, 520, .16), tractor('tr3', 1.2, { anim: 'fade' }), flock('hens3', 1.2, { delay: .1 }), st('s5', 'arrow_right', [-.1, 1.4, 0], .8, { nudge: true })],
    modes: { hens3: 'wander' }, camera: { preset: 'hero', target: [0, .7, 0], dist: 11, elev: .26, az: .15, zoom: 'out' } },
  // 6 twist: droppings fertilise the ground
  { t: at(5), kind: 'info', remove: ['s5'], add: [{ id: 'dr', type: 'droppings', pos: [-.4, .04, 0], params: { count: 24, w: 3, d: 1.4 }, anim: 'fade', dust: false }, st('s6', 'face_wow', [1.2, 2.3, 0], .8, { pulse: true }, { delay: .3 })],
    modes: { hens3: 'scratch' }, camera: { preset: 'low', target: [-.4, .3, 0], dist: 5.4, elev: .14, az: -.3, zoom: 'in' } },
  // 7 grass grows back thicker behind the tractor
  { t: at(6), kind: 'solution', remove: ['s6', 'eaten', 'dr'], add: [patch('back', -3.2, 3.2, '#4d8a2c', .06, { anim: 'fade' }), blades('g3', -3.2, 3.2, 1100, .3, { anim: 'rise' }), st('s7', 'arrows_cycle', [-3.2, 1.6, 0], .7, { bob: .06 })],
    modes: { hens3: 'wander' }, camera: { preset: 'hero', target: [-2, .8, 0], dist: 10, elev: .3, az: .55, zoom: 'out' } },
  // 8 CTA: wide orbit pull-out
  { t: at(7), kind: 'info', remove: ['s7'], camera: { preset: 'orbit', target: [-.5, .8, 0], dist: 15, elev: .38, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'Chicken tractor',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'forrest_ground_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
