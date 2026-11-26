// "إزاي تعمل بيت دجاج متكامل، بعشش وتهوية، وبيخلّي الدجاجة تبيض كل يوم؟!" (voice-over 2026-11-20, 31 lines, 168.2 s). An Egyptian village yard in
// daylight (straw-dust yard, palms, Nile horizon). A 3 x 2 m red-brick hen house is built on camera from the bare ground up, one stage per
// line, with no words: the finished coop (hook), a farmer walks the site with a steel tape while the builder's string goes round the
// footprint, ten Fayoumi hens spread out on it (about half a square metre each), then crowd and peck each other in a corner (problem),
// a 3-course brick plinth rises and a screed is drawn over it, rain runs a puddle away from the raised base, a trench is dug round it and a
// galvanised wire apron laid in (fox-proof), the walls go up course by course, a trowel taps a brick into its mortar bed while the other
// palm presses the next one down, the sun-side front wall stands higher than the back, stale haze hangs inside (problem) and clears as a
// breeze streams vent to vent, fine mesh is pressed into the high vent by hand, a low shutter slides open, three nest boxes are nailed in,
// a hen settles in the dim middle box, a palm presses the straw in the next, a perch drops onto its trestles and hens hop up evenly spaced,
// litter is spread and pressed, goes damp and is covered fresh, the plank roof lowers onto its rafters and rain runs off the low back edge,
// the overhang shades the front wall, the door is hung, pulled shut by its edge and bolted, hens scratch in the grass, the hero hen walks in,
// hops into the strawed nest, settles and lays; a real hand slides under her and draws out the warm egg; CTA orbit round the finished coop.
// 1x improvement over the last video (pigeon_cage):
//  - Motion: bricks drop 4 cm into a wet bed and settle course by course in lay order round the perimeter (a travelling wave, slowed to
//    real speed in the close-up); the trowel taps twice with an accelerating 'in' ease then strikes along the head joint; a palm rides a
//    brick down into its bed; a hand grips the door's free edge and swings it shut on its hinges, then slides the bolt; hens walk, run
//    when crowding, hop up 62 cm onto the perch and 21 cm into the nest, turn and settle; the mesh rides in on the palm and its bulge
//    flattens as it is pressed; breeze streaks and a haze that drifts and clears.
//  - Graphics: instanced red bricks with per-brick colour variation and recessed mortar joints that dry from dark wet grey to light grey;
//    a steel pointing trowel (cranked shank, ferrule, beech handle) in the detailed hand; float-swirled cement screed; galvanised apron;
//    a ledged-and-braced plank door with strap hinges and a zinc barrel bolt; damp-darkening litter; wet roof planks and running beads.
//  - Realism: real sizes and practice (bricks 25 x 12 x 6.5 cm with 1 cm joints in running bond, plinth 3 courses 21.6 cm, walls 1.89 m
//    front / 1.60 m back so the mono-pitch roof falls to the north, coop 3 x 2 m for ten hens, vents high in two opposite walls, low vent
//    15 cm high, nest boxes 36 cm on a 25 cm bench, perch 60 cm up with 25 cm per hen, litter 7 cm, overhang 35-40 cm, door 60 x 107 cm,
//    hen 0.45 m, farmer 1.75 m, tape blade 19 mm).
// Contact: trowel blade underside keyed onto the brick top (anchor = blade); the left palm rides brick j3 down its 4 cm drop (both on
// eased keys, <= 0.5 cm apart); mesh palm keyed to the mesh plane through the slide (sampled every 0.3 s, 4 mm off); hammer face on the
// nest divider edge; palms on the straw (2 cm press) and the litter top (2 cm press); door edge and bolt knob by OC grabs (0 m by
// construction); the egg rides the palm (2.3 cm centre offset); tape case on the farmer's palm; hen feet on ground / sill / litter /
// perch top / nest straw by track y. Stickers: none (the engine's own check/cross icons mark the fix and problem beats).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5, k0 = 0) => { const s = S[Math.min(i, S.length - 1)], ws = s.words, k = ws.findIndex((w, j) => j >= k0 && re.test(strip(w.w))); return k >= 0 ? ws[k].start : s.start + (s.end - s.start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'none', ...more });
const r3 = v => Math.round(v * 1000) / 1000, R3 = a => a.map(r3), PI = Math.PI;
const add = (a, b) => a.map((x, i) => x + b[i]), mul = (a, k) => a.map(x => x * k), norm = a => mul(a, 1 / Math.hypot(...a));
const R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(41);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), sEase = u => (1 - Math.cos(PI * clamp(u))) / 2;

// ---- times from the voice (one per line; a few word times inside long lines)
const T = i => at(i), Train = word(23, /المطر/, .6), T27b = word(27, /يتجري/, .5), Thand = word(29, /بين/, .25), Tunder = word(29, /بتبيض/, .35);
const Tpull = word(29, /ودجاجة/, .6), T29b = word(29, /بتبيض/, .75, 10);

