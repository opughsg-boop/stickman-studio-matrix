// "إزاي مية البحر بتتحول لملح أبيض؟" - hyper-realistic build-up: salt pans by the sea (5 shallow ponds, per-beat water level / pink / salt crust),
// sea pipe + pump + sluice, salt dissolving in a glass of sea water, evaporation wisps, pink brine, cubic crystals, rakers, white mounds, rain melting them.
// Real 3D sky (default), desert horizon, bare sandy soil, flamingos overhead. Real sizes in metres.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const ws = S[i].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
// pans state per beat (modes replace each other, so every beat passes the full state); ponds: 0 reservoir, 1, 2 (back row), 3, 4 crystallizer (front row)
const PAN = (level, pink, crust, flow, dur) => ({ level, pink, crust, flow, dur });
const Z5 = [0, 0, 0, 0, 0], PK = [0, .15, .45, .8, 1];
const HOOK = PAN([.85, .75, .6, .5, .35], [0, .12, .45, .8, 1], [0, 0, 0, .35, .85], 1, .1);
const GL = [-4.6, 0, -.25]; // wooden crate + glass of sea water, on the path in front of the reservoir
const mound = (id, pos, h, extra = {}, more = {}) => ({ id, type: 'salt_mound', pos, params: { h, r: h * 1.05, ...extra }, anim: 'grow', dust: false, ...more });
const raker = (id, pos, rotY, extra = {}, more = {}) => ({ id, type: 'raker', pos, rotY, params: { amp: .25, ...extra }, anim: 'grow', dust: false, ...more });
const scenery = [
  { id: 'pans', type: 'salt_pans', pos: [0, 0, 0], params: { ...HOOK }, anim: 'none', dust: false },
  { id: 'sluice', type: 'sluice', pos: [-8, 0, -3.2], params: { len: 1.1, on: 1 }, anim: 'none', dust: false },
  raker('w0', [-7.45, 0, -1.75], Math.PI / 2, { amp: .06, rate: .9, man: 'modular_men/Farmer', reach: 1.6 }),
  glb('palm1', 'crops_pack/PalmTree_4', [-7.1, 0, -6.3], 8, { sway: .01 }), glb('palm2', 'crops_pack/PalmTree_3', [-5.3, 0, -6.5], 7, { sway: .012, ph: 2 }),
  { id: 'hut', type: 'mudhouse', pos: [5.9, 0, -6.1], params: { w: 2.4, d: 1.4, h: 2.3 }, anim: 'grow', dust: false },
  glb('rock1', 'nature_pack/Rock_2', [7.4, 0, 1.2], .5), glb('rock2', 'nature_pack/Rock_3', [2.5, 0, -6.4], .4), glb('rock3', 'nature_pack/Rock_1', [-7.5, 0, 6.3], .45),
  glb('bush1', 'simple_nature_pack/Bush1', [-1.5, 0, -6.3], .7, { sway: .02 }), glb('bush2', 'simple_nature_pack/Bush2', [7.3, 0, 3.9], .8, { sway: .02, ph: 1 })];

const b = [];
// 1 hook: the whole salt farm by the sea in bright sun, pink crystallizer, white mounds, a raker at work, wisps of evaporation
b.push({ t: 0, kind: 'intro', add: [...scenery, mound('m0a', [-5, 0, 2.2], 1.9), mound('m0b', [-6.4, 0, 5.2], 1.4), raker('r0', [.2, 0, 1.2], -Math.PI / 2),
    { id: 'v0', type: 'vapour', pos: [0, 0, -1.2], params: { w: 13, d: 8.5, count: 50, opacity: .16 }, anim: 'fade', dust: false }],
  modes: { pans: HOOK }, camera: { preset: 'hero', target: [0, .3, -.3], dist: 26, elev: .5, az: .3, zoom: 'in' } });
