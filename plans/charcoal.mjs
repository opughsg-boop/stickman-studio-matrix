// "إزاي الفحم بيتعمل من الخشب؟" - hyper-realistic build-up: kiln mound with cutaway, vents, inner glow, charring, smoke colour. Real sky (default), real sizes.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const ws = S[i].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const KP = [.4, 0, -.7], R = 1.8, H = 1.6; // kiln: real size (3.6 m wide, 1.6 m tall)
const K = (o) => ({ cover: 1, vents: 0, glow: 0, char: 0, ...o }); // full kiln state per beat (modes replace each other)
const arrow = (id, from, to, color, delay = 0) => ({ id, type: 'arrow', pos: [0, 0, 0], params: { from, to, head: .2, color }, anim: 'grow', delay, dust: false });
const smokeW = { id: 'smokeW', type: 'smoke', pos: [KP[0], H, KP[2] - .2], params: { h: 7, w: .7, scale: .75, color: '#cfcbc4', top: '#f2efe9', opacity: .85, drift: 1.2, count: 60 }, anim: 'fade', dust: false };
const smokeB = { id: 'smokeB', type: 'smoke', pos: [KP[0], H, KP[2] - .2], params: { h: 7, w: .4, scale: .45, color: '#8fa2bf', top: '#c8d3e3', opacity: .38, drift: 1.6, count: 34 }, anim: 'fade', dust: false };
const scenery = [
  glb('worker', 'modular_men/Worker', [3.1, 0, 1.3], 1.75, {}, { delay: .3 }), glb('axe', 'ph/hatchet', [2.6, 0, 1.9], .45),
  glb('stump', 'nature_pack/TreeStump', [-4.2, 0, -2.6], .7), glb('log1', 'nature_pack/WoodLog', [3.4, 0, -2.4], .45), glb('log2', 'nature_pack/WoodLog', [-1.9, 0, 3.3], .4),
  glb('hay', 'medieval_village_pack/Hay', [3.9, 0, -.6], .8),
  ...[[-4.6, 3.6], [4.6, 3.8], [-4.8, -.4], [1.6, 4.4], [-.4, -4.5], [4.8, -3.6]].map(([x, z], i) => glb('gr' + i, i % 2 ? 'ph/grass_medium_02' : 'ph/grass_medium_01', [x, 0, z], .5)),
  ...[[-3, -4.2], [5, 1.2], [-5, 2]].map(([x, z], i) => glb('st' + i, 'ph/rock_07', [x, 0, z], .35))];
const OP = [-3.5, 0, 1.9]; // open fire spot

const b = [];
b.push({ t: 0, kind: 'intro', add: [...scenery, { id: 'k0', type: 'kiln', pos: KP, params: { r: R, h: H, cover: 1, vents: .9, glow: .85, char: .35 }, anim: 'grow' }, { ...smokeW, id: 'smoke0', delay: .4 }],
  camera: { preset: 'hero', target: [.4, 1.6, 0], dist: 12.5, elev: .3, az: .3, zoom: 'in' } });
b.push({ t: at(1), kind: 'problem', add: [{ id: 'open', type: 'log_pile', pos: OP, params: { w: 1.1, rows: 4, len: .9 }, anim: 'grow' },
    { id: 'fireO', type: 'fire', pos: OP, params: { w: 1.1, d: .8, count: 9, sweep: .2, trail: 99, h: 1.3, opacity: .55 }, anim: 'fade', dust: false, delay: .3 },
    { id: 'smokeO', type: 'smoke', pos: [OP[0], .8, OP[2] - .3], params: { h: 6, w: .6, scale: .6, color: '#3a3633', top: '#7a7570', opacity: .7, count: 40 }, anim: 'fade', dust: false, delay: .4 }],
  camera: { preset: 'close', target: [OP[0], .9, OP[2]], dist: 5.5, elev: .3, az: .35, zoom: 'out' } });
b.push({ t: word(1, /لحد/, .6), kind: 'info', remove: ['open', 'fireO', 'smokeO'], add: [{ id: 'ash', type: 'ash', pos: OP, params: { r: .65 }, anim: 'grow', dust: false }],
  camera: { preset: 'close', target: [OP[0], .5, OP[2]], dist: 4.6, elev: .45, az: .2, zoom: 'in' } });
