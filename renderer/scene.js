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
    lights.sun.position.copy(fx.sunDir).multiplyScalar(40); lights.hemi.intensity = .9;
    if (env.shadowCenter) { lights.sun.position.add(new THREE.Vector3(...env.shadowCenter)); lights.sun.target.position.set(...env.shadowCenter); scene.add(lights.sun.target); } // tall scenes: centre the shadow box on the action
    return; }
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
  const sr = env.shadowSize || (style.shadowFit === false ? 14 : Math.min(14, Math.hypot(I.w, I.d) / 2 + 2));
  Object.assign(lights.sun.shadow.camera, { left: -sr, right: sr, top: sr, bottom: -sr, near: 1, far: 80 }); if (env.shadowSize) lights.sun.shadow.camera.updateProjectionMatrix();
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
  const names = new Set(); for (const b of p.beats || []) for (const a of b.add || []) { if (a.type === 'glb') names.add(a.params.model); if (a.params?.rider) names.add(a.params.rider); if (a.type === 'raker') names.add(a.params?.man || 'modular_men/Worker'); if (a.type === 'roof_person') names.add(a.params?.model || 'modular_men/Casual'); if (a.type === 'buffalo') names.add(a.params?.model || 'animals_pack/Bull'); if (a.type === 'fellah') names.add('modular_men/Farmer'); if (a.type === 'carpenter') names.add(a.params?.model || 'modular_men/Worker'); if (a.type === 'rig_person') names.add(a.params?.model || 'modular_men/Casual'); if (a.params?.hanger) names.add(a.params.hanger.model || 'modular_women/Casual'); }
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
  // p.model (e.g. 'animals_pack/Cow') = a plain library animal on the same walker: its own colours, no buffalo reshaping, no extra horns
  const MODEL = p.model || 'animals_pack/Bull', plain = MODEL !== 'animals_pack/Bull';
  const g = new THREE.Group(), src = GLB[MODEL]; if (!src) return g;
  const H = p.height || 1.65, o = skClone(src.scene); o.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(o, true), s = H / (bb.max.y - bb.min.y);
  o.scale.setScalar(s); o.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
  const mover = new THREE.Group(), roller = new THREE.Group(), shape = new THREE.Group(); g.add(mover); mover.add(roller); roller.position.y = .8; roller.add(shape); shape.position.y = -.8; shape.add(o);
  if (!plain) shape.scale.set(1.14, .97, 1.05); // buffalo: wider barrel, a little lower, longer than the bull
  const U = { uWet: { value: 0 }, uMud: { value: 0 }, uMudDry: { value: 0 }, uDust: { value: .6 }, uBaseY: { value: 0 }, uH: { value: H } };
  o.traverse(m => { if (!m.isMesh) return; m.frustumCulled = false; m.castShadow = m.receiveShadow = true; m.geometry.computeBoundingBox(); if (plain) return;
    const k = 1 / Math.max(1e-4, m.geometry.boundingBox.max.y - m.geometry.boundingBox.min.y);
    m.material = [].concat(m.material).map(mt => { const c = mt.clone(), n = mt.name || '';
      if (/Horn/.test(n)) { c.visible = false; return c; }
      if (/Main_Light/.test(n)) c.color.set('#3b3a3b'); else if (/Main/.test(n)) c.color.set('#353436'); else if (/Muzzle/.test(n)) c.color.set('#232120'); else if (/Hoove/.test(n)) c.color.set('#26221e');
      if (/Main|Muzzle/.test(n)) hideShader(c, U, k); return c; });
    if (m.material.length === 1) m.material = m.material[0]; });
  const hornM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: 0 }), horns = new THREE.Group(); g.add(horns);
  if (!plain) for (const sd of [1, -1]) { const hm = new THREE.Mesh(hornGeo(sd), hornM); hm.castShadow = true; horns.add(hm); }
  // animation: every clip plays, weights and times are set from t each frame (stateless, so any frame renders alone)
  const mixer = new THREE.AnimationMixer(o), acts = {};
  for (const c of src.animations) { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); acts[c.name.replace(/^.*\|/, '')] = a; }
  const B = n => o.getObjectByName(n), bones = { neck: B('Neck1'), head: B('Head'), headEnd: B('Head_end'), t2: B('Torso2'), t3: B('Torso3'), torso: B('Torso'), tail: [1, 2, 3, 4, 5, 6, 7].map(i => B('Tail' + i)) };
  const tweak = [bones.neck, bones.head, ...bones.tail].filter(Boolean), restQ = tweak.map(b => b.quaternion.clone());
  // walk speed of the clip (m per clip second), measured from the planted front hoof, so the gait matches the ground speed (no sliding)
  let vClip = .95; const foot = B('FrontLowerLegL_end') || B('FFL');
  if (acts.Walk && foot) { const T = acts.Walk.getClip().duration, P = []; acts.Walk.setEffectiveWeight(1);
    for (let i = 0; i <= 48; i++) { acts.Walk.time = i / 48 * T; mixer.update(0); g.updateMatrixWorld(true); foot.getWorldPosition(_v1); P.push([_v1.y, _v1.z]); }
    acts.Walk.setEffectiveWeight(0); const ym = Math.min(...P.map(q => q[0])), vs = [];
    for (let i = 1; i <= 48; i++) if (P[i][0] < ym + .02 * H && P[i - 1][0] < ym + .02 * H) vs.push(-(P[i][1] - P[i - 1][1]) / (T / 48));
    vs.sort((a, b2) => a - b2); if (vs.length > 3 && vs[vs.length >> 1] > .2) vClip = vs[vs.length >> 1]; console.warn('buffalo walk clip ground speed', vClip.toFixed(3)); }
  const LK = plain || p.tongue ? lickRig(g, o, mixer, acts, B, p) : null;
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
    if (LK) LK(t, mo, pm, ma, val, lat, up);
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

// ================= Rescue pack (2026-11-16, plans/rescue.mjs) =================
// Egyptian apartment block: red-brick infill in a concrete frame, slab-edge ledges on every floor, painted storeys above and
// below ONE real floor (window holes with aluminium sliding sashes, curtains, louvred shutters, rooms, a corridor with flat doors,
// a stair and an end window), a street (asphalt, interlock pavers, curbs, lamp posts) with flanking blocks, a window laundry rack
// that bends under a hanging person (anchors give, rod sags, bounce, falling clothes, crumbs), an outdoor AC unit with a spinning fan,
// a flat door that rattles and opens. Motion step-up: rig_person = a Quaternius person driven by its bones (named poses blended with
// easing, a walk/run/ledge-shuffle gait whose phase follows the distance moved, so feet do not slide), instead of static figures.
const kv = (keys, t, d = 0) => { if (!keys || !keys.length) return d; if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1];
  if (t < b[0]) return lerp(a[1], b[1], sEase((t - a[0]) / Math.max(.001, b[0] - a[0]))); } return keys[keys.length - 1][1]; };
const joltAt = (J, t) => (J || []).reduce((s, [tk, a]) => s + (t > tk ? a * Math.exp(-(t - tk) * 3.2) * Math.sin((t - tk) * 12.5) : 0), 0);
// world-aligned UVs: every piece of a wall shares one texture grid, so brick courses and storeys line up across pieces
function wUV(geo, o, su = 1, sv = su, ou = 0, ov = 0) { const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i) + o[0], y = P.getY(i) + o[1], z = P.getZ(i) + o[2], ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i));
    if (ay > .5) U.setXY(i, (x + ou) / su, z / sv); else if (ax > .5) U.setXY(i, (z + ou) / su, (y + ov) / sv); else U.setXY(i, (x + ou) / su, (y + ov) / sv); }
  U.needsUpdate = true; return geo; }
function wbox(par, x0, x1, y0, y1, z0, z1, mat, su = 1, sv = su, ou = 0, ov = 0) { const w = x1 - x0, h = y1 - y0, d = z1 - z0; if (w <= .002 || h <= .002 || d <= .002) return null;
  const c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], m = new THREE.Mesh(wUV(new THREE.BoxGeometry(w, h, d), c, su, sv, ou, ov), mat); m.position.set(...c); m.castShadow = m.receiveShadow = true; par.add(m); return m; }
// a wall running along x (axis 'x', thickness z0..z1) or along z (axis 'z', thickness x0..x1) minus rectangular holes [a0, a1, y0, y1]
function holedWall(par, axis, a0, a1, y0, y1, t0, t1, holes, mat, ...uv) { const cuts = [...new Set([a0, a1, ...holes.flatMap(h => [h[0], h[1]])])].filter(v => v >= a0 && v <= a1).sort((p, q) => p - q);
  const piece = (u0, u1, ya, yb) => axis === 'x' ? wbox(par, u0, u1, ya, yb, t0, t1, mat, ...uv) : wbox(par, t0, t1, ya, yb, u0, u1, mat, ...uv);
  for (let i = 0; i < cuts.length - 1; i++) { const u0 = cuts[i], u1 = cuts[i + 1], h = holes.find(q => q[0] <= u0 + 1e-4 && q[1] >= u1 - 1e-4);
    if (!h) piece(u0, u1, y0, y1); else { piece(u0, u1, y0, h[2]); piece(u0, u1, h[3], y1); } } }
function interlockTex() { return SPR.interlock ||= canvasT(256, 256, (c, w, h) => { const r = rng(83); c.fillStyle = '#8f8a82'; c.fillRect(0, 0, w, h); const q = w / 8;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = .86 + r() * .2, red = (i + j * 3) % 7 === 0; c.fillStyle = red ? `rgb(${150 * v | 0},${92 * v | 0},${72 * v | 0})` : `rgb(${176 * v | 0},${170 * v | 0},${160 * v | 0})`;
    if ((i + j) % 2) c.fillRect(i * q + 2, j * q + 2, q - 4, q - 4); else { c.fillRect(i * q + 2, j * q + 2, q - 4, q / 2 - 3); c.fillRect(i * q + 2, j * q + q / 2 + 1, q - 4, q / 2 - 3); } }
  for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,250,240' : '50,45,40'},${r() * .1})`; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, [1, 1]); }
function asphaltTex() { return SPR.asphalt ||= canvasT(512, 512, (c, w, h) => { const r = rng(85); c.fillStyle = '#4a4a4b'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 40 + r() * 70 | 0; c.fillStyle = `rgba(${v},${v},${v + 2},${.25 + r() * .3})`; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h, R = 30 + r() * 90, g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(${r() > .5 ? '35,35,36' : '120,116,108'},${.15 + r() * .15})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - R, y - R, 2 * R, 2 * R); }
  c.strokeStyle = 'rgba(20,20,20,.5)'; for (let k = 0; k < 6; k++) { c.lineWidth = .8 + r(); c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let s = 0; s < 10; s++) { x += (r() - .5) * 30; y += (r() - .5) * 30; c.lineTo(x, y); } c.stroke(); } }, [1, 1]); }
function louverTex(colr) { return SPR['lv' + colr] ||= canvasT(64, 128, (c, w, h) => { c.fillStyle = colr; c.fillRect(0, 0, w, h);
  for (let y = 4; y < h; y += 7) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(4, y, w - 8, 2); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(4, y + 2, w - 8, 1); }
  c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, 0, 4, h); c.fillRect(w - 4, 0, 4, h); c.fillRect(w / 2 - 1, 0, 2, h); }, [1, 1]); }
function doorTex() { return SPR.flatDoor ||= canvasT(128, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#5a3a24'); g.addColorStop(.5, '#6a452b'); g.addColorStop(1, '#553722'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const r = rng(87); for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(30,18,10,${.08 + r() * .12})`; c.lineWidth = 1; c.beginPath(); const x = r() * w; c.moveTo(x, 0); c.bezierCurveTo(x + 4, h * .3, x - 4, h * .7, x + 2, h); c.stroke(); }
  c.strokeStyle = 'rgba(25,15,8,.55)'; c.lineWidth = 3; for (const [x, y, ww, hh] of [[16, 16, 96, 100], [16, 138, 96, 100]]) { c.strokeRect(x, y, ww, hh); c.strokeStyle = 'rgba(255,220,180,.12)'; c.strokeRect(x + 3, y + 3, ww - 6, hh - 6); c.strokeStyle = 'rgba(25,15,8,.55)'; } }); }
