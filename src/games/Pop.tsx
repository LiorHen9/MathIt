// Pop (בחירה מהירה) – the first game template (docs/ARCHITECTURE.md §4.3): the question on a
// card, and the answer picked from big floating bubbles or typed on the number pad.
// A template only shows one question and reports the child's answer (with the element it came
// from, for the feedback to start there). The round, scoring and feedback are GameHost's.
// Phase 5 gives every world its own skin for it (magic bubbles, hoops, targets…).
import { useRef, useState } from 'preact/hooks';
import type { Answer, Hint, Question, Sign } from '../core/types';
import { SpeakButton } from '../components/Speak';
import { Dots } from '../ui/Dots';
import { NumPad } from '../ui/NumPad';

export type InputMode = 'bubbles' | 'numpad';

interface Props {
  question: Question;
  mode: InputMode;
  /** The question is solved (or its answer shown): show the answer, take no more input. */
  done: boolean;
  /** Wrong answers already tried (their bubbles fade). */
  tried: Answer[];
  /** After two mistakes: the right answer is marked. */
  reveal: boolean;
  hint: Hint | null;
  onAnswer: (a: Answer, from: Element) => void;
}

const SIGN_NAME: Record<Sign, string> = { '<': 'קטן מ', '>': 'גדול מ', '=': 'שווה' };

function say(a: Answer): string {
  return typeof a === 'number' ? String(a) : SIGN_NAME[a];
}

export function Pop({ question: q, mode, done, tried, reveal, hint, onAnswer }: Props) {
  const [typed, setTyped] = useState('');
  const slot = useRef<HTMLSpanElement>(null);
  const showAnswer = done || reveal;
  const slotText = showAnswer ? String(q.answer) : mode === 'numpad' && typed ? typed : '?';
  const visual = hint?.visual ?? q.prompt.visual;
  const parts = (q.prompt.math ?? '?').split('?');

  function submitTyped() {
    if (!typed || done || !slot.current) return;
    const n = Number(typed);
    onAnswer(n, slot.current);
    // A wrong number is cleared so the child can try again.
    if (n !== q.answer) setTyped('');
  }

  return (
    <div class="pop">
      <section class="card prompt">
        <p class="prompt-text">
          {q.prompt.text} <SpeakButton text={q.prompt.speech} class="speak-inline" />
        </p>
        {visual && <Dots visual={visual} key={hint ? 'hint' : 'q'} class={hint ? 'is-hint' : ''} />}
        <p class={`prompt-math math ${q.prompt.math ? '' : 'is-solo'}`} dir="ltr" data-testid="prompt-math">
          {parts.map((part, i) => [
            part && (
              <span key={`p${i}`} class="prompt-part">
                {part.trim()}
              </span>
            ),
            i < parts.length - 1 && (
              <span key={`s${i}`} ref={slot} class={`slot ${showAnswer ? 'is-answer' : ''} ${mode === 'numpad' && typed && !showAnswer ? 'is-typed' : ''}`} data-testid="slot">
                {slotText}
              </span>
            )
          ])}
        </p>
        {hint && (
          <p class="prompt-hint" data-testid="hint">
            💡 {hint.text} <SpeakButton text={hint.text} class="speak-inline" />
          </p>
        )}
      </section>

      {mode === 'bubbles' ? (
        <div class={`bubbles n-${q.choices.length}`} dir="ltr" role="group" aria-label="תשובות">
          {q.choices.map((c, i) => {
            const wrong = tried.includes(c);
            const right = showAnswer && c === q.answer;
            return (
              <button
                type="button"
                key={String(c)}
                class={`bubble c-${(i % 4) + 1} ${wrong ? 'is-wrong' : ''} ${right ? 'is-right' : ''} ${showAnswer && !right ? 'is-off' : ''}`}
                style={`--i:${i}`}
                data-answer={String(c)}
                aria-label={say(c)}
                disabled={done || wrong || reveal}
                onClick={(e) => onAnswer(c, e.currentTarget)}
              >
                <span class="bubble-face">{String(c)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <NumPad
          value={typed}
          onChange={setTyped}
          disabled={done || reveal}
          onSubmit={submitTyped}
        />
      )}
    </div>
  );
}
