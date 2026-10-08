// ClockAnim (שעון, phase 7): both hands start at 12. The short hand turns to the hour, one hour at
// a time; then the long hand goes round five minutes at a time – a tick for every five, climbing –
// while the short hand creeps on (half past: halfway to the next hour). The time is written at
// the end. The hands turn by CSS transform only.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { ClockFace, handAngles } from '../ui/art';
import { timeWords } from '../core/generators/clock';
import { popIn, useRun, type RunProps } from './timeline';
import { Frame, Total } from './parts';

export function ClockAnim({ h, m, ...run }: { h: number; m: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const hour = useRef<SVGGElement>(null);
  const minute = useRef<SVGGElement>(null);
  const end = handAngles(h, m);
  useRun(
    root,
    async (tl, el) => {
      const H = hour.current!;
      const M = minute.current!;
      const rot = (d: number) => ({ transform: `rotate(${d}deg)` });
      H.style.transform = 'rotate(0deg)';
      M.style.transform = 'rotate(0deg)';
      await tl.wait(300);
      // The short hand: hour by hour.
      for (let k = 1; k <= h % 12; k++) {
        emit({ type: 'tick', n: k });
        await tl.anim(H, [rot((k - 1) * 30), rot(k * 30)], 200, { easing: 'cubic-bezier(.4,0,.3,1.3)' });
        await tl.wait(60);
      }
      await tl.wait(260);
      // The long hand: five minutes at a time; the short hand moves with it.
      const fives = m / 5;
      const hourAt = (h % 12) * 30;
      for (let k = 1; k <= fives; k++) {
        emit({ type: 'tick', n: k });
        tl.bg(H, [rot(hourAt + ((k - 1) * 5 * 30) / 60), rot(hourAt + (k * 5 * 30) / 60)], 230);
        await tl.anim(M, [rot((k - 1) * 30), rot(k * 30)], 230, { easing: 'cubic-bezier(.4,0,.3,1.3)' });
        await tl.wait(80);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const shown = `${h}:${String(m).padStart(2, '0')}`;
  return (
    <Frame kind="clock" label={`שעון: ${timeWords({ h, m })}`} rootRef={root}>
      <span class="ca-clock" style={`--hour:${end.hour}deg;--minute:${end.minute}deg`}>
        <ClockFace h={h} m={m} hourRef={hour} minuteRef={minute} />
      </span>
      <Total>{shown}</Total>
    </Frame>
  );
}
