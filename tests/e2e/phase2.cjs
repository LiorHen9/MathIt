const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase2.cjs <screenshots-dir> [url]
// Phase 2 – the learning core and the first game with full feedback, at phone size (360px):
// - an old phone's data (schema 1, one profile) is migrated to schema 2 and kept;
// - home: five skills, the ones for the child's age recommended;
// - an addition round for a 5-year-old: a wrong answer (shake, oops, "נסי שוב", a hint), right
//   answers on bubbles and on the number pad, a combo whose sound climbs, two mistakes → the
//   answer is shown, stars one by one with rising notes, the fanfare, the result saved;
//   window.__mathitFx and window.__mathitSounds hold the right events and sounds;
// - a perfect round → 3 stars, the celebration skipped with a tap, the level goes up;
// - dark + reduced motion in another world: short feedback, no endless animations, no particles;
// - touch targets ≥ 48px (number pad ≥ 56px), no sideways scroll, transform/opacity only;
// - the stage and blocks worlds: a profile, the hero, a right answer with the world's flavour;
// - screenshots in light and dark, in four worlds.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
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

const fx = (p) => p.evaluate(() => window.__mathitFx.map((e) => ({ ...e })));
const sounds = (p) => p.evaluate(() => window.__mathitSounds.slice());
const lastFx = async (p, type) => (await fx(p)).filter((e) => !type || e.type === type).at(-1);

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

/** Running animations change only transform and opacity. Returns how many are running. */
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

const endless = (p) => p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);

/** The right answer of the question on screen, worked out from what the child sees. */
async function solve(p) {
  const math = (await p.textContent('[data-testid=prompt-math]')).replace(/\s+/g, ' ').trim();
  let m;
  if ((m = /^(\d+) \+ (\d+) =/.exec(math))) return String(Number(m[1]) + Number(m[2]));
  if ((m = /^(\d+) − (\d+) =/.exec(math))) return String(Number(m[1]) - Number(m[2]));
  if ((m = /^(\d+)\s*[?<>=]\s*(\d+)$/.exec(math))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a > b ? '>' : a < b ? '<' : '=';
  }
  must(!/[+−=]/.test(math), 'cannot read the exercise: ' + math);
  // Counting: the stars on the card.
  return String(await p.$$eval('.prompt .dot', (d) => d.length));
}

const qIndex = (p) => p.evaluate(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')));
const isNumpad = async (p) => !!(await p.$('.pop .numpad'));

/** Give an answer the way a child would: a bubble, or the number pad and "check". */
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

/** After a right answer: the next question (or the end of the round). */
async function waitNext(p, i, last) {
  if (last) await p.waitForSelector('.celebrate');
  else await p.waitForFunction((n) => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === n, i + 1);
}

async function startApp(p) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
}

async function stored(p) {
  return p.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('mathit');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['profiles', 'meta', 'skillStates'], 'readonly');
          const profiles = tx.objectStore('profiles').getAll();
          const states = tx.objectStore('skillStates').getAll();
          const keys = tx.objectStore('skillStates').getAllKeys();
          const v = tx.objectStore('meta').get('schemaVersion');
          tx.oncomplete = () => {
            resolve({ v: v.result, stores: [...db.objectStoreNames], profiles: profiles.result, states: states.result, keys: keys.result });
            db.close();
          };
        };
      })
  );
}

