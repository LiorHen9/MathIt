// GridAnim (רשת שטח, phase 9): a rectangle on squared paper – or an L, a rectangle with a corner
// cut off. The area: the squares fill row by row, each row counted on (5, 10, 15 – the note
// climbing a step a row). The perimeter: the line around the shape stretches side by side, each
// side's length appearing on it, the note climbing with the running total.
import { useRef } from 'preact/hooks';
import { gridMeasures } from '../core/types';
import { emit } from '../fx/director';
import { FADE_IN, popIn, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';
import { GridShape } from '../ui/Grid';
import '../ui/phase9.css';

export function GridAnim({ w, h, cut, ask, ...run }: { w: number; h: number; cut?: { w: number; h: number }; ask: 'area' | 'perimeter' } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const cell = Math.max(14, Math.min(28, Math.floor(250 / w), Math.floor(170 / h)));
  const m = gridMeasures(w, h, cut);
  useRun(
    root,
    async (tl, el) => {
      if (ask === 'area') {
        let sum = 0;
        for (let y = 0; y < h; y++) {
          const row = q(el, `.gr-sq[data-row="${y}"]`);
          sum += row.length;
          emit({ type: 'count', n: y + 1 });
          row.forEach((sq, i) => tl.bg(sq, popIn(tl.calm, 3), 220, { delay: i * 30 }));
          const lbl = el.querySelector<HTMLElement>(`.gr-sum[data-row="${y}"]`);
          if (lbl) lbl.textContent = String(sum);
          tl.bg(lbl, FADE_IN, 200, { delay: row.length * 30 });
          await tl.wait(260 + row.length * 30);
        }
      } else {
        let sum = 0;
        for (const side of q(el, '.gr-side')) {
          const len = Number(side.dataset.len);
          sum += len;
          emit({ type: 'jump', n: sum });
          const horiz = side.classList.contains('is-h');
          await tl.anim(side, [{ opacity: 1, transform: horiz ? 'scaleX(0)' : 'scaleY(0)' }, { opacity: 1, transform: 'none' }], 140 + len * 70, { easing: 'linear' });
          tl.bg(side.querySelector('.gr-len'), popIn(tl.calm, 4), 240);
          await tl.wait(160);
        }
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const value = ask === 'area' ? m.area : m.perimeter;
  return (
    <Frame kind="grid" label={ask === 'area' ? `שטח: ${value} משבצות` : `היקף: ${value}`} rootRef={root}>
      <span class="gr-wrap">
        <GridShape w={w} h={h} cut={cut} cell={cell} hideFill={ask === 'area'} hideLine={ask === 'perimeter'} />
        {ask === 'area' && (
          <span class="gr-sums" style={`--gr-c:${cell}px`}>
            {Array.from({ length: h }, (_, y) => (
              <span key={y} class="gr-sum m-hide" data-row={y} />
            ))}
          </span>
        )}
      </span>
      <Total>{ask === 'area' ? `שטח ${value}` : `היקף ${value}`}</Total>
    </Frame>
  );
}
