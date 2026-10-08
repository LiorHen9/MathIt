// CompareTens (השוואה עד 100, phase 7): two numbers as tens rods and ones cubes, one row each.
// The rods are compared first (they pulse side by side); only when the tens are equal do the
// cubes decide. Then the sign appears between the numbers.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { Cube, Rod } from '../ui/art';
import { popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';

export function CompareTens({ a, b, ...run }: { a: number; b: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const sign = a > b ? '>' : a < b ? '<' : '=';
  const parts = [a, b].map((n) => ({ t: Math.floor(n / 10), o: n % 10 }));
  const byTens = parts[0].t !== parts[1].t;
  useRun(
    root,
    async (tl, el) => {
      const rows = q(el, '.ct-row');
      for (const row of rows) {
        await tl.anim(row, popIn(tl.calm, 6), 360);
        await tl.wait(160);
      }
      // Tens side by side: rod after rod, both rows together.
      const rodsOf = (r: HTMLElement) => q(r, '.blk-rod');
      const cubesOf = (r: HTMLElement) => q(r, '.blk-cube');
      const most = Math.max(parts[0].t, parts[1].t);
      for (let k = 0; k < most; k++) {
        emit({ type: 'leap', n: (k + 1) * 10 });
        rows.forEach((r) => tl.bg(rodsOf(r)[k], pulse(tl.calm, 1.15), 260));
        await tl.wait(300);
      }
      if (!byTens) {
        const more = Math.max(parts[0].o, parts[1].o);
        for (let k = 0; k < more; k++) {
          emit({ type: 'count', n: k + 1 });
          rows.forEach((r) => tl.bg(cubesOf(r)[k], pulse(tl.calm, 1.3), 220));
          await tl.wait(240);
        }
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  return (
    <Frame kind="compareTens" label={`משווים ${a} ו-${b}: ${byTens ? 'העשרות מחליטות' : 'העשרות שוות, האחדות מחליטות'}`} rootRef={root}>
      {parts.map((p, i) => (
        <span key={i} class="ct-row m-hide">
          <span class="ct-num">{[a, b][i]}</span>
          <span class="ct-blocks">
            {Array.from({ length: p.t }, (_, k) => (
              <Rod key={`r${k}`} />
            ))}
            {Array.from({ length: p.o }, (_, k) => (
              <Cube key={`c${k}`} />
            ))}
          </span>
        </span>
      ))}
      <Total>
        {a} {sign} {b}
      </Total>
    </Frame>
  );
}
