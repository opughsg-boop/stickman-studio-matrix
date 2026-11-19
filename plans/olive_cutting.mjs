// "إزاي تعمل شتلة زيتون جديدة من فرع صغير؟" - a hardwood olive cutting in an Egyptian garden in late-winter light: the branch on a living
// olive tree, a gardener's palm on the bark, a pinch on a 20 cm pencil-thick shoot, a grafting knife cuts just below a node (cut face with
// a bright cambium ring), the lower leaves stripped, sand + fine soil mixed in a terracotta pot, a finger hole, half the cutting buried,
// the mix darkens damp, a shade net, a cutaway pot in three root stages, white root tips, a new shoot, the transplant to a bigger pot.
// Locked look: 3D sky, real soil, flat garden (flatTop), Nile horizon, real sizes in metres.
// 1x improvement over the last video (wood_bed / hens_winter):
//  - Motion: hands are now jointed (3 phalanges per finger, a thumb solved by IK onto the index pad every frame) and RIDE the object they
//    hold (grabs are keyed in the cutting's own frame, so the pinch never slips while the cutting is lifted, turned and pushed into the soil);
//    a knife slice with slow pressure then follow-through; stripped leaves flutter down on a ballistic arc and land on the table;
//    roots grow along their length with white tips (drawRange), the soil swirls as it mixes, the pot's front half lifts away.
//  - Graphics: two-tone olive leaves (dark grey-green top, silver underside by a back-face shader), fissured grey bark with lichen and
//    knots, a slanted cut face with bark / bright green cambium / cream wood / pith, wet soil that darkens and loses roughness, a
//    terracotta lathe pot with salt bloom and throwing rings, a cutaway soil face with grit, skin with sheen, a twill sleeve.
//  - Realism: real sizes (cutting 0.20 m x 1 cm with 4 nodes 5 cm apart, olive leaves 6-7 cm, pot 0.25 m, bowl 0.20 m, tree 3.6 m,
//    potting table 0.78 m), late-winter olive with leaves and no flowers or fruit, cut 1.5 cm below the lowest node, half buried (10 cm),
//    a shade net, roots from the cut face and the buried nodes, a root ball at transplanting.
// Contact: hand anchors are the index pad (pinch/point) or the knife edge, placed by the renderer on the stem or soil point (0 m by
// construction); farmer palm on the bark checked with the probe (see report). Stickers: 2 wordless (arrow at the node, ring at the roots).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const ws = S[Math.min(i, S.length - 1)].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const stk = (id, name, pos, size, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const r3 = v => Math.round(v * 1000) / 1000, R3 = a => a.map(r3);

// ---- tiny vector / quaternion kit (same maths as the renderer: setFromUnitVectors, axis-angle, basis)
const add = (a, b) => a.map((x, i) => x + b[i]), sub = (a, b) => a.map((x, i) => x - b[i]), mul = (a, k) => a.map(x => x * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = a => mul(a, 1 / Math.hypot(...a)), Y = [0, 1, 0];
const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qAxis = (ax, g) => [...mul(norm(ax), Math.sin(g / 2)), Math.cos(g / 2)], qConj = q => [-q[0], -q[1], -q[2], q[3]];
const qFromY = a => { const c = cross(Y, a), q = [c[0], c[1], c[2], dot(Y, a) + 1], n = Math.hypot(...q); return q.map(x => x / n); };
const qRot = (q, v) => { const p = qMul(qMul(q, [...v, 0]), qConj(q)); return p.slice(0, 3); };
const cutQ = (a, spin) => qMul(qFromY(norm(a)), qAxis(Y, spin));
const camDir = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)], camRight = az => [Math.cos(az), 0, -Math.sin(az)];
const basis = (f, u) => { const z = norm(f), y = norm(sub(u, mul(z, dot(u, z)))); return { x: cross(y, z), y, z }; };
// a pinch frame around an object axis: hand x along the axis, fingers toward fDesired (projected), back of hand toward uHint
const pinchFrame = (axis, fDesired, uHint) => { const f = norm(sub(fDesired, mul(axis, dot(fDesired, axis)))); let u = cross(f, axis); if (dot(u, uHint) < 0) u = mul(u, -1); return { f, u: norm(u) }; };

