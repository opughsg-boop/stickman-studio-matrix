// node probe.mjs PLAN.json times.json  -> prints LINK snapshots (farmer palms, hand index/thumb) at given times
import fs from 'fs';
import { chromium } from 'playwright';
const ROOT = '/home/user/stickman-studio-matrix';
const { startStatic } = await import('./render.mjs');
const [planF, timesF, extraF] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planF, 'utf8')), times = JSON.parse(fs.readFileSync(timesF, 'utf8'));
const extra = extraF ? fs.readFileSync(extraF, 'utf8') : '';
const { server, url } = await startStatic();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 180, height: 320 } });
page.on('pageerror', e => console.error('[page]', e.message));
await page.goto(url + 'index.html'); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.evaluate(([p, o]) => window.setup(p, o), [plan, { width: 180, height: 320 }]);
const out = await page.evaluate(([ts, ex]) => { const res = [];
  for (const t of ts) { window.__pose(t); window.__pose(t); const L = window.__link(), r = { t };
    for (const k of Object.keys(L)) { const v = L[k]; if (!v || typeof v !== 'object') continue; const o = {};
      for (const f of ['L', 'R', 'index', 'thumb', 'anchor', 'palm']) if (v[f] && v[f].isVector3) o[f] = v[f].toArray().map(x => +x.toFixed(3));
      if (Object.keys(o).length) r[k] = o; }
    if (ex) r.extra = eval(ex)(t); res.push(r); } return res; }, [times, extra]);
console.log(JSON.stringify(out));
await browser.close(); server.close();
