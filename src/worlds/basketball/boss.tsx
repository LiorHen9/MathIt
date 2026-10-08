// 🏀 The 1-on-1 champion (אלוף ה-1 על 1): tall, a headband, big sneakers, the ball spinning on
// one finger. An invented player (no real team or player). Original art, CSS variables only.
import { BossSvg } from '../bossParts';
import type { BossArtProps, BossDef } from '../types';

function Champion(p: BossArtProps) {
  return (
    <BossSvg
      {...p}
      bits={[
        ['3', 'var(--num-2)'],
        ['?', 'var(--num-1)'],
        ['+', 'var(--num-3)'],
        ['8', 'var(--num-4)']
      ]}
    >
      {/* Long legs, big sneakers */}
      <rect x="47" y="76" width="10" height="28" rx="4" fill="var(--hero-skin)" />
      <rect x="63" y="76" width="10" height="28" rx="4" fill="var(--hero-skin)" />
      <path d="M40 102 Q42 96 52 98 L58 98 L58 110 L40 110 Z" fill="var(--accent)" stroke="var(--hero-ink)" stroke-width="1.5" />
      <path d="M62 98 L70 98 Q80 96 82 102 L82 110 L62 110 Z" fill="var(--accent)" stroke="var(--hero-ink)" stroke-width="1.5" />
      {/* Shorts and jersey */}
      <path d="M42 66 L78 66 L80 82 L62 82 L60 78 L58 82 L40 82 Z" fill="var(--num-2)" />
      <path d="M44 38 Q60 46 76 38 L80 68 L40 68 Z" fill="var(--num-2)" />
      <text x="60" y="62" text-anchor="middle" font-size="13" font-weight="800" fill="var(--hero-light)" font-family="var(--font)">
        00
      </text>
      {/* One arm down, one up with the ball spinning on a finger */}
      <path d="M44 42 Q34 54 34 66" fill="none" stroke="var(--hero-skin)" stroke-width="7" stroke-linecap="round" />
      <path d="M76 42 Q90 34 92 18" fill="none" stroke="var(--hero-skin)" stroke-width="7" stroke-linecap="round" />
      <g class="boss-swirl">
        <circle cx="93" cy="7" r="9" fill="var(--hero-prop)" stroke="var(--hero-ink)" stroke-width="1.5" />
        <path d="M84 7 H102 M93 -2 V16" stroke="var(--hero-ink)" stroke-width="1.2" />
      </g>
      {/* Head: headband, a confident smirk */}
      <circle cx="60" cy="26" r="13" fill="var(--hero-skin)" />
      <path d="M47 24 Q47 11 60 11 Q73 11 73 24 Q66 17 60 18 Q54 17 47 24 Z" fill="var(--hero-ink)" />
      <rect x="47" y="19" width="26" height="5" rx="2" fill="var(--num-1)" />
      <g class="boss-eye">
        <circle cx="55" cy="27" r="2.2" fill="var(--hero-ink)" />
        <circle cx="65" cy="27" r="2.2" fill="var(--hero-ink)" />
      </g>
      <path d="M55 33 Q61 36 66 31" fill="none" stroke="var(--hero-ink)" stroke-width="2" stroke-linecap="round" />
    </BossSvg>
  );
}

export const boss: BossDef = {
  id: 'champion',
  name: 'אלוף ה-1 על 1',
  intro: 'אלוף ה-1 על 1 מחכה בחצר ומבלבל את המספרים – כל תשובה נכונה היא סל!',
  Art: Champion
};
