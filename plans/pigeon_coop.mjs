// "لو اشتريت حمامة... الحمامة محتاجة بيت كبير" (voice-over 2026-11-27, 10 lines, 58.1 s, one take). The same sunny flat Egyptian rooftop as
// pigeon_drink (concrete slab, parapet, stair-head, dishes, laundry, Cairo skyline). The hero is the procedural blue-bar pigeon (33 cm,
// renderer `pigeon`). New props (renderer/scene.js "Pigeon coop pack"): `card_box` (40 x 30 x 30 cm carton that soaks and gets pecked),
// `pg_coop` (the 1.2 x 0.6 m pine loft on brick piers, 1.11 m to the roof, with louvre vents, ridge vent, airflow wisps, a plywood shutter,
// stale-air haze, a nest bowl with eggs and squabs, a perch, a water dish, a feed trough, droppings and a front drinker), `pg_litter`,
// `pg_broom` and `pg_jug` carried by the UAL Farmer (palms published in LINK). No words on screen; every line shows its object or action:
//  1 hook: the pigeon stands inside a cardboard box on the roof with a little heap of feed; camera close on the box; it pecks the feed
//  2 a big place, not a box: wide shot, the big loft beside the small box (point down on the loft); then the box from above (ring)
//  3 the box is wrong: cross; it soaks (dark wet kraft, mould spots, flaps sag); the pigeon pecks holes in it; microbes on the wet wall
//  4 the right place: the loft (check); airflow wisps in through the side louvres and out of the ridge (point down / point left); raised on piers (arrow up)
//  5 closed: a plywood board slides down, louvres shut, airflow stops (cross); stale haze and stink lines; the pigeon droops (eyes, sick face)
//  6 what it needs: camera slides in through the mesh: nest with eggs (point down), the pigeon hops onto the perch, water dish (drop), feed trough (wheat)
//  7 wrong: a pigeon on the bare slab under a hot sun with heat shimmer (cross); a cat stalks in from the parapet (thumbs down)
//  8 right: the Farmer sweeps the slab (litter goes), then crouches and pours fresh water into the drinker; check on the clean loft
//  9 the pigeon settles on its eggs in the nest (face love); then two downy squabs in the nest (sparkles)
// 10 CTA: the loft door swings open, the pigeon steps to the doorway and coos at us; thumbs-up; slow pull-out arcing round
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI;
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
// tracks are written in world metres; walkers get their holder at the first key so a removal shrinks them in place (not toward the origin)
const loc = (track, x0, z0) => track.map(k => [k[0], k[1] - x0, k[2] - z0, ...k.slice(3)]);
const obj = (id, type, pos, params, o = {}) => ({ id, type, pos, params, anim: o.anim || 'none', dust: false, delay: o.delay || 0, ...(o.rotY != null ? { rotY: o.rotY } : {}) });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7), l8: W(8), l9: W(9),
  food1: W(0, 6), paper1: W(0, 10), house2: W(1, 6), box2: W(1, 8), wrong3: W(2, 1), wet3: W(2, 3), eaten3: W(2, 4), mic3: W(2, 7),
  right4: W(3, 2), vent4: W(3, 4), top4: W(3, 6), side4: W(3, 8), raised4: W(3, 9), shut5: W(4, 2), air5: W(4, 3), smell5: W(4, 6), tired5: W(4, 9),
  egg6: W(5, 5), perch6: W(5, 6), stand6: W(5, 7), water6: W(5, 9), food6: W(5, 11), sun7: W(6, 4), cats7: W(6, 11), cat7: W(6, 15),
  clean8: W(7, 2), water8: W(7, 6), calm8: W(7, 10), home9: W(8, 4), lay9: W(8, 6), chicks9: W(8, 8), like10: W(9, 4) };

