// Slice (פיצה, phase 9): a fraction made with a knife and topping. The pizza starts whole; "✂️"
// cuts it into one more equal slice each time (a knife sound, climbing), "↺" puts it back whole,
// and a tap on a slice puts topping on it (or takes it off). "בודקים ✓" reports the fraction
// coloured – coloured slices over all the slices. The question says if a fraction worth the same
// counts (cutting finer: 6/8 for 3/4). After a wrong check the pizza stays, to be fixed.
// The world dresses the pizza (a cake, an orange, a pie… World.templateSkins.slice).
import { useRef, useState } from 'preact/hooks';
import { answerKey, isFrac, type Frac } from '../core/types';
import { emit } from '../fx/director';
import { cut, wedge } from '../ui/Pizza';
import { useWorld } from '../worlds/index';
import { PromptCard, type TemplateProps } from './PromptCard';
import '../ui/phase9.css';

export const MAX_SLICES = 12;

export function Slice({ question: q, done, tried, reveal, hint, earlyHint, explaining, onAnswer }: TemplateProps) {
  const look = useWorld().templateSkins?.slice?.look ?? 'slice-cake';
  const [slices, setSlices] = useState(1);
  const [on, setOn] = useState<boolean[]>([false]);
  const board = useRef<HTMLDivElement>(null);
  const answer = isFrac(q.answer) ? q.answer : { n: 0, d: 1 };
  const off = done || reveal;
  // Shown at the end: the answer itself (after two mistakes), or what the child made.
  const d = reveal ? answer.d : slices;
  const coloured = reveal ? Array.from({ length: answer.d }, (_, i) => i < answer.n) : on;
  const value: Frac = { n: on.filter(Boolean).length, d: slices };
  const triedThis = tried.some((t) => answerKey(t) === answerKey(value));

  function cutMore() {
    if (off || slices >= MAX_SLICES) return;
    const next = slices + 1;
    setSlices(next);
    // A new cut makes new slices: the topping starts again.
    setOn(Array.from({ length: next }, () => false));
    emit({ type: 'slice', n: next - 1 });
  }

  function whole() {
    if (off) return;
    setSlices(1);
    setOn([false]);
    emit({ type: 'tap' });
  }

  function toggle(i: number) {
    if (off || slices < 2) return;
    const next = on.slice();
    next[i] = !next[i];
    setOn(next);
    emit({ type: 'count', n: next.filter(Boolean).length || 1 });
  }

  return (
    <div class="slice">
      <PromptCard question={q} done={done} reveal={reveal} hint={hint} earlyHint={earlyHint} explaining={explaining} noPicture />
      {!explaining && (
        <div class={`sl-board skin-${look}`} data-skin={look} ref={board} data-slices={d} data-on={coloured.filter(Boolean).length}>
          <svg class="pizza sl-pizza" viewBox="0 0 100 100" role="group" aria-label={`פיצה ב-${d} חלקים, ${coloured.filter(Boolean).length} צבועים`}>
            <circle class="pz-crust" cx="50" cy="50" r="49" />
            {Array.from({ length: d }, (_, i) => (
              <path
                key={`${d}-${i}`}
                class={`pz-slice sl-slice ${coloured[i] ? 'is-on' : ''}`}
                d={wedge(i, d)}
                role="button"
                tabIndex={off || d < 2 ? -1 : 0}
                aria-label={`חלק ${i + 1}${coloured[i] ? ', צבוע' : ''}`}
                aria-pressed={coloured[i] ? 'true' : 'false'}
                data-testid={`slice-${i}`}
                onClick={() => toggle(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(i))}
              />
            ))}
            {d > 1 &&
              Array.from({ length: d }, (_, i) => {
                const c = cut(i, d);
                return <line key={`c${d}-${i}`} class="pz-cut sl-cut" x1="50" y1="50" x2={c.x2} y2={c.y2} />;
              })}
          </svg>
          <p class="sl-now math" dir="ltr" aria-live="polite" data-testid="slice-value">
            <span class="frac">
              <span class="frac-n">{coloured.filter(Boolean).length}</span>
              <span class="frac-d">{d}</span>
            </span>
          </p>
          <div class="row sl-tools">
            <button type="button" class="btn btn-secondary sl-cut-btn" data-testid="slice-cut" disabled={off || slices >= MAX_SLICES} onClick={cutMore}>
              ✂️ חותכים
            </button>
            <button type="button" class="icon-btn sl-whole" aria-label="פיצה שלמה מחדש" data-testid="slice-whole" disabled={off || slices === 1} onClick={whole}>
              ↺
            </button>
            <button
              type="button"
              class="btn btn-primary sl-check"
              data-testid="slice-check"
              disabled={off || slices < 2 || value.n === 0 || triedThis}
              onClick={(e) => onAnswer(value, board.current ?? e.currentTarget)}
            >
              בודקים ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
