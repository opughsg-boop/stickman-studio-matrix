// "The Cow With Four Stomachs" (English) - diorama + realistic library, continuous camera, no on-screen words.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const sph = (d, pos, color) => ({ shape: 'sphere', size: [d, d, d], pos, color });
const glb = (id, model, pos, height, extra = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow' });
const arrow = (id, from, to, color, delay = 0) => ({ id, type: 'arrow', pos: [0, 0, 0], params: { from, to, head: .25, color }, anim: 'grow', delay, dust: false });

// cow on the left, a giant "x-ray" model of its 4 stomach chambers on the right
const COW = glb('cow', 'animals_pack/Cow', [-1.5, 0, .2], 1.4, { clip: 'Eating' });
const RX = 1.6, RY = .95; // rumen centre
const stomach = [
  { id: 'rumen', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(1.3, [RX, RY, 0], '#d9837a')] }, anim: 'grow', delay: .5 },
  { id: 'retic', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(.62, [RX - .95, RY + .35, .15], '#c0645c')] }, anim: 'grow', delay: .75 },
  { id: 'omasum', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(.55, [RX + .95, RY + .25, .35], '#a8524e')] }, anim: 'grow', delay: 1 },
  { id: 'aboma', type: 'custom', pos: [0, 0, 0], params: { parts: [sph(.5, [RX + 1.05, RY - .4, .55], '#e8a28f')] }, anim: 'grow', delay: 1.25 },
  { id: 'stand', type: 'custom', pos: [0, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.25, .35, .25], pos: [RX, .17, 0], color: '#8a8580' }] }, delay: .4, dust: false }];
const grass = [[-2.6, 1.4], [-.6, 1.6], [-2.8, -1.2], [.2, -1.5], [3, -1.2], [-3.4, .2], [3.4, 1.6]]
  .map(([x, z], i) => glb('g' + i, i % 2 ? 'ph/grass_medium_02' : 'ph/grass_medium_01', [x, 0, z], .45));
const microbes = { id: 'microbes', type: 'custom', pos: [0, 0, 0], anim: 'grow', dust: false,
  params: { parts: Array.from({ length: 34 }, (_, i) => { const a = i * 2.4, r = .55 + (i % 4) * .06, y = Math.sin(i * 1.7) * .5;
    const rr = Math.sqrt(Math.max(.05, r * r - y * y)); return sph(.07 + (i % 3) * .02, [RX + Math.cos(a) * rr, RY + y, .3 + Math.abs(Math.sin(a)) * rr * .8], ['#7be36b', '#b07bff', '#5fd0ff'][i % 3]); }) } };
const toMouth = [-1.5 + .1, 1.25, 1.05]; // cow head height (cow faces +z)

const beats = [
  { t: 0, kind: 'intro', add: [{ ...COW, delay: .2 }, ...grass, ...stomach], camera: { preset: 'hero', target: [.4, .9, 0], dist: 13, elev: .3, az: .2, zoom: 'in' } },
  { t: at(1), kind: 'problem', add: [{ id: 'tough', type: 'hay', pos: [.4, .05, 1.9], params: { w: 1.4, d: .9, count: 120, hgt: .12, color: '#8f8a3e' }, anim: 'grow', dust: false },
      glb('fox', 'animals_pack/Fox', [3.2, 0, 2.6], .6, { clip: 'Walk', path: [[3.4, 3], [1.3, 2.1]], pathSpeed: .35 })],
    modes: { cow: { clip: 'Idle' } }, camera: { preset: 'close', target: [.9, .4, 1.9], dist: 5.5, elev: .3, az: .6, zoom: 'in' } },
  { t: at(2), kind: 'solution', add: [microbes, arrow('feed', [.4, .4, 1.9], [RX - .3, RY - .2, .7], '#7be36b', .3)],
    modes: { fox: { clip: 'Idle_Headlow', path: [[1.3, 2.1], [1.3, 2.1]] }, cow: { clip: 'Eating' } },
    camera: { preset: 'close', target: [RX, RY, .3], dist: 6, elev: .2, az: .15, zoom: 'out' } },
  { t: at(3), kind: 'tip', remove: ['feed'], add: [arrow('up', [RX - .55, RY + .55, .5], toMouth, '#ffd23f', .1), arrow('down', [toMouth[0] + .15, toMouth[1] - .35, toMouth[2] - .2], [RX - .65, RY - .1, .55], '#4fb3ff', 1.4)],
    modes: { cow: { clip: 'Eating' }, fox: { clip: 'Walk', path: [[1.3, 2.1], [3.6, 3.4]], pathSpeed: .3 } },
    camera: { preset: 'close', target: [0, 1.1, .5], dist: 7.5, elev: .3, az: .35, zoom: 'in' } },
  { t: at(4), kind: 'info', remove: ['up', 'down', 'fox'], add: [glb('barrel', 'medieval_village_pack/Barrel', [RX - .1, 0, 1.55], 1.3)],
    modes: { cow: { clip: 'Idle_2' } }, camera: { preset: 'hero', target: [RX - .2, .8, .7], dist: 7.5, elev: .25, az: -.25, zoom: 'out' } },
  { t: at(5), kind: 'solution', add: [{ id: 'clock', type: 'clock24', pos: [-3.3, 0, -1.3], params: { r: .6 }, anim: 'grow', delay: .2 },
      arrow('e1', [-1.8, 1.6, .2], [-1.8, 2.8, .2], '#ffd23f', .5), arrow('e2', [-1.2, 1.6, .4], [-1.2, 3, .4], '#ffd23f', .7)],
    modes: { cow: { clip: 'Eating' }, clock: { speed: 6 } }, camera: { preset: 'close', target: [-1.6, 1.3, .1], dist: 6.5, elev: .3, az: .55, zoom: 'in' } },
  { t: at(6), kind: 'info', remove: ['e1', 'e2'], add: [glb('bull', 'animals_pack/Bull', [3.6, 0, -2], 1.5, { clip: 'Walk', path: [[3.8, -2.6], [2.6, -1.2]], pathSpeed: .25 })],
    modes: { cow: { clip: 'Idle' } }, camera: { preset: 'orbit', target: [.4, .9, 0], dist: 14, elev: .35, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'The cow with four stomachs',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
