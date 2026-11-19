// "ليه الغنم بتلف في دايرة قبل ما تنام؟!" (voice-over 2026-11-19, 11 lines, 56.3 s, one take). Diorama on the real-sky island: an Egyptian
// village sheep pen (timber posts and rails, a hinged gate on the right, the camera side left open), meadow grass inside, a dry straw
// bed back-left, a concrete trough with a wet mud patch in front of it, a straw patch back-right, palms and shrubs around, evening sun.
// Every spoken line is shown by objects and actions, never by words:
//  1 the hero sheep turns a circle on a tuft of tall grass (circle ring around her)
//  2 she stands with her head high and scans the pen (eyes), then sniffs the ground and dips her front knees toward it (arrow down)
//  3 the flock of four watches her turn a full circle while the camera orbits (thinking face)
//  4 she turns once more (cycle arrows), then stamps her fore hoof and the grass lies down flat in a swirl (check)
//  5 she sniffs the ground (magnifier) and finds a twig and a small stone by her bed (point down on the twig)
//  6 the farmer walks in from the right in the evening light and leans his forearms on the gate rail, watching (eyes)
//  7 one sheep circles again and again on her spot (ring), then the cross over her; the farmer opens the gate and comes in
//  8 he squats and picks up a plastic bottle (right palm) and a stick (left palm) from her spot (point down), throws both over the back
//    fence on an arc, then squats again and presses the straw flat with both palms (check)
//  9 the wet mud by the trough (drip ripples, water drop) beside the dry straw bed, where the calm sheep lies down (sparkles)
// 10 close on the hero's face (question), she turns three times on the spot (cycle arrows) and lies down, front knees first (sleepy face)
// 11 CTA: the whole flock lies calm in the pen, the farmer leans on the closed gate, thumbs-up, slow pull-out arcing round
// Step up vs the last render (hens winter v3, score 95):
//  motion   - first quadruped walker with 2-bone IK legs (carpus forward, hock back), lateral-sequence walk with planted stance hooves
//             synced to ground distance (also while circling and turning on the spot), tight circling, lying down front knees first
//             then the hindquarters, stamping, scanning saccades, sniff twitches, sideways cud chewing, ear flicks, blinks, fat-tail
//             jiggle; the farmer squats, picks, throws on an arc and presses (palm contact by probe)
//  graphics - lumpy displaced fleece with crevice darkening, crimped-wool map and bump, sheen on the fleece rim, short brown head hair,
//             moist nose, eyelids; instanced grass that flattens in a swirl; wet mud with glossy puddles and drip ripples; a braced gate
//  realism  - an Egyptian fat-tailed sheep (Ossimi / Barki type) at real size (0.9 m to the poll, 0.75 m at the withers, 1.1 m long),
//             farmer 1.75 m, gate rails at real heights (.38 / .78 / 1.15 m), a 1.5 l PET bottle, a 1.6 m concrete trough, evening sun
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(23);
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7), l8: W(8), l9: W(9), l10: W(10),
  safe2: W(1, 9), weird3: W(2, 7), stamp4: W(3, 6), small5: W(4, 4), see6: W(5, 8), sign7: W(6, 5), dry8: W(7, 7), clean9: W(8, 7),
  strange10: W(9, 2), fall10: W(9, 10), like11: W(10, 5) };

