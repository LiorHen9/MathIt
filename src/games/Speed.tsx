// Speed (מרוץ, phase 9): the times table against a gentle clock. The question and its bubbles are
// Pop's; above them a bar drains over a few seconds. Answering before it is empty earns a small
// "⚡" – nothing is ever lost: when the bar runs out it simply fades, "בלי לחץ", and the question
// waits. A parent can turn the game off (Pop then plays its stations). With reduced motion the
// bar does not move (an hourglass stands still) – the race is only in the words.
// The world dresses the clock (an hourglass, a stopwatch, a shot clock… templateSkins.speed).
import { useEffect, useRef, useState } from 'preact/hooks';
import { reducedMotion } from '../fx/motion';
import { useWorld } from '../worlds/index';
import { Pop } from './Pop';
import type { TemplateProps } from './PromptCard';
import '../ui/phase9.css';

/** How long the bar takes to drain (ms). */
export const SPEED_MS = 8000;

export function Speed(props: TemplateProps) {
  const look = useWorld().templateSkins?.speed?.look ?? 'speed-hourglass';
  const [out, setOut] = useState(false);
  const [quick, setQuick] = useState(false);
  const started = useRef(performance.now());
  const still = reducedMotion();
  useEffect(() => {
    const t = window.setTimeout(() => setOut(true), SPEED_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (props.done && !props.tried.length && performance.now() - started.current < SPEED_MS) setQuick(true);
  }, [props.done]);
  const stopped = out || props.done || props.reveal || props.explaining || props.tried.length > 0;
  return (
    <div class={`speed skin-${look}`} data-skin={look} data-out={out ? 'yes' : 'no'}>
      <div class="sp-clock" aria-hidden="true">
        <span class="sp-icon">{quick ? '⚡' : '⏱️'}</span>
        <span class="sp-track">
          <span class={`sp-bar ${still ? 'is-still' : ''} ${stopped ? 'is-stopped' : ''}`} style={`--sp-ms:${SPEED_MS}ms`} />
        </span>
      </div>
      <p class="sp-note" aria-live="polite" data-testid="speed-note">
        {quick ? '⚡ מהיר!' : out && !props.done ? 'בלי לחץ – חושבים בנחת' : ' '}
      </p>
      <Pop {...props} />
    </div>
  );
}