// ---------- layout (metres). Roof slab = island top (y 0), front parapet at z 4; camera side +z. The loft stands at the origin facing +z ----------
const PGC = { L: 1.2, D: .6, H: .9, PH: .21, FLOOR: .288 };      // pigeon_cage dimensions (renderer PGC)
const F = PGC.FLOOR;
const BX = 1.2, BZ = 1.0;                                         // the carton (40 x 30 x 30 cm), front-right of the loft
const NEST = [-.32, -.06], PERCH = [.32, -.17, .652], DISH = [.02, .12], TROUGH = [.32, .13];
const DRINK = [-.3, .44, .345];                                   // galvanised drinker hung on the front mesh, left of the door
const FX = -.3, FZ = 1.7;                                         // the Farmer's spot (faces the loft, -z; broom head 1.1 m ahead stays 0.2 m off the loft)
const BAS = [.38, 1.4];                                           // the pigeons' galvanised water tray on the slab, to his right-front
const P8 = W(7, 6) - .1, Q8 = P8 + 1.86;                          // pour beat start; the calm wide beat starts at Q8

// hero pigeon in the box (lines 1-3): stands, pecks the feed, then pecks holes in the right wall
const p1 = { id: 'p1', type: 'pigeon', pos: [BX, 0, BZ], anim: 'none', dust: false, params: { len: .33, seed: 1, link: 'p1', track: loc([
  [0, BX - .04, BZ - .02, 'idle', .75, .005], [T.food1 + .2, BX - .04, BZ - .02, 'idle', .75, .005], [T.food1 + .5, BX - .04, BZ - .02, 'peck', .75, .005],
  [T.l2 - .6, BX - .04, BZ - .02, 'peck', .75, .005], [T.l2 - .2, BX - .04, BZ - .02, 'idle', .75, .005],
  [T.eaten3 - .5, BX - .04, BZ - .02, 'idle', .75, .005], [T.eaten3 + .1, BX - .01, BZ, 'idle', PI / 2, .005], [T.eaten3 + .3, BX - .01, BZ, 'peck', PI / 2, .005],
  [T.mic3 + .4, BX - .01, BZ, 'peck', PI / 2, .005], [T.mic3 + .8, BX - .01, BZ, 'idle', PI / 2, .005], [D + 1, BX - .01, BZ, 'idle', PI / 2, .005]], BX, BZ) } };
const box = obj('box', 'card_box', [BX, 0, BZ], { w: .4, d: .3, h: .3, feed: [.12, .07, .04], wetK: [[T.wet3 - .1, 0], [T.wet3 + 1.2, 1]], chewK: [[T.eaten3 + .7, 0], [T.eaten3 + .75, 1]] });

// the loft pigeon (lines 4-10)
const tp = [[T.l3 - .5, -.05, .02, 'idle', .3, F], [T.right4 + .3, -.05, .02, 'idle', .3, F], [T.vent4 + 1.2, .12, .06, 'idle', .9, F], [T.vent4 + 1.6, .12, .06, 'peck', .9, F],
  [T.l4, .12, .06, 'idle', -.4, F], [T.tired5 - .2, .1, .08, 'idle', -.2, F], [T.tired5 + .2, .1, .08, 'tired', -.2, F], [T.l5 - .2, .1, .08, 'tired', -.2, F], [T.l5 + .4, .1, .08, 'idle', -.2, F],
  [T.egg6 + .2, .1, .08, 'idle', -.6, F], [T.perch6 + .4, .3, -.05, 'idle', 0, F], [T.stand6 + .1, PERCH[0], PERCH[1], 'idle', 0, PERCH[2]], [T.water6 + .6, PERCH[0], PERCH[1], 'idle', .3, PERCH[2]],
  [T.food6 + .1, PERCH[0], PERCH[1], 'idle', 0, PERCH[2]], [T.food6 + .6, TROUGH[0], -.02, 'idle', 0, F], [T.food6 + .9, TROUGH[0], -.02, 'peck', 0, F],
  [T.l8 - .2, TROUGH[0], -.02, 'peck', 0, F], [T.l8 + .1, TROUGH[0], -.02, 'idle', -PI / 2, F], [T.home9 - .5, -.16, -.02, 'idle', -PI / 2, F],
  [T.home9 - .05, NEST[0], NEST[1], 'idle', -PI / 2, F + .035], [T.home9 + .4, NEST[0], NEST[1], 'sit', -.3, F + .035], [T.lay9 + .1, NEST[0], NEST[1], 'sit', -.3, F + .035],
  [T.lay9 + .4, NEST[0], NEST[1], 'idle', .6, F + .035], [T.chicks9 - .1, -.13, .06, 'idle', -1.9, F], [T.l9 - .3, -.13, .06, 'idle', -1.9, F],
  [T.l9 + 1.4, .29, .17, 'idle', 0, F], [T.l9 + 2.0, .29, .17, 'coo', 0, F], [D + 1, .29, .17, 'coo', 0, F]];
