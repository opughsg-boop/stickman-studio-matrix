import * as THREE from './lib/three.module.js';
import * as T from './toon.js';
import * as P from './paint.js';
import { SHOTS, TOTAL, shotAt, camAt, dofAt, LIGHTS, lightFor, actorsAt, worldAt, fxAt } from './story.js';

const W = 1080, H = 1920;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.08, 1500);
const rx = (a) => a * Math.PI / 180;

// ---------- materials ----------
const grad = (() => { const d = new Uint8Array([90, 90, 90, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 2, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });
const texM = (c, rx_ = 1, ry_ = 1, color = '#ffffff') => toon({ map: P.tex(c, rx_, ry_), color });
const M = {
  plank: texM(P.planks(1), 1, 6), beam: texM(P.beam(2), 1, 2), beamDark: texM(P.beam(3, [28, 36, 30]), 1, 2),
  rot: texM(P.rotten(4), 1, 1), rotB: texM(P.rotten(14), 1, 1),
  stone: texM(P.stone(4), 1, 1), stoneMoss: texM(P.mossy(P.stone(4), 5, 1.2), 1, 1),
  grass: texM(P.grass(6), 40, 40), dirt: texM(P.dirt(7), 6, 30), plaster: texM(P.plaster(8), 1, 1), plaster2: texM(P.plaster(18, 28), 1, 1),
  roof: texM(P.roof(9), 2, 2), marble: texM(P.marble(10), 1, 1), marbleTop: toon({ color: '#ece2cf' }),
  trunk: toon({ color: '#6a4a32' }), cypress: toon({ color: '#3f6b36' }), pine: toon({ color: '#5c8a3c' }), bush: toon({ color: '#6c9a42' }),
  hill: toon({ color: '#7aa64c' }), hillFar: toon({ color: '#86ad60' }), mount: toon({ color: '#8fa7b8' }), snow: toon({ color: '#f4f6fa' }),
  iron: toon({ color: '#5c5a57' }), bronze: toon({ color: '#b08a4a' }), wood: toon({ color: '#7a5434' }), door: toon({ color: '#5a3a24' }),
  window: toon({ color: '#2b2430' }), red: toon({ color: '#b8282b' }),
};
M.banner = new THREE.MeshToonMaterial({ gradientMap: grad, map: P.tex(P.banner()), alphaTest: 0.5, side: THREE.DoubleSide });
// helmet
const helmetIn = P.tex(P.helmetInside()); helmetIn.wrapS = helmetIn.wrapT = THREE.ClampToEdgeWrapping;
M.helmIn = new THREE.MeshToonMaterial({ gradientMap: grad, map: helmetIn, side: THREE.BackSide });
M.helmOut = toon({ color: '#8f8a7e' });

// ---------- ink / normal-depth contract ----------
const NOINK = 'noink'; // userData flag: never outlined (cards, fx, water handled specially)
const ndMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec3 vN; varying float vD; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*.5+.5, vD); }`,
  side: THREE.DoubleSide,
});
const cardNd = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map } },
  vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv=uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vD; void main(){ if(texture2D(map,vUv).a<.5) discard; gl_FragColor=vec4(0.,0.,0.,vD); }`,
  side: THREE.DoubleSide,
});
const waterNd = new THREE.ShaderMaterial({
  vertexShader: `varying float vD; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying float vD; void main(){ gl_FragColor=vec4(.5,1.,.5,vD); }`,
});

// ---------- helpers ----------
const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene, opts = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = opts.cast ?? true; m.receiveShadow = true; parent.add(m); return m;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const uvScale = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
/** box with world-scaled UVs per face (texel density 1 tile per `t` metres) */
const tbox = (w, h, d, t = 2) => {
  const g = box(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / t, uv.getY(i) * dims[f][1] / t); }
  return g;
};

