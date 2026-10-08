const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase6.cjs <screenshots-dir> [url]
// Phase 6 – the mastery engine, at phone size (360px):
// - a child who answers right moves up a level inside the round (3 right the first time in a row,
//   a levelUp with the world's feedback), ends mastered: a crown and a full meter in free practice
//   and on the map, all still there after a reload (saved after every question);
// - a child who struggles: 2 wrong in a row → a lower level and an early hint (before any mistake);
//   a question whose answer was shown comes back later in the round (the round grows);
// - spaced review: the clock moved two days (?clockDays=2, tests only) → a review station opens
//   beside the hero (a burst, the unlock sound), a mixed round of 6 with coins, then it is gone;
// - the placement game for a new profile: a child who knows everything lands at the boss, every
//   station before it done without bursts; one who knows up to "adding to 5" lands at "adding to
//   7"; skipping changes nothing; "check again" from settings;
// - reduced motion, transform/opacity only, touch targets ≥ 48px, no sideways scroll;
//   screenshots in light and dark, in four worlds.
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
const mark = async (p) => (await fx(p)).length;
async function waitFx(p, from, type, count = 1, timeout = 15000) {
  await p.waitForFunction(([n, t, c]) => window.__mathitFx.slice(n).filter((e) => e.type === t).length >= c, [from, type, count], { timeout });
  return (await fx(p)).slice(from).filter((e) => e.type === type);
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
  // CSS transitions too (the mastery bar grows by transform).
  const trans = await p.$$eval('.mastery-fill', (els) => [...new Set(els.map((e) => getComputedStyle(e).transitionProperty))]);
  must(trans.every((t) => t === 'transform' || t === 'all' || t === 'none'), `${where}: mastery bar transitions ${trans}`);
}

async function solve(p) {
  // Phase 7: grades 1–2 questions (coins, clocks, sequences…) – the round says its answer (a test hook).
  const said = await p.$eval('.game', (e) => e.dataset.answer).catch(() => undefined);
  if (said !== undefined && !(await p.$('.pop .numpad'))) return said;
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
  if (await isNumpad(p)) return right === '9' ? '8' : String(Number(right) + 1);
  const options = await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer));
  return options.find((o) => o !== right);
}
const nowDot = (p) => p.evaluate(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')));
/** After an answer: the next question (dot `n`) or the end. */
const waitDot = (p, n, end = '.celebrate') => p.waitForFunction(([i, e]) => !!document.querySelector(e) || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === i, [n, end]);

/** Two mistakes: the explanation, skipped, then "next". */
async function missTwice(p) {
  const right = await solve(p);
  await answer(p, await wrongValue(p, right));
  await p.waitForSelector('[data-testid=hint]');
  await answer(p, await wrongValue(p, right));
  await p.tap('[data-testid=skip-explain]');
  await p.tap('[data-testid=next]');
}

async function newProfile(p, { name, age, gender, world, placement = false }) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-editor');
  await p.fill('.profile-editor input[name=name]', name);
  await p.tap('.avatar-option >> nth=1');
  await p.tap('[data-stage-mode=age]');
  await p.tap(`[data-age="${age}"]`);
  await p.tap(`[data-gender=${gender}]`);
  await p.tap(`[data-world-id=${world}]`);
  must((await p.getAttribute('[data-start=first]', 'aria-pressed')) === 'true', 'a new profile starts from the beginning unless asked');
  if (placement) await p.tap('[data-start=placement]');
  await p.tap('[data-testid=save-profile]');
  await p.waitForSelector(placement ? '[data-testid=placement]' : '.quest-map .map-node');
}

async function reenter(p, query = '') {
  await p.goto(URL + query);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-pick');
  await p.tap('.profile-pick >> nth=0');
  await p.waitForSelector('.quest-map .map-node');
}

