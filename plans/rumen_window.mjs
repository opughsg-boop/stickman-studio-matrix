// "Why does the cow keep chewing with no food?" - ANATOMY WINDOW version (user-approved look, references 2026-11-14):
// when the script talks about the stomach, a window opens in the cow's left flank and the organs show in their real places
// (rumen with chewed grass inside, honeycomb reticulum, omasum, abomasum, intestines), with arrows for the food path.
// The camera stays outside. Locked look: 3D sky, real soil, Poly Haven plants, smooth matte cow, Renderpeople farmer.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const sph = (d, pos, color) => ({ shape: 'sphere', size: [d, d, d], pos, color });
const glb = (id, model, pos, height, extra = {}, o = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...o });
const arrow = (id, from, to, color, delay = 0) => ({ id, type: 'arrow', pos: [0, 0, 0], params: { from, to, head: .25, color }, anim: 'grow', delay, dust: false });


// real cow (1.4 m) facing +z; measured: x -2.04..-1.09, y 0..1.4, z -1.04..1.42. Window on the -x flank.
const CX = -1.56, X = CX - .06, AZW = -1.25; // window plane, organ plane, camera azimuth that faces the window
const T3 = at(3);
const COW = glb('cow', 'animals_pack/Cow', [-1.5, 0, .2], 1.4, { clip: 'Idle', cutBox: [-3, CX, .68, 1.13, -.74, .58], cutOpen: [T3 + .2, T3 + 1.3] });
const MOUTH = [-1.6, .55, 1.35], MOUTH_UP = [-1.6, 1.15, 1.3];
const part = (shape, size, pos, color, o = {}) => ({ shape, size, pos, color, rough: o.rough ?? .42, tex: o.tex, wobble: o.wobble, cutX: o.cutX });
const obj = (id, parts, delay = 0) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim: 'grow', delay, dust: false });
const gut = []; for (let i = 0; i < 46; i++) { const a = i * .55, r = .09 + (i % 9) * .006;
  gut.push(part('sphere', [.085, .085, .085], [X + .02, 1.0 + Math.sin(a) * r + (i % 2) * .015, -.6 + Math.cos(a) * r + (i / 46) * .2], '#d98877', { tex: 'tissue', rough: .35 })); }
const RUM = [X, .9, -.2];
const organs = [
  obj('cavity', [part('box', [.02, .5, 1.36], [CX + .2, .9, -.08], '#5e2a26', { rough: .7 })], .3),
  // rumen: cut open on the near side so the chewed grass inside shows (like the reference diagram)
  obj('rumen', [part('sphere', [.46, .5, .78], RUM, '#ffffff', { tex: 'tissue', wobble: .08, cutX: X - .04 }),
    part('sphere', [.4, .44, .7], RUM, '#ffffff', { tex: 'grass', wobble: .06, rough: .9, cutX: X - .02 })], .7),
  obj('retic', [part('sphere', [.26, .26, .26], [X, .8, .34], '#f2d6c4', { tex: 'honeycomb', wobble: .05 })], .85),
  obj('omasum', [part('sphere', [.24, .24, .24], [X - .02, .99, .38], '#f0d0c0', { tex: 'leaves', wobble: .04 })], .95),
  obj('aboma', [part('sphere', [.2, .18, .56], [X - .02, .74, .12], '#ffffff', { tex: 'rugae', wobble: .1, rough: .4 })], 1.05),
  obj('gut', gut, 1.15)];
// microbes on the open face of the rumen
const microbes = obj('microbes', Array.from({ length: 34 }, (_, i) => { const a = i * 2.4, r = Math.sqrt((i + .5) / 34);
  return part('sphere', [.035, .035, .035], [X - .07, RUM[1] + Math.sin(a) * r * .19, RUM[2] + Math.cos(a) * r * .3], ['#7be36b', '#b07bff', '#5fd0ff'][i % 3], { rough: .3 }); }));