// ---------- sky ----------
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float sunSize; varying vec3 vP;
    void main(){ float h = clamp(vP.y,0.,1.); vec3 c = mix(hor, top, pow(h, .55)); if(vP.y<0.) c = hor;
      float s = dot(normalize(vP), normalize(sunDir)); c += sunCol * (smoothstep(1.-sunSize, 1.-sunSize*.6, s) + .35*pow(max(s,0.), 24.)*step(.001,sunSize));
      gl_FragColor = vec4(c,1.); }`,
}));
sky.userData.sky = true; scene.add(sky);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 2); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2;
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog('#ffffff', 40, 600);

// ---------- world: an open-plan office corner (floor y = 0, characters stand behind desks at z = -0.45) ----------
const DECK = 0;
const world = new THREE.Group(); scene.add(world);
const waterU = { t: { value: 0 }, deep: { value: new THREE.Color() }, shal: { value: new THREE.Color() }, glint: { value: new THREE.Color() } };
const clouds = [];
const OM = {
  floor: texM(P.planks(21), 6, 6, '#e9d2b0'),
  wall: texM(P.plaster(22, 190), 3, 2, '#dfeef0'),
  wall2: texM(P.plaster(23, 30), 3, 2, '#f3e6cf'),
  base: toon({ color: '#6f8c95' }),
  deskTop: texM(P.planks(24), 1, 2, '#d9b48a'), deskLeg: toon({ color: '#4b4f57' }),
  black: toon({ color: '#2a2d33' }), screenA: toon({ color: '#bfe3ff', emissive: '#4a8fc8', emissiveIntensity: 0.35 }),
  keys: toon({ color: '#d8dbe0' }), mug: toon({ color: '#f4f1ea' }), coffee: toon({ color: '#5b3518' }), mugRed: toon({ color: '#d94b3b' }),
  pot: toon({ color: '#c46a3a' }), leaf: toon({ color: '#4f9a45' }), leaf2: toon({ color: '#3d7f39' }),
  frame: toon({ color: '#f7f7f2' }), glass: toon({ color: '#9fd3f2', emissive: '#bfe8ff', emissiveIntensity: 0.55 }),
  blind: toon({ color: '#f2efe6' }), clockFace: toon({ color: '#fffdf6' }), clockRim: toon({ color: '#2f3640' }), hand: toon({ color: '#1d2129' }),
  paper: toon({ color: '#fafafa' }), board: toon({ color: '#f9fafb' }), cork: toon({ color: '#c8995e' }), note1: toon({ color: '#ffe066' }), note2: toon({ color: '#ff9fb2' }), note3: toon({ color: '#8fd3ff' }),
  chair: toon({ color: '#33415c' }),
};
// floor and walls
const floor = add(tbox(14, 0.1, 10, 1.6), OM.floor, 0, -0.05, -1, world);
add(tbox(14, 4, 0.2, 2), OM.wall, 0, 2, -2.3, world);                 // back wall
add(box(14, 0.14, 0.24), OM.base, 0, 0.07, -2.18, world);              // skirting
add(tbox(0.2, 4, 10, 2), OM.wall2, -4.2, 2, 2.4, world);              // left wall
// window on the back wall (right side) with blinds
const win = new THREE.Group(); win.position.set(2.5, 2.05, -2.18); world.add(win);
add(box(2.2, 1.7, 0.06), OM.glass, 0, 0, 0, win, { cast: false });
for (const [x, y, w, h] of [[0, 0.88, 2.36, 0.1], [0, -0.88, 2.36, 0.12], [-1.13, 0, 0.1, 1.86], [1.13, 0, 0.1, 1.86], [0, 0, 0.06, 1.7]]) add(box(w, h, 0.12), OM.frame, x, y, 0.04, win);
for (let i = 0; i < 6; i++) add(box(2.2, 0.05, 0.03), OM.blind, 0, 0.78 - i * 0.07, 0.08, win);
// wall clock (hands move)
const clock = new THREE.Group(); clock.position.set(-0.6, 2.75, -2.18); world.add(clock);
{ const rim = add(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40), OM.clockRim, 0, 0, 0.03, clock); rim.rotation.x = Math.PI / 2;
  const face = add(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 40), OM.clockFace, 0, 0, 0.04, clock); face.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(box(0.02, i % 3 ? 0.03 : 0.06, 0.01), OM.hand, Math.sin(a) * 0.21, Math.cos(a) * 0.21, 0.085, clock, { cast: false }).rotation.z = -a; } }
const hHour = new THREE.Group(), hMin = new THREE.Group(); hHour.position.z = hMin.position.z = 0.09; clock.add(hHour); clock.add(hMin);
add(box(0.025, 0.13, 0.01), OM.hand, 0, 0.06, 0, hHour, { cast: false }); add(box(0.018, 0.19, 0.01), OM.hand, 0, 0.09, 0, hMin, { cast: false });
// cork board with sticky notes (no words)
add(box(1.3, 0.85, 0.04), OM.cork, -2.6, 1.95, -2.18, world);
[[-2.95, 2.1, OM.note1], [-2.6, 2.15, OM.note3], [-2.25, 2.05, OM.note2], [-2.85, 1.75, OM.note2], [-2.45, 1.78, OM.note1], [-2.1, 1.7, OM.paper]].forEach(([x, y, m], i) => {
  add(box(0.22, 0.22, 0.01), m, x, y, -2.15, world, { cast: false }).rotation.z = (i % 2 ? 1 : -1) * 0.06; });
// potted plant (sways)
const plant = new THREE.Group(); plant.position.set(-3.4, 0, -1.4); world.add(plant);
add(new THREE.CylinderGeometry(0.3, 0.22, 0.55, 20), OM.pot, 0, 0.275, 0, plant);
const leaves = new THREE.Group(); leaves.position.y = 0.55; plant.add(leaves);
for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, l = add(new THREE.SphereGeometry(0.28, 12, 8), i % 2 ? OM.leaf : OM.leaf2, Math.cos(a) * 0.22, 0.35 + (i % 3) * 0.22, Math.sin(a) * 0.22, leaves); l.scale.set(0.7, 1.4, 0.7); }
// desks: A (hero, left) and B (coworker, right)
const desk = (x, z) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
  add(tbox(1.7, 0.06, 0.8, 1), OM.deskTop, 0, 0.76, 0, g);
  for (const [dx, dz] of [[-0.78, -0.34], [0.78, -0.34], [-0.78, 0.34], [0.78, 0.34]]) add(box(0.05, 0.73, 0.05), OM.deskLeg, dx, 0.365, dz, g);
  add(box(1.6, 0.42, 0.03), OM.deskLeg, 0, 0.5, -0.36, g);               // modesty panel
  return g;
};
const deskA = desk(-0.95, 0.1), deskB = desk(0.95, 0.1);
const monitor = (g, x, ry) => {
  const m = new THREE.Group(); m.position.set(x, 0.79, -0.15); m.rotation.y = ry; g.add(m);
  add(box(0.62, 0.4, 0.035), OM.black, 0, 0.36, 0, m); add(box(0.56, 0.34, 0.01), OM.screenA, 0, 0.36, 0.02, m, { cast: false });
  add(box(0.05, 0.16, 0.05), OM.black, 0, 0.08, -0.02, m); add(box(0.22, 0.02, 0.16), OM.black, 0, 0.01, -0.02, m);
  return m;
};
monitor(deskA, 0.52, Math.PI - 0.55); monitor(deskB, -0.52, Math.PI + 0.55);
const kbA = add(box(0.46, 0.025, 0.15), OM.keys, 0.05, 0.8, 0.2, deskA);
add(box(0.46, 0.025, 0.15), OM.keys, -0.2, 0.8, 0.2, deskB);
// paper stack and pen cup on A's desk
for (let i = 0; i < 4; i++) add(box(0.3, 0.012, 0.22), OM.paper, -0.55, 0.795 + i * 0.013, 0.05, deskA).rotation.y = i * 0.05;
add(new THREE.CylinderGeometry(0.05, 0.045, 0.12, 14), OM.mugRed, 0.6, 0.85, -0.05, deskA);
// B's coffee mug at the desk's front-right edge (knocked off later)
const mug = new THREE.Group(); world.add(mug);
add(new THREE.CylinderGeometry(0.06, 0.055, 0.13, 18), OM.mug, 0, 0.065, 0, mug);
add(new THREE.CylinderGeometry(0.052, 0.052, 0.012, 18), OM.coffee, 0, 0.125, 0, mug, { cast: false });
{ const hdl = add(new THREE.TorusGeometry(0.035, 0.012, 8, 16), OM.mug, 0.07, 0.07, 0, mug); }
const MUG0 = new THREE.Vector3(1.5, 0.79, 0.38);
// coffee puddle on the floor
const puddle = add(new THREE.CylinderGeometry(1, 1, 0.006, 32), OM.coffee, MUG0.x + 0.1, 0.004, MUG0.z + 0.35, world, { cast: false });
puddle.visible = false;
// chairs behind the desks (backs only visible)
// standing desks: no chairs (characters stand behind the desks)

const helmet = new THREE.Group(); scene.add(helmet); helmet.visible = false;

function worldState(S, f) {
  // clock hands creep, plant sways
  hMin.rotation.z = -f * 0.02; hHour.rotation.z = -1.2 - f * 0.0017;
  leaves.rotation.z = Math.sin(f * 0.07) * 0.04; leaves.rotation.x = Math.sin(f * 0.05 + 1) * 0.03;
  // mug: rests, then tips over the edge and falls (S.mug = seconds since the knock, or -1)
  const t = S.mug;
  mug.position.copy(MUG0); mug.rotation.set(0, 0.6, 0);
  if (S.hop > 0) { mug.position.y += S.hop * 0.05; mug.rotation.z = S.hop * 0.15; }
  if (t >= 0) {
    const tip = Math.min(1, t / 0.18);
    mug.position.x += tip * 0.08; mug.rotation.z = -tip * 0.9;
    if (t > 0.18) { const u = t - 0.18; const y = MUG0.y - 0.5 * 9.8 * u * u; mug.position.y = Math.max(0.06, y); mug.position.z += u * 0.9; mug.position.x += u * 0.3;
      mug.rotation.z = -0.9 - u * 9; if (y <= 0.06) { mug.rotation.set(Math.PI / 2, 0.4, 0); mug.position.y = 0.06; } }
  }
  const sp = S.puddle; puddle.visible = sp > 0; puddle.scale.set(0.05 + sp * 0.38, 1, 0.04 + sp * 0.22);
}

// ---------- cards ----------
const CW = 1200, CH = 2000, CM = 2.25; // canvas px, card height in metres (design 600x1000 -> 2.25 m)
const cardGeo = new THREE.PlaneGeometry(CM * 0.6, CM); cardGeo.translate(0, CM / 2 - CM * 0.025, 0);
const blobTex = P.tex(P.radial('20,14,30', 0.6));
class Card {
  constructor(scale = 1) {
    [this.c, this.g] = (() => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return [c, c.getContext('2d')]; })();
    this.t = new THREE.CanvasTexture(this.c); this.t.colorSpace = THREE.SRGBColorSpace; this.t.anisotropy = 4;
    this.mat = new THREE.MeshBasicMaterial({ map: this.t, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, fog: true });
    this.mesh = new THREE.Mesh(cardGeo, this.mat); this.mesh.userData.nd = cardNd(this.t); this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.t, alphaTest: 0.5 });
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: true }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.userData.ndSkip = true; this.blob.renderOrder = 1;
    scene.add(this.mesh); scene.add(this.blob); this.key = ''; this.mesh.visible = this.blob.visible = false;
  }
  draw(key, fn) {
    if (key === this.key) return; this.key = key;
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, CW, CH); g.setTransform(CW / 600, 0, 0, CH / 1000, 0, 0);
    const p = new T.Pen(g); fn(p); this.t.needsUpdate = true;
  }
}
const cards = []; const getCard = (i) => cards[i] || (cards[i] = new Card());

// ---------- render targets & post ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const rtNd = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtInk = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsGeo = new THREE.PlaneGeometry(2, 2);
const fs = (mat) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(fsGeo, mat)); return s; };
const inkU = { col: { value: rtColor.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, px: { value: 1.6 }, fogCol: { value: new THREE.Color() },
  sat: { value: 1.08 }, lift: { value: new THREE.Color(0, 0, 0) }, gain: { value: new THREE.Color(1, 1, 1) }, vig: { value: 0.22 }, flash: { value: 0 } };
const inkScene = fs(new THREE.ShaderMaterial({ uniforms: inkU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D col, nd; uniform vec2 res; uniform float px, sat, vig, flash; uniform vec3 fogCol, lift, gain; varying vec2 vUv;
  float edgeAt(vec2 uv, float r){
    vec4 c = texture2D(nd, uv); if (dot(c.rgb,c.rgb) < .01) return 0.; float d = c.a; vec3 n = c.rgb*2.-1.;
    float e = 0.; float rr = r * clamp(7./d, .62, 1.25);
    for (int i=0;i<16;i++){ float a = float(i)*.785398 + (i>7 ? .39 : 0.); float k = i>7 ? .5 : 1.;
      vec2 o = vec2(cos(a), sin(a))*rr*k/res; vec4 s = texture2D(nd, uv+o);
      float ds = s.a; bool card = dot(s.rgb,s.rgb) < .01;
      if (card && ds > 0.) continue;            // character cards: never outlined by the world ink
      if (card) ds = 1e4;                        // sky
      vec3 ns = s.rgb*2.-1.;
      e = max(e, smoothstep(.006, .02, (ds - d)/d));                           // depth jump, near side only
      if (!card && abs(ds-d)/d < .06) e = max(e, smoothstep(.88, .72, dot(n, ns)) * .9); // crease
    }
    return e * (1. - smoothstep(140., 520., d)*.8);
  }
  void main(){
    vec3 c = texture2D(col, vUv).rgb;
    float e = edgeAt(vUv, px);
    c = mix(c, vec3(.012,.01,.014), e);
    if (flash < -0.5) c = vec3(e);
    float l = dot(c, vec3(.299,.587,.114)); c = mix(vec3(l), c, sat);
    c = c*gain + lift;
    vec2 q = vUv-.5; c *= 1. - vig*dot(q*vec2(1.,.75), q*vec2(1.,.75))*2.2;
    c = mix(c, vec3(1.), flash);
    gl_FragColor = vec4(c,1.); }` }));
