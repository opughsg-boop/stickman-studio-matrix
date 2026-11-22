// "إزاي تعمل مزرعة بلطي صغيرة في حوض أسمنت في جنينتك؟!" (voice-over 2026-11-22, 34 lines, 209.8 s). A sunny Egyptian garden (palms, shrubs,
// grass, Nile horizon) with a 1.5 x 1.0 x 1.0 m (inside) reinforced-cement tank under a half shade cloth. 22 beats, one camera set-up and one
// new state each (<= 12 s): the finished tank with a few adult tilapia (hook, push-in to the water), from above with the air-stone bubbles,
// the rebar cage and the walls cast up then the shade cloth rising, the inner coat brushed on and the hose filling it, sun on the water and
// fish gulping at the surface, the pump + airline + air stone, a hand checks the plug and then the power cuts (bubbles stop, fish gasp), waste
// flecks and an ammonia haze then the filter bag lowered on its cord, bacteria round the bag as the haze drains into it, the fry bag brought in,
// a macro of the fry through the plastic, the bag set on the water from above, floating then opened by hand and the fry swimming out, a hand
// on the rim in the first week, feed tossed and fish at the surface, excess feed sinking and rotting then sated fish gulping, fish sulking on
// the bottom in murky water, a siphon hose and a bucket poured on the rim, a cat hops onto the rim then a bird net drops over the tank, the
// rim scrubbed of algae, the fish grow then a scoop net lifts one and it is rinsed, a new fry bag released, a fried tilapia on a platter and
// a closing orbit round the tank.
// 1x improvement over the last video (hen_coop):
//  - Motion: fish swim with a travelling body wave (tail beat, caudal follow-through and lagging fins, pectoral flutter), school, rise to
//    gulp with mouths opening and rings spreading on the water, sulk on the bottom, pour out of the opened bag; a cat walks with a
//    distance-locked gait (no foot slide), crouches (anticipation), hops 1.1 m onto the rim, lands with a squash, peers and paws; pellets
//    fly on a parabola, float and are eaten or sink and rot; the bucket tilts on its lip; the scoop dips, sweeps and lifts with drips.
//  - Graphics: rippled physical water (animated normal map, clearcoat, sky reflection, tinted depth, turbidity), scale-patterned tilapia
//    skin with clearcoat and depth tint, translucent fins with spots, stripes and red margins, cast concrete with formwork seams that dries
//    from dark to light, a clear fry bag with an orange rubber band, a mesh filter sack with stones, gravel and charcoal inside, a fried fish.
//  - Realism: real sizes and practice (tank 1.5 x 1.0 x 1.0 m inside, 10 cm walls, 15 cm freeboard; rebar 10 mm at 20 cm; fry 10 cm, adults
//    26-27 cm; 56 fish; pump 0.2 m on a block, 8 mm airline, 5 cm stone; 10 L bucket; cat 0.45 m body, 0.25 m shoulder; Nile tilapia
//    colours: olive back, faint bars, opercular spot, striped caudal fin with a red edge).
// Contact: every hand rides an OC grip by construction (0 m): brush handle, hose nozzle, plug back, filter-bag knot then the cord at the
// rim, fry-bag neck (carry, set down, untie), siphon hose at the rim, bucket handle and base edge, scrub-brush top (palm), scoop handle,
// rinse nozzle; flat palms on the rim top (palm anchor 2 mm above the 1.10 m rim); cat feet on the ground (y 0) or the rim top (y 1.10)
// by track y. Stickers: two wordless ones on info beats only (magnifier on the fry macro, eyes on the first-week watch).
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
const R = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(43);
const stk = (id, name, pos, size, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });

// ---- times from the voice
const T = i => at(i);
const Tb2 = word(1, /لانه|لأنه/, .5), Tb6 = word(8, /وده/, .55), Tb12 = word(17, /تسيب/, .25);
const Toff = word(9, /انقطاع/, .6), Tox = word(8, /محتاج/, .4), Topen = word(18, /تفتح/, .2) + .3, Tnet = word(27, /بشبك/, .3);
// ---- tank geometry (mirrors TTK in renderer/scene.js)
const X = .75, Z = .5, Tw = .1, F = .1, TOP = 1.1, LV = .95, lvl = w => F + (LV - F) * w;

// ---- tank keys
const wallK = [[0, 1], [T(3) - .03, 1], [T(3), 0], [T(3) + .9, 0], [T(3) + 5.4, 1]];
const rebarK = [[T(3), 0], [T(3) + .1, 0], [T(3) + .9, 1]];
const wetK = [[0, 0], [T(3) - .03, 0], [T(3), 1], [T(4) + 1.2, 1], [T(4) + 4.6, 0]];
const paintK = [[0, 1], [T(3) - .03, 1], [T(3), 0], [T(5) + .3, 0], [T(5) + 4.7, .5], [T(6) + .4, 1]];
const brushK = [[0, 0], [T(5) - .05, 0], [T(5), 1], [T(5) + 4.75, 1], [T(5) + 4.8, 0]];
const waterK = [[0, 1], [T(3) - .03, 1], [T(3), 0], [T(6) + .7, 0], [T(7) - .3, 1],
  [T(24) + 1.4, 1], [T(24) + 4.4, .75], [T(24) + 5.2, .75], [T(25) + 3.9, .82], [T(26) - .05, .82], [T(26), 1]];
