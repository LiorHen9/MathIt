const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase3.cjs <screenshots-dir> [url]
// Phase 3 – teaching animations and lessons, at phone size (360px):
// - the manipulatives and lessons are not in the first load; home has a "lesson" button per skill;
// - a full addition lesson (fairies, light): animated explanations read in step with the
//   animation (explain/explained, count and jump notes rising), "your turn" with a wrong answer →
//   an animated hint that replays, the end star, lessonSeen saved, then straight to practice;
// - in an addition round: a mistake → a hint chosen for the mistake (one off → the number line),
//   animating on manipulative elements with teaching sounds; two mistakes → the step-by-step
//   explanation to the answer, then "next";
// - dark + reduced motion (stage): teaching animations still run (getAnimations), slower than
//   with normal motion, nothing endless, no particles; feedback stays short; skipping works;
// - ninja (light): the counting lesson's ten frame (a full ten = the chord) and comparing in pairs;
// - transform/opacity only, touch targets ≥ 48px, no sideways scroll; screenshots.
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
const lastFx = async (p, type) => (await fx(p)).filter((e) => !type || e.type === type).at(-1);
/** A mark in the logs, to read what came after it. */
const mark = async (p) => ({ fx: (await fx(p)).length, sounds: (await sounds(p)).length });
const fxSince = async (p, m) => (await fx(p)).slice(m.fx);
const soundsSince = async (p, m) => (await sounds(p)).slice(m.sounds);

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

/** Running animations on teaching elements (inside .manip). */
const manipAnims = (p) =>
  p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.manip')).length);
/** Wait until a teaching animation is running (polls). */
async function seeManipMoving(p, where) {
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    if ((await manipAnims(p)) > 0) return;
    await p.waitForTimeout(60);
  }
  throw new Error(`${where}: no teaching animation running`);
}
const endless = (p) => p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);

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
async function wrongValue(p, right, prefer = []) {
  if (await isNumpad(p)) return right === '9' ? '8' : String(Number(right) + 1);
  const options = await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer));
  return prefer.find((x) => options.includes(x)) ?? options.find((o) => o !== right);
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
  // Phase 4: the map first; the skills are in free practice.
  await p.waitForSelector('.quest-map');
  await p.tap('[data-testid=open-practice]');
  await p.waitForSelector('.home .skill-btn');
}

async function stored(p) {
  return p.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('mathit');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['meta', 'skillStates'], 'readonly');
          const states = tx.objectStore('skillStates').getAll();
          const v = tx.objectStore('meta').get('schemaVersion');
          tx.oncomplete = () => {
            resolve({ v: v.result, states: states.result });
            db.close();
          };
        };
      })
  );
}

