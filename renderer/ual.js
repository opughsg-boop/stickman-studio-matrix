// Universal Animation Library (Quaternius, CC0; assets/lib/ual) -> modular people (Farmer & co).
// The UAL clips are baked onto the target skeleton by bone name (assets/lib/ual/farmer_bone_map.json).
// Retarget in world space with rest-pose correction: both rigs are compared in a T-pose
// (the source at the first frame of its T-pose clip, the target at its bind pose, which is a T-pose), so
//   targetWorld(t) = A * sourceWorld(t) * inv(sourceRefWorld) * inv(A) * targetRestWorld
// (A = yaw that turns the source facing onto the target facing), then local = inv(parentWorld) * targetWorld.
// The pelvis translation is scaled by the hip-height ratio so the feet stay on the ground at the target's size.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

export const UAL_MODEL = 'ual/UAL1_Standard';
export const UAL = { gltf: null, map: null, cache: new Map() };
const san = n => THREE.PropertyBinding.sanitizeNodeName(n);
const REF_CLIP = 'A_TPose', FPS = 30;

export async function loadUALMap() {
  if (!UAL.map) UAL.map = await (await fetch('/assets/lib/ual/farmer_bone_map.json')).json();
  return UAL.map;
}
export const ualHas = n => !!UAL.gltf?.animations.find(c => c.name === n);

// pose a rig with clip c at time tt (or leave the bind pose when c is null) and read world data of the named bones
function sample(rig, mixer, c, tt, names) {
  mixer.stopAllAction(); rig.traverse(b => { if (b.isBone && b.userData.rest) { b.quaternion.copy(b.userData.rest[0]); b.position.copy(b.userData.rest[1]); } });
  if (c) { const a = mixer.clipAction(c); a.play(); mixer.setTime(tt); }
  rig.updateMatrixWorld(true);
  const out = {}; for (const n of names) { const b = rig.getObjectByName(n); if (b) out[n] = { q: b.getWorldQuaternion(new THREE.Quaternion()), p: b.getWorldPosition(new THREE.Vector3()) }; }
  return out;
}
const remember = rig => rig.traverse(b => { if (b.isBone) b.userData.rest = [b.quaternion.clone(), b.position.clone()]; });
const fwdYaw = (w, foot, ball) => { const d = w[ball].p.clone().sub(w[foot].p); return Math.atan2(d.x, d.z); };

