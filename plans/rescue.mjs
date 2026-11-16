// "إنقاذ من الدور التامن" (2026-11-16): dramatised near-fall rescue on the street facade of a 10-storey Egyptian apartment block.
// One real floor (8th, floor level 24 m) inside a painted block: window holes with sliding sashes, curtains and shutters, rooms, a corridor
// with flat doors, a stair and an end window. Street with interlock sidewalks, asphalt, lamp posts, flanking blocks and a Cairo skyline.
// Rescue pack in renderer/scene.js: apt_block, street_set, wash_rack (bends, sags, bounces, drops clothes, the hanging woman rides it),
// ac_unit (spinning fan), flat_door (rattles, opens), rig_person (bone-posed Quaternius people on keyframed tracks).
// Realism step for this video (motion): people are no longer static statues that slide. Their bones take named poses (run, climb, ledge
// shuffle, knock, kneel-and-lean, pull, look up) blended with easing, and the gait phase follows the distance moved, so feet keep pace.
// Real sizes in metres: storey 3, person 1.68-1.8, window 1.2 x 1.4, laundry rack 1.4 x 0.75, AC outdoor unit 0.85 x 0.6 x 0.3, door 0.96 x 2.08.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const ws = S[i].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const PI = Math.PI;
// keyframe tracks must run forward in time: nudge any key that is not after the previous one
const mono = keys => { let last = -1; return keys.map(k => { const t = Math.max(k[0], last + .05); last = t; return [t, ...k.slice(1)]; }); };

// ---- layout (world metres): building front at z 0 facing +z, bays 3.5 m centred on x -7, -3.5, 0, 3.5, 7; 8th floor level F = 24
const F = 24, LEDGE = F + .12, KNEEL = F - .45, CORR = -5.75;
const W1 = 7.05, SMALL = 5.95, NWIN = -3.75, DOORX = 6.2, AC = [1.1, F + .3, 0];
const RACK = [W1, F + .55, 0];                  // rack plate just under the sill of her window (sill at F + .65)

// ---- timing from the voice
const L = [0, 1, 2, 3, 4, 5, 6].map(i => at(i));
const runT = Math.min(word(1, /^وجري$|^جري$/, .35), L[1] + 1.4), arriveT = Math.max(word(1, /^بس$/, .55), runT + 3.4);
const decideT = Math.max(word(1, /^فقرر$/, .7), arriveT + .8), climbT = Math.max(word(1, /^يتسلق$/, .78), decideT + .5);
const blockT = Math.max(word(4, /^سد$/, .3), L[4] + 1.2), backT = Math.max(word(4, /^واضطره$|^يرجع$/, .45), blockT + .5), stillT = Math.max(word(4, /^الوقت$|^المنشر$/, .65), backT + .6);
const openT = Math.max(word(5, /^وفتح$|^فتح$/, .6), L[5] + .9);
const narrowT = Math.max(word(6, /^الشباك$/, .22), L[6] + 1.4), moveT = Math.max(word(6, /^فالجار$|^اتحرك$/, .42), narrowT + .6);
const grabT = Math.max(word(6, /^ومسك$|^مسك$/, .58), moveT + 1.4), pullT = Math.max(word(6, /^ومع$|^بعض$/, .72), grabT + .5);
const endT = Math.min(Math.max(pullT + 2.9, S[6].words[S[6].words.length - 2].start), D - .6);

// ---- the building, the street, the city
const win = [
  { x: -7, w: 1.2, y0: .65, y1: 2.05, shut: true },
  { x: -3.5, w: 1.2, y0: .65, y1: 2.05, open: 'L' },                // the neighbour's window (left half open)
  { x: 0, w: 1.2, y0: .65, y1: 2.05, shut: '#7a5a3a' },
  { x: 3.5, w: 1.2, y0: .65, y1: 2.05 },
  { x: SMALL, w: .65, y0: .65, y1: 1.65, open: 'full', curtain: false }, // small kitchen window: the "other window"
  { x: W1, w: 1.2, y0: .65, y1: 2.05, open: 'L' }];                 // her window, left half open, rack below
