// Deterministic three.js diorama: window.setup(spec) then window.renderAt(t). Style: floating terrain block over a
// blue grid studio, smooth keyframed camera, objects popping in on cue. Uses three.js primitives only.
import * as THREE from 'three';

const ease = t => t * t * (3 - 2 * t);
const backOut = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const rnd = s => { let x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
let R, scene, cam, spec, items = [];

function gridTexture(size = 1024, cells = 16) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  g.fillStyle = '#2f7fd0'; g.fillRect(0, 0, size, size); g.strokeStyle = 'rgba(235,245,255,.85)'; g.lineWidth = 3;
  for (let i = 0; i <= cells; i++) { const p = i * size / cells; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.moveTo(0, p); g.lineTo(size, p); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...o });
const ell = (r, sx, sy, sz, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };

function penguin(tint) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const black = M(0x15181f, { roughness: .35 }), white = M(0xf4f4f8), org = M(0xffa028), yel = M(0xffc83c);
  const b = ell(.5, 1, 1.5, .85, tint ? M(tint) : black); b.position.y = .75; body.add(b);
  const bel = ell(.5, .78, 1.3, .6, white); bel.position.set(0, .72, .2); body.add(bel);
  const head = ell(.3, 1, 1, 1, black); head.position.y = 1.62; body.add(head);
  const nk = ell(.2, 1, .8, .9, yel); nk.position.set(0, 1.38, .12); body.add(nk);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.07, .26, 12), org); beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.58, .34); body.add(beak);
  for (const s of [-1, 1]) {
    const e = ell(.045, 1, 1, 1, M(0xffffff)); e.position.set(s * .11, 1.68, .27); body.add(e);
    const p = ell(.022, 1, 1, 1, M(0x000000)); p.position.set(s * .11, 1.68, .31); body.add(p);
    const f = ell(.14, .45, 1.6, .7, tint ? M(tint) : black); f.position.set(s * .5, .85, 0); f.rotation.z = s * -.35; f.userData.side = s; body.add(f); (g.userData.fl ||= []).push(f);
    const ft = ell(.2, 1, .28, 1.4, org); ft.position.set(s * .2, .04, .12); body.add(ft);
  }
  g.userData.body = body; return g;
}
function chicken() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const red = M(0xb5561c), cr = M(0xd02020), yel = M(0xf2b020);
  const b = ell(.5, .8, .8, 1.1, red); b.position.y = .6; body.add(b);
  const h = ell(.22, 1, 1, 1, red); h.position.set(0, 1.05, .45); body.add(h);
  const c = ell(.1, .4, 1, 1, cr); c.position.set(0, 1.28, .45); body.add(c);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 10), yel); bk.rotation.x = Math.PI / 2; bk.position.set(0, 1.03, .68); body.add(bk);
  const t = ell(.25, .3, 1, .8, M(0x6b2e0e)); t.position.set(0, .8, -.55); t.rotation.x = -.5; body.add(t);
  g.userData.body = body; return g;
}
function mkObject(o) {
  switch (o.kind) {
    case 'penguin': return penguin(o.tint);
    case 'chicken': return chicken();
    case 'egg': { const e = ell(.16, 1, 1.3, 1, M(0xfaf6e8, { roughness: .3 })); return e; }
    case 'box': { const m = new THREE.Mesh(new THREE.BoxGeometry(...o.size), M(o.color || 0xc08040, o.opacity ? { transparent: true, opacity: o.opacity } : {})); m.castShadow = m.receiveShadow = true; return m; }
    case 'plant': { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const l = ell(.12, 1, 1.8, .3, M(0x58c040)); l.position.y = .15; l.rotation.y = i * 1.57; l.rotation.z = .5; g.add(l); } return g; }
    case 'label': { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
      g.font = '900 150px Bebas Neue, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.strokeStyle = '#fff'; g.fillStyle = o.color || '#ff3b3b';
      g.strokeText(o.text, 256, 128); g.fillText(o.text, 256, 128);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); s.scale.set(o.w || 6, (o.w || 6) / 2, 1); s.renderOrder = 10; return s; }
  }
}

