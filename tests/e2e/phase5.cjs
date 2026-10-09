const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
// Usage: node tests/e2e/phase5.cjs <screenshots-dir> [url]
// Phase 5 – worlds in full, at phone size (360px). The same chapter in all six worlds, in light
// and in dark:
// - the map wears the world (scenery, station shape, banner icons, the story, the world's boss on
//   the boss station), the hero walks its own way (float, jog, dribble, sneak, stomp, dance);
// - a right answer gets the world's feedback (__mathitFx: world, its pack's sound, its particles,
//   its token; a word on a streak), Pop wears the world's skin, a word problem is filled with
//   the world's words; coins fly to the purse and are still there after a reload;
// - the world's boss (name, picture, intro), the hero attacks its own way (data-attack), a hit
//   sounds from the world's pack; one boss fought to the end wins a collectible for the
//   collection screen (shelves for every world, silhouettes for the rest);
// - music (window.__mathitMusic): silent before the first touch, the world's loop on the map,
//   ducks while the hero speaks and comes back, very low during an explanation, off in lessons,
//   on the shared screens and with the setting off;
// - an old phone (schema 3, a chest opened in phase 4) moves to schema 6 and keeps its sticker;
// - dark + reduced motion: no particles or popping words, the hero fades across;
// - transform/opacity only, touch targets ≥ 48px, no sideways scroll; screenshots of the map, a
//   game and the boss in every world, light and dark.
const SHOTS = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:4173/';

const step = (s) => console.log('✓', s);
const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const WORLDS = {
  fairies: { walk: 'float', attack: 'spell', boss: 'fog-witch', bossName: 'מכשפת הערפל', node: 'petal', look: 'magic', kind: 'sparkle', fly: '✨', coin: '💎', word: 'קסם!', items: ['אבני קסם', 'פרחים', 'פרפרים'], reward: 'f-flower' },
  football: { walk: 'jog', attack: 'kick', boss: 'giant-keeper', bossName: 'השוער הענק', node: 'ball', look: 'ball', kind: 'leaf', fly: '⚽', coin: '🪙', word: 'גול!', items: ['כדורים', 'דגלים', 'קונוסים'] },
  basketball: { walk: 'dribble', attack: 'shoot', boss: 'champion', bossName: 'אלוף ה-1 על 1', node: 'round', look: 'hoop', kind: 'spark', fly: '🏀', coin: '🏅', word: 'סוויש!', items: ['כדורים', 'בקבוקי מים', 'מגבות'] },
  ninja: { walk: 'sneak', attack: 'throw', boss: 'shadow-master', bossName: 'מאסטר הצל', node: 'tile', look: 'target', kind: 'spark', fly: '💫', coin: '🍙', word: 'הי-יא!', items: ['כוכבי נינג׳ה', 'מגילות', 'פנסי נייר'] },
  blocks: { walk: 'stomp', attack: 'swing', boss: 'cave-creature', bossName: 'יצור המערות', node: 'square', look: 'block', kind: 'block', fly: '🧱', coin: '💠', word: 'בלינג!', items: ['קוביות', 'אבני חן', 'לבנים'] },
  stage: { walk: 'dance', attack: 'wave', boss: 'shadow-demon', bossName: 'שד הצל', node: 'gem', look: 'spot', kind: 'note', fly: '🎵', coin: '🎟️', word: 'הופעה!', items: ['מיקרופונים', 'זרקורים', 'כרטיסים'] }
};