const scenery = [
  { id: 'street', type: 'street_set', pos: [0, 0, 0], params: { w: 64, z0: -30, z1: 30, lamps: [[-6, 2.05], [12.5, 2.05]],
      blocks: [[-30, -8.9, 21, '#d8c3a0', 12], [15, 30, 33, 'brick', 12]] }, anim: 'none', dust: false },
  { id: 'block', type: 'apt_block', pos: [0, 0, 0], params: { floors: 10, bays: 5, bayW: 3.5, fh: 3, depth: 12, real: 8, win, parts: [-1.75, 1.75], corr: [-6.4, -5.0],
      doors: [{ x: -4.5, w: 1, h: 2.1, open: 1.3 }, { x: .5, w: 1, h: 2.1 }, { x: DOORX, w: 1, h: 2.1, leaf: false }], stair: [-8.45, -7.25, -8.6], endWin: [-6.3, -5.15, .8, 2.65], lampX: 3 },
    anim: 'none', dust: false },
  { id: 'roof', type: 'rooftop', pos: [0, 30, -6], params: { w: 17.5, d: 12, facade: false, front: 'full', stair: { x: -5.6, z: -2.8, w: 2.4, d: 2.6, h: 2.5 },
      tanks: [[2.4, 0, -3.4, '#d8ccb0'], [4.2, 0, -3.6, '#2c2c2c']], dishes: [[-1.5, -5.3, .2, .8], [.9, -5.4, -.2, .7]], laundry: [[3.5, 1.5, 2.8, 0, 5]] }, anim: 'none', dust: false },
  { id: 'city', type: 'city', pos: [0, 26, 0], params: { ground: -30, count: 42, r0: 20, r1: 85, avoid: [[-32, 32, -16, 60]] }, anim: 'none', dust: false },
  // other floors: racks with laundry and AC units, the way real Egyptian facades look
  ...[[7, -3.5], [6, 0], [5, -7], [4, 3.5], [3, -3.5], [2, 7], [9, 0], [9, -7]].map(([n, x], i) => ({ id: 'rk' + i, type: 'wash_rack', pos: [x, n * 3 + .6, 0], params: { w: 1.3, out: .65, seed: 11 + i, clothes: 3 + i % 2 }, anim: 'none', dust: false })),
  ...[[7, -5.3], [5, 1.9], [3, -1.6], [9, 5.3], [4, -5.3]].map(([n, x], i) => ({ id: 'ac' + i, type: 'ac_unit', pos: [x, n * 3 + .3, 0], params: { rps: 18 + i * 3 }, anim: 'none', dust: false })),
  { id: 'acB', type: 'ac_unit', pos: AC, params: {}, anim: 'none', dust: false },
  { id: 'door', type: 'flat_door', pos: [DOORX - .48, F, -5.06], params: { openK: [[openT + .25, 0], [openT + 1.1, -1.65]], rattle: [arriveT + .3, decideT] }, anim: 'none', dust: false },
  // her window's rack: she hangs from it upside down; it bends, she slips to one leg, then she is pulled in through the window
  { id: 'rack', type: 'wash_rack', pos: RACK, params: { w: 1.4, out: .75, rods: 5, clothes: 3, seed: 7, groundY: .15 - RACK[1],
      hanger: { model: 'modular_women/Casual', height: 1.68, hookX: -.55, footX: .1 },
      bendK: [[0, .15], [L[2] + .2, .15], [L[3] - .1, .5], [L[3] + .6, .62], [L[4] + .3, .62], [stillT + 1.2, .85], [pullT + .2, .88], [pullT + 1.3, .6]],
      slipK: [[L[3] + .3, 0], [L[3] + .9, 1]], pullK: [[pullT + .2, 0], [pullT + 2.8, 1]],
      jolts: [[.05, 1.2], [L[3] + .75, .8], [stillT + .8, .35], [pullT + 1.1, .45]],
      drops: [[.12, -.15], [L[3] + .8, .25]], crumbs: [L[2] + .7, stillT + .9],
      pullPath: [[.35, -.3, .3, .42, -.45], [.68, -.3, .2, -.4, -1.45], [1, -.3, -.4, -2.3, -1.57]] }, anim: 'none', dust: false }];

