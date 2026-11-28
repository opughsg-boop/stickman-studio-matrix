// "ليه الفلاح بيشيل زهر الفراولة الأول بإيده؟!" (voice-over 2026-11-28, 8 lines, 34.9 s, one take). Real-sky island of Delta farmland
// in morning sun: five straw-mulched raised strawberry beds (rows along z, 0.6 m tops, 0.2 m high, 0.5 m soil paths, a black drip tape on
// each), the hero plants at the front of the middle bed so the bed's end face shows the roots. Plants are BIG in frame (lesson from
// silk_worm, score 18): every close beat frames one 0.2-0.3 m plant or one 2.6 cm flower at 0.25-0.75 m. Every spoken line is shown:
//  1 hook: close on a white strawberry flower, the farmer's fingers reach in for it (ring on the flower)
//  2 a young thin pale plant with many flowers; two flowers drop their petals and swell into green fruits, then the plant sags and
//    yellows (cross on the plant, only this beat)
//  3 the farmer's fingers pinch off the hero plant's two first flowers at the stalk; the camera drops to the bed face: the roots grow
//    down and the leaves perk up (arrows_cycle between flowers, roots and leaves; check)
//  4 the same plant later: it fills out with big dark leaves and four red strawberries swell and ripen (sparkles on the fruit)
//  5 close on two fingers gently pinching one flower stalk at its base, the crown and petioles untouched (point-down on the stalk; check)
//  6 a long thin runner crosses the straw, runs down the bed side and roots a daughter plant in the path; the snips cut it (cross on the
//    runner, arrow-down at the daughter plant)
//  7 the tidy rows with clear paths (thumbs-up on the row); the farmer walks the path, squats, picks a ripe berry and drops it in his
//    basket; a microbe over the leaves is cleared (check)
//  8 CTA: he stands with the basket of strawberries, turns to us, thumb up; thumbs-up sticker; slow pull-out arcing round
// Step up vs the last render (silk_worm, score 18):
//  motion   - (1) the pinched flower and its stalk piece ride the exact point between the index and thumb (contact by construction), the
//             stub stays on the crown; (2) growth is continuous, never a pop: petals fall and the receptacle swells into a fruit, roots
//             grow along their length, leaves unfold one by one as vigour rises, fruit swell and ripen green -> white -> red;
//             (3) the snips open, close on the runner and the cut piece springs apart; the farmer walks the path with a real gait
//  graphics - (1) new procedural strawberry: toothed trifoliate leaves with pleated veins and a bump map, 5-petal flowers with sepals,
//             receptacle and 22 stamens, glossy conical fruit with achenes in dimples and a star calyx; (2) straw-mulched raised beds with a
//             soil-section end face, drip tape and loose 3D straws; (3) bypass pruning snips in the detailed hand
//  realism  - (1) real sizes: plant 0.15-0.25 m, leaflets 5-6 cm (leaf 11-13 cm), flower 2.6 cm, green fruit 1.6 cm, red fruit 3.8 cm,
//             runner 3.4 mm thick and 0.6 m long, bed 0.6 x 0.2 m, path 0.5 m, farmer 1.75 m, basket 0.34 m; (2) the subject fills the
//             frame in every close beat; (3) a weak young plant really is smaller and paler (6 leaves) than the strong one (14 leaves)
//  sound    - this plan only: a field wind bed (.03) plus a light bird bed (.02), no calls, all ducked under the voice
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  weak2: W(1, 5), if2: W(1, 6), turn2: W(1, 10), tired2: W(1, 12), pick3: W(2, 3), plant3: W(2, 6), send3: W(2, 7), roots3: W(2, 9), leaves3: W(2, 10),
  grow4: W(3, 2), fruit4: W(3, 5), sweet4: W(3, 8), hand5: W(4, 2), gentle5: W(4, 4), stem5: W(4, 5), harm5: W(4, 8),
  run6: W(5, 2), so6: W(5, 4), far6: W(5, 7), lose6: W(5, 8), tidy7: W(6, 2), easy7: W(6, 3), cure7: W(6, 5), dis7: W(6, 7), well7: W(6, 8), like8: W(7, 4) };

