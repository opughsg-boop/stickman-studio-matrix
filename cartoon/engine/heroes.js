// Cast in the user's hero style: white rounded body, thick clean black outline, big round eyes, flat cap.
// Drawn on a card canvas in design space 600 x 1000 (feet at y = 975).
const INK = '#151515', LW = 9;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// skeleton (front view): exact joint positions so props can be placed on hands / head
export const RIG = {
  head: { x: 300, y: 340, rx: 118, ry: 122 },
  shoulder: (s) => [300 + s * 86, 520],
  hip: 720, footY: 948,
};
export const ARM = { // [elbow, hand] for side s (-1 = screen left, +1 = screen right)
  down: (s) => [[300 + s * 112, 605], [300 + s * 122, 700]],
  up: (s) => [[300 + s * 165, 430], [300 + s * 150, 300]],
  cross: (s) => [[300 + s * 112, 610], [300 - s * 38, 585 + s * 14]],
  ears: (s) => [[300 + s * 178, 470], [300 + s * 132, 360]],
  phone: (s) => [[300 + s * 105, 625], [300 + s * 35, 565]],
  slapUp: (s) => [[300 + s * 168, 470], [300 + s * 178, 395]],
  slapDown: (s) => [[300 + s * 150, 600], [300 + s * 165, 662]],
  cheek: (s) => [[300 + s * 168, 520], [300 + s * 112, 395]],
  scratch: (s) => [[300 + s * 175, 450], [300 + s * 92, 248]],
};
export const handAt = (pose, s) => ARM[pose](s)[1];

const path = (g, pts) => { g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); };
const inkFill = (g, draw, fill) => { g.save(); draw(); g.fillStyle = fill; g.fill(); g.lineWidth = LW; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); g.restore(); };
const ell = (g, x, y, rx, ry, fill, lw = LW) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); } };

// a limb: thick outlined capsule through joints, then a mitten hand
const limb = (g, pts, w, fill) => {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  path(g, pts); g.lineWidth = w + LW * 2; g.strokeStyle = INK; g.stroke();
  path(g, pts); g.lineWidth = w; g.strokeStyle = fill; g.stroke(); g.restore();
};
const hand = (g, [x, y], s, fill) => {
  ell(g, x, y, 27, 29, fill);
  g.save(); g.lineWidth = 6; g.strokeStyle = INK; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - s * 4, y - 8); g.quadraticCurveTo(x - s * 22, y - 2, x - s * 16, y + 10); g.stroke(); // thumb crease
  g.restore();
};
const arm = (g, s, pose, fill) => { const [e, h] = ARM[pose](s); limb(g, [RIG.shoulder(s), e, h], 40, fill); hand(g, h, s, fill); };

// ---------- face ----------
const eyes = (g, o) => {
  const { look = 0, lookY = 0, expr = 'neutral', blink = 0 } = o, H = RIG.head;
  const big = expr === 'shock' ? 1.15 : 1, r = 36 * big, ex = 42 * big, ey = H.y + 4;
  for (const s of [-1, 1]) {
    const x = H.x + s * ex + look * 6;
    if (expr === 'happy' || expr === 'laugh' || blink >= 1) { // closed, smiling eyes
      g.save(); g.lineWidth = 8; g.strokeStyle = INK; g.lineCap = 'round'; g.beginPath();
      if (blink >= 1 && expr !== 'happy' && expr !== 'laugh') { g.moveTo(x - 22, ey); g.lineTo(x + 22, ey); } else g.arc(x, ey + 10, 22, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke(); g.restore(); continue;
    }
    ell(g, x, ey, r, r * 1.04, '#ffffff', 7);
    const pr = expr === 'shock' ? 6 : expr === 'angry' ? 8 : 10;
    ell(g, x + look * 13, ey + lookY * 10 + (expr === 'angry' ? 6 : 2), pr, pr, INK, 0);
    if (expr === 'angry') { // heavy brows angled toward the nose
      g.save(); g.lineWidth = 11; g.strokeStyle = INK; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + s * 30, ey - 50); g.lineTo(x - s * 20, ey - 34); g.stroke(); g.restore();
    }
    if (expr === 'nervous') { g.save(); g.lineWidth = 7; g.strokeStyle = INK; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * 26, ey - 36); g.lineTo(x + s * 18, ey - 46); g.stroke(); g.restore(); }
  }
};
const mouth = (g, o) => {
  const { expr = 'neutral', look = 0 } = o, H = RIG.head, x = H.x + look * 8, y = H.y + 62;
  g.save(); g.lineWidth = 7; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
  switch (expr) {
    case 'shock': ell(g, x, y + 4, 14, 18, '#3a1414', 7); break;
    case 'laugh': g.beginPath(); g.moveTo(x - 34, y - 8); g.quadraticCurveTo(x, y - 2, x + 34, y - 8); g.quadraticCurveTo(x, y + 48, x - 34, y - 8); g.closePath();
      g.fillStyle = '#5a1a1a'; g.fill(); g.stroke(); g.beginPath(); g.ellipse(x, y + 20, 14, 8, 0, 0, Math.PI * 2); g.fillStyle = '#e8605e'; g.fill(); break;
    case 'angry': g.beginPath(); g.moveTo(x - 20, y + 6); g.quadraticCurveTo(x, y - 4, x + 20, y + 6); g.stroke(); break;
    case 'puff': // the signature puffed cheeks "}{"
      for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 12, y, 12, s < 0 ? -Math.PI / 2 : Math.PI / 2, s < 0 ? Math.PI / 2 : Math.PI * 1.5, s > 0); g.stroke(); } break;
    case 'nervous': g.beginPath(); g.moveTo(x - 22, y + 4); for (let i = 1; i <= 4; i++) g.lineTo(x - 22 + i * 11, y + (i % 2 ? -4 : 4)); g.stroke(); break;
    case 'happy': g.beginPath(); g.arc(x, y - 10, 22, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); break;
    default: g.beginPath(); g.arc(x, y - 8, 14, Math.PI * 0.25, Math.PI * 0.75); g.stroke();
  }
  g.restore();
};

