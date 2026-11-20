// "إزاي تصنع قفص حمام قوي من خشب وسلك، من غير ما تدفع فلوس في قفص جاهز؟!" (voice-over 2026-11-20, 9 lines, 51.0 s). An Egyptian village yard
// in daylight (straw-dust yard, mud-plaster coop, palms, Nile horizon). The hero is a home-built pigeon cage: 1.2 x 0.6 x 0.9 m of planed pine on
// red-brick piers, with blue-bar domestic pigeons (iridescent green-purple neck, pale grey wings with two black bars, red legs, 33 cm).
// Every line is shown by objects and actions, no words: the finished cage (hook), posts rise on the brick piers, braces swing in and a hand
// tests the corner, boards slide in one by one with 1.2 cm gaps, a down feather drifts in through a gap, a low shot under the raised floor as a
// puddle runs away, the sloped roof lowers into place and rain runs off its low edge, the welded mesh is unrolled by hand and pulled taut, nails
// are hammered in one at a time, a pigeon stops a few cm behind the taut wire, the door is pushed shut and the barrel bolt slid home, CTA orbit.
// 1x improvement over the last video (hen_laying):
//  - Motion: hammer blows with a cocked wind-up and an accelerating strike ('in' ease on the hand track) that drives each nail flush; a hand
//    that rides the mesh roll (grip on the roll, no slip) while the slack mesh bulge pulls flat; door closed by a palm that follows the leaf
//    and a bolt slid by the palm; boards and frame pieces that slide in and settle with a small bounce; pigeons walk with the real
//    hold-then-thrust head bob and a waddle synced to ground distance (no sliding feet), peck and coo (neck puff and bow).
//  - Graphics: the hand gets skin folds over every finger joint, joint swells, cuticles, lunulae and white nail edges, extensor tendons and
//    veins (the "toy hand" fix); iridescent neck feathers (thin-film iridescence + a view-angle green/purple shift), scalloped feather maps;
//    galvanised welded mesh with weld spots, red brick piers with mortar beds, rain streaks and running beads, a wet darkening roof.
//  - Realism: real sizes (cage 1.2 x 0.6 x 0.9 m, posts 6 cm, braces 4 x 2.8 cm at 45 degrees, boards 13.8 cm with 1.25 cm gaps, mesh 1 cm,
//    bricks 25 x 12 x 6.5 cm, roof falls 8 cm, door 32 x 38 cm, hammer 33 cm, pigeons 33 cm, farmer 1.75 m); a raised floor and a sloped roof.
// Contact: palms ride OC grips on the roll, the door leaf and the bolt knob (0 m by construction); the test palm is keyed onto the post top;
// the hammer face is keyed onto each nail head; the left palm is keyed onto the mesh plane (probe numbers in the report). Feet: pigeons at the
// floor/ground height of the track, farmer y 0. Stickers: none (the engine's own check icons mark the fix beats).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const s = S[Math.min(i, S.length - 1)], ws = s.words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : s.start + (s.end - s.start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'none', ...more });
const r3 = v => Math.round(v * 1000) / 1000, R3 = a => a.map(r3), PI = Math.PI;
const add = (a, b) => a.map((x, i) => x + b[i]), mul = (a, k) => a.map(x => x * k), norm = a => mul(a, 1 / Math.hypot(...a));
const R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(31);

// ---- times from the voice
const T1 = at(1), Tzaw = word(1, /زوايا/, .6), Turuq = word(1, /عروق/, .7), T2 = at(2), Tgap = word(2, /والمسافة/, .6), T3 = at(3);
const T4 = at(4), Train = word(4, /المطر/, .6), T5 = at(5), Tpull = word(5, /بتشد/, .15), Tfix = word(5, /وتثبته/, .45), T6 = at(6);
const T7 = at(7), Tput = word(7, /وتحط/, .35), Tlock = word(7, /قفل/, .5), Tpg = word(7, /الحمام/, .65), T8 = at(8);

// ---- cage geometry (mirrors PGC in renderer/scene.js)
const L = 1.2, Dp = .6, H = .9, HB = .82, PH = .21, PW = .06, FY = PH + .06 + .018, ZF = Dp / 2 - PW / 2, XP = L / 2 - PW / 2, MZ = Dp / 2 + .002;
const DOOR = { x0: .13, x1: .45, y0: FY + .03, y1: FY + .41 }, dw = DOOR.x1 - DOOR.x0, dh = DOOR.y1 - DOOR.y0, BY = dh * .5;
// nails through the mesh into the front frame: 3 hammered on camera along the top rail, the rest round the frame just before line 6
const NAILS = [[-.42, PH + H - .03], [-.27, PH + H - .03], [-.12, PH + H - .03]];
const nailRest = [[.03, PH + H - .03], [.2, PH + H - .03], [.38, PH + H - .03], [-XP, PH + .7], [-XP, PH + .4], [-XP, PH + .12], [XP, PH + .7], [XP, PH + .4], [XP, PH + .12],
  [-.3, PH + .03], [0, PH + .03], [.3, PH + .03]];