function acTex() { return SPR.acBody ||= canvasT(128, 128, (c, w, h) => { c.fillStyle = '#e6e3da'; c.fillRect(0, 0, w, h); const r = rng(89);
  for (let i = 0; i < 18; i++) { const x = r() * w, g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(120,100,70,0)'); g.addColorStop(1, `rgba(120,100,70,${.08 + r() * .14})`); c.fillStyle = g; c.fillRect(x, h * r() * .4, 2 + r() * 5, h); }
  for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(90,80,60,${r() * .07})`; c.fillRect(r() * w, r() * h, 1, 1); } }, [1, 1]); }
function finTex() { return SPR.acFin ||= canvasT(64, 64, (c, w, h) => { c.fillStyle = '#3a3c3d'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(200,200,195,.55)'; for (let x = 0; x < w; x += 3) c.fillRect(x, 0, 1, h); }, [4, 4]); }

// ---- rig: bone poses for static Quaternius people. Channels are angles about the person's own axes (x right... facing +z):
// adL/adR arm lowered from the T-pose, fL/fR arm swung forward (0 = hanging), eL/eR elbows, sp/tw torso lean/twist, hd/ht head nod/turn,
// hL/hR hip flexion, kL/kR knees, oL/oR legs out to the side. Arm and leg angles are measured from the person's vertical, not the torso.
const RIG0 = { adL: 1.3, adR: 1.3, fL: .05, fR: .05, eL: .15, eR: .15, sp: 0, tw: 0, hd: 0, ht: 0, hL: 0, hR: 0, kL: 0, kR: 0, oL: 0, oR: 0, hold: 0 }; // hold 1 = both hands carry something (no arm swing)
const RIG_POSES = {
  stand: {}, walk: { sp: .04, eL: .35, eR: .35 }, run: { sp: .24, eL: 1.45, eR: 1.45, hd: -.1 },
  look: { sp: .22, ht: .75, hd: .05, fL: .35, fR: .35, eL: .9, eR: .9 },                       // leaning on a sill, looking to the left
  knock: { fR: 1.3, eR: .35, fL: .15, sp: .1, shake: 1 },                                           // tries the handle, rattles it
  turn: { sp: .15, ht: -.5, fL: .3, eL: .6 },
  climb: { adL: 1.1, adR: 1.1, fL: 1.5, fR: 1.5, eL: .7, eR: .7, sp: .6, hL: 1.45, kL: 1.95, hR: .8, kR: 1.2, hd: -.2 },
  ledge: { adL: .45, adR: .45, fL: .25, fR: .25, eL: .55, eR: .55, sp: -.05, hd: -.05 },         // face to the wall, arms spread on the bricks
  peek: { adL: .45, adR: .35, fL: .25, fR: .3, eL: .55, eR: .4, sp: -.05, ht: -.9, hd: -.05 },     // on the ledge, looking along the wall
  recoil: { adL: .55, adR: .7, fL: .55, fR: .3, eL: .8, eR: .4, sp: -.16, hd: -.25, ht: -.6 },
  wait: { fL: .25, eL: 1.2, fR: .2, eR: .3, ht: .3, sp: .04 },
  key: { fR: 1.15, eR: .55, fL: .45, eL: .5, sp: .14, hd: .2, shake: .4 },
  lean: { sp: 1.05, fL: 1.15, fR: 1.2, eL: .15, eR: .15, hd: -.35, hL: .1, hR: .1 },                // half out of a window, arms reaching down
  kneelLean: { sp: 1.25, fL: .75, fR: .85, eL: .1, eR: .1, hd: -.4, kL: 1.55, kR: 1.55 },          // kneeling at a low sill, arms down to the rack
  pull: { sp: -.28, fL: .95, fR: 1.0, eL: 1.0, eR: 1.0, hL: .6, kL: .75, hR: -.25, kR: .15, hd: .1 },
  pullKneel: { sp: .15, fL: .9, fR: .95, eL: 1.1, eR: 1.1, kL: 1.55, kR: 1.55, hd: .1 },
  gaze: { hd: -.6, sp: -.12, fL: .1, fR: .1 }, point: { hd: -.55, sp: -.12, fR: 2.45, eR: .1, adR: 1.2 },
  gasp: { hd: -.5, sp: -.08, fL: 1.35, eL: 2.3, fR: 1.25, eR: 2.4, adL: 1.45, adR: 1.45 },
  cheer: { adL: .35, adR: .35, fL: 2.5, fR: 2.6, eL: .35, eR: .35, hd: -.35 }, relief: { hd: -.2, fL: 1.2, eL: 2.2, fR: .1, sp: -.05 },
  hang2: { fL: 2.75, fR: 2.75, eL: .25, eR: .3, sp: -.18, hd: -.35, hL: .15, hR: .12, kL: .45, kR: .5, oL: .04, oR: .04 },   // upside down from both feet
  hang1: { fL: 2.5, fR: 2.9, eL: .5, eR: .2, adL: 1.0, sp: -.25, tw: .25, hd: -.4, hR: .1, kR: .55, hL: 1.0, kL: 1.15, oL: .4 }, // one leg hooked, the other free
  pulled: { fL: 1.9, fR: 2.1, eL: 1.1, eR: 1.0, adL: 1.1, adR: 1.1, sp: .1, hd: .1, hR: .1, kR: .4, hL: .4, kL: .5 } };
const GAIT = { walk: { stride: 1.45, v: 1.1, hip: .42, knee: .6, arm: .35, bob: .025 }, run: { stride: 2.3, v: 3.2, hip: .78, knee: 1.35, arm: .6, bob: .055 },
  shuffle: { stride: .5, v: .3, abd: .22, bob: .012 } };
function poseOf(n) { return { ...RIG0, ...(RIG_POSES[n] || {}) }; }
function blendPose(a, b, k) { const o = {}; for (const key in RIG0) o[key] = lerp(a[key], b[key], k); o.shake = lerp(a.shake || 0, b.shake || 0, k); return o; }
function makeRig(model, height) { const w = ASSETS.glb({ model, height, arms: 0 }), B = {}, q = new THREE.Quaternion(), AX = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (const n of ['Torso', 'Chest', 'Neck', 'Head', 'UpperArmL', 'UpperArmR', 'LowerArmL', 'LowerArmR', 'UpperLegL', 'UpperLegR', 'LowerLegL', 'LowerLegR']) { const b = w.getObjectByName(n); if (b) B[n] = { b, rest: b.quaternion.clone() }; }
  const bend = (n, ax, a) => { if (B[n] && a) bendBone(B[n].b, AX[ax], a); };
  const apply = P => { for (const k in B) B[k].b.quaternion.copy(B[k].rest); w.updateWorldMatrix(true, false); w.getWorldQuaternion(q);
    AX[0].set(1, 0, 0).applyQuaternion(q); AX[1].set(0, 1, 0).applyQuaternion(q); AX[2].set(0, 0, 1).applyQuaternion(q);
    bend('Torso', 0, P.sp * .8); bend('Torso', 1, P.tw); bend('Chest', 0, P.sp * .2); bend('Neck', 0, P.hd * .4); bend('Head', 0, P.hd * .6); bend('Head', 1, P.ht);
    bend('UpperArmL', 2, -P.adL); bend('UpperArmL', 0, -P.fL); bend('LowerArmL', 0, -P.eL);
    bend('UpperArmR', 2, P.adR); bend('UpperArmR', 0, -P.fR); bend('LowerArmR', 0, -P.eR);
    bend('UpperLegL', 2, P.oL); bend('UpperLegL', 0, -P.hL); bend('LowerLegL', 0, P.kL);
    bend('UpperLegR', 2, -P.oR); bend('UpperLegR', 0, -P.hR); bend('LowerLegR', 0, P.kR); };
  return { w, apply }; }
// track keys [t, x, y, z, yaw|null, pose, gait|null]: eased moves (gait moves keep a steady pace with short ramps); pose blends at each key
function trapE(u, r = .18) { u = clamp(u); const k = 1 / (1 - r); return u < r ? k * u * u / (2 * r) : u > 1 - r ? 1 - k * (1 - u) * (1 - u) / (2 * r) : k * (u - r / 2); }
function trapV(u, r = .18) { u = clamp(u); const k = 1 / (1 - r); return u < r ? k * u / r : u > 1 - r ? k * (1 - u) / r : k; }
function rigTrack(keys) { const K = keys.map(k => ({ t: k[0], p: new THREE.Vector3(k[1], k[2], k[3]), yaw: k[4], pose: k[5] || 'stand', gait: k[6] || null, ease: k[7] || null })), seg = [];
  let cum = 0, yp = K[0].yaw ?? 0;
  for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1], len = a.p.distanceTo(b.p), hz = Math.hypot(b.p.x - a.p.x, b.p.z - a.p.z);
    const y1 = angTo(yp, b.yaw != null ? b.yaw : hz > .05 ? Math.atan2(b.p.x - a.p.x, b.p.z - a.p.z) : yp); seg.push({ a, b, len, cum, y0: yp, y1 }); cum += len; yp = y1; }
  return t => { if (!seg.length || t <= K[0].t) return { pos: K[0].p, yaw: seg[0]?.y0 ?? yp, A: K[0].pose, B: K[0].pose, pk: 1, gait: null, dist: 0, speed: 0 };
    const i = seg.findIndex(q => t < q.b.t); if (i < 0) { const q = seg[seg.length - 1]; return { pos: q.b.p, yaw: q.y1, A: q.a.pose, B: q.b.pose, pk: 1, gait: null, dist: cum, speed: 0 }; }
    const q = seg[i], D = Math.max(.001, q.b.t - q.a.t), u = (t - q.a.t) / D, g = q.b.gait, e = g ? trapE(u) : sEase(u);
    return { pos: q.a.p.clone().lerp(q.b.p, e), yaw: lerp(q.y0, q.y1, easeIO(u / .3)), A: q.a.pose, B: q.b.pose, pk: q.b.ease === 'in' ? Math.pow(clamp((t - q.a.t) / Math.min(.45, D * .6)), 2.2) : easeIO((t - q.a.t) / Math.min(.45, D * .6)), gait: g, // 'in' = accelerate into the pose (a hammer blow)
     
      dist: q.cum + q.len * e, speed: q.len / D * (g ? trapV(u) : Math.PI / 2 * Math.sin(Math.PI * u)) }; }; }
function gaitAdd(P, st, t) { const G = GAIT[st.gait]; let bob = 0; if (!G) return bob; const a = clamp(st.speed / G.v), ph = st.dist / G.stride * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
  if (st.gait === 'shuffle') { P.oL += G.abd * Math.max(0, s) * a; P.oR += G.abd * Math.max(0, -s) * a; P.hL += .08 * Math.max(0, s) * a; P.hR += .08 * Math.max(0, -s) * a; return G.bob * Math.abs(c) * a; }
  P.hL += G.hip * s * a; P.hR -= G.hip * s * a; P.kL += (st.gait === 'run' ? .25 : .1) * a + G.knee * Math.max(0, c) * a; P.kR += (st.gait === 'run' ? .25 : .1) * a + G.knee * Math.max(0, -c) * a;
  P.fL -= G.arm * s * a * (1 - P.hold); P.fR += G.arm * s * a * (1 - P.hold); P.tw += .08 * s * a; bob = G.bob * Math.abs(c) * a; return bob; }
function rigPerson(p = {}) { const g = new THREE.Group(), mover = new THREE.Group(); g.add(mover);
  const rig = makeRig(p.model || 'modular_men/Casual', p.height || 1.75); mover.add(rig.w); const csh = p.shadow === false ? null : contactShadow(.3, .3, .32); if (csh) g.add(csh);
  const TR = rigTrack(p.track || [[0, 0, 0, 0, 0, p.pose || 'stand']]), ph = (p.seed || 1) * .37;
  g.userData.tick = t => { const st = TR(t), P = blendPose(poseOf(st.A), poseOf(st.B), st.pk);
    P.sp += .015 * Math.sin(t * 1.7 + ph); P.ht += .05 * Math.sin(t * .45 + ph) * (st.gait ? 0 : 1);                     // breathing, small glances
    if (P.shake) { P.fR += .07 * Math.sin(t * 21) * P.shake; P.eR += .05 * Math.sin(t * 21 + 1) * P.shake; P.sp += .02 * Math.sin(t * 21) * P.shake; }
    const bob = gaitAdd(P, st, t); mover.position.set(st.pos.x, st.pos.y + bob, st.pos.z); mover.rotation.y = st.yaw;
    mover.rotation.z = st.gait === 'shuffle' ? .03 * Math.sin(st.dist / .5 * Math.PI * 2) : 0; rig.apply(P);
    if (p.link) { rig.w.updateWorldMatrix(true, true); const pa = s => { const h = rig.w.getObjectByName('Hand' + s), m = rig.w.getObjectByName('Middle2' + s); return h ? h.getWorldPosition(new THREE.Vector3()).lerp(m ? m.getWorldPosition(new THREE.Vector3()) : h.getWorldPosition(new THREE.Vector3()), .5) : null; };
      LINK[p.link] = { L: pa('L'), R: pa('R'), yaw: st.yaw, pos: st.pos.clone() }; } // palms for props carried between the hands (salt block)
    if (csh) { csh.position.set(st.pos.x, st.pos.y + .015, st.pos.z); csh.visible = !p.noShadowAbove || st.pos.y < p.noShadowAbove; } };
  return g; }

// ---- window glass, sashes, curtains, shutters
function glassMat() { return SPR.glassM ||= new THREE.MeshStandardMaterial({ color: col('#4d6270'), roughness: .06, metalness: .35, transparent: true, opacity: .5, envMapIntensity: 1.3 }); }
function sashWindow(par, x0, x1, y0, y1, z, open, alu) { const w = x1 - x0, b = .045, sw = w / 2 + .02;
  wbox(par, x0, x1, y0, y0 + b, z - .06, z, alu); wbox(par, x0, x1, y1 - b, y1, z - .06, z, alu); wbox(par, x0, x0 + b, y0, y1, z - .06, z, alu); wbox(par, x1 - b, x1, y0, y1, z - .06, z, alu);
  if (open === 'full') return; // casement swung fully open into the room: only the frame shows
  for (const k of [0, 1]) { let sx = k ? x1 - sw : x0; const zz = z - .015 - k * .03; if (open === 'L' && k === 0) sx = x1 - sw - .04; if (open === 'R' && k === 1) sx = x0 + .04;
    const s = new THREE.Group(); par.add(s); wbox(s, sx, sx + sw, y0 + b, y0 + b + .04, zz - .02, zz, alu); wbox(s, sx, sx + sw, y1 - b - .04, y1 - b, zz - .02, zz, alu);
    wbox(s, sx, sx + .04, y0 + b, y1 - b, zz - .02, zz, alu); wbox(s, sx + sw - .04, sx + sw, y0 + b, y1 - b, zz - .02, zz, alu);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(sw - .08, y1 - y0 - 2 * b - .08), glassMat()); gl.position.set(sx + sw / 2, (y0 + y1) / 2, zz - .01); s.add(gl); } }
function curtain(par, x, y0, y1, z, w, colr, ph, list) { const h = y1 - y0, geo = new THREE.PlaneGeometry(w, h, 12, 4), P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin(P.getX(i) / w * Math.PI * 7) * .035); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col(colr), roughness: .95, side: THREE.DoubleSide, map: SPR.cloth || null })); const pv = new THREE.Group(); pv.position.set(x, y1, z); m.position.y = -h / 2; pv.add(m); par.add(pv); list.push({ pv, ph }); }

// ---- the apartment block. Front face at z 0 (facing the street, +z), x centred, `depth` back to -z. Storey height fh; floor `real` is built for real.
function aptBlock(p = {}) { const g = new THREE.Group(), fh = p.fh || 3, nF = p.floors || 10, bw = p.bayW || 3.5, W = bw * (p.bays || 5), hw = W / 2, D = p.depth || 12, F = (p.real ?? 8) * fh, top = nF * fh;
  const facM = new THREE.MeshStandardMaterial({ map: tiled(facadeTex(p.facade || 'brick')), roughness: .92 }), brick = new THREE.MeshStandardMaterial({ map: tiled(redBrickTex()), roughness: .93 });
  const conc = new THREE.MeshStandardMaterial({ map: tiled(plasterTex('#b9b3a8', 73)), roughness: .9 }), inner = new THREE.MeshStandardMaterial({ map: tiled(plasterTex(p.inner || '#e9dfcc', 75)), roughness: .95 });
  const ceil = new THREE.MeshStandardMaterial({ map: tiled(plasterTex('#efe9dc', 77)), roughness: .95 }), alu = std('#c4c8c9', { m: .55, r: .35 });
  const tileM = new THREE.MeshStandardMaterial({ map: canvasT(256, 256, (c, w, h) => { const r0 = rng(79), n = 4, q = w / n; c.fillStyle = '#9c9284'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = .93 + r0() * .1; c.fillStyle = `rgb(${226 * v | 0},${214 * v | 0},${192 * v | 0})`; c.fillRect(i * q + 2, j * q + 2, q - 4, q - 4); } }, [1, 1]), roughness: .4 });
  tileM.map.wrapS = tileM.map.wrapT = THREE.RepeatWrapping;
  const fu = [bw, fh, hw, 0];                                                       // facade texture grid: one bay x one storey, bays from the left edge
  // painted storeys below and above the real floor (their windows are in the facade texture)
  const lower = wbox(g, -hw, hw, 0, F, -D, 0, facM, ...fu); lower.material = [facM, facM, tileM, facM, facM, facM]; wUV(lower.geometry, [0, F / 2, -D / 2], ...fu);
  const tUV = lower.geometry.attributes.uv, tP = lower.geometry.attributes.position, tN = lower.geometry.attributes.normal; for (let i = 0; i < tP.count; i++) if (tN.getY(i) > .5) tUV.setXY(i, tP.getX(i) / 1.6, tP.getZ(i) / 1.6);
  const upper = wbox(g, -hw, hw, F + fh, top, -D, 0, facM, ...fu); upper.material = [facM, facM, conc, ceil, facM, facM];
  // slab-edge ledges on every floor (the real floor's ledge is the one the neighbour walks on)
  for (let n = 1; n <= nF; n++) { const L = n === nF ? .12 : (p.ledge || .35); wbox(g, -hw - .12, hw + .12, n * fh - .12, n * fh + .12, -.02, L, conc, 1); }
  // real floor: front wall = brick infill with window holes, concrete columns at the bay edges, beam on top
  const wins = p.win || [], holes = wins.map(o => [o.x - o.w / 2, o.x + o.w / 2, F + o.y0, F + o.y1]), bt = F + fh - .28;
  holedWall(g, 'x', -hw, hw, F, bt, -.25, 0, holes, brick, 1); wbox(g, -hw, hw, bt, F + fh, -.25, .02, conc, 1);
  for (let k = 0; k < (p.bays || 5); k++) wbox(g, -hw + k * bw, -hw + k * bw + .32, F, bt, -.25, .02, conc, 1);
  const curt = [], r = rng(p.seed || 93), CUR = ['#d9cbb0', '#b9c7c9', '#c9a98f', '#e3dccd'];
  for (const o of wins) { const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, y0 = F + o.y0, y1 = F + o.y1;
    wbox(g, x0 - .05, x1 + .05, y0 - .05, y0, -.27, .06, conc, 1);                     // concrete sill
    if (o.shut) { const lv = new THREE.MeshStandardMaterial({ map: louverTex(o.shut === true ? '#5d6e4a' : o.shut), roughness: .8 }); wbox(g, x0, x1, y0, y1, -.08, -.03, lv, o.w, y1 - y0, -x0, -y0); }
    else sashWindow(g, x0, x1, y0, y1, -.08, o.open, alu);
    if (o.curtain !== false) { const cc = o.curtain || CUR[Math.floor(r() * CUR.length)]; curtain(g, x0 + .18, F + .05, y1 + .15, -.42, .42, cc, r() * 6, curt); curtain(g, x1 - .18, F + .05, y1 + .15, -.42, .42, cc, r() * 6, curt); } }
  // rooms, corridor, doors, stair (inside the real floor)
  const [cz0, cz1] = p.corr || [-6.4, -5.0];
  for (const x of p.parts || []) wbox(g, x - .06, x + .06, F, F + fh, cz1, -.25, inner, 1.5);
  holedWall(g, 'x', -hw + .25, hw - .25, F, F + fh, cz1 - .12, cz1, (p.doors || []).map(d => [d.x - d.w / 2, d.x + d.w / 2, F, F + d.h]), inner, 1.5);
  const leafM = new THREE.MeshStandardMaterial({ map: doorTex(), roughness: .6 });
  for (const d of p.doors || []) { if (d.leaf === false) continue; const L = new THREE.Group(); L.position.set(d.x - d.w / 2 + .02, F, cz1 - .06); L.rotation.y = -(d.open || 0); g.add(L);
    const lf = box(d.w - .04, d.h - .02, .045, leafM); lf.position.set((d.w - .04) / 2, (d.h - .02) / 2, 0); L.add(lf); const hd = box(.12, .025, .05, alu); hd.position.set(d.w - .14, 1.02, .05); L.add(hd); shadowed(L); }
  const [sx0, sx1, sd] = p.stair || [-8.45, -7.25, -8.6];
  wbox(g, -hw, sx0, F, F + fh, -D, cz0, inner, 1.5); wbox(g, sx1, hw, F, F + fh, -D, cz0, inner, 1.5); wbox(g, sx0, sx1, F, F + fh, -D, sd, inner, 1.5);
  for (let s = 0; s < 6; s++) wbox(g, sx0, sx1, F - .17 * (s + 1), F - .17 * s, cz0 - .28 * (s + 1), cz0 - .28 * s, conc, 1);
  wbox(g, sx0 - .02, sx0 + .03, F, F + .95, sd, cz0, alu); wbox(g, sx0 - .02, sx1, F + .92, F + .97, cz0 - .03, cz0 + .02, alu);
  const ew = p.endWin || [-6.3, -5.15, .8, 2.65];
  wbox(g, -hw, -hw + .25, F, F + fh, cz0, -.25, facM, ...fu);                                     // left gable wall of the real floor
  holedWall(g, 'z', cz0, -.25, F, F + fh, hw - .25, hw, [[ew[0], ew[1], F + ew[2], F + ew[3]]], facM, ...fu); // right gable with the corridor's end window
  wbox(g, hw - .27, hw + .06, F + ew[2] - .05, F + ew[2], ew[0] - .05, ew[1] + .05, conc, 1);
  const lamp = new THREE.PointLight(0xffe2b8, p.lampI ?? 7, 11, 1.6); lamp.position.set(p.lampX ?? 3, F + fh - .35, (cz0 + cz1) / 2); g.add(lamp);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffe2b0', emissiveIntensity: 2.2 })); bulb.position.copy(lamp.position); g.add(bulb);
  g.userData.tick = t => curt.forEach(o => { o.pv.rotation.x = -.04 - .04 * Math.sin(t * 1.3 + o.ph); o.pv.rotation.z = .02 * Math.sin(t * .9 + o.ph); });
  return g; }

// ---- street: interlock sidewalks with curbs, asphalt road with a dashed centre line, paving beyond, lamp posts, flanking blocks with ledges
function streetSet(p = {}) { const g = new THREE.Group(), X = p.w || 64, Z0 = p.z0 ?? -30, Z1 = p.z1 ?? 30, [s0, s1] = p.walk || [0, 2.4], [r0, r1] = p.road || [2.4, 10.6], s2 = p.walk2 ?? 13;
  const pav = new THREE.MeshStandardMaterial({ map: tiled(interlockTex()), roughness: .9 }), asp = new THREE.MeshStandardMaterial({ map: tiled(asphaltTex()), roughness: .93 });
  const curbM = new THREE.MeshStandardMaterial({ map: canvasT(64, 16, (c, w, h) => { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#e8e3d6' : '#2c2c2c'; c.fillRect(i * w / 4, 0, w / 4, h); } }, [1, 1]), roughness: .8 });
  curbM.map.wrapS = curbM.map.wrapT = THREE.RepeatWrapping;
  wbox(g, -X / 2, X / 2, -.05, .01, Z0, s0, pav, 2.5); wbox(g, -X / 2, X / 2, -.05, .15, s0, r0 - .15, pav, 2.5); wbox(g, -X / 2, X / 2, -.05, .02, r0, r1, asp, 6);
  wbox(g, -X / 2, X / 2, -.05, .15, r1 + .15, s2, pav, 2.5); wbox(g, -X / 2, X / 2, -.05, .05, s2, Z1, pav, 2.5);
  for (const z of [r0 - .15, r1]) wbox(g, -X / 2, X / 2, -.05, .17, z, z + .15, curbM, 2, 1);
  const lineM = std('#e9e4d2', { r: .7 }); for (let x = -X / 2 + 1; x < X / 2; x += 4.5) wbox(g, x, x + 2.2, .02, .026, (r0 + r1) / 2 - .06, (r0 + r1) / 2 + .06, lineM);
  const pole = std('#5d6b62', { m: .5, r: .5 }), head = std('#d9dcd6', { r: .4 });
  for (const [x, z] of p.lamps || []) { const L = new THREE.Group(); L.position.set(x, .15, z); const ps = cyl(.06, .09, 6.5, pole); ps.position.y = 3.25; L.add(ps);
    const arm = cyl(.035, .035, 1.4, pole); arm.rotation.x = Math.PI / 2; arm.position.set(0, 6.4, .7); L.add(arm); const hd = box(.28, .1, .5, head); hd.position.set(0, 6.35, 1.35); L.add(hd); shadowed(L); g.add(L); }
  for (const [x0, x1, h, kind, d] of p.blocks || []) { const fm = new THREE.MeshStandardMaterial({ map: tiled(facadeTex(kind)), roughness: .93 }), cm = new THREE.MeshStandardMaterial({ map: tiled(plasterTex('#bdb7ab', 67)), roughness: .9 });
    const m = wbox(g, x0, x1, 0, h, -(d || 12), 0, fm, 3.5, 3, -x0, 0); m.material = [fm, fm, cm, fm, fm, fm];
    for (let y = 3; y <= h; y += 3) wbox(g, x0 - .08, x1 + .08, y - .1, y + .1, -(d || 12), .3, cm, 1);
    wbox(g, x0, x1, h, h + 1, -.2, 0, cm, 1); }
  return g; }

// ---- window laundry rack (منشر): wall plates, two bracket arms with diagonal struts, 5 rods, clothes; it bends under a hanging person.
// params: w, out, rods, bendK [[t,0..1]], slipK, pullK, jolts [[t,amp]], hanger {model,height,hookX}, pullPath [[k,x,y,z,rx]], drops [[t,x]], crumbs [t], groundY
function washRack(p = {}) { const g = new THREE.Group(), W = p.w || 1.4, O = p.out || .75, n = p.rods || 5, r = rng(p.seed || 91), steel = std(p.color || '#8b8f8c', { m: .55, r: .45 });
  const arm = new THREE.Group(); g.add(arm); const V = (a, b, c) => new THREE.Vector3(a, b, c), struts = [];
  for (const s of [-1, 1]) { const x = s * W / 2, pl = box(.05, .5, .015, steel); pl.position.set(x, -.2, .008); g.add(pl);
    const bar = box(.025, .025, O + .02, steel); bar.position.set(x, 0, (O + .02) / 2); arm.add(bar);
    for (let k = 0; k < 2; k++) { const c = cyl(.009, .009, 1, steel, 6); c.castShadow = true; g.add(c); struts.push({ c, x, k }); } }
  for (let i = 0; i < n - 1; i++) { const c = cyl(.006, .006, W + .04, steel, 6); c.rotation.z = Math.PI / 2; c.position.set(0, .012, O * (i + 1) / n); arm.add(c); }
  const NS = 14, outer = []; for (let i = 0; i < NS; i++) { const c = cyl(.007, .007, 1, steel, 6); c.castShadow = true; arm.add(c); outer.push(c); }
  const sagAt = (x, S, xh) => -S * Math.max(0, 1 - ((x - xh) / (W * .62)) ** 2);
  const clothes = [], tex = SPR.cloth; let x = -W / 2 + .12;
  for (let i = 0; i < (p.clothes ?? 4); i++) { const cw = .22 + r() * .25, ch = .3 + r() * .35, ri = Math.floor(r() * (n - 2)), z = O * (ri + 1) / n; if (x + cw > W / 2 - .05) break;
    const geo = new THREE.PlaneGeometry(cw, ch, 3, 5); geo.translate(0, -ch / 2, 0); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex || null, color: col(CLOTH[Math.floor(r() * CLOTH.length)]), roughness: .95, side: THREE.DoubleSide }));
    const pv = new THREE.Group(); pv.position.set(x + cw / 2, .012, z); pv.rotation.y = Math.PI / 2 * 0; pv.add(m); arm.add(pv); clothes.push({ pv, ph: r() * 6 }); x += cw + .1; }
  shadowed(g);
  // hanging person
  let hang = null; if (p.hanger) { const wg = new THREE.Group(), rig = makeRig(p.hanger.model || 'modular_women/Casual', p.hanger.height || 1.7); rig.w.position.x = p.hanger.footX ?? .1; wg.add(rig.w); g.add(wg); hang = { wg, rig }; }
  const drops = (p.drops || []).map(([t0, dx], i) => { const cw = .3 + r() * .2, ch = .35 + r() * .3, geo = new THREE.PlaneGeometry(cw, ch, 3, 4); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex || null, color: col(CLOTH[(i * 3 + 2) % CLOTH.length]), roughness: .95, side: THREE.DoubleSide }));
    m.castShadow = true; g.add(m); return { m, t0, dx, ph: r() * 6 }; });
  const crumbs = (p.crumbs || []).flatMap(t0 => Array.from({ length: 7 }, () => { const m = box(.02 + r() * .025, .015 + r() * .02, .02 + r() * .02, std('#a69e90')); g.add(m); return { m, t0, vx: (r() - .5) * .6, vz: .2 + r() * .5, sx: (r() > .5 ? 1 : -1) * W / 2 }; }));
  const gy = p.groundY ?? -24, hookX = p.hanger?.hookX ?? -.25, path = p.pullPath || [], tmp = new THREE.Vector3();
  g.userData.tick = t => { const bend = kv(p.bendK, t), jol = joltAt(p.jolts, t), ang = bend * .5 + jol * .06, S = .025 + .11 * bend + jol * .03, xh = hookX;
    arm.rotation.x = ang; arm.rotation.z = -bend * .05 * Math.sign(xh || 1);
    for (let i = 0; i < NS; i++) { const xa = -W / 2 - .02 + (W + .04) * i / NS, xb = -W / 2 - .02 + (W + .04) * (i + 1) / NS, a = V(xa, .012 + sagAt(xa, S, xh), O), b = V(xb, .012 + sagAt(xb, S, xh), O), c = outer[i];
      c.position.copy(a).add(b).multiplyScalar(.5); c.scale.set(1, a.distanceTo(b), 1); c.quaternion.setFromUnitVectors(V(0, 1, 0), b.sub(a).normalize()); }
    // diagonal struts: wall foot fixed, top end rides the bending arm; the joint kinks outward as the anchors give
    arm.updateMatrix(); for (const s of struts) { const top = V(s.x, 0, O * .62).applyMatrix4(arm.matrix), foot = V(s.x, -.42, .01), mid = foot.clone().lerp(top, .5).add(V(0, -.04 * bend, .06 * bend));
      const a = s.k ? mid : foot, b = s.k ? top : mid; s.c.position.copy(a).add(b).multiplyScalar(.5); s.c.scale.set(1, a.distanceTo(b), 1); s.c.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); }
    clothes.forEach(o => { o.pv.rotation.x = .08 + Math.sin(t * 1.8 + o.ph) * .12 - ang * .8 + jol * .4; o.pv.rotation.z = Math.sin(t * 1.3 + o.ph) * .04; });
    if (hang) { const slip = kv(p.slipK, t), pull = kv(p.pullK, t), hk = V(xh, .012 + sagAt(xh, S, xh), O).applyMatrix4(arm.matrix);
      const pts = [[0, hk.x, hk.y, hk.z, 0], ...path]; let j = 0; while (j < pts.length - 2 && pull > pts[j + 1][0]) j++;
      const A = pts[j], B = pts[Math.min(j + 1, pts.length - 1)], u = B === A ? 0 : clamp((pull - A[0]) / Math.max(.001, B[0] - A[0])), e = sEase(u);
      hang.wg.position.set(lerp(A[1], B[1], e), lerp(A[2], B[2], e), lerp(A[3], B[3], e)); const still = 1 - clamp(pull * 3);
      hang.wg.rotation.set(lerp(A[4], B[4], e) + (.07 * Math.sin(t * 1.9) + jol * .5) * still, 0, Math.PI + (slip * .2 + .04 * Math.sin(t * 1.4 + 1)) * still);
      const P = blendPose(blendPose(poseOf('hang2'), poseOf('hang1'), slip), poseOf('pulled'), clamp(pull * 2)), fl = still * (1 + slip * .6);
      P.fL += .3 * Math.sin(t * 3.1) * fl; P.fR += .3 * Math.sin(t * 2.7 + 1) * fl; P.adL += .2 * Math.sin(t * 2.3) * fl; P.adR += .2 * Math.sin(t * 2.0 + 2) * fl; P.kL += .2 * Math.sin(t * 2.2) * slip * still; P.hd += .1 * Math.sin(t * 1.5) * still;
      hang.rig.apply(P); }
    drops.forEach(d => { const dt = t - d.t0; d.m.visible = dt > 0; if (dt <= 0) return; const vt = 2.6, fall = vt * dt - vt * vt / 9.8 * (1 - Math.exp(-9.8 * dt / vt)), y = Math.max(gy + .03, -.1 - fall), done = y <= gy + .031;
      d.m.position.set(d.dx + Math.sin(dt * 1.7 + d.ph) * .6 * Math.min(1, dt), y, O + .1 + dt * .25 + Math.sin(dt * 1.3) * .3);
      if (done) d.m.rotation.set(-Math.PI / 2, 0, d.ph); else d.m.rotation.set(Math.sin(dt * 3 + d.ph) * 1.1, dt * 2.2 + d.ph, Math.sin(dt * 2.4) * .6); });
    crumbs.forEach(c => { const dt = t - c.t0; c.m.visible = dt > 0 && dt < 2.4; if (!c.m.visible) return; tmp.set(c.sx + c.vx * dt, -.1 - 4.9 * dt * dt, .02 + c.vz * dt); if (tmp.y < gy) c.m.visible = false; c.m.position.copy(tmp); c.m.rotation.set(dt * 7, dt * 5, 0); }); };
  return g; }

// ---- outdoor split AC unit on wall brackets (origin: wall surface, bottom of the brackets); the fan spins, the cabinet hums, a drip stain runs down the wall
function acUnit(p = {}) { const g = new THREE.Group(), W = p.w || .85, H = p.h || .6, Dd = p.d || .3, gap = .07, steel = std('#8f8f8a', { m: .5, r: .5 }), V = (a, b, c) => new THREE.Vector3(a, b, c);
  for (const s of [-1, 1]) { const x = s * (W / 2 - .1); const b1 = box(.04, .04, Dd + gap + .06, steel); b1.position.set(x, .0, (Dd + gap) / 2); g.add(b1); g.add(rod(V(x, 0, Dd + gap), V(x, -.42, .01), .014, steel));
    const pl = box(.05, .5, .012, steel); pl.position.set(x, -.2, .006); g.add(pl); }
  const cab = new THREE.Group(); g.add(cab); const bm = new THREE.MeshStandardMaterial({ map: acTex(), roughness: .55 }); const bx = box(W, H, Dd, bm); bx.position.set(0, .02 + H / 2, gap + Dd / 2); cab.add(bx);
  const fin = new THREE.Mesh(new THREE.PlaneGeometry(Dd * .9, H * .9), new THREE.MeshStandardMaterial({ map: finTex(), roughness: .7 })); fin.rotation.y = -Math.PI / 2; fin.position.set(-W / 2 - .002, .02 + H / 2, gap + Dd / 2); cab.add(fin);
  const R = H * .38, fc = V(-W * .12, .02 + H / 2, gap + Dd + .004), dark = std('#1c1e1f', { r: .8 });
  const disc = cyl(R, R, .01, dark, 28); disc.rotation.x = Math.PI / 2; disc.position.copy(fc).add(V(0, 0, -.006)); cab.add(disc);
  const fan = new THREE.Group(); fan.position.copy(fc).add(V(0, 0, -.03)); cab.add(fan); for (let k = 0; k < 3; k++) { const bl = box(R * .9, .07, .01, std('#3a3d40', { r: .5 })); bl.position.x = R * .45; const hb = new THREE.Group(); hb.rotation.z = k * 2.094; bl.rotation.x = .35; hb.add(bl); fan.add(hb); }
  const grillM = std('#d6d4cc', { m: .3, r: .5 }); for (let i = 1; i <= 5; i++) { const rg = new THREE.Mesh(new THREE.TorusGeometry(R * i / 5, .004, 4, 32), grillM); rg.position.copy(fc); cab.add(rg); }
  for (const a of [0, Math.PI / 2]) { const cb = box(2 * R, .008, .008, grillM); cb.rotation.z = a; cb.position.copy(fc); cab.add(cb); }
  const cover = box(.16, .2, .02, bm); cover.position.set(W / 2 - .11, .02 + H * .3, gap + Dd + .01); cab.add(cover);
  const ins = std('#efece4', { r: .8 }); g.add(rod(V(W / 2 - .06, .02 + H * .3, gap + Dd * .5), V(W / 2 + .14, .02 + H * .3, gap + Dd * .5), .022, ins)); g.add(rod(V(W / 2 + .14, .02 + H * .3, gap + Dd * .5), V(W / 2 + .14, .02 + H * .3, .01), .022, ins));
  g.add(rod(V(-W / 2 + .1, .02, gap + Dd * .6), V(-W / 2 + .12, -.35, gap + Dd * .7), .008, std('#222', { r: .6 })));
  const st = new THREE.Mesh(new THREE.PlaneGeometry(.22, 1.6), new THREE.MeshBasicMaterial({ map: SPR.acStain ||= canvasT(32, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(40,30,20,.35)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); c.fillStyle = gr; c.fillRect(6, 0, w - 12, h); }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  st.position.set(-W / 2 + .11, -.82, .004); g.add(st); shadowed(g); st.castShadow = false;
  g.userData.tick = t => { fan.rotation.z = -t * (p.rps ?? 26); cab.position.y = Math.sin(t * 97) * .0012; };
  return g; }

// ---- flat door leaf on a hinge (origin = hinge foot); openK [[t, angle]] (negative swings into +z), rattle [t0, t1]
function flatDoor(p = {}) { const g = new THREE.Group(), w = p.w || .96, h = p.h || 2.08, alu = std('#c9c2b0', { m: .7, r: .3 }), leaf = new THREE.Group(); g.add(leaf);
  const lf = box(w, h, .045, new THREE.MeshStandardMaterial({ map: doorTex(), roughness: .6 })); lf.position.set(w / 2, h / 2, 0); leaf.add(lf);
  const handle = new THREE.Group(); handle.position.set(w - .1, 1.02, 0); leaf.add(handle); for (const s of [-1, 1]) { const hb = box(.13, .022, .025, alu); hb.position.set(-.05, 0, s * .045); handle.add(hb); }
  const lock = cyl(.02, .02, .06, alu, 10); lock.rotation.x = Math.PI / 2; lock.position.set(w - .1, .9, 0); leaf.add(lock);
  for (const y of [.25, h - .25]) { const hg = cyl(.012, .012, .1, alu, 8); hg.position.set(.005, y, .03); leaf.add(hg); } shadowed(g);
  g.userData.tick = t => { const rt = p.rattle && t > p.rattle[0] && t < p.rattle[1] ? 1 : 0; leaf.rotation.y = kv(p.openK, t) + rt * .006 * Math.sin(t * 38); handle.rotation.z = rt ? -.35 - .15 * Math.sin(t * 19) : kv(p.openK, t) < -.05 ? 0 : 0; };
  return g; }
Object.assign(ASSETS, { apt_block: aptBlock, street_set: streetSet, wash_rack: washRack, ac_unit: acUnit, flat_door: flatDoor, rig_person: rigPerson });

// ---------- carpentry pack (2026-11-16, plans/wood_bed.mjs): joinery without nails or glue ----------
// Graphics step-up: planed timber with metre-scaled UVs (long grain on the faces, growth-ring end grain on every cut end, per-board tint),
// instead of one stretched texture per box. Realism: real joinery sizes (bed 1.9 x 0.95 m, rail 12 x 4.5 cm, tenon a third of the rail,
// mortise 6 cm deep, oak pegs), a cast-iron bar clamp, a Khufu-style lashed hull. Motion: a hammer that rides the carpenter's palm
// with a wrist snap and an accelerating blow, a split that runs along the grain, an eased tenon slide with a seating jolt, a turning
// clamp screw, a wet tenon that swells and pushes the joint open, and a damped push test. All timings are absolute keys [[t, v]] (kv).
function grainTex() { return SPR.grain ||= (() => { const t = canvasT(512, 128, (c, w, h) => { const r = rng(141); c.fillStyle = '#efe0c8'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 54; i++) { const y0 = r() * h, a = 1 + r() * 3.5, f = (1 + (r() * 3 | 0)) * Math.PI * 2 / w, ph = r() * 6, dark = r() < .6;
      c.strokeStyle = dark ? `rgba(118,74,36,${.1 + r() * .24})` : `rgba(255,244,222,${.1 + r() * .14})`; c.lineWidth = .6 + r() * 2.4; c.beginPath();
      for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * a + Math.sin(x * f * 2 + ph * 1.7) * a * .35; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    for (let i = 0; i < 1600; i++) { c.fillStyle = `rgba(92,56,24,${r() * .13})`; c.fillRect(r() * w, r() * h, 2 + r() * 7, .8); }
    for (let k = 0; k < 2; k++) { const x = 80 + r() * (w - 160), y = 30 + r() * (h - 60); for (let j = 7; j > 0; j--) { c.strokeStyle = `rgba(96,56,24,${.1 + .05 * (7 - j)})`; c.lineWidth = 1.3; c.beginPath(); c.ellipse(x, y, j * 3.4, j * 1.5, 0, 0, 6.3); c.stroke(); }
      c.fillStyle = 'rgba(78,44,18,.55)'; c.beginPath(); c.ellipse(x, y, 3.2, 1.6, 0, 0, 6.3); c.fill(); } }, [1, 1]); return t; })(); }
function endTex() { return SPR.endg ||= canvasT(256, 256, (c, w, h) => { const r = rng(143); c.fillStyle = '#e2c9a2'; c.fillRect(0, 0, w, h); const cx = w * .35, cy = h * 1.35;
  for (let k = 8; k < 520; k += 3 + r() * 4) { c.strokeStyle = `rgba(${120 + r() * 30 | 0},${78 + r() * 20 | 0},${40 | 0},${.18 + r() * .3})`; c.lineWidth = .8 + r() * 1.8; c.beginPath(); c.arc(cx, cy, k, 0, Math.PI * 2); c.stroke(); }
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(70,40,15,${r() * .14})`; c.fillRect(r() * w, r() * h, 1, 1); }
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,240,215,.08)'; c.fillRect(0, r() * h, w, 1); } }, [1, 1]); }   // saw marks
const WOODM = {};
function woodMats(tint, o = {}) { const k = tint + (o.key || ''); if (WOODM[k] && !o.own) return WOODM[k];
  const m = { side: new THREE.MeshStandardMaterial({ color: col(tint), map: grainTex(), roughness: o.rough ?? .6 }), end: new THREE.MeshStandardMaterial({ color: col(tint).multiplyScalar(.95), map: endTex(), roughness: .82 }) };
  if (!o.own) WOODM[k] = m; return m; }
// a planed board: size [x, y, z], axis = index of the length (grain) direction; uv in metres so the grain keeps its real scale on every board
function woodBox(size, axis, tint, pos, o = {}) { const geo = new THREE.BoxGeometry(...size), P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv;
  const sd = o.seed ?? Math.abs((pos ? pos[0] * 7.13 + pos[1] * 3.37 + pos[2] * 5.71 : 0) + size[0] * 11.3 + size[2] * 4.1) % 1;
  for (let i = 0; i < P.count; i++) { const p = [P.getX(i), P.getY(i), P.getZ(i)], n = [N.getX(i), N.getY(i), N.getZ(i)], na = n.findIndex(v => Math.abs(v) > .5);
    if (na === axis) { const [a, b] = [0, 1, 2].filter(k => k !== axis); UV.setXY(i, p[a] / .24 + .5 + sd * .3, p[b] / .24 + .5 + sd * .2); }
    else { const ac = [0, 1, 2].find(k => k !== axis && k !== na); UV.setXY(i, p[axis] / .75 + sd * 3.7, p[ac] / .16 + sd * 5.3); } }
  const M = o.mats || woodMats(tint), mesh = new THREE.Mesh(geo, [0, 1, 2, 3, 4, 5].map(f => (f >> 1) === axis ? M.end : M.side));
  if (pos) mesh.position.set(...pos); if (o.rot) mesh.rotation.set(...o.rot); mesh.castShadow = mesh.receiveShadow = true; return mesh; }
const steelM = () => SPR.steel ||= std('#6a6f73', { m: .85, r: .32 });
function peg(par, pos, axis) { const m = cyl(.009, .009, .012, SPR.pegM ||= std('#7a5532', { r: .7 }), 10); m.position.set(...pos); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; par.add(m); }

// workshop floor: wide pine planks with seams, sawdust and shavings (top at y = p.top, default .015)
function shopFloor(p = {}) { const g = new THREE.Group(), W = p.w || 5.2, D = p.d || 4.4, top = p.top ?? .015, r = rng(147);
  const tex = canvasT(1024, 1024, (c, w, h) => { c.fillStyle = '#9b7a55'; c.fillRect(0, 0, w, h); const n = 9, q = h / n;
    for (let i = 0; i < n; i++) { const v = .86 + r() * .2; c.fillStyle = `rgb(${172 * v | 0},${134 * v | 0},${92 * v | 0})`; c.fillRect(0, i * q, w, q);
      for (let j = 0; j < 22; j++) { c.strokeStyle = `rgba(${r() < .6 ? '100,64,32' : '220,190,150'},${.1 + r() * .18})`; c.lineWidth = 1 + r() * 2; c.beginPath(); const y = i * q + r() * q; c.moveTo(0, y); c.bezierCurveTo(w * .3, y + r() * 6 - 3, w * .7, y + r() * 6 - 3, w, y + r() * 4 - 2); c.stroke(); }
      const bx = r() * w; c.fillStyle = 'rgba(40,25,12,.6)'; c.fillRect(bx, i * q, 2, q);                            // butt joint
      c.fillStyle = 'rgba(40,25,12,.75)'; c.fillRect(0, i * q, w, 2); }
    for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h, rad = 30 + r() * 90, gr = c.createRadialGradient(x, y, 2, x, y, rad); gr.addColorStop(0, 'rgba(236,212,170,.55)'); gr.addColorStop(1, 'rgba(236,212,170,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${r() < .5 ? '240,220,180' : '70,45,20'},${r() * .25})`; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1); } }, [W / 2.6, D / 2.6]);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(W, .05, D), new THREE.MeshStandardMaterial({ map: tex, roughness: .88 })); fl.position.y = top - .025; fl.receiveShadow = true; g.add(fl);
  const shM = new THREE.MeshStandardMaterial({ color: col('#ecd1a2'), roughness: .7, side: THREE.DoubleSide });
  for (let i = 0; i < (p.shavings ?? 60); i++) { const x = (r() - .5) * W * .9, z = (r() - .5) * D * .9; if (p.clear && p.clear.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) continue;
    const s = new THREE.Mesh(new THREE.TorusGeometry(.018 + r() * .02, .004, 4, 12, 3.5 + r() * 2), shM); s.position.set(x, top + .012, z); s.rotation.set(r() * 3, r() * 3, r() * 3); s.scale.z = 3; g.add(s); }
  return g; }

// workbench, real size: 1.7 x 0.62 m, top surface at h (.86); laminated top, legs, stretchers, a shelf with offcuts, shavings
function workbench(p = {}) { const g = new THREE.Group(), L = p.l || 1.7, W = p.w || .62, H = p.h || .86, T = .06, r = rng(149);
  ['#c69c6c', '#b88d5f', '#cda577', '#bf9466', '#c4996a'].forEach((c, k) => g.add(woodBox([L, T, W / 5 - .002], 0, c, [0, H - T / 2, -W / 2 + W / 10 + k * W / 5])));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(woodBox([.08, H - T, .08], 1, '#a47b52', [sx * (L / 2 - .12), (H - T) / 2, sz * (W / 2 - .08)]));
  for (const sz of [-1, 1]) g.add(woodBox([L - .32, .08, .045], 0, '#a47b52', [0, .2, sz * (W / 2 - .08)]));
  for (const sx of [-1, 1]) g.add(woodBox([.045, .08, W - .24], 2, '#a47b52', [sx * (L / 2 - .12), .2, 0]));
  g.add(woodBox([L - .34, .025, W - .26], 0, '#b48c62', [0, .2525, 0]));
  for (let k = 0; k < 4; k++) g.add(woodBox([.45 + r() * .3, .03, .1], 0, ['#c9a274', '#b58c5c'][k % 2], [-.4 + k * .25, .28 + (k % 2) * .03, -.1 + r() * .2], { rot: [0, (r() - .5) * .3, 0] }));
  const shM = new THREE.MeshStandardMaterial({ color: col('#efd6aa'), roughness: .7, side: THREE.DoubleSide });
  for (let i = 0; i < (p.shavings ?? 16); i++) { const x = (r() - .5) * (L - .2), z = (r() - .5) * (W - .1); if (p.clear && p.clear.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) continue;
    const s = new THREE.Mesh(new THREE.TorusGeometry(.016 + r() * .015, .003, 4, 12, 3.6 + r() * 2), shM); s.position.set(x, H + .01, z); s.rotation.set(Math.PI / 2 + (r() - .5), r() * 6, 0); s.scale.z = 3; g.add(s); }
  return shadowed(g); }

// a loose plank on the bench (hook shot): length along x, end at x = 0 (the carpenter's hands), lying on its face
function plank(p = {}) { const g = new THREE.Group(), L = p.l || 1.3; g.add(woodBox([L, p.t || .03, p.w || .12], 0, p.tint || '#c9a06e', [L / 2, (p.t || .03) / 2, 0])); return g; }

// the nail test board: 0.5 x 0.12 x 0.025 m, nail 5 cm from the right end; strikes [t...] drive the nail in steps,
// splitK [[t, 0..1]] runs a split along the grain from the end to the tip (the right piece swings open on the tip, splinters fly)
function nailSplit(p = {}) { const g = new THREE.Group(), L = .5, Wd = .12, T = .025, xe = L / 2, xt = -.06, r = rng(151), board = new THREE.Group(); g.add(board);
  const cr = []; for (let x = xe; x >= xt - 1e-6; x -= .018) cr.push([x, (x === xe ? .002 : (r() - .5) * .006) + (x - xt) * .012]); cr[cr.length - 1] = [xt, 0];
  const mats = woodMats(p.tint || '#caa070'), mk = (pts) => { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z))); const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
    geo.rotateX(Math.PI / 2); geo.translate(0, T, 0); const P = geo.attributes.position, UV = geo.attributes.uv; for (let i = 0; i < P.count; i++) UV.setXY(i, P.getX(i) / .75 + .3, (P.getZ(i) + P.getY(i)) / .16 + .2);
    const m = new THREE.Mesh(geo, mats.side); m.castShadow = m.receiveShadow = true; return m; };
  // piece A: the whole board below the crack and everything left of the tip; piece B: the sliver above the crack, hinged at the tip
  const A = mk([[-xe, -Wd / 2], [xe, -Wd / 2], ...cr, [xt, Wd / 2], [-xe, Wd / 2]]); board.add(A);
  const hinge = new THREE.Group(); hinge.position.set(xt, 0, 0); board.add(hinge);
  const B = mk([...cr.slice().reverse(), [xe, Wd / 2], [xt + .002, Wd / 2]]); B.position.set(-xt, 0, 0); hinge.add(B);
  for (const [x0, mt] of [[-xe, mats.end], [xe, mats.end]]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(Wd, T), mt); e.position.set(x0 + (x0 < 0 ? -.0005 : .0005), T / 2, 0); e.rotation.y = x0 < 0 ? -Math.PI / 2 : Math.PI / 2; if (x0 > 0) e.visible = false; board.add(e); }
  const fresh = new THREE.Mesh(new THREE.PlaneGeometry(xe - xt, T * .9), std('#f1dcb4', { r: .95 })); fresh.position.set((xe + xt) / 2, T / 2, .001); board.add(fresh); // pale torn fibres inside the split
  const crackLine = new THREE.Mesh(new THREE.PlaneGeometry(1, .0016), new THREE.MeshBasicMaterial({ color: 0x2a1a0c })); crackLine.rotation.x = -Math.PI / 2; crackLine.position.y = T + .0006; board.add(crackLine);
  const nail = new THREE.Group(), nx = xe - .05, nz = .004; nail.position.set(nx, T, nz); board.add(nail);
  const sh = cyl(.0016, .0016, .065, steelM(), 8); sh.position.y = .0325; nail.add(sh); const hd = cyl(.0042, .0042, .0018, steelM(), 14); hd.position.y = .0659; nail.add(hd);
  const chips = []; for (let i = 0; i < 7; i++) { const c = woodBox([.006 + r() * .01, .002, .003], 0, '#e6c79a', null); c.visible = false; board.add(c); chips.push({ c, v: [(r() - .2) * .5, .5 + r() * .5, (r() - .5) * .5], w: r() * 20 }); }
  const S = p.strikes || [], step = [.026, .022, .017];
  g.userData.tick = t => { let d = 0, jolt = 0; S.forEach((ts, i) => { const u = clamp((t - ts) / .045); d += step[i % 3] * u * (2 - u); if (t > ts) jolt += Math.exp(-(t - ts) * 30) * Math.sin((t - ts) * 90); });
    nail.position.y = T - Math.min(.0648, d); board.position.y = -.0012 * jolt;
    const k = kv(p.splitK, t, 0), ang = .05 * k; hinge.rotation.y = -ang; nail.rotation.z = -ang * .5;
    crackLine.visible = k > .01; const len = (xe - xt) * clamp(k * 1.4); crackLine.scale.x = Math.max(.001, len); crackLine.position.x = xe - len / 2; fresh.visible = k > .01;
    const tl = S.length ? S[S.length - 1] : 1e9; chips.forEach(({ c, v, w }) => { const a = t - tl - .02; c.visible = a > 0 && a < 1.2;
      if (c.visible) { const fl = Math.min(a, Math.max(0, v[1] / 4.9 + .01)); c.position.set(xe - .04 + v[0] * a, Math.max(T, T + v[1] * fl - 4.9 * fl * fl), .01 + v[2] * a * .5); c.rotation.set(w * a, w * a * .7, 0); } }); };
  return g; }

// hammer: origin at the handle butt, handle along +y (33 cm hickory), steel head with the striking face toward +z and the claw toward -z
function hammerMesh() { const g = new THREE.Group(), hm = std('#b07a45', { r: .55 }), st = steelM();
  const hd = cyl(.0135, .0155, .31, hm, 12); hd.position.y = .155; hd.scale.z = .75; g.add(hd);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(.026, .034, .03), st); eye.position.set(0, .318, 0); g.add(eye);
  const neck = cyl(.012, .012, .045, st, 14); neck.rotation.x = Math.PI / 2; neck.position.set(0, .318, .03); g.add(neck);
  const face = cyl(.0145, .0145, .012, st, 18); face.rotation.x = Math.PI / 2; face.position.set(0, .318, .057); g.add(face);
  for (const s of [-1, 1]) { const cl = new THREE.Mesh(new THREE.BoxGeometry(.008, .012, .075), st); cl.position.set(s * .006, .328, -.045); cl.rotation.x = -.45; g.add(cl); }
  return shadowed(g); }

