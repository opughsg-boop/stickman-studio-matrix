// Blueprint-diorama renderer. Everything is a pure function of time t (seconds) so any
// frame can be rendered independently -> chunked / resumable rendering.
import * as THREE from 'three';

const R = { W: 540, H: 960 };
let renderer, scene, camera, comp, cctx, plan, objects = [], lights = {}, fx = {};
const style = { exposure: 1.0, captionY: 0.74, captionSize: 0.085, shadowRes: 1024, camEase: 0.7, drift: 0.08 };

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
function buildEnvironment(env = {}) {
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
  // island
  const I = env.island || { w: 12, d: 12, depth: 3.2 };
  fx.island = I;
  const geo = new THREE.BoxGeometry(I.w, I.depth, I.d, 24, 1, 24);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 1.3) * .05 + Math.cos(p.getZ(i) * 1.7) * .05);
  geo.computeVertexNormals();
  const side = new THREE.MeshStandardMaterial({ map: TEX.soilSide, roughness: 1 }), top = new THREE.MeshStandardMaterial({ map: TEX.soilTop, roughness: 1 });
  const island = new THREE.Mesh(geo, [side, side, top, side, side, side]);
  island.position.y = -I.depth / 2; island.receiveShadow = true; island.castShadow = true; scene.add(island);
  // lights
  lights.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4636, 1.25); scene.add(lights.hemi);
  lights.sun = new THREE.DirectionalLight(0xfff4e0, 2.6); lights.sun.position.set(-14, 26, 12);
  lights.sun.castShadow = true; lights.sun.shadow.mapSize.set(style.shadowRes, style.shadowRes);
  Object.assign(lights.sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
  lights.sun.shadow.bias = -0.0005; lights.sun.shadow.radius = 4; scene.add(lights.sun);
  lights.heat = new THREE.PointLight(0xff5a1f, 0, 30); lights.heat.position.set(0, 6, 0); scene.add(lights.heat);
}

// ---------- asset library ----------
// Each builder returns THREE.Object3D; optional obj.userData.tick(t, age) for idle animation.
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r1, r2, h, m, s = 16) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), m);
const sph = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m);
const woodMat = () => new THREE.MeshStandardMaterial({ map: TEX.wood, color: col('#c08a58'), roughness: .9 });