// bake one UAL clip onto the target model's skeleton (targetGltf = the loaded gltf of e.g. modular_men/Farmer); cached per model+clip
export function ualClip(targetKey, targetGltf, clipName) {
  const key = targetKey + '|' + clipName; if (UAL.cache.has(key)) return UAL.cache.get(key);
  const src = UAL.gltf, map = UAL.map; if (!src || !map) return null;
  const clip = src.animations.find(c => c.name === clipName), ref = src.animations.find(c => c.name === REF_CLIP);
  if (!clip) { console.warn('[ual] no clip ' + clipName); return null; }
  const sRig = skClone(src.scene), tRig = skClone(targetGltf.scene); remember(sRig); remember(tRig);
  const pairs = Object.entries(map).filter(([k]) => !k.startsWith('_')).map(([s, t]) => [san(s), san(t)])
    .filter(([s, t]) => sRig.getObjectByName(s) && tRig.getObjectByName(t));
  const sNames = pairs.map(p => p[0]), tNames = pairs.map(p => p[1]), s2t = Object.fromEntries(pairs);
  const sm = new THREE.AnimationMixer(sRig), tm = new THREE.AnimationMixer(tRig);
  const sRef = sample(sRig, sm, ref || null, 0, sNames), tRest = sample(tRig, tm, null, 0, tNames);
  // facing: toes direction (foot -> ball) in each rig
  const yaw = fwdYaw(tRest, s2t.foot_l, s2t.ball_l) - fwdYaw(sRef, 'foot_l', 'ball_l');
  const A = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), Ai = A.clone().invert();
  // hip heights above the ball of the foot -> translation scale
  const hS = sRef.pelvis.p.y - Math.min(sRef.ball_l.p.y, sRef.ball_r.p.y), hT = tRest[s2t.pelvis].p.y - Math.min(tRest[s2t.ball_l].p.y, tRest[s2t.ball_r].p.y);
  const k = hT / Math.max(1e-6, hS);
  // target bones parent-first
  const depth = n => { let d = 0, o = tRig.getObjectByName(n); while (o.parent) { d++; o = o.parent; } return d; };
  const order = pairs.slice().sort((a, b) => depth(a[1]) - depth(b[1]));
  const hips = tRig.getObjectByName(s2t.pelvis);
  const n = Math.max(2, Math.round(clip.duration * FPS) + 1), times = new Float32Array(n);
  const qv = Object.fromEntries(tNames.map(t => [t, new Float32Array(n * 4)])), pv = new Float32Array(n * 3), clear = new Float32Array(n);
  const tmpQ = new THREE.Quaternion(), pq = new THREE.Quaternion(), V = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const tt = Math.min(clip.duration, i / FPS); times[i] = tt;
    const sw = sample(sRig, sm, clip, tt, sNames);
    tRig.traverse(b => { if (b.isBone && b.userData.rest) { b.quaternion.copy(b.userData.rest[0]); b.position.copy(b.userData.rest[1]); } });
    // pelvis translation: delta from the reference pose, turned to the target facing, scaled to its size
    V.copy(sw.pelvis.p).sub(sRef.pelvis.p).applyQuaternion(A).multiplyScalar(k).add(tRest[s2t.pelvis].p);
    hips.parent.updateMatrixWorld(true); hips.position.copy(hips.parent.worldToLocal(V.clone()));
    for (const [s, t] of order) {
      const b = tRig.getObjectByName(t);
      const delta = tmpQ.copy(sw[s].q).multiply(sRef[s].q.clone().invert()); // source world delta from its T-pose
      const tw = A.clone().multiply(delta).multiply(Ai).multiply(tRest[t].q);
      b.parent.getWorldQuaternion(pq); b.quaternion.copy(pq.invert().multiply(tw)); b.updateMatrixWorld(true);
      const arr = qv[t], j = i * 4; const q = b.quaternion;
      if (i > 0 && arr[j - 4] * q.x + arr[j - 3] * q.y + arr[j - 2] * q.z + arr[j - 1] * q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w); // keep slerp short
      arr[j] = q.x; arr[j + 1] = q.y; arr[j + 2] = q.z; arr[j + 3] = q.w;
    }
    // ground lock: leg proportions differ, so the same joint angles put the target's feet higher or lower than the source's.
    // Shift the hips so the lowest foot point (ankle or ball) clears its rest height by the same (scaled) amount as in the source.
    let dS = 1e9, dT = 1e9;
    for (const s of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) { const t = s2t[s];
      dS = Math.min(dS, (sw[s].p.y - sRef[s].p.y) * k); dT = Math.min(dT, tRig.getObjectByName(t).getWorldPosition(V).y - tRest[t].p.y); }
    clear[i] = dS; hips.getWorldPosition(V); V.y += dS - dT; hips.position.copy(hips.parent.worldToLocal(V)); hips.updateMatrixWorld(true);
    pv[i * 3] = hips.position.x; pv[i * 3 + 1] = hips.position.y; pv[i * 3 + 2] = hips.position.z;
  }
  const tracks = tNames.map(t => new THREE.QuaternionKeyframeTrack(t + '.quaternion', times, qv[t]));
  tracks.push(new THREE.VectorKeyframeTrack(hips.name + '.position', times, pv));
  const out = new THREE.AnimationClip(clipName, clip.duration, tracks);
  out.userData = { loop: /_Loop$/.test(clipName), clear, fps: FPS, feet: ['foot_l', 'foot_r', 'ball_l', 'ball_r'].map(b => s2t[b]), hips: hips.name };
  UAL.cache.set(key, out); return out;
}

// runtime ground lock while two clips cross-fade (blended hips height and blended leg angles disagree, so the feet would sink or float):
// shift the hips so the lowest foot point clears its rest height by the blend of what each clip wants.
export function ualGroundLock(o, rest, parts) { // parts = [[clip, time, weight], ...]; rest = { boneName: restY in o space }
  let want = 0, wsum = 0; for (const [c, tt, w] of parts) { const u = c.userData, i = Math.min(u.clear.length - 1, Math.round(tt * u.fps)); want += u.clear[i] * w; wsum += w; }
  want /= Math.max(1e-6, wsum); const u = parts[0][0].userData, V = new THREE.Vector3(); o.updateMatrixWorld(true);
  let got = 1e9; for (const n of u.feet) { const b = o.getObjectByName(n); if (b) got = Math.min(got, o.worldToLocal(b.getWorldPosition(V)).y - rest[n]); }
  const hips = o.getObjectByName(u.hips); if (!hips || got > 1e8) return;
  o.worldToLocal(hips.getWorldPosition(V)); V.y += want - got; o.localToWorld(V); hips.position.copy(hips.parent.worldToLocal(V));
}
export function ualRestFeet(o, names) { o.updateMatrixWorld(true); const V = new THREE.Vector3(), r = {}; for (const n of names) { const b = o.getObjectByName(n); if (b) r[n] = o.worldToLocal(b.getWorldPosition(V)).y; } return r; }