// ---- people (rig_person tracks: [t, x, y, z, yaw|null, pose, gait])
const nb = mono([
  [0, NWIN, F, -.55, 0, 'look'], [runT - .05, NWIN, F, -.55, 0, 'look'],
  [runT + .35, -3.9, F, -1.6, null, 'run', 'run'], [runT + 1.15, -4.5, F, -4.6, null, 'run', 'run'], [runT + 1.5, -4.1, F, CORR, null, 'run', 'run'],
  [arriveT, 5.75, F, CORR, null, 'run', 'run'], [arriveT + .3, DOORX, F, -5.6, 0, 'knock'], [decideT, DOORX, F, -5.6, 0, 'knock'],
  [decideT + .35, 6.0, F, CORR, -PI / 2, 'turn'], [climbT + .3, 6.0 - Math.min(4, 3.6 * (climbT - decideT - .05)), F, CORR, null, 'run', 'run'],
  [climbT + .32, -3.75, F, -1.15, 0, 'stand'], [climbT + .9, -3.8, F, -.5, 0, 'walk', 'walk'], [climbT + 1.7, -3.8, F + .3, -.1, 0, 'climb'],
  [climbT + 2.6, -3.75, LEDGE, .2, PI, 'ledge'], [L[3] + .6, -1.5, LEDGE, .2, PI, 'peek', 'shuffle'], [blockT + .3, .38, LEDGE, .2, PI, 'ledge', 'shuffle'],
  [blockT + .7, .36, LEDGE, .2, PI, 'recoil'], [backT + .2, .36, LEDGE, .2, PI, 'recoil'], [backT + 1.7, -.6, LEDGE, .2, PI, 'peek', 'shuffle'],
  [L[5] + .85, -.6, LEDGE, .2, PI, 'peek'], [L[5] + .87, -4.5, F, -4.0, PI, 'stand'],     // back in through his flat (hidden), then down the corridor
  [L[5] + 1.1, -4.5, F, -4.9, null, 'run', 'run'], [Math.max(L[6] + .25, L[5] + 3.2), 4.95, F, CORR, null, 'run', 'run'],
  [Math.max(L[6] + .8, L[5] + 3.75), 6.1, F, -5.0, null, 'run', 'run'], [Math.max(L[6] + 1.6, L[5] + 4.55), 6.3, F, -2.2, null, 'run', 'run'], [Math.max(narrowT + .2, L[6] + 2.4), 6.35, F, -.95, 0, 'lean'],
  [moveT + .2, 6.3, F, -.95, 0, 'stand'], [moveT + 1.1, SMALL, F, -.6, .35, 'walk', 'walk'], [moveT + 1.6, SMALL, KNEEL, -.32, .35, 'kneelLean'],
  [pullT + .2, SMALL, KNEEL, -.32, .35, 'kneelLean'], [pullT + .6, SMALL, KNEEL, -.4, .35, 'pullKneel'], [pullT + 2.6, SMALL - .05, KNEEL, -.6, .3, 'pullKneel'],
  [endT + .3, 6.05, F, -1.0, .3, 'relief']]);
const guard = mono([
  [0, -7.85, F - 2.4, -9.5, PI, 'stand'], [L[5] - 3.6, -7.85, F - 2.4, -9.5, PI, 'stand'], [L[5] - 2.7, -7.85, F - 1.02, -8.1, PI, 'walk', 'walk'], [L[5] - 2.2, -7.85, F, -6.0, null, 'run', 'run'],
  [openT - .45, 5.6, F, CORR, null, 'run', 'run'], [openT - .2, DOORX, F, -5.65, 0, 'key'], [openT + .9, DOORX, F, -5.65, 0, 'key'], [L[6] + .1, DOORX, F, -5.65, 0, 'stand'],
  [L[6] + .6, DOORX, F, -4.6, null, 'run', 'run'], [L[6] + 1.4, 6.75, F, -1.2, null, 'run', 'run'], [Math.max(narrowT, L[6] + 1.9), 6.75, F, -.55, 0, 'lean'],
  [moveT + .5, 6.75, F, -.55, 0, 'lean'], [moveT + 1.3, 6.75, KNEEL, -.3, 0, 'kneelLean'], [pullT + .2, 6.75, KNEEL, -.3, 0, 'kneelLean'],
  [pullT + .55, 6.8, KNEEL, -.4, 0, 'pullKneel'], [pullT + 1.4, 7.35, KNEEL, -.7, -.3, 'pullKneel'], [pullT + 2.6, 7.45, F, -1.3, -.4, 'stand'], [endT + .3, 7.45, F, -1.3, -.6, 'relief']]);
