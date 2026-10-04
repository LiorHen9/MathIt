// Original pictures for the quest stations, drawn in SVG with the world's CSS variables only:
// the treasure chest and the chapter boss "הבלבלן" (the Muddler – a round, silly creature who
// mixes up numbers; one shared boss until phase 5 gives every world its own).
// Animated parts have classes (CSS in styles.css, transform/opacity only) and no transform
// attribute of their own.

/** The Muddler. `state`: idle (floating, numbers spinning around), hit, beaten. */
export function BossArt({ class: cls = '', state = 'idle' }: { class?: string; state?: 'idle' | 'beaten' }) {
  return (
    <svg class={`boss-art is-${state} ${cls}`} viewBox="0 0 120 120" aria-hidden="true">
      <g class="boss-body">
        <ellipse cx="60" cy="112" rx="34" ry="5" fill="var(--hero-ink)" opacity="0.14" />
        {/* Horns */}
        <path d="M34 34 Q26 14 38 12 Q40 24 46 30 Z" fill="var(--accent)" />
        <path d="M86 34 Q94 14 82 12 Q80 24 74 30 Z" fill="var(--accent)" />
        {/* Little arms */}
        <path d="M18 70 Q6 62 8 50" fill="none" stroke="var(--brand)" stroke-width="8" stroke-linecap="round" />
        <path d="M102 70 Q114 62 112 50" fill="none" stroke="var(--brand)" stroke-width="8" stroke-linecap="round" />
        {/* Body and belly */}
        <path d="M60 22 C92 22 106 46 104 72 C102 98 84 108 60 108 C36 108 18 98 16 72 C14 46 28 22 60 22 Z" fill="var(--brand)" />
        <ellipse cx="60" cy="82" rx="28" ry="20" fill="var(--brand-soft)" />
        {/* Feet */}
        <ellipse cx="44" cy="107" rx="10" ry="5" fill="var(--brand)" />
        <ellipse cx="76" cy="107" rx="10" ry="5" fill="var(--brand)" />
        {/* One big muddled eye */}
        <g class="boss-eye">
          <circle cx="60" cy="52" r="17" fill="var(--hero-light)" stroke="var(--hero-ink)" stroke-width="2.5" />
          <path class="boss-swirl" d="M60 52 m-2 0 a2 2 0 1 1 4 0 a4 4 0 1 1 -8 0 a6 6 0 1 1 12 0 a8 8 0 1 1 -16 0" fill="none" stroke="var(--hero-ink)" stroke-width="2.4" stroke-linecap="round" />
        </g>
        {/* Cheeks and a lopsided grin with one tooth */}
        <circle cx="34" cy="66" r="5" fill="var(--num-1)" opacity="0.35" />
        <circle cx="86" cy="66" r="5" fill="var(--num-1)" opacity="0.35" />
        <path d="M44 74 Q60 86 78 72" fill="none" stroke="var(--hero-ink)" stroke-width="3" stroke-linecap="round" />
        <path d="M63 78 L66 84 L69 77 Z" fill="var(--hero-light)" />
      </g>
      {/* Mixed-up numbers floating around it */}
      <g class="boss-bits" font-weight="800" font-family="var(--font)">
        <text class="boss-bit b1" x="6" y="26" font-size="16" fill="var(--num-2)">7</text>
        <text class="boss-bit b2" x="100" y="24" font-size="16" fill="var(--num-3)">?</text>
        <text class="boss-bit b3" x="2" y="98" font-size="14" fill="var(--num-4)">3</text>
        <text class="boss-bit b4" x="104" y="96" font-size="14" fill="var(--num-1)">+</text>
      </g>
    </svg>
  );
}

/** A treasure chest; `open` lifts the lid and shows the glow inside. */
export function ChestArt({ open = false, class: cls = '' }: { open?: boolean; class?: string }) {
  return (
    <svg class={`chest-art ${open ? 'is-open' : ''} ${cls}`} viewBox="0 0 120 110" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="44" ry="5" fill="var(--hero-ink)" opacity="0.14" />
      {/* The glow inside, seen when the lid is up. */}
      <g class="chest-glow">
        <ellipse cx="60" cy="52" rx="34" ry="12" fill="var(--accent)" />
        <path d="M40 50 L32 18 M60 48 L60 8 M80 50 L88 18" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" opacity="0.7" />
      </g>
      {/* Box */}
      <rect x="18" y="50" width="84" height="52" rx="7" fill="var(--num-4)" />
      <rect x="18" y="50" width="84" height="10" fill="var(--hero-ink)" opacity="0.18" />
      <rect x="30" y="50" width="9" height="52" fill="var(--accent)" />
      <rect x="81" y="50" width="9" height="52" fill="var(--accent)" />
      {/* Lid (rotates open around its back edge) */}
      <g class="chest-lid">
        <path d="M18 54 L18 40 Q18 18 60 18 Q102 18 102 40 L102 54 Z" fill="var(--num-4)" />
        <path d="M30 54 L30 24 Q34 21 39 20 L39 54 Z" fill="var(--accent)" />
        <path d="M81 20 Q86 21 90 24 L90 54 L81 54 Z" fill="var(--accent)" />
        <path d="M22 36 Q60 22 98 36" fill="none" stroke="var(--hero-light)" stroke-width="3" stroke-linecap="round" opacity="0.35" />
      </g>
      {/* Lock */}
      <g class="chest-lock">
        <rect x="50" y="46" width="20" height="22" rx="4" fill="var(--accent)" stroke="var(--hero-ink)" stroke-width="2" />
        <circle cx="60" cy="55" r="3" fill="var(--hero-ink)" />
        <rect x="58.6" y="56" width="2.8" height="7" rx="1" fill="var(--hero-ink)" />
      </g>
    </svg>
  );
}