// ---- times from the voice
const T1 = at(1), Tbr = word(1, /والفروع/, .65), T2 = at(2), T3 = at(3), Tq = word(3, /والقطعة/, .3), Tunder = word(3, /تحت/, .5) - .1, T4 = at(4), Ttaraf = word(4, /الطرف/, .6);
const T5 = at(5), Tdig = word(5, /واحفر/, .4), Tbury = word(5, /وادفن/, .7), T6 = at(6), Tshade = word(6, /والفرع/, .6), T7 = at(7), T7b = word(7, /^من$/, .35), T7c = word(7, /تطلع/, .7);
const T8 = at(8), T8b = word(8, /هتشوف/, .25), T9 = at(9), T9b = word(9, /وبعد/, .6), T10 = at(10);

// ---- layout (metres). Camera mostly from +z / +x; the tree stands behind the potting table.
const TREE = [-1.1, 0, -1.6], C = [-.2, 1.3, -.62], A0 = norm([.42, .8, .42]), SPIN = 2.18;      // C: cut point on the living shoot (cutting base)
const TOP = .78, BOWL = [.2, TOP, -.2], BH = .2, BYS = BH - .025, POT = [-.17, TOP, -.22], PH = .25, PYS = PH - .03;
const BSOIL = BOWL[1] + BYS + .006, PSOIL = POT[1] + PYS + .006;                                    // soil tops (dome crest)
const NODES = [.015, .065, .115, .165], HIDE = [0, -3, 0];
const H1 = [.0, 1.12, -.1], A1 = norm([-.34, .3, -.89]);                                           // held up, cut face toward the camera
const H2 = [.04, .99, -.08], A2 = norm([.04, 1, .1]);                                              // upright for stripping
const H3 = [-.13, 1.0, -.04];                                                                       // waiting beside the bowl
const PLANT = [BOWL[0], BSOIL - .1, BOWL[2]], PLANT2 = [POT[0], PSOIL - .1, POT[2]];                 // half buried (10 cm) in the bowl, then the pot

// ---- cameras (one per beat; az from +z toward +x)
const CAM = {
  hook: { preset: 'close', target: add(C, mul(A0, .1)), dist: 1.5, elev: .14, az: .55, push: .22, fov: 40 },
  wide: { preset: 'hero', target: [-.95, 1.75, -1.45], dist: 6.6, elev: .1, az: .12, push: .06 },
  shoots: { preset: 'close', target: add(C, mul(A0, .06)), dist: .95, elev: .32, az: .95, push: .1, fov: 38 },
  pinch: { preset: 'close', target: add(C, mul(A0, .1)), dist: .62, elev: .08, az: .55, push: .1, fov: 34 },
  knife: { preset: 'close', target: add(C, mul(A0, .04)), dist: .5, elev: .02, az: .3, push: .08, fov: 34 },
  face: { preset: 'close', target: add(H1, mul(A1, .015)), dist: .3, elev: .18, az: .35, push: .1, fov: 34 },
  stripC: { preset: 'close', target: add(H2, mul(A2, .085)), dist: .55, elev: .1, az: .3, push: .08, fov: 34 },
  trim: { preset: 'close', target: add(H2, mul(A2, .15)), dist: .34, elev: .26, az: .02, push: .1, fov: 34 },
  mix: { preset: 'close', target: [BOWL[0] - .04, BSOIL + .03, BOWL[2]], dist: .62, elev: .72, az: .3, push: .1, fov: 36 },
  bury: { preset: 'low', target: [BOWL[0] - .01, BSOIL + .06, BOWL[2]], dist: .58, elev: .16, az: 1.15, push: .08, fov: 34 },
  wet: { preset: 'close', target: [BOWL[0], BSOIL + .02, BOWL[2]], dist: .4, elev: .5, az: .45, push: .1, fov: 34 },
  shade: { preset: 'low', target: [.2, 1.3, -.2], dist: 2.0, elev: -.05, az: .2, push: .06, fov: 50 },
  st1: { preset: 'close', target: [BOWL[0], BOWL[1] + .12, BOWL[2]], dist: .56, elev: .1, az: 0, push: .08, fov: 34 },
  st2: { preset: 'close', target: [BOWL[0], BOWL[1] + .1, BOWL[2]], dist: .44, elev: .16, az: -.3, push: .08, fov: 34 },
  st3: { preset: 'close', target: [BOWL[0], BOWL[1] + .12, BOWL[2]], dist: .58, elev: .04, az: .3, push: .08, fov: 34 },
  roots: { preset: 'close', target: [BOWL[0] + .01, PLANT[1] - .032, BOWL[2] + .01], dist: .26, elev: .04, az: -.08, push: .1, fov: 34 },
  shoot: { preset: 'close', target: [BOWL[0], PLANT[1] + .2, BOWL[2]], dist: .3, elev: .32, az: .4, push: .1, fov: 34 },
  move: { preset: 'close', target: [(BOWL[0] + POT[0]) / 2, 1.04, -.21], dist: 1.35, elev: .3, az: .12, push: .06, fov: 38 },
  garden: { preset: 'hero', target: [-.93, 1.52, -1.45], dist: 2.5, elev: -.21, az: .55, push: .05, fov: 64 },
  cta: { preset: 'orbit', target: [POT[0], PSOIL + .03, POT[2]], dist: .9, elev: .26, az: -.2, fov: 40 },
};

