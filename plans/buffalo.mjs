// Why the water buffalo wallows (voice-over 2026-11-16). Build-up story at a Nile Delta canal (turaa) at hot noon:
// hook (wading in) -> dark hide, sparse hair, little sweat -> PROBLEM heat -> FIX water pulls the heat -> PROBLEM dries fast + flies
// -> FIX mud coat -> mud stays damp, cools, protects -> tip: hose or a small mud pit -> CTA wide orbit.
// Every-video step up (vs salt / rooftop bees): buffalo built on the library bull (dark slate hide with dry/wet/mud shader states,
// custom flat backswept horns, wider and lower body), walk clip synced to ground speed (no hoof sliding), eased starts and stops with a
// settle bounce, breathing/panting, tail swish with follow-through, head tosses at flies; farmer in a galabeya whose sandals are planted
// step by step and whose hose arm sweeps an arc; canal water with sky reflection, ripple normals, shallow see-through edges and shore foam;
// eroded height-field banks with a wet band, ruts and hoof prints; merged reeds swaying in the wind; contact shadows; lens (fov) per beat
// and foreground blades in front of the camera.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
import { bankH, CANAL } from '../renderer/buffalo_ground.js';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const L = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => at(i));
const gy = (x, z) => +bankH(x, z).toFixed(3);
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, o.y ?? gy(x, z), z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(7);

