// "Glossy toy" look for the cine engine (reference: quit-smoking body explainer).
// Sets: 'sunset' (warm wood-plank floor under a purple-to-orange sky), 'flat' (one deep colour + fog, for micro scenes).
// Props: glossy clear-coated objects built from primitives: tissuebox, pollen, dust, lining (nose lining with cilia),
// brain, lungs. Everything is a pure function of time (userData.tick(lt)) so chunked rendering stays exact.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeIO = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
function rnd(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// glossy vinyl / candy look: base colour + clear coat (the reference objects all have a sharp white highlight)
export function gloss(color, o = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: o.rough ?? .32, metalness: 0, clearcoat: o.coat ?? 1, clearcoatRoughness: o.coatRough ?? .08,
    sheen: o.sheen ?? 0, sheenColor: new THREE.Color(o.sheenColor || '#ffffff'), emissive: new THREE.Color(o.emissive || '#000000'), emissiveIntensity: o.glow ?? 0,
    side: o.side ?? THREE.FrontSide, transparent: o.opacity != null, opacity: o.opacity ?? 1 });
}

// ---------- realism layer (procedural detail maps, cached) ----------
const _tex = {};
function canvasTex(key, size, draw, srgb) { if (_tex[key]) return _tex[key];
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size, rnd(key.length * 977 + key.charCodeAt(0)));
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return _tex[key] = t; }
const grey = (v, a) => `rgba(${v},${v},${v},${a})`;
const poreBump = () => canvasTex('pores', 512, (g, S, r) => { g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { g.fillStyle = grey(40, .2 + r() * .35); g.beginPath(); g.arc(r() * S, r() * S, .6 + r() * 1.3, 0, 7); g.fill(); }
  for (let i = 0; i < 5000; i++) { g.fillStyle = grey(210, r() * .18); g.fillRect(r() * S, r() * S, 2, 2); } });
const fabricBump = () => canvasTex('fabric', 512, (g, S, r) => { g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 4) { g.fillStyle = grey(y % 8 ? 70 : 185, .35); g.fillRect(0, y, S, 2); }
  for (let x = 0; x < S; x += 4) { g.fillStyle = grey(x % 8 ? 185 : 70, .25); g.fillRect(x, 0, 2, S); }
  for (let i = 0; i < 16; i++) { const x = r() * S, w = 18 + r() * 60, gr = g.createLinearGradient(x - w, 0, x + w, 0); // soft folds
    gr.addColorStop(0, grey(128, 0)); gr.addColorStop(.5, grey(r() < .5 ? 25 : 230, .4)); gr.addColorStop(1, grey(128, 0));
    g.save(); g.translate(S / 2, S / 2); g.rotate(-.35 + r() * .7); g.translate(-S / 2, -S / 2); g.fillStyle = gr; g.fillRect(x - w, -S, 2 * w, 3 * S); g.restore(); } });
const veinMap = (base, vein) => canvasTex('vein' + base + vein, 1024, (g, S, r) => { g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) { g.fillStyle = r() < .5 ? `rgba(110,30,45,${r() * .09})` : `rgba(255,215,205,${r() * .08})`; g.beginPath(); g.arc(r() * S, r() * S, 4 + r() * 30, 0, 7); g.fill(); }
  const br = (x, y, a, w, d) => { if (d > 6 || w < .35) return; const L = 30 + r() * 60; g.strokeStyle = vein; g.globalAlpha = .2 + .35 * w / 3; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 6; s++) { a += (r() - .5) * .6; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6; g.lineTo(x, y); } g.stroke(); br(x, y, a - .4 - r() * .4, w * .7, d + 1); br(x, y, a + .4 + r() * .4, w * .7, d + 1); };
  for (let i = 0; i < 28; i++) br(r() * S, r() * S, r() * 6.28, 2.4 + r() * 1.6, 0); g.globalAlpha = 1; }, true);
const rep = (t, n) => { const c = t.clone(); c.repeat.set(n, n); c.needsUpdate = true; return c; };
// physical-but-still-toy materials: skin (pores + warm subsurface-like sheen), fabric (weave + folds), wet organ (veins + wet coat), bone
export function realMat(kind, color, o = {}) {
  if (kind === 'skin') return new THREE.MeshPhysicalMaterial({ color, roughness: .52, clearcoat: .1, clearcoatRoughness: .45, sheen: .7, sheenRoughness: .45, sheenColor: new THREE.Color('#ff8f70'),
    emissive: new THREE.Color('#5a1408'), emissiveIntensity: .18, bumpMap: rep(poreBump(), o.rep || 5), bumpScale: o.bump ?? .6 });
  if (kind === 'fabric') return new THREE.MeshPhysicalMaterial({ color, roughness: .86, sheen: .8, sheenRoughness: .6, sheenColor: new THREE.Color(o.sheen || '#a9c8ff'), bumpMap: rep(fabricBump(), o.rep || 3), bumpScale: o.bump ?? 1.2 });
  if (kind === 'organ') { const m = veinMap(color, o.vein || '#6e1630');
    return new THREE.MeshPhysicalMaterial({ map: rep(m, o.rep || 1.5), bumpMap: rep(m, o.rep || 1.5), bumpScale: o.bump ?? .5, roughness: .38, clearcoat: .75, clearcoatRoughness: .12, sheen: .3, sheenColor: new THREE.Color('#ffb0b8'),
      emissive: new THREE.Color(o.emissive || '#000000'), emissiveIntensity: 0, transparent: o.opacity != null, opacity: o.opacity ?? 1 }); }
  if (kind === 'bone') return new THREE.MeshPhysicalMaterial({ color, roughness: .5, clearcoat: .35, clearcoatRoughness: .3, bumpMap: rep(poreBump(), 3), bumpScale: .25 });
  return gloss(color, o);
}