// 2 sea water is salty: the pump draws it up the pipe, then a glass: grains drop in and vanish (~3.5 % dissolved)
b.push({ t: at(1), kind: 'info', remove: ['m0a', 'm0b', 'r0', 'v0'], modes: { pans: PAN(Z5, Z5, Z5, 0, 1.2), sluice: { on: 1 } },
  camera: { preset: 'close', target: [-8, -.6, -3.2], dist: 6.5, elev: .18, az: -.95, zoom: 'in' } });
b.push({ t: word(1, /دايب/, .45), kind: 'info', add: [{ id: 'crate', type: 'crate', pos: GL, params: { s: .8 }, anim: 'grow', dust: false }, { id: 'glass', type: 'brine_glass', pos: [GL[0], .8, GL[2]], params: {}, anim: 'grow', dust: false, delay: .2 }],
  camera: { preset: 'close', target: [GL[0], .87, GL[2]], dist: 1.0, elev: .22, az: .5, zoom: 'in' } });
b.push({ t: word(1, /حوالي/, .75), kind: 'info', camera: { preset: 'close', target: [GL[0], .86, GL[2]], dist: .6, elev: .12, az: .3, zoom: 'in' } });
// 3 the salt worker lets sea water into wide shallow ponds
b.push({ t: at(2), kind: 'solution', modes: { sluice: { on: 1 }, pans: PAN([.9, .1, 0, 0, 0], Z5, Z5, 0, 2) }, camera: { preset: 'hero', target: [-6.2, .4, -2.6], dist: 7.5, elev: .35, az: -.5, zoom: 'out' } });
b.push({ t: word(2, /احواض|أحواض/, .55), kind: 'info', modes: { sluice: { on: 1 }, pans: PAN([.9, .85, 0, 0, 0], Z5, Z5, 1, 3) }, camera: { preset: 'hero', target: [-1.5, .3, -3], dist: 12.5, elev: .45, az: -.25, zoom: 'in' } });
// 4 problem: left like that, the salt just stays dissolved
b.push({ t: at(3), kind: 'problem', modes: { sluice: { on: 0 }, pans: PAN([.9, .85, 0, 0, 0], Z5, Z5, 0, 1) }, camera: { preset: 'close', target: [GL[0], .8, GL[2]], dist: 1.7, elev: .2, az: -.55, zoom: 'in' } });
// 5 fix: sun and wind evaporate the water slowly, the level drops, the salt concentrates
b.push({ t: at(4), kind: 'solution', remove: ['glass', 'crate'], add: [{ id: 'v1', type: 'vapour', pos: [-1.2, 0, -3.2], params: { w: 10.5, d: 4, count: 46, opacity: .24 }, anim: 'fade', dust: false },
    { id: 'wind', type: 'wind', pos: [0, 0, -2.6], params: { w: 18, d: 6, count: 18, y0: .8, y1: 4 }, anim: 'fade', dust: false, delay: .4 },
    { id: 'clock', type: 'clock24', pos: [-4.4, .55, -.55], params: { r: .42 }, anim: 'grow', delay: .6 }],
  modes: { pans: PAN([.45, .4, 0, 0, 0], [.05, .1, 0, 0, 0], Z5, 0, Math.max(2, at(5) - at(4))), clock: { speed: 10 } }, camera: { preset: 'hero', target: [-1.5, .7, -2.8], dist: 12.5, elev: .38, az: .28, zoom: 'in' } });
// 6 days later: pond to pond, each smaller, the water turns pink (salt-loving microbes)
b.push({ t: at(5), kind: 'info', remove: ['clock', 'wind'], modes: { pans: PAN([.35, .4, .55, .55, .45], PK, Z5, 1, 4), v1: { s: .6 } },
  camera: { preset: 'hero', target: [.6, .2, -1], dist: 17, elev: .62, az: .22, zoom: 'in' } });
