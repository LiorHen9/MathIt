// Match (זיכרון, docs/ARCHITECTURE.md §4.3): a memory game of exercise–result pairs. The question
// is one pair: its exercise card lies face up, and the four results (the answer and the smart
// wrong ones) are shown for a moment, then turned face down – where was 13? Tapping a card turns
// it over: the right one makes the pair, which joins the board; a wrong one stays up, dimmed.
// The round is the board: every pair found fills one of its slots (TemplateProps.board).
// Cards turn by transform (rotateY); with reduced motion they swap at once. The world dresses
// the card backs (World.templateSkins.match).
import { useEffect, useState } from 'preact/hooks';
import { answerKey, answerText, isCorrect } from '../core/types';
import { emit } from '../fx/director';
import { reducedMotion } from '../fx/motion';
import { useWorld } from '../worlds/index';
import { PromptCard, type TemplateProps } from './PromptCard';

/** How long the results show before they turn face down. */
export const PEEK_MS = 1600;
export const BOARD_SLOTS = 8;

export function Match({ question: q, done, tried, reveal, hint, earlyHint, explaining, onAnswer, board = [] }: TemplateProps) {
  const skin = useWorld().templateSkins?.match;
  const look = skin?.look ?? 'wand';
  const [peek, setPeek] = useState(true);
  const [open, setOpen] = useState<string[]>([]);
  const showAnswer = done || reveal;
  const exercise = (q.prompt.math ?? '').replace(/\s*=\s*\?$/, '');
  useEffect(() => {
    const t = window.setTimeout(() => setPeek(false), reducedMotion() ? PEEK_MS * 1.2 : PEEK_MS);
    return () => clearTimeout(t);
  }, [q.id]);

  function flip(k: string, value: (typeof q.choices)[number], el: HTMLElement) {
    if (peek || done || reveal || open.includes(k)) return;
    emit({ type: 'tap' }, { el });
    setOpen((o) => [...o, k]);
    // The card turns over first; then it is the answer.
    window.setTimeout(() => onAnswer(value, el), reducedMotion() ? 60 : 320);
  }

  const slots = Array.from({ length: BOARD_SLOTS }, (_, i) => board[i] ?? null);
  return (
    <div class="match">
      {!explaining && (
        <ol class="mt-board" aria-label={`זוגות שנמצאו: ${board.length}`} dir="ltr" data-testid="match-board" data-pairs={board.length}>
          {slots.map((s, i) => (
            <li key={i} class={`mt-slot ${s ? 'is-full' : ''}`}>
              {s && (
                <span>
                  {s.math}={s.answer}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      <PromptCard question={q} done={done} reveal={reveal} hint={hint} earlyHint={earlyHint} explaining={explaining} />
      {!explaining && (
        <div class={`mt-table skin-${look}`} data-skin={look} dir="ltr">
          <div class="mt-card mt-exercise is-up" aria-hidden="true">
            <span class="mt-face">{exercise}</span>
          </div>
          <div class="mt-cards" role="group" aria-label="קלפים: מוצאים את התוצאה" data-peek={peek ? 'yes' : 'no'}>
            {q.choices.map((c) => {
              const k = answerKey(c);
              const up = peek || open.includes(k) || (showAnswer && isCorrect(q, c));
              const wrong = tried.some((t) => answerKey(t) === k);
              const right = showAnswer && isCorrect(q, c);
              return (
                <button
                  type="button"
                  key={k}
                  class={`mt-card ${up ? 'is-up' : ''} ${wrong ? 'is-wrong' : ''} ${right ? 'is-right' : ''}`}
                  data-answer={k}
                  aria-label={up ? answerText(c, q.unit) : 'קלף הפוך'}
                  disabled={peek || done || reveal || wrong}
                  onClick={(e) => flip(k, c, e.currentTarget)}
                >
                  <span class="mt-inner">
                    <span class="mt-back" aria-hidden="true">
                      {skin?.deco ?? '❓'}
                    </span>
                    <span class="mt-face">{answerText(c, q.unit)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
