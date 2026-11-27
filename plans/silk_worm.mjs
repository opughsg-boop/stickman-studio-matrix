// "لو اشتريت دود قز عشان تعمل مشروع حرير..." (voice-over 2026-11-27, 10 lines, 66.5 s, one take). A village silkworm house on a real-sky
// island: the lime-washed mud-brick rearing house (reed roof over the back strip, open front), a rearing table with two paper-lined trays,
// a staging bench, a bamboo cocoon frame on its own table, a cotton curtain on the open right side, and in the yard a 2.2 m mulberry tree
// and a sooty aluminium pot on three mud bricks over a small wood fire with a wooden reel behind it.
// Every spoken line is shown, never written (no digits, signs or labels):
//  1 hook: a grown silkworm chews the edge of a fresh mulberry leaf (scalloped bites); the tray of worms; ring on the leaf; the leaf runs out,
//    the worm lifts its head and searches, turns to the dry leaf beside it and will not eat it (hourglass, cross); pull out: every worm stops
//  2 the egg card: tiny dark hatchlings crawl out (point-down), fresh leaves drop in, the worms eat (yum) and grow white and big (check)
//  3 the farmer at the mulberry tree with a wicker basket picks two fresh leaves (hand on the leaf, ring on the tree, sparkles, check);
//    back in the tray the worm turns to the dry leaf, refuses it (cross) and goes back to the fresh one
//  4 the farmer carries the young tray (palms on the rails) deeper into the house and sets it on the table; warm sun glow; outside, a breeze
//    drives seed fluff at the curtain and dies there (arrow, check); a calm worm (eyes)
//  5 grown worms climb the bamboo frame and spin: a silk haze thickens round each curling worm into a white cocoon (arrows cycle, sparkles)
//  6 the hero cocoon (ring); the camera pulls in to the silk and one long thread loops out of it and runs far up (arrow)
//  7 the farmer waits by the frame (hourglass), carries the basket of cocoons to the pot and pours them into the hot water (steam, splash),
//    sets the basket down and holds the pot handle (on its rag); the threads loosen (check)
//  8 four threads rise from the floating cocoons through the eyelet onto the turning spool; the wound silk shines (sparkles, thumbs-up)
//  9 a whole cocoon floats in the hot water (ring, thinking face); a pierced cocoon on the stone with its hole and broken threads (cross); the
//    whole cocoon's thread runs unbroken to the reel (fire = the heat, check)
// 10 CTA: the farmer picks the finished spool off the brick, stands and shows it; thumbs-up; slow pull-out arcing round
// Step up vs the last render (dairy_cow, score 72):
//  motion   - (1) silkworm crawl by a peristaltic hump that runs tail to head while the body follows its own track (no sliding), chewing
//             head arcs along the leaf edge, searching head lift and a refusal turn; (2) spinning: figure-eight head swings while the body
//             curls and the haze thickens into the cocoon; (3) cocoons tumble from a tipped basket (pivot at the hand) into simmering water,
//             bob and spin as the threads reel off; a curtain that billows and settles in a gust
//  graphics - (1) new mulberry leaf (heart base, serrated edge, palmate veins, scalloped bite stages, curled dry leaf) on a new procedural
//             mulberry tree with bark and sway; (2) segmented worm with fold rings, prolegs, head capsule and tail horn; fibrous cocoon
//             with a waist, silk haze, floss, a pierced cocoon with frayed hole; (3) fire (flames, embers, glow light), steam, bubbles,
//             wobbling water, a sooty pot with a rag on the handle, glossy wound silk with a glint, a cotton curtain with woven stripes
//  realism  - (1) real sizes: worm 3-5 mm dark at hatching, 6.5 cm white when grown, leaf 8-14 cm, tray 0.6 x 0.42 m, cocoon 3.2 cm,
//             tree 2.2 m, pot 0.5 m on 14 cm bricks, people 1.75 m; (2) real practice: egg card on paper, fresh leaves several times a day,
//             mountage cells, stifling in hot water before the moth leaves, several cocoon threads through one eyelet to the reel;
//             (3) contact by construction and probe: palms on the tray rails, the basket handle in the palm, the right palm on the pot handle
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => { const s = S[Math.min(i, S.length - 1)]; return i === 0 && k === 0 ? 0 : s.words[Math.min(k, s.words.length - 1)].start; };
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(29);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, bob: size * .12, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const fol = (key, field, off) => ({ follow: [key, field, off] });
const L = i => W(i);

