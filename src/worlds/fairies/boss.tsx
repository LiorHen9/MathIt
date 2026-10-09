// 🧚 The fog witch (מכשפת הערפל): a pointy hat, a pale face with glowing eyes, a cloak that
// ends in fog, and a crooked wand. Silly rather than scary. Original art, CSS variables only.
import { starPath } from '../../fx/Hero';
import { BossSvg } from '../bossParts';
import type { BossArtProps, BossDef } from '../types';

function FogWitch(p: BossArtProps) {
  return (
    <BossSvg
      {...p}
      bits={[
        ['?', 'var(--num-2)'],
        ['7', 'var(--num-1)'],
        ['+', 'var(--num-3)'],
        ['2', 'var(--num-4)']
      ]}
    >
      {/* The cloak */}
      <path d="M38 58 Q60 50 82 58 L94 100 Q60 110 26 100 Z" fill="var(--num-2)" />
      <path d="M52 58 L60 76 L68 58" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" />
      {/* A crooked wand with a dim star */}
      <path d="M86 76 Q98 64 104 46" fill="none" stroke="var(--hero-ink)" stroke-width="4" stroke-linecap="round" />
      <path d={starPath(105, 42, 7)} fill="var(--accent)" stroke="var(--hero-ink)" stroke-width="1" />
      <circle cx="88" cy="78" r="5.5" fill="var(--hero-prop)" />
      {/* Face */}
      <circle cx="60" cy="46" r="17" fill="var(--hero-prop)" />
      <g class="boss-eye">
        <ellipse cx="53" cy="45" rx="4.5" ry="5.5" fill="var(--accent)" />
        <ellipse cx="67" cy="45" rx="4.5" ry="5.5" fill="var(--accent)" />
        <circle cx="54" cy="46" r="2.2" fill="var(--hero-ink)" />
        <circle cx="68" cy="46" r="2.2" fill="var(--hero-ink)" />
      </g>
      <path d="M50 55 Q55 59 60 55 Q65 59 70 55" fill="none" stroke="var(--hero-ink)" stroke-width="2.4" stroke-linecap="round" />
      {/* The hat, bent at the tip */}
      <ellipse cx="60" cy="31" rx="27" ry="5.5" fill="var(--hero-ink)" />
      <path d="M44 31 L58 6 Q66 0 74 8 L68 10 L76 31 Z" fill="var(--hero-ink)" />
      <path d="M45 27 Q60 23 75 27 L75 31 Q60 27 45 31 Z" fill="var(--accent)" />
      {/* The fog it stands in */}
      <g opacity="0.92">
        <circle cx="30" cy="102" r="12" fill="var(--line)" />
        <circle cx="47" cy="107" r="13" fill="var(--line)" />
        <circle cx="66" cy="108" r="14" fill="var(--line)" />
        <circle cx="86" cy="103" r="12" fill="var(--line)" />
      </g>
    </BossSvg>
  );
}

export const boss: BossDef = {
  id: 'fog-witch',
  name: 'מכשפת הערפל',
  intro: 'מכשפת הערפל מבלבלת את המספרים – כל תשובה נכונה מפזרת את הערפל!',
  comebacks: [
    'מכשפת הערפל חזרה חזקה יותר – מפזרים את הערפל בחשבון עד 20!',
    'מכשפת הערפל מסתירה מאה פרחים – כל תשובה נכונה מגלה עוד!',
    'מכשפת הערפל עצרה את שעון הפרחים – כל תשובה נכונה מחזירה אותו לזוז!',
    'מכשפת הערפל בכל כוחה – זה הקרב הגדול!',
    'מכשפת הערפל חזרה עם כישופי כפל – מנצחים אותה בלוח הכפל!',
    'מכשפת הערפל ערבבה את הטורים – מסדרים אותם במאונך!',
    'מכשפת הערפל גנבה חלקים מהעוגה – מחזירים אותם בשברים!',
    'מכשפת הערפל הסתירה את הנקודות – מוצאים אותן בעשרוניים!',
    'מכשפת הערפל בכל כוחה האחרון – זה הקרב הגדול באמת!'
  ],
  Art: FogWitch
};