window.setup = async (sp) => {
  spec = sp; const W = sp.width, H = sp.height;
  R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(W, H); R.setPixelRatio(1);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(R.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x1f74c9); scene.fog = new THREE.Fog(0x2a82d6, 60, 140);
  cam = new THREE.PerspectiveCamera(sp.fov || 38, W / H, .1, 300);
  // grid floor + soft light beams (studio look of the reference)
  const gt = gridTexture(); gt.repeat.set(24, 24);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: gt, roughness: .8 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -sp.block.h; fl.receiveShadow = true; scene.add(fl);
  for (const [x, w, a] of [[-18, 14, .13], [4, 22, .09], [26, 12, .1]]) { const bm = new THREE.Mesh(new THREE.PlaneGeometry(w, 120), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); bm.position.set(x, 20, -45); bm.rotation.z = -.35; scene.add(bm); }
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x4a6a90, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(-14, 26, 16); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 }); sun.shadow.bias = -.0004; scene.add(sun);
  // terrain block (top + layered side)
  const B = sp.block, top = M(B.top || 0xc9dded, { roughness: .9 }), side = M(B.side || 0x8fb8d8, { roughness: .9 });
  const blk = new THREE.Mesh(new THREE.BoxGeometry(B.w, B.h, B.d), [side, side, top, side, side, side]); blk.position.y = -B.h / 2; blk.receiveShadow = blk.castShadow = true; scene.add(blk);
  for (let i = 0; i < 2; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(B.w + .02, B.h * .35, B.d + .02), M(i ? 0x6f9cc4 : 0xa9cde8)); l.position.y = -B.h * (i ? .85 : .55); scene.add(l); }
  // snow particles
  if (sp.snow) { const n = 400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i*3] = (rnd(i) - .5) * 50; p[i*3+1] = rnd(i + 99) * 24; p[i*3+2] = (rnd(i + 7) - .5) * 50; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: .16, transparent: true, opacity: .0 })); pts.userData.base = p; scene.add(pts); window._snow = pts; }
  for (const o of sp.objects) { const m = mkObject(o); if (!m) continue; m.visible = false; scene.add(m); items.push({ o, m, k: o.kind }); }
  await document.fonts.load('150px "Bebas Neue"').catch(() => {});
};

const pose = (o, t) => {            // position/orbit/path of one object at time t
  let [x, z] = o.pos, y = o.y || 0;
  if (o.orbit && t > (o.orbit.from || 0)) { const a = (t - (o.orbit.from || 0)) * o.orbit.speed, [cx, cz] = o.orbit.center, dx = x - cx, dz = z - cz;
    x = cx + dx * Math.cos(a) - dz * Math.sin(a); z = cz + dx * Math.sin(a) + dz * Math.cos(a); }
  if (o.path) { const P = o.path; let i = 0; while (i < P.length - 1 && t > P[i + 1].t) i++; const a = P[i], b = P[Math.min(i + 1, P.length - 1)];
    const u = b.t > a.t ? ease(Math.min(Math.max((t - a.t) / (b.t - a.t), 0), 1)) : 1; x = a.pos[0] + (b.pos[0] - a.pos[0]) * u; z = a.pos[1] + (b.pos[1] - a.pos[1]) * u; }
  return [x, y, z];
};

window.renderAt = (t) => {
  for (const it of items) {
    const { o, m } = it, age = t - o.t0, life = o.t1 ?? 1e9;
    if (age < 0 || t > life) { m.visible = false; continue; } m.visible = true;
    const s = (o.scale || 1) * backOut(Math.min(age / .35, 1)); if (it.k === 'label') m.scale.set((o.w || 6) * Math.max(s, .0001), (o.w || 6) / 2 * Math.max(s, .0001), 1); else m.scale.setScalar(Math.max(s, .0001));
    const [x, y, z] = pose(o, t), [px, , pz] = pose(o, t - .05), mv = Math.hypot(x - px, z - pz) > 1e-4;
    m.position.set(x, y + (o.lift || 0), z);
    if (it.k === 'penguin' || it.k === 'chicken') {
      const ph = (o.phase || 0), moving = mv || o.idle !== false;
      m.rotation.y = mv ? Math.atan2(x - px, z - pz) : (o.face || 0);
      const wob = moving ? Math.sin(t * 7 + ph) : 0; m.userData.body.rotation.z = wob * .07; m.userData.body.position.y = Math.abs(wob) * .05;
      if (m.userData.fl) for (const f of m.userData.fl) f.rotation.z = f.userData.side * (-.35 - .15 * Math.sin(t * 7 + ph));
    }
    if (it.k === 'label') m.position.y = y + Math.sin(t * 3) * .1;
  }
  if (window._snow) { const p = window._snow, a = p.geometry.attributes.position, b = p.userData.base; p.material.opacity = spec.snow.from <= t ? Math.min((t - spec.snow.from) * 1.5, .9) : 0;
    for (let i = 0; i < a.count; i++) { a.array[i*3+1] = ((b[i*3+1] - t * 3) % 24 + 24) % 24; a.array[i*3] = b[i*3] + Math.sin(t + i) * .4; } a.needsUpdate = true; }
  // camera keyframes
  const K = spec.camera; let i = 0; while (i < K.length - 1 && t > K[i + 1].t) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)], u = b.t > a.t ? ease(Math.min(Math.max((t - a.t) / (b.t - a.t), 0), 1)) : 1;
  const L = (p, q) => p.map((v, j) => v + (q[j] - v) * u);
  cam.position.set(...L(a.pos, b.pos)); cam.lookAt(...L(a.look, b.look));
  if (spec.shake && spec.shake.t0 <= t && t <= spec.shake.t1) cam.position.x += Math.sin(t * 40) * .05, cam.position.y += Math.cos(t * 33) * .05;
  R.render(scene, cam);
};
