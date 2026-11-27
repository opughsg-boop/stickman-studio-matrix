// "إزاي الطواحين البلدي القديمة كانت بتشتغل بالمية من غير كهربا؟!" (voice-over 2026-11-27, 8 lines, 39.4 s, one take).
// Real-sky island of Delta farmland: a canal (ترعة) on a raised earth bank behind a mud-brick wall with a sluice opening (فتحة) and a
// plank gate worked by a wooden lever; a wooden chute drops the water onto a 2.5 m breastshot wheel (عجلة, flat paddles ريش) in a lined
// tail race; its axle drives a pegged pit wheel, a lantern pinion and the runner millstone (حجر الرحى, ~1 m) on a mud-brick plinth, with a
// wooden hopper, feed shoe, flour spout and a jute sack. One farmer (1.75 m) works the lever, pours wheat, checks the water with a stick.
// Every spoken line is shown, never written (no digits, signs or labels):
//  1 hook: water pours from the sluice down the chute onto the turning wheel; ring on the wheel
//  2 high over the canal: the water runs fast along the bank (water drop), then close on the falling sheet hitting the paddles that are
//    pushed down (point-down on the impact); the farmer lets the lever up and the flow stops
//  3 the farmer pulls the lever handle down (both palms on it), the gate lifts, water rushes down the chute onto the paddles (check)
//  4 the wheel turns, the axle and pit wheel turn the pinion and the runner stone; he lifts a basket and pours wheat into the hopper,
//    grains trickle down the shoe, flour pours into the sack (wheat over the hopper, sparkles on the flour)
//  5 the canal level drops (a wet mud band shows), the flow thins, the wheel slows, the flour stream thins (cross on the low canal only)
//  6 he dips a stick into the chute and reads the wet mark (hourglass), then sets the lever half way (check)
//  7 day turns to moonlit night (moon, stars, cool light), the wheel keeps turning, the lantern lights the flour sacks; he walks to them
//    (eyes); day comes back on "ونهار"
//  8 CTA: he lifts a full flour sack and turns to camera; thumbs-up; slow pull-out arcing round
// Step up vs the last render (donkey_load, score 78):
//  motion   - (1) the wheel has inertia: its speed eases toward the water flow (1.1 s lag) and the runner turns 4x through a meshing pit
//             wheel and lantern pinion, so slowing and speeding read as real weight; (2) the lever rides the farmer's palms on its arc and
//             the gate rides the lever's short end (one linked mechanism, contact by construction); (3) grain streams from a tipped basket,
//             trickles down the shoe, and the flour stream and sack fill follow the runner speed (cause and effect, nothing keyed by hand)
//  graphics - (1) new mud-brick texture (courses of 30 x 10 cm sun-dried bricks, chopped straw, weathered hollows, rain streaks) and granite
//             millstone with pecked dressing and a flour-dust ring; (2) water in four linked forms: scrolling canal, chute, a falling streaked
//             sheet that wraps the wheel, tail race with churn foam, splash and flung drops; (3) a smooth day-night-day time-lapse
//             (env.nightK: sky dims and cools, moon with halo, stars, moonlight sun, warm flickering lantern with a real point light)
//  realism  - (1) real sizes: wheel 2.5 m (rims 2.0 m, paddles 0.5 x 0.33 m), axle 0.18 m, millstones 0.96-1.0 m, hopper 0.42 m, plinth
//             0.66 m, canal 1.4 m wide with 1.95 m water (0.23 m drop when low), sluice 0.5 x 0.39 m, farmer 1.75 m; (2) a real breastshot
//             layout: the chute lip clears the paddle tips by 0.1 m, the wheel dips 0.1 m in the race, nothing crosses the wall or the farmer;
//             (3) the low canal really cuts the flow (flow = gate x head over the sill), so the wheel and flour slow for a physical reason
//  sound    - water bed .03, wind bed .02 (global caps unchanged, no new levels)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => { const s = S[Math.min(i, S.length - 1)]; return i === 0 && k === 0 ? 0 : s.words[Math.min(k, s.words.length - 1)].start; };
const PI = Math.PI;
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, o.y || 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const fol = (key, field, off) => ({ follow: [key, field, off] });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  canal2: W(1, 5), fall2: W(1, 8), push2: W(1, 13), open3: W(2, 2), water3: W(2, 5), paddle3: W(2, 8), stone4: W(3, 3), grind4: W(3, 7),
  steady5: W(4, 7), low5: W(4, 10), flour5: W(4, 11), calc6: W(5, 3), open6: W(5, 5), enough6: W(5, 9), night7: W(6, 6), day7: W(6, 7), like8: W(7, 5) };

