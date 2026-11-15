// Flightless island birds (voice-over 2026-11-15): flying costs energy, no ground predators, wings shrink and legs grow, predators arrive.
// Locked look: 3D sky, island over the sea, real soil, Poly Haven plants, a real fox, bird models built from parts, stickers.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, parts, delay = 0) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim: 'grow', delay, dust: false });
// Designs follow field-guide anatomy (searched 2026-11-15): house sparrow = 15 cm, wingspan about 1.5 x body length, grey crown, chestnut nape,
// black bib, pale cheeks, streaked brown back, grey belly, short conical dark bill, pink legs. Kiwi = cone-shaped body tapering to a small head,
// long slightly down-curved bill with nostrils at the TIP, hair-like shaggy feathers, no tail, wings hidden, short strong legs, 3 front toes + 1 back, whiskers at the bill base.
const P = (shape, size, pos, color, o = {}) => ({ shape, size, pos, color, rough: o.rough ?? .85, fur: o.fur, rot: o.rot, tex: o.tex });
// one wing: broad coverts near the body, 5 long primaries fanning back with darker tips
const wing = (x, y, z, side) => [
  P('sphere', [.15, .03, .15], [x + side * .1, y + .075, z - .01], '#7a5a3a', { fur: true, rot: [0, side * .1, side * .25] }),
  P('sphere', [.13, .028, .12], [x + side * .17, y + .07, z - .04], '#6a4c30', { fur: true, rot: [0, side * .15, side * .3] }),
  ...[0, 1, 2, 3, 4].map(k => P('sphere', [.2 - k * .015, .018, .055], [x + side * (.22 + k * .035), y + .062 - k * .004, z - .06 - k * .035], k > 2 ? '#34261a' : '#4f3a27', { fur: true, rot: [0, side * (.15 + k * .08), side * .15] }))];
const flyer = (id, [x, y, z], delay = 0) => obj(id, [
  P('sphere', [.19, .15, .3], [x, y, z], '#7a5a3a', { fur: true }), P('sphere', [.16, .11, .24], [x, y - .035, z - .01], '#bdb7aa', { fur: true }),     // back, grey belly
  P('sphere', [.14, .13, .14], [x, y + .075, z + .13], '#8d8d8a', { fur: true }), P('sphere', [.075, .07, .05], [x, y + .06, z + .175], '#1a1512', { fur: true }), // grey head, black bib
  P('sphere', [.04, .035, .03], [x + .06, y + .07, z + .15], '#d3cab8', { fur: true }), P('sphere', [.04, .035, .03], [x - .06, y + .07, z + .15], '#d3cab8', { fur: true }), // pale cheeks
  P('sphere', [.12, .05, .07], [x, y + .125, z + .09], '#7a4a2a', { fur: true }),                                                                  // chestnut nape band
  P('cone', [.04, .06, .04], [x, y + .07, z + .215], '#3a3a38', { rot: [Math.PI / 2, 0, 0], rough: .4 }),                                          // short conical bill
  P('sphere', [.022, .022, .022], [x + .055, y + .095, z + .185], '#0d0a08', { rough: .2 }), P('sphere', [.022, .022, .022], [x - .055, y + .095, z + .185], '#0d0a08', { rough: .2 }),
  ...wing(x, y, z, -1), ...wing(x, y, z, 1),
  P('sphere', [.09, .02, .2], [x, y - .005, z - .27], '#4a3828', { fur: true }), P('sphere', [.05, .018, .17], [x + .035, y - .01, z - .28], '#3b2c1f', { fur: true }),
  P('cylinder', [.012, .07, .012], [x - .03, y - .11, z + .02], '#c99a8a', { rough: .6 }), P('cylinder', [.012, .07, .012], [x + .03, y - .11, z + .02], '#c99a8a', { rough: .6 })], delay);
// kiwi: cone body (big rear, tapering forward), shaggy hair-like feathers, long down-curved bill, tip nostrils, whiskers, short strong legs, 3+1 toes
const toes = (x, y, z) => [-.06, 0, .06].map(a => P('cylinder', [.013, .1, .013], [x + a * .8, y, z + .055], '#7a5a3a', { rot: [Math.PI / 2 - .12, 0, a * 3.5] })).concat(P('cylinder', [.013, .06, .013], [x, y, z - .035], '#7a5a3a', { rot: [Math.PI / 2 - .12, 0, 0] }));
const shag = (n, x, y, z) => Array.from({ length: n }, (_, i) => { const a = i / n * 6.28, r = .21; return P('cone', [.03, .09, .03], [x + Math.cos(a) * r * .85, y + .24 + (i % 3) * .05, z + Math.sin(a) * r * 1.0 - .05], i % 2 ? '#5c452e' : '#6f5538', { fur: true, rot: [Math.sin(a) * 1.9, 0, -Math.cos(a) * 1.9] }); });
const kiwi = (id, [x, y, z], delay = 0) => obj(id, [
  P('sphere', [.46, .44, .56], [x, y + .27, z - .06], '#6b5238', { fur: true, rough: .98 }),                                                         // big rear body
  P('sphere', [.34, .32, .42], [x, y + .3, z + .14], '#6f5538', { fur: true, rough: .98 }),                                                           // tapering middle
  P('sphere', [.2, .2, .24], [x, y + .36, z + .3], '#7d6040', { fur: true, rough: .95 }),                                                             // neck/head base: small head
  ...shag(14, x, y, z),
  P('cone', [.034, .17, .034], [x, y + .385, z + .5], '#d9c9a2', { rot: [Math.PI / 2 + .12, 0, 0], rough: .45 }),                                      // bill base
  P('cone', [.026, .17, .026], [x, y + .33, z + .65], '#d9c9a2', { rot: [Math.PI / 2 + .5, 0, 0], rough: .45 }),                                      // bill tip, curving down
  P('sphere', [.016, .016, .016], [x + .012, y + .285, z + .735], '#6a5a40', { rough: .3 }), P('sphere', [.016, .016, .016], [x - .012, y + .285, z + .735], '#6a5a40', { rough: .3 }), // nostrils at the tip
  P('sphere', [.026, .026, .026], [x + .06, y + .41, z + .385], '#0d0a08', { rough: .2 }), P('sphere', [.026, .026, .026], [x - .06, y + .41, z + .385], '#0d0a08', { rough: .2 }),
  ...[-1, 1].flatMap(sd => [0, 1, 2].map(k => P('cylinder', [.004, .12, .004], [x + sd * (.055 + k * .01), y + .37 - k * .018, z + .43], '#3a2a1a', { rot: [Math.PI / 2, 0, sd * (.55 + k * .25)] }))), // whiskers
  P('cylinder', [.06, .2, .06], [x - .1, y + .1, z + .0], '#7a5a3a', { rough: .75 }), P('cylinder', [.06, .2, .06], [x + .1, y + .1, z + .0], '#7a5a3a', { rough: .75 }),
  ...toes(x - .1, y + .012, z), ...toes(x + .1, y + .012, z)], delay);
