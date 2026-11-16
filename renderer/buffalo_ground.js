// Nile Delta irrigation canal (turaa) ground: one height function shared by the renderer (renderer/scene.js, browser)
// and the plan (plans/buffalo.mjs, node), so palms, people and animals stand exactly on the banks.
// The canal runs along z, centred on x = 0. Each bank: a steep inner slope, a dirt path on top, an outer slope down to the fields.
// The left bank (x < 0) has a low muddy cattle ramp down to the water and a mud wallow beside it.
export const CANAL = { half: 2.0, top: .55, slope: 1.0, path: 1.7, out: 1.1, water: .06, waterHalf: 3.2, ramp: [-.6, 6.6], wallow: [-5.0, 4.6, 1.4, 1.15], wallowY: .025 };
const sm = t => (t = Math.max(0, Math.min(1, t)), t * t * (3 - 2 * t));
const hn = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
export const vnoise = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (hn(ix, iz) * (1 - u) + hn(ix + 1, iz) * u) * (1 - v) + (hn(ix, iz + 1) * (1 - u) + hn(ix + 1, iz + 1) * u) * v; };
export function rampK(x, z, C = CANAL) { return x < 0 ? sm((z - C.ramp[0]) / 1.2) * sm((C.ramp[1] - z) / 1.2) : 0; }
export function wallowE(x, z, C = CANAL) { const [wx, wz, rx, rz] = C.wallow; return ((x - wx) / rx) ** 2 + ((z - wz) / rz) ** 2; }
export function bankH(x, z, C = CANAL) {
  const d = Math.abs(x) - C.half; if (d <= 0) return .012;
  let y = d < C.slope ? C.top * sm(d / C.slope) : d < C.slope + C.path ? C.top : C.top * (1 - sm((d - C.slope - C.path) / C.out));
  // erosion: lumpy slopes, terraced slump steps on the inner bank, small rills
  const sl = Math.sin(Math.PI * Math.min(1, y / C.top));
  y += (vnoise(x * 2.4, z * 1.7) - .5) * .11 * sl + (vnoise(x * 7, z * 6) - .5) * .035 * (y / C.top);
  if (d < C.slope) y = y * .7 + Math.round(y / .11) * .11 * .3;
  y -= .07 * sl * Math.pow(Math.max(0, Math.sin(z * 1.9 + Math.sin(z * .7) * 2)), 12); // rain rills cut down the slope
  // cattle ramp: a low, gentle muddy gap in the left bank
  const rk = rampK(x, z, C); if (rk > 0) { const yr = .03 + .1 * sm(d / 2.8) + (vnoise(x * 3, z * 3) - .5) * .02; y = y + (Math.min(y, yr) - y) * rk; }
  // mud wallow: a flat wet pit (the wallow mesh sits at wallowY over it)
  const e = wallowE(x, z, C); if (e < 1.7) y = .012 + (y - .012) * sm((e - .9) / .8);
  return Math.max(.012, y);
}
