// World and narration checks that need no browser:
//   bun --tsconfig-override=<tsconfig with preact paths> tests/worlds/check.ts
// - every world sets the required variables, in light and dark;
// - text contrast is at least 4.5:1 (WCAG AA), big playful numbers at least 3:1;
// - the base world matches the :root defaults in src/styles.css (light and dark);
// - text for the voice has no emoji, and math signs are read in Hebrew.
// - the four worlds are registered, each has a hero that renders for every gender, and a sample sound.
// - feedback: every event is mapped in every world (a real sound, a real hero mood), every sound
//   builds valid voices, the combo and star pitches climb, "wrong" is soft (no buzzer).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { BASE } from '../../src/worlds/base';
import { REQUIRED_VARS, type WorldTheme, type WorldVars } from '../../src/worlds/types';
import { WORLD_LIST, loadWorld } from '../../src/worlds/index';
import { world as fairies } from '../../src/worlds/fairies/index';
import { world as football } from '../../src/worlds/football/index';
import { world as basketball } from '../../src/worlds/basketball/index';
import { world as ninja } from '../../src/worlds/ninja/index';
import { Hero, HERO_STATES, MOOD_MS } from '../../src/fx/Hero';
import { SFX_NAMES, comboPitch, starPitch, tonesFor, type SfxName } from '../../src/audio/sfx';
import { FEEDBACK_TYPES, SAMPLE_EVENTS, planFeedback } from '../../src/fx/director';
import { cleanForSpeech } from '../../src/audio/speech';

const WORLDS: WorldTheme[] = [BASE, fairies, football, basketball, ninja];
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
  ['hero-light', 'hero-ink', 3, "the hero's eye shine"]
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
  }
}
console.log(`✓ ${WORLDS.length} worlds (base + 4) × light/dark: variables set, contrast OK`);

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
  const src = ['fairies', 'football', 'basketball', 'ninja'].map((id) => readFileSync(new URL(`../../src/worlds/${id}/index.tsx`, import.meta.url), 'utf8'));
  src.push(readFileSync(new URL('../../src/fx/Hero.tsx', import.meta.url), 'utf8'));
  for (const code of src) {
    const literal = /(fill|stroke)=["']#[0-9a-f]{3,8}["']/i.exec(code);
    if (literal) fail(`a hero uses a literal colour (${literal[0]}); use the --hero-* variables`);
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
      const plan = planFeedback(e, w.id);
      const what = `${w.id}: ${JSON.stringify(e)}`;
      if (plan.sound !== null && !SFX_NAMES.includes(plan.sound)) fail(`${what} → unknown sound ${plan.sound}`);
      if (plan.hero !== null && !HERO_STATES.includes(plan.hero)) fail(`${what} → unknown hero mood ${plan.hero}`);
      const skipped = e.type === 'roundDone' && e.skipped;
      if (!plan.sound && !skipped) fail(`${what} → no sound`);
      if (e.type !== 'tap' && !plan.hero) fail(`${what} → the hero does not react`);
    }
    // The world colours a right answer.
    const c = planFeedback({ type: 'correct', streak: 2 }, w.id);
    if (c.soundOpts?.flavor !== w.id) fail(`${w.id}: correct does not take the world's flavour`);
  }
  // Bigger celebration for a longer streak; a skipped round is quiet; no stars → no fanfare.
  if (planFeedback({ type: 'correct', streak: 1 }, 'base').hero !== 'happy' || planFeedback({ type: 'correct', streak: 3 }, 'base').hero !== 'cheer') fail('correct: happy, then cheer from 3 in a row');
  if ((planFeedback({ type: 'correct', streak: 5 }, 'base').particles?.count ?? 0) <= (planFeedback({ type: 'correct', streak: 1 }, 'base').particles?.count ?? 0)) fail('correct: more sparkles for a longer streak');
  if (planFeedback({ type: 'wrong', attempt: 1 }, 'base').motion !== 'shake' || planFeedback({ type: 'wrong', attempt: 1 }, 'base').hero !== 'oops') fail('wrong: a shake and oops');
  if (planFeedback({ type: 'roundDone', stars: 2, skipped: true }, 'base').sound !== null) fail('a skipped celebration should be quiet');
  if (planFeedback({ type: 'roundDone', stars: 0 }, 'base').sound === 'fanfare') fail('no fanfare for no stars');
  for (const st of HERO_STATES) if (st !== 'idle' && !(MOOD_MS[st] > 0 && MOOD_MS[st] <= 3000)) fail(`hero mood ${st} lasts ${MOOD_MS[st]}ms`);
  console.log(`✓ feedback: ${FEEDBACK_TYPES.length} events mapped in ${WORLDS.length} worlds, real sounds and hero moods`);
}

// Sounds: every sound builds valid voices with any options; flavours differ; pitches climb.
{
  const WAVES = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];
  const opts = [{}, { step: 1 }, { step: 3 }, { step: 12 }, ...WORLDS.map((w) => ({ step: 2, flavor: w.id }))];
  for (const name of SFX_NAMES) {
    for (const o of opts) {
      const tones = tonesFor(name, o);
      if (!tones.length) fail(`sound ${name} ${JSON.stringify(o)} has no voices`);
      for (const t of tones) {
        const bad =
          !WAVES.includes(t.wave) ||
          !(t.len > 0 && t.len < 3) ||
          !(t.at >= 0 && t.at < 3) ||
          !(t.vol > 0 && t.vol <= 1) ||
          (t.wave !== 'noise' && !(t.freq! > 20 && t.freq! < 12000)) ||
          (t.to !== undefined && !(t.to > 20 && t.to < 12000));
        if (bad) {
          fail(`sound ${name} ${JSON.stringify(o)}: bad voice ${JSON.stringify(t)}`);
          break;
        }
      }
    }
  }
  const base = JSON.stringify(tonesFor('correct', { step: 1 }));
  for (const w of WORLDS.slice(1)) if (JSON.stringify(tonesFor('correct', { step: 1, flavor: w.id })) === base) fail(`${w.id}: "correct" sounds the same as the base`);
  for (let s = 1; s < 10; s++) if (!(comboPitch(s + 1) > comboPitch(s))) fail(`combo pitch does not climb at streak ${s + 1}`);
  if (comboPitch(30) !== comboPitch(10)) fail('combo pitch should stop climbing after ten');
  if (!(starPitch(1) < starPitch(2) && starPitch(2) < starPitch(3))) fail('star notes should climb');
  const wrong = tonesFor('wrong');
  if (wrong.some((t) => t.wave === 'square' || t.wave === 'sawtooth' || (t.freq ?? 0) > 600)) fail('"wrong" should be soft and low (no buzzer)');
  const need: SfxName[] = ['click', 'correct', 'wrong', 'hint', 'star', 'fanfare'];
  for (const n of need) if (!SFX_NAMES.includes(n)) fail(`missing sound ${n}`);
  console.log(`✓ sounds: ${SFX_NAMES.length} sounds build valid voices; world flavours; combo and star pitches climb; soft "wrong"`);
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
console.log('✓ narration text');

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall world checks passed');
