// A world as data (docs/ARCHITECTURE.md §5): its look (CSS custom properties for light and dark
// mode), its hero, and – from phase 5 – everything that makes it feel like its own place: its
// feedback mapping and sounds, its music, its boss, its map and game skins, a short story, the
// words for word problems, its coin and what can be collected there.
// Each world lives in src/worlds/<id>/ as its own lazy chunk (the music is a further chunk).
import type { ComponentType } from 'preact';
import type { HeroDef } from '../fx/Hero';
import type { WorldFx } from '../fx/director';
import type { SoundPack } from '../audio/sfx';
import type { MusicLoop } from '../audio/music';
import type { Vocabulary } from '../core/story';

/** CSS custom properties without the leading "--", e.g. { bg: '#fff', brand: '#4c35b5' }. */
export type WorldVars = Record<string, string>;

export type WorldId = 'base' | 'fairies' | 'football' | 'basketball' | 'ninja' | 'blocks' | 'stage';

/** A boss's picture: `state` idle (floating about) or beaten (it spins away). */
export type BossArtProps = { class?: string; state?: 'idle' | 'beaten' };

/** A chapter boss in a world's dress: the same station and battle (screens/Boss.tsx), its own look. */
export interface BossDef {
  id: string;
  /** "מכשפת הערפל" */
  name: string;
  /** One sentence before the battle (read aloud). */
  intro: string;
  /** Original SVG, colours from CSS variables only. */
  Art: ComponentType<BossArtProps>;
}

/** The node shapes and path styles the map knows (CSS `.skin-<…>`). */
export type NodeShape = 'round' | 'petal' | 'ball' | 'square' | 'tile' | 'gem';
export type PathStyle = 'sparkle' | 'chalk' | 'court' | 'stones' | 'blocks' | 'neon';

/** The quest map in a world's dress. */
export interface MapSkin {
  /** Scenery behind the path, drawn in map units (width × height), CSS variables only. */
  Scenery: ComponentType<{ width: number; height: number }>;
  node: NodeShape;
  path: PathStyle;
  /** An icon for each section banner, in order (repeats if there are more sections). */
  sectionIcons: string[];
}

/**
 * A game template in a world's dress (CSS `.skin-<look>` on the template): Pop's answers (magic
 * bubbles, balls, hoops…), Jump's platforms, Build's pieces, Match's card backs (`deco` on the
 * back), the Clock's face, the Shop's stall (`icons` for the world's things for sale, in the
 * order of World.vocabulary.thing). Every look is the world's own (tests/worlds/check.ts).
 */
export interface TemplateSkin {
  look: string;
  /** An emoji drawn on it (a card's back). */
  deco?: string;
  /** Shop: an icon for each of the world's things for sale (vocabulary.thing). */
  icons?: string[];
}

export type { TemplateId } from '../core/types';
import type { TemplateId } from '../core/types';

/** Something to collect in a world (chests, beaten bosses); kept per world. */
export interface Collectible {
  /** Stable: saved in the inventory. */
  id: string;
  icon: string;
  name: string;
}

export interface WorldStory {
  /** One sentence per chapter, read on the map (ages 5–7: one sentence). */
  chapters: string[];
}

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
  // Phase 5 – every play world has all of these (tests/worlds/check.ts); the base look has none.
  /** Feedback mapping on top of the shared one (fx/director.ts). */
  fx?: WorldFx;
  /** The world's sounds (audio/sfx.ts falls back to the shared ones). */
  sounds?: SoundPack;
  /** The background loop, a chunk of its own. */
  music?: () => Promise<MusicLoop>;
  bosses?: BossDef[];
  mapSkin?: MapSkin;
  templateSkins?: Record<TemplateId, TemplateSkin>;
  story?: WorldStory;
  /** Words for word problems (core/story.ts). */
  vocabulary?: Vocabulary;
  /** The world's coin: what flies to the purse. */
  coin?: { icon: string; name: string };
  /** What can be collected here, in the order it is given. */
  rewards?: Collectible[];
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
  'hero-light',
  // The quest map (phase 5): its ground, and the scenery drawn on it.
  'map-bg',
  'map-deco',
  // Coins (phase 7): the metals and the value written on them.
  'coin-gold',
  'coin-silver',
  'coin-ink'
] as const;