// ---- coop geometry (mirrors BCP in renderer/scene.js)
const W = 3, Dp = 2, Tw = .12, CH = .072, F0 = .236, yF = F0 + 23 * CH, yB = F0 + 19 * CH, LIT = F0 + .07, PERCHY = F0 + .6 + .0225;
const VENT = { y0: F0 + 16 * CH, y1: F0 + 19 * CH }, PT = 2 * W + 2 * (Dp - 2 * Tw);
const NB = F0 + .25, NX = -.75, NZ = -.67, FLOOR = NB + .03, BOX = i => NX - .36 + .36 * i;   // nest row: 3 boxes on a 25 cm bench at the back wall

// ---- the coop keys
const coopP = { link: 'coop',
  stringK: [[7.2, 0], [12.5, .25], [14.2, 1]], baseK: [[T(4) + .5, 0], [T(4) + 3.5, 3]], slabK: [[T(4) + 3.6, 0], [T(5) - .1, 1]],
  digK: [[T(6) + .3, 0], [T(6) + 1.7, 1]], apronK: [[T(6) + 1.6, 0], [T(7) - .3, 1]],
  courseK: [[T(7) + .2, 0], [T(8) - .2, 8.0], [46.38, 8.0951], [47.38, 8.1351], [48.1, 8.1624], [T(9) - .05, 8.3], [T(9) + 3.7, 23]],
  hazeK: [[T(10) - .3, 0], [T(10) + .3, 1], [T(11) + .6, 1], [T(11) + 3.4, 0]], airK: [[T(11) + .2, 0], [T(11) + .8, 1], [T(14) - .1, 1], [T(14) + .4, 0]],
  meshK: [[68.3, 0], [70.0, 1]], lowK: [[T(13) + .6, 0], [T(13) + 1.7, 1]], lowAirK: [[T(13) + 1.5, 0], [T(13) + 2.1, 1], [T(14) - .1, 1], [T(14) + .3, 0]],
  perchK: [[T(18) + .4, 0], [T(18) + 1.3, 1]], litterK: [[T(21) + .3, 0], [T(21) + 3.1, 1]], dirtK: [[T(22) + .3, 0], [T(22) + 1.7, 1]], freshK: [[T(22) + 1.8, 0], [T(23) - .5, 1]],
  roofK: [[T(23) + .4, 0], [Train - .3, 1]],
  rainK: [[T(5) + .1, 0], [T(5) + .5, 1], [T(6) - .6, 1], [T(6) - .1, 0], [Train - .3, 0], [Train + .2, 1], [T(24) - .1, 1], [T(24) + .5, 0]],
  doorAt: T(25), openK: [[0, 1], [142.4, 1], [143.4, 0], [147.7, 0], [148.7, 1]], latchK: [[0, 0], [144.0, 0], [144.7, 1], [147.0, 1], [147.4, 0]] };
const coop0 = { id: 'coop0', type: 'brick_coop', pos: [0, 0, 0], anim: 'none', params: { full: true, link: 'coop0' } };
const coop = { id: 'coop', type: 'brick_coop', pos: [0, 0, 0], anim: 'none', params: coopP };
const puddle = { id: 'puddle', type: 'water_puddle', pos: [-1.75, 0, 1.25], anim: 'none', params: { r: .28, to: [-.85, 0, 1.0], flowK: [[T(5) + .9, 0], [T(6) - .4, 1]] } };
const nests = { id: 'nests', type: 'nest_row', pos: [NX, F0, NZ], anim: 'none', params: { n: 3, bench: .25, h: .4, shade: .78, eggBox: 0, eggsK: [[0, 0], [T(25), 2]] } };

