// "ليه بيزرعوا الدرة في سطر؟" - hyper-realistic diorama: maize rows on ridges, irrigation canal, water flowing down the furrows,
// random planting (flooded corner + dry corner), wind between the rows, thinning seedlings. No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[Math.min(k, S[i].words.length - 1)].start);
const rng = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });

// field layout: rows run toward the camera (along z), canal at the back
const ROWS = [-3, -1.8, -.6, .6, 1.8, 3], FURROWS = [-2.4, -1.2, 0, 1.2, 2.4], Z0 = -3.1, Z1 = 1.5, CANAL_Z = -3.9;
const along = (step) => { const z = []; for (let v = Z0; v <= Z1 + .01; v += step) z.push(+v.toFixed(2)); return z; };
const plant = (pre, model, h, step, sway, delay = 0) => ROWS.flatMap((x, i) => along(step).map((z, j) =>
  glb(`${pre}${i}_${j}`, `crops_pack/${model}`, [x + (rng() - .5) * .12, 0, z + (rng() - .5) * .12], h * (.88 + rng() * .24), { sway, ph: rng() * 6 },
    { delay: delay + (i * .05 + j * .03), dust: false })));
const ids = list => list.map(o => o.id);

const canal = { id: 'canal', type: 'custom', pos: [0, 0, CANAL_Z], params: { parts: [
  { shape: 'box', size: [8.4, .06, .7], pos: [0, .03, 0], color: '#3d8fc9', metal: .25 },
  { shape: 'box', size: [8.4, .16, .14], pos: [0, .08, -.42], color: '#6b5238' }, { shape: 'box', size: [8.4, .16, .14], pos: [0, .08, .42], color: '#6b5238' }] }, anim: 'fade', dust: false };
const furrows = FURROWS.map((x, i) => ({ id: 'fu' + i, type: 'custom', pos: [x, 0, (Z0 + Z1) / 2 - .2], params: { parts: [
  { shape: 'box', size: [.42, .03, Z1 - Z0 + 1.2], pos: [0, .015, 0], color: '#3e2d1f' },
  { shape: 'box', size: [.16, .035, Z1 - Z0 + 1.2], pos: [-.29, .02, 0], color: '#6a4e35' }, { shape: 'box', size: [.16, .035, Z1 - Z0 + 1.2], pos: [.29, .02, 0], color: '#6a4e35' }] },
  anim: 'rise', delay: i * .12, dust: false }));
// water creeping down each furrow from the canal: small discs appearing one after another
const flow = (pre, d0 = 0) => FURROWS.flatMap((x, i) => along(.3).concat([Z0 - .5]).sort((a, b) => a - b).map((z, j) =>
  ({ id: `${pre}${i}_${j}`, type: 'water', pos: [x, .035, z], params: { r: .23 }, anim: 'grow', delay: d0 + j * .11 + i * .04, dust: false })));

const mature = plant('m', 'Corn_4', 2.2, .62, .045);
const young = plant('y', 'Corn_3', 1.3, .62, .06, .2);
const water0 = flow('wa', .6), water1 = flow('wb', .4);

// random planting: plants scattered anywhere, one corner flooded, the other dry and cracked
const scatter = Array.from({ length: 30 }, (_, i) => glb('r' + i, 'crops_pack/Corn_3', [(rng() - .5) * 7.2, 0, Z0 + rng() * (Z1 - Z0 + .6)], 1.2 * (.75 + rng() * .4),
  { sway: .06, ph: rng() * 6 }, { delay: i * .03, dust: false }));
const flood = [{ id: 'pool', type: 'water', pos: [-2.2, .04, -1.9], params: { r: 1.7 }, anim: 'grow', dust: false },
  { id: 'pool2', type: 'water', pos: [-1.1, .04, -2.4], params: { r: 1.1 }, anim: 'grow', delay: .3, dust: false }];
const dry = [{ id: 'dryG', type: 'hay', pos: [2.3, .02, .6], params: { w: 2.8, d: 2.4, count: 160, hgt: .05, color: '#c9a76a' }, anim: 'grow', dust: false },
  { id: 'dryH', type: 'heat', pos: [2.3, 0, .6], params: { w: 2.8, h: 2, d: 2.4, color: '#ff9a3c' }, anim: 'fade', dust: false, delay: .3 }];

// seedlings just planted (thirsty from day one)
const seed = ROWS.flatMap((x, i) => along(.62).map((z, j) => glb(`s${i}_${j}`, 'crops_pack/Corn_1', [x + (rng() - .5) * .3, 0, z + (rng() - .5) * .3], .35 * (.8 + rng() * .4),
  { sway: .08, ph: rng() * 6 }, { delay: i * .04 + j * .02, dust: false })));