// ---------- farmer (rig person, 1.75 m): lever, basket pour, stick check, sack lift ----------
const LEV = [2.39, -1.35], BSQ = [2.75, .15], POUR = [2.62, 0], STK = [1.6, -1.35], DIP = [.72, -1.35], PICK = [2.4, 1.32];
const at = (P, y = 0) => [P[0], y, P[1]];
const trk = [
  [0, ...at(LEV), PI, 'leverDown'], [9.6, ...at(LEV), PI, 'leverDown'], [10.4, ...at(LEV), PI, 'leverUp'],                     // lets the handle up: gate shuts
  [11.9, ...at(LEV), PI, 'leverUp'], [12.8, ...at(LEV), PI, 'leverDown'], [13.8, ...at(LEV), PI, 'leverDown'], [14.15, ...at(LEV), PI, 'stand'],
  [15.2, 3.05, 0, -.7, null, 'stand', 'walk'], [15.9, ...at(BSQ), 0, 'stand', 'walk'], [16.4, ...at(BSQ, -.55), 0, 'squatReach'], [16.6, ...at(BSQ, -.55), 0, 'squatReach'],
  [17.2, ...at(BSQ), 0, 'carry'], [17.9, ...at(POUR), -PI / 2, 'carry', 'walk'], [18.4, ...at(POUR), -PI / 2, 'pourHigh'], [20.5, ...at(POUR), -PI / 2, 'pourHigh'],
  [20.9, ...at(POUR), -PI / 2, 'carry'], [21.3, ...at(BSQ), 0, 'carry', 'walk'], [21.7, ...at(BSQ, -.55), 0, 'squatReach'], [21.85, ...at(BSQ, -.55), 0, 'squatReach'], [22.3, ...at(BSQ), 0, 'stand'],
  [23.1, 2.45, 0, -1.3, null, 'stand', 'walk'], [23.8, ...at(STK), PI, 'stand', 'walk'], [24.1, ...at(STK), PI, 'barkTouch'], [24.4, ...at(STK), PI, 'barkTouch'],
  [25.3, ...at(DIP), -PI / 2, 'stand', 'walk'], [26.45, ...at(DIP), -PI / 2, 'stand'], [26.85, ...at(DIP), -PI / 2, 'stickDip'], [27.75, ...at(DIP), -PI / 2, 'stickDip'],
  [28.05, ...at(DIP), -PI / 2, 'stand'], [28.6, ...at(STK), PI, 'barkTouch', 'walk'], [28.8, ...at(STK), PI, 'barkTouch'], [29.3, ...at(LEV), PI, 'leverDown', 'walk'],
  [29.5, ...at(LEV), PI, 'leverDown'], [30.1, ...at(LEV), PI, 'leverMid'], [30.5, ...at(LEV), PI, 'leverMid'], [30.8, ...at(LEV), PI, 'stand'],
  [31.7, 3.2, 0, -.7, null, 'stand', 'walk'], [33.2, 3.2, 0, 1.25, null, 'stand', 'walk'], [33.85, ...at(PICK), PI, 'stand', 'walk'],
  [34.3, ...at(PICK, -.55), PI, 'squatReach'], [34.55, ...at(PICK, -.55), PI, 'squatReach'], [35.1, ...at(PICK), PI, 'carry'], [35.7, ...at(PICK), 0, 'carry'], [D + 1, ...at(PICK), 0, 'carry']];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 4, track: trk } };

