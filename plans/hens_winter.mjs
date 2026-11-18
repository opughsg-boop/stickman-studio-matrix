// "ليه الفرخة بتبطّل تبيض في الشتا؟!" (voice-over 2026-11-18, 7 lines, 28.9 s take). Diorama on the real-sky island: a village hen coop
// (lime-washed mud brick inside, mud plaster outside, palm-trunk roof, open front as the cutaway, side doorway, small barred window),
// a dusty yard in front, palms behind, and the sun on its real day arc far behind the coop. One day clock (dayK) drives the sun, the
// timer dial and the lamp, so the lamp really lights in the timer's morning and evening segments.
// Every spoken line is shown by objects and actions, never by words:
//  1 hen stands away from the empty nest boxes in the dim coop, circle ring around the nest boxes
//  2 the sun climbs a long high summer arc (dotted trail, no clock), hen pecks in the sunlit yard; an egg pops into the nest
//  3 winter: the summer arc fades to a ghost, the sun runs a short low arc (cross by it); the coop interior is dim (bright doorway behind)
//  4 hen by the empty nest (cross over the nest), then sits, fluffs up and preens: the rest period
//  5 the farmer walks in through the doorway with a lamp and a timer (check), mounts the lamp, plugs the timer (point-down), the lamp
//    lights at dawn and at dusk (the sun low left, then low right), the coop glows warm
//  6 close on the timer: his hand turns the pinned dial (circle ring), then days run and the lamp lights at the same dial spot each day (check)
//  7 CTA: hen calm in the warm coop, eggs back in the nest, thumbs-up, slow pull-out
// Step up vs the last render (salt_cow v2, score 77):
//  motion   - hen walker: steps synced to ground distance (no sliding), head-stabilised bob (head holds still, then thrusts), peck strikes
//             with a fast drop and slow rise plus a foot scratch, saccadic head turns, sit-down rest with fluffing, preening nibbles,
//             tail flicks, acts cross-blended; farmer walks through a doorway (slows at the jamb) and reaches up / turns the dial
//  graphics - lime-wash with flaking patches and a soiled base, mud plaster with straw and cracks, palm-trunk roof with jareed and
//             frayed thatch, straw litter with 3-toe prints, enamel lamp with a warm point light, bulb bloom and warm-up, a pinned dial
//  realism  - the sun's real day length (summer 14 h high/wide arc vs winter 10 h low/short), lamp on before sunrise and after sunset
//             (real lighting programme), real sizes (hen 0.4 m, person 1.75 m, nest box 36x32x38 cm, timer 7x10 cm, coop 3.5x2.4x2.1 m)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(17);
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .35, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6),
  hours2: W(1, 7), lay2: W(1, 12), dark3: W(2, 4), rest4: W(3, 4), lamp5: W(4, 2), on5: W(4, 4), timer5: W(4, 5), morn5: W(4, 6), eve5: W(4, 7), lit5: W(4, 9),
  same6: W(5, 6), like7: W(6, 4) };

// ---------- layout (metres). Coop: outer x +-1.75, inner +-1.5, back wall inner face z -2.45, open front at z -.3 ----------
const ZW = -2.45, NEST = [-.8, -2.24], NEST_TOP = .4 + .32;
const FARM = [.25, -2.08];                                 // farmer stands here facing the back wall (yaw PI)
const LAMP = [-.02, 1.70], TIMER = [.53, 1.50];              // wall spots (x, y), tuned with the palm probe
const segs = [[.20, .32], [.68, .80]];                     // timer on: before/after sunrise and before/after sunset (+2 h each)
// one day clock: summer day (rise .21, set .79) during line 2, winter day (.30-.70) during line 3, the timer's dawn and dusk in line 5,
// the dial turned by hand and then two days running in line 6
const dayK = [[0, .17], [2.35, .2], [7.6, .8], [8.45, 1.29], [10.9, 1.71], [16.9, 2.24], [T.morn5 + .08, 2.305], [T.morn5 + .55, 2.318], [T.morn5 + 1.0, 2.69], [T.l5 + .3, 2.72],
  [T.l5 + 1.5, 3.25], [T.same6 - .7, 3.25], [T.l5 + 3.95, 5.74], [D, 5.745]];
const sunP = { dayK, seasonK: [[0, 1], [2.0, 1], [2.3, 0], [7.7, 0], [8.4, 1]], sumK: [[2.35, 0], [7.6, 1]], sumOp: [[8.0, 1], [8.9, .28]], winK: [[8.45, 0], [10.9, 1]], winOp: [[0, 1]],
  z: -40, y0: 4.2, spanS: 9, peakS: 13, spanW: 6, peakW: 4.5 };     // sized to fit the 9:16 frame from the sky cameras
