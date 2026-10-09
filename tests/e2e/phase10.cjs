const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const { checkScreen } = require('./a11y.cjs');
// Usage: node tests/e2e/phase10.cjs <screenshots-dir> [url]
// Phase 10 – polish and launch (1.0.0), at phone size (360px):
// - moving between screens: one short move (≤ 250ms, transform/opacity only) in the RTL direction
//   (deeper = from the left, back = from the right), never blocking a tap, a plain fade with reduced
//   motion, every screen starting at the top, and no blank screen while a slow chunk arrives (the old
//   screen stays, then a quiet placeholder);
// - achievements: opened in a real round and celebrated once (a badge, the world's `achievement`),
//   never again after a reload; "my achievements" (won with a date, progress for the rest, words by
//   gender); the run of first-try answers (10 in a row); in the parents' dashboard;
// - the end of a chapter after its boss (the hero, the boss running off, the world's sentence, the
//   chapter's summary; a tap skips) – only the first win; the end of the journey and its certificate
//   (saved as a picture, opened again from "my achievements");
// - About and privacy (from the settings and the parents' area), sharing the app, the share card
//   (og/twitter meta and the image);
// - an old phone: CPU ×4 and Slow 3G (first load) – times for the first load, the map, a round, a
//   lesson and a puzzle under the thresholds below; fewer particles on a weak phone; no animations
//   left behind after leaving screens; the map stays light;
// - reduced motion, ≥ 48px, no sideways scroll, contrast and names (a11y.cjs) on the new screens;
//   screenshots light and dark in three worlds.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';
// ONLY=moves,achievements,chapters,about,perf,looks runs some of the sections.
const run = (name) => !process.env.ONLY || process.env.ONLY.split(',').includes(name);

// The old-phone thresholds (docs/ROADMAP.md, phase 10): ms.
const PERF = { firstLoad: 2500, map: 2500, round: 2500, lesson: 2500, puzzle: 2500 };

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const NODES = ['chapter1.ts', 'chapters.ts', 'chapters6.ts'].flatMap((f) => {
  const src = fs.readFileSync(path.join(__dirname, '../../src/core/quest', f), 'utf8');
  return [...src.matchAll(/id: '([^']+)',\s*kind: '(\w+)'/g)].map((m) => ({ id: m[1], kind: m[2] }));
});
const worldSrc = (id) => fs.readFileSync(path.join(__dirname, `../../src/worlds/${id}/index.tsx`), 'utf8');
/** A world's chapter endings and finale, read from its file. */
function endings(id) {
  const src = worldSrc(id);
  const block = src.slice(src.indexOf('ends: ['), src.indexOf('finale:'));
  return { ends: [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]), finale: /finale: '([^']+)'/.exec(src)[1] };
}

let last = null;
async function phone(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, acceptDownloads: true, ...opts });
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

async function onlyTransformOpacity(p, where) {
  const props = await p.evaluate(() =>
    document.getAnimations().flatMap((a) =>
      a.effect && a.effect.getKeyframes ? a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))) : []
    )
  );
  const bad = [...new Set(props)].filter((x) => x !== 'transform' && x !== 'opacity');
  must(bad.length === 0, `${where}: animations change ${bad.join(',')}`);
}

async function newProfile(p, { name, gender, world, grade = 1, url = URL }) {
  await p.goto(url);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-editor');
  await p.fill('.profile-editor input[name=name]', name);
  await p.tap('.avatar-option >> nth=3');
  await p.tap('[data-stage-mode=grade]');
  await p.tap(`[data-grade="${grade}"]`);
  await p.tap(`[data-gender=${gender}]`);
  await p.tap(`[data-world-id=${world}]`);
  await p.tap('[data-testid=save-profile]');
  await p.waitForSelector('.quest-map .map-node');
}

async function reenter(p, url = URL) {
  await p.goto(url);
  await p.waitForSelector('.splash');
  await p.tap('.splash-go', { force: true });
  await p.waitForSelector('.profile-pick');
  await p.tap('.profile-pick >> nth=0');
  await p.waitForSelector('.quest-map .map-node');
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

/** Every station before `nodeId` done (lessons 1 star, the rest 3, chests open). */
async function seedUpTo(p, nodeId) {
  const before = NODES.slice(0, NODES.findIndex((n) => n.id === nodeId));
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
      await put(db, 'questProgress', { profileId: prof.id, stars, chests, at: a.last, revealed: [...ids, a.next], last: a.last, updated: 1, reviewedAt: 0, reviews: 0, reviewRevealed: 0, placedAt: 0 }, prof.id);
    },
    { before, last: before.at(-1).id, next: nodeId }
  );
}

const achRecord = (p) => idb(p, (db, getAll) => getAll(db, 'achievements').then((x) => x[0]));

