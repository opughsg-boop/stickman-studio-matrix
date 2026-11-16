// English (US) rooftop bees video, built on the Egyptian roof pack. Realism: roof, city and bees from the same pack.
// Problem/fix pairs: damp + ants -> stand in water cans; summer heat -> shade net + vent gap; bees seek water at the neighbour's tank -> shallow tray
// with brick and stones; bees at head height -> 2 m flyway screen; talk to the neighbours; CTA orbit over the roof and the city.
// Roof pack in renderer/scene.js (rooftop, city, bee_hive, hive_stand, shade_net, water_tray, bee_screen, ant_trail, damp_patch, heat_haze, roof_person).
// Real sizes in metres: Langstroth hive 0.51 x 0.41 x 0.6 m, person 1.75, parapet 1 m, screen 2 m. Bees are ~4 cm (x2.5) so they read on a phone.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

const ENT = [.36, .6, 0];          // hive entrance (+x side) once the hive sits on its 0.5 m stand
const TANK_N = [9.3, .32, -3.7];    // drip puddle under the neighbour's water tank
const TRAY = [-1.4, 0, 1.2];
const PLANTS = [[-3.6, .2, -2.6, 'shrub_01', 1.0], [-3.7, .2, .6, 'fern_02', .7], [-2.9, .2, 2.9, 'flower_gazania', .45], [3.4, .2, 2.6, 'shrub_02', .9], [-.9, .2, 3.1, 'dandelion_01', .4], [3.6, .2, -2.9, 'fern_02', .8]].map(([x, y, z, m, h], i) => ({ id: 'pl' + i, type: 'custom', pos: [x, .25, z], params: { parts: [{ shape: 'cylinder', size: [.42, .34, .42], pos: [0, .17, 0], color: '#b5532f', rough: .9 }] }, anim: 'none', dust: false }))
  .concat([[-3.6, -2.6, 1.0, 'shrub_01'], [-3.7, .6, .7, 'fern_02'], [-2.9, 2.9, .45, 'flower_gazania'], [3.4, 2.6, .9, 'shrub_02'], [-.9, 3.1, .4, 'dandelion_01'], [3.6, -2.9, .8, 'fern_02']].map(([x, z, h, m], i) => ({ id: 'pm' + i, type: 'glb', pos: [x, .6, z], params: { model: 'ph/' + m, height: h }, anim: 'none', dust: false })));
const FLOOR = { id: 'floor', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [40, .3, 34], pos: [0, .1, 0], color: '#cdb596', rough: .35 }] }, anim: 'none', dust: false };
const scenery = [FLOOR, ...PLANTS, 
  { id: 'roof', type: 'rooftop', pos: [0, 0, 0], params: { w: 10, d: 8, depth: 3.8, tiles: true, facade: '#d8c3a0', stair: { x: 3.4, z: -2.5, w: 2.4, d: 2.6, h: 2.5 },
      dishes: [[-.9, -3.45, .2, .8], [1.1, -3.5, -.2, .7]], laundry: [[-4.3, -3.0, 2.8, 0, 3]] }, anim: 'none', dust: false },
  { id: 'nroof', type: 'rooftop', pos: [10.3, .3, -1], params: { w: 8, d: 10, depth: 4.1, front: 'full', facade: 'brick', stair: { x: 2, z: -3.2, w: 2.2, d: 2.4, h: 2.4, color: '#e2cf9e', door: '#7a5a3a', tank: false },
      tanks: [[-1.4, 0, -2.7, '#2c2c2c']], dishes: [[-.5, -4.4, 0, .8]], laundry: [[-2.6, -1.2, 3.2, 0, 8], [-2.6, 3.2, 2.6, 0, 11]] }, anim: 'none', dust: false },
  { id: 'city', type: 'city', pos: [0, 0, 0], params: { ground: -3.8, count: 40, r0: 15, r1: 75, avoid: [[-7, 7, -6, 6], [5, 16, -8, 6], [12, 32, -9, 7]] }, anim: 'none', dust: false },
  { id: 'hive', type: 'bee_hive', tag: 'hive', pos: [0, 0, 0], params: { boxes: 2 }, anim: 'none', dust: false },
  { id: 'keeper', type: 'roof_person', pos: [-.5, 0, -.8], rotY: .55, params: { model: 'modular_men/Casual', height: 1.75, suit: true, veil: true }, anim: 'none', dust: false },
  { id: 'nb', type: 'roof_person', pos: [7.3, .3, 1.0], rotY: -1.45, params: { model: 'modular_women/Casual', height: 1.65 }, anim: 'none', dust: false },
  { id: 'bees', type: 'bees', pos: [0, 0, 0], params: { count: 18, scale: .16 }, anim: 'none', dust: false },
  { id: 'scout', type: 'bees', pos: [0, 0, 0], params: { count: 3, scale: .16 }, anim: 'none', dust: false }];

