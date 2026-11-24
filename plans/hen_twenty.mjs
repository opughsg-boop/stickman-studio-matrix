// "إزاي فرخة واحدة ممكن تبقى عشرين فرخة في سنة واحدة؟" (voice-over 2026-11-22, 16 lines, 86.7 s).
// Village yard in morning light: the mud-plaster coop with its nest boxes, a Fayoumi hen (hen builder from plans/hen_laying.mjs).
// Each line is shown by the hen and the nest: she walks the yard, settles on the nest for the 21-day brooding, calls, the brood
// comes out and follows her, she guards them, the cycle repeats three times a year. No words on screen, only spoken captions.
// 1x improvement over the last video (hen_laying):
//  - Motion: the brooding hen sinks and fluffs with a decaying wiggle, calls with a cackle rhythm, hops off the nest and pecks in the yard.
//  - Graphics: one continuous yard with a macro nest view from above, a low coop wall shot and the palm/bush scenery reused.
//  - Realism: 21-day brooding, about 10 eggs a clutch with some losses, three clutches a year, a Fayoumi hen at 0.45 m.
// Known gap: the chicks are not modelled yet (the brood is shown by the hens and the nest); add a chick asset before the next video.
// Contact: the hen feet on the nest straw (track y = surface height) and on the yard ground.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = i => S[Math.min(i, S.length - 1)].start;
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'none', ...more });
const r3 = v => Math.round(v * 1000) / 1000, PI = Math.PI;

// ---- times from the voice (line index -> start)
const T = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(at);
const [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15] = T;

// ---- layout (metres). Coop yard wall at z -.30; nest boxes on a .25 m ledge; box 0 is the hen's.
const NB = .25, NH = .40, NX = -.45, NZ = -.09, BOX0 = NX - .18, BOX1 = NX + .18, FLOOR = NB + .03, HY = FLOOR;

// ---- hen tracks [t, x, z, act, yaw, y]
const FAY = { pal: ['#b9b2a6', '#ece8e0', '#3a3530'], bars: '#5d574f', hackle: '#f1eee7', legC: '#7b8590', eye: '#4a2a14' };
const henTrack = [
  [0, .45, 1.2, 'idle', -PI / 2], [2.5, -.1, 1.0, 'idle', PI * .4], [5.0, .7, 1.3, 'peck'], [7.9, -.35, 1.5, 'idle'],       // the yard loop
  [9.5, -.63, .62, 'idle'], [11.5, -.63, .62, 'idle', PI], [12.6, BOX0, NZ + .02, 'idle', null, HY],                          // to the nest
  [T3, BOX0, NZ - .01, 'brood', 0, HY], [T4 - .2, BOX0, NZ - .01, 'broodcall', 0, HY], [T4 + .3, BOX0, NZ - .01, 'brood', 0, HY],
  [T7 - .6, BOX0, NZ - .01, 'brood', 0, HY], [T7 - .1, BOX0, NZ + .02, 'idle', 0, HY], [T7 + .6, BOX0, .5, 'idle', null, 0],   // off the nest
  [T8 - .4, .25, 1.1, 'peck'], [T9 + .5, .1, 1.45, "peck"], [T10 - 1, BOX0, .5, 'idle', null, 0],
  [T10, BOX0, NZ + .02, 'idle', null, HY], [T10 + .6, BOX0, NZ - .01, 'brood', 0, HY], [D, BOX0, NZ - .01, 'brood', 0, HY]];
const hen = { id: 'hen', type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .45, seed: 4, link: 'hen', look: FAY, track: henTrack,
  combK: [[0, .35], [D, .35]] } };
const hen2 = { id: 'hen2', type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .42, seed: 7, track: [[0, 1.3, 1.6, 'peck', -2], [6, 1.3, 1.6, 'peck'], [8, 1.0, 1.75, 'peck'], [D, 1.0, 1.75, 'peck']] } };
const hen3 = { id: 'hen3', type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .44, seed: 9, look: { ...FAY, pal: ['#aaa397', '#e9e4da', '#33302c'] },
  track: [[0, -1.2, 1.3, 'idle', 1.2], [3, -1.2, 1.3, 'peck'], [6, -1.0, 1.75, 'peck'], [D, -1.0, 1.75, 'peck']] } };
const arcs = { id: 'arcs', type: 'call_arcs', pos: [0, 0, 0], anim: 'none', params: { link: 'hen', onK: [[T4 - .2, 0], [T4 - .05, 1], [T5 - .3, 1], [T5, 0]] } };