// ---------- layout (metres). Island front face at z = 8, bed end faces at z = 7.95, bed tops at y = .2 ----------
const BH = .2, BEDS = [-2.6, -1.3, 0, 1.3, 2.6], Z0 = 7.95;
const PA = [.16, 7.86], PW = [-.16, 7.70], PB = [-.16, 7.38], PC = [.16, 7.22], PD = [.16, 6.26], PE = [.16, 7.54], PF = [-.16, 7.06], PG = [.16, 6.58], PH = [-.16, 6.42], PI = [-.16, 6.10];
// truss geometry (same formulas as sb_plant): crown (0, .014, 0), peduncle = quadratic bezier crown -> mid -> head
const CR = .014, hv = a => [Math.sin(a), Math.cos(a)];
function stalkPt(P, q, u) { const [ox, oz] = hv(q.az), out = q.out, y = q.y, my = Math.max(y, .03) + .035;
  const A = [0, CR, 0], M = [ox * out * .35, my, oz * out * .35], E = [ox * out, y, oz * out], b = (i) => (1 - u) * (1 - u) * A[i] + 2 * u * (1 - u) * M[i] + u * u * E[i];
  return [P[0] + b(0), BH + b(1), P[1] + b(2)]; }
const add = (a, b) => a.map((v, i) => v + b[i]), nrm = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], sc = (v, k) => v.map(x => x * k);
// hand frame for a pinch across a stalk: back-of-hand u across the stalk (the index-thumb line), fingers f from the approach f0
function pinchFrame(P, q, f0) { const a = stalkPt(P, q, .36), b = stalkPt(P, q, .44), d = nrm(add(b, sc(a, -1))), u = nrm(crs(d, [0, 1, 0])), uu = dot(u, f0) > 0 ? sc(u, -1) : u;
  const f = nrm(add(f0, sc(uu, -dot(f0, uu)))); return { pt: stalkPt(P, q, .4), f, u: uu, anchor: add(stalkPt(P, q, .4), [-.005, -.0045, .001]) }; }

// ---------- plants ----------
const fl = (az, o = {}) => ({ kind: 'flower', az, out: .085, y: .11, ...o }), gr = (az, o = {}) => ({ kind: 'green', az, out: .1, y: .05, ...o }), rd = (az, o = {}) => ({ kind: 'red', az, out: .13, y: .012, ...o });
// A hero: young (vigour .15) with two first flowers facing the camera; they are pinched in line 3; it grows strong and fruits in line 4
const A1 = fl(.2, { out: .09, y: .115 }), A2 = fl(1.05, { out: .085, y: .1 });
const VA = [[0, .15], [T.send3 + .6, .15], [T.leaves3, .45], [T.l3 + .7, .45], [T.l3 + 2.4, 1]];
const RA = [[0, 0], [T.send3, .2], [T.roots3 + .5, 1]];
const AF = [.35, 1.35, -1.25, 2.3].map((az, i) => rd(az, { out: i === 0 ? .1 : .135, L: [.039, .037, .036, .034][i], showK: [[0, 0], [T.fruit4 - .05, 1]], growK: [[T.fruit4, 0], [T.fruit4 + 1.2 + i * .15, 1]] }));
// B: line 5, its front flower is pinched gently at the stalk base
const B1 = fl(.55, { out: .08, y: .1 }), B2 = fl(-1.6, { out: .07, y: .1 });
// W: line 2, weak plant: five flowers (two set into green fruit) and three small green fruits
const WT = [fl(.35, { setK: [[T.turn2 - .1, 0], [T.turn2 + .7, 1]] }), fl(1.3, { setK: [[T.turn2 + .1, 0], [T.turn2 + .9, 1]] }), fl(-.6), fl(2.4), fl(-2.0), gr(.85), gr(-1.2), gr(3.0)];
// D: line 7, its +x berry hangs over the bed edge and is picked by the farmer
const tPick = T.easy7 + .25, tDrop = T.cure7 + .1;
const D1 = rd(Math.PI / 2, { out: .17, y: -.035, L: .038, pick: { t0: tPick, t1: tDrop, by: 'farmer', hand: 'R' } });
// C: line 6 runner: from the crown across the straw, over the bed edge (x .30), down the side to the path, daughter plant at x .62
const tCut = T.so6 - .05;
const RUN = [[0, .012, 0], [.035, .04, .008], [.08, .03, .018], [.13, .008, .028], [.158, -.03, .035], [.2, -.11, .045], [.245, -.192, .055], [.33, -.196, .075], [.46, -.196, .1]];
const plants = [
  obj('pA', 'sb_plant', [PA[0], BH, PA[1]], { seed: 11, vigorK: VA, clearAz: .6, trusses: [A1, A2, ...AF], roots: { z: Z0 + .003 - PA[1], k: RA } }),
  obj('pW', 'sb_plant', [PW[0], BH, PW[1]], { seed: 23, vigor: 0, droopK: [[0, 0], [T.weak2 - .2, 0], [T.weak2 + .4, .25], [T.tired2, .25], [T.tired2 + .9, 1]], trusses: WT }),
  obj('pB', 'sb_plant', [PB[0], BH, PB[1]], { seed: 37, vigor: .55, clearAz: .55, trusses: [B1, B2] }),
  obj('pC', 'sb_plant', [PC[0], BH, PC[1]], { seed: 41, vigor: .8, runner: { pts: RUN, cutU: .2, cutT: tCut }, trusses: [fl(-.5), rd(2.6)] }),
  obj('pD', 'sb_plant', [PD[0], BH, PD[1]], { seed: 53, vigor: 1, trusses: [D1, rd(.6), rd(-2.1), rd(2.5, { out: .12 }), fl(-.9)] }),
  obj('pE', 'sb_plant', [PE[0], BH, PE[1]], { seed: 61, vigor: .7, trusses: [fl(1.2), gr(-.4)] }),
  obj('pF', 'sb_plant', [PF[0], BH, PF[1]], { seed: 67, vigor: .75, trusses: [rd(-1.4), fl(.4)] }),
  obj('pG', 'sb_plant', [PG[0], BH, PG[1]], { seed: 71, vigor: .9, trusses: [rd(1.0), rd(-2.4)] }),
  obj('pH', 'sb_plant', [PH[0], BH, PH[1]], { seed: 79, vigor: .9, trusses: [rd(-1.6), fl(1.9)] }),
  obj('pI', 'sb_plant', [PI[0], BH, PI[1]], { seed: 83, vigor: .95, trusses: [rd(-1.2)] }) ];