const HITS = [Tfix + .55, Tfix + 1.45, Tfix + 2.35];
const nailPts = [...NAILS, ...nailRest], nailT = [...HITS, ...nailRest.map((_, i) => T6 + .1 + i * .03)];
const cageP = { link: 'cage', nailPts, nailT,
  frameK: [[T1 + .25, 0], [T1 + 3.4, 1.1]], braceK: [[Tzaw + .2, 0], [Turuq + .9, 1.2]], boards: [T2 + .75, .19, .45], featherK: [[Tgap + .7, 0], [T3 - .1, 1]],
  roofK: [[T4 + .25, 0], [T4 + 1.7, 1]], rainK: [[Train - .5, 0], [Train, 1], [T5 - .1, 1], [T5 + .5, 0]], meshK: [[Tpull - .1, 0], [Tfix - .25, 1]], tautK: [[Tfix - .7, 0], [Tfix + .2, 1]],
  shakeK: [[Turuq + 1.0, 0], [Turuq + 1.1, 1], [T2 - .05, 1], [T2 + .3, 0]], doorAt: T7 + .1, openK: [[0, 1], [Tput - .1, 1], [Tput + .8, 0]], latchK: [[Tlock + .05, 0], [Tlock + .65, 1]] };
const cage0 = { id: 'cage0', type: 'pigeon_cage', pos: [0, 0, 0], anim: 'none', params: { full: true, link: 'cage0', nailPts } };
const cage = { id: 'cage', type: 'pigeon_cage', pos: [0, 0, 0], anim: 'none', params: cageP };
const puddle = { id: 'puddle', type: 'water_puddle', pos: [0, 0, 0], anim: 'none', params: { r: .3, to: [.75, 0, .6], flowK: [[T3 + 1.9, 0], [T4 - .4, 1]] } };

// ---- hands: [t, x,y,z, f(3), u(3), pose, ease]; palm / grip / hammer-face anchors
const hk = (arr, t, P, f, u, pose, e) => arr.push([r3(t), ...R3(P), ...R3(norm(f)), ...R3(norm(u)), pose, ...(e ? [e] : [])]);
const hand = (id, side, track, o = {}) => ({ id, type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side, link: id, skin: '#94624a', track, ...o } });
// line 1: the test palm flat on the front-left post top, pushing twice toward the corner (the braced frame stays put)
const TOP = [-.55, PH + H + .002, .262], fT = [-.85, 0, -.5], uT = [0, 1, 0], HT = [];
hk(HT, 0, add(TOP, [.6, .3, .5]), fT, uT, 'open'); hk(HT, Turuq + .3, add(TOP, [.3, .14, .2]), fT, uT, 'open'); hk(HT, Turuq + .95, TOP, fT, uT, 'flat');
[[0, Turuq + 1.2], [1, Turuq + 1.45], [0, Turuq + 1.7], [1, Turuq + 1.95]].forEach(([k, t]) => hk(HT, t, add(TOP, [k ? 0 : -.012, 0, k ? 0 : -.007]), fT, uT, 'flat'));
hk(HT, T2 + .6, add(TOP, [.35, .2, .3]), fT, uT, 'open');
const handT = hand('handT', 'R', HT, { anchor: 'palm' });
// line 5a: the left hand grips the mesh roll at the left post and walks it to the right (grip rides the roll)
const fG = [-.92, 0, -.39], uG = [.39, 0, -.92], ROLL0 = [-L / 2, PH + H * .62, MZ + .018], ROLL1 = [L / 2, PH + H * .62, MZ + .009], HG = [];
hk(HG, 0, add(ROLL0, [-.5, .2, .5]), fG, uG, 'open'); hk(HG, Tpull - .8, add(ROLL0, [-.15, .06, .2]), fG, uG, 'open'); hk(HG, Tpull - .15, ROLL0, fG, uG, 'grip');
hk(HG, Tfix - .2, ROLL1, fG, uG, 'grip'); hk(HG, Tfix + .4, add(ROLL1, [.25, .05, .25]), fG, uG, 'open');
const handG = hand('handG', 'L', HG, { anchor: 'grip', grabs: [{ obj: 'cage:roll', k: [[Tpull - .15, 0], [Tpull - .05, 1], [Tfix - .2, 1], [Tfix - .1, 0]], f: fG, u: uG, at: [0, 0, 0], s: 0, off: [0, 0, 0], pose: 'grip' }] });
// line 5b: the hammer hand (face keyed onto each nail head: cocked wind-up, accelerating blow, small rebound); the left palm holds the mesh flat
const fH = [.5, 0, -.87], fWind = [.42, .55, -.72], uH = [-.87, 0, -.5], HH = [], HL = [], fL = [-.2, .98, 0], uL = [0, 0, 1];
const head = i => [NAILS[i][0], NAILS[i][1], MZ + .0008 + .0007 + .012];   // nail head front (12 mm proud before its blow)
hk(HH, 0, add(head(0), [.5, .1, .6]), fWind, uH, 'fist'); hk(HH, Tfix - .3, add(head(0), [.16, .1, .2]), fWind, uH, 'fist');
HITS.forEach((h, i) => { const P = head(i); hk(HH, h - .5, add(P, [-.08, .08, .12]), fWind, uH, 'fist'); hk(HH, h, P, fH, uH, 'fist', 'in');
  hk(HH, h + .1, add(P, [0, 0, -.012]), fH, uH, 'fist'); hk(HH, h + .22, add(P, [-.006, .012, .002]), fH, uH, 'fist'); });
