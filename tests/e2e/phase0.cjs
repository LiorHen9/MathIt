const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase0.cjs <screenshots-dir> [url]
// Runs against a served build at phone size, from empty storage.
// Checks: the splash and its entrance animation, the first sound only after a tap, the lazy next
// screen (the first profile, since storage is empty), local storage (schema version, device id),
// reduced motion, dark mode, touch sizes, no sideways scroll, the manifest (when the build has one)
// and the first-load size.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';
const BUDGET = 300 * 1024;

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function phone(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...opts });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push('pageerror: ' + e));
  p.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text());
  });
  return { ctx, p, errors };
}

(async () => {
  const b = await chromium.launch();

  // ---------- Normal motion, light ----------
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
    let bytes = 0;
    p.on('response', async (r) => {
      try {
        bytes += (await r.body()).length;
      } catch {
        /* redirects have no body */
      }
    });
    await p.goto(URL);
    await p.waitForSelector('.splash');
    must((await p.getAttribute('html', 'dir')) === 'rtl', 'html is not dir=rtl');
    must((await p.getAttribute('html', 'lang')) === 'he', 'html is not lang=he');
    must((await p.getAttribute('html', 'data-motion')) === null, 'data-motion set without reduced motion');
    // Mid-entrance: letters are still coming in.
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/00-splash-entering.png` });
    const midOpacity = await p.$eval('.splash-go', (el) => Number(getComputedStyle(el).opacity));
    must(midOpacity < 0.5, `button should still be fading in at 350ms (opacity ${midOpacity})`);
    await p.waitForTimeout(1300);
    await p.screenshot({ path: `${SHOTS}/01-splash.png` });
    const endOpacity = await p.$eval('.splash-go', (el) => Number(getComputedStyle(el).opacity));
    must(endOpacity > 0.95, `button not visible after the entrance (opacity ${endOpacity})`);
    step('splash enters with an animation, RTL Hebrew page');

    // Animations use only transform and opacity.
    const props = await p.evaluate(() =>
      document.getAnimations().flatMap((a) =>
        a.effect && a.effect.getKeyframes ? a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))) : []
      )
    );
    const bad = [...new Set(props)].filter((x) => x !== 'transform' && x !== 'opacity');
    must(bad.length === 0, 'animations change more than transform/opacity: ' + bad.join(','));
    step(`running animations touch only transform/opacity (${new Set(props).size} properties)`);

    const font = await p.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('700 20px Rubik');
    });
    must(font, 'Rubik font not loaded');
    step('Rubik loaded from the app itself');

    const meta = await p.evaluate(
      () =>
        new Promise((resolve) => {
          const req = indexedDB.open('mathit');
          req.onsuccess = () => {
            const tx = req.result.transaction('meta', 'readonly');
            const s = tx.objectStore('meta');
            const v = s.get('schemaVersion');
            const d = s.get('deviceId');
            tx.oncomplete = () => resolve({ v: v.result, d: d.result, stores: [...req.result.objectStoreNames] });
          };
          req.onerror = () => resolve(null);
        })
    );
    must(meta && meta.v === 5, 'schemaVersion not 5: ' + JSON.stringify(meta));
    must(meta.d && meta.d.length > 8, 'no device id');
    must(meta.stores.join() === 'inventory,meta,profiles,questProgress,sessions,skillStates', 'stores: ' + meta.stores);
    step('IndexedDB "mathit": stores meta + profiles + skillStates + questProgress + inventory + sessions, schemaVersion 5, device id');

    // No sound before the first touch, the chime right after it.
    must((await p.evaluate(() => window.__mathitSounds.length)) === 0, 'sound before any touch');
    const sizes = await p.$$eval('button', (els) => els.filter((e) => e.offsetParent).map((e) => [e.textContent.trim(), e.getBoundingClientRect().width, e.getBoundingClientRect().height]));
    for (const [t, w, h] of sizes) must(w >= 48 && h >= 48, `button "${t}" is ${w}x${h}, under 48px`);
    step(`touch targets ≥ 48px (${sizes.length} buttons)`);

    // force: the button gently "breathes", so Playwright never sees it as stable.
    await p.tap('.splash-go', { force: true });
    must((await p.evaluate(() => window.__mathitSounds.join())) === 'start', 'no start chime on tap');
    await p.waitForTimeout(150);
    must(await p.$('.splash.is-leaving'), 'splash does not animate out');
    await p.screenshot({ path: `${SHOTS}/02-splash-leaving.png` });
    // Empty storage: straight to creating the first profile.
    await p.waitForSelector('.profile-editor');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SHOTS}/03-next.png` });
    step('tap → start chime, exit animation, lazy next screen (first profile)');

    await p.tap('text=חזרה');
    await p.waitForSelector('.splash');
    must((await p.evaluate(() => window.__mathitSounds.join())) === 'start,tap', 'tap sound missing');
    step('back to the splash with a tap sound');

    const scroll = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    must(scroll <= 0, 'sideways scroll: ' + scroll);
    step('no sideways scroll at 390px');

    // Manifest: vite-plugin-pwa adds it in the real build (not in the local bun build).
    const manifestHref = await p.getAttribute('link[rel=manifest]', 'href').catch(() => null);
    if (manifestHref) {
      const m = await p.evaluate(async (h) => (await fetch(h)).json(), manifestHref);
      must(m.lang === 'he' && m.dir === 'rtl' && m.short_name === 'MathIt', 'manifest fields');
      must(m.icons.some((i) => i.sizes === '512x512'), 'manifest has no 512 icon');
      const sw = await p.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
      step(`manifest OK (he, rtl, icons); service worker registered: ${sw}`);
    } else step('manifest: none in this build (added by vite-plugin-pwa in CI)');

    must(bytes < BUDGET, `first load ${bytes} bytes, budget ${BUDGET}`);
    step(`first load ${(bytes / 1024).toFixed(1)}KB uncompressed (budget 300KB)`);
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ---------- Reduced motion, dark ----------
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce', viewport: { width: 360, height: 740 } });
    await p.goto(URL);
    await p.waitForSelector('.splash');
    must((await p.getAttribute('html', 'data-motion')) === 'reduced', 'data-motion not set with reduced motion');
    await p.waitForTimeout(300);
    const op = await p.$eval('.splash-go', (el) => Number(getComputedStyle(el).opacity));
    must(op > 0.95, `reduced motion: button should be visible quickly (opacity ${op})`);
    const floating = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);
    must(floating === 0, `reduced motion: ${floating} endless animations still running`);
    await p.screenshot({ path: `${SHOTS}/04-splash-dark-reduced.png` });
    step('reduced motion: short fade, no floating or breathing');
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    must(bg === 'rgb(22, 20, 42)', 'dark background: ' + bg);
    step('dark mode colours');
    const t0 = Date.now();
    // force: the button gently "breathes", so Playwright never sees it as stable.
    await p.tap('.splash-go', { force: true });
    await p.waitForSelector('.profile-editor');
    must(Date.now() - t0 < 450, 'reduced motion: next screen should come without the exit wait');
    await p.screenshot({ path: `${SHOTS}/05-next-dark.png` });
    const scroll = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    must(scroll <= 0, 'sideways scroll at 360px: ' + scroll);
    step('reduced motion: next screen at once; no sideways scroll at 360px');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  await b.close();
  console.log('\nphase 0 e2e passed');
})().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
