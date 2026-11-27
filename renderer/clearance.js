// Clearance check (preview only): every object owns a private frame (world AABB from its real mesh) that no other frame may enter.
// Runs inside the render page after the preview stills: pipeline/render.mjs calls checkClearance() when plan.checks.clearance is set
// (or CLEARANCE=1). It only poses objects (window.__pose) and reads meshes; it never renders, so the video output is unchanged.
//   plan.checks.clearance = { margin: .03, allow: [{ a: 'farmer', part: 'hand', b: 'crate', beats: [0], face: 'top' }] }
// Skinned people are measured from their posed vertices (start / middle / end of each beat). Vertices driven mostly by a hand or
// finger bone form separate 'hand_l' / 'hand_r' frames; the rest is the 'body' frame. A hand frame touching an allowed face of an
// allowed object (its lowest point at most faceTol = 6 cm below that top) is a 'contact'; every other intersection is an 'overlap' (= failure), reported with its depth in metres.
import * as THREE from 'three';

const HAND = /(hand|finger|thumb|index|middle|ring|pinky|palm)/i;
const SKIP_TYPES = new Set(['sticker', 'arrow', 'heat']);
const V = new THREE.Vector3();

function meshFlat(m) { // contact-shadow discs and similar decals are not part of an object's frame
  const mt = Array.isArray(m.material) ? m.material[0] : m.material;
  if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
  const s = m.geometry.boundingBox.getSize(V).applyMatrix4(new THREE.Matrix4().extractRotation(m.matrixWorld));
  return mt && mt.transparent && Math.min(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)) < 1e-3;
}

function visibleChain(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

// world-space frames of one object: { body, hand_l, hand_r } (Box3, hands only for skinned people)
function frames(holder) {
  const body = new THREE.Box3(), hand = { hand_l: new THREE.Box3(), hand_r: new THREE.Box3() };
  holder.updateMatrixWorld(true);
  holder.traverse(m => {
    if (!m.isMesh || !m.geometry?.attributes?.position || !visibleChain(m) || meshFlat(m)) return;
    const pos = m.geometry.attributes.position, n = pos.count;
    if (m.isSkinnedMesh) {
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight, bones = m.skeleton.bones;
      const handSide = bones.map(b => HAND.test(b.name) ? (/L(_end)?$|[._]l(_end)?$|[Ll]eft/.test(b.name) ? 'hand_l' : 'hand_r') : null); // loader strips dots: Hand.L -> HandL
      for (let i = 0; i < n; i++) {
        m.getVertexPosition(i, V); V.applyMatrix4(m.matrixWorld);
        let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
        const side = handSide[best]; (side ? hand[side] : body).expandByPoint(V);
      }
    } else if (m.isInstancedMesh) { // grains, crumbs, rain: each live instance's box (instances parked at zero scale are hidden, not solid)
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const IM = new THREE.Matrix4(), bb = new THREE.Box3();
      for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, IM); if (Math.abs(IM.determinant()) < 1e-12) continue;
        bb.copy(m.geometry.boundingBox).applyMatrix4(IM.premultiply(m.matrixWorld)); body.union(bb); }
    } else {
      const step = Math.max(1, Math.floor(n / 20000)); // precise enough, bounded cost on heavy scans
      for (let i = 0; i < n; i += step) { V.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); body.expandByPoint(V); }
    }
  });
  const out = { body };
  for (const k in hand) if (!hand[k].isEmpty()) out[k] = hand[k];
  return body.isEmpty() ? null : out;
}

function inter(a, b, margin) { // overlap of two frames, each grown by margin; depth = smallest axis penetration
  const ax = ['x', 'y', 'z'], d = {}, raw = {};
  for (const k of ax) { const lo = Math.max(a.min[k], b.min[k]), hi = Math.min(a.max[k], b.max[k]); raw[k] = hi - lo; d[k] = raw[k] + 2 * margin; }
  if (!(d.x > 0 && d.y > 0 && d.z > 0)) return null;
  return { depth: Math.min(d.x, d.y, d.z), depthRaw: Math.min(raw.x, raw.y, raw.z), axes: { x: +d.x.toFixed(3), y: +d.y.toFixed(3), z: +d.z.toFixed(3) } };
}
const r3 = x => +x.toFixed(3), box = b => ({ min: [r3(b.min.x), r3(b.min.y), r3(b.min.z)], max: [r3(b.max.x), r3(b.max.y), r3(b.max.z)] });

