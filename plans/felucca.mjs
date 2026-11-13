// "إزاي المركب الشراعي في النيل بتمشي ضد التيار؟" - Nile pack: flowing river (current -> +x = north), felucca with lateen sail
// (raise / luff / furl / zigzag on one keyframed track), wind streaks (from the north -> blowing to -x), floating log, carved stele. No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const T = i => at(i), PI = Math.PI;
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', dust: false, ...more });
const RZ = .4, RW = 5.2; // river centre z and width (runs the full island width along x)

// boat A: the hook - sails upstream (left, -x) against the current, then leaves the frame
const trackA = [[0, 4.6, RZ - .3, PI, 1, .65, 0], [T(1) - .2, -2.6, RZ, PI, 1, .65, 0], [T(2), -9.5, RZ, PI, 1, .65, 0]];
// boat B: moored on the right, raises sail, runs south, turns into the wind (luffs, pushed back), furls and drifts north, then tacks
const d6 = T(7) - T(6);
const trackB = [
  [T(1), 5.3, RZ + 1.4, PI, 0, 0, 0], [T(3), 5.3, RZ + 1.4, PI, 0, 0, 0],
  [T(3) + 1.3, 4.6, RZ + .8, PI, 1, .7, 0], [T(4) - .1, -3.4, RZ, PI, 1, .7, 0],
  [T(4) + 1.4, -3.6, RZ, 0, 1, .05, 1], [T(5), -4.5, RZ, 0, 1, 0, 1],
  [T(5) + 1.1, -4.2, RZ, 0, 0, 0, 0], [T(6), 3.6, RZ, 0, 0, 0, 0],
  [T(6) + d6 * .3, 2.2, RZ - 1.5, PI + .55, 1, .8, 0], [T(6) + d6 * .65, .2, RZ + 1.6, PI - .55, 1, -.8, 0], [T(7), -1.8, RZ - 1.3, PI + .55, 1, .8, 0],
  [T(8), -4, RZ, PI, 1, .65, 0], [D, -6.5, RZ, PI, 1, .65, 0]];
const boat = (id, track, more = {}) => ({ id, type: 'felucca', pos: [0, 0, 0], params: { len: 6, mast: 6, track, rider: 'modular_men/Farmer', color: id === 'boatA' ? '#2a6fb0' : '#2f8f6a' }, anim: 'fade', dust: false, ...more });
const windN = (id, more = {}, extra = {}) => ({ id, type: 'wind', pos: [0, 0, RZ], params: { w: 16, d: 8, count: 30, rot: PI, ...extra }, anim: 'fade', dust: false, ...more });

const world = [
  { id: 'river', type: 'river', pos: [0, 0, RZ], params: { w: 16, d: RW, flow: .6 }, anim: 'fade', dust: false },
  ...[[-6.2, -3.6, 9.5, 1], [-3.4, -4.6, 8.5, 2], [-.6, -3.9, 10, 3], [2.4, -4.8, 9, 4], [5.4, -3.7, 8, 1], [7, -5.5, 10.5, 2], [-7.2, 5.6, 8, 3]]
    .map(([x, z, h, k], i) => glb('palm' + i, 'nature_pack/PalmTree_' + k, [x, 0, z], h, {}, { anim: 'none', rotY: i * 1.7 })),
  ...[[-5, -2.9], [-1.8, -2.75], [1, -2.9], [3.8, -2.8], [6.6, -2.95], [-6.4, 3.65], [-3.6, 3.75], [-.8, 3.6], [6.8, 3.7]]
    .map(([x, z], i) => glb('reed' + i, ['nature_pack/Grass', 'nature_pack/Plant_1', 'nature_pack/Grass_2'][i % 3], [x, 0, z], .8 + (i % 3) * .25, {}, { anim: 'none', rotY: i })),
  ...[[-4.4, -5.6], [.8, -6.1], [4.3, -6.2], [-2.2, 5.9], [2.6, 6.2]].map(([x, z], i) => glb('shrub' + i, 'ph/shrub_0' + (1 + i % 3), [x, 0, z], 1.1, {}, { anim: 'none' })),
  ...[[-6.6, -2.6], [5.6, 3.5], [-2.6, 3.45]].map(([x, z], i) => glb('rock' + i, 'ph/' + ['rock_07', 'boulder_01', 'stone_01'][i], [x, 0, z], .45, {}, { anim: 'none' })),
  glb('donkey', 'animals_pack/Donkey', [-1.6, 0, -5.4], 1.3, { clip: 'Eating' }, { anim: 'none' }),
  glb('farmer', 'modular_men/Farmer', [-5.2, 0, 4.4], 1.75, { wave: false }, { anim: 'none', rotY: .5 }),
];

