// Horse sleeps standing (voice-over 2026-11-15). Stay apparatus locks knees and hips; deep sleep needs short lying-down periods.
// Locked look: 3D sky, real soil, Poly Haven plants, real horse model (animals_pack/Horse), stickers for pointers.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const HORSE = (clip) => ({ id: 'horse', type: 'glb', pos: [0, 0, 0], params: { model: 'animals_pack/Horse', height: 1.9, clip }, anim: 'grow' });
const scenery = [
  { id: 'g1', type: 'glb', pos: [-1.6, 0, 1.5], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' },
  { id: 'g2', type: 'glb', pos: [1.8, 0, 1.2], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' },
  { id: 'sh', type: 'glb', pos: [-2.8, 0, -1.2], params: { model: 'ph/shrub_02', height: .9 }, anim: 'grow' },
  { id: 'tr', type: 'glb', pos: [3.0, 0, -2.4], params: { model: 'ph/island_tree_01', height: 4.5 }, anim: 'grow' }];
const beats = [
  // hook: the horse stands still
  { t: 0, kind: 'intro', add: [{ ...HORSE('Idle'), delay: .1 }, ...scenery], camera: { preset: 'hero', target: [0, 1.1, 0], dist: 8, elev: .2, az: .6, zoom: 'in' } },
  // the stay apparatus in the legs: a ring around the knee and hip
  { t: at(1), kind: 'info', add: [stk('ring1', 'circle_ring', [-.25, .6, .25], .42, { delay: .2, bob: 0 }), stk('ring2', 'circle_ring', [-.25, 1.2, -.1], .42, { delay: .6, bob: 0 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'close', target: [0, .9, 0], dist: 5.2, elev: .25, az: .8, zoom: 'in' } },
  // the sleep is light: a short lying-down nap
  { t: at(2), kind: 'problem', remove: ['ring1', 'ring2'], add: [stk('w1', 'warning', [1.2, 1.9, 0], .3, { pulse: true })],
    modes: { horse: { clip: 'Idle_Headlow' } }, camera: { preset: 'close', target: [0, .9, 0], dist: 6, elev: .25, az: -.4, zoom: 'out' } },
  // it stands asleep so it can flee fast
  { t: at(3), kind: 'solution', remove: ['w1'], add: [stk('chk', 'check', [1.2, 1.9, 0], .3, { delay: .3 })],
    modes: { horse: { clip: 'Idle' } }, camera: { preset: 'close', target: [0, 1.0, 0], dist: 6.5, elev: .2, az: .3, zoom: 'in' } },
  // then it lies down on its side and rests deeply
  { t: at(4), kind: 'solution', remove: ['chk'], modes: { horse: { clip: 'Idle_2' } }, camera: { preset: 'close', target: [0, .8, 0], dist: 6.5, elev: .15, az: 1.3, zoom: 'out' } },
  // tip: a horse that never lies down may be sick
  { t: at(5), kind: 'problem', add: [stk('idea', 'idea', [1.3, 2.0, 0], .32, { delay: .2 })], modes: { horse: { clip: 'Idle_Headlow' } }, camera: { preset: 'close', target: [0, 1.0, 0], dist: 6, elev: .25, az: -.8, zoom: 'in' } },
  // CTA: wide orbit with a like
  { t: at(6), kind: 'info', remove: ['idea'], add: [stk('like', 'thumbs_up', [-1.5, 2.4, .2], .5, { delay: .3 })], modes: { horse: { clip: 'Idle' } }, camera: { preset: 'orbit', target: [0, 1, 0], dist: 9, elev: .3, az: .3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'الحصان بينام واقف',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
