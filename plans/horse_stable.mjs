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
// stable: timber boards (wood grain texture, vertical planks with thin gaps), open front, gabled roof with a 0.5 m ridge gap, straw floor 12x12 ft (3.66 m)
const board = (x, y, z, w, h, d, c, rot) => ({ shape: 'box', size: [w, h, d], pos: [x, y, z], color: c, wood: true, rough: .9, ...(rot ? { rot } : {}) });
const plank = i => ['#e0b98a', '#d3a97a', '#e8c496', '#d9b283'][i % 4];
const WH = 2.6, HX = 2.2, HZ = 1.8; // wall height, half width x, half depth z
const parts = [];
for (let i = 0; i < 22; i++) parts.push(board(-HX + .1 + i * .2, WH / 2, -HZ, .185, WH, .08, plank(i)));                 // back wall boards
for (let i = 0; i < 18; i++) { parts.push(board(-HX, WH / 2, -HZ + .1 + i * .2, .08, WH, .185, plank(i + 1))); parts.push(board(HX, WH / 2, -HZ + .1 + i * .2, .08, WH, .185, plank(i + 2))); } // side walls
for (const [x, z] of [[-HX, -HZ], [HX, -HZ], [-HX, HZ], [HX, HZ]]) parts.push(board(x, (WH + .1) / 2, z, .22, WH + .1, .22, '#b0865a'));     // corner posts
parts.push(board(0, WH + .02, HZ, HX * 2 + .22, .22, .22, '#b0865a'));                                                         // front header beam
const ang = .3, half = 2.0, len = half / Math.cos(ang), rise = half * Math.tan(ang), yC = WH - .05 + rise / 2 + .04;            // gable slabs
parts.push(board(0, yC, (.25 + half / 2 + .0) + 0, HX * 2 + .9, .07, len, '#c9a074', [ang, 0, 0]));
parts.push(board(0, yC, -(.25 + half / 2 + .0), HX * 2 + .9, .07, len, '#c9a074', [-ang, 0, 0]));
for (let i = 0; i < 12; i++) for (const sg of [-1, 1]) parts.push(board(-HX - .35 + i * .45 + .22, yC + .045, sg * (.25 + half / 2), .02, .02, len, '#4a3320', [sg * ang, 0, 0])); // roof board seams
parts.push(board(0, WH - .05 + rise + .32, 0, HX * 2 + .9, .06, 1.15, '#b0865a'));                                              // ridge cap above the gap
for (const x of [-1.8, 0, 1.8]) for (const sg of [-1, 1]) parts.push(board(x, WH - .05 + rise + .16, sg * .5, .08, .34, .08, '#8f6840'));   // cap brackets
const stable = { id: 'stable', type: 'custom', pos: [0, 0, 0], params: { parts }, anim: 'rise', dust: false };
const strawFloor = { id: 'straw', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [3.66, .05, 3.66], pos: [0, .03, 0], color: '#b79c5c', rough: 1 }] }, anim: 'fade', dust: false };
const ridgeGap = { id: 'gap', type: 'sticker', pos: [0, WH + rise + .9, 0], params: { name: 'point_down', size: .8, bob: .06 }, anim: 'grow', dust: false };
const heat = { id: 'heat', type: 'heat', pos: [0, 1.3, 0], params: { w: 4.2, h: 2.4, d: 3.4 }, anim: 'fade', dust: false };
const horse = (more = {}) => glb('horse', 'animals_pack/Horse', [0, 0, 0], 1.9, { clip: 'Idle', footLock: true }, { anim: 'grow', ...more });
const beats = [
  // 1 hook: open stable front, horse inside, one question sticker
  { t: 0, kind: 'intro', add: [...scenery, stable, horse(), st('q', 'question', [-3.4, 4.2, 0], .8, { bob: .08, pulse: true }, { delay: .3 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 1.6, 0], dist: 14, elev: .3, az: .3, zoom: 'in' } },
  // 2 room: stall walls appear, horse turns around
  { t: at(1), kind: 'info', remove: ['q'], add: [strawFloor, st('c2', 'circle_ring', [1.5, .5, 1.5], 1.1, { bob: .03 }, { delay: .2 })],
    modes: { horse: { clip: 'Walk', path: [[-1, .6], [1, .6]], footLock: true } }, camera: { preset: 'hero', target: [0, 1.1, 0], dist: 13, elev: .32, az: .25, zoom: 'in' } },
  // 3 problem: no airflow, hot damp air stays in
  { t: at(2), kind: 'problem', remove: ['c2', 'gap'], add: [heat, st('x3', 'warning', [0, 4.6, 0], .8, { pulse: true }, { delay: .2 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 1.8, 0], dist: 13, elev: .3, az: -.2, zoom: 'out' } },
  // 4 fix: a gap under the roof ridge lets hot air out
  { t: at(3), kind: 'solution', remove: ['heat', 'x3'], add: [ridgeGap, st('up4', 'arrow_up', [0, 5.0, 0], .8, { bob: .08 }, { delay: .3 }), st('ck4', 'check', [-3.4, 4.2, 0], .7, {}, { delay: .5 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 2.6, 0], dist: 14, elev: .35, az: .35, zoom: 'in' } },
  // 5 twist: horse kicks, boards must be thick
  { t: at(4), kind: 'info', remove: ['up4', 'ck4', 'gap', 'straw'], add: [st('f5', 'face_wow', [-2.8, 1.8, .6], .8, { pulse: true }, { delay: .2 })],
    modes: { horse: { clip: 'Attack_Kick' } }, camera: { preset: 'hero', target: [0, 1.0, 0], dist: 10, elev: .2, az: -.25, zoom: 'in' } },
  // 6 calm horse, healthy: idle beside the fresh wall
  { t: at(5), kind: 'solution', remove: ['f5'], add: [st('ok6', 'check', [-3.4, 4.2, 0], .7, {})],
    modes: { horse: { clip: 'Eating' } }, camera: { preset: 'hero', target: [0, 1.0, 0], dist: 10, elev: .3, az: .25, zoom: 'out' } },
  // 7 CTA: orbit pull-out
  { t: at(6), kind: 'info', remove: ['ok6'], camera: { preset: 'orbit', target: [0, 1.0, 0], dist: 18, elev: .38, az: .2, zoom: 'out' } },
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
