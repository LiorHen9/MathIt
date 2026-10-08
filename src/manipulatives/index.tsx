// Manipulatives (docs/ARCHITECTURE.md §6.1): the teaching animations. Each takes plain numbers,
// knows nothing about questions, plays on mount (again when `play` changes), calls `onDone` at the
// end, and shows its end state at once when `stopped`. Sounds go through the Feedback Director
// (count, jump, ten, whoosh; phase 7 leap, tick, clink). They load with the game and lesson
// screens, never on first load; the phase 7 ones (rods and cubes, two ten frames, the long number
// line, the clock, coins, comparing to 100) are chunks of their own, loaded the first time they show.
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Action } from '../core/types';
import type { RunProps } from './timeline';
import { Counters } from './Counters';
import { TenFrame } from './TenFrame';
import { Combine } from './Combine';
import { TakeAway } from './TakeAway';
import { NumberLine } from './NumberLine';
import { Compare } from './Compare';

export { Counters, TenFrame, Combine, TakeAway, NumberLine, Compare };

/** A manipulative in its own chunk: a quiet placeholder until it arrives. */
function lazyPart<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let Loaded: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  return function Part(props: P) {
    const [, setReady] = useState(!!Loaded);
    useEffect(() => {
      if (Loaded) return;
      let alive = true;
      pending ??= load().then((c) => void (Loaded = c));
      pending.then(
        () => alive && setReady(true),
        (e) => {
          pending = null;
          console.error('[manipulative] failed to load', e);
        }
      );
      return () => void (alive = false);
    }, []);
    return Loaded ? <Loaded {...props} /> : <div class="manip is-loading" aria-busy="true" />;
  };
}

export const TensBlocks = lazyPart(() => import('./TensBlocks').then((m) => m.TensBlocks));
export const DoubleFrame = lazyPart(() => import('./DoubleFrame').then((m) => m.DoubleFrame));
export const LongLine = lazyPart(() => import('./LongLine').then((m) => m.LongLine));
export const ClockAnim = lazyPart(() => import('./ClockAnim').then((m) => m.ClockAnim));
export const CoinStack = lazyPart(() => import('./CoinStack').then((m) => m.CoinStack));
export const CompareTens = lazyPart(() => import('./CompareTens').then((m) => m.CompareTens));

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
      return action.a > 10 || action.b > 10 ? <CompareTens a={action.a} b={action.b} {...run} /> : <Compare a={action.a} b={action.b} {...run} />;
    case 'tens':
      return <TensBlocks tens={action.tens} ones={action.ones} add={action.add} take={action.take} ask={action.ask} {...run} />;
    case 'doubleFrame':
      return <DoubleFrame a={action.a} b={action.b} {...run} />;
    case 'line':
      return <LongLine from={action.from} hops={action.hops} max={action.max} {...run} />;
    case 'clock':
      return <ClockAnim h={action.h} m={action.m} {...run} />;
    case 'coins':
      return <CoinStack coins={action.coins} {...run} />;
  }
}
