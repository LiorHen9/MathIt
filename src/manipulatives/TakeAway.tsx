// TakeAway (חיסור): the items appear, the ones taken away fly off the screen in an arc (each with
// a whoosh), leaving a faint ghost where they were; what is left is counted.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, arcFrames, popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Star, Total, q } from './parts';

export function TakeAway({ a, b, ...run }: { a: number; b: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const left = a - b;
  useRun(
    root,
    async (tl, el) => {
      const items = q(el, '.m-item');
      await Promise.all(items.map((it, i) => tl.anim(it, popIn(tl.calm, 8), 320, { delay: i * 55 })));
      await tl.wait(500);
      // The last b fly away, one after another, up and off to the right.
      const going = items.slice(left);
      const box = el.getBoundingClientRect();
      for (let i = going.length - 1; i >= 0; i--) {
        const it = going[i];
        const r = it.getBoundingClientRect();
        const dx = box.right - r.left + 30;
        const dy = -(r.top - box.top) - 50;
        emit({ type: 'whoosh' });
        void tl.anim(it.parentElement?.querySelector(`.m-ghost[data-i="${left + i}"]`), [{ opacity: 0 }, { opacity: 1 }], 400);
        await tl.anim(
          it,
          tl.calm
            ? [
                { opacity: 1, transform: 'translate(0, 0)' },
                { opacity: 0, transform: 'translate(24px, -28px)' }
              ]
            : arcFrames(dx, dy, 60, (t) => `rotate(${Math.round(t * 200)}deg) scale(${(1 - t * 0.5).toFixed(2)})`, (t) => (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3)),
          tl.calm ? 600 : 640,
          { easing: 'cubic-bezier(.4,0,.7,1)' }
        );
        await tl.wait(120);
      }
      await tl.wait(380);
      // Count what is left.
      const stay = items.slice(0, left);
      for (let i = 0; i < stay.length; i++) {
        emit({ type: 'count', n: i + 1 });
        void tl.anim(stay[i].querySelector('.m-n'), FADE_IN, 240);
        await tl.anim(stay[i], pulse(tl.calm, 1.3), 400);
        await tl.wait(200);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  return (
    <Frame kind="takeAway" label={`היו ${a}, ${b} הלכו ונשארו ${left}`} rootRef={root}>
      <span class="m-grid" style={`--cols:${Math.min(5, a)}`}>
        {Array.from({ length: a }, (_, i) => (
          <span class="m-slot" key={i}>
            {i >= left && <span class="m-ghost m-hide" data-i={i} />}
            <Star cls={`m-hide ${i >= left ? 'm-go' : ''}`} label={i < left ? i + 1 : undefined} />
          </span>
        ))}
      </span>
      <Total>{left}</Total>
    </Frame>
  );
}
