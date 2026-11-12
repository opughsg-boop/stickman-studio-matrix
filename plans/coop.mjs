// "عشة الفراخ" - diorama engine, continuous camera, no on-screen words (style lock).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[k].start);
const LOW = { w: 7, d: 6, h: 2.4 }, HIGH = { w: 7, d: 6, h: 3.6 };
const CUT = { sides: [[0, -3, 7, 0], [-3.5, 0, 6, Math.PI / 2]] };
const PERCH = { mode: 'perch', at: [-.5, 1.2, -1], len: 4 };
const beats = [
  { t: 0, kind: 'intro', add: [{ id: 'crops', type: 'crops', pos: [0, 0, -4.6], params: { rows: 2, per: 12, spacing: .75 }, anim: 'grow' }, { id: 'flock', type: 'flock', pos: [0, 0, -1.2], params: { count: 10, area: [7, 4] }, anim: 'grow', delay: .3 }],
    modes: { flock: 'wander' }, camera: { preset: 'wide', target: [0, .5, -1], zoom: 'in' } },
  { t: at(1), kind: 'problem', modes: { flock: 'scratch' }, camera: { preset: 'close', target: [0, .5, -3.6], dist: 11, elev: .35, az: .4, zoom: 'in' } },
  { t: at(2), kind: 'solution', add: [{ id: 'frame', type: 'frame', pos: [0, 0, 0], params: LOW }, { id: 'roof', type: 'roof', pos: [0, 0, 0], params: LOW, delay: .7 }, { id: 'mesh', type: 'mesh_wall', pos: [0, 0, 0], params: { ...LOW, ...CUT }, anim: 'grow', delay: 1.4 }],
    modes: { flock: 'wander' }, camera: { preset: 'hero', target: [0, 1, 0], dist: 20, zoom: 'out' } },
  { t: at(3), kind: 'problem', effects: ['heat'], add: [{ id: 'heat', type: 'heat', pos: [0, 0, 0], params: { w: 7, h: 2.4, d: 6 }, anim: 'fade' }],
    modes: { flock: 'pant' }, camera: { preset: 'close', target: [0, 1, 0], dist: 12, elev: .3, az: .55, zoom: 'in' } },
  { t: at(4), kind: 'solution', remove: ['heat', 'frame', 'roof', 'mesh'], add: [{ id: 'frame2', type: 'frame', pos: [0, 0, 0], params: HIGH, anim: 'rise' }, { id: 'roof2', type: 'roof', pos: [0, 0, 0], params: { ...HIGH, color: '#f4f4f0' }, delay: .3 },
      { id: 'mesh2', type: 'mesh_wall', pos: [0, 0, 0], params: { ...HIGH, ...CUT }, anim: 'grow', delay: .6 },
      { id: 'air1', type: 'arrow', pos: [0, 0, 0], params: { from: [-5.5, 2.6, -1], to: [5.5, 2.6, -1], head: .4, color: '#7fd3ff' }, anim: 'grow', delay: 1.1, dust: false },
      { id: 'air2', type: 'arrow', pos: [0, 0, 0], params: { from: [-5.5, 1.6, 1.2], to: [5.5, 1.6, 1.2], head: .4, color: '#7fd3ff' }, anim: 'grow', delay: 1.4, dust: false }],
    modes: { flock: 'wander' }, camera: { preset: 'hero', target: [0, 1.6, 0], dist: 21, elev: .25, az: .3, zoom: 'out' } },
  { t: at(5), kind: 'problem', remove: ['air1', 'air2'], effects: ['night'], modes: { flock: 'sleep' }, camera: { preset: 'close', target: [0, .5, 0], dist: 11, elev: .45, az: .65, zoom: 'in' } },
  { t: at(6), kind: 'solution', effects: ['night'], add: [{ id: 'perch', type: 'perch', pos: [-.5, 0, -1], params: { len: 4, h: 1.2, rows: 2 }, anim: 'rise' }],
    modes: { flock: PERCH }, camera: { preset: 'low', target: [-.5, 1.2, -1], dist: 10, elev: .15, az: .4, zoom: 'in' } },
  { t: at(7), kind: 'problem', add: [{ id: 'eggsA', type: 'eggs', pos: [-3, .05, -2.5], params: { count: 7, w: .6, d: .6 }, anim: 'none', dust: false }, { id: 'eggsB', type: 'eggs', pos: [2.9, .05, 2.4], params: { count: 7, w: .6, d: .6 }, anim: 'none', delay: .3, dust: false }],
    modes: { flock: 'wander' }, camera: { preset: 'close', target: [0, .5, 0], dist: 12, elev: .55, az: .3, zoom: 'out' } },
  { t: at(8), kind: 'solution', remove: ['eggsA', 'eggsB'], add: [{ id: 'nest', type: 'nest_box', pos: [2.6, 0, -2.4], params: { count: 2, y: .9 } }],
    camera: { preset: 'close', target: [2.6, 1.2, -2.2], dist: 8, elev: .3, az: .35, zoom: 'in' } },
  { t: at(9), kind: 'problem', remove: ['perch'], add: [{ id: 'perchM', type: 'perch', pos: [-.5, 0, -1], params: { len: 4, h: 1.2, rows: 2, color: '#a7afb7' }, anim: 'rise' }],
    modes: { flock: PERCH }, camera: { preset: 'detail', target: [-.5, 1.2, -1], dist: 6.5, elev: .3, az: .5, zoom: 'in' } },
  { t: at(9, 4), kind: 'solution', remove: ['perchM'], add: [{ id: 'perchW', type: 'perch', pos: [-.5, 0, -1], params: { len: 4, h: 1.2, rows: 2 }, anim: 'rise' }],
    modes: { flock: PERCH }, camera: { preset: 'detail', target: [-.5, 1.2, -1], dist: 6, elev: .25, az: .2, zoom: 'out' } },
  { t: at(10), kind: 'info', modes: { flock: 'wander' }, camera: { preset: 'orbit', target: [0, 1.4, 0], dist: 22, elev: .4, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'عشة الفراخ',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: {}, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