// ---- hands: [t, x,y,z, f(3), u(3), pose, ease]
const hk = (arr, t, P, f, u, pose, e) => arr.push([r3(t), ...R3(P), ...R3(norm(f)), ...R3(norm(u)), pose, ...(e ? [e] : [])]);
const hand = (id, side, track, o = {}) => ({ id, type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side, link: id, skin: '#94624a', track, ...o } });
// line 8: course 8, front wall. j3 (x -.595) lands 46.38-47.38 under the left palm; the trowel (blade = anchor) taps j4 (x -.335), then the joint
const TOP8 = F0 + 9 * CH, ZW = Dp / 2 - Tw / 2, J3 = [-1.5 + .125 + .26 * 3, TOP8, ZW], J4 = [-1.5 + .125 + .26 * 4, TOP8, ZW];
const HB = [], fB = [1, 0, -.25], uB = [0, 1, 0];
hk(HB, 0, [-1.5, 1.3, 1.7], fB, uB, 'open'); hk(HB, T(8) + .1, [-1.1, 1.15, 1.4], fB, uB, 'open'); hk(HB, 46.0, add(J3, [0, .06, 0]), fB, uB, 'flat');
hk(HB, 46.38, add(J3, [0, .044, 0]), fB, uB, 'flat'); hk(HB, 47.38, add(J3, [0, .004, 0]), fB, uB, 'flat'); hk(HB, 48.4, add(J3, [0, .004, 0]), fB, uB, 'flat');
hk(HB, 49.2, [-1.0, 1.1, 1.3], fB, uB, 'open'); hk(HB, T(9) + .4, [-1.6, 1.4, 1.9], fB, uB, 'open');
const handB = hand('handB', 'L', HB, { anchor: 'palm' });
const HW = [], fW = [-1, -.08, .12], uW = [0, 1, 0], JNT = [J4[0] - .13, TOP8, ZW];
hk(HW, 0, [.5, 1.35, 1.8], fW, uW, 'fist'); hk(HW, T(8) + .1, [.25, 1.2, 1.5], fW, uW, 'fist'); hk(HW, 47.4, add(J4, [.08, .1, .05]), fW, uW, 'fist');
hk(HW, 48.12, J4, fW, uW, 'fist'); hk(HW, 48.4, add(J4, [0, .03, 0]), fW, uW, 'fist'); hk(HW, 48.56, J4, fW, uW, 'fist', 'in'); hk(HW, 48.82, add(J4, [0, .025, 0]), fW, uW, 'fist');
hk(HW, 48.98, J4, fW, uW, 'fist', 'in'); hk(HW, 49.5, JNT, fW, uW, 'fist'); hk(HW, 49.95, add(JNT, [-.015, 0, 0]), fW, uW, 'fist'); hk(HW, 50.5, [-.1, 1.05, 1.3], fW, uW, 'fist');
hk(HW, T(9) + .4, [.6, 1.4, 2.0], fW, uW, 'fist');
const handW = hand('handW', 'R', HW, { trowelK: [[0, 1]] });
// line 12: the right palm brings the mesh in (rides its plane, 4 mm off) and presses it into the left vent; fingers up, palm toward +x
const meshX = t => { const s = clamp((t - 68.3) / 1.7), mk = sEase(s); return -(W / 2 + .003 + (1 - sEase(clamp(mk * 1.25))) * .3); };
const HM = [], fM = [0, 1, 0], uM = [-1, 0, 0], VY = (VENT.y0 + VENT.y1) / 2;
hk(HM, 0, [-2.5, 1.0, .7], fM, uM, 'open'); hk(HM, T(12), [-2.4, 1.1, .6], fM, uM, 'open'); hk(HM, 68.1, [meshX(68.3) - .004, VY - .05, -.08], fM, uM, 'flat');
for (let t = 68.3; t <= 69.8; t += .3) hk(HM, t, [meshX(t) - .004, VY - .05, -.08], fM, uM, 'flat');
hk(HM, 70.3, [meshX(71) - .004, VY + .04, -.28], fM, uM, 'flat'); hk(HM, 70.9, [meshX(71) - .004, VY - .06, .26], fM, uM, 'flat');
hk(HM, 71.5, [meshX(71) - .004, VY - .06, .26], fM, uM, 'flat'); hk(HM, 72.3, [-2.3, 1.0, .8], fM, uM, 'open');
const handM = hand('handM', 'R', HM, { anchor: 'palm' });
// line 14: the hammer face on the front edge of the first nest divider (three blows: cocked wind-up, accelerating 'in' strike, rebound)
const NP = [BOX(0) + .18, NB + .2, NZ + .19 + .003], fH = [.4, 0, -.92], fWind = [.35, .55, -.76], uH = [-.92, 0, -.4], HH = [];
hk(HH, 0, add(NP, [.4, .3, .7]), fWind, uH, 'fist'); hk(HH, T(14) + .6, add(NP, [.15, .12, .25]), fWind, uH, 'fist');
[79.2, 80.1, 81.0].forEach(h => { hk(HH, h - .5, add(NP, [-.06, .09, .12]), fWind, uH, 'fist'); hk(HH, h, NP, fH, uH, 'fist', 'in'); hk(HH, h + .12, add(NP, [-.004, .01, .006]), fH, uH, 'fist'); });
hk(HH, 82.0, add(NP, [.3, .25, .5]), fWind, uH, 'fist');
const handH = hand('handH', 'R', HH, { hammerK: [[0, 1]] });
// line 17: palm presses the straw cup in box 2 (2 cm into the straw, three presses)
const SC = [BOX(2), FLOOR, NZ + .02], fS = [-.7, -.3, -.65], uS = [0, 1, -.3], HS = [];
hk(HS, 0, [-.1, 1.0, .45], fS, uS, 'open'); hk(HS, T(17) + .3, [-.25, .85, .2], fS, uS, 'open'); hk(HS, 94.1, add(SC, [0, .09, .05]), fS, uS, 'flat');
[[94.6, 0, 0], [95.4, .03, .02], [96.3, -.03, -.02]].forEach(([t, dx, dz], i) => { hk(HS, t, add(SC, [dx, -.01, dz]), fS, uS, 'flat'); hk(HS, t + .4, add(SC, [dx, .02, dz]), fS, uS, 'flat'); });
hk(HS, 97.3, [-.25, .8, -.25], fS, uS, 'open'); hk(HS, T(18) + .2, [.2, 1.1, .5], fS, uS, 'open');
const handS = hand('handS', 'R', HS, { anchor: 'palm' });
// line 21: palm pressed flat into the new litter (top at 30.6 cm), sinks 2 cm
const LP = [.25, LIT, -.2], fL = [-.7, -.3, .7], uL = [0, 1, 0], HL = [];
hk(HL, 0, [1.0, 1.2, -.6], fL, uL, 'open'); hk(HL, T(21) + 2.6, [.75, .8, -.55], fL, uL, 'open'); hk(HL, 118.9, add(LP, [0, .1, 0]), fL, uL, 'flat');
hk(HL, 119.3, LP, fL, uL, 'flat'); hk(HL, 119.8, add(LP, [0, -.02, 0]), fL, uL, 'flat'); hk(HL, 120.3, add(LP, [0, .03, 0]), fL, uL, 'flat'); hk(HL, 120.8, [.9, .9, -.7], fL, uL, 'open');
const handL = hand('handL', 'R', HL, { anchor: 'palm' });
// line 26: fingers round the door's free edge (grip axis vertical), swing it shut; then the palm slides the bolt knob home
const O = [.555, F0 + .005, Dp / 2 + .012], dw = .59, dh = 15 * CH - .01, BY = dh * .5, rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const EG = [dw - .012, dh * .62, 0], fDg = [-1, 0, 0], uDg = [0, 0, 1], a0 = -1.6, edge = a => add(O, rotY(EG, a)), KNOB = k => add(O, [dw - .07 + .05 * k - .006, BY, .046 - .01]), HD = [];
hk(HD, 0, [1.7, .8, 2.4], rotY(fDg, a0), rotY(uDg, a0), 'open'); hk(HD, 141.9, add(edge(a0), [.12, .02, .15]), rotY(fDg, a0), rotY(uDg, a0), 'open');
hk(HD, 142.3, edge(a0), rotY(fDg, a0), rotY(uDg, a0), 'grip'); hk(HD, 143.4, edge(0), fDg, uDg, 'grip'); hk(HD, 143.55, edge(0), fDg, uDg, 'grip');
hk(HD, 143.95, KNOB(0), [0, 1, 0], [-1, 0, 0], 'press'); hk(HD, 144.7, KNOB(1), [0, 1, 0], [-1, 0, 0], 'press'); hk(HD, 145.4, add(KNOB(1), [.3, .05, .4]), [0, 1, 0], [-1, 0, 0], 'open');
hk(HD, T(27), [1.8, .8, 2.5], [0, 1, 0], [-1, 0, 0], 'open');
const handD = hand('handD', 'R', HD, { anchor: 'grip', grabs: [
  { obj: 'coop:door', k: [[142.2, 0], [142.3, 1], [143.4, 1], [143.5, 0]], f: fDg, u: uDg, at: EG, s: 0, off: [0, 0, 0], pose: 'grip' },
  { obj: 'coop:bolt', k: [[143.9, 0], [144.0, 1], [144.7, 1], [144.8, 0]], f: [0, 1, 0], u: [-1, 0, 0], at: [-.006, 0, -.01], s: 0, off: [0, 0, 0], pose: 'press' }] });