hk(HH, T6 + .3, add(head(2), [.3, .15, .4]), fWind, uH, 'fist');
const handH = hand('handH', 'R', HH, { hammerK: [[0, 1]] });
hk(HL, 0, [-.9, .7, .8], fL, uL, 'open'); hk(HL, Tfix - .4, [NAILS[0][0] - .11, PH + H - .1, MZ + .1], fL, uL, 'open'); hk(HL, Tfix, [NAILS[0][0] - .11, PH + H - .1, MZ + .004], fL, uL, 'flat');
HITS.forEach((h, i) => { if (!i) return; const x = NAILS[i][0] - .11; hk(HL, h - .75, [x - .15, PH + H - .1, MZ + .004], fL, uL, 'flat'); hk(HL, h - .55, [x, PH + H - .1, MZ + .004], fL, uL, 'flat'); });
hk(HL, T6 + .2, [NAILS[2][0] - .11, PH + H - .1, MZ + .004], fL, uL, 'flat'); hk(HL, T6 + .8, [-.9, .8, .9], fL, uL, 'open');
const handL = hand('handL', 'L', HL, { anchor: 'palm' });
// line 7: the palm closes the door (rides the leaf), then pushes the bolt knob home (rides the knob)
const a0 = -1.75, rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const DP = [dw - .035, dh * .62, .012], fDl = norm([-.3, .95, 0]), uDl = [0, 0, 1], dO = [DOOR.x0, DOOR.y0, MZ + .012];
const doorPt = a => add(dO, rotY(DP, a)), KNOB = (k) => add(dO, [dw - .045 + .032 * k - .0045, BY, .0185 + .009]), HD = [];
hk(HD, 0, add(doorPt(a0), [-.4, .1, .5]), rotY(fDl, a0), rotY(uDl, a0), 'open'); hk(HD, Tput - .9, add(doorPt(a0), [-.12, .03, .14]), rotY(fDl, a0), rotY(uDl, a0), 'open');
hk(HD, Tput - .1, doorPt(a0), rotY(fDl, a0), rotY(uDl, a0), 'flat'); hk(HD, Tput + .8, doorPt(0), fDl, uDl, 'flat'); hk(HD, Tput + .95, doorPt(0), fDl, uDl, 'flat');
hk(HD, Tlock - .05, KNOB(0), [0, 1, 0], [-1, 0, 0], 'press'); hk(HD, Tlock + .65, KNOB(1), [0, 1, 0], [-1, 0, 0], 'press'); hk(HD, Tlock + 1.4, add(KNOB(1), [.25, .06, .3]), [0, 1, 0], [-1, 0, 0], 'open');
const handD = hand('handD', 'R', HD, { anchor: 'palm', grabs: [
  { obj: 'cage:door', k: [[Tput - .2, 0], [Tput - .1, 1], [Tput + .8, 1], [Tput + .9, 0]], f: fDl, u: uDl, at: DP, s: 0, off: [0, 0, 0], pose: 'flat' },
  { obj: 'cage:bolt', k: [[Tlock - .1, 0], [Tlock + .02, 1], [Tlock + .7, 1], [Tlock + .8, 0]], f: [0, 1, 0], u: [-1, 0, 0], at: [-.0045, 0, -.008], s: 0, off: [0, 0, 0], pose: 'press' }] });