const SKIP = [PA, PW, PB, PC, PD, PE, PF, PG, PH, PI];
const beds = obj('beds', 'sb_bed', [0, 0, 0], { xs: BEDS, z0: Z0, len: 5.6, w: .6, wb: .8, h: BH, straws: 420 });
const field = obj('field', 'sb_field', [0, 0, 0], { beds: BEDS, rows: [-.16, .16], z0: 2.55, z1: 7.86, sp: .32, y: BH, skip: SKIP, fruit: .55, flowers: .3, seed: 7 });

// ---------- the gardener's hand (close beats 1, 3, 5, 6): anchor = index pad (pinch) or the snips jaw ----------
const HIDE = [0, -3, 0];
const hk = (t, P, F, U, pose = 'open', e) => [t, ...P, ...F, ...U, pose, ...(e ? [e] : [])];
const f0 = nrm([-.75, -.5, -.3]);                                   // approach from the right, above, a little from the camera side
const pA1 = pinchFrame(PA, A1, f0), pA2 = pinchFrame(PA, A2, f0), pB1 = pinchFrame(PB, B1, nrm([-.55, -.55, -.6]));
const back = (pf, d) => add(pf.anchor, add(sc(pf.f, -d), [0, d * .4, 0]));
const up = (pf, d) => add(pf.anchor, [0, d, 0]);
// snips on the runner: runner runs +x; jaw blades in the hand's x-z plane, so the back of the hand points along the runner (+x)
const CUTP = [PC[0] + .105, BH + .021, PC[1] + .023], SU = nrm([.92, -.36, .18]), SF = (f => nrm(add(f, sc(SU, -dot(f, SU)))))(nrm([0, -.75, -.66]));   // runner point at cutU .2
const H = [
  // 1 hook: reaching in for the flower, stops just short of it
  hk(0, back(pA1, .07), pA1.f, pA1.u, 'open'), hk(T.l1 - .3, back(pA1, .035), pA1.f, pA1.u, 'open'), hk(T.l1 + .05, back(pA1, .03), pA1.f, pA1.u, 'cup'),
  hk(T.l1 + .7, back(pA1, .3), pA1.f, pA1.u, 'open'), hk(T.l1 + .71, HIDE, pA1.f, pA1.u),
  // 3 pinch off the two first flowers of the hero plant
  hk(T.l2 + .1, HIDE, pA1.f, pA1.u), hk(T.l2 + .11, back(pA1, .22), pA1.f, pA1.u, 'open'), hk(T.pick3 - .25, back(pA1, .012), pA1.f, pA1.u, 'open'),
  hk(T.pick3, pA1.anchor, pA1.f, pA1.u, 'pinchT'), hk(T.pick3 + .12, pA1.anchor, pA1.f, pA1.u, 'pinchT'), hk(T.pick3 + .5, up(pA1, .2), pA1.f, pA1.u, 'pinchT'),
  hk(T.pick3 + .75, back(pA2, .05), pA2.f, pA2.u, 'open'), hk(T.pick3 + 1.0, pA2.anchor, pA2.f, pA2.u, 'pinchT'), hk(T.pick3 + 1.12, pA2.anchor, pA2.f, pA2.u, 'pinchT'),
  hk(T.pick3 + 1.55, up(pA2, .24), pA2.f, pA2.u, 'pinchT'), hk(T.pick3 + 1.56, HIDE, pA2.f, pA2.u),
  // 5 gentle pinch at the base of one flower stalk: slow approach, hold, a slow lift with no tug
  hk(T.l4 + .1, HIDE, pB1.f, pB1.u), hk(T.l4 + .11, back(pB1, .2), pB1.f, pB1.u, 'open'), hk(T.hand5 - .1, back(pB1, .015), pB1.f, pB1.u, 'open'),
  hk(T.hand5 + .45, pB1.anchor, pB1.f, pB1.u, 'pinchT'), hk(T.gentle5 + .1, pB1.anchor, pB1.f, pB1.u, 'pinchT'), hk(T.gentle5 + .9, up(pB1, .07), pB1.f, pB1.u, 'pinchT'),
  hk(T.stem5 + .2, up(pB1, .25), pB1.f, pB1.u, 'pinchT'), hk(T.stem5 + .21, HIDE, pB1.f, pB1.u),
  // 6 the snips: in from above, open, close on the runner, lift away
  hk(T.l5 + .1, HIDE, SF, SU, 'grip'), hk(T.l5 + .11, add(CUTP, [.05, .25, .2]), SF, SU, 'grip'), hk(tCut - .35, add(CUTP, [0, .012, .004]), SF, SU, 'grip'),
  hk(tCut - .1, add(CUTP, [0, .002, 0]), SF, SU, 'grip'), hk(tCut + .15, add(CUTP, [0, .002, 0]), SF, SU, 'grip'), hk(tCut + .7, add(CUTP, [.04, .26, .16]), SF, SU, 'grip'),
  hk(tCut + .71, HIDE, SF, SU, 'grip') ];
