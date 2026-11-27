// "لو اشتريت شتلة زيتون... ولو اتزرعت في أرض مبلولة بتموت" (voice-over 2026-11-27, 9 lines, 48.26 s, one take).
// An Egyptian olive plot in bright late-morning sun (flat field, Nile horizon, real soil). New renderer pack (renderer/scene.js
// "Olive seedling pack"): `ol_seedling` (0.75 m nursery olive, two-tone leaves that yellow and droop, roots on the soil section that rot),
// `ol_pool` (standing murky water with ripples and bubbles), `ol_bed` (raised mound: hole, clods, sandy fill, wet ring that dries),
// `ol_channel` (drainage ditch with running water), `ol_sand`, `ol_hoe` and `ol_can` held by the UAL Farmer; `olive_tree` gains olives
// (fruit / fruitK) and a time-lapse growK. No real olive model exists in assets/lib or Poly Haven: the olive plants are the procedural
// olive pack (substitute), at real size (seedling 0.75 m, mature tree 4.2 m, olives 2 cm).
// No words on screen; every line shows its object or action:
//  1 hook: close on a seedling standing in a flooded muddy patch (bubbles, ripples); hourglass on "years"; low over the water, cross on "dies"
//  2 a raised dry bed with a healthy seedling and a drainage ditch beside it: point down on the running water; check on the bed
//  3 the soaked patch (drop), then the soil section: water fills the pores, bubbles, ring round the roots; they turn dark with lesions (cross, microbe)
//  4 the leaves turn a dull yellow (subtle) and droop (eyes, sick face)
//  5 wrong: low ground, the pool spreads; the Farmer hoses the seedling hard (cross on the pool, cycle arrows for "every day")
//  6 right: the raised bed (check); he digs a hole with the fas (clods), kneels and fills it with soil + sand (the heap shrinks); the seedling sits on the mound
//  7 he crouches and sprinkles it gently with a watering can (drop); stands and waits while the dark wet ring dries (thumbs up)
//  8 the seedling grows; years later a mature olive tree on the same bed (hourglass); olives swell on the branches (sparkles)
//  9 CTA: the Farmer turns from the tree to us and talks; thumbs up; slow pull-out arcing round
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI;
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, o = {}) => ({ id, type, pos, params, anim: o.anim || 'none', dust: false, delay: o.delay || 0, ...(o.rotY != null ? { rotY: o.rotY } : {}) });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7), l8: W(8),
  but1: W(0, 12), years1: W(0, 16), if1: W(0, 19), wet1: W(0, 23), die1: W(0, 24),
  water2: W(1, 5), down2: W(1, 6), roots2: W(1, 9), notunder2: W(1, 10),
  wet3: W(2, 3), stand3: W(2, 5), roots3: W(2, 6), choke3: W(2, 7), rot3: W(2, 9),
  leaf4: W(3, 1), yellow4: W(3, 3), tree4: W(3, 4), die4: W(3, 5),
  low5: W(4, 5), gather5: W(4, 6), water5: W(4, 8), hose5: W(4, 10), daily5: W(4, 11), heavy5: W(4, 13),
  high6: W(5, 5), hole6: W(5, 8), fill6: W(5, 9), soil6: W(5, 10), sand6: W(5, 13),
  mod7: W(6, 2), wait7: W(6, 3), dry7: W(6, 5), next7: W(6, 8),
  right8: W(7, 2), grow8: W(7, 4), strong8: W(7, 5), years8: W(7, 7), bear8: W(7, 9), olives8: W(7, 10),
  like9: W(8, 5), follow9: W(8, 6) };