const p2 = { id: 'p2', type: 'pigeon', pos: [0, 0, 0], anim: 'none', dust: false, params: { len: .33, seed: 3, link: 'p2', track: tp } };

const coop = obj('coop', 'pg_coop', [0, 0, 0], { link: 'coop', nest: NEST, dish: DISH, trough: TROUGH, drinker: DRINK,
  airK: [[T.vent4 - .2, 0], [T.vent4 + .4, 1], [T.air5 + .3, 1], [T.air5 + .9, 0]],
  shutK: [[T.shut5 - .3, 0], [T.shut5 + .5, 1], [T.l5 - .3, 1], [T.l5 + .4, 0]],
  smellK: [[T.smell5 - .3, 0], [T.smell5 + .6, 1], [T.l5 - .2, 1], [T.l5 + .5, 0]],
  eggsK: [[0, 2]], chicksK: [[T.chicks9 - .45, 0], [T.chicks9 - .4, 2]],
  dirtK: [[0, 1], [T.water8, 1], [T.water8 + .1, 0]],
  openK: [[T.l9 + .2, 0], [T.l9 + 1.2, 1]] });
const litter = obj('litter', 'pg_litter', [0, 0, 0], { area: [-.75, .65, .5, 1.35], cleanK: [[T.clean8 + .2, 0], [T.water8 - .4, 1]] });

