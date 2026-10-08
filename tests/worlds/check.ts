// World and narration checks that need no browser:
//   bun --tsconfig-override=<tsconfig with preact paths> tests/worlds/check.ts
// - every world sets the required variables, in light and dark;
// - text contrast is at least 4.5:1 (WCAG AA), big playful numbers at least 3:1;
// - the base world matches the :root defaults in src/styles.css (light and dark);
// - text for the voice has no emoji, and math signs are read in Hebrew.
// - the four worlds are registered, each has a hero that renders for every gender, and a sample sound.
// - feedback: every event is mapped in every world (a real sound, a real hero mood), every sound
//   builds valid voices, the combo and star pitches climb, "wrong" is soft (no buzzer).
// - phase 5, every world in full: its feedback mapping (its own particles, flying token, streak
//   word), a complete SoundPack (every sound valid, climbing where it should, its own), a music
//   loop (notes in range, lines the loop's length), a boss, a map skin and a Pop skin that render,
//   a walk and an attack of its own, a one-sentence story, rewards and a coin, and words that fill
//   every word problem for every gender with nothing left in {…}; contrast for the new colours.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { BASE } from '../../src/worlds/base';
import { REQUIRED_VARS, type WorldTheme, type WorldVars } from '../../src/worlds/types';
import { WORLD_LIST, loadWorld } from '../../src/worlds/index';
import { world as fairies } from '../../src/worlds/fairies/index';
import { world as football } from '../../src/worlds/football/index';
import { world as basketball } from '../../src/worlds/basketball/index';
import { world as ninja } from '../../src/worlds/ninja/index';
import { world as blocks } from '../../src/worlds/blocks/index';
import { world as stage } from '../../src/worlds/stage/index';
import { ATTACK_STYLES, Hero, HERO_STATES, MOOD_MS, WALK_STYLES } from '../../src/fx/Hero';
import { PACK_REQUIRED, SFX_NAMES, TEACHING_SOUNDS, comboPitch, countPitch, hitPitch, jumpPitch, leapPitch, tickPitch, sharedTones, starPitch, tonesFor, type SfxName, type Tone } from '../../src/audio/sfx';
import { COMPANION_TYPES, EXPLAIN_TYPES, FEEDBACK_TYPES, SAMPLE_EVENTS, TEACHING_TYPES, planFor } from '../../src/fx/director';
import { PARTICLE_KINDS } from '../../src/fx/particles';
import { cleanForSpeech, readingMs } from '../../src/audio/speech';
import { drumTones, noteMidi, partTokens, voiceTones } from '../../src/audio/music';
import { makeQuestion } from '../../src/core/generators/index';
import { TEMPLATE_IDS, type TemplateId } from '../../src/core/types';
const templateLooks: Partial<Record<TemplateId, Set<string>>> = {};
const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
import { fillQuestion, hasPlaceholders } from '../../src/core/story';
import { storyWords } from '../../src/worlds/index';

const WORLDS: WorldTheme[] = [BASE, fairies, football, basketball, ninja, blocks, stage];
let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log('✗', msg);
};

