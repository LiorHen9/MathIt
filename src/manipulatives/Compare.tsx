// Compare (השוואה): two groups, scattered, line up one under the other; pairs are linked one by
// one (a note each), and the ones left without a partner swell and glow – that group is bigger.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, popIn, pulse, settleFrom, useRun, type RunProps } from './timeline';
import { Frame, Star, Total, q } from './parts';

/** A fixed "random" scatter, so it looks the same every time. */
function scatter(i: number, row: number): string {
  const dx = ((i * 37 + row * 53) % 23) - 11;
  const dy = (((i * 29 + row * 17) % 19) - 9) + (row === 0 ? -6 : 6);
  const r = ((i * 47 + row * 31) % 41) - 20;
  return `translate(${dx}px, ${dy}px) rotate(${r}deg)`;
}

export function Compare({ a, b, ...run }: { a: number; b: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const cols = Math.max(a, b, 1);
  const pairs = Math.min(a, b);
  const sign = a > b ? '>' : a < b ? '<' : '=';
  useRun(
    root,
    async (tl, el) => {
      const rows = q(el, '.m-crow').map((r) => q(r, '.m-item'));
      const links = q(el, '.m-link');
      // Both groups appear scattered…
      await Promise.all(rows.flat().map((it, i) => tl.anim(it, [{ opacity: 0 }, { opacity: 1 }], 260, { delay: i * 30 })));
      await Promise.all(q(el, '.m-cnum').map((n) => tl.anim(n, FADE_IN, 260)));
      await tl.wait(350);
      // …and line up, one under the other.
      await Promise.all(rows.flatMap((row, r) => row.map((it, i) => tl.anim(it, settleFrom(scatter(i, r)), 650, { easing: 'cubic-bezier(.4,0,.2,1)' }))));
      await tl.wait(250);
      // Pairs, one by one.
      for (let i = 0; i < pairs; i++) {
        emit({ type: 'count', n: i + 1 });
        void tl.anim(rows[0][i], pulse(tl.calm, 1.2), 360);
        void tl.anim(rows[1][i], pulse(tl.calm, 1.2), 360);
        await tl.anim(links[i], [{ opacity: 0, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], 300);
        await tl.wait(160);
      }
      // The ones without a partner stand out.
      const extra = a > b ? rows[0].slice(pairs) : rows[1].slice(pairs);
      if (extra.length) {
        await tl.wait(200);
        emit({ type: 'whoosh' });
        await Promise.all(
          extra.map((it, i) => {
            it.classList.add('is-hit');
            return tl.anim(it, pulse(tl.calm, 1.45), 560, { delay: i * 90 });
          })
        );
      } else emit({ type: 'ten' });
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const row = (n: number, r: 0 | 1) => (
    <span class="m-crow">
      <span class="m-cnum m-hide">{n}</span>
      <span class="m-grid" style={`--cols:${cols}`}>
        {Array.from({ length: n }, (_, i) => (
          <span class="m-scatter" key={i} style={`--from:${scatter(i, r)}`}>
            <Star group={r === 0 ? 1 : 2} cls={`m-hide m-move ${i >= pairs ? 'is-extra' : ''}`} />
          </span>
        ))}
      </span>
    </span>
  );
  return (
    <Frame kind="compare" label={a === b ? `${a} ו-${b}, לכולם יש זוג` : `${Math.max(a, b)} גדול מ-${Math.min(a, b)}`} rootRef={root}>
      {row(a, 0)}
      <span class="m-crow m-links">
        <span class="m-cnum" />
        <span class="m-grid" style={`--cols:${cols}`}>
          {Array.from({ length: pairs }, (_, i) => (
            <span class="m-link m-hide" key={i} />
          ))}
        </span>
      </span>
      {row(b, 1)}
      <Total>
        {a} {sign} {b}
      </Total>
    </Frame>
  );
}
