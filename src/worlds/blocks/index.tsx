// 🧱 Blocks: a builder made of cubes – a square head, square hands – with a pickaxe, in a world
// of blocks to dig and gems to collect. An original character (no game's characters or names).
// Stomps along the map, swings the pickaxe at the cave creature; a block clicking into place, a
// gem on a streak, a calm chiptune. Its sounds, music, feedback, boss and map are here.
import { HERO as V, type HeroDef } from '../../fx/Hero';
import { byGender } from '../../profiles/profiles';
import type { WorldTheme } from '../types';
import { boss } from './boss';
import { fx } from './fx';
import { mapSkin } from './skin';
import { sounds } from './sounds';

const hero: HeroDef = {
  walk: 'stomp',
  attack: 'swing',
  name: (g) => byGender({ gender: g }, 'בנאי', 'בנאית'),
  parts: (g) => {
    const girl = g === 'girl';
    return {
      shape: 'blocky',
      // Long hair falls behind the square head, in blocks.
      hairBack: girl ? <rect x="27" y="28" width="66" height="64" rx="2" fill={V.hair} /> : undefined,
      legs: (
        <>
          <rect x="46" y="113" width="12" height="31" rx="1" fill={V.trim} />
          <rect x="62" y="113" width="12" height="31" rx="1" fill={V.trim} />
          <rect x="44" y="142" width="15" height="8" rx="1" fill={V.ink} />
          <rect x="61" y="142" width="15" height="8" rx="1" fill={V.ink} />
        </>
      ),
      torso: (
        <>
          <rect x="39" y="80" width="42" height="38" rx="2" fill={V.main} />
          <rect x="39" y="107" width="42" height="5" fill={V.trim} />
          <rect x="45" y="87" width="9" height="9" fill={V.trim} opacity="0.55" />
          <rect x="66" y="87" width="9" height="9" fill={V.trim} opacity="0.55" />
        </>
      ),
      // Square eyes with a square shine, block cheeks, a stepped smile.
      face: (
        <>
          <g class="h-eyes">
            <rect x="42" y="45" width="10" height="10" fill={V.ink} />
            <rect x="68" y="45" width="10" height="10" fill={V.ink} />
            <rect x="46" y="46" width="3" height="3" fill={V.light} />
            <rect x="72" y="46" width="3" height="3" fill={V.light} />
          </g>
          <rect x="35" y="60" width="9" height="6" fill={V.main} opacity="0.35" />
          <rect x="76" y="60" width="9" height="6" fill={V.main} opacity="0.35" />
          <rect x="51" y="62" width="4" height="4" fill={V.ink} />
          <rect x="55" y="65" width="10" height="4" fill={V.ink} />
          <rect x="65" y="62" width="4" height="4" fill={V.ink} />
        </>
      ),
      hair: (
        <>
          <rect x="31" y="19" width="58" height="14" rx="2" fill={V.hair} />
          <rect x="31" y="33" width="8" height={girl ? 30 : 11} fill={V.hair} />
          <rect x="81" y="33" width="8" height={girl ? 30 : 11} fill={V.hair} />
          <rect x="41" y="33" width="12" height="5" fill={V.hair} />
          <rect x="62" y="33" width="15" height="4" fill={V.hair} />
          {/* A block bow. */}
          {girl && (
            <>
              <rect x="72" y="11" width="10" height="10" rx="1" fill={V.prop} stroke={V.ink} stroke-width="1" />
              <rect x="82" y="13" width="8" height="8" rx="1" fill={V.prop} stroke={V.ink} stroke-width="1" />
            </>
          )}
        </>
      ),
      // A pickaxe with a golden head.
      prop: (
        <>
          <path d="M-2 5 L2 5 L8 -26 L4 -26 Z" fill={V.hair} stroke={V.ink} stroke-width="1" stroke-linejoin="round" />
          <path d="M-13 -24 L-5 -31 L17 -31 L25 -24 L25 -19 L16 -25 L-4 -25 L-13 -19 Z" fill={V.prop} stroke={V.ink} stroke-width="1.2" stroke-linejoin="round" />
        </>
      ),
      propAt: 'hand'
    };
  }
};

