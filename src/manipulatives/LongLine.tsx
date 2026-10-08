// LongLine (ציר המספרים עד 20 / 100, phase 7): the part of the line the hops need (0–20 whole; to
// 100 a window of whole tens around them), rising left to right. The marker hops in arcs – a hop
// of ten is a big arc with its own deeper note ("leap"), smaller hops the note of the number landed
// on ("jump") – and every landing is written above the line, so the way stays readable
// (38 → 48 → 58 → 60 → 63).
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, arcFrames, popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';

/** The window of the line: whole tens around every number visited. */
export function lineWindow(from: number, hops: number[], max: 20 | 100): { lo: number; hi: number } {
  const pos = hops.reduce((xs, h) => [...xs, xs.at(-1)! + h], [from]);
  if (max === 20) return { lo: 0, hi: 20 };
  let lo = Math.floor(Math.min(...pos) / 10) * 10;
  let hi = Math.ceil(Math.max(...pos) / 10) * 10;
  if (hi - lo < 20) hi = Math.min(100, lo + 20);
  if (hi - lo < 20) lo = Math.max(0, hi - 20);
  return { lo, hi };
}

export function LongLine({ from, hops, max, ...run }: { from: number; hops: number[]; max: 20 | 100 } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const { lo, hi } = lineWindow(from, hops, max);
  const span = hi - lo;
  const at = (n: number) => (n - lo) / span;
  const stops = hops.reduce((xs, h) => [...xs, xs.at(-1)! + h], [from]);
  const to = stops.at(-1)!;
  // Ticks: every number on short lines; every one on up to 40, else every five.
  const every = span <= 40 ? 1 : 5;
  const label = (n: number) => (span <= 20 ? n % 5 === 0 : n % 10 === 0);
  const ticks: number[] = [];
  for (let n = lo; n <= hi; n += every) ticks.push(n);
  useRun(
    root,
    async (tl, el) => {
      const line = el.querySelector('.m-line')!;
      const w = line.getBoundingClientRect().width;
      const x = (n: number) => at(n) * w;
      const marker = el.querySelector<HTMLElement>('.m-marker')!;
      const marks = q(el, '.ll-stop');
      const arcs = q<SVGPathElement>(el, '.m-arc');
      await tl.anim(marker, [{ opacity: 0, transform: `translateX(${x(from)}px) scale(0.3)` }, { opacity: 1, transform: `translateX(${x(from)}px) scale(1)` }], 380);
      await tl.anim(marks[0], popIn(tl.calm, 4), 320);
      await tl.wait(320);
      for (let k = 0; k < hops.length; k++) {
        const a = stops[k];
        const b = stops[k + 1];
        const big = Math.abs(hops[k]) >= 10;
        tl.bg(arcs[k], FADE_IN, 420);
        await tl.anim(marker, arcFrames(x(b) - x(a), 0, tl.calm ? 10 : big ? 34 : 22).map((f) => ({ ...f, transform: `translateX(${x(a)}px) ${f.transform}` })), big ? 600 : 480, { easing: 'linear' });
        emit(big ? { type: 'leap', n: b } : { type: 'jump', n: b });
        await tl.anim(marks[k + 1], popIn(tl.calm, 4), 300);
        await tl.wait(150);
      }
      tl.bg(marks.at(-1), pulse(tl.calm, 1.3), 400);
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const sum = hops.reduce((s, h) => s + h, 0);
  return (
    <Frame kind="longLine" label={`על ציר המספרים מ-${from} ${sum > 0 ? 'קדימה' : 'אחורה'} ${Math.abs(sum)}, עד ${to}`} rootRef={root}>
      <span class="m-line-wrap ll-wrap">
        <svg class="m-arcs" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
          {hops.map((h, k) => {
            const x1 = at(stops[k]) * 100;
            const x2 = at(stops[k + 1]) * 100;
            return <path key={k} class={`m-arc m-hide ${Math.abs(h) >= 10 ? 'is-big' : ''}`} d={`M ${x1} 22 Q ${(x1 + x2) / 2} ${Math.abs(h) >= 10 ? -6 : 4} ${x2} 22`} vector-effect="non-scaling-stroke" />;
          })}
        </svg>
        <span class="m-line" style={`--to:${at(to)}`}>
          {stops.map((n, k) => (
            <span key={`s${k}`} class={`ll-stop m-hide ${k % 2 ? 'is-low' : ''} ${k === stops.length - 1 ? 'is-to' : ''}`} style={`--x:${at(n)}`}>
              {n}
            </span>
          ))}
          <span class="m-marker m-hide" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" />
              <path d="M12 5.5 L13.9 10 L18.6 10.3 L15 13.3 L16.2 18 L12 15.4 L7.8 18 L9 13.3 L5.4 10.3 L10.1 10 Z" />
            </svg>
          </span>
          {ticks.map((n) => (
            <span class={`m-tick ${label(n) ? 'is-major' : 'is-minor'}`} key={n} style={`--x:${at(n)}`}>
              {label(n) && <span class="m-tick-n">{n}</span>}
            </span>
          ))}
        </span>
      </span>
      <Total>
        {from} {sum > 0 ? '+' : '−'} {Math.abs(sum)} = {to}
      </Total>
    </Frame>
  );
}
