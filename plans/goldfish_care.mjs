// "لو اشتريت سمكة دهبية..." goldfish care (voice-over 2026-11-27, 20 script lines, 117.3 s, one take). A sunny tiled roof terrace under the
// real 3D sky: a wooden table with a 25 cm round glass bowl and a chrome tap (left), a 1.2 m glass aquarium on a walnut cabinet (right),
// a 1.75 m owner who works at both, potted shrubs at the parapet. Every spoken line is shown, never written (no digits, signs or labels):
//  1 the fish plunges into the bowl, the tap tops it up, sparkles          2 the fish gasps at the surface, gills flapping fast, point-down
//  3 chlorine haze clouds the water, cross by the tap, ring on the gills    4 the owner drips dechlorinator from a bottle, the haze clears, check
//  5 clear water, sparkles; then the bowl itself is wrong, thumbs-down      6 ring on the narrow mouth, the fine air bubbles die out, fish gasps, lungs
//  7 the fish darts in circles against the curved glass, eyes, scream face  8 days pass (hourglass), the water turns cloudy
//  9 waste flecks pile on the gravel, a yellow ammonia haze rises, warning, sick face
// 10 the tank rises: filter switches on (outflow ripples, point-right), bacteria glow on it (microbe), the yellow haze clears (check), the
//    air stone bubbles (water drop)                                         11 warning; the owner tips a heap of pellets in, point-down, all fish rush up
// 12 question; the fish turns clear (x-ray): a straight gut, no stomach (magnifier), keeps eating (yum face)
// 13 left-over pellets sink, rot brown with white mould, the water goes murky (warning); one fish floats belly up (cross, the only cross after line 3)
// 14 a small pinch, eaten at once, check                                   15 the hose drains the whole tank (arrow down), the fish thrash on the
//    gravel, the jug refills it at once, fever face, warning               16 the hose takes a quarter into the bucket (check), the jug tops it up (drop, check)
// 17 thinking face, hourglass                                               18 brain; the owner squats at the glass, the fish comes to his face (love
//    face); it swims through three coloured hoops (sparkles)               19 the fish grows big in the big tank (arrow up, sparkles)
// 20 forbidden sign on the round bowl, slow pull-out to the bowl and the tank, check on the tank
// Step up vs the last videos (water_mill 75, donkey_load 78):
//  motion   - (1) goldfish swim with a travelling body wave, a lagging forked tail and fluttering fins; speed sets the tail beat; (2) gill covers
//             open and close over red gills, fast when the fish is stressed; (3) the owner walks round the tank (distance-synced steps),
//             drips, feeds, siphons and pours with the prop riding his palm
//  graphics - (1) a clear glass bowl and a glass tank with rippled water surfaces, haze, ammonia and turbidity tints; (2) swaying vallisneria,
//             anubias, a rock, driftwood, a filter with outflow bubbles, an air stone bubble column, glowing bacteria; (3) pellets that float,
//             sink and rot with mould, an x-ray fish with its gut
//  realism  - (1) real sizes: bowl 25 cm across with a 15 cm mouth, fish 10-12 cm growing to 27 cm, tank 1.2 x .4 x .45 m on a .55 m cabinet,
//             table .78 m, owner 1.75 m, bucket .28 m, pellets 7 mm; (2) palms on the bottle, the hose (at the back rim) and the jug by
//             construction (0 m); (3) the fish stay inside the glass and clear of the filter (swim bounds), each beat adds a new action
//  sound    - deep water bubbles bed .03 and a light outdoor ambience .015 (global caps unchanged)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => { const s = S[Math.min(i, S.length - 1)]; return s.words[Math.min(k, s.words.length - 1)].start; };
const L = i => (i === 0 ? 0 : W(i));
const PI = Math.PI;
const stk = (id, name, pos, size = .08, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0, anim = 'none') => ({ id, type, pos, rotY, params, anim, dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, o.y || 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: o.anim || 'none', dust: false });