// ---------- key times (word starts) ----------
const T = { have1: W(0, 8), but1: W(0, 13), leaf1: W(0, 19), late1: W(0, 21), delay1: W(0, 23), day1: W(0, 25), stop1: W(0, 26),
  born2: W(1, 1), small2: W(1, 2), first2: W(1, 4), eat2: W(1, 8), much2: W(1, 10),
  tree3: W(2, 3), fresh3: W(2, 6), day3: W(2, 8), bec3: W(2, 10), dry3: W(2, 12), not3: W(2, 13),
  warm4: W(3, 4), wind4: W(3, 6), air4: W(3, 8), worm4: W(3, 11),
  grow5: W(4, 2), wrap5: W(4, 4), coc5: W(4, 7), soft5: W(4, 10),
  thr6: W(5, 6), long6: W(5, 8), reach6: W(5, 10),
  wait7: W(6, 1), then7: W(6, 4), boil7: W(6, 5), loose7: W(6, 10),
  soft8: W(7, 4), shiny8: W(7, 5), price8: W(7, 7),
  odd9: W(8, 1), finish9: W(8, 3), moth9: W(8, 8), means9: W(8, 10), kill9: W(8, 14), so9: W(8, 17), whole9: W(8, 20),
  like10: W(9, 5) };

// ---------- layout (metres; house back wall face z -2.6, left wall x -3.7, roof over z -2.6..-1.1, open front and right side) ----------
const TT = .92;                                   // rearing table / bench top (tray carried at the palms lands flush on it)
const T1 = [1.25, -1.95], TA = [.85, -1.92];      // rearing table (1.6 x .7) and tray A (long axis along z)
const BEN = [1.6, -.962], TBD = [1.6, -1.92];     // staging bench with tray B, and tray B's place on the rearing table
const FR = [-1.0, -1.95], FRH = .75;              // cocoon frame table (top .75) and frame
const TREE = [-1.9, 1.3], PICK = [-.7, 1.04, .15]; // mulberry tree and its low pick branch (tree-local)
const C = [.7, .9];                                // pot centre (handles along x)
const F_PICK = [TREE[0] + PICK[0] - .401, TREE[1] + PICK[2] - .104];     // palm probe: pickReach R palm = (+.401, 1.031, +.104) facing +x
const F_TRAY = [1.6, -1.44];                       // farmer between bench and table: carry palms (+-.215, .993, .228) facing +z
const F_WAIT = [-.25, -1.25], YW = Math.atan2(FR[0] - F_WAIT[0], FR[1] - F_WAIT[1]);
const F_POUR = [C[0] + .45, C[1] - .125];          // facing -x: pickDrop R palm (-.27, .90, +.125) -> basket .18 m from the pot centre, above the rim
const F_SQ = [C[0] + .61, C[1] - .15];             // facing +z, setDown (y -.3): R palm (-.32, .42, .15) -> on the +x handle (rag) at (C+.28, .39)
const BRICK = [F_SQ[0] - .18, F_SQ[1] + .30];      // squatPickR (y -.55): R palm (-.18, .20, .30) -> the finished spool on its brick
const BASK_C = [F_POUR[0] - .15, F_POUR[1] - .32]; // setDown facing -x puts the cocoon basket on the ground here
const STONE = [C[0] + .05, C[1] + .5], REEL = [C[0] - .1, C[1] - .55];

