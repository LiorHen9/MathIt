const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
// Usage: node tests/e2e/phase9.cjs <screenshots-dir> [url]
// Phase 9 – grades 3–6 and puzzles, at phone size (360px):
// - the three new games (Slice, Pattern, Speed) each play a whole round: a right answer, a wrong
//   one with the animated hint of the right kind, two wrong ones with the explanation, stars, and
//   every answer saved for the mastery engine; Speed shows its gentle clock and "⚡";
// - lessons: times as an array that grows row by row and turns (3 × 4 = 4 × 3), a pizza cut slice
//   by slice (the knife sound); a column sum with a carried ten flying to the next column;
// - every kind of puzzle (magic square, balance, missing number, KenKen) played to the end – a
//   slip, a hint, solved with the world's burst – and its stars saved for the station;
// - the map: chapter 5 finished → the hero walks into chapter 6, its story, the stronger boss;
// - the placement game for a fourth-grader who knows the times table and columns → fractions;
// - a parent turns the speed game off and its station plays Pop; the dashboard says a new kind
//   of mistake in parents' words, and counts puzzles;
// - reduced motion (teaching animations stay, slower), transform/opacity only, touch targets
//   ≥ 48px, no sideways scroll; screenshots in light and dark in three worlds.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';
// ONLY=games,lessons,puzzles,placement,parents runs some of the sections (for debugging).
const run = (name) => !process.env.ONLY || process.env.ONLY.split(',').includes(name);

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// The journey's stations in order, read from the chapter files (ids and kinds), for seeding progress.
const NODES = ['chapter1.ts', 'chapters.ts', 'chapters6.ts'].flatMap((f) => {
  const src = fs.readFileSync(path.join(__dirname, '../../src/core/quest', f), 'utf8');
  return [...src.matchAll(/id: '([^']+)',\s*kind: '(\w+)'/g)].map((m) => ({ id: m[1], kind: m[2] }));
});

/** The page in use (a screenshot when something fails). */
let last = null;

async function phone(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...opts });
  const p = await ctx.newPage();
  last = p;
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
  const small = await p.$$eval('button, input[type=range], [role=button]', (els) =>
    els
      .filter((e) => (e.offsetParent || e instanceof SVGElement) && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.pt-tile.is-placed'))
      .map((e) => [e.getAttribute('aria-label') || e.textContent.trim().slice(0, 20), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)])
      .filter(([, w, h]) => w > 0 && (w < 48 || h < 48))
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

/** Run `f(db, getAll, put)` inside the page against the app's IndexedDB. */
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
      // eslint-disable-next-line no-new-func
      const out = await new Function('db', 'getAll', 'put', 'a', `return (${src})(db, getAll, put, a)`)(db, getAll, put, a);
      db.close();
      return out;
    },
    [body.toString(), arg]
  );
}

/** Progress where every station before `nodeId` is done (lessons 1 star, the rest 3, chests open). */
async function seedUpTo(p, nodeId) {
  const at = NODES.findIndex((n) => n.id === nodeId);
  must(at > 0, 'no station ' + nodeId);
  const before = NODES.slice(0, at);
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
      await put(db, 'questProgress', { profileId: prof.id, stars, chests, at: a.last, revealed: ids, last: a.last, updated: 1, reviewedAt: 0, reviews: 0, reviewRevealed: 0, placedAt: 0 }, prof.id);
    },
    { before, last: before.at(-1).id, next: nodeId }
  );
}

const states = (p) => idb(p, (db, getAll) => getAll(db, 'skillStates'));
const quest = (p) => idb(p, (db, getAll) => getAll(db, 'questProgress').then((x) => x[0]));