const hand = { id: 'hand', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side: 'R', link: 'hand', skin: '#94624a', track: H,
  snipsK: [[0, 0], [T.l5 + .05, 0], [T.l5 + .06, 1]], snipOpenK: [[tCut - .6, 0], [tCut - .3, 1], [tCut - .02, 1], [tCut + .06, 0], [tCut + .4, 0], [tCut + .6, .5]] } };
A1.pick = { t0: T.pick3 + .12, t1: T.pick3 + .5, by: 'hand', cut: .4 }; A2.pick = { t0: T.pick3 + 1.12, t1: T.pick3 + 1.55, by: 'hand', cut: .4 };
B1.pick = { t0: T.gentle5 + .1, t1: T.stem5 + .2, by: 'hand', cut: .4 };

// ---------- the farmer (lines 7-8): walks the path between bed 0 and bed 1.3, squats at plant D, picks, stands with the basket ----------
const FX = .6, FZ = PD[1] + .14, SQ = -.55, at = (x, z, y = 0) => [x, y, z], YW = -Math.PI / 2;   // R palm in sbPick lands on the berry (probe)
const tSquat = T.easy7 - .45, tUp = T.l7 + .05;
const ftr = [[0, ...at(FX, 4.9), 0, 'stand'], [T.l6 + .05, ...at(FX, 4.9), 0, 'stand'], [tSquat - .5, ...at(FX, FZ), null, 'stand', 'walk'],
  [tSquat - .3, ...at(FX, FZ), YW, 'stand'], [tSquat, ...at(FX, FZ, SQ), YW, 'sbDrop'], [tPick - .3, ...at(FX, FZ, SQ), YW, 'sbDrop'],
  [tPick, ...at(FX, FZ, SQ), YW, 'sbPick'], [tPick + .1, ...at(FX, FZ, SQ), YW, 'sbPick'], [tDrop - .02, ...at(FX, FZ, SQ), YW, 'sbDrop'], [tUp, ...at(FX, FZ, SQ), YW, 'sbDrop'],
  [tUp + .65, ...at(FX, FZ), YW, 'sbCarryR'], [tUp + 1.15, ...at(FX, FZ + .03), 0, 'sbCarryR'], [T.like8 + .1, ...at(FX, FZ + .03), 0, 'sbCtaL'], [D + 1, ...at(FX, FZ + .03), 0, 'sbCtaL']];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 5, track: ftr } };
