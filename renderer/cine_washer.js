// Washing machine story props for the glossy toy look (cine engine). Real sizes in metres.
// washboard, bucket, foam, scrub (arm + cloth on the board), thor (1908 tub washer), drum (front-loader drum with clothes + water),
// spinarrow (wordless curved arrow), spinner (salad spinner). Everything is a pure function of time via userData.tick(lt).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gloss, realMat } from './cine_ref.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeIO = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
function rnd(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function displace(geo, f) { const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v, i); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); return geo; }
const V2 = (x, y) => new THREE.Vector2(x, y), Y = new THREE.Vector3(0, 1, 0);
const _t = {};
function canvasTex(key, size, draw, srgb) { if (_t[key]) return _t[key]; const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size, rnd(key.length * 131 + 7));
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return _t[key] = t; }
const rep = (t, x, y = x) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
// materials
const metal = (c = '#b9c1c7', r = .3) => new THREE.MeshPhysicalMaterial({ color: c, metalness: .85, roughness: r, clearcoat: .3, clearcoatRoughness: .2 });
const water = (o = .6) => new THREE.MeshPhysicalMaterial({ color: '#a9cbd8', roughness: .04, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: o, ior: 1.33, depthWrite: false });
const staves = c => canvasTex('staves' + c, 512, (g, S, r) => { const n = 12, w = S / n, base = new THREE.Color(c);
  for (let i = 0; i < n; i++) { const k = .85 + r() * .3; g.fillStyle = '#' + base.clone().multiplyScalar(k).getHexString(); g.fillRect(i * w, 0, w, S);
    for (let j = 0; j < 14; j++) { g.strokeStyle = `rgba(${r() < .5 ? '70,35,10' : '240,180,120'},${.08 + r() * .12})`; g.lineWidth = .6 + r() * 1.5; const x = i * w + r() * w; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= S; y += 32) g.lineTo(x + Math.sin(y * .02 + j) * 2.5, y); g.stroke(); }
    g.fillStyle = 'rgba(50,22,6,.6)'; g.fillRect(i * w, 0, 2.5, S); } }, true);
const wood = (c = '#a8662f', rx = 1, ry = 1) => new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: rep(staves(c), rx, ry), roughness: .45, clearcoat: .6, clearcoatRoughness: .18 });
const holes = (cols = 8, rows = 8, slot = false) => canvasTex(`holes${cols}x${rows}${slot}`, 512, (g, S) => { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.fillStyle = '#000';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = (i + .5 + (j % 2) * .5) * S / cols, y = (j + .5) * S / rows;
    if (slot) g.fillRect(x - S / cols * .14, y - S / rows * .36, S / cols * .28, S / rows * .72); else { g.beginPath(); g.arc(x, y, S / cols * .2, 0, 7); g.fill(); } } });
// cloth blob (crumpled garment) - displaced sphere, flattened
const clothBlob = (r, c, seed) => { const R = rnd(seed), k = [R() * 9, R() * 9, R() * 9];
  const geo = displace(new THREE.SphereGeometry(r, 24, 16), v => { const n = v.clone().normalize(); v.multiplyScalar(1 + .22 * Math.sin(n.x * 5 + k[0]) * Math.cos(n.y * 4 + k[1]) + .1 * Math.sin(n.z * 11 + k[2])); v.y *= .55; });
  return new THREE.Mesh(geo, realMat('fabric', c, { rep: 2, sheen: '#ffffff' })); };
const CLOTHES = ['#e84a5f', '#2f7de1', '#f2c14e', '#f4f1ea', '#4caf7a', '#8e5cc9', '#ff8a3d', '#3a4a6b'];
// spin profile: p.omega = [[t, omega], ...] piecewise-linear angular speed (rad/s) -> angle by exact integration
function spinFn(keys = [[0, 0]]) { const K = keys.length ? keys : [[0, 0]];
  const om = t => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [a, wa] = K[i - 1], [b, wb] = K[i]; return wa + (wb - wa) * (t - a) / (b - a); } return K[K.length - 1][1]; };
  const ang = t => { if (t <= K[0][0]) return K[0][1] * t; let s = K[0][1] * K[0][0];
    for (let i = 1; i < K.length; i++) { const [a, wa] = K[i - 1], [b, wb] = K[i]; if (t <= b) { const wt = wa + (wb - wa) * (t - a) / (b - a); return s + (wa + wt) / 2 * (t - a); } s += (wa + wb) / 2 * (b - a); }
    return s + K[K.length - 1][1] * (t - K[K.length - 1][0]); };
  return { om, ang }; }
