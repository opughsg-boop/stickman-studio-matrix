// Realism v2 (2026-11-15): post chain, distant horizon, instanced ground cover, living water,
// sunlit motes, flying birds and handheld camera micro-motion for the diorama engine (scene.js).
// Everything is a pure function of time t, so chunked rendering stays deterministic.
// Plan knobs (all ON by default in the real-sky looks):
//   style.post:false | style.bloom (.22) | style.grade (1) | style.sharpen (.35) | style.vignette (.2) | style.grain (.014) | style.aa (4) | style.handheld (1)
//   env.horizon:'hills'|'nile'|'desert'|false | env.cover:'low'|'medium'|'high'|number|false | env.birds (3) | env.birdModel ('Stork')
//   env.motes (1, 0 = off) | env.waves (1, 0 = flat water) | env.foam (true)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const V = { ticks: [] }; // per-frame updaters: fn(t, camera)
const rnd = seed => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const C = c => new THREE.Color(c);
export const realismTick = (t, camera) => { for (const f of V.ticks) f(t, camera); };
export function resetRealism() { V.ticks = []; }

// ================= 1+2. post chain: MSAA scene target -> bloom -> OutputPass (tone mapping + sRGB) -> grade =================
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, px: { value: new THREE.Vector2() }, time: { value: 0 }, sharpen: { value: .35 }, grade: { value: 1 },
    vignette: { value: .2 }, grain: { value: .014 }, aspect: { value: .5625 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  // display-space (sRGB) grade: unsharp mask, gentle S-curve, warm highlights / teal shadows, vignette, fine grain
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 px; uniform float time, sharpen, grade, vignette, grain, aspect; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec3 n = texture2D(tDiffuse, vUv + vec2(px.x, 0.)).rgb + texture2D(tDiffuse, vUv - vec2(px.x, 0.)).rgb
             + texture2D(tDiffuse, vUv + vec2(0., px.y)).rgb + texture2D(tDiffuse, vUv - vec2(0., px.y)).rgb;
      c = clamp(c + sharpen * (c - n * .25), 0., 1.);
      float l = dot(c, vec3(.2126, .7152, .0722));
      vec3 g = mix(vec3(l), c, 1.06);                                   // a touch richer colour
      g = mix(g, g * g * (3. - 2. * g), .16);                           // gentle filmic S-curve
      g += vec3(-.012, .004, .022) * (1. - l) * (1. - l);              // slightly teal shadows
      g += vec3(.03, .012, -.02) * l * l;                               // warm highlights
      c = mix(c, g, grade);
      vec2 q = (vUv - .5) * vec2(aspect, 1.) * 1.6;
      c *= 1. - vignette * smoothstep(.25, 1.05, dot(q, q));
      c += (hash(vUv * 1931. + fract(time * 7.13) * 97.) - .5) * grain;
      gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
    }`,
};
export function makePost(renderer, W, H, style) {
  if (style.post === false) return null;
  const hdr = { type: THREE.HalfFloatType, samples: style.aa ?? (W >= 1000 ? 4 : 0) }; // MSAA only on the GPU path: in software GL it costs ~+60%
  const P = { sceneRT: new THREE.WebGLRenderTarget(W, H, hdr), ldrRT: new THREE.WebGLRenderTarget(W, H) };
  const bs = style.bloom ?? .22;
  // bloom at half resolution (cheap in software GL); threshold above the sky so only sun glints, fire and glowing parts bloom
  if (bs > 0) P.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), bs, style.bloomRadius ?? .45, style.bloomThreshold ?? 1.05);
  P.output = new OutputPass();
  // style.aa: MSAA samples of the scene target (very costly in software GL); with aa 0, FXAA smooths the edges instead (style.fxaa:false = off)
  if (!hdr.samples && style.fxaa !== false) { P.fxaa = new ShaderPass(FXAAShader); P.fxaa.uniforms.resolution.value.set(1 / W, 1 / H); P.ldr2 = new THREE.WebGLRenderTarget(W, H); }
  P.grade = new ShaderPass(GradeShader); P.grade.renderToScreen = true;
  const u = P.grade.uniforms; u.px.value.set(1 / W, 1 / H); u.aspect.value = W / H;
  u.sharpen.value = style.sharpen ?? (W >= 1000 ? .2 : .35); u.grade.value = style.grade ?? 1; u.vignette.value = style.vignette ?? .2; u.grain.value = style.grain ?? .014;
  P.render = (scene, camera, t) => {
    renderer.setRenderTarget(P.sceneRT); renderer.clear(); renderer.render(scene, camera);
    if (P.bloom) P.bloom.render(renderer, null, P.sceneRT, 0, false);
    P.output.render(renderer, P.ldrRT, P.sceneRT);
    let src = P.ldrRT; if (P.fxaa) { P.fxaa.render(renderer, P.ldr2, P.ldrRT); src = P.ldr2; }
    u.time.value = t; P.grade.render(renderer, null, src);
  };
  return P;
}

// ================= 3. horizon: fogged landscape ring beyond the water =================
const HZ = {
  hills: { near: { H: 24, c: ['#4f7a2a', '#6d9a35', '#8aa347'] }, far: { H: 52, c: ['#6f8a6a', '#8ea08a', '#a4b3a6'] }, trees: 560, palms: 6, village: ['#efe9df', '#d9cdb8', '#b5523a'] },
  nile: { near: { H: 4, c: ['#56802f', '#6f9a3a', '#88a845'] }, far: { H: 40, c: ['#d8c39a', '#e4d3ae', '#cdb48a'] }, trees: 120, palms: 170, village: ['#c9a87a', '#b88f5f', '#ddc8a4'] },
  desert: { near: { H: 18, c: ['#d7b27a', '#e3c38f', '#c99f66'] }, far: { H: 46, c: ['#e2cfa8', '#ecdcba', '#d6bf95'] }, trees: 0, palms: 26, village: ['#d8bf94', '#c7a679'] },
};
function noise1(r, k = 6) { const ph = Array.from({ length: k }, () => r() * 6.283), fr = Array.from({ length: k }, (_, i) => 2 + i * 3 + Math.floor(r() * 3));
  return a => { let v = 0, w = 0; for (let i = 0; i < k; i++) { const wi = 1 / (1 + i * .9); v += Math.sin(a * fr[i] + ph[i]) * wi; w += wi; } return v / w; }; }
function ridge(R0, R1, H, cols, r) {
  const na = 200, nr = 7, n = noise1(r), n2 = noise1(r, 4), pos = [], colA = [], idx = [], cs = cols.map(C), tmp = new THREE.Color();
  const height = (a, u) => { const amp = .55 + .45 * n(a), prof = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 1.15))), .75);
    return u <= 0 ? -2 : H * amp * prof + n2(a * 3 + u * 5) * H * .08; };
  for (let j = 0; j <= nr; j++) for (let i = 0; i <= na; i++) {
    const a = i / na * Math.PI * 2, u = j / nr, R = R0 + (R1 - R0) * u, h = height(a, u);
    pos.push(Math.sin(a) * R, h, -Math.cos(a) * R);
    const k = Math.min(1, Math.max(0, h / Math.max(1, H))), m = .5 + .5 * n2(a * 7 + u * 3);
    tmp.copy(cs[0]).lerp(cs[1], m).lerp(cs[2], k * .7); tmp.multiplyScalar(.9 + .2 * r()); colA.push(tmp.r, tmp.g, tmp.b);
  }
  for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const a = j * (na + 1) + i, b = a + na + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.userData.height = height; return m;
}
function lumpy(geo) { // break the faceted look: displace vertices by a hash of their position (shared corners move together)
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const h = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
    v.multiplyScalar(.78 + .4 * (h - Math.floor(h))); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}
function frondGeo() { // palm crown: arching fronds that rise then droop (seen from the side, not edge-on), merged
  const parts = [];
  for (let k = 0; k < 11; k++) { const up = k >= 8, p = new THREE.PlaneGeometry(up ? .7 : 1, 3.6, 1, 8), ps = p.attributes.position;
    for (let i = 0; i < ps.count; i++) { const u = (ps.getY(i) + 1.8) / 3.6, x = ps.getX(i) * (1 - u * .85);
      if (up) ps.setXYZ(i, x, u * 2.6, u * .9); else ps.setXYZ(i, x, 1.1 * u - 2.6 * u * u, u * 3.4); }
    p.rotateY(k / 8 * Math.PI * 2 + (up ? k : 0)); parts.push(p); }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
}
export function buildHorizon(scene, env, waterY) {
  const kind = env.horizon === undefined ? 'hills' : env.horizon; if (!kind) return null;
  const S = HZ[kind] || HZ.hills, D = env.horizonDist ?? 190, r = rnd(env.horizonSeed || 17), grp = new THREE.Group(); grp.name = 'horizon'; grp.position.y = waterY;
  const near = ridge(D, D * 1.45, S.near.H, S.near.c, r), far = ridge(D * 1.35, D * 1.8, S.far.H, S.far.c, r); // 190-340 m: far enough to read as landscape
  grp.add(near, far);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), cc = new THREE.Color();
  const onRing = (u0, u1) => { const a = r() * Math.PI * 2, u = u0 + r() * (u1 - u0), R = D + D * .45 * u; return [Math.sin(a) * R, near.userData.height(a, u), -Math.cos(a) * R]; };
  // tree line: clustered broadleaf crowns along the near shore and on the hills
  if (S.trees) { const geo = lumpy(new THREE.IcosahedronGeometry(1, 1)); geo.translate(0, 1, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, color: '#ffffff' }), S.trees);
    for (let i = 0; i < S.trees; i++) { const [x, y, z] = onRing(.06, i < S.trees * .45 ? .2 : .8), w = .9 + r() * .9, h = 3 + r() * 3.5;
      m4.compose(v.set(x, y - .4, z), q.setFromEuler(e.set(0, r() * 6, 0)), s.set(w, h * .5, w)); im.setMatrixAt(i, m4);
      im.setColorAt(i, cc.set('#2c4720').lerp(C('#4f6b34'), r()).multiplyScalar(.8 + .3 * r())); }
    grp.add(im); }
  if (S.palms) { const trunk = new THREE.CylinderGeometry(.16, .26, 1, 5); trunk.translate(0, .5, 0);
    const ti = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ roughness: 1, color: '#6b5a44' }), S.palms);
    const ci = new THREE.InstancedMesh(frondGeo(), new THREE.MeshStandardMaterial({ roughness: 1, color: '#ffffff', side: THREE.DoubleSide }), S.palms);
    for (let i = 0; i < S.palms; i++) { const [x, y, z] = onRing(.02, kind === 'desert' ? .5 : .16), h = 8 + r() * 5, lean = (r() - .5) * .18;
      q.setFromEuler(e.set(lean, r() * 6, (r() - .5) * .18)); m4.compose(v.set(x, y - .3, z), q, s.set(1, h, 1)); ti.setMatrixAt(i, m4);
      const top = new THREE.Vector3(0, h, 0).applyQuaternion(q).add(v); m4.compose(top, new THREE.Quaternion().setFromEuler(e.set(0, r() * 6, 0)), s.set(1, 1, 1)); ci.setMatrixAt(i, m4);
      ci.setColorAt(i, cc.set('#3c5a26').lerp(C('#5d7a35'), r())); }
    grp.add(ti, ci); }
  // small village: low boxes with flat roofs in two clusters
  if (S.village) { const n = 34, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, color: '#ffffff' }), n);
    const hubs = [r() * 6.283, r() * 6.283];
    for (let i = 0; i < n; i++) { const a = hubs[i % 2] + (r() - .5) * .09, u = .06 + r() * .08, R = D + D * .45 * u, y = near.userData.height(a, u);
      m4.compose(v.set(Math.sin(a) * R, y - .2, -Math.cos(a) * R), q.setFromEuler(e.set(0, -a + (r() - .5) * .3, 0)), s.set(3 + r() * 4, 2.5 + r() * 2.5, 3 + r() * 4));
      im.setMatrixAt(i, m4); im.setColorAt(i, cc.set(S.village[Math.floor(r() * S.village.length)]).multiplyScalar(.9 + .15 * r())); }
    grp.add(im); }
  // aerial perspective: the scene fog, scaled per layer (env.haze, default .75) so far land stays readable but pale and bluish
  const hz = env.haze ?? .55;
  grp.traverse(o => { o.castShadow = false; o.receiveShadow = false; if (!o.material) return;
    o.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>',
      `#ifdef USE_FOG\n float fogFactor = smoothstep( 30.0, 560.0, vFogDepth ) * ${hz.toFixed(3)};\n gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif`); }; });
  scene.add(grp); return grp;
}

