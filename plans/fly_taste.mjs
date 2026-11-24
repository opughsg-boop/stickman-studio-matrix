// "الذبابة بتتذوق الأكل بالرجلين" (voice-over 2026-11-25, 13 lines, 65.4 s).
// A small wooden table (Poly Haven, CC0) with a sugar cube in the middle, sugar crumbs scattered around it.
// A House Fly (vinish.dev, CC BY 4.0, rigged: Idle, Walk, Fly) walks in and stops at the cube's side; its front leg tip touches the cube
// (the taste contact), a bright nerve pulse runs from the leg to the head, then the fly feeds or leaves.
// Realism: real fly size (about 7 mm; drawn at 14 mm for readability), a sugar cube about 1.4 cm, a table at real height (0.75 m).
// Nothing overlaps: the fly stands beside the cube, the crumbs keep clear of the cube and the fly body.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = i => S[Math.min(i, S.length - 1)].start;
const T = [...Array(13).keys()].map(at);
const [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12] = T;

const TOP = .75;                    // table top height (metres)
// sugar sachet: a plain cream pouch (built from primitives, no printed words), standing on the table
const SACK_X = 0, SACK_W = .062, SACK_H = .068, SACK_T = .022;
const FACE = SACK_X - SACK_W / 2 + .004;   // the pouch’s front face, where the leg touches (the fly comes from -x)
const EDGE_X = FACE - .009;               // fly body centre: its front leg reaches the pouch
const LEG = [FACE + .0003, TOP + .0045, 0], HEAD = [EDGE_X + .005, TOP + .011, 0];

// crumbs scattered on the table around the cube (not a heap); none inside the cube or under the fly
let sd = 7; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const crumbs = [];
const sackParts = [
  { shape: 'box', size: [SACK_W, SACK_H, SACK_T], pos: [SACK_X, TOP + SACK_H / 2, 0], color: '#f3ead2', rough: .32 },
  { shape: 'box', size: [SACK_W * .92, SACK_H * .10, SACK_T * 1.2], pos: [SACK_X, TOP + SACK_H * .95, 0], color: '#e2d4b0', rough: .4 },
  { shape: 'box', size: [SACK_W * .8, SACK_H * .06, SACK_T * 1.4], pos: [SACK_X, TOP + SACK_H * .99, 0], color: '#d9c9a2', rough: .45 },
];
// sugar spilling out of the open top and a few grains on the table next to the pouch
for (let i = 0; i < 90; i++) { const x = SACK_X + (rr() - .5) * SACK_W * .9, z = (rr() - .5) * SACK_T * 1.2, y = TOP + SACK_H + rr() * .012; const d = .0012 + rr() * .0012; sackParts.push({ shape: 'box', size: [d, d * .8, d], pos: [x, y, z], color: '#fbfbf7', rough: .4 }); }
for (let i = 0; i < 360; i++) {
  const a = rr() * Math.PI * 2, r = .014 + Math.sqrt(rr()) * .10;
  const x = SACK_X + Math.cos(a) * r, z = Math.sin(a) * r;
  if (Math.hypot(x - SACK_X, z) < .035 || Math.hypot(x - LEG[0], z - LEG[2]) < .025) continue;
  const d = .0009 + rr() * .0009;
  crumbs.push({ shape: 'box', size: [d, d * (.6 + rr() * .5), d * (.7 + rr() * .6)], pos: [x, TOP + d / 2, z], color: ['#fbfbf7', '#f1efe6', '#e6e1d2'][Math.floor(rr() * 3)], rough: .4 });
}
const crumbsObj = { id: 'crumbs', type: 'custom', pos: [0, 0, 0], anim: 'none', params: { parts: crumbs } };
const sack = { id: 'sack', type: 'custom', pos: [0, 0, 0], anim: 'none', params: { parts: sackParts } };
const table = { id: 'table', type: 'glb', pos: [0, 0, 0], anim: 'none', params: { model: 'ph/small_wooden_table_01', height: TOP } };

const fly = { id: 'fly', type: 'glb', pos: [-.22, TOP, 0], anim: 'none', params: { model: 'insects/house_fly', height: .014, clip: 'Walk', path: [[-.22, 0], [EDGE_X, 0]], pathSpeed: .25, mats: { Eye: { color: '#9a3b22', rough: .15 }, Hair: { visible: false }, Body: { color: '#9c9080', rough: .5 }, Wing_Clear: { opacity: .3 } } }, modes: {} };
const pulse = { id: 'pulse', type: 'pulse', pos: [0, 0, 0], anim: 'none', params: { a: LEG, b: HEAD, t0: T3, dur: T4 - T3 - .3, color: '#34e8ff' } };

const world = [table, sack, crumbsObj, fly];
const b = [];
b.push({ t: T0, kind: 'intro', add: world, camera: { target: [0, TOP + .02, 0], dist: .6, elev: .2, az: .3 } });
b.push({ t: T1, kind: 'info', camera: { target: [0, TOP + .01, 0], dist: .35, elev: .2, az: -.35 } });
b.push({ t: T2, kind: 'info', modes: { fly: { clip: 'Idle' } }, camera: { target: [(EDGE_X + FACE) / 2, TOP + .006, 0], dist: .08, elev: .3, az: 1.2 } });
b.push({ t: T3, kind: 'info', add: [pulse], camera: { target: [LEG[0] - .002, TOP + .004, 0], dist: .05, elev: .45, az: 1.35 } });
b.push({ t: T4, kind: 'info', camera: { target: [(LEG[0] + HEAD[0]) / 2, TOP + .006, 0], dist: .06, elev: .5, az: 1.35 } });
b.push({ t: T5, kind: 'info', camera: { target: [0, TOP + .01, 0], dist: .18, elev: .15, az: -.9 } });
b.push({ t: T6, kind: 'info', camera: { target: [0, TOP + .01, 0], dist: .5, elev: .25, az: -.2 } });
b.push({ t: T7, kind: 'info', modes: { fly: { clip: 'Fly', path: [[EDGE_X, 0], [-.09, .07]], pathSpeed: .18 } }, camera: { target: [-.03, TOP + .01, .02], dist: .3, elev: .2, az: .5 } });
b.push({ t: T8, kind: 'info', camera: { target: [-.04, TOP + .01, .03], dist: .45, elev: .3, az: .25 } });
b.push({ t: T9, kind: 'info', camera: { target: [0, TOP + .01, 0], dist: .4, elev: .15, az: -.6 } });
b.push({ t: T10, kind: 'info', camera: { target: [0, TOP + .02, 0], dist: .6, elev: .3, az: .4 } });
b.push({ t: T11, kind: 'info', camera: { target: [0, TOP + .01, 0], dist: .3, elev: .2, az: -.2 } });
b.push({ t: T12, kind: 'info', camera: { preset: 'orbit', target: [0, TOP + .01, 0], dist: .7, elev: .3, az: .4 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'الذبابة بتتذوق الأكل بالرجلين',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { sky: false, space: true, noStars: true, bg: '#d9d2c4', flatTop: true, soil: 'coast_sand_rocks_02', soilRepeat: 2, soilTint: [.9, .85, .78] },
  style: { camEase: .6, captionY: .78, exposure: 1.05 },
  beats: b.map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, t: undefined })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
