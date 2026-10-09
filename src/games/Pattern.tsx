// Pattern (סדרות, phase 9): a sequence of number tiles with a gap – "3, 6, 9, ?" – and a tray of
// tiles below. A tile is placed in the gap by a tap (it flies there) or by dragging it there;
// placing it is the answer. Right: it stays and the row lights up, tile by tile, each with its
// note. Wrong: it slides back to the tray, marked. For sequences (the pattern skill) and the
// times table's columns (mul.table: the column's multiples).
// The world dresses the tiles (beads, jerseys, scrolls… World.templateSkins.pattern).
import { useRef, useState } from 'preact/hooks';
import { answerKey, isCorrect, type Answer } from '../core/types';
import { emit } from '../fx/director';
import { reducedMotion } from '../fx/motion';
import { useWorld } from '../worlds/index';
import { PromptCard, type TemplateProps } from './PromptCard';
import '../ui/phase9.css';

export function Pattern({ question: q, done, tried, reveal, hint, earlyHint, explaining, onAnswer }: TemplateProps) {
  const look = useWorld().templateSkins?.pattern?.look ?? 'pat-beads';
  const terms = (q.prompt.math ?? '?').split(', ');
  const gapRef = useRef<HTMLSpanElement>(null);
  const [drag, setDrag] = useState<{ key: string; x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const showAnswer = done || reveal;

  /** Fly the tile to the gap, then answer. */
  function place(a: Answer, tile: HTMLElement) {
    if (showAnswer || tried.some((t) => answerKey(t) === answerKey(a))) return;
    const gap = gapRef.current;
    if (!gap) return onAnswer(a, tile);
    const r0 = tile.getBoundingClientRect();
    const r1 = gap.getBoundingClientRect();
    const dx = r1.left + r1.width / 2 - (r0.left + r0.width / 2);
    const dy = r1.top + r1.height / 2 - (r0.top + r0.height / 2);
    emit({ type: 'tap' });
    const fast = reducedMotion();
    const right = isCorrect(q, a);
    const fly = tile.animate(
      right || fast ? [{ transform: tile.style.transform || 'translate(0,0)' }, { transform: `translate(${dx}px, ${dy}px)` }] : [{ transform: tile.style.transform || 'translate(0,0)' }, { transform: `translate(${dx}px, ${dy}px)`, offset: 0.55 }, { transform: 'translate(0,0)' }],
      { duration: fast ? 200 : right ? 320 : 700, easing: 'cubic-bezier(.4,0,.3,1)' }
    );
    tile.style.transform = '';
    const go = () => {
      onAnswer(a, gap);
      if (right) lightRow();
    };
    // A right tile lands, then the answer; a wrong one bounces back (the answer goes at once).
    if (right) fly.finished.then(go, go);
    else go();
  }

  function lightRow() {
    const tiles = gapRef.current?.parentElement?.querySelectorAll<HTMLElement>('.pt-term');
    tiles?.forEach((_t, i) => window.setTimeout(() => emit({ type: 'count', n: i + 1 }), 120 * i));
  }

  function down(e: PointerEvent, key: string) {
    if (showAnswer) return;
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ key, x: 0, y: 0 });
  }

  function move(e: PointerEvent) {
    if (!start.current || !drag) return;
    const x = e.clientX - start.current.x;
    const y = e.clientY - start.current.y;
    if (Math.abs(x) + Math.abs(y) > 8) start.current.moved = true;
    (e.currentTarget as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
  }

  function up(e: PointerEvent, a: Answer) {
    const s = start.current;
    start.current = null;
    setDrag(null);
    const tile = e.currentTarget as HTMLElement;
    if (!s) return;
    if (!s.moved) return place(a, tile);
    // Dropped on the gap (or near it): placed; anywhere else: back to the tray.
    const g = gapRef.current?.getBoundingClientRect();
    const near = g && e.clientX > g.left - 24 && e.clientX < g.right + 24 && e.clientY > g.top - 30 && e.clientY < g.bottom + 30;
    if (near) return place(a, tile);
    tile.animate([{ transform: tile.style.transform }, { transform: 'translate(0,0)' }], { duration: 220, easing: 'ease-out' });
    tile.style.transform = '';
  }

  return (
    <div class="pattern">
      <PromptCard question={q} done={done} reveal={reveal} hint={hint} earlyHint={earlyHint} explaining={explaining} noMath />
      <div class={`pt-board skin-${look}`} data-skin={look}>
        <p class={`pt-row math ${showAnswer ? 'is-done' : ''}`} dir="ltr" data-testid="pattern-row" aria-label={q.prompt.speech}>
          {terms.map((t, i) =>
            t === '?' ? (
              <span key={i} ref={gapRef} class={`pt-term pt-gap ${showAnswer ? 'is-answer' : ''}`} data-testid="slot">
                {showAnswer ? answerKey(q.answer) : '?'}
              </span>
            ) : (
              <span key={i} class="pt-term">
                {t}
              </span>
            )
          )}
        </p>
        {!explaining && (
          <div class="pt-tray" dir="ltr" role="group" aria-label="אבנים להשלמה">
            {q.choices.map((c) => {
              const k = answerKey(c);
              const wrong = tried.some((t) => answerKey(t) === k);
              return (
                <button
                  type="button"
                  key={k}
                  class={`pt-tile ${wrong ? 'is-wrong' : ''} ${drag?.key === k ? 'is-dragging' : ''} ${showAnswer && isCorrect(q, c) ? 'is-right is-placed' : ''}`}
                  data-answer={k}
                  aria-label={`להשלים ${k}`}
                  disabled={showAnswer || wrong}
                  onPointerDown={(e) => down(e, k)}
                  onPointerMove={move}
                  onPointerUp={(e) => up(e, c)}
                  onPointerCancel={() => ((start.current = null), setDrag(null))}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), place(c, e.currentTarget))}
                >
                  {k}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
