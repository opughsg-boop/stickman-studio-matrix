// "Pole barn" - diorama engine, continuous camera, no on-screen words (style lock). English / US audience.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[Math.min(k, S[i].words.length - 1)].start);
const W = 8, Dp = 6, H = 3.4, RED = '#b5452f';
const walls = (id, anim, delay = 0, color = RED) => [
  { id: id + 'N', type: 'wall', pos: [0, 0, -Dp / 2], params: { len: W, h: H, color }, anim, delay },
  { id: id + 'S', type: 'wall', pos: [0, 0, Dp / 2], params: { len: W, h: H, color }, anim, delay: delay + .1 },
  { id: id + 'E', type: 'wall', pos: [W / 2, 0, 0], rotY: Math.PI / 2, params: { len: Dp, h: H, color }, anim, delay: delay + .2 },
  { id: id + 'W', type: 'wall', pos: [-W / 2, 0, 0], rotY: Math.PI / 2, params: { len: Dp, h: H, color }, anim, delay: delay + .3 }];
const concrete = [
  { id: 'cN', type: 'wall', pos: [0, 0, -Dp / 2 - .3], params: { len: W + .8, h: .5, color: '#a3a29d' }, anim: 'grow', delay: .0 },
  { id: 'cS', type: 'wall', pos: [0, 0, Dp / 2 + .3], params: { len: W + .8, h: .5, color: '#a3a29d' }, anim: 'grow', delay: .15 },
  { id: 'cE', type: 'wall', pos: [W / 2 + .3, 0, 0], rotY: Math.PI / 2, params: { len: Dp + .8, h: .5, color: '#a3a29d' }, anim: 'grow', delay: .3 },
  { id: 'cW', type: 'wall', pos: [-W / 2 - .3, 0, 0], rotY: Math.PI / 2, params: { len: Dp + .8, h: .5, color: '#a3a29d' }, anim: 'grow', delay: .45 }];
const POSTS = [[-W / 2, -Dp / 2], [0, -Dp / 2], [W / 2, -Dp / 2], [-W / 2, Dp / 2], [0, Dp / 2], [W / 2, Dp / 2]];
const beats = [
  // 0 hook: a finished barn, camera drops to the bare soil at its base
  { t: 0, kind: 'intro', add: [{ id: 'fr0', type: 'frame', params: { w: W, d: Dp, h: H }, anim: 'grow' }, { id: 'rf0', type: 'roof', params: { w: W, d: Dp, h: H, color: '#c9ccd0' }, anim: 'drop', delay: .5 }, ...walls('b0', 'grow', .3)],
    camera: { preset: 'hero', target: [0, 1.6, 0], dist: 21, elev: .3, az: .3, zoom: 'in' } },
  // 1 problem: normal barn = concrete all around
  { t: at(1), kind: 'problem', add: concrete, camera: { preset: 'low', target: [0, .3, Dp / 2], dist: 12, elev: .2, az: .5, zoom: 'in' } },
  // 2 problem: digging, pouring, waiting
  { t: at(2), kind: 'problem', add: [{ id: 'bar1', type: 'barrel', pos: [5.8, 0, 3.5], params: { color: '#8a8f95' } }, { id: 'bar2', type: 'barrel', pos: [6.8, 0, 2.8], params: { color: '#8a8f95' }, delay: .2 }, { id: 'pile', type: 'droppings', pos: [-6, 0, 3.6], params: { count: 40 }, anim: 'grow', delay: .3 }, { id: 'rk1', type: 'rock', pos: [-6.8, 0, 2.2], params: { r: .6 }, delay: .4 }],
    camera: { preset: 'close', target: [4, .6, 3], dist: 12, elev: .35, az: .6, zoom: 'in' } },
  // 3 solution: pole barn - clear the island
  { t: at(3), kind: 'solution', remove: ['fr0', 'rf0', 'b0N', 'b0S', 'b0E', 'b0W', 'cN', 'cS', 'cE', 'cW', 'bar1', 'bar2', 'pile', 'rk1'],
    camera: { preset: 'hero', target: [0, 1.4, 0], dist: 22, elev: .28, az: .2, zoom: 'out' } },
  // 4 posts straight into the ground
  { t: at(4), kind: 'info', add: POSTS.map(([x, z], i) => ({ id: 'p' + i, type: 'post', pos: [x, 0, z], params: { h: H + .4, t: .32 }, anim: 'rise', delay: i * .35 })),
    camera: { preset: 'low', target: [0, 1.5, 0], dist: 14, elev: .2, az: .45, zoom: 'in' } },
  // 5 posts hold the roof, walls hang on them
  { t: at(5), kind: 'solution', add: [{ id: 'rf1', type: 'roof', params: { w: W, d: Dp, h: H + .2, color: '#c9ccd0' }, anim: 'drop' }, ...walls('b1', 'grow', 1.0)],
    camera: { preset: 'hero', target: [0, 1.8, 0], dist: 20, elev: .3, az: .35, zoom: 'out' } },
  // 6 no foundation / no wait / lower cost: busy farm inside
  { t: at(6), kind: 'solution', add: [{ id: 'cr1', type: 'crate', pos: [-W / 2 - 1.6, 0, 1], params: { s: .9 } }, { id: 'cr2', type: 'crate', pos: [-W / 2 - 1.6, 0, -.2], params: { s: .9 }, delay: .2 }, { id: 'an1', type: 'animal', pos: [W / 2 + 2, 0, 1.5], delay: .3 }],
    camera: { preset: 'orbit', target: [0, 1.4, 0], dist: 22, elev: .35, az: .1, zoom: 'out' } },
  // 7 twist: strip the roof and walls, only the posts remain + arrows down into the ground
  { t: at(7), kind: 'solution', remove: ['rf1', 'b1N', 'b1S', 'b1E', 'b1W'], add: POSTS.map(([x, z], i) => ({ id: 'ar' + i, type: 'arrow', params: { from: [x, H + 1.4, z], to: [x, H + .5, z], head: .3, color: '#ffd23f' }, anim: 'grow', delay: .5 + i * .1, dust: false })),
    camera: { preset: 'detail', target: [0, 1.7, 0], dist: 14, elev: .2, az: .5, zoom: 'in' } },
  // 8 CTA: full barn back, slow pull-out
  { t: at(8), kind: 'info', remove: ['ar0', 'ar1', 'ar2', 'ar3', 'ar4', 'ar5'], add: [{ id: 'rf2', type: 'roof', params: { w: W, d: Dp, h: H + .2, color: '#c9ccd0' }, anim: 'drop' }, ...walls('b2', 'grow', .5)],
    camera: { preset: 'orbit', target: [0, 1.6, 0], dist: 24, elev: .35, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'Pole barn',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: {}, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
