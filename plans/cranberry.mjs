// "Why do farmers flood a cranberry field before they pick?" - diorama + realistic ground (sandy bog soil), low vines, flooded bog water, floating berries, shaking harvester, trucks. No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });

const BW = 6.4, BD = 4.4, BZ = -.6; // bog area
const vines = (id, extra = {}, more = {}) => ({ id, type: 'hay', pos: [0, .02, BZ], params: { w: BW, d: BD, count: 380, hgt: .16, color: '#2f5a2c', ...extra }, anim: 'grow', dust: false, ...more });
const water = (id, y = .1, more = {}) => ({ id, type: 'custom', pos: [0, 0, BZ], params: { parts: [{ shape: 'box', size: [BW + .6, .05, BD + .6], pos: [0, y, 0], color: '#4e6b5c' }] }, anim: 'rise', dust: false, ...more });

// berries: a grid of small red spheres lying in the vines, some already floating
const berryParts = (y0 = .05, n = 16, m = 11, lift = 0) => {
  const parts = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const x = -BW / 2 + (i + .5) * BW / n + ((i * 7 + j * 3) % 5 - 2) * .02;
    const z = -BD / 2 + (j + .5) * BD / m + ((i * 3 + j * 5) % 4 - 1.5) * .02;
    const y = y0 + lift + (((i + j) % 3) * .02);
    parts.push({ shape: 'sphere', size: [.09, .075, .09], pos: [x, y, z], color: (i + j) % 4 === 0 ? '#8c1a22' : '#b3202a' });
  }
  return parts;
};
const berries = (id, y0, lift, more = {}) => ({ id, type: 'custom', pos: [0, 0, BZ], params: { parts: berryParts(y0, 16, 11, lift) }, anim: 'rise', dust: false, ...more });

// harvester: a yellow frame with a shaker bar on the vines
const harvester = (id, pos, more = {}) => ({ id, type: 'custom', pos, params: { parts: [
  { shape: 'box', size: [1.4, .7, 2.2], pos: [0, .75, 0], color: '#d9a21b' },
  { shape: 'box', size: [1.6, .18, .25], pos: [0, .4, 1.5], color: '#3a3a3a' },
  { shape: 'cylinder', size: [.42, .42, .6], pos: [-.7, .42, 1.2], color: '#2b2b2b' },
  { shape: 'cylinder', size: [.42, .42, .6], pos: [.7, .42, 1.2], color: '#2b2b2b' },
  { shape: 'box', size: [.5, .9, .9], pos: [0, 1.5, -.5], color: '#c9332d' } ] }, anim: 'grow', dust: false, ...more });

const beats = [
  // hook: low green vines on a sandy bog, a farmer at the edge
  { t: 0, kind: 'intro', add: [vines('vines'), { id: 'sand', type: 'hay', pos: [0, .01, BZ], params: { w: BW + .4, d: BD + .4, count: 60, hgt: .03, color: '#c9b48a' }, anim: 'grow', dust: false },
      glb('farmer', 'modular_men/Farmer', [-4.2, 0, 2.2], 1.75, {}, { delay: .3 })],
    camera: { preset: 'hero', target: [-.5, 1.2, 0], dist: 13, elev: .32, az: .35, zoom: 'in' } },
  // the problem: berries are small and hidden in the vines, the farmer bends over them
  { t: at(1), kind: 'problem', add: [berries('berries', .05, 0), glb('picker', 'modular_men/Worker', [2.4, 0, 1.2], 1.75, {}, { delay: .2 })],
    camera: { preset: 'low', target: [.5, .4, .8], dist: 5.5, elev: .1, az: .25, zoom: 'out' } },
  // the fix: the whole bog is flooded with about a foot of water
  { t: at(3), kind: 'solution', add: [water('bog', .2), { id: 'pump', type: 'custom', pos: [-BW / 2 - .6, 0, BZ], params: { parts: [{ shape: 'cylinder', size: [.3, .3, .9], pos: [0, .45, 0], color: '#2b2b2b' }] }, anim: 'grow', dust: false }],
    remove: ['picker'], camera: { preset: 'hero', target: [0, .8, BZ], dist: 11, elev: .35, az: -.2, zoom: 'in' } },
  // the berries loosen and start to rise
  { t: at(4), kind: 'solution', remove: ['bog'], add: [water('bog', .9), berries('berriesUp', .05, .9)],
    camera: { preset: 'close', target: [0, .6, BZ], dist: 6, elev: .45, az: .3, zoom: 'out' } },
  // air pockets: the berries float on the surface
  { t: at(5), kind: 'solution', remove: ['berries'], add: [water('bogB', .9)],
    camera: { preset: 'close', target: [.8, .9, BZ], dist: 5, elev: .5, az: -.25, zoom: 'in' } },
  // the harvester shakes the vines and the berries are pushed to the surface
  { t: at(6), kind: 'solution', remove: ['bog', 'bogB', 'berriesUp'], add: [water('bogC', .9), berries('berriesC', .05, .9), harvester('harv', [-3.6, 0, BZ + .5])],
    camera: { preset: 'hero', target: [-.8, 1.2, BZ], dist: 11, elev: .35, az: .15, zoom: 'in' } },
  // the berries are pumped into a truck
  { t: at(7), kind: 'solution', remove: ['harv'], add: [
      { id: 'truck', type: 'truck', pos: [0, 0, 0], params: { path: [[-10, 3.4], [-1.4, 3.4]], travel: 2.8, color: '#b0352b' }, anim: 'fade', dust: false }],
    camera: { preset: 'hero', target: [0, 1, 1.4], dist: 11, elev: .35, az: .15, zoom: 'in' } },
  // the surprise: a fresh cranberry bounces like a ball
  { t: at(8), kind: 'tip', remove: ['truck', 'bogC'], add: [{ id: 'ball', type: 'custom', pos: [0, 0, BZ], params: { parts: [{ shape: 'sphere', size: [.28, .24, .28], pos: [0, .5, 0], color: '#b3202a' }] }, anim: 'grow', dust: false }],
    camera: { preset: 'close', target: [0, .4, BZ], dist: 5.5, elev: .3, az: -.2, zoom: 'out' } },
  // CTA: wide orbit pull-out
  { t: at(9), kind: 'info', remove: ['ball'], camera: { preset: 'orbit', target: [0, 1.5, 0], dist: 15, elev: .38, az: .2, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'Why do farmers flood a cranberry field before they pick?',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'coast_sand_rocks_02', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