// line 29: the hand slides under the sitting hen in box 2, cups the egg and draws it out; then presents it in the doorway light
const EGG = [BOX(2), FLOOR - .005, NZ + .05], eggC = add(EGG, [0, .021, 0]), palmAt = c => add(c, [0, -.023, 0]);
const FS = [.45, -.38, -.81], UPD = [0, -1, 0], P5 = [.75, .85, .7], F5 = [-1, 0, -.2], HE = [];
hk(HE, 0, add(palmAt(eggC), mul(norm(FS), -1.0)), FS, UPD, 'slide'); hk(HE, T(29), add(palmAt(eggC), mul(norm(FS), -1.0)), FS, UPD, 'slide');
hk(HE, Thand - .5, add(palmAt(eggC), mul(norm(FS), -.5)), FS, UPD, 'slide'); hk(HE, Thand + .3, add(palmAt(eggC), mul(norm(FS), -.14)), FS, UPD, 'slide');
hk(HE, Tunder + .5, palmAt(eggC), FS, UPD, 'slide'); hk(HE, Tpull - .05, palmAt(eggC), FS, UPD, 'cup');
const Tgrab = Tpull - .05;
hk(HE, Tpull + .7, add(add(palmAt(eggC), mul(norm(FS), -.2)), [0, .08, 0]), FS, UPD, 'cup'); hk(HE, T29b + .3, palmAt(P5), F5, UPD, 'cup'); hk(HE, D, palmAt(add(P5, [0, .01, 0])), F5, UPD, 'cup');
const handE = hand('handE', 'R', HE, { anchor: 'palm' });
const egg = { id: 'egg', type: 'lay_egg', pos: [0, 0, 0], anim: 'none', params: { show: [T(28) + 4.6, D], path: [[0, EGG], [Tgrab + .05, 'hand:handE']], blend: .25, rotY: .3,
  wetK: [[0, 1], [D, 1]], warmK: [[0, 0], [T29b - .3, 0], [T29b + .6, 1], [D, 1]] } };

