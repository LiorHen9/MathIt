// ⚽ Football: a young striker in an invented club's kit (no real team), the ball at the foot.
// Jogs along the map, kicks the ball at the giant goalkeeper; a kick into the net, the crowd and
// "גול!" on a streak, stadium drums and brass. Its sounds, music, feedback, boss and map are here.
import { HERO as V, type HeroDef } from '../../fx/Hero';
import { byGender } from '../../profiles/profiles';
import type { WorldTheme } from '../types';
import { boss } from './boss';
import { fx } from './fx';
import { mapSkin } from './skin';
import { sounds } from './sounds';

const SHORT = 'M30 48 Q29 17 60 16 Q91 17 90 48 Q85 33 74 36 Q70 25 60 31 Q50 25 46 36 Q35 33 30 48Z';
const SMOOTH = 'M30 48 Q30 16 60 16 Q90 16 90 48 Q82 29 62 30 Q42 30 30 48Z';

/** A ball: white with dark patches, drawn around (0, 0). */
function Ball() {
  return (
    <>
      <circle cx="0" cy="0" r="10" fill={V.light} stroke={V.ink} stroke-width="1.5" />
      <path d="M0 -4 L3.8 -1.2 L2.4 3.2 L-2.4 3.2 L-3.8 -1.2Z" fill={V.ink} />
      <path d="M0 -10 L0 -4 M3.8 -1.2 L9.5 -3 M2.4 3.2 L5.8 8 M-2.4 3.2 L-5.8 8 M-3.8 -1.2 L-9.5 -3" stroke={V.ink} stroke-width="1.2" />
    </>
  );
}

const hero: HeroDef = {
  walk: 'jog',
  attack: 'kick',
  name: (g) => byGender({ gender: g }, 'חלוץ', 'חלוצה'),
  parts: (g) => {
    const girl = g === 'girl';
    return {
      hairBack: girl ? (
        <>
          <path d="M82 36 Q106 40 101 72 Q97 58 85 52 Z" fill={V.hair} />
          <circle cx="86" cy="40" r="4" fill={V.main} />
        </>
      ) : undefined,
      legs: (
        <>
          <rect x="47" y="114" width="10" height="34" rx="4" fill={V.skin} />
          <rect x="63" y="114" width="10" height="34" rx="4" fill={V.skin} />
          {/* Long socks with a stripe. */}
          <rect x="46" y="128" width="12" height="18" rx="3" fill={V.main} />
          <rect x="62" y="128" width="12" height="18" rx="3" fill={V.main} />
          <rect x="46" y="131" width="12" height="3" fill={V.trim} />
          <rect x="62" y="131" width="12" height="3" fill={V.trim} />
          <ellipse cx="51" cy="149" rx="9" ry="5" fill={V.ink} />
          <ellipse cx="69" cy="149" rx="9" ry="5" fill={V.ink} />
        </>
      ),
      torso: (
        <>
          {/* Shirt with short sleeves, then shorts. */}
          <path d="M40 84 Q60 78 80 84 L89 97 L81 102 L79 113 L41 113 L39 102 L31 97 Z" fill={V.main} />
          <path d="M52 81 Q60 89 68 81" fill="none" stroke={V.trim} stroke-width="3" stroke-linecap="round" />
          <text x="60" y="107" text-anchor="middle" font-size="15" font-weight="800" fill={V.trim} font-family="Rubik, sans-serif">
            9
          </text>
          <path d="M41 112 L79 112 L81 124 L63 124 L60 119 L57 124 L39 124 Z" fill={V.light} />
        </>
      ),
      hair: <path d={girl ? SMOOTH : SHORT} fill={V.hair} />,
      prop: <Ball />,
      propAt: 'foot'
    };
  }
};

