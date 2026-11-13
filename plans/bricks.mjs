// "ليه الطوب بيدخل الفرن رمادي ويطلع أحمر؟" - brick pack: clamp kiln (fire tunnels + front cutaway, grey -> red -> dark via modes),
// drying yard (wet -> dry), wet brick that bursts, tight stack with a raw grey core, x-ray clay with iron specks that rust. No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const T = i => at(i), len = i => (i + 1 < S.length ? T(i + 1) : D) - T(i);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', dust: false, ...more });
const K = [1.5, 0, -1.6], KW = 4.6, KD = 3, KH = 2.4; // kiln
const X = [.6, 0, 5.1]; // x-ray props spot (front centre)

const world = [
  { id: 'kiln', type: 'bricks', pos: K, params: { w: KW, d: KD, h: KH, gap: .045, tunnels: 3, cut: [2.3, 1.1, .2, .42], top: true, fire: 0 }, anim: 'none', dust: false },
  { id: 'kfire', type: 'fire', pos: K, params: { w: KW - .4, d: KD - .3, h: 1.1, count: 45, sweep: 3, trail: 99 }, anim: 'fade', dust: false, delay: .2 },
  { id: 'smoke', type: 'smoke', pos: [K[0] + .4, 1.6, K[2] - 1.9], params: { h: 11, w: 1.6, scale: .8, opacity: .75, drift: 1.6 }, anim: 'fade', dust: false, delay: .3 },
  { id: 'grey', type: 'bricks', pos: [-2.1, 0, .9], params: { w: 1.1, d: .7, h: .9, gap: .01, fire: 0 }, anim: 'none', dust: false },
  { id: 'red', type: 'bricks', pos: [4.9, 0, 1], params: { w: 1.1, d: .7, h: .9, gap: .01, fire: 1, seed: 5 }, anim: 'none', dust: false },
  { id: 'mud', type: 'custom', pos: [-5.6, 0, -2.6], params: { parts: [{ shape: 'sphere', size: [2.6, .9, 2.2], pos: [0, .1, 0], color: '#5a4a3a' }, { shape: 'sphere', size: [1.2, .5, 1], pos: [1.1, .05, .9], color: '#4f4033' }] }, anim: 'none', dust: false },
  glb('barrel', 'ph/Barrel_01', [-3.9, 0, -3.3], 1, {}, { anim: 'none' }),
  ...[[-6.6, -5.4, 9, 1], [-3.2, -6, 10, 2], [4.4, -5.8, 8.5, 3], [7, -4.6, 9.5, 4], [-7.1, 4.8, 8, 2]].map(([x, z, h, k], i) => glb('palm' + i, 'nature_pack/PalmTree_' + k, [x, 0, z], h, {}, { anim: 'none', rotY: i * 1.9 })),
  ...[[-6.8, -.6], [6.8, -1.2], [-.6, -4.6], [-7, 2]].map(([x, z], i) => glb('bush' + i, ['nature_pack/Bush_1', 'nature_pack/Grass', 'nature_pack/Plant_1'][i % 3], [x, 0, z], .7 + (i % 2) * .3, {}, { anim: 'none', rotY: i })),
  glb('cart', 'medieval_village_pack/Cart', [5.6, 0, -3.6], 1.4, {}, { anim: 'none', rotY: -.6 }),
  glb('donkey', 'animals_pack/Donkey', [6.2, 0, -1.9], 1.3, { clip: 'Idle_2' }, { anim: 'none', rotY: -1.2 }),
  glb('w1', 'modular_men/Worker', [-.9, 0, .7], 1.75, {}, { anim: 'none', rotY: .9 }),
];

