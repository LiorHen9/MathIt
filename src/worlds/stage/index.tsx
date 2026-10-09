// 🎤 Stage stars: a singer who fights shadow demons with song – a sparkly jacket, a neon streak
// in the hair, and a glowing microphone held high. An original character (no band's characters
// or names).
// Dances along the map, sends a sound wave at the shadow demon; a synth chord, spotlights on a
// streak, upbeat pop. Its sounds, music, feedback, boss and map are here.
import { DefaultEyes, HERO as V, starPath, type HeroDef } from '../../fx/Hero';
import { byGender } from '../../profiles/profiles';
import type { WorldTheme } from '../types';
import { boss } from './boss';
import { fx } from './fx';
import { mapSkin } from './skin';
import { sounds } from './sounds';

const BANGS = 'M30 47 Q32 16 60 16 Q88 16 90 47 Q80 31 66 34 Q58 26 50 35 Q38 33 30 47Z';
const SWOOP = 'M29 48 Q27 15 60 14 Q92 15 91 44 Q84 30 70 31 Q58 22 44 30 Q34 34 29 48Z';

const hero: HeroDef = {
  walk: 'dance',
  attack: 'wave',
  // A sound wave: three arcs opening toward the boss.
  shot: (
    <g fill="none" stroke={V.trim} stroke-width="3.5" stroke-linecap="round">
      <path d="M2 -7 Q-4 0 2 7" />
      <path d="M-4 -13 Q-14 0 -4 13" />
      <path d="M-10 -19 Q-24 0 -10 19" />
    </g>
  ),
  name: (g) => byGender({ gender: g }, 'זמר לוחם', 'זמרת לוחמת', 'כוכב/ת הבמה'),
  parts: (g) => {
    const girl = g === 'girl';
    return {
      // A high ponytail that swings with the beat (girl); nothing behind for a boy.
      back: girl ? (
        <g class="h-tails">
          <path d="M80 26 Q104 22 108 46 Q110 70 98 86 Q100 62 92 46 Q88 36 80 34Z" fill={V.hair} />
          <path d="M96 40 Q102 56 99 74" fill="none" stroke={V.trim} stroke-width="3" stroke-linecap="round" />
        </g>
      ) : undefined,
      legs: (
        <>
          <rect x="47" y="114" width="10" height="28" rx="4" fill={girl ? V.skin : V.hair} />
          <rect x="63" y="114" width="10" height="28" rx="4" fill={girl ? V.skin : V.hair} />
          <rect x="44" y="138" width="15" height="13" rx="4" fill={V.main} />
          <rect x="61" y="138" width="15" height="13" rx="4" fill={V.main} />
          <rect x="44" y="138" width="15" height="3.5" rx="1.5" fill={V.trim} />
          <rect x="61" y="138" width="15" height="3.5" rx="1.5" fill={V.trim} />
        </>
      ),
      // A cropped stage jacket over a light top, a star on the chest.
      torso: (
        <>
          <path d="M42 82 Q60 76 78 82 L82 118 Q60 124 38 118 Z" fill={V.main} />
          <path d="M51 81 L60 97 L69 81 Z" fill={V.prop} />
          <path d="M40 113 Q60 119 80 113" fill="none" stroke={V.trim} stroke-width="3" stroke-linecap="round" />
          <path d={starPath(70, 100, 5)} fill={V.trim} />
        </>
      ),
      face: (
        <>
          <DefaultEyes />
          <circle cx="42" cy="63" r="4.5" fill={V.main} opacity="0.3" />
          <circle cx="78" cy="63" r="4.5" fill={V.main} opacity="0.3" />
          <path d="M53 65 Q60 72 67 65" fill="none" stroke={V.ink} stroke-width="2.6" stroke-linecap="round" />
          {/* A little star under the eye, stage make-up. */}
          <path d={starPath(80, 56, 3.2, 4, 0.4)} fill={V.trim} />
        </>
      ),
      hair: (
        <>
          <path d={girl ? BANGS : SWOOP} fill={V.hair} />
          {/* A neon streak. */}
          <path d={girl ? 'M44 22 Q38 30 36 42' : 'M50 18 Q44 24 40 34'} fill="none" stroke={V.trim} stroke-width="4" stroke-linecap="round" />
        </>
      ),
      // The microphone, held up, glowing.
      prop: (
        <>
          <circle class="h-sparkle" cx="7" cy="-27" r="12" fill={V.trim} opacity="0.35" />
          <line x1="0" y1="3" x2="5" y2="-20" stroke={V.ink} stroke-width="4.5" stroke-linecap="round" />
          <circle cx="7" cy="-27" r="7.5" fill={V.prop} stroke={V.ink} stroke-width="1.3" />
          <path d="M1.5 -29 H12.5 M2 -25 H12" stroke={V.ink} stroke-width="0.9" opacity="0.6" />
        </>
      ),
      propAt: 'raised'
    };
  }
};