const nowDot = (p) => p.evaluate(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')));
const waitDot = (p, n) => p.waitForFunction((i) => !!document.querySelector('.celebrate') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === i, n);
const answerOf = (p) => p.getAttribute('.game', 'data-answer');
const templateOf = (p) => p.getAttribute('.game', 'data-template');
const keyOf = (p) => p.getAttribute('.game', 'data-key');

// ---------- Playing each template ----------

async function give(p, tpl, value) {
  if (tpl === 'slice') {
    const [n, d] = String(value).split('/').map(Number);
    if (Number(await p.getAttribute('.sl-board', 'data-slices')) > 1) await p.tap('[data-testid=slice-whole]');
    for (let k = 1; k < d; k++) await p.tap('[data-testid=slice-cut]');
    for (let k = 0; k < n; k++) await p.click(`[data-testid=slice-${k}]`);
    must((await p.textContent('[data-testid=slice-value]')).replace(/\s/g, '') === `${n}${d}`, `coloured ${value}`);
    await p.tap('[data-testid=slice-check]');
  } else if (tpl === 'pattern') {
    await p.waitForSelector(`.pt-tile[data-answer="${value}"]:not([disabled])`);
    await p.tap(`.pt-tile[data-answer="${value}"]`);
  } else if (await p.$('.pop .numpad')) {
    for (const d of String(value)) await p.tap(`.numpad-key[data-key="${d}"]`);
    await p.tap('.numpad-key[data-key=ok]');
  } else {
    await p.tap(`.bubble[data-answer="${value}"]`, { force: true });
  }
}

async function wrongFor(p, tpl, right, prefer = []) {
  const pick = (opts) => prefer.find((x) => opts.includes(x) && x !== right) ?? opts.find((o) => o !== right);
  if (tpl === 'pattern') return pick(await p.$$eval('.pt-tile:not([disabled])', (els) => els.map((e) => e.dataset.answer)));
  if (tpl === 'slice') return prefer.find((x) => x !== right);
  if (!(await p.$('.pop .numpad'))) return pick(await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer)));
  return prefer.find((x) => x !== right) ?? String(Number(right) + 1);
}

/** A whole round: question 1 wrong once (the hint), question 2 wrong twice (the explanation), the rest right. */
async function playRound(p, { tpl, wrong1, hintKind, wrong2 }, shot) {
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
    const key = await keyOf(p);
    if (idx === 0) {
      const w = await wrongFor(p, t, right, wrong1(right, key));
      const m = await mark(p);
      await give(p, t, w);
      await p.waitForSelector('[data-testid=hint-anim]');
      hint = { wrong: w, right, kind: await p.getAttribute('[data-testid=hint-anim]', 'data-kind'), sound: (await waitFx(p, m, 'hint'))[0] };
      must(hint.kind === hintKind(w, right, key), `${tpl}: the hint for ${w} (answer ${right}, ${key}) should be ${hintKind(w, right, key)}, not ${hint.kind}`);
      await seeManipMoving(p, `${tpl} hint`);
      await onlyTransformOpacity(p, `${tpl} hint`);
      await p.screenshot({ path: `${SHOTS}/p9-${shot}-hint.png` });
      await layoutOk(p, `${tpl} with a hint`);
    }
    if (idx === 1) {
      const w2 = await wrongFor(p, t, right, wrong2(right, key));
      await give(p, t, w2);
      await p.waitForSelector('[data-testid=hint]');
      await p.waitForTimeout(400);
      await give(p, t, await wrongFor(p, t, right, wrong2(right, key).filter((x) => x !== w2)));
      await p.waitForSelector('[data-testid=explainer]');
      await seeManipMoving(p, `${tpl} explanation`);
      explained = true;
      await p.tap('[data-testid=skip-explain]');
      await p.tap('[data-testid=next]');
      await waitDot(p, idx + 1);
      continue;
    }
    if (idx === 2) await p.screenshot({ path: `${SHOTS}/p9-${shot}-question.png` });
    const m = await mark(p);
    await give(p, t, right);
    await waitFx(p, m, 'correct');
    await waitDot(p, idx + 1);
  }
  await p.waitForSelector('.celebrate');
  return { hint, explained, stars: Number(await p.getAttribute('.celebrate', 'data-stars')) };
}

const mulParts = (key) => key.split('x').map(Number);

