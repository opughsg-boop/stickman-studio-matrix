// "ليه الفلاح زمان كان بيفرح لما الفيضان بيملأ أرضه؟" - flood pack: muddy Nile flood rising over the fields, basin dikes holding it while
// the silt settles, green wheat on the black silt, a high flood drowning mud houses then a low flood (cracked soil, sick wheat),
// the High Dam with its lake and trapped silt, fertilizer bags, and a nilometer with growing gold coin stacks. No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const T = i => at(i), len = i => (i + 1 < S.length ? T(i + 1) : D) - T(i), PI = Math.PI;
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', dust: false, ...more });
const ST = {}, M = (id, ch) => (ST[id] = { ...ST[id], ...ch }); // cumulative modes: every key always present
const RZ = -4.3, FX = -.7, FZ = .8, FW = 12.6, FD = 6.4; // river centre z; fields centre/size
const kLow = Math.max(1, S[4].words.findIndex(w => /ولو/.test(w.w))), tLow = S[4].words[kLow]?.start ?? T(4) + len(4) / 2;
const dikes = () => ({ id: 'dikes', type: 'custom', pos: [FX, 0, FZ], params: { parts: [
  ...[-FD / 2, 0, FD / 2].map(z => ({ shape: 'box', size: [FW + .3, .24, .32], pos: [0, .12, z], color: '#6b5238' })),
  ...[-FW / 2, -FW / 6, FW / 6, FW / 2].map(x => ({ shape: 'box', size: [.32, .24, FD], pos: [x, .12, 0], color: '#6b5238' }))] }, anim: 'rise', dust: true });
const wheat = (id, state, more = {}) => [-1.6, 1.6].map((dz, i) => ({ id: id + i, type: 'wheat_field', pos: [FX, 0, FZ + dz], params: { w: FW - .8, d: 2.5, count: 230, h: 1, state, seed: 19 + i }, anim: 'rise', dust: false, ...more }));

const world = [
  { id: 'river', type: 'river', pos: [0, 0, RZ], params: { w: 16, d: 3, flow: .7, mud: 1, specks: 140 }, anim: 'none', dust: false },
  { id: 'flood', type: 'flood', pos: [FX, 0, FZ], params: { w: FW, d: FD, level: 0, mud: 1, settle: 0, silt: 0 }, anim: 'none', dust: false },
  { id: 'boat', type: 'felucca', pos: [0, 0, 0], params: { len: 5, mast: 5, rider: 'modular_men/Farmer', track: [[0, 6.5, RZ, PI, 1, .65, 0], [T(5) - .3, 1.8, RZ, PI, 1, .65, 0], [D, 1.2, RZ, PI, 1, .65, 0]] }, anim: 'none', dust: false },
  { id: 'h1', type: 'mudhouse', pos: [6.9, 0, -1.2], params: { w: 2, d: 2.6, h: 2.6 }, anim: 'none', dust: false },
  { id: 'h2', type: 'mudhouse', pos: [6.9, 0, 2.3], params: { w: 2, d: 2.4, h: 2.4, color: '#d2b08a', seed: 7 }, anim: 'none', dust: false },
  ...[[-6.9, -6.4, 9, 1], [-2.6, -6.6, 10, 2], [1.6, -6.3, 8.5, 3], [5.6, -6.5, 9.5, 4], [7.5, -3.2, 8, 2]].map(([x, z, h, k], i) => glb('palm' + i, 'nature_pack/PalmTree_' + k, [x, 0, z], h, {}, { anim: 'none', rotY: i * 1.9 })),
  glb('donkey', 'animals_pack/Donkey', [5.4, 0, 5.4], 1.3, { clip: 'Eating' }, { anim: 'none', rotY: -.8 }),
  glb('farmer', 'modular_men/Farmer', [-.6, 0, 5.2], 1.75, { wave: true }, { anim: 'none', rotY: .2 }),
];