(async () => {
  const b = await chromium.launch();

  // ================= Light, normal motion: שירה, 5, fairies – data from version 1 =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });

    // An "old phone": the database as version 1 wrote it, before the app (served blank) runs.
    await p.route(URL, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>old</title>' }));
    await p.goto(URL);
    await p.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('mathit', 1);
          req.onupgradeneeded = () => {
            req.result.createObjectStore('meta');
            req.result.createObjectStore('profiles');
          };
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction(['meta', 'profiles'], 'readwrite');
            tx.objectStore('meta').put(1, 'schemaVersion');
            tx.objectStore('meta').put('old-device', 'deviceId');
            tx.objectStore('profiles').put(
              {
                id: 'p_old',
                name: 'שירה',
                avatar: '🦄',
                grade: 0,
                gender: 'girl',
                worldId: 'fairies',
                settings: { sfx: true, music: true, narration: false, volume: 0.8, reducedMotion: null, speechHelpSeen: true },
                createdAt: 1
              },
              'p_old'
            );
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        })
    );
    await p.unroute(URL);

    // The game is not part of the first load.
    await p.goto(URL);
    await p.waitForSelector('.splash');
    const mainSrc = await p.$eval('script[type=module][src]', (s) => s.src);
    const mainJs = await p.evaluate(async (u) => (await fetch(u)).text(), mainSrc);
    must(!mainJs.includes('נסי שוב') && !mainJs.includes('sub.within10') && !mainJs.includes('fx-canvas'), 'the game, the skills or the feedback engine are in the main script');
    step(`game, generators and feedback engine are separate chunks (main script ${(mainJs.length / 1024).toFixed(1)}KB)`);

    await p.tap('.splash-go', { force: true });
    await p.waitForSelector('.profiles-screen');
    must((await p.$$('.profile-pick')).length === 1, 'the old profile is not listed');
    let db = await stored(p);
    must(db.v === 5 && db.stores.join() === 'inventory,meta,profiles,questProgress,sessions,skillStates', `migration to 5: v=${db.v} stores=${db.stores}`);
    must(db.profiles.length === 1 && db.profiles[0].name === 'שירה' && db.profiles[0].worldId === 'fairies', 'the old profile changed: ' + JSON.stringify(db.profiles));
    step('an old phone (schema 1) is migrated to schema 5: skillStates, questProgress, inventory and sessions added, the profile kept');

    // --- Free practice (phase 4: one tap from the map): five skills (word problems from phase 5), the ones for her age recommended ---
    await p.tap('.profile-pick >> nth=0');
    await p.waitForSelector('.quest-map');
    await p.tap('[data-testid=open-practice]');
    await p.waitForSelector('.home .skill-btn');
    const skills = await p.$$eval('.skill-btn', (els) => els.map((e) => [e.dataset.skill, e.classList.contains('is-rec')]));
    // Phase 7: 17 skills (grades 1–2 joined); the first five as before.
    must(skills.length === 17, 'skills on home: ' + skills.length);
    must(JSON.stringify(skills.slice(0, 5)) === JSON.stringify([['count.to10', true], ['compare.to10', true], ['add.within10', false], ['sub.within10', false], ['story.within10', false]]), 'recommended for גן חובה: ' + JSON.stringify(skills));
    must(skills.slice(5).every(([, rec]) => !rec), 'nothing of grades 1–2 recommended for a kindergartner');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SHOTS}/30-home-skills.png`, fullPage: true });
    await layoutOk(p, 'home');
    step('home: all 17 skills, counting and comparing recommended for a kindergartner');

    // --- An addition round ---
    await p.tap('[data-skill="add.within10"]');
    await p.waitForSelector('.game .pop');
    must((await p.getAttribute('.game', 'data-level')) === '1', 'a 5-year-old starts addition at level 1');
    must((await p.$$('.round-dot')).length === 8, 'a round of 8');
    const dir = await p.$eval('[data-testid=prompt-math]', (e) => getComputedStyle(e).direction);
    must(dir === 'ltr', 'the exercise is not left to right');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/31-game-question.png` });
    await layoutOk(p, 'game (bubbles)');
    must((await endless(p)) > 0, 'bubbles and hero should move (normal motion)');
    step('the round starts at level 1: 8 dots, the exercise LTR, floating bubbles');

    // Q1: wrong first – a gentle shake, oops, "נסי שוב", then a hint.
    let right = await solve(p);
    const before = (await sounds(p)).length;
    await answer(p, await wrongValue(p, right));
    let e = await lastFx(p, 'wrong');
    must(e && e.detail.attempt === 1 && e.sound === 'wrong' && e.hero === 'oops' && e.motion === 'shake', 'wrong event: ' + JSON.stringify(e));
    must((await p.getAttribute('.game-hero', 'class')).includes('is-oops'), 'the hero does not say oops');
    must((await p.textContent('.speech-bubble .feedback')).includes('נסי שוב'), 'no "נסי שוב" for a girl: ' + (await p.textContent('.speech-bubble .feedback')));
    await onlyTransformOpacity(p, 'after a wrong answer');
    await p.waitForSelector('[data-testid=hint]');
    e = await lastFx(p, 'hint');
    must(e && e.sound === 'hint' && e.hero === 'think', 'hint event: ' + JSON.stringify(e));
    // Phase 3: the hint is an animation (manipulatives/) instead of numbered stars.
    must(await p.$('.prompt [data-testid=hint-anim] .manip'), 'the hint should be animated');
    let s = (await sounds(p)).slice(before);
    must(s.includes('wrong') && s.includes('hint') && !s.includes('correct'), 'sounds after a mistake: ' + s);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/32-game-hint.png` });
    step('wrong: shake + soft sound + oops + "נסי שוב", then an animated hint (hero thinks)');

    // ...then right.
    await answer(p, right);
    e = await lastFx(p, 'correct');
    must(e && e.detail.streak === 1 && e.sound === 'correct' && e.world === 'fairies', 'correct event: ' + JSON.stringify(e));
    must(e.particles > 0, 'no sparkles on a right answer');
    must(await p.$('.fly-token'), 'no star flying to the progress dot');
    must((await p.$eval('[data-testid=slot]', (x) => x.textContent)) === right, 'the slot does not show the answer');
    await onlyTransformOpacity(p, 'after a right answer');
    await p.screenshot({ path: `${SHOTS}/33-game-correct.png` });
    await waitNext(p, 0);
    must(await p.$('.round-dot:nth-child(1).is-second'), 'question 1 not marked "second try"');
    step('right: sound with the fairies flavour, sparkles, a star flies to the dot, next question');

    // Q2 (bubbles) and Q3 (number pad): the combo climbs.
    for (const i of [1, 2]) {
      right = await solve(p);
      if (i === 2) {
        must(await isNumpad(p), 'question 3 should use the number pad');
        const keys = await p.$$eval('.numpad-key', (els) => els.map((k) => Math.round(k.getBoundingClientRect().height)));
        must(keys.every((h) => h >= 56), 'number pad keys under 56px: ' + keys);
        must((await p.getAttribute('.numpad', 'dir')) === 'ltr', 'number pad not LTR');
        const clicks = (await sounds(p)).filter((x) => x === 'click').length;
        for (const d of right) await p.tap(`.numpad-key[data-key="${d}"]`);
        must((await sounds(p)).filter((x) => x === 'click').length === clicks + right.length, 'number pad keys are silent');
        must((await lastFx(p, 'tap')).motion === 'pop', 'number pad keys do not pop');
        must((await p.textContent('[data-testid=slot]')).trim() === right, 'typed number not shown in the slot');
        await p.screenshot({ path: `${SHOTS}/34-game-numpad.png` });
        await layoutOk(p, 'game (number pad)');
        await p.tap('.numpad-key[data-key=ok]');
      } else await answer(p, right);
      await waitNext(p, i);
    }
    const corrects = (await fx(p)).filter((x) => x.type === 'correct');
    must(corrects.map((x) => x.detail.streak).join() === '1,2,3', 'streaks: ' + corrects.map((x) => x.detail.streak));
    must(corrects[0].pitch < corrects[1].pitch && corrects[1].pitch < corrects[2].pitch, 'combo pitch does not climb: ' + corrects.map((x) => x.pitch));
    must(corrects[2].hero === 'cheer', 'three in a row should make the hero cheer');
    must((await p.textContent('[data-testid=combo]')).includes('3'), 'combo counter: ' + (await p.textContent('[data-testid=combo]')));
    await p.screenshot({ path: `${SHOTS}/35-game-combo.png` });
    step('combo: 3 in a row (bubbles + number pad with key clicks), the pitch climbs, counter ×3, hero cheers');

    // Q4: two mistakes → the step-by-step explanation, the answer, then "next".
    right = await solve(p);
    for (const attempt of [1, 2]) {
      await answer(p, await wrongValue(p, right));
      must((await lastFx(p, 'wrong')).detail.attempt === attempt, 'attempt ' + attempt);
      if (attempt === 1) await p.waitForSelector('[data-testid=hint]');
    }
    await p.waitForSelector('[data-testid=next]');
    must((await p.textContent('[data-testid=slot]')).trim() === right, 'the answer is not shown after two mistakes');
    must((await p.textContent('.speech-bubble .feedback')).includes(right), 'the feedback does not say the answer');
    must(!(await p.$('[data-testid=combo].is-on')), 'the combo should reset after a mistake');
    await p.screenshot({ path: `${SHOTS}/36-game-shown.png` });
    await layoutOk(p, 'game (answer shown)');
    await p.tap('[data-testid=next]');
    await waitNext(p, 3);
    // Phase 6: a question whose answer was shown comes back later – the round grows to 9.
    must((await p.$$('.round-dot')).length === 9, 'the shown question should come back (9 dots)');
    step('two mistakes: the answer is shown, the combo resets, "next" moves on, the question will come back');

    // Q5–Q9 right (Q6 is the comeback; three in a row move the level up).
    for (let i = 4; i < 9; i++) {
      must((await qIndex(p)) === i, `question ${i + 1} expected, at ${(await qIndex(p)) + 1}`);
      if (i === 5) must((await p.getAttribute('.game', 'data-repeat')) === 'yes', 'question 6 should be the comeback');
      await answer(p, await solve(p));
      await waitNext(p, i, i === 8);
    }

    // --- The end: stars one by one, rising notes, then the fanfare ---
    must((await p.getAttribute('.celebrate', 'data-stars')) === '2', '7½ of 9 should give 2 stars, got ' + (await p.getAttribute('.celebrate', 'data-stars')));
    must(!(await p.$('[data-testid=star-1].is-on')), 'stars should appear one by one, not at once');
    await p.waitForSelector('[data-testid=star-1].is-on');
    must(!(await p.$('[data-testid=star-2].is-on')), 'the second star came with the first');
    await p.waitForSelector('[data-testid=star-2].is-on');
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${SHOTS}/37-stars.png` });
    await p.waitForFunction(() => window.__mathitFx.some((x) => x.type === 'roundDone'));
    const done = await lastFx(p, 'roundDone');
    const starsFx = (await fx(p)).filter((x) => x.type === 'starEarned');
    must(starsFx.map((x) => x.detail.n).join() === '1,2', 'starEarned: ' + starsFx.map((x) => x.detail.n));
    must(starsFx[0].pitch < starsFx[1].pitch, 'each star should be a higher note');
    must(done.detail.stars === 2 && done.sound === 'fanfare' && done.hero === 'cheer' && done.particles > 0, 'roundDone: ' + JSON.stringify(done));
    s = await sounds(p);
    must(s.filter((x) => x === 'star').length >= 2 && s.at(-1) === 'fanfare', 'celebration sounds: ' + s.slice(-5));
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${SHOTS}/38-confetti.png` });
    await onlyTransformOpacity(p, 'celebration');
    await p.waitForSelector('[data-testid=again]', { timeout: 5000 });
    await layoutOk(p, 'celebration');
    db = await stored(p);
    const st = db.states.find((x) => x.skillId === 'add.within10');
    // Phase 6: the level the round reached (3 right in a row at the end → 2), and the mastery engine's record.
    must(st && st.profileId === 'p_old' && st.bestStars === 2 && st.rounds === 1 && st.level === 2, 'saved result: ' + JSON.stringify(st));
    must(st.attempts === 9 && st.mastery > 0 && st.errorCounts && Object.values(st.errorCounts).reduce((a, b) => a + b, 0) === 3, 'mastery saved: ' + JSON.stringify(st));
    must(db.keys.includes('p_old:add.within10'), 'skillStates key: ' + db.keys);
    step('end: 2 stars appear one by one (rising notes), fanfare + confetti + cheer, result saved (best 2, level 2 reached, 9 answers)');

    // --- Again: a perfect round, the celebration skipped with a tap ---
    await p.tap('[data-testid=again]');
    await p.waitForSelector('.game .pop');
    for (let i = 0; i < 8; i++) {
      await answer(p, await solve(p));
      await waitNext(p, i, i === 7);
    }
    must((await p.getAttribute('.celebrate', 'data-stars')) === '3', 'a perfect round should give 3 stars');
    await p.waitForTimeout(150);
    must(!(await p.$('[data-testid=again]')), 'buttons before the celebration ends');
    await p.tap('.celebrate-title');
    await p.waitForSelector('[data-testid=again]', { timeout: 1000 });
    must((await p.$$('.big-star.is-on')).length === 3, 'skipping should show all stars at once');
    const skipped = await lastFx(p, 'roundDone');
    must(skipped.detail.skipped === true && skipped.sound === null, 'skip event: ' + JSON.stringify(skipped));
    await p.waitForTimeout(100);
    must((await p.getAttribute('.fx-canvas', 'data-count')) === '0', 'particles still flying after the skip');
    must((await p.textContent('.celebrate')).includes('עולים שלב'), 'no "level up" after 3 stars');
    await p.screenshot({ path: `${SHOTS}/39-skipped.png` });
    step('perfect round: 3 stars; a tap skips the celebration (all stars, quiet, no particles), level up');

    await p.tap('[data-testid=home]');
    await p.waitForSelector('.home .skill-btn');
    await p.waitForFunction(() => document.querySelectorAll('[data-skill="add.within10"] .skill-stars .is-on').length === 3);
    db = await stored(p);
    const st2 = db.states.find((x) => x.skillId === 'add.within10');
    must(st2.bestStars === 3 && st2.rounds === 2 && st2.level === 3, 'after a perfect round: ' + JSON.stringify(st2));
    await p.tap('[data-skill="add.within10"]');
    await p.waitForSelector('.game .pop');
    must((await p.getAttribute('.game', 'data-level')) === '3', 'the next round should be level 3');
    await p.tap('[data-testid=game-home]');
    await p.waitForSelector('.home');
    step('home shows the best stars (3); the next addition round starts at level 3 (reached inside the perfect round)');

    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= Dark, reduced motion, football: איתי, 6 =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
    await startApp(p);
    await p.waitForSelector('.profile-editor');
    await p.fill('.profile-editor input[name=name]', 'איתי');
    await p.tap('.avatar-option >> nth=3');
    await p.tap('[data-stage-mode=age]');
    await p.tap('[data-age="6"]');
    await p.tap('[data-gender=boy]');
    await p.tap('[data-world-id=football]');
    await p.tap('[data-testid=save-profile]');
    await p.waitForSelector('.quest-map');
    await p.tap('[data-testid=open-practice]');
    await p.waitForSelector('.home .skill-btn');
    const rec = await p.$$eval('.skill-btn.is-rec', (els) => els.map((e) => e.dataset.skill));
    must(rec.join() === 'add.within10,sub.within10,story.within10', 'recommended at 6: ' + rec);
    await p.screenshot({ path: `${SHOTS}/40-home-football-dark.png`, fullPage: true });

    await p.tap('[data-skill="sub.within10"]');
    await p.waitForSelector('.game .pop');
    must((await endless(p)) === 0, `reduced motion: ${await endless(p)} endless animations in the game`);
    await p.screenshot({ path: `${SHOTS}/41-game-football-dark.png` });
    await layoutOk(p, 'game (dark)');

    // Wrong, then right: short feedback, no particles, no endless animations.
    const right = await solve(p);
    await answer(p, await wrongValue(p, right));
    must((await p.textContent('.speech-bubble .feedback')).includes('נסה שוב'), 'no "נסה שוב" for a boy');
    await p.waitForSelector('[data-testid=hint]');
    await answer(p, right);
    const e = await lastFx(p, 'correct');
    must(e && e.world === 'football' && e.particles === 0, 'reduced motion: particles on a right answer: ' + JSON.stringify(e));
    const longest = await p.evaluate(() => Math.max(0, ...document.getAnimations().map((a) => Number(a.effect.getTiming().duration) || 0)));
    must(longest <= 250, `reduced motion: a ${longest}ms animation (feedback should be short)`);
    must((await endless(p)) === 0, 'reduced motion: endless animations after answering');
    must(!(await p.$('.fly-token')) || (await p.evaluate(() => document.getAnimations().every((a) => a.effect.getTiming().duration <= 250))), 'the flying star is not short');
    await onlyTransformOpacity(p, 'reduced motion');
    await p.screenshot({ path: `${SHOTS}/42-game-football-correct-dark.png` });
    step('dark + reduced motion (football, "נסה שוב" for a boy): feedback ≤ 250ms, no particles, nothing endless');

    // Finish the round: stars come quickly.
    await waitNext(p, 0);
    for (let i = 1; i < 8; i++) {
      await answer(p, await solve(p));
      await waitNext(p, i, i === 7);
    }
    const t0 = Date.now();
    await p.waitForSelector('[data-testid=again]', { timeout: 3000 });
    must(Date.now() - t0 < 2500, 'reduced motion: the celebration should be short');
    must((await p.$$('.big-star.is-on')).length === 3, 'stars after a 7½-point round: ' + (await p.$$('.big-star.is-on')).length);
    must((await endless(p)) === 0, 'reduced motion: endless animations on the celebration');
    await p.screenshot({ path: `${SHOTS}/43-stars-football-dark.png` });
    await layoutOk(p, 'celebration (dark)');
    step('reduced motion: the celebration is short and still, 3 stars');

    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= The two newer worlds: stage (light) and blocks (dark) =================
  for (const [scheme, name, gender, worldId, heroName, skill] of [
    ['light', 'מאיה', 'girl', 'stage', 'זמרת לוחמת', 'count.to10'],
    ['dark', 'יונתן', 'boy', 'blocks', 'בנאי', 'compare.to10']
  ]) {
    const { ctx, p, errors } = await phone(b, { colorScheme: scheme, reducedMotion: 'no-preference' });
    await startApp(p);
    await p.waitForSelector('.profile-editor');
    await p.fill('.profile-editor input[name=name]', name);
    await p.tap('.avatar-option >> nth=5');
    await p.tap('[data-grade="0"]');
    await p.tap(`[data-gender=${gender}]`);
    await p.tap(`[data-world-id=${worldId}]`);
    await p.waitForFunction((w) => document.documentElement.dataset.world === w, worldId);
    must((await sounds(p)).at(-1) === `world-${worldId}`, `no sample sound for ${worldId}`);
    await p.tap('[data-testid=save-profile]');
    await p.waitForSelector('.quest-map');
    must((await p.textContent('.home-hero-name')).trim() === heroName, `${worldId} hero: ` + (await p.textContent('.home-hero-name')));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SHOTS}/5${worldId === 'stage' ? 0 : 2}-map-${worldId}-${scheme}.png` });
    await layoutOk(p, `map (${worldId})`);
    await p.tap('[data-testid=open-practice]');
    await p.waitForSelector('.home .skill-btn');
    await p.tap(`[data-skill="${skill}"]`);
    await p.waitForSelector('.game .pop');
    await answer(p, await solve(p));
    const e = await lastFx(p, 'correct');
    must(e && e.world === worldId && e.sound === 'correct', `${worldId}: correct event ` + JSON.stringify(e));
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${SHOTS}/5${worldId === 'stage' ? 1 : 3}-game-${worldId}-${scheme}.png` });
    await layoutOk(p, `game (${worldId})`);
    await onlyTransformOpacity(p, `game (${worldId})`);
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
    step(`${worldId} (${scheme}): profile, hero "${heroName}", sample sound, a ${skill} answer with the world's flavour`);
  }

  await b.close();
  console.log('\nphase 2 e2e passed');
})().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
