// 🎤 The shadow demon (שד הצל): a wobbly blob of shadow with little horns, glowing eyes and a
// zigzag grin, that hates songs. Original art (no band's or film's characters), CSS variables only.
import { BossSvg } from '../bossParts';
import type { BossArtProps, BossDef } from '../types';

function ShadowDemon(p: BossArtProps) {
  return (
    <BossSvg
      {...p}
      bits={[
        ['5', 'var(--num-2)'],
        ['?', 'var(--num-1)'],
        ['+', 'var(--num-3)'],
        ['1', 'var(--num-4)']
      ]}
    >
      {/* Horns */}
      <path d="M38 34 Q30 14 42 10 Q42 24 48 30 Z" fill="var(--num-2)" />
      <path d="M82 34 Q90 14 78 10 Q78 24 72 30 Z" fill="var(--num-2)" />
      {/* The shadow body, ragged at the bottom */}
      <path d="M60 22 C90 22 102 48 100 76 L100 104 L90 96 L80 106 L70 96 L60 106 L50 96 L40 106 L30 96 L20 104 L20 76 C18 48 30 22 60 22 Z" fill="var(--hero-ink)" />
      {/* Little arms */}
      <path d="M22 70 Q8 66 10 52" fill="none" stroke="var(--hero-ink)" stroke-width="8" stroke-linecap="round" />
      <path d="M98 70 Q112 66 110 52" fill="none" stroke="var(--hero-ink)" stroke-width="8" stroke-linecap="round" />
      <g class="boss-eye">
        <ellipse cx="48" cy="54" rx="7" ry="9" fill="var(--accent)" />
        <ellipse cx="72" cy="54" rx="7" ry="9" fill="var(--accent)" />
        <circle cx="49" cy="56" r="3" fill="var(--hero-ink)" />
        <circle cx="73" cy="56" r="3" fill="var(--hero-ink)" />
      </g>
      <path d="M42 74 L48 80 L54 74 L60 80 L66 74 L72 80 L78 74" fill="none" stroke="var(--hero-light)" stroke-width="2.6" stroke-linejoin="round" />
    </BossSvg>
  );
}

export const boss: BossDef = {
  id: 'shadow-demon',
  name: 'שד הצל',
  intro: 'שד הצל מכבה את האורות ומבלבל את המספרים – כל תשובה נכונה היא צליל שמגרש אותו!',
  comebacks: [
    'שד הצל חזר חזק יותר – מגרשים אותו בחשבון עד 20!',
    'שד הצל כיבה מאה זרקורים – כל תשובה נכונה מדליקה עוד!',
    'שד הצל עצר את שעון ההופעה – כל תשובה נכונה מזיזה אותו!',
    'שד הצל בכל כוחו – זה הקרב הגדול!',
    'שד הצל חזר עם ריקוד כפל – מגרשים אותו בלוח הכפל!',
    'שד הצל ערבב את הכרטיסים – מסדרים אותם במאונך!',
    'שד הצל גנב את העוגה – מחזירים אותה בשברים!',
    'שד הצל כיבה את האורות בעשיריות – מדליקים בעשרוניים!',
    'שד הצל בהופעה האחרונה – זה הקרב הגדול באמת!'
  ],
  Art: ShadowDemon
};