async function give(p, value) {
  if (await p.$('.numpad')) {
    for (const d of String(value)) await p.tap(`.numpad-key[data-key="${d}"]`);
    await p.tap('.numpad-key[data-key=ok]');
  } else await p.tap(`.bubble[data-answer="${value}"]`, { force: true });
}

/** Watch the achievement badges that drop in (each one's id, in order). */
async function watchBadges(p) {
  await p.evaluate(() => {
    window.__badges = [];
    const live = document.querySelector('.ach-live');
    new MutationObserver(() => {
      const t = live.querySelector('[data-testid=achievement-toast]');
      if (t && window.__badges.at(-1) !== t.dataset.achievement) window.__badges.push(t.dataset.achievement);
    }).observe(live, { childList: true, subtree: true });
  });
}
const badges = (p) => p.evaluate(() => window.__badges.slice());

/** Answer the round on screen, all right the first time, to the end. */
async function playRight(p, max = 14) {
  for (let i = 0; i < max; i++) {
    await p.waitForSelector('.game[data-answer] .bubble:not([disabled]), .game[data-answer] .numpad, .celebrate');
    if (await p.$('.celebrate')) return;
    const key = await p.getAttribute('.game', 'data-key');
    await give(p, await p.getAttribute('.game', 'data-answer'));
    await p.waitForFunction((k) => !!document.querySelector('.celebrate') || document.querySelector('.game')?.dataset.key !== k, key, { timeout: 15000 });
  }
}

async function winBoss(p) {
  await p.tap('[data-testid=boss-start]');
  for (let i = 0; i < 30 && !(await p.$('.boss-won')); i++) {
    await p.waitForSelector('.boss-screen[data-answer] .bubble:not([disabled]), .boss-screen[data-answer] .numpad, .boss-won');
    if (await p.$('.boss-won')) break;
    const hp = await p.getAttribute('.boss-hp', 'data-hp');
    await give(p, await p.getAttribute('.boss-screen', 'data-answer'));
    await p.waitForFunction((h) => !!document.querySelector('.boss-won') || document.querySelector('.boss-hp')?.dataset.hp !== h, hp);
  }
  await p.waitForSelector('[data-testid=boss-to-map]', { timeout: 15000 });
}

/** A static server with gzip and cache headers (like GitHub Pages + the Service Worker's cache). */
function gzipServer(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(dir, u === '/' ? 'index.html' : u);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    const ext = path.extname(f);
    let body = fs.readFileSync(f);
    const headers = { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'max-age=3600' };
    if (['.html', '.js', '.css', '.svg', '.json'].includes(ext)) {
      body = zlib.gzipSync(body, { level: 9 });
      headers['content-encoding'] = 'gzip';
    }
    res.writeHead(200, headers);
    res.end(body);
  });
  return new Promise((r) => srv.listen(4175, () => r(srv)));
}

/** CPU ×4 and Slow 3G (400ms round trip, 400 kbit/s down) on a page. */
async function oldPhone(ctx, p, network = true) {
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (network) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  return cdp;
}