// ---- scenery
const world = [
  { id: 'yard', type: 'coop_floor', pos: [.4, 0, 1.15], params: { w: 5.2, d: 2.9, yard: true }, anim: 'none' },
  { id: 'coop', type: 'hen_coop', pos: [0, 0, -3.0], rotY: PI, params: { w: 3.5, t: .25, h: 2.1, zb: -2.7, zf: -.3 }, anim: 'none' },
  { id: 'nests', type: 'nest_row', pos: [NX, 0, NZ], params: { n: 2, bench: NB, h: NH, eggBox: 1, eggsK: [[0, 2]] }, anim: 'none' },
  { id: 'hayY', type: 'hay_pile', pos: [1.05, 0, -.05], params: { r: .3, h: .18, count: 450 }, anim: 'none' },
  glb('crate', 'ph/wooden_crate_01', [2.8, 0, .9], .35, {}, { rotY: .05 }),
  glb('basket', 'ph/wicker_basket_01', [-.12, 0, .4], .12, {}, { rotY: .3 }),
];
[[-4.6, -3.6, 9], [-5.8, -.6, 10.5], [-4.9, 2.6, 8], [7.6, -6.5, 9.5], [-3.2, -5.5, 8.5]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, [x, 0, z], h, { sway: .01, ph: i }, { rotY: i * 1.9 })));
[[-2.4, -.1, .9, 'nature_pack/Bush_1'], [2.4, -.2, .8, 'ph/shrub_02'], [-2.7, 1.9, .7, 'ph/shrub_01'], [4.2, 1.6, .6, 'ph/shrub_01'], [-2.2, 3.1, .35, 'ph/rock_07']]
  .forEach(([x, z, h, m], i) => world.push(glb('bush' + i, m, [x, 0, z], h, { sway: .015, ph: i * 2 }, { rotY: i * 1.3 })));

// ---- beats (one new angle or state each)
const b = [];
b.push({ t: T0, kind: 'intro', add: [...world, hen, hen2, hen3], camera: { target: [.15, .24, 1.1], dist: 2.0, elev: .2, az: .2, push: .12 } });   // hook: the hen in the yard
b.push({ t: T1, kind: 'info', camera: { target: [.22, .15, 1.3], dist: 4.2, elev: .42, az: -.12 } });                                              // she walks the yard
b.push({ t: T2, kind: 'info', camera: { target: [BOX0, .4, .02], dist: 1.1, elev: .16, az: -.4 } });                                              // the nest opening
b.push({ t: T3, kind: 'info', add: [arcs], camera: { target: [BOX0, .5, -.02], dist: .95, elev: .1, az: .28, push: .08 } });                   // brooding, fluffed over the eggs
b.push({ t: T4, kind: 'info', camera: { target: [BOX0, .6, .06], dist: .62, elev: .06, az: .35 } });                                            // calls
b.push({ t: T5, kind: 'info', camera: { target: [BOX0, .55, -.05], dist: 1.6, elev: .5, az: .1 } });                                           // nest from above
b.push({ t: T6, kind: 'info', camera: { target: [-.2, .6, .45], dist: 3.4, elev: .18, az: .32 } });                                             // wide on the coop
b.push({ t: T7, kind: 'info', camera: { target: [-.2, .3, .5], dist: 2.2, elev: .1, az: .3 } });                                                // she hops off the nest
b.push({ t: T8, kind: 'info', camera: { target: [.1, .35, 1.1], dist: 1.8, elev: .2, az: .5 } });                                               // in the yard
b.push({ t: T9, kind: 'info', camera: { preset: 'orbit', target: [.2, .5, .7], dist: 4.2, elev: .3, az: .4 } });                               // the cycle repeats
b.push({ t: T10, kind: 'info', camera: { target: [.1, .3, 1.0], dist: 2.3, elev: .15, az: -.6 } });                                             // back on the nest
b.push({ t: T11, kind: 'info', camera: { target: [-.3, .6, -.4], dist: 2.6, elev: .12, az: .2 } });                                             // dry clean corner, low on the wall
b.push({ t: T12, kind: 'info', camera: { target: [.2, .5, .8], dist: 4.2, elev: .25, az: -.2 } });                                              // the yard wide
b.push({ t: T13, kind: 'info', camera: { preset: 'orbit', target: [.2, .5, .7], dist: 4.4, elev: .3, az: -.4 } });                              // why the grandparents said "brings livelihood"
b.push({ t: T14, kind: 'info', camera: { target: [-1.2, .3, 1.3], dist: 1.8, elev: .15, az: .6 } });                                            // hen3 in the foreground
b.push({ t: T15, kind: 'info', camera: { preset: 'orbit', target: [.2, .5, .7], dist: 4.6, elev: .3, az: .4 } });                               // CTA

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي فرخة واحدة تبقى عشرين فرخة في سنة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 14, d: 13, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [1.0, .94, .86], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 38, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .5, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: false, handheld: .6 },
  beats: b.map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, t: undefined })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
