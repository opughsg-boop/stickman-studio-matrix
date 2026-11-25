// "النحلة بترقص عشان تقول فين الأكل" (voice-over 2026-11-25, 14 lines, 76 s).
// A wooden frame of wax comb lies flat on a small wooden table (Poly Haven, CC0). A realistic honey bee (user-supplied, CC BY, credit
// in assets/lib/insects/CREDITS.md) does the waggle dance: a figure-eight with a wiggling run; a group of realistic bees hovers above, away
// from the comb (no overlap). Wordless graphics; spoken captions only.
// Realism: real bee size (about 1.5 cm), comb cells about 5.4 mm, a table at real height (0.45 m).
// 1x improvement over the last video (fly_taste): motion (waggle run with side wiggle and a figure-eight), graphics (wax comb cells),
// realism (real bee size and a hive frame at scale).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = i => S[Math.min(i, S.length - 1)].start;
const T = [...Array(14).keys()].map(at);
const [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13] = T;

const HIVE_FLOOR = .29;                                             // inside floor of the open-top hive box (the comb stands inside it)                                              // top of the roof (a real Langstroth-style hive stands about 0.5 m high)
const TOP = HIVE_FLOOR, COMB_Y = TOP + .004, BEE_Y = COMB_Y + .016;   // the comb lies inside the box on its floor; the bee hovers over the cells
// figure-eight waggle track: a loop of keys from t0 for dur seconds (run mode while the body crosses the middle)
const fig8 = (t0, dur, A, B) => { const K = []; const n = Math.round(dur / .15);
  for (let i = 0; i <= n; i++) { const ph = i / n * Math.PI * 2, t = t0 + i * .15, x = A * Math.sin(ph), z = B * Math.sin(2 * ph) / 2;
    const run = Math.cos(ph) > .2 && Math.abs(Math.sin(2 * ph)) > .2; K.push([t, x, z, run ? 'run' : 'walk']); }
  return K; };
const danceA = [[T3 - .01, -.04, -.05, 'walk'], ...fig8(T3, 4.2, .05, .06)];
const danceB = [[T8 - .01, .0, .0, 'walk'], ...fig8(T8, 3.2, .018, .02)];        // a tight round dance for a flower close by
const dancer = { id: 'dancer', type: 'waggle_bee', pos: [0, 0, 0], anim: 'none', params: { height: .015, y: BEE_Y, track: danceA } };
const dancerB = { id: 'dancerB', type: 'waggle_bee', pos: [0, 0, 0], anim: 'none', params: { height: .015, y: BEE_Y, track: danceB } };
const comb = { id: 'comb', type: 'flat_comb', pos: [0, COMB_Y, 0], anim: 'none', params: { w: .22, h: .14, flat: true } };
// the comb sits on a wooden crate (the hive stand) in a flower field
// a wooden beehive built from boxes: stand, floor, four walls with a front entrance, and a roof (real size, metres)
const wood = '#b58655', woodD = '#8a5f38';
const hivePart = (size, pos, color = wood) => ({ shape: 'box', size, pos, color, rough: .8 });
const hive = { id: 'hive', type: 'custom', pos: [0, 0, 0], anim: 'none', params: { parts: [
  ...[[-.19, -.13], [.19, -.13], [-.19, .13], [.19, .13]].map(([x, z]) => hivePart([.03, .27, .03], [x, .135, z], woodD)),
  hivePart([.46, .025, .36], [0, .2825, 0], woodD),
  hivePart([.42, .22, .02], [0, .4, -.16]),   // front wall cut away so the comb inside is visible
  hivePart([.02, .22, .32], [-.2, .4, 0]), hivePart([.02, .22, .32], [.2, .4, 0]),
  hivePart([.42, .02, .02], [0, .51, -.16], woodD)] } };   // open top: a rim, the inside is visible
const flowers = [[1.1, .3, 'ph/flower_ursinia', .28], [1.4, -.4, 'ph/flower_gazania', .22], [-1.2, .5, 'ph/periwinkle_plant', .24], [-1.5, -.6, 'ph/flower_empodium', .3], [1.9, -.9, 'nature_pack/Flowers', .35], [-2.2, .1, 'ph/flower_ursinia', .26], [.9, 1.3, 'ph/flower_gazania', .2], [-.9, -1.4, 'nature_pack/Flowers', .33], [2.4, .6, 'ph/periwinkle_plant', .25]].map(([x, z, m, h], i) => ({ id: 'fl' + i, type: 'glb', pos: [x, 0, z], anim: 'none', params: { model: m, height: h } }));
const swarm = { id: 'swarm', type: 'glb', pos: [.25, .75, -.15], anim: 'none', params: { model: 'insects/bee_group', height: .3, path: [[.25, -.15], [.45, .15], [.1, .25], [.25, -.15]], pathSpeed: .05 } };
const flower = { id: 'flower', type: 'glb', pos: [1.6, 0, -1.0], anim: 'none', params: { model: 'ph/flower_gazania', height: .22 } };

const world = [hive, comb, swarm, ...flowers];
const b = [];
b.push({ t: T0, kind: 'intro', add: [...world, dancer], camera: { target: [0, TOP + .03, 0], dist: .6, elev: .35, az: .3 } });
b.push({ t: T1, kind: 'info', camera: { target: [0, TOP + .03, 0], dist: .45, elev: .25, az: -.3 } });
b.push({ t: T2, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .25, elev: .4, az: .6 } });
b.push({ t: T3, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .2, elev: .6, az: .2 } });
b.push({ t: T4, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .3, elev: .55, az: -.8 } });
b.push({ t: T5, kind: 'info', add: [flower], camera: { target: [.7, .25, -.4], dist: 1.6, elev: .18, az: .5 } });
b.push({ t: T6, kind: 'info', camera: { target: [0, .5, -.2], dist: 1.4, elev: .3, az: .1 } });
b.push({ t: T7, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .3, elev: .5, az: .7 } });
b.push({ t: T8, kind: 'info', add: [dancerB], camera: { target: [0, TOP + .02, 0], dist: .22, elev: .55, az: -.4 } });
b.push({ t: T9, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .5, elev: .45, az: .3 } });
b.push({ t: T10, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .8, elev: .35, az: -.2 } });
b.push({ t: T11, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .4, elev: .3, az: .9 } });
b.push({ t: T12, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .8, elev: .3, az: .4 } });
b.push({ t: T13, kind: 'info', camera: { preset: 'orbit', target: [0, TOP + .02, 0], dist: .9, elev: .3, az: .4 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'النحلة بترقص عشان تقول فين الأكل',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .002,
  env: { flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 4, motes: 1.6 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, handheld: 1.4 },
  beats: b.map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, t: undefined })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
