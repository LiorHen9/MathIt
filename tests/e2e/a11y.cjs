const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
// Accessibility in every main screen, in all six worlds, light and dark (phase 10).
// Usage: node tests/e2e/a11y.cjs <screenshots-dir> [url]   (ONLY=fairies,ninja… WORLDS to run some)
//
// Also a module: phase10.cjs uses the checks below on its own screens.
//
// Per screen: text contrast (WCAG 4.5:1, 3:1 for large text; walking up to the background a text
// sits on, opacity mixed in), every button and link has a name, touch targets ≥ 48px, no sideways
// scroll, feedback lives in an aria-live region, the boards have their roles (grid / role=button
// with aria-pressed). Per world: the same screens at 320px, keyboard navigation with a visible
// focus ring (Tab moves through the map, Enter answers a question), and text at 200% (nothing
// sideways, no button whose text spills out of it).
// Screens: the map, free practice, a round (with the hint after a mistake), a lesson, the
// collection, the achievements, the settings, About, a puzzle (KenKen), the boss, the end of the
// chapter and the journey's certificate; and the shared ones in the base look: the first screen,
// "who is playing?", the profile editor, the parents' door, the parents' area, a child's dashboard.

const TOUCH = 48;

const TOUCH_FN = (min) => {
  const out = [];
  const sel = 'button, a[href], input, select, textarea, [role=button], [role=radio], [role=checkbox], [role=tab]';
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('[aria-hidden=true], [data-a11y-skip], .pt-tile.is-placed')) continue;
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue;
    if (el.matches('input[type=file]')) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') {
      // A slice of the pizza (role=button inside an SVG): its whole picture is the target.
      continue;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    if (r.width < min - 0.5 || r.height < min - 0.5) {
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
      out.push(`${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).trim().split(/\s+/).join('.')} "${label.slice(0, 24)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  }
  return out;
};

const CONTRAST_FN = () => {
  const parse = (c) => {
    let m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    m = c.match(/color\(srgb ([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[ /]+/).filter(Boolean).map(Number);
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
    }
    return null;
  };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lum = (c) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const backdrop = (el) => {
    const chain = [];
    let image = false;
    for (let e = el; e; e = e.parentElement) {
      const st = getComputedStyle(e);
      const bg = parse(st.backgroundColor);
      if (st.backgroundImage !== 'none') image = true;
      if (bg && bg.a > 0) {
        chain.push(bg);
        if (bg.a >= 1) break;
      }
    }
    let c = { r: 255, g: 255, b: 255, a: 1 };
    const root = parse(getComputedStyle(document.body).backgroundColor);
    if (root && root.a > 0) c = over(root, c);
    for (let i = chain.length - 1; i >= 0; i--) c = over(chain[i], c);
    return { color: c, image };
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  };
  const out = [];
  const seen = new Set();
  const roots = [...document.querySelectorAll('main, .ach-live, .update-bar')];
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim();
      if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;
      const el = n.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('[aria-hidden=true], .visually-hidden, [data-a11y-skip]')) continue;
      // SVG text: the certificate and the boards draw their own backgrounds (checked as pictures).
      if (el.closest('svg')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden') continue;
      const fg = parse(st.color);
      if (!fg) continue;
      const { color: bg, image } = backdrop(el);
      // Text over a picture (a gradient, an image) is judged by eye in the screenshots.
      if (image) continue;
      const op = opacityOf(el);
      // Not shown yet (a teaching animation reveals it later): nothing to read.
      if (op < 0.15) continue;
      // Something fading in or out (an animation in progress) is not its final colour.
      if (op < 0.98 && document.getAnimations().some((a) => a.playState === 'running' && a.effect?.target?.contains?.(el))) continue;
      const shown = over({ ...fg, a: fg.a * op }, bg);
      const cr = ratio(shown, bg);
      const size = parseFloat(st.fontSize);
      const large = size >= 24 || (Number(st.fontWeight) >= 700 && size >= 18.66);
      const disabled = !!el.closest(':disabled, [aria-disabled=true]');
      const min = disabled || large ? 3 : 4.5;
      if (cr < min) out.push(`"${text.slice(0, 24)}" .${String(el.className).split(' ')[0]} ${cr.toFixed(2)} < ${min}`);
    }
  }
  return out;
};

const NAMES_FN = () => {
  const out = [];
  for (const el of document.querySelectorAll('button, a[href], [role=button], [role=radio], [role=tab]')) {
    if (el.closest('[aria-hidden=true]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
    const text = [...el.childNodes].map((c) => (c.nodeType === 3 ? c.textContent : c.getAttribute?.('aria-hidden') === 'true' ? '' : c.textContent)).join('').trim();
    // An emoji is read by its name, so it can label a button; symbols like ✕ or → cannot.
    if (!name && !/[\p{L}\p{N}]|\p{Extended_Pictographic}/u.test(text.replace(/[✎⚙✕→←]️?/g, ''))) out.push(`${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]} "${text}"`);
  }
  return out;
};

const SIDEWAYS_FN = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;

/** Buttons whose text spills out of them (text at 200%). */
const SPILL_FN = () => {
  const out = [];
  for (const el of document.querySelectorAll('main button, main .chip, main .btn')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || el.closest('[aria-hidden=true]')) continue;
    if (el.scrollWidth > el.clientWidth + 2) out.push(`"${el.textContent.trim().slice(0, 20)}" ${el.scrollWidth}>${el.clientWidth}`);
  }
  return out;
};

/** Every check of one screen; throws with all that is wrong. */
async function checkScreen(p, where, opts = {}) {
  // Let entrance animations end (a screen's move is 200ms; pops and drops a little longer).
  await p.waitForTimeout(opts.settle ?? 650);
  const problems = [];
  const contrast = await p.evaluate(CONTRAST_FN);
  if (contrast.length) problems.push('contrast: ' + contrast.join(' | '));
  const names = await p.evaluate(NAMES_FN);
  if (names.length) problems.push('no name: ' + names.join(' | '));
  const touch = await p.evaluate(TOUCH_FN, TOUCH);
  if (touch.length) problems.push('touch < 48px: ' + touch.join(' | '));
  const side = await p.evaluate(SIDEWAYS_FN);
  if (side > 0) problems.push(`sideways scroll ${side}px`);
  if (opts.live) {
    const live = await p.$$eval('[aria-live], [role=status], [role=alert]', (els) => els.length);
    if (!live) problems.push('no aria-live region for feedback');
  }
  if (problems.length) throw new Error(`${where}:\n  ${problems.join('\n  ')}`);
}

/** The visible focus ring on whatever has focus (an outline or a ring of box-shadow). */
const FOCUS_FN = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const st = getComputedStyle(el);
  const ring = (st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2) || /\d+px \d+px 0px [2-9]px|0px 0px 0px [2-9]px/.test(st.boxShadow);
  return { tag: el.tagName.toLowerCase(), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20), ring };
};

module.exports = { checkScreen, TOUCH_FN, CONTRAST_FN, NAMES_FN, SIDEWAYS_FN, SPILL_FN, FOCUS_FN };

// ======================= Run as a test =======================
if (require.main === module) {
  const SHOTS = process.argv[2] || '.';
  const URL = process.argv[3] || 'http://localhost:4173/';
  const ALL = ['fairies', 'football', 'basketball', 'ninja', 'blocks', 'stage'];
  const WORLDS = process.env.ONLY ? ALL.filter((w) => process.env.ONLY.split(',').includes(w)) : ALL;
  const step = (s) => console.log('✓', s);
  const must = (c, m) => {
    if (!c) throw new Error(m);
  };
  const NODES = ['chapter1.ts', 'chapters.ts', 'chapters6.ts'].flatMap((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../src/core/quest', f), 'utf8');
    return [...src.matchAll(/id: '([^']+)',\s*kind: '(\w+)'/g)].map((m) => ({ id: m[1], kind: m[2] }));
  });
  let last = null;

  async function phone(b, opts = {}) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, ...opts });
    const p = await ctx.newPage();
    last = p;
    p.setDefaultTimeout(30000);
    const errors = [];
    p.on('pageerror', (e) => errors.push('pageerror: ' + e));
    p.on('console', (m) => m.type() === 'error' && !m.text().includes('ERR_TUNNEL') && errors.push(m.text()));
    return { ctx, p, errors };
  }

  async function idb(p, body, arg) {
    return p.evaluate(
      async ([src, a]) => {
        const db = await new Promise((r) => {
          const q = indexedDB.open('mathit');
          q.onsuccess = () => r(q.result);
        });
        const getAll = (d, s) => new Promise((r) => (d.transaction(s).objectStore(s).getAll().onsuccess = (e) => r(e.target.result)));
        const put = (d, s, v, k) =>
          new Promise((r) => {
            const t = d.transaction(s, 'readwrite');
            t.objectStore(s).put(v, k);
            t.oncomplete = r;
          });
        const out = await new Function('db', 'getAll', 'put', 'a', `return (${src})(db, getAll, put, a)`)(db, getAll, put, a);
        db.close();
        return out;
      },
      [body.toString(), arg]
    );
  }

  async function newProfile(p, { name, gender, world }) {
    await p.goto(URL);
    await p.waitForSelector('.splash');
    await p.tap('.splash-go', { force: true });
    await p.waitForSelector('.profile-editor');
    await p.fill('.profile-editor input[name=name]', name);
    await p.tap('.avatar-option >> nth=2');
    await p.tap('[data-stage-mode=grade]');
    await p.tap('[data-grade="5"]');
    await p.tap(`[data-gender=${gender}]`);
    await p.tap(`[data-world-id=${world}]`);
    await p.tap('[data-testid=save-profile]');
    await p.waitForSelector('.quest-map .map-node');
  }

  /** Everything before the last boss done; back in. */
  async function seedToFinalBoss(p) {
    const before = NODES.slice(0, NODES.findIndex((n) => n.id === 'c10-boss'));
    await idb(
      p,
      async (db, getAll, put, a) => {
        const [prof] = await getAll(db, 'profiles');
        const stars = {};
        const chests = {};
        for (const n of a.before) {
          if (n.kind === 'chest') chests[n.id] = '🎁';
          else stars[n.id] = n.kind === 'lesson' ? 1 : 3;
        }
        const ids = a.before.map((n) => n.id);
        await put(db, 'questProgress', { profileId: prof.id, stars, chests, at: a.last, revealed: [...ids, 'c10-boss'], last: a.last, updated: 1, reviewedAt: 0, reviews: 0, reviewRevealed: 0, placedAt: 0 }, prof.id);
      },
      { before, last: before.at(-1).id }
    );
    await p.goto(URL);
    await p.waitForSelector('.splash');
    await p.tap('.splash-go', { force: true });
    await p.waitForSelector('.profile-pick');
    await p.tap('.profile-pick >> nth=0');
    await p.waitForSelector('.quest-map .map-node');
  }

  async function give(p, value) {
    if (await p.$('.numpad')) {
      for (const d of String(value)) await p.tap(`.numpad-key[data-key="${d}"]`);
      await p.tap('.numpad-key[data-key=ok]');
    } else await p.tap(`.bubble[data-answer="${value}"]`, { force: true });
  }

  async function backToMap(p) {
    for (const sel of ['[data-testid=collection-back]', '[data-testid=achievements-back]', '.settings-screen .btn-back', '[data-testid=game-home]', '[data-testid=boss-close]']) {
      if (await p.$(sel)) {
        await p.tap(sel);
        break;
      }
    }
    await p.waitForSelector('.quest-map .map-node');
  }

  (async () => {
    const b = await chromium.launch();
    try {
      for (const world of WORLDS) {
        for (const scheme of ['light', 'dark']) {
          const tag = `${world}/${scheme}`;
          // Reduced motion: the same colours and layout, quicker parties.
          const { ctx, p, errors } = await phone(b, { colorScheme: scheme, reducedMotion: 'reduce' });
          await newProfile(p, { name: 'דנה', gender: scheme === 'light' ? 'girl' : 'boy', world });
          await seedToFinalBoss(p);
          const shot = async (name) => p.screenshot({ path: `${SHOTS}/a11y-${world}-${scheme}-${name}.png` });

          // The map (chapter 10, the boss open).
          await checkScreen(p, `${tag} map`);
          // Keyboard (light only): Tab walks the map's controls with a visible ring.
          if (scheme === 'light') {
            const rings = [];
            for (let i = 0; i < 12; i++) {
              await p.keyboard.press('Tab');
              rings.push(await p.evaluate(FOCUS_FN));
            }
            const got = rings.filter(Boolean);
            must(got.length >= 8 && new Set(got.map((r) => r.label)).size >= 6, `${tag}: Tab should move through the map's controls: ${JSON.stringify(got)}`);
            const noRing = got.filter((r) => !r.ring);
            must(noRing.length === 0, `${tag}: no visible focus on ${JSON.stringify(noRing)}`);
            // 320px wide.
            await p.setViewportSize({ width: 320, height: 640 });
            await checkScreen(p, `${tag} map at 320px`, { settle: 300 });
            await p.setViewportSize({ width: 360, height: 740 });
          }

          // Free practice and a round, with a mistake (the hint, the aria-live feedback).
          await p.tap('[data-testid=open-practice]');
          await p.waitForSelector('.home [data-skill]');
          await checkScreen(p, `${tag} free practice`);
          await p.tap('.home [data-skill="geo.area"]');
          await p.waitForSelector('.game[data-answer]');
          await checkScreen(p, `${tag} a round`, { live: true });
          const right = await p.getAttribute('.game', 'data-answer');
          if (await p.$('.bubble:not([disabled])')) {
            const wrong = (await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer))).find((x) => x !== right);
            await give(p, wrong);
          } else await give(p, String(Number(right) + 1));
          await p.waitForSelector('[data-testid=hint]');
          await checkScreen(p, `${tag} a round's hint`, { live: true });
          if (scheme === 'light') {
            // Keyboard: Enter on the right answer answers it.
            const m = await p.evaluate(() => window.__mathitFx.length);
            if (await p.$(`.bubble[data-answer="${right}"]`)) {
              await p.focus(`.bubble[data-answer="${right}"]`);
              await p.keyboard.press('Enter');
              await p.waitForFunction((n) => window.__mathitFx.slice(n).some((e) => e.type === 'correct'), m);
            }
            await p.setViewportSize({ width: 320, height: 640 });
            await checkScreen(p, `${tag} a round at 320px`, { settle: 300 });
            await p.setViewportSize({ width: 360, height: 740 });
          }
          await shot('round');
          await p.tap('[data-testid=game-home]');
          // A lesson from free practice.
          await p.waitForSelector('.home [data-lesson="frac.part"]');
          await p.tap('.home [data-lesson="frac.part"]');
          await p.waitForSelector('.lesson');
          await checkScreen(p, `${tag} a lesson`, { live: true });
          await shot('lesson');
          await p.tap('[data-testid=lesson-home]');
          await p.waitForSelector('[data-testid=practice-back]');
          await p.tap('[data-testid=practice-back]');
          await p.waitForSelector('.quest-map .map-node');

          // The collection and the achievements.
          await p.tap('[data-testid=open-collection]');
          await p.waitForSelector('[data-testid=collection] .shelf');
          await checkScreen(p, `${tag} collection`);
          await p.tap('[data-testid=collection-back]');
          await p.waitForSelector('.quest-map .map-node');
          await p.tap('[data-testid=open-achievements]');
          await p.waitForSelector('[data-testid=achievements] .ach-card');
          await checkScreen(p, `${tag} achievements`);
          await shot('achievements');
          await p.tap('[data-testid=achievements-back]');
          await p.waitForSelector('.quest-map .map-node');

          // The settings and About (from them).
          await p.tap('[data-testid=open-settings]');
          await p.waitForSelector('.settings-screen');
          await checkScreen(p, `${tag} settings`);
          await p.tap('[data-testid=open-about]');
          await p.waitForSelector('[data-testid=about]');
          await checkScreen(p, `${tag} about`, { live: true });
          await p.tap('[data-testid=about-back]');
          await p.waitForSelector('.settings-screen');
          await p.tap('.settings-screen .btn-back');
          await p.waitForSelector('.quest-map .map-node');

          // A puzzle: KenKen (a grid of cells, keys to type in).
          await p.tap('.map-node[data-node="c10-kenken"]');
          await p.waitForSelector('[data-testid=puzzle] .kk-grid');
          must(await p.$('.kk-grid[role=grid]'), `${tag}: the KenKen board is a grid`);
          await p.tap('.kk-cell:not(.is-fixed) >> nth=0');
          await checkScreen(p, `${tag} kenken`, { live: true });
          await shot('kenken');
          await p.tap('[data-testid=puzzle-close]');
          await p.waitForSelector('.quest-map .map-node');

          // The last boss, beaten: the boss, the chapter's end, the journey's certificate.
          await p.tap('.map-node[data-node="c10-boss"]');
          await p.waitForSelector('[data-testid=boss-start]');
          await checkScreen(p, `${tag} boss`);
          await p.tap('[data-testid=boss-start]');
          for (let i = 0; i < 30 && !(await p.$('.boss-won')); i++) {
            await p.waitForSelector('.boss-screen[data-answer] .bubble:not([disabled]), .boss-screen[data-answer] .numpad, .boss-won');
            if (await p.$('.boss-won')) break;
            const hp = await p.getAttribute('.boss-hp', 'data-hp');
            await give(p, await p.getAttribute('.boss-screen', 'data-answer'));
            await p.waitForFunction((h) => !!document.querySelector('.boss-won') || document.querySelector('.boss-hp')?.dataset.hp !== h, hp);
            if (i === 0) await checkScreen(p, `${tag} boss fight`, { live: true, settle: 200 });
          }
          await p.waitForSelector('[data-testid=boss-to-map][data-next=chapter-end]', { timeout: 15000 });
          await p.tap('[data-testid=boss-to-map]');
          await p.waitForSelector('[data-testid=chapter-end][data-phase=summary]', { timeout: 15000 });
          await checkScreen(p, `${tag} chapter end`);
          await p.tap('[data-testid=to-finale]');
          await p.waitForSelector('[data-testid=finale][data-phase=done] [data-testid=certificate] svg', { timeout: 15000 });
          await checkScreen(p, `${tag} finale`, { live: true });
          await shot('finale');
          // Text at 200% (light): nothing sideways, no button text spilling out.
          if (scheme === 'light') {
            for (const [name, open] of [
              ['finale', null],
              ['map', '[data-testid=finale-map]']
            ]) {
              if (open) {
                await p.tap(open);
                await p.waitForSelector('.quest-map .map-node');
              }
              await p.addStyleTag({ content: 'html, body { font-size: 34px !important; }', path: undefined });
              await p.waitForTimeout(300);
              const side = await p.evaluate(SIDEWAYS_FN);
              const spill = await p.evaluate(SPILL_FN);
              await p.screenshot({ path: `${SHOTS}/a11y-${world}-text200-${name}.png` });
              must(side <= 0 && spill.length === 0, `${tag} text 200% on the ${name}: sideways ${side}px, spilling: ${spill.join(' | ')}`);
              await p.evaluate(() => document.querySelectorAll('style').forEach((s) => s.textContent.includes('34px !important') && s.remove()));
            }
          }
          must(errors.length === 0, `${tag} errors: ${errors.join('\n')}`);
          await ctx.close();
          step(`${tag}: map, practice, a round and its hint, a lesson, collection, achievements, settings, about, kenken, the boss, the chapter's end and the certificate – contrast, names, ≥ 48px, no sideways scroll, aria-live${scheme === 'light' ? '; Tab with a visible ring, Enter answers; 320px; text at 200%' : ''}`);
        }
      }

      // The shared screens and the parents' area, in the base look.
      for (const scheme of ['light', 'dark']) {
        const { ctx, p, errors } = await phone(b, { colorScheme: scheme });
        await p.goto(URL);
        await p.waitForSelector('.splash');
        await checkScreen(p, `base/${scheme} first screen`, { settle: 1600 });
        await newProfile(p, { name: 'עומר', gender: 'boy', world: 'ninja' });
        await p.goto(URL);
        await p.waitForSelector('.splash');
        await p.tap('.splash-go', { force: true });
        await p.waitForSelector('.profile-pick');
        await checkScreen(p, `base/${scheme} who is playing`);
        await p.tap('[data-testid=new-profile]');
        await p.waitForSelector('.profile-editor');
        await checkScreen(p, `base/${scheme} profile editor`);
        await p.goBack().catch(() => {});
        await p.goto(URL);
        await p.waitForSelector('.splash');
        await p.tap('.splash-go', { force: true });
        await p.waitForSelector('.profile-pick');
        await p.tap('[data-testid=open-parents]');
        await p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
        await checkScreen(p, `base/${scheme} parents' door`, { live: true });
        const [x, y] = (await p.textContent('.parent-q')).split('×').map((v) => Number(v.trim()));
        await p.fill('.parent-check input', String(x * y));
        await p.tap('.parent-check button[type=submit]');
        await p.waitForSelector('[data-testid=parent-home]');
        await checkScreen(p, `base/${scheme} parents' area`);
        await p.tap('[data-testid=open-about]');
        await p.waitForSelector('[data-testid=about]');
        await checkScreen(p, `base/${scheme} about (parents)`);
        await p.tap('[data-testid=about-back]');
        await p.waitForSelector('[data-testid=parent-home]');
        await p.tap('.parent-kid');
        await p.waitForSelector('[data-testid=parent-dash] [data-testid=dash-achievements]');
        await checkScreen(p, `base/${scheme} a child's dashboard`);
        await p.screenshot({ path: `${SHOTS}/a11y-base-${scheme}-dashboard.png`, fullPage: true });
        must(errors.length === 0, `base/${scheme} errors: ${errors.join('\n')}`);
        await ctx.close();
        step(`base/${scheme}: the first screen, who is playing, the editor, the parents' door, area, About and a dashboard`);
      }
    } catch (e) {
      console.log('✗', e.message);
      if (last) await last.screenshot({ path: `${SHOTS}/a11y-FAILED.png` }).catch(() => {});
      await b.close();
      process.exit(1);
    }
    await b.close();
    console.log('\nall accessibility checks passed');
  })();
}