// carpenter = rig_person (Worker by default) + an optional hammer that rides the right palm. hammer: [t0, t1] visible window,
// wrist: [[t, angle]] angle between forearm and handle (1.6 cocked at the top of the swing, .7 snapped at the blow)
function carpenter(p = {}) { const g = rigPerson({ model: 'modular_men/Worker', ...p }), base = g.userData.tick, hm = hammerMesh(); hm.visible = false; g.add(hm);
  const V = () => new THREE.Vector3(), Q = new THREE.Quaternion(), M4 = new THREE.Matrix4(), IG = new THREE.Matrix4(); let HR, LR, MR;
  g.userData.palm = (side = 'R') => { const h = g.getObjectByName('Hand' + side), m = g.getObjectByName('Middle2' + side); return h.getWorldPosition(V()).lerp(m.getWorldPosition(V()), .5); };
  g.userData.tick = (t, age) => { base(t, age); const on = p.hammer && t >= p.hammer[0] && t < p.hammer[1]; hm.visible = !!on; if (!on) return;
    HR ||= g.getObjectByName('HandR'); LR ||= g.getObjectByName('LowerArmR'); MR ||= g.getObjectByName('Middle2R'); g.updateMatrixWorld(true);
    const hand = HR.getWorldPosition(V()), f = hand.clone().sub(LR.getWorldPosition(V())).normalize(), palm = hand.clone().lerp(MR.getWorldPosition(V()), .55);
    const right = new THREE.Vector3(p.side ?? 1, 0, 0).applyQuaternion(g.children[0].getWorldQuaternion(Q)), u = right.clone().cross(f).normalize(), a = kv(p.wrist, t, 1.4);
    const h = f.clone().multiplyScalar(Math.cos(a)).add(u.multiplyScalar(Math.sin(a))).normalize(), face = h.clone().cross(right).normalize(), x = h.clone().cross(face).normalize();
    const butt = palm.clone().sub(h.clone().multiplyScalar(.075)); M4.makeBasis(x, h, face).setPosition(butt); IG.copy(g.matrixWorld).invert(); M4.premultiply(IG); M4.decompose(hm.position, hm.quaternion, hm.scale);
    g.userData.hammerFace = butt.clone().add(h.clone().multiplyScalar(.318)).add(face.clone().multiplyScalar(.063)); };
  return g; }