// ---------- the mill (one linked asset; keys are absolute times) ----------
const nightK = [[30.0, 0], [31.0, 1], [33.3, 1], [34.4, 0]];
const mill = { id: 'mill', type: 'water_mill', pos: [0, 0, 0], anim: 'none', dust: false, params: { seed: 5, carryBy: 'farmer', leverBy: 'farmer', nightK,
  openK: [[0, 1], [9.75, 1], [10.4, 0], [12.0, 0], [12.8, 1], [29.55, 1], [30.1, .55]],
  grabK: [[0, 1], [13.85, 1], [13.95, 0], [29.4, 0], [29.5, 1], [30.5, 1], [30.6, 0]],
  levelK: [[0, 1], [21.4, 1], [23.9, 0], [27.6, 0], [30.6, 1]],
  grainK: [[0, 0], [19.0, 0], [20.4, .9], [26, .7], [39, .45]], pourK: [[0, 0], [18.55, 0], [18.95, 1], [20.25, 1], [20.6, 0]], basketGrain: [[0, 1], [18.9, 1], [20.3, 0]],
  basket: [[0, [BSQ[0], BSQ[1] + .4, 0]], [16.5, 'H', .35], [21.75, [BSQ[0], BSQ[1] + .4, 0], .35]],
  sackB: [[0, [PICK[0], PICK[1] - .42, PI]], [34.45, 'H', .35]],
  stick: [[0, [1.55, -1.82]], [24.25, 'R', .4], [28.7, [1.55, -1.82], .4]], dipK: [[0, 0], [26.9, 0], [27.25, 1], [27.6, 1], [27.95, 0]], wetK: [[0, 0], [27.1, 0], [27.4, 1]],
  stickAim: [.05, 1.66, -1.58], lampK: [[30.0, 0], [30.8, 1], [33.6, 1], [34.6, 0]] } };