// ---------- sets ----------
function skyDome(stops) { // stops: [[elevation (-1..1 of view dir y), colour], ...] ascending
  const n = stops.length, m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { cs: { value: stops.map(s => new THREE.Color(s[1])) }, ks: { value: stops.map(s => s[0]) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 cs[${n}]; uniform float ks[${n}]; varying vec3 p; void main(){ vec3 c = cs[0];
      for (int i = 1; i < ${n}; i++) c = mix(c, cs[i], smoothstep(ks[i-1], ks[i], p.y)); gl_FragColor = vec4(c, 1.); }` });
  return new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), m);
}
function woodTexture(seed = 7, real = false) { // warm varnished planks, 8 rows per tile, staggered joints, grain lines (real: + fine grain and knots)
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'), r = rnd(seed), rows = 8, rh = 1024 / rows;
  const tones = ['#c27a3e', '#b36c33', '#cf8a49', '#a9622d', '#bd7539', '#c98245'];
  for (let i = 0; i < rows; i++) {
    let x = -r() * 400;
    while (x < 1024) { const L = 380 + r() * 420; g.fillStyle = tones[Math.floor(r() * tones.length)]; g.fillRect(x, i * rh, L, rh);
      for (let k = 0; k < 16; k++) { g.strokeStyle = `rgba(${r() < .5 ? '90,45,15' : '235,170,110'},${.06 + r() * .1})`; g.lineWidth = 1 + r() * 2.5; g.beginPath();
        const y0 = i * rh + r() * rh; g.moveTo(x, y0); for (let s = 0; s <= 8; s++) g.lineTo(x + L * s / 8, y0 + Math.sin(s * 1.3 + k) * 3 * r()); g.stroke(); }
      g.fillStyle = 'rgba(60,30,12,.55)'; g.fillRect(x, i * rh, 3, rh); x += L; }
    g.fillStyle = 'rgba(55,28,10,.6)'; g.fillRect(0, i * rh, 1024, 3);
  }
  if (real) { const q = rnd(seed + 101); // fine wavy grain lines + a few knots with grain flowing around them
    for (let i = 0; i < 1400; i++) { const y0 = q() * 1024, x0 = q() * 1024, L = 80 + q() * 300; g.strokeStyle = `rgba(${q() < .6 ? '80,38,12' : '240,180,120'},${.05 + q() * .09})`; g.lineWidth = .5 + q() * 1.2;
      g.beginPath(); g.moveTo(x0, y0); for (let s = 1; s <= 10; s++) g.lineTo(x0 + L * s / 10, y0 + Math.sin(s * .9 + i) * 1.6); g.stroke(); }
    for (let i = 0; i < 9; i++) { const x = q() * 1024, y = q() * 1024; for (let k = 6; k > 0; k--) { g.strokeStyle = `rgba(70,32,10,${.12 + .05 * k})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 4 + k * 5, 2 + k * 2, 0, 0, 7); g.stroke(); } }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export const SUNSET = [[-1, '#f2a46a'], [0, '#ffb070'], [.025, '#f06a45'], [.08, '#c23a5e'], [.18, '#6a2a78'], [.38, '#2a2560']];
// returns true when the set type was handled here
export function refSet(scene, s) {
  if (s.type === 'sunset') {
    scene.add(skyDome(s.sky || SUNSET));
    const tex = woodTexture(s.seed || 7, s.real), rep = s.floorSize || 60; tex.repeat.set(rep / (s.tile || 1), rep / (s.tile || 1));
    const fm = s.real ? { map: tex, bumpMap: tex, bumpScale: 1.5, roughness: .58, clearcoat: .35, clearcoatRoughness: .38, specularIntensity: .5 } : { map: tex, roughness: .42, clearcoat: .55, clearcoatRoughness: .25 };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(rep, rep), new THREE.MeshPhysicalMaterial(fm));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    scene.fog = new THREE.Fog(s.fogColor || '#f59a62', s.fogNear ?? 2.5, s.fogFar ?? 14);
    return true;
  }
  if (s.type === 'flat') { const c = new THREE.Color(s.color || '#8e0f1c'); scene.background = c; scene.fog = new THREE.Fog(c, s.fogNear ?? 3, s.fogFar ?? 9); return true; }
  return false;
}

// ---------- props ----------
function fib(n) { const out = [], ga = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y); out.push(new THREE.Vector3(Math.cos(ga * i) * r, y, Math.sin(ga * i) * r)); } return out; }
function displace(geo, f) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v, i); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); return geo; }

