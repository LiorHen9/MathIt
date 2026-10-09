const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase7.cjs <screenshots-dir> [url]
// Phase 7 – grades 1–2 and five new games, at phone size (360px):
// - every new template (Jump, Build, Match, Clock, Shop) plays a whole round: a right answer, a
//   wrong one with the animated hint of the right kind (for that mistake), two wrong ones with the
//   step-by-step explanation, the round's stars, and every answer saved for the mastery engine;
// - lessons with tens rods and ones cubes (ten cubes snap into a rod with the chord) and with the
//   double ten frame (making ten); the clock's hands turn, ticking; paying in the shop clinks;
// - the map: chapter 1 finished → the hero walks out, the map turns to chapter 2, the hero walks
//   in, the station opens in a burst; chapter tabs;
// - the placement game for a child who knows everything to 20 lands at chapter 3;
// - reduced motion (teaching animations stay, slower), transform/opacity only, touch targets
//   ≥ 48px, no sideways scroll; screenshots in light and dark in three worlds.
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
      .filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden')
      .map((e) => [e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)])
      .filter(([, w, h]) => w < 48 || h < 48)
  );
  must(small.length === 0, `${where}: touch targets under 48px: ${JSON.stringify(small)}`);
  const scroll = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  must(scroll <= 0, `${where}: sideways scroll ${scroll}px`);
  // Every control has a name.
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

/** Running animations on teaching elements (inside .manip). */
const manipAnims = (p) => p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.manip')).length);
async function seeManipMoving(p, where) {
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    if ((await manipAnims(p)) > 0) return;
    await p.waitForTimeout(60);
  }
  throw new Error(`${where}: no teaching animation running`);
}

async function newProfile(p, { name, age, gender, world, placement = false }) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-editor');
  await p.fill('.profile-editor input[name=name]', name);
  await p.tap('.avatar-option >> nth=3');
  await p.tap('[data-stage-mode=age]');
  await p.tap(`[data-age="${age}"]`);
  await p.tap(`[data-gender=${gender}]`);
  await p.tap(`[data-world-id=${world}]`);
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
          const tx = d.transaction(['meta', 'profiles', 'skillStates', 'questProgress'], 'readonly');
          const r = { v: tx.objectStore('meta').get('schemaVersion'), profiles: tx.objectStore('profiles').getAll(), states: tx.objectStore('skillStates').getAll(), quest: tx.objectStore('questProgress').getAll() };
          tx.oncomplete = () => {
            d.close();
            resolve(Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x.result])));
          };
        };
      })
  );
}

