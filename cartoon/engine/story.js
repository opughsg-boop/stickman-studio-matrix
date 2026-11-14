import { drawToon, handAt } from './heroes.js';
// "Loud coworker" — sound-effects-only office gag, 7 s at 30 fps. No words on screen.
// 0-1.0 s calm typing | 1.0-4.2 s coworker blasts a phone video, hero startles (2.4 s) and glares |
// 4.2 s the laughing coworker knocks his coffee off the desk, it lands at 4.77 s | 5.4 s hero calmly puts headphones on, camera pulls out.
export const FPS = 30, TOTAL = 210;
export const SHOTS = [{ id: 'office', a: 0, b: 209, light: 'office' }];
export const shotAt = () => SHOTS[0];

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const ramp = (f, a, b) => clamp((f - a) / (b - a));
const q = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;

// key moments (frames)
export const K = { loud: 30, startle: 72, knock: 126, land: 143, phones: 162 };

// ---------- light: bright office daylight from the front-left ----------
export const LIGHTS = {
  office: { az: 112, el: 50, sky: '#eef5ff', ground: '#d8c2a2', hemi: 1.45, sun: '#fff1de', sunI: 1.7, fog: '#eef2f4', fogNear: 30, fogFar: 160,
    skyTop: '#8fc1ec', skyHor: '#e4f0fb', sat: 1.12, waterDeep: '#000000', waterShal: '#000000', glint: '#000000', vig: 0.16, shadowExt: 6 },
};
export const lightFor = () => ({ ...LIGHTS.office });

// ---------- camera: continuous glide, push in on the startle, pan down to the mug, pull out at the end ----------
const A = [-0.95, 0, -0.5], B = [0.95, 0, -0.5];
const CAMS = [
  { f: 0, pos: [0.0, 1.75, 6.4], look: [0.0, 1.3, -0.4], fov: 50 },
  { f: 40, pos: [0.35, 1.75, 5.6], look: [0.45, 1.35, -0.4], fov: 48 },         // drift toward the loud phone
  { f: 66, pos: [0.5, 1.75, 5.0], look: [0.6, 1.4, -0.4], fov: 46 },
  { f: 80, pos: [-0.8, 1.7, 2.9], look: [-0.95, 1.45, -0.5], fov: 42 },         // fast push onto the startled hero
  { f: 98, pos: [0.15, 1.65, 4.6], look: [0.2, 1.25, -0.5], fov: 48 },
  { f: 114, pos: [0.3, 1.62, 4.4], look: [0.35, 1.22, -0.5], fov: 48 },         // widen: hero glares, coworker slaps the desk
  { f: 130, pos: [1.05, 1.45, 3.9], look: [1.3, 0.95, 0.2], fov: 54 },          // follow the falling mug, coworker's face in frame
  { f: 152, pos: [1.1, 1.4, 3.7], look: [1.35, 0.8, 0.4], fov: 54 },
  { f: 168, pos: [-0.65, 1.7, 3.0], look: [-0.95, 1.45, -0.5], fov: 42 },       // back to the hero, headphones on
  { f: 209, pos: [0.0, 1.9, 6.8], look: [0.1, 1.25, -0.3], fov: 50, roll: 0 },  // pull out wide
];
const KICKS = [{ f: K.startle, a: 0.05 }, { f: K.land, a: 0.04 }];
export const camAt = (f) => {
  let c;
  if (f <= CAMS[0].f) c = { ...CAMS[0] };
  else if (f >= CAMS[CAMS.length - 1].f) c = { ...CAMS[CAMS.length - 1] };
  else for (let i = 0; i < CAMS.length - 1; i++) if (f >= CAMS[i].f && f <= CAMS[i + 1].f) {
    const t = smooth((f - CAMS[i].f) / (CAMS[i + 1].f - CAMS[i].f)), a = CAMS[i], b = CAMS[i + 1];
    c = { pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t), fov: lerp(a.fov, b.fov, t), roll: lerp(a.roll || 0, b.roll || 0, t) };
  }
  // handheld breathing so the frame is never still
  c.pos = [c.pos[0] + Math.sin(f * 0.05) * 0.03, c.pos[1] + Math.sin(f * 0.07 + 1) * 0.02, c.pos[2]];
  for (const k of KICKS) { const d = f - k.f; if (d >= 0 && d < 7) { const s = (d % 2 ? -1 : 1) * k.a * (1 - d / 7); c.look = [c.look[0], c.look[1] + s * 1.2, c.look[2]]; c.roll = (c.roll || 0) + s * 14; } }
  c.flash = f >= K.startle && f < K.startle + 3 ? 0.3 * (1 - (f - K.startle) / 3) : 0;
  c.shadowAt = [0, 0.8, -0.3];
  return c;
};