b.push({ t: at(2), kind: 'solution', remove: ['k0', 'smoke0'], add: [{ id: 'k', type: 'kiln', pos: KP, params: { r: R, h: H, buildTime: 2.4 }, anim: 'fade', dust: false }],
  modes: { k: K({ cover: 0 }) }, camera: { preset: 'hero', target: [KP[0], .9, KP[2]], dist: 8.5, elev: .4, az: .15, zoom: 'out' } });
b.push({ t: word(2, /يغطيها|ويغطيها/, .55), kind: 'info', modes: { k: K({ cover: 1, glow: .7, dur: 1.2 }) }, camera: { preset: 'hero', target: [KP[0], 1, KP[2]], dist: 9, elev: .3, az: .3, zoom: 'in' } });
b.push({ t: at(3), kind: 'problem', modes: { k: K({ glow: 0, dur: 2.2 }) }, camera: { preset: 'close', target: [KP[0], .7, KP[2] + .4], dist: 6, elev: .2, az: .05, zoom: 'out' } });
b.push({ t: at(4), kind: 'solution', add: [arrow('air1', [KP[0] - 3.2, .25, KP[2] + 1.6], [KP[0] - 2.05, .22, KP[2] + .9], '#7fd3ff', .4), arrow('air2', [KP[0] + 3.3, .25, KP[2] + 1.4], [KP[0] + 2.1, .22, KP[2] + .7], '#7fd3ff', .6),
    { ...smokeW, delay: .8 }], modes: { k: K({ vents: 1, glow: .95, dur: 1 }) }, camera: { preset: 'hero', target: [KP[0], .5, KP[2] + .6], dist: 7.5, elev: .15, az: .35, zoom: 'in' } });
b.push({ t: at(5), kind: 'info', remove: ['air1', 'air2'], add: [{ id: 'clock', type: 'clock24', pos: [-2.6, 0, 2.4], params: { r: .55 }, anim: 'grow', delay: .2 }],
  modes: { k: K({ vents: 1, glow: 1, char: .75, dur: Math.max(2, at(6) - at(5)) }), clock: { speed: 12 } }, camera: { preset: 'close', target: [KP[0], .9, KP[2] + .3], dist: 5.6, elev: .3, az: -.1, zoom: 'out' } });
b.push({ t: at(6), kind: 'tip', remove: ['clock'], modes: { k: K({ vents: 1, glow: 1, char: .8 }) }, camera: { preset: 'hero', target: [KP[0], 3.4, KP[2]], dist: 9.5, elev: .15, az: .25, zoom: 'in' } });
b.push({ t: word(6, /خفيف/, .6), kind: 'info', remove: ['smokeW'], add: [smokeB], modes: { k: K({ vents: 1, glow: .9, char: .95 }) }, camera: { preset: 'hero', target: [KP[0], 3, KP[2]], dist: 9, elev: .2, az: .4, zoom: 'out' } });
b.push({ t: at(7), kind: 'solution', modes: { k: K({ vents: 0, glow: 0, char: 1, dur: 3 }) }, camera: { preset: 'close', target: [KP[0], .8, KP[2] + .4], dist: 6.2, elev: .35, az: .1, zoom: 'in' } });
b.push({ t: word(7, /بيستوي|لانه|سخنه/, .6), kind: 'info', remove: ['smokeB'], camera: { preset: 'close', target: [KP[0], .8, KP[2] + .4], dist: 6.8, elev: .3, az: -.2, zoom: 'out' } });
b.push({ t: at(8), kind: 'tip', add: [{ id: 'ton', type: 'log_pile', pos: [-3.3, 0, 1.6], params: { w: 2.4, rows: 9, len: 1.3, rad: .1 }, anim: 'grow' },
    { id: 'coal', type: 'log_pile', pos: [3.1, 0, 2.2], params: { w: 1, rows: 4, len: .7, rad: .07, char: 1 }, anim: 'grow', delay: .9 }],
  camera: { preset: 'hero', target: [0, 1, 1.4], dist: 11, elev: .25, az: 0, zoom: 'in' } });
b.push({ t: at(9), kind: 'info', camera: { preset: 'orbit', target: [0, 1.2, 0], dist: 15, elev: .38, az: .2, zoom: 'out' } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي الفحم بيتعمل من الخشب',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78, exposure: 1.1 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
