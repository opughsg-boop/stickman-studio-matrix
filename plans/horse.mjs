// "ليه الحصان بينام وهو واقف؟" - hyper-realistic pasture diorama: dozing horse, wolf at the tree line, lying horse that is slow to rise,
// giant x-ray hind leg showing the stay apparatus (patella locks over the femur ridge), herd sleeping flat with one sentry. No on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const ids = l => l.map(o => o.id);
const H = 1.9, SIDE = Math.PI / 2; // horse height, facing +x (side profile to camera)

// --- living pasture: grass tufts, shrubs, stones, a tree line at the back (the wolf comes out of it)
const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);
const tufts = Array.from({ length: 34 }, (_, i) => glb('g' + i, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][i % 3],
  [(R() - .5) * 9, 0, (R() - .5) * 7], .35 + R() * .25, {}, { anim: 'fade', dust: false }));
const flowers = Array.from({ length: 8 }, (_, i) => glb('fl' + i, 'nature_pack/Flowers', [(R() - .5) * 8, 0, 1 + R() * 2.4], .25, {}, { anim: 'fade', dust: false }));
const trees = [[-4, -3.6, 5.5, 1], [-1.6, -4.1, 6, 2], [1.4, -4, 5, 3], [3.9, -3.5, 5.8, 4]].map(([x, z, h, n], i) =>
  glb('t' + i, `nature_pack/CommonTree_${n}`, [x, 0, z], h, { sway: .015, ph: i }, { anim: 'fade', dust: false }));
const shrubs = [[-3.3, -2.4], [2.9, -2.5], [4.2, .8], [-4.3, 1.2]].map(([x, z], i) => glb('sh' + i, `ph/shrub_0${1 + i % 3}`, [x, 0, z], .8, {}, { anim: 'fade', dust: false }));
const stones = [[3.6, 2.6], [-3.7, 2.8], [.6, 3.2]].map(([x, z], i) => glb('st' + i, i ? 'ph/stone_01' : 'ph/rock_07', [x, 0, z], .3, {}, { anim: 'fade', dust: false }));
const pasture = [...tufts, ...flowers, ...trees, ...shrubs, ...stones];

// --- horses. Lying = the Death clip held on its last frame (flat on the side, how horses sleep deeply)
const standing = (id, pos, extra = {}, more = {}) => glb(id, 'animals_pack/Horse', pos, H, { clip: 'Idle_Headlow', speed: .45, ...extra }, { rotY: SIDE, ...more });
const lying = (id, model, pos, rotY, more = {}) => glb(id, `animals_pack/${model}`, pos, H, { clip: 'Death', speed: .0001, offset: 9500 }, { rotY, anim: 'fade', dust: false, ...more });
const wolf = (id, path, clip = 'Walk', pathSpeed = .12) => glb(id, 'animals_pack/Wolf', [path[0][0], 0, path[0][1]], .85, { clip, path, pathSpeed }, { anim: 'fade', dust: false });

// --- giant x-ray hind leg (magnified on purpose, standing beside the real horse)
const X0 = 2.5, BONE = '#efe6d2', TEND = '#c94a3a';
const seg = (a, b, r, color) => { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  return { shape: 'cylinder', size: [r, len, r], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2] ?? 0], rot: [0, 0, -Math.atan2(dx, dy)], color }; };
const ball = (d, p, color) => ({ shape: 'sphere', size: [d, d, d], pos: p, color });
const J = { hip: [X0 - .25, 2.75], stifle: [X0 + .12, 1.9], hock: [X0 - .2, 1.02], fet: [X0 - .12, .34], hoof: [X0 - .02, .1] };
const legBones = { id: 'leg', type: 'custom', pos: [0, 0, 0], params: { parts: [
  seg(J.hip, J.stifle, .3, BONE), seg(J.stifle, J.hock, .24, BONE), seg(J.hock, J.fet, .17, BONE), seg(J.fet, J.hoof, .15, BONE),
  ball(.42, [...J.stifle, 0], BONE), ball(.2, [J.stifle[0] + .2, J.stifle[1] + .16, 0], '#d6c7a6'), // femur condyle + the ridge ("hook")
  ball(.32, [...J.hock, 0], BONE), ball(.22, [...J.fet, 0], BONE),
  { shape: 'cone', size: [.36, .22, .36], pos: [J.hoof[0], .11, 0], color: '#3a3430' },
  seg([X0 - .34, 1.05, .05], [X0 - .26, .38, .05], .06, TEND), seg([X0 - .02, 1.75, .05], [X0 - .3, 1.12, .05], .06, TEND)] },
  anim: 'grow', delay: .3 };
