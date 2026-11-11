// node render.mjs spec.json out.mp4   — renders the diorama frame by frame (headless Chromium, software GL) into ffmpeg.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [specPath, out] = process.argv.slice(2); const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
Object.assign(spec, { width: spec.width || 1080, height: spec.height || 1920, fps: spec.fps || 30 });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.mjs': 'text/javascript' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f)); }).listen(0);
const port = srv.address().port;
const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const br = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const pg = await br.newPage({ viewport: { width: spec.width, height: spec.height } });
pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
await pg.addStyleTag({ content: `@font-face{font-family:"Bebas Neue";src:url(http://localhost:${port}/assets/fonts/BebasNeue-Regular.ttf)}` }).catch(() => {});
await pg.goto(`http://localhost:${port}/diorama/scene.html`); await pg.waitForFunction(() => window.setup);
await pg.evaluate(s => window.setup(s), spec);
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(spec.fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round(spec.duration * spec.fps);
for (let i = 0; i < n; i++) { await pg.evaluate(t => window.renderAt(t), i / spec.fps);
  const buf = await pg.screenshot({ type: 'jpeg', quality: 95 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 30 == 0) console.error(`frame ${i}/${n}`); }
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await br.close(); srv.close();