// ---------- lens: focus follows the action ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const dofAt = (f) => {
  const C = camAt(f);
  const tgt = f >= K.knock - 2 && f < 160 ? [1.75, 0.3, 0.6] : f >= 72 && f < 112 ? [A[0], 1.55, A[2]] : [C.look[0], C.look[1], C.look[2]];
  return { focus: dist(C.pos, tgt), cinf: 5 };
};

// ---------- world state ----------
export const worldAt = (f) => ({ mug: f >= K.knock ? (f - K.knock) / FPS : -1, puddle: clamp((f - K.land) / 16),
  hop: [112, 119].reduce((h, k) => h + (f >= k && f < k + 5 ? Math.sin(Math.PI * (f - k) / 5) : 0), 0) });

// ---------- cast: the user's hero (white body, red flat-brim cap) and a coworker in a yellow beanie ----------
const HERO = { hat: 'cap', hatCol: '#e8322e' };
const MATE = { hat: 'beanie', hatCol: '#f2b631', stout: true };
const INK = '#151515';
const blinkAt = (f, seed) => { const per = 46 + (seed * 17) % 31, ph = (f + seed * 13) % per; return ph < 3 ? 1 : 0; };
const S = 1.1; // card scale: head ~1.6 m, desk top covers the lower belly

// phone in the coworker's hand: we see its back, its screen light glows around it
const phone = (g, [x, y], on, k) => {
  g.save(); g.translate(x, y - 20); g.rotate(0.12);
  if (on) { const cols = ['255,126,182', '126,224,195', '255,209,102', '143,184,255']; const gl = g.createRadialGradient(0, 0, 10, 0, 0, 100);
    gl.addColorStop(0, `rgba(${cols[k % 4]},.6)`); gl.addColorStop(1, `rgba(${cols[k % 4]},0)`); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 100, 0, 7); g.fill(); }
  g.fillStyle = INK; g.beginPath(); g.roundRect(-32, -56, 64, 112, 12); g.fill();
  g.fillStyle = '#3a3f4b'; g.beginPath(); g.roundRect(-26, -50, 52, 100, 9); g.fill();
  g.fillStyle = '#1b1d24'; g.beginPath(); g.roundRect(-20, -43, 20, 28, 6); g.fill();
  g.fillStyle = '#6b7385'; g.beginPath(); g.arc(-10, -35, 4, 0, 7); g.fill(); g.beginPath(); g.arc(-10, -22, 4, 0, 7); g.fill();
  g.restore();
};

export const SLAPS = [112, 119, 126];
const slapPose = (f) => { for (const k of SLAPS) { if (f >= k - 4 && f < k) return 'slapUp'; if (f >= k && f < k + 3) return 'slapDown'; } return 'down'; };

