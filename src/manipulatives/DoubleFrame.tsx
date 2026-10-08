// DoubleFrame (מסגרת עשר כפולה, phase 7): two ten frames side by side, for crossing ten.
// Adding (b > 0): `a` counters fill the first frame; the next ones complete it to ten – the frame
// "clicks" with the chord – and what is left goes on into the second frame (8 + 5 = 8 + 2 + 3).
// Taking away (b < 0): `a` counters fill the frames; the second frame empties first, the chord
// marks the ten reached, then the first frame gives the rest (13 − 5 = 13 − 3 − 2).
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';

export function DoubleFrame({ a, b, ...run }: { a: number; b: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const adding = b > 0;
  const total = a + b;
  // Counters in slot order (0–9 the first frame, 10–19 the second); which group, and gone or not.
  const filled = adding ? total : a;
  const gone = (i: number) => !adding && i >= total;
  const group = (i: number) => (adding && i >= a ? 2 : 1);
  useRun(
    root,
    async (tl, el) => {
      const dots = q(el, '.m-counter');
      const frames = q(el, '.df-frame');
      const drop: Keyframe[] = tl.calm
        ? [
            { opacity: 0, transform: 'scale(0.8)' },
            { opacity: 1, transform: 'scale(1)' }
          ]
        : [
            { opacity: 0, transform: 'translateY(-22px) scale(0.6)' },
            { opacity: 1, transform: 'translateY(2px) scale(1.08)', offset: 0.7 },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
          ];
      const first = adding ? a : a;
      for (let i = 0; i < first; i++) {
        emit({ type: 'count', n: i + 1 });
        await tl.anim(dots[i], drop, adding ? 300 : 200, { easing: 'cubic-bezier(.3,.7,.4,1)' });
        await tl.wait(adding ? 90 : 40);
        if (!adding && i === 9) {
          emit({ type: 'ten' });
          await tl.anim(frames[0], pulse(tl.calm, 1.06), 380);
        }
      }
      await tl.wait(380);
      if (adding) {
        for (let i = a; i < total; i++) {
          emit({ type: 'count', n: i + 1 });
          await tl.anim(dots[i], drop, 340, { easing: 'cubic-bezier(.3,.7,.4,1)' });
          await tl.wait(110);
          if (i === 9) {
            // Ten: the first frame is full.
            emit({ type: 'ten' });
            await tl.anim(frames[0], pulse(tl.calm, 1.08), 480);
            await tl.wait(260);
          }
        }
      } else {
        for (let i = a - 1; i >= total; i--) {
          emit({ type: 'whoosh' });
          await tl.anim(dots[i], tl.calm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translate(0,0)' }, { opacity: 0, transform: 'translate(14px,-48px) scale(0.6)' }], 320, { easing: 'ease-in' });
          await tl.wait(80);
          if (i === 10) {
            // Down to exactly ten: the full frame rings.
            emit({ type: 'ten' });
            await tl.anim(frames[0], pulse(tl.calm, 1.08), 480);
            await tl.wait(260);
          }
        }
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const label = adding ? `מסגרת עשר כפולה: ${a} ועוד ${b}, משלימים ל-10, יוצא ${total}` : `מסגרת עשר כפולה: ${a} פחות ${-b}, דרך ה-10, נשארו ${total}`;
  return (
    <Frame kind="doubleFrame" label={label} rootRef={root}>
      <span class="df-frames">
        {[0, 1].map((f) => (
          <span key={f} class={`df-frame m-frame ${f === 0 && (adding ? total >= 10 : a >= 10) ? 'is-full' : ''}`}>
            {Array.from({ length: 10 }, (_, k) => {
              const i = f * 10 + k;
              return (
                <span class="m-cell" key={k}>
                  {i < filled && <span class={`m-counter g-${group(i)} m-hide ${gone(i) ? 'm-go' : ''}`}>{i + 1}</span>}
                </span>
              );
            })}
          </span>
        ))}
      </span>
      <Total>
        {a} {adding ? '+' : '−'} {Math.abs(b)} = {total}
      </Total>
    </Frame>
  );
}
