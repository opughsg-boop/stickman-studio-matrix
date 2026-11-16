// "إزاي تعمل سماد من بواقي الأكل من غير ريحة؟" - hyper-realistic Egyptian garden corner: one compost heap that changes state per beat
// (mixed -> wet and sloppy -> green/brown layers -> over-wet with flies -> dry straw cap -> turned with air -> microbes -> hot, steaming, then dark
// and crumbly -> no meat or bones, a dog sniffing around). Real sky, real soil, Nile horizon, Poly Haven cover and real food scraps, real sizes.
// Improvements over charcoal/beans: horizon 'nile', denser Poly Haven ground cover, handheld camera, air-flow arrows into the heap,
// and the heap's colour and shape progress green -> brown -> dark across the story (each state is its own id; removed ids never re-add).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const ws = S[i].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const arrow = (id, from, to, color, delay = 0) => ({ id, type: 'arrow', pos: [0, 0, 0], params: { from, to, head: .18, color }, anim: 'grow', delay, dust: false });

// ---------- the heap: real garden compost pile, about 2.4 m wide and 1.1 m tall ----------
const PP = [0, 0, -.3], HH = 1.1;
const rr = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
// flecks of scraps/straw on the dome surface (deterministic), so the heap reads as a mix of matter, not a smooth ball
const flecks = (w, h, d, cols, n = 26, sz = .16) => Array.from({ length: n }, (_, i) => { const a = rr() * 6.283, e = .15 + rr() * 1.2, c = Math.cos(e);
  return { shape: 'sphere', size: [sz * (.6 + rr() * .7), sz * .35, sz * (.5 + rr() * .6)], pos: [Math.cos(a) * c * w / 2 * .97, Math.sin(e) * h * .97, Math.sin(a) * c * d / 2 * .97], rot: [rr() - .5, a, rr() - .5], color: cols[i % cols.length], rough: .85 }; });
const dome = (id, color, o = {}) => { const w = o.w || 2.4, h = o.h || HH, d = o.d || 2.2;
  return { id, type: 'custom', pos: PP, params: { parts: [{ shape: 'sphere', size: [w, h * 2, d], pos: [0, 0, 0], color, rough: o.rough ?? .92, wobble: o.wobble ?? .06 },
    ...flecks(w, h, d, o.flecks || [], o.n ?? 26, o.fs ?? .16), ...(o.extra || [])] }, anim: 'fade', dust: false, delay: o.delay || 0 }; };
// green/brown layered heap (tapered slabs, alternating kitchen greens and dry browns/soil)
const LAYERS = ['#6b4a2c', '#5e7d30', '#c2a565', '#557427', '#5a3f27', '#6c8a36'];
const layered = (id, delay = 0) => ({ id, type: 'custom', pos: PP, params: { parts: [
  ...LAYERS.map((c, i) => { const bot = 2.5 - i * .27, top = bot - .27; return { shape: 'cylinder', size: [top, .19, bot], pos: [0, .095 + i * .19, 0], color: c, rough: .9, wobble: .05 }; }),
  { shape: 'sphere', size: [.95, .3, .9], pos: [0, 1.14, 0], color: '#5a3f27', rough: .92, wobble: .08 }] }, anim: 'grow', dust: false, delay });
const MIX = ['#5e7d30', '#c2a565', '#4f3825', '#7a8f3a'];