// the Farmer (line 8): UAL clips on the modular Farmer, standing in front of the loft facing it; palms published for the broom and the jug
const farmer = obj('farmer', 'glb', [FX, 0, FZ], { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', handoff: true, ual: ['Idle_Loop', 'Push_Loop', 'Crouch_Idle_Loop'] }, { rotY: PI });
const broom = obj('broom', 'pg_broom', [0, 0, 0], { carryBy: 'farmer', show: [T.l7 - .05, P8], fwd: 1.1, stroke: .15, period: 1.15, sweepK: [[T.l7, 0], [T.l7 + .4, 1]] });
const jug = obj('jug', 'pg_jug', [0, 0, 0], { carryBy: 'farmer', hand: 'R', target: 'basin', aim: [-.08, 0], show: [P8, T.l8], pourK: [[P8 + .6, 0], [P8 + .85, 1], [P8 + 1.3, 1], [P8 + 1.5, 0]] });
// the water tray (pigeon_drink's galvanised basin, 45 x 30 cm): old low water, refilled by the pour
const basin = obj('basin', 'pigeon_basin', [BAS[0], 0, BAS[1]], { len: .45, w: .3, h: .075, link: 'basin', levelK: [[0, .018], [P8 + .85, .018], [P8 + 1.45, .056]] });
// R wrist target for the pour, in the Farmer's own frame (he faces -z: his right is world +x = local -x): out over the tray's near edge
const REACH8 = { hand: 'R', at: [-.33, .5, .3], t: [.2, .6, 1.4, 1.75], lean: .3, drop: 0, lift: .04 };

// line 7: a second pigeon left on the bare slab in the midday sun; a tabby cat stalks in along the parapet
const S7 = [-1.7, 2.3];
const p3 = { id: 'p3', type: 'pigeon', pos: [S7[0], 0, S7[1]], anim: 'none', dust: false, params: { len: .33, seed: 7, link: 'p3', track: loc([
  [T.l6 - .3, S7[0], S7[1], 'tired', .9, 0], [T.cats7 + .4, S7[0], S7[1], 'tired', .9, 0], [T.cat7, S7[0], S7[1], 'idle', -.9, 0], [T.cat7 + .8, S7[0] + .25, S7[1] - .1, 'idle', 1.2, 0], [D + 1, S7[0] + .25, S7[1] - .1, 'idle', 1.2, 0]], S7[0], S7[1]) } };
const cat = { id: 'cat', type: 'tank_cat', pos: [-2.72, 0, 2.73], anim: 'none', dust: false, params: { link: 'cat', track: loc([
  [T.l6, -3.9, 3.3, 'stand', 2.2, 0], [T.cats7 - .5, -3.9, 3.3, 'stand', 2.2, 0], [T.cat7 + .3, -2.75, 2.75, 'walk', null, 0], [T.cat7 + .6, -2.72, 2.73, 'crouch', 2.0, 0], [D + 1, -2.72, 2.73, 'crouch', 2.0, 0]], -2.72, 2.73) } };
const sun = obj('sun', 'sun_glow', [0, 0, 0], { size: 1.6, showK: [[T.l6 - .1, 0], [T.l6 + .7, 1], [T.l7 - .4, 1], [T.l7, 0]], posK: [[0, -4.6, 1.9, 1.2]] });
const haze = obj('haze', 'heat_haze', [S7[0], 0, S7[1]], { w: 2.2, d: 1.6, count: 10, opacity: .16 });

// ---------- the roof world (pigeon_drink's roof; its own pigeon cage is left out: the loft is the hero here) ----------
const world = [
  obj('roof', 'rooftop', [0, 0, 0], { w: 10, d: 8, depth: 3.8, facade: '#d8c3a0', slabTint: '#b3aa9c', stair: { x: 3.2, z: -2.4, w: 2.4, d: 2.6, h: 2.5 }, dishes: [[-.9, -3.45, .2, .8], [1.3, -3.5, -.2, .7]], laundry: [[-4.3, -3.1, 2.8, 0, 3]] }),
  obj('nroof', 'rooftop', [10.3, .3, -1], { w: 8, d: 10, depth: 4.1, front: 'full', facade: 'brick', stair: { x: 2, z: -3.2, w: 2.2, d: 2.4, h: 2.4, color: '#e2cf9e', door: '#7a5a3a', tank: false }, tanks: [[-1.4, 0, -2.7, '#2c2c2c']], dishes: [[-.5, -4.4, 0, .8]] }),
  obj('city', 'city', [0, 0, 0], { ground: -3.8, count: 40, r0: 15, r1: 75, avoid: [[-7, 7, -6, 6], [5, 16, -8, 6], [12, 32, -9, 7]] }),
  coop, litter,
];

const beats = [
  // 1 hook: close on the carton from the first frame, the pigeon inside it, the feed heap by its feet
  { t: 0, add: [...world, box, p1], camera: { target: [BX, .14, BZ], dist: 1.6, elev: .78, az: .3, zoom: 'in' } },
  //   ... "a pigeon on paper": the camera eases round to the front as it pecks the feed
  { t: T.paper1 - .2, camera: { target: [BX + .02, .14, BZ], dist: 1.85, elev: .6, az: -.25, zoom: 'out' } },
  // 2 a big place to be its home: wide, the big loft beside the small box; point down on the loft
  { t: T.l1, add: [stk('pt2', 'point_down', [0, 1.42, .1], .2, { delay: T.house2 - T.l1 })], camera: { target: [.5, .55, .45], dist: 4.0, elev: .2, az: .55, zoom: 'out' } },
  //   ... not just a box: the box from above, a ring round it
  { t: T.box2 - .2, remove: ['pt2'], add: [stk('ring2', 'circle_ring', [BX, .32, BZ], .34, { delay: .3 })], camera: { target: [BX, .12, BZ], dist: 1.25, elev: .95, az: .3, zoom: 'in' } },
  // 3 the box is wrong (cross); it soaks: dark wet kraft, flaps sag, a damp ring spreads (water drop)
  { t: T.l2, remove: ['ring2'], add: [stk('x3', 'cross', [BX - .12, .42, BZ + .05], .1, { delay: T.wrong3 - T.l2 }), stk('dr3', 'water_drop', [BX + .1, .4, BZ + .1], .08, { delay: T.wet3 - T.l2 })],
    camera: { target: [BX, .15, BZ + .05], dist: 1.6, elev: .5, az: .1, zoom: 'out' } },
  //   ... the pigeons peck it apart: from the right side, the pigeon pecks holes in the right wall
  { t: T.eaten3 - .2, remove: ['x3', 'dr3'], camera: { target: [BX + .12, .15, BZ], dist: 1.3, elev: .42, az: 1.3, zoom: 'in' } },
  //   ... microbes live inside: microbe stickers over the wet, spotted front wall
  { t: T.mic3 - .2, add: [stk('m3a', 'microbe', [BX - .1, .12, BZ + .17], .06, { delay: .3 }), stk('m3b', 'microbe', [BX + .08, .2, BZ + .17], .05, { delay: .6 }), stk('m3c', 'microbe', [BX + .02, .07, BZ + .18], .045, { delay: .9 })],
    camera: { target: [BX, .15, BZ + .08], dist: 1.15, elev: .3, az: -.25, zoom: 'in' } },
  // 4 the right big place: the loft (check), the loft pigeon walking inside
  { t: T.l3, remove: ['m3a', 'm3b', 'm3c', 'box', 'p1'], add: [p2, stk('ok4', 'check', [.45, 1.38, .2], .16, { delay: T.right4 - T.l3 })],
    camera: { target: [0, .65, .1], dist: 3.0, elev: .2, az: -.35, zoom: 'out' } },
  //   ... ventilation from above and the side: airflow wisps; point down at the ridge, point left at the side louvre
  { t: T.vent4 - .2, remove: ['ok4'], add: [stk('pt4a', 'point_down', [0, 1.45, -.05], .13, { delay: T.top4 - T.vent4 + .2 }), stk('pt4b', 'point_left', [.92, .9, -.02], .13, { delay: T.side4 - T.vent4 + .2 })],
    camera: { target: [.15, .8, 0], dist: 2.7, elev: .28, az: .75, zoom: 'in' } },
  //   ... raised off the ground: low at the brick piers, arrow up under the floor
  { t: T.raised4 - .1, remove: ['pt4a', 'pt4b'], add: [stk('up4', 'arrow_up', [-.1, .13, .42], .1, { delay: .3, pulse: true })], camera: { target: [0, .3, .2], dist: 1.9, elev: .1, az: -.2, zoom: 'out' } },
  // 5 if it is shut and no air comes in: the board slides down, the louvres close, the wisps stop (cross)
  { t: T.l4, remove: ['up4'], add: [stk('x5', 'cross', [.85, .95, .1], .12, { delay: T.air5 - T.l4 + .4 })], camera: { target: [0, .7, .1], dist: 2.6, elev: .18, az: .45, zoom: 'in' } },
  //   ... the smell stays inside and the pigeon tires: close through the lower mesh, stale haze, the pigeon droops (eyes, sick face)
  { t: T.tired5 - .3, remove: ['x5'], add: [stk('eye5', 'eyes', [.1, .62, .36], .08, { delay: .5 }), stk('sick5', 'face_sick', [-.15, .62, .36], .08, { delay: 1.0 })],
    camera: { target: [.08, .42, .1], dist: 1.25, elev: .12, az: -.15, zoom: 'in' } },
  // 6 a loft with a place for eggs: the board lifts, the camera slides in through the mesh to the nest and its two eggs (point down)
  { t: T.l5, remove: ['eye5', 'sick5'], add: [stk('pt6', 'point_down', [NEST[0], F + .2, NEST[1]], .06, { delay: T.egg6 - T.l5 })], camera: { target: [NEST[0] + .05, F + .05, NEST[1]], dist: .36, elev: .3, az: .25, zoom: 'in' } },
  //   ... something to stand on: the pigeon hops up onto the perch
  { t: T.perch6 - .1, remove: ['pt6'], camera: { target: [PERCH[0] - .05, PERCH[2] - .08, PERCH[1]], dist: 1.0, elev: .1, az: -.3, zoom: 'out' } },
  //   ... clean water and food every day: dish (drop) and trough (wheat); the pigeon hops down to eat
  { t: T.water6 - .1, add: [stk('dr6', 'water_drop', [DISH[0], F + .14, DISH[1]], .05, { delay: .3 }), stk('wh6', 'wheat', [TROUGH[0], F + .15, TROUGH[1]], .05, { delay: T.food6 - T.water6 + .1 })],
    camera: { target: [.17, F + .05, .1], dist: .78, elev: .32, az: .1, zoom: 'in' } },
  // 7 wrong: left in the sun all day with no shade (cross); a pigeon on the bare slab, sun and shimmer
  { t: T.l6, remove: ['dr6', 'wh6'], add: [p3, sun, haze, cat, farmer, basin, stk('x7', 'cross', [S7[0] - .1, .48, S7[1] + .05], .1, { delay: T.sun7 - T.l6 + .3 })],
    camera: { target: [S7[0] - .15, .25, S7[1] + .05], dist: 1.5, elev: .16, az: 1.15, zoom: 'out' } },
  //   ... or where there are cats or rats: the cat stalks in (thumbs down)
  { t: T.cats7 - .2, remove: ['x7'], add: [stk('td7', 'thumbs_down', [-2.4, .6, 2.75], .16, { delay: T.cat7 - T.cats7 + .3 })], camera: { target: [-2.2, .25, 2.55], dist: 2.4, elev: .16, az: 1.0, zoom: 'in' } },
  // 8 right: sweep the place every week: the Farmer sweeps the slab, the litter goes (side camera: his side, not his back)
  { t: T.l7, remove: ['td7', 'p3', 'sun', 'haze', 'cat'], add: [broom, jug], modes: { farmer: { ual: 'Push_Loop' } }, camera: { target: [FX, .6, FZ - .45], dist: 3.6, elev: .2, az: 1.2, zoom: 'out' } },
  //   ... change the water every day: he crouches and pours fresh water into the drinker
  { t: P8, modes: { farmer: { ual: 'Crouch_Idle_Loop', reach: REACH8 } }, camera: { target: [BAS[0] - .15, .3, BAS[1] - .05], dist: 1.6, elev: .2, az: 1.3, zoom: 'in' } },
  //   ... and keep the place calm: the clean loft (check)
  { t: Q8, modes: { farmer: { ual: 'Crouch_Idle_Loop' } }, add: [stk('ok8', 'check', [.45, 1.38, .2], .15, { delay: .4 })], camera: { target: [0, .65, .3], dist: 3.2, elev: .22, az: .4, zoom: 'out' } },
  // 9 once it knows its home it lays: the pigeon settles on its eggs in the nest (face love)
  { t: T.l8, remove: ['ok8', 'farmer', 'broom', 'jug', 'basin'], add: [stk('love9', 'face_love', [NEST[0] + .02, F + .3, NEST[1]], .06, { delay: T.home9 - T.l8 + .3 })],
    camera: { target: [NEST[0] + .02, F + .1, NEST[1]], dist: .9, elev: .25, az: .35, zoom: 'in' } },
  //   ... and raises squabs: two downy chicks in the nest (sparkles)
  { t: T.lay9 - .1, remove: ['love9'], add: [stk('sp9', 'sparkles', [NEST[0], F + .17, NEST[1]], .06, { delay: T.chicks9 - T.lay9 })], camera: { target: [NEST[0] + .04, F + .06, NEST[1]], dist: .62, elev: .42, az: .15, zoom: 'in' } },
  // 10 CTA: the door swings open, the pigeon steps to the doorway and coos at us; thumbs-up; slow pull-out arcing round
  { t: T.l9, remove: ['sp9'], add: [stk('tu10', 'thumbs_up', [.0, F + .42, .36], .09, { delay: T.like10 - T.l9 })], camera: { target: [.2, F + .15, .3], dist: 1.25, elev: .15, az: -.25, spin: -.3, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'الحمامة محتاجة بيت كبير',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 10, d: 8, depth: 3.2 }, flatTop: true, cover: false, horizon: 'nile', water: '#a99f8c', waves: 0, foam: false, birds: 2, motes: .3, haze: .5,
    sunElev: 55, sunAz: 25, turbidity: 2.2, clouds: 8,
    sfxBed: 'wind', sfxBeds: [{ cat: 'bird', idx: 0, gain: .02 }], sfxCalls: [{ cat: 'water', idx: 0, times: [T.water8 + .9], dur: 1.6, gain: .03 }] },
  // private frames (renderer/clearance.js): the birds may only be INSIDE their box / loft; the broom and the jug are held by the Farmer;
  // the jug's water stream enters the drinker while he pours. World pieces (roof, city) and the flat floor litter are not solid frames.
  checks: { clearance: { margin: .03, samples: 7, skip: ['roof', 'nroof', 'city', 'litter', 'sun', 'haze'],
    pairs: [{ a: 'p1', b: 'box', kind: 'inside' }, { a: 'p2', b: 'coop', kind: 'inside' }, { a: 'broom', b: 'farmer', kind: 'held' }, { a: 'jug', b: 'farmer', kind: 'held' },
      { a: 'jug', b: 'basin', kind: 'held' }] } },
  style: { camEase: .6, captionY: .78, exposure: .8, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', kind: 'info', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