const PAT_DOWN = [J.stifle[0] + .3, J.stifle[1] - .08, 0], PAT_UP = [J.stifle[0] + .33, J.stifle[1] + .22, 0];
const patella = (id, p, more = {}) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts: [
  { shape: 'sphere', size: [.2, .28, .18], pos: p, color: BONE }, seg([p[0], p[1] - .1, .06], [J.stifle[0] + .06, J.stifle[1] - .55, .06], .07, TEND),
  seg([p[0] - .04, p[1] - .1, -.06], [J.stifle[0] + .02, J.stifle[1] - .55, -.06], .07, TEND)] }, anim: 'fade', dust: false, ...more });
const lockGlow = { id: 'lockG', type: 'custom', pos: [0, 0, 0], params: { parts: [ball(.36, [PAT_UP[0] - .04, PAT_UP[1] - .02, 0], '#45e07a')] }, anim: 'grow', delay: .15, dust: false };
const legStand = { id: 'legS', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.9, .06, .9], pos: [X0 - .05, .03, 0], color: '#8a8580' }] }, anim: 'grow', dust: false };

const beats = [
  // 0 hook: a big horse asleep on its feet in a green pasture, head low, slow breathing
  { t: 0, kind: 'intro', add: [...pasture, standing('h', [-.3, 0, .4], {}, { delay: .2 })],
    camera: { preset: 'hero', target: [-.3, 1.2, .4], dist: 8, elev: .22, az: .35, zoom: 'in' } },
  // 1 prey: a wolf slinks out of the tree line
  { t: at(1), kind: 'problem', add: [wolf('wolf', [[-4.2, -3], [-1.8, -1.6]])],
    camera: { preset: 'hero', target: [-1.4, .9, -.8], dist: 10, elev: .25, az: -.25, zoom: 'out' } },
  // 2 heavy body: lying on the ground, it takes time to get up - wolf closes in
  { t: at(2), kind: 'problem', remove: ['h', 'wolf'], add: [lying('hl', 'Horse', [-.3, 0, .4], SIDE), wolf('wolf2', [[-3.6, -2.2], [-1.9, -.6]], 'Walk', .16)],
    camera: { preset: 'low', target: [-.6, .6, .2], dist: 7, elev: .16, az: .2, zoom: 'in' } },
  // 3 fix: the stay apparatus - giant x-ray hind leg beside the standing horse
  { t: at(3), kind: 'solution', remove: ['hl', 'wolf2'], add: [standing('h2', [-1.2, 0, .3]), legStand, legBones, patella('patD', PAT_DOWN)],
    camera: { preset: 'close', target: [1.2, 1.4, .2], dist: 7, elev: .2, az: .15, zoom: 'out' } },
  // the patella slides up and hooks over the femur ridge: the knee is locked, muscles relax
  { t: at(3, 4), kind: 'solution', remove: ['patD'], add: [patella('patU', PAT_UP), lockGlow],
    camera: { preset: 'close', target: [X0 + .1, 1.8, 0], dist: 5, elev: .15, az: .3, zoom: 'in' } },
  // 4 light sleep: dozing ... senses something -> gallops off in a second
  { t: at(4), kind: 'info', remove: ['leg', 'legS', 'patU', 'lockG'], add: [wolf('wolf3', [[4.5, -3.2], [3, -2.2]], 'Idle', .01)],
    camera: { preset: 'hero', target: [-1, 1.1, .2], dist: 7.5, elev: .22, az: -.3, zoom: 'out' } },
  { t: at(4, 5), kind: 'solution', modes: { h2: { clip: 'Gallop', speed: 1, path: [[-1.2, .3], [-3.4, 1.9]], pathSpeed: .45 } },
    camera: { preset: 'hero', target: [-2.2, 1, 1.1], dist: 10, elev: .25, az: .1, zoom: 'in' } },
  // 5 deep sleep needs lying flat - safe pasture, about an hour a day
  { t: at(5), kind: 'info', remove: ['h2', 'wolf3'], add: [lying('deep', 'Horse', [.2, 0, .6], SIDE + .3)],
    camera: { preset: 'close', target: [.2, .5, .6], dist: 6, elev: .35, az: .25, zoom: 'out' } },
  // 6 tip: the herd lies down, one horse stays standing awake as the sentry
  { t: at(6), kind: 'tip', add: [lying('l1', 'Horse_White', [-2.2, 0, -.6], SIDE - .5, { delay: .2 }), lying('l2', 'Horse', [2.3, 0, -.9], SIDE + 2.4, { delay: .35 }),
      glb('sentry', 'animals_pack/Horse_White', [-.6, 0, 2.2], H, { clip: 'Idle_2' }, { rotY: -.4, delay: .5 })],
    camera: { preset: 'hero', target: [0, .8, .4], dist: 11, elev: .4, az: .1, zoom: 'in' } },
  // 7 CTA: wide orbit pull-out over the sleeping herd
  { t: at(7), kind: 'info', camera: { preset: 'orbit', target: [0, .8, 0], dist: 14, elev: .42, az: .3, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الحصان بينام وهو واقف',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'aerial_grass_rock', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
