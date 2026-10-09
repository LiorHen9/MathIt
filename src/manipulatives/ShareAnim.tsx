// ShareAnim (חלוקה לקבוצות, phase 9): a pile of things is shared onto plates, one round at a
// time – one to every plate – the note climbing a step each round. What cannot make a whole round
// is left over: it flies aside and is counted (the remainder). The answer is what each plate got,
// or (`ask` left) what is left.
// Every thing has its place on a plate (or aside) in the layout; the script starts it in the pile
// and moves it there, so the end state is simply the layout (transform/opacity only).
import { useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { FADE_IN, popIn, pulse, useRun, type RunProps } from './timeline';
import { Frame, Total, q } from './parts';
import '../ui/phase9.css';

export function ShareAnim({ total, groups, ask, ...run }: { total: number; groups: number; ask: 'each' | 'left' } & RunProps) {
  const root = useRef<HTMLDivElement>(null);
  const each = Math.floor(total / groups);
  const left = total % groups;
  const d = total > 50 ? 8 : total > 24 ? 11 : 15;
  useRun(
    root,
    async (tl, el) => {
      const dots = q(el, '.sh-dot');
      const offset = (dot: HTMLElement) => {
        const from = el.querySelector<HTMLElement>(`.sh-pslot[data-i="${dot.dataset.i}"]`)!.getBoundingClientRect();
        const to = dot.getBoundingClientRect();
        return `translate(${(from.left - to.left).toFixed(1)}px, ${(from.top - to.top).toFixed(1)}px)`;
      };
      const start = new Map(dots.map((dot) => [dot, offset(dot)]));
      // The pile appears.
      dots.forEach((dot, i) => tl.bg(dot, [{ opacity: 0, transform: `${start.get(dot)} scale(0.3)` }, { opacity: 1, transform: start.get(dot)! }], 240, { delay: Math.min(i * 10, 500) }));
      await tl.wait(Math.min(dots.length * 10, 500) + 400);
      // Round by round, one to every plate.
      for (let k = 0; k < each; k++) {
        emit({ type: 'count', n: k + 1 });
        const round = dots.filter((dot) => Number(dot.dataset.round) === k);
        round.forEach((dot) => tl.bg(dot, [{ transform: start.get(dot)! }, { transform: 'translate(0px, 0px)' }], 420, { easing: 'cubic-bezier(.5,0,.3,1)' }));
        await tl.wait(520);
      }
      for (const lbl of q(el, '.sh-count')) tl.bg(lbl, FADE_IN, 240);
      if (left) {
        await tl.wait(300);
        // Not enough for another round: aside.
        emit({ type: 'whoosh' });
        const rest = dots.filter((dot) => dot.dataset.round === 'left');
        rest.forEach((dot) => tl.bg(dot, [{ transform: start.get(dot)! }, { transform: 'translate(0px, 0px)' }], 480));
        await tl.wait(560);
        for (const [i, dot] of rest.entries()) {
          emit({ type: 'count', n: i + 1 });
          await tl.anim(dot, pulse(tl.calm, 1.4), 300);
        }
        tl.bg(el.querySelector('.sh-left-label'), FADE_IN, 240);
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );
  const label = `${total} מתחלקים ל-${groups}: ${each} בכל קבוצה${left ? `, ונשארים ${left}` : ''}`;
  return (
    <Frame kind="share" label={label} rootRef={root}>
      <span class="sh-pile" style={`--sh-d:${d}px`} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span class="sh-pslot" key={i} data-i={i} />
        ))}
      </span>
      <span class="sh-table" style={`--sh-d:${d}px`}>
        <span class="sh-plates">
          {Array.from({ length: groups }, (_, g) => (
            <span class="sh-plate" key={g}>
              <span class="sh-stack">
                {Array.from({ length: each }, (_, k) => (
                  <span class="sh-dot m-hide" key={k} data-i={k * groups + g} data-round={k} />
                ))}
              </span>
              <span class="sh-count m-hide">{each}</span>
            </span>
          ))}
        </span>
        {left > 0 && (
          <span class="sh-left">
            <span class="sh-stack">
              {Array.from({ length: left }, (_, j) => (
                <span class="sh-dot is-left m-hide" key={j} data-i={each * groups + j} data-round="left" />
              ))}
            </span>
            <span class="sh-left-label m-hide">שארית {left}</span>
          </span>
        )}
      </span>
      <Total>{ask === 'each' ? `${total} : ${groups} = ${each}${left ? ` (שארית ${left})` : ''}` : `שארית ${left}`}</Total>
    </Frame>
  );
}
