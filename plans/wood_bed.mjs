// "إزاي تعمل سرير خشب من غير مسامير ولا غرا؟" - a carpenter's yard: nail split, sectioned mortise and tenon, bar clamp, wet swelling,
// a finished bed that does not wobble, a sewn Khufu-style hull. Locked look: 3D sky, real soil, flat yard (flatTop), real sizes in metres.
// 1x improvement over the last video (charcoal):
//  - Motion: a bone-driven carpenter (rig poses + walk/shuffle gaits whose steps follow the distance, so no sliding feet) with a hammer
//    that rides his palm, wind-up, an accelerating blow ('in' ease) and a wrist snap; a split that runs along the grain after the last blow,
//    splinters on a ballistic arc; an eased tenon slide with a seating jolt; a clamp screw that turns 3 times; a staggered bed assembly
//    (the floor rail swings up into its mortises); a damped push test.
//  - Graphics: planed timber with metre-scaled grain on every face and growth-ring end grain on every cut end (renderer woodBox),
//    plank floor with sawdust and shavings, cast-iron clamp, pale limestone plinth and ashlar wall for the boat.
//  - Realism: real joinery sizes (bed 1.9 x 0.95 m, legs 8 cm, rails 12 x 4.5 cm, tenon 9 x 2 x 6 cm, nail 65 mm, hammer 33 cm),
//    oak pegs instead of nails, a sewn-plank hull with papyrus-flower posts like the Giza boat.
// Contact: palms checked against plank, board, rail, clamp handle and headboard (tools/probe in the scratchpad, max 0.12 m); feet on the floor.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = tr.duration;
const strip = w => w.replace(/[ً-ْـ.,،؛:!?؟"«»…]/g, '');
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[Math.min(i, S.length - 1)].words[k].start);
const word = (i, re, fb = .5) => { const ws = S[i].words, k = ws.findIndex(w => re.test(strip(w.w))); return k >= 0 ? ws[k].start : S[i].start + (S[i].end - S[i].start) * fb; };
const glb = (id, model, pos, height, extra = {}, more = {}) => ({ id, type: 'glb', pos, params: { model, height, ...extra }, anim: 'grow', ...more });
const stk = (id, name, pos, size, o = {}) => ({ id, type: 'sticker', pos, params: { name, size, ...o }, anim: 'none', delay: o.delay || 0, dust: false });
const r3 = v => Math.round(v * 1000) / 1000;

// ---- layout (metres). Yard floor top at FY; bench top at BH; carpenter faces +z from behind the bench.
const FY = .015, BH = .86, J = [.35, BH, 0];                       // J: mortise-and-tenon demo origin (rotY -90: rail runs toward -x)
const BED = [-.1, 0, -2.2], HULL = [0, 0, 3.6];
const HOME = [-.1, FY, -.45];
// palm offsets for the poses (measured with the probe, relative to the carpenter position, facing +z)
const PALM = { holdPlank: { R: [-.198, .918, .375], L: [.198, .918, .375] } };

// ---- times from the voice
const T1 = at(1), Tcrack = word(1, /والخشب/, .5), T2 = at(2), Tsen = word(2, /^سن/, .3), T3 = at(3), Tseat = word(3, /بالظبط/, .5);
const T4 = at(4), Tpull = word(4, /بيشد/, .2), T5 = at(5), Twet = word(5, /الرطب/, .55), Tfakk = word(5, /وبيفك/, .8);
const T6 = at(6), Tsrir = word(6, /السرير/, .4), Tstill = word(6, /يتهز/, .9), T7 = at(7), T8 = at(8);

// ---- carpenter track: [t, x, y, z, yaw, pose, gait, ease]. A key's pose is reached min(.45, .6 * gap) after the PREVIOUS key.
const TK = []; let cur = { p: HOME.slice(), yaw: 0, pose: 'holdPlank' };
const key = (t, o = {}) => { const yaw = 'yaw' in o ? o.yaw : cur.yaw, p0 = cur.p, p = o.p || cur.p; cur = { ...cur, p, yaw: yaw ?? Math.atan2(p[0] - p0[0], p[2] - p0[2]), pose: o.pose || cur.pose }; TK.push([r3(t), ...cur.p.map(r3), yaw, cur.pose, o.gait || null, o.ease || null]); };
const move = (start, dur, pose, o = {}) => { if (!TK.length || TK[TK.length - 1][0] < start - 1e-3) key(start); key(start + dur / .6, { pose, ...o }); }; // pose reached at start + dur
key(0);
// line 1: hammer three blows; hits at h, wind-up .3 s, blow .2 s (accelerating), short hold on the nail head
const HITS = [0, 1, 2].map(k => T1 + .7 + k * .83);
HITS.forEach(h => { move(h - .7, .3, 'hamUp'); move(h - .2, .2, 'hamHit', { ease: 'in' }); });
move(HITS[2] + .2, .4, 'holdBoard');
const WRIST = HITS.flatMap(h => [[h - .7, 1.25], [h - .4, 1.6], [h - .2, 1.6], [h, .72], [h + .13, .72], [h + .4, 1.2]]);
// line 2: hold the rail (palms on it), line 3: shuffle with the rail as it slides in, line 4: right hand to the clamp handle
move(T2 + .2, .45, 'holdPlank');
key(T3 + .4); key(Tseat, { p: [HOME[0] + .14, FY, HOME[2]], pose: 'pushRail', gait: 'shuffle' });
key(T4 + .1, { pose: 'holdPlank' }); key(T4 + .9, { p: [-.21, FY, HOME[2]], gait: 'shuffle' }); move(T4 + .95, .45, 'clampTurn');
// line 5: step back and watch; then walk round the head of the bed and push the headboard
move(T5 + .3, .45, 'stand', { p: [-.21, FY, -.6], gait: 'walk' });
const W0 = Tfakk + .3; key(W0); key(W0 + 1.35, { p: [-1.75, FY, -1.35], yaw: null, pose: 'walk', gait: 'walk' });
key(W0 + 2.15, { p: [-1.45, FY, -2.2], yaw: null, gait: 'walk' }); move(W0 + 2.2, .4, 'stand', { yaw: Math.PI / 2 });
move(Tsrir + .25, .4, 'pushPost'); move(Tstill + .6, .45, 'stand');

// ---- scenery around the yard (real models first)
const scenery = [
  { id: 'floor', type: 'shop_floor', pos: [0, 0, -1.1], params: { w: 5.2, d: 4.4, top: FY, clear: [[-1.1, 1.1, .7, 1.6], [-1.3, 1.1, -3.2, -1.3], [-2.2, 1.2, -.9, .2]] }, anim: 'none' },
  { id: 'lumber', type: 'custom', pos: [1.75, FY, -2.3], params: { parts: [0, 1, 2, 3, 4, 5, 6].map(k => ({ shape: 'box', size: [1.6 - (k % 2) * .1, .045, .12], pos: [0, .0225 + Math.floor(k / 3) * .05, -.15 + (k % 3) * .14], color: ['#c29466', '#b98a58', '#caa070'][k % 3], tex: 'wood', rough: .85 })) }, anim: 'grow', delay: .2 },
  glb('stump', 'ph/tree_stump_01', [2.0, 0, .5], .55), glb('axe', 'ph/hatchet', [2.05, .5, .45], .4),
  glb('log1', 'nature_pack/WoodLog', [-2.3, 0, .9], .4), glb('board', 'ph/wooden_cutting_board', [1.3, BH, -.18], .03),
  glb('tree', 'ph/island_tree_01', [-4.4, 0, -4.2], 5.2), glb('sh1', 'ph/shrub_02', [4.3, 0, -3.4], .9), glb('sh2', 'ph/shrub_01', [-4.6, 0, -.6], .8),
  ...[[-4.5, 2.4], [4.6, 1.8], [4.2, -.4], [-3.4, -4.6], [2.6, -4.7]].map(([x, z], i) => glb('gr' + i, 'nature_pack/' + ['Grass', 'Grass_2', 'Grass_Short'][i % 3], [x, 0, z], .35)),
  ...[[3.4, -4.4], [-4.9, 1.0]].map(([x, z], i) => glb('st' + i, 'ph/rock_07', [x, 0, z], .3))];

const carp = { id: 'carp', type: 'carpenter', pos: [0, 0, 0], params: { height: 1.75, track: TK, hammer: [T1 + .02, T2 - .05], wrist: WRIST }, anim: 'none' };
const bench = { id: 'bench', type: 'workbench', pos: [0, 0, 0], params: { h: BH, clear: [[-.95, .95, -.2, .2]] }, anim: 'none' };
const bedHalf = { id: 'bed', type: 'bed_frame', pos: BED, params: { stage: 'half', buildK: [[T6 - .3, 0], [T6 + 1.6, 1]], pushK: [[Tsrir + .3, 0], [Tsrir + .55, 1], [Tstill + .6, 1], [Tstill + .9, 0]] }, anim: 'none' };
const plankH = { id: 'plank', type: 'plank', pos: [HOME[0] + PALM.holdPlank.R[0] - .02, BH, HOME[2] + PALM.holdPlank.R[2]], params: { l: 1.3 }, anim: 'none' };
const NAIL0 = [-.33, .22], LP = [.09, -.09];                          // hammer face at the blow and the left palm (probe); the board runs diagonally between them
const NROT = Math.atan2(-(LP[1] - NAIL0[1]), -(LP[0] - NAIL0[0])) * -1;
const NB = [NAIL0[0] - (.2 * Math.cos(NROT) + .004 * Math.sin(NROT)), BH, NAIL0[1] - (-.2 * Math.sin(NROT) + .004 * Math.cos(NROT))];
const nailB = { id: 'nail', type: 'nail_split', pos: NB, rotY: NROT, params: { strikes: HITS, splitK: [[HITS[2] + .03, 0], [HITS[2] + 1.3, 1]] }, anim: 'grow' };
const NAIL = [NAIL0[0], BH + .03, NAIL0[1]];
const joint = { id: 'joint', type: 'mt_joint', pos: J, rotY: -Math.PI / 2, anim: 'grow',
  params: { slideK: [[T3 + .45, 0], [Tseat, 1]], cutK: [[Tsen - .3, 0], [Tsen + .5, 1], [T4 - .2, 1], [T4 + .4, 0], [T5 + .1, 0], [T5 + .8, 1]],
    clampK: [[T4 + .4, 0], [T4 + .95, 1], [T5 - .4, 1], [T5 + .1, 0]], turnK: [[T4 + 1.4, 0], [T4 + 3.9, 1]],
    wetK: [[Twet - .2, 0], [Twet + .8, 1]], swellK: [[Twet + .1, 0], [Twet + 1.3, 1]], looseK: [[Tfakk, 0], [Tfakk + .9, 1]] } };
const swellArrow = { id: 'swell', type: 'arrow', pos: [0, 0, 0], params: { from: [J[0] + .03, BH + .022, .012], to: [J[0] + .03, BH + .068, .012], head: .014, double: true, color: '#ffd23f' }, anim: 'grow', dust: false, delay: .5 };
const hull = [{ id: 'wall', type: 'stone_wall', pos: [0, 0, 1.75], params: { w: 9, h: 2.6 }, anim: 'grow' },
  { id: 'hull', type: 'lashed_hull', pos: HULL, params: { l: 6.4, b: 1.25, d: .7 }, anim: 'grow', delay: .15 }];

const b = [];
// 0 hook: palms on the plank end, the half-built bed behind the carpenter
b.push({ t: 0, kind: 'intro', add: [...scenery, bench, carp, bedHalf, plankH], camera: { preset: 'close', target: [-.12, 1.0, -.2], dist: 1.55, elev: .28, az: .35, push: .1 } });
// 1 a nail driven near the end: three blows (3/4 view from the hammer side)
b.push({ t: T1, kind: 'problem', remove: ['plank'], add: [nailB], camera: { preset: 'close', target: [-.14, 1.2, -.15], dist: 2.15, elev: .12, az: -.38, push: .08 } });
// 1b the split runs along the grain from the nail to the end (looking down on the board)
b.push({ t: Tcrack, kind: 'problem', add: [],
  camera: { preset: 'close', target: [NAIL[0] + .07, BH + .02, NAIL[2] - .05], dist: .62, elev: .78, az: -.25, push: .08 } });
// 2 the joint: tenon on the rail end, mortise in the post; the near half lifts away (section)
b.push({ t: T2, kind: 'solution', remove: ['nail', 'x1'], add: [joint], camera: { preset: 'close', target: [J[0] - .03, BH + .05, 0], dist: .8, elev: .3, az: .25, push: .1 } });
// 3 the tenon slides into the mortise, low and close, eased stop
b.push({ t: T3, kind: 'info', camera: { preset: 'low', target: [J[0] - .04, BH + .045, 0], dist: .62, elev: .06, az: -.22, push: .06 } });
// 4 the bar clamp goes on and the screw pulls the shoulder tight (carpenter's hands on the handle and the rail)
b.push({ t: T4, kind: 'solution', camera: { preset: 'close', target: [-.24, 1.05, -.15], dist: 2.25, elev: .2, az: .3, push: .08 } });
// 5 dry vs wet: section again, the wet tenon darkens and swells (double arrow), then pushes the joint open
b.push({ t: T5, kind: 'problem', add: [{ ...swellArrow, delay: Twet - T5 + .3 }], camera: { preset: 'close', target: [J[0] + .01, BH + .05, 0], dist: .55, elev: .2, az: .1, push: .1 } });
// 6 the finished bed (the missing parts settle in), the push test: it does not move
b.push({ t: T6, kind: 'solution', remove: ['swell'], add: [],
  camera: { preset: 'hero', target: [BED[0] - .35, .62, BED[2]], dist: 4.3, elev: .2, az: 1.45, push: .08 } });
// 7 a pharaonic hull sewn plank to plank, no nails, in a stone hall
b.push({ t: T7, kind: 'info', remove: ['ok'], add: hull, camera: { preset: 'hero', target: [HULL[0] + .5, .95, HULL[2]], dist: 12.5, elev: .22, az: 1.05, push: .06 } });
// 8 CTA: slow orbit around the finished bed
b.push({ t: T8, kind: 'info', remove: ['wall', 'hull'], camera: { preset: 'orbit', target: [BED[0], .55, BED[2]], dist: 5.6, elev: .36, az: .6 } });

const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'سرير خشب من غير مسامير ولا غرا',
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  fades: [], env: { soil: 'brown_mud_leaves_01', soilRepeat: 2, flatTop: true, horizon: 'nile' }, style: { camEase: .6, captionY: .78, exposure: 1.1 },
  beats: b.sort((x, y) => x.t - y.t).map((x, i, a) => ({ start: x.t, end: i + 1 < a.length ? a[i + 1].t : D, text: '', remove: [], modes: {}, effects: [], add: [], ...x, camera: { punch: false, ...x.camera } })),
};
plan.beats.forEach(x => { delete x.t; x.text = S.flatMap(s => s.words).filter(w => w.start >= x.start - .01 && w.start < x.end - .01).map(w => w.w).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats');