// ---------- layout (metres). Island 22 x 16, front soil face at z 8 (camera side +z) ----------
const ZF = 8;
const S1 = [-1.6, 7.8];                      // the waterlogged seedling, 0.2 m behind the soil face (its roots are drawn on the face)
const POOL = [-1.6, 7.62];                   // standing water round it (front edge 0.08 m inside the face)
const BED = [1.5, 6.4], BH = .22;            // raised bed 1.3 x 0.76 m, 22 cm high; the planting hole at its centre
const CH = [2.33, 6.65];                     // the drainage ditch along the bed's +x side, running to the face
const F1 = [-2.55, 7.25], F1Y = Math.atan2(S1[0] - F1[0], S1[1] - F1[1]);  // the Farmer hosing (line 5), facing the seedling
const F2 = [1.5, 7.45];                      // the Farmer at the bed (lines 6-7), facing -z (0.55 m off the bed's edge: kneeling reach lands on the mound)
const F3 = [-.7, 7.35], F3Y = Math.atan2(BED[0] - F3[0], BED[1] - F3[1]);   // the Farmer beside the grown tree (lines 8-9)
const SAND = [.5, 7.38], CAN0 = [2.0, 7.6, 0], HOE0 = [.2, 7.0, 2.67];

// ---------- the waterlogged seedling and its ground ----------
const POUR = [T.l6 + .55, T.mod7 + .55];     // can pour window (line 7)
const s1 = obj('s1', 'ol_seedling', [S1[0], 0, S1[1]], { h: .75, seed: 5, roots: { z: ZF - S1[1] - .004, depth: .3, rotK: [[T.rot3 - .2, 0], [T.rot3 + 1.3, 1]] },
  yellowK: [[T.leaf4, 0], [T.yellow4 + .6, .6], [T.die4 + .8, .72]], droopK: [[T.tree4, 0], [T.die4 + 1.0, .65]] });
const pool = obj('pool', 'ol_pool', [POOL[0], 0, POOL[1]], { rx: .62, rz: .3, stem: [S1[0] - POOL[0], S1[1] - POOL[1]], seed: 77,
  levelK: [[0, .8], [T.low5 + .1, .8], [T.water5 + .3, 1]], bubK: [[0, .6], [T.choke3, .6], [T.choke3 + .5, 1]] });
const mud = obj('mud', 'mud_patch', [POOL[0], 0, POOL[1] - .05], { w: 1.7, d: .75, seed: 223, puddles: [[-.62, .1, .1, .06], [.6, -.12, .09, .06]] });
const section = obj('section', 'soil_section', [0, 0, 0], { x0: -2.45, x1: -.75, depth: .5, z: ZF + .002, seed: 61,
  wetK: [[T.wet3 - .2, 0], [T.stand3 + .5, 1]], bubK: [[T.roots3 - .1, 0], [T.choke3, 1], [T.rot3 + 1.5, .5]] });

// ---------- the bed, the ditch, the sand and the planted seedling ----------
const bed = obj('bed', 'ol_bed', [BED[0], 0, BED[1]], { w: 1.3, d: .76, h: BH, seed: 31,
  holeK: [[T.hole6 - .15, 0], [T.fill6 + .1, 1]], fillK: [[T.soil6 - .2, 0], [T.sand6 + .1, 1]],
  wetK: [[POUR[0] + .2, 0], [POUR[1], 1], [T.dry7 - .3, 1], [T.next7 + .3, .12]] });
const chan = obj('chan', 'ol_channel', [CH[0], 0, CH[1]], { len: 2.7, w: .17, side: 1, flowK: [[0, 1]] });
const sand = obj('sand', 'ol_sand', [SAND[0], 0, SAND[1]], { r: .15, h: .1, sizeK: [[T.soil6, 1], [T.sand6 + .2, .35]] });
const s2 = obj('s2', 'ol_seedling', [BED[0], BH, BED[1]], { h: .75, seed: 8 });
const s2b = obj('s2b', 'ol_seedling', [BED[0], BH + .04, BED[1]], { h: .75, seed: 8, growK: [[T.grow8, 1], [T.strong8 - .05, 1.5]] }, { anim: 'grow' });
const tree = obj('tree', 'olive_tree', [BED[0], BH - .01, BED[1]], { h: 4.2, seed: 11, leafMul: 2.2, leafScale: 1.25, barkTint: '#a59f94', fruit: 320, growK: [[T.strong8 - .1, .3], [T.years8 + .4, 1]], fruitK: [[T.bear8 - .4, 0], [T.olives8 + .3, 1]] });