// ---- the farmer with the steel tape (line 1): walks the front string line, tape hooked on the corner peg
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, seed: 6, link: 'farmer', track: [
  [T(1), -2.0, 0, 1.55, PI / 2, 'stand'], [7.3, -2.0, 0, 1.55, PI / 2, 'stand'], [12.3, 1.5, 0, 1.55, null, 'walk', 'walk'], [12.6, 1.5, 0, 1.55, PI / 2, 'stand'],
  [14.2, 1.5, 0, 1.55, PI / 2, 'stand'], [17.6, 3.7, 0, 3.1, null, 'walk', 'walk'], [D, 3.7, 0, 3.1, null, 'stand']] } };
const tape = { id: 'tape', type: 'tape_line', pos: [0, 0, 0], anim: 'none', params: { from: [-1.8, .03, 1.3], link: 'farmer', side: 'R', onK: [[0, 1], [12.7, 1], [12.8, 0]] } };

// ---- hens [t, x, z, act, yaw, y]. Fayoumi: silver-white hackle, pencilled grey-buff body, red single comb, slate legs
const FAY = { pal: ['#b9b2a6', '#ece8e0', '#3a3530'], bars: '#5d574f', hackle: '#f1eee7', legC: '#7b8590', eye: '#4a2a14' };
const FAY2 = { ...FAY, pal: ['#aaa397', '#e9e4da', '#33302c'] };
const hen = (id, seed, track, o = {}) => ({ id, type: 'hen', pos: [0, 0, 0], anim: 'none', params: { height: .42 + (seed % 4) * .01, seed, look: seed % 2 ? FAY : FAY2, track, ...o } });
// ten yard hens: scattered (hook, line 1) -> a 5 x 2 grid on the footprint, 0.6 m2 each (line 2) -> crowded into a corner (line 3) -> off to the yard (line 4)
const yard = [];
for (let i = 0; i < 10; i++) { const P0 = [r3(-2.1 + (i % 5) * 1.0 + R() * .4), r3(1.75 + Math.floor(i / 5) * .8 + R() * .5)], P1 = [r3(P0[0] + (R() - .5) * .6), r3(P0[1] + R() * .5)];
  const G = [-1.2 + (i % 5) * .6, i < 5 ? -.5 : .5], C = [r3(-.85 + (i % 4) * .27 + (R() - .5) * .06), r3(-.05 + Math.floor(i / 4) * .3 + (R() - .5) * .06)], Ofs = [r3(2.8 + R() * 1.6), r3(1.8 + R() * 1.8)], d = i * .15;
  yard.push(hen('yh' + i, i + 3, [[0, ...P0, 'peck', R() * 6], [4 + R() * 2, ...P0, 'peck'], [6.7 + R() * 2, ...P1, 'idle'], [13.9 + d, ...P1, 'peck'],
    [17.0 + d, ...G, 'idle'], [17.6 + d, ...G, 'idle', 0], [18.4 + d, ...G, 'peck'], [21.9 + d * .5, ...G, 'idle'], [24.0 + d * .4, ...C, 'idle'], [24.4 + d * .4, ...C, 'peck', R() * 6],
    [27.0 + d * .5, ...C, 'idle'], [29.4 + d * .6, ...Ofs, 'idle'], [D, ...Ofs, 'peck']])); }
// inside hens (lines 10-24): on the screed, gathering at the nests, ih0 settles in box 1, five hop up the perch 25 cm apart
const IN = []; const PX = [-.5, -.25, 0, .25, .5];
IN.push(hen('ih0', 21, [[0, -.3, -.15, 'idle', .4, F0], [T(10) + 2, -.1, .05, 'preen', null, F0], [T(14) - 1, .4, .3, 'idle', null, F0], [T(15) + .4, .4, .3, 'idle', null, F0],
  [T(15) + 2.6, BOX(1), -.3, 'idle', null, F0], [T(15) + 3.0, BOX(1), -.3, 'idle', PI, F0], [T(15) + 3.7, BOX(1), NZ + .02, 'idle', null, FLOOR], [T(16) - .2, BOX(1), NZ - .01, 'idle', 0, FLOOR],
  [T(16) + .4, BOX(1), NZ - .01, 'brood', 0, FLOOR], [D, BOX(1), NZ - .01, 'brood', 0, FLOOR]], { look: FAY }));