// ---------- key times (script line i, word k) ----------
const T = { put1: W(0, 4), tap1: W(0, 9), have1: W(0, 18), pant2: W(1, 5), surf2: W(1, 6), chl3: W(2, 3), gill3: W(2, 5), drops4: W(3, 7), safe4: W(3, 13),
  clear5: W(4, 1), lie5: W(4, 10), mouth6: W(5, 1), o2_6: W(5, 2), choke6: W(5, 6), glass7: W(6, 1), sight7: W(6, 3), stress7: W(6, 8), days8: W(7, 1),
  murky8: W(7, 4), waste9: W(8, 3), amm9: W(8, 8), skin9: W(8, 11), tank10: W(9, 1), filt10: W(9, 4), bact10: W(9, 9), tox10: W(9, 11), o2_10: W(9, 15),
  err11: W(10, 3), food11: W(10, 7), info12: W(11, 1), stom12: W(11, 8), full12: W(11, 11), rot13: W(12, 2), tox13: W(12, 5), bladder13: W(12, 10),
  flip13: W(12, 14), pinch14: W(13, 3), mins14: W(13, 7), week15: W(14, 1), clean15: W(14, 3), all15: W(14, 7), shock15: W(14, 10), die15: W(14, 14),
  draw16: W(15, 2), part16: W(15, 8), add16: W(15, 10), temp16: W(15, 13), myth17: W(16, 1), mem17: W(16, 6), sec17: W(16, 9), truth18: W(17, 2),
  face18: W(17, 6), tricks18: W(17, 9), grow19: W(18, 7), years19: W(18, 12), law20: W(19, 5), bowl20: W(19, 10), tort20: W(19, 13) };

// ---------- layout (metres; terrace x -4..4, z -3..3, camera mostly from +z; sun behind the camera) ----------
const BOWL = [-.95, -.2], TABLE_Y = .78, BC = [BOWL[0], TABLE_Y + .1, BOWL[1]];               // bowl centre (25 cm sphere cut flat at +-10 cm)
const TK = [1.0, -.5], STAND = .55, TH = .45, TW = TK[0], RIM = STAND + TH, WTOP = RIM - .05, TMID = STAND + .24;  // tank (1.2 x .4 x .45)
const TL = (x, y, z) => [TK[0] + x, y, TK[1] + z];                                                // tank-space -> world (y already world)
// owner (Casual 1.75 m). pickReach R palm (-.11, 1.03, .40), stakePushHi palms (0, 1.32, .34), squatReach palms (0, .15, .40) when facing +z
const PB = [BOWL[0] + .11, BOWL[1] - .40];                       // bottle over the bowl mouth: palm (-.95, 1.03, -.2), mouth at .98
const FEED = [.85, -.64], PF = [FEED[0] + .11, FEED[1] - .40];   // feeding: palm 6 cm inside the back glass, 3 cm over the rim
const HOSE = [.6, -.69], PH = [HOSE[0] + .11, HOSE[1] - .40];    // siphon: palm on the hose at the back rim
const JUG = [1.1, -.62], PJ = [JUG[0], JUG[1] - .34];            // jug held at 1.32 m, spout over the water
const FACE = [1.1, .17];                                          // squatting at the front glass, facing -z
const BUCKET = [.25, -1.0], REST_B = [-2.15, -1.35], REST_T = [2.05, -1.35];   // where the owner waits, out of the close shots

const tap = { id: 'bowl', type: 'gf_bowl', pos: [BOWL[0], TABLE_Y, BOWL[1]], anim: 'none', dust: false, params: { link: 'bowl', size: .1, tap: [-.2, -.13], fishIn: T.put1 + .1,
  waterK: [[0, .6], [T.tap1 - .2, .6], [T.tap1 + 1.3, 1], [T.amm9, 1]], tapK: [[0, 0], [T.tap1 - .4, 0], [T.tap1 - .2, 1], [T.tap1 + 1.2, 1], [T.tap1 + 1.5, 0]],
  modeK: [[0, 'swim'], [T.pant2 - .3, 'surface'], [L(3), 'swim'], [T.choke6 - .6, 'surface'], [L(6), 'stress'], [L(7) + .2, 'swim'], [T.skin9, 'surface'], [L(9), 'swim']],
  gillK: [[0, .1], [T.pant2 - .6, .1], [T.pant2, 1], [T.safe4 - .4, 1], [T.safe4 + .3, .15], [T.o2_6 + .6, .15], [T.choke6, 1], [L(7), .8], [L(7) + 1, .3], [T.amm9, .3], [T.skin9, 1], [L(9) + 1, 1], [L(16), .2]],
  hazeK: [[0, 0], [T.chl3 - .3, 0], [T.chl3 + .8, .9], [T.drops4 + .6, .9], [T.safe4, 0]],
  o2K: [[0, 1], [T.o2_6, 1], [T.o2_6 + 1.4, .1]], turbK: [[0, 0], [T.days8, 0], [T.murky8 + .4, .7], [L(19) - 1, .7], [L(19), .45]],
  wasteK: [[0, 0], [T.waste9 - .2, 0], [T.waste9 + 1.4, 1]], ammK: [[0, 0], [T.amm9 - .2, 0], [T.amm9 + 1.0, 1], [L(19) - 1, 1], [L(19), .5]],
  bottle: { by: 'owner', hand: 'R', t0: T.drops4 - 1.0, t1: T.safe4 + .6, dropK: [[0, 0], [T.drops4 - .4, 0], [T.drops4 + .1, 1], [T.safe4 - .2, 1], [T.safe4 + .2, 0]] } } };

