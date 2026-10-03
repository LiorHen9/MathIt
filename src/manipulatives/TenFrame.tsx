// TenFrame (מסגרת עשר): a 2×5 frame fills with counters, top row first, each with its number.
// A full ten "clicks": the frame swells and a chord rings.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';

export function TenFrame({ n, ...run }: { n: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  useRun(
    root,
    async (tl, el) => {
      const dots = q(el, '.m-counter');
      for (let i = 0; i < dots.length; i++) {
        emit({ type: 'count', n: i + 1 });
        const drop: Keyframe[] = tl.calm
          ? [
              { opacity: 0, transform: 'scale(0.8)' },
              { opacity: 1, transform: 'scale(1)' }
            ]
          : [
              { opacity: 0, transform: 'translateY(-26px) scale(0.6)' },
              { opacity: 1, transform: 'translateY(3px) scale(1.08)', offset: 0.7 },
              { opacity: 1, transform: 'translateY(0) scale(1)' }
            ];
        await tl.anim(dots[i], drop, 360, { easing: 'cubic-bezier(.3,.7,.4,1)' });
        // A full row of five: a short breath (5 is a landmark).
        await tl.wait(i === 4 && n > 5 ? 380 : 140);
      }
      if (n === 10) {
        emit({ type: 'ten' });
        await tl.anim(el.querySelector('.m-frame'), pulse(tl.calm, 1.08), 520);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  return (
    <Frame kind="tenFrame" label={`מסגרת עשר עם ${n}`} rootRef={root}>
      <span class={`m-frame ${n === 10 ? 'is-full' : ''}`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span class="m-cell" key={i}>
            {i < n && <span class="m-counter m-hide">{i + 1}</span>}
          </span>
        ))}
      </span>
      <Total>{n}</Total>
    </Frame>
  );
}