// ---------- garden corner scenery (real models first) ----------
const scenery = [
  // mud-brick garden wall behind the heap (Egyptian countryside), two low courses of plaster-brown brick
  { id: 'wall', type: 'custom', pos: [0, 0, -3.6], params: { parts: [{ shape: 'box', size: [9, 1.5, .32], color: '#a8835f', rough: .95 }, { shape: 'box', size: [9.1, .1, .4], pos: [0, 1.55, 0], color: '#8d6a4a', rough: .95 },
    { shape: 'box', size: [.32, 1.5, 4], pos: [-4.5, .75, 1.85], color: '#a27e5b', rough: .95 }] }, anim: 'grow' },
  glb('farmer', 'modular_men/Farmer', [2.5, 0, 1.2], 1.75, {}, { delay: .3, rotY: -.9 }),
  glb('palm1', 'crops_pack/PalmTree_4', [-3.6, 0, -4.6], 7), glb('palm2', 'crops_pack/PalmTree_3', [3.9, 0, -4.8], 6.2), glb('palm3', 'nature_pack/PalmTree_2', [6.4, 0, -2.6], 7.5, {}, { anim: 'none', rotY: 1.3 }),
  // vegetable bed beside the heap (where the compost will go)
  ...[[-3.4, 1.4], [-2.8, 1.4], [-3.4, 2.1], [-2.8, 2.1], [-3.4, 2.8]].map(([x, z], i) => glb('let' + i, i % 2 ? 'crops_pack/Lettuce_3' : 'crops_pack/Lettuce_4', [x, 0, z], .28, {}, { rotY: i * 1.3 })),
  glb('tom', 'crops_pack/Tomato_1', [-2.2, 0, 3.2], .7),
  // real props: compost bag, water can, broom, barrel
  glb('bag', 'ph/compost_bag_02', [2.0, 0, -1.9], .55, {}, { rotY: .5 }), glb('can', 'ph/metal_jerrycan', [-1.9, 0, -1.6], .45, {}, { rotY: -.4 }),
  glb('barrel', 'ph/Barrel_01', [3.1, 0, -2.6], .9), glb('broom', 'ph/plastic_broom', [-2.6, 0, -2.9], 1.3, {}, { rotY: .3 }),
  // denser real ground cover than charcoal/beans: Poly Haven grass, shrubs, weeds and stones scattered around the corner
  ...[[-4.6, 3.6], [4.6, 3.8], [-4.9, -.6], [1.6, 4.4], [-.6, 4.6], [4.8, -1.2], [3.6, 2.6], [-1.6, 3.9], [5.2, .8], [-4.2, -2.4]]
    .map(([x, z], i) => glb('gr' + i, ['ph/grass_medium_01', 'ph/grass_medium_02', 'ph/grass_bermuda_01'][i % 3], [x, 0, z], .45 + (i % 3) * .08, {}, { rotY: i * .9 })),
  ...[[-3.3, -2.9, 'ph/shrub_01'], [4.4, -3.2, 'ph/shrub_02'], [5.2, 2.9, 'ph/shrub_03'], [-4.9, 1.1, 'ph/fern_02'], [2.9, 3.5, 'ph/weed_plant_02']].map(([x, z, m], i) => glb('sh' + i, m, [x, 0, z], .8 + (i % 2) * .25)),
  ...[[-3, -4.2], [5, 1.8], [-5, 2.4], [1.2, -2.6]].map(([x, z], i) => glb('st' + i, 'ph/rock_07', [x, 0, z], .3 + (i % 2) * .08)),
  glb('stump', 'ph/tree_stump_01', [4.3, 0, .2], .5)];
// real kitchen scraps on the heap (bananas, onion, lemon, apple, sweet potato)
const scraps = (pre, y, delay = 0) => [['ph/bananas', [.35, y, .55], .14], ['ph/yellow_onion', [-.4, y - .05, .5], .08], ['ph/lemon', [.05, y + .08, .3], .07],
  ['ph/food_apple_01', [-.2, y + .1, .1], .08], ['ph/sweet_potato', [.5, y - .1, -.1], .08]].map(([m, p, h], i) => glb(pre + i, m, [PP[0] + p[0], p[1], PP[2] + p[2]], h, {}, { delay: delay + i * .12, rotY: i * 1.7 }));
const foul = (id, op, delay = 0) => ({ id, type: 'smoke', pos: [PP[0], .7, PP[2]], params: { h: 3.2, w: .9, scale: .55, color: '#6c6a3c', top: '#a29e78', opacity: op, drift: .5, count: 34 }, anim: 'fade', dust: false, delay });
const flies = (id, delay = 0) => ({ id, type: 'n2', pos: [PP[0], .2, PP[2]], params: { color: '#141414', count: 16, w: 2.2, d: 2, h: 1.4, mode: 'float', seed: 5 }, anim: 'fade', dust: false, delay });