/** Solve the puzzle on screen, with one slip and one hint on the way. Returns the fx log of it. */
async function solvePuzzle(p, kind) {
  await p.waitForSelector(`[data-testid=puzzle][data-puzzle=${kind}] .puzzle-${kind}`);
  await p.waitForSelector('[data-testid=puzzle-task]');
  const m = await mark(p);
  if (kind === 'magic') {
    const sol = JSON.parse(await p.getAttribute('.puzzle-magic', 'data-solution'));
    const holes = await p.$$eval('.mg-cell.is-hole', (els) => els.map((e) => Number(e.dataset.cell)));
    const tiles = await p.$$eval('.mg-tile', (els) => els.map((e) => ({ k: Number(e.dataset.tile), v: Number(e.dataset.value) })));
    // A slip: the first two numbers swapped.
    const order = holes.map((h) => tiles.find((t) => t.v === sol[h]).k);
    [order[0], order[1]] = [order[1], order[0]];
    for (const [i, h] of holes.entries()) {
      await p.tap(`[data-testid=magic-tile-${order[i]}]`);
      await p.tap(`[data-testid=magic-cell-${h}]`);
    }
    await waitFx(p, m, 'wrong');
    must((await p.$$('.mg-sum.is-bad')).length > 0, 'the wrong lines are marked');
    await p.screenshot({ path: `${SHOTS}/p9-puzzle-magic-slip.png` });
    // Take them all back, then a hint, then the rest.
    for (const h of holes) await p.tap(`[data-testid=magic-cell-${h}]`);
    await p.tap('[data-testid=puzzle-hint]');
    await p.waitForSelector('.mg-cell.is-locked');
    for (const h of holes) {
      if (await p.$(`[data-testid=magic-cell-${h}].is-locked`)) continue;
      const k = tiles.find((t) => t.v === sol[h]).k;
      await p.tap(`[data-testid=magic-tile-${k}]`);
      await p.tap(`[data-testid=magic-cell-${h}]`);
    }
  } else if (kind === 'balance') {
    const sol = await p.getAttribute('.puzzle-balance', 'data-solution');
    const tries = await p.$$eval('.bl-try', (els) => els.map((e) => e.dataset.value));
    await p.tap(`[data-testid=balance-try-${tries.find((x) => x !== sol)}]`);
    await waitFx(p, m, 'wrong');
    await p.tap('[data-testid=puzzle-hint]');
    await p.waitForSelector('.bl-sum');
    await p.screenshot({ path: `${SHOTS}/p9-puzzle-balance-hint.png` });
    await p.waitForSelector(`[data-testid=balance-try-${sol}]:not([disabled])`);
    await p.tap(`[data-testid=balance-try-${sol}]`);
  } else if (kind === 'missing') {
    const sol = await p.getAttribute('.puzzle-missing', 'data-solution');
    for (const d of String(Number(sol) + 1)) await p.tap(`.numpad-key[data-key="${d}"]`);
    await p.tap('.numpad-key[data-key=ok]');
    await waitFx(p, m, 'wrong');
    await p.tap('[data-testid=puzzle-hint]');
    await waitFx(p, m, 'hint');
    for (const d of sol) await p.tap(`.numpad-key[data-key="${d}"]`);
    await p.tap('.numpad-key[data-key=ok]');
  } else {
    const sol = JSON.parse(await p.getAttribute('.puzzle-kenken', 'data-solution'));
    await p.tap('[data-testid=puzzle-hint]');
    await p.waitForTimeout(200);
    const fixed = await p.$$eval('.kk-cell.is-fixed', (els) => els.map((e) => Number(e.dataset.cell)));
    const free = sol.map((_, i) => i).filter((i) => !fixed.includes(i));
    // A slip: two cells of the last free ones swapped, if they differ.
    for (const i of free) {
      await p.tap(`[data-testid=kenken-cell-${i}]`);
      await p.tap(`[data-testid=kenken-key-${sol[i]}]`);
    }
  }
  const solved = (await waitFx(p, m, 'puzzleSolved', 1, 20000))[0];
  await p.waitForSelector('[data-testid=puzzle-end]');
  return { solved, log: (await fx(p)).slice(m), stars: Number(await p.getAttribute('[data-testid=puzzle-end]', 'data-stars')) };
}

