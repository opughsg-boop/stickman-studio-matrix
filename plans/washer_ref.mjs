// Washing machine explainer (Egyptian Arabic) in the approved glossy toy look (cine engine + renderer/cine_ref.js + renderer/cine_washer.js):
// glossy objects at real sizes on a warm varnished wood table under the purple-orange sunset sky, one warm sun key + soft sky fill,
// Arabic 2-word captions near the top (key words cyan, underlined), one approved "1908" badge, wordless ✓ / ✗ / curved arrow, soft dissolves only.
// node plans/washer_ref.mjs TRANSCRIPT.json OUT_plan.json
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => S[i].words[k].start;
const rel = (i, k) => at(i, k) - at(i);

const SUNSET = { type: 'sunset', key: 2.2, keyColor: '#ffe2c4', keyPos: [2, 5, 4], fill: .5, skyFill: '#ffd6e6', groundFill: '#7a3b1c',
  rim: .9, rimColor: '#ff9ad0', envIntensity: .6, shadowSize: .5, fogNear: 2.5, fogFar: 14 };
const REAL = { ...SUNSET, real: true, key: 2.5, keyColor: '#ffd2a1', keyPos: [3, 4, 5], fill: .55, skyFill: '#e6c2d6', rim: .3, rimColor: '#ffb38a', envIntensity: .45,
  shadowSize: 1.6, shadowRes: 512, fogNear: 3.5, fogFar: 16 };
const FX = { bloom: .12, grain: .06 };
const CYAN = '#4fd6ff', GOLD = '#ffd84d';
const BOARD = { pos: [0, 0, .31], rotX: -.35 }; // washboard leaning on the bucket rim