const b = [];
// 0 HOOK: the finished heap in the garden corner, farmer beside it
b.push({ t: 0, kind: 'intro', add: [...scenery, dome('heap0', '#5d4a30', { flecks: MIX, n: 30 }), stk('q0', 'face_thinking', [1.9, 2.15, .9], .34, { delay: 1 })],
  camera: { preset: 'hero', target: [.4, .9, 0], dist: 11, elev: .32, az: .3, zoom: 'in' } });
// 1 PROBLEM: food scraps alone, piled wet: a flatter sloppy, glossy, foul brown heap with a puddle; heavy odour rises
b.push({ t: at(1), kind: 'problem', remove: ['heap0', 'q0'], add: [dome('wet1', '#4a3a1f', { h: .75, w: 2.5, d: 2.3, rough: .32, wobble: .1, flecks: ['#7b8a2c', '#3b2a16', '#8a7a35'], n: 34, fs: .2,
    extra: [{ shape: 'cylinder', size: [3.2, .03, 3.2], pos: [0, .015, .1], color: '#2f2414', rough: .15 }] }), ...scraps('sc', .72, .3)],
  camera: { preset: 'close', target: [PP[0], .55, PP[2] + .3], dist: 4.6, elev: .32, az: .2, zoom: 'in' } });
b.push({ t: word(1, /بتطلع|وبتطلع|ريحه|ريحة/, .6), kind: 'info', add: [foul('foul1', .5), stk('sick1', 'face_sick', [1.35, 1.25, .5], .32, { delay: .2 })],
  camera: { preset: 'close', target: [PP[0], .8, PP[2] + .3], dist: 5.2, elev: .25, az: -.1, zoom: 'out' } });
// 2 SOLUTION: start again in layers - greens, then a dry layer of soil or straw (low angle shows the stripes)
b.push({ t: at(2), kind: 'solution', remove: ['wet1', 'foul1', 'sick1', 'sc0', 'sc1', 'sc2', 'sc3', 'sc4'], add: [layered('lay2')],
  camera: { preset: 'low', target: [PP[0], .6, PP[2]], dist: 5.4, elev: .08, az: .25, zoom: 'out' } });
b.push({ t: word(2, /طبق|تراب|قش/, .55), kind: 'info', add: [...scraps('sd', 1.2, 0), { id: 'hay2', type: 'hay', pos: [PP[0], .52, PP[2]], params: { color: '#c9b06a', w: 2.3, d: 2.1, count: 90, hgt: .1, seed: 11 }, anim: 'fade', dust: false, delay: .3 }],
  camera: { preset: 'low', target: [PP[0], .75, PP[2]], dist: 5, elev: .12, az: -.2, zoom: 'in' } });
// 3 PROBLEM: too wet - darker glossy cap, stronger odour, flies arrive
b.push({ t: at(3), kind: 'problem', add: [{ id: 'cap3', type: 'custom', pos: PP, params: { parts: [{ shape: 'sphere', size: [1.6, .7, 1.5], pos: [0, 1.0, 0], color: '#3a2b18', rough: .25, wobble: .08 },
    { shape: 'cylinder', size: [3.3, .03, 3.3], pos: [0, .015, .1], color: '#2c2214', rough: .15 }] }, anim: 'fade', dust: false }, foul('foul3', .7, .2), flies('fly3', .5),
    stk('x3', 'cross', [1.5, 1.7, .4], .3, { delay: .6, pulse: true })],
  camera: { preset: 'hero', target: [PP[0], .9, PP[2]], dist: 6.4, elev: .22, az: .3, zoom: 'in' } });
