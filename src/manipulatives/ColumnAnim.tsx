// ColumnAnim (מאונך, phase 9): adding or taking away in columns. The digits drop into their
// columns – ones under ones – and the line is drawn; then column by column from the ones: the
// column lights up, its result digit appears, and when a column makes ten or more, the carried
// ten flies up to the top of the next column (a little whistle). Taking away, when a column has
// too little, a ten is broken from the next column: "−1" there, "+10" flies over here.
import { useMemo, useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';
import '../ui/phase9.css';

interface Step {
  digit: number;
  /** Adding: a ten goes on to the next column. Taking away: this column breaks a ten from the next. */
  regroup: boolean;
}

export function columnSteps(a: number, b: number, op: '+' | '-'): { cols: number; steps: Step[]; result: number } {
  const result = op === '+' ? a + b : a - b;
  const cols = Math.max(String(a).length, String(b).length, String(result).length);
  const dig = (n: number, i: number) => Math.floor(n / 10 ** i) % 10;
  const steps: Step[] = [];
  let c = 0;
  for (let i = 0; i < cols; i++) {
    if (op === '+') {
      const s = dig(a, i) + dig(b, i) + c;
      c = s >= 10 ? 1 : 0;
      steps.push({ digit: s % 10, regroup: c === 1 && i < cols - 1 });
    } else {
      let top = dig(a, i) - c;
      c = top < dig(b, i) ? 1 : 0;
      if (c) top += 10;
      steps.push({ digit: top - dig(b, i), regroup: c === 1 });
    }
  }
  return { cols, steps, result };
}

/** Keyframes: from (dx, dy) away back to its place, over an arc `lift` px high (and fading in). */
function flyFrom(dx: number, dy: number, lift: number): Keyframe[] {
  return Array.from({ length: 11 }, (_, k) => {
    const t = k / 10;
    return { offset: t, opacity: Math.min(1, 0.3 + t * 2), transform: `translate(${(dx * (1 - t)).toFixed(1)}px, ${(dy * (1 - t) - lift * 4 * t * (1 - t)).toFixed(1)}px)` };
  });
}

export function ColumnAnim({ a, b, op, ...run }: { a: number; b: number; op: '+' | '-' } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const plan = useMemo(() => columnSteps(a, b, op), [a, b, op]);
  const { cols, steps, result } = plan;
  const sym = op === '+' ? '+' : '−';
  const digits = (n: number) => {
    const s = String(n);
    return Array.from({ length: cols }, (_, k) => {
      const i = cols - 1 - k;
      return i < s.length ? s[s.length - 1 - i] : '';
    });
  };
  const resLen = String(result).length;
  useRun(
    root,
    async (tl, el) => {
      const cell = (row: string, i: number) => el.querySelector<HTMLElement>(`.co-${row}[data-i="${i}"]`);
      // The numbers drop into their columns, ones first.
      for (const row of ['a', 'b']) {
        for (let i = 0; i < cols; i++) {
          const c = cell(row, i);
          if (c?.textContent) tl.bg(c, tl.calm ? FADE_IN : [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'translateY(0)' }], 260, { delay: i * 60 });
        }
        await tl.wait(260 + cols * 60);
      }
      tl.bg(el.querySelector('.co-op'), FADE_IN, 200);
      await tl.anim(el.querySelector('.co-line'), [{ opacity: 1, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)' }], 320);
      for (let i = 0; i < cols; i++) {
        const st = steps[i];
        const col = q(el, `[data-i="${i}"].co-a, [data-i="${i}"].co-b`).filter((x) => x.textContent);
        for (const x of col) tl.bg(x, pulse(tl.calm, 1.25), 360);
        await tl.wait(380);
        if (op === '-' && st.regroup) {
          // Break a ten from the next column.
          const minus = cell('mark', i + 1);
          const plus = cell('carry', i);
          tl.bg(minus, FADE_IN, 240);
          await tl.wait(200);
          emit({ type: 'carry' });
          if (plus && minus) {
            const r0 = minus.getBoundingClientRect();
            const r1 = plus.getBoundingClientRect();
            await tl.anim(plus, tl.calm ? FADE_IN : flyFrom(r0.left - r1.left, r0.top - r1.top, 16), 520);
          }
          await tl.wait(160);
        }
        if (i < resLen) {
          emit({ type: 'count', n: i + 1 });
          await tl.anim(cell('r', i), popIn(tl.calm, 6), 300);
        }
        if (op === '+' && st.regroup) {
          // The ten flies up to the top of the next column.
          const from = cell('r', i);
          const to = cell('carry', i + 1);
          if (from && to) {
            const r0 = from.getBoundingClientRect();
            const r1 = to.getBoundingClientRect();
            emit({ type: 'carry' });
            await tl.anim(to, tl.calm ? FADE_IN : flyFrom(r0.left - r1.left, r0.top - r1.top, 26), 560, { easing: 'cubic-bezier(.4,0,.4,1)' });
          }
        }
        await tl.wait(220);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const A = digits(a);
  const B = digits(b);
  const R = digits(result);
  // Columns left to right on screen; data-i counts from the ones (0) leftwards.
  const idx = (k: number) => cols - 1 - k;
  return (
    <Frame kind="column" label={`${a} ${sym} ${b} במאונך: ${result}`} rootRef={root}>
      <span class="co-grid" style={`--co-cols:${cols + 1}`}>
        <span class="co-cell" />
        {A.map((_, k) => (
          <span key={`c${k}`} class="co-cell co-top">
            <span class={`co-carry m-hide ${op === '-' ? 'is-borrow' : ''}`} data-i={idx(k)}>
              {(op === '+' ? idx(k) > 0 && steps[idx(k) - 1]?.regroup : steps[idx(k)]?.regroup) ? (op === '+' ? '1' : '+10') : ''}
            </span>
            <span class="co-mark m-hide" data-i={idx(k)}>
              {op === '-' && idx(k) > 0 && steps[idx(k) - 1]?.regroup ? '−1' : ''}
            </span>
          </span>
        ))}
        <span class="co-cell" />
        {A.map((x, k) => (
          <span key={`a${k}`} class="co-cell co-a m-hide" data-i={idx(k)}>
            {x}
          </span>
        ))}
        <span class="co-cell co-op m-hide">{sym}</span>
        {B.map((x, k) => (
          <span key={`b${k}`} class="co-cell co-b m-hide" data-i={idx(k)}>
            {x}
          </span>
        ))}
        <span class="co-line m-hide" />
        <span class="co-cell" />
        {R.map((x, k) => (
          <span key={`r${k}`} class="co-cell co-r m-hide" data-i={idx(k)}>
            {x}
          </span>
        ))}
      </span>
      <Total>{`${a} ${sym} ${b} = ${result}`}</Total>
    </Frame>
  );
}
