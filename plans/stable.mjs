// "إسطبل الحصان" - diorama + realistic library (Quaternius horses, Poly Haven soil), continuous camera, no on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[k].start);
const W = 5, Dp = 4.5, H = 2.6, BRICK = '#a9553b', WOOD = '#7a4e2c';
const box = (id, size, pos, color, extra = {}) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size, pos, color }] }, ...extra });
const walls = [
  { id: 'wb', type: 'wall', pos: [0, 0, -Dp / 2], params: { len: W, h: H, color: BRICK } },
  { id: 'wl', type: 'wall', pos: [-W / 2, 0, 0], rotY: Math.PI / 2, params: { len: Dp, h: H, color: BRICK }, delay: .15 },
  { id: 'wr', type: 'wall', pos: [W / 2, 0, 0], rotY: Math.PI / 2, params: { len: Dp, h: H * .55, color: BRICK }, delay: .3 }];
const pads = [
  { id: 'pb', type: 'wall', pos: [0, 0, -Dp / 2 + .14], params: { len: W - .3, h: 1.55, color: WOOD } },
  { id: 'pl', type: 'wall', pos: [-W / 2 + .14, 0, 0], rotY: Math.PI / 2, params: { len: Dp - .3, h: 1.55, color: WOOD }, delay: .2 },
  { id: 'pr', type: 'wall', pos: [W / 2 - .14, 0, 0], rotY: Math.PI / 2, params: { len: Dp - .3, h: 1.4, color: WOOD }, delay: .4 }];
const HORSE = { id: 'horse', type: 'glb', pos: [0, 0, -.1], params: { model: 'animals_pack/Horse', height: 1.9, clip: 'Idle' }, anim: 'grow' };
const beats = [
  { t: 0, kind: 'intro', add: [box('floor', [W, .1, Dp], [0, .05, 0], '#9b9a96'), ...walls, { ...HORSE, delay: .5 }], modes: { horse: { clip: 'Attack_Kick' } },
    camera: { preset: 'hero', target: [0, 1.1, 0], dist: 13, elev: .3, az: .45, zoom: 'in' } },
  { t: at(1), kind: 'problem', modes: { horse: { clip: 'Attack_Kick' } }, camera: { preset: 'close', target: [0, 1, -1.4], dist: 6.5, elev: .2, az: .8, zoom: 'in' } },
  { t: at(2), kind: 'solution', add: pads, modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 1, -.5], dist: 10, elev: .35, az: .3, zoom: 'out' } },
  { t: at(3), kind: 'problem', modes: { horse: { clip: 'Idle_Headlow' } }, camera: { preset: 'low', target: [0, .3, .3], dist: 5, elev: .08, az: .5, zoom: 'in' } },
  { t: at(4), kind: 'solution', add: [box('shav', [W - .3, .08, Dp - .3], [0, .13, 0], '#d8b98c', { anim: 'grow' }), { id: 'hay', type: 'hay', pos: [0, .1, 0], params: { w: W - .5, d: Dp - .5, count: 260, hgt: .06, color: '#e6cfa4' }, anim: 'grow', delay: .2, dust: false }],
    modes: { horse: { clip: 'Eating' } }, camera: { preset: 'close', target: [0, .6, 0], dist: 7, elev: .4, az: .2, zoom: 'out' } },
  { t: at(5), kind: 'problem', add: [{ id: 'wet', type: 'water', pos: [.5, .19, .6], params: { r: 1.1 }, anim: 'grow', dust: false }], modes: { horse: { clip: 'Idle_Headlow' } },
    camera: { preset: 'detail', target: [.4, .3, .5], dist: 3.6, elev: .3, az: .6, zoom: 'in' } },
  { t: at(6), kind: 'solution', remove: ['wet'], add: [box('drain', [W, .06, .35], [0, .16, Dp / 2 - .1], '#3d4248', { dust: false }),
      { id: 'flow1', type: 'arrow', pos: [0, 0, 0], params: { from: [-1, .35, -1], to: [-1, .3, 2.9], head: .25, color: '#4fb3ff' }, anim: 'grow', delay: .5, dust: false },
      { id: 'flow2', type: 'arrow', pos: [0, 0, 0], params: { from: [1, .35, -1], to: [1, .3, 2.9], head: .25, color: '#4fb3ff' }, anim: 'grow', delay: .7, dust: false }],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, .5, .6], dist: 9, elev: .55, az: .25, zoom: 'out' } },
  { t: at(7), kind: 'problem', remove: ['flow1', 'flow2'], add: [{ id: 'smell', type: 'heat', pos: [0, 0, 0], params: { w: W - .2, h: H, d: Dp - .2, color: '#9acd32' }, anim: 'fade', dust: false }],
    modes: { horse: { clip: 'Idle_Headlow' } }, camera: { preset: 'close', target: [0, 1.3, 0], dist: 7.5, elev: .3, az: .55, zoom: 'in' } },
  { t: at(8), kind: 'solution', remove: ['smell'], add: [
      { id: 'win', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [1.4, .7, .05], pos: [0, 2.05, -Dp / 2 + .09], color: '#bfe3ff' },
        { shape: 'box', size: [1.6, .1, .3], pos: [0, 2.45, -Dp / 2 + .1], color: WOOD }, { shape: 'box', size: [1.6, .1, .3], pos: [0, 1.65, -Dp / 2 + .1], color: WOOD }] } },
      { id: 'air1', type: 'arrow', pos: [0, 0, 0], params: { from: [-.3, 2.2, -4.5], to: [-.3, 2.2, -1], head: .3, color: '#7fd3ff' }, anim: 'grow', delay: .6, dust: false },
      { id: 'air2', type: 'arrow', pos: [0, 0, 0], params: { from: [.4, 2.0, -4.5], to: [.4, 2.0, -1], head: .3, color: '#7fd3ff' }, anim: 'grow', delay: .8, dust: false }],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'hero', target: [0, 1.6, -1], dist: 10, elev: .3, az: .7, zoom: 'out' } },
  { t: at(9), kind: 'tip', remove: ['air1', 'air2'], add: [{ id: 'friend', type: 'glb', pos: [4.4, 0, .6], params: { model: 'animals_pack/Horse_White', height: 1.9, clip: 'Walk', path: [[4.4, 2.5], [4.4, .3]], pathSpeed: .3 }, anim: 'grow' }],
    modes: { horse: { clip: 'Idle_2' } }, camera: { preset: 'hero', target: [2, 1.1, .3], dist: 11, elev: .25, az: .55, zoom: 'in' } },
  { t: at(10), kind: 'info', modes: { friend: { clip: 'Eating', face: -Math.PI / 2 } }, camera: { preset: 'orbit', target: [1.2, 1, 0], dist: 14, elev: .35, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إسطبل الحصان',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