export const world: WorldTheme = {
  id: 'football',
  name: 'כדורגל',
  icon: '⚽',
  blurb: 'בועטים, מבקיעים ועולים בליגה',
  hero,
  fx,
  sounds,
  music: () => import('./music').then((m) => m.loop),
  bosses: [boss],
  mapSkin,
  templateSkins: { pop: { look: 'ball' }, jump: { look: 'cones' }, build: { look: 'turf' }, match: { look: 'shirt', deco: '👕' }, clock: { look: 'scoreboard' }, shop: { look: 'kiosk', icons: ['⚽', '📢', '🧣'] }, slice: { look: 'slice-orange' }, pattern: { look: 'pat-jerseys' }, speed: { look: 'speed-stopwatch' } },
  story: {
    chapters: [
      'הליגה השכונתית מתחילה, וכל תשובה נכונה מקרבת אותנו לגביע!',
      'עולים לליגה הבאה, ושם משחקים עם מספרים עד 20!',
      'האצטדיון מתמלא במאה אוהדים – סופרים אותם בעשרות!',
      'בקיוסק של האצטדיון קונים במטבעות, ושעון המשחק מתקתק!',
      'גמר הגביע מחכה, ושם משחקים עם מספרים עד 100!',
      'במחנה האימונים מתאמנים בשורות שוות – זה לוח הכפל!',
      'בלוח התוצאות הענק כותבים מספרים גדולים אחד מתחת לשני!',
      'בהפסקה חותכים תפוזים לחלקים שווים לכל הקבוצה!',
      'השופט מודד זמנים בעשיריות שנייה – בואו נקרא מספרים עשרוניים!',
      'מסמנים מגרש חדש ומודדים את השטח וההיקף שלו – זה הגמר הגדול!'
    ]
  },
  vocabulary: { items: ['כדורים', 'דגלים', 'קונוסים'], place: ['על המגרש', 'בחדר ההלבשה'], thing: ['כדור', 'משרוקית', 'צעיף אוהדים'] },
  coin: { icon: '🪙', name: 'מטבעות' },
  rewards: [
    { id: 'fb-boots', icon: '👟', name: 'נעלי כדורגל' },
    { id: 'fb-shirt', icon: '👕', name: 'חולצת הקבוצה' },
    { id: 'fb-gloves', icon: '🧤', name: 'כפפות שוער' },
    { id: 'fb-medal', icon: '🥇', name: 'מדליית זהב' },
    { id: 'fb-ball', icon: '⚽', name: 'כדור המשחק' },
    { id: 'fb-cup', icon: '🏆', name: 'גביע הליגה' }
  ],
  light: {
    bg: '#f1f8ef',
    surface: '#ffffff',
    'surface-2': '#e1f0dc',
    line: '#c9e0c2',
    ink: '#14261a',
    'ink-soft': '#4a5f4f',
    brand: '#17703a',
    'brand-ink': '#ffffff',
    'brand-soft': '#dff0e3',
    accent: '#ffd23f',
    good: '#1f7a3a',
    danger: '#b6402c',
    'danger-ink': '#ffffff',
    'num-1': '#c62828',
    'num-2': '#1b5fb8',
    'num-3': '#17703a',
    'num-4': '#b8530b',
    'hero-skin': '#e8b48f',
    'hero-hair': '#3b2a20',
    'hero-main': '#1e88e5',
    'hero-trim': '#ffd23f',
    'hero-prop': '#ffffff',
    'hero-ink': '#1b2430',
    'hero-light': '#ffffff',
    'map-bg': '#d8edcf',
    'map-deco': '#c3e1b7',
    'coin-gold': '#e3b23c',
    'coin-silver': '#c9ced6',
    'coin-ink': '#2a2418'
  },
  dark: {
    bg: '#0f1d14',
    surface: '#17291d',
    'surface-2': '#1f3626',
    line: '#2c4a35',
    ink: '#eaf6ec',
    'ink-soft': '#a9c4af',
    brand: '#6fe39a',
    'brand-ink': '#0b2414',
    'brand-soft': '#1f3b29',
    accent: '#ffd23f',
    good: '#7ee59e',
    danger: '#ff8f7a',
    'danger-ink': '#1e0f0c',
    'num-1': '#ff8a80',
    'num-2': '#7ab8ff',
    'num-3': '#6fe39a',
    'num-4': '#ffb066',
    'hero-skin': '#e8b48f',
    'hero-hair': '#4a3628',
    'hero-main': '#2f95ef',
    'hero-trim': '#ffd23f',
    'hero-prop': '#ffffff',
    'hero-ink': '#1b2430',
    'hero-light': '#ffffff',
    'map-bg': '#132618',
    'map-deco': '#1d3824',
    'coin-gold': '#d9a93a',
    'coin-silver': '#aab2bd',
    'coin-ink': '#1c1810'
  }
};
