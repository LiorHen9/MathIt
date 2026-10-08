// The question card every game template shows (docs/ARCHITECTURE.md §4.3): the sentence (read
// aloud on demand), the picture or – after a mistake – the hint's animation with a replay button,
// the exercise with its answer slot ("8 + 5 = ?", LTR), and the hint's sentence.
// Shared by Pop, Jump, Build, Match, Clock and Shop (games/), so a hint and its animation look
// the same in every game.
import type { Ref } from 'preact';
import { useState } from 'preact/hooks';
import { answerText, type Hint, type Question } from '../core/types';
import { SpeakButton } from '../components/Speak';
import { Picture } from '../ui/Picture';
import { Manipulative } from '../manipulatives/index';
import { playSfx } from '../audio/sfx';

/** A hint's animation runs a little calmer than a lesson. */
export const HINT_SPEED = 0.85;

/** What every template gets from games/Ask.tsx – and the one thing it reports: an answer. */
export interface TemplateProps {
  question: Question;
  /** Pop: bubbles or the number pad. */
  mode: 'bubbles' | 'numpad';
  /** The question is solved (or its answer shown): show the answer, take no more input. */
  done: boolean;
  /** Wrong answers already tried. */
  tried: import('../core/types').Answer[];
  /** After two mistakes: the right answer is marked. */
  reveal: boolean;
  hint: Hint | null;
  /** The hint came before any mistake (a struggling child). */
  earlyHint?: boolean;
  /** The hero is explaining below: the card keeps only the exercise, no answers to pick. */
  explaining?: boolean;
  onAnswer: (a: import('../core/types').Answer, from: Element) => void;
  /** The child's gender, for the hero in the templates that show it. */
  gender?: import('../profiles/profiles').Gender;
  /** Match: the pairs found so far in the round (the board). */
  board?: { math: string; answer: string }[];
}

interface Props {
  question: Question;
  done: boolean;
  reveal: boolean;
  hint: Hint | null;
  earlyHint?: boolean;
  explaining?: boolean;
  /** What the slot shows while asking (Pop's typed number), else "?". */
  slotText?: string;
  slotRef?: Ref<HTMLSpanElement>;
  /** Hide the static picture (the template draws its own: a shop, a clock). */
  noPicture?: boolean;
}

export function PromptCard({ question: q, done, reveal, hint, earlyHint = false, explaining = false, slotText, slotRef, noPicture = false }: Props) {
  const [replay, setReplay] = useState(0);
  const showAnswer = done || reveal;
  const slot = showAnswer ? answerText(q.answer, q.unit) : slotText || '?';
  const visual = hint?.visual ?? (noPicture ? undefined : q.prompt.visual);
  const parts = (q.prompt.math ?? '?').split('?');
  return (
    <section class="card prompt">
      <p class="prompt-text">
        {q.prompt.text} <SpeakButton text={q.prompt.speech} class="speak-inline" />
      </p>
      {hint?.action ? (
        <div class="hint-anim" data-testid="hint-anim" data-kind={hint.action.kind}>
          <Manipulative action={hint.action} speed={HINT_SPEED} play={replay} stopped={done || reveal} />
          {!done && (
            <button
              type="button"
              class="icon-btn replay-btn"
              aria-label="להראות שוב"
              data-testid="hint-replay"
              onClick={() => {
                playSfx('tap');
                setReplay((r) => r + 1);
              }}
            >
              ↻
            </button>
          )}
        </div>
      ) : (
        visual && !explaining && <Picture visual={visual} key={hint ? 'hint' : 'q'} class={hint ? 'is-hint' : ''} />
      )}
      <p class={`prompt-math math ${q.prompt.math ? '' : 'is-solo'}`} dir="ltr" data-testid="prompt-math">
        {parts.map((part, i) => [
          part && (
            <span key={`p${i}`} class="prompt-part">
              {part.trim()}
            </span>
          ),
          i < parts.length - 1 && (
            <span key={`s${i}`} ref={slotRef} class={`slot ${showAnswer ? 'is-answer' : ''} ${slotText && !showAnswer ? 'is-typed' : ''}`} data-testid="slot">
              {slot}
            </span>
          )
        ])}
      </p>
      {hint && (
        <p class="prompt-hint" data-testid="hint" data-early={earlyHint ? 'yes' : 'no'}>
          💡 {hint.text} <SpeakButton text={hint.text} class="speak-inline" />
        </p>
      )}
    </section>
  );
}
