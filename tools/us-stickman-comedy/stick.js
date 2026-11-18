// stick.js — stickman comedy engine. Every draw function is pure (time in, SVG string out).
// Shot world = 1080x1920 units. Camera zooms into it per shot.
const W = 1080, H = 1920, INK = '#151312';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => (k = clamp(k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
const back = k => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const lin = k => clamp(k);
const span = (t, a, b, f = ease) => f(clamp((t - a) / (b - a)));   // 0 before a, 1 after b
const wob = (t, f = 1, a = 1, ph = 0) => Math.sin((t * f + ph) * Math.PI * 2) * a;
const rad = d => d * Math.PI / 180;
const pt = (x, y, ang, len) => [x + Math.sin(rad(ang)) * len, y + Math.cos(rad(ang)) * len]; // ang 0 = down, 90 = +x, 180 = up
const mixPose = (a, b, k) => { const o = { ...a }; for (const key in b) { const va = a[key], vb = b[key]; o[key] = Array.isArray(va) && Array.isArray(vb) && typeof va[0] === 'number' ? va.map((v, i) => lerp(v, vb[i], k)) : typeof va === 'number' && typeof vb === 'number' ? lerp(va, vb, k) : (k < .5 ? va ?? vb : vb); } return o; };

// ---------- defs: gradients + texture filters (call once per frame, seed = frame-based) ----------
function defs(seed) {
  return `<defs>
  <radialGradient id="headG" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".65" stop-color="#eeede9"/><stop offset="1" stop-color="#cfcdc8"/></radialGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
  <filter id="paint" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="3" seed="7"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.15"/></filter>
  <filter id="fiber" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .25" numOctaves="2" seed="3"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.25"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>`;
}
// Painterly texture over the set (inside the camera group so it zooms with the world)
const paintTex = (x = -400, y = -400, w = W + 800, h = H + 800) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#paint)" opacity=".13" style="mix-blend-mode:multiply"/>
   <rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#fiber)" opacity=".07" style="mix-blend-mode:multiply"/>`;
// Motivated light: darkness except a pool at (lx,ly) + coloured glow. Unique id per light.
function light(lx, ly, r, color, dark = .7, glow = .5, id = 'L') {
  return `<defs><radialGradient id="${id}d" cx="${lx}" cy="${ly}" r="${r}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".45" stop-color="#000" stop-opacity="${dark * .35}"/><stop offset="1" stop-color="#000" stop-opacity="${dark}"/></radialGradient>
    <radialGradient id="${id}g" cx="${lx}" cy="${ly}" r="${r * .7}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${color}" stop-opacity="${glow}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>
  <rect x="-600" y="-600" width="${W + 1200}" height="${H + 1200}" fill="url(#${id}d)"/>
  <rect x="-600" y="-600" width="${W + 1200}" height="${H + 1200}" fill="url(#${id}g)" style="mix-blend-mode:screen"/>`;
}
// Screen-space finish (outside camera): vignette + moving grain
const finish = (g = .07) => `<rect width="${W}" height="${H}" fill="url(#vig)"/><rect width="${W}" height="${H}" filter="url(#grain)" opacity="${g}" style="mix-blend-mode:overlay"/>`;
// Camera: (x,y) world point at frame centre, z zoom, r roll, sx/sy screen shake
function cam(c, inner) {
  const { x = W / 2, y = H / 2, z = 1, r = 0, sx = 0, sy = 0 } = c;
  return `<g transform="translate(${W / 2 + sx} ${H / 2 + sy}) rotate(${r}) scale(${z}) translate(${-x} ${-y})">${inner}</g>`;
}
const camLerp = (a, b, k) => ({ x: lerp(a.x ?? W / 2, b.x ?? W / 2, k), y: lerp(a.y ?? H / 2, b.y ?? H / 2, k), z: lerp(a.z ?? 1, b.z ?? 1, k), r: lerp(a.r ?? 0, b.r ?? 0, k) });
const shake = (t, t0, amt = 18, dur = .35) => { const k = clamp((t - t0) / dur); if (k <= 0 || k >= 1) return { sx: 0, sy: 0 }; const d = (1 - k) * amt; return { sx: Math.sin(t * 97) * d, sy: Math.cos(t * 83) * d }; };

// ---------- the stickman ----------
// Big round head, short stick body (head diameter ≈ torso length, like the reference).
// x,y = hip (world). s = scale. dir: 1 faces right, -1 left, 0 front. rot = whole-body rotation (lying = -90/90).
// Angles in degrees, 0 = hanging down, 90 = forward (facing dir), 180 = up, negative = backward.
//   lean (+ forward), head (extra tilt, + forward/down)
//   aL / aR: [shoulder, elbow-bend]  OR  {to:[x,y]} world target  OR  {to:'face'|'chin'|'head'|'mouth'}
//   lL / lR: [hip, knee-bend]  OR  {to:[x,y]} world foot target
// face: eyes 'open'|'wide'|'closed'|'happy'|'tired'|'angry'|'side'|'dead'; mouth 'smile'|'grin'|'flat'|'frown'|'wavy'|'open'|'O'|'scream'
// acc: cap, glasses, mustache, hair, beard, tie, hijab (colour strings) | drool, sweat, tear, lids (0-1) | blush (1)
// After each call, stick.last holds world points: handL handR head headR mouth footL footR hip
function stick(o) {
  const { x = 540, y = 1300, s = 1, dir = 1, lean = 0, head = 0, aL = [12, 8], aR = [-12, -8], lL = [6, 0], lR = [-6, 0],
    face = {}, acc = {}, hidden = {}, rot = 0, dy = 0 } = o;
  const d = dir === 0 ? 1 : dir, LW = 12, T = 150, R = 96, UA = 78, LA = 74, TH = 92, SH = 88;
  const Y = y + (dy || 0);
  const cr = Math.cos(rad(rot)), sr = Math.sin(rad(rot));
  const toW = (px, py) => [x + (px * cr - py * sr) * s, Y + (px * sr + py * cr) * s];
  const toL = (wx, wy) => { const px = (wx - x) / s, py = (wy - Y) / s; return [px * cr + py * sr, -px * sr + py * cr]; };
  const [nx, ny] = pt(0, 0, 180 - lean * d, T);
  const [shx, shy] = pt(0, 0, 180 - lean * d, T - 20);
  const [hcx, hcy] = pt(nx, ny, 180 - (lean + head) * d, R - 8);
  const fx = dir === 0 ? 0 : 24 * d;
  const ex1 = hcx + fx - 31, ex2 = hcx + fx + 31, ey = hcy - 6, mx = hcx + fx * 1.1, my = hcy + 42;
  const named = { face: [hcx + fx * 1.4, hcy + 6], chin: [mx + 6 * d, my + 26], head: [hcx - 30 * d, hcy - 60], mouth: [mx, my + 6] };
  // 2-bone IK in local space; bend picks elbow/knee side
  const ik = (ox, oy, tx, ty, L1, L2, bend) => {
    let dx = tx - ox, dy2 = ty - oy, dist = Math.hypot(dx, dy2); const maxd = L1 + L2 - .5;
    if (dist > maxd) { dx *= maxd / dist; dy2 *= maxd / dist; dist = maxd; }
    const a = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1)), base = Math.atan2(dy2, dx), ang = base + bend * a;
    return [ox + Math.cos(ang) * L1, oy + Math.sin(ang) * L1, ox + dx, oy + dy2];
  };
  const fk = (ox, oy, a1, a2, L1, L2) => { const [ex, ey2] = pt(ox, oy, a1 * d, L1); const [hx, hy] = pt(ex, ey2, (a1 + a2) * d, L2); return [ex, ey2, hx, hy]; };
  const solve = (spec, ox, oy, L1, L2, bend) => {
    if (spec && spec.to) { const t = spec.to; const [lx, ly] = typeof t === 'string' ? named[t] : toL(t[0], t[1]); return ik(ox, oy, lx, ly, L1, L2, bend); }
    return fk(ox, oy, spec[0], spec[1], L1, L2);
  };
  const arm = a => { const [ex, ey2, hx, hy] = solve(a, shx, shy, UA, LA, d); return { p: `M${shx} ${shy} L${ex} ${ey2} L${hx} ${hy}`, hx, hy }; };
  const leg = l => { const [ex, ey2, fx2, fy] = solve(l, 0, 0, TH, SH, -d); return { p: `M0 0 L${ex} ${ey2} L${fx2} ${fy}`, fx: fx2, fy }; };
  const A1 = arm(aL), A2 = arm(aR), L1 = leg(lL), L2 = leg(lR);
  const line = p => `<path d="${p}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shoe = f => `<ellipse cx="${f.fx + 14 * d}" cy="${f.fy + 6}" rx="32" ry="16" fill="#4a2f1d" stroke="${INK}" stroke-width="5"/><ellipse cx="${f.fx + 4 * d}" cy="${f.fy}" rx="13" ry="5" fill="#7a5236" opacity=".7"/>`;
  const hand = h => `<circle cx="${h.hx}" cy="${h.hy}" r="19" fill="#f6f5f2" stroke="${INK}" stroke-width="5"/>`;
  const eye = cx => {
    const e = face.eyes || 'open';
    if (e === 'closed') return `<path d="M${cx - 15} ${ey} Q${cx} ${ey + 13} ${cx + 15} ${ey}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    if (e === 'happy') return `<path d="M${cx - 15} ${ey + 6} Q${cx} ${ey - 12} ${cx + 15} ${ey + 6}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    if (e === 'wide') return `<circle cx="${cx}" cy="${ey}" r="19" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${cx + 3 * d}" cy="${ey}" r="8" fill="${INK}"/>`;
    if (e === 'dead') return `<path d="M${cx - 12} ${ey - 12} l24 24 M${cx + 12} ${ey - 12} l-24 24" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    if (e === 'side') return `<ellipse cx="${cx + 8 * d}" cy="${ey}" rx="7" ry="10" fill="${INK}"/><path d="M${cx - 16} ${ey - 16} h32" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    if (e === 'tired') return `<ellipse cx="${cx}" cy="${ey + 3}" rx="8" ry="9" fill="${INK}"/><path d="M${cx - 17} ${ey - 2} L${cx + 17} ${ey - 2}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${cx - 16} ${ey - 3} h32 v-12 h-32z" fill="url(#headG)"/>`;
    if (e === 'angry') { const inner = (cx < hcx + fx) ? 1 : -1; return `<ellipse cx="${cx}" cy="${ey + 2}" rx="8" ry="10" fill="${INK}"/><path d="M${cx - 18} ${ey - 20 - 6 * inner} L${cx + 18} ${ey - 20 + 6 * inner}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`; }
    return `<ellipse cx="${cx + 2 * d}" cy="${ey}" rx="8" ry="11" fill="${INK}"/><circle cx="${cx + 5 * d}" cy="${ey - 4}" r="2.6" fill="#fff"/>`;
  };
  const m = face.mouth || 'flat';
  const mouth = {
    smile: `<path d="M${mx - 20} ${my - 4} Q${mx} ${my + 14} ${mx + 20} ${my - 4}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
    grin: `<path d="M${mx - 26} ${my - 8} Q${mx} ${my + 26} ${mx + 26} ${my - 8} Z" fill="#5a1717" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M${mx - 22} ${my - 6} L${mx + 22} ${my - 6} L${mx + 18} ${my + 1} L${mx - 18} ${my + 1}Z" fill="#fff"/>`,
    flat: `<path d="M${mx - 14} ${my} L${mx + 14} ${my}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
    frown: `<path d="M${mx - 18} ${my + 6} Q${mx} ${my - 8} ${mx + 18} ${my + 6}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
    wavy: `<path d="M${mx - 20} ${my} q5 -6 10 0 t10 0 t10 0 t10 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
    open: `<ellipse cx="${mx}" cy="${my + 4}" rx="17" ry="14" fill="#5a1717" stroke="${INK}" stroke-width="5"/><ellipse cx="${mx}" cy="${my + 11}" rx="10" ry="5" fill="#d9706f"/>`,
    O: `<ellipse cx="${mx}" cy="${my + 6}" rx="13" ry="20" fill="#5a1717" stroke="${INK}" stroke-width="5"/>`,
    scream: `<path d="M${mx - 24} ${my - 6} Q${mx} ${my - 14} ${mx + 24} ${my - 6} Q${mx + 20} ${my + 44} ${mx} ${my + 46} Q${mx - 20} ${my + 44} ${mx - 24} ${my - 6}Z" fill="#5a1717" stroke="${INK}" stroke-width="5"/><ellipse cx="${mx}" cy="${my + 34}" rx="12" ry="7" fill="#d9706f"/>`,
  }[m] || '';
  let hd = `<circle cx="${hcx}" cy="${hcy}" r="${R}" fill="url(#headG)" stroke="${INK}" stroke-width="8"/>`;
  if (acc.hijab) hd = `<path d="M${hcx - R - 18} ${hcy + 40} Q${hcx - R - 26} ${hcy - R - 30} ${hcx} ${hcy - R - 22} Q${hcx + R + 26} ${hcy - R - 30} ${hcx + R + 18} ${hcy + 40} Q${hcx + R + 30} ${hcy + R + 40} ${hcx} ${hcy + R + 34} Q${hcx - R - 30} ${hcy + R + 40} ${hcx - R - 18} ${hcy + 40}Z" fill="${acc.hijab}" stroke="${INK}" stroke-width="7"/><ellipse cx="${hcx + fx * .5}" cy="${hcy + 4}" rx="${R - 18}" ry="${R - 8}" fill="url(#headG)" stroke="${INK}" stroke-width="5"/>`;
  if (acc.hair) hd += [-1, 1].map(sd => `<path d="M${hcx + sd * 64} ${hcy - 60} q${sd * 26} -6 ${sd * 30} 18 q${sd * 14} 2 ${sd * 6} 22 q${sd * -14} -4 ${sd * -22} -12z" fill="${acc.hair}" stroke="${INK}" stroke-width="4"/>`).join('');
  if (acc.beard) hd += `<path d="M${hcx - R + 14} ${hcy + 20} Q${hcx - R + 20} ${hcy + R + 26} ${hcx + fx} ${hcy + R + 22} Q${hcx + R - 20} ${hcy + R + 26} ${hcx + R - 14} ${hcy + 20} Q${hcx} ${hcy + 60} ${hcx - R + 14} ${hcy + 20}Z" fill="${acc.beard}" stroke="${INK}" stroke-width="5"/>`;
  hd += eye(ex1) + eye(ex2);
  if (acc.lids) hd += [ex1, ex2].map(cx => `<rect x="${cx - 22}" y="${ey - 24}" width="44" height="${24 * acc.lids}" fill="#e9e8e4"/><path d="M${cx - 20} ${ey - 24 + 24 * acc.lids} h40" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`).join('');
  if (acc.glasses) hd += `<g fill="none" stroke="#3a3632" stroke-width="4"><circle cx="${ex1}" cy="${ey}" r="23"/><circle cx="${ex2}" cy="${ey}" r="23"/><path d="M${ex1 + 23} ${ey} h${ex2 - ex1 - 46}"/></g>`;
  if (acc.mustache) hd += `<path d="M${mx} ${my - 14} q-14 -10 -34 0 q-6 12 -16 10 q14 14 50 -2 q36 16 50 2 q-10 2 -16 -10 q-20 -10 -34 0z" fill="${acc.mustache}" stroke="${INK}" stroke-width="4"/>`;
  hd += mouth;
  if (acc.blush) hd += `<ellipse cx="${ex1 - 6}" cy="${ey + 30}" rx="16" ry="8" fill="#f08a8a" opacity=".5"/><ellipse cx="${ex2 + 6}" cy="${ey + 30}" rx="16" ry="8" fill="#f08a8a" opacity=".5"/>`;
  if (acc.drool) hd += `<path d="M${mx + 8} ${my + 12} q4 ${30 * acc.drool} 0 ${44 * acc.drool} q-10 0 -8 -14z" fill="#9fd3f0" stroke="#4d7f9c" stroke-width="3" opacity=".9"/>`;
  if (acc.tear) hd += `<path d="M${ex1} ${ey + 14} q-8 ${40 * acc.tear} 0 ${60 * acc.tear} q8 -10 0 ${-60 * acc.tear}z" fill="#9fd3f0" stroke="#4d7f9c" stroke-width="3"/>`;
  if (acc.sweat) hd += `<path d="M${hcx - fx - 70} ${hcy - 50 + 30 * acc.sweat} q-12 20 0 26 q12 -6 0 -26z" fill="#9fd3f0" stroke="#4d7f9c" stroke-width="3"/>`;
  if (acc.cap) hd += `<path d="M${hcx - R - 4} ${hcy - 22} Q${hcx - R + 6} ${hcy - R - 32} ${hcx} ${hcy - R - 30} Q${hcx + R - 6} ${hcy - R - 32} ${hcx + R + 4} ${hcy - 22} Z" fill="${acc.cap}" stroke="${INK}" stroke-width="6"/>
    <path d="M${hcx + d * (R - 20)} ${hcy - 30} q${d * 70} -6 ${d * 96} 16 q${d * -40} 16 ${d * -110} 2z" fill="${acc.cap}" stroke="${INK}" stroke-width="6"/>
    <path d="M${hcx - R + 18} ${hcy - 60} Q${hcx} ${hcy - R - 12} ${hcx + R - 30} ${hcy - 66}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="8" stroke-linecap="round"/>`;
  const tie = acc.tie ? `<path d="M${nx} ${ny + 6} l-12 14 l12 70 l12 -70z" fill="${acc.tie}" stroke="${INK}" stroke-width="4"/>` : '';
  const backS = d > 0 ? [A1, L1] : [A2, L2], frontS = d > 0 ? [A2, L2] : [A1, L1];
  // an arm aimed at the face/head ({to:...}) is always drawn in front of the head
  const backArmTo = (d > 0 ? aL : aR) && (d > 0 ? aL : aR).to;
  let g = '';
  if (!hidden.legs) g += line(backS[1].p) + shoe(backS[1]);
  if (!hidden.arms && !backArmTo) g += line(backS[0].p) + hand(backS[0]);
  g += line(`M0 0 L${nx} ${ny}`) + tie;
  if (!hidden.legs) g += line(frontS[1].p) + shoe(frontS[1]);
  g += hd;
  if (!hidden.arms && backArmTo) g += line(backS[0].p) + hand(backS[0]);
  if (!hidden.arms) g += line(frontS[0].p) + hand(frontS[0]);
  stick.last = { handL: toW(A1.hx, A1.hy), handR: toW(A2.hx, A2.hy), head: toW(hcx, hcy), headR: R * s, mouth: toW(mx, my), footL: toW(L1.fx, L1.fy), footR: toW(L2.fx, L2.fy), hip: [x, Y] };
  return `<g transform="translate(${x} ${Y}) rotate(${rot}) scale(${s})">${g}</g>`;
}
// Pose presets: stick({ ...P.walk(t), x, y, dir, face, acc }). Blend two with mixPose(P.stand(), P.shock(), k).
const P = {
  stand: () => ({ lean: 0, aL: [12, 8], aR: [-12, -8], lL: [6, 0], lR: [-6, 0] }),
  walk: (t, sp = 1.6) => { const k = Math.sin(t * sp * Math.PI * 2); return { lean: 4, aL: [-28 * k, 25], aR: [28 * k, 25], lL: [26 * k, -Math.max(0, -40 * k)], lR: [-26 * k, -Math.max(0, 40 * k)], dy: -Math.abs(Math.cos(t * sp * Math.PI * 2)) * 8 }; },
  run: (t, sp = 2.6) => { const k = Math.sin(t * sp * Math.PI * 2); return { lean: 16, aL: [-55 * k, 80], aR: [55 * k, 80], lL: [45 * k, -Math.max(15, -80 * k)], lR: [-45 * k, -Math.max(15, 80 * k)], dy: -Math.abs(Math.cos(t * sp * Math.PI * 2)) * 22 }; },
  sit: () => ({ lean: -4, aL: [25, 40], aR: [10, 50], lL: [90, -90], lR: [84, -86] }),
  sitFloor: () => ({ lean: 4, aL: [30, 30], aR: [20, 40], lL: [80, -10], lR: [70, -20] }),
  armsUp: (t = 0) => ({ lean: -4, aL: [120 + wob(t, 2, 8), 22], aR: [-120 - wob(t, 2, 8), -22], lL: [10, 0], lR: [-10, 0] }),
  shrug: () => ({ lean: 0, head: -6, aL: [60, 70], aR: [-60, -70], lL: [6, 0], lR: [-6, 0] }),
  point: () => ({ lean: 2, aL: [12, 8], aR: [95, 0], lL: [8, 0], lR: [-8, 0] }),
  facepalm: () => ({ lean: 8, head: 14, aL: [12, 8], aR: { to: 'face' }, lL: [6, 0], lR: [-6, 0] }),
  think: () => ({ lean: 0, head: -10, aL: { to: 'chin' }, aR: [-10, -10], lL: [6, 0], lR: [-6, 0] }),
  shock: () => ({ lean: -10, head: -6, aL: [140, -50], aR: [-140, 50], lL: [14, 0], lR: [-14, 0] }),
  headGrab: () => ({ lean: -4, head: -4, aL: { to: 'head' }, aR: [-150, -30], lL: [12, 0], lR: [-12, 0] }),
  phone: (t = 0) => ({ lean: 6, head: 18, aL: [30, 100 + wob(t, 2.2, 4)], aR: [45, 85], lL: [6, 0], lR: [-6, 0] }),
  lie: () => ({ rot: -90, lean: 0, aL: [8, 0], aR: [-8, 0], lL: [4, 0], lR: [-4, 0] }),
  slump: () => ({ lean: 30, head: 25, aL: [5, 0], aR: [-5, 0], lL: [8, 0], lR: [-8, 0] }),
};
// Effect marks (world coords)
const shakeLines = (x, y, k = 1, c = INK) => `<g stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none" opacity="${k}">${[-1, 1].map(sd => `<path d="M${x + sd * 70} ${y - 30} q${sd * 14} 30 0 60"/><path d="M${x + sd * 92} ${y - 20} q${sd * 10} 20 0 40"/>`).join('')}</g>`;
const zzz = (x, y, t) => [0, 1, 2].map(i => { const k = ((t * .6 + i / 3) % 1); return `<text x="${x + k * 60 + i * 10}" y="${y - k * 120}" font-family="Alexandria" font-weight="800" font-size="${30 + i * 12}" fill="#fff" opacity="${Math.sin(k * Math.PI)}" stroke="${INK}" stroke-width="3" paint-order="stroke">z</text>`; }).join('');
const popMark = (x, y, k, txt = '!', size = 120) => `<g transform="translate(${x} ${y}) scale(${back(k)})" opacity="${clamp(k * 3)}"><text text-anchor="middle" font-family="Alexandria" font-weight="900" font-size="${size}" fill="#fff" stroke="${INK}" stroke-width="10" paint-order="stroke">${txt}</text></g>`;
const speedLines = (x, y, dir, k = 1) => `<g stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="${.7 * k}">${[0, 1, 2, 3].map(i => `<path d="M${x - dir * (90 + i * 10)} ${y - 80 + i * 50} h${-dir * (80 + (i % 2) * 50)}"/>`).join('')}</g>`;
const thought = (x, y, k, inner = '') => `<g opacity="${k}" transform="translate(${x} ${y}) scale(${.6 + .4 * back(k)})"><circle cx="-80" cy="140" r="14" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="-50" cy="100" r="22" fill="#fff" stroke="${INK}" stroke-width="5"/><ellipse cx="40" cy="0" rx="170" ry="110" fill="#fff" stroke="${INK}" stroke-width="7"/>${inner}</g>`;