function chicken(p = {}) {
  const g = new THREE.Group(), r = rng(p.seed || 1);
  const shade = ['#9a4a1e', '#8a3c16', '#a8582a', '#7a3412'][Math.floor(r() * 4)];
  const body = sph(.5, std(p.color || shade, { r: .95 })); body.scale.set(.8, .78, 1.05); body.position.y = .62; g.add(body);
  const wing = sph(.36, std('#6a2a0e')); wing.scale.set(.25, .6, 1); wing.position.set(.36, .66, 0); g.add(wing);
  const w2 = wing.clone(); w2.position.x = -.36; g.add(w2);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.22, .55, 10), std('#3a1a0a')); tail.position.set(0, .95, -.45); tail.rotation.x = -.9; g.add(tail);
  const head = new THREE.Group(); head.position.set(0, 1.0, .42); g.add(head);
  head.add(sph(.2, std(shade)));
  const comb = sph(.09, std('#d4231d')); comb.scale.set(.6, 1.2, 1.6); comb.position.set(0, .2, .02); head.add(comb);
  const wat = sph(.06, std('#d4231d')); wat.position.set(0, -.13, .12); head.add(wat);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 8), std('#e3b23c')); beak.rotation.x = Math.PI / 2; beak.position.set(0, -.02, .23); head.add(beak);
  for (const s of [-1, 1]) { const e = sph(.035, std('#111', { r: .3 })); e.position.set(s * .13, .05, .12); head.add(e);
    const leg = cyl(.03, .03, .32, std('#e0b040')); leg.position.set(s * .14, .16, .05); g.add(leg); }
  g.scale.setScalar(p.scale || .7);
  g.userData.head = head;
  return shadowed(g);
}
function flock(p = {}) {
  const g = new THREE.Group(), n = p.count || 8, r = rng(p.seed || 4), area = p.area || [8, 8];
  const birds = [];
  for (let i = 0; i < n; i++) {
    const c = chicken({ seed: i + 1 + (p.seed || 0), scale: p.scale });
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
      b.o.position.set(x, y, z); b.o.rotation.y = face ?? 0;
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
  for (const x of [-len / 2, len / 2]) for (const z of [-.5, .5]) { const l = post({ h, t: .12 }); l.position.set(x, 0, z); g.add(l); }
  for (let i = 0; i < rows; i++) { const b = cyl(.07, .07, len + .2, woodMat()); b.rotation.z = Math.PI / 2; b.position.set(0, h, (i - (rows - 1) / 2) * .7); g.add(b); }
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
function sign(p = {}) { // flat billboard text
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
  if (p.label) { const s = sign({ text: p.label, scale: .7, y: 0 }); s.position.copy(g.position).add(new THREE.Vector3(0, (p.labelUp ?? .3), .6)); wrap.add(s); }
  return wrap; }
function heat(p = {}) { const g = new THREE.Group(); // shimmering red-orange haze volume
  const m = new THREE.Mesh(new THREE.BoxGeometry(p.w || 8, p.h || 3, p.d || 7), new THREE.MeshBasicMaterial({ color: '#ff4a1a', transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.y = (p.h || 3) / 2; g.add(m);
  g.userData.tick = t => { m.material.opacity = .16 + Math.sin(t * 4) * .06; }; return g; }
function dirt(p = {}) { const g = new THREE.Group(), r = rng(p.seed || 2), n = p.count || 30;
  for (let i = 0; i < n; i++) { const d = sph(.03 + r() * .035, std(p.color || '#e9e4d6')); d.scale.y = .4; d.position.set((r() - .5) * (p.w || 4), .03 + (p.y || 0), (r() - .5) * (p.d || 1.5)); g.add(d); } return g; }
function custom(p = {}) { // composition of primitives generated by the planner (LLM can invent new assets)
  const g = new THREE.Group();
  for (const part of p.parts || []) {
    const m = std(part.color || '#999', { m: part.metal || 0, r: part.rough ?? .8 }); let mesh; const s = part.size || [1, 1, 1];
    if (part.shape === 'sphere') mesh = sph(s[0] / 2, m); else if (part.shape === 'cylinder') mesh = cyl(s[0] / 2, (s[2] ?? s[0]) / 2, s[1], m);
    else if (part.shape === 'cone') mesh = new THREE.Mesh(new THREE.ConeGeometry(s[0] / 2, s[1], 18), m); else mesh = box(s[0], s[1], s[2], m);
    if (part.shape === 'sphere' && s[1]) mesh.scale.set(1, s[1] / s[0], (s[2] || s[0]) / s[0]);
    mesh.position.set(...(part.pos || [0, s[1] / 2, 0])); if (part.rot) mesh.rotation.set(...part.rot); g.add(mesh);
  }
  return shadowed(g); }

export const ASSETS = { chicken, flock, post, beam, frame, roof, mesh_wall: meshWall, wall: wallSolid, perch, board, feeder, waterer,
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
  if (i > 0 && (beats[i].camera?.cut !== true)) {
    const k = easeIO((t - beats[i].start) / style.camEase);
    if (k < 1) { const prev = camState(beats[i - 1], beats[i].start);
      cur = { dist: lerp(prev.dist, cur.dist, k), elev: lerp(prev.elev, cur.elev, k), az: lerp(prev.az, cur.az, k), target: prev.target.clone().lerp(cur.target, k) }; }
  }
  const { dist, elev, az, target } = cur;
  camera.position.set(target.x + Math.sin(az) * Math.cos(elev) * dist, target.y + Math.sin(elev) * dist, target.z + Math.cos(az) * Math.cos(elev) * dist);
  const sh = shakeAt(t) * dist * .05;
  if (sh) camera.position.add(new THREE.Vector3(Math.sin(t * 91) * sh, Math.sin(t * 73 + 1) * sh, Math.cos(t * 67) * sh));
  camera.lookAt(target);
  return i;
}

// ---------- effects per beat ----------
function updateEffects(t, bi) {
  const fxs = new Set(plan.beats[bi].effects || []);
  const night = fxs.has('night') ? 1 : 0, hot = fxs.has('heat') ? 1 : 0;
  fx.nightK = lerp(fx.nightK ?? 0, night, .15); if (Math.abs(fx.nightK - night) < .02) fx.nightK = night;
  fx.nightK = night; // deterministic (no smoothing state across chunks)
  lights.sun.intensity = 2.6 * (1 - .45 * fx.nightK) * style.exposure;
  lights.hemi.intensity = 1.25 * (1 + .1 * fx.nightK) * style.exposure;
  lights.hemi.color.set(fx.nightK ? 0x6f86c9 : 0xcfe3ff);
  scene.background.set(fx.nightK ? '#24427a' : (plan.env?.bg || '#3d7fd0')); scene.fog.color.copy(scene.background);
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
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(R.W, R.H); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05 * style.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  comp = document.createElement('canvas'); comp.width = R.W; comp.height = R.H; cctx = comp.getContext('2d');
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(p.fov || 42, R.W / R.H, .1, 400);
  makeTextures(); buildEnvironment(p.env || {}); instantiate();
  await document.fonts.load('italic 800 40px Cap'); await document.fonts.load('40px CapAr');
  return { objects: objects.length, beats: p.beats.length };
};
window.renderAt = (t, q = .9) => {
  const bi = updateCamera(t); updateEffects(t, bi); updateObjects(t);
  renderer.render(scene, camera);
  cctx.drawImage(renderer.domElement, 0, 0);
  drawOverlay(t, bi);
  const fa = fadeAlpha(t); if (fa > 0) { cctx.fillStyle = `rgba(0,0,0,${fa})`; cctx.fillRect(0, 0, comp.width, comp.height); }
  drawCaption(t);
  return comp.toDataURL('image/jpeg', q).slice(23);
};
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
  for (let i = 0; i < n; i++) { const b = beeMesh(false); g.add(b); list.push({ b, ph: r() * 6.28, sp: .8 + r() * 1.2, rad: .4 + r(), hy: r() }); }
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
