// "A duck house that never gets soggy" - English (US). Natural preset (locked sky/ground/clouds). No on-screen words except captions.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const st = (id, name, pos, size = .7, extra = {}, more = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...extra }, anim: 'grow', dust: false, ...more });
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const R = (n => () => (n = (n * 9301 + 49297) % 233280) / 233280)(41);
const scenery = [];
for (let i = 0; i < 22; i++) scenery.push(glb('gt' + i, `ph/grass_medium_0${1 + i % 2}`, [-6 + R() * 12, 0, -4.5 - R() * 2], .3 + R() * .2, {}, { anim: 'fade', dust: false }));
for (let i = 0; i < 4; i++) scenery.push(glb('sb' + i, `ph/shrub_0${1 + i % 3}`, [-5.5 + i * 3.6, 0, -6.5 - R()], 1 + R() * .4, {}, { anim: 'fade', dust: false }));
const board = (x, y, z, w, h, d, c, rot) => ({ shape: 'box', size: [w, h, d], pos: [x, y, z], color: c, wood: true, rough: .9, ...(rot ? { rot } : {}) });
const plank = i => ['#e0b98a', '#d3a97a', '#e8c496', '#d9b283'][i % 4];
const HX = 1.2, HZ = .9, WH = 1.3, CX = -3.8; // house half sizes, wall height, centre x
function house(id, lift, solid, more = {}) { // lift = floor height; solid floor or wire-mesh floor
  const parts = [], y0 = lift;
  for (let i = 0; i < 12; i++) parts.push(board(-HX + .1 + i * .2, y0 + WH / 2, -HZ, .185, WH, .07, plank(i)));
  for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) parts.push(board(sx * HX, y0 + WH / 2, -HZ + .1 + i * .2, .07, WH, .185, plank(i + 1)));
  for (const [x, z] of [[-HX, -HZ], [HX, -HZ], [-HX, HZ], [HX, HZ]]) parts.push(board(x, y0 + (WH + .08) / 2, z, .12, WH + .08, .12, '#b0865a'));
  parts.push(board(0, y0 + WH + .05, HZ, HX * 2 + .12, .1, .12, '#b0865a'));
  parts.push(board(0, y0 + WH + .18, 0, HX * 2 + .5, .06, HZ * 2 + .5, '#c9a074', [.18, 0, 0]));
  if (solid) parts.push(board(0, y0 + .04, 0, HX * 2, .08, HZ * 2, '#a47850'));
  else { for (let i = 0; i < 24; i++) parts.push({ shape: 'box', size: [.02, .02, HZ * 2], pos: [-HX + .05 + i * .1, y0 + .04, 0], color: '#9aa3aa', metal: .6, rough: .4 });
    for (let k = 0; k < 6; k++) parts.push({ shape: 'box', size: [HX * 2, .02, .02], pos: [0, y0 + .03, -HZ + .1 + k * .34], color: '#9aa3aa', metal: .6, rough: .4 });
    for (const [x, z] of [[-HX + .1, -HZ + .1], [HX - .1, -HZ + .1], [-HX + .1, HZ - .1], [HX - .1, HZ - .1]]) parts.push(board(x, y0 / 2, z, .12, y0, .12, '#b0865a'));
    parts.push({ shape: 'box', size: [1.0, .05, .5], pos: [HX + .55, y0 / 2 + .02, HZ - .35], rot: [0, 0, -Math.atan2(y0, 1.0)], color: '#c9a074', wood: true, rough: .9 }); } // ramp
  return { id, type: 'custom', pos: [CX, 0, 0], params: { parts }, anim: 'rise', dust: false, ...more };
}
const mud = { id: 'mud', type: 'custom', pos: [CX, 0, 0], params: { parts: [{ shape: 'box', size: [2.2, .03, 1.7], pos: [0, .1, 0], color: '#4a3826', rough: .4 }, { shape: 'box', size: [3.2, .02, 1.6], pos: [HX + 1.4, .02, .6], color: '#4a3826', rough: .35 }] }, anim: 'fade', dust: false };
const pool = { id: 'pool', type: 'water', pos: [-.2, .03, 1.6], params: { r: 1.15 }, anim: 'fade', dust: false };
const flock = (id, more = {}) => ({ id, type: 'flock', pos: [-.5, 0, 1.2], params: { count: 5, species: 'duck', area: [3.4, 2.4], bounds: [2.2, 1.9], scale: .55 }, anim: 'grow', dust: false, ...more });
const beats = [
  { t: 0, kind: 'intro', add: [...scenery, house('hs', 0, true), mud, flock('ducks'), st('q', 'question', [CX, 3.2, 0], .8, { bob: .08, pulse: true }, { delay: .3 })],
    modes: { ducks: 'wander' }, camera: { preset: 'hero', target: [-2.2, .8, .3], dist: 12, elev: .3, az: .3, zoom: 'in' } },
  { t: at(1), kind: 'info', remove: ['q'], add: [st('c2', 'circle_ring', [CX + 2.2, .5, .6], 1.1, { bob: .03 })],
    modes: { ducks: 'scratch' }, camera: { preset: 'close', target: [-1.6, .4, 1.0], dist: 8, elev: .3, az: .3, zoom: 'in' } },
  { t: at(2), kind: 'problem', remove: ['c2'], add: [st('x3', 'warning', [CX, 2.9, 0], .8, { pulse: true }, { delay: .2 })],
    modes: { ducks: 'wander' }, camera: { preset: 'hero', target: [CX, .6, 0], dist: 10, elev: .25, az: .25, zoom: 'out' } },
  { t: at(3), kind: 'solution', remove: ['hs', 'mud', 'x3'], add: [house('hr', .45, false), st('dn4', 'arrow_down', [CX, 1.1, .2], .8, { bob: .08 }, { delay: .4 }), st('ck4', 'check', [CX, 3.2, 0], .7, {}, { delay: .5 })],
    modes: { ducks: 'wander' }, camera: { preset: 'hero', target: [CX, .8, 0], dist: 11, elev: .3, az: .3, zoom: 'in' } },
  { t: at(4), kind: 'info', remove: ['dn4', 'ck4'], add: [pool, st('f5', 'face_wow', [-.2, 2.0, 1.6], .8, { pulse: true }, { delay: .3 })],
    modes: { ducks: 'wander' }, camera: { preset: 'hero', target: [-1.6, .5, 1.0], dist: 11, elev: .28, az: -.25, zoom: 'in' } },
  { t: at(5), kind: 'solution', remove: ['f5'], add: [st('ok6', 'check', [CX, 3.2, 0], .7, {})],
    modes: { ducks: 'wander' }, camera: { preset: 'hero', target: [-2.0, .6, .6], dist: 12, elev: .3, az: .2, zoom: 'out' } },
  { t: at(6), kind: 'info', remove: ['ok6'], camera: { preset: 'orbit', target: [-2.0, .8, .5], dist: 16, elev: .38, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'A duck house that never gets soggy',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 3, cover: 'high', coverGain: 1.0,
    water: '#7f9fb3', fog: '#b4d0e8', haze: .3, horizon: 'hills', horizonDist: 260, waves: 0, foam: false, birds: 3, motes: 1 },
  style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