Object.assign(RIG_POSES, {   // tuned with a probe so the palms land on the bench work (Worker model, hands hang at .93 m)
  holdPlank: { adL: 1.35, adR: 1.35, fL: .45, fR: .45, eL: .05, eR: .05, sp: .8, hd: .2 },                 // both palms on the plank / rail, leaning over the bench
  holdBoard: { adL: 1.35, fL: .45, eL: .05, adR: 1.3, fR: .2, eR: 1.1, sp: .72, hd: .3 },                    // left palm on the board, hammer hand low
  hamUp: { adL: 1.35, fL: .45, eL: .05, adR: 1.2, fR: 1.9, eR: 1.7, sp: .6, hd: .3, tw: -.08 },             // wind-up: elbow high, hammer behind the head
  hamHit: { adL: 1.35, fL: .45, eL: .05, adR: 1.3, fR: .3, eR: .9, sp: .75, hd: .3, tw: .03 },              // the blow
  clampTurn: { adL: 1.35, adR: 1.35, fL: .55, fR: .55, eL: .05, eR: .05, sp: .85, hd: .2, tw: .05 },
  pushRail: { adL: 1.35, adR: 1.35, fL: .5, fR: .5, eL: .05, eR: .05, sp: .82, hd: .2 },
  pushPost: { adL: 1.35, adR: 1.35, fL: .6, fR: .6, eL: .1, eR: .1, sp: .7, hd: .1 } });

// sectioned mortise-and-tenon demo: post (9 x 9 cm) along x, rail (12 x 4.5 cm) along +z with a tenon 9 x 2 x 6 cm into a mortise 6 cm deep.
// The assembly is sawn in half at x = 0; the +x half lifts away (cutK) so the section shows the fit. Keys (all [[t, v]]):
// slideK 0 = tenon 14 cm out, 1 = seated; cutK; clampK (clamp lowered on); turnK (screw turns, 0..1 = 3 turns); wetK (rail darkens); swellK; looseK (joint pushed open).
function mtJoint(p = {}) { const g = new THREE.Group(), PT = p.post || '#c39a6a', RT = p.rail || '#cfa775', r = rng(153);
  const wetM = woodMats(RT, { own: true }), y0 = .035, y1 = .055;                                    // rail mats own -> can darken when wet
  const post = [new THREE.Group(), new THREE.Group()], rail = new THREE.Group(), railH = [new THREE.Group(), new THREE.Group()], tenon = [];
  const cheek = []; g.add(post[0], post[1], rail); rail.add(railH[0], railH[1]);
  [-1, 1].forEach((s, i) => { const P = post[i];
    P.add(woodBox([.205, .09, .09], 0, PT, [s * .1475, .045, -.045]));
    P.add(woodBox([.045, .09, .03], 0, PT, [s * .0225, .045, -.075]));
    P.add(woodBox([.045, y0, .06], 0, PT, [s * .0225, y0 / 2, -.03]));
    const top = woodBox([.045, .09 - y1, .06], 0, PT, [s * .0225, (y1 + .09) / 2, -.03]); P.add(top); cheek.push(top);
    peg(P, [s * .16, .045, -.045 + .0451], 'z');
    const R = railH[i]; R.add(woodBox([.06, .045, .62], 2, RT, [s * .03, .045, .31], { mats: wetM }));
    const tn = woodBox([.045, y1 - y0 - .0006, .058], 2, RT, [s * .0225, (y0 + y1) / 2, -.029], { mats: wetM }); R.add(tn); tenon.push(tn); });
  g.add(woodBox([.16, .0225, .09], 0, '#9b7653', [0, .01125, .52]));                                   // offcut the rail rests on
  const split = new THREE.Mesh(new THREE.BoxGeometry(.0012, .03, .05), new THREE.MeshBasicMaterial({ color: 0x24160a })); split.position.set(-.0004, .072, -.03); split.scale.y = .001; post[0].add(split); // crack in the section when the tenon swells
  // bar clamp: steel bar along z above the work, fixed jaw behind the post, sliding jaw on the rail end, screw with a wooden T-handle
  const clamp = new THREE.Group(), jawM = std('#8a2a22', { r: .45, m: .2 }); g.add(clamp);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.03, .008, .98), steelM()); bar.position.set(0, .125, .3); clamp.add(bar);
  const fj = new THREE.Mesh(new THREE.BoxGeometry(.04, .1, .035), jawM); fj.position.set(0, .085, -.1075); clamp.add(fj);
  const sj = new THREE.Group(); clamp.add(sj); const sjb = new THREE.Mesh(new THREE.BoxGeometry(.04, .1, .035), jawM); sjb.position.set(0, .08, .645); sj.add(sjb);
  const scr = cyl(.006, .006, .11, steelM(), 10); scr.rotation.x = Math.PI / 2; scr.position.set(0, .045, .7); clamp.add(scr);
  const pad = cyl(.014, .014, .006, steelM(), 14); pad.rotation.x = Math.PI / 2; pad.position.set(0, .045, .6235); sj.add(pad);
  const handle = new THREE.Group(); handle.position.set(0, .045, .76); clamp.add(handle);
  const hb = cyl(.008, .008, .08, std('#b07a45', { r: .5 }), 10); hb.rotation.z = Math.PI / 2; handle.add(hb);
  const hc = cyl(.007, .007, .03, steelM(), 8); hc.rotation.x = Math.PI / 2; hc.position.z = -.015; handle.add(hc);
  shadowed(g); const out = .14, dark = col(RT).multiplyScalar(.55), dry = col(RT);
  g.userData.tick = t => { const sl = kv(p.slideK, t, 0), cut = kv(p.cutK, t, 0), cl = kv(p.clampK, t, 0), tu = kv(p.turnK, t, 0), wet = kv(p.wetK, t, 0), sw = kv(p.swellK, t, 0), lo = kv(p.looseK, t, 0);
    const seat = p.slideK && p.slideK.length ? p.slideK[p.slideK.length - 1][0] : 1e9, jo = t > seat ? Math.exp(-(t - seat) * 18) * Math.sin((t - seat) * 70) : 0;
    rail.position.z = (1 - sl) * out + (1 - Math.min(1, tu * 1.6)) * .003 * (sl > .99 ? 1 : 0) + lo * .016; post[0].position.z = post[1].position.z = -.0008 * jo;
    post[1].position.set(0, cut * .34, cut * .06 - .0008 * jo); post[1].rotation.x = -cut * .25; railH[1].position.set(0, cut * .34, cut * .06); railH[1].rotation.x = -cut * .25;
    for (const tn of tenon) tn.scale.y = 1 + sw * .5; for (const R of railH) R.children[0].scale.y = 1 + sw * .12;
    for (const ck of cheek) ck.position.y = (y1 + .09) / 2 + sw * .0045; split.scale.y = Math.max(.001, sw); split.visible = sw > .02;
    wetM.side.color.copy(dry).lerp(dark, wet); wetM.end.color.copy(dry).lerp(dark, wet).multiplyScalar(.95); wetM.side.roughness = .6 - .3 * wet;
    clamp.visible = cl > .001; clamp.position.y = (1 - cl) * .3; handle.rotation.z = tu * Math.PI * 6; sj.position.z = -tu * .004 + lo * .016; };
  return g; }

