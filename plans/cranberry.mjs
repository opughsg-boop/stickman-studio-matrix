// "Why do farmers flood a cranberry field before they pick?" (English) - v2, hyper-realistic cranberry pack:
// sandy bog with dense low vines, reflective tea-brown water that floods ~0.3 m (one foot), 3200 glossy berries that float up and get corralled by a yellow boom,
// walk-behind reel harvester, workers in waders, pump pipe to a truck, x-ray cut berry with air chambers, a berry bouncing on a board. Pines + ground cover around. No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const ph = (id, name, pos, height, more = {}) => glb(id, 'ph/' + name, pos, height, {}, { dust: false, ...more });

const BZ = -.6, CX = 1.2, CZ = BZ + .5; // bog centre z, corral centre (world)
const bog = { id: 'bog', type: 'bog', pos: [0, 0, BZ], params: { w: 7, d: 4.6, level: .3, count: 3200, vines: 7000, corral: [CX, .5], stage: 'corral' }, anim: 'fade', dust: false };
const surround = [ // natural surroundings: pines behind (real bogs sit in pine woods), grass, shrubs and stones on the bare soil
  ph('pine1', 'pine_tree_01', [-4.6, 0, -3.9], 8), ph('pine2', 'pine_tree_01', [4.4, 0, -4.2], 9), ph('pine3', 'pine_tree_01', [.6, 0, -4.6], 10), ph('fir1', 'fir_sapling', [-5, 0, -.6], 1.6),
  ph('sh1', 'shrub_01', [4.6, 0, -1.6], 1.1), ph('sh2', 'shrub_02', [-4.7, 0, 1.6], .9), ph('gr1', 'grass_medium_01', [-4.4, 0, -2.2], .45), ph('gr2', 'grass_medium_02', [4.5, 0, .8], .45),
  ph('gr3', 'grass_medium_01', [-3.4, 0, 2.6], .4), ph('gr4', 'grass_medium_02', [3.6, 0, 2.5], .4), ph('rk1', 'rock_07', [-4.3, 0, .4], .45), ph('rk2', 'boulder_01', [4.9, 0, 1.9], .7),
];
const road = { id: 'road', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'box', size: [12, .04, 1.5], pos: [0, .02, 3.6], color: '#8a7552' }] }, dust: false };
const workers = [glb('wk1', 'modular_men/Worker', [CX - 1.9, -.12, CZ + 1.3], 1.75, {}, { rotY: .6, dust: false }), glb('wk2', 'modular_men/Worker', [CX + 2.4, -.12, CZ - .9], 1.75, {}, { rotY: -2.2, delay: .2, dust: false })];

const beats = [
  // 0 hook: a bright red sea of floating cranberries corralled by a boom, workers in waders, pines behind
  { t: 0, kind: 'intro', add: [bog, road, ...surround, ...workers], modes: { bog: { stage: 'corral' } },
    camera: { preset: 'hero', target: [.6, .6, BZ + .3], dist: 12, elev: .38, az: .3, zoom: 'in' } },
  // 1 how they grow: water drains, berries settle back on low vines in the sandy bog
  { t: at(1), kind: 'info', remove: ['wk1', 'wk2'], modes: { bog: { stage: 'dry', dur: 2.6 } },
    camera: { preset: 'close', target: [-.8, .2, BZ + .9], dist: 5.5, elev: .38, az: .2, zoom: 'out' } },
  // 2 problem: tiny berries hidden in tough tangled vines, a farmer bending over them
  { t: at(2), kind: 'problem', add: [glb('farmer', 'modular_men/Farmer', [-2.5, 0, BZ + 1.5], 1.75, {}, { rotY: .5, dust: false })],
    camera: { preset: 'detail', target: [-1.5, .55, BZ + 1.2], dist: 5.2, elev: .32, az: .45, zoom: 'in' } },
  // 3 fix: the whole bog floods with about a foot of water
  { t: at(3), kind: 'solution', remove: ['farmer'], modes: { bog: { stage: 'flood' } },
    camera: { preset: 'hero', target: [0, .4, BZ], dist: 11, elev: .4, az: -.25, zoom: 'out' } },
  // 4 the berries loosen: half of them lift off the vines and float
  { t: at(4), kind: 'solution', modes: { bog: { stage: 'float', frac: .5, dur: 1.6 } },
    camera: { preset: 'close', target: [-.6, .35, BZ + .6], dist: 5.5, elev: .4, az: .3, zoom: 'in' } },
  // 5 x-ray: a giant cut cranberry beside the real ones shows the air pockets inside
  { t: at(5), kind: 'info', add: [{ id: 'cut', type: 'berry_cut', pos: [-1.5, .3, BZ + 1.5], params: { r: .55, lift: .25 }, anim: 'grow', dust: false }],
    camera: { preset: 'close', target: [-1.5, 1.05, BZ + 1.5], dist: 5, elev: .22, az: .25, zoom: 'out' } },
  // 6 the reel harvester churns the vines and every berry rises to the surface
  { t: at(6), kind: 'solution', remove: ['cut'], add: [{ id: 'harv', type: 'reel_harvester', pos: [0, 0, 0], params: { path: [[-2.6, BZ - 1.1], [.4, BZ - 1.1]], travel: 9 }, anim: 'fade', dust: false }],
    modes: { bog: { stage: 'float', frac: 1, dur: 3 } },
    camera: { preset: 'hero', target: [-1, .6, BZ - .6], dist: 9, elev: .36, az: .15, zoom: 'in' } },
  // 7 boom corrals the berries, a pump lifts them into the truck
  { t: at(7), kind: 'solution', remove: ['harv'], add: [...workers.map(w => ({ ...w, id: w.id + 'b' })),
      { id: 'pipe', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.22, 2.95, .22], pos: [CX + .9, 1.25, CZ + 2.3], rot: [.97, 0, -.1], color: '#2c2c2c', rough: .5 },
        { shape: 'box', size: [.6, .45, .5], pos: [CX + .8, .22, CZ + 1.15], color: '#3b5f8a', metal: .4, rough: .45 }] }, anim: 'grow', dust: false, delay: .3 },
      { id: 'truck', type: 'truck', pos: [0, 0, 0], params: { path: [[-11, 3.6], [CX + 1.1, 3.6]], travel: 2.2, color: '#b0352b' }, anim: 'fade', dust: false }],
    modes: { bog: { stage: 'corral', dur: 2.4 } },
    camera: { preset: 'hero', target: [CX - .3, .5, CZ + .5], dist: 11, elev: .5, az: -.55, zoom: 'out' } },
  // 8 surprise: a fresh cranberry bounces like a ball (squash & stretch on a board)
  { t: at(8), kind: 'tip', add: [{ id: 'bounce', type: 'berry_bounce', pos: [-2.4, 0, 2.75], params: { r: .2, h: 1.1 }, anim: 'grow', dust: false }],
    camera: { preset: 'detail', target: [-2.4, .75, 2.75], dist: 5, elev: .2, az: -.25, zoom: 'in' } },
  // 9 CTA: wide orbit pull-out over the red bog
  { t: at(9), kind: 'info', remove: ['bounce', 'pipe', 'truck'], camera: { preset: 'orbit', target: [0, .8, 0], dist: 14, elev: .42, az: .2, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'Why do farmers flood a cranberry field before they pick?',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'coast_sand_rocks_02', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