// 4 SOLUTION: dry straw on top soaks up the extra moisture; odour and flies clear
b.push({ t: at(4), kind: 'solution', remove: ['x3'], add: [{ id: 'hay4', type: 'hay', pos: [PP[0], .95, PP[2]], params: { color: '#c9b06a', w: 1.5, d: 1.4, count: 130, hgt: .25, seed: 21 }, anim: 'grow', dust: false, delay: .2 },
    { id: 'hay4b', type: 'hay', pos: [PP[0], .45, PP[2]], params: { color: '#bfa45e', w: 2.4, d: 2.2, count: 90, hgt: .3, seed: 22 }, anim: 'grow', dust: false, delay: .5 }],
  camera: { preset: 'close', target: [PP[0], 1.05, PP[2]], dist: 3.8, elev: .4, az: .15, zoom: 'in' } });
b.push({ t: word(4, /يشرب|الرطوبه|الرطوبة/, .55), kind: 'info', remove: ['cap3', 'foul3', 'fly3'], add: [stk('ok4', 'check', [1.3, 1.8, .4], .3, { delay: .3 })],
  camera: { preset: 'close', target: [PP[0], .95, PP[2]], dist: 4.4, elev: .32, az: -.15, zoom: 'out' } });
// 5 SOLUTION: the farmer turns the heap with a fork every few days; air arrows flow in from all sides; the heap becomes one mixed mound
const fork = { id: 'fork', type: 'custom', pos: [PP[0] + .85, 0, PP[2] + .55], params: { parts: [
  { shape: 'cylinder', size: [.04, 1.45, .04], pos: [0, 1.05, 0], rot: [0, 0, -.55], color: '#8a6440', rough: .8, wood: true },
  { shape: 'box', size: [.26, .03, .03], pos: [.34, .48, 0], rot: [0, 0, -.55], color: '#5b5f63', metal: .8, rough: .4 },
  ...[-.1, -.035, .035, .1].map(z => ({ shape: 'cylinder', size: [.014, .3, .008], pos: [.42, .36, z], rot: [0, 0, -.55], color: '#5b5f63', metal: .8, rough: .4 }))] }, anim: 'grow', dust: false, delay: .5 };
b.push({ t: at(5), kind: 'solution', remove: ['farmer', 'ok4', 'lay2', 'hay2', 'hay4', 'hay4b', 'sd0', 'sd1', 'sd2', 'sd3', 'sd4'],
  add: [dome('turn5', '#5a4630', { flecks: ['#c2a565', '#5e7d30', '#4a3522', '#c9b06a'], n: 40, fs: .15, wobble: .09 }), glb('farmer2', 'modular_men/Farmer', [1.75, 0, .95], 1.75, {}, { rotY: -2.2 }), fork,
    stk('cyc5', 'arrows_cycle', [PP[0], 1.75, PP[2]], .38, { delay: .5 })],
  camera: { preset: 'hero', target: [.6, .95, PP[2] + .3], dist: 7.2, elev: .26, az: .35, zoom: 'out' } });
b.push({ t: word(5, /الهوا|يدخل/, .55), kind: 'info', remove: ['cyc5'], add: [
    arrow('air1', [PP[0] - 2.6, .75, PP[2] + 1.1], [PP[0] - 1.25, .55, PP[2] + .45], '#7fd3ff', 0), arrow('air2', [PP[0] + .1, .8, PP[2] + 2.8], [PP[0], .55, PP[2] + 1.2], '#7fd3ff', .25),
    arrow('air3', [PP[0] + 2.4, 1.6, PP[2] - .6], [PP[0] + 1.05, .8, PP[2] - .3], '#7fd3ff', .5), arrow('air4', [PP[0] - .6, 2.3, PP[2] - .2], [PP[0] - .25, 1.2, PP[2] - .1], '#7fd3ff', .75)],
  camera: { preset: 'hero', target: [PP[0], .8, PP[2] + .4], dist: 6.4, elev: .3, az: .05, zoom: 'in' } });