const hoseK = [[0, 0], [T(6) - .05, 0], [T(6), 1], [T(7) - .1, 1], [T(7), 0]], flowK = [[T(6) + .55, 0], [T(6) + .85, 1], [T(7) - .55, 1], [T(7) - .3, 0]];
const airK = [[0, 1], [T(3) - .03, 1], [T(3), 0], [T(7) - .03, 0], [T(7), 1]];
const onK = [[0, 1], [Toff + .1, 1], [Toff + .25, 0], [T(10) - .1, 0], [T(10), 1]];
const TP = Tb6 + 5.0, plugK = [[0, 1], [TP, 1], [TP + .05, .86], [TP + .45, 1]];         // the hand pushes the plug home (it gives 6 mm)
const SURF = [[0, 0], [T(7) + .6, 0], [T(7) + 2.2, .6], [Tb6 - .5, .6], [Tb6 + .5, 0], [Toff + .7, 0], [Toff + 2.0, 1], [T(10) - .1, 1], [T(10), 0],
  [T(20) + 1.6, 0], [T(20) + 2.6, 1], [T(21) - .2, 1], [T(21) + .5, 0], [T(22) + .7, 0], [T(22) + 1.8, 1], [T(23) - .2, 1], [T(23) + .5, 0]];
const GULP = [[0, 0], [Tox, 0], [Tox + .5, 1], [Tb6 - .5, 1], [Tb6, 0], [Toff + .8, 0], [Toff + 1.3, 1], [T(10) - .1, 1], [T(10), 0],
  [T(20) + 1.9, 0], [T(20) + 2.3, 1], [T(21) - .3, 1], [T(21), 0], [T(22) + 1.0, 0], [T(22) + 1.5, 1], [T(23) - .2, 1], [T(23), 0]];
const botK = [[0, 0], [T(23) + .3, 0], [T(23) + 1.6, 1], [T(24) - .2, 1], [T(24) + 1.6, 0]];
const turbK = [[0, 0], [T(10), 0], [T(10) + 2, .35], [T(12) + 1, .35], [T(12) + 5, 0], [T(21) + 1.5, 0], [T(21) + 5, .45], [T(23), .5], [T(23) + 1.5, .85], [T(24) + .6, .85], [T(24) + 5, .25], [T(26), 0]];
const wasteK = [[0, 0], [T(10) + .3, 0], [T(10) + 2.8, 1], [T(13) - .05, 1], [T(13), 0], [T(23) + .2, 0], [T(23) + 1.8, .7], [T(24) + .6, .7], [T(24) + 4, 0]];
const hazeK = [[0, 0], [T(10) + 1, 0], [T(10) + 3.2, 1], [T(13) - .05, 1], [T(13), 0], [T(21) + 3.5, 0], [T(21) + 5.5, .8], [T(22) + .6, .8], [T(22) + 3, .3], [T(23) + .3, .6], [T(24) + 4, 0]];
const clearK = [[0, 0], [T(12) + .9, 0], [T(12) + 5.4, 1], [T(13) - .05, 1], [T(13), 0]];
const bactK = [[0, 0], [T(12) + .4, 0], [T(12) + 1.6, 1], [T(13) - .05, 1], [T(13), 0]];
// filter sack: carried in by its knot, touches the water, then sinks on its cord while the hand holds the cord at the rim
const SACK = [-.5, F + .11, -.28], Tb0 = T(11) + .8, Tsplash = T(11) + 3.1;
const filterK = [[0, ...SACK], [Tb0, -.5, 1.95, -.3], [T(11) + 2.4, -.5, 1.3, -.28], [Tsplash, -.5, 1.06, -.28], [T(11) + 5.3, ...SACK]];
const filterVis = [[0, 0], [Tb0 - .05, 0], [Tb0, 1]];
// fry bags (stock 1: carried in, held, set on the water, floated, opened; stock 2: a new bag released after the harvest)
const BAGH = [.2, 1.3, .2], BAGW = [-.15, LV + .02, .05], BAG2 = [-.05, LV + .02, -.06], Tset = T(16) + 4.4, Topen2 = T(31) + 2.6;
const fryK = [[0, .25, 1.95, .2, 0], [T(13), .25, 1.95, .2, 0], [T(13) + 2.6, ...BAGH, .06], [T(13) + 4.2, BAGH[0] + .02, BAGH[1], BAGH[2], -.04], [T(14) - .3, ...BAGH, 0],
  [T(16) + 1.6, ...BAGH, 0], [Tset, ...BAGW, 0], [Tb12 + 4, BAGW[0] + .04, BAGW[1], BAGW[2] + .03, 0], [T(19), BAGW[0] + .04, BAGW[1], BAGW[2] + .03, 0], [T(31) - .05, ...BAG2, 0], [D, ...BAG2, 0]];