const BK = [FX, FZ - .33];                                                                       // under the R palm of sbDrop: handle top .30 m
const basket = obj('basket', 'sb_basket', [BK[0], 0, BK[1]], { n0: 16, fillK: [[0, 16], [tDrop, 17]], carry: [tUp - .05], by: 'farmer', hand: 'R' });

// ---------- farm world ----------
const world = [];
[[-9.0, -6.5, 8.5, 1], [7.4, -7.2, 9, 3]].forEach(([x, z, h, k], i) => world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.6, 6.4, .9, 'ph/shrub_02'], [4.4, 5.6, .8, 'ph/shrub_01'], [3.9, 3.2, .35, 'ph/rock_07'], [-4.0, 2.6, .5, 'ph/shrub_03']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

// ---------- sticker and camera spots (world) ----------
const FA1 = stalkPt(PA, A1, 1), FW = [PW[0], BH + .08, PW[1]], FRUIT = stalkPt(PA, AF[0], 1), BST = stalkPt(PB, B1, .3), RUNM = [PC[0] + .19, BH + .03, PC[1] + .03], DAU = [PC[0] + .46, .03, PC[1] + .1];
const beats = [
  // 1 hook: the flower, fingers reaching in; ring on the flower
  { t: 0, kind: 'info', add: [hand, farmer, beds, ...plants, field, basket, ...world, stk('ring1', 'circle_ring', FA1, .045, { delay: .2 })],
    camera: { target: [FA1[0] - .005, FA1[1] - .01, FA1[2]], dist: .26, elev: .3, az: .5, zoom: 'in' } },
  // 2 the weak young plant: thin and pale, many flowers ...
  { t: T.l1, kind: 'info', remove: ['ring1'], camera: { target: [PW[0], BH + .06, PW[1]], dist: .62, elev: .42, az: .25, zoom: 'out' } },
  //   ... two flowers drop their petals and swell into green fruits ...
  { t: T.if2 - .05, kind: 'info', camera: { target: [PW[0] + .03, BH + .09, PW[1] + .04], dist: .36, elev: .35, az: .55, zoom: 'in' } },
  //   ... it tires: the leaves sag and yellow (cross on the plant)
  { t: T.tired2 - .1, kind: 'info', add: [stk('x2', 'cross', [FW[0] + .1, FW[1] + .12, FW[2] + .06], .07, { delay: .15, pulse: true })],
    camera: { target: [PW[0], BH + .07, PW[1]], dist: .7, elev: .38, az: .1, zoom: 'out' } },
  // 3 the farmer's fingers pinch off the first flowers of the hero plant ...
  { t: T.l2, kind: 'info', remove: ['x2'], camera: { target: [PA[0] + .03, BH + .09, PA[1] + .02], dist: .46, elev: .3, az: .6, zoom: 'in' } },
  //   ... the plant sends its strength to the roots and the leaves (bed end face: roots grow, leaves perk up; cycle arrows, check)
  { t: T.plant3 - .05, kind: 'info', add: [stk('cyc3', 'arrows_cycle', [PA[0] + .17, BH + .03, Z0 + .03], .08, { delay: T.send3 - T.plant3 + .05 }),
      stk('ok3', 'check', [PA[0] - .13, BH + .2, Z0 + .02], .06, { delay: T.leaves3 - T.plant3 + .1 })],
    camera: { target: [PA[0], BH + .02, Z0], dist: .72, elev: .1, az: .08, zoom: 'out' } },
  // 4 later: the same plant grows strong (orbit) ...
  { t: T.l3, kind: 'info', remove: ['cyc3', 'ok3'], camera: { target: [PA[0], BH + .08, PA[1]], dist: .78, elev: .34, az: .2, spin: .5, zoom: 'out' } },
  //   ... and gives bigger, sweeter fruit (sparkles on the fruit)
  { t: T.fruit4 - .05, kind: 'info', add: [stk('spk4', 'sparkles', [FRUIT[0] + .03, FRUIT[1] + .05, FRUIT[2] + .02], .06, { delay: T.sweet4 - T.fruit4 + .05 })],
    camera: { target: [FRUIT[0] - .02, FRUIT[1] + .03, FRUIT[2] - .03], dist: .4, elev: .3, az: .5, zoom: 'in' } },
  // 5 gentle hand pinch at the stalk base (point-down on the stalk) ...
  { t: T.l4, kind: 'info', remove: ['spk4'], add: [stk('pt5', 'point_down', [BST[0], BST[1] + .05, BST[2]], .04, { delay: T.hand5 - T.l4 })],
    camera: { target: [BST[0], BST[1] + .01, BST[2]], dist: .3, elev: .28, az: .75, zoom: 'in' } },
  //   ... the crown and the other stalks stay untouched (check on the crown)
  { t: T.stem5 - .05, kind: 'info', remove: ['pt5'], add: [stk('ok5', 'check', [PB[0] + .07, BH + .1, PB[1] + .08], .05, { delay: T.harm5 - T.stem5 + .1 })],
    camera: { target: [PB[0], BH + .04, PB[1]], dist: .42, elev: .32, az: .5, zoom: 'out' } },
  // 6 the long runner and its daughter plant in the path (cross on the runner) ...
  { t: T.l5, kind: 'info', remove: ['ok5'], add: [stk('x6', 'cross', RUNM.map((v, i) => v + [0, .07, 0][i]), .06, { delay: T.run6 - T.l5, pulse: true })],
    camera: { target: [PC[0] + .22, .12, PC[1] + .05], dist: .72, elev: .45, az: .7, zoom: 'out' } },
  //   ... the snips cut it ...
  { t: T.run6 + .45, kind: 'info', remove: ['x6'], camera: { target: [CUTP[0] + .01, CUTP[1] + .01, CUTP[2]], dist: .36, elev: .4, az: .9, zoom: 'in' } },
  //   ... so the plant does not spread its strength far away (arrow-down at the daughter plant)
  { t: T.so6 + .35, kind: 'info', add: [stk('dn6', 'arrow_down', [DAU[0], DAU[1] + .09, DAU[2]], .06, { delay: T.lose6 - T.so6 - .35 })],
    camera: { target: [PC[0] + .25, .1, PC[1] + .05], dist: .75, elev: .4, az: .85, zoom: 'out' } },
  // 7 tidy rows with clear paths (thumbs-up on the row); the farmer walks in along the path ...
  { t: T.l6, kind: 'info', remove: ['dn6'], add: [stk('tu7', 'thumbs_up', [0, .75, 6.3], .26, { delay: T.tidy7 - T.l6 })],
    camera: { target: [.2, .25, 5.8], dist: 4.4, elev: .42, az: .28, zoom: 'out' } },
  //   ... squats, picks a ripe berry easily and drops it in the basket ...
  { t: T.easy7 - .5, kind: 'info', remove: ['tu7'], camera: { target: [FX - .2, .3, FZ - .1], dist: 2.4, elev: .32, az: .65, zoom: 'in' } },
  //   ... a microbe over the leaves (disease) ...
  { t: T.cure7, kind: 'info', add: [stk('mic7', 'microbe', [PG[0], BH + .22, PG[1]], .07, { delay: T.dis7 - T.cure7 - .1 })],
    camera: { target: [PG[0] - .05, BH + .1, PG[1] - .05], dist: 1.0, elev: .35, az: .4, zoom: 'out' } },
  //   ... cleared easily (check)
  { t: T.well7, kind: 'info', remove: ['mic7'], add: [stk('ok7', 'check', [PG[0], BH + .22, PG[1]], .07, { delay: .05 })],
    camera: { target: [PG[0] - .05, BH + .1, PG[1] - .05], dist: .95, elev: .36, az: .45, zoom: 'in' } },
  // 8 CTA: he stands with the basket, turns to us, thumb up; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', remove: ['ok7'], add: [stk('thumb8', 'thumbs_up', [FX + .45, 1.75, FZ + .2], .26, { delay: T.like8 - T.l7 })],
    camera: { target: [FX, .95, FZ + .05], dist: 2.5, elev: .14, az: .3, spin: .45, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفلاح بيشيل زهر الفراولة الأول بإيده',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 8, soilTint: [.92, .86, .78], horizon: 'nile', cover: 'high',
    haze: .4, sunElev: 44, sunAz: 25, turbidity: 2.4, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .3, clouds: 12,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBed: 'wind', sfxBeds: [{ cat: 'forest', idx: 5, gain: .02 }] },
  style: { camEase: .6, captionY: .78, exposure: .95, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
