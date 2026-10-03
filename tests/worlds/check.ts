// World and narration checks that need no browser:
//   bun --tsconfig-override=<tsconfig with preact paths> tests/worlds/check.ts
// - every world sets the required variables, in light and dark;
// - text contrast is at least 4.5:1 (WCAG AA), big playful numbers at least 3:1;
// - the base world matches the :root defaults in src/styles.css (light and dark);
// - text for the voice has no emoji, and math signs are read in Hebrew.
// Phase 1 adds the four worlds to WORLDS; later phases check sounds and feedback mapping too.
import { readFileSync } from 'node:fs';
import { BASE } from '../../src/worlds/base';
import { REQUIRED_VARS, type WorldTheme, type WorldVars } from '../../src/worlds/types';
import { cleanForSpeech } from '../../src/audio/speech';

const WORLDS: WorldTheme[] = [BASE];
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
  ['num-4', 'bg', 3, 'big number colour 4']
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
console.log(`✓ ${WORLDS.length} world(s): variables set, contrast OK`);

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
