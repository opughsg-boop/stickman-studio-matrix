// "ليه الفلاح بيلقّح النخلة بإيده؟!" (voice-over 2026-11-19, 8 lines, 45.4 s, one take). Real-sky island in a Delta palm grove in spring:
// a male date palm (left, 5.4 m trunk, ~8 m with fronds) and a female date palm (right, 5.9 m trunk, ~8.6 m), each with a wooden ladder
// leaning on its left side, spring flowers at their feet, grove palms and the Nile horizon behind, morning sun behind the camera.
// Every spoken line is shown by objects and actions, never by words:
//  1 the farmer climbs the ladder up the male palm (circle ring on the crown)
//  2 both palms side by side; the yellow male spathe (point right), the female flower cluster (point left), a ring on each crown
//  3 the female cluster with no pollen (cross, this line only); a gust shakes the fronds and blows pollen off the male spathe: most of it
//    drifts down to the ground, away from the female
//  4 the farmer climbs the last rungs, cuts a yellow male spathe with his sickle and it drops into the cloth bag in his other hand (check)
//  5 close: his hand sprinkles a pinch of pollen over the open female flowers; the grains land and the flowers turn yellow a few at a time
//  6 spring: fresh light-green fronds and flowers at the foot; up on the ladder he repeats on the next cluster (ring on the done clusters)
//  7 close: a small brush in his fist dabs pollen on a third cluster (sparkles at the touch); both clusters end up the same yellow
//  8 CTA: he climbs down and stands by the palm, thumbs-up, slow pull-out arcing round
// Step up vs the last render (sheep circle, score 88):
//  motion   - rung-by-rung ladder climbing with alternating hand/foot poses (eased per rung, pauses, a slower climb down), a cut-and-drop
//             with anticipation (sickle raised, pull, the spathe arcs into the bag), pinch-sprinkle and brush-dab hand cycles, frond sway
//             per frond with a keyed gust, pollen grains that fly and stick where they land
//  graphics - procedural date palm: stacked leaf-base trunk with bump, pruned stubs and fibre, ~40 fronds of V-folded two-tone leaflets in
//             groups with base spines, dry hanging fronds, spathes as split boat sheaths, ~650 instanced flowers per female cluster with a
//             per-flower dust colour change; burlap bag, steel sickle, wooden ladder with grain
//  realism  - real sizes: trunk .5-.7 m across, fronds 2.3-3.4 m, female strands 30-40 cm with 4 mm flowers, male spathe ~40 cm,
//             farmer 1.75 m, rungs every 30 cm; the male and the female look different (gold male spathes vs cream-green female strands)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(29), lerp = (a, b, u) => a + (b - a) * u;
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  male2: W(1, 8), fem2: W(1, 11), each2: W(1, 13), wind3: W(2, 9), gather4: W(3, 6), bag4: W(3, 11), oneone5: W(4, 8), time5: W(4, 10),
  spring6: W(5, 4), again6: W(5, 5), exact6: W(5, 9), brush7: W(6, 5), same7: W(6, 10), like8: W(7, 5) };

// ---------- layout (metres). Palms on the x axis, camera side +z ----------
const M = [-1.9, -1.6], HM = 5.4, F = [1.9, -1.2], HF = 5.9;
const CLT = { f: [0, -.44, .7], m: [0, -.3, .54] };                 // cluster tip from the trunk top (renderer CL_TIP)
const tipOf = (P, H, az, sex, dy = 0) => [P[0] + Math.sin(az) * CLT[sex][2], H + CLT[sex][1] + dy, P[1] + Math.cos(az) * CLT[sex][2]];
const ctrOf = (P, H, az, sex) => { const t = tipOf(P, H, az, sex), o = sex === 'f' ? .1 : .06; return [t[0] + Math.sin(az) * o, t[1] - (sex === 'f' ? .17 : .1), t[2] + Math.cos(az) * o]; };
const FA = [-.8, -.35, -2.2, 2.4, 1.2], MA = [-.65, .5, 1.7, -2.4];  // cluster azimuths: female c0 (beat 5), c1 (beat 6), c2 (brush)
const fC = FA.map(a => ctrOf(F, HF, a, 'f')), fT = FA.map(a => tipOf(F, HF, a, 'f')), mC = MA.map(a => ctrOf(M, HM, a, 'm')), mT = MA.map(a => tipOf(M, HM, a, 'm'));
// ladders lean on the left (-x) side of each trunk: foot 1.4 m out, top on the trunk .27 m from its axis at height LT
const LTM = HM - .55, LTF = HF - .6;
const ladX = (P, LT, y) => P[0] - lerp(1.4, .27, y / LT);
const footX = (P, LT, y) => ladX(P, LT, y) - .1;                 // the rig origin sits just behind the rung it stands on
const YAW = PI / 2;                                                 // facing +x, toward the trunk; his right hand is on the camera side (+z)

