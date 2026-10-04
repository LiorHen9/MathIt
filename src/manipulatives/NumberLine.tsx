// NumberLine (ציר המספרים): 0–10, rising left to right (as at school, also in RTL). A marker
// appears at the start and hops one number at a time in arcs – each hop leaves its arc drawn
// and plays the note of the number it lands on (forward climbs, backward falls).
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, arcFrames, popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';

const TICKS = 11;
/** Where tick i sits, as a share of the line (0..1). */
const at = (i: number) => i / (TICKS - 1);

export function NumberLine({ from, by, ...run }: { from: number; by: number } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const to = from + by;
  const dir = Math.sign(by);
  const hops = Array.from({ length: Math.abs(by) }, (_, k) => from + dir * k);
  useRun(
    root,
    async (tl, el) => {
      const line = el.querySelector('.m-line')!;
      const w = line.getBoundingClientRect().width;
      const x = (i: number) => at(i) * w;
      const marker = el.querySelector<HTMLElement>('.m-marker')!;
      const ticks = q(el, '.m-tick');
      const arcs = q<SVGPathElement>(el, '.m-arc');
      // The marker appears on the start.
      await tl.anim(marker, [{ opacity: 0, transform: `translateX(${x(from)}px) scale(0.3)` }, { opacity: 1, transform: `translateX(${x(from)}px) scale(1)` }], 380);
      ticks[from].classList.add('is-lit');
      await tl.anim(ticks[from].querySelector('.m-tick-n'), pulse(tl.calm, 1.4), 400);
      await tl.wait(380);
      // Hop by hop.
      for (let k = 0; k < hops.length; k++) {
        const a = hops[k];
        const b = a + dir;
        tl.bg(arcs[k], FADE_IN, 420);
        await tl.anim(marker, arcFrames(x(b) - x(a), 0, tl.calm ? 12 : 26).map((f) => ({ ...f, transform: `translateX(${x(a)}px) ${f.transform}` })), 520, {
          easing: 'linear'
        });
        emit({ type: 'jump', n: b });
        ticks[b].classList.add('is-hit');
        await tl.anim(ticks[b].querySelector('.m-tick-n'), pulse(tl.calm, 1.45), 360);
        await tl.wait(160);
      }
      ticks[to].classList.add('is-lit');
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const sign = by > 0 ? '+' : '−';
  return (
    <Frame kind="jump" label={`על ציר המספרים מ-${from} ${by > 0 ? 'קדימה' : 'אחורה'} ${Math.abs(by)} קפיצות, עד ${to}`} rootRef={root}>
      <span class="m-line-wrap">
        <svg class="m-arcs" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
          {hops.map((a, k) => {
            const x1 = at(a) * 100;
            const x2 = at(a + dir) * 100;
            return <path key={k} class="m-arc m-hide" d={`M ${x1} 22 Q ${(x1 + x2) / 2} 0 ${x2} 22`} vector-effect="non-scaling-stroke" />;
          })}
        </svg>
        <span class="m-line" style={`--to:${at(to)}`}>
          <span class="m-marker m-hide" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" />
              <path d="M12 5.5 L13.9 10 L18.6 10.3 L15 13.3 L16.2 18 L12 15.4 L7.8 18 L9 13.3 L5.4 10.3 L10.1 10 Z" />
            </svg>
          </span>
          {Array.from({ length: TICKS }, (_, i) => (
            <span class={`m-tick ${i === to ? 'is-to' : ''}`} key={i} style={`--x:${at(i)}`}>
              <span class="m-tick-n">{i}</span>
            </span>
          ))}
        </span>
      </span>
      <Total>
        {from} {sign} {Math.abs(by)} = {to}
      </Total>
    </Frame>
  );
}