// wind between the rows: soft white arrows running down every aisle
const wind = FURROWS.flatMap((x, i) => [1.1, 1.8].map((y, k) => ({ id: `wi${i}${k}`, type: 'arrow', params: { from: [x, y, Z0 - .6], to: [x, y + .1, Z1 + .8], head: .22, color: '#eaf6ff' },
  anim: 'grow', delay: .3 + i * .1 + k * .2, dust: false })));

// thinning: crowded clump of seedlings at the front; the extras get pulled, the strong ones stay
const KEEP = [[-.9, 3], [0, 3], [.9, 3]], EXTRA = [[-1.2, 2.8], [-.6, 3.25], [-.35, 2.75], [.3, 3.3], [.45, 2.8], [1.2, 3.2], [.65, 3.35], [-1.05, 3.3]];
const keep = KEEP.map(([x, z], i) => glb('k' + i, 'crops_pack/Corn_1', [x, 0, z], .5, { sway: .08, ph: i }, { delay: .2 + i * .1, dust: false }));
const extra = EXTRA.map(([x, z], i) => glb('e' + i, 'crops_pack/Corn_1', [x, 0, z], .32 + (i % 3) * .05, { sway: .1, ph: i * 2 }, { delay: .3 + i * .06, dust: false }));
const farmer = glb('farmer', 'modular_men/Farmer', [-4.4, 0, 2.6], 1.75, {}, { delay: .3 });

const beats = [
  // 0 hook: from above - perfect green rows, water shining in every furrow, farmer at the edge
  { t: 0, kind: 'intro', add: [canal, ...furrows, ...mature, ...water0, farmer],
    camera: { preset: 'hero', target: [0, .6, -.8], dist: 13, elev: 1.05, az: .2, zoom: 'in' } },
  // 1 "it's all about the water": close on the canal pouring into the furrows
  { t: at(1), kind: 'info', camera: { preset: 'close', target: [0, .4, -3.2], dist: 6, elev: .42, az: .35, zoom: 'out' } },
  // 2 thirsty from day one: field cleared to seedlings on bare soil, light heat shimmer
  { t: at(2), kind: 'info', remove: [...ids(mature), ...ids(water0), ...ids(furrows), 'farmer'], add: [...seed,
      { id: 'thirst', type: 'heat', pos: [0, 0, -.8], params: { w: 7.4, h: 1.2, d: 5, color: '#ffb35a' }, anim: 'fade', dust: false, delay: .4 }],
    camera: { preset: 'close', target: [0, .3, .6], dist: 6, elev: .5, az: -.25, zoom: 'in' } },
  // 3 problem: planted randomly - water rushes to one corner (flood) while the other corner dries out
  { t: at(3), kind: 'problem', remove: [...ids(seed), 'thirst'], add: scatter,
    camera: { preset: 'hero', target: [0, .5, -.8], dist: 12, elev: .85, az: .3, zoom: 'out' } },
  { t: at(3, 4), kind: 'problem', add: [...flood, ...dry],
    camera: { preset: 'hero', target: [0, .4, -.8], dist: 11, elev: .65, az: -.2, zoom: 'in' } },
  // 4 fix: straight furrows, corn on the ridges, water runs down each furrow evenly
  { t: at(4), kind: 'solution', remove: [...ids(scatter), ...ids(flood), ...ids(dry)], add: [...furrows.map(f => ({ ...f, id: f.id + 'b' })), ...young, ...water1, { ...farmer, id: 'farmer2', pos: [-4.4, 0, 2.2] }],
    camera: { preset: 'hero', target: [0, .4, -.8], dist: 12.5, elev: 1.1, az: .1, zoom: 'out' } },
  // 5 air flows between the rows - the plants breathe, no rot
  { t: at(5), kind: 'solution', remove: [...ids(young)], add: [...plant('n', 'Corn_4', 2.2, .62, .07, .1), ...wind],
    camera: { preset: 'low', target: [0, 1.2, -.6], dist: 7.5, elev: .22, az: .05, zoom: 'in' } },
  // 6 tip: too many seedlings in a clump -> the farmer pulls the extras
  { t: at(6), kind: 'tip', remove: [...ids(wind)], add: [...keep, ...extra],
    camera: { preset: 'close', target: [0, .3, 3], dist: 5, elev: .55, az: .3, zoom: 'in' } },
  { t: at(6, 7), kind: 'solution', remove: ids(extra), camera: { preset: 'close', target: [0, .35, 3], dist: 5.2, elev: .5, az: -.15, zoom: 'out' } },
  // 7 CTA: wide orbit pull-out over the green field
  { t: at(7), kind: 'info', remove: ids(keep), camera: { preset: 'orbit', target: [0, 1, -.8], dist: 15, elev: .55, az: .25, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه بيزرعوا الدرة في سطر',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
