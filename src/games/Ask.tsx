// One question, the whole way through (docs/ARCHITECTURE.md §7.3) – shared by a practice round
// (screens/GameHost.tsx) and a lesson's "your turn" (screens/Lesson.tsx):
// - right → `onRight` (the host emits `correct` with its streak and moves on);
// - first mistake → shake + "try again", then a hint chosen for the kind of mistake
//   (core pickHint), animated in the question card (manipulatives/), calm, with a replay button;
// - second mistake → the hero explains step by step, animated and read aloud (Explainer); the
//   answer appears at the end, and only then "next" (or "skip" during the explanation).
// The template (games/Pop.tsx) only shows the question and reports answers.
import { useEffect, useRef, useState } from 'preact/hooks';
import { MAX_WRONG } from '../core/round';
import { isCorrect, pickHint, type Answer, type Hint, type Question } from '../core/types';
import { emit } from '../fx/director';
import { Explainer } from '../manipulatives/Explainer';
import { byGender, type Profile } from '../profiles/profiles';
import type { Message } from '../components/Speak';
import { stopSpeaking } from '../audio/speech';
import { playSfx } from '../audio/sfx';
import { Pop, type InputMode } from './Pop';

export type AskStatus = 'asking' | 'solved' | 'explaining' | 'shown';

let msgId = 0;
export const msg = (text: string, tone: Message['tone'], speech?: string): Message => ({ text, tone, id: ++msgId, speech });

interface Props {
  question: Question;
  mode: InputMode;
  profile: Profile;
  /** The hero's speech bubble. */
  onMessage: (m: Message | null) => void;
  /** Right answer; `wrongBefore` = mistakes on this question before it (0 or 1). */
  onRight: (wrongBefore: number, from: Element) => void;
  /** Any mistake (a round's streak ends). */
  onWrong?: () => void;
  /** The answer was shown after two mistakes. */
  onShown?: () => void;
  /** "Next" after the answer was shown. */
  onNext: () => void;
  nextLabel: string;
}

export function Ask({ question: q, mode, profile, onMessage, onRight, onWrong, onShown, onNext, nextLabel }: Props) {
  const [tried, setTried] = useState<Answer[]>([]);
  const [status, setStatus] = useState<AskStatus>('asking');
  const [hint, setHint] = useState<Hint | null>(null);
  const [skipped, setSkipped] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function answer(a: Answer, from: Element) {
    if (status !== 'asking') return;
    if (isCorrect(q, a)) {
      setStatus('solved');
      onRight(tried.length, from);
      return;
    }
    const attempt = tried.length + 1;
    setTried((t) => [...t, a]);
    onWrong?.();
    emit({ type: 'wrong', attempt }, { el: from });
    if (attempt < MAX_WRONG) {
      onMessage(msg(byGender(profile, 'נסה שוב!', 'נסי שוב!', 'נסו שוב!'), 'bad'));
      // The hint a moment later, so the two sounds do not collide.
      timers.current.push(
        window.setTimeout(() => {
          setHint(pickHint(q, a));
          emit({ type: 'hint' });
        }, 450)
      );
    } else {
      setStatus('explaining');
      // Not read aloud: the explanation itself is.
      onMessage(msg(byGender(profile, 'בוא נראה יחד 👀', 'בואי נראה יחד 👀', 'בואו נראה יחד 👀'), 'info', ''));
    }
  }

  function show(skip: boolean) {
    if (status !== 'explaining') return;
    if (skip) {
      playSfx('tap');
      stopSpeaking();
      setSkipped(true);
    }
    setStatus('shown');
    const shown = typeof q.answer === 'number' ? `התשובה היא ${q.answer}.` : `הסימן הנכון הוא ${q.answer}`;
    onMessage(msg(shown, 'info'));
    onShown?.();
  }

  const explaining = status === 'explaining' || status === 'shown';
  return (
    <>
      <Pop
        question={q}
        mode={mode}
        done={status === 'solved'}
        tried={tried}
        reveal={status === 'shown'}
        explaining={explaining}
        hint={hint && !explaining ? hint : null}
        onAnswer={answer}
      />
      {explaining && (
        <>
          <Explainer steps={q.explanation} skip={skipped} onDone={() => show(false)} />
          <div class="explain-actions">
            {status === 'explaining' ? (
              <button type="button" class="btn btn-ghost" data-testid="skip-explain" onClick={() => show(true)}>
                {byGender(profile, 'דלג', 'דלגי', 'דלגו')} ⏭
              </button>
            ) : (
              <button type="button" class="btn btn-primary" data-testid="next" onClick={onNext}>
                {nextLabel}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
