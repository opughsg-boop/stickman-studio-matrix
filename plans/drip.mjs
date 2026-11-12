// "Drip irrigation" - diorama engine, continuous camera, no on-screen words (style lock). US English.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[Math.min(k, S[i].words.length - 1)].start);
const XS = [-3, -1.8, -.6, .6, 1.8, 3], ZS = [-.6, .6];
const BED = { rows: 2, per: 6, spacing: 1.2 };
const BLUE = '#3aa0ff', TUBE = '#20262d';
const rot = [0, 0, Math.PI / 2];
const sprinklers = [-2.4, 0, 2.4].map((x, i) => ({ id: 'sp' + i, type: 'custom', pos: [x, 0, 0], params: { parts: [{ shape: 'cylinder', size: [.22, .5, .22], pos: [0, .25, 0], color: '#8a9096', metal: .6 }, { shape: 'sphere', size: [.3, .3, .3], pos: [0, .55, 0], color: '#6d747a' }] }, anim: 'grow', delay: i * .15 }));
const spray = [-2.4, 0, 2.4].flatMap((x, i) => [-1, 1].map(s => ({ id: `sa${i}${s}`, type: 'arrow', params: { from: [x, .7, 0], to: [x + (i - 1) * .3, .9, s * 2.2], head: .25, color: BLUE }, anim: 'grow', delay: .5 + i * .1, dust: false })));
const puddles = [[-1.2, 0], [1.2, 0], [-3.6, 0], [3.6, 0], [0, 1.6], [0, -1.6]].map(([x, z], i) => ({ id: 'pd' + i, type: 'water', pos: [x, .02, z], params: { r: .55 }, anim: 'grow', delay: .3 + i * .12, dust: false }));
const tube = [
  { id: 'tb0', type: 'custom', pos: [0, 0, 0], params: { parts: [
    { shape: 'cylinder', size: [.1, 7.4, .1], pos: [0, .06, ZS[0]], rot, color: TUBE }, { shape: 'cylinder', size: [.1, 7.4, .1], pos: [0, .06, ZS[1]], rot, color: TUBE },
    { shape: 'cylinder', size: [.14, 1.6, .14], pos: [-3.9, .06, 0], rot: [Math.PI / 2, 0, 0], color: TUBE }, { shape: 'cylinder', size: [.14, 3, .14], pos: [-5, .06, 0], rot, color: TUBE }] }, anim: 'grow' }];
const drops = XS.flatMap((x, i) => ZS.map((z, j) => ({ id: `dr${i}${j}`, type: 'arrow', params: { from: [x, .9, z], to: [x, .22, z], head: .2, color: BLUE }, anim: 'grow', delay: .5 + (i * 2 + j) * .07, dust: false })));
const wet = XS.flatMap((x, i) => ZS.map((z, j) => ({ id: `wt${i}${j}`, type: 'water', pos: [x, .02, z], params: { r: .32 }, anim: 'grow', delay: .2 + (i * 2 + j) * .06, dust: false })));
const weeds = [{ id: 'wd', type: 'crops', pos: [0, 0, 0], params: { rows: 1, per: 11, spacing: .7, color: '#b3c43a', seed: 3 }, anim: 'grow', delay: .5 },
  { id: 'wd2', type: 'crops', pos: [0, 0, 1.4], params: { rows: 1, per: 11, spacing: .7, color: '#b3c43a', seed: 5 }, anim: 'grow', delay: .7 }, { id: 'wd3', type: 'crops', pos: [0, 0, -1.4], params: { rows: 1, per: 11, spacing: .7, color: '#b3c43a', seed: 9 }, anim: 'grow', delay: .9 }];
const beats = [
  // 0 hook: a bed and a hose on the island
  { t: 0, kind: 'intro', add: [{ id: 'bed', type: 'crops', params: BED, anim: 'grow' }, { id: 'hose', type: 'custom', pos: [0, 0, 3.2], params: { parts: [{ shape: 'cylinder', size: [.22, 6, .22], pos: [0, .12, 0], rot, color: '#2f8f4e' }, { shape: 'sphere', size: [.4, .4, .4], pos: [3, .15, 0], color: '#2f8f4e' }] }, anim: 'grow', delay: .4 }],
    camera: { preset: 'hero', target: [0, .6, 0], dist: 14, elev: .35, az: .25, zoom: 'in' } },
  // 1 problem: sprinkler waters everything, even between plants
  { t: at(1), kind: 'problem', remove: ['hose'], add: [...sprinklers, ...spray, ...puddles],
    camera: { preset: 'close', target: [0, .5, 0], dist: 16, elev: .45, az: .35, zoom: 'in' } },
  // 2 problem: half evaporates in the sun, weeds grow in the wet dirt
  { t: at(2), kind: 'problem', add: [{ id: 'sun', type: 'sun', pos: [-7, 7, -6], params: { r: 1.3 }, anim: 'none' }, { id: 'hz', type: 'heat', params: { w: 8, h: 2.2, d: 5 }, anim: 'fade' }, ...weeds],
    camera: { preset: 'hero', target: [0, 1, 0], dist: 15, elev: .3, az: .5, zoom: 'in' } },
  // 3 solution: clear it, drip irrigation
  { t: at(3), kind: 'solution', remove: ['sp0', 'sp1', 'sp2', 'sa0-1', 'sa01', 'sa1-1', 'sa11', 'sa2-1', 'sa21', 'pd0', 'pd1', 'pd2', 'pd3', 'pd4', 'pd5', 'hz', 'sun'],
    camera: { preset: 'hero', target: [0, .6, 0], dist: 13, elev: .3, az: .1, zoom: 'out' } },
  // 4 thin tube, drops straight to the roots
  { t: at(4), kind: 'info', add: [...tube, ...drops, ...wet],
    camera: { preset: 'detail', target: [-.5, .3, 0], dist: 11, elev: .5, az: .3, zoom: 'in' } },
  // 5 less waste, fewer weeds
  { t: at(5), kind: 'solution', remove: ['wd', 'wd2', 'wd3'],
    camera: { preset: 'close', target: [0, .4, 0], dist: 14, elev: .45, az: .6, zoom: 'out' } },
  // 6 plants grow stronger
  { t: at(6), kind: 'solution', remove: ['bed'], add: [{ id: 'bed2', type: 'crops', params: BED, scale: 1.6, anim: 'grow' }],
    camera: { preset: 'low', target: [0, .5, 0], dist: 13, elev: .2, az: .3, zoom: 'in' } },
  // 7 twist: only the roots are wet, the rest stays dry (focus on the wet dots)
  { t: at(7), kind: 'info', remove: [...XS.flatMap((x, i) => ZS.map((z, j) => `dr${i}${j}`))],
    camera: { preset: 'detail', target: [0, .1, 0], dist: 11, elev: .75, az: .1, zoom: 'in' } },
  // 8 CTA
  { t: at(8), kind: 'info', camera: { preset: 'orbit', target: [0, .8, 0], dist: 15, elev: .35, az: .2, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'en', prompt: 'Drip irrigation',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: {}, style: { camEase: .6, captionY: .78 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
