// Draws a question's Visual (core/types.ts): groups of stars, side by side, five to a row (like a
// ten frame), with an optional sign between them, items taken away crossed out, and optional
// counting numbers under the items (a hint). Colours come from the world's --num-* variables.
// Static for now; phase 3 brings the animated version (manipulatives/).
import type { Visual } from '../core/types';
import { starPath } from '../fx/Hero';

const STAR = starPath(12, 12.5, 11, 5, 0.48);

function label(v: Visual): string {
  const [a, b] = v.groups;
  if (v.crossed) return `${a} כוכבים, ${v.crossed} מהם הולכים`;
  if (b !== undefined) return `${a} כוכבים ועוד ${b} כוכבים`;
  return a === 1 ? 'כוכב אחד' : `${a} כוכבים`;
}

export function Dots({ visual, class: cls = '' }: { visual: Visual; class?: string }) {
  const { groups, crossed = 0, between, numbered } = visual;
  // Numbers continue across groups when adding, start again for each group when comparing,
  // and skip the crossed-out ones when taking away.
  let counter = 0;
  const two = groups.length > 1;
  return (
    <div class={`dots ${two ? 'is-two' : ''} ${cls}`} role="img" aria-label={label(visual)} dir="ltr">
      {groups.map((n, gi) => {
        if (between === '?') counter = 0;
        const items = [];
        for (let i = 0; i < n; i++) {
          const gone = gi === groups.length - 1 && i >= n - crossed;
          if (!gone) counter++;
          items.push(
            <span class={`dot ${gone ? 'is-gone' : ''}`} key={i}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={STAR} />
                {gone && <path class="dot-x" d="M5 5 L19 19 M19 5 L5 19" />}
              </svg>
              {numbered && !gone && <span class="dot-n">{counter}</span>}
            </span>
          );
        }
        return [
          gi > 0 && between ? (
            <span class="dots-sign" key={`s${gi}`} aria-hidden="true">
              {between}
            </span>
          ) : null,
          <span class={`dots-group g-${gi + 1}`} key={`g${gi}`} style={`--cols:${Math.min(5, Math.max(1, n))}`}>
            {items}
          </span>
        ];
      })}
    </div>
  );
}