// ---------- the farmer (track keys [t, x, y, z, yaw|null, pose, gait|null]) ----------
const fk = (t, P, y, yaw, pose, gait) => [t, P[0], y, P[1], yaw, pose, gait];
const YX = PI / 2, pick1 = [20.55, 21.3], pick2 = [21.85, 22.6];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 5,
  hideK: [[0, 1], [18.25, 1], [18.3, 0], [23.15, 0], [23.2, 1], [24.8, 1], [24.85, 0], [29.25, 0], [29.3, 1], [41.85, 1], [41.9, 0]],   // 1 = hidden
  track: [fk(0, F_PICK, 0, YX, 'basketHold'), fk(20.1, F_PICK, 0, YX, 'basketHold'),
    fk(20.45, F_PICK, 0, YX, 'pickReach'), fk(20.65, F_PICK, 0, YX, 'pickReach'), fk(20.95, F_PICK, 0, YX, 'pickPull'), fk(21.3, F_PICK, 0, YX, 'pickDrop'), fk(21.5, F_PICK, 0, YX, 'basketHold'),
    fk(21.6, F_PICK, 0, YX, 'basketHold'), fk(21.8, F_PICK, 0, YX, 'pickReach'), fk(21.95, F_PICK, 0, YX, 'pickReach'), fk(22.25, F_PICK, 0, YX, 'pickPull'), fk(22.6, F_PICK, 0, YX, 'pickDrop'),
    fk(22.85, F_PICK, 0, YX, 'basketHold'), fk(23.2, F_PICK, 0, YX, 'basketHold'),
    fk(24.75, F_TRAY, 0, 0, 'carry'), fk(25.3, F_TRAY, 0, 0, 'carry'), fk(25.95, F_TRAY, 0, PI / 2, 'carry'), fk(26.6, F_TRAY, 0, PI, 'carry'), fk(27.0, F_TRAY, 0, PI, 'carry'),
    fk(27.35, F_TRAY, 0, PI, 'stand'), fk(28.55, [.35, -1.44], 0, null, 'stand', 'walk'), fk(29.3, [.05, -.7], 0, null, 'stand', 'walk'),
    fk(41.8, F_WAIT, 0, YW, 'bucketWalk'), fk(43.4, F_WAIT, 0, YW, 'bucketWalk'), fk(44.75, [1.35, .05], 0, null, 'bucketWalk', 'walk'), fk(45.55, F_POUR, 0, -PI / 2, 'bucketWalk', 'walk'),
    fk(45.75, F_POUR, 0, -PI / 2, 'pickDrop'), fk(46.5, F_POUR, 0, -PI / 2, 'pickDrop'), fk(46.85, F_POUR, -.3, -PI / 2, 'setDown'), fk(47.05, F_POUR, -.3, -PI / 2, 'setDown'),
    fk(47.35, F_POUR, 0, -PI / 2, 'stand'), fk(47.7, F_SQ, 0, 0, 'stand'), fk(48.05, F_SQ, -.3, 0, 'setDown'), fk(61.3, F_SQ, -.3, 0, 'setDown'),
    fk(61.75, F_SQ, -.55, 0, 'squatPickR'), fk(62.05, F_SQ, -.55, 0, 'squatPickR'), fk(62.6, F_SQ, 0, .1, 'presentR'), fk(63.6, [F_SQ[0] + .14, F_SQ[1] + .35], 0, .3, 'presentR', 'walk'),
    fk(D + 1, [F_SQ[0] + .14, F_SQ[1] + .35], 0, .3, 'presentR')] } };

// ---------- props ----------
const trayA = obj('trayA', 'silk_tray', [TA[0], TT, TA[1]], { link: 'A', seed: 1101, leaves: 30, worms: 24,
  hero: { x: 0, z: .12, yaw: -PI / 2, L: .068, leaf: [-.06, .085, 0, .13],
    eatK: [[0, .05], [T.late1, .55], [T.delay1 + .3, 1], [12.4, 1], [12.45, 0], [T.bec3, .1], [L(3), .22], [D, .5]],
    chewK: [[0, 1], [T.delay1 + .3, 1], [T.delay1 + .6, 0], [12.4, 0], [12.45, 1], [T.dry3 - .1, 1], [T.dry3 + .2, 0], [T.not3 + .6, 0], [T.not3 + .9, 1]],
    liftK: [[0, 0], [T.delay1 + .3, 0], [T.delay1 + .8, .8], [T.day1 + .5, .35], [12.4, .35], [12.45, 0], [T.dry3, 0], [T.dry3 + .3, .45], [T.not3 + .6, .45], [T.not3 + .9, 0]],
    turnK: [[0, 0], [T.day1 - .1, 0], [T.day1 + .5, -1], [12.4, -1], [12.45, 0], [T.dry3, 0], [T.dry3 + .4, -1], [T.not3 + .5, -1], [T.not3 + .9, 0]] },
  dry: [[-.07, -.075, .3, .115]], chewK: [[0, 1], [T.stop1, 1], [T.stop1 + .3, 0], [12.4, 0], [12.45, 1]],
  eatK: [[0, .1], [T.late1, .4], [T.stop1, .95], [12.4, .95], [12.45, .05], [D, .35]] });
