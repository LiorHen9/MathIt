const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase1.cjs <screenshots-dir> [url]
// Phase 1 – profiles and worlds, at phone size (360px) from empty storage:
// three profiles in three worlds, the live skin change, sample sounds, "who is playing?" tiles in
// each world's colours, switching profiles, PIN, per-profile settings (reduced motion → data-motion),
// everything kept after a reload, touch sizes, no sideways scroll, worlds not in the first load,
// screenshots in light and dark.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// Page backgrounds (--bg) per world.
const BG = {
  base: 'rgb(255, 248, 238)',
  fairies: 'rgb(255, 245, 251)',
  football: 'rgb(241, 248, 239)',
  basketball: 'rgb(255, 246, 236)',
  ninjaDark: 'rgb(18, 18, 25)'
};

async function phone(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...opts });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push('pageerror: ' + e));
  p.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text());
  });
  return { ctx, p, errors };
}

const bg = (p) => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
const world = (p) => p.getAttribute('html', 'data-world');
const motion = (p) => p.getAttribute('html', 'data-motion');
const sounds = (p) => p.evaluate(() => window.__mathitSounds.slice());
const lastSound = async (p) => (await sounds(p)).at(-1);

async function waitWorld(p, id) {
  if (id === 'base') await p.waitForFunction(() => !document.documentElement.dataset.world);
  else await p.waitForFunction((w) => document.documentElement.dataset.world === w, id);
}

/** Every visible button is at least 48×48, and the page does not scroll sideways. */
async function layoutOk(p, where) {
  const small = await p.$$eval('button, input[type=range]', (els) =>
    els
      .filter((e) => e.offsetParent)
      .map((e) => [e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)])
      .filter(([, w, h]) => w < 48 || h < 48)
  );
  must(small.length === 0, `${where}: touch targets under 48px: ${JSON.stringify(small)}`);
  const scroll = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  must(scroll <= 0, `${where}: sideways scroll ${scroll}px`);
}

/** Running animations change only transform and opacity. */
async function onlyTransformOpacity(p, where) {
  const props = await p.evaluate(() =>
    document.getAnimations().flatMap((a) =>
      a.effect && a.effect.getKeyframes ? a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))) : []
    )
  );
  const bad = [...new Set(props)].filter((x) => x !== 'transform' && x !== 'opacity');
  must(bad.length === 0, `${where}: animations change ${bad.join(',')}`);
  return props.length;
}

async function startApp(p) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  // force: the button "breathes", so Playwright never sees it as stable.
  await p.tap('.splash-go', { force: true });
}

/** Fill the editor (already open) and save; ends on the profile's quest map (phase 4). */
async function createProfile(p, { name, avatar, grade, age, gender, worldId }) {
  await p.waitForSelector('.profile-editor');
  await p.fill('.profile-editor input[name=name]', name);
  await p.tap(`.avatar-option >> nth=${avatar}`);
  if (age !== undefined) {
    await p.tap('[data-stage-mode=age]');
    await p.tap(`[data-age="${age}"]`);
  } else await p.tap(`[data-grade="${grade}"]`);
  if (gender) await p.tap(`[data-gender=${gender}]`);
  await p.tap(`[data-world-id=${worldId}]`);
  await waitWorld(p, worldId);
  must((await lastSound(p)) === `world-${worldId}`, `no sample sound for ${worldId}: ${await sounds(p)}`);
  await p.tap('[data-testid=save-profile]');
  await p.waitForSelector('.quest-map .map-hero .hero');
}

async function goToSettings(p) {
  await p.tap('[data-testid=open-settings]');
  await p.waitForSelector('.settings-screen');
}

async function backHome(p) {
  await p.tap('.settings-screen .btn-back');
  await p.waitForSelector('.quest-map');
}

async function switchProfile(p) {
  await p.tap('[data-testid=switch-profile]');
  await p.waitForSelector('.profiles-screen');
  await waitWorld(p, 'base');
}

async function typePin(p, digits) {
  for (const d of digits) await p.tap(`.pin-key[data-key="${d}"]`);
}

async function storedProfiles(p) {
  return p.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('mathit');
        req.onsuccess = () => {
          const tx = req.result.transaction(['profiles', 'meta'], 'readonly');
          const all = tx.objectStore('profiles').getAll();
          const last = tx.objectStore('meta').get('lastProfileId');
          const v = tx.objectStore('meta').get('schemaVersion');
          tx.oncomplete = () => resolve({ profiles: all.result, last: last.result, v: v.result });
        };
      })
  );
}

