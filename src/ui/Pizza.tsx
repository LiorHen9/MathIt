// A pizza (phase 9): the picture of fractions – a round pie cut into equal slices from the top,
// clockwise, some of them with topping. Colours from CSS variables only (styles .pz-*).
// Shared by the question's picture, the teaching animation and the Slice game.
import './phase9.css';

export const PZ_R = 46;

const pt = (deg: number, r = PZ_R) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
};

/** The path of slice `i` of `d` (a whole pie when d is 1). */
export function wedge(i: number, d: number, r = PZ_R): string {
  if (d <= 1) return `M50 ${50 - r} A${r} ${r} 0 1 1 49.99 ${50 - r} Z`;
  const a0 = (i * 360) / d;
  const a1 = ((i + 1) * 360) / d;
  return `M50 50 L${pt(a0, r)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(a1, r)} Z`;
}

/** The cut between slice i − 1 and slice i: from the middle to the crust. */
export function cut(i: number, d: number): { x2: string; y2: string } {
  const [x2, y2] = pt((i * 360) / d, PZ_R + 1).split(' ');
  return { x2, y2 };
}

/** A pizza in `d` slices, the first `n` with topping (a static picture). */
export function PizzaPic({ n, d, class: cls = '', label }: { n: number; d: number; class?: string; label?: string }) {
  return (
    <svg class={`pizza ${cls}`} viewBox="0 0 100 100" role="img" aria-label={label ?? `פיצה ב-${d} חלקים, ${n} צבועים`}>
      <circle class="pz-crust" cx="50" cy="50" r="49" />
      {Array.from({ length: d }, (_, i) => (
        <path key={i} class={`pz-slice ${i < n ? 'is-on' : ''}`} d={wedge(i, d)} />
      ))}
      {d > 1 &&
        Array.from({ length: d }, (_, i) => {
          const c = cut(i, d);
          return <line key={`c${i}`} class="pz-cut" x1="50" y1="50" x2={c.x2} y2={c.y2} />;
        })}
    </svg>
  );
}