const trayB = obj('trayB', 'silk_tray', [BEN[0], TT, BEN[1]], { link: 'B', seed: 1103, leaves: 26, worms: 24, eggs: true, calm: 9,
  hatchK: [[0, 0], [T.born2, 0], [T.small2 + .5, 1]], sizeK: [[0, .004], [15.2, .0045], [18.3, .058], [D, .064]], darkK: [[0, 1], [15.4, 1], [17.4, 0]],
  spreadK: [[0, 0], [15.0, 0], [18.0, 1]], freshK: [[0, 0], [T.first2 + .05, 0], [T.first2 + .1, 1]], eatK: [[0, 0], [15.6, 0], [18.3, .6], [24.0, .6], [24.05, .1], [D, .3]],
  at: [[0, [0, 0]], [25.3, 'LR'], [27.0, [TBD[0] - BEN[0], TBD[1] - BEN[1], 0, PI]]] });
const tables = [obj('t1', 'silk_table', [T1[0], 0, T1[1]], { w: 1.6, d: .7, h: TT }), obj('bench', 'silk_table', [BEN[0], 0, BEN[1]], { w: .5, d: .7, h: TT }),
  obj('t2', 'silk_table', [FR[0], 0, FR[1]], { w: .9, d: .5, h: FRH, tint: '#7d5f40' })];
const frame = obj('frame', 'silk_frame', [FR[0], FRH, FR[1]], { link: 'frame', seed: 1107, w: .72, h: .5, nx: 8, ny: 5, heroCell: 19,
  climb: [31.0, 32.6], spin: [32.5, 34.9], threadK: [[0, 0], [38.35, 0], [40.7, 1]] });
const curtain = obj('curtain', 'silk_curtain', [2.45, 0, -1.75], { w: 1.6, h: 2.3, gustK: [[0, 0], [27.6, 0], [28.0, 1], [28.9, .8], [29.6, 0]] }, PI / 2);
const breeze = obj('breeze', 'breeze', [3.45, .3, -1.75], { gustK: [[0, 0], [27.45, 0], [27.85, 1], [28.9, 1], [29.4, 0]], wind: [-1, 0], box: [1.9, 1.5, 1.4], n: 90, size: .02 });
const sun = obj('sun', 'sun_glow', [1.05, 2.05, -1.0], { size: 1.0, showK: [[0, 0], [T.warm4 - .2, 0], [T.warm4 + .3, 1], [28.9, 1], [29.3, 0]] });
const tree = obj('tree', 'mulberry_tree', [TREE[0], 0, TREE[1]], { link: 'tree', seed: 1109, h: 2.2, pickAt: PICK, clear: [-1.0, .05, .42], by: 'farmer',
  picks: [{ t0: pick1[0], t1: pick1[1] }, { t0: pick2[0], t1: pick2[1] }] });
const basketL = obj('basketL', 'silk_basket', [F_PICK[0] + .2, 0, F_PICK[1] - .25], { kind: 'leaves', link: 'basketL', by: 'farmer', n0: 6, fillK: [[0, 6], [pick1[1], 7], [pick2[1], 8]],
  at: [[0, 'L']], showK: [[0, 0], [18.25, 0], [18.3, 1], [23.15, 1], [23.2, 0]] });
const basketC = obj('basketC', 'silk_basket', [BASK_C[0], 0, BASK_C[1]], { kind: 'cocoons', link: 'basketC', by: 'farmer', n0: 30, fillK: [[0, 30], [45.95, 8]],
  at: [[0, 'R'], [46.75, [0, 0, 0, 0]]], tipK: [[0, 0], [45.7, 0], [46.05, 1.35], [46.35, 1.35], [46.6, 0]], showK: [[0, 0], [41.85, 0], [41.9, 1]] });
const pot = obj('pot', 'silk_pot', [C[0], 0, C[1]], { link: 'pot', seed: 1113, basket: 'basketC', spool: 'spool', whole: 6,
  cocoonsK: [[0, 0], [45.95, 26]], threadK: [[0, 0], [46.6, 0], [48.0, .6], [49.2, 1]], reelK: [[0, 0], [48.4, 0], [48.8, 1]] });
