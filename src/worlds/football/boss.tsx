// ⚽ The giant goalkeeper (השוער הענק): huge gloves up, number 1 on the shirt, standing in a
// goal. An invented player of no real team. Original art, CSS variables only.
import { BossSvg } from '../bossParts';
import type { BossArtProps, BossDef } from '../types';

function GiantKeeper(p: BossArtProps) {
  return (
    <BossSvg
      {...p}
      bits={[
        ['9', 'var(--num-2)'],
        ['?', 'var(--num-1)'],
        ['−', 'var(--num-3)'],
        ['5', 'var(--num-4)']
      ]}
      behind={
        <g fill="none">
          <path d="M8 108 L8 22 L112 22 L112 108" stroke="var(--ink-soft)" stroke-width="4" stroke-linejoin="round" />
          <path d="M24 22 V108 M40 22 V108 M56 22 V108 M72 22 V108 M88 22 V108 M104 22 V108 M8 40 H112 M8 58 H112 M8 76 H112 M8 94 H112" stroke="var(--line)" stroke-width="1.2" />
        </g>
      }
    >
      {/* Legs and shorts */}
      <rect x="44" y="88" width="12" height="20" rx="4" fill="var(--hero-ink)" />
      <rect x="64" y="88" width="12" height="20" rx="4" fill="var(--hero-ink)" />
      <rect x="38" y="82" width="44" height="12" rx="3" fill="var(--hero-ink)" />
      {/* Arms up, wide */}
      <path d="M38 54 L20 34" stroke="var(--num-4)" stroke-width="11" stroke-linecap="round" />
      <path d="M82 54 L100 34" stroke="var(--num-4)" stroke-width="11" stroke-linecap="round" />
      {/* Shirt with a big 1 */}
      <path d="M32 50 Q60 41 88 50 L85 86 L35 86 Z" fill="var(--num-4)" />
      <text x="60" y="78" text-anchor="middle" font-size="22" font-weight="800" fill="var(--hero-light)" font-family="var(--font)">
        1
      </text>
      {/* Big gloves */}
      <g fill="var(--accent)" stroke="var(--hero-ink)" stroke-width="2">
        <rect x="6" y="16" width="22" height="24" rx="8" />
        <rect x="92" y="16" width="22" height="24" rx="8" />
      </g>
      {/* Head: a headband, a grin */}
      <circle cx="60" cy="31" r="15" fill="var(--hero-skin)" />
      <path d="M45 26 Q60 18 75 26 L75 22 Q60 13 45 22 Z" fill="var(--hero-ink)" />
      <g class="boss-eye">
        <circle cx="54" cy="31" r="2.6" fill="var(--hero-ink)" />
        <circle cx="66" cy="31" r="2.6" fill="var(--hero-ink)" />
      </g>
      <path d="M50 27 L57 29 M70 27 L63 29" stroke="var(--hero-ink)" stroke-width="2" stroke-linecap="round" />
      <path d="M53 38 Q60 43 67 38" fill="none" stroke="var(--hero-ink)" stroke-width="2.4" stroke-linecap="round" />
    </BossSvg>
  );
}

export const boss: BossDef = {
  id: 'giant-keeper',
  name: 'השוער הענק',
  intro: 'השוער הענק עומד בשער ומבלבל את המספרים – כל תשובה נכונה היא בעיטה לרשת!',
  Art: GiantKeeper
};