// ---------- farmer track ----------
const trk = [];
const climb = (P, LT, z, t0, t1, y0, y1, rest) => { const n = Math.max(1, Math.round(Math.abs(y1 - y0) / .3)), dt = (t1 - t0) / n;
  for (let i = 1; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; trk.push([t0 + i * dt, footX(P, LT, y), y, z, YAW, i % 2 ? 'ladderA' : 'ladderB']); }
  if (rest) trk.push([t1 + .35, footX(P, LT, y1), y1, z, YAW, rest]); };
const zM = M[1] + .1, zF = F[1] + .12, yTopM = 3.6, yTopF = 3.9;
trk.push([0, footX(M, LTM, .9), .9, zM, YAW, 'ladderB']);
climb(M, LTM, zM, 0, 2.7, .9, 1.8);
climb(M, LTM, zM, 3.3, 8.6, 1.8, 2.7, 'ladderHold');
trk.push([10.4, footX(M, LTM, 2.7), 2.7, zM, YAW, 'ladderHold'], [11.0, footX(M, LTM, 2.7), 2.7, zM, YAW, 'ladderLook'], [16.5, footX(M, LTM, 2.7), 2.7, zM, YAW, 'ladderLook']);
climb(M, LTM, zM, 16.6, 19.0, 2.7, yTopM);
const pM = [footX(M, LTM, yTopM), yTopM, zM];
trk.push([19.5, ...pM, YAW, 'cutReach'], [19.95, ...pM, YAW, 'cutReach'], [20.25, ...pM, YAW, 'cutPull'], [20.55, ...pM, YAW, 'cutPull'], [21.0, ...pM, YAW, 'bagDrop'], [21.9, ...pM, YAW, 'bagDrop'], [22.4, ...pM, YAW, 'ladderHold']);
const pF = [footX(F, LTF, yTopF), yTopF, zF];
trk.push([23.3, ...pM, YAW, 'ladderHold'], [23.4, ...pF, YAW, 'ladderHold'], [30.9, ...pF, YAW, 'ladderHold'], [31.5, ...pF, YAW, 'sprinkleR'], [33.7, ...pF, YAW, 'sprinkleR'], [34.2, ...pF, YAW, 'ladderHold'], [39.0, ...pF, YAW, 'ladderHold']);
climb(F, LTF, zF, 39.0, 42.9, yTopF, 0);
trk.push([43.5, F[0] - 1.6, 0, F[1] + .9, null, 'walk', 'walk'], [43.8, F[0] - 1.6, 0, F[1] + .9, .35, 'stand'], [44.3, F[0] - 1.6, 0, F[1] + .9, .35, 'presentR'], [D + 1, F[0] - 1.6, 0, F[1] + .9, .35, 'presentR']);
const HIDE = [[0, 0], [23.25, 0], [23.3, 1], [29.4, 1], [29.45, 0], [35.0, 0], [35.05, 1], [40.3, 1], [40.35, 0]];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 4, track: trk, hideK: HIDE, noShadowAbove: .3 } };
const sickle = { id: 'sickle', type: 'palm_tool', pos: [0, 0, 0], anim: 'none', params: { kind: 'sickle', carryBy: 'farmer', hand: 'R', showK: [[0, 0], [18.9, 0], [19.0, 1], [22.3, 1], [22.35, 0]], ry: -PI / 2, rz: .2 } };
const bag = { id: 'bag', type: 'palm_tool', pos: [0, 0, 0], anim: 'none', params: { kind: 'bag', carryBy: 'farmer', hand: 'L', off: [0, -.02, 0], showK: [[0, 0], [18.9, 0], [19.0, 1], [23.25, 1], [23.3, 0]], fillK: [[0, 0], [21.45, 0], [21.5, 1]] } };

