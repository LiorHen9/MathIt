// Puzzles (phase 9, docs/ARCHITECTURE.md §4.4): a station on the map that is not a round of
// questions but one puzzle to solve – a magic square, a balance, a missing number, a small KenKen.
// Learning Core: plain data from a seed (the same seed, the same puzzle), each with exactly one
// solution (checked by brute force when it is made). screens/PuzzleHost.tsx and games/puzzles/
// draw them.

export type PuzzleId = 'magic' | 'balance' | 'missing' | 'kenken';
export const PUZZLE_IDS: readonly PuzzleId[] = ['magic', 'balance', 'missing', 'kenken'];

/** How many levels each puzzle has. */
export const PUZZLE_LEVELS: Record<PuzzleId, number> = { magic: 2, balance: 2, missing: 3, kenken: 2 };

/** A 3×3 magic square with some numbers missing: every row, column and diagonal adds up to `target`. */
export interface MagicPuzzle {
  kind: 'magic';
  target: number;
  /** Row by row; null = missing. */
  cells: (number | null)[];
  solution: number[];
  /** The missing numbers, to place (shuffled). */
  tray: number[];
}

/** A balance: weights on both pans, `boxes` equal unknown boxes on the left. */
export interface BalancePuzzle {
  kind: 'balance';
  left: number[];
  right: number[];
  /** How many boxes of the unknown weight sit on the left pan (1 or 2). */
  boxes: number;
  answer: number;
  /** Weights to try in the box (one of them balances). */
  tray: number[];
}

/** An exercise with a number missing: "? + 17 = 42", "(? + 4) × 3 = 21". */
export interface MissingPuzzle {
  kind: 'missing';
  /** The exercise, left to right; '?' is the missing number. */
  math: string;
  answer: number;
  /** One sentence on how to undo it (the hint). */
  undo: string;
}

export type KenKenOp = '+' | '−' | '×' | ':' | '';

/** A cage: cells (indices 0–15) whose numbers make `target` with `op` ('' = one cell, the number itself). */
export interface Cage {
  cells: number[];
  op: KenKenOp;
  target: number;
}

/** A 4×4 KenKen: 1–4 once in every row and column, and every cage makes its target. */
export interface KenKenPuzzle {
  kind: 'kenken';
  size: 4;
  cages: Cage[];
  solution: number[];
  /** Cells filled in from the start. */
  givens: number[];
}

export type Puzzle = MagicPuzzle | BalancePuzzle | MissingPuzzle | KenKenPuzzle;

/** Stars for a solved puzzle: 3 with no hint and at most one slip, 2 with one hint or a few slips, else 1. */
export function puzzleStars(hints: number, mistakes: number): 1 | 2 | 3 {
  if (hints === 0 && mistakes <= 1) return 3;
  if (hints <= 1 && mistakes <= 3) return 2;
  return 1;
}

/** The puzzle's title for the child. */
export const PUZZLE_TITLES: Record<PuzzleId, string> = { magic: 'ריבוע קסם', balance: 'מאזניים', missing: 'מספר חסר', kenken: 'קנקן' };