const fryVis = [[0, 0], [T(13) - .02, 0], [T(13), 1], [T(19) - .05, 1], [T(19), 0], [T(31) - .05, 0], [T(31), 1], [T(32) - .05, 1], [T(32), 0]];
const openK = [[0, 0], [Topen - .2, 0], [Topen + .6, 1], [T(31) - .1, 1], [T(31) - .05, 0], [Topen2 - .2, 0], [Topen2 + .6, 1]];
const nK = [[0, 12], [T(3) - .03, 12], [T(3), 0], [T(7) - .03, 0], [T(7), 12], [T(13) - .03, 12], [T(13), 56]];
const sizeK = [[0, .26], [T(13) - .03, .26], [T(13), .1], [T(19), .1], [T(29) + .3, .16], [T(29) + 5.6, .27], [T(31) - .06, .27], [T(31) - .04, .1]];
// feed: three small tosses (eaten), then one handful too many (sinks and rots)
const PF = [-.04, 1.28, .2], SC = [.12, .02], Tf = [T(20) + 1.5, T(20) + 3.6, T(20) + 5.7], Tbig = T(21) + .45;
const feed = [...Tf.map(t => ({ t, from: PF, n: 14, c: SC, r: .16, eat: [t + 1.1, t + 3.0] })), { t: Tbig, from: add(PF, [-.04, .02, 0]), n: 46, c: SC, r: .32, sink: true }];
// water change
const siphonK = [[0, 0], [T(24) - .03, 0], [T(24), .015], [T(24) + 1.1, .015], [T(24) + 1.4, 1], [T(24) + 4.3, 1], [T(24) + 4.6, .015], [T(26) - .05, .015], [T(26), 0]];
const wetPatch = [[0, 0], [T(24) + 1.4, 0], [T(24) + 4.8, 1], [T(26) - .05, 1], [T(26), 0]];
const LIPX = .1, LIP = [LIPX, TOP + .012, Z + .02], Tbk = T(24) + 3.3;
const bucketK = [[0, .8, 1.2, 1.0, .35], [Tbk, .8, 1.2, 1.0, .35], [T(24) + 4.7, LIPX, TOP + .06, Z + .05, .35], [T(24) + 5.1, ...LIP, .35], [T(25) + .4, ...LIP, .6], [T(25) + 2.1, ...LIP, 1.35], [T(25) + 3.9, ...LIP, 1.72], [D, ...LIP, 1.72]];
const bucketVis = [[0, 0], [Tbk - .05, 0], [Tbk, 1], [T(26) - .05, 1], [T(26), 0]];
// cat, net, algae
const netK = [[0, 0], [Tnet - .1, 0], [Tnet + 1.4, 1], [T(29) - .03, 1], [T(29), 0]], netFold = [[0, 0], [T(28) + .2, 0], [T(28) + 1.2, .5]];
const algaeK = [[0, 0], [T(28) - .05, 0], [T(28), 1], [T(29) - .03, 1], [T(29), 0]], cleanK = [[0, .3], [T(28) + 1.3, .3], [T(28) + 5.7, .72]], scrubVis = [[0, 0], [T(28) - .05, 0], [T(28), 1], [T(29) - .03, 1], [T(29), 0]];
// scoop: enters, dips, sweeps, catches the first fish, lifts over the water and holds it under the rinse
const Tc = T(30) + 1.9, SCP = [.25, 1.38, .4];
const SY = 2.8, scoopK = [[0, -.9, 1.75, .15, SY, .6], [T(30) - .4, -.9, 1.75, .15, SY, .6], [T(30) + .6, .05, 1.15, .1, SY, .7], [T(30) + 1.2, -.05, .62, 0, SY, .8], [Tc, .15, .6, -.1, SY, .8],
  [T(30) + 2.8, .1, 1.28, .2, SY, .62], [T(30) + 3.3, ...SCP, SY, .55], [D, ...SCP, SY, .55]];
const scoopVis = [[0, 0], [T(30) - .45, 0], [T(30) - .4, 1], [T(31) - .05, 1], [T(31), 0]];
const RZ = [SCP[0] + .03, SCP[1] + .3, SCP[2] + .02], rinseVis = [[0, 0], [T(30) + 2.85, 0], [T(30) + 2.9, 1], [T(31) - .05, 1], [T(31), 0]], rinseK = [[0, 0], [T(30) + 3.5, 0], [T(30) + 3.8, 1], [T(31) - .3, 1], [T(31) - .1, 0]];
const tank = { id: 'tank', type: 'tilapia_tank', pos: [0, 0, 0], anim: 'none', params: { link: 'tank', fishN: 56, wallK, rebarK, wetK, paintK, brushK, waterK, hoseK, flowK, airK, onK, plugK,
  surfK: SURF, gulpK: GULP, botK, turbK, wasteK, hazeK, clearK, bactK, filterK, filterVis, fryK, fryVis, openK, nK, sizeK, surfC: SC, feed, siphonK, wetPatch, bucketK, bucketVis,
  netK, netFold, algaeK, cleanK, scrubVis, scoopK, scoopVis, catchAt: Tc, rinseAt: RZ, rinseVis, rinseK, stock: [{ at: T(13), open: Topen }, { at: T(31), open: Topen2 }],
  splashes: [[Tsplash, -.5, -.28, .16], [Tset - .1, BAGW[0], BAGW[2], .2], [T(30) + 1.15, -.05, 0, .2], [T(30) + 2.35, -.02, .1, .18]] } };

