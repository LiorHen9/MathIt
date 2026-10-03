// Counters (מנייה): the items appear one by one with a little hop, each with its number and a
// note one step higher than the last; the last number is how many there are.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Star, Total, q } from './parts';

export function Counters({ n, ...run }: { n: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  useRun(
    root,
    async (tl, el) => {
      const items = q(el, '.m-item');
      for (let i = 0; i < items.length; i++) {
        emit({ type: 'count', n: i + 1 });
        void tl.anim(items[i].querySelector('.m-n'), FADE_IN, 260);
        await tl.anim(items[i], popIn(tl.calm), 380, { easing: 'cubic-bezier(.3,.7,.4,1)' });
        await tl.wait(170);
      }
      await tl.anim(el.querySelector('.m-total'), [...popIn(tl.calm, 6)], 380);
      void tl.anim(items.at(-1), pulse(tl.calm), 400);
      await tl.wait(500);
    },
    run
  );
  return (
    <Frame kind="count" label={n === 1 ? 'כוכב אחד' : `סופרים ${n} כוכבים`} rootRef={root}>
      <span class="m-grid" style={`--cols:${Math.min(5, n)}`}>
        {Array.from({ length: n }, (_, i) => (
          <Star key={i} label={i + 1} cls="m-hide" />
        ))}
      </span>
      <Total>{n}</Total>
    </Frame>
  );
}
