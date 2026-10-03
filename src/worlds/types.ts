// A world's look, as plain data: CSS custom properties for light and dark mode, and its hero.
// Adapted from ChessIt's themes. Each world lives in src/worlds/<id>/ as its own lazy chunk;
// later phases add sounds, music, map skin, rewards and feedback mapping
// (the full World interface is in docs/ARCHITECTURE.md §5).
import type { HeroDef } from '../fx/Hero';

/** CSS custom properties without the leading "--", e.g. { bg: '#fff', brand: '#4c35b5' }. */
export type WorldVars = Record<string, string>;

export type WorldId = 'base' | 'fairies' | 'football' | 'basketball' | 'ninja' | 'blocks' | 'stage';

export interface WorldTheme {
  id: WorldId;
  name: string;
  icon: string;
  /** One short line under the name in the picker. */
  blurb: string;
  /** Overrides of the variables in :root (src/styles.css). Unset variables keep the default. */
  light: WorldVars;
  dark: WorldVars;
  /** The world's hero (fx/Hero.tsx). The base look has none. */
  hero?: HeroDef;
}

/** Variables every world must set, so text and buttons stay readable (tests/worlds/check.ts). */
export const REQUIRED_VARS = [
  'bg',
  'surface',
  'surface-2',
  'line',
  'ink',
  'ink-soft',
  'brand',
  'brand-ink',
  'brand-soft',
  'accent',
  'good',
  'danger',
  'danger-ink',
  'num-1',
  'num-2',
  'num-3',
  'num-4',
  // The hero's colours (fx/Hero.tsx): skin, hair, outfit, trim, prop, outlines and eyes, highlights.
  'hero-skin',
  'hero-hair',
  'hero-main',
  'hero-trim',
  'hero-prop',
  'hero-ink',
  'hero-light'
] as const;
