// "cine" engine: fast-cut, cinematic 3D explainer shots (studio cyclorama / HDRI sets, animated glTF
// actors, shallow depth of field, bloom, handheld camera, whip transitions, hologram highlights, UI
// callouts). Pure function of time -> chunk-safe rendering.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeOutBack = t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const V = a => new THREE.Vector3(...a);
const lerpV = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const noise1 = (t, s) => Math.sin(t * 1.3 + s) * .5 + Math.sin(t * 2.7 + s * 1.7) * .3 + Math.sin(t * 5.1 + s * 3.1) * .2;

let renderer, composer, renderPass, bokeh, bloom, camera, plan, comp, cctx, W, H;
const MODELS = {}, ENVS = {}, shots = [];
const style = { grade: { sat: .92, bright: 1.06, contrast: 1.04 }, handheld: .5, captionY: .78, captionSize: .052 };

// ---------- loading ----------
async function loadModel(name) {
  if (MODELS[name]) return MODELS[name];
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  const ktx = new KTX2Loader().setTranscoderPath('/three/examples/jsm/libs/basis/').detectSupport(renderer); l.setKTX2Loader(ktx);
  return MODELS[name] = await l.loadAsync(`/assets/models/${name}.glb`);
}
async function loadEnv(name) {
  if (ENVS[name]) return ENVS[name];
  const tex = await new RGBELoader().loadAsync(`/assets/hdri/${name}.hdr`); tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(tex).texture;
  return ENVS[name] = { tex, env };
}

// ---------- materials ----------
function holoMat(color) { return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: 1.6, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }); }
function addHolo(obj, color) { // glowing overlay that follows skinning
  const adds = [];
  obj.traverse(m => { if (!m.isMesh) return; let h;
    if (m.isSkinnedMesh) { h = new THREE.SkinnedMesh(m.geometry, holoMat(color)); h.bind(m.skeleton, m.bindMatrix); }
    else h = new THREE.Mesh(m.geometry, holoMat(color));
    h.morphTargetInfluences = m.morphTargetInfluences; h.morphTargetDictionary = m.morphTargetDictionary; h.renderOrder = 5; adds.push([m, h]); });
  adds.forEach(([m, h]) => m.parent.add(h) && h.position.copy(m.position) && h.quaternion.copy(m.quaternion) && h.scale.copy(m.scale).multiplyScalar(1.015));
  return adds.map(a => a[1]);
}
function glowMats(obj, color) { // hologram-style highlight: tinted emissive glow (bloom picks it up)
  const list = []; obj.traverse(m => { if (!m.isMesh) return; const one = x => { const c = x.clone(); c.emissive = new THREE.Color(color); c.emissiveIntensity = .8; if (c.color) c.color.lerp(new THREE.Color(color), .45); list.push(c); return c; };
    m.material = Array.isArray(m.material) ? m.material.map(one) : one(m.material); }); return list; }
function makeXray(obj, opacity = .22) { obj.traverse(m => { if (m.isMesh) { const mats = Array.isArray(m.material) ? m.material : [m.material];
  m.material = mats.map(x => { const c = x.clone(); c.transparent = true; c.opacity = opacity; c.depthWrite = false; return c; }); if (m.material.length === 1) m.material = m.material[0]; } }); }

