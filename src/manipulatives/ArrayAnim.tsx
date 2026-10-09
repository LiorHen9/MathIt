// ArrayAnim (מערך, phase 9): multiplying as rows of the same size. The rows appear one by one,
// each one counted on (4, 8, 12 – the note climbs a step a row), so 3 × 4 is "4 + 4 + 4". With
// `turn` the whole array then turns a quarter round – now 4 rows of 3 – and the same total chimes:
// 3 × 4 = 4 × 3. With `unit` 10 every dot is a ten (30 × 4 = 12 tens).
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, popIn, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';
import '../ui/phase9.css';

export function ArrayAnim({ rows, cols, turn, unit, ...run }: { rows: number; cols: number; turn?: boolean; unit?: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const u = unit ?? 1;
  const total = rows * cols * u;
  const side = Math.max(rows, cols);
  // Dots small enough that a turned array still fits.
  const d = Math.max(10, Math.min(24, Math.floor(200 / side) - 4));
  useRun(
    root,
    async (tl, el) => {
      const rowEls = q(el, '.ar-row');
      for (let r = 0; r < rowEls.length; r++) {
        emit({ type: 'count', n: r + 1 });
        const dots = q(rowEls[r], '.ar-dot');
        dots.forEach((dot, i) => tl.bg(dot, popIn(tl.calm, 6), 260, { delay: i * 35 }));
        await tl.wait(260 + dots.length * 35);
        tl.bg(rowEls[r].querySelector('.ar-sum'), FADE_IN, 220);
        await tl.wait(260);
      }
      if (turn) {
        await tl.wait(400);
        // The running sums go, the array turns, the other way of reading it appears.
        for (const s of q(el, '.ar-sum')) tl.bg(s, [{ opacity: 1 }, { opacity: 0 }], 200);
        await tl.anim(el.querySelector('.ar-turn'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }], 900, { easing: 'cubic-bezier(.5,0,.3,1)' });
        emit({ type: 'ten' });
        tl.bg(el.querySelector('.ar-swap'), popIn(tl.calm, 6), 320);
        await tl.wait(500);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const label = turn ? `${rows} שורות של ${cols} ואז מסובבים: ${cols} שורות של ${rows}, ${total}` : `${rows} שורות של ${cols}${u > 1 ? ' עשרות' : ''}: ${total}`;
  return (
    <Frame kind="array" label={label} rootRef={root}>
      <span class="ar-box" style={`--ar-d:${d}px; --ar-side:${side * (d + 4) + 34}px`}>
        <span class="ar-turn">
          <span class="ar-grid">
            {Array.from({ length: rows }, (_, r) => (
              <span class="ar-row" key={r}>
                {Array.from({ length: cols }, (_, c) => (
                  <span class={`ar-dot m-hide ${u > 1 ? 'is-ten' : ''}`} key={c}>
                    {u > 1 && <span class="ar-ten">10</span>}
                  </span>
                ))}
                <span class="ar-sum m-hide">{(r + 1) * cols * u}</span>
              </span>
            ))}
          </span>
        </span>
      </span>
      {turn && (
        <span class="ar-swap m-hide" dir="ltr">
          {rows} × {cols} = {cols} × {rows}
        </span>
      )}
      <Total>
        {u > 1 ? `${cols * 10} × ${rows} = ${total}` : `${rows} × ${cols} = ${total}`}
      </Total>
    </Frame>
  );
}