// ---- the cutting: world track [t, x,y,z, axis, spin] (keys eased by the renderer)
const CT = [], ck = (t, p, a, s = SPIN) => CT.push([r3(t), ...R3(p), ...R3(norm(a)), s]);
const Tcut = Tq - .25;
ck(0, C, A0); ck(Tcut + .25, C, A0); ck(Tcut + .95, H1, A1); ck(T4 + .05, H1, A1); ck(T4 + .75, H2, A2);
ck(T5 - .4, H2, A2); ck(T5 + .3, H3, Y); ck(Tbury - .1, H3, Y); ck(Tbury + .45, add(PLANT, [0, .1, 0]), Y); ck(Tbury + 1.1, PLANT, Y);
const Tlift = T9 + 1.0; ck(Tlift, PLANT, Y); ck(Tlift + .6, [BOWL[0], 1.12, BOWL[2]], Y); ck(Tlift + 1.25, [POT[0], 1.12, POT[2]], Y); ck(Tlift + 1.8, PLANT2, Y);
const keyAt = t => { let k = CT[0]; for (const q of CT) if (q[0] <= t) k = q; return { p: k.slice(1, 4), a: k.slice(4, 7), s: k[7] }; };   // pose while it rests at a key
const stemPt = (K, s, off = [0, 0, 0]) => add(K.p, qRot(cutQ(K.a, K.s), add(off, [0, s, 0])));

// ---- hands: own tracks [t, x,y,z, f, u, pose] + grabs riding the cutting
const HL = [], HR = [], hk = (T, t, p, fr, pose) => T.push([r3(t), ...R3(p), ...R3(fr.f), ...R3(fr.u), pose]);
const hide = (T, t, fr = { f: [0, 0, -1], u: Y }) => hk(T, t, HIDE, fr, 'open');
// grab spec (cutting frame) + the world anchor it produces at a resting key (to join the own track smoothly)
const grabOf = (K, s, fw, uw, o = {}) => { const Q = cutQ(K.a, K.s), Qi = qConj(Q), off = o.off || [0, -.0058, 0], B = basis(fw, uw), P = stemPt(K, s, o.at || [0, 0, 0]);
  return { spec: { obj: 'cut', s, f: R3(qRot(Qi, B.z)), u: R3(qRot(Qi, B.y)), off, ...(o.at ? { at: R3(o.at) } : {}), pose: o.pose || 'pinch' },
    anchor: sub(P, add(add(mul(B.x, off[0]), mul(B.y, off[1])), mul(B.z, off[2]))), fr: { f: B.z, u: B.y } }; };
const away = (P, az, k = .22, down = .12) => add(add(P, mul(camDir(az, 0), k)), [0, -down, 0]);                 // a point out of the close frame, toward the camera

