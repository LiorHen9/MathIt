// Math text with fractions drawn the way a child writes them (phase 9): "3/4" becomes a small
// stacked fraction – the numerator over a line over the denominator. Everything else is as it is.
// Read aloud from the text the question gives (in words), never from this.
import type { ComponentChildren } from 'preact';

const FRAC = /(\d+)\/(\d+)/g;

export function MathText({ text }: { text: string }) {
  if (!text.includes('/')) return <>{text}</>;
  const out: ComponentChildren[] = [];
  let last = 0;
  for (const m of text.matchAll(FRAC)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(
      <span class="frac" key={m.index} aria-label={`${m[1]} חלקי ${m[2]}`}>
        <span class="frac-n">{m[1]}</span>
        <span class="frac-d">{m[2]}</span>
      </span>
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
