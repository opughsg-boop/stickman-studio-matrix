import { createHash } from 'crypto';
// plan.json + audio -> final mp4. Chunked (resumable) rendering with retries and parallel workers.
// node pipeline/render.mjs PLAN.json AUDIO OUT_DIR [--fps 15] [--w 540] [--workers 2] [--preview]
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, spawnSync, execFileSync } from 'child_process';
import express from 'express';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function startStatic() {
  const app = express();
  app.use('/three', express.static(path.join(ROOT, 'node_modules/three')));
  app.use('/fonts', express.static(path.join(ROOT, 'node_modules/@fontsource/barlow-condensed/files')));
  app.use('/fonts', express.static(path.join(ROOT, 'node_modules/@fontsource/lalezar/files')));
  app.use('/renderer', express.static(path.join(ROOT, 'renderer')));
  app.use('/assets', express.static(path.join(ROOT, 'assets')));
  app.use('/fonts2', express.static(path.join(ROOT, 'node_modules/@fontsource/montserrat/files')));
  app.use('/fonts3', express.static(path.join(ROOT, 'node_modules/@fontsource/cairo/files')));
  app.use('/fonts4', express.static(path.join(ROOT, 'node_modules/@fontsource/nunito/files')));
  return new Promise(r => { const s = app.listen(0, () => r({ server: s, url: `http://127.0.0.1:${s.address().port}/renderer/` })); });
}

async function openPage(browser, url, plan, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => console.error('[page]', e.message));
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.error('[page-console]', m.text()); });
  await page.goto(url + (plan.engine === 'cine' ? 'cine.html' : 'index.html')); await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.evaluate(([p, o]) => window.setup(p, o), [plan, { width: w, height: h }]);
  page.setDefaultTimeout(120000);
  return page;
}

function encodeChunk(file, fps) {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  return { ff, done };
}

// Shared cache of finished chunks (cache/chunks). The key covers only what the frames depend on:
// the global plan settings, the beats that overlap this time range, the size and the fps.
const CACHE_DIR = path.join(ROOT, 'cache', 'chunks');
function chunkKey(plan, opt, f0, f1) {
  const { beats, shots, ...rest } = plan; const list = beats || shots || [];
  const t0 = f0 / opt.fps - 1, t1 = f1 / opt.fps + 1;
  const near = list.filter(b => b.end >= t0 && b.start <= t1);
  return createHash('sha1').update(JSON.stringify([rest, near, opt.w, opt.h, opt.fps, f1 - f0])).digest('hex');
}

