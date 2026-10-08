// 🥷 The shadow master (מאסטר הצל): a dark hood, glowing eyes, arms folded, wisps of smoke.
// Original art, CSS variables only.
import { BossSvg } from '../bossParts';
import type { BossArtProps, BossDef } from '../types';

function ShadowMaster(p: BossArtProps) {
  return (
    <BossSvg
      {...p}
      bits={[
        ['4', 'var(--num-2)'],
        ['?', 'var(--num-1)'],
        ['=', 'var(--num-3)'],
        ['6', 'var(--num-4)']
      ]}
    >
      {/* Smoke at its feet */}
      <g fill="var(--line)" opacity="0.9">
        <circle cx="34" cy="104" r="9" />
        <circle cx="86" cy="104" r="9" />
      </g>
      {/* Robe */}
      <path d="M36 52 Q60 42 84 52 L94 106 Q60 112 26 106 Z" fill="var(--hero-ink)" />
      {/* A red sash */}
      <path d="M32 80 Q60 88 88 80 L89 87 Q60 95 31 87 Z" fill="var(--brand)" />
      {/* Folded arms */}
      <path d="M36 66 Q60 76 84 66 Q84 74 60 78 Q36 74 36 66 Z" fill="var(--ink-soft)" />
      {/* Hood with the eye slit */}
      <path d="M38 40 Q38 12 60 12 Q82 12 82 40 Q82 56 60 56 Q38 56 38 40 Z" fill="var(--hero-ink)" />
      <rect x="44" y="30" width="32" height="11" rx="5.5" fill="var(--surface-2)" />
      <g class="boss-eye">
        <path d="M47 37 L57 32 L57 38 Z" fill="var(--brand)" />
        <path d="M73 37 L63 32 L63 38 Z" fill="var(--brand)" />
      </g>
      {/* Headband tails */}
      <path d="M80 28 Q96 24 104 34 Q94 32 86 34 Z" fill="var(--brand)" />
      <path d="M38 26 Q60 20 82 26 L82 30 Q60 24 38 30 Z" fill="var(--brand)" />
    </BossSvg>
  );
}

export const boss: BossDef = {
  id: 'shadow-master',
  name: 'מאסטר הצל',
  intro: 'מאסטר הצל מסתתר בדוג׳ו ומבלבל את המספרים – כל תשובה נכונה היא כוכב שפוגע במטרה!',
  comebacks: [
    'מאסטר הצל חזר חזק יותר – מתאמנים בחשבון עד 20!',
    'מאסטר הצל מסתתר על מאה מדרגות – כל תשובה נכונה מגלה אותו!',
    'מאסטר הצל עצר את גונג השעון – כל תשובה נכונה מחזירה אותו!',
    'מאסטר הצל בכל כוחו – זה הקרב הגדול!'
  ],
  Art: ShadowMaster
};