/** A lesson's "watch" screen, played to the end; returns how long the explanation took (ms). */
async function watch(p, where, shot) {
  await p.waitForSelector('.lesson[data-kind=watch] [data-testid=explainer]');
  await seeManipMoving(p, where);
  await onlyTransformOpacity(p, where);
  if (shot) {
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SHOTS}/${shot}.png` });
    await layoutOk(p, where);
  }
  await p.waitForSelector('[data-testid=explainer].is-done');
  const ms = Number(await p.getAttribute('[data-testid=explainer]', 'data-ms'));
  await p.waitForSelector('[data-testid=lesson-next]');
  return ms;
}

(async () => {
  const b = await chromium.launch();
  let normalMs = 0;

  // ================= Light, normal motion: נועה, 6, fairies =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
    await p.goto(URL);
    await p.waitForSelector('.splash');
    const mainSrc = await p.$eval('script[type=module][src]', (s) => s.src);
    const mainJs = await p.evaluate(async (u) => (await fetch(u)).text(), mainSrc);
    must(!mainJs.includes('m-marker') && !mainJs.includes('סופרים מהגדול') && !mainJs.includes('explain-dots'), 'teaching animations or lessons are in the main script');
    step(`manipulatives and lessons are separate chunks (main script ${(mainJs.length / 1024).toFixed(1)}KB)`);

    await newProfile(p, { name: 'נועה', age: 6, gender: 'girl', world: 'fairies' });
    const lessonBtns = await p.$$eval('.lesson-btn', (els) => els.map((e) => e.dataset.lesson));
    // Phase 7: a lesson for every skill (17).
    must(lessonBtns.slice(0, 5).join() === 'count.to10,compare.to10,add.within10,sub.within10,story.within10' && lessonBtns.length === 32, 'lesson buttons: ' + lessonBtns);
    await layoutOk(p, 'home');
    await p.screenshot({ path: `${SHOTS}/60-home-lessons.png`, fullPage: true });
    step('home: a "lesson" button beside practice for each of the four skills');

    // --- The addition lesson, all five screens ---
    let m = await mark(p);
    await p.tap('[data-lesson="add.within10"]');
    await p.waitForSelector('.lesson');
    must((await p.$$('.lesson .round-dot')).length === 5, 'the addition lesson has 5 screens');
    normalMs = await watch(p, 'lesson 1 (combine)', '61-lesson-combine');
    let ev = await fxSince(p, m);
    must(ev.filter((e) => e.type === 'explain').map((e) => e.detail.step).join() === '1,2', 'explain steps: ' + ev.map((e) => e.type));
    must(ev.at(-1).type === 'explained' && ev.at(-1).hero === 'happy', 'the explanation should end with a happy hero');
    must(ev.find((e) => e.type === 'explain').hero === 'think', 'the hero should think while explaining');
    const counts = ev.filter((e) => e.type === 'count');
    must(counts.length >= 2 && counts.every((c, i) => i === 0 || c.pitch > counts[i - 1].pitch), 'counting notes should rise: ' + counts.map((c) => c.pitch));
    must((await soundsSince(p, m)).includes('count'), 'no counting sound');
    // The next step waited for the animation: "explain 2" came after the last count of step 1.
    const i2 = ev.findIndex((e) => e.type === 'explain' && e.detail.step === 2);
    must(i2 > ev.findIndex((e) => e.type === 'count' && e.detail.n === 3), 'step 2 started before the animation of step 1 ended');
    must((await p.textContent('.explain-math')).replace(/\s/g, '') === '2+1=3', 'the last step shows 2 + 1 = 3');
    await p.screenshot({ path: `${SHOTS}/62-lesson-combine-done.png` });
    step(`lesson screen 1: two groups combine and are counted (rising notes), the hero thinks then is happy; steps wait for the animation (${normalMs}ms)`);

    // Replay.
    await p.tap('[data-testid=lesson-replay]');
    await seeManipMoving(p, 'replay');
    must(!(await p.$('[data-testid=lesson-next]')), '"next" should wait for the replay (or a skip)');
    await p.tap('[data-testid=lesson-skip]');
    await p.waitForSelector('[data-testid=lesson-next]');
    must((await p.$$('.manip.is-final')).length === 1, 'skip should show the end state');
    step('replay plays the explanation again; skip jumps to its end');

    await p.tap('[data-testid=lesson-next]');
    await watch(p, 'lesson 2 (counting on)', '63-lesson-count-on');
    await p.tap('[data-testid=lesson-next]');

    // Screen 3: your turn – wrong first, the hint animates and replays, then right.
    await p.waitForSelector('.lesson[data-kind=try] .bubble');
    must((await p.textContent('.lesson-turn')).includes('עכשיו תורך'), 'no "your turn"');
    let right = await solve(p);
    must(right === '5', 'the lesson asks 3 + 2, got answer ' + right);
    m = await mark(p);
    await answer(p, await wrongValue(p, right, ['1']));
    await p.waitForSelector('[data-testid=hint-anim] .manip');
    must((await p.getAttribute('[data-testid=hint-anim] .manip', 'data-kind')) === 'combine', '3 − 2 = 1 is "subtracted": the hint should put the groups together');
    await seeManipMoving(p, 'lesson hint');
    must((await lastFx(p, 'hint')).hero === 'think', 'hint: the hero thinks');
    await p.waitForSelector('[data-testid=hint-anim] .manip[data-state=done]');
    await p.tap('[data-testid=hint-replay]');
    must((await p.getAttribute('[data-testid=hint-anim] .manip', 'data-state')) === 'playing', 'replay should play the hint again');
    await seeManipMoving(p, 'hint replay');
    await p.screenshot({ path: `${SHOTS}/64-lesson-hint.png` });
    await layoutOk(p, 'lesson hint');
    await answer(p, right);
    must((await lastFx(p, 'correct')).sound === 'correct', 'right answer in a lesson: full feedback');
    must((await p.getAttribute('[data-testid=hint-anim] .manip', 'class')).includes('is-final'), 'answering should stop the hint at its end');
    step('your turn: a wrong answer → an animated hint for that mistake (combine), replayable; right → full feedback, the hint stops');

    // Screen 4: the number line, hop notes rising 6, 7, 8.
    m = await mark(p);
    await p.waitForSelector('.lesson[data-part="4"]');
    await watch(p, 'lesson 4 (number line)', '65-lesson-numberline');
    const jumps = (await fxSince(p, m)).filter((e) => e.type === 'jump');
    must(jumps.map((e) => e.detail.n).join() === '6,7,8', 'hops 5 → 8: ' + jumps.map((e) => e.detail.n));
    must(jumps[0].pitch < jumps[1].pitch && jumps[1].pitch < jumps[2].pitch, 'hop notes should rise');
    must((await soundsSince(p, m)).filter((s) => s === 'jump').length === 3, 'a sound per hop');
    must((await p.$eval('.m-line', (e) => getComputedStyle(e).direction)) === 'ltr', 'the number line is not left to right');
    const xs = await p.$$eval('.m-tick', (els) => els.map((e) => e.getBoundingClientRect().left));
    must(xs.every((x, i) => i === 0 || x > xs[i - 1]), 'the number line should rise left to right');
    step('lesson screen 4: the marker hops 5 → 8 on a left-to-right line, a rising note per hop');
    await p.tap('[data-testid=lesson-next]');

    // Screen 5: right away.
    await p.waitForSelector('.lesson[data-part="5"] .bubble');
    await answer(p, await solve(p));
    await p.waitForSelector('[data-testid=lesson-done]');
    await p.waitForFunction(() => window.__mathitFx.some((x) => x.type === 'roundDone'));
    must((await lastFx(p, 'starEarned')).detail.n === 1, 'a star for the lesson');
    must((await lastFx(p, 'roundDone')).sound === 'fanfare', 'a fanfare at the end of the lesson');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/66-lesson-done.png` });
    await layoutOk(p, 'lesson done');
    let db = await stored(p);
    let st = db.states.find((x) => x.skillId === 'add.within10');
    must(db.v === 6, 'schema: ' + db.v);
    must(st && st.lessonSeen === true && st.rounds === 0 && st.level === 1, 'lesson saved: ' + JSON.stringify(st));
    step('end of the lesson: a star and a fanfare; saved as seen (no round, level 1)');

    // Straight to practice.
    await p.tap('[data-testid=lesson-practice]');
    await p.waitForSelector('.game .pop');
    must((await p.getAttribute('.game', 'data-skill')) === 'add.within10', 'practice should be addition');

    // --- A round: one off → the number line hint ---
    right = await solve(p);
    const off = [String(Number(right) - 1), String(Number(right) + 1)];
    m = await mark(p);
    const w1 = await wrongValue(p, right, off);
    await answer(p, w1);
    await p.waitForSelector('[data-testid=hint-anim] .manip');
    const kind = await p.getAttribute('[data-testid=hint-anim] .manip', 'data-kind');
    if (off.includes(w1)) must(kind === 'jump', `a one-off mistake (${w1} for ${right}) should get the number line, got ${kind}`);
    await seeManipMoving(p, 'round hint');
    await onlyTransformOpacity(p, 'round hint');
    await p.waitForFunction((n) => window.__mathitSounds.slice(n).some((x) => x === 'jump' || x === 'count'), m.sounds, { timeout: 8000 });
    const hs = await soundsSince(p, m);
    must(hs.includes('wrong') && hs.includes('hint') && (hs.includes('jump') || hs.includes('count')), 'hint sounds: ' + hs);
    await p.screenshot({ path: `${SHOTS}/67-round-hint.png` });
    await layoutOk(p, 'round hint');
    step(`round, first mistake (${w1} for ${right}): animated ${kind} hint with teaching sounds`);

    // Second mistake → step by step to the answer.
    m = await mark(p);
    await answer(p, await wrongValue(p, right));
    await p.waitForSelector('.game [data-testid=explainer]');
    must(!(await p.$('.game .bubble')), 'no answers to pick during the explanation');
    must(await p.$('[data-testid=skip-explain]'), 'no skip during the explanation');
    must(!(await p.$('[data-testid=next]')), '"next" before the explanation is over');
    must((await p.textContent('[data-testid=slot]')).trim() === '?', 'the answer should wait for the explanation');
    await seeManipMoving(p, 'round explanation');
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${SHOTS}/68-round-explain.png` });
    await layoutOk(p, 'round explanation');
    await p.waitForSelector('[data-testid=next]');
    ev = await fxSince(p, m);
    const steps = Number(await p.getAttribute('[data-testid=explainer]', 'data-steps'));
    must(ev.filter((e) => e.type === 'explain').map((e) => e.detail.step).join() === Array.from({ length: steps }, (_, i) => i + 1).join(), 'explanation steps: ' + ev.filter((e) => e.type === 'explain').map((e) => e.detail.step));
    must(ev.some((e) => e.type === 'jump') && ev.some((e) => e.type === 'count'), 'the explanation should combine and hop');
    must((await p.textContent('[data-testid=slot]')).trim() === right, 'the answer is not shown after the explanation');
    must((await p.textContent('.explain-math')).includes(`= ${right}`), 'the last step should show the exercise solved');
    must((await p.textContent('.speech-bubble .feedback')).includes(right), 'the hero should say the answer');
    await p.screenshot({ path: `${SHOTS}/69-round-explained.png` });
    await p.tap('[data-testid=next]');
    await p.waitForFunction(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === 1);
    must(await p.$('.round-dot:nth-child(1).is-shown'), 'question 1 should count as shown');
    step(`round, second mistake: ${steps} animated steps (combine, then hops) to the answer, then "next"`);

    await p.tap('[data-testid=game-home]');
    await p.waitForSelector('.home');
    await p.waitForSelector('[data-lesson="add.within10"].is-seen');
    step('home marks the watched lesson ✓');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= Dark, reduced motion: אורי, 7, stage =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
    await newProfile(p, { name: 'אורי', age: 7, gender: 'boy', world: 'stage' });
    must((await p.getAttribute('html', 'data-motion')) === 'reduced', 'reduced motion not on');

    // The same first lesson screen: still animated, slower.
    await p.tap('[data-lesson="add.within10"]');
    const reducedMs = await watch(p, 'reduced: lesson 1', '70-lesson-reduced-dark');
    must(reducedMs > normalMs * 1.15, `reduced motion: the explanation should be slower (${reducedMs}ms vs ${normalMs}ms)`);
    must((await endless(p)) === 0, 'reduced motion: endless animations in a lesson');
    step(`dark + reduced motion: the lesson still animates, slower (${reducedMs}ms vs ${normalMs}ms), nothing endless`);
    await p.tap('[data-testid=lesson-home]');
    await p.waitForSelector('.home');

    // Subtraction lesson: the items fly away (whoosh), slowly.
    let m = await mark(p);
    await p.tap('[data-lesson="sub.within10"]');
    await p.waitForSelector('.manip[data-kind=takeAway]');
    await seeManipMoving(p, 'reduced: take away');
    await p.waitForFunction(() => window.__mathitSounds.includes('whoosh'), null, { timeout: 15000 });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/71-takeaway-reduced-dark.png` });
    await layoutOk(p, 'take away');
    await onlyTransformOpacity(p, 'take away');
    await p.waitForSelector('[data-testid=lesson-next]');
    must((await p.$$eval('.m-go', (els) => els.map((e) => getComputedStyle(e).opacity))).every((o) => Number(o) < 0.05), 'the taken ones should be gone');
    must((await soundsSince(p, m)).filter((s) => s === 'whoosh').length === 2, 'a whoosh for each of the two taken away');
    step('reduced: the subtraction lesson – two fly away (whoosh each), the rest are counted');
    await p.tap('[data-testid=lesson-home]');
    await p.waitForSelector('.home');

    // A round: feedback short, teaching animations long.
    await p.tap('[data-skill="sub.within10"]');
    await p.waitForSelector('.game .pop');
    const right = await solve(p);
    await answer(p, await wrongValue(p, right));
    const shortFeedback = await p.evaluate(() =>
      Math.max(0, ...document.getAnimations().filter((a) => !(a.effect.target && a.effect.target.closest && a.effect.target.closest('.manip'))).map((a) => Number(a.effect.getTiming().duration) || 0))
    );
    must(shortFeedback <= 250, `reduced motion: feedback animation of ${shortFeedback}ms`);
    await p.waitForSelector('[data-testid=hint-anim] .manip');
    await seeManipMoving(p, 'reduced: round hint');
    const longest = await p.evaluate(() =>
      Math.max(0, ...document.getAnimations().filter((a) => a.effect.target && a.effect.target.closest && a.effect.target.closest('.manip')).map((a) => Number(a.effect.getTiming().duration) || 0))
    );
    must(longest > 250, `reduced motion: teaching animations should stay slow (${longest}ms)`);
    await answer(p, await wrongValue(p, right));
    await p.waitForSelector('.game [data-testid=explainer]');
    await seeManipMoving(p, 'reduced: explanation');
    must(await p.evaluate(() => !document.querySelector('.fx-canvas') || document.querySelector('.fx-canvas').dataset.count === '0'), 'reduced motion: particles');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${SHOTS}/72-explain-reduced-dark.png` });
    await p.tap('[data-testid=skip-explain]');
    await p.waitForSelector('[data-testid=next]');
    must((await p.textContent('[data-testid=slot]')).trim() === right, 'skip should show the answer');
    must((await p.getAttribute('[data-testid=explainer]', 'data-step')) === (await p.getAttribute('[data-testid=explainer]', 'data-steps')), 'skip should jump to the last step');
    must((await manipAnims(p)) === 0, 'skipped: teaching animations still running');
    await p.screenshot({ path: `${SHOTS}/73-explain-skipped-dark.png` });
    await layoutOk(p, 'explanation skipped');
    step(`reduced: feedback ≤ 250ms (${shortFeedback}ms), hint animations slow (${longest}ms), explanation animates, skip → answer at once`);
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= Ninja (light): counting and comparing lessons =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
    await newProfile(p, { name: 'תום', age: 5, gender: 'boy', world: 'ninja' });
    let m = await mark(p);
    await p.tap('[data-lesson="count.to10"]');
    await watch(p, 'counting', null);
    const c = (await fxSince(p, m)).filter((e) => e.type === 'count').map((e) => e.detail.n);
    must(c.join() === '1,2,3', 'counting 1, 2, 3: ' + c);
    await p.tap('[data-testid=lesson-next]');
    await watch(p, 'ten frame (7)', '74-tenframe-ninja');
    must((await p.$$('.m-counter')).length === 7, 'seven counters in the frame');
    await p.tap('[data-testid=lesson-next]');
    await p.waitForSelector('.lesson[data-kind=try] .bubble');
    m = await mark(p);
    await answer(p, await solve(p));
    await p.waitForSelector('.lesson[data-part="4"]');
    await watch(p, 'full ten', null);
    must((await soundsSince(p, m)).includes('ten'), 'a full ten frame should ring the chord');
    must((await fxSince(p, m)).filter((e) => e.type === 'count').length === 10, 'ten counts');
    await p.screenshot({ path: `${SHOTS}/75-tenframe-full-ninja.png` });
    step('ninja: counting 1-2-3, a ten frame of 7, a full ten with the chord');
    await p.tap('[data-testid=lesson-home]');
    await p.waitForSelector('.home');

    m = await mark(p);
    await p.tap('[data-lesson="compare.to10"]');
    await p.waitForSelector('.manip[data-kind=compare]');
    await seeManipMoving(p, 'compare');
    await p.waitForSelector('[data-testid=lesson-next]');
    must((await fxSince(p, m)).filter((e) => e.type === 'count').length === 2, 'two pairs linked (4 vs 2)');
    must((await p.$$('.m-item.is-extra.is-hit')).length === 2, 'the two without a pair should stand out');
    await p.screenshot({ path: `${SHOTS}/76-compare-ninja.png` });
    await layoutOk(p, 'compare');
    step('ninja: comparing 4 and 2 – two pairs linked, two left over stand out');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  await b.close();
  console.log('\nphase 3 e2e passed');
})().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
