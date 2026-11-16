// Test plan for the ported town builder (no on-screen text). Preview only.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i) => (i === 0 ? 0 : S[Math.min(i, S.length - 1)].words[0].start);
const town = (id, pos, params) => ({ id, type: 'town', pos, params, anim: 'grow', dust: false });
const beats = [
  { t: 0, kind: 'intro', add: [town('t1', [-9, 0, -6], { n: 5, street: 'x', seed: 3 }), town('t2', [-9, 0, 6], { n: 5, street: 'x', seed: 9 })], camera: { preset: 'hero', target: [0, 3, 0], dist: 46, elev: .25, az: .4, zoom: 'in' } },
  { t: at(3), kind: 'info', camera: { preset: 'orbit', target: [0, 3, 0], dist: 40, elev: .3, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'town test',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 3, cover: 'high', coverGain: 1.0, water: '#7f9fb3', fog: '#b4d0e8', haze: .3, horizon: 'hills', horizonDist: 260, waves: 0, foam: false, birds: 3, motes: 1 },
  style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