export const world: WorldTheme = {
  id: 'stage',
  name: 'כוכבות הבמה',
  icon: '🎤',
  blurb: 'שרים, רוקדים ומגרשים שדי צל',
  hero,
  fx,
  sounds,
  music: () => import('./music').then((m) => m.loop),
  bosses: [boss],
  mapSkin,
  templateSkins: { pop: { look: 'spot' }, jump: { look: 'lights' }, build: { look: 'neon' }, match: { look: 'ticket', deco: '🎟️' }, clock: { look: 'disco' }, shop: { look: 'merch', icons: ['🎤', '🎸', '🎩'] }, slice: { look: 'slice-record' }, pattern: { look: 'pat-lights' }, speed: { look: 'speed-metronome' } },
  story: {
    chapters: [
      'שד הצל גנב את האורות מהבמה – רק שיר של מספרים יחזיר אותם!',
      'יוצאים לסיבוב הופעות, ושם שרים מספרים עד 20!',
      'באולם יש מאה כיסאות – סופרים אותם בעשרות!',
      'בדוכן המזכרות קונים במטבעות, ושעון ההופעה מתקתק!',
      'ההופעה הגדולה מתחילה – שרים מספרים עד 100!',
      'בחזרות רוקדים בשורות שוות – זה לוח הכפל!',
      'בקופה של האולם סופרים אלפי כרטיסים במאונך!',
      'בחגיגה שאחרי ההופעה חותכים עוגה לחלקים שווים!',
      'בעמדת התאורה מכוונים אורות במספרים עשרוניים!',
      'בונים במה חדשה ומודדים את השטח וההיקף שלה – זו ההופעה האחרונה!'
    ]
  },
  vocabulary: { items: ['מיקרופונים', 'זרקורים', 'כרטיסים'], place: ['על הבמה', 'מאחורי הקלעים'], thing: ['מיקרופון', 'גיטרה', 'כובע נוצץ'] },
  coin: { icon: '🎟️', name: 'כרטיסים' },
  rewards: [
    { id: 's-glasses', icon: '🕶️', name: 'משקפי כוכבים' },
    { id: 's-light', icon: '💡', name: 'זרקור' },
    { id: 's-guitar', icon: '🎸', name: 'גיטרה חשמלית' },
    { id: 's-keys', icon: '🎹', name: 'קלידים' },
    { id: 's-disc', icon: '💿', name: 'תקליט כסף' },
    { id: 's-mic', icon: '🎤', name: 'מיקרופון זהב' }
  ],
  light: {
    bg: '#fbf5ff',
    surface: '#ffffff',
    'surface-2': '#f0e4fb',
    line: '#e0cdf2',
    ink: '#21142e',
    'ink-soft': '#5e4a72',
    brand: '#7a2fd1',
    'brand-ink': '#ffffff',
    'brand-soft': '#efe2fc',
    accent: '#16b8a8',
    good: '#1f7a3a',
    danger: '#b03a5b',
    'danger-ink': '#ffffff',
    'num-1': '#c2187a',
    'num-2': '#6a2fd1',
    'num-3': '#0f7f75',
    'num-4': '#c4470c',
    'hero-skin': '#f6d2b8',
    'hero-hair': '#2a2340',
    'hero-main': '#7b3fe4',
    'hero-trim': '#2ee6d6',
    'hero-prop': '#e9e6f5',
    'hero-ink': '#1c1530',
    'hero-light': '#ffffff',
    'map-bg': '#f1e6fd',
    'map-deco': '#dfc9f7',
    'coin-gold': '#e3b23c',
    'coin-silver': '#c9ced6',
    'coin-ink': '#2a2418'
  },
  dark: {
    bg: '#120c20',
    surface: '#1d1530',
    'surface-2': '#281e40',
    line: '#3d2f5c',
    ink: '#f6efff',
    'ink-soft': '#c3b4dc',
    brand: '#d4a6ff',
    'brand-ink': '#1f0b33',
    'brand-soft': '#35264f',
    accent: '#3ff0de',
    good: '#6fdc8c',
    danger: '#ff8fb0',
    'danger-ink': '#2a0b16',
    'num-1': '#ff7ac0',
    'num-2': '#c09bff',
    'num-3': '#4fe6d6',
    'num-4': '#ffa94d',
    'hero-skin': '#f6d2b8',
    'hero-hair': '#3a3157',
    'hero-main': '#9a63ff',
    'hero-trim': '#3ff0de',
    'hero-prop': '#e9e6f5',
    'hero-ink': '#1c1530',
    'hero-light': '#ffffff',
    'map-bg': '#170f27',
    'map-deco': '#2c1f47',
    'coin-gold': '#d9a93a',
    'coin-silver': '#aab2bd',
    'coin-ink': '#1c1810'
  }
};
