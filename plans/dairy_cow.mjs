// "لو اشتريت بقرة حلوب، يبقى عندك بقرة على الورق." (voice-over 2026-11-27, 9 lines, 48.2 s, one take). A village dairy barn on a real-sky
// island: a lime-washed mud-brick back wall and left wall, a reed-mat roof over the rear strip only (front open to the sky), clean wheat-straw
// bedding, a timber manger + rack of fresh green berseem and a concrete water trough in front of the cow's head, a timber fence on the right.
// Every spoken line is shown, never written (no digits, signs or labels):
//  1 hook: the Holstein walks in, the udder in profile in the first second; ring on the udder; pull out to the whole cow
//  2 a newborn calf trots in beside her (point-down); the calving cycle (arrows cycle) while the camera arcs; close on the udder (milk
//    drop); pull out: the calf is bigger now (a second, larger calf model swapped in while off frame)
//  3 the grown calf walks away, the cow alone (hourglass = the late insemination); the farmer carries in an EMPTY pail (cross, arrow down);
//    he looks into it (thumbs down = the loss)
//  4 he sets the pail down and watches (eyes) the cow in heat: restless pacing with two 180-degree turns, hard tail swish, head tosses
//    (fire = heat); he takes out the insemination gun (hand contact by construction); check
//  5 after the birth: a newborn calf trots in and nurses from a near-side teat (tail wagging); milk let-down sparkle; check
//  6 the cow pulls berseem from the rack (tongue, check), drinks at the clean trough (ripples, water drop); the calf lies down on the clean
//    straw (sparkles, check) - the library Cow has no lying clip, so the calf (sink) shows the comfortable bed
//  7 the cow slumps (head low, back sag, slow tail; cross); the full rack is left (small cross); the pail is nearly empty (arrow down);
//    the vet walks in with his bag (stethoscope) and kneels by her chest, palms on her
//  8 the farmer walks the pail in, sets it under the udder, squats and milks the near-side teats: alternating squirts of white milk, the
//    pail fills, foam rim (check, sparkles); the vet picks up his bag and leaves
//  9 CTA: the farmer stands with the full pail; thumbs-up; slow pull-out arcing round
// Step up vs the last render (bee_hive_story, score 76):
//  motion   - (1) nursing calf: muzzle reaches the teat (lickRig), tail wags, head bumps; (2) the restless cow in heat paces with two full
//             turns, hard swish and head tosses, then settles; the slumped cow uses a back sag + head-low + slow tail (three new states);
//             (3) hand-milking: alternating squeezes (~1.7/s per hand) drive ballistic milk squirts into a pail that fills with a foam rim
//  graphics - (1) a new real-shape udder (4 quarters, rear deeper, median cleft, milk veins, fine hair, 4 teats) replacing the low-poly
//             model udder; (2) a stainless pail with white milk and foam, a vet's leather bag with brass frame, an insemination gun with a
//             sheath; (3) a lime-washed mud-brick barn with a dirt splash band, reed-mat roof, wheat-straw bedding, a berseem rack
//  realism  - (1) real sizes: cow 1.45 m at the withers (2.6 m long), newborn calf 0.78 m then 0.93 m, udder 30 x 40 cm, teats 6.5 cm,
//             pail 0.30 m, trough 1.0 x 0.45 x 0.5 m, rack 1.0 m with a 1.35 m top, walls 2.7 m, people 1.75 m; (2) real husbandry: the
//             cow faces the manger and trough, the milker squats at the right flank, the vet kneels at the chest, a calf nurses from the
//             side with its tail wagging; (3) no overlap: every path is planned clear of the trough, rack, walls, pail and people
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => { const s = S[Math.min(i, S.length - 1)]; return i === 0 && k === 0 ? 0 : s.words[Math.min(k, s.words.length - 1)].start; };
const PI = Math.PI, R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(17);
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const fol = (key, field, off) => ({ follow: [key, field, off] });
const L = i => W(i);

