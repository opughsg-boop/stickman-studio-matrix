// "تربية النحل على السطح" (2026-11-15): hyper-realistic build-up on a sunny flat Egyptian roof.
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
const word = (i, re, fb = .5) => { const ws = S[i].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

const ENT = [.36, .6, 0];          // hive entrance (+x side) once the hive sits on its 0.5 m stand
const TANK_N = [9.3, .32, -3.7];    // drip puddle under the neighbour's water tank
const TRAY = [-1.4, 0, 1.2];
const scenery = [
  { id: 'roof', type: 'rooftop', pos: [0, 0, 0], params: { w: 10, d: 8, depth: 3.8, facade: '#d8c3a0', stair: { x: 3.4, z: -2.5, w: 2.4, d: 2.6, h: 2.5 },
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
// 1 hook: a bee flies in from the city skyline to the hive on the sunny roof; the veiled beekeeper works calmly, laundry flaps
b.push({ t: 0, kind: 'intro', add: scenery,
  modes: { bees: { mode: 'swarm', c: [.25, .75, 0], r: .7, h: .3 }, scout: { mode: 'stream', from: [-12, 7, -24], to: [.35, .12, 0] } },
  camera: { preset: 'hero', target: [-.1, .8, -.2], dist: 4.6, elev: .2, az: .35, zoom: 'in' } });
// 2a the roof: sun and open space (wide establishing)
b.push({ t: at(1), kind: 'info', remove: ['scout'], camera: { preset: 'hero', target: [1.5, .8, -.8], dist: 13, elev: .42, az: .45, zoom: 'in' } });
// 2b problem: hive straight on the slab: damp stain spreads, ants march up the wall
b.push({ t: word(1, /^بس$/, .45), kind: 'problem', add: [
    { id: 'damp', type: 'damp_patch', pos: [0, 0, .05], params: { r: .6 }, anim: 'none', dust: false },
    { id: 'ants', type: 'ant_trail', pos: [0, 0, 0], params: { count: 26, size: .03, speed: .06, pts: [[-1.3, .006, 1.2], [-.4, .006, .55], [-.12, .006, .216, 0, 1, 0], [-.12, .2, .216, 0, 0, 1], [.06, .42, .216, 0, 0, 1]] }, anim: 'none', dust: false }],
  camera: { preset: 'close', target: [-.35, .18, .4], dist: 2.3, elev: .55, az: .15, zoom: 'in' } });
// 3 fix: the hive rises onto a stand whose legs stand in cans of water; the ants turn back at the can
b.push({ t: at(2), kind: 'solution', remove: ['damp', 'ants', 'x1'], add: [
    { id: 'stand', type: 'hive_stand', pos: [0, 0, 0], params: { h: .5 }, anim: 'rise', dust: false },
    { id: 'ants2', type: 'ant_trail', pos: [0, 0, 0], params: { count: 14, size: .03, speed: .06, pingpong: true, pts: [[-1.3, .006, 1.2], [-.6, .006, .6], [-.36, .006, .3]] }, anim: 'none', dust: false, delay: .6 }],
  modes: { bees: { mode: 'swarm', c: [.3, 1.2, 0], r: .7, h: .3 } },
  camera: { preset: 'close', target: [0, .5, .1], dist: 2.6, elev: .25, az: .3, zoom: 'out' } });
// 4 problem: summer sun bakes the roof: heat shimmer, bees fan at the entrance
b.push({ t: at(3), kind: 'problem', remove: ['ants2', 'ok1'], effects: ['heat'], add: [
    { id: 'haze', type: 'heat_haze', pos: [0, 0, 0], params: { w: 3.5, d: 3, count: 16, opacity: .32 }, anim: 'none', dust: false },
    stk('hot', 'face_fever', [-.35, 1.45, .1], .22, { pulse: true, delay: .4 })],
  modes: { bees: { mode: 'swarm', c: [.44, .6, 0], r: .12, h: .04, flat: 1.2 } },
  camera: { preset: 'hero', target: [.1, .75, 0], dist: 3.3, elev: .28, az: .65, zoom: 'in' } });
// 5 fix: light shade net on a frame (open sides), the lid lifted on shims for a vent gap; shimmer gone
b.push({ t: at(4), kind: 'solution', remove: ['haze', 'hot'], add: [
    { id: 'net', type: 'shade_net', pos: [0, 0, 0], params: { w: 1.8, d: 1.8, h: 2.05 }, anim: 'grow', dust: false }],
  modes: { hive: { vent: 1, dur: 1.5 }, bees: { mode: 'swarm', c: [.3, 1.2, 0], r: .8, h: .35 } },
  camera: { preset: 'hero', target: [0, 1.1, 0], dist: 5.4, elev: .3, az: .45, zoom: 'out' } });
// 6a bees need water every day
b.push({ t: at(5), kind: 'info', remove: ['ok2'], camera: { preset: 'close', target: [.3, .65, 0], dist: 2.0, elev: .2, az: 1.0, zoom: 'in' } });
// 6b problem: none nearby -> they stream to the drip under the neighbour's water tank
b.push({ t: word(5, /^ولو$/, .4), kind: 'problem', add: [
    { id: 'puddle', type: 'damp_patch', pos: TANK_N, params: { r: .45 }, anim: 'none', dust: false }],
  modes: { bees: { mode: 'swarm', c: [TANK_N[0], .6, TANK_N[2]], r: .5, h: .25 } },
  camera: { preset: 'hero', target: [8.7, .95, -3.3], dist: 4.4, elev: .3, az: -.6, zoom: 'in' } });
// 7 fix: a shallow tray with a brick and stones on the roof; bees land and drink; no more trips next door
b.push({ t: at(6), kind: 'solution', remove: ['x3'], add: [
    { id: 'tray', type: 'water_tray', pos: TRAY, params: { r: .32 }, anim: 'grow', dust: false },
    { id: 'drink', type: 'bees', pos: [0, 0, 0], params: { count: 9, scale: .16 }, anim: 'none', dust: false, delay: .5 }],
  modes: { drink: { mode: 'swarm', c: [TRAY[0], .14, TRAY[2]], r: .22, h: .03, flat: 1 }, bees: { mode: 'stream', from: ENT, to: [TRAY[0], .15, TRAY[2]] } },
  camera: { preset: 'close', target: [-1.15, .3, .85], dist: 2.0, elev: .42, az: .25, zoom: 'in' } });
// 8 problem: bees cruise at head height across the path from the stair door; a man swats
b.push({ t: at(7), kind: 'problem', remove: ['ok3'], add: [
    { id: 'man', type: 'roof_person', pos: [2.2, 0, .4], rotY: -1.35, params: { model: 'modular_men/Casual2', height: 1.75 }, anim: 'grow', dust: false }],
  modes: { man: { wave: true }, bees: { mode: 'swarm', c: [1.5, 1.65, .2], r: 1.0, h: .2, flat: .8 } },
  camera: { preset: 'hero', target: [1.7, 1.4, .2], dist: 4.2, elev: .14, az: .5, zoom: 'in' } });
// 9 fix: a 2 m board screen in front of the entrance: bees climb over it and pass above head height; the man walks calmly under
b.push({ t: at(8), kind: 'solution', remove: ['x4'], add: [
    { id: 'screen', type: 'bee_screen', pos: [1.05, 0, 0], rotY: Math.PI / 2, params: { w: 2.4, h: 2 }, anim: 'rise', dust: false }],
  modes: { man: { wave: false, path: [[2.3, 1.6], [2.3, -.9]], pathSpeed: .12 }, bees: { mode: 'stream', from: ENT, to: [2.9, 4.4, .3] } },
  camera: { preset: 'hero', target: [1.3, 1.4, 0], dist: 6.6, elev: .2, az: .75, zoom: 'out' } });
// 10 tip: talk to the neighbours first: the neighbour waves from the next roof, bees calm
b.push({ t: at(9), kind: 'info', remove: ['ok4'], add: [stk('ok5', 'face_laugh', [7.3, 2.35, 1.0], .35, { delay: .6 })],
  modes: { nb: { wave: true }, man: { wave: true, path: null }, bees: { mode: 'swarm', c: [.4, 1.4, 0], r: .9, h: .4 } },
  camera: { preset: 'hero', target: [6.4, 1.4, .6], dist: 6, elev: .2, az: -1.1, zoom: 'in' } });
// 11 CTA: wide orbit pull-out over the whole roof setup, the city and the sky
b.push({ t: at(10), kind: 'info', remove: ['ok5'], add: [stk('like', 'thumbs_up', [-1.6, 3.2, 1], 1.1, { delay: .4 })],
  modes: { nb: { wave: false }, man: { wave: false } },
  camera: { preset: 'orbit', target: [2, .8, -.5], dist: 21, elev: .42, az: .05, zoom: 'out' } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'تربية النحل على السطح',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], lifts: [{ t: at(2) + .35, dy: .5, dur: .9 }],
  env: { island: { w: 10, d: 8, depth: 3.2 }, flatTop: true, cover: false, horizon: 'nile', water: '#a99f8c', waves: 0, foam: false, birds: 2, motes: .6, haze: .6 },
  style: { camEase: .6, captionY: .78, exposure: 1.0 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
