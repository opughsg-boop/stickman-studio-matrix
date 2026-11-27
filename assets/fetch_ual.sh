#!/usr/bin/env bash
# Downloads the Quaternius Universal Animation Library (Standard, CC0) into assets/lib/ual/.
# Not stored in git. Run once per fresh container: bash assets/fetch_ual.sh
set -eu
cd "$(dirname "$0")/.."
OUT=assets/lib/ual
if [ -f "$OUT/UAL1_Standard.glb" ]; then echo "ual ready"; exit 0; fi
mkdir -p "$OUT"
# itch.io serves the free Standard zip only through its download page; the page's download button is used via Playwright
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ acceptDownloads: true });
  await p.goto('https://quaternius.itch.io/universal-animation-library', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.locator('.buy_btn, .download_btn, a.button:has-text(\"Download\"), button:has-text(\"Download\")').first().click({ timeout: 30000 });
  await p.waitForTimeout(3000);
  const nt = p.locator('text=No thanks').first(); if (await nt.count()) await nt.click().catch(() => {});
  const std = p.locator('.upload:has-text(\"Standard\") a, a:has-text(\"Standard\")').first();
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), std.click({ timeout: 60000 })]);
  await dl.saveAs('$OUT/ual_standard.zip'); await b.close();
})().catch(e => { console.error('ERR', e.message.slice(0, 200)); process.exit(1); });
"
cd "$OUT" && unzip -oq ual_standard.zip && cp "Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb" . && rm -f ual_standard.zip
echo "ual ready"
