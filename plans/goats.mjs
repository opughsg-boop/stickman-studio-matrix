// "إزاي تعمل حظيرة معيز" - diorama engine, continuous camera (no hard cuts), problem -> fix build-up.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const w = i => S[i].words, at = (i, k = 0) => (i === 0 && k === 0 ? 0 : w(i)[k].start);
const TREE = [-4.6, -4.3], PEN = [.3, .6], F = { w: 8, d: 7 }, FENCE_X = 4.3;
const beats = [
  { t: 0, kind: 'intro', add: [{ id: 'tree', type: 'tree_eat', pos: [TREE[0], 0, TREE[1]], params: { scale: 1.5 }, anim: 'grow' }, { id: 'herd', type: 'herd', pos: [0, 0, 0], params: { count: 3 }, anim: 'grow', delay: .3 }],
    modes: { herd: { mode: 'tied', tree: TREE } }, camera: { preset: 'wide', target: [-2, 1, -2], zoom: 'in' } },
  { t: at(1), kind: 'info', camera: { preset: 'hero', target: [TREE[0] + 1, 1.2, TREE[1] + 1], dist: 12, az: .7, zoom: 'in' } },
  { t: at(1, 3), kind: 'problem', modes: { tree: { eaten: true }, herd: { mode: 'eat', tree: TREE } }, camera: { preset: 'close', target: [TREE[0], 2, TREE[1]], dist: 9, elev: .3, az: .5, zoom: 'in' } },
  { t: at(2), kind: 'solution', add: [{ id: 'fence1', type: 'fence_ring', pos: [PEN[0], 0, PEN[1]], params: { ...F, h: .8, style: 'rail' } }],
    modes: { herd: { mode: 'pen', at: PEN, area: [5, 4] } }, camera: { preset: 'wide', target: [PEN[0], .6, PEN[1]], dist: 22, zoom: 'out' } },
  { t: at(3), kind: 'problem', modes: { herd: { mode: 'jump', fence: [FENCE_X, PEN[1]], h: 1.6, at: PEN, area: [4, 3] } }, camera: { preset: 'low', target: [FENCE_X, .9, PEN[1]], dist: 8, elev: .12, az: .05, zoom: 'in' } },
  { t: at(4), kind: 'solution', remove: ['fence1'], add: [{ id: 'fence2', type: 'fence_ring', pos: [PEN[0], 0, PEN[1]], params: { ...F, h: 1.5, style: 'plank' } },
      { id: 'm15', type: 'arrow', pos: [0, 0, 0], params: { from: [FENCE_X + .2, .05, 2.4], to: [FENCE_X + .2, 1.5, 2.4], double: true, head: .2, label: 'متر ونص', labelUp: .9 }, anim: 'grow', delay: .7 }],
    modes: { herd: { mode: 'bump', fence: [FENCE_X, PEN[1]], at: PEN, area: [4, 3] } }, camera: { preset: 'hero', target: [FENCE_X - .5, 1, PEN[1] + .8], dist: 11, elev: .25, az: .35, zoom: 'out' } },
  { t: at(4, 7), kind: 'info', remove: ['m15'], add: [{ id: 'lbl', type: 'sign', pos: [FENCE_X - 1.2, 0, 2.2], params: { text: 'بالطول ✓', y: 2.2, scale: .45, color: '#7dff9a' }, anim: 'grow' }],
    modes: { herd: { mode: 'pen', at: PEN, area: [5, 4] } }, camera: { preset: 'detail', target: [FENCE_X, .9, 2], dist: 5.5, elev: .2, az: 1.25, zoom: 'in' } },
  { t: at(5), kind: 'problem', remove: ['lbl'], effects: ['night'], add: [{ id: 'rain', type: 'rain', pos: [0, 0, 0], params: { count: 300 }, anim: 'none', dust: false }],
    modes: { herd: { mode: 'shiver', at: PEN } }, camera: { preset: 'hero', target: [PEN[0], .8, PEN[1]], dist: 12, elev: .35, az: .55, zoom: 'in' } },
  { t: at(6), kind: 'solution', remove: ['rain'], add: [{ id: 'shelter', type: 'shelter', pos: [PEN[0], 0, -1.4], params: { w: 3.6, d: 2.6, h: 2.2, floor: .3 } }],
    modes: { herd: { mode: 'still', at: [PEN[0], -1.2], y: .3, face: .2 } }, camera: { preset: 'hero', target: [PEN[0], 1.1, -1.2], dist: 13, elev: .3, az: .3, zoom: 'out' } },
  { t: at(6, 5), kind: 'info', add: [{ id: 'shbr', type: 'arrow', pos: [0, 0, 0], params: { from: [-1.65, .02, -.05], to: [-1.65, .32, -.05], double: true, head: .08, label: 'شبر', labelUp: .5, labelScale: .5 }, anim: 'grow' }],
    camera: { preset: 'detail', target: [-1.2, .4, -.2], dist: 6.5, elev: .18, az: .6, zoom: 'in' } },
  { t: at(7), kind: 'problem', remove: ['shbr'], add: [{ id: 'hay', type: 'hay', pos: [PEN[0], 0, 1.8], params: { dirty: true, w: 1.6, d: 1, count: 80 }, anim: 'grow' }],
    modes: { herd: { mode: 'trample', at: [PEN[0], 1.8] } }, camera: { preset: 'close', target: [PEN[0], .4, 1.8], dist: 7, elev: .4, az: .45, zoom: 'in' } },
  { t: at(8), kind: 'solution', remove: ['hay'], add: [{ id: 'feeder', type: 'feeder_rack', pos: [.8, 0, -2.3], params: { w: 1.8, y: 1.05 } }],
    modes: { herd: { mode: 'feeder', at: [.8, -1.65], y: .3, face: Math.PI } }, camera: { preset: 'close', target: [.8, 1, -2], dist: 6.5, elev: .25, az: .25, zoom: 'out' } },
  { t: at(9), kind: 'tip', camera: { preset: 'wide', target: [1.5, .8, 1], dist: 20, elev: .45, az: .8, zoom: 'out' } },
  { t: at(9, 2), kind: 'info', add: [{ id: 'rock', type: 'rock', pos: [3, 0, 2.6], params: { r: 1 } }], modes: { herd: { mode: 'climb', at: [3, 2.6], h: .95 } },
    camera: { preset: 'orbit', target: [3, 1, 2.6], dist: 9, elev: .3, az: .4 } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي تعمل حظيرة معيز',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: {}, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.map(b => `${b.start.toFixed(1)} ${b.kind}: ${b.text}`).join('\n'));