/** Into the parents' area with the sum. */
async function enterParents(p) {
  await p.tap('[data-testid=open-parents]');
  await p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
  const q = await p.textContent('.parent-q');
  const [a, b] = q.split('×').map((x) => Number(x.trim()));
  await p.fill('.parent-check input', String(a * b));
  await p.tap('.parent-check button[type=submit]');
  await p.waitForSelector('[data-testid=parent-home]');
}

async function toPicker(p) {
  await p.goto(URL);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-pick');
}

/** Open a station of the map (its chapter's tab first). */
async function openStation(p, id) {
  const ch = id.split('-')[0];
  if ((await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')) !== ch) {
    await p.tap(`[data-testid=chapter-tab-${ch.slice(1)}]`);
    await p.waitForSelector(`[data-testid=map-chapter][data-chapter=${ch}]`);
  }
  await p.waitForFunction(() => document.querySelector('.quest-map')?.dataset.walking !== 'yes');
  await p.tap(`.map-node[data-node="${id}"]`);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    // ================= The three new games (football, light) =================
    if (run('games')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'מאיה', age: 10, gender: 'girl', world: 'football' });
      must((await p.$$('[data-testid=chapter-tabs] button')).length === 10, 'ten chapter tabs');
      const games = [
        // Slice: one slice too few → the pizza; the explanation cuts and colours.
        { tpl: 'slice', skill: 'frac.part', wrong1: (r) => [`${Number(r.split('/')[0]) + 1}/${r.split('/')[1]}`, `1/${Number(r.split('/')[1]) + 1}`], hintKind: () => 'pizza', wrong2: (r) => [`${r.split('/')[1]}/${Number(r.split('/')[1]) + 1}`, `1/${Number(r.split('/')[1]) + 2}`] },
        // Pattern on the times table: a + b (added instead) → the array; a neighbour → hops of b.
        {
          tpl: 'pattern',
          skill: 'mul.table',
          wrong1: (r, key) => [String(mulParts(key)[0] + mulParts(key)[1])],
          hintKind: (w, r, key) => (Number(w) === mulParts(key)[0] + mulParts(key)[1] ? 'array' : 'line'),
          wrong2: (r) => [String(Number(r) + 1), String(Number(r) - 1)]
        },
        // Speed: the same, against the gentle clock.
        {
          tpl: 'speed',
          skill: 'mul.table',
          wrong1: (r, key) => [String(mulParts(key)[0] + mulParts(key)[1])],
          hintKind: (w, r, key) => (Number(w) === mulParts(key)[0] + mulParts(key)[1] ? 'array' : 'line'),
          wrong2: (r) => [String(Number(r) + 1), String(Number(r) - 1)]
        }
      ];
      for (const g of games) {
        await reenter(p, `?template=${g.tpl}`);
        await p.tap('[data-testid=open-practice]');
        await p.tap(`[data-skill="${g.skill}"]`);
        await p.waitForSelector(`.game[data-template=${g.tpl}]`);
        await p.waitForTimeout(500);
        await layoutOk(p, `${g.tpl} round`);
        if (g.tpl === 'speed') {
          must(!!(await p.$('.sp-bar')) && !!(await p.$('.speed.skin-speed-stopwatch')), "the speed game's clock, in football's dress");
          await onlyTransformOpacity(p, 'speed clock');
        }
        if (g.tpl === 'slice') must(!!(await p.$('.sl-board.skin-slice-orange')), "the pizza in football's dress");
        const before = (await states(p)).find((s) => s.skillId === g.skill)?.attempts ?? 0;
        const r = await playRound(p, g, `${g.tpl}-football`);
        await p.waitForTimeout(600);
        const after = (await states(p)).find((s) => s.skillId === g.skill);
        must(after && after.attempts - before >= 8, `${g.tpl}: every answer saved (${after?.attempts - before})`);
        must(r.explained && r.stars >= 1, `${g.tpl}: explanation and stars (${r.stars})`);
        await p.screenshot({ path: `${SHOTS}/p9-${g.tpl}-end.png` });
        const log = await fx(p);
        if (g.tpl === 'slice') must(log.some((e) => e.type === 'slice' && e.sound === 'slice'), 'cutting the pizza sounds the knife');
        step(`${g.tpl} (${g.skill}): a whole round – wrong ${r.hint.wrong} → a ${r.hint.kind} hint, two wrong → the explanation, ${r.stars} stars, ${after.attempts - before} answers saved (${Object.keys(after.errorCounts).join(', ')})`);
      }
      // Speed: a quick right answer earns the ⚡, and nothing is lost when the clock runs out.
      await reenter(p, '?template=speed');
      await p.tap('[data-testid=open-practice]');
      await p.tap('[data-skill="mul.table"]');
      await p.waitForSelector('.game[data-template=speed]');
      await give(p, 'speed', await answerOf(p));
      await p.waitForFunction(() => document.querySelector('[data-testid=speed-note]')?.textContent.includes('⚡'));
      await p.waitForSelector('.game[data-template=speed] .round-dot.is-first');
      await p.waitForFunction(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === 1);
      await p.waitForSelector('.speed[data-out=yes]', { timeout: 12000 });
      must((await p.textContent('[data-testid=speed-note]')).includes('בלי לחץ'), 'the clock runs out gently');
      await give(p, 'speed', await answerOf(p));
      await p.waitForFunction(() => document.querySelectorAll('.round-dot.is-first').length === 2);
      await p.screenshot({ path: `${SHOTS}/p9-speed-out.png` });
      step('speed: a quick answer earns ⚡; when the clock runs out it only says "no hurry", and the answer still counts first-time');

      // A column sum with a carry: written one under the other; a wrong answer → the column hint, the ten flies on.
      await reenter(p, '?template=pop');
      await p.tap('[data-testid=open-practice]');
      await p.tap('[data-skill="col.add"]');
      await p.waitForSelector('.game[data-skill="col.add"]');
      must((await p.getAttribute('[data-testid=prompt-math]', 'data-column')) === 'yes', 'the exercise is written in columns');
      await p.screenshot({ path: `${SHOTS}/p9-column-question.png` });
      let m = await mark(p);
      const right = await answerOf(p);
      await give(p, await templateOf(p), await wrongFor(p, 'pop', right, []));
      await p.waitForSelector('[data-testid=hint-anim][data-kind=column]');
      await seeManipMoving(p, 'column hint');
      const carry = (await waitFx(p, m, 'carry', 1, 20000))[0];
      must(carry.sound === 'carry' && !carry.hero, 'the carried ten whistles (a teaching sound)');
      await onlyTransformOpacity(p, 'column hint');
      await p.screenshot({ path: `${SHOTS}/p9-column-carry.png` });
      step('columns: written one under the other, a wrong answer → the column animation and the carried ten flies on (its own sound)');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Lessons: the array, the pizza (fairies, dark) =================
    if (run('lessons')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'נועם', age: 9, gender: 'boy', world: 'fairies' });
      const lesson = async (skill) => {
        await p.tap('[data-testid=open-practice]');
        await p.tap(`[data-lesson="${skill}"]`);
        await p.waitForSelector('.lesson[data-kind=watch]');
      };
      await lesson('mul.table');
      let m = await mark(p);
      await p.waitForSelector('.manip.m-array');
      await seeManipMoving(p, 'the array');
      const counts = await waitFx(p, m, 'count', 3, 20000);
      must(counts[1].pitch > counts[0].pitch, 'every row a note higher');
      await p.screenshot({ path: `${SHOTS}/p9-lesson-array-fairies-dark.png` });
      // The second screen turns the array round.
      await p.waitForSelector('.manip.m-array[data-state=done]', { timeout: 20000 });
      await p.tap('[data-testid=lesson-next]');
      m = await mark(p);
      await p.waitForSelector('.manip.m-array .ar-swap');
      await waitFx(p, m, 'ten', 1, 25000);
      await p.waitForSelector('.manip.m-array[data-state=done]', { timeout: 20000 });
      const turned = await p.evaluate(() => getComputedStyle(document.querySelector('.manip.m-array .ar-turn')).transform);
      must(turned !== 'none', 'the array turned: ' + turned);
      await onlyTransformOpacity(p, 'the array');
      await layoutOk(p, 'lesson: the array');
      await p.screenshot({ path: `${SHOTS}/p9-lesson-array-turned.png` });
      step('lesson (times): the array grows row by row (each a note higher) and turns round – 3 × 4 = 4 × 3, with the chord');
      await p.tap('[data-testid=lesson-home]');
      await p.waitForSelector('.home');
      await p.tap('[data-testid=practice-back]');
      await p.waitForSelector('.quest-map');

      await lesson('frac.part');
      m = await mark(p);
      await p.waitForSelector('.manip.m-pizza');
      await seeManipMoving(p, 'the pizza');
      const cuts = await waitFx(p, m, 'slice', 3, 20000);
      must(cuts.every((c) => c.sound === 'slice') && cuts[2].pitch > cuts[0].pitch, 'a knife sound for every cut, climbing');
      await p.waitForSelector('.manip.m-pizza[data-state=done]', { timeout: 20000 });
      await onlyTransformOpacity(p, 'the pizza');
      await p.screenshot({ path: `${SHOTS}/p9-lesson-pizza-fairies-dark.png` });
      step('lesson (fractions): the pizza is cut slice by slice (the knife sound, climbing) and a slice coloured');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Puzzles and the map (ninja, light) =================
    if (run('puzzles')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'אורי', age: 10, gender: 'boy', world: 'ninja' });
      // Chapter 5 done: the hero walks into chapter 6.
      await seedUpTo(p, 'c6-mul-lesson');
      let m = await mark(p);
      await reenter(p);
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c6]', { timeout: 20000 });
      await waitFx(p, m, 'unlock', 1, 20000);
      await p.waitForFunction(() => document.querySelector('.quest-map')?.dataset.walking === 'no');
      must((await p.getAttribute('.map-node[data-node="c6-mul-lesson"]', 'data-status')) === 'open', 'chapter 6 open');
      must((await p.textContent('[data-testid=map-story]')).includes('לוח הכפל'), 'the chapter 6 story: ' + (await p.textContent('[data-testid=map-story]')));
      must(!!(await p.$('.map-node[data-node="c6-boss"] .boss-tier-6')), 'the boss of chapter 6 is stronger still');
      must(!!(await p.$('.map-node[data-node="c6-magic"][data-kind=puzzle]')), 'a puzzle station on the map');
      await p.waitForTimeout(500);
      await onlyTransformOpacity(p, 'map into chapter 6');
      await layoutOk(p, 'map chapter 6');
      await p.screenshot({ path: `${SHOTS}/p9-map-c6-ninja.png`, fullPage: true });
      step('map: chapter 5 done → into chapter 6 (its story, a puzzle station, the boss stronger)');

      for (const [id, kind] of [
        ['c6-magic', 'magic'],
        ['c7-balance', 'balance'],
        ['c6-missing', 'missing'],
        ['c7-kenken', 'kenken']
      ]) {
        await seedUpTo(p, id);
        await reenter(p, '?puzzleSeed=7');
        await openStation(p, id);
        await p.waitForSelector(`[data-testid=puzzle][data-puzzle=${kind}]`);
        await p.waitForTimeout(300);
        await layoutOk(p, `${kind} puzzle`);
        await p.screenshot({ path: `${SHOTS}/p9-puzzle-${kind}.png` });
        const r = await solvePuzzle(p, kind);
        must(r.solved.word && r.solved.hero === 'cheer' && r.solved.particles > 0, `${kind}: the world's burst ${JSON.stringify(r.solved)}`);
        await p.screenshot({ path: `${SHOTS}/p9-puzzle-${kind}-solved.png` });
        await onlyTransformOpacity(p, `${kind} solved`);
        await p.waitForTimeout(400);
        const q = await quest(p);
        must(q.stars[id] === r.stars && r.stars >= 1, `${kind}: ${r.stars} stars saved (${q.stars[id]})`);
        await p.tap('[data-testid=puzzle-to-map]');
        await p.waitForSelector('.quest-map .map-node');
        step(`puzzle ${kind}: ${kind === 'kenken' ? 'a hint' : 'a slip and a hint'}, solved – "${r.solved.word}" – ${r.stars} stars saved for ${id}`);
      }
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Placement: a fourth-grader who knows times and columns → fractions (stage, dark, reduced motion) =================
    if (run('placement')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
      await newProfile(p, { name: 'שירה', age: 9, gender: 'girl', world: 'stage', placement: true });
      const knows = [
        'count.to10', 'compare.to10', 'add.within10', 'sub.within10', 'add.within20', 'sub.within20', 'add.bridge10', 'sub.bridge10', 'numbers.to100', 'place.value', 'pattern', 'money', 'clock',
        'add.within100', 'sub.within100', 'mul.table', 'div', 'mul.big', 'col.add', 'col.sub'
      ];
      await p.tap('[data-testid=placement-start]');
      let asked = 0;
      for (; asked < 12; asked++) {
        await p.waitForSelector('[data-testid=placement][data-phase=test] .pop, [data-testid=placement][data-phase=done]');
        if (await p.$('[data-testid=placement][data-phase=done]')) break;
        const skill = await p.getAttribute('[data-testid=placement]', 'data-skill');
        const right = await p.getAttribute('[data-testid=placement]', 'data-answer');
        if (!knows.includes(skill)) {
          const opts = await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer));
          await p.tap(`.bubble[data-answer="${opts.find((o) => o !== right)}"]`, { force: true });
          await p.waitForSelector('[data-testid=hint]');
        }
        await p.tap(`.bubble[data-answer="${right}"]`, { force: true });
        await p.waitForFunction((n) => !!document.querySelector('[data-testid=placement][data-phase=done]') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === n, asked + 1);
      }
      await p.waitForSelector('[data-testid=placement][data-phase=done]');
      must(asked <= 10, 'at most 10 questions: ' + asked);
      await p.screenshot({ path: `${SHOTS}/p9-placement-done-stage-dark.png` });
      await p.tap('[data-testid=placement-map]');
      await p.waitForSelector('.quest-map .map-node');
      await p.waitForTimeout(800);
      must((await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')) === 'c8', 'the map shows chapter 8: ' + (await p.getAttribute('[data-testid=map-chapter]', 'data-chapter')));
      must((await p.getAttribute('.quest-map', 'data-current')) === 'c8-part-lesson', 'placed at the start of the fractions: ' + (await p.getAttribute('.quest-map', 'data-current')));
      await p.screenshot({ path: `${SHOTS}/p9-map-c8-stage-dark.png`, fullPage: true });
      step(`placement: a fourth-grader who knows the times table and columns answers ${asked} questions and lands at the start of fractions (chapter 8)`);

      // Reduced motion: a pizza hint still animates, calmer; nothing loops forever.
      await reenter(p, '?template=pop');
      await p.tap('[data-testid=open-practice]');
      await p.tap('[data-skill="frac.add"]');
      await p.waitForSelector('.game[data-skill="frac.add"]');
      const right = await answerOf(p);
      await give(p, 'pop', await wrongFor(p, 'pop', right, []));
      await p.waitForSelector('[data-testid=hint-anim][data-kind=pizza] .manip');
      await seeManipMoving(p, 'a pizza hint with reduced motion');
      const endless = await p.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.getTiming().iterations === Infinity).length);
      must(endless === 0, `reduced motion: ${endless} endless animations`);
      await onlyTransformOpacity(p, 'pizza, reduced motion');
      await layoutOk(p, 'fractions, reduced motion');
      await p.screenshot({ path: `${SHOTS}/p9-pizza-reduced-stage-dark.png` });
      step('reduced motion: the pizza in the hint still plays (calmer), nothing loops forever; fractions drawn stacked');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    // ================= Parents: the speed game off, a new mistake in parents' words (blocks, light) =================
    if (run('parents')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'דניאל', age: 10, gender: 'boy', world: 'blocks' });
      // Two "added instead of multiplying" slips in a round of the times table.
      await reenter(p, '?template=pop');
      await p.tap('[data-testid=open-practice]');
      await p.tap('[data-skill="mul.table"]');
      for (let k = 0; k < 2; k++) {
        await p.waitForSelector('.game[data-skill="mul.table"]');
        await p.waitForFunction((n) => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === n, k);
        const [a, bb] = mulParts(await keyOf(p));
        const right = await answerOf(p);
        if (await p.$('.pop .numpad')) {
          for (const d of String(a + bb)) await p.tap(`.numpad-key[data-key="${d}"]`);
          await p.tap('.numpad-key[data-key=ok]');
        } else await p.tap(`.bubble[data-answer="${a + bb}"]`, { force: true });
        await p.waitForSelector('[data-testid=hint]');
        await give(p, 'pop', right);
        await waitDot(p, k + 1);
      }
      await p.waitForTimeout(500);
      const st = (await states(p)).find((s) => s.skillId === 'mul.table');
      must((st.errorCounts['times-as-plus'] ?? 0) >= 2, 'two "added instead" slips saved: ' + JSON.stringify(st.errorCounts));
      // A solved puzzle, for the dashboard to count.
      await seedUpTo(p, 'c6-mul-3s');
      await idb(p, async (db, getAll, put) => {
        const [q] = await getAll(db, 'questProgress');
        q.stars['c6-magic'] = 2;
        await put(db, 'questProgress', q, q.profileId);
      });
      await toPicker(p);
      await enterParents(p);
      await p.tap('[data-testid=parent-home] [data-kid]');
      await p.waitForSelector('[data-testid=parent-dash] [data-testid=dash-skills]');
      const hard = await p.$('[data-hard="mul.table"][data-tag=times-as-plus]');
      must(hard, 'the new mistake is listed');
      must((await hard.textContent()).includes('מחבר במקום לכפול'), "in parents' words, for a boy: " + (await hard.textContent()));
      must((await p.getAttribute('[data-testid=dash-puzzles]', 'data-solved')) === '1', 'puzzles counted on the journey');
      must(!!(await p.$('[data-testid=dash-skills] [data-skill="frac.add"]')), 'the new skills by chapter');
      await p.waitForTimeout(400);
      await layoutOk(p, 'dashboard');
      await p.screenshot({ path: `${SHOTS}/p9-dashboard-blocks.png`, fullPage: true });
      step("dashboard: the times-table slip in parents' words (boy), puzzles solved counted, the new skills by chapter");
      // The speed game off.
      await p.uncheck('[data-template-toggle=speed]', { force: true });
      await p.waitForTimeout(400);
      const prof = (await idb(p, (db, getAll) => getAll(db, 'profiles')))[0];
      must(prof.parent.blocked.includes('speed'), 'speed turned off: ' + JSON.stringify(prof.parent));
      await p.tap('[data-testid=parent-dash-back]');
      await p.tap('[data-testid=parent-exit]');
      await reenter(p);
      await openStation(p, 'c6-mul-3s');
      await p.waitForSelector('.game');
      must((await templateOf(p)) === 'pop', 'the speed station plays Pop when the game is off: ' + (await templateOf(p)));
      must(!(await p.$('.sp-bar')), 'no clock');
      await p.screenshot({ path: `${SHOTS}/p9-speed-off-pop.png` });
      step('a parent turns the speed game off: its station plays Pop, no clock');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
    }

    console.log('\nphase 9 e2e passed');
  } catch (e) {
    console.log('✗', e.message);
    await last?.screenshot({ path: `${SHOTS}/p9-FAILED.png` }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await b.close();
  }
})();