// left hand: pinch the living shoot (line 2), hold it through cut, lift, stripping, the bowl and the burial; later lift the young plant
const K0 = keyAt(0), sL = .132;
const fL0 = pinchFrame(A0, add(mul(camDir(CAM.pinch.az, 0), -.6), mul(camRight(CAM.pinch.az), .8)), add(camDir(CAM.pinch.az, 0), [0, .5, 0]));
const gL1 = grabOf(K0, sL, fL0.f, fL0.u);
hide(HL, 0); hide(HL, T2 + .2); hk(HL, T2 + .2001, away(gL1.anchor, CAM.pinch.az + .5, .3, .18), gL1.fr, 'open'); hk(HL, T2 + .95, add(gL1.anchor, mul(gL1.fr.f, -.03)), gL1.fr, 'open');
hk(HL, T2 + 1.25, gL1.anchor, gL1.fr, 'pinch');
const KP = keyAt(Tbury + 1.2), gL2 = grabOf(KP, sL, gL1.fr.f, gL1.fr.u);                                          // the release point after the burial, same frame
const Lrel = T6 - .1; hk(HL, Lrel, gL2.anchor, gL2.fr, 'pinch'); hk(HL, Lrel + .35, add(gL2.anchor, mul(gL2.fr.f, -.04)), gL2.fr, 'open');
hk(HL, Lrel + .9, away(gL2.anchor, CAM.wet.az - .9, .35, .2), gL2.fr, 'open'); hide(HL, Lrel + .9001);
// young plant lift at transplanting: pinch the stem 1 cm above the soil (left hand)
const KB = keyAt(Tlift), fL9 = pinchFrame(Y, add(mul(camDir(CAM.move.az, 0), -.7), mul(camRight(CAM.move.az), .7)), add(camDir(CAM.move.az, 0), [0, .6, 0]));
const gL9 = grabOf(KB, .11, fL9.f, fL9.u), K9e = keyAt(Tlift + 1.9), gL9e = grabOf(K9e, .11, fL9.f, fL9.u);
hide(HL, T9 + .1); hk(HL, T9 + .1001, away(gL9.anchor, CAM.move.az + .6, .35, .1), gL9.fr, 'open'); hk(HL, Tlift - .3, add(gL9.anchor, mul(gL9.fr.f, -.03)), gL9.fr, 'open');
hk(HL, Tlift - .05, gL9.anchor, gL9.fr, 'pinch'); hk(HL, Tlift + 2.0, gL9e.anchor, gL9e.fr, 'pinch'); hk(HL, Tlift + 2.4, add(gL9e.anchor, mul(gL9e.fr.f, -.05)), gL9e.fr, 'open');
hk(HL, Tlift + 3.0, away(gL9e.anchor, CAM.move.az + .6, .4, .15), gL9e.fr, 'open'); hide(HL, Tlift + 3.0001);
const grabsL = [{ ...gL1.spec, k: [[T2 + 1.2, 0], [T2 + 1.3, 1], [Lrel, 1], [Lrel + .15, 0]] }, { ...gL9.spec, k: [[Tlift - .1, 0], [Tlift, 1], [Tlift + 2.0, 1], [Tlift + 2.15, 0]] }];

