// "مستعمرة النمل" - diorama engine, ant farm cutaway, continuous camera, wordless graphics.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[k].start);
const beats = [
  { t: 0, kind: 'intro', add: [{ id: 'farm', type: 'ant_farm', pos: [0, 0, -.5], params: { count: 26 }, anim: 'grow' }, { id: 'clock', type: 'clock24', pos: [4.3, 0, .2], params: { r: .9 }, delay: .6 }],
    modes: { farm: { mode: 'work' }, clock: { speed: 3 } }, camera: { preset: 'wide', target: [.6, 2, 0], dist: 14, elev: .25, az: .25, zoom: 'in' } },
  { t: at(0, 5), kind: 'info', camera: { preset: 'detail', target: [-1.6, 2.5, 0], dist: 4.5, elev: .1, az: .1, zoom: 'in' } },
  { t: at(1), kind: 'info', add: [{ id: 'bed', type: 'sleeper', pos: [-4.4, 0, 1.6], rotY: .5 }], camera: { preset: 'close', target: [-4.4, .6, 1.6], dist: 7, elev: .35, az: .5, zoom: 'in' } },
  { t: at(2), kind: 'info', add: [{ id: 'cam', type: 'film_cam', pos: [2, 0, 3.6], rotY: Math.PI + .3 }], camera: { preset: 'hero', target: [.5, 1.9, .5], dist: 11, elev: .2, az: .7, zoom: 'out' } },
  { t: at(3), kind: 'solution', modes: { farm: { mode: 'naps', rate: .45 }, clock: { speed: 7 } }, camera: { preset: 'close', target: [0, 2, 0], dist: 9.5, elev: .08, az: .05, zoom: 'in' } },
  { t: at(4), kind: 'info', modes: { farm: { mode: 'one' } }, camera: { preset: 'detail', target: [-1.8, 2.2, 0], dist: 2.6, elev: .08, az: .05, zoom: 'in' } },
  { t: at(5), kind: 'info', modes: { farm: { mode: 'naps' }, clock: { speed: 4, frac: 2.5 / 24, color: '#5aa9ff' } }, camera: { preset: 'detail', target: [4.3, 2.1, .2], dist: 4.8, elev: .1, az: .1, zoom: 'out' } },
  { t: at(6), kind: 'info', modes: { farm: { mode: 'queen' } }, camera: { preset: 'detail', target: [0, .9, 0], dist: 3.2, elev: .1, az: -.05, zoom: 'in' } },
  { t: at(6, 4), kind: 'info', modes: { clock: { speed: 4, frac: 9 / 24, color: '#a36bff' } }, camera: { preset: 'detail', target: [4.3, 2.1, .2], dist: 4.6, elev: .1, az: .15, zoom: 'in' } },
  { t: at(7), kind: 'solution', modes: { farm: { mode: 'around' } }, camera: { preset: 'close', target: [0, 1, 0], dist: 5, elev: .12, az: -.1, zoom: 'out' } },
  { t: at(8), kind: 'info', modes: { farm: { mode: 'naps', rate: .3 }, clock: { speed: 5 } }, camera: { preset: 'hero', target: [.5, 2, 0], dist: 11, elev: .2, az: .35, zoom: 'out' } },
  { t: at(9), kind: 'info', camera: { preset: 'orbit', target: [0, 1.8, 0], dist: 13, elev: .3, az: -.2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'مستعمرة النمل',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: {}, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
