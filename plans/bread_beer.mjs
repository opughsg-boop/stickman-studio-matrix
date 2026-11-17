// "عيش وبيرة المصريين القدماء" - realistic library (wheat field, clay oven, bread, beer barrels, cauldron, market, coins). No on-screen words except captions.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i) => (i === 0 ? 0 : S[Math.min(i, S.length - 1)].words[0].start);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const part = (shape, size, pos, color) => ({ shape, size, pos, color });
const custom = (id, parts, pos = [0, 0, 0], more = {}) => ({ id, type: 'custom', pos, params: { parts }, anim: 'grow', dust: false, ...more });
// clay oven: a fat cylinder with a dark mouth and a dome top
const oven = (x, z) => custom('oven', [part('cylinder', [1.6, 1.5, 1.6], [0, .75, 0], '#b8714a'), part('sphere', [1.5, .6, 1.5], [0, 1.5, 0], '#a25f3a'), part('box', [.5, .5, .1], [0, .45, .82], '#2a1a10')], [x, 0, z]);
// round flat loaves (eish baladi)
const loaves = (id, x, z, n = 4) => custom(id, Array.from({ length: n }, (_, k) => part('sphere', [.46, .16, .46], [(k % 2) * .5 - .25, .09, Math.floor(k / 2) * .5 - .25 + (k % 2) * .08], k % 2 ? '#d89a52' : '#e9b96f')), [x, 0, z]);
// a beer jug: earthenware body + foam on top
const jug = (id, x, z) => custom(id, [part('cylinder', [.42, .9, .42], [0, .45, 0], '#8c4f2c'), part('sphere', [.44, .2, .44], [0, .95, 0], '#f2d58a')], [x, 0, z]);
const coins = (id, x, z) => custom(id, [0, 1, 2, 3].map(k => part('cylinder', [.22, .05, .22], [0, .03 + k * .05, 0], '#e6c04e')), [x, 0, z]);
const table = (id, x, z) => custom(id, [part('box', [1.8, .08, .9], [0, .85, 0], '#7a5532'), part('box', [.1, .85, .1], [.8, .42, .38], '#5b3b20'), part('box', [.1, .85, .1], [-.8, .42, .38], '#5b3b20'), part('box', [.1, .85, .1], [.8, .42, -.38], '#5b3b20'), part('box', [.1, .85, .1], [-.8, .42, -.38], '#5b3b20')], [x, 0, z]);
const FZ = -.8;
const field = (id, extra = {}) => glb(id, 'crops_pack/Wheat_Crop', [0, 0, FZ], 1.1, extra, { anim: 'fade' });
const beats = [
  // hook: the wheat field and a farmer, a palm for the Nile setting
  { t: at(0), kind: 'intro', add: [glb('farmer', 'modular_men/Farmer', [-2.6, 0, 1.6], 1.75), glb('palm', 'crops_pack/PalmTree_1', [4.5, 0, -3], 4.5, {}, { dust: false })],
    camera: { preset: 'hero', target: [0, 1.6, 0], dist: 12, elev: .3, az: .3, zoom: 'out' } },
  // baker and clay oven
  { t: at(2), kind: 'info', remove: ['farmer'], add: [oven('ov', -1.4, 0), loaves('lo1', 1.6, 1.4)],
    camera: { preset: 'close', target: [-.6, 1.2, 0], dist: 6.5, elev: .3, az: .3, zoom: 'in' } },
  // the same ingredients go into beer
  { t: at(3), kind: 'solution', remove: ['ov', 'lo1'], add: [jug('j1', 0, 0), jug('j2', 1.1, .6), glb('cauldron', 'medieval_village_pack/Cauldron', [-1.6, 0, 1.2], 1.1)],
    camera: { preset: 'hero', target: [.4, .8, .4], dist: 9, elev: .32, az: -.4, zoom: 'in' } },
  // bread and beer on one table: the daily food
  { t: at(4), kind: 'info', remove: ['j1', 'j2', 'cauldron'], add: [table('tb', 0, 0), loaves('lo2', 0, 0, 4), jug('j3', .6, -.2), jug('j4', -.5, .2)],
    camera: { preset: 'close', target: [0, 1.0, 0], dist: 5.5, elev: .45, az: .5, zoom: 'out' } },
  // money: beer and grain were paid as currency
  { t: at(5), kind: 'solution', remove: ['lo2', 'j3', 'j4'], add: [glb('barrel', 'medieval_village_pack/Barrel', [-1.8, 0, .4], 1.2), glb('bags', 'medieval_village_pack/Bags', [1.6, 0, .6], 1.0), coins('c1', .2, 0), coins('c2', .6, .3)],
    camera: { preset: 'hero', target: [0, .8, 0], dist: 10, elev: .3, az: .25, zoom: 'in' } },
  // the question: how exactly
  { t: at(6), kind: 'problem', remove: ['barrel', 'bags', 'c1', 'c2', 'tb'], add: [oven('ov2', -1, .2), glb('cauldron2', 'medieval_village_pack/Cauldron', [1.3, 0, .4], 1.1)],
    camera: { preset: 'orbit', target: [0, 1.0, 0], dist: 9, elev: .35, az: .6, zoom: 'out' } },
  // researchers disagree: two possible paths shown side by side, neither proven
  { t: at(7), kind: 'tip', remove: ['ov2', 'cauldron2'], add: [oven('ov3', -2, .3), jug('j5', 1.6, .3), loaves('lo3', -.6, 1.2, 2)],
    camera: { preset: 'hero', target: [0, 1.0, 0], dist: 11, elev: .3, az: -.3, zoom: 'out' } },
  // outro: wide orbit pull-out
  { t: at(9), kind: 'info', remove: ['ov3', 'j5', 'lo3'], camera: { preset: 'orbit', target: [0, 1.4, 0], dist: 14, elev: .36, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'عيش وبيرة المصريين القدماء',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'brown_mud_leaves_01', soilRepeat: 2, horizon: 'nile' }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