// right hand: knife cut just below the lowest node (line 3)
const KC = keyAt(Tcut - .5), xBody = norm((v => sub(v, mul(A0, dot(v, A0))))(add(add(mul(camRight(CAM.knife.az), .7), mul(camDir(CAM.knife.az, 0), .5)), [0, -.35, 0])));
const eCut = norm(cross(xBody, A0)), knFr = { f: eCut, u: A0 }, cutP = stemPt(KC, -.004), Rr = .005;
hide(HR, 0); hide(HR, T3 + .2); hk(HR, T3 + .2001, add(away(cutP, CAM.knife.az + .4, .3, .2), mul(eCut, -.05)), knFr, 'fist');
hk(HR, Tcut - .55, add(cutP, mul(eCut, -(Rr + .025))), knFr, 'fist'); hk(HR, Tcut - .3, add(cutP, mul(eCut, -(Rr + .002))), knFr, 'fist');
hk(HR, Tcut + .12, add(cutP, mul(eCut, Rr + .018)), knFr, 'fist'); hk(HR, Tcut + .6, add(add(cutP, mul(eCut, .06)), [0, -.05, 0]), knFr, 'fist');
hk(HR, Tcut + 1.1, away(cutP, CAM.knife.az + .5, .4, .25), knFr, 'fist'); hide(HR, Tcut + 1.1001);
// right hand: strip the three lower leaf pairs (line 4). Pair i sits at angle i*pi/2+.3 (cutting frame); take the side facing camera-right.
const KS = keyAt(T4 + .8), QS = cutQ(KS.a, KS.s), stripT = [0, 1, 2].map(i => word(4, /شيل/, .2) + .05 + i * .6), strips = [], grabsR = [];
hide(HR, T4 + .2);
stripT.forEach((ts, i) => { const th = i * Math.PI / 2 + .3, sides = [0, 1].map(k => [Math.cos(th + k * Math.PI), 0, Math.sin(th + k * Math.PI)]);
  const dl = sides.sort((a, b) => dot(qRot(QS, b), camRight(CAM.stripC.az)) - dot(qRot(QS, a), camRight(CAM.stripC.az)))[0], dw = qRot(QS, dl);
  const la = norm(add(mul(dw, Math.sin(.97)), mul(qRot(QS, Y), Math.cos(.97)))), fr = pinchFrame(la, add(mul(camDir(CAM.stripC.az, 0), -.7), mul(camRight(CAM.stripC.az), -.5)), [0, 1, 0]);
  const g = grabOf(KS, NODES[i], fr.f, fr.u, { at: add(mul(dl, .009), [0, .004, 0]), off: [0, -.003, 0] });
  if (i === 0) hk(HR, T4 + .2001, away(g.anchor, CAM.stripC.az - .5, .3, .2), g.fr, 'open');
  hk(HR, ts - .25, add(g.anchor, mul(dw, .02)), g.fr, 'open'); hk(HR, ts - .06, g.anchor, g.fr, 'pinch');
  hk(HR, ts + .22, add(add(g.anchor, mul(dw, .06)), [0, -.025, 0]), g.fr, 'pinch'); hk(HR, ts + .3, add(add(g.anchor, mul(dw, .065)), [0, -.03, 0]), g.fr, 'open');
  grabsR.push({ ...g.spec, k: [[ts - .08, 0], [ts - .02, 1], [ts + .02, 1], [ts + .2, 0]] });
  strips.push([r3(ts + .05), i, ...R3(add(mul(dw, .45), [0, .15, 0]))]); });
hk(HR, stripT[2] + 1.0, away(H2, CAM.stripC.az - .6, .4, .25), { f: [0, 0, -1], u: Y }, 'open'); hide(HR, stripT[2] + 1.0001);
// right hand: stir the sand into the soil with a finger, dig the hole, firm the soil after burial (line 5), then test the damp mix (line 6)
const ptFr = { f: norm([-.25, -.85, -.45]), u: norm([-.1, .45, -.9]) }, soilAt = (dx, dz, dy = 0) => [BOWL[0] + dx, BSOIL + dy, BOWL[2] + dz];
const Tmix = word(5, /رمل/, .3) - .1;
hide(HR, T5 + .1); hk(HR, T5 + .1001, add(soilAt(.06, .05, .12), mul(camDir(CAM.mix.az, .3), .25)), ptFr, 'point'); hk(HR, Tmix - .1, soilAt(.05, 0, .01), ptFr, 'point');
[[0, .05], [-.05, 0], [0, -.05], [.05, 0], [0, .04], [-.04, 0]].forEach(([x, z], i) => hk(HR, Tmix + .1 + i * .14, soilAt(x, z, -.006), ptFr, 'point'));
hk(HR, Tdig - .05, soilAt(0, 0, .03), ptFr, 'point'); hk(HR, Tdig + .35, soilAt(0, 0, -.022), ptFr, 'point'); hk(HR, Tdig + .8, soilAt(0, 0, -.022), ptFr, 'point');
hk(HR, Tdig + 1.15, soilAt(.03, .03, .05), ptFr, 'point'); hk(HR, Tbury - .2, soilAt(.09, .06, .06), ptFr, 'press');
hk(HR, Tbury + 1.2, soilAt(.022, .018, .02), ptFr, 'press'); hk(HR, Tbury + 1.45, soilAt(.022, .018, -.003), ptFr, 'press'); hk(HR, Tbury + 1.75, soilAt(.022, .018, .02), ptFr, 'press');
const Twet = word(6, /رطب/, .3); hk(HR, Twet + .3, soilAt(-.035, .03, .02), ptFr, 'point'); hk(HR, Twet + .65, soilAt(-.035, .03, -.004), ptFr, 'point'); hk(HR, Twet + 1.1, soilAt(-.035, .03, -.004), ptFr, 'point');
hk(HR, Twet + 1.5, soilAt(-.03, .1, .15), ptFr, 'point'); hide(HR, Twet + 1.5001);