export const REF_PROPS = {
  // tissue box (real ~24 x 11 x 12 cm) with a fluttering tissue
  tissuebox: p => { const g = new THREE.Group(), W = .24, Hh = .11, D = .12;
    const body = new THREE.Mesh(new RoundedBoxGeometry(W, Hh, D, 4, .012), gloss(p.color || '#1c64c8')); body.position.y = Hh / 2; g.add(body);
    const band = new THREE.Mesh(new RoundedBoxGeometry(W + .002, .022, D + .002, 3, .008), gloss(p.band || '#9fdcff')); band.position.y = Hh * .42; g.add(band);
    const slot = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: '#10284a', roughness: .8 })); slot.scale.set(.07, .025, 1); slot.rotation.x = -Math.PI / 2; slot.position.y = Hh + .0015; g.add(slot);
    const tg = new THREE.PlaneGeometry(.12, .12, 18, 18), base = tg.attributes.position.array.slice();
    const tissue = new THREE.Mesh(tg, new THREE.MeshPhysicalMaterial({ color: '#fbfbf7', roughness: .75, sheen: 1, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide }));
    tissue.position.y = Hh + .055; g.add(tissue);
    g.userData.tick = lt => { const a = tg.attributes.position;
      for (let i = 0; i < a.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], h = (y + .06) / .12; // h 0 at slot, 1 at tip
        const pleat = .012 * Math.sin(x * 70) * (1 - h * .4), sway = .02 * h * h * Math.sin(lt * 2.2 + x * 9), pinch = 1 - .55 * (1 - h) * (1 - h);
        a.setXYZ(i, x * pinch, y + .004 * Math.sin(lt * 3 + x * 30) * h, pleat + sway + .03 * h * h); }
      a.needsUpdate = true; tg.computeVertexNormals(); };
    return g; },
  // pollen grain: glossy yellow ball covered in spines (real 20-40 um)
  pollen: p => { const g = new THREE.Group(), r = p.r || .15, m = gloss(p.color || '#f2b51d', { rough: .35 });
    g.add(new THREE.Mesh(displace(new THREE.IcosahedronGeometry(r, 5), v => v.multiplyScalar(1 + .03 * Math.sin(v.x * 60) * Math.sin(v.y * 60) * Math.sin(v.z * 60))), m));
    const pts = fib(p.spines || 90), cone = new THREE.ConeGeometry(r * .09, r * .32, 8); cone.translate(0, r * .16, 0);
    const im = new THREE.InstancedMesh(cone, m, pts.length), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), M = new THREE.Matrix4();
    pts.forEach((d, i) => { q.setFromUnitVectors(up, d); M.compose(d.clone().multiplyScalar(r * .96), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, M); }); g.add(im);
    return g; },
  // dust speck: lumpy grey-brown grain
  dust: p => { const r = p.r || .08, s = rnd(p.seed || 5), k = [s() * 9, s() * 9, s() * 9];
    return new THREE.Mesh(displace(new THREE.IcosahedronGeometry(r, 3), v => v.multiplyScalar(1 + .28 * Math.sin(v.x / r * 2.1 + k[0]) * Math.cos(v.y / r * 1.7 + k[1]) + .12 * Math.sin(v.z / r * 5 + k[2]))),
      gloss(p.color || '#8f8172', { rough: .65, coat: .3 })); },
  // nose lining seen under a microscope: wet pink cells + a carpet of beating cilia (1 unit = 100 um)
  lining: p => { const g = new THREE.Group(), S = p.size || 6, hgt = (x, z) => .14 * Math.sin(x * 1.1 + .4) * Math.cos(z * .9) + .02 * Math.pow(Math.sin(x * 15 + Math.sin(z * 7)) * Math.sin(z * 15 + Math.sin(x * 6)), 2);
    const geo = displace(new THREE.PlaneGeometry(S, S, 220, 220).rotateX(-Math.PI / 2), v => { v.y = hgt(v.x, v.z); });
    g.add(new THREE.Mesh(geo, gloss(p.color || '#e0566b', { rough: .3, coat: 1, coatRough: .04 })));
    const n = p.cilia || 2800, R = rnd(11), cyl = new THREE.CylinderGeometry(.007, .01, .065, 6); cyl.translate(0, .032, 0);
    const im = new THREE.InstancedMesh(cyl, gloss(p.cilColor || '#f08a9a', { rough: .4, coat: .5 }), n), base = [];
    for (let i = 0; i < n; i++) { const x = (R() - .5) * S * .8, z = (R() - .5) * S * .8; base.push([x, hgt(x, z), z, R() * .4]); }
    const M = new THREE.Matrix4(), E = new THREE.Euler(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3(1, 1, 1);
    g.userData.tick = lt => { base.forEach(([x, y, z, j], i) => { E.set(.45 * Math.sin(lt * 7 - x * 3 - z * 1.5) , j * 8, .1 * Math.cos(lt * 5 + z * 2)); Q.setFromEuler(E); P.set(x, y, z); M.compose(P, Q, Sc); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
    g.userData.tick(0); g.add(im); return g; },
  // brain (real ~16.7 x 14 x 9.3 cm): hemispheres with a maze of folds, cerebellum, brain stem; flashes at p.flashAt
  brain: p => { const g = new THREE.Group(), m = p.real ? realMat('organ', '#d68c90', { vein: '#8a2c42', emissive: '#ff3b5c', rep: 2 }) : gloss(p.color || '#ea6a82', { rough: .3, emissive: '#ff3b5c' });
    const L = .083, Wd = .07, Ht = .052, F = 26;
    const cortex = displace(new THREE.SphereGeometry(1, 160, 120), v => { const n = v.clone();
      const f = Math.sin(n.x * F * .55 + 1.6 * Math.sin(n.y * F * .5)) + Math.sin(n.y * F * .55 + 1.6 * Math.sin(n.z * F * .5)) + Math.sin(n.z * F * .55 + 1.6 * Math.sin(n.x * F * .5));
      let d = 1 - .055 * Math.exp(-(f * f) / .09); // narrow grooves along the zero set = sulci
      d -= .28 * Math.exp(-(n.x * n.x) / .004) * clamp((n.y + .2) * 2); // longitudinal fissure between hemispheres
      const flat = n.y < -.35 ? (n.y + .35) * .45 : 0; v.copy(n).multiplyScalar(d); v.x *= Wd; v.y = (v.y - flat) * Ht; v.z *= L; });
    const cx = new THREE.Mesh(cortex, m); g.add(cx);
    const cb = new THREE.Mesh(displace(new THREE.SphereGeometry(1, 80, 60), v => { const d = 1 - .05 * Math.exp(-Math.pow(Math.sin(v.y * 28), 2) / .05); v.multiplyScalar(d); v.x *= .045; v.y *= .022; v.z *= .03; }), m);
    cb.position.set(0, -.036, -.052); g.add(cb);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .009, .06, 24), m); stem.position.set(0, -.058, -.03); stem.rotation.x = .35; g.add(stem);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.1, .003, 8, 96), new THREE.MeshBasicMaterial({ color: p.ringColor || '#7ff3ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2; g.add(ring);
    const fa = p.flashAt ?? 1e9;
    g.userData.tick = lt => { const u = lt - fa; // anticipation squash, then pop + glow + shock ring
      const pre = u > -.25 && u < 0 ? -.05 * Math.sin((u + .25) / .25 * Math.PI / 2) : 0, post = u >= 0 ? .09 * Math.exp(-u * 4) * Math.cos(u * 18) : 0;
      const s = 1 + pre + post + (p.pulse || 0) * Math.sin(lt * 4.2); cx.scale.set(1 - post * .5 + (p.pulse || 0) * Math.sin(lt * 4.2), s, 1 - post * .5);
      m.emissiveIntensity = u >= 0 ? .9 * Math.exp(-u * 2.5) : 0;
      const rk = clamp(u / .9); ring.scale.setScalar(.5 + rk * 2.2); ring.material.opacity = u >= 0 && u < .9 ? .9 * (1 - rk) : 0; };
    return g; },
  // lungs (real ~25 cm tall) + trachea with cartilage rings + larynx valve; inhale at p.inhale=[t0,t1], snap shut at p.shutAt
  lungs: p => { const g = new THREE.Group(), m = p.real ? realMat('organ', '#cf6a72', { vein: '#7a1a35' }) : gloss(p.color || '#e3566f', { rough: .3 }), lobes = [];
    for (const side of [-1, 1]) { const geo = displace(new THREE.SphereGeometry(1, 96, 72), v => { const h = (v.y + 1) / 2; // 0 base .. 1 apex
        const w = .62 + .5 * (1 - h); v.x *= w; v.z *= w; // broad base on the diaphragm, narrow apex
        if (v.x * side < 0) v.x *= .42; if (v.y < -.75) v.y = -.75 + (v.y + .75) * .25;
        v.x += .06 * Math.sin(v.y * 9 + side) * Math.max(0, -v.y); v.x *= side > 0 ? .072 : .066; v.y *= .125; v.z *= .085; });
      const lobe = new THREE.Mesh(geo, m); lobe.position.set(side * .062, 0, 0); g.add(lobe); lobes.push(lobe); }
    const ringM = p.real ? realMat('bone', '#ecd2cf') : gloss(p.ringColor || '#f7c6cf', { rough: .4 }), tube = p.real ? realMat('organ', '#d99aa4', { rep: 3 }) : gloss(p.tubeColor || '#e8a0ae', { rough: .4 });
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .12, 28), tube); tr.position.y = .145; g.add(tr);
    for (let i = 0; i < 8; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(.0105, .0022, 10, 32), ringM); rr.rotation.x = Math.PI / 2; rr.position.y = .1 + i * .012; g.add(rr); }
    for (const side of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.0075, .0085, .07, 20), tube); b.position.set(side * .03, .075, 0); b.rotation.z = side * .9; g.add(b); }
    const lar = new THREE.Mesh(new THREE.TorusGeometry(.016, .006, 16, 48), gloss('#e57f93', { rough: .35 })); lar.rotation.x = Math.PI / 2; lar.position.y = .212; g.add(lar);
    const valve = new THREE.Mesh(new THREE.CircleGeometry(.0165, 40), gloss('#6e0d22', { rough: .3, side: THREE.DoubleSide })); valve.rotation.x = -Math.PI / 2; valve.position.y = .213; g.add(valve);
    // air: O2 pairs (cyan) streaming into the throat until it snaps shut
    const R = rnd(4), mols = [], om = gloss(p.airColor || '#38c8ff', { rough: .2 }), sg = new THREE.SphereGeometry(.0065, 20, 14);
    for (let i = 0; i < 16; i++) { const mg = new THREE.Group(); const a = new THREE.Mesh(sg, om), b = new THREE.Mesh(sg, om); a.position.x = -.0055; b.position.x = .0055; mg.add(a, b); g.add(mg);
      mols.push({ mg, ph: R(), sx: (R() - .5) * .22, sz: (R() - .5) * .16 + .03, rot: R() * 6 }); }
    const [i0, i1] = p.inhale || [0, 1.6], sa = p.shutAt ?? 1e9, sq = p.squeeze || [];
    if (p.noAir) mols.forEach(q => q.mg.removeFromParent());
    g.userData.tick = lt => { const k = easeIO((lt - i0) / (i1 - i0));
      let c = 1; sq.forEach((t0, j) => { const u = lt - t0; if (u > -.15) c -= (j ? .09 : .13) * (u < 0 ? -.25 * Math.sin((u + .15) / .15 * Math.PI) : easeOut(u / .22) + .25 * Math.exp(-u * 5) * Math.sin(u * 22)); });
      const s = (.9 + .16 * k) * c; lobes.forEach(l => l.scale.set(s, (1 + .1 * k) * (1 - (1 - c) * .5), s));
      const sk = easeOut((lt - sa) / .12); valve.scale.setScalar(Math.max(.001, sk)); lar.scale.setScalar(1 - .12 * sk + (lt > sa ? .05 * Math.exp(-(lt - sa) * 6) * Math.sin((lt - sa) * 30) : 0));
      const tt = Math.min(lt, sa);
      if (!p.noAir) mols.forEach(q => { let u = (tt * .55 + q.ph) % 1; const shut = lt > sa; // u 0 = far above, 1 = inside the throat
        if (shut && u > .82) { q.mg.visible = false; return; } q.mg.visible = u < .97;
        const e = easeIO(u), x = q.sx * (1 - e), z = q.sz * (1 - e), y = .42 - (.42 - .2) * e - (u > .85 ? (u - .85) * .4 : 0);
        const bounce = shut ? .012 * Math.exp(-(lt - sa) * 3) * Math.abs(Math.sin((lt - sa) * 12)) : 0;
        q.mg.position.set(x, y + bounce, z); q.mg.rotation.set(q.rot + lt * 1.5, q.rot, lt); });
    };
    return g; },

  // rib cage (glossy ivory) around the lungs + glowing intercostal muscle bands; squeezes in at p.squeeze = [t0, t1...]
  ribs: p => { const g = new THREE.Group(), bone = p.real ? realMat('bone', '#e6d8bd') : gloss(p.color || '#fff6ea', { rough: .3, opacity: .9 }), mus = p.real ? realMat('organ', '#a8323f', { vein: '#560c1c', emissive: '#a0182c', rep: 4 }) : gloss(p.muscle || '#d8344f', { rough: .3, emissive: '#ff2a4a' }), ribs = [];
    for (let i = 0; i < 6; i++) { const y = -.07 + i * .034, w = .15 + .025 * Math.sin(i / 5 * Math.PI) - i * .004;
      const ring = (tube, gap, mt, yy, k) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, tube / w, 10, 64, Math.PI * 2 - gap), mt); r.rotation.set(Math.PI / 2, 0, Math.PI / 2 + gap / 2);
        const e = new THREE.Group(); e.scale.set(w * k, w * k, w * k * .72); e.add(r); const h = new THREE.Group(); h.position.y = yy; h.rotation.x = -.12; h.add(e); g.add(h); ribs.push(h); };
      ring(.0052, .7, bone, y, 1); if (i < 5) ring(.004, .9, mus, y + .017, .985); }
    const st = new THREE.Mesh(new RoundedBoxGeometry(.022, .19, .01, 3, .004), bone); st.position.set(0, .015, .118); g.add(st);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .24, 16), bone); spine.position.set(0, .01, -.1); g.add(spine);
    const sq = p.squeeze || [];
    g.userData.tick = lt => { let c = 1; sq.forEach((t0, j) => { const u = lt - t0; if (u > -.15) c -= (j ? .07 : .1) * (u < 0 ? -.25 * Math.sin((u + .15) / .15 * Math.PI) : easeOut(u / .2) + .3 * Math.exp(-u * 5) * Math.sin(u * 24)); });
      ribs.forEach(h => h.scale.set(c, 1, c)); mus.emissiveIntensity = clamp((1 - c) * 6) * .8; };
    return g; },

  // toy person with real human proportions (waist up, real size: shoulders ~40 cm, head ~23 cm), facing +z: lathe-shaped chest and waist,
  // trapezius slope into a proper neck, deltoids, tapered upper/lower arms with elbows, hands with fingers, voluminous hair, brows and lids.
  // p.tilt = [t0, t1] lean back (ah... ah...), p.sneezeAt snap forward, p.closeAt eyelids slam, p.halfLids = [t0, t1], p.raise = [t0, t1] right arm up, elbow over the nose
  person: p => { const g = new THREE.Group(), skin = realMat('skin', p.skin || '#e0a081'), shirt = realMat('fabric', p.shirt || '#2c64b8'), jeans = realMat('fabric', p.pants || '#33415c', { sheen: '#8090b0' });
    const hair = new THREE.MeshPhysicalMaterial({ color: p.hair || '#3a2014', roughness: .5, sheen: 1, sheenRoughness: .35, sheenColor: new THREE.Color('#a0714f'), clearcoat: .2, clearcoatRoughness: .4, bumpMap: rep(fabricBump(), 9), bumpScale: .7 });
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const torso = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(.15, 0), V2(.152, .06), V2(.142, .15), V2(.15, .24), V2(.168, .32), V2(.174, .38), V2(.165, .425), V2(.13, .462), V2(.085, .49), V2(.058, .5), V2(0, .503)], 64), shirt);
    torso.scale.z = .6; g.add(torso);
    const belt = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(.156, 0), V2(.158, .07), V2(.152, .075), V2(0, .075)], 64), jeans); belt.scale.z = .62; g.add(belt);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.058, .008, 10, 48), shirt); collar.rotation.x = Math.PI / 2; collar.scale.y = .78; collar.position.y = .497; g.add(collar);
    const piv = new THREE.Group(); piv.position.y = .5; g.add(piv);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .056, .12, 32), skin); neck.position.y = .04; piv.add(neck);
    const H = new THREE.Group(); H.position.y = .16; piv.add(H);
    const head = new THREE.Mesh(displace(new THREE.SphereGeometry(1, 72, 54), v => { if (v.y < 0) { v.x *= 1 - .22 * -v.y; v.z *= 1 - .08 * -v.y; } // jaw narrows to the chin
        if (v.z > .3 && v.y < -.55) v.z += .06 * (v.z - .3) * (-v.y - .55) * 6; }), skin); head.scale.set(.076, .112, .095); H.add(head);
    const curl = (geo, k) => displace(geo, v => v.multiplyScalar(1 + k * (Math.sin(v.x * 40) * Math.sin(v.y * 34 + v.x * 9) * .6 + Math.sin(v.z * 55 + v.y * 20) * .4)));
    const hr = new THREE.Mesh(curl(new THREE.SphereGeometry(1, 72, 40, 0, Math.PI * 2, 0, Math.PI * .5), .007), hair); hr.scale.set(.086, .124, .104); hr.rotation.x = -.38; hr.position.set(0, .01, -.008); H.add(hr);
    const back = new THREE.Mesh(curl(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI * .5), .006), hair); back.scale.set(.083, .118, .1); back.rotation.x = -1.35; back.position.set(0, -.005, -.006); H.add(back);
    const fringe = new THREE.Mesh(curl(new THREE.SphereGeometry(1, 48, 16, Math.PI * .05, Math.PI * .9, Math.PI * .28, Math.PI * .14), .03), hair); fringe.scale.set(.084, .12, .1); fringe.position.y = .004;
    for (const s of [-1, 1]) { const e = new THREE.Mesh(displace(new THREE.SphereGeometry(1, 24, 16), v => { if (v.x * s < 0) v.x *= .4; }), skin); e.scale.set(.012, .026, .017); e.position.set(s * .074, -.004, -.006); H.add(e); }
    const nose = new THREE.Mesh(displace(new THREE.SphereGeometry(1, 32, 24), v => { if (v.y > 0) { v.x *= 1 - .45 * v.y; v.y *= 1.5; } }), skin); nose.scale.set(.013, .019, .019); nose.position.set(0, -.014, .094); H.add(nose);
    for (const s of [-1, 1]) { const al = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin); al.scale.set(.0055, .005, .0075); al.position.set(s * .0095, -.029, .092); H.add(al); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(.015, .0024, 10, 32, 2.1), new THREE.MeshPhysicalMaterial({ color: '#a8434e', roughness: .45, clearcoat: .4 })); mouth.position.set(0, -.05, .084); mouth.rotation.set(-.25, 0, Math.PI + (Math.PI - 2.1) / 2); mouth.scale.y = .45; H.add(mouth);
    const lids = [];
    for (const s of [-1, 1]) { const eg = new THREE.Group(); eg.position.set(s * .03, .022, .078); eg.rotation.y = s * .25; H.add(eg);
      eg.add(new THREE.Mesh(new THREE.SphereGeometry(.0135, 32, 24), new THREE.MeshPhysicalMaterial({ color: '#f4efe8', roughness: .2, clearcoat: 1, clearcoatRoughness: .05 })));
      const iris = new THREE.Mesh(new THREE.SphereGeometry(.0068, 24, 16), new THREE.MeshPhysicalMaterial({ color: p.eye || '#5a3b22', roughness: .3, clearcoat: 1, clearcoatRoughness: .03 })); iris.position.z = .0088; iris.scale.z = .5; eg.add(iris);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(.0032, 16, 12), gloss('#0b0b10', { rough: .1 })); pup.position.z = .0119; pup.scale.z = .45; eg.add(pup);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(.0149, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin); eg.add(lid); lids.push(lid);
      const low = new THREE.Mesh(new THREE.SphereGeometry(.0146, 32, 8, 0, Math.PI * 2, Math.PI * .66, Math.PI * .2), skin); eg.add(low); low.rotation.x = .35;
      const lash = new THREE.Mesh(new THREE.TorusGeometry(.0149, .0009, 6, 32, Math.PI), gloss('#1a0f0a', { rough: .4 })); lash.rotation.x = Math.PI / 2; lid.add(lash);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(.0032, .02, 4, 10), hair); brow.rotation.z = Math.PI / 2 + s * .14; brow.position.set(s * .031, .046, .085); brow.scale.z = .6; H.add(brow); }
    // arms: tapered segments between shoulder, elbow and wrist (rebuilt each tick), hands with fingers oriented along the forearm
    const joint = new THREE.SphereGeometry(1, 24, 16), Y = new THREE.Vector3(0, 1, 0);
    const seg = (rA, rB, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rB, rA, 1, 28), m), j = new THREE.Mesh(joint, m); j.scale.setScalar(rB); g.add(c, j);
      return { set(A, B) { const d = B.clone().sub(A), L = d.length(); c.position.copy(A).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(Y, d.normalize()); c.scale.set(1, L, 1); j.position.copy(B); } }; };
    const mkHand = s => { const h = new THREE.Group(), palm = new THREE.Mesh(new RoundedBoxGeometry(.072, .08, .026, 4, .011), skin); palm.position.y = .048; h.add(palm);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.034, .036, .03, 24), shirt); cuff.position.y = -.004; h.add(cuff);
      [[-.026, .068], [-.009, .076], [.009, .073], [.026, .06]].forEach(([x, Lf]) => { const f = new THREE.Group(); f.position.set(x * s, .088, 0); f.rotation.x = .35; h.add(f);
        const a = new THREE.Mesh(new THREE.CapsuleGeometry(.0085, Lf * .5, 6, 12), skin); a.position.y = Lf * .28; f.add(a);
        const b = new THREE.Group(); b.position.y = Lf * .55; b.rotation.x = .45; f.add(b); const c = new THREE.Mesh(new THREE.CapsuleGeometry(.0078, Lf * .35, 6, 12), skin); c.position.y = Lf * .2; b.add(c); });
      const th = new THREE.Mesh(new THREE.CapsuleGeometry(.0105, .04, 6, 12), skin); th.position.set(-.042 * s, .04, .014); th.rotation.set(.3, 0, .7 * s); h.add(th);
      g.add(h); return h; };
    const V3 = a => new THREE.Vector3(...a), arms = [-1, 1].map(s => ({ s, up: seg(.05, .041, shirt), lo: seg(.04, .033, shirt), hand: mkHand(s) }));
    arms.forEach(a => { const d = new THREE.Mesh(joint, shirt); d.scale.set(.06, .056, .055); d.position.set(a.s * .178, .423, 0); g.add(d); });
    const REST = s => [V3([s * .185, .425, 0]), V3([s * .225, .17, -.02]), V3([s * .095, .13, .17])], UP = [V3([-.185, .425, 0]), V3([0, .58, .2]), V3([.12, .66, 0])];
    const [r0, r1] = p.raise || [1e9, 1e9], [t0, t1] = p.tilt || [1e9, 1e9], sa = p.sneezeAt ?? 1e9, ca = p.closeAt ?? 1e9, [h0, h1] = p.halfLids || [1e9, 1e9], amp = p.snapAmp ?? .32;
    const dir = new THREE.Vector3();
    g.userData.tick = lt => {
      arms.forEach(a => { const R = REST(a.s), k = a.s < 0 ? easeIO((lt - r0) / (r1 - r0)) : 0, P = R.map((v, i) => v.clone().lerp(UP[i], k));
        if (k > 0 && k < 1) P[1].z += .08 * Math.sin(k * Math.PI); a.up.set(P[0], P[1]); a.lo.set(P[1], P[2]);
        a.hand.position.copy(P[2]); a.hand.quaternion.setFromUnitVectors(Y, dir.copy(P[2]).sub(P[1]).normalize()); });
      let rx = -.26 * easeIO((lt - t0) / (t1 - t0)), u = lt - sa;
      if (u > -.12 && u < 0) rx -= .05 * Math.sin((u + .12) / .12 * Math.PI / 2);
      else if (u >= 0) rx = u < .1 ? rx + (amp - rx) * easeOut(u / .1) : .08 + (amp - .08) * (1 - easeOut((u - .1) / 1.4)) + .05 * Math.exp(-u * 4) * Math.sin(u * 20);
      piv.rotation.x = rx; H.rotation.x = rx * .3;
      const half = .3 * easeIO((lt - h0) / (h1 - h0)) * (u > 0 ? 0 : 1), cl = lt >= ca ? easeOut((lt - ca) / .08) : 0, cl2 = u < 0 ? 0 : u < .08 ? easeOut(u / .08) : u < (p.reopen ?? .8) ? 1 : 1 - easeOut((u - (p.reopen ?? .8)) / .25);
      const c = Math.max(half, cl, cl2); lids.forEach(l => l.rotation.x = -.75 + c * 2.25 - (lt >= ca ? .08 * Math.exp(-(lt - ca) * 9) * Math.sin((lt - ca) * 40) : 0));
    };
    return g; },

  // sneeze jet: front-loaded burst of faint mist, motion-blurred water droplets of varied size (stretched along their velocity, falling under gravity)
  // and a few dust specks, along p.dir for p.len metres.
  burst: p => { const g = new THREE.Group(), R = rnd(p.seed || 21), O = new THREE.Vector3(...(p.from || [0, 0, 0])), Dv = new THREE.Vector3(...(p.dir || [1, 0, 0])).normalize();
    const side = new THREE.Vector3().crossVectors(Dv, new THREE.Vector3(0, 1, 0)).normalize(), upv = new THREE.Vector3().crossVectors(side, Dv).normalize();
    const n = p.count || 140, ns = p.streaks || 50, nd = p.dust ?? 30, t0 = p.at || 0, dur = p.dur || 1.5, tr = p.travel || .45, L = p.len || 1;
    const mist = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#eef2f4', roughness: .85, transparent: true, opacity: .13, depthWrite: false }), n);
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#d8eef8', roughness: .04, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .78, ior: 1.33 }), ns);
    const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#7d6a58', roughness: .9 }), Math.max(1, nd));
    [mist, drops, dust].forEach(m => { m.castShadow = false; m.frustumCulled = false; g.add(m); });
    // one continuous soft mist cone: densest at the nose, widening and fading along the jet, soft at its silhouette edges, drifting noise
    const cg = new THREE.CylinderGeometry(p.coneR || .17, .008, 1, 48, 24, true); cg.translate(0, .5, 0);
    const cu = { k: { value: 0 }, op: { value: 0 }, t: { value: 0 }, col: { value: new THREE.Color(p.mistColor || '#eef1f2') } };
    const cone = new THREE.Mesh(cg, new THREE.ShaderMaterial({ uniforms: cu, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying float h; varying vec3 n, vw; varying vec3 lp; void main(){ h = position.y; lp = position; vec4 w = modelViewMatrix * vec4(position, 1.); vw = normalize(-w.xyz); n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * w; }',
      fragmentShader: `uniform float k, op, t; uniform vec3 col; varying float h; varying vec3 n, vw, lp;
        float hs(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(hs(i), hs(i + vec3(1,0,0)), f.x), mix(hs(i + vec3(0,1,0)), hs(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hs(i + vec3(0,0,1)), hs(i + vec3(1,0,1)), f.x), mix(hs(i + vec3(0,1,1)), hs(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){ if (h > k) discard; float edge = pow(abs(dot(normalize(n), vw)), 1.6);
          float along = pow(1. - h, 1.4) * smoothstep(0., .04, h) * smoothstep(k, k - .15, h);
          float nz = .55 + .45 * vn(lp * vec3(26., 9., 26.) - vec3(0., t * 6., 0.)) * vn(lp * 55. + t);
          gl_FragColor = vec4(col, clamp(op * edge * along * nz, 0., .85)); }` }));
    cone.renderOrder = 2; cone.frustumCulled = false; cone.position.copy(O); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Dv); cone.scale.set(1, L, 1); g.add(cone);
    const front = i => Math.pow(i, 1.8); // most of the air leaves in the first moments
    const P = Array.from({ length: n }, (_, i) => ({ b: t0 + dur * front(i / n) + R() * .03, a: R() * 6.28, sp: .03 + R() * .14, r: .01 + R() * .022, tr: tr * (.8 + R() * .4) }));
    const S = Array.from({ length: ns }, (_, i) => ({ b: t0 + dur * front(i / ns) + R() * .04, a: R() * 6.28, off: .005 + R() * .07, r: .0006 + Math.pow(R(), 2.5) * .0035, tr: tr * (.7 + R() * .6), v: .8 + R() * .4 }));
    const Dd = Array.from({ length: nd }, (_, i) => ({ b: t0 + dur * .5 * front(i / Math.max(1, nd)) + R() * .05, a: R() * 6.28, off: .01 + R() * .09, r: .0008 + R() * .0016, tr: tr * (1 + R() * .8), sp: R() * 9 }));
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Pp = new THREE.Vector3(), Sc = new THREE.Vector3(), I = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), vel = new THREE.Vector3(), E = new THREE.Euler();
    const at = (u, a, off) => Pp.copy(O).addScaledVector(Dv, L * u).addScaledVector(side, Math.cos(a) * off).addScaledVector(upv, Math.sin(a) * off);
    const hide = (im, i) => { M.makeScale(0, 0, 0); im.setMatrixAt(i, M); };
    g.userData.tick = lt => {
      P.forEach((q, i) => { const u = (lt - q.b) / q.tr; if (u < 0 || u > 1) return hide(mist, i);
        at(easeOut(u), q.a, q.sp * u); const s = q.r * (.4 + 2.4 * u) * (1 - u * u * u); M.compose(Pp, I, Sc.set(s, s, s)); mist.setMatrixAt(i, M); });
      S.forEach((q, i) => { const u = (lt - q.b) / q.tr; if (u < 0 || u > 1.05) return hide(drops, i);
        const k = easeOut(Math.min(u, 1)) * q.v; at(k, q.a, q.off * (.2 + k)); const fall = .12 * u * u; Pp.y -= fall;
        vel.copy(Dv).multiplyScalar(L * q.v * 3 * Math.pow(1 - Math.min(u, 1), 2) / q.tr).add(new THREE.Vector3(0, -.24 * u / q.tr, 0)); const sp = vel.length();
        Q.setFromUnitVectors(Y, vel.normalize()); const blur = 1 + Math.min(10, sp * (1 / 30) / (2 * q.r)) * .6; // stretch by distance moved during a 1/30 s shutter
        M.compose(Pp, Q, Sc.set(q.r, q.r * blur, q.r)); drops.setMatrixAt(i, M); });
      Dd.forEach((q, i) => { const u = (lt - q.b) / q.tr; if (u < 0 || u > 1) return hide(dust, i);
        at(easeOut(u) * .9, q.a, q.off * (.3 + u)); Q.setFromEuler(E.set(lt * q.sp, lt * q.sp * .7, 0)); M.compose(Pp, Q, Sc.set(q.r, q.r * .7, q.r)); dust.setMatrixAt(i, M); });
      const ut = lt - t0; cu.t.value = lt; cu.k.value = ut < 0 ? 0 : Math.min(1, easeOut(ut / .3));
      cu.op.value = ut < 0 ? 0 : (p.coneOp ?? .75) * Math.min(1, ut / .05) * (ut < dur ? Math.exp(-ut / (dur * .6)) * .7 + .3 : .3 * Math.max(0, 1 - (ut - dur) / .5));
      mist.instanceMatrix.needsUpdate = drops.instanceMatrix.needsUpdate = dust.instanceMatrix.needsUpdate = true; };
    return g; },

  // droplet spray: glossy water beads arc out from p.from along p.dir and land on the floor p.near..p.far metres away (splat flat)
  spray: p => { const g = new THREE.Group(), R = rnd(p.seed || 33), n = p.count || 60, O = new THREE.Vector3(...(p.from || [0, .6, 0])), yaw = Math.atan2(-(p.dir || [1, 0, 0])[2], (p.dir || [1, 0, 0])[0]);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ color: p.color || '#d8eef8', roughness: .04, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .8, ior: 1.33 }), n); im.castShadow = true; im.frustumCulled = false; g.add(im);
    const D = Array.from({ length: n }, (_, i) => { const d = (p.near || .4) + Math.pow(R(), .7) * ((p.far || 1.8) - (p.near || .4)), a = yaw + (R() - .5) * (p.spread || .7);
      return { b: (p.at || 0) + R() * (p.emit || .5), d, a, h: .05 + R() * .18, T: .7 + d * .35 + R() * .2, r: (p.rMin || .003) + R() * ((p.rMax || .008) - (p.rMin || .003)) }; });
    const M = new THREE.Matrix4(), Pp = new THREE.Vector3(), Sc = new THREE.Vector3(), Qd = new THREE.Quaternion(), Vd = new THREE.Vector3(), Yd = new THREE.Vector3(0, 1, 0);
    g.userData.tick = lt => { D.forEach((q, i) => { const u = (lt - q.b) / q.T; if (u < 0) { M.makeScale(0, 0, 0); im.setMatrixAt(i, M); return; }
        const k = Math.min(u, 1), x = q.d * easeOut(k * .6 + k * .4 * k) ; // fast out, slowing as it falls
        Pp.set(O.x + Math.cos(q.a) * x, Math.max(q.r * .25, O.y * (1 - k * k) + q.h * 4 * k * (1 - k)), O.z - Math.sin(q.a) * x);
        if (u >= 1) { const sp = easeOut((u - 1) / .15 * q.T); Sc.set(q.r * (1 + 1.2 * sp), q.r * (1 - .7 * sp), q.r * (1 + 1.2 * sp)); Qd.identity(); } else { // motion blur: stretch along the velocity by the distance moved in a 1/30 s shutter
          const k2 = Math.min(1, k + .01), x2 = q.d * easeOut(k2 * .6 + k2 * .4 * k2), y2 = O.y * (1 - k2 * k2) + q.h * 4 * k2 * (1 - k2);
          Vd.set(Math.cos(q.a) * (x2 - x), y2 - Pp.y, -Math.sin(q.a) * (x2 - x)); const step = Vd.length() / (.01 * q.T) / 30; Qd.setFromUnitVectors(Yd, Vd.normalize());
          Sc.set(q.r, q.r * (1 + Math.min(6, step / (2 * q.r)) * .6), q.r); }
        M.compose(Pp, Qd, Sc); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
    return g; },

  // open hand (real ~19 cm), glossy skin, pops in at p.popAt
  hand: p => { const g = new THREE.Group(), inner = new THREE.Group(), m = realMat('skin', p.skin || '#e0a081'); g.add(inner);
    const palm = new THREE.Mesh(new RoundedBoxGeometry(.085, .095, .028, 4, .012), m); inner.add(palm);
    [[-.03, .085, .07], [-.01, .095, .08], [.011, .092, .076], [.031, .08, .062]].forEach(([x, y, L]) => { const f = new THREE.Mesh(new THREE.CapsuleGeometry(.0095, L - .019, 6, 12), m); f.position.set(x, y - .045 + L / 2, 0); inner.add(f); });
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.011, .04, 6, 12), m); th.position.set(-.055, -.005, .006); th.rotation.z = .75; inner.add(th);
    const pa = p.popAt ?? 0;
    g.userData.tick = lt => { const u = lt - pa, s = u < 0 ? .001 : Math.max(.001, 1 + .25 * Math.exp(-u * 6) * Math.sin(u * 14) - (u < .3 ? 1 - easeOut(u / .3) : 0)); inner.scale.setScalar(s); inner.rotation.z = .12 * Math.sin(lt * 1.4); };
    return g; },

  // glossy toy heart (like) - pops in at p.popAt, then a soft heartbeat pulse
  heart: p => { const g = new THREE.Group(), sh = new THREE.Shape(), s = (p.size || .1) / 2;
    sh.moveTo(0, -s * .95); sh.bezierCurveTo(-s * .25, -s * .6, -s * 1.05, -s * .2, -s, s * .35); sh.bezierCurveTo(-s * .95, s * .95, -s * .25, s * 1.05, 0, s * .5);
    sh.bezierCurveTo(s * .25, s * 1.05, s * .95, s * .95, s, s * .35); sh.bezierCurveTo(s * 1.05, -s * .2, s * .25, -s * .6, 0, -s * .95);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: s * .25, bevelEnabled: true, bevelThickness: s * .28, bevelSize: s * .22, bevelSegments: 8, curveSegments: 32 }); geo.center();
    const mesh = new THREE.Mesh(geo, gloss(p.color || '#ff3b5f', { rough: .25, emissive: '#ff2a4a' })); const inner = new THREE.Group(); inner.add(mesh); g.add(inner);
    const pa = p.popAt ?? 0;
    g.userData.tick = lt => { const u = lt - pa; if (u < 0) { inner.scale.setScalar(.001); return; }
      const pop = u < .35 ? easeOut(u / .35) + .3 * Math.sin(u / .35 * Math.PI) : 1, beat = .06 * Math.pow(Math.max(0, Math.sin(u * 5.5)), 6);
      inner.scale.setScalar(pop * (1 + beat)); inner.rotation.y = .35 * Math.sin(u * 1.2); mesh.material.emissiveIntensity = beat * 3; };
    return g; },

  // glossy "+" (follow) - pops in at p.popAt
  plus: p => { const g = new THREE.Group(), inner = new THREE.Group(), m = gloss(p.color || '#ffc22e', { rough: .25 }), s = p.size || .07; g.add(inner);
    inner.add(new THREE.Mesh(new RoundedBoxGeometry(s, s * .3, s * .3, 4, s * .12), m), new THREE.Mesh(new RoundedBoxGeometry(s * .3, s, s * .3, 4, s * .12), m));
    const pa = p.popAt ?? 0;
    g.userData.tick = lt => { const u = lt - pa; inner.scale.setScalar(u < 0 ? .001 : u < .35 ? easeOut(u / .35) + .3 * Math.sin(u / .35 * Math.PI) : 1 + .03 * Math.sin(u * 4)); inner.rotation.y = u > 0 ? Math.sin(u * 1.5) * .4 : 0; };
    return g; },
};