// recycled droplets with motion blur (stretched along velocity for a 1/30 s shutter)
function blurDrop(M, P, vel, r, Q, Sc) { const sp = vel.length(); Q.setFromUnitVectors(Y, sp > 1e-6 ? vel.clone().normalize() : Y); M.compose(P, Q, Sc.set(r, r * (1 + Math.min(8, sp / 30 / (2 * r)) * .6), r)); }

export const WASHER_PROPS = {
  // galvanised wash bucket (real ~40 cm across, 30 cm tall) with water
  bucket: p => { const g = new THREE.Group(), m = metal('#aeb6bb', .38), R = p.r || .2, H = p.h || .3;
    const shell = new THREE.Mesh(new THREE.LatheGeometry([V2(0, .004), V2(R * .85, .004), V2(R * .87, .012), V2(R, H), V2(R * 1.01, H + .004)], 72), m); shell.material.side = THREE.DoubleSide; g.add(shell);
    for (const y of [.25, .62]) { const rr = R * (.87 + .13 * y), t = new THREE.Mesh(new THREE.TorusGeometry(rr + .003, .0045, 10, 72), m); t.rotation.x = Math.PI / 2; t.position.y = H * y; g.add(t); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, .0065, 12, 72), m); rim.rotation.x = Math.PI / 2; rim.position.y = H + .003; g.add(rim);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, .004, 8, 48, Math.PI), metal('#8d959a', .3)); handle.position.y = H * .9; handle.rotation.y = Math.PI / 2; handle.rotation.z = -.6; g.add(handle);
    const w = new THREE.Mesh(new THREE.CircleGeometry(R * .97, 64), water(.75)); w.rotation.x = -Math.PI / 2; w.position.y = H * (p.fill ?? .75); g.add(w);
    g.userData.tick = lt => { w.position.y = H * (p.fill ?? .75) + .002 * Math.sin(lt * 3); };
    return g; },
  // soap foam: iridescent bubbles of mixed sizes heaped on a surface (local XZ plane), gentle breathing
  foam: p => { const g = new THREE.Group(), R = rnd(p.seed || 5), n = p.count || 140, [ax, az] = p.area || [.15, .15];
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .08, clearcoat: 1, clearcoatRoughness: .03, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 600], transparent: true, opacity: .42, depthWrite: false }), n);
    im.castShadow = false; im.frustumCulled = false; g.add(im);
    const B = Array.from({ length: n }, () => { const a = R() * 6.28, d = Math.sqrt(R()), r = .002 + Math.pow(R(), 2.6) * (p.rMax || .014); return { x: Math.cos(a) * d * ax, z: Math.sin(a) * d * az, y: r * .6 + (1 - d) * (p.heap || .02) * R(), r, ph: R() * 6 }; });
    const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    g.userData.tick = lt => { B.forEach((b, i) => { const s = b.r * (1 + .06 * Math.sin(lt * 2.5 + b.ph)); M.compose(P.set(b.x, b.y, b.z), Q, S.set(s, s, s)); im.setMatrixAt(i, M); }); im.instanceMatrix.needsUpdate = true; };
    return g; },
  // wooden washboard (real ~30 x 60 cm) with a corrugated zinc panel; origin at the bottom centre, board face +z
  washboard: p => { const g = new THREE.Group(), wm = wood('#b0713a', .4, 1), zinc = metal('#c3cacd', .28), W = .3, H = .6;
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new RoundedBoxGeometry(.035, H, .028, 3, .008), wm); post.position.set(s * (W / 2 - .0175), H / 2, 0); g.add(post); }
    const top = new THREE.Mesh(new RoundedBoxGeometry(W, .1, .024, 3, .008), wm); top.position.y = H - .06; g.add(top);
    const bot = new THREE.Mesh(new RoundedBoxGeometry(W - .05, .035, .022, 3, .006), wm); bot.position.y = .09; g.add(bot);
    const ribs = displace(new THREE.PlaneGeometry(W - .07, .36, 2, 360), v => { v.z = .005 * Math.sin((v.y + .18) / .012 * Math.PI * 2); });
    const panel = new THREE.Mesh(ribs, zinc); panel.position.y = .29; g.add(panel);
    return g; },
  // forearm + hand scrubbing a wet cloth up and down the washboard (frame = washboard frame: face +z, up +y)
  scrub: p => { const g = new THREE.Group(), skin = realMat('skin', p.skin || '#d9967a'), sleeve = realMat('fabric', p.shirt || '#c9d7e8', { sheen: '#ffffff' });
    const cg = new THREE.PlaneGeometry(.24, .26, 48, 48), base = cg.attributes.position.array.slice();
    const cloth = new THREE.Mesh(cg, realMat('fabric', p.cloth || '#e84a5f', { rep: 2 })); cloth.material.side = THREE.DoubleSide; g.add(cloth);
    const hand = new THREE.Group(); g.add(hand);
    const palm = new THREE.Mesh(new RoundedBoxGeometry(.078, .088, .028, 4, .012), skin); hand.add(palm);
    [[-.027, .07], [-.009, .078], [.009, .075], [.027, .062]].forEach(([x, L]) => { const f = new THREE.Group(); f.position.set(x, .044, -.002); f.rotation.x = -.18; hand.add(f);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(.0088, L * .55, 6, 12), skin); a.position.y = L * .32; f.add(a); });
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.0105, .042, 6, 12), skin); th.position.set(-.05, -.008, .004); th.rotation.z = .9; hand.add(th);
    const dir = new THREE.Vector3(...(p.armDir || [.75, -.45, .5])).normalize(), fa = new THREE.Mesh(new THREE.CylinderGeometry(.04, .03, 1, 28), skin), el = new THREE.Mesh(new THREE.SphereGeometry(.04, 24, 16), skin);
    const roll = new THREE.Mesh(new THREE.TorusGeometry(.046, .016, 12, 32), sleeve), ua = new THREE.Mesh(new THREE.CylinderGeometry(.055, .047, 1, 28), sleeve); g.add(fa, el, roll, ua);
    const ua2 = new THREE.Vector3(...(p.upperDir || [.6, .5, .62])).normalize();
    // drips running down from the cloth's lower edge
    const nd = 26, dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: '#d8eef8', roughness: .04, clearcoat: 1, transparent: true, opacity: .8 }), nd); dm.frustumCulled = false; g.add(dm);
    const RD = rnd(17), D = Array.from({ length: nd }, () => ({ x: (RD() - .5) * .2, ph: RD(), r: .002 + RD() * .003, L: .5 + RD() * .4 }));
    const yc = p.y ?? .32, amp = p.amp ?? .085, f = p.freq ?? 1.2, M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), I = new THREE.Quaternion();
    g.userData.tick = lt => { const s = Math.sin(lt * Math.PI * 2 * f), hy = yc + amp * s, cy = yc + amp * .45 * s, push = Math.cos(lt * Math.PI * 2 * f);
      const a = cg.attributes.position; for (let i = 0; i < a.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], dh = (y + cy - hy) ; // bunch up ahead of the hand
        const wr = .006 * Math.sin(x * 60 + y * 25) + .004 * Math.sin(y * 90 - lt * 2) + .012 * Math.exp(-Math.pow((dh - .06 * Math.sign(push)) / .03, 2)) * Math.abs(push);
        a.setXYZ(i, x * (1 - .04 * Math.abs(push)), y + cy, .012 + wr + .006 * (Math.abs(x) > .1 ? (Math.abs(x) - .1) * 30 : 0)); }
      a.needsUpdate = true; cg.computeVertexNormals();
      hand.position.set(0, hy, .045); hand.rotation.set(.05, 0, -.12 + .05 * s);
      const wrist = new THREE.Vector3(.005, hy - .05, .05), elbow = wrist.clone().addScaledVector(dir, .26), sh = elbow.clone().addScaledVector(ua2, .3);
      const put = (m, A, B) => { const d = B.clone().sub(A), L = d.length(); m.position.copy(A).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(Y, d.normalize()); m.scale.set(1, L, 1); };
      put(fa, wrist, elbow); el.position.copy(elbow); put(ua, elbow, sh); roll.position.copy(elbow).addScaledVector(dir, -.01); roll.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      D.forEach((q, i) => { const u = ((lt / q.L + q.ph) % 1); P.set(q.x, cy - .13 - u * .22, .016); const sc = q.r * (u < .9 ? 1 : (1 - u) * 10); M.compose(P, I, S.set(sc, sc * 1.6, sc)); dm.setMatrixAt(i, M); }); dm.instanceMatrix.needsUpdate = true; };
    return g; },
  // 1908-style electric tub washer (Thor-type): wooden stave tub on cast-iron legs, motor and pulley, wringer rollers with a crank (real ~1.05 m tall)
  thor: p => { const g = new THREE.Group(), iron = new THREE.MeshPhysicalMaterial({ color: '#1d1f22', roughness: .35, metalness: .6, clearcoat: .6 }), band = metal('#4d5257', .32);
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, l = new THREE.Mesh(new THREE.CylinderGeometry(.018, .026, .42, 16), iron); l.position.set(Math.cos(a) * .2, .21, Math.sin(a) * .2); g.add(l);
      const ft = new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 10), iron); ft.scale.y = .5; ft.position.set(Math.cos(a) * .2, .01, Math.sin(a) * .2); g.add(ft); }
    const brace = new THREE.Mesh(new THREE.TorusGeometry(.2, .009, 10, 48), iron); brace.rotation.x = Math.PI / 2; brace.position.y = .16; g.add(brace);
    const tub = new THREE.Mesh(new THREE.LatheGeometry([V2(0, .42), V2(.25, .42), V2(.268, .5), V2(.28, .63), V2(.272, .78), V2(.262, .84), V2(.24, .845)], 64), wood('#a8622c', 1, 1)); g.add(tub);
    for (const [y, r] of [[.48, .266], [.63, .283], [.79, .272]]) { const h = new THREE.Mesh(new THREE.TorusGeometry(r, .007, 10, 72), band); h.rotation.x = Math.PI / 2; h.position.y = y; g.add(h); }
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.266, .266, .022, 64), wood('#9a5626', 1, .2)); lid.position.y = .85; g.add(lid);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, .07, 32), iron); hub.position.y = .895; g.add(hub);
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .012, 24), band); gear.position.y = .935; g.add(gear);
    for (let k = 0; k < 24; k++) { const tth = new THREE.Mesh(new THREE.BoxGeometry(.012, .012, .014), band); const a = k / 24 * Math.PI * 2; tth.position.set(Math.cos(a) * .08, 0, Math.sin(a) * .08); tth.rotation.y = -a; gear.add(tth); }
    // wringer at the back: two posts, two cream rubber rollers, crank on the right
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new RoundedBoxGeometry(.032, .26, .036, 3, .008), iron); post.position.set(s * .21, .97, -.2); g.add(post); }
    const rollers = [.95, 1.018].map(y => { const r = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, .39, 32), new THREE.MeshPhysicalMaterial({ color: '#efe3c8', roughness: .55, clearcoat: .3 })); r.rotation.z = Math.PI / 2; r.position.set(0, y, -.2); g.add(r); return r; });
    const capb = new THREE.Mesh(new RoundedBoxGeometry(.46, .03, .05, 3, .01), iron); capb.position.set(0, 1.105, -.2); g.add(capb);
    const crank = new THREE.Group(); crank.position.set(.235, .95, -.2); g.add(crank);
    const carm = new THREE.Mesh(new RoundedBoxGeometry(.014, .11, .016, 2, .005), iron); carm.position.y = .05; crank.add(carm);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .06, 16), wood('#7a3e18', .2, .2)); knob.rotation.z = Math.PI / 2; knob.position.set(.035, .1, 0); crank.add(knob);
    // electric motor under the tub with a spinning pulley and a drive belt
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .2, 32), gloss('#2f5d46', { rough: .3 })); motor.rotation.z = Math.PI / 2; motor.position.set(0, .14, .02); g.add(motor);
    for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(.075, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), band); cap.scale.y = .35; cap.rotation.z = -s * Math.PI / 2; cap.position.set(s * .1, .14, .02); g.add(cap); }
    const pul = new THREE.Group(); pul.position.set(.13, .14, .02); g.add(pul);
    const pd = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .022, 32), band); pd.rotation.z = Math.PI / 2; pul.add(pd);
    for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.024, .07, .008), iron); sp.rotation.x = k * Math.PI / 3; sp.position.x = .013; pul.add(sp); }
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1, .006, 8, 48), iron); belt.scale.set(.05, .17, 1); belt.rotation.y = Math.PI / 2; belt.position.set(.14, .28, .02); g.add(belt);
    const top = new THREE.Group(); [tub, lid, hub, gear].forEach(m => top.add(m)); g.add(top);
    g.userData.tick = lt => { pul.rotation.x = lt * 14; gear.rotation.y = Math.sin(lt * 4) * .9; crank.rotation.x = -lt * 2.2; rollers[0].rotation.x = lt * 1.6; rollers[1].rotation.x = -lt * 1.6;
      top.position.set(.0012 * Math.sin(lt * 61), .0008 * Math.sin(lt * 47), .0012 * Math.cos(lt * 53)); };
    return g; },
  // front-loader drum (real ~50 cm across, 30 cm deep), axis +z (door at +z), centre at the origin.
  // p.omega = [[t, omega]...], clothes press to the wall as omega rises, water drains after p.drainAt and flies out of the holes as droplets.
  // p.load = number of garments, p.pressMax caps the pressing (overloaded drum), p.wobble shakes an unbalanced drum.
  drum: p => { const g = new THREE.Group(), body = new THREE.Group(), rot = new THREE.Group(); g.add(body); body.add(rot);
    const R = .25, Dp = .3, steel = metal('#cfd6db', .25), sp = spinFn(p.omega);
    const shellM = new THREE.MeshPhysicalMaterial({ color: '#d7dee3', metalness: .7, roughness: .25, clearcoat: .5, transparent: true, opacity: p.shellOpacity ?? .42, alphaMap: rep(holes(10, 6), 8, 2), side: THREE.DoubleSide, depthWrite: false });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Dp, 72, 1, true), shellM); shell.rotation.x = Math.PI / 2; rot.add(shell);
    const back = new THREE.Mesh(new THREE.CircleGeometry(R, 64), steel); back.position.z = -Dp / 2; rot.add(back);
    for (let k = 0; k < 3; k++) { const lf = new THREE.Mesh(new RoundedBoxGeometry(.035, .03, Dp * .9, 3, .01), steel); const a = k * Math.PI * 2 / 3; lf.position.set(Math.cos(a) * (R - .016), Math.sin(a) * (R - .016), 0); lf.rotation.z = a; rot.add(lf); }
    const rimB = new THREE.Mesh(new THREE.TorusGeometry(R, .008, 10, 72), steel); rimB.position.z = -Dp / 2; rot.add(rimB);
    const rimF = new THREE.Mesh(new THREE.TorusGeometry(R, .012, 12, 72), steel); rimF.position.z = Dp / 2; rot.add(rimF);
    const door = new THREE.Mesh(new THREE.TorusGeometry(R * .86, .028, 16, 72), gloss('#f2f2ef', { rough: .3 })); door.position.z = Dp / 2 + .03; body.add(door);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(R * .86, 48, 16, 0, Math.PI * 2, 0, .5), new THREE.MeshPhysicalMaterial({ color: '#e8f4ff', roughness: .03, clearcoat: 1, transparent: true, opacity: .12, depthWrite: false }));
    glass.rotation.x = Math.PI / 2; glass.position.z = Dp / 2 + .03 - R * .86 * Math.cos(.5); body.add(glass);
    const cradle = new THREE.Mesh(new RoundedBoxGeometry(.36, .07, .32, 4, .02), gloss('#f2f2ef', { rough: .35 })); cradle.position.y = -R - .02; body.add(cradle);
    // garments
    const RC = rnd(p.seed || 3), n = p.load || 8, big = p.loadSize || 1, cl = Array.from({ length: n }, (_, i) => { const r = (.05 + RC() * .03) * big, m = clothBlob(r, CLOTHES[(i + (p.seed || 0)) % CLOTHES.length], i * 7 + 3); body.add(m);
      return { m, r, off: i / n * Math.PI * 2 + RC() * .4, z: (RC() - .5) * Dp * .6, tb: -Math.PI / 2 + (RC() - .5) * 1.5, tr: R * (.35 + RC() * .45), ph: RC() * 6, sp: RC() * 3 }; });
    const pool = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16), water(.55)); pool.scale.set(R * .75, .045, Dp * .45); body.add(pool);
    // droplets flung out of the holes
    const nd = p.drops ?? 260, dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: '#d4ecf7', roughness: .04, clearcoat: 1, transparent: true, opacity: .82 }), Math.max(1, nd));
    dm.count = nd; dm.frustumCulled = false; dm.castShadow = false; g.add(dm); // count 0: never draw the unset identity instance
    const RD = rnd(29), D = Array.from({ length: nd }, (_, i) => ({ ph: i / nd + RD() * .01, a: RD() * Math.PI * 2, z: (RD() - .5) * Dp * .8, r: .0015 + Math.pow(RD(), 2) * .004, life: .35 + RD() * .3, rad: .2 + RD() * .5 }));
    const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), vel = new THREE.Vector3(), E = new THREE.Euler();
    const drain = p.drainAt ?? 1e9, thr = p.dropMin ?? 5, pmax = p.pressMax ?? 1, wob = p.wobble || 0;
    g.userData.tick = lt => { const phi = sp.ang(lt), om = sp.om(lt), pr = Math.min(pmax, easeIO((om - 2) / 5)); rot.rotation.z = phi;
      body.position.set(wob * .012 * Math.sin(phi), wob * .008 * Math.cos(phi * 1.0) + wob * .004 * Math.sin(lt * 23), 0); body.rotation.z = wob * .015 * Math.sin(phi + .7);
      cl.forEach((c, i) => { const ta = c.tb + .45 * Math.sin(phi * .8 + c.ph) * (1 - pr), tr = c.tr + .03 * Math.sin(phi + c.ph);
        const tx = Math.cos(ta) * tr, ty = Math.sin(ta) * tr, pa = phi + c.off, prr = R - c.r * .55 - .01, px = Math.cos(pa) * prr, py = Math.sin(pa) * prr;
        c.m.position.set(tx + (px - tx) * pr, ty + (py - ty) * pr, c.z); c.m.rotation.set(c.sp + phi * .3 * (1 - pr), c.ph, pa * pr + Math.sin(phi * .5 + c.ph) * (1 - pr));
        const flat = 1 - .35 * pr; c.m.scale.set(1, flat, 1); });
      const wl = 1 - easeIO((lt - drain) / 1.6); pool.visible = wl > .02; pool.scale.set(R * .75 * (.6 + .4 * wl), .045 * wl, Dp * .45); pool.position.y = -R + .03 * wl;
      D.forEach((d, i) => { const age = ((lt / d.life + d.ph) % 1) * d.life, b = lt - age; if (b < drain || sp.om(b) < thr) { M.makeScale(0, 0, 0); dm.setMatrixAt(i, M); return; }
        const a0 = sp.ang(b) + d.a, w = sp.om(b), vt = w * R * .55, vr = .25 + d.rad * .5, ca = Math.cos(a0), sa = Math.sin(a0);
        const vx = -sa * vt + ca * vr, vy = ca * vt + sa * vr; P.set(ca * R + vx * age, sa * R + vy * age - 4.9 * age * age * .5, d.z); vel.set(vx, vy - 4.9 * age, 0);
        P.add(body.position); blurDrop(M, P, vel, d.r, Q, S); dm.setMatrixAt(i, M); }); dm.instanceMatrix.needsUpdate = true; };
    return g; },
  // wordless curved arrow showing the spin direction (glossy, rotates about +z), pops in at p.popAt
  spinarrow: p => { const g = new THREE.Group(), inner = new THREE.Group(), m = gloss(p.color || '#ffc22e', { rough: .25 }), r = p.r || .2; g.add(inner);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, p.tube || .012, 14, 96, Math.PI * 1.5), m); inner.add(arc);
    const head = new THREE.Mesh(new THREE.ConeGeometry(.032, .07, 24), m); const a = Math.PI * 1.5; head.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); head.rotation.z = a; inner.add(head);
    const pa = p.popAt ?? 0;
    g.userData.tick = lt => { const u = lt - pa; inner.scale.setScalar(u < 0 ? .001 : u < .35 ? easeOut(u / .35) + .25 * Math.sin(u / .35 * Math.PI) : 1); inner.rotation.z = (p.speed ?? 2.4) * Math.max(0, u); };
    return g; },
  // salad spinner (real ~27 cm across): clear bowl, slotted green basket with lettuce leaves, water flung to the bowl wall then running down
  spinner: p => { const g = new THREE.Group(), sp = spinFn(p.omega), rot = new THREE.Group(); g.add(rot);
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([V2(0, 0), V2(.085, 0), V2(.1, .008), V2(.124, .06), V2(.134, .125), V2(.137, .14)], 72),
      new THREE.MeshPhysicalMaterial({ color: '#eef7ff', roughness: .04, clearcoat: 1, transparent: true, opacity: .26, side: THREE.DoubleSide, depthWrite: false })); g.add(bowl);
    const foot = new THREE.Mesh(new THREE.TorusGeometry(.086, .006, 8, 48), gloss('#3d4a52', { rough: .5 })); foot.rotation.x = Math.PI / 2; foot.position.y = .004; g.add(foot);
    const basket = new THREE.Mesh(new THREE.LatheGeometry([V2(0, .016), V2(.07, .016), V2(.105, .055), V2(.117, .13), V2(.12, .134)], 64),
      new THREE.MeshPhysicalMaterial({ color: '#6cc84a', roughness: .3, clearcoat: .6, alphaMap: rep(holes(24, 6, true), 1, 1), alphaTest: .5, side: THREE.DoubleSide })); rot.add(basket);
    const rimB = new THREE.Mesh(new THREE.TorusGeometry(.12, .005, 8, 64), gloss('#5bb53a', { rough: .3 })); rimB.rotation.x = Math.PI / 2; rimB.position.y = .134; rot.add(rimB);
    const RL = rnd(41), shades = ['#4fae35', '#68c43f', '#3f9a2c', '#7fd04f'];
    for (let i = 0; i < (p.leaves || 14); i++) { const lg = displace(new THREE.PlaneGeometry(.075, .095, 12, 12), v => { v.z = .012 * Math.sin(v.x * 70 + i) * Math.sin(v.y * 50) + 8 * v.x * v.x; });
      const lf = new THREE.Mesh(lg, gloss(shades[i % 4], { rough: .35, side: THREE.DoubleSide })); const a = i / 14 * Math.PI * 2 + RL() * .3, rr = .05 + RL() * .045;
      lf.position.set(Math.cos(a) * rr, .045 + RL() * .07, Math.sin(a) * rr); lf.rotation.set(RL() * 1.2 - .6, -a + Math.PI / 2, RL() * .8); rot.add(lf); }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(.085, 48), water(.6)); pool.rotation.x = -Math.PI / 2; pool.position.y = .004; g.add(pool);
    const nd = p.drops ?? 160, dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: '#d4ecf7', roughness: .04, clearcoat: 1, transparent: true, opacity: .85 }), nd); dm.frustumCulled = false; g.add(dm);
    const RD = rnd(53), D = Array.from({ length: nd }, (_, i) => ({ ph: i / nd, a: RD() * 6.28, y: .04 + RD() * .08, r: .0012 + Math.pow(RD(), 2) * .0025, life: .55 + RD() * .4 }));
    const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), vel = new THREE.Vector3(), wet = p.wetAt ?? 1e9;
    g.userData.tick = lt => { rot.rotation.y = -sp.ang(lt); pool.scale.setScalar(.2 + .8 * easeOut((lt - wet) / 2.5)); pool.visible = lt > wet;
      D.forEach((d, i) => { const age = ((lt / d.life + d.ph) % 1) * d.life, b = lt - age, w = sp.om(b); if (b < wet || w < 3) { M.makeScale(0, 0, 0); dm.setMatrixAt(i, M); return; }
        const a0 = sp.ang(b) + d.a, fly = .07, ca = Math.cos(a0), sa = Math.sin(a0); let r, y, vr, vy;
        if (age < fly) { const k = age / fly; r = .118 + (.132 - .118) * k; y = d.y + .01 * k; vr = .2 / fly; vy = 0; } else { const k = (age - fly) / (d.life - fly); r = .133 - .045 * k * k; y = d.y + (.008 - d.y) * k * k; vr = 0; vy = -.6 * k; }
        P.set(ca * r, y, sa * r); vel.set(ca * vr, vy, sa * vr); blurDrop(M, P, vel, d.r, Q, S); dm.setMatrixAt(i, M); }); dm.instanceMatrix.needsUpdate = true; };
    return g; },
};
