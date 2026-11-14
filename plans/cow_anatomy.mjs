// Cow anatomy window (references: opened cow model + side anatomy diagram the user sent, 2026-11-14).
// The camera stays OUTSIDE; a window is cut in the cow's left flank (cutBox) and the organs sit in their real places:
// rumen (big, rear-middle), reticulum (front, honeycomb), omasum (front-top, leaves), abomasum (along the belly floor),
// intestines (coils at the back-top), a dark body cavity behind them. Glossy pink tissue like the reference model.
import fs from 'fs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), D = tr.duration;
// measured cow (height 1.4 at pos [-1.5,0,.2]): x -2.04..-1.09, y 0..1.4, z -1.04..1.42 (head at +z), trunk z -0.95..0.8
const CX = -1.56, X = CX - .06; // organs sit just behind the window plane
const part = (shape, size, pos, color, o = {}) => ({ shape, size, pos, color, rough: o.rough ?? .45, tex: o.tex, wobble: o.wobble });
const obj = (id, parts, delay = 0) => ({ id, type: 'custom', pos: [0, 0, 0], params: { parts }, anim: 'grow', delay, dust: false });
const COW = { id: 'cow', type: 'glb', pos: [-1.5, 0, .2], params: { model: 'animals_pack/Cow', height: 1.4, clip: 'Eating', cutBox: [-3, CX, .68, 1.13, -.74, .58] } };
// intestines: a coiled tube made of overlapping beads (back-top of the cavity)
const gut = []; for (let i = 0; i < 46; i++) { const a = i * .55, r = .09 + (i % 9) * .006;
  gut.push(part('sphere', [.085, .085, .085], [X + .02, 1.0 + Math.sin(a) * r + (i % 2) * .015, -.6 + Math.cos(a) * r + (i / 46) * .2], '#d98877', { tex: 'tissue', rough: .35 })); }
const organs = [
  obj('cavity', [part('box', [.02, .5, 1.36], [CX + .2, .9, -.08], '#5e2a26', { rough: .7 })]),
  obj('rumen', [part('sphere', [.46, .5, .78], [X, .9, -.2], '#ffffff', { tex: 'tissue', wobble: .08, rough: .4 })], .2),
  obj('retic', [part('sphere', [.26, .26, .26], [X, .8, .34], '#f2d6c4', { tex: 'honeycomb', wobble: .05, rough: .45 })], .4),
  obj('omasum', [part('sphere', [.24, .24, .24], [X - .02, .99, .38], '#f0d0c0', { tex: 'leaves', wobble: .04, rough: .45 })], .55),
  obj('aboma', [part('sphere', [.2, .18, .56], [X - .02, .74, .12], '#ffffff', { tex: 'rugae', wobble: .1, rough: .4 })], .7),
  obj('gut', gut, .85),
];
const plan = { version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'cow anatomy window', captions: [], fades: [],
  env: { soil: 'brown_mud_leaves_01', soilRepeat: 2 }, style: { camEase: .6, captionY: .78 },
  beats: [{ start: 0, end: D, text: '', remove: [], modes: {}, effects: [], add: [COW, ...organs],
    camera: { punch: false, preset: 'close', target: [CX, .82, .1], dist: 4.6, elev: .16, az: -1.25, zoom: 'in' } }] };
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log('ok');