const beats = [
  // hook: brown flood water spreads over the fields, the farmer on the bank waves happily, felucca on the muddy Nile
  { t: 0, kind: 'intro', add: world, modes: { flood: M('flood', { level: .16, dur: 2.2 }), river: M('river', { mud: 1, dur: 1 }) },
    camera: { preset: 'hero', target: [0, .8, .8], dist: 15, elev: .32, az: .3, zoom: 'in' } },
  // why: summer rain over the Ethiopian highlands (upstream, left) -> muddy river full of silt specks
  { t: T(1), kind: 'info', add: [{ id: 'cloud', type: 'cloud', pos: [-6.4, 6.2, RZ], params: { w: 4, d: 3, count: 42 }, anim: 'fade', dust: false },
      { id: 'rain', type: 'rain', pos: [-6.4, 0, RZ], params: { w: 3.4, d: 2.8, h: 5.8, count: 220 }, anim: 'fade', dust: false, delay: .4 }],
    camera: { preset: 'hero', target: [-5, 2.4, RZ + .5], dist: 11.5, elev: .2, az: -.35, zoom: 'out' } },
  // fix: earth dikes rise, the water is held in basins and the silt settles into a black layer
  { t: T(2), kind: 'solution', remove: ['cloud', 'rain', 'farmer'], add: [dikes(), glb('farmer2', 'modular_men/Farmer', [-.6, 0, 5.2], 1.75, {}, { anim: 'none', rotY: .2 })],
    modes: { flood: M('flood', { level: .2, settle: 1, silt: .9, dur: Math.max(2, len(2) - .4) }) },
    camera: { preset: 'close', target: [-4.6, .15, -.6], dist: 7, elev: .42, az: .1, zoom: 'in' } },
  // the water drains away; green wheat springs up straight away on the silt
  { t: T(3), kind: 'solution', add: wheat('wg', 'green', { delay: 1.2 }), modes: { flood: M('flood', { level: 0, dur: 1.4 }) },
    camera: { preset: 'hero', target: [FX, .6, FZ], dist: 14, elev: .38, az: -.2, zoom: 'out' } },
  // problem: a high flood drowns the village...
  { t: T(4), kind: 'problem', add: [{ id: 'hi', type: 'flood', pos: [.4, 0, 1.2], params: { w: 15.2, d: 9.6, level: 0, mud: 1 }, anim: 'none', dust: false }],
    modes: { hi: M('hi', { level: 1.35, dur: 1.4 }) },
    camera: { preset: 'hero', target: [4, 1.2, .8], dist: 14, elev: .3, az: .4, zoom: 'in' } },
  // ...and a low flood brings famine: cracked dry soil, sick wheat
  { t: tLow, kind: 'problem', remove: ['wg0', 'wg1'], add: [{ id: 'dry', type: 'cracked', pos: [FX, 0, FZ], params: { w: FW, d: FD }, anim: 'none', dust: false, delay: .5 }, ...wheat('ws', 'sick', { delay: .7 })],
    modes: { hi: M('hi', { level: 0, dur: .8 }) },
    camera: { preset: 'hero', target: [FX + 1, .4, FZ], dist: 12, elev: .45, az: .2, zoom: 'out' } },
  // fix: the High Dam rises across the Nile with its lake; the river runs clear and the fields are green all year
  { t: T(5), kind: 'solution', remove: ['hi', 'dry', 'ws0', 'ws1'], add: [
      { id: 'dam', type: 'dam', pos: [-5.3, 0, RZ], params: { w: 3.8, h: 2.4, t: 1.8, lake: 2.1, silt: true, siltDelay: len(5) + .2, siltDur: Math.max(2, len(6) - .8) }, anim: 'rise' },
      ...wheat('wg2', 'green', { delay: .9 })],
    modes: { river: M('river', { mud: .12, dur: 2 }) },
    camera: { preset: 'hero', target: [-4.4, 1.3, -3.4], dist: 11, elev: .3, az: -.45, zoom: 'out' } },
  // problem: the silt piles up behind the dam; the farmer now buys fertilizer bags
  { t: T(6), kind: 'problem', add: [glb('bags', 'medieval_village_pack/Bags', [-3.4, 0, -1.7], .8, {}, { anim: 'drop', dust: true, delay: Math.max(.8, len(6) * .5) }),
      glb('farmer3', 'modular_men/Farmer', [-2.4, 0, -1.4], 1.75, {}, { delay: Math.max(.6, len(6) * .45), rotY: -1 })],
    camera: { preset: 'close', target: [-5.4, .9, -3.2], dist: 8, elev: .25, az: -.55, zoom: 'in' } },
  // tip: the pharaohs' nilometer - water climbs the marked column, the tax (gold coins) rises with it
  { t: T(7), kind: 'tip', add: [{ id: 'nilo', type: 'nilometer', pos: [-4.6, 0, 5.3], params: { size: 1.9, h: 2.6, level: 1.9, dur: Math.max(2.5, len(7) - 1.5) }, anim: 'grow' },
      { id: 'coins', type: 'coins', pos: [-2.8, 0, 5.7], params: { n: 26, dur: Math.max(2.5, len(7) - 1.5) }, anim: 'grow', delay: .2 }],
    camera: { preset: 'close', target: [-3.8, 1.2, 5.3], dist: 7, elev: .3, az: .08, zoom: 'out' } },
  // CTA: wide orbit pull-out over the green Nile valley and the dam
  { t: T(8), kind: 'info', camera: { preset: 'orbit', target: [0, 1, 0], dist: 19, elev: .4, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفلاح زمان كان بيفرح بالفيضان',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 2, island: { w: 16, d: 14, depth: 3.2 } }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