(async () => {
  const b = await chromium.launch();
  try {
    // ================= Moving between screens =================
    if (run('moves')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'נועה', gender: 'girl', world: 'fairies' });
      // Where the page was scrolled when each new screen first appeared (before it painted).
      await p.evaluate(() => {
        window.__entries = [];
        new MutationObserver(() => {
          const s = document.querySelector('.stage');
          if (s && window.__entries.at(-1)?.screen !== s.dataset.screen) window.__entries.push({ screen: s.dataset.screen, move: s.dataset.move, y: scrollY, t: performance.now() });
        }).observe(document.getElementById('app'), { childList: true, subtree: false });
      });
      const stageAnim = () =>
        p.evaluate(() => {
          const s = document.querySelector('.stage');
          const a = s.getAnimations()[0];
          return a ? { name: a.animationName, ms: a.effect.getTiming().duration, keys: a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))), move: s.dataset.move, fill: a.effect.getTiming().fill } : { name: null, move: s.dataset.move };
        });
      // Forward: the map → the collection comes in from the left.
      await p.tap('[data-testid=open-collection]');
      await p.waitForSelector('.stage[data-screen=collection]');
      const fwd = await stageAnim();
      must(fwd.name === 'stage-fwd' && fwd.move === 'fwd' && fwd.ms <= 250 && fwd.keys.every((k) => k === 'transform' || k === 'opacity') && ['auto', 'none'].includes(fwd.fill), 'forward move: ' + JSON.stringify(fwd));
      const from = await p.evaluate(() => getComputedStyle(document.querySelector('.stage')).transform);
      must(/matrix\(1, 0, 0, 1, -/.test(from) || from === 'none', 'forward starts left of its place (RTL): ' + from);
      // Not blocking: "back" works at once, mid-move.
      await p.tap('[data-testid=collection-back]');
      await p.waitForSelector('.stage[data-screen=map] .quest-map');
      const toMap = await stageAnim();
      must(toMap.name === 'stage-fade' && toMap.move === 'back', 'the map fades in (its dock is fixed): ' + JSON.stringify(toMap));
      await onlyTransformOpacity(p, 'moving');
      // Back from deeper: settings → About (forward) → settings (from the right).
      await p.tap('[data-testid=open-settings]');
      await p.waitForSelector('.settings-screen');
      await p.waitForTimeout(300);
      await p.tap('[data-testid=open-about]');
      await p.waitForSelector('[data-testid=about]');
      await p.waitForTimeout(300);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(100);
      must((await p.evaluate(() => scrollY)) > 200, 'About scrolls');
      await p.tap('[data-testid=about-back]');
      await p.waitForSelector('.settings-screen');
      const back = await stageAnim();
      must(back.name === 'stage-back' && back.move === 'back' && back.ms <= 250, 'back move: ' + JSON.stringify(back));
      const entries = await p.evaluate(() => window.__entries);
      const bad = entries.filter((e) => e.screen !== 'map' && e.y !== 0);
      must(bad.length === 0, 'every screen starts at the top, before it paints: ' + JSON.stringify(entries));
      // While the move runs, the page never scrolls sideways.
      await p.tap('.settings-screen .btn-back');
      await p.waitForSelector('.quest-map');
      await p.tap('[data-testid=open-achievements]');
      const side = [];
      for (let i = 0; i < 8; i++) {
        side.push(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
        await p.waitForTimeout(25);
      }
      must(side.every((x) => x <= 0), 'no sideways scroll during a move: ' + side);
      await p.waitForSelector('[data-testid=achievements]');
      await p.tap('[data-testid=achievements-back]');
      await p.waitForSelector('.quest-map');
      step(`moves: forward from the left (${fwd.ms}ms, transform+opacity, no fill), back from the right, the map fades; a tap mid-move works; every screen starts at the top; nothing sideways`);

      // A slow chunk: the old screen stays a moment, then a quiet placeholder – never a blank page.
      await p.route('**/chunk-*.js', async (r) => {
        await new Promise((x) => setTimeout(x, 1200));
        await r.continue();
      });
      await p.tap('[data-testid=open-practice]');
      const frames = [];
      const t0 = Date.now();
      while (Date.now() - t0 < 4000) {
        const f = await p.evaluate(() => {
          const s = document.querySelector('.stage');
          const main = s?.querySelector('main');
          return { screen: s?.dataset.screen, kids: main ? main.children.length : 0, ph: !!s?.querySelector('.ph'), home: !!s?.querySelector('.home') };
        });
        frames.push({ ...f, t: Date.now() - t0 });
        if (f.home) break;
        await p.waitForTimeout(40);
      }
      await p.unroute('**/chunk-*.js');
      await p.waitForSelector('.home');
      must(frames.every((f) => f.kids > 0), 'never a blank screen: ' + JSON.stringify(frames));
      must(frames.filter((f) => f.t < 180).every((f) => f.screen === 'map'), 'the map stays while the chunk loads: ' + JSON.stringify(frames.slice(0, 6)));
      must(frames.some((f) => f.ph), 'then the placeholder: ' + JSON.stringify(frames));
      step('a slow chunk (1.2s): the map stays ~250ms, then a quiet placeholder, then the screen – never a blank page');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();

      // Reduced motion: a plain fade.
      const r = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
      await newProfile(r.p, { name: 'עומר', gender: 'boy', world: 'ninja' });
      await r.p.tap('[data-testid=open-collection]');
      await r.p.waitForSelector('.stage[data-screen=collection]');
      const rm = await r.p.evaluate(() => getComputedStyle(document.querySelector('.stage')).animationName);
      must(rm === 'stage-fade', 'reduced motion: a fade, ' + rm);
      await r.ctx.close();
      step('reduced motion: screens fade in, nothing slides');
    }

    // ================= Achievements =================
    if (run('achievements')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'מאיה', gender: 'girl', world: 'stage' });
      // The map's first look marks the start (nothing earned yet).
      await p.waitForTimeout(500);
      let rec = await achRecord(p);
      must(rec && rec.since > 0 && Object.keys(rec.unlocked).length === 0, 'the first look starts the record, empty: ' + JSON.stringify(rec));
      // The first lesson watched: the next station is a practice round.
      await seedUpTo(p, NODES[1].id);
      await reenter(p);
      await watchBadges(p);
      // A real round, all right the first time.
      const m = await mark(p);
      await p.tap('[data-testid=map-go]');
      await p.waitForSelector('.game');
      await give(p, await p.getAttribute('.game', 'data-answer'));
      await p.waitForSelector('[data-testid=achievement-toast][data-achievement=first-right]', { timeout: 5000 });
      await p.waitForTimeout(450);
      const a1 = await waitFx(p, m, 'achievement');
      must(a1.length === 1 && a1[0].hero === 'cheer' && a1[0].world === 'stage' && a1[0].word === 'הדרן!' && a1[0].sound === 'unlock', 'the badge through the director, the world’s word: ' + JSON.stringify(a1));
      must(/צעד ראשון/.test(await p.textContent('[data-testid=achievement-toast]')), 'the badge says what it is');
      await onlyTransformOpacity(p, 'the badge');
      await p.screenshot({ path: `${SHOTS}/p10-stage-light-badge.png` });
      // It does not block: the round goes on underneath.
      await playRight(p);
      await p.waitForSelector('.celebrate');
      await p.waitForTimeout(4500);
      const seen = await badges(p);
      must(seen[0] === 'first-right' && seen.includes('three-stars') && new Set(seen).size === seen.length, 'each achievement once: ' + seen);
      rec = await achRecord(p);
      must(rec.unlocked['first-right'] > 0 && rec.unlocked['three-stars'] > 0 && rec.bestStreak >= 5 && rec.streak === rec.bestStreak, 'saved: ' + JSON.stringify(rec));
      step(`a real round: "צעד ראשון" after the first answer (stage's "הדרן!"), "שלושה כוכבים" at the end – once each; best run ${rec.bestStreak}`);

      // Ten in a row: nine on record, one more right answer.
      await idb(p, async (db, getAll, put) => {
        const [r] = await getAll(db, 'achievements');
        await put(db, 'achievements', { ...r, streak: 9, bestStreak: 9 }, r.profileId);
      });
      await p.tap('[data-testid=again]');
      await p.waitForSelector('.game[data-answer]');
      await give(p, await p.getAttribute('.game', 'data-answer'));
      await p.waitForSelector('[data-testid=achievement-toast][data-achievement=streak-10]', { timeout: 6000 });
      step('the run of first-try answers: the tenth in a row opens "10 ברצף"');
      // A wrong answer ends the run.
      await p.waitForSelector('.game[data-answer] .bubble:not([disabled]), .game .numpad');
      const right = await p.getAttribute('.game', 'data-answer');
      const wrong = (await p.$$eval('.bubble:not([disabled])', (els) => els.map((e) => e.dataset.answer))).find((x) => x !== right);
      if (wrong) {
        await give(p, wrong);
        await p.waitForSelector('[data-testid=hint]');
        await give(p, right);
        await p.waitForTimeout(600);
        rec = await achRecord(p);
        must(rec.streak === 0 && rec.bestStreak >= 10, 'a slip ends the run, the best stays: ' + JSON.stringify(rec));
      }
      await p.tap('[data-testid=game-home]');
      await p.waitForSelector('.quest-map');

      // Never again: back in after a reload, nothing drops in.
      await reenter(p);
      await watchBadges(p);
      await p.waitForTimeout(2500);
      must((await badges(p)).length === 0, 'nothing celebrates twice: ' + (await badges(p)));
      // "My achievements".
      await p.tap('[data-testid=open-achievements]');
      await p.waitForSelector('[data-testid=achievements] .ach-card');
      const won = Number(await p.getAttribute('[data-testid=achievements-count]', 'data-won'));
      must(won >= 3, 'won: ' + won);
      for (const id of ['first-right', 'three-stars', 'streak-10']) must((await p.getAttribute(`.ach-card[data-achievement=${id}]`, 'data-won')) === 'yes', id + ' won');
      must(/\d+\.\d+/.test(await p.textContent('.ach-card[data-achievement=first-right] .ach-date')), 'the day it opened');
      must((await p.getAttribute('.ach-card[data-achievement=streak-25] [role=meter]', 'aria-valuenow')) === String(Math.min(25, rec.bestStreak)), 'progress toward 25 in a row');
      must((await p.textContent('.ach-card[data-achievement=collector] .ach-title')).includes('אספנית'), 'words for a girl');
      await checkScreen(p, 'stage/light my achievements');
      await p.screenshot({ path: `${SHOTS}/p10-stage-light-achievements.png`, fullPage: true });
      await p.tap('[data-testid=achievements-back]');
      await p.waitForSelector('.quest-map');
      step(`"my achievements": ${won}/20 won with their day, progress for the rest, words for a girl; nothing celebrates again after a reload`);

      // The parents' dashboard.
      await p.tap('[data-testid=open-settings]');
      await p.tap('[data-testid=open-parents]');
      await p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
      const [x, y] = (await p.textContent('.parent-q')).split('×').map((v) => Number(v.trim()));
      await p.fill('.parent-check input', String(x * y));
      await p.tap('.parent-check button[type=submit]');
      await p.waitForSelector('[data-testid=parent-home]');
      await p.tap('.parent-kid');
      await p.waitForSelector('[data-testid=dash-achievements]');
      must(Number(await p.getAttribute('[data-testid=dash-achievements]', 'data-won')) === won, 'the same achievements for the parent');
      must((await p.textContent('[data-testid=dash-achievements]')).includes('הרצף הארוך ביותר'), 'and the best run');
      await p.screenshot({ path: `${SHOTS}/p10-dash-achievements.png`, fullPage: true });
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
      step("the parents' dashboard lists the child's achievements and the best run");
    }

    // ================= The end of a chapter, and of the journey =================
    if (run('chapters')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
      await newProfile(p, { name: 'איתי', gender: 'boy', world: 'football' });
      await seedUpTo(p, 'c1-boss');
      await reenter(p);
      await p.tap('.map-node[data-node="c1-boss"]');
      await p.waitForSelector('[data-testid=boss-start]');
      await winBoss(p);
      must((await p.getAttribute('[data-testid=boss-to-map]', 'data-next')) === 'chapter-end', 'the first win goes on to the party');
      const m = await mark(p);
      await p.tap('[data-testid=boss-to-map]');
      await p.waitForSelector('[data-testid=chapter-end][data-phase=party]');
      const done = (await waitFx(p, m, 'chapterDone'))[0];
      must(done.detail.chapter === 1 && done.word === 'גביע הפרק!' && done.hero === 'cheer' && done.sound === 'fanfare' && done.particles > 0, 'chapterDone: ' + JSON.stringify(done));
      const { ends } = endings('football');
      must((await p.textContent('[data-testid=chapter-end-story]')).includes(ends[0]), 'the world’s sentence for chapter 1');
      await p.waitForTimeout(1300);
      const boss = await p.evaluate(() => {
        const el = document.querySelector('.chapter-end-boss');
        const a = el?.getAnimations()[0];
        return a ? { name: a.animationName, x: new DOMMatrix(getComputedStyle(el).transform).m41 } : null;
      });
      must(boss && boss.name === 'boss-flee', 'the boss runs off: ' + JSON.stringify(boss));
      await onlyTransformOpacity(p, 'chapter end');
      await p.screenshot({ path: `${SHOTS}/p10-football-light-chapter-party.png` });
      // A tap skips to the summary.
      const t = Date.now();
      await p.tap('[data-testid=chapter-end]');
      await p.waitForSelector('[data-testid=chapter-summary]');
      must(Date.now() - t < 1000, 'skipping is immediate');
      must(Number(await p.getAttribute('[data-sum=stars]', 'data-value')) > 0 && Number(await p.getAttribute('[data-sum=coins]', 'data-value')) >= 8, 'the summary: stars and coins');
      await checkScreen(p, 'football/light chapter end');
      await p.screenshot({ path: `${SHOTS}/p10-football-light-chapter-summary.png` });
      await p.tap('[data-testid=chapter-end-next]');
      await p.waitForSelector('[data-testid=map-chapter][data-chapter=c2]', { timeout: 15000 });
      step(`chapter 1's end: the hero, the boss running off, "${ends[0]}", ⚽ "גביע הפרק!", a tap skips to stars, puzzles and coins; on to chapter 2`);
      // Beating the boss again: no second party.
      await p.tap('[data-testid=chapter-tab-1]');
      await p.tap('.map-node[data-node="c1-boss"]');
      await p.waitForSelector('[data-testid=boss-start]');
      await winBoss(p);
      must((await p.getAttribute('[data-testid=boss-to-map]', 'data-next')) === null, 'a second win goes back to the map');
      await p.tap('[data-testid=boss-to-map]');
      await p.waitForSelector('.quest-map');
      step('a second win over the same boss goes straight back to the map');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();

      // The end of the journey (dark, ninja).
      const d = await phone(b, { colorScheme: 'dark', reducedMotion: 'no-preference' });
      await newProfile(d.p, { name: 'עומר', gender: 'boy', world: 'ninja', grade: 5 });
      await seedUpTo(d.p, 'c10-boss');
      await reenter(d.p);
      await d.p.tap('.map-node[data-node="c10-boss"]');
      await d.p.waitForSelector('[data-testid=boss-start]');
      await winBoss(d.p);
      await d.p.tap('[data-testid=boss-to-map]');
      await d.p.waitForSelector('[data-testid=chapter-end][data-chapter="10"]');
      await d.p.tap('[data-testid=chapter-end]');
      await d.p.waitForSelector('[data-testid=to-finale]');
      const m2 = await mark(d.p);
      await d.p.tap('[data-testid=to-finale]');
      await d.p.waitForSelector('[data-testid=finale][data-phase=party]');
      const jd = (await waitFx(d.p, m2, 'journeyDone'))[0];
      must(jd.word === 'מאסטר המסע!' && jd.sound === 'victory' && jd.particles > 0, 'journeyDone: ' + JSON.stringify(jd));
      await d.p.screenshot({ path: `${SHOTS}/p10-ninja-dark-journey-party.png` });
      await d.p.tap('[data-testid=finale]');
      await d.p.waitForSelector('[data-testid=certificate] svg');
      const svg = await d.p.innerHTML('[data-testid=certificate]');
      must(svg.includes('עומר') && svg.includes('סיים את כל המסע') && svg.includes('תעודת סיום'), 'the certificate: name, by gender');
      await checkScreen(d.p, 'ninja/dark finale');
      await d.p.screenshot({ path: `${SHOTS}/p10-ninja-dark-certificate.png` });
      // Saved as a picture.
      const [dl] = await Promise.all([d.p.waitForEvent('download'), d.p.tap('[data-testid=certificate-save]')]);
      const file = path.join(SHOTS, 'p10-certificate-download.png');
      await dl.saveAs(file);
      const png = fs.readFileSync(file);
      must(png.slice(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 840 && png.length > 20000, 'a PNG of 1200×840: ' + png.length);
      await d.p.waitForSelector('[data-testid=certificate-saved].is-good');
      // Again, from "my achievements".
      await d.p.tap('[data-testid=finale-map]');
      await d.p.waitForSelector('.quest-map');
      await d.p.tap('[data-testid=open-achievements]');
      await d.p.waitForSelector('[data-testid=open-certificate]');
      await d.p.tap('[data-testid=open-certificate]');
      await d.p.waitForSelector('[data-testid=finale][data-phase=done] [data-testid=certificate] svg');
      must(d.errors.length === 0, 'errors: ' + d.errors.join('\n'));
      await d.ctx.close();
      step('the end of the journey: 🥷 "מאסטר המסע!", a certificate with the name (for a boy), saved as a 1200×840 PNG, opened again from "my achievements"');
    }

    // ================= About, privacy and sharing =================
    if (run('about')) {
      const { ctx, p, errors } = await phone(b, { colorScheme: 'light' });
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new globalThis.URL(URL).origin });
      await newProfile(p, { name: 'דני', gender: 'boy', world: 'basketball' });
      await p.tap('[data-testid=open-settings]');
      await p.tap('[data-testid=open-about]');
      await p.waitForSelector('[data-testid=about]');
      const v = await p.textContent('[data-testid=about-version]');
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
      must(pkg.version === '1.0.0' && v.includes('1.0.0') && /\d+\.\d+\.\d{4}/.test(v), 'the version and build day: ' + v);
      const priv = await p.textContent('[data-testid=about-privacy]');
      must(/רק בטלפון/.test(priv) && /אין שרת/.test(priv) && /בלי מעקב/.test(priv), 'privacy in plain words');
      must((await p.textContent('[data-testid=about]')).includes('Rubik') && (await p.textContent('[data-testid=about]')).includes('איך מגבים'), 'credits and how to back up');
      await checkScreen(p, 'basketball/light about', { live: true });
      await p.screenshot({ path: `${SHOTS}/p10-basketball-light-about.png`, fullPage: true });
      // No share sheet here: the link is copied.
      await p.tap('[data-testid=share-app]');
      await p.waitForSelector('[data-testid=share-note].is-good');
      must((await p.evaluate(() => navigator.clipboard.readText())) === 'https://mathit-liorhen9.web.app/', 'the link copied');
      await p.tap('[data-testid=about-back]');
      await p.waitForSelector('.settings-screen');
      must(errors.length === 0, 'errors: ' + errors.join('\n'));
      await ctx.close();
      // With a share sheet (and from the parents' area, dark).
      const s = await phone(b, { colorScheme: 'dark' });
      await s.p.addInitScript(() => {
        window.__shared = [];
        navigator.share = async (d) => void window.__shared.push(d);
      });
      await newProfile(s.p, { name: 'דני', gender: 'boy', world: 'blocks' });
      await s.p.tap('[data-testid=open-settings]');
      await s.p.tap('[data-testid=open-parents]');
      await s.p.waitForSelector('[data-testid=parent-gate][data-armed=yes]');
      const [x, y] = (await s.p.textContent('.parent-q')).split('×').map((n) => Number(n.trim()));
      await s.p.fill('.parent-check input', String(x * y));
      await s.p.tap('.parent-check button[type=submit]');
      await s.p.waitForSelector('[data-testid=parent-home]');
      await s.p.tap('[data-testid=open-about]');
      await s.p.waitForSelector('[data-testid=about]');
      must((await s.p.textContent('[data-testid=about-back]')).includes('לאזור ההורים'), 'back to the parents');
      await s.p.tap('[data-testid=share-app]');
      const shared = await s.p.evaluate(() => window.__shared);
      must(shared.length === 1 && shared[0].url === 'https://mathit-liorhen9.web.app/' && /MathIt/.test(shared[0].title), 'Web Share: ' + JSON.stringify(shared));
      await checkScreen(s.p, 'base/dark about (parents)');
      await s.p.screenshot({ path: `${SHOTS}/p10-about-dark.png` });
      await s.p.tap('[data-testid=about-back]');
      await s.p.waitForSelector('[data-testid=parent-home]');
      // The share card.
      const meta = await s.p.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')].map((m) => [m.getAttribute('property') || m.getAttribute('name'), m.content])));
      must(meta['og:image'] === 'https://mathit-liorhen9.web.app/og-image.png' && meta['og:title'].includes('MathIt') && meta['twitter:card'] === 'summary_large_image' && meta['og:locale'] === 'he_IL', 'og/twitter meta: ' + JSON.stringify(meta));
      const img = await s.p.evaluate(async (u) => {
        const r = await fetch(u);
        const bmp = await createImageBitmap(await r.blob());
        return { ok: r.ok, w: bmp.width, h: bmp.height };
      }, new globalThis.URL('og-image.png', URL).href);
      must(img.ok && img.w === 1200 && img.h === 630, 'the share image: ' + JSON.stringify(img));
      must(s.errors.length === 0, 'errors: ' + s.errors.join('\n'));
      await s.ctx.close();
      step('About: version 1.0.0 and its day, privacy (only on this phone, no server, no tracking), how to back up, credits; sharing the app (share sheet, or the link copied); from the settings and the parents; og/twitter card 1200×630');
    }

    // ================= An old phone =================
    if (run('perf')) {
      const local = /localhost|127\.0\.0\.1/.test(URL);
      const dist = process.env.DIST || path.join(SHOTS, '..', 'dist');
      let srv = null;
      let base = URL;
      if (local && fs.existsSync(path.join(dist, 'index.html'))) {
        srv = await gzipServer(path.resolve(dist));
        base = 'http://localhost:4175/';
      }
      const times = {};
      // The first load, cold, CPU ×4 and Slow 3G: until "let's start" can be tapped.
      {
        const { ctx, p } = await phone(b, { colorScheme: 'light' });
        await oldPhone(ctx, p);
        const t0 = Date.now();
        await p.goto(base);
        await p.waitForSelector('.splash-go');
        times.firstLoad = Date.now() - t0;
        await ctx.close();
      }
      // Screens on a phone that has the app (its chunks cached, as by the Service Worker), CPU ×4.
      {
        const { ctx, p, errors } = await phone(b, { colorScheme: 'light' });
        await newProfile(p, { name: 'יעל', gender: 'girl', world: 'fairies', grade: 5, url: base });
        await seedUpTo(p, 'c10-boss');
        // Warm the cache: one visit to each screen.
        await reenter(p, base);
        for (const [open, ready, close] of [
          ['.map-node[data-node="c10-area-1"]', '.game', '[data-testid=game-home]'],
          ['.map-node[data-node="c10-area-lesson"]', '.lesson', '[data-testid=lesson-home]'],
          ['.map-node[data-node="c10-kenken"]', '.kk-grid', '[data-testid=puzzle-close]']
        ]) {
          await p.tap(open);
          await p.waitForSelector(ready);
          await p.tap(close);
          await p.waitForSelector('.quest-map .map-node');
        }
        await oldPhone(ctx, p, false);
        const measure = async (name, act, ready) => {
          const t0 = Date.now();
          await act();
          await p.waitForSelector(ready);
          times[name] = Date.now() - t0;
        };
        await p.goto(base);
        await p.waitForSelector('.splash-go');
        await p.tap('.splash-go', { force: true });
        await p.waitForSelector('.profile-pick');
        await measure('map', () => p.tap('.profile-pick >> nth=0'), '.quest-map .map-node');
        const nodes = await p.$$eval('.quest-map *', (els) => els.length);
        await p.waitForTimeout(1500);
        const a0 = await p.evaluate(() => document.getAnimations().length);
        await measure('round', () => p.tap('.map-node[data-node="c10-area-1"]'), '.game[data-answer] .bubble, .game[data-answer] .numpad');
        await p.tap('[data-testid=game-home]');
        await p.waitForSelector('.quest-map .map-node');
        await measure('lesson', () => p.tap('.map-node[data-node="c10-area-lesson"]'), '.lesson');
        await p.tap('[data-testid=lesson-home]');
        await p.waitForSelector('.quest-map .map-node');
        await measure('puzzle', () => p.tap('.map-node[data-node="c10-kenken"]'), '.kk-grid');
        await p.tap('[data-testid=puzzle-close]');
        await p.waitForSelector('.quest-map .map-node');
        await p.tap('[data-testid=open-collection]');
        await p.waitForSelector('[data-testid=collection]');
        await p.tap('[data-testid=collection-back]');
        await p.waitForSelector('.quest-map .map-node');
        // Nothing left behind: the same animations as before the trip, no stray tokens or particles.
        await p.waitForTimeout(2500);
        const after = await p.evaluate(() => ({
          n: document.getAnimations().length,
          finished: document.getAnimations().filter((a) => a.playState === 'finished').length,
          tokens: document.querySelectorAll('.fly-token, .fx-word').length,
          particles: Number(document.querySelector('.fx-canvas')?.dataset.count ?? 0)
        }));
        must(after.n <= a0 + 2 && after.finished <= 3 && after.tokens === 0 && after.particles === 0, `animations left behind: before ${a0}, after ${JSON.stringify(after)}`);
        must(nodes < 1600, `the map stays light: ${nodes} elements`);
        must(errors.length === 0, 'errors: ' + errors.join('\n'));
        await ctx.close();
        step(`no animations left behind after a round, a lesson, a puzzle and the collection (${a0} → ${after.n}); the map of chapter 10 has ${nodes} elements`);
      }
      const over = Object.entries(times).filter(([k, ms]) => ms > PERF[k]);
      console.log('   old phone (CPU ×4' + (srv ? ', Slow 3G for the first load, gzip' : '') + '): ' + Object.entries(times).map(([k, ms]) => `${k} ${ms}ms`).join(', '));
      must(over.length === 0, 'too slow on an old phone: ' + JSON.stringify(over));
      step(`an old phone: first load ${times.firstLoad}ms, map ${times.map}ms, round ${times.round}ms, lesson ${times.lesson}ms, puzzle ${times.puzzle}ms (all ≤ 2.5s)`);
      if (srv) srv.close();

      // A weak phone: fewer particles.
      {
        const { ctx, p } = await phone(b, { colorScheme: 'light' });
        await p.addInitScript(() => {
          Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
          Object.defineProperty(navigator, 'deviceMemory', { get: () => 1 });
        });
        await newProfile(p, { name: 'יעל', gender: 'girl', world: 'fairies' });
        await seedUpTo(p, 'c1-boss');
        await reenter(p);
        await p.tap('.map-node[data-node="c1-boss"]');
        await p.waitForSelector('[data-testid=boss-start]');
        const m = await mark(p);
        await winBoss(p);
        const won = (await waitFx(p, m, 'bossDefeated'))[0];
        const cap = Number(await p.getAttribute('.fx-canvas', 'data-cap'));
        must(cap === 90 && won.particles > 0 && won.particles <= 90, `a weak phone: cap ${cap}, the victory's confetti ${won.particles}`);
        await ctx.close();
        step(`a weak phone (2 cores, 1GB): particles capped at ${cap}, the boss's confetti ${won.particles} (180 on a strong phone)`);
      }
    }

    // ================= Looks: three worlds, light and dark =================
    if (run('looks')) {
      for (const [world, gender] of [
        ['fairies', 'girl'],
        ['football', 'boy'],
        ['blocks', 'other']
      ]) {
        for (const scheme of ['light', 'dark']) {
          const { ctx, p, errors } = await phone(b, { colorScheme: scheme, reducedMotion: scheme === 'dark' ? 'reduce' : 'no-preference' });
          await newProfile(p, { name: 'טל', gender, world });
          await seedUpTo(p, 'c2-boss');
          await reenter(p);
          await p.waitForTimeout(800);
          await p.screenshot({ path: `${SHOTS}/p10-${world}-${scheme}-map.png` });
          await p.tap('[data-testid=open-achievements]');
          await p.waitForSelector('[data-testid=achievements] .ach-card');
          await checkScreen(p, `${world}/${scheme} achievements`);
          await p.screenshot({ path: `${SHOTS}/p10-${world}-${scheme}-achievements.png` });
          await p.tap('[data-testid=achievements-back]');
          await p.waitForSelector('.quest-map');
          await p.tap('.map-node[data-node="c2-boss"]');
          await p.waitForSelector('[data-testid=boss-start]');
          await winBoss(p);
          await p.tap('[data-testid=boss-to-map]');
          await p.waitForSelector('[data-testid=chapter-end]');
          if (scheme === 'dark') {
            // Reduced motion: the party is short, the boss only fades.
            const rm = await p.evaluate(() => getComputedStyle(document.querySelector('.chapter-end-boss') || document.body).animationName);
            must(rm === 'ach-fade-out' || rm === 'none', 'reduced motion: the boss fades: ' + rm);
          }
          await p.screenshot({ path: `${SHOTS}/p10-${world}-${scheme}-chapter-end.png` });
          await p.waitForSelector('[data-testid=chapter-summary]', { timeout: 8000 });
          await checkScreen(p, `${world}/${scheme} chapter end`);
          must((await p.textContent('[data-testid=chapter-end-story]')).includes(endings(world).ends[1]), `${world}: chapter 2's ending`);
          must(errors.length === 0, 'errors: ' + errors.join('\n'));
          await ctx.close();
        }
      }
      step('looks: map, achievements and the chapter end in fairies, football and blocks, light and dark (dark with reduced motion), for a girl, a boy and unset');
    }
  } catch (e) {
    console.log('✗', e.message);
    if (last) await last.screenshot({ path: `${SHOTS}/p10-FAILED.png` }).catch(() => {});
    await b.close();
    process.exit(1);
  }
  await b.close();
  console.log('\nall phase 10 checks passed');
})();