const beats = [
  // hook: felucca, sail full, gliding LEFT against the visible current, wind streaks behind it
  { t: 0, kind: 'intro', add: [...world, boat('boatA', trackA), windN('wind0', {}, { count: 22 })],
    camera: { preset: 'hero', target: [1.2, 2.8, RZ], dist: 17, elev: .2, az: .22, zoom: 'in' } },
  // the Nile runs south -> north: a log drifts RIGHT with the current, blue arrow on the water
  { t: T(1), kind: 'info', remove: ['wind0'], add: [boat('boatB', trackB),
      { id: 'log', type: 'floater', pos: [0, 0, RZ], params: { from: [-5.5, .6], to: [3.2, .6], travel: Math.max(3, T(2) - T(1)) }, anim: 'fade', dust: false },
      { id: 'cur', type: 'arrow', pos: [0, 0, RZ], params: { from: [-3, .55, -1.2], to: [3, .55, -1.2], color: '#3fa9ff', head: .55 }, anim: 'grow', delay: .4 }],
    camera: { preset: 'low', target: [-.6, .6, RZ], dist: 9, elev: .16, az: -.15, zoom: 'out' } },
  // but the wind comes FROM the north: white arrow pointing the other way + wind streaks
  { t: T(2), kind: 'problem', remove: ['log'], add: [windN('wind1'),
      { id: 'wArr', type: 'arrow', pos: [0, 0, RZ], params: { from: [3, 4.6, -1.2], to: [-3, 4.6, -1.2], color: '#ffffff', head: .6 }, anim: 'grow', delay: .3 }],
    camera: { preset: 'hero', target: [0, 2.8, RZ - .5], dist: 18, elev: .22, az: .3, zoom: 'in' } },
  // fix: raise the sail, the wind pushes it south (left)
  { t: T(3), kind: 'solution', remove: ['cur', 'wArr'],
    camera: { preset: 'hero', target: [1.2, 3, RZ], dist: 16, elev: .22, az: .45, zoom: 'out' } },
  // but coming back: the wind is in its face - sail flaps, boat is pushed back
  { t: T(4), kind: 'problem',
    camera: { preset: 'close', target: [-3.6, 3, RZ], dist: 14, elev: .2, az: -.4, zoom: 'in' } },
  // fix: drop the sail completely, the current carries it north (right)
  { t: T(5), kind: 'solution', remove: ['wind1'], add: [windN('wind2', { delay: 1.2 }, { count: 14 }),
      { id: 'cur2', type: 'arrow', pos: [0, 0, RZ], params: { from: [-2, .55, 1.9], to: [3, .55, 1.9], color: '#3fa9ff', head: .55 }, anim: 'grow', delay: 1.2 }],
    camera: { preset: 'hero', target: [0, 2.6, RZ], dist: 16, elev: .3, az: .15, zoom: 'out' } },
  // the wind shifts: zigzag left and right to catch it (seen from above)
  { t: T(6), kind: 'info', remove: ['wind2', 'cur2'], add: [windN('wind3', {}, { rot: PI - .6 })],
    camera: { preset: 'hero', target: [0, 1, RZ], dist: 19, elev: .8, az: .1, zoom: 'in' } },
  // tip: the pharaohs' carving - boat with sail up (south, <-) and with sail down (north, ->)
  { t: T(7), kind: 'tip', remove: ['wind3'], add: [{ id: 'stele', type: 'stele', pos: [4.4, 0, 4.9], rotY: -.35, params: {}, anim: 'grow' }],
    camera: { preset: 'close', target: [4.4, 1.7, 4.9], dist: 6.5, elev: .16, az: -.3, zoom: 'out' } },
  // CTA: wide orbit pull-out over the whole Nile island
  { t: T(8), kind: 'info', add: [windN('wind4', {}, { count: 16 })],
    camera: { preset: 'orbit', target: [0, 2, RZ], dist: 21, elev: .36, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ازاي المركب الشراعي في النيل بتمشي ضد التيار',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 2, island: { w: 16, d: 14, depth: 3.2 } }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
