// Sample of the 'dive inside' style: the cow turns see-through (x-ray) and the camera dives into the rumen. Based on plans/rumen.mjs.
// Locked look: 3D sky (default), real soil, Poly Haven plants, smooth matte Quaternius cow, Renderpeople farmer, x-ray stomach beside the real cow.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const sph = (d, pos, color) => ({ shape: 'sphere', size: [d, d, d], pos, color });
const glb = (id, model, pos, height, extra = {}, o = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...o });
const arrow = (id, from, to, color, delay = 0) => ({ id, type: 'arrow', pos: [0, 0, 0], params: { from, to, head: .25, color }, anim: 'grow', delay, dust: false });

// real cow (1.4 m) on the left, facing +z; a magnified x-ray of its four stomachs on the right
const COW = glb('cow', 'animals_pack/Cow', [-1.5, 0, .2], 1.4, { clip: 'Idle' });
const MOUTH = [-1.45, 1.05, 1.2]; const ZB = .2; // cow body centre z
const RX = -1.45, RY = .85; // rumen centre, inside the cow's abdomen (cow at x=-1.5)
const stomach = [
  { id: 'stand', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.25, .35, .25], pos: [RX, .17, 0], color: '#8a8580' }] }, dust: false },
  { id: 'rumen', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(1.3, [RX, RY, 0], '#d9837a')] }, anim: 'grow', delay: .2 },
  { id: 'retic', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(.62, [RX - .95, RY + .35, .15], '#c0645c')] }, anim: 'grow', delay: .6 },
  { id: 'omasum', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(.55, [RX + .95, RY + .25, .35], '#a8524e')] }, anim: 'grow', delay: .9 },
  { id: 'aboma', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(.5, [RX + 1.05, RY - .4, .55], '#e8a28f')] }, anim: 'grow', delay: 1.2 }];
const microbes = { id: 'microbes', type: 'custom', pos: [0, 0, 0], anim: 'grow', dust: false,
  params: { parts: Array.from({ length: 34 }, (_, i) => { const a = i * 2.4, r = .55 + (i % 4) * .06, y = Math.sin(i * 1.7) * .5;
    const rr = Math.sqrt(Math.max(.05, r * r - y * y)); return sph(.07 + (i % 3) * .02, [RX + Math.cos(a) * rr, RY + y, .3 + Math.abs(Math.sin(a)) * rr * .8], ['#7be36b', '#b07bff', '#5fd0ff'][i % 3]); }) } };
// natural pasture: Poly Haven grass, shrubs, rocks, one real tree, a scanned farmer behind
const grass = [[-2.8, 1.5], [-.4, 1.8], [-3, -1.2], [.2, -1.6], [3.2, -1.3], [-3.6, .2], [3.5, 1.7], [1, 2.4], [-1.8, -2.3], [2.4, -2.4]]
  .map(([x, z], i) => glb('g' + i, ['ph/grass_medium_01', 'ph/grass_medium_02'][i % 2], [x, 0, z], .45));
const scenery = [...grass,
  glb('tree', 'ph/island_tree_01', [3.6, 0, -2.8], 5),
  glb('shrub1', 'ph/shrub_02', [-3.6, 0, -2.2], .9), glb('shrub2', 'ph/shrub_01', [4, 0, .9], .8),
  glb('rock', 'ph/boulder_01', [-4, 0, 1.6], .7), glb('stones', 'ph/namaqualand_stones_01', [2.6, 0, 2.6], .25),
  glb('farmer', 'people_rp/rp_posed_00178_29', [-4.4, 0, -3.3], 1.75, {}, { delay: .4 })];