// ---- hands: [t, x,y,z, f(3), u(3), pose, ease]
const hk = (arr, t, P, f, u, pose, e) => arr.push([r3(t), ...R3(P), ...R3(norm(f)), ...R3(norm(u)), pose, ...(e ? [e] : [])]);
const hand = (id, side, track, o = {}) => ({ id, type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side, link: id, skin: '#94624a', track, ...o } });
const grab = (obj, t0, t1, f, u, pose = 'grip', at = [0, 0, 0]) => ({ obj, k: [[t0 - .12, 0], [t0, 1], [t1, 1], [t1 + .12, 0]], f, u, at, s: 0, off: [0, 0, 0], pose });
const rotX = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
// line 5: the brush (already in the hand at the cut); after the last stroke the hand lifts it out
const brushAt = t => { const k = Math.min(1, Math.max(0, (t - (T(5) + .3)) / 4.4)), x = Math.max(-X + .06, Math.min(X - .06, -X + 2 * X * k - .035)), y = (F + TOP) / 2 + .3 * Math.sin(2 * PI * 1.05 * t);
  return add([x, y, -Z + .004], rotX([0, 0, .2], -.65)); };
const fP = [1, 0, 0], uP = [0, 1, 0], HP = [], Tbr = T(5) + 4.75;
hk(HP, 0, brushAt(T(5)), rotX(fP, -.65), rotX(uP, -.65), 'grip'); hk(HP, Tbr, brushAt(Tbr), rotX(fP, -.65), rotX(uP, -.65), 'grip'); hk(HP, Tbr + .8, add(brushAt(Tbr), [.3, .55, .55]), rotX(fP, -.65), rotX(uP, -.65), 'open');
const handP = hand('handP', 'R', HP, { anchor: 'grip', grabs: [grab('tank:brush', T(5), Tbr, fP, uP)] });
// line 6: the left hand brings the hose nozzle over the rim and holds it while the tank fills
const NZp = [-.56, 1.2, .37], HN = [], fN = [-.75, .25, .62], uN = [.3, .95, .1];
hk(HN, 0, add(NZp, [-.45, .3, .35]), fN, uN, 'open'); hk(HN, T(6), add(NZp, [-.45, .3, .35]), fN, uN, 'open'); hk(HN, T(6) + .45, add(NZp, [-.05, .03, .04]), fN, uN, 'grip'); hk(HN, T(7) - .1, NZp, fN, uN, 'grip');
hk(HN, T(7) + .6, add(NZp, [-.4, .35, .3]), fN, uN, 'open');
const handN = hand('handN', 'L', HN, { anchor: 'grip', grabs: [grab('tank:nozzle', T(6) + .5, T(7) - .15, [0, 0, 1], [0, 1, 0])] });
// line 9: the index pad pushes the plug home in its socket (back face, 6 mm travel)
const PLG = [1.25 + .012, .5, .55 + .037 + .016], HG = [], fG = [0, 0, -1], uG = [0, 1, 0];
hk(HG, 0, add(PLG, [.02, .05, .55]), fG, uG, 'open'); hk(HG, TP - 1.2, add(PLG, [.02, .05, .55]), fG, uG, 'open'); hk(HG, TP - .25, add(PLG, [0, .01, .03]), fG, uG, 'press');
hk(HG, TP + 1.1, add(PLG, [0, 0, 0]), fG, uG, 'press'); hk(HG, TP + 2.2, add(PLG, [.03, .1, .5]), fG, uG, 'open');
const handG = hand('handG', 'R', HG, { grabs: [grab('tank:plug', TP - .1, TP + 1.1, fG, uG, 'press')] });
// line 11: the right hand carries the sack by its knot, lets it sink on the cord and holds the cord at the rim; the left palm rests on the rim
const fB = [-1, 0, 0], uB = [0, 0, 1], TIE = [-X - .03, TOP + .04, -.3], HBg = [];
hk(HBg, 0, add([-.5, 1.95, -.3], [0, .152, 0]), fB, uB, 'grip'); hk(HBg, Tsplash, [-.5, 1.06 + .152, -.28], fB, uB, 'grip'); hk(HBg, Tsplash + .7, TIE, fB, uB, 'grip'); hk(HBg, T(12) - .4, TIE, fB, uB, 'grip');
hk(HBg, T(12) + .6, add(TIE, [.25, .4, .35]), fB, uB, 'open');
const handBg = hand('handBg', 'R', HBg, { anchor: 'grip', grabs: [grab('tank:bag', Tb0, Tsplash, fB, uB)] });
const RIM_L = [-.35, TOP + .002, -Z - Tw / 2], fR = [1, 0, -.15], uR = [0, 1, 0], HR = [];
hk(HR, 0, add(RIM_L, [-.35, .3, .1]), fR, uR, 'open'); hk(HR, T(11) + .9, add(RIM_L, [-.35, .3, .1]), fR, uR, 'open'); hk(HR, T(11) + 1.6, add(RIM_L, [0, .02, 0]), fR, uR, 'flat');
hk(HR, T(11) + 1.9, RIM_L, fR, uR, 'flat'); hk(HR, T(12) - .2, RIM_L, fR, uR, 'flat'); hk(HR, T(12) + .7, add(RIM_L, [-.35, .35, .1]), fR, uR, 'open');
const handR = hand('handR', 'L', HR, { anchor: 'palm' });
// lines 13-16: the right hand carries the fry bag by its neck, holds it for the close-up and sets it on the water
const fF = [-1, 0, 0], uF = [0, 0, 1], knotAt = P => add(P, [0, .165, 0]), HF = [];
hk(HF, 0, knotAt([.25, 1.95, .2]), fF, uF, 'grip'); hk(HF, Tset + .4, knotAt(BAGW), fF, uF, 'grip'); hk(HF, Tset + 1.4, add(knotAt(BAGW), [.3, .35, .1]), fF, uF, 'open');
const handF = hand('handF', 'R', HF, { anchor: 'grip', grabs: [grab('tank:fry', T(13), Tset + .4, fF, uF)] });
// line 18 / 31: a hand takes the neck, slips the band, tips the bag and lets go (no squeezing the fry)
const openHand = (id, t0, P) => { const H = [], k = knotAt(P); hk(H, 0, add(k, [.45, .35, .12]), fF, uF, 'open'); hk(H, t0 - 1.1, add(k, [.45, .35, .12]), fF, uF, 'open'); hk(H, t0 - .3, add(k, [.03, .02, 0]), fF, uF, 'grip');
  hk(H, t0 + 1.9, add(k, [.05, .05, 0]), fF, uF, 'grip'); hk(H, t0 + 2.9, add(k, [.45, .4, .15]), fF, uF, 'open'); return hand(id, 'R', H, { anchor: 'grip', grabs: [grab('tank:fry', t0 - .2, t0 + 1.8, fF, uF)] }); };