// the aquarium (appears with line 10)
const tank = { id: 'tank', type: 'gf_tank', pos: [TK[0], 0, TK[1]], anim: 'rise', dust: false, params: { link: 'tank', L: 1.2, D: .4, H: TH, stand: STAND, fishN: 3, sizes: [.12, .11, .1],
  sizeK: [[0, .12], [T.grow19 - .4, .12], [T.grow19 + 2.4, .27]],
  filterK: [[0, 0], [T.filt10 + .2, 0], [T.filt10 + .25, 1]], bactK: [[0, 0], [T.bact10 - .2, 0], [T.bact10 + 1.0, 1], [L(10), 1], [L(10) + 1, .3]],
  airK: [[0, 0], [T.o2_10 - .3, 0], [T.o2_10 - .25, 1]], ammK: [[0, .55], [T.tox10, .55], [T.tox10 + 1.3, 0]],
  hazeK: [[0, 0], [T.rot13, 0], [T.tox13 + 1, .55], [L(13) - .3, .55], [L(13) + .8, 0]],
  feeds: [{ t: T.food11 - .3, n: 46, eat: 10, at: [FEED[0] - TK[0], FEED[1] - TK[1] + .02] }, { t: T.pinch14 - .1, n: 6, eat: 6, at: [FEED[0] - TK[0], FEED[1] - TK[1] + .02] }],
  feedAt: [FEED[0] - TK[0], FEED[1] - TK[1] + .06], feedClear: L(13) - .1, rotK: [[0, 0], [T.rot13 - .3, 0], [T.rot13 + 1.5, 1]], floatAt: [.05, 0],
  xrayK: [[0, 0], [T.stom12 - .9, 0], [T.stom12 - .3, 1], [T.full12 + .6, 1], [L(12), 0]],
  waterK: [[0, 1], [T.clean15 + .2, 1], [T.all15 + 1.6, .08], [T.shock15 - .5, .08], [T.die15 + .6, 1], [T.draw16 + .4, 1], [T.part16 + .2, .74], [T.add16 + .5, .74], [T.temp16 + .4, 1]],
  bucketK: [[0, 0], [T.clean15 + .2, 0], [T.all15 + 1.6, .9], [L(15) - .2, .9], [L(15), .2], [T.draw16 + .4, .2], [T.part16 + .2, .55]],
  hose: { by: 'owner', hand: 'R', t0: 0, t1: 0, intake: [-.3, -.04], bucket: [BUCKET[0] - TK[0], BUCKET[1] - TK[1]] },
  jug: { by: 'owner', hand: 'R', t0: 0, t1: 0, pourK: [] },
  hoops: [[-.3, .2, .04, '#e0362c'], [-.12, .2, .04, '#f2c21c'], [.06, .2, .04, '#2f7fd8']], hoopK: [[0, 0], [T.tricks18 - .9, 0], [T.tricks18 - .85, 1]],
  faceAt: [FACE[0] - TK[0], .22, .1],
  modes: {
    0: [[0, 'swim'], [T.food11 + .2, 'eat'], [T.stom12 - 1.0, 'face'], [L(12), 'swim'], [T.pinch14 + .1, 'eat'], [L(14), 'swim'], [T.all15 + .6, 'bottom'], [T.die15 + .8, 'swim'],
      [T.face18 - .4, 'face'], [T.tricks18 - .6, 'hoops'], [L(18), 'swim']],
    1: [[0, 'swim'], [T.food11 + .4, 'eat'], [T.stom12, 'swim'], [T.flip13 - .8, 'float'], [L(13) + .3, 'swim'], [T.pinch14 + .2, 'eat'], [L(14), 'swim'], [T.all15 + .6, 'bottom'], [T.die15 + .8, 'swim']],
    2: [[0, 'swim'], [T.food11 + .6, 'eat'], [T.full12 + .5, 'swim'], [T.pinch14 + .3, 'eat'], [L(14), 'swim'], [T.all15 + .6, 'bottom'], [T.die15 + .8, 'swim']] } } };