const scenery = [
  { id: 'g1', type: 'glb', pos: [-1.6, 0, 1.3], params: { model: 'ph/grass_medium_01', height: .45 }, anim: 'grow' }, { id: 'g2', type: 'glb', pos: [1.7, 0, 1.4], params: { model: 'ph/grass_medium_02', height: .45 }, anim: 'grow' },
  { id: 'sh', type: 'glb', pos: [-3, 0, -1.5], params: { model: 'ph/shrub_02', height: .9 }, anim: 'grow' }, { id: 'palm', type: 'glb', pos: [3.2, 0, -2.2], params: { model: 'nature_pack/PalmTree_1', height: 7 }, anim: 'grow' },
  { id: 'rk', type: 'glb', pos: [-2.4, 0, 1.8], params: { model: 'ph/boulder_01', height: .6 }, anim: 'grow' }];
const beats = [
  // hook: a small bird flies over the island
  { t: 0, kind: 'intro', add: [flyer('fly', [0, 2.2, 0], .1), stk('q', 'question', [.9, 2.7, 0], .34, { delay: .6 }), ...scenery], camera: { preset: 'hero', target: [0, 1.4, 0], dist: 9, elev: .2, az: .5, zoom: 'in' } },
  // flying costs a lot of energy
  { t: at(1), kind: 'info', remove: ['q'], add: [stk('fire', 'fire', [.8, 2.6, 0], .36, { delay: .3, pulse: true })], camera: { preset: 'close', target: [0, 2.0, 0], dist: 5.5, elev: .1, az: .4, zoom: 'in' } },
  // no ground predators on the island
  { t: at(2), kind: 'problem', remove: ['fire', 'fly'], add: [kiwi('kiwi', [-.2, 0, .6], .1), stk('ok', 'check', [.7, 1.1, .6], .32, { delay: .5 })], camera: { preset: 'close', target: [-.2, .35, .6], dist: 4.2, elev: .2, az: .5, zoom: 'in' } },
  // over thousands of years the birds stopped flying and saved energy
  { t: at(3), kind: 'solution', add: [stk('zz', 'face_sleep', [-.2, 1.0, .6], .3, { delay: .4 })], camera: { preset: 'close', target: [-.2, .35, .6], dist: 5, elev: .15, az: -.3, zoom: 'out' } },
  // smaller wings, stronger legs: rings on the wing stubs and on the legs
  { t: at(4), kind: 'solution', remove: ['ok', 'zz'], add: [stk('r1', 'circle_ring', [.04, .52, .59], .3, { delay: .2, bob: 0, onTop: true }), stk('r2', 'circle_ring', [-.1, .13, .62], .26, { delay: .7, bob: 0, onTop: true })], camera: { preset: 'detail', target: [-.2, .3, .6], dist: 2.8, elev: .15, az: .7, zoom: 'in' } },
  // tip: when rats and cats (here a fox) arrived, the birds could not escape
  { t: at(5), kind: 'problem', remove: ['r1', 'r2'], add: [{ id: 'fox', type: 'glb', pos: [2.4, 0, 1.2], params: { model: 'animals_pack/Fox', height: .6, clip: 'Walk', path: [[2.4, 1.2], [.6, .9]], pathSpeed: .3 }, anim: 'grow' }, stk('w', 'warning', [1.3, 1.1, 1.1], .32, { pulse: true, delay: .4 })], camera: { preset: 'close', target: [.8, .4, .8], dist: 5.5, elev: .2, az: .3, zoom: 'out' } },
  // CTA: wide pull-out with a like
  { t: at(6), kind: 'info', remove: ['w'], add: [stk('like', 'thumbs_up', [-1.6, 2.4, .2], .5, { delay: .3 })], camera: { preset: 'orbit', target: [0, 1, 0], dist: 10, elev: .3, az: .3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'طيور الجزر مش بتطير',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