const beats = [
  // hook: the cow keeps chewing with nothing in front of it
  { t: 0, kind: 'intro', add: [{ ...COW, delay: .1 }, ...scenery], camera: { preset: 'hero', target: [-1.4, .95, .6], dist: 6, elev: .22, az: .45, zoom: 'in' } },
  // it swallows grass fast without chewing it well
  { t: at(1), kind: 'info', add: [{ id: 'fresh', type: 'hay', pos: [-1.4, .03, 2], params: { w: 1.2, d: .8, count: 110, hgt: .14, color: '#6f9a3a' }, anim: 'grow', dust: false },
      arrow('swallow', MOUTH, [RX - .4, RY, .2], '#ffd23f', .6)],
    modes: { cow: { clip: 'Eating' } }, camera: { preset: 'close', target: [-1.2, .7, 1.4], dist: 5.2, elev: .3, az: .7, zoom: 'out' } },
  // problem: dry grass is hard to digest
  { t: at(2), kind: 'problem', remove: ['swallow'], add: [{ id: 'dry', type: 'hay', pos: [.2, .04, 1.9], params: { w: 1.3, d: .9, count: 130, hgt: .16, color: '#b59a52' }, anim: 'grow', dust: false }],
    modes: { cow: { clip: 'Idle_Headlow' } }, camera: { preset: 'close', target: [-.3, .4, 1.9], dist: 5, elev: .35, az: .25, zoom: 'in' } },
  // fix: the cow turns see-through (x-ray) and the camera dives in toward the rumen
  { t: at(3), kind: 'solution', remove: ['cow'], add: [{ id: 'shell', type: 'glb', pos: [-1.5, 0, .2], params: { model: 'animals_pack/Cow', height: 1.4, clip: 'Idle', opacity: .2 }, anim: 'fade' }, ...stomach, arrow('in', MOUTH, [RX - .55, RY + .2, .3], '#ffd23f', .3)],
    camera: { preset: 'close', target: [RX + .3, RY, .2], dist: 3.6, elev: .2, az: .35, zoom: 'in' } },
  // deeper: the camera goes inside, the stomachs are life-size in the frame
  { t: at(4), kind: 'info', remove: ['in'], add: [microbes], camera: { preset: 'inside', target: [RX + .15, RY, .2], dist: 1.9, elev: .12, az: .2, zoom: 'in' } },
  // it brings up a small bite (the cud) and chews it again, calmly
  { t: at(5), kind: 'solution', remove: ['microbes'], add: [arrow('up', [RX - .55, RY + .55, .5], MOUTH, '#7be36b', .3)],
    modes: { shell: { clip: 'Idle_2' } }, camera: { preset: 'close', target: [0, 1.1, .7], dist: 6.8, elev: .25, az: .4, zoom: 'out' } },
  // that can take about eight hours a day
  { t: at(6), kind: 'info', remove: ['up'], add: [{ id: 'clock', type: 'clock24', pos: [-2.7, 0, 1.9], params: { r: .45 }, anim: 'grow', delay: .2 }],
    modes: { cow: { clip: 'Idle' }, clock: { speed: 6 } }, camera: { preset: 'close', target: [-2.4, .8, .9], dist: 6.6, elev: .25, az: .2, zoom: 'in' } },
  // then the food passes the reticulum, omasum and finally the abomasum
  { t: at(7), kind: 'info', remove: ['clock', 'microbes'], add: [arrow('a1', [RX - .55, RY + .5, .4], [RX - .95, RY + .5, .45], '#5fd0ff', .1),
      arrow('a2', [RX - .7, RY + .7, .5], [RX + .75, RY + .55, .6], '#5fd0ff', .7), arrow('a3', [RX + 1, RY, .65], [RX + 1.05, RY - .2, .75], '#5fd0ff', 1.3)],
    camera: { preset: 'close', target: [RX + .1, RY, .3], dist: 6, elev: .2, az: .2, zoom: 'out' } },
  // careful: if the cow stops chewing its cud, it is one of the first signs it is sick
  { t: at(8), kind: 'problem', remove: ['a1', 'a2', 'a3'], modes: { cow: { clip: 'Idle_Headlow' } },
    camera: { preset: 'close', target: [-1.5, .8, .4], dist: 5.4, elev: .25, az: -.35, zoom: 'in' } },
  // CTA: wide orbit pull-out
  { t: at(9), kind: 'info', modes: { cow: { clip: 'Eating' } }, camera: { preset: 'orbit', target: [0, 1, 0], dist: 13, elev: .35, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه البقرة بتجتر',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