const shots = [
  // 1 wash day: galvanised bucket of soapy water and a wooden washboard leaning on it; slow push in
  { t: 0, set: REAL, props: [
      { id: 'bucket', type: 'bucket', pos: [0, 0, 0] },
      { id: 'foam', type: 'foam', pos: [0, .226, 0], area: [.17, .17], count: 220, heap: .03 },
      { id: 'board', type: 'washboard', ...BOARD },
      { id: 'foam2', type: 'foam', pos: [.25, 0, .5], area: [.05, .04], count: 30, rMax: .012 }],
    camera: { pos: [.75, .72, 1.75], target: [0, .24, .06], to: { pos: [.56, .6, 1.42], target: [0, .25, .1] }, fov: 36, dof: { aperture: .01, maxblur: .008 } }, fx: FX },
  // 2 hands scrub the clothes on the board for hours: forearm + hand rub a wet red shirt up and down, foam and drips; slow push in
  { t: at(1), set: REAL, props: [
      { id: 'bucket', type: 'bucket', pos: [0, 0, 0] },
      { id: 'foam', type: 'foam', pos: [0, .226, 0], area: [.17, .17], count: 200, heap: .03 },
      { id: 'board', type: 'washboard', ...BOARD },
      { id: 'scrub', type: 'scrub', ...BOARD, y: .3, amp: .085, freq: 1.25, armDir: [.8, -.4, .45], upperDir: [.55, .45, .7] },
      { id: 'suds', type: 'foam', pos: [-.02, .367, .208], rotX: Math.PI / 2 - .35, area: [.11, .07], count: 140, rMax: .009, heap: .01, seed: 9 }],
    camera: { pos: [-.42, .66, .92], target: [0, .3, .23], to: { pos: [-.3, .56, .72], target: [0, .3, .24] }, fov: 36, dof: { aperture: .012, maxblur: .01 } }, fx: FX },
  // 3 1908: the first electric washer (Thor-type tub on iron legs, motor + pulley, wringer); slow orbit, badge on "1908"
  { t: at(2), set: REAL, props: [
      { id: 'thor', type: 'thor', pos: [0, 0, 0], rotY: -.35 }],
    camera: { pos: [1.0, .82, 1.85], target: [0, .56, 0], orbit: -.35, to: { pos: [.8, .74, 1.55] }, fov: 36, dof: { aperture: .008, maxblur: .008 } },
    fx: FX, ui: [{ type: 'badge', text: '1908', at: [.72, .34], start: rel(2, 3) }] },
  // 4 inside the washer: clothes tumble in water, the drum spins up fast, the water drains and flies out of the holes
  { t: at(3), set: REAL, props: [
      { id: 'drum', type: 'drum', pos: [0, .3, 0], load: 9, omega: [[0, 1.2], [rel(3, 3) - .3, 1.6], [rel(3, 4) + .2, 9.5], [9, 9.5]], drainAt: rel(3, 6) - .3 }],
    camera: { pos: [.62, .62, 2.05], target: [0, .3, 0], to: { pos: [.45, .52, 1.8], target: [0, .29, 0] }, fov: 36, dof: { aperture: .008, maxblur: .008 } }, fx: FX },
  // 5 this is the spin, pure physics: clothes pinned to the wall, water streaming out, a wordless curved arrow shows the spin
  { t: at(4), set: REAL, props: [
      { id: 'drum', type: 'drum', pos: [0, .3, 0], load: 9, omega: [[0, 9.5], [9, 9.5]], drainAt: -9 },
      { id: 'arrow', type: 'spinarrow', pos: [0, .3, .2], r: .2, popAt: rel(4, 3) - .1, speed: 2.4, shadow: false }],
    camera: { pos: [.12, .38, 1.95], target: [0, .3, 0], to: { pos: [.06, .35, 1.8] }, fov: 36, dof: { aperture: .006, maxblur: .006 } }, fx: FX },
  // 6 the same force in a salad spinner: the spinner whirls next to the spinning drum, water flies to the bowl wall
  { t: at(5), set: REAL, props: [
      { id: 'drum', type: 'drum', pos: [-.42, .3, -.45], load: 9, omega: [[0, 9.5], [9, 9.5]], drainAt: -9 },
      { id: 'spinner', type: 'spinner', pos: [.12, 0, .12], omega: [[0, 0], [rel(5, 3), .4], [rel(5, 4) + .4, 11], [9, 11]], wetAt: rel(5, 4) }],
    camera: { pos: [.25, .62, 1.45], target: [-.12, .2, -.12], to: { pos: [.3, .4, .78], target: [.12, .08, .12] }, fov: 36, dof: { aperture: .01, maxblur: .008 } }, fx: FX },
  // 7a don't overload: a drum stuffed with clothes wobbles and turns slowly, the clothes cannot press out the water (red cross)
  { t: at(6), set: REAL, props: [
      { id: 'drum', type: 'drum', pos: [0, .3, 0], load: 24, loadSize: 1.45, pressMax: .25, wobble: 1, omega: [[0, 1], [1.2, 2.6], [9, 2.6]], drainAt: 99, drops: 0, seed: 2 }],
    camera: { pos: [.5, .58, 2.0], target: [0, .3, 0], to: { pos: [.36, .52, 1.82] }, fov: 36, dof: { aperture: .008, maxblur: .008 } },
    fx: FX, ui: [{ type: 'counter', text: '✗', at: [.5, .3], size: .14, color: '#ff3347', start: rel(6, 6) }] },
  // 7b a good load spins smoothly and wrings the water out (green check)
  { t: at(6, 9), set: REAL, props: [
      { id: 'drum', type: 'drum', pos: [0, .3, 0], load: 8, omega: [[0, 9.5], [9, 9.5]], drainAt: -9, seed: 4 }],
    camera: { pos: [-.38, .55, 2.0], target: [0, .3, 0], to: { pos: [-.26, .5, 1.82] }, fov: 36, dof: { aperture: .008, maxblur: .008 } },
    fx: FX, ui: [{ type: 'counter', text: '✓', at: [.5, .3], size: .14, color: '#2fd25a', start: .25 }] },
];

const HL = { 'الغسيل؟': CYAN, 'لوح': CYAN, '1908،': GOLD, 'كهربا': CYAN, 'الطبلة': CYAN, 'الطبلة،': CYAN, 'spin،': GOLD, 'فيزياء': CYAN, 'السلطة': CYAN, 'كتير': '#ff5a5a' };
const caps = S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) })))
  .map(c => { const hl = {}; c.text.split(' ').forEach(w => { const k = w.toLowerCase(); if (HL[k]) hl[k] = HL[k]; }); return Object.keys(hl).length ? { ...c, hl } : c; });
const plan = {
  engine: 'cine', duration: D, language: tr.language || 'ar', prompt: 'How the washing machine came to be (glossy toy look)', learned: {},
  style: { captionFont: 'CapRound', captionY: .2, captionSize: .042, exposure: .9, allowText: true, handheld: .25, grade: { sat: 1.12, bright: 1, contrast: 1.06 } },
  captions: caps,
  shots: shots.map((s, i) => { const { t, ...rest } = s; return { start: t, end: i + 1 < shots.length ? shots[i + 1].t : D, transition: 'dissolve', dissolve: .45, ...rest }; }),
};
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(`${plan.shots.length} shots, ${plan.captions.length} captions, ${D.toFixed(2)}s`);
