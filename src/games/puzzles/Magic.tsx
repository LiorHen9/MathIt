// The magic square board (phase 9): a 3×3 square, the missing numbers in a tray below. Tap a
// number, then an empty square (or the other way round) to place it; tap a placed number to take
// it back. Every row, column and diagonal shows its sum as it fills – lit when it makes the
// target. A full square that does not work is a slip: its wrong lines are marked. A hint puts one
// number where it belongs, for good.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { LINES, makeMagic } from '../../core/puzzles/magic';
import { emit } from '../../fx/director';
import type { PuzzleProps } from './types';

export function Magic({ level, seed, hint, onHintText, onMistake, onSolved, onTask }: PuzzleProps) {
  const p = useMemo(() => makeMagic(level, seed), [level, seed]);
  const [cells, setCells] = useState<(number | null)[]>(p.cells);
  /** Squares filled by a hint: fixed. */
  const [locked, setLocked] = useState<number[]>([]);
  const [pick, setPick] = useState<{ tray?: number; cell?: number }>({});
  const [bad, setBad] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const holes = p.cells.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  // The numbers are all different, so a tile is known by its value.
  const used = (k: number) => holes.some((h) => cells[h] === p.tray[k]);

  useEffect(() => onTask(`בכל שורה, טור ואלכסון הסכום הוא ${p.target}: משלימים את המספרים החסרים.`), [p]);

  // A hint: the first hole that is empty or wrong gets its number.
  useEffect(() => {
    if (!hint || done) return;
    const h = holes.find((i) => cells[i] !== p.solution[i]);
    if (h === undefined) return;
    const next = cells.map((c, i) => (holes.includes(i) && c === p.solution[h] ? null : c));
    next[h] = p.solution[h];
    setCells(next);
    setLocked([...locked, h]);
    onHintText(`במשבצת הזאת ${p.solution[h]}.`);
    after(next);
  }, [hint]);

  function after(next: (number | null)[]) {
    if (holes.some((h) => next[h] === null)) {
      setBad([]);
      return;
    }
    const wrong = LINES.map((l, i) => (l.reduce((s, j) => s + (next[j] ?? 0), 0) === p.target ? -1 : i)).filter((i) => i >= 0);
    setBad(wrong);
    if (wrong.length) onMistake(document.querySelector('.mg-grid'));
    else {
      setDone(true);
      onSolved(document.querySelector('.mg-grid'));
    }
  }

  function put(cell: number, k: number) {
    // The tile leaves any square it was on.
    const next = cells.map((c, i) => (holes.includes(i) && c === p.tray[k] ? null : c));
    next[cell] = p.tray[k];
    setCells(next);
    setPick({});
    emit({ type: 'tap', key: p.tray[k] % 10 });
    after(next);
  }

  function tapCell(i: number) {
    if (done || p.cells[i] !== null || locked.includes(i)) return;
    if (cells[i] !== null) {
      // Back to the tray.
      const next = cells.slice();
      next[i] = null;
      setCells(next);
      setBad([]);
      emit({ type: 'tap' });
      return;
    }
    if (pick.tray !== undefined) put(i, pick.tray);
    else setPick({ cell: i });
  }

  function tapTile(k: number) {
    if (done || used(k)) return;
    if (pick.cell !== undefined) put(pick.cell, k);
    else setPick({ tray: k });
    emit({ type: 'tap' });
  }

  const sum = (l: number[]) => l.reduce((s, j) => s + (cells[j] ?? 0), 0);
  const full = (l: number[]) => l.every((j) => cells[j] !== null);
  const lineCls = (i: number) => (full(LINES[i]) ? (sum(LINES[i]) === p.target ? 'is-ok' : bad.includes(i) ? 'is-bad' : '') : '');
  return (
    <div class="puzzle-magic" data-solution={JSON.stringify(p.solution)} data-target={p.target}>
      <div class="mg-wrap" dir="ltr">
        <span class={`mg-sum mg-diag2 ${lineCls(7)}`} data-line="7">
          {sum(LINES[7]) || ''}
        </span>
        <div class={`mg-grid ${done ? 'is-done' : ''}`} role="grid" aria-label={`ריבוע קסם, סכום ${p.target}`}>
          {cells.map((c, i) => {
            const given = p.cells[i] !== null;
            return (
              <button
                type="button"
                key={i}
                class={`mg-cell ${given ? 'is-given' : 'is-hole'} ${locked.includes(i) ? 'is-locked' : ''} ${pick.cell === i ? 'is-picked' : ''}`}
                data-cell={i}
                data-testid={`magic-cell-${i}`}
                aria-label={c === null ? 'משבצת ריקה' : String(c)}
                disabled={given || done}
                onClick={() => tapCell(i)}
              >
                {c ?? ''}
              </button>
            );
          })}
        </div>
        <span class="mg-rows">
          {[0, 1, 2].map((r) => (
            <span key={r} class={`mg-sum ${lineCls(r)}`} data-line={r}>
              {sum(LINES[r]) || ''}
            </span>
          ))}
        </span>
        <span class="mg-cols">
          {[3, 4, 5].map((r) => (
            <span key={r} class={`mg-sum ${lineCls(r)}`} data-line={r}>
              {sum(LINES[r]) || ''}
            </span>
          ))}
        </span>
        <span class={`mg-sum mg-diag1 ${lineCls(6)}`} data-line="6">
          {sum(LINES[6]) || ''}
        </span>
      </div>
      <div class="mg-tray" dir="ltr" role="group" aria-label="מספרים להשלמה">
        {p.tray.map((x, k) => (
          <button type="button" key={k} class={`pt-tile mg-tile ${pick.tray === k ? 'is-picked' : ''} ${used(k) ? 'is-used' : ''}`} data-tile={k} data-value={x} data-testid={`magic-tile-${k}`} disabled={done || used(k)} onClick={() => tapTile(k)}>
            {x}
          </button>
        ))}
      </div>
    </div>
  );
}