// ---- pigeons [t, x, z, act, yaw, y]
const pg = (id, seed, track, o = {}) => ({ id, type: 'pigeon', pos: [0, 0, 0], anim: 'none', params: { len: .33, seed, track: track.map(k => k.length > 5 ? k : [...k, ...(k.length === 4 ? [null] : []), FY]), ...o } });
const pA = pg('pA', 2, [[0, -.3, -.04, 'coo', .7], [T1, -.3, -.04, 'coo']]);
const pB = pg('pB', 5, [[0, .12, .1, 'idle', -.6], [1.0, .12, .1, 'idle'], [2.4, .33, -.02, 'idle'], [2.8, .33, -.02, 'peck'], [T1, .33, -.02, 'peck']]);
const pC = pg('pC', 8, [[0, -.02, .14, 'peck', .2], [T1, -.02, .14, 'peck']]);
const ground = k => [k[0], k[1], k[2], k[3], k[4] ?? null, 0];
const pY = pg('pY', 11, [[0, -.25, .85, 'peck', .4], [3.6, -.25, .85, 'peck'], [5.2, -.6, 1.05, 'idle'], [9, -.85, 1.05, 'peck'], [11.5, -1.2, .7, 'idle'], [16, -1.2, .7, 'peck'],
  [19, -1.4, 1.2, 'idle'], [26, -1.4, 1.2, 'peck'], [29, -1.0, 1.4, 'idle'], [40, -1.0, 1.4, 'peck'], [43, -.7, 1.0, 'idle'], [D, -.7, 1.0, 'peck']].map(ground), { link: 'pY' });
const pD = pg('pD', 3, [[T6, -.12, -.12, 'idle', .9], [T6 + .3, -.12, -.12, 'idle'], [T6 + 1.5, -.3, .136, 'idle'], [T6 + 1.9, -.3, .136, 'idle', 0], [D, -.3, .136, 'idle']], { link: 'pD' });
const pE = pg('pE', 6, [[T6, .3, -.1, 'peck', -.5], [T6 + 2.7, .3, -.1, 'peck'], [T6 + 3.9, .08, .03, 'idle'], [D, .08, .03, 'coo']]);
const pF = pg('pF', 9, [[T7, .36, -.12, 'idle', -.3], [Tpg - .3, .36, -.12, 'idle'], [Tpg + .7, .29, .11, 'idle'], [Tpg + 1.0, .29, .11, 'idle', 0], [D, .29, .11, 'idle']], { link: 'pF' });
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, seed: 4, link: 'farmer',
  track: [[T8 - .4, -.95, 0, .1, r3(Math.atan2(.95, -.1)), 'stand'], [D, -.95, 0, .1, r3(Math.atan2(.95, -.1)), 'stand']] } };

// ---- the yard (real models first)
const world = [
  { id: 'yard', type: 'coop_floor', pos: [0, 0, .2], params: { w: 6, d: 5, yard: true }, anim: 'none' },
  { id: 'coop', type: 'hen_coop', pos: [-.4, 0, -5.6], rotY: PI, params: { w: 3.5, t: .25, h: 2.1, zb: -2.7, zf: -.3 }, anim: 'none' },
  { id: 'lumber', type: 'custom', pos: [-1.55, 0, -.85], rotY: .25, anim: 'none', params: { parts: [0, 1, 2, 3, 4, 5].map(k => ({ shape: 'box', size: [1.3 - (k % 2) * .12, .02, .14], pos: [0, .01 + Math.floor(k / 3) * .021, -.15 + (k % 3) * .15], color: ['#d2ad7d', '#c9a274', '#d8b689'][k % 3], tex: 'wood', rough: .8 })) } },
  glb('stump', 'ph/tree_stump_01', [-1.9, 0, .45], .5), glb('axe', 'ph/hatchet', [-1.88, .46, .42], .38),
  glb('crate', 'ph/wooden_crate_01', [-1.45, 0, -2.0], .4, {}, { rotY: .4 }), glb('sack', 'medieval_village_pack/Bag', [-2.25, 0, -1.3], .55, {}, { rotY: 1.2 }),
];
[[-4.2, -4.4, 9], [-5.6, -1.4, 10.5], [-4.6, 2.4, 8], [6.8, -6.8, 9.5], [3.4, -7.4, 8.5]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, [x, 0, z], h, { sway: .01, ph: i }, { rotY: i * 1.9 })));
[[-2.6, -2.4, .9, 'nature_pack/Bush_1'], [2.9, -2.6, .8, 'ph/shrub_02'], [-3.1, 1.6, .7, 'ph/shrub_01'], [3.9, 2.4, .6, 'ph/shrub_01'], [-2.5, 3.0, .35, 'ph/rock_07']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, [x, 0, z], h, { sway: .015, ph: i * 2 }, { rotY: i * 1.3 })));
for (let i = 0, n = 0; i < 600 && n < 34; i++) { const x = -6 + R() * 12, z = -3 + R() * 9;
  if (Math.abs(x) < 3.2 && z > -1.6 && z < 3.4) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], [r3(x), 0, r3(z)], r3(.3 + R() * .25), { sway: .03, ph: n }, { rotY: R() * 6 })); n++; }