// hose and jug windows (palm grips; the owner holds them while the pose is on)
const HOSE1 = [T.clean15 + .1, T.all15 + 1.8], HOSE2 = [T.draw16 - .2, T.part16 + .5], JUG1 = [T.shock15 - .9, T.die15 + .9], JUG2 = [T.add16 - .3, T.temp16 + .7];
tank.params.hose.wins = [HOSE1, HOSE2];
const pourW = ([a, b]) => [[a + .5, 0], [a + .9, 1], [b - .6, 1], [b - .2, 0]];
tank.params.jug = { by: 'owner', hand: 'R', wins: [JUG1, JUG2], pourK: [[0, 0], ...pourW(JUG1), ...pourW(JUG2)] };

// owner track [t, x, y, z, yaw, pose, 'walk']
const st = (t, [x, z], yaw = 0, pose = 'stand', walk) => walk ? [t, x, pose === 'squatReach' ? -.55 : 0, z, yaw, pose, 'walk'] : [t, x, pose === 'squatReach' ? -.55 : 0, z, yaw, pose];
const owner = { id: 'owner', type: 'rig_person', pos: [0, 0, 0], anim: 'none', dust: false, params: { model: 'modular_men/Casual', height: 1.75, link: 'owner', seed: 4, track: [
  st(0, REST_B, .5), st(L(3) - .2, REST_B, .5), st(T.drops4 - 1.2, PB, 0, 'stand', 1), st(T.drops4 - .7, PB, 0, 'pickReach'), st(T.safe4 + .4, PB, 0, 'pickReach'), st(T.safe4 + 1.0, PB),
  st(L(4) + 2.2, REST_B, .5, 'stand', 1), st(L(9) + .3, REST_B, .5), st(L(9) + 2.4, [-.1, -1.1], 0, 'stand', 1), st(T.food11 - 1.4, PF, 0, 'stand', 1),
  st(T.food11 - 1.0, PF), st(T.food11 - .6, PF, 0, 'pickReach'), st(T.food11 + 1.2, PF, 0, 'pickReach'), st(T.food11 + 1.8, PF),
  st(T.food11 + 3.4, REST_T, -.4, 'stand', 1), st(L(13) - 1.4, REST_T, -.4), st(T.pinch14 - .7, PF, 0, 'stand', 1), st(T.pinch14 - .3, PF, 0, 'pickReach'), st(T.pinch14 + .6, PF, 0, 'pickReach'), st(T.pinch14 + 1.1, PF),
  st(T.week15 + .2, PF), st(HOSE1[0] - .5, PH, 0, 'stand', 1), st(HOSE1[0] - .1, PH, 0, 'pickReach'), st(HOSE1[1] - .2, PH, 0, 'pickReach'),
  st(JUG1[0] - .2, PJ, 0, 'stand', 1), st(JUG1[0] + .2, PJ, 0, 'stakePushHi'), st(JUG1[1] - .2, PJ, 0, 'stakePushHi'), st(JUG1[1] + .3, PJ),
  st(HOSE2[0] - .5, PH, 0, 'stand', 1), st(HOSE2[0] - .1, PH, 0, 'pickReach'), st(HOSE2[1] - .2, PH, 0, 'pickReach'),
  st(JUG2[0] - .2, PJ, 0, 'stand', 1), st(JUG2[0] + .2, PJ, 0, 'stakePushHi'), st(JUG2[1] - .2, PJ, 0, 'stakePushHi'), st(JUG2[1] + .3, PJ),
  st(L(17) + .1, PJ), st(L(17) + 1.0, [1.95, -.75], PI / 2, 'stand', 1), st(L(17) + 1.8, [1.95, .35], 0, 'stand', 1), st(T.face18 - 1.0, FACE, PI, 'stand', 1),
  st(T.face18 - .5, FACE, PI, 'squatReach'), st(L(18) - .4, FACE, PI, 'squatReach'), st(L(18) + .3, FACE, PI), st(L(18) + 1.8, [2.3, .9], PI * .8, 'stand', 1), st(D + 1, [2.3, .9], PI * .8)] } };

// ---------- terrace ----------
const world = [
  obj('roof', 'rooftop', [0, 0, 0], { w: 8, d: 6, depth: 3.8, facade: '#d8c3a0', tiles: true }),
  obj('table', 'potting_table', [BOWL[0] - .12, 0, BOWL[1]], { l: .95, d: .52, h: TABLE_Y }),
  glb('shrubA', 'ph/shrub_02', -3.2, -2.4, .9, { rotY: .4, params: { sway: .015, ph: 1 } }), glb('shrubB', 'ph/shrub_01', 3.3, -2.3, .8, { rotY: 1.3, params: { sway: .015, ph: 3 } }),
  glb('shrubC', 'ph/shrub_03', -3.3, 2.2, .6, { rotY: 2.1, params: { sway: .015, ph: 5 } }), glb('fern', 'ph/fern_02', 3.2, 1.9, .5, { rotY: .8, params: { sway: .02, ph: 2 } }),
];