const POWER = 16.98, shadeK = [[0, .5], [POWER, .5], [POWER + .5, .66]];   // interior sky occlusion; lamp bounce lifts it
const world = [
  { id: 'floor', type: 'coop_floor', pos: [0, 0, -1.37], params: { w: 3.0, d: 2.2, shadeK: shadeK.map(([t, v]) => [t, .25 + .75 * v]) }, anim: 'none' },
  { id: 'yard', type: 'coop_floor', pos: [.8, 0, .9], params: { w: 4.2, d: 2.6, yard: true }, anim: 'none' },
  { id: 'coop', type: 'hen_coop', pos: [0, 0, 0], params: { w: 3.5, t: .25, h: 2.1, zb: -2.7, zf: -.3, shadeK }, anim: 'none' },
  { id: 'nests', type: 'nest_row', pos: [NEST[0], 0, NEST[1]], params: { n: 2, eggBox: 1, shade: .62, shadeK, eggsK: [[0, 0], [T.lay2 - .1, 1], [T.l2, 0], [T.l6 + .5, 1], [T.like7 + .3, 2]] }, anim: 'none' },
  { id: 'hayC', type: 'hay_pile', pos: [1.12, 0, -2.12], params: { r: .3, h: .2, count: 500 }, anim: 'none' },
  { id: 'sun', type: 'sky_sun', pos: [0, 0, 0], params: sunP, anim: 'none' },
];
// palms kept out of the sky corridor behind the coop, shrubs beside it, grass clumps around the yard (clear of the hen's path and the camera corridor)
[[-4.9, -4.6, 9], [-6.0, -2.2, 10.5], [5.3, -3.9, 8.5], [6.2, -1.0, 9.5], [-5.6, 1.4, 8]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, x, z, h, { rotY: i * 1.9, params: { sway: .01, ph: i } })));
[[-2.4, -3.1, .9, 'nature_pack/Bush_1'], [2.6, -3.0, 1.0, 'nature_pack/Bush_2'], [-2.6, .4, .7, 'ph/shrub_02'], [3.9, -1.0, .6, 'ph/shrub_01'], [-3.6, 2.6, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
for (let i = 0, n = 0; i < 500 && n < 40; i++) { const x = -6.2 + R() * 12.4, z = -4.5 + R() * 10.5;
  if (x > -2.1 && x < 2.3 && z > -3.0 && z < 2.4) continue; if (x > 2.1 && x < 4.0 && z > -2.2 && z < -.8) continue; if (Math.abs(x) < 2.4 && z > 2.0) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], x, z, .3 + R() * .25, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }

// ---------- actors ----------
const hen = { id: 'hen', type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .4, seed: 4, link: 'hen', inside: [-1.5, 1.5, -2.45, -.55], shadeK: shadeK.map(([t, v]) => [t, .2 + .8 * v]), track: [
  [0, .25, -1.35, 'idle', -PI / 2], [.7, .25, -1.35, 'idle'], [1.3, .1, -1.27, 'idle'], [1.8, .1, -1.27, 'idle'],
  [3.4, .9, .25, 'peck'], [4.9, .9, .25, 'peck'], [5.4, 1.1, .42, 'peck'], [6.3, 1.1, .42, 'peck'],
  [8.4, -.15, -1.8, 'idle'], [9.0, -.15, -1.8, 'idle', -PI / 2], [11.0, -.15, -1.8, 'idle'], [11.6, -.25, -1.72, 'idle'], [12.4, -.25, -1.72, 'rest', -PI / 2],
  [13.5, -.25, -1.72, 'preen'], [15.5, -.25, -1.72, 'idle'], [16.3, -.6, -1.12, 'idle'], [16.6, -.6, -1.12, 'peck', PI * .35], [T.lit5, -.6, -1.12, 'peck'],
  [T.lit5 + 1.0, -.3, -1.65, 'idle'], [T.lit5 + 1.3, -.3, -1.65, 'peck', PI * .55], [T.l5 + 3.9, -.3, -1.65, 'peck'],   // line 5 end: she steps into the lamp's warm pool
  [T.l5 + 4.8, -.4, -1.5, 'idle', -PI / 2], [T.like7, -.4, -1.5, 'rest'], [T.like7 + 1.0, -.4, -1.5, 'preen']] } };
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 5, track: [
  [13.2, 3.4, 0, -1.5, -PI / 2, 'carry'], [14.55, 1.62, 0, -1.5, null, 'carry', 'walk'], [15.6, FARM[0], 0, FARM[1], null, 'carry', 'walk'],
  [15.95, FARM[0], 0, FARM[1], PI, 'carry'], [16.45, FARM[0], 0, FARM[1], PI, 'mountUp'], [16.6, FARM[0], 0, FARM[1], PI, 'mountUp'],
  [16.98, FARM[0], 0, FARM[1], PI, 'dialSet'], [17.5, FARM[0], 0, FARM[1], PI, 'dialSet'], [18.1, FARM[0], 0, FARM[1], PI, 'lookUp'], [T.l5 + .05, FARM[0], 0, FARM[1], PI, 'lookUp'],
  [T.l5 + .35, FARM[0], 0, FARM[1], PI, 'dialSet'], [T.l5 + .55, FARM[0], 0, FARM[1], PI, 'dialTurn'], [T.l5 + 1.5, FARM[0], 0, FARM[1], PI, 'dialTurn'], [T.l5 + 1.8, FARM[0], 0, FARM[1], PI, 'stand'],
  [T.l5 + 2.6, 1.05, 0, -1.45, null, 'stand', 'walk'], [T.l5 + 3.0, 1.05, 0, -1.45, PI * .8, 'lookUp'], [T.l6 + .3, 1.05, 0, -1.45, PI * .8, 'lookUp'],
  [T.l6 + 1.6, 1.62, 0, -1.5, null, 'walk', 'walk'], [D, 3.6, 0, -1.4, null, 'walk', 'walk']] } };