// ---------- world: shade tree, far palms, shrubs and weeds on the banks ----------
const world = [glb('tree', 'ph/island_tree_01', -5.6, 1.2, 5, { rotY: .6, params: { sway: .006 } })];
[[-11.5, -9.2, 8.5, 1], [10.8, -9.0, 9, 3]].forEach(([x, z, h, k], i) => world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.6, -.9, .8, 'ph/shrub_02'], [4.8, -.6, .8, 'ph/shrub_01'], [-2.6, 3.4, .35, 'ph/rock_07'], [4.2, 2.6, .6, 'ph/shrub_03'], [-1.2, 4.6, .3, 'ph/weed_plant_02'], [1.15, 6.2, .32, 'ph/weed_plant_02'],
 [-3.6, -4.2, .5, 'ph/shrub_01', 2.15], [3.9, -4.25, .45, 'ph/shrub_02', 2.15]].forEach(([x, z, h, m, y], i) =>
  world.push(glb('bush' + i, m, x, z, h, { y, rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

// ---------- beats (one camera move each, continuous); wheel-face shots from -x (the wheel turns in the y-z plane) ----------
const beats = [
  // 1 hook: water pours from the sluice down the chute onto the turning wheel; ring on the wheel
  { t: 0, kind: 'info', add: [farmer, mill, ...world, stk('ring1', 'circle_ring', [0, 1.45, 0], 1.7, { delay: .35 })],
    camera: { target: [.1, 1.45, -.4], dist: 6.4, elev: .14, az: -1.0, zoom: 'in' } },
  //   ... push in toward the sluice and the chute
  { t: 2.1, kind: 'info', camera: { target: [0, 1.55, -1.0], dist: 5.0, elev: .2, az: -.75, zoom: 'in' } },
  // 2 high over the canal: the water runs fast along the bank (water drop)
  { t: T.l1, kind: 'info', remove: ['ring1'], add: [stk('drop2', 'water_drop', [-.9, 2.55, -3.2], .28, { delay: T.canal2 - T.l1 })],
    camera: { target: [-.2, 1.9, -2.7], dist: 5.4, elev: .5, az: -.45, zoom: 'out' } },
  //   ... close on the falling sheet hitting the paddles (point-down on the impact)
  { t: T.fall2 - .2, kind: 'info', remove: ['drop2'], add: [stk('pt2', 'point_down', [0, 0, 0], .2, { delay: T.push2 - T.fall2 + .2, ...fol('mill', 'impact', [0, .38, 0]) })],
    camera: { target: [0, 1.35, -.7], dist: 2.9, elev: .1, az: -1.2, zoom: 'in' } },
  // 3 the farmer pulls the lever handle down, the gate lifts, water rushes onto the paddles (check)
  { t: T.l2, kind: 'info', remove: ['pt2'], camera: { target: [1.25, 1.55, -1.6], dist: 4.2, elev: .12, az: .95, zoom: 'out' } },
  { t: T.water3 - .1, kind: 'info', add: [stk('ok3', 'check', [0, 0, 0], .2, { delay: .5, ...fol('mill', 'gate', [0, .5, .15]) })],
    camera: { target: [.3, 1.5, -1.2], dist: 4.6, elev: .14, az: -.9, zoom: 'in' } },
  // 4 the wheel turns, the axle turns the pit wheel, the pinion and the runner stone
  { t: T.l3, kind: 'info', remove: ['ok3'], camera: { target: [1.1, 1.15, 0], dist: 3.6, elev: .2, az: .55, zoom: 'in' } },
  //   ... wheat poured into the hopper (wheat), grinding, flour into the sack (sparkles)
  { t: T.stone4 + .7, kind: 'info', add: [stk('wheat4', 'wheat', [0, 0, 0], .22, { delay: 18.9 - T.stone4 - .7, ...fol('mill', 'hopper', [0, .42, 0]) }),
      stk('spk4', 'sparkles', [0, 0, 0], .2, { delay: T.grind4 - T.stone4 - .5, ...fol('mill', 'sackA', [0, .25, 0]) })],
    camera: { target: [1.75, 1.0, .3], dist: 3.4, elev: .18, az: .9, zoom: 'out' } },
  // 5 the canal level drops (wet band), the wheel slows; cross on the low canal (this beat only)
  { t: T.l4, kind: 'info', remove: ['wheat4', 'spk4'], add: [stk('x5', 'cross', [0, 0, 0], .3, { delay: T.low5 - T.l4 + .1, pulse: true, ...fol('mill', 'canal', [-.6, .4, .3]) })],
    camera: { target: [-.4, 1.7, -2.4], dist: 5.6, elev: .38, az: -.6, zoom: 'out' } },
  //   ... the flour stream thins into the sack
  { t: T.flour5 - .2, kind: 'info', remove: ['x5'], camera: { target: [1.4, .65, .8], dist: 2.4, elev: .16, az: .35, zoom: 'in' } },
  // 6 he dips a stick into the chute and reads the wet mark (hourglass)
  { t: T.l5, kind: 'info', add: [stk('hg6', 'hourglass', [0, 0, 0], .2, { delay: T.calc6 - T.l5 + .3, ...fol('farmer', 'beak', [0, .45, 0]) })],
    camera: { target: [.35, 1.6, -1.45], dist: 2.8, elev: .12, az: .15, zoom: 'in' } },
  //   ... sets the lever half way (check)
  { t: T.enough6 - .55, kind: 'info', remove: ['hg6'], add: [stk('ok6', 'check', [0, 0, 0], .18, { delay: .7, ...fol('mill', 'handle', [0, .35, 0]) })],
    camera: { target: [1.6, 1.45, -1.5], dist: 3.6, elev: .14, az: 1.0, zoom: 'out' } },
  // 7 moonlit night: the wheel keeps turning, the lantern lights the sacks (eyes); day returns on "ونهار"
  { t: T.l6, kind: 'info', remove: ['ok6'], add: [stk('eyes7', 'eyes', [0, 0, 0], .24, { delay: .9, ...fol('mill', 'wheel', [0, .45, 0]) })],
    camera: { target: [.6, 1.4, -.2], dist: 7.0, elev: .16, az: -.85, zoom: 'out' } },
  { t: T.night7 - .4, kind: 'info', remove: ['eyes7'], camera: { target: [2.1, .9, .8], dist: 3.8, elev: .16, az: 1.3, zoom: 'in' } },
  // 8 CTA: he lifts the full flour sack and turns to camera; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', add: [stk('thumb8', 'thumbs_up', [0, 0, 0], .3, { delay: T.like8 - T.l7 - .1, ...fol('farmer', 'beak', [-.35, .4, 0]) })],
    camera: { target: [1.6, 1.1, .6], dist: 5.4, elev: .15, az: .25, spin: -.55, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي الطواحين البلدي القديمة كانت بتشتغل بالمية',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 26, d: 20, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 8, soilTint: [1.0, .95, .88], horizon: 'nile', cover: false,
    haze: .4, sunElev: 42, sunAz: 25, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 1, motes: .3, clouds: 16, nightK,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBeds: [{ cat: 'water', idx: 0, gain: .03, fade: 1.5 }, { cat: 'wind', idx: 0, gain: .02, fade: 1.5 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