for (let i = 1; i <= 5; i++) { const a = [-.9 + i * .38, .25 + (i % 2) * .3], nest = [BOX((i - 1) % 3) + (i > 3 ? .12 : 0), -.18 - (i % 2) * .14], pre = [PX[i - 1], .58], hop = T(18) + 1.6 + i * .55;
  IN.push(hen('ih' + i, 21 + i, [[0, ...a, 'idle', R() * 6, F0], [T(10) + 1.5 + i * .3, ...a, 'peck', null, F0], [T(15) - .2 + i * .2, ...a, 'idle', null, F0], [T(15) + 1.6 + i * .2, ...nest, 'idle', PI, F0],
    [T(16) + .5, ...nest, 'peck', null, F0], [T(16) + 2.5 + i * .2, .2 + i * .2, .2 + (i % 2) * .2, 'idle', null, F0], [T(17) + 2 + i * .2, .2 + i * .2, .2 + (i % 2) * .2, 'peck', null, F0],
    [hop - 1.1, ...pre, 'idle', null, F0], [hop - .5, ...pre, 'idle', PI, F0], [hop, PX[i - 1], .35, 'idle', null, PERCHY], [hop + .45, PX[i - 1], .35, 'idle', 0, PERCHY],
    [hop + 2, PX[i - 1], .35, 'rest', 0, PERCHY], [D, PX[i - 1], .35, 'rest', 0, PERCHY]])); }
// the hero (line 27-29): scratching in the grass by the door, walks in, hops into box 2, turns and settles to lay
const heroT = [[0, 1.35, 1.95, 'peck', -2], [T(27), 1.35, 1.95, 'peck'], [T27b + .6, 1.3, 1.9, 'peck'], [T27b + 1.4, .86, 1.36, 'idle'], [T27b + 1.7, .86, 1.36, 'idle', PI],
  [T27b + 2.1, .86, 1.05, 'idle', null, F0], [T27b + 2.6, .82, .72, 'idle', null, LIT], [T(28) + 1.9, BOX(2), -.25, 'idle', null, LIT], [T(28) + 2.2, BOX(2), -.25, 'idle', PI, LIT],
  [T(28) + 2.8, BOX(2), NZ + .02, 'idle', null, FLOOR], [T(28) + 3.3, BOX(2), NZ - .01, 'idle', 0, FLOOR], [T(28) + 3.8, BOX(2), NZ - .01, 'brood', 0, FLOOR], [D, BOX(2), NZ - .01, 'brood', 0, FLOOR]];
const hero = hen('hen', 4, heroT, { height: .45, link: 'hen', look: FAY });
const yc = [[-2.6, .2], [-3.1, .9], [-2.3, 1.2], [-3.3, -.3]].map(([x, z], i) => hen('yc' + i, 31 + i, [[0, x, z, 'peck', i * 1.7], [T(27) + 1.5 + i * .6, x, z, 'peck'], [T(27) + 3 + i * .6, x + .3, z - .25, 'idle'], [T(27) + 3.6 + i * .6, x + .3, z - .25, 'peck'], [D, x + .3, z - .25, 'peck']]));
const inside2 = [[.3, .1], [-.1, .45]].map(([x, z], i) => hen('in' + i, 41 + i, [[0, x, z, 'peck', 1 + i, LIT], [T(28) + 2, x - .1, z + .05, 'idle', null, LIT], [T(28) + 3, x - .1, z + .05, 'peck', null, LIT], [D, x - .1, z + .05, 'peck', null, LIT]]));