// ---------- world: banks, water, wallow, reeds, palms, maize ----------
const waters = [{ box: [-CANAL.waterHalf, CANAL.waterHalf, -13, 13], y: CANAL.water }];
const muds = [{ c: [CANAL.wallow[0], CANAL.wallow[1]], r: [CANAL.wallow[2] * .95, CANAL.wallow[3] * .95], y: CANAL.wallowY }];
const ramp = [-6.2, -2.1, CANAL.ramp[0] + .3, CANAL.ramp[1] - .3];
const world = [
  { id: 'bank', type: 'canal_bank', pos: [0, 0, 0], params: { w: 20, d: 26 }, anim: 'none' },
  { id: 'water', type: 'canal_water', pos: [0, 0, 0], params: { len: 26, flow: .25 }, anim: 'none' },
  { id: 'wallow', type: 'mud_wallow', pos: [0, 0, 0], params: {}, anim: 'none' },
  { id: 'reeds', type: 'reeds', pos: [0, 0, 0], anim: 'none', params: { ground: 'canal', avoid: [ramp, [-1, 1.2, 9.5, 13]], areas: [
    { kind: 'reed', x: [2.05, 3.0], z: [-13, 13], n: 210, h: [1.1, 2.1], below: .42 },           // right bank: dense reeds at the waterline
    { kind: 'reed', x: [-3.0, -2.05], z: [-13, 13], n: 150, h: [1.0, 1.9], below: .42 },         // left bank (none on the cattle ramp)
    { kind: 'grass', x: [2.2, 6.6], z: [-13, 13], n: 520, h: [.18, .5], above: .05, dry: .3 },  // bank grass on slopes and path edges
    { kind: 'grass', x: [-6.6, -2.2], z: [-13, 13], n: 460, h: [.18, .5], above: .1, dry: .35 },
  ] } },
];
// palms (8-11 m) on the banks and fields, maize behind the right bank, a few shrubs and stones
[[-6.6, -7.5, 10], [-8.4, -2.6, 9], [-4.4, -10.5, 11], [4.6, -9.2, 10.5], [8.6, -4.5, 9.5], [-8.6, 9.5, 9], [7.4, 8.8, 10]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 2}`, x, z, h, { rotY: i * 1.7, params: { sway: .012, ph: i } })));
for (let i = 0; i < 64; i++) { const x = 6.3 + (i % 4) * .75 + (R() - .5) * .25, z = -12.2 + Math.floor(i / 4) * 1.15 + (R() - .5) * .3; if (z > 6) continue;
  world.push(glb('corn' + i, 'crops_pack/Corn_4', x, z, 2.0 + R() * .4, { rotY: R() * 6 })); }
[[-5.9, -4.2, .8, 'ph/shrub_02'], [5.6, 2.2, .9, 'ph/shrub_01'], [-6.4, 7.6, .7, 'ph/shrub_03'], [3.3, -3.2, .35, 'ph/rock_07'], [-3.4, 7.4, .3, 'ph/stone_01']].forEach(([x, z, h, m], i) => world.push(glb('pr' + i, m, x, z, h, { rotY: i })));

// ---------- actors ----------
// buffalo track: [t, x, z, sink (m below the ground), yaw]; it faces +x (yaw pi/2) toward the water at the start
const Y0 = Math.PI / 2;
const buffalo = { id: 'buf', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: {
  ground: 'canal', height: 1.65, clip: 'Idle', waters, muds, dust: .7,
  track: [[0, -3.9, 1.9, 0, Y0], [3.0, -1.55, 1.7, -.02], [L[3] + .25, -1.55, 1.7, -.02], [L[3] + 3.0, .35, 1.05, -.95], [L[4] + .2, .35, 1.05, -.95],
    [L[4] + 3.4, -3.0, 3.15, 0], [L[5] + .2, -3.0, 3.15, 0], [L[5] + 2.3, -4.85, 4.45, -.55], [L[6] + .2, -4.85, 4.45, -.55], [L[6] + 1.2, -4.85, 4.45, -.45],
    [L[7] + .15, -4.85, 4.45, -.45], [L[7] + 2.1, -4.45, 2.55, 0], [D, -4.45, 2.55, 0]] } };
const egret = { id: 'egret', type: 'egret', pos: [0, 0, 0], anim: 'none', params: { at: 'buffalo', ground: 'canal', height: .5, ph: .4 } };
const farmer = { id: 'fellah', type: 'fellah', pos: [0, 0, 0], anim: 'none', params: { ground: 'canal', height: 1.84, robe: '#8ea2b2', hoseFrom: [-7.4, -.6],
  track: [[0, -3.95, -4.8, 0, 0], [3.6, -3.95, -2.2], [4.6, -3.95, -2.2, 0, .6], [L[6] + .3, -3.95, -2.2, 0, .6], [L[7] - .4, -6.05, .95], [L[7] + .3, -6.05, .95, 0, .85]] } };
// full buffalo state on every beat (modes do not inherit)
const BS = { clip: 'Idle', pant: 0, haze: 0, roll: 0, wet: 0, mud: 0, mudDry: 0, flies: 0, swish: 0, steam: 0, flyR: 1, dur: 1.6 };
const buf = o => ({ ...BS, ...o });
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

const beats = [
  // 1 hook: the buffalo walks down the muddy ramp and steps into the canal; egret on its back, farmer walking on the bank path
  { t: L[0], kind: 'intro', add: [...world, buffalo, egret, farmer], modes: { buf: buf({ clip: 'Idle', haze: .25 }) },
    camera: { target: [-2.25, .95, 1.7], dist: 7.4, elev: .12, az: .72, fov: 38, zoom: 'in', fg: { side: 'l', k: .8 } } },
  // 2 dark hide, sparse hair, almost no sweat: close tele shot along the flank and back, faint shimmer
  { t: L[1], kind: 'info', modes: { buf: buf({ clip: 'Idle', haze: .45 }), egret: { at: 'buffalo' } },
    camera: { target: [-.8, 1.2, 1.75], dist: 3.2, elev: .12, az: 1.0, fov: 32, spin: -.12, push: .12 } },
  // 3 PROBLEM: summer heat, the body heats up and cannot cool itself: shimmer rises, panting, head low
  { t: L[2], kind: 'problem', modes: { buf: buf({ clip: 'Idle_Headlow', haze: 1, pant: 1 }) }, add: [stk('hot', 'face_fever', [-1.0, 2.25, 1.7], .3, { delay: .4 })],
    camera: { target: [-1.3, 1.0, 1.7], dist: 5.0, elev: .1, az: .75, fov: 40, zoom: 'in' } },
  // 4 FIX: into the water, the water pulls the heat away: ripples, splashes, steam fades, egret flies to the reeds
  { t: L[3], kind: 'solution', remove: ['hot'], modes: { buf: buf({ clip: 'Idle', haze: 0, steam: .9, wet: 1, dur: 2.2 }), egret: { at: [3.3, null, -.2], face: -1.2, dur: 1.9 } },
    camera: { target: [-.3, .45, 1.3], dist: 6.6, elev: .3, az: .15, fov: 42, zoom: 'out' } },
  // 5 PROBLEM: it walks out wet, dries fast (hide turns matte from the top), flies swarm, tail swishes, head tosses
  { t: L[4], kind: 'problem', modes: { buf: buf({ clip: 'Idle', wet: .25, flies: 1, swish: 1, dur: 4.2 }) },
    camera: { target: [-2.7, 1.0, 3.0], dist: 4.6, elev: .14, az: -.3, fov: 38, push: .08 } },
  // 6 FIX: it rolls in the mud wallow; the mud coat covers the hide and the flies leave
  { t: L[5], kind: 'solution', modes: { buf: buf({ clip: 'Idle', wet: .2, mud: 1, roll: 1, flies: 0, swish: .3, dur: 3.6 }) },
    camera: { target: [-5.2, .5, 4.75], dist: 5.6, elev: .3, az: -.28, fov: 40, zoom: 'in', fg: { side: 'b', k: .8 } } },
  // 7 the mud stays damp, cools and protects: close on the mud-coated hide, the egret lands back on it, flies hover away
  { t: L[6], kind: 'info', modes: { buf: buf({ clip: 'Idle', mud: 1, mudDry: .15, roll: .15, flies: .45, flyR: 3.2, swish: .2, dur: 3 }), egret: { at: 'buffalo', dur: 2.2, arc: 1.6 } },
    camera: { target: [-5.1, .9, 4.65], dist: 4.2, elev: .2, az: -.6, fov: 34, spin: .14 } },
  // 8 tip: no canal? the farmer sprays it with a hose (or digs a small mud pit): it stands, enjoying the water
  { t: L[7], kind: 'solution', modes: { buf: buf({ clip: 'Idle', mud: .55, mudDry: .15, wet: .9, dur: 2.5 }), fellah: { spray: 1, dur: 1.1 } },
    camera: { target: [-4.9, 1.0, 2.2], dist: 5.4, elev: .22, az: -2.15, fov: 42, push: .1 } },
  // 9 CTA: wide orbit pull-out over the whole Delta scene
  { t: L[8], kind: 'info', modes: { buf: buf({ clip: 'Eating', mud: .5, mudDry: .3, wet: .5 }), fellah: { spray: 0, dur: 1 } },
    camera: { preset: 'orbit', target: [-1.5, .6, 2.0], dist: 12, elev: .42, az: .1, fov: 42, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الجاموسة بتنزل الترعة وتتمرغ في الطين',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 20, d: 26, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [.98, .92, .86], horizon: 'nile', cover: 'medium',
    haze: .5, sunElev: 60, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .7, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: true },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