async function phone(browser, opts = {}, fakeVoice = false) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...opts });
  if (fakeVoice)
    // A Hebrew voice that "speaks" for 1.2s (headless Chromium has none), so narration – and the
    // music ducking under it – can be tested.
    await ctx.addInitScript(() => {
      const voice = { lang: 'he-IL', localService: true, name: 'test', default: true, voiceURI: 'test' };
      let timer = 0;
      const fake = {
        getVoices: () => [voice],
        speak(u) {
          clearTimeout(timer);
          window.__spoken = (window.__spoken || 0) + 1;
          timer = setTimeout(() => u.dispatchEvent(new Event('end')), 1200);
        },
        cancel() {},
        addEventListener() {},
        removeEventListener() {}
      };
      Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    });
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
const mark = async (p) => ({ fx: (await fx(p)).length });
const fxSince = async (p, m) => (await fx(p)).slice(m.fx);
async function waitFx(p, m, type, count = 1, timeout = 15000) {
  await p.waitForFunction(([n, t, c]) => window.__mathitFx.slice(n).filter((e) => e.type === t).length >= c, [m.fx, type, count], { timeout });
  return (await fxSince(p, m)).filter((e) => e.type === type);
}
const music = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__mathitMusic)));

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
const nowDot = (p) => p.evaluate(() => [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')));

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

async function reenter(p) {
  await p.goto(URL);
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
          const names = [...d.objectStoreNames];
          const tx = d.transaction(names, 'readonly');
          const out = { stores: names };
          const reqs = {
            v: tx.objectStore('meta').get('schemaVersion'),
            profiles: tx.objectStore('profiles').getAll(),
            quest: names.includes('questProgress') ? tx.objectStore('questProgress').getAll() : null,
            inventory: names.includes('inventory') ? tx.objectStore('inventory').getAll() : null
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
function starsUpTo(upto, n) {
  const out = {};
  for (const id of ORDER.slice(0, ORDER.indexOf(upto))) if (id !== 'c1-chest') out[id] = id.endsWith('lesson') ? 1 : n;
  return out;
}

/** Answer right until the round's dot reaches `n` (or the round ends). */
async function answerRight(p, times) {
  for (let i = 0; i < times; i++) {
    const at = await nowDot(p);
    await answer(p, await solve(p));
    await p.waitForFunction((n) => !!document.querySelector('.celebrate') || [...document.querySelectorAll('.round-dot')].findIndex((d) => d.classList.contains('is-now')) === n, at + 1);
  }
}

/**
 * One world, one colour scheme: the map, a round (feedback, coins, Pop skin, a word problem),
 * the walk, the boss. `full` adds the deeper checks (light runs).
 */
async function worldRun(b, id, dark, n) {
  const W = WORLDS[id];
  const mode = dark ? 'dark' : 'light';
  const { ctx, p, errors } = await phone(b, { colorScheme: mode, reducedMotion: 'no-preference' });
  await newProfile(p, { name: 'דני', age: 8, gender: n % 2 ? 'girl' : 'boy', world: id });
  const tag = `${id}/${mode}`;

  // --- The map in the world's dress ---
  must((await p.getAttribute('.quest-map', 'data-world')) === id, `${tag}: map world`);
  must(await p.$('.map-scenery'), `${tag}: no scenery`);
  must((await p.getAttribute('.map', 'class')).includes(`node-${W.node}`), `${tag}: station shape`);
  const boss = await p.$eval('.map-node[data-node="c1-boss"]', (e) => e.getAttribute('aria-label'));
  must(boss.startsWith(W.bossName), `${tag}: the boss station is "${boss}"`);
  must((await p.textContent('[data-testid=map-story]')).trim().length > 10, `${tag}: no story`);
  const hero = await p.$eval('.map-hero .hero', (e) => [e.dataset.walk, e.dataset.attack]);
  must(hero[0] === W.walk && hero[1] === W.attack, `${tag}: hero walk/attack ${hero}`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${SHOTS}/p5-${id}-${mode}-1-map.png` });
  await layoutOk(p, `${tag} map`);

  // --- A round: the world's feedback, coins ---
  await p.tap('[data-testid=open-practice]');
  await p.waitForSelector('.home .skill-btn');
  await p.tap('[data-skill="add.within10"]');
  await p.waitForSelector('.game .pop');
  must((await p.getAttribute('.bubbles', 'data-skin')) === W.look, `${tag}: Pop skin`);
  let m = await mark(p);
  await answerRight(p, 1);
  const c = (await waitFx(p, m, 'correct'))[0];
  must(c.world === id && c.sound === 'correct' && c.pack === id, `${tag}: correct ${JSON.stringify(c)}`);
  must(c.kind === W.kind && c.fly === W.fly && c.particles > 0 && !c.word, `${tag}: correct looks ${JSON.stringify(c)}`);
  const coin = (await waitFx(p, m, 'coin'))[0];
  must(coin.fly === W.coin && coin.pack === id && coin.detail.n === 1, `${tag}: coin ${JSON.stringify(coin)}`);
  await p.waitForFunction(() => document.querySelector('[data-testid=coins]').dataset.coins === '1');
  await p.screenshot({ path: `${SHOTS}/p5-${id}-${mode}-2-game.png` });
  await layoutOk(p, `${tag} game`);
  await answerRight(p, 2);
  const streak = (await waitFx(p, m, 'correct', 3))[2];
  must(streak.word === W.word && streak.detail.streak === 3, `${tag}: streak ${JSON.stringify(streak)}`);
  await waitFx(p, m, 'coin', 3);
  await p.waitForFunction(() => document.querySelector('[data-testid=coins]').dataset.coins === '3');
  await onlyTransformOpacity(p, `${tag} game`);
  step(`${tag}: the map (scenery, ${W.node} stations, ${W.bossName}), Pop as ${W.look}, a right answer with ${W.kind} and ${W.fly}, the pack's sound, ${W.coin} coins, "${W.word}" on a streak`);

  if (!dark) {
    // A word problem in the world's words.
    await p.tap('[data-testid=game-home]');
    await p.waitForSelector('.home .skill-btn');
    await p.tap('[data-skill="story.within10"]');
    await p.waitForSelector('.game .pop');
    const text = await p.textContent('.prompt-text');
    must(!/[{}]/.test(text) && W.items.some((w) => text.includes(w)), `${tag}: word problem "${text}"`);
    await p.screenshot({ path: `${SHOTS}/p5-${id}-${mode}-3-story.png` });
    await layoutOk(p, `${tag} story`);
    // Coins are kept.
    await reenter(p);
    await p.waitForFunction(() => Number(document.querySelector('[data-testid=coins]').dataset.coins) === 3);
    const d = await db(p);
    const inv = d.inventory.find((r) => r.worldId === id);
    must(d.v === 6 && inv && inv.coins === 3, `${tag}: inventory ${JSON.stringify(d.inventory)}`);
    step(`${tag}: a word problem in the world's words ("${text.slice(0, 30)}…"), 3 coins kept after a reload`);

    // --- The walk, the world's way ---
    await seedQuest(p, { stars: { 'c1-count-lesson': 1 }, chests: {}, at: 'c1-count-lesson', revealed: ORDER.slice(0, 2), last: null });
    await reenter(p);
    m = { fx: 0 };
    const walk = (await waitFx(p, m, 'walk'))[0];
    must(walk.hero === 'walk', `${tag}: walk ${JSON.stringify(walk)}`);
    await p.waitForTimeout(250);
    const cls = await p.getAttribute('.map-hero .hero', 'class');
    must(cls.includes('is-walk') && cls.includes(`walk-${W.walk}`), `${tag}: the hero walks as "${cls}"`);
    await onlyTransformOpacity(p, `${tag} walk`);
    await p.waitForFunction(() => document.querySelector('.quest-map').dataset.walking === 'no');
    const steps = (await fxSince(p, m)).filter((e) => e.type === 'step');
    must(steps.length > 0 && steps.every((s) => s.pack === id), `${tag}: footsteps from the pack`);
    step(`${tag}: the hero walks its own way (${W.walk}), footsteps from the world's pack`);
  }

  // --- The boss of the world ---
  await seedQuest(p, { stars: starsUpTo('c1-boss', 3), chests: {}, at: 'c1-boss', revealed: ORDER, last: null });
  await reenter(p);
  await p.tap('.map-node[data-node="c1-boss"]');
  await p.waitForSelector('[data-testid=boss]');
  must((await p.getAttribute('[data-testid=boss]', 'data-boss')) === W.boss, `${tag}: boss id`);
  must((await p.textContent('.topbar-title')).includes(W.bossName), `${tag}: boss title`);
  must((await p.textContent('.boss-intro-text')).includes(W.bossName), `${tag}: boss intro`);
  m = { fx: 0 };
  const appear = (await waitFx(p, m, 'bossAppear'))[0];
  must(appear.pack === id, `${tag}: the boss appears with the world's sound`);
  await p.waitForTimeout(300);
  await layoutOk(p, `${tag} boss intro`);
  await p.tap('[data-testid=boss-start]');
  await p.waitForSelector('.boss-screen .bubble');
  m = await mark(p);
  await answer(p, await solve(p));
  const hit = (await waitFx(p, m, 'bossHit'))[0];
  must(hit.pack === id && hit.sound === 'hit', `${tag}: hit ${JSON.stringify(hit)}`);
  const hc = await p.getAttribute('.boss-hero', 'class');
  must(hc.includes('is-attack') && hc.includes(`atk-${W.attack}`), `${tag}: the hero attacks as "${hc}"`);
  await p.waitForTimeout(250);
  await onlyTransformOpacity(p, `${tag} boss hit`);
  await p.screenshot({ path: `${SHOTS}/p5-${id}-${mode}-4-boss.png` });
  await layoutOk(p, `${tag} boss`);
  step(`${tag}: ${W.bossName} (its picture, name, intro, sounds), the hero attacks its way (${W.attack})`);

  must(errors.length === 0, `${tag} errors: ` + errors.join('\n'));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch();

  // ================= Music, the boss to the end, the collection (fairies, light) =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' }, true);
    await p.goto(URL);
    await p.waitForSelector('.splash');
    const mainSrc = await p.$eval('script[type=module][src]', (s) => s.src);
    const mainJs = await p.evaluate(async (u) => (await fetch(u)).text(), mainSrc);
    must(!mainJs.includes('מכשפת הערפל') && !mainJs.includes('השוער הענק') && !mainJs.includes('הופעה!') && !mainJs.includes('האוסף שלי'), 'world content or the collection in the main script');
    let mu = await music(p);
    must(!mu.playing && mu.steps === 0, 'music before the first touch: ' + JSON.stringify(mu));
    step(`worlds, bosses, music and the collection are lazy (main script ${(mainJs.length / 1024).toFixed(1)}KB); no music before a touch`);

    await newProfile(p, { name: 'נועה', age: 6, gender: 'girl', world: 'fairies' });
    await p.waitForFunction(() => window.__mathitMusic.playing && window.__mathitMusic.steps > 8);
    mu = await music(p);
    must(mu.world === 'fairies' && mu.scene === 'play', 'map music: ' + JSON.stringify({ ...mu, log: undefined }));
    // The greeting is read aloud: the music ducks, then comes back.
    await p.waitForFunction(() => window.__mathitMusic.log.some((e) => e.what === 'duck'));
    await p.waitForFunction(() => window.__mathitMusic.log.some((e) => e.what === 'unduck'), null, { timeout: 8000 });
    mu = await music(p);
    const duck = mu.log.find((e) => e.what === 'duck');
    const back = mu.log.filter((e) => e.what === 'unduck').at(-1);
    must(duck.level > 0 && back.level > duck.level * 3, `ducking: ${duck.level} → ${back.level}`);
    // Tapping 🔊 reads again – and ducks again.
    const ducks = mu.log.filter((e) => e.what === 'duck').length;
    await p.tap('.map-with .speak-btn');
    await p.waitForFunction((n) => window.__mathitMusic.log.filter((e) => e.what === 'duck').length > n, ducks);
    must((await music(p)).ducked, 'ducked while speaking');
    step(`music: the fairies' loop starts after the touch on the map, ducks under the voice (${duck.level} vs ${back.level}) and comes back`);

    // Off in lessons; very low in an explanation; on again on the map.
    await p.tap('.map-node[data-node="c1-count-lesson"]');
    await p.waitForSelector('.lesson');
    await p.waitForFunction(() => !window.__mathitMusic.playing);
    must((await music(p)).scene === 'off', 'lesson scene');
    await p.waitForFunction(() => window.__mathitMusic.held);
    step('music: quiet in a lesson (and held very low while the hero explains)');
    await p.tap('[data-testid=lesson-home]');
    await p.waitForSelector('.quest-map');
    await p.waitForFunction(() => window.__mathitMusic.playing && !window.__mathitMusic.held);
    // Shared screens are quiet.
    await p.tap('[data-testid=switch-profile]');
    await p.waitForSelector('.profile-pick');
    await p.waitForFunction(() => !window.__mathitMusic.playing);
    await p.tap('.profile-pick >> nth=0');
    await p.waitForSelector('.quest-map');
    await p.waitForFunction(() => window.__mathitMusic.playing);
    // The setting turns it off.
    await p.tap('[data-testid=open-settings]');
    await p.waitForSelector('[data-setting=music]');
    await p.tap('[data-setting=music]');
    await p.waitForFunction(() => !window.__mathitMusic.playing && !window.__mathitMusic.enabled);
    await p.tap('[data-setting=music]');
    await p.waitForFunction(() => window.__mathitMusic.playing);
    step('music: stops on "who is playing?" and back on the map; the music setting turns it off and on');

    // The boss to the end: a collectible for the shelf.
    await seedQuest(p, { stars: starsUpTo('c1-boss', 3), chests: {}, at: 'c1-boss', revealed: ORDER, last: null });
    await reenter(p);
    await p.tap('.map-node[data-node="c1-boss"]');
    await p.waitForSelector('[data-testid=boss]');
    await p.tap('[data-testid=boss-start]');
    for (let i = 0; i < 12 && !(await p.$('.boss-won')); i++) {
      await p.waitForSelector('.boss-screen .bubble:not([disabled]), .boss-won');
      if (await p.$('.boss-won')) break;
      const left = await p.getAttribute('.boss-hp', 'data-hp');
      await answer(p, await solve(p));
      await p.waitForFunction((l) => !!document.querySelector('.boss-won') || document.querySelector('.boss-hp').dataset.hp !== l, left);
      await p.waitForTimeout(1000);
    }
    await p.waitForSelector('[data-testid=boss-reward]');
    must((await p.getAttribute('[data-testid=boss-reward]', 'data-item')) === 'f-flower', 'the first fairy collectible');
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SHOTS}/p5-fairies-light-5-boss-won.png` });
    await p.waitForSelector('[data-testid=boss-to-map]');
    await p.tap('[data-testid=boss-to-map]');
    // Phase 10: the first win goes through the chapter's end party (skipped by a tap) to the map.
    await p.waitForSelector('[data-testid=chapter-end]');
    await p.tap('[data-testid=chapter-end]');
    await p.tap('[data-testid=chapter-end-next]');
    await p.waitForSelector('.quest-map');
    must(Number(await p.getAttribute('[data-testid=coins]', 'data-coins')) >= 8, 'eight hits, eight coins');
    await p.tap('[data-testid=open-collection]');
    await p.waitForSelector('[data-testid=collection] .shelf');
    const shelves = await p.$$eval('.shelf', (els) => els.map((e) => e.dataset.world));
    must(shelves.length === 6 && shelves[0] === 'fairies', 'shelves: ' + shelves);
    const fairy = await p.$$eval('.shelf[data-world=fairies] .shelf-item', (els) => els.map((e) => [e.dataset.item, e.dataset.owned]));
    must(fairy.length === 6 && fairy[0].join() === 'f-flower,yes' && fairy.slice(1).every(([, o]) => o === 'no'), 'fairy shelf: ' + JSON.stringify(fairy));
    must(Number(await p.getAttribute('.shelf[data-world=fairies] .shelf-coins', 'data-coins')) >= 8, 'coins on the shelf');
    must((await p.$$('.shelf[data-world=football] .shelf-item.is-missing')).length === 6, 'other worlds: silhouettes');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/p5-collection-light.png`, fullPage: true });
    await layoutOk(p, 'collection');
    must((await music(p)).playing, 'music on the collection screen');
    await p.tap('[data-testid=collection-back]');
    await p.waitForSelector('.quest-map');
    step('boss beaten → 🌷 for the collection; "my collection": six shelves in their worlds\' colours, coins, silhouettes for what is missing');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= The same chapter in six worlds, light and dark =================
  let n = 0;
  for (const id of Object.keys(WORLDS)) {
    await worldRun(b, id, false, n++);
    await worldRun(b, id, true, n++);
  }

  // ================= An old phone: schema 3, a chest opened in phase 4 =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'light', reducedMotion: 'no-preference' });
    await p.route(URL, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>old</title>' }));
    await p.goto(URL);
    await p.evaluate(
      ({ order }) =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('mathit', 3);
          req.onupgradeneeded = () => {
            for (const s of ['meta', 'profiles', 'skillStates', 'questProgress']) req.result.createObjectStore(s);
          };
          req.onsuccess = () => {
            const d = req.result;
            const tx = d.transaction(['meta', 'profiles', 'questProgress'], 'readwrite');
            tx.objectStore('meta').put(3, 'schemaVersion');
            tx.objectStore('profiles').put(
              { id: 'p_three', name: 'מאיה', avatar: '🦊', age: 7, gender: 'girl', worldId: 'blocks', settings: { sfx: true, music: true, narration: false, volume: 0.8, reducedMotion: null, speechHelpSeen: true }, createdAt: 1 },
              'p_three'
            );
            const stars = {};
            for (const id of order.slice(0, 10)) if (id !== 'c1-chest') stars[id] = id.endsWith('lesson') ? 1 : 2;
            tx.objectStore('questProgress').put({ profileId: 'p_three', stars, chests: { 'c1-chest': '🌈' }, at: 'c1-sub-lesson', revealed: order.slice(0, 11), last: 'c1-chest', updated: 1 }, 'p_three');
            tx.oncomplete = () => {
              d.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
      { order: ORDER }
    );
    await p.unroute(URL);
    await reenter(p);
    const d = await db(p);
    must(d.v === 6 && d.stores.includes('inventory') && d.quest[0].chests['c1-chest'] === '🌈', 'migration 3 → 6: ' + JSON.stringify({ v: d.v, stores: d.stores }));
    must((await p.textContent('.map-node[data-node="c1-chest"]')).includes('🌈'), 'the opened chest keeps its sticker on the map');
    await p.tap('[data-testid=open-collection]');
    await p.waitForSelector('[data-testid=collection] .shelf');
    must(await p.$('.shelf[data-world=stickers] .shelf-icon'), 'the sticker shelf');
    must((await p.textContent('.shelf[data-world=stickers]')).includes('🌈'), 'the 🌈 sticker in the collection');
    await p.screenshot({ path: `${SHOTS}/p5-collection-migrated.png`, fullPage: true });
    step('schema 3 → 5: inventory (and sessions) added; the 🌈 sticker of a chest opened before stays on the map and in the collection');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  // ================= Dark + reduced motion (stage) =================
  {
    const { ctx, p, errors } = await phone(b, { colorScheme: 'dark', reducedMotion: 'reduce' });
    await newProfile(p, { name: 'רון', age: 9, gender: 'boy', world: 'stage' });
    await p.tap('[data-testid=open-practice]');
    await p.waitForSelector('.home .skill-btn');
    await p.tap('[data-skill="add.within10"]');
    await p.waitForSelector('.game .pop');
    const m = await mark(p);
    await answerRight(p, 3);
    const cs = await waitFx(p, m, 'correct', 3);
    must(cs.every((c) => c.particles === 0), 'reduced: no particles');
    must(!(await p.$('.fx-word')), 'reduced: no popping word');
    await waitFx(p, m, 'coin', 3);
    await p.waitForFunction(() => document.querySelector('[data-testid=coins]').dataset.coins === '3');
    await onlyTransformOpacity(p, 'reduced game');
    await p.screenshot({ path: `${SHOTS}/p5-stage-dark-reduced.png` });
    step('dark + reduced motion: the world\'s sounds without particles or popping words; coins still counted');
    must(errors.length === 0, 'errors: ' + errors.join('\n'));
    await ctx.close();
  }

  await b.close();
  console.log('\nphase 5 e2e passed');
})().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