// bed frame, real size 1.9 x 0.95 m, length along x, headboard at -x. Legs 8 x 8 cm (head .95 m, foot .5 m), rails 12 x 4.5 cm tenoned
// into the legs and pinned with oak pegs (no nails), headboard with vertical slats, 13 slats on cleats. stage 'half': the foot legs, foot rail,
// near side rail and 9 slats are missing and the near rail lies on the floor; buildK [[t, 0..1]] then assembles them (the floor rail swings
// up on an arc into its mortises, the other parts settle in from above, staggered). pushK [[t, 0..1]] = a hand push; the frame only quivers (< 2 mm).
function bedFrame(p = {}) { const g = new THREE.Group(), fr = new THREE.Group(); g.add(fr); const L = 1.9, W = .95, lw = .08, half = p.stage === 'half', T1 = '#b98a58', T2 = '#c29466', T3 = '#ae7f4f';
  const lx = L / 2 - lw / 2, lz = W / 2 - lw / 2, ry = .36, late = []; let railN = null;
  const add = (m, isLate) => { fr.add(m); if (isLate && half) late.push({ m, p1: m.position.clone(), r1: m.rotation.clone() }); return m; };
  for (const sz of [-1, 1]) { add(woodBox([lw, .95, lw], 1, T3, [-lx, .475, sz * lz])); add(woodBox([lw, .5, lw], 1, T3, [lx, .25, sz * lz]), sz > 0); }
  for (const sz of [-1, 1]) { const rl = add(woodBox([L - 2 * lw, .12, .045], 0, T1, [0, ry, sz * (lz - .0175)]), sz > 0); if (sz > 0 && half) railN = late[late.length - 1];
    add(woodBox([L - 2 * lw - .02, .025, .025], 0, '#a77a4c', [0, ry - .0475, sz * (lz - .0175 - .035)]), sz > 0); }
  for (const sz of [-1, 1]) { peg(fr, [-lx, ry, sz * (W / 2 + .0005)], 'z'); peg(fr, [-lx, .88, sz * (W / 2 + .0005)], 'z'); }
  add(woodBox([.045, .12, W - 2 * lw], 2, T1, [-lx + .0175, ry, 0])); add(woodBox([.045, .12, W - 2 * lw], 2, T1, [lx - .0175, ry, 0]), true);
  add(woodBox([.045, .1, W - 2 * lw], 2, T2, [-lx, .88, 0])); add(woodBox([.045, .08, W - 2 * lw], 2, T2, [-lx, .46, 0]));
  for (let k = 0; k < 5; k++) add(woodBox([.022, .33, .085], 1, [T2, T1][k % 2], [-lx, .665, -.3 + k * .15]));
  for (let k = 0; k < 13; k++) add(woodBox([.09, .02, W - 2 * lw - .1], 2, [T2, '#c99d6e', T1][k % 3], [-lx + .1 + k * ((L - .3) / 12), ry - .025, 0]), k > 3);
  const floorPos = new THREE.Vector3(.15, .0375, W / 2 + .4), floorRot = new THREE.Euler(Math.PI / 2, .06, 0);
  late.forEach((q, i) => { q.order = q === railN ? 0 : 1 + i; });
  shadowed(g); const N = late.length;
  g.userData.tick = t => { const k = kv(p.pushK, t, 0), t0 = p.pushK ? p.pushK[1]?.[0] ?? 0 : 0, a = t > t0 ? Math.exp(-(t - t0) * 7) * Math.sin((t - t0) * 31) : 0; fr.rotation.z = .0012 * a * (k > 0 ? 1 : 0);
    if (!half) return; const b = kv(p.buildK, t, 0);
    for (const q of late) { if (q === railN) { const e = sEase(clamp(b / .35)); q.m.position.lerpVectors(floorPos, q.p1, e); q.m.position.y += Math.sin(Math.PI * e) * .35;
        q.m.rotation.set(lerp(floorRot.x, q.r1.x, e), lerp(floorRot.y, q.r1.y, e), 0); continue; }
      const u = clamp((b - .3 - (q.order / N) * .5) / .2), e = 1 - Math.pow(1 - u, 3); q.m.visible = u > 0; q.m.position.y = q.p1.y + (1 - e) * .45; } };
  return g; }

// Khufu-style hull (the Giza boat is about 43 m; this one is 6.4 m), planks edge-joined and sewn with rope, no nails: strakes as separate
// curved boards with seams, rope stitches across every seam, thwarts, papyrus-flower stem and stern posts, on timber cradles over a pale stone plinth
function lashedHull(p = {}) { const g = new THREE.Group(), L = p.l || 6.4, B = p.b || 1.25, Dh = p.d || .7, n = 5, nu = 40, r = rng(157), lift = p.lift ?? .55;
  const pt = (u, s) => { const top = Dh * (1 + 1.1 * Math.pow(Math.abs(u), 3.2)), keel = Dh * .55 * Math.pow(Math.abs(u), 2.4), hb = B / 2 * Math.pow(Math.max(0, 1 - u * u), .55);
    const a = s * Math.PI / 2; return [u * L / 2, lift + keel + (top - keel) * (1 - Math.cos(a)), hb * Math.pow(Math.sin(a), .8)]; };
  const hullM = woodMats('#a57a4c', { key: 'hull', rough: .78 }).side, stitch = [];
  for (const sd of [-1, 1]) for (let k = 0; k < n; k++) { const s0 = k / n + .004, s1 = (k + 1) / n - .004, pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= 2; j++) { const u = -1 + 2 * i / nu, s = s0 + (s1 - s0) * j / 2, q = pt(u * .985, s); pos.push(q[0], q[1], sd * q[2]); uv.push(q[0] / .75 + k * .37, j * .5 + k * .9); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = a + 3; sd > 0 ? idx.push(a, b, a + 1, b, b + 1, a + 1) : idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, hullM.clone()); m.material.side = THREE.DoubleSide; m.material.color = col(['#a57a4c', '#9a6f43', '#b08455', '#a07247', '#ad8150'][(k + (sd > 0 ? 2 : 0)) % 5]); g.add(m);
    if (k < n - 1) for (let u = -.9; u <= .9; u += .075) { const q = pt(u, (k + 1) / n); stitch.push([q[0], q[1], sd * (q[2] + .01), sd]); } }
  const ropeM = std('#5a4128', { r: .95 }), im = new THREE.InstancedMesh(new THREE.TorusGeometry(.022, .0055, 5, 10), ropeM, stitch.length), o3 = new THREE.Object3D();
  stitch.forEach(([x, y, z, sd], i) => { o3.position.set(x, y, z); o3.rotation.set(0, Math.PI / 2, 0); o3.scale.set(1, 1.3, 1); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); }); im.castShadow = true; g.add(im);
  for (let u = -.7; u <= .71; u += .35) { const q = pt(u, 1); g.add(woodBox([.09, .06, q[2] * 2 + .04], 2, '#9c7044', [q[0], q[1] - .05, 0])); }
  for (const sd of [-1, 1]) { const pts = [0, .25, .5, .75, 1].map(v => { const u = sd * (.985 + v * .06); const top = pt(sd * .985, 1); return new THREE.Vector3(sd * (L / 2 * .985 + v * .45), top[1] + v * v * .55, 0); });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .045, 8), std('#9a6f43', { r: .8 })); g.add(tube);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(.11, .22, 12, 1, true), std('#a77b4b', { r: .8, extra: { side: THREE.DoubleSide } })); fl.position.copy(pts[4]).add(new THREE.Vector3(sd * .03, .1, 0)); fl.rotation.z = Math.PI + sd * -.5; g.add(fl); }
  for (const u of [-.6, 0, .6]) { const q = pt(u, 0); for (const sz of [-1, 1]) g.add(woodBox([.1, q[1] - .06, .1], 1, '#7d5a38', [q[0], (q[1] - .06) / 2 + .06, sz * .32]));
    g.add(woodBox([.12, .08, .9], 2, '#7d5a38', [q[0], q[1] - .02, 0])); }
  const st = canvasT(512, 256, (c, w, h) => { c.fillStyle = '#d9cdb6'; c.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { const v = .93 + r() * .1; c.fillStyle = `rgb(${222 * v | 0},${210 * v | 0},${188 * v | 0})`; c.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); }
    for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(120,105,80,${r() * .12})`; c.fillRect(r() * w, r() * h, 1, 1); } }, [1, 1]);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(L + 1.4, .06, B + 1.6), new THREE.MeshStandardMaterial({ map: st, roughness: .35 })); plinth.position.y = .03; plinth.receiveShadow = true; g.add(plinth);
  return shadowed(g); }

// pale limestone ashlar wall (museum hall backdrop; no text, no signs)
function stoneWall(p = {}) { const W = p.w || 8, H = p.h || 2.4, r = rng(159);
  const tex = canvasT(512, 256, (c, w, h) => { c.fillStyle = '#b8aa8e'; c.fillRect(0, 0, w, h); const rows = 4; for (let j = 0; j < rows; j++) { let x = j % 2 ? -40 : 0; while (x < w) { const bw = 70 + r() * 50, v = .92 + r() * .12;
    c.fillStyle = `rgb(${226 * v | 0},${214 * v | 0},${190 * v | 0})`; c.fillRect(x + 2, j * h / rows + 2, bw - 4, h / rows - 4); x += bw; } }
    for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(110,95,70,${r() * .1})`; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1); } }, [W / 3, H / 1.5]);
  const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, .4), new THREE.MeshStandardMaterial({ map: tex, roughness: .9 })); m.position.y = H / 2; return shadowed(m); }
window.__rigPoses = RIG_POSES; // debug hook: pose tuning probes
Object.assign(ASSETS, { shop_floor: shopFloor, workbench, plank, nail_split: nailSplit, carpenter, mt_joint: mtJoint, bed_frame: bedFrame, lashed_hull: lashedHull, stone_wall: stoneWall });

// ================= Salt lick pack (2026-11-17, plans/salt_cow.mjs) =================
// Why a cow licks a salt block. Motion step-up: the library cow walks on the buffalo walker (distance-synced Walk, eased stops with a
// settle bounce), its neck reaches the lick point (iterative 2-bone reach), and a tongue licks it in a steady rhythm (LICK_P). Each lick
// knocks salt flakes off (stateless ballistic flakes that settle and fade) and the block wears a smooth hollow and shrinks over time.
// Graphics/realism: rock-salt block (rounded, crystalline pale pink with veins and glints) on a wooden tray, a mud-brick pen wall with
// white salt efflorescence and a licked wet patch, a concrete water trough with ripples, a timber pen fence with real grain, a hay pile.
const LICK_P = .9; // seconds per lick; tongue contact at (k + .5) * LICK_P, shared by the cow and the licked object (stateless sync)
const fr01 = x => x - Math.floor(x), hr = (a, b = 0) => fr01(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
function lickEvents(licks, t, win) { const ev = []; for (const [a, b] of licks || []) { const k0 = Math.ceil(Math.max(a, t - win) / LICK_P - .5), k1 = Math.floor(Math.min(b, t) / LICK_P - .5); for (let k = k0; k <= k1; k++) ev.push(k); } return ev; }
function glintTex() { return SPR.glint ||= canvasT(64, 64, (c, w) => { const g2 = c.createRadialGradient(32, 32, 0, 32, 32, 32); g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(.18, 'rgba(255,255,255,.55)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g2; c.fillRect(0, 0, 64, 64); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(32, 2); c.lineTo(32, 62); c.moveTo(2, 32); c.lineTo(62, 32); c.stroke(); }); }
function glints(g, n, spots, size = .04) { const list = []; for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    g.add(sp); list.push({ sp, i, ph: hr(i, 3) * 6.28, w: 1.5 + hr(i, 4) * 2.5, s: size * (.6 + hr(i, 5) * .8) }); }
  return (t, gain = 1) => list.forEach(o => { const p = spots(o.i); o.sp.position.copy(p); const k = Math.pow(Math.max(0, Math.sin(t * o.w + o.ph)), 10) * gain; o.sp.material.opacity = k; o.sp.scale.setScalar(o.s * (.4 + .6 * k)); o.sp.material.rotation = t * .6 + o.ph; }); }
// salt flakes knocked off by each lick: spot (local Vector3), kick (local direction they are scraped toward), floor y (local)
function flakeSystem(g, n, cols) { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3 }), n); im.frustumCulled = false; im.castShadow = false;
  for (let i = 0; i < n; i++) im.setColorAt(i, col(cols[i % cols.length])); g.add(im); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
  return (t, licks, spot, kick, floorY, per = 6, life = 3.4) => { let j = 0;
    for (const k of lickEvents(licks, t, life)) { const age = t - (k + .5) * LICK_P; for (let q = 0; q < per && j < n; q++, j++) {
      const a = hr(k, q), b = hr(q, k + 9), c = hr(k + q, 17), sz = .006 + a * .011, vx = kick.x * (.25 + b * .3) + (a - .5) * .22, vz = kick.z * (.25 + b * .3) + (c - .5) * .22, vy = .12 + c * .3;
      const x0 = spot.x + (a - .5) * .06, z0 = spot.z + (c - .5) * .04, y0 = spot.y + (b - .5) * .02;
      let fy = typeof floorY === 'function' ? floorY(x0 + vx * .2, z0 + vz * .2) : floorY, tl = (vy + Math.sqrt(vy * vy + 2 * 9.81 * Math.max(0, y0 - fy))) / 9.81;
      if (typeof floorY === 'function') { fy = floorY(x0 + vx * tl, z0 + vz * tl); tl = (vy + Math.sqrt(vy * vy + 2 * 9.81 * Math.max(0, y0 - fy))) / 9.81; } const ta = Math.min(age, tl);
      P.set(x0 + vx * ta, Math.max(fy + sz / 2, y0 + vy * ta - 4.905 * ta * ta), z0 + vz * ta);
      E.set(ta * 9 * a, ta * 7 * b, ta * 5); Q.setFromEuler(E); const fade = clamp((life - age) / .8); S.set(sz, sz * .55, sz * (.7 + b * .5)).multiplyScalar(fade);
      im.setMatrixAt(j, M.compose(P, Q, S)); } }
    for (; j < n; j++) im.setMatrixAt(j, Z); im.instanceMatrix.needsUpdate = true; }; }

// ---- reach + lick on the walker (called from buffaloA each frame after the clips). Modes: lickAt [x,y,z] world point, rk 0..1 reach weight,
// lick 0..1 tongue cycles, drink 0..1 (muzzle on the water, no tongue). The plan places the walker at pos [0,0,0] so its frame is the world frame.
function lickRig(g, o, mixer, acts, B, p) {
  mixer.update(0); g.updateMatrixWorld(true);
  const head = B('Head'), n1 = B('Neck1'), n2 = B('Neck2') || n1; if (!head || !n1) return null;
  const hw = head.getWorldPosition(new THREE.Vector3()), v = new THREE.Vector3(), meshes = []; o.traverse(m => { if (m.isSkinnedMesh) meshes.push(m); });
  const H = p.height || 1.4; let nose = null, chin = null;
  for (const m of meshes) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); if (v.distanceTo(hw) > .6 * H / 1.4) continue; if (!nose || v.z > nose.p.z) nose = { m, i, p: v.clone() }; } }
  if (!nose) return null;
  for (const m of meshes) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); if (v.distanceTo(nose.p) > .13 * H / 1.4) continue; if (!chin || v.y < chin.p.y) chin = { m, i, p: v.clone() }; } }
  const vtx = (q, out) => { q.m.getVertexPosition(q.i, out); return out.applyMatrix4(q.m.matrixWorld); };
  const mouth = () => vtx(nose, new THREE.Vector3()).lerp(vtx(chin, new THREE.Vector3()), .6);
  const tm = new THREE.MeshStandardMaterial({ color: col(p.tongueColor || '#b86f7a'), roughness: .38 });
  const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(.03, 1, 4, 12), tm); tongue.castShadow = true; tongue.visible = false; g.add(tongue);
  const yAx = new THREE.Vector3(0, 1, 0);
  return (t, mo, pm, ma, val, lat) => {
    const rk = val('rk', 0), lk = val('lick', 0), dk = val('drink', 0); tongue.visible = false;
    let T = mo.lickAt || pm.lickAt || p.lickAt; if (mo.lickAt && pm.lickAt && mo.lickAt !== pm.lickAt) { const k = easeIO(clamp(ma / (mo.dur ?? 1))); T = pm.lickAt.map((q, i) => lerp(q, mo.lickAt[i], k)); }
    if (!T || rk < .002) { LINK[p.link || 'cow'] = { mouth: mouth(), tip: null }; return; }
    const tgt = new THREE.Vector3(...T), stand = dk > .5 ? .01 : (p.stand ?? .1);
    for (let it = 0; it < 4; it++) { g.updateMatrixWorld(true); const M = mouth(), piv = n1.getWorldPosition(new THREE.Vector3());
      const want = tgt.clone().add(M.clone().sub(tgt).normalize().multiplyScalar(stand)), a = M.sub(piv), b = want.sub(piv), ang = a.angleTo(b); if (ang < .004) break;
      const ax = a.clone().cross(b).normalize(), A = Math.min(ang, .55) * rk; bendBone(n1, ax, A * .55); g.updateMatrixWorld(true); bendBone(n2, ax, A * .45); }
    const u = fr01(t / LICK_P), ext = clamp(Math.sin(Math.PI * u) * 1.4) * lk * (1 - dk);
    bendBone(n1, lat, (dk > .5 ? .012 * Math.sin(t * 2.2) : -.045 * Math.sin(2 * Math.PI * u) * lk) * rk); g.updateMatrixWorld(true); // head dips into each lick / gulps
    const M = mouth(); let tip = null;
    if (ext > .02) { const dir = M.clone().sub(tgt); dir.y = 0; if (dir.lengthSq() > 1e-6) dir.normalize();
      tip = tgt.clone().addScaledVector(dir, .045 * (u - .5) * 2).add(new THREE.Vector3(0, .01, 0)); const end = M.clone().lerp(tip, ext), seg = end.clone().sub(M), L = seg.length();
      if (L > .02) { tongue.visible = true; tongue.position.copy(M).addScaledVector(seg, .5); tongue.quaternion.setFromUnitVectors(yAx, seg.normalize()); tongue.scale.set(1.25, Math.max(.01, L - .06), .55); } }
    LINK[p.link || 'cow'] = { mouth: M, tip, ext, gap: M.distanceTo(tgt) }; };
}

