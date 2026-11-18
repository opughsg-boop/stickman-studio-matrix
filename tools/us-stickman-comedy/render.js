// node render.js scene.html out_dir [fps=30] [workers=3]      -> out_dir/00000.jpg ...
// node render.js scene.html out_dir --stills 1,4.5,9            -> out_dir/s1.png ... (for checking)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [, , html, out, a3, a4] = process.argv;
  fs.mkdirSync(out, { recursive: true });
  const stills = a3 === '--stills' ? a4.split(',').map(Number) : null;
  const fps = stills ? 30 : (+a3 || 30), workers = stills ? 1 : (+a4 || 3);
  const b = await chromium.launch();
  const open = async () => {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.resolve(html));
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    return p;
  };
  const shot = async (p, t, file, png) => {
    await p.evaluate(t => render(t), t);
    await (await p.$('#stage')).screenshot({ path: file, ...(png ? {} : { type: 'jpeg', quality: 92 }) });
  };
  if (stills) { const p = await open(); for (const t of stills) await shot(p, t, `${out}/s${String(t).replace('.', '_')}.png`, 1); await b.close(); return; }
  const p0 = await open(); const n = Math.round(await p0.evaluate(() => window.DUR) * fps); await p0.close();
  let done = 0;
  await Promise.all([...Array(workers)].map(async (_, w) => {
    const p = await open();
    for (let i = w; i < n; i += workers) { await shot(p, i / fps, `${out}/${String(i).padStart(5, '0')}.jpg`); if (++done % 90 === 0) process.stdout.write(`${done}/${n} `); }
  }));
  await b.close(); console.log(`done ${n} frames`);
})();
