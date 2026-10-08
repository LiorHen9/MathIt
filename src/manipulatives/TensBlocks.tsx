// TensBlocks (קוביות ומוטות, phase 7): tens rods and ones cubes. The rods appear counted by tens
// (a "leap" note for each), the cubes counted on one by one. Then, as the action says:
// - ten loose cubes fly together onto a new rod and "snap" with a chord (regrouping);
// - `add`: more rods and cubes arrive from above, and ten loose cubes snap again;
// - `take`: when there are not enough cubes, a rod breaks into ten cubes (the chord again), then
//   rods and cubes fly away;
// - `ask`: the rods (tens) or the cubes (ones) are counted once more – that is the answer.
// Every piece has a fixed slot; the script only moves and fades them (transform/opacity).
import { useMemo, useRef } from 'preact/hooks';
import { emit } from '../fx/director';
import { Cube, Rod } from '../ui/art';
import { FADE_IN, popIn, pulse, useRun, type RunProps, type Timeline } from './timeline';
import { Frame, Total, q } from './parts';

interface Props extends RunProps {
  tens: number;
  ones: number;
  add?: number;
  take?: number;
  ask?: 'tens' | 'ones';
}

type Phase = 'init' | 'add' | 'snap' | 'break';
interface Piece {
  phase: Phase;
  /** Gone by the end (snapped into a rod, broken, taken away). */
  gone?: 'snap' | 'break' | 'take';
}

/** The pieces the whole story needs, in slot order, and how it unfolds. */
function plan(p: Props) {
  const rods: Piece[] = [];
  const cubes: Piece[] = [];
  for (let i = 0; i < p.tens; i++) rods.push({ phase: 'init' });
  for (let i = 0; i < p.ones; i++) cubes.push({ phase: 'init' });
  const live = (xs: Piece[]) => xs.filter((x) => !x.gone);
  const snaps: { cubes: number[]; rod: number }[] = [];
  const snap = () => {
    while (live(cubes).length >= 10) {
      const ids = cubes.map((c, i) => (!c.gone ? i : -1)).filter((i) => i >= 0).slice(0, 10);
      ids.forEach((i) => (cubes[i].gone = 'snap'));
      rods.push({ phase: 'snap' });
      snaps.push({ cubes: ids, rod: rods.length - 1 });
    }
  };
  snap();
  const firstSnaps = snaps.length;
  let addRods: number[] = [];
  let addCubes: number[] = [];
  if (p.add) {
    for (let i = 0; i < Math.floor(p.add / 10); i++) addRods.push(rods.push({ phase: 'add' }) - 1);
    for (let i = 0; i < p.add % 10; i++) addCubes.push(cubes.push({ phase: 'add' }) - 1);
    snap();
  }
  let broken: { rod: number; cubes: number[] } | null = null;
  const takeRods: number[] = [];
  const takeCubes: number[] = [];
  if (p.take) {
    const tt = Math.floor(p.take / 10);
    const to = p.take % 10;
    if (to > live(cubes).length) {
      const r = rods.map((x, i) => (!x.gone ? i : -1)).filter((i) => i >= 0).at(-1)!;
      rods[r].gone = 'break';
      const ids: number[] = [];
      for (let i = 0; i < 10; i++) ids.push(cubes.push({ phase: 'break' }) - 1);
      broken = { rod: r, cubes: ids };
    }
    const liveRods = rods.map((x, i) => (!x.gone ? i : -1)).filter((i) => i >= 0);
    takeRods.push(...liveRods.slice(-tt || liveRods.length).slice(0, tt));
    const liveCubes = cubes.map((x, i) => (!x.gone ? i : -1)).filter((i) => i >= 0);
    takeCubes.push(...liveCubes.slice(liveCubes.length - to));
    takeRods.forEach((i) => (rods[i].gone = 'take'));
    takeCubes.forEach((i) => (cubes[i].gone = 'take'));
  }
  return { rods, cubes, snaps, firstSnaps, addRods, addCubes, broken, takeRods, takeCubes };
}

