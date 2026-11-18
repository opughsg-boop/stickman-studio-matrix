// node render.js <scene.html> <out_dir> [fps=30] [workers=4]          -> out_dir/00000.jpg ...
// node render.js <scene.html> <out_dir> --stills 1.5,9,40            -> out_dir/s_<t>.png (contact-sheet checks)
// Offline: loads a local file with inline script only, no network, proxy disabled.
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright', { paths: [path.join(__dirname, '..', '..')] }));

const [, , scenePath, outDir, ...rest] = process.argv;
if (!scenePath || !outDir) { console.error('usage: node render.js scene.html out_dir [fps] [workers] | --stills t1,t2'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const url = 'file://' + path.resolve(scenePath);
const launch = () => chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--no-proxy-server', '--disable-gpu', '--font-render-hinting=none'],
});

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

(async () => {
  const browser = await launch();
  if (rest[0] === '--stills') {
    const page = await openPage(browser);
    const times = (rest[1] || '0').split(',').map(Number);
    for (const t of times) {
      await page.evaluate(tt => window.renderAt(tt), t);
      await page.locator('canvas').screenshot({ path: path.join(outDir, `s_${t}.png`) });
    }
    console.log('stills', times.length);
    await browser.close();
    return;
  }
  const fps = Number(rest[0] || 30);
  const workers = Number(rest[1] || 4);
  const dur = await (async () => { const p = await openPage(browser); const d = await p.evaluate(() => window.DUR); await p.close(); return d; })();
  const total = Math.round(dur * fps);
  const pages = await Promise.all(Array.from({ length: workers }, () => openPage(browser)));
  let next = 0;
  await Promise.all(pages.map(async page => {
    while (true) {
      const i = next++;
      if (i >= total) break;
      const t = i / fps;
      const b64 = await page.evaluate(tt => { window.renderAt(tt); return window.canvas.toDataURL('image/jpeg', 0.94); }, t);
      fs.writeFileSync(path.join(outDir, String(i).padStart(5, '0') + '.jpg'), Buffer.from(b64.split(',')[1], 'base64'));
    }
  }));
  console.log('frames', total, 'duration', dur);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
