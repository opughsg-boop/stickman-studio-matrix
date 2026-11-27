// "ليه الحمار بيشيل أحمال تقيلة كده من غير ما يتعب؟!" (voice-over 2026-11-26, 8 lines, 33.6 s, one take). Real-sky island of Delta farmland:
// a trodden dirt track across the front (the hook donkey walks it loaded), a trampled yard behind it (pile of jute sacks, the work donkey
// in its pack saddle, the farmer), a wooden water trough under a shade tree on the right, palms and shrubs round the edge.
// Every spoken line is shown, never written (no digits, signs or labels):
//  1 hook: a loaded donkey walks the track toward the camera, sacks swinging with each step; ring on the sacks
//  2 it walks past (natural weight, slows to a stop); a warm striated glow lights the back, loin, thighs and forearms (the muscles);
//    point-down on the back, then a ring round the hind legs
//  3 the farmer squats at the pile, lifts a sack, turns, heaves it onto the empty side of the saddle; the tilted saddle comes level; check;
//    he pats the donkey's neck
//  4 ring round the even two-sack load (the comfortable share); he fetches one more sack and heaves it on top of the same side: the saddle
//    rolls over, the donkey flinches; cross on the overloaded side (this beat only)
//  5 the back sags under the load, a raw saddle sore opens on the withers (cross on it); head low, flies and tail swishing (sick face);
//    it walks on and stumbles (hourglass: tires fast)
//  6 the farmer moves the extra sack from the heavy side to lie across the middle: level again (check); then he lifts it off and sets it
//    down, the back rises again and the donkey relaxes (sparkles)
//  7 the donkey walks to the wooden trough under the tree and drinks (ripples), lifts its head and brays (eyes)
//  8 CTA: the farmer stands at its head holding the lead rope and waves; thumbs-up; slow pull-out arcing round
// Step up vs the last render (horse_care, score 11):
//  motion   - (1) every sack moves by keys between the ground, the farmer's palms and the saddle (eased hand-offs with a small lift arc),
//             hung sacks swing with the stride (follow-through) and the saddle rolls toward the heavier side; (2) the work donkey sags,
//             flinches (one-shot hit-react), walks on with a stumble (forehand drop + damped recovery) and drinks with a reaching neck;
//             (3) both donkeys walk distance-synced (no sliding), the hook donkey slows to a stop with a settle
//  graphics - (1) new pack kit: padded striped Egyptian saddle pad with rolls, wooden sawbuck, girth, jute sacks with weave + bump,
//             gathered tied necks and crossed sisal rope, a sagging lead rope; (2) skin shaders on the donkey: back sag, raw saddle sore,
//             striated muscle glow; (3) trodden dirt track and yard (ruts, hoof prints, pebbles, soft edges), timber trough with iron bands
//  realism  - (1) real sizes: donkey 1.3 m at the withers (1.95 m to the ear tips), sacks 0.5 x 0.3 x 0.5 m, farmer 1.75 m, trough 0.5 m,
//             shade tree 5 m; (2) palms touch the sacks by construction (sacks ride the palm mid point), the lead rope ends in the palm,
//             sacks hang outside the barrel (0.3 m clear of the legs); (3) a short beat list: each beat adds a new visible action
//  (palms only far back: bare trunks crossed the low shots in the first preview)
//  sound    - wind bed .03, bird bed .02, one donkey bray .05 in line 7 only (global caps unchanged)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => { const s = S[Math.min(i, S.length - 1)]; return i === 0 && k === 0 ? 0 : s.words[Math.min(k, s.words.length - 1)].start; };
const PI = Math.PI;
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  muscle2: W(1, 9), back2: W(1, 12), legs2: W(1, 13), put3: W(2, 1), even3: W(2, 6), donkey4: W(3, 3), quarter4: W(3, 8), comfy4: W(3, 11),
  more5: W(4, 2), back5: W(4, 3), sore5: W(4, 4), sick5: W(4, 6), tired5: W(4, 7), split6: W(5, 2), sides6: W(5, 5), rest6: W(5, 6),
  years7: W(6, 5), tired7: W(6, 9), like8: W(7, 5) };