const reel = obj('reel', 'silk_reel', [REEL[0], 0, REEL[1]], { link: 'spool', windK: [[0, 0], [48.5, 0], [52.8, .8], [D, 1]], turnK: [[0, 0], [48.5, 0], [D, (D - 48.5) * 1.1]],
  shineK: [[0, 0], [T.shiny8 - .2, 0], [T.shiny8 + .2, 1], [52.8, 1], [53.3, 0]] });
const spool2 = obj('spool2', 'silk_reel', [BRICK[0], .2, BRICK[1]], { link: 'spool2', stand: false, brick: true, by: 'farmer', at: [[0, [0, 0, 0, 0]], [61.95, 'R']],
  shineK: [[0, 0], [62.8, 0], [63.2, 1]] });
const pierced = obj('pierced', 'silk_cocoon', [STONE[0], 0, STONE[1]], { link: 'pierced', hole: true, stone: true, yaw: .4 });

// ---------- the house, the yard and the village around it ----------
const world = [obj('barn', 'dairy_barn', [0, 0, -2.6], { len: 7.4, h: 2.7, side: 2.8, roofD: 1.5 })];
[[-9.5, -9.5, 9], [10.5, -8.5, 8.5]].forEach(([x, z, h], i) => world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i}`, x, z, h, { rotY: i * 1.9, params: { sway: .01, ph: i } })));
[[-4.6, -3.3, 1.0, 'nature_pack/Bush_1'], [4.7, -3.0, 1.0, 'nature_pack/Bush_2'], [4.6, 2.2, .7, 'ph/shrub_02'], [-4.6, 2.6, .6, 'ph/shrub_01']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
for (let i = 0, n = 0; i < 500 && n < 30; i++) { const x = -6.5 + R() * 13, z = .6 + R() * 5; if (Math.hypot(x - TREE[0], z - TREE[1]) < 1.6 || Math.hypot(x - C[0], z - C[1]) < 1.5 || (x > -.5 && x < 2 && z < 1.2) || (x > 2.2 && z < .3)) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], x, z, .25 + R() * .2, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }

// ---------- reference points (world) ----------
const HERO = [TA[0], TT + .03, TA[1] + .12], LEAF = [TA[0] - .06, TT + .03, TA[1] + .12], DRY = [TA[0] - .07, TT + .03, TA[1] - .075];
const CARD = [BEN[0], TT + .012, BEN[1]], HCOC = [FR[0] - .045, FRH + .28, FR[1]], PW = [C[0], .4, C[1]], SPL = [REEL[0], .74, REEL[1]];

// ---------- beats (continuous camera; 9:16, fov 40: visible width ~.41 x dist) ----------
const beats = [
  // 1 hook: a silkworm chews the edge of a fresh mulberry leaf, first frame
  { t: 0, add: [farmer, ...tables, trayA, trayB, frame, curtain, breeze, sun, tree, basketL, basketC, pot, reel, spool2, pierced, ...world],
    camera: { target: [HERO[0] - .015, HERO[1], HERO[2]], dist: .3, elev: .55, az: .55, zoom: 'in' } },
  //   ... a whole tray of worms on the paper
  { t: T.have1, camera: { target: [TA[0], TT + .02, TA[1]], dist: 1.5, elev: .62, az: .3 } },
  //   ... but they only work on mulberry leaves: back on the chewed leaf; ring on the leaf
  { t: T.but1, add: [stk('ring1', 'circle_ring', [0, 0, 0], .15, { delay: T.leaf1 - T.but1, ...fol('tray:A', 'leaf', [0, .03, .035]) })],
    camera: { target: [LEAF[0] + .02, LEAF[1], LEAF[2] + .02], dist: .4, elev: .72, az: .85, zoom: 'in' } },
  //   ... if the leaves are a day late: the leaf runs out, the worm lifts and searches (hourglass)
  { t: T.late1, remove: ['ring1'], add: [stk('hg1', 'hourglass', [TA[0] + .04, TT + .13, TA[1] + .1], .05, { delay: T.delay1 - T.late1 })],
    camera: { target: [HERO[0] - .03, HERO[1], HERO[2] - .05], dist: .45, elev: .62, az: .35 } },
  //   ... it turns to the dry leaf and will not eat it (cross)
  { t: T.day1, remove: ['hg1'], add: [stk('x1', 'cross', [0, 0, 0], .05, { pulse: true, ...fol('tray:A', 'dry', [0, .045, 0]) })],
    camera: { target: [TA[0] - .03, TT + .03, TA[1] + .03], dist: .42, elev: .85, az: .15 } },
  //   ... the whole project stops: pull out, every worm still
  { t: T.stop1, camera: { target: [.7, 1.0, -1.7], dist: 3.0, elev: .3, az: .35, zoom: 'out' } },
  // 2 the worm hatches very small: the egg card on the bench
  { t: L(1), remove: ['x1'], camera: { target: CARD, dist: .26, elev: .95, az: .3, zoom: 'in' } },
  //   ... tiny dark hatchlings crawl out (point-down)
  { t: T.born2, add: [stk('pd2', 'point_down', [0, 0, 0], .028, { delay: T.small2 - T.born2 + .2, ...fol('tray:B', 'calm', [0, .022, 0]) })],
    camera: { target: [CARD[0] - .03, CARD[1], CARD[2] - .03], dist: .19, elev: 1.0, az: .35 } },
  //   ... the first thing it does is eat: fresh leaves drop in, they eat (yum)
  { t: T.first2, remove: ['pd2'], add: [stk('yum2', 'face_yum', [BEN[0] + .16, TT + .16, BEN[1] + .1], .07, { delay: T.eat2 - T.first2 })],
    camera: { target: [BEN[0], TT + .02, BEN[1]], dist: .5, elev: .85, az: .5 } },
  //   ... and eat a lot: they grow white and big (check)
  { t: T.eat2, add: [stk('ok2', 'check', [BEN[0] - .15, TT + .2, BEN[1] + .1], .08, { delay: T.much2 - T.eat2 })],
    camera: { target: [BEN[0], TT + .02, BEN[1]], dist: .95, elev: .7, az: .35, zoom: 'out' } },
  // 3 a mulberry tree close by: the farmer at the tree with his basket
  { t: L(2), remove: ['yum2', 'ok2'], camera: { target: [-2.3, 1.1, 1.35], dist: 4.6, elev: .15, az: .25, zoom: 'in' } },
  //   ... ring on the tree, the camera arcs round it
  { t: T.tree3, add: [stk('ring3', 'circle_ring', [TREE[0], 1.75, TREE[1]], 1.5, { delay: .25 })], camera: { target: [-2.1, 1.2, 1.3], dist: 4.1, elev: .2, az: -.2, spin: .3 } },
  //   ... fresh leaves: he picks one (sparkles on the leaf in his hand)
  { t: pick1[0] - .2, remove: ['ring3'], add: [stk('sp3', 'sparkles', [0, 0, 0], .07, { delay: T.fresh3 - pick1[0] + .3, ...fol('farmer', 'R', [0, .08, .02]) })],
    camera: { target: [TREE[0] + PICK[0] - .1, 1.05, TREE[1] + PICK[2]], dist: 2.0, elev: .18, az: .9 } },
  //   ... every day: a second leaf into the basket (check)
  { t: T.day3, remove: ['sp3'], add: [stk('ok3', 'check', [F_PICK[0] + .25, 1.95, F_PICK[1] - .1], .12, { delay: .2 })],
    camera: { target: [F_PICK[0] + .25, 1.1, F_PICK[1]], dist: 2.3, elev: .18, az: 1.0 } },
  //   ... because the dry leaf is not eaten: the worm turns to it, refuses it (cross) and goes back to the fresh one
  { t: T.bec3, remove: ['ok3'], add: [stk('x3', 'cross', [0, 0, 0], .05, { delay: T.not3 - T.bec3, pulse: true, ...fol('tray:A', 'dry', [0, .045, 0]) })],
    camera: { target: [TA[0] - .03, TT + .03, TA[1] + .03], dist: .45, elev: .75, az: .4 } },
  // 4 warm and steady air: the farmer carries the young tray deeper into the house (palms on the rails)
  { t: L(3), remove: ['x3'], camera: { target: [1.55, 1.0, -1.45], dist: 3.4, elev: .15, az: .55 } },
  //   ... warm: the sun glow over the trays
  { t: T.warm4, camera: { target: [1.5, 1.2, -1.55], dist: 3.7, elev: .17, az: .42 } },
  //   ... no cold wind: outside, the breeze drives fluff at the curtain and dies there (arrow, check)
  { t: T.wind4, add: [stk('ar4', 'arrow_left', [3.4, 1.3, -1.35], .26, { delay: T.air4 - T.wind4 }), stk('ok4', 'check', [2.5, 1.85, -1.05], .2, { delay: 1.0 })],
    camera: { target: [2.6, 1.15, -1.55], dist: 3.3, elev: .12, az: 1.0 } },
  //   ... so the worm stays well: a calm worm on the young tray (eyes)
  { t: T.worm4, remove: ['ar4', 'ok4'], add: [stk('eye4', 'eyes', [0, 0, 0], .04, { delay: .15, ...fol('tray:B', 'calm', [0, .03, 0]) })],
    camera: { target: [TBD[0], TT + .03, TBD[1]], dist: .55, elev: .7, az: .4 } },
  // 5 when the worm is grown: they climb the bamboo frame
  { t: L(4), remove: ['eye4'], camera: { target: [FR[0], FRH + .25, FR[1]], dist: 1.8, elev: .1, az: .3, zoom: 'in' } },
  //   ... and wrap themselves (arrows cycle by the spinning worm)
  { t: T.wrap5, add: [stk('cyc5', 'arrows_cycle', [0, 0, 0], .07, { delay: .1, ...fol('frame:frame', 'hero', [.07, .06, .05]) })],
    camera: { target: [HCOC[0], HCOC[1], HCOC[2] + .02], dist: .55, elev: .1, az: .2 } },
  //   ... in a cocoon
  { t: T.coc5, remove: ['cyc5'], camera: { target: [HCOC[0], HCOC[1], HCOC[2] + .02], dist: .32, elev: .12, az: -.15 } },
  //   ... of very fine thread (sparkles on the silk)
  { t: T.soft5, add: [stk('sp5', 'sparkles', [0, 0, 0], .045, { delay: .1, ...fol('frame:frame', 'hero', [.03, .035, .03]) })],
    camera: { target: [HCOC[0], HCOC[1], HCOC[2] + .02], dist: .26, elev: .08, az: .25 } },
  // 6 this cocoon holds the silk (ring)
  { t: L(5), remove: ['sp5'], add: [stk('ring6', 'circle_ring', [0, 0, 0], .065, { delay: .3, ...fol('frame:frame', 'hero', [0, 0, .03]) })],
    camera: { target: [HCOC[0], HCOC[1], HCOC[2] + .02], dist: .2, elev: .1, az: .05 } },
  //   ... and a thread: pull in to the silk
  { t: T.thr6, remove: ['ring6'], camera: { target: [HCOC[0], HCOC[1] + .02, HCOC[2] + .015], dist: .22, elev: .15, az: .3, zoom: 'in' } },
  //   ... long, hundreds of metres: the thread loops out and runs far up (arrow)
  { t: T.long6, add: [stk('au6', 'arrow_up_right', [HCOC[0] + .16, HCOC[1] + .45, HCOC[2] + .2], .08, { delay: T.reach6 - T.long6 })],
    camera: { target: [HCOC[0] + .07, HCOC[1] + .28, HCOC[2] + .1], dist: .85, elev: .05, az: .4 } },
  // 7 the farmer waits for the cocoons to finish (hourglass)
  { t: L(6), remove: ['au6'], add: [stk('hg7', 'hourglass', [0, 0, 0], .2, { delay: T.wait7 - L(6), ...fol('farmer', 'beak', [0, .42, 0]) })],
    camera: { target: [-.6, 1.05, -1.6], dist: 3.4, elev: .14, az: -.35 } },
  //   ... then carries the cocoons to the pot
  { t: T.then7, remove: ['hg7'], camera: { target: [.85, .8, .4], dist: 3.8, elev: .2, az: .3 } },
  //   ... and boils them in the hot water: he pours them in (steam, splash)
  { t: T.boil7 + .8, camera: { target: [C[0] + .1, .6, C[1]], dist: 1.7, elev: .35, az: .5 } },
  //   ... so the thread comes off easily: he holds the pot by its handle, the threads loosen (check)
  { t: 46.9, add: [stk('ok7', 'check', [0, 0, 0], .08, { delay: T.loose7 - 46.9 + .3, ...fol('pot:pot', 'water', [-.1, .28, 0]) })],
    camera: { target: [C[0] + .15, .5, C[1]], dist: 1.25, elev: .45, az: .35 } },
  // 8 that makes the silk soft and shiny: threads rise through the eyelet onto the turning spool
  { t: L(7), remove: ['ok7'], camera: { target: [C[0] - .05, .62, C[1] - .25], dist: 1.15, elev: .2, az: .55 } },
  //   ... soft (sparkles on the wound silk)
  { t: T.soft8, add: [stk('sp8', 'sparkles', [0, 0, 0], .05, { delay: .1, ...fol('spool:spool', 'top', [0, .03, .03]) })], camera: { target: SPL, dist: .5, elev: .15, az: .6 } },
  //   ... and sells well (thumbs-up)
  { t: 50.68, remove: ['sp8'], add: [stk('th8', 'thumbs_up', [0, 0, 0], .08, { delay: T.price8 - 50.68, ...fol('spool:spool', 'c', [.02, .13, .02]) })],
    camera: { target: SPL, dist: .65, elev: .2, az: .25, spin: .3 } },
  // 9 the strangest thing? a whole cocoon floating in the hot water (ring, thinking face)
  { t: L(8), remove: ['th8'], add: [stk('ring9', 'circle_ring', [0, 0, 0], .065, { delay: .2, ...fol('pot:pot', 'whole', [0, .005, 0]) }),
    stk('ft9', 'face_thinking', [0, 0, 0], .055, { delay: T.odd9 - L(8), ...fol('pot:pot', 'whole', [.06, .06, 0]) })], camera: { target: PW, dist: .5, elev: .8, az: .3 } },
  //   ... when it finishes the cocoon a moth comes out: the pierced cocoon on the stone (cross)
  { t: T.finish9, remove: ['ring9', 'ft9'], add: [stk('x9', 'cross', [0, 0, 0], .045, { delay: T.moth9 - T.finish9, pulse: true, ...fol('coc:pierced', 'c', [0, .045, 0]) })],
    camera: { target: [STONE[0], .09, STONE[1]], dist: .42, elev: .5, az: -.85 } },
  //   ... so the cocoon has to be stifled in the heat first (fire by the stove)
  { t: T.means9, remove: ['x9'], add: [stk('fire9', 'fire', [C[0] + .32, .2, C[1] + .2], .08, { delay: T.kill9 - T.means9 })], camera: { target: [C[0], .38, C[1]], dist: .9, elev: .45, az: .15 } },
  //   ... so the thread stays whole: the unbroken thread runs from the whole cocoon to the reel (check)
  { t: T.so9, remove: ['fire9'], add: [stk('ok9', 'check', [0, 0, 0], .06, { delay: T.whole9 - T.so9, ...fol('pot:pot', 'c0', [0, .06, 0]) })],
    camera: { target: [C[0] - .05, .6, C[1] - .3], dist: .95, elev: .25, az: .7 } },
  // 10 CTA: the farmer picks up the finished spool and shows it; thumbs-up; slow pull-out arcing round
  { t: L(9), remove: ['ok9'], add: [stk('sp10', 'sparkles', [0, 0, 0], .07, { delay: .9, ...fol('spool:spool2', 'c', [0, .07, .02]) }),
    stk('th10', 'thumbs_up', [0, 0, 0], .2, { delay: T.like10 - L(9), ...fol('farmer', 'beak', [0, .45, 0]) })],
    camera: { target: [F_SQ[0], 1.1, F_SQ[1] + .3], dist: 2.5, elev: .12, az: .2, spin: .5, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'لو اشتريت دود قز',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .01,
  env: { island: { w: 22, d: 20, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 9, soilTint: [1.0, .95, .88], horizon: 'nile', cover: 'high',
    haze: .45, sunElev: 38, sunAz: 22, turbidity: 3.0, water: '#7f9a8f', waves: 0, foam: false, birds: 2, birdModel: 'Stork', motes: .4, clouds: 14,
    // sound library (this plan only, at or under the global caps): a quiet wind bed, a faint bird bed, the splash and the simmer
    sfxBeds: [{ cat: 'wind', idx: 0, gain: .03, fade: 1.5 }, { cat: 'bird', idx: 0, gain: .02, fade: 1.5 }],
    sfxCalls: [{ cat: 'water', idx: 0, times: [45.95], dur: 1.2, gain: .04 }, { cat: 'bubbles', idx: 0, times: [47.0, 53.0, 57.3], dur: 2.0, gain: .035 }] },
  style: { camEase: .6, captionY: .78, exposure: .8, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, kind: 'info', text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