async function renderChunk(browser, url, plan, opt, ci, f0, f1, file, reuse = null) {
  // reuse.page keeps one loaded page (and its models) per worker instead of reloading everything per chunk
  const page = reuse && reuse.page ? reuse.page : await openPage(browser, url, plan, opt.w, opt.h);
  if (reuse) reuse.page = page;
  const tmp = file + '.part.mkv'; const { ff, done } = encodeChunk(tmp, opt.fps);
  try {
    for (let f = f0; f < f1; f++) {
      const b64 = await page.evaluate(t => window.renderAt(t), f / opt.fps);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await done; fs.renameSync(tmp, file);
  } catch (e) { if (reuse) reuse.page = null; await page.close().catch(() => {}); try { ff.stdin.end(); } catch {} throw e; }
  finally { if (!reuse) await page.close().catch(() => {}); try { ff.stdin.end(); } catch {} }
}

// A chunk whose browser keeps crashing is rendered in 3 smaller pieces (same frames, same encoder), then joined.
async function renderChunkSplit(browser, url, plan, opt, c) {
  const piece = Math.ceil((c.f1 - c.f0) / 3), parts = [];
  for (let f = c.f0, k = 0; f < c.f1; f += piece, k++) {
    const pf = c.file.replace(/\.mkv$/, '_p' + k + '.mkv'), f1 = Math.min(c.f1, f + piece);
    for (let attempt = 1; ; attempt++) {
      try { await renderChunk(browser, url, plan, opt, c.i, f, f1, pf); break; }
      catch (e) { console.error('[render] piece ' + c.i + '.' + k + ' attempt ' + attempt + ' failed: ' + e.message); if (attempt >= 3) throw e;
        try { await browser.close(); } catch {} browser = await launchBrowser(opt); }
    }
    parts.push(pf);
  }
  const lst = c.file + '.parts.txt';
  fs.writeFileSync(lst, parts.map(p => "file '" + path.basename(p) + "'").join('\n'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', c.file + '.part.mkv']);
  fs.renameSync(c.file + '.part.mkv', c.file);
  for (const p of parts) fs.rmSync(p, { force: true }); fs.rmSync(lst, { force: true });
  return browser;
}

async function launchBrowser(opt, gpu = opt.gpu) {
  return chromium.launch(gpu ? { headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=default'] } : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

export async function render(planFile, audio, outDir, o = {}) {
  const gpu = !!(o.gpu || process.env.RENDER_GPU);
  // v2 (2026-11-15): CPU renders at 630x1120 (was 540x960): measured 1.46x the old time with the whole realism layer on; 720x1280 = 1.69x (pass --w 720 --h 1280)
  const opt = { fps: 30, w: gpu ? 1080 : 630, h: gpu ? 1920 : 1120, workers: Math.max(2, os.cpus().length - 1), chunkSec: 12, outFps: 30, ...o };
  for (const k of ['fps', 'w', 'h', 'workers']) opt[k] = +opt[k];
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  fs.mkdirSync(path.join(outDir, 'chunks'), { recursive: true });
  const { server, url } = await startStatic();
  // GPU mode (a machine with a graphics card): real WebGL hardware + full 1080x1920 resolution.
  let browser = await launchBrowser(opt, gpu);
  const log = o.onProgress || (() => {});
  try {
    if (opt.preview) { // stills from the middle of every beat
      const page = await openPage(browser, url, plan, opt.w, opt.h); const files = [];
      for (const [i, b] of (plan.beats || plan.shots).entries()) { const f = path.join(outDir, `preview_${String(i).padStart(2, '0')}.jpg`);
        fs.writeFileSync(f, Buffer.from(await page.evaluate(t => window.renderAt(t), (b.start + b.end) / 2), 'base64')); files.push(f); }
      const ccfg = plan.checks?.clearance ?? (process.env.CLEARANCE ? {} : null); // private frames: renderer/clearance.js -> clearance.json
      if (ccfg) { const cr = await page.evaluate(async c => (await import('/renderer/clearance.js')).checkClearance(c), ccfg);
        fs.writeFileSync(path.join(outDir, 'clearance.json'), JSON.stringify(cr, null, 1));
        for (const b of cr.beats) console.log(`[clearance] beat ${b.beat} ${b.status}: ` + [...b.overlaps, ...b.contacts, ...b.missing].map(p => `${p.kind} ${p.a}.${p.part}/${p.b}${p.depth != null ? ' ' + p.depth + 'm' : ''}`).join(', ')); }
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(outDir, 'preview_*.jpg'), '-vf', `scale=180:-1,tile=${Math.min(6, files.length)}x${Math.ceil(files.length / 6)}`, '-frames:v', '1', path.join(outDir, 'sheet_preview.jpg')]);
      return { preview: path.join(outDir, 'sheet_preview.jpg'), files };
    }
    const total = Math.ceil(plan.duration * opt.fps), per = Math.round(opt.chunkSec * opt.fps), chunks = [];
    for (let f = 0, i = 0; f < total; f += per, i++) chunks.push({ i, f0: f, f1: Math.min(total, f + per), file: path.join(outDir, 'chunks', `c${String(i).padStart(3, '0')}.mkv`) });
    { // resume only if the plan is unchanged; stale chunks from an older plan are discarded
      const stamp = path.join(outDir, 'chunks', 'plan.sha'), sha = (await import('crypto')).createHash('sha1').update(JSON.stringify([plan, opt.w, opt.h, opt.fps])).digest('hex');
      if ((fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8') : '') !== sha) { chunks.forEach(c => fs.rmSync(c.file, { force: true })); fs.writeFileSync(stamp, sha); } }
    let done = chunks.filter(c => fs.existsSync(c.file)).length; log(done / chunks.length);
    const queue = chunks.filter(c => !fs.existsSync(c.file));
    const t0 = Date.now();
    await Promise.all(Array.from({ length: opt.workers }, async () => {
      const reuse = { page: null };
      while (queue.length) { const c = queue.shift();
        for (let attempt = 1; ; attempt++) {
          const key = chunkKey(plan, opt, c.f0, c.f1), cached = path.join(CACHE_DIR, key + '.mkv');
          if (fs.existsSync(cached)) { fs.mkdirSync(path.dirname(c.file), { recursive: true }); fs.copyFileSync(cached, c.file); console.log(`[render] chunk ${c.i + 1}/${chunks.length} from cache`); break; }
          try { if (attempt >= 2) { browser = await renderChunkSplit(browser, url, plan, opt, c); } else await renderChunk(browser, url, plan, opt, c.i, c.f0, c.f1, c.file, reuse); fs.mkdirSync(CACHE_DIR, { recursive: true }); fs.copyFileSync(c.file, cached + '.tmp'); fs.renameSync(cached + '.tmp', cached); break; }
          catch (e) { console.error(`[render] chunk ${c.i} attempt ${attempt} failed: ${e.message}`); if (attempt >= 3) throw e;
            reuse.page = null;
            // a crashed browser stays dead: relaunch it before the retry
            try { await browser.close(); } catch {}
            browser = await chromium.launch(gpu ? { headless: true, args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=default"] } : { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] }); }
        }
        done++; log(done / chunks.length); console.log(`[render] chunk ${c.i + 1}/${chunks.length} ok (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      }
    }));
    const list = path.join(outDir, 'chunks', 'list.txt');
    fs.writeFileSync(list, chunks.map(c => `file '${path.basename(c.file)}'`).join('\n'));
    const silent = path.join(outDir, 'video_silent.mkv');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
    const out = path.join(outDir, 'final.mp4');
    // two-pass loudnorm: measure, then apply linear normalisation to exactly -14 LUFS
    const meas = spawnSync('ffmpeg', ['-hide_banner', '-i', audio, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
    let af = 'loudnorm=I=-14:TP=-1.5:LRA=11';
    try { const m = JSON.parse(meas.slice(meas.lastIndexOf('{'), meas.lastIndexOf('}') + 1));
      af = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`; } catch {}
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-i', audio,
      '-vf', `scale=1080:1920:flags=lanczos,fps=${opt.outFps}`, '-af', af,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-map', '0:v:0', '-map', '1:a:0', '-shortest', '-movflags', '+faststart', out]);
    return { out };
  } finally { await browser.close(); server.close(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const flags = {};
  for (let i = 3; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); flags[k] = a[i + 1] && !a[i + 1].startsWith('--') ? +a[++i] : true; }
  console.log(await render(a[0], a[1], a[2], flags));
}