// ---- rock-salt lick block (real size ~0.4 x 0.15 x 0.2 m) on a low wooden tray. Origin on the ground at the tray centre.
// params: size [x,y,z], tray (true), licks [[t0,t1]] (world), lick [x,y,z] local lick spot, wearK [[t, 0..2]] (0..1 hollow + 15 % smaller,
// 1..2 worn down to a remnant), carry [t0, t1] + carryBy (LINK key of a rig_person with link) = rides between the palms, set down at t1.
function rockSaltTex() { return SPR.saltRock ||= (() => { const t = canvasT(512, 512, (c, w, h) => { const r = rng(77); const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e9b2a2'); gr.addColorStop(.5, '#f0c6b8'); gr.addColorStop(1, '#e3a594'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, s = 10 + r() * 46, k = r(); c.fillStyle = k < .3 ? `rgba(255,240,234,${.2 + r() * .35})` : k < .75 ? `rgba(236,160,140,${.18 + r() * .3})` : `rgba(214,128,104,${.15 + r() * .25})`;
      c.beginPath(); const nP = 4 + (r() * 3 | 0); for (let j = 0; j < nP; j++) { const a = j / nP * 6.28 + r() * .6, rr = s * (.5 + r() * .5); j ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
    for (let i = 0; i < 28; i++) { c.strokeStyle = `rgba(${200 + r() * 30 | 0},${110 + r() * 40 | 0},${90 + r() * 30 | 0},${.18 + r() * .3})`; c.lineWidth = 1 + r() * 4; c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y);
      for (let j = 0; j < 7; j++) { x += (r() - .5) * 90; y += (r() - .3) * 70; c.lineTo(x, y); } c.stroke(); }
    for (let i = 0; i < 2600; i++) { c.fillStyle = r() < .85 ? `rgba(255,255,255,${r() * .6})` : `rgba(120,70,55,${r() * .3})`; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, [1, 1]); return t; })(); }
function saltBlock(p = {}) { const g0 = new THREE.Group(), g = new THREE.Group(), [W, Hh, D] = p.size || [.4, .15, .2], rad = .028, trayH = p.tray === false ? 0 : .06, blk = new THREE.Group(), SH = p.stand || 0; g0.add(g); g.position.y = SH; g.add(blk);
  if (SH) for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = woodBox([.045, SH, .045], 1, '#7a5c3e', [sx * (W / 2 + .03), SH / 2, sz * (D / 2 + .02)]); leg.rotation.z = -sx * .06; g0.add(leg); }
  if (SH) for (const sz of [-1, 1]) g0.add(woodBox([W + .1, .04, .03], 0, '#7a5c3e', [0, SH * .35, sz * (D / 2 + .02)])); // stretchers
  let geo = new THREE.BoxGeometry(W, Hh, D, 22, 9, 12); geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo, 1e-5);
  const P = geo.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), hx = W / 2 - rad, hy = Hh / 2 - rad, hz = D / 2 - rad, rr = rng(p.seed || 5);
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); const n = v.clone().sub(c); if (n.lengthSq() > 1e-10) v.copy(c).add(n.normalize().multiplyScalar(rad));
    const bump = (hr(v.x * 40 + v.y * 13, v.z * 31) - .5) * .004; v.addScaledVector(n.lengthSq() > 0 ? n : v.clone().normalize(), bump); P.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); const base = P.array.slice(), nrm = geo.attributes.normal.array.slice(), uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { uv[i * 2] = (base[i * 3] + base[i * 3 + 2] * .7) / .3 + .5; uv[i * 2 + 1] = (base[i * 3 + 1] + base[i * 3 + 2] * .35) / .3 + .5; } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const vc = new Float32Array(P.count * 3).fill(1); geo.setAttribute('color', new THREE.BufferAttribute(vc, 3));
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: rockSaltTex(), bumpMap: rockSaltTex(), bumpScale: .6, roughness: .42, clearcoat: .3, clearcoatRoughness: .35, sheen: .4, sheenColor: col('#fff4f0'), sheenRoughness: .6 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; blk.add(mesh);
  if (trayH) { const tint = '#8a6a48'; g.add(woodBox([W + .14, .025, D + .12], 0, tint, [0, .0125, 0])); for (const s of [-1, 1]) { g.add(woodBox([W + .14, trayH, .022], 0, tint, [0, trayH / 2, s * (D / 2 + .05)])); g.add(woodBox([.022, trayH, D + .08], 2, tint, [s * (W / 2 + .06), trayH / 2, 0])); } }
  const rest = new THREE.Vector3(0, .025 + Hh / 2, 0), spotL = new THREE.Vector3(...(p.lick || [0, Hh / 2, D * .15])); // lick spot, block-centre frame
  const crumbN = 46, crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#f6e6e0', { r: .45 }), crumbN); crumbs.frustumCulled = false; g.add(crumbs);
  const Mx = new THREE.Matrix4(), Qx = new THREE.Quaternion(), Sx = new THREE.Vector3(), Px = new THREE.Vector3(), Zx = new THREE.Matrix4().makeScale(0, 0, 0);
  const flakes = flakeSystem(g, 40, ['#fff6f2', '#f2c4b6', '#e8ab98']);
  const cry = p.crystals || 0, cryIM = cry ? new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .2, clearcoat: .6, map: rockSaltTex() }), cry) : null, cryP = [];
  if (cryIM) { cryIM.frustumCulled = false; cryIM.castShadow = true; g.add(cryIM); for (let i = 0; i < cry; i++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * .16, s = .018 + rr() * .035; cryP.push(new THREE.Vector3((p.heap || [0, .4])[0] + Math.cos(a) * d * 1.4, s * .45 - SH + (.16 - d) * .25, (p.heap || [0, .4])[1] + Math.sin(a) * d));
      Qx.setFromEuler(new THREE.Euler(rr() * .5, rr() * 6, rr() * .5)); cryIM.setMatrixAt(i, Mx.compose(cryP[i], Qx, Sx.set(s, s * .9, s * 1.1))); } }
  const glB = glints(g, 9, i => { const s = blk.scale.x, a = hr(i, 1), b = hr(i, 2); return new THREE.Vector3((a - .5) * W * .85 * s, Hh / 2 * blk.scale.y + .006, (b - .5) * D * .8 * s).add(blk.position); }, .045);
  const glC = cryIM ? glints(g, Math.min(10, cry), i => cryP[i * 3 % cry].clone().add(new THREE.Vector3(0, .02, 0)), .06) : null;
  let lastW = -1; const tmpW = new THREE.Vector3(), kick = new THREE.Vector3(...(p.kick || [0, 0, 1]));
  g.userData.tick = (t) => { const w = kv(p.wearK, t, 0), wd = Math.min(1, w), sf = (1 - .15 * wd) * (w > 1 ? Math.max(.12, 2 - w) : 1);
    if (Math.abs(w - lastW) > .002) { lastW = w; const dep = .07 * wd;
      for (let i = 0; i < P.count; i++) { const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2], dx = bx - spotL.x, dy = (by - spotL.y) * 1.4, dz = (bz - spotL.z), f = Math.exp(-(dx * dx + dy * dy + dz * dz) / (.11 * .11));
        P.setXYZ(i, bx - nrm[i * 3] * dep * f, by - nrm[i * 3 + 1] * dep * f, bz - nrm[i * 3 + 2] * dep * f);
        const sh = 1 - .3 * f * wd; vc[i * 3] = sh; vc[i * 3 + 1] = sh * (1 - .06 * f * wd); vc[i * 3 + 2] = sh * (1 - .08 * f * wd); } // wet, darker, smoother hollow
      P.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals(); }
    blk.scale.set(sf, sf * (w > 1 ? .8 : 1), sf);
    // carried between the farmer's palms, set down onto the tray at carry[1]
    let carried = false; if (p.carry && t < p.carry[1]) { const L = LINK[p.carryBy || 'farmer']; blk.visible = t >= p.carry[0];
      if (L?.L) { g.updateWorldMatrix(true, false); const mid = L.L.clone().lerp(L.R, .5).add(new THREE.Vector3(0, -.015, 0)), loc = g.worldToLocal(mid), k = sEase((t - (p.carry[1] - .45)) / .45);
        blk.position.copy(loc).lerp(rest, k); blk.rotation.set(0, lerp(L.yaw, 0, k), 0); carried = true; } }
    if (!carried) { blk.visible = true; blk.position.copy(rest); blk.position.y = .025 + Hh / 2 * blk.scale.y; blk.rotation.set(0, 0, 0); }
    // flakes from the lick spot (world-frame time sync with the cow's tongue), crumbs that pile up on the tray as the block wears
    tmpW.copy(spotL).multiply(blk.scale).add(blk.position); flakes(t, p.licks, tmpW, kick, (x, z) => Math.abs(x) < W / 2 + .07 && Math.abs(z) < D / 2 + .06 ? .025 : -SH, 6);
    const nc = Math.round(clamp(w / 1.3) * crumbN); for (let i = 0; i < crumbN; i++) { if (i >= nc) { crumbs.setMatrixAt(i, Zx); continue; } const a = hr(i, 31) * 6.283, b = hr(i, 32), s = .006 + hr(i, 33) * .012;
      Px.set(clamp(Math.cos(a) * (W / 2 + .02 + b * .04) * 1.3, -W / 2 - .055, W / 2 + .055), .025 + s * .4, clamp(Math.sin(a) * (D / 2 + .02 + b * .04) * 1.3, -D / 2 - .045, D / 2 + .045)); Qx.setFromEuler(new THREE.Euler(a * 3, b * 5, 0)); crumbs.setMatrixAt(i, Mx.compose(Px, Qx, Sx.set(s, s * .6, s))); }
    crumbs.instanceMatrix.needsUpdate = true; glB(t, 1); if (glC) glC(t, 1.2); };
  return g0; }

// ---- mud-brick pen wall with salt efflorescence (white crust bloom with a wavy tide line, glints) and a licked wet patch.
// Front face at +z (thickness toward -z). params: len, h, t, crustH (top of the bloom), lick [x, y] on the face, lickK [[t,0..1]], licks (flakes)
function saltWall(p = {}) { const g = new THREE.Group(), L = p.len || 3.4, H = p.h || 1.8, T = p.t || .3, CH = p.crustH || 1.15, r = rng(p.seed || 9);
  const PX = 160; // px per metre
  const draw = (c, w, h, bumpOnly) => { c.fillStyle = bumpOnly ? '#808080' : '#9a7350'; c.fillRect(0, 0, w, h); const bh = .075 * PX, bl = .24 * PX, mo = .016 * PX;
    for (let y = h, row = 0; y > -bh; y -= bh + mo, row++) for (let x = -(row % 2) * bl / 2; x < w; x += bl + mo) { const v = .85 + r() * .25;
      c.fillStyle = bumpOnly ? `rgb(${150 + r() * 40 | 0},${150 | 0},150)` : `rgb(${150 * v | 0},${110 * v | 0},${74 * v | 0})`; c.fillRect(x, y - bh, bl, bh);
      if (!bumpOnly) for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(${r() > .5 ? '205,170,120' : '70,48,30'},${r() * .2})`; c.fillRect(x + r() * bl, y - bh + r() * bh, 2 + r() * 8, 1 + r() * 3); } }
    if (!bumpOnly) for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(176,140,100,${.55 + r() * .3})`; const x = r() * w, y = r() * h * .5, rw = 30 + r() * 120, rh = 20 + r() * 70; c.beginPath(); c.ellipse(x, y, rw, rh, r(), 0, 6.3); c.fill(); } // old mud plaster patches
    // efflorescence: white bloom from the ground up to a wavy tide line; denser low down, brown tide mark at the edge
    const top = x => h - (CH + Math.sin(x / w * 9 + 1) * .09 + Math.sin(x / w * 23) * .04) * PX;
    for (let x = 0; x < w; x += 2) { const y0 = top(x); if (!bumpOnly) { c.fillStyle = 'rgba(120,85,50,.35)'; c.fillRect(x, y0 - 3, 2, 5); } }
    if (!bumpOnly) for (let x = 0; x < w; x += 3) { const y0 = top(x), gr2 = c.createLinearGradient(0, y0, 0, h); gr2.addColorStop(0, 'rgba(70,50,32,0)'); gr2.addColorStop(.15, 'rgba(70,50,32,.22)'); gr2.addColorStop(1, 'rgba(60,44,30,.3)'); c.fillStyle = gr2; c.fillRect(x, y0, 3, h - y0); } // damp band
    for (let i = 0; i < 3800; i++) { const x = r() * w, y0 = top(x), y = y0 + Math.pow(r(), 1.3) * (h - y0) * .9, dens = 1 - (y - y0) / (h - y0 + 1); const a = (.05 + dens * .22) * r();
      c.fillStyle = bumpOnly ? `rgba(255,255,255,${a * 1.5})` : `rgba(246,244,236,${a})`; c.beginPath(); c.ellipse(x, y, 1 + r() * 3, .6 + r() * 1.6, 0, 0, 6.3); c.fill(); }
    if (!bumpOnly) for (let x = 0; x < w; x += 2) { const y0 = top(x); c.fillStyle = 'rgba(248,246,240,.55)'; c.fillRect(x, y0 - 1 + Math.sin(x * .3) * 1.5, 2, 4 + r() * 6); } }; // crust is densest along the tide line
  const tex = canvasT(Math.round(L * PX), Math.round(H * PX), (c, w, h) => draw(c, w, h, false), [1, 1]);
  const bt = canvasT(Math.round(L * PX), Math.round(H * PX), (c, w, h) => draw(c, w, h, true), [1, 1]); bt.colorSpace = THREE.NoColorSpace;
  const fm = new THREE.MeshStandardMaterial({ map: tex, bumpMap: bt, bumpScale: 2.2, roughness: .95 }), sm = new THREE.MeshStandardMaterial({ color: col('#8f6a48'), roughness: 1 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(L, H, T), [sm, sm, sm, sm, fm, sm]); wall.position.set(0, H / 2, -T / 2); g.add(wall);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(T * .55, T * .6, L + .02, 10, 1), std('#8d6847', { r: 1 })); cap.rotation.z = Math.PI / 2; cap.scale.set(1, 1, .55); cap.position.set(0, H, -T / 2); g.add(cap);
  const lk = p.lick || [0, .85], wetM = new THREE.MeshStandardMaterial({ color: col('#6e5236'), roughness: .25, transparent: true, opacity: 0, depthWrite: false, map: softDiscTex(), alphaMap: null, polygonOffset: true, polygonOffsetFactor: -3 });
  wetM.map = null; wetM.alphaMap = softDiscTex(); const wet = new THREE.Mesh(new THREE.PlaneGeometry(.42, .3), wetM); wet.position.set(lk[0], lk[1], .003); g.add(wet);
  const flakes = flakeSystem(g, 30, ['#ffffff', '#f2eee6', '#d9c7b0']), spot = new THREE.Vector3(lk[0], lk[1], .01);
  const gl = glints(g, 14, i => new THREE.Vector3((hr(i, 7) - .5) * L * .9, .1 + hr(i, 8) * (CH - .2), .012), .05);
  g.userData.tick = t => { wetM.opacity = .75 * kv(p.lickK, t, 0); flakes(t, p.licks, spot, new THREE.Vector3(0, 0, 1), 0, 5); gl(t, 1); };
  return shadowed(g); }

// ---- concrete water trough (1.6 x 0.5 m, 0.5 m high), water at .42 m with ripple rings from the drinking muzzle (drinks [[t0,t1]], drinkAt [x,z] local)
function trough(p = {}) { const g = new THREE.Group(), L = p.len || 1.6, W = p.w || .5, H = p.h || .5, th = .07, r = rng(p.seed || 12);
  const tex = canvasT(256, 128, (c, w, h) => { c.fillStyle = '#8f8a80'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(${r() > .5 ? '250,248,240' : '60,58,52'},${r() * .12})`; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(90,95,70,${.05 + r() * .1})`; c.fillRect(r() * w, h * (.1 + r() * .3), 4 + r() * 30, 20 + r() * 60); } c.fillStyle = 'rgba(70,90,50,.25)'; c.fillRect(0, h * .12, w, 6); }, [L / 1.2, H / .6]);
  const cm = new THREE.MeshStandardMaterial({ map: tex, roughness: .9 });
  const part = (w, h, d, x, y, z) => { const m = box(w, h, d, cm); m.position.set(x, y, z); g.add(m); };
  part(L, .08, W, 0, .04, 0); part(L, H, th, 0, H / 2, W / 2 - th / 2); part(L, H, th, 0, H / 2, -W / 2 + th / 2); part(th, H, W - 2 * th, L / 2 - th / 2, H / 2, 0); part(th, H, W - 2 * th, -L / 2 + th / 2, H / 2, 0);
  const wy = H - .08, wm = new THREE.MeshStandardMaterial({ color: col('#4f6f70'), roughness: .06, metalness: .25, transparent: true, opacity: .9, envMapIntensity: 1.2 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(L - 2 * th, W - 2 * th), wm); water.rotation.x = -Math.PI / 2; water.position.y = wy; g.add(water);
  const ringM = new THREE.MeshBasicMaterial({ map: rippleRingTex(), color: col('#e8f2f2'), transparent: true, opacity: 0, depthWrite: false }), rings = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringM.clone()); m.rotation.x = -Math.PI / 2; m.position.y = wy + .003; g.add(m); rings.push(m); }
  const wetG = contactShadow(.5, 1.1, .35); wetG.rotation.z = Math.PI / 2; wetG.position.set(0, .012, W / 2 + .35); g.add(wetG); // damp ground in front where cattle drink
  const da = p.drinkAt || [0, 0], straws = new THREE.InstancedMesh(new THREE.CylinderGeometry(.003, .003, .12, 4), std('#c8a85a'), 6); g.add(straws);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), Pp = new THREE.Vector3();
  g.userData.tick = t => { const on = (p.drinks || []).some(([a, b]) => t >= a && t < b + 2);
    rings.forEach((m, i) => { const per = 2.1, age = (t + i * per / rings.length) % per, tb = t - age, act = (p.drinks || []).some(([a, b]) => tb >= a && tb < b);
      m.visible = act && on; const k = age / per; m.scale.setScalar(.06 + age * .32); m.position.x = da[0]; m.position.z = da[1]; m.material.opacity = Math.pow(1 - k, 1.5) * .55 + (act ? 0 : 0); });
    for (let i = 0; i < 6; i++) { const x = ((hr(i, 1) * (L - .3) + t * .01 * (hr(i, 2) - .5)) % (L - .3)) - (L - .3) / 2; Pp.set(x, wy + .004 + Math.sin(t * 1.3 + i) * .002, (hr(i, 3) - .5) * (W - .2));
      Q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, hr(i, 4) * 6 + Math.sin(t * .4 + i) * .2)); straws.setMatrixAt(i, M.compose(Pp, Q, S)); } straws.instanceMatrix.needsUpdate = true; };
  return shadowed(g); }

// ---- timber pen fence: segs [[x0,z0,x1,z1]] local; square posts (10 cm, 1.3 m) every <= 1.9 m with a slight lean, 3 rails, weathered grain
function penFence(p = {}) { const g = new THREE.Group(), tints = ['#9b8263', '#8d7458', '#a68c6b'];
  (p.segs || [[-2, 0, 2, 0]]).forEach(([x0, z0, x1, z1], si) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / 1.9)), seg = new THREE.Group(); seg.position.set(x0, 0, z0); seg.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); g.add(seg);
    for (let i = 0; i <= n; i++) { const pst = woodBox([.1, 1.3, .1], 1, tints[(si + i) % 3], [i * len / n, .65, 0]); pst.rotation.z = (hr(si, i) - .5) * .05; seg.add(pst); }
    for (const y of [.38, .78, 1.15]) seg.add(woodBox([len + .1, .09, .035], 0, tints[(si + 1) % 3], [len / 2, y + (hr(si, y) - .5) * .03, .07])); });
  return g; }

// ---- hay pile (dried straw on the ground): instanced straws in a low mound, golden to grey-brown
function hayPile(p = {}) { const g = new THREE.Group(), n = p.count || 900, R = p.r || .6, Hh = p.h || .28, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0035, .0035, 1, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }), n);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), cs = ['#d9bd72', '#c9a85c', '#b8975a', '#e3cd8a', '#a88a52'];
  for (let i = 0; i < n; i++) { const a = hr(i, 1) * 6.28, d = Math.sqrt(hr(i, 2)) * R, hgt = Hh * (1 - (d / R) ** 2) * hr(i, 3); P.set(Math.cos(a) * d, .01 + hgt, Math.sin(a) * d * .8);
    Q.setFromEuler(new THREE.Euler(Math.PI / 2 + (hr(i, 4) - .5) * 1.2, hr(i, 5) * 6.28, (hr(i, 6) - .5) * .8)); S.set(1, .18 + hr(i, 7) * .22, 1); im.setMatrixAt(i, M.compose(P, Q, S)); im.setColorAt(i, col(cs[i % cs.length])); }
  im.castShadow = true; im.receiveShadow = true; g.add(im); return g; }
