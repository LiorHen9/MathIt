// The missing-number board (phase 9): the exercise with its gap, typed on the big number pad.
// A wrong number is a slip (cleared, to try again); a hint says how to undo the exercise.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { makeMissing } from '../../core/puzzles/missing';
import { NumPad } from '../../ui/NumPad';
import type { PuzzleProps } from './types';

export function Missing({ level, seed, hint, onHintText, onMistake, onSolved, onTask }: PuzzleProps) {
  const p = useMemo(() => makeMissing(level, seed), [level, seed]);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => onTask('איזה מספר חסר בתרגיל?'), [p]);
  useEffect(() => {
    if (hint && !done) onHintText(p.undo);
  }, [hint]);
  const [before, after] = p.math.split('?');
  function check() {
    const el = document.querySelector('.ms-math');
    if (Number(typed) === p.answer) {
      setDone(true);
      onSolved(el);
    } else {
      setTyped('');
      onMistake(el);
    }
  }
  return (
    <div class="puzzle-missing" data-solution={p.answer}>
      <p class="ms-math math" dir="ltr" data-testid="missing-math">
        <span>{before.trim()}</span>
        <span class={`slot ${done ? 'is-answer' : typed ? 'is-typed' : ''}`} data-testid="slot">
          {done ? p.answer : typed || '?'}
        </span>
        <span>{after.trim()}</span>
      </p>
      <NumPad value={typed} onChange={setTyped} onSubmit={check} maxLength={4} disabled={done} />
    </div>
  );
}
