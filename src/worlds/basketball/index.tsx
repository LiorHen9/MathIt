// 🏀 Basketball: a player in an invented team's kit (no real team or player), spinning the ball.
// Dribbles along the map, shoots at the 1-on-1 champion; a swish through the net, a ball on fire
// on a streak, a light hip-hop beat. Its sounds, music, feedback, boss and map are here.
import { HERO as V, type HeroDef } from '../../fx/Hero';
import { byGender } from '../../profiles/profiles';
import type { WorldTheme } from '../types';
import { boss } from './boss';
import { fx } from './fx';
import { mapSkin } from './skin';
import { sounds } from './sounds';

const FLAT = 'M31 46 Q30 18 60 17 Q90 18 89 46 Q85 32 60 31 Q35 32 31 46Z';

/** The ball, drawn around (0, -12): above the raised hand, as if spinning on a finger. */
function Ball() {
  return (
    <g class="h-spin">
      <circle cx="0" cy="-12" r="11" fill={V.prop} stroke={V.ink} stroke-width="1.5" />
      <path d="M0 -23 L0 -1 M-11 -12 L11 -12 M-7.5 -20 Q-2 -12 -7.5 -4 M7.5 -20 Q2 -12 7.5 -4" fill="none" stroke={V.ink} stroke-width="1.3" />
    </g>
  );
}

const hero: HeroDef = {
  walk: 'dribble',
  attack: 'shoot',
  name: (g) => byGender({ gender: g }, 'שחקן', 'שחקנית'),
  parts: (g) => {
    const girl = g === 'girl';
    return {
      hairBack: girl ? (
        <>
          <circle cx="33" cy="27" r="12" fill={V.hair} />
          <circle cx="87" cy="27" r="12" fill={V.hair} />
        </>
      ) : undefined,
      torso: (
        <>
          {/* Sleeveless shirt with trim, the number, then shorts with a side stripe. */}
          <path d="M44 82 Q60 91 76 82 L82 112 L38 112 Z" fill={V.main} />
          <path d="M44 82 Q60 91 76 82" fill="none" stroke={V.trim} stroke-width="3" />
          <text x="60" y="106" text-anchor="middle" font-size="14" font-weight="800" fill={V.trim} font-family="Rubik, sans-serif">
            7
          </text>
          <path d="M38 110 L82 110 L84 127 L64 127 L60 119 L56 127 L36 127 Z" fill={V.main} />
          <path d="M38 112 L36 127 M82 112 L84 127" stroke={V.trim} stroke-width="3" />
        </>
      ),
      hair: (
        <>
          <path d={FLAT} fill={V.hair} />
          {/* Headband. */}
          <path d="M31 37 Q60 26 89 37 L89 44 Q60 33 31 44Z" fill={V.trim} />
        </>
      ),
      prop: <Ball />,
      propAt: 'raised'
    };
  }
};

export const world: WorldTheme = {
  id: 'basketball',
  name: 'כדורסל',
  icon: '🏀',
  blurb: 'כדרור, קליעה וסל מנצח',
  hero,
  fx,
  sounds,
  music: () => import('./music').then((m) => m.loop),
  bosses: [boss],
  mapSkin,
  templateSkins: { pop: { look: 'hoop' } },
  story: { chapters: ['בחצר מחכה אלוף ה-1 על 1 – מתאמנים בקליעות של מספרים!'] },
  vocabulary: { items: ['כדורים', 'בקבוקי מים', 'מגבות'], place: ['באולם', 'בחצר'] },
  coin: { icon: '🏅', name: 'מדליות' },
  rewards: [
    { id: 'bb-shoes', icon: '👟', name: 'נעלי קפיצה' },
    { id: 'bb-shirt', icon: '🎽', name: 'גופיית הקבוצה' },
    { id: 'bb-cap', icon: '🧢', name: 'כובע מצחייה' },
    { id: 'bb-bag', icon: '🎒', name: 'תיק ספורט' },
    { id: 'bb-ball', icon: '🏀', name: 'כדור זוהר' },
    { id: 'bb-cup', icon: '🏆', name: 'גביע החצר' }
  ],
  light: {
    bg: '#fff6ec',
    surface: '#ffffff',
    'surface-2': '#fde8d2',
    line: '#f1d3b4',
    ink: '#2a1a10',
    'ink-soft': '#6b5040',
    brand: '#ad430b',
    'brand-ink': '#ffffff',
    'brand-soft': '#fde3cc',
    accent: '#3b6ef5',
    good: '#1f7a3a',
    danger: '#b3261e',
    'danger-ink': '#ffffff',
    'num-1': '#c62828',
    'num-2': '#1d4ed8',
    'num-3': '#23844a',
    'num-4': '#ad430b',
    'hero-skin': '#c98e6a',
    'hero-hair': '#2b1b14',
    'hero-main': '#7b2cbf',
    'hero-trim': '#ffc83d',
    'hero-prop': '#f07a1a',
    'hero-ink': '#24160f',
    'hero-light': '#ffffff',
    'map-bg': '#f7e4cb',
    'map-deco': '#ebcda6'
  },
  dark: {
    bg: '#1c130c',
    surface: '#281b12',
    'surface-2': '#33241a',
    line: '#4a3424',
    ink: '#fff1e6',
    'ink-soft': '#d6b9a3',
    brand: '#ffa45c',
    'brand-ink': '#2a1405',
    'brand-soft': '#3d2818',
    accent: '#7aa2ff',
    good: '#6fdc8c',
    danger: '#ff8f7a',
    'danger-ink': '#1e0f0c',
    'num-1': '#ff8a80',
    'num-2': '#8fb0ff',
    'num-3': '#6fdc8c',
    'num-4': '#ffa45c',
    'hero-skin': '#c98e6a',
    'hero-hair': '#2b1b14',
    'hero-main': '#9446d8',
    'hero-trim': '#ffc83d',
    'hero-prop': '#f07a1a',
    'hero-ink': '#24160f',
    'hero-light': '#ffffff',
    'map-bg': '#241811',
    'map-deco': '#3a281a'
  }
};
