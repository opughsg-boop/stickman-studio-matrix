// plan.json + audio -> final mp4. Chunked (resumable) rendering with retries and parallel workers.
// node pipeline/render.mjs PLAN.json AUDIO OUT_DIR [--fps 15] [--w 540] [--workers 2] [--preview]
import fs from 'fs';
import path from 'path';
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
  return new Promise(r => { const s = app.listen(0, () => r({ server: s, url: `http://127.0.0.1:${s.address().port}/renderer/` })); });
}

async function openPage(browser, url, plan, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => console.error('[page]', e.message));
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

async function renderChunk(browser, url, plan, opt, ci, f0, f1, file) {
  const page = await openPage(browser, url, plan, opt.w, opt.h);
  const tmp = file + '.part.mkv'; const { ff, done } = encodeChunk(tmp, opt.fps);
  try {
    for (let f = f0; f < f1; f++) {
      const b64 = await page.evaluate(t => window.renderAt(t), f / opt.fps);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await done; fs.renameSync(tmp, file);
  } finally { await page.close().catch(() => {}); try { ff.stdin.end(); } catch {} }
}

export async function render(planFile, audio, outDir, o = {}) {
  const opt = { fps: 15, w: 540, h: 960, workers: 2, chunkSec: 12, outFps: 30, ...o };
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  fs.mkdirSync(path.join(outDir, 'chunks'), { recursive: true });
  const { server, url } = await startStatic();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const log = o.onProgress || (() => {});
  try {
    if (opt.preview) { // stills from the middle of every beat
      const page = await openPage(browser, url, plan, opt.w, opt.h); const files = [];
      for (const [i, b] of (plan.beats || plan.shots).entries()) { const f = path.join(outDir, `preview_${String(i).padStart(2, '0')}.jpg`);
        fs.writeFileSync(f, Buffer.from(await page.evaluate(t => window.renderAt(t), (b.start + b.end) / 2), 'base64')); files.push(f); }
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(outDir, 'preview_*.jpg'), '-vf', `scale=270:-1,tile=${Math.min(6, files.length)}x${Math.ceil(files.length / 6)}`, '-frames:v', '1', path.join(outDir, 'sheet_preview.jpg')]);
      return { preview: path.join(outDir, 'sheet_preview.jpg'), files };
    }
    const total = Math.ceil(plan.duration * opt.fps), per = Math.round(opt.chunkSec * opt.fps), chunks = [];
    for (let f = 0, i = 0; f < total; f += per, i++) chunks.push({ i, f0: f, f1: Math.min(total, f + per), file: path.join(outDir, 'chunks', `c${String(i).padStart(3, '0')}.mkv`) });
    let done = chunks.filter(c => fs.existsSync(c.file)).length; log(done / chunks.length);
    const queue = chunks.filter(c => !fs.existsSync(c.file));
    const t0 = Date.now();
    await Promise.all(Array.from({ length: opt.workers }, async () => {
      while (queue.length) { const c = queue.shift();
        for (let attempt = 1; ; attempt++) {
          try { await renderChunk(browser, url, plan, opt, c.i, c.f0, c.f1, c.file); break; }
          catch (e) { console.error(`[render] chunk ${c.i} attempt ${attempt} failed: ${e.message}`); if (attempt >= 3) throw e; }
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
