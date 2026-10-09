// DecimalAnim (עשרוניים, phase 9): a square of 100 is one whole. It fills column by column – a
// full column is a tenth (a deep note that climbs, like tens) – and then square by square, the
// hundredths (counted). `b` more fill on in another colour, spilling into a second square past one
// whole; `vs` fills a second square beside it, and the sign goes between them.
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { popIn, useRun, type RunProps, type Timeline } from './timeline';
import { Frame, Total, q } from './parts';
import '../ui/phase9.css';

const text = (h: number) => String(Math.round(h) / 100);

/** A square of 100, column by column; `fill[i]` = the colour of hundredth i (0 = empty). */
function Square({ fill, which }: { fill: number[]; which: number }) {
  return (
    <span class="dc-square" data-sq={which}>
      {Array.from({ length: 100 }, (_, i) => {
        // Column-major: hundredth i is in column floor(i / 10), row i % 10.
        const col = Math.floor(i / 10);
        const row = i % 10;
        return <span key={i} class={`dc-cell ${fill[i] ? `is-${fill[i]} m-hide` : ''}`} data-i={i} style={`grid-column:${col + 1}; grid-row:${row + 1}`} />;
      })}
    </span>
  );
}

async function fillSquare(tl: Timeline, sq: Element, kind: number, from: number, to: number, start: { tenths: number; hundredths: number }) {
  let i = from;
  while (i < to) {
    if (i % 10 === 0 && i + 10 <= to) {
      // A whole column: a tenth.
      start.tenths++;
      emit({ type: 'leap', n: start.tenths * 10 });
      for (let k = 0; k < 10; k++) tl.bg(sq.querySelector(`.dc-cell[data-i="${i + k}"].is-${kind}`), popIn(tl.calm, 2), 200, { delay: k * 18 });
      await tl.wait(320);
      i += 10;
    } else {
      emit({ type: 'count', n: ++start.hundredths });
      await tl.anim(sq.querySelector(`.dc-cell[data-i="${i}"].is-${kind}`), popIn(tl.calm, 2), 160);
      i++;
    }
  }
}

export function DecimalAnim({ a, b, vs, ...run }: { a: number; b?: number; vs?: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const sum = a + (b ?? 0);
  const two = vs !== undefined || sum > 100;
  const first = Array.from({ length: 100 }, (_, i) => (i < a ? 1 : i < sum ? 2 : 0));
  const second = vs !== undefined ? Array.from({ length: 100 }, (_, i) => (i < vs ? 3 : 0)) : Array.from({ length: 100 }, (_, i) => (i + 100 < sum ? 2 : 0));
  const sign = vs === undefined ? '' : a > vs ? '>' : a < vs ? '<' : '=';
  useRun(
    root,
    async (tl, el) => {
      const sqs = q(el, '.dc-square');
      const counts = { tenths: 0, hundredths: 0 };
      await fillSquare(tl, sqs[0], 1, 0, Math.min(a, 100), counts);
      if (b) {
        await tl.wait(300);
        await fillSquare(tl, sqs[0], 2, a, Math.min(sum, 100), counts);
        if (sum > 100) {
          // Ten tenths are one whole: on into the next square.
          emit({ type: 'ten' });
          await tl.wait(300);
          await fillSquare(tl, sqs[1], 2, 0, sum - 100, counts);
        }
      }
      if (vs !== undefined) {
        await tl.wait(300);
        await fillSquare(tl, sqs[1], 3, 0, vs, { tenths: 0, hundredths: 0 });
        emit({ type: 'ten' });
        await tl.anim(el.querySelector('.dc-sign'), popIn(tl.calm, 6), 340);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const total = vs !== undefined ? `${text(a)} ${sign} ${text(vs)}` : b ? `${text(a)} + ${text(b)} = ${text(sum)}` : text(a);
  return (
    <Frame kind="decimal" label={`ריבוע של מאה: ${total}`} rootRef={root}>
      <span class={`dc-row ${two ? 'is-two' : ''}`}>
        <Square fill={first} which={0} />
        {vs !== undefined && <span class="dc-sign m-hide">{sign}</span>}
        {two && <Square fill={second} which={1} />}
      </span>
      <Total>{total}</Total>
    </Frame>
  );
}
