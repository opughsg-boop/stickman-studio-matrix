// pose tuner: node pipeline/_tune_tmp.mjs PLAN.json  (farmer at origin facing +z, track y SQ given per job)
import fs from 'fs'; import { chromium } from 'playwright'; import { startStatic } from './render.mjs';
const [planF, jobsF] = process.argv.slice(2); const plan = JSON.parse(fs.readFileSync(planF, 'utf8')), jobs = JSON.parse(fs.readFileSync(jobsF, 'utf8'));
const f = plan.beats[0].add.find(o => o.id === 'farmer'); f.params.track = [[0, 0, 0, 0, 0, 'sbTune'], [100, 0, 0, 0, 0, 'sbTune']];
const { server, url } = await startStatic(); const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 120, height: 200 } }); page.on('pageerror', e => console.error('[page]', e.message));
await page.goto(url + 'index.html'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.evaluate(([p, o]) => window.setup(p, o), [plan, { width: 120, height: 200 }]);
const res = await page.evaluate(jobs => { const RP = window.__rigPoses, out = [];
  const meas = (P, y) => { RP.sbTune = P; const fo = window.__objects().find(o => o.id === 'farmer'); window.__pose(5); const L = window.__link().farmer; return { L: L.L.toArray(), R: L.R.toArray() }; };
  for (const J of jobs) { let P = { ...J.start }; const err = P2 => { const m = meas(P2); let e = 0; for (const h of ['L', 'R']) if (J[h]) e += J[h].reduce((s, v, i) => s + (m[h][i] - v) ** 2, 0); return Math.sqrt(e); };
    let best = err(P), step = .3; for (let it = 0; it < 60 && step > .004; it++) { let imp = false;
      for (const k of J.vars) for (const d of [step, -step]) { const Q = { ...P, [k]: (P[k] || 0) + d }; const e = err(Q); if (e < best - 1e-5) { best = e; P = Q; imp = true; } }
      if (!imp) step /= 2; }
    const m = meas(P); out.push({ name: J.name, err: +best.toFixed(4), pose: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, +v.toFixed(2)])), L: m.L.map(v => +v.toFixed(3)), R: m.R.map(v => +v.toFixed(3)) }); }
  return out; }, jobs);
console.log(JSON.stringify(res, null, 0)); await browser.close(); server.close();