function lum(hex: string): number {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [foreground, background, minimum, what]
const PAIRS: [string, string, number, string][] = [
  ['ink', 'bg', 4.5, 'text on the page'],
  ['ink', 'surface', 4.5, 'text on cards'],
  ['ink', 'surface-2', 4.5, 'text on secondary surfaces'],
  ['ink-soft', 'surface', 4.5, 'secondary text on cards'],
  ['ink-soft', 'bg', 4.5, 'secondary text on the page'],
  ['brand', 'surface', 4.5, 'brand text on cards'],
  ['brand', 'bg', 4.5, 'brand text on the page'],
  ['brand-ink', 'brand', 4.5, 'text on brand buttons'],
  ['ink', 'brand-soft', 4.5, 'text on selected options'],
  ['good', 'surface', 4.5, '"good" feedback on cards'],
  ['good', 'bg', 4.5, '"good" feedback on the page'],
  ['danger', 'surface', 4.5, '"try again" text on cards'],
  ['danger', 'bg', 4.5, '"try again" text on the page'],
  ['danger-ink', 'danger', 4.5, 'text on red buttons'],
  ['num-1', 'bg', 3, 'big number colour 1'],
  ['num-2', 'bg', 3, 'big number colour 2'],
  ['num-3', 'bg', 3, 'big number colour 3'],
  ['num-4', 'bg', 3, 'big number colour 4'],
  ['hero-ink', 'hero-skin', 3, "the hero's eyes on the face"],
  ['hero-light', 'hero-ink', 3, "the hero's eye shine"],
  // Phase 5: the map's ground carries the station labels and the story (a popping word and the
  // "חדש!" tag are --brand-ink on --brand, checked above).
  ['ink', 'map-bg', 4.5, 'station labels on the map'],
  ['ink-soft', 'map-bg', 4.5, 'closed station labels and the story on the map'],
  ['brand', 'map-bg', 4.5, "the boss's name on the map"],
  // Phase 7: the value on a coin, and a coin standing out on a card.
  ['coin-ink', 'coin-gold', 4.5, 'the value on a gold coin'],
  ['coin-ink', 'coin-silver', 4.5, 'the value on a silver coin']
];

for (const w of WORLDS) {
  for (const mode of ['light', 'dark'] as const) {
    // Unset variables fall back to the base defaults of the same mode.
    const vars: WorldVars = { ...BASE[mode], ...w[mode] };
    for (const v of REQUIRED_VARS) if (!w[mode][v]) fail(`${w.id}/${mode}: --${v} is not set`);
    for (const [fg, bg, min, what] of PAIRS) {
      const c = contrast(vars[fg], vars[bg]);
      if (c < min) fail(`${w.id}/${mode}: ${what} (--${fg} on --${bg}) is ${c.toFixed(2)}:1, needs ${min}:1`);
    }
    // Scenery stays in the background: a gentle step from the ground, never louder than text.
    // A coin stands out on a card: by its dark edge (light mode) or its bright metal (dark mode).
    const coin = Math.max(contrast(vars['coin-ink'], vars.surface), Math.min(contrast(vars['coin-silver'], vars.surface), contrast(vars['coin-gold'], vars.surface)));
    if (coin < 3) fail(`${w.id}/${mode}: a coin on a card is ${coin.toFixed(2)}:1, needs 3:1`);
    const deco = contrast(vars['map-deco'], vars['map-bg']);
    if (deco > 1.6) fail(`${w.id}/${mode}: map scenery (--map-deco on --map-bg) is ${deco.toFixed(2)}:1 – too loud for a background`);
  }
}
console.log(`✓ ${WORLDS.length} worlds (base + ${WORLDS.length - 1}) × light/dark: variables set, contrast OK`);

// Registration: every world folder is listed and loads (as its own module), ids match.
{
  const dir = new URL('../../src/worlds/', import.meta.url);
  const folders = readdirSync(dir).filter((f) => statSync(new URL(f, dir)).isDirectory()).sort();
  const listed = WORLD_LIST.map((w) => w.id).sort();
  if (folders.join() !== listed.join()) fail(`world folders [${folders}] differ from WORLD_LIST [${listed}]`);
  for (const meta of WORLD_LIST) {
    const w = await loadWorld(meta.id);
    if (w.id !== meta.id) fail(`loadWorld('${meta.id}') gave '${w.id}'`);
    if (w.name !== meta.name || w.icon !== meta.icon) fail(`${meta.id}: WORLD_LIST name/icon differ from the world's`);
    if (!w.blurb) fail(`${meta.id}: no blurb`);
    if (!SFX_NAMES.includes(`world-${meta.id}` as (typeof SFX_NAMES)[number])) fail(`${meta.id}: no sample sound world-${meta.id} in sfx.ts`);
  }
  console.log(`✓ ${WORLD_LIST.length} worlds registered, each loads and has a sample sound`);
}

// Heroes: a hero for every world, a name for every gender, parts that render, colours only from
// the --hero-* variables (no literal colours in the SVG).
{
  for (const w of WORLDS.slice(1)) {
    if (!w.hero) {
      fail(`${w.id}: no hero`);
      continue;
    }
    for (const g of ['boy', 'girl', 'other', undefined] as const) {
      const n = w.hero.name(g);
      if (!n) fail(`${w.id}: hero has no name for ${g}`);
      const parts = w.hero.parts(g);
      if (!parts.torso || !parts.hair || !parts.prop) fail(`${w.id}: hero parts missing for ${g}`);
      // Build the SVG tree (no DOM here): throws if a part is broken.
      const tree = Hero({ def: w.hero, gender: g });
      if (!tree || tree.type !== 'svg') fail(`${w.id}: hero does not render an <svg> for ${g}`);
    }
    // A male and a female form ("חלוץ" / "חלוצה", "נסיך הפיות" / "פיית הקסם").
    if (w.hero.name('boy') === w.hero.name('girl')) fail(`${w.id}: the hero should have different names for a boy and a girl`);
  }
  // Every file of every world (hero, boss, map scenery) and the shared parts: CSS variables only.
  const files: string[] = ['../../src/fx/Hero.tsx', '../../src/worlds/bossParts.tsx', '../../src/screens/quest/art.tsx'];
  for (const w of WORLD_LIST) {
    for (const f of readdirSync(new URL(`../../src/worlds/${w.id}/`, import.meta.url))) files.push(`../../src/worlds/${w.id}/${f}`);
  }
  for (const f of files) {
    const code = readFileSync(new URL(f, import.meta.url), 'utf8');
    const literal = /(fill|stroke|stop-color)=["'](#[0-9a-f]{3,8}|rgba?\(|hsla?\(|white|black)/i.exec(code);
    if (literal) fail(`${f} uses a literal colour (${literal[0]}); use CSS variables`);
  }
  console.log('✓ heroes: every world, every gender, colours from variables');
}

// The :root defaults in styles.css must equal BASE (otherwise the base look and the previews differ).
{
  const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
  const lightBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  const darkStart = css.indexOf(':root {', css.indexOf('@media (prefers-color-scheme: dark)'));
  const darkBlock = css.slice(darkStart, css.indexOf('}', darkStart));
  for (const [mode, block] of [
    ['light', lightBlock],
    ['dark', darkBlock]
  ] as const) {
    for (const [k, v] of Object.entries(BASE[mode])) {
      const m = new RegExp(`--${k}:\\s*([^;]+);`).exec(block);
      if (!m) fail(`styles.css ${mode}: --${k} missing`);
      else if (m[1].trim().toLowerCase() !== v.toLowerCase()) fail(`styles.css ${mode}: --${k} is ${m[1]} but base.ts says ${v}`);
    }
  }
  console.log('✓ styles.css defaults match the base world');
}

// Feedback mapping: every event type has samples, and every sample maps in every world.
{
  const covered = new Set(SAMPLE_EVENTS.map((e) => e.type));
  for (const t of FEEDBACK_TYPES) if (!covered.has(t)) fail(`feedback event "${t}" has no sample in SAMPLE_EVENTS`);
  for (const w of WORLDS) {
    for (const e of SAMPLE_EVENTS) {
      const plan = planFor(e, w);
      const what = `${w.id}: ${JSON.stringify(e)}`;
      if (plan.sound !== null && !SFX_NAMES.includes(plan.sound)) fail(`${what} → unknown sound ${plan.sound}`);
      if (plan.hero !== null && !HERO_STATES.includes(plan.hero)) fail(`${what} → unknown hero mood ${plan.hero}`);
      const skipped = e.type === 'roundDone' && e.skipped;
      const explaining = EXPLAIN_TYPES.includes(e.type);
      const teaching = TEACHING_TYPES.includes(e.type);
      const companion = COMPANION_TYPES.includes(e.type);
      if (!plan.sound && !skipped && !explaining) fail(`${what} → no sound`);
      if (explaining && plan.sound) fail(`${what} → a sound while the hero speaks`);
      if (e.type !== 'tap' && !teaching && !companion && !plan.hero) fail(`${what} → the hero does not react`);
      if ((teaching || companion) && plan.hero) fail(`${what} → should leave the hero's mood alone`);
    }
    // The world's own sound for everything its pack has (the director asks by name).
    for (const e of SAMPLE_EVENTS) {
      const plan = planFor(e, w);
      if (w.sounds && plan.sound && (PACK_REQUIRED as readonly string[]).includes(plan.sound) && !w.sounds[plan.sound as keyof typeof w.sounds]) fail(`${w.id}: ${e.type} → ${plan.sound} is not in the world's pack`);
      if (plan.particles && !PARTICLE_KINDS.includes(plan.particles.kind)) fail(`${w.id}: ${e.type} → unknown particles ${plan.particles.kind}`);
    }
  }
  // Bigger celebration for a longer streak; a skipped round is quiet; no stars → no fanfare.
  if (planFor({ type: 'correct', streak: 1 }, BASE).hero !== 'happy' || planFor({ type: 'correct', streak: 3 }, BASE).hero !== 'cheer') fail('correct: happy, then cheer from 3 in a row');
  if ((planFor({ type: 'correct', streak: 5 }, BASE).particles?.count ?? 0) <= (planFor({ type: 'correct', streak: 1 }, BASE).particles?.count ?? 0)) fail('correct: more sparkles for a longer streak');
  if (planFor({ type: 'wrong', attempt: 1 }, BASE).motion !== 'shake' || planFor({ type: 'wrong', attempt: 1 }, BASE).hero !== 'oops') fail('wrong: a shake and oops');
  if (planFor({ type: 'roundDone', stars: 2, skipped: true }, BASE).sound !== null) fail('a skipped celebration should be quiet');
  if (planFor({ type: 'roundDone', stars: 0 }, BASE).sound === 'fanfare') fail('no fanfare for no stars');
  for (const st of HERO_STATES) if (st !== 'idle' && !(MOOD_MS[st] > 0 && MOOD_MS[st] <= 3000)) fail(`hero mood ${st} lasts ${MOOD_MS[st]}ms`);
  // The quest map: the hero walks for as long as the walk, a station opens in a burst of light,
  // the chest rattles then opens with its prize flying out, hits make the hero attack and the
  // boss tremble (a higher note each time), a dodge is gentle, the win is the biggest party.
  const walk = planFor({ type: 'walk', steps: 5, ms: 2100 }, BASE);
  if (walk.hero !== 'walk' || walk.heroMs !== 2100) fail('walk: the hero walks for the length of the walk ' + JSON.stringify(walk));
  const unlock = planFor({ type: 'unlock' }, BASE);
  if (unlock.sound !== 'unlock' || !unlock.particles || unlock.particles.at !== 'el' || unlock.particles.count < 30) fail('unlock: a burst of light at the station ' + JSON.stringify(unlock));
  if (planFor({ type: 'locked' }, BASE).sound === 'wrong') fail('a closed station is not a mistake');
  if (planFor({ type: 'chestShake' }, BASE).motion !== 'wobble') fail('the chest should rattle');
  if (planFor({ type: 'chestOpen', prize: '🌈' }, BASE).fly !== '🌈') fail('the prize should fly out of the chest');
  const hit = planFor({ type: 'bossHit', n: 2, left: 6 }, BASE);
  if (hit.hero !== 'attack' || hit.motion !== 'tremble' || hit.sound !== 'hit') fail('bossHit: attack + tremble ' + JSON.stringify(hit));
  const dodge = planFor({ type: 'bossDodge' }, BASE);
  if (dodge.motion !== 'dodge' || dodge.particles) fail('bossDodge: a gentle slip aside');
  const won = planFor({ type: 'bossDefeated', stars: 2 }, BASE);
  if (won.sound !== 'victory' || won.particles?.at !== 'screen' || (won.particles?.count ?? 0) <= (planFor({ type: 'roundDone', stars: 3 }, BASE).particles?.count ?? 0)) fail('bossDefeated should be the biggest celebration');
  for (let n = 1; n < 8; n++) if (!(hitPitch(n + 1) > hitPitch(n))) fail(`hit pitch does not climb at ${n + 1}`);
  console.log(`✓ feedback: ${FEEDBACK_TYPES.length} events mapped in ${WORLDS.length} worlds, real sounds and hero moods`);
}

// Sounds: every sound builds valid voices with any options – shared and every world's pack;
// pitches climb.
const WAVES = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];
/** The first broken voice, or null. */
function badVoice(tones: Tone[]): Tone | null {
  for (const t of tones) {
    const bad =
      !WAVES.includes(t.wave) ||
      !(t.len > 0 && t.len < 3) ||
      !(t.at >= 0 && t.at < 3) ||
      !(t.vol > 0 && t.vol <= 1) ||
      (t.wave !== 'noise' && !(t.freq! > 20 && t.freq! < 12000)) ||
      (t.to !== undefined && !(t.to > 20 && t.to < 12000)) ||
      (t.filter !== undefined && !(t.filter.freq > 20 && t.filter.freq < 20000 && (t.filter.to === undefined || (t.filter.to > 20 && t.filter.to < 20000))));
    if (bad) return t;
  }
  return null;
}
{
  const opts = [{}, { step: 0 }, { step: 1 }, { step: 3 }, { step: 12 }, { step: 25 }];
  for (const w of WORLDS) {
    for (const name of SFX_NAMES) {
      for (const o of opts) {
        const tones = tonesFor(name, o, w.sounds);
        if (!tones.length) fail(`${w.id}: sound ${name} ${JSON.stringify(o)} has no voices`);
        const bad = badVoice(tones);
        if (bad) {
          fail(`${w.id}: sound ${name} ${JSON.stringify(o)}: bad voice ${JSON.stringify(bad)}`);
          break;
        }
      }
    }
  }
  for (let s = 1; s < 10; s++) if (!(comboPitch(s + 1) > comboPitch(s))) fail(`combo pitch does not climb at streak ${s + 1}`);
  if (comboPitch(30) !== comboPitch(10)) fail('combo pitch should stop climbing after ten');
  if (!(starPitch(1) < starPitch(2) && starPitch(2) < starPitch(3))) fail('star notes should climb');
  const wrong = tonesFor('wrong');
  if (wrong.some((t) => t.wave === 'square' || t.wave === 'sawtooth' || (t.freq ?? 0) > 600)) fail('"wrong" should be soft and low (no buzzer)');
  // Teaching sounds: counting climbs one note per item, a hop sounds the number it lands on.
  for (let n = 1; n < 10; n++) if (!(countPitch(n + 1) > countPitch(n))) fail(`count pitch does not climb at ${n + 1}`);
  for (let n = 0; n < 10; n++) if (!(jumpPitch(n + 1) > jumpPitch(n))) fail(`jump pitch does not climb at ${n + 1}`);
  // Phase 7: inside a ten on a long line the hops of one climb; tens leap higher and higher; the clock ticks climb.
  for (const t of [10, 30, 90]) for (let n = t + 1; n < t + 10; n++) if (!(jumpPitch(n + 1) > jumpPitch(n))) fail(`jump pitch does not climb at ${n + 1}`);
  for (let n = 10; n < 100; n += 10) if (!(leapPitch(n + 10) > leapPitch(n))) fail(`leap pitch does not climb at ${n + 10}`);
  for (let n = 1; n < 11; n++) if (!(tickPitch(n + 1) > tickPitch(n))) fail(`tick pitch does not climb at ${n + 1}`);
  for (const n of ['leap', 'tick', 'clink'] as const) if (!TEACHING_SOUNDS.includes(n)) fail(`${n} is a teaching sound`);
  const first = (name: SfxName, step: number) => tonesFor(name, { step }).find((t) => t.at === 0 && t.wave !== 'noise')!.freq!;
  if (!(first('count', 2) > first('count', 1) && first('count', 8) > first('count', 7))) fail('the "count" sound does not climb with step');
  const landing = (step: number) => tonesFor('jump', { step }).filter((t) => t.at > 0)[0].freq!;
  if (!(landing(6) > landing(5) && landing(0) < landing(1))) fail('the "jump" sound does not follow the number landed on');
  if (tonesFor('ten').filter((t) => t.wave !== 'noise').length < 3) fail('"ten" should be a chord');
  if (!tonesFor('whoosh').some((t) => t.wave === 'noise')) fail('"whoosh" should be air (noise)');
  const stepL = JSON.stringify(tonesFor('step', { step: 1 }));
  if (stepL === JSON.stringify(tonesFor('step', { step: 2 }))) fail('left and right footsteps should differ a little');
  if (tonesFor('locked').some((t) => (t.freq ?? 0) > 600 || t.wave === 'square' || t.wave === 'sawtooth')) fail('"locked" should be soft knocks, no buzzer');
  if (tonesFor('dodge').some((t) => t.vol > 0.2)) fail('"dodge" should be quiet');
  const need: SfxName[] = ['click', 'correct', 'wrong', 'hint', 'star', 'fanfare', 'count', 'jump', 'ten', 'whoosh', 'step', 'unlock', 'locked', 'chestShake', 'chestOpen', 'bossAppear', 'hit', 'dodge', 'victory'];
  for (const n of need) if (!SFX_NAMES.includes(n)) fail(`missing sound ${n}`);
  console.log(`✓ sounds: ${SFX_NAMES.length} sounds build valid voices (shared and in every world's pack); combo, star, count and jump pitches climb; ten chord; soft "wrong"`);
}

// ---------- Phase 5: every world in full ----------
{
  const PLAY = WORLDS.slice(1);
  const oneSentence = (t: string) => !!t && !/[^\s][.!?]\s+\S.*[.!?]$/.test(t) && !hasPlaceholders(t);
  const firstPitch = (tones: Tone[]) => tones.find((t) => t.at === 0 && t.wave !== 'noise')?.freq ?? 0;
  const walks = new Set<string>();
  const attacks = new Set<string>();
  const flies = new Set<string>();
  const looks = new Set<string>();
  const rewardIds = new Set<string>();
  const bossNames = new Set<string>();
  for (const w of PLAY) {
    const where = (x: string) => `${w.id}: ${x}`;
    // Feedback: its own particles and token for a right answer, a word on a streak.
    if (!w.fx) fail(where('no feedback mapping (fx)'));
    const c1 = planFor({ type: 'correct', streak: 1 }, w);
    const c4 = planFor({ type: 'correct', streak: 4 }, w);
    const shared = planFor({ type: 'correct', streak: 1 });
    if (c1.fly === shared.fly && c1.particles?.kind === shared.particles?.kind) fail(where('a right answer looks like the shared one'));
    if (!c4.word) fail(where('no word pops on a streak'));
    if (c1.word) fail(where('a word pops on every answer (keep it for streaks)'));
    if (c1.fly) flies.add(c1.fly);
    const coin = planFor({ type: 'coin', n: 3 }, w);
    if (!w.coin || coin.fly !== w.coin.icon) fail(where(`the coin that flies (${coin.fly}) is not the world's coin (${w.coin?.icon})`));
    // Sounds: a full pack, its own, climbing where the shared one climbs; teaching sounds untouched.
    if (!w.sounds) fail(where('no SoundPack'));
    else {
      for (const n of PACK_REQUIRED) if (!w.sounds[n]) fail(where(`the pack has no "${n}"`));
      for (const n of TEACHING_SOUNDS) if ((w.sounds as Record<string, unknown>)[n]) fail(where(`the pack replaces the teaching sound "${n}"`));
      for (const n of PACK_REQUIRED) if (JSON.stringify(tonesFor(n, { step: 2 }, w.sounds)) === JSON.stringify(sharedTones(n, { step: 2 }))) fail(where(`"${n}" sounds just like the shared one`));
      for (let s = 1; s < 10; s++) if (!(firstPitch(tonesFor('correct', { step: s + 1 }, w.sounds)) > firstPitch(tonesFor('correct', { step: s }, w.sounds)))) fail(where(`"correct" does not climb at ${s + 1}`));
      for (let s = 1; s < 3; s++) if (!(firstPitch(tonesFor('star', { step: s + 1 }, w.sounds)) > firstPitch(tonesFor('star', { step: s }, w.sounds)))) fail(where(`"star" does not climb at ${s + 1}`));
      const wrong = tonesFor('wrong', {}, w.sounds);
      if (wrong.some((t) => t.wave === 'square' || t.wave === 'sawtooth' || (t.freq ?? 0) > 600)) fail(where('"wrong" should stay soft and low'));
      if (JSON.stringify(tonesFor('step', { step: 1 }, w.sounds)) === JSON.stringify(tonesFor('step', { step: 2 }, w.sounds))) fail(where('left and right footsteps should differ a little'));
    }
    // Music: a loop of its own.
    if (!w.music) fail(where('no music'));
    else {
      const loop = await w.music();
      if (!(loop.bpm >= 60 && loop.bpm <= 160)) fail(where(`music at ${loop.bpm} bpm`));
      if (!(loop.steps >= 16 && loop.steps <= 64 && loop.steps % 4 === 0)) fail(where(`music loop of ${loop.steps} steps`));
      if (!loop.parts.length) fail(where('music without a tune'));
      let notes = 0;
      for (const part of loop.parts) {
        const tokens = partTokens(part);
        if (tokens.length !== loop.steps) fail(where(`a ${part.voice} line of ${tokens.length} steps in a loop of ${loop.steps}`));
        if (!(part.vol > 0 && part.vol <= 0.5)) fail(where(`a ${part.voice} line at volume ${part.vol}`));
        for (const t of tokens) {
          if (t === '.') continue;
          const m = noteMidi(t);
          if (m === null || m < 33 || m > 96) fail(where(`music note "${t}" out of range`));
          else {
            notes++;
            const bad = badVoice(voiceTones(part.voice, 440 * 2 ** ((m - 69) / 12), (60 / loop.bpm / 4) * (part.len ?? 1), part.vol));
            if (bad) fail(where(`music voice ${part.voice}: bad ${JSON.stringify(bad)}`));
          }
        }
      }
      if (notes < 8) fail(where(`only ${notes} notes of music`));
      for (const [d, line] of Object.entries(loop.drums ?? {})) {
        if (line.length !== loop.steps || /[^x.]/.test(line)) fail(where(`drum line ${d} "${line}"`));
        if (badVoice(drumTones(d as Parameters<typeof drumTones>[0]))) fail(where(`drum ${d} has a bad voice`));
      }
    }
    // The hero walks and attacks its own way.
    const h = w.hero!;
    if (!h.walk || !WALK_STYLES.includes(h.walk)) fail(where(`walk "${h.walk}"`));
    if (!h.attack || !ATTACK_STYLES.includes(h.attack)) fail(where(`attack "${h.attack}"`));
    walks.add(h.walk ?? '');
    attacks.add(h.attack ?? '');
    const tree = Hero({ def: h, gender: 'girl' });
    const cls = String((tree?.props as { class?: string })?.class ?? '');
    if (!cls.includes(`walk-${h.walk}`) || !cls.includes(`atk-${h.attack}`)) fail(where(`the hero's classes "${cls}" miss its walk/attack`));
    // A boss of its own.
    const boss = w.bosses?.[0];
    if (!boss) fail(where('no boss'));
    else {
      if (!boss.name || bossNames.has(boss.name)) fail(where(`boss name "${boss.name}"`));
      bossNames.add(boss.name);
      if (!oneSentence(boss.intro)) fail(where(`the boss's intro should be one sentence: "${boss.intro}"`));
      if (!boss.intro.includes(boss.name)) fail(where("the boss's intro does not name it"));
      for (const state of ['idle', 'beaten'] as const) {
        const outer = boss.Art({ state }) as { type: (p: unknown) => { type: string; props: { class: string } }; props: unknown } | null;
        const svg = outer && typeof outer.type === 'function' ? outer.type(outer.props) : (outer as unknown as { type: string; props: { class: string } } | null);
        if (!svg || svg.type !== 'svg' || !svg.props.class.includes(`is-${state}`)) fail(where(`the boss does not render an <svg> (${state})`));
      }
    }
    // The map and Pop in its dress.
    const skin = w.mapSkin;
    if (!skin) fail(where('no map skin'));
    else {
      if (!skin.Scenery({ width: 360, height: 1800 })) fail(where('the map scenery renders nothing'));
      if (!skin.sectionIcons.length || !skin.node || !skin.path) fail(where('map skin incomplete'));
    }
    const look = w.templateSkins?.pop.look;
    if (!look) fail(where('no Pop skin'));
    else looks.add(look);
    // Phase 7: every game template in the world's dress (its own look), and its shop's things.
    for (const t of TEMPLATE_IDS) {
      const sk = w.templateSkins?.[t];
      if (!sk?.look) fail(where(`no ${t} skin`));
      else {
        templateLooks[t] ??= new Set();
        if (templateLooks[t].has(sk.look)) fail(where(`the ${t} look "${sk.look}" is another world's`));
        templateLooks[t].add(sk.look);
        if (sk.look !== 'magic' && !css.includes(`.skin-${sk.look}`)) fail(where(`no CSS for the ${t} look .skin-${sk.look}`));
      }
    }
    if (!w.templateSkins?.match?.deco) fail(where('no picture on the Match card backs'));
    const things = w.vocabulary?.thing ?? [];
    if (things.length < 2 || w.templateSkins?.shop?.icons?.length !== things.length) fail(where('the shop needs an icon for every thing for sale'));
    // The story, the words, the coin, the rewards.
    for (const t of w.story?.chapters ?? []) if (!oneSentence(t)) fail(where(`the chapter story should be one sentence: "${t}"`));
    if (!w.story?.chapters.length) fail(where('no chapter story'));
    if (!w.vocabulary?.items.length || !w.vocabulary.place.length) fail(where('no words for word problems'));
    if (!w.coin?.icon || !w.coin.name) fail(where('no coin'));
    const rw = w.rewards ?? [];
    if (rw.length < 4) fail(where(`${rw.length} rewards`));
    if (new Set(rw.map((r) => r.icon)).size !== rw.length) fail(where('two rewards look the same'));
    for (const r of rw) {
      if (!r.id || !r.icon || !r.name || rewardIds.has(r.id)) fail(where(`reward ${JSON.stringify(r)}`));
      rewardIds.add(r.id);
    }
    // Word problems: filled for every gender, nothing left in {…}, the world's own words.
    for (const g of ['boy', 'girl', 'other', undefined] as const) {
      const words = storyWords(w, g);
      let hero = 0;
      for (let seed = 0; seed < 300; seed++) {
        const q = makeQuestion('story.within10', 1 + (seed % 2), seed);
        const f = fillQuestion(q, words);
        if (hasPlaceholders(f.prompt.text) || hasPlaceholders(f.prompt.speech)) {
          fail(where(`${g}: placeholders left in "${f.prompt.text}"`));
          break;
        }
        if (!w.vocabulary!.items.some((x) => f.prompt.text.includes(x))) fail(where(`"${f.prompt.text}" has none of the world's words`));
        if (q.prompt.text.includes('{hero}')) {
          hero++;
          if (!f.prompt.text.includes(w.hero!.name(g))) fail(where(`${g}: the hero's name is missing in "${f.prompt.text}"`));
        }
      }
      if (!hero) fail(where('no story with the hero'));
    }
  }
  if (walks.size !== PLAY.length) fail(`the heroes share walks: ${[...walks]}`);
  if (attacks.size !== PLAY.length) fail(`the heroes share attacks: ${[...attacks]}`);
  if (flies.size !== PLAY.length) fail(`worlds share the token of a right answer: ${[...flies]}`);
  if (looks.size !== PLAY.length) fail(`worlds share a Pop skin: ${[...looks]}`);
  console.log(`✓ ${PLAY.length} worlds in full: own feedback (particles, token, streak word), complete sound packs, music loops, walks and attacks, bosses, map and Pop skins, story, coins, rewards, word problems for every gender`);
}

// Narration text.
const SPEECH: [string, string][] = [
  ['7 + 5 = 12', '7 ועוד 5 שווה 12'],
  ['9 - 4 = ?', '9 פחות 4 שווה כמה'],
  ['2+3+4', '2 ועוד 3 ועוד 4'],
  ['3 × 4', '3 כפול 4'],
  ['12 ÷ 3', '12 חלקי 3'],
  ['? + 2 = 5', 'כמה ועוד 2 שווה 5'],
  ['כל הכבוד! ⭐🎉', 'כל הכבוד!'],
  ['כמה זה 4 + 4?', 'כמה זה 4 ועוד 4?'],
  ['השעה 10:30', 'השעה 10:30'],
  ['8 > 3', '8 גדול מ-3']
];
for (const [input, want] of SPEECH) {
  const got = cleanForSpeech(input);
  if (got !== want) fail(`cleanForSpeech("${input}") = "${got}", expected "${want}"`);
}
// The pace of explanations without a voice: longer sentences take longer, within limits.
if (!(readingMs('יוצא 6.') >= 1400 && readingMs('יוצא 6.') < readingMs('מתחילים מ-4 וסופרים עוד 2: 5, 6.'))) fail('readingMs should grow with the sentence');
if (readingMs('א'.repeat(500)) > 6500 || readingMs('⭐') !== 0) fail('readingMs limits');
console.log('✓ narration text and pace');

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall world checks passed');
