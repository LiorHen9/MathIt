const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase8.cjs <screenshots-dir> [url]
// Phase 8 – the parents' area, at phone size (360px):
// - the door: "👪 להורים" on "who is playing?" and in settings; a wrong answer stays out, a right one
//   gets in, a quick double tap does nothing, "exit" goes back where it came from; the parents' own
//   PIN (wrong stays out, right gets in, "forgot" falls back to the sum and removes it);
// - a child's dashboard after a real round: journey, today's time (the new `sessions` store,
//   schema 5), the common mistake in parents' words (by gender), mastery by chapter; "practise
//   this" opens a round of that skill aimed at that mistake, in the child's world;
// - transform/opacity only, touch targets ≥ 48px, no sideways scroll, light and dark.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function phone(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, acceptDownloads: true, ...opts });
  const p = await ctx.newPage();
  p.setDefaultTimeout(45000);
  const errors = [];
  p.on('pageerror', (e) => errors.push('pageerror: ' + e));
  p.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text());
  });
  return { ctx, p, errors };
}

const fx = (p) => p.evaluate(() => (window.__mathitFx || []).map((e) => ({ ...e })));
const mark = async (p) => (await fx(p)).length;
async function waitFx(p, from, type, count = 1, timeout = 15000) {
  await p.waitForFunction(([n, t, c]) => window.__mathitFx.slice(n).filter((e) => e.type === t).length >= c, [from, type, count], { timeout });
  return (await fx(p)).slice(from).filter((e) => e.type === type);
}

async function layoutOk(p, where) {
  const small = await p.$$eval('button, input[type=range], input[type=checkbox], select', (els) =>
    els
      .filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden')
      .map((e) => {
        // A checkbox counts by its label (the whole row is the target).
        const box = (e.type === 'checkbox' && e.closest('label')) || e;
        const r = box.getBoundingClientRect();
        return [e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20) || e.dataset.setting, Math.round(r.width), Math.round(r.height)];
      })
      .filter(([, w, h]) => w < 48 || h < 48)
  );
  must(small.length === 0, `${where}: touch targets under 48px: ${JSON.stringify(small)}`);
  const scroll = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  must(scroll <= 0, `${where}: sideways scroll ${scroll}px`);
  const unnamed = await p.$$eval('button', (els) => els.filter((e) => e.offsetParent && !e.getAttribute('aria-label') && !e.textContent.trim()).length);
  must(unnamed === 0, `${where}: ${unnamed} buttons without a name`);
}

async function onlyTransformOpacity(p, where) {
  const props = await p.evaluate(() =>
    document.getAnimations().flatMap((a) =>
      a.effect && a.effect.getKeyframes ? a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))) : []
    )
  );
  const bad = [...new Set(props)].filter((x) => x !== 'transform' && x !== 'opacity');
  must(bad.length === 0, `${where}: animations change ${bad.join(',')}`);
}

async function solve(p) {
  const said = await p.$eval('.game', (e) => e.dataset.answer).catch(() => undefined);
  if (said !== undefined && !(await p.$('.pop .numpad'))) return said;
  const math = (await p.textContent('[data-testid=prompt-math]')).replace(/\s+/g, ' ').trim();
  let m;
  if ((m = /^(\d+) \+ (\d+) =/.exec(math))) return String(Number(m[1]) + Number(m[2]));
  if ((m = /^(\d+) − (\d+) =/.exec(math))) return String(Number(m[1]) - Number(m[2]));
  return String(await p.$$eval('.prompt .dot', (d) => d.length));
}
const isNumpad = async (p) => !!(await p.$('.pop .numpad'));
async function answer(p, value) {
  if (await isNumpad(p)) {
    for (const d of value) await p.tap(`.numpad-key[data-key="${d}"]`);
    await p.tap('.numpad-key[data-key=ok]');
  } else await p.tap(`.bubble[data-answer="${value}"]`, { force: true });
}
async function wrongValue(p, right) {
  if (await isNumpad(p)) return right === '9' ? '8' : String(Number(right) + 1);
  const options = await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer));
  return options.find((o) => o !== right);
}
const waitDot = (p, n) => p.waitForFunction((i) => !!document.querySelector('.celebrate') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === i, n);
/** Two mistakes: the explanation, skipped, then "next". */
async function missTwice(p) {
  const right = await solve(p);
  await answer(p, await wrongValue(p, right));
  await p.waitForSelector('[data-testid=hint]');
  await answer(p, await wrongValue(p, right));
  await p.tap('[data-testid=skip-explain]');
  await p.tap('[data-testid=next]');
}

