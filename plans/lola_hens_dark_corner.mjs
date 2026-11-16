// "Why do hens pick the dark corner?" - English (US), realistic 3D-sky look, no on-screen words except captions.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const st = (id, name, pos, size = .7, extra = {}, more = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...extra }, anim: 'grow', dust: false, ...more });
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const R = (n => () => (n = (n * 9301 + 49297) % 233280) / 233280)(23);
const scenery = [];
for (let i = 0; i < 22; i++) scenery.push(glb('gt' + i, `ph/grass_medium_0${1 + i % 2}`, [-6 + R() * 12, 0, -4 - R() * 2], .3 + R() * .2, {}, { anim: 'fade', dust: false }));
for (let i = 0; i < 4; i++) scenery.push(glb('sb' + i, `ph/shrub_0${1 + i % 3}`, [-5.5 + i * 3.6, 0, -5.5 - R()], 1 + R() * .4, {}, { anim: 'fade', dust: false }));
const lawn = { id: 'lawn', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [12, .05, 9], pos: [0, .025, 0], color: '#6b9a45', rough: 1 }] }, anim: 'fade', dust: false };
// dim corner: a timber shed wall + roof on two sides, a burlap curtain over the open front
const corner = { id: 'corner', type: 'custom', pos: [0, 0, 0], params: { parts: [
  { shape: 'box', size: [3.2, 2.2, .14], pos: [2.4, 1.1, -1.6], color: '#8a6a44', rough: .95 },
  { shape: 'box', size: [.14, 2.2, 2.6], pos: [.8, 1.1, -.3], color: '#8a6a44', rough: .95 },
  { shape: 'box', size: [3.4, .12, 3], pos: [2.4, 2.3, -.1], color: '#5a4530', rough: .9 },
  { shape: 'box', size: [1.1, 1.3, .03], pos: [1.6, 1.0, .05], color: '#b9a27a', rough: 1 }] }, anim: 'rise', dust: false };
const nest = { id: 'nest', type: 'nest_box', pos: [2.1, 0, -1.2], params: { count: 2, y: .25 }, anim: 'rise', dust: false };
const bright = { id: 'bright', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [1.6, .8, 1], pos: [-3.2, .65, 2.3], color: '#e9e4d6', rough: .8 }] }, anim: 'rise', dust: false };
const flock = (id, more = {}) => ({ id, type: 'flock', pos: [0, 0, 0], params: { count: 5, area: [6, 4], bounds: [4.5, 3.4], scale: .36 }, anim: 'grow', dust: false, ...more });
const beats = [
  // 1 hook: open lawn in bright daylight, hens scattered, one bright open nest box
  { t: 0, kind: 'intro', add: [lawn, ...scenery, bright, flock('hens'), st('q', 'question', [-1, 2.6, 0], .8, { bob: .08, pulse: true }, { delay: .3 })],
    modes: { hens: 'wander' }, camera: { preset: 'hero', target: [-1, .6, 0], dist: 11, elev: .3, az: .4, zoom: 'in' } },
  // 2 safe when unseen: hens drift toward the corner
  { t: at(1), kind: 'info', remove: ['q'], add: [st('c2', 'circle_ring', [0, 1.1, 2.2], 1.0, { bob: .03 })],
    modes: { hens: 'wander' }, camera: { preset: 'close', target: [-.5, .5, 1], dist: 7, elev: .25, az: .3, zoom: 'in' } },
  // 3 bright open box makes hens nervous
  { t: at(2), kind: 'problem', remove: ['c2'], add: [st('x3', 'warning', [-3.2, 2.0, 2.3], .8, { pulse: true }, { delay: .2 })],
    modes: { hens: 'pant' }, camera: { preset: 'close', target: [-2.5, .6, 2], dist: 8, elev: .3, az: -.25, zoom: 'out' } },
  // 4 fix: dim corner with a curtain and a nest inside
  { t: at(3), kind: 'solution', remove: ['bright', 'x3'], add: [corner, nest, st('ck4', 'check', [2.4, 2.7, -.4], .7, { pulse: false }, { delay: .5 })], effects: ['night'],
    modes: { hens: 'wander' }, camera: { preset: 'hero', target: [1.2, 1.1, -.3], dist: 9, elev: .3, az: .45, zoom: 'in' } },
  // 5 twist: hens crowd around the best dark box
  { t: at(4), kind: 'info', remove: ['ck4'], add: [st('f5', 'face_wow', [.6, 2.1, -.9], .8, { pulse: true }, { delay: .3 })], effects: ['night'],
    modes: { hens: 'scratch' }, camera: { preset: 'low', target: [1.6, .5, 0], dist: 6, elev: .15, az: -.35, zoom: 'in' } },
  // 6 calm hens lay more eggs
  { t: at(5), kind: 'solution', remove: ['f5'], add: [st('ok6', 'check', [2.4, 2.7, -.4], .7, { pulse: false })], effects: ['night'],
    modes: { hens: 'sleep' }, camera: { preset: 'close', target: [1.6, .8, -.6], dist: 7, elev: .35, az: .25, zoom: 'out' } },
  // 7 CTA: orbit
  { t: at(6), kind: 'info', remove: ['ok6'], camera: { preset: 'orbit', target: [0, .8, 0], dist: 15, elev: .38, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'Why hens pick the dark corner',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: {
    // v3 (realism step 1): dense natural lawn over the whole island top, one even pale sky with light clouds, no hard sea/sky split
    sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 3, cover: 'high', coverGain: 1.0,
    water: '#7f9fb3', fog: '#b4d0e8', haze: .3, horizon: 'hills', horizonDist: 260, waves: 0, foam: false, birds: 3, motes: 1 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
