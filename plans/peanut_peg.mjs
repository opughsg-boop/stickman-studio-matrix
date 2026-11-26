// "ليه الفول السوداني بيكبر جوه التراب مش فوقه؟!" (voice-over 2026-11-26, 8 lines, 36.5 s, one take). Real-sky island of sandy Egyptian
// farmland (Ismailia-style sandy loam) in morning sun: a peanut bed with rows of groundnut plants; the hero plant stands at the island's
// front edge so its peg, pod and roots show on the soil section (the island face, z = 8). Every spoken line is shown, never written:
//  1 hook: close on a yellow pea flower on its stalk above the soil; it opens; ring round the flower
//  2 pull back: the flower stands above the ground (arrow up); close: pollinated (sparkles, the flower glows), it withers and its stalk
//    bends down and grows to the soil, side view (arrow down)
//  3 the peg touches the soil (ring round the peg), the camera drops to the soil section: the peg buries itself, the tip swells into a pod
//    underground (point-down on the pod)
//  4 sun rays and a beetle crawl above the soil (microbe above the soil), the pod stays safe underground (check on the pod)
//  5 the farmer leans on his hoe and waits (hourglass); on the section the other pods fill out (hourglass); he lays the hoe down, steps
//    in, squats, takes the stem with both hands, tugs and pulls the whole plant out; the roots and pods come up, soil falls, a hole stays
//  6 he holds it up and shakes the soil off; the pods hang on the roots like a bunch (ring), then the hole they came from (point-down)
//  7 a plant on hard soil: the crust dries and cracks, its flower withers, its peg bends down, hits the crust and kinks (cross), only a
//    tiny pod forms (arrow down)
//  8 CTA: the farmer turns to us holding the pulled plant; thumbs-up; slow pull-out arcing round
// Step up vs the last render (tomato stake, score 80):
//  motion   - the peg is one continuous curve that rotates from upright to the soil, then extends underground (never a pop); the plant
//             rides the farmer's palm mid from grab to lift, so the hands never slide off the stem; anticipation dip + tug before the
//             lift, a shake with soil crumbs falling under gravity; the hoe tips over with gravity and one bounce; leaf flutter
//  graphics - new procedural groundnut (tetrafoliate leaves of obovate veined leaflets, pea flowers with standard + wing petals and red
//             nectar guides, a peg tube rebuilt each frame, reticulated pods with a bump map, taproot with laterals, nodules and clinging
//             crumbs), sandy loam bed texture, an iron-bladed fas with a polished edge, a hole left in the soil
//  realism  - real sizes: plant 0.3-0.38 m, leaflets 3.6-4.3 cm, flower 1.5 cm, peg 2 mm, pod 3-4.5 cm 3-7 cm deep, roots to 0.31 m,
//             hoe 1.03 m, farmer 1.75 m; pods form horizontally at the peg tip; pulled plant shows the pods clustered under the crown;
//             peanuts on light sandy soil (not Delta silt); hard crusted soil only in its own patch
//  sound    - this plan only: a field wind bed (.03) plus a faint bird bed (.02), no calls, all ducked under the voice
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const W = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[Math.min(k, S[Math.min(i, S.length - 1)].words.length - 1)].start);
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const stk = (id, name, pos, size = .3, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, onTop: true, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const obj = (id, type, pos, params, rotY = 0) => ({ id, type, pos, rotY, params, anim: 'none', dust: false });

// ---------- key times (word starts); T.lN = start of spoken line N+1 ----------
const T = { l1: W(1), l2: W(2), l3: W(3), l4: W(4), l5: W(5), l6: W(6), l7: W(7),
  up2: W(1, 3), but2: W(1, 7), pol2: W(1, 10), stem2: W(1, 11), down2: W(1, 13), name3: W(2, 3), bury3: W(2, 4), grow3: W(2, 9),
  sun4: W(3, 4), bugs4: W(3, 6), safe4: W(3, 7), wait5: W(4, 2), done5: W(4, 3), then5: W(4, 8), pull5: W(4, 9), bunch6: W(5, 5), under6: W(5, 7),
  hard7: W(6, 2), peg7: W(6, 6), less7: W(6, 10), like8: W(7, 5) };

// ---------- layout (metres). Island front face at z = 8; the camera works from +z ----------
const P0 = [0, 7.92];                       // hero plant crown (peg enters the soil 1.4 cm behind the edge)
const FLW = [0, .088, 7.969];               // hero flower on its stalk (world)
const POD = [.012, -.05, 8.004];            // hero pod on the soil section
const PD = [1.9, 7.85];                     // dry plant on the hard crust
const CRUST = .01;                          // crust surface height

// ---------- the farmer ----------
const at = (F, y = 0) => [F[0], y, F[1]];
const Flean = [-.7, 7.3], Fpull = [P0[0], P0[1] - .40];
const tGrab = 20.9, tLift = 21.2, tUp = 21.95, tShake = 23.05;
const trk = [[0, ...at(Flean), 0, 'stakePushLo'], [19.55, ...at(Flean), 0, 'stakePushLo'], [19.8, ...at(Flean), 0, 'stand'],
  [20.45, ...at(Fpull), null, 'stand', 'walk'], [tGrab, ...at(Fpull, -.55), 0, 'squatReach'], [21.05, ...at(Fpull, -.6), 0, 'pullTug'], [tLift, ...at(Fpull, -.6), 0, 'pullTug'],
  [tUp, ...at(Fpull), 0, 'holdUp'], [tShake, ...at(Fpull), 0, 'holdUp'], [tShake + .15, ...at(Fpull), 0, 'holdShake'], [tShake + .65, ...at(Fpull), 0, 'holdShake'], [tShake + .85, ...at(Fpull), 0, 'holdUp'],
  [T.l7, ...at(Fpull), 0, 'holdUp'], [T.l7 + .6, ...at(Fpull), .35, 'holdUp'], [D + 1, ...at(Fpull), .35, 'holdUp']];
const HIDE = [[0, 1], [17.85, 1], [17.9, 0]];
const farmer = { id: 'farmer', type: 'rig_person', pos: [0, 0, 0], anim: 'none', params: { model: 'modular_men/Farmer', height: 1.75, link: 'farmer', seed: 4, track: trk, hideK: HIDE } };
const hoe = obj('hoe', 'peanut_hoe', [Flean[0], 0, Flean[1] + .48], { back: .14, len: 1.03, fall: 19.6, fallAz: 0, hideK: HIDE });

// ---------- plants ----------
const hero = obj('hero', 'peanut_plant', [P0[0], 0, P0[1]], { seed: 83, h: .35, clearFront: true, flowers: 3, pegs: 11, pods: true, roots: true, rootZ: .085, maxZ: .068, podZ: .086,
  clusterK: [[0, 0], [T.done5 + .2, 0], [T.then5, 1]], carry: { t0: tGrab, by: 'farmer', grip: [0, .13, 0], tilt: .3 }, crumbs: [tUp - .1, tShake + .2],
  hero: { a: [0, .045, .035], g: [0, .066], tip: [0, -.05, .084], bloomK: [[0, .55], [1.2, 1]], polK: [[T.pol2 - .1, 0], [T.pol2 + .2, 1], [T.pol2 + .7, 0]],
    witherK: [[T.stem2, 0], [T.stem2 + 1.1, 1]], bendK: [[T.stem2 + .1, 0], [T.l2 + .3, 1]], buryK: [[T.bury3, 0], [T.bury3 + 1.4, 1]], podK: [[T.grow3, 0], [T.grow3 + 1.3, 1]] } });
const dry = obj('dry', 'peanut_plant', [PD[0], 0, PD[1]], { seed: 29, h: .22, dry: true, soilY: CRUST, pegs: 0,
  hero: { a: [0, CRUST + .04, .03], g: [0, .062], podMax: .4, witherK: [[T.l6 + 1.3, 0], [T.l6 + 2.1, 1]], bendK: [[T.peg7 - .6, 0], [T.peg7 + .15, 1]],
    buckleK: [[T.peg7 + .15, 0], [T.peg7 + .95, 1]], podK: [[T.less7, 0], [T.less7 + .6, 1]] } });
const field = [];
const rowPts = [[.78, 7.9], [-2.3, 7.9], [-2.25, 7.4], [.85, 7.4]];
for (const z of [6.85, 6.3, 5.75]) for (let x = -2.4; x <= 2.65; x += .5) rowPts.push([x + (Math.sin(x * 7 + z) * .06), z + Math.cos(x * 5) * .04]);
rowPts.forEach(([x, z], i) => field.push(obj('pf' + i, 'peanut_plant', [x, 0, z], { seed: 100 + i * 7, h: .3 + (i % 4) * .025, flowers: 3, pegs: 4 }, i * 1.3)));
const bed = obj('bed', 'clover_bed', [.1, 0, 6.7], { w: 5.6, d: 2.6, ridges: 'lrb', tex: 'sand' });
const crust = obj('crust', 'cracked', [PD[0], -.035, 7.55], { w: 1.3, d: .9, seed: 41 });
const sun = obj('sun', 'sun_glow', [-.12, .27, 7.9], { size: .28, showK: [[0, 0], [T.sun4 - .3, 0], [T.sun4 + .1, 1], [T.l4 - .1, 1], [T.l4 + .3, 0]] });
const beetle = obj('beetle', 'tomato_bug', [0, 0, 0], { kind: 'beetle', path: [[T.bugs4 - .4, .17, .007, 7.975], [T.bugs4 + .5, .08, .007, 7.982], [T.safe4 + .4, .06, .007, 7.976], [T.l4, .1, .007, 7.955]], hideAt: T.l4 + 1 });

// ---------- farm world ----------
const world = [];
[[-8.0, -6.5, 8.5, 1], [-5.6, -7.4, 9.5, 2], [6.2, -7.2, 9, 3], [8.4, -6.0, 8, 1]].forEach(([x, z, h, k], i) =>
  world.push(glb('palm' + i, `nature_pack/PalmTree_${k}`, x, z, h, { rotY: i * 1.7, params: { sway: .008, ph: i } })));
[[-4.6, 6.4, .9, 'ph/shrub_02'], [4.2, 5.6, .8, 'ph/shrub_01'], [3.4, 3.2, .35, 'ph/rock_07'], [-3.6, 2.6, .5, 'ph/shrub_03']].forEach(([x, z, h, m], i) =>
  world.push(glb('bush' + i, m, x, z, h, { rotY: i * 1.3, params: { sway: .015, ph: i * 2 } })));

// sticker spots (world)
const CL = [0, .8, 7.86];                   // pod cluster on the held plant (palms (0, .98, 7.84), tilt .3)
const beats = [
  // 1 hook: the flower on its stalk opens above the soil; ring round it
  { t: 0, kind: 'info', add: [bed, farmer, hoe, hero, dry, ...field, sun, beetle, ...world, stk('ring1', 'circle_ring', FLW, .05, { delay: .2 })],
    camera: { target: [FLW[0], FLW[1] - .005, FLW[2] - .01], dist: .3, elev: .22, az: .45, zoom: 'in' } },
  // 2 the flower grows above the ground (arrow up) ...
  { t: T.l1, kind: 'info', remove: ['ring1'], add: [stk('up2', 'arrow_up', [FLW[0] + .055, FLW[1] + .03, FLW[2] + .01], .045, { delay: T.up2 - T.l1 })],
    camera: { target: [0, .11, 7.88], dist: .85, elev: .28, az: .55, zoom: 'out' } },
  //   ... it is pollinated (sparkles, it glows) ...
  { t: T.but2 - .1, kind: 'info', remove: ['up2'], add: [stk('spk2', 'sparkles', [FLW[0] + .012, FLW[1] + .018, FLW[2] + .005], .035, { delay: T.pol2 - T.but2 + .1 })],
    camera: { target: FLW, dist: .28, elev: .15, az: .9, zoom: 'in' } },
  //   ... then it withers and its stalk bends down to the soil (side view, arrow down)
  { t: T.stem2 - .05, kind: 'info', remove: ['spk2'], add: [stk('dn2', 'arrow_down', [0, .075, 8.03], .03, { delay: T.down2 - T.stem2 })],
    camera: { target: [0, .05, 7.97], dist: .36, elev: .08, az: 1.35, zoom: 'in' } },
  // 3 the peg touches the soil (ring round the peg) ...
  { t: T.l2, kind: 'info', remove: ['dn2'], add: [stk('ring3', 'circle_ring', [0, .03, 7.972], .05, { delay: T.name3 - T.l2 })],
    camera: { target: [0, .03, 7.97], dist: .32, elev: .18, az: .7, zoom: 'in' } },
  //   ... the camera drops to the soil section: it buries itself ...
  { t: T.bury3 - .1, kind: 'info', remove: ['ring3'],
    camera: { target: [0, -.025, 8.0], dist: .42, elev: .03, az: .2, zoom: 'in' } },
  //   ... and the pod grows at its tip underground (point-down on the pod)
  { t: T.grow3 - .1, kind: 'info', add: [stk('pt3', 'point_down', [POD[0] + .01, POD[1] + .03, POD[2] + .016], .028, { delay: .25 })],
    camera: { target: [POD[0], POD[1] + .005, 8.0], dist: .3, elev: .05, az: .1, zoom: 'in' } },
  // 4 safe from the sun and the insects above (sun rays, beetle, microbe above the soil; check on the pod)
  { t: T.l3, kind: 'info', remove: ['pt3'], add: [stk('mic4', 'microbe', [.1, .075, 7.975], .035, { delay: T.bugs4 - T.l3 + .1 }),
      stk('ok4', 'check', [POD[0] + .035, POD[1] + .005, 8.03], .035, { delay: T.safe4 - T.l3 })],
    camera: { target: [0, .05, 8.0], dist: .72, elev: .14, az: .25, zoom: 'out' } },
  // 5 the farmer leans on his hoe and waits (hourglass) ...
  { t: T.l4, kind: 'info', remove: ['mic4', 'ok4'], add: [stk('hg5', 'hourglass', [-.3, 1.95, 7.38], .16, { delay: T.wait5 - T.l4 })],
    camera: { target: [-.35, .75, 7.6], dist: 2.6, elev: .12, az: .35, zoom: 'out' } },
  //   ... while the pods fill out underground (soil section, hourglass) ...
  { t: T.done5 + .2, kind: 'info', remove: ['hg5'], add: [stk('hg5b', 'hourglass', [.1, .03, 8.04], .05, { delay: .1 })],
    camera: { target: [0, -.05, 8.0], dist: .55, elev: .06, az: -.15, zoom: 'in' } },
  //   ... then he lays the hoe down, squats and pulls the whole plant out with both hands
  { t: T.then5 - .05, kind: 'info', remove: ['hg5b'],
    camera: { target: [0, .45, 7.62], dist: 1.9, elev: .14, az: .4, zoom: 'out' } },
  // 6 he shakes the soil off: the pods hang on the roots ...
  { t: T.l5, kind: 'info',
    camera: { target: [CL[0], CL[1] + .03, CL[2] - .02], dist: .95, elev: .08, az: .35, zoom: 'in' } },
  //   ... like a bunch (ring round the cluster) ...
  { t: T.bunch6 - .1, kind: 'info', add: [stk('ring6', 'circle_ring', CL, .16, { delay: .1 })],
    camera: { target: [CL[0], CL[1] - .01, CL[2]], dist: .5, elev: .05, az: .2, zoom: 'in' } },
  //   ... under the ground (point-down at the hole they came from)
  { t: T.under6 - .1, kind: 'info', remove: ['ring6'], add: [stk('pt6', 'point_down', [P0[0], .11, P0[1]], .06, { delay: .1 })],
    camera: { target: [0, .38, 7.88], dist: 1.25, elev: .2, az: .3, zoom: 'out' } },
  // 7 the strangest thing: a plant on hard soil, the crust dries and cracks ...
  { t: T.l6, kind: 'info', remove: ['pt6'], add: [crust],
    camera: { target: [PD[0], .1, PD[1] - .05], dist: 1.0, elev: .3, az: .3, zoom: 'in' } },
  //   ... close on the cracks; its flower withers ...
  { t: T.hard7 - .1, kind: 'info',
    camera: { target: [PD[0], .06, PD[1] + .02], dist: .5, elev: .35, az: .5, zoom: 'in' } },
  //   ... its peg bends down, hits the crust and kinks (cross) ...
  { t: T.peg7 - .7, kind: 'info', add: [stk('x7', 'cross', [PD[0] + .03, .085, PD[1] + .08], .04, { delay: .7 + .55, pulse: true })],
    camera: { target: [PD[0], .06, PD[1] + .06], dist: .34, elev: .14, az: .6, zoom: 'in' } },
  //   ... and only a tiny pod forms (arrow down)
  { t: T.less7 - .1, kind: 'info', remove: ['x7'], add: [stk('dn7', 'arrow_down', [PD[0] + .045, .07, PD[1] + .08], .03, { delay: .2 })],
    camera: { target: [PD[0], .05, PD[1] + .06], dist: .42, elev: .2, az: .85, zoom: 'out' } },
  // 8 CTA: he turns to us holding the pulled plant; thumbs-up; slow pull-out arcing round
  { t: T.l7, kind: 'info', remove: ['dn7'], add: [stk('thumb8', 'thumbs_up', [Fpull[0] + .5, 1.85, Fpull[1] + .1], .26, { delay: T.like8 - T.l7 - .2 })],
    camera: { target: [Fpull[0] + .1, .95, Fpull[1] + .05], dist: 2.4, elev: .14, az: .35, spin: .45, zoom: 'out' } },
];

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ليه الفول السوداني بيكبر جوه التراب',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], fov: 40, near: .02,
  env: { island: { w: 22, d: 16, depth: 3.2 }, flatTop: true, soil: 'aerial_grass_rock', soilRepeat: 8, soilTint: [1.0, .97, .9], horizon: 'nile', cover: 'high',
    haze: .4, sunElev: 42, sunAz: 25, turbidity: 2.4, water: '#7f9a8f', waves: 0, foam: false, birds: 3, birdModel: 'Stork', motes: .4, clouds: 12,
    // sound library (this plan only, at or under the global bed .03 / calls .05)
    sfxBed: 'wind', sfxBeds: [{ cat: 'forest', idx: 5, gain: .02 }] },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 1 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => { delete b.t; b.text = S.flatMap(s => s.words).filter(x => x.start >= b.start - .01 && x.start < b.end - .01).map(x => x.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