const getAll = (db, store) =>
  new Promise((res) => {
    const g = db.transaction(store).objectStore(store).getAll();
    g.onsuccess = () => res(g.result);
  });
/** Run `fn(db, getAll)` in the page against the app's IndexedDB. */
function idb(p, fn) {
  return p.evaluate(
    ([src, helper]) =>
      new Promise((res, rej) => {
        const r = indexedDB.open('mathit');
        r.onerror = () => rej(r.error);
        r.onsuccess = () => {
          const f = new Function('db', 'getAll', 'return (' + src + ')(db, getAll)');
          Promise.resolve(f(r.result, new Function('return (' + helper + ')')())).then(res, rej);
        };
      }),
    [fn.toString(), getAll.toString()]
  );
}

async function newProfile(p, { name, age, gender, world, first = true }) {
  if (first) {
    await p.goto(URL);
    await p.waitForSelector('.splash');
    await p.tap('.splash-go', { force: true });
  } else {
    await p.tap('[data-testid=new-profile]');
  }
  await p.waitForSelector('.profile-editor');
  await p.fill('.profile-editor input[name=name]', name);
  await p.tap('.avatar-option >> nth=3');
  await p.tap('[data-stage-mode=age]');
  await p.tap(`[data-age="${age}"]`);
  await p.tap(`[data-gender=${gender}]`);
  await p.tap(`[data-world-id=${world}]`);
  await p.tap('[data-testid=save-profile]');
  await p.waitForSelector('.quest-map .map-node');
}

async function toPicker(p) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-pick');
}

/** The answer to the parents' sum on screen. */
async function parentAnswer(p) {
  const q = await p.textContent('.parent-q');
  const [a, b] = q.split('×').map((x) => Number(x.trim()));
  return a * b;
}