// ---- objects
const scenery = [
  { id: 'tree', type: 'olive_tree', pos: TREE, params: { h: 3.6, seed: 23, az0: 2.6, reach: R3(sub(C, TREE)), reachDir: R3(A0), clear: .15 }, anim: 'none' },
  { id: 'table', type: 'potting_table', pos: [.1, 0, -.2], params: { h: TOP }, anim: 'none' },
  { id: 'wall', type: 'stone_wall', pos: [0, 0, -4.4], params: { w: 10, h: 1.4 }, anim: 'none' },
  glb('tree2', 'ph/island_tree_01', [3.4, 0, -3.6], 4.4), glb('sh1', 'ph/shrub_02', [-3.1, 0, -.5], .8), glb('sh2', 'ph/shrub_01', [2.3, 0, -1.9], .7),
  glb('fl1', 'ph/flower_gazania', [1.4, 0, .9], .25), glb('fl2', 'ph/flower_gazania', [-2.0, 0, 1.2], .22), glb('wd', 'ph/weed_plant_02', [-.6, 0, .6], .3),
  glb('can', 'ph/metal_jerrycan', [.75, 0, -.55], .35), glb('bag', 'ph/compost_bag_02', [-.85, 0, -.15], .45), glb('stump', 'ph/tree_stump_01', [-2.6, 0, -2.4], .5),
  ...[[2.9, .4], [-3.3, 1.6], [1.8, 2.2], [-1.8, -3.2], [3.6, -1.0]].map(([x, z], i) => glb('gr' + i, 'nature_pack/' + ['Grass', 'Grass_2', 'Grass_Short'][i % 3], [x, 0, z], .32)),
  ...[[2.6, -2.8], [-3.6, -1.5]].map(([x, z], i) => glb('rk' + i, 'ph/rock_07', [x, 0, z], .28))];
// gardener for the wide shot: right palm on the bark (pose barkTouch; palm offset from the probe), then he walks off behind the trunk
const PALM = [.355, 1.174, .261];                                       // right palm vs the rig position, facing +x (yaw pi/2), from the probe
const OFF = [-3.3, 0, -1.05], BARK = add(TREE, [-.09, 1.17, .09]), FPOS = sub(BARK, [PALM[0], PALM[1], PALM[2]]); FPOS[1] = 0;
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 3, track: [
  [0, ...OFF, null, 'walk'], [T1 - .2, ...OFF, null, 'walk'], [T1 + 1.4, ...R3(FPOS), null, 'walk', 'walk'], [T1 + 1.6, ...R3(FPOS), Math.PI / 2, 'stand'], [T1 + 2.3, ...R3(FPOS), Math.PI / 2, 'barkTouch'],
  [Tbr - .2, ...R3(FPOS), Math.PI / 2, 'barkTouch'], [Tbr + .3, ...R3(FPOS), -Math.PI / 2 - .4, 'stand'], [Tbr + 1.9, ...OFF, null, 'walk', 'walk']] } };