const beats = [
  // hook: the clamp kiln burning (black smoke behind), bricks turn from grey to red; grey stack on the left, red stack on the right
  { t: 0, kind: 'intro', add: world, modes: { kiln: { fire: 1, glow: .55, dur: Math.max(2.5, len(0) - .5) } },
    camera: { preset: 'hero', target: [1.4, 1.5, -.8], dist: 12.5, elev: .24, az: .3, zoom: 'in' } },
  // why: x-ray chunk of Nile clay with hidden iron specks glinting
  { t: T(1), kind: 'info', add: [{ id: 'clay1', type: 'clay_cut', pos: X, params: { size: 1.1 }, anim: 'grow' }],
    camera: { preset: 'close', target: [X[0], .8, X[2]], dist: 5.2, elev: .3, az: .2, zoom: 'out' } },
  // problem: a wet brick in the fire - water inside boils, steam, and it bursts
  { t: T(2), kind: 'problem', remove: ['clay1'], add: [
      { id: 'burst', type: 'brick_burst', pos: X, params: { size: 1, at: Math.max(1.6, len(2) - 1.6) }, anim: 'grow' },
      { id: 'bfire', type: 'fire', pos: X, params: { w: 1.4, d: .8, h: .5, count: 12, sweep: .6, trail: 99 }, anim: 'fade', dust: false }],
    camera: { preset: 'close', target: [X[0], .6, X[2]], dist: 5.8, elev: .22, az: -.25, zoom: 'in' } },
  // fix: rows of bricks drying in the sun for days (wordless clock spins), wet dark -> dry light
  { t: T(3), kind: 'solution', remove: ['burst', 'bfire'], add: [
      { id: 'yard', type: 'bricks', pos: [-4.4, 0, 3.6], params: { layout: 'rows', rows: 8, per: 17, wet: 1 }, anim: 'grow' },
      { id: 'clock', type: 'clock24', pos: [-1.2, 0, 4.9], params: { r: .55 }, anim: 'grow', delay: .3 },
      glb('w2', 'modular_men/Worker', [-6.4, 0, 2.2], 1.75, {}, { delay: .2, rotY: .6 })],
    modes: { yard: { wet: 0, dur: Math.max(2, len(3) - .3) }, clock: { speed: 10 } },
    camera: { preset: 'hero', target: [-4.2, .3, 3.4], dist: 8, elev: .45, az: -.2, zoom: 'out' } },
  // problem: bricks packed tight - fire around the outside, the cutaway shows a raw grey core
  { t: T(4), kind: 'problem', remove: ['clock'], add: [
      { id: 'tight', type: 'bricks', pos: [4.9, 0, 3.7], params: { w: 1.7, d: 1.7, h: 1.3, gap: .004, core: .32, cut: [.95, .85, .35], fire: 0 }, anim: 'grow' },
      { id: 'tfire', type: 'fire', pos: [4.9, 0, 3.7], params: { w: 2.3, d: 2.3, h: .9, count: 26, sweep: 1, trail: 99 }, anim: 'fade', dust: false, delay: .4 }],
    modes: { tight: { fire: 1, glow: .5, dur: Math.max(2, len(4) - .5) } },
    camera: { preset: 'close', target: [4.9, .6, 3.7], dist: 5.6, elev: .32, az: -.3, zoom: 'in' } },
  // fix: the kiln is stacked with gaps and tunnels; fire runs between the bricks like streets (camera into the cutaway)
  { t: T(5), kind: 'solution', remove: ['tfire'], add: [{ id: 'kfire2', type: 'fire', pos: K, params: { w: KW - .4, d: KD - .3, h: 1.6, count: 55, sweep: 2.2, trail: 99 }, anim: 'fade', dust: false }],
    modes: { kiln: { fire: 1, glow: 1, dur: 1.5 }, tight: { fire: 1, glow: 0, dur: 1 } },
    camera: { preset: 'close', target: [K[0] + .2, .7, K[2] + 1.2], dist: 6.5, elev: .2, az: .12, zoom: 'out' } },
  // ~1000 degrees: oxygen grabs the iron, it rusts, the clay turns red
  { t: T(6), kind: 'info', add: [{ id: 'clay2', type: 'clay_cut', pos: X, params: { size: 1.1, rust: true, dur: Math.max(2.5, len(6) - 1.5) }, anim: 'grow' },
      { id: 'haze', type: 'heat', pos: X, params: { w: 2.4, h: 2, d: 1.6, color: '#ff7a1a' }, anim: 'fade', dust: false }],
    modes: { kiln: { fire: 1, glow: .6, dur: 1 } },
    camera: { preset: 'close', target: [X[0], .8, X[2]], dist: 5.2, elev: .3, az: .25, zoom: 'in' } },
  // tip: air shut off -> heavy black smoke, the same bricks come out dark (beside the red stack)
  { t: T(7), kind: 'tip', remove: ['clay2', 'haze', 'kfire2'], add: [
      { id: 'seal', type: 'custom', pos: [K[0], 0, K[2] + KD / 2 + .08], params: { parts: [-1.53, 0, 1.53].map(x => ({ shape: 'box', size: [.75, .5, .16], pos: [x, .25, 0], color: '#5a4836' })) }, anim: 'drop' },
      { id: 'smoke2', type: 'smoke', pos: [K[0] - .6, 1.6, K[2] - 1.9], params: { h: 12, w: 2.2, scale: 1.05, opacity: .85, drift: 1.2, color: '#121010', top: '#3a3735' }, anim: 'fade', dust: false }],
    modes: { kiln: { fire: 1, dark: 1, glow: .12, dur: Math.max(2, len(7) - 1) } },
    camera: { preset: 'hero', target: [2.6, 1.3, -.4], dist: 11, elev: .26, az: -.3, zoom: 'out' } },
  // CTA: wide orbit pull-out over the brickworks
  { t: T(8), kind: 'info', camera: { preset: 'orbit', target: [0, 1, 0], dist: 17, elev: .4, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الطوب بيدخل الفرن رمادي ويطلع أحمر',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'brown_mud_leaves_01', soilRepeat: 2, island: { w: 16, d: 14, depth: 3.2 } }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
