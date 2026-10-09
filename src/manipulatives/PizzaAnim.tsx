// PizzaAnim (פיצה, phase 9): fractions as a pizza. It is cut into equal slices one cut at a time
// (a knife sound, a little higher each cut), then slices get their topping one by one, counted.
// Then, as the action says: `add` more slices are coloured (adding fractions – the pizza is not
// cut again); `split` every slice is cut in two or three (1/2 = 2/4: more, smaller slices, the same
// amount); `join` cuts disappear and slices glue together (6/8 = 3/4); `vs` a second pizza beside
// it, and the sign between them.
import { useRef } from 'preact/hooks';
import type { Frac } from '../core/types';
import { emit } from '../fx/director';
import { cut, wedge } from '../ui/Pizza';
import { MathText } from '../ui/MathText';
import { FADE_IN, popIn, pulse, useRun, type RunProps, type Timeline } from './timeline';
import { Frame, Total, q } from './parts';
import '../ui/phase9.css';

interface Props extends RunProps {
  d: number;
  n: number;
  add?: number;
  split?: number;
  join?: number;
  vs?: Frac;
}

/** One pizza's pieces: its cuts (first ones, ones added by a split, ones a join removes) and slices. */
function OnePizza({ d, n, add = 0, split = 1, join = 1, side }: { d: number; n: number; add?: number; split?: number; join?: number; side: 'a' | 'b' }) {
  const fine = d * split;
  return (
    <svg class={`pizza pz-${side} m-hide`} viewBox="0 0 100 100" aria-hidden="true">
      <circle class="pz-crust" cx="50" cy="50" r="49" />
      {Array.from({ length: fine }, (_, j) => (
        <path key={`s${j}`} class="pz-slice" d={wedge(j, fine)} />
      ))}
      {Array.from({ length: fine }, (_, j) => {
        const on = j < n * split ? 'is-on' : j < n * split + add ? 'is-add' : '';
        return on ? <path key={`t${j}`} class={`pz-top ${on} m-hide`} d={wedge(j, fine)} data-slice={Math.floor(j / split)} /> : null;
      })}
      {fine > 1 &&
        Array.from({ length: fine }, (_, i) => {
          const c = cut(i, fine);
          const kind = split > 1 && i % split ? 'second' : join > 1 && i % join ? 'glue' : 'first';
          return <line key={`c${i}`} class={`pz-cut is-${kind} m-hide ${kind === 'glue' ? 'm-go' : ''}`} x1="50" y1="50" x2={c.x2} y2={c.y2} />;
        })}
    </svg>
  );
}

const fx = (f: Frac) => `${f.n}/${f.d}`;

export function PizzaAnim(props: Props) {
  const { d, n, add, split, join, vs, ...run } = props;
  const root = useRef<HTMLDivElement>(null);
  let cutN = 0;
  useRun(
    root,
    async (tl, el) => {
      cutN = 0;
      const one = async (svg: Element, colour: number) => {
        await tl.anim(svg, popIn(tl.calm, 6), 320);
        // Cut it, one cut at a time (a join starts already cut fine).
        for (const line of q(svg, '.pz-cut:not(.is-second)')) {
          emit({ type: 'slice', n: ++cutN });
          await tl.anim(line, FADE_IN, 160);
          await tl.wait(60);
        }
        await tl.wait(200);
        await colourIn(tl, svg, '.pz-top.is-on', colour);
      };
      await one(el.querySelector('.pz-a')!, n);
      if (add) {
        await tl.wait(300);
        await colourIn(tl, el.querySelector('.pz-a')!, '.pz-top.is-add', n);
      }
      if (split) {
        await tl.wait(400);
        for (const line of q(el, '.pz-a .pz-cut.is-second')) {
          emit({ type: 'slice', n: ++cutN });
          await tl.anim(line, FADE_IN, 160);
          await tl.wait(60);
        }
        for (const t of q(el, '.pz-a .pz-top.is-on')) tl.bg(t, pulse(tl.calm, 1.04), 300);
      }
      if (join) {
        await tl.wait(400);
        emit({ type: 'ten' });
        for (const line of q(el, '.pz-a .pz-cut.is-glue')) tl.bg(line, [{ opacity: 1 }, { opacity: 0 }], 500);
        await tl.wait(600);
      }
      if (vs) {
        await tl.wait(300);
        await one(el.querySelector('.pz-b')!, vs.n);
        await tl.wait(300);
        emit({ type: 'ten' });
        await tl.anim(el.querySelector('.pz-sign'), popIn(tl.calm, 6), 360);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const a: Frac = { n, d };
  const end: Frac = split ? { n: n * split, d: d * split } : join ? { n: n / join, d: d / join } : { n: n + (add ?? 0), d };
  const sign = vs ? (n * vs.d > vs.n * d ? '>' : n * vs.d < vs.n * d ? '<' : '=') : '';
  const text = vs ? `${fx(a)} ${sign} ${fx(vs)}` : add ? `${fx(a)} + ${add}/${d} = ${fx(end)}` : split || join ? `${fx(a)} = ${fx(end)}` : fx(a);
  return (
    <Frame kind="pizza" label={`פיצה: ${text}`} rootRef={root}>
      <span class={`pz-row ${vs ? 'is-two' : ''}`}>
        <span class="pz-holder">
          <OnePizza d={d} n={n} add={add} split={split} join={join} side="a" />
        </span>
        {vs && (
          <>
            <span class="pz-sign m-hide">{sign}</span>
            <span class="pz-holder">
              <OnePizza d={vs.d} n={vs.n} side="b" />
            </span>
          </>
        )}
      </span>
      <Total>
        <MathText text={text} />
      </Total>
    </Frame>
  );
}

/** Topping on the slices one by one, each counted (on from `from`). */
async function colourIn(tl: Timeline, svg: Element, sel: string, from: number) {
  const tops = q(svg, sel);
  const bySlice = new Map<string, Element[]>();
  for (const t of tops) {
    const k = (t as HTMLElement).dataset.slice ?? '0';
    bySlice.set(k, [...(bySlice.get(k) ?? []), t]);
  }
  let c = sel.includes('is-add') ? from : 0;
  for (const group of bySlice.values()) {
    emit({ type: 'count', n: ++c });
    for (const t of group) tl.bg(t, FADE_IN, 240);
    await tl.wait(300);
  }
}