// ---------- donkeys (buffalo walker with the library Donkey, its own clips; 1.95 m to the ear tips = 1.3 m at the withers) ----------
const DH = 1.95, sE = u => (1 - Math.cos(PI * Math.min(1, Math.max(0, u)))) / 2;
const D1T = [[-2.5, -5.6, 4.6, 0, PI / 2], [8.6, 3.6, 4.6, 0, PI / 2]];                              // hook donkey: one eased walk along the track
const d1x = t => -5.6 + 9.2 * sE((t + 2.5) / 11.1);
const LOAD = [-1.6, 1.4], STUM = [-.7, 1.4], DRINK = [.2, 1.4], TRO = [1.3, 1.4], WAT = [TRO[0] - .1, .42, TRO[1]];
const tWalk1 = [T.tired5 - .5, T.tired5 + 1.0], tWalk2 = [T.l5 + 4.6, T.l5 + 6.05];
const d1 = { id: 'd1', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { model: 'animals_pack/Donkey', height: DH, ground: 'flat', dust: 0, link: 'd1', seed: 3, clip: 'Idle',
  fx: true, glowK: [[T.l1 + .4, 0], [T.l1 + 1.0, .85], [T.l2 - .5, .85], [T.l2 + .2, 0]], track: D1T, swish: .35, flies: .1 } };
const d2 = { id: 'd2', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { model: 'animals_pack/Donkey', height: DH, ground: 'flat', dust: 0, link: 'd2', seed: 7, clip: 'Idle',
  fx: true, sagDepth: .075, sagK: [[T.l4 + .1, 0], [T.back5 + .1, 1], [T.rest6 + .4, 1], [T.rest6 + 1.4, 0]], soreAt: [.12, .2, -.1],
  soreK: [[T.back5, 0], [T.sore5 + .1, 1], [T.rest6 + 1.2, 1], [T.l7 + 2.8, .4]], stumbles: [T.tired5 + .5], swish: .35, flies: .1,
  track: [[0, LOAD[0], LOAD[1], 0, PI / 2], [tWalk1[0], LOAD[0], LOAD[1], 0, PI / 2], [tWalk1[1], STUM[0], STUM[1], 0, PI / 2],
    [tWalk2[0], STUM[0], STUM[1], 0, PI / 2], [tWalk2[1], DRINK[0], DRINK[1], 0, PI / 2], [D + 1, DRINK[0], DRINK[1], 0, PI / 2]] } };
const C0 = { clip: 'Idle', rk: 0, lick: 0, drink: 0, swish: .35, flies: .1, dur: .8 };
const dm = o => ({ ...C0, ...o });

// ---------- farmer (rig person, 1.75 m) ----------
const FP0 = [-1.81, 2.92], FP1 = [-1.3, 2.92], LD = [-1.81, 2.1], PAT = [-1.15, 2.08], BACK = [-2.95, 2.3], VIA = [-1.75, 2.45], LD2 = [-.91, 2.12], SD = [-.91, 2.45], CTA = [.6, 2.38];
const at = (P, y = 0) => [P[0], y, P[1]];
const t3 = T.l2, t4 = T.l3, t6 = T.l5;                                   // starts of lines 3, 4 and 6
const FT = {                                                                      // farmer key times
  sq1: t3 + .17, pick1: t3 + .55, up1: t3 + 1.2, lift1: t3 + 2.05, put1: t3 + 2.55, settle1: t3 + 3.1,
  sq2: t4 + 1.05, pick2: t4 + 1.5, up2: t4 + 2.2, arr2: t4 + 2.95, put2: t4 + 3.35 };
