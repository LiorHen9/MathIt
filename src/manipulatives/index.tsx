// Manipulatives (docs/ARCHITECTURE.md §6.1): the teaching animations. Each takes plain numbers,
// knows nothing about questions, plays on mount (again when `play` changes), calls `onDone` at the
// end, and shows its end state at once when `stopped`. Sounds go through the Feedback Director
// (count, jump, ten, whoosh). They load with the game and lesson screens, never on first load.
import type { Action } from '../core/types';
import type { RunProps } from './timeline';
import { Counters } from './Counters';
import { TenFrame } from './TenFrame';
import { Combine } from './Combine';
import { TakeAway } from './TakeAway';
import { NumberLine } from './NumberLine';
import { Compare } from './Compare';

export { Counters, TenFrame, Combine, TakeAway, NumberLine, Compare };

/** The manipulative for an action from the Learning Core. */
export function Manipulative({ action, ...run }: { action: Action } & RunProps) {
  switch (action.kind) {
    case 'count':
      return <Counters n={action.n} {...run} />;
    case 'tenFrame':
      return <TenFrame n={action.n} {...run} />;
    case 'combine':
      return <Combine a={action.a} b={action.b} {...run} />;
    case 'takeAway':
      return <TakeAway a={action.a} b={action.b} {...run} />;
    case 'jump':
      return <NumberLine from={action.from} by={action.by} {...run} />;
    case 'compare':
      return <Compare a={action.a} b={action.b} {...run} />;
  }
}