const handO = openHand('handO', Topen, BAGW), handO2 = openHand('handO2', Topen2, BAG2);
// line 19: a palm on the rim while watching
const RIM_W = [-X - Tw / 2, TOP + .002, -.12], HW = [];
hk(HW, 0, RIM_W, fR, uR, 'flat'); hk(HW, T(20) - .2, RIM_W, fR, uR, 'flat');
const handW = hand('handW', 'L', HW, { anchor: 'palm' });
// line 20-21: pinch of pellets above the water, flick and open (index pad at the toss point)
const fD = [.55, -.6, -.35], uD = [.3, .65, -.6], HD = [];
hk(HD, 0, add(PF, [-.4, .3, .15]), fD, uD, 'pinch'); hk(HD, T(20) + .6, add(PF, [-.05, .05, .03]), fD, uD, 'pinch');
[...Tf, Tbig].forEach((t, i) => { hk(HD, t - .45, add(PF, [-.06, .06, .04]), fD, uD, 'pinch'); hk(HD, t, PF, fD, uD, i === 3 ? 'open' : 'point', 'in'); hk(HD, t + .35, add(PF, [-.02, .03, .02]), fD, uD, 'open'); hk(HD, t + .9, add(PF, [-.04, .05, .04]), fD, uD, 'pinch'); });
hk(HD, Tbig + 1.6, add(PF, [-.4, .4, .2]), fD, uD, 'open');
const handD = hand('handD', 'R', HD);
// line 24: the left hand holds the siphon hose at the rim, then leaves; the bucket comes in on two hands and is tipped on its lip
const HS = [], HOSE = [-.61, 1.17, .58], fS = [-1, 0, 0], uS = [0, 1, 0];
hk(HS, 0, HOSE, fS, uS, 'grip'); hk(HS, T(24) + 3.0, HOSE, fS, uS, 'grip'); hk(HS, T(24) + 3.8, add(HOSE, [.35, .4, .25]), fS, uS, 'open');
const handS = hand('handS', 'L', HS, { anchor: 'grip', grabs: [grab('tank:hose', T(24) - .2, T(24) + 3.0, [0, 0, 1], [0, 1, 0])] });
const bkM = (L, a, v) => add(rotX(v.map((x, i) => x - [0, .27, -.145][i]), -a), L);   // bucket-local point -> world, lip at L, tilt a
const HH = [], HBb = [], hU = [0, 0, 1], hF = [0, -1, 0], bF = [1, 0, 0], bU = [0, -1, 0];
hk(HH, 0, bkM([.8, 1.2, 1.0], .35, [0, .4, 0]), rotX(hF, -.35), rotX(hU, -.35), 'grip'); hk(HH, D, bkM(LIP, 1.72, [0, .4, 0]), rotX(hF, -1.72), rotX(hU, -1.72), 'grip');
hk(HBb, 0, bkM([.8, 1.2, 1.0], .35, [0, 0, .12]), rotX(bF, -.35), rotX(bU, -.35), 'cup'); hk(HBb, D, bkM(LIP, 1.72, [0, 0, .12]), rotX(bF, -1.72), rotX(bU, -1.72), 'cup');
const handBH = hand('handBH', 'R', HH, { anchor: 'grip', grabs: [grab('tank:bucketH', Tbk, D, hF, hU)] });
const handBB = hand('handBB', 'L', HBb, { anchor: 'palm', grabs: [grab('tank:bucketB', Tbk, D, bF, bU, 'cup')] });
// line 28: palm on the scrubbing brush, scrubbing along the front rim
const HC = [], fC = [-1, 0, 0], uC = [0, 1, 0];
hk(HC, 0, [-.34, TOP + .047, Z + Tw / 2], fC, uC, 'flat'); hk(HC, D, [.34, TOP + .047, Z + Tw / 2], fC, uC, 'flat');
const handC = hand('handC', 'R', HC, { anchor: 'palm', grabs: [grab('tank:scrub', T(28) - .1, T(29), fC, uC, 'flat')] });
// line 30: the right hand works the scoop; the left hand holds the rinse nozzle over the net
const HSp = [], HRn = [], scG = (P, yaw, pitch) => { const d = [Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.sin(yaw) * Math.cos(pitch)]; return add(P, mul(d, .86)); };
hk(HSp, 0, scG([-.9, 1.75, .15], SY, .6), [-.33, 0, .94], [0, 1, 0], 'grip'); hk(HSp, D, scG(SCP, SY, .55), [-.33, 0, .94], [0, 1, 0], 'grip');
const handSp = hand('handSp', 'R', HSp, { anchor: 'grip', grabs: [grab('tank:scoop', T(30) - .4, D, [0, 0, -1], [0, 1, 0])] });
hk(HRn, 0, add(RZ, [-.5, .3, .1]), [1, 0, 0], [0, 0, 1], 'open'); hk(HRn, T(30) + 2.5, add(RZ, [-.5, .3, .1]), [1, 0, 0], [0, 0, 1], 'open'); hk(HRn, T(30) + 3.0, add(RZ, [-.02, .01, 0]), [1, 0, 0], [0, 0, 1], 'grip'); hk(HRn, D, RZ, [1, 0, 0], [0, 0, 1], 'grip');
const handRn = hand('handRn', 'L', HRn, { anchor: 'grip', grabs: [grab('tank:rinse', T(30) + 3.05, D, [1, 0, 0], [0, 0, 1])] });