// ---------- the Farmer (UAL clips, handoff) and his tools ----------
const farmer1 = obj('farmer1', 'glb', [F1[0], 0, F1[1]], { model: 'modular_men/Farmer', height: 1.75, link: 'farmer1', handoff: true, ual: ['Idle_Loop'] }, { rotY: F1Y });
const hose = obj('hose', 'aru_hose', [0, 0, 0], { tap: [-3.75, 6.25], by: 'farmer1', hand: 'R', aim: [S1[0], 0, S1[1] - .05], sweep: .2,
  sprayK: [[T.hose5 - .2, 0], [T.hose5 + .1, 1], [T.l5 - .3, 1], [T.l5, 0]], wetK: [[T.hose5, 0], [T.l5, 1]] });
const farmer2 = obj('farmer2', 'glb', [F2[0], 0, F2[1]], { model: 'modular_men/Farmer', height: 1.75, link: 'farmer2', handoff: true, ual: ['Idle_Loop', 'Push_Loop', 'Fixing_Kneeling', 'Crouch_Idle_Loop'] }, { rotY: PI });
const HOLE = [BED[0], BH - .02, BED[1] + .05];
const hoe = obj('hoe', 'ol_hoe', [HOE0[0], 0, HOE0[1]], { carryBy: 'farmer2', at: HOLE, show: [T.l5, T.soil6 - .45], restAt: HOE0, period: .7, chopK: [[T.hole6 - .3, 0], [T.hole6 - .1, 1], [T.fill6 - .05, 1], [T.fill6 + .1, 0]] });
const can = obj('can', 'ol_can', [CAN0[0], 0, CAN0[1]], { carryBy: 'farmer2', hand: 'R', aim: [BED[0], BH + .06, BED[1] + .02], show: [T.l6, T.wait7 + .05], restAt: CAN0,
  pourK: [[POUR[0], 0], [POUR[0] + .3, 1], [POUR[1] - .2, 1], [POUR[1], 0]] });
// R wrist target for the pour (the Farmer's own frame; he faces -z, so local -x = world +x): out over the bed's near edge
// L palm placed on the mound top 0.27 m from the hole while he kneels to fill it (his left = world -x = local +x)
const REACH6 = { hand: 'L', at: [.12, .07, .72], t: [.25, .6, 1.25, 1.45], lean: .2, drop: 0, lift: .03 };
const REACH7 = { hand: 'R', at: [-.33, .5, .3], t: [.2, .6, 1.5, 1.75], lean: .3, drop: 0, lift: .04 };
const farmer3 = obj('farmer3', 'glb', [F3[0], 0, F3[1]], { model: 'modular_men/Farmer', height: 1.75, link: 'farmer3', handoff: true, ual: ['Idle_Loop', 'Idle_Talking_Loop'] }, { rotY: F3Y });

// ---------- the plot (real models: Poly Haven ground cover and props; two older olive trees at the back of the plot) ----------
const world = [
  obj('oliveA', 'olive_tree', [-4.6, 0, 1.6], { h: 4.4, seed: 21, leafMul: 2.2, leafScale: 1.25, barkTint: '#a59f94' }), obj('oliveB', 'olive_tree', [5.2, 0, .8], { h: 4.0, seed: 33, leafMul: 2.2, leafScale: 1.25, barkTint: '#a59f94' }),
  obj('shrub', 'glb', [-6.2, 0, 4.6], { model: 'ph/shrub_01', height: .8 }), obj('rock', 'glb', [4.4, 0, 7.2], { model: 'ph/rock_07', height: .25 }),
  obj('stump', 'glb', [-4.3, 0, 6.4], { model: 'ph/tree_stump_01', height: .35 }),
  section, mud, pool, s1, chan, bed,
];