// ---------- sets ----------
function gradientDome(top, bottom) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float k = smoothstep(-0.15, 0.6, p.y); gl_FragColor = vec4(mix(b, a, k), 1.); }' });
  return new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), m);
}
async function buildSet(scene, s = {}) {
  const env = await loadEnv(s.hdri || (s.type === 'studio' ? 'studio_small_09' : 'kloofendal_48d_partly_cloudy_puresky'));
  scene.environment = env.env; scene.environmentIntensity = s.envIntensity ?? 1;
  if (s.type === 'studio') { // seamless cyclorama like a product studio
    const c = new THREE.Color(s.color || '#2fb8cc');
    scene.add(gradientDome(c.clone().offsetHSL(0, -.05, .12), c.clone().offsetHSL(0, 0, -.05)));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: c.clone().offsetHSL(0, -.05, .02), roughness: .85 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    scene.fog = new THREE.Fog(c.clone().offsetHSL(0, -.05, .05), 18, 60);
  } else if (s.type === 'ground') { // HDRI projected onto ground (outdoor / room look)
    const sky = new GroundedSkybox(env.tex, s.height || 12, s.radius || 80); sky.position.y = (s.height || 12) - .01; scene.add(sky);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .35 })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; scene.add(sh);
  } else { scene.background = env.tex; scene.backgroundBlurriness = s.blur ?? .15; }
  if (s.floorColor) { const f = new THREE.Mesh(new THREE.PlaneGeometry(s.floorSize || 30, s.floorSize || 30), new THREE.MeshStandardMaterial({ color: s.floorColor, roughness: .9 }));
    f.rotation.x = -Math.PI / 2; f.position.y = .002; f.receiveShadow = true; scene.add(f); }
  const key = new THREE.DirectionalLight(s.keyColor || 0xfff1e0, s.key ?? 2.2); key.position.set(...(s.keyPos || [4, 8, 5])); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 40 }); key.shadow.bias = -.0004; key.shadow.radius = 5;
  scene.add(key); scene.add(new THREE.HemisphereLight(0xdfefff, 0x6a5a4a, s.fill ?? .5));
  if (s.rim !== false) { const rim = new THREE.DirectionalLight(0xbfe4ff, s.rim ?? 1.2); rim.position.set(-5, 4, -6); scene.add(rim); }
}

// ---------- props ----------
const PROP = {
  box: p => new THREE.Mesh(new THREE.BoxGeometry(...(p.size || [1, 1, 1])), mat(p)),
  sphere: p => new THREE.Mesh(new THREE.SphereGeometry(p.r || .5, 48, 32), mat(p)),
  cylinder: p => new THREE.Mesh(new THREE.CylinderGeometry(p.r || .3, p.r2 ?? p.r ?? .3, p.h || 1, 48), mat(p)),
  cone: p => new THREE.Mesh(new THREE.ConeGeometry(p.r || .3, p.h || .8, 32), mat(p)),
  ring: p => { const m = new THREE.Mesh(new THREE.TorusGeometry(p.r || 1, p.tube || .06, 16, 96), new THREE.MeshBasicMaterial({ color: p.color || '#7dff9a', transparent: true, opacity: .85 })); m.rotation.x = -Math.PI / 2; return m; },
  disc: p => { const m = new THREE.Mesh(new THREE.CircleGeometry(p.r || 1, 64), mat(p)); m.rotation.x = -Math.PI / 2; return m; },
  cup: p => { const g = new THREE.Group(); const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .05, transmission: .9, thickness: .05, transparent: true, opacity: .5 });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(.35, .28, .9, 48, 1, true), glass));
    const water = new THREE.Mesh(new THREE.CylinderGeometry(.33, .27, .9 * (p.fill ?? .6), 48), new THREE.MeshPhysicalMaterial({ color: p.color || '#bfe8ff', roughness: .1, transmission: .6, transparent: true, opacity: .8 }));
    water.position.y = -.45 + .45 * (p.fill ?? .6); g.add(water); g.position.y = .45; const w = new THREE.Group(); w.add(g); return w; },
  particles: p => { const g = new THREE.Group(), r = mulberry(p.seed || 3), m = new THREE.MeshStandardMaterial({ color: p.color || '#5dff6a', emissive: p.color || '#5dff6a', emissiveIntensity: p.glow ?? .8 });
    const geo = new THREE.CapsuleGeometry(p.size || .03, (p.size || .03) * 3, 4, 8); const list = [];
    for (let i = 0; i < (p.count || 80); i++) { const o = new THREE.Mesh(geo, m); const b = [(r() - .5) * p.area[0], r() * p.area[1], (r() - .5) * p.area[2]]; list.push({ o, b, ph: r() * 6.3, rx: r() * 3 }); g.add(o); }
    g.userData.tick = t => list.forEach(q => { q.o.position.set(q.b[0] + Math.sin(t * (p.drift || .8) + q.ph) * .15, q.b[1] + Math.sin(t * .9 + q.ph) * .08, q.b[2] + Math.cos(t * (p.drift || .8) + q.ph) * .15); q.o.rotation.set(t + q.rx, q.ph, t * .7); });
    return g; },
  model: async p => { const g = await loadModel(p.model); const o = g.scene.clone(true); o.updateMatrixWorld(true);
    if (p.height) { const b = new THREE.Box3().setFromObject(o), s = p.height / (b.max.y - b.min.y); o.scale.multiplyScalar(s); const c = b.getCenter(new THREE.Vector3()).multiplyScalar(s); o.position.sub(c); }
    const w = new THREE.Group(); w.add(o); return w; },
};
function mat(p) { const o = { color: p.color || '#cccccc', roughness: p.rough ?? .5, metalness: p.metal ?? 0 };
  if (p.glow) { o.emissive = p.color; o.emissiveIntensity = p.glow; }
  if (p.opacity != null) { o.transparent = true; o.opacity = p.opacity; }
  return p.glass ? new THREE.MeshPhysicalMaterial({ ...o, transmission: .9, thickness: .2, roughness: .05 }) : new THREE.MeshStandardMaterial(o); }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- shots ----------
