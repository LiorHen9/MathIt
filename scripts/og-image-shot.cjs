// Screenshot scripts/og-image.html (made by `bun scripts/og-image.ts`) into public/og-image.png.
// Needs Playwright: NODE_PATH=$(npm root -g) node scripts/og-image-shot.cjs
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'og-image.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const out = path.join(__dirname, '..', 'public', 'og-image.png');
  await p.screenshot({ path: out });
  await b.close();
  // A 256-colour palette keeps it small (~40KB instead of ~300KB), if Pillow is there.
  try {
    require('child_process').execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open('${out}').convert('RGB')\nim.quantize(colors=256,method=2,dither=1).save('${out}',optimize=True)`]);
  } catch {
    console.log('(not compressed: no python3 with Pillow)');
  }
  console.log('wrote public/og-image.png');
})();
