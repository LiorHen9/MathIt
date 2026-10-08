// 🧱 The cave creature (יצור המערות): a blocky lump of stone with glowing crystals on its back,
// square glowing eyes and a square grin. Original art (no game's creatures), CSS variables only.
import { BossSvg } from '../bossParts';
import type { BossArtProps, BossDef } from '../types';

function CaveCreature(p: BossArtProps) {
  return (
    <BossSvg
      {...p}
      bits={[
        ['2', 'var(--num-2)'],
        ['?', 'var(--num-1)'],
        ['−', 'var(--num-3)'],
        ['9', 'var(--num-4)']
      ]}
    >
      {/* Crystals on its back */}
      <path d="M30 40 L36 18 L42 40 Z" fill="var(--num-2)" />
      <path d="M52 32 L60 6 L68 32 Z" fill="var(--accent)" />
      <path d="M78 40 L84 16 L90 40 Z" fill="var(--num-2)" />
      {/* Legs and arms */}
      <rect x="36" y="92" width="16" height="16" fill="var(--ink-soft)" />
      <rect x="68" y="92" width="16" height="16" fill="var(--ink-soft)" />
      <rect x="10" y="56" width="18" height="30" fill="var(--ink-soft)" />
      <rect x="92" y="56" width="18" height="30" fill="var(--ink-soft)" />
      <rect x="8" y="80" width="22" height="14" fill="var(--hero-ink)" />
      <rect x="90" y="80" width="22" height="14" fill="var(--hero-ink)" />
      {/* Body of stone blocks */}
      <rect x="24" y="36" width="72" height="60" rx="3" fill="var(--ink-soft)" />
      <g fill="var(--hero-ink)" opacity="0.25">
        <rect x="28" y="40" width="14" height="10" />
        <rect x="74" y="72" width="16" height="12" />
        <rect x="34" y="78" width="12" height="10" />
        <rect x="80" y="42" width="10" height="10" />
      </g>
      {/* Square glowing eyes, a square grin */}
      <g class="boss-eye">
        <rect x="38" y="50" width="14" height="12" fill="var(--accent)" />
        <rect x="68" y="50" width="14" height="12" fill="var(--accent)" />
        <rect x="44" y="54" width="5" height="5" fill="var(--hero-ink)" />
        <rect x="71" y="54" width="5" height="5" fill="var(--hero-ink)" />
      </g>
      <rect x="44" y="70" width="32" height="10" fill="var(--hero-ink)" />
      <rect x="50" y="70" width="6" height="5" fill="var(--hero-light)" />
      <rect x="64" y="70" width="6" height="5" fill="var(--hero-light)" />
    </BossSvg>
  );
}

export const boss: BossDef = {
  id: 'cave-creature',
  name: 'יצור המערות',
  intro: 'יצור המערות חוסם את הדרך ומבלבל את המספרים – כל תשובה נכונה היא מכה במכוש!',
  comebacks: [
    'יצור המערות חזר חזק יותר – חוצבים בחשבון עד 20!',
    'יצור המערות שומר על מאה בלוקים – כל תשובה נכונה היא מכה במכוש!',
    'יצור המערות עצר את שעון הלבה – כל תשובה נכונה מזיזה אותו!',
    'יצור המערות בכל כוחו – זה הקרב הגדול!'
  ],
  Art: CaveCreature
};