const dofU = { src: { value: rtInk.texture }, nd: { value: rtNd.texture }, res: { value: new THREE.Vector2(W, H) }, focus: { value: 5 }, cinf: { value: 0 }, near: { value: 1 } };
const dofScene = fs(new THREE.ShaderMaterial({ uniforms: dofU, vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `uniform sampler2D src, nd; uniform vec2 res; uniform float focus, cinf, near; varying vec2 vUv;
  float coc(vec2 uv){ float d = texture2D(nd, uv).a; if (d <= 0.) d = 2000.; float k = 1. - focus/d; return k > 0. ? cinf*k : min(-k*cinf*near, cinf*1.4); }
  void main(){
    float c0 = coc(vUv);
    if (cinf < .5 || c0 < .6) { gl_FragColor = linearToOutputTexel(vec4(texture2D(src, vUv).rgb, 1.)); return; }
    vec3 acc = vec3(0.); float wsum = 0.;
    for (int i=0;i<48;i++){ float fi = float(i); float r = sqrt((fi+.5)/48.); float a = fi*2.39996;
      vec2 o = vec2(cos(a), sin(a))*r*c0/res; float cs = coc(vUv+o);
      float w = smoothstep(r*c0-1.5, r*c0+.5, cs + .5);
      acc += texture2D(src, vUv+o).rgb*w; wsum += w; }
    gl_FragColor = linearToOutputTexel(vec4(acc/max(wsum,1e-3), 1.)); }` }));
