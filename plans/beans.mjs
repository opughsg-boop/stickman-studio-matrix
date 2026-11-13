// "ليه الفلاح بيزرع فول بعد القمح؟" - hyper-realistic: wheat (gold/sick/green), faba beans, roots + nodules on the island's front cross-section, nitrogen particles, split nodule.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const ws = S[i].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const FZ = 3.3, FW = 9, FD = 4.6, FACE = 6; // field (front edge ~5.6), island front cross-section at z = 6
const XS = [-2.6, -1.7, -.85, 0, .85, 1.7, 2.6];
const field = (id, type, params, more = {}) => ({ id, type, pos: [0, 0, FZ], params: { w: FW, d: FD, ...params }, anim: 'rise', dust: false, ...more });
const rootsAt = (id, params, more = {}) => ({ id, type: 'roots', pos: [0, 0, FACE], params: { xs: XS, ...params }, anim: 'fade', dust: false, ...more });
const scenery = [
  glb('farmer', 'modular_men/Farmer', [-3.6, 0, .4], 1.75, {}, { delay: .3 }),
  glb('palm1', 'crops_pack/PalmTree_4', [-4.3, 0, -4.2], 7), glb('palm2', 'crops_pack/PalmTree_3', [4.4, 0, -4.4], 6), glb('palm3', 'crops_pack/PalmTree_4', [2.2, 0, -5], 7.5),
  glb('donkey', 'animals_pack/Donkey', [3.8, 0, -1.8], 1.3, { clip: 'Eating' }),
  ...[[-5, -2], [5.2, .3], [-1, -4.8], [0, -2.6]].map(([x, z], i) => glb('gr' + i, i % 2 ? 'ph/grass_medium_02' : 'ph/grass_medium_01', [x, 0, z], .5))];
const LOW = (o = {}) => ({ preset: 'low', target: [0, -.35, FACE], dist: 5.6, elev: .05, az: .08, ...o });

const b = [];
b.push({ t: 0, kind: 'intro', add: [...scenery, field('wheatG', 'wheat_field', { state: 'gold', count: 420 })], camera: { preset: 'hero', target: [0, 1, 2.5], dist: 11.5, elev: .3, az: .3, zoom: 'in' } });
b.push({ t: at(1), kind: 'info', add: [rootsAt('rootsW', { color: '#cdbf9a', depth: .85, growTime: 1.2 }),
    { id: 'drain', type: 'n2', pos: [0, 0, 0], params: { count: 50, w: FW, d: FD, color: '#8dff6a', tw: 6, tz: FACE + .06, tdepth: .7, mode: 'rise', riseTo: .9 }, anim: 'fade', dust: false, delay: .6 }],
  camera: LOW({ zoom: 'out' }) });
b.push({ t: at(2), kind: 'problem', remove: ['wheatG', 'drain', 'rootsW'], add: [field('wheatS', 'wheat_field', { state: 'sick', count: 300 })], camera: { preset: 'hero', target: [0, .5, 3.6], dist: 7.5, elev: .3, az: .2, zoom: 'in' } });
b.push({ t: at(3), kind: 'problem', add: [{ id: 'air', type: 'n2', pos: [0, 0, FZ], params: { count: 70, w: FW, d: FD, h: 3.5, color: '#7fc4ff', mode: 'float' }, anim: 'fade', dust: false }],
  camera: { preset: 'hero', target: [0, 1.8, 3], dist: 9, elev: .2, az: -.25, zoom: 'out' } });
b.push({ t: word(3, /الزرع/, .55), kind: 'info', modes: { air: { mode: 'bounce' } }, camera: { preset: 'close', target: [0, .8, 4.2], dist: 6, elev: .15, az: -.1, zoom: 'in' } });
b.push({ t: at(4), kind: 'solution', remove: ['wheatS'], add: [field('beans', 'bean_field', { count: 110, h: .95 }), rootsAt('rootsB', { nodules: true, depth: .9, growTime: 2 }, { delay: .5 })],
  modes: { air: { mode: 'float' } }, camera: LOW({ target: [0, .05, FACE], dist: 6, elev: .12, zoom: 'out' }) });
b.push({ t: at(5), kind: 'info', remove: ['air'], add: [{ id: 'fix', type: 'n2', pos: [0, 0, 0], params: { count: 60, w: FW, d: 2, h: 3, color: '#7fc4ff', tw: 5.8, tz: FACE + .05, tdepth: .45, mode: 'float' }, anim: 'fade', dust: false }],
  modes: { fix: { mode: 'stream' }, rootsB: { glow: 1.3 } }, camera: LOW({ target: [0, -.25, FACE], dist: 4.6, az: -.05, zoom: 'in' }) });
b.push({ t: at(6), kind: 'solution', remove: ['fix', 'beans'], add: [{ id: 'residue', type: 'hay', pos: [0, .03, FZ], params: { w: FW - .4, d: FD - .3, count: 520, hgt: .07, color: '#7d8a4a' }, anim: 'grow', dust: false },
    { id: 'glow', type: 'soil_glow', pos: [0, 0, FZ], params: { w: FW, d: FD + .6, fd: .9 }, anim: 'fade', dust: false, delay: .6 }],
  modes: { farmer: { path: [[-3.6, 1.2], [-1, 1.2]] }, rootsB: { glow: .6 } }, camera: { preset: 'hero', target: [0, .2, 4], dist: 8.5, elev: .35, az: .3, zoom: 'out' } });
b.push({ t: word(6, /بيفضل/, .6), kind: 'info', remove: ['residue', 'rootsB'], add: [field('wheatN', 'wheat_field', { state: 'green', count: 420 })],
  camera: { preset: 'hero', target: [0, .7, 3.4], dist: 8, elev: .25, az: .1, zoom: 'in' } });
b.push({ t: at(7), kind: 'tip', remove: ['glow'], add: [{ id: 'nod', type: 'nodule_cut', pos: [0, 1.7, 4.4], params: { r: .5 }, anim: 'grow' }],
  camera: { preset: 'close', target: [0, 1.7, 4.4], dist: 3.6, elev: .1, az: .15, zoom: 'out' } });
b.push({ t: at(8), kind: 'info', remove: ['nod'], camera: { preset: 'orbit', target: [0, 1, 1], dist: 15, elev: .38, az: .2, zoom: 'out' } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفلاح بيزرع فول بعد القمح',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78, exposure: 1.1 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