const cut = { id: 'cut', type: 'olive_cut', pos: [0, 0, 0], anim: 'none', params: { track: CT, nodes: NODES, cutAt: Tcut, strip: strips, floorY: TOP + .001,
  callusK: [[T7b - .1, 0], [T7b + .7, 1]], rootsK: [[T7b, 0], [T7b + 1.0, .17], [T7c - .1, .17], [T7c + 1.1, 1]], shootK: [[T8b - .1, 0], [T8b + 1.3, 1]], ballK: [[Tlift - .2, 0], [Tlift, 1]] } };
const handL = { id: 'handL', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side: 'L', link: 'handL', track: HL, grabs: grabsL } };
const handR = { id: 'handR', type: 'gard_hand', pos: [0, 0, 0], anim: 'none', params: { side: 'R', link: 'handR', track: HR, grabs: grabsR, knifeK: [[0, 0], [T3, 1], [Tcut + 1.2, 1], [Tcut + 1.25, 0]] } };
const bowl = { id: 'bowl', type: 'olive_pot', pos: BOWL, anim: 'none', params: { r: .11, rb: .08, h: BH, fill: .025, mixK: [[Tmix, 0], [Tmix + .9, 1]], holeK: [[Tdig + .1, 0], [Tdig + .5, 1]],
  wetK: [[Twet - .2, 0], [Twet + .9, 1]], secK: [[T7 + .15, 0], [T7 + .8, 1], [T9 + .1, 1], [T9 + .7, 0]] } };
const pot = { id: 'pot', type: 'olive_pot', pos: POT, anim: 'none', params: { r: .14, rb: .1, h: PH, fill: .03, mixed: true, holeK: [[T9 + .3, 0], [T9 + .6, 1]], wetK: [[0, .55]] } };
const net = { id: 'net', type: 'shade_net', pos: [.3, 0, -.12], params: { w: 1.7, d: 1.5, h: 1.95, color: '#2f4434' }, anim: 'grow' };
const C1 = CAM.face, nodeW = stemPt(keyAt(Tunder), NODES[0]);
const arrow = stk('arN', 'arrow_left', R3(add(add(nodeW, mul(camRight(C1.az), .028)), [0, .004, 0])), .022, { delay: .25 });
const ring = stk('ringR', 'circle_ring', R3([BOWL[0] + .012, PLANT[1] - .03, BOWL[2] + .02]), .05, { delay: .5 });

const b = [];
b.push({ t: 0, kind: 'intro', add: [...scenery, cut, farmer, handL, handR, bowl, pot], camera: CAM.hook });
b.push({ t: T1, kind: 'info', camera: CAM.wide });
b.push({ t: Tbr, kind: 'info', camera: CAM.shoots });
b.push({ t: T2, kind: 'info', remove: ['farmer'], camera: CAM.pinch });
b.push({ t: T3, kind: 'info', camera: CAM.knife });
b.push({ t: Tunder, kind: 'info', add: [arrow], camera: CAM.face });
b.push({ t: T4, kind: 'info', remove: ['arN'], camera: CAM.stripC });
b.push({ t: Ttaraf, kind: 'info', camera: CAM.trim });
b.push({ t: T5, kind: 'info', camera: CAM.mix });
b.push({ t: Tbury, kind: 'info', camera: CAM.bury });
b.push({ t: T6, kind: 'info', camera: CAM.wet });
b.push({ t: Tshade, kind: 'info', add: [net], camera: CAM.shade });
b.push({ t: T7, kind: 'info', camera: CAM.st1 });
b.push({ t: T7b, kind: 'info', camera: CAM.st2 });
b.push({ t: T7c, kind: 'info', camera: CAM.st3 });
b.push({ t: T8, kind: 'info', add: [ring], camera: CAM.roots });
b.push({ t: T8b, kind: 'solution', remove: ['ringR'], camera: CAM.shoot });
b.push({ t: T9, kind: 'info', camera: CAM.move });
b.push({ t: T9b, kind: 'info', camera: CAM.garden });
b.push({ t: T10, kind: 'info', camera: CAM.cta });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'شتلة زيتون من عقلة خشبية',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2, flatTop: true, horizon: 'nile', sunElev: 40, sunAz: 32 }, style: { camEase: .6, captionY: .78, exposure: 1.1, handheld: .5 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
