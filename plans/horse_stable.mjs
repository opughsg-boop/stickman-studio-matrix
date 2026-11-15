// "How much room does a horse need?" - English (US), realism step 2: dense lawn, one pale sky with light clouds, no sea/sky split. No on-screen words except captions.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const st = (id, name, pos, size = .7, extra = {}, more = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...extra }, anim: 'grow', dust: false, ...more });
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const wood = '#9a7048', dark = '#5a4330', roofC = '#6e5038';
const R = (n => () => (n = (n * 9301 + 49297) % 233280) / 233280)(31);
const scenery = [];
for (let i = 0; i < 22; i++) scenery.push(glb('gt' + i, `ph/grass_medium_0${1 + i % 2}`, [-6 + R() * 12, 0, -4.5 - R() * 2], .3 + R() * .2, {}, { anim: 'fade', dust: false }));
for (let i = 0; i < 4; i++) scenery.push(glb('sb' + i, `ph/shrub_0${1 + i % 3}`, [-5.5 + i * 3.6, 0, -6 - R()], 1 + R() * .4, {}, { anim: 'fade', dust: false }));
const lawn = { id: 'lawn', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [12, .05, 9], pos: [0, .025, 0], color: '#6f9c47', rough: 1 }] }, anim: 'fade', dust: false };
// stable: back and side walls, stall partition, roof with a 0.3 m ridge gap
const stable = { id: 'stable', type: 'custom', pos: [0, 0, 0], params: { parts: [
  { shape: 'box', size: [4.4, 2.4, .14], pos: [0, 1.2, -1.6], color: wood, rough: .95 },
  { shape: 'box', size: [.14, 2.4, 3.2], pos: [-2.2, 1.2, -.0], color: wood, rough: .95 },
  { shape: 'box', size: [.14, 2.4, 3.2], pos: [2.2, 1.2, -.0], color: wood, rough: .95 },
  { shape: 'box', size: [.14, 1.6, 1.6], pos: [0, .8, .8], color: dark, rough: .95 },
  { shape: 'box', size: [4.8, .1, 1.9], pos: [-1.2, 2.5, .6], rot: [-.38, 0, 0], color: roofC, rough: .9 },
  { shape: 'box', size: [4.8, .1, 1.9], pos: [1.2, 2.5, .6], rot: [.38, 0, 0], color: roofC, rough: .9 }] }, anim: 'rise', dust: false };
const stallWall = { id: 'stallW', type: 'custom', pos: [0, 0, 0], params: { parts: [
  { shape: 'box', size: [3.6, 1.8, .12], pos: [0, .9, -.9], color: wood, rough: .95 }] }, anim: 'rise', dust: false };
const ridgeGap = { id: 'gap', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [.5, .08, 3.4], pos: [0, 2.95, .5], color: '#20160e', rough: 1 }] }, anim: 'rise', dust: false };
const heat = { id: 'heat', type: 'heat', pos: [0, 1.2, 0], params: { w: 4.2, h: 2.4, d: 3.4 }, anim: 'fade', dust: false };
const horse = (more = {}) => glb('horse', 'animals_pack/Horse', [-.2, 0, .6], 1.9, { clip: 'Idle' }, { anim: 'grow', ...more });
const beats = [
  // 1 hook: open stable front, horse inside, one question sticker
  { t: 0, kind: 'intro', add: [...scenery, stable, horse(), st('q', 'question', [-3.2, 3.2, 0], .8, { bob: .08, pulse: true }, { delay: .3 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 1.2, 0], dist: 11, elev: .3, az: .4, zoom: 'in' } },
  // 2 room: stall walls appear, horse turns around
  { t: at(1), kind: 'info', remove: ['q'], add: [stallWall, st('c2', 'circle_ring', [1.4, 1.2, .7], 1.1, { bob: .03 }, { delay: .2 })],
    modes: { horse: { clip: 'Walk', path: [[-1, .6], [1, .6], [1, -.2], [-1, -.2]], pathSpeed: .35 } }, camera: { preset: 'hero', target: [0, 1.0, .4], dist: 12, elev: .3, az: .3, zoom: 'in' } },
  // 3 problem: no airflow, hot damp air stays in
  { t: at(2), kind: 'problem', remove: ['c2', 'gap'], add: [heat, st('x3', 'warning', [0, 3.3, 0], .8, { pulse: true }, { delay: .2 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'close', target: [0, 1.6, .2], dist: 9, elev: .3, az: -.25, zoom: 'out' } },
  // 4 fix: a gap under the roof ridge lets hot air out
  { t: at(3), kind: 'solution', remove: ['heat', 'x3'], add: [ridgeGap, st('up4', 'arrow_up', [0, 3.6, .5], .8, { bob: .08 }, { delay: .3 }), st('ck4', 'check', [-3.2, 3.2, 0], .7, {}, { delay: .5 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 1.8, .2], dist: 13, elev: .35, az: .45, zoom: 'in' } },
  // 5 twist: horse kicks, boards must be thick
  { t: at(4), kind: 'info', remove: ['up4', 'ck4'], add: [st('f5', 'face_wow', [-2.8, 1.8, .6], .8, { pulse: true }, { delay: .2 })],
    modes: { horse: { clip: 'Attack_Kick' } }, camera: { preset: 'low', target: [-.6, .8, .6], dist: 6, elev: .15, az: -.35, zoom: 'in' } },
  // 6 calm horse, healthy: idle beside the fresh wall
  { t: at(5), kind: 'solution', remove: ['f5'], add: [st('ok6', 'check', [-3.2, 3.2, 0], .7, {})],
    modes: { horse: { clip: 'Eating' } }, camera: { preset: 'close', target: [0, 1.0, .6], dist: 7, elev: .35, az: .25, zoom: 'out' } },
  // 7 CTA: orbit pull-out
  { t: at(6), kind: 'info', remove: ['ok6'], camera: { preset: 'orbit', target: [0, 1.0, 0], dist: 15, elev: .38, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'How much room does a horse need',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 3, cover: 'high', coverGain: 1.0,
    water: '#7f9fb3', fog: '#b4d0e8', haze: .3, horizon: 'hills', horizonDist: 260, waves: 0, foam: false, birds: 3, motes: 1 },
  style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