// ---- the cat (line 26): walks in, crouches, hops onto the front rim, peers and paws; hops down and leaves when the net comes
const t26 = T(26), cat = { id: 'cat', type: 'tank_cat', pos: [0, 0, 0], anim: 'none', params: { link: 'cat', track: [
  [t26, 2.3, 1.35, 'stand', 2.6, 0], [t26 + .3, 2.3, 1.35, 'stand', 2.6, 0], [t26 + 2.5, 1.02, .86, 'walk', null, 0], [t26 + 2.9, 1.0, .84, 'stand', 2.5, 0], [t26 + 3.3, 1.0, .84, 'crouch', 2.5, 0],
  [t26 + 3.85, .62, .55, 'hop', PI, TOP], [t26 + 4.3, .6, .55, 'stand', PI, TOP], [t26 + 5.0, .58, .55, 'peer', PI, TOP], [Tnet - .5, .58, .55, 'paw', PI, TOP], [Tnet - .1, .58, .55, 'crouch', PI, TOP],
  [Tnet + .45, .55, 1.05, 'hop', 1.6, 0], [Tnet + .8, .58, 1.1, 'stand', .4, 0], [Tnet + 2.4, 1.65, 1.2, 'walk', null, 0], [Tnet + 4.4, 2.6, -.5, 'walk', null, 0], [D, 2.6, -.5, 'stand', 1.2, 0]] } };

// ---- the dish (line 32) on a cutting board on a crate in front of the tank
const DSH = [1.0, .5, 1.3];
const dishSet = [glb('crate', 'ph/wooden_crate_01', [DSH[0], 0, DSH[2]], .46, {}, { rotY: .3 }), glb('board', 'ph/wooden_cutting_board', [DSH[0], .46, DSH[2]], .025, {}, { rotY: .3 }),
  { id: 'dish', type: 'tilapia_dish', pos: [DSH[0], DSH[1] - .015, DSH[2]], rotY: .3, anim: 'none', params: {} }, glb('lemon', 'ph/lemon', [DSH[0] + .25, DSH[1] - .01, DSH[2] + .1], .055, {}, { rotY: 1 })];

