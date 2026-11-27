// UAL test (no story): the Farmer in a sunny yard playing Universal Animation Library clips retargeted by renderer/ual.js.
// Beat 1: he picks something up from a crate used as a table (PickUp_Table). Beat 2: he crouches and stays down (Crouch_Idle_Loop).
// node plans/ual_test.mjs transcript.json plan.json
import fs from 'fs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), D = tr.duration, H = .5; // PickUp_Table lasts .83 s: beat 1 is short so its preview frame shows the reach
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const farmer = glb('farmer', 'modular_men/Farmer', 0, 0, 1.75, { params: { ual: ['PickUp_Table', 'Crouch_Idle_Loop'] } });
const world = [farmer, glb('crate', 'medieval_village_pack/Crate', 0, .895, .76, { rotY: 0 }) /* clearance: front face 6 cm past his crouched toes, top at palm height */,
  glb('bush', 'ph/shrub_01', -2.2, -1.4, .9), glb('barrel', 'ph/Barrel_01', 1.6, -1, .9), glb('stump', 'ph/tree_stump_01', -1.4, 1.2, .4)];
const beats = [
  // reach (renderer/ual.js): the clip's own grab hangs the fingers down at the front edge, so the left hand is placed on the top, palm down:
  // knees bend 0.20 m (feet planted), slight lean, wrist 0.42 m in front of him at palm height; hover then press (slow-in), lift then release.
  // The wrist stays 6 cm short of the crate's front face (forearm and head must not enter its frame), so fingers and the front of the palm rest on the top.
  { t: 0, add: world, modes: { farmer: { ual: 'PickUp_Table', reach: { hand: 'L', at: [.08, .806, .42], t: [0, .16, .32, .46], lean: .12, drop: .2, lift: .08 } } }, camera: { target: [.08, .82, .55], dist: 2.5, elev: .38, az: 1.4, zoom: 'in' } }, // side view from his left, a little above: crate top + left palm in frame
  { t: H, modes: { farmer: { ual: 'Crouch_Idle_Loop' } }, camera: { target: [0, .6, .1], dist: 3.2, elev: .15, az: -.8, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ual test', captions: [], fades: [], fov: 40,
  env: { island: { w: 14, d: 12, depth: 2.6 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, horizon: 'nile', cover: 'low',
    haze: .3, sunElev: 50, sunAz: 25, turbidity: 2.2, waves: 0, foam: false, birds: 0, motes: 0, clouds: 8 },
  // private frames (renderer/clearance.js): only the farmer's hand may touch the crate top, in beat 1 (the palm contact)
  checks: { clearance: { margin: .03, samples: 15, allow: [{ a: 'farmer', part: 'hand', b: 'crate', beats: [0], face: 'top' }] } },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 0 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', kind: 'info', remove: [], effects: [], add: [], modes: {}, ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => delete b.t);
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