const AX = X - .3; // stickers float just in front of the organs
// 3D emoji stickers (assets/stickers): pointing hands, circles, faces instead of plain arrows
const stk = (id, name, pos, size = .32, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const winCam = (o) => ({ preset: 'close', target: [CX, .85, .1], dist: 4.0, elev: .15, az: AZW, ...o });
const grass = [[-2.8, 1.5], [-.4, 1.8], [-3, -1.2], [.2, -1.6], [3.2, -1.3], [-3.6, .2], [3.5, 1.7], [1, 2.4], [-1.8, -2.3], [2.4, -2.4]]
  .map(([x, z], i) => glb('g' + i, ['ph/grass_medium_01', 'ph/grass_medium_02'][i % 2], [x, 0, z], .45));
const scenery = [...grass,
  glb('tree', 'ph/island_tree_01', [3.6, 0, -2.8], 5),
  glb('shrub1', 'ph/shrub_02', [-3.6, 0, -2.2], .9), glb('shrub2', 'ph/shrub_01', [4, 0, .9], .8),
  glb('rock', 'ph/boulder_01', [3.9, 0, 2.2], .7), glb('stones', 'ph/namaqualand_stones_01', [2.6, 0, 2.6], .25),
  glb('farmer', 'people_rp/rp_posed_00178_29', [-4.4, 0, -3.3], 1.75, {}, { delay: .4 })];

const beats = [
  // hook: the cow keeps chewing with nothing in front of it
  { t: 0, kind: 'intro', add: [{ ...COW, delay: .1 }, ...scenery], camera: { preset: 'hero', target: [-1.4, .95, .6], dist: 6, elev: .22, az: .45, zoom: 'in' } },
  // it swallows grass fast without chewing it well
  { t: at(1), kind: 'info', add: [{ id: 'fresh', type: 'hay', pos: [-1.4, .03, 2], params: { w: 1.2, d: .8, count: 110, hgt: .14, color: '#6f9a3a' }, anim: 'grow', dust: false }],
    modes: { cow: { clip: 'Eating' } }, camera: { preset: 'close', target: [-1.2, .7, 1.4], dist: 5.2, elev: .3, az: .7, zoom: 'out' } },
  // problem: dry grass is hard to digest
  { t: at(2), kind: 'problem', add: [{ id: 'dry', type: 'hay', pos: [.2, .04, 1.9], params: { w: 1.3, d: .9, count: 130, hgt: .16, color: '#b59a52' }, anim: 'grow', dust: false }],
    modes: { cow: { clip: 'Idle_Headlow' } }, camera: { preset: 'close', target: [-.3, .4, 1.9], dist: 5, elev: .35, az: .25, zoom: 'in' } },
  // fix: the camera swings to the cow's side, the window opens and the food goes to the rumen
  { t: T3, kind: 'solution', add: [...organs, stk('in', 'point_down', [AX, 1.38, -.2], .34, { delay: 1.4 })],
    modes: { cow: { clip: 'Eating' } }, camera: winCam({ dist: 4.3, zoom: 'out' }) },
  // millions of microbes break the grass down and ferment it (closer on the open rumen)
  { t: at(4), kind: 'info', remove: ['in'], add: [microbes, stk('mic', 'microbe', [AX - .1, 1.12, -.42], .22, { delay: .3 }), stk('mag', 'magnifier', [AX - .1, .7, .05], .28, { delay: .6 })], modes: { cow: { clip: 'Idle' } }, camera: winCam({ target: [X, .9, -.2], dist: 2.7, elev: .1, zoom: 'in' }) },
  // it brings up a small bite (the cud) and chews it again, calmly
  { t: at(5), kind: 'solution', remove: ['mic', 'mag'], add: [stk('up1', 'arrows_cycle', [AX, .95, .12], .34, { delay: .2 }), stk('up2', 'face_yum', [AX, 1.55, 1.25], .3, { delay: .8 })],
    modes: { cow: { clip: 'Idle_2' } }, camera: winCam({ target: [CX, .95, .45], dist: 4.2, zoom: 'out' }) },
  // that can take about eight hours a day
  { t: at(6), kind: 'info', remove: ['up1', 'up2'], add: [stk('zz', 'face_sleep', [-2.9, 1.25, 1.6], .26, { delay: .6 }), { id: 'clock', type: 'clock24', pos: [-2.9, 0, 1.6], params: { r: .42 }, anim: 'grow', delay: .2 }],
    modes: { cow: { clip: 'Idle' }, clock: { speed: 6 } }, camera: winCam({ target: [-2.1, .85, .7], dist: 5.2, az: -1.0, zoom: 'in' }) },
  // then the food passes the reticulum, omasum and finally the abomasum
  { t: at(7), kind: 'info', remove: ['clock', 'zz', 'microbes'], add: [stk('c1', 'circle_ring', [AX, .8, .34], .36, { delay: .1, bob: 0 }),
      stk('c2', 'circle_ring', [AX, .99, .4], .34, { delay: .8, bob: 0 }), stk('c3', 'circle_ring', [AX, .74, .1], .42, { delay: 1.5, bob: 0 })],
    camera: winCam({ target: [CX, .86, .05], dist: 3.4, elev: .12, zoom: 'out' }) },
  // careful: if the cow stops chewing its cud, it is one of the first signs it is sick
  { t: at(8), kind: 'problem', remove: ['c1', 'c2', 'c3'], add: [stk('sick', 'face_sick', [-1.6, 1.25, 1.6], .34, { delay: .3 }), stk('warn', 'warning', [-1.6, 1.75, .3], .3, { delay: .7, pulse: true })], modes: { cow: { clip: 'Idle_Headlow' } },
    camera: { preset: 'close', target: [-1.5, .8, .4], dist: 5.4, elev: .25, az: -.7, zoom: 'in' } },
  // CTA: wide orbit pull-out
  { t: at(9), kind: 'info', remove: ['sick', 'warn'], add: [stk('like', 'thumbs_up', [-1.5, 2.1, .2], .5, { delay: .3 })], modes: { cow: { clip: 'Eating' } }, camera: { preset: 'orbit', target: [0, 1, 0], dist: 13, elev: .35, az: -.3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه البقرة بتجتر (شباك تشريح)',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
