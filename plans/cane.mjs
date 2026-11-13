// "ليه الفلاح بيحرق القصب؟" - diorama + realistic library, sugar-cane pack (field, fire sweep, black smoke, juicy cut stalk, critters, truck). No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const FW = 7.5, FD = 5.5, FZ = -.9; // field
const field = (id, extra = {}, more = {}) => ({ id, type: 'cane_field', pos: [0, 0, FZ], params: { w: FW, d: FD, count: 150, h: 2.6, ...extra }, anim: 'rise', dust: false, ...more });
const trash = { id: 'trash', type: 'hay', pos: [0, .02, FZ], params: { w: FW, d: FD, count: 420, hgt: .09, color: '#b89a5c' }, anim: 'grow', dust: false };
const road = { id: 'road', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [11, .04, 1.6], pos: [0, .02, 3.6], color: '#8a7552' }] }, dust: false };

const beats = [
  // hook: green field, farmer at the edge, fire already eating one side, huge black smoke column
  { t: 0, kind: 'intro', add: [field('cane'), trash, road, glb('farmer', 'modular_men/Farmer', [-4.4, 0, 2.4], 1.75, {}, { delay: .3 }),
      { id: 'fire0', type: 'fire', pos: [-1.8, 0, FZ], params: { w: 3.6, d: FD, count: 50, sweep: 6, trail: 6 }, anim: 'fade', dust: false, delay: .4 },
      { id: 'smoke0', type: 'smoke', pos: [-2, 0, -4.2], params: { h: 11, w: 1.4, scale: .75, opacity: .78, drift: 1.5 }, anim: 'fade', dust: false, delay: .5 }],
    camera: { preset: 'hero', target: [-.5, 2.6, 0], dist: 14, elev: .32, az: .35, zoom: 'in' } },
  // why: dry leaves + trash on the ground, rats and snakes hiding inside
  { t: at(1), kind: 'problem', remove: ['fire0', 'smoke0'], add: [{ id: 'hide', type: 'critters', pos: [.5, 0, FZ + 1], params: { w: 4, d: 3, rats: 5, snakes: 2 }, anim: 'fade', dust: false }],
    camera: { preset: 'low', target: [.5, .4, 1.4], dist: 5.5, elev: .1, az: .25, zoom: 'out' } },
  // fire sweeps through, eats only the dry stuff; critters flee
  { t: at(2), kind: 'solution', remove: ['hide', 'trash'], add: [
      { id: 'fire', type: 'fire', pos: [0, 0, FZ], params: { w: FW, d: FD, count: 90, sweep: 2.6, trail: 2 }, anim: 'fade', dust: false },
      { id: 'smoke', type: 'smoke', pos: [.5, 0, -4.4], params: { h: 11, w: 2, scale: .85, opacity: .78, drift: 1.5 }, anim: 'fade', dust: false },
      { id: 'flee', type: 'critters', pos: [.5, 0, FZ + 1], params: { w: 4, d: 3, rats: 5, snakes: 2, flee: true }, anim: 'fade', dust: false }],
    camera: { preset: 'hero', target: [0, 2, 0], dist: 12, elev: .28, az: .55, zoom: 'in' } },
  // the stalk itself doesn't burn: giant cut stalk full of juice in front of the field
  { t: at(3), kind: 'info', remove: ['flee', 'fire', 'cane'], add: [field('bare', { leaves: false, dry: false }, { anim: 'fade' }),
      { id: 'stalk', type: 'cane_cut', pos: [.6, 0, 2.6], params: { h: 3, r: .45 }, anim: 'grow' }],
    camera: { preset: 'close', target: [.6, 2.6, 2.6], dist: 5.5, elev: .4, az: .2, zoom: 'out' } },
  // fire blackens the skin, the sugar inside stays
  { t: at(4), kind: 'solution', remove: ['stalk', 'bare'], add: [field('burnt', { burnt: true }, { anim: 'fade' }),
      { id: 'stalkB', type: 'cane_cut', pos: [.6, 0, 2.6], params: { h: 3, r: .45, burnt: true }, anim: 'fade', dust: false }],
    camera: { preset: 'close', target: [.6, 2, 2.6], dist: 6, elev: .45, az: -.3, zoom: 'in' } },
  // race against the clock: sugar starts spoiling
  { t: at(5), kind: 'problem', remove: ['stalkB', 'smoke'], add: [{ id: 'clock', type: 'clock24', pos: [3.6, 0, 3.4], params: { r: .75 }, anim: 'grow', delay: .2 },
      { id: 'spoil', type: 'heat', pos: [0, 0, FZ], params: { w: FW, h: 3, d: FD, color: '#ff7a1a' }, anim: 'fade', dust: false }],
    modes: { clock: { speed: 8 } }, camera: { preset: 'hero', target: [1.2, 1.6, 1], dist: 10, elev: .3, az: .4, zoom: 'out' } },
  // workers + trucks rush in, cut and haul to the factory
  { t: at(6), kind: 'solution', remove: ['spoil', 'burnt'], add: [field('cut', { burnt: true, count: 70, h: 2.4 }, { anim: 'fade' }),
      { id: 'truck1', type: 'truck', pos: [0, 0, 0], params: { path: [[-8, 3.6], [-1.2, 3.6]], travel: 2.4 }, anim: 'fade', dust: false },
      { id: 'truck2', type: 'truck', pos: [0, 0, 0], params: { path: [[-11, 3.6], [-4.2, 3.6]], travel: 3, color: '#c9532d' }, anim: 'fade', dust: false, delay: .5 },
      glb('w1', 'modular_men/Worker', [1.5, 0, 1.6], 1.75), glb('w2', 'modular_men/Worker', [3, 0, .4], 1.75, {}, { delay: .25 }), glb('w3', 'modular_men/Farmer', [2.2, 0, -1.4], 1.75, {}, { delay: .45 })],
    modes: { clock: { speed: 8 } }, camera: { preset: 'hero', target: [0, 1, 2.2], dist: 11, elev: .35, az: .15, zoom: 'in' } },
  // careful: smoke pollutes the air; many countries harvest green
  { t: at(7), kind: 'tip', remove: ['clock'], add: [{ id: 'haze', type: 'smoke', pos: [2.5, 0, -5], params: { h: 9, w: 2.5, scale: 1, color: '#55504c', opacity: .5, drift: 3 }, anim: 'fade', dust: false },
      field('green', { count: 60, h: 2.4 }, { pos: [-3.6, 0, -4.1], params: { w: 3.8, d: 2, count: 60, h: 2.4 } })],
    camera: { preset: 'hero', target: [0, 3, -1.5], dist: 13, elev: .3, az: -.35, zoom: 'out' } },
  // CTA: wide orbit pull-out
  { t: at(8), kind: 'info', remove: ['haze'], camera: { preset: 'orbit', target: [0, 1.5, 0], dist: 15, elev: .38, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفلاح بيحرق القصب',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
