// "الذبابة بتتذوق الأكل بالرجلين" (voice-over 2026-11-25, 13 lines, 65.4 s).
// A wooden table with a heap of sugar; a House Fly (vinish.dev, CC BY 4.0, rigged: Idle, Walk, Fly) lands, walks on the sugar,
// its feet taste it (macro on the legs), its proboscis unfolds for sweet, then it flies off on a bitter/bad signal.
// Realism: real fly size (about 7 mm), real legs on the sugar surface, no overlap between the fly and the sugar grains.
// 1x improvement over the last video (glass_rain): Motion (walk and lift-off clips with a real fly path), Graphics (macro camera on legs),
// Realism (real fly scale, real sugar grains).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = i => S[Math.min(i, S.length - 1)].start;
const T = [...Array(13).keys()].map(at);
const [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12] = T;

// table top height and a sugar heap (small white grains, real size about 0.6 mm to 1 mm)
const TOP = .36;
let sd = 7; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const grains = []; for (let i = 0; i < 160; i++) { const a = rr() * Math.PI * 2, r = Math.sqrt(rr()) * .05, h = Math.max(0, .018 - r * .32);
  grains.push({ shape: 'box', size: [.0009, .0009, .0009], pos: [Math.cos(a) * r, TOP + h, Math.sin(a) * r], color: rr() > .5 ? '#f7f5ef' : '#ece8dc' }); }
const sugar = { id: 'sugar', type: 'custom', pos: [0, 0, 0], anim: 'none', params: { parts: grains } };
const table = { id: 'table', type: 'glb', pos: [0, 0, 0], anim: 'none', params: { model: 'ph/wooden_crate_01', height: TOP } };

// the fly: lands from the front-left, walks onto the sugar, feeds, leaves
const fly = { id: 'fly', type: 'glb', pos: [0, TOP, 0], anim: 'none', params: { model: 'insects/house_fly', height: .008, clip: 'Fly', path: [[-.25, .0], [0, .0]], pathSpeed: .8 },
  modes: {} };

const world = [table, sugar, fly];
const b = [];
b.push({ t: T0, kind: 'intro', add: world, camera: { target: [0, .38, 0], dist: 1.1, elev: .18, az: .3 } });
b.push({ t: T1, kind: 'info', camera: { target: [0, .38, 0], dist: .42, elev: .2, az: -.35 } });
b.push({ t: T2, kind: 'info', camera: { target: [0, .37, 0], dist: .12, elev: .12, az: .7 } });
b.push({ t: T3, kind: 'info', camera: { target: [0, .37, 0], dist: .28, elev: .45, az: .1 } });
b.push({ t: T4, kind: 'info', camera: { target: [0, .37, 0], dist: .06, elev: .08, az: -.5 } });
b.push({ t: T5, kind: 'info', camera: { target: [0, .37, 0], dist: .2, elev: .3, az: .9 } });
b.push({ t: T6, kind: 'info', camera: { target: [0, .38, 0], dist: .9, elev: .25, az: -.2 } });
b.push({ t: T7, kind: 'info', camera: { target: [0, .38, 0], dist: .4, elev: .1, az: .5 } });
b.push({ t: T8, kind: 'info', camera: { target: [0, .38, 0], dist: 1.2, elev: .35, az: .25 } });
b.push({ t: T9, kind: 'info', camera: { target: [0, .38, 0], dist: .5, elev: .15, az: -.6 } });
b.push({ t: T10, kind: 'info', camera: { target: [0, .4, 0], dist: 1.4, elev: .3, az: .4 } });
b.push({ t: T11, kind: 'info', camera: { target: [0, .38, 0], dist: .3, elev: .2, az: -.2 } });
b.push({ t: T12, kind: 'info', camera: { preset: 'orbit', target: [0, .38, 0], dist: 1.6, elev: .3, az: .4 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'الذبابة بتتذوق الأكل بالرجلين',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { sky: false, space: true, noStars: true, bg: '#d9d2c4', flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 2 },
  style: { camEase: .6, captionY: .78, exposure: 1.05 },
  beats: b.map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, t: undefined })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