async function buildShot(s) {
  const scene = new THREE.Scene(); await buildSet(scene, s.set || { type: 'studio' });
  const things = [];
  for (const a of s.actors || []) {
    const g = await loadModel(a.model); const o = skClone(g.scene);
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });
    o.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(o, true), hgt = box.max.y - box.min.y || 1;
    const sc = (a.height || 1.8) / hgt; const holder = new THREE.Group(); holder.add(o); o.scale.setScalar(sc); o.position.y = -box.min.y * sc;
    if (a.tint) o.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.color?.set(a.tint); } });
    if (a.xray) makeXray(o, a.xray === true ? .22 : a.xray);
    const holo = a.holo ? glowMats(o, a.holo) : null;
    const mixer = new THREE.AnimationMixer(o); let action = null;
    const clip = a.clip && g.animations.find(c => c.name === a.clip || c.name.toLowerCase() === String(a.clip).toLowerCase()) || (a.clip !== false && g.animations[0]);
    if (clip) { action = mixer.clipAction(clip); action.play(); }
    const morphs = []; o.traverse(m => { if (m.morphTargetDictionary && a.morph) morphs.push(m); });
    scene.add(holder); things.push({ kind: 'actor', a, holder, o, mixer, holo, morphs });
  }
  for (const p of s.props || []) { const o = await PROP[p.type](p); o.traverse(m => { if (m.isMesh) { m.castShadow = p.shadow !== false; m.receiveShadow = true; } });
    const holder = new THREE.Group(); holder.add(o); if (p.rot) o.rotation.set(...p.rot); if (p.scale) o.scale.multiplyScalar(p.scale);
    if (p.holo) glowMats(o, p.holo); scene.add(holder); things.push({ kind: 'prop', a: p, holder, o }); }
  return { s, scene, things };
}
function poseThing(th, lt, dur) {
  const a = th.a, k = clamp(lt / dur), ek = a.ease === 'linear' ? k : easeIO(k);
  const from = a.pos || [0, 0, 0], to = a.to || from; const p = lerpV(from, to, ek);
  th.holder.position.set(...p);
  let ry = a.rotY ?? 0; if (a.spin) ry += lt * a.spin; if (a.faceMove && a.to) ry = Math.atan2(to[0] - from[0], to[2] - from[2]);
  th.holder.rotation.set(a.rotX || 0, ry, a.rotZ || 0);
  let s = a.appear === 'pop' ? easeOutBack(lt / .35) : 1; if (a.grow) s *= lerp(a.grow[0], a.grow[1], easeIO(k)); th.holder.scale.setScalar(Math.max(.001, s));
  if (th.mixer) th.mixer.setTime(((a.clipOffset || 0) + lt) * (a.speed ?? 1));
  if (th.morphs) for (const m of th.morphs) for (const [name, v] of Object.entries(a.morph)) { const i = m.morphTargetDictionary[name]; if (i != null) m.morphTargetInfluences[i] = typeof v === 'number' ? v : lerp(v[0], v[1], easeIO(k)); }
  if (th.holo) { const pulse = .55 + .35 * Math.sin(lt * 6); th.holo.forEach(m => m.emissiveIntensity = pulse); }
  th.o.traverse(m => m.userData.tick && m.userData.tick(lt));
}
function resolveTarget(sh, tgt) { if (typeof tgt === 'string') { const th = sh.things.find(x => x.a.id === tgt); if (th) { const b = new THREE.Box3().setFromObject(th.holder); return b.getCenter(new THREE.Vector3()).toArray(); } } return tgt || [0, 1, 0]; }
function poseCamera(sh, lt, dur) {
  const c = sh.s.camera || {}, k = c.ease === 'linear' ? clamp(lt / dur) : c.ease === 'out' ? easeOut(lt / dur) : easeIO(lt / dur);
  const p0 = c.pos || [0, 1.6, 4], p1 = c.to?.pos || p0, t0 = resolveTarget(sh, c.target), t1 = c.to?.target ? resolveTarget(sh, c.to.target) : t0;
  const pos = V(lerpV(p0, p1, k)), tgt = V(lerpV(t0, t1, k));
  if (c.orbit) { const ang = c.orbit * k, d = pos.clone().sub(tgt); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); pos.copy(tgt).add(d); }
  const hh = (c.handheld ?? style.handheld) * .03 * pos.distanceTo(tgt) ** .5, T = sh.start + lt;
  pos.add(new THREE.Vector3(noise1(T, 1) * hh, noise1(T, 2) * hh * .7, noise1(T, 3) * hh));
  camera.fov = lerp(c.fov || 40, c.to?.fov || c.fov || 40, k); camera.updateProjectionMatrix();
  camera.position.copy(pos); camera.lookAt(tgt); camera.rotateZ((c.roll || 0) + noise1(T, 4) * .006 * (c.handheld ?? style.handheld));
  // depth of field: focus on target unless told otherwise
  const dof = c.dof ?? { aperture: .012, maxblur: .01 };
  bokeh.enabled = !!dof; if (dof) { bokeh.uniforms.focus.value = dof.focus ?? pos.distanceTo(tgt); bokeh.uniforms.aperture.value = (dof.aperture ?? .012) * .01; bokeh.uniforms.maxblur.value = dof.maxblur ?? .01; }
}

