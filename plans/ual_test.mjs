// UAL test (no story): the Farmer in a sunny yard playing Universal Animation Library clips retargeted by renderer/ual.js.
// Beat 1: he picks something up from a crate used as a table (PickUp_Table). Beat 2: he crouches and stays down (Crouch_Idle_Loop).
// node plans/ual_test.mjs transcript.json plan.json
import fs from 'fs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), D = tr.duration, H = .5; // PickUp_Table lasts .83 s: beat 1 is short so its preview frame shows the reach
const glb = (id, model, x, z, h, o = {}) => ({ id, type: 'glb', pos: [x, 0, z], rotY: o.rotY ?? 0, params: { model, height: h, ...o.params }, anim: 'none' });
const farmer = glb('farmer', 'modular_men/Farmer', 0, 0, 1.75, { params: { ual: ['PickUp_Table', 'Crouch_Idle_Loop'] } });
const world = [farmer, glb('crate', 'medieval_village_pack/Crate', 0, .62, .8, { rotY: .1 }),
  glb('bush', 'ph/shrub_01', -2.2, -1.4, .9), glb('barrel', 'ph/Barrel_01', 1.6, -1, .9), glb('stump', 'ph/tree_stump_01', -1.4, 1.2, .4)];
const beats = [
  { t: 0, add: world, modes: { farmer: { ual: 'PickUp_Table' } }, camera: { target: [0, .95, .2], dist: 3.6, elev: .12, az: .7, zoom: 'in' } },
  { t: H, modes: { farmer: { ual: 'Crouch_Idle_Loop' } }, camera: { target: [0, .6, .1], dist: 3.2, elev: .15, az: 1.1, zoom: 'out' } },
];
const plan = {
  version: 2, planner: 'directed', duration: D, language: 'ar', prompt: 'ual test', captions: [], fades: [], fov: 40,
  env: { island: { w: 14, d: 12, depth: 2.6 }, flatTop: true, soil: 'brown_mud_leaves_01', soilRepeat: 6, horizon: 'nile', cover: 'low',
    haze: .3, sunElev: 50, sunAz: 25, turbidity: 2.2, waves: 0, foam: false, birds: 0, motes: 0, clouds: 8 },
  style: { camEase: .6, captionY: .78, exposure: 1.0, foreground: false, handheld: 0 },
  beats: beats.map((b, i) => ({ start: b.t, end: i + 1 < beats.length ? beats[i + 1].t : D, text: '', kind: 'info', remove: [], effects: [], add: [], modes: {}, ...b, camera: { punch: false, ...b.camera } })),
};
plan.beats.forEach(b => delete b.t);
fs.writeFileSync(out, JSON.stringify(plan, null, 1)); console.log(plan.beats.length + ' beats');