// ---------- key times (word starts) ----------
const T = { milch1: W(0, 3), paper1: W(0, 6), calf2: W(1, 9), year2: W(1, 11), milk2: W(1, 15), down2: W(1, 17), late3: W(2, 2), prod3: W(2, 5), less3: W(2, 6),
  loss3: W(2, 7), big3: W(2, 9), watch4: W(3, 2), know4: W(3, 7), heat4: W(3, 9), ins4: W(3, 12), right4: W(3, 14), nurse5: W(4, 3), milk5: W(4, 10), start5: W(4, 12),
  food6: W(5, 5), good6: W(5, 6), water6: W(5, 7), place6: W(5, 9), sleep6: W(5, 11), tired7: W(6, 1), food7: W(6, 3), less7: W(6, 4), milk7: W(6, 5), drop7: W(6, 6),
  farmer7: W(6, 8), vet7: W(6, 10), keeps8: W(7, 4), milk8: W(7, 6), income8: W(7, 9), like9: W(8, 5) };

// ---------- layout (metres; barn back wall face z -2.6, left wall x -3.7, straw x -3.4..3.4, z -2.5..1.3, fence on the right) ----------
const COWH = 1.48, YAW = PI / 2, SX = 0, SZ = -.7;                 // the cow stands at the manger facing +x (right flank +z toward the camera)
const RACK = [1.45, -.6], EAT = [1.42, .9, -.62];                   // manger (x 1.2..1.7, z -1.05..-.15, rim .78 m, back board 1.1 m); eat point in the berseem
const TRO = [1.25, -1.33], DRINK = [1.0, .6, -1.27];                // concrete trough (x .75..1.75, z -1.55..-1.1, 0.65 m high), water at .57 m (probe: neck reach)
const P2 = [-.58, -.55], P3 = [2.32, .85];                             // pail under the udder (milking) / set down by the fence side
const F1 = [2.45, 1.2], YF1 = Math.atan2(SX - F1[0], SZ - F1[1]);   // the farmer's watching spot (faces the cow)
const MILK = [-.6, -.12], VET = [.6, .05], NURSE = [.07, .02], LIE = [-2.4, .8];

// ---------- actors ----------
const COW = { model: 'animals_pack/Cow', ground: 'flat', dust: 0 };
const cow = { id: 'cow', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...COW, height: COWH, noUdder: true, link: 'cow', clip: 'Idle', seed: 4, offset: .7,
  sagK: [[0, 0], [L(6), 0], [L(6) + 1.2, .7], [L(7) - .3, .7], [L(7) + .8, 0]], sagDepth: .06,
  track: [[0, -.9, SZ, 0, YAW], [1.7, SX, SZ, 0, YAW], [15.4, SX, SZ, 0, YAW],                                        // walks in, stands
    [17.4, -.7, -.52, 0, 3 * PI / 2], [18.3, -.7, -.52, 0, 3 * PI / 2], [20.3, SX, SZ, 0, YAW + 2 * PI], [D + 1, SX, SZ, 0, YAW + 2 * PI]] } };  // restless pacing (heat)
const udder = obj('udder', 'dairy_udder', [0, 0, 0], { cow: 'cow', pail: 'pail', milkTeats: [1, 3], off: [0, .03, .3],
  fillK: [[0, 1.05], [L(2), 1.05], [L(2) + 1, .9], [L(4), .9], [L(4) + 2, .98], [L(6), .98], [L(6) + 1, .88], [L(7), .88], [L(7) + 1, 1.05], [43.0, 1.05], [44.3, .93]],
  milkK: [[42.45, 0], [42.55, 1], [44.15, 1], [44.25, 0]] });
const CALF = { ...COW, noUdder: true, shapeScale: [.9, 1, .85], clip: 'Idle', dust: 0 };
const calfS = { id: 'calfS', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...CALF, height: .8, link: 'calfS', seed: 11, offset: 1.3,
  track: [[0, -2.6, 1.45, 0, YAW - .4], [L(1) + .2, -2.6, 1.45, 0, YAW - .4], [6.3, .6, .08, 0, YAW], [D, .6, .08, 0, YAW]] } };
