// The hero explains (docs/ARCHITECTURE.md §6.1, §7.3): the steps of an explanation, one at a
// time. Each step's sentence is said (audio/speech.ts) while its animation plays; the next step
// starts only when both are over – with no Hebrew voice, after the time the sentence takes to
// read. The hero thinks while explaining and is happy at the end (through the Director).
// Used by the lesson's "watch" screens and after a second mistake in a round.
import { useEffect, useRef, useState } from 'preact/hooks';
import { sayAndWait } from '../audio/speech';
import { holdMusic } from '../audio/music';
import { SpeakButton } from '../components/Speak';
import type { Step } from '../core/types';
import { emit } from '../fx/director';
import { reducedMotion } from '../fx/motion';
import { Manipulative } from './index';
import { SLOW } from './timeline';

interface Props {
  steps: Step[];
  /** 1 = lesson pace. */
  speed?: number;
  /** Called once, when the last step is over. */
  onDone?: () => void;
  /** Shown above the steps. */
  title?: string;
  /** Skip to the end: the last step, its animation at its end state, quietly. */
  skip?: boolean;
}

/** A pause between steps (ms at normal motion). */
const BETWEEN = 450;

export function Explainer({ steps, speed = 1, onDone, title, skip = false }: Props) {
  const [playing, setAt] = useState(-1);
  const [ended, setDone] = useState(false);
  // Skipping shows the last step at once (in this very render, not after an effect).
  const at = skip ? steps.length - 1 : playing;
  const done = ended || skip;
  const animDone = useRef<(() => void) | null>(null);
  const started = useRef(0);
  const box = useRef<HTMLElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (skip) abort.current?.abort();
  }, [skip]);

  useEffect(() => {
    const stop = new AbortController();
    abort.current = stop;
    // While the hero explains, the music drops very low (the child listens).
    const release = holdMusic();
    stop.signal.addEventListener('abort', release);
    const pause = (ms: number) =>
      new Promise<void>((r) => {
        const t = window.setTimeout(r, ms * (reducedMotion() ? SLOW : 1));
        stop.signal.addEventListener('abort', () => (clearTimeout(t), r()));
      });
    (async () => {
      started.current = performance.now();
      for (let i = 0; i < steps.length; i++) {
        if (stop.signal.aborted) return;
        const step = steps[i];
        // The animation's end, set up before it mounts.
        const anim = step.action ? new Promise<void>((r) => (animDone.current = r)) : Promise.resolve();
        setAt(i);
        emit({ type: 'explain', step: i + 1 });
        await Promise.all([sayAndWait(step.text, stop.signal), Promise.race([anim, new Promise<void>((r) => stop.signal.addEventListener('abort', () => r()))])]);
        if (stop.signal.aborted) return;
        await pause(BETWEEN);
      }
      if (stop.signal.aborted) return;
      setDone(true);
      if (box.current) box.current.dataset.ms = String(Math.round(performance.now() - started.current));
      release();
      emit({ type: 'explained' });
      onDone?.();
    })();
    return () => stop.abort();
  }, []);

  // The animation on screen: this step's, or the last one before it.
  let shown = -1;
  for (let i = Math.max(0, at); i >= 0; i--) if (steps[i]?.action) {
    shown = i;
    break;
  }
  const step = at >= 0 ? steps[at] : null;
  return (
    <section class={`explainer card ${done ? 'is-done' : ''} ${step?.math ? 'has-math' : ''}`} ref={box} data-testid="explainer" data-step={at + 1} data-steps={steps.length} aria-label="הסבר">
      {title && <h2 class="explain-title">{title}</h2>}
      <div class="explain-stage">
        {shown >= 0 && at >= shown && (
          <Manipulative key={shown} action={steps[shown].action!} speed={speed} stopped={skip} onDone={() => shown === at && animDone.current?.()} />
        )}
      </div>
      <p class="explain-text" aria-live="polite">
        {step && (
          <span key={at} class="explain-line">
            {step.text} <SpeakButton text={step.text} class="speak-inline" />
          </span>
        )}
      </p>
      {step?.math && (
        <p class="explain-math math" dir="ltr" key={`m${at}`}>
          {step.math}
        </p>
      )}
      <ol class="explain-dots" aria-hidden="true">
        {steps.map((_, i) => (
          <li key={i} class={i < at || done ? 'is-past' : i === at ? 'is-now' : ''} />
        ))}
      </ol>
    </section>
  );
}