// the lamp and the timer ride the farmer's palms (listed after him so his palms are published first), then sit on the wall
const lamp = { id: 'lamp', type: 'coop_lamp', pos: [LAMP[0], LAMP[1], ZW], anim: 'none', params: { y: LAMP[1], carry: [13.2, 16.45], carryBy: 'farmer', hand: 'L', powerAt: POWER, segs, dayK,
  cableTo: [TIMER[0] - LAMP[0], TIMER[1] - LAMP[1] + .05], power: 12, range: 6 } };
const timer = { id: 'timer', type: 'coop_timer', pos: [TIMER[0], TIMER[1], ZW], anim: 'none', params: { carry: [13.2, 16.98], carryBy: 'farmer', hand: 'R', powerAt: POWER, segs, dayK } };

const beats = [
  // 1 hook: the dim coop, a hen standing away from the empty nest boxes; circle ring around them
  { t: 0, kind: 'intro', add: [...world, hen, { ...farmer, delay: 13.2 }, lamp, timer, stk('ringN', 'circle_ring', [NEST[0], NEST_TOP - .12, NEST[1] + .25], .82, { delay: .35 }),
    stk('qHen', 'question', [.22, .66, -1.3], .2, { delay: 1.0 })],   // she looks at the empty nest, then a question mark over her head
    camera: { target: [-.3, .32, -1.7], dist: 3.4, elev: .12, az: .25, zoom: 'in' } },
  // 2 because a hen needs about 14 h of light: the sun climbs its long, high summer arc behind the coop, the hen walks out into the yard
  { t: T.l1, kind: 'info', remove: ['ringN', 'qHen'], add: [stk('upS', 'arrow_curve_up', [-2.7, 5.4, -13.5], 1.5, { delay: .4 })],   // NEW: curved up-arrow riding the sun's climb
    camera: { target: [.3, 1.6, -13.5], dist: 20, elev: .096, az: .015, fov: 46, spin: .02, push: -.1 } },   // over the roof: hen in the yard below, arc above
  //   ... hours of light: low close on the hen pecking in full sunlight
  { t: T.hours2, kind: 'info', remove: ['upS'], add: [stk('hgS', 'hourglass', [1.0, .62, .36], .18, { delay: .3 })],   // NEW: hourglass over the pecking hen = hours of light
    camera: { target: [1.1, .12, .42], dist: 1.55, elev: .16, az: -.2, fov: 40, zoom: 'in' } },
  //   ... to keep laying: an egg pops into the straw cup, the hen heads back in
  { t: T.lay2, kind: 'info', remove: ['hgS'], add: [stk('spark', 'sparkles', [NEST[0] + .18, NEST_TOP + .15, NEST[1] + .2], .2, { delay: .3 })],
    camera: { target: [-.62, .55, -2.1], dist: 1.6, elev: .16, az: .32, zoom: 'out' } },
  // 3 but in winter the day is short: the summer arc fades to a ghost, the sun runs a short, low arc; cross by it
  { t: T.l2, kind: 'problem', remove: ['spark'], add: [stk('dnS', 'arrow_down', [-.3, 7.4, -14], 1.3, { delay: 1.2, pulse: true })],   // NEW: down-arrow between the ghost summer peak and the low winter peak
    camera: { target: [-.3, 1.2, -14], dist: 20, elev: .09, az: -.025, fov: 46, spin: -.02, push: .1 } },
  //   ... and the coop goes dim: inside, the hen in the shade, the bright doorway behind
  { t: T.dark3, kind: 'problem', remove: ['dnS'], add: [stk('eyeH', 'eyes', [-.15, .66, -1.74], .2, { delay: .3 })],   // NEW: eyes over the hen peering in the dim coop
    camera: { target: [-.1, .8, -1.8], dist: 2.9, elev: .1, az: -.38, fov: 40, zoom: 'in' } },
  // 4 so the hen stops laying: the empty nest, cross over it
  { t: T.l3, kind: 'info', remove: ['eyeH'], add: [stk('xNest', 'cross', [NEST[0], NEST_TOP + .2, NEST[1] + .15], .3, { delay: .3, pulse: true })],
    camera: { target: [-.55, .52, -2.0], dist: 1.75, elev: .2, az: .35, zoom: 'out' } },
  //   ... and goes into a rest period: she sits down, fluffs up and preens
  { t: T.rest4, kind: 'info', remove: ['xNest'], add: [stk('hgR', 'hourglass', [-.25, .46, -1.66], .17, { delay: .9 })],   // NEW: hourglass over the sitting hen = a rest period
    camera: { target: [-.25, .06, -1.72], dist: 1.35, elev: .2, az: -.3, zoom: 'in' } },
  // 5 the fix is simple: the farmer walks in through the doorway with a lamp and a timer; check
  { t: T.l4, kind: 'solution', remove: ['hgR'], add: [stk('ideaF', 'idea', [1.55, 2.12, -1.5], .3, { delay: .15 })],   // NEW: light-bulb idea over the farmer as he steps through the doorway
    camera: { target: [.85, 1.0, -1.55], dist: 3.7, elev: .1, az: -.42, zoom: 'out' } },
  //   a small lamp: mounted on the wall, the timer plugged in below it (point-down over the timer), the lamp lights
  { t: T.lamp5, kind: 'solution', remove: ['ideaF'], add: [stk('ptT', 'point_down', [TIMER[0] + .02, TIMER[1] + .2, ZW + .12], .16, { delay: T.timer5 - T.lamp5 })],
    camera: { target: [.3, 1.45, -2.3], dist: 2.2, elev: .04, az: .5, zoom: 'in' } },
  //   ... morning and evening: from outside, the sun low on the left at dawn and low on the right at dusk, the lamp glowing both times
  { t: T.morn5, kind: 'solution', remove: ['ptT'], add: [stk('clkS', 'alarm_clock', [0, 4.6, -13.8], 1.1, { delay: .3 })],   // NEW: alarm clock over the roof = the timer firing at dawn and dusk
    camera: { target: [0, 1.3, -13.8], dist: 20, elev: .075, az: .02, fov: 46, spin: .015, push: -.08 } },
  //   ... so the coop stays lit: the hen walks out of the dim corner into the lamp's warm pool and pecks there; sparkles by the glowing bulb;
  //   camera tilted up so the lit lamp (top) and the hen in its light (bottom) share the frame
  { t: T.lit5, kind: 'solution', remove: ['clkS'], add: [stk('sparkL', 'sparkles', [LAMP[0] + .2, LAMP[1] + .08, ZW + .16], .2, { delay: .25 })],
    camera: { target: [-.1, 1.0, -1.9], dist: 2.6, elev: .05, az: -.2, fov: 40, push: .12 } },
  // 6 careful: close on the timer, his hand turns the pinned dial; circle ring on the dial
  { t: T.l5, kind: 'info', remove: ['sparkL'], add: [stk('ringD', 'circle_ring', [TIMER[0], TIMER[1] - .008, ZW + .1], .13, { delay: .3 })],
    camera: { target: [TIMER[0] - .12, 1.4, -2.38], dist: 1.25, elev: .05, az: .42, zoom: 'in' } },
  //   ... at the same time every day: the days run, the lamp lights at the same dial spot each turn; check
  { t: T.same6, kind: 'info', remove: ['ringD'], add: [stk('ok6', 'check', [TIMER[0] + .17, TIMER[1] + .13, ZW + .12], .12, { delay: .2 })],
    camera: { target: [.25, 1.55, -2.35], dist: 2.0, elev: .06, az: .1, zoom: 'out' } },
  // 7 CTA: the hen calm in the warm coop, eggs back in the nest, thumbs-up, slow pull-out
  { t: T.l6, kind: 'info', remove: ['ok6'], add: [stk('thumb', 'thumbs_up', [-.42, 1.22, -1.3], .3, { delay: T.like7 - T.l6 - .3 })],
    camera: { target: [-.45, .48, -1.6], dist: 2.5, elev: .18, az: .18, spin: .4, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفرخة بتبطّل تبيض في الشتا',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40,
  env: { island: { w: 14, d: 13, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [1.0, .94, .86], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 50, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .6, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