// ---- the garden (real models first)
const world = [{ id: 'shade', type: 'shade_net', pos: [0, 0, -.45], anim: 'none', params: { w: 2.8, d: 1.3, h: 2.25 } }];
[[-4.6, -4.2, 9], [-5.8, -.6, 10.5], [5.6, -5.0, 9.5], [3.4, -6.8, 8.5], [6.4, 1.6, 9]].forEach(([x, z, h], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${1 + i % 3}`, [x, 0, z], h, { sway: .01, ph: i }, { rotY: i * 1.9 })));
[[-2.6, -1.9, .9, 'nature_pack/Bush_1'], [2.5, -2.2, .8, 'ph/shrub_02'], [-3.1, 1.2, .7, 'ph/shrub_01'], [3.2, 2.2, .6, 'ph/shrub_03'], [-2.2, 2.6, .35, 'ph/rock_07'], [2.1, -.6, .5, 'ph/shrub_01']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, [x, 0, z], h, { sway: .015, ph: i * 2 }, { rotY: i * 1.3 })));
for (let i = 0, n = 0; i < 900 && n < 18; i++) { const x = -4 + R() * 8, z = -3 + R() * 6; if (Math.abs(x) < 2.0 && z > -1.6 && z < 2.4) continue;
  world.push(glb('fl' + n, n % 2 ? 'ph/flower_gazania' : 'ph/dandelion_01', [r3(x), 0, r3(z)], r3(.18 + R() * .1), { sway: .03, ph: n }, { rotY: R() * 6 })); n++; }
for (let i = 0, n = 0; i < 900 && n < 40; i++) { const x = -6 + R() * 12, z = -4 + R() * 9; if (Math.abs(x) < 1.5 && z > -1.2 && z < 1.6) continue;
  world.push(glb('gr' + n, ['nature_pack/Grass_Short', 'nature_pack/Grass', 'nature_pack/Grass_2'][n % 3], [r3(x), 0, r3(z)], r3(.2 + R() * .2), { sway: .03, ph: n }, { rotY: R() * 6 })); n++; }

// ---- beats (22; one new camera set-up and one new state each, all under 12 s)
const b = [];
// 1 hook: the finished tank under the half shade cloth, a few tilapia under the surface; 4.3 m slow push-in toward the water
b.push({ t: 0, kind: 'intro', add: [...world, tank], camera: { target: [0, .85, 0], dist: 5.4, elev: .3, az: .25, push: .42 } });
// 2 from above: the whole house for the fish, bubbles from the air stone
b.push({ t: Tb2, kind: 'info', camera: { target: [0, .95, 0], dist: 3.7, elev: 1.3, az: 1.52, spin: .1 } });
// 3 the rebar cage and the walls cast up to the rim; the shade cloth rises (line 4)
b.push({ t: T(3), kind: 'info', remove: ['shade'], add: [{ id: 'shade2', type: 'shade_net', pos: [0, 0, -.45], anim: 'rise', delay: r3(T(4) + .3 - T(3)), params: { w: 2.8, d: 1.3, h: 2.25 } }],
  camera: { target: [0, .75, -.1], dist: 5.9, elev: .36, az: .5, spin: .15 } });
// 4 the inner coat brushed on, then the hose fills the tank
b.push({ t: T(5), kind: 'info', add: [handP], camera: { fly: { target: [[0, .5, -.35], [-.25, .7, 0]], dist: [3.0, 2.3], elev: [.85, .75], az: [.15, -.25], ease: true, blend: true } } });
// 5 sun on the water, fish basking near the surface, then gulping (they need oxygen)
b.push({ t: T(7), kind: 'info', remove: ['handP', 'handN'], camera: { target: [.05, .95, .05], dist: 1.35, elev: .34, az: -.35, push: .1 } });
// 6 pump on its block, airline over the rim, bubbles; the hand checks the plug; the power cuts, bubbles stop, fish gasp
b.push({ t: Tb6, kind: 'problem', camera: { target: [.4, .42, .15], dist: 2.7, elev: .78, az: 1.2, spin: .08 } });
// 7 waste flecks and an ammonia haze; the filter sack is lowered on its cord
b.push({ t: T(10), kind: 'problem', remove: ['handG'], camera: { target: [-.4, .62, -.1], dist: 2.1, elev: 1.0, az: .4 } });
// 8 bacteria round the sack, the haze drains into it and clears
b.push({ t: T(12), kind: 'solution', camera: { target: [-.5, .32, -.28], dist: 1.05, elev: .8, az: .7, push: .1 } });
// 9 the fry bag is carried in by its neck
b.push({ t: T(13), kind: 'info', remove: ['handBg', 'handR'], add: [handF], camera: { target: [.3, 1.25, .25], dist: 1.7, elev: .18, az: .4 } });
// 10 macro through the plastic: lively fry, clear eyes, the same size
b.push({ t: T(14), kind: 'info', add: [stk('mag', 'magnifier', [BAGH[0] - .07, BAGH[1] + .14, BAGH[2] + .08], .06, { delay: 1.2 })], camera: { target: [BAGH[0], BAGH[1] - .01, BAGH[2]], dist: .62, elev: .08, az: .35, spin: .3 } });
// 11 from above: the whole stock in one bag, set down on the water
b.push({ t: T(16), kind: 'info', remove: ['mag'], camera: { target: [0, 1.0, .05], dist: 1.9, elev: 1.3, az: 1.5, spin: .08 } });
// 12 the bag floats to even out the temperature, then a hand opens it and the fry swim out
b.push({ t: Tb12, kind: 'info', remove: ['handF'], camera: { target: [-.12, .98, .08], dist: 1.15, elev: .3, az: .55 } });
// 13 the first week: a palm on the rim, watching the fry
b.push({ t: T(19), kind: 'info', remove: ['handO'], add: [handW, stk('eyes', 'eyes', [-.3, 1.45, .05], .1, { delay: 1.0 })], camera: { target: [-.5, .95, -.1], dist: 1.8, elev: .75, az: -.1 } });
// 14 feeding: small pinches tossed, fish rise and take them
b.push({ t: T(20), kind: 'info', remove: ['handW', 'eyes'], add: [handD], camera: { target: [.04, 1.05, .1], dist: 1.45, elev: .7, az: .55 } });
// 15 a handful too many sinks and rots; sated fish gulp at the surface (pull in to one fish)
b.push({ t: T(21), kind: 'problem', camera: { fly: { target: [[0, .5, .05], [.12, .95, .02]], dist: [2.0, .8], elev: [.95, .4], az: [.2, .55], ease: true, blend: true } } });
// 16 fish sulk on the bottom, the water goes murky
b.push({ t: T(23), kind: 'problem', remove: ['handD'], camera: { target: [0, .35, 0], dist: 2.4, elev: 1.15, az: -.3 } });
// 17 water change: siphon out a quarter, then a bucket of matched water poured slowly over the rim
b.push({ t: T(24), kind: 'solution', add: [handS], camera: { target: [-.2, 1.0, .6], dist: 2.2, elev: .32, az: -.12 } });
// 18 a cat hops onto the rim to fish; the bird net comes down over the tank
b.push({ t: T(26), kind: 'solution', remove: ['handS', 'handBH', 'handBB'], add: [cat], camera: { target: [.45, .65, .6], dist: 2.9, elev: .25, az: .6, spin: .15 } });
// 19 the net folded back, the rim scrubbed of algae
b.push({ t: T(28), kind: 'info', remove: ['cat'], add: [handC], camera: { fly: { target: [[-.35, 1.1, .55], [.35, 1.1, .55]], dist: [1.25, 1.25], elev: [.42, .42], az: [.32, .25], blend: true } } });
// 20 months pass: the fish grow; a soft scoop net lifts one and it is rinsed
b.push({ t: T(29), kind: 'info', remove: ['handC'], camera: { fly: { target: [[0, .9, 0], [.1, 1.32, .3]], dist: [2.9, 1.6], elev: [1.25, .36], az: [1.5, .45], ease: true, blend: true } } });
// 21 a new cycle: a new bag of fry released into the tank
b.push({ t: T(31), kind: 'info', remove: ['handSp', 'handRn'], camera: { target: [-.08, .95, -.02], dist: 1.5, elev: .95, az: -.95 } });
// 22 the fried tilapia on its platter, then the camera pulls back round the tank (CTA)
b.push({ t: T(32), kind: 'info', remove: ['handO2'], add: dishSet, camera: { fly: { target: [[DSH[0], DSH[1] + .04, DSH[2]], [0, .75, 0]], dist: [.8, 4.4], elev: [.55, .33], az: [.5, 2.0], ease: true, blend: true } } });
// hands that come in mid-beat (spawned off-frame on their approach keys)
[[T(6) - .05, handN], [TP - 1.3, handG], [Tb0 - .1, handBg], [T(11) + .8, handR], [Topen - 1.3, handO], [Tbk - .1, handBH], [Tbk - .1, handBB], [T(30) - .5, handSp], [T(30) + 2.4, handRn], [Topen2 - 1.3, handO2]]
  .forEach(([t, h]) => b.push({ t, merge: true, add: [h] }));
const merged = b.filter(x => !x.merge), extra = b.filter(x => x.merge);

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'إزاي تعمل مزرعة بلطي صغيرة في حوض أسمنت في جنينتك',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 42,
  env: { island: { w: 16, d: 15, depth: 3.2 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, soilTint: [.96, .98, .9], horizon: 'nile', cover: 'high',
    haze: .5, sunElev: 44, sunAz: 35, turbidity: 2.6, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .4, clouds: 12 },
  style: { camEase: .6, captionY: .78, exposure: 1.05, foreground: false, handheld: .6 },
  beats: merged.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
for (const x of extra) { const bt = plan.beats.find(q => x.t >= q.start && x.t < q.end); bt.add = [...bt.add, ...x.add.map(o => ({ ...o, delay: r3(x.t - bt.start) }))]; }
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