const b = [];
const stk2 = stk;
b.push({ t: 0, kind: 'intro', add: [...scenery, stk('q', 'question', [-.6, 2.2, 0], .35, { bob: .05, pulse: true })],
  modes: { bees: { mode: 'swarm', c: [.25, .75, 0], r: .7, h: .3 }, scout: { mode: 'stream', from: [-12, 7, -24], to: [.35, .12, 0] } },
  camera: { preset: 'hero', target: [-.1, .8, -.2], dist: 6, elev: .22, az: .35, zoom: 'in' } });
b.push({ t: at(1), kind: 'info', remove: ['scout', 'q'], camera: { preset: 'hero', target: [1.5, .8, -.8], dist: 13, elev: .42, az: .45, zoom: 'in' },
  modes: { bees: { mode: 'stream', from: ENT, to: [-6, 4, -12] } } });
b.push({ t: at(2), kind: 'problem', add: [stk('x2', 'warning', [-.2, 1.4, 0], .25, { pulse: true }), { id: 'gust', type: 'bees', pos: [0, 0, 0], params: { count: 4, scale: .16 }, anim: 'none', dust: false }],
  modes: { bees: { mode: 'swarm', c: [.3, 1.0, 0], r: .8, h: .25 }, gust: { mode: 'stream', from: ENT, to: [-3.5, 1.2, 2.5] } },
  camera: { preset: 'close', target: [-.35, .9, 0], dist: 4.6, elev: .3, az: .2, zoom: 'in' } });
b.push({ t: at(3), kind: 'solution', remove: ['gust', 'x2'], add: [
    { id: 'screen', type: 'bee_screen', pos: [1.05, 0, 0], rotY: Math.PI / 2, params: { w: 2.4, h: 2 }, anim: 'rise', dust: false },
    stk('ck3', 'check', [-.2, 2.6, 0], .3, { delay: .6 })],
  modes: { bees: { mode: 'stream', from: ENT, to: [2.9, 4.4, .3] } },
  camera: { preset: 'hero', target: [1.0, 1.2, 0], dist: 7, elev: .3, az: .45, zoom: 'out' } });
b.push({ t: at(4), kind: 'solution', remove: ['ck3', 'screen'], add: [
    { id: 'tray', type: 'water_tray', pos: TRAY, params: { r: .32 }, anim: 'grow', dust: false },
    { id: 'drink', type: 'bees', pos: [0, 0, 0], params: { count: 9, scale: .16 }, anim: 'none', dust: false, delay: .5 },
    stk('f4', 'face_wow', [-1.4, 1.1, 1.2], .25, { pulse: true, delay: .4 })],
  modes: { drink: { mode: 'swarm', c: [TRAY[0], .14, TRAY[2]], r: .22, h: .03, flat: 1 }, bees: { mode: 'stream', from: ENT, to: [TRAY[0], .15, TRAY[2]] } },
  camera: { preset: 'close', target: [-1.15, .3, .85], dist: 2.8, elev: .42, az: .25, zoom: 'in' } });
b.push({ t: at(5), kind: 'info', remove: ['f4', 'tray', 'drink'], add: [{ id: 'gar', type: 'bees', pos: [0, 0, 0], params: { count: 8, scale: .16 }, anim: 'none', dust: false }],
  modes: { gar: { mode: 'stream', from: ENT, to: [10.3, 3.2, -2.5] }, bees: { mode: 'swarm', c: [.3, 1.2, 0], r: .8, h: .3 } },
  camera: { preset: 'hero', target: [5, 1.2, -1], dist: 15, elev: .32, az: .3, zoom: 'out' } });
b.push({ t: at(6), kind: 'info', remove: ['gar'], camera: { preset: 'orbit', target: [0, 1.5, 0], dist: 17, elev: .38, az: .2, zoom: 'out' } });
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'Rooftop bees (US)',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 3, cover: 'high', coverGain: 1.0,
    cover: false, water: '#7f9fb3', fog: '#b4d0e8', haze: .3, horizon: 'hills', horizonDist: 260, waves: 0, foam: false, birds: 3, motes: 1 },
  style: { camEase: .6, captionY: .78 },
  beats: b.map((x, i) => ({ start: x.t, end: i + 1 < b.length ? b[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