// ---------- layout (metres). Pen x -2.6..2.6, z -2.9..0.9, open toward the camera (+z); gate on the right side, z -0.9..0.3 ----------
const GA = [-0.9, -0.5], GB = [1.2, -1.65], ST = [-1.8, -1.95], MUD = [-0.35, -2.05], F = [1.8, -1.55], GATE = [3.01, -0.3];
// farmer facing -x, squatting: the reaching palm lands at (-.3, -.18) right / (-.3, +.18) left from his feet, .20 m high (probe)
const PALM_R = [F[0] - .3, F[1] - .18], PALM_L = [F[0] - .3, F[1] + .18];
const world = [
  { id: 'fence', type: 'pen_fence', pos: [0, 0, 0], params: { segs: [[-2.6, -2.9, 2.6, -2.9], [-2.6, -2.9, -2.6, .9], [2.6, -2.9, 2.6, -.9], [2.6, .3, 2.6, .9], [-2.6, .9, -1.7, .9], [1.7, .9, 2.6, .9]] }, anim: 'none' },
  { id: 'gate', type: 'pen_gate', pos: [2.6, 0, -.9], rotY: -PI / 2, params: { w: 1.2, swing: -1.5, openK: [[0, 0], [33.0, 0], [33.9, 1], [44.4, 1], [45.3, 0]] }, anim: 'none' },
  { id: 'strawB', type: 'coop_floor', pos: [GB[0], 0, GB[1]], params: { w: 1.4, d: 1.2 }, anim: 'none' },
  { id: 'strawS', type: 'coop_floor', pos: [ST[0], 0, ST[1]], params: { w: 1.3, d: 1.1 }, anim: 'none' },
  { id: 'hayS', type: 'hay_pile', pos: [ST[0], 0, ST[1]], params: { r: .5, h: .1, count: 700 }, anim: 'none' },
  { id: 'hayB', type: 'hay_pile', pos: [F[0] - .27, 0, F[1]], params: { r: .32, h: .13, count: 420 }, anim: 'none' },
  { id: 'mud', type: 'mud_patch', pos: [MUD[0], 0, MUD[1]], params: { w: 1.3, d: .9 }, anim: 'none' },
  { id: 'trough', type: 'trough', pos: [MUD[0], 0, -2.62], params: { len: 1.6, w: .5, h: .5, drinks: [] }, anim: 'none' },
  { id: 'bedA', type: 'grass_bed', pos: [GA[0], 0, GA[1]], params: { r: .62, r1: .45, h: .17, count: 1100,
    flatK: [[0, 0], [.3, 0], [3.0, .14], [10.3, .14], [14.2, .24], [16.7, .24], [18.9, .36], [19.35, .36], [19.55, .55], [20.35, .72], [21.15, .9], [21.6, 1]] }, anim: 'none' },
];
// palms and big trees outside the pen, shrubs at the fence corners, grass clumps around (clear of the pen and the camera corridor)
[[-4.6, -4.4, 9], [-5.8, -1.6, 10], [4.9, -4.2, 8.5], [5.9, -2.2, 9.5], [-5.4, 2.2, 8]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, x, z, h, { rotY: i * 1.9, params: { sway: .01, ph: i } })));
[[-3.2, -3.4, .9, 'nature_pack/Bush_1'], [3.3, -3.5, 1.0, 'nature_pack/Bush_2'], [-3.3, .2, .7, 'ph/shrub_02'], [3.6, 1.6, .6, 'ph/shrub_01'], [-3.6, 2.6, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
for (let i = 0, n = 0; i < 500 && n < 36; i++) { const x = -6.2 + R() * 12.4, z = -5 + R() * 11;
  if (x > -3.0 && x < 3.3 && z > -3.3 && z < 1.3) continue; if (x > 2.9 && x < 6.0 && z > -1.2 && z < .7) continue; if (Math.abs(x) < 2.6 && z > 1.2) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], x, z, .3 + R() * .25, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }

// ---------- actors ----------
// sheep track [t, x, z, act, yaw, opt]: a key with different x,z than the last = walk there; spin = a tight circle that ends where it began
const sheep = (id, seed, track) => ({ id, type: 'sheep', pos: [0, 0, 0], anim: 'none', params: { height: .9, seed, link: id, track } });
const A = GA, Y0 = .4;
const sA = sheep('sA', 1, [
  [0, A[0], A[1], 'spin', Y0, { turns: 1, r: .3 }], [3.05, A[0], A[1], 'idle'], [3.35, A[0], A[1], 'scan'], [7.35, A[0], A[1], 'sniff'], [8.75, A[0], A[1], 'dip'],
  [9.95, A[0], A[1], 'idle'], [10.25, A[0], A[1], 'spin', null, { turns: 1, r: .3 }], [14.3, A[0], A[1], 'idle'], [16.6, A[0], A[1], 'spin', null, { turns: 1, r: .25 }],
  [18.95, A[0], A[1], 'stamp'], [21.5, A[0], A[1], 'sniff'], [23.5, A[0], A[1], 'sniff'], [24.1, -.86, -.42, 'sniff'], [25.25, -.86, -.42, 'scan'], [26.0, -.86, -.42, 'idle'],
  [26.6, -.86, -.42, 'graze'], [44.3, -.86, -.42, 'idle'], [45.2, A[0], A[1], 'idle'], [45.9, A[0], A[1], 'scan', Y0], [47.55, A[0], A[1], 'spin', null, { turns: 3, r: .13 }], [50.25, A[0], A[1], 'lie'], [D + 1, A[0], A[1], 'lie']]);
const sB = sheep('sB', 2, [
  [0, 1.3, -1.55, 'graze', -2.4], [10.2, 1.3, -1.55, 'watch', null, { look: A }], [16.4, 1.3, -1.55, 'graze'], [29.6, 1.3, -1.55, 'idle'], [29.9, GB[0], GB[1], 'idle', -2.2],
  [30.3, GB[0], GB[1], 'spin', null, { turns: 3, r: .28 }], [35.4, GB[0], GB[1], 'idle'], [35.65, GB[0], GB[1], 'idle'], [36.9, .75, -2.3, 'graze'], [47.3, .75, -2.3, 'idle', -.6], [47.6, .75, -2.3, 'lie'], [D + 1, .75, -2.3, 'lie']]);
const sC = sheep('sC', 3, [
  [0, -1.55, -1.1, 'graze', 2.3], [10.2, -1.55, -1.1, 'watch', null, { look: A }], [16.4, -1.55, -1.1, 'graze'], [42.4, -1.55, -1.1, 'idle'], [42.7, -1.55, -1.1, 'idle'],
  [44.0, ST[0], ST[1], 'idle'], [44.4, ST[0], ST[1], 'idle', .6], [44.7, ST[0], ST[1], 'lie'], [D + 1, ST[0], ST[1], 'lie']]);
const sD = sheep('sD', 4, [
  [0, .45, .1, 'graze', -.9], [10.2, .45, .1, 'watch', null, { look: A }], [16.4, .45, .1, 'graze'], [26.2, .45, .1, 'idle'], [27.6, .3, -.55, 'graze'], [48.2, .3, -.55, 'idle', .3], [48.6, .3, -.55, 'lie'], [D + 1, .3, -.55, 'lie']]);
// farmer: rig track [t, x, y, z, yaw|null, pose, gait]; squats use y -.55
const fy = -.55, FW = -PI / 2;
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', delay: 26.3, params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 5, track: [
  [26.3, 5.7, 0, -.45, FW, 'walk'], [28.9, GATE[0], 0, GATE[1], null, 'walk', 'walk'], [29.2, GATE[0], 0, GATE[1], FW, 'stand'], [29.75, GATE[0], 0, GATE[1], FW, 'leanGate'],
  [32.5, GATE[0], 0, GATE[1], FW, 'leanGate'], [32.85, GATE[0], 0, GATE[1], FW, 'stand'], [33.1, GATE[0], 0, GATE[1], FW, 'pushGate'], [33.75, 2.9, 0, GATE[1], FW, 'pushGate'],
  [34.5, 2.3, 0, -.4, null, 'walk', 'walk'], [36.0, F[0], 0, F[1], null, 'walk', 'walk'], [36.3, F[0], 0, F[1], FW, 'stand'], [36.75, F[0], fy, F[1], FW, 'squatHold'],
  [37.15, F[0], fy, F[1], FW, 'squatPickR'], [37.6, F[0], fy, F[1], FW, 'squatPickR'], [37.85, F[0], fy, F[1], FW, 'squatHold'], [38.15, F[0], fy, F[1], FW, 'squatPickL'],
  [38.5, F[0], fy, F[1], FW, 'squatPickL'], [38.75, F[0], fy, F[1], FW, 'squatHold'], [39.05, F[0], 0, F[1], FW, 'holdBoth'], [39.3, F[0], 0, F[1], -PI, 'tossBack'],
  [39.55, F[0], 0, F[1], -PI, 'tossFwd'], [39.8, F[0], 0, F[1], -PI, 'tossFwd'], [40.1, F[0], 0, F[1], FW, 'stand'], [40.45, F[0], fy, F[1], FW, 'squatPress'], [41.95, F[0], fy, F[1], FW, 'squatPress'], [42.45, F[0], 0, F[1], FW, 'stand'],
  [43.4, 2.3, 0, -.45, null, 'walk', 'walk'], [44.3, 3.15, 0, -.3, null, 'walk', 'walk'], [44.45, 3.15, 0, -.3, FW, 'pushGate'], [45.3, GATE[0], 0, GATE[1], FW, 'stand'],
  [45.8, GATE[0], 0, GATE[1], FW, 'leanGate'], [D + 1, GATE[0], 0, GATE[1], FW, 'leanGate']] } };