(async () => {
  const b = await chromium.launch();

  // ================= Light, normal motion: three children =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });

    // The worlds are not part of the first load: the main script has no world in it.
    await p.goto(URL);
    await p.waitForSelector('.splash');
    const mainSrc = await p.$eval('script[type=module][src]', (s) => s.src);
    const mainJs = await p.evaluate(async (u) => (await fetch(u)).text(), mainSrc);
    must(!mainJs.includes('פיית הקסם') && !mainJs.includes('חלוצה'), 'a world is bundled into the main script');
    step(`worlds are separate chunks (main script ${(mainJs.length / 1024).toFixed(1)}KB)`);

    // --- First run: straight to a new profile ---
    await p.tap('.splash-go', { force: true });
    await p.waitForSelector('.profile-editor');
    must(await p.$eval('[data-testid=save-profile]', (e) => e.disabled), 'save enabled on an empty form');
    must((await world(p)) === null && (await bg(p)) === BG.base, 'editor does not start in the base look');
    await p.waitForSelector('.world-card .hero');
    await p.screenshot({ path: `${SHOTS}/10-editor-empty.png`, fullPage: true });
    await layoutOk(p, 'editor');
    step('first run: the new-profile form, saving disabled until it is filled');

    // Live skin: each world card re-skins the whole screen, plays its sound, the hero hops.
    for (const id of ['football', 'basketball', 'ninja', 'blocks', 'stage', 'fairies']) {
      await p.tap(`[data-world-id=${id}]`);
      await waitWorld(p, id);
      must((await lastSound(p)) === `world-${id}`, `sample sound for ${id}: ${await sounds(p)}`);
    }
    must((await bg(p)) === BG.fairies, 'fairies background: ' + (await bg(p)));
    const hopping = await p.evaluate(() =>
      document.getAnimations().some((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('[data-world-id=fairies]') && a.effect.getTiming().iterations === 1)
    );
    must(hopping, 'the hero does not hop on tap');
    await onlyTransformOpacity(p, 'world picker');
    await p.$eval('.world-grid', (e) => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/11-editor-worlds.png` });
    step('world cards: live skin change, a sample sound per world (all 6), the hero hops');

    // --- נועה: א׳, girl, fairies ---
    await p.$eval('.profile-editor', (e) => e.scrollIntoView());
    await createProfile(p, { name: 'נועה', avatar: 15, grade: 1, gender: 'girl', worldId: 'fairies' });
    must((await bg(p)) === BG.fairies, 'home is not in fairies colours');
    must((await p.textContent('.home-title')).includes('נועה'), 'name on home');
    must((await p.textContent('.home-sub')).includes('כיתה א׳'), 'grade on home');
    must((await p.textContent('.home-hero-name')).includes('פיית הקסם'), 'girl fairy hero');
    const before = (await sounds(p)).length;
    await p.tap('[data-testid=home-hero]');
    must((await sounds(p)).length === before + 1 && (await lastSound(p)) === 'world-fairies', 'tapping the hero plays the world sound');
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${SHOTS}/12-home-fairies.png` });
    await layoutOk(p, 'home');
    const n = await onlyTransformOpacity(p, 'home');
    must(n > 0, 'the hero is not animated (idle) on home');
    step('נועה created: home in fairies colours, girl hero breathing, tap → sound');

    // --- Settings: reduced motion, effects, PIN ---
    await goToSettings(p);
    must((await motion(p)) === null, 'data-motion set before choosing');
    await p.tap('[data-motion-choice=on]');
    must((await motion(p)) === 'reduced', 'reduced motion in settings does not set data-motion');
    const endless = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);
    must(endless === 0, `reduced motion: ${endless} endless animations (hero idle) still running`);
    await p.tap('[data-motion-choice=phone]');
    must((await motion(p)) === null, 'back to the phone setting does not clear data-motion');
    step('settings: reduced motion on → data-motion="reduced" and the hero rests; "by the phone" → cleared');

    await p.uncheck('[data-setting=sfx]');
    const quiet = (await sounds(p)).length;
    await p.tap('.settings-screen [data-world-id=fairies]');
    must((await sounds(p)).length === quiet, 'effects off but a sound played');
    await p.check('[data-setting=sfx]');
    await p.tap('.settings-screen [data-world-id=fairies]');
    must((await lastSound(p)) === 'world-fairies', 'effects back on but silent');
    await p.$eval('[data-setting=volume]', (e) => {
      e.value = '50';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await p.waitForFunction(() => document.querySelector('.volume-value').textContent.includes('50'), null, { timeout: 2000 }).catch(() => must(false, 'volume does not change'));
    step('settings: effects off silences, on again plays; volume saved');

    await p.tap('[data-pin=set]');
    await typePin(p, '1234');
    await typePin(p, '1234');
    await p.waitForSelector('text=ה-PIN נשמר');
    await p.screenshot({ path: `${SHOTS}/13-settings.png`, fullPage: true });
    await layoutOk(p, 'settings');
    step('PIN set (twice to confirm)');
    await backHome(p);
    await switchProfile(p);
    must((await bg(p)) === BG.base, 'who-plays is not in the base look');

    // --- איתי: age 6, boy, football (reduced motion on) ---
    await p.tap('[data-testid=new-profile]');
    await createProfile(p, { name: 'איתי', avatar: 3, age: 6, gender: 'boy', worldId: 'football' });
    must((await bg(p)) === BG.football, 'football background: ' + (await bg(p)));
    must((await p.textContent('.home-hero-name')).trim() === 'חלוץ', 'boy striker');
    must((await p.textContent('.home-sub')).includes('גיל 6'), 'age on home');
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${SHOTS}/15-home-football.png` });
    await goToSettings(p);
    await p.tap('[data-motion-choice=on]');
    await backHome(p);
    must((await motion(p)) === 'reduced', 'איתי: reduced motion');
    await switchProfile(p);
    must((await motion(p)) === null, '"who is playing?" keeps a profile\'s reduced motion');
    step('איתי created (football, "חלוץ"), reduced motion only while he plays');

    // --- מיה: ד׳, "other", basketball ---
    await p.tap('[data-testid=new-profile]');
    await createProfile(p, { name: 'מיה', avatar: 7, grade: 4, gender: 'other', worldId: 'basketball' });
    must((await bg(p)) === BG.basketball, 'basketball background: ' + (await bg(p)));
    must((await p.textContent('.home-hero-name')).trim() === 'שחקן/ית', 'neutral hero name: ' + (await p.textContent('.home-hero-name')));
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${SHOTS}/16-home-basketball.png` });
    await switchProfile(p);
    step('מיה created (basketball, neutral "שחקן/ית")');

    // --- "Who is playing?" ---
    const tiles = await p.$$eval('.profile-pick', (els) => els.map((e) => [e.textContent, getComputedStyle(e).backgroundColor]));
    must(tiles.length === 3, 'tiles: ' + tiles.length);
    must(new Set(tiles.map((t) => t[1])).size === 3, 'tiles are not in three different colours: ' + JSON.stringify(tiles));
    must((await p.textContent('.profile-tile:nth-child(3) .profile-last')) !== null, 'last player not marked');
    must((await p.textContent('.version')).includes(require('../../package.json').version), 'version label');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SHOTS}/14-who-plays.png` });
    await layoutOk(p, 'who is playing');
    step('"who is playing?": 3 tiles, each in its own world colours, last player marked, version');

    // --- PIN when entering נועה ---
    await p.tap('.profile-pick >> nth=0');
    await p.waitForSelector('.pin-screen');
    await layoutOk(p, 'PIN');
    await typePin(p, '9999');
    await p.waitForSelector('.pin-dots.is-wrong');
    must(await p.$('.pin-screen'), 'a wrong PIN let her in');
    await p.screenshot({ path: `${SHOTS}/17-pin-wrong.png` });
    await typePin(p, '1234');
    await p.waitForSelector('.quest-map');
    await waitWorld(p, 'fairies');
    step('PIN: wrong one shakes and stays, right one enters נועה (fairies)');

    // --- Switching changes the skin ---
    for (const [i, id] of [
      [1, 'football'],
      [2, 'basketball']
    ]) {
      await switchProfile(p);
      await p.tap(`.profile-pick >> nth=${i}`);
      await p.waitForSelector('.quest-map');
      await waitWorld(p, id);
      must((await bg(p)) === BG[id], `${id} background after switching`);
    }
    step('switching profiles re-skins the app each time');

    // --- Reload: everything kept ---
    await p.reload();
    await p.waitForSelector('.splash');
    await p.tap('.splash-go', { force: true });
    await p.waitForSelector('.profiles-screen');
    must((await p.$$('.profile-pick')).length === 3, 'profiles lost on reload');
    must((await p.textContent('.profile-tile:nth-child(3) .profile-last')) !== null, 'last player not remembered');
    await p.tap('.profile-pick >> nth=1');
    await p.waitForSelector('.quest-map');
    await waitWorld(p, 'football');
    must((await motion(p)) === 'reduced', 'איתי\'s reduced motion lost on reload');
    await switchProfile(p);
    await p.tap('.profile-pick >> nth=0');
    await p.waitForSelector('.pin-screen');
    await typePin(p, '1234');
    await p.waitForSelector('.quest-map');
    await waitWorld(p, 'fairies');
    await goToSettings(p);
    must((await p.textContent('.volume-value')).includes('50'), 'נועה\'s volume lost on reload');
    must(await p.$('[data-pin=remove]'), 'נועה\'s PIN lost on reload');
    const db = await storedProfiles(p);
    must(db.v === 4, 'schema version ' + db.v);
    must(db.profiles.length === 3, 'stored profiles: ' + db.profiles.length);
    must(!JSON.stringify(db.profiles).includes('"1234"'), 'PIN digits stored');
    const noa = db.profiles.find((x) => x.name === 'נועה');
    must(noa.grade === 1 && noa.gender === 'girl' && noa.worldId === 'fairies' && noa.settings.volume === 0.5 && noa.pinHash, 'נועה stored: ' + JSON.stringify(noa));
    must(db.last === noa.id, 'lastProfileId');
    step('reload keeps profiles, worlds, settings, PIN and the last player (IndexedDB, schema 4)');

    // --- Editing a profile: the world changes ---
    await p.tap('[data-testid=edit-profile]');
    await p.waitForSelector('.profile-editor');
    must((await p.inputValue('input[name=name]')) === 'נועה', 'editor not prefilled');
    await p.tap('[data-world-id=ninja]');
    await waitWorld(p, 'ninja');
    await p.tap('.profile-editor .btn-back');
    await p.waitForSelector('.settings-screen');
    await waitWorld(p, 'fairies');
    await p.tap('[data-testid=edit-profile]');
    await p.tap('[data-world-id=ninja]');
    await p.tap('[data-testid=save-profile]');
    await p.waitForSelector('.quest-map');
    await waitWorld(p, 'ninja');
    must((await p.textContent('.home-hero-name')).trim() === 'נינג׳ה צעירה', 'ninja girl hero');
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${SHOTS}/18-home-ninja.png` });
    step('editing: cancel restores the world, saving a new world re-skins home');

    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= Dark, the phone asks for reduced motion =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
    await startApp(p);
    await p.waitForSelector('.profile-editor .world-card .hero');
    await p.$eval('.world-grid', (e) => e.scrollIntoView({ block: 'center' }));
    await p.screenshot({ path: `${SHOTS}/20-editor-dark.png` });
    await createProfile(p, { name: 'יואב', avatar: 10, grade: 0, gender: 'boy', worldId: 'ninja' });
    must((await bg(p)) === BG.ninjaDark, 'ninja dark background: ' + (await bg(p)));
    must((await motion(p)) === 'reduced', 'phone reduced motion not followed');
    const endless = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);
    must(endless === 0, `reduced motion: ${endless} endless animations`);
    must((await p.textContent('.home-sub')).includes('גן חובה'), 'kindergarten label');
    await p.screenshot({ path: `${SHOTS}/21-home-ninja-dark.png` });
    await layoutOk(p, 'home (dark)');
    step('dark: ninja colours, phone reduced motion followed, hero at rest');

    await goToSettings(p);
    await p.tap('[data-motion-choice=off]');
    must((await motion(p)) === null, '"full motion" does not override the phone');
    await p.screenshot({ path: `${SHOTS}/22-settings-dark.png`, fullPage: true });
    await backHome(p);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/23-home-ninja-dark-moving.png` });
    await switchProfile(p);
    must((await motion(p)) === 'reduced', 'without a profile the phone setting is back');
    await p.screenshot({ path: `${SHOTS}/24-who-plays-dark.png` });
    await layoutOk(p, 'who is playing (dark)');
    step('dark: "full motion" overrides the phone for this child only');

    // Deleting the only profile goes back to a new one.
    await p.tap('.profile-edit');
    await p.waitForSelector('.profile-editor');
    await p.tap('[data-testid=delete-profile]');
    await p.tap('[data-testid=confirm-delete]');
    await p.waitForSelector('.profile-editor');
    must((await p.$$('[data-testid=delete-profile]')).length === 0, 'after deleting the last profile: a new-profile form');
    step('deleting the last profile leads to creating a new one');

    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  await b.close();
  console.log('\nphase 1 e2e passed');
})().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
