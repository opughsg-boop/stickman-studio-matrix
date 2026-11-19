// "الثلاث أخوات: الذرة والفاصوليا والقرع" - realistic library (corn, squash, custom bean vines and root nodules). No on-screen words except captions.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i) => (i === 0 ? 0 : S[Math.min(i, S.length - 1)].words[0].start);
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const part = (shape, size, pos, color) => ({ shape, size, pos, color });
const custom = (id, parts, pos = [0, 0, 0], more = {}) => ({ id, type: 'custom', pos, params: { parts }, anim: 'grow', dust: false, ...more });
const soil = (x, z) => custom('soil', [part('box', [3.4, .5, 2.4], [0, -.25, 0], '#5b3b24'), part('box', [3.4, .04, 2.4], [0, .02, 0], '#6e4a2c')], [x, 0, z]);
// bean vines: thin green cylinders spiralling up a corn stalk
const vines = (id, x, z, h = 2.2) => custom(id, Array.from({ length: 6 }, (_, k) => part('cylinder', [.05, .5, .05], [.16 * Math.cos(k * 1.1), .25 + k * .33, .16 * Math.sin(k * 1.1)], '#4f9a3e')), [x, 0, z]);
// root nodules: pink spheres on a white/brown root system
const roots = (id, x, z) => custom(id, [part('cylinder', [.06, 1.2, .06], [0, .6, 0], '#8a6a45'), part('sphere', [.22, .22, .22], [.2, .45, .05], '#e58a9a'), part('sphere', [.18, .18, .18], [-.2, .7, .08], '#e58a9a'), part('sphere', [.2, .2, .2], [.1, .9, -.12], '#e58a9a'), part('sphere', [.16, .16, .16], [-.12, .3, -.1], '#e58a9a')], [x, 0, z]);
const beats = [
  // hook: a corn field and squash at its feet
  { t: at(0), kind: 'intro', add: [soil(0, 0), glb('corn', 'crops_pack/Corn_3', [-1.2, 0, 0], 2.4), glb('squash', 'crops_pack/Pumpkin_3', [1.2, 0, .9], .6)],
    camera: { preset: 'hero', target: [0, 1.2, 0], dist: 9, elev: .3, az: .3, zoom: 'out' } },
  // corn grows first, then beans are planted beside it
  { t: at(1), kind: 'info', add: [glb('corn2', 'crops_pack/Corn_3', [-1.2, 0, 0], 2.4), glb('bean_seed', 'crops_pack/Bamboo_1', [.2, 0, .6], .4)], remove: ['corn', 'squash'],
    camera: { preset: 'close', target: [-.4, 1.4, 0], dist: 6, elev: .3, az: .3, zoom: 'in' } },
  // beans climb the corn stalk like a ladder
  { t: at(2), kind: 'solution', remove: ['bean_seed'], add: [vines('vine', -1.2, 0)],
    camera: { preset: 'hero', target: [-.6, 1.4, 0], dist: 7, elev: .35, az: -.4, zoom: 'in' } },
  // squash spreads over the ground like a carpet
  { t: at(3), kind: 'solution', add: [custom('mat', [part('box', [3.2, .06, 2.2], [0, .05, 0], '#3d7a2a')], [0, 0, 0]), glb('squash2', 'crops_pack/Pumpkin_3', [1.4, 0, .6], .6)],
    camera: { preset: 'orbit', target: [0, .8, 0], dist: 10, elev: .4, az: .5, zoom: 'out' } },
  // the important part: root nodules
  { t: at(5), kind: 'info', remove: ['corn2', 'vine', 'mat', 'squash2'], add: [roots('root', 0, 0)],
    camera: { preset: 'close', target: [0, .6, 0], dist: 4.5, elev: .25, az: .3, zoom: 'in' } },
  // bacteria turn air nitrogen into food for the plant
  { t: at(7), kind: 'solution', remove: ['root'], add: [roots('root2', 0, 0), glb('corn3', 'crops_pack/Corn_3', [1.4, 0, .2], 2.4)],
    camera: { preset: 'hero', target: [.6, 1.0, 0], dist: 8, elev: .3, az: -.3, zoom: 'out' } },
  // the tradition: wide view of all three crops
  { t: at(8), kind: 'info', remove: ['root2'], add: [glb('pumpkin3', 'crops_pack/Pumpkin_3', [-.4, 0, 1.4], .6), vines('vine2', .8, -.4)],
    camera: { preset: 'hero', target: [0, 1.5, 0], dist: 13, elev: .32, az: .15, zoom: 'out' } },
  // caution: benefits on pests come from gardening sources, not trials
  { t: at(9), kind: 'tip', remove: ['corn3', 'pumpkin3', 'vine2'], add: [glb('corn4', 'crops_pack/Corn_3', [-1.2, 0, 0], 2.4)],
    camera: { preset: 'close', target: [-1, 1.4, 0], dist: 7, elev: .3, az: .5, zoom: 'out' } },
  // outro: wide orbit pull-out
  { t: at(11), kind: 'info', remove: ['corn4'], camera: { preset: 'orbit', target: [0, 1.4, 0], dist: 14, elev: .36, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'الثلاث أخوات',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { sky: 'kloofendal_48d_partly_cloudy_puresky', soil: 'brown_mud_leaves_01', soilRepeat: 2, horizon: 'hills' }, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
