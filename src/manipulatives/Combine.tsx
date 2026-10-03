// Combine (חיבור): two groups side by side with a "+" between; they slide together into one
// group, then the bigger group is said at once and the other is counted on: 4… 5, 6.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Star, Total, q } from './parts';

export function Combine({ a, b, ...run }: { a: number; b: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const bigFirst = a >= b;
  const big = Math.max(a, b);
  useRun(
    root,
    async (tl, el) => {
      const [ga, gb] = q(el, '.m-group');
      const sign = el.querySelector('.m-sign');
      // The two groups appear.
      for (const g of [ga, gb]) {
        const items = q(g, '.m-item');
        await Promise.all(items.map((it, i) => tl.anim(it, popIn(tl.calm, 8), 320, { delay: i * 55 })));
        if (g === ga) await tl.anim(sign, FADE_IN, 220);
      }
      await tl.wait(450);
      // They come together: each group slides toward the middle until they touch.
      const ra = ga.getBoundingClientRect();
      const rb = gb.getBoundingClientRect();
      const gap = Math.max(0, rb.left - ra.right - 4);
      const half = gap / 2;
      await Promise.all([
        tl.anim(ga, [{ transform: 'translateX(0)' }, { transform: `translateX(${half}px)` }], 700, { easing: 'cubic-bezier(.5,0,.3,1)' }),
        tl.anim(gb, [{ transform: 'translateX(0)' }, { transform: `translateX(${-half}px)` }], 700, { easing: 'cubic-bezier(.5,0,.3,1)' }),
        tl.anim(sign, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.3)' }], 450)
      ]);
      await tl.anim(el.querySelector('.m-tray'), FADE_IN, 300);
      // The bigger group at once…
      const [first, second] = bigFirst ? [ga, gb] : [gb, ga];
      emit({ type: 'count', n: big });
      void tl.anim(first.querySelector('.m-gbadge'), popIn(tl.calm, 6), 360);
      await Promise.all(q(first, '.m-item').map((it) => tl.anim(it, pulse(tl.calm, 1.18), 420)));
      await tl.wait(250);
      // …then count on, one by one.
      const rest = q(second, '.m-item');
      for (let i = 0; i < rest.length; i++) {
        emit({ type: 'count', n: big + i + 1 });
        void tl.anim(rest[i].querySelector('.m-n'), FADE_IN, 240);
        await tl.anim(rest[i], pulse(tl.calm, 1.35), 420);
        await tl.wait(220);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const group = (n: number, g: 1 | 2, counted: boolean) => (
    <span class="m-group" style={`--cols:${Math.min(5, n)}`}>
      {counted ? (
        <span class="m-gbadge m-hide">{n}</span>
      ) : null}
      <span class="m-grid">
        {Array.from({ length: n }, (_, i) => (
          <Star key={i} group={g} cls="m-hide" label={counted ? undefined : big + i + 1} />
        ))}
      </span>
    </span>
  );
  return (
    <Frame kind="combine" label={`${a} ועוד ${b} זה ${a + b}`} rootRef={root}>
      <span class="m-row">
        <span class="m-tray m-hide" />
        {group(a, 1, bigFirst)}
        <span class="m-sign m-hide">+</span>
        {group(b, 2, !bigFirst)}
      </span>
      <Total>{a + b}</Total>
    </Frame>
  );
}