const nowDot = (p) => p.evaluate(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')));
const waitDot = (p, n) => p.waitForFunction((i) => !!document.querySelector('.celebrate') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === i, n);
const answerOf = (p) => p.getAttribute('.game', 'data-answer');
const templateOf = (p) => p.getAttribute('.game', 'data-template');

// ---------- Playing each template ----------

/** Give an answer in the template on screen (right or wrong). */
async function give(p, tpl, value) {
  if (tpl === 'jump') {
    await p.waitForSelector(`.jp-plat[data-answer="${value}"]:not([disabled])`);
    await p.tap(`.jp-plat[data-answer="${value}"]`);
  } else if (tpl === 'match') {
    await p.waitForSelector('.mt-cards[data-peek=no]');
    await p.tap(`.mt-card[data-answer="${value}"]`);
  } else if (tpl === 'build' && (await p.$('[data-testid=add-cube]'))) {
    while (Number(await p.getAttribute('[data-testid=build-board]', 'data-value')) > 0) {
      if (await p.isEnabled('[data-testid=remove-cube]')) await p.tap('[data-testid=remove-cube]');
      else await p.tap('[data-testid=remove-rod]');
    }
    const n = Number(value);
    for (let k = 0; k < Math.floor(n / 10); k++) await p.tap('[data-testid=add-rod]');
    for (let k = 0; k < n % 10; k++) await p.tap('[data-testid=add-cube]');
    must(Number(await p.getAttribute('[data-testid=build-board]', 'data-value')) === n, 'built ' + n);
    await p.tap('[data-testid=build-check]');
  } else if (tpl === 'build' || tpl === 'shop') {
    while (await p.$('.tray-coin')) await p.tap('.tray-coin');
    let left = Number(value);
    for (const c of [10, 5, 2, 1, 0.5])
      while (left >= c - 1e-9) {
        await p.tap(`.coin-btn[data-coin="${c}"]`);
        left = Math.round((left - c) * 2) / 2;
      }
    must(Number(await p.getAttribute('[data-testid=coin-tray]', 'data-total')) === Number(value), 'paid ' + value);
    await p.tap(tpl === 'shop' ? '[data-testid=shop-pay]' : '[data-testid=build-check]');
  } else if (tpl === 'clock') {
    const [h, m] = String(value).split(':').map(Number);
    const time = async () => (await p.getAttribute('[data-testid=clock-face]', 'data-time')).split(':').map(Number);
    for (let k = 0; k < 13 && (await time())[0] !== h; k++) await p.tap('[data-testid=hour-up]');
    for (let k = 0; k < 13 && (await time())[1] !== m; k++) await p.tap('[data-testid=min-up]');
    // Turning the minutes past 12 moves the hour: set it again.
    for (let k = 0; k < 13 && (await time())[0] !== h; k++) await p.tap('[data-testid=hour-up]');
    must((await p.getAttribute('[data-testid=clock-face]', 'data-time')) === value, `set the clock to ${value}`);
    await p.tap('[data-testid=clock-check]');
  } else if (await p.$('.pop .numpad')) {
    for (const d of String(value)) await p.tap(`.numpad-key[data-key="${d}"]`);
    await p.tap('.numpad-key[data-key=ok]');
  } else {
    await p.tap(`.bubble[data-answer="${value}"]`, { force: true });
  }
}

/** A wrong answer this template offers (preferring the ones given). */
async function wrongFor(p, tpl, right, prefer = []) {
  const pick = (opts) => prefer.find((x) => opts.includes(x) && x !== right) ?? opts.find((o) => o !== right);
  // Jump: the hero may still be hopping back from the last try (the platforms wait for it).
  if (tpl === 'jump') await p.waitForFunction(() => document.querySelectorAll('.jp-plat:not([disabled])').length >= 2);
  if (tpl === 'jump') return pick(await p.$$eval('.jp-plat:not([disabled])', (els) => els.map((e) => e.dataset.answer)));
  if (tpl === 'match') await p.waitForSelector('.mt-cards[data-peek=no]');
  if (tpl === 'match') return pick(await p.$$eval('.mt-card[data-answer]:not([disabled])', (els) => els.map((e) => e.dataset.answer)));
  if (tpl === 'pop' && !(await p.$('.pop .numpad'))) return pick(await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer)));
  return prefer.find((x) => x !== right) ?? String(Number(right) + 1);
}

/**
 * A whole round in one template: question 1 wrong once (the hint: `hintKind(wrong, right)` says
 * which animation), question 2 wrong twice (the explanation), the rest right. Returns facts.
 */