const beats = [
  // 1 hook: close on the seedling standing in brown water from the first frame; bubbles rise round the stem
  { t: 0, add: [...world], camera: { target: [S1[0], .32, S1[1]], dist: 1.35, elev: .3, az: .25, zoom: 'in' } },
  //   ... but an olive needs years to bear: the camera rises and swings round; hourglass beside the seedling
  { t: T.but1 - .2, add: [stk('hg1', 'hourglass', [S1[0] + .3, .62, S1[1]], .11, { delay: T.years1 - T.but1 + .2 })], camera: { target: [S1[0], .35, S1[1] - .05], dist: 2.0, elev: .5, az: -.4, zoom: 'out' } },
  //   ... and planted in wet ground it dies: low over the water (drop), cross on "dies"
  { t: T.if1 - .1, remove: ['hg1'], add: [stk('dr1', 'water_drop', [S1[0] - .25, .2, S1[1] - .1], .07, { delay: T.wet1 - T.if1 + .1 }), stk('x1', 'cross', [S1[0] + .2, .45, S1[1]], .09, { delay: T.die1 - T.if1 + .1 })],
    camera: { target: [S1[0], .14, S1[1] - .05], dist: 1.05, elev: .14, az: .1, zoom: 'in' } },
  // 2 drained ground: the raised dry bed, a healthy seedling on it, the ditch beside it
  { t: T.l1, remove: ['dr1', 'x1'], add: [s2], camera: { target: [BED[0] + .25, .25, BED[1] + .15], dist: 3.0, elev: .38, az: .45, zoom: 'out' } },
  //   ... the water runs away from the roots: along the running ditch (point down), then a check on the bed
  { t: T.water2 - .1, add: [stk('pt2', 'point_down', [CH[0], .3, BED[1] + .55], .1, { delay: T.down2 - T.water2 + .1 }), stk('ok2', 'check', [BED[0] - .1, BH + .95, BED[1]], .12, { delay: T.notunder2 - T.water2 + .2 })],
    camera: { target: [CH[0] - .3, .2, BED[1] + .5], dist: 1.9, elev: .3, az: .75, zoom: 'in' } },
  // 3 when the ground is soaked and the water stands: the brown pool from above (drop)
  { t: T.l2, remove: ['pt2', 'ok2'], add: [stk('dr3', 'water_drop', [POOL[0] + .35, .25, POOL[1]], .08, { delay: T.stand3 - T.l2 })], camera: { target: [POOL[0], .12, POOL[1]], dist: 1.7, elev: .55, az: -.3, zoom: 'out' } },
  //   ... the roots choke: down to the soil section, water filling the pores, bubbles; a ring round the roots
  { t: T.roots3 - .2, remove: ['dr3'], add: [stk('ring3', 'circle_ring', [S1[0], -.13, ZF + .05], .26, { delay: .4 })], camera: { target: [S1[0], -.14, ZF], dist: 1.0, elev: .06, az: 0, zoom: 'in' } },
  //   ... they start to rot unseen: the roots go dark with black lesions (cross, microbe)
  { t: T.rot3 - .2, remove: ['ring3'], add: [stk('x3', 'cross', [S1[0] + .17, -.06, ZF + .05], .07, { delay: .5 }), stk('mic3', 'microbe', [S1[0] - .15, -.2, ZF + .05], .06, { delay: .9 })],
    camera: { target: [S1[0], -.16, ZF], dist: .72, elev: .04, az: -.12, zoom: 'in' } },
  // 4 then the leaves turn yellow (eyes): close on the crown
  { t: T.l3, remove: ['x3', 'mic3', 's2'], add: [stk('eye4', 'eyes', [S1[0] + .22, .72, S1[1]], .08, { delay: T.leaf4 - T.l3 + .1 })], camera: { target: [S1[0], .5, S1[1]], dist: 1.15, elev: .22, az: .45, zoom: 'in' } },
  //   ... and the tree dies before it bears: pull back, the leaves droop (sick face)
  { t: T.tree4 - .1, remove: ['eye4'], add: [stk('sick4', 'face_sick', [S1[0] - .2, .62, S1[1]], .12, { delay: T.die4 - T.tree4 + .1 })], camera: { target: [S1[0], .38, S1[1]], dist: 1.75, elev: .38, az: -.2, zoom: 'out' } },
  // 5 wrong: low ground where water collects (the pool spreads; cross); the Farmer stands at it with the hose
  { t: T.l4, remove: ['sick4'], add: [farmer1, hose, farmer2, hoe, can, sand, stk('x5', 'cross', [POOL[0] + .45, .35, POOL[1] + .1], .1, { delay: T.water5 - T.l4 })],
    camera: { target: [-2.0, .6, 7.45], dist: 3.5, elev: .24, az: .55, zoom: 'out' } },
  //   ... or water it every day, heavily: close on the hard spray (cycle arrows)
  { t: T.hose5 - .2, remove: ['x5'], add: [stk('cy5', 'arrows_cycle', [S1[0] + .35, .6, S1[1]], .1, { delay: T.daily5 - T.hose5 + .2 })], camera: { target: [S1[0] - .35, .45, S1[1] - .2], dist: 2.4, elev: .28, az: 1.6, zoom: 'in' } },
  // 6 right: high ground (check): the bed, the Farmer standing at it with the fas, the sand heap and the can waiting
  { t: T.l5, remove: ['cy5', 'farmer1', 'hose'], add: [stk('ok6', 'check', [BED[0] - .35, .55, BED[1]], .12, { delay: T.high6 - T.l5 })], modes: { farmer2: { ual: 'Idle_Loop' } },
    camera: { target: [BED[0], .5, BED[1] + .4], dist: 3.0, elev: .25, az: 1.15, zoom: 'out' } },
  //   ... or dig a hole: he chops with the fas, clods pile on the rim (side camera, the bed between)
  { t: T.hole6 - .25, remove: ['ok6'], modes: { farmer2: { ual: 'Push_Loop' } }, camera: { target: [BED[0], .35, BED[1] + .3], dist: 2.1, elev: .32, az: 1.35, zoom: 'in' } },
  //   ... and fill it with light soil and sand: he kneels, the heap shrinks, the sandy mix fills the hole; the seedling sits on the mound (from behind the bed)
  { t: T.soil6 - .4, modes: { farmer2: { ual: 'Fixing_Kneeling', reach: REACH6 } }, add: [{ ...s2b, delay: T.sand6 - T.soil6 + .3 }], camera: { target: [BED[0] - .05, .35, BED[1] + .45], dist: 2.9, elev: .5, az: 2.55, zoom: 'in' } },
  // 7 water it moderately: he crouches and sprinkles the seedling from the can (drop)
  { t: T.l6, modes: { farmer2: { ual: 'Crouch_Idle_Loop', reach: REACH7 } }, add: [stk('dr7', 'water_drop', [BED[0] - .2, BH + .45, BED[1]], .07, { delay: T.mod7 - T.l6 })],
    camera: { target: [BED[0] + .1, .35, BED[1] + .3], dist: 2.0, elev: .25, az: 1.4, zoom: 'out' } },
  //   ... and wait for the ground to dry a little: he stands; the dark wet ring fades from above (thumbs up)
  { t: T.wait7, remove: ['dr7'], modes: { farmer2: { ual: 'Idle_Loop' } }, add: [stk('tu7', 'thumbs_up', [BED[0] + .35, BH + .5, BED[1]], .1, { delay: T.dry7 - T.wait7 + .3 })],
    camera: { target: [BED[0], .3, BED[1] + .2], dist: 2.0, elev: .75, az: 2.3, zoom: 'in' } },
  // 8 planted right it grows: close above the seedling as it grows
  { t: T.l7, remove: ['tu7'], camera: { target: [BED[0], .55, BED[1]], dist: 1.1, elev: .95, az: 2.0, zoom: 'in' } },
  //   ... (the Farmer steps to the side while the camera is tight on the leaves)
  { t: T.right8 + .1, remove: ['farmer2', 'can', 'hoe', 'sand'], add: [farmer3], modes: { farmer3: { ual: 'Idle_Loop' } }, camera: { target: [BED[0], .7, BED[1]], dist: 1.3, elev: .85, az: 2.3, zoom: 'out' } },
  //   ... and strong; years later: the mature olive on the same bed, wide (hourglass)
  { t: T.strong8 - .1, remove: ['s2b'], add: [tree, stk('hg8', 'hourglass', [BED[0] - 1.6, 2.4, BED[1] + .6], .3, { delay: T.years8 - T.strong8 + .3 })],
    camera: { target: [BED[0] - .4, 1.9, BED[1] + .4], dist: 9.5, elev: .2, az: .45, zoom: 'out' } },
  //   ... it bears olives: close on a laden branch (sparkles)
  { t: T.bear8 - .25, remove: ['hg8'], add: [stk('sp8', 'sparkles', [BED[0] + 1.1, 2.6, BED[1] + 1.2], .14, { delay: T.olives8 - T.bear8 + .25 })],
    camera: { target: [BED[0] + 1.0, 2.45, BED[1] + 1.0], dist: 2.6, elev: .05, az: .7, zoom: 'in' } },
  // 9 CTA: the Farmer turns from the tree to us and talks; thumbs up; slow pull-out arcing round
  { t: T.l8, remove: ['sp8'], modes: { farmer3: { ual: 'Idle_Talking_Loop', face: .35, faceT: .9 } }, add: [stk('tu9', 'thumbs_up', [F3[0] + .4, 1.75, F3[1] + .1], .14, { delay: T.like9 - T.l8 })],
    camera: { target: [F3[0] + .2, 1.05, F3[1]], dist: 3.0, elev: .15, az: .25, spin: -.2, zoom: 'out' } },
  { t: T.follow9, modes: { farmer3: { ual: 'Idle_Talking_Loop', face: .35 } }, camera: { target: [F3[0] + 1.0, 1.5, F3[1] - .4], dist: 6.5, elev: .22, az: .1, spin: -.15, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'شتلة الزيتون محتاجة أرض مصرفة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 8, soilTint: [1.02, .97, .88], horizon: 'nile', cover: 'low',
    haze: .45, sunElev: 50, sunAz: 25, turbidity: 2.4, water: '#7f9a8f', waves: 0, foam: false, birds: 2, motes: .3, clouds: 10,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBed: 'wind', sfxBeds: [{ cat: 'bird', idx: 0, gain: .02 }],
    sfxCalls: [{ cat: 'water', idx: 0, times: [T.hose5], dur: 1.6, gain: .03 }, { cat: 'water', idx: 0, times: [POUR[0] + .2], dur: 1.2, gain: .025 }] },
  // private frames (renderer/clearance.js): tools are held by their Farmer; the hose spray and the can sprinkle reach their plant; the
  // seedlings and the grown tree are planted in the bed. Flat ground layers (mud, pool, soil face, ditch) are not solid frames.
  checks: { clearance: { margin: .03, samples: 7, skip: ['mud', 'pool', 'section', 'chan'],
    pairs: [{ a: 'hose', b: 'farmer1', kind: 'held' }, { a: 'hose', b: 's1', kind: 'held' }, { a: 'hoe', b: 'farmer2', kind: 'held' }, { a: 'hoe', b: 'bed', kind: 'held' },
      { a: 'can', b: 'farmer2', kind: 'held' }, { a: 'can', b: 'bed', kind: 'held' }, { a: 's2', b: 'bed', kind: 'held' }, { a: 's2b', b: 'bed', kind: 'held' }, { a: 'tree', b: 'bed', kind: 'held' },
      { a: 'can', b: 's2b', kind: 'held' }, { a: 's2b', b: 'tree', kind: 'held' }],
    allow: [{ a: 'farmer2', part: 'hand', b: 'bed', beats: [14], face: 'top' }] } },
  style: { camEase: .6, captionY: .78, exposure: .95, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', kind: 'info', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