b.push({ t: word(5, /لونها/, .55), kind: 'info', camera: { preset: 'hero', target: [2, .2, .2], dist: 9.5, elev: .5, az: .35, zoom: 'in' } });
// 7 saturated brine: white cubic crystals grow on the floor
b.push({ t: at(6), kind: 'solution', remove: ['v1'], modes: { pans: PAN([.35, .4, .5, .4, .22], PK, [0, 0, .1, .5, 1], 0, Math.max(2.5, at(7) - at(6))) },
  camera: { preset: 'close', target: [-.6, .15, 1.6], dist: 3.2, elev: .5, az: .2, zoom: 'in' } });
b.push({ t: word(6, /بلورات/, .6), kind: 'info', camera: { preset: 'detail', target: [-.4, .13, 1.9], dist: 1.35, elev: .45, az: .15, zoom: 'in' } });
// 8 rake into tall white mounds, wash and dry
b.push({ t: at(7), kind: 'solution', add: [raker('r1', [.2, 0, 1.2], -Math.PI / 2), raker('r2', [4.3, 0, 1.0], -Math.PI / 2, { ph: 1.7, man: 'modular_men/Farmer' }, { delay: .3 }),
    mound('m1', [-5, 0, 2.2], 1.9, { growTime: 4, from: .2 }), mound('m2', [-6.4, 0, 5.2], 1.4, { growTime: 3.5, from: .2 }, { delay: .8 }), mound('m3', [-3.6, 0, 5.3], 1.2, { growTime: 3, from: .2 }, { delay: 1.4 }),
    glb('cart', 'medieval_village_pack/Cart', [-1.3, 0, 4.7], 1.4, {}, { rotY: .35, delay: .5 }), glb('bags', 'medieval_village_pack/Bags', [.7, 0, 4.4], .6, {}, { delay: .7 })],
  modes: { pans: PAN([.35, .4, .5, .3, .05], PK, [0, 0, .1, .6, 1], 0, 2) }, camera: { preset: 'hero', target: [-2.6, .8, 2.6], dist: 9.5, elev: .3, az: .35, zoom: 'out' } });
b.push({ t: word(7, /ويغسلوه|يغسلوه/, .6), kind: 'info', camera: { preset: 'close', target: [-4.6, .9, 2.6], dist: 8.5, elev: .26, az: .45, zoom: 'in' } });
// 9 rain is the salt worker's enemy: a cloud, rain, the mound slumps and turns back to brine
b.push({ t: at(8), kind: 'problem', add: [{ id: 'cloud', type: 'cloud', pos: [-4.6, 6.2, 3.2], params: { w: 5, d: 3, count: 34, color: '#9aa1aa' }, anim: 'fade', dust: false },
    { id: 'rain', type: 'rain', pos: [-4.6, 0, 3.2], params: { w: 5, d: 3.4, h: 6, count: 220 }, anim: 'fade', dust: false, delay: .5 }],
  modes: { m1: { melt: .65, dur: 3.2 }, m3: { melt: .55, dur: 3 }, pans: PAN([.5, .5, .6, .5, .45], PK, [0, 0, .05, .25, .45], 0, 3) },
  camera: { preset: 'hero', target: [-4.4, 1.4, 2.8], dist: 13, elev: .32, az: .3, zoom: 'in' } });
// 10 CTA: wide orbit pull-out over the whole salt farm
b.push({ t: at(9), kind: 'info', remove: ['cloud', 'rain'], modes: { m1: { melt: 0, dur: 2.5 }, m3: { melt: 0, dur: 2.5 }, pans: PAN([.35, .4, .5, .35, .2], PK, [0, 0, .1, .6, .9], 1, 3) },
  camera: { preset: 'orbit', target: [0, .5, 0], dist: 22, elev: .45, az: .1, zoom: 'out' } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي مية البحر بتتحول لملح أبيض',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'coast_sand_rocks_02', soilRepeat: 2, horizon: 'desert', cover: false, birds: 4, birdModel: 'Flamingo', island: { w: 16, d: 14, depth: 3.2 }, soilTint: [1.18, 1.08, .9], motes: .5 },
  style: { camEase: .6, captionY: .78, exposure: 1.0 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
