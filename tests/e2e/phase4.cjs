const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase4.cjs <screenshots-dir> [url]
// Phase 4 – the quest map, at phone size (360px):
// - the map, chest and boss are not in the first load;
// - a new profile lands on the map: the first station open, the rest locked, the hero beside it;
//   a locked station says why; the lesson → back to the map → the hero walks (footsteps, a running
//   transform animation) → the next station opens in a burst of light (unlock in the log);
//   progress survives a reload (no second walk); a practice station plays its level and walks on;
// - the chest: opens when the chapter has the stars, rattles, opens, the prize flies to the shelf;
// - the boss: power bar, hits (hero attacks, rising notes), a dodge on a mistake, the win and stars;
// - an old phone (schema 2 with skillStates) is migrated to 3 and keeps what it did;
// - dark + reduced motion (ninja): the hero fades across, no particles, "חדש!" still shows;
// - transform/opacity only, touch targets ≥ 48px, no sideways scroll; screenshots in two worlds.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function phone(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...opts });
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
const sounds = (p) => p.evaluate(() => (window.__mathitSounds || []).slice());
const mark = async (p) => ({ fx: (await fx(p)).length, sounds: (await sounds(p)).length });
const fxSince = async (p, m) => (await fx(p)).slice(m.fx);
const soundsSince = async (p, m) => (await sounds(p)).slice(m.sounds);
async function waitFx(p, m, type, count = 1, timeout = 15000) {
  await p.waitForFunction(([n, t, c]) => window.__mathitFx.slice(n).filter((e) => e.type === t).length >= c, [m.fx, type, count], { timeout });
  return (await fxSince(p, m)).filter((e) => e.type === type);
}

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

async function onlyTransformOpacity(p, where) {
  const props = await p.evaluate(() =>
    document.getAnimations().flatMap((a) =>
      a.effect && a.effect.getKeyframes ? a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))) : []
    )
  );
  const bad = [...new Set(props)].filter((x) => x !== 'transform' && x !== 'opacity');
  must(bad.length === 0, `${where}: animations change ${bad.join(',')}`);
}
const endless = (p) => p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);
/** The longest running animation on the map hero (its own walk, not the SVG inside). */
const heroWalkMs = (p) =>
  p.evaluate(() => {
    const h = document.querySelector('.map-hero');
    return Math.max(0, ...h.getAnimations({ subtree: false }).map((a) => Number(a.effect.getTiming().duration) || 0));
  });

async function solve(p) {
  const math = (await p.textContent('[data-testid=prompt-math]')).replace(/\s+/g, ' ').trim();
  let m;
  if ((m = /^(\d+) \+ (\d+) =/.exec(math))) return String(Number(m[1]) + Number(m[2]));
  if ((m = /^(\d+) − (\d+) =/.exec(math))) return String(Number(m[1]) - Number(m[2]));
  if ((m = /^(\d+)\s*[?<>=]\s*(\d+)$/.exec(math))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a > b ? '>' : a < b ? '<' : '=';
  }
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
  const options = await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer));
  return options.find((o) => o !== right);
}

async function newProfile(p, { name, age, gender, world }) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-editor');
  await p.fill('.profile-editor input[name=name]', name);
  await p.tap('.avatar-option >> nth=2');
  await p.tap('[data-stage-mode=age]');
  await p.tap(`[data-age="${age}"]`);
  await p.tap(`[data-gender=${gender}]`);
  await p.tap(`[data-world-id=${world}]`);
  await p.tap('[data-testid=save-profile]');
  await p.waitForSelector('.quest-map .map-node');
}

/** Reload the app and enter the (only) profile again. */
async function reenter(p) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-pick');
  await p.tap('.profile-pick >> nth=0');
  await p.waitForSelector('.quest-map .map-node');
}

const status = (p) => p.$$eval('.map-node', (els) => Object.fromEntries(els.map((e) => [e.dataset.node, e.dataset.status])));
const nodeAttr = (p, id, a) => p.getAttribute(`.map-node[data-node="${id}"]`, a);

