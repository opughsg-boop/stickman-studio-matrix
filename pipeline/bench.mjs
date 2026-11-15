// Per-frame render cost of a plan in the CPU (software GL) renderer.
// node pipeline/bench.mjs PLAN.json [--w 720] [--h 1280] [--frames 12] [--t0 5] [--style '{"post":false}'] [--env '{...}'] [--save out.jpg]
import fs from 'fs';
import { chromium } from 'playwright';
import { startStatic } from './render.mjs';
const a = process.argv.slice(2), o = { w: 540, h: 960, frames: 12, t0: 5 };
for (let i = 1; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[++i];
const plan = JSON.parse(fs.readFileSync(a[0], 'utf8'));
if (o.env) plan.env = { ...(plan.env || {}), ...JSON.parse(o.env) };
const style = o.style ? JSON.parse(o.style) : {};
const { server, url } = await startStatic();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +o.w, height: +o.h } });
const errs = []; page.on('pageerror', e => { errs.push(e.message); console.error('[page]', e.message); }); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { errs.push(m.text()); console.error('[console]', m.text()); } });
await page.goto(url + 'index.html'); await page.waitForFunction(() => window.__ready === true);
const ts = Date.now(); await page.evaluate(([p, s, w, h]) => window.setup(p, { width: w, height: h, style: s }), [plan, style, +o.w, +o.h]);
const setupMs = Date.now() - ts;
await page.evaluate(t => window.renderAt(t), +o.t0); // warm-up (shader compile)
const t1 = Date.now(); let last;
for (let f = 0; f < +o.frames; f++) last = await page.evaluate(t => window.renderAt(t), +o.t0 + f / 30);
const per = (Date.now() - t1) / +o.frames;
if (o.save) fs.writeFileSync(o.save, Buffer.from(last, 'base64'));
console.log(JSON.stringify({ w: +o.w, h: +o.h, style, setupMs, msPerFrame: Math.round(per), errors: errs.slice(0, 5) }));
await browser.close(); server.close();