// ---- trampled pen floor: packed earth with hoof prints and loose straw, soft edges (flat, so the grass cover stays off it)
function penFloor(p = {}) { const W = p.w || 6, D = p.d || 4, r = rng(p.seed || 17);
  const tex = canvasT(1024, Math.round(1024 * D / W), (c, w, h) => { c.fillStyle = '#86684a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() > .5 ? '170,140,105' : '70,52,36'},${r() * .16})`; c.fillRect(r() * w, r() * h, 1 + r() * 5, 1 + r() * 4); }
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, a = r() * 6.28, s = 5 + r() * 3; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = 'rgba(60,44,30,.38)';
      for (const dx of [-s * .55, s * .55]) { c.beginPath(); c.ellipse(dx, 0, s * .45, s, 0, 0, 6.3); c.fill(); } c.restore(); }  // cloven hoof prints
    for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, a = r() * 6.28, l = 6 + r() * 22; c.strokeStyle = `rgba(${200 + r() * 40 | 0},${170 + r() * 30 | 0},${100 + r() * 30 | 0},${.35 + r() * .45})`; c.lineWidth = 1 + r();
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } }, [1, 1]);
  const al = canvasT(256, 256, (c, w, h) => { const g2 = c.createRadialGradient(w / 2, h / 2, w * .3, w / 2, h / 2, w * .5); g2.addColorStop(0, '#fff'); g2.addColorStop(1, '#000'); c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = g2; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.fillRect(w * .1, h * .1, w * .8, h * .8); }, [1, 1]); al.colorSpace = THREE.NoColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: tex, alphaMap: al, transparent: true, roughness: .97, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = .012; m.receiveShadow = true; m.renderOrder = 1; return m; }
Object.assign(ASSETS, { salt_block: saltBlock, salt_wall: saltWall, trough, pen_fence: penFence, hay_pile: hayPile, pen_floor: penFloor });
// carrying / setting down (tuned with a probe on the Farmer so the palms hold the block ends)
Object.assign(RIG_POSES, { carry: { adL: 1.42, adR: 1.42, fL: .2, fR: .2, eL: .4, eR: .4, sp: .04, hd: .3, hold: 1 },        // palms ~0.99 m high, 0.23 m forward, 0.42 m apart
  placeKneel: { adL: 1.42, adR: 1.42, fL: .4, fR: .4, eL: .05, eR: .05, sp: 1.5, hd: -.3, kL: 1.55, kR: 1.55, hold: 1 } }); // kneeling (track y -.31): palms .43 m high, .40 m forward

// ================= Winter hens pack (2026-11-18, plans/hens_winter.mjs) =================
// Why hens stop laying in winter and how a lamp on a timer fixes it.
// Motion: a hen on a stateless walker (steps synced to distance, head-stabilised bob: the head holds still in space and thrusts forward
// each step), pecking with a fast strike and slow rise plus a backward foot scratch, saccadic head turns, resting (sits, fluffs up,
// legs tucked) and preening (head into the wing with nibbles); acts cross-blend. Farmer on the bone rig with new reach poses.
// Graphics: lime-washed mud-brick coop (flaking wash, dirty base band, mud plaster outside), palm-trunk roof with jareed sticks and
// straw, straw litter with 3-toe prints, wooden nest boxes with straw cups and eggs, an enamel lamp (warm point light, bulb glow,
// incandescent warm-up), a plug-in mechanical timer whose pinned dial turns with the day.
// Realism: one shared day clock (dayK) drives the sun on its real arc (summer ~14 h high and wide, winter ~10 h low and short),
// the timer dial and the lamp (on before sunrise and after sunset), so the light really follows the timer.
const dayOn = (segs, d) => { const f = fr01(d); return (segs || []).some(([a, b]) => f >= a && f < b); };
const stepKey = (keys, t, d = 0) => { let v = d; for (const [tk, x] of keys || []) if (t >= tk) v = x; return v; };
function limeTex() { return SPR.lime ||= (() => { const PX = 128, r = rng(171); return canvasT(Math.round(2.2 * PX), Math.round(2.2 * PX), (c, w, h) => {
  c.fillStyle = '#e9e3d4'; c.fillRect(0, 0, w, h); const bh = .085 * PX;
  for (let y = h; y > 0; y -= bh) { c.fillStyle = 'rgba(150,135,110,.10)'; c.fillRect(0, y - 1, w, 2); for (let x = ((y / bh) % 2) * 15; x < w; x += .25 * PX) c.fillRect(x, y - bh, 2, bh); } // bricks under the wash
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,252,244' : '120,105,85'},${r() * .09})`; c.fillRect(r() * w, r() * h, 1 + r() * 6, 1 + r() * 5); }
  for (let i = 0; i < 14; i++) { const x = r() * w, y = h * (.15 + r() * .75), rw = 6 + r() * 26, rh = 4 + r() * 16; c.fillStyle = '#9b7552'; c.beginPath(); // flaked wash shows the mud brick
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, rr = .6 + r() * .5; c.lineTo(x + Math.cos(a) * rw * rr, y + Math.sin(a) * rh * rr); } c.fill();
    c.strokeStyle = 'rgba(250,246,236,.8)'; c.lineWidth = 1; c.stroke(); }
  for (let i = 0; i < 10; i++) { const x = r() * w; const g2 = c.createLinearGradient(0, h * .2, 0, h); g2.addColorStop(0, 'rgba(110,95,70,0)'); g2.addColorStop(1, `rgba(110,95,70,${.08 + r() * .08})`); c.fillStyle = g2; c.fillRect(x, h * .2, 3 + r() * 10, h); } // drip stains
  const gb = c.createLinearGradient(0, h - .42 * PX, 0, h); gb.addColorStop(0, 'rgba(115,92,62,0)'); gb.addColorStop(.45, 'rgba(115,92,62,.38)'); gb.addColorStop(1, 'rgba(95,74,50,.62)'); c.fillStyle = gb; c.fillRect(0, h - .42 * PX, w, .42 * PX); // soiled base
  for (let i = 0; i < 160; i++) { c.strokeStyle = `rgba(80,62,40,${.15 + r() * .25})`; c.lineWidth = 1; const x = r() * w, y = h - r() * .3 * PX; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 8, y - 3 - r() * 7); c.stroke(); } }, [1, 1]); })(); }
function mudTex2() { return SPR.mud2 ||= (() => { const PX = 128, r = rng(173); return canvasT(Math.round(2.2 * PX), Math.round(2.2 * PX), (c, w, h) => {
  c.fillStyle = '#a27c56'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(${r() > .5 ? '196,160,116' : '92,66,42'},${r() * .16})`; c.fillRect(r() * w, r() * h, 1 + r() * 5, 1 + r() * 4); }
  for (let i = 0; i < 700; i++) { c.strokeStyle = `rgba(${215 + r() * 30 | 0},${185 + r() * 30 | 0},${120 + r() * 30 | 0},${.3 + r() * .4})`; c.lineWidth = 1; const x = r() * w, y = r() * h, a = r() * 6.28, l = 3 + r() * 9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } // straw in the plaster
  for (let i = 0; i < 6; i++) { const x0 = r() * w, y0 = r() * h; c.strokeStyle = 'rgba(70,50,32,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0, y0); let x = x0, y = y0; for (let k = 0; k < 7; k++) { x += (r() - .5) * 18; y += 4 + r() * 10; c.lineTo(x, y); } c.stroke(); } // cracks
  for (let i = 0; i < 8; i++) { const x = r() * w, y = r() * h, bw = 30, bh = 10; c.fillStyle = 'rgba(120,80,50,.5)'; for (let k = 0; k < 4; k++) c.fillRect(x + (k % 2) * 15, y + k * (bh + 2), bw, bh); } }, [1, 1]); })(); } // bricks showing
function strawTex(yard) { const k = yard ? 'yardT' : 'strawT'; return SPR[k] ||= (() => { const r = rng(yard ? 181 : 179); return canvasT(1024, 1024, (c, w, h) => {
  c.fillStyle = yard ? '#9a7b58' : '#8c6d4b'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${r() > .5 ? '185,155,118' : '70,52,36'},${r() * .17})`; c.fillRect(r() * w, r() * h, 1 + r() * 5, 1 + r() * 4); }
  for (let i = 0; i < (yard ? 260 : 2600); i++) { const x = r() * w, y = r() * h, a = r() * 6.28, l = 8 + r() * 26; c.strokeStyle = `rgba(${205 + r() * 40 | 0},${172 + r() * 35 | 0},${95 + r() * 40 | 0},${.45 + r() * .45})`; c.lineWidth = 1 + r() * 1.4;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .3) * l * .5, y + Math.sin(a + .3) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h, a = r() * 6.28; c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = 'rgba(62,46,30,.42)'; c.lineWidth = 1.6; // 3-toe hen prints
    for (const da of [-.55, 0, .55]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(da) * 11, Math.sin(da) * 11); c.stroke(); } c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, 0); c.stroke(); c.restore(); }
  for (let i = 0; i < (yard ? 500 : 140); i++) { c.fillStyle = r() > .4 ? `rgba(${200 + r() * 40 | 0},${160 + r() * 30 | 0},${70 + r() * 30 | 0},.9)` : 'rgba(250,248,240,.8)'; c.beginPath(); c.ellipse(r() * w, r() * h, 1.4 + r(), 1 + r() * .6, r() * 3, 0, 6.3); c.fill(); } // grain and droppings flecks
  for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, a = r() * 6.28; c.strokeStyle = r() > .5 ? 'rgba(245,240,230,.85)' : 'rgba(150,90,45,.85)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 9, a, a + 1.2); c.stroke(); } }, [1, 1]); })(); } // stray feathers
function coopFloor(p = {}) { const W = p.w || 3, D = p.d || 2.3, t = strawTex(p.yard), al = canvasT(256, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const g2 = c.createRadialGradient(w / 2, h / 2, w * .25, w / 2, h / 2, w * .5); g2.addColorStop(0, '#fff'); g2.addColorStop(1, '#000'); c.fillStyle = g2; c.fillRect(0, 0, w, h); if (!p.yard) { c.fillStyle = '#fff'; c.fillRect(w * .04, h * .04, w * .92, h * .92); } }, [1, 1]);
  al.colorSpace = THREE.NoColorSpace; t.repeat.set(W / 3, D / 3);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: t, alphaMap: al, transparent: true, roughness: .97, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = .012; m.receiveShadow = true; m.renderOrder = 1; if (p.shadeK) m.userData.tick = t => m.material.color.setScalar(kv(p.shadeK, t, 1)); return m; }
