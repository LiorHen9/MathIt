// Pop (בחירה מהירה) – the first game template (docs/ARCHITECTURE.md §4.3): the question on a
// card, and the answer picked from big floating bubbles or typed on the number pad.
// A template only shows one question and reports the child's answer (with the element it came
// from, for the feedback to start there). The round, scoring and feedback are GameHost's; the
// card (with the hint's animation) is games/PromptCard.tsx, shared by every template.
// Every world dresses the answers its own way (World.templateSkins.pop, CSS `.skin-<look>`):
// magic bubbles, balls, hoops, targets, blocks, spotlights.
import { useRef, useState } from 'preact/hooks';
import { answerKey, answerText, isCorrect, type Answer, type Sign } from '../core/types';
import { NumPad } from '../ui/NumPad';
import { useWorld } from '../worlds/index';
import { PromptCard, type TemplateProps } from './PromptCard';

export type InputMode = TemplateProps['mode'];

const SIGN_NAME: Record<Sign, string> = { '<': 'קטן מ', '>': 'גדול מ', '=': 'שווה' };

function say(a: Answer, unit?: string): string {
  return typeof a === 'string' ? SIGN_NAME[a] : answerText(a, unit);
}

export function Pop({ question: q, mode, done, tried, reveal, hint, earlyHint = false, explaining = false, onAnswer }: TemplateProps) {
  const look = useWorld().templateSkins?.pop.look ?? 'magic';
  const [typed, setTyped] = useState('');
  const slot = useRef<HTMLSpanElement>(null);
  const showAnswer = done || reveal;

  function submitTyped() {
    if (!typed || done || !slot.current) return;
    const n = Number(typed);
    onAnswer(n, slot.current);
    // A wrong number is cleared so the child can try again.
    if (!isCorrect(q, n)) setTyped('');
  }

  return (
    <div class="pop">
      <PromptCard
        question={q}
        done={done}
        reveal={reveal}
        hint={hint}
        earlyHint={earlyHint}
        explaining={explaining}
        slotText={mode === 'numpad' ? typed : undefined}
        slotRef={slot}
      />

      {explaining ? null : mode === 'bubbles' ? (
        <div class={`bubbles n-${q.choices.length} skin-${look}`} data-skin={look} dir="ltr" role="group" aria-label="תשובות">
          {q.choices.map((c, i) => {
            const k = answerKey(c);
            const wrong = tried.some((t) => answerKey(t) === k);
            const right = showAnswer && isCorrect(q, c);
            return (
              <button
                type="button"
                key={k}
                class={`bubble c-${(i % 4) + 1} ${wrong ? 'is-wrong' : ''} ${right ? 'is-right' : ''} ${showAnswer && !right ? 'is-off' : ''}`}
                style={`--i:${i}`}
                data-answer={k}
                aria-label={say(c, q.unit)}
                disabled={done || wrong || reveal}
                onClick={(e) => onAnswer(c, e.currentTarget)}
              >
                <span class="bubble-face">{answerText(c, q.unit)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <NumPad value={typed} onChange={setTyped} disabled={done || reveal} onSubmit={submitTyped} maxLength={3} />
      )}
    </div>
  );
}