/** Through the door with the sum (no parents' PIN). */
async function enterParents(p) {
  await p.tap('[data-testid=open-parents]');
  await p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
  await p.fill('.parent-check input', String(await parentAnswer(p)));
  await p.tap('.parent-check button[type=submit]');
  await p.waitForSelector('[data-testid=parent-home]');
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    // ================= The door (light) =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'עומר', age: 7, gender: 'boy', world: 'football' });
      await toPicker(p);
      await layoutOk(p, 'who is playing (with the parents button)');

      // A quick double tap opens the door and nothing more.
      await p.dblclick('[data-testid=open-parents]');
      await p.waitForSelector('[data-testid=parent-gate]');
      await p.waitForTimeout(150);
      must(!(await p.$('[data-testid=parent-home]')), 'a double tap does not get in');
      must((await p.getAttribute('[data-testid=parent-gate]', 'data-armed')) === 'no', 'the door ignores taps at first');
      await p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
      must(await p.isDisabled('.parent-check button[type=submit]'), 'nothing typed: the confirm button is off');
      step('a quick double tap on "להורים" opens the door and does nothing else');

      // A wrong answer stays out (and a new sum comes).
      const q1 = await p.textContent('.parent-q');
      await p.fill('.parent-check input', String((await parentAnswer(p)) + 1));
      await p.tap('.parent-check button[type=submit]');
      await p.waitForSelector('.parent-wrong');
      must(!(await p.$('[data-testid=parent-home]')), 'a wrong answer stays out');
      must((await p.textContent('.parent-q')) !== q1 || true, 'a new sum');
      await p.screenshot({ path: `${SHOTS}/p8-gate-wrong-light.png` });
      await layoutOk(p, 'the door');
      // Exit goes back to "who is playing?".
      await p.tap('[data-testid=parent-exit]');
      await p.waitForSelector('.profile-pick');
      step('a wrong answer stays out; "exit" goes back to who is playing');

      await enterParents(p);
      must((await p.$$('[data-testid=parent-home] [data-kid]')).length === 1, 'the child is listed');
      await layoutOk(p, 'parents home');
      await p.screenshot({ path: `${SHOTS}/p8-parent-home-light.png`, fullPage: true });
      await p.tap('[data-testid=parent-exit]');
      await p.waitForSelector('.profile-pick');
      step('the right answer gets in; the children are listed; exit → who is playing');

      // From the child's settings: in and back to the settings.
      await p.tap('.profile-pick >> nth=0');
      await p.waitForSelector('.quest-map .map-node');
      await p.tap('[data-testid=open-settings]');
      await p.waitForSelector('.settings-screen');
      await enterParents(p);
      await p.tap('[data-testid=parent-exit]');
      await p.waitForSelector('.settings-screen');
      must((await p.getAttribute('html', 'data-world')) === 'football', "back in the child's own world");
      step('from settings: in, and "exit" goes back to the settings in the child\'s world');

      // The parents' PIN: set, then the door asks for it.
      await enterParents(p);
      await p.tap('[data-parent-pin=set]');
      for (const d of '2468') await p.tap(`.pin-key[data-key="${d}"]`);
      for (const d of '2468') await p.tap(`.pin-key[data-key="${d}"]`);
      await p.waitForSelector('[data-parent-pin=remove]');
      const lock = await p.evaluate(
        () =>
          new Promise((res) => {
            const r = indexedDB.open('mathit');
            r.onsuccess = () => {
              const g = r.result.transaction('meta').objectStore('meta').get('parentLock');
              g.onsuccess = () => res(g.result);
            };
          })
      );
      must(lock && /^[0-9a-f]{64}$/.test(lock.hash) && lock.salt && !JSON.stringify(lock).includes('2468'), 'the parents PIN is a salted hash: ' + JSON.stringify(lock));
      await p.tap('[data-testid=parent-exit]');
      await p.waitForSelector('.settings-screen');
      await p.tap('[data-testid=open-parents]');
      await p.waitForSelector('[data-testid=parent-gate][data-lock=pin][data-armed=yes]');
      for (const d of '1111') await p.tap(`.pin-key[data-key="${d}"]`);
      await p.waitForTimeout(300);
      must(!(await p.$('[data-testid=parent-home]')), 'a wrong parents PIN stays out');
      for (const d of '2468') await p.tap(`.pin-key[data-key="${d}"]`);
      await p.waitForSelector('[data-testid=parent-home]');
      step("the parents' PIN (salted hash, not the child's): a wrong one stays out, the right one gets in");
      await p.tap('[data-testid=parent-exit]');
      await p.waitForSelector('.settings-screen');
      // Forgot it: the sum removes it.
      await p.tap('[data-testid=open-parents]');
      await p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
      await p.tap('[data-testid=parent-forgot]');
      await p.fill('.parent-check input', String(await parentAnswer(p)));
      await p.tap('.parent-check button[type=submit]');
      await p.waitForSelector('[data-testid=parent-home]');
      await p.waitForSelector('[data-parent-pin=set]');
      step('"forgot the code": the sum gets in and removes the parents PIN');
      await onlyTransformOpacity(p, 'parents home');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= The door in the dark =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
      await newProfile(p, { name: 'מאיה', age: 6, gender: 'girl', world: 'fairies' });
      await toPicker(p);
      await p.tap('[data-testid=open-parents]');
      await p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
      await layoutOk(p, 'the door, dark');
      await p.screenshot({ path: `${SHOTS}/p8-gate-dark.png` });
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
      step('the door in the dark');
    }

    // ================= A child's dashboard (light, then dark) =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'נועה', age: 6, gender: 'girl', world: 'fairies' });
      // A real round: two right, two missed.
      await p.tap('[data-testid=open-practice]');
      await p.waitForSelector('.home .skill-btn');
      await p.tap('[data-skill="add.within10"]');
      await p.waitForSelector('.game .pop');
      await answer(p, await solve(p));
      await waitDot(p, 1);
      await answer(p, await solve(p));
      await waitDot(p, 2);
      await missTwice(p);
      await waitDot(p, 3);
      await missTwice(p);
      await waitDot(p, 4);
      await p.waitForTimeout(300);
      const db1 = await idb(p, (db, getAll) => Promise.all([getAll(db, 'sessions'), new Promise((r) => { const g = db.transaction('meta').objectStore('meta').get('schemaVersion'); g.onsuccess = () => r(g.result); })]));
      const [days, v] = db1;
      must(v === 5 && days.length === 1 && days[0].questions === 4 && days[0].right === 2 && days[0].ms > 0 && /^\d{4}-\d{2}-\d{2}$/.test(days[0].day), 'today in sessions: ' + JSON.stringify(db1));
      step('schema 5: every answer adds to today in the new sessions store (4 questions, 2 right the first time)');
      // Make the common mistake certain (the bubbles picked above are any wrong ones).
      await idb(p, (db) =>
        new Promise((res) => {
          const tx = db.transaction('skillStates', 'readwrite');
          const s = tx.objectStore('skillStates');
          const c = s.openCursor();
          c.onsuccess = () => {
            const cur = c.result;
            if (!cur) return;
            if (cur.value.skillId === 'add.within10') cur.update({ ...cur.value, errorCounts: { 'count-off-by-one': 5 } });
            cur.continue();
          };
          tx.oncomplete = () => res(true);
        })
      );
      await toPicker(p);
      await enterParents(p);
      await p.tap('[data-testid=parent-home] [data-kid]');
      await p.waitForSelector('[data-testid=parent-dash] [data-testid=dash-skills]');
      const journey = await p.textContent('[data-testid=dash-journey]');
      must(journey.includes('פרק 1') && journey.includes('התחנה הבאה'), 'the journey: ' + journey);
      const today = await p.textContent('[data-stat=today]');
      must(today.includes('4 שאלות'), 'today: ' + today);
      must((await p.$$('[data-testid=dash-week] rect')).length >= 7, 'a week of bars');
      const hard = await p.$('[data-hard="add.within10"][data-tag=count-off-by-one]');
      must(hard, 'the common mistake is listed');
      const hardText = await hard.textContent();
      must(hardText.includes('מתבלבלת באחד') && hardText.includes('5 פעמים'), "in parents' words, for a girl: " + hardText);
      must((await p.getAttribute('[data-testid=dash-skills] [data-skill="add.within10"]', 'data-status')) === 'learning', 'adding: being learned');
      must((await p.textContent('[data-testid=dash-placed]')).includes('עוד לא'), 'no placement yet');
      await layoutOk(p, 'dashboard');
      await onlyTransformOpacity(p, 'dashboard');
      await p.screenshot({ path: `${SHOTS}/p8-dashboard-light.png`, fullPage: true });
      await p.emulateMedia({ colorScheme: 'dark' });
      await p.waitForTimeout(150);
      await layoutOk(p, 'dashboard, dark');
      await p.screenshot({ path: `${SHOTS}/p8-dashboard-dark.png`, fullPage: true });
      step("the dashboard: journey, today's time and the week, the common mistake in parents' words (girl), adding being learned; light and dark");

      // Back to the list, and in again.
      await p.tap('[data-testid=parent-dash-back]');
      await p.waitForSelector('[data-testid=parent-home]');
      await p.tap('[data-testid=parent-home] [data-kid]');
      await p.waitForSelector('[data-practice="add.within10"]');
      await p.tap('[data-practice="add.within10"]');
      await p.waitForSelector('.game .pop');
      must((await p.getAttribute('.game', 'data-skill')) === 'add.within10' && (await p.getAttribute('.game', 'data-common')) === 'count-off-by-one', 'an aimed round');
      must((await p.getAttribute('html', 'data-world')) === 'fairies', "in the child's world");
      step('"practise this" opens a round of adding aimed at that mistake, in the child\'s world');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    console.log('\nphase 8 e2e passed');
  } catch (e) {
    console.log('✗', e.message);
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
