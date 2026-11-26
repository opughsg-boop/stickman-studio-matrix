// "تخيل مطر بيقع عليك، بس بدل الميه، المطر زجاج؟" (voice-over 2026-11-25, 12 lines, 70.9 s).
// A dark rocky plain under a giant gas-giant planet (Solar System Scope texture as a stand-in for HD 189733b), a hot star,
// and sideways glass rain (thin cyan streaks) that falls slanted and flies in the wind.
// 1x improvement over the last video (hen_twenty):
//  - Motion: two rain layers at different speeds (near layer fast, far layer slow) for depth; the planet spins slowly.
//  - Graphics: planet with an atmosphere shell, emissive glass streaks, a star glow.
//  - Realism: a dark space sky with no earth sky, no clouds, a planet in the sky; sideways wind at about 7000 km/h in the script.
// Known limits: the planet is a texture stand-in (not a real photo); the glass rain is a visual model, not a measurement.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = i => S[Math.min(i, S.length - 1)].start;
const T = [...Array(12).keys()].map(at);
const [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11] = T;
const r3 = v => Math.round(v * 1000) / 1000;

const planet = { id: 'planet', type: 'planet', pos: [0, 7, -34], anim: 'none', params: { radius: 7, tex: '2k_jupiter', glow: '#8fc6ff', spin: .05 } };
const star = { id: 'star', type: 'planet', pos: [-60, 26, -120], anim: 'none', params: { radius: 9, tex: '2k_sun', glow: '#ffb347', spin: .01 } };
const rainNear = { id: 'rainN', type: 'glass_rain', pos: [0, 2.5, 0], anim: 'none', params: { count: 700, span: [12, 5, 12], speed: 14, seed: 11 } };
const rainFar = { id: 'rainF', type: 'glass_rain', pos: [0, 2.5, -6], anim: 'none', params: { count: 500, span: [18, 6, 10], speed: 5, seed: 29 } };
const ground = { id: 'ground', type: 'shop_floor', pos: [0, 0, -2], anim: 'none', params: { w: 40, d: 40, top: 0 } };
const rock = { id: 'rock', type: 'glb', pos: [1.2, 0, -2.2], anim: 'none', params: { model: 'ph/rock_07', height: .9 } };
const rock2 = { id: 'rock2', type: 'glb', pos: [-1.8, 0, -3.5], anim: 'none', params: { model: 'ph/rock_07', height: 1.4 } };

const world = [ground, rock, rock2, planet, star, rainNear, rainFar];
const b = [];
b.push({ t: T0, kind: 'intro', add: world, camera: { target: [0, 3.5, -6], dist: 9, elev: .12, az: .2 } });
b.push({ t: T1, kind: 'info', camera: { target: [0, 7, -34], dist: 40, elev: .05, az: .3 } });
b.push({ t: T2, kind: 'info', camera: { target: [0, 1.0, -2], dist: 3.8, elev: .1, az: -.4 } });
b.push({ t: T3, kind: 'info', camera: { target: [0, 1.5, 0], dist: 7, elev: .2, az: 1.1 } });
b.push({ t: T4, kind: 'info', camera: { target: [1.2, .5, -2.2], dist: 1.6, elev: .3, az: .6 } });
b.push({ t: T5, kind: 'info', camera: { target: [0, 1.4, -1], dist: 2.4, elev: .08, az: -.9 } });
b.push({ t: T6, kind: 'info', camera: { target: [0, 1.6, -1], dist: 1.2, elev: .02, az: 0 } });
b.push({ t: T7, kind: 'info', camera: { target: [0, 3, -10], dist: 22, elev: .08, az: .15 } });
b.push({ t: T8, kind: 'info', camera: { target: [0, 6, -34], dist: 34, elev: .15, az: -.5 } });
b.push({ t: T9, kind: 'info', camera: { target: [0, 3, -4], dist: 10, elev: .22, az: .8 } });
b.push({ t: T10, kind: 'info', camera: { target: [0, 6, -34], dist: 40, elev: .05, az: .3 } });
b.push({ t: T11, kind: 'info', camera: { preset: 'orbit', target: [0, 2.5, -2], dist: 12, elev: .25, az: .4 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'تخيل مطر بيقع عليك بدل الميه، المطر زجاج',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 45,
  env: { sky: false, space: true, bg: '#03040a', flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 4 },
  style: { camEase: .6, captionY: .78, exposure: 1.0 },
  beats: b.map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, t: undefined })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