const calfB = { id: 'calfB', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...CALF, height: .95, link: 'calfB', seed: 12, offset: 2.2,
  track: [[0, .6, .08, 0, YAW], [10.3, .6, .08, 0, YAW], [11.4, .35, .95, 0, -.3], [14.2, -5.6, 3.5, 0, -1.2], [D, -5.6, 3.5, 0, -1.2]] } };
const calfN = { id: 'calfN', type: 'buffalo', pos: [0, 0, 0], anim: 'none', params: { ...CALF, height: .8, link: 'calfN', seed: 13, offset: .4,
  track: [[0, 1.6, 2.2, 0, -2.56], [L(4) + .1, 1.6, 2.2, 0, -2.56], [23.6, NURSE[0], NURSE[1], 0, -2.45], [27.6, NURSE[0], NURSE[1], 0, -2.45],
    [29.7, LIE[0], LIE[1], 0, -PI / 2], [30.1, LIE[0], LIE[1], 0, -PI / 2], [31.3, LIE[0], LIE[1], -.27, -PI / 2], [D, LIE[0], LIE[1], -.27, -PI / 2]] } };
// people: track keys [t, x, y, z, yaw|null, pose, gait|null]
const fk = (t, P, y, yaw, pose, gait) => [t, P[0], y, P[1], yaw, pose, gait];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 5,
  hideK: [[0, 1], [L(2) - .05, 1], [L(2), 0], [24.1, 0], [24.15, 1], [36.15, 1], [36.2, 0]],   // 1 = hidden
  track: [fk(0, [4.5, 2.4], 0, null, 'bucketWalk'), fk(L(2) + .05, [4.5, 2.4], 0, null, 'bucketWalk'), fk(12.0, F1, 0, YF1, 'bucketWalk', 'walk'),
    fk(12.4, F1, 0, YF1, 'leafLook'), fk(15.2, F1, 0, YF1, 'leafLook'), fk(15.7, F1, -.3, YF1 + .55, 'setDown'), fk(16.1, F1, -.3, YF1 + .55, 'setDown'),
    fk(16.6, F1, 0, YF1, 'stand'), fk(19.8, F1, 0, YF1, 'stand'), fk(20.3, F1, 0, YF1, 'presentR'), fk(21.85, F1, 0, YF1, 'presentR'),
    fk(24.0, [4.8, 2.9], 0, null, 'stand', 'walk'), fk(36.2, [4.6, 2.6], 0, null, 'stand'), fk(37.85, [2.55, 1.2], 0, null, 'stand', 'walk'),
    fk(38.15, [2.55, 1.2], -.55, YF1 + .4, 'squatPickR'), fk(38.6, [2.55, 1.2], -.55, YF1 + .4, 'squatPickR'), fk(38.9, [2.55, 1.2], 0, null, 'bucketWalk'),
    fk(40.95, [-.2, 1.0], 0, null, 'bucketWalk', 'walk'), fk(41.75, MILK, 0, PI, 'bucketWalk', 'walk'), fk(41.95, MILK, -.3, PI, 'setDown'), fk(42.2, MILK, -.3, PI, 'setDown'),
    fk(42.45, MILK, -.55, PI, 'milkSquat'), fk(44.3, MILK, -.55, PI, 'milkSquat'), fk(44.6, MILK, -.55, PI, 'squatPickR'), fk(44.75, MILK, -.55, PI, 'squatPickR'),
    fk(45.1, MILK, 0, PI, 'bucketWalk'), fk(46.0, [.45, .85], 0, .35, 'bucketWalk', 'walk'), fk(D + 1, [.45, .85], 0, .35, 'bucketWalk')] } };
const vet = { id: 'vet', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Casual', height: 1.75, link: 'vet', seed: 9,
  hideK: [[0, 1], [34.95, 1], [35.0, 0], [44.2, 0], [44.25, 1]],
  track: [fk(0, [-3.7, 2.7], 0, null, 'stand'), fk(35.0, [-3.7, 2.7], 0, null, 'stand'), fk(38.9, VET, 0, PI, 'stand', 'walk'), fk(39.35, VET, -.31, PI, 'placeKneel'),
    fk(40.3, VET, -.31, PI, 'placeKneel'), fk(40.75, [VET[0] + .1, .45], 0, -2.6, 'stand'), fk(44.2, [4.6, 2.8], 0, null, 'stand', 'walk')] } };