// ---------- beats (cameras: az 0 = from +z, + toward +x) ----------
const BW = [BC[0], BC[1], BC[2]], BMOUTH = [BC[0], BC[1] + .1, BC[2]];
const beats = [
  // 1 the fish plunges into the bowl, the tap tops it up, sparkles
  { t: 0, add: [...world, tap, owner], camera: { target: [BC[0] - .05, BC[1] + .08, BC[2]], dist: 1.25, elev: .22, az: .25, zoom: 'in' } },
  { t: T.tap1 - .5, camera: { target: [BC[0] - .04, BC[1] + .1, BC[2]], dist: .95, elev: .15, az: -.15, zoom: 'in' } },
  { t: T.have1 - .5, add: [stk('spk1', 'sparkles', [BC[0] + .1, BC[1] + .22, BC[2] + .05], .09, { delay: .3 })], camera: { target: [BC[0] + .1, BC[1] + .05, BC[2]], dist: 1.6, elev: .2, az: .45, zoom: 'out' } },
  // 2 gasping at the surface, gills fast
  { t: L(1), remove: ['spk1'], camera: { target: BW, dist: .8, elev: .12, az: .2, zoom: 'in' } },
  { t: T.surf2 - .2, add: [stk('pt2', 'point_down', [BC[0], BC[1] + .22, BC[2]], .07, { delay: .3 })], camera: { target: [BC[0], BC[1] + .06, BC[2]], dist: .5, elev: .1, az: .05, zoom: 'in' } },
  // 3 chlorine haze, cross by the tap, ring on the gills
  { t: L(2), remove: ['pt2'], camera: { target: [BC[0] - .05, BC[1] + .1, BC[2]], dist: 1.0, elev: .18, az: -.3, zoom: 'out' } },
  { t: T.chl3 - .2, add: [stk('x3', 'cross', [BC[0] - .14, BC[1] + .37, BC[2] - .02], .07, { delay: .2, pulse: true })], camera: { target: [BC[0] - .06, BC[1] + .12, BC[2]], dist: .85, elev: .14, az: -.15, zoom: 'in' } },
  { t: T.gill3 - .1, remove: ['x3'], add: [stk('ring3', 'circle_ring', [BC[0], BC[1] + .06, BC[2]], .1, { delay: .2 })], camera: { target: [BC[0], BC[1] + .06, BC[2]], dist: .45, elev: .08, az: .15, zoom: 'in' } },
  // 4 dechlorinator drops from the owner's bottle, the haze clears, check
  { t: L(3), remove: ['ring3'], camera: { target: [BC[0] + .05, 1.05, BC[2] - .15], dist: 1.9, elev: .14, az: .3, zoom: 'out' } },
  { t: T.drops4 - .2, camera: { target: [BC[0], BC[1] + .12, BC[2]], dist: .75, elev: .2, az: .5, zoom: 'in' } },
  { t: T.safe4 - .3, add: [stk('ok4', 'check', [BC[0] + .12, BC[1] + .2, BC[2] + .05], .08, { delay: .3 })], camera: { target: [BC[0], BC[1] + .06, BC[2]], dist: .9, elev: .14, az: .2, zoom: 'out' } },
  // 5 clear water (sparkles), but the round bowl is the big lie (thumbs-down)
  { t: L(4), remove: ['ok4'], add: [stk('spk5', 'sparkles', [BC[0] - .1, BC[1] + .16, BC[2] + .05], .08, { delay: T.clear5 - L(4) + .3 })], camera: { target: BW, dist: .7, elev: .1, az: -.4, spin: .3, zoom: 'in' } },
  { t: T.lie5 - .3, remove: ['spk5'], add: [stk('dn5', 'thumbs_down', [BC[0] + .17, BC[1] + .12, BC[2] + .05], .08, { delay: .3 })], camera: { target: [BC[0] + .05, BC[1] + .04, BC[2]], dist: 1.1, elev: .2, az: .55, zoom: 'out' } },
  // 6 narrow mouth (ring), the fine bubbles die out, the fish chokes at the top (lungs)
  { t: L(5), remove: ['dn5'], add: [stk('ring6', 'circle_ring', BMOUTH, .18, { delay: .5 })], camera: { target: [BC[0], BC[1] + .07, BC[2]], dist: .75, elev: .55, az: .1, zoom: 'in' } },
  { t: T.o2_6, remove: ['ring6'], camera: { target: BW, dist: .55, elev: .06, az: -.2, zoom: 'in' } },
  { t: T.choke6 - .3, add: [stk('lung6', 'lungs', [BC[0] + .12, BC[1] + .16, BC[2] + .04], .07, { delay: .2, pulse: true })], camera: { target: [BC[0], BC[1] + .07, BC[2]], dist: .6, elev: .12, az: .3, zoom: 'out' } },
  // 7 curved glass: the fish darts round in circles, eyes, scream face
  { t: L(6), remove: ['lung6'], camera: { target: BW, dist: .6, elev: .05, az: 0, spin: .5, zoom: 'in' } },
  { t: T.sight7 - .2, add: [stk('eyes7', 'eyes', [BC[0] - .14, BC[1] + .14, BC[2] + .06], .07, { delay: .2 })], camera: { target: BW, dist: .5, elev: .08, az: .6, zoom: 'in' } },
  { t: T.stress7 - .3, remove: ['eyes7'], add: [stk('scr7', 'face_scream', [BC[0] + .15, BC[1] + .14, BC[2] + .06], .07, { delay: .2 })], camera: { target: BW, dist: .85, elev: .14, az: .2, zoom: 'out' } },
  // 8 days pass, the water goes cloudy
  { t: L(7), remove: ['scr7'], add: [stk('hg8', 'hourglass', [BC[0] + .16, BC[1] + .16, BC[2] + .05], .08, { delay: T.days8 - L(7) })], camera: { target: [BC[0], BC[1] + .02, BC[2]], dist: 1.05, elev: .18, az: -.5, zoom: 'in' } },
  // 9 waste on the gravel, ammonia haze, warning, sick face
  { t: L(8), remove: ['hg8'], camera: { target: [BC[0], BC[1] - .04, BC[2]], dist: .55, elev: .25, az: .1, zoom: 'in' } },
  { t: T.amm9 - .3, add: [stk('wn9', 'warning', [BC[0], BC[1] + .2, BC[2]], .08, { delay: .4, pulse: true })], camera: { target: [BC[0], BC[1] + .02, BC[2]], dist: .75, elev: .14, az: -.25, zoom: 'out' } },
  { t: T.skin9 - .2, remove: ['wn9'], add: [stk('sick9', 'face_sick', [BC[0] + .14, BC[1] + .15, BC[2] + .05], .07, { delay: .2 })], camera: { target: [BC[0], BC[1] + .06, BC[2]], dist: .5, elev: .1, az: .25, zoom: 'in' } },
  // 10 the tank rises, filter on (point-right), bacteria (microbe), the haze clears (check), air stone (water drop)
  { t: L(9), remove: ['sick9'], add: [tank], camera: { target: [TK[0], .7, TK[1]], dist: 3.6, elev: .2, az: -.15, zoom: 'out' } },
  { t: T.filt10 - .2, add: [stk('pr10', 'point_right', TL(.35, .9, .05), .09, { delay: .4 })], camera: { target: TL(.3, TMID, 0), dist: 1.8, elev: .14, az: .2, zoom: 'in' } },
  { t: T.bact10 - .2, remove: ['pr10'], add: [stk('mic10', 'microbe', TL(.53, .98, -.08), .08, { delay: .4 })], camera: { target: TL(.45, TMID + .05, -.1), dist: 1.0, elev: .1, az: .35, zoom: 'in' } },
  { t: T.tox10, add: [stk('ok10', 'check', TL(.2, 1.12, 0), .09, { delay: .9 })], camera: { target: TL(.1, TMID, 0), dist: 2.0, elev: .12, az: .05, zoom: 'out' } },
  { t: T.o2_10 - .2, remove: ['mic10', 'ok10'], add: [stk('wd10', 'water_drop', TL(-.5, 1.08, -.15), .08, { delay: .4 })], camera: { target: TL(-.4, TMID + .05, -.1), dist: 1.2, elev: .1, az: -.25, zoom: 'in' } },
  // 11 warning; a heap of pellets, point-down, the fish rush up
  { t: L(10), remove: ['wd10'], add: [stk('wn11', 'warning', TL(-.15, 1.25, 0), .09, { delay: T.err11 - L(10), pulse: true })], camera: { target: [FEED[0] + .1, 1.0, TK[1] - .1], dist: 2.3, elev: .14, az: .25, zoom: 'out' } },
  { t: T.food11 - .5, remove: ['wn11'], add: [stk('pt11', 'point_down', [FEED[0], 1.12, FEED[1] + .1], .07, { delay: .3 })], camera: { target: [FEED[0], WTOP - .05, TK[1] - .05], dist: 1.0, elev: .3, az: .3, zoom: 'in' } },
  // 12 nobody knows (question); x-ray fish at the front glass: a straight gut, no stomach (magnifier); still eating (yum)
  { t: L(11), remove: ['pt11'], add: [stk('q12', 'question', TL(0, 1.2, 0), .09, { delay: T.info12 - L(11) + .3 })], camera: { target: TL(0, TMID + .05, 0), dist: 2.0, elev: .1, az: -.1, zoom: 'out' } },
  { t: T.stom12 - .8, remove: ['q12'], add: [stk('mg12', 'magnifier', TL(.24, STAND + .045 + .32, .14), .07, { delay: .4 })], camera: { target: TL(.1, STAND + .045 + .22, .1), dist: .55, elev: .05, az: .1, zoom: 'in' } },
  { t: T.full12 - .3, remove: ['mg12'], add: [stk('yum12', 'face_yum', TL(-.05, 1.12, .05), .08, { delay: .3 })], camera: { target: TL(-.1, WTOP - .1, -.05), dist: 1.2, elev: .2, az: -.2, zoom: 'out' } },
  // 13 rot on the gravel, murky water (warning); one fish belly up (cross)
  { t: L(12), remove: ['yum12'], camera: { target: [FEED[0], STAND + .1, TK[1] - .1], dist: .8, elev: .12, az: .15, zoom: 'in' } },
  { t: T.tox13 - .2, add: [stk('wn13', 'warning', [FEED[0] + .15, STAND + .3, TK[1] + .1], .07, { delay: .2, pulse: true })], camera: { target: TL(-.05, TMID, 0), dist: 1.6, elev: .1, az: -.15, zoom: 'out' } },
  { t: T.flip13 - .5, remove: ['wn13'], add: [stk('x13', 'cross', TL(.05, 1.1, .05), .08, { delay: .6, pulse: true })], camera: { target: TL(.05, WTOP - .03, 0), dist: .9, elev: .22, az: .2, zoom: 'in' } },
  // 14 a small pinch, eaten at once, check
  { t: L(13), remove: ['x13'], camera: { target: [FEED[0], WTOP, TK[1] - .1], dist: 1.0, elev: .32, az: -.2, zoom: 'in' } },
  { t: T.mins14 - .3, add: [stk('ok14', 'check', [FEED[0] + .15, 1.15, TK[1]], .08, { delay: .2 })], camera: { target: [FEED[0] + .05, WTOP - .03, TK[1] - .05], dist: 1.3, elev: .25, az: .15, zoom: 'out' } },
  // 15 the hose drains it all (arrow down), the fish thrash on the gravel, the jug refills it at once, fever face, warning
  { t: L(14), remove: ['ok14'], camera: { target: TL(-.1, .8, -.2), dist: 2.6, elev: .16, az: -.45, zoom: 'out' } },
  { t: T.all15 - .3, add: [stk('dn15', 'arrow_down', TL(-.68, .8, .1), .08, { delay: .2 })], camera: { target: TL(0, STAND + .15, 0), dist: 1.3, elev: .12, az: -.1, zoom: 'in' } },
  { t: T.shock15 - .3, remove: ['dn15'], add: [stk('fev15', 'face_fever', TL(.15, 1.25, 0), .09, { delay: .3 })], camera: { target: TL(.1, .9, -.1), dist: 2.0, elev: .14, az: .3, zoom: 'out' } },
  { t: T.die15 - .3, add: [stk('wn15', 'warning', TL(-.2, 1.2, 0), .08, { delay: .2, pulse: true })], camera: { target: TL(0, TMID, 0), dist: 1.5, elev: .1, az: .05, zoom: 'in' } },
  // 16 the hose takes a quarter into the bucket (check), the jug tops it up (drop, check)
  { t: L(15), remove: ['fev15', 'wn15'], camera: { target: [(HOSE[0] + BUCKET[0]) / 2, .75, -.75], dist: 2.4, elev: .2, az: -.65, zoom: 'out' } },
  { t: T.part16 - .4, add: [stk('ok16', 'check', TL(-.3, 1.15, 0), .08, { delay: .4 })], camera: { target: TL(-.25, TMID + .1, -.05), dist: 1.4, elev: .12, az: -.3, zoom: 'in' } },
  { t: T.add16 - .3, remove: ['ok16'], add: [stk('wd16', 'water_drop', [JUG[0] - .15, 1.45, JUG[1] + .15], .08, { delay: .4 }), stk('okk16', 'check_mark', TL(.35, 1.2, .05), .08, { delay: T.temp16 - T.add16 + .5 })],
    camera: { target: [JUG[0], 1.1, TK[1] - .05], dist: 1.6, elev: .12, az: .45, zoom: 'out' } },
  // 17 the myth (thinking face, hourglass)
  { t: L(16), remove: ['wd16', 'okk16'], add: [stk('th17', 'face_thinking', TL(-.1, 1.2, 0), .09, { delay: .8 })], camera: { target: TL(0, TMID, 0), dist: 1.8, elev: .1, az: .15, spin: .25, zoom: 'in' } },
  { t: T.sec17 - .5, remove: ['th17'], add: [stk('hg17', 'hourglass', TL(.15, 1.08, .1), .08, { delay: .3, pulse: true })], camera: { target: TL(0, TMID + .05, 0), dist: 1.0, elev: .08, az: -.1, zoom: 'in' } },
  // 18 truth: brain; the owner squats at the glass, the fish comes to his face (love), then swims through the hoops (sparkles)
  { t: L(17), remove: ['hg17'], add: [stk('br18', 'brain', TL(.0, 1.2, 0), .09, { delay: T.truth18 - L(17) + .2 })], camera: { target: TL(.3, .9, .1), dist: 2.4, elev: .14, az: .7, zoom: 'out' } },
  { t: T.face18 - .3, remove: ['br18'], add: [stk('lv18', 'face_love', [FACE[0], 1.05, TK[1] + .28], .08, { delay: .5 })], camera: { target: [FACE[0], .85, TK[1] + .25], dist: 1.4, elev: .08, az: 1.3, zoom: 'in' } },
  { t: T.tricks18 - .4, remove: ['lv18'], add: [stk('spk18', 'sparkles', TL(-.12, STAND + .045 + .36, .06), .08, { delay: .6 })], camera: { target: TL(-.12, STAND + .045 + .2, .04), dist: 1.0, elev: .06, az: .05, zoom: 'in' } },
  // 19 it grows big in the big tank (arrow up, sparkles)
  { t: L(18), remove: ['spk18'], camera: { target: TL(0, TMID, 0), dist: 2.0, elev: .1, az: -.2, zoom: 'out' } },
  { t: T.grow19 - .3, add: [stk('up19', 'arrow_up', TL(.3, 1.1, .1), .09, { delay: .3 })], camera: { target: TL(0, TMID + .03, 0), dist: 1.6, elev: .1, az: .15, zoom: 'in' } },
  { t: T.years19 - .3, remove: ['up19'], add: [stk('spk19', 'sparkles', TL(-.2, 1.1, .05), .09, { delay: .3 })], camera: { target: TL(0, TMID, 0), dist: 2.2, elev: .14, az: .35, zoom: 'out' } },
  // 20 the round bowl is banned (forbidden), slow pull-out to bowl and tank, check on the tank
  { t: L(19) - .1, remove: ['spk19'], camera: { target: [BC[0], BC[1] + .05, BC[2]], dist: 1.1, elev: .16, az: -.25, zoom: 'in' } },
  { t: T.bowl20 - .4, add: [stk('no20', 'forbidden', [BC[0], BC[1] + .24, BC[2] + .03], .1, { delay: .3, pulse: true })], camera: { target: [BC[0], BC[1] + .08, BC[2]], dist: .9, elev: .14, az: .15, zoom: 'in' } },
  { t: T.tort20 - .2, add: [stk('ok20', 'check', TL(0, 1.25, 0), .14, { delay: .9 })], camera: { target: [0, .9, -.35], dist: 4.4, elev: .2, az: .1, spin: .2, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'لو اشتريت سمكة دهبية',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 8, d: 6, depth: 3.8 }, flatTop: true, cover: false, horizon: 'nile', water: '#a99f8c', waves: 0, foam: false, birds: 2, motes: .2, haze: .5,
    sunElev: 50, sunAz: 25, clouds: 10,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBeds: [{ cat: 'bubbles', idx: 2, gain: .03 }, { cat: 'ambience', idx: 1, gain: .015 }] },
  style: { camEase: .6, captionY: .78, exposure: .8, foreground: false, handheld: .5 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, kind: 'info', camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
for (let i = 1; i < plan.beats.length; i++) if (plan.beats[i].start <= plan.beats[i - 1].start) console.warn('beat order', i, plan.beats[i].start);
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