const crowd = [['b1', 'modular_men/Farmer', 5.2, .02, 4.2, PI + .1, 'point'], ['b2', 'modular_women/Formal', 6.6, .02, 5.0, PI + .25, 'gasp'],
  ['b3', 'modular_men/Suit', 8.4, .15, 1.8, PI - .35, 'gaze'], ['b4', 'modular_women/Suit', 3.6, .02, 5.6, PI + .3, 'gaze']].map(([id, model, x, y, z, yaw, pose], i) => ({
  id, type: 'rig_person', pos: [0, 0, 0], params: { model, height: [1.76, 1.64, 1.8, 1.66][i], seed: i + 3,
    track: mono([[0, x, y, z, yaw, pose], [L[3] + .7, x, y, z, yaw, pose], [L[3] + 1.1, x, y, z + .25, yaw, i % 2 ? 'point' : 'gasp'], [endT, x, y, z + .25, yaw, i % 2 ? 'point' : 'gasp'], [endT + .5, x, y, z + .25, yaw, i < 2 ? 'cheer' : 'relief']]) },
  anim: 'none', dust: false }));
const people = [
  { id: 'nb', type: 'rig_person', pos: [0, 0, 0], params: { model: 'modular_men/Casual2', height: 1.78, seed: 1, track: nb }, anim: 'none', dust: false },
  { id: 'guard', type: 'rig_person', pos: [0, 0, 0], params: { model: 'modular_men/Worker', height: 1.74, seed: 2, track: guard }, anim: 'none', dust: false },
  ...crowd];

// ---- beats (continuous camera; heights and distances in metres)
const b = [];
// 0a hook: wide and low from across the street, the whole block in frame, she has just hit the rack (bounce, a shirt falls to the street)
b.push({ t: 0, kind: 'intro', add: [...scenery, ...people],
  camera: { preset: 'hero', target: [4.6, 13.5, 0], dist: 30.6, elev: -.41, az: .12, push: .1, spin: .04, fov: 54 } });
// 0b the rack and her, hanging upside down 24 m over the street
b.push({ t: word(0, /^منشر$/, .4), kind: 'problem', camera: { preset: 'hero', target: [6.6, 23.6, .8], dist: 6.4, elev: .05, az: .3, push: .08, spin: .05, fov: 40 } });
// 0c vertigo: from above her, straight down the facade to the street and the people looking up
b.push({ t: word(0, /^فوق$|^الشارع$/, .7), kind: 'problem', camera: { preset: 'hero', target: [6.6, 9.5, .55], dist: 20, elev: 1.45, az: 0, push: .02, spin: 0, fov: 50 } });
// 1a the neighbour two flats along sees her from his window
b.push({ t: L[1], kind: 'info', camera: { preset: 'hero', target: [-3.4, 25.2, -.2], dist: 5.2, elev: .06, az: -.3, push: .06, spin: .04, fov: 42 } });
// 1b he runs down the corridor to her door (camera looks in through the corridor's end window)
b.push({ t: runT + .6, kind: 'info', camera: { preset: 'hero', target: [3.6, 25.1, CORR], dist: 9.4, elev: .03, az: PI / 2, push: .12, spin: 0, fov: 34 } });
// 1c the door is locked: he rattles the handle
b.push({ t: arriveT + .2, kind: 'problem', add: [stk('x1', 'cross', [5.75, 26.35, -5.6], .3, { delay: .4 })],
  camera: { preset: 'hero', target: [5.6, 25.0, CORR], dist: 7.0, elev: .04, az: PI / 2, push: .06, spin: 0, fov: 34 } });
