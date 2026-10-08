// Jump (ציר מספרים, docs/ARCHITECTURE.md §4.3): a stretch of the number line as platforms – six
// numbers in a row, left to right – and the world's hero standing at the start. Tapping a number
// makes the hero hop there in an arc (a hop sound with the number's note); landing is the answer.
// Right: the hero stays and the platform lights; wrong: the platform sinks a little and the hero
// hops back. The numbers are a window around the answer that holds as many of the question's smart
// wrong answers as fit (the others count as "near"). The world dresses the platforms (clouds,
// cones, hoops, rooftops, pillars, lights – World.templateSkins.jump).
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { answerKey, isCorrect } from '../core/types';
import { emit } from '../fx/director';
import { Hero } from '../fx/Hero';
import { reducedMotion } from '../fx/motion';
import { arcFrames } from '../manipulatives/timeline';
import { useWorld } from '../worlds/index';
import { PromptCard, type TemplateProps } from './PromptCard';

export const JUMP_SPAN = 6;

/** The numbers on the platforms: `span` in a row with the answer, as many distractors as fit. */
export function jumpWindow(answer: number, distractors: number[], seed: number, span = JUMP_SPAN): number[] {
  let best = -1;
  let starts: number[] = [];
  for (let s = Math.max(0, answer - span + 1); s <= answer; s++) {
    const n = distractors.filter((d) => d >= s && d < s + span).length;
    if (n > best) {
      best = n;
      starts = [s];
    } else if (n === best) starts.push(s);
  }
  const s = starts[seed % starts.length];
  return Array.from({ length: span }, (_, i) => s + i);
}

export function Jump({ question: q, done, tried, reveal, hint, earlyHint, explaining, onAnswer, gender }: TemplateProps) {
  const world = useWorld();
  const look = world.templateSkins?.jump?.look ?? 'clouds';
  const nums = useMemo(() => jumpWindow(q.answer as number, q.distractors.filter((d): d is number => typeof d === 'number'), q.seed), [q.id]);
  const [at, setAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const showAnswer = done || reveal;

  /** The hero's x over a platform (or the start pad), relative to the row. */
  const xOf = (n: number | null) => {
    const el = row.current?.querySelector<HTMLElement>(n === null ? '.jp-start' : `[data-answer="${n}"]`);
    return el ? el.offsetLeft + el.offsetWidth / 2 : 0;
  };
  const place = (n: number | null) => {
    if (hero.current) hero.current.style.transform = `translateX(${xOf(n)}px)`;
  };
  useLayoutEffect(() => place(at), [at, q.id]);
  useLayoutEffect(() => {
    if (reveal) place(q.answer as number);
  }, [reveal]);

  async function hop(from: number | null, to: number | null): Promise<void> {
    const el = hero.current;
    if (!el) return;
    const x0 = xOf(from);
    const x1 = xOf(to);
    if (reducedMotion()) {
      await el.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 260 }).finished.catch(() => {});
    } else {
      await el
        .animate(
          arcFrames(x1 - x0, 0, 46).map((f) => ({ ...f, transform: `translateX(${x0}px) ${f.transform}` })),
          { duration: 420, easing: 'linear' }
        )
        .finished.catch(() => {});
    }
    el.style.transform = `translateX(${x1}px)`;
  }

  async function pick(n: number, btn: HTMLElement) {
    if (busy || done || reveal) return;
    setBusy(true);
    await hop(at, n);
    emit({ type: 'jump', n });
    setAt(n);
    onAnswer(n, btn);
    if (!isCorrect(q, n)) {
      // Back to the start after a moment.
      await new Promise((r) => setTimeout(r, reducedMotion() ? 250 : 500));
      await hop(n, null);
      setAt(null);
    }
    setBusy(false);
  }

  return (
    <div class="jump">
      <PromptCard question={q} done={done} reveal={reveal} hint={hint} earlyHint={earlyHint} explaining={explaining} />
      {!explaining && (
        <div class={`jp-track skin-${look}`} data-skin={look} dir="ltr">
          <div class="jp-row" ref={row} role="group" aria-label="ציר המספרים: קופצים למספר הנכון">
            <span class="jp-start" aria-hidden="true" />
            {nums.map((n) => {
              const wrong = tried.some((t) => answerKey(t) === String(n));
              const right = showAnswer && isCorrect(q, n);
              return (
                <button
                  type="button"
                  key={n}
                  class={`jp-plat ${wrong ? 'is-wrong' : ''} ${right ? 'is-right' : ''} ${showAnswer && !right ? 'is-off' : ''}`}
                  data-answer={n}
                  aria-label={`לקפוץ ל-${n}`}
                  disabled={done || reveal || wrong || busy}
                  onClick={(e) => void pick(n, e.currentTarget)}
                >
                  <span class="jp-num">{n}</span>
                </button>
              );
            })}
            <div class="jp-hero" ref={hero} aria-hidden="true">
              {world.hero && <Hero def={world.hero} gender={gender} state={showAnswer && done ? 'happy' : 'idle'} />}
            </div>
          </div>
          <div class="jp-ground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