async function playRound(p, { tpl, wrong1, hintKind, wrong2 }) {
  await p.waitForSelector('.game');
  must((await templateOf(p)) === tpl, `the round plays ${tpl}, not ${await templateOf(p)}`);
  let hint = null;
  let explained = false;
  for (let i = 0; i < 12; i++) {
    if (await p.$('.celebrate')) break;
    await p.waitForSelector('.game');
    const idx = await nowDot(p);
    const t = await templateOf(p);
    const right = await answerOf(p);
    if (idx === 0) {
      const w = await wrongFor(p, t, right, wrong1(right));
      const m = await mark(p);
      await give(p, t, w);
      await p.waitForSelector('[data-testid=hint-anim]');
      hint = { wrong: w, right, kind: await p.getAttribute('[data-testid=hint-anim]', 'data-kind'), sound: (await waitFx(p, m, 'hint'))[0] };
      must(hint.kind === hintKind(w, right), `${tpl}: the hint for ${w} (answer ${right}) should be ${hintKind(w, right)}, not ${hint.kind}`);
      await seeManipMoving(p, `${tpl} hint`);
      await onlyTransformOpacity(p, `${tpl} hint`);
      await p.screenshot({ path: `${SHOTS}/p7-${tpl}-hint.png` });
      await layoutOk(p, `${tpl} with a hint`);
    }
    if (idx === 1) {
      const w2 = await wrongFor(p, t, right, wrong2(right));
      await give(p, t, w2);
      await p.waitForSelector('[data-testid=hint]');
      await p.waitForTimeout(300);
      await give(p, t, await wrongFor(p, t, right, wrong2(right).filter((x) => x !== w2)));
      await p.waitForSelector('[data-testid=explainer]');
      await seeManipMoving(p, `${tpl} explanation`);
      explained = true;
      await p.tap('[data-testid=skip-explain]');
      await p.tap('[data-testid=next]');
      await waitDot(p, idx + 1);
      continue;
    }
    if (idx === 2) await p.screenshot({ path: `${SHOTS}/p7-${tpl}-question.png` });
    // Match: the pairs found fill the round's board.
    if (t === 'match' && idx >= 2) must(Number(await p.getAttribute('[data-testid=match-board]', 'data-pairs')) >= 1, 'the board fills with pairs');
    const m = await mark(p);
    await give(p, t, right);
    await waitFx(p, m, 'correct');
    await waitDot(p, idx + 1);
  }
  await p.waitForSelector('.celebrate');
  const stars = Number(await p.getAttribute('.celebrate', 'data-stars'));
  return { hint, explained, stars };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    // ================= Five new games: ninja, light =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'תמר', age: 7, gender: 'girl', world: 'ninja' });
      // The first chapter on the map, and its tabs (the later chapters closed).
      must((await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')) === 'c1', 'the map opens at chapter 1');
      must((await p.$$('[data-testid=chapter-tabs] button')).length === 10, 'ten chapter tabs (phase 9)');
      const m0 = await mark(p);
      await p.tap('[data-testid=chapter-tab-3]');
      await waitFx(p, m0, 'locked');
      must((await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')) === 'c1', 'a closed chapter does not open');
      await layoutOk(p, 'map chapter 1');
      step('map: chapter 1 with five chapter tabs, a closed chapter says why (locked)');

      const games = [
        // Jump, crossing ten: 10 is "forgot the rest" → the two ten frames; else a slip → the line.
        { tpl: 'jump', skill: 'add.bridge10', wrong1: (r) => ['10', String(Number(r) + 1), String(Number(r) - 1)], hintKind: (w) => (w === '10' ? 'doubleFrame' : 'line'), wrong2: (r) => [String(Number(r) + 1), String(Number(r) - 1)] },
        // Build, place value: one cube too many → the rods and cubes.
        { tpl: 'build', skill: 'place.value', wrong1: (r) => [String(Number(r) + 1)], hintKind: () => 'tens', wrong2: (r) => [String(Number(r) - 1), String(Number(r) + 2)] },
        // Match, to 20: one off → hops on the line.
        { tpl: 'match', skill: 'add.within20', wrong1: (r) => [String(Number(r) + 1), String(Number(r) - 1)], hintKind: (w, r) => (Math.abs(Number(w) - Number(r)) === 1 ? 'line' : 'tens'), wrong2: (r) => [String(Number(r) - 1), String(Number(r) + 1)] },
        // Clock: the hands the other way round → the clock turns.
        {
          tpl: 'clock',
          skill: 'clock',
          wrong1: (r) => {
            const [h] = r.split(':').map(Number);
            return [h === 12 ? '11:00' : `12:${String((h % 12) * 5).padStart(2, '0')}`];
          },
          hintKind: () => 'clock',
          wrong2: (r) => [`${(Number(r.split(':')[0]) % 12) + 1}:00`, `${((Number(r.split(':')[0]) + 1) % 12) + 1}:00`]
        },
        // Shop, paying exactly: a shekel short → the coins counted up.
        { tpl: 'shop', skill: 'money', wrong1: (r) => [String(Number(r) - 1)], hintKind: () => 'coins', wrong2: (r) => [String(Number(r) + 1), String(Number(r) + 2)] }
      ];
      for (const g of games) {
        await reenter(p, `?template=${g.tpl}`);
        await p.tap('[data-testid=open-practice]');
        await p.tap(`[data-skill="${g.skill}"]`);
        await p.waitForSelector(`.game[data-template=${g.tpl}]`);
        await p.waitForTimeout(500);
        await layoutOk(p, `${g.tpl} round`);
        const before = (await db(p)).states.find((s) => s.skillId === g.skill)?.attempts ?? 0;
        const r = await playRound(p, g);
        await p.waitForTimeout(600);
        const after = (await db(p)).states.find((s) => s.skillId === g.skill);
        const total = Number(await p.evaluate(() => document.querySelectorAll('.celebrate-stars .big-star').length));
        must(after && after.attempts - before >= 8, `${g.tpl}: every answer saved (${after?.attempts - before})`);
        must(Object.keys(after.errorCounts).length > 0 && after.rounds >= 1, `${g.tpl}: mistakes by kind and the round saved: ${JSON.stringify(after.errorCounts)}`);
        must(r.explained && r.stars >= 1 && total === 3, `${g.tpl}: explanation and stars (${r.stars})`);
        await p.screenshot({ path: `${SHOTS}/p7-${g.tpl}-end.png` });
        const log = await fx(p);
        // The shop: coins clink onto the tray. The clock: the hand ticks, climbing.
        if (g.tpl === 'shop') must(log.some((e) => e.type === 'clink' && e.sound === 'clink'), 'paying clinks');
        if (g.tpl === 'clock') must(log.some((e) => e.type === 'tick' && e.sound === 'tick' && e.pitch > 0), 'the clock ticks');
        step(`${g.tpl} (${g.skill}): a whole round – wrong ${r.hint.wrong} → a ${r.hint.kind} hint (the right kind), two wrong → the explanation, ${r.stars} stars, ${after.attempts - before} answers saved (${Object.keys(after.errorCounts).join(', ')})`);
      }
      step('the shop clinks, the clock ticks (teaching sounds through the director)');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Lessons: rods and cubes, the double ten frame, the clock (football, dark) =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'איתי', age: 7, gender: 'boy', world: 'football' });
      const lesson = async (skill) => {
        await p.tap('[data-testid=open-practice]');
        await p.tap(`[data-lesson="${skill}"]`);
        await p.waitForSelector('.lesson[data-kind=watch]');
      };
      // Place value: ten cubes snap into a rod, with the chord.
      await lesson('place.value');
      let m = await mark(p);
      await p.waitForSelector('.manip.m-tens');
      await seeManipMoving(p, 'rods and cubes');
      const ten = (await waitFx(p, m, 'ten', 1, 20000))[0];
      must(ten.sound === 'ten', 'the snap is the ten chord');
      await p.waitForSelector('.manip.m-tens[data-state=done]', { timeout: 20000 });
      const rods = await p.$$eval('.manip.m-tens .tb-rod', (els) => els.filter((e) => getComputedStyle(e).opacity === '1').length);
      const cubes = await p.$$eval('.manip.m-tens .tb-cube', (els) => els.filter((e) => getComputedStyle(e).opacity === '1').length);
      must(rods === 1 && cubes === 0, `ten cubes became one rod (${rods} rods, ${cubes} cubes)`);
      await onlyTransformOpacity(p, 'rods and cubes');
      await p.screenshot({ path: `${SHOTS}/p7-lesson-tens-football-dark.png` });
      await layoutOk(p, 'lesson: rods and cubes');
      step('lesson (place value): ten cubes fly onto a rod and snap with the chord; one rod is left');
      await p.tap('[data-testid=lesson-home]');
      await p.waitForSelector('.home');
      await p.tap('[data-testid=practice-back]');
      await p.waitForSelector('.quest-map');
      // Crossing ten: the double ten frame fills the first frame (the chord), the rest goes on.
      m = await mark(p);
      await lesson('add.bridge10');
      await p.waitForSelector('.manip.m-doubleFrame', { timeout: 20000 });
      await seeManipMoving(p, 'double ten frame');
      await waitFx(p, m, 'ten', 1, 20000);
      await p.waitForSelector('.manip.m-doubleFrame[data-state=done]', { timeout: 20000 });
      const frames = await p.$$eval('.manip.m-doubleFrame .df-frame', (fs) => fs.map((f) => [...f.querySelectorAll('.m-counter')].filter((c) => getComputedStyle(c).opacity === '1').length));
      must(frames[0] === 10 && frames[1] === 3, `8 + 5: the first frame full, 3 in the second (${frames})`);
      const counts = (await fx(p)).slice(m).filter((e) => e.type === 'count').map((e) => e.pitch);
      must(counts.length >= 13, 'every counter counted, with its note');
      await p.screenshot({ path: `${SHOTS}/p7-lesson-doubleframe-football-dark.png` });
      await layoutOk(p, 'lesson: double ten frame');
      step('lesson (making ten): 8 counters, 2 more complete the frame with the chord, 3 go on – 10 and 3');
      await p.tap('[data-testid=lesson-home]');
      await p.waitForSelector('.home');
      // The clock: the hands turn, ticking.
      await p.tap('[data-lesson="clock"]');
      await p.waitForSelector('.lesson[data-kind=watch]');
      m = await mark(p);
      await p.waitForSelector('.manip.m-clock');
      const turning = await p.waitForFunction(() => document.getAnimations().some((a) => a.effect?.target?.classList?.contains('clock-hand')), null, { timeout: 15000 });
      must(!!turning, 'a hand turns');
      const ticks = await waitFx(p, m, 'tick', 3, 15000);
      must(ticks[2].pitch > ticks[0].pitch, 'the ticks climb as the hand goes round');
      await onlyTransformOpacity(p, 'clock');
      await p.screenshot({ path: `${SHOTS}/p7-lesson-clock-football-dark.png` });
      step('lesson (the clock): the short hand turns hour by hour, ticking higher and higher');
      await p.tap('[data-testid=lesson-home]');
      await p.waitForSelector('.home');
      await p.screenshot({ path: `${SHOTS}/p7-practice-17-football-dark.png`, fullPage: true });
      must((await p.$$('.skill-btn')).length === 32, 'free practice: 32 skills (phase 9)');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= The map: from chapter 1 to chapter 2 (fairies, light) =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'שירה', age: 7, gender: 'girl', world: 'fairies' });
      await p.evaluate(async () => {
        const ids = [...document.querySelectorAll('.map-node[data-node]')].map((e) => e.dataset.node);
        const d = await new Promise((r) => {
          const q = indexedDB.open('mathit');
          q.onsuccess = () => r(q.result);
        });
        const prof = await new Promise((r) => {
          const q = d.transaction('profiles').objectStore('profiles').getAll();
          q.onsuccess = () => r(q.result[0]);
        });
        const stars = {};
        for (const id of ids) if (id !== 'c1-chest') stars[id] = id.includes('lesson') ? 1 : 3;
        const rec = { profileId: prof.id, stars, chests: { 'c1-chest': '🌈' }, at: 'c1-boss', revealed: ids, last: 'c1-boss', updated: 1, reviewedAt: 0, reviews: 0, reviewRevealed: 0, placedAt: 0 };
        await new Promise((r) => {
          const t = d.transaction('questProgress', 'readwrite');
          t.objectStore('questProgress').put(rec, prof.id);
          t.oncomplete = r;
        });
        d.close();
      });
      const m = await mark(p);
      await reenter(p);
      must((await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')) === 'c1', 'the hero starts beside the boss of chapter 1');
      const walk = (await waitFx(p, m, 'walk'))[0];
      must(walk.hero === 'walk', 'the hero walks');
      await p.waitForTimeout(700);
      await onlyTransformOpacity(p, 'walking out of chapter 1');
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c2]', { timeout: 15000 });
      await p.screenshot({ path: `${SHOTS}/p7-map-into-c2-fairies.png` });
      const walks = await waitFx(p, m, 'walk', 2, 15000);
      must(walks.length === 2, 'out of one chapter, into the next: two walks');
      const unlock = (await waitFx(p, m, 'unlock', 1, 15000))[0];
      must(unlock.particles > 0 && unlock.sound === 'unlock', 'the first station of chapter 2 opens in a burst');
      await p.waitForFunction(() => document.querySelector('[data-testid=home-hero]')?.dataset.at === 'c2-add20-lesson' && document.querySelector('.quest-map')?.dataset.walking === 'no');
      must((await p.getAttribute('.map-node[data-node="c2-add20-lesson"]', 'data-status')) === 'open', 'chapter 2 open');
      must((await p.textContent('[data-testid=map-story]')).includes('יער הפיות'), 'the chapter 2 story sentence');
      must(!!(await p.$('.map-node[data-node="c2-boss"] .boss-tier-2')), 'the boss of chapter 2 is the stronger one');
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${SHOTS}/p7-map-c2-fairies.png`, fullPage: true });
      await layoutOk(p, 'map chapter 2');
      // The tabs: chapter 1 again, and back.
      await p.tap('[data-testid=chapter-tab-1]');
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c1]');
      must((await p.getAttribute('.map-node[data-node="c1-boss"]', 'data-status')) === 'done', 'chapter 1 done');
      await p.tap('[data-testid=chapter-tab-2]');
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c2]');
      // A station of chapter 2 in its game: the jump station.
      await p.tap('[data-testid=map-go]');
      await p.waitForSelector('.lesson');
      step('map: chapter 1 done → the hero walks out, the map turns to chapter 2, the hero walks in and the station opens; the boss is stronger; tabs');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Placement: knows everything to 20 → chapter 3 (stage, dark, reduced motion) =================
    {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
      await newProfile(p, { name: 'נגה', age: 7, gender: 'girl', world: 'stage', placement: true });
      const to20 = ['count.to10', 'compare.to10', 'add.within10', 'sub.within10', 'add.within20', 'sub.within20', 'add.bridge10', 'sub.bridge10'];
      await p.tap('[data-testid=placement-start]');
      let asked = 0;
      for (; asked < 12; asked++) {
        await p.waitForSelector('[data-testid=placement][data-phase=test] .pop, [data-testid=placement][data-phase=done]');
        if (await p.$('[data-testid=placement][data-phase=done]')) break;
        const skill = await p.getAttribute('[data-testid=placement]', 'data-skill');
        const right = await p.getAttribute('[data-testid=placement]', 'data-answer');
        if (!to20.includes(skill)) {
          const opts = await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer));
          await p.tap(`.bubble[data-answer="${opts.find((o) => o !== right)}"]`, { force: true });
          await p.waitForSelector('[data-testid=hint]');
        }
        await p.tap(`.bubble[data-answer="${right}"]`, { force: true });
        await p.waitForFunction((n) => !!document.querySelector('[data-testid=placement][data-phase=done]') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === n, asked + 1);
      }
      await p.waitForSelector('[data-testid=placement][data-phase=done]');
      must(asked <= 10, 'at most 10 questions: ' + asked);
      await p.screenshot({ path: `${SHOTS}/p7-placement-done-stage-dark.png` });
      await p.tap('[data-testid=placement-map]');
      await p.waitForSelector('.quest-map .map-node');
      await p.waitForTimeout(800);
      must((await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')) === 'c3', 'the map shows chapter 3');
      must((await p.getAttribute('.quest-map', 'data-current')) === 'c3-n100-lesson', 'placed at the start of chapter 3: ' + (await p.getAttribute('.quest-map', 'data-current')));
      await p.tap('[data-testid=chapter-tab-2]');
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c2]');
      must((await p.getAttribute('.map-node[data-node="c2-boss"]', 'data-status')) === 'done', "chapter 2's boss passed");
      await p.tap('[data-testid=chapter-tab-3]');
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c3]');
      await p.screenshot({ path: `${SHOTS}/p7-map-c3-stage-dark.png`, fullPage: true });
      step(`placement: a girl who knows everything to 20 answers ${asked} questions and lands at the start of chapter 3 (chapter 2's boss passed)`);

      // Reduced motion: a jump round – the hero fades across, the hint still animates (slower).
      await reenter(p, '?template=jump');
      await p.tap('[data-testid=open-practice]');
      await p.tap('[data-skill="sub.bridge10"]');
      await p.waitForSelector('.game[data-template=jump]');
      const right = await answerOf(p);
      const w = await wrongFor(p, 'jump', right, ['10']);
      await give(p, 'jump', w);
      await p.waitForSelector('[data-testid=hint-anim] .manip');
      await seeManipMoving(p, 'a hint with reduced motion');
      const endless = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);
      must(endless === 0, `reduced motion: ${endless} endless animations`);
      await onlyTransformOpacity(p, 'jump, reduced motion');
      await layoutOk(p, 'jump, reduced motion');
      await p.screenshot({ path: `${SHOTS}/p7-jump-reduced-stage-dark.png` });
      step('reduced motion: the teaching animation in the hint still plays (calmer), nothing loops forever');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    console.log('\nphase 7 e2e passed');
  } catch (e) {
    console.log('✗', e.message);
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