// final copy with sRGB handled by the renderer output (we render to screen with linear->sRGB in the shader chunk)
dofScene.children[0].material.toneMapped = false;

// ---------- per-frame state ----------
const tmpV = new THREE.Vector3();
function applyLight(L, f) {
  hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemi;
  sun.color.set(L.sun); sun.intensity = L.sunI;
  scene.fog.color.set(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  skyU.top.value.set(L.skyTop); skyU.hor.value.set(L.skyHor); skyU.sunCol.value.set(L.sunDisc || '#000'); skyU.sunSize.value = L.sunSize || 0;
  inkU.sat.value = L.sat; inkU.gain.value.set(L.gain || '#ffffff'); inkU.lift.value.set(L.lift || '#000000');
  waterU.deep.value.set(L.waterDeep); waterU.shal.value.set(L.waterShal); waterU.glint.value.set(L.glint);
}
function placeSun(L, focus) {
  // sun direction from azimuth/elevation in world space
  const az = rx(L.az), el = rx(L.el); tmpV.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  skyU.sunDir.value.copy(tmpV);
  sun.position.copy(focus).addScaledVector(tmpV, 80); sun.target.position.copy(focus);
  const ext = L.shadowExt || 30, sc = sun.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
}

function drawActors(list, cam) {
  cards.forEach((c) => { c.mesh.visible = c.blob.visible = false; });
  list.forEach((a, i) => {
    const c = getCard(i);
    c.draw(a.key, a.draw);
    c.mesh.visible = true; c.mesh.position.set(a.x, a.y, a.z);
    const s = a.s || 1; c.mesh.scale.set(s * (a.flip ? -1 : 1), s, s);
    c.mesh.rotation.set(0, Math.atan2(cam.position.x - a.x, cam.position.z - a.z) + (a.yaw || 0), a.roll || 0);
    c.mat.color.set(a.tint || '#ffffff'); c.mat.opacity = a.alpha ?? 1;
    c.mesh.castShadow = a.shadow !== false;
    c.mesh.renderOrder = a.order || 2;
    if (a.blob !== false && a.y < DECK + 0.5) { c.blob.visible = true; c.blob.position.set(a.x, (a.ground ?? DECK) + 0.02, a.z); c.blob.scale.set(0.95 * s, 0.6 * s, 1); }
  });
}

const helmetState = (h) => {
  helmet.visible = !!h; if (!h) return;
  helmet.position.set(h.x, h.y, h.z); helmet.rotation.set(h.rx || 0, h.ry || 0, h.rz || 0); helmet.scale.setScalar(h.s || 0.17);
};

const swapForNd = (on) => {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (on) {
      o.userData.mat0 = o.material;
      if (o.userData.ndSkip) { o.userData.vis0 = o.visible; o.visible = false; return; }
      if (o === sky || o.userData.sky) { o.userData.vis0 = o.visible; o.visible = false; return; }
      o.material = o.userData.nd || ndMat;
    } else {
      o.material = o.userData.mat0; if (o.userData.vis0 !== undefined) { o.visible = o.userData.vis0; delete o.userData.vis0; }
    }
  });
};