// litter on her spot; listed after the farmer so his palms are published first. Rest on the straw (y .06), ride a palm, thrown over the back fence
const bottle = { id: 'bottle', type: 'pick_prop', pos: [PALM_R[0], .06, PALM_R[1]], anim: 'none', params: { kind: 'bottle', rot: .3, pick: [37.32, 39.68, 40.28], hand: 'R', carryBy: 'farmer', throwTo: [1.4, .03, -3.75], arc: 1.0 } };
const stick = { id: 'stick', type: 'pick_prop', pos: [PALM_L[0], .05, PALM_L[1]], anim: 'none', params: { kind: 'stick', rot: 1.9, pick: [38.32, 39.68, 40.32], hand: 'L', carryBy: 'farmer', throwTo: [2.0, .02, -3.95], arc: 1.0 } };
const twig = { id: 'twig', type: 'pick_prop', pos: [-.6, 0, .14], anim: 'none', params: { kind: 'twig', rot: 1.2 } };
const stone = { id: 'stone', type: 'pick_prop', pos: [-.8, 0, .2], anim: 'none', params: { kind: 'stone', r: .04 } };

const beats = [
  // 1 hook: the hero sheep turns a circle on a tuft of tall grass; ring around her
  { t: 0, kind: 'info', add: [...world, sA, sB, sC, sD, farmer, bottle, stick, twig, stone, stk('ringA', 'circle_ring', [A[0] + .15, .45, A[1] - .05], 1.5, { delay: .3 })],
    camera: { target: [A[0] + .15, .4, A[1] - .1], dist: 4.6, elev: .32, az: .15, zoom: 'in' } },
  // 2 sheep sense danger fast: head high, scanning the pen; eyes over her head
  { t: T.l1, kind: 'info', remove: ['ringA'], add: [stk('eyesA', 'eyes', [-.62, 1.2, -.12], .22, { delay: .3 })],
    camera: { target: [-.85, .65, -.45], dist: 3.3, elev: .12, az: .6, zoom: 'out' } },
  //   ... make sure the place is safe before going down: sniffs the ground, dips her front knees; arrow down
  { t: T.safe2 - .1, kind: 'info', remove: ['eyesA'], add: [stk('dnA', 'arrow_down', [-.6, .82, -.1], .2, { delay: .2 })],
    camera: { target: [-.75, .35, -.3], dist: 3.6, elev: .22, az: .75, zoom: 'in' } },
  // 3 but it looks strange: the flock of four watches her turn; the camera orbits
  { t: T.l2, kind: 'info', remove: ['dnA'],
    camera: { target: [-.3, .4, -.85], dist: 6.8, elev: .38, az: -.35, spin: .55 } },
  //   ... and we do not always know why: thinking face over her, the orbit goes on
  { t: T.weird3 - .4, kind: 'info', add: [stk('thinkA', 'face_thinking', [-.75, 1.25, -.35], .3, { delay: .3 })],
    camera: { target: [-.55, .45, -.7], dist: 5.4, elev: .32, az: .3, spin: .45, zoom: 'out' } },
  // 4 so she turns once or twice: close above her as she circles; cycle arrows
  { t: T.l3, kind: 'info', remove: ['thinkA'], add: [stk('cycA', 'arrows_cycle', [A[0], 1.2, A[1]], .3, { delay: .2 })],
    camera: { target: [A[0], .38, A[1]], dist: 4.0, elev: .5, az: .2, zoom: 'in' } },
  //   ... and stamps the grass flat with her hoof: low close on the fore hoof, the grass lies down in a swirl; check
  { t: T.stamp4 - .1, kind: 'info', remove: ['cycA'], add: [stk('okG', 'check', [-1.25, .38, -.3], .17, { delay: 1.0 })],
    camera: { target: [-.85, .2, -.3], dist: 2.2, elev: .32, az: .55, zoom: 'out' } },
  // 5 she feels the ground: nose down, sniffing; magnifier by her nose
  { t: T.l4, kind: 'info', remove: ['okG'], add: [stk('magA', 'magnifier', [-.42, .5, .12], .17, { delay: .3 })],
    camera: { target: [-.7, .3, -.1], dist: 2.6, elev: .22, az: .95, zoom: 'in' } },
  //   ... nothing small that could bother her: the twig and the small stone by her bed; point down on the twig
  { t: T.small5, kind: 'info', remove: ['magA'], add: [stk('ptTw', 'point_down', [-.6, .36, .14], .15, { delay: .2 })],
    camera: { target: [-.68, .16, .05], dist: 1.9, elev: .55, az: .45, zoom: 'out' } },
  // 6 the farmer who knows walks in from the right in the evening light
  { t: T.l5, kind: 'info', remove: ['ptTw'],
    camera: { target: [3.4, .95, -.4], dist: 8.5, elev: .16, az: .25, zoom: 'in' } },
  //   ... and watches the flock at bedtime: forearms on the gate rail; seen from inside the pen past the restless sheep; eyes over him
  { t: T.see6 - .3, kind: 'info', add: [stk('eyesF', 'eyes', [GATE[0], 2.02, GATE[1] + .1], .22, { delay: .2 })],
    camera: { target: [2.5, .9, -.7], dist: 4.6, elev: .14, az: -1.2, zoom: 'out' } },
  // 7 because a lot of circling: one sheep goes round and round on her spot; ring around her
  { t: T.l6, kind: 'info', remove: ['eyesF'], add: [stk('ringB', 'circle_ring', [GB[0] + .05, .45, GB[1]], 1.5, { delay: .2 })],
    camera: { target: [GB[0], .45, GB[1]], dist: 4.6, elev: .36, az: -.55, zoom: 'in' } },
  //   ... can be a sign something is not comfortable in the pen: cross over her (this beat only); the farmer opens the gate behind
  { t: T.sign7, kind: 'info', remove: ['ringB'], add: [stk('xB', 'cross', [GB[0], 1.2, GB[1]], .28, { delay: .2, pulse: true })],
    camera: { target: [1.8, .7, -1.2], dist: 5.6, elev: .24, az: -.3, zoom: 'out' } },
  // 8 so the farmer removes anything out of place: he squats and picks up the bottle, then the stick; point down on the bottle
  { t: T.l7, kind: 'info', remove: ['xB'], add: [stk('ptBo', 'point_down', [PALM_R[0], .5, PALM_R[1]], .14, { delay: 0 })],
    camera: { target: [1.5, .4, -1.55], dist: 3.0, elev: .3, az: -.45, zoom: 'in' } },
  //   ... and makes sure the ground is dry and clean: throws both over the back fence, squats and presses the straw; check
  { t: T.dry8 - .2, kind: 'info', remove: ['ptBo'], add: [stk('okF', 'check', [1.3, .62, -1.25], .17, { delay: 1.85 })],
    camera: { target: [1.6, .7, -2.0], dist: 4.6, elev: .26, az: -.3, zoom: 'out' } },
  // 9 it matters a lot, because damp harms sheep: the wet mud by the trough beside the dry straw bed; water drop over the mud
  { t: T.l8, kind: 'info', remove: ['okF'], add: [stk('dropM', 'water_drop', [MUD[0], .55, MUD[1] + .05], .2, { delay: .2, pulse: true })],
    camera: { target: [-1.05, .2, -2.0], dist: 4.4, elev: .85, az: -.35, zoom: 'in' } },
  //   ... and the clean ground lets her sleep in comfort: the calm sheep lies down on the dry straw; sparkles
  { t: T.clean9 - .5, kind: 'info', remove: ['dropM'], add: [stk('sparkS', 'sparkles', [ST[0] - .35, .62, ST[1] + .1], .2, { delay: .8 })],
    camera: { target: [-1.65, .35, -1.85], dist: 3.2, elev: .35, az: -.45, zoom: 'out' } },
  // 10 and the strangest thing? close on the hero's face; question
  { t: T.l9, kind: 'info', remove: ['sparkS'], add: [stk('qA', 'question', [-.95, 1.12, -.25], .17, { delay: .15 })],
    camera: { target: [-.74, .66, -.12], dist: 1.9, elev: .1, az: .4, zoom: 'in' } },
  //   ... she can turn more than once before she lies down: three tight turns on the spot; cycle arrows
  { t: T.strange10, kind: 'info', remove: ['qA'], add: [stk('cyc3', 'arrows_cycle', [A[0], 1.15, A[1]], .28, { delay: .15 })],
    camera: { target: [A[0], .4, A[1]], dist: 3.6, elev: .5, az: .15, zoom: 'out' } },
  //   ... with no danger at all: she folds her front knees, then the hindquarters, and settles; sleepy face
  { t: T.fall10, kind: 'info', remove: ['cyc3'], add: [stk('zzA', 'face_sleep', [A[0] - .15, .85, A[1]], .22, { delay: 1.3 })],
    camera: { target: [A[0] + .1, .28, A[1] + .1], dist: 3.0, elev: .3, az: .75, zoom: 'in' } },
  // 11 CTA: the flock lies calm in the pen, thumbs-up, slow pull-out arcing round
  { t: T.l10, kind: 'info', remove: ['zzA'], add: [stk('thumb', 'thumbs_up', [-.1, 1.55, -.9], .42, { delay: T.like11 - T.l10 - .3 })],
    camera: { target: [0, .45, -1.0], dist: 6.5, elev: .42, az: -.35, spin: .8, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الغنم بتلف في دايرة قبل ما تنام',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 14, d: 13, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 6, soilTint: [1.0, .97, .9], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 32, sunAz: 30, turbidity: 2.8, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .6, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
