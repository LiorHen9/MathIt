// Clock (שעון, docs/ARCHITECTURE.md §4.3): set the time. A big clock starting at 12:00; the hands
// are dragged with one finger (the long one snaps to five minutes and carries the short one round;
// the short one snaps to the hour) – or moved with the buttons under it (hour ‹ ›, minutes ‹ ›),
// every target ≥ 48px. Each five minutes the hand ticks (the "tick" teaching sound). "בדוק ✓"
// reports the time set. The world dresses the face (World.templateSkins.clock).
import { useRef, useState } from 'preact/hooks';
import { answerKey, type Time } from '../core/types';
import { emit } from '../fx/director';
import { ClockFace } from '../ui/art';
import { timeWords } from '../core/generators/clock';
import { useWorld } from '../worlds/index';
import { PromptCard, type TemplateProps } from './PromptCard';

const wrap12 = (h: number) => ((((h - 1) % 12) + 12) % 12) + 1;

/** The time after turning the minute hand to `m` (0–55) from `t`: crossing 12 moves the hour. */
export function turnMinutes(t: Time, m: number): Time {
  let h = t.h;
  if (t.m >= 45 && m <= 10) h = wrap12(h + 1);
  else if (t.m <= 10 && m >= 45) h = wrap12(h - 1);
  return { h, m };
}

export function ClockSet({ question: q, done, tried, reveal, hint, earlyHint, explaining, onAnswer }: TemplateProps) {
  const look = useWorld().templateSkins?.clock?.look ?? 'flower';
  const [t, setT] = useState<Time>({ h: 12, m: 0 });
  const face = useRef<HTMLDivElement>(null);
  const drag = useRef<'hour' | 'minute' | null>(null);
  const off = done || reveal;
  const shown = reveal ? (q.answer as Time) : t;
  const triedThis = tried.some((x) => answerKey(x) === answerKey(t));

  function set(next: Time) {
    if (off || answerKey(next) === answerKey(t)) return;
    if (next.m !== t.m || next.h !== t.h) emit({ type: 'tick', n: next.m === 0 ? 12 : next.m / 5 });
    setT(next);
  }

  /** The angle (0–360 from 12, clockwise) of a pointer over the face. */
  function angleOf(e: PointerEvent): number {
    const r = face.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  }

  function down(e: PointerEvent) {
    if (off) return;
    const a = angleOf(e);
    const hourA = ((t.h % 12) + t.m / 60) * 30;
    const minA = t.m * 6;
    const d = (x: number) => Math.min(Math.abs(a - x), 360 - Math.abs(a - x));
    drag.current = d(minA) <= d(hourA) ? 'minute' : 'hour';
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    move(e);
  }

  function move(e: PointerEvent) {
    if (!drag.current) return;
    const a = angleOf(e);
    if (drag.current === 'minute') set(turnMinutes(t, (Math.round(a / 30) % 12) * 5));
    else set({ h: wrap12(Math.round(a / 30) || 12), m: t.m });
  }

  const btn = (label: string, test: string, next: Time, text: string) => (
    <button type="button" class="btn btn-secondary cs-btn" data-testid={test} aria-label={label} disabled={off} onClick={() => set(next)}>
      {text}
    </button>
  );

  return (
    <div class="clockset">
      <PromptCard question={q} done={done} reveal={reveal} hint={hint} earlyHint={earlyHint} explaining={explaining} noPicture />
      {!explaining && (
        <>
          <div
            class={`cs-face skin-${look}`}
            data-skin={look}
            ref={face}
            data-testid="clock-face"
            data-time={answerKey(shown)}
            role="img"
            aria-label={`השעון מראה ${timeWords(shown)}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <ClockFace h={shown.h} m={shown.m} cls="is-big" />
          </div>
          <div class="cs-controls" dir="ltr">
            <span class="cs-group">
              {btn('שעה אחת אחורה', 'hour-down', { h: wrap12(t.h - 1), m: t.m }, '‹')}
              <span class="cs-label">שעה</span>
              {btn('שעה אחת קדימה', 'hour-up', { h: wrap12(t.h + 1), m: t.m }, '›')}
            </span>
            <span class="cs-group">
              {btn('5 דקות אחורה', 'min-down', turnMinutes(t, (t.m + 55) % 60), '‹')}
              <span class="cs-label">דקות</span>
              {btn('5 דקות קדימה', 'min-up', turnMinutes(t, (t.m + 5) % 60), '›')}
            </span>
          </div>
          <button type="button" class="btn btn-primary bd-check" data-testid="clock-check" disabled={off || triedThis} onClick={() => onAnswer(t, face.current!)}>
            בדוק ✓
          </button>
        </>
      )}
    </div>
  );
}