// ---- beats (a new angle or a new state in each, about one per 4-5 s)
const b = [];
// 0 hook: the finished cage in the yard, pigeons inside, one pecking outside; 3.4 m, slow push-in to ~3 m
b.push({ t: 0, kind: 'intro', add: [...world, cage0, pA, pB, pC, pY], camera: { target: [0, .62, .05], dist: 3.4, elev: .14, az: .2, push: .1 } });
// 1 the frame: four posts rise on the brick piers, rails and the slatted floor (3/4 from above)
b.push({ t: T1, kind: 'info', remove: ['cage0', 'pA', 'pB', 'pC'], add: [cage], camera: { target: [0, .6, 0], dist: 3.3, elev: .34, az: .55 } });
// 2 the braces swing into the corners; a palm on the post top pushes twice, the frame stays put (close, front-left corner)
b.push({ t: Tzaw, kind: 'solution', add: [handT], camera: { target: [-.46, PH + H - .2, .18], dist: 1.3, elev: .2, az: -.55, push: .06 } });
// 3 the boards slide in one by one, small gaps between them (front, high, looking at the back wall)
b.push({ t: T2, kind: 'info', remove: ['handT'], camera: { target: [-.05, .66, -.08], dist: 3.05, elev: .3, az: -.2 } });
// 4 close on the centre gap of the back wall: daylight through it, a down feather drifts in (camera inside the open front)
b.push({ t: Tgap, kind: 'info', camera: { target: [0, PH + .46, -.3], dist: .95, elev: .12, az: .05, spin: .05 } });
// 5 low: the floor stands 21 cm off the ground on the brick piers; the puddle under it runs away
b.push({ t: T3, kind: 'solution', add: [puddle], camera: { target: [.28, .2, .15], dist: 2.0, elev: .04, az: .55 } });
// 6 side profile: the roof lowers at its slope; rain runs down the planks and drips off the low back edge
b.push({ t: T4, kind: 'solution', remove: ['puddle'], camera: { target: [.15, .98, -.05], dist: 2.7, elev: .1, az: 1.35 } });
// 7 the mesh is unrolled from the left post by hand and pulled taut (front-left)
b.push({ t: T5, kind: 'info', add: [handG], camera: { target: [0, .72, .3], dist: 3.1, elev: .15, az: -.4 } });
// 8 the nails go in one at a time along the top rail, the left palm holds the mesh flat (close, from the right)
b.push({ t: Tfix, kind: 'info', remove: ['handG'], add: [handH, handL], camera: { target: [-.31, PH + H - .07, .3], dist: .9, elev: .18, az: .6, spin: .06 } });
// 9 the taut wire close up: a pigeon walks up and stops a few cm behind it, never touching
b.push({ t: T6, kind: 'solution', remove: ['handH', 'handL'], add: [pD, pE], camera: { target: [-.3, FY + .16, .27], dist: .8, elev: .1, az: .35, push: .06 } });
// 10 the small door is pushed shut and the bolt slid home; a pigeon comes to the closed door
b.push({ t: T7, kind: 'solution', add: [handD, pF], camera: { target: [.29, FY + .22, .33], dist: 1.2, elev: .12, az: .3, push: .1 } });
// 11 CTA: slow orbit round the finished cage, the farmer beside it
b.push({ t: T8, kind: 'info', remove: ['handD'], add: [farmer], camera: { preset: 'orbit', target: [-.1, .7, 0], dist: 4.2, elev: .26, az: .35 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي تصنع قفص حمام قوي من خشب وسلك',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 42,
  env: { island: { w: 14, d: 13, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [1.0, .94, .86], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 40, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, motes: .5, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: false, handheld: .6 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