export const world: WorldTheme = {
  id: 'blocks',
  name: 'קוביות',
  icon: '🧱',
  blurb: 'בונים, חופרים ואוספים אבני חן',
  hero,
  fx,
  sounds,
  music: () => import('./music').then((m) => m.loop),
  bosses: [boss],
  mapSkin,
  templateSkins: { pop: { look: 'block' }, jump: { look: 'pillars' }, build: { look: 'brick' }, match: { look: 'crate', deco: '📦' }, clock: { look: 'pixel' }, shop: { look: 'mine', icons: ['⛏️', '🔦', '💎'] } },
  story: {
    chapters: [
      'בונים מחנה ליד המערה, וכל תשובה נכונה מוסיפה עוד בלוק!',
      'יורדים לקומה השנייה של המכרה, ושם בונים עד 20!',
      'במכרה העמוק יש מאה בלוקים – מסדרים אותם בעשרות!',
      'בתחנת המסחר קונים במטבעות, ושעון הלבה מתקתק!',
      'בונים את הטירה הגדולה מחשבון עד 100!'
    ]
  },
  vocabulary: { items: ['קוביות', 'אבני חן', 'לבנים'], place: ['במערה', 'במחנה'], thing: ['מכוש', 'פנס', 'יהלום'] },
  coin: { icon: '💠', name: 'אבני חן' },
  rewards: [
    { id: 'b-torch', icon: '🔦', name: 'פנס מערות' },
    { id: 'b-brick', icon: '🧱', name: 'לבנת זהב' },
    { id: 'b-map', icon: '🗺️', name: 'מפת אוצרות' },
    { id: 'b-key', icon: '🗝️', name: 'מפתח עתיק' },
    { id: 'b-crystal', icon: '🔮', name: 'גביש סגול' },
    { id: 'b-pick', icon: '⛏️', name: 'מכוש יהלום' }
  ],
  light: {
    bg: '#f2f6ec',
    surface: '#ffffff',
    'surface-2': '#e3ecd6',
    line: '#cbd9b8',
    ink: '#1d2416',
    'ink-soft': '#4c5a40',
    brand: '#2f6b2f',
    'brand-ink': '#ffffff',
    'brand-soft': '#e2efd9',
    accent: '#e0a526',
    good: '#1f7a3a',
    danger: '#a8442a',
    'danger-ink': '#ffffff',
    'num-1': '#b5452b',
    'num-2': '#2f6b9e',
    'num-3': '#2f7a2f',
    'num-4': '#8a5a1e',
    'hero-skin': '#f0c39b',
    'hero-hair': '#5c3a21',
    'hero-main': '#d9533c',
    'hero-trim': '#4a4f6b',
    'hero-prop': '#f2c14e',
    'hero-ink': '#1d1a17',
    'hero-light': '#ffffff',
    'map-bg': '#e4edd8',
    'map-deco': '#cbdbb7',
    'coin-gold': '#e3b23c',
    'coin-silver': '#c9ced6',
    'coin-ink': '#2a2418'
  },
  dark: {
    bg: '#151a12',
    surface: '#1f261b',
    'surface-2': '#29331f',
    line: '#3a4a2e',
    ink: '#eef5e6',
    'ink-soft': '#b5c4a6',
    brand: '#8fd17a',
    'brand-ink': '#10200c',
    'brand-soft': '#2c3d22',
    accent: '#f2c14e',
    good: '#6fdc8c',
    danger: '#ff8f7a',
    'danger-ink': '#1e0f0c',
    'num-1': '#ff8a6b',
    'num-2': '#7ab8ff',
    'num-3': '#8fd17a',
    'num-4': '#f2c14e',
    'hero-skin': '#f0c39b',
    'hero-hair': '#6e4729',
    'hero-main': '#e0614a',
    'hero-trim': '#5b6185',
    'hero-prop': '#f2c14e',
    'hero-ink': '#1d1a17',
    'hero-light': '#ffffff',
    'map-bg': '#181e14',
    'map-deco': '#273220',
    'coin-gold': '#d9a93a',
    'coin-silver': '#aab2bd',
    'coin-ink': '#1c1810'
  }
};