async function db(p) {
  return p.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('mathit');
        req.onsuccess = () => {
          const d = req.result;
          const tx = d.transaction(['meta', 'skillStates', 'questProgress', 'inventory'], 'readonly');
          const r = { v: tx.objectStore('meta').get('schemaVersion'), states: tx.objectStore('skillStates').getAll(), quest: tx.objectStore('questProgress').getAll(), inv: tx.objectStore('inventory').getAll() };
          tx.oncomplete = () => {
            d.close();
            resolve(Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x.result])));
          };
        };
      })
  );
}
const state = async (p, skill) => (await db(p)).states.find((s) => s.skillId === skill);

/** Play the placement game: `knows(skill, level)` decides right (first time) or wrong-then-right. */
async function placement(p, knows) {
  await p.waitForSelector('[data-testid=placement][data-phase=intro]');
  await p.tap('[data-testid=placement-start]');
  let asked = 0;
  for (; asked < 12; asked++) {
    await p.waitForSelector('[data-testid=placement][data-phase=test] .pop, [data-testid=placement][data-phase=done]');
    if (await p.$('[data-testid=placement][data-phase=done]')) break;
    const skill = await p.getAttribute('[data-testid=placement]', 'data-skill');
    const level = Number(await p.getAttribute('[data-testid=placement]', 'data-level'));
    const right = await solve(p);
    if (!knows(skill, level)) {
      await answer(p, await wrongValue(p, right));
      await p.waitForSelector('[data-testid=hint]');
    }
    await answer(p, right);
    await p.waitForFunction(
      (n) => !!document.querySelector('[data-testid=placement][data-phase=done]') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === n,
      asked + 1
    );
  }
  await p.waitForSelector('[data-testid=placement][data-phase=done]');
  return asked;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    // ================= A child who knows: fairies, light =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'נועם', age: 6, gender: 'boy', world: 'fairies' });
      await p.tap('[data-testid=open-practice]');
      await p.waitForSelector('.home .skill-btn');
      must((await p.$$('.mastery-meter')).length === 17 && !(await p.$('[data-testid=crown]')), 'free practice: a meter per skill, no crowns yet');
      await p.tap('[data-skill="add.within10"]');
      await p.waitForSelector('.game .pop');
      must((await p.getAttribute('.game', 'data-level')) === '1', 'a 6-year-old starts adding at level 1');
      const m0 = await mark(p);
      for (let i = 0; i < 3; i++) {
        await answer(p, await solve(p));
        await waitDot(p, i + 1);
      }
      // Saved after every question, not only at the end of the round.
      const after1 = await state(p, 'add.within10');
      must(after1 && after1.attempts === 3 && after1.mastery > 0 && after1.rounds === 0, 'saved after each question: ' + JSON.stringify(after1));
      must((await p.getAttribute('.game', 'data-level')) === '2', 'three right in a row → level 2 inside the round');
      must((await p.textContent('[data-testid=level-chip]')).includes('2'), 'the level chip says 2');
      const up = (await waitFx(p, m0, 'levelUp'))[0];
      must(up.detail.level === 2 && up.sound === 'unlock' && up.pack === 'fairies' && up.kind === 'rainbow' && up.particles > 0, 'levelUp: ' + JSON.stringify(up));
      await p.waitForTimeout(300);
      await p.screenshot({ path: `${SHOTS}/p6-01-level-up-fairies.png` });
      await onlyTransformOpacity(p, 'level up');
      await layoutOk(p, 'game');
      for (let i = 3; i < 8; i++) {
        await answer(p, await solve(p));
        await waitDot(p, i + 1);
      }
      await p.waitForSelector('.celebrate');
      must((await p.textContent('.celebrate')).includes('עולים שלב'), 'the celebration says "level up"');
      const st = await state(p, 'add.within10');
      must(st.attempts === 8 && st.level === 3 && st.mastery >= 0.85 && st.recentResults.length === 8 && st.recentResults.every(Boolean) && st.nextReview > Date.now(), 'mastered: ' + JSON.stringify(st));
      step('a child who answers right: level 2 after 3 in a row (levelUp: unlock sound, rainbow), level 3 at the end, mastered, saved after each question');

      await p.tap('.celebrate-title');
      await p.waitForSelector('[data-testid=home]');
      await p.tap('[data-testid=home]');
      await p.waitForSelector('.home .skill-btn');
      await p.waitForSelector('[data-skill="add.within10"][data-mastered=yes] [data-testid=crown]');
      const meter = Number(await p.getAttribute('[data-skill="add.within10"] .mastery-meter', 'data-mastery'));
      must(meter >= 0.85, 'meter ' + meter);
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${SHOTS}/p6-02-practice-crown-fairies.png`, fullPage: true });
      await onlyTransformOpacity(p, 'free practice');
      await layoutOk(p, 'free practice');

      // A reload keeps it all.
      await reenter(p);
      must((await p.getAttribute('.map-node[data-node="c1-add-10"]', 'data-mastered')) === 'yes', 'the map crowns the mastered skill');
      must((await p.$$('[data-testid=map-crown]')).length === 1, 'one crown on the map');
      must(!(await p.$('[data-testid=review-node]')), 'no review on the same day');
      await p.tap('[data-testid=open-practice]');
      await p.waitForSelector('[data-skill="add.within10"][data-mastered=yes]');
      must(Number(await p.getAttribute('[data-skill="add.within10"] .mastery-meter', 'data-mastery')) === meter, 'mastery after a reload');
      step('mastery is kept after a reload: a crown and a full meter in free practice, a crown on the map, no review the same day');

      // A second skill, so the review mixes two.
      await p.tap('[data-skill="count.to10"]');
      await p.waitForSelector('.game .pop');
      for (let i = 0; i < 8; i++) {
        await answer(p, await solve(p));
        await waitDot(p, i + 1);
      }
      await p.waitForSelector('.celebrate');

      // --- Two days later: a review station beside the hero ---
      await reenter(p, '?clockDays=2');
      const m1 = await mark(p);
      await p.waitForSelector('[data-testid=review-node]');
      must((await p.getAttribute('.quest-map', 'data-review')).split(',').sort().join() === 'add.within10,count.to10', 'review skills: ' + (await p.getAttribute('.quest-map', 'data-review')));
      const burst = (await waitFx(p, m1, 'unlock'))[0];
      must(burst.sound === 'unlock' && burst.pack === 'fairies', 'the review opens with the unlock sound: ' + JSON.stringify(burst));
      await p.waitForSelector('.k-review .map-new');
      const box = await p.$eval('[data-testid=review-node]', (e) => e.getBoundingClientRect().toJSON());
      must(box.left >= 0 && box.right <= 360 && box.width >= 48, 'the review station on screen: ' + JSON.stringify(box));
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${SHOTS}/p6-03-review-station-fairies.png` });
      await layoutOk(p, 'map with a review');
      await p.tap('[data-testid=review-node]');
      await p.waitForSelector('.game.is-review .pop');
      must((await p.$$('.round-dot')).length === 6, 'a review of 6');
      const kinds = new Set();
      const m2 = await mark(p);
      for (let i = 0; i < 6; i++) {
        kinds.add((await p.textContent('[data-testid=prompt-math]')).includes('+') ? 'add' : 'count');
        await answer(p, await solve(p));
        await waitDot(p, i + 1);
      }
      must(kinds.size === 2, 'the review mixes skills: ' + [...kinds]);
      must((await waitFx(p, m2, 'coin', 6)).every((c) => c.fly === '💎'), 'coins in the review');
      await p.waitForSelector('.celebrate[data-stars="3"]');
      await p.tap('.celebrate-title');
      await p.waitForSelector('[data-testid=to-map]');
      must(!(await p.$('[data-testid=again]')), 'no "again" after a review');
      await p.tap('[data-testid=to-map]');
      await p.waitForSelector('.quest-map .map-node');
      await p.waitForTimeout(300);
      must(!(await p.$('[data-testid=review-node]')), 'the review is done: no station');
      const d = await db(p);
      must(d.quest[0].reviews === 1 && d.quest[0].reviewedAt > Date.now() + 1.5 * 864e5, 'review saved by the moved clock: ' + JSON.stringify(d.quest[0]));
      must(!Object.keys(d.quest[0].stars).includes('review'), 'the review is not saved as a station');
      const add = d.states.find((s) => s.skillId === 'add.within10');
      must(add.nextReview > Date.now() + 4 * 864e5, 'the next review is further away: ' + (add.nextReview - Date.now()) / 864e5);
      step('two days later (injected clock): a review station opens beside the hero (burst + unlock), 6 mixed questions with coins, then gone; next review further away');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= A child who struggles: ninja, dark, reduced motion =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
      await newProfile(p, { name: 'גלי', age: 8, gender: 'girl', world: 'ninja' });
      await p.tap('[data-testid=open-practice]');
      await p.waitForSelector('.home .skill-btn');
      await p.tap('[data-skill="add.within10"]');
      await p.waitForSelector('.game .pop');
      must((await p.getAttribute('.game', 'data-level')) === '3', 'an 8-year-old starts adding at level 3');
      const firstKey = await p.getAttribute('.game', 'data-key');
      await missTwice(p);
      await waitDot(p, 1);
      must((await p.$$('.round-dot')).length === 9, 'a shown answer makes the round 9');
      await missTwice(p);
      await waitDot(p, 2);
      must((await p.$$('.round-dot')).length === 10, '…and 10 at most');
      // Q3: the first question comes back (or its sister), and the hint comes early.
      must((await p.getAttribute('.game', 'data-repeat')) === 'yes', 'question 3 is a comeback');
      const backKey = await p.getAttribute('.game', 'data-key');
      must(backKey === firstKey || /^\d+\+\d+$/.test(backKey), 'the comeback is an addition: ' + backKey);
      must((await p.getAttribute('.game', 'data-early')) === 'yes', 'two wrong in a row → early hints');
      const m0 = await mark(p);
      await p.waitForSelector('[data-testid=hint][data-early=yes]', { timeout: 8000 });
      const h = (await waitFx(p, m0, 'hint'))[0];
      must(h.sound === 'hint' && !(await fx(p)).slice(m0).some((e) => e.type === 'wrong'), 'an early hint, before any mistake');
      await p.screenshot({ path: `${SHOTS}/p6-04-early-hint-ninja-dark.png` });
      await layoutOk(p, 'early hint');
      await answer(p, await solve(p));
      await waitDot(p, 3);
      must((await p.getAttribute('.game', 'data-repeat')) === 'yes', 'question 4 is the second comeback');
      await answer(p, await solve(p));
      await waitDot(p, 4);
      must((await p.getAttribute('.game', 'data-repeat')) === 'no' && (await p.getAttribute('.game', 'data-level')) === '2', 'a new question at the lower level: ' + (await p.getAttribute('.game', 'data-level')));
      must((await p.textContent('[data-testid=level-chip]')).includes('2'), 'the chip shows level 2');
      const shown = (await fx(p)).filter((e) => e.type === 'correct');
      must(shown.every((e) => !e.particles), 'reduced motion: no particles');
      await onlyTransformOpacity(p, 'struggling round');
      const st = await state(p, 'add.within10');
      must(st.attempts === 4 && st.mastery < 0.6 && st.recentResults.join() === 'false,false,true,true' && Object.values(st.errorCounts).reduce((a, x) => a + x, 0) === 4, 'mistakes counted: ' + JSON.stringify(st));
      step('a child who struggles: 2 shown answers → level 3 → 2 and an early hint (data-early, no mistake first); both questions come back, the round grows to 10; reduced motion, no particles');
      for (let i = 4; i < 10; i++) {
        await answer(p, await solve(p));
        await waitDot(p, i + 1);
      }
      await p.waitForSelector('.celebrate');
      await p.waitForSelector('[data-testid=home]');
      await p.tap('[data-testid=home]');
      await p.waitForSelector('.home .skill-btn');
      await p.waitForFunction(() => Number(document.querySelector('[data-skill="add.within10"] .mastery-meter').dataset.mastery) > 0);
      const m = Number(await p.getAttribute('[data-skill="add.within10"] .mastery-meter', 'data-mastery'));
      const st2 = await state(p, 'add.within10');
      must(m > 0 && Math.abs(m - st2.mastery) < 0.01 && st2.attempts === 10, `the meter shows the mastery (${m}, ${st2.mastery})`);
      must((await p.$$('[data-rec=yes]')).length >= 1, 'something is recommended');
      await p.waitForTimeout(300);
      await p.screenshot({ path: `${SHOTS}/p6-05-practice-ninja-dark.png`, fullPage: true });
      step('after the round: the meter shows the saved mastery (10 answers), recommendations by mastery');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Placement: a child who knows everything (blocks, light) =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'מאיה', age: 8, gender: 'girl', world: 'blocks', placement: true });
      must((await p.textContent('.placement .celebrate-title')).includes('יודעת'), 'the placement asks a girl: ' + (await p.textContent('.placement .celebrate-title')));
      await p.screenshot({ path: `${SHOTS}/p6-06-placement-intro-blocks.png` });
      await layoutOk(p, 'placement intro');
      await p.tap('[data-testid=placement-start]');
      await p.waitForSelector('[data-testid=placement][data-phase=test] .pop');
      // Phase 7: the ladder runs through five chapters; an 8-year-old starts at crossing ten.
      must((await p.getAttribute('[data-testid=placement]', 'data-skill')) === 'add.bridge10', 'an 8-year-old starts at crossing ten');
      must(await p.$('.placement .game-hero'), 'the hero is there');
      await p.screenshot({ path: `${SHOTS}/p6-07-placement-question-blocks.png` });
      await layoutOk(p, 'placement question');
      const m0 = await mark(p);
      await answer(p, await solve(p));
      const c = (await waitFx(p, m0, 'correct'))[0];
      must(c.world === 'blocks' && c.pack === 'blocks' && c.particles > 0, 'full feedback in the placement: ' + JSON.stringify(c));
      await p.waitForFunction(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === 1);
      // The rest, all right.
      let n = 1;
      while (!(await p.$('[data-testid=placement][data-phase=done]')) && n < 12) {
        await p.waitForSelector('[data-testid=placement][data-phase=test] .pop, [data-testid=placement][data-phase=done]');
        if (await p.$('[data-testid=placement][data-phase=done]')) break;
        await answer(p, await solve(p));
        n++;
        await p.waitForFunction((k) => !!document.querySelector('[data-phase=done]') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === k, n);
      }
      await p.waitForSelector('[data-testid=placement][data-phase=done]');
      must(n <= 6, 'the knower needs few questions: ' + n);
      await p.screenshot({ path: `${SHOTS}/p6-08-placement-done-blocks.png` });
      const mapMark = await mark(p);
      await p.tap('[data-testid=placement-map]');
      await p.waitForSelector('.quest-map .map-node');
      await p.waitForTimeout(1500);
      // Phase 7: the knower lands at the journey's last boss (chapter 5); chapters 1–4 done, their bosses passed.
      must((await p.getAttribute('.quest-map', 'data-current')) === 'c5-boss', 'the hero goes to the last boss: ' + (await p.getAttribute('.quest-map', 'data-current')));
      must((await p.getAttribute('[data-testid=home-hero]', 'data-at')) === 'c5-boss', 'the hero stands at the boss');
      must((await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')) === 'c5', 'the map shows chapter 5');
      must((await fx(p)).slice(mapMark).filter((e) => e.type === 'unlock' || e.type === 'walk').length === 0, 'no bursts or walks for what was skipped');
      for (const id of ['c5-add-lesson', 'c5-add-2', 'c5-chest', 'c5-sub-3']) must((await p.getAttribute(`.map-node[data-node="${id}"]`, 'data-status')) === 'done', `${id} should be done`);
      must((await p.$$('[data-testid=map-crown]')).length === 2, 'crowns for the two skills of chapter 5 on the map');
      await p.screenshot({ path: `${SHOTS}/p6-09-placed-map-blocks.png` });
      await p.tap('[data-testid=chapter-tab-1]');
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c1]');
      for (const id of ['c1-count-lesson', 'c1-count-10', 'c1-compare-10', 'c1-add-7', 'c1-chest', 'c1-sub-10', 'c1-boss']) must((await p.getAttribute(`.map-node[data-node="${id}"]`, 'data-status')) === 'done', `${id} should be done`);
      must((await p.$$('[data-testid=map-crown]')).length === 4, 'crowns for the four skills of chapter 1');
      const d = await db(p);
      must(d.states.filter((s) => s.mastery >= 0.85).length === 15 && d.quest[0].placedAt > 0, 'placement saved: ' + JSON.stringify(d.states.map((s) => [s.skillId, s.mastery])));
      await p.tap('[data-testid=open-practice]');
      await p.waitForSelector('.home .skill-btn');
      must((await p.$$('[data-testid=crown]')).length === 15, 'fifteen crowns in free practice');
      await p.tap('[data-testid=practice-back]');
      await p.waitForSelector('.quest-map .map-node');
      step(`placement (blocks): a girl who knows everything answers ${n} questions with the full feedback, lands at the last boss (chapter 5); every station before it done, no bursts; crowns on the map and in free practice`);
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Placement: up to adding to 5 (football, dark); skip; settings =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'יואב', age: 8, gender: 'boy', world: 'football', placement: true });
      must((await p.textContent('.placement .celebrate-title')).includes('אתה'), 'the placement asks a boy');
      const order = ['count.to10:1', 'count.to10:3', 'compare.to10:1', 'compare.to10:2', 'add.within10:1'];
      const asked = await placement(p, (skill, level) => order.includes(`${skill}:${level}`));
      await p.screenshot({ path: `${SHOTS}/p6-10-placement-done-football-dark.png` });
      await p.tap('[data-testid=placement-map]');
      await p.waitForSelector('.quest-map .map-node');
      await p.waitForTimeout(800);
      // Phase 7: the long ladder steps down in threes, so adding is found unknown and the hero starts adding.
      must((await p.getAttribute('.quest-map', 'data-current')) === 'c1-add-lesson', 'knows counting and comparing → adding: ' + (await p.getAttribute('.quest-map', 'data-current')));
      must((await p.getAttribute('.map-node[data-node="c1-compare-10"]', 'data-status')) === 'done' && (await p.getAttribute('.map-node[data-node="c1-add-lesson"]', 'data-status')) === 'open', 'stations around the edge');
      must((await p.$$('[data-testid=map-crown]')).length === 2, 'counting and comparing crowned');
      await p.screenshot({ path: `${SHOTS}/p6-11-placed-map-football-dark.png` });
      await layoutOk(p, 'placed map');
      step(`placement (football, dark): knows counting and comparing → ${asked} questions, the hero at the adding lesson, counting and comparing crowned`);

      // From settings: check again – and skip it: nothing changes.
      const before = JSON.stringify((await db(p)).quest[0].stars);
      await p.tap('[data-testid=open-settings]');
      await p.waitForSelector('[data-testid=placement-again]');
      await layoutOk(p, 'settings');
      await p.tap('[data-testid=placement-again]');
      await p.waitForSelector('[data-testid=placement][data-phase=intro]');
      await p.tap('[data-testid=placement-skip]');
      await p.waitForSelector('.quest-map .map-node');
      must(JSON.stringify((await db(p)).quest[0].stars) === before, 'skipping the placement changes nothing');
      step('settings → "check again" opens the placement game; skipping it changes nothing');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    console.log('\nphase 6 e2e passed');
  } catch (e) {
    console.log('✗', e.message);
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