// ---------- palms and the grove ----------
const male = { id: 'palmM', type: 'date_palm', pos: [M[0], 0, M[1]], anim: 'none', params: { h: HM, seed: 41, link: 'palmM', lean: [0, .05], clear: [[-.9, 1.3, .4]],      // lower fronds pruned on the work side
  clusters: MA.map(a => ({ az: a, sex: 'm' })), cut: [[0, 20.55, 21.45]], cutBy: 'farmer', cutHand: 'L', windK: [[0, 0], [14.0, 0], [14.6, 1], [16.6, 1], [17.4, 0]] } };
const dust0 = [[0, 0], [24.3, 0], [24.9, .08], [25.8, .22], [26.6, .34], [27.3, .5], [28.1, .62], [28.9, .78], [29.6, .9]];
const female = { id: 'palmF', type: 'date_palm', pos: [F[0], 0, F[1]], anim: 'none', params: { h: HF, seed: 43, link: 'palmF', lean: [0, -.04], clear: [[-2.7, .5, .4]],
  clusters: FA.map(a => ({ az: a, sex: 'f' })), windK: [[0, 0], [14.0, 0], [14.8, .8], [16.6, .8], [17.4, 0]],
  dustK: [dust0, [[0, 0], [31.7, 0], [32.4, .25], [33.1, .55], [33.8, .85]], [[0, 0], [37.7, 0], [38.1, .3], [38.6, .55], [39.1, .8], [39.6, .9]]] } };
