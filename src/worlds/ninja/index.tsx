// 🥷 Ninja: a student in the dojo, masked, with a headband and a (soft, toy) throwing star.
// Sneaks along the map, throws the star at the shadow master; a blade's ring, a puff of smoke on
// a streak, taiko and flute. Its sounds, music, feedback, boss and map are here.
import { DefaultEyes, HERO as V, starPath, type HeroDef } from '../../fx/Hero';
import { byGender } from '../../profiles/profiles';
import type { WorldTheme } from '../types';
import { boss } from './boss';
import { fx } from './fx';
import { mapSkin } from './skin';
import { sounds } from './sounds';

const hero: HeroDef = {
  walk: 'sneak',
  attack: 'throw',
  name: (g) => byGender({ gender: g }, 'נינג׳ה צעיר', 'נינג׳ה צעירה'),
  parts: (g) => {
    const girl = g === 'girl';
    return {
      // Headband tails, flapping behind the head.
      back: (
        <g class="h-tails">
          <path d="M86 38 Q102 34 110 44 Q100 42 92 44 Z" fill={V.trim} />
          <path d="M86 40 Q100 46 104 58 Q96 50 89 46 Z" fill={V.trim} />
        </g>
      ),
      legs: (
        <>
          <rect x="46" y="112" width="12" height="36" rx="4" fill={V.main} />
          <rect x="62" y="112" width="12" height="36" rx="4" fill={V.main} />
          <ellipse cx="51" cy="149" rx="9" ry="5" fill={V.ink} />
          <ellipse cx="69" cy="149" rx="9" ry="5" fill={V.ink} />
        </>
      ),
      torso: (
        <>
          <path d="M42 82 Q60 76 78 82 L80 118 Q60 122 40 118 Z" fill={V.main} />
          <path d="M50 81 L60 99 L70 81" fill="none" stroke={V.prop} stroke-width="3" stroke-linejoin="round" />
          <rect x="40" y="103" width="40" height="7" rx="2" fill={V.trim} />
          <path d="M60 106 L54 118 M60 106 L66 118" stroke={V.trim} stroke-width="3.5" stroke-linecap="round" />
        </>
      ),
      // The hood covers the head; only a band around the eyes shows.
      face: (
        <>
          <circle cx="60" cy="50" r="30" fill={V.main} />
          <rect x="33" y="44" width="54" height="19" rx="9.5" fill={V.skin} />
          <DefaultEyes />
        </>
      ),
      hair: (
        <>
          {girl && <circle cx="60" cy="17" r="9" fill={V.hair} />}
          <path d="M30.5 36 Q60 27 89.5 36 L89 43 Q60 34 31 43Z" fill={V.trim} />
          <circle cx="88" cy="40" r="4" fill={V.trim} />
        </>
      ),
      prop: (
        <g class="h-spin">
          <path d={starPath(0, -2, 11, 4, 0.35)} fill={V.prop} stroke={V.ink} stroke-width="1.2" stroke-linejoin="round" />
          <circle cx="0" cy="-2" r="2.5" fill={V.ink} />
        </g>
      ),
      propAt: 'hand'
    };
  }
};

export const world: WorldTheme = {
  id: 'ninja',
  name: 'נינג׳ה',
  icon: '🥷',
  blurb: 'אימון בדוג׳ו, מחגורה לבנה לשחורה',
  hero,
  fx,
  sounds,
  music: () => import('./music').then((m) => m.loop),
  bosses: [boss],
  mapSkin,
  templateSkins: { pop: { look: 'target' }, jump: { look: 'roofs' }, build: { look: 'bamboo' }, match: { look: 'scroll', deco: '📜' }, clock: { look: 'gong' }, shop: { look: 'market', icons: ['✴️', '📜', '🏮'] } },
  story: { chapters: ['בדוג׳ו מתאמנים לקראת מאסטר הצל, ומתחילים בחגורה לבנה!'] },
  vocabulary: { items: ['כוכבי נינג׳ה', 'מגילות', 'פנסי נייר'], place: ['בדוג׳ו', 'בגן הבמבוק'], thing: ['כוכב נינג׳ה', 'מגילה', 'פנס נייר'] },
  coin: { icon: '🍙', name: 'כדורי אורז' },
  rewards: [
    { id: 'n-belt-yellow', icon: '🟨', name: 'חגורה צהובה' },
    { id: 'n-belt-orange', icon: '🟧', name: 'חגורה כתומה' },
    { id: 'n-lantern', icon: '🏮', name: 'פנס הדוג׳ו' },
    { id: 'n-belt-green', icon: '🟩', name: 'חגורה ירוקה' },
    { id: 'n-scroll', icon: '📜', name: 'מגילת סודות' },
    { id: 'n-belt-black', icon: '⬛', name: 'חגורה שחורה' }
  ],
  light: {
    bg: '#f4f3f7',
    surface: '#ffffff',
    'surface-2': '#e6e4ee',
    line: '#d3d0df',
    ink: '#1b1a24',
    'ink-soft': '#55526a',
    brand: '#b3261e',
    'brand-ink': '#ffffff',
    'brand-soft': '#f6e0de',
    accent: '#2b2d42',
    good: '#1f7a3a',
    danger: '#a3401c',
    'danger-ink': '#ffffff',
    'num-1': '#b3261e',
    'num-2': '#2a5bb8',
    'num-3': '#23744a',
    'num-4': '#a8510b',
    'hero-skin': '#f2c7a5',
    'hero-hair': '#1a1a22',
    'hero-main': '#2f3150',
    'hero-trim': '#d62828',
    'hero-prop': '#c3cad6',
    'hero-ink': '#111118',
    'hero-light': '#ffffff',
    'map-bg': '#ece8de',
    'map-deco': '#d9d1bf',
    'coin-gold': '#e3b23c',
    'coin-silver': '#c9ced6',
    'coin-ink': '#2a2418'
  },
  dark: {
    bg: '#121219',
    surface: '#1c1c26',
    'surface-2': '#262633',
    line: '#363648',
    ink: '#f0eff7',
    'ink-soft': '#b1aec6',
    brand: '#ff7a6e',
    'brand-ink': '#2a0906',
    'brand-soft': '#3a2226',
    accent: '#c9ccff',
    good: '#6fdc8c',
    danger: '#ffa07a',
    'danger-ink': '#1e0f0c',
    'num-1': '#ff7a6e',
    'num-2': '#82aaff',
    'num-3': '#6fdc8c',
    'num-4': '#ffb066',
    'hero-skin': '#f2c7a5',
    'hero-hair': '#2a2a36',
    'hero-main': '#454a7c',
    'hero-trim': '#ff4d4d',
    'hero-prop': '#d6dce6',
    'hero-ink': '#0b0b10',
    'hero-light': '#ffffff',
    'map-bg': '#15161f',
    'map-deco': '#252737',
    'coin-gold': '#d9a93a',
    'coin-silver': '#aab2bd',
    'coin-ink': '#1c1810'
  }
};
