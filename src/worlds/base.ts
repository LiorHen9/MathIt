import type { WorldTheme } from './types';

// The look before a profile picks a world (splash, "who is playing?").
// Its values are also the :root defaults in src/styles.css, so applying it only removes the
// overrides. They are repeated here for previews and for the contrast check.
export const BASE: WorldTheme = {
  id: 'base',
  name: 'MathIt',
  icon: '🔢',
  blurb: 'צבעוני ושמח',
  light: {
    bg: '#fff8ee',
    surface: '#ffffff',
    'surface-2': '#fbefdc',
    line: '#eadfcb',
    ink: '#24203a',
    'ink-soft': '#5d5873',
    brand: '#4c35b5',
    'brand-ink': '#ffffff',
    'brand-soft': '#ece8fb',
    accent: '#ffb627',
    good: '#1f7a3a',
    danger: '#b6402c',
    'danger-ink': '#ffffff',
    'num-1': '#d6334a',
    'num-2': '#1b72c9',
    'num-3': '#23844a',
    'num-4': '#c4470c',
    'hero-skin': '#f2c7a5',
    'hero-hair': '#5a3a2a',
    'hero-main': '#4c35b5',
    'hero-trim': '#ffb627',
    'hero-prop': '#ffffff',
    'hero-ink': '#24203a',
    'hero-light': '#ffffff'
  },
  dark: {
    bg: '#16142a',
    surface: '#211e3a',
    'surface-2': '#2b2748',
    line: '#3a3560',
    ink: '#f1eefc',
    'ink-soft': '#b3add0',
    brand: '#b7a8ff',
    'brand-ink': '#17122e',
    'brand-soft': '#2e2856',
    accent: '#ffc94d',
    good: '#6fdc8c',
    danger: '#ff8f7a',
    'danger-ink': '#1e0f0c',
    'num-1': '#ff8095',
    'num-2': '#6cb8ff',
    'num-3': '#6fdc8c',
    'num-4': '#ffa94d',
    'hero-skin': '#f2c7a5',
    'hero-hair': '#6b4a38',
    'hero-main': '#7b62e0',
    'hero-trim': '#ffc94d',
    'hero-prop': '#ffffff',
    'hero-ink': '#1b1830',
    'hero-light': '#ffffff'
  }
};