const trk = [[0, ...at(FP0), 0, 'stand'], [t3 - .3, ...at(FP0), 0, 'stand'], [FT.sq1, ...at(FP0, -.55), 0, 'squatReach'], [FT.pick1, ...at(FP0, -.55), 0, 'squatReach'],
  [FT.up1, ...at(FP0), 0, 'carry'], [FT.lift1, ...at(LD), PI, 'carry', 'walk'], [FT.put1 - .05, ...at(LD), PI, 'sackUp'], [FT.settle1, ...at(LD), PI, 'sackPress'],
  [FT.settle1 + .5, ...at(LD), PI, 'sackPress'], [t3 + 4.2, ...at(PAT), PI, 'barkTouch', 'walk'], [t4 + .15, ...at(PAT), PI, 'barkTouch'],
  [FT.sq2 - .45, ...at(FP1), 0, 'stand', 'walk'], [FT.sq2, ...at(FP1, -.55), 0, 'squatReach'], [FT.pick2 + .1, ...at(FP1, -.55), 0, 'squatReach'], [FT.up2, ...at(FP1), 0, 'carry'],
  [FT.arr2, ...at(LD), PI, 'carry', 'walk'], [FT.put2 - .05, ...at(LD), PI, 'mountUp'], [FT.put2 + .55, ...at(LD), PI, 'sackUp'], [FT.put2 + .85, ...at(LD), PI, 'sackUp'],
  [T.l4 + .6, ...at(BACK), 2.23, 'stand', 'walk'], [t6 - .25, ...at(BACK), 2.23, 'stand'],
  [t6 + .35, ...at(VIA), null, 'stand', 'walk'], [t6 + 1.0, ...at(LD2), PI, 'stand', 'walk'], [t6 + 1.4, ...at(LD2), PI, 'mountUp'], [t6 + 2.65, ...at(LD2), PI, 'mountUp'],
  [t6 + 3.2, ...at(LD2), PI, 'carry'], [t6 + 3.7, ...at(SD), 0, 'carry', 'walk'], [t6 + 4.15, ...at(SD, -.55), 0, 'squatReach'], [t6 + 4.5, ...at(SD, -.55), 0, 'squatReach'],
  [t6 + 5.0, ...at(SD), 0, 'stand'], [T.l7 - .75, ...at(SD), 0, 'stand'], [T.l7 + .5, ...at(CTA), 0, 'basketHold', 'walk'], [T.like8 - .3, ...at(CTA), 0, 'ctaWave'], [D + 1, ...at(CTA), 0, 'ctaWave']];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 4, track: trk } };

// ---------- packs: saddle + sacks (keys [t, slot, dur]) ----------
const pack1 = obj('pack1', 'donkey_pack', [0, 0, 0], { link: 'd1', sacks: [{ seed: 11, keys: [[0, 'L']] }, { seed: 12, keys: [[0, 'R']] }] });
const pack2 = obj('pack2', 'donkey_pack', [0, 0, 0], { link: 'd2', lead: { by: 'farmer', hand: 'L', k: [[0, 0], [T.l7 + .55, 0], [T.l7 + .56, 1]], len: 1.3 }, sacks: [
  { seed: 21, keys: [[0, 'L']] },                                                                           // far side, already on: the saddle leans that way
  { seed: 22, keys: [[0, [FP0[0], FP0[1] + .40, PI / 2]], [FT.pick1 - .1, 'H:farmer', .35], [FT.put1, 'R', .55]] },
  { seed: 23, keys: [[0, [FP1[0], FP1[1] + .40, PI / 2]], [FT.pick2, 'H:farmer', .35], [FT.put2, 'R2', .5], [t6 + 1.45, 'H:farmer', .4], [t6 + 1.9, 'T', .6],
    [t6 + 2.7, 'H:farmer', .35], [t6 + 4.2, [SD[0], SD[1] + .40, PI / 2], .35]] },
  { seed: 24, keys: [[0, [-2.4, 3.42, .3]]] }, { seed: 25, keys: [[0, [-2.78, 3.12, 1.2, true]]] }] });

// ---------- the yard, the track, trough and shade tree ----------
const track = obj('track', 'dirt_track', [0, 0, 0], { pts: [[-10, 4.9], [-4, 4.62], [0, 4.55], [4, 4.65], [10, 5.1]], w: 1.7, seed: 151 });
const yard = obj('yard', 'dirt_track', [0, 0, 0], { pts: [[-3.8, 2.3], [-1.2, 1.95], [1.9, 1.5]], w: 3.6, seed: 157, color: '#9a7e5b', ruts: false, rep: 4, y: .01 });
const trough = obj('trough', 'trough', [TRO[0], 0, TRO[1]], { wood: true, len: 1.1, w: .45, h: .5, seed: 9, drinkAt: [0, -.1], drinks: [[T.years7 + .2, T.tired7 + .2]] }, PI / 2);
const world = [glb('tree', 'ph/island_tree_01', 2.4, -.7, 5, { rotY: .6, params: { sway: .006 } })];
[[-11.5, -8.8, 8.5, 1], [10.8, -8.6, 9, 3]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-5.2, 1.8, .9, 'ph/shrub_02'], [5.6, 2.4, .8, 'ph/shrub_01'], [-4.2, -1.2, .35, 'ph/rock_07'], [4.6, -.9, .6, 'ph/shrub_03'], [-3.4, 6.8, .3, 'ph/weed_plant_02'], [3.2, 7.0, .35, 'ph/weed_plant_02']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