export function TensBlocks(props: Props) {
  const { tens, ones, add, take, ask, ...run } = props;
  const root = useRef<HTMLDivElement>(null);
  const P = useMemo(() => plan(props), [tens, ones, add, take]);
  const start = tens * 10 + ones;
  const value = start + (add ?? 0) - (take ?? 0);
  const result = ask === 'tens' ? tens : ask === 'ones' ? ones : value;

  useRun(
    root,
    async (tl, el) => {
      const rods = q(el, '.tb-rod');
      const cubes = q(el, '.tb-cube');
      const rodLabel = (i: number) => rods[i].querySelector('.m-n');
      let count = 0;
      // The rods first, counted by tens; then the cubes, counted on.
      for (let i = 0; i < tens; i++) {
        emit({ type: 'leap', n: (i + 1) * 10 });
        tl.bg(rodLabel(i), FADE_IN, 240);
        await tl.anim(rods[i], popIn(tl.calm, 10), 340, { easing: 'cubic-bezier(.3,.7,.4,1)' });
        await tl.wait(120);
      }
      for (let i = 0; i < ones; i++) {
        emit({ type: 'count', n: ++count });
        await tl.anim(cubes[i], popIn(tl.calm, 8), 240, { easing: 'cubic-bezier(.3,.7,.4,1)' });
        await tl.wait(70);
      }
      for (const s of P.snaps.slice(0, P.firstSnaps)) await snapTen(tl, cubes, rods, s);
      if (add) {
        await tl.wait(300);
        // New rods and cubes drop in from above.
        const drop: Keyframe[] = tl.calm
          ? FADE_IN
          : [
              { opacity: 0, transform: 'translateY(-40px)' },
              { opacity: 1, transform: 'translateY(4px)', offset: 0.75 },
              { opacity: 1, transform: 'translateY(0)' }
            ];
        for (const i of P.addRods) {
          emit({ type: 'leap', n: (i + 1) * 10 });
          tl.bg(rodLabel(i), FADE_IN, 240);
          await tl.anim(rods[i], drop, 380);
          await tl.wait(100);
        }
        for (const i of P.addCubes) {
          emit({ type: 'count', n: ++count });
          await tl.anim(cubes[i], drop, 260);
        }
        for (const s of P.snaps.slice(P.firstSnaps)) await snapTen(tl, cubes, rods, s);
      }
      if (take) {
        await tl.wait(300);
        if (P.broken) {
          // Not enough ones: a rod breaks into ten cubes.
          emit({ type: 'ten' });
          await tl.anim(rods[P.broken.rod], pulse(tl.calm, 1.15), 300);
          tl.bg(rods[P.broken.rod], [{ opacity: 1 }, { opacity: 0 }], 300);
          for (const i of P.broken.cubes) tl.bg(cubes[i], popIn(tl.calm, 6), 300);
          await tl.wait(520);
        }
        const away = (k: number): Keyframe[] =>
          tl.calm
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [
                { opacity: 1, transform: 'translate(0, 0) rotate(0deg)' },
                { opacity: 0, transform: `translate(${k % 2 ? 26 : -26}px, -70px) rotate(${k % 2 ? 40 : -40}deg)` }
              ];
        for (const [k, i] of P.takeRods.entries()) {
          emit({ type: 'whoosh' });
          await tl.anim(rods[i], away(k), 420, { easing: 'ease-in' });
        }
        for (const [k, i] of P.takeCubes.entries()) {
          if (k % 3 === 0) emit({ type: 'whoosh' });
          await tl.anim(cubes[i], away(k), 260, { easing: 'ease-in' });
        }
      }
      if (ask) {
        await tl.wait(260);
        const list = ask === 'tens' ? rods.slice(0, tens) : cubes.slice(0, ones);
        for (let i = 0; i < list.length; i++) {
          emit({ type: 'count', n: i + 1 });
          await tl.anim(list[i], pulse(tl.calm, 1.25), 300);
        }
      }
      await tl.anim(el.querySelector('.m-total'), popIn(tl.calm, 6), 380);
      await tl.wait(500);
    },
    run
  );

  const sign = add ? ` + ${add}` : take ? ` − ${take}` : '';
  const label = ask
    ? `${tens} מוטות ו-${ones} קוביות: ${ask === 'tens' ? `${tens} עשרות` : `${ones} אחדות`}`
    : add
      ? `${start} ועוד ${add} בקוביות ומוטות: ${value}`
      : take
        ? `${start} פחות ${take} בקוביות ומוטות: ${value}`
        : `${value} בקוביות ומוטות`;
  const cls = (x: Piece) => `${x.phase === 'init' ? 'm-hide' : 'm-hide'} ${x.gone ? 'm-go' : ''}`;
  return (
    <Frame kind="tens" label={label} rootRef={root}>
      <span class="tb-board">
        <span class="tb-rods">
          {P.rods.map((x, i) => (
            <span key={i} class={`tb-rod ${cls(x)}`} data-phase={x.phase}>
              <Rod />
              <span class="m-n">{x.phase === 'init' || x.phase === 'add' ? (i + 1) * 10 : ''}</span>
            </span>
          ))}
        </span>
        <span class="tb-cubes" style={`--rows:${Math.ceil(P.cubes.length / 5)}`}>
          {P.cubes.map((x, i) => (
            <span key={i} class={`tb-cube ${cls(x)}`} data-phase={x.phase}>
              <Cube />
            </span>
          ))}
        </span>
      </span>
      <Total>
        {ask ? result : `${start}${sign}${sign ? ` = ${value}` : ''}`}
      </Total>
    </Frame>
  );
}

/** Ten loose cubes fly onto a new rod's slot and snap into it, with the chord. */
async function snapTen(tl: Timeline, cubes: HTMLElement[], rods: HTMLElement[], s: { cubes: number[]; rod: number }) {
  await tl.wait(260);
  const target = rods[s.rod].getBoundingClientRect();
  const moves = s.cubes.map((i, k) => {
    const r = cubes[i].getBoundingClientRect();
    const dx = target.left + target.width / 2 - (r.left + r.width / 2);
    const dy = target.top + (target.height * (k + 0.5)) / 10 - (r.top + r.height / 2);
    return { el: cubes[i], dx, dy };
  });
  for (const m of moves.slice(0, -1)) tl.bg(m.el, [{ transform: 'translate(0,0)' }, { transform: `translate(${m.dx}px, ${m.dy}px)` }], 520, { easing: 'cubic-bezier(.5,0,.3,1)' });
  const last = moves.at(-1)!;
  await tl.anim(last.el, [{ transform: 'translate(0,0)' }, { transform: `translate(${last.dx}px, ${last.dy}px)` }], 520, { easing: 'cubic-bezier(.5,0,.3,1)' });
  emit({ type: 'ten' });
  for (const m of moves) tl.bg(m.el, [{ opacity: 1, transform: `translate(${m.dx}px, ${m.dy}px)` }, { opacity: 0, transform: `translate(${m.dx}px, ${m.dy}px)` }], 200);
  await tl.anim(rods[s.rod], [{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(1)' }], 320);
  await tl.wait(200);
}