// 1d he climbs out of his own window onto the ledge outside
b.push({ t: climbT, kind: 'info', remove: ['x1'], camera: { preset: 'hero', target: [-3.1, 25.0, .1], dist: 6.6, elev: .1, az: .3, push: .05, spin: .05, fov: 42 } });
// 2 the rack's steel starts to bend (anchors give, the outer rod sags, crumbs fall)
b.push({ t: L[2], kind: 'problem', camera: { preset: 'hero', target: [6.6, 24.0, .6], dist: 5.0, elev: .14, az: .55, push: .1, spin: .04, fov: 40 } });
// 3 she slips and hangs from one leg (low angle, looking up past her)
b.push({ t: L[3], kind: 'problem', camera: { preset: 'hero', target: [6.5, 23.7, .8], dist: 5.0, elev: -.16, az: .2, push: .08, spin: .05, fov: 42 } });
// 4a the neighbour edges along the ledge into the AC unit
b.push({ t: L[4], kind: 'info', camera: { preset: 'hero', target: [.4, 25.0, .3], dist: 6.2, elev: .1, az: .45, push: .06, spin: .04, fov: 42 } });
// 4b it blocks him: he has to back off
b.push({ t: blockT + .2, kind: 'problem', add: [stk('x2', 'cross', [1.1, 25.35, .65], .3, { delay: .3 })], camera: { preset: 'hero', target: [.5, 25.0, .3], dist: 5.6, elev: .08, az: .4, push: .05, spin: .03, fov: 42 } });
// 4c meanwhile the rack keeps bending: side view along the facade, her near, him small beyond the AC
b.push({ t: stillT, kind: 'problem', remove: ['x2'], camera: { preset: 'hero', target: [4.2, 24.4, .4], dist: 12.5, elev: .06, az: 1.28, push: .06, spin: 0, fov: 38 } });
// 5 the building guard comes up the stair, runs down the corridor and unlocks her door
b.push({ t: L[5], kind: 'solution', camera: { preset: 'hero', target: [4.0, 25.1, CORR], dist: 9.0, elev: .03, az: PI / 2, push: .12, spin: 0, fov: 34 } });
// 6a both run in to her window
b.push({ t: L[6], kind: 'info', camera: { preset: 'hero', target: [6.6, 23.95, -.2], dist: 6.0, elev: .1, az: .35, push: .05, spin: .03, fov: 42 } });
// 6b the window is too narrow for two: the neighbour goes to the small window and grabs her leg from outside
b.push({ t: moveT, kind: 'solution', camera: { preset: 'hero', target: [6.4, 24.4, .2], dist: 4.6, elev: .08, az: .25, push: .06, spin: .03, fov: 42 } });
// 6c together they pull her up and in through the window
b.push({ t: pullT, kind: 'solution', camera: { preset: 'hero', target: [6.6, 24.6, -.1], dist: 5.0, elev: .14, az: .3, push: -.08, spin: .04, fov: 42 } });
// 6d safe inside: pull back to the street, the crowd cheers, the empty bent rack
b.push({ t: endT, kind: 'solution', add: [stk('ok1', 'check', [6.75, 25.9, .7], .5, { delay: .2 })],
  camera: { preset: 'hero', target: [5.2, 18.5, 0], dist: 22, elev: -.12, az: .25, push: .05, spin: .04, fov: 50 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إنقاذ من الدور التامن',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], lifts: [],
  env: { island: { w: 64, d: 60, depth: 3.2 }, flatTop: true, cover: false, horizon: 'nile', water: '#a99f8c', waves: 0, foam: false, birds: 2, motes: .5, haze: .6,
    shadowCenter: [4, 15, 0], shadowSize: 22 },
  style: { camEase: .6, captionY: .78, exposure: 1.05 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