// ================= 4. ground cover: instanced grass tufts, pebbles, tiny flowers =================
function bladeTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'), r = rnd(9);
  for (let i = 0; i < 14; i++) { const x0 = 14 + r() * 100, lean = (r() - .5) * 60, h = 70 + r() * 56, w = 3 + r() * 4;
    const gr = g.createLinearGradient(0, 128, 0, 128 - h); gr.addColorStop(0, '#4f6e2c'); gr.addColorStop(.55, '#86ab4e'); gr.addColorStop(1, '#c2d184');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x0 - w, 128); g.quadraticCurveTo(x0 - w * .3 + lean * .3, 128 - h * .55, x0 + lean, 128 - h);
    g.quadraticCurveTo(x0 + w * .3 + lean * .3, 128 - h * .55, x0 + w, 128); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const COVER = { low: 7, medium: 16, high: 30 };
export function buildCover(scene, env, I, exclude = [], aa = 4) {
  const cv = env.cover === undefined ? 'medium' : env.cover; if (!cv) return null;
  const dens = typeof cv === 'number' ? cv : (COVER[cv] ?? 16), W = I.w - .5, D = I.d - .5, area = W * D, r = rnd(env.coverSeed || 23);
  const topY = (x, z) => Math.sin(x * 1.3) * .05 + Math.cos(z * 1.7) * .05;
  const free = (x, z) => !exclude.some(b => x > b[0] && x < b[1] && z > b[2] && z < b[3]);
  const spots = n => { const out = []; for (let k = 0; k < n * 3 && out.length < n; k++) { const x = (r() - .5) * W, z = (r() - .5) * D; if (free(x, z)) out.push([x, topY(x, z), z]); } return out; };
  const grp = new THREE.Group(); grp.name = 'cover';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), cc = new THREE.Color();
  // grass: two crossed quads, up-facing normals (even shading like real turf), alpha-to-coverage edges, wind sway in the vertex shader
  const a = new THREE.PlaneGeometry(1, 1), b = new THREE.PlaneGeometry(1, 1); b.rotateY(Math.PI / 2); const gq = mergeGeometries([a, b]); gq.translate(0, .5, 0);
  const nn = gq.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
  const gm = new THREE.MeshLambertMaterial({ map: bladeTex(), alphaTest: .45, side: THREE.DoubleSide, alphaToCoverage: aa > 0 }); // Lambert: a third of the PBR cost in software GL
  const wind = { value: 0 };
  gm.onBeforeCompile = sh => { sh.uniforms.uWind = wind; // keep the up normal on both faces (a flipped back face would render black)
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replaceAll('*= faceDirection', '*= 1.0')); sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float hk = clamp(position.y, 0., 1.); hk *= hk; vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
    transformed.x += (sin(uWind * 1.9 + ip.x * .7 + ip.y * .5) * .1 + sin(uWind * 4.3 + ip.y * 2.1) * .03) * hk;
    transformed.z += cos(uWind * 1.5 + ip.x * .4) * .06 * hk;`); };
  gm.color.setScalar(env.coverGain ?? 1.3); // Lambert gets no image-based sky light: lift it to match the PBR soil around it
  const gs = spots(Math.min(9000, Math.round(area * dens))), dry = env.coverTint === 'dry';
  const grass = new THREE.InstancedMesh(gq, gm, gs.length);
  gs.forEach(([x, y, z], i) => { const w = .22 + r() * .26; m4.compose(v.set(x, y - .01, z), q.setFromEuler(e.set(0, r() * 3.14, 0)), s.set(w, .1 + r() * .2, w)); grass.setMatrixAt(i, m4);
    const k = r(); grass.setColorAt(i, cc.set(dry ? '#c9b77a' : '#ffffff').lerp(C(dry ? '#9a8a52' : '#d9d27a'), k < .2 ? .8 : k * .3).multiplyScalar(.8 + .3 * r())); });
  grass.receiveShadow = env.coverShadow !== false; grp.add(grass);
  // pebbles
  const ps = spots(Math.round(area * 2.5)), pg = new THREE.DodecahedronGeometry(1, 0);
  const peb = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: new THREE.Color(1.4, 1.4, 1.4) }), ps.length);
  ps.forEach(([x, y, z], i) => { const sz = .015 + r() * r() * .05; m4.compose(v.set(x, y, z), q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), s.set(sz, sz * .6, sz * (.7 + r() * .5))); peb.setMatrixAt(i, m4);
    peb.setColorAt(i, cc.set(['#8a847a', '#a09684', '#6e665c', '#b5aa96'][Math.floor(r() * 4)])); });
  peb.receiveShadow = true; grp.add(peb);
  // tiny wild flowers sitting on the grass
  if (!dry) { const fs = spots(Math.round(area * .9)), fg = new THREE.IcosahedronGeometry(1, 0);
    const fl = new THREE.InstancedMesh(fg, new THREE.MeshLambertMaterial({ color: new THREE.Color(1.3, 1.3, 1.3) }), fs.length);
    fs.forEach(([x, y, z], i) => { const sz = .018 + r() * .014; m4.compose(v.set(x, y + .08 + r() * .14, z), q.identity(), s.set(sz, sz * .6, sz)); fl.setMatrixAt(i, m4);
      fl.setColorAt(i, cc.set(['#f4f1e6', '#f2d24a', '#b48ad8', '#f0f0f0', '#e98a9a'][Math.floor(r() * 5)])); });
    grp.add(fl); }
  grp.traverse(o => { o.castShadow = false; });
  scene.add(grp); V.ticks.push(t => { wind.value = t; });
  return grp;
}

// ================= 5. water: two scrolling wave normal layers, foam ring under the island edge =================
function waveNormals() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N), r = rnd(3);
  const waves = Array.from({ length: 14 }, (_, i) => ({ fx: Math.round((r() - .5) * (4 + i * 2)), fy: Math.round((r() - .5) * (4 + i * 2)) || 1, ph: r() * 6.283, a: 1 / (1 + i * .6) }));
  const h = (x, y) => waves.reduce((s, w) => s + w.a * Math.sin((w.fx * x + w.fy * y) / N * 6.283 + w.ph), 0);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), k = 2.2;
    const nx = -dx * k, ny = -dy * k, l = Math.hypot(nx, ny, 1), o = (y * N + x) * 4;
    img.data[o] = (nx / l * .5 + .5) * 255; img.data[o + 1] = (ny / l * .5 + .5) * 255; img.data[o + 2] = (1 / l * .5 + .5) * 255; img.data[o + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return t;
}
export function upgradeWater(scene, water, env, I) {
  if (!water || env.waves === 0) return;
  const size = water.geometry.parameters.width, mat = water.material, nt = waveNormals(), k = env.waves ?? 1;
  nt.repeat.set(size / 6, size / 6); mat.normalMap = nt; mat.normalScale = new THREE.Vector2(.1 * k, .1 * k);
  mat.roughness = Math.min(mat.roughness, .22); mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1, .9);
  const off2 = { value: new THREE.Vector2() };
  mat.onBeforeCompile = sh => { sh.uniforms.uOff2 = off2; sh.fragmentShader = 'uniform vec2 uOff2;\n' + sh.fragmentShader.replace(
    'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
    'vec3 mapN = normalize( ( texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0 ) + ( texture2D( normalMap, vNormalMapUv * 2.3 + uOff2 ).xyz * 2.0 - 1.0 ) * vec3( .7, .7, 1. ) );'); };
  mat.needsUpdate = true;
  V.ticks.push(t => { nt.offset.set(t * .011, t * .006); off2.value.set(-t * .017, t * .013); });
  if (env.foam === false) return;
  // foam: soft broken white band around the island footprint, gently breathing
  const pad = 2.2, fw = I.w + pad * 2, fd = I.d + pad * 2, c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rnd(12);
  const sx = 512 / fw, sz = 512 / fd, ix = pad * sx, iz = pad * sz;
  for (let i = 0; i < 2600; i++) { const side = Math.floor(r() * 4), u = r(), d = Math.pow(r(), 2.2) * pad * .85; let x, y;
    if (side === 0) { x = ix + u * (512 - 2 * ix); y = iz - d * sz; } else if (side === 1) { x = ix + u * (512 - 2 * ix); y = 512 - iz + d * sz; }
    else if (side === 2) { x = ix - d * sx; y = iz + u * (512 - 2 * iz); } else { x = 512 - ix + d * sx; y = iz + u * (512 - 2 * iz); }
    const a = (1 - d / pad) * (.25 + r() * .35); g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, 2 + r() * 7, 1 + r() * 3, r() * 3, 0, 7); g.fill(); }
  const ft = new THREE.CanvasTexture(c); ft.colorSpace = THREE.SRGBColorSpace;
  const fm = new THREE.MeshBasicMaterial({ map: ft, transparent: true, depthWrite: false, opacity: .55, color: '#eef4f6' });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), fm); foam.rotation.x = -Math.PI / 2; foam.position.y = water.position.y + .03; foam.renderOrder = 1; scene.add(foam);
  V.ticks.push(t => { fm.opacity = .45 + .12 * Math.sin(t * 1.3); foam.scale.set(1 + .012 * Math.sin(t * .9), 1 + .012 * Math.sin(t * .9 + 1), 1); });
}

// ================= 6a. sunlit dust / pollen motes drifting near the camera =================
export function buildMotes(scene, env) {
  const k = env.motes ?? 1; if (!k) return;
  const n = Math.round(140 * k), r = rnd(31), base = [], B = [7, 4, 7];
  for (let i = 0; i < n; i++) base.push([r() * B[0], r() * B[1], r() * B[2], .05 + r() * .12, r() * 6.283]);
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ size: .014, map: new THREE.CanvasTexture(c), color: '#fff1cf', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  const fwd = new THREE.Vector3(), wrap = (v, m) => ((v % m) + m) % m;
  V.ticks.push((t, cam) => {
    cam.getWorldDirection(fwd); const o = cam.position.clone().addScaledVector(fwd, 3.2);
    pts.visible = cam.position.y > -1; // hidden in deep underground / inside views
    base.forEach(([x, y, z, sp, ph], i) => { arr[i * 3] = o.x - B[0] / 2 + wrap(x + t * sp * .6 + Math.sin(t * .4 + ph) * .3, B[0]);
      arr[i * 3 + 1] = o.y - B[1] / 2 + wrap(y + t * sp * .25 + Math.sin(t * .7 + ph) * .15, B[1]);
      arr[i * 3 + 2] = o.z - B[2] / 2 + wrap(z - t * sp * .3, B[2]); });
    geo.attributes.position.needsUpdate = true;
  });
}

// ================= 6b. birds flying slow loops far away (assets/models/<Stork|Flamingo|Parrot>.glb, morph-target flap) =================
const WING = { Stork: 2, Flamingo: 1.5, Parrot: .7 };
export async function buildBirds(scene, env) {
  const n = env.birds ?? 3; if (!n) return;
  const names = [].concat(env.birdModel || 'Stork'), L = new GLTFLoader(), gl = {};
  await Promise.all(names.map(async nm => { try { gl[nm] = await L.loadAsync(`/assets/models/${nm}.glb`); } catch (e) { console.warn('bird missing', nm); } }));
  const r = rnd(env.birdSeed || 41);
  for (let i = 0; i < n; i++) { const nm = names[i % names.length], G = gl[nm]; if (!G) continue;
    const o = skClone(G.scene), bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3());
    o.scale.setScalar((WING[nm] || 1.5) / Math.max(sz.x, sz.z)); o.traverse(m => { if (m.isMesh) { m.castShadow = false; m.frustumCulled = false; } });
    const holder = new THREE.Group(), bank = new THREE.Group(); holder.name = 'bird' + i; bank.add(o); holder.add(bank); scene.add(holder);
    const mixer = new THREE.AnimationMixer(o); if (G.animations[0]) mixer.clipAction(G.animations[0]).play();
    const az = (r() - .5) * 1.6, dist = 34 + r() * 20, cx = Math.sin(az) * dist, cz = -Math.cos(az) * dist, cy = 6 + r() * 5; // inside the tree-line ring
    const R = 8 + r() * 7, dir = r() < .5 ? 1 : -1, w = (5 + r() * 3) / R * dir, th0 = r() * 6.283, flap = .8 + r() * .3;
    V.ticks.push(t => { const th = th0 + w * t; holder.position.set(cx + Math.cos(th) * R, cy + Math.sin(t * .5 + th0) * 1.2, cz + Math.sin(th) * R);
      // heading = tangent of the loop (model faces +z), bank into the turn
      holder.rotation.y = Math.atan2(-Math.sin(th) * dir, Math.cos(th) * dir); bank.rotation.z = .28 * dir; // inner wing down
      mixer.setTime((t + i * .37) * flap); });
  }
}

// ================= 7. handheld micro-motion (about 1 cm), layered on the continuous camera =================
export function handheld(camera, t, k = 1) {
  if (!k) return;
  const n = (a, b, c) => Math.sin(t * a + c) * .6 + Math.sin(t * b + c * 1.7) * .4;
  camera.position.x += n(.9, 2.3, 0) * .01 * k; camera.position.y += n(1.1, 2.9, 2) * .008 * k; camera.position.z += n(.7, 1.9, 4) * .006 * k;
  camera.rotateX(n(.8, 2.1, 1) * .0012 * k); camera.rotateY(n(.6, 1.7, 3) * .0012 * k); camera.rotateZ(n(.5, 1.3, 5) * .0009 * k);
}

// texture filtering helper: anisotropic filtering on every map the scene uses
export function sharpenTextures(scene, renderer, want = 8) {
  const max = Math.min(want, renderer.capabilities.getMaxAnisotropy()); if (max <= 1) return;
  scene.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k] && m[k].anisotropy < max) { m[k].anisotropy = max; m[k].needsUpdate = true; } });
}