// ---------- beats (one camera move each, continuous; stickers ride moving points with follow) ----------
const fol = (key, field, off) => ({ follow: [key, field, off] });
const B2b = T.l2 - 1.38;                                                          // split of line 2's close-up (the walker slows)
const fly1 = (t0, t1, dx, y0, y1) => [[d1x(t0) + dx, y0, 4.6], [d1x(t1) + dx, y1, 4.6]];
const tHit = FT.put2 + .3, tUp7 = T.tired7 + .2;
const beats = [
  // 1 hook: the loaded donkey walks the track toward the camera; ring on the sacks
  { t: 0, kind: 'info', add: [track, yard, trough, ...world, d1, d2, farmer, pack1, pack2, stk('ring1', 'circle_ring', [0, 0, 0], .95, { delay: .3, ...fol('pack:d1', 'anchor', [0, -.22, 0]) })],
    modes: { d1: dm({}), d2: dm({}) }, camera: { fly: { target: fly1(0, T.l1, .15, .95, .95), dist: [5.0, 4.6], elev: [.17, .19], az: [.62, .5] } } },
  // 2 it walks past with natural weight; the muscles glow (back, loin, thighs, forearms)
  { t: T.l1, kind: 'info', remove: ['ring1'], camera: { fly: { target: fly1(T.l1, T.muscle2, .1, .95, .9), dist: [5.4, 5.1], elev: [.2, .2], az: [.32, .16], blend: true } } },
  //   ... close on the back: point-down on the loin behind the saddle
  { t: T.muscle2, kind: 'info', add: [stk('pt2', 'point_down', [0, 0, 0], .2, { delay: .25, ...fol('pack:d1', 'anchor', [-.5, .32, 0]) })],
    camera: { fly: { target: fly1(T.muscle2, B2b, -.3, .95, .9), dist: [2.9, 2.6], elev: [.2, .2], az: [.25, .4], blend: true } } },
  //   ... down to the legs: ring round the hind legs
  { t: B2b, kind: 'info', remove: ['pt2'], add: [stk('ring2', 'circle_ring', [0, 0, 0], .5, { delay: T.legs2 - B2b, ...fol('pack:d1', 'anchor', [-.55, -.8, 0]) })],
    camera: { fly: { target: fly1(B2b, T.l2, -.4, .62, .55), dist: [2.5, 2.3], elev: [.13, .12], az: [.45, .6], blend: true } } },
  // 3 at the yard: the farmer squats at the pile and lifts a sack (the hook donkey grazes on along the track)
  { t: T.l2, kind: 'info', remove: ['ring2'], modes: { d1: dm({ clip: 'Eating', dur: 1.2 }) },
    camera: { target: [-1.6, .8, 2.45], dist: 5.6, elev: .2, az: .45, zoom: 'in' } },
  //   ... heaves it onto the empty side; the saddle comes level (check); he pats the neck
  { t: FT.lift1, kind: 'info', add: [stk('ok3', 'check', [0, 0, 0], .16, { delay: T.even3 - FT.lift1 + .1, ...fol('pack:d2', 'anchor', [0, .55, 0]) })],
    camera: { target: [-1.75, 1.1, 1.85], dist: 3.4, elev: .18, az: .95, zoom: 'out' } },
  // 4 the even two-sack load is the comfortable share (ring); he fetches one more sack
  { t: T.l3, kind: 'info', remove: ['ok3'], add: [stk('ring4', 'circle_ring', [0, 0, 0], 1.0, { delay: T.donkey4 - T.l3, ...fol('pack:d2', 'anchor', [0, -.25, 0]) })],
    modes: { d2: dm({ clip: 'Idle_2', dur: 1 }) }, camera: { target: [-1.5, .9, 2.3], dist: 5.2, elev: .22, az: .3, zoom: 'in' } },
  //   ... heaves it on top of the same side
  { t: FT.arr2 - .3, kind: 'info', remove: ['ring4'], camera: { target: [-1.8, 1.3, 1.85], dist: 3.8, elev: .16, az: .95, zoom: 'in' } },
  //   ... the saddle rolls over, the donkey flinches; cross on the overloaded side (this beat only)
  { t: tHit, kind: 'info', add: [stk('x4', 'cross', [0, 0, 0], .28, { delay: .2, pulse: true, ...fol('pack:d2', 'R2', [0, .28, .1]) })],
    modes: { d2: dm({ clip: 'Idle_HitReact_Right', onceT: tHit, dur: .3 }) }, camera: { target: [-1.75, 1.2, 1.7], dist: 4.0, elev: .18, az: .75, zoom: 'out' } },
  // 5 the back sags, a raw sore opens on the withers (cross on the sore)
  { t: T.l4, kind: 'info', remove: ['x4'], add: [stk('x5', 'cross', [0, 0, 0], .1, { delay: T.sore5 - T.l4 + .15, ...fol('pack:d2', 'sore', [0, .14, .06]) })],
    modes: { d2: dm({ clip: 'Idle', dur: 1 }) }, camera: { target: [-1.6, 1.15, 1.5], dist: 2.7, elev: .34, az: .4, zoom: 'in' } },
  //   ... sick: head low, flies, tail swishing (sick face)
  { t: T.sick5 - .1, kind: 'info', remove: ['x5'], add: [stk('sick5', 'face_sick', [-.7, 1.6, 1.5], .2, { delay: .25 })],
    modes: { d2: dm({ clip: 'Idle_Headlow', flies: .7, swish: .9, dur: 1 }) }, camera: { target: [-.95, .9, 1.5], dist: 4.4, elev: .2, az: .35, zoom: 'out' } },
  //   ... it walks on and stumbles (hourglass: it tires fast)
  { t: T.tired5, kind: 'info', remove: ['sick5'], add: [stk('hg5', 'hourglass', [.15, 1.65, 1.4], .2, { delay: .55 })],
    camera: { target: [-.6, .85, 1.5], dist: 4.6, elev: .18, az: .25 } },
  // 6 the farmer moves the extra sack from the heavy side to lie across the middle: level again (check)
  { t: T.l5, kind: 'info', remove: ['hg5'], add: [stk('ok6', 'check', [0, 0, 0], .16, { delay: T.sides6 - T.l5 + .1, ...fol('pack:d2', 'T', [0, .32, 0]) })],
    modes: { d2: dm({ clip: 'Idle_Headlow', flies: .45, swish: .6, dur: 1 }) }, camera: { target: [-.95, 1.35, 1.75], dist: 3.8, elev: .26, az: 1.15, zoom: 'in' } },
  //   ... lifts it off and sets it down; the back rises again, the donkey relaxes (sparkles)
  { t: T.rest6, kind: 'info', remove: ['ok6'], add: [stk('spk6', 'sparkles', [0, 0, 0], .18, { delay: 1.3, ...fol('pack:d2', 'anchor', [0, .4, 0]) })],
    modes: { d2: dm({ clip: 'Idle_2', flies: .1, swish: .35, dur: 1.2 }) }, camera: { target: [-.75, .95, 2.1], dist: 4.6, elev: .22, az: .5, zoom: 'out' } },
  // 7 it walks to the wooden trough under the tree (eyes) ...
  { t: T.l6, kind: 'info', remove: ['spk6'], add: [stk('eyes7', 'eyes', [.95, 1.9, 1.4], .2, { delay: .4 })],
    modes: { d2: dm({ clip: 'Idle', dur: .8 }) }, camera: { target: [.5, .95, 1.5], dist: 5.2, elev: .2, az: .35, zoom: 'in' } },
  //   ... and drinks (ripples)
  { t: T.years7 - .1, kind: 'info', remove: ['eyes7'], modes: { d2: dm({ clip: 'Idle_Headlow', lickAt: WAT, rk: 1, drink: 1, dur: .9 }) },
    camera: { target: [1.0, .62, 1.45], dist: 2.5, elev: .28, az: .75, zoom: 'in' } },
  //   ... lifts its head under the tree and brays
  { t: tUp7, kind: 'info', modes: { d2: dm({ clip: 'Idle', dur: .7 }) }, camera: { target: [.7, 1.3, 1.25], dist: 4.2, elev: .14, az: .55, zoom: 'out' } },
  // 8 CTA: the farmer at its head with the lead rope, waves; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', add: [stk('thumb8', 'thumbs_up', [.25, 2.05, 2.25], .3, { delay: T.like8 - T.l7 - .1 })],
    camera: { target: [.45, 1.05, 1.9], dist: 4.4, elev: .16, az: .3, spin: .5, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الحمار بيشيل أحمال تقيلة',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 26, d: 20, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 8, soilTint: [1.0, .95, .88], horizon: 'nile', cover: false,
    haze: .4, sunElev: 42, sunAz: 25, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 2, motes: .3, clouds: 16,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBeds: [{ cat: 'wind', idx: 0, gain: .03, fade: 1.5 }, { cat: 'bird', idx: 0, gain: .02, fade: 1.5 }],
    sfxCalls: [{ cat: 'donkey', idx: 0, times: [tUp7 + .15], gain: .05, dur: 2.2 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
