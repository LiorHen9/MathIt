// What every world's boss picture shares (src/worlds/<id>/boss.tsx): the SVG frame, the floating
// body (`.boss-body`), a shadow, and four mixed-up signs drifting around it (`.boss-bit`) – every
// boss muddles numbers, each in its own dress. Animated groups have classes (styles.css) and no
// transform attribute. Colours: CSS variables only.
import type { ComponentChildren } from 'preact';
import type { BossArtProps } from './types';

const SPOTS = [
  [6, 26, 16],
  [100, 24, 16],
  [2, 98, 14],
  [104, 96, 14]
] as const;

interface Props extends BossArtProps {
  /** The boss itself, drawn in a 120×120 box, feet near y = 108. */
  children: ComponentChildren;
  /** Four signs and their colours (CSS values). */
  bits: [string, string][];
  /** Something behind the body that does not float (a goal, a stage light). */
  behind?: ComponentChildren;
}

export function BossSvg({ class: cls = '', state = 'idle', children, bits, behind }: Props) {
  return (
    <svg class={`boss-art is-${state} ${cls}`} viewBox="0 0 120 120" aria-hidden="true">
      {behind}
      <g class="boss-body">
        <ellipse cx="60" cy="112" rx="34" ry="5" fill="var(--hero-ink)" opacity="0.14" />
        {children}
      </g>
      <g class="boss-bits" font-weight="800" font-family="var(--font)">
        {bits.slice(0, 4).map(([ch, color], i) => (
          <text key={i} class={`boss-bit b${i + 1}`} x={SPOTS[i][0]} y={SPOTS[i][1]} font-size={SPOTS[i][2]} fill={color}>
            {ch}
          </text>
        ))}
      </g>
    </svg>
  );
}

/** Rows for map scenery: y positions every `gap` map units, and which side (0 left, 1 right). */
export function sceneryRows(height: number, gap: number, start = 60): { y: number; side: 0 | 1; i: number }[] {
  const out: { y: number; side: 0 | 1; i: number }[] = [];
  for (let y = start, i = 0; y < height - 20; y += gap, i++) out.push({ y, side: (i % 2) as 0 | 1, i });
  return out;
}