export const actorsAt = (f, T) => {
  const out = [];
  // ----- hero -----
  const typing = f < K.startle;
  const startled = f >= K.startle && f < K.startle + 14;
  const glare = f >= K.startle + 14 && f < K.phones;
  const jump = startled ? Math.sin(Math.PI * clamp((f - K.startle) / 10)) * 0.06 : 0;
  const put = q(smooth(ramp(f, K.phones, K.phones + 10)), 2);
  const ho = {
    expr: startled ? 'shock' : glare ? 'angry' : f >= K.phones ? 'happy' : 'neutral',
    look: typing ? -0.2 : f >= K.knock + 4 && f < K.phones ? 1 : f >= K.phones ? 0 : 0.9,
    lookY: f >= K.knock + 4 && f < K.phones ? 0.7 : typing ? 0.4 : 0,
    L: startled ? 'up' : glare ? 'cross' : f >= K.phones && f < K.phones + 12 ? 'ears' : 'down',
    R: startled ? 'up' : glare ? 'cross' : f >= K.phones && f < K.phones + 12 ? 'ears' : 'down',
    blush: glare ? q(smooth(ramp(f, K.startle + 14, K.startle + 40)) * (f < K.knock ? 1 : 0.6), 2) : 0,
    sweat: startled ? 1 : 0, shake: startled ? 1 : 0, phones: f >= K.phones ? put : 0,
    blink: startled ? 0 : blinkAt(f, 3), lean: typing ? q(Math.sin(f * 0.9) * 0.8, 1) : 0,
  };
  out.push({ key: 'hero' + JSON.stringify(ho), draw: (p) => drawToon(p.g, HERO, ho), x: A[0], y: A[1] + jump, z: A[2], s: S, order: 2 });

  // ----- coworker -----
  const loud = f >= K.loud && f < K.knock + 4;
  const shocked = f >= K.knock + 4 && f < K.land + 12;
  const after = f >= K.land + 12;
  const laughing = loud && f >= K.loud + 8;
  const lb = laughing ? q(Math.abs(Math.sin(f * 0.6)) * 0.015, 3) : 0;
  const mo = {
    expr: shocked ? 'shock' : after ? 'nervous' : laughing ? 'laugh' : 'happy',
    look: shocked || after ? 0.7 : -0.3, lookY: shocked ? 0.8 : after ? 0.6 : 0.3,
    L: shocked ? 'cheek' : after ? 'scratch' : loud || f < K.loud ? 'phone' : 'down',
    R: shocked ? 'cheek' : after ? 'down' : laughing ? slapPose(f) : 'down',
    sweat: after ? 1 : 0, blink: shocked ? 0 : blinkAt(f, 9), lean: laughing ? q(-1.5 + 2.5 * Math.sin(f * 0.6), 1) : 0,
  };
  const on = loud ? Math.floor(f / 4) : -1;
  const holds = mo.L === 'phone';
  out.push({ key: 'mate' + JSON.stringify(mo) + on, draw: (p) => { drawToon(p.g, MATE, mo); if (holds) phone(p.g, handAt('phone', -1), on >= 0, on); },
    x: B[0], y: B[1] + lb, z: B[2], s: S, order: 2 });
  return out;
};

// ---------- 2D effects: music notes from the phone, impact puff, splash ----------
const FX = (key, draw, pos, s, extra = {}) => ({ key, draw, x: pos[0], y: pos[1], z: pos[2], s, blob: false, shadow: false, order: 5, ...extra });
export const fxAt = (f, T) => {
  const out = [];
  if (f >= K.loud + 2 && f < K.knock + 6) { // notes burst out of the phone: the volume made visible
    for (let i = 0; i < 6; i++) {
      const t = ((f - K.loud) * 0.022 + i / 6) % 1, side = i % 2 ? 1 : -1;
      const x = B[0] - 0.15 + side * t * 0.55 + Math.sin(t * 7 + i) * 0.08, y = 1.15 + t * 0.8, z = B[2] + 0.35;
      const cols = ['#e8414b', '#2f6fd6', '#f2a516'];
      out.push(FX('note' + (i % 3), (p) => { p.g.translate(220, 380); p.g.scale(1.8, 1.8); T.fxNote(p, i % 2, cols[i % 3]); }, [x, y, z], 0.22 * (1 - t * 0.3), { roll: q(Math.sin(t * 6 + i) * 0.4, 1), alpha: q(1 - t * t, 2) }));
    }
  }
  return out;
};