// ---------- 2D overlays ----------
function project(sh, p) { const v = V(p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H, v.z < 1]; }
function txt(s, x, y, size, color, o = {}) { const ar = /[؀-ۿ]/.test(s); cctx.font = `${o.weight || 800} ${size}px ${ar ? 'CapAr2' : 'CapEn'}`; cctx.textAlign = 'center'; cctx.textBaseline = 'middle';
  cctx.direction = ar ? 'rtl' : 'ltr'; if (o.stroke !== false) { cctx.lineJoin = 'round'; cctx.lineWidth = size * .14; cctx.strokeStyle = o.strokeColor || 'rgba(255,255,255,.95)'; cctx.strokeText(s, x, y); }
  cctx.fillStyle = color; cctx.fillText(s, x, y); }
function drawUI(sh, lt) {
  for (const u of sh.s.ui || []) {
    const u0 = u.start ?? 0, u1 = u.end ?? 1e9; if (lt < u0 || lt > u1) continue; const ul = lt - u0, pop = easeOutBack(ul / .3);
    cctx.save();
    if (u.type === 'viewfinder') { const m = W * .12, L = W * .12; cctx.strokeStyle = 'rgba(255,255,255,.95)'; cctx.lineWidth = W * .008;
      for (const [x, y, sx, sy] of [[m, H * .2, 1, 1], [W - m, H * .2, -1, 1], [m, H * .62, 1, -1], [W - m, H * .62, -1, -1]]) { cctx.beginPath(); cctx.moveTo(x, y + sy * L); cctx.lineTo(x, y); cctx.lineTo(x + sx * L, y); cctx.stroke(); }
      if (Math.floor(lt * 2) % 2 === 0) { cctx.fillStyle = '#ff2a2a'; cctx.beginPath(); cctx.arc(W - m - W * .03, H * .2 + W * .05, W * .018, 0, 7); cctx.fill(); } }
    else if (u.type === 'counter') { const [x, y] = u.at || [.5, .2]; cctx.translate(x * W, y * H); cctx.scale(pop, pop); txt(u.text, 0, 0, W * (u.size || .16), u.color || '#ff2b2b', { strokeColor: 'rgba(255,255,255,.9)' }); }
    else if (u.type === 'pin') { let [x, y] = u.at ? [u.at[0] * W, u.at[1] * H] : project(sh, u.world); cctx.translate(x, y); cctx.scale(pop, pop);
      const r = W * .045; cctx.fillStyle = '#fff'; cctx.beginPath(); cctx.roundRect(-r, -r * 2.2, r * 2, r * 1.6, r * .3); cctx.fill();
      cctx.beginPath(); cctx.moveTo(-r * .3, -r * .6); cctx.lineTo(0, 0); cctx.lineTo(r * .3, -r * .6); cctx.fill();
      txt(u.icon || '+', 0, -r * 1.4, r * 1.3, u.iconColor || '#e8262b', { stroke: false }); if (u.text) txt(u.text, 0, -r * 2.7, r * .8, '#fff', { strokeColor: 'rgba(0,0,0,.6)', weight: 700 }); }
    else if (u.type === 'label') { const [x, y, ok] = project(sh, u.world); if (ok) { cctx.translate(x, y); cctx.scale(pop, pop); txt(u.text, 0, 0, W * (u.size || .06), u.color || '#fff', { strokeColor: 'rgba(0,0,0,.7)' }); } }
    else if (u.type === 'arrow') { const [x, y] = u.at ? [u.at[0] * W, u.at[1] * H] : project(sh, u.world); const bob = Math.sin(lt * 8) * W * .012; cctx.translate(x, y - W * .08 + bob); cctx.scale(pop, pop);
      cctx.fillStyle = u.color || '#ffd31a'; cctx.strokeStyle = '#000'; cctx.lineWidth = W * .006; cctx.beginPath(); const a = W * .05;
      cctx.moveTo(-a * .35, -a * 1.6); cctx.lineTo(a * .35, -a * 1.6); cctx.lineTo(a * .35, -a * .5); cctx.lineTo(a * .8, -a * .5); cctx.lineTo(0, a * .4); cctx.lineTo(-a * .8, -a * .5); cctx.lineTo(-a * .35, -a * .5); cctx.closePath(); cctx.fill(); cctx.stroke(); }
    else if (u.type === 'meter') { const [x, y] = u.at || [.2, .4], v = lerp(u.from ?? 0, u.to ?? 1, easeIO(ul / (u.dur || 1))), bw = W * .1, bh = H * .22;
      cctx.translate(x * W, y * H); cctx.fillStyle = 'rgba(30,40,50,.85)'; cctx.beginPath(); cctx.roundRect(-bw / 2, -bh / 2, bw, bh, W * .015); cctx.fill();
      cctx.fillStyle = u.color || '#3ce06b'; const n = 8; for (let i = 0; i < n; i++) if (i / n < v) cctx.fillRect(-bw * .35, bh / 2 - (i + 1) * bh / (n + 1), bw * .7, bh / (n + 1) * .7);
      if (u.text) txt(u.text, 0, -bh / 2 - W * .05, W * .06, '#fff', { strokeColor: 'rgba(0,0,0,.6)' }); }
    cctx.restore();
  }
}
function drawCaption(t) {
  const c = (plan.captions || []).find(w => t >= w.start && t < w.end); if (!c) return;
  const ar = /[؀-ۿ]/.test(c.text), size = H * style.captionSize * (ar ? 1.12 : 1);
  cctx.save(); cctx.font = `${ar ? 800 : 700} ${size}px ${ar ? 'CapAr2' : 'CapEn'}`; cctx.textAlign = 'center'; cctx.textBaseline = 'middle'; cctx.direction = ar ? 'rtl' : 'ltr';
  let fs = size; while (cctx.measureText(c.text).width > W * .86) { fs *= .93; cctx.font = `${ar ? 800 : 700} ${fs}px ${ar ? 'CapAr2' : 'CapEn'}`; }
  cctx.shadowColor = 'rgba(0,0,0,.85)'; cctx.shadowBlur = size * .35; cctx.shadowOffsetY = size * .06;
  cctx.fillStyle = '#fff'; cctx.fillText(c.text, W / 2, H * style.captionY); cctx.shadowBlur = size * .12; cctx.fillText(c.text, W / 2, H * style.captionY); cctx.restore();
}