const ladM = { id: 'ladM', type: 'palm_ladder', pos: [M[0] - 1.4, 0, zM], anim: 'none', params: { top: [1.4 - .27, LTM, 0] } };
const ladF = { id: 'ladF', type: 'palm_ladder', pos: [F[0] - 1.4, 0, zF], anim: 'none', params: { top: [1.4 - .27, LTF, 0] } };
const world = [];
[[-7.5, -7.5, 9.5, 1], [-3.8, -9.5, 10.5, 2], [1.2, -10.5, 9, 3], [5.6, -8.2, 10, 1], [8.8, -5.5, 8.5, 2], [-9.2, -3.5, 9, 3], [9.6, -1.2, 9.5, 1]].forEach(([x, z, h, k], i) =>
  world.push(glb('grove' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.6, -2.6, 1.0, 'ph/shrub_02'], [4.8, -2.9, .9, 'ph/shrub_01'], [-5.6, 1.2, .7, 'ph/shrub_03'], [5.4, 1.4, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
// spring: flowering gazania and dandelion clumps round the palm feet and the field edge (clear of the ladders and the farmer's last walk)
for (let i = 0, n = 0; i < 400 && n < 30; i++) { const x = -6 + R() * 12, z = -4 + R() * 6.5;
  if (Math.hypot(x - M[0], z - M[1]) < .7 || Math.hypot(x - F[0], z - F[1]) < .7) continue; if (z > -2.2 && z < .6 && ((x > M[0] - 1.8 && x < M[0] + .2) || (x > F[0] - 2.2 && x < F[0] + .2))) continue;
  world.push(glb('fl' + n, n % 3 === 2 ? 'ph/dandelion_01' : 'ph/flower_gazania', x, z, .18 + R() * .12, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }
for (let i = 0, n = 0; i < 400 && n < 34; i++) { const x = -8 + R() * 16, z = -6 + R() * 11;
  if (x > -4 && x < 4.2 && z > -3 && z < 1.5) continue; if (Math.abs(x) < 3 && z > 1.5) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], x, z, .3 + R() * .25, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }

// ---------- hands for the close-ups (the rig is hidden while these show) ----------
// beat 5: right hand pinches pollen over female cluster c0 and sprinkles it a few flowers at a time; anchor = index tip
const c0 = fC[0], t0p = fT[0], sh0 = [footX(F, LTF, 3.9) + .1, 3.9 + 1.45, F[1] + .12 + .18];   // his right shoulder on the ladder
const n0 = (v => { const l = Math.hypot(...v); return v.map(x => x / l); })([c0[0] - sh0[0], c0[1] + .2 - sh0[1], c0[2] - sh0[2]]); // forearm direction
const az5 = Math.atan2(-n0[2], n0[0]) + (Math.sin(Math.atan2(-n0[2], n0[0])) > 0 ? PI : 0);       // camera at 90 deg to the forearm, on the -x side
const above = (dx, dz, h = .13) => [c0[0] + dx, t0p[1] + h, c0[2] + dz];
const off = (p, k) => [p[0] - n0[0] * k, p[1] + .12, p[2] - n0[2] * k];
const hk = (t, p, pose) => [t, ...p, n0[0], -.25, n0[2], 0, 1, 0, pose];
const A0 = above(-.05, -.04), A1 = above(.04, .02, .11), A2 = above(-.02, .08, .1), A3 = above(.07, -.02, .12);
const HR5 = [hk(22.9, off(A0, .6), 'pinch'), hk(23.2, off(A0, .6), 'pinch'), hk(24.0, A0, 'pinch'), hk(24.35, A0, 'press'), hk(24.7, A0, 'pinch'), hk(25.05, A0, 'press'),
  hk(25.5, A1, 'pinch'), hk(25.85, A1, 'press'), hk(26.25, A1, 'pinch'), hk(26.6, A1, 'press'), hk(27.0, A2, 'pinch'), hk(27.35, A2, 'press'), hk(27.75, A2, 'pinch'),
  hk(28.1, A3, 'press'), hk(28.5, A3, 'pinch'), hk(28.85, A3, 'press'), hk(29.25, off(A3, .7), 'open'), hk(D + 1, off(A3, .7), 'open')];
const hand5 = { id: 'hand5', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', delay: 22.9, params: { side: 'R', link: 'hand5', track: HR5, dustK: [[0, 1], [24.0, 1], [28.9, .35], [29.2, 0]] } };
const srcK5 = HR5.slice(2, 16).map(k => [k[0], k[1], k[2] - .012, k[3]]);
const pol5 = { id: 'pol5', type: 'pollen', pos: [0, 0, 0], anim: 'none', params: { mode: 'sprinkle', palm: 'palmF', ci: 0, n: 360, size: .006, flight: .55, spread: .015, srcK: srcK5,
  rateK: [[23.9, 0], [24.0, 50], [24.6, 25], [25.0, 50], [25.5, 25], [25.85, 50], [26.6, 50], [27.35, 50], [28.1, 50], [28.85, 50], [29.0, 0], [29.1, 0]] } };
// beat 7: the brush dabs female cluster c2; fingers along the tangent so the tuft points into the flowers (anchor = tuft tip)
const a2 = FA[2], out2 = [Math.sin(a2), 0, Math.cos(a2)], c2 = fC[2], f2 = [-out2[2], 0, out2[0]], oc = (k, dy = 0, s = 0) => [c2[0] + out2[0] * k + f2[0] * s, c2[1] + dy, c2[2] + out2[2] * k + f2[2] * s];
const bk = (t, p) => [t, ...p, ...f2, 0, 1, 0, 'fist'];
const B0 = oc(.06, .1, -.02), B1 = oc(.07, .02, .03), B2 = oc(.065, -.06, -.01);
const HR7 = [bk(34.4, oc(.55, .25, -.3)), bk(35.2, oc(.55, .25, -.3)), bk(36.6, oc(.2, .1)), bk(37.5, oc(.13, .1, -.02)), bk(37.85, B0), bk(38.1, oc(.13, .08)), bk(38.4, B1), bk(38.7, oc(.13, .02, .03)),
  bk(39.0, B2), bk(39.3, oc(.14, -.03)), bk(40.0, oc(.6, .2, -.3)), bk(D + 1, oc(.6, .2, -.3))];
const hand7 = { id: 'hand7', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', delay: 34.4, params: { side: 'R', link: 'hand7', track: HR7, brushK: [[0, 1]] } };
const pol7 = { id: 'pol7', type: 'pollen', pos: [0, 0, 0], anim: 'none', params: { mode: 'sprinkle', palm: 'palmF', ci: 2, n: 160, size: .006, flight: .3, spread: .03,
  srcK: [[37.8, ...B0], [38.15, ...B0], [38.4, ...B1], [38.75, ...B1], [39.0, ...B2], [39.4, ...B2]], rateK: [[37.8, 0], [37.85, 90], [38.1, 0], [38.4, 90], [38.65, 0], [39.0, 90], [39.25, 0], [39.3, 0]] } };
// beat 3: a gust lifts pollen off the male spathes: it drifts toward the camera side and settles on the ground short of the female
const pol3 = { id: 'pol3', type: 'pollen', pos: [0, 0, 0], anim: 'none', params: { mode: 'drift', src: mC[1], n: 300, size: .03, hazeSize: .45, life: 4.5, fall: .55, wind: [.6, 0, 1.0],
  rateK: [[14.2, 0], [14.4, 110], [16.4, 80], [16.8, 0], [17.0, 0]] } };
// beat 6: from his right palm (rig) onto c1 while he shakes the pinch over it
const pol6 = { id: 'pol6', type: 'pollen', pos: [0, 0, 0], anim: 'none', params: { mode: 'sprinkle', palm: 'palmF', ci: 1, n: 200, size: .012, flight: .6, spread: .03,
  srcK: [[31.6, pF[0] + .37, pF[1] + 1.49, pF[2] + .45], [33.7, pF[0] + .37, pF[1] + 1.49, pF[2] + .45]], rateK: [[31.6, 0], [31.7, 80], [33.5, 80], [33.6, 0], [33.7, 0]] } };

const up = (p, dy, dx = 0, dz = 0) => [p[0] + dx, p[1] + dy, p[2] + dz];
const beats = [
  // 1 hook: the farmer climbs the ladder up the tall male palm; ring on the crown
  { t: 0, kind: 'info', add: [farmer, male, female, ladM, ladF, sickle, bag, ...world, hand5, hand7, pol3, pol5, pol6, pol7,
      stk('ringC', 'circle_ring', [M[0], HM + .15, M[1] + .3], 1.6, { delay: .35 })],
    camera: { target: [M[0] - .3, 3.4, M[1]], dist: 10.5, elev: .02, az: .35, zoom: 'in' } },
  // 2 the palm is mostly a separate tree: both palms side by side
  { t: T.l1, kind: 'info', remove: ['ringC'],
    camera: { target: [0, 4.4, -1.4], dist: 15.5, elev: .05, az: .1, zoom: 'out' } },
  //   ... there are male palms: the gold split spathe; point right at it
  { t: T.male2 - .2, kind: 'info', add: [stk('ptM', 'point_right', up(mC[0], .05, -.32, .1), .2, { delay: .25 })],
    camera: { target: up(mC[0], .05, .05), dist: 2.9, elev: .08, az: -.2, zoom: 'in' } },
  //   ... and female palms: the cream-green flower strands; point left at them
  { t: T.fem2 - .1, kind: 'info', remove: ['ptM'], add: [stk('ptF', 'point_left', up(fC[1], .05, .34, .05), .2, { delay: .25 })],
    camera: { target: up(fC[1], 0, -.05), dist: 3.0, elev: .1, az: .15, zoom: 'out' } },
  //   ... each grows on its own tree: back to both crowns, a ring on each
  { t: T.each2, kind: 'info', remove: ['ptF'], add: [stk('ringM', 'circle_ring', [M[0], HM + .2, M[1] + .4], 1.7, { delay: .2 }), stk('ringF', 'circle_ring', [F[0], HF + .2, F[1] + .4], 1.7, { delay: .45 })],
    camera: { target: [0, 5.0, -1.4], dist: 20, elev: .16, az: -.1, zoom: 'in' } },
  // 3 but the female gives no dates without pollen: her bare cluster, cross (this line only)
  { t: T.l2, kind: 'info', remove: ['ringM', 'ringF'], add: [stk('xF', 'cross', up(fT[0], .22, -.05, .1), .2, { delay: .3, pulse: true })],
    camera: { target: up(fC[0], .05), dist: 2.6, elev: .12, az: -.75, zoom: 'in' } },
  //   ... and the wind does not always carry the pollen to the right place: the gust, pollen drifting down short of the female
  { t: T.wind3 - .2, kind: 'info',
    camera: { target: [0, 3.6, -.6], dist: 11.5, elev: .12, az: .25, zoom: 'out' } },
  // 4 so the farmer climbs the palm with a ladder: the last rungs to the male crown
  { t: T.l3, kind: 'info', remove: ['xF'],
    camera: { target: [pM[0] + .3, 4.4, M[1] + .2], dist: 5.0, elev: .02, az: .55, zoom: 'in' } },
  //   ... and gathers the male pollen in a small bag: cut with the sickle, the spathe drops into the bag; check
  { t: T.gather4 - .1, kind: 'info', add: [stk('okB', 'check', up(mT[0], .35, .1, .35), .2, { delay: T.bag4 - T.gather4 + .1 })],
    camera: { target: [pM[0] + .55, 4.95, M[1] + .45], dist: 2.6, elev: .1, az: .8, zoom: 'out' } },
  // 5 then he sprinkles it on the female flowers: close on his pinch over cluster c0
  { t: T.l4, kind: 'info', remove: ['okB'],
    camera: { target: up(c0, .08), dist: 1.15, elev: .18, az: az5, zoom: 'in' } },
  //   ... one by one: closer, the grains landing and the flowers turning yellow
  { t: T.oneone5, kind: 'info',
    camera: { target: up(c0, .02), dist: .8, elev: .32, az: az5 + .3, zoom: 'out' } },
  //   ... at the time the flower has opened: pull back to the opened spathe and the whole spread of strands
  { t: T.time5, kind: 'info',
    camera: { target: up(c0, .05), dist: 1.5, elev: .05, az: az5 - .3, zoom: 'in' } },
  // 6 this work is done in spring: low wide on the female palm with spring flowers at its foot and fresh fronds on top
  { t: T.l5, kind: 'info', remove: ['hand5'],
    camera: { target: [F[0] - .3, 3.6, F[1]], dist: 10.5, elev: -.04, az: -.15, zoom: 'out' } },
  //   ... and repeated several times: up on the ladder he sprinkles the next cluster; ring on the done one
  { t: T.again6, kind: 'info', add: [stk('ring0', 'circle_ring', up(fC[0], 0), .6, { delay: .3 })],
    camera: { target: [F[0] - .35, 5.2, F[1] + .3], dist: 4.2, elev: .1, az: -.25, zoom: 'in' } },
  //   ... so the pollination is right: the second cluster done too, ring on it
  { t: T.exact6, kind: 'info', add: [stk('ring1', 'circle_ring', up(fC[1], 0), .6, { delay: .25 })],
    camera: { target: [F[0] - .2, 5.25, F[1] + .2], dist: 3.6, elev: .2, az: .1, zoom: 'out' } },
  // 7 and the strangest thing?: close on a third cluster as his fist comes in with a small brush
  { t: T.l6, kind: 'info', remove: ['ring0', 'ring1'],
    camera: { target: up(c2, .06), dist: 1.3, elev: .12, az: a2 + .15, zoom: 'in' } },
  //   ... he can use a small brush instead of sprinkling: the tuft dabs the flowers; sparkles at the touch
  { t: T.brush7 - .1, kind: 'info', add: [stk('spk', 'sparkles', up(c2, .2, out2[0] * .1, out2[2] * .1), .14, { delay: .45 })],
    camera: { target: up(c2, .02), dist: .85, elev: .2, az: a2 - .1, zoom: 'out' } },
  //   ... and the result is the same: both treated clusters the same yellow
  { t: T.same7, kind: 'info', remove: ['spk'],
    camera: { target: [F[0] - .45, HF - .65, F[1] + .1], dist: 4.6, elev: .12, az: -PI / 2 + .1, zoom: 'in' } },
  // 8 CTA: he climbs down and stands by the palm; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', remove: ['hand7'], add: [stk('thumb', 'thumbs_up', [F[0] - 1.1, 2.6, F[1] + 1.0], .45, { delay: T.like8 - T.l7 - .25 })],
    camera: { target: [F[0] - .6, 2.6, F[1] + .3], dist: 7.5, elev: .06, az: -.45, spin: .5, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفلاح بيلقح النخلة بإيده',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 26, d: 22, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 9, soilTint: [1.0, .97, .9], horizon: 'nile', cover: 'high',
    haze: .45, sunElev: 42, sunAz: 25, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .5, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: .95, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