export function checkClearance(cfg = {}) {
  if (!window.__objects || !window.__pose) return { status: 'unsupported', beats: [] }; // engines without the hooks (cine)
  const margin = cfg.margin ?? .03, allow = cfg.allow || [], faceTol = cfg.faceTol ?? .06;
  const plan = window.__plan(), objs = window.__objects(), types = {};
  for (const b of plan.beats) for (const a of b.add || []) types[a.id] = a.type;
  const list = objs.filter(o => !SKIP_TYPES.has(types[o.id]) && !(cfg.skip || []).includes(o.id));
  const beats = [];
  plan.beats.forEach((b, bi) => {
    const eps = Math.min(.02, (b.end - b.start) / 10), t0 = b.start + eps, t1 = b.end - eps, ns = Math.max(3, cfg.samples || 3) | 1; // odd count keeps the exact middle
    const times = Array.from({ length: ns }, (_, k) => t0 + (t1 - t0) * k / (ns - 1));
    const pairs = new Map(), frameLog = {};
    for (const t of times) {
      window.__pose(t);
      const F = []; for (const o of list) { if (!o.holder.visible) continue; const f = frames(o.holder); if (f) F.push([o.id, f]); }
      if (t === times[(ns - 1) / 2]) for (const [id, f] of F) frameLog[id] = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, box(v)]));
      for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) for (const [A, B] of [[F[i], F[j]], [F[j], F[i]]]) {
        for (const part of Object.keys(A[1])) {
          if (part === 'body' && A === F[j]) continue; // body/body pair counted once
          const hit = inter(A[1][part], B[1].body, margin); if (!hit) continue;
          let kind = 'overlap';
          // pairs (pigeon_coop 2026-11-27): { a, b, kind: 'inside' } = a may sit INSIDE b (a bird in its coop or box: allowed only while a's
          // whole body frame lies within b's frame, 2 cm tolerance); { a, b, kind: 'held' } = a prop carried by that person (broom, jug).
          const pr = (cfg.pairs || []).find(r => ((r.a === A[0] && r.b === B[0]) || (r.a === B[0] && r.b === A[0])) && (!r.beats || r.beats.includes(bi)));
          if (pr?.kind === 'held') kind = 'held';
          else if (pr?.kind === 'inside') { const inn = pr.a === A[0] ? A[1].body : B[1].body, out = pr.a === A[0] ? B[1].body : A[1].body, tol = .02;
            if (inn.min.x >= out.min.x - tol && inn.min.y >= out.min.y - tol && inn.min.z >= out.min.z - tol && inn.max.x <= out.max.x + tol && inn.max.y <= out.max.y + tol && inn.max.z <= out.max.z + tol) kind = 'inside'; }
          if (kind === 'overlap' && part.startsWith('hand')) {
            const rule = allow.find(r => r.a === A[0] && r.b === B[0] && (r.part || 'hand') === 'hand' && (!r.beats || r.beats.includes(bi)));
            const hb = A[1][part], bb = B[1].body;
            const onTop = (rule?.face || 'top') === 'top' && hb.min.y >= bb.max.y - faceTol;  // the hand's lowest point is on the top (at most faceTol below it): resting there, not pushed into a side
            if (rule && onTop) kind = 'contact';
          }
          const key = [A[0], part, B[0], kind].join('|'), prev = pairs.get(key);
          if (!prev) pairs.set(key, { a: A[0], part, b: B[0], kind, depth: r3(hit.depth), depthRaw: r3(hit.depthRaw), axes: hit.axes, times: [r3(t)] });
          else { prev.times.push(r3(t)); if (hit.depth > prev.depth) Object.assign(prev, { depth: r3(hit.depth), depthRaw: r3(hit.depthRaw), axes: hit.axes }); }
        }
      }
    }
    // an allowed contact that never touches is reported too (hands must really land on the surface)
    const missing = allow.filter(r => (!r.beats || r.beats.includes(bi)) && ![...pairs.values()].some(p => p.kind === 'contact' && p.a === r.a && p.b === r.b))
      .map(r => ({ a: r.a, part: r.part || 'hand', b: r.b, kind: 'contact-missing' }));
    const items = [...pairs.values()], overlaps = items.filter(p => p.kind === 'overlap');
    beats.push({ beat: bi, start: r3(b.start), end: r3(b.end), times: times.map(r3), status: overlaps.length ? 'fail' : 'ok',
      overlaps, contacts: items.filter(p => p.kind === 'contact'), allowed: items.filter(p => p.kind === 'inside' || p.kind === 'held').map(p => `${p.kind} ${p.a}/${p.b}`), missing, frames: frameLog });
  });
  return { margin, objects: list.map(o => o.id), status: beats.every(b => b.status === 'ok') ? 'ok' : 'fail', beats };
}
