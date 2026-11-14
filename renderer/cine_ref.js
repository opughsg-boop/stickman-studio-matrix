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

// ---------- sets ----------
function skyDome(stops) { // stops: [[elevation (-1..1 of view dir y), colour], ...] ascending
  const n = stops.length, m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { cs: { value: stops.map(s => new THREE.Color(s[1])) }, ks: { value: stops.map(s => s[0]) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 cs[${n}]; uniform float ks[${n}]; varying vec3 p; void main(){ vec3 c = cs[0];
      for (int i = 1; i < ${n}; i++) c = mix(c, cs[i], smoothstep(ks[i-1], ks[i], p.y)); gl_FragColor = vec4(c, 1.); }` });
  return new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), m);
}
function woodTexture(seed = 7) { // warm varnished planks, 8 rows per tile, staggered joints, grain lines
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
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export const SUNSET = [[-1, '#f2a46a'], [0, '#ffb070'], [.025, '#f06a45'], [.08, '#c23a5e'], [.18, '#6a2a78'], [.38, '#2a2560']];
// returns true when the set type was handled here
export function refSet(scene, s) {
  if (s.type === 'sunset') {
    scene.add(skyDome(s.sky || SUNSET));
    const tex = woodTexture(s.seed || 7), rep = s.floorSize || 60; tex.repeat.set(rep / (s.tile || 1), rep / (s.tile || 1));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(rep, rep), new THREE.MeshPhysicalMaterial({ map: tex, roughness: .42, clearcoat: .55, clearcoatRoughness: .25 }));
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
  brain: p => { const g = new THREE.Group(), m = gloss(p.color || '#ea6a82', { rough: .3, emissive: '#ff3b5c' });
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
      const s = 1 + pre + post; cx.scale.set(1 - post * .5, s, 1 - post * .5);
      m.emissiveIntensity = u >= 0 ? .9 * Math.exp(-u * 2.5) : 0;
      const rk = clamp(u / .9); ring.scale.setScalar(.5 + rk * 2.2); ring.material.opacity = u >= 0 && u < .9 ? .9 * (1 - rk) : 0; };
    return g; },
  // lungs (real ~25 cm tall) + trachea with cartilage rings + larynx valve; inhale at p.inhale=[t0,t1], snap shut at p.shutAt
  lungs: p => { const g = new THREE.Group(), m = gloss(p.color || '#e3566f', { rough: .3 }), lobes = [];
    for (const side of [-1, 1]) { const geo = displace(new THREE.SphereGeometry(1, 96, 72), v => { const h = (v.y + 1) / 2; // 0 base .. 1 apex
        const w = .62 + .5 * (1 - h); v.x *= w; v.z *= w; // broad base on the diaphragm, narrow apex
        if (v.x * side < 0) v.x *= .42; if (v.y < -.75) v.y = -.75 + (v.y + .75) * .25;
        v.x += .06 * Math.sin(v.y * 9 + side) * Math.max(0, -v.y); v.x *= side > 0 ? .072 : .066; v.y *= .125; v.z *= .085; });
      const lobe = new THREE.Mesh(geo, m); lobe.position.set(side * .062, 0, 0); g.add(lobe); lobes.push(lobe); }
    const ringM = gloss(p.ringColor || '#f7c6cf', { rough: .4 }), tube = gloss(p.tubeColor || '#e8a0ae', { rough: .4 });
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .12, 28), tube); tr.position.y = .145; g.add(tr);
    for (let i = 0; i < 8; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(.0105, .0022, 10, 32), ringM); rr.rotation.x = Math.PI / 2; rr.position.y = .1 + i * .012; g.add(rr); }
    for (const side of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.0075, .0085, .07, 20), tube); b.position.set(side * .03, .075, 0); b.rotation.z = side * .9; g.add(b); }
    const lar = new THREE.Mesh(new THREE.TorusGeometry(.016, .006, 16, 48), gloss('#e57f93', { rough: .35 })); lar.rotation.x = Math.PI / 2; lar.position.y = .212; g.add(lar);
    const valve = new THREE.Mesh(new THREE.CircleGeometry(.0165, 40), gloss('#6e0d22', { rough: .3, side: THREE.DoubleSide })); valve.rotation.x = -Math.PI / 2; valve.position.y = .213; g.add(valve);
    // air: O2 pairs (cyan) streaming into the throat until it snaps shut
    const R = rnd(4), mols = [], om = gloss(p.airColor || '#38c8ff', { rough: .2 }), sg = new THREE.SphereGeometry(.0065, 20, 14);
    for (let i = 0; i < 16; i++) { const mg = new THREE.Group(); const a = new THREE.Mesh(sg, om), b = new THREE.Mesh(sg, om); a.position.x = -.0055; b.position.x = .0055; mg.add(a, b); g.add(mg);
      mols.push({ mg, ph: R(), sx: (R() - .5) * .22, sz: (R() - .5) * .16 + .03, rot: R() * 6 }); }
    const [i0, i1] = p.inhale || [0, 1.6], sa = p.shutAt ?? 1e9;
    g.userData.tick = lt => { const k = easeIO((lt - i0) / (i1 - i0)), s = .9 + .16 * k; lobes.forEach(l => l.scale.set(s, 1 + .1 * k, s));
      const sk = easeOut((lt - sa) / .12); valve.scale.setScalar(Math.max(.001, sk)); lar.scale.setScalar(1 - .12 * sk + (lt > sa ? .05 * Math.exp(-(lt - sa) * 6) * Math.sin((lt - sa) * 30) : 0));
      const tt = Math.min(lt, sa);
      mols.forEach(q => { let u = (tt * .55 + q.ph) % 1; const shut = lt > sa; // u 0 = far above, 1 = inside the throat
        if (shut && u > .82) { q.mg.visible = false; return; } q.mg.visible = u < .97;
        const e = easeIO(u), x = q.sx * (1 - e), z = q.sz * (1 - e), y = .42 - (.42 - .2) * e - (u > .85 ? (u - .85) * .4 : 0);
        const bounce = shut ? .012 * Math.exp(-(lt - sa) * 3) * Math.abs(Math.sin((lt - sa) * 12)) : 0;
        q.mg.position.set(x, y + bounce, z); q.mg.rotation.set(q.rot + lt * 1.5, q.rot, lt); });
    };
    return g; },
};
