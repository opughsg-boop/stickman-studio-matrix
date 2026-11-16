// Blueprint-diorama engine (reference look). UNTESTED DRAFT until tools/smoke.sh passes on a machine with Chromium + three.js.
// Contract: window.renderFrame(f) draws frame f (pure function of f); window.ready=true when loaded. Captions/fade are NOT drawn here
// (burned later by tools/finish.sh so they can change without re-rendering).
import * as THREE from './lib/three.module.js';
import { M, lerp, clamp } from './motion.js';
import { buildProps } from './props.js';
const W = 1080, H = 1920, FPS = 30, S = +(new URLSearchParams(location.search).get('s') || 1);
try {
  const canvas = document.getElementById('c'); const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W * S, H * S, false); renderer.shadowMap.enabled = true; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ctex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; } return t; };
  // studio void: gradient room + white blueprint grid floor
  const room = new THREE.Mesh(new THREE.BoxGeometry(160, 90, 160), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: ctex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1d5ca8'); gr.addColorStop(1, '#4f90d2'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }) })); room.position.y = 30; scene.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ map: ctex(256, 256, (g) => { g.fillStyle = '#2b6cb0'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 5; g.strokeRect(0, 0, 256, 256); }, [60, 60]) })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.7; scene.add(floor);
  // diorama block with soil + cross-section strata
  const soil = (base, n) => ctex(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = (rnd() * 60 - 30) | 0; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 9, 0, 7); g.fill(); } });
  const side = ctex(512, 256, (g, w, h) => { g.fillStyle = '#5a4332'; g.fillRect(0, 0, w, h * 0.45); g.fillStyle = '#b89a6b'; g.fillRect(0, h * 0.45, w, h * 0.55); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.16})`; g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 8, 2 + rnd() * 5); } });
  const mS = new THREE.MeshStandardMaterial({ map: side, roughness: 1 }), mT = new THREE.MeshStandardMaterial({ map: soil('#5b4334', 3200), roughness: 1 });
  const block = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 10), [mS, mS, mT, mS, mS, mS]); block.position.y = -0.8; block.receiveShadow = true; scene.add(block);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8fb5, 1.15)); const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(6, 12, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 }); scene.add(sun);
  const props = buildProps(THREE); Object.values(props).forEach((p) => { p.group.visible = false; scene.add(p.group); });
  // fx objects
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, depthTest: false, side: THREE.DoubleSide })); ring.visible = false; ring.renderOrder = 9; scene.add(ring);
  const sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)), new THREE.PointsMaterial({ color: 0xffc400, size: 0.08, depthTest: false })); sparks.visible = false; scene.add(sparks);
  const arrow = new THREE.Group(); const am = new THREE.MeshBasicMaterial({ color: 0xffd400, depthTest: false });
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), am); sh.rotation.z = Math.PI / 2; arrow.add(sh); [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 12), am); c.rotation.z = -s * Math.PI / 2; c.position.x = s * 0.5; arrow.add(c); }); arrow.visible = false; arrow.renderOrder = 9; scene.add(arrow);
  const ov = new THREE.Scene(), oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); ov.add(flash);
  const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 400);
  const TL = await (await fetch('timeline.json')).json(); const persist = (TL.persist || []);
  const focusOf = (n) => (props[n] ? props[n].focus : new THREE.Vector3(0, 0.8, 0));
  function pose(sh_, u) {
    const c = sh_.camera || {}, tgt = focusOf(sh_.focus).clone().add(new THREE.Vector3(...(c.offset || [0, 0, 0])));
    let d = c.dist || 5.5, az = c.az ?? 25, el = c.el ?? 22; const fov = c.fov || 42, e = M[c.ease || 'smooth'](u), dir = c.dir || 1;
    switch (c.move) {
      case 'push_in': d = lerp(d, d * 0.5, e); break; case 'pull_out': d = lerp(d * 0.5, d, e); break;
      case 'orbit': az += lerp(0, 45 * dir, e); break; case 'dolly': tgt.x += lerp(-1.6, 1.6, e) * dir; break;
      case 'crane_up': el = lerp(el, el + 32, e); break; case 'crane_down': el = lerp(el + 32, el, e); break;
      case 'whip_pan': az += lerp(-75 * dir, 0, M.easeOut(u)); break; case 'tilt_down': tgt.y += lerp(2, 0, e); el += lerp(20, 0, e); break;
      case 'rack_focus': d = lerp(d * 0.92, d * 0.8, e); break; default: az += 8 * e; d *= 1 - 0.05 * e;
    }
    d *= 1 - 0.03 * u; const a = az * Math.PI / 180, l = el * Math.PI / 180;     // creep: the camera is never still
    return { pos: new THREE.Vector3(tgt.x + d * Math.cos(l) * Math.sin(a), tgt.y + d * Math.sin(l), tgt.z + d * Math.cos(l) * Math.cos(a)), tgt, fov };
  }
  window.renderFrame = (f) => {
    let i = TL.shots.findIndex((s) => f >= s.f0 && f < s.f1); if (i < 0) i = TL.shots.length - 1; const s = TL.shots[i], n = f - s.f0, u = clamp(n / Math.max(1, s.f1 - s.f0 - 1)), tl = n / FPS;
    let p = pose(s, u);
    if (i > 0 && n < 18) { const q = pose(TL.shots[i - 1], 1), k = M.smooth(n / 18); p = { pos: q.pos.clone().lerp(p.pos, k), tgt: q.tgt.clone().lerp(p.tgt, k), fov: lerp(q.fov, p.fov, k) }; }   // continuous camera, no hard cut
    const fx = s.fx || []; if (fx.includes('impact') || fx.includes('shockwave')) { const k = Math.max(0, 1 - tl / 0.25); p.pos.x += Math.sin(tl * 90) * 0.07 * k; p.pos.y += Math.cos(tl * 70) * 0.05 * k; }
    cam.position.copy(p.pos); cam.fov = p.fov; cam.updateProjectionMatrix(); cam.lookAt(p.tgt);
    const prev = i > 0 ? (TL.shots[i - 1].props || []) : [];
    for (const [name, pr] of Object.entries(props)) {
      const on = persist.includes(name) || (s.props || []).includes(name); pr.group.visible = on;
      if (on) { const fresh = !persist.includes(name) && !prev.includes(name); const k = fresh ? M.back(n / 10) : 1; pr.group.scale.setScalar(Math.max(0.001, k)); if (fx.includes('pulse') && name === s.focus) pr.group.scale.multiplyScalar(1 + 0.06 * Math.sin(Math.min(1, tl / 0.5) * Math.PI)); }
      pr.group.traverse((o) => { if (o.userData.bb) o.rotation.y = Math.atan2(cam.position.x - o.position.x, cam.position.z - o.position.z); });
    }
    const F = focusOf(s.focus), at = F.clone(); ring.visible = fx.includes('shockwave');
    if (ring.visible) { const k = clamp(tl / 0.9); ring.position.copy(at); ring.scale.setScalar(0.2 + 3.2 * M.easeOut(k)); ring.material.opacity = 1 - k; ring.lookAt(cam.position); }
    sparks.visible = fx.includes('sparks'); if (sparks.visible) { const a = sparks.geometry.attributes.position, t = Math.min(tl, 1.2); let sd = 3; const r2 = () => (sd = (sd * 16807) % 2147483647) / 2147483647; for (let j = 0; j < 60; j++) { const vx = (r2() - .5) * 4, vy = 1.5 + r2() * 3, vz = (r2() - .5) * 4; a.setXYZ(j, at.x + vx * t, at.y + vy * t - 4.5 * t * t, at.z + vz * t); } a.needsUpdate = true; }
    arrow.visible = fx.includes('arrow'); if (arrow.visible) { arrow.position.set(at.x, at.y + 1.1 + 0.08 * Math.sin(tl * 6), at.z); arrow.scale.set(1.6 * M.back(tl / 0.3), 1, 1); arrow.quaternion.copy(cam.quaternion); }
    flash.material.opacity = fx.includes('flash') ? Math.max(0, 0.9 * (1 - n / 6)) : 0;
    renderer.autoClear = true; renderer.render(scene, cam); renderer.autoClear = false; renderer.render(ov, oc);
  };
  window.ready = true;
} catch (e) { console.log('ENGINE ERROR', e.message); window.err = e.message; }