// ---------- API ----------
window.setup = async (p, o = {}) => {
  plan = p; Object.assign(style, p.style || {}); if (p.learned) { Object.assign(style.grade, { sat: p.learned.sat ?? style.grade.sat, bright: p.learned.bright ?? style.grade.bright }); if (p.learned.handheld != null) style.handheld = p.learned.handheld; } W = o.width || 540; H = o.height || 960;
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(W, H); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = style.exposure || 1;
  document.body.appendChild(renderer.domElement);
  camera = new THREE.PerspectiveCamera(40, W / H, .02, 500);
  composer = new EffectComposer(renderer); renderPass = new RenderPass(new THREE.Scene(), camera); composer.addPass(renderPass);
  bokeh = new BokehPass(new THREE.Scene(), camera, { focus: 3, aperture: .00012, maxblur: .01 }); composer.addPass(bokeh);
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .35, .5, .85); composer.addPass(bloom); composer.addPass(new OutputPass());
  comp = document.createElement('canvas'); comp.width = W; comp.height = H; cctx = comp.getContext('2d');
  for (const s of p.shots) { const sh = await buildShot(s); sh.start = s.start; sh.end = s.end; shots.push(sh); }
  await document.fonts.load('700 40px CapEn'); await document.fonts.load('800 40px CapAr2');
  return { shots: shots.length, models: Object.keys(MODELS) };
};
window.renderAt = (t, q = .9) => {
  let i = shots.findIndex(s => t < s.end); if (i < 0) i = shots.length - 1; const sh = shots[i], lt = t - sh.start, dur = sh.end - sh.start;
  for (const th of sh.things) poseThing(th, lt, dur);
  poseCamera(sh, lt, dur);
  renderPass.scene = sh.scene; bokeh.scene = sh.scene; bloom.strength = sh.s.fx?.bloom ?? .3;
  composer.render();
  const g = { ...style.grade, ...(sh.s.fx?.grade || {}) };
  cctx.filter = `saturate(${g.sat}) brightness(${g.bright}) contrast(${g.contrast})`;
  // whip transition: directional smear at the start of a shot (and end of the previous one)
  const next = shots[i + 1], whipIn = sh.s.transition !== 'cut' && i > 0 && lt < .1, whipOut = next && next.s.transition !== 'cut' && sh.end - t < .08;
  if (whipIn || whipOut) { const k = whipIn ? 1 - lt / .1 : 1 - (sh.end - t) / .08, dir = (sh.s.whipDir || 1) * (whipIn ? -1 : 1);
    cctx.globalAlpha = 1; cctx.drawImage(renderer.domElement, 0, 0); for (let j = 1; j <= 6; j++) { cctx.globalAlpha = .22; cctx.drawImage(renderer.domElement, dir * j * W * .035 * k, 0); } cctx.globalAlpha = 1; }
  else cctx.drawImage(renderer.domElement, 0, 0);
  cctx.filter = 'none';
  if (sh.s.flash && lt < .15) { cctx.fillStyle = `rgba(255,255,255,${.7 * (1 - lt / .15)})`; cctx.fillRect(0, 0, W, H); }
  const vg = cctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); cctx.fillStyle = vg; cctx.fillRect(0, 0, W, H);
  drawUI(sh, lt); drawCaption(t);
  const fo = clamp((t - (plan.duration - .25)) / .25), fi = 1 - clamp(t / .15); if (Math.max(fo, fi) > 0) { cctx.fillStyle = `rgba(0,0,0,${Math.max(fo, fi)})`; cctx.fillRect(0, 0, W, H); }
  return comp.toDataURL('image/jpeg', q).slice(23);
};
window.__dbg = () => shots.map(s => ({ cam: camera.position.toArray().map(v => +v.toFixed(2)), things: s.things.map(t => ({ id: t.a.id, pos: t.holder.position.toArray(), sc: t.holder.scale.x, osc: t.o.scale.x, oy: t.o.position.y, vis: t.o.visible, meshes: (() => { let n = 0; t.o.traverse(m => m.isMesh && n++); return n; })() })) }));
window.__ready = true;
