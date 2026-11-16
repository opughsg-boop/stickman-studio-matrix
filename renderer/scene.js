// Blueprint-diorama renderer. Everything is a pure function of time t (seconds) so any
// frame can be rendered independently -> chunked / resumable rendering.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bankH, CANAL, vnoise, rampK, wallowE } from './buffalo_ground.js';
import { makePost, buildHorizon, buildCover, upgradeWater, buildMotes, buildBirds, handheld, sharpenTextures, realismTick, resetRealism } from './realism.js';

const R = { W: 540, H: 960 };
let renderer, scene, camera, comp, cctx, plan, objects = [], lights = {}, fx = {}, postFx = null, fgLayer = null;
const style = { exposure: 1.0, captionY: 0.74, captionSize: 0.085, shadowRes: 2048, camEase: 0.7, drift: 0.08 };

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
const hash = str => { let h = 7; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100000; };
const col = c => new THREE.Color(c);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: col(c), roughness: o.r ?? .85, metalness: o.m ?? 0, ...(o.extra || {}) });
function shadowed(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function noiseFill(g, w, h, base, spread, n, seed) {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < n; i++) { const v = (r() - .5) * spread; const s = 1 + r() * 4;
    g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 230 : 0},${v > 0 ? 200 : 0},${Math.abs(v)})`; g.fillRect(r() * w, r() * h, s, s); }
}

// ---------- textures ----------
const TEX = {};
function makeTextures() {
  TEX.soilTop = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#6b4a33', .35, 9000, 3);
    const r = rng(9); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(40,25,15,${.25 + r() * .35})`; g.beginPath();
      g.ellipse(r() * w, r() * h, 2 + r() * 10, 1 + r() * 5, r() * 3, 0, 7); g.fill(); }
  }, [3, 3]);
  TEX.soilSide = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5a3e2b'); gr.addColorStop(.42, '#7a573a'); gr.addColorStop(.45, '#a9845c'); gr.addColorStop(1, '#b8946a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 'rgba(0,0,0,0)', .25, 6000, 5);
    g.strokeStyle = 'rgba(60,40,25,.6)'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * .44 + Math.sin(x * .05) * 4 + Math.sin(x * .013) * 6); g.stroke();
  }, [3, 1]);
  TEX.grid = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2f6fc0'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
  }, [40, 40]);
  TEX.wire = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(225,228,232,1)'; g.lineWidth = 5; const s = 32;
    for (let y = 0; y < h + s; y += s * 1.5) for (let x = 0; x < w + s; x += s * 1.732) for (const off of [0, 1]) {
      const cx = x + off * s * .866, cy = y + off * s * .75; g.beginPath();
      for (let k = 0; k <= 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; g.lineTo(cx + Math.cos(a) * s * .5, cy + Math.sin(a) * s * .5); } g.stroke(); }
  }, [6, 3]);
  TEX.wood = canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#8a5a32'; g.fillRect(0, 0, w, h); const r = rng(11);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${r() > .5 ? '60,35,15' : '170,120,70'},.35)`; g.lineWidth = 1 + r() * 2;
      g.beginPath(); const x = r() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 4, h * .3, x - 4, h * .7, x + r() * 3, h); g.stroke(); }
  });
  TEX.rays = canvasTex(256, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}

// ---------- environment ----------
// 3D sky (opt-in: env.sky:'sky3d'). A real 3D atmosphere dome (three.js Sky addon, Preetham model)
// plus 3D cumulus clouds built from spheres that drift slowly with time t.
function buildSky3D(env = {}) {
  // sky box must stay inside the camera far plane (400); the shader itself draws it at the far plane
  const sky = new Sky(); sky.scale.setScalar(950); // v2: camera far plane is 1000 so the distant horizon fits sky.frustumCulled = false; scene.add(sky);
  // the Preetham sky outputs very bright HDR values (three's own example lowers the whole exposure to 0.5);
  // we dim only the sky with a gain, so the island keeps its normal exposure and the sky keeps its blue
  // skyTint: the raw model is neutral white near the horizon; a camera-like cool balance gives the pale-blue haze of real photos
  sky.material.uniforms.skyGain = { value: env.skyGain ?? .4 };
  sky.material.uniforms.skyTint = { value: new THREE.Vector3(...(env.skyTint || [.8, .93, 1.15])) };
  sky.material.fragmentShader = 'uniform float skyGain;\nuniform vec3 skyTint;\n' + sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * skyGain * skyTint, 1.0 );');
  const u = sky.material.uniforms;
  u.turbidity.value = env.turbidity ?? 2.5; u.rayleigh.value = env.rayleigh ?? 2; u.mieCoefficient.value = .003; u.mieDirectionalG.value = .8; // clear-day values: smooth zenith-to-horizon gradient, thin haze
  // default sun: behind the usual camera (cameras sit on +z looking at -z) and to the right, like a well-lit daytime photo;
  // facing the sun makes the sky white and the subject a dark silhouette
  const elev = THREE.MathUtils.degToRad(env.sunElev ?? 45), az = THREE.MathUtils.degToRad(env.sunAz ?? 35);
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - elev, az);
  u.sunPosition.value.copy(sunDir);
  fx.sky = sky; fx.sunDir = sunDir;
  // 3D clouds: scattered cumulus (real skies have gaps between clouds), far and high so they sit in the sky,
  // not as one pale sheet. Each cloud is a cluster of flattened spheres with a flat base; fog off so distance keeps them white.
  const cl = new THREE.Group(); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: .35, fog: false });
  const nC = env.clouds ?? 9;
  for (let c = 0; c < nC; c++) {
    const g = new THREE.Group(); const a = -1.2 + (c / Math.max(1, nC - 1)) * 2.4 + (rnd() - .5) * .25, d = 230 + rnd() * 120;
    const cx = Math.sin(a) * d, cz = -Math.cos(a) * d, cy = 70 + rnd() * 45;
    const n = 6 + Math.floor(rnd() * 5), w = 10 + rnd() * 9;
    for (let k = 0; k < n; k++) { const r = 4 + rnd() * 5, s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), cloudMat);
      s.position.set((rnd() - .5) * w * 2, Math.abs(rnd() - .3) * 4, (rnd() - .5) * w); s.scale.y = .55; g.add(s); }
    g.position.set(cx, cy, cz); g.userData.x0 = cx; g.userData.speed = .4 + rnd() * .6; cl.add(g);
  }
  fx.clouds = cl; scene.add(cl);
  // image-based light from the same sky, so the blue sky fills shadows naturally (like the HDRI mode)
  // the lighting sky must get the same gain as the visible sky, or the scene is lit by a far too bright sky (washed-out colours)
  const es = new THREE.Scene(), esky = new Sky(); esky.scale.setScalar(380); esky.material.uniforms = u; esky.material.fragmentShader = sky.material.fragmentShader; es.add(esky);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0, .1, 1000).texture; pm.dispose();
  scene.environmentIntensity = env.envLight ?? .8;
}

function buildEnvironment(env = {}) {
  if (env.sky === 'sky3d') { // 3D atmosphere + 3D clouds, island over water (no HDRI image)
    scene.background = col('#8fb8e0');
    buildSky3D(env);
    scene.fog = new THREE.Fog(col(env.fog || '#c8dae6'), 40, 220); // fully fogged by 220 so the horizon blends into the sky
    const wm = new THREE.MeshStandardMaterial({ color: col(env.water || '#2c5872'), roughness: .3, metalness: .05, envMapIntensity: .7, fog: false }); // real sea is darker than the sky at the horizon
    // water must run out to the horizon, otherwise its edge shows as a hard seam; fog hides the far part
    const water = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), wm); water.rotation.x = -Math.PI / 2; water.position.y = -(env.island?.depth || 3.2) - .6; water.receiveShadow = true; scene.add(water);
    fx.water = water; fx.rays = new THREE.Group(); buildIsland(env, true);
    // the sun light follows the same sun direction as the 3D sky; soft sky fill
    lights.sun.position.copy(fx.sunDir).multiplyScalar(40); lights.hemi.intensity = .9; return; }
  if (TEX.sky) { // realistic mode: real HDRI sky + image-based light, island floating over open water
    scene.background = TEX.sky.tex; scene.backgroundBlurriness = env.skyBlur ?? .02; scene.environment = TEX.sky.env; scene.environmentIntensity = env.envLight ?? .9;
    scene.fog = new THREE.Fog(col(env.fog || '#c8d8e6'), 45, 170);
    const wm = new THREE.MeshStandardMaterial({ color: col(env.water || '#3f6f8f'), roughness: .12, metalness: .35 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), wm); water.rotation.x = -Math.PI / 2; water.position.y = -(env.island?.depth || 3.2) - .6; water.receiveShadow = true; scene.add(water);
    fx.water = water; fx.rays = new THREE.Group(); buildIsland(env, true); return; }
  scene.background = col(env.bg || '#3d7fd0');
  scene.fog = new THREE.Fog(col(env.bg || '#3d7fd0'), 40, 110);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: TEX.grid, roughness: .6 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -6; floor.receiveShadow = true; scene.add(floor);
  for (const [x, z, ry] of [[0, -45, 0], [-45, 0, Math.PI / 2]]) {
    const wt = TEX.grid.clone(); wt.needsUpdate = true; wt.repeat.set(30, 20);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(240, 160), new THREE.MeshStandardMaterial({ map: wt, roughness: .7, color: col('#a8c8ff') }));
    wall.position.set(x, 74, z); wall.rotation.y = ry; scene.add(wall);
  }
  // god rays
  const rayMat = new THREE.MeshBasicMaterial({ map: TEX.rays, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  fx.rays = new THREE.Group();
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(140, 9 + i * 5), rayMat);
    m.position.set(-30 + i * 9, 30, -20 + i * 6); m.rotation.set(0, .5, -0.95 - i * .03); fx.rays.add(m); }
  scene.add(fx.rays);
  buildIsland(env, false);
}
function buildIsland(env, real) {
  // island
  const I = env.island || { w: 12, d: 12, depth: 3.2 };
  fx.island = I;
  const geo = new THREE.BoxGeometry(I.w, I.depth, I.d, 24, 1, 24);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (!env.flatTop && p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 1.3) * .05 + Math.cos(p.getZ(i) * 1.7) * .05);
  geo.computeVertexNormals();
  const side = new THREE.MeshStandardMaterial({ map: TEX.soilSide, roughness: 1 }), top = new THREE.MeshStandardMaterial({ map: TEX.soilTop, roughness: 1 });
  if (env.soilTint) top.color.setRGB(...env.soilTint); // e.g. [1.15, 1.05, .85] warms a grey soil toward pale sand
  if (TEX.realSoil) { top.map = TEX.realSoil.diff; if (TEX.realSoil.nor) top.normalMap = TEX.realSoil.nor; if (TEX.realSoil.rough) top.roughnessMap = TEX.realSoil.rough; }
  const island = new THREE.Mesh(geo, [side, side, top, side, side, side]);
  island.position.y = -I.depth / 2; island.receiveShadow = true; island.castShadow = true; scene.add(island);
  // lights
  lights.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4636, real ? .55 : 1.25); scene.add(lights.hemi); lights.hemiBase = real ? .55 : 1.25;
  lights.sun = new THREE.DirectionalLight(real ? 0xffe6c4 : 0xfff4e0, 2.6); lights.sun.position.set(-14, 26, 12);
  lights.sun.castShadow = true; lights.sun.shadow.mapSize.set(style.shadowRes, style.shadowRes);
  // v2: frustum fitted to the island (half diagonal + margin) -> about 2.6x sharper shadows at 2048 than the old 1024 / +-14
  const sr = style.shadowFit === false ? 14 : Math.min(14, Math.hypot(I.w, I.d) / 2 + 2);
  Object.assign(lights.sun.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 1, far: 80 });
  lights.sun.shadow.bias = -0.0005; lights.sun.shadow.radius = 4; scene.add(lights.sun);
  lights.heat = new THREE.PointLight(0xff5a1f, 0, 30); lights.heat.position.set(0, 6, 0); scene.add(lights.heat);
}

// ---------- asset library ----------
// Each builder returns THREE.Object3D; optional obj.userData.tick(t, age) for idle animation.
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r1, r2, h, m, s = 16) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), m);
const sph = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m);
const woodMat = () => new THREE.MeshStandardMaterial({ map: TEX.wood, color: col('#c08a58'), roughness: .9 });

const FEATHER = {};
function featherTex(base, edge, bars) { // scalloped overlapping feathers, soft barring; cached per colour
  const k = base + edge + (bars || ''); if (FEATHER[k]) return FEATHER[k];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256); const r = rng(7);
  for (let row = 0; row < 18; row++) for (let i = 0; i < 14; i++) {
    const cx = i * 19 + (row % 2 ? 9 : 0) + (r() - .5) * 4, cy = row * 15 + 8, sh = (r() - .5) * 26;
    const R = 11 + r() * 3; const col2 = `rgb(${parseInt(base.slice(1, 3), 16) + sh},${parseInt(base.slice(3, 5), 16) + sh * .8},${parseInt(base.slice(5, 7), 16) + sh * .6})`;
    x.fillStyle = col2; x.beginPath(); x.ellipse(cx, cy, R * .85, R * 1.15, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = edge; x.globalAlpha = .55; x.lineWidth = 1.4; x.beginPath(); x.arc(cx, cy - 4, R * .85, .15 * Math.PI, .85 * Math.PI); x.stroke(); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    if (bars) { x.fillStyle = bars; x.globalAlpha = .35; x.fillRect(cx - R, cy - 1, R * 2, 3); x.globalAlpha = 1; } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return FEATHER[k] = t;
}
function chicken(p = {}) { // realistic-proportion laying hen, ~0.4 m tall at scale .36: feathered body, layered wings, tail fan, comb, wattles, scaled legs with toes
  const g = new THREE.Group(), r = rng(p.seed || 1);
  const pal = [['#8c4a22', '#e0a15e', '#3b1d0c'], ['#a3562b', '#f0b878', '#4a2410'], ['#6e3a1c', '#c98a4c', '#24120a'], ['#b96a32', '#f2c48a', '#5a2c12'], ['#d9d2c4', '#ffffff', '#5b564d']][Math.floor(r() * 5)];
  const fm = (c, e, rep = [2, 2], bars) => { const t = featherTex(c, e, bars).clone(); t.repeat.set(...rep); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: .88, bumpMap: t, bumpScale: .6 }); };
  const bodyM = fm(pal[0], pal[1]), wingM = fm(pal[2], pal[1], [1.2, 1.4]);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.5, 28, 22), bodyM); body.scale.set(.74, .7, 1.12); body.position.set(0, .66, -.02); body.rotation.x = -.18; g.add(body);
  const breast = new THREE.Mesh(new THREE.SphereGeometry(.34, 22, 16), bodyM); breast.scale.set(.95, .9, .9); breast.position.set(0, .62, .34); g.add(breast);
  for (const s of [-1, 1]) { // folded wings with 3 stacked feather layers
    for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.SphereGeometry(.34, 18, 12), i ? wingM : bodyM); w.scale.set(.16, .5 - i * .08, .95 - i * .12);
      w.position.set(s * (.37 - i * .005), .68 - i * .05, -.05 - i * .12); w.rotation.set(-.15 + i * .06, 0, s * (.05 + i * .02)); g.add(w); } }
  const tail = new THREE.Group(); tail.position.set(0, .86, -.52); tail.rotation.x = .55; g.add(tail);
  for (let i = -3; i <= 3; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), fm(i % 2 ? pal[2] : pal[0], pal[1], [.6, 1])); f.scale.set(.07, .5, .02 + .01 * (3 - Math.abs(i)));
    f.position.set(i * .06, .22 - Math.abs(i) * .02, 0); f.rotation.set(0, 0, -i * .16); tail.add(f); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.13, .24, .55, 16), bodyM); neck.position.set(0, .98, .42); neck.rotation.x = .38; g.add(neck);
  const hackle = new THREE.Mesh(new THREE.SphereGeometry(.28, 18, 12), fm(pal[1], pal[0], [1.5, 1])); hackle.scale.set(.85, .6, .8); hackle.position.set(0, .86, .38); g.add(hackle);
  const head = new THREE.Group(); head.position.set(0, 1.28, .56); g.add(head);
  const skin = std('#e8cfc0', { r: .6 }), red = std('#c4161c', { r: .45 });
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.15, 20, 16), skin); hd.scale.set(.9, 1, 1.15); head.add(hd);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(.07 - i * .008, 12, 10), red); c.scale.set(.35, 1.1, 1); c.position.set(0, .17 - Math.abs(i - 1) * .03, -.04 + i * .06); head.add(c); }
  for (const s of [-1, 1]) { const wt = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), red); wt.scale.set(.5, 1.5, .8); wt.position.set(s * .025, -.17, .1); head.add(wt);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.04, 10, 8), std('#f3efe8')); ear.scale.set(.4, 1, .8); ear.position.set(s * .13, -.04, .0); head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), std('#e67e22', { r: .2 })); eye.position.set(s * .125, .04, .09); head.add(eye);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(.016, 8, 6), std('#050505', { r: .1 })); pu.position.set(s * .15, .04, .1); head.add(pu); }
  const beakM = std('#d9a63a', { r: .45 }); const bu = new THREE.Mesh(new THREE.ConeGeometry(.055, .17, 10), beakM); bu.rotation.x = Math.PI / 2 + .12; bu.position.set(0, -.01, .2); head.add(bu);
  const bl = new THREE.Mesh(new THREE.ConeGeometry(.04, .12, 8), beakM); bl.rotation.x = Math.PI / 2 - .1; bl.position.set(0, -.06, .18); head.add(bl);
  const legs = [], legM = std('#d6a93c', { r: .55 });
  for (const s of [-1, 1]) { const lg = new THREE.Group(); lg.position.set(s * .17, .42, .02); g.add(lg);
    const th = new THREE.Mesh(new THREE.SphereGeometry(.14, 14, 10), bodyM); th.scale.set(.8, 1.2, 1); th.position.y = -.02; lg.add(th);
    const tar = cyl(.026, .02, .34, legM, 10); tar.position.y = -.2; lg.add(tar);
    for (const a of [-.45, 0, .45]) { const toe = cyl(.014, .01, .16, legM, 6); toe.rotation.set(Math.PI / 2, 0, a); toe.position.set(Math.sin(a) * .07, -.37, .08); lg.add(toe); }
    const hind = cyl(.012, .01, .09, legM, 6); hind.rotation.x = Math.PI / 2; hind.position.set(0, -.37, -.05); lg.add(hind); legs.push(lg); }
  g.scale.setScalar(p.scale || .36);
  g.userData.head = head; g.userData.legs = legs; g.userData.body = body; g.userData.neck = neck;
  return shadowed(g);
}
function duck(p = {}) { // white Pekin-style duck, ~0.4 m long at scale .4: feathered body, short neck, flat orange bill, webbed feet
  const g = new THREE.Group(), r = rng(p.seed || 1);
  const base = ['#f4f1e8', '#ece6d6', '#f7f4ec'][Math.floor(r() * 3)];
  const fm = (rep = [2, 2]) => { const t = featherTex(base, '#ffffff').clone(); t.repeat.set(...rep); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: .85, bumpMap: t, bumpScale: .5 }); };
  const bodyM = fm();
  const body = new THREE.Mesh(new THREE.SphereGeometry(.5, 28, 22), bodyM); body.scale.set(.72, .62, 1.18); body.position.set(0, .5, 0); body.rotation.x = -.12; g.add(body);
  const breast = new THREE.Mesh(new THREE.SphereGeometry(.32, 20, 14), bodyM); breast.scale.set(1, .9, .9); breast.position.set(0, .5, .42); g.add(breast);
  for (const s2 of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 12), fm([1, 1.4])); w.scale.set(.15, .42, .95); w.position.set(s2 * .35, .56, -.08); w.rotation.set(-.1, 0, s2 * .08); g.add(w); }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.17, .42, 10), bodyM); tail.position.set(0, .68, -.62); tail.rotation.x = -1.15; g.add(tail);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.1, .17, .52, 14), bodyM); neck.position.set(0, .86, .46); neck.rotation.x = .3; g.add(neck);
  const head = new THREE.Group(); head.position.set(0, 1.12, .58); g.add(head);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.15, 18, 14), bodyM); hd.scale.set(.95, 1, 1.1); head.add(hd);
  const bill = box(.16, .06, .22, std('#f08a1a', { r: .5 })); bill.position.set(0, -.04, .2); head.add(bill);
  const tip = box(.09, .03, .06, std('#f5a940', { r: .5 })); tip.position.set(0, -.04, .33); head.add(tip);
  for (const s2 of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), std('#050505', { r: .1 })); eye.position.set(s2 * .12, .04, .08); head.add(eye); }
  const legs = [], orange = std('#f08a1a', { r: .55 });
  for (const s2 of [-1, 1]) { const lg = new THREE.Group(); lg.position.set(s2 * .16, .22, .05); g.add(lg);
    const sh = cyl(.03, .025, .24, orange, 8); sh.position.y = -.08; lg.add(sh);
    const foot = box(.2, .02, .26, orange); foot.position.set(0, -.2, .06); lg.add(foot); legs.push(lg); }
  g.scale.setScalar(p.scale || .4);
  g.userData.head = head; g.userData.legs = legs;
  return shadowed(g);
}
function flock(p = {}) {
  const g = new THREE.Group(), n = p.count || 8, r = rng(p.seed || 4), area = p.area || [8, 8];
  const birds = [];
  for (let i = 0; i < n; i++) {
    const c = (p.species === 'duck' ? duck : chicken)({ seed: i + 1 + (p.seed || 0), scale: p.scale });
    const b = { o: c, x: (r() - .5) * area[0], z: (r() - .5) * area[1], ph: r() * 6.28, sp: .25 + r() * .35, rad: .4 + r() * .9 };
    birds.push(b); g.add(c);
  }
  g.userData.tick = (t) => {
    const mo = g.userData.mode || p.mode || 'wander'; const mode = typeof mo === 'string' ? mo : mo.mode;
    const P = g.parent ? g.parent.position : new THREE.Vector3();
    const perchAt = typeof mo === 'object' && mo.at ? mo : null;
    birds.forEach((b, i) => {
      let x = b.x, z = b.z, y = 0, face;
      if (mode === 'wander' || mode === 'scratch') {
        const a = t * b.sp + b.ph; x += Math.sin(a) * b.rad; z += Math.cos(a * .8) * b.rad;
        face = Math.atan2(Math.cos(a) * b.rad * b.sp, -Math.sin(a * .8) * .8 * b.rad * b.sp);
        b.o.userData.head.rotation.x = Math.max(0, Math.sin(t * 5 + b.ph * 3)) * (mode === 'scratch' ? 1.1 : .6);
      } else if (mode === 'pant') { face = b.ph; b.o.userData.head.rotation.x = -.2; b.o.scale.y = b.o.scale.x * (1 + Math.sin(t * 18 + i) * .04);
      } else if (mode === 'sleep') { face = b.ph; y = -.1; b.o.userData.head.rotation.x = .9;
      } else if (mode === 'perch' && perchAt) { const len = perchAt.len || 4, k = i / Math.max(1, n - 1); x = perchAt.at[0] - P.x + lerp(-len / 2 + .3, len / 2 - .3, k);
        z = perchAt.at[2] - P.z + (i % 2 ? .35 : -.35); y = perchAt.at[1] + .03; face = 0; b.o.userData.head.rotation.x = Math.sin(t * 2 + i) * .1; }
      if (p.bounds) { const bx = p.bounds[0], bz = p.bounds[1]; x = Math.max(-bx, Math.min(bx, x)); z = Math.max(-bz, Math.min(bz, z)); } // hens stay inside the cage
      const mv = (mode === 'wander' || mode === 'scratch') ? 1 : 0, lg = b.o.userData.legs;
      if (lg) { lg[0].rotation.x = Math.sin(t * 6 + b.ph) * .35 * mv; lg[1].rotation.x = -Math.sin(t * 6 + b.ph) * .35 * mv; }
      b.o.position.set(x, y + Math.abs(Math.sin(t * 6 + b.ph)) * .012 * mv, z); b.o.rotation.y = face ?? 0;
    });
  };
  return g;
}
function post(p = {}) { const h = p.h || 3.5, m = box(p.t || .22, h, p.t || .22, woodMat()); m.position.y = h / 2; return shadowed(m); }
function beam(p = {}) { const m = box(p.len || 6, p.t || .18, p.t || .18, woodMat()); if (p.axis === 'z') m.rotation.y = Math.PI / 2; return shadowed(m); }
function frame(p = {}) {
  const g = new THREE.Group(), w = p.w || 7, d = p.d || 6, h = p.h || 3.2;
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const q = post({ h: h + .1 }); q.position.x = x; q.position.z = z; g.add(q); }
  for (const z of [-d / 2, d / 2]) { const b = beam({ len: w + .3 }); b.position.set(0, h, z); g.add(b); }
  for (const x of [-w / 2, w / 2]) { const b = beam({ len: d + .3, axis: 'z' }); b.position.set(x, h, 0); g.add(b); }
  return g;
}
function roof(p = {}) {
  const w = (p.w || 7) + 1, d = (p.d || 6) + 1, geo = new THREE.PlaneGeometry(w, d, 260, 2), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(a.getX(i) * 16) * .028);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, std(p.color || '#b9bcc0', { r: .45, m: p.color === '#f4f4f0' ? .1 : .6, extra: { side: THREE.DoubleSide } }));
  m.rotation.x = -Math.PI / 2 + (p.slope || .06); m.position.y = (p.h || 3.2) + .15; return shadowed(m);
}
function meshWall(p = {}) {
  const w = p.w || 7, d = p.d || 6, h = p.h || 3.2, g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: TEX.wire, transparent: true, alphaTest: .12, side: THREE.DoubleSide, metalness: .3, roughness: .5 });
  const sides = p.sides || [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]];
  for (const [x, z, len, ry] of sides) { const t = TEX.wire.clone(); t.needsUpdate = true; t.repeat.set(len * 2.6, h * 2.6);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat.clone()); pl.material.map = t; pl.position.set(x, h / 2, z); pl.rotation.y = ry; g.add(pl); }
  return g;
}
function wallSolid(p = {}) { const m = box(p.len || 6, p.h || 3, .15, std(p.color || '#d9c7a3')); m.position.y = (p.h || 3) / 2; return shadowed(m); }
function perch(p = {}) {
  const g = new THREE.Group(), len = p.len || 4, h = p.h || 1.1, rows = p.rows || 2;
  const mt = p.color ? std(p.color, { m: .85, r: .3 }) : null;
  for (const x of [-len / 2, len / 2]) for (const z of [-.5, .5]) { const l = post({ h, t: .12 }); if (mt) l.material = mt; l.position.set(x, 0, z); g.add(l); }
  for (let i = 0; i < rows; i++) { const b = cyl(.07, .07, len + .2, mt || woodMat()); b.rotation.z = Math.PI / 2; b.position.set(0, h, (i - (rows - 1) / 2) * .7); g.add(b); }
  return shadowed(g);
}
function board(p = {}) { const m = box(p.len || 4, .08, p.d || 1.6, woodMat()); m.position.y = p.y ?? .35; return shadowed(m); }
function feeder() { const g = new THREE.Group(); const t = cyl(.35, .35, .9, std('#9aa0a6', { r: .3, m: .8 })); t.position.y = .75; g.add(t);
  const pan = cyl(.6, .55, .12, std('#8a9096', { r: .35, m: .8 })); pan.position.y = .15; g.add(pan); const lid = new THREE.Mesh(new THREE.ConeGeometry(.42, .3, 16), std('#9aa0a6', { m: .8, r: .3 })); lid.position.y = 1.35; g.add(lid); return shadowed(g); }
function waterer() { const g = new THREE.Group(); const t = cyl(.33, .33, .8, std('#f2f2f2', { r: .4 })); t.position.y = .65; g.add(t);
  const base = cyl(.55, .55, .14, std('#d8312b')); base.position.y = .14; g.add(base); const cap = cyl(.2, .33, .15, std('#d8312b')); cap.position.y = 1.12; g.add(cap); return shadowed(g); }
function nestBox(p = {}) {
  const g = new THREE.Group(), n = p.count || 2, w = .8 * n;
  const b = box(w, .8, .8, woodMat()); b.position.y = (p.y ?? 1) + .4; g.add(b);
  for (let i = 0; i < n; i++) { const hole = box(.5, .45, .05, std('#120c08')); hole.position.set(-w / 2 + .4 + i * .8, (p.y ?? 1) + .38, .41); g.add(hole); }
  const rf = box(w + .2, .08, 1.1, woodMat()); rf.position.y = (p.y ?? 1) + .9; rf.rotation.x = .25; g.add(rf);
  for (const x of [-w / 2 + .1, w / 2 - .1]) { const l = post({ h: p.y ?? 1, t: .1 }); l.position.set(x, 0, .25); g.add(l); }
  return shadowed(g);
}
function crops(p = {}) {
  const g = new THREE.Group(), rows = p.rows || 4, per = p.per || 6, sp = p.spacing || .7, r = rng(p.seed || 7);
  const leaf = std(p.color || '#4f9a3a', { r: .7 });
  for (let i = 0; i < rows; i++) for (let j = 0; j < per; j++) {
    const pl = new THREE.Group(); for (let k = 0; k < 5; k++) { const l = sph(.16, leaf); l.scale.set(.5, .25, 1.3);
      l.position.set(Math.cos(k * 1.26) * .14, .12 + k * .02, Math.sin(k * 1.26) * .14); l.rotation.y = k * 1.26; pl.add(l); }
    pl.position.set((j - (per - 1) / 2) * sp, 0, (i - (rows - 1) / 2) * sp); pl.scale.setScalar(.8 + r() * .5); g.add(pl);
  }
  g.userData.tick = (t) => g.children.forEach((c, i) => c.rotation.z = Math.sin(t * 1.5 + i) * .05);
  return shadowed(g);
}
function tree(p = {}) { const g = new THREE.Group(); const tr = cyl(.18, .26, 2, std('#6b4a2b')); tr.position.y = 1; g.add(tr);
  for (let i = 0; i < 4; i++) { const c = sph(.9 - i * .1, std(p.color || '#3f8a3a')); c.position.set(Math.sin(i * 2) * .4, 2.2 + i * .45, Math.cos(i * 2) * .4); g.add(c); }
  g.scale.setScalar(p.scale || 1); return shadowed(g); }
function rock(p = {}) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(p.r || .5, 0), std('#8b8680')); m.position.y = (p.r || .5) * .5; return shadowed(m); }
function water(p = {}) { const m = new THREE.Mesh(new THREE.CircleGeometry(p.r || 1.5, 40), std('#3b8fd6', { r: .1, m: .2, extra: { transparent: true, opacity: .85 } }));
  m.rotation.x = -Math.PI / 2; m.position.y = .03; m.userData.tick = t => m.material.color.setHSL(.58, .6, .5 + Math.sin(t * 2) * .03); return m; }
function house(p = {}) { const g = new THREE.Group(), w = p.w || 3, d = p.d || 3, h = p.h || 2.2;
  const b = box(w, h, d, std(p.color || '#e8dcc0')); b.position.y = h / 2; g.add(b);
  const r = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * .78, 1.4, 4), std('#b5462e')); r.rotation.y = Math.PI / 4; r.position.y = h + .7; g.add(r);
  const door = box(.6, 1.1, .05, std('#5a3a22')); door.position.set(0, .55, d / 2 + .01); g.add(door); return shadowed(g); }
function person(p = {}) { const g = new THREE.Group();
  const legs = box(.4, .8, .22, std('#2d3b55')); legs.position.y = .4; g.add(legs);
  const torso = box(.5, .7, .28, std(p.color || '#d35b3a')); torso.position.y = 1.15; g.add(torso);
  const head = sph(.2, std('#e2b48c')); head.position.y = 1.7; g.add(head);
  const hat = cyl(.3, .3, .05, std('#c9a45a')); hat.position.y = 1.86; g.add(hat);
  g.userData.tick = t => { torso.rotation.y = Math.sin(t * 1.4) * .15; }; return shadowed(g); }
function quadruped(p = {}) { const g = new THREE.Group(), c = p.color || '#ece6dc';
  const b = sph(.6, std(c)); b.scale.set(.75, .7, 1.3); b.position.y = .95; g.add(b);
  const h = sph(.3, std(c)); h.position.set(0, 1.3, .85); g.add(h);
  for (const [x, z] of [[-.25, -.5], [.25, -.5], [-.25, .5], [.25, .5]]) { const l = cyl(.08, .08, .7, std('#3a2a20')); l.position.set(x, .35, z); g.add(l); }
  g.scale.setScalar(p.scale || 1); g.userData.tick = t => { h.rotation.x = Math.max(0, Math.sin(t * .9)) * .5; }; return shadowed(g); }
function crate(p = {}) { const m = box(p.s || .8, p.s || .8, p.s || .8, woodMat()); m.position.y = (p.s || .8) / 2; return shadowed(m); }
function barrel(p = {}) { const m = cyl(.4, .4, 1, std(p.color || '#2f6f9a', { m: .4, r: .5 })); m.position.y = .5; return shadowed(m); }
function sign(p = {}) { // flat billboard text - disabled by the style lock (only spoken captions may appear as words)
  if (style.allowText !== true) return new THREE.Group();
  const txt = String(p.text || '').toUpperCase();
  const tex = canvasTex(1024, 200, (g, w, h) => { g.fillStyle = p.bg || 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h);
    let fsz = 140; g.font = `800 italic ${fsz}px Cap, CapAr, sans-serif`; while (g.measureText(txt).width > w * .92 && fsz > 20) { fsz -= 6; g.font = `800 italic ${fsz}px Cap, CapAr, sans-serif`; } g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = '#1b1b1b'; g.strokeText(txt, w / 2, h / 2); g.fillStyle = p.color || '#f2c230'; g.fillText(txt, w / 2, h / 2); });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1, 1);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false })); s.scale.set(5 * (p.scale || 1), 1 * (p.scale || 1), 1); s.renderOrder = 10;
  s.position.y = p.y ?? 2; return s; }
function arrow(p = {}) { // yellow (double) arrow from a to b
  const a = new THREE.Vector3(...(p.from || [0, 0, 0])), b = new THREE.Vector3(...(p.to || [0, 2, 0]));
  const g = new THREE.Group(), dir = b.clone().sub(a), len = dir.length(), mat = std(p.color || '#f2c230', { r: .4, extra: { emissive: col('#5a4200') } });
  const head = p.head || .35, shaft = cyl(head * .2, head * .2, Math.max(.01, len - head * (p.double ? 2 : 1)), mat); shaft.position.y = p.double ? 0 : -head / 2; g.add(shaft);
  const h1 = new THREE.Mesh(new THREE.ConeGeometry(head * .57, head, 16), mat); h1.position.y = len / 2 - head / 2; g.add(h1);
  if (p.double) { const h2 = h1.clone(); h2.rotation.x = Math.PI; h2.position.y = -len / 2 + head / 2; g.add(h2); }
  g.position.copy(a.clone().add(b).multiplyScalar(.5)); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.userData.tick = t => g.scale.setScalar(1 + Math.sin(t * 6) * .04);
  const wrap = new THREE.Group(); wrap.add(g);
  if (p.label && style.allowText === true) { const s = sign({ text: p.label, scale: p.labelScale || .7, y: 0 }); s.position.copy(g.position).add(new THREE.Vector3(0, (p.labelUp ?? .3), .6)); wrap.add(s); }
  return wrap; }
function heat(p = {}) { const g = new THREE.Group(); // shimmering red-orange haze volume
  const m = new THREE.Mesh(new THREE.BoxGeometry(p.w || 8, p.h || 3, p.d || 7), new THREE.MeshBasicMaterial({ color: p.color || '#ff4a1a', transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.y = (p.h || 3) / 2; g.add(m);
  g.userData.tick = t => { m.material.opacity = .16 + Math.sin(t * 4) * .06; }; return g; }
function dirt(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 2), n = p.count || 30;
  for (let i = 0; i < n; i++) { const d = sph(.03 + r() * .035, std(p.color || '#e9e4d6')); d.scale.y = .4; d.position.set((r() - .5) * (p.w || 4), .03 + (p.y || 0), (r() - .5) * (p.d || 1.5)); g.add(d); } return g; }
// anatomy surfaces (from anatomy references): rumen papillae = fuzzy brown, reticulum = honeycomb,
// omasum = stacked leaves/folds, abomasum = folded light brown-pink glandular lining. Canvas textures, cached.
const ANAT = {};
function anatTex(kind) {
  if (ANAT[kind]) return ANAT[kind];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  if (kind === 'honeycomb') { x.fillStyle = '#8c6f4a'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#d7c3a0'; x.lineWidth = 7;
    for (let r = -1; r < 9; r++) for (let q = -1; q < 9; q++) { const cx = q * 32 + (r % 2) * 16, cy = r * 28; x.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; x.lineTo(cx + 15 * Math.cos(a), cy + 15 * Math.sin(a)); } x.closePath(); x.stroke(); } }
  else if (kind === 'leaves') { x.fillStyle = '#9d8560'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(${200 + Math.random() * 30},${180 + Math.random() * 30},${140},${.5 + Math.random() * .4})`; x.lineWidth = 2 + Math.random() * 4; const y = Math.random() * 256; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + (Math.random() - .5) * 40, 170, y + (Math.random() - .5) * 40, 256, y); x.stroke(); } }
  else if (kind === 'rugae') { x.fillStyle = '#c99e8e'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(120,70,60,${.25 + Math.random() * .3})`; x.lineWidth = 3 + Math.random() * 3; const y = i * 10 + Math.random() * 4; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(90, y + 8, 160, y - 8, 256, y + (Math.random() - .5) * 8); x.stroke(); } }
  else if (kind === 'grass') { x.fillStyle = '#5b7a2a'; x.fillRect(0, 0, 256, 256); // chewed grass inside the rumen: green-yellow fibres
    for (let i = 0; i < 700; i++) { x.strokeStyle = `rgba(${90 + Math.random() * 90},${130 + Math.random() * 80},${30 + Math.random() * 40},.8)`; x.lineWidth = 1 + Math.random() * 2; const px = Math.random() * 256, py = Math.random() * 256, a = Math.random() * 6.3, l = 6 + Math.random() * 22; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); } }
  else if (kind === 'wood') { x.fillStyle = '#b98f5e'; x.fillRect(0, 0, 256, 256); // weathered timber: warm brown with long grain lines, knots and cracks
    for (let i = 0; i < 70; i++) { const y = Math.random() * 256, d = (Math.random() - .5) * 14; x.strokeStyle = `rgba(${70 + Math.random() * 50},${45 + Math.random() * 35},${25 + Math.random() * 20},${.12 + Math.random() * .3})`; x.lineWidth = .6 + Math.random() * 2.2; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + d, 170, y - d, 256, y + d * .5); x.stroke(); }
    for (let i = 0; i < 3; i++) { const cx = 30 + Math.random() * 190, cy = 20 + Math.random() * 216; for (let r = 3; r < 15; r += 3) { x.strokeStyle = `rgba(60,38,20,${.35 - r * .015})`; x.lineWidth = 1.4; x.beginPath(); x.ellipse(cx, cy, r * 1.6, r, 0, 0, 7); x.stroke(); } } }
  else if (kind === 'tissue') { x.fillStyle = '#e8b4a4'; x.fillRect(0, 0, 256, 256); // glossy organ wall: pink with soft blotches and fine veins
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${200 + Math.random() * 40},${120 + Math.random() * 40},${110 + Math.random() * 30},.25)`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 14, 0, 7); x.fill(); }
    for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(170,60,60,${.25 + Math.random() * .25})`; x.lineWidth = .8 + Math.random() * 1.4; let px = Math.random() * 256, py = Math.random() * 256; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (Math.random() - .5) * 60; py += (Math.random() - .5) * 60; x.lineTo(px, py); } x.stroke(); } }
  else { x.fillStyle = '#6a5636'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${90 + Math.random() * 60},${70 + Math.random() * 50},${40 + Math.random() * 30},.6)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return (ANAT[kind] = t);
}
// Fur / hide detail for the flat-colour library animals: object-space noise breaks the flat colour into fine hair strands
// (about 1 cm) and soft patches (about 10 cm), brightens the belly-side with a little rim sheen. No UVs needed.
function furShader(mt, geo) {
  if (mt.userData.fur) return; mt.userData.fur = true;
  geo.computeBoundingBox(); const hgt = Math.max(1e-4, geo.boundingBox.max.y - geo.boundingBox.min.y), k = 1 / hgt; // 1 / model height in local units
  mt.onBeforeCompile = (sh) => {
    sh.uniforms.furK = { value: k };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFur;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFur = transformed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vFur; uniform float furK;
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 q = vFur * furK; // 1 unit = animal height (about 1.5 m)
  float strand = n3(q * vec3(260., 80., 260.)), tuft = n3(q * 34.), blot = n3(q * 9.);
  float fur = strand * .45 + tuft * .35 + blot * .2;
  diffuseColor.rgb *= .72 + .56 * fur; }`);
  };
  mt.customProgramCacheKey = () => 'fur1';
}
function custom(p = {}) { // composition of primitives generated by the planner (LLM can invent new assets)
  const g = new THREE.Group();
  for (const part of p.parts || []) {
    const m = std(part.color || '#999', { m: part.metal || 0, r: part.rough ?? .8 }); let mesh; const s = part.size || [1, 1, 1];
    if (part.wood && TEX.wood) { const wt = TEX.wood.clone(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(...(part.wood === true ? [1, 1] : part.wood)); wt.needsUpdate = true; m.map = wt; m.roughness = .88; m.needsUpdate = true; } // real wood grain texture on boards and roof
    if (part.tex) { m.map = anatTex(part.tex); m.roughness = part.rough ?? .95; m.needsUpdate = true; }
    if (part.cutX != null) { m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -part.cutX)]; m.side = THREE.DoubleSide; m.needsUpdate = true; } // remove x < cutX
    if (part.shape === 'sphere') mesh = sph(s[0] / 2, m); else if (part.shape === 'cylinder') mesh = cyl(s[0] / 2, (s[2] ?? s[0]) / 2, s[1], m);
    else if (part.shape === 'cone') mesh = new THREE.Mesh(new THREE.ConeGeometry(s[0] / 2, s[1], 18), m); else mesh = box(s[0], s[1], s[2], m);
    if (part.shape === 'sphere' && s[1]) mesh.scale.set(1, s[1] / s[0], (s[2] || s[0]) / s[0]);
    if (part.fur && mesh.material && mesh.geometry) furShader(mesh.material, mesh.geometry); // feathers/hair detail on this part
    if (part.wobble && mesh.geometry?.attributes?.position) { // lumpy, irregular organ wall instead of a perfect ball (deterministic)
      const pos = mesh.geometry.attributes.position, a = part.wobble;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const d = 1 + a * (Math.sin(x * 9.1 + y * 3.7) * .5 + Math.sin(z * 7.3 - y * 5.1) * .3 + Math.sin((x + z) * 14.2) * .2); pos.setXYZ(i, x * d, y * d, z * d); }
      mesh.geometry.computeVertexNormals(); }
    mesh.position.set(...(part.pos || [0, s[1] / 2, 0])); if (part.rot) mesh.rotation.set(...part.rot); g.add(mesh);
  }
  return shadowed(g); }

// ported from claude-animated-shorts bridge (build.ts house() + buildTown): a row of gabled town houses with plinth, cornice,
// window frames with shutters, a door, a chimney. No text anywhere (style lock). Params: n (houses), w, d, h, street ('x' or 'z'), gap, seed, wall (hex list)
function town(p = {}) {
  const g = new THREE.Group(), r = rng(p.seed || 11), n = p.n || 4, walls = p.walls || ['#e9dcc3', '#d9c2a0', '#c9d6dc', '#e8b89a', '#dfe6c8'];
  const roofC = p.roof || '#7a5a48', trim = '#efe3c8', shut = p.shutter || '#3b5f7a', glass = '#2f3d4a', stone = '#b8ad9a';
  const mats = {}; const M = (c, o = {}) => (mats[c + JSON.stringify(o)] ??= std(c, o));
  for (let i = 0; i < n; i++) {
    const w = p.w || (7 + (r() < .5 ? 2 : 0)), d = p.d || 6, h = (p.h || 7) + (r() < .5 ? 1.4 : 0), wall = walls[Math.floor(r() * walls.length)];
    const hw = w / 2, hd = d / 2, rh = d * .42, o = .35, x0 = i * (w + (p.gap ?? .4)), hx = p.street === 'z' ? 0 : x0;
    const house = new THREE.Group(); house.position.set(p.street === 'z' ? 0 : x0, 0, p.street === 'z' ? x0 : 0);
    const add = (geo, mat, px, py, pz, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.x = rx; house.add(m); return m; };
    add(new THREE.BoxGeometry(w, h, d), M(wall, { r: .95 }), 0, h / 2, 0);                                      // body
    add(new THREE.BoxGeometry(w + .14, .45, d + .14), M(stone, { r: .9 }), 0, .22, 0);                           // plinth
    add(new THREE.BoxGeometry(w + .24, .27, d + .24), M(trim, { r: .8 }), 0, h - .38, 0);                        // cornice
    const roofLen = Math.hypot(hd + o, rh), ang = Math.atan2(rh, hd + o);                                        // gabled roof: two slabs
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(w + 2 * o, .14, roofLen), M(roofC, { r: .85 }), 0, h + rh / 2 + .05, s * (hd + o) / 2, s * ang);
    add(new THREE.BoxGeometry(.8, 1.8, .8), M('#8e7d6c', { r: .9 }), (hw * .45) * (i % 2 ? 1 : -1), h + rh * .6, -hd * .35);  // chimney
    const floors = Math.max(1, Math.floor(h / 2.8)), nW = Math.max(1, Math.floor(w / 2.2));
    for (const face of [1, -1]) for (let fl = 0; fl < floors; fl++) for (let k = 0; k < nW; k++) {
      const u = -hw + (k + .5) * (w / nW), y = fl * 2.8 + 1.6;
      if (fl === 0 && k === Math.floor(nW / 2) && face === 1) { // door with step and hood
        add(new THREE.BoxGeometry(1.1, 2.1, .1), M('#5a3d2b', { r: .8 }), 0, 1.05, face * (hd + .06));
        add(new THREE.BoxGeometry(1.5, .12, .5), M(stone, { r: .9 }), 0, .06, face * (hd + .3));
        add(new THREE.BoxGeometry(1.7, .1, .6), M(trim, { r: .8 }), 0, 2.4, face * (hd + .25)); continue; }
      add(new THREE.BoxGeometry(.4, 1.3, .08), M(shut, { r: .7 }), u - .75, y + .75, face * (hd + .05)); // shutters
      add(new THREE.BoxGeometry(.4, 1.3, .08), M(shut, { r: .7 }), u + .75, y + .75, face * (hd + .05));
      add(new THREE.BoxGeometry(.9, 1.3, .06), M(glass, { r: .25, m: .1 }), u, y + .75, face * (hd + .08));
      add(new THREE.BoxGeometry(1.5, .1, .14), M(trim, { r: .8 }), u, y - .05, face * (hd + .08));                   // sill
    }
    g.add(house);
  }
  return g;
}
export const ASSETS = { town, chicken, flock, post, beam, frame, roof, mesh_wall: meshWall, wall: wallSolid, perch, board, feeder, waterer,
  nest_box: nestBox, crops, tree, rock, water, house, person, animal: quadruped, crate, barrel, sign, arrow, heat, droppings: dirt, custom };

// ---------- plan instantiation ----------
function instantiate() {
  objects = []; impacts = [];
  const learned = plan.learnedAssets || {};
  for (const beat of plan.beats) for (const a of beat.add || []) {
    let type = a.type, params = { ...(a.params || {}) };
    if (!ASSETS[type] && learned[type]) { params = { ...learned[type], ...params }; type = 'custom'; }
    const fn = ASSETS[type] || ASSETS.crate;
    const o = fn({ seed: hash(a.id), ...params });
    const holder = new THREE.Group(); holder.add(o); holder.position.set(...(a.pos || [0, 0, 0])); holder.rotation.y = a.rotY || 0;
    if (a.scale) holder.scale.setScalar(a.scale);
    holder.visible = false; scene.add(holder);
    const ob = { id: a.id, tag: a.tag, spawn: beat.start + (a.delay || 0), anim: a.anim || 'drop', holder, inner: o, base: holder.scale.x, despawn: Infinity, modeTimeline: [], basePos: holder.position.clone() };
    objects.push(ob);
    if (ob.anim === 'drop' && a.dust !== false) { // dust puff + impact for camera shake / sfx
      const puff = makePuff(); puff.position.set(ob.basePos.x, .05, ob.basePos.z); puff.visible = false; scene.add(puff);
      ob.puff = puff; impacts.push(ob.spawn + IMPACT_T);
    }
  }
  for (const beat of plan.beats) {
    for (const id of beat.remove || []) objects.filter(o => o.id === id).forEach(o => o.despawn = Math.min(o.despawn, beat.start));
    for (const [id, mode] of Object.entries(beat.modes || {})) objects.filter(o => o.id === id).forEach(o => o.modeTimeline.push([beat.start, mode]));
  }
}
function updateObjects(t) {
  for (const o of objects) {
    const age = t - o.spawn, dAge = t - o.despawn;
    if (age < 0 || dAge > .5) { o.holder.visible = false; continue; }
    o.holder.visible = true; const inner = o.inner, d = .7;
    let s = 1, dy = 0;
    if (o.anim === 'drop') { dy = (1 - easeOutBack(age / d)) * 6; if (age < 0.05) dy = 6; }
    else if (o.anim === 'grow') s = easeOutBack(age / .6);
    else if (o.anim === 'rise') { s = 1; inner.scale.y = Math.max(.001, easeIO(age / .8)) * (inner.userData.sy ??= inner.scale.y); }
    else if (o.anim === 'fade' || o.anim === 'none') s = 1;
    if (dAge > 0) s *= 1 - easeIO(dAge / .5);
    o.holder.scale.setScalar(Math.max(.001, s * o.base)); inner.position.y = (inner.userData.y0 ??= inner.position.y) + dy;
    o.holder.position.y = o.basePos.y + (o.tag === 'hive' ? liftAt(t) : 0);
    if (o.puff) { const pa = age - IMPACT_T; o.puff.visible = pa > 0 && pa < .7; if (o.puff.visible) o.puff.userData.tick(pa); }
    let mode, prev, mstart = o.spawn; for (const [ts, m] of o.modeTimeline) if (t >= ts) { prev = mode; mode = m; mstart = ts; }
    inner.userData.mode = mode; inner.userData.prevMode = prev; inner.userData.modeAge = t - mstart;
    inner.traverse(c => c.userData.tick && c.userData.tick(t, age));
  }
}

// ---------- camera ----------
const PRESETS = { wide: [27, .5, .7], hero: [20, .3, .5], orbit: [21, .42, .25], close: [12, .26, .62], low: [10, .1, .35], top: [20, 1.2, .2], inside: [2.6, .22, .85], detail: [5, .24, .45] };
function camState(beat, t) {
  const c = beat.camera || {}; const pr = PRESETS[c.preset] || PRESETS.hero;
  const local = t - beat.start, dur = Math.max(.1, beat.end - beat.start);
  let dist = (c.dist ?? pr[0]) * (style.camScale || 1), elev = c.elev ?? pr[1], az = c.az ?? pr[2];
  const k = local / dur;
  if (c.preset === 'orbit') az += k * .9; else az += k * (c.spin ?? .12);
  const push = c.zoom === 'in' ? .32 : c.zoom === 'out' ? -.45 : (c.push ?? style.drift);
  dist *= 1 - easeIO(k) * push;
  if (c.punch !== false) dist *= 1 + .14 * Math.exp(-local * 9) * (local >= 0 ? 1 : 0); // quick punch-in at every cut
  return { dist, elev, az, target: new THREE.Vector3(...(c.target || [0, .8, 0])) };
}
function shakeAt(t) { let s = 0; for (const it of impacts) { const d = t - it; if (d >= 0 && d < .45) s = Math.max(s, (1 - d / .45) ** 2); } return s * (style.shake ?? .12); }
function updateCamera(t) {
  const beats = plan.beats; let i = beats.findIndex(b => t < b.end); if (i < 0) i = beats.length - 1;
  let cur = camState(beats[i], t);
  // 'fly' camera: one continuous move across a beat (dist/elev/az/target interpolated with easing), e.g. dive into a body
  const F = beats[i].camera?.fly;
  if (F) { const b = beats[i], u = easeIO(Math.min(1, Math.max(0, (t - b.start) / Math.max(.01, b.end - b.start))));
    const uu = Math.min(1, Math.max(0, (t - b.start) / Math.max(.01, b.end - b.start))); // constant speed
    const L = (q) => q[0] + (q[1] - q[0]) * uu;
    cur = { dist: L(F.dist), elev: L(F.elev), az: L(F.az), target: new THREE.Vector3(...F.target[0]).lerp(new THREE.Vector3(...F.target[1]), uu) }; }
  if (i > 0 && !F && (beats[i].camera?.cut !== true)) {
    const k = easeIO((t - beats[i].start) / style.camEase);
    if (k < 1) { const prev = camState(beats[i - 1], beats[i].start);
      cur = { dist: lerp(prev.dist, cur.dist, k), elev: lerp(prev.elev, cur.elev, k), az: lerp(prev.az, cur.az, k), target: prev.target.clone().lerp(cur.target, k) }; }
  }
  const { dist, elev, az, target } = cur;
  camera.position.set(target.x + Math.sin(az) * Math.cos(elev) * dist, target.y + Math.sin(elev) * dist, target.z + Math.cos(az) * Math.cos(elev) * dist);
  const sh = shakeAt(t) * dist * .05;
  if (sh) camera.position.add(new THREE.Vector3(Math.sin(t * 91) * sh, Math.sin(t * 73 + 1) * sh, Math.cos(t * 67) * sh));
  camera.lookAt(target);
  handheld(camera, t, style.handheld ?? 1); // v2: ~1 cm breathing of a hand-held camera, never a jump
  // lens per beat (camera.fov, optional camera.fovTo across the beat), blended over camEase like the rest of the camera
  { const fovOf = (b, tt) => { const c = b?.camera || {}, f0 = c.fov ?? plan.fov ?? 42; return c.fovTo == null ? f0 : lerp(f0, c.fovTo, easeIO((tt - b.start) / Math.max(.1, b.end - b.start))); };
    let fov = fovOf(beats[i], t); const kf = i > 0 ? easeIO((t - beats[i].start) / style.camEase) : 1; if (kf < 1) fov = lerp(fovOf(beats[i - 1], beats[i].start), fov, kf);
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); } }
  if (fgLayer) fgLayer.userData.update(t, i);
  return i;
}

// ---------- effects per beat ----------
function updateEffects(t, bi) {
  if (fx.clouds) fx.clouds.children.forEach((g, i) => { g.position.x = g.userData.x0 + Math.sin(t * .02 * g.userData.speed + i) * 3; });
  const fxs = new Set(plan.beats[bi].effects || []);
  const night = fxs.has('night') ? 1 : 0, hot = fxs.has('heat') ? 1 : 0;
  fx.nightK = lerp(fx.nightK ?? 0, night, .15); if (Math.abs(fx.nightK - night) < .02) fx.nightK = night;
  fx.nightK = night; // deterministic (no smoothing state across chunks)
  lights.sun.intensity = 2.6 * (1 - .45 * fx.nightK) * style.exposure;
  lights.hemi.intensity = (lights.hemiBase ?? 1.25) * (1 + .1 * fx.nightK) * style.exposure;
  lights.hemi.color.set(fx.nightK ? 0x6f86c9 : 0xcfe3ff);
  if (!TEX.sky && plan.env?.sky !== 'sky3d') { scene.background.set(fx.nightK ? '#24427a' : (plan.env?.bg || '#3d7fd0')); scene.fog.color.copy(scene.background); }
  else scene.backgroundIntensity = scene.environmentIntensity = (plan.env?.envLight ?? .9) * (1 - .6 * fx.nightK);
  lights.heat.intensity = hot ? 40 + Math.sin(t * 5) * 8 : 0;
  fx.rays.visible = !fx.nightK;
}

// ---------- captions & 2D compositing ----------
const isArabic = s => /[؀-ۿ]/.test(s);
function drawCaption(t) {
  const caps = plan.captions || []; const c = caps.find(w => t >= w.start && t < w.end); if (!c) return;
  const W = comp.width, H = comp.height, ar = isArabic(c.text);
  const txt = ar ? c.text : c.text.toUpperCase();
  const pop = easeOutBack(clamp((t - c.start) / .12)); const size = H * style.captionSize * (ar ? .9 : 1) * (.85 + .15 * pop);
  cctx.save(); cctx.translate(W / 2, H * style.captionY);
  cctx.font = ar ? `${size}px CapAr` : `italic 800 ${size}px Cap`;
  cctx.textAlign = 'center'; cctx.textBaseline = 'middle'; cctx.direction = ar ? 'rtl' : 'ltr';
  let fs = size; while (cctx.measureText(txt).width > W * .88 && fs > 10) { fs *= .92; cctx.font = ar ? `${fs}px CapAr` : `italic 800 ${fs}px Cap`; }
  cctx.shadowColor = 'rgba(0,0,0,.55)'; cctx.shadowBlur = size * .18; cctx.shadowOffsetY = size * .05;
  cctx.lineJoin = 'round'; cctx.lineWidth = size * .09; cctx.strokeStyle = '#141414'; cctx.strokeText(txt, 0, 0);
  cctx.shadowColor = 'transparent'; cctx.fillStyle = '#fff'; cctx.fillText(txt, 0, 0); cctx.restore();
}
function fadeAlpha(t) { let a = 0; for (const f of plan.fades || []) { const d = f.dur || .6, m = Math.abs(t - f.t); if (m < d / 2) a = Math.max(a, 1 - m / (d / 2)); }
  const D = plan.duration; a = Math.max(a, 1 - clamp(t / .25), clamp((t - (D - .3)) / .3)); return a; }

// ---------- public API ----------
window.setup = async (p, opts = {}) => {
  plan = p; Object.assign(style, p.style || {}, opts.style || {});
  R.W = opts.width || 540; R.H = opts.height || 960;
  renderer = new THREE.WebGLRenderer({ antialias: style.post === false, preserveDrawingBuffer: true }); // v2: the post chain has its own MSAA scene target
  renderer.setSize(R.W, R.H); renderer.setPixelRatio(1);
  renderer.localClippingEnabled = true; // cutaway: a glb with cutY is sliced open to show the organs inside
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05 * style.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  comp = document.createElement('canvas'); comp.width = R.W; comp.height = R.H; cctx = comp.getContext('2d');
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(p.fov || 42, R.W / R.H, .1, 1000);
  makeTextures();
  if (p.env?.soil) { const L = new THREE.TextureLoader(), rs = {}; for (const k of ['diff', 'nor', 'rough']) { try { const t = await L.loadAsync(`/assets/ph_tex/${p.env.soil}/${k}.jpg`);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(p.env.soilRepeat || 3, p.env.soilRepeat || 3); if (k === 'diff') t.colorSpace = THREE.SRGBColorSpace; rs[k] = t; } catch {} } if (rs.diff) TEX.realSoil = rs; }
  // stickers (3D emoji, assets/stickers/<name>.webp): preload every sticker the plan uses
  { const names = new Set(); for (const b of p.beats || []) for (const a of b.add || []) if (a.type === 'sticker') names.add(a.params?.name || 'arrow_right');
    TEX.stickers = {}; const L = new THREE.TextureLoader();
    await Promise.all([...names].map(async n => { try { const t = await L.loadAsync(`/assets/stickers/${n}.webp`); t.colorSpace = THREE.SRGBColorSpace; TEX.stickers[n] = t; } catch (e) { console.warn('sticker missing', n); } })); }
  // LOCKED (2026-11-14, user approved): the 3D sky is the default look. Name an HDRI in env.sky to use a photo sky; sky:false = blueprint room
  if (p.env?.sky === undefined) p.env = { ...(p.env || {}), sky: 'sky3d' };
  const skyName = (p.env?.sky === false || p.env?.sky === 'sky3d') ? null : (p.env?.sky || 'kloofendal_48d_partly_cloudy_puresky'); // LOCKED: realistic sky is the default; sky:false = old blueprint room
  if (skyName) try { const tex = await new RGBELoader().loadAsync(`/assets/hdri/${skyName}.hdr`); tex.mapping = THREE.EquirectangularReflectionMapping;
    TEX.sky = { tex, env: new THREE.PMREMGenerator(renderer).fromEquirectangular(tex).texture }; } catch (e) { console.warn('sky failed', e); }
  buildEnvironment(p.env || {}); await preloadGLB(p); instantiate(); fgLayer = style.foreground ? buildForeground() : null; if (fgLayer) scene.add(fgLayer);
  await buildRealism(p.env || {});
  await document.fonts.load('italic 800 40px Cap'); await document.fonts.load('40px CapAr');
  return { objects: objects.length, beats: p.beats.length };
};
window.renderAt = (t, q = .9) => {
  const bi = updateCamera(t); updateEffects(t, bi); updateObjects(t);
  realismTick(t, camera);
  if (postFx) postFx.render(scene, camera, t); else renderer.render(scene, camera);
  cctx.drawImage(renderer.domElement, 0, 0);
  drawOverlay(t, bi);
  const fa = fadeAlpha(t); if (fa > 0) { cctx.fillStyle = `rgba(0,0,0,${fa})`; cctx.fillRect(0, 0, comp.width, comp.height); }
  drawCaption(t);
  return comp.toDataURL('image/jpeg', q).slice(23);
};
// v2 realism layer (renderer/realism.js): on by default in the real-sky looks, every part has a plan knob
async function buildRealism(env) {
  resetRealism();
  const real = env.sky !== false && !!fx.water;
  if (real) {
    buildHorizon(scene, env, fx.water.position.y);
    // ground cover avoids flat props lying on the soil (water, boards, cracked mud...)
    const excl = []; const bb = new THREE.Box3(), sz = new THREE.Vector3();
    for (const o of objects) { bb.setFromObject(o.holder); if (bb.isEmpty()) continue; bb.getSize(sz);
      if (bb.max.y > -.05 && bb.min.y < .4 && sz.y < .5) excl.push([bb.min.x - .1, bb.max.x + .1, bb.min.z - .1, bb.max.z + .1]); }
    buildCover(scene, env, fx.island, excl, style.post === false ? 0 : (style.aa ?? (R.W >= 1000 ? 4 : 0)));
    upgradeWater(scene, fx.water, env, fx.island);
    buildMotes(scene, env);
    await buildBirds(scene, env);
  }
  if (style.aniso !== 0) sharpenTextures(scene, renderer, style.aniso);
  postFx = makePost(renderer, R.W, R.H, style);
}
window.__scene = () => scene; window.__plan = () => plan; window.__cam = () => camera; window.__link = () => LINK; // debug hook for review tools (bbox checks)
window.__ready = true;

// ================= v2: VFX, overlays, lift, bee-keeping asset pack =================
let impacts = [];
const IMPACT_T = .42; // seconds after spawn when a dropped object lands (matches easeOutBack drop)
function makePuff() {
  const g = new THREE.Group(), r = rng(5), parts = [];
  const mat = new THREE.MeshStandardMaterial({ color: col('#d9c3a0'), transparent: true, opacity: .8, roughness: 1, depthWrite: false });
  for (let i = 0; i < 16; i++) { const m = sph(.22 + r() * .2, mat.clone()); const a = i / 16 * 6.283 + r() * .3; parts.push({ m, a, sp: 1.6 + r() * 1.4, up: .4 + r() * .8 }); g.add(m); }
  g.userData.tick = (pa) => { const k = pa / .7; parts.forEach(p => { const d = easeOutBack(Math.min(1, k * 1.4)) * p.sp;
    p.m.position.set(Math.cos(p.a) * d * 1.3, p.up * k * 1.2, Math.sin(p.a) * d * 1.3); p.m.scale.setScalar(.6 + k * 1.4); p.m.material.opacity = .75 * (1 - k); }); };
  return g;
}
function liftAt(t) { let y = 0; for (const l of plan.lifts || []) { const k = easeOutBack(clamp((t - l.t) / (l.dur || .8))); y += l.dy * k; } return y; }

function drawIcon(kind, x, y, s, a) {
  cctx.save(); cctx.globalAlpha = a; cctx.translate(x, y); cctx.scale(s, s);
  cctx.shadowColor = 'rgba(0,0,0,.45)'; cctx.shadowBlur = 14; cctx.shadowOffsetY = 4;
  cctx.beginPath(); cctx.arc(0, 0, 46, 0, 7); cctx.fillStyle = kind === 'problem' ? '#e5392f' : '#2fb36b'; cctx.fill();
  cctx.shadowColor = 'transparent'; cctx.lineWidth = 7; cctx.strokeStyle = '#fff'; cctx.stroke();
  cctx.lineCap = 'round'; cctx.lineWidth = 13; cctx.beginPath();
  if (kind === 'problem') { cctx.moveTo(-17, -17); cctx.lineTo(17, 17); cctx.moveTo(17, -17); cctx.lineTo(-17, 17); }
  else { cctx.moveTo(-20, 1); cctx.lineTo(-6, 16); cctx.lineTo(21, -15); }
  cctx.stroke(); cctx.restore();
}
function drawOverlay(t, bi) {
  const b = plan.beats[bi], W = comp.width, H = comp.height, local = t - b.start;
  // vignette
  const g = cctx.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .45, H * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); cctx.fillStyle = g; cctx.fillRect(0, 0, W, H);
  if (b.kind === 'solution' && local < .22) { cctx.fillStyle = `rgba(255,255,255,${.4 * (1 - local / .22)})`; cctx.fillRect(0, 0, W, H); }
  if (b.kind === 'problem' && local < .5) { const k = 1 - local / .5; const r = cctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .7);
    r.addColorStop(0, 'rgba(229,57,47,0)'); r.addColorStop(1, `rgba(229,57,47,${.45 * k})`); cctx.fillStyle = r; cctx.fillRect(0, 0, W, H); }
  if ((b.kind === 'problem' || b.kind === 'solution') && b.icon !== false) {
    const pop = easeOutBack(clamp((local - .05) / .3)), out = clamp((b.end - t) / .15);
    drawIcon(b.kind, W * .84, H * .1 + Math.sin(t * 3) * 3, .9 * Math.max(.001, pop) * (W / 540), out);
  }
}

// ---------- bee-keeping pack ----------
TEX.cache = {};
function combTex(kind) { // hex cells: 'wax' | 'honey' | 'brood'
  if (TEX.cache[kind]) return TEX.cache[kind];
  const base = { wax: '#e8c46a', honey: '#e09a1c', brood: '#c9902e' }[kind];
  return TEX.cache[kind] = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const s = 16, r = rng(kind.length);
    for (let y = 0; y < h + s; y += s * 1.5) for (let x = 0; x < w + s; x += s * 1.732) for (const off of [0, 1]) {
      const cx = x + off * s * .866, cy = y + off * s * .75; g.beginPath();
      for (let k = 0; k <= 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; g.lineTo(cx + Math.cos(a) * s * .5, cy + Math.sin(a) * s * .5); }
      g.fillStyle = kind === 'honey' ? `rgba(255,${170 + r() * 50},40,${.5 + r() * .4})` : kind === 'brood' && r() > .5 ? '#f3e2b0' : 'rgba(150,100,20,.35)';
      g.fill(); g.strokeStyle = 'rgba(120,80,20,.9)'; g.lineWidth = 2; g.stroke(); }
  }, [3, 2]);
}
function hiveBox(p = {}) { // open-top box, front (+z) wall cut away to show inside, entrance slot on +x
  const g = new THREE.Group(), w = p.w || 3.4, d = p.d || 4.2, h = p.h || 2, t = .14, m = woodMat();
  if (p.color) m.color = col(p.color);
  const add = (bw, bh, bd, x, y, z) => { const b = box(bw, bh, bd, m); b.position.set(x, y, z); g.add(b); return b; };
  add(w, t, d, 0, t / 2, 0);                       // floor
  add(w, h, t, 0, h / 2, -d / 2 + t / 2);          // back
  add(t, h, d, -w / 2 + t / 2, h / 2, 0);          // left
  const cut = p.cutaway === false ? h : h * .38;
  add(w, cut, t, 0, cut / 2, d / 2 - t / 2);       // front (cut away)
  // right wall with entrance slot at the bottom
  add(t, h - .3, d, w / 2 - t / 2, .3 + (h - .3) / 2, 0); add(t, .3, d * .3, w / 2 - t / 2, .15, -d * .35); add(t, .3, d * .3, w / 2 - t / 2, .15, d * .35);
  if (p.entrance !== false) { const slot = box(.05, .22, d * .38, std('#140c06')); slot.position.set(w / 2 + .01, .14, 0); g.add(slot); }
  return shadowed(g);
}
function combFrame(p = {}) { // one frame hung along z: thickness x
  const g = new THREE.Group(), d = p.d || 3.9, h = p.h || 1.75, wm = woodMat();
  const top = box(.16, .1, d + .3, wm); top.position.y = h; g.add(top);
  for (const z of [-d / 2, d / 2]) { const s = box(.12, h, .08, wm); s.position.set(0, h / 2, z); g.add(s); }
  const bot = box(.12, .06, d, wm); bot.position.y = .05; g.add(bot);
  if (p.comb !== false) { const cm = new THREE.MeshStandardMaterial({ map: combTex(p.comb || 'wax'), roughness: .45, metalness: .05 });
    const c = box(.1, h - .14, d - .1, cm); c.position.y = h / 2; g.add(c); }
  return shadowed(g);
}
function frames(p = {}) { // set of frames; mode {spacing} animates the gap between them
  const g = new THREE.Group(), n = p.count || 8, list = [];
  for (let i = 0; i < n; i++) { const f = combFrame({ ...p }); g.add(f); list.push(f); }
  g.userData.tick = () => {
    const mo = g.userData.mode, pm = g.userData.prevMode, k = easeOutBack(clamp((g.userData.modeAge ?? 9) / .7));
    const sp = lerp(pm?.spacing ?? p.spacing ?? .34, mo?.spacing ?? p.spacing ?? .34, mo ? k : 1);
    list.forEach((f, i) => { f.position.x = (i - (n - 1) / 2) * sp; });
  };
  g.userData.tick();
  return g;
}
function waxMess(p = {}) { // irregular comb blobs glued everywhere
  const g = new THREE.Group(), r = rng(p.seed || 3), m = new THREE.MeshStandardMaterial({ map: combTex('wax'), roughness: .5 });
  for (let i = 0; i < (p.count || 14); i++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(.3 + r() * .45, 1), m);
    b.scale.set(.35 + r() * .5, 1 + r() * 1.2, .8 + r()); b.position.set((r() - .5) * (p.w || 2.8), .4 + r() * (p.h || 1.4), (r() - .5) * (p.d || 3.6)); b.rotation.set(r(), r() * 3, r()); g.add(b); }
  return shadowed(g);
}
function glue(p = {}) { // dark propolis bridges between frames
  const g = new THREE.Group(), r = rng(9), m = std('#5a3510', { r: .3, extra: { emissive: col('#1a0c00') } }), n = p.count || 7, sp = p.spacing || .34;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < 3; j++) { const b = sph(.13, m); b.scale.set(sp * 3.2, .5 + r() * .6, .8);
    b.position.set((i - (n - 2) / 2) * sp, (p.h || 1.75) * (.25 + r() * .8), (r() - .5) * 3.2); g.add(b); }
  g.userData.tick = (t, age) => g.children.forEach((c, i) => { c.scale.y = (.5 + (i % 3) * .2) * easeOutBack(clamp(age / .5 - i * .03)); });
  return g;
}
let BEE_TEX;
function beeMesh(queen) {
  BEE_TEX ??= canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#f2b51c'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1208'; for (let i = 0; i < 4; i++) g.fillRect(0, 8 + i * 15, w, 7); });
  const b = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), new THREE.MeshStandardMaterial({ map: BEE_TEX, roughness: .6 }));
  body.rotation.x = Math.PI / 2; body.scale.set(1, queen ? 2.5 : 1.7, 1); body.position.z = -.05; b.add(body);
  const head = sph(.07, std('#1b1208')); head.position.z = queen ? .2 : .14; b.add(head);
  const wm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false });
  const wings = [];
  for (const s of [-1, 1]) { const wg = new THREE.Mesh(new THREE.PlaneGeometry(.22, .1), wm); wg.position.set(s * .1, .08, 0); b.add(wg); wings.push([wg, s]); }
  if (queen) { const crown = new THREE.Mesh(new THREE.ConeGeometry(.06, .1, 5), std('#ffd23a', { m: .8, r: .2 })); crown.position.set(0, .1, .2); b.add(crown); }
  b.userData.flap = t => wings.forEach(([w, s]) => { w.rotation.z = s * (.3 + Math.sin(t * 70) * .6); });
  b.scale.setScalar(queen ? 2.6 : 1.5);
  return b;
}
function bees(p = {}) { // swarm; modes: {mode:'swarm',c,r,h} | {mode:'stream',from,to} | {mode:'pass',c} | {mode:'messy',c}
  const g = new THREE.Group(), n = p.count || 26, r = rng(p.seed || 12), list = [];
  for (let i = 0; i < n; i++) { const b = beeMesh(false); b.scale.setScalar(p.scale ?? 1); g.add(b); list.push({ b, ph: r() * 6.28, sp: .8 + r() * 1.2, rad: .4 + r(), hy: r() }); }
  const P = new THREE.Vector3();
  g.userData.tick = (t) => {
    const mo = g.userData.mode || p.init || { mode: 'swarm', c: [0, 2, 0], r: 2, h: 1 };
    if (g.parent) P.copy(g.parent.position);
    list.forEach((o, i) => {
      let x, y, z, nx, ny, nz; const tt = t + o.ph * 3;
      const at = (u) => {
        if (mo.mode === 'stream') { const f = ((u * o.sp * .35 + i / n) % 1); const A = mo.from, B = mo.to;
          return [lerp(A[0], B[0], f) + Math.sin(u * 3 + o.ph) * .4, lerp(A[1], B[1], f) + Math.sin(u * 2.3 + o.ph) * .3 + Math.sin(f * 3.14) * 1.5, lerp(A[2], B[2], f) + Math.cos(u * 2.7 + o.ph) * .4]; }
        const c = mo.c || [0, 2, 0], R = (mo.r || 2) * (.5 + o.rad * .5), a = u * o.sp * (mo.mode === 'messy' ? 1.8 : 1) + o.ph;
        return [c[0] + Math.sin(a) * R, c[1] + (mo.h || 1) * Math.sin(u * 1.3 + o.ph * 2) * o.hy, c[2] + Math.cos(a * 1.1) * R * (mo.flat || 1)];
      };
      [x, y, z] = at(tt); [nx, ny, nz] = at(tt + .05);
      o.b.position.set(x - P.x, y - P.y, z - P.z); o.b.lookAt(nx, ny, nz); o.b.userData.flap(t + o.ph);
    });
  };
  return g;
}
function queen(p = {}) { // modes: {mode:'walk',c} | {mode:'blocked',c,y} ; lays eggs handled by separate object
  const g = new THREE.Group(), b = beeMesh(true); g.add(b);
  g.userData.tick = (t) => { const mo = g.userData.mode || { mode: 'walk' }; b.userData.flap(t * .3);
    if (mo.mode === 'blocked') { const u = Math.abs(Math.sin(t * 4)); b.position.set(Math.sin(t * .9) * .8, u * .25, Math.cos(t * .7) * .6); b.rotation.set(-.3 - u * .4, t * .5, 0); }
    else { b.position.set(Math.sin(t * .8) * (mo.r ?? .9), 0, Math.cos(t * .6) * (mo.r ?? .9)); b.rotation.set(0, t * .8 + 1.57, 0); }
  };
  return g;
}
function excluder(p = {}) { // metal mesh plate the size of the box
  const w = p.w || 3.4, d = p.d || 4.2, t2 = TEX.wire.clone(); t2.needsUpdate = true; t2.repeat.set(w * 3, d * 3);
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t2, color: col('#d7dde3'), transparent: true, alphaTest: .12, side: THREE.DoubleSide, metalness: .8, roughness: .3 }));
  plate.rotation.x = -Math.PI / 2; plate.position.y = .04; g.add(plate);
  const rim = std('#9aa3ab', { m: .8, r: .3 });
  for (const [bw, bd, x, z] of [[w, .08, 0, -d / 2], [w, .08, 0, d / 2], [.08, d, -w / 2, 0], [.08, d, w / 2, 0]]) { const r = box(bw, .08, bd, rim); r.position.set(x, .04, z); g.add(r); }
  return shadowed(g);
}
function lid(p = {}) { const g = new THREE.Group(), w = (p.w || 3.4) + .3, d = (p.d || 4.2) + .3;
  const top = box(w, .18, d, woodMat()); top.position.y = .09; g.add(top);
  const tin = box(w + .1, .05, d + .1, std('#c9ccd0', { m: .7, r: .35 })); tin.position.y = .2; g.add(tin);
  if (p.vent) { const v = box(.9, .1, .35, std('#0e0905')); v.position.set(0, .24, d * .25); g.add(v);
    const hood = box(1.1, .08, .55, std('#b8bcc0', { m: .7, r: .3 })); hood.position.set(0, .5, d * .25); g.add(hood);
    for (const x of [-.5, .5]) { const l = box(.06, .26, .06, std('#888')); l.position.set(x, .36, d * .25); g.add(l); } }
  return shadowed(g); }
function stand(p = {}) { const g = new THREE.Group(), w = (p.w || 3.4), d = (p.d || 4.2), h = p.h || 1;
  for (const [x, z] of [[-w / 2 + .2, -d / 2 + .2], [w / 2 - .2, -d / 2 + .2], [-w / 2 + .2, d / 2 - .2], [w / 2 - .2, d / 2 - .2]]) { const l = box(.24, h, .24, woodMat()); l.position.set(x, h / 2, z); g.add(l); }
  for (const z of [-d / 2 + .2, d / 2 - .2]) { const b = box(w, .16, .2, woodMat()); b.position.set(0, h - .08, z); g.add(b); }
  return shadowed(g); }
function sun(p = {}) { const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(p.r || 1.4, 32, 20), new THREE.MeshBasicMaterial({ color: p.color || '#ffd54a', fog: false })); g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry((p.r || 1.4) * 1.7, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffb02e', transparent: true, opacity: .3, fog: false, depthWrite: false })); g.add(halo);
  g.userData.tick = (t, age) => { halo.scale.setScalar(1 + Math.sin(t * 4) * .08); if (p.rise) g.position.y = lerp(-p.rise, 0, easeIO(age / 1.6)); };
  return g; }
function drips(p = {}) { // melting wax running down
  const g = new THREE.Group(), r = rng(21), m = std('#f0c040', { r: .25, extra: { emissive: col('#4a2a00') } }), list = [];
  for (let i = 0; i < (p.count || 18); i++) { const d = sph(.09, m); const o = { d, x: (r() - .5) * (p.w || 2.6), z: (r() - .5) * (p.d || 3.6), y0: (p.h || 1.7) * (.6 + r() * .4), sp: .3 + r() * .5 }; g.add(d); list.push(o); }
  g.userData.tick = (t, age) => list.forEach(o => { const k = (age * o.sp) % 1.4; o.d.position.set(o.x, Math.max(.1, o.y0 - k * o.y0), o.z); o.d.scale.set(1, 1 + k * 3, 1); });
  return g; }
function eggs(p = {}) { const g = new THREE.Group(), r = rng(31), m = std('#fffaf0', { r: .3 });
  for (let i = 0; i < (p.count || 30); i++) { const e = sph(.05, m); e.scale.set(.6, 1.6, .6); e.position.set((r() - .5) * (p.w || 2.6), 0, (r() - .5) * (p.d || 3.4)); g.add(e); }
  g.userData.tick = (t, age) => g.children.forEach((c, i) => c.visible = age > i * .05);
  return g; }
Object.assign(ASSETS, { hive_box: hiveBox, frames, comb_frame: combFrame, wax_mess: waxMess, glue, bees, queen, excluder, lid, stand, sun, drips, eggs });

// ================= goat-farm pack =================
function goatMesh(seed) {
  const r = rng(seed), coat = ['#f2efe8', '#8a5a34', '#2b2622', '#d9c3a0'][seed % 4], g = new THREE.Group(), m = std(coat, { r: .95 });
  const body = sph(.5, m); body.scale.set(.75, .7, 1.25); body.position.y = 1; g.add(body);
  const neck = cyl(.16, .2, .6, m); neck.position.set(0, 1.35, .5); neck.rotation.x = -.5; g.add(neck);
  const head = new THREE.Group(); head.position.set(0, 1.65, .72); g.add(head);
  const skull = sph(.2, m); skull.scale.set(.85, .9, 1.4); head.add(skull);
  const snout = sph(.12, std(coat === '#2b2622' ? '#3a3330' : '#d8c8b8')); snout.position.set(0, -.08, .25); head.add(snout);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(.06, .25, 8), std('#e8e2d6')); beard.rotation.x = Math.PI; beard.position.set(0, -.25, .2); head.add(beard);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(.05, .35, 8), std('#6b5a48', { r: .6 })); horn.position.set(s * .09, .2, -.08); horn.rotation.set(-.7, 0, s * .2); head.add(horn);
    const ear = sph(.08, m); ear.scale.set(1.6, .5, .8); ear.position.set(s * .22, .05, -.05); ear.rotation.z = s * -.4; head.add(ear);
    const eye = sph(.03, std('#111', { r: .3 })); eye.position.set(s * .13, .06, .12); head.add(eye);
  }
  const legs = [];
  for (const [x, z] of [[-.22, -.45], [.22, -.45], [-.22, .45], [.22, .45]]) { const l = new THREE.Group(); l.position.set(x, .75, z); const leg = cyl(.06, .05, .75, std(coat)); leg.position.y = -.37; l.add(leg);
    const hoof = cyl(.06, .06, .08, std('#2a2420')); hoof.position.y = -.74; l.add(hoof); g.add(l); legs.push(l); }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.06, .22, 8), m); tail.position.set(0, 1.25, -.62); tail.rotation.x = -2.4; g.add(tail);
  g.scale.setScalar(.55); g.userData = { head, legs, tail };
  return shadowed(g);
}
function herd(p = {}) { // modes: {mode, at:[x,z], area:[w,d], ...}
  const g = new THREE.Group(), n = p.count || 3, list = [], rr = rng(p.seed || 5);
  for (let i = 0; i < n; i++) { const o = goatMesh(i); g.add(o); list.push({ o, ph: rr() * 6.3, ox: (rr() - .5), oz: (rr() - .5) }); }
  const rope = cyl(.025, .025, 1, std('#c9a36a')); rope.visible = false; g.add(rope);
  const P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  g.userData.tick = (t) => {
    const mo = g.userData.mode || p.init || { mode: 'pen', at: [0, 0], area: [4, 4] }, age = g.userData.modeAge ?? t;
    if (g.parent) P.copy(g.parent.position);
    const at = mo.at || [0, 0], area = mo.area || [3, 3]; rope.visible = false;
    list.forEach((b, i) => {
      const u = b.o.userData, tt = t * .45 + b.ph; let x = at[0] + b.ox * area[0] * .8 + Math.sin(tt) * .5, z = at[1] + b.oz * area[1] * .8 + Math.cos(tt * .8) * .5, y = 0, face = Math.atan2(Math.cos(tt), -Math.sin(tt * .8) * .8);
      let headX = Math.max(0, Math.sin(t * 3 + b.ph)) * .7, walk = 1;
      if (mo.mode === 'tied' || mo.mode === 'eat') { const tr = mo.tree; const d = mo.mode === 'eat' ? .9 : .9 + .5 * Math.abs(Math.sin(tt));
        x = tr[0] + Math.cos(i * 2.1 + tt * .3) * d; z = tr[1] + Math.sin(i * 2.1 + tt * .3) * d; face = Math.atan2(tr[0] - x, tr[1] - z); headX = mo.mode === 'eat' ? -.7 + Math.sin(t * 6 + i) * .15 : headX;
        if (i === 0) { rope.visible = true; const a = new THREE.Vector3(x - P.x, .75, z - P.z), c = new THREE.Vector3(tr[0] - P.x, .5, tr[1] - P.z); rope.position.copy(a).add(c).multiplyScalar(.5);
          rope.scale.set(1, a.distanceTo(c), 1); rope.quaternion.setFromUnitVectors(up, c.clone().sub(a).normalize()); } }
      if (mo.mode === 'jump' && i === 0) { const k = (age * .55) % 1, fx = mo.fence; x = lerp(fx[0] - 1.4, fx[0] + 1.4, k); z = fx[1]; y = Math.max(0, Math.sin(k * Math.PI)) * (mo.h || 1.6); face = Math.PI / 2; headX = -.3; }
      if (mo.mode === 'bump' && i === 0) { const k = (age * .7) % 1, fx = mo.fence; x = fx[0] - .9 + Math.sin(k * Math.PI) * .45; z = fx[1]; y = Math.sin(k * Math.PI) * .9; face = Math.PI / 2; headX = -.3; }
      if (mo.mode === 'shiver') { x = at[0] + (i - 1) * .55; z = at[1] + (i % 2) * .4; face = .4; headX = .5; walk = 0; b.o.position.x += 0; b.o.rotation.z = Math.sin(t * 40 + i) * .03; }
      if (mo.mode === 'still') { x = at[0] + (i - 1) * .7; z = at[1] + (i % 2) * .35; y = mo.y ?? 0; face = mo.face ?? .3; headX = .2; walk = 0; }
      if (mo.mode === 'trample') { x = at[0] + Math.sin(tt * 2.2) * .5 + (i - 1) * .4; z = at[1] + Math.cos(tt * 1.7) * .4; headX = .6; walk = 2.2; }
      if (mo.mode === 'feeder') { x = at[0] + (i - 1) * .55; z = at[1]; y = mo.y ?? 0; face = mo.face ?? Math.PI; headX = -.35 + Math.sin(t * 5 + i) * .08; walk = 0; }
      if (mo.mode === 'climb') { if (i === 0) { x = at[0]; z = at[1]; y = mo.h || .9; face = .6 + Math.sin(t * .6) * .3; headX = -.25; walk = 0; } else { x = at[0] + (i === 1 ? -1 : 1.1); z = at[1] + .8; } }
      b.o.position.set(x - P.x, y - P.y, z - P.z); b.o.rotation.y = face; u.head.rotation.x = headX;
      u.legs.forEach((l, k) => l.rotation.x = walk ? Math.sin(t * 7 * walk + k * Math.PI / (k > 1 ? 1 : 2)) * .35 : 0);
      u.tail.rotation.z = Math.sin(t * 9 + i) * .4;
    });
  };
  return g;
}
function fenceRing(p = {}) { // style 'rail' (low horizontal boards) or 'plank' (tall vertical boards)
  const g = new THREE.Group(), w = p.w || 8, d = p.d || 7, h = p.h || 1, wm = woodMat(), gap = p.gap ?? 1.2;
  const sides = [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]];
  for (const [cx, cz, len, ry] of sides) {
    const side = new THREE.Group(); side.position.set(cx, 0, cz); side.rotation.y = ry; g.add(side);
    const posts = Math.round(len / 1.6);
    for (let i = 0; i <= posts; i++) { const pst = box(.14, h + .15, .14, wm); pst.position.set(-len / 2 + i * len / posts, (h + .15) / 2, 0); side.add(pst); }
    if (p.style === 'plank') { for (let x = -len / 2; x < len / 2 - .05; x += .2) { if (p.door && ry === 0 && cz > 0 && Math.abs(x) < gap / 2) continue; const ph = (ry === 0 && cz > 0) ? h * .42 : h; const pl = box(.16, ph, .05, wm); pl.position.set(x + .1, ph / 2, .06); side.add(pl); } }
    else for (const y of [h * .35, h * .85]) { const rail = box(len, .12, .05, wm); rail.position.set(0, y, .06); side.add(rail); }
  }
  return shadowed(g);
}
function treeEat(p = {}) { // crown shrinks while the tree is being eaten (mode {eaten:true})
  const g = tree({ scale: p.scale || 1.3 }); const crowns = g.children.filter((c, i) => i > 0);
  g.userData.tick = () => { const mo = g.userData.mode; const k = mo?.eaten ? clamp((g.userData.modeAge || 0) / 1.3) : 0;
    crowns.forEach((c, i) => { const s = Math.max(.001, 1 - k); c.scale.setScalar(s); c.visible = s > .02; }); };
  return g;
}
function rain(p = {}) { const g = new THREE.Group(), r = rng(8), m = new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: .55 }), list = [];
  for (let i = 0; i < (p.count || 260); i++) { const d = box(.02, .45, .02, m); const o = { d, x: (r() - .5) * (p.w || 12), z: (r() - .5) * (p.d || 12), ph: r() }; g.add(d); list.push(o); }
  g.userData.tick = t => list.forEach(o => { const k = (t * 1.6 + o.ph) % 1; o.d.position.set(o.x, (p.h || 9) * (1 - k), o.z); }); return g; }
function shelter(p = {}) { const g = new THREE.Group(), w = p.w || 3.6, d = p.d || 2.6, h = p.h || 2.2, fl = p.floor ?? 0, wm = woodMat();
  if (fl) { const f = box(w, .12, d, wm); f.position.y = fl; g.add(f); for (const [x, z] of [[-w / 2 + .15, -d / 2 + .15], [w / 2 - .15, -d / 2 + .15], [-w / 2 + .15, d / 2 - .15], [w / 2 - .15, d / 2 - .15]]) { const l = box(.14, fl, .14, wm); l.position.set(x, fl / 2, z); g.add(l); } }
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const pst = box(.16, h + (z < 0 ? .4 : 0), .16, wm); pst.position.set(x, (h + (z < 0 ? .4 : 0)) / 2, z); g.add(pst); }
  const back = box(w, h, .1, wm); back.position.set(0, h / 2 + .1, -d / 2); g.add(back);
  const rf = roof({ w: w - .5, d: d - .3, h: h + .1, slope: .17, color: '#9a9ea3' }); g.add(rf);
  return shadowed(g); }
function hay(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 4), m = std(p.color || (p.dirty ? '#8a6a3a' : '#e3c35a'), { r: .9 });
  for (let i = 0; i < (p.count || 60); i++) { const s = cyl(.012, .012, .35, m, 5); s.position.set((r() - .5) * (p.w || 1.2), .04 + r() * (p.hgt || .15), (r() - .5) * (p.d || .8)); s.rotation.set(Math.PI / 2 + (r() - .5), r() * 3, r()); g.add(s); }
  if (p.dirty) for (let i = 0; i < 6; i++) { const mud = sph(.12, std('#4a3420')); mud.scale.y = .2; mud.position.set((r() - .5) * (p.w || 1.2), .02, (r() - .5) * (p.d || .8)); g.add(mud); }
  return g; }
function feederRack(p = {}) { const g = new THREE.Group(), w = p.w || 1.6, y = p.y ?? .75, wm = woodMat();
  const trough = box(w, .3, .45, wm); trough.position.y = y; g.add(trough);
  const h2 = hay({ w: w * .9, d: .35, count: 50, hgt: .2 }); h2.position.y = y + .12; g.add(h2);
  for (const x of [-w / 2 + .1, w / 2 - .1]) { const br = box(.08, .08, .5, wm); br.position.set(x, y - .1, -.2); g.add(br); }
  return shadowed(g); }
Object.assign(ASSETS, { herd, fence_ring: fenceRing, tree_eat: treeEat, rain, shelter, hay, feeder_rack: feederRack });

// ================= ant-colony pack (wordless) =================
const ANT_PATHS = [ // farm-local (x, y); farm spans x -3..3, y 0..4, sand top at y 3.8
  [[-2.4, 3.8], [-1.9, 3.1], [-1.8, 2.2], [-1.1, 1.6], [-.2, .9]],
  [[2.3, 3.8], [1.6, 2.9], [2, 2], [1.2, 1.4], [.2, .9]],
  [[-1.9, 3.1], [-.4, 2.7], [.6, 2.9], [1.6, 2.9]],
  [[-2.9, 3.85], [2.9, 3.85]],
];
const CHAMBERS = [[0, .8, .75, .38], [-1.8, 2.2, .45, .3], [2, 2, .45, .3]];
function polyPoint(pts, u) { // u in 0..1 ping-pong along polyline
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let s = (u % 2 < 1 ? u % 1 : 1 - u % 1) * tot, dir = u % 2 < 1 ? 1 : -1;
  for (let i = 0; i < L.length; i++) { if (s <= L[i] || i === L.length - 1) { const k = Math.min(1, s / L[i]), a = pts[i], b = pts[i + 1]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2((b[1] - a[1]) * dir, (b[0] - a[0]) * dir)]; } s -= L[i]; }
}
function antMesh(queen) {
  const g = new THREE.Group(), m = std(queen ? '#5a2a14' : '#2a1a10', { r: .45 }), s = queen ? 2.2 : 1;
  const parts = [[.09, -.16, 1.25], [.06, 0, 1], [.07, .13, 1]]; // abdomen, thorax, head (along x)
  parts.forEach(([r, x, sy]) => { const b = sph(r * s, m); b.position.x = x * s; b.scale.set(1.2, sy * .85, .85); g.add(b); });
  if (queen) { const ab = sph(.1 * s, m); ab.position.x = -.3 * s; ab.scale.set(1.6, .9, .9); g.add(ab); }
  const legs = [];
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { const l = cyl(.008 * s, .008 * s, .16 * s, std('#1a0f08')); l.position.set((i - 1) * .06 * s, -.04 * s, sd * .07 * s); l.rotation.x = sd * 1.1; g.add(l); legs.push([l, i, sd]); }
  for (const sd of [-1, 1]) { const a = cyl(.005 * s, .005 * s, .14 * s, std('#1a0f08')); a.position.set(.2 * s, .06 * s, sd * .04 * s); a.rotation.set(sd * .6, 0, -.9); g.add(a); }
  const glow = new THREE.Mesh(new THREE.RingGeometry(.12 * s, .16 * s, 32), new THREE.MeshBasicMaterial({ color: '#7fc8ff', transparent: true, opacity: 0, depthWrite: false })); glow.position.z = .12; g.add(glow);
  g.userData = { legs, glow, mats: [m] }; return g;
}
function antFarm(p = {}) { // glass formicarium with sand, tunnels and ants. modes: {mode:'work'|'naps'|'one'|'queen'|'around', rate}
  const g = new THREE.Group(), W = 6, Hh = 4, T = .5;
  const tex = canvasTex(768, 512, (c, w, h) => {
    const X = x => (x + 3) / 6 * w, Y = y => h - y / 4 * h;
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d9b278'); gr.addColorStop(1, '#a8794a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    noiseFill(c, w, h, 'rgba(0,0,0,0)', .3, 9000, 2); c.fillStyle = '#9fd0ff'; c.fillRect(0, 0, w, Y(3.95));
    c.strokeStyle = '#4a2f1a'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 26;
    for (const pth of ANT_PATHS.slice(0, 3)) { c.beginPath(); pth.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); }
    c.fillStyle = '#4a2f1a'; for (const [x, y, rx, ry] of CHAMBERS) { c.beginPath(); c.ellipse(X(x), Y(y), rx / 6 * w, ry / 4 * h, 0, 0, 7); c.fill(); }
  }); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1, 1);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })); sand.position.set(0, Hh / 2, -.05); g.add(sand);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W + .1, Hh + .1, T), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .05, transparent: true, opacity: .12, depthWrite: false })); glass.position.y = Hh / 2; g.add(glass);
  const frameM = woodMat(); for (const [w, h, x, y] of [[W + .4, .2, 0, 0], [W + .4, .15, 0, Hh + .05], [.2, Hh, -W / 2 - .1, Hh / 2], [.2, Hh, W / 2 + .1, Hh / 2]]) { const b = box(w, h, T + .1, frameM); b.position.set(x, y, 0); g.add(b); }
  const ants = [], n = p.count || 26, r = rng(13);
  for (let i = 0; i < n; i++) { const a = antMesh(false); g.add(a); ants.push({ a, path: i % 4, off: r() * 2, sp: .05 + r() * .05, napPh: r() * 50 }); }
  const queen = antMesh(true); queen.position.set(0, .82, .14); g.add(queen);
  g.userData.tick = (t) => {
    const mo = g.userData.mode || { mode: 'work' }, age = g.userData.modeAge ?? t;
    const qSleep = mo.mode === 'queen' || mo.mode === 'around'; queen.userData.glow.material.opacity = qSleep ? .55 + Math.sin(t * 2) * .2 : 0;
    queen.rotation.z = qSleep ? 0 : Math.sin(t * .8) * .2; queen.userData.legs.forEach(([l, i, sd]) => l.rotation.z = qSleep ? 0 : Math.sin(t * 9 + i) * .2);
    ants.forEach((o, i) => {
      let u = t * o.sp + o.off, x, y, ang, napping = false;
      if (mo.mode === 'naps' || mo.mode === 'one' || mo.mode === 'all') { const cyc = (t * (mo.rate || .35) + o.napPh) % 4; napping = mo.mode === 'one' ? i === 0 && (age % 3) > .6 : cyc < (mo.mode === 'all' ? 1.2 : .7); }
      if (mo.mode === 'one' && i === 0) { x = -1.8; y = 2.12; ang = 0; }
      else if (mo.mode === 'around' && i < 10) { const a = t * .7 + i * .63; x = Math.cos(a) * .95; y = .8 + Math.sin(a) * .45; ang = a + Math.PI / 2; }
      else { if (napping) u = Math.floor(t * 4) / 4 * o.sp + o.off - (age % 3) * o.sp; [x, y, ang] = polyPoint(ANT_PATHS[o.path], (napping ? (o.frozen ??= u) : (o.frozen = undefined, u)) * (o.path === 3 ? .5 : 1)); }
      o.a.position.set(x, y + .06, .14); o.a.rotation.z = ang; o.a.userData.glow.material.opacity = napping ? .7 + Math.sin(t * 4) * .2 : 0;
      o.a.userData.legs.forEach(([l, k]) => l.rotation.z = napping ? 0 : Math.sin(t * 22 + k * 2 + i) * .35);
    });
  };
  return shadowed(g);
}
function clock24(p = {}) { // wordless clock; hands spin fast; optional sector [fraction, color], dashed = split into chunks
  const g = new THREE.Group(), R = p.r || .9;
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 64), std('#f6f3ea', { r: .5 })); g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, .06, 12, 64), std('#d24a3c', { m: .3, r: .4 })); g.add(rim);
  for (let i = 0; i < 24; i++) { const tk = box(.03, i % 6 ? .08 : .16, .02, std('#333')); const a = i / 24 * Math.PI * 2; tk.position.set(Math.sin(a) * R * .85, Math.cos(a) * R * .85, .02); tk.rotation.z = -a; g.add(tk); }
  const hand = box(.05, R * .7, .03, std('#222')); hand.geometry.translate(0, R * .35, 0); hand.position.z = .05; g.add(hand);
  const sector = new THREE.Mesh(new THREE.RingGeometry(R * .2, R * .78, 64, 1, 0, .001), new THREE.MeshBasicMaterial({ color: p.color || '#5aa9ff', transparent: true, opacity: .75, side: THREE.DoubleSide })); sector.position.z = .03; g.add(sector);
  const legs = box(.08, 1.2, .08, woodMat()); legs.position.set(0, -R - .6, -.05); g.add(legs);
  g.position.y = R + 1.2;
  g.userData.tick = (t, age) => { const mo = g.userData.mode || {}; hand.rotation.z = -t * (mo.speed ?? 2.5);
    const f = mo.frac ? mo.frac * easeIO((g.userData.modeAge || 0) / 1.4) : 0; sector.visible = f > .001; sector.material.color.set(mo.color || p.color || '#5aa9ff');
    if (f > .001) { sector.geometry.dispose(); sector.geometry = new THREE.RingGeometry(R * .2, R * .78, 64, 1, Math.PI / 2 - f * Math.PI * 2, f * Math.PI * 2); } };
  return shadowed(g);
}
function filmCam(p = {}) { const g = new THREE.Group(), m = std('#2b2f36', { m: .4, r: .4 });
  const body = box(.7, .5, .5, m); body.position.y = 1.6; g.add(body);
  const lens = cyl(.16, .2, .4, std('#111', { m: .6, r: .2 })); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.6, .42); g.add(lens);
  const rec = sph(.05, std('#ff2a2a', { extra: { emissive: col('#ff2a2a') } })); rec.position.set(.25, 1.82, .2); g.add(rec);
  for (const a of [0, 2.1, 4.2]) { const l = cyl(.03, .03, 1.5, std('#444')); l.position.set(Math.sin(a) * .3, .7, Math.cos(a) * .3); l.rotation.set(Math.cos(a) * .2, 0, -Math.sin(a) * .2); g.add(l); }
  g.userData.tick = t => { rec.visible = Math.floor(t * 2) % 2 === 0; }; return shadowed(g); }
function sleeper(p = {}) { const g = new THREE.Group(); const bed = box(2.2, .4, 1.1, std('#7a8fb5')); bed.position.y = .3; g.add(bed);
  const pillow = box(.5, .15, .8, std('#f2f2f2')); pillow.position.set(-.8, .57, 0); g.add(pillow);
  const blanket = box(1.5, .14, 1.12, std('#3d5a99')); blanket.position.set(.25, .56, 0); g.add(blanket);
  const head = sph(.2, std('#e2b48c')); head.position.set(-.8, .78, 0); g.add(head);
  g.userData.tick = t => { blanket.scale.y = 1 + Math.sin(t * 1.5) * .12; }; return shadowed(g); }
Object.assign(ASSETS, { ant_farm: antFarm, clock24, film_cam: filmCam, sleeper });

// ================= ready-made 3D library (assets/lib, CC0 Quaternius packs; see assets/lib/catalog.json) =================
// usage in a plan: { id, type: 'glb', pos, params: { model: 'animals_pack/Cow', height: 1.2, clip: 'Eating', speed: 1, path: [[x,z],[x,z]], pathSpeed: .3 } }
// modes on the object may switch the clip: modes: { cow: { clip: 'Walk' } }
const GLB = {};
async function preloadGLB(p) {
  const names = new Set(); for (const b of p.beats || []) for (const a of b.add || []) { if (a.type === 'glb') names.add(a.params.model); if (a.params?.rider) names.add(a.params.rider); if (a.type === 'raker') names.add(a.params?.man || 'modular_men/Worker'); if (a.type === 'roof_person') names.add(a.params?.model || 'modular_men/Casual'); if (a.type === 'buffalo') names.add('animals_pack/Bull'); if (a.type === 'fellah') names.add('modular_men/Farmer'); }
  const l = new GLTFLoader();
  await Promise.all([...names].map(async n => { GLB[n] = await l.loadAsync(n.startsWith('ph/') ? `/assets/${n}/${n.slice(3)}.gltf` : n.startsWith('models/') ? `/assets/${n}.glb` : `/assets/lib/${n}.glb`); }));
  // 3D-sky (realistic) plans: smooth the low-poly animal meshes so facets do not show as flat triangles.
  // Vertices with the same position are welded and normals averaged; the silhouette stays the same.
  if (p.env?.sky === 'sky3d' && p.env?.smoothAnimals !== false) for (const n of names) if (n.startsWith('animals_pack/') && GLB[n]) GLB[n].scene.traverse(m => {
    if (!m.isMesh) return; let g = m.geometry; g.deleteAttribute('normal'); g = mergeVertices(g, 1e-3); g.computeVertexNormals(); m.geometry = g;
    for (const mt of [].concat(m.material)) { mt.flatShading = false; mt.roughness = .92; mt.metalness = 0; furShader(mt, m.geometry); mt.needsUpdate = true; } }); // hide and hair are matte, not plastic
}
// ---------- sugar-cane pack: field (green / burnt / cut), fire sweep, smoke column, juicy cut stalk, fleeing critters, truck ----------
function bladeTex(dry) { const k = dry ? 'bladeD' : 'blade'; if (SPR[k]) return SPR[k]; const c = document.createElement('canvas'); c.width = 32; c.height = 256; const g = c.getContext('2d'), r = rng(dry ? 7 : 4);
  const gr = g.createLinearGradient(0, 256, 0, 0); if (dry) { gr.addColorStop(0, '#9c7f4a'); gr.addColorStop(.6, '#cdb07a'); gr.addColorStop(1, '#e2cf9e'); } else { gr.addColorStop(0, '#3f6a26'); gr.addColorStop(.5, '#5f9435'); gr.addColorStop(1, '#8fb553'); }
  g.fillStyle = gr; g.beginPath(); g.moveTo(16, 0); g.quadraticCurveTo(31, 128, 28, 256); g.lineTo(4, 256); g.quadraticCurveTo(1, 128, 16, 0); g.fill();
  g.strokeStyle = dry ? 'rgba(240,225,190,.7)' : 'rgba(215,235,170,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, 6); g.lineTo(16, 256); g.stroke();
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${dry ? '90,60,30' : '30,60,20'},${.08 + r() * .12})`; g.fillRect(5 + r() * 22, r() * 256, 1, 8 + r() * 30); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return SPR[k] = t; }
function bladeGeo(len, wid, bend) { const geo = new THREE.PlaneGeometry(wid, len, 1, 8); geo.translate(0, len / 2, 0); const ps = geo.attributes.position;
  for (let i = 0; i < ps.count; i++) { const y = ps.getY(i) / len; ps.setZ(i, y * y * bend * len); } geo.computeVertexNormals(); return geo; }
function caneField(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 11), w = p.w || 7, d = p.d || 5, n = p.count || 140, burnt = !!p.burnt;
  const stalkM = std(burnt ? '#2b211c' : '#9a8f3c', { r: .7 }), nodeM = std(burnt ? '#14100d' : '#6f5a2a'), leafM = std('#ffffff', { r: .7, extra: { map: bladeTex(false), alphaTest: .5, side: THREE.DoubleSide } }), dryM = std('#ffffff', { r: .95, extra: { map: bladeTex(true), alphaTest: .5, side: THREE.DoubleSide } });
  const leafG = [bladeGeo(1.3, .1, .55), bladeGeo(1.1, .09, .8), bladeGeo(.9, .08, 1)], dryG = [bladeGeo(.9, .09, .9), bladeGeo(.7, .08, 1.2)];
  const sway = [];
  for (let i = 0; i < n; i++) { const s = new THREE.Group(), h = (p.h || 2.6) * (.75 + r() * .4), x = (r() - .5) * w, z = (r() - .5) * d;
    const st = cyl(.035, .045, h, stalkM, 7); st.position.y = h / 2; s.add(st);
    for (let k = .35; k < h; k += .38 + r() * .1) { const nd = cyl(.05, .05, .04, nodeM, 7); nd.position.y = k; s.add(nd); }
    if (!burnt && p.leaves !== false) for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(leafG[k % 3], leafM); lf.position.y = h - .05 - k * .16; lf.rotation.set(.25 + r() * .45, r() * 6.3, 0, 'YXZ'); s.add(lf); }
    if (!burnt && p.dry !== false) for (let k = 0; k < 3; k++) { const lf = new THREE.Mesh(dryG[k % 2], dryM); lf.position.y = .3 + r() * h * .55; lf.rotation.set(1.6 + r() * .7, r() * 6.3, 0, 'YXZ'); s.add(lf); }
    if (p.cut) { s.scale.y = .001; }
    s.position.set(x, 0, z); s.rotation.y = r() * 6.3; g.add(s); sway.push([s, r() * 6]); }
  g.userData.tick = (t, age) => sway.forEach(([s, ph]) => { s.rotation.z = Math.sin(t * 1.3 + ph) * (burnt ? .01 : .035); });
  return shadowed(g); }
const SPR = {};
function puffTex() { if (SPR.puff) return SPR.puff; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = rng(21);
  for (let i = 0; i < 26; i++) { const x = 64 + (r() - .5) * 60, y = 64 + (r() - .5) * 60, rad = 16 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(255,255,255,${.22 + r() * .2})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const m = g.createRadialGradient(64, 64, 20, 64, 64, 64); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = m; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return SPR.puff = t; }
function flameTex() { if (SPR.flame) return SPR.flame; const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 100, 2, 32, 84, 60); gr.addColorStop(0, 'rgba(255,214,120,.9)'); gr.addColorStop(.25, 'rgba(255,150,40,.85)'); gr.addColorStop(.6, 'rgba(230,70,10,.6)'); gr.addColorStop(1, 'rgba(150,20,0,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.bezierCurveTo(60, 50, 64, 110, 32, 126); g.bezierCurveTo(0, 110, 4, 50, 32, 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return SPR.flame = t; }
function fire(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 5), w = p.w || 7, d = p.d || 5, n = p.count || 70, dur = p.sweep || 3;
  const fl = []; for (let i = 0; i < n * 2; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const x = (r() - .5) * w, z = (r() - .5) * d; m.position.set(x, 0, z); g.add(m); fl.push({ m, x, ph: r() * 6, hh: (p.h || 1.6) * (.45 + r() * .8), ww: .35 + r() * .35 }); }
  const em = []; for (let i = 0; i < n; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#ffb347', map: puffTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    g.add(m); em.push({ m, x: (r() - .5) * w, z: (r() - .5) * d, ph: r(), sp: .6 + r() * .8 }); }
  const glow = new THREE.PointLight('#ff7a2a', 0, 16, 1.4); glow.position.y = 1.2; g.add(glow);
  g.userData.tick = (t, age) => { const front = -w / 2 + (w + 2) * Math.min(1, age / dur); let on = 0;
    const kOf = x => { const a = front - x; return a < 0 ? 0 : a < 1.5 ? 1 : Math.max(0, 1 - (a - 1.5) / (p.trail || 3)); };
    fl.forEach(f => { const k = kOf(f.x), fl2 = 1 + Math.sin(t * 11 + f.ph) * .22 + Math.sin(t * 23 + f.ph * 3) * .1, h = Math.max(.001, k * f.hh * fl2);
      f.m.scale.set(Math.max(.001, k * f.ww), h, 1); f.m.position.y = h * .42; f.m.material.opacity = Math.min(p.opacity ?? .8, k); on += k; });
    em.forEach(e => { const k = kOf(e.x), u = (t * .5 * e.sp + e.ph) % 1; e.m.position.set(e.x + Math.sin(t * 3 + e.ph * 9) * .2, .3 + u * 3, e.z); e.m.scale.setScalar(.05 + .05 * (1 - u)); e.m.material.opacity = k * (1 - u); });
    glow.intensity = Math.min(14, on * .2); glow.position.x = Math.min(front, w / 2) - .8; };
  return g; }
function smoke(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 3), n = p.count || 70, H = p.h || 9, dark = col(p.color || '#1c1a19'), light = col(p.top || '#6d6763');
  const puffs = []; for (let i = 0; i < n; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: dark.clone(), transparent: true, depthWrite: false }));
    m.material.rotation = r() * 6.3; g.add(m); puffs.push({ m, ph: i / n, ox: (r() - .5) * (p.w || 2), oz: (r() - .5) * (p.w || 2), sp: .8 + r() * .4, rs: (r() - .5) * .4 }); }
  g.userData.tick = (t, age) => { const grow = Math.min(1, age / 1.2);
    puffs.forEach(o => { const k = (t * .1 * o.sp + o.ph) % 1; const s = (1.2 + k * 5.5) * (p.scale || 1);
      o.m.position.set(o.ox * (1 + k * 1.5) + k * k * (p.drift ?? 2.5), .6 + k * H * grow, o.oz * (1 + k));
      o.m.scale.setScalar(Math.max(.001, s * grow)); o.m.material.rotation += 0; o.m.material.rotation = o.rs * t + o.ph * 6;
      o.m.material.color.copy(dark).lerp(light, k * .8); o.m.material.opacity = (p.opacity ?? .9) * Math.min(1, k * 5) * (1 - k * k); }); };
  return g; }
function caneCut(p = {}) { const g = new THREE.Group(), h = p.h || 3, R = p.r || .45, burnt = !!p.burnt;
  const skin = std(burnt ? '#231a15' : '#a39a42', { r: burnt ? 1 : .55 }), node = std(burnt ? '#0f0b09' : '#7a6230');
  const st = cyl(R, R * 1.05, h, skin, 32); st.position.y = h / 2; g.add(st);
  for (let k = .55; k < h - .2; k += .8) { const nd = cyl(R * 1.08, R * 1.08, .09, node, 32); nd.position.y = k; g.add(nd); }
  const core = cyl(R * .93, R * .93, .02, std('#f1ecc8', { r: .25 }), 32); core.position.y = h + .005; g.add(core);
  const fib = std('#e3dca8', { r: .3 }); for (let i = 0; i < 26; i++) { const a = i * 2.4, rr = Math.sqrt(i / 26) * R * .85; const f = sph(.03, fib); f.scale.y = .3; f.position.set(Math.cos(a) * rr, h + .02, Math.sin(a) * rr); g.add(f); }
  const dm = new THREE.MeshStandardMaterial({ color: col('#7cc8ff'), roughness: .05, metalness: .1, transparent: true, opacity: .85 }), drops = [];
  for (let i = 0; i < (p.drops ?? 7); i++) { const d = sph(.07, dm); d.scale.y = 1.4; g.add(d); drops.push({ d, a: i * .9, ph: i / 7 }); }
  g.userData.tick = (t) => drops.forEach(o => { const k = (t * .7 + o.ph) % 1; o.d.position.set(Math.cos(o.a) * R * 1.02, h - k * h * .9, Math.sin(o.a) * R * 1.02); o.d.scale.setScalar(Math.max(.001, Math.min(1, k * 8))); });
  return shadowed(g); }
function critters(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 9), list = [];
  const ratM = std('#6d625a'), snakeM = std('#5b5a2a', { r: .5 });
  for (let i = 0; i < (p.rats ?? 5); i++) { const b = new THREE.Group(); const bd = sph(.12, ratM); bd.scale.set(.8, .7, 1.4); bd.position.y = .1; b.add(bd);
    const hd = sph(.07, ratM); hd.position.set(0, .12, .17); b.add(hd); const tl = cyl(.012, .006, .3, ratM, 5); tl.rotation.x = 1.3; tl.position.set(0, .07, -.27); b.add(tl);
    g.add(b); list.push({ o: b, rat: true, x: (r() - .5) * (p.w || 5), z: (r() - .5) * (p.d || 3), dir: r() * 6.3, sp: 1.5 + r() }); }
  for (let i = 0; i < (p.snakes ?? 2); i++) { const b = new THREE.Group(), seg = []; for (let k = 0; k < 14; k++) { const s = sph(.055 - k * .002, snakeM); s.scale.y = .7; b.add(s); seg.push(s); }
    g.add(b); list.push({ o: b, seg, x: (r() - .5) * (p.w || 5), z: (r() - .5) * (p.d || 3), dir: r() * 6.3, sp: .9 }); }
  g.userData.tick = (t, age) => { const run = p.flee ? Math.max(0, age - .2) : 0;
    list.forEach(c => { const dx = Math.sin(c.dir), dz = Math.cos(c.dir); const dist = run * c.sp; c.o.position.set(c.x + dx * dist, 0, c.z + dz * dist); c.o.rotation.y = c.dir;
      if (c.rat) c.o.position.y = Math.abs(Math.sin(t * (p.flee ? 16 : 3) + c.x)) * (p.flee ? .06 : .01);
      else c.seg.forEach((s, k) => s.position.set(Math.sin(t * 6 - k * .6) * .07, .04, -k * .07)); }); };
  return shadowed(g); }
function truck(p = {}) { const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.scale.setScalar(p.scale ?? 1.7); // real size: ~2.5 m tall cane truck
  const paint = std(p.color || '#2f6fb3', { r: .45, m: .2 }), dark = std('#1c1d20', { r: .6 }), glass = std('#9fd3ff', { r: .1, m: .3 });
  const cab = box(1.1, 1.0, 1.2, paint); cab.position.set(0, .95, 1.55); body.add(cab); const win = box(1.02, .4, .02, glass); win.position.set(0, 1.18, 2.16); body.add(win);
  const bed = box(1.3, .12, 2.6, dark); bed.position.set(0, .55, -.3); body.add(bed);
  for (const [x, z, w2, d2] of [[-.63, -.3, .04, 2.6], [.63, -.3, .04, 2.6], [0, -1.58, 1.3, .04]]) { const s = box(w2, .55, d2, std('#7a5a3a')); s.position.set(x, .87, z); body.add(s); }
  if (p.load !== false) { const lm = std('#8f7f3a'); for (let i = 0; i < 40; i++) { const c = cyl(.035, .035, 2.4, lm, 6); c.rotation.x = Math.PI / 2; c.position.set(-.55 + (i % 10) * .12, .68 + Math.floor(i / 10) * .07, -.3); body.add(c); } }
  for (const [x, z] of [[-.62, 1.4], [.62, 1.4], [-.62, -.9], [.62, -.9]]) { const wh = cyl(.3, .3, .18, dark, 18); wh.rotation.z = Math.PI / 2; wh.position.set(x, .3, z); body.add(wh); }
  const P = p.path; g.userData.tick = (t, age) => { if (!P) return; const k = easeIO(Math.min(1, age / (p.travel || 3))); body.position.set(lerp(P[0][0], P[1][0], k), Math.abs(Math.sin(t * 9)) * .02, lerp(P[0][1], P[1][1], k)); body.rotation.y = Math.atan2(P[1][0] - P[0][0], P[1][1] - P[0][1]); };
  return shadowed(g); }
Object.assign(ASSETS, { cane_field: caneField, fire, smoke, cane_cut: caneCut, critters, truck });
// ---------- charcoal pack: kiln mound (logs + straw/mud cover with cutaway, vents, inner glow, charring), log pile, ash ----------
function canvasT(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; }
function barkTex() { return SPR.bark ||= canvasT(64, 256, (g, w, h) => { const r = rng(31); g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${30 + r() * 40},${20 + r() * 25},${10 + r() * 15},${.35 + r() * .4})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 20 + r() * 80); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(170,140,100,${.15 + r() * .2})`; g.fillRect(r() * w, r() * h, 1, 10 + r() * 40); } }); }
function ringTex() { return SPR.ring ||= canvasT(128, 128, (g) => { g.fillStyle = '#d9b483'; g.fillRect(0, 0, 128, 128);
  for (let k = 6; k < 64; k += 4 + (k % 3)) { g.strokeStyle = `rgba(140,95,50,${.35 + (k % 5) * .06})`; g.lineWidth = 1.5; g.beginPath(); g.arc(64 + Math.sin(k) * 2, 64, k, 0, 7); g.stroke(); }
  g.strokeStyle = '#5a3d22'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 61, 0, 7); g.stroke(); }); }
function crackTex() { return SPR.crack ||= canvasT(64, 256, (g, w, h) => { const r = rng(17); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff7a20'; g.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - .5) * 14; y += r() * 18; g.lineTo(x, y); } g.stroke(); } }); }
function mudTex() { return SPR.mud ||= canvasT(256, 256, (g, w, h) => { const r = rng(41); g.fillStyle = '#7d5b3c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const v = r(); g.fillStyle = v < .5 ? `rgba(60,40,25,${.15 + r() * .25})` : `rgba(160,125,85,${.12 + r() * .2})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 5, 0, 7); g.fill(); }
  for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${200 + r() * 40},${170 + r() * 40},${90 + r() * 40},${.35 + r() * .35})`; g.lineWidth = 1 + r(); const x = r() * w, y = r() * h, a = r() * 6.3, L = 8 + r() * 22; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } }, [3, 2]); }
function logMats() { const side = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: .95, emissiveMap: crackTex(), emissive: col('#ff6a1a'), emissiveIntensity: 0 });
  const end = new THREE.MeshStandardMaterial({ map: ringTex(), roughness: .9, emissive: col('#ff5a10'), emissiveIntensity: 0 }); return [side, end, end]; }
function charMats(mats, char, glow) { const k = clamp(char); mats[0].color.setRGB(1 - k * .9, 1 - k * .91, 1 - k * .92); mats[1].color.setRGB(1 - k * .88, 1 - k * .9, 1 - k * .9);
  mats[0].emissiveIntensity = glow * (.3 + k * 1.6); mats[1].emissiveIntensity = glow * k * .6; }
function kiln(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 13), R = p.r || 1.8, H = p.h || 1.6, mats = logMats(), logs = [];
  for (let rr = .18; rr < R - .05; rr += .19) { const n = Math.max(3, Math.round(6.283 * rr / .19)); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + r() * .2, hh = Math.max(.25, H * Math.sqrt(Math.max(0, 1 - (rr / R) ** 2)) * (.92 + r() * .1)), rad = .065 + r() * .035;
    const L = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.05, hh, 9), mats); L.position.set(Math.cos(a) * rr, hh / 2, Math.sin(a) * rr); L.rotation.set(Math.sin(a) * -.12 * rr / R, r() * 6, Math.cos(a) * .12 * rr / R);
    g.add(L); logs.push(L); } }
  logs.sort((a, b) => Math.hypot(a.position.x, a.position.z) - Math.hypot(b.position.x, b.position.z));
  const cut = p.cut ?? 1.15; // cutaway wedge (radians) facing +z so the inside stays visible
  const shellM = new THREE.MeshStandardMaterial({ map: mudTex(), roughness: 1, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R + .18, 48, 20, Math.PI / 2 + cut / 2, Math.PI * 2 - cut, 0, Math.PI / 2), shellM); shell.scale.y = (H + .2) / (R + .18); g.add(shell);
  const rimM = std('#5c412a'); const rim = new THREE.Mesh(new THREE.TorusGeometry(R + .18, .09, 8, 48, Math.PI * 2 - cut), rimM); rim.rotation.set(Math.PI / 2, 0, Math.PI / 2 + cut / 2); rim.position.y = .05; g.add(rim);
  const vents = [], ventG = new THREE.CircleGeometry(.17, 18); for (let i = 0; i < (p.ventCount || 7); i++) { const a = Math.PI / 2 + cut / 2 + .35 + i / (p.ventCount || 7) * (Math.PI * 2 - cut - .7);
    const v = new THREE.Mesh(ventG, new THREE.MeshBasicMaterial({ color: col('#ff8a2a') })); v.position.set(-Math.cos(a) * (R + .21), .22, Math.sin(a) * (R + .21)); v.lookAt(-Math.cos(a) * 9, .22, Math.sin(a) * 9); g.add(v); vents.push(v); }
  const light = new THREE.PointLight('#ff7a2a', 0, 7, 1.5); light.position.set(0, .7, 0); g.add(light);
  const base = { build: 0, cover: 0, vents: 0, glow: 0, char: 0 }; const val = (k, mo, pm, a) => { const to = mo?.[k] ?? p[k] ?? base[k], from = pm?.[k] ?? p[k] ?? base[k]; return lerp(from, to, easeIO(clamp(a / (mo?.dur ?? 1.4)))); };
  g.userData.tick = (t, age) => { const mo = g.userData.mode, pm = g.userData.prevMode, a = g.userData.modeAge ?? age;
    const build = p.buildTime ? clamp(age / p.buildTime) : 1, cover = val('cover', mo, pm, a), vt = val('vents', mo, pm, a), glow = val('glow', mo, pm, a), ch = val('char', mo, pm, a);
    logs.forEach((L, i) => { const k = clamp(build * logs.length * 1.15 - i * 1.0); L.scale.set(1, Math.max(.001, easeIO(k)), 1); L.visible = k > 0; });
    shell.visible = rim.visible = cover > .01; shell.scale.set(Math.max(.001, cover), Math.max(.001, cover) * (H + .2) / (R + .18), Math.max(.001, cover)); rim.scale.setScalar(Math.max(.001, Math.min(1, cover * 1.5)));
    const fl = .85 + Math.sin(t * 7) * .1 + Math.sin(t * 17) * .05; vents.forEach((v, i) => { v.visible = cover > .9 && vt > .02; v.scale.setScalar(Math.max(.001, vt)); v.material.color.setRGB(1 * glow * fl + .05, .5 * glow * fl + .03, .15 * glow + .02); });
    charMats(mats, ch, glow * fl); light.intensity = glow * 6 * fl; };
  return shadowed(g); }
function logPile(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 23), w = p.w || 2, rows = p.rows || 6, len = p.len || 1.2, rad = p.rad || .09, mats = logMats();
  charMats(mats, p.char || 0, 0); if (p.char) { mats[0].roughness = .55; mats[0].metalness = .15; }
  const per = Math.floor(w / (rad * 2.05));
  for (let row = 0; row < rows; row++) { const n = per - row; for (let i = 0; i < n; i++) { const L = new THREE.Mesh(new THREE.CylinderGeometry(rad * (.85 + r() * .3), rad, len * (.9 + r() * .2), 9), mats);
    L.rotation.x = Math.PI / 2; L.rotation.y = (r() - .5) * .1; L.position.set(-w / 2 + rad + row * rad + i * rad * 2.05, rad + row * rad * 1.75, (r() - .5) * .1); g.add(L); } }
  return shadowed(g); }
function ash(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 29); const m = std('#9a9792', { r: 1 }), m2 = std('#6f6b66', { r: 1 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(p.r || .7, 24, 12, 0, 6.283, 0, Math.PI / 2), m); mound.scale.y = .35; g.add(mound);
  for (let i = 0; i < 40; i++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(.03 + r() * .05), r() < .5 ? m2 : m); const a = r() * 6.3, d = r() * (p.r || .7); c.position.set(Math.cos(a) * d, .02 + (1 - d / (p.r || .7)) * .2, Math.sin(a) * d); g.add(c); }
  return shadowed(g); }
Object.assign(ASSETS, { kiln, log_pile: logPile, ash });
// ---------- legumes pack: wheat field (gold/green/sick), faba bean field, roots with nodules (soil cutaway), nitrogen particles, soil glow, giant split nodule ----------
function headTex() { return SPR.head ||= canvasT(64, 128, (g, w, h) => { g.fillStyle = '#c9a24e'; g.fillRect(0, 0, w, h); const r = rng(5);
  for (let y = 0; y < h; y += 9) for (let x = (y / 9) % 2 ? 0 : 8; x < w; x += 16) { const gr = g.createRadialGradient(x + 8, y + 4, 1, x + 8, y + 4, 9); gr.addColorStop(0, '#f0d488'); gr.addColorStop(1, 'rgba(120,85,30,.9)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x + 8, y + 4, 7, 5, 0, 0, 7); g.fill(); } }); }
function wheatField(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 19), w = p.w || 6, d = p.d || 3, n = p.count || 260, st = p.state || 'gold';
  const C = { gold: ['#c9a548', '#d8b45a', '#ffffff'], green: ['#5f8f35', '#6f9e3c', '#b8d27a'], sick: ['#c8be6a', '#d6cf86', '#e3dca0'] }[st];
  const stalkM = std(C[0], { r: .7 }), leafM = std(st === 'gold' ? '#c7a85c' : C[1], { r: .8, extra: { map: bladeTex(st === 'gold'), alphaTest: .5, side: THREE.DoubleSide } });
  const headM = std(C[2], { r: .6, extra: { map: headTex() } }); if (st !== 'gold') headM.color.set(st === 'green' ? '#9cc25a' : '#e8e0a8');
  const awnM = new THREE.LineBasicMaterial({ color: st === 'green' ? '#b7d47c' : '#e8d39a' }), sway = [], H = (p.h || 1) * (st === 'sick' ? .6 : 1);
  const leafG = bladeGeo(.45, .035, 1.1);
  for (let i = 0; i < n; i++) { const s = new THREE.Group(), h = H * (.85 + r() * .25), bend = st === 'sick' ? .5 : .12;
    const stalk = cyl(.007, .01, h, stalkM, 5); stalk.position.y = h / 2; s.add(stalk);
    const head = new THREE.Mesh(new THREE.CapsuleGeometry(.018, .08, 3, 6), headM); head.position.y = h + .05; head.rotation.z = bend; s.add(head);
    if (st !== 'sick') { const pts = []; for (let k = 0; k < 8; k++) { const y = h + .01 + k * .012; pts.push(new THREE.Vector3(0, y, 0), new THREE.Vector3((r() - .5) * .05, y + .1 + r() * .05, (r() - .5) * .05)); } s.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), awnM)); }
    for (let k = 0; k < 2; k++) { const lf = new THREE.Mesh(leafG, leafM); lf.position.y = h * (.3 + k * .25); lf.rotation.set(st === 'sick' ? 1.5 : .7, r() * 6.3, 0, 'YXZ'); s.add(lf); }
    s.position.set((r() - .5) * w, 0, (r() - .5) * d); s.rotation.y = r() * 6.3; if (st === 'sick') s.rotation.z = (r() - .5) * .5; g.add(s); sway.push([s, r() * 6, s.rotation.z]); }
  g.userData.tick = t => sway.forEach(([s, ph, z0]) => { s.rotation.x = Math.sin(t * 1.6 + ph + s.position.x * .5) * .05; });
  return shadowed(g); }
function leafletTex() { return SPR.leaflet ||= canvasT(64, 96, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#5b7f45'); gr.addColorStop(.5, '#7d9d62'); gr.addColorStop(1, '#5b7f45');
  g.fillStyle = gr; g.beginPath(); g.ellipse(32, 48, 28, 46, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(200,220,170,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 4); g.lineTo(32, 94); g.stroke();
  g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(32, 18 + k * 12); g.lineTo(10, 10 + k * 12); g.moveTo(32, 18 + k * 12); g.lineTo(54, 10 + k * 12); g.stroke(); } }); }
function flowerTex() { return SPR.flower ||= canvasT(32, 32, g => { g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(16, 14, 11, 13, 0, 0, 7); g.fill(); g.fillStyle = '#1e1a22'; g.beginPath(); g.ellipse(16, 20, 5, 4, 0, 0, 7); g.fill(); }); }
function beanField(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 27), w = p.w || 6, d = p.d || 3, n = p.count || 70, H = p.h || .9;
  const stemM = std('#6e8f4f', { r: .7 }), leafM = std('#ffffff', { r: .75, extra: { map: leafletTex(), alphaTest: .5, side: THREE.DoubleSide } }), podM = std('#5f8a3c', { r: .5 });
  const flM = new THREE.SpriteMaterial({ map: flowerTex(), transparent: true }), leafG = new THREE.PlaneGeometry(.07, .1); leafG.translate(0, .05, 0); const sway = [];
  const pos = p.rows ? Array.from({ length: n }, (_, i) => [(-w / 2) + (i % Math.ceil(n / p.rows)) * w / Math.ceil(n / p.rows) + (r() - .5) * .08, -d / 2 + Math.floor(i / Math.ceil(n / p.rows)) * d / Math.max(1, p.rows - 1)]) : Array.from({ length: n }, () => [(r() - .5) * w, (r() - .5) * d]);
  for (const [x, z] of pos) { const s = new THREE.Group(), h = H * (.8 + r() * .35); const stem = box(.018, h, .018, stemM); stem.position.y = h / 2; s.add(stem);
    for (let k = 0; k < 7; k++) { const y = h * (.22 + k * .11), a = k * 2.4 + r(); for (let j = 0; j < 3; j++) { const lf = new THREE.Mesh(leafG, leafM); lf.position.set(0, y, 0); lf.rotation.set(.9 + r() * .4, a + (j - 1) * .5, 0, 'YXZ'); lf.scale.setScalar(.9 + r() * .4); s.add(lf); } }
    for (let k = 0; k < 3; k++) { const f = new THREE.Sprite(flM); f.scale.setScalar(.035); f.position.set((r() - .5) * .05, h * (.55 + k * .12), (r() - .5) * .05); s.add(f); }
    for (let k = 0; k < 2; k++) { const pod = new THREE.Mesh(new THREE.CapsuleGeometry(.014, .09, 3, 6), podM); pod.position.set(.03, h * (.3 + k * .1), 0); pod.rotation.z = .5; s.add(pod); }
    s.position.set(x, 0, z); s.rotation.y = r() * 6.3; g.add(s); sway.push([s, r() * 6]); }
  g.userData.tick = t => sway.forEach(([s, ph]) => { s.rotation.x = Math.sin(t * 1.4 + ph) * .04; });
  return shadowed(g); }
function roots(p = {}) { // drawn on the island's front cross-section (z = p.face), one root system per x in p.xs
  const g = new THREE.Group(), r = rng(p.seed || 37), depth = p.depth || 1, rootM = std(p.color || '#dccaa2', { r: .8 }), nodM = std('#e9c3b0', { r: .45, extra: { emissive: col('#ff6f91'), emissiveIntensity: 0 } }), nods = [], tubes = [];
  for (const x0 of p.xs || [0]) { const branch = (pt, dir, len, rad, lvl) => { const pts = [pt.clone()]; let q = pt.clone(), dv = dir.clone(); for (let k = 0; k < 6; k++) { dv.x += (r() - .5) * .5; dv.y -= .15; dv.normalize(); q = q.clone().add(dv.clone().multiplyScalar(len / 6)); q.z = Math.min(q.z, .06); pts.push(q); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, rad, 5), rootM); g.add(tube); tubes.push(tube);
      if (p.nodules && lvl < 2) for (let k = 0; k < 5 - lvl * 2; k++) { const c = pts[1 + Math.floor(r() * 4)]; const nd = sph(.022 + r() * .018, nodM); nd.position.set(c.x + (r() - .5) * .04, c.y + (r() - .5) * .04, .05); g.add(nd); nods.push(nd); }
      if (lvl < 2) for (let k = 0; k < 3; k++) branch(pts[2 + k], new THREE.Vector3((r() - .5) * 2, -.6, 0), len * .55, rad * .6, lvl + 1); };
    branch(new THREE.Vector3(x0, 0, .03), new THREE.Vector3(0, -1, 0), depth, .012, 0); }
  g.userData.tick = (t, age) => { const grow = clamp(age / (p.growTime || 1.6)); tubes.forEach((tb, i) => { tb.scale.setScalar(Math.max(.001, easeIO(clamp(grow * 1.6 - (i % 7) * .08)))); });
    const mo = g.userData.mode || {}; const gl = (mo.glow ?? p.glow ?? 0) * (.75 + Math.sin(t * 5) * .25); nodM.emissiveIntensity = gl;
    nods.forEach((n, i) => n.scale.setScalar(Math.max(.001, easeOutBack(clamp(grow * 1.8 - .6 - i * .01))))); };
  return shadowed(g); }
function n2(p = {}) { // nitrogen molecules (wordless twin spheres): float in the air, stream down into the soil, or rise out of it into the crop
  const g = new THREE.Group(), r = rng(p.seed || 43), n = p.count || 60, w = p.w || 8, d = p.d || 4, hgt = p.h || 4, m = std(p.color || '#7fc4ff', { r: .3, extra: { emissive: col(p.color || '#7fc4ff'), emissiveIntensity: .5 } }), list = [];
  for (let i = 0; i < n; i++) { const mol = new THREE.Group(); const a = sph(.045, m), b = sph(.045, m); a.position.x = -.035; b.position.x = .035; mol.add(a, b); g.add(mol);
    list.push({ mol, h: new THREE.Vector3((r() - .5) * w, .4 + r() * hgt, (r() - .5) * d), tgt: new THREE.Vector3((r() - .5) * (p.tw || w), -.15 - r() * (p.tdepth || .6), p.tz ?? d / 2), ph: r() * 6, delay: r() * 1.6, rs: (r() - .5) * 2 }); }
  g.userData.tick = (t, age) => { const mo = g.userData.mode || { mode: p.mode || 'float' }, ma = g.userData.modeAge ?? age;
    list.forEach(o => { let pos = o.h.clone().add(new THREE.Vector3(Math.sin(t * .6 + o.ph) * .25, Math.sin(t * .9 + o.ph) * .15, Math.cos(t * .5 + o.ph) * .2)), s = 1;
      if (mo.mode === 'bounce') { pos.y = Math.max(.35, pos.y - .4) + Math.abs(Math.sin(t * 2 + o.ph)) * .3; }
      if (mo.mode === 'stream') { const k = clamp((ma - o.delay) / 1.6); pos = pos.lerp(o.tgt, easeIO(k)); s = k > .95 ? Math.max(.001, (1 - k) * 20) : 1; }
      if (mo.mode === 'rise') { const k = ((t * .4 + o.ph) % 1); pos = o.tgt.clone().lerp(new THREE.Vector3(o.tgt.x, (p.riseTo || .9), o.tgt.z - .4 - (o.ph % 1) * 1.5), k); s = Math.sin(k * Math.PI); }
      o.mol.position.copy(pos); o.mol.rotation.set(t * o.rs, t * o.rs * .7, 0); o.mol.scale.setScalar(Math.max(.001, s)); }); };
  return g; }
function soilGlow(p = {}) { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: col(p.color || '#7dff6a'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(p.w || 6, p.d || 4), m); top.rotation.x = -Math.PI / 2; top.position.y = .03; g.add(top);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(p.w || 6, p.fd || .9), m); face.position.set(0, -(p.fd || .9) / 2, (p.d || 4) / 2 + .02); g.add(face);
  g.userData.tick = (t, age) => { m.opacity = clamp(age / 1.2) * (.18 + Math.sin(t * 3) * .05); }; return g; }
function noduleCut(p = {}) { const g = new THREE.Group(), R = p.r || .45, r = rng(53);
  const skin = std('#d9b9a0', { r: .7 }), inner = new THREE.MeshStandardMaterial({ color: col('#e46e8c'), roughness: .35, emissive: col('#ff4f7a'), emissiveIntensity: .25 });
  const halves = []; for (const sgn of [-1, 1]) { const h = new THREE.Group(); const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20, 0, Math.PI), skin); shell.rotation.y = sgn > 0 ? -Math.PI / 2 : Math.PI / 2; h.add(shell);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R * .97, 32), inner); face.rotation.y = sgn > 0 ? -Math.PI / 2 : Math.PI / 2; face.position.x = sgn * .002; h.add(face);
    const bm = std('#7a2a40', { r: .4 }); for (let i = 0; i < 40; i++) { const a = r() * 6.3, d = Math.sqrt(r()) * R * .85; const b = new THREE.Mesh(new THREE.CapsuleGeometry(.008, .03, 2, 5), bm); b.position.set(sgn * .006, Math.sin(a) * d, Math.cos(a) * d); b.rotation.x = r() * 3; h.add(b); }
    g.add(h); halves.push([h, sgn]); }
  g.userData.tick = (t, age) => { const k = easeIO(clamp((age - .5) / 1.2)); halves.forEach(([h, s]) => { h.position.x = s * k * R * .7; h.rotation.y = s * k * 1.2; }); g.position.y = Math.sin(t * 1.5) * .05; };
  return shadowed(g); }
Object.assign(ASSETS, { wheat_field: wheatField, bean_field: beanField, roots, n2, soil_glow: soilGlow, nodule_cut: noduleCut });
// ---------- cranberry pack: bog (dense low vines, reflective tea-brown water that floods, thousands of glossy berries that sit, float, get corralled by a boom), reel harvester, x-ray cut berry, bouncing berry ----------
const ease01 = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
function bog(p = {}) { // stages via modes: {stage:'dry'|'flood'|'float'|'corral', frac}
  const g = new THREE.Group(), r = rng(p.seed || 11), W = p.w || 7, D = p.d || 4.6, L = p.level ?? .3, N = p.count || 3200, V = p.vines || 7000;
  // sandy dike around the bog
  const sand = std('#b9a27a', { r: .95 });
  for (const [x, z, w, d] of [[0, -D / 2 - .25, W + 1, .5], [0, D / 2 + .25, W + 1, .5], [-W / 2 - .25, 0, .5, D], [W / 2 + .25, 0, .5, D]]) { const b = box(w, .2, d, sand); b.position.set(x, .1, z); g.add(b); }
  // dense low vines: short leafy tufts, green with red-bronze tips
  const leafGeo = new THREE.ConeGeometry(.035, .16, 5); leafGeo.translate(0, .08, 0);
  const vineMat = new THREE.MeshStandardMaterial({ roughness: .7 });
  const chunks = [];
  for (let c = 0; c < 4; c++) { const im = new THREE.InstancedMesh(leafGeo, vineMat, V / 4), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), cc = new THREE.Color();
    for (let i = 0; i < V / 4; i++) { e.set((r() - .5) * .9, r() * 6.3, (r() - .5) * .9); q.setFromEuler(e); const s = .6 + r() * .9; sc.set(s, s * (.7 + r() * .6), s);
      ps.set((r() - .5) * W, 0, (c - 1.5) * D / 4 + (r() - .5) * D / 4); m4.compose(ps, q, sc); im.setMatrixAt(i, m4);
      const k = r(); cc.set(k < .55 ? '#2f5a26' : k < .8 ? '#3e6b2c' : k < .93 ? '#6b4a22' : '#7a2a22'); cc.offsetHSL(0, 0, (r() - .5) * .06); im.setColorAt(i, cc); }
    im.receiveShadow = true; g.add(im); chunks.push(im); }
  // berries
  const bGeo = new THREE.SphereGeometry(.034, 10, 8), bMat = new THREE.MeshStandardMaterial({ roughness: .28, metalness: .05 });
  const B = new THREE.InstancedMesh(bGeo, bMat, N); B.castShadow = true; g.add(B);
  const pal = ['#9e0f1e', '#b3162a', '#c41e3a', '#7a0c18', '#a8142a', '#d84a5a', '#e7a1a4'], cc = new THREE.Color();
  const home = [], ph = [];
  for (let i = 0; i < N; i++) { home.push([(r() - .5) * (W - .2), .05 + r() * .09, (r() - .5) * (D - .2)]); ph.push(r() * 6.3);
    const k = r(); cc.set(pal[k < .3 ? 0 : k < .55 ? 1 : k < .75 ? 2 : k < .87 ? 3 : k < .95 ? 4 : k < .985 ? 5 : 6]); B.setColorAt(i, cc); }
  const cx = (p.corral || [W * .25, D * .2])[0], cz = (p.corral || [W * .25, D * .2])[1], sp = .055, GA = 2.39996;
  const packed = i => { const rr = Math.sqrt(i + .5) * sp * .56, a = i * GA; return [cx + Math.cos(a) * rr * 1.25, cz + Math.sin(a) * rr * .9]; };
  const Rb = Math.sqrt(N) * sp * .56;
  // boom: floating yellow arc around the corralled berries
  const boom = new THREE.Mesh(new THREE.TorusGeometry(1, .045, 8, 64, Math.PI * 1.35), std('#e6b422', { r: .5 }));
  boom.rotation.x = -Math.PI / 2; boom.rotation.z = Math.PI * .85; boom.scale.set(Rb * 1.3, Rb * .95, 1); boom.position.set(cx, L, cz); g.add(boom);
  // water: rippling, reflective tea-brown surface
  const wg = new THREE.PlaneGeometry(W + .02, D + .02, 48, 32); wg.rotateX(-Math.PI / 2);
  const wm = new THREE.MeshPhysicalMaterial({ color: col('#5b4a2e'), roughness: .06, metalness: .1, transparent: true, opacity: .6, clearcoat: 1, clearcoatRoughness: .05 });
  const water = new THREE.Mesh(wg, wm); water.receiveShadow = true; g.add(water); const wp = wg.attributes.position, wy = Float32Array.from({ length: wp.count }, (_, i) => wp.getY(i));
  const stageLevel = s => (s === 'dry' ? 0 : L);
  const posFor = (s, frac, i, t) => { const h = home[i];
    if (s === 'dry' || s === 'flood' || (s === 'float' && i / N >= frac)) return [h[0], h[1], h[2]];
    const bob = Math.sin(t * 1.4 + ph[i]) * .006;
    if (s === 'corral') { const [x, z] = packed(i); return [x, L + .012 + bob + ((i * 7) % 3) * .012, z]; }
    return [h[0] + Math.sin(t * .3 + ph[i]) * .03, L + .012 + bob, h[2] + Math.cos(t * .27 + ph[i]) * .03]; };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  g.userData.tick = t => {
    const md = g.userData.mode || {}, pm = g.userData.prevMode || {}, cur = md.stage || p.stage || 'dry', prv = pm.stage || (g.userData.mode ? (p.stage || 'dry') : cur);
    const age = g.userData.modeAge ?? 99, k = ease01(age / (md.dur || 2.4)), cf = md.frac ?? 1, pf = pm.frac ?? 1;
    const lvl = stageLevel(prv) + (stageLevel(cur) - stageLevel(prv)) * ease01(age / 2.2);
    water.visible = lvl > .01; water.position.y = Math.max(.01, lvl);
    for (let i = 0; i < wp.count; i++) { const x = wp.getX(i), z = wp.getZ(i); wp.setY(i, wy[i] + Math.sin(x * 3.1 + t * 1.7) * .006 + Math.sin(z * 4.3 - t * 1.3) * .005); } wp.needsUpdate = true; wg.computeVertexNormals();
    for (let i = 0; i < N; i++) { const a = posFor(prv, pf, i, t), b = posFor(cur, cf, i, t), ki = ease01(k * 1.6 - (i % 97) / 97 * .6);
      v.set(a[0] + (b[0] - a[0]) * ki, a[1] + (b[1] - a[1]) * ki, a[2] + (b[2] - a[2]) * ki); m4.compose(v, q, one); B.setMatrixAt(i, m4); }
    B.instanceMatrix.needsUpdate = true;
    const bk = cur === 'corral' ? k : prv === 'corral' ? 1 - k : 0; boom.visible = bk > .02; boom.position.y = lvl + .01; boom.scale.set(Rb * 1.3 * (1.6 - .6 * bk), Rb * .95 * (1.6 - .6 * bk), 1);
    chunks.forEach((c, j) => { c.rotation.z = Math.sin(t * 1.1 + j) * .012; c.rotation.x = Math.cos(t * .9 + j * 2) * .01; });
  };
  return g; }
function reelHarvester(p = {}) { // walk-behind "eggbeater" water-reel harvester: red frame, two wheels, spinning reel of tines that churns the vines
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.scale.setScalar(p.scale ?? 1);
  const red = std(p.color || '#b8322a', { r: .45, m: .3 }), dark = std('#262626', { r: .6 }), steel = std('#9aa0a6', { r: .3, m: .8 });
  const frame = box(1.1, .32, .7, red); frame.position.set(0, .78, 0); body.add(frame);
  const eng = box(.45, .35, .4, dark); eng.position.set(0, 1.1, -.05); body.add(eng);
  for (const x of [-.62, .62]) { const w = cyl(.38, .38, .14, dark, 20); w.rotation.z = Math.PI / 2; w.position.set(x, .38, -.1); body.add(w); }
  for (const x of [-.35, .35]) { const h = cyl(.025, .025, 1.3, steel); h.rotation.x = -1.0; h.position.set(x, 1.15, -.75); body.add(h); }
  const grip = cyl(.03, .03, .8, dark); grip.rotation.z = Math.PI / 2; grip.position.set(0, 1.7, -1.32); body.add(grip);
  const reel = new THREE.Group(); reel.position.set(0, .32, .55); body.add(reel);
  const axle = cyl(.05, .05, 1.1, steel); axle.rotation.z = Math.PI / 2; reel.add(axle);
  for (let s = 0; s < 6; s++) for (let j = 0; j < 5; j++) { const tine = cyl(.012, .012, .5, steel, 6); const a = s / 6 * Math.PI * 2 + j * .2;
    tine.position.set(-.44 + j * .22, Math.cos(a) * .25, Math.sin(a) * .25); tine.rotation.x = a; reel.add(tine); }
  const [x0, z0] = (p.path || [[-2, 0], [2, 0]])[0], [x1, z1] = (p.path || [[-2, 0], [2, 0]])[1], T = p.travel || 8;
  g.userData.tick = (t, age) => { reel.rotation.x = -t * 5; const u = (Math.sin(((age || 0) / T) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    g.position.set(x0 + (x1 - x0) * u, Math.sin(t * 9) * .008, z0 + (z1 - z0) * u); g.rotation.y = Math.atan2(x1 - x0, z1 - z0) + (Math.cos(((age || 0) / T) * Math.PI * 2 - Math.PI / 2) < 0 ? Math.PI : 0); };
  return shadowed(g); }
function berryCut(p = {}) { // x-ray: a giant cranberry cut in half, showing four hollow air chambers and seeds
  const g = new THREE.Group(), R = p.r || .55, inner = new THREE.Group(); g.add(inner); inner.position.y = R + (p.lift ?? .2);
  const skin = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28, 0, Math.PI), std('#a3122a', { r: .3, extra: { side: THREE.DoubleSide } })); inner.add(skin);
  const tex = canvasTex(512, 512, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, w * .1, w / 2, h / 2, w / 2);
      gr.addColorStop(0, '#f4dcd2'); gr.addColorStop(.78, '#ecc2b8'); gr.addColorStop(.9, '#c43a4a'); gr.addColorStop(1, '#7d0c1c'); c.fillStyle = gr; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .3; c.save(); c.translate(w / 2 + Math.cos(a) * w * .2, h / 2 + Math.sin(a) * h * .2); c.rotate(a);
        c.fillStyle = '#5a1a20'; c.beginPath(); c.ellipse(0, 0, w * .13, h * .075, 0, 0, 7); c.fill(); c.fillStyle = '#2a0b0e'; c.beginPath(); c.ellipse(0, 0, w * .1, h * .05, 0, 0, 7); c.fill();
        c.fillStyle = '#f2e6c8'; for (let s = 0; s < 3; s++) { c.beginPath(); c.ellipse(-w * .07 + s * w * .05, h * .04, w * .012, h * .02, 0, 0, 7); c.fill(); } c.restore(); } });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.repeat.set(1, 1);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R * .995, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: .6 })); face.rotation.y = -Math.PI / 2; inner.add(face);
  inner.rotation.y = Math.PI / 2 + .5;
  g.userData.tick = t => { inner.rotation.y = Math.PI / 2 + .5 + Math.sin(t * .6) * .35; inner.position.y = R + (p.lift ?? .2) + Math.sin(t * 1.3) * .03; };
  return shadowed(g); }
function berryBounce(p = {}) { // a fresh cranberry bouncing on a wooden board, with squash & stretch and a contact shadow
  const g = new THREE.Group(), R = p.r || .2, H = p.h || 1.1, P = p.period || .85;
  const board = box(1.6, .08, 1, woodMat()); board.position.y = .04; g.add(board);
  const berry = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), std('#b3162a', { r: .25, m: .05 })); g.add(berry);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(R, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .085; g.add(sh);
  g.userData.tick = t => { const u = (t / P) % 1, y = 4 * H * u * (1 - u), c = Math.min(u, 1 - u);
    const sq = c < .06 ? 1 - (1 - c / .06) * .28 : 1 + Math.min(.12, (y / H) * .12 * (c < .3 ? 1 : 0));
    berry.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); berry.position.y = .08 + R * sq + y;
    const f = 1 - y / (H * 1.4); sh.scale.setScalar(Math.max(.3, f)); sh.material.opacity = .35 * f; };
  return shadowed(g); }
Object.assign(ASSETS, { bog, reel_harvester: reelHarvester, berry_cut: berryCut, berry_bounce: berryBounce });
// sticker: a 3D emoji (arrow, pointing hand, circle, face...) that always faces the camera and points at things.
// params: name (assets/stickers), size (m), rot (radians, turns arrows), bob (m), pulse. It pops in with squash & stretch.
ASSETS.sticker = (p = {}) => {
  const tex = TEX.stickers?.[p.name || 'arrow_right']; const g = new THREE.Group();
  const mat = new THREE.SpriteMaterial({ map: tex || null, color: tex ? 0xffffff : 0xff00ff, rotation: p.rot || 0, depthTest: p.onTop ? false : true, toneMapped: false, fog: false });
  const sp = new THREE.Sprite(mat), S = p.size || .5; sp.scale.set(S, S, 1); if (p.onTop) sp.renderOrder = 999; g.add(sp);
  g.userData.tick = (t, age) => { const a = Math.max(0, age ?? 0), pop = a < .45 ? 1 + Math.sin(a / .45 * Math.PI) * .25 : 1; // overshoot on arrival
    const sq = a < .45 ? 1 - Math.sin(a / .45 * Math.PI) * .12 : 1, pulse = p.pulse ? 1 + Math.sin(t * 5) * .06 : 1;
    sp.scale.set(S * pop * pulse, S * sq * pulse, 1); sp.position.y = Math.sin(t * 3 + (p.phase || 0)) * (p.bob ?? .04);
    if (p.nudge) { const d = Math.sin(t * 6) * .05; sp.position.x = Math.cos(p.rot || 0) * d; sp.position.z = 0; } };
  return g;
};
ASSETS.glb = (p = {}) => {
  const g = GLB[p.model]; if (!g) return box(.5, .5, .5, std('#f0f'));
  const o = skClone(g.scene); o.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(o, true), s = (p.height || 1) / Math.max(.001, bb.max.y - bb.min.y);
  o.scale.setScalar(s); o.position.y = -bb.min.y * s; o.position.x = -(bb.min.x + bb.max.x) / 2 * s; o.position.z = -(bb.min.z + bb.max.z) / 2 * s;
  const w = new THREE.Group(); w.add(o); shadowed(o); o.traverse(m => { if (m.isMesh) m.frustumCulled = false; });
  // lying on its side (an animal resting): tip the whole body 90 degrees around its length axis, lifted by half its width
  if (p.lie) { const bw = new THREE.Box3().setFromObject(o, true); o.rotation.z = (p.lie === -1 ? -1 : 1) * Math.PI / 2; o.position.y += (bw.max.x - bw.min.x) / 2; }
  // x-ray / medical look: a see-through body. Materials are cloned so other copies of the same model stay opaque.
  // anatomy window (medical-diagram look, like an opened cow model): the skin inside the world-space box
  // cutBox = [x0, x1, y0, y1, z0, z1] is removed, so organs placed inside the body show through a window in the side.
  // Materials are cloned so other copies of the same model stay whole; DoubleSide shows the inner skin at the cut edge.
  if (p.cutBox) { const [x0, x1, y0, y1, z0, z1] = p.cutBox, V = (a, b, c) => new THREE.Vector3(a, b, c);
    const planes = o.userData.cutPlanes = [new THREE.Plane(V(-1, 0, 0), x0), new THREE.Plane(V(1, 0, 0), -x1), new THREE.Plane(V(0, -1, 0), y0),
      new THREE.Plane(V(0, 1, 0), -y1), new THREE.Plane(V(0, 0, -1), z0), new THREE.Plane(V(0, 0, 1), -z1)];
    o.traverse(m => { if (!m.isMesh) return; const ms = [].concat(m.material).map(mt => { const c = mt.clone(); c.clippingPlanes = planes; c.clipIntersection = true; c.side = THREE.DoubleSide; c.needsUpdate = true; return c; });
      m.material = ms.length === 1 ? ms[0] : ms; m.castShadow = false; }); }
  const cutTick = (t) => { if (!p.cutBox || !p.cutOpen) return; const [, , y0, y1, z0, z1] = p.cutBox, pl = o.userData.cutPlanes; if (!pl) return;
    const k0 = Math.min(1, Math.max(0, (t - p.cutOpen[0]) / Math.max(.01, p.cutOpen[1] - p.cutOpen[0]))), k = k0 * k0 * (3 - 2 * k0);
    const cy = (y0 + y1) / 2, cz = (z0 + z1) / 2; pl[2].constant = cy - (cy - y0) * k; pl[3].constant = -(cy + (y1 - cy) * k); pl[4].constant = cz - (cz - z0) * k; pl[5].constant = -(cz + (z1 - cz) * k); };
  // cutaway: remove everything above y = cutY
  if (p.cutY != null) { const pl = new THREE.Plane(new THREE.Vector3(0, -1, 0), p.cutY);
    o.traverse(m => { if (!m.isMesh) return; for (const mt of [].concat(m.material)) { mt.clippingPlanes = [pl]; mt.side = THREE.DoubleSide; mt.needsUpdate = true; } }); }
  const xr0 = p.xrayFrom ?? p.opacity; const xrMats = [];
  if (xr0 != null && xr0 < 1 || p.xrayFrom != null) o.traverse(m => { if (!m.isMesh) return; m.material = [].concat(m.material).map(mt => { const c = mt.clone(); c.transparent = true; c.opacity = xr0; xrMats.push(c); c.depthWrite = false; c.needsUpdate = true; return c; }); if (Array.isArray(m.material) && m.material.length === 1) m.material = m.material[0]; m.castShadow = false; });
  if (!g.animations.length) { // un-animated people come in T-pose: drop the arms to a natural A-pose
    o.traverse(b => { if (!b.isBone) return; const n = b.name;
      if (/^UpperArm\.?L$/i.test(n)) b.rotateX(-(p.arms ?? 1.25)); if (/^UpperArm\.?R$/i.test(n)) b.rotateX(-(p.arms ?? 1.25));
      if (/^LowerArm\.?[LR]$/i.test(n)) b.rotateZ(n.endsWith('L') ? -.15 : .15); });
    if (p.wave) { const arm = o.getObjectByName('UpperArmR') || o.getObjectByName('UpperArm.R'); w.userData.wave = arm; } }
  const mixer = new THREE.AnimationMixer(o), acts = {};
  for (const c of g.animations) acts[c.name.replace(/^.*\|/, '')] = mixer.clipAction(c);
  let cur = null; const play = n => { if (!n || cur === n || !acts[n]) return; Object.values(acts).forEach(a => a.stop()); acts[n].play(); cur = n; };
  play(p.clip || (acts.Idle ? 'Idle' : Object.keys(acts)[0]));
  const P = p.path;
  const xrTick = (t) => { if (p.xrayFrom == null || p.xrayTo == null) return; const k = Math.min(1, Math.max(0, (t - p.xrayT0) / Math.max(.01, p.xrayT1 - p.xrayT0))), e = k * k * (3 - 2 * k); xrMats.forEach(c => { c.opacity = p.xrayFrom + (p.xrayTo - p.xrayFrom) * e; }); };
  w.userData.tick = (t) => { xrTick(t); cutTick(t);
    const mo = w.userData.mode || {}; play(mo.clip || p.clip || (acts.Idle ? 'Idle' : Object.keys(acts)[0]));
    mixer.setTime((t + (p.offset || 0)) * (mo.speed ?? p.speed ?? 1));
    const path = mo.path || P;
    if (path) { const [a, b] = path, segL = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      // footLock (new plans): walk at a speed matched to the animal's size, at constant speed, so the feet keep pace with the ground
      // (the old easing made the animal stop and start mid-stride and slide). Old plans keep pathSpeed and easing unchanged.
      const lock = p.footLock || mo.footLock; const h = p.height || 1.5;
      const ps = lock ? (mo.walkSpeed ?? p.walkSpeed ?? 0.35 * Math.sqrt(9.81 * h)) / segL : (mo.pathSpeed ?? p.pathSpeed ?? .25);
      const u = ((t * ps) % 2), k = u < 1 ? u : 2 - u, d = u < 1 ? 1 : -1;
      const kk = lock ? k : easeIO(k);
      const x = lerp(a[0], b[0], kk), z = lerp(a[1], b[1], kk);
      const par = w.parent ? w.parent.position : new THREE.Vector3(); o.parent.position.x = x - par.x; o.parent.position.z = z - par.z;
      w.rotation.y = 0; o.parent.rotation.y = Math.atan2((b[0] - a[0]) * d, (b[1] - a[1]) * d); }
    if (mo.face != null) o.parent.rotation.y = mo.face;
    if (w.userData.wave) w.userData.wave.rotation.x = Math.sin(t * 6) * .4; // simple gesture for static people
    if (p.sway) { w.rotation.z = Math.sin(t * 1.4 + (p.ph || 0)) * p.sway; w.rotation.x = Math.sin(t * 1.1 + (p.ph || 0) * 1.7) * p.sway * .6; } // plants bend in the wind
  };
  return w;
};
// ---------- Nile pack: flowing river, felucca (lateen sail up/furled on a keyframed track), wind streaks, floating log, carved stele ----------
function streakTex() { return TEX.streak ??= canvasTex(256, 16, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.75, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, h * .25, w, h * .5); }); }
const rod = (a, b, r, m) => { const d = new THREE.Vector3().subVectors(b, a), c = cyl(r, r, d.length(), m, 6); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return c; };
function river(p = {}) { const g = new THREE.Group(), L = p.w || 16, W = p.d || 5, flow = p.flow ?? .6, r = rng(p.seed || 4);
  const tex = canvasTex(512, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#356f80'); gr.addColorStop(.5, '#4a8fa3'); gr.addColorStop(1, '#356f80'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const rr = rng(7); for (let i = 0; i < 300; i++) { c.strokeStyle = `rgba(${rr() > .45 ? '225,245,250' : '25,70,85'},${.1 + rr() * .2})`; c.lineWidth = 1 + rr() * 2; const x = rr() * w, y = rr() * h, l = 20 + rr() * 70;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y + (rr() - .5) * 6, x + l, y); c.stroke(); } }, [L / 4, W / 4]);
  const wmat = new THREE.MeshStandardMaterial({ map: tex, roughness: .1, metalness: .2 }), water = new THREE.Mesh(new THREE.PlaneGeometry(L, W), wmat);
  // ported from the claude-animated-shorts bridge river (world.ts): view-angle colour gradient, so the river darkens toward the viewer and fades toward the horizon
  wmat.onBeforeCompile = sh => {
    sh.uniforms.uRiverNear = { value: col(p.near || '#2b6173') }; sh.uniforms.uRiverFar = { value: col(p.far || '#9fc6d3') };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform vec3 uRiverNear; uniform vec3 uRiverFar;')
      .replace('#include <map_fragment>', `#include <map_fragment>
  { vec3 vd = normalize(vWP - cameraPosition); float dep = asin(clamp(-vd.y, 0.0, 1.0)); float f = 1.0 - smoothstep(0.0, 0.42, dep);
    vec3 grad = mix(uRiverNear, uRiverFar, f); float marks = dot(diffuseColor.rgb, vec3(0.33));
    diffuseColor.rgb = grad * (0.8 + 0.45 * marks); }`);
  };
  wmat.customProgramCacheKey = () => 'river_v2';
  water.rotation.x = -Math.PI / 2; water.position.y = .06; water.receiveShadow = true; g.add(water);
  const bank = std('#5e4a33', { r: .95 }); for (const s of [-1, 1]) { const b = box(L, .12, .5, bank); b.position.set(0, .03, s * (W / 2 + .2)); g.add(b); }
  const sm = new THREE.MeshBasicMaterial({ map: streakTex(), transparent: true, opacity: .5, depthWrite: false }), streaks = [];
  for (let i = 0; i < (p.streaks ?? 46); i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(.8 + r() * 1.4, .08), sm.clone()); s.rotation.x = -Math.PI / 2; g.add(s); streaks.push({ s, x0: r() * L, z: (r() - .5) * W * .85, sp: .7 + r() * .6 }); }
  const spk = p.specks ? new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 6, 4), std('#6b4a26'), p.specks) : null, sd = []; if (spk) { g.add(spk); for (let i = 0; i < p.specks; i++) sd.push([r() * L, (r() - .5) * W * .9, r()]); }
  const WHITE = col('#ffffff'), MUD = col('#c09a62'), m4 = new THREE.Matrix4();
  g.userData.tick = t => { tex.offset.x = -t * flow / 4; const mud = modeLerp(g, p, 'mud'); wmat.color.copy(WHITE).lerp(MUD, mud);
    if (spk) { spk.visible = mud > .2; sd.forEach(([x0, z, ph], i) => { m4.makeTranslation((x0 + t * flow * 1.4) % L - L / 2, .02 + ph * .05, z + Math.sin(t + ph * 9) * .1); spk.setMatrixAt(i, m4); }); spk.instanceMatrix.needsUpdate = true; }
    streaks.forEach(o => { const u = (o.x0 + t * flow * o.sp * 2) % L; o.s.position.set(u - L / 2, .075, o.z + Math.sin(t * .8 + o.x0) * .08); o.s.material.opacity = .55 * Math.sin(Math.PI * u / L); }); };
  return g; }
function wind(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 6), L = p.w || 16, D = p.d || 8, sp = p.speed || 4.5, list = [];
  const m = new THREE.MeshBasicMaterial({ map: streakTex(), transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < (p.count || 28); i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + r() * 2, .09), m.clone()); g.add(s);
    list.push({ s, u0: r(), y: (p.y0 ?? 1.2) + r() * ((p.y1 ?? 6.5) - (p.y0 ?? 1.2)), z: (r() - .5) * D, k: .7 + r() * .6, ph: r() * 6 }); }
  g.rotation.y = p.rot ?? Math.PI; // local +x = travel direction; PI = blowing toward -x
  g.userData.tick = t => list.forEach(o => { const u = (o.u0 + t * sp * o.k / L) % 1, x = (u - .5) * L, w = t * 2 + o.ph + x * .6;
    o.s.position.set(x, o.y + Math.sin(w) * .25, o.z); o.s.rotation.z = Math.cos(w) * .15; o.s.material.opacity = .8 * Math.sin(Math.PI * u); });
  return g; }
function felucca(p = {}) { const g = new THREE.Group(), mover = new THREE.Group(), body = new THREE.Group(); g.add(mover); mover.add(body);
  const L = p.len || 6, W = L * .3, H = .75, Mh = p.mast || L;
  const hg = new THREE.BoxGeometry(L, H, W, 28, 3, 6), hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i) / (L / 2), y = (hp.getY(i) + H / 2) / H, ax = Math.abs(x);
    hp.setZ(i, hp.getZ(i) * Math.pow(Math.max(0, 1 - Math.pow(ax, 2.2)), .55) * lerp(.35, 1, y));
    hp.setY(i, hp.getY(i) + Math.pow(ax, 3) * .5 * y + (1 - y) * ax * ax * .25); }
  hg.computeVertexNormals();
  const sideT = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h); c.fillStyle = p.color || '#2a6fb0'; c.fillRect(0, 0, w, h * .3);
    c.fillStyle = '#e6bf38'; c.fillRect(0, h * .3, w, h * .05); c.fillStyle = '#3b2f28'; c.fillRect(0, h * .85, w, h * .15);
    const rr = rng(3); for (let i = 0; i < 140; i++) { c.fillStyle = `rgba(90,80,60,${rr() * .1})`; c.fillRect(rr() * w, rr() * h, 2 + rr() * 9, 1 + rr() * 3); } });
  const sideM = new THREE.MeshStandardMaterial({ map: sideT, roughness: .55 }), deckM = std('#9a6b3f', { r: .8 }), wood = std('#7a5634', { r: .7 }), rope = std('#c9b48a');
  const hull = new THREE.Mesh(hg, [sideM, sideM, deckM, sideM, sideM, sideM]); hull.position.y = H / 2 - .25; body.add(hull);
  const deckY = H - .25, mx = L * .2;
  const mast = cyl(.07, .1, Mh, wood, 10); mast.position.set(mx, deckY + Mh / 2, 0); body.add(mast);
  const rud = box(.5, .7, .05, wood); rud.position.set(-L / 2 - .1, deckY - .2, 0); body.add(rud);
  body.add(rod(new THREE.Vector3(mx, deckY + Mh * .95, 0), new THREE.Vector3(L * .5, deckY + .35, 0), .012, rope));
  body.add(rod(new THREE.Vector3(mx, deckY + Mh * .95, 0), new THREE.Vector3(-L * .45, deckY + .3, 0), .012, rope));
  const rig = new THREE.Group(); rig.position.set(mx, deckY, 0); body.add(rig);
  const A = new THREE.Vector3(L * .55, .35, 0), M = new THREE.Vector3(0, Mh * .78, 0), B = M.clone().add(M.clone().sub(A).multiplyScalar(.9)), C = new THREE.Vector3(-L * .62 - mx + L * .2, .3, 0);
  rig.add(rod(A, B, .055, wood)); rig.add(rod(new THREE.Vector3(.1, .28, 0), C, .04, wood));
  const N = 16, sg = new THREE.PlaneGeometry(1, 1, N, N), sp = sg.attributes.position, uv = sg.attributes.uv;
  const sailT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(150,135,110,.45)'; c.lineWidth = 2;
    for (let i = 1; i < 9; i++) { c.beginPath(); c.moveTo(i * w / 9, 0); c.lineTo(i * w / 9, h); c.stroke(); } const rr = rng(5);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(120,100,70,${rr() * .07})`; c.fillRect(rr() * w, rr() * h, 4 + rr() * 20, 3 + rr() * 12); } });
  const sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: sailT, roughness: .9, side: THREE.DoubleSide })); sail.castShadow = true; rig.add(sail);
  const roll = cyl(.13, .13, 1, std('#e9e2d0'), 10); rig.add(roll);
  const P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), Q = new THREE.Vector3();
  let rider = null; if (p.rider && GLB[p.rider]) { rider = ASSETS.glb({ model: p.rider, height: 1.72 }); rider.position.set(-L * .34, deckY - .05, 0); rider.rotation.y = Math.PI / 2; body.add(rider); }
  const K = p.track || [[0, 0, 0, Math.PI, 1, .6, 0]]; // [t, x, z, heading, sail(0 furled..1 up), swing, luff]
  const at = t => { if (t <= K[0][0]) return K[0]; for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const a = K[i - 1], b = K[i], k = easeIO((t - a[0]) / Math.max(.001, b[0] - a[0])); return a.map((v, j) => lerp(v, b[j], k)); } return K[K.length - 1]; };
  g.userData.tick = (t) => { const [, x, z, h, s, sw, lf] = at(t); mover.position.set(x, 0, z); mover.rotation.y = h;
    body.position.y = Math.sin(t * 1.6) * .04; body.rotation.x = Math.sin(t * 1.3) * .035 + s * .05; body.rotation.z = Math.sin(t * 1.1 + 1) * .02;
    rig.rotation.y = sw; const f = 1 - clamp(s), bul = (s > .05 ? 1 : 0) * (1 - lf) * .9 * s + lf * Math.sin(t * 15) * .35;
    for (let i = 0; i < sp.count; i++) { const u = uv.getX(i), v = uv.getY(i) * (1 - f) * .999;
      P1.copy(A).lerp(B, u); P2.copy(C).lerp(B, u); Q.copy(P1).lerp(P2, v); Q.z = Math.sin(Math.PI * v / Math.max(.001, 1 - f)) * Math.sin(Math.PI * u) * bul; sp.setXYZ(i, Q.x, Q.y, Q.z); }
    sp.needsUpdate = true; sg.computeVertexNormals(); sail.visible = f < .97;
    roll.visible = f > .05; roll.position.copy(A).lerp(B, .5); roll.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Q.copy(B).sub(A).normalize()); roll.scale.set(f, A.distanceTo(B) * .85, f);
    if (rider) rider.userData.tick?.(t); };
  return shadowed(g); }
function floater(p = {}) { const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); const m = std('#6b4a2c', { r: .9 });
  const lg = cyl(.12, .15, 1.5, m, 10); lg.rotation.z = Math.PI / 2; inner.add(lg); const br = cyl(.04, .05, .5, m, 6); br.position.set(.3, .15, .08); br.rotation.set(.4, 0, -.7); inner.add(br);
  const leaf = std('#5f7d2e', { r: .8 }); for (let i = 0; i < 5; i++) { const l = sph(.12, leaf); l.scale.set(1.6, .2, .7); l.position.set(-.4 + i * .1, .14, (i % 2 - .5) * .2); inner.add(l); }
  const F = p.from || [-6, 0], T = p.to || [6, 0];
  g.userData.tick = (t, age) => { const k = clamp(age / (p.travel || 6)); inner.position.set(lerp(F[0], T[0], k), .04 + Math.sin(t * 2.2) * .025, lerp(F[1], T[1], k)); inner.rotation.y = Math.sin(t * .7) * .25; inner.rotation.x = Math.sin(t * 1.9) * .06; };
  return shadowed(g); }
function stele(p = {}) { const g = new THREE.Group(), W = p.w || 1.6, H = p.h || 2.2, D = .35;
  const tex = canvasTex(512, 704, (c, w, h) => { c.fillStyle = '#d4b27c'; c.fillRect(0, 0, w, h); const rr = rng(9);
    for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${rr() > .5 ? '250,230,190' : '120,85,45'},${rr() * .18})`; c.fillRect(rr() * w, rr() * h, 1 + rr() * 4, 1 + rr() * 4); }
    const carve = draw => { c.save(); c.translate(3, 3); c.strokeStyle = c.fillStyle = 'rgba(255,240,205,.6)'; draw(); c.restore(); c.strokeStyle = c.fillStyle = '#6a4724'; draw(); };
    c.lineCap = c.lineJoin = 'round';
    carve(() => { c.lineWidth = 8; c.strokeRect(22, 22, w - 44, h - 44); c.beginPath(); c.arc(w / 2, 95, 42, 0, 7); c.fill(); });
    const boat = (cy, up, dir) => carve(() => { const cx = w / 2 + 10; c.lineWidth = 10;
      c.beginPath(); c.moveTo(cx - 170, cy - 40); c.quadraticCurveTo(cx, cy + 55, cx + 170, cy - 40); c.quadraticCurveTo(cx, cy + 12, cx - 170, cy - 40); c.fill();
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 185); c.stroke();
      if (up) { c.fillRect(cx - 62, cy - 170, 124, 130); c.lineWidth = 7; c.beginPath(); c.moveTo(cx - 80, cy - 172); c.lineTo(cx + 80, cy - 172); c.moveTo(cx - 80, cy - 38); c.lineTo(cx + 80, cy - 38); c.stroke(); }
      else { c.lineWidth = 12; c.beginPath(); c.moveTo(cx - 110, cy - 30); c.lineTo(cx + 110, cy - 30); c.stroke(); c.lineWidth = 6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx - 90 + i * 55, cy + 5); c.lineTo(cx - 120 + i * 55, cy + 55); c.stroke(); } }
      c.lineWidth = 6; c.beginPath(); for (let i = 0; i <= 10; i++) c.lineTo(cx - 180 + i * 36, cy + 80 + (i % 2) * 16); c.stroke();
      c.lineWidth = 9; const ay = cy - 100, ax0 = dir < 0 ? 120 : w - 120, tip = dir < 0 ? 40 : w - 40; c.beginPath(); c.moveTo(ax0, ay); c.lineTo(tip, ay); c.stroke();
      c.beginPath(); c.moveTo(tip, ay); c.lineTo(tip - dir * 28, ay - 22); c.lineTo(tip - dir * 28, ay + 22); c.closePath(); c.fill(); });
    boat(340, true, -1); boat(600, false, 1); });
  const stone = std('#c9a46c', { r: .95 }), front = new THREE.MeshStandardMaterial({ map: tex, roughness: .95 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [stone, stone, stone, stone, front, stone]); slab.position.y = H / 2 + .25; g.add(slab);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, D, 24, 1, false, Math.PI / 2, Math.PI), stone); top.rotation.x = Math.PI / 2; top.position.y = H + .25; g.add(top);
  const base = box(W + .5, .25, D + .5, std('#b8956a', { r: 1 })); base.position.y = .125; g.add(base);
  return shadowed(g); }
Object.assign(ASSETS, { river, wind, felucca, floater, stele });
// ---------- brick pack: real-size bricks (instanced) in drying rows, stacks and a clamp kiln with fire tunnels + cutaway;
// colour state raw grey -> wet -> fired red -> reduced dark, driven by modes { fire, wet, dark, glow, dur }; wet brick that bursts; x-ray clay with iron that rusts ----------
function brickTex() { return SPR.brick ||= canvasT(128, 64, (c, w, h) => { const r = rng(41); c.fillStyle = '#ddd7cc'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const v = r(); c.fillStyle = `rgba(${v > .5 ? '255,250,240' : '60,50,40'},${.04 + r() * .12})`; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
  for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(40,30,25,.25)'; c.beginPath(); c.arc(r() * w, r() * h, .6 + r() * 1.4, 0, 7); c.fill(); }
  c.strokeStyle = 'rgba(50,40,30,.3)'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2); }); }
const BR = { raw: col('#8f8a80'), wet: col('#57534d'), red: col('#a04129'), dark: col('#3b3330') };
function brickState(p, mode, prev, mAge) { const from = k => prev?.[k] ?? p[k] ?? 0, to = k => mode?.[k] ?? from(k), e = easeIO(clamp(mAge / (mode?.dur ?? 2.5))), v = k => mode ? lerp(from(k), to(k), e) : (p[k] ?? 0);
  const s = { fire: v('fire'), wet: v('wet'), dark: v('dark'), glow: v('glow') }; s.color = BR.raw.clone().lerp(BR.wet, s.wet).lerp(BR.red, s.fire).lerp(BR.dark, s.dark); return s; }
function bricks(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 17), L = .25, T = .07, Wd = .12, gap = p.gap ?? .04, list = [];
  if (p.layout === 'rows') { const rows = p.rows || 8, per = p.per || 18;
    for (let i = 0; i < rows; i++) for (let j = 0; j < per; j++) list.push([(j - (per - 1) / 2) * (L + .06) + (r() - .5) * .03, T / 2, (i - (rows - 1) / 2) * Wd * 2.2 + (r() - .5) * .03, (r() - .5) * .08, false]); }
  else { const W = p.w || 4, D = p.d || 3, H = p.h || 2.2, layers = Math.floor(H / (T + .012)), tn = p.tunnels || 0, cut = p.cut;
    for (let ly = 0; ly < layers; ly++) { const ax = ly % 2 === 0, y = ly * (T + .012), sx = ax ? L + gap : Wd + gap, sz = ax ? Wd + gap : L + gap, nx = Math.floor(W / sx), nz = Math.floor(D / sz);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = (i - (nx - 1) / 2) * sx, z = (j - (nz - 1) / 2) * sz;
        if (tn && y < .42) { const tw = W / tn, u = ((x + W / 2) % tw) / tw; if (u > .28 && u < .72) continue; }
        if (cut && z > D / 2 - cut[1] && Math.abs(x - (cut[2] || 0)) < cut[0] / 2 && y > (cut[3] ?? -1)) continue;
        if (p.top && y > H - .3 && r() < .35) continue; // ragged top course
        list.push([x + (r() - .5) * .01, y + T / 2, z + (r() - .5) * .01, (ax ? 0 : Math.PI / 2) + (r() - .5) * .04, Math.min(W / 2 - Math.abs(x), D / 2 - Math.abs(z), H - y) > (p.core ?? 99)]); } } }
  const geo = new THREE.BoxGeometry(L, T, Wd), mats = [0, 1].map(() => new THREE.MeshStandardMaterial({ map: brickTex(), roughness: .92, color: BR.raw.clone() }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), tint = new THREE.Color();
  [list.filter(b => !b[4]), list.filter(b => b[4])].forEach((arr, gi) => { if (!arr.length) return; const im = new THREE.InstancedMesh(geo, mats[gi], arr.length);
    arr.forEach((b, i) => { eu.set(0, b[3], 0); q.setFromEuler(eu); v.set(b[0], b[1], b[2]); m4.compose(v, q, one); im.setMatrixAt(i, m4); const k = .86 + r() * .24; tint.setRGB(k, k * (.95 + r() * .07), k * (.93 + r() * .09)); im.setColorAt(i, tint); });
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false; g.add(im); });
  g.userData.tick = (t) => { const s = brickState(p, g.userData.mode, g.userData.prevMode, g.userData.modeAge ?? 0);
    mats[0].color.copy(s.color); mats[0].roughness = lerp(.92, .35, s.wet); mats[0].emissive.setRGB(1, .32, .06).multiplyScalar(s.glow * (.28 + Math.sin(t * 5) * .05));
    mats[1].color.copy(BR.raw.clone().lerp(BR.wet, s.wet)); };
  return g; }
function brickBurst(p = {}) { const g = new THREE.Group(), S = p.size || 1, r = rng(p.seed || 19), at = p.at ?? 2.2, L = 1 * S, T = .32 * S, Wd = .5 * S;
  const mat = new THREE.MeshStandardMaterial({ map: brickTex(), color: BR.wet.clone(), roughness: .4, transparent: true, opacity: .62 }), chunks = [], nx = 4, ny = 2, nz = 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) { const c = box(L / nx * .98, T / ny * .98, Wd / nz * .98, mat);
    const p0 = new THREE.Vector3((i - (nx - 1) / 2) * L / nx, T / 2 + (j - (ny - 1) / 2) * T / ny + .15 * S, (k - (nz - 1) / 2) * Wd / nz); c.position.copy(p0); g.add(c);
    const dir = p0.clone().setY(p0.y - .1 * S).normalize(); chunks.push({ c, p0, v: dir.multiplyScalar(2.2 + r() * 1.6).add(new THREE.Vector3(0, 2 + r() * 1.5, 0)), sp: new THREE.Vector3(r() * 9, r() * 9, r() * 9) }); }
  const dm = new THREE.MeshStandardMaterial({ color: col('#4fb3ff'), roughness: .05, transparent: true, opacity: .9, emissive: col('#0b3a66') }), drops = [];
  for (let i = 0; i < 14; i++) { const d = sph(.045 * S, dm); d.userData.base = new THREE.Vector3((r() - .5) * L * .8, .15 * S + T / 2 + (r() - .5) * T * .6, (r() - .5) * Wd * .7); g.add(d); drops.push(d); }
  const steam = []; for (let i = 0; i < 26; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: '#f4f6f8', transparent: true, depthWrite: false })); g.add(m); steam.push({ m, ph: r(), x: (r() - .5) * L, z: (r() - .5) * Wd, a: r() * 6.3, sp: 1.5 + r() * 2 }); }
  g.userData.tick = (t, age) => { const h = clamp(age / at), b = age - at;
    mat.emissive.setRGB(1, .3, .05).multiplyScalar(h * .35);
    drops.forEach((d, i) => { d.visible = b < 0; const j = h * .03 * S; d.position.copy(d.userData.base).add(new THREE.Vector3(Math.sin(t * 40 + i) * j, Math.abs(Math.sin(t * 30 + i * 2)) * j * 2, Math.cos(t * 37 + i) * j)); d.scale.setScalar(1 + h * .6); });
    chunks.forEach(o => { if (b < 0) { const sh = h * h * .02 * S; o.c.position.set(o.p0.x + Math.sin(t * 60) * sh, o.p0.y + Math.cos(t * 53) * sh, o.p0.z); o.c.rotation.set(0, 0, 0); return; }
      const y = Math.max(T / 4, o.p0.y + o.v.y * b - 4.9 * b * b), land = y <= T / 4 + .001; o.c.position.set(o.p0.x + o.v.x * Math.min(b, .7), y, o.p0.z + o.v.z * Math.min(b, .7));
      if (!land) o.c.rotation.set(o.sp.x * b, o.sp.y * b, o.sp.z * b); });
    mat.opacity = b < 0 ? .62 : 1;
    steam.forEach(s => { if (b < 0) { const u = (t * .6 * s.sp / 2 + s.ph) % 1; s.m.position.set(s.x, T + .2 * S + u * 1.2 * S * h, s.z); s.m.scale.setScalar((.15 + u * .4) * S * h + .001); s.m.material.opacity = h * .7 * (1 - u); }
      else { const u = clamp(b / 1.4), rr = u * 2.2 * s.sp / 2.5; s.m.position.set(Math.cos(s.a) * rr, .3 * S + u * 1.2 + s.ph * .5, Math.sin(s.a) * rr * .6); s.m.scale.setScalar(.4 + u * 1.4); s.m.material.opacity = .85 * (1 - u); } }); };
  return shadowed(g); }
function clayCut(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 21), S = p.size || 1.2, W = S * 1.6, rust = p.rust ? p.dur || 3 : 0;
  const cm = new THREE.MeshStandardMaterial({ map: brickTex(), color: BR.raw.clone(), roughness: .9 }); const slab = box(W, S, S, cm); slab.position.y = S / 2 + .02; g.add(slab);
  const iron = col('#4a4f55'), rustC = col('#c4501e'), specks = [];
  for (let i = 0; i < 70; i++) { const m = new THREE.MeshStandardMaterial({ color: iron.clone(), metalness: .9, roughness: .3, emissive: col('#000') }); const s = sph((.025 + r() * .03) * S, m);
    const onTop = r() < .35; s.position.set((r() - .5) * W * .92, onTop ? S + .02 : .05 * S + r() * S * .9, onTop ? (r() - .5) * S * .9 : S / 2 + .004); s.scale.y = .7; g.add(s); specks.push({ s, m, d: r() * .5 }); }
  const om = new THREE.MeshStandardMaterial({ color: col('#bfe6ff'), transparent: true, opacity: .85, roughness: .1, emissive: col('#2a6a9a') }), ox = [];
  if (rust) for (let i = 0; i < 40; i++) { const o = sph(.035 * S, om); const tgt = specks[i % specks.length]; const a = r() * 6.3; g.add(o); ox.push({ o, tgt, from: new THREE.Vector3(Math.cos(a) * W, S * (.6 + r()), S / 2 + .6 + r() * .8), d: r() * .5 }); }
  g.userData.tick = (t, age) => { const k = rust ? clamp((age - .5) / rust) : 0;
    cm.color.copy(BR.raw).lerp(BR.red, easeIO(k)); cm.emissive.setRGB(1, .3, .05).multiplyScalar(rust ? .12 + Math.sin(t * 4) * .03 : 0);
    specks.forEach((o, i) => { const kk = clamp(k * 1.6 - o.d); o.m.color.copy(iron).lerp(rustC, kk); o.m.metalness = lerp(.9, .1, kk); o.m.roughness = lerp(.3, .9, kk);
      o.m.emissive.setRGB(.6, .65, .7).multiplyScalar(rust ? 0 : Math.max(0, Math.sin(t * 3 + i * 1.7)) * .35 * clamp(age / .8)); });
    ox.forEach(o => { const u = clamp(k * 1.6 - o.d); o.o.visible = u > 0 && u < 1; o.o.position.copy(o.from).lerp(o.tgt.s.position, easeIO(u)); }); };
  return shadowed(g); }
Object.assign(ASSETS, { bricks, brick_burst: brickBurst, clay_cut: clayCut });
// ---------- flood pack: rising muddy flood sheet (level / mud / silt / settle via modes), earth dikes, cracked dry soil, mud-brick house, rain cloud, High Dam with lake + trapped silt, nilometer, gold coin stacks ----------
// modeLerp: numeric mode key eased from the previous mode's value (plans pass cumulative modes so every key is always present)
function modeLerp(o, p, k) { const m = o.userData.mode, pr = o.userData.prevMode, from = pr?.[k] ?? p[k] ?? 0; if (!m) return p[k] ?? 0; const to = m[k] ?? from; return lerp(from, to, easeIO(clamp((o.userData.modeAge ?? 0) / (m.dur ?? 2.5)))); }
function waterTex(rep, base = '#4a8fa3') { const r = rng(7); return canvasTex(512, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) { c.strokeStyle = `rgba(${r() > .45 ? '225,245,250' : '25,70,85'},${.1 + r() * .2})`; c.lineWidth = 1 + r() * 2; const x = r() * w, y = r() * h, l = 20 + r() * 70; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y + (r() - .5) * 6, x + l, y); c.stroke(); } }, rep); }
function flood(p = {}) { const g = new THREE.Group(), W = p.w || 10, Dd = p.d || 6, r = rng(p.seed || 12), n = p.specks ?? 360;
  const tex = waterTex([W / 4, Dd / 4], '#c4c4c4'), wm = new THREE.MeshStandardMaterial({ map: tex, roughness: .12, metalness: .15, transparent: true, opacity: .93 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(W, Dd), wm); water.rotation.x = -Math.PI / 2; g.add(water);
  const bm = new THREE.MeshStandardMaterial({ color: col('#7a5e3c'), transparent: true, opacity: .6, roughness: .2 }), body = box(W, 1, Dd, bm); g.add(body);
  const sm = new THREE.MeshStandardMaterial({ color: col('#33251a'), roughness: 1, transparent: true, opacity: 0 }), silt = new THREE.Mesh(new THREE.PlaneGeometry(W, Dd), sm); silt.rotation.x = -Math.PI / 2; silt.position.y = .03; g.add(silt);
  const spk = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 6, 4), std('#5a3d20'), n), sd = []; g.add(spk); for (let i = 0; i < n; i++) sd.push([(r() - .5) * W * .96, (r() - .5) * Dd * .96, r()]);
  const MUD = col('#94704a'), CLR = col('#5d9cb0'), BM = col('#7a5e3c'), BC = col('#4d7f8f'), m4 = new THREE.Matrix4();
  g.userData.tick = (t) => { const L = modeLerp(g, p, 'level'), mud = modeLerp(g, p, 'mud'), st = modeLerp(g, p, 'settle'), sl = modeLerp(g, p, 'silt');
    const on = L > .01; water.visible = body.visible = on; water.position.y = L + .03; body.scale.y = Math.max(.001, L); body.position.y = L / 2 + .015; tex.offset.set(t * .03, t * .01);
    wm.color.copy(CLR).lerp(MUD, mud); bm.color.copy(BC).lerp(BM, mud); sm.opacity = clamp(sl); silt.position.y = .03 + sl * .02;
    spk.visible = on && mud > .15; if (spk.visible) { sd.forEach(([x, z, ph], i) => { const k = clamp(st * 1.6 - ph * .6), y = lerp(L * (.15 + .75 * ph), .05, easeIO(k));
      m4.makeTranslation(x + Math.sin(t * .7 + ph * 20) * .12 * (1 - k), y, z + Math.cos(t * .6 + ph * 17) * .12 * (1 - k)); spk.setMatrixAt(i, m4); }); spk.instanceMatrix.needsUpdate = true; } };
  return g; }
function cracked(p = {}) { const W = p.w || 10, Dd = p.d || 6, r = rng(p.seed || 33);
  const tex = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#b59670'; c.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(${r() > .5 ? '240,225,195' : '90,70,45'},${r() * .15})`; c.fillRect(r() * w, r() * h, 2, 2); }
    c.strokeStyle = '#3f2f1f'; c.lineCap = 'round'; for (let i = 0; i < 70; i++) { let x = r() * w, y = r() * h, a = r() * 6.3; c.lineWidth = 1.5 + r() * 2.5; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 6; k++) { a += (r() - .5) * 1.4; x += Math.cos(a) * 22; y += Math.sin(a) * 22; c.lineTo(x, y); } c.stroke(); } }, [W / 4, Dd / 4]);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, transparent: true, opacity: 0 }), pl = new THREE.Mesh(new THREE.PlaneGeometry(W, Dd), m); pl.rotation.x = -Math.PI / 2; pl.position.y = .045; pl.receiveShadow = true;
  pl.userData.tick = (t, age) => { m.opacity = clamp(age / 1.2); }; return pl; }
function mudhouse(p = {}) { const g = new THREE.Group(), w = p.w || 2.6, d = p.d || 2.6, h = p.h || 2.8, r = rng(p.seed || 3);
  const tex = canvasTex(128, 128, (c, W, H) => { c.fillStyle = '#d8d0c4'; c.fillRect(0, 0, W, H); for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,250,240' : '80,60,40'},${r() * .12})`; c.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3); } }, [2, 2]);
  const pm = new THREE.MeshStandardMaterial({ map: tex, color: col(p.color || '#c9a67a'), roughness: 1 }), dark = std('#3a2a1c'), wood = std('#6b4628');
  const b = box(w, h, d, pm); b.position.y = h / 2; g.add(b);
  for (const [x, z, sw, sd] of [[0, d / 2 - .06, w, .12], [0, -d / 2 + .06, w, .12], [w / 2 - .06, 0, .12, d], [-w / 2 + .06, 0, .12, d]]) { const e = box(sw, .3, sd, pm); e.position.set(x, h + .15, z); g.add(e); }
  const door = box(.75, 1.6, .06, wood); door.position.set(-w * .2, .8, d / 2 + .02); g.add(door);
  for (const x of [w * .22]) { const wi = box(.45, .45, .06, dark); wi.position.set(x, h * .62, d / 2 + .02); g.add(wi); }
  const sticks = std('#a08454'); for (let i = 0; i < 14; i++) { const s = cyl(.03, .03, w * .7, sticks, 5); s.rotation.z = Math.PI / 2 + (r() - .5) * .3; s.rotation.y = (r() - .5) * .5; s.position.set((r() - .5) * .3, h + .06 + (i % 3) * .05, (r() - .5) * d * .6); g.add(s); }
  return shadowed(g); }
function cloud(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 44), list = [], c = col(p.color || '#7d838c');
  for (let i = 0; i < (p.count || 40); i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: c.clone().multiplyScalar(.85 + r() * .3), transparent: true, depthWrite: false, opacity: .95 }));
    const o = { m, x: (r() - .5) * (p.w || 5), y: (r() - .5) * 1.2, z: (r() - .5) * (p.d || 3), s: 1.6 + r() * 2, ph: r() * 6 }; m.material.rotation = r() * 6; g.add(m); list.push(o); }
  g.userData.tick = (t, age) => { const k = clamp(age / 1); list.forEach(o => { o.m.position.set(o.x + Math.sin(t * .3 + o.ph) * .2, o.y, o.z); o.m.scale.setScalar(o.s * k + .001); }); }; return g; }
function concreteTex() { return SPR.concrete ||= canvasT(256, 256, (c, w, h) => { const r = rng(55); c.fillStyle = '#c4c0b6'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,255,250' : '70,70,65'},${r() * .1})`; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  c.strokeStyle = 'rgba(80,78,72,.35)'; c.lineWidth = 2; for (let y = 32; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }, [2, 2]); }
function dam(p = {}) { const g = new THREE.Group(), W = p.w || 4, H = p.h || 2.4, T = p.t || 1.8, LK = p.lake || 3, r = rng(p.seed || 61);
  const sh = new THREE.Shape(); sh.moveTo(-T / 2, 0); sh.lineTo(T / 2, 0); sh.lineTo(T * .12, H); sh.lineTo(-T * .2, H); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: false }); geo.translate(0, 0, -W / 2);
  const cm = new THREE.MeshStandardMaterial({ map: concreteTex(), color: col('#a49e92'), roughness: .85 }); const body = new THREE.Mesh(geo, cm); g.add(body);
  const road = box(T * .32 + .1, .08, W, std('#5c5a56')); road.position.set(-T * .04, H + .04, 0); g.add(road);
  for (const z of [-W / 2 + .05, W / 2 - .05]) { const rail = box(T * .32, .12, .05, std('#e8e4dc')); rail.position.set(-T * .04, H + .14, z); g.add(rail); }
  const lm = new THREE.MeshStandardMaterial({ color: col('#3f8196'), roughness: .1, metalness: .15, transparent: true, opacity: .72 }), lake = box(LK, H * .8, W - .1, lm); lake.position.set(-T * .3 - LK / 2, H * .4, 0); g.add(lake);
  const lt = waterTex([LK / 3, W / 3]), ls = new THREE.Mesh(new THREE.PlaneGeometry(LK, W - .1), new THREE.MeshStandardMaterial({ map: lt, roughness: .1, metalness: .2 })); ls.rotation.x = -Math.PI / 2; ls.position.set(lake.position.x, H * .8 + .01, 0); g.add(ls);
  const sm = std('#4e3722', { r: 1 }), siltB = box(LK - .02, 1, W - .14, sm); siltB.position.x = lake.position.x; g.add(siltB);
  const spk = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 6, 4), std('#5a3d20'), 160), sd = []; g.add(spk); for (let i = 0; i < 160; i++) sd.push([lake.position.x + (r() - .5) * LK * .95, (r() - .5) * W * .9, r()]);
  const jets = []; for (let i = 0; i < 22; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: '#ffffff', transparent: true, depthWrite: false })); g.add(m); jets.push({ m, z: (r() - .5) * W * .6, ph: r() }); }
  const m4 = new THREE.Matrix4();
  g.userData.tick = (t, age) => { lt.offset.x = t * .01; const sl = p.silt ? clamp((age - (p.siltDelay ?? .3)) / (p.siltDur || 3)) : (p.silt0 || 0), sh2 = .05 + sl * H * .35;
    siltB.scale.y = sh2; siltB.position.y = sh2 / 2 + .01; spk.visible = !!p.silt && age > (p.siltDelay ?? .3) && sl < 1;
    sd.forEach(([x, z, ph], i) => { const u = (t * .25 + ph) % 1; m4.makeTranslation(x, lerp(H * .78, sh2, u), z); spk.setMatrixAt(i, m4); }); spk.instanceMatrix.needsUpdate = true;
    jets.forEach(j => { const u = (t * .8 + j.ph) % 1; j.m.position.set(T * .5 + u * 1.8, .25 + Math.sin(u * Math.PI) * .35, j.z + (j.ph - .5) * u); j.m.scale.setScalar(.3 + u * .7); j.m.material.opacity = .8 * (1 - u); }); };
  return shadowed(g); }
function nilometer(p = {}) { const g = new THREE.Group(), S = p.size || 1.9, H = p.h || 2.6, th = .22, r = rng(p.seed || 71);
  const stone = new THREE.MeshStandardMaterial({ map: brickTex(), color: col('#d9bd8c'), roughness: .95 });
  for (const [x, z, w, d, h] of [[0, -S / 2, S + th, th, H], [-S / 2, 0, th, S, H], [S / 2, 0, th, S, H], [0, S / 2, S + th, th, .35]]) { const b = box(w, h, d, stone); b.position.set(x, h / 2, z); g.add(b); }
  for (let i = 0; i < 8; i++) { const st = box(.42, .12, .4, stone); st.position.set(-S / 2 + th / 2 + .21, H - .2 - i * .3, -S / 2 + .3 + i * .17); g.add(st); }
  const colM = std('#cbb083', { r: .9 }), col8 = cyl(.17, .19, H * 1.05, colM, 8); col8.position.y = H * .525; g.add(col8);
  const nm = std('#4a3a26'); for (let y = .25, i = 1; y < H; y += .25, i++) { const ring = cyl(.2, .2, i % 4 ? .025 : .05, nm, 8); ring.position.y = y; g.add(ring); }
  const cap = box(.5, .12, .5, colM); cap.position.y = H * 1.05 + .06; g.add(cap);
  const wm = new THREE.MeshStandardMaterial({ color: col('#5d8c88'), roughness: .1, metalness: .15, transparent: true, opacity: .78 }), water = box(S - .02, 1, S - .02, wm); g.add(water);
  g.userData.tick = (t, age) => { const L = lerp(.15, p.level || H * .7, easeIO(clamp((age - .4) / (p.dur || 3)))) + Math.sin(t * 1.2) * .02; water.scale.y = L; water.position.y = L / 2 + .01; };
  return shadowed(g); }
function coins(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 81), n = p.n || 28, gm = new THREE.MeshStandardMaterial({ color: col('#e3b33d'), metalness: .9, roughness: .28, emissive: col('#3a2600') }), geo = new THREE.CylinderGeometry(.12, .12, .035, 20), ims = [], m4 = new THREE.Matrix4();
  for (let s = 0; s < (p.stacks || 3); s++) { const im = new THREE.InstancedMesh(geo, gm, n), ox = (s - 1) * .3, oz = (s % 2) * .12; for (let i = 0; i < n; i++) { m4.makeTranslation(ox + (r() - .5) * .02, .02 + i * .036, oz + (r() - .5) * .02); im.setMatrixAt(i, m4); } im.count = 0; g.add(im); ims.push(im); }
  g.userData.tick = (t, age) => { const k = easeIO(clamp((age - .4) / (p.dur || 3))); ims.forEach((im, s) => { im.count = Math.floor(n * k * (1 - s * .18)); }); };
  return shadowed(g); }
Object.assign(ASSETS, { flood, cracked, mudhouse, cloud, dam, nilometer, coins });

// ---------- salt pack (2026-11-15): salt pans (ponds with per-beat level / pink / crust via modes), salt mounds (grow, rain melt), raker (worker + wooden rake),
// sluice with sea pipe and pump, vapour (evaporation / heat shimmer), brine glass (salt dissolving in sea water). Real sizes in metres.
function saltTex() { return SPR.salt ||= canvasT(256, 256, (g, w, h) => { const r = rng(91); g.fillStyle = '#e9e8e3'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { const v = 205 + r() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v + 2},${.3 + r() * .5})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(140,140,146,${r() * .22})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1); } }, [3, 3]); }
function pondFloorTex() { return SPR.pondFloor ||= canvasT(256, 256, (g, w, h) => { const r = rng(93); g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3500; i++) { g.fillStyle = `rgba(${r() > .5 ? '255,255,250' : '90,80,70'},${r() * .18})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } }, [2, 2]); }
function dykeTex() { return SPR.dyke ||= canvasT(256, 256, (g, w, h) => { const r = rng(97); g.fillStyle = '#c7b08a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() > .5 ? '238,225,200' : '110,90,62'},${r() * .22})`; g.beginPath(); g.arc(r() * w, r() * h, .5 + r() * 2.2, 0, 7); g.fill(); } }, [2, 1]); }
const arrLerp = (o, p, k, i, def = 0) => { const m = o.userData.mode, pr = o.userData.prevMode, base = p[k]?.[i] ?? def, from = pr?.[k]?.[i] ?? base; if (!m) return base;
  const to = m[k]?.[i] ?? from; return lerp(from, to, easeIO(clamp((o.userData.modeAge ?? 0) / (m.dur ?? 2.5)))); };
const PANS = [[-3.9, -3.2, 5.6, 4], [1.7, -3.2, 4.8, 3.6], [5.85, -3.2, 2.7, 3], [3.4, 1.3, 3.4, 2.6], [-.6, 1.3, 3, 2.4]];
const PAN_LINKS = [[-.9, -3.2, 0, .7], [4.3, -2.4, 0, .7], [4.8, -.85, Math.PI / 2, 1.9], [1.3, 1.3, 0, .7]];
function saltPans(p = {}) { // modes: { level:[0..1 per pond], pink:[..], crust:[..], flow:0|1, dur }
  const g = new THREE.Group(), r = rng(p.seed || 17), ponds = p.ponds || PANS, links = p.links || PAN_LINKS, FY = p.floorY ?? .11, DEP = p.depth ?? .2, DH = FY + DEP + .1, DW = .4;
  const dm = new THREE.MeshStandardMaterial({ map: dykeTex(), roughness: 1 });
  const BLUE = col('#4f9aa3'), PINK = col('#ff6f93'), BROWN = col('#9a8468'), WHITE = col('#f2f1ec'), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const P = ponds.map(([cx, cz, w, d], pi) => {
    for (const [x, z, sw, sd] of [[cx, cz - d / 2 - DW / 2, w + DW * 2, DW], [cx, cz + d / 2 + DW / 2, w + DW * 2, DW], [cx - w / 2 - DW / 2, cz, DW, d], [cx + w / 2 + DW / 2, cz, DW, d]]) {
      const b = box(sw, DH + .1, sd, dm); b.position.set(x, DH / 2 - .05, z); b.castShadow = b.receiveShadow = true; g.add(b); }
    const fm = new THREE.MeshStandardMaterial({ map: pondFloorTex(), color: BROWN.clone(), roughness: .95 }), floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fm);
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, FY, cz); floor.receiveShadow = true; g.add(floor);
    const tex = waterTex([w / 3, d / 3], '#9ab8bc'), wm = new THREE.MeshStandardMaterial({ map: tex, color: BLUE.clone(), roughness: .08, metalness: .1, transparent: true, opacity: .8, depthWrite: false });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d), wm); water.rotation.x = -Math.PI / 2; water.position.set(cx, FY + .05, cz); water.receiveShadow = true; g.add(water);
    const n = p.crystals || Math.round(w * d * 60), cm = std('#e9e7e1', { r: .45 }), cr = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), cm, n), cd = [];
    for (let i = 0; i < n; i++) { const cl = r() < .6, x = cx + (r() - .5) * (w - .1), z = cz + (r() - .5) * (d - .1); cd.push({ x, z, s: .012 + r() * r() * .04, ph: r(), ry: r() * 6.3, tx: (r() - .5) * .5, tz: (r() - .5) * .5, cl }); }
    cr.castShadow = false; cr.receiveShadow = true; cr.frustumCulled = false; cr.count = 0; g.add(cr);
    const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.7, 1.75) }), sp = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), sm, 40), sd = [];
    for (let i = 0; i < 40; i++) sd.push([cx + (r() - .5) * (w - .2), cz + (r() - .5) * (d - .2), r() * 40, 2 + r() * 3]); sp.frustumCulled = false; g.add(sp);
    return { pi, w, d, floor, fm, water, wm, tex, cr, cd, sp, sd, lastC: -1 };
  });
  const L = links.map(([x, z, ry, len]) => { const tex = waterTex([1, len], '#a9c8cc'), m = new THREE.MeshStandardMaterial({ map: tex, color: BLUE.clone(), roughness: .1, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(.32, len), m); s.rotation.set(-Math.PI / 2, 0, ry + Math.PI / 2); s.position.set(x, DH - .02, z); g.add(s);
    const cut = box(.34, .04, len, std('#a08c6c')); cut.rotation.y = ry + Math.PI / 2; cut.position.set(x, DH - .05, z); g.add(cut); return { s, m, tex }; });
  g.userData.tick = (t) => {
    const fl = modeLerp(g, p, 'flow');
    for (const o of P) { const lv = arrLerp(g, p, 'level', o.pi), pk = arrLerp(g, p, 'pink', o.pi), cu = arrLerp(g, p, 'crust', o.pi);
      o.water.visible = lv > .01; o.water.position.y = FY + .006 + lv * DEP; o.tex.offset.set(t * .012 + o.pi, t * .006);
      o.wm.color.copy(BLUE).lerp(PINK, pk).lerp(WHITE, cu * .15); o.wm.opacity = .55 + .3 * lv;
      o.fm.color.copy(BROWN).lerp(PINK, pk * .45).lerp(WHITE, clamp(cu * 1.2) * .85);
      if (Math.abs(cu - o.lastC) > .004) { o.lastC = cu; let k = 0;
        o.cd.forEach((c, i) => { const u = clamp((cu - c.ph * .75) / .25); if (u <= 0) return; const s = c.s * easeIO(u);
          m4.compose(v.set(c.x, FY + s * .35, c.z), q.setFromEuler(e.set(c.tx * u, c.ry, c.tz * u)), sc.set(s, s * (c.cl ? .8 : .5), s)); o.cr.setMatrixAt(k++, m4); });
        o.cr.count = k; o.cr.instanceMatrix.needsUpdate = true; }
      o.sp.visible = cu > .05; if (o.sp.visible) { o.sd.forEach(([x, z, ph, f], i) => { const s = .012 * cu * Math.pow(Math.max(0, Math.sin(t * f + ph)), 14); m4.compose(v.set(x, FY + .03, z), q.identity(), sc.setScalar(s + 1e-5)); o.sp.setMatrixAt(i, m4); }); o.sp.instanceMatrix.needsUpdate = true; } }
    L.forEach(l => { l.m.opacity = .85 * fl; l.s.visible = fl > .02; l.tex.offset.y = -t * .6; });
  };
  return g; }
function saltMound(p = {}) { // modes: { size (0..1), melt (0..1), dur }
  const g = new THREE.Group(), r = rng(p.seed || 19), H = p.h || 1.8, R = p.r || H * 1.1, pts = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(new THREE.Vector2(Math.max(.001, R * (1 - Math.pow(u, .95)) * (1 - .12 * Math.sin(u * Math.PI))), H * (u < .9 ? u : .9 + (u - .9) * .6))); }
  pts.push(new THREE.Vector2(0, H * .96));
  const geo = new THREE.LatheGeometry(pts, 48), ps = geo.attributes.position, ph = r() * 6;
  for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i), z = ps.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    const k = 1 + .06 * Math.sin(a * 3 + ph) + .035 * Math.sin(a * 7 + y * 3 + ph) + .02 * Math.sin(a * 13 - y * 5); if (rr > .01) { ps.setX(i, x * k); ps.setZ(i, z * k); } }
  geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ map: saltTex(), color: col('#ebe9e3'), roughness: .9 }), mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
  const pm = new THREE.MeshStandardMaterial({ color: col('#a7bcc4'), roughness: .05, metalness: .1, transparent: true, opacity: 0, depthWrite: false }), pud = new THREE.Mesh(new THREE.CircleGeometry(R * 1.25, 40), pm);
  pud.rotation.x = -Math.PI / 2; pud.position.y = .12; g.add(pud);
  const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.7, 1.75) }), sp = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), sm, 36), sd = [];
  for (let i = 0; i < 36; i++) { const u = .1 + r() * .75, a = r() * 6.283; sd.push([Math.cos(a) * R * (1 - u) * 1.02, H * u, Math.sin(a) * R * (1 - u) * 1.02, r() * 40, 2 + r() * 3]); } sp.frustumCulled = false; g.add(sp);
  const DRY = col('#ebe9e3'), WET = col('#b7bcc0'), m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  g.userData.tick = (t, age) => { const sz = p.growTime ? lerp(p.from ?? .25, 1, easeIO(clamp(age / p.growTime))) : 1, size = Math.max(.001, sz * (modeLerp(g, { size: 1, ...p }, 'size') || .001)), me = modeLerp(g, p, 'melt');
    mesh.scale.set(size * (1 + .25 * me), size * (1 - .6 * me), size * (1 + .25 * me)); m.color.copy(DRY).lerp(WET, clamp(me * 1.8)); m.roughness = lerp(.9, .4, clamp(me * 1.8));
    pm.opacity = .75 * clamp(me * 2); pud.visible = me > .01; pud.scale.setScalar(size * (.7 + .5 * me));
    sd.forEach(([x, y, z, ph2, f], i) => { const s = .02 * (1 - me) * Math.pow(Math.max(0, Math.sin(t * f + ph2)), 14); m4.compose(v.set(x * size * (1 + .25 * me), y * size * (1 - .6 * me), z * size * (1 + .25 * me)), q, sc.setScalar(s + 1e-5)); sp.setMatrixAt(i, m4); });
    sp.instanceMatrix.needsUpdate = true; };
  return g; }
function rakeMesh(p = {}) { const g = new THREE.Group(), wm = woodMat(), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const A = V3(.12, .95, .3), B = V3(0, .14, p.reach || 1.85); g.add(rod(A, B, .018, wm)); // handle from the hands to the blade
  const blade = box(p.bw || .8, .13, .03, wm); blade.position.copy(B); g.add(blade);
  return shadowed(g); }
function raker(p = {}) { // worker + wooden rake pushing salt: push-pull cycle with a forward lean. p.amp (.25 m), p.rate (1.5)
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const man = ASSETS.glb({ model: p.man || 'modular_men/Worker', height: p.height || 1.75, arms: p.arms ?? .95, seed: p.seed }); body.add(man);
  const rk = rakeMesh(p); body.add(rk);
  g.userData.tick = (t) => { const s = Math.sin(t * (p.rate || 1.5) + (p.ph || 0)), a = p.amp ?? .25; body.position.z = s * a; body.rotation.x = .1 + s * (a ? .08 : .02); rk.position.z = s * a * .6; };
  return g; }
function sluice(p = {}) { // sea pipe + pump at local x = 0 (island edge), concrete channel along +x, lifting wooden gate. modes: { on 0..1 }
  const g = new THREE.Group(), len = p.len || 1.1, drop = p.drop ?? 3.9, cm = new THREE.MeshStandardMaterial({ map: concreteTex(), color: col('#cfc8ba'), roughness: .9 });
  const bot = box(len, .08, .55, cm); bot.position.set(len / 2, .06, 0); g.add(bot);
  for (const z of [-.3, .3]) { const w = box(len, .42, .1, cm); w.position.set(len / 2, .21, z); g.add(w); }
  const tex = waterTex([len, 1], '#a9c8cc'), wmat = new THREE.MeshStandardMaterial({ map: tex, color: col('#4f9aa3'), roughness: .08, transparent: true, opacity: 0, depthWrite: false });
  const wat = new THREE.Mesh(new THREE.PlaneGeometry(len + .3, .5), wmat); wat.rotation.x = -Math.PI / 2; wat.position.set(len / 2 + .15, .26, 0); g.add(wat);
  const gate = box(.06, .5, .52, woodMat()); gate.position.set(len - .12, .27, 0); g.add(gate);
  for (const z of [-.33, .33]) { const post2 = box(.08, .9, .08, woodMat()); post2.position.set(len - .12, .45, z); g.add(post2); }
  const pipeM = std('#5d646b', { r: .45, m: .6 }), pv = cyl(.11, .11, drop + .5, pipeM, 14); pv.position.set(-.35, .45 - (drop + .5) / 2, 0); g.add(pv);
  const ph2 = cyl(.11, .11, .55, pipeM, 14); ph2.rotation.z = Math.PI / 2; ph2.position.set(-.1, .45, 0); g.add(ph2);
  const pump = new THREE.Group(), mot = box(.45, .34, .34, std('#3f6b4a', { r: .5, m: .3 })); mot.position.y = .17; pump.add(mot); const fly = cyl(.13, .13, .08, std('#2a2d30', { m: .6, r: .4 }), 16); fly.rotation.z = Math.PI / 2; fly.position.set(.27, .2, 0); pump.add(fly);
  pump.position.set(.2, .1, -.62); g.add(pump); const hose = cyl(.05, .05, .5, pipeM, 8); hose.rotation.x = Math.PI / 2; hose.position.set(.2, .25, -.36); g.add(hose);
  const splash = [], rr = rng(p.seed || 5); for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: '#ffffff', transparent: true, depthWrite: false, opacity: 0 })); g.add(s); splash.push({ s, ph: rr(), z: (rr() - .5) * .4 }); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.2, .3, 32), new THREE.MeshBasicMaterial({ color: '#e9f3f5', transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(-.35, -drop + .03, 0); g.add(ring);
  g.userData.tick = (t) => { const on = modeLerp(g, p, 'on'); wmat.opacity = .85 * on; wat.visible = on > .02; tex.offset.x = -t * .9 * on; gate.position.y = .27 + on * .45;
    pump.position.x = .2 + Math.sin(t * 61) * .004 * on; fly.rotation.x = t * 30 * on;
    splash.forEach(o => { const u = (t * 1.3 + o.ph) % 1; o.s.position.set(len + .1 + u * .5, .3 + Math.sin(u * Math.PI) * .25, o.z); o.s.scale.setScalar(.12 + u * .3); o.s.material.opacity = .6 * on * (1 - u); });
    const u = (t * .7) % 1; ring.scale.setScalar(1 + u * 3); ring.material.opacity = .5 * on * (1 - u); };
  return shadowed(g); }
function vapour(p = {}) { // rising evaporation wisps / heat shimmer over an area. modes: { s 0..1 }
  const g = new THREE.Group(), r = rng(p.seed || 7), W = p.w || 6, D = p.d || 4, H = p.h || 1.8, list = [];
  for (let i = 0; i < (p.count || 40); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: '#ffffff', transparent: true, depthWrite: false, opacity: 0 })); s.material.rotation = r() * 6; g.add(s);
    list.push({ s, x: (r() - .5) * W, z: (r() - .5) * D, ph: r(), k: .6 + r() * .6, sz: .5 + r() * .7 }); }
  g.userData.tick = (t, age) => { const S = modeLerp(g, { s: 1, ...p }, 's') * clamp(age / 1.2);
    list.forEach(o => { const u = (t * .12 * o.k + o.ph) % 1; o.s.position.set(o.x + Math.sin(t * .8 + o.ph * 9) * .15, .2 + u * H, o.z); o.s.scale.setScalar(o.sz * (1.2 + u * 2.2)); o.s.material.opacity = (p.opacity ?? .1) * S * Math.sin(Math.PI * u); }); };
  return g; }
function brineGlass(p = {}) { // ~12 cm glass of sea water: salt grains drop in and dissolve, faint dissolved specks drift inside
  const g = new THREE.Group(), r = rng(p.seed || 3), R = p.r || .045, H = p.h || .12;
  const gm = new THREE.MeshStandardMaterial({ color: col('#ffffff'), roughness: .05, metalness: .1, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .88, H, 32, 1, true), gm); glass.position.y = H / 2; g.add(glass);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R * .88, R * .88, .008, 32), gm); base.position.y = .004; g.add(base);
  const wm = new THREE.MeshStandardMaterial({ color: col('#6fb2c0'), roughness: .1, transparent: true, opacity: .55, depthWrite: false }), wat = new THREE.Mesh(new THREE.CylinderGeometry(R * .96, R * .86, H * .78, 32), wm); wat.position.y = .008 + H * .39; g.add(wat);
  const grains = [], cm = std('#fbfaf6', { r: .3 }); for (let i = 0; i < 12; i++) { const c = box(.007, .007, .007, cm); g.add(c); grains.push({ c, ph: i / 12 + r() * .05, x: (r() - .5) * R, z: (r() - .5) * R, ry: r() * 6 }); }
  const N = 70, spk = new THREE.InstancedMesh(new THREE.SphereGeometry(.0012, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7 }), N), sd = []; spk.frustumCulled = false; g.add(spk);
  for (let i = 0; i < N; i++) sd.push([r() * 6.28, Math.sqrt(r()) * R * .8, .015 + r() * H * .7, r() * 6]);
  const m4 = new THREE.Matrix4();
  g.userData.tick = (t) => { const top = .008 + H * .78;
    grains.forEach(o => { const u = (t * .45 + o.ph) % 1, y = u < .35 ? lerp(H + .09, top, u / .35) : lerp(top, .02, (u - .35) / .65), s = u < .35 ? 1 : Math.max(.001, 1 - (u - .35) / .5);
      o.c.position.set(o.x * .7, y, o.z * .7); o.c.rotation.set(t * 2 + o.ry, o.ry, t); o.c.scale.setScalar(s); o.c.visible = s > .01; });
    sd.forEach(([a, rr, y, ph], i) => { const aa = a + t * .3; m4.makeTranslation(Math.cos(aa) * rr, y + Math.sin(t + ph) * .004, Math.sin(aa) * rr); spk.setMatrixAt(i, m4); }); spk.instanceMatrix.needsUpdate = true; };
  return g; }
Object.assign(ASSETS, { salt_pans: saltPans, salt_mound: saltMound, raker, sluice, vapour, brine_glass: brineGlass });
// ---------- rooftop pack (2026-11-15, plans/bees_roof.mjs): Egyptian flat roof (concrete slab, brick parapet, rebar column stubs, stair house,
// water tanks, satellite dishes, laundry), city skyline, Langstroth hive at real size, stand with ant-moat cans, shade net, water tray, flyway screen,
// ants, damp patch, heat shimmer, beekeeper (white suit + veil) built on a Quaternius person ----------
function slabTex() { return SPR.slab ||= canvasT(512, 512, (c, w, h) => { const r = rng(61); c.fillStyle = '#cdc6b8'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,252,245' : '80,74,64'},${r() * .09})`; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, R = 20 + r() * 70, g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(${r() > .3 ? '120,108,90' : '200,180,140'},${.08 + r() * .1})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - R, y - R, 2 * R, 2 * R); }
  c.strokeStyle = 'rgba(55,50,44,.45)'; for (let k = 0; k < 7; k++) { c.lineWidth = .6 + r(); c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let s = 0; s < 14; s++) { x += (r() - .5) * 26; y += (r() - .3) * 18; c.lineTo(x, y); } c.stroke(); }
  c.strokeStyle = 'rgba(90,85,76,.18)'; c.lineWidth = 2; for (let y = 0; y < h; y += 128) { c.beginPath(); c.moveTo(0, y + 1); c.lineTo(w, y + 1); c.stroke(); } }, [1, 1]); }
function redBrickTex() { return SPR.redBrick ||= canvasT(256, 256, (c, w, h) => { const r = rng(63), rowH = h / 13, bw = w / 4; c.fillStyle = '#9b948a'; c.fillRect(0, 0, w, h);
  for (let row = 0; row < 13; row++) for (let k = -1; k < 5; k++) { const x = k * bw + (row % 2) * bw / 2, sh = (r() - .5) * 30;
    c.fillStyle = `rgb(${165 + sh},${78 + sh * .6},${52 + sh * .4})`; c.fillRect(x + 2, row * rowH + 2, bw - 4, rowH - 3);
    for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(${r() > .5 ? '230,170,130' : '70,30,20'},${r() * .25})`; c.fillRect(x + 2 + r() * (bw - 8), row * rowH + 2 + r() * (rowH - 5), 2 + r() * 5, 1 + r() * 2); } }
  for (let i = 0; i < 600; i++) { c.fillStyle = `rgba(60,50,40,${r() * .08})`; c.fillRect(r() * w, r() * h, 2, 2); } }, [1, 1]); }
function plasterTex(base, seed = 65) { return SPR['pl' + base] ||= canvasT(256, 256, (c, w, h) => { const r = rng(seed); c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,250,240' : '70,60,50'},${r() * .08})`; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 14; i++) { const x = r() * w, L = 40 + r() * 150; const g = c.createLinearGradient(0, 0, 0, L); g.addColorStop(0, 'rgba(80,70,58,.14)'); g.addColorStop(1, 'rgba(80,70,58,0)'); c.fillStyle = g; c.fillRect(x, 0, 3 + r() * 10, L); } }, [1, 1]); }
// one facade bay = 3.5 m wide x 3 m storey: concrete column on the left, beam on top, a shuttered window
function facadeTex(kind) { return SPR['fac' + kind] ||= canvasT(350, 300, (c, w, h) => { const r = rng(kind.length * 7 + 3);
  if (kind === 'brick') { const img = redBrickTex().image; for (let y = 0; y < h; y += 100) for (let x = 0; x < w; x += 100) c.drawImage(img, x, y, 100, 100); }
  else { c.drawImage(plasterTex(kind).image, 0, 0, w, h); }
  const conc = kind === 'brick' ? '#b9b3a8' : 'rgba(0,0,0,0)'; c.fillStyle = conc; c.fillRect(0, 0, 32, h); c.fillRect(0, 0, w, 28);
  if (kind !== 'brick') { c.fillStyle = 'rgba(60,50,40,.12)'; c.fillRect(0, 26, w, 4); }
  const wx = 115, wy = 95, ww = 120, wh = 140; c.fillStyle = '#e8e2d6'; c.fillRect(wx - 6, wy - 6, ww + 12, wh + 14);
  const g = c.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, '#5d7486'); g.addColorStop(.5, '#2c3a46'); g.addColorStop(1, '#4b5d6b'); c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
  c.strokeStyle = '#d9d4c8'; c.lineWidth = 4; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.stroke();
  const shut = ['#4f6b4a', '#7a5a3a', '#5a7a86'][Math.floor(r() * 3)], open = r(); c.fillStyle = shut;
  if (open < .5) { c.fillRect(wx, wy, ww / 2, wh); c.fillStyle = 'rgba(0,0,0,.25)'; for (let y = wy + 6; y < wy + wh; y += 9) c.fillRect(wx, y, ww / 2, 2); }
  c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(wx - 8, wy + wh + 8, ww + 16, 6); }, [1, 1]); }
// rescale BoxGeometry uvs to metres so a tiled texture keeps its real size on every face; v is anchored to the top edge
function boxUV(geo, w, h, d, ux = 1, uy = 1) { const uv = geo.attributes.uv; const span = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * span[f][0] / ux, (uv.getY(i) - 1) * span[f][1] / uy); } uv.needsUpdate = true; return geo; }
function tiled(tex) { const t = tex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.needsUpdate = true; return t; }
function waterTank(p = {}) { const g = new THREE.Group(), R = p.r || .55, H = p.h || 1.1, sh = p.stand ?? .45, metal = std('#5b5e5a', { m: .5, r: .55 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(.045, sh, .045, metal); l.position.set(x * R * .7, sh / 2, z * R * .7); g.add(l); }
  for (const z of [-1, 1]) { const b = box(R * 1.5, .045, .045, metal); b.position.set(0, sh, z * R * .7); g.add(b); const b2 = box(.045, .045, R * 1.5, metal); b2.position.set(z * R * .7, sh, 0); g.add(b2); }
  const tm = std(p.color || '#d8ccb0', { r: .7 }), t = cyl(R, R * .97, H, tm, 28); t.position.y = sh + H / 2; g.add(t);
  for (let k = 1; k < 4; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.005, .012, 6, 32), tm); ring.rotation.x = Math.PI / 2; ring.position.y = sh + H * k / 4; g.add(ring); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R * .98, 28, 8, 0, Math.PI * 2, 0, .5), tm); dome.scale.y = .45; dome.position.y = sh + H; g.add(dome);
  const cap = cyl(.17, .17, .06, std('#c9bc9d', { r: .6 })); cap.position.y = sh + H + R * .45 * .12 + .06; g.add(cap);
  const pipe = cyl(.018, .018, sh + .2, std('#8a8d88', { m: .6, r: .4 })); pipe.position.set(R * .85, (sh + .2) / 2, 0); g.add(pipe);
  return shadowed(g); }
function dish(p = {}) { const g = new THREE.Group(), R = p.r || .42, m = std('#dedcd6', { r: .45, m: .15 }), dark = std('#4a4a48', { r: .5, m: .4 });
  const pole = cyl(.025, .025, .9, dark); pole.position.y = .45; g.add(pole);
  for (let k = 0; k < 3; k++) { const a = k * 2.09, l = cyl(.015, .015, .5, dark); l.position.set(Math.cos(a) * .18, .2, Math.sin(a) * .18); l.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); g.add(l); }
  const head = new THREE.Group(); head.position.y = .9; head.rotation.x = -(p.tilt ?? .75); g.add(head);
  const cup = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 6, 0, Math.PI * 2, 0, .62), new THREE.MeshStandardMaterial({ color: col('#e4e2dc'), roughness: .45, metalness: .1, side: THREE.DoubleSide }));
  cup.scale.set(R / Math.sin(.62), .35, R / Math.sin(.62)); cup.rotation.x = Math.PI; cup.position.y = .35 * (1 - Math.cos(.62)) + .02; const cw = new THREE.Group(); cw.rotation.x = Math.PI / 2; cw.add(cup); head.add(cw);
  const arm = cyl(.012, .012, R * 1.25, m); arm.position.set(0, -R * .45, R * .55); arm.rotation.x = .95; head.add(arm);
  const lnb = box(.07, .07, .12, dark); lnb.position.set(0, -R * .05, R * 1.05); head.add(lnb);
  return shadowed(g); }
const CLOTH = ['#f2f0ea', '#3e6db5', '#c8463c', '#e8c547', '#ffffff', '#6b8f5a', '#d98bb0', '#2f3a4f', '#e9e1cf'];
function laundry(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 77), L = p.len || 3, H = p.h || 1.8, pm = std('#6d6f6a', { m: .6, r: .45 }), list = [];
  for (const x of [0, L]) { const pst = cyl(.025, .03, H + .05, pm); pst.position.set(x, (H + .05) / 2, 0); g.add(pst); const ft = cyl(.12, .14, .08, std('#a29d92')); ft.position.set(x, .04, 0); g.add(ft); }
  const rope = cyl(.005, .005, L, std('#efece2')); rope.rotation.z = Math.PI / 2; rope.position.set(L / 2, H - .04, 0); g.add(rope);
  const tex = SPR.cloth ||= canvasT(64, 64, (c, w, h) => { const q = rng(5); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${q() * .06})`; c.fillRect(q() * w, q() * h, 1, 2); } });
  let x = .25; while (x < L - .25) { const cw = .3 + r() * .4, ch = r() > .8 ? 1.0 : .45 + r() * .4; if (x + cw > L - .1) break;
    const geo = new THREE.PlaneGeometry(cw, ch, 4, 6); geo.translate(0, -ch / 2, 0); const ps = geo.attributes.position; for (let i = 0; i < ps.count; i++) ps.setZ(i, Math.sin(ps.getX(i) * 9 + r()) * .015);
    geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, color: col(CLOTH[Math.floor(r() * CLOTH.length)]), roughness: .95, side: THREE.DoubleSide }));
    const pv = new THREE.Group(); pv.position.set(x + cw / 2, H - .04, 0); pv.add(m); g.add(pv); list.push({ pv, ph: r() * 6 });
    for (const s of [-1, 1]) { const pin = box(.012, .06, .014, std('#c9a46a')); pin.position.set(x + cw / 2 + s * cw * .4, H - .05, 0); g.add(pin); } x += cw + .08 + r() * .12; }
  g.userData.tick = t => list.forEach(o => { o.pv.rotation.x = .1 + Math.sin(t * 1.7 + o.ph) * .14 + Math.sin(t * 3.1 + o.ph * 2) * .04; o.pv.rotation.z = Math.sin(t * 1.3 + o.ph) * .03; });
  return shadowed(g); }
function rebarStub(m, conc, h) { const g = new THREE.Group(); const c = box(.3, h, .3, conc); c.position.y = h / 2; g.add(c);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const b = cyl(.008, .008, .7, m, 5); b.position.set(x * .1, h + .33, z * .1); b.rotation.set(z * .06, 0, x * .07); g.add(b); } return g; }
function rooftop(p = {}) { // flat Egyptian roof on top of the island (island top = slab at y 0): parapets (front low for the cutaway), facade down the sides
  const g = new THREE.Group(), w = p.w || 10, d = p.d || 8, D = p.depth ?? 3.2, ph = p.parapet ?? 1, t = .2, low = p.front === 'full' ? ph : (p.frontH ?? .22);
  // p.tiles: plain glazed ceramic floor tiles (square grid with thin grout lines) instead of concrete
  const tileMap = p.tiles ? canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#c9b8a0'; c.fillRect(0, 0, w, h); const n = 4, q = w / n, r0 = rng(5);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 0.94 + r0() * .08; c.fillStyle = `rgb(${Math.round(214 * v)},${Math.round(199 * v)},${Math.round(176 * v)})`; c.fillRect(i * q + 3, j * q + 3, q - 6, q - 6); } }, [Math.max(1, Math.round((p.w || 10) / 2)), Math.max(1, Math.round((p.d || 8) / 2))]) : null;
  const slabM = new THREE.MeshStandardMaterial(tileMap ? { map: tileMap, color: col('#ffffff'), roughness: .35, metalness: 0 } : { map: tiled(slabTex()), color: col(p.slabTint || '#ffffff'), roughness: .95 });
  const slab = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, .12, d), w, .12, d, 4, 4), slabM); slab.position.y = -.055; g.add(slab);
  if (p.facade !== false) { const fm = new THREE.MeshStandardMaterial({ map: tiled(facadeTex(p.facade || '#d8c3a0')), roughness: .92 });
    const fb = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w + .04, D, d + .04), w + .04, D, d + .04, 3.5, 3), [fm, fm, new THREE.MeshBasicMaterial({ visible: false }), new THREE.MeshBasicMaterial({ visible: false }), fm, fm]);
    fb.position.y = -D / 2 - .06; g.add(fb); }
  const brick = new THREE.MeshStandardMaterial({ map: tiled(redBrickTex()), roughness: .93 }), conc = new THREE.MeshStandardMaterial({ map: tiled(plasterTex('#bdb7ab', 67)), roughness: .9 });
  const wall = (len, hh, x, z, alongZ) => { const ww = alongZ ? t : len, dd = alongZ ? len : t; const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(ww, hh, dd), ww, hh, dd, 1, 1), hh > .5 ? brick : conc); m.position.set(x, hh / 2, z); g.add(m);
    const cap = box(ww + .06, .06, dd + .06, conc); cap.position.set(x, hh + .03, z); g.add(cap); };
  wall(w, ph, 0, -d / 2 + t / 2, false); wall(d - 2 * t, ph, -w / 2 + t / 2, 0, true); wall(d - 2 * t, p.rightH ?? ph, w / 2 - t / 2, 0, true); wall(w, low, 0, d / 2 - t / 2, false);
  if (p.rebar !== false) { const rm = std('#7b4a2c', { r: .7, m: .3 });
    for (const [x, z, hh] of [[-w / 2 + .15, -d / 2 + .15, ph + .3], [w / 2 - .15, -d / 2 + .15, ph + .3], [-w / 2 + .15, d / 2 - .15, low + .25], [w / 2 - .15, d / 2 - .15, low + .25], [0, -d / 2 + .15, ph + .3]]) {
      const s = rebarStub(rm, conc, hh); s.position.set(x, 0, z); g.add(s); } }
  if (p.stair) { const S = p.stair, sw = S.w || 2.4, sd = S.d || 2.6, sh = S.h || 2.5, pm = new THREE.MeshStandardMaterial({ map: tiled(plasterTex(S.color || '#d6c4a4', 69)), roughness: .92 });
    const hs = new THREE.Mesh(boxUV(new THREE.BoxGeometry(sw, sh, sd), sw, sh, sd, 1.5, 1.5), pm); hs.position.set(S.x, sh / 2, S.z); g.add(hs);
    const top = box(sw + .2, .14, sd + .2, conc); top.position.set(S.x, sh + .07, S.z); g.add(top);
    const door = box(.92, 2.05, .05, std(S.door || '#3f6f78', { r: .5, m: .3 })); door.position.set(S.x - sw * .18, 1.025, S.z + sd / 2 + .02); g.add(door);
    for (const y of [.55, 1.45]) { const pn = box(.72, .6, .02, std('#355f67', { r: .5, m: .3 })); pn.position.set(S.x - sw * .18, y, S.z + sd / 2 + .055); g.add(pn); }
    const hd = box(.12, .03, .04, std('#c8c2b0', { m: .8, r: .3 })); hd.position.set(S.x - sw * .18 + .33, 1.05, S.z + sd / 2 + .07); g.add(hd);
    const fr = box(1.02, .08, .07, conc); fr.position.set(S.x - sw * .18, 2.09, S.z + sd / 2 + .03); g.add(fr);
    const win = box(.05, .5, .6, std('#2e3a44', { r: .2, m: .3 })); win.position.set(S.x - sw / 2 - .01, 1.7, S.z); g.add(win);
    for (let k = -2; k <= 2; k++) { const bar = cyl(.008, .008, .5, std('#3a3a38', { m: .6 })); bar.position.set(S.x - sw / 2 - .04, 1.7, S.z + k * .11); g.add(bar); }
    if (S.tank !== false) { const tk = waterTank({ color: S.tankColor || '#d8ccb0' }); tk.position.set(S.x + .3, sh + .14, S.z - .2); g.add(tk); } }
  for (const [x, y, z, c] of p.tanks || []) { const tk = waterTank({ color: c }); tk.position.set(x, y, z); g.add(tk); }
  for (const [x, z, ry, tilt] of p.dishes || []) { const ds = dish({ tilt }); ds.position.set(x, 0, z); ds.rotation.y = ry || 0; g.add(ds); }
  for (const [x, z, len, ry, seed] of p.laundry || []) { const l = laundry({ len, seed }); l.position.set(x, 0, z); l.rotation.y = ry || 0; g.add(l); }
  return shadowed(g); }
function city(p = {}) { // skyline of Cairo-like blocks: red brick with concrete frames or plaster, rebar stubs, tanks and dishes on near roofs, a minaret
  const g = new THREE.Group(), r = rng(p.seed || 81), gy = p.ground ?? -4.4, kinds = ['brick', 'brick', '#d8c3a0', '#e2cf9e', '#d9b3a0', '#cfcac0', 'brick'];
  const mats = Object.fromEntries(kinds.map(k => [k, new THREE.MeshStandardMaterial({ map: tiled(facadeTex(k)), roughness: .93 })])), topM = new THREE.MeshStandardMaterial({ map: tiled(slabTex()), roughness: .95 }), hide = new THREE.MeshBasicMaterial({ visible: false });
  const avoid = p.avoid || [], placed = [], N = p.count || 38, items = { col: [], bar: [], tank: [], dishes: [] };
  for (let tries = 0; placed.length < N && tries < 900; tries++) {
    const a = r() * Math.PI * 2, R = (p.r0 || 15) + Math.pow(r(), .8) * ((p.r1 || 70) - (p.r0 || 15)), x = Math.sin(a) * R, z = Math.cos(a) * R, w = 7 + r() * 8, d = 7 + r() * 8;
    if (avoid.some(([x0, x1, z0, z1]) => x + w / 2 > x0 && x - w / 2 < x1 && z + d / 2 > z0 && z - d / 2 < z1)) continue;
    if (placed.some(b => Math.abs(b.x - x) < (b.w + w) / 2 + 1.5 && Math.abs(b.z - z) < (b.d + d) / 2 + 1.5)) continue;
    const front = z > 3 && Math.abs(x) < z * 1.6, top = front ? -1.2 - r() * 3 : -2.5 + r() * (R > 35 ? 16 : 10), H = top - gy, k = kinds[Math.floor(r() * kinds.length)];
    const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, H, d), w, H, d, 3.5, 3), [mats[k], mats[k], topM, hide, mats[k], mats[k]]); m.position.set(x, gy + H / 2, z); g.add(m); placed.push({ x, z, w, d });
    const cap = box(w + .1, .9, .2, mats['#cfcac0']); cap.position.set(x, top + .45, z - d / 2 + .1); g.add(cap); const cap2 = box(.2, .9, d, mats['#cfcac0']); cap2.position.set(x - w / 2 + .1, top + .45, z); g.add(cap2);
    if (R < 40) { if (r() > .35) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { items.col.push([x + sx * (w / 2 - .2), top, z + sz * (d / 2 - .2)]); }
      if (r() > .3) items.tank.push([x + (r() - .5) * w * .5, top, z + (r() - .5) * d * .5, r() > .5 ? '#d8ccb0' : '#2c2c2c']);
      if (r() > .4) items.dishes.push([x + (r() - .5) * w * .6, top, z + (r() - .5) * d * .6]); } }
  const conc = std('#bdb7ab'), rm = std('#7b4a2c', { r: .7, m: .3 }), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
  const ci = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .5, .3), conc, items.col.length), bi = new THREE.InstancedMesh(new THREE.CylinderGeometry(.01, .01, .7, 4), rm, items.col.length * 4);
  items.col.forEach(([x, y, z], i) => { ci.setMatrixAt(i, M4.makeTranslation(x, y + .25, z)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], k) => { Q.setFromEuler(E.set(b * .08, 0, a * .1)); bi.setMatrixAt(i * 4 + k, M4.compose(V.set(x + a * .1, y + .82, z + b * .1), Q, SC)); }); });
  g.add(ci, bi); for (const [x, y, z, c] of items.tank) { const tk = waterTank({ color: c, stand: .3 }); tk.position.set(x, y, z); g.add(tk); }
  for (const [x, y, z] of items.dishes) { const ds = dish({ r: .38 }); ds.position.set(x, y, z); ds.rotation.y = Math.PI + (r() - .5) * .6; g.add(ds); }
  if (p.minaret !== false) { const [mx, mz] = p.minaret || [-24, -42], st = std('#e3d9c4', { r: .8 }), mg = new THREE.Group(); mg.position.set(mx, gy, mz);
    const b1 = cyl(1.5, 1.6, 14 - gy, st, 8); b1.position.y = (14 - gy) / 2; mg.add(b1); const bal = cyl(2.1, 1.6, .5, st, 8); bal.position.y = 14 - gy; mg.add(bal);
    const b2 = cyl(1.05, 1.15, 6, st, 8); b2.position.y = 17 - gy; mg.add(b2); const bal2 = cyl(1.5, 1.1, .4, st, 8); bal2.position.y = 20 - gy; mg.add(bal2);
    const b3 = cyl(.7, .75, 3.5, st, 12); b3.position.y = 21.8 - gy; mg.add(b3); const cone = new THREE.Mesh(new THREE.ConeGeometry(.8, 2.6, 12), st); cone.position.y = 24.8 - gy; mg.add(cone);
    const ball = sph(.22, std('#c9a24e', { m: .7, r: .3 })); ball.position.y = 26.3 - gy; mg.add(ball); g.add(mg); }
  g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; } }); return g; }
function beeHive(p = {}) { // Langstroth hive at real size: bottom board with landing lip (entrance faces +x), 2 deep boxes 50.8 x 41.3 x 24.4 cm, telescoping lid. modes: { vent 0..1 }
  const g = new THREE.Group(), L = .508, W = .413, BH = .244, n = p.boxes || 2, r = rng(p.seed || 3);
  const wood = new THREE.MeshStandardMaterial({ map: TEX.wood, color: col('#c99b66'), roughness: .85 }), paint = c => new THREE.MeshStandardMaterial({ map: TEX.wood, color: col(c), roughness: .8 });
  const bb = box(L + .08, .05, W, wood); bb.position.set(.04, .025, 0); g.add(bb);
  const slot = box(.01, .018, W * .85, std('#120b05')); slot.position.set(L / 2 + .002, .059, 0); g.add(slot);
  for (let i = 0; i < n; i++) { const c = ['#efece2', '#e6e0cf', '#f1eee6'][i % 3], m = paint(c), y0 = .05 + i * BH, b = box(L, BH - .004, W, m); b.position.y = y0 + BH / 2; g.add(b);
    for (const s of [-1, 1]) { const hh = box(.12, .035, .012, std('#3a2a1a')); hh.position.set(0, y0 + BH * .68, s * (W / 2 + .001)); g.add(hh); const hx = box(.012, .035, .12, std('#3a2a1a')); hx.position.set(s * (L / 2 + .001), y0 + BH * .68, 0); if (s < 0 || i > 0) g.add(hx); }
    const seam = box(L + .004, .006, W + .004, std('#8a7458')); seam.position.y = y0 + BH; g.add(seam); }
  const lidG = new THREE.Group(), topY = .05 + n * BH; lidG.position.y = topY; g.add(lidG);
  const lidB = box(L + .05, .07, W + .05, paint('#e9e5da')); lidB.position.y = .03; lidG.add(lidB); const tin = box(L + .07, .012, W + .07, std('#c3c7ca', { m: .75, r: .35 })); tin.position.y = .071; lidG.add(tin);
  const shims = []; for (const z of [-1, 1]) { const s = box(.08, .02, .03, wood); s.position.set(-L / 2 + .06, .01, z * W * .35); s.visible = false; lidG.add(s); shims.push(s); }
  g.userData.tick = () => { const v = modeLerp(g, { vent: 0, ...p }, 'vent'); lidG.position.y = topY + v * .022; shims.forEach(s => { s.visible = v > .05; s.position.y = -v * .011; }); };
  return shadowed(g); }
function hiveStand(p = {}) { // angle-iron stand, each leg in a tin can of water (ant moat) on a brick. Top at h.
  const g = new THREE.Group(), h = p.h || .5, L = p.l || .56, W = p.w || .46, mt = std('#3d4a3b', { m: .55, r: .5 }), brick = std('#a24c30', { r: .9 });
  const can = std('#b9bdbf', { m: .8, r: .35 }), wat = new THREE.MeshStandardMaterial({ color: col('#7aa6b0'), roughness: .08, metalness: .1 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = x * L / 2, pz = z * W / 2;
    const br = box(.22, .065, .105, brick); br.position.set(px, .0325, pz); g.add(br);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .09, 18, 1, true), new THREE.MeshStandardMaterial({ color: col('#b9bdbf'), metalness: .8, roughness: .35, side: THREE.DoubleSide })); c.position.set(px, .11, pz); g.add(c);
    const cb = cyl(.055, .055, .004, can); cb.position.set(px, .067, pz); g.add(cb); const wv = cyl(.052, .052, .004, wat, 18); wv.position.set(px, .135, pz); g.add(wv);
    const leg = box(.035, h - .08, .035, mt); leg.position.set(px, .08 + (h - .08) / 2, pz); g.add(leg); }
  for (const z of [-1, 1]) { const b = box(L + .04, .035, .035, mt); b.position.set(0, h - .018, z * W / 2); g.add(b); }
  for (const x of [-1, 1]) { const b = box(.035, .035, W + .04, mt); b.position.set(x * L / 2, h - .018, 0); g.add(b); }
  const br = box(L, .025, .025, mt); br.position.set(0, h * .45, W / 2); g.add(br); const br2 = br.clone(); br2.position.z = -W / 2; g.add(br2);
  return shadowed(g); }
function shadeNet(p = {}) { // knitted shade cloth on a galvanised pipe frame, open sides; casts dappled shade
  const g = new THREE.Group(), w = p.w || 1.8, d = p.d || 1.8, h = p.h || 2, pm = std('#a9adaf', { m: .7, r: .4 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const po = cyl(.022, .022, h, pm, 10); po.position.set(x * w / 2, h / 2, z * d / 2); g.add(po);
    const ft = box(.18, .12, .18, std('#b5afa3')); ft.position.set(x * w / 2, .06, z * d / 2); g.add(ft); }
  for (const z of [-1, 1]) { const rl = cyl(.02, .02, w, pm, 8); rl.rotation.z = Math.PI / 2; rl.position.set(0, h, z * d / 2); g.add(rl); const rz = cyl(.02, .02, d, pm, 8); rz.rotation.x = Math.PI / 2; rz.position.set(z * w / 2, h, 0); g.add(rz); }
  const tex = SPR.knit ||= canvasT(64, 64, (c, W2, H2) => { c.clearRect(0, 0, W2, H2); c.strokeStyle = '#fff'; c.lineWidth = 5; for (let k = -64; k < 128; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 64, 64); c.stroke(); c.beginPath(); c.moveTo(k + 64, 0); c.lineTo(k, 64); c.stroke(); } });
  const t2 = tex.clone(); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.repeat.set(w * 9, d * 9); t2.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(w + .06, d + .06, 12, 12), ps = geo.attributes.position; for (let i = 0; i < ps.count; i++) { const u = ps.getX(i) / (w / 2), v = ps.getY(i) / (d / 2); ps.setZ(i, -.07 * (1 - u * u) * (1 - v * v)); } geo.computeVertexNormals();
  const net = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t2, color: col(p.color || '#2f4434'), alphaTest: .4, side: THREE.DoubleSide, roughness: .95 })); net.rotation.x = -Math.PI / 2; net.position.y = h + .02; g.add(net);
  g.userData.tick = t => { net.position.y = h + .02 + Math.sin(t * 1.4) * .008; net.rotation.z = Math.sin(t * .9) * .004; };
  return shadowed(g); }
function waterTray(p = {}) { // shallow galvanised basin with a brick and stones standing proud of the water so bees can land and drink; ripples
  const g = new THREE.Group(), R = p.r || .32, H = .07, r = rng(p.seed || 9), gm = new THREE.MeshStandardMaterial({ color: col('#b4b8b9'), metalness: .75, roughness: .38, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R * .9, H, 36, 1, true), gm); wall.position.y = H / 2; g.add(wall); const bot = cyl(R * .9, R * .9, .006, gm, 36); bot.position.y = .003; g.add(bot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, .008, 6, 40), gm); rim.rotation.x = Math.PI / 2; rim.position.y = H; g.add(rim);
  const wat = new THREE.Mesh(new THREE.CircleGeometry(R * .97, 40), new THREE.MeshStandardMaterial({ color: col('#6f9ea4'), roughness: .05, metalness: .2, transparent: true, opacity: .82 })); wat.rotation.x = -Math.PI / 2; wat.position.y = H * .72; g.add(wat);
  const bk = box(.2, .065, .1, std('#a64f33', { r: .9 })); bk.position.set(-.06, .07, .04); bk.rotation.y = .4; g.add(bk);
  const sm = ['#a9a294', '#8f887b', '#c2b9a6', '#7d776c']; for (let i = 0; i < 9; i++) { const a = r() * 6.28, rr = .08 + r() * R * .7, s = .025 + r() * .03, st = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), std(sm[i % 4], { r: .95 }));
    st.scale.set(1.3, .8 + r() * .4, 1); st.position.set(Math.cos(a) * rr, H * .72 + s * .2, Math.sin(a) * rr); st.rotation.set(r(), r() * 6, r()); g.add(st); }
  const rings = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = H * .72 + .002; g.add(m); rings.push({ m, ph: i / 4, x: 0, z: 0 }); }
  g.userData.tick = t => rings.forEach((o, i) => { const u = (t * .55 + o.ph) % 1; if (u < .03) { const q = rng(Math.floor(t * .55 + o.ph) * 13 + i); const a = q() * 6.28, rr = q() * R * .7; o.x = Math.cos(a) * rr; o.z = Math.sin(a) * rr; }
    o.m.position.x = o.x; o.m.position.z = o.z; o.m.scale.setScalar(.005 + u * .07); o.m.material.opacity = .45 * (1 - u); });
  return shadowed(g); }
function beeScreen(p = {}) { // flyway barrier: vertical wooden boards on two posts, runs along x. Bees climb over it.
  const g = new THREE.Group(), w = p.w || 2.4, h = p.h || 2, r = rng(p.seed || 15), n = Math.floor(w / .155);
  for (const x of [-w / 2, w / 2]) { const po = box(.08, h + .05, .08, woodMat()); po.position.set(x, (h + .05) / 2, -.05); g.add(po); const blk = box(.3, .2, .3, std('#b8b2a6')); blk.position.set(x, .1, -.05); g.add(blk);
    const brace = box(.06, 1.1, .06, woodMat()); brace.position.set(x, .45, -.4); brace.rotation.x = -.7; g.add(brace); }
  for (const y of [.35, h - .3]) { const rl = box(w, .07, .05, woodMat()); rl.position.set(0, y, -.04); g.add(rl); }
  for (let i = 0; i < n; i++) { const m = woodMat(); m.color.offsetHSL((r() - .5) * .03, 0, (r() - .5) * .12); const pl = box(.14, h - .1 + (r() - .5) * .04, .02, m); pl.position.set(-w / 2 + .08 + i * .155, .1 + (h - .1) / 2, 0); g.add(pl); }
  return shadowed(g); }
function antTrail(p = {}) { // ants marching along a polyline; points [x,y,z,(nx,ny,nz)] (normal = surface the ant walks on). pingpong: walk out and back
  const g = new THREE.Group(), pts = (p.pts || [[0, 0, 0], [1, 0, 0]]).map(q => ({ v: new THREE.Vector3(q[0], q[1], q[2]), n: new THREE.Vector3(q[3] ?? 0, q[4] ?? 1, q[5] ?? 0).normalize() }));
  const seg = []; let L = 0; for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].v.distanceTo(pts[i + 1].v); seg.push([L, l, i]); L += l; }
  const n = p.count || 20, sc = p.size || .03, sp = p.speed || .05, r = rng(p.seed || 4), ants = [];
  for (let i = 0; i < n; i++) { const h = new THREE.Group(), a = antMesh(false); a.rotation.y = -Math.PI / 2; a.scale.setScalar(sc); h.add(a); g.add(h); ants.push({ h, a, off: i / n + r() * .02, side: (r() - .5) * .025, sp: sp * (.85 + r() * .3) }); }
  const P = new THREE.Vector3(), N = new THREE.Vector3(), F = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), M = new THREE.Matrix4();
  const at = s => { s = Math.max(0, Math.min(L - 1e-4, s)); const sg = seg.find(q => s <= q[0] + q[1]) || seg[seg.length - 1], k = (s - sg[0]) / sg[1], A = pts[sg[2]], B = pts[sg[2] + 1];
    P.copy(A.v).lerp(B.v, k); N.copy(A.n).lerp(B.n, k).normalize(); F.copy(B.v).sub(A.v).normalize(); };
  g.userData.tick = t => ants.forEach((o, i) => { let s = (t * o.sp + o.off * L) % (p.pingpong ? 2 * L : L), back = false; if (s > L) { s = 2 * L - s; back = true; }
    at(s); if (back) F.negate(); X.crossVectors(N, F).normalize(); Y.crossVectors(F, X);
    o.h.position.copy(P).addScaledVector(X, o.side).addScaledVector(N, .003); M.makeBasis(X, Y, F); o.h.quaternion.setFromRotationMatrix(M);
    o.a.userData.legs?.forEach(([l, j, sd]) => { l.rotation.z = Math.sin(t * 28 + j * 2 + i) * .5; }); });
  return g; }
function dampPatch(p = {}) { // dark wet stain on the slab with a mouldy edge; spreads in over 2 s
  const R = p.r || .7, tex = SPR.damp ||= canvasT(256, 256, (c, w, h) => { const q = rng(19); for (let i = 0; i < 70; i++) { const x = w / 2 + (q() - .5) * w * .55, y = h / 2 + (q() - .5) * h * .55, rr = 18 + q() * 50, gr = c.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(40,36,30,.32)'); gr.addColorStop(.7, 'rgba(40,36,30,.18)'); gr.addColorStop(1, 'rgba(40,36,30,0)'); c.fillStyle = gr; c.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    for (let i = 0; i < 60; i++) { const a = q() * 6.28, rr = w * (.22 + q() * .14); c.fillStyle = `rgba(70,85,50,${.15 + q() * .2})`; c.beginPath(); c.arc(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr, 2 + q() * 6, 0, 7); c.fill(); } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: .4, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = .006; m.receiveShadow = true; const g = new THREE.Group(); g.add(m);
  g.userData.tick = (t, age) => { const k = .45 + .55 * easeIO(clamp((age ?? 0) / 2.2)); m.scale.set(k, k, 1); m.material.opacity = .4 + .6 * clamp((age ?? 0) / 1.2); }; return g; }
function shimmerTex() { return SPR.shimmer ||= canvasT(64, 256, (c, w, h) => { c.clearRect(0, 0, w, h); const q = rng(29); for (let i = 0; i < 9; i++) { c.strokeStyle = `rgba(255,255,255,${.25 + q() * .35})`; c.lineWidth = 2 + q() * 5; c.beginPath(); const x0 = q() * w;
  for (let y = 0; y <= h; y += 8) c.lineTo(x0 + Math.sin(y * .08 + i) * 6, y); c.stroke(); } const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.3, 'rgba(0,0,0,0)'); gr.addColorStop(.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = gr; c.fillRect(0, 0, w, h); }); }
function heatHaze(p = {}) { // rising heat shimmer over a hot slab: soft wavy warm sprites that scroll up and breathe
  const g = new THREE.Group(), r = rng(p.seed || 31), W = p.w || 4, D = p.d || 3, list = [];
  for (let i = 0; i < (p.count || 14); i++) { const tx = shimmerTex().clone(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.needsUpdate = true;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: col(p.color || '#ffe2b8'), transparent: true, opacity: 0, depthWrite: false, fog: false })); g.add(s);
    list.push({ s, tx, x: (r() - .5) * W, z: (r() - .5) * D, w: .8 + r() * 1.2, h: 1.2 + r() * 1.2, ph: r() * 6, k: .25 + r() * .3 }); }
  g.userData.tick = (t, age) => { const a = clamp((age ?? 0) / 1.2); list.forEach(o => { o.tx.offset.y = -t * o.k; o.tx.offset.x = Math.sin(t * .7 + o.ph) * .05;
    o.s.position.set(o.x + Math.sin(t * .5 + o.ph) * .1, o.h / 2 + .05, o.z); o.s.scale.set(o.w * (1 + Math.sin(t * 1.3 + o.ph) * .08), o.h, 1); o.s.material.opacity = a * (p.opacity ?? .2) * (.7 + .3 * Math.sin(t * 2 + o.ph)); }); };
  return g; }
function roofPerson(p = {}) { // Quaternius person (static) with a lowered-arm pose; mode { wave:true } lifts the right arm and waves; beekeeper: white suit + veiled hat
  const w = ASSETS.glb({ ...p, model: p.model || 'modular_men/Casual', height: p.height || 1.75, wave: true }), arm = w.userData.wave; delete w.userData.wave; const rest = arm ? arm.rotation.x : 0;
  if (p.suit) w.traverse(m => { if (!m.isMesh) return; m.material = [].concat(m.material).map(mt => /Skin|Eye|Brow|Moustache|Hair/i.test(mt.name) ? mt : Object.assign(mt.clone(), { color: col(/Black|Grey|Brown2/i.test(mt.name) ? '#3a3632' : '#efeee8') })); if (m.material.length === 1) m.material = m.material[0]; });
  if (p.veil) { const H = p.height || 1.75, hm = std('#efe9d6', { r: .85 }), hat = new THREE.Group(); hat.position.y = H - .07; w.add(hat);
    const brim = cyl(.25, .25, .012, hm, 28); hat.add(brim); const crown = cyl(.115, .125, .12, hm, 20); crown.position.y = .06; hat.add(crown);
    const veil = new THREE.Mesh(new THREE.CylinderGeometry(.245, .19, .34, 28, 1, true), new THREE.MeshStandardMaterial({ color: col('#262626'), transparent: true, opacity: .62, side: THREE.DoubleSide, depthWrite: false, roughness: .9 }));
    veil.position.y = -.17; hat.add(veil); const col2 = new THREE.Mesh(new THREE.TorusGeometry(.17, .03, 8, 24), hm); col2.rotation.x = Math.PI / 2; col2.position.y = -.34; hat.add(col2); shadowed(hat); }
  const base = w.userData.tick; w.userData.tick = (t, age) => { base(t, age); if (!arm) return; const mo = w.userData.mode || {}; const wv = mo.wave ?? p.waving;
    arm.rotation.x = wv ? .75 + Math.sin(t * 6) * .35 : rest; w.position.y = (mo.path || p.path) ? Math.abs(Math.sin(t * 5)) * .02 : 0; };
  return w; }
Object.assign(ASSETS, { rooftop, city, water_tank: waterTank, sat_dish: dish, laundry, bee_hive: beeHive, hive_stand: hiveStand, shade_net: shadeNet, water_tray: waterTray, bee_screen: beeScreen, ant_trail: antTrail, damp_patch: dampPatch, heat_haze: heatHaze, roof_person: roofPerson });

// ================= Delta buffalo pack (2026-11-16, plans/buffalo.mjs) =================
// Water buffalo built on the library Bull (dark slate hide that goes dry -> wet glossy -> mud coated, custom flat backswept horns,
// distance-synced walk so hooves do not slide, eased stop/start with a settle bounce, breathing/panting, tail swish with follow-through,
// heat shimmer, steam, ripples, splashes, a fly swarm), the canal with banks, reeds, a mud wallow, a cattle egret and a farmer in a galabeya
// whose sandals are planted on the ground step by step. Shared ground height: renderer/buffalo_ground.js.
const LINK = {}; // per-frame hand-off between pack objects (the egret rides the buffalo, the hose aims at it)
const sEase = u => (1 - Math.cos(Math.PI * clamp(u))) / 2;
const angTo = (a, b) => a + ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
// keys [t, x, z, sink, yaw?] -> eased stop-to-stop moves; the heading turns during the first part of a move; dist counts turning steps too
function makeTrack(keys, turnCost = .5) {
  const K = keys.map(k => ({ t: k[0], x: k[1], z: k[2], s: k[3] ?? 0, yaw: k[4] })), seg = []; let yp = K[0].yaw ?? (K[1] ? Math.atan2(K[1].x - K[0].x, K[1].z - K[0].z) : 0), cum = 0, lastEnd = K[0].t;
  for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z);
    const y1 = angTo(yp, b.yaw != null ? b.yaw : len > .05 ? Math.atan2(b.x - a.x, b.z - a.z) : yp), w = len + Math.abs(y1 - yp) * turnCost;
    seg.push({ a, b, len, y0: yp, y1, w, cum, lastEnd }); cum += w; yp = y1; if (w > .05) lastEnd = b.t; }
  const ev = t => { if (!seg.length || t <= K[0].t) return { x: K[0].x, z: K[0].z, s: K[0].s, yaw: seg[0]?.y0 ?? yp, dist: 0, speed: 0, since: 9 };
    const i = seg.findIndex(q => t < q.b.t); if (i < 0) { const q = seg[seg.length - 1]; return { x: q.b.x, z: q.b.z, s: q.b.s, yaw: q.y1, dist: cum, speed: 0, since: t - (q.w > .05 ? q.b.t : q.lastEnd) }; }
    const q = seg[i], D = q.b.t - q.a.t, u = (t - q.a.t) / D, e = sEase(u);
    return { x: lerp(q.a.x, q.b.x, e), z: lerp(q.a.z, q.b.z, e), s: lerp(q.a.s, q.b.s, e), yaw: lerp(q.y0, q.y1, easeIO(u / .45)), dist: q.cum + q.w * e,
      speed: q.w / D * Math.PI / 2 * Math.sin(Math.PI * u), since: q.w > .05 ? -1 : t - q.lastEnd }; };
  ev.atDist = (Dd, tNow) => { // time when the walker had (or will have) walked Dd; bisection over the track
    const t0 = K[0].t, t1 = K[K.length - 1].t; if (Dd <= 0) return t0; if (Dd >= cum) return t1; let lo = t0, hi = t1;
    for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; if (ev(m).dist < Dd) lo = m; else hi = m; } return hi; };
  ev.total = cum; return ev; }
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m4 = new THREE.Matrix4();
function bendBone(b, axisW, ang) { if (!b || !ang) return; b.getWorldQuaternion(_q1); _v1.copy(axisW).applyQuaternion(_q1.invert()).normalize(); _q2.setFromAxisAngle(_v1, ang); b.quaternion.multiply(_q2); }
const groundOf = p => p.ground === 'canal' ? bankH : () => 0;
function softDiscTex() { return SPR.softDisc ||= canvasT(64, 64, (c, w) => { const g2 = c.createRadialGradient(32, 32, 0, 32, 32, 32); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.55, 'rgba(0,0,0,.55)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(0, 0, 64, 64); }); }
function rippleRingTex() { return SPR.ripRing ||= canvasT(128, 128, (c) => { const g2 = c.createRadialGradient(64, 64, 40, 64, 64, 64); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(.7, 'rgba(255,255,255,.9)'); g2.addColorStop(.82, 'rgba(255,255,255,.25)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.fillRect(0, 0, 128, 128); }); }
function contactShadow(rx, rz, op = .5) { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({ map: softDiscTex(), color: 0x000000, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, fog: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.userData.op = op; return m; }

// ---- buffalo hide: slate-grey skin with sparse hair; uniforms drive dry dust, wet gloss (top dries first) and a mud coat (wet dark -> dry pale, cracked)
function hideShader(mt, U, k) {
  mt.roughness = .8; mt.metalness = 0; mt.envMapIntensity = .55; mt.flatShading = false; const key = 'hide_' + mt.uuid;
  mt.onBeforeCompile = sh => { Object.assign(sh.uniforms, U); sh.uniforms.uK = { value: k };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj; varying vec3 vWB;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = transformed;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvWB = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vObj; varying vec3 vWB; uniform float uK, uWet, uMud, uMudDry, uDust, uBaseY, uH;
float bh3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float bn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(bh3(i), bh3(i + vec3(1,0,0)), f.x), mix(bh3(i + vec3(0,1,0)), bh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bh3(i + vec3(0,0,1)), bh3(i + vec3(1,0,1)), f.x), mix(bh3(i + vec3(0,1,1)), bh3(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 hq = vObj * uK; float hStr = bn3(hq * vec3(300., 90., 300.)), hTuft = bn3(hq * 30.), hBlot = bn3(hq * 8.), hFine = bn3(hq * 700.);
  diffuseColor.rgb *= .7 + .55 * (hStr * .3 + hTuft * .4 + hBlot * .3) + .18 * (hFine - .5);
  float fold = 1. - smoothstep(0., .06, abs(bn3(hq * vec3(6., 60., 6.)) - .5)); diffuseColor.rgb *= 1. - .25 * fold; // skin creases
  float hN = clamp((vWB.y - uBaseY) / uH, 0., 1.);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.19, .16, .13), uDust * smoothstep(.5, .95, hN) * (.25 + .5 * hTuft) * (1. - uWet));
  float wetM = clamp((uWet * 1.25 - (hN * .8 + hBlot * .35)) * 8., 0., 1.);
  diffuseColor.rgb *= 1. - .5 * wetM;
  float mN = bn3(hq * 13.) * .6 + bn3(hq * 45.) * .4;
  float mudM = clamp((uMud * 1.3 - (hN * .75 + mN * .5)) * 10., 0., 1.);
  float crack = 1. - smoothstep(0., .035, abs(bn3(hq * 55.) - .5));
  vec3 mudC = mix(vec3(.045, .03, .018), vec3(.17, .12, .075), uMudDry * (.55 + .45 * bn3(hq * 25.))) * (.8 + .4 * bn3(hq * 25.));
  mudC *= 1. - .45 * uMudDry * crack;
  diffuseColor.rgb = mix(diffuseColor.rgb, mudC, mudM);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, .4, wetM * (1. - mudM));
  roughnessFactor = mix(roughnessFactor, mix(.5, .97, uMudDry), mudM);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float fr = pow(1. - abs(dot(normal, normalize(vViewPosition))), 3.); totalEmissiveRadiance += vec3(.03, .034, .04) * fr * (1. - mudM * .8); }`); };
  mt.customProgramCacheKey = () => key; mt.needsUpdate = true; }
// flat, ridged, crescent horn swept back from the poll (head frame: x lateral, y face-up, z face-forward)
function hornGeo(side) { const P = [[.06, .09, -.02], [.16, .125, -.08], [.25, .125, -.18], [.30, .095, -.30], [.29, .085, -.42], [.22, .13, -.51]]
    .map(([l, u, f]) => new THREE.Vector3(l * side, .8 * u + .6 * f, -.6 * u + .8 * f)); // rest-pose world offsets (lateral, up, forward) -> head frame
  const cur = new THREE.CatmullRomCurve3(P), NS = 44, NR = 12, pos = [], colr = [], idx = [], c0 = col('#7a736b'), c1 = col('#1c1916'), c = new THREE.Color();
  const Yh = new THREE.Vector3(0, .8, .6);
  for (let i = 0; i <= NS; i++) { const u = i / NS, p0 = cur.getPointAt(u), T = cur.getTangentAt(u), N1 = new THREE.Vector3().crossVectors(T, Yh).normalize(), N2 = new THREE.Vector3().crossVectors(N1, T).normalize();
    const r = (.052 * Math.pow(1 - u, .85) + .006) * (1 + .07 * Math.sin(u * 70) * (1 - u)); c.copy(c0).lerp(c1, Math.pow(u, .7));
    for (let j = 0; j < NR; j++) { const a = j / NR * Math.PI * 2, q = p0.clone().addScaledVector(N1, Math.cos(a) * r).addScaledVector(N2, Math.sin(a) * r * .55); pos.push(q.x, q.y, q.z); colr.push(c.r, c.g, c.b); } }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, b = i * NR + (j + 1) % NR, d = a + NR, e = b + NR; if (side > 0) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d); }
  const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g2.setIndex(idx); g2.computeVertexNormals(); return g2; }

function buffaloA(p = {}) {
  const g = new THREE.Group(), src = GLB['animals_pack/Bull']; if (!src) return g;
  const H = p.height || 1.65, o = skClone(src.scene); o.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(o, true), s = H / (bb.max.y - bb.min.y);
  o.scale.setScalar(s); o.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
  const mover = new THREE.Group(), roller = new THREE.Group(), shape = new THREE.Group(); g.add(mover); mover.add(roller); roller.position.y = .8; roller.add(shape); shape.position.y = -.8; shape.add(o);
  shape.scale.set(1.14, .97, 1.05); // buffalo: wider barrel, a little lower, longer than the bull
  const U = { uWet: { value: 0 }, uMud: { value: 0 }, uMudDry: { value: 0 }, uDust: { value: .6 }, uBaseY: { value: 0 }, uH: { value: H } };
  o.traverse(m => { if (!m.isMesh) return; m.frustumCulled = false; m.castShadow = m.receiveShadow = true; m.geometry.computeBoundingBox();
    const k = 1 / Math.max(1e-4, m.geometry.boundingBox.max.y - m.geometry.boundingBox.min.y);
    m.material = [].concat(m.material).map(mt => { const c = mt.clone(), n = mt.name || '';
      if (/Horn/.test(n)) { c.visible = false; return c; }
      if (/Main_Light/.test(n)) c.color.set('#3b3a3b'); else if (/Main/.test(n)) c.color.set('#353436'); else if (/Muzzle/.test(n)) c.color.set('#232120'); else if (/Hoove/.test(n)) c.color.set('#26221e');
      if (/Main|Muzzle/.test(n)) hideShader(c, U, k); return c; });
    if (m.material.length === 1) m.material = m.material[0]; });
  const hornM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: 0 }), horns = new THREE.Group(); g.add(horns);
  for (const sd of [1, -1]) { const hm = new THREE.Mesh(hornGeo(sd), hornM); hm.castShadow = true; horns.add(hm); }
  // animation: every clip plays, weights and times are set from t each frame (stateless, so any frame renders alone)
  const mixer = new THREE.AnimationMixer(o), acts = {};
  for (const c of src.animations) { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); acts[c.name.replace(/^.*\|/, '')] = a; }
  const B = n => o.getObjectByName(n), bones = { neck: B('Neck1'), head: B('Head'), headEnd: B('Head_end'), t2: B('Torso2'), t3: B('Torso3'), torso: B('Torso'), tail: [1, 2, 3, 4, 5, 6, 7].map(i => B('Tail' + i)) };
  const tweak = [bones.neck, bones.head, ...bones.tail].filter(Boolean), restQ = tweak.map(b => b.quaternion.clone());
  // walk speed of the clip (m per clip second), measured from the planted front hoof, so the gait matches the ground speed (no sliding)
  let vClip = .95; const foot = B('FrontLowerLegL_end');
  if (acts.Walk && foot) { const T = acts.Walk.getClip().duration, P = []; acts.Walk.setEffectiveWeight(1);
    for (let i = 0; i <= 48; i++) { acts.Walk.time = i / 48 * T; mixer.update(0); g.updateMatrixWorld(true); foot.getWorldPosition(_v1); P.push([_v1.y, _v1.z]); }
    acts.Walk.setEffectiveWeight(0); const ym = Math.min(...P.map(q => q[0])), vs = [];
    for (let i = 1; i <= 48; i++) if (P[i][0] < ym + .02 * H && P[i - 1][0] < ym + .02 * H) vs.push(-(P[i][1] - P[i - 1][1]) / (T / 48));
    vs.sort((a, b2) => a - b2); if (vs.length > 3 && vs[vs.length >> 1] > .2) vClip = vs[vs.length >> 1]; console.warn('buffalo walk clip ground speed', vClip.toFixed(3)); }
  const TR = makeTrack(p.track || [[0, 0, 0, 0, 0]]), gH = groundOf(p), waters = p.waters || [], muds = p.muds || [];
  const regionAt = (x, z) => { for (const w of waters) if (x > w.box[0] && x < w.box[1] && z > w.box[2] && z < w.box[3]) return { y: w.y, mud: false };
    for (const m of muds) if (((x - m.c[0]) / m.r[0]) ** 2 + ((z - m.c[1]) / m.r[1]) ** 2 < 1) return { y: m.y, mud: true }; return null; };
  const up = new THREE.Vector3(0, 1, 0), lat = new THREE.Vector3(), fwd = new THREE.Vector3(), hp = new THREE.Vector3(), he = new THREE.Vector3(), r = rng(p.seed || 61);
  // contact shadow, heat shimmer, steam, ripples, splashes, flies (all in the plan's world frame: place the buffalo at pos [0,0,0])
  const cs = contactShadow(.62, 1.35, .55); g.add(cs);
  const haze = [], steam = [], rings = [], NF = 70;
  for (let i = 0; i < 7; i++) { const tx = shimmerTex().clone(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.needsUpdate = true;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: col('#ffe9cf'), transparent: true, opacity: 0, depthWrite: false, fog: false })); g.add(sp); haze.push({ sp, tx, a: r() - .5, b: r() - .5, ph: r() * 6, w: .5 + r() * .5, h: .9 + r() * .7, k: .3 + r() * .3 }); }
  for (let i = 0; i < 12; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: col('#ffffff'), transparent: true, opacity: 0, depthWrite: false })); g.add(sp); steam.push({ sp, a: r() - .5, b: r() - .5, ph: r() }); }
  const ringM = new THREE.MeshBasicMaterial({ map: rippleRingTex(), color: col('#eef6f4'), transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringM.clone()); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; g.add(m); rings.push(m); }
  const ND = 90, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .15, transparent: true, opacity: .8 }), ND); drops.frustumCulled = false; g.add(drops);
  const dd = Array.from({ length: ND }, () => ({ ph: r(), up: 1.1 + r() * 1.5, h: .3 + r() * .7, ang: r() * 6.28, sz: .012 + r() * .016, leg: r() < .5 ? 1 : -1, side: r() - .5 }));
  const WCOL = col('#e3efee'), MCOL = col('#3a2c1f');
  const flyB = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), std('#15120f', { r: .5 }), NF), flyW = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8), new THREE.MeshBasicMaterial({ color: 0xd8dde0, transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide }), NF);
  flyB.frustumCulled = flyW.frustumCulled = false; g.add(flyB, flyW);
  const fd = Array.from({ length: NF }, (_, i) => ({ th: i / NF, anchor: r() < .45 ? 0 : r() < .7 ? 1 : 2, ph: [r() * 6, r() * 6, r() * 6], w: [1.3 + r() * 1.6, 1.7 + r() * 1.9, 1.1 + r() * 1.5], rad: [.18 + r() * .3, .08 + r() * .2, .2 + r() * .35], dir: new THREE.Vector3(r() - .5, .4 + r() * .6, r() - .5).normalize() }));
  const mq = new THREE.Quaternion(), ms = new THREE.Vector3(), mp = new THREE.Vector3(), anchorP = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  g.userData.tick = (t) => {
    const mo = g.userData.mode || {}, pm = g.userData.prevMode || {}, ma = g.userData.modeAge ?? 99;
    const val = (k, d) => { const to = mo[k] ?? p[k] ?? d, fr = pm[k] ?? p[k] ?? d; return lerp(fr, to, easeIO(clamp(ma / (mo.dur ?? 1.6)))); };
    const st = TR(t); fwd.set(Math.sin(st.yaw), 0, Math.cos(st.yaw)); lat.set(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
    const hF = gH(st.x + fwd.x * .85, st.z + fwd.z * .85), hB = gH(st.x - fwd.x * .85, st.z - fwd.z * .85);
    const sn = st.since >= 0 && st.since < 2.5 ? st.since : -1, settle = sn >= 0 ? Math.exp(-3.2 * sn) * Math.sin(8.5 * sn) : 0; // follow-through when the heavy body stops
    const pant = val('pant', 0), haz = val('haze', 0), rollA = val('roll', 0), wet = val('wet', 0), mud = val('mud', 0), mudDry = val('mudDry', 0), flies = val('flies', 0), swish = val('swish', 0), stm = val('steam', 0), flyR = val('flyR', 1);
    const baseY = (hF + hB) / 2 + st.s; mover.position.set(st.x, baseY - .03 * settle, st.z); mover.rotation.y = st.yaw;
    roller.rotation.x = -Math.atan2(hF - hB, 1.7) * (st.s < -.3 ? 0 : 1) + .02 * settle; roller.rotation.z = rollA * .3 * Math.sin(t * 1.05) + rollA * .08;
    // clips: walk weight from ground speed, walk time from distance walked; the base clip cross-fades on mode changes (slow in/out)
    const wW = acts.Walk ? clamp(st.speed / .4) : 0, wWalk = wW * wW * (3 - 2 * wW), cB = mo.clip || p.clip || 'Idle', cP = pm.clip || p.clip || 'Idle', xf = easeIO(clamp(ma / .9));
    for (const a of Object.values(acts)) a.setEffectiveWeight(0);
    const setA = (n, w, tm) => { const a = acts[n]; if (!a || w <= 0) return; const D = a.getClip().duration; a.time = ((tm % D) + D) % D; a.setEffectiveWeight(a.getEffectiveWeight() + w); };
    tweak.forEach((b, i) => b.quaternion.copy(restQ[i]));
    setA('Walk', wWalk, st.dist / vClip); setA(cB, (1 - wWalk) * (cB === cP ? 1 : xf), t * .9 + (p.offset || 0)); if (cB !== cP) setA(cP, (1 - wWalk) * (1 - xf), t * .9 + (p.offset || 0));
    mixer.update(0);
    // breathing (slow at rest, fast shallow panting in heat), lower head carriage with the nose out, head tosses at flies, tail swish with lag
    const br = lerp(.012, .03, pant) * Math.sin(Math.PI * 2 * lerp(.3, 1.25, pant) * t);
    if (bones.t2 && bones.t3) { bones.t2.scale.setScalar(1 + br); bones.t3.scale.setScalar(1 / (1 + br)); }
    g.updateMatrixWorld(true);
    bendBone(bones.neck, lat, .08); bendBone(bones.head, lat, -.12 + br * 2);
    if (flies > .25) { const toss = flies * .32 * Math.pow(Math.max(0, Math.sin(t * 1.9)), 8) * (Math.sin(t * .95) > 0 ? 1 : -1); bendBone(bones.neck, up, toss); bendBone(bones.head, fwd, toss * .5); }
    const amp = lerp(.1, .55, swish), fq = lerp(.3, 1.35, swish);
    bones.tail.forEach((b, k) => { bendBone(b, up, amp * .32 * Math.sin(Math.PI * 2 * fq * t - k * .55)); bendBone(b, lat, .04 * Math.sin(Math.PI * 2 * fq * t * .5 - k * .4)); });
    g.updateMatrixWorld(true);
    // horns follow the head bone
    if (bones.head && bones.headEnd) { bones.head.getWorldPosition(hp); bones.headEnd.getWorldPosition(he); const F = he.sub(hp).normalize(), Lw = _v2.set(1, 0, 0).applyQuaternion(roller.getWorldQuaternion(_q1)).normalize();
      const Y = new THREE.Vector3().crossVectors(F, Lw).normalize(), X = new THREE.Vector3().crossVectors(Y, F).normalize(); _m4.makeBasis(X, Y, F); horns.quaternion.setFromRotationMatrix(_m4); horns.position.copy(hp); horns.scale.setScalar(p.hornScale ?? 1.35); }
    U.uWet.value = wet; U.uMud.value = mud; U.uMudDry.value = mudDry; U.uDust.value = (p.dust ?? .6) * (1 - wet) * (1 - mud); U.uBaseY.value = baseY; U.uH.value = H;
    const back = new THREE.Vector3(st.x, baseY + H * .845, st.z).addScaledVector(fwd, -.2); const headP = hp.clone();
    LINK.buf = { x: st.x, z: st.z, yaw: st.yaw, baseY, back, head: headP, fwd: fwd.clone(), lat: lat.clone(), sink: st.s };
    // contact shadow on dry ground only
    const reg = regionAt(st.x, st.z); cs.position.set(st.x, gH(st.x, st.z) + .02, st.z); cs.rotation.z = st.yaw; cs.material.opacity = cs.userData.op * clamp(1 + st.s * 4) * (reg && st.s < -.05 ? 0 : 1);
    // heat shimmer rising off the dark back
    haze.forEach(o2 => { o2.tx.offset.y = -t * o2.k; o2.tx.offset.x = Math.sin(t * .7 + o2.ph) * .05; o2.sp.position.copy(back).addScaledVector(lat, o2.a * .7).addScaledVector(fwd, o2.b * 1.4); o2.sp.position.y += o2.h / 2 - .05;
      o2.sp.scale.set(o2.w * (1 + Math.sin(t * 1.3 + o2.ph) * .08), o2.h, 1); o2.sp.material.opacity = haz * .2 * (.7 + .3 * Math.sin(t * 2 + o2.ph)); });
    steam.forEach(o2 => { const life = 2.2, a = ((t / life + o2.ph) % 1), sp = o2.sp; sp.position.copy(back).addScaledVector(lat, o2.a * .6).addScaledVector(fwd, o2.b * 1.3); sp.position.y += a * 1.1;
      sp.scale.setScalar(.35 + a * .8); sp.material.opacity = stm * .22 * Math.sin(Math.PI * a); });
    // ripples: rings from the legs while wading, a wide ring around the sunk body (stateless: each ring is born at tb and read from the track at tb)
    rings.forEach((m, i) => { const P = 2.4, age = (t + i * P / rings.length) % P, tb = t - age, sb = TR(tb), f2 = _v2.set(Math.sin(sb.yaw), 0, Math.cos(sb.yaw)), src = i % 3;
      const px = sb.x + f2.x * (src === 0 ? .8 : src === 2 ? -.75 : 0), pz = sb.z + f2.z * (src === 0 ? .8 : src === 2 ? -.75 : 0), rg = regionAt(px, pz);
      const deep = sb.s < -.2, moving = sb.speed > .1, on = rg && (src === 1 ? deep : (moving || deep)) && tb > 0; if (!on) { m.visible = false; return; }
      m.visible = true; m.material.color.copy(rg.mud ? MCOL : WCOL); const k2 = age / P;
      if (src === 1) { m.scale.set(.55 + age * .45, 1.45 + age * .45, 1); m.rotation.z = sb.yaw; } else m.scale.setScalar(.15 + age * .5);
      m.position.set(px, rg.y + .006, pz); m.material.opacity = Math.pow(1 - k2, 1.6) * (rg.mud ? .35 : .55) * (moving ? 1 : .55); });
    // splashes from stepping hooves in water, mud flung while rolling in the wallow
    dd.forEach((d0, i) => { const P = .85, age = (t + d0.ph * P) % P, tb = t - age, sb = TR(tb), f2 = _v2.set(Math.sin(sb.yaw), 0, Math.cos(sb.yaw)), l2 = new THREE.Vector3(f2.z, 0, -f2.x);
      const px = sb.x + f2.x * .8 * d0.leg + l2.x * d0.side * .7, pz = sb.z + f2.z * .8 * d0.leg + l2.z * d0.side * .7, rg = regionAt(px, pz);
      const rollB = rg?.mud ? lerp(pm.roll ?? p.roll ?? 0, mo.roll ?? p.roll ?? 0, easeIO(clamp((ma - age) / (mo.dur ?? 1.6)))) : 0;
      const go = rg && tb > 0 && (sb.speed > .15 || rollB > .3); if (!go) { drops.setMatrixAt(i, zero); return; }
      const vx = Math.cos(d0.ang) * d0.h, vz = Math.sin(d0.ang) * d0.h, y = rg.y + d0.up * age - 4.9 * age * age;
      if (y < rg.y) { drops.setMatrixAt(i, zero); return; }
      mp.set(px + vx * age, y, pz + vz * age); ms.setScalar(d0.sz * (1 - age / P * .5)); drops.setMatrixAt(i, _m4.compose(mp, mq.identity(), ms)); drops.setColorAt(i, rg.mud ? MCOL : WCOL); });
    drops.instanceMatrix.needsUpdate = true; if (drops.instanceColor) drops.instanceColor.needsUpdate = true;
    // flies: ~1 cm, orbit the head, back and rump with darting jitter; they come in from and leave to ~3 m away as `flies` rises/falls
    anchorP[0].copy(headP).add(_v2.set(0, .12, 0)); anchorP[1].copy(back).add(_v2.set(0, .1, 0)); anchorP[2].copy(back).addScaledVector(fwd, -.75);
    fd.forEach((f, i) => { const pres = clamp((flies - f.th) * 7); if (pres <= 0) { flyB.setMatrixAt(i, zero); flyW.setMatrixAt(i, zero); return; }
      const a = anchorP[f.anchor], R = flyR;
      mp.set(a.x + Math.sin(t * f.w[0] + f.ph[0]) * f.rad[0] * R + Math.sin(t * 13 + i) * .025, a.y + Math.sin(t * f.w[1] + f.ph[1]) * f.rad[1] * R + .04 * (R - 1) + Math.sin(t * 11 + i * 2) * .02, a.z + Math.cos(t * f.w[2] + f.ph[2]) * f.rad[2] * R + Math.cos(t * 12 + i) * .025);
      mp.addScaledVector(f.dir, (1 - pres) * 3.2);
      ms.set(.0035, .003, .0055); mq.setFromAxisAngle(up, t * 3 + i); flyB.setMatrixAt(i, _m4.compose(mp, mq, ms));
      ms.set(.006, .006 * (.4 + .6 * Math.abs(Math.sin(t * 40 + i))), 1); mp.y += .003; flyW.setMatrixAt(i, _m4.compose(mp, _q2.setFromAxisAngle(_v1.set(1, 0, 0), -Math.PI / 2), ms)); });
    flyB.instanceMatrix.needsUpdate = true; flyW.instanceMatrix.needsUpdate = true;
  };
  return g; }

// ---- canal ground: height-field banks with a wet dark band at the waterline, a dusty path with ruts, a muddy ramp with hoof prints, pebbles on the slopes
function canalBank(p = {}) {
  const g = new THREE.Group(), W = p.w || 20, Dd = p.d || 26, nx = Math.round(W / .11), nz = Math.round(Dd / .14), geo = new THREE.PlaneGeometry(W, Dd, nx, nz); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colr = [], c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), y = bankH(x, z); pos.setY(i, y);
    const d = Math.abs(x) - CANAL.half, n1 = vnoise(x * 1.3, z * 1.1), n2 = vnoise(x * 6, z * 5);
    let k = .92 + .16 * n1 + .08 * (n2 - .5); c.setRGB(k, k * .97, k * .93);
    const wetB = clamp(1 - (y - CANAL.water) / .16) * (d < 2.2 ? 1 : 0) * (Math.abs(x) < CANAL.waterHalf + .6 ? 1 : 0); c.multiplyScalar(1 - .5 * wetB); c.b *= 1 - .08 * wetB;
    const top = clamp((y - CANAL.top + .08) / .06); if (top > 0) { const rut = Math.exp(-(((Math.abs(x) - CANAL.half - CANAL.slope - .55) / .09) ** 2)) + Math.exp(-(((Math.abs(x) - CANAL.half - CANAL.slope - 1.2) / .09) ** 2));
      c.lerp(new THREE.Color(1.12, 1.05, .93), top * .55); c.multiplyScalar(1 - .18 * rut * top); }
    const rk = rampK(x, z); if (rk > 0) c.lerp(new THREE.Color(.5, .43, .36), rk * clamp(1 - (d - 3.2) / 1.2) * .7);
    if (wallowE(x, z) < 2.2) c.lerp(new THREE.Color(.42, .35, .28), .6);
    colr.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, color: col(p.tint || '#ffffff') });
  if (TEX.realSoil) { const tx = TEX.realSoil.diff.clone(); tx.repeat.set(W / 2.6, Dd / 2.6); tx.needsUpdate = true; mat.map = tx; if (TEX.realSoil.nor) { const tn = TEX.realSoil.nor.clone(); tn.repeat.copy(tx.repeat); tn.needsUpdate = true; mat.normalMap = tn; } }
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = true; g.add(m);
  const r = rng(p.seed || 71), peb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std('#8e8476', { r: .95 }), 260); let n = 0;
  for (let i = 0; i < 2000 && n < 260; i++) { const x = (r() - .5) * W, z = (r() - .5) * Dd, d = Math.abs(x) - CANAL.half; if (d < .1 || d > 4) continue; const y = bankH(x, z); if (y < .08 || rampK(x, z) > .3) continue;
    const sc = .015 + r() * r() * .07; peb.setMatrixAt(n++, _m4.compose(_v1.set(x, y + sc * .3, z), _q1.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), _v2.set(sc * (1 + r() * .5), sc * .6, sc))); }
  peb.count = n; peb.castShadow = true; peb.receiveShadow = true; g.add(peb);
  // hoof prints on the ramp mud (darker wet dents)
  const pr = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), new THREE.MeshStandardMaterial({ color: col('#3a2d20'), roughness: .5, transparent: true, opacity: .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 90); n = 0;
  for (let i = 0; i < 600 && n < 90; i++) { const x = -2.2 - r() * 3.4, z = CANAL.ramp[0] + 1 + r() * (CANAL.ramp[1] - CANAL.ramp[0] - 2); if (rampK(x, z) < .6 || wallowE(x, z) < 1.3) continue;
    pr.setMatrixAt(n++, _m4.compose(_v1.set(x, bankH(x, z) + .004, z), _q1.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, r() * 3)), _v2.set(.04, .055, 1))); }
  pr.count = n; pr.receiveShadow = true; g.add(pr);
  return g; }

// ---- canal water: murky olive Delta water, sky reflection (PBR fresnel), scrolling ripple normals, shallow see-through edges, drifting water hyacinth, foam at the shore
function rippleNormalTex() { return SPR.ripN ||= (() => { const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const c2 = cv.getContext('2d'), im = c2.createImageData(N, N), r = rng(83), W2 = [];
  for (let k = 0; k < 14; k++) W2.push([1 + Math.floor(r() * 6), Math.floor(r() * 9) - 4, r() * 6.28, .3 + r()]);
  const h = (u, v) => W2.reduce((s2, [a, b, ph, am]) => s2 + Math.sin(2 * Math.PI * (a * u + b * v) + ph) * am / (a + Math.abs(b)), 0);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N, e = 1 / N, dx = (h(u + e, v) - h(u - e, v)) * 3, dy = (h(u, v + e) - h(u, v - e)) * 3, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    im.data[i] = (-dx / l * .5 + .5) * 255; im.data[i + 1] = (-dy / l * .5 + .5) * 255; im.data[i + 2] = (1 / l * .5 + .5) * 255; im.data[i + 3] = 255; }
  c2.putImageData(im, 0, 0); const t2 = new THREE.CanvasTexture(cv); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; return t2; })(); }
function hyacinthTex() { return SPR.hyac ||= canvasT(64, 64, (c) => { const r = rng(5); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + r() * .3; c.fillStyle = `rgb(${50 + r() * 30},${110 + r() * 40},${40 + r() * 20})`; c.beginPath(); c.ellipse(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 11, 7, a, 0, 6.28); c.fill(); }
  c.fillStyle = '#b9a7d8'; c.beginPath(); c.arc(32, 30, 5, 0, 6.28); c.fill(); }); }
function foamTex() { return SPR.foam ||= canvasT(256, 32, (c, w, h) => { const r = rng(9); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(245,240,225,${.25 + r() * .5})`; c.beginPath(); c.arc(r() * w, h * (.3 + r() * .4), .8 + r() * 2.4, 0, 6.28); c.fill(); } }); }
function canalWater(p = {}) {
  const g = new THREE.Group(), L = p.len || 26, Hw = CANAL.waterHalf, y = CANAL.water, flow = p.flow ?? .25, nt = rippleNormalTex().clone(); nt.needsUpdate = true; nt.repeat.set(Hw * 2 / 3, L / 3);
  const nt2 = nt.clone(); nt2.needsUpdate = true; nt2.repeat.set(Hw * 2 / 1.3, L / 1.3);
  const mat = new THREE.MeshStandardMaterial({ color: col(p.color || '#5f6a46'), roughness: .16, metalness: 0, normalMap: nt, normalScale: new THREE.Vector2(.3, .3), transparent: true, envMapIntensity: p.reflect ?? .35 });
  mat.onBeforeCompile = sh => { sh.uniforms.uHalf = { value: Hw }; sh.uniforms.uNear = { value: col(p.near || '#35402a') }; sh.uniforms.uFar = { value: col(p.far || '#6d7c5e') }; sh.uniforms.uMud = { value: col('#6a5a40') };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uHalf; uniform vec3 uNear, uFar, uMud;')
      .replace('#include <map_fragment>', `#include <map_fragment>
  { vec3 vd = normalize(vWP - cameraPosition); float dep = asin(clamp(-vd.y, 0.0, 1.0)); float f = 1.0 - smoothstep(0.0, 0.45, dep);
    float shallow = 1.0 - smoothstep(1.0, 1.9, uHalf - abs(vWP.x) + .0);
    diffuseColor.rgb = mix(mix(uNear, uFar, f), uMud, shallow * .55);
    diffuseColor.a = mix(.95, .55, shallow) ; }`); };
  mat.customProgramCacheKey = () => 'canal_v1';
  const w = new THREE.Mesh(new THREE.PlaneGeometry(Hw * 2, L), mat); w.rotation.x = -Math.PI / 2; w.position.y = y; w.receiveShadow = true; w.renderOrder = 1; g.add(w);
    // end faces where the canal meets the island cutaway
  for (const sd of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(CANAL.half * 2 + .3, .5), std('#3f4a33', { r: .2 })); f.position.set(0, y - .25, sd * L / 2); if (sd < 0) f.rotation.y = Math.PI; g.add(f); }
  // flow streaks + floating water hyacinth
  const sm2 = new THREE.MeshBasicMaterial({ map: streakTex(), transparent: true, opacity: .3, depthWrite: false }), streaks = [], r = rng(p.seed || 77);
  for (let i = 0; i < 40; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(.06, .7 + r() * 1.2), sm2.clone()); s.rotation.x = -Math.PI / 2; g.add(s); streaks.push({ s, z0: r() * L, x: (r() - .5) * CANAL.half * 1.6, sp: .6 + r() * .8 }); }
  const hm = new THREE.MeshStandardMaterial({ map: hyacinthTex(), transparent: true, alphaTest: .4, roughness: .7, side: THREE.DoubleSide }), hy = [];
  for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(.14 + r() * .14, 10), hm); s.rotation.x = -Math.PI / 2; s.castShadow = true; g.add(s); hy.push({ s, z0: r() * L, x: (r() - .5) * CANAL.half * 1.7, sp: .5 + r() * .4, ph: r() * 6 }); }
  // foam / wet line where each bank meets the water
  const fm = new THREE.MeshBasicMaterial({ map: foamTex(), transparent: true, opacity: .55, depthWrite: false }), foam = [];
  for (const sd of [-1, 1]) { const pts = []; for (let z = -L / 2; z <= L / 2 + 1e-6; z += .25) { let x = CANAL.half; while (x < CANAL.waterHalf && bankH(sd * x, z) < y) x += .02; pts.push([sd * x, z]); }
    const pg = new THREE.BufferGeometry(), P2 = [], UV = [], I2 = []; pts.forEach(([x, z], i) => { P2.push(x - sd * .09, y + .004, z, x + sd * .03, y + .004, z); UV.push(i * .25 / 4, 0, i * .25 / 4, 1); if (i) { const a = (i - 1) * 2; I2.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    pg.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); pg.setIndex(I2); const fmm = fm.clone(); fmm.map = foamTex().clone(); fmm.map.wrapS = THREE.RepeatWrapping; fmm.map.needsUpdate = true;
    const mm = new THREE.Mesh(pg, fmm); mm.renderOrder = 2; g.add(mm); foam.push(mm); }
  g.userData.tick = t => { nt.offset.set(t * .01, -t * flow * .08); nt2.offset.set(-t * .015, -t * flow * .14);
    streaks.forEach(o2 => { const u = ((o2.z0 - t * flow * o2.sp) % L + L) % L; o2.s.position.set(o2.x + Math.sin(t * .5 + o2.z0) * .05, y + .006, u - L / 2); o2.s.material.opacity = .3 * Math.sin(Math.PI * u / L); });
    hy.forEach(o2 => { const u = ((o2.z0 - t * flow * o2.sp * .5) % L + L) % L; o2.s.position.set(o2.x + Math.sin(t * .3 + o2.ph) * .1, y + .012 + Math.sin(t * 1.5 + o2.ph) * .004, u - L / 2); o2.s.rotation.z = t * .05 + o2.ph; });
    foam.forEach((m, i) => { m.material.map.offset.x = -t * .02 * (i ? 1 : -1); m.material.opacity = .4 + .15 * Math.sin(t * 1.3 + i); }); };
  return g; }

// ---- mud wallow: churned wet mud with glossy puddles and a raised lumpy rim
function wallowTex() { return SPR.wallow ||= canvasT(256, 256, (c, w, h) => { const r = rng(37); c.fillStyle = '#4a3a2a'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r() < .5 ? '30,22,14' : '110,92,70'},${.08 + r() * .2})`; c.beginPath(); c.ellipse(r() * w, r() * h, 2 + r() * 9, 1 + r() * 5, r() * 3, 0, 6.28); c.fill(); }
  for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(25,18,10,${.2 + r() * .3})`; c.lineWidth = 1 + r() * 2; c.beginPath(); const x = r() * w, y2 = r() * h; c.arc(x, y2, 4 + r() * 10, r() * 3, r() * 3 + 2); c.stroke(); } }); }
function mudWallow(p = {}) { const g = new THREE.Group(), [wx, wz, rx, rz] = CANAL.wallow, y = CANAL.wallowY, r = rng(p.seed || 43);
  const geo = new THREE.CircleGeometry(1, 48); geo.rotateX(-Math.PI / 2); const ps = geo.attributes.position;
  for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), z = ps.getZ(i), a = Math.atan2(z, x), k = 1 + .08 * Math.sin(a * 5 + 1) + .05 * Math.sin(a * 9); ps.setXYZ(i, x * rx * k, 0, z * rz * k); }
  const tx = wallowTex().clone(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 2); tx.needsUpdate = true;
  const mm = new THREE.MeshStandardMaterial({ map: tx, roughness: .45, metalness: 0, envMapIntensity: .5 }), mud = new THREE.Mesh(geo, mm); mud.position.set(wx, y, wz); mud.receiveShadow = true; g.add(mud);
  const pm2 = new THREE.MeshStandardMaterial({ color: col('#5b5340'), roughness: .04, metalness: .1, normalMap: rippleNormalTex(), normalScale: new THREE.Vector2(.15, .15), transparent: true, opacity: .8 });
  for (let i = 0; i < 6; i++) { const pd = new THREE.Mesh(new THREE.CircleGeometry(.12 + r() * .3, 18), pm2); pd.rotation.x = -Math.PI / 2; pd.scale.set(1, .6 + r() * .4, 1); const a = r() * 6.28, d = r() * .6; pd.position.set(wx + Math.cos(a) * rx * d, y + .003, wz + Math.sin(a) * rz * d); g.add(pd); }
  const rim = std('#5d4a37', { r: .7 }); for (let i = 0; i < 38; i++) { const a = i / 38 * 6.28 + r() * .1, k = 1.02 + r() * .1, l = new THREE.Mesh(new THREE.SphereGeometry(.12 + r() * .1, 8, 6), rim);
    l.scale.set(1.4, .35 + r() * .2, 1); l.position.set(wx + Math.cos(a) * rx * k, y, wz + Math.sin(a) * rz * k); l.rotation.y = -a; l.castShadow = l.receiveShadow = true; g.add(l); }
  return g; }

// ---- reeds and bank grass: merged curved blades (one draw call), wind sway in the vertex shader, plume heads on the tall reeds
function reeds(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 91), gH = groundOf(p), geos = { green: [], dry: [], stem: [] }, tmpM = new THREE.Matrix4();
  const addG = (key, geo, H) => { const ps = geo.attributes.position, aw = new Float32Array(ps.count); for (let i = 0; i < ps.count; i++) aw[i] = Math.pow(clamp(ps.getY(i) / H), 2); geo.setAttribute('aw', new THREE.BufferAttribute(aw, 1)); geos[key].push(geo); };
  const avoid = p.avoid || [], ok = (x, z) => !avoid.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
  for (const A of p.areas || []) { for (let n = 0; n < A.n; n++) { const x = A.x[0] + r() * (A.x[1] - A.x[0]), z = A.z[0] + r() * (A.z[1] - A.z[0]); if (!ok(x, z)) continue; const y0 = gH(x, z);
      if (A.below != null && y0 > A.below) continue; if (A.above != null && y0 < A.above) continue;
      const tall = A.kind === 'reed', nb = tall ? 10 + (r() * 8 | 0) : 5 + (r() * 5 | 0), hMax = (A.h?.[1] ?? 1.8), hMin = (A.h?.[0] ?? 1);
      for (let b = 0; b < nb; b++) { const len = hMin + r() * (hMax - hMin), wid = tall ? .028 + r() * .02 : .02 + r() * .015, geo = bladeGeo(len, wid, tall ? .12 + r() * .35 : .3 + r() * .6);
        tmpM.makeRotationFromEuler(new THREE.Euler((r() - .5) * .35, r() * 6.28, (r() - .5) * .35, 'YXZ')).setPosition(x + (r() - .5) * .18, y0 - .02, z + (r() - .5) * .18); geo.applyMatrix4(tmpM);
        addG(r() < (A.dry ?? .15) ? 'dry' : 'green', geo, y0 + len); }
      if (tall) for (let s = 0; s < 1 + (r() * 3 | 0); s++) { const hh = hMax * (.95 + r() * .35), st = new THREE.CylinderGeometry(.006, .009, hh, 4); st.translate(0, hh / 2, 0);
        const pl = new THREE.ConeGeometry(.045, .3, 6); pl.rotateX(Math.PI); pl.translate(0, hh + .1, 0); const m2 = mergeGeometries([st.toNonIndexed(), pl.toNonIndexed()]);
        tmpM.makeRotationFromEuler(new THREE.Euler((r() - .5) * .2, 0, (r() - .5) * .2)).setPosition(x + (r() - .5) * .15, y0, z + (r() - .5) * .15); m2.applyMatrix4(tmpM); addG('stem', m2, y0 + hh); } } }
  const U = { uT: { value: 0 } }, wind = (mt, key) => { mt.onBeforeCompile = sh => { sh.uniforms.uT = U.uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aw; uniform float uT;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
  { float ph = position.x * .8 + position.z * .55; transformed.x += (sin(uT * 1.5 + ph) * .7 + sin(uT * 3.1 + ph * 2.3) * .3) * .09 * aw; transformed.z += sin(uT * 1.2 + ph * 1.3) * .05 * aw; }`); }; mt.customProgramCacheKey = () => 'reeds_' + key; };
  const mk = (key, mt) => { if (!geos[key].length) return; const geo = mergeGeometries(geos[key].map(q => q.index ? q.toNonIndexed() : q)); wind(mt, key);
    const m = new THREE.Mesh(geo, mt); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    if (mt.map) m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mt.map, alphaTest: .5 }); g.add(m); };
  mk('green', std('#ffffff', { r: .75, extra: { map: bladeTex(false), alphaTest: .5, side: THREE.DoubleSide } }));
  mk('dry', std('#ffffff', { r: .9, extra: { map: bladeTex(true), alphaTest: .5, side: THREE.DoubleSide } }));
  mk('stem', std(p.plume || '#8a7258', { r: .95 }));
  g.userData.tick = t => { U.uT.value = t; }; return g; }

// ---- cattle egret (~0.5 m): white with buff breeding plumes, yellow bill; rides the buffalo's back or stands on the bank,
// flies between them on an arc (anticipation crouch, flapping, landing squash), pecks at flies with a pull-back before each strike
function egret(p = {}) { const g = new THREE.Group(), bird = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(); g.add(bird); bird.add(body); bird.scale.setScalar((p.height || .5) / .5);
  const wh = std('#f3f1ea', { r: .8 }), bf = std('#dca868', { r: .85 }), bl = std('#efb22a', { r: .4 }), lg = std('#4a4630', { r: .6 });
  const E = (m, s, ps, rx = 0) => { const q = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m); q.scale.set(...s); q.position.set(...ps); q.rotation.x = rx; return q; };
  body.add(E(wh, [.075, .085, .15], [0, .3, 0], -.35), E(bf, [.05, .035, .1], [0, .37, -.02], -.3), E(wh, [.04, .03, .07], [0, .27, -.15], .3), E(wh, [.055, .07, .06], [0, .35, .1], -.6));
  head.position.set(0, .4, .11); body.add(head); head.add(E(wh, [.032, .03, .04], [0, .05, .02]), E(bf, [.026, .016, .03], [0, .072, .015]));
  const bill = new THREE.Mesh(new THREE.ConeGeometry(.012, .065, 8), bl); bill.rotation.x = Math.PI / 2; bill.position.set(0, .045, .085); head.add(bill);
  const eye = std('#f2d33a', { r: .3 }); for (const sd of [-1, 1]) { const e = E(eye, [.006, .006, .006], [sd * .024, .055, .04]); head.add(e); }
  const legs = []; for (const sd of [-1, 1]) { const l = cyl(.006, .006, .24, lg, 5); l.position.set(sd * .03, .12, .01); bird.add(l); legs.push(l); const toe = box(.012, .006, .07, lg); toe.position.set(sd * .03, .003, .03); bird.add(toe); }
  const wings = []; for (const sd of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.2 * sd, .09, .44 * sd, .02); sh.lineTo(.4 * sd, -.06); sh.quadraticCurveTo(.2 * sd, -.11, 0, -.12);
    const wgeo = new THREE.ShapeGeometry(sh); wgeo.rotateX(-Math.PI / 2); const w = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: col('#f6f4ee'), roughness: .8, side: THREE.DoubleSide })); const piv = new THREE.Group(); piv.position.set(sd * .04, .34, .05); piv.add(w); body.add(piv); wings.push([piv, sd]); }
  shadowed(g); const gH = groundOf(p);
  const locOf = (m, out) => { const a = m?.at ?? p.at ?? 'buffalo'; if (a === 'buffalo') { const b = LINK.buf; if (b) return out.set(b.back.x, b.back.y, b.back.z), b.yaw + (m?.turn ?? p.turn ?? .5); return out.set(0, 0, 0), 0; }
    out.set(a[0], a[1] ?? gH(a[0], a[2]), a[2]); return m?.face ?? p.face ?? 0; };
  const P0 = new THREE.Vector3(), P1 = new THREE.Vector3();
  g.userData.tick = (t) => { const mo = g.userData.mode, pm = g.userData.prevMode, ma = g.userData.modeAge ?? 99, D = mo?.dur ?? 1.8;
    const y1 = locOf(mo, P1); let yaw = y1, k = 1, flying = false;
    if (pm && ma < D) { const y0 = locOf(pm, P0); k = clamp(ma / D); flying = k > .1 && k < .93; const e = easeIO(clamp((k - .1) / .83));
      bird.position.lerpVectors(P0, P1, e); bird.position.y += Math.sin(Math.PI * e) * (mo.arc ?? 1.1); yaw = Math.atan2(P1.x - P0.x, P1.z - P0.z); if (k > .9) yaw = angTo(yaw, y1); }
    else bird.position.copy(P1);
    bird.rotation.y = yaw; const crouch = k < .1 && pm && ma < D ? Math.sin(k / .1 * Math.PI) : 0, land = k >= .93 && k < 1 ? Math.sin((k - .93) / .07 * Math.PI) : 0;
    bird.scale.y = ((p.height || .5) / .5) * (1 - .12 * crouch - .1 * land);
    wings.forEach(([pv, sd]) => { pv.visible = flying || land > 0; pv.rotation.z = sd * (flying ? Math.sin(t * 13) * .9 : .5 * land); pv.scale.setScalar(flying || land ? 1 : .001); });
    legs.forEach(l => { l.rotation.x = flying ? 1.2 : 0; });
    body.rotation.x = flying ? .25 : 0;
    // peck cycle: idle bob, pull back (anticipation), strike, ease back
    const c = ((t + (p.ph || 0)) % 3.1) / 3.1; let hx = Math.sin(t * 2.4) * .04, hz = 0;
    if (!flying) { if (c > .72 && c < .8) hx = -.25 * Math.sin((c - .72) / .08 * Math.PI / 2); else if (c >= .8 && c < .86) { const q = (c - .8) / .06; hx = lerp(-.25, .75, q); hz = .06 * q; } else if (c >= .86) { const q = easeIO((c - .86) / .14); hx = lerp(.75, 0, q); hz = .06 * (1 - q); } }
    head.rotation.x = hx; head.position.z = .11 + hz; LINK.egret = bird.position.clone(); };
  return g; }

// ---- farmer (fellah) in a galabeya and a white emma: the Quaternius farmer recoloured, hat removed, robe over the legs.
// Walking: body bob and sway, arm swing, robe hem swing with lag; the sandals are planted in the world step by step (no sliding).
// Mode { spray: 0..1 }: both arms lift a hose forward and sweep it in a slow arc; droplets fly on ballistic arcs onto `aim`.
function robeTex() { return SPR.robe ||= canvasT(128, 256, (c, w, h) => { const r = rng(57); c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const x = r() * w, gr = c.createLinearGradient(x - 6, 0, x + 6, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, `rgba(0,0,0,${.06 + r() * .1})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - 6, h * r() * .3, 12, h); }
  for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(90,80,60,${r() * .06})`; c.fillRect(r() * w, h * (.75 + r() * .25), 2, 2); } }); }
function fellah(p = {}) { const g = new THREE.Group(), mover = new THREE.Group(), H = p.height || 1.84, k = H / 1.75; g.add(mover);
  const man = ASSETS.glb({ model: 'modular_men/Farmer', height: H }); mover.add(man); const robeC = col(p.robe || '#8fa0ae');
  man.traverse(m => { if (!m.isMesh) return; m.material = [].concat(m.material).map(mt => { const c = mt.clone(), n = mt.name || '';
      if (/Farmer_Feet/.test(m.name) || /Farmer_Pants/.test(m.name) || (/Farmer_Head/.test(m.name) && /Beige|Red/.test(n))) c.visible = false;
      else if (!/Skin|Eye|Brow/i.test(n)) { c.color.copy(robeC); c.map = robeTex(); c.roughness = .95; } return c; }); if (m.material.length === 1) m.material = m.material[0]; });
  const prof = [[.03, 1.47], [.12, 1.46], [.19, 1.41], [.205, 1.34], [.19, 1.2], [.178, 1.03], [.2, .88], [.225, .62], [.26, .32], [.29, .06], [.285, .045]].map(([a, b]) => new THREE.Vector2(a * k, b * k));
  const robeM = new THREE.MeshStandardMaterial({ color: robeC, map: robeTex(), roughness: .95, side: THREE.DoubleSide }), robe = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), robeM);
  const piv = new THREE.Group(); piv.position.set(0, 1.42 * k, .05 * k); robe.position.y = -1.42 * k; robe.scale.set(1, 1, .68); piv.add(robe); mover.add(piv); robe.castShadow = robe.receiveShadow = true;
  const wm = std('#f1efe8', { r: .9 }), turban = new THREE.Group(); turban.position.set(0, 1.6 * k, .05 * k); mover.add(turban);
  const tor = new THREE.Mesh(new THREE.TorusGeometry(.098 * k, .036 * k, 10, 24), wm); tor.rotation.x = Math.PI / 2; tor.scale.set(1, 1.08, 1); turban.add(tor);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.1 * k, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), wm); cap.scale.y = .62; cap.position.y = .01; turban.add(cap); shadowed(turban);
  const B = n => man.getObjectByName(n), arms = { L: B('UpperArmL'), R: B('UpperArmR'), hand: B('HandR'), handL: B('HandL') };
  const armRest = [arms.L, arms.R].map(b => b?.quaternion.clone());
  const feet = [], sandal = std('#3b2a1c', { r: .85 }), skin = std('#a8744f', { r: .7 });
  for (let i = 0; i < 2; i++) { const f = new THREE.Group(), s1 = box(.1, .02, .26, sandal), s2 = box(.085, .05, .2, skin); s1.position.y = .01; s2.position.set(0, .045, -.01); f.add(s1, s2); shadowed(f); g.add(f); feet.push(f); }
  const csh = contactShadow(.32, .32, .42); g.add(csh);
  const TR = makeTrack(p.track || [[0, 0, 0, 0, 0]], .25), gH = groundOf(p), up = new THREE.Vector3(0, 1, 0), lat = new THREE.Vector3(), STRIDE = 1.3;
  // hose + spray
  const hoseM = std('#2f7d3a', { r: .45 }); let hose = null; const hp = new THREE.Vector3(), hp2 = new THREE.Vector3(), nz = new THREE.Vector3();
  const tap = new THREE.Group(); if (p.hoseFrom) { const [tx, tz] = p.hoseFrom, ty = gH(tx, tz), pm2 = std('#7d8186', { r: .35, m: .6 }), pipe = cyl(.03, .03, .75, pm2); pipe.position.y = .37; tap.add(pipe);
    const wh = new THREE.Mesh(new THREE.TorusGeometry(.05, .01, 6, 14), std('#b23a2c', { r: .5 })); wh.position.set(0, .7, .05); tap.add(wh);
    for (let i = 0; i < 4; i++) { const coil = new THREE.Mesh(new THREE.TorusGeometry(.22 + i * .015, .012, 6, 28), hoseM); coil.rotation.x = Math.PI / 2; coil.position.set(.3, .015 + i * .022, .1); tap.add(coil); }
    tap.position.set(tx, ty, tz); shadowed(tap); g.add(tap); }
  const NDR = 150, drp = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: col('#eef6f8'), roughness: .1, transparent: true, opacity: .75 }), NDR); drp.frustumCulled = false; g.add(drp);
  const r = rng(p.seed || 29), dr = Array.from({ length: NDR }, () => ({ ph: r(), j: new THREE.Vector3((r() - .5) * .35, (r() - .5) * .2, (r() - .5) * .35), sz: .008 + r() * .012 }));
  const mist = []; for (let i = 0; i < 8; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, opacity: 0, depthWrite: false })); g.add(sp); mist.push({ sp, ph: r(), a: r() - .5, b: r() - .5 }); }
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), mp = new THREE.Vector3(), ms = new THREE.Vector3(), mq = new THREE.Quaternion();
  const footAt = (Dd, side, out) => { const tt = TR.atDist(Dd), s2 = TR(tt), f2 = _v2.set(Math.sin(s2.yaw), 0, Math.cos(s2.yaw)); const lx = Math.cos(s2.yaw), lz = -Math.sin(s2.yaw);
    out.set(s2.x + f2.x * .12 + lx * side * .11, 0, s2.z + f2.z * .12 + lz * side * .11); out.y = gH(out.x, out.z); return s2.yaw; };
  const fa = new THREE.Vector3(), fb = new THREE.Vector3();
  g.userData.tick = (t) => { const mo = g.userData.mode || {}, pm = g.userData.prevMode || {}, ma = g.userData.modeAge ?? 99;
    const val = (kk, d) => { const to = mo[kk] ?? p[kk] ?? d, fr = pm[kk] ?? p[kk] ?? d; return lerp(fr, to, easeIO(clamp(ma / (mo.dur ?? 1.2)))); };
    const st = TR(t), wW = clamp(st.speed / .35), ph = st.dist / STRIDE, sw = Math.sin(Math.PI * 2 * ph), spray = val('spray', 0);
    lat.set(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
    mover.position.set(st.x, gH(st.x, st.z) + .022 * Math.abs(Math.sin(Math.PI * 2 * ph)) * wW, st.z); mover.rotation.y = st.yaw; mover.rotation.z = .02 * sw * wW;
    piv.rotation.x = .07 * Math.sin(Math.PI * 2 * ph - .9) * wW; piv.rotation.z = .025 * Math.sin(Math.PI * 2 * ph - .6) * wW; // robe hem swings behind the stride (follow-through)
    [arms.L, arms.R].forEach((b, i) => b && b.quaternion.copy(armRest[i])); g.updateMatrixWorld(true);
    const sweep = Math.sin(t * 1.1) * .22 * spray;
    bendBone(arms.L, lat, (.32 * sw * wW) * (1 - spray) - .95 * spray); bendBone(arms.R, lat, (-.32 * sw * wW) * (1 - spray) - 1.15 * spray);
    if (spray > .01) { bendBone(arms.R, up, sweep - .2 * spray); bendBone(arms.L, up, sweep + .25 * spray); }
    g.updateMatrixWorld(true);
    // sandals: planted every stride, swing to the next plant with a small lift
    for (let side = 0; side < 2; side++) { const off = side ? STRIDE / 2 : 0, d0 = st.dist - off, kk = Math.floor(d0 / STRIDE), u = d0 / STRIDE - kk, f = feet[side], sgn = side ? 1 : -1;
      const yaw0 = footAt(kk * STRIDE + off, sgn, fa); if (u < .6 || st.speed < .02) { f.position.copy(fa); f.rotation.y = yaw0; }
      else { const yaw1 = footAt((kk + 1) * STRIDE + off, sgn, fb), q = easeIO((u - .6) / .4); f.position.lerpVectors(fa, fb, q); f.position.y += .07 * Math.sin(Math.PI * q); f.rotation.y = lerp(yaw0, angTo(yaw0, yaw1), q); f.rotation.x = -.3 * Math.sin(Math.PI * q); } }
    csh.position.set(st.x, gH(st.x, st.z) + .02, st.z); LINK.farmer = mover.position.clone().add(_v1.set(0, 1.0, 0));
    // hose from the tap along the ground to the hands; spray arcs to the aim point
    if (p.hoseFrom) { if (hose) { mover.parent.remove(hose); hose.geometry.dispose(); hose = null; }
      if (arms.hand && arms.handL && spray > .01 || p.hoseAlways) { arms.hand.getWorldPosition(hp); arms.handL.getWorldPosition(hp2); const [tx, tz] = p.hoseFrom, f2 = _v2.set(Math.sin(st.yaw), 0, Math.cos(st.yaw));
        nz.copy(hp).addScaledVector(f2, .18); const pts = [new THREE.Vector3(tx + .3, gH(tx, tz) + .03, tz + .1), new THREE.Vector3(lerp(tx, st.x, .5), gH(lerp(tx, st.x, .5), lerp(tz, st.z, .5)) + .02, lerp(tz, st.z, .5)),
          new THREE.Vector3(st.x - f2.x * .25, gH(st.x, st.z) + .03, st.z - f2.z * .25), hp2.clone().add(_v1.set(0, -.15, 0)), hp2.clone(), nz.clone()];
        hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .011, 6), hoseM); hose.castShadow = true; mover.parent.add(hose); } }
    const aim = p.aim ? new THREE.Vector3(...p.aim) : (LINK.buf ? LINK.buf.back.clone() : null), on = spray > .55 && aim && arms.hand;
    if (aim && LINK.buf) aim.addScaledVector(LINK.buf.fwd, Math.sin(t * 1.1) * .55);
    dr.forEach((d0, i) => { if (!on) { drp.setMatrixAt(i, zero); return; } const T = .5, age = ((t / T + d0.ph) % 1) * T, tgt = _v1.copy(aim).add(d0.j), v0 = _v2.copy(tgt).sub(nz).divideScalar(T); v0.y += 4.9 * T;
      mp.copy(nz).addScaledVector(v0, age); mp.y -= 4.9 * age * age; ms.setScalar(d0.sz); drp.setMatrixAt(i, _m4.compose(mp, mq, ms)); });
    drp.instanceMatrix.needsUpdate = true;
    mist.forEach(o2 => { const a = (t * .8 + o2.ph) % 1; if (!on) { o2.sp.material.opacity = 0; return; } o2.sp.position.copy(aim).add(_v1.set(o2.a * .6, a * .5, o2.b * .6)); o2.sp.scale.setScalar(.3 + a * .6); o2.sp.material.opacity = .28 * Math.sin(Math.PI * a) * spray; }); };
  return g; }

// ---- camera foreground layer (style.foreground): a few out-of-focus grass/reed blades in front of the lens at the frame corners,
// per beat camera.fg = { side: 'l'|'r'|'b', k: 0..1 }; they slide in with the camera move and sway in the wind
function buildForeground() { const g = new THREE.Group(), r = rng(13), sides = { l: new THREE.Group(), r: new THREE.Group() }; g.add(sides.l, sides.r);
  const mt = std('#c9d1b0', { r: .8, extra: { map: bladeTex(false), alphaTest: .35, side: THREE.DoubleSide, fog: false } }), dmt = std('#d6c9a4', { r: .9, extra: { map: bladeTex(true), alphaTest: .35, side: THREE.DoubleSide, fog: false } }), bl = [];
  for (const [key, sx] of [['l', -1], ['r', 1]]) for (let i = 0; i < 6; i++) { const len = .13 + r() * .12, m = new THREE.Mesh(bladeGeo(len, .009 + r() * .006, .3 + r() * .4), r() < .25 ? dmt : mt);
    m.position.set(sx * (.12 + r() * .06), -.33 - r() * .03, -.7 - r() * .2); m.rotation.set(-.15 + r() * .2, r() * 6.3, sx * (.05 + r() * .2)); sides[key].add(m); bl.push([m, r() * 6, m.rotation.z]); }
  g.traverse(m => { if (m.isMesh) m.renderOrder = 5; });
  const amt = (b) => { const f = b?.camera?.fg; if (!f) return { l: 0, r: 0 }; const k = f.k ?? 1, s2 = f.side || 'b'; return { l: s2 === 'l' || s2 === 'b' ? k : 0, r: s2 === 'r' || s2 === 'b' ? k : 0 }; };
  g.userData.update = (t, i) => { const bs = plan.beats, cur = amt(bs[i]); let a = cur; const kk = i > 0 ? easeIO((t - bs[i].start) / Math.max(.3, style.camEase)) : 1;
    if (kk < 1) { const pv = amt(bs[i - 1]); a = { l: lerp(pv.l, cur.l, kk), r: lerp(pv.r, cur.r, kk) }; }
    g.position.copy(camera.position); g.quaternion.copy(camera.quaternion);
    for (const key of ['l', 'r']) { sides[key].visible = a[key] > .02; sides[key].position.y = -(1 - a[key]) * .35; }
    bl.forEach(([m, ph, rz]) => { m.rotation.z = rz + Math.sin(t * 1.4 + ph) * .05; }); };
  return g; }
Object.assign(ASSETS, { buffalo: buffaloA, canal_bank: canalBank, canal_water: canalWater, mud_wallow: mudWallow, reeds, egret, fellah });