const pail = obj('pail', 'milk_pail', [0, 0, 0], { by: 'farmer', link: 'pail', showK: [[0, 0], [L(2), 0], [L(2) + .01, 1]],
  at: [[0, 'R'], [15.75, P3], [38.35, 'R'], [42.0, P2], [44.6, 'R']], fillK: [[0, 0], [33, 0], [33.1, .12], [42.5, .12], [44.2, .9]], foamK: [[42.5, 0], [42.9, 1], [44.4, 1], [46, .5]] });
const gun = obj('gun', 'dairy_tool', [0, 0, 0], { kind: 'ai_gun', by: 'farmer', tilt: .25, at: [[0, 'R']], showK: [[0, 0], [20.05, 0], [20.06, 1], [23.0, 1], [23.01, 0]] });
const bag = obj('bag', 'dairy_tool', [0, 0, 0], { kind: 'bag', by: 'vet', at: [[0, 'L'], [39.3, [VET[0] - .55, VET[1] + .32, 0, .3]], [40.6, 'L']], showK: [[0, 0], [35.0, 0], [35.01, 1], [44.2, 1], [44.25, 0]] });

// ---------- the barn and the village around it ----------
const world = [obj('barn', 'dairy_barn', [0, 0, -2.6], { len: 7.4, h: 2.7, side: 2.8, roofD: 1.5 }), obj('straw', 'straw_bed', [0, 0, -.6], { w: 6.8, d: 3.8, n: 9000 }),
  obj('rack', 'hay_rack', [RACK[0], 0, RACK[1]], { w: .9, d: .5, rack: false, top: 1.1, leaves: 1900 }, -PI / 2),
  obj('trough', 'trough', [TRO[0], 0, TRO[1]], { len: 1.0, w: .45, h: .65, drinkAt: [DRINK[0] - TRO[0], DRINK[2] - TRO[1]], drinks: [[31.2, 32.4]] }),
  obj('fence', 'pen_fence', [0, 0, 0], { segs: [[3.7, -2.6, 3.7, .7]] })];
