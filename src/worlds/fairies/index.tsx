// 🧚 Fairies: a young fairy (or fairy prince) with fluttering wings and a star wand.
import { HERO as V, starPath, type HeroDef } from '../../fx/Hero';
import { byGender } from '../../profiles/profiles';
import type { WorldTheme } from '../types';

const LONG_HAIR = 'M28 52 Q26 18 60 17 Q94 18 92 52 L97 98 Q82 106 76 92 L44 92 Q38 106 23 98 Z';
const BANGS = 'M30 46 Q34 17 60 17 Q86 17 90 46 Q78 33 68 36 Q61 27 53 36 Q41 33 30 46Z';
const SHORT = 'M30 48 Q29 17 60 16 Q91 17 90 48 Q85 35 76 38 Q72 26 62 33 Q53 25 46 36 Q36 34 30 48Z';

const hero: HeroDef = {
  name: (g) => byGender({ gender: g }, 'נסיך הפיות', 'פיית הקסם', 'פיית הקסם'),
  parts: (g) => {
    const prince = g === 'boy';
    return {
      back: (
        <>
          <g class="h-wing h-wing-l">
            <ellipse cx="32" cy="84" rx="21" ry="12" transform="rotate(-28 32 84)" fill={V.prop} stroke={V.trim} stroke-width="1.5" opacity="0.9" />
            <ellipse cx="37" cy="104" rx="13" ry="8" transform="rotate(24 37 104)" fill={V.prop} stroke={V.trim} stroke-width="1.5" opacity="0.9" />
          </g>
          <g class="h-wing h-wing-r">
            <ellipse cx="88" cy="84" rx="21" ry="12" transform="rotate(28 88 84)" fill={V.prop} stroke={V.trim} stroke-width="1.5" opacity="0.9" />
            <ellipse cx="83" cy="104" rx="13" ry="8" transform="rotate(-24 83 104)" fill={V.prop} stroke={V.trim} stroke-width="1.5" opacity="0.9" />
          </g>
        </>
      ),
      hairBack: prince ? undefined : <path d={LONG_HAIR} fill={V.hair} />,
      torso: prince ? (
        <>
          <path d="M42 82 Q60 76 78 82 L80 118 Q60 123 40 118 Z" fill={V.main} />
          <rect x="40" y="102" width="40" height="5" rx="2" fill={V.trim} />
        </>
      ) : (
        <>
          <path d="M44 82 Q60 76 76 82 L87 122 Q60 131 33 122 Z" fill={V.main} />
          <path d="M43 97 Q60 102 77 97" fill="none" stroke={V.trim} stroke-width="3.5" stroke-linecap="round" />
          <path d={starPath(60, 112, 5)} fill={V.trim} />
        </>
      ),
      hair: (
        <>
          <path d={prince ? SHORT : BANGS} fill={V.hair} />
          {/* A little crown. */}
          <path d="M47 23 L50 11 L55 18 L60 7 L65 18 L70 11 L73 23 Q60 19 47 23Z" fill={V.trim} stroke={V.ink} stroke-width="1" stroke-linejoin="round" />
        </>
      ),
      // A wand held up, a star at its tip.
      prop: (
        <>
          <line x1="0" y1="2" x2="7" y2="-24" stroke={V.ink} stroke-width="3" stroke-linecap="round" />
          <path class="h-sparkle" d={starPath(8, -29, 9)} fill={V.trim} stroke={V.ink} stroke-width="1" stroke-linejoin="round" />
        </>
      ),
      propAt: 'raised'
    };
  }
};

export const world: WorldTheme = {
  id: 'fairies',
  name: 'פיות',
  icon: '🧚',
  blurb: 'קסמים, נצנוצים וגינות קסומות',
  hero,
  light: {
    bg: '#fff5fb',
    surface: '#ffffff',
    'surface-2': '#fbe6f3',
    line: '#f0cfe4',
    ink: '#2e1a33',
    'ink-soft': '#6a4f70',
    brand: '#a3237a',
    'brand-ink': '#ffffff',
    'brand-soft': '#fbe3f2',
    accent: '#f7b733',
    good: '#1f7a3a',
    danger: '#b6402c',
    'danger-ink': '#ffffff',
    'num-1': '#c2185b',
    'num-2': '#6a3fc0',
    'num-3': '#1d7f6e',
    'num-4': '#c4470c',
    'hero-skin': '#ffd9c2',
    'hero-hair': '#8a4fd8',
    'hero-main': '#ff6fbf',
    'hero-trim': '#ffcf33',
    'hero-prop': '#bdf0ff',
    'hero-ink': '#3a1f3f',
    'hero-light': '#ffffff'
  },
  dark: {
    bg: '#1f1226',
    surface: '#2b1a34',
    'surface-2': '#362242',
    line: '#4a3058',
    ink: '#fbeefa',
    'ink-soft': '#cfb5d6',
    brand: '#ff9ad5',
    'brand-ink': '#2a0f22',
    'brand-soft': '#43284f',
    accent: '#ffd36b',
    good: '#6fdc8c',
    danger: '#ff8f7a',
    'danger-ink': '#1e0f0c',
    'num-1': '#ff8fc0',
    'num-2': '#b9a0ff',
    'num-3': '#6fe0c8',
    'num-4': '#ffa94d',
    'hero-skin': '#ffd9c2',
    'hero-hair': '#a874f0',
    'hero-main': '#ff6fbf',
    'hero-trim': '#ffcf33',
    'hero-prop': '#bdf0ff',
    'hero-ink': '#3a1f3f',
    'hero-light': '#ffffff'
  }
};
