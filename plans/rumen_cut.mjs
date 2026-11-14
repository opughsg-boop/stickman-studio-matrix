// Cutaway anatomy shot (reference: opened cow model): the cow is sliced open at the top, organs sit in their real places,
// the camera stays OUTSIDE and looks down into the open body. Based on plans/rumen_dive.mjs (same organs and textures).
import fs from 'fs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const sph = (d, pos, color) => ({ shape: 'sphere', size: [d, d, d], pos, color });
const organ = (id, d, pos, o) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'sphere', size: [d, d, d], pos, color: o.color, tex: o.tex, rough: .95, wobble: o.wobble }] }, anim: 'grow', delay: o.delay });
const CX = -1.5, CZ = .2, RX = CX, RY = .62, RZ = CZ + .15; // belly centre (cow body is sliced at y = 1.0)
const COW = { id: 'cow', type: 'glb', pos: [CX, 0, CZ], params: { model: 'animals_pack/Cow', height: 1.4, clip: 'Idle', cutY: 1.0 }, anim: 'grow' };
const organs = [
  organ('rumen', .62, [RX, RY, RZ], { color: '#6f5a3a', tex: 'papillae', wobble: .14, delay: .2 }),
  organ('retic', .3, [RX - .4, RY - .05, RZ + .45], { color: '#8c6f4a', tex: 'honeycomb', wobble: .08, delay: .5 }),
  ...[0, 1, 2, 3, 4].map(k => ({ id: 'leaf' + k, type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.3, .035, .3], pos: [RX + .38, RY - .05 + k * .04, RZ + .3], color: '#9d8560', tex: 'leaves', rough: .95 }] }, anim: 'grow', delay: .8 + k * .05 })),
  organ('aboma', .26, [RX + .25, RY - .32, RZ + .55], { color: '#c99e8e', tex: 'rugae', wobble: .12, delay: 1.1 })];
const beats = [
  { t: 0, add: [COW, ...organs], camera: { preset: 'hero', target: [CX, .75, CZ], dist: 6.5, elev: .42, az: .85, zoom: 'in' } },
  { t: S[3]?.words?.[0]?.start ?? 6, add: [], camera: { preset: 'close', target: [CX, .75, CZ], dist: 5, elev: .5, az: 1.2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'cutaway cow',
  captions: [], fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