window.renderFrame = (f) => {
  const S = shotAt(f), L = lightFor(S, f), C = camAt(f);
  applyLight(L, f);
  camera.position.set(...C.pos); camera.up.set(0, 1, 0); camera.lookAt(...C.look); camera.rotateZ(rx(C.roll || 0));
  camera.fov = C.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const W_ = worldAt(f); worldState(W_, f);
  placeSun(L, new THREE.Vector3(...(C.shadowAt || C.look)));
  drawActors([...actorsAt(f, T), ...fxAt(f, T)], camera);
  helmetState(W_.helmet);
  sky.position.copy(camera.position);
  for (const c of clouds) c.quaternion.copy(camera.quaternion);
  // pass A: colour
  renderer.setRenderTarget(rtColor); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
  // pass B: normal + depth
  const fog = scene.fog; scene.fog = null; const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false; renderer.shadowMap.autoUpdate = false;
  swapForNd(true); renderer.setRenderTarget(rtNd); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera); swapForNd(false);
  scene.fog = fog; renderer.shadowMap.enabled = sm; renderer.shadowMap.autoUpdate = true;
  if (window.DEBUG_ND) { const dm = new THREE.MeshBasicMaterial({ map: rtNd.texture }); const ds = fs(dm); renderer.setRenderTarget(null); renderer.render(ds, fsCam); return true; }
  // ink + grade
  const D = dofAt(f);
  inkU.px.value = 2.5; inkU.flash.value = window.DEBUG_E ? -1 : (C.flash || 0); inkU.vig.value = L.vig ?? 0.22;
  renderer.setRenderTarget(rtInk); renderer.render(inkScene, fsCam);
  // lens
  dofU.focus.value = D.focus; dofU.cinf.value = D.cinf; dofU.near.value = D.near ?? 1;
  renderer.setRenderTarget(null); renderer.render(dofScene, fsCam);
  return true;
};
window.TOTAL = TOTAL;
window.ready = true;