// ---- the yard (real models first)
const world = [
  { id: 'yard', type: 'coop_floor', pos: [0, 0, .6], params: { w: 7.6, d: 6.4, yard: true }, anim: 'none' },
  { id: 'bricks', type: 'custom', pos: [-2.75, 0, -1.75], rotY: .3, anim: 'none', params: { parts: Array.from({ length: 24 }, (_, k) => ({ shape: 'box', size: [.25, .065, .12],
    pos: [-.13 + (k % 2) * .26, .0325 + Math.floor(k / 4) * .068, -.065 + (Math.floor(k / 2) % 2) * .13], color: ['#a4553a', '#9b4d33', '#ad5f40'][k % 3], rough: .9 })) } },
  glb('sack', 'medieval_village_pack/Bag', [-3.0, 0, -.95], .55, {}, { rotY: 1.2 }), glb('sack2', 'medieval_village_pack/Bag', [-3.25, 0, -1.25], .5, {}, { rotY: 2.3 }),
];
[[-5.2, -4.4, 9], [-6.4, -1.0, 10.5], [-5.6, 3.0, 8], [6.4, -5.8, 9.5], [3.6, -7.2, 8.5], [7.2, 1.2, 9]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, [x, 0, z], h, { sway: .01, ph: i }, { rotY: i * 1.9 })));
[[-3.6, -2.6, .9, 'nature_pack/Bush_1'], [3.4, -2.4, .8, 'ph/shrub_02'], [-4.2, 2.2, .7, 'ph/shrub_01'], [4.4, 2.6, .6, 'ph/shrub_01'], [-3.4, 3.4, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, [x, 0, z], h, { sway: .015, ph: i * 2 }, { rotY: i * 1.3 })));
// grass: a patch in the left yard and by the door (where the hens scratch in line 27), the rest round the site edges
for (let i = 0, n = 0; i < 900 && n < 46; i++) { const x = -7 + R() * 14, z = -4 + R() * 10.5, inL = x > -3.8 && x < -2.0 && z > -.7 && z < 1.7, inD = x > 1.25 && x < 2.3 && z > 1.6 && z < 2.5;
  if (!inL && !inD && Math.abs(x) < 3.9 && z > -3 && z < 3.8) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass_Short', 'nature_pack/Grass', 'nature_pack/Grass_2'][n % 3], [r3(x), 0, r3(z)], r3(inL || inD ? .14 + R() * .1 : .3 + R() * .25), { sway: .03, ph: n }, { rotY: R() * 6 })); n++; }

// ---- beats (one new angle or a new state each, about one per 5 s)
const b = [];
// 0 hook: the finished brick coop in the yard, hens in front of it; 9 m, slow push-in (the 3 m house only fits the 9:16 frame from ~7.5 m)
b.push({ t: 0, kind: 'intro', add: [...world, coop0, ...yard], camera: { target: [0, 1.0, .4], dist: 9, elev: .22, az: .35, push: .16 } });
// 1 the farmer walks the front line with the tape hooked on the corner peg, the string runs out behind him (he walks toward the camera)
b.push({ t: T(1), kind: 'info', remove: ['coop0'], add: [farmer, coop, tape], camera: { target: [-.3, .8, 1.45], dist: 4.6, elev: .18, az: 1.38 } });
// 2 from above: the hens spread out over the footprint, one per 0.6 m2
b.push({ t: T(2), kind: 'info', camera: { target: [0, .2, 0], dist: 6.2, elev: 1.3, az: PI / 2, spin: .25 } });
// 3 too small: crowded in a corner, pecking at each other
b.push({ t: T(3), kind: 'problem', camera: { target: [-.5, .25, .25], dist: 2.6, elev: .5, az: .3 } });
// 4 the raised base: the plinth rises course by course, the screed is drawn over it
b.push({ t: T(4), kind: 'info', remove: ['farmer', 'tape'], camera: { target: [0, .2, 0], dist: 6.6, elev: .45, az: -.6 } });
// 5 rain: the puddle by the base runs away from it (low)
b.push({ t: T(5), kind: 'solution', remove: yard.map(h => h.id), add: [puddle], camera: { target: [-1.6, .15, 1.2], dist: 2.6, elev: .1, az: -.5 } });
// 6 trench round the base, the galvanised apron laid in
b.push({ t: T(6), kind: 'solution', remove: ['puddle'], camera: { target: [1.2, .1, .9], dist: 3.6, elev: .7, az: .75 } });
// 7 the walls go up course by course
b.push({ t: T(7), kind: 'info', camera: { target: [0, .9, 0], dist: 7.4, elev: .32, az: .5 } });
// 8 close: a palm sets a brick into its bed, the trowel taps the next and strikes the joint
b.push({ t: T(8), kind: 'info', add: [handB, handW], camera: { target: [-.47, .91, .95], dist: .95, elev: .35, az: .3 } });
// 9 side profile: the sun-side front wall rises higher than the back
b.push({ t: T(9), kind: 'info', remove: ['handB', 'handW'], camera: { target: [0, 1.0, 0], dist: 7.2, elev: .12, az: 1.72 } });
// 10 stale humid haze inside (over the wall)
b.push({ t: T(10), kind: 'problem', add: IN, camera: { target: [0, .6, 0], dist: 4.3, elev: .9, az: .3, spin: .2 } });
// 11 vents high in two opposite walls: the breeze streams through, the haze clears (looking in through the left vent)
b.push({ t: T(11), kind: 'solution', camera: { target: [0, 1.5, 0], dist: 4.6, elev: .08, az: -1.32 } });
// 12 the fine mesh is brought in on the palm and pressed into the vent
b.push({ t: T(12), kind: 'info', add: [handM], camera: { target: [-1.55, 1.5, 0], dist: 2.1, elev: .12, az: -1.05 } });
// 13 the low vent: the shutter slides open, air comes in low
b.push({ t: T(13), kind: 'solution', remove: ['handM'], camera: { target: [-.95, .36, 1.0], dist: 1.5, elev: .14, az: .2 } });
// 14 three nest boxes on the back wall, nailed (inside, from the right)
b.push({ t: T(14), kind: 'info', add: [handH], camera: { target: [-.9, .66, -.55], dist: 1.3, elev: .35, az: 1.2 } });
// 15 one box for four or five hens: the hens gather at the boxes (over the front wall)
b.push({ t: T(15), kind: 'info', remove: ['handH'], camera: { target: [-.6, .55, -.45], dist: 2.4, elev: .85, az: .2 } });
// 16 quiet and dim: a hen settles in the middle box
b.push({ t: T(16), kind: 'info', camera: { target: [-.75, .62, -.62], dist: .95, elev: .12, az: .3, push: .08 } });
// 17 soft straw: a palm presses the straw cup in the next box
b.push({ t: T(17), kind: 'info', add: [handS], camera: { target: [-.42, .56, -.6], dist: .95, elev: .5, az: .3 } });
// 18 the perch drops onto its trestles, the hens hop up
b.push({ t: T(18), kind: 'info', remove: ['handS'], camera: { target: [0, .75, .3], dist: 4.8, elev: .62, az: .5, spin: .18 } });
// 19 along the perch: 25 cm per hen
b.push({ t: T(19), kind: 'info', camera: { target: [-.05, .9, .35], dist: 1.25, elev: .2, az: 1.15, spin: .1 } });
// 20 perch at the front, nests at the back (high, looking down)
b.push({ t: T(20), kind: 'solution', camera: { target: [-.2, .5, -.1], dist: 4.5, elev: 1.0, az: .45 } });
// 21 litter spread across the floor, a palm pressed into it
b.push({ t: T(21), kind: 'info', add: [handL], camera: { target: [.25, .32, -.2], dist: 2.6, elev: 1.0, az: .8, push: .25 } });
// 22 damp litter darkens, a fresh layer goes over it
b.push({ t: T(22), kind: 'solution', remove: ['handL'], camera: { target: [0, .3, 0], dist: 3.8, elev: 1.15, az: -.5 } });
// 23 the plank roof lowers onto the rafters at its slope
b.push({ t: T(23), kind: 'info', camera: { target: [0, 1.3, 0], dist: 7.4, elev: .42, az: .75 } });
// 23b rain runs down the roof and drips off the low back edge, away from the walls
b.push({ t: Train, kind: 'solution', camera: { target: [-.3, 1.2, -1.3], dist: 3.6, elev: .1, az: -1.15 } });
// 24 the overhang shades the front wall (low, looking up)
b.push({ t: T(24), kind: 'info', camera: { target: [-.3, 1.55, 1.15], dist: 3.2, elev: -.06, az: .2 } });
// 25 the door is hung on its hinges, open on the nests inside
b.push({ t: T(25), kind: 'info', remove: IN.map(h => h.id), camera: { target: [.75, .85, .8], dist: 3.0, elev: .18, az: .45, spin: .16 } });
// 26 a hand pulls it shut by its edge and slides the bolt home
b.push({ t: T(26), kind: 'solution', add: [handD], camera: { target: [.8, .8, 1.25], dist: 1.6, elev: .15, az: .45 } });
// 27 hens scratching in the grass of the yard (from the back-left; the door side is hidden while it opens)
b.push({ t: T(27), kind: 'info', remove: ['handD'], add: [hero, ...yc, ...inside2], camera: { target: [-2.7, .3, .5], dist: 4.5, elev: .28, az: -1.9 } });
// 27b the hero scratches by the open door, then walks in
b.push({ t: T27b, kind: 'info', camera: { target: [1.05, .35, 1.55], dist: 2.3, elev: .22, az: .45 } });
// 28 inside: she crosses the litter, hops into the strawed box and settles
b.push({ t: T(28), kind: 'info', camera: { target: [-.25, .5, -.2], dist: 1.65, elev: .55, az: .9 } });
// 29 she lays: the hand slides under her and draws out the egg
b.push({ t: T(29), kind: 'info', add: [handE, egg], camera: { target: [-.4, .6, -.55], dist: .85, elev: .3, az: .6 } });
// 29b the warm egg in the palm, in the doorway light
b.push({ t: T29b, kind: 'info', camera: { target: add(P5, [0, .02, 0]), dist: .45, elev: .25, az: .15 } });
// 30 CTA: slow orbit round the finished coop
b.push({ t: T(30), kind: 'info', remove: ['handE', 'egg'], camera: { preset: 'orbit', target: [0, 1.0, .1], dist: 8, elev: .3, az: .4 } });
// the nest row arrives with line 14 (spawned just before the cut, while the camera is outside on the low vent)
b.push({ t: T(14) - .5, kind: 'info', merge: true, add: [nests] });

const merged = b.filter(x => !x.merge), extra = b.filter(x => x.merge);
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي تعمل بيت دجاج متكامل بعشش وتهوية',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 42,
  env: { island: { w: 16, d: 15, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [1.0, .94, .86], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 42, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .5, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: false, handheld: .6 },
  beats: merged.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
// objects that must spawn mid-beat: attach to the beat that holds that time, with a delay
for (const x of extra) { const bt = plan.beats.find(q => x.t >= q.start && x.t < q.end); bt.add = [...bt.add, ...x.add.map(o => ({ ...o, delay: r3(x.t - bt.start) }))]; }
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