// 6 INFO: good bacteria working everywhere inside the heap
b.push({ t: at(6), kind: 'info', remove: ['air1', 'air2', 'air3', 'air4', 'fork'], add: [{ id: 'mic6', type: 'n2', pos: [PP[0], -.2, PP[2] + .2], params: { color: '#7be36b', count: 70, w: 2.3, d: 2.1, h: 1.1, mode: 'float', seed: 9 }, anim: 'fade', dust: false },
    stk('mb6', 'microbe', [PP[0] - 1.1, 1.55, PP[2] + .7], .3, { delay: .3 }), stk('mb6b', 'microbe', [PP[0] + 1.2, 1.3, PP[2] + .6], .24, { delay: .6 })],
  camera: { preset: 'close', target: [PP[0], .75, PP[2] + .3], dist: 4.2, elev: .25, az: -.2, zoom: 'in' } });
// 7 INFO: about a month passes - the heap heats up and steams, then cools, settles lower and turns dark brown and crumbly
b.push({ t: at(7), kind: 'info', remove: ['mic6', 'mb6', 'mb6b', 'turn5'], add: [dome('hot7', '#4a3724', { h: 1.0, flecks: ['#5a4430', '#3c2a1a', '#8d7a4a'], n: 30, fs: .14 }),
    { id: 'clock', type: 'clock24', pos: [-2.2, 0, 1.9], params: { r: .5 }, anim: 'grow', delay: .2 },
    { id: 'steam7', type: 'smoke', pos: [PP[0], .9, PP[2]], params: { h: 3.5, w: .8, scale: .6, color: '#d0cdc8', top: '#f1efea', opacity: .25, drift: .6, count: 40 }, anim: 'fade', dust: false, delay: .5 }],
  modes: { clock: { speed: 14 } }, camera: { preset: 'hero', target: [-.6, 1, PP[2] + .6], dist: 7.8, elev: .25, az: .15, zoom: 'out' } });
b.push({ t: word(7, /برد|لونها|غامق/, .6), kind: 'info', remove: ['steam7', 'hot7', 'clock'], add: [dome('done7', '#2e2218', { h: .85, w: 2.2, d: 2.0, flecks: ['#3a2a1c', '#241a12', '#4a3826'], n: 44, fs: .12, wobble: .1 }),
    stk('ok7', 'sparkles', [PP[0] + 1.1, 1.3, PP[2] + .6], .3, { delay: .4 })],
  camera: { preset: 'close', target: [PP[0], .55, PP[2] + .4], dist: 3.8, elev: .4, az: -.1, zoom: 'in' } });
// 8 TIP: no bones or meat - they draw insects and dogs; a dog sniffs around the heap
b.push({ t: at(8), kind: 'tip', remove: ['ok7'], add: [stk('bone8', 'bone', [PP[0] - .4, 1.45, PP[2] + .6], .3, { delay: .2 }), stk('x8', 'forbidden', [PP[0] + .35, 1.45, PP[2] + .6], .32, { delay: .5, pulse: true })],
  camera: { preset: 'close', target: [PP[0], .9, PP[2] + .6], dist: 4.8, elev: .25, az: .2, zoom: 'out' } });
b.push({ t: word(8, /بيجذبوا|الحشرات|الكلاب/, .55), kind: 'problem', add: [glb('dog', 'animals_pack/ShibaInu', [-2.6, 0, 1.9], .62, { clip: 'Walk', path: [[-2.7, 2.0], [-1.3, 1.3]], footLock: true }),
    flies('fly8', .3)],
  camera: { preset: 'hero', target: [-.9, .7, .6], dist: 6.2, elev: .22, az: -.25, zoom: 'in' } });
// 9 CTA: wide orbit pull-out over the garden corner and the finished dark compost
b.push({ t: at(9), kind: 'info', remove: ['bone8', 'x8', 'fly8'], add: [stk('like9', 'thumbs_up', [PP[0], 1.6, PP[2] + .4], .36, { delay: .4 })],
  modes: { dog: { clip: 'Idle', path: [[-1.6, 1.4], [-1.6, 1.4]] } }, camera: { preset: 'orbit', target: [0, 1.2, 0], dist: 13.5, elev: .38, az: .2, zoom: 'out' } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي تعمل سماد من بواقي الأكل من غير ريحة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'brown_mud_leaves_01', soilRepeat: 2, horizon: 'nile' }, style: { camEase: .6, captionY: .78, exposure: 1.1, handheld: 1 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