// ---------- headwear ----------
const cap = (g, col, look) => { // flat-brim cap; brim points to screen-left, turns a little with the look
  const H = RIG.head, top = H.y - H.ry, dark = '#b81f1c';
  inkFill(g, () => { g.beginPath(); g.moveTo(H.x - 124, H.y - 52); g.bezierCurveTo(H.x - 128, top - 70, H.x + 128, top - 70, H.x + 124, H.y - 52); g.closePath(); }, col);
  g.save(); g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(H.x + 6, top - 50); g.quadraticCurveTo(H.x + 20, top, H.x + 14, H.y - 54); g.stroke(); g.restore();
  ell(g, H.x + 4, top - 50, 10, 7, col, 6); // button
  const bx = H.x - 118 - look * 18, by = H.y - 50; // oval flat brim pointing screen-left
  inkFill(g, () => { g.beginPath(); g.ellipse(bx, by, 128, 24, -0.04, 0, Math.PI * 2); }, dark);
  g.save(); g.beginPath(); g.ellipse(bx + 4, by - 6, 118, 15, -0.04, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.restore();
};
const beanie = (g, col) => {
  const H = RIG.head, top = H.y - H.ry;
  inkFill(g, () => { g.beginPath(); g.moveTo(H.x - 120, H.y - 40); g.bezierCurveTo(H.x - 122, top - 60, H.x + 122, top - 60, H.x + 120, H.y - 40); g.closePath(); }, col);
  g.save(); g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(H.x + i * 30, H.y - 70); g.quadraticCurveTo(H.x + i * 32, top - 10, H.x + i * 22, top - 38); g.stroke(); } g.restore();
  inkFill(g, () => { g.beginPath(); g.roundRect(H.x - 128, H.y - 78, 256, 46, 18); }, '#e09a1e'); // folded cuff
  ell(g, H.x, top - 56, 26, 24, '#fff4d6');                                                  // pom-pom
};
const headphones = (g, put) => {
  const H = RIG.head, d = (1 - put) * 80, y = H.y - 6 - d;
  g.save(); g.globalAlpha = clamp(put * 3); g.lineCap = 'round';
  g.beginPath(); g.ellipse(H.x, y - 10, H.rx + 14, H.ry + 34, 0, Math.PI * 1.06, Math.PI * 1.94); g.lineWidth = 24; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.ellipse(H.x, y - 10, H.rx + 14, H.ry + 34, 0, Math.PI * 1.06, Math.PI * 1.94); g.lineWidth = 12; g.strokeStyle = '#2f333d'; g.stroke();
  for (const s of [-1, 1]) inkFill(g, () => { g.beginPath(); g.roundRect(H.x + s * (H.rx + 6) - 26, y - 46, 52, 98, 22); }, '#2f333d');
  for (const s of [-1, 1]) { g.beginPath(); g.roundRect(H.x + s * (H.rx + 6) - 14, y - 32, 28, 70, 12); g.fillStyle = '#e8414b'; g.fill(); }
  g.restore();
};

