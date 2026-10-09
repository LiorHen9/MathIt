// The KenKen board (phase 9): a 4×4 grid in cages (thick lines, the cage's number and sign in its
// corner). Tap a square, then 1–4 below (or ⌫ to clear). The same number twice in a row or a
// column is marked at once; a full grid that breaks a cage is a slip (the cage is marked). A hint
// fills one square for good.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { cageValue, kenkenOk, makeKenKen } from '../../core/puzzles/kenken';
import { emit } from '../../fx/director';
import type { PuzzleProps } from './types';

export function KenKen({ level, seed, hint, onHintText, onMistake, onSolved, onTask }: PuzzleProps) {
  const p = useMemo(() => makeKenKen(level, seed), [level, seed]);
  const [g, setG] = useState<number[]>(() => Array.from({ length: 16 }, (_, i) => (p.givens.includes(i) ? p.solution[i] : 0)));
  const [fixed, setFixed] = useState<number[]>(p.givens);
  const [sel, setSel] = useState<number | null>(null);
  const [badCages, setBadCages] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const cageOf = useMemo(() => {
    const m: number[] = [];
    p.cages.forEach((c, k) => c.cells.forEach((i) => (m[i] = k)));
    return m;
  }, [p]);
  useEffect(() => onTask('בכל שורה ובכל טור – 1, 2, 3, 4 פעם אחת, וכל כלוב נותן את המספר שלו.'), [p]);

  useEffect(() => {
    if (!hint || done) return;
    const i = Array.from({ length: 16 }, (_, k) => k).find((k) => g[k] !== p.solution[k] && !fixed.includes(k));
    if (i === undefined) return;
    const next = g.slice();
    next[i] = p.solution[i];
    setG(next);
    setFixed([...fixed, i]);
    onHintText(`בשורה ${Math.floor(i / 4) + 1}, במשבצת ${(i % 4) + 1}, יש ${p.solution[i]}.`);
    after(next);
  }, [hint]);

  function after(next: number[]) {
    if (next.some((x) => !x)) {
      setBadCages([]);
      return;
    }
    if (kenkenOk(p.cages, next)) {
      setDone(true);
      onSolved(document.querySelector('.kk-grid'));
      return;
    }
    setBadCages(p.cages.map((c, k) => (cageValue(c.op, c.cells.map((i) => next[i])) === c.target ? -1 : k)).filter((k) => k >= 0));
    onMistake(document.querySelector('.kk-grid'));
  }

  function enter(v: number) {
    if (done || sel === null || fixed.includes(sel)) return;
    const next = g.slice();
    next[sel] = v;
    setG(next);
    emit({ type: 'tap', key: v });
    after(next);
  }

  const clash = (i: number) => g[i] > 0 && [0, 1, 2, 3].some((k) => (k !== i % 4 && g[Math.floor(i / 4) * 4 + k] === g[i]) || (k !== Math.floor(i / 4) && g[k * 4 + (i % 4)] === g[i]));
  const edge = (i: number, j: number) => j < 0 || j > 15 || cageOf[i] !== cageOf[j];
  return (
    <div class="puzzle-kenken" data-solution={JSON.stringify(p.solution)}>
      <div class={`kk-grid ${done ? 'is-done' : ''}`} dir="ltr" role="grid" aria-label="קנקן 4 על 4">
        {g.map((x, i) => {
          const c = p.cages[cageOf[i]];
          const head = c.cells[0] === i;
          const borders = [edge(i, i - 4) ? 'b-t' : '', i % 4 === 3 || edge(i, i + 1) ? 'b-r' : '', edge(i, i + 4) ? 'b-b' : '', i % 4 === 0 || edge(i, i - 1) ? 'b-l' : ''].join(' ');
          return (
            <button
              type="button"
              key={i}
              class={`kk-cell ${borders} ${fixed.includes(i) ? 'is-fixed' : ''} ${sel === i ? 'is-sel' : ''} ${clash(i) ? 'is-clash' : ''} ${badCages.includes(cageOf[i]) ? 'is-bad' : ''}`}
              data-cell={i}
              data-testid={`kenken-cell-${i}`}
              aria-label={`משבצת ${i + 1}${x ? `: ${x}` : ''}`}
              disabled={done}
              onClick={() => {
                setSel(i);
                emit({ type: 'tap' });
              }}
            >
              {head && (
                <span class="kk-cage" dir="ltr">
                  {c.target}
                  {c.op}
                </span>
              )}
              <span class="kk-v">{x || ''}</span>
            </button>
          );
        })}
      </div>
      <div class="kk-pad" dir="ltr" role="group" aria-label="מספרים">
        {[1, 2, 3, 4].map((v) => (
          <button type="button" key={v} class="pt-tile kk-key" data-testid={`kenken-key-${v}`} disabled={done || sel === null} onClick={() => enter(v)}>
            {v}
          </button>
        ))}
        <button type="button" class="pt-tile kk-key is-clear" aria-label="למחוק" data-testid="kenken-clear" disabled={done || sel === null} onClick={() => enter(0)}>
          ⌫
        </button>
      </div>
    </div>
  );
}