[[-9, -9.5, 9], [10.5, -8.5, 8.5]].forEach(([x, z, h], i) => world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i}`, x, z, h, { rotY: i * 1.9, params: { sway: .01, ph: i } })));
[[-4.6, -3.4, 1.0, 'nature_pack/Bush_1'], [4.6, -3.0, 1.0, 'nature_pack/Bush_2'], [5.2, 1.4, .7, 'ph/shrub_02'], [-4.8, 2.0, .6, 'ph/shrub_01']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));
for (let i = 0, n = 0; i < 400 && n < 34; i++) { const x = -7 + R() * 14, z = 1.9 + R() * 4.5; if (Math.abs(x - 3) < 2.2 && z < 3.4) continue;   // keep the people's entry clear
  world.push(glb('gr' + n, ['nature_pack/Grass', 'nature_pack/Grass_2', 'nature_pack/Grass_Short'][n % 3], x, z, .3 + R() * .25, { rotY: R() * 6, params: { sway: .03, ph: n } })); n++; }

// walker modes (full state on every change): base clip, reach weight, lick/drink, target, tail swish, flies (head tosses)
const C0 = { clip: 'Idle', rk: 0, lick: 0, drink: 0, swish: .35, flies: .2, dur: .6 };
const cm = o => ({ ...C0, ...o });
const TEAT = [-.53, .53, -.72];  // just past the near-side front teat tip (-.49, .53, -.63) so the reach pulls the mouth onto it

// ---------- beats (continuous camera; one move each; distances for a 2.6 m cow in 9:16: whole cow ~7 m, udder ~2.2 m) ----------
const beats = [
  // 1 hook: the cow walks in, udder in profile from the first frame
  { t: 0, add: [farmer, vet, cow, calfS, udder, pail, gun, bag, ...world], modes: { cow: cm({ swish: .45 }) },
    camera: { target: [-.5, .66, -.7], dist: 3.3, elev: .1, az: .15, zoom: 'in' } },
  //   ... ring on the udder
  { t: T.milch1, add: [stk('ring1', 'circle_ring', [0, 0, 0], .5, { delay: .1, ...fol('udder:cow', 'c', [0, .1, .05]) })],
    camera: { target: [-.57, .58, -.68], dist: 2.3, elev: .08, az: .05, zoom: 'out' } },
  //   ... on paper only: the whole cow in her barn
  { t: T.paper1, remove: ['ring1'], camera: { target: [.1, .8, -.75], dist: 7.2, elev: .14, az: -.15 } },
  // 2 she does not give milk all the time: a newborn calf trots in beside her; she needs to calve (point-down on the calf)
  { t: L(1), add: [stk('pd2', 'point_down', [.6, 1.2, .08], .22, { delay: T.calf2 - L(1) })], modes: { calfS: cm({ swish: .8, flies: .4 }) },
    camera: { target: [.05, .7, -.3], dist: 6.6, elev: .14, az: .3, zoom: 'in' } },
  //   ... about every year: the calving cycle while the camera arcs
  { t: T.year2, remove: ['pd2'], add: [stk('cyc2', 'arrows_cycle', [.2, 1.95, -.5], .36, { delay: .15 })], camera: { target: [.2, .85, -.4], dist: 6.2, elev: .18, az: .05, spin: .6 } },
  //   ... so the milk keeps coming: close on the udder (milk drop)
  { t: T.milk2, remove: ['cyc2'], add: [stk('wd2', 'water_drop', [0, 0, 0], .1, { delay: .2, ...fol('udder:cow', 'c', [0, -.14, .2]) })],
    camera: { target: [-.57, .55, -.65], dist: 2.2, elev: .06, az: -.05, zoom: 'in' } },
  //   ... (the calf grows while off frame: same camera)
  { t: T.milk2 + .45, remove: ['calfS'], add: [calfB], camera: { target: [-.57, .55, -.65], dist: 2.2, elev: .06, az: -.05 } },
  //   ... pull out: the calf is bigger now
  { t: T.down2 + .05, remove: ['wd2'], camera: { target: [.15, .75, -.35], dist: 6.4, elev: .15, az: .38, zoom: 'out' } },
  // 3 if insemination is late: the calf walks away, the cow alone (hourglass)
  { t: L(2), add: [stk('hg3', 'hourglass', [-.1, 1.9, -.7], .24, { delay: T.late3 - L(2) + .1 })], camera: { target: [.3, .85, -.5], dist: 7.0, elev: .16, az: -.1 } },
  //   ... production drops: the farmer carries in an empty pail (cross, arrow down)
  { t: T.prod3, remove: ['hg3', 'calfB'], add: [stk('x3', 'cross', [0, 0, 0], .16, { delay: .1, pulse: true, ...fol('pail:pail', 'grip', [0, .12, 0]) }),
    stk('ad3', 'arrow_down', [0, 0, 0], .14, { delay: T.less3 - T.prod3, ...fol('pail:pail', 'grip', [.25, -.05, 0]) })],
    camera: { target: [2.5, .7, 1.3], dist: 2.8, elev: .4, az: .3 } },
  //   ... a big loss for the farmer: he looks into the empty pail (thumbs down)
  { t: T.loss3, remove: ['x3', 'ad3'], add: [stk('td3', 'thumbs_down', [0, 0, 0], .2, { delay: T.big3 - T.loss3, ...fol('farmer', 'beak', [0, .42, 0]) })],
    camera: { target: [1.3, .95, .25], dist: 6.4, elev: .17, az: .5, zoom: 'out' } },
  // 4 so the farmer watches the cow from the start of the season: sets the pail down, eyes on the cow
  { t: L(3), remove: ['td3'], add: [stk('eye4', 'eyes', [0, 0, 0], .2, { delay: T.watch4 - L(3), ...fol('farmer', 'beak', [0, .38, 0]) })],
    modes: { cow: cm({ swish: .9, flies: .7, dur: .8 }) }, camera: { target: [1.15, .95, .15], dist: 6.8, elev: .15, az: .42, zoom: 'in' } },
  //   ... knows when the heat shows: the restless cow paces and turns (fire)
  { t: T.know4, remove: ['eye4'], add: [stk('fire4', 'fire', [-.45, 1.95, -.6], .26, { delay: T.heat4 - T.know4, pulse: true })],
    modes: { cow: cm({ clip: 'Idle_HitReact_Left', swish: 1, flies: .95, dur: .5 }) }, camera: { target: [-.35, .9, -.6], dist: 6.6, elev: .18, az: -.3, spin: .4 } },
  //   ... to inseminate her at the right time: he holds up the insemination gun (check)
  { t: T.ins4, remove: ['fire4'], add: [stk('ok4', 'check', [0, 0, 0], .14, { delay: T.right4 - T.ins4, ...fol('farmer', 'R', [0, .22, 0]) })], modes: { cow: cm({ swish: .6, flies: .4 }) },
    camera: { target: [2.3, 1.1, 1.0], dist: 2.8, elev: .1, az: -1.0 } },
  // 5 after the birth: a newborn calf trots in to its mother
  { t: L(4), remove: ['ok4'], add: [calfN], modes: { calfN: cm({ swish: .7 }), cow: cm({ swish: .35 }) }, camera: { target: [.3, .7, -.25], dist: 6.4, elev: .16, az: .3, zoom: 'out' } },
  //   ... and nurses: muzzle on the teat, tail wagging
  { t: T.nurse5, modes: { calfN: cm({ lickAt: TEAT, rk: 1, drink: 1, swish: 1, flies: .5, dur: .7 }) }, camera: { target: [-.3, .55, -.45], dist: 3.1, elev: .08, az: .3, zoom: 'in' } },
  //   ... that brings the milk down (sparkles at the udder, check)
  { t: T.milk5, add: [stk('sp5', 'sparkles', [0, 0, 0], .14, { delay: .1, ...fol('udder:cow', 'c', [-.05, .05, .25]) }), stk('ok5', 'check', [-.4, 1.05, -.1], .14, { delay: T.start5 - T.milk5 })],
    camera: { target: [-.4, .62, -.5], dist: 3.6, elev: .12, az: .1 } },
  // 6 but she needs good food: she pulls berseem from the manger (check); the calf walks off to lie down
  { t: L(5), remove: ['sp5', 'ok5'], add: [stk('ok6', 'check', [RACK[0] + .1, 1.5, RACK[1]], .16, { delay: T.good6 - L(5) })],
    modes: { cow: cm({ lickAt: EAT, rk: 1, lick: 1, dur: .8 }), calfN: cm({ swish: .5 }) }, camera: { target: [1.15, .95, -.6], dist: 3.8, elev: .16, az: .45, zoom: 'out' } },
  //   ... and clean water: she drinks at the trough, seen from in front (ripples, water drop)
  { t: T.water6, remove: ['ok6'], add: [stk('wd6', 'water_drop', [TRO[0] + .2, 1.05, TRO[1]], .16, { delay: .25 })], modes: { cow: cm({ lickAt: DRINK, rk: 1, drink: 1, dur: .7 }) },
    camera: { target: [1.0, .65, -1.2], dist: 2.8, elev: .3, az: 1.75, zoom: 'in' } },
  //   ... and a comfortable place to sleep: the calf lies on clean straw (sparkles, check)
  { t: T.place6, remove: ['wd6'], add: [stk('sp6', 'sparkles', [LIE[0] + .3, .25, LIE[1] + .35], .2, { delay: .2 }), stk('ok6b', 'check', [LIE[0], 1.0, LIE[1]], .16, { delay: T.sleep6 - T.place6 })],
    modes: { cow: cm({ swish: .3 }) }, camera: { target: [-2.1, .45, .6], dist: 3.8, elev: .22, az: .3, zoom: 'out' } },
  // 7 if she gets sick: she slumps, head low, slow tail (cross)
  { t: L(6), remove: ['sp6', 'ok6b', 'calfN'], add: [stk('x7', 'cross', [.1, 1.85, -.7], .22, { delay: T.tired7 - L(6), pulse: true })],
    modes: { cow: cm({ clip: 'Idle_Headlow', swish: .1, flies: 0, dur: 1.2 }) }, camera: { target: [.4, .85, -.7], dist: 5.8, elev: .14, az: .35 } },
  //   ... or eats less: the full manger is left (small cross)
  { t: T.food7, remove: ['x7'], add: [stk('x7b', 'cross', [RACK[0] + .1, 1.45, RACK[1]], .14, { delay: T.less7 - T.food7 })], camera: { target: [1.35, .9, -.6], dist: 3.4, elev: .2, az: .6 } },
  //   ... the milk drops fast: the nearly empty pail (arrow down); the vet walks in from the left
  { t: T.milk7, remove: ['x7b'], add: [stk('ad7', 'arrow_down', [P3[0] + .3, .45, P3[1]], .14, { delay: T.drop7 - T.milk7 })], camera: { target: [P3[0], .22, P3[1]], dist: 1.9, elev: .55, az: .3 } },
  //   ... and the farmer calls the vet: he walks in with his bag and kneels at her chest (stethoscope)
  { t: T.farmer7, remove: ['ad7'], add: [stk('st7', 'stethoscope', [0, 0, 0], .2, { delay: T.vet7 - T.farmer7, ...fol('vet', 'beak', [0, .4, 0]) })],
    camera: { target: [.4, .85, .35], dist: 6.8, elev: .15, az: .2 } },
  // 8 that keeps her giving milk for years: the farmer brings the pail, the vet leaves
  { t: L(7), remove: ['st7'], modes: { cow: cm({ swish: .4, dur: 1 }) }, camera: { target: [.3, .8, .15], dist: 6.4, elev: .17, az: .45 } },
  //   ... he squats at her right flank and milks: squirts into the pail, seen from behind her (check)
  { t: T.keeps8 + .9, add: [stk('ok8', 'check', [0, 0, 0], .14, { delay: 1.1, ...fol('pail:pail', 'mouth', [.22, .3, 0]) })], modes: { cow: cm({ lickAt: EAT, rk: 1, lick: .6, dur: 1 }) },
    camera: { target: [-.55, .5, -.4], dist: 2.6, elev: .15, az: -1.15, zoom: 'in' } },
  //   ... a steady income: the pail fills (sparkles on the milk), seen from above
  { t: T.income8, remove: ['ok8'], add: [stk('sp8', 'sparkles', [0, 0, 0], .13, { delay: .1, ...fol('pail:pail', 'mouth', [0, .12, 0]) })],
    camera: { target: [-.58, .3, -.55], dist: 1.8, elev: .7, az: -1.4 } },
  // 9 CTA: the farmer with the full pail; thumbs-up; slow pull-out arcing round
  { t: L(8), remove: ['sp8'], add: [stk('th9', 'thumbs_up', [0, 0, 0], .26, { delay: T.like9 - L(8), ...fol('farmer', 'beak', [0, .48, 0]) })], modes: { cow: cm({ swish: .4 }) },
    camera: { target: [.25, .95, -.1], dist: 6.6, elev: .14, az: .15, spin: .5, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'لو اشتريت بقرة حلوب',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 20, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 9, soilTint: [1.0, .95, .88], horizon: 'nile', cover: 'high',
    haze: .45, sunElev: 40, sunAz: 20, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 2, birdModel: 'Stork', motes: .4, clouds: 14,
    // sound library (this plan only, at the global caps): a quiet wind bed, cow calls (the heat bellow, the calf, the mother), water at the trough
    sfxBeds: [{ cat: 'wind', idx: 0, gain: .03, fade: 1.5 }],
    sfxCalls: [{ cat: 'cow', idx: 0, times: [2.6, 18.9, 33.9], gain: .05 }, { cat: 'cow', idx: 2, times: [6.6, 23.2], gain: .045 }, { cat: 'water', idx: 0, times: [31.3], dur: 1.2, gain: .04 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, kind: 'info', text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