async function db(p) {
  return p.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('mathit');
        req.onsuccess = () => {
          const d = req.result;
          const names = [...d.objectStoreNames];
          const tx = d.transaction(names, 'readonly');
          const out = { stores: names };
          const reqs = {
            v: tx.objectStore('meta').get('schemaVersion'),
            profiles: tx.objectStore('profiles').getAll(),
            states: tx.objectStore('skillStates').getAll(),
            quest: names.includes('questProgress') ? tx.objectStore('questProgress').getAll() : null
          };
          tx.oncomplete = () => {
            for (const [k, r] of Object.entries(reqs)) out[k] = r && r.result;
            d.close();
            resolve(out);
          };
        };
      })
  );
}

/** Write a profile's quest record (a shortcut to the middle of the chapter). */
async function seedQuest(p, rec) {
  await p.evaluate(
    (r) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('mathit');
        req.onsuccess = () => {
          const d = req.result;
          const tx = d.transaction(['profiles', 'questProgress'], 'readwrite');
          const all = tx.objectStore('profiles').getAll();
          all.onsuccess = () => {
            const id = all.result[0].id;
            tx.objectStore('questProgress').put({ ...r, profileId: id, updated: 1 }, id);
          };
          tx.oncomplete = () => {
            d.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rec
  );
}

const ORDER = ['c1-count-lesson', 'c1-count-5', 'c1-count-10', 'c1-compare-lesson', 'c1-compare-5', 'c1-compare-10', 'c1-add-lesson', 'c1-add-5', 'c1-add-7', 'c1-chest', 'c1-sub-lesson', 'c1-sub-5', 'c1-sub-7', 'c1-add-10', 'c1-sub-10', 'c1-boss'];
/** Stars for every station before `upto` (lessons 1, practice `n`). */
function starsUpTo(upto, n) {
  const out = {};
  for (const id of ORDER.slice(0, ORDER.indexOf(upto))) if (id !== 'c1-chest') out[id] = id.endsWith('lesson') ? 1 : n;
  return out;
}

/** Play a lesson to its end (skipping explanations, answering right). */
async function playLesson(p) {
  for (let i = 0; i < 60; i++) {
    if (await p.$('[data-testid=lesson-done]')) return;
    if (await p.$('[data-testid=lesson-next]')) await p.tap('[data-testid=lesson-next]');
    else if (await p.$('[data-testid=lesson-skip]')) await p.tap('[data-testid=lesson-skip]');
    else if (await p.$('.lesson[data-kind=try] .bubble:not([disabled])')) await answer(p, await solve(p));
    await p.waitForTimeout(250);
  }
  throw new Error('the lesson did not end');
}

/** Play a full round right (8 questions). */
async function playRound(p) {
  for (let i = 0; i < 8; i++) {
    await answer(p, await solve(p));
    if (i === 7) await p.waitForSelector('.celebrate');
    else await p.waitForFunction((n) => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === n, i + 1);
  }
}

(async () => {
  const b = await chromium.launch();

  // ================= Light, normal motion: נועה, 5, fairies =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
    await p.goto(URL);
    await p.waitForSelector('.splash');
    const mainSrc = await p.$eval('script[type=module][src]', (s) => s.src);
    const mainJs = await p.evaluate(async (u) => (await fetch(u)).text(), mainSrc);
    must(!mainJs.includes('map-node') && !mainJs.includes('הבלבלן') && !mainJs.includes('chest-lid') && !mainJs.includes('boss-hp'), 'the map, the chest or the boss are in the main script');
    step(`map, chest and boss are separate chunks (main script ${(mainJs.length / 1024).toFixed(1)}KB)`);

    await newProfile(p, { name: 'נועה', age: 5, gender: 'girl', world: 'fairies' });
    let st = await status(p);
    must(st['c1-count-lesson'] === 'open' && Object.values(st).filter((x) => x === 'locked').length === 15, 'new profile: ' + JSON.stringify(st));
    must((await p.getAttribute('.quest-map', 'data-current')) === 'c1-count-lesson', 'current station');
    must((await p.getAttribute('.map-hero', 'data-at')) === 'c1-count-lesson', 'the hero stands at the first station');
    must((await p.$$('.map-section')).length === 2, 'two section banners');
    must((await p.textContent('.home-hero-name')).trim() === 'פיית הקסם', 'hero name on the map');
    must((await p.textContent('[data-testid=chapter-stars]')).includes('0/'), 'chapter stars 0');
    await p.waitForTimeout(600);
    await layoutOk(p, 'map');
    await onlyTransformOpacity(p, 'map');
    await p.screenshot({ path: `${SHOTS}/80-map-new-fairies.png` });
    await p.screenshot({ path: `${SHOTS}/81-map-full-fairies.png`, fullPage: true });
    step('new profile: the map, first station open, 15 locked, the hero beside it, two section banners');

    // A locked station says why.
    let m = await mark(p);
    await p.tap('.map-node[data-node="c1-count-5"]');
    await waitFx(p, m, 'locked');
    must((await p.textContent('.map-bubble .feedback')).includes('קודם'), 'locked: ' + (await p.textContent('.map-bubble .feedback')));
    must((await soundsSince(p, m)).includes('locked') && !(await soundsSince(p, m)).includes('wrong'), 'a locked station knocks softly, not "wrong"');
    step('a locked station: soft knock, "עוד לא! קודם: …"');

    // The lesson station → back to the map → the hero walks, the next station opens.
    await p.tap('[data-testid=map-go]');
    await p.waitForSelector('.lesson');
    must((await p.getAttribute('.lesson', 'data-skill')) === 'count.to10', 'the first station is the counting lesson');
    await playLesson(p);
    m = await mark(p);
    await p.tap('[data-testid=lesson-to-map]');
    await p.waitForSelector('.quest-map');
    const walks = await waitFx(p, m, 'walk');
    must(walks[0].hero === 'walk' && walks[0].detail.ms >= 900, 'walk event: ' + JSON.stringify(walks[0]));
    await p.waitForTimeout(250);
    const walkMs = await heroWalkMs(p);
    must(walkMs >= 900, 'the hero should be walking along the path, got ' + walkMs);
    must((await p.getAttribute('.map-hero .hero', 'class')).includes('is-walk'), 'the hero is not in its walking mood');
    await onlyTransformOpacity(p, 'walking');
    await p.screenshot({ path: `${SHOTS}/82-map-walking.png` });
    const unlock = (await waitFx(p, m, 'unlock'))[0];
    must(unlock.sound === 'unlock' && unlock.particles > 0 && unlock.hero === 'cheer', 'unlock: ' + JSON.stringify(unlock));
    const steps = (await fxSince(p, m)).filter((e) => e.type === 'step');
    must(steps.length >= 2 && (await soundsSince(p, m)).filter((s) => s === 'step').length >= 3, 'footsteps: ' + steps.length);
    must((await p.getAttribute('.map-hero', 'data-at')) === 'c1-count-5', 'the hero should arrive at the next station');
    must((await nodeAttr(p, 'c1-count-5', 'data-status')) === 'open' && (await p.$('.map-spot.is-new .map-node[data-node="c1-count-5"]')), 'the next station should be open and new');
    must((await nodeAttr(p, 'c1-count-lesson', 'data-status')) === 'done' && (await nodeAttr(p, 'c1-count-lesson', 'data-stars')) === '1', 'the lesson station done with a star');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/83-map-unlocked.png` });
    await layoutOk(p, 'map after walk');
    step(`back on the map: the hero walks ${walks[0].detail.ms}ms (${steps.length} footsteps), the next station opens in a burst of ${unlock.particles} sparkles`);

    // Reload: the progress stays, no second walk.
    await reenter(p);
    m = { fx: 0, sounds: 0 };
    await p.waitForTimeout(1500);
    must((await fxSince(p, m)).every((e) => e.type !== 'walk' && e.type !== 'unlock'), 'after a reload the walk should not replay');
    must((await p.getAttribute('.map-hero', 'data-at')) === 'c1-count-5', 'the hero should still be at station 2');
    st = await status(p);
    must(st['c1-count-lesson'] === 'done' && st['c1-count-5'] === 'open' && st['c1-count-10'] === 'locked', 'after reload: ' + JSON.stringify(st));
    let d = await db(p);
    must(d.v === 6 && d.stores.includes('questProgress'), 'schema 6: ' + d.v + ' ' + d.stores);
    must(d.quest[0].stars['c1-count-lesson'] === 1 && d.quest[0].at === 'c1-count-5', 'saved: ' + JSON.stringify(d.quest[0]));
    step('reload: progress kept (schema 6, questProgress), the hero stays, nothing replays');

    // A practice station: plays its own level, stars go to the station, the hero walks on.
    await p.tap('.map-node[data-node="c1-count-5"]');
    await p.waitForSelector('.game .pop');
    must((await p.getAttribute('.game', 'data-level')) === '1', 'the station plays level 1');
    await playRound(p);
    await p.waitForSelector('[data-testid=to-map]');
    must(!(await p.$('[data-testid=home]')), 'a station leads back to the map');
    m = await mark(p);
    await p.tap('[data-testid=to-map]');
    await p.waitForSelector('.quest-map');
    await waitFx(p, m, 'unlock');
    must((await nodeAttr(p, 'c1-count-5', 'data-stars')) === '3' && (await nodeAttr(p, 'c1-count-10', 'data-status')) === 'open', 'practice station: 3 stars, next open');
    must((await p.textContent('[data-testid=chapter-stars]')).includes('4/'), 'chapter stars 4: ' + (await p.textContent('[data-testid=chapter-stars]')));
    step('practice station: level 1, 3 stars saved for the station, the hero walks on, chapter ⭐ 4');

    // Free practice is still one tap away.
    await p.tap('[data-testid=open-practice]');
    await p.waitForSelector('.home .skill-btn');
    await p.tap('[data-testid=practice-back]');
    await p.waitForSelector('.quest-map');
    step('free practice opens from the map and returns to it');

    // ---------- The chest ----------
    // Not enough stars yet: the chest says how many are missing.
    await seedQuest(p, { stars: starsUpTo('c1-chest', 1), chests: {}, at: 'c1-add-7', revealed: ORDER.slice(0, 9), last: null });
    await reenter(p);
    must((await nodeAttr(p, 'c1-chest', 'data-status')) === 'locked', 'chest with 9 stars should be locked');
    m = await mark(p);
    await p.tap('.map-node[data-node="c1-chest"]');
    await waitFx(p, m, 'locked');
    must(/צריך עוד 1 כוכב /.test(await p.textContent('.map-bubble .feedback')), 'chest lock reason: ' + (await p.textContent('.map-bubble .feedback')));
    // With the stars: it opens.
    await seedQuest(p, { stars: starsUpTo('c1-chest', 2), chests: {}, at: 'c1-add-7', revealed: ORDER.slice(0, 9), last: null });
    await reenter(p);
    // A reload starts the logs afresh.
    m = { fx: 0, sounds: 0 };
    await waitFx(p, m, 'unlock');
    must((await nodeAttr(p, 'c1-chest', 'data-status')) === 'open', 'the chest should open with 14 stars');
    step('chest: locked with 9 stars ("צריך עוד 1 כוכב"), opens (burst) with enough stars');
    await p.tap('.map-node[data-node="c1-chest"]');
    await p.waitForSelector('[data-testid=chest]');
    await layoutOk(p, 'chest');
    await p.screenshot({ path: `${SHOTS}/84-chest-closed.png` });
    m = await mark(p);
    await p.tap('[data-testid=chest-btn]');
    await waitFx(p, m, 'chestShake', 2);
    await onlyTransformOpacity(p, 'chest rattling');
    const opened = (await waitFx(p, m, 'chestOpen'))[0];
    must(opened.sound === 'chestOpen' && opened.particles > 0, 'chestOpen: ' + JSON.stringify(opened));
    must(await p.$('.fly-token'), 'the prize should fly out');
    await p.screenshot({ path: `${SHOTS}/85-chest-opening.png` });
    await p.waitForSelector('[data-testid=chest-to-map]');
    // Phase 5: the prize is the world's first collectible (fairies: a magic flower).
    await p.waitForFunction(() => document.querySelector('[data-testid=prize-slot]').textContent.trim() === '🌷');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/86-chest-open.png` });
    await layoutOk(p, 'chest open');
    m = await mark(p);
    await p.tap('[data-testid=chest-to-map]');
    await waitFx(p, m, 'unlock');
    must((await nodeAttr(p, 'c1-chest', 'data-status')) === 'done' && (await nodeAttr(p, 'c1-sub-lesson', 'data-status')) === 'open', 'after the chest');
    d = await db(p);
    must(d.quest[0].chests['c1-chest'] === '🌷', 'chest saved: ' + JSON.stringify(d.quest[0].chests));
    step('chest: rattles twice, opens with sparkles, the 🌷 collectible flies to the shelf; saved; the next station opens');

    // ---------- The boss ----------
    await seedQuest(p, { stars: starsUpTo('c1-boss', 2), chests: { 'c1-chest': '🌈' }, at: 'c1-sub-10', revealed: ORDER.slice(0, 15), last: null });
    await reenter(p);
    // A reload starts the logs afresh.
    m = { fx: 0, sounds: 0 };
    await waitFx(p, m, 'unlock');
    must((await nodeAttr(p, 'c1-boss', 'data-status')) === 'open', 'the boss should be open');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SHOTS}/87-map-boss-open.png` });
    await p.tap('.map-node[data-node="c1-boss"]');
    await p.waitForSelector('[data-testid=boss]');
    m = await mark(p);
    await waitFx(p, m, 'bossAppear').catch(() => {});
    await p.screenshot({ path: `${SHOTS}/88-boss-intro.png` });
    await layoutOk(p, 'boss intro');
    await p.tap('[data-testid=boss-start]');
    await p.waitForSelector('.boss-screen .bubble');
    must((await p.getAttribute('.boss-hp', 'data-hp')) === '8', 'the boss starts with 8');
    // First question: a mistake – the boss dodges – then right.
    let right = await solve(p);
    m = await mark(p);
    await answer(p, await wrongValue(p, right));
    const dodge = (await waitFx(p, m, 'bossDodge'))[0];
    must(dodge.sound === 'dodge' && dodge.motion === 'dodge', 'dodge: ' + JSON.stringify(dodge));
    must((await p.getAttribute('.boss-hp', 'data-hp')) === '8', 'a mistake does not hit');
    await p.waitForSelector('[data-testid=hint]');
    await answer(p, right);
    let hits = await waitFx(p, m, 'bossHit');
    must(hits[0].hero === 'attack' && hits[0].motion === 'tremble' && hits[0].detail.left === 7, 'hit: ' + JSON.stringify(hits[0]));
    must((await p.getAttribute('.boss-hp', 'data-hp')) === '7', 'the bar drops to 7');
    must((await p.getAttribute('.boss-hero', 'class')).includes('is-attack'), 'the hero attacks');
    await onlyTransformOpacity(p, 'boss hit');
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${SHOTS}/89-boss-hit.png` });
    await layoutOk(p, 'boss fight');
    const fillScale = await p.$eval('.boss-hp-fill', (e) => e.style.transform);
    must(fillScale.includes('0.875'), 'the bar is scaled by transform: ' + fillScale);
    // The rest, right.
    for (let i = 1; i < 8; i++) {
      await p.waitForSelector('.boss-screen .bubble:not([disabled])');
      await answer(p, await solve(p));
      await waitFx(p, m, 'bossHit', i + 1);
    }
    hits = (await fxSince(p, m)).filter((e) => e.type === 'bossHit');
    must(hits.map((h) => h.detail.n).join() === '1,2,3,4,5,6,7,8', 'hits: ' + hits.map((h) => h.detail.n));
    must(hits.every((h, i) => i === 0 || h.pitch > hits[i - 1].pitch), 'hit notes should rise');
    const won = (await waitFx(p, m, 'bossDefeated'))[0];
    must(won.sound === 'victory' && won.particles > 0 && won.hero === 'cheer', 'defeated: ' + JSON.stringify(won));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/90-boss-won.png` });
    await p.waitForSelector('[data-testid=boss-to-map]', { timeout: 5000 });
    await layoutOk(p, 'boss won');
    const bossStars = won.detail.stars;
    must(bossStars >= 2, 'one mistake in 8 should give 2+ stars: ' + bossStars);
    await p.tap('[data-testid=boss-to-map]');
    // Phase 10: the first win goes through the chapter's end party (skipped by a tap) to the map.
    await p.waitForSelector('[data-testid=chapter-end]');
    await p.tap('[data-testid=chapter-end]');
    await p.tap('[data-testid=chapter-end-next]');
    await p.waitForSelector('.quest-map');
    await p.waitForTimeout(600);
    must((await nodeAttr(p, 'c1-boss', 'data-status')) === 'done' && (await nodeAttr(p, 'c1-boss', 'data-stars')) === String(bossStars), 'the boss done on the map');
    // Phase 7: the journey goes on – the hero walks out of chapter 1 into chapter 2.
    await p.waitForSelector('[data-testid=map-chapter][data-chapter=c2]', { timeout: 15000 });
    await p.waitForFunction(() => document.querySelector('.quest-map')?.dataset.walking === 'no' && document.querySelector('[data-testid=home-hero]')?.dataset.at === 'c2-add20-lesson', null, { timeout: 15000 });
    must((await p.getAttribute('.quest-map', 'data-current')) === 'c2-add20-lesson', 'after the boss: chapter 2 is next');
    await p.screenshot({ path: `${SHOTS}/91-map-chapter-done.png` });
    step(`boss: appears, a mistake → a gentle dodge, 8 hits (hero attacks, rising notes, bar by transform) → victory, ${bossStars} stars, chapter done`);

    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= An old phone: schema 2 with skillStates =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
    await p.route(URL, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>old</title>' }));
    await p.goto(URL);
    await p.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('mathit', 2);
          req.onupgradeneeded = () => {
            for (const s of ['meta', 'profiles', 'skillStates']) req.result.createObjectStore(s);
          };
          req.onsuccess = () => {
            const d = req.result;
            const tx = d.transaction(['meta', 'profiles', 'skillStates'], 'readwrite');
            tx.objectStore('meta').put(2, 'schemaVersion');
            tx.objectStore('profiles').put(
              { id: 'p_two', name: 'עידו', avatar: '🦊', age: 6, gender: 'boy', worldId: 'basketball', settings: { sfx: true, music: true, narration: false, volume: 0.8, reducedMotion: null, speechHelpSeen: true }, createdAt: 1 },
              'p_two'
            );
            const put = (skillId, v) => tx.objectStore('skillStates').put({ profileId: 'p_two', skillId, lastPlayed: 1, ...v }, `p_two:${skillId}`);
            put('count.to10', { level: 3, bestStars: 3, rounds: 2, lessonSeen: true });
            put('compare.to10', { level: 1, bestStars: 2, rounds: 1, lessonSeen: true });
            tx.oncomplete = () => {
              d.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        })
    );
    await p.unroute(URL);
    const m0 = { fx: 0, sounds: 0 };
    await reenter(p);
    await p.waitForTimeout(1200);
    const st = await status(p);
    const want = { 'c1-count-lesson': 'done', 'c1-count-5': 'done', 'c1-count-10': 'done', 'c1-compare-lesson': 'done', 'c1-compare-5': 'done', 'c1-compare-10': 'open', 'c1-add-lesson': 'locked' };
    for (const [k, v] of Object.entries(want)) must(st[k] === v, `migrated ${k}: ${st[k]} (want ${v})`);
    must((await nodeAttr(p, 'c1-compare-5', 'data-stars')) === '2', 'compare level 1 keeps its 2 stars');
    must((await p.getAttribute('.map-hero', 'data-at')) === 'c1-compare-10', 'the hero starts at the next station');
    must((await fxSince(p, m0)).every((e) => e.type !== 'unlock' && e.type !== 'walk'), 'no bursts for what was already done');
    const d = await db(p);
    must(d.v === 6 && d.stores.join() === 'achievements,inventory,meta,profiles,questProgress,sessions,skillStates', 'migration: ' + d.v + ' ' + d.stores);
    must(d.profiles[0].name === 'עידו' && d.states.length === 2, 'old data kept');
    await p.screenshot({ path: `${SHOTS}/92-map-migrated-basketball.png` });
    step('schema 2 → 4: questProgress and inventory added; watched lessons and played rounds become done stations (5), the hero at the next one, no bursts');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= Dark, reduced motion: תום, 7, ninja =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
    await newProfile(p, { name: 'תום', age: 7, gender: 'boy', world: 'ninja' });
    must((await p.getAttribute('html', 'data-motion')) === 'reduced', 'reduced motion not on');
    await p.waitForTimeout(400);
    must((await endless(p)) === 0, 'reduced motion: endless animations on the map');
    await p.screenshot({ path: `${SHOTS}/93-map-ninja-dark.png` });
    await layoutOk(p, 'map (dark)');
    await p.tap('[data-testid=map-go]');
    await p.waitForSelector('.lesson');
    await playLesson(p);
    const m = await mark(p);
    await p.tap('[data-testid=lesson-to-map]');
    await p.waitForSelector('.quest-map');
    const walk = (await waitFx(p, m, 'walk'))[0];
    must(walk.detail.ms <= 300, 'reduced: a short fade instead of a stroll: ' + walk.detail.ms);
    const unlock = (await waitFx(p, m, 'unlock'))[0];
    must(unlock.particles === 0, 'reduced: no particles');
    must((await fxSince(p, m)).filter((e) => e.type === 'step').length === 0, 'reduced: no footsteps');
    must((await p.getAttribute('.map-hero', 'data-at')) === 'c1-count-5', 'the hero arrives');
    must(await p.$('.map-spot.is-new .map-new'), 'reduced: "חדש!" still marks what opened');
    const longest = await p.evaluate(() => Math.max(0, ...document.getAnimations().map((a) => Number(a.effect.getTiming().duration) || 0)));
    must(longest <= 300, 'reduced: animations on the map ≤ 300ms, got ' + longest);
    must((await endless(p)) === 0, 'reduced: endless animations after the walk');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/94-map-ninja-dark-unlocked.png` });
    step('dark + reduced motion (ninja): the hero fades across (≤300ms), no footsteps or particles, "חדש!" shows what opened');

    // The chest and the boss in the dark, reduced.
    await seedQuest(p, { stars: starsUpTo('c1-chest', 3), chests: {}, at: 'c1-chest', revealed: ORDER.slice(0, 10), last: null });
    await reenter(p);
    await p.tap('.map-node[data-node="c1-chest"]');
    await p.waitForSelector('[data-testid=chest]');
    await p.tap('[data-testid=chest-btn]');
    await p.waitForSelector('[data-testid=chest-to-map]');
    must((await p.textContent('[data-testid=prize-slot]')).trim() === '🟨', 'reduced: the prize (the ninja first collectible) is on the shelf');
    await p.screenshot({ path: `${SHOTS}/95-chest-ninja-dark.png` });
    await layoutOk(p, 'chest (dark)');
    await seedQuest(p, { stars: starsUpTo('c1-boss', 3), chests: { 'c1-chest': '🌈' }, at: 'c1-boss', revealed: ORDER, last: null });
    await reenter(p);
    await p.tap('.map-node[data-node="c1-boss"]');
    await p.tap('[data-testid=boss-start]');
    await p.waitForSelector('.boss-screen .bubble');
    await answer(p, await solve(p));
    await p.waitForFunction(() => document.querySelector('.boss-hp').dataset.hp === '7');
    must((await endless(p)) === 0, 'reduced: the boss should not float');
    await p.screenshot({ path: `${SHOTS}/96-boss-ninja-dark.png` });
    await layoutOk(p, 'boss (dark)');
    step('dark + reduced: chest opens straight to the prize, the boss is still, a hit drops the bar');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  await b.close();
  console.log('\nphase 4 e2e passed');
})().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