// ---------- small effects on the character ----------
const sweat = (g, x, y, k = 1) => { g.save(); g.translate(x, y); g.scale(k, k); g.beginPath(); g.moveTo(0, -22); g.quadraticCurveTo(16, 4, 0, 12); g.quadraticCurveTo(-16, 4, 0, -22);
  g.fillStyle = '#8fd0ff'; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); g.restore(); };
const shake = (g) => { const H = RIG.head; g.save(); g.lineWidth = 7; g.strokeStyle = INK; g.lineCap = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + s * (0.55 + i * 0.32); const r0 = H.rx + 40, r1 = H.rx + 78;
    g.beginPath(); g.moveTo(H.x + Math.cos(a) * r0, H.y - 40 + Math.sin(a) * r0); g.lineTo(H.x + Math.cos(a) * r1, H.y - 40 + Math.sin(a) * r1); g.stroke(); } g.restore(); };

/**
 * draw a character.  who: { hat: 'cap'|'beanie', hatCol, body, stout }
 * o: { expr, look, lookY, L, R, blush (0..1), sweat, shake, phones (0..1), blink, lean }
 */
export const drawToon = (g, who, o = {}) => {
  const body = who.body || '#ffffff', w = who.stout ? 1.1 : 1;
  const { L = 'down', R = 'down' } = o;
  g.save();
  if (o.lean) { g.translate(300, 975); g.rotate(o.lean * Math.PI / 180); g.translate(-300, -975); }
  // legs and feet
  for (const s of [-1, 1]) {
    inkFill(g, () => { g.beginPath(); g.roundRect(300 + s * 44 - 30, RIG.hip - 30, 60, RIG.footY - RIG.hip + 10, 26); }, body);
    ell(g, 300 + s * 58, RIG.footY + 4, 50, 28, body);
  }
  // arms that go behind the body (down / ears / up) first, crossing arms after the torso
  const behind = (p) => !['cross', 'phone'].includes(p);
  if (behind(L)) arm(g, -1, L, body); if (behind(R)) arm(g, 1, R, body);
  // torso: rounded, slightly wider at the hips
  inkFill(g, () => { g.beginPath(); g.moveTo(300 - 50 * w, 445);
    g.bezierCurveTo(300 - 80 * w, 470, 300 - 98 * w, 492, 300 - 100 * w, 540);
    g.bezierCurveTo(300 - 104 * w, 620, 300 - 108 * w, 700, 300 - 92 * w, 742);
    g.quadraticCurveTo(300, 762, 300 + 92 * w, 742);
    g.bezierCurveTo(300 + 108 * w, 700, 300 + 104 * w, 620, 300 + 100 * w, 540);
    g.bezierCurveTo(300 + 98 * w, 492, 300 + 80 * w, 470, 300 + 50 * w, 445); g.closePath(); }, body);
  // neck creases like the model sheet
  g.save(); g.lineWidth = 5; g.strokeStyle = INK; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(300 + s * 52, 470); g.quadraticCurveTo(300 + s * 60, 482, 300 + s * 72, 478); g.stroke(); } g.restore();
  if (!behind(L)) arm(g, -1, L, body); if (!behind(R)) arm(g, 1, R, body);
  // head
  const H = RIG.head;
  ell(g, H.x, H.y, H.rx, H.ry, body);
  if (o.blush) { const gr = g.createRadialGradient(H.x, H.y + 10, 20, H.x, H.y + 10, H.ry); gr.addColorStop(0, `rgba(240,70,70,${0.55 * o.blush})`); gr.addColorStop(1, `rgba(240,70,70,${0.15 * o.blush})`);
    g.beginPath(); g.ellipse(H.x, H.y, H.rx - 4, H.ry - 4, 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); }
  if (who.hat === 'cap') cap(g, who.hatCol || '#e8322e', o.look || 0); else if (who.hat === 'beanie') beanie(g, who.hatCol || '#f2b631');
  eyes(g, o); mouth(g, o);
  if (o.phones) headphones(g, o.phones);
  if (o.sweat) sweat(g, H.x + H.rx - 6, H.y - 40, o.sweat);
  if (o.shake) shake(g);
  g.restore();
};