// ---- village coop: lime-washed inside, mud plaster outside, open front (cutaway), side doorway, small barred window, palm-trunk roof.
// Interior x in [-W/2+T, W/2-T], back wall inner face at z = zb + T, side walls run to z = zf.
function henCoop(p = {}) { const g = new THREE.Group(), W = p.w || 3.5, T = p.t || .25, H = p.h || 2.1, zb = p.zb ?? -2.7, zf = p.zf ?? -.3, r = rng(p.seed || 5);
  const lime = new THREE.MeshStandardMaterial({ map: limeTex(), roughness: .95 }), mud = new THREE.MeshStandardMaterial({ map: mudTex2(), roughness: .97 });
  g.userData.tick = t => { const k = kv(p.shadeK, t, 1); lime.color.setRGB(k, k * (.97 + .03 * k), k * (.92 + .08 * k)); }; // under-roof sky occlusion (no AO in the renderer)
  const mats = inner => [0, 1, 2, 3, 4, 5].map(i => i === inner ? lime : mud), su = 2.2;
  wbox(g, -W / 2, W / 2, 0, H, zb, zb + T, mats(4), su);                                                        // back wall (inner face +z)
  const win = p.win || [-1.75, -1.25, 1.2, 1.6], door = p.door || [-1.95, -1.15, 0, 1.9];
  holedWall(g, 'z', zb, zf, 0, H, -W / 2, -W / 2 + T, [win], mats(0), su);                                     // left wall with a window
  holedWall(g, 'z', zb, zf, 0, H, W / 2 - T, W / 2, [door], mats(1), su);                                       // right wall with a doorway
  for (const z of [win[0] + .17, win[0] + .33]) g.add(woodBox([.03, win[3] - win[2], .03], 1, '#6e5338', [-W / 2 + T / 2, (win[2] + win[3]) / 2, z]));  // window bars
  g.add(woodBox([T + .06, .07, win[1] - win[0] + .12], 2, '#7a5c3c', [-W / 2 + T / 2, win[3] + .035, (win[0] + win[1]) / 2]));
  g.add(woodBox([T + .06, .09, door[1] - door[0] + .2], 2, '#6f5235', [W / 2 - T / 2, door[3] + .045, (door[0] + door[1]) / 2]));  // lintel
  const leaf = new THREE.Group(); leaf.position.set(W / 2 + .02, 0, door[1]); leaf.rotation.y = -1.95; g.add(leaf);                 // old plank door swung open outside
  for (let i = 0; i < 4; i++) leaf.add(woodBox([.03, door[3] - .06, .185], 1, ['#8a6c4c', '#7d6145', '#93745a', '#806446'][i], [.015, (door[3] - .06) / 2 + .03, -.1 - i * .19]));
  for (const y of [.35, 1.45]) leaf.add(woodBox([.03, .1, .76], 2, '#6d5236', [.045, y, -.39]));
  // roof: palm trunks across x, jareed sticks along z, straw and mud on top, frayed frond ends over the front edge
  const zr0 = zb - .1, zr1 = zf + .28, trunkM = new THREE.MeshStandardMaterial({ map: canvasT(64, 256, (c, w, h) => { c.fillStyle = '#6b5440'; c.fillRect(0, 0, w, h); const q = rng(3);
    for (let y = 0; y < h; y += 7) { c.fillStyle = `rgba(${q() > .5 ? '150,120,90' : '40,30,22'},.55)`; c.fillRect(0, y, w, 3); } for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(30,22,15,${q() * .3})`; c.fillRect(q() * w, q() * h, 2, 4); } }, [1, 3]), roughness: .95 });
  for (let i = 0; i < 5; i++) { const z = lerp(zr0 + .12, zr1 - .1, i / 4), tr = cyl(.075 + r() * .015, .085, W + .3 + r() * .2, trunkM, 12); tr.rotation.z = Math.PI / 2; tr.position.set((r() - .5) * .1, H + .08, z); tr.castShadow = tr.receiveShadow = true; g.add(tr); }
  { const n = Math.round((W + .2) / .04), im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.013, .016, zr1 - zr0, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 }), n), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
    for (let i = 0; i < n; i++) { P.set(-W / 2 - .1 + i * .04 + (hr(i, 2) - .5) * .01, H + .175, (zr0 + zr1) / 2 + (hr(i, 3) - .5) * .12); Q.setFromEuler(new THREE.Euler(Math.PI / 2, (hr(i, 4) - .5) * .05, 0)); im.setMatrixAt(i, M.compose(P, Q, S));
      im.setColorAt(i, col(['#b89a6c', '#a88a5e', '#c4a878', '#9c7f56'][i % 4])); } im.castShadow = im.receiveShadow = true; g.add(im); }
  const thatch = new THREE.MeshStandardMaterial({ map: strawTex(false), roughness: .95, color: col('#d8c49a') }); thatch.map = thatch.map.clone(); thatch.map.needsUpdate = true; thatch.map.repeat.set(1.3, .9);
  const top = box(W + .25, .07, zr1 - zr0 - .06, thatch); top.position.set(0, H + .225, (zr0 + zr1) / 2); top.castShadow = top.receiveShadow = true; g.add(top);
  { const n = 90, im = new THREE.InstancedMesh(new THREE.ConeGeometry(.012, 1, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 }), n), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const L = .12 + hr(i, 5) * .22; P.set(-W / 2 + hr(i, 6) * W, H + .2 - L * .35, zr1 + L * .3); Q.setFromEuler(new THREE.Euler(-2.1 - hr(i, 7) * .5, 0, (hr(i, 8) - .5) * .6)); S.set(1, L, 1); im.setMatrixAt(i, M.compose(P, Q, S));
      im.setColorAt(i, col(['#b79a62', '#a7864f', '#c9ae78'][i % 3])); } im.castShadow = true; g.add(im); }
  // terracotta water dish with water (inside, right front)
  const wd = p.dish || [1.0, -.9], prof = [[0, 0], [.13, 0], [.16, .02], [.17, .07], [.15, .075], [.14, .03], [0, .03]].map(([x, y]) => new THREE.Vector2(x, y));
  const dish = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), std('#b5603a', { r: .8 })); dish.position.set(wd[0], 0, wd[1]); dish.castShadow = dish.receiveShadow = true; g.add(dish);
  const wat = new THREE.Mesh(new THREE.CircleGeometry(.14, 24), new THREE.MeshStandardMaterial({ color: col('#5e7470'), roughness: .08, metalness: .2 })); wat.rotation.x = -Math.PI / 2; wat.position.set(wd[0], .062, wd[1]); g.add(wat);
  return g; }
// ---- wooden nest boxes (36 x 32 x 38 cm each) on a lime-washed mud bench, straw cups; eggsK [[t, n]] (steps) pops eggs into compartment `eggBox`
function nestRow(p = {}) { const g = new THREE.Group(), n = p.n || 2, w = .36, h = .32, d = .38, B = p.bench ?? .4, L = n * w, wt = ['#a07e58', '#93724f', '#ab8962'].map(c => '#' + col(c).multiplyScalar(p.shade ?? 1).getHexString());
  const benchM = new THREE.MeshStandardMaterial({ map: limeTex(), roughness: .95 }); wbox(g, -L / 2 - .06, L / 2 + .06, 0, B, -d / 2 - .02, d / 2 + .04, benchM, 2.2, 2.2, 0, .55);
  const y0 = B; g.add(woodBox([L + .02, .02, d], 0, wt[0], [0, y0 + .01, 0]));
  for (let i = 0; i <= n; i++) g.add(woodBox([.02, h, d], 1, wt[i % 3], [-L / 2 + i * w, y0 + h / 2, 0]));
  g.add(woodBox([L + .02, h, .02], 0, wt[1], [0, y0 + h / 2, -d / 2 + .01]));
  const roofB = woodBox([L + .08, .02, d + .1], 0, wt[2], [0, y0 + h + .04, .02]); roofB.rotation.x = .18; g.add(roofB);
  g.add(woodBox([L + .02, .1, .02], 0, wt[1], [0, y0 + .05, d / 2 - .01]));                                             // front lip keeps the straw in
  const ns = 260 * n, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0028, .0028, 1, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }), ns), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  for (let i = 0; i < ns; i++) { const b = i % n, a = hr(i, 1) * 6.28, rr = Math.sqrt(hr(i, 2)) * .16, cup = .055 * (rr / .16) ** 1.5 + .012; P.set(-L / 2 + w * (b + .5) + Math.cos(a) * rr, y0 + .02 + cup + hr(i, 3) * .02, Math.sin(a) * rr * 1.05);
    Q.setFromEuler(new THREE.Euler(Math.PI / 2 + (hr(i, 4) - .5) * .9, hr(i, 5) * 6.28, (hr(i, 6) - .5) * .9)); S.set(1, .07 + hr(i, 7) * .12, 1); im.setMatrixAt(i, M.compose(P, Q, S)); im.setColorAt(i, col(['#dcc27a', '#c9a95e', '#e6d394', '#b8975a'][i % 4])); }
  im.castShadow = true; im.receiveShadow = true; g.add(im);
  const eggs = [], em = new THREE.MeshStandardMaterial({ color: col('#ecd2b0'), roughness: .42 }), eb = p.eggBox ?? 1, spots = [[-.03, .02], [.04, -.02], [0, -.06]];
  for (let i = 0; i < 3; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(.021, 16, 12), em); e.scale.set(1, 1, 1.32); e.rotation.y = .5 + i; e.castShadow = true; g.add(e); eggs.push(e);
    e.position.set(-L / 2 + w * (eb + .5) + spots[i][0], y0 + .045, spots[i][1]); }
  g.userData.tick = t => { benchM.color.setScalar(kv(p.shadeK, t, 1)); const cnt = stepKey(p.eggsK, t, 0); eggs.forEach((e, i) => { let ta = -1; for (const [tk, v] of p.eggsK || []) { if (tk > t) break; if (v > i && ta < 0) ta = tk; if (v <= i) ta = -1; }
    e.visible = i < cnt; const s = ta >= 0 ? Math.max(.001, easeOutBack(clamp((t - ta) / .4))) : 1; e.scale.set(s, s, 1.32 * s); }); };
  return g; }
// ---- carried props: ride a rig_person palm (LINK[carryBy][hand]) from carry[0], then glide to their wall spot (local origin) by carry[1]
function rideTo(g, inner, p, t, off) { if (!p.carry) { inner.visible = true; inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0); return; }
  if (t < p.carry[0]) { inner.visible = false; return; } inner.visible = true;
  if (t >= p.carry[1]) { inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0); return; }
  const L = LINK[p.carryBy || 'farmer'], palm = L?.[p.hand || 'L']; if (!palm) { inner.visible = false; return; }
  g.updateWorldMatrix(true, false); const loc = g.worldToLocal(palm.clone()).sub(off), k = sEase((t - (p.carry[1] - .45)) / .45);
  inner.position.copy(loc).lerp(new THREE.Vector3(), k); const gy = g.getWorldQuaternion(new THREE.Quaternion()); const yw = new THREE.Euler().setFromQuaternion(gy).y;
  inner.rotation.set(0, lerp(L.yaw + Math.PI - yw, 0, k), 0); }
// ---- wall lamp: bakelite plate, steel arm, enamel shade, bulb; warm point light with warm-up; on = powered && timer segment (dayK, segs) or onK
function coopLamp(p = {}) { const g = new THREE.Group(), lamp = new THREE.Group(); g.add(lamp);
  const plate = cyl(.045, .045, .016, std('#3b2a20', { r: .5 }), 20); plate.rotation.x = Math.PI / 2; plate.position.z = .008; lamp.add(plate);
  const arm = box(.016, .016, .15, steelM()); arm.position.set(0, .01, .085); lamp.add(arm);
  const sock = cyl(.017, .017, .045, std('#2d2a27', { r: .4 }), 14); sock.position.set(0, -.012, .15); lamp.add(sock);
  const prof = [[.018, 0], [.03, -.012], [.06, -.04], [.088, -.075], [.092, -.08]].map(([x, y]) => new THREE.Vector2(x, y));
  const out = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), std('#4f6b5a', { m: .25, r: .38 })); out.position.set(0, -.02, .15); lamp.add(out);
  const inn = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshStandardMaterial({ color: col('#f4f1ea'), roughness: .35, side: THREE.BackSide, emissive: col('#ffd9a0'), emissiveIntensity: 0 })); inn.position.copy(out.position); inn.scale.setScalar(.97); lamp.add(inn);
  const bm = new THREE.MeshStandardMaterial({ color: col('#fff7e8'), roughness: .1, emissive: col('#ffc77a'), emissiveIntensity: 0, transparent: true, opacity: .92 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.03, 18, 14), bm); bulb.scale.set(1, 1.15, 1); bulb.position.set(0, -.07, .15); lamp.add(bulb);
  const neck = cyl(.014, .02, .03, bm, 12); neck.position.set(0, -.042, .15); lamp.add(neck);
  const light = new THREE.PointLight('#ffcf8f', 0, p.range || 6, 1.5); light.position.set(0, -.11, .2); lamp.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex(), color: col('#ffcf8a'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); glow.position.copy(bulb.position); lamp.add(glow);
  const pool = contactShadow(.9, .9, 0); pool.material.color.set('#ffd9a0'); pool.material.blending = THREE.AdditiveBlending; pool.position.set(0, -(p.y ?? 1.85) + .02, .9); g.add(pool); // warm light pool on the floor
  let cable = null; if (p.cableTo) { const [dx, dy] = p.cableTo, pts = [[0, -.04, .012], [dx * .2, dy * .35, .012], [dx * .55, dy * .6, .014], [dx, dy + .06, .014]].map(v => new THREE.Vector3(...v));
    cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, .004, 6), std('#1e1d1c', { r: .5 })); cable.castShadow = true; g.add(cable); }
  const lit = t => (t >= (p.powerAt ?? Infinity) && dayOn(p.segs, kv(p.dayK, t, .5))) || stepKey(p.onK, t, 0) > 0;
  g.userData.tick = t => { rideTo(g, lamp, p, t, new THREE.Vector3(0, -.02, .05)); if (cable) cable.visible = t >= (p.carry?.[1] ?? 0) + .3;
    let k = 0; for (let i = 0; i < 6; i++) k += lit(t - i * .035) ? 1 : 0; k /= 6; k = k * k * (3 - 2 * k);                                // incandescent warm-up / cool-down
    const fl = 1 + Math.sin(t * 23) * .015 + Math.sin(t * 61) * .01, I = k * fl;
    light.intensity = (p.power || 7) * I; bm.emissiveIntensity = 3.2 * I; inn.material.emissiveIntensity = .35 * I; glow.material.opacity = .6 * I; glow.scale.setScalar(.26 + .03 * I); pool.material.opacity = .16 * I; };
  return g; }
// ---- plug-in mechanical timer on a wall socket: dial with 48 push pins (on-segments pushed, orange), turns once per day with dayK
function coopTimer(p = {}) { const g = new THREE.Group(), tm = new THREE.Group(); g.add(tm);
  const sk = box(.085, .085, .014, std('#ece7dc', { r: .45 })); sk.position.z = .007; g.add(sk);                                 // wall socket stays on the wall
  const body = box(.072, .104, .046, std('#f1ede4', { r: .4 })); body.position.z = .037; tm.add(body);
  const bez = cyl(.037, .037, .006, std('#c9ccce', { r: .35, m: .2 }), 32); bez.rotation.x = Math.PI / 2; bez.position.set(0, -.008, .063); tm.add(bez);
  const dial = new THREE.Group(); dial.position.set(0, -.008, .067); tm.add(dial);
  const face = cyl(.031, .031, .005, std('#dfe2e4', { r: .3 }), 32); face.rotation.x = Math.PI / 2; dial.add(face);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.012, .018, 32), std('#9aa0a4', { r: .4 })); ring.position.z = .0028; dial.add(ring);
  const pinOn = std('#f07a1a', { r: .4 }), pinOff = std('#fbfbf8', { r: .4 }), pins = [];
  for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, on = dayOn(p.segs, k / 48 + .5 / 48), pn = box(.0034, .008, .006, on ? pinOn : pinOff);
    pn.position.set(Math.sin(a) * .0275, Math.cos(a) * .0275, on ? .001 : .004); pn.rotation.z = -a; dial.add(pn); pins.push(pn); }
  const knob = cyl(.009, .01, .012, std('#5d6266', { r: .4 }), 16); knob.rotation.x = Math.PI / 2; knob.position.z = .006; dial.add(knob);
  const grip = box(.003, .016, .004, std('#3f4346')); grip.position.z = .013; dial.add(grip);
  const idx = new THREE.Mesh(new THREE.ConeGeometry(.0045, .009, 3), std('#d4281c', { r: .4 })); idx.rotation.z = Math.PI; idx.position.set(0, .032, .062); tm.add(idx);  // index mark
  const led = new THREE.Mesh(new THREE.SphereGeometry(.003, 8, 6), new THREE.MeshStandardMaterial({ color: col('#ffb38a'), emissive: col('#ff4a1a'), emissiveIntensity: 0 })); led.position.set(.024, .04, .061); tm.add(led);
  g.userData.tick = t => { rideTo(g, tm, p, t, new THREE.Vector3(0, -.01, .03)); const d = kv(p.dayK, t, .5); dial.rotation.z = d * Math.PI * 2;
    led.material.emissiveIntensity = t >= (p.powerAt ?? Infinity) && dayOn(p.segs, d) ? 2.5 : 0; };
  return g; }
// ---- the sun on its day arc, far behind the scene: summer (rise .21, set .79, high, wide) vs winter (.30-.70, low, short); seasonK blends,
// dayK = day clock; sumK/winK = how much of each dotted arc is drawn (0..1), sumOp/winOp = their opacity
function skySun(p = {}) { const g = new THREE.Group(), Z = p.z ?? -40, y0 = p.y0 ?? .5;
  const AR = { s: { rise: .21, set: .79, peak: p.peakS ?? 16, span: p.spanS ?? 12 }, w: { rise: .30, set: .70, peak: p.peakW ?? 6, span: p.spanW ?? 7.5 } };
  const at = (A, u) => new THREE.Vector3(-A.span * Math.cos(Math.PI * u), y0 + A.peak * Math.sin(Math.PI * u), Z);
  const sm = (c, s, o) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex(), color: col(c), transparent: true, opacity: o, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending })); m.scale.setScalar(s); return m; };
  const disc = new THREE.Mesh(new THREE.CircleGeometry(p.r || 1.1, 40), new THREE.MeshBasicMaterial({ color: col('#fff1c8').multiplyScalar(2.2), fog: false, toneMapped: false })); g.add(disc);
  const halo = sm('#ffcf7a', (p.r || 1.1) * 7, .6), halo2 = sm('#ffe9b8', (p.r || 1.1) * 3.2, .9); g.add(halo, halo2);
  const trails = {}; for (const k of ['s', 'w']) { trails[k] = []; for (let i = 0; i <= 44; i++) { const d = sm(k === 's' ? '#ffe7a8' : '#ffc070', .55, 0); d.position.copy(at(AR[k], i / 44)); g.add(d); trails[k].push(d); } }
  g.userData.tick = (t) => { const s = kv(p.seasonK, t, 0), A = {}; for (const f of ['rise', 'set', 'peak', 'span']) A[f] = lerp(AR.s[f], AR.w[f], s);
    const d = fr01(kv(p.dayK, t, .5)), u = (d - A.rise) / (A.set - A.rise), vis = clamp(Math.min(u + .03, 1.03 - u) * 12);
    const P = at(A, clamp(u, -.02, 1.02)); disc.position.copy(P); halo.position.copy(P); halo2.position.copy(P);
    const low = clamp(Math.sin(Math.PI * clamp(u)) * 2); disc.material.color.set(low < 1 ? '#ffb45a' : '#fff1c8').lerp(col('#fff1c8'), low).multiplyScalar(2.2);
    disc.visible = vis > .01; disc.scale.setScalar(Math.max(.001, vis)); LINK.sun = vis > .01 ? P.clone() : null; halo.material.opacity = .6 * vis; halo2.material.opacity = .9 * vis; disc.lookAt(0, P.y, 0);
    for (const k of ['s', 'w']) { const ext = kv(p[k === 's' ? 'sumK' : 'winK'], t, 0), op = kv(p[k === 's' ? 'sumOp' : 'winOp'], t, 1); trails[k].forEach((m, i) => { m.material.opacity = i / 44 <= ext + 1e-3 ? .85 * op : 0; }); } };
  return g; }
// ---- hen walker: track [[t, x, z, act, yaw]]; act idle | peck | rest | preen (walk is automatic between different spots)
function henWalker(p = {}) { const g = new THREE.Group(), mover = new THREE.Group(); g.add(mover);
  const S = (p.height || .4) / 1.43, c = chicken({ seed: p.seed || 3, scale: S }); mover.add(c);
  const U = c.userData, head = U.head, legs = U.legs, body = U.body, neck = U.neck, h0 = head.position.clone(), b0 = body.scale.clone(), n0 = neck.rotation.clone();
  const tail = c.children.find(o => o.isGroup && o.position.z < -.4), tx0 = tail ? tail.rotation.x : 0;
  const sh = contactShadow(.13, .17, .42); g.add(sh); const mats = []; c.traverse(o => { if (o.isMesh && !mats.includes(o.material)) mats.push(o.material); }); const c0 = mats.map(m => m.color.clone());
  const K = (p.track || [[0, 0, 0, 'idle']]).map(k => ({ t: k[0], x: k[1], z: k[2], act: k[3] || 'idle', yaw: k[4] })); let yaw = K[0].yaw ?? 0, cum = 0; const seg = [];
  for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z), mv = len > .02;
    const y1 = mv ? angTo(yaw, Math.atan2(b.x - a.x, b.z - a.z)) : (b.yaw != null ? angTo(yaw, b.yaw) : yaw); seg.push({ a, b, len, mv, cum, y0: yaw, y1 }); cum += len; yaw = y1; }
  const actOf = q => q.mv ? 'walk' : q.a.act, STR = .15, sd = p.seed || 3;
  const state = t => { if (!seg.length || t <= K[0].t) return { x: K[0].x, z: K[0].z, yaw: seg[0]?.y0 ?? yaw, act: K[0].act, prev: K[0].act, t0: -9, dist: 0, sp: 0 };
    const i = seg.findIndex(q => t < q.b.t); if (i < 0) { const q = seg[seg.length - 1]; return { x: q.b.x, z: q.b.z, yaw: q.y1, act: q.b.act, prev: actOf(q), t0: q.b.t, dist: cum, sp: 0 }; }
    const q = seg[i], D = Math.max(.01, q.b.t - q.a.t), u = (t - q.a.t) / D, e = q.mv ? trapE(u, .22) : 0;
    return { x: lerp(q.a.x, q.b.x, e), z: lerp(q.a.z, q.b.z, e), yaw: lerp(q.y0, q.y1, easeIO(u * D / Math.min(D, .3))), act: actOf(q), prev: i ? actOf(seg[i - 1]) : actOf(q), t0: q.a.t, dist: q.cum + q.len * e, sp: q.mv ? q.len / D * trapV(u, .22) : 0 }; };
  const pose = (act, t, st) => { const o = { pitch: 0, hx: 0, hy: 0, hz: 0, hrx: 0, hry: 0, drop: 0, fluff: 0, leg: 1, scr: 0 };
    if (act === 'idle' || act === 'walk') { const per = .75, k = Math.floor((t + sd) / per), f = fr01((t + sd) / per), a0 = (hr(k, sd) - .5) * 1.5, a1 = (hr(k + 1, sd) - .5) * 1.5; // saccades
      o.hry = lerp(a0, a1, clamp((f - .82) / .1)) * (act === 'walk' ? .25 : 1); o.hrx = lerp((hr(k, sd + 1) - .5) * .4, (hr(k + 1, sd + 1) - .5) * .4, clamp((f - .82) / .1)); }
    if (act === 'peck') { const per = 1.2, ph = (t + sd * .37) / per, k = Math.floor(ph), f = fr01(ph), sk = f < .13 ? sEase(f / .13) : f < .24 ? 1 : f < .52 ? 1 - sEase((f - .24) / .28) : 0;
      o.pitch = .42 * sk + .06; o.hy = -.6 * sk; o.hz = .22 * sk; o.hrx = .95 * sk + (f < .24 ? Math.sin(t * 40) * .05 * sk : 0); o.hry = f > .55 ? (hr(k, 5) - .5) * 1.1 : 0;
      if (k % 3 === 0 && f > .56) { const s2 = fr01((f - .56) / .44 * 2); o.scr = Math.sin(s2 * Math.PI); } }                                     // foot scratch every third peck
    if (act === 'rest' || act === 'preen') { o.drop = 1; o.fluff = 1; o.leg = .25; o.hy = -.1; o.hz = -.1; o.hrx = .12 + Math.sin(t * .8) * .03;
      if (act === 'preen') { const per = 2.6, k = Math.floor(t / per), f = fr01(t / per), into = f < .12 ? sEase(f / .12) : f < .72 ? 1 : 1 - sEase((f - .72) / .28), sd2 = k % 2 ? 1 : -1;
        o.hx = .26 * into * sd2; o.hy = -.3 * into; o.hz = -.4 * into; o.hry = 2.1 * into * sd2; o.hrx = .45 * into + Math.sin(t * 21) * .14 * into; o.fluff = 1 + .5 * into; } }
    return o; };
  g.userData.tick = t => { const st = state(t), kb = easeIO((t - st.t0) / .35), A = pose(st.prev, t, st), Bp = pose(st.act, t, st), P = {};
    for (const k in Bp) P[k] = lerp(A[k], Bp[k], kb);
    const ph = st.dist / STR * Math.PI, mvK = clamp(st.sp / .25), u = fr01(st.dist / STR);                                  // walk cycle synced to ground distance
    const stab = (u < .7 ? -u / .7 : -1 + (u - .7) / .3) + .5;                                                               // head holds still, then thrusts
    head.position.set(h0.x + P.hx, h0.y + P.hy + Math.abs(Math.sin(ph)) * .02 * mvK, h0.z + P.hz + stab * STR / S * .85 * mvK); head.rotation.set(P.hrx, P.hry, 0);
    neck.rotation.set(n0.x + P.hz * .6 + P.hy * -.3, n0.y, n0.z - P.hx * 1.2);
    c.rotation.x = P.pitch + .05 * mvK; body.scale.copy(b0).multiplyScalar(1 + .06 * P.fluff + .01 * Math.sin(t * 2.7 + sd));
    legs[0].rotation.x = Math.sin(ph) * .55 * mvK - P.scr * .9; legs[1].rotation.x = -Math.sin(ph) * .55 * mvK; legs.forEach(l => l.scale.y = Math.max(.2, P.leg));
    if (tail) { const f = fr01((t + sd) / 3.3), flick = f < .12 ? Math.sin(f / .12 * Math.PI) : 0; tail.rotation.x = tx0 + .25 * flick + .08 * P.fluff; }
    const bob = Math.abs(Math.sin(ph)) * .008 * mvK; mover.position.set(st.x, -.29 * S * P.drop + bob, st.z); mover.rotation.y = st.yaw; mover.rotation.z = Math.sin(ph) * .05 * mvK;
    sh.position.set(st.x, .014, st.z); sh.rotation.z = -st.yaw;
    if (p.inside) { const [x0, x1, z0, z1] = p.inside, e = .35, ins = clamp(Math.min(st.x - x0, x1 - st.x, st.z - z0, z1 - st.z) / e + .5), k = lerp(1, kv(p.shadeK, t, 1), ins); mats.forEach((m, i) => m.color.copy(c0[i]).multiplyScalar(k)); }
    if (p.link) LINK[p.link] = { pos: new THREE.Vector3(st.x, 0, st.z), head: head.getWorldPosition(new THREE.Vector3()) }; };
  return g; }
Object.assign(ASSETS, { hen_coop: henCoop, coop_floor: coopFloor, nest_row: nestRow, coop_lamp: coopLamp, coop_timer: coopTimer, sky_sun: skySun, hen: henWalker });
// reaching up to a wall (lamp at ~1.85 m) and turning a dial at ~1.25 m (Farmer; tuned with a palm probe, see plans/hens_winter.mjs)
Object.assign(RIG_POSES, { mountUp: { adL: 1.3, adR: 1.3, fL: 2.15, fR: 2.1, eL: .15, eR: .2, sp: 0, hd: -.45 },     // facing the wall from .37 m: palms ~1.67 m high, .27 m forward
  dialSet: { fR: 1.2, eR: .85, adR: 1.25, fL: .1, eL: .2, sp: .08, hd: .15, tw: .1 }, dialTurn: { fR: 1.2, eR: .85, adR: 1.25, fL: .1, eL: .2, sp: .08, hd: .15, tw: .1, shake: .35 }, // right palm ~1.5 m, .3 m right
  lookUp: { hd: -.55, sp: -.06, fL: .15, fR: .15, eL: .3, eR: .3 } });
